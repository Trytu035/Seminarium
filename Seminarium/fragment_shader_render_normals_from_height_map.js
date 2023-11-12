var fragmentShaderRenderNormalsFromHeightMap = `#version 300 es
precision lowp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;
uniform float u_slope_strength;

// out vec3 output_FragNormal;
out vec4 output_FragNormal;

void main(){
    // output_FragNormal = vec3(0.5, 0.5, 1.0);
    // output_FragNormal = normalize(texture(u_height_map_texture, v_texcoord).rgb);
    // output_FragNormal = texture(u_height_map_texture, v_texcoord).rgb;
    //
    // vec2 offset_x = (0.01, 0.0);
    // vec2 offset_y = (0.0, 0.01);
    
    float height = texture(u_height_map_texture, v_texcoord).r;    //bottom left
    // float height_bl = textureOffset(u_height_map_texture, v_texcoord).r;    //bottom left
    // float height_br = textureOffset(u_height_map_texture, v_texcoord, ivec2(1, 0)).r;
    // float height_tl = textureOffset(u_height_map_texture, v_texcoord, ivec2(0, 1)).r;
    // float height_tr = textureOffset(u_height_map_texture, v_texcoord, ivec2(1, 1)).r;    //top right
    
    // float s01 = v_slope_strength*textureOffset(u_height_map_texture, v_texcoord, ivec2(-7,  0)).x;
    // float s21 = v_slope_strength*textureOffset(u_height_map_texture, v_texcoord, ivec2( 7,  0)).x;
    // float s10 = v_slope_strength*textureOffset(u_height_map_texture, v_texcoord, ivec2( 0, -7)).x;
    // float s12 = v_slope_strength*textureOffset(u_height_map_texture, v_texcoord, ivec2( 0,  7)).x;
    float s01 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1,  0)).x;
    float s21 = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1,  0)).x;
    float s10 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0, -1)).x;
    float s12 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0,  1)).x;
    vec3 va = normalize(vec3(2.0, 0.0, 8.*8.*u_slope_strength * (s21-s01)));   //x
    vec3 vb = normalize(vec3(0.0, 2.0, 8.*8.*u_slope_strength * (s12-s10)));   //y
    vec4 bump = vec4( normalize(cross(va,vb)), height );
    
    //https://stackoverflow.com/questions/5281261/generating-a-normal-map-from-a-height-map
    float s0 = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1, -1)).x;
    float s1 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0, -1)).x;
    float s2 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1, -1)).x;
    float s3 = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1,  0)).x;
    float s4 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0,  0)).x;
    float s5 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1,  0)).x;
    float s6 = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1,  1)).x;
    float s7 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0,  1)).x;
    float s8 = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1,  1)).x;
    
    vec3 n;
    n.x = u_slope_strength * (s2 - s0 + 1.4*(s5 - s3) + s8 - s6);
    n.y = u_slope_strength * -(s6 - s0 + 1.4*(s7 - s1) + s8 - s2);
    // n.x = u_slope_strength * (s2 - s0 + 2.0*(s5 - s3) + s8 - s6);
    // n.y = u_slope_strength * -(s6 - s0 + 2.0*(s7 - s1) + s8 - s2);
    n.z = 1.0;
    n = normalize(n);
    
    
    // output_FragNormal = vec4(
    // // vec3(bump.x, bump.y, clamp(bump.z , 0., 1.)) / 2.0 + 0.5 -
    // bump.xyz / 2.0 + 0.5
    // , 1.0);

    output_FragNormal = vec4(
    // (bump.xyz - n.xyz) / 2.0 + 0.5
    // n.xyz / 2.0 + 0.5   //softer edges
    bump.xyz / 2.0 + 0.5
    , 1.0);
    
    // output_FragNormal = normalize(texture(u_height_map_texture, v_texcoord).rgb);
    // output_FragNormal = vec4(texture(u_height_map_texture, v_texcoord).rgb, 1.0);
}
`;