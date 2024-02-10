var vertexShaderSnow = `#version 300 es
precision highp float;
	in vec4 a_position;
	in vec3 a_tangents;
	in vec3 a_bitangents;
	in vec3 a_normals;
	in vec3 a_tangents_color;
	in vec3 a_bitangents_color;
	in vec3 a_normals_color;
	in vec2 a_texcoord;			// main texcoord for normal map and height map
	in vec2 a_texcoord_color;	// secondary texcoord for color map and detail map
	in vec3 a_color;

	uniform mat4 u_model_matrix;
	uniform mat4 u_camera_matrix;
	uniform mat4 u_view_matrix;
	uniform mat4 u_projection_matrix;
	uniform mat4 u_world_view_projection;
	uniform mat4 u_world_inverse_transpose;

	// uniform vec2 u_mouse;
	// uniform int u_temp_use_the_occlusion;  //sometimes useful
	uniform vec3 u_snow_direction;
    
	out vec4 v_position;
	out vec3 v_normals;
	out vec2 v_texcoord;
	out vec2 v_texcoord_color;
	out vec3 v_color;
	
	out mat3 v_TBN;
	out mat3 v_TBN_color;
	
	out vec4 v_fragment_position;
	out vec4 v_ndc;
	out vec3 v_light_direction;
	
	void main(){
		//normally you would use model inverse transpose instead of model matrix, but the last step involves inverse transposing the TBN matrix, so you shouldn't do it second time
		// the statement above is true for wrong reasons. (see fragment_lambertian and vertex_shader) - maybe it's because of normals - some source said that model_inverse_transpose math works only for normals.
		vec3 t = 			(mat3(u_model_matrix) * a_tangents);
		vec3 b = 			(mat3(u_model_matrix) * a_bitangents);
		// vec3 n = 		(mat3(u_world_inverse_transpose) * a_normals);
		vec3 t_color = 		(mat3(u_model_matrix) * a_tangents_color);
		vec3 b_color = 		(mat3(u_model_matrix) * a_bitangents_color);
		// vec3 n_color = 	(mat3(u_world_inverse_transpose) * a_normals_color);

		v_TBN = mat3(t, b, u_snow_direction);	// set parallax to point at snow plane direction
		v_TBN_color = mat3(t_color, b_color, u_snow_direction);	// if projected from normal parallax bends in oneself - 

		// https://paroj.github.io/gltut/Illumination/Tut09%20Normal%20Transformation.html 
		v_TBN = inverse(transpose(v_TBN));				//for not normalized TBN use inverse(transpose(TBN))
		v_TBN_color = inverse(transpose(v_TBN_color));	//for not normalized TBN use inverse(transpose(TBN))

//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		v_normals = a_normals;
		v_texcoord = a_texcoord;
		v_texcoord_color = a_texcoord_color;
		v_position = a_position;
		v_color = a_color;
    	v_fragment_position = vec4(u_model_matrix * a_position);
    	v_light_direction = normalize(u_camera_matrix[2].xyz);
    	// v_light_direction = normalize(vec3(1., 1., 0.));
		
		gl_Position = u_world_view_projection * a_position;
		v_ndc = gl_Position;
	}
	`