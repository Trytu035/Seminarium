var fragmentShader =`
precision lowp float;
varying vec4 v_fColor;
// varying vec4 v_position;
varying mat4 v_model_matrix;
varying vec3 v_fNormals;
varying float v_normalToCamera;
varying vec2 v_texcoord;
varying vec3 v_cameraRotation;
varying mat3 v_TBN;
uniform sampler2D u_normal_texture;
uniform sampler2D u_height_map_texture;
uniform sampler2D u_color_texture;

varying float v_temp_use_the_oclussion;

mat3 projection_matrix(vec3 vector) {
    return mat3(
        vector.x * vector.x, vector.x * vector.y, vector.x * vector.z,
        vector.y * vector.x, vector.y * vector.y, vector.y * vector.z,
        vector.z * vector.x, vector.z * vector.y, vector.z * vector.z
    );
}

void main(){
    //apparent height under the cursor 
    float height = texture2D(u_height_map_texture, v_texcoord).r;
    
    //max height is 0 distance from the surface. - it's equivalent to pure white (1.0)
    //min height - max_parallax is the distance from the surface in it's normal direction - it's equivalent to pure black (0.0)
    const float max_parallax = 0.5;
    const int number_of_iterations = 20;
    const float step_height = max_parallax / float(number_of_iterations);
    // height = 1.0 - height;
    height *= max_parallax;
    vec2 texcoord = v_texcoord;
    mat3 tangent_projection = projection_matrix(normalize(v_TBN[0]));
    mat3 bitangent_projection = projection_matrix(normalize(v_TBN[1]));
    mat3 normal_projection = projection_matrix(normalize(v_TBN[2]));
    //check if length face forwards or backwards
    vec3 projected_camera = vec3(
        mat3(v_model_matrix) * v_TBN[0],
        mat3(v_model_matrix) * v_TBN[1],
        mat3(v_model_matrix) * v_TBN[2]
        // -length(mat3(v_model_matrix) * v_TBN[0]) * faceforward(vec3(1), mat3(v_model_matrix) * v_TBN[0], v_TBN[0]).x,
        // length(mat3(v_model_matrix) * v_TBN[1]) * faceforward(vec3(1), mat3(v_model_matrix) * v_TBN[1], v_TBN[1]).x,
        // length(mat3(v_model_matrix) * v_TBN[2]) * faceforward(vec3(1), mat3(v_model_matrix) * v_TBN[2], v_TBN[2]).x
        // -length(tangent_projection * v_cameraRotation) * faceforward(vec3(1), tangent_projection * v_cameraRotation, v_TBN[0]).x,
        // length(bitangent_projection * v_cameraRotation) * faceforward(vec3(1), bitangent_projection * v_cameraRotation, v_TBN[1]).x,
        // length(normal_projection * v_cameraRotation) * faceforward(vec3(1), normal_projection * v_cameraRotation, v_TBN[2]).x
    );

    projected_camera = projected_camera / projected_camera.z; //tangentz is 1 unit in length
    projected_camera = normalize(projected_camera);

    vec2 delta_uv = vec2(tan(asin(projected_camera.x)), tan(asin(projected_camera.y))) * step_height;

    float accumulator = 0.;
    float point_of_crossing;
    vec2 prev_texcoord;
    for (int i = 0; i < number_of_iterations; i++) {
        accumulator += step_height;
        texcoord += delta_uv;
        height = texture2D(u_height_map_texture, texcoord).r;
        height *= max_parallax;
        if (height < accumulator) {
            prev_texcoord = texcoord - delta_uv;
            float prev_height = texture2D(u_height_map_texture, prev_texcoord).r;
            
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
    
	vec3 normals = texture2D(u_normal_texture, texcoord).rgb;
	normals = normalize(normals * 2.0 - 1.0);
	normals = normalize(v_TBN * normals);
    // float normalToCamera = dot(normals, v_cameraRotation);
    float normalToCamera = dot(normals, v_cameraRotation);

	// /* 
	// vec3 normals = 5.*(texture2D(u_normal_texture, texcoord).rgb - vec3(0.5, 0.5, 1.0));
	// float normalToCamera = 1.0 - acos(
    //     dot(v_fNormals.xyz + normals, v_cameraRotation) / ((length(v_fNormals.xyz + normals)*length(v_cameraRotation)))
    //     // dot(normalize(v_fNormals.xyz), normalize(v_cameraRotation))
    // );
    // */

	// gl_FragColor = vec4(vec3(0.5 + point_of_crossing*0.)*normalToCamera, 1);
	// gl_FragColor = vec4(vec3(1.*(0.5 + normalToCamera/2.0)), 1);

	// gl_FragColor = vec4(vec3(height)*normalToCamera, 1);
	gl_FragColor = vec4(texture2D(u_color_texture, texcoord).rgb*normalToCamera, 1);
	// gl_FragColor = vec4(texture2D(u_height_map_texture, texcoord).rgb*normalToCamera, 1);
	// gl_FragColor = vec4(texture2D(u_normal_texture, texcoord).rgb*normalToCamera, 1);
	// gl_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);
	// gl_FragColor = vec4(texture2D(u_normal_texture, texcoord).rgb*(0.5 + normalToCamera/2.0), 1);
	//gl_FragColor = texture2D(u_normal_texture, texcoord);
	//vec3 basic = texture2D(u_normal_texture, texcoord).rgb*(0.5 + v_normalToCamera);
	//gl_FragColor = vec4(basic.rgb + v_position.xyz, 1);
}`