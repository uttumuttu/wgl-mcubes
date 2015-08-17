var rttFramebuffer;
var rttTexture;

function initTextureFramebuffer() {
  rttFramebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);
  rttFramebuffer.width = 512;
  rttFramebuffer.height = 512;

  rttTexture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, rttTexture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(
    gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 
    /*gl.LINEAR_MIPMAP_LINEAR*/ gl.LINEAR);
  //gl.generateMipmap(gl.TEXTURE_2D);
  // TODO: the mipmapping gives an error in the javascript console

  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 
    rttFramebuffer.width, rttFramebuffer.height,
    0, gl.RGBA, gl.UNSIGNED_BYTE, null);

  // create a renderbuffer as the depth buffer
  var renderbuffer = gl.createRenderbuffer();
  gl.bindRenderbuffer(gl.RENDERBUFFER, renderbuffer);
  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16,
    rttFramebuffer.width, rttFramebuffer.height);

  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D, rttTexture, 0);
  gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER, renderbuffer);

  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindRenderbuffer(gl.RENDERBUFFER, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

var colorProgram;
var postprocessProgram;

function createShaderProgram(shaders, attribs) {
  var program = gl.createProgram();

  for(var i in shaders) {
    gl.attachShader(program, getShader(gl, shaders[i]));
  }

  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    alert("Could not initialize shader");
  }

  for(var i in attribs) {
    gl.enableVertexAttribArray(gl.getAttribLocation(
      program, attribs[i]));
  }

  program.setAttribute = function(attrib, buffer) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.vertexAttribPointer(
      gl.getAttribLocation(program, attrib),
      buffer.itemSize, gl.FLOAT, false, 0, 0);
  };

  program.setUniform1i = function(uniform, value) {
    gl.uniform1i(gl.getUniformLocation(program, uniform), value);
  }

  program.setUniform1f = function(uniform, value) {
    gl.uniform1f(gl.getUniformLocation(program, uniform), value);
  }

  return program;
}

function initShaders() {
  colorProgram = createShaderProgram(
    ["color-shader-fs", "color-shader-vs"],
    ["aVertexPosition", "aVertexColor"]);

  postprocessProgram = createShaderProgram(
    ["postprocess-shader-fs", "postprocess-shader-vs"],
    ["aVertexPosition", "aVertexTexcoord"]);
}

var pMatrix = mat4.create();
var mvMatrix = mat4.create();

function setMatrixUniforms(program) {
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "uPMatrix"), false, pMatrix);
  gl.uniformMatrix4fv(
    gl.getUniformLocation(program, "uMVMatrix"), false, mvMatrix);
}

function createBuffer(data, itemSize) {
  buffer = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

  buffer.itemSize = itemSize;
  buffer.numItems = data.length / itemSize;

  return buffer;
}

var positionBuffer;
var colorBuffer;

var postprocessPositionBuffer;
var postprocessTexcoordBuffer;

function initBuffers() {
  positionBuffer = gl.createBuffer();
  positionBuffer.itemSize = 3;

  colorBuffer = gl.createBuffer();
  colorBuffer.itemSize = 4;

  var position = [
    -1.0, -1.0, 0,   1.0, -1.0, 0,
    -1.0,  1.0, 0,   1.0,  1.0, 0];

  var texcoord = [
     0, 0,   1, 0,
     0, 1,   1, 1];

  postprocessPositionBuffer = createBuffer(position, 3);
  postprocessTexcoordBuffer = createBuffer(texcoord, 2);
}

var gTime = 0;

function calcDist(N, dist) {
  var t = gTime * 5;

  var balls = [
    [Math.cos(t*0.123)*0.5, 
     Math.sin(t*0.321)*0.5, 
     Math.cos(t*0.213)*0.5],

    [Math.sin(t*0.532)*0.5, 
     Math.sin(t*0.656)*0.5, 
     Math.cos(t*0.812)*0.5],

    [Math.cos(t*0.256)*0.5, 
     Math.sin(t*0.652)*0.5, 
     Math.sin(t*0.952)*0.5]];

  for(var z=0; z<N; ++z) {
    dist[z] = new Array();
    var pz = ((z+0.5) / N * 2 - 1);

    for(var y=0; y<N; ++y) {
      dist[z][y] = new Array();
      var py = ((y+0.5) / N * 2 - 1);
      var row = dist[z][y];

      for(var x=0; x<N; ++x) {
        var px = ((x+0.5) / N * 2 - 1);
        var d = 0;

        for(var i=0; i<balls.length; ++i) {
          var ball = balls[i];

          var dx = px - ball[0];
          var dy = py - ball[1];
          var dz = pz - ball[2];

          d += 1 / (dx*dx + dy*dy + dz*dz);
        }
        row[x] = d - 11;
      }
    }
  }
}

function renderToTexture() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, rttFramebuffer);

  gl.useProgram(colorProgram);

  var N = document.getElementById('resolution').value;

  var dist = [];

  calcDist(N, dist);

  updateBuffers(N, dist, positionBuffer, colorBuffer);

  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  gl.viewport(0, 0, rttFramebuffer.width, rttFramebuffer.height);

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  mat4.perspective(
    45, rttFramebuffer.width / rttFramebuffer.height, 0.1, 100.0,
    pMatrix);

  mat4.identity(mvMatrix);

  mat4.translate(mvMatrix, [0.0, 0.0, -3.0]);

  // grid-to-world
  mat4.translate(mvMatrix, [-1, -1, -1]);
  mat4.scale(mvMatrix, [2.0/N, 2.0/N, 2.0/N]);
  mat4.translate(mvMatrix, [0.5, 0.5, 0.5]);

  setMatrixUniforms(colorProgram);

  colorProgram.setAttribute("aVertexPosition", positionBuffer);
  colorProgram.setAttribute("aVertexColor", colorBuffer);

  gl.drawArrays(gl.TRIANGLES, 0, positionBuffer.numItems);

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

function drawScene() {
  renderToTexture();

  gl.disable(gl.DEPTH_TEST);

  gl.useProgram(postprocessProgram);

  gl.clearColor(1.0, 0.0, 0.0, 1.0);

  gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, rttTexture);

  var strength = document.getElementById('strength').value;

  postprocessProgram.setUniform1i("uSampler", 0);
  postprocessProgram.setUniform1f("uStrength", strength);
  postprocessProgram.setAttribute("aVertexPosition", postprocessPositionBuffer);
  postprocessProgram.setAttribute("aVertexTexcoord", postprocessTexcoordBuffer);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, postprocessPositionBuffer.numItems);

  gl.bindTexture(gl.TEXTURE_2D, null);

  gl.enable(gl.DEPTH_TEST);
}

var lastTime = 0;

function animate() {
  var timeNow = new Date().getTime();

  if (lastTime != 0) {
    var elapsed = timeNow - lastTime;

    gTime += elapsed / 1000.0;
  }
  lastTime = timeNow;
}

function tick() {
  requestAnimFrame(tick);
  drawScene();
  animate();
}

function webGLStart() {
  var canvas = document.getElementById("demo-canvas");

  initGL(canvas);
  initTextureFramebuffer();
  initShaders();
  initBuffers();

  gl.clearColor(0.0, 0.0, 0.0, 1.0);
  gl.enable(gl.DEPTH_TEST);

  tick();
}
