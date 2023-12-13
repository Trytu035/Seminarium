fragmentShaderCopy = `#version 300 es
precision highp float;
uniform sampler2D u_texture;
in vec2 v_texcoord;
// out vec3 output_FragColor;
out vec4 output_FragColor;

void main () {
    // output_FragColor = texture(u_texture, v_texcoord).xyz;
    output_FragColor = vec4(texture(u_texture, v_texcoord).xyz, 1.0);
}
`