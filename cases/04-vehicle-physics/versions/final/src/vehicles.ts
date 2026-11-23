import * as THREE from 'three';
import { CONFIG } from './config';
import { carBaseHeight, sampleCarDamage } from './physics';
import type { CarState, TruckState } from './types';

export interface TruckVisual {
  group: THREE.Group;
  update(truck: TruckState): void;
}

export interface CarVisual {
  group: THREE.Group;
  update(car: CarState): void;
}

type Point = readonly [number, number, number];
type VehicleMaterial = THREE.Material | THREE.Material[];

interface Connector {
  object: THREE.Mesh;
  update(start: THREE.Vector3, end: THREE.Vector3): void;
}

interface ShockVisual {
  group: THREE.Group;
  update(start: THREE.Vector3, end: THREE.Vector3): void;
}

interface DeformablePanel {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
  original: Float32Array;
}

interface CarAttachment {
  object: THREE.Group;
  x: number;
  y: number;
  z: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function addMesh<T extends THREE.BufferGeometry, M extends VehicleMaterial>(
  parent: THREE.Object3D,
  geometry: T,
  material: M,
): THREE.Mesh<T, M> {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function addBox(
  parent: THREE.Object3D,
  size: Point,
  position: Point,
  material: THREE.Material,
): THREE.Mesh<THREE.BoxGeometry, THREE.Material> {
  const object = addMesh(parent, new THREE.BoxGeometry(...size), material);
  object.position.set(...position);
  return object;
}

function addCylinder(
  parent: THREE.Object3D,
  radius: number,
  length: number,
  position: Point,
  material: THREE.Material,
  axis: 'x' | 'y' | 'z' = 'y',
  segments = 16,
): THREE.Mesh<THREE.CylinderGeometry, THREE.Material> {
  const object = addMesh(parent, new THREE.CylinderGeometry(radius, radius, length, segments), material);
  object.position.set(...position);
  if (axis === 'x') object.rotation.z = Math.PI / 2;
  if (axis === 'z') object.rotation.x = Math.PI / 2;
  return object;
}

function addTube(
  parent: THREE.Object3D,
  start: Point,
  end: Point,
  radius: number,
  material: THREE.Material,
  segments = 10,
): THREE.Mesh<THREE.CylinderGeometry, THREE.Material> {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const object = addMesh(parent, new THREE.CylinderGeometry(radius, radius, direction.length(), segments), material);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(UP, direction.normalize());
  return object;
}

function addExtrusion(
  parent: THREE.Object3D,
  points: Point[],
  width: number,
  material: THREE.Material,
): THREE.Mesh<THREE.ExtrudeGeometry, THREE.Material> {
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 1,
  });
  geometry.translate(0, 0, -width / 2);
  return addMesh(parent, geometry, material);
}

function addQuad(parent: THREE.Object3D, points: Point[], material: THREE.Material): THREE.Mesh {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return addMesh(parent, geometry, material);
}

function createConnector(
  parent: THREE.Object3D,
  radius: number,
  material: THREE.Material,
  segments = 12,
): Connector {
  const object = addMesh(parent, new THREE.CylinderGeometry(radius, radius, 1, segments), material);
  return {
    object,
    update(start, end) {
      const direction = end.clone().sub(start);
      const length = Math.max(direction.length(), 0.001);
      object.position.copy(start).add(end).multiplyScalar(0.5);
      object.quaternion.setFromUnitVectors(UP, direction.normalize());
      object.scale.set(1, length, 1);
    },
  };
}

