import * as THREE from 'three';
import { CONFIG, type Weather } from './config';
import { clamp, seededRandom, VoxelBatch } from './utils';

interface Ripple {
  mesh: THREE.Mesh<THREE.RingGeometry, THREE.MeshBasicMaterial>;
  age: number;
  x: number;
  z: number;
}

export function bottleRadiusAt(x: number) {
  if (x < -11.4) return 3.7;
  if (x < -10.6) return 3.7 + (x + 11.4) * 1.55;
  if (x <= 6.4) return 4.94;
  if (x < 8.4) return 4.94 - (x - 6.4) * 0.73;
  return 3.48;
}

export class Ocean {
  readonly group = new THREE.Group();
  readonly surface: THREE.InstancedMesh;
  private volume: THREE.InstancedMesh;
  private columns: { x: number; z: number; bottom: number }[] = [];
  private dummy = new THREE.Object3D();
  private ripples: Ripple[] = [];
  private foam: THREE.InstancedMesh;
  private foamPoints: { x: number; z: number; phase: number; size: number }[] = [];
  private wake: THREE.InstancedMesh;
  private wakePoints: { x: number; z: number; phase: number; angle: number; size: number }[] = [];
  private spray: THREE.InstancedMesh;
  private sprayPoints: { x: number; z: number; phase: number; height: number; drift: number }[] = [];
  private time = 0;
  private amplitude = 1;
  private stormMix = 0;
  private slosh = 0;
  private sloshVelocity = 0;
  private weather: Weather = 'breeze';

