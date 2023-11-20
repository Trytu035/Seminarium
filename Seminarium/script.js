"use strict";

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init_render_normals_from_height_map().then(
    //     () => {
    //         console.log("done");
    //         init(canvas, gl).then(
    //             () => {
    //                 loop(canvas, gl);
    //             }
    //         )
    //     }
    // );
        () => {
            console.log("done");
            init(canvas, gl).then(
                () => {
                    loop(canvas, gl);
                }
            ).catch(
                (error) => { console.error(error); }
            );
        }
    ).catch(
        (error) => { console.error(error); }
    );
}

let mouseUniformLocation;
let rotateUniformLocation;
let cameraRotationUniformLocation;
let distanceUniformLocation;
let texcoordScaleAttributeLocation;
let normalDetailTextureLocation;

let mainVAO; // Vertex Attribute Object
let lambertianVAO;
let depthVAO;

class World {
    constructor() {
        this.camera();
    }
}
class Camera {
    constructor(camera_matrix) {
        this.fov = 90;
        this.type; // perspective or orthogonal
        this.camera_matrix = camera_matrix;
        this.view_matrix;
        this.projection_matrix;
        // xyzw - 1/w component controls size of orthogonal camera y
        //        x component * ratio y/x = orthogonal camera x
    }
}

class Model {
    constructor(material) {
        this.material = material;
        this.positions = [];
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
        math.multiply([
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1]
        ], this.model_matrix);
    }

    scale(x, y, z) {
        math.multiply([
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, 1]
        ], this.model_matrix);
    }

    rotate(x, y, z) {
        if (x) math.multiply([
            [1.0,	0.0,	0.0,	0.0],
            [0.0,	cos(x), sin(x),	0.0],
            [0.0,	-sin(x),cos(x),	0.0],
            [0.0,	0.0,	0.0,	1.0]
        ], this.model_matrix);
        if (y) math.multiply([
            [cos(y),0.0,	-sin(y),0.0],
            [0.0,	1.0,	0.0,	0.0],
            [sin(y),0.0,	cos(y),	0.0],
            [0.0,	0.0,	0.0,	1.0]
        ], this.model_matrix);
        if (z) math.multiply([
            [cos(z),    sin(z),	0.0,	0.0],
            [-sin(z),   cos(z),	0.0,	0.0],
            [0.0,		0.0,	1.0,	0.0],
            [0.0,		0.0,	0.0,	1.0]
        ], this.model_matrix);
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
                world_inv_transpose: this.gl.getUniformLocation(this.program, "u_world_inverse_transpose"),
                model: this.gl.getUniformLocation(this.program, "u_model_matrix"),
                camera: this.gl.getUniformLocation(this.program, "u_camera_matrix"),
            },
            texture: {},    //usually uniforms filled inside addTexture
            // other: {},
        }
    }
    // addLocation()
//    to add location, use "material.location.other.locationName = gl.getUniform/AttribLocation( [...]
}

let temporaryLocation_1;
// Positions format: - remember that points should turn anti-clockwise
// x1, y1, z1
// x2, y2, z2
// x3, y3, z3
// x1, y1, z1
// x3, y3, z3
// x4, y4, z4
let positions = []
// Texcoords format:
// u1, v1
// u2, v2
// u3, v3
// u1, v1
// u3, v3
// u4, v4

function radToDeg(value) {
    return value / Math.PI * 180
}
function degToRad(value) {
    return value / 180 * Math.PI;
}
//tangent - red X   -left/right
//bitangent - green Y   -down/up
//normal - blue Z
function generateFace(model, position, tangent, bitangent, size_x, size_y, scale=1, swap_xy = 0, invert_normal = 0) {
    tangent.normalize();
    bitangent.normalize();
    size_x /= 2;
    size_y /= 2;

    let P1 = new Vector3(
        position.x - tangent.x*size_x + bitangent.x*size_y,
        position.y - tangent.y*size_x + bitangent.y*size_y,
        position.z - tangent.z*size_x + bitangent.z*size_y,
    );
    let P2 = new Vector3(
        position.x - tangent.x*size_x - bitangent.x*size_y,
        position.y - tangent.y*size_x - bitangent.y*size_y,
        position.z - tangent.z*size_x - bitangent.z*size_y,
    );
    let P3 = new Vector3(
        position.x + tangent.x*size_x - bitangent.x*size_y,
        position.y + tangent.y*size_x - bitangent.y*size_y,
        position.z + tangent.z*size_x - bitangent.z*size_y,
    );
    let P4 = new Vector3(
        position.x + tangent.x*size_x + bitangent.x*size_y,
        position.y + tangent.y*size_x + bitangent.y*size_y,
        position.z + tangent.z*size_x + bitangent.z*size_y,
    );
    model.positions.push(...P1.toArray());
    model.positions.push(...P2.toArray());
    model.positions.push(...P3.toArray());
    model.positions.push(...P1.toArray());
    model.positions.push(...P3.toArray());
    model.positions.push(...P4.toArray());
    size_x *= 2;    //space from -tangent to +tangent is 2*tangent, so texcoord needs to be multiplied to make it height-consistent
    size_y *= 2;
    if (swap_xy) {
        model.texcoords.push(
            size_y * scale, 0      * scale,
            0      * scale, 0      * scale,
            0      * scale, size_x * scale,
            size_y * scale, 0      * scale,
            0      * scale, size_x * scale,
            size_y * scale, size_x * scale,
        );
    } else {
        model.texcoords.push(
            0      * scale, size_y * scale,
            0      * scale, 0      * scale,
            size_x * scale, 0      * scale,
            0      * scale, size_y * scale,
            size_x * scale, 0      * scale,
            size_x * scale, size_y * scale,
        );
        // model.texcoords.push(
        //     -size_x* scale, size_y * scale,
        //     -size_x* scale, -size_y* scale,
        //     size_x * scale, -size_y* scale,
        //     -size_x* scale, size_y * scale,
        //     size_x * scale, -size_y* scale,
        //     size_x * scale, size_y * scale,
        // );
    }
}

let program;
let program2;
let program3;

let material1;  //paralax snow
let materialLambertian;  //paralax snow
let model1;
let model2;
async function init(canvas, gl) {
    material1 = new Material(gl, vertexShader, fragmentShader);
    model1 = new Model(material1);
    materialLambertian = new Material(gl, vertexShader, fragmentShaderLambertian);
    model2 = new Model(materialLambertian);
    {
        generateFace(
            model1, new Vector3(0, 4, 0),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 4
        );
        generateFace(
            model1, new Vector3(0, 4, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2, 2, 0.5
        );
        generateFace(   // Y face (middle) bottom
            model1, new Vector3(0, 0, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            2, 2, 1
        );
        generateFace(   //Z face back
            model1, new Vector3(0, 1, -1),
            new Vector3(-1, 0, 0), new Vector3(0, 1, 0),
            4, 4, 1
            // texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face back
            model1, new Vector3(-1, 1, 0),
            new Vector3(0, 0, 1), new Vector3(0, 1, 0), //inversed
            2, 2, 1
        );
        generateFace(   //Z face front
            model1, new Vector3(0, 1, 1),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 1
            // texcoords, new Vector3(0, -1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face front
            model1, new Vector3(1, 1, 0),
            new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            2, 2, 1
        );

        generateFace(   // Y face
            model1, new Vector3(2, 0, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2, 20
        );

        generateFace(
            model1, new Vector3(-2, 0, 0),
            new Vector3(1, 1, 1), new Vector3(1, 1, -1),
            2, 4
        );


        //bounding box
        generateFace(   // X face right inside
            model1, new Vector3(15, 0, 0),
            new Vector3(0, 0, 1), new Vector3(0, 1, 0),
            40, 40
        );
        generateFace(   // X face left inside
            model1, new Vector3(-15, 0, 0),
            new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            40, 40
        );
        generateFace(   // Y face top inside
            model1, new Vector3(0, 15, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        generateFace(   // Y face bottom inside
            model1, new Vector3(0, -15, 0),
            new Vector3(-1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        generateFace(   // Z face close inside
            model1, new Vector3(0, 0, 15),
            new Vector3(1, 0, 0), new Vector3(0, -1, 0),
            40, 40
        );
        generateFace(   // Z face far inside
            model1, new Vector3(0, 0, -15),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            40, 40
        );
    }
    generateFace(
        model2, new Vector3(0, 3.1, 0),
        new Vector3(1, 0, 0), new Vector3(0, 0, -1),
        3, 3, 4
    );

    model1.computeFlatNormals();
    model2.computeFlatNormals();
    // program3 = createProgram(
    //     gl,
    //     createShader(gl, vertexShader, gl.VERTEX_SHADER),
    //     createShader(gl, fragmentShaderDepth, gl.FRAGMENT_SHADER)
    // );

    depthVAO = gl.createVertexArray();
    // gl.bindVertexArray(mainVAO);

    mouseUniformLocation = gl.getUniformLocation(material1.program, "u_mouse");
    // normalDetailTextureLocation = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
    temporaryLocation_1 = gl.getUniformLocation(material1.program, "u_temp_use_the_oclussion");

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); //turn off for double sided and transparency
    gl.enable(gl.DEPTH_TEST);   //turn off for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(material1.program);
    gl.bindVertexArray(model1.VAO);
    // gl.useProgram(program);

    material1.location.texture.normal = gl.getUniformLocation(material1.program, "u_normal_texture");
    material1.location.texture.color = gl.getUniformLocation(material1.program, "u_color_texture");
    material1.location.texture.heightMap = gl.getUniformLocation(material1.program, "u_height_map_texture");
    material1.location.texture.normalDetail = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
    render_normals_from_height_map(model1, "./height_map.png", 24, gl.TEXTURE1, material1.location.texture.normal, gl.RGBA, gl.RGBA).then(
    // addTexture(model1, "./normal.png", gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA).then(
        () => {
            addTexture(model1, "./color.png", gl.TEXTURE2, material1.location.texture.color, gl.RGBA, gl.RGBA).then(
            () => {
                addTexture(model1, "./height_map.png", gl.TEXTURE3, material1.location.texture.heightMap, gl.RGBA, gl.RGBA).then(
                    () => {
                        // addTexture(model1, "./circuitry-detail-normal.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
                        // addTexture(model1, "./9749-normal.jpg", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
                        addTexture(model1, "./av53c33f80f8586a07900.png", gl.TEXTURE4, material1.location.texture.normalDetail, gl.RGBA, gl.RGBA);
                    }
                )
            }
        )}
    )
    // material1.location.uniform.displayProportion = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
}

function loop(canvas, gl){

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(material1.program);
    gl.bindVertexArray(model1.VAO);

    // let camera_matrix = math.identity(4);
    let camera_matrix = math.identity(4);
    camera_matrix = math.multiply(translate_mtx(0, 0, zoom), camera_matrix);
    camera_matrix = math.multiply(rotate_y_mtx(rotateX), rotate_x_mtx(rotateY), camera_matrix);
    math.subset(camera_matrix, math.index(2, [0, 1, 2]),
        normalize_vec(math.squeeze(math.subset(camera_matrix, math.index(3, [0, 1, 2])))));
    math.subset(camera_matrix, math.index(1, [0, 1, 2]), [0, 1, 0]);
    math.subset(camera_matrix, math.index(0, [0, 1, 2]),
        normalize_vec(math.cross(
            math.squeeze(math.subset(camera_matrix, math.index(1, [0, 1, 2]))),
            math.squeeze(math.subset(camera_matrix, math.index(2, [0, 1, 2]))),
        )));
    math.subset(camera_matrix, math.index(1, [0, 1, 2]),
        normalize_vec(math.cross(
            math.squeeze(math.subset(camera_matrix, math.index(2, [0, 1, 2]))),
            math.squeeze(math.subset(camera_matrix, math.index(0, [0, 1, 2]))),
        )));
    let view_matrix = math.inv(camera_matrix);
    let projection_matrix = perspective_mtx(
        degToRad(90.),
        0.01,
        30.0,
        // v_projected_depth_range.near,
        // v_projected_depth_range.far,
        canvas.width / canvas.height
    );

    let world_view_projection = math.multiply(projection_matrix, view_matrix);
    world_view_projection = math.multiply(world_view_projection, model1.model_matrix);
    // let world_view_projection = view_matrix;
    // v_world_inverse_transpose = transpose(inverse(v_model_matrix));
    // console.log(math.flatten(camera_matrix));

    gl.uniformMatrix4fv(model1.material.location.uniform.mvp, true, math.flatten(world_view_projection)._data);
    gl.uniformMatrix4fv(model1.material.location.uniform.world_inv_transpose, false, math.flatten(math.inv(model1.model_matrix))._data);
    gl.uniformMatrix4fv(model1.material.location.uniform.camera, true, math.flatten(camera_matrix)._data);
    gl.uniformMatrix4fv(model1.material.location.uniform.model, true, math.flatten(model1.model_matrix)._data);
    // gl.uniform2f(, canvas.width, canvas.height);

    gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, model1.positions.length / 3); //type, offset, count (position.length/size)

    gl.useProgram(materialLambertian.program);
    gl.bindVertexArray(model2.VAO);
    gl.uniformMatrix4fv(model2.material.location.uniform.mvp, true, math.flatten(world_view_projection)._data);
    gl.uniformMatrix4fv(model2.material.location.uniform.world_inv_transpose, false, math.flatten(math.inv(model2.model_matrix))._data);
    gl.uniformMatrix4fv(model2.material.location.uniform.camera, true, math.flatten(camera_matrix)._data);
    gl.uniformMatrix4fv(model2.material.location.uniform.model, true, math.flatten(model2.model_matrix)._data);

    gl.drawArrays(gl.TRIANGLES, 0, model2.positions.length / 3); //type, offset, count (position.length/size)

    gl.useProgram(material1.program);   //for some reason i have to end the drawing by this program.
    // Otherwise only one texture is loaded - why??

    gl.bindVertexArray(null);
    requestAnimationFrame(() => { loop(canvas, gl) });
}

function defineGlAttribute(name, value) {

}

function changeTexture(gl, textureLocation, id) {
    gl.uniform1i(textureLocation, gl.TEXTURE0 - id - 1);
}

var resolution = 1;	//rozdzielczoœæ canvas na którym jest wyœwietlany obraz
//poni¿sze zmienne s³u¿¹ do obs³ugi zdarzeñ
var mouseX = 0;
var mouseY = 0;
var clickX = 0;
var clickY = 0;
var rotateX = degToRad(0);
var rotateY = degToRad(20);
var rotateZ = degToRad(0);
var zoom = 5;
var oldRotateX = rotateX;
var oldRotateY = rotateY;
var mouseState = [0, 0];
var cameraVector = [0, 0, 0];

// z is smaller -> z is closer

window.addEventListener("mousedown", function (e) {
let canvas = document.getElementById("canvas");
if (e.which == 1) {
    mouseState[0] = 1;
    clickX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    clickY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
} else if (e.which == 3) {
    mouseState[1] = 1;
}
});
window.addEventListener("mousemove", function (e) {
let canvas = document.getElementById("canvas");
if (mouseState[0] == 1) {
    mouseX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    mouseY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
    rotateX = (clickX - mouseX + oldRotateX);
    rotateY = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, (clickY - mouseY + oldRotateY)))
}
});
window.addEventListener("mouseup", function (e) {
if (e.which == 1) {
    mouseState[0] = 0;
    oldRotateX = rotateX
    oldRotateY = rotateY
} else if (e.which == 3) {
    mouseState[1] = 0;
}
});
window.addEventListener("mousewheel", function (e) {
if (e.deltaY > 0 && zoom < 10) {
    zoom += .1;
} else if (e.deltaY < 0 && zoom > 1) {
    zoom -= .1;
}
})

main();