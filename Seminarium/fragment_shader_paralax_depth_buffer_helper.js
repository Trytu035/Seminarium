var fragmentShaderDepthTransform =`#version 300 es
/*************************************
 * only snow - used to transform other main paralax depth buffer shader
 *************************************/
precision highp float;
// precision lowp float;
// precision highp int;
// precision lowp sampler2D;
// precision lowp samplerCube;
in vec4 v_position;
in vec2 v_texcoord;
in mat3 v_TBN;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;

in vec4 v_fragment_position;
in vec4 v_ndc;

vec3 frag_position; //local

in mat4 v_model_matrix;
in mat4 v_camera_matrix;
in mat4 v_view_matrix;
in mat4 v_projection_matrix;
in mat4 v_world_view_projection;
uniform mat4 u_inverse_world_view_projection;
uniform mat4 u_projection_matrix;
// uniform vec3 u_snow_direction;
in mat4 v_world_inverse_transpose;
struct depth_range_t {
    float near;
    float far;
};
in depth_range_t v_projected_depth_range;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec3 worldViewDir, float height_scale, sampler2D depthMap);
	
//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

void main(){
    mat3 TBN = v_TBN; 
    // transpose(inverse(mat3(v_TBN[0], v_TBN[1], v_TBN[2])));  //get TBN in world coordinates from inverse transpose (from vertex shader)
    // TBN = mat3(TBN[0], TBN[1], normalize(v_camera_matrix[2]));
    // // if (determinant(TBN) == 0.) {
    // //     TBN = mat3(v_TBN[0], v_TBN[1], v_TBN[2]*0.0001);
    // // }
    // TBN = transpose(inverse(TBN));  //get inverse transpose coordinates

    //apparent height under the cursor 
    float height;
    
    //max height is 0 distance from the surface. - it's equivalent to pure white (1.0)
    //min height - max_parallax is the distance from the surface in it's normal direction - it's equivalent to pure black (0.0)
    const float max_parallax = 0.5;
    const int number_of_iterations = 20;
    const float step_height = max_parallax / float(number_of_iterations);
    vec2 texcoord = v_texcoord;

    frag_position = vec3(v_fragment_position);
    
    mat4 view_projection = u_projection_matrix * inverse(v_camera_matrix);   //clip position
    
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous from -1 to 1 in every axis - clip position
    // vec4 ndc = v_world_view_projection * v_fragment_position;
    vec4 ndc;
    
    // ndc.xy = (gl_FragCoord.xy / vec2(859., 619.)) * 2. - 1.0;
    ndc.xy = ((2.0 * gl_FragCoord.xy) - (2.0 * vec2(0., 0.))) / vec2(859., 619.) - 1.;
    // ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /    //orginal
    //     (gl_DepthRange.far - gl_DepthRange.near);
    ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near) /    //near is 0 - unacceptable
        (gl_DepthRange.far - gl_DepthRange.near) * gl_DepthRange.far / (2.* gl_FragCoord.z);
        // 4 units for 0.2 additional
    ndc.w = 1.0;
    
    // v_ndc.xyz / v_ndc.w -> homogenous coordinates - from -1 to 1
    // v_ndc.xyz -> coordinates - viewport coordinates
    
    // //https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix
    // vec4 temp2 = inverse(v_world_view_projection) * vec4(h_ndc.xy, 0., 1.); //near
    // vec4 temp3 = temp2 + inverse(v_world_view_projection)[2];               //far
    // temp2 /= temp2.w;
    // temp3 /= temp3.w;
    //
    // vec3 world_view_direction = normalize(
    //         temp2.xyz - temp3.xyz
    // );
    vec3 world_view_direction = TBN[2];
    
    vec3 view_direction = world_view_direction * TBN; //tangent view direction
    
    
    texcoord = ParallaxMapping(texcoord, view_direction, world_view_direction, 1.0, u_height_map_texture);
    
    //texcoord is visible by the viewer. vtexcoord is the orginal
    
    float detail_scale = 1.618;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    float detail_strength = 1.0;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
	// vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	
	//to reverse all normals, reverse [0] and [1]
	// normals = normalize(mat3(TBN[0], -TBN[1], TBN[2]) * normals );
	// normals = normalize(mat3(-TBN[0], TBN[1], TBN[2]) * normals );
    
    // phi, theta for visuals
    // phi = atan((normals * TBN).y, (normals * TBN).x);
    // theta = atan(length((normals * TBN).xy), (normals * TBN).z);
    
    // float normalToCamera = dot(normals, normalize(v_camera_matrix[2].xyz));

	// output_FragColor = vec4(vec3(1.*(0.5 + normalToCamera/2.0)), 1);

	// output_FragColor = vec4(vec3(height)*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	// output_FragColor = vec4(normalize(normals * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4((vec3(0., 0., 1.) * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * TBN) /2. + 0.5)*normalToCamera, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	// output_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);

	//zbuffer
	// gl_FragCoord.z = frag_position.z;
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 10., 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 5000.0)), 1.);
	// output_FragColor = vec4(
	//     vec3(pow(
	//         (
	//             1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
    //             - 1./u_near_plane
    //         ) / (1./u_far_plane - 1./u_near_plane)
    //     , 5000.0)) // - vec3(pow(gl_FragCoord.z, 500.0))
    // , 1.);

    
    // gl_FragDepth = (    //non linear, projected to camera z-plane
    //     1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
    //     - 1./u_near_plane
    // ) / (1./u_far_plane - 1./u_near_plane);

        float to_paralax_fragment = length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz));
        float to_paralax_surface = length(project(v_camera_matrix[3].xyz - v_fragment_position.xyz, v_camera_matrix[2].xyz));
        float paralax_height = to_paralax_fragment - to_paralax_surface;    //not height-scale
        
    	float tangent_plane_direction_phi = atan(normalize(inverse(TBN)[2]).y, normalize(inverse(TBN)[2]).x);
	    float tangent_plane_direction_theta = atan(length(normalize(inverse(TBN)[2]).xy), normalize(inverse(TBN)[2]).z);
	    float camera_direction_phi = atan(v_camera_matrix[2].y, v_camera_matrix[2].x);
	    float camera_direction_theta = atan(length(v_camera_matrix[2].xy), v_camera_matrix[2].z);
        float transform_phi = tangent_plane_direction_phi;
        float transform_theta = tangent_plane_direction_theta;
	    // normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));
	    
    	// output_FragColor = vec4((((vec4(view_direction, 1.0) - rotate_z(transform_phi) * rotate_y(transform_theta) * rotate_z(-transform_phi) * v_camera_matrix[2]).xyz) /2. + 0.5), 1.0);   //distance 0 - 1 for world_view_direction = camera[2]
    	// output_FragColor = vec4(view_direction /2. + 0.5, 1.0);   //distance 0 - 1 for world_view_direction = camera[2]

    	// output_FragColor = vec4(vec3((to_paralax_fragment - to_paralax_surface)*(v_camera_matrix[2].xyz * TBN).z), 1.0);   //distance 0 - 1 for world_view_direction = camera[2]
    	// output_FragColor = vec4(vec3((to_paralax_fragment - to_paralax_surface)*length(TBN[2].xyz)*length(TBN[2].xyz)/(v_camera_matrix[2].xyz * v_TBN).z), 1.0);   //distance 0 - 1 for wordl_view_direction = TBN[2]
    	output_FragColor = vec4(
    	    texture(u_height_map_texture, v_texcoord).r,
    	    gl_FragCoord.z,
    	    1.0,
    	    1.0);   //distance 0 - 1 for wordl_view_direction = TBN[2]
    	//todo: fix so that you don't need to divide TBN normal by further number - define max distance between surface and max height scale
    	
    gl_FragDepth = (    //non linear, projected to camera z-plane
        length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
        - u_near_plane
    ) / (u_far_plane - u_near_plane);
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


//https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec3 worldViewDir, float height_scale, sampler2D depthMap)
{
    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    const float numLayers = 40.0;   //must be constant, my computer won't stand if it's not constant
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer

    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale; 
    vec2 deltaTexCoords = P / numLayers;
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;

    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        frag_position -= worldViewDir / viewDir.z * height_scale / numLayers;   //added line
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth ;  
    }

    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    vec3 prevFragPos = frag_position + worldViewDir / viewDir.z * height_scale / numLayers;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(depthMap, prevTexCoords).r - currentLayerDepth + layerDepth;

    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    frag_position = (prevFragPos) * weight     //added line
                    + (frag_position) * (1.0 - weight);

    return finalTexCoords;
}
`