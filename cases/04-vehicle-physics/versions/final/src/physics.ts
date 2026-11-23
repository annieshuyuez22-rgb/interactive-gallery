import { CONFIG } from './config';
import type { CarState, DebrisState, Diagnostics, DriveControl, SimEvent, TruckState, WheelState } from './types';

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (a: number, b: number, value: number) => {
  const t = clamp((value - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

const CAR_HALF_WIDTH = 1.15;
const CAR_HALF_LENGTH = 2.25;
const CAR_NAMES = ['EMBER', 'COBALT', 'IVORY', 'VERDANT', 'VIOLET'];
const CAR_COLORS = [0xc94e35, 0x287ca3, 0xd6cdb8, 0x498a70, 0x785b9e];

export function carBaseHeight(lx: number, lz: number): number {
  const ax = Math.abs(lx);
  const az = Math.abs(lz);
  if (ax >= CAR_HALF_WIDTH || az >= CAR_HALF_LENGTH) return 0;
  const edge = (1 - smoothstep(1.01, 1.15, ax)) * (1 - smoothstep(2.08, 2.25, az));
  const cabinSide = 1 - smoothstep(0.73, 1.02, ax);
  const cabinLength = 1 - smoothstep(0.9, 1.32, az);
  const roof = 1.5 - 0.13 * Math.pow(ax / 1.02, 2) - 0.045 * az;
  const hood = 0.82 - 0.06 * smoothstep(1.25, 2.15, az);
  const body = lerp(hood, roof, cabinSide * cabinLength);
  return Math.max(0, body * edge);
}

export function sampleCarDamage(car: CarState, lx: number, lz: number): number {
  const gx = clamp((lx + CAR_HALF_WIDTH) / (2 * CAR_HALF_WIDTH) * (car.nx - 1), 0, car.nx - 1);
  const gz = clamp((lz + CAR_HALF_LENGTH) / (2 * CAR_HALF_LENGTH) * (car.nz - 1), 0, car.nz - 1);
  const x0 = Math.floor(gx);
  const z0 = Math.floor(gz);
  const x1 = Math.min(car.nx - 1, x0 + 1);
  const z1 = Math.min(car.nz - 1, z0 + 1);
  const tx = gx - x0;
  const tz = gz - z0;
  const a = lerp(car.damage[z0 * car.nx + x0], car.damage[z0 * car.nx + x1], tx);
  const b = lerp(car.damage[z1 * car.nx + x0], car.damage[z1 * car.nx + x1], tx);
  return lerp(a, b, tz);
}

export function carSurfaceHeight(car: CarState, lx: number, lz: number): number {
  const base = carBaseHeight(lx, lz);
  if (base <= 0) return 0;
  return Math.max(Math.min(0.24, base), base - sampleCarDamage(car, lx, lz));
}

function makeCar(id: number): CarState {
  const nx = 19;
  const nz = 35;
  return {
    id,
    x: id * 2.8,
    z: 0,
    color: CAR_COLORS[id % CAR_COLORS.length],
    stiffness: [1.0, 1.13, 0.91, 1.22, 1.04][id % 5],
    name: CAR_NAMES[id % CAR_NAMES.length],
    damage: new Float32Array(nx * nz),
    nx,
    nz,
    maxDamage: 0,
    totalDamage: 0,
    frontDamage: 0,
    rearDamage: 0,
    detached: [],
  };
}

export class CrushSimulation {
  cars: CarState[] = [];
  debris: DebrisState[] = [];
  events: SimEvent[] = [];
  truck!: TruckState;
  time = 0;
  automatic = true;
  control: DriveControl = { throttle: 0, steer: 0 };
  private randomState: number = CONFIG.seed;
  private debrisId = 0;
  private lastCrushEvent: number[] = [];
  private carCount: number;

  constructor(carCount: number = CONFIG.carCount) {
    this.carCount = carCount;
    this.reset(carCount);
  }

  private random(): number {
    this.randomState |= 0;
    this.randomState = (this.randomState + 0x6d2b79f5) | 0;
    let t = this.randomState;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  reset(carCount = this.carCount): void {
    this.carCount = carCount;
    this.cars = Array.from({ length: carCount }, (_, id) => makeCar(id));
    this.debris = [];
    this.events = [];
    this.time = 0;
    this.debrisId = 0;
    this.randomState = CONFIG.seed;
    this.lastCrushEvent = Array.from({ length: carCount }, () => -10);
    this.automatic = true;
    this.control = { throttle: 0, steer: 0 };
    const wheels: WheelState[] = [
      this.makeWheel('front', 'near'),
      this.makeWheel('front', 'far'),
      this.makeWheel('rear', 'near'),
      this.makeWheel('rear', 'far'),
    ];
    this.truck = {
      x: -10.5,
      y: 2.17,
      z: 0,
      vx: 0,
      vy: 0,
      pitch: 0,
      pitchVelocity: 0,
      roll: 0,
      rollVelocity: 0,
      wheels,
    };
    this.updateWheelContacts(false);
  }

  private makeWheel(axle: 'front' | 'rear', side: 'near' | 'far'): WheelState {
    return {
      x: this.truck?.x ?? -10.5,
      y: CONFIG.wheelRadius,
      z: 0,
      compression: 0.18,
      load: 0,
      contact: false,
      carId: -1,
      axle,
      side,
      rotation: 0,
    };
  }

  private surfaceAt(x: number, z: number): { height: number; car: CarState | null } {
    let height = 0;
    let hit: CarState | null = null;
    for (const car of this.cars) {
      const lx = x - car.x;
      const lz = z - car.z;
      if (Math.abs(lx) >= CAR_HALF_WIDTH || Math.abs(lz) >= CAR_HALF_LENGTH) continue;
      const candidate = carSurfaceHeight(car, lx, lz);
      if (candidate > height) {
        height = candidate;
        hit = car;
      }
    }
    return { height, car: hit };
  }

  private wheelSupport(x: number, z: number): { height: number; car: CarState | null } {
    let height = 0;
    let hit: CarState | null = null;
    const samples = [[0, 0], [-0.24, 0], [0.24, 0], [0, -0.31], [0, 0.31]];
    for (const [dx, dz] of samples) {
      const sample = this.surfaceAt(x + dx, z + dz);
      if (sample.height > height) {
        height = sample.height;
        hit = sample.car;
      }
    }
    return { height, car: hit };
  }

  private updateWheelContacts(applyDamage: boolean, travel = 0): void {
    const truck = this.truck;
    for (const wheel of truck.wheels) {
      const axleX = wheel.axle === 'front' ? CONFIG.wheelbase / 2 : -CONFIG.wheelbase / 2;
      const sideZ = wheel.side === 'near' ? -CONFIG.track / 2 : CONFIG.track / 2;
      wheel.x = truck.x + axleX * Math.cos(truck.pitch);
      wheel.z = truck.z + sideZ;
      const previousCar = wheel.carId;
      const support = this.wheelSupport(wheel.x, wheel.z);
      wheel.y = support.height + CONFIG.wheelRadius;
      wheel.carId = support.car?.id ?? -1;
      wheel.contact = support.height > 0.08;
      const bodyToWheel = truck.y - wheel.y;
      wheel.compression = clamp((1.34 - bodyToWheel) / 0.83, 0, 1);
      wheel.load = wheel.contact ? clamp(0.18 + wheel.compression * 1.1 + Math.max(0, -truck.vy) * 0.16, 0, 1.8) : 0;
      if (support.car && previousCar !== wheel.carId) {
        this.events.push({ type: 'contact', carId: support.car.id, position: [wheel.x, support.height, wheel.z], intensity: 0.45 + wheel.compression * 0.5, axle: wheel.axle });
      }
      if (applyDamage && support.car && wheel.load > 0.28 && travel > 0.000001) {
        this.damageAt(support.car, wheel.x, wheel.z, wheel.load, wheel.axle, travel);
      }
    }
  }

  private damageAt(car: CarState, worldX: number, worldZ: number, load: number, axle: 'front' | 'rear', travel: number): void {
    const lx = worldX - car.x;
    const lz = worldZ - car.z;
    const pressure = (0.42 + load * 0.48) / car.stiffness;
    let accumulated = 0;
    for (let iz = 0; iz < car.nz; iz++) {
      const z = -CAR_HALF_LENGTH + iz / (car.nz - 1) * CAR_HALF_LENGTH * 2;
      for (let ix = 0; ix < car.nx; ix++) {
        const x = -CAR_HALF_WIDTH + ix / (car.nx - 1) * CAR_HALF_WIDTH * 2;
        const dx = (x - lx) / 0.49;
        const dz = (z - lz) / 0.58;
        const distance = dx * dx + dz * dz;
        if (distance > 2.6) continue;
        const base = carBaseHeight(x, z);
        if (base <= 0.3) continue;
        const index = iz * car.nx + ix;
        const old = car.damage[index];
        const maxDepth = Math.max(0, base - 0.24);
        const weight = Math.exp(-distance * 1.65);
        const next = Math.min(maxDepth, old + pressure * weight * travel * 0.58);
        const delta = next - old;
        if (delta <= 0) continue;
        car.damage[index] = next;
        car.totalDamage += delta;
        if (axle === 'front') car.frontDamage += delta;
        else car.rearDamage += delta;
        accumulated += delta;
        car.maxDamage = Math.max(car.maxDamage, next);
      }
    }
    if (accumulated > 0.005 && this.time - this.lastCrushEvent[car.id] > 0.14) {
      this.events.push({ type: 'crush', carId: car.id, position: [worldX, carSurfaceHeight(car, lx, lz), worldZ], intensity: clamp(load, 0.25, 1.4), axle });
      this.lastCrushEvent[car.id] = this.time;
    }
    this.checkDetachments(car, axle);
  }

  private checkDetachments(car: CarState, axle: 'front' | 'rear'): void {
    const at = (x: number, z: number) => sampleCarDamage(car, x, z);
    const detach = (key: string, kind: DebrisState['kind'], position: [number, number, number], count: number, color: number) => {
      if (car.detached.includes(key)) return;
      car.detached.push(key);
      for (let i = 0; i < count; i++) {
        const origin: [number, number, number] = [...position];
        if (kind === 'light') origin[0] += i === 0 ? -0.72 : 0.72;
        this.spawnDebris(car, kind, origin, color);
      }
      this.events.push({ type: kind === 'glass' ? 'glass' : 'detach', carId: car.id, position, intensity: kind === 'glass' ? 1 : 0.65, axle });
    };
    const roofDamage = Math.max(at(0, 0), at(-0.6, -0.55), at(0.6, 0.55), at(0, -0.9), at(0, 0.9));
    if (roofDamage > 0.29) detach('glass', 'glass', [car.x, 1.32, car.z], 12, 0x9ed9df);
    if (at(-1.04, -0.73) > 0.2) detach('mirror-front', 'mirror', [car.x - 1.18, 1.05, car.z - 0.73], 1, car.color);
    if (at(1.04, -0.73) > 0.2) detach('mirror-rear', 'mirror', [car.x + 1.18, 1.05, car.z - 0.73], 1, car.color);
    const frontLights = Math.max(at(-0.72, -1.85), at(0.72, -1.85));
    const rearLights = Math.max(at(-0.72, 1.85), at(0.72, 1.85));
    if (frontLights > 0.18) detach('light-front', 'light', [car.x, 0.68, car.z - 1.9], 2, 0xffd8a0);
    if (rearLights > 0.18) detach('light-rear', 'light', [car.x, 0.68, car.z + 1.9], 2, 0xffd8a0);
    if (at(0, -2.05) > 0.16) detach('bumper-front', 'bumper', [car.x, 0.45, car.z - 2.08], 1, 0x353a3e);
    if (at(0, 2.05) > 0.16) detach('bumper-rear', 'bumper', [car.x, 0.45, car.z + 2.08], 1, 0x353a3e);
  }

  private spawnDebris(car: CarState, kind: DebrisState['kind'], origin: [number, number, number], color: number): void {
    const spread = kind === 'glass' ? 0.8 : 0.2;
    const scale: [number, number, number] = kind === 'glass'
      ? [0.09 + this.random() * 0.16, 0.015, 0.1 + this.random() * 0.2]
      : kind === 'bumper' ? [1.45, 0.12, 0.16] : kind === 'mirror' ? [0.25, 0.12, 0.18] : [0.18, 0.12, 0.1];
    this.debris.push({
      id: this.debrisId++,
      carId: car.id,
      kind,
      position: [origin[0] + (this.random() - 0.5) * spread, origin[1] + this.random() * 0.15, origin[2] + (this.random() - 0.5) * spread],
      velocity: [this.truck.vx * 0.3 + (this.random() - 0.5) * 1.8, 0.7 + this.random() * 1.8, (this.random() - 0.5) * 2.2],
      rotation: [this.random() * 3, this.random() * 3, this.random() * 3],
      angular: [(this.random() - 0.5) * 8, (this.random() - 0.5) * 8, (this.random() - 0.5) * 8],
      scale,
      color,
      asleep: false,
    });
  }

  private updateDebris(dt: number): void {
    for (const piece of this.debris) {
      if (piece.asleep) continue;
      piece.velocity[1] -= 9.81 * dt;
      piece.position[0] += piece.velocity[0] * dt;
      piece.position[1] += piece.velocity[1] * dt;
      piece.position[2] += piece.velocity[2] * dt;
      piece.rotation[0] += piece.angular[0] * dt;
      piece.rotation[1] += piece.angular[1] * dt;
      piece.rotation[2] += piece.angular[2] * dt;
      const halfHeight = Math.max(0.025, piece.scale[1] * 0.5);
      const support = this.surfaceAt(piece.position[0], piece.position[2]);
      const floor = support.height + halfHeight;
      if (piece.position[1] < floor) {
        piece.position[1] = floor;
        if (Math.abs(piece.velocity[1]) > 0.45) {
          piece.velocity[1] *= -0.28;
          piece.velocity[0] *= 0.74;
          piece.velocity[2] *= 0.74;
          piece.angular[0] *= 0.7;
          piece.angular[1] *= 0.7;
          piece.angular[2] *= 0.7;
        } else {
          piece.velocity[1] = 0;
          piece.velocity[0] *= 0.82;
          piece.velocity[2] *= 0.82;
          piece.angular[0] *= 0.8;
          piece.angular[1] *= 0.8;
          piece.angular[2] *= 0.8;
        }
      }
      for (const wheel of this.truck.wheels) {
        const dx = piece.position[0] - wheel.x;
        const dy = piece.position[1] - wheel.y;
        const dz = piece.position[2] - wheel.z;
        const distance = Math.hypot(dx, dy, dz);
        const radius = CONFIG.wheelRadius + Math.max(...piece.scale) * 0.35;
        if (distance >= radius || distance < 0.0001) continue;
        const nx = dx / distance;
        const ny = dy / distance;
        const nz = dz / distance;
        piece.position[0] = wheel.x + nx * radius;
        piece.position[1] = wheel.y + ny * radius;
        piece.position[2] = wheel.z + nz * radius;
        const inward = piece.velocity[0] * nx + piece.velocity[1] * ny + piece.velocity[2] * nz;
        if (inward < 0) {
          piece.velocity[0] -= inward * nx * 1.35;
          piece.velocity[1] -= inward * ny * 1.35;
          piece.velocity[2] -= inward * nz * 1.35;
        }
      }
      const speed = Math.hypot(...piece.velocity);
      if (piece.position[1] <= floor + 0.001 && speed < 0.08) piece.asleep = true;
    }
  }

  step(control?: DriveControl): void {
    const dt = CONFIG.fixedDt;
    this.events = [];
    if (control) this.control = { throttle: clamp(control.throttle, -1, 1), steer: clamp(control.steer, -1, 1) };
    const truck = this.truck;
    const targetSpeed = this.automatic ? (truck.x < 16.5 ? 2.2 : 0) : 0;
    const throttle = this.automatic ? clamp((targetSpeed - truck.vx) * 1.2, -0.65, 1) : this.control.throttle;
    const steer = this.automatic ? 0 : this.control.steer;
    const frontBefore = this.wheelSupport(truck.x + CONFIG.wheelbase / 2, truck.z).height;
    const rearBefore = this.wheelSupport(truck.x - CONFIG.wheelbase / 2, truck.z).height;
    const climbResistance = Math.max(0, frontBefore - rearBefore) * 0.36;
    const braking = !this.automatic && Math.abs(throttle) < 0.02;
    const acceleration = throttle * 3.3 - truck.vx * (this.automatic ? 0.42 : 0.65) - (braking ? 0 : climbResistance);
    truck.vx = clamp(truck.vx + acceleration * dt, -2.1, 3.1);
    if (!this.automatic && Math.abs(throttle) < 0.02 && Math.abs(truck.vx) < 0.035) truck.vx = 0;
    const previousX = truck.x;
    const previousZ = truck.z;
    truck.x += truck.vx * dt;
    truck.z = clamp(truck.z + steer * Math.min(1, Math.abs(truck.vx)) * 1.15 * dt, -1.1, 1.1);
    const travel = Math.hypot(truck.x - previousX, truck.z - previousZ);
    for (const wheel of truck.wheels) wheel.rotation -= truck.vx / CONFIG.wheelRadius * dt;
    this.updateWheelContacts(true, travel);
    const front = (truck.wheels[0].y + truck.wheels[1].y) * 0.5;
    const rear = (truck.wheels[2].y + truck.wheels[3].y) * 0.5;
    const near = (truck.wheels[0].y + truck.wheels[2].y) * 0.5;
    const far = (truck.wheels[1].y + truck.wheels[3].y) * 0.5;
    const targetY = (front + rear) * 0.5 + 1.15;
    const targetPitch = Math.atan2(front - rear, CONFIG.wheelbase) * 0.88;
    const targetRoll = Math.atan2(near - far, CONFIG.track) * 0.62;
    truck.vy += ((targetY - truck.y) * 30 - truck.vy * 8.6) * dt;
    truck.y += truck.vy * dt;
    truck.pitchVelocity += ((targetPitch - truck.pitch) * 24 - truck.pitchVelocity * 7.2) * dt;
    truck.pitch += truck.pitchVelocity * dt;
    truck.rollVelocity += ((targetRoll - truck.roll) * 22 - truck.rollVelocity * 7.5) * dt;
    truck.roll += truck.rollVelocity * dt;
    for (const wheel of truck.wheels) {
      wheel.compression = clamp((1.34 - (truck.y - wheel.y)) / 0.83, 0, 1);
    }
    this.updateDebris(dt);
    this.time += dt;
  }

  advanceTo(target: number): void {
    if (target < this.time - 1e-7) this.reset();
    const steps = Math.max(0, Math.round((target - this.time) / CONFIG.fixedDt));
    for (let i = 0; i < steps; i++) this.step();
  }

  get phase(): string {
    const front = this.truck.wheels.some((wheel) => wheel.axle === 'front' && wheel.contact);
    const rear = this.truck.wheels.some((wheel) => wheel.axle === 'rear' && wheel.contact);
    if (front && rear) return 'DUAL-AXLE CRUSH';
    if (front) return 'FRONT AXLE / YIELD';
    if (rear) return 'SECONDARY CRUSH';
    if (this.truck.x < -1.5) return 'APPROACH';
    if (this.truck.x < 14) return 'WEIGHT TRANSFER';
    if (this.debris.some((piece) => !piece.asleep)) return 'DEBRIS SETTLING';
    return 'PERMANENT RESIDUE';
  }

  diagnostics(): Diagnostics {
    const numeric: number[] = [this.truck.x, this.truck.y, this.truck.z, this.truck.vx, this.truck.vy, this.truck.pitch, this.truck.roll];
    return {
      time: this.time,
      finite: numeric.every(Number.isFinite),
      truck: this.truck,
      cars: this.cars.map((car) => ({
        id: car.id,
        maxDamage: car.maxDamage,
        totalDamage: car.totalDamage,
        frontDamage: car.frontDamage,
        rearDamage: car.rearDamage,
        detached: [...car.detached],
      })),
      debris: this.debris.length,
      contacts: this.truck.wheels.filter((wheel) => wheel.contact).length,
      phase: this.phase,
    };
  }
}
