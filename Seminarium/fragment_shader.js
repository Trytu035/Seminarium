var fragmentShader =`#version 300 es
precision highp float;
// precision lowp float;
// precision highp int;
// precision lowp sampler2D;
// precision lowp samplerCube;
in vec4 v_position;
in vec2 v_texcoord;
in vec2 v_texcoord_color;
in vec2 v_mouse;
in mat3 v_TBN;
in mat3 v_TBN_color;
in vec4 v_fColor;
uniform sampler2D u_normal_texture;
uniform sampler2D u_normal_detail_texture;
uniform sampler2D u_height_map_texture;
uniform sampler2D u_color_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

in float v_temp_use_the_oclussion;

in vec4 v_fragment_position;
in vec4 v_ndc;

vec3 frag_position; //local

uniform mat4 u_model_matrix;
uniform mat4 u_camera_matrix;
uniform mat4 u_view_matrix;
uniform mat4 u_projection_matrix;
uniform mat4 u_world_view_projection;
uniform mat4 u_inverse_world_view_projection;
uniform vec3 u_snow_direction;
in mat4 v_world_inverse_transpose;
struct depth_range_t {
    float near;
    float far;
};
in depth_range_t v_projected_depth_range;

out vec4 output_FragColor;

mat4 rotate_x(float angle);
mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
mat4 scale(float x, float y, float z);
vec4 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec2 texCoords_color, vec3 viewDir_color, vec3 worldViewDir, float height_scale, sampler2D depthMap);
	
vec2 tempppp;
	
//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

void main(){
    mat3 TBN = v_TBN;
    mat3 TBN_color = v_TBN_color;
    
    // If some walls doesn't render, uncomment this line
    if (any(isnan(TBN[0])) || any(isnan(TBN[1])) || any(isnan(TBN[2]))) {
        discard;
    }
    
    vec2 texcoord = v_texcoord;
    vec2 texcoord_color = v_texcoord_color;

    frag_position = vec3(v_fragment_position);
    
    
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous normalized deviece coordinates from -1 to 1 in every axis - clip position
    
    //https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix
    vec4 near_plane_fragment_position = u_inverse_world_view_projection * vec4(h_ndc.xy, 0., 1.);    //near
    vec4 far_plane_fragment_position = near_plane_fragment_position + u_inverse_world_view_projection[2]; //far
    near_plane_fragment_position /= near_plane_fragment_position.w;
    far_plane_fragment_position /= far_plane_fragment_position.w;
    
    //działa częściowo
    vec3 world_view_direction = normalize(
            near_plane_fragment_position.xyz - far_plane_fragment_position.xyz
    ) * mat3(inverse(u_model_matrix));
    if (0. > dot(TBN[2], world_view_direction)) {   // check if normal is projected backwards, and discard if that's the case
        discard;                                    // erase snow facing back to the snow projection camera.
    }
    
    vec3 view_direction = world_view_direction * TBN; //tangent view direction
    vec3 view_direction_color = world_view_direction * TBN_color; //tangent view direction
    
    vec4 paralax_texcoords = ParallaxMapping(texcoord, view_direction, texcoord_color, view_direction_color, world_view_direction, u_height_scale, u_height_map_texture);
    texcoord = paralax_texcoords.xy;
    texcoord_color = paralax_texcoords.zw;
    //texcoord is visible by the viewer. vtexcoord is the orginal
    
    float detail_scale = 1.618;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    float detail_strength = 0.5;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    vec3 detail_normals = normalize(texture(u_normal_detail_texture, texcoord_color * detail_scale).rgb * 2.0 - 1.0);
    detail_normals = normalize(vec3(detail_normals.xy, detail_normals.z * detail_strength)); // / detail_strength
	vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	
	float depth = (
        1./length(project(u_camera_matrix[3].xyz - frag_position, u_camera_matrix[2].xyz))  //z plane distance
        - 1./u_near_plane
    ) / (1./u_far_plane - 1./u_near_plane);
    
	float phi = atan(detail_normals.y, detail_normals.x);               //hue
	float theta = atan(length(detail_normals.xy), detail_normals.z);    //height
	// normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));
	// normals = vec3(normals.x, normals.y, clamp(normals.z, 0., 1.));  //clamp z
    // normals = mat3(rotate_x(-3.14 / 2.)) * normals;
    
	//to reverse all normals, reverse [0] and [1]
	normals = normalize(mat3(TBN[0], -TBN[1], TBN[2]) * normals );
	// normals = normalize(mat3(TBN[0], TBN[1], normalize(cross(TBN[0], TBN[1]))) * normals );
	// normals = normalize(mat3(-TBN[0], TBN[1], TBN[2]) * normals );
    
    // phi, theta for visuals
    // phi = atan((normals * TBN).y, (normals * TBN).x);
    // theta = atan(length((normals * TBN).xy), (normals * TBN).z);
    
    // float normalToCamera = dot(normals, normalize(u_camera_matrix[2].xyz));
    float normalToCamera = dot(normalize(normals), normalize(u_camera_matrix[2].xyz));
    // float normalToCamera = dot(normals * TBN, vec3(0., 0., 1.));

	// output_FragColor = vec4(vec3(1.*(0.5 + normalToCamera/2.0)), 1);

	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	// output_FragColor = vec4(normalize(normals * mat3(TBN[0], TBN[1], cross(TBN[0], TBN[1]) / length(TBN[0]))) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(normals * mat3(3.*TBN[0], 3.*TBN[1], TBN[2])) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(mat3(TBN[0], TBN[1], cross(TBN[0], TBN[1]) / length(TBN[0])) * -normals) /2. + 0.5, 1);
	// if (v_temp_use_the_oclussion > 0.5) {
	//     output_FragColor = vec4(normalize(u_camera_matrix[2].xyz) /2. + 0.5, 1);
	// } else {
	//     output_FragColor = vec4(normalize(normals) /2. + 0.5, 1);
	// }
	// output_FragColor = vec4(normalize(normals * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(vec3(0., 0., 1.) * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(normals) /2. + 0.5, 1);
    // output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4((vec3(0., 0., 1.) * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * TBN) /2. + 0.5)*normalToCamera, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb*normalToCamera, 1);
    // if (gl_FragCoord.z < 0.9993) {
	//     output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb*normalToCamera, 1);
	// } else {
	//     output_FragColor = vec4(1);
	// }
	// output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 500.)), 1);
	// output_FragColor = vec4((texcoord.xyx).rgb*normalToCamera, 1);
	// output_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);

	//https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix

	//zbuffer
	// gl_FragCoord.z = frag_position.z;
	// output_FragColor = vec4(vec3(length((vec3(u_camera_matrix[3]) - frag_position))) / 10., 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 5000.0)), 1.);
	// output_FragColor = vec4(
	//     vec3(pow(depth, 5000.0)) // - vec3(pow(gl_FragCoord.z, 500.0))
    // , 1.);
	// output_FragColor = vec4(vec3(length((vec3(u_camera_matrix[3]) - frag_position))) / 5., 1);
	// output_FragColor = vec4(gl_FragCoord.xy /400., 0., 1);
	// output_FragColor = vec4(vec3((h_ndc.z /2. + 0.5)), 1.0);
	// output_FragColor = vec4(vec3(
    //     length(project(u_camera_matrix[3].xyz - frag_position, u_camera_matrix[2].xyz))  //z plane distance
    //             - u_near_plane
    //         ) / (u_far_plane - u_near_plane)
    //     // depth
	// , 1.0); // gl_FragCoord.w
	// output_FragColor = vec4(vec3( mod((h_ndc.z /2. + 0.5) / gl_FragCoord.w / w2, 1.)), 1.0);
    
    gl_FragDepth = depth;
}

    mat4 rotate_x(float angle) {
        return mat4(
		1.0,   0.0,         0.0,        0.0,
		0.0,   cos(angle),  sin(angle), 0.0, 
		0.0,   -sin(angle), cos(angle), 0.0,
		0.0,   0.0,         0.0,        1.0
		);
    }

	mat4 rotate_y(float angle) {
		return mat4(
		cos(angle),	0.0,		-sin(angle),0.0,
		0.0,		1.0,		0.0,		0.0, 
		sin(angle),	0.0,		cos(angle),	0.0,
		0.0,		0.0,		0.0,		1.0
		);
	}

	mat4 rotate_z(float angle) {
		return mat4(
		cos(angle),	sin(angle),	0.0,		0.0,
		-sin(angle),cos(angle),	0.0,		0.0,
		0.0,		0.0,		1.0,		0.0, 
		0.0,		0.0,		0.0,		1.0
		);
	}

	mat4 scale(float x, float y, float z) {
		return mat4(
		x,      	0.0,	    0.0,		0.0,
		0.0,        y,      	0.0,		0.0,
		0.0,		0.0,		z,  		0.0, 
		0.0,		0.0,		0.0,		1.0
		);
	}


// Function by Joey de Vries https://twitter.com/JoeyDeVriez
// https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
// licenced on CC BY-NC 4.0 https://creativecommons.org/licenses/by-nc/4.0/
// zmodyfikowano na mapowanie relifowe od pewnego momentu (podano link)
vec4 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec2 texCoords_color, vec3 viewDir_color, vec3 worldViewDir, float height_scale, sampler2D depthMap)
{
    if (isnan(viewDir.z) || isnan(viewDir_color.z)) { //for invalid TBN, return no change in texCoords
        return vec4(texCoords, texCoords_color);    //wrong texCoords_color - they should warp maximally
    }

    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    const float numLayers = 32.0;   //must be constant, my computer won't stand if it's not constant
    const int binarySearchIterations = 8;
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer

    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale;
    vec2 deltaTexCoords = P / numLayers;
    vec2 currentTexCoords = texCoords;
    vec2 currentTexCoords_color = texCoords_color;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;

    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    }
    
    // add binary search for relief mapping, based on - point 3 ↓↓↓
    // https://www.cs.purdue.edu/cgvlab/courses/434/434_Spring_2013/lectures/References/DepthImagesForRenderingSurfaceDetail.pdf
    
    for (int i = 0; i < binarySearchIterations; i++){
        layerDepth /= 2.;
        deltaTexCoords /= 2.;
        
        if (currentLayerDepth < currentDepthMapValue) {
            currentTexCoords -= deltaTexCoords;
            currentLayerDepth += layerDepth;
        } else {
            currentTexCoords += deltaTexCoords;
            currentLayerDepth -= layerDepth;
        }
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;
    }
    
    // added computation of the other set of texCoords and fragment position depth adjusting. 
    // currentTexCoords_color -= currentLayerDepth * viewDir_color.xy / viewDir_color.z * height_scale;
    currentTexCoords_color -= currentLayerDepth * viewDir_color.xy / viewDir.z * height_scale;
    frag_position -= currentLayerDepth * worldViewDir / viewDir.z * height_scale;

    // end of modifications

    return vec4(currentTexCoords, currentTexCoords_color);
    
    // nie przynosi widocznych efektów - wybrać jedno lub drugie 
    /*
    // occlusion step
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    vec2 prevTexCoords_color = currentTexCoords_color + viewDir_color.xy / viewDir.z * layerDepth;
    vec3 prevFragPos = frag_position + worldViewDir / viewDir.z * height_scale * layerDepth;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(depthMap, prevTexCoords).r - currentLayerDepth + layerDepth;

    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    vec2 finalTexCoords_color = prevTexCoords_color * weight + currentTexCoords_color * (1.0 - weight);
    frag_position = (prevFragPos) * weight     //added line
                    + (frag_position) * (1.0 - weight);

    return vec4(finalTexCoords, finalTexCoords_color);
    */
}
`