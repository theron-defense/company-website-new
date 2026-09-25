/* Tuning for the capabilities viewer. Shapes live in designs/, framing lives in
   the design descriptors; these are the numbers that set the feel. */

// The bounding sphere circumscribes each model, so a plain fit leaves a margin
// no drawing ever reaches. FILL pulls the camera in to reclaim it.
export var FILL = 1.12;

// Bounding-sphere padding applied before fitting, so lines never touch the edge.
export var FIT_PAD = 1.04;

export var CAMERA = {
  fov: 30,
  near: 0.1,
  far: 100,
  maxPixelRatio: 1.75
};

// Exponential damping rates (per second). Higher converges faster.
export var DAMP = {
  fadeIn: 5,
  fadeOut: 9,
  dist: 3,
  elevation: 3
};

export var SPIN = {
  idle: 0.2, // rad/s of automatic yaw
  rotor: 8, // rad/s for fan blades and other spinners
  friction: 3.5, // decay on drag-released yaw velocity
  idleDelayMs: 2500 // pause before automatic yaw resumes after a drag
};

export var DRAG = {
  yawPerPx: 0.009,
  pitchPerPx: 0.005,
  pitchMin: -0.45,
  pitchMax: 0.55,
  maxYawVel: 6
};

// Edge threshold in degrees: an edge is drawn where adjacent faces exceed it.
export var EDGE_THRESHOLD = 20;

export var PALETTE = {
  line: { varName: '--v-line', fallback: '#1b1d22' },
  fill: { varName: '--v-fill', fallback: '#ffffff' }
};

// Fill opacity as a fraction of the model's fade-in alpha.
export var FILL_OPACITY = 0.5;

export var WIDE_MQ = '(min-width: 900px)';
export var REDUCE_MOTION_MQ = '(prefers-reduced-motion: reduce)';
