var fragmentShaderDepth =`#version 300 es
/*************************************
 * only snow - used to transform other main parallax depth buffer shader
 *************************************/
precision highp float;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

in vec4 v_ndc;

out vec4 output_FragColor;

void main(){
    vec3 h_ndc = v_ndc.xyz / v_ndc.w;   //homogenous from -1.0 to 1.0 in XY axis - clip position
    
    vec4 depthInfo = texture(u_height_map_texture, h_ndc.xy / 2.0 + 0.5);
    float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256.0 - 1.0 / 1024.0;
    
    float transformed_depth = ((gl_FragCoord.z - depthInfo_renderBuffer) * (u_far_plane - u_near_plane)) / u_height_scale;

    if (transformed_depth < 1.1) {   // check if agent is on the same level as snow
        output_FragColor = vec4(
            transformed_depth,  // only parallax height is updated - if something is not updated, change setting of colorMask
            0.0,
            0.0,
            1.0
        );
    } else {
        discard;
    }
}
`