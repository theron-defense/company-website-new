/* Turns a design descriptor into a measured Model.

   Each loader exports load(model, source) and returns a promise. The gltf
   loader is imported on demand, so a page with only procedural designs never
   fetches it or the three.js GLTFLoader it depends on. */
import { Model } from '../model.js';
import { load as loadProcedural } from './procedural.js';

var LOADERS = {
  procedural: function () {
    return Promise.resolve({ load: loadProcedural });
  },
  gltf: function () {
    return import('./gltf.js');
  }
};

export function loadDesign(design) {
  var get = LOADERS[design.source && design.source.type];
  if (!get) {
    return Promise.reject(new Error('Unknown design source: ' + (design.source && design.source.type)));
  }
  var model = new Model(design.view);
  return get()
    .then(function (loader) {
      return loader.load(model, design.source);
    })
    .then(function () {
      model.measure();
      return model;
    });
}
