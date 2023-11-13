var fragmentShaderDepth =`#version 300 es
precision highp float;
// precision lowp float;
// precision highp int;
// precision lowp sampler2D;
// precision lowp samplerCube;
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

vec3 frag_position; //local

in mat4 v_model_matrix;
in mat4 v_camera_matrix;
in mat4 v_view_matrix;
in mat4 v_projection_matrix;
in mat4 v_world_view_projection;
in mat4 v_world_inverse_transpose;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
// vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir);
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, float height_scale, sampler2D depthMap);
	
void main(){
    //apparent height under the cursor 
    float height;
    
    //max height is 0 distance from the surface. - it's equivalent to pure white (1.0)
    //min height - max_parallax is the distance from the surface in it's normal direction - it's equivalent to pure black (0.0)
    const float max_parallax = 0.5;
    const int number_of_iterations = 20;
    const float step_height = max_parallax / float(number_of_iterations);
    vec2 texcoord = v_texcoord;

    vec3 view_position = v_view_matrix[3].xyz;
    frag_position = vec3(v_position);
    vec3 view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) * v_TBN;  //tangent view_direction
    vec3 world_view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position);
    vec2 delta_uv = view_direction.xy * step_height / -view_direction.z;
    //https://apoorvaj.io/exploring-bump-mapping-with-webgl/
    
    texcoord = ParallaxMapping(texcoord, view_direction, 0.5, u_height_map_texture);
    
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
	
	normals = normalize(mat3(v_TBN[0], -v_TBN[1], v_TBN[2]) * normals );

	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	output_FragColor = vec4((normals) /2. + 0.5, 1);
	view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) * v_TBN;
	// view_direction = normalize(normalize(vec3(1., 1., 1. - theta) * normalize(vec3(v_camera_matrix[3]) - frag_position) ) * v_TBN);
	// output_FragColor = vec4(view_direction / 2. + 0.5, 1);

	// gl_FragCoord.z = frag_position.z;
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 10., 1);
	output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 500.0)), 1.);
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 2., 1);
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
    const float numLayers = 20.;
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));
    
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale; 
    vec2 deltaTexCoords = P / numLayers;
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;
      
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
    // vec2 finalTexCoords = prevTexCoords * weight + currentTexCoords * (1.0 - weight);
    vec2 finalTexCoords = currentTexCoords;
    frag_position = (prevFragPos) * weight     //added line
                    + (frag_position) * (1.0 - weight);
    
    return finalTexCoords;
}
`