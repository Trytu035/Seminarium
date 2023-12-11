class Model {
    constructor(material) {
        this.material = material;
// Positions format: - remember that points should turn anti-clockwise
// x1, y1, z1
// x2, y2, z2
// x3, y3, z3
// x1, y1, z1
// x3, y3, z3
// x4, y4, z4
        this.positions = [];
// Texcoords format:
// u1, v1
// u2, v2
// u3, v3
// u1, v1
// u3, v3
// u4, v4
        this.texcoords = [];
        this.tangents = [];
        this.bitangents = [];
        this.normals = [];
        this.model_matrix = new math.identity(4);
        this.VAO = material.gl.createVertexArray();
        this.textures = [];
        this.images = [];
        // this.attributeLocation;
        // this.computeFlatNormals();
    }

    translate(x, y, z) {
        this.model_matrix = math.multiply(math.matrixFromColumns(
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1]
        ), this.model_matrix);
    }

    scale(x, y, z) {
        this.model_matrix = math.multiply(math.matrixFromColumns(
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, 1]
        ), this.model_matrix);
    }

    rotate(x, y, z) {
        if (x) this.model_matrix = math.multiply(math.matrixFromColumns(
            [1.0,   0.0,            0.0,            0.0],
            [0.0,   Math.cos(x),    Math.sin(x),    0.0],
            [0.0,   -Math.sin(x),   Math.cos(x),    0.0],
            [0.0,   0.0,            0.0,            1.0]
        ), this.model_matrix);
        if (y) this.model_matrix = math.multiply(math.matrixFromColumns(
            [Math.cos(y),   0.0,    -Math.sin(y),   0.0],
            [0.0,	        1.0,    0.0,            0.0],
            [Math.sin(y),   0.0,    Math.cos(y),    0.0],
            [0.0,	        0.0,    0.0,            1.0]
        ), this.model_matrix);
        if (z) this.model_matrix = math.multiply(math.matrixFromColumns(
            [Math.cos(z),   Math.sin(z),	0.0,	0.0],
            [-Math.sin(z),  Math.cos(z),	0.0,	0.0],
            [0.0,		    0.0,	        1.0,	0.0],
            [0.0,		    0.0,	        0.0,	1.0]
        ), this.model_matrix);
    }

    init() {
        this.material.gl.bindVertexArray(this.VAO);
    }
    computeFlatNormals() {
        for (let i2 = 0; i2 < this.positions.length / 9; i2++) { //i2 repeat for each triangle //divide by 3 coordinates, 3 vertices in triangle,
            let edge1 = new Vector3( this.positions[(i2*3 + 1)*3],  this.positions[(i2*3 + 1)*3 + 1],  this.positions[(i2*3 + 1)*3 + 2]);
            edge1.add(new Vector3(-this.positions[(i2*3    )*3], -this.positions[(i2*3    )*3 + 1], -this.positions[(i2*3    )*3 + 2]));
            let edge2 = new Vector3( this.positions[(i2*3 + 2)*3],  this.positions[(i2*3 + 2)*3 + 1],  this.positions[(i2*3 + 2)*3 + 2]);
            edge2.add(new Vector3(-this.positions[(i2*3    )*3], -this.positions[(i2*3    )*3 + 1], -this.positions[(i2*3    )*3 + 2]));
            let deltaUV1 = new Vector2( this.texcoords[(i2*3 + 1)*2],  this.texcoords[(i2*3 + 1)*2 + 1]);
            deltaUV1.add(new Vector2(-this.texcoords[(i2*3    )*2], -this.texcoords[(i2*3    )*2 + 1]));
            let deltaUV2 = new Vector2( this.texcoords[(i2*3 + 2)*2],  this.texcoords[(i2*3 + 2)*2 + 1]);
            deltaUV2.add(new Vector2(-this.texcoords[(i2*3    )*2], -this.texcoords[(i2*3    )*2 + 1]));

            let f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);
            // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
            for (let i = 0; i < 3; i++) {   //repeat for each vertex in a triangle
                //can we cut out f factor?? does vector normalization suffice?
                //tangent (X) for some reason i had to reverse it
                this.tangents[(i2*3 + i) * 3    ] = f * (deltaUV2.y * edge1.x - deltaUV1.y * edge2.x);
                this.tangents[(i2*3 + i) * 3 + 1] = f * (deltaUV2.y * edge1.y - deltaUV1.y * edge2.y);
                this.tangents[(i2*3 + i) * 3 + 2] = f * (deltaUV2.y * edge1.z - deltaUV1.y * edge2.z);
                //bitangent (Y)
                this.bitangents[(i2*3 + i) * 3    ] = f * (-deltaUV2.x * edge1.x + deltaUV1.x * edge2.x);
                this.bitangents[(i2*3 + i) * 3 + 1] = f * (-deltaUV2.x * edge1.y + deltaUV1.x * edge2.y);
                this.bitangents[(i2*3 + i) * 3 + 2] = f * (-deltaUV2.x * edge1.z + deltaUV1.x * edge2.z);
                //normal(Z)
                this.normals[(i2*3 + i) * 3    ] = f * (edge1.y*edge2.z - edge1.z*edge2.y);
                this.normals[(i2*3 + i) * 3 + 1] = f * (edge1.z*edge2.x - edge1.x*edge2.z); //negative through sauron method - it's a cross product ??
                this.normals[(i2*3 + i) * 3 + 2] = f * (edge1.x*edge2.y - edge1.y*edge2.x);

                // console.log(edge1.length() / deltaUV1.length() + " ---- " + edge2.length() / deltaUV2.length());
                // this.textureScales[(i2*3 + i)*2] = edge1.length() / deltaUV1.length();
                // this.textureScales[(i2*3 + i)*2 + 1] = edge2.length() / deltaUV2.length();
            }
        }
        this.material.gl.bindVertexArray(this.VAO);
        let tangentsBuffer = this.material.gl.createBuffer();
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, tangentsBuffer);
        this.material.gl.bufferData(this.material.gl.ARRAY_BUFFER, new Float32Array(this.tangents), this.material.gl.STATIC_DRAW);
        let bitangentsBuffer = this.material.gl.createBuffer();
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, bitangentsBuffer);
        this.material.gl.bufferData(this.material.gl.ARRAY_BUFFER, new Float32Array(this.bitangents), this.material.gl.STATIC_DRAW);
        let normalsBuffer = this.material.gl.createBuffer();
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, normalsBuffer);
        this.material.gl.bufferData(this.material.gl.ARRAY_BUFFER, new Float32Array(this.normals), this.material.gl.STATIC_DRAW);
        let positionsBuffer = this.material.gl.createBuffer();
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, positionsBuffer);
        this.material.gl.bufferData(this.material.gl.ARRAY_BUFFER, new Float32Array(this.positions), this.material.gl.STATIC_DRAW);
        let texcoordsBuffer = this.material.gl.createBuffer();
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, texcoordsBuffer);
        this.material.gl.bufferData(this.material.gl.ARRAY_BUFFER, new Float32Array(this.texcoords), this.material.gl.STATIC_DRAW);

        this.material.gl.enableVertexAttribArray(this.material.location.attribute.tangent);
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, tangentsBuffer);
        this.material.gl.vertexAttribPointer(this.material.location.attribute.tangent, 3, this.material.gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        this.material.gl.enableVertexAttribArray(this.material.location.attribute.bitangent);
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, bitangentsBuffer);
        this.material.gl.vertexAttribPointer(this.material.location.attribute.bitangent, 3, this.material.gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        this.material.gl.enableVertexAttribArray(this.material.location.attribute.normal);
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, normalsBuffer);
        this.material.gl.vertexAttribPointer(this.material.location.attribute.normal, 3, this.material.gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        this.material.gl.enableVertexAttribArray(this.material.location.attribute.position);
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, positionsBuffer);
        this.material.gl.vertexAttribPointer(this.material.location.attribute.position, 3, this.material.gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        this.material.gl.enableVertexAttribArray(this.material.location.attribute.texcoord);
        this.material.gl.bindBuffer(this.material.gl.ARRAY_BUFFER, texcoordsBuffer);
        this.material.gl.vertexAttribPointer(this.material.location.attribute.texcoord, 2, this.material.gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset

    }
    draw() {

    }
}
class Material {
    constructor(glContext, vertexShader, fragmentShader) {
        this.gl = glContext;
        this.program = createProgram(
            glContext,
            createShader(glContext, vertexShader, glContext.VERTEX_SHADER),
            createShader(glContext, fragmentShader, glContext.FRAGMENT_SHADER)
        );
        this.location = {
            attribute: {
                position: this.gl.getAttribLocation(this.program, "a_position"),
                // color: this.gl.getAttribLocation(this.program, "a_color"),
                tangent: this.gl.getAttribLocation(this.program, "a_tangents"),
                bitangent: this.gl.getAttribLocation(this.program, "a_bitangents"),
                normal: this.gl.getAttribLocation(this.program, "a_normals"),
                texcoord: this.gl.getAttribLocation(this.program, "a_texcoord"),
            },
            uniform: {
                mvp: this.gl.getUniformLocation(this.program, "u_world_view_projection"),
                inv_mvp: this.gl.getUniformLocation(this.program, "u_inverse_world_view_projection"),
                world_inv_transpose: this.gl.getUniformLocation(this.program, "u_world_inverse_transpose"),
                model: this.gl.getUniformLocation(this.program, "u_model_matrix"),
                camera: this.gl.getUniformLocation(this.program, "u_camera_matrix"),
                projection: this.gl.getUniformLocation(this.program, "u_projection_matrix"),
                near: this.gl.getUniformLocation(this.program, "u_near_plane"),
                far: this.gl.getUniformLocation(this.program, "u_far_plane"),
                projectionPerspective: this.gl.getUniformLocation(this.program, "u_is_perspective"),
            },
            texture: {},    //usually uniforms filled inside addTexture
            // other: {},   //automatically resolved every frame??
        }
    }
    // addLocation()
//    to add location, use "material.location.other.locationName = gl.getUniform/AttribLocation( [...]
}
class Texture {
    constructor(texture, image) {
        this.texture = texture;
        this.image = image;
    }
}
class FrameBuffer {

}

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
//add existing Texture to model

