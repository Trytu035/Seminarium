var fragmentShaderDepthRenderBuffer =`#version 300 es
/*************************************
 * only snow - used to transform other main paralax depth buffer shader
 *************************************/
precision highp float;
in vec4 v_position;
in vec2 v_texcoord;
in mat3 v_TBN;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;

// in vec4 v_fragment_position;

vec3 frag_position; //local

// in mat4 v_model_matrix;
uniform mat4 u_camera_matrix;

out vec4 output_FragColor;
	
//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

// this step has to be made in different draw cycle than fragment_shader_paralax_depth_buffer_helper
void main(){
    vec4 depthInfo = texture(u_height_map_texture, v_texcoord);
    float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256.;
    // frag_position = vec3(v_fragment_position) - texture(u_height_map_texture, v_texcoord).r * u_camera_matrix[2].xyz; // * paralax_height_scale;
    frag_position = (depthInfo_renderBuffer * 30. - texture(u_height_map_texture, v_texcoord).r) * u_camera_matrix[2].xyz; // * paralax_height_scale;
    float frag_pos = depthInfo_renderBuffer + texture(u_height_map_texture, v_texcoord).r / 30.; // * paralax_height_scale;

gl_FragDepth = frag_pos + 0./30.;
frag_pos = depthInfo_renderBuffer + texture(u_height_map_texture, v_texcoord).r / 30.;
// gl_FragDepth = 0.00001;
    // gl_FragDepth = (1. - (
    //     length(project(u_camera_matrix[3].xyz - frag_position, u_camera_matrix[2].xyz))  //z plane distance
    //     - u_near_plane
    // ) / (u_far_plane - u_near_plane)) * 30.;   //comment out if need to remove height_map texture

    if (any(isnan(u_camera_matrix[2]))) {
        output_FragColor = vec4(1., 0., 0., 1.);
    }
    if (isnan(u_far_plane)) {
        output_FragColor = vec4(1., 0., 1., 1.);
    }
    output_FragColor = vec4(
        texture(u_height_map_texture, v_texcoord).r,
        texture(u_height_map_texture, v_texcoord).g,
        texture(u_height_map_texture, v_texcoord).b,
        // frag_pos + 0./30.,
        // frag_pos + 0./30.,
        // frag_pos + 0./30.,
        1.0
    );   //distance 0 - 1 for world_view_direction = TBN[2]
}
`