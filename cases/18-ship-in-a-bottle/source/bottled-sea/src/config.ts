export const CONFIG = {
  seed: 31102026,
  axisY: 4.65,
  bottleRadius: 5.15,
  seaLevel: -1.42,
  waterStep: 0.43,
  demoDuration: 40,
  camera: {
    fov: 35,
    position: [16.5, 12.4, 33.5] as [number, number, number],
    target: [0.6, 3.3, 0] as [number, number, number],
  },
  colors: {
    brass: 0xc7a66a,
    darkWood: 0x321b13,
    hull: 0x623725,
    sail: 0xeee5cd,
    water: 0x177c98,
    deepWater: 0x062f52,
    foam: 0xd4eee7,
  },
};

export type Weather = 'calm' | 'breeze' | 'storm';
export type Quality = 'high' | 'eco';

export interface SceneState {
  timeOfDay: number;
  autoCycle: boolean;
  weather: Weather;
  quality: Quality;
  reducedMotion: boolean;
}

export const INITIAL_STATE: SceneState = {
  timeOfDay: 10.4,
  autoCycle: false,
  weather: 'breeze',
  quality: 'high',
  reducedMotion: false,
};