//create and add Texture to texture repository
function addImage(source, callback) {   //add image to gl context
    let image = new Image();

    if (typeof source === Image) {
        image = source;
        callback();
        return image;
    }
    image.src = source;
    image.addEventListener('load', () => { callback(image) });
}

//create and add Texture to model
async function addTexture2(model, source, id, textureLocation, internalFormat, format, callback) {
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
        // model.images.push(image);
        gl.generateMipmap(gl.TEXTURE_2D);
        if (callback !== undefined) {
            console.log(callback);
            callback();
        }
        gl.bindTexture(gl.TEXTURE_2D, null);
    });
    // console.log("id: " + id);
    model.textures.push({texture: texture, id: id, location: textureLocation});
    gl.activeTexture(id);   //find binding between texture (indexed in array) to id and textureLocation
    gl.bindTexture(gl.TEXTURE_2D, texture);
    if (textureLocation == null) {
        console.log("texturelocation " + (id - gl.TEXTURE1) + " is null");
        console.trace();
    }
    else {
        // id from gl.TEXTURE1 should have textureLocation 0
        //move to loop - attach to model
        gl.uniform1i(textureLocation, id - gl.TEXTURE1);
    }
    gl.bindTexture(gl.TEXTURE_2D, null);
    gl.bindVertexArray(null);
}

function addTexture(model, image, id, textureLocation, internalFormat, format, sizeX, sizeY, callback) {
    let gl = model.material.gl;
    let texture = gl.createTexture();

    gl.bindVertexArray(model.VAO);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (sizeX && sizeY) {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sizeX, sizeY, 0, format, gl.UNSIGNED_BYTE, image);

    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, image);
    }
    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.generateMipmap(gl.TEXTURE_2D);

    model.textures.push({ texture: texture, id: id, location: textureLocation });
}

function setTexture(model, texture, textureLocation, id, callback) {
    let gl = model.material.gl;

    gl.activeTexture(id);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.uniform1i(textureLocation, id - gl.TEXTURE0);
}