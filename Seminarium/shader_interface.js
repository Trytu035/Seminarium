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
        this.VAO = material.gl.createVertexArray(); //vertex attribute object
        this.textures = [];
        // this.images = [];
        this.clones = [];   //list of clones which are copies of this model (mirrors it)
        // this.attributeLocation;
        // this.computeNormals();
    }

    static createFullScreenModel(material) {  //default model for image processing
        let fullScreenModel = new Model(material);
        let gl = fullScreenModel.material.gl;

        fullScreenModel.positions = [-1, 1, -1,-1,  1,-1, -1, 1,  1,-1,  1, 1];
        fullScreenModel.texcoords = [ 0, 1,  0, 0,  1, 0,  0, 1,  1, 0,  1, 1];

        gl.bindVertexArray(fullScreenModel.VAO);
        let positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fullScreenModel.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(material.location.attribute.position);
        gl.vertexAttribPointer(material.location.attribute.position, 2, gl.FLOAT, 0, 0, 0);
        let textureBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, textureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(fullScreenModel.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(material.location.attribute.texcoord);
        gl.vertexAttribPointer(material.location.attribute.texcoord, 2, gl.FLOAT, 0, 0, 0);

        return fullScreenModel;
    }

    translate(x, y, z) {
        this.model_matrix = math.multiply(math.matrixFromColumns(
            [1, 0, 0, 0],
            [0, 1, 0, 0],
            [0, 0, 1, 0],
            [x, y, z, 1]
        ), this.model_matrix);
        this.broadcastMatrixToClones();
    }

    scale(x, y, z) {
        this.model_matrix = math.multiply(math.matrixFromColumns(
            [x, 0, 0, 0],
            [0, y, 0, 0],
            [0, 0, z, 0],
            [0, 0, 0, 1]
        ), this.model_matrix);
        this.broadcastMatrixToClones();
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
        this.broadcastMatrixToClones();
    }

    resetTransform() {
        this.model_matrix = math.identity(4);
        this.broadcastMatrixToClones();
    }

    getTranslation() {
        return math.transpose(this.model_matrix).valueOf()[3];
    }

    init() {
        this.material.gl.bindVertexArray(this.VAO);
    }

    addAttribute(data_array, location, size) {
        let gl = this.material.gl;
        gl.bindVertexArray(this.VAO);
        let buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data_array), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, size, gl.FLOAT, 0, 0, 0);
    }

    flatNormals(positions, texcoords) {
        for (let i2 = 0; i2 < positions.length / 9; i2++) { //i2 repeat for each triangle //divide by 3 coordinates, 3 vertices in triangle,
            let edge1 = new Vector3( positions[(i2*3 + 1)*3],  positions[(i2*3 + 1)*3 + 1],  positions[(i2*3 + 1)*3 + 2]);
            edge1.add(  new Vector3(-positions[(i2*3    )*3], -positions[(i2*3    )*3 + 1], -positions[(i2*3    )*3 + 2]));
            let edge2 = new Vector3( positions[(i2*3 + 2)*3],  positions[(i2*3 + 2)*3 + 1],  positions[(i2*3 + 2)*3 + 2]);
            edge2.add(  new Vector3(-positions[(i2*3    )*3], -positions[(i2*3    )*3 + 1], -positions[(i2*3    )*3 + 2]));
            let deltaUV1 = new Vector2( texcoords[(i2*3 + 1)*2],  texcoords[(i2*3 + 1)*2 + 1]);
            deltaUV1.add(  new Vector2(-texcoords[(i2*3    )*2], -texcoords[(i2*3    )*2 + 1]));
            let deltaUV2 = new Vector2( texcoords[(i2*3 + 2)*2],  texcoords[(i2*3 + 2)*2 + 1]);
            deltaUV2.add(  new Vector2(-texcoords[(i2*3    )*2], -texcoords[(i2*3    )*2 + 1]));

            let f = 1.0 / (deltaUV1.x * deltaUV2.y - deltaUV2.x * deltaUV1.y);
            // https://learnopengl.com/Advanced-Lighting/Normal-Mapping
            for (let i = 0; i < 3; i++) {   //repeat for each vertex in a triangle
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
            }
        }
        // for (let i = 0; i < this.tangents.length; i+=3) {
            // console.log("tangent: " + this.tangents[i] + ", " + this.tangents[i + 1] + ", " + this.tangents[i + 2]);
            // console.log("bitangent: " + this.bitangents[i] + ", " + this.bitangents[i + 1] + ", " + this.bitangents[i + 2]);
            // console.log("normal: " + this.normals[i] + ", " + this.normals[i + 1] + ", " + this.normals[i + 2]);
        // }
    }

    computeNormals(isSmoothNormals) {
        if (isSmoothNormals !== undefined && isSmoothNormals !== false && isSmoothNormals !== null && this.model_object !== undefined) {
            let temp = smoothNormals(this.model_object.all_vertices, this.model_object.all_texture_coords, this.model_object.all_triangles);
            this.tangents = Array.from(temp[0]);
            this.bitangents = Array.from(temp[1]);
            this.normals = Array.from(temp[2]);
        } else
        {
            this.flatNormals(this.positions, this.texcoords);
        }
        let gl = this.material.gl;

        gl.bindVertexArray(this.VAO);
        let positionsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.position);
        gl.vertexAttribPointer(this.material.location.attribute.position, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let texcoordsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.texcoord);
        gl.vertexAttribPointer(this.material.location.attribute.texcoord, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let tangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.tangent);
        gl.vertexAttribPointer(this.material.location.attribute.tangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let bitangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.bitangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.bitangent);
        gl.vertexAttribPointer(this.material.location.attribute.bitangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.normal);
        gl.vertexAttribPointer(this.material.location.attribute.normal, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    }

    applyTransformMatrix() {    // If this function is going to be used, you can use copyModel only after this function is applied.
        for (let i = 0; i < this.positions.length / 3; i++){
            let transformedPosition = math.multiply(
                this.model_matrix,
                math.matrix([this.positions[i*3], this.positions[i*3+1], this.positions[i*3+2], 1])
            )
            this.positions[i*3] = transformedPosition.get([0]);
            this.positions[i*3 + 1] = transformedPosition.get([1]);
            this.positions[i*3 + 2] = transformedPosition.get([2]);
        }
        if (this.model_object !== undefined && this.model_object !== null) {
            for (let i = 1; i < this.model_object.all_vertices.length; i++) {
                let transformedPosition = math.multiply(
                    this.model_matrix,
                    math.matrix([
                        this.model_object.all_vertices[i][0],
                        this.model_object.all_vertices[i][1],
                        this.model_object.all_vertices[i][2],
                        1
                    ])
                )
                if (this.model_object) {
                    this.model_object.all_vertices[i][0] = transformedPosition.get([0]);
                    this.model_object.all_vertices[i][1] = transformedPosition.get([1]);
                    this.model_object.all_vertices[i][2] = transformedPosition.get([2]);
                }
            }
        }
        this.model_matrix = math.identity(4);
    }

    copyModel(other, trace) {   //copies data from other model to this model (should be used after flat normals are computed), or computeNormals would need to be called afterwards)
        let gl = this.material.gl;
        this.model_matrix = other.model_matrix;
        this.positions = other.positions;
        this.texcoords = other.texcoords;
        this.normals = other.normals;
        this.tangents = other.tangents;
        this.bitangents = other.bitangents;
        gl.bindVertexArray(this.VAO);
        let positionsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.positions), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.position);
        gl.vertexAttribPointer(this.material.location.attribute.position, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let texcoordsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.texcoords), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.texcoord);
        gl.vertexAttribPointer(this.material.location.attribute.texcoord, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let tangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.tangent);
        gl.vertexAttribPointer(this.material.location.attribute.tangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let bitangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.bitangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.bitangent);
        gl.vertexAttribPointer(this.material.location.attribute.bitangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.normals), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.normal);
        gl.vertexAttribPointer(this.material.location.attribute.normal, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset

        if (trace === null || trace === undefined || trace === true) {    //default - copy of the object will copy it's movement
            other.clones.push(this);    //the original will copy it's properties to all copies;
        }
    }

    castTextureCoordsFromViewProjection(viewProjection) {
        this.material.gl.bindVertexArray(this.VAO);
        let MVP = math.multiply(viewProjection, this.model_matrix);
        for (let i = 0; i < this.texcoords.length / 2; i++) {
            let position = math.matrix(
                [this.positions[i*3], this.positions[i*3 + 1], this.positions[i*3 + 2], 1.0]
            );
            let texcoord = math.multiply(MVP, position);
            this.texcoords[i*2] = texcoord.get([0]) / 2 + 0.5;
            this.texcoords[i*2 + 1] = texcoord.get([1]) / 2 + 0.5;
        }
        if (this.model_object !== undefined && this.model_object !== null) {
            let used = [];
            for (let i = 0; i < this.model_object.all_triangles.length; i++) {
                for (let i2 = 0; i2 < this.model_object.all_triangles[i].length; i2++) {
                    let index = this.model_object.all_triangles[i][i2];
                    if (used.indexOf(index[1]) < 0) {
                        used.push(index[1]);
                        let position = math.matrix([
                            this.model_object.all_vertices[index[0]][0],
                            this.model_object.all_vertices[index[0]][1],
                            this.model_object.all_vertices[index[0]][2],
                            1.0
                        ]);
                        let texcoord = math.multiply(MVP, position);
                        this.model_object.all_texture_coords[index[1]][0] = texcoord.get([0]) / 2 + 0.5;
                        this.model_object.all_texture_coords[index[1]][1] = texcoord.get([1]) / 2 + 0.5;
                    }
                }
            }
            this.computeNormals(true);
        } else {
            console.log("casting flat normals - only objects generated by obj_to_arrays.js will have smooth normals");
            this.computeNormals(false);
        }
    }

    copyModelInfo(modelInfo) {
        this.model_object = modelInfo;
        this.copyModelFromOBJInfo(modelInfo.triangles);
    }

    copyModelFromOBJInfo(model) {
        let gl = this.material.gl;
        this.flatNormals(Array.from(model.vertices), Array.from(model.textures));
        this.normals = Array.from(model.smooth_normals);
        this.positions = Array.from(model.vertices);
        this.texcoords = Array.from(model.textures);

        gl.bindVertexArray(this.VAO);
        let positionsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.vertices, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.position);
        gl.vertexAttribPointer(this.material.location.attribute.position, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let texcoordsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texcoordsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, model.textures, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.texcoord);
        gl.vertexAttribPointer(this.material.location.attribute.texcoord, 2, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let tangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, tangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.tangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.tangent);
        gl.vertexAttribPointer(this.material.location.attribute.tangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let bitangentsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, bitangentsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.bitangents), gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.bitangent);
        gl.vertexAttribPointer(this.material.location.attribute.bitangent, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
        let normalsBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalsBuffer);
        gl.bufferData(gl.ARRAY_BUFFER,model.smooth_normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(this.material.location.attribute.normal);
        gl.vertexAttribPointer(this.material.location.attribute.normal, 3, gl.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
    }


    broadcastMatrixToClones() {
        // console.log(this.clones);
        this.clones.forEach((clone) => {
            clone.model_matrix = this.model_matrix;
        });
    }

    draw() {

    }

    generateFace(position, tangent, bitangent, size_x, size_y, scale=1, swap_xy = 0, invert_normal = 0) {
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
        this.positions.push(...P1.toArray());
        this.positions.push(...P2.toArray());
        this.positions.push(...P3.toArray());
        this.positions.push(...P1.toArray());
        this.positions.push(...P3.toArray());
        this.positions.push(...P4.toArray());
        size_x *= 2;    //space from -tangent to +tangent is 2*tangent, so texcoord needs to be multiplied to make it height-consistent
        size_y *= 2;
        if (swap_xy) {
            this.texcoords.push(
                size_y * scale, 0      * scale,
                0      * scale, 0      * scale,
                0      * scale, size_x * scale,
                size_y * scale, 0      * scale,
                0      * scale, size_x * scale,
                size_y * scale, size_x * scale,
            );
        } else {
            this.texcoords.push(
                0      * scale, size_y * scale,
                0      * scale, 0      * scale,
                size_x * scale, 0      * scale,
                0      * scale, size_y * scale,
                size_x * scale, 0      * scale,
                size_x * scale, size_y * scale,
            );
            // this.texcoords.push(
            //     -size_x* scale, size_y * scale,
            //     -size_x* scale, -size_y* scale,
            //     size_x * scale, -size_y* scale,
            //     -size_x* scale, size_y * scale,
            //     size_x * scale, -size_y* scale,
            //     size_x * scale, size_y * scale,
            // );
        }
    }

    generateExampleModel(){
        // this.generateFace(   // Z face above cube
        //     new Vector3(0, 4, 0),
        //     new Vector3(1, 0, 0), new Vector3(0, 1, 0),
        //     2, 2, 4
        // );
        // this.generateFace(   // Y face above cube
        //     new Vector3(0, 4, 0),
        //     new Vector3(1, 0, 0), new Vector3(0, 0, -1),
        //     2, 2, 0.5
        //     // 2, 2, 1
        // );
        this.generateFace(   // Y face (middle) bottom
            new Vector3(0, 0, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            2, 2, 1
        );
        this.generateFace(   //Z face back
            new Vector3(0, 1, -1),
            new Vector3(-1, 0, 0), new Vector3(0, 1, 0),
            4, 4, 1
            // texcoords, new Vector3(0, 1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        this.generateFace(   //X face back
            new Vector3(-1, 1, 0),
            new Vector3(0, 0, 1), new Vector3(0, 1, 0), //inversed
            2, 2, 1
        );
        this.generateFace(   //Z face front
            new Vector3(0, 1, 1),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            2, 2, 1
            // texcoords, new Vector3(0, -1, 0), new Vector3(1, 0, 0),
            // 2, -2, 1, 1
        );
        // this.generateFace(   // Z_X diagonal face side-right
        //     new Vector3(2, 1, 0),
        //     new Vector3(1, 0, -1).normalize(), new Vector3(0, 1, 0),
        //     2*Math.sqrt(2), 2, 1
        // );
        this.generateFace(   //X face front
            new Vector3(1, 1, 0),
            new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            2, 2, 1
        );

        this.generateFace(   // Y face
            new Vector3(2, 0, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, -1),
            20, 20
        );

        this.generateFace(
            new Vector3(-2, 0, 0),
            new Vector3(1, 1, 1), new Vector3(1, 1, -1),
            2, 4
        );

        // this.generateFace(
        //     new Vector3(1, -0.3, 0),
        //     new Vector3(1, -0.5, -1), new Vector3(-1, 0, -1),
        //     6, 6
        // );

        //bounding box
        /*this.generateFace(   // X face right inside
            new Vector3(15, 0, 0),
            new Vector3(0, 0, 1), new Vector3(0, 1, 0),
            40, 40
        );
        this.generateFace(   // X face left inside
            new Vector3(-15, 0, 0),
            new Vector3(0, 0, -1), new Vector3(0, 1, 0),
            40, 40
        );
        this.generateFace(   // Y face top inside
            new Vector3(0, 15, 0),
            new Vector3(1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        this.generateFace(   // Y face bottom inside
            new Vector3(0, -15, 0),
            new Vector3(-1, 0, 0), new Vector3(0, 0, 1),
            40, 40
        );
        this.generateFace(   // Z face close inside
            new Vector3(0, 0, 15),
            new Vector3(1, 0, 0), new Vector3(0, -1, 0),
            40, 40
        );
        this.generateFace(   // Z face far inside
            new Vector3(0, 0, -15),
            new Vector3(1, 0, 0), new Vector3(0, 1, 0),
            40, 40
        );*/
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

    if (typeof source === typeof new Image()) {
        image = source;
        callback();
        return image;
    }
    image.src = source;
    image.addEventListener('load', () => { callback(image) });
}

//add Texture to model
function addTexture(model, name, image, id, textureLocation, internalFormat, format, sizeX, sizeY, isNearest, callback) {
    let gl = model.material.gl;
    let texture = gl.createTexture();

    gl.bindVertexArray(model.VAO);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // if (internalFormat == gl.RGBA16F) {
        // gl.getExtension('OES_texture_float');        // just in case
        // gl.getExtension('EXT_color_buffer_float');   // for rendering into framebuffers
        // gl.getExtension('OES_texture_float_linear'); // for linear MIN_FILTER
    // }
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_NEAREST);
    // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST_MIPMAP_LINEAR);
    if (isNearest === true) {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    // callback(); //additional options
    if (sizeX && sizeY) {
        switch (internalFormat) {
            case gl.RGBA16F:
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sizeX, sizeY, 0, format, gl.FLOAT, image);
                break;
            case gl.RGBA16UI:
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sizeX, sizeY, 0, format, gl.UNSIGNED_SHORT, image);
                break;
            default:
                gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, sizeX, sizeY, 0, format, gl.UNSIGNED_BYTE, image);
        }
    } else {
        gl.texImage2D(gl.TEXTURE_2D, 0, internalFormat, format, gl.UNSIGNED_BYTE, image);
    }

    if (internalFormat != gl.RGBA16F && internalFormat != gl.RGBA16UI) {
        gl.generateMipmap(gl.TEXTURE_2D);
    }
    model.textures[name] = { texture: texture, id: id, location: textureLocation };
}

function setTexture(gl, textureInfo, id, location) {
    let textureId;
    let textureLocation;

    if (id !== undefined && id !== null) {
        textureId = id;
    } else {
        textureId = textureInfo.id;
    }
    if (location !== undefined && location !== null) {
        textureLocation = location;
    } else {
        textureLocation = textureInfo.location;
    }
    gl.activeTexture(textureId);
    gl.bindTexture(gl.TEXTURE_2D, textureInfo.texture);
    gl.uniform1i(textureLocation, textureId - gl.TEXTURE0);
}