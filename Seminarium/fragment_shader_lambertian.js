var fragmentShaderLambertian = `#version 300 es
precision highp float;
// precision lowp float;
in vec4 v_position;
in vec3 v_normals;
in float v_normalToCamera;
in vec2 v_texcoord;
in mat3 v_TBN;
in vec3 v_color;
// uniform sampler2D u_normal_texture;
// uniform sampler2D u_normal_detail_texture;
// uniform sampler2D u_height_map_texture;
// uniform sampler2D u_color_texture;
uniform float u_near_plane;
uniform float u_far_plane;

// uniform int u_temp_use_the_occlusion;

in vec3 v_fragment_position;
in vec3 v_light_direction;

uniform mat4 u_model_matrix;
uniform mat4 u_camera_matrix;
uniform mat4 u_view_matrix;
// uniform mat4 u_projection_matrix;
// uniform mat4 u_world_view_projection;
// uniform mat4 u_world_inverse_transpose;

out vec4 output_FragColor;

//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

void main(){
    vec2 texcoord = v_texcoord;
    
	// vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	// normals = vec3(normals.x, normals.y, clamp(normals.z, 0., 1.));  //clamp z
	
	// vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * v_normals );
	// vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * vec3(0., 0., 1.) );
	vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], cross(v_TBN[0], v_TBN[1])) * vec3(0., 0., 1.) );
    
    float diffusion = dot(normalize(normals), v_light_direction);

	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	// output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * v_TBN) /2. + 0.5)*diffusion, 1);
	// output_FragColor = vec4(texture(u_color_texture, texcoord).rgb*diffusion, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*diffusion, 1);
	// output_FragColor = texture(u_normal_texture, texcoord);
	output_FragColor = vec4(vec3(0.5, 0., 1.) * diffusion, 1.);
	// output_FragColor = vec4(vec3(v_color), 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 1.0)), 1);
    // output_FragColor = vec4(
    //     vec3(pow(
    //         (
    //             1./length(project(u_camera_matrix[3].xyz - v_position.xyz, u_camera_matrix[2].xyz))  //z plane distance
    //             - 1./u_near_plane
    //         ) / (1./u_far_plane - 1./u_near_plane)
    //     , 5000.0)) // - vec3(pow(gl_FragCoord.z, 500.0))
    // , 1.);
}
`