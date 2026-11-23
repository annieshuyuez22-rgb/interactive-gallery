export type Vec3 = [number, number, number];

export interface DriveControl {
  throttle: number;
  steer: number;
}

export interface CarSpec {
  id: number;
  x: number;
  z: number;
  color: number;
  stiffness: number;
  name: string;
}

export interface CarState extends CarSpec {
  damage: Float32Array;
  nx: number;
  nz: number;
  maxDamage: number;
  totalDamage: number;
  frontDamage: number;
  rearDamage: number;
  detached: string[];
}

export interface WheelState {
  x: number;
  y: number;
  z: number;
  compression: number;
  load: number;
  contact: boolean;
  carId: number;
  axle: 'front' | 'rear';
  side: 'near' | 'far';
  rotation: number;
}

export interface TruckState {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  pitch: number;
  pitchVelocity: number;
  roll: number;
  rollVelocity: number;
  wheels: WheelState[];
}

export interface DebrisState {
  id: number;
  carId: number;
  kind: 'glass' | 'bumper' | 'mirror' | 'light';
  position: Vec3;
  velocity: Vec3;
  rotation: Vec3;
  angular: Vec3;
  scale: Vec3;
  color: number;
  asleep: boolean;
}

export interface SimEvent {
  type: 'contact' | 'crush' | 'glass' | 'detach' | 'land';
  carId: number;
  position: Vec3;
  intensity: number;
  axle?: 'front' | 'rear';
}

export interface Diagnostics {
  time: number;
  finite: boolean;
  truck: TruckState;
  cars: Array<{
    id: number;
    maxDamage: number;
    totalDamage: number;
    frontDamage: number;
    rearDamage: number;
    detached: string[];
  }>;
  debris: number;
  contacts: number;
  phase: string;
}
