var fragmentShaderAddOne =`#version 300 es
#extension GL_EXT_conservative_depth : enable

// Ensure that the shader compiles when the extension is not supported
#ifdef GL_EXT_conservative_depth
    layout (depth_greater) out highp float gl_FragDepth;
#endif
precision highp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

out vec4 output_FragColor;

// adds one to parallax (changes parallax), so depth buffer must be overwritten.
void main(){
    vec4 depthInfo = texture(u_height_map_texture, v_texcoord);
    float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256.0 - 1.0 / 1024.0;

    gl_FragDepth = depthInfo_renderBuffer + (depthInfo.r - 1. / 256.) * u_height_scale / (u_far_plane - u_near_plane);
    
    output_FragColor = vec4(
        depthInfo.r - 1. / 256.,
        0., 0., 1.    //colorMasked
    );
}
`