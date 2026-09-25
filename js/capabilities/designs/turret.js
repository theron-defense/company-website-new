/* 01 Autonomous turret */
import THREE from '../three.js';
import { V, TAU, HALF, box, cyl, tube, rectPts } from '../geometry.js';

export function buildTurret(m) {
  var Y = V(0, 1, 0);
  var tri = m.part([0, 0, 0], [0, -0.95, 0]);
  m.solid(tri, cyl(0.2, 0.28, 16), { pos: [0, -1.02, 0], thresh: 15 });
  for (var i = 0; i < 3; i++) {
    var a = (i * TAU) / 3 + Math.PI / 6;
    var phi = 0.9;
    var d = V(Math.cos(a) * Math.sin(phi), -Math.cos(phi), Math.sin(a) * Math.sin(phi));
    var q = new THREE.Quaternion().setFromUnitVectors(Y, d);
    var L = 1.25;
    var start = V(Math.cos(a) * 0.16, -1.1, Math.sin(a) * 0.16);
    m.solid(tri, cyl(0.032, L, 8), { pos: start.clone().addScaledVector(d, L / 2).toArray(), quat: q });
    m.solid(tri, cyl(0.05, 0.14, 8), { pos: start.clone().addScaledVector(d, 0.12).toArray(), quat: q });
    m.solid(tri, cyl(0.075, 0.03, 16), { pos: start.clone().addScaledVector(d, L).toArray() });
  }
  var slew = m.part([0, 0, 0], [0, -0.5, 0]);
  m.solid(slew, tube(0.62, 0.4, 0.09, 48), { pos: [0, -0.84, 0] });
  m.solid(slew, tube(0.4, 0.28, 0.12, 48), { pos: [0, -0.84, 0] });
  for (var j = 0; j < 16; j++) {
    var b = (j / 16) * TAU;
    m.solid(slew, cyl(0.022, 0.03, 6), { pos: [Math.cos(b) * 0.51, -0.78, Math.sin(b) * 0.51] });
  }
  var housing = m.part([0, 0, 0], [0, 0, 0]);
  var prof = [[0.001, -0.79], [0.64, -0.79], [0.64, -0.6], [0.56, -0.5], [0.001, -0.5]].map(function (p) {
    return new THREE.Vector2(p[0], p[1]);
  });
  m.solid(housing, new THREE.LatheGeometry(prof, 40));
  m.solid(housing, cyl(0.12, 0.3, 16), { pos: [0, -0.64, 0.74], thresh: 15 });
  m.solid(housing, box(0.2, 0.16, 0.16), { pos: [0, -0.64, 0.6] });
  var yoke = m.part([0, 0, 0], [0, 0.4, 0]);
  m.solid(yoke, box(1.1, 0.08, 0.44), { pos: [0, -0.46, 0] });
  m.solid(yoke, box(0.1, 0.72, 0.44), { pos: [0.5, -0.06, 0] });
  m.solid(yoke, box(0.1, 0.72, 0.44), { pos: [-0.5, -0.06, 0] });
  m.solid(yoke, cyl(0.12, 0.1, 20), { pos: [0.6, 0.12, 0], rot: [0, 0, HALF] });
  m.solid(yoke, cyl(0.12, 0.1, 20), { pos: [-0.6, 0.12, 0], rot: [0, 0, HALF] });
  var pitchRot = [0.14, 0, 0];
  var cradle = m.part([0, 0.12, 0], [0, 0.85, 0], pitchRot);
  m.solid(cradle, box(0.8, 0.36, 0.78), { pos: [0, 0, 0.02] });
  m.solid(cradle, cyl(0.05, 1.0, 12), { rot: [0, 0, HALF] });
  m.solid(cradle, box(0.3, 0.2, 0.22), { pos: [0, -0.02, -0.47] });
  m.lines(cradle, rectPts(0.181, -0.32, -0.3, 0.32, 0.34));
  var sensor = m.part([0, 0.12, 0], [0, 1.35, -0.05], pitchRot);
  m.solid(sensor, box(0.2, 0.08, 0.2), { pos: [0, 0.22, 0.05] });
  m.solid(sensor, box(0.52, 0.24, 0.42), { pos: [0, 0.38, 0.05] });
  m.solid(sensor, cyl(0.085, 0.1, 24), { pos: [-0.12, 0.38, -0.2], rot: [HALF, 0, 0] });
  m.solid(sensor, cyl(0.055, 0.03, 24), { pos: [-0.12, 0.38, -0.26], rot: [HALF, 0, 0] });
  m.solid(sensor, cyl(0.06, 0.08, 20), { pos: [0.13, 0.38, -0.19], rot: [HALF, 0, 0] });
  m.solid(sensor, cyl(0.028, 0.05, 12), { pos: [0.13, 0.45, -0.17], rot: [HALF, 0, 0] });
  var barrel = m.part([0, 0.12, 0], [0, 0.85, -0.45], pitchRot);
  m.solid(barrel, cyl(0.085, 0.36, 16), { pos: [0, -0.02, -0.72], rot: [HALF, 0, 0], thresh: 15 });
  m.solid(barrel, cyl(0.042, 0.95, 12), { pos: [0, -0.02, -1.32], rot: [HALF, 0, 0] });
  m.solid(barrel, cyl(0.06, 0.16, 12), { pos: [0, -0.02, -1.86], rot: [HALF, 0, 0] });
}
