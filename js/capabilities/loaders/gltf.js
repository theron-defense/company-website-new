/* Loads a GLB export and restyles it as a line drawing.

   The SolidWorks path: File > Save As > glTF Binary (.glb). GLB is the only
   export that keeps the component tree, and those component names are what
   descriptors use to address individual parts.

   CAD colours and appearances are dropped on purpose. The drawing style is the
   brand, so every mesh gets the model's shared line and fill materials. */
import THREE from '../three.js';
import { EDGE_THRESHOLD } from '../config.js';
import { HALF } from '../geometry.js';

var VENDOR_URL = new URL('../../vendor/GLTFLoader.js', import.meta.url).href;
var pending = null;

function loadScript(src) {
  return new Promise(function (resolve, reject) {
    var el = document.createElement('script');
    el.src = src;
    el.onload = function () {
      if (THREE.GLTFLoader) resolve();
      else reject(new Error(src + ' loaded but did not define THREE.GLTFLoader'));
    };
    el.onerror = function () {
      reject(new Error('Failed to load ' + src));
    };
    document.head.appendChild(el);
  });
}

/* r128 keeps its loaders out of the core build, so GLTFLoader arrives as a
   classic script. Fetched once, on the first gltf design. */
function ensureLoader() {
  if (THREE.GLTFLoader) return Promise.resolve();
  if (!pending) pending = loadScript(VENDOR_URL);
  return pending;
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) material.forEach(disposeMaterial);
  else material.dispose();
}

/* Replace every mesh's surface with the flat fill and hang its edges off it, so
   the edges inherit the mesh transform exactly. */
function toLineDrawing(root, model, threshold) {
  var meshes = [];
  root.traverse(function (o) {
    if (o.isMesh && o.geometry) meshes.push(o);
  });
  meshes.forEach(function (mesh) {
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, threshold), model.lineMat);
    edges.renderOrder = 1;
    mesh.add(edges);
    disposeMaterial(mesh.material);
    mesh.material = model.fillMat;
    mesh.renderOrder = 2;
  });
}

export function load(model, source) {
  if (!source.url) return Promise.reject(new Error('gltf source needs a url'));
  var threshold = source.edgeThreshold == null ? EDGE_THRESHOLD : source.edgeThreshold;
  var offsets = source.parts || {};

  return ensureLoader()
    .then(function () {
      return new Promise(function (resolve, reject) {
        new THREE.GLTFLoader().load(source.url, resolve, undefined, function (err) {
          // GLTFLoader reports a ProgressEvent on a failed fetch, which says
          // nothing on its own. Name the file instead.
          reject(new Error('Could not load ' + source.url + (err && err.message ? ': ' + err.message : '')));
        });
      });
    })
    .then(function (gltf) {
      var root = gltf.scene;
      // glTF is Y-up and exporters usually convert correctly. This is the fix
      // for the export that lands on its side.
      if (source.upAxis === 'Z') root.rotation.x = -HALF;
      root.updateMatrixWorld(true);

      /* Each top-level node becomes a part, so explode offsets can be keyed by
         SolidWorks component name. Baking the world matrix keeps any upAxis
         correction once the node leaves the glTF scene root. */
      root.children.slice().forEach(function (node) {
        node.matrixWorld.decompose(node.position, node.quaternion, node.scale);
        var part = model.part(node.position.toArray(), offsets[node.name]);
        node.position.set(0, 0, 0);
        part.add(node);
        toLineDrawing(node, model, threshold);
      });

      // The viewer recentres on the bounding box and fits to the bounding
      // sphere, so millimetre units and an off-origin model frame themselves.
      return model;
    });
}
