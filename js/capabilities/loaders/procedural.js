/* Runs a hand-written builder against an empty Model. Synchronous, wrapped in a
   promise so it shares the loader interface with gltf.js. */
export function load(model, source) {
  if (typeof source.build !== 'function') {
    return Promise.reject(new Error('procedural source needs a build function'));
  }
  source.build(model);
  return Promise.resolve(model);
}
