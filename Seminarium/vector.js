class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    normalize() {   //should return new or in_place normalize
        let length = Math.sqrt(this.x * this.x + this.y * this.y);
        this.x /= length;
        this.y /= length;
    }
    add(other) {
        this.x += other.x;
        this.y += other.y;
    }
    length() {
        return Math.sqrt(this.x*this.x + this.y*this.y)
    }
    toArray(){
        return [this.x, this.y];
    }
}

class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    normalize() {   //should return new or in_place normalize
        let length = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
        this.x /= length;
        this.y /= length;
        this.z /= length;
        return this;
    }
    toArray() {
        return [this.x, this.y, this.z];
    }
    crossProduct(other){
        return new Vector3(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x,
        )
    }
    add(other) {
        this.x += other.x;
        this.y += other.y;
        this.z += other.z;
    }
    length() {
        return Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z)
    }
}

// math.matrix
//for matrices 4x4
//
function translate_mtx(x, y, z) {
    return math.matrixFromColumns(
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [x, y, z, 1]
    );
}

function scale_mtx(x, y, z) {
    return math.matrixFromColumns(
        [x, 0, 0, 0],
        [0, y, 0, 0],
        [0, 0, z, 0],
        [0, 0, 0, 1]
    );
}

function rotate_x_mtx(angle) {
    return math.matrixFromColumns(
        [1.0,   0.0,                0.0,                0.0],
        [0.0,   Math.cos(angle),    Math.sin(angle),    0.0],
        [0.0,   -Math.sin(angle),   Math.cos(angle),    0.0],
        [0.0,   0.0,                0.0,                1.0]
    );
}

function rotate_y_mtx(angle) {
    return math.matrixFromColumns(
        [Math.cos(angle),   0.0,    -Math.sin(angle),   0.0],
        [0.0,	            1.0,    0.0,	            0.0],
        [Math.sin(angle),   0.0,    Math.cos(angle),    0.0],
        [0.0,	            0.0,    0.0,	            1.0]
    );
}
function rotate_z_mtx(angle) {
    return math.matrixFromColumns(
        [Math.cos(angle),   Math.sin(angle),	0.0,	0.0],
        [-Math.sin(angle),  Math.cos(angle),	0.0,	0.0],
        [0.0,		        0.0,	            1.0,	0.0],
        [0.0,		        0.0,	            0.0,	1.0]
    );
}

function normalize_vec(array) {
    return math.divide(array,
        math.sqrt(
            math.dot(array, array)
        )
    );
}

function perspective_mtx(fieldOfViewInRadians, near, far, aspect_ratio) {
    // let fovFactor = Math.tan(degToRad(90.0) - 0.5 * fieldOfViewInRadians);
    // let range_invariant = 1.0 / (near - far);
    // return math.matrixFromColumns(
    //     [fovFactor / aspect_ratio,	0,			0,									0],
    //     [0,							fovFactor,	0,									0],
    //     [0,							0,			(near + far) * range_invariant,	    -1],
    //     [0,							0,			near * far * range_invariant * 2.,	0]
    // );

    //https://cseweb.ucsd.edu/classes/wi18/cse167-a/lec4.pdf
    let fovFactor = Math.tan(0.5 * fieldOfViewInRadians);
    let range_invariant = 1.0 / (near - far);
    return math.matrixFromColumns(
        [1 / (aspect_ratio* fovFactor)  ,	0,			0,									0],
        [0,							1 / fovFactor,	0,									0],
        [0,							0,			(near + far) * range_invariant,	    -1],
        [0,							0,			near * far * range_invariant * 2.,	0]
    );
}

function orthographic_mtx(left, right, bottom, top, near, far) {
    return math.matrixFromColumns(
        [2 / (right - left),              0,                               0,                           0],
        [0,                               2 / (top - bottom),              0,                           0],
        [0,                               0,                               2 / (near - far),            0],
        [(left + right) / (left - right), (bottom + top) / (bottom - top), (near + far) / (near - far), 1],
    );
}