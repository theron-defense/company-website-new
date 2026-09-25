/* 03 Onboard compute module */
import THREE from '../three.js';
import { TAU, HALF, box, cyl, plate, rrectShape, rrectPath, ringPts, rectPts, V } from '../geometry.js';

export function buildComputeModule(m) {
  var shell = m.part([0, 0, 0], [0, -1.0, 0]);
  m.solid(shell, plate(rrectShape(1.8, 1.2, 0.12), 0.04), { pos: [0, -0.42, 0] });
  var wall = rrectShape(1.8, 1.2, 0.12);
  wall.holes.push(rrectPath(1.72, 1.12, 0.08));
  m.solid(shell, plate(wall, 0.62), { pos: [0, -0.09, 0] });
  [[0.7, 0.42], [-0.7, 0.42], [0.7, -0.42], [-0.7, -0.42]].forEach(function (p) {
    m.solid(shell, cyl(0.035, 0.1, 10), { pos: [p[0], -0.35, p[1]] });
  });
  var carrier = m.part([0, 0, 0], [0, -0.5, 0]);
  m.solid(carrier, box(1.64, 0.03, 1.04), { pos: [0, -0.285, 0] });
  m.solid(carrier, box(0.2, 0.15, 0.2), { pos: [-0.55, -0.195, 0.4] });
  m.solid(carrier, box(0.15, 0.07, 0.16), { pos: [-0.28, -0.235, 0.42] });
  m.solid(carrier, box(0.15, 0.07, 0.16), { pos: [-0.08, -0.235, 0.42] });
  m.solid(carrier, box(0.17, 0.06, 0.13), { pos: [0.2, -0.24, 0.44] });
  m.solid(carrier, cyl(0.045, 0.16, 16), { pos: [0.52, -0.225, 0.42], rot: [HALF, 0, 0] });
  m.solid(carrier, box(0.5, 0.08, 0.06), { pos: [0.3, -0.23, -0.44] });
  m.solid(carrier, box(0.9, 0.04, 0.08), { pos: [0, -0.25, -0.22] });
  var som = m.part([0, 0, 0], [0, -0.05, 0]);
  m.solid(som, box(0.92, 0.025, 0.62), { pos: [0, -0.2, 0.02] });
  m.solid(som, box(0.3, 0.03, 0.3), { pos: [0.08, -0.172, 0.05] });
  [[-0.3, -0.16], [-0.3, 0.02], [-0.3, 0.2], [0.36, -0.16]].forEach(function (p) {
    m.solid(som, box(0.1, 0.02, 0.14), { pos: [p[0], -0.177, p[1]] });
  });
  var pad = m.part([0, 0, 0], [0, 0.35, 0]);
  m.solid(pad, box(0.3, 0.015, 0.3), { pos: [0.08, -0.15, 0.05] });
  var hs = m.part([0, 0, 0], [0, 0.75, 0]);
  m.solid(hs, box(1.3, 0.05, 0.86), { pos: [0, -0.117, 0.02] });
  for (var i = 0; i < 19; i++) {
    m.solid(hs, box(0.016, 0.22, 0.86), { pos: [-0.6 + i * (1.2 / 18), 0.018, 0.02] });
  }
  var fan = m.part([0, 0, 0], [0, 1.2, 0]);
  var fs = rrectShape(0.72, 0.72, 0.06);
  [[0, 0, 0.33], [0.3, 0.3, 0.025], [-0.3, 0.3, 0.025], [0.3, -0.3, 0.025], [-0.3, -0.3, 0.025]].forEach(function (h) {
    var p = new THREE.Path();
    p.absarc(h[0], h[1], h[2], 0, TAU, true);
    fs.holes.push(p);
  });
  m.solid(fan, plate(fs, 0.09), { pos: [0, 0.175, 0.02] });
  m.solid(fan, cyl(0.1, 0.08, 24), { pos: [0, 0.175, 0.02] });
  var rotor = new THREE.Group();
  rotor.position.set(0, 0.175, 0.02);
  fan.add(rotor);
  m.spinners.push(rotor);
  for (var k = 0; k < 7; k++) {
    var bg = new THREE.Group();
    bg.rotation.y = (k / 7) * TAU;
    rotor.add(bg);
    m.solid(bg, box(0.21, 0.008, 0.09), { pos: [0.215, 0, 0], rot: [0.5, 0, 0] });
  }
  var cover = m.part([0, 0, 0], [0, 1.65, 0]);
  var cs = rrectShape(1.8, 1.2, 0.12);
  var hole = new THREE.Path();
  hole.absarc(0, -0.02, 0.34, 0, TAU, true);
  cs.holes.push(hole);
  m.solid(cover, plate(cs, 0.03), { pos: [0, 0.235, 0] });
  var grill = [].concat(
    ringPts(0, 0.25, 0.02, 0.12, 32),
    ringPts(0, 0.25, 0.02, 0.22, 40),
    ringPts(0, 0.25, 0.02, 0.3, 48)
  );
  for (var g = 0; g < 4; g++) {
    var a = (g / 4) * TAU + Math.PI / 4;
    grill.push(
      V(Math.cos(a) * 0.12, 0.25, 0.02 + Math.sin(a) * 0.12),
      V(Math.cos(a) * 0.34, 0.25, 0.02 + Math.sin(a) * 0.34)
    );
  }
  m.lines(cover, grill);
  m.lines(cover, rectPts(0.251, 0.5, 0.36, 0.8, 0.48));
}