function createShock(parent: THREE.Object3D, springMaterial: THREE.Material, rodMaterial: THREE.Material): ShockVisual {
  const group = new THREE.Group();
  parent.add(group);
  addCylinder(group, 0.035, 1, [0, 0, 0], rodMaterial, 'y', 10);
  addCylinder(group, 0.06, 0.55, [0, -0.19, 0], rodMaterial, 'y', 12);
  const points: THREE.Vector3[] = [];
  const turns = 7;
  for (let i = 0; i <= 84; i++) {
    const t = i / 84;
    const angle = t * Math.PI * 2 * turns;
    points.push(new THREE.Vector3(Math.cos(angle) * 0.105, -0.45 + t * 0.9, Math.sin(angle) * 0.105));
  }
  const spring = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 112, 0.018, 5, false);
  addMesh(group, spring, springMaterial);
  return {
    group,
    update(start, end) {
      const direction = end.clone().sub(start);
      const length = Math.max(direction.length(), 0.001);
      group.position.copy(start).add(end).multiplyScalar(0.5);
      group.quaternion.setFromUnitVectors(UP, direction.normalize());
      group.scale.set(1, length, 1);
    },
  };
}

function createTruckWheel(
  rubber: THREE.Material,
  treadMaterial: THREE.Material,
  darkMetal: THREE.Material,
  alloy: THREE.Material,
  brake: THREE.Material,
): THREE.Group {
  const wheel = new THREE.Group();
  const carcass = addCylinder(wheel, 0.86, 0.58, [0, 0, 0], rubber, 'z', 48);
  carcass.name = 'tire-carcass';
  addMesh(wheel, new THREE.TorusGeometry(0.69, 0.27, 12, 48), rubber);
  addCylinder(wheel, 0.42, 0.56, [0, 0, 0], darkMetal, 'z', 32);

  const treadGeometry = new THREE.BoxGeometry(0.2, 0.13, 0.22);
  const treadCount = 30 * 3;
  const treads = new THREE.InstancedMesh(treadGeometry, treadMaterial, treadCount);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let row = -1; row <= 1; row++) {
    for (let i = 0; i < 30; i++) {
      const angle = (i + (row === 0 ? 0.5 : 0)) / 30 * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 0.955, Math.sin(angle) * 0.955, row * 0.225);
      dummy.rotation.set(0, 0, angle - Math.PI / 2);
      dummy.updateMatrix();
      treads.setMatrixAt(index++, dummy.matrix);
    }
  }
  treads.instanceMatrix.needsUpdate = true;
  treads.castShadow = true;
  treads.receiveShadow = true;
  wheel.add(treads);

  for (const side of [-1, 1]) {
    addCylinder(wheel, 0.315, 0.026, [0, 0, side * 0.298], brake, 'z', 32);
    const lip = addMesh(wheel, new THREE.TorusGeometry(0.36, 0.025, 8, 32), alloy);
    lip.position.z = side * 0.323;
    addCylinder(wheel, 0.13, 0.12, [0, 0, side * 0.33], darkMetal, 'z', 24);
    addCylinder(wheel, 0.07, 0.135, [0, 0, side * 0.355], alloy, 'z', 16);
  }

  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.27, 0.055, 0.035), alloy, 16);
  const bolts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.026, 0.026, 0.045, 8), alloy, 16);
  bolts.geometry.rotateX(Math.PI / 2);
  index = 0;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 8; i++) {
      const angle = i / 8 * Math.PI * 2;
      dummy.position.set(Math.cos(angle) * 0.22, Math.sin(angle) * 0.22, side * 0.335);
      dummy.rotation.set(0, 0, angle);
      dummy.updateMatrix();
      spokes.setMatrixAt(index, dummy.matrix);
      dummy.position.set(Math.cos(angle) * 0.18, Math.sin(angle) * 0.18, side * 0.39);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      bolts.setMatrixAt(index, dummy.matrix);
      index++;
    }
  }
  spokes.instanceMatrix.needsUpdate = true;
  bolts.instanceMatrix.needsUpdate = true;
  spokes.castShadow = true;
  bolts.castShadow = true;
  wheel.add(spokes, bolts);
  return wheel;
}

