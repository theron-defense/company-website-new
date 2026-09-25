/* 02 Autonomous strike vehicle */
import THREE from '../three.js';
import { V, TAU, HALF, box, cyl, tube, rectPts } from '../geometry.js';

export function buildStrikeVehicle(m) {
  var hull = m.part([0, 0, 0], [0, 0, 0]);
  var s = new THREE.Shape();
  s.moveTo(-1.15, 0.06);
  s.lineTo(1.08, 0.06);
  s.lineTo(1.28, 0.24);
  s.lineTo(1.1, 0.46);
  s.lineTo(-1.02, 0.46);
  s.lineTo(-1.17, 0.3);
  s.closePath();
  var hg = new THREE.ExtrudeGeometry(s, { depth: 0.72, bevelEnabled: false });
  hg.translate(0, 0, -0.36);
  m.solid(hull, hg);
  m.solid(hull, box(1.9, 0.06, 0.04), { pos: [0, 0.24, 0.39] });
  m.solid(hull, box(1.9, 0.06, 0.04), { pos: [0, 0.24, -0.39] });
  m.lines(hull, [
    V(0.35, 0.461, -0.3), V(0.35, 0.461, 0.3),
    V(-0.92, 0.461, -0.3), V(-0.92, 0.461, 0.3)
  ]);
  [-0.82, 0, 0.82].forEach(function (x) {
    [-1, 1].forEach(function (side) {
      var w = m.part([x, 0.24, 0.5 * side], [0, 0, 0.5 * side]);
      m.solid(w, tube(0.27, 0.17, 0.17, 22), { rot: [HALF, 0, 0], thresh: 12 });
      m.solid(w, cyl(0.17, 0.12, 8), { rot: [HALF, 0, 0] });
      m.solid(w, cyl(0.06, 0.2, 10), { rot: [HALF, 0, 0] });
    });
  });
  var payload = m.part([0, 0, 0], [0, 0.55, 0]);
  m.solid(payload, box(1.05, 0.2, 0.52), { pos: [-0.3, 0.565, 0] });
  m.lines(payload, rectPts(0.666, -0.76, -0.2, 0.16, 0.2));
  m.solid(payload, box(0.06, 0.04, 0.1), { pos: [0.24, 0.6, 0] });
  var mast = m.part([0, 0, 0], [0, 0.95, 0]);
  m.solid(mast, cyl(0.08, 0.05, 16), { pos: [0.62, 0.485, 0] });
  m.solid(mast, cyl(0.028, 0.42, 10), { pos: [0.62, 0.72, 0] });
  m.solid(mast, box(0.24, 0.15, 0.2), { pos: [0.62, 1.0, 0] });
  m.solid(mast, cyl(0.055, 0.06, 20), { pos: [0.76, 1.0, -0.04], rot: [0, 0, HALF] });
  m.solid(mast, cyl(0.035, 0.05, 16), { pos: [0.755, 1.0, 0.06], rot: [0, 0, HALF] });
  var ant = m.part([0, 0, 0], [-0.2, 0.7, 0]);
  [-0.24, 0.24].forEach(function (z) {
    m.solid(ant, cyl(0.035, 0.04, 10), { pos: [-0.9, 0.48, z] });
    m.lines(ant, [V(-0.9, 0.5, z), V(-0.9, 1.08, z)]);
  });
  var bar = m.part([0, 0, 0], [0.45, 0, 0]);
  m.solid(bar, box(0.06, 0.1, 0.56), { pos: [1.31, 0.24, 0] });
  var wins = [];
  [-0.16, 0, 0.16].forEach(function (z) {
    for (var i = 0; i < 16; i++) {
      var a0 = (i / 16) * TAU;
      var a1 = ((i + 1) / 16) * TAU;
      wins.push(
        V(1.341, 0.24 + Math.sin(a0) * 0.03, z + Math.cos(a0) * 0.03),
        V(1.341, 0.24 + Math.sin(a1) * 0.03, z + Math.cos(a1) * 0.03)
      );
    }
  });
  m.lines(bar, wins);
  var batt = m.part([0, 0, 0], [0, -0.6, 0]);
  m.solid(batt, box(1.5, 0.14, 0.52), { pos: [-0.05, 0.16, 0] });
  var cells = [];
  for (var i = 1; i < 6; i++) {
    var x = -0.8 + i * 0.25;
    cells.push(V(x, 0.231, -0.26), V(x, 0.231, 0.26));
  }
  m.lines(batt, cells);
}
