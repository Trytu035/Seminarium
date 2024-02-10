// noinspection JSSuspiciousNameCombination,TypeScriptUMDGlobal

"use strict";
const NEAR = 0.01;
const FAR = 30.0;
// const textureSize = 2048;
const textureSize = 1024;
// const textureSize = 256;
let snow_height_scale = 1.2;

function main() {
    /** @type {HTMLCanvasElement} */
    let canvas = document.getElementById("canvas"); //canvas
    let gl = canvas.getContext("webgl2");

    init(canvas, gl);   //loop is executed inside init
}

let mouseUniformLocation;

/*class World {
    constructor() {
        this.camera();
    }
}
class Camera {
    constructor(camera_matrix) {
        this.fov = 90;
        this.type; // perspective or orthogonal
        this.camera_matrix = camera_matrix;
        this.view_matrix = math.inv(camera_matrix);
        this.projection_matrix;
        // xyzw - 1/w component controls size of orthogonal camera y
        //        x component * ratio y/x = orthogonal camera x
    }
}*/

let temporaryLocation_1;

function radToDeg(value) {
    return value / Math.PI * 180
}
function degToRad(value) {
    return value / 180 * Math.PI;
}

let startTime = Date.now();
let images = [];

let materialSnow;               // parallax snow
let materialLambertian;         // for rough surface without speculars
let materialDepth;              // depth buffer
let materialSnowDepthInit;      // overwrites depth
let materialDepthRenderBuffer;  // image post processing effect
let materialGenerateNormals;    // image post processing effect
let materialAddOne;             // image post processing effect

let modelFullScreenNormals;
let modelFullScreenRenderBuffer;
let modelFullScreenAddOne;
let modelSnow; //snow
let modelSnowInDepthTransform;
let modelTerrain;
let model2; //agent1
let model2InDepth;
let model3; //agent2
let model3InDepth;
let modelCapsule;   //agent3
let modelCapsuleInDepth;
let modelArmadillo;   //agent3
let modelArmadilloInDepth;
let modelBootLeft;   //agent4
let modelBootLeftInDepth;
let modelBootRight;   //agent5
let modelBootRightInDepth;
let modelsToDraw = [];  // add function to automatically push models to draw and models for deforming snow
let agentsToDraw = [];

let snow_camera_matrix;
let snow_projection_matrix;
let snow_view_matrix;
let snow_view_projection;
let snow_offset;
let previous_height_scale = snow_height_scale;  //check if snow_height_scale has changed

let heightMapFrameBuffer;
let normalFrameBuffer;
let renderBuffer;

