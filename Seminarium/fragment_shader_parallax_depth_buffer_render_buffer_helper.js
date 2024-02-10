var fragmentShaderDepthRenderBuffer =`#version 300 es
/*************************************
 * only snow - used to transform other main parallax depth buffer shader
 *************************************/
precision highp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;
uniform float u_near_plane;
uniform float u_far_plane;
uniform float u_height_scale;

// this step has to be made in different draw cycle than fragment_shader_parallax_depth_buffer_helper
void main(){
    vec4 depthInfo = texture(u_height_map_texture, v_texcoord);
    float depthInfo_renderBuffer = depthInfo.g + depthInfo.b / 256.0 - 1.0 / 1024.0;

    gl_FragDepth = depthInfo_renderBuffer + depthInfo.r * u_height_scale / (u_far_plane - u_near_plane);
}
`