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
            init(canvas, gl);   //loop is executed inside init
            //     .then(
            //     () => {
            //         loop(canvas, gl);
            //     }
            // ).catch(
            //     (error) => { console.error(error); }
            // );
        }
    ).catch(
        (error) => { console.error(error); }
    );
}

let mouseUniformLocation;

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

let temporaryLocation_1;

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

let images = [];

let material1;  //paralax snow
let materialLambertian;  //paralax snow
let materialDepth;  //paralax snow
let model1;
let model2;
let snow_projection_plane;


async function init(canvas, gl) {
    material1 = new Material(gl, vertexShader, fragmentShader);
    materialLambertian = new Material(gl, vertexShader, fragmentShaderLambertian);
    materialDepth = new Material(gl, vertexShader, fragmentShaderDepth);
    model1 = new Model(material1);
    model2 = new Model(materialLambertian);
    snow_projection_plane = new Model(materialDepth);
    snow_projection_plane.center = new Vector3(0, 0, 4);
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
        generateFace(   //Z face side-right
            model1, new Vector3(2, 1, 0),
            new Vector3(1, 0, -1).normalize(), new Vector3(0, 1, 0),
            2*Math.sqrt(2), 2, 1
        );
        generateFace(   //X face front
            model1, new Vector3(1, 1, 0),
            new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            2, 2, 1
        );

        generateFace(   // Y face
            model1, new Vector3(2, 0, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            20, 20
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
    generateFace(
        model2, new Vector3(0, 0.5, 0.5),
        new Vector3(1, 0, 0), new Vector3(0, 1, 0),
        0.5, 0.5, 1
    );
    generateFace(
        snow_projection_plane, snow_projection_plane.center,
        // new Vector3(1, 0, 0), new Vector3(0, -1, 0),
        new Vector3(1, 1, 0), new Vector3(1, -1, -1),
        7, 7, 1
    );

    model1.computeFlatNormals();
    model2.computeFlatNormals();
    snow_projection_plane.computeFlatNormals();
    depthVAO = gl.createVertexArray();
    // gl.bindVertexArray(mainVAO);

    mouseUniformLocation = gl.getUniformLocation(material1.program, "u_mouse");
    // normalDetailTextureLocation = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
    temporaryLocation_1 = gl.getUniformLocation(material1.program, "u_temp_use_the_oclussion");

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.4, 0.3, 1);
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
    material1.location.uniform.snowDirection = gl.getUniformLocation(material1.program, "u_snow_direction");

    // /* useless */ materialDepth.location.texture.normal = gl.getUniformLocation(materialDepth.program, "u_normal_texture");
    // /* useless */ materialDepth.location.texture.color = gl.getUniformLocation(materialDepth.program, "u_color_texture");
    materialDepth.location.texture.heightMap = gl.getUniformLocation(materialDepth.program, "u_height_map_texture");
    // /* useless */ materialDepth.location.texture.normalDetail = gl.getUniformLocation(materialDepth.program, "u_normal_detail_texture");

    //load all images, then create image
    addImage("./height_map.png", (image) => {
        images["height_map"] = image;
        addImage("./color.png", (image) => {
            images["color"] = image;
            addImage("./av53c33f80f8586a07900.png", (image) => {
                images["normal_detail"] = image;
                add_normals_from_height_map_image(images["height_map"], 24, (image) => {
                    images["normal"] = image;
                    addTexture(model1, images["normal"], gl.TEXTURE1, material1.location.texture.normal, gl.RGBA, gl.RGBA);
                    addTexture(model1, images["color"], gl.TEXTURE2, material1.location.texture.color, gl.RGBA, gl.RGBA);
                    addTexture(model1, images["height_map"], gl.TEXTURE3, material1.location.texture.heightMap, gl.RGBA, gl.RGBA);
                    addTexture(model1, images["normal_detail"], gl.TEXTURE4, material1.location.texture.normalDetail, gl.RGBA, gl.RGBA);
                    // addTexture(model2, images["height_map"], gl.TEXTURE1, materialDepth.location.texture.heightMap, gl.RGBA, gl.RGBA);
                    //target texture for framebuffer
                    addTexture(model2, null, gl.TEXTURE2, materialDepth.location.texture.heightMap, gl.RGBA, gl.RGBA, 1024, 1024);
                    loop(canvas, gl);
                });
            });
        });
    })
    // // addTexture(model1, "./circuitry-detail-normal.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // // addTexture(model1, "./9749-normal.jpg", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(model1, "./av53c33f80f8586a07900.png", gl.TEXTURE4, material1.location.texture.normalDetail, gl.RGBA, gl.RGBA);
}


var globalid = 5;


function loop(canvas, gl){
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    let aspect_ratio = canvas.width / canvas.height;
    // gl.viewport(0, 0, 100, 100);
    gl.viewport(0, 0, canvas.width, canvas.height);

    // gl.useProgram(material1.program);
    // gl.bindVertexArray(model1.VAO);
    // gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    // gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));

    let id = globalid;

    let zAxis = normalize_vec([model1.normals[id*3*6 + 0], model1.normals[id*3*6 + 1], model1.normals[id*3*6 + 2]])
    let xAxis = normalize_vec(math.cross([0, 1, 1.01], zAxis));
    let yAxis = normalize_vec(math.cross(zAxis, xAxis));

    model2.rotate(0, 0, 0.01);// Date.now();

    let camera_matrix = math.identity(4);
    camera_matrix = math.multiply(translate_mtx(0, 0, zoom), camera_matrix);
    camera_matrix = math.multiply(rotate_y_mtx(rotateX), rotate_x_mtx(-rotateY), camera_matrix);
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
    let near = 0.1;
    let far = 20.0;
    let projection_matrix = perspective_mtx(
        degToRad(90.),
        near,
        far,
        aspect_ratio
    );
    let isProjectionPerspective = true;


    /////////////////////////////orthogonal camera for projection plane
    let snow_camera_matrix = math.identity(4);
    snow_camera_matrix = math.multiply(math.matrixFromColumns(
        [snow_projection_plane.tangents[0], snow_projection_plane.tangents[1], snow_projection_plane.tangents[2], 0],
        [-snow_projection_plane.bitangents[0], -snow_projection_plane.bitangents[1], -snow_projection_plane.bitangents[2], 0],
        [-snow_projection_plane.normals[0], -snow_projection_plane.normals[1], -snow_projection_plane.normals[2], 0],
        // [snow_projection_plane.center.toArray(), 1].flat(),
        [snow_projection_plane.center.x, snow_projection_plane.center.y, snow_projection_plane.center.z, 1],
    ), snow_camera_matrix);

    // projection_matrix = orthographic_mtx(-4*aspect_ratio, 4*aspect_ratio, -4, 4, near, far);
    let snow_projection_matrix = orthographic_mtx(-4, 4, -4, 4, near, far);
    // isProjectionPerspective = false;
    // zamiast cyfr na sta³e, za³adowaæ pozycjê p³aszczyzny œniegowej -  zprojektowan¹ z kamery*

    view_matrix = math.inv(camera_matrix);
    let snow_view_matrix = math.inv(snow_camera_matrix);
    projection_matrix = math.matrix(projection_matrix);
    snow_projection_matrix = math.matrix(snow_projection_matrix);
    let view_projection = math.multiply(projection_matrix, view_matrix);
    let snow_view_projection = math.multiply(snow_projection_matrix, snow_view_matrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // model1.material.location.other = { proj_plane: {snow_projection_plane.positions[0]}}

    // gl.useProgram(materialDepth.program);
    // gl.useProgram(model2.material.program);

    // console.log(model1.textures);
    // console.log(model2.textures);
    // const targetTexture = gl.createTexture();
    let fb = gl.createFramebuffer();
    // let rb = gl.createRenderbuffer();
    // gl.activeTexture(gl.TEXTURE2);
    // gl.bindTexture(gl.TEXTURE_2D, model2.textures[0].texture);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    // gl.bindRenderbuffer(gl.RENDERBUFFER, rb);

    // gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1024, 1024, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    // images["frameBuffer"] = fb;
    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, model2.textures[0].texture, 0);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

    // gl.uniform3f(material1.location.uniform.snowDirection, 0, 1, 0);
    gl.uniform3f(material1.location.uniform.snowDirection,
        -snow_projection_plane.normals[0],
        -snow_projection_plane.normals[1],
        -snow_projection_plane.normals[2]);
    gl.viewport(0, 0, 1024, 1024);
    [model2].forEach((model) => {   //draw moving actor and model in depth_buffer shader.
        drawModel(gl, model, snow_view_projection, snow_camera_matrix, snow_projection_matrix, near, far, isProjectionPerspective);
    });
    gl.generateMipmap(gl.TEXTURE_2D);
    setTexture(model2, model2.textures[0].texture, model2.material.location.texture.heightMap, gl.TEXTURE2);
    // gl.uniform1i(materialDepth.location.texture.color, gl.TEXTURE2);
    // gl.uniform1i(material1.location.texture.color, gl.TEXTURE0 - id - 1);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);


    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    [model1, model2, snow_projection_plane].forEach((model) => {
        drawModel(gl, model, view_projection, camera_matrix, projection_matrix, near, far, isProjectionPerspective);
    });

    // gl.drawArrays(gl.TRIANGLES, 0, model1.positions.length / 3); //type, offset, count (position.length/size)
    // gl.drawArrays(gl.TRIANGLES, 0, model2.positions.length / 3); //type, offset, count (position.length/size)

    // gl.useProgram(materialDepth.program);   //for some reason i have to end the drawing by this program.
    // gl.useProgram(material1.program);   //for some reason i have to end the drawing by this program.
    // Otherwise only one texture is loaded - why??

    gl.bindVertexArray(null);
    requestAnimationFrame(() => { loop(canvas, gl) });
}

function drawModel(gl, model, view_projection, camera_matrix, projection_matrix, near, far, isProjectionPerspective) {
    let world_view_projection = math.multiply(view_projection, model.model_matrix);
    let inverse_world_view_projection = math.inv(world_view_projection);

    gl.useProgram(model.material.program);
    gl.bindVertexArray(model.VAO);
    gl.uniformMatrix4fv(model.material.location.uniform.mvp, true, math.flatten(world_view_projection)._data);
    gl.uniformMatrix4fv(model.material.location.uniform.inv_mvp, true, math.flatten(inverse_world_view_projection)._data);
    gl.uniformMatrix4fv(model.material.location.uniform.world_inv_transpose, false, math.flatten(math.inv(model.model_matrix))._data);
    gl.uniformMatrix4fv(model.material.location.uniform.camera, true, math.flatten(camera_matrix)._data);
    gl.uniformMatrix4fv(model.material.location.uniform.projection, true, math.flatten(projection_matrix)._data);
    gl.uniformMatrix4fv(model.material.location.uniform.model, true, math.flatten(model.model_matrix)._data);
    gl.uniform1f(model.material.location.uniform.near, near);
    gl.uniform1f(model.material.location.uniform.far, far);
    gl.uniform1f(model.material.location.uniform.projectionPerspective, isProjectionPerspective); //is projection perspective or orthographic
    model.textures.forEach(textureInfo => {
        setTexture(model, textureInfo.texture, textureInfo.location, textureInfo.id);
        // if (textureInfo.location != null) {
        //     gl.uniform1i(textureInfo.location, textureInfo.id - gl.TEXTURE1);
        //     gl.activeTexture(textureInfo.id);
        //     // console.log(textureInfo);
        //     // console.log("0:" + gl.TEXTURE0);
        //     gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
        // }
    });

    gl.drawArrays(gl.TRIANGLES, 0, model.positions.length / 3); //type, offset, count (position.length/size)

    // gl.activeTexture(null);
    // gl.bindTexture(gl.TEXTURE_2D, null);
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
} else if (e.deltaY < 0 && zoom > 0.11) {
    zoom -= .1;
}
})

