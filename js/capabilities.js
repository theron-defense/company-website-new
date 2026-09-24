/* Capabilities section: tab list driving a sticky line-drawing viewer. */
(function () {
  'use strict';

  var META = [
    { fig: '01', title: 'Autonomous turret' },
    { fig: '02', title: 'Autonomous strike vehicle' },
    { fig: '03', title: 'Onboard compute module' },
    { fig: '04', title: 'Brushless drive motor' }
  ];

  // Camera elevation (rad), model tilt [x, z], starting yaw, zoom.
  var VIEWS = [
    { el: 0.30, tilt: [0, 0], yaw0: 2.3, zoom: 1.0 },
    { el: 0.36, tilt: [0, 0], yaw0: -0.62, zoom: 1.08 },
    { el: 0.48, tilt: [0, 0], yaw0: 0.5, zoom: 0.86 },
    { el: 0.12, tilt: [0.3, -0.5], yaw0: 0, zoom: 0.95 }
  ];

  var stage = document.querySelector('.cap-stage');
  var viewer = document.getElementById('cap-viewer');
  if (!stage || !viewer) return;

  var canvas = viewer.querySelector('canvas');
  var tabs = Array.prototype.slice.call(stage.querySelectorAll('.cap'));
  var toggle = document.getElementById('cap-explode');
  var els = {
    fig: document.getElementById('cap-fig'),
    caption: document.getElementById('cap-caption')
  };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduce = reduceMotion.matches;
  var active = 0;
  var exploded = true;
  var gl = null;

  function updateHud() {
    var m = META[active];
    els.fig.textContent = 'Fig. ' + m.fig;
    els.caption.textContent =
      'Line drawing of the ' + m.title.toLowerCase() + ', ' + (exploded ? 'exploded' : 'assembled') + '.';
  }

  function select(i) {
    if (i === active) return;
    active = i;
    tabs.forEach(function (tab, k) {
      var on = k === i;
      tab.setAttribute('aria-selected', on ? 'true' : 'false');
      tab.tabIndex = on ? 0 : -1;
    });
    viewer.setAttribute('aria-labelledby', tabs[i].id);
    updateHud();
    if (gl) gl.onSelect(i);
  }

  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () {
      select(i);
    });
    tab.addEventListener('keydown', function (event) {
      var n = tabs.length;
      var next = null;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') next = (i + 1) % n;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') next = (i + n - 1) % n;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = n - 1;
      if (next !== null) {
        event.preventDefault();
        select(next);
        tabs[next].focus();
      }
    });
  });

  toggle.addEventListener('click', function () {
    exploded = !exploded;
    toggle.setAttribute('aria-pressed', exploded ? 'true' : 'false');
    updateHud();
    if (gl) gl.wake();
  });

  reduceMotion.addEventListener('change', function () {
    reduce = reduceMotion.matches;
  });

  updateHud();
  gl = initViewer();

  function initViewer() {
    if (typeof THREE === 'undefined') {
      viewer.classList.add('no-webgl');
      return null;
    }

    var TAU = Math.PI * 2;
    var HALF = Math.PI / 2;
    var V = function (x, y, z) {
      return new THREE.Vector3(x, y, z);
    };
    var lineColor = new THREE.Color('#1b1d22');
    var fillColor = new THREE.Color('#ffffff');
    var models = [];

    function readPalette() {
      var style = getComputedStyle(document.documentElement);
      try {
        lineColor.set(style.getPropertyValue('--v-line').trim() || '#1b1d22');
        fillColor.set(style.getPropertyValue('--v-fill').trim() || '#ffffff');
      } catch (e) {
        /* keep the defaults */
      }
      models.forEach(function (m) {
        m.lineMat.color.copy(lineColor);
        m.fillMat.color.copy(fillColor);
      });
    }

    /* ---------- geometry helpers ---------- */
    function box(w, h, d) {
      return new THREE.BoxGeometry(w, h, d);
    }
    function cyl(r, h, seg) {
      return new THREE.CylinderGeometry(r, r, h, seg || 24);
    }
    // Annulus along Y, centred.
    function tube(ro, ri, h, seg) {
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
    function plate(shape, depth, cs) {
      var g = new THREE.ExtrudeGeometry(shape, { depth: depth, bevelEnabled: false, curveSegments: cs || 36 });
      g.rotateX(-HALF);
      g.translate(0, -depth / 2, 0);
      return g;
    }
    function circleShape(r, holes) {
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
    function rrectShape(w, h, r) {
      return rrect(new THREE.Shape(), w, h, r);
    }
    function rrectPath(w, h, r) {
      return rrect(new THREE.Path(), w, h, r);
    }
    function ringPts(cx, cy, cz, r, n) {
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
    function loopPts(c, u, v, a, b, n) {
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
    function rectPts(y, x0, z0, x1, z1) {
      return [
        V(x0, y, z0), V(x1, y, z0),
        V(x1, y, z0), V(x1, y, z1),
        V(x1, y, z1), V(x0, y, z1),
        V(x0, y, z1), V(x0, y, z0)
      ];
    }

    /* ---------- model container ---------- */
    function Model(view) {
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
      this.t = 0;
      this.c0 = new THREE.Vector3();
      this.c1 = new THREE.Vector3();
      this.r0 = 1;
      this.r1 = 1;
      this._c = new THREE.Vector3();
    }
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
        new THREE.EdgesGeometry(geo, o.thresh == null ? 20 : o.thresh),
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
    Model.prototype.setExplode = function (t) {
      for (var i = 0; i < this.parts.length; i++) {
        var p = this.parts[i];
        p.position.copy(p.userData.base).addScaledVector(p.userData.ex, t);
      }
    };
    Model.prototype.measure = function () {
      var b = new THREE.Box3();
      var s = new THREE.Sphere();
      this.content.position.set(0, 0, 0);
      this.setExplode(0);
      this.content.updateMatrixWorld(true);
      b.setFromObject(this.content);
      b.getCenter(this.c0);
      b.getBoundingSphere(s);
      this.r0 = s.radius;
      this.setExplode(1);
      this.content.updateMatrixWorld(true);
      b.setFromObject(this.content);
      b.getCenter(this.c1);
      b.getBoundingSphere(s);
      this.r1 = s.radius;
      this.setExplode(0);
      this.tilt.rotation.set(this.view.tilt[0], 0, this.view.tilt[1]);
    };
    Model.prototype.apply = function () {
      this.setExplode(this.t);
      this.content.position.copy(this._c.copy(this.c0).lerp(this.c1, this.t).multiplyScalar(-1));
    };
    Model.prototype.setOpacity = function (a) {
      this.lineMat.opacity = a;
      this.fillMat.opacity = 0.5 * a;
    };

    /* ---------- 01 Autonomous turret ---------- */
    function buildTurret(m) {
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

    /* ---------- 02 Autonomous strike vehicle ---------- */
    function buildUGV(m) {
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

    /* ---------- 03 Onboard compute module ---------- */
    function buildCompute(m) {
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

    /* ---------- 04 Brushless drive motor ---------- */
    function buildMotor(m) {
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

    [buildTurret, buildUGV, buildCompute, buildMotor].forEach(function (fn, i) {
      var m = new Model(VIEWS[i]);
      fn(m);
      m.measure();
      models.push(m);
    });
    readPalette();

    /* ---------- renderer ---------- */
    var renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
    } catch (e) {
      viewer.classList.add('no-webgl');
      return null;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    var scene = new THREE.Scene();
    models.forEach(function (m) {
      scene.add(m.root);
      m.root.visible = false;
    });
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    function fitDist(r) {
      var vf = (camera.fov * Math.PI) / 180;
      var hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
      return r / Math.sin(Math.min(vf, hf) / 2);
    }
    function resize() {
      var rect = viewer.getBoundingClientRect();
      var w = Math.max(1, Math.round(rect.width));
      var h = Math.max(1, Math.round(rect.height));
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        resize();
        wake();
      }).observe(viewer);
    } else {
      window.addEventListener('resize', function () {
        resize();
        wake();
      });
    }

    var wideMq = window.matchMedia('(min-width: 900px)');
    var yaw = 0;
    var pitch = 0;
    var yawVel = 0;
    var dragging = false;
    var idleUntil = 0;
    var camDist = fitDist(models[0].r0 * 1.18) / VIEWS[0].zoom;
    var camEl = VIEWS[0].el;
    var running = false;
    var inView = true;
    var last = 0;

    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      var k = function (rate) {
        return reduce ? 1 : 1 - Math.exp(-dt * rate);
      };
      if (!dragging) {
        if (!reduce && now > idleUntil) yaw += 0.2 * dt;
        yaw += yawVel * dt;
        yawVel *= Math.exp(-dt * 3.5);
      }
      var target = exploded ? 1 : 0;
      for (var i = 0; i < models.length; i++) {
        var m = models[i];
        var aT = i === active ? 1 : 0;
        m.alpha += (aT - m.alpha) * k(i === active ? 5 : 9);
        if (Math.abs(aT - m.alpha) < 0.003) m.alpha = aT;
        if (m.alpha === 0) {
          m.root.visible = false;
          continue;
        }
        m.root.visible = true;
        m.setOpacity(m.alpha);
        m.t += (target - m.t) * k(2.4);
        if (Math.abs(target - m.t) < 0.0005) m.t = target;
        m.apply();
        m.spin.rotation.y = m.view.yaw0 + yaw;
        m.root.rotation.x = pitch;
        if (!reduce) {
          for (var s = 0; s < m.spinners.length; s++) m.spinners[s].rotation.y += dt * 8;
        }
      }
      var am = models[active];
      var r = THREE.MathUtils.lerp(am.r0 * 1.18, am.r1, am.t);
      camDist += (fitDist(r) / am.view.zoom - camDist) * k(3);
      camEl += (am.view.el - camEl) * k(3);
      camera.position.set(0, Math.sin(camEl) * camDist, Math.cos(camEl) * camDist);
      camera.lookAt(0, camDist * (wideMq.matches ? -0.025 : 0.02), 0);
      renderer.render(scene, camera);
      requestAnimationFrame(frame);
    }
    function start() {
      if (running || !inView || document.hidden) return;
      running = true;
      last = performance.now();
      requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
    }
    function wake() {
      start();
    }

    if (window.IntersectionObserver) {
      new IntersectionObserver(
        function (entries) {
          inView = entries[0].isIntersecting;
          if (inView) start();
          else stop();
        },
        { threshold: 0.05 }
      ).observe(viewer);
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop();
      else start();
    });

    /* ---------- drag to rotate ---------- */
    var px = 0;
    var py = 0;
    var pt = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button !== 0) return;
      dragging = true;
      px = e.clientX;
      py = e.clientY;
      pt = performance.now();
      yawVel = 0;
      try {
        canvas.setPointerCapture(e.pointerId);
      } catch (_) {
        /* pointer capture is a nicety, not a requirement */
      }
      viewer.classList.add('is-grabbing');
      wake();
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now();
      var dx = e.clientX - px;
      var dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      var d = Math.max(8, now - pt) / 1000;
      pt = now;
      yaw += dx * 0.009;
      pitch = Math.max(-0.45, Math.min(0.55, pitch + dy * 0.005));
      yawVel = Math.max(-6, Math.min(6, yawVel * 0.6 + ((dx * 0.009) / d) * 0.4));
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      idleUntil = performance.now() + 2500;
      viewer.classList.remove('is-grabbing');
      if (reduce) yawVel = 0;
    }
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
      canvas.addEventListener(ev, endDrag);
    });

    updateHud();
    start();

    return {
      onSelect: function (i) {
        if (!reduce) models[i].t = 0;
        wake();
      },
      wake: wake
    };
  }
})();
