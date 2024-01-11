"use strict";
const NEAR = 0.01;
const FAR = 30.0;
function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init_render_normals_from_height_map().then(
        () => {
            console.log("done");
            init(canvas, gl);   //loop is executed inside init
        }
    ).catch(
        (error) => { console.error(error); }
    );
}

let mouseUniformLocation;

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

let images = [];

let material1;  //paralax snow
let materialLambertian;  //paralax snow
let materialDepth;  //paralax snow
let materialDepthHelper;
let materialDepthRenderBuffer;
let materialGenerateNormals;    //image post processing effect
let modelFullScreenNormals;
let modelFullScreenRenderBuffer;
let model1; //snow
let model1InDepthTransform;
let model1Lambertian;
let modelSmoothPlane;   //snow2
let modelSmoothPlaneInDepthTransform;
let modelSmoothPlaneLambertian;
let model2; //agent1
let model2InDepth;
let model3; //agent2
let model3InDepth;
let modelCapsule;   //agent3
let modelCapsuleInDepth;
let modelPlane;
let modelPlaneInDepthTransform;
let snow_projection_plane;

let heightMapFrameBuffer;
let transformFrameBuffer;
let normalFrameBuffer;
let rb;
const textureSize = 1024;
// const textureSize = 256;

function init(canvas, gl) {
    material1 = new Material(gl, vertexShaderSnow, fragmentShader);
    materialLambertian = new Material(gl, vertexShader, fragmentShaderLambertian);
    materialDepth = new Material(gl, vertexShader, fragmentShaderDepth);
    materialDepthHelper = new Material(gl, vertexShader, fragmentShaderDepthTransform);
    materialDepthRenderBuffer = new Material(gl, vertexShaderNoTransform, fragmentShaderDepthRenderBuffer);
    modelFullScreenRenderBuffer = Model.createFullScreenModel(materialDepthRenderBuffer);
    materialGenerateNormals = new Material(gl, vertexShaderNoTransform, fragmentShaderRenderNormalsFromHeightMap);
    modelFullScreenNormals = Model.createFullScreenModel(materialGenerateNormals);
    model1 = new Model(material1);
    model1Lambertian = new Model(materialLambertian);
    model1InDepthTransform = new Model(materialDepthHelper);

    modelSmoothPlane = new Model(material1);
    modelSmoothPlane.copyModelFromOBJInfo(createModelsFromOBJ(smoothPlaneObj, {}, null)[1].triangles)
    modelSmoothPlaneLambertian = new Model(materialLambertian);
    modelSmoothPlaneInDepthTransform = new Model(materialDepthHelper);

    model2 = new Model(materialLambertian);
    model2InDepth = new Model(materialDepth);

    model3 = new Model(materialLambertian);
    model3InDepth = new Model(materialDepth);

    modelCapsule = new Model(materialLambertian);
    modelCapsule.copyModelFromOBJInfo(createModelsFromOBJ(capsuleObj, {}, null)[0].triangles);
    modelCapsuleInDepth = new Model(materialDepth);

    snow_projection_plane = new Model(materialDepth);
    snow_projection_plane.center = new Vector3(0, 6, 0);
    // snow_projection_plane.center = new Vector3(0, 0, 4);
    // snow_projection_plane.center = new Vector3(0, 0, -4);
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
            // 2, 2, 1
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

        // generateFace(
        //     model1, new Vector3(1, -0.3, 0),
        //     new Vector3(1, -0.5, -1), new Vector3(-1, 0, -1),
        //     6, 6
        // );

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
        model2, new Vector3(0, 0.5, 0.4),
        new Vector3(1, 0, 0), new Vector3(0, 1, 0),
        0.5, 0.5, 1
    );
    generateFace(
        model3, new Vector3(0, - 1.1, 3.),
        new Vector3(1, 0, 0), new Vector3(0, 0, -1),
        2.5, 2.5, 1
    );
    generateFace(
        snow_projection_plane, snow_projection_plane.center,
        new Vector3(1, 0, 0), new Vector3(0, -0.00, 1),
        // new Vector3(1, 1, 0), new Vector3(1, -1, -1),
        // new Vector3(1, 1, 0), new Vector3(-1, 1, 1),
        7, 7, 1
    );

    model1.translate(0, -0.5, 0);
    // model1.rotate(0.2, -0.5, 0.1);
    // model1.scale(2, 2, 2);
    model1.applyTransformMatrix();
    model1.computeFlatNormals();
    model1InDepthTransform.copyModel(model1);
    model1Lambertian.copyModel(model1, false);
    model1Lambertian.translate(0, -0.99, 0);
    modelSmoothPlaneInDepthTransform.copyModel(modelSmoothPlane);
    modelSmoothPlaneLambertian.copyModel(modelSmoothPlane, false);
    modelSmoothPlaneLambertian.translate(0, -0.99, 0);
    model2.computeFlatNormals();
    model2InDepth.copyModel(model2);
    model3.computeFlatNormals();
    model3InDepth.copyModel(model3);
    modelCapsuleInDepth.copyModel(modelCapsule);
    snow_projection_plane.computeFlatNormals();

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
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    snow_camera_matrix = math.identity(4);
    snow_camera_matrix = math.multiply(math.matrixFromColumns(
        [snow_projection_plane.tangents[0], snow_projection_plane.tangents[1], snow_projection_plane.tangents[2], 0],
        [-snow_projection_plane.bitangents[0], -snow_projection_plane.bitangents[1], -snow_projection_plane.bitangents[2], 0],
        [-snow_projection_plane.normals[0], -snow_projection_plane.normals[1], -snow_projection_plane.normals[2], 0],
        // [snow_projection_plane.center.toArray(), 1].flat(),
        [snow_projection_plane.center.x, snow_projection_plane.center.y, snow_projection_plane.center.z, 1],
    ), snow_camera_matrix);
    snow_projection_matrix = orthographic_mtx(-8, 8, -8, 8, NEAR, FAR);
    snow_view_matrix = math.inv(snow_camera_matrix);
    snow_view_projection = math.multiply(snow_projection_matrix, snow_view_matrix);
    snow_projection_matrix = math.matrix(snow_projection_matrix);

    rb = gl.createRenderbuffer();
    heightMapFrameBuffer = gl.createFramebuffer();
    // transformFrameBuffer = gl.createFramebuffer();
    normalFrameBuffer = gl.createFramebuffer();

    material1.location.texture.normal = gl.getUniformLocation(material1.program, "u_normal_texture");
    material1.location.texture.color = gl.getUniformLocation(material1.program, "u_color_texture");
    material1.location.texture.heightMap = gl.getUniformLocation(material1.program, "u_height_map_texture");
    material1.location.texture.normalDetail = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
    material1.location.uniform.snowDirection = gl.getUniformLocation(material1.program, "u_snow_direction");

    materialGenerateNormals.location.texture.heightMap = gl.getUniformLocation(materialGenerateNormals.program, "u_height_map_texture");
    materialGenerateNormals.location.uniform.slopeStrenth = gl.getUniformLocation(materialGenerateNormals.program, "u_slope_strength");
    materialDepthRenderBuffer.location.texture.heightMap = gl.getUniformLocation(materialDepthRenderBuffer.program, "u_height_map_texture");

    /* height transform */ materialDepthHelper.location.texture.heightMap = gl.getUniformLocation(materialDepthHelper.program, "u_height_map_texture");  //initial snow height map
    /* result height */ materialDepth.location.texture.heightMap = gl.getUniformLocation(materialDepth.program, "u_height_map_texture");        //only at init?
    // /* useless */ materialDepth.location.texture.normalDetail = gl.getUniformLocation(materialDepth.program, "u_normal_detail_texture");
    //load all images, then create image
    addImage("./height_map.png", (image) => {
        images["height_map"] = image;
        addImage("./color.png", (image) => {
            images["color"] = image;
            addImage("./av53c33f80f8586a07900.png", (image) => {
                images["normal_detail"] = image;
                // TEXTURE id must be unique in program
                // model can have different textures in different programs, even if the location name is the same, but thier associated name be different
                addTexture(model1, "normal", null,
                    gl.TEXTURE1, material1.location.texture.normal, gl.RGBA, gl.RGBA, textureSize, textureSize, true);
                addTexture(model1, "color", images["color"],
                    gl.TEXTURE2, material1.location.texture.color, gl.RGBA, gl.RGBA);
                addTexture(model1, "height_map_framebuffer", null,
                    gl.TEXTURE3, material1.location.texture.heightMap, gl.RGBA, gl.RGBA, textureSize, textureSize, true);
                addTexture(model1, "normal_detail", images["normal_detail"],
                    gl.TEXTURE4, material1.location.texture.normalDetail, gl.RGBA, gl.RGBA);
                addTexture(model1InDepthTransform, "height_map", images["height_map"],
                    gl.TEXTURE1, materialDepthHelper.location.texture.heightMap, gl.RGBA, gl.RGBA);   //change to greyscale single channel or double channel normalized height and distance to surface
                addTexture(model1InDepthTransform, "height_transform_framebuffer", null,
                    gl.TEXTURE1, materialDepth.location.texture.heightMap, gl.RGBA, gl.RGBA, textureSize, textureSize, true);   //change to greyscale single channel or double channel normalized height and distance to surface
                gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
                    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textureSize, textureSize)
                gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
                    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, model1.textures["height_map_framebuffer"].texture, 0);
                // gl.bindFramebuffer(gl.FRAMEBUFFER, transformFrameBuffer);
                    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
                    // gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture, 0);

                gl.bindFramebuffer(gl.FRAMEBUFFER, normalFrameBuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, model1.textures["normal"].texture, 0);

                //draw only once heightmap texture into height map frameBuffer

                gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
                gl.viewport(0, 0, textureSize, textureSize);
                //draw moving actor and model in depth_buffer shader.
                initModel(gl, model1InDepthTransform, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
                setTexture(gl, model1InDepthTransform.textures["height_map"]);
                gl.drawArrays(gl.TRIANGLES, 0, model1InDepthTransform.positions.length / 3); //type, offset, count (position.length/size)
                gl.bindTexture(gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture)
                gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);

                gl.depthFunc(gl.ALWAYS); //overwrite depth buffer here
                initModel(gl, modelFullScreenRenderBuffer, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
                gl.useProgram(materialDepthRenderBuffer.program); //draw normals as post processing effect
                gl.bindVertexArray(modelFullScreenRenderBuffer.VAO);
                setTexture(gl, model1InDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialDepthRenderBuffer.location.texture.heightMap);
                gl.drawArrays(gl.TRIANGLES, 0, 6);

                model1.material.location.attribute.texcoord_color = gl.getAttribLocation(model1.material.program, "a_texcoord_color");
                model1.material.location.attribute.tangent_color = gl.getAttribLocation(model1.material.program, "a_tangents_color");
                model1.material.location.attribute.bitangent_color = gl.getAttribLocation(model1.material.program, "a_bitangents_color");
                model1.material.location.attribute.normal_color = gl.getAttribLocation(model1.material.program, "a_normals_color");
                //store texcoords and TBN for color and normal detail textures
                model1.addAttribute(new Float32Array(model1.texcoords), model1.material.location.attribute.texcoord_color, 2);
                model1.addAttribute(new Float32Array(model1.tangents), model1.material.location.attribute.tangent_color, 3);
                model1.addAttribute(new Float32Array(model1.bitangents), model1.material.location.attribute.bitangent_color, 3);
                model1.addAttribute(new Float32Array(model1.normals), model1.material.location.attribute.normal_color, 3);

                model1.castTextureCoordsFromViewProjection(snow_view_projection);

                loop(canvas, gl);
            });
        });
    })
    // // addTexture(model1, "./circuitry-detail-normal.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // // addTexture(model1, "./9749-normal.jpg", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(model1, "./av53c33f80f8586a07900.png", gl.TEXTURE4, material1.location.texture.normalDetail, gl.RGBA, gl.RGBA);
}


