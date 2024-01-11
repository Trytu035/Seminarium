var normalsVAO;
let normalsGlInfo = {
    material: {gl: undefined},
    images: [],
    textures: [],
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
        createShader(gl, vertexShaderNoTransform, gl.VERTEX_SHADER),
        createShader(gl, fragmentShaderRenderNormalsFromHeightMap, gl.FRAGMENT_SHADER)
    );
    normalsGlInfo.material.gl = gl;
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

async function add_normals_from_height_map_image(source, slope_strength, callback) {
    let image = new Image();  //height_map to calculate normals from.
    if (typeof source === typeof new Image()) {
        image = source;
    } else {
        console.error("expected image source instead of given url source" + source);
        return null;
    }

    addTexture(normalsGlInfo, "", image, normalsGlInfo.material.gl.TEXTURE1, normalsGlInfo.textureLocation, normalsGlInfo.material.gl.RGBA, normalsGlInfo.material.gl.RGBA);

    normalsGlInfo.textures.forEach((textureInfo) => {
        setTexture(normalsGlInfo.material.gl, textureInfo);
    });
    normalsGlInfo.material.gl.clear(normalsGlInfo.material.gl.COLOR_BUFFER_BIT | normalsGlInfo.material.gl.DEPTH_BUFFER_BIT);
    normalsGlInfo.material.gl.uniform1f(normalsGlInfo.slopeStrengthLocation, slope_strength);
    normalsGlInfo.material.gl.drawArrays(normalsGlInfo.material.gl.TRIANGLES, 0, 6);
    callback(normalsGlInfo.canvas);
}
