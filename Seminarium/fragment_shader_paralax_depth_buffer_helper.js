var fragmentShaderDepthTransform =`#version 300 es
/*************************************
 * only snow - used to transform other main paralax depth buffer shader
 *************************************/
precision highp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;

out vec4 output_FragColor;

void main(){
    float fine = mod(gl_FragCoord.z * 256., 1.);
    float coarse = gl_FragCoord.z - fine / 256.;
    
    output_FragColor = vec4(
        0.,
        // texture(u_height_map_texture, v_texcoord).r,
        coarse,     //depth coarse
        fine,       //depth fine
        1.0
    );   //distance 0 - 1 for world_view_direction = TBN[2]
}
`