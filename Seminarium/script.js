"use strict";

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl");
    init(canvas, gl);
    //createTexture("./footprint.png", (retErr, retVal) => {
    //    console.log(retVal);
    //});
    loop(canvas, gl);
}

var positionAttributeLocation;
var colorAttributeLocation;
var tangentsAttributeLocation;
var bitangentsAttributeLocation;
var normalsAttributeLocation;
var mouseUniformLocation;
var rotateUniformLocation;
var cameraRotationUniformLocation;
var displayProportionUniformLocation;
var distanceUniformLocation;
var texcoordLocation;
var normalTextureLocation;
var heightMapTextureLocation;
var colorTextureLocation;

let glInfo = {
    gl: undefined,
    imagesArray: new Array(),
    texturesArray: new Array(),
}

var temporaryLocation_1;
// Format: - remember that points should turn anti-clockwise
// x1, y1, z1
// x2, y2, z2
// x3, y3, z3
// x4, y4, z4
// x1, y1, z1
// x3, y3, z3
var positions = [
    // //Z face
    // -1,  1+-1,  1,
    //  1,  1+-1,  1,
    //  1,  1+ 1,  1,
    // -1,  1+ 1,  1,
    // -1,  1+-1,  1,
    //  1,  1+ 1,  1,
    -1,  0,  1,
    -1,  2,  1,
     1,  2,  1,
     1,  0,  1,
    -1,  0,  1,
     1,  2,  1,

]
var texcoords = [
    0, 0,    0, 2,    2, 2,  //check this out
    2, 0,    0, 0,    2, 2,
]
var tangents = [];
var bitangents = [];
var normals = [];

function radToDeg(value) {
    return value / Math.PI * 180
}
function degToRad(value) {
    return value / 180 * Math.PI;
}
//tangent - red X
//bitangent - green Y
//normal - blue Z
function generateFace(positionsArray, position, texcoordArray, tangent, bitangent, size_x, size_y, scale=1) {
    tangent.normalize();
    bitangent.normalize();
    size_x /= 2;
    size_y /= 2;

    let P1 = new Vector3(
        position.x - tangent.x*size_x - bitangent.x*size_y,
        position.y - tangent.y*size_x - bitangent.y*size_y,
        position.z - tangent.z*size_x - bitangent.z*size_y,
    );
    let P2 = new Vector3(
        position.x - tangent.x*size_x + bitangent.x*size_y,
        position.y - tangent.y*size_x + bitangent.y*size_y,
        position.z - tangent.z*size_x + bitangent.z*size_y,
    );
    let P3 = new Vector3(
        position.x + tangent.x*size_x + bitangent.x*size_y,
        position.y + tangent.y*size_x + bitangent.y*size_y,
        position.z + tangent.z*size_x + bitangent.z*size_y,
    );
    let P4 = new Vector3(
        position.x + tangent.x*size_x - bitangent.x*size_y,
        position.y + tangent.y*size_x - bitangent.y*size_y,
        position.z + tangent.z*size_x - bitangent.z*size_y,
    );
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P2.toArray());
    positionsArray.push(...P3.toArray());
    positionsArray.push(...P4.toArray());
    positionsArray.push(...P1.toArray());
    positionsArray.push(...P3.toArray());
    texcoordArray.push(
        0,              0,
        0,              size_y * scale,
        size_x * scale, size_y * scale,
        size_x * scale, 0,
        0,              0,
        size_x * scale, size_y * scale
    );
}

