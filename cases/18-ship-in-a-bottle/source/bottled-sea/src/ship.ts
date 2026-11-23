import * as THREE from 'three';
import { CONFIG } from './config';
import { VoxelBatch, box, canvasTexture, cylinder, rod, seededRandom, standard } from './utils';

interface AnimatedCloth {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
  base: Float32Array;
  phase: number;
  strength: number;
}

function sailTexture(emblem: boolean) {
  const random = seededRandom(emblem ? 671 : 872);
  return canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#e9e1c9';
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 1800; i++) {
      const shade = 185 + Math.floor(random() * 45);
      ctx.fillStyle = `rgba(${shade},${shade - 7},${shade - 20},.08)`;
      ctx.fillRect(random() * 512, random() * 512, 1, 3 + random() * 4);
    }
    ctx.strokeStyle = 'rgba(116,98,67,.22)';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 85) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 512); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,252,230,.3)';
      ctx.beginPath(); ctx.moveTo(x + 3, 0); ctx.lineTo(x + 3, 512); ctx.stroke();
      ctx.strokeStyle = 'rgba(116,98,67,.22)';
    }
    ctx.strokeStyle = 'rgba(105,88,58,.38)';
    ctx.lineWidth = 7;
    ctx.strokeRect(3, 3, 506, 506);
    ctx.setLineDash([4, 6]);
    ctx.lineWidth = 2;
    ctx.strokeRect(11, 11, 490, 490);
    ctx.setLineDash([]);
    if (emblem) {
      ctx.save();
      ctx.translate(256, 261);
      ctx.strokeStyle = 'rgba(45,68,75,.68)';
      ctx.fillStyle = 'rgba(45,68,75,.68)';
      ctx.lineWidth = 15;
      ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc(0, -91, 21, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -66); ctx.lineTo(0, 87); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-65, -20); ctx.lineTo(65, -20); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 28, 88, 0.18, Math.PI - 0.18); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-86, 43); ctx.lineTo(-87, 3); ctx.lineTo(-54, 26); ctx.fill();
      ctx.beginPath(); ctx.moveTo(86, 43); ctx.lineTo(87, 3); ctx.lineTo(54, 26); ctx.fill();
      ctx.restore();
    }
  });
}

