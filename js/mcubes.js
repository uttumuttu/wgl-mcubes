function VertexInterp(cell1, cell2) {
  var mu = cell1.val / (cell1.val - cell2.val);

  var p1 = cell1.pos, g1 = cell1.grd;
  var p2 = cell2.pos, g2 = cell2.grd;

  var out = {};

  out.pos = [p1[0] + mu * (p2[0] - p1[0]),
             p1[1] + mu * (p2[1] - p1[1]),
             p1[2] + mu * (p2[2] - p1[2])];

  out.grd = [g1[0] + mu * (g2[0] - g1[0]),
             g1[1] + mu * (g2[1] - g1[1]),
             g1[2] + mu * (g2[2] - g1[2])];

  return out;
}

/**
 * Return the number of triangular facets, the array "triangles"
 * will be loaded up with the vertices at most 5 triangular facets.
 * 0 will be returned if the grid cell is either totally above
 * of totally below the zero isolevel.
 */
function Polygonise(grid, triangles) {
  // Determine the index into the edge table which
  // tells us which vertices are inside of the surface

  var cubeindex = 0;

  if (grid[0].val < 0) cubeindex |= 1;
  if (grid[1].val < 0) cubeindex |= 2;
  if (grid[2].val < 0) cubeindex |= 4;
  if (grid[3].val < 0) cubeindex |= 8;
  if (grid[4].val < 0) cubeindex |= 16;
  if (grid[5].val < 0) cubeindex |= 32;
  if (grid[6].val < 0) cubeindex |= 64;
  if (grid[7].val < 0) cubeindex |= 128;

  var edges = edgeTable[cubeindex];

  // Cube is entirely in/out of the surface
  if (edges == 0) return;

  var vertlist = new Array();

  // Find the vertices where the surface intersects the cube
  if (edges & 1)
    vertlist[0] = VertexInterp(grid[0], grid[1]);
  if (edges & 2)
    vertlist[1] = VertexInterp(grid[1], grid[2]);
  if (edges & 4)
    vertlist[2] = VertexInterp(grid[2], grid[3]);
  if (edges & 8)
    vertlist[3] = VertexInterp(grid[3], grid[0]);
  if (edges & 16)
    vertlist[4] = VertexInterp(grid[4], grid[5]);
  if (edges & 32)
    vertlist[5] = VertexInterp(grid[5], grid[6]);
  if (edges & 64)
    vertlist[6] = VertexInterp(grid[6], grid[7]);
  if (edges & 128)
    vertlist[7] = VertexInterp(grid[7], grid[4]);
  if (edges & 256)
    vertlist[8] = VertexInterp(grid[0], grid[4]);
  if (edges & 512)
    vertlist[9] = VertexInterp(grid[1], grid[5]);
  if (edges & 1024)
    vertlist[10] = VertexInterp(grid[2], grid[6]);
  if (edges & 2048)
    vertlist[11] = VertexInterp(grid[3], grid[7]);

  // create the triangles

  var tris = triTable[cubeindex];

  for (var i=0; tris[i] != -1; i+=3) {
    var tri = {};

    tri.pos = [vertlist[tris[i  ]].pos,
               vertlist[tris[i+1]].pos,
               vertlist[tris[i+2]].pos];

    tri.grd = [vertlist[tris[i  ]].grd,
               vertlist[tris[i+1]].grd,
               vertlist[tris[i+2]].grd];

    triangles.push(tri);
  }
}
