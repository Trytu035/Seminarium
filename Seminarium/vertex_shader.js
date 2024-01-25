var vertexShader = `#version 300 es
precision highp float;
	in vec4 a_position;
	in vec3 a_tangents;
	in vec3 a_bitangents;
	in vec3 a_normals;
	out vec3 v_normals;
	in vec2 a_texcoord;
	out vec2 v_texcoord;
	uniform vec2 u_mouse;
	out vec4 v_position;
	
	uniform mat4 u_model_matrix;
	uniform mat4 u_camera_matrix;
	uniform mat4 u_view_matrix;
	uniform mat4 u_projection_matrix;
	uniform mat4 u_world_view_projection;
	uniform mat4 u_world_inverse_transpose;
	
	out mat3 v_TBN;
	
	out vec4 v_fragment_position;
	out vec4 v_ndc;
	out vec3 v_light_direction;
	
	uniform int u_temp_use_the_oclussion;  //sometimes useful
    
	void main(){
	//https://www.youtube.com/watch?time_continue=269&v=EpADhkiJkJA&embeds_referring_euri=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dparalax%2Bmapping%2Bimplementation%2Bopengl%26sca_esv%3D576631001%26sxsrf%3DAM9HkKmHyi5MKpR1r8D8c_UJGQn5A5YVxA&source_ve_path=MTM5MTE3LDEzOTExNywyODY2Ng&feature=emb_logo&ab_channel=thebennybox
		vec3 t = normalize(mat3(u_model_matrix) * a_tangents);
		vec3 b = normalize(mat3(u_model_matrix) * a_bitangents);
		// vec3 n = normalize(mat3(u_world_inverse_transpose) * a_normals) / sqrt(length(cross(t, b)));	//dlaczego sqrt??
		vec3 n = normalize(mat3(u_world_inverse_transpose) * a_normals);	//dlaczego sqrt??

		v_TBN = mat3(t, b, n);
		v_TBN = inverse(transpose(v_TBN));

//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		v_normals = a_normals;
		v_texcoord = a_texcoord;
		v_position = a_position;
    	v_fragment_position = vec4(u_model_matrix * a_position);
    	v_light_direction = normalize(u_camera_matrix[2].xyz);
		
		gl_Position = u_world_view_projection * a_position;
		v_ndc = gl_Position;
	}
	`