main();


//      x,      y,      z,      w
// x	1,      0,      0,      0
// y	0,      1,      0,      0
// z	0,      0,      1,      0
// w	0,      0,      0,      1

//      x,      y,      z,      w
// x	1,      0,      0,      0
// y	0,      1,      0,      0
// z	0,      0,      1,      0
// w	0,      0,      0,      1

//      x,      y,      z,      w
// x	xx,     yx,     zx,     wx
// y	xy,     yy,     zy,     wy
// z	xz,     yz,     zz,     wz
// w	xpos,   ypos,   zpos,   scale

// w /= matrix

// A * B
//      prevX,  prevY,  prevZ,      w           x,      y,      z,      w
// x	xx,     yx,     zx,     wx              xx,     yx,     zx,     wx
// y	xy,     yy,     zy,     wy      *       xy,     yy,     zy,     wy
// z	xz,     yz,     zz,     wz              xz,     yz,     zz,     wz
// w	xpos,   ypos,   zpos,   scale           xpos,   ypos,   zpos,   scale

// (in my case it will be transposed) as collumn vectors in rows
// prev X = (xx*n_xx + xy*n_yx + xz*n_zx

// prev X = (xx*n_xx + xy*n_yx + xz*n_zx

// apply transformation:
// transformation * data_matrix = result_matrix
// other_transformation * result_matrix = result
// other_transformation * transformation * data_matrix = result

