"use strict";

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init_render_normals_from_height_map().then(
        () => {
            console.log("done");
            init(canvas, gl).then(
                () => {
                    loop(canvas, gl);
                }
            )
        }
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
let normalTextureLocation;
let heightMapTextureLocation;
let colorTextureLocation;
let normalDetailTextureLocation;

let mainVAO; // Vertex Attribute Object

let glInfo = {
    gl: undefined,
    imagesArray: [],
    texturesArray: [],
}

let temporaryLocation_1;
// Format: - remember that points should turn anti-clockwise
// x1, y1, z1
// x2, y2, z2
// x3, y3, z3
// x4, y4, z4
// x1, y1, z1
// x3, y3, z3
let positions = [
    // //Z face
    // -1,  1+-1,  1,
    //  1,  1+-1,  1,
    //  1,  1+ 1,  1,
    // -1,  1+ 1,  1,
    // -1,  1+-1,  1,
    //  1,  1+ 1,  1,
    // -1,  0,  1,
    // -1,  2,  1,
    //  1,  2,  1,
    //  1,  0,  1,
    // -1,  0,  1,
    //  1,  2,  1,

]
let texcoords = [
    // 0, 0,    0, 2,    2, 2,  //check this out
    // 2, 0,    0, 0,    2, 2,
]
let tangents = [];
let bitangents = [];
let normals = [];

function radToDeg(value) {
    return value / Math.PI * 180
}
function degToRad(value) {
    return value / 180 * Math.PI;
}
//tangent - red X   -down/up
//bitangent - green Y   -left/right
//normal - blue Z
function generateFace(positionsArray, position, texcoordArray, tangent, bitangent, size_x, size_y, scale=1, swap_xy = 0) {
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
        position.x + tangent.x*size_x + bitangent.x*size_y,
        position.y + tangent.y*size_x + bitangent.y*size_y,
        position.z + tangent.z*size_x + bitangent.z*size_y,
    );
    let P3 = new Vector3(
        position.x + tangent.x*size_x - bitangent.x*size_y,
        position.y + tangent.y*size_x - bitangent.y*size_y,
        position.z + tangent.z*size_x - bitangent.z*size_y,
    );
    let P4 = new Vector3(
        position.x - tangent.x*size_x - bitangent.x*size_y,
        position.y - tangent.y*size_x - bitangent.y*size_y,
        position.z - tangent.z*size_x - bitangent.z*size_y,
    );
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P2.toArray());
    positionsArray.push(...P3.toArray());
    positionsArray.push(...P4.toArray());
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P3.toArray());
    // positionsArray.push(...P2.toArray());
    // positionsArray.push(...P1.toArray());
    // positionsArray.push(...P4.toArray());
    // positionsArray.push(...P3.toArray());
    // positionsArray.push(...P2.toArray());
    // positionsArray.push(...P4.toArray());
    texcoordArray.push(
         1      * scale,    1      * scale,
         1      * scale,    0      * scale,
         0      * scale,    0      * scale,
         0      * scale,    1      * scale,
         1      * scale,    1      * scale,
         0      * scale,    0      * scale,
    );
}

