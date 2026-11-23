import * as THREE from 'three';
import { CONFIG, type Weather } from './config';
import type { Ship } from './ship';
import { bottleRadiusAt } from './ocean';
import { box, radialTexture, seededRandom, standard, VoxelBatch } from './utils';

interface SmokeParticle {
  sprite: THREE.Sprite;
  velocity: THREE.Vector3;
  age: number;
}
interface Dolphin { group: THREE.Group; offset: number; lane: number }
interface Barrel { group: THREE.Group; age: number; x: number; z: number; phase: number }
interface Gull { group: THREE.Group; left: THREE.Group; right: THREE.Group; phase: number }

export class Effects {
  private smoke: SmokeParticle[] = [];
  private dolphins: Dolphin[] = [];
  private barrels: Barrel[] = [];
  private gulls: Gull[] = [];
  private dolphinStart = -100;
  private flash = new THREE.PointLight(0xffb457, 0, 9, 2);
  private rain: THREE.LineSegments;
  private rainDrops: { x: number; initialX: number; y: number; initialY: number; z: number; initialZ: number; speed: number }[] = [];
  private splash: THREE.Points;
  private splashParticles: { position: THREE.Vector3; velocity: THREE.Vector3; age: number }[] = [];
  private barrelCounter = 0;

  constructor(private assembly: THREE.Group) {
    const smokeTexture = radialTexture('226,225,214');
    for (let i = 0; i < 36; i++) {
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTexture, transparent: true, opacity: 0, depthWrite: false, color: 0xe1ddd0 }));
      sprite.visible = false;
      assembly.add(sprite);
      this.smoke.push({ sprite, velocity: new THREE.Vector3(), age: 99 });
    }
    assembly.add(this.flash);
    for (let i = 0; i < 3; i++) this.dolphins.push(this.createDolphin(i));
    for (let i = 0; i < 5; i++) this.barrels.push(this.createBarrel(i));
    for (let i = 0; i < 3; i++) this.createGull(i);
    this.rain = this.createRain();
    this.splash = this.createSplashPool();
  }

  private createDolphin(index: number): Dolphin {
    const group = new THREE.Group();
    const batch = new VoxelBatch();
    batch.add(0, 0, 0, 0.9, 0.34, 0.36, 0x527e91);
    batch.add(0.45, 0.04, 0, 0.42, 0.3, 0.3, 0x618b9b);
    batch.add(0.76, -0.02, 0, 0.32, 0.13, 0.15, 0x769aa5);
    batch.add(0.1, -0.18, 0, 0.66, 0.09, 0.29, 0xb4c9c6);
    batch.add(-0.6, 0, 0, 0.42, 0.19, 0.21, 0x4a7488);
    batch.add(-0.91, 0.08, 0, 0.3, 0.09, 0.48, 0x527e91, [0.18, 0, 0]);
    batch.add(-0.06, 0.25, 0, 0.28, 0.32, 0.09, 0x426b80, [0, 0, -0.45]);
    batch.add(0.1, -0.18, 0.25, 0.26, 0.08, 0.31, 0x4a7488, [0.3, 0.2, 0]);
    batch.add(0.1, -0.18, -0.25, 0.26, 0.08, 0.31, 0x4a7488, [-0.3, -0.2, 0]);
    batch.add(0.58, 0.12, 0.15, 0.04, 0.04, 0.04, 0x172c35);
    group.add(batch.build());
    group.scale.setScalar(0.82 + index * 0.08);
    group.visible = false;
    this.assembly.add(group);
    return { group, offset: index * 0.63, lane: index * 0.48 };
  }

  private createBarrel(index: number): Barrel {
    const group = new THREE.Group();
    const wood = standard(index % 2 ? 0x805334 : 0x926441, 0.85);
    const hoops = standard(0x3c4443, 0.42, 0.65);
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.48, 10), wood);
    body.castShadow = true;
    group.add(body);
    for (const y of [-0.18, 0, 0.18]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.218, 0.022, 5, 12), hoops);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = y;
      group.add(ring);
    }
    group.visible = false;
    this.assembly.add(group);
    return { group, age: 99, x: 0, z: 0, phase: index * 1.7 };
  }

  private createGull(index: number) {
    const group = new THREE.Group();
    const white = standard(0xd8ded6, 0.9);
    const dark = standard(0x59636a, 0.9);
    box(group, [0.13, 0.12, 0.32], [0, 0, 0], white);
    box(group, [0.1, 0.1, 0.12], [0, 0.06, 0.19], white);
    box(group, [0.07, 0.045, 0.12], [0, 0.03, 0.29], standard(0xc69c58));
    const left = new THREE.Group();
    const right = new THREE.Group();
    box(left, [0.4, 0.045, 0.18], [-0.2, 0, 0], white);
    box(left, [0.16, 0.047, 0.15], [-0.43, -0.01, -0.02], dark, [0, 0.2, 0]);
    box(right, [0.4, 0.045, 0.18], [0.2, 0, 0], white);
    box(right, [0.16, 0.047, 0.15], [0.43, -0.01, -0.02], dark, [0, -0.2, 0]);
    group.add(left, right);
    group.scale.setScalar(0.8);
    this.assembly.add(group);
    this.gulls.push({ group, left, right, phase: index * 2.1 });
  }

  private createRain() {
    const random = seededRandom(5199);
    const count = 150;
    const positions = new Float32Array(count * 6);
    for (let i = 0; i < count; i++) {
      const y = CONFIG.seaLevel + random() * 6;
      const x = -10.5 + random() * 17.5;
      const z = -3.8 + random() * 7.6;
      this.rainDrops.push({ x, initialX: x, y, initialY: y, z, initialZ: z, speed: 4.5 + random() * 3 });
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const rain = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xa9c8d4, transparent: true, opacity: 0, depthWrite: false }));
    this.assembly.add(rain);
    return rain;
  }

  private createSplashPool() {
    const count = 180;
    const positions = new Float32Array(count * 3);
    positions.fill(-100);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd0f1e8, size: 0.085, transparent: true, opacity: 0.82, depthWrite: false }));
    this.assembly.add(points);
    for (let i = 0; i < count; i++) this.splashParticles.push({ position: new THREE.Vector3(-100, -100, -100), velocity: new THREE.Vector3(), age: 99 });
    return points;
  }

  spawnSplash(position: THREE.Vector3, count = 20, force = 1) {
    let spawned = 0;
    for (const particle of this.splashParticles) {
      if (particle.age < 1.2) continue;
      particle.age = 0;
      particle.position.copy(position);
      const angle = spawned / count * Math.PI * 2 + Math.sin(spawned * 7.3);
      const speed = (0.45 + (spawned % 7) / 7) * force;
      particle.velocity.set(Math.cos(angle) * speed, (1.1 + (spawned % 5) * 0.19) * force, Math.sin(angle) * speed);
      if (++spawned >= count) break;
    }
  }

  fire(ship: Ship, t: number) {
    ship.group.updateMatrixWorld(true);
    this.assembly.updateMatrixWorld(true);
    let particleIndex = 0;
    for (const muzzle of ship.muzzles) {
      const position = ship.group.localToWorld(muzzle.clone());
      this.assembly.worldToLocal(position);
      this.flash.position.copy(position);
      for (let j = 0; j < 7; j++) {
        const particle = this.smoke[particleIndex++ % this.smoke.length];
        particle.age = -j * 0.035;
        particle.sprite.position.copy(position);
        particle.sprite.position.x += Math.sin(j * 4.1) * 0.07;
        particle.velocity.set(0.12 + j * 0.025, 0.32 + (j % 3) * 0.12, 0.72 + (j % 4) * 0.12);
        particle.sprite.scale.setScalar(0.25 + j * 0.035);
        particle.sprite.visible = true;
      }
      this.spawnSplash(position.clone().add(new THREE.Vector3(0, -0.1, 0.5)), 3, 0.4);
    }
    this.flash.intensity = 45;
  }

  summonDolphins(t: number) {
    this.dolphinStart = t;
  }

  dropBarrel(t: number) {
    const barrel = this.barrels[this.barrelCounter++ % this.barrels.length];
    barrel.age = 0;
    barrel.x = 2.7 + (this.barrelCounter % 3) * 0.48;
    barrel.z = 2.2 + (this.barrelCounter % 2) * 0.38;
    barrel.group.visible = true;
    barrel.group.position.set(barrel.x, CONFIG.seaLevel + 3.1, barrel.z);
  }

  update(t: number, dt: number, weather: Weather, wave: (x: number, z: number) => number, reducedMotion: boolean) {
    const motion = reducedMotion ? 0.25 : 1;
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 190);
    for (const particle of this.smoke) {
      particle.age += dt;
      if (particle.age < 0) continue;
      if (particle.age > 2.1) {
        particle.sprite.visible = false;
        continue;
      }
      particle.sprite.position.addScaledVector(particle.velocity, dt * motion);
      particle.velocity.multiplyScalar(Math.max(0, 1 - dt * 0.85));
      particle.velocity.y += dt * 0.08;
      const scale = particle.sprite.scale.x + dt * 0.48;
      particle.sprite.scale.setScalar(scale);
      particle.sprite.material.opacity = Math.max(0, 0.68 * (1 - particle.age / 2.1));
    }
    this.dolphins.forEach((dolphin) => {
      const progress = (t - this.dolphinStart - dolphin.offset) / 4.4;
      if (progress < 0 || progress > 1) {
        dolphin.group.visible = false;
        return;
      }
      dolphin.group.visible = true;
      const x = -4.8 + progress * 9.5;
      const z = 2.35 + dolphin.lane + Math.sin(progress * Math.PI * 2) * 0.2;
      const arc = Math.sin(progress * Math.PI);
      const y = CONFIG.seaLevel + wave(x, z) + arc * (1.45 + dolphin.lane * 0.2) - 0.06;
      dolphin.group.position.set(x, y, z);
      dolphin.group.rotation.z = Math.atan2(Math.cos(progress * Math.PI) * 1.45 * Math.PI, 9.5) * 1.25;
      dolphin.group.rotation.y = -0.06;
      if ((progress < 0.07 && progress + dt / 4.4 >= 0.07) || (progress > 0.93 && progress - dt / 4.4 <= 0.93)) {
        this.spawnSplash(new THREE.Vector3(x, CONFIG.seaLevel + wave(x, z), z), 24, 1.1);
      }
    });
    for (const barrel of this.barrels) {
      if (!barrel.group.visible) continue;
      barrel.age += dt;
      if (barrel.age > 35) {
        barrel.group.visible = false;
        continue;
      }
      const water = CONFIG.seaLevel + wave(barrel.x, barrel.z);
      const drop = barrel.age < 0.75 ? 3.1 * Math.pow(1 - barrel.age / 0.75, 2) : 0;
      const bob = Math.sin(barrel.age * 5 + barrel.phase) * Math.exp(-barrel.age * 1.8) * 0.35;
      barrel.group.position.set(barrel.x + Math.sin(barrel.age * 0.35 + barrel.phase) * 0.12, water + 0.15 + drop + bob, barrel.z);
      barrel.group.rotation.x = Math.sin(t * 1.7 + barrel.phase) * 0.18 * motion;
      barrel.group.rotation.z = Math.cos(t * 1.4 + barrel.phase) * 0.15 * motion;
      if (barrel.age > 0.7 && barrel.age - dt <= 0.7) this.spawnSplash(new THREE.Vector3(barrel.x, water, barrel.z), 26, 1.2);
    }
    this.gulls.forEach((gull, index) => {
      const angle = t * (0.24 + index * 0.025) * motion + gull.phase;
      gull.group.position.set(-1.8 + Math.cos(angle) * (4.2 - index * 0.4), 3.7 + Math.sin(t * 0.7 + index) * 0.25, -1.7 + Math.sin(angle) * 1.2);
      gull.group.rotation.y = -angle;
      const flap = Math.sin(t * 5.8 + gull.phase) * 0.38 * motion;
      gull.left.rotation.z = flap;
      gull.right.rotation.z = -flap;
    });
    const rainMaterial = this.rain.material as THREE.LineBasicMaterial;
    rainMaterial.opacity = THREE.MathUtils.damp(rainMaterial.opacity, weather === 'storm' ? 0.42 : 0, 4, dt);
    if (rainMaterial.opacity > 0.01) {
      const positions = this.rain.geometry.attributes.position as THREE.BufferAttribute;
      this.rainDrops.forEach((drop, index) => {
        drop.y -= drop.speed * dt * motion;
        if (drop.y < CONFIG.seaLevel) {
          drop.x = -10.3 + ((index * 3.71 + t * 0.37) % 17.2);
          drop.z = Math.sin(index * 12.3 + Math.floor(t)) * 2.8;
          drop.y = Math.min(4.55, bottleRadiusAt(drop.x) - 0.3);
        }
        const radius = bottleRadiusAt(drop.x) - 0.2;
        const lowerY = Math.min(drop.y, radius - 0.08);
        const upperY = Math.min(drop.y + 0.38, radius - 0.08);
        const lowerLimit = Math.max(0, Math.sqrt(Math.max(0, radius * radius - lowerY * lowerY)) - 0.06);
        const upperLimit = Math.max(0, Math.sqrt(Math.max(0, radius * radius - upperY * upperY)) - 0.06);
        positions.setXYZ(index * 2, drop.x, lowerY, THREE.MathUtils.clamp(drop.z, -lowerLimit, lowerLimit));
        positions.setXYZ(index * 2 + 1, drop.x, upperY, THREE.MathUtils.clamp(drop.z, -upperLimit, upperLimit));
      });
      positions.needsUpdate = true;
    }
    const splashPositions = this.splash.geometry.attributes.position as THREE.BufferAttribute;
    this.splashParticles.forEach((particle, index) => {
      particle.age += dt;
      if (particle.age > 1.2) {
        splashPositions.setXYZ(index, -100, -100, -100);
        return;
      }
      particle.velocity.y -= dt * 3.2;
      particle.position.addScaledVector(particle.velocity, dt * motion);
      splashPositions.setXYZ(index, particle.position.x, particle.position.y, particle.position.z);
    });
    splashPositions.needsUpdate = true;
  }

  lightningAt(t: number, weather: Weather) {
    if (weather !== 'storm') return 0;
    const phase = t % 8.7;
    return phase < 0.09 ? 1 - phase / 0.09 : phase > 0.19 && phase < 0.27 ? 0.65 * (1 - (phase - 0.19) / 0.08) : 0;
  }

  reset() {
    this.dolphinStart = -100;
    this.flash.intensity = 0;
    for (const particle of this.smoke) { particle.age = 99; particle.sprite.visible = false; }
    for (const dolphin of this.dolphins) dolphin.group.visible = false;
    for (const barrel of this.barrels) { barrel.age = 99; barrel.group.visible = false; }
    this.barrelCounter = 0;
    const splashPositions = this.splash.geometry.attributes.position as THREE.BufferAttribute;
    this.splashParticles.forEach((particle, index) => {
      particle.age = 99;
      particle.position.set(-100, -100, -100);
      particle.velocity.set(0, 0, 0);
      splashPositions.setXYZ(index, -100, -100, -100);
    });
    splashPositions.needsUpdate = true;
    for (const drop of this.rainDrops) {
      drop.x = drop.initialX;
      drop.y = drop.initialY;
      drop.z = drop.initialZ;
    }
    (this.rain.material as THREE.LineBasicMaterial).opacity = 0;
  }
}