function createTruckBody(): THREE.Group {
  const body = new THREE.Group();
  body.name = 'truck-body';
  const paint = new THREE.MeshStandardMaterial({ color: 0xd6522c, metalness: 0.72, roughness: 0.27 });
  const paintDark = new THREE.MeshStandardMaterial({ color: 0x7d2118, metalness: 0.65, roughness: 0.34 });
  const black = new THREE.MeshStandardMaterial({ color: 0x111518, metalness: 0.35, roughness: 0.58 });
  const steel = new THREE.MeshStandardMaterial({ color: 0x4d585d, metalness: 0.88, roughness: 0.32 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xbec7c7, metalness: 0.92, roughness: 0.22 });
  const engine = new THREE.MeshStandardMaterial({ color: 0x727c7d, metalness: 0.82, roughness: 0.4 });
  const seat = new THREE.MeshStandardMaterial({ color: 0x202527, roughness: 0.94 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x77a9b4,
    metalness: 0.12,
    roughness: 0.12,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
  });
  const lamp = new THREE.MeshStandardMaterial({
    color: 0xffe5ae,
    emissive: 0xffc15b,
    emissiveIntensity: 1.2,
    metalness: 0.1,
    roughness: 0.24,
  });
  const redLamp = new THREE.MeshStandardMaterial({ color: 0xb51f18, emissive: 0x8f1008, emissiveIntensity: 0.7 });

  addBox(body, [4.35, 0.16, 0.15], [0, -0.17, -0.47], steel);
  addBox(body, [4.35, 0.16, 0.15], [0, -0.17, 0.47], steel);
  for (const x of [-1.82, -0.62, 0.62, 1.82]) addBox(body, [0.14, 0.13, 1.08], [x, -0.18, 0], steel);
  addBox(body, [1.15, 0.08, 0.92], [0.86, -0.28, 0], black);
  addBox(body, [3.95, 0.13, 1.42], [-0.05, 0.24, 0], black);

  addExtrusion(body, [
    [0.4, 0.35, 0],
    [2.15, 0.3, 0],
    [2.12, 0.68, 0],
    [0.55, 0.91, 0],
  ], 1.43, paint);
  addExtrusion(body, [
    [-1.01, 0.31, 0],
    [0.48, 0.35, 0],
    [0.03, 1.42, 0],
    [-0.72, 1.46, 0],
    [-1.01, 0.86, 0],
  ], 1.35, paint);
  addBox(body, [0.91, 0.09, 1.51], [-0.35, 1.48, 0], paint);

  addBox(body, [1.43, 0.12, 1.5], [-1.54, 0.35, 0], black);
  addBox(body, [1.48, 0.47, 0.13], [-1.52, 0.58, -0.77], paint);
  addBox(body, [1.48, 0.47, 0.13], [-1.52, 0.58, 0.77], paint);
  addBox(body, [0.14, 0.47, 1.56], [-2.23, 0.58, 0], paint);
  for (const x of [-2.02, -1.75, -1.48, -1.21, -0.94]) addBox(body, [0.055, 0.035, 1.32], [x, 0.425, 0], steel);
  addBox(body, [0.035, 0.31, 1.15], [-2.315, 0.58, 0], paintDark);

  for (const side of [-1, 1]) {
    addBox(body, [1.01, 0.49, 0.025], [-0.27, 0.57, side * 0.716], black);
    addBox(body, [0.93, 0.42, 0.032], [-0.27, 0.57, side * 0.735], paint);
    addBox(body, [0.17, 0.035, 0.045], [-0.55, 0.72, side * 0.765], alloy);
    addBox(body, [1.42, 0.1, 0.24], [1.83, 0.01, side * 0.81], black);
    addBox(body, [1.42, 0.1, 0.24], [-1.83, 0.01, side * 0.81], black);
    const seam = addBox(body, [1.58, 0.018, 0.026], [1.34, 0.795, side * 0.738], black);
    seam.rotation.z = -0.15;

    const z = side * 0.716;
    addQuad(body, [
      [-0.81, 0.84, z],
      [-0.37, 0.84, z],
      [-0.37, 1.35, z],
      [-0.65, 1.36, z],
    ], glass);
    addQuad(body, [
      [-0.3, 0.84, z],
      [0.29, 0.84, z],
      [0.025, 1.35, z],
      [-0.3, 1.35, z],
    ], glass);
  }

  addQuad(body, [
    [0.405, 0.77, -0.58],
    [0.405, 0.77, 0.58],
    [0.065, 1.36, 0.58],
    [0.065, 1.36, -0.58],
  ], glass);
  addTube(body, [0.41, 0.76, -0.63], [0.06, 1.4, -0.63], 0.025, black);
  addTube(body, [0.41, 0.76, 0.63], [0.06, 1.4, 0.63], 0.025, black);

  addBox(body, [0.2, 0.2, 1.25], [0.33, 0.85, 0], black);
  for (const z of [-0.35, -0.12, 0.12, 0.35]) addCylinder(body, 0.055, 0.025, [0.22, 0.9, z], alloy, 'x', 16);
  for (const z of [-0.34, 0.34]) {
    const cushion = addBox(body, [0.5, 0.15, 0.48], [-0.35, 0.59, z], seat);
    cushion.rotation.z = -0.06;
    const back = addBox(body, [0.16, 0.62, 0.48], [-0.64, 0.89, z], seat);
    back.rotation.z = -0.16;
    addBox(body, [0.15, 0.18, 0.3], [-0.72, 1.23, z], seat);
  }
  const steering = addMesh(body, new THREE.TorusGeometry(0.17, 0.022, 8, 24), black);
  steering.position.set(0.12, 1.02, -0.34);
  steering.rotation.y = Math.PI / 2;
  addTube(body, [0.12, 1.02, -0.34], [0.32, 0.86, -0.34], 0.018, steel);

  addBox(body, [0.74, 0.32, 0.64], [1.12, 0.94, 0], engine);
  addBox(body, [0.67, 0.16, 0.19], [1.12, 1.09, -0.29], alloy);
  addBox(body, [0.67, 0.16, 0.19], [1.12, 1.09, 0.29], alloy);
  addBox(body, [0.52, 0.23, 0.43], [1.12, 1.22, 0], engine);
  addBox(body, [0.58, 0.15, 0.5], [1.16, 1.4, 0], alloy);
  addBox(body, [0.025, 0.095, 0.38], [1.46, 1.4, 0], black);
  addCylinder(body, 0.12, 0.055, [1.51, 1.02, 0], black, 'x', 24);
  addCylinder(body, 0.08, 0.06, [1.51, 1.26, 0], black, 'x', 20);
  for (const side of [-1, 1]) {
    for (const x of [0.9, 1.12, 1.34]) {
      addTube(body, [x, 0.98, side * 0.35], [x - 0.12, 0.73, side * 0.53], 0.032, steel);
    }
  }

  addBox(body, [0.08, 0.42, 1.24], [2.2, 0.49, 0], black);
  for (const y of [0.34, 0.43, 0.52, 0.61]) addBox(body, [0.095, 0.025, 1.12], [2.25, y, 0], alloy);
  for (const z of [-0.57, 0.57]) {
    addCylinder(body, 0.14, 0.09, [2.23, 0.7, z], black, 'x', 24);
    addCylinder(body, 0.105, 0.095, [2.28, 0.7, z], lamp, 'x', 24);
    addBox(body, [0.04, 0.16, 0.26], [-2.32, 0.65, z], redLamp);
  }
  addBox(body, [0.22, 0.18, 1.7], [2.3, 0.17, 0], steel);
  addBox(body, [0.2, 0.17, 1.72], [-2.35, 0.18, 0], steel);
  addTube(body, [2.39, 0.18, -0.62], [2.39, 0.68, -0.62], 0.045, black);
  addTube(body, [2.39, 0.18, 0.62], [2.39, 0.68, 0.62], 0.045, black);
  addTube(body, [2.39, 0.68, -0.62], [2.39, 0.68, 0.62], 0.045, black);

  for (const side of [-1, 1]) {
    const z = side * 0.7;
    addTube(body, [-1.82, 0.39, z], [-0.79, 1.57, z], 0.052, steel);
    addTube(body, [-0.79, 1.57, z], [0.24, 1.57, z], 0.052, steel);
    addTube(body, [0.24, 1.57, z], [0.47, 0.55, z], 0.052, steel);
    addTube(body, [-1.82, 0.39, z], [-0.79, 1.57, -z], 0.038, black);
    addTube(body, [-1.05, 0.35, side * 0.91], [-1.05, 1.45, side * 0.91], 0.068, alloy, 16);
    addTube(body, [0.83, 0.63, side * 0.43], [-1.05, 0.36, side * 0.91], 0.052, steel, 12);
    addCylinder(body, 0.052, 0.025, [-1.05, 1.465, side * 0.91], black, 'y', 16);
  }
  addTube(body, [-0.79, 1.57, -0.7], [-0.79, 1.57, 0.7], 0.05, steel);
  addTube(body, [0.24, 1.57, -0.7], [0.24, 1.57, 0.7], 0.05, steel);
  addTube(body, [-1.82, 0.39, -0.7], [-1.82, 0.39, 0.7], 0.05, steel);
  for (const z of [-0.45, -0.15, 0.15, 0.45]) addBox(body, [0.12, 0.12, 0.18], [0.27, 1.62, z], lamp);

  return body;
}

