var vertexShader = `#version 300 es
	in vec4 a_position;
	in vec3 a_tangents;
	in vec3 a_bitangents;
	in vec3 a_normals;
	out vec3 v_normals;
	in vec2 a_texcoord;
	out vec2 v_texcoord;
	// in vec2 a_texcoordScale;
	// out vec2 v_texcoordScale;
	uniform vec2 u_mouse;
	out vec4 v_position;
	struct depth_range_t{
		float near;
		float far;
	};
	out depth_range_t v_projected_depth_range;
	// out gl_DepthRangeParameters v_projected_depth_range;
	
	uniform mat4 u_model_matrix;
	uniform mat4 u_camera_matrix;
	uniform mat4 u_world_view_projection;
	uniform mat4 u_world_inverse_transpose;
	
	out mat4 v_model_matrix;
	out mat4 v_camera_matrix;
	out mat4 v_view_matrix;
	out mat4 v_projection_matrix;
	out mat4 v_world_view_projection;
	out mat4 v_world_inverse_transpose;
	
	out mat3 v_TBN;
	
	out vec3 v_fragment_position;
	
	uniform int u_temp_use_the_oclussion;  //sometimes usable
	out float v_temp_use_the_oclussion;
    
	mat4 perspective(float fieldOfViewInRadians, float near, float far, float aspect_ratio);
	
	void main(){
		v_projected_depth_range.near = 0.01;
		v_projected_depth_range.far = 30.0;
		// v_projected_depth_range.diff = v_projected_depth_range.far - v_projected_depth_range.near;

		
	    // v_camera_matrix = rotate_y(rotate.y) * rotate_x(rotate.x);
	    // v_camera_matrix *= translate(0., 0., u_distance);
	    // v_camera_matrix[2].xyz = normalize(v_camera_matrix[3].xyz - vec3(0., 0., 0.));
	    // v_camera_matrix[1].xyz = vec3(0.0, 1.0, 0.0);
	    // v_camera_matrix[0].xyz = normalize(cross(v_camera_matrix[1].xyz, v_camera_matrix[2].xyz));
	    // v_camera_matrix[1].xyz = normalize(cross(v_camera_matrix[2].xyz, v_camera_matrix[0].xyz));
	    // v_view_matrix = inverse(v_camera_matrix);
	    // v_projection_matrix = perspective(
	    // 	radians(90.),
	    // 	v_projected_depth_range.near,
	    // 	v_projected_depth_range.far,
	    // 	u_displayProportion.x / u_displayProportion.y
	    // );
	    
	    // v_world_view_projection = v_projection_matrix * v_view_matrix * v_model_matrix;
		v_world_inverse_transpose = transpose(inverse(v_model_matrix));
		
	
	//https://www.youtube.com/watch?time_continue=269&v=EpADhkiJkJA&embeds_referring_euri=https%3A%2F%2Fwww.google.com%2Fsearch%3Fq%3Dparalax%2Bmapping%2Bimplementation%2Bopengl%26sca_esv%3D576631001%26sxsrf%3DAM9HkKmHyi5MKpR1r8D8c_UJGQn5A5YVxA&source_ve_path=MTM5MTE3LDEzOTExNywyODY2Ng&feature=emb_logo&ab_channel=thebennybox
		vec3 t = (mat3(u_world_inverse_transpose) * a_tangents);
		vec3 b = (mat3(u_world_inverse_transpose) * a_bitangents);
		vec3 n = (mat3(u_world_inverse_transpose) * a_normals) / sqrt(length(cross(t, b)));	//dlaczego sqrt??
		// t = normalize(t - dot(t, n) * n);	//orthogonalize by Gram–Schmidt process
		// b = normalize(b - dot(b, t) * t);
		// vec3 b = cross(n, t);	//b = cross(n, t)
		// vec3 n = normalize(cross(t, b));
		v_TBN = mat3(t, b, n);
		v_TBN = inverse(transpose(v_TBN));

    	v_fragment_position = v_TBN * vec3(v_model_matrix * a_position);

//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		// gl_Position = v_world_view_projection * a_position;
		
		v_normals = a_normals;
    	v_temp_use_the_oclussion = float(u_temp_use_the_oclussion);
		v_texcoord = a_texcoord;
		// v_texcoordScale = a_texcoordScale;
		v_position = a_position;
		v_camera_matrix = u_camera_matrix;
		v_world_view_projection = u_world_view_projection;
		v_model_matrix = u_model_matrix;
		v_world_inverse_transpose = u_world_inverse_transpose;
		
		gl_Position = u_world_view_projection * a_position;
	}

	mat4 perspective(float fieldOfViewInRadians, float near, float far, float aspect_ratio) {
		float fovFactor = tan(radians(90.0) - 0.5 * fieldOfViewInRadians);
		float range_invariant = 1.0 / (near - far);
		return mat4(
			fovFactor / aspect_ratio,	0,			0,									0,
			0,							fovFactor,	0,									0,
			0,							0,			(near + far) * range_invariant,		-1.,
			0,							0,			near * far * range_invariant * 2.,	0
		);
	}
	`