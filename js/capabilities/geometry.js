/* Primitive builders shared by the procedural designs. Everything returns raw
   geometry or point lists; materials and placement belong to the Model. */
import THREE from './three.js';

export var TAU = Math.PI * 2;
export var HALF = Math.PI / 2;

export function V(x, y, z) {
  return new THREE.Vector3(x, y, z);
}

export function box(w, h, d) {
  return new THREE.BoxGeometry(w, h, d);
}

export function cyl(r, h, seg) {
  return new THREE.CylinderGeometry(r, r, h, seg || 24);
}

// Annulus along Y, centred.
export function tube(ro, ri, h, seg) {
  var p = [
    new THREE.Vector2(ri, -h / 2),
    new THREE.Vector2(ro, -h / 2),
    new THREE.Vector2(ro, h / 2),
    new THREE.Vector2(ri, h / 2),
    new THREE.Vector2(ri, -h / 2)
  ];
  return new THREE.LatheGeometry(p, seg || 48);
}

// Flat extruded plate lying in XZ, centred on Y. Shape y maps to -z.
export function plate(shape, depth, cs) {
  var g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: cs || 36 });
  g.rotateX(-HALF);
  g.translate(0, -depth / 2, 0);
  return g;
}

export function circleShape(r, holes) {
  var s = new THREE.Shape();
  s.absarc(0, 0, r, 0, TAU, false);
  (holes || []).forEach(function (h) {
    var p = new THREE.Path();
    p.absarc(h[0], h[1], h[2], 0, TAU, true);
    s.holes.push(p);
  });
  return s;
}

function rrect(target, w, h, r) {
  var x = -w / 2;
  var y = -h / 2;
  target.moveTo(x + r, y);
  target.lineTo(x + w - r, y);
  target.quadraticCurveTo(x + w, y, x + w, y + r);
  target.lineTo(x + w, y + h - r);
  target.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  target.lineTo(x + r, y + h);
  target.quadraticCurveTo(x, y + h, x, y + h - r);
  target.lineTo(x, y + r);
  target.quadraticCurveTo(x, y, x + r, y);
  return target;
}

export function rrectShape(w, h, r) {
  return rrect(new THREE.Shape(), w, h, r);
}

export function rrectPath(w, h, r) {
  return rrect(new THREE.Path(), w, h, r);
}

export function ringPts(cx, cy, cz, r, n) {
  n = n || 48;
  var out = [];
  for (var i = 0; i < n; i++) {
    var a0 = (i / n) * TAU;
    var a1 = ((i + 1) / n) * TAU;
    out.push(
      V(cx + Math.cos(a0) * r, cy, cz + Math.sin(a0) * r),
      V(cx + Math.cos(a1) * r, cy, cz + Math.sin(a1) * r)
    );
  }
  return out;
}

// Rounded-rectangle loop in the plane spanned by u, v (used for coil windings).
export function loopPts(c, u, v, a, b, n) {
  var out = [];
  var prev = null;
  for (var i = 0; i <= n; i++) {
    var th = (i / n) * TAU;
    var co = Math.cos(th);
    var si = Math.sin(th);
    var x = a * Math.sign(co) * Math.sqrt(Math.abs(co));
    var y = b * Math.sign(si) * Math.sqrt(Math.abs(si));
    var p = c.clone().addScaledVector(u, x).addScaledVector(v, y);
    if (prev) out.push(prev, p);
    prev = p;
  }
  return out;
}

export function rectPts(y, x0, z0, x1, z1) {
  return [
    V(x0, y, z0), V(x1, y, z0),
    V(x1, y, z0), V(x1, y, z1),
    V(x1, y, z1), V(x0, y, z1),
    V(x0, y, z1), V(x0, y, z0)
  ];
}
