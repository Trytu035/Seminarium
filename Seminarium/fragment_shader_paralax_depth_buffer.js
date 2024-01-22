var fragmentShaderDepth =`#version 300 es
/*************************************
 * only snow - used to transform other main paralax depth buffer shader
 *************************************/
precision highp float;
// in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

in vec4 v_ndc;

in mat4 v_model_matrix;
in mat4 v_camera_matrix;

out vec4 output_FragColor;

void main(){
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous from -1 to 1 in every axis - clip position
    
    // float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256. + depthInfo.a / 256. / 256.;
    	
    vec4 depthInfo = texture(u_height_map_texture, h_ndc.xy / 2. + 0.5);
    float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256. - 1. / float(2 << 10);   // small bias
    
    gl_FragDepth = gl_FragCoord.z;
    
    float transformed_depth = ((gl_FragCoord.z - depthInfo_renderBuffer) * (u_far_plane - u_near_plane)) / u_height_scale;

    if (transformed_depth < 1.1) {   // check if agent is on the same level as snow
        output_FragColor = vec4(
            transformed_depth,  // only paralax height is updated - if something is not updated, change setting of colorMask
            0.0,
            0.0,
            1.0
        );
    } else {
        discard;
    }
}
`