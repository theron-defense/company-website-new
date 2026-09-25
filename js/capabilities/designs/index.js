/* The set of drawings, in tab order. This is the only file that has to change
   to add, reorder, or reframe a design.

   Each descriptor is:
     id     stable key, used for logging and asset naming
     title  spoken description of the drawing, read by the caption
     view   camera elevation (rad), model tilt [x, z], starting yaw, zoom
     source how to build it, dispatched by loaders/index.js

   A procedural source runs a builder from this folder. A gltf source points at
   an exported GLB, for the SolidWorks pipeline:

     source: {
       type: 'gltf',
       url: 'assets/models/turret.glb',
       edgeThreshold: 22,   // degrees; raise to quiet noisy tessellation
       upAxis: 'Z',         // only if the export lands on its side
       parts: { 'Barrel-1': [0, 0.85, -0.45] }  // explode offsets by node name
     }
*/
import { buildTurret } from './turret.js';
import { buildStrikeVehicle } from './strike-vehicle.js';
import { buildComputeModule } from './compute-module.js';
import { buildDriveMotor } from './drive-motor.js';

export default [
  {
    id: 'turret',
    title: 'Autonomous turret',
    view: { el: 0.30, tilt: [0, 0], yaw0: 2.3, zoom: 1.0 },
    source: { type: 'procedural', build: buildTurret }
  },
  {
    id: 'strike-vehicle',
    title: 'Autonomous strike vehicle',
    view: { el: 0.36, tilt: [0, 0], yaw0: -0.62, zoom: 1.08 },
    source: { type: 'procedural', build: buildStrikeVehicle }
  },
  {
    id: 'compute-module',
    title: 'Onboard compute module',
    view: { el: 0.48, tilt: [0, 0], yaw0: 0.5, zoom: 0.86 },
    source: { type: 'procedural', build: buildComputeModule }
  },
  {
    id: 'drive-motor',
    title: 'Brushless drive motor',
    view: { el: 0.12, tilt: [0.3, -0.5], yaw0: 0, zoom: 0.95 },
    source: { type: 'procedural', build: buildDriveMotor }
  }
];
