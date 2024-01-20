var vertexShaderSnow = `#version 300 es
precision highp float;
	in vec4 a_position;
	in vec3 a_tangents;
	in vec3 a_bitangents;
	in vec3 a_normals;
	in vec3 a_tangents_color;
	in vec3 a_bitangents_color;
	in vec3 a_normals_color;
	out vec3 v_normals;
	in vec2 a_texcoord;	//main texcoord	for paralax
	out vec2 v_texcoord;
	in vec2 a_texcoord_color;	//secondary texcoord for color and detail
	out vec2 v_texcoord_color;
	uniform vec2 u_mouse;
	out vec4 v_position;
	// struct depth_range_t{
	// 	float near;
	// 	float far;
	// };
	// out depth_range_t v_projected_depth_range;
	// out gl_DepthRangeParameters v_projected_depth_range;
	
	uniform mat4 u_model_matrix;
	uniform mat4 u_camera_matrix;
	uniform mat4 u_view_matrix;
	uniform mat4 u_projection_matrix;	//addded
	uniform mat4 u_world_view_projection;
	uniform mat4 u_world_inverse_transpose;
	
	out mat3 v_TBN;
	out mat3 v_TBN_color;
	
	out vec4 v_fragment_position;
	out vec4 v_ndc;
	
	uniform int u_temp_use_the_oclussion;  //sometimes usable
	out float v_temp_use_the_oclussion;
	uniform vec3 u_snow_direction;
    
	void main(){
		// v_projected_depth_range.near = 0.01;
		// v_projected_depth_range.far = 30.0;
		// v_projected_depth_range.diff = v_projected_depth_range.far - v_projected_depth_range.near;

	    // v_world_view_projection = u_projection_matrix * u_view_matrix * u_model_matrix;
		// v_world_inverse_transpose = transpose(inverse(u_model_matrix));
		
	
	//https://www.youtube.com/watch?time_continue=269&v=EpADhkiJkJA&embeds_referring_euri=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dparalax%2Bmapping%2Bimplementation%2Bopengl%26sca_esv%3D576631001%26sxsrf%3DAM9HkKmHyi5MKpR1r8D8c_UJGQn5A5YVxA&source_ve_path=MTM5MTE3LDEzOTExNywyODY2Ng&feature=emb_logo&ab_channel=thebennybox
		vec3 t = (mat3(u_world_inverse_transpose) * a_tangents);
		vec3 b = (mat3(u_world_inverse_transpose) * a_bitangents);
		// vec3 n = (mat3(u_world_inverse_transpose) * a_normals) / sqrt(length(cross(t, b)));	//dlaczego sqrt??
		vec3 n = (mat3(u_world_inverse_transpose) * a_normals);
		vec3 t_color = (mat3(u_world_inverse_transpose) * a_tangents_color);
		vec3 b_color = (mat3(u_world_inverse_transpose) * a_bitangents_color);
		// vec3 n_color = (mat3(u_world_inverse_transpose) * a_normals_color) / sqrt(length(cross(t_color, b_color)));	//dlaczego sqrt??
		vec3 n_color = (mat3(u_world_inverse_transpose) * a_normals_color);

		// vec3 n = normalize(cross(t, b));
		// v_TBN = mat3(t, b, n);
		// v_TBN = mat3(normalize(t), normalize(b), normalize(n));

			// float t_len = length(t);
			// float b_len = length(b);
			// t = normalize(t - dot(t, n) * n) * t_len;	//orthogonalize by Gram–Schmidt process
			// b = normalize(b - dot(b, n) * n) * b_len;
			// // b = normalize(cross(n, t)) * b_len;
			// // t = cross(b, n);

		v_TBN = mat3(t, b, u_snow_direction);	//set paralax to point at snow plane direction
		v_TBN_color = mat3(t_color, b_color, u_snow_direction);	//if projected from normal paralax bends in oneself - 

		// v_TBN = mat3(vec3(1., 0., 0.), vec3(0., 0., 1.), vec3(0., 1., 0.));	//set paralax to point at snow plane direction
		// v_TBN = mat3(t, b, n);
		// v_TBN_color = mat3(t_color, b_color, n_color);	//if projected from normal paralax bends in oneself - 

		// v_TBN = inverse(transpose(v_TBN));				//for not normalized TBN use inverse(transpose(TBN))
		// v_TBN[2] = u_snow_direction / 250.;
		v_TBN = inverse(transpose(v_TBN));
		v_TBN_color = inverse(transpose(v_TBN_color));	//for not normalized TBN use inverse(transpose(TBN))

    	// v_fragment_position = v_TBN * vec3(v_model_matrix * a_position);

//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		// gl_Position = v_world_view_projection * a_position;
		v_normals = a_normals;
    	v_temp_use_the_oclussion = float(u_temp_use_the_oclussion);
		v_texcoord = a_texcoord;
		v_texcoord_color = a_texcoord_color;
		v_position = a_position;
    	v_fragment_position = vec4(u_model_matrix * a_position);
		
		mat4 world_view_projection = u_projection_matrix * inverse(u_camera_matrix) * u_model_matrix;
		
		// gl_Position = u_world_view_projection * a_position;
		gl_Position = world_view_projection * a_position;
		v_ndc = gl_Position;
	}
	`