export function createTruckVisual(): TruckVisual {
  const group = new THREE.Group();
  group.name = 'monster-truck';
  const body = createTruckBody();
  group.add(body);

  const rubber = new THREE.MeshStandardMaterial({ color: 0x121516, roughness: 0.96 });
  const tread = new THREE.MeshStandardMaterial({ color: 0x1c2021, roughness: 0.92 });
  const darkMetal = new THREE.MeshStandardMaterial({ color: 0x252c2f, metalness: 0.82, roughness: 0.38 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xc2c9c8, metalness: 0.94, roughness: 0.2 });
  const brake = new THREE.MeshStandardMaterial({ color: 0x6f7778, metalness: 0.9, roughness: 0.43 });
  const spring = new THREE.MeshStandardMaterial({ color: 0xf0a52d, metalness: 0.55, roughness: 0.32 });
  const wheels = Array.from({ length: 4 }, () => {
    const wheel = createTruckWheel(rubber, tread, darkMetal, alloy, brake);
    wheel.scale.setScalar(CONFIG.wheelRadius / 1.02);
    group.add(wheel);
    return wheel;
  });
  const axles = [createConnector(group, 0.115, darkMetal, 16), createConnector(group, 0.115, darkMetal, 16)];
  const driveshafts = [createConnector(group, 0.052, alloy, 12), createConnector(group, 0.052, alloy, 12)];
  const differentials = Array.from({ length: 2 }, () => {
    const differential = addMesh(group, new THREE.SphereGeometry(0.22, 16, 12), darkMetal);
    differential.scale.set(1.2, 1, 1);
    return differential;
  });
  const shocks = Array.from({ length: 4 }, () => createShock(group, spring, alloy));
  const wheelPositions = Array.from({ length: 4 }, () => new THREE.Vector3());
  const mount = new THREE.Vector3();
  const lower = new THREE.Vector3();
  const chassis = new THREE.Vector3();

  const update = (truck: TruckState): void => {
    body.position.set(truck.x, truck.y, truck.z);
    body.rotation.set(truck.roll, 0, truck.pitch);
    for (let i = 0; i < 4; i++) {
      const state = truck.wheels[i];
      wheelPositions[i].set(state.x, state.y, state.z);
      wheels[i].position.copy(wheelPositions[i]);
      wheels[i].rotation.set(0, 0, state.rotation);
    }
    for (let axle = 0; axle < 2; axle++) {
      const near = axle * 2;
      const far = near + 1;
      axles[axle].update(wheelPositions[near], wheelPositions[far]);
      differentials[axle].position.copy(wheelPositions[near]).add(wheelPositions[far]).multiplyScalar(0.5);
      chassis.set(axle === 0 ? 0.42 : -0.42, -0.2, 0).applyEuler(body.rotation).add(body.position);
      driveshafts[axle].update(chassis, differentials[axle].position);
    }
    for (let i = 0; i < 4; i++) {
      const state = truck.wheels[i];
      const side = state.side === 'near' ? -1 : 1;
      mount.set(state.axle === 'front' ? 1.38 : -1.38, -0.08, side * 0.53);
      mount.applyEuler(body.rotation).add(body.position);
      lower.copy(wheelPositions[i]);
      lower.y += 0.04;
      lower.z -= side * 0.13;
      shocks[i].update(mount, lower);
    }
  };

  return { group, update };
}

