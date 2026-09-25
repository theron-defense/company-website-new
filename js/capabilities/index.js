/* Capabilities section: tab list driving a sticky line-drawing viewer. */
import THREE from './three.js';
import designs from './designs/index.js';
import { createTabs } from './tabs.js';
import { createViewer } from './viewer.js';
import { loadDesign } from './loaders/index.js';

var stage = document.querySelector('.cap-stage');
var viewerEl = document.getElementById('cap-viewer');

if (stage && viewerEl) {
  var canvas = viewerEl.querySelector('canvas');
  var tabEls = Array.prototype.slice.call(stage.querySelectorAll('.cap'));
  var gl = null;

  createTabs({
    tabs: tabEls,
    viewer: viewerEl,
    caption: document.getElementById('cap-caption'),
    designs: designs,
    onSelect: function (i) {
      if (gl) gl.select(i);
    }
  });

  if (!THREE || !canvas) {
    viewerEl.classList.add('no-webgl');
  } else {
    gl = createViewer(viewerEl, canvas, designs.length);
    if (gl) {
      designs.forEach(function (design, i) {
        loadDesign(design).then(
          function (model) {
            gl.addModel(i, model);
          },
          function (err) {
            console.error('Capabilities: failed to load design "' + design.id + '"', err);
          }
        );
      });
    }
  }
}
