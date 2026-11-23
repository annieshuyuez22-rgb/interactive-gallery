export const CONFIG = {
  seed: 42,
  fixedDt: 1 / 60,
  duration: 40,
  fps: 60,
  width: 888,
  height: 898,
  carCount: 5,
  wheelRadius: 1.02,
  wheelbase: 3.7,
  track: 2.2,
  iterations: 1,
  version: 'initial',
} as const;

export const COLORS = {
  background: 0x10161b,
  fog: 0x172128,
  amber: 0xf0b429,
  orange: 0xe86f3d,
  cyan: 0x69d5df,
  asphalt: 0x272c30,
};
