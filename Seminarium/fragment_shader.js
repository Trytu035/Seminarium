var fragmentShader =`#version 300 es
// precision highp float;
precision lowp float;
// precision highp int;
// precision lowp sampler2D;
// precision lowp samplerCube;
in vec4 v_position;
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

vec3 frag_position; //local

in mat4 v_model_matrix;
in mat4 v_camera_matrix;
in mat4 v_view_matrix;
in mat4 v_projection_matrix;
in mat4 v_world_view_projection;
in mat4 v_world_inverse_transpose;
struct depth_range_t {
    float near;
    float far;
};
in depth_range_t v_projected_depth_range;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, float height_scale, sampler2D depthMap);
	
//https://www.omnicalculator.com/math/vector-projection
vec3 project(vec3 a, vec3 overB) {   //projects vector a, over vector b, resulting in vector b of length  of vector a projected on b
	return dot(a, overB) / dot(overB, overB) * overB;
}

void main(){
    //apparent height under the cursor 
    float height;
    
    //max height is 0 distance from the surface. - it's equivalent to pure white (1.0)
    //min height - max_parallax is the distance from the surface in it's normal direction - it's equivalent to pure black (0.0)
    const float max_parallax = 0.5;
    const int number_of_iterations = 20;
    const float step_height = max_parallax / float(number_of_iterations);
    vec2 texcoord = v_texcoord;

    vec3 view_position = v_camera_matrix[3].xyz;
    frag_position = vec3(v_position);
    vec3 view_direction = normalize(view_position - frag_position) * v_TBN;  //tangent view_direction
    vec3 world_view_direction = normalize(view_position - frag_position);
    vec2 delta_uv = view_direction.xy * step_height / -view_direction.z;
    //https://apoorvaj.io/exploring-bump-mapping-with-webgl/
    // vec2 delta_uv = vec2(0., 0.);
    
    texcoord = ParallaxMapping(texcoord, view_direction, 1.0, u_height_map_texture);
    
    /*float accumulator = 0.;
    float point_of_crossing;
    vec2 prev_texcoord;
    for (int i = 0; i < number_of_iterations; i++) {
        height = texture(u_height_map_texture, texcoord).r;
        height = 1.0 - height;
        height *= max_parallax;
        if (height <= accumulator) {
            // if (i != 0) {
            //     prev_texcoord = texcoord - delta_uv;
                prev_texcoord = texcoord;
            // }
            float prev_height = 1. - texture(u_height_map_texture, prev_texcoord).r;
            
            prev_height *= max_parallax;

            // float terrain_gradient = (height - prev_height) / length(delta_uv);
            // float terrain_bias = height;
            // float camera_gradient = step_height / length(delta_uv);
            // float camera_bias = accumulator;
            
            float next = height - accumulator;
            float prev = prev_height - accumulator + step_height;
            
            point_of_crossing = next / (next - prev);
            texcoord = mix(texcoord + delta_uv, texcoord, point_of_crossing);
            frag_position = mix(frag_position - world_view_direction / view_direction.z * step_height, frag_position, point_of_crossing);

            break;
        }
        frag_position -= world_view_direction / view_direction.z * step_height;
        texcoord += delta_uv;
        accumulator += step_height;
    }*/
    
    //texcoord is visible by the viewer. vtexcoord is the orginal
    
    float detail_scale = 1.618;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    float detail_strength = 1.0;     //golden ratio is the most irrational number, so it'll hide the tiling the most 
    vec3 detail_normals = normalize(texture(u_normal_detail_texture, texcoord * detail_scale).rgb * 2.0 - 1.0);
    detail_normals = normalize(vec3(detail_normals.xy, detail_normals.z * detail_strength)); // / detail_strength
	vec3 normals = normalize(texture(u_normal_texture, texcoord).rgb * 2.0 - 1.0);
	float phi = atan(detail_normals.y, detail_normals.x);
	float theta = atan(length(detail_normals.xy), detail_normals.z);
	normals = normalize(vec3(rotate_z(phi) * rotate_y(theta) * rotate_z(-phi) * vec4(normals, 0.0)));
	// normals = vec3(normals.x, normals.y, clamp(normals.z, 0., 1.));  //clamp z
	
	//to reverse all normals, referse [0] and [1]
	normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * normals );
	// normals = normalize(mat3(-v_TBN[0], v_TBN[1], v_TBN[2]) * normals );
    
    // phi, theta for visuals
    // phi = atan((normals * v_TBN).y, (normals * v_TBN).x);
    // theta = atan(length((normals * v_TBN).xy), (normals * v_TBN).z);
    
    float normalToCamera = dot(normals, normalize(v_camera_matrix[2].xyz));

	// output_FragColor = vec4(vec3(1.*(0.5 + normalToCamera/2.0)), 1);

	// output_FragColor = vec4(vec3(height)*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb, 1);
	
	// if (v_temp_use_the_oclussion > 0.5) {
	//     output_FragColor = vec4(normalize(v_TBN[2]) /2. + 0.5, 1);
	// }else {
	//     output_FragColor = vec4(normalize(normals.rgb) / 2. + 0.5, 1);
	// }
	
	// output_FragColor = vec4((v_camera_matrix[2].xyz) /2. + 0.5, 1);
	
	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	// output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * v_TBN) /2. + 0.5)*normalToCamera, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	output_FragColor = vec4(texture(u_color_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*(0.5 + normalToCamera/2.0), 1);
	// output_FragColor = texture(u_normal_texture, texcoord);

	// view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) * v_TBN;
	view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position);
	// view_direction = normalize(normalize(vec3(1., 1., 1. - theta) * normalize(vec3(v_camera_matrix[3]) - frag_position) ) * v_TBN);
	// output_FragColor = vec4(vec3(view_direction.z) / 2. + 0.5, 1);
	//zbuffer
	// gl_FragCoord.z = frag_position.z;
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 10., 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 500.0)), 1.);
	// output_FragColor = vec4(
	//     vec3(pow(
	//         (
	//             1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
    //             - 1./v_projected_depth_range.near
    //         ) / (1./v_projected_depth_range.far - 1./v_projected_depth_range.near)
    //     , 500.0)) // - vec3(pow(gl_FragCoord.z, 500.0))
    // , 1.);
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 5., 1);
	// output_FragColor = vec4(gl_FragCoord.xy /400., 0., 1);
	// output_FragColor = vec4(vec3(v_projected_depth_range.near), 1.0);
	// gl_FragDepth = (length(  //linear
    //     vec3(v_camera_matrix[3]) - frag_position
    // ) - v_projected_depth_range.near) / (v_projected_depth_range.far - v_projected_depth_range.near);
	// gl_FragDepth = (1./length(   //non linear
    //     vec3(v_camera_matrix[3]) - frag_position
    // ) - 1./v_projected_depth_range.near) / (1./v_projected_depth_range.far - 1./v_projected_depth_range.near);
	gl_FragDepth = (    //non linear, projected to camera z-plane
        1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
        - 1./v_projected_depth_range.near
    ) / (1./v_projected_depth_range.far - 1./v_projected_depth_range.near);
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

//https://learnopengl.com/Advanced-Lighting/Parallax-Mapping
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, float height_scale, sampler2D depthMap)
{ 
    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    const float numLayers = 40.0;
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer
    
    
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale; 
    vec2 deltaTexCoords = P / numLayers;
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;
      
    // trzeba podzielić przez skalę textury
    //poniższa linia do zmiany
    // nie trzeba dzielić przez skalę tekstury, jeżeli wektory TBN są znormalizowane pod względem skali UV mapy
    //trzeba podzielić przez skalę głębokości?
    vec3 world_view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) / viewDir.z;   //added line 
    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        frag_position -= world_view_direction * height_scale / numLayers;   //added line
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth ;  
    }
    
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    vec3 prevFragPos = frag_position + world_view_direction * height_scale / numLayers;
    
    // get depth after and before collision for linear interpolation
    float afterDepth  = currentDepthMapValue - currentLayerDepth;
    float beforeDepth = texture(depthMap, prevTexCoords).r - currentLayerDepth + layerDepth;
     
    // interpolation of texture coordinates
    float weight = afterDepth / (afterDepth - beforeDepth);
    vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    frag_position = (prevFragPos) * weight     //added line
                    + (frag_position) * (1.0 - weight);
    
    return finalTexCoords;
}
`