async function init(canvas, gl) {
    {
        generateFace(
            positions, new Vector3(0, 4, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 4
        );
        generateFace(
            positions, new Vector3(0, 4, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            2, 2
        );
        generateFace(   // Y face (middle) bottom
            positions, new Vector3(0, 0, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2, 2
        );
        generateFace(   //Z face back
            positions, new Vector3(0, 1, -1),
            texcoords, new Vector3(0, 1, 0), new Vector3(-1, 0, 0),
            2, 2, 1
            // texcoords, new Vector3(0, 1, 0), new Vector3(-1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face back
            positions, new Vector3(-1, 1, 0),
            texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, 1), //inversed
            2, 2, 1
        );
        generateFace(   //Z face front
            positions, new Vector3(0, 1, 1),
            texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            2, 2, 1
            // texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        generateFace(   //X face front
            positions, new Vector3(1, 1, 0),
            texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, -1),
            2, 2, 1
        );

        // generateFace(
        //     positions, new Vector3(2, 2, 0),
        //     texcoords, new Vector3(-1, 1, 1), new Vector3(1, 1, 1),
        //     2, 2, 1
        // );
        // generateFace(
        //     positions, new Vector3(2, 1, 0),
        //     texcoords, new Vector3(-1, 1, 1), new Vector3(-1, 1, -1),
        //     2, 2, 1
        // );
        // generateFace(   //Z face
        //     positions, new Vector3(0, 0, -1),
        //     texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
        //     2, 2, 2
        // );
        // generateFace(   //X face
        //     positions, new Vector3(1, 0, 0),
        //     texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, 1),
        //     2, 2, 1
        // );
        // generateFace(   //X face
        //     positions, new Vector3(3, 0, 0),
        //     texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, 2),
        //     2, 2, 1
        // );
        // generateFace(   //smth
        //     positions, new Vector3(-3, 0, 0),
        //     texcoords, new Vector3(1, 0, 2), new Vector3(0, 1, 2),
        //     2, 2, 1
        // );
    }

    const program = createProgram(
        gl,
        createShader(gl, vertexShader, gl.VERTEX_SHADER),
        createShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    );

    mainVAO = gl.createVertexArray();
    gl.bindVertexArray(mainVAO);

    //init glInfo which stores info for creating textures
    glInfo.gl = gl;

    positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    tangentsAttributeLocation = gl.getAttribLocation(program, "a_tangents");
    bitangentsAttributeLocation = gl.getAttribLocation(program, "a_bitangents");
    normalsAttributeLocation = gl.getAttribLocation(program, "a_normals");
    texcoordAttributeLocation = gl.getAttribLocation(program, "a_texcoord");
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
            normals[(i2*3 + i) * 3    ] = (edge1.y*edge2.z - edge1.z*edge2.y);
            normals[(i2*3 + i) * 3 + 1] = (edge1.z*edge2.x - edge1.x*edge2.z); //negative through sauron method - it's a cross product ??
            normals[(i2*3 + i) * 3 + 2] = (edge1.x*edge2.y - edge1.y*edge2.x);
        }
    }

    for (let i = 0; i < 6; i++){

        // normals[3*18 + i*3]     = 0;       //Z face back
        // normals[3*18 + 1 + i*3] = -1;
        // normals[3*18 + 2 + i*3] = 0;
        // tangents[3*18 + i*3]     = -1;
        // tangents[3*18 + 1 + i*3] = 0;
        // tangents[3*18 + 2 + i*3] = 0;
        //
        // normals[4*18 + i*3]     = 0;       //X face back (red - normal -1, 0, 0)
        // normals[4*18 + 1 + i*3] = -1;
        // normals[4*18 + 2 + i*3] = 0;
        // tangents[4*18 + i*3]     = -1;
        // tangents[4*18 + 1 + i*3] = 0;
        // tangents[4*18 + 2 + i*3] = 0;
        //
        //  normals[5*18 + i*3]     = 0;       //Z face front
        //  normals[5*18 + 1 + i*3] = -1;
        //  normals[5*18 + 2 + i*3] = 0;
        // tangents[5*18 + i*3]     = -1;
        // tangents[5*18 + 1 + i*3] = 0;
        // tangents[5*18 + 2 + i*3] = 0;
        //
        //  normals[6*18 + i*3]     = 0;       //X face front
        //  normals[6*18 + 1 + i*3] = -1;
        //  normals[6*18 + 2 + i*3] = 0;
        // tangents[6*18 + i*3]     = -1;
        // tangents[6*18 + 1 + i*3] = 0;
        // tangents[6*18 + 2 + i*3] = 0;
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
        // console.log("p: (" + (positions[i*6]) + ", " + positions[i*6 + 1] + ", " + positions[i*6 + 2] + ")");
        console.log("t: (" + tangents[i*6] + ", " + tangents[i*6 + 1] + ", " + tangents[i*6 + 2] + ")");
        console.log("b: (" + bitangents[i*6] + ", " + bitangents[i*6 + 1] + ", " + bitangents[i*6 + 2] + ")");
        console.log("n: (" + normals[i*6] + ", " + normals[i*6 + 1] + ", " + normals[i*6 + 2] + ")");
    }

    for (let i = 0; i < 6; i++) {
        /* switch (i){
             case 0:
                 normals[3 * 18 + i * 3] = -1;       //Z face back
                 normals[3 * 18 + 1 + i * 3] = 1;
                 normals[3 * 18 + 2 + i * 3] = 1;
                 tangents[3 * 18 + i * 3] = 1;
                 tangents[3 * 18 + 1 + i * 3] = 1;
                 tangents[3 * 18 + 2 + i * 3] = -1;

                 normals[2 * 18 + i * 3] = -1;       //Y face
                 normals[2 * 18 + 1 + i * 3] = 1;
                 normals[2 * 18 + 2 + i * 3] = 1;
                 tangents[2 * 18 + i * 3] = 1;
                 tangents[2 * 18 + 1 + i * 3] = 1;
                 tangents[2 * 18 + 2 + i * 3] = -1;
                 break;
             case 3:
                 normals[3 * 18 + i * 3] = -1;       //Z face back
                 normals[3 * 18 + 1 + i * 3] = -1;
                 normals[3 * 18 + 2 + i * 3] = 1;
                 tangents[3 * 18 + i * 3] = -1;
                 tangents[3 * 18 + 1 + i * 3] = 1;
                 tangents[3 * 18 + 2 + i * 3] = 1;

                 break;
             case 4:
                 normals[3 * 18 + i * 3] = -1;       //Z face back
                 normals[3 * 18 + 1 + i * 3] = 1;
                 normals[3 * 18 + 2 + i * 3] = 1;
                 tangents[3 * 18 + i * 3] = 1;
                 tangents[3 * 18 + 1 + i * 3] = 1;
                 tangents[3 * 18 + 2 + i * 3] = -1;
                 normals[2 * 18 + i * 3] = -1;       //Y face
                 normals[2 * 18 + 1 + i * 3] = 1;
                 normals[2 * 18 + 2 + i * 3] = 1;
                 tangents[2 * 18 + i * 3] = 1;
                 tangents[2 * 18 + 1 + i * 3] = 1;
                 tangents[2 * 18 + 2 + i * 3] = -1;
                 break;
         }*/
        // normals[3 * 18 + i * 3] = 0;       //Z face back
        // normals[3 * 18 + 1 + i * 3] = 1;
        // normals[3 * 18 + 2 + i * 3] = 0;
        // tangents[3 * 18 + i * 3] = -1;
        // tangents[3 * 18 + 1 + i * 3] = 0;
        // tangents[3 * 18 + 2 + i * 3] = 0;

        // normals[4 * 18 + i * 3] = 0;       //X face back
        // normals[4 * 18 + 1 + i * 3] = 1;
        // normals[4 * 18 + 2 + i * 3] = 0;
        // tangents[4 * 18 + i * 3] = -1;
        // tangents[4 * 18 + 1 + i * 3] = 0;
        // tangents[4 * 18 + 2 + i * 3] = 0;
        //
        // normals[5 * 18 + i * 3] = 0;       //Z face front
        // normals[5 * 18 + 1 + i * 3] = 1;
        // normals[5 * 18 + 2 + i * 3] = 0;
        // tangents[5 * 18 + i * 3] = -1;
        // tangents[5 * 18 + 1 + i * 3] = 0;
        // tangents[5 * 18 + 2 + i * 3] = 0;
        //
        // normals[6 * 18 + i * 3] = 0;       //X face front
        // normals[6 * 18 + 1 + i * 3] = 1;
        // normals[6 * 18 + 2 + i * 3] = 0;
        // tangents[6 * 18 + i * 3] = -1;
        // tangents[6 * 18 + 1 + i * 3] = 0;
        // tangents[6 * 18 + 2 + i * 3] = 0;
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

    // addTexture(glInfo, "./normal.png", gl.TEXTURE2, normalTextureLocation, gl.RGBA, gl.RGBA);

    // render_normals_from_height_map(glInfo, "./height_map.png", 100, gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA).then(
    render_normals_from_height_map(glInfo, "./height_map.png", 12, gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA).then(
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
    // addTexture(glInfo, "./normal.png", gl.TEXTURE2, normalTextureLocation);
    // addTexture(glInfo, "./height_map.png", gl.TEXTURE2, heightMapTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(glInfo, "./color.png", gl.TEXTURE1, heightMapTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(glInfo, "./color.png", gl.TEXTURE1, colorTextureLocation, gl.RGBA, gl.RGBA);
    // render_normals_from_height_map(glInfo, "./height_map.png", gl.TEXTURE1, normalTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(glInfo, "./height_map.png", gl.TEXTURE4, colorTextureLocation, gl.DEPTH_COMPONENT24, gl.DEPTH_COMPONENT);
}

function loop(canvas, gl){

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(displayProportionUniformLocation, canvas.width, canvas.height);

    // cameraVector = [ //direction
    //     Math.sin(rotateX) * -Math.cos(rotateY),
    //     Math.sin(rotateY),
    //     Math.cos(rotateX) * Math.cos(rotateY),
    // ];
    // cameraVector = [    //rotations values
    //     rotateX,
    //     rotateY,
    //     0,
    // ];
    gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.uniform2f(rotateUniformLocation, rotateX, rotateY);      //rotation values
    // gl.uniform3fv(cameraRotationUniformLocation, cameraVector); //direction!?
    gl.uniform1f(distanceUniformLocation, zoom);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));
    // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // this.framebuffer = gl.createFramebuffer();
    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, this.depth, 0);
    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 3); //type, offset, count (position.length/size)

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
    rotateY = (clickY - mouseY + oldRotateY);
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