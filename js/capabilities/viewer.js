/* The WebGL stage: one scene holding every drawing, cross-fading between them
   as tabs change, with an idle yaw and drag to rotate.

   Models arrive asynchronously through addModel, since a gltf source has to be
   fetched. Until one is ready the loop simply has nothing to draw. */
import THREE from './three.js';
import { readPalette } from './model.js';
import { CAMERA, DAMP, DRAG, FILL, FIT_PAD, REDUCE_MOTION_MQ, SPIN, WIDE_MQ } from './config.js';

export function createViewer(viewer, canvas, count) {
  var renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  } catch (e) {
    viewer.classList.add('no-webgl');
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CAMERA.maxPixelRatio));
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(CAMERA.fov, 1, CAMERA.near, CAMERA.far);
  var models = new Array(count);

  var reduceMotion = window.matchMedia(REDUCE_MOTION_MQ);
  var reduce = reduceMotion.matches;
  reduceMotion.addEventListener('change', function () {
    reduce = reduceMotion.matches;
    wake();
  });
  var wideMq = window.matchMedia(WIDE_MQ);

  var active = 0;
  var yaw = 0;
  var pitch = 0;
  var yawVel = 0;
  var dragging = false;
  var idleUntil = 0;
  var camDist = null; // set from the first ready model, then damped
  var camEl = 0;
  var running = false;
  var inView = true;
  var last = 0;

  function fitDist(r) {
    var vf = (camera.fov * Math.PI) / 180;
    var hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    return r / Math.sin(Math.min(vf, hf) / 2) / FILL;
  }
  function distFor(m) {
    return fitDist(m.r0 * FIT_PAD) / m.view.zoom;
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

  function frame(now) {
    if (!running) return;
    var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    var k = function (rate) {
      return reduce ? 1 : 1 - Math.exp(-dt * rate);
    };
    if (!dragging) {
      if (!reduce && now > idleUntil) yaw += SPIN.idle * dt;
      yaw += yawVel * dt;
      yawVel *= Math.exp(-dt * SPIN.friction);
    }
    for (var i = 0; i < models.length; i++) {
      var m = models[i];
      if (!m || !m.ready) continue;
      var aT = i === active ? 1 : 0;
      m.alpha += (aT - m.alpha) * k(i === active ? DAMP.fadeIn : DAMP.fadeOut);
      if (Math.abs(aT - m.alpha) < 0.003) m.alpha = aT;
      if (m.alpha === 0) {
        m.root.visible = false;
        continue;
      }
      m.root.visible = true;
      m.setOpacity(m.alpha);
      m.spin.rotation.y = m.view.yaw0 + yaw;
      m.root.rotation.x = pitch;
      if (!reduce) {
        for (var s = 0; s < m.spinners.length; s++) m.spinners[s].rotation.y += dt * SPIN.rotor;
      }
    }
    var am = models[active];
    if (am && am.ready) {
      if (camDist === null) {
        camDist = distFor(am);
        camEl = am.view.el;
      }
      camDist += (distFor(am) - camDist) * k(DAMP.dist);
      camEl += (am.view.el - camEl) * k(DAMP.elevation);
    }
    if (camDist !== null) {
      camera.position.set(0, Math.sin(camEl) * camDist, Math.cos(camEl) * camDist);
      camera.lookAt(0, camDist * (wideMq.matches ? -0.025 : 0.02), 0);
      renderer.render(scene, camera);
    }
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
    yaw += dx * DRAG.yawPerPx;
    pitch = Math.max(DRAG.pitchMin, Math.min(DRAG.pitchMax, pitch + dy * DRAG.pitchPerPx));
    yawVel = Math.max(
      -DRAG.maxYawVel,
      Math.min(DRAG.maxYawVel, yawVel * 0.6 + ((dx * DRAG.yawPerPx) / d) * 0.4)
    );
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    idleUntil = performance.now() + SPIN.idleDelayMs;
    viewer.classList.remove('is-grabbing');
    if (reduce) yawVel = 0;
  }
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) {
    canvas.addEventListener(ev, endDrag);
  });

  start();

  return {
    addModel: function (i, model) {
      models[i] = model;
      scene.add(model.root);
      model.root.visible = false;
      readPalette(models.filter(Boolean));
      wake();
    },
    select: function (i) {
      active = i;
      wake();
    },
    wake: wake
  };
}
