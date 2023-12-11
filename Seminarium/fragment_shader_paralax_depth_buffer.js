var fragmentShaderDepth =`#version 300 es
precision highp float;
// precision lowp float;
// precision highp int;
// precision lowp sampler2D;
// precision lowp samplerCube;
in vec4 v_position;
in vec2 v_texcoord;
in vec2 v_mouse;
in mat3 v_TBN;
in vec4 v_fColor;
uniform sampler2D u_normal_texture;
uniform sampler2D u_normal_detail_texture;
uniform sampler2D u_height_map_texture;
uniform sampler2D u_color_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_is_perspective;

in float v_temp_use_the_oclussion;

in vec4 v_fragment_position;
in vec4 v_ndc;

vec3 frag_position; //local

in mat4 v_model_matrix;
in mat4 v_camera_matrix;
in mat4 v_view_matrix;
in mat4 v_projection_matrix;
in mat4 v_world_view_projection;
uniform mat4 u_inverse_world_view_projection;
uniform mat4 u_projection_matrix;
in mat4 v_world_inverse_transpose;
struct depth_range_t {
    float near;
    float far;
};
in depth_range_t v_projected_depth_range;

out vec4 output_FragColor;

mat4 rotate_y(float angle);
mat4 rotate_z(float angle);
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec3 worldViewDir, float height_scale, sampler2D depthMap);
	
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


    vec3 world_view_direction;
    if (u_is_perspective > 0.5) {
        world_view_direction = normalize(v_camera_matrix[3].xyz - v_fragment_position.xyz);
    } else {    //is orthographic
        // world_view_direction = v_camera_matrix[2].xyz;
        world_view_direction = v_TBN[2].xyz;    // if you want to point to camera
    }
    frag_position = vec3(v_fragment_position);
    
    
    mat4 view_projection = u_projection_matrix * inverse(v_camera_matrix);   //clip position
    // vec4 pos1 = inverse(u_projection_matrix * inverse(v_camera_matrix)) * v_fragment_position;   //clip position
    // pos1 = pos1 / pos1.w;  //points normalized
    // pos1 = u_inverse_world_view_projection * pos1;  //points projected
    // pos1 = pos1 / length(pos1.xyz);  //points normalized
    // pos1 -= vec4(-1, -1, -1, 0.);
    
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous from -1 to 1 in every axis
    // vec4 ndc = v_world_view_projection * v_fragment_position;
    vec4 ndc;
    
    // ndc.xy = (gl_FragCoord.xy / vec2(859., 619.)) * 2. - 1.0;
    ndc.xy = ((2.0 * gl_FragCoord.xy) - (2.0 * vec2(0., 0.))) / vec2(859., 619.) - 1.;
    // ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near - gl_DepthRange.far) /    //orginal
    //     (gl_DepthRange.far - gl_DepthRange.near);
    ndc.z = (2.0 * gl_FragCoord.z - gl_DepthRange.near) /    //near is 0 - unacceptable
        (gl_DepthRange.far - gl_DepthRange.near) * gl_DepthRange.far / (2.* gl_FragCoord.z);
        // 4 units for 0.2 additional
    ndc.w = 1.0;
    vec4 clip = ndc / gl_FragCoord.w;
    // vec4 clip = inverse(view_projection) * ndc;
    // vec4 pos = inverse(u_projection_matrix) * clip;
    // vec4 pos = u_projection_matrix * inverse(v_camera_matrix) * v_position;
    
    //dlaczego -0.79??
    // vec4 pos = inverse(view_projection) * vec4(clip.xy, (clip.z - 0.79), 1.);
    // vec4 pos = vec4(clip.xy, (clip.z - 0.79) , 1.);
    // vec4 pos = mod(abs(vec4(clip.xyz , 1.) - u_projection_matrix * inverse(v_camera_matrix) * v_position - vec4(0., 0., 0.5, 0.)) , 1.);
    vec4 pos = mod(abs(vec4(clip.xz, ((u_projection_matrix * inverse(v_camera_matrix) * v_position).z + 0.1), 1.)) , 1.);
    vec4 pos2 = v_position * 0.;
    
    
    
    vec4 np = inverse(view_projection) * vec4(h_ndc.xy, 0.0, 1.0); 
    vec4 fp = inverse(view_projection) * vec4(h_ndc.xy, 1.0, 0.0); 
    // vec4 np = v_camera_matrix * vec4(h_ndc.xy, 0.0, 1.0); 
    // vec4 fp = v_camera_matrix * vec4(h_ndc.xy, 1.0, 0.0); 
    
    // v_ndc.xyz / v_ndc.w -> homogenous coordinates - from -1 to 1
    // v_ndc.xyz -> coordinates - viewport coordinates
    
    // if (v_temp_use_the_oclussion > 0.5) {
    // output_FragColor = vec4(
    //     (inverse(view_projection) * vec4(h_ndc.xy, 0., 0.0)).xyz /2. + 0.5
    // , 1.0);
    // } else {
    // output_FragColor = vec4(
    //     // (normalize(v_position.xyz) / 2. + 0.5) // world coordinates - task - get world coordinates from ndc
    //     // h_ndc.xy, pow(h_ndc.z, 3.)
    //     // (v_camera_matrix * vec4(h_ndc.xy, pow(h_ndc.z, 1.), 1.0)).xyz
    //     ( vec4((pos).xyz, 1.0)).xyz
    //     - ( vec4((pos2).xyz, 1.0)).xyz
    //     // -(inverse(view_projection) * vec4(ndc.xy, 0.0, 1.0)).xyz
    // , 1.0);
    // }
    // output_FragColor = vec4(normalize(
    //     (inverse(view_projection) * vec4(h_ndc.xy, 0.1, 1.0)).xyz 
    //     - ( (inverse(view_projection) * vec4(h_ndc.xy, 30., 1.0)).xyz )
    // ), 1.0);
    
    //działa częściowo
    // /*vec3 */world_view_direction = normalize(
        // (mat3(u_inverse_world_view_projection)) * vec3(ndc.xy / -1., -1. - 1.0)
        // - (mat3(u_inverse_world_view_projection)) * vec3(ndc.xy / ndc.w,  ndc.w - 1.0)
        // - inverse(mat3(v_world_view_projection)) * vec3(v_ndc.xy, 20.) +
        // -(   //działa z jednym błędem
        //     inverse(mat3(v_world_view_projection)) * vec3(-v_ndc.xy / -1., -1. - 1.0)
        //     - inverse(mat3(v_world_view_projection)) * vec3(v_ndc.xy / v_ndc.w, - v_ndc.w - 1.001)
        // )
        // -(
        //     inverse(mat3(v_world_view_projection)) * vec3(v_ndc.xy, 2.)
        //     - inverse(mat3(v_world_view_projection)) * vec3(v_ndc.xy / v_ndc.w, - v_ndc.w + 3.000)
        // )
    // );
    
	  
    
    if (v_temp_use_the_oclussion > 0.5) {
        // world_view_direction = normalize(v_camera_matrix[3].xyz - v_fragment_position.xyz);
        // world_view_direction -= normalize(v_camera_matrix[2].xyz);
    }
    
    vec3 view_direction = world_view_direction * v_TBN;
    
    vec2 delta_uv = view_direction.xy * step_height / -view_direction.z;
    //https://apoorvaj.io/exploring-bump-mapping-with-webgl/
    // vec2 delta_uv = vec2(0., 0.);
    
    texcoord = ParallaxMapping(texcoord, view_direction, world_view_direction, 1.0, u_height_map_texture);
    
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
	
	
	// output_FragColor = vec4((v_camera_matrix[2].xyz) /2. + 0.5, 1);
	
	// output_FragColor = vec4(normalize(normals * v_TBN) /2. + 0.5, 1);
	output_FragColor = vec4((normals) /2. + 0.5, 1);
	// output_FragColor = vec4(((normals * v_TBN) /2. + 0.5)*normalToCamera, 1);
	// output_FragColor = vec4(vec3((theta + phi)/5.), 1);
	// output_FragColor = vec4(texture(u_color_texture, texcoord).rgb*normalToCamera, 1);
	output_FragColor = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*normalToCamera, 1);
	// output_FragColor = vec4(vec3(v_fColor * normalToCamera), 1);
	// output_FragColor = vec4(texture(u_normal_texture, texcoord).rgb*(0.5 + normalToCamera/2.0), 1);
	// output_FragColor = texture(u_normal_texture, texcoord);

	// view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position) * v_TBN;
	// view_direction = normalize(vec3(v_camera_matrix[3]) - frag_position);
	//https://stackoverflow.com/questions/42633685/glsl-how-to-calculate-a-ray-direction-using-the-projection-matrix

	// ff = u_inverse_world_view_projection * v_camera_matrix[3];
	// nn = ff + u_inverse_world_view_projection[2];
	// ff.xyz /= ff.w;
	// nn.xyz /= nn.w;
	// view_direction = normalize(ff.xyz - nn.xyz);
	
	// view_direction = normalize(vec3(v_world_view_projection[3]));
	// view_direction = normalize(normalize(vec3(1., 1., 1. - theta) * normalize(vec3(v_camera_matrix[3]) - frag_position) ) * v_TBN);
	// output_FragColor = vec4(vec3(view_direction.z) / 2. + 0.5, 1);
	
	// output_FragColor = vec4(view_direction / 2. + 0.5, 1);
  	// output_FragColor = vec4(world_view_direction / 2. + 0.5, 1);

	//zbuffer
	// gl_FragCoord.z = frag_position.z;
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 10., 1);
	// output_FragColor = vec4(vec3(pow(gl_FragCoord.z, 5000.0)), 1.);
	// output_FragColor = vec4(
	//     vec3(pow(
	//         (
	//             1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
    //             - 1./u_near_plane
    //         ) / (1./u_far_plane - 1./u_near_plane)
    //     , 5000.0)) // - vec3(pow(gl_FragCoord.z, 500.0))
    // , 1.);
	// output_FragColor = vec4(vec3(length((vec3(v_camera_matrix[3]) - frag_position))) / 5., 1);
	// output_FragColor = vec4(gl_FragCoord.xy /400., 0., 1);
	// output_FragColor = vec4(vec3(u_near_plane), 1.0);
	// gl_FragDepth = (length(  //linear
    //     vec3(v_camera_matrix[3]) - frag_position
    // ) - u_near_plane) / (u_far_plane - u_near_plane);
	// gl_FragDepth = (1./length(   //non linear
    //     vec3(v_camera_matrix[3]) - frag_position
    // ) - 1./u_near_plane) / (1./u_far_plane - 1./u_near_plane);
    
    if (u_is_perspective > 0.5) {
        gl_FragDepth = (    //non linear, projected to camera z-plane
            1./length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
            - 1./u_near_plane
        ) / (1./u_far_plane - 1./u_near_plane);
    } else {
        float to_paralax_fragment = length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz));
        float to_paralax_surface = length(project(v_camera_matrix[3].xyz - v_fragment_position.xyz, v_camera_matrix[2].xyz));
        
    	// output_FragColor = vec4(vec3((to_paralax_fragment - to_paralax_surface)*(v_camera_matrix[2].xyz * v_TBN).z), 1.0);   //distance 0 - 1 for world_view_direction = camera[2]
    	output_FragColor = vec4(vec3((to_paralax_fragment - to_paralax_surface)*length(v_TBN[2].xyz)*length(v_TBN[2].xyz)/(v_camera_matrix[2].xyz * v_TBN).z), 1.0);   //distance 0 - 1 for wordl_view_direction = TBN[2]
    	//todo: fix so that you don't need to divide v_TBN normal by further number - define max distance between surface and max height scale
    	
    	// output_FragColor = vec4(
        //     vec3(
        //         (
        //             length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
        //             // - u_near_plane
        //             - length(project(v_camera_matrix[3].xyz - v_fragment_position.xyz, v_camera_matrix[2].xyz))  //distance to physical plane
        //         ) / (u_far_plane - u_near_plane)
        //     ) // get min distance (v_position) and max distance (v_position + height_scape (1.0)), and divide by the difference to get in-between distance scaled from 0 to 1
        // , 1.);
        gl_FragDepth = (    //non linear, projected to camera z-plane
            length(project(v_camera_matrix[3].xyz - frag_position, v_camera_matrix[2].xyz))  //z plane distance
            - u_near_plane
        ) / (u_far_plane - u_near_plane);
    }
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
vec2 ParallaxMapping(vec2 texCoords, vec3 viewDir, vec3 worldViewDir, float height_scale, sampler2D depthMap)
{
    // number of depth layers
    const float minLayers = 8.0;
    const float maxLayers = 32.0;
    const float numLayers = 40.0;   //must be constant, my computer won't stand if it's not constant
    // float numLayers = mix(maxLayers, minLayers, max(dot(vec3(0.0, 0.0, 1.0), viewDir), 0.0));    //doesn't work - will lag your computer
    
    
    float layerDepth = 1.0 / numLayers;
    float currentLayerDepth = 0.0;

    // the amount to shift the texture coordinates per layer (from vector P)
    vec2 P = viewDir.xy / viewDir.z * height_scale; 
    vec2 deltaTexCoords = P / numLayers;
    vec2  currentTexCoords     = texCoords;
    float currentDepthMapValue = texture(depthMap, currentTexCoords).r;
    
    while(currentLayerDepth < currentDepthMapValue)
    {
        // shift texture coordinates along direction of P
        currentTexCoords -= deltaTexCoords;
        frag_position -= worldViewDir / viewDir.z * height_scale / numLayers;   //added line
        // get depthmap value at current texture coordinates
        currentDepthMapValue = texture(depthMap, currentTexCoords).r;  
        // get depth of next layer
        currentLayerDepth += layerDepth ;  
    }
    
    // get texture coordinates before collision (reverse operations)
    vec2 prevTexCoords = currentTexCoords + deltaTexCoords;
    vec3 prevFragPos = frag_position + worldViewDir / viewDir.z * height_scale / numLayers;
    
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