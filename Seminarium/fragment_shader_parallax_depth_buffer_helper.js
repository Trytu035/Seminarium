var fragmentShaderDepthTransform =`#version 300 es
/*************************************
 * only snow - used to transform other main parallax depth buffer shader
 *************************************/
precision highp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;

out vec4 output_FragColor;

void main(){
    float fine = fract(gl_FragCoord.z * 256.0);
    float coarse = gl_FragCoord.z - fine / 256.0;
    
    output_FragColor = vec4(
        // 0.0,
        texture(u_height_map_texture, v_texcoord).r,
        coarse,     //depth coarse
        fine,       //depth fine
        1.0
    );
}
`