var globalid = 5;

var snow_camera_matrix;
var snow_projection_matrix;
var snow_view_matrix;
var snow_view_projection;

function loop(canvas, gl){
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    let aspect_ratio = canvas.width / canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // gl.bindVertexArray(model1.VAO);
    // gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.useProgram(material1.program);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));

    let id = globalid;

    // let zAxis = normalize_vec([model1.normals[id*3*6 + 0], model1.normals[id*3*6 + 1], model1.normals[id*3*6 + 2]])
    // let xAxis = normalize_vec(math.cross([0, 1, 1.01], zAxis));
    // let yAxis = normalize_vec(math.cross(zAxis, xAxis));

    model2.rotate(0, 0, 0.01);// Date.now();
    // model2.rotate(0, 0.41, 0.01);// Date.now();
    // model2.rotate(0, -0.41, 0);// Date.now();
    // model2.translate(0, 0, Math.sin(Date.now() / 499) / 20);// Date.now();

    model3.rotate(0, 0, 0.18);// Date.now();
    model3.rotate(0, 0.01, 0);// Date.now();
    model3.rotate(0, 0, -0.18);// Date.now();

    modelCapsule.resetTransform();
    modelCapsule.rotate(0, Date.now() / 2000, 0);
    modelCapsule.translate(6, -1.5, 0);
    modelCapsule.rotate(0, -Date.now() / 2000, 0);

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
    let projection_matrix = perspective_mtx(
        degToRad(90.),
        NEAR,
        FAR,
        aspect_ratio
    );

    // projection_matrix = orthographic_mtx(-4*aspect_ratio, 4*aspect_ratio, -4, 4, NEAR, FAR);
    // projection_matrix = orthographic_mtx(-2, 2, -2, 2, NEAR, FAR);
    // zamiast cyfr na sta³e, za³adowaæ pozycjê p³aszczyzny œniegowej -  zprojektowan¹ z kamery*

    view_matrix = math.inv(camera_matrix);
    projection_matrix = math.matrix(projection_matrix);
    let view_projection = math.multiply(projection_matrix, view_matrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //draw heightMapFB to heightTransformFB
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
    gl.viewport(0, 0, textureSize, textureSize);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

    gl.bindTexture(gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);
    // gl.bindFramebuffer(gl.FRAMEBUFFER, transformFrameBuffer);

    gl.depthFunc(gl.GREATER);   //we want to find the deepest intersection with snow plane
    gl.disable(gl.CULL_FACE);   //back-face could intersect with snow plane
    // gl.disable(gl.BLEND);       //program uses alpha channel to send data - not for now

    // using heightTransformFB draw agents in depth shader to heightMapFB
    gl.colorMask(true, false, false, false);    //only paralax height is updated - change if geometry has moved
    [
        model2InDepth,
        model3InDepth,
        modelCapsuleInDepth
    ].forEach((model) => {
        initModel(gl, model, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
        setTexture(gl, model1InDepthTransform.textures["height_transform_framebuffer"]);
        gl.drawArrays(gl.TRIANGLES, 0, model.positions.length / 3); //type, offset, count (position.length/size)
    })
    gl.colorMask(true, true, true, true);
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.depthFunc(gl.LESS);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);

    gl.bindFramebuffer(gl.FRAMEBUFFER, normalFrameBuffer);  //generate normals
    setTexture(gl, model1.textures["height_map_framebuffer"], gl.TEXTURE1);
    // gl.viewport(0, 0, textureSize, textureSize); //unnecessary - same sized texture
    gl.useProgram(materialGenerateNormals.program); //draw normals as post processing effect
    gl.bindVertexArray(modelFullScreenNormals.VAO);
    gl.uniform1f(materialGenerateNormals.location.uniform.slopeStrenth, textureSize / 7.); //good aproximation of slope (picked by eye)
    gl.drawArrays(gl.TRIANGLES, 0, 6);   // 2 coordinates per vertex

    gl.useProgram(material1.program);
    gl.uniform3f(material1.location.uniform.snowDirection,
        // -snow_projection_plane.normals[0] + Math.cos(Date.now() / 200),
        -snow_projection_plane.normals[0],
        -snow_projection_plane.normals[1],
        -snow_projection_plane.normals[2]);

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    // gl.bindRenderbuffer(gl.RENDERBUFFER, null);
    [
        model1,// model1Lambertian,
        // modelSmoothPlane, modelSmoothPlaneLambertian,
        model2,
        model3, modelCapsule
    ].forEach((model) => {
        initModel(gl, model, view_projection, camera_matrix, projection_matrix, NEAR, FAR);
        for (let key in model.textures) {
            let textureInfo = model.textures[key];
            setTexture(gl, textureInfo);
        }
        gl.drawArrays(gl.TRIANGLES, 0, model.positions.length / 3); //type, offset, count (position.length/size)
    });

    gl.bindVertexArray(null);
    requestAnimationFrame(() => { loop(canvas, gl) });
}

function initModel(gl, model, view_projection, camera_matrix, projection_matrix, near, far) {
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