function createSurfacePatch(
  parent: THREE.Object3D,
  deformable: DeformablePanel[],
  name: string,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  segmentsX: number,
  segmentsZ: number,
  material: THREE.Material,
  offset = 0,
): THREE.Mesh<THREE.BufferGeometry, THREE.Material> {
  const positions: number[] = [];
  const indices: number[] = [];
  for (let iz = 0; iz <= segmentsZ; iz++) {
    const z = THREE.MathUtils.lerp(z0, z1, iz / segmentsZ);
    for (let ix = 0; ix <= segmentsX; ix++) {
      const x = THREE.MathUtils.lerp(x0, x1, ix / segmentsX);
      positions.push(x, carBaseHeight(x, z) + offset, z);
    }
  }
  for (let iz = 0; iz < segmentsZ; iz++) {
    for (let ix = 0; ix < segmentsX; ix++) {
      const a = iz * (segmentsX + 1) + ix;
      const b = a + 1;
      const d = a + segmentsX + 1;
      const c = d + 1;
      indices.push(a, d, b, b, d, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.Float32BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  if (geometry.boundingSphere) geometry.boundingSphere.radius += 0.12;
  const mesh = addMesh(parent, geometry, material);
  mesh.name = name;
  deformable.push({ mesh, original: new Float32Array(positions) });
  return mesh;
}

function createSidePanel(
  parent: THREE.Object3D,
  deformable: DeformablePanel[],
  name: string,
  side: number,
  material: THREE.Material,
): void {
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 30;
  for (let i = 0; i <= segments; i++) {
    const z = THREE.MathUtils.lerp(-2.14, 2.14, i / segments);
    const x = side * 1.08;
    positions.push(x, 0.26, z, x, carBaseHeight(x, z), z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.Float32BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = addMesh(parent, geometry, material);
  mesh.name = name;
  deformable.push({ mesh, original: new Float32Array(positions) });
}

function createEndPanel(
  parent: THREE.Object3D,
  deformable: DeformablePanel[],
  name: string,
  z: number,
  material: THREE.Material,
): void {
  const positions: number[] = [];
  const indices: number[] = [];
  const segments = 18;
  for (let i = 0; i <= segments; i++) {
    const x = THREE.MathUtils.lerp(-1.08, 1.08, i / segments);
    positions.push(x, 0.26, z, x, carBaseHeight(x, z), z);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  const attribute = new THREE.Float32BufferAttribute(positions, 3);
  attribute.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute('position', attribute);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = addMesh(parent, geometry, material);
  mesh.name = name;
  deformable.push({ mesh, original: new Float32Array(positions) });
}

function createCarWheel(x: number, z: number, rubber: THREE.Material, alloy: THREE.Material): THREE.Group {
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.32, z);
  const tire = addMesh(wheel, new THREE.TorusGeometry(0.23, 0.09, 10, 28), rubber);
  tire.rotation.y = Math.PI / 2;
  addCylinder(wheel, 0.18, 0.17, [0, 0, 0], alloy, 'x', 20);
  addCylinder(wheel, 0.075, 0.185, [0, 0, 0], rubber, 'x', 16);
  return wheel;
}

function createCarAttachment(
  parent: THREE.Object3D,
  attachments: CarAttachment[],
  x: number,
  y: number,
  z: number,
): THREE.Group {
  const object = new THREE.Group();
  object.position.set(x, y, z);
  parent.add(object);
  attachments.push({ object, x, y, z });
  return object;
}

function deformCar(car: CarState, panels: DeformablePanel[], attachments: CarAttachment[]): void {
  for (const panel of panels) {
    if (!panel.mesh.visible || panel.mesh.parent?.visible === false) continue;
    const attribute = panel.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = attribute.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = panel.original[i];
      const y = panel.original[i + 1];
      const z = panel.original[i + 2];
      const base = carBaseHeight(x, z);
      const damage = sampleCarDamage(car, x, z);
      const influence = base > 0 ? THREE.MathUtils.clamp(y / base, 0, 1) : 0;
      const floor = y >= 0.24 ? 0.24 : y;
      positions[i] = x + Math.sin(z * 13 + x * 4) * 0.045 * damage;
      positions[i + 1] = damage > 0 ? Math.max(floor, y - damage * influence) : y;
      positions[i + 2] = z + Math.sin(x * 15 - z * 5) * 0.035 * damage;
    }
    attribute.needsUpdate = true;
    panel.mesh.geometry.computeVertexNormals();
  }
  for (const attachment of attachments) {
    const damage = sampleCarDamage(car, attachment.x, attachment.z);
    attachment.object.position.y = damage > 0 ? Math.max(0.24, attachment.y - damage) : attachment.y;
  }
}

export function createCarVisual(car: CarState): CarVisual {
  const group = new THREE.Group();
  group.name = `crush-car-${car.id}`;
  const body = new THREE.Group();
  body.name = 'deformable-body';
  group.add(body);
  const paint = new THREE.MeshPhysicalMaterial({ color: car.color, metalness: 0.42, roughness: 0.38, clearcoat: 0.62, clearcoatRoughness: 0.24, side: THREE.DoubleSide });
  const seam = new THREE.MeshStandardMaterial({ color: 0x151a1d, metalness: 0.25, roughness: 0.65 });
  const trim = new THREE.MeshStandardMaterial({ color: 0x252b2e, metalness: 0.55, roughness: 0.48 });
  const alloy = new THREE.MeshStandardMaterial({ color: 0xaeb8b9, metalness: 0.88, roughness: 0.28 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x141719, roughness: 0.95 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x78a9b5,
    metalness: 0.18,
    roughness: 0.13,
    transparent: true,
    opacity: 0.64,
    side: THREE.DoubleSide,
  });
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe3aa,
    emissive: 0xffbd55,
    emissiveIntensity: 0.8,
    roughness: 0.25,
  });
  const taillightMaterial = new THREE.MeshStandardMaterial({
    color: 0xb82720,
    emissive: 0x8f100c,
    emissiveIntensity: 0.55,
    roughness: 0.3,
  });
  const panels: DeformablePanel[] = [];
  const attachments: CarAttachment[] = [];

  createSurfacePatch(body, panels, 'hood', -1.15, 1.15, -2.25, -1.32, 18, 9, paint);
  createSurfacePatch(body, panels, 'pillar-front', -1.15, 1.15, -1.32, -0.9, 18, 5, paint);
  createSurfacePatch(body, panels, 'roof', -0.73, 0.73, -0.9, 0.9, 12, 18, paint);
  createSurfacePatch(body, panels, 'door-near', -1.15, -0.73, -0.9, 0.9, 5, 18, paint);
  createSurfacePatch(body, panels, 'door-far', 0.73, 1.15, -0.9, 0.9, 5, 18, paint);
  createSurfacePatch(body, panels, 'pillar-rear', -1.15, 1.15, 0.9, 1.32, 18, 5, paint);
  createSurfacePatch(body, panels, 'rear-deck', -1.15, 1.15, 1.32, 2.25, 18, 9, paint);
  for (const side of [-1, 1]) createSidePanel(body, panels, `side-shell-${side}`, side, paint);
  createEndPanel(body, panels, 'front-shell', -2.14, paint);
  createEndPanel(body, panels, 'rear-shell', 2.14, paint);
  createSurfacePatch(body, panels, 'hood-seam', -1.06, 1.06, -1.333, -1.313, 16, 1, seam, 0.008);
  createSurfacePatch(body, panels, 'roof-seam-near', -0.742, -0.722, -0.88, 0.88, 1, 14, seam, 0.008);
  createSurfacePatch(body, panels, 'roof-seam-far', 0.722, 0.742, -0.88, 0.88, 1, 14, seam, 0.008);

  const glass = new THREE.Group();
  glass.name = 'glass';
  group.add(glass);
  createSurfacePatch(glass, panels, 'windshield', -0.7, 0.7, -1.27, -0.93, 12, 4, glassMaterial, 0.022);
  createSurfacePatch(glass, panels, 'rear-window', -0.7, 0.7, 0.93, 1.27, 12, 4, glassMaterial, 0.022);
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? -0.97 : 0.755;
    const x1 = side < 0 ? -0.755 : 0.97;
    createSurfacePatch(glass, panels, `side-window-${side}-front`, x0, x1, -0.76, -0.04, 3, 8, glassMaterial, 0.022);
    createSurfacePatch(glass, panels, `side-window-${side}-rear`, x0, x1, 0.04, 0.76, 3, 8, glassMaterial, 0.022);
  }

  addBox(group, [1.88, 0.14, 3.58], [0, 0.18, 0], trim);
  addBox(group, [1.55, 0.08, 2.7], [0, 0.09, 0], seam);
  for (const x of [-1.04, 1.04]) {
    for (const z of [-1.38, 1.38]) {
      const wheel = createCarWheel(x, z, rubber, alloy);
      group.add(wheel);
    }
  }

  const frontBumper = createCarAttachment(group, attachments, 0, 0.4, -2.18);
  frontBumper.name = 'bumper-front';
  addBox(frontBumper, [1.92, 0.16, 0.16], [0, 0, 0], trim);
  addBox(frontBumper, [0.92, 0.2, 0.04], [0, 0.11, -0.035], seam);
  for (const x of [-0.3, -0.15, 0, 0.15, 0.3]) addBox(frontBumper, [0.035, 0.17, 0.05], [x, 0.11, -0.06], alloy);
  const rearBumper = createCarAttachment(group, attachments, 0, 0.4, 2.18);
  rearBumper.name = 'bumper-rear';
  addBox(rearBumper, [1.92, 0.16, 0.16], [0, 0, 0], trim);

  const frontLights = createCarAttachment(group, attachments, 0, 0.65, -2.13);
  frontLights.name = 'light-front';
  for (const x of [-0.72, 0.72]) addBox(frontLights, [0.42, 0.16, 0.09], [x, 0, 0], headlightMaterial);
  const rearLights = createCarAttachment(group, attachments, 0, 0.65, 2.13);
  rearLights.name = 'light-rear';
  for (const x of [-0.72, 0.72]) addBox(rearLights, [0.44, 0.15, 0.09], [x, 0, 0], taillightMaterial);

  const mirrors: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const mirror = createCarAttachment(group, attachments, side * 1.04, 1.05, -0.73);
    mirror.name = side < 0 ? 'mirror-front' : 'mirror-rear';
    addTube(mirror, [0, -0.05, 0], [side * 0.13, 0.02, 0], 0.018, trim, 8);
    addBox(mirror, [0.2, 0.11, 0.16], [side * 0.17, 0.04, 0], paint);
    addBox(mirror, [0.015, 0.075, 0.12], [side * 0.275, 0.04, 0], glassMaterial);
    mirrors.push(mirror);
  }

  let lastDamage = Number.NaN;
  let lastDetached = '';
  const update = (state: CarState): void => {
    group.position.set(state.x, 0, state.z);
    const detached = state.detached.join('|');
    if (state.totalDamage === lastDamage && detached === lastDetached) return;
    lastDamage = state.totalDamage;
    lastDetached = detached;
    glass.visible = !state.detached.includes('glass');
    mirrors[0].visible = !state.detached.includes('mirror-front');
    mirrors[1].visible = !state.detached.includes('mirror-rear');
    frontLights.visible = !state.detached.includes('light-front');
    rearLights.visible = !state.detached.includes('light-rear');
    frontBumper.visible = !state.detached.includes('bumper-front');
    rearBumper.visible = !state.detached.includes('bumper-rear');
    deformCar(state, panels, attachments);
  };

  update(car);
  return { group, update };
}
