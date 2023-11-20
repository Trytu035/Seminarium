function createShader(gl, sourceCode, type) {
    // Compiles either a shader of type gl.VERTEX_SHADER or gl.FRAGMENT_SHADER
    /** @type {WebGLShader} */
    const shader = gl.createShader(type);

    gl.shaderSource(shader, sourceCode);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const info = gl.getShaderInfoLog(shader);
        throw `Could not compile WebGL program. \n\n${info}`;
    }

    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    var program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    var success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) {
        return program;
    }

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

async function addTexture(model, source, id, textureLocation, internalFormat, format, callback) {
    let gl = model.material.gl;
    let texture = gl.createTexture();

    gl.bindVertexArray(model.VAO);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));
    let image = new Image();
    image.src = source;
    await image.addEventListener('load', function () {
        // Now that the image has loaded make copy it to the texture.
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, image);
        model.images.push(image);
        gl.generateMipmap(gl.TEXTURE_2D);
        if (callback !== undefined) {
            console.log(callback);
            callback();
        }
    });
    model.textures.push(texture);
    gl.activeTexture(id);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (textureLocation == null) {
        console.log("texturelocation " + (id - gl.TEXTURE1) + " is null");
        console.trace();
    } else {
        // id from gl.TEXTURE1 should have textureLocation 0
        gl.uniform1i(textureLocation, id - gl.TEXTURE1);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
}