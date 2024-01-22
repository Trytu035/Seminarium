var fragmentShaderLambertian = `#version 300 es
precision highp float;
// precision lowp float;
in vec4 v_position;
in vec3 v_normals;
in float v_normalToCamera;
in vec2 v_texcoord;
in mat3 v_TBN;
in vec4 v_fColor;
// uniform sampler2D u_normal_texture;
// uniform sampler2D u_normal_detail_texture;
// uniform sampler2D u_height_map_texture;
// uniform sampler2D u_color_texture;
uniform float u_near_plane;
uniform float u_far_plane;

// uniform int u_temp_use_the_oclussion;

in vec3 v_fragment_position;
in vec3 v_light_direction;

uniform mat4 u_model_matrix;
uniform mat4 u_camera_matrix;
uniform mat4 u_view_matrix;
// uniform mat4 u_projection_matrix;
// uniform mat4 u_world_view_projection;
// uniform mat4 u_world_inverse_transpose;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);

//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}
struct depth_range_t {
    float near;
    float far;
};
in depth_range_t v_projected_depth_range;

void main(){
    vec2 texcoord = v_texcoord;
    
    //texcoord is visible by the viewer. vtexcoord is the orginal
    
    // float detail_scale = 1.618;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    // float detail_strength = 1.0;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    // vec3 detail_normals = normalize(texture(u_normal_detail_texture, texcoord * detail_scale).rgb * 2.0 - 1.0);
    // detail_normals = normalize(vec3(detail_normals.xy, detail_normals.z * detail_strength)); // / detail_strength
	// vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	// float phi = atan(detail_normals.y, detail_normals.x);
	// float theta = atan(length(detail_normals.xy), detail_normals.z);
	// normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));
	// normals = vec3(normals.x, normals.y, clamp(normals.z, 0., 1.));  //clamp z
	
	// vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * v_normals );
	// vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * vec3(0., 0., 1.) );
	vec3 normals = normalize(mat3(v_TBN[0], -v_TBN[1], cross(v_TBN[0], v_TBN[1])) * vec3(0., 0., 1.) );
    
    float diffusion = dot(normalize(normals), v_light_direction);
    // float diffusion = dot(normalize(v_normals), v_light_direction);
    // float diffusion = dot(normalize(v_TBN[2]), v_light_direction);
    // float diffusion = dot(normalize(cross(v_TBN[0], v_TBN[1])), v_light_direction);

	// output_FragColor = vec4(vec3(0.5 + point_of_crossing*0.)*diffusion, 1);
	// output_FragColor = vec4(vec3(1.*(0.5 + diffusion/2.0)), 1);

	// output_FragColor = vec4(vec3(height)*diffusion, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	
	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	// output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * v_TBN) /2. + 0.5)*diffusion, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	// output_FragColor = vec4(texture(u_color_texture, texcoord).rgb*diffusion, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb*diffusion, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*diffusion, 1);
	// output_FragColor = vec4(vec3(v_fColor * diffusion), 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*(0.5 + diffusion/2.0), 1);
	// output_FragColor = texture(u_normal_texture, texcoord);
	output_FragColor = vec4(vec3(0.5, 0., 1.) * diffusion, 1.);
	//vec3 basic = texture(u_normal_texture, texcoord).rgb*(0.5 + v_diffusion);
	// output_FragColor = vec4(basic.rgb + v_position.xyz, 1);
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
`