var vertexShader =
`
	attribute vec4 a_position;
	//attribute vec3 a_color;
	attribute vec3 a_tangents;
	attribute vec3 a_bitangents;
	attribute vec3 a_normals;
attribute vec2 a_texcoord;
varying vec2 v_texcoord;
	varying vec4 v_fColor;
	varying vec3 v_fNormals;
	uniform vec2 u_mouse;
	uniform vec2 u_rotate;
	uniform vec3 u_cameraRotation;  //useless
	uniform vec2 u_displayProportion;
	uniform float u_distance;
	varying float v_distance;
	varying vec4 v_position;
	varying mat4 v_model_matrix;
	varying float v_normalToCamera;
	varying vec3 v_cameraRotation;  //useless
	varying mat3 v_TBN;
	
	uniform int u_temp_use_the_oclussion;  //sometimes usable
	varying float v_temp_use_the_oclussion;

	void main(){
    	// v_model_matrix = mat4(1);
    	v_temp_use_the_oclussion = float(u_temp_use_the_oclussion);
		v_texcoord = a_texcoord;
		v_position = a_position;
		v_TBN = mat3(a_tangents, a_bitangents, a_normals);

		vec3 rotate = vec3(u_rotate.yx, 0.0);

		float angle = rotate.x;
		mat4 rotx_matrix = mat4(
			1.0,		0.0,		0.0,		0.0, 
			0.0,		cos(angle),	sin(angle),	0.0,
			0.0,		-sin(angle),cos(angle),	0.0,
			0.0,		0.0,		0.0,		1.0
		);

		angle = rotate.y;
		mat4 roty_matrix = mat4(
			cos(angle),	0.0,		-sin(angle),0.0,
			0.0,		1.0,		0.0,		0.0, 
			sin(angle),	0.0,		cos(angle),	0.0,
			0.0,		0.0,		0.0,		1.0
		);

		angle = rotate.z;
		mat4 rotz_matrix = mat4(
			cos(angle),	sin(angle),	0.0,		0.0,
			-sin(angle),cos(angle),	0.0,		0.0,
			0.0,		0.0,		1.0,		0.0, 
			0.0,		0.0,		0.0,		1.0
		);
		
		mat4 rot_matrix = rotx_matrix * roty_matrix * rotz_matrix;
		v_model_matrix = rot_matrix;
		vec4 result = rot_matrix * a_position;

		v_distance = u_distance;
		//v_fColor = vec4(a_color, 1);
		v_fColor = vec4(0.6, 0.6, 0.6, 1);
		v_normalToCamera = 1.0 - acos(
			dot(normalize(a_normals), u_cameraRotation)
		);
		v_cameraRotation = u_cameraRotation;
		v_fNormals = a_normals;
		
//https://webglfundamentals.org/webgl/lessons/webgl-3d-orthographic.html
//https://learnopengl.com/Advanced-Lighting/Normal-Mapping
        
		gl_Position=vec4(
			result.xy / u_displayProportion*u_displayProportion.y, result.z/1000., v_distance + result.z//, 0.0, 2.0
        );
	}`