function init(canvas, gl) {
    materialSnow = new Material(gl, vertexShaderSnow, fragmentShader);
    materialLambertian = new Material(gl, vertexShader, fragmentShaderLambertian);
    materialDepth = new Material(gl, vertexShader, fragmentShaderDepth);
    materialSnowDepthInit = new Material(gl, vertexShader, fragmentShaderDepthTransform);
    materialDepthRenderBuffer = new Material(gl, vertexShaderNoTransform, fragmentShaderDepthRenderBuffer);
    modelFullScreenRenderBuffer = Model.createFullScreenModel(materialDepthRenderBuffer);
    materialGenerateNormals = new Material(gl, vertexShaderNoTransform, fragmentShaderRenderNormalsFromHeightMap);
    modelFullScreenNormals = Model.createFullScreenModel(materialGenerateNormals);
    materialAddOne = new Material(gl, vertexShaderNoTransform, fragmentShaderAddOne);
    modelFullScreenAddOne = Model.createFullScreenModel(materialAddOne);
    modelSnow = new Model(materialSnow);
    modelTerrain = new Model(materialLambertian);
    modelSnowInDepthTransform = new Model(materialSnowDepthInit);
    // modelTerrain.copyModelInfo(createModelsFromOBJ(capsuleObj, {}, null)[0])
    // modelTerrain.copyModelInfo(createModelsFromOBJ(smoothPlaneObj, {}, null)[0])
    modelTerrain.generateExampleModel();

    model2 = new Model(materialLambertian);
    model2InDepth = new Model(materialDepth);

    model3 = new Model(materialLambertian);
    model3InDepth = new Model(materialDepth);

    modelCapsule = new Model(materialLambertian);
    modelCapsule.copyModelInfo(createModelsFromOBJ(capsuleObj, {}, null)[0]);
    modelCapsuleInDepth = new Model(materialDepth);
    modelCapsuleInDepth.copyModel(modelCapsule);

    modelArmadillo = new Model(materialLambertian);
    modelArmadillo.copyModelInfo(createModelsFromOBJ(armadilloObj, {}, null)[0]);
    modelArmadilloInDepth = new Model(materialDepth);
    modelArmadilloInDepth.copyModel(modelArmadillo);

    modelBootLeft = new Model(materialLambertian);
    modelBootLeft.copyModelInfo(createModelsFromOBJ(bootObj, {}, null)[0]);
    modelBootLeftInDepth = new Model(materialDepth);
    modelBootLeftInDepth.copyModel(modelBootLeft);
    modelBootRight = new Model(materialLambertian);
    modelBootRight.copyModelInfo(createModelsFromOBJ(bootObj, {}, null)[0]);
    modelBootRightInDepth = new Model(materialDepth);
    modelBootRightInDepth.copyModel(modelBootRight);

    let snow_camera_tangent, snow_camera_bitangent, snow_camera_normal, snow_camera_position;
    [
        snow_camera_tangent,
        snow_camera_bitangent,
        snow_camera_position
    ] = [
        new Vector3(1, 0, 0), new Vector3(0, -0.00, 1), new Vector3(0, 6, 0)
       // new Vector3(1, 1, 0), new Vector3(1, -1, -1), new Vector3(0, 0, 4)
       // new Vector3(1, 1, 0), new Vector3(-1, 1, 1), new Vector3(0, 0, -4)
    ];
    snow_camera_normal = snow_camera_tangent.crossProduct(snow_camera_bitangent).normalize();
    snow_camera_matrix = math.identity(4);
    snow_camera_matrix = math.multiply(math.matrixFromColumns(
        [...snow_camera_tangent.toArray(), 0],
        [...snow_camera_bitangent.scale(-1).toArray(), 0],
        [...snow_camera_normal.scale(-1).toArray(), 0],
        [...snow_camera_position.toArray(), 1],
    ), snow_camera_matrix);
    snow_view_matrix = math.inv(snow_camera_matrix);

    {
        model2.generateFace(
            new Vector3(0, 3.1, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            3, 3, 4
        );
        model2.generateFace(
            new Vector3(0, 0.5, 1.1),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            0.5, 0.5, 1
        );
        model3.generateFace(
            new Vector3(0, -1.1, 3.),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            2.5, 2.5, 1
        );
    }
    model3.computeNormals();
    model3InDepth.copyModel(model3);
    model2.computeNormals();
    model2InDepth.copyModel(model2);

    // modelSnow.translate(0, -0.5, 2);
    // modelTerrain.scale(2, 0.6, 3);
    // modelTerrain.rotate(0.2, -0.5, 0.1);
    // modelTerrain.applyTransformMatrix();    // rotate, scale and skew has to be applied for lighting to be correct. The only exception is translation which don't have to be applied.
    modelTerrain.translate(0, -1.5, 0);
    modelTerrain.computeNormals(true);
    modelSnow.copyModel(modelTerrain, false);  // create snow model
    modelSnowInDepthTransform.copyModel(modelSnow);
    snow_offset = new Vector3(...(snow_view_matrix.valueOf()[2].slice(0, 3)));
    snow_offset.scale(snow_height_scale - 0.01);
    modelSnow.translate(...(snow_offset.toArray()));
    // modelSnow.translate(0, 0.5, 0);

    mouseUniformLocation = gl.getUniformLocation(materialSnow.program, "u_mouse");
    // normalDetailTextureLocation = gl.getUniformLocation(materialSnow.program, "u_normal_detail_texture");
    temporaryLocation_1 = gl.getUniformLocation(materialSnow.program, "u_temp_use_the_occlusion");

    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(0.5, 0.5, 0.5, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.CULL_FACE); //turn off for double sided and transparency
    gl.enable(gl.DEPTH_TEST);   //turn off for transparency
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // snow_projection_matrix = orthographic_mtx(-4, 4, -4, 4, NEAR, FAR);
    snow_projection_matrix = orthographic_mtx(-8, 8, -8, 8, NEAR, FAR);
    snow_view_projection = math.multiply(snow_projection_matrix, snow_view_matrix);

    renderBuffer = gl.createRenderbuffer();
    heightMapFrameBuffer = gl.createFramebuffer();
    normalFrameBuffer = gl.createFramebuffer();

    // setup material uniforms
    materialSnow.location.texture.normal = gl.getUniformLocation(materialSnow.program, "u_normal_texture");
    materialSnow.location.texture.color = gl.getUniformLocation(materialSnow.program, "u_color_texture");
    materialSnow.location.texture.heightMap = gl.getUniformLocation(materialSnow.program, "u_height_map_texture");
    // materialSnow.location.texture.normalDetail = gl.getUniformLocation(materialSnow.program, "u_normal_detail_texture");
    materialSnow.location.uniform.snowDirection = gl.getUniformLocation(materialSnow.program, "u_snow_direction");
    materialSnow.location.uniform.height_scale = gl.getUniformLocation(materialSnow.program, "u_height_scale");

    materialGenerateNormals.location.texture.heightMap = gl.getUniformLocation(materialGenerateNormals.program, "u_height_map_texture");
    materialGenerateNormals.location.uniform.slopeStrenth = gl.getUniformLocation(materialGenerateNormals.program, "u_slope_strength");
    materialDepthRenderBuffer.location.texture.heightMap = gl.getUniformLocation(materialDepthRenderBuffer.program, "u_height_map_texture");
    materialDepthRenderBuffer.location.uniform.height_scale = gl.getUniformLocation(materialDepthRenderBuffer.program, "u_height_scale");
    materialAddOne.location.texture.heightMap = gl.getUniformLocation(materialAddOne.program, "u_height_map_texture");
    materialAddOne.location.uniform.height_scale = gl.getUniformLocation(materialAddOne.program, "u_height_scale");

    // materialSnowDepthInit.location.texture.reset = gl.getUniformLocation(materialSnowDepthInit.program, "u_height_map_texture");  // unused - when need to use, use gl.clear instead
    /* height transform */ materialSnowDepthInit.location.texture.heightMap = gl.getUniformLocation(materialSnowDepthInit.program, "u_height_map_texture");  //initial snow height map
    /* result height */ materialDepth.location.texture.heightMap = gl.getUniformLocation(materialDepth.program, "u_height_map_texture");        //only at init?
    materialDepth.location.uniform.height_scale = gl.getUniformLocation(materialDepth.program, "u_height_scale");        //only at init?
    gl.useProgram(materialDepth.program);
    gl.uniform1f(materialDepth.location.uniform.height_scale, snow_height_scale);
    // /* useless */ materialDepth.location.texture.normalDetail = gl.getUniformLocation(materialDepth.program, "u_normal_detail_texture");
    //load all images, then create image
    addImage("./height_map.png", (image) => {
        images["height_map"] = image;
        addImage("./simon-berger-WuVnejweXBw-unsplash.jpg", (image) => { // by Simon Berger from https://unsplash.com/photos/a-close-up-of-a-white-marble-surface-WuVnejweXBw
        // addImage("./color.png", (image) => {
            images["color"] = image;
            addImage("./av53c33f80f8586a07900.png", (image) => {
                images["normal_detail"] = image;
                // TEXTURE id must be unique in program
                // model can have different textures in different programs, even if the location name is the same, but their associated name be different
                addTexture(modelSnow, "normal", null,
                    gl.TEXTURE1, materialSnow.location.texture.normal, gl.RGBA, gl.RGBA, textureSize, textureSize, true);
                addTexture(modelSnow, "color", images["color"],
                    gl.TEXTURE2, materialSnow.location.texture.color, gl.RGBA, gl.RGBA);
                addTexture(modelSnow, "height_map_framebuffer", null,
                    gl.TEXTURE3, materialSnow.location.texture.heightMap, gl.RGBA, gl.RGBA, textureSize, textureSize, true);
                // addTexture(modelSnow, "normal_detail", images["normal_detail"],
                //     gl.TEXTURE4, materialSnow.location.texture.normalDetail, gl.RGBA, gl.RGBA);
                addTexture(modelSnowInDepthTransform, "height_map", images["height_map"],
                    gl.TEXTURE1, materialSnowDepthInit.location.texture.heightMap, gl.RGBA, gl.RGBA);   //change to greyscale single channel or double channel normalized height and distance to surface
                // addTexture(modelSnowInDepthTransform, "reset", new Uint8Array([255, 255, 255, 255]),
                //     gl.TEXTURE2, materialSnowDepthInit.location.texture.reset, gl.RGBA, gl.RGBA, 1, 1, true); // unused - when need to use, use clear instead
                addTexture(modelSnowInDepthTransform, "height_transform_framebuffer", null,
                    gl.TEXTURE1, materialDepth.location.texture.heightMap, gl.RGBA, gl.RGBA, textureSize, textureSize, true);   //change to greyscale single channel or double channel normalized height and distance to surface
                gl.bindRenderbuffer(gl.RENDERBUFFER, renderBuffer);
                    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, textureSize, textureSize)
                gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
                    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, renderBuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, modelSnow.textures["height_map_framebuffer"].texture, 0);

                gl.bindFramebuffer(gl.FRAMEBUFFER, normalFrameBuffer);
                    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, modelSnow.textures["normal"].texture, 0);

                //draw only once heightmap texture into height map frameBuffer

                gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
                gl.viewport(0, 0, textureSize, textureSize);
                //draw snow model in depth_buffer shader.
                overwriteSnowHeightMap(gl, snow_view_projection, snow_camera_matrix, snow_projection_matrix, snow_height_scale);

                modelSnow.material.location.attribute.texcoord_color = gl.getAttribLocation(modelSnow.material.program, "a_texcoord_color");
                modelSnow.material.location.attribute.tangent_color = gl.getAttribLocation(modelSnow.material.program, "a_tangents_color");
                modelSnow.material.location.attribute.bitangent_color = gl.getAttribLocation(modelSnow.material.program, "a_bitangents_color");
                // modelSnow.material.location.attribute.normal_color = gl.getAttribLocation(modelSnow.material.program, "a_normals_color");
                //store texcoords and TBN for color and normal detail textures
                modelSnow.material.location.attribute.color = gl.getAttribLocation(modelSnow.material.program, "a_color");
                modelSnow.color = new Array(modelSnow.positions.length).fill(0).map((val, i) => {
                    if (i % 9 < 3) { return Math.random(); }    // random color for every triangle
                }).map((val, i, arr) => {
                    if (i % 9 < 3) { return val; }
                    else { return arr[i - Math.floor((i % 9) / 3) * 3]; }
                });
                modelSnow.addAttribute(new Float32Array(modelSnow.texcoords), modelSnow.material.location.attribute.texcoord_color, 2);
                modelSnow.addAttribute(new Float32Array(modelSnow.tangents), modelSnow.material.location.attribute.tangent_color, 3);
                modelSnow.addAttribute(new Float32Array(modelSnow.bitangents), modelSnow.material.location.attribute.bitangent_color, 3);
                // /* unused */ modelSnow.addAttribute(new Float32Array(modelSnow.normals), modelSnow.material.location.attribute.normal_color, 3);
                modelSnow.addAttribute(new Float32Array(modelSnow.color), modelSnow.material.location.attribute.color, 3);

                modelSnow.castTextureCoordsFromViewProjection(snow_view_projection);

                loop(canvas, gl);
            });
        });
    })
    // // addTexture(modelSnow, "./circuitry-detail-normal.png", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // // addTexture(modelSnow, "./9749-normal.jpg", gl.TEXTURE4, normalDetailTextureLocation, gl.RGBA, gl.RGBA);
    // addTexture(modelSnow, "./av53c33f80f8586a07900.png", gl.TEXTURE4, materialSnow.location.texture.normalDetail, gl.RGBA, gl.RGBA);
}

