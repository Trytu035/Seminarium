	//position przechowuje trójk¹ty i koordynaty w formacie: x1, y1, z1, x2, y2, z2, x3, y3, z3, [tutaj zaczyna siê nastêpny trójk¹t] x1, y1, z1, ...
	var positions=[
		-100, 0, -100,
		-100, 0, 100,
		100, 0, 100,
		100, 0, -100,
		-100, 0, -100,
		100, 0, 100,
	];
	//tablica colors przechowuje kolory kolejnych trójk¹tów.
	var colors=[
		194, 139, 112,
		194, 139, 112,
		194, 139, 112,
		194, 139, 112,
		194, 139, 112,
		194, 139, 112,
		194, 139, 112
	];
	var normals=[]
	//mówi od której strony oœwietlany jest obiekt.
	var cameraVector=[0, 0.5, 0.5];
	//poni¿szy kod ustawia prostopad³e dla ka¿dego z trójk¹tów
	for (var i2=0; i2<positions.length /9; i2++){
			// normals[i2*4]=	(positions[(i2+2)*3+1]-positions[(i2+1)*3+1])*(positions[(i2+3)*3+2]-positions[(i2+1)*3+2])	-(positions[(i2+2)*3+2]-positions[(i2+1)*3+2])*(positions[(i2+3)*3+1]-positions[(i2+1)*3+1]);
			// normals[i2*4+1]=(positions[(i2+2)*3+2]-positions[(i2+1)*3+2])*(positions[(i2+3)*3+0]-positions[(i2+1)*3+0])	-(positions[(i2+2)*3+0]-positions[(i2+1)*3+0])*(positions[(i2+3)*3+2]-positions[(i2+1)*3+2]);
			// normals[i2*4+2]=(positions[(i2+2)*3+0]-positions[(i2+1)*3+0])*(positions[(i2+3)*3+1]-positions[(i2+1)*3+1])	-(positions[(i2+2)*3+1]-positions[(i2+1)*3+1])*(positions[(i2+3)*3+0]-positions[(i2+1)*3+0]);
			normals[i2 * 12] = (positions[(i2 * 3 + 2) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]) * (positions[(i2 * 3 + 0) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]) - (positions[(i2 * 3 + 2) * 3 + 2] - positions[(i2 * 3 + 1) * 3 + 2]) * (positions[(i2 * 3 + 0) * 3 + 1] - positions[(i2 * 3 + 1) * 3 + 1]);
		normals[i2*12+1]=(positions[(i2*3+2)*3+2]-positions[(i2*3+1)*3+2])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0])	-(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+2]-positions[(i2*3+1)*3+2]);
		normals[i2*12+2]=(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+1]-positions[(i2*3+1)*3+1])	-(positions[(i2*3+2)*3+1]-positions[(i2*3+1)*3+1])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0]);
		normals[i2*12+3]=Math.acos((normals[i2*12]*cameraVector[0] + normals[i2*12+1]*cameraVector[1] + normals[i2*12+2]*cameraVector[2])/(((normals[i2*12]**2+normals[i2*12+1]**2+normals[i2*12+2]**2)**0.5)*((cameraVector[0]**2+cameraVector[1]**2+cameraVector[2]**2)**0.5)));
		normals[i2*12+4]=(positions[(i2*3+2)*3+1]-positions[(i2*3+1)*3+1])*(positions[(i2*3+0)*3+2]-positions[(i2*3+1)*3+2])	-(positions[(i2*3+2)*3+2]-positions[(i2*3+1)*3+2])*(positions[(i2*3+0)*3+1]-positions[(i2*3+1)*3+1]);
		normals[i2*12+5]=(positions[(i2*3+2)*3+2]-positions[(i2*3+1)*3+2])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0])	-(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+2]-positions[(i2*3+1)*3+2]);
		normals[i2*12+6]=(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+1]-positions[(i2*3+1)*3+1])	-(positions[(i2*3+2)*3+1]-positions[(i2*3+1)*3+1])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0]);
		normals[i2*12+7]=Math.acos((normals[i2*12]*cameraVector[0] + normals[i2*12+1]*cameraVector[1] + normals[i2*12+2]*cameraVector[2])/(((normals[i2*12]**2+normals[i2*12+1]**2+normals[i2*12+2]**2)**0.5)*((cameraVector[0]**2+cameraVector[1]**2+cameraVector[2]**2)**0.5)));
		normals[i2*12+8]=(positions[(i2*3+2)*3+1]-positions[(i2*3+1)*3+1])*(positions[(i2*3+0)*3+2]-positions[(i2*3+1)*3+2])	-(positions[(i2*3+2)*3+2]-positions[(i2*3+1)*3+2])*(positions[(i2*3+0)*3+1]-positions[(i2*3+1)*3+1]);
		normals[i2*12+9]=(positions[(i2*3+2)*3+2]-positions[(i2*3+1)*3+2])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0])	-(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+2]-positions[(i2*3+1)*3+2]);
		normals[i2*12+10]=(positions[(i2*3+2)*3+0]-positions[(i2*3+1)*3+0])*(positions[(i2*3+0)*3+1]-positions[(i2*3+1)*3+1])	-(positions[(i2*3+2)*3+1]-positions[(i2*3+1)*3+1])*(positions[(i2*3+0)*3+0]-positions[(i2*3+1)*3+0]);
		normals[i2*12+11]=Math.acos((normals[i2*12]*cameraVector[0] + normals[i2*12+1]*cameraVector[1] + normals[i2*12+2]*cameraVector[2])/(((normals[i2*12]**2+normals[i2*12+1]**2+normals[i2*12+2]**2)**0.5)*((cameraVector[0]**2+cameraVector[1]**2+cameraVector[2]**2)**0.5)));
	}
	var resolution=1;	//rozdzielczoœæ canvas na którym jest wyœwietlany obraz
	//poni¿sze zmienne s³u¿¹ do obs³ugi zdarzeñ
	var mouseX=0;
	var mouseY=0;
	var clickX=0;
	var clickY=0;
	var rotateX=0;
	var rotateY=0;
	var oldRotateX=0;
	var oldRotateY=0;
	var mouseState=[0, 0];
	var cameraVectors;
	window.addEventListener("mousedown", function(e){
		if (e.which==1){
						mouseState[0] = 1;
					clickX=(e.clientX/c.width*2/3-1)/resolution*5;
					clickY=(-e.clientY/c.height*2/3+1)/resolution*5;
		}else if (e.which==3){
						mouseState[1] = 1;
		}
	});
	window.addEventListener("mousemove", function(e){
		if (mouseState[0]==1){
						mouseX = (e.clientX / c.width * 2 / 3 - 1) / resolution * 5;
					mouseY=(-e.clientY/c.height*2/3+1)/resolution*5;
					rotateX=(clickX-mouseX+oldRotateX);
					rotateY=(clickY-mouseY+oldRotateY);
		}
	});
	window.addEventListener("mouseup", function(e){
		if (e.which==1){
						mouseState[0] = 0;
					oldRotateX=rotateX
					oldRotateY=rotateY
		}else if (e.which==3){
						mouseState[1] = 0;
		}
	});
	//poni¿ej inicjalizacja. kod którego nie powinno siê zmieniaæ

	/** @type {HTMLCanvasElement} */
	var c=document.getElementById("canvas");
	var cc=c.getContext("webgl");
	//var vertexShader=document.getElementById("v-shader").innerHTML;
	//var fragmentShader=document.getElementById("f-shader").innerHTML;
	var vShader=cc.createShader(cc.VERTEX_SHADER);
	var fShader=cc.createShader(cc.FRAGMENT_SHADER);
	cc.shaderSource(vShader, vertexShader);
	cc.shaderSource(fShader, fragmentShader);
	cc.compileShader(vShader);
	cc.compileShader(fShader);
    if (!cc.getShaderParameter(vShader, cc.COMPILE_STATUS)) {
		const info = cc.getShaderInfoLog(vShader);
        throw `Could not compile WebGL program. \n\n${info}`;
    }
    if (!cc.getShaderParameter(fShader, cc.COMPILE_STATUS)) {
		const info = cc.getShaderInfoLog(fShader);
        throw `Could not compile WebGL program. \n\n${info}`;
    }
	console.log(cc.getShaderInfoLog(fShader));
	var program=cc.createProgram();
	cc.attachShader(program, vShader);
	cc.attachShader(program, fShader);
	cc.linkProgram(program);
	console.log(cc.getProgramInfoLog(program));
	var positionAttLocation=cc.getAttribLocation(program, "a_position");
	var colorAttLocation=cc.getAttribLocation(program, "a_color");
	var normalsAttLocation=cc.getAttribLocation(program, "a_normals");

	var mouseUniLocation=cc.getUniformLocation(program, "u_mouse");
	var rotateUniLocation=cc.getUniformLocation(program, "u_rotate");
	var cameraRotationUniLocation=cc.getUniformLocation(program, "u_cameraRotation");
	var disProportionUniLocation=cc.getUniformLocation(program, "u_displayProportion");

	var positionBuffer=cc.createBuffer();
	cc.bindBuffer(cc.ARRAY_BUFFER, positionBuffer);
	cc.bufferData(cc.ARRAY_BUFFER, new Float32Array(positions), cc.STATIC_DRAW);
	var colorBuffer=cc.createBuffer();
	cc.bindBuffer(cc.ARRAY_BUFFER, colorBuffer);
	cc.bufferData(cc.ARRAY_BUFFER, new Uint8Array(colors), cc.STATIC_DRAW);
	var normalsBuffer=cc.createBuffer();
	cc.bindBuffer(cc.ARRAY_BUFFER, normalsBuffer);
	cc.bufferData(cc.ARRAY_BUFFER, new Float32Array(normals), cc.STATIC_DRAW);

	//ustawienia webgl
	c.width=window.innerWidth/resolution;
	c.height=window.innerHeight/resolution;
	cc.viewport(0, 0, c.width, c.height);
	cc.clearColor(0.5, 0.5, 0.5, 1);
	cc.clear(cc.COLOR_BUFFER_BIT);
	cc.enable(cc.CULL_FACE);
	cc.enable(cc.DEPTH_TEST);
	cc.enable(cc.BLEND);
	cc.blendFunc(cc.SRC_ALPHA, cc.ONE_MINUS_SRC_ALPHA);
	cc.useProgram(program);

	cc.enableVertexAttribArray(positionAttLocation);
	cc.bindBuffer(cc.ARRAY_BUFFER, positionBuffer);
	cc.vertexAttribPointer(positionAttLocation, 3, cc.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
	//cc.enableVertexAttribArray(colorAttLocation);
	//cc.bindBuffer(cc.ARRAY_BUFFER, colorBuffer);
	//cc.vertexAttribPointer(colorAttLocation, 3, cc.UNSIGNED_BYTE, 1, 0, 0);//pointer, size, type, normalize, stride, offset
	cc.enableVertexAttribArray(normalsAttLocation);
	cc.bindBuffer(cc.ARRAY_BUFFER, normalsBuffer);
	cc.vertexAttribPointer(normalsAttLocation, 4, cc.FLOAT, 0, 0, 0);//pointer, size, type, normalize, stride, offset
	//g³ówna pêtla
	function loop(){
		c.width = window.innerWidth / resolution;
		c.height=window.innerHeight/resolution;
		cc.viewport(0, 0, c.width, c.height);
		// cc.uniform1f(disProportionUniLocation, c.width/c.height);
		cc.uniform2f(disProportionUniLocation, c.width, c.height);
		cameraVector=[-Math.cos(rotateY-Math.PI/2)*Math.cos(rotateX),
		-Math.sin(rotateY-Math.PI/2)*Math.cos(rotateX),
		-Math.sin(rotateX)];
		/*for (var i2=0; i2<positions.length /3; i2++){
					normals[i2 * 4 + 3] = Math.acos(
						(normals[i2 * 4] * cameraVector[0] + normals[i2 * 4 + 1] * cameraVector[1] + normals[i2 * 4 + 2] * cameraVector[2])
						/ (((normals[i2 * 4] ** 2 + normals[i2 * 4 + 1] ** 2 + normals[i2 * 4 + 2] ** 2) ** 0.5)
							* ((cameraVector[0] ** 2 + cameraVector[1] ** 2 + cameraVector[2] ** 2) ** 0.5))
					);
		}*/
		// console.log(normals[3]);
		// cc.bindBuffer(cc.ARRAY_BUFFER, normalsBuffer);
		cc.bufferData(cc.ARRAY_BUFFER, new Float32Array(normals), cc.STATIC_DRAW);

		cc.uniform2f(mouseUniLocation, mouseX, mouseY);
		cc.uniform2f(rotateUniLocation, rotateX, rotateY);
		cc.uniform3fv(cameraRotationUniLocation, cameraVector);
		//cc.bufferData(cc.ARRAY_BUFFER, new Float32Array(positions), cc.STATIC_DRAW);
		cc.clear(cc.COLOR_BUFFER_BIT | cc.DEPTH_BUFFER_BIT);
		cc.drawArrays(cc.TRIANGLES, 0, positions.length/3); //type, offset, count (position.length/size
		requestAnimationFrame(loop);
	}
	loop()