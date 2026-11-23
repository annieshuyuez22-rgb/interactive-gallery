import * as THREE from 'three';

export function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const clamp = THREE.MathUtils.clamp;
export const lerp = THREE.MathUtils.lerp;
export const smoothstep = THREE.MathUtils.smoothstep;

export function standard(color: number, roughness = 0.75, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
export function box(
  parent: THREE.Object3D,
  size: [number, number, number],
  position: [number, number, number],
  material: THREE.Material,
  rotation?: [number, number, number],
) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(...size);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function cylinder(
  parent: THREE.Object3D,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  position: [number, number, number],
  material: THREE.Material,
  segments = 12,
) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function rod(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius: number, material: THREE.Material) {
  const delta = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), 6), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  parent.add(mesh);
  return mesh;
}

interface Voxel {
  p: [number, number, number];
  s: [number, number, number];
  c: number;
  r?: [number, number, number];
}

export class VoxelBatch {
  private voxels: Voxel[] = [];
  add(x: number, y: number, z: number, sx: number, sy: number, sz: number, color: number, rotation?: [number, number, number]) {
    this.voxels.push({ p: [x, y, z], s: [sx, sy, sz], c: color, r: rotation });
  }
  build(material?: THREE.Material, shadows = true) {
    const mat = material ?? new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.84 });
    const mesh = new THREE.InstancedMesh(unitBox, mat, this.voxels.length);
    const transform = new THREE.Object3D();
    const color = new THREE.Color();
    this.voxels.forEach((voxel, index) => {
      transform.position.set(...voxel.p);
      transform.scale.set(...voxel.s);
      transform.rotation.set(...(voxel.r ?? [0, 0, 0]));
      transform.updateMatrix();
      mesh.setMatrixAt(index, transform.matrix);
      mesh.setColorAt(index, color.setHex(voxel.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    return mesh;
  }
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d')!);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function woodTexture() {
  const random = seededRandom(9182);
  const texture = canvasTexture(1024, 512, (ctx) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#624633');
    gradient.addColorStop(1, '#3c291f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 512);
    for (let plank = 0; plank < 8; plank++) {
      const y = plank * 64;
      ctx.fillStyle = `rgba(${80 + random() * 25},${48 + random() * 18},${28 + random() * 12},.18)`;
      ctx.fillRect(0, y, 1024, 62);
      ctx.fillStyle = 'rgba(12,8,5,.5)';
      ctx.fillRect(0, y + 62, 1024, 2);
      for (let line = 0; line < 45; line++) {
        const yy = y + random() * 60;
        ctx.strokeStyle = `rgba(24,13,8,${0.08 + random() * 0.18})`;
        ctx.lineWidth = 0.5 + random();
        ctx.beginPath();
        ctx.moveTo(0, yy);
        for (let x = 0; x <= 1024; x += 64) ctx.lineTo(x, yy + Math.sin(x * 0.015 + line) * (1 + random() * 2));
        ctx.stroke();
      }
      for (let knot = 0; knot < 2; knot++) {
        const x = random() * 1024;
        const ky = y + 10 + random() * 42;
        ctx.strokeStyle = 'rgba(28,15,9,.22)';
        for (let ring = 1; ring < 5; ring++) {
          ctx.beginPath();
          ctx.ellipse(x, ky, ring * 9, ring * 2.4, 0, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2.5, 2.5);
  return texture;
}

export function labelTexture(title: string, subtitle: string) {
  return canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = '#21150f';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = '#b79558';
    ctx.lineWidth = 5;
    ctx.strokeRect(16, 16, 992, 224);
    ctx.lineWidth = 1;
    ctx.strokeRect(27, 27, 970, 202);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#d8bd82';
    ctx.font = '54px Georgia';
    ctx.fillText(title, 512, 117);
    ctx.fillStyle = '#9f875b';
    ctx.font = '22px Georgia';
    ctx.fillText(subtitle, 512, 171);
    for (const x of [45, 979]) for (const y of [45, 211]) {
      ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
    }
  });
}

export function radialTexture(color = '255,255,255') {
  return canvasTexture(128, 128, (ctx) => {
    const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
    gradient.addColorStop(0, `rgba(${color},.9)`);
    gradient.addColorStop(0.3, `rgba(${color},.55)`);
    gradient.addColorStop(1, `rgba(${color},0)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);
  });
}

export function setShadows(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
}