function loop(canvas, gl){
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    canvas.width = window.innerWidth / resolution;
    canvas.height = window.innerHeight / resolution;
    let aspect_ratio = canvas.width / canvas.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // gl.bindVertexArray(modelSnow.VAO);
    // gl.uniform2f(mouseUniformLocation, mouseX, mouseY);
    gl.useProgram(materialSnow.program);
    gl.uniform1i(temporaryLocation_1, parseFloat(mouseState[0]));
    gl.uniform1f(materialSnow.location.uniform.height_scale, snow_height_scale);
    if (previous_height_scale !== snow_height_scale){    // refreshes render buffer - TODO: refresh render buffer, but make parallax look the same after changing height_scale
        previous_height_scale = snow_height_scale;
        snow_offset = new Vector3(...(snow_view_matrix.valueOf()[2].slice(0, 3)));
        snow_offset.scale(snow_height_scale - 0.01);
        modelSnow.translate(...math.multiply(modelSnow.getTranslation(), -1).valueOf());
        modelSnow.translate(...(modelSnowInDepthTransform.getTranslation().valueOf()));
        modelSnow.translate(...(modelTerrain.getTranslation().valueOf()));
        modelSnow.translate(...(snow_offset.toArray()));   // snow is placed height_scale distance from the ground

        gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
        gl.viewport(0, 0, textureSize, textureSize);

        gl.colorMask(false, true, true, false); //only update model distance
        //draw snow model in depth_buffer shader.
        overwriteSnowHeightMap(gl, snow_view_projection, snow_camera_matrix, snow_projection_matrix, snow_height_scale);

        gl.useProgram(materialDepth.program);
        gl.uniform1f(materialDepth.location.uniform.height_scale, snow_height_scale);
    }

    if (Math.random() > 1.0) {
    // if (Math.random() > 0.95) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
        gl.viewport(0, 0, textureSize, textureSize);
        gl.colorMask(true, false, false, false);
        gl.depthFunc(gl.ALWAYS);    // overwrite depth buffer
        gl.useProgram(materialAddOne.program);
        gl.uniform1f(materialAddOne.location.uniform.near, NEAR);
        gl.uniform1f(materialAddOne.location.uniform.far, FAR);
        gl.uniform1f(materialAddOne.location.uniform.height_scale, snow_height_scale);
        gl.bindVertexArray(modelFullScreenAddOne.VAO);
        gl.bindTexture(gl.TEXTURE_2D, modelSnowInDepthTransform.textures["height_transform_framebuffer"].texture)
        gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);
        setTexture(gl, modelSnowInDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialAddOne.location.texture.heightMap);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.depthFunc(gl.LESS);
    }

    model2.rotate(0, 0, 0.01);

    model3.rotate(0, 0, 0.18);
    model3.rotate(0, 0.01, 0);
    model3.rotate(0, 0, -0.18);

    modelCapsule.resetTransform();
    modelArmadillo.resetTransform();
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
    modelBootLeft.translate(0., boot_height + modelTerrain.getTranslation()[1], 0.);
    modelBootRight.translate(0., boot_height + modelTerrain.getTranslation()[1], 0.);
    modelArmadillo.rotate(degToRad(90), 0, 0);
    modelArmadillo.scale(0.02, 0.02, 0.02);
    modelArmadillo.translate(0, math.sin((startTime - Date.now()) / 2000) + 0.5, 0);
    modelCapsule.translate(...capsuleDistance.toArray());
    modelCapsule.translate(0, -1., 0);
    modelCapsule.rotate(0, (startTime - Date.now()) / 2000, 0);
    modelBootLeft.rotate(0, (startTime - Date.now()) / 2000, 0);
    modelBootRight.rotate(0, (startTime - Date.now()) / 2000, 0);

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

    //draw heightMapFB to heightTransformFB
    gl.bindFramebuffer(gl.FRAMEBUFFER, heightMapFrameBuffer);
    gl.viewport(0, 0, textureSize, textureSize);

    gl.bindTexture(gl.TEXTURE_2D, modelSnowInDepthTransform.textures["height_transform_framebuffer"].texture)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);

    gl.depthFunc(gl.GREATER);   // we want to find the deepest intersection with snow plane
    gl.disable(gl.CULL_FACE);   // back-face could intersect with snow plane
    // gl.disable(gl.BLEND);       // program uses alpha channel to send data - not for now

    // using heightTransformFB draw agents in depth shader to heightMapFB
    gl.colorMask(true, false, false, false);    // only parallax height is updated - change if geometry has moved
    [
        // model2InDepth,
        // model3InDepth,
        modelCapsuleInDepth,
        modelArmadilloInDepth,
        modelBootLeftInDepth,
        modelBootRightInDepth,
    ].forEach((model) => {
        initModel(gl, model, snow_view_projection, snow_camera_matrix, snow_projection_matrix, NEAR, FAR);
        setTexture(gl, modelSnowInDepthTransform.textures["height_transform_framebuffer"]);
        gl.drawArrays(gl.TRIANGLES, 0, model.positions.length / 3); //type, offset, count (position.length/size)
    })
    gl.depthFunc(gl.LESS);
    gl.enable(gl.CULL_FACE);
    gl.colorMask(true, true, true, true);

    gl.bindFramebuffer(gl.FRAMEBUFFER, normalFrameBuffer);  // generate normals
    gl.useProgram(materialGenerateNormals.program); // draw normals as post processing effect
    setTexture(gl, modelSnow.textures["height_map_framebuffer"], gl.TEXTURE1, materialGenerateNormals.location.texture.heightMap);
    // gl.viewport(0, 0, textureSize, textureSize); // unnecessary - same sized texture
    gl.bindVertexArray(modelFullScreenNormals.VAO);
    gl.uniform1f(materialGenerateNormals.location.uniform.slopeStrenth, textureSize * snow_height_scale);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    gl.useProgram(materialSnow.program);
    gl.uniform3f(materialSnow.location.uniform.snowDirection,
        snow_camera_matrix.get([0, 2]),
        snow_camera_matrix.get([1, 2]),
        snow_camera_matrix.get([2, 2]));
        // -snow_camera_matrix.get([2, 0]),
        // -snow_camera_matrix.get([2, 1]),
        // -snow_camera_matrix.get([2, 2]));

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    [
        modelTerrain,
        modelSnow,
        // model2,
        // model3,
        modelCapsule,
        modelArmadillo,
        modelBootLeft,
        modelBootRight,
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
    let inverse_view_projection = math.inv(view_projection);

    gl.useProgram(model.material.program);
    gl.bindVertexArray(model.VAO);
    gl.uniformMatrix4fv(model.material.location.uniform.mvp, true, math.flatten(world_view_projection).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.inv_view_projection, true, math.flatten(inverse_view_projection).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.world_inv_transpose, false, math.flatten(math.inv(model.model_matrix)).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.camera, true, math.flatten(camera_matrix).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.projection, true, math.flatten(projection_matrix).valueOf());
    gl.uniformMatrix4fv(model.material.location.uniform.model, true, math.flatten(model.model_matrix).valueOf());
    gl.uniform1f(model.material.location.uniform.near, near);
    gl.uniform1f(model.material.location.uniform.far, far);
}

