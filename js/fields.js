/** 
 * Operations on isosurface fields.
 */

function calcGrad(N, f, grad) {
  var M = N-1;

  var h = 2.0 / N;    // grid sizing
  var n1 = 1 / h;     // denominators (boundary and nonboundary)
  var n2 = 1 / (2*h);

  for(var z=0; z<N; ++z) {
    grad[z] = [];

    for(var y=0; y<N; ++y) {
      grad[z][y] = [];

      for(var x=0; x<N; ++x) {
        var dx = f[z][y][x < M ? x+1 : x] - f[z][y][x > 0 ? x-1 : x];
        var dy = f[z][y < M ? y+1 : y][x] - f[z][y > 0 ? y-1 : y][x];
        var dz = f[z < M ? z+1 : z][y][x] - f[z > 0 ? z-1 : z][y][x];

        grad[z][y][x] = [
          dx * (x > 0 && x < M ? n2 : n1),
          dy * (y > 0 && y < M ? n2 : n1),
          dz * (x > 0 && z < M ? n2 : n1)];
      }
    }
  }
  return grad;
}

function calcTriangles(N, dist, grad, triangles) {
  var cell = [];

  for(var m=0; m<8; ++m) {
    cell[m] = {};
    cell[m].val = 0; 
    cell[m].grd = [0,0,0];
    cell[m].pos = [0,0,0];
  }

  var M = N-1;

  for(var z=0; z<M; ++z) {
    var dist0 = dist[z  ], grad0 = grad[z  ];
    var dist1 = dist[z+1], grad1 = grad[z+1];

    cell[0].pos[2] = cell[1].pos[2] = cell[2].pos[2] = cell[3].pos[2] = z;
    cell[4].pos[2] = cell[5].pos[2] = cell[6].pos[2] = cell[7].pos[2] = z+1;

    for(var y=0; y<M; ++y) {
      var dist00 = dist0[y  ], grad00 = grad0[y  ];
      var dist01 = dist0[y+1], grad01 = grad0[y+1];
      var dist10 = dist1[y  ], grad10 = grad1[y  ];
      var dist11 = dist1[y+1], grad11 = grad1[y+1];

      cell[0].pos[1] = cell[3].pos[1] = cell[4].pos[1] = cell[7].pos[1] = y;
      cell[1].pos[1] = cell[2].pos[1] = cell[5].pos[1] = cell[6].pos[1] = y+1;

      for(var x=0; x<M; ++x) {
        cell[0].val = dist00[x];   cell[1].val = dist01[x];
        cell[2].val = dist01[x+1]; cell[3].val = dist00[x+1];
        cell[4].val = dist10[x];   cell[5].val = dist11[x];
        cell[6].val = dist11[x+1]; cell[7].val = dist10[x+1];

        cell[0].grd = grad00[x];   cell[1].grd = grad01[x];
        cell[2].grd = grad01[x+1]; cell[3].grd = grad00[x+1];
        cell[4].grd = grad10[x];   cell[5].grd = grad11[x];
        cell[6].grd = grad11[x+1]; cell[7].grd = grad10[x+1];

        cell[0].pos[0] = cell[1].pos[0] = cell[4].pos[0] = cell[5].pos[0] = x;
        cell[2].pos[0] = cell[3].pos[0] = cell[6].pos[0] = cell[7].pos[0] = x+1;

        Polygonise(cell, triangles);
      }
    }
  }
}

function updateBuffers(
    N, dist, positionBuffer, colorBuffer) {
  var grad      = [];
  var triangles = [];

  calcGrad(N, dist, grad);

  calcTriangles(N, dist, grad, triangles);

  var vertices = [];
  var colors = [];

  for (var i=0; i<triangles.length; ++i) {
    for (var j=0; j<3; ++j) {
      var px = triangles[i].pos[j][0];
      var py = triangles[i].pos[j][1];
      var pz = triangles[i].pos[j][2];

      var gx = triangles[i].grd[j][0];
      var gy = triangles[i].grd[j][1];
      var gz = triangles[i].grd[j][2];

      vertices[9*i+3*j+0] = px;
      vertices[9*i+3*j+1] = py;
      vertices[9*i+3*j+2] = pz;

      var c = -1 / Math.sqrt(gx*gx + gy*gy + gz*gz);

      colors[12*i+4*j+0] = Math.exp(gx*c)-1;
      colors[12*i+4*j+1] = Math.exp(gy*c)-1;
      colors[12*i+4*j+2] = Math.exp(gz*c)-1;
      colors[12*i+4*j+3] = 1;
    }
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  positionBuffer.numItems = vertices.length / positionBuffer.itemSize;

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
  colorBuffer.numItems = colors.length / colorBuffer.itemSize;
}
