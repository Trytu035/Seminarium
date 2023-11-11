var fragmentShader =`#version 300 es
precision lowp float;
in vec4 v_position;
// in mat4 v_model_matrix;
in vec3 v_fNormals;
in float v_normalToCamera;
in vec2 v_texcoord;
in mat3 v_TBN;
in vec4 v_fColor;
uniform sampler2D u_normal_texture;
uniform sampler2D u_normal_detail_texture;
uniform sampler2D u_height_map_texture;
uniform sampler2D u_color_texture;

in float v_temp_use_the_oclussion;

in vec3 v_fragment_position;

in mat4 v_model_matrix;
in mat4 v_camera_matrix;
in mat4 v_view_matrix;
in mat4 v_projection_matrix;
in mat4 v_world_view_projection;
in mat4 v_world_inverse_transpose;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
	
void main(){
    //apparent height under the cursor 
    float height = texture(u_height_map_texture, v_texcoord).r;
    
    //max height is 0 distance from the surface. - it's equivalent to pure white (1.0)
    //min height - max_parallax is the distance from the surface in it's normal direction - it's equivalent to pure black (0.0)
    const float max_parallax = 0.5;
    const int number_of_iterations = 20;
    const float step_height = max_parallax / float(number_of_iterations);
    // height = 1.0 - height;
    height *= max_parallax;
    vec2 texcoord = v_texcoord;

    vec3 view_position = vec3(0., 0., 0.);
    // vec3 view_position = v_view_matrix[3].xyz;
    vec3 frag_position = vec3(v_position);
    // vec3 view_direction = normalize(vec3(v_camera_matrix[3].xyz)) *  v_TBN;
    vec3 view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) *  v_TBN;
    vec2 delta_uv = view_direction.xy * step_height / -view_direction.z;
    //https://apoorvaj.io/exploring-bump-mapping-with-webgl/
    // vec2 delta_uv = vec2(0., 0.);

    float accumulator = 0.;
    float point_of_crossing;
    vec2 prev_texcoord;
    for (int i = 0; i < number_of_iterations; i++) {
        accumulator += step_height;
        texcoord += delta_uv;
        height = texture(u_height_map_texture, texcoord).r;
        height *= max_parallax;
        if (height < accumulator) {
            prev_texcoord = texcoord - delta_uv;
            float prev_height = texture(u_height_map_texture, prev_texcoord).r;
            
            prev_height *= max_parallax;

            // float terrain_gradient = (height - prev_height) / length(delta_uv);
            // float terrain_bias = height;
            // float camera_gradient = step_height / length(delta_uv);
            // float camera_bias = accumulator;
            
            float next = height - accumulator;
            float prev = prev_height - accumulator + step_height;
            
            point_of_crossing = next / (next - prev);
            texcoord = mix(texcoord, prev_texcoord, point_of_crossing);

            break;
        }
    }
    
    //texcoord is visible by the viewer. vtexcoord is the orginal
    
    vec3 detail_normals = normalize(texture(u_normal_detail_texture, texcoord).rgb * 2.0 - 1.0);
    detail_normals = normalize(vec3(detail_normals.xy, detail_normals.z * 2.)); // / detail_strength
	vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	float phi = atan(detail_normals.y, detail_normals.x);
	float theta = atan(length(detail_normals.xy), detail_normals.z);
	normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));
	// normals = vec3(normals.x, normals.y, clamp(normals.z, 0., 1.));  //clamp z
	
	normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * normals);
    
    float normalToCamera = dot(normals, normalize(-v_camera_matrix[2].xyz));
    // float normalToCamera = dot(normals, normalize(vec3(0., 0., 1.) * mat3(v_projection_matrix * v_view_matrix)));

	// output_FragColor = vec4(vec3(0.5 + point_of_crossing*0.)*normalToCamera, 1);
	// output_FragColor = vec4(vec3(1.*(0.5 + normalToCamera/2.0)), 1);

	// output_FragColor = vec4(vec3(height)*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	// view_direction
	
	// if (v_temp_use_the_oclussion > 0.5) {
	//     output_FragColor = vec4(normalize(v_TBN[2]) /2. + 0.5, 1);
	// }else {
	    output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	// }
	
	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	// output_FragColor = vec4((normals * v_TBN) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * v_TBN) /2. + 0.5)*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_color_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*(0.5 + normalToCamera/2.0), 1);
	// output_FragColor = texture(u_normal_texture, texcoord);
	//vec3 basic = texture(u_normal_texture, texcoord).rgb*(0.5 + v_normalToCamera);
	// output_FragColor = vec4(basic.rgb + v_position.xyz, 1);
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