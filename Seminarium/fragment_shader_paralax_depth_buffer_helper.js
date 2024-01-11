var fragmentShaderDepthTransform =`#version 300 es
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

in vec4 v_fragment_position;

vec3 frag_position; //local

in mat4 v_model_matrix;
in mat4 v_camera_matrix;

out vec4 output_FragColor;
	
//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

void main(){
    // frag_position = vec3(v_fragment_position) - texture(u_height_map_texture, v_texcoord).r * v_camera_matrix[2].xyz; // * paralax_height_scale;

    // gl_FragDepth = (
    //     length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
    //     - u_near_plane
    // ) / (u_far_plane - u_near_plane);   //comment out if need to remove height_map texture

    float coarse = floor(gl_FragCoord.z * 256.) / 256.;
    float fine = mod(gl_FragCoord.z * 256., 1.);
    
    output_FragColor = vec4(
        // 0.,
        texture(u_height_map_texture, v_texcoord).r,
        coarse,     //depth coarse
        fine,       //depth fine
        1.0
    );   //distance 0 - 1 for world_view_direction = TBN[2]
}
`