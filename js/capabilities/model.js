/* A Model is one drawing: a group hierarchy, two shared materials, and the
   bookkeeping the viewer needs to frame and fade it. */
import THREE from './three.js';
import { EDGE_THRESHOLD, FILL_OPACITY, PALETTE } from './config.js';

var lineColor = null;
var fillColor = null;

function ensureColors() {
  if (!lineColor) {
    lineColor = new THREE.Color(PALETTE.line.fallback);
    fillColor = new THREE.Color(PALETTE.fill.fallback);
  }
}

/* Pull the drawing colors from CSS custom properties and push them into every
   model's materials, so the stylesheet stays the single source of truth. */
export function readPalette(models) {
  ensureColors();
  var style = getComputedStyle(document.documentElement);
  try {
    lineColor.set(style.getPropertyValue(PALETTE.line.varName).trim() || PALETTE.line.fallback);
    fillColor.set(style.getPropertyValue(PALETTE.fill.varName).trim() || PALETTE.fill.fallback);
  } catch (e) {
    /* keep the defaults */
  }
  models.forEach(function (m) {
    m.lineMat.color.copy(lineColor);
    m.fillMat.color.copy(fillColor);
  });
}

export function Model(view) {
  ensureColors();
  this.view = view;
  this.lineMat = new THREE.LineBasicMaterial({ color: lineColor.clone(), transparent: true, opacity: 0 });
  this.fillMat = new THREE.MeshBasicMaterial({
    color: fillColor.clone(),
    transparent: true,
    opacity: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 1,
    polygonOffsetUnits: 1
  });
  this.root = new THREE.Group();
  this.tilt = new THREE.Group();
  this.spin = new THREE.Group();
  this.content = new THREE.Group();
  this.root.add(this.tilt);
  this.tilt.add(this.spin);
  this.spin.add(this.content);
  this.parts = [];
  this.spinners = [];
  this.alpha = 0;
  this.ready = false;
  this.c0 = new THREE.Vector3();
  this.r0 = 1;
}

/* A part is a positioned subgroup. `ex` is its exploded-view offset: no current
   code path reads it, but designs keep authoring it so an exploded view can
   come back without re-deriving every offset by hand. */
Model.prototype.part = function (pos, ex, rot) {
  var g = new THREE.Group();
  g.position.fromArray(pos || [0, 0, 0]);
  if (rot) g.rotation.set(rot[0], rot[1], rot[2]);
  g.userData.base = g.position.clone();
  g.userData.ex = new THREE.Vector3().fromArray(ex || [0, 0, 0]);
  this.content.add(g);
  this.parts.push(g);
  return g;
};

Model.prototype.solid = function (parent, geo, o) {
  o = o || {};
  var h = new THREE.Group();
  if (o.pos) h.position.fromArray(o.pos);
  if (o.quat) h.quaternion.copy(o.quat);
  else if (o.rot) h.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.fill !== false) {
    var mesh = new THREE.Mesh(geo, this.fillMat);
    mesh.renderOrder = 2;
    h.add(mesh);
  }
  var edges = new THREE.LineSegments(
    new THREE.EdgesGeometry(geo, o.thresh == null ? EDGE_THRESHOLD : o.thresh),
    this.lineMat
  );
  edges.renderOrder = 1;
  h.add(edges);
  parent.add(h);
  return h;
};

Model.prototype.lines = function (parent, pts) {
  if (!pts.length) return null;
  var l = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), this.lineMat);
  l.renderOrder = 1;
  parent.add(l);
  return l;
};

/* Slides every part along its offset, 0 assembled through 1 fully exploded.
   Nothing calls this today; it is kept as the other half of the `ex` data. */
Model.prototype.setExplode = function (t) {
  for (var i = 0; i < this.parts.length; i++) {
    var p = this.parts[i];
    p.position.copy(p.userData.base).addScaledVector(p.userData.ex, t);
  }
};

/* Centre the drawing on the origin and record the radius the camera fits to.
   Run once after a loader finishes populating the model. */
Model.prototype.measure = function () {
  var b = new THREE.Box3();
  var s = new THREE.Sphere();
  this.content.position.set(0, 0, 0);
  this.content.updateMatrixWorld(true);
  b.setFromObject(this.content);
  b.getCenter(this.c0);
  b.getBoundingSphere(s);
  this.r0 = s.radius || 1;
  this.content.position.copy(this.c0).multiplyScalar(-1);
  this.tilt.rotation.set(this.view.tilt[0], 0, this.view.tilt[1]);
  this.ready = true;
};

Model.prototype.setOpacity = function (a) {
  this.lineMat.opacity = a;
  this.fillMat.opacity = FILL_OPACITY * a;
};
