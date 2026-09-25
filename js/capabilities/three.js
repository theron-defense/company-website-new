/* three.js is vendored as a UMD build and loaded via a classic script tag, so it
   arrives on window. Importing it through here keeps a swap to a module build a
   one-file change. Undefined when WebGL support is absent from the page. */
export default window.THREE;