function overwriteSnowHeightMap(gl, view_projection, camera_matrix, projection_matrix, height_scale){
    gl.clear(gl.DEPTH_BUFFER_BIT);  // overwrite depth buffer
    initModel(gl, modelSnowInDepthTransform, view_projection, camera_matrix, projection_matrix, NEAR, FAR);
    setTexture(gl, modelSnowInDepthTransform.textures["height_map"]);
    gl.drawArrays(gl.TRIANGLES, 0, modelSnowInDepthTransform.positions.length / 3); //type, offset, count (position.length/size)
    gl.bindTexture(gl.TEXTURE_2D, modelSnowInDepthTransform.textures["height_transform_framebuffer"].texture)
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, textureSize, textureSize);

    gl.colorMask(false, false, false, false);
    gl.depthFunc(gl.ALWAYS); //overwrite depth buffer
    gl.useProgram(materialDepthRenderBuffer.program);
    gl.bindVertexArray(modelFullScreenRenderBuffer.VAO);
    gl.uniform1f(materialDepthRenderBuffer.location.uniform.near, NEAR);
    gl.uniform1f(materialDepthRenderBuffer.location.uniform.far, FAR);
    gl.uniform1f(materialDepthRenderBuffer.location.uniform.height_scale, height_scale);
    setTexture(gl, modelSnowInDepthTransform.textures["height_transform_framebuffer"], gl.TEXTURE1, materialDepthRenderBuffer.location.texture.heightMap);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.depthFunc(gl.LESS);
    gl.colorMask(true, true, true, true);
}