  constructor(parent: THREE.Object3D) {
    this.group.name = 'Bounded voxel ocean';
    parent.add(this.group);
    const random = seededRandom(CONFIG.seed + 20);
    const step = CONFIG.waterStep;
    const deep = new THREE.Color(CONFIG.colors.deepWater);
    const mid = new THREE.Color(CONFIG.colors.water);
    const shallow = new THREE.Color(0x398c9d);
    const volumeDeep = new THREE.Color(0x062942);
    const volumeShallow = new THREE.Color(0x0c4d66);
    const color = new THREE.Color();
    for (let x = -10.75; x <= 8.15; x += step) {
      const radius = bottleRadiusAt(x) - 0.12;
      const maxZ = Math.sqrt(Math.max(0, radius * radius - CONFIG.seaLevel * CONFIG.seaLevel)) - 0.16;
      for (let z = -maxZ; z <= maxZ; z += step) {
        const bottom = -Math.sqrt(Math.max(0.2, radius * radius - z * z)) + 0.22;
        this.columns.push({ x, z, bottom });
      }
    }
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.42,
      metalness: 0.04,
      clearcoat: 0.24,
      clearcoatRoughness: 0.3,
      envMapIntensity: 0.34,
    });
    this.surface = new THREE.InstancedMesh(new THREE.BoxGeometry(step * 0.975, 0.22, step * 0.975), material, this.columns.length);
    this.surface.name = 'Clickable ocean surface';
    this.surface.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.surface.castShadow = false;
    this.surface.receiveShadow = true;
    this.columns.forEach((column, index) => {
      const edge = clamp(Math.abs(column.z) / 4.7, 0, 1);
      const current = 0.5 + Math.sin(column.x * 0.42 + column.z * 0.68) * 0.25 + Math.sin(column.x * 0.19 - column.z * 0.37) * 0.15;
      const tone = clamp(0.08 + edge * 0.38 + current * 0.34 + random() * 0.08, 0, 1);
      color.copy(deep).lerp(mid, tone).lerp(shallow, Math.max(0, tone - 0.7) * 0.5);
      color.offsetHSL((random() - 0.5) * 0.008, (random() - 0.5) * 0.035, (random() - 0.5) * 0.018);
      this.surface.setColorAt(index, color);
    });
    if (this.surface.instanceColor) this.surface.instanceColor.needsUpdate = true;
    this.group.add(this.surface);

    const volumeMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      envMapIntensity: 0.16,
    });
    const volume = new THREE.InstancedMesh(new THREE.BoxGeometry(step * 1.001, 1, step * 1.001), volumeMaterial, this.columns.length);
    this.volume = volume;
    this.volume.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.columns.forEach((column, index) => {
      const height = Math.max(0.1, CONFIG.seaLevel - column.bottom - 0.12);
      this.dummy.position.set(column.x, column.bottom + height / 2, column.z);
      this.dummy.scale.set(1, height, 1);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      volume.setMatrixAt(index, this.dummy.matrix);
      const tone = clamp((-column.bottom - 1.2) / 4.2, 0, 1);
      color.copy(volumeShallow).lerp(volumeDeep, tone);
      color.offsetHSL(0, 0, (random() - 0.5) * 0.012);
      volume.setColorAt(index, color);
    });
    if (volume.instanceColor) volume.instanceColor.needsUpdate = true;
    volume.renderOrder = 1;
    this.group.add(volume);

    const skinPositions: number[] = [];
    const skinColors: number[] = [];
    const skinIndices: number[] = [];
    const xSegments = 46;
    const arcSegments = 30;
    const skinTop = CONFIG.seaLevel - 0.08;
    const skinSurface = new THREE.Color(0x0e5b78);
    for (let ix = 0; ix <= xSegments; ix++) {
      const x = -10.75 + ix / xSegments * 18.9;
      const radius = bottleRadiusAt(x) + 0.06;
      const theta0 = Math.asin(clamp(skinTop / radius, -0.9, 0.9));
      for (let j = 0; j <= arcSegments; j++) {
        const theta = theta0 + (-Math.PI - theta0 * 2) * j / arcSegments;
        const y = radius * Math.sin(theta);
        const z = radius * Math.cos(theta);
        skinPositions.push(x, y, z);
        const depth = clamp((skinTop - y) / (radius * 1.35), 0, 1);
        const drift = 0.5 + Math.sin(x * 0.45 + theta * 1.7) * 0.5;
        color.copy(skinSurface).lerp(volumeDeep, clamp(depth * 0.9 + drift * 0.08, 0, 1));
        color.offsetHSL(0, 0, (drift - 0.5) * 0.025);
        skinColors.push(color.r, color.g, color.b);
        if (ix < xSegments && j < arcSegments) {
          const a = ix * (arcSegments + 1) + j;
          const b = a + arcSegments + 1;
          skinIndices.push(a, a + 1, b, b, a + 1, b + 1);
        }
      }
    }
    const skinGeometry = new THREE.BufferGeometry();
    skinGeometry.setAttribute('position', new THREE.Float32BufferAttribute(skinPositions, 3));
    skinGeometry.setAttribute('color', new THREE.Float32BufferAttribute(skinColors, 3));
    skinGeometry.setIndex(skinIndices);
    skinGeometry.computeVertexNormals();
    const skin = new THREE.Mesh(skinGeometry, new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.67,
      metalness: 0,
      envMapIntensity: 0.14,
      side: THREE.DoubleSide,
    }));
    skin.name = 'Continuous deep-blue water wall';
    skin.renderOrder = 2;
    this.group.add(skin);

    const foamMaterial = new THREE.MeshStandardMaterial({ color: CONFIG.colors.foam, roughness: 0.68, transparent: true, opacity: 0.82, depthWrite: false });
    for (let i = 0; i < 145; i++) {
      const column = this.columns[Math.floor(random() * this.columns.length)];
      this.foamPoints.push({ x: column.x, z: column.z, phase: random() * Math.PI * 2, size: 0.65 + random() * 0.7 });
    }
    this.foam = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.05, 0.12), foamMaterial, this.foamPoints.length);
    this.foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.foam.renderOrder = 3;
    this.group.add(this.foam);

    for (let i = 0; i < 64; i++) {
      const side = i < 32 ? -1 : 1;
      const u = (i % 32) / 31;
      const x = -4.15 + u * 8.25;
      const z = 0.25 + side * (0.92 + Math.sin(u * Math.PI) * 0.28 + random() * 0.16);
      this.wakePoints.push({ x, z, phase: random() * Math.PI * 2, angle: side * 0.18 + (random() - 0.5) * 0.35, size: 0.7 + random() * 0.65 });
    }
    this.wake = new THREE.InstancedMesh(new THREE.BoxGeometry(0.26, 0.06, 0.13), foamMaterial.clone(), this.wakePoints.length);
    this.wake.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.wake.renderOrder = 3;
    this.group.add(this.wake);

    for (let i = 0; i < 34; i++) {
      const bow = i < 22;
      this.sprayPoints.push({
        x: bow ? 3.55 + random() * 1.05 : -4.25 + random() * 0.45,
        z: 0.25 + (random() - 0.5) * (bow ? 1.75 : 1.3),
        phase: random(),
        height: 0.18 + random() * 0.36,
        drift: 0.12 + random() * 0.3,
      });
    }
    const sprayMaterial = new THREE.MeshStandardMaterial({ color: 0xe0f2ed, roughness: 0.5, transparent: true, opacity: 0.74, depthWrite: false });
    this.spray = new THREE.InstancedMesh(new THREE.BoxGeometry(0.065, 0.1, 0.065), sprayMaterial, this.sprayPoints.length);
    this.spray.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.spray.renderOrder = 3;
    this.group.add(this.spray);

    for (let i = 0; i < 14; i++) {
      const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xb9eee3, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 48), rippleMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 3;
      this.group.add(mesh);
      this.ripples.push({ mesh, age: 99, x: 0, z: 0 });
    }
    this.update(0, 1 / 60, 'breeze', 0, 0, false);
  }

  private rawWave(x: number, z: number, t: number) {
    const long = Math.sin(x * 0.48 + z * 0.19 + t * 0.82 + Math.sin(z * 0.34) * 0.45) * 0.105;
    const cross = Math.sin(z * 1.12 - t * 1.04 + x * 0.17 + Math.sin(x * 0.28 + t * 0.21) * 0.55) * 0.07;
    const uneven = Math.sin((x + z) * 0.61 + t * 0.67) * 0.035 + Math.sin(x * 0.23 - z * 0.44 - t * 0.39) * 0.025;
    const stormSwell = Math.sin(x * 0.94 + z * 0.52 + t * 1.66) * 0.1;
    const chop = Math.sin(x * 1.86 - z * 0.77 + t * 2.3 + Math.sin(z * 0.63)) * 0.055;
    const peak = Math.pow(Math.max(0, Math.sin(x * 1.18 + z * 0.41 + t * 1.9)), 3) * 0.08;
    return (long + cross + uneven) * (1 - this.stormMix * 0.25) + this.stormMix * (stormSwell + chop + peak);
  }

  get waveAmplitude() { return this.amplitude; }

  sample(x: number, z: number) {
    let wave = this.rawWave(x, z, this.time) * this.amplitude + this.slosh * x * 0.14;
    for (const ripple of this.ripples) {
      if (ripple.age > 2.2) continue;
      const distance = Math.hypot(x - ripple.x, z - ripple.z);
      wave += Math.sin(distance * 8 - ripple.age * 8) * Math.exp(-distance * 1.3) * 0.045 * (1 - ripple.age / 2.2);
    }
    const halfStep = CONFIG.waterStep * 0.5;
    const radius = Math.min(bottleRadiusAt(x - halfStep), bottleRadiusAt(x + halfStep)) - 0.24;
    const edgeZ = Math.min(Math.abs(z) + halfStep, radius - 0.02);
    const verticalLimit = Math.sqrt(Math.max(0.01, radius * radius - edgeZ * edgeZ));
    const lower = -verticalLimit + 0.16 - CONFIG.seaLevel;
    const upper = verticalLimit - 0.16 - CONFIG.seaLevel;
    return clamp(wave, Math.max(-0.55, Math.min(0, lower)), Math.min(0.72, Math.max(0, upper)));
  }

  addRipple(x: number, z: number) {
    const ripple = this.ripples.reduce((oldest, item) => item.age > oldest.age ? item : oldest, this.ripples[0]);
    ripple.age = 0;
    ripple.x = clamp(x, -10.4, 7.7);
    ripple.z = clamp(z, -4.2, 4.2);
    ripple.mesh.visible = true;
  }

  update(t: number, dt: number, weather: Weather, bottleAngle: number, bottleVelocity: number, reducedMotion: boolean) {
    this.time = t;
    this.weather = weather;
    this.stormMix = THREE.MathUtils.damp(this.stormMix, weather === 'storm' ? 1 : 0, 2.1, dt);
    const targetAmplitude = (weather === 'calm' ? 0.38 : weather === 'storm' ? 1.95 : 1) * (reducedMotion ? 0.35 : 1);
    this.amplitude = THREE.MathUtils.damp(this.amplitude, targetAmplitude, 2.5, dt);
    const sloshTarget = -bottleAngle * 0.8 - bottleVelocity * 0.045;
    this.sloshVelocity += ((sloshTarget - this.slosh) * 7.2 - this.sloshVelocity * 3.3) * dt;
    this.slosh += this.sloshVelocity * dt;
    this.columns.forEach((column, index) => {
      const wave = this.sample(column.x, column.z);
      const surfaceY = CONFIG.seaLevel + wave - 0.06;
      const surfaceScaleY = 1 + Math.max(0, wave) * (0.45 + this.stormMix * 0.35);
      this.dummy.position.set(column.x, surfaceY, column.z);
      this.dummy.scale.set(1, surfaceScaleY, 1);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.surface.setMatrixAt(index, this.dummy.matrix);
      const surfaceBottom = surfaceY - 0.11 * surfaceScaleY;
      const height = Math.max(0.04, surfaceBottom - column.bottom);
      this.dummy.position.set(column.x, column.bottom + height / 2, column.z);
      this.dummy.scale.set(1, height, 1);
      this.dummy.updateMatrix();
      this.volume.setMatrixAt(index, this.dummy.matrix);
    });
    this.surface.instanceMatrix.needsUpdate = true;
    this.volume.instanceMatrix.needsUpdate = true;
    const calmScale = weather === 'calm' ? 0.35 : 1;
    this.foamPoints.forEach((point, index) => {
      const wave = this.sample(point.x, point.z);
      const crest = clamp((wave / this.amplitude - (0.09 - this.stormMix * 0.035)) * 12, 0, 1);
      const pulse = 0.45 + (0.5 + Math.sin(t * 2.1 + point.phase) * 0.5) * 0.55;
      const scale = Math.max(0.001, crest * pulse * point.size * (0.8 + this.stormMix * 0.65) * calmScale);
      this.dummy.position.set(point.x, CONFIG.seaLevel + wave + 0.09, point.z);
      this.dummy.scale.set(scale * 1.65, scale, scale);
      this.dummy.rotation.set(0, point.phase, 0);
      this.dummy.updateMatrix();
      this.foam.setMatrixAt(index, this.dummy.matrix);
    });
    this.foam.instanceMatrix.needsUpdate = true;
    this.wakePoints.forEach((point, index) => {
      const wave = this.sample(point.x, point.z);
      const pulse = 0.45 + (0.5 + Math.sin(t * 2.8 + point.phase) * 0.5) * 0.55;
      const scale = Math.max(0.001, point.size * pulse * (0.5 + this.stormMix * 0.55) * calmScale);
      this.dummy.position.set(point.x, CONFIG.seaLevel + wave + 0.105, point.z);
      this.dummy.scale.set(scale * 1.35, scale, scale);
      this.dummy.rotation.set(0, point.angle, 0);
      this.dummy.updateMatrix();
      this.wake.setMatrixAt(index, this.dummy.matrix);
    });
    this.wake.instanceMatrix.needsUpdate = true;
    this.sprayPoints.forEach((point, index) => {
      const progress = (t * (0.42 + this.stormMix * 0.3) + point.phase) % 1;
      const arc = Math.sin(progress * Math.PI);
      const scale = Math.max(0.001, arc * (0.42 + this.stormMix * 0.75) * calmScale);
      const wave = this.sample(point.x, point.z);
      this.dummy.position.set(point.x + progress * point.drift, CONFIG.seaLevel + wave + 0.1 + arc * point.height * (0.65 + this.stormMix * 0.65), point.z);
      this.dummy.scale.set(scale, scale * (1 + arc * 0.6), scale);
      this.dummy.rotation.set(0, point.phase * Math.PI * 2, 0);
      this.dummy.updateMatrix();
      this.spray.setMatrixAt(index, this.dummy.matrix);
    });
    this.spray.instanceMatrix.needsUpdate = true;
    for (const ripple of this.ripples) {
      ripple.age += dt;
      if (ripple.age > 2.2) {
        ripple.mesh.visible = false;
        continue;
      }
      const scale = 0.12 + ripple.age * 0.83;
      ripple.mesh.scale.setScalar(scale);
      ripple.mesh.position.set(ripple.x, CONFIG.seaLevel + this.sample(ripple.x, ripple.z) + 0.11, ripple.z);
      ripple.mesh.material.opacity = (1 - ripple.age / 2.2) * 0.58;
    }
  }

  setLighting(darkness: number) {
    const material = this.surface.material as THREE.MeshPhysicalMaterial;
    material.emissive.setHex(0x061f38);
    material.emissiveIntensity = darkness * 0.2;
    const foamColor = darkness > 0.5 ? 0xa9ced0 : CONFIG.colors.foam;
    (this.foam.material as THREE.MeshStandardMaterial).color.setHex(foamColor);
    (this.wake.material as THREE.MeshStandardMaterial).color.setHex(foamColor);
    (this.spray.material as THREE.MeshStandardMaterial).color.setHex(darkness > 0.5 ? 0xb7d8d8 : 0xe0f2ed);
  }

  reset() {
    this.amplitude = 1;
    this.stormMix = 0;
    this.slosh = this.sloshVelocity = 0;
    for (const ripple of this.ripples) {
      ripple.age = 99;
      ripple.mesh.visible = false;
    }
  }
}
