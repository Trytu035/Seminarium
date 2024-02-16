var fragmentShader =`#version 300 es
#define FRONT_FACE 1.0
#define BACK_FACE -1.0
#define PARALLAX_MAPPING_BINARY_SEARCH_ITERATIONS 8
#define PARALLAX_MAPPING_NUMBER_OF_LINEAR_SEARCH_LAYERS 32.0
#extension GL_EXT_conservative_depth : enable

// Ensure that the shader compiles when the extension is not supported
#ifdef GL_EXT_conservative_depth
    layout (depth_greater) out highp float gl_FragDepth;
#endif
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
in vec3 v_color;
uniform sampler2D u_normal_texture;
uniform sampler2D u_normal_detail_texture;
uniform sampler2D u_height_map_texture;
uniform sampler2D u_color_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

uniform int u_temp_use_the_occlusion;

in vec4 v_fragment_position;
in vec4 v_ndc;
in vec3 v_light_direction;

vec3 frag_position; //local
vec3 backface_frag_position; //local

uniform mat4 u_model_matrix;
uniform mat4 u_camera_matrix;
// uniform mat4 u_view_matrix;
uniform mat4 u_projection_matrix;
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

    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous normalized device coordinates from -1 to 1 in every axis - clip position (i don't understand how homogenous coordinates work)

    //https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix
    //https://sibaku.github.io/computer-graphics/2017/01/10/Camera-Ray-Generation.html
    vec4 near_plane_fragment_position = u_inverse_view_projection * vec4(h_ndc.xy, 0., 1.);    //near
    vec4 far_plane_fragment_position = near_plane_fragment_position + u_inverse_view_projection[2]; //far
    near_plane_fragment_position /= near_plane_fragment_position.w;
    far_plane_fragment_position /= far_plane_fragment_position.w;

    vec3 world_view_direction = normalize(
            near_plane_fragment_position.xyz - far_plane_fragment_position.xyz
    );
    if (0. > dot(TBN[2], world_view_direction)) {   // check if normal is projected backwards, and discard if that's the case
        discard;                                    // erase snow facing back to the snow projection camera.
    }

    vec3 tangent_view_direction = world_view_direction * TBN; //tangent view direction
    vec3 tangent_view_direction_color = world_view_direction * TBN_color; //tangent view direction

    float parallax_depth = ParallaxMapping(texcoord, tangent_view_direction, 0., u_height_scale, u_height_map_texture, FRONT_FACE);
    float backface_parallax_depth = ParallaxMapping(
        texcoord,
        tangent_view_direction,
        parallax_depth + 1.0 / PARALLAX_MAPPING_NUMBER_OF_LINEAR_SEARCH_LAYERS / pow(2., float(PARALLAX_MAPPING_BINARY_SEARCH_ITERATIONS - 2)),
        u_height_scale,
        u_height_map_texture,
        BACK_FACE
    );

    texcoord -= parallax_depth * tangent_view_direction.xy / tangent_view_direction.z * u_height_scale;
    texcoord_color -= parallax_depth * tangent_view_direction_color.xy / tangent_view_direction.z * u_height_scale;
    frag_position -= parallax_depth * world_view_direction / tangent_view_direction.z * u_height_scale;
    backface_frag_position -= backface_parallax_depth * world_view_direction / tangent_view_direction.z * u_height_scale;

    // vec3 camera_view_dir = u_camera_matrix[2].xyz * TBN;
    // parallax_depth = ParallaxMapping(texcoord, camera_view_dir, 0., u_height_scale, u_height_map_texture, FRONT_FACE);
    // backface_parallax_depth = ParallaxMapping(texcoord, tangent_view_direction, parallax_depth, u_height_scale, u_height_map_texture, BACK_FACE);

	float depth = (
        1./length(project(u_camera_matrix[3].xyz - frag_position, u_camera_matrix[2].xyz))  //z plane distance
        - 1./u_near_plane
    ) / (1./u_far_plane - 1./u_near_plane);
	// float depth = (  // orthographic depth
    //     length(project(u_camera_matrix[3].xyz - frag_position, u_camera_matrix[2].xyz))  //z plane distance
    //     - u_near_plane
    // ) / (u_far_plane - u_near_plane);

    // float detail_scale = 1.618;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    // float detail_strength = 0.5;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    // vec3 detail_normals = normalize(texture(u_normal_detail_texture, texcoord_color * detail_scale).rgb * 2.0 - 1.0);
    // detail_normals = normalize(vec3(detail_normals.xy, detail_normals.z * detail_strength)); // / detail_strength
	vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);

	// float phi = atan(detail_normals.y, detail_normals.x);               //hue
	// float theta = atan(length(detail_normals.xy), detail_normals.z);    //height
	// normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));

	//to reverse all normals, reverse TBN[0] and TBN[1]
	normals = normalize(mat3(TBN[0], -TBN[1], TBN[2]) * normals);

    float diffusion = clamp(dot(normalize(normals), v_light_direction), 0., 1.);

    // if (gl_FragCoord.z < 0.9993) {
	//     output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb*diffusion, 1);
	// } else {
	//     output_FragColor = vec4(1);
	// }
	// output_FragColor = vec4(normalize(normals * TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(normalize(normals) /2. + 0.5, 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 5000.0)), 1.);
	// output_FragColor = vec4(vec3(pow(depth, 5000.0)), 1.);
    // output_FragColor = vec4(vec3(length(frag_position - backface_frag_position)), 1);

	// output_FragColor = vec4(vec3(v_color), 1);
	// output_FragColor = vec4(vec3(v_texcoord.xy, 0.), 1);
	// output_FragColor = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb * dot(normalize(TBN[2]), v_light_direction), 1);
	output_FragColor = vec4(texture(u_color_texture, texcoord_color).rgb * diffusion, 1);

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
    const float numLayers = PARALLAX_MAPPING_NUMBER_OF_LINEAR_SEARCH_LAYERS;   //must be constant, my computer won't stand if it's not constant
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer

    float layerDepth = 1.0 / numLayers;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale;
    vec2 deltaTexCoords = P / numLayers;
    vec2 currentTexCoords = texCoords - currentLayerDepth * P;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;

    while((currentLayerDepth - currentDepthMapValue) * seekBackface < 0. && currentLayerDepth < 1.){
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;
        // get depth of next layer
        currentLayerDepth += layerDepth;
    }

    // add binary search for relief mapping, based on - point 3 ↓↓↓
    // https://www.cs.purdue.edu/cgvlab/courses/434/434_Spring_2013/lectures/References/DepthImagesForRenderingSurfaceDetail.pdf

    float reliefScale = 1.;
    for (int i = 0; i < PARALLAX_MAPPING_BINARY_SEARCH_ITERATIONS; i++){
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

    return clamp(currentLayerDepth, 0., 1.);
}
`