function init(canvas, gl) {
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
        generateFace(   // Y face (middle)
            positions, new Vector3(0, 0, 0),
            texcoords, new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            2, 2
        );
        generateFace(   //Z face
            positions, new Vector3(0, 0, -1),
            texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            2, 2, 2
        );
        generateFace(   //X face
            positions, new Vector3(1, 0, 0),
            texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, 1),
            2, 2, 1
        );
        generateFace(   //X face
            positions, new Vector3(3, 0, 0),
            texcoords, new Vector3(0, 1, 0), new Vector3(0, 0, 2),
            2, 2, 1
        );
        generateFace(   //smth
            positions, new Vector3(-3, 0, 0),
            texcoords, new Vector3(1, 0, 2), new Vector3(0, 1, 2),
            2, 2, 1
        );
    }

    const program = createProgram(
        gl,
        createShader(gl, vertexShader, gl.VERTEX_SHADER),
        createShader(gl, fragmentShader, gl.FRAGMENT_SHADER)
    );

    //init glInfo which stores info for creating textures
    glInfo.gl = gl;

    positionAttributeLocation = gl.getAttribLocation(program, "a_position");
    colorAttributeLocation = gl.getAttribLocation(program, "a_color");
    tangentsAttributeLocation = gl.getAttribLocation(program, "a_tangents");
    bitangentsAttributeLocation = gl.getAttribLocation(program, "a_bitangents");
    normalsAttributeLocation = gl.getAttribLocation(program, "a_normals");
    texcoordLocation = gl.getAttribLocation(program, "a_texcoord");
    mouseUniformLocation = gl.getUniformLocation(program, "u_mouse");
    rotateUniformLocation = gl.getUniformLocation(program, "u_rotate");
    cameraRotationUniformLocation = gl.getUniformLocation(program, "u_cameraRotation");
    displayProportionUniformLocation = gl.getUniformLocation(program, "u_displayProportion");
    distanceUniformLocation = gl.getUniformLocation(program, "u_distance");
    normalTextureLocation = gl.getUniformLocation(program, "u_normal_texture");
    heightMapTextureLocation = gl.getUniformLocation(program, "u_height_map_texture");
    colorTextureLocation = gl.getUniformLocation(program, "u_color_texture");
    temporaryLocation_1 = gl.getUniformLocation(program, "u_temp_use_the_oclussion");

    for (let i2 = 0; i2 < positions.length / 3; i2++) {
        let edge1 = new Vector3(positions[(i2*3 + 1)*3], positions[(i2*3 + 1)*3 + 1], positions[(i2*3 + 1)*3 + 2]);
          edge1.add(new Vector3(-positions[(i2*3)*3],   -positions[(i2*3)*3 + 1],    -positions[(i2*3)*3 + 2]));
        let edge2 = new Vector3(positions[(i2*3 + 2)*3], positions[(i2*3 + 2)*3 + 1], positions[(i2*3 + 2)*3 + 2]);
          edge2.add(new Vector3(-positions[(i2*3)*3],   -positions[(i2*3)*3 + 1],    -positions[(i2*3)*3 + 2]));
        let deltaUV1 = new Vector2( texcoords[(i2*3 + 1)*2], texcoords[(i2*3 + 1)*2 + 1]);
          deltaUV1.add(new Vector2(-texcoords[(i2*3)*2],    -texcoords[(i2*3)*2 + 1]));
        let deltaUV2 = new Vector2( texcoords[(i2*3 + 2)*2], texcoords[(i2*3 + 2)*2 + 1]);
          deltaUV2.add(new Vector2(-texcoords[(i2*3)*2],    -texcoords[(i2*3)*2 + 1]));

        let f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);
        // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        for (let i = 0; i < 3; i++) {
            //tangent (X) for some reason i had to reverse it
            tangents[(i2*3 + i) * 3]     = f * (-deltaUV2.y * edge1.x + deltaUV1.y * edge2.x);
            tangents[(i2*3 + i) * 3 + 1] = f * (-deltaUV2.y * edge1.y + deltaUV1.y * edge2.y);
            tangents[(i2*3 + i) * 3 + 2] = f * (-deltaUV2.y * edge1.z + deltaUV1.y * edge2.z);
            //bitangent (Y)
            bitangents[(i2*3 + i) * 3]     = f * (-deltaUV2.x * edge1.x + deltaUV1.x * edge2.x);
            bitangents[(i2*3 + i) * 3 + 1] = f * (-deltaUV2.x * edge1.y + deltaUV1.x * edge2.y);
            bitangents[(i2*3 + i) * 3 + 2] = f * (-deltaUV2.x * edge1.z + deltaUV1.x * edge2.z);
            //normal(Z)
            normals[(i2*3 + i) * 3]     = edge1.y*edge2.z - edge1.z*edge2.y;
            normals[(i2*3 + i) * 3 + 1] = edge1.z*edge2.x - edge1.x*edge2.z;
            normals[(i2*3 + i) * 3 + 2] = edge1.x*edge2.y - edge1.y*edge2.x;
            // normals[(i2*3 + i) * 3]     = (positions[(i2 * 3 + 2) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]) * (positions[(i2 * 3 + 0) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]) - (positions[(i2 * 3 + 2) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]) * (positions[(i2 * 3 + 0) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]);
            // normals[(i2*3 + i) * 3 + 1] = (positions[(i2 * 3 + 2) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]) * (positions[(i2 * 3 + 0) * 3 + 0] - positions[(i2 * 3 + 1) * 3 + 0]) - (positions[(i2 * 3 + 2) * 3 + 0] - positions[(i2 * 3 + 1) * 3 + 0]) * (positions[(i2 * 3 + 0) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]);
            // normals[(i2*3 + i) * 3 + 2] = (positions[(i2 * 3 + 2) * 3 + 0] - positions[(i2 * 3 + 1) * 3 + 0]) * (positions[(i2 * 3 + 0) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]) - (positions[(i2 * 3 + 2) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]) * (positions[(i2 * 3 + 0) * 3 + 0] - positions[(i2 * 3 + 1) * 3 + 0]);
        }
    }
    console.log(normals);

    var positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    //var colorBuffer = gl.createBuffer();
    //gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    //gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array([255, 255, 255]), gl.STATIC_DRAW);
    var textureBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(texcoordLocation);
    gl.vertexAttribPointer(texcoordLocation, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    var tangentsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(tangents), gl.STATIC_DRAW);
    var bitangentsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(bitangents), gl.STATIC_DRAW);
    var normalsBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    // gl.enable(gl.CULL_FACE); //turn off for double sided and transparency
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

    createTexture(glInfo, "./normal.png", gl.TEXTURE1, normalTextureLocation);
    // createTexture(glInfo, "./normal.png", gl.TEXTURE2, normalTextureLocation);
    createTexture(glInfo, "./height_map.png", gl.TEXTURE2, heightMapTextureLocation);
    createTexture(glInfo, "./color.png", gl.TEXTURE3, colorTextureLocation);
}

function loop(canvas, gl){

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(displayProportionUniformLocation, canvas.width, canvas.height);

    cameraVector = [ //direction
        Math.sin(rotateX) * -Math.cos(rotateY),
        Math.sin(rotateY),
        Math.cos(rotateX) * Math.cos(rotateY),
    ];
    // cameraVector = [    //rotations values
    //     rotateX,
    //     rotateY,
    //     0,
    // ];
    gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.uniform2f(rotateUniformLocation, rotateX, rotateY);      //rotation values
    gl.uniform3fv(cameraRotationUniformLocation, cameraVector); //direction!?
    gl.uniform1f(distanceUniformLocation, zoom);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));
    // gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    // gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
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
var rotateY = degToRad(180);
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