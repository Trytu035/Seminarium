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

async function addTexture(glInfo, source, id, textureLocation, internalFormat, format, callback) {
    let texture = glInfo.gl.createTexture();
    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
    // Fill the texture with a 1x1 blue pixel.
    glInfo.gl.texImage2D(glInfo.gl.TEXTURE_2D, 0, internalFormat, 1, 1, 0, glInfo.gl.RGBA, glInfo.gl.UNSIGNED_BYTE,
        new Uint8Array([0, 0, 255, 255]));
    let image = new Image();
    image.src = source;
    await image.addEventListener('load', function () {
        // Now that the image has loaded make copy it to the texture.
        glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.NEAREST_MIPMAP_NEAREST);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.NEAREST_MIPMAP_LINEAR);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR_MIPMAP_NEAREST);
        glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MIN_FILTER, glInfo.gl.LINEAR_MIPMAP_NEAREST);
        glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MAG_FILTER, glInfo.gl.LINEAR);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_MAG_FILTER, glInfo.gl.LINEAR_MIPMAP_LINEAR);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_WRAP_S, glInfo.gl.CLAMP_TO_EDGE);
        // glInfo.gl.texParameteri(glInfo.gl.TEXTURE_2D, glInfo.gl.TEXTURE_WRAP_T, glInfo.gl.REPEAT);
        glInfo.gl.texImage2D(glInfo.gl.TEXTURE_2D, 0, internalFormat, format, glInfo.gl.UNSIGNED_BYTE, image);
        glInfo.imagesArray.push(image);
        glInfo.gl.generateMipmap(glInfo.gl.TEXTURE_2D);
        if (callback !== undefined) {
            console.log(callback);
            callback();
        }
    });
    glInfo.texturesArray.push(texture);
    glInfo.gl.activeTexture(id);
    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, texture);
    if (textureLocation == null) {
        console.log("texturelocation " + (id - glInfo.gl.TEXTURE1) + " is null");
        console.trace();
    } else {
        // id from glInfo.gl.TEXTURE1 should have textureLocation 0
        glInfo.gl.uniform1i(textureLocation, id - glInfo.gl.TEXTURE1);
    }
    glInfo.gl.bindTexture(glInfo.gl.TEXTURE_2D, null);
}