var old3vertexShader = `
	attribute vec4 a_position;
	//attribute vec3 a_color;
	attribute vec4 a_normals;
	varying vec4 v_fColor;
	varying vec4 v_fNormals;
	uniform vec2 u_mouse;
	uniform vec2 u_rotate;
	uniform vec3 u_cameraRotation;
	uniform vec2 u_displayProportion;
	varying float v_distance;
	varying float v_normalToCamera;
	void main(){
		
		v_distance = 400.0;
		//v_fColor = vec4(a_color, 1);
		v_fColor = vec4(0.3, 0.9, 0.9, 1);
		v_normalToCamera = 1.0 - acos(
			dot(a_normals.xyz, u_cameraRotation) / (length(a_normals.xyz)*length(u_cameraRotation))
		);
		v_fNormals = a_normals;
		gl_Position=vec4(
			600.0*((a_position.y*cos(u_rotate.y) - a_position.x*sin(u_rotate.y))*sin(u_rotate.x) + a_position.z*cos(u_rotate.x))/u_displayProportion.x,// + mouse.x,
			600.0*(a_position.x*cos(u_rotate.y) + a_position.y*sin(u_rotate.y))/u_displayProportion.y,//+mouse.y,
			0.0 + ((a_position.y*cos(u_rotate.y) - a_position.x*sin(u_rotate.y))*cos(u_rotate.x) - a_position.z*sin(u_rotate.x))/1000.0,
			v_distance + (a_position.y*cos(u_rotate.y) - a_position.x*sin(u_rotate.y))*cos(u_rotate.x) - a_position.z*sin(u_rotate.x)
			
			// 600.0*(position.x*cos(rotate.x)+position.y*sin(rotate.x))/displayProportion.x,//+mouse.x,
			// 600.0*((position.y*cos(rotate.x)-position.x*sin(rotate.x))*sin(rotate.y)+position.z*cos(rotate.y))/displayProportion.y,//+mouse.y,
			// 0.0+((position.y*cos(rotate.x)-position.x*sin(rotate.x))*cos(rotate.y)-position.z*sin(rotate.y))/1000.0,
			// distance+(position.y*cos(rotate.x)-position.x*sin(rotate.x))*cos(rotate.y)-position.z*sin(rotate.y)
			
			);
	}`
var old2vertexShader = `
	attribute vec4 position;
	attribute vec3 color;
	attribute vec4 normals;
	varying vec4 fColor;
	varying vec4 fNormals;
	uniform vec2 mouse;
	uniform vec2 rotate;
	uniform vec3 cameraRotation;
	uniform vec2 displayProportion;
	varying float distance;
	varying float normalToCamera;
	void main(){

		distance = 400.0;
		fColor=vec4(color, 1);
		normalToCamera=1.0-acos(
		(normals.x*cameraRotation.x + normals.y*cameraRotation.y + normals.z*cameraRotation.z)
		/(sqrt(normals.x*normals.x+normals.y*normals.y+normals.z*normals.z)
		*sqrt(cameraRotation.x*cameraRotation.x+cameraRotation.y*cameraRotation.y+cameraRotation.z*cameraRotation.z))
		);
		fNormals=normals;
		gl_Position=vec4(

		600.0*((position.y*cos(rotate.y)-position.x*sin(rotate.y))*sin(rotate.x)+position.z*cos(rotate.x))/displayProportion.x,//+mouse.x,
		600.0*(position.x*cos(rotate.y)+position.y*sin(rotate.y))/displayProportion.y,//+mouse.y,
		0.0+((position.y*cos(rotate.y)-position.x*sin(rotate.y))*cos(rotate.x)-position.z*sin(rotate.x))/1000.0,
		distance+(position.y*cos(rotate.y)-position.x*sin(rotate.y))*cos(rotate.x)-position.z*sin(rotate.x)
			
			// 600.0*(position.x*cos(rotate.x)+position.y*sin(rotate.x))/displayProportion.x,//+mouse.x,
			// 600.0*((position.y*cos(rotate.x)-position.x*sin(rotate.x))*sin(rotate.y)+position.z*cos(rotate.y))/displayProportion.y,//+mouse.y,
			// 0.0+((position.y*cos(rotate.x)-position.x*sin(rotate.x))*cos(rotate.y)-position.z*sin(rotate.y))/1000.0,
			// distance+(position.y*cos(rotate.x)-position.x*sin(rotate.x))*cos(rotate.y)-position.z*sin(rotate.y)
			
			);
	}`
var oldVertexShader = `
attribute vec2 a_position;

//uniform vec2 u_resolution;

varying vec2 v_position;

void main() {
	v_position = a_position;
   // convert the rectangle from pixels to 0.0 to 1.0
   vec2 zeroToOne = a_position / 1.0;//u_resolution;

   // convert from 0->1 to 0->2
   vec2 zeroToTwo = zeroToOne * 2.0;

   // convert from 0->2 to -1->+1 (clipspace)
   vec2 clipSpace = zeroToTwo - 1.0;

   gl_Position = vec4(clipSpace * vec2(1, 1), 0, 1);
   //gl_Position = vec4(0., 0., 0., 1);
   //gl_Position = vec4(gl_Vec;
}
`


