"use strict";
const NEAR = 0.01;
const FAR = 30.0;
const textureSize = 1024;
// const textureSize = 256;
let snow_height_scale = 0.7;

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init(canvas, gl);   //loop is executed inside init
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
let materialDepthRenderBuffer;  //image post processing effect
let materialGenerateNormals;    //image post processing effect
let materialAddOne;             //image post processing effect

let modelFullScreenNormals;
let modelFullScreenRenderBuffer;
let modelFullScreenAddOne;
let model1; //snow
let model1InDepthTransform;
let model1Lambertian;
let model2; //agent1
let model2InDepth;
let model3; //agent2
let model3InDepth;
let modelCapsule;   //agent3
let modelCapsuleInDepth;
let modelBootLeft;   //agent4
let modelBootLeftInDepth;
let modelBootRight;   //agent5
let modelBootRightInDepth;

let snow_projection_plane;
let snow_camera_matrix;
let snow_projection_matrix;
let snow_view_matrix;
let snow_view_projection;
let previous_height_scale = snow_height_scale;  //check if snow_height_scale has changed

let heightMapFrameBuffer;
let normalFrameBuffer;
let rb;

function init(canvas, gl) {
    material1 = new Material(gl, vertexShaderSnow, fragmentShader);
    materialLambertian = new Material(gl, vertexShader, fragmentShaderLambertian);
    materialDepth = new Material(gl, vertexShader, fragmentShaderDepth);
    materialDepthHelper = new Material(gl, vertexShader, fragmentShaderDepthTransform);
    materialDepthRenderBuffer = new Material(gl, vertexShaderNoTransform, fragmentShaderDepthRenderBuffer);
    modelFullScreenRenderBuffer = Model.createFullScreenModel(materialDepthRenderBuffer);
    materialGenerateNormals = new Material(gl, vertexShaderNoTransform, fragmentShaderRenderNormalsFromHeightMap);
    modelFullScreenNormals = Model.createFullScreenModel(materialGenerateNormals);
    materialAddOne = new Material(gl, vertexShaderNoTransform, fragmentShaderAddOne);
    modelFullScreenAddOne = Model.createFullScreenModel(materialAddOne);
    model1 = new Model(material1);
    model1Lambertian = new Model(materialLambertian);
    model1InDepthTransform = new Model(materialDepthHelper);
    // model1.copyModelInfo(createModelsFromOBJ(capsuleObj, {}, null)[0])
    // model1.copyModelInfo(createModelsFromOBJ(smoothPlaneObj, {}, null)[0])
    model1Lambertian.generateExampleModel();

    model2 = new Model(materialLambertian);
    model2InDepth = new Model(materialDepth);

    model3 = new Model(materialLambertian);
    model3InDepth = new Model(materialDepth);

    modelCapsule = new Model(materialLambertian);
    modelCapsule.copyModelInfo(createModelsFromOBJ(capsuleObj, {}, null)[0]);
    modelCapsuleInDepth = new Model(materialDepth);
    modelCapsuleInDepth.copyModel(modelCapsule);

    modelBootLeft = new Model(materialLambertian);
    modelBootLeft.copyModelInfo(createModelsFromOBJ(bootObj, {}, null)[0]);
    modelBootLeftInDepth = new Model(materialDepth);
    modelBootLeftInDepth.copyModel(modelBootLeft);
    modelBootRight = new Model(materialLambertian);
    modelBootRight.copyModelInfo(createModelsFromOBJ(bootObj, {}, null)[0]);
    modelBootRightInDepth = new Model(materialDepth);
    modelBootRightInDepth.copyModel(modelBootRight);

    snow_projection_plane = new Model(materialDepth);
    snow_projection_plane.center = new Vector3(0, 6, 0);
    // snow_projection_plane.center = new Vector3(0, 0, 4);
    // snow_projection_plane.center = new Vector3(0, 0, -4);
    generateFace(
        snow_projection_plane, snow_projection_plane.center,
        new Vector3(1, 0, 0), new Vector3(0, -0.00, 1),
        // new Vector3(1, 1, 0), new Vector3(1, -1, -1),
        // new Vector3(1, 1, 0), new Vector3(-1, 1, 1),
        7, 7, 1
    );

    {
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
            model3, new Vector3(0, -1.1, 3.),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2.5, 2.5, 1
        );
    }
    model3.computeNormals();
    model3InDepth.copyModel(model3);
    model2.computeNormals();
    model2InDepth.copyModel(model2);

    model1Lambertian.translate(0, -2, 0);
    // model1.translate(0, -0.5, 2);
    // model1.scale(10, 2, 10);
    // model1.rotate(0.2, -0.5, 0.1);
    model1Lambertian.applyTransformMatrix();
    model1Lambertian.computeNormals(true);
    model1.copyModel(model1Lambertian, false);
    model1InDepthTransform.copyModel(model1);
    model1.translate(0, snow_height_scale - 0.01, 0);
    snow_projection_plane.computeNormals();

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
    // snow_projection_matrix = orthographic_mtx(-4, 4, -4, 4, NEAR, FAR);
    snow_projection_matrix = orthographic_mtx(-8, 8, -8, 8, NEAR, FAR);
    snow_view_matrix = math.inv(snow_camera_matrix);
    snow_view_projection = math.multiply(snow_projection_matrix, snow_view_matrix);

    rb = gl.createRenderbuffer();
    heightMapFrameBuffer = gl.createFramebuffer();
    normalFrameBuffer = gl.createFramebuffer();

    // setup material uniforms
    material1.location.texture.normal = gl.getUniformLocation(material1.program, "u_normal_texture");
    material1.location.texture.color = gl.getUniformLocation(material1.program, "u_color_texture");
    material1.location.texture.heightMap = gl.getUniformLocation(material1.program, "u_height_map_texture");
    material1.location.texture.normalDetail = gl.getUniformLocation(material1.program, "u_normal_detail_texture");
    material1.location.uniform.snowDirection = gl.getUniformLocation(material1.program, "u_snow_direction");
    material1.location.uniform.height_scale = gl.getUniformLocation(material1.program, "u_height_scale");

    materialGenerateNormals.location.texture.heightMap = gl.getUniformLocation(materialGenerateNormals.program, "u_height_map_texture");
    materialGenerateNormals.location.uniform.slopeStrenth = gl.getUniformLocation(materialGenerateNormals.program, "u_slope_strength");
    materialDepthRenderBuffer.location.texture.heightMap = gl.getUniformLocation(materialDepthRenderBuffer.program, "u_height_map_texture");
    materialDepthRenderBuffer.location.uniform.height_scale = gl.getUniformLocation(materialDepthRenderBuffer.program, "u_height_scale");
    materialAddOne.location.texture.heightMap = gl.getUniformLocation(materialAddOne.program, "u_height_map_texture");
    materialAddOne.location.uniform.height_scale = gl.getUniformLocation(materialAddOne.program, "u_height_scale");

    materialDepthHelper.location.texture.reset = gl.getUniformLocation(materialDepthHelper.program, "u_height_map_texture");  //initial snow height map
    /* height transform */ materialDepthHelper.location.texture.heightMap = gl.getUniformLocation(materialDepthHelper.program, "u_height_map_texture");  //initial snow height map
    /* result height */ materialDepth.location.texture.heightMap = gl.getUniformLocation(materialDepth.program, "u_height_map_texture");        //only at init?
    materialDepth.location.uniform.height_scale = gl.getUniformLocation(materialDepth.program, "u_height_scale");        //only at init?
    gl.useProgram(materialDepth.program);
    gl.uniform1f(materialDepth.location.uniform.height_scale, snow_height_scale);
    // /* useless */ materialDepth.location.texture.normalDetail = gl.getUniformLocation(materialDepth.program, "u_normal_detail_texture");
    //load all images, then create image
    addImage("./height_map.png", (image) => {
        images["height_map"] = image;
        addImage("./color.png", (image) => {
            images["color"] = image;
            addImage("./av53c33f80f8586a07900.png", (image) => {
                images["normal_detail"] = image;
                // TEXTURE id must be unique in program
                // model can have different textures in different programs, even if the location name is the same, but their associated name be different
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
                addTexture(model1InDepthTransform, "reset", new Uint8Array([255, 255, 255, 255]),
                    gl.TEXTURE2, materialDepthHelper.location.texture.reset, gl.RGBA, gl.RGBA, 1, 1, true);   //change to greyscale single channel or double channel normalized height and distance to surface
                addTexture(model1InDepthTransform, "height_transform_framebuffer", null,
                    gl.TEXTURE1, materialDepth.location.texture.heightMap, gl.RGBA, gl.RGBA, textureSize, textureSize, true);   //change to greyscale single channel or double channel normalized height and distance to surface
                gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
                    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textureSize, textureSize)
                gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
                    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, model1.textures["height_map_framebuffer"].texture, 0);

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

                gl.colorMask(false, false, false, false);
                gl.depthFunc(gl.ALWAYS); //overwrite depth buffer here
                initModel(gl, modelFullScreenRenderBuffer, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
                gl.useProgram(materialDepthRenderBuffer.program);
                gl.uniform1f(materialDepthRenderBuffer.location.uniform.height_scale, snow_height_scale);
                gl.bindVertexArray(modelFullScreenRenderBuffer.VAO);
                setTexture(gl, model1InDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialDepthRenderBuffer.location.texture.heightMap);
                gl.drawArrays(gl.TRIANGLES, 0, 6);
                gl.depthFunc(gl.LESS); //overwrite depth buffer here
                gl.colorMask(true, true, true, true );

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
    gl.uniform1f(material1.location.uniform.height_scale, snow_height_scale);
    if (previous_height_scale !== snow_height_scale){    //refresshes render buffer - TODO: refresh render buffer, but make paralax look the same after changing height_scale
        previous_height_scale = snow_height_scale;
        model1.translate(0., -model1.getTranslation()[1], 0);
        model1.translate(0., model1InDepthTransform.getTranslation()[1], 0);
        model1.translate(0, snow_height_scale - 0.01, 0);   // snow is placed height_scale distance from the ground

        gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
        gl.viewport(0, 0, textureSize, textureSize);
        gl.colorMask(false, false, false, false);
        gl.depthFunc(gl.ALWAYS); //overwrite depth buffer
        initModel(gl, modelFullScreenRenderBuffer, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
        gl.uniform1f(materialDepthRenderBuffer.location.uniform.height_scale, snow_height_scale);
        setTexture(gl, model1InDepthTransform.textures["reset"], gl.TEXTURE1, materialDepthRenderBuffer.location.texture.heightMap);
        gl.drawArrays(gl.TRIANGLES, 0, 6);   //reset depth buffer

        gl.colorMask(false, true, true, false); //only update model distance
        gl.depthFunc(gl.LESS); //overwrite fragment distance
        //draw moving actor and model in depth_buffer shader.
        initModel(gl, model1InDepthTransform, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
        setTexture(gl, model1InDepthTransform.textures["height_map"]);
        gl.drawArrays(gl.TRIANGLES, 0, model1InDepthTransform.positions.length / 3); //type, offset, count (position.length/size)
        gl.bindTexture(gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);

        gl.colorMask(false, false, false, false);
        gl.depthFunc(gl.ALWAYS); //overwrite depth buffer
        initModel(gl, modelFullScreenRenderBuffer, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
        setTexture(gl, model1InDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialDepthRenderBuffer.location.texture.heightMap);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.depthFunc(gl.LESS);  //return to defaults
        gl.colorMask(true, true, true, true );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.useProgram(materialDepth.program);
        gl.uniform1f(materialDepth.location.uniform.height_scale, snow_height_scale);
    }

    if (Math.random() > 0.95) {
    // if (Math.random() > 0.) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
        gl.viewport(0, 0, textureSize, textureSize);
        gl.colorMask(true, false, false, false);
        gl.depthFunc(gl.ALWAYS); //overwrite depth buffer here
        gl.useProgram(materialAddOne.program);
        gl.uniform1f(materialAddOne.location.uniform.near, NEAR);
        gl.uniform1f(materialAddOne.location.uniform.far, FAR);
        gl.uniform1f(materialAddOne.location.uniform.height_scale, snow_height_scale);
        gl.bindVertexArray(modelFullScreenAddOne.VAO);
        gl.bindTexture(gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);
        setTexture(gl, model1InDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialAddOne.location.texture.heightMap);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.depthFunc(gl.LESS); //overwrite depth buffer here
        gl.colorMask(true, true, true, true );
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    model2.rotate(0, 0, 0.01);

    model3.rotate(0, 0, 0.18);
    model3.rotate(0, 0.01, 0);
    model3.rotate(0, 0, -0.18);

    modelCapsule.resetTransform();
    modelBootLeft.resetTransform();
    modelBootRight.resetTransform();
    let capsuleDistance = new Vector3(6, 0, 0);
    let bootDistanceLeft = capsuleDistance.clone();
    bootDistanceLeft.scale(1 - 1/capsuleDistance.length());
    let bootDistanceRight = capsuleDistance.clone();
    bootDistanceRight.scale(1 + 1/capsuleDistance.length());
    let boot_height = 1.25;    // the boot model has 1 unit of height
    modelBootLeft.scale(1.6, boot_height, 1.6);
    modelBootRight.scale(1.6, boot_height, 1.6);
    modelBootLeft.rotate(degToRad(180), 0, 0);
    modelBootLeft.rotate(Date.now() / 400, 0, 0);
    modelBootRight.rotate(Date.now() / 400, 0, 0);
    modelBootLeft.translate(...bootDistanceLeft.toArray());
    modelBootRight.translate(...bootDistanceRight.toArray());
    modelBootLeft.translate(0., boot_height - 2 + model1Lambertian.getTranslation()[1], 0.);
    modelBootRight.translate(0., boot_height - 2 + model1Lambertian.getTranslation()[1], 0.);
    modelCapsule.translate(...capsuleDistance.toArray());
    modelCapsule.translate(0, -1.5, 0);
    modelCapsule.rotate(0, -Date.now() / 2000, 0);
    modelBootLeft.rotate(0, -Date.now() / 2000, 0);
    modelBootRight.rotate(0, -Date.now() / 2000, 0);

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
    camera_matrix = math.multiply(translate_mtx(...camera_position.toArray()), camera_matrix);
    let speed = 0.2
    if (keysPressed.indexOf("shift") !== -1) {
        speed *= 0.2;
    }
    if (keysPressed.indexOf("w") !== -1) {
        camera_position.x -= camera_matrix.get([0, 2]) * speed;
        camera_position.y -= camera_matrix.get([1, 2]) * speed;
        camera_position.z -= camera_matrix.get([2, 2]) * speed;
    }
    if (keysPressed.indexOf("s") !== -1) {
        camera_position.x += camera_matrix.get([0, 2]) * speed;
        camera_position.y += camera_matrix.get([1, 2]) * speed;
        camera_position.z += camera_matrix.get([2, 2]) * speed;
    }
    if (keysPressed.indexOf("a") !== -1) {
        camera_position.x -= camera_matrix.get([0, 0]) * speed;
        camera_position.y -= camera_matrix.get([1, 0]) * speed;
        camera_position.z -= camera_matrix.get([2, 0]) * speed;
    }
    if (keysPressed.indexOf("d") !== -1) {
        camera_position.x += camera_matrix.get([0, 0]) * speed;
        camera_position.y += camera_matrix.get([1, 0]) * speed;
        camera_position.z += camera_matrix.get([2, 0]) * speed;
    }

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

    let view_projection = math.multiply(projection_matrix, view_matrix);

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //draw heightMapFB to heightTransformFB
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
    gl.viewport(0, 0, textureSize, textureSize);
    gl.bindRenderbuffer(gl.RENDERBUFFER, rb);
    // gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, rb);

    gl.bindTexture(gl.TEXTURE_2D, model1InDepthTransform.textures["height_transform_framebuffer"].texture)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);

    gl.depthFunc(gl.GREATER);   //we want to find the deepest intersection with snow plane
    gl.disable(gl.CULL_FACE);   //back-face could intersect with snow plane
    // gl.disable(gl.BLEND);       //program uses alpha channel to send data - not for now

    // using heightTransformFB draw agents in depth shader to heightMapFB
    gl.colorMask(true, false, false, false);    //only paralax height is updated - change if geometry has moved
    [
        model2InDepth,
        model3InDepth,
        modelCapsuleInDepth,
        modelBootLeftInDepth,
        modelBootRightInDepth,
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
    gl.uniform1f(materialGenerateNormals.location.uniform.slopeStrenth, textureSize / 7. * snow_height_scale); //good aproximation of slope (picked by eye)
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
        model1Lambertian,
        model2,
        model3,
        modelCapsule,
        modelBootLeft,
        modelBootRight,
        model1,
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
    gl.uniformMatrix4fv(model.material.location.uniform.mvp, true, math.flatten(world_view_projection).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.inv_mvp, true, math.flatten(inverse_world_view_projection).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.world_inv_transpose, false, math.flatten(math.inv(model.model_matrix)).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.camera, true, math.flatten(camera_matrix).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.projection, true, math.flatten(projection_matrix).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.model, true, math.flatten(model.model_matrix).valueOf());
    gl.uniform1f(model.material.location.uniform.near, near);
    gl.uniform1f(model.material.location.uniform.far, far);
}
function defaultState(gl){
    gl.depthFunc(gl.LESS);
    gl.bindFramebuffer(null);
    gl.colorMask(true, true, true, true);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.BLEND);
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
// var rotateX = degToRad(0);
// var rotateY = degToRad(0);
var rotateX = 0.59;
var rotateY = -0.55;
var rotateZ = degToRad(0);
var zoom = 3;
var oldRotateX = rotateX;
var oldRotateY = rotateY;
var mouseState = [0, 0];
var _keysInternalState = [];
var keysPressed = [];
var cameraVector = [0, 0, 0];

// z is smaller -> z is closer

document.getElementById("canvas").addEventListener("mousedown", function (e) {
let canvas = document.getElementById("canvas");
if (e.which == 1) {
    mouseState[0] = 1;
    clickX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    clickY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
} else if (e.which == 3) {
    mouseState[1] = 1;
}
});
document.getElementById("canvas").addEventListener("mousemove", function (e) {
let canvas = document.getElementById("canvas");
if (mouseState[0] == 1) {
    mouseX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    mouseY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
    rotateX = (clickX - mouseX + oldRotateX);
    rotateY = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, (clickY - mouseY + oldRotateY)))
}
});
document.getElementById("canvas").addEventListener("mouseup", function (e) {
if (e.which == 1) {
    mouseState[0] = 0;
    oldRotateX = rotateX
    oldRotateY = rotateY
} else if (e.which == 3) {
    mouseState[1] = 0;
}
});
document.getElementById("canvas").addEventListener("mousewheel", function (e) {
if (e.deltaY > 0 && zoom < 10) {
    zoom += .1;
} else if (e.deltaY < 0 && zoom > 0.11) {
    zoom -= .1;
}
})
let camera_position = new Vector3(0., 0, 0);
window.addEventListener("keydown", function (e) {
    keysPressed.push(e.key.toLowerCase());
    _keysInternalState.push(e.keyCode); // handles shift, alt and control
    if (keysPressed.indexOf("w") !== -1) {

    }
    if (keysPressed.indexOf("r") !== -1) {
        camera_position = new Vector3(0., 0, 0);
    }
})
window.addEventListener("keyup", function (e) {
    let i = _keysInternalState.indexOf(e.keyCode);
    while (i !== -1) {
        keysPressed.splice(i, 1);
        _keysInternalState.splice(i, 1);
        i = _keysInternalState.indexOf(e.keyCode);
    }
})
window.addEventListener("blur", function (e) {  //handles window out of focus (Tab and Alt)
    keysPressed.splice(0, keysPressed.length);
    _keysInternalState.splice(0, _keysInternalState.length);
})

main();