function makeCloth(width: number, height: number, material: THREE.Material, phase: number, triangular = false): AnimatedCloth {
  const columns = 14;
  const rows = 10;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row <= rows; row++) {
    const v = row / rows;
    for (let column = 0; column <= columns; column++) {
      const u = column / columns;
      const taper = triangular ? 1 - v * 0.88 : 0.91 + Math.sin(v * Math.PI) * 0.09;
      const z = (u - 0.5) * width * taper;
      const y = (0.5 - v) * height;
      const billow = Math.sin(u * Math.PI) * width * (0.045 + Math.sin(v * Math.PI) * 0.13 + v * 0.055);
      const belly = Math.sin(u * Math.PI) * Math.sin(v * Math.PI) * height * 0.025;
      positions.push(billow, y - belly, z);
      uvs.push(u, 1 - v);
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column;
    const b = a + columns + 1;
    indices.push(a, b, a + 1, b, b + 1, a + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return { mesh, base: new Float32Array(positions), phase, strength: width * 0.018 };
}

export class Ship {
  readonly group = new THREE.Group();
  readonly muzzles: THREE.Vector3[] = [];
  private cloth: AnimatedCloth[] = [];
  private flags: AnimatedCloth[] = [];
  private velocityY = 0;
  private velocityPitch = 0;
  private velocityRoll = 0;
  private lanterns: THREE.MeshStandardMaterial[] = [];
  private lanternLights: { light: THREE.PointLight; power: number }[] = [];

  constructor() {
    this.group.name = 'S.V. Kestrel';
    this.group.position.set(-0.15, CONFIG.seaLevel + 0.63, 0.25);
    this.group.rotation.y = -0.11;
    this.buildHull();
    this.buildRig();
    this.buildDetails();
  }

  private buildHull() {
    const hull = new VoxelBatch();
    const random = seededRandom(1742);
    const step = 0.27;
    const hullColors = [0x5c3022, 0x6b3826, 0x78452d, 0x865137, 0x693a28];
    for (let x = -4.25; x <= 4.26; x += step) {
      const u = (x + 4.25) / 8.5;
      const taper = Math.pow(Math.sin(Math.PI * (0.1 + u * 0.86)), 0.48);
      const halfWidth = (0.32 + taper * 0.93) * (u > 0.84 ? 1 - (u - 0.84) * 2.8 : 1);
      for (let layer = 0; layer < 5; layer++) {
        const y = -0.62 + layer * 0.245;
        const layerWidth = halfWidth * (0.48 + layer * 0.13);
        for (let z = -layerWidth; z <= layerWidth + 0.01; z += step) {
          const edge = Math.abs(z) > layerWidth - step * 1.15;
          if (!edge && layer !== 0 && layer !== 4) continue;
          let color = hullColors[Math.floor(random() * hullColors.length)];
          if (layer === 1 && edge) color = 0x9a7744;
          if (layer === 4) color = random() > 0.5 ? 0xb17f4f : 0xbc8957;
          hull.add(x, y, z, step * 0.97, 0.235, step * 0.97, color);
        }
      }
      for (const side of [-1, 1]) {
        hull.add(x, 0.63, side * halfWidth, step * 0.97, 0.24, 0.18, 0x4d2e20);
        if (Math.round((x + 4.25) / step) % 3 === 0) {
          hull.add(x, 0.84, side * halfWidth, 0.09, 0.48, 0.09, 0x805334);
        }
      }
    }
    for (let x = -4.05; x < -2.75; x += step) {
      for (let z = -0.85; z <= 0.85; z += step) {
        hull.add(x, 0.74, z, step * 0.97, 0.22, step * 0.97, 0x96633e);
        if (Math.abs(z) > 0.58) hull.add(x, 1.03, z, step * 0.97, 0.36, step * 0.97, 0x7d3b2d);
      }
    }
    for (let x = 3.3; x < 4.0; x += step) for (let z = -0.45; z <= 0.45; z += step) {
      hull.add(x, 0.66 + (x - 3.3) * 0.35, z, step * 0.97, 0.22, step * 0.97, 0xa47145);
    }
    this.group.add(hull.build(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.72, metalness: 0.02 })));
  }

  private buildRig() {
    const mastMaterial = standard(0x5b3822, 0.72);
    const yardMaterial = standard(0x473021, 0.76);
    const riggingMaterial = standard(0x756047, 0.86);
    const sailPlain = new THREE.MeshStandardMaterial({
      map: sailTexture(false), roughness: 0.93, side: THREE.DoubleSide, color: 0xfff8e6,
    });
    const sailEmblem = new THREE.MeshStandardMaterial({
      map: sailTexture(true), roughness: 0.93, side: THREE.DoubleSide, color: 0xfff8e6,
    });
    const rigs = [
      { x: 2.15, height: 3.75, sails: [[1.95, 2.15, 1.22], [3.15, 1.55, 0.82]] },
      { x: -0.15, height: 4.75, sails: [[2.1, 2.75, 1.52], [3.65, 2.08, 1.02], [4.43, 1.28, 0.57]] },
      { x: -2.48, height: 3.48, sails: [[1.92, 2.0, 1.13], [2.99, 1.43, 0.74]] },
    ];
    const linePositions: number[] = [];
    const line = (a: THREE.Vector3, b: THREE.Vector3) => linePositions.push(...a.toArray(), ...b.toArray());
    rigs.forEach((rig, rigIndex) => {
      cylinder(this.group, 0.055, 0.085, rig.height, [rig.x, rig.height / 2 + 0.55, 0], mastMaterial, 10);
      const top = new THREE.Vector3(rig.x, rig.height + 0.48, 0);
      for (const side of [-1, 1]) {
        const foot = new THREE.Vector3(rig.x - 0.48, 0.6, side * 0.93);
        line(top, foot);
        rod(this.group, top, foot, 0.013, riggingMaterial);
        line(top, new THREE.Vector3(rig.x + 0.55, 0.6, side * 0.92));
        for (let rung = 0; rung < 9; rung++) {
          const f = 0.12 + rung * 0.075;
          const a = top.clone().lerp(foot, f);
          const b = top.clone().lerp(new THREE.Vector3(rig.x + 0.55, 0.6, side * 0.92), f);
          line(a, b);
        }
      }
      line(top, new THREE.Vector3(rigIndex === 2 ? -4.25 : 4.65, 0.83, 0));
      rig.sails.forEach(([y, width, height], sailIndex) => {
        rod(this.group, new THREE.Vector3(rig.x, y + height * 0.52, -width * 0.62), new THREE.Vector3(rig.x, y + height * 0.52, width * 0.62), 0.043, yardMaterial);
        const sail = makeCloth(width, height, rigIndex === 1 && sailIndex === 0 ? sailEmblem : sailPlain, rigIndex * 1.7 + sailIndex * 0.8);
        sail.mesh.position.set(rig.x + 0.045, y, 0);
        this.group.add(sail.mesh);
        this.cloth.push(sail);
        for (const side of [-1, 1]) {
          line(new THREE.Vector3(rig.x, y + height * 0.5, side * width * 0.55), new THREE.Vector3(rig.x - 0.38, 0.63, side * 0.86));
        }
      });
      const flag = makeCloth(0.72, 0.33, new THREE.MeshStandardMaterial({ color: rigIndex === 1 ? 0x9c342d : 0xb99a56, roughness: 0.9, side: THREE.DoubleSide }), rigIndex, true);
      flag.mesh.rotation.y = Math.PI / 2;
      flag.mesh.position.set(rig.x - 0.33, rig.height + 0.55, 0);
      this.group.add(flag.mesh);
      this.flags.push(flag);
    });
    rod(this.group, new THREE.Vector3(3.65, 0.68, 0), new THREE.Vector3(5.12, 1.28, 0), 0.065, mastMaterial);
    rod(this.group, new THREE.Vector3(2.15, 4.1, 0), new THREE.Vector3(5.12, 1.28, 0), 0.018, riggingMaterial);
    rod(this.group, new THREE.Vector3(-0.15, 5.05, 0), new THREE.Vector3(5.12, 1.28, 0), 0.018, riggingMaterial);
    const rigging = new THREE.BufferGeometry();
    rigging.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    this.group.add(new THREE.LineSegments(rigging, new THREE.LineBasicMaterial({ color: 0x8a7357, transparent: true, opacity: 0.9 })));
    cylinder(this.group, 0.28, 0.32, 0.11, [-0.15, 3.62, 0], standard(0x5d3522), 12);
  }

  private buildDetails() {
    const darkMetal = standard(0x25282a, 0.38, 0.65);
    const brass = standard(0xb49151, 0.32, 0.72);
    const wood = standard(0x6b4228, 0.78);
    for (const x of [-2.45, -0.9, 0.75, 2.3]) for (const side of [-1, 1]) {
      const cannon = cylinder(this.group, 0.09, 0.13, 0.66, [x, 0.45, side * 1.08], darkMetal, 10);
      cannon.rotation.x = Math.PI / 2;
      box(this.group, [0.36, 0.17, 0.4], [x, 0.23, side * 0.85], wood);
      if (side === 1) this.muzzles.push(new THREE.Vector3(x, 0.46, 1.49));
    }
    for (const x of [-3.73, -3.22, -2.72]) {
      const material = new THREE.MeshStandardMaterial({ color: 0xf2c878, emissive: 0xffb44e, emissiveIntensity: 0.15, roughness: 0.4 });
      this.lanterns.push(material);
      box(this.group, [0.26, 0.29, 0.045], [x, 0.93, 0.89], material);
    }
    box(this.group, [0.8, 0.13, 0.67], [-0.55, 0.62, 0], standard(0x4c2f21));
    for (let i = 0; i < 5; i++) box(this.group, [0.055, 0.03, 0.62], [-0.86 + i * 0.15, 0.7, 0], brass);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.025, 6, 16), wood);
    wheel.position.set(-3.1, 1.42, 0);
    wheel.rotation.y = Math.PI / 2;
    this.group.add(wheel);
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      rod(this.group, new THREE.Vector3(-3.1, 1.42, 0), new THREE.Vector3(-3.1, 1.42 + Math.cos(a) * 0.3, Math.sin(a) * 0.3), 0.016, brass);
    }
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0xffd595, emissive: 0xffa534, emissiveIntensity: 0.2, roughness: 0.35 });
    this.lanterns.push(lanternMat);
    box(this.group, [0.18, 0.25, 0.18], [-4.08, 1.58, 0], lanternMat);
    box(this.group, [0.25, 0.06, 0.25], [-4.08, 1.74, 0], brass);
    for (const [x, y, z, power] of [[-3.55, 1.5, 0.5, 8.5], [1.55, 1.35, 0.2, 6.5]]) {
      const light = new THREE.PointLight(0xffb55f, 0, 6.5, 1.65);
      light.position.set(x, y, z);
      this.group.add(light);
      this.lanternLights.push({ light, power });
    }
    const anchor = new THREE.Group();
    rod(anchor, new THREE.Vector3(0, -0.3, 0), new THREE.Vector3(0, 0.3, 0), 0.035, darkMetal);
    rod(anchor, new THREE.Vector3(-0.21, 0.12, 0), new THREE.Vector3(0.21, 0.12, 0), 0.028, darkMetal);
    const arc = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.035, 5, 12, Math.PI), darkMetal);
    arc.position.y = -0.22;
    arc.rotation.z = Math.PI;
    anchor.add(arc);
    anchor.position.set(3.35, 0.1, 0.95);
    anchor.rotation.x = Math.PI / 2;
    this.group.add(anchor);
  }

  update(t: number, dt: number, wave: (x: number, z: number) => number, wind: number, darkness: number, reducedMotion: boolean) {
    const x = this.group.position.x;
    const z = this.group.position.z;
    const center = wave(x, z);
    const fore = wave(x + 2.7, z);
    const aft = wave(x - 2.7, z);
    const left = wave(x, z - 0.9);
    const right = wave(x, z + 0.9);
    const targetY = CONFIG.seaLevel + 0.63 + center * 0.76;
    const targetPitch = Math.atan2(fore - aft, 5.4) * 0.7;
    const targetRoll = Math.atan2(right - left, 1.8) * 0.65;
    const motion = reducedMotion ? 0.25 : 1;
    this.velocityY += ((targetY - this.group.position.y) * 19 - this.velocityY * 7.5) * dt;
    this.velocityPitch += ((targetPitch * motion - this.group.rotation.z) * 15 - this.velocityPitch * 6.5) * dt;
    this.velocityRoll += ((targetRoll * motion - this.group.rotation.x) * 13 - this.velocityRoll * 6.2) * dt;
    this.group.position.y += this.velocityY * dt;
    this.group.rotation.z += this.velocityPitch * dt;
    this.group.rotation.x += this.velocityRoll * dt;
    for (const sail of this.cloth) this.animateCloth(sail, t, wind, reducedMotion);
    for (const flag of this.flags) this.animateCloth(flag, t * 1.8, wind * 1.8, reducedMotion);
    for (const material of this.lanterns) material.emissiveIntensity = 0.12 + darkness * (2.5 + Math.sin(t * 8.1) * 0.18);
    for (const { light, power } of this.lanternLights) light.intensity = darkness * power * (0.97 + Math.sin(t * 5.7 + power) * 0.03);
  }

  private animateCloth(cloth: AnimatedCloth, t: number, wind: number, reducedMotion: boolean) {
    const positions = cloth.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const amplitude = reducedMotion ? 0.2 : 1;
    for (let i = 0; i < positions.count; i++) {
      const offset = i * 3;
      const y = cloth.base[offset + 1];
      const z = cloth.base[offset + 2];
      positions.setX(i, cloth.base[offset] + Math.sin(t * (1.6 + wind * 0.035) + z * 2.6 + y * 1.7 + cloth.phase) * cloth.strength * wind * 0.12 * amplitude);
    }
    positions.needsUpdate = true;
    if ((Math.floor(t * 30) & 3) === 0) cloth.mesh.geometry.computeVertexNormals();
  }

  reset() {
    this.group.position.set(-0.15, CONFIG.seaLevel + 0.63, 0.25);
    this.group.rotation.set(0, -0.11, 0);
    this.velocityY = this.velocityPitch = this.velocityRoll = 0;
  }
}
