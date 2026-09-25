/* 04 Brushless drive motor */
import THREE from '../three.js';
import { V, TAU, HALF, box, cyl, tube, plate, circleShape, loopPts } from '../geometry.js';

export function buildDriveMotor(m) {
  var base = m.part([0, 0, 0], [0, -0.95, 0]);
  var bh = [[0, 0, 0.26]];
  for (var i = 0; i < 4; i++) {
    var a = Math.PI / 4 + i * HALF;
    bh.push([Math.cos(a) * 0.68, Math.sin(a) * 0.68, 0.07]);
  }
  m.solid(base, plate(circleShape(0.95, bh), 0.08, 48), { pos: [0, -0.46, 0] });
  var brg = m.part([0, 0, 0], [0, -0.55, 0]);
  m.solid(brg, tube(0.26, 0.2, 0.1, 36), { pos: [0, -0.36, 0] });
  m.solid(brg, tube(0.2, 0.16, 0.06, 36), { pos: [0, -0.36, 0] });
  m.solid(brg, tube(0.16, 0.085, 0.1, 36), { pos: [0, -0.36, 0] });
  var stator = m.part([0, 0, 0], [0, 0, 0]);
  m.solid(stator, tube(0.42, 0.27, 0.46, 36));
  var coil = [];
  for (var t = 0; t < 12; t++) {
    var ang = (t * TAU) / 12;
    m.solid(stator, box(0.34, 0.46, 0.1), { pos: [Math.cos(ang) * 0.59, 0, Math.sin(ang) * 0.59], rot: [0, -ang, 0] });
    m.solid(stator, box(0.04, 0.46, 0.24), { pos: [Math.cos(ang) * 0.77, 0, Math.sin(ang) * 0.77], rot: [0, -ang, 0] });
    var rad = V(Math.cos(ang), 0, Math.sin(ang));
    var tan = V(-Math.sin(ang), 0, Math.cos(ang));
    var up = V(0, 1, 0);
    for (var k = 0; k < 7; k++) {
      var r = 0.47 + k * 0.036;
      coil = coil.concat(
        loopPts(rad.clone().multiplyScalar(r), tan, up, 0.085 + 0.014 * Math.sin((k / 6) * Math.PI), 0.27, 16)
      );
    }
  }
  m.lines(stator, coil);
  var bell = m.part([0, 0, 0], [0, 0.95, 0]);
  m.solid(bell, tube(0.98, 0.92, 0.56, 64), { pos: [0, 0.02, 0], thresh: 3 });
  for (var mg = 0; mg < 14; mg++) {
    var b = (mg * TAU) / 14;
    m.solid(bell, box(0.04, 0.48, 0.3), { pos: [Math.cos(b) * 0.895, 0.02, Math.sin(b) * 0.895], rot: [0, -b, 0] });
  }
  var cap = m.part([0, 0, 0], [0, 1.4, 0]);
  var ch = [[0, 0, 0.09]];
  for (var c = 0; c < 6; c++) {
    var ca = (c * TAU) / 6;
    ch.push([Math.cos(ca) * 0.58, Math.sin(ca) * 0.58, 0.16]);
  }
  m.solid(cap, plate(circleShape(0.98, ch), 0.05, 48), { pos: [0, 0.325, 0] });
  m.solid(cap, tube(0.2, 0.09, 0.12, 32), { pos: [0, 0.38, 0] });
  var tb = m.part([0, 0, 0], [0, 1.8, 0]);
  m.solid(tb, tube(0.15, 0.085, 0.07, 32), { pos: [0, 0.47, 0] });
  var shaft = m.part([0, 0, 0], [0, 0.4, 0]);
  m.solid(shaft, cyl(0.075, 1.5, 12), { pos: [0, 0.02, 0], thresh: 25 });
  var ringTop = m.part([0, 0, 0], [0, 2.15, 0]);
  m.solid(ringTop, new THREE.TorusGeometry(0.9, 0.02, 4, 56, TAU * 0.93), { pos: [0, 0.36, 0], rot: [HALF, 0, 0] });
  var ringBot = m.part([0, 0, 0], [0, -1.65, 0]);
  m.solid(ringBot, new THREE.TorusGeometry(0.82, 0.018, 4, 56, TAU * 0.92), { pos: [0, -0.28, 0], rot: [HALF, 0, 2.2] });
  var clip = m.part([0, 0, 0], [0, -1.2, 0]);
  m.solid(clip, new THREE.TorusGeometry(0.105, 0.014, 4, 24, TAU * 0.8), { pos: [0, -0.62, 0], rot: [HALF, 0, 0] });
}
