var vertexShader = `#version 300 es
	in vec4 a_position;
	//in vec3 a_color;
	in vec3 a_tangents;
	in vec3 a_bitangents;
	in vec3 a_normals;
in vec2 a_texcoord;
out vec2 v_texcoord;
	out vec4 v_fColor;
	out vec3 v_fNormals;
	uniform vec2 u_mouse;
	uniform vec2 u_rotate;
	uniform vec3 u_cameraRotation;  //useless
	uniform vec2 u_displayProportion;
	uniform float u_distance;
	out float v_distance;
	out vec4 v_position;
	
	out mat4 v_model_matrix;
	out mat4 v_camera_matrix;
	out mat4 v_view_matrix;
	out mat4 v_projection_matrix;
	out mat4 v_world_view_projection;
	out mat4 v_world_inverse_transpose;
	
	out float v_normalToCamera;
	out vec3 v_cameraRotation;  //useless
	out mat3 v_TBN;
	
	out vec3 v_fragment_position;
	
	uniform int u_temp_use_the_oclussion;  //sometimes usable
	out float v_temp_use_the_oclussion;
    
    mat4 translate(float x, float y, float z);
	mat4 rotate_x(float angle);
	mat4 rotate_y(float angle);
	mat4 rotate_z(float angle);
	mat4 scale(float factor);
	mat4 project(float factor);
	mat4 perspective(float near, float far, float aspect_ratio);
	
	void main(){
    	v_temp_use_the_oclussion = float(u_temp_use_the_oclussion);
		v_texcoord = a_texcoord;
		v_position = a_position;

		vec3 rotate = vec3(u_rotate.yx, 0.0);
		
	    v_model_matrix = mat4(1);
	    v_camera_matrix = rotate_y(rotate.y) * rotate_x(rotate.x) ;
	    // v_camera_matrix *= translate(0., 0., 0.);
	    v_camera_matrix *= translate(0., 0., u_distance);
	    v_view_matrix = inverse(v_camera_matrix);
	    v_projection_matrix = perspective(0.01, 10.0, u_displayProportion.x / u_displayProportion.y);
	    
	    v_world_view_projection = v_projection_matrix * v_view_matrix * v_model_matrix;
		v_world_inverse_transpose = transpose(inverse(v_model_matrix));
		
		v_distance = u_distance;
		v_cameraRotation = u_cameraRotation;
		v_fNormals = a_normals;
	
	//https://www.youtube.com/watch?time_continue=269&v=EpADhkiJkJA&embeds_referring_euri=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dparalax%2Bmapping%2Bimplementation%2Bopengl%26sca_esv%3D576631001%26sxsrf%3DAM9HkKmHyi5MKpR1r8D8c_UJGQn5A5YVxA&source_ve_path=MTM5MTE3LDEzOTExNywyODY2Ng&feature=emb_logo&ab_channel=thebennybox
		vec3 n = normalize((v_world_inverse_transpose * vec4(a_normals, 0.0)).xyz);
		vec3 t = normalize((v_world_inverse_transpose * vec4(a_tangents, 0.0)).xyz);
		t = normalize(t - dot(t, n) * n);
		vec3 b = cross(t, n);
		v_TBN = mat3(t, b, n);
		// v_TBN = inverse(transpose(v_TBN));

    	v_fragment_position = v_TBN * vec3(v_model_matrix * a_position);

//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		gl_Position = v_world_view_projection * a_position;
	}

	mat4 translate(float x, float y, float z) {
        return mat4(
            1, 0, 0, 0,
            0, 1, 0, 0,
            0, 0, 1, 0,
            x, y, z, 1
        );
    }
	mat4 scale(float x, float y, float z) {
        return mat4(
            x, 0, 0, 0,
            0, y, 0, 0,
            0, 0, z, 0,
            0, 0, 0, 1
        );
    }
	mat4 rotate_x(float angle) {
		return mat4(
			1.0,		0.0,		0.0,		0.0, 
			0.0,		cos(angle),	sin(angle),	0.0,
			0.0,		-sin(angle),cos(angle),	0.0,
			0.0,		0.0,		0.0,		1.0
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
	
	mat4 rotate(float x, float y, float z) {
		return rotate_x(x) * rotate_y(y) * rotate_z(z);
	}
	
	mat4 perspective(float near, float far, float aspect_ratio) {
		float range_invariant = 1.0 / (near - far);
		return mat4(
			1. / aspect_ratio,	0,	0,									0,
			0,					1.,	0,									0,
			0,					0,	(near + far) * range_invariant,		-1.,
			0,					0,	near * far * range_invariant * 2.,	0
		);
	}
	`