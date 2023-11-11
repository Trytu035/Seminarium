var normalsVAO;
let normalsGlInfo = {
    gl: undefined,
    imagesArray: [],
    texturesArray: [],
    canvas: undefined,
    textureLocation: undefined,
    slopeStrengthLocation: undefined,
}

//init function once
async function init_render_normals_from_height_map() {
    const canvas = document.createElement("canvas");
    canvas.className = "hidden";
    document.body.appendChild(canvas);
    const gl = canvas.getContext("webgl2");
    const create_normals_program = createProgram(
        gl,
        createShader(gl, vertexShaderRenderNormalsFromHeightMap, gl.VERTEX_SHADER),
        createShader(gl, fragmentShaderRenderNormalsFromHeightMap, gl.FRAGMENT_SHADER)
    );
    normalsGlInfo.gl = gl;
    normalsGlInfo.canvas = canvas;
    let positionAttributeLocation = gl.getAttribLocation(create_normals_program, "a_position");
    let texcoordLocation = gl.getAttribLocation(create_normals_program, "a_texcoord");
    normalsGlInfo.textureLocation = gl.getUniformLocation(create_normals_program, "u_height_map_texture");
    normalsGlInfo.slopeStrengthLocation = gl.getUniformLocation(create_normals_program, "u_slope_strength");


    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, -1, 1,  1,-1, -1, 1,  1,-1,  1, 1]), gl.STATIC_DRAW);
    let textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0, 1,  0, 0,  1, 1,  0, 0,  1, 1,  1, 0]), gl.STATIC_DRAW);

    // gl.viewport(0, 0, 256, 256);
    canvas.width = 1024;
    canvas.height = 1024;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(create_normals_program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // size: 2 components per iteration
    // type: the data is 32bit floats
    // normalize: don't normalize the data
    // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
    // offset: start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    gl.enableVertexAttribArray(texcoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
}

async function render_normals_from_height_map(glInfo, height_map, slope_strength, id, textureLocation) {
    let texture = glInfo.gl.createTexture();

    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    glInfo.gl.texImage2D(glInfo.gl.TEXTURE_2D, 0, glInfo.gl.RGBA, 1, 1, 0, glInfo.gl.RGBA, glInfo.gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));
    await addTexture(normalsGlInfo, height_map, normalsGlInfo.gl.TEXTURE1, normalsGlInfo.textureLocation, normalsGlInfo.gl.RGBA, normalsGlInfo.gl.RGBA,
        () => {
            normalsGlInfo.gl.clear(normalsGlInfo.gl.COLOR_BUFFER_BIT | normalsGlInfo.gl.DEPTH_BUFFER_BIT);
            normalsGlInfo.gl.uniform1f(normalsGlInfo.slopeStrengthLocation, slope_strength);
            normalsGlInfo.gl.drawArrays(normalsGlInfo.gl.TRIANGLES, 0, 6);
            console.log("texture_drawn");
            console.log("image_loaded");
            // Now that the image has loaded make copy it to the texture.
            glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
            // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR);
            // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.NEAREST_MIPMAP_NEAREST);
            // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.NEAREST_MIPMAP_LINEAR);
            // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR_MIPMAP_NEAREST);
            glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR_MIPMAP_LINEAR);
            glInfo.gl.texImage2D(glInfo.gl.TEXTURE_2D, 0, glInfo.gl.RGBA, glInfo.gl.RGBA, glInfo.gl.UNSIGNED_BYTE, normalsGlInfo.canvas);
            glInfo.gl.generateMipmap(glInfo.gl.TEXTURE_2D);
            glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, null);
            // normalsGlInfo.gl.clear(normalsGlInfo.gl.COLOR_BUFFER_BIT | normalsGlInfo.gl.DEPTH_BUFFER_BIT);
        }
    );
    console.log("texture_added");
    console.log("texture_pushed");
    glInfo.texturesArray.push(texture);
    glInfo.gl.activeTexture(id);
    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
    if (textureLocation == null) {
        console.log("texturelocation " + (id - glInfo.gl.TEXTURE1) + " is null");
        console.trace();
    } else {
        console.log("location " + (id - glInfo.gl.TEXTURE1));
        // id from glInfo.gl.TEXTURE1 should have textureLocation 0
        glInfo.gl.uniform1i(textureLocation, id - glInfo.gl.TEXTURE1);
    }
    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, null);
}