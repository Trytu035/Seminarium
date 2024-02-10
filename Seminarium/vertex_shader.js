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
	
	uniform int u_temp_use_the_occlusion;  //sometimes useful
    
	void main(){
		vec3 t = normalize(mat3(u_model_matrix) * a_tangents);
		vec3 b = normalize(mat3(u_model_matrix) * a_bitangents);
		vec3 n = normalize(mat3(u_world_inverse_transpose) * a_normals);

		v_TBN = mat3(t, b, n);
		v_TBN = inverse(transpose(v_TBN));

		v_normals = a_normals;
		v_texcoord = a_texcoord;
		v_position = a_position;
    	v_fragment_position = vec4(u_model_matrix * a_position);
    	v_light_direction = normalize(u_camera_matrix[2].xyz);
		
		gl_Position = u_world_view_projection * a_position;
		v_ndc = gl_Position;
	}
	`