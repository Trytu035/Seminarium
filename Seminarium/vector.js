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
    }
    toArray() {
        return [this.x, this.y, this.z];
    }
    crossProduct(other){
        return new Vector3(
            this.y * oter.z - this.z * other.y,
            this.z * oter.x - this.x * other.z,
            this.x * oter.y - this.y * other.x,
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