// A transpose:
// for vectors a and b:
// A * x * y = x * A^T * y




// A * B
//      prevX,  prevY,  prevZ,      w           x,      y,      z,      w
// x	xx,     yx,     zx,     wx              0.1,     0,      0,      0
// y	xy,     yy,     zy,     wy      *       0,      0.1,     0,      0
// z	xz,     yz,     zz,     wz              0,      0,      -0.1,   -1
// w	xpos,   ypos,   zpos,   scale           0,      0,      0,      1


// prevX = (x*0.1, y*0.1, z*-0.1 - x_pos, x_pos)
// prevY = (x*0.1, y*0.1, z*-0.1 - y_pos, y_pos)
// prevZ = (x*0.1, y*0.1, z*-0.1 - z_pos, z_pos)
//w     = (0,     0,     0,      scale)

// prevX = (x*0.1, y*0.1, z*-0.1 - x_pos, x_pos)
// prevY = (x*0.1, y*0.1, z*-0.1 - y_pos, y_pos)
// prevZ = (x*0.1, y*0.1, z*-0.1 - z_pos, z_pos)

//prevX = (x*0.1, y*0.1, z*-0.1, -z + x_pos)
//prevY = (x*0.1, y*0.1, z*-0.1, -z + y_pos)
//prevZ = (x*0.1, y*0.1, z*-0.1, -z + z_pos)
//w     = (0,     0,     0,      scale)


//      prevX,  prevY,  prevZ,  w               x,      y,      z,      w
// x	xx,     yx,     zx,     wx              1,      0,      0,      x
// y	xy,     yy,     zy,     wy      *       0,      1,      0,      y
// z	xz,     yz,     zz,     wz              0,      0,      1,      z
// w	xpos,   ypos,   zpos,   scale           0,      0,      0,      1


//prevX = (xx + x*xpos, xy + y*xpos, xz + z*xpos, x_pos)
//prevY = (x*0.1, y*0.1, z*-0.1, -z + y_pos)
//prevZ = (x*0.1, y*0.1, z*-0.1, -z + z_pos)


//      prevX,  prevY,  prevZ,  w               x,      y,      z,      w
// x	xx,     yx,     zx,     wx              1,      0,      0,      0
// y	xy,     yy,     zy,     wy      *       0,      1,      0,      0
// z	xz,     yz,     zz,     wz              0,      0,      1,      0
// w	xpos,   ypos,   zpos,   scale           0,      0,      0,      1