function defineGlAttribute(name, value) {

}

function changeTexture(gl, textureLocation, id) {
    gl.uniform1i(textureLocation, gl.TEXTURE0 - id - 1);
}

let resolution = 1;	// resolution of canvas on which the image is rendered
// variables below are for event handling
let mouseX = 0;
let mouseY = 0;
let clickX = 0;
let clickY = 0;
// let rotateX = degToRad(0);
// let rotateY = degToRad(0);
let rotateX = 0.59;
let rotateY = -0.55;
let rotateZ = degToRad(0);
let zoom = 3;
let oldRotateX = rotateX;
let oldRotateY = rotateY;
let mouseState = [0, 0];
let _keysInternalState = [];
let keysPressed = [];
let cameraVector = [0, 0, 0];

// z is smaller -> z is closer

document.getElementById("canvas").addEventListener("mousedown", function (e) {
let canvas = document.getElementById("canvas");
if (e.which === 1) {
    mouseState[0] = 1;
    clickX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    clickY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
} else if (e.which === 3) {
    mouseState[1] = 1;
}
});
document.getElementById("canvas").addEventListener("mousemove", function (e) {
let canvas = document.getElementById("canvas");
if (mouseState[0] === 1) {
    mouseX = (e.clientX / canvas.width * 2 / 3 - 1) / resolution * 5;
    mouseY = (-e.clientY / canvas.height * 2 / 3 + 1) / resolution * 5;
    rotateX = (clickX - mouseX + oldRotateX);
    rotateY = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, (clickY - mouseY + oldRotateY)))
}
});
document.getElementById("canvas").addEventListener("mouseup", function (e) {
if (e.which === 1) {
    mouseState[0] = 0;
    oldRotateX = rotateX
    oldRotateY = rotateY
} else if (e.which === 3) {
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
window.addEventListener("blur", function () {  //handles window out of focus (Tab and Alt)
    keysPressed.splice(0, keysPressed.length);
    _keysInternalState.splice(0, _keysInternalState.length);
})

main();