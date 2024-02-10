var fragmentShaderRenderNormalsFromHeightMap = `#version 300 es
precision lowp float;
in vec2 v_texcoord;
uniform sampler2D u_height_map_texture;
uniform float u_slope_strength;

// out vec3 output_FragNormal;
out vec4 output_FragNormal;

void main(){
    // https://en.wikipedia.org/wiki/Sobel_operator
    // https://github.com/cpetry/NormalMap-Online/blob/gh-pages/javascripts/shader/NormalMapShader.js - fragment from MIT licenced - Copyright (c) 2019 Christian Petry
    // licenced by https://github.com/cpetry/NormalMap-Online/blob/gh-pages/LICENSE
    // (1, 1) is in the bottom left direction from the origin of the texture.
    // l (left) = 1, r (right) = -1, t (top) = -1, b (bottom) = 1, m (middle) = 0
    float rt = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1, -1)).x;
    float mt = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0, -1)).x;
    float lt = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1, -1)).x;
    float rm = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1,  0)).x;
    float lm = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1,  0)).x;
    float rb = textureOffset(u_height_map_texture, v_texcoord, ivec2(-1,  1)).x;
    float mb = textureOffset(u_height_map_texture, v_texcoord, ivec2( 0,  1)).x;
    float lb = textureOffset(u_height_map_texture, v_texcoord, ivec2( 1,  1)).x;
    
      // [5.91, 61.77, 120.64, 61.77, 5.91]/256 * ([21.27, 85.46, 0, -85.46, -21.27]/256)
    
    vec3 normal;
    // sum of weights = 0.6340625 * 2 + 0.18296875 * 4 = 2
    // slope strength / sum of weights * weighted sum
    normal.x = u_slope_strength * 0.5 * ((lt + lb - rt - rb)*0.18296875 + (lm - rm)*0.6340625); // Scharr opperator  ([0.6340625, 0.18296875] values from https://www.researchgate.net/publication/36148383_Optimal_operators_in_digital_image_processing_Elektronische_Ressource)
    normal.y = u_slope_strength * 0.5 * ((lt + rt - lb - rb)*0.18296875 + (mt - mb)*0.6340625); //  [0.6341, 0.1830] - ISBN 978-3-540-69864-7 - Section: Optimal Filters for Extended Optical Flow - Hanno Scharr
    normal.z = 1.0;
    normal = normalize(normal);
    
    // // float arr[25];
    // const float arrU[5] = float[5](5.91, 61.77, 120.64, 61.77, 5.91);
    // const float arrV[5] = float[5](21.27, 85.46, 0.0, -85.46, -21.27);
    // vec3 normal = vec3(0., 0., 1.);
    // for (int i = 0; i < 5; i++){
    //     for (int j = 0; j < 5; j++){
    //         normal.x += arrU[i]*arrV[j]*textureOffset(u_height_map_texture, v_texcoord, ivec2( i,  j)).x;
    //         normal.y += arrV[i]*arrU[j]*textureOffset(u_height_map_texture, v_texcoord, ivec2( i,  j)).x;
    //     }
    // }
    // normal.x *= u_slope_strength / 65536.;
    // normal.y *= u_slope_strength / 65536.;
    // normal = normalize(normal);

    output_FragNormal = vec4(normal / 2.0 + 0.5, 1.0);
}
`;