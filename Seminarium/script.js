"use strict";

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init_render_normals_from_height_map().then(
        () => {
            console.log("done");
            init(canvas, gl).then(
                (error) => {
                    loop(canvas, gl);
                }
            ).catch(
                (error) => { console.error(error); }
            );
        }
    ).catch(
        (error) => { console.error(error); }
    );

    // init_render_normals_from_height_map(normal_texture_canvas, normal_texture_gl);
    // init(canvas, gl);
    //addTexture("./footprint.png", (retErr, retVal) => {
    //    console.log(retVal);
    //});
    // loop(canvas, gl);
}

let positionAttributeLocation;
let colorAttributeLocation;
let tangentsAttributeLocation;
let bitangentsAttributeLocation;
let normalsAttributeLocation;
let mouseUniformLocation;
let rotateUniformLocation;
let cameraRotationUniformLocation;
let displayProportionUniformLocation;
let distanceUniformLocation;
let texcoordAttributeLocation;
let texcoordScaleAttributeLocation;
let normalTextureLocation;
let heightMapTextureLocation;
let colorTextureLocation;
let normalDetailTextureLocation;

let mainVAO; // Vertex Attribute Object
let lambertianVAO;
let depthVAO;

let glInfo = {
    gl: undefined,
    imagesArray: [],
    texturesArray: [],
}

class Model {
    constructor(material) {
        this.positions = [];
        this.texcoords = [];
        this.tangents = [];
        this.bitangents = [];
        this.normals = [];
        this.material = material;
        this.mvp = [];
        this.VAO = material.gl.createVertexArray();
        this.attributeLocation;
    }
    init() {
        gl.bindVertexArray(this.VAO);
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
    }
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
let texcoords = []
let textureScales = [];
let tangents = [];
let bitangents = [];
let normals = [];

//for models using lambertian lighting shader material
let positionsLambertian = []
let texcoordsLambertian = []
let tangentsLambertian = [];
let bitangentsLambertian = [];
let normalsLambertian = [];

function radToDeg(value) {
    return value / Math.PI * 180
}
function degToRad(value) {
    return value / 180 * Math.PI;
}
//tangent - red X   -left/right
//bitangent - green Y   -down/up
//normal - blue Z
function generateFace(positionsArray, position, texcoordArray, tangent, bitangent, size_x, size_y, scale=1, swap_xy = 0, invert_normal = 0) {
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
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P2.toArray());
    positionsArray.push(...P3.toArray());
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P3.toArray());
    positionsArray.push(...P4.toArray());
    if (swap_xy) {
        texcoordArray.push(
            size_y * scale, 0      * scale,
            0      * scale, 0      * scale,
            0      * scale, size_x * scale,
            size_y * scale, 0      * scale,
            0      * scale, size_x * scale,
            size_y * scale, size_x * scale,
        );
    } else {
        texcoordArray.push(
            0      * scale, size_y * scale,
            0      * scale, 0      * scale,
            size_x * scale, 0      * scale,
            0      * scale, size_y * scale,
            size_x * scale, 0      * scale,
            size_x * scale, size_y * scale,
        );
    }
}

let program;
let program2;
let program3;
async function init(canvas, gl) {
    {
        generateFace(
            positions, new Vector3(0, 4, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 4
        );
        generateFace(
            positions, new Vector3(0, 4, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2, 2
        );
        generateFace(   // Y face (middle) bottom
            positions, new Vector3(0, 0, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            2, 2, 1
        );
        generateFace(   //Z face back
            positions, new Vector3(0, 1, -1),
            texcoords, new Vector3(-1, 0, 0), new Vector3(0, 1, 0),
            4, 4, 1
            // texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face back
            positions, new Vector3(-1, 1, 0),
            texcoords, new Vector3(0, 0, 1), new Vector3(0, 1, 0), //inversed
            2, 2, 1
        );
        generateFace(   //Z face front
            positions, new Vector3(0, 1, 1),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 1
            // texcoords, new Vector3(0, -1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face front
            positions, new Vector3(1, 1, 0),
            texcoords, new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            2, 2, 1
        );

        generateFace(   // Y face
            positions, new Vector3(2, 0, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2, 20
        );

        generateFace(
            positions, new Vector3(-2, 0, 0),
            texcoords, new Vector3(1, 1, 1), new Vector3(1, 1, -1),
            2, 4
        );


        //bounding box
        generateFace(   // X face right inside
            positions, new Vector3(15, 0, 0),
            texcoords, new Vector3(0, 0, 1), new Vector3(0, 1, 0),
            40, 40
        );
        generateFace(   // X face left inside
            positions, new Vector3(-15, 0, 0),
            texcoords, new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            40, 40
        );
        generateFace(   // Y face top inside
            positions, new Vector3(0, 15, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        generateFace(   // Y face bottom inside
            positions, new Vector3(0, -15, 0),
            texcoords, new Vector3(-1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        generateFace(   // Z face close inside
        positions, new Vector3(0, 0, 15),
        texcoords, new Vector3(1, 0, 0), new Vector3(0, -1, 0),
        40, 40
    );
        generateFace(   // Z face far inside
            positions, new Vector3(0, 0, -15),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            40, 40
        );
    }

    program = createProgram(
        gl,
        createShader(gl, vertexShader, gl.VERTEX_SHADER),
        createShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    );
    program3 = createProgram(
        gl,
        createShader(gl, vertexShader, gl.VERTEX_SHADER),
        createShader(gl, fragmentShaderDepth, gl.FRAGMENT_SHADER)
    );
    // program2 = createProgram(
    //     gl,
    //     createShader(gl, vertexShader, gl.VERTEX_SHADER),
    //     createShader(gl, fragmentShaderLambertian, gl.FRAGMENT_SHADER)
    // );

    mainVAO = gl.createVertexArray();
    lambertianVAO = gl.createVertexArray();
    depthVAO = gl.createVertexArray();
    gl.bindVertexArray(mainVAO);

    //init glInfo which stores info for creating textures
    glInfo.gl = gl;

    // let position2AttributeLocation = gl.getAttribLocation(program2, "a_position");
    positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    tangentsAttributeLocation = gl.getAttribLocation(program, "a_tangents");
    bitangentsAttributeLocation = gl.getAttribLocation(program, "a_bitangents");
    normalsAttributeLocation = gl.getAttribLocation(program, "a_normals");
    texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");
    texcoordScaleAttributeLocation = gl.getAttribLocation(program, "a_texcoordScale");
    mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
    rotateUniformLocation = gl.getUniformLocation(program, "u_rotate");
    cameraRotationUniformLocation = gl.getUniformLocation(program, "u_cameraRotation");
    displayProportionUniformLocation = gl.getUniformLocation(program, "u_displayProportion");
    distanceUniformLocation = gl.getUniformLocation(program, "u_distance");
    normalTextureLocation = gl.getUniformLocation(program, "u_normal_texture");
    heightMapTextureLocation = gl.getUniformLocation(program, "u_height_map_texture");
    colorTextureLocation = gl.getUniformLocation(program, "u_color_texture");
    normalDetailTextureLocation = gl.getUniformLocation(program, "u_normal_detail_texture");
    temporaryLocation_1 = gl.getUniformLocation(program, "u_temp_use_the_oclussion");


    for (let i2 = 0; i2 < positions.length / 9; i2++) { //i2 repeat for each triangle //divide by 3 coordinates, 3 vertices in triangle,
        let edge1 = new Vector3( positions[(i2*3 + 1)*3],  positions[(i2*3 + 1)*3 + 1],  positions[(i2*3 + 1)*3 + 2]);
          edge1.add(new Vector3(-positions[(i2*3    )*3], -positions[(i2*3    )*3 + 1], -positions[(i2*3    )*3 + 2]));
        let edge2 = new Vector3( positions[(i2*3 + 2)*3],  positions[(i2*3 + 2)*3 + 1],  positions[(i2*3 + 2)*3 + 2]);
          edge2.add(new Vector3(-positions[(i2*3    )*3], -positions[(i2*3    )*3 + 1], -positions[(i2*3    )*3 + 2]));
        let deltaUV1 = new Vector2( texcoords[(i2*3 + 1)*2],  texcoords[(i2*3 + 1)*2 + 1]);
          deltaUV1.add(new Vector2(-texcoords[(i2*3    )*2], -texcoords[(i2*3    )*2 + 1]));
        let deltaUV2 = new Vector2( texcoords[(i2*3 + 2)*2],  texcoords[(i2*3 + 2)*2 + 1]);
          deltaUV2.add(new Vector2(-texcoords[(i2*3    )*2], -texcoords[(i2*3    )*2 + 1]));

        let f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);
        // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        for (let i = 0; i < 3; i++) {   //repeat for each vertex in a triangle
            //can we cut out f factor?? does vector normalization suffice?
            //tangent (X) for some reason i had to reverse it
            tangents[(i2*3 + i) * 3    ] = f * (deltaUV2.y * edge1.x - deltaUV1.y * edge2.x);
            tangents[(i2*3 + i) * 3 + 1] = f * (deltaUV2.y * edge1.y - deltaUV1.y * edge2.y);
            tangents[(i2*3 + i) * 3 + 2] = f * (deltaUV2.y * edge1.z - deltaUV1.y * edge2.z);
            //bitangent (Y)
            bitangents[(i2*3 + i) * 3    ] = f * (-deltaUV2.x * edge1.x + deltaUV1.x * edge2.x);
            bitangents[(i2*3 + i) * 3 + 1] = f * (-deltaUV2.x * edge1.y + deltaUV1.x * edge2.y);
            bitangents[(i2*3 + i) * 3 + 2] = f * (-deltaUV2.x * edge1.z + deltaUV1.x * edge2.z);
            //normal(Z)
            normals[(i2*3 + i) * 3    ] = f * (edge1.y*edge2.z - edge1.z*edge2.y);
            normals[(i2*3 + i) * 3 + 1] = f * (edge1.z*edge2.x - edge1.x*edge2.z); //negative through sauron method - it's a cross product ??
            normals[(i2*3 + i) * 3 + 2] = f * (edge1.x*edge2.y - edge1.y*edge2.x);

            console.log(edge1.length() / deltaUV1.length() + " ---- " + edge2.length() / deltaUV2.length());
            textureScales[(i2*3 + i)*2] = edge1.length() / deltaUV1.length();
            textureScales[(i2*3 + i)*2 + 1] = edge2.length() / deltaUV2.length();
        }
    }

    for (let i = 0; i < 6; i++){
        /*
        tangents[3*18 + i*3]     = -2;
        tangents[3*18 + 1 + i*3] = 0;
        tangents[3*18 + 2 + i*3] = 0;
        bitangents[3*18 + i*3]     = 0;
        bitangents[3*18 + 1 + i*3] = 0;
        bitangents[3*18 + 2 + i*3] = -2;
        normals[3*18 + i*3]     = 0;
        normals[3*18 + 1 + i*3] = -4;
        normals[3*18 + 2 + i*3] = 0;

        tangents[4*18 + i*3]     = 2;
        tangents[4*18 + 1 + i*3] = 0;
        tangents[4*18 + 2 + i*3] = 0;
        bitangents[4*18 + i*3]     = 0;
        bitangents[4*18 + 1 + i*3] = 0;
        bitangents[4*18 + 2 + i*3] = 2;
        normals[4*18 + i*3]     = 0;
        normals[4*18 + 1 + i*3] = -4;
        normals[4*18 + 2 + i*3] = 0;

        tangents[5*18 + i*3]     = 2;
        tangents[5*18 + 1 + i*3] = 0;
        tangents[5*18 + 2 + i*3] = 0;
        bitangents[5*18 + i*3]     = 0;
        bitangents[5*18 + 1 + i*3] = 0;
        bitangents[5*18 + 2 + i*3] = 2;
        normals[5*18 + i*3]     = 0;
        normals[5*18 + 1 + i*3] = -4;
        normals[5*18 + 2 + i*3] = 0;

        tangents[6*18 + i*3]     = 2;
        tangents[6*18 + 1 + i*3] = 0;
        tangents[6*18 + 2 + i*3] = 0;
        bitangents[6*18 + i*3]     = 0;
        bitangents[6*18 + 1 + i*3] = 0;
        bitangents[6*18 + 2 + i*3] = 2;
        normals[6*18 + i*3]     = 0;
        normals[6*18 + 1 + i*3] = -4;
        normals[6*18 + 2 + i*3] = 0;
         */
        //
        //
        //
        // console.log("normal " + normals[2*18 + i*3]     );//= 0;       //X face front
        // console.log("normal " + normals[2*18 + 1 + i*3] );//= 1;
        // console.log("normal " + normals[2*18 + 2 + i*3] );//= 0;
        // console.log("tangent " + tangents[2*18 + i*3]    );// = -1;
        // console.log("tangent " + tangents[2*18 + 1 + i*3]);// = 0;
        // console.log("tangent " + tangents[2*18 + 2 + i*3]);// = 0;
    }

    for (let i = 0; i < normals.length / 6; i+= 3){ //3 coordinates; 6 vertices
        console.log("i: " + (1 + i / 3));
        console.log("t: (" + tangents[i*6] + ", " + tangents[i*6 + 1] + ", " + tangents[i*6 + 2] + ")");
        console.log("b: (" + bitangents[i*6] + ", " + bitangents[i*6 + 1] + ", " + bitangents[i*6 + 2] + ")");
        console.log("n: (" + normals[i*6] + ", " + normals[i*6 + 1] + ", " + normals[i*6 + 2] + ")");
    }

    let positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    //var colorBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([255, 255, 255]), gl.STATIC_DRAW);
    let textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texcoordAttributeLocation);
    gl.vertexAttribPointer(texcoordAttributeLocation, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    let textureScaleBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureScaleBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureScales), gl.STATIC_DRAW);
    let tangentsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
    let bitangentsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
    let normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); //turn off for double sided and transparency
    gl.enable(gl.DEPTH_TEST);   //turn off for transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program);

    gl.enableVertexAttribArray(positionAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // size: 2 components per iteration
    // type: the data is 32bit floats
    // normalize: don't normalize the data
    // stride: 0 = move forward size * sizeof(type) each iteration to get the next position
    // offset: start at the beginning of the buffer
    gl.vertexAttribPointer(positionAttributeLocation, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    //gl.enableVertexAttribArray(colorAttributeLocation);
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.vertexAttribPointer(colorAttributeLocation, 3, gl.UNSIGNED_BYTE, 1, 0, 0);//pointer, size, type, normalize, stride, offset
    gl.enableVertexAttribArray(tangentsAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
    gl.vertexAttribPointer(tangentsAttributeLocation, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    gl.enableVertexAttribArray(bitangentsAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
    gl.vertexAttribPointer(bitangentsAttributeLocation, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    gl.enableVertexAttribArray(normalsAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.vertexAttribPointer(normalsAttributeLocation, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    gl.enableVertexAttribArray(texcoordScaleAttributeLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, textureScaleBuffer);
    gl.vertexAttribPointer(texcoordScaleAttributeLocation, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset

    render_normals_from_height_map(glInfo, "./height_map.png", 24, gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA).then(
    // addTexture(glInfo, "./normal.png", gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA).then(
        () => {
            addTexture(glInfo, "./color.png", gl.TEXTURE2, colorTextureLocation, gl.RGBA, gl.RGBA).then(
            () => {
                addTexture(glInfo, "./height_map.png", gl.TEXTURE3, heightMapTextureLocation, gl.RGBA, gl.RGBA).then(
                    () => {
                        // addTexture(glInfo, "./circuitry-detail-normal.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
                        // addTexture(glInfo, "./9749-normal.jpg", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
                        addTexture(glInfo, "./av53c33f80f8586a07900.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
                    }
                )
            }
        )}
    )
}

function loop(canvas, gl){

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.useProgram(program);
    gl.bindVertexArray(mainVAO);
    gl.uniform2f(displayProportionUniformLocation, canvas.width, canvas.height);

    gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.uniform2f(rotateUniformLocation, rotateX, rotateY);      //rotation values
    // gl.uniform3fv(cameraRotationUniformLocation, cameraVector); //direction!?
    gl.uniform1f(distanceUniformLocation, zoom);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));
    // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);




    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3); //type, offset, count (position.length/size)
    // gl.bindVertexArray(lambertianVAO);

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
var rotateY = degToRad(0);
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