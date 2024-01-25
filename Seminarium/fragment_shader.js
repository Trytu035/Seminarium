var fragmentShader =`#version 300 es
#define FRONT_FACE 1.0
#define BACK_FACE -1.0
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

uniform int u_temp_use_the_oclussion;

in vec4 v_fragment_position;
in vec4 v_ndc;
in vec3 v_light_direction;

vec3 frag_position; //local
vec3 backface_frag_position; //local

uniform mat4 u_model_matrix;
uniform mat4 u_camera_matrix;
// uniform mat4 u_view_matrix;
// uniform mat4 u_projection_matrix;
// uniform mat4 u_world_view_projection;
uniform mat4 u_inverse_view_projection;
// uniform vec3 u_snow_direction;
// in mat4 v_world_inverse_transpose;
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
float ParallaxMapping(vec2 texCoords, vec3 viewDir, float currentLayerDepth, float height_scale, sampler2D depthMap, float seekBackface);
	
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

    backface_frag_position = vec3(v_fragment_position);
    frag_position = vec3(v_fragment_position);
    
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous normalized deviece coordinates from -1 to 1 in every axis - clip position (i don't understand how homogenous coordinates work)
    
    //https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix
    //https://sibaku.github.io/computer-graphics/2017/01/10/Camera-Ray-Generation.html
    vec4 near_plane_fragment_position = u_inverse_view_projection * vec4(h_ndc.xy, 0., 1.);    //near
    vec4 far_plane_fragment_position = near_plane_fragment_position + u_inverse_view_projection[2]; //far
    near_plane_fragment_position /= near_plane_fragment_position.w;
    far_plane_fragment_position /= far_plane_fragment_position.w;
    
    //działa częściowo
    vec3 world_view_direction = normalize(
            near_plane_fragment_position.xyz - far_plane_fragment_position.xyz
    );
    if (0. > dot(TBN[2], world_view_direction)) {   // check if normal is projected backwards, and discard if that's the case
        discard;                                    // erase snow facing back to the snow projection camera.
    }
    
    vec3 view_direction = world_view_direction * TBN; //tangent view direction
    vec3 view_direction_color = world_view_direction * TBN_color; //tangent view direction

    float paralax_depth = ParallaxMapping(texcoord, view_direction, 0., u_height_scale, u_height_map_texture, FRONT_FACE);

    texcoord -= paralax_depth * view_direction.xy / view_direction.z * u_height_scale;
    texcoord_color -= paralax_depth * view_direction_color.xy / view_direction.z * u_height_scale;
    frag_position -= paralax_depth * world_view_direction / view_direction.z * u_height_scale;

    float backface_paralax_depth = ParallaxMapping(texcoord, view_direction, paralax_depth, u_height_scale, u_height_map_texture, BACK_FACE);
    backface_frag_position -= backface_paralax_depth * world_view_direction / view_direction.z * u_height_scale;

    vec3 camera_view_dir = u_camera_matrix[2].xyz * TBN;
    paralax_depth = ParallaxMapping(texcoord, camera_view_dir, 0., u_height_scale, u_height_map_texture, FRONT_FACE);

    backface_paralax_depth = ParallaxMapping(texcoord, view_direction, paralax_depth, u_height_scale, u_height_map_texture, BACK_FACE);

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
	// normals = normalize(mat3(-TBN[0], TBN[1], TBN[2]) * normals );
    
    // phi, theta for visuals
    // phi = atan((normals * TBN).y, (normals * TBN).x);
    // theta = atan(length((normals * TBN).xy), (normals * TBN).z);
    
    float diffusion = clamp(dot(normalize(normals), v_light_direction), 0., 1.);

	// output_FragColor = vec4(vec3(1.*(0.5 + diffusion/2.0)), 1);

	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	// output_FragColor = vec4(normalize(normals * mat3(TBN[0], TBN[1], cross(TBN[0], TBN[1]) / length(TBN[0]))) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(normals * mat3(3.*TBN[0], 3.*TBN[1], TBN[2])) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(mat3(TBN[0], TBN[1], cross(TBN[0], TBN[1]) / length(TBN[0])) * -normals) /2. + 0.5, 1);
	// if (u_temp_use_the_oclussion >= 1) {
	//     output_FragColor = vec4(normalize(u_camera_matrix[2].xyz) /2. + 0.5, 1);
	// } else {
	//     output_FragColor = vec4(normalize(normals) /2. + 0.5, 1);
	// }
	// output_FragColor = vec4(normalize(normals * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(vec3(0., 0., 1.) * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(normals) /2. + 0.5, 1);
    // output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4((vec3(0., 0., 1.) * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * TBN) /2. + 0.5)*diffusion, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb * diffusion, 1);
	
	/*
	// Beer's law for transmitance + Guerilla games for clouds 
	//https://europe1.discourse-cdn.com/unity/original/3X/4/1/41b4493236119c2e8e676b75d8a727d422e44d40.jpeg
	// vec3 subsurface_radius = vec3(0.36, 0.46, 0.60);
	
	float snow_thickness = length(v_fragment_position.xyz - world_view_direction / view_direction.z * u_height_scale - frag_position); //distance to ground
	float snow_thickness2 = length(backface_frag_position - frag_position); // closest snow backface
	// float light_view_thickness = frag_position length(backface_frag_position - frag_position); // closest snow backface
	float snow_light_absorbtion = 0.75;
	// float transmitance = (1. - exp(-snow_thickness2 * snow_light_absorbtion)) / snow_light_absorbtion;
	float ground_light_absorbtion = 0.5;
	vec3 halfway_vec = normalize(vec3(0., -1., 0) + normals * 0.0);
	vec3 halfway_vec2 = normalize(-v_light_direction + normals * 0.0);
	float Intensity = pow(clamp(dot(world_view_direction, -halfway_vec), 0., 1.), 1.0) * 1.;
	// float Intensity2 = pow(clamp(dot(world_view_direction, -halfway_vec2), 0., 1.), 1.0) * 1.;
	// instead of diffusion, color before rendering this image
	Intensity = (Intensity + 0.) * pow(1. - clamp(snow_thickness / 8., 0., 1.), 70.);
	// Intensity2 = snow_light_absorbtion * (Intensity2 + 0.00) * pow(1. - clamp(snow_thickness2 * 2., 0., 1.), 2.) * 0.1;
	// for (int i = 0; i < 20; i++) {
	//     float light_transmitance = = exp(-snow_thickness2 * (snow_light_absorbtion));
	//     float transmitance = exp(-snow_thickness2 * (snow_light_absorbtion));
	// }
	vec3 result_color = texture(u_color_texture, texcoord_color).rgb;
	//change backface color to color from backface.
	// vec3 backface_color = vec3(0.5, 0., 1.);
	vec3 backface_color = vec3(0.5, 0., 1.) * dot(TBN[2], v_light_direction);
	
	output_FragColor = vec4(
	    mix(result_color*diffusion, ground_light_absorbtion * backface_color, clamp(Intensity, 0., 1.))
	    // 0.5 * transmitance * result_color
    , 1.);

	// output_FragColor = vec4(result_color*diffusion, 1. - clamp(Intensity, 0., 1.));
	/* */
    // if (gl_FragCoord.z < 0.9993) {
	//     output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb*diffusion, 1);
	// } else {
	//     output_FragColor = vec4(1);
	// }
	// output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1);
	// output_FragColor = vec4((texcoord.xyx).rgb*diffusion, 1);
	// output_FragColor = vec4(vec3(v_fColor * diffusion), 1);
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
// modyfikacje:
// dodano etap mapowania relifowego od pewnego momentu (podano link)
// ignorowanie prostopadłych ścian
// możliwość zaczęcia w środku paralaksy
// możliwość szukania tylnych ścian
// zwracana głębokość zamiast koordynatów teksturowania
float ParallaxMapping(vec2 texCoords, vec3 viewDir, float currentLayerDepth, float height_scale, sampler2D depthMap, float seekBackface)
{
    if (isnan(viewDir.z)) { //for invalid TBN, return no change in texCoords
        return 0.;          //wrong texCoords_color - they should warp maximally
    }

    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    const float numLayers = 32.0;   //must be constant, my computer won't stand if it's not constant
    const int binarySearchIterations = 8;
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer

    float layerDepth = 1.0 / numLayers;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale;
    vec2 deltaTexCoords = P / numLayers;
    vec2 currentTexCoords = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;

    do {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth;  
    } while((currentLayerDepth - currentDepthMapValue) * seekBackface < 0. && currentLayerDepth < 1.);
    
    // add binary search for relief mapping, based on - point 3 ↓↓↓
    // https://www.cs.purdue.edu/cgvlab/courses/434/434_Spring_2013/lectures/References/DepthImagesForRenderingSurfaceDetail.pdf
    
    float reliefScale = 1.;
    for (int i = 0; i < binarySearchIterations; i++){
        reliefScale /= 2.;
        
        if ((currentLayerDepth - currentDepthMapValue) * seekBackface < 0.) {
            currentTexCoords -= deltaTexCoords * reliefScale;
            currentLayerDepth += layerDepth * reliefScale;
        } else {
            currentTexCoords += deltaTexCoords * reliefScale;
            currentLayerDepth -= layerDepth * reliefScale;
        }
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;
    }
    
    // end of modifications
    
    // krok okluzji nie przynosi widocznych efektów - wybrać jedno lub drugie (albo mapowanie relifowe, albo mapowanie okluzji)
    /*
    // occlusion step
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    float prevLayerDepth = currentLayerDepth - layerDepth;

    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(depthMap, prevTexCoords).r - prevLayerDepth;

    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    currentLayerDepth = prevLayerDepth * weight + currentLayerDepth * (1.0 - weight);
    */
    
    return currentLayerDepth;
}
`