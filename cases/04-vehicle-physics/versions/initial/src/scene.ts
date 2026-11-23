import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { COLORS, CONFIG } from './config';
import { CrushSimulation } from './physics';
import type { DebrisState } from './types';
import { createCarVisual, createTruckVisual, type CarVisual, type TruckVisual } from './vehicles';

interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface FrameInfo {
  videoTime: number;
  simulationTime: number;
  mode: 'intro' | 'main' | 'replay' | 'method';
  replayLabel: string;
  playbackRate: number;
}

function makeAsphaltTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  context.fillStyle = '#34393c';
  context.fillRect(0, 0, 512, 512);
  let seed = 9137;
  const random = () => {
    seed = Math.imul(seed, 1664525) + 1013904223 | 0;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = 0; i < 19000; i++) {
    const shade = 38 + Math.floor(random() * 38);
    context.fillStyle = `rgba(${shade},${shade + 2},${shade + 3},${0.08 + random() * 0.2})`;
    const size = 0.4 + random() * 1.8;
    context.fillRect(random() * 512, random() * 512, size, size);
  }
  for (let i = 0; i < 14; i++) {
    context.strokeStyle = 'rgba(18,20,21,.16)';
    context.lineWidth = 0.7 + random();
    context.beginPath();
    let x = random() * 512;
    let y = random() * 512;
    context.moveTo(x, y);
    for (let j = 0; j < 7; j++) {
      x += (random() - 0.5) * 40;
      y += random() * 24;
      context.lineTo(x, y);
    }
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 8);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeLabelTexture(text: string, accent = '#f0b429'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, 512, 128);
  context.fillStyle = 'rgba(13,17,23,.88)';
  context.fillRect(0, 0, 512, 128);
  context.fillStyle = accent;
  context.fillRect(0, 0, 9, 128);
  context.fillStyle = '#edf2f4';
  context.font = '600 42px Menlo, monospace';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, 264, 65);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class CrushScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly simulation: CrushSimulation;
  private truck: TruckVisual;
  private cars: CarVisual[] = [];
  private debris = new Map<number, THREE.Mesh>();
  private dust: DustParticle[] = [];
  private dustPoints: THREE.Points;
  private dustPositions = new Float32Array(180 * 3);
  private markMesh: THREE.InstancedMesh;
  private markCount = 0;
  private lastMarkX = -100;
  private randomState = 7727;
  private freeView = false;
  private interactiveTime = 0;

  constructor(canvas: HTMLCanvasElement, simulation: CrushSimulation) {
    this.simulation = simulation;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(42, 1, 0.08, 180);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minDistance = 3;
    this.controls.maxDistance = 45;
    this.controls.enabled = false;
    this.scene.fog = new THREE.Fog(COLORS.fog, 28, 82);
    this.buildEnvironment();
    this.truck = createTruckVisual();
    this.scene.add(this.truck.group);
    this.rebuildCars();
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute('position', new THREE.BufferAttribute(this.dustPositions, 3));
    dustGeometry.setDrawRange(0, 0);
    this.dustPoints = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xd4b891, size: 0.13, transparent: true, opacity: 0.38, depthWrite: false, sizeAttenuation: true }));
    this.dustPoints.frustumCulled = false;
    this.scene.add(this.dustPoints);
    const markGeometry = new THREE.PlaneGeometry(0.42, 0.86);
    markGeometry.rotateX(-Math.PI / 2);
    this.markMesh = new THREE.InstancedMesh(markGeometry, new THREE.MeshBasicMaterial({ color: 0x111517, transparent: true, opacity: 0.32, depthWrite: false }), 512);
    this.markMesh.count = 0;
    this.markMesh.frustumCulled = false;
    this.scene.add(this.markMesh);
    this.resize();
    this.syncVisuals();
  }

  private random(): number {
    this.randomState = Math.imul(this.randomState, 1664525) + 1013904223 | 0;
    return (this.randomState >>> 0) / 4294967296;
  }

  private buildEnvironment(): void {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(95, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: { top: { value: new THREE.Color(0x37566d) }, horizon: { value: new THREE.Color(0xd49a70) } },
        vertexShader: 'varying vec3 vWorld; void main(){ vec4 world=modelMatrix*vec4(position,1.0); vWorld=world.xyz; gl_Position=projectionMatrix*viewMatrix*world; }',
        fragmentShader: 'uniform vec3 top; uniform vec3 horizon; varying vec3 vWorld; void main(){ float h=clamp(normalize(vWorld).y*1.7,0.0,1.0); gl_FragColor=vec4(mix(horizon,top,pow(h,0.62)),1.0); }',
      }),
    );
    this.scene.add(sky);
    const hemisphere = new THREE.HemisphereLight(0xb9d9ee, 0x4d3c31, 1.75);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(0xffd6a3, 3.6);
    sun.position.set(-12, 19, 10);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -26;
    sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 20;
    sun.shadow.camera.bottom = -20;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 65;
    sun.shadow.bias = -0.00035;
    sun.shadow.normalBias = 0.035;
    this.scene.add(sun);
    const fill = new THREE.DirectionalLight(0x83bce4, 1.15);
    fill.position.set(8, 8, -12);
    this.scene.add(fill);
    const asphalt = makeAsphaltTexture();
    asphalt.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(110, 70), new THREE.MeshStandardMaterial({ map: asphalt, color: COLORS.asphalt, roughness: 0.91, metalness: 0.06 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const stripeMaterial = new THREE.MeshStandardMaterial({ color: 0xdbb54c, roughness: 0.72, metalness: 0.05 });
    for (const z of [-3.3, 3.3]) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(34, 0.09), stripeMaterial);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(3, 0.008, z);
      this.scene.add(stripe);
    }
    const concrete = new THREE.MeshStandardMaterial({ color: 0x9a968b, roughness: 0.88, metalness: 0.02 });
    for (let i = 0; i < 14; i++) {
      const barrier = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.72, 0.5), concrete);
      barrier.position.set(-10 + i * 2.3, 0.36, -7.1);
      barrier.rotation.y = (i % 3 - 1) * 0.012;
      barrier.castShadow = barrier.receiveShadow = true;
      this.scene.add(barrier);
    }
    const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x303a41, roughness: 0.48, metalness: 0.75 });
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffe0a8, emissive: 0xffb44e, emissiveIntensity: 2.5, roughness: 0.3 });
    for (const x of [-8, 5, 18]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 7.5, 10), poleMaterial);
      pole.position.set(x, 3.75, -6.7);
      pole.castShadow = true;
      this.scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.18, 0.45), lampMaterial);
      lamp.position.set(x, 7.45, -6.45);
      this.scene.add(lamp);
    }
    for (let i = 0; i < 5; i++) {
      const label = new THREE.Mesh(new THREE.PlaneGeometry(1.65, 0.42), new THREE.MeshBasicMaterial({ map: makeLabelTexture(`0${i + 1} / ${['EMBER', 'COBALT', 'IVORY', 'VERDANT', 'VIOLET'][i]}`), transparent: true, depthWrite: false }));
      label.rotation.x = -Math.PI / 2;
      label.position.set(i * 2.8, 0.012, 3.85);
      this.scene.add(label);
    }
    const grid = new THREE.GridHelper(90, 90, 0x596168, 0x454c51);
    grid.position.y = 0.004;
    const gridMaterials = Array.isArray(grid.material) ? grid.material : [grid.material];
    for (const material of gridMaterials) {
      material.transparent = true;
      material.opacity = 0.12;
    }
    this.scene.add(grid);
  }

  private rebuildCars(): void {
    for (const car of this.cars) this.scene.remove(car.group);
    this.cars = this.simulation.cars.map((car) => {
      const visual = createCarVisual(car);
      this.scene.add(visual.group);
      return visual;
    });
  }

  private resetVisuals(): void {
    for (const mesh of this.debris.values()) this.scene.remove(mesh);
    this.debris.clear();
    this.dust = [];
    this.dustPoints.geometry.setDrawRange(0, 0);
    this.markCount = 0;
    this.markMesh.count = 0;
    this.lastMarkX = -100;
    this.randomState = 7727;
    this.rebuildCars();
  }

  private makeDebris(piece: DebrisState): THREE.Mesh {
    const geometry = piece.kind === 'glass' ? new THREE.TetrahedronGeometry(0.65, 0) : new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshPhysicalMaterial({
      color: piece.color,
      roughness: piece.kind === 'glass' ? 0.12 : 0.42,
      metalness: piece.kind === 'glass' ? 0.12 : 0.45,
      transparent: piece.kind === 'glass',
      opacity: piece.kind === 'glass' ? 0.68 : 1,
      transmission: piece.kind === 'glass' ? 0.18 : 0,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(...piece.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    return mesh;
  }

  private spawnDust(x: number, y: number, z: number, intensity: number): void {
    const count = Math.min(5, 2 + Math.floor(intensity * 2));
    for (let i = 0; i < count && this.dust.length < 180; i++) {
      const life = 0.45 + this.random() * 0.65;
      this.dust.push({
        position: new THREE.Vector3(x + (this.random() - 0.5) * 0.5, y + this.random() * 0.1, z + (this.random() - 0.5) * 0.5),
        velocity: new THREE.Vector3((this.random() - 0.35) * 0.65, 0.18 + this.random() * 0.45, (this.random() - 0.5) * 0.5),
        life,
        maxLife: life,
      });
    }
  }

  private syncStep(): void {
    for (const event of this.simulation.events) {
      if (event.type === 'crush') this.spawnDust(event.position[0], event.position[1], event.position[2], event.intensity * 0.55);
    }
    for (let i = this.dust.length - 1; i >= 0; i--) {
      const particle = this.dust[i];
      particle.life -= CONFIG.fixedDt;
      if (particle.life <= 0) {
        this.dust.splice(i, 1);
        continue;
      }
      particle.position.addScaledVector(particle.velocity, CONFIG.fixedDt);
      particle.velocity.y += 0.08 * CONFIG.fixedDt;
    }
    this.dustPositions.fill(0);
    this.dust.forEach((particle, index) => {
      this.dustPositions[index * 3] = particle.position.x;
      this.dustPositions[index * 3 + 1] = particle.position.y;
      this.dustPositions[index * 3 + 2] = particle.position.z;
    });
    this.dustPoints.geometry.attributes.position.needsUpdate = true;
    this.dustPoints.geometry.setDrawRange(0, this.dust.length);
    const truck = this.simulation.truck;
    if (Math.abs(truck.x - this.lastMarkX) > 0.26) {
      for (const wheel of truck.wheels) {
        if (wheel.contact || this.markCount >= 512) continue;
        const matrix = new THREE.Matrix4();
        matrix.makeRotationY(-0.03 * Math.sign(truck.vx));
        matrix.setPosition(wheel.x, 0.009, wheel.z);
        this.markMesh.setMatrixAt(this.markCount++, matrix);
      }
      this.markMesh.count = this.markCount;
      this.markMesh.instanceMatrix.needsUpdate = true;
      this.lastMarkX = truck.x;
    }
  }

  private syncVisuals(): void {
    this.truck.update(this.simulation.truck);
    this.cars.forEach((visual, index) => visual.update(this.simulation.cars[index]));
    for (const piece of this.simulation.debris) {
      let mesh = this.debris.get(piece.id);
      if (!mesh) {
        mesh = this.makeDebris(piece);
        this.debris.set(piece.id, mesh);
      }
      mesh.position.set(...piece.position);
      mesh.rotation.set(...piece.rotation);
    }
  }

  reset(carCount?: number): void {
    this.simulation.reset(carCount);
    this.resetVisuals();
    this.interactiveTime = 0;
    this.syncVisuals();
  }

  setSimulationTime(target: number): void {
    if (target < this.simulation.time - 1e-7) this.reset();
    let guard = 0;
    while (this.simulation.time < target - 1e-7 && guard++ < 7200) {
      this.simulation.step();
      this.syncStep();
    }
    this.syncVisuals();
  }

  stepInteractive(dt: number): void {
    this.interactiveTime += dt;
    this.simulation.step();
    this.syncStep();
    this.syncVisuals();
  }

  private lookAt(position: THREE.Vector3, target: THREE.Vector3): void {
    this.camera.position.copy(position);
    this.camera.lookAt(target);
  }

  private heroCamera(): void {
    const truck = this.simulation.truck;
    this.lookAt(new THREE.Vector3(truck.x - 5.6, 3.5, 7.1), new THREE.Vector3(truck.x + 0.9, 1.2, 0));
  }

  private mainCamera(): void {
    const truck = this.simulation.truck;
    const height = 4.8 + Math.min(1.1, Math.abs(truck.pitch) * 2.5);
    this.lookAt(new THREE.Vector3(truck.x - 6.9, height, 9.6), new THREE.Vector3(truck.x + 2.2, 1.05, 0));
  }

  private replayCamera(segment: number): void {
    const carX = this.simulation.cars[0]?.x ?? 0;
    const positions = [new THREE.Vector3(carX - 3.7, 2.55, 4.7), new THREE.Vector3(carX + 0.3, 2.15, 4.25), new THREE.Vector3(carX + 3.5, 2.7, 4.9)];
    this.lookAt(positions[segment], new THREE.Vector3(carX + (segment - 1) * 0.45, 1.02, 0));
  }

  private finalCamera(time: number): void {
    const angle = -0.16 + (time - 36) * 0.035;
    this.lookAt(new THREE.Vector3(5.6 + Math.sin(angle) * 18, 10.5, Math.cos(angle) * 18), new THREE.Vector3(5.6, 0.45, 0));
  }

  renderVideoFrame(time: number): FrameInfo {
    let info: FrameInfo;
    if (time < 2) {
      this.setSimulationTime(5.15);
      this.heroCamera();
      info = { videoTime: time, simulationTime: 5.15, mode: 'intro', replayLabel: '', playbackRate: 0 };
    } else if (time < 24) {
      const simulationTime = time - 2;
      this.setSimulationTime(simulationTime);
      this.mainCamera();
      info = { videoTime: time, simulationTime, mode: 'main', replayLabel: '', playbackRate: 1 };
    } else if (time < 36) {
      const segment = Math.min(2, Math.floor((time - 24) / 4));
      const starts = [4.0, 5.25, 6.35];
      const simulationTime = starts[segment] + (time - 24 - segment * 4) * 0.35;
      this.setSimulationTime(simulationTime);
      this.replayCamera(segment);
      const labels = ['FIRST CONTACT · 0.35×', 'LOCAL ROOF YIELD · 0.35×', 'REAR AXLE / SECOND PASS · 0.35×'];
      info = { videoTime: time, simulationTime, mode: 'replay', replayLabel: labels[segment], playbackRate: 0.35 };
    } else {
      this.setSimulationTime(22);
      this.finalCamera(time);
      info = { videoTime: time, simulationTime: 22, mode: 'method', replayLabel: '', playbackRate: 0 };
    }
    this.renderer.render(this.scene, this.camera);
    return info;
  }

  renderInteractive(freeView: boolean): void {
    this.freeView = freeView;
    this.controls.enabled = freeView;
    if (freeView) {
      this.controls.update();
    } else {
      this.mainCamera();
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize(): void {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth || window.innerWidth;
    const height = canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
  }

  setFreeView(enabled: boolean): void {
    this.freeView = enabled;
    this.controls.enabled = enabled;
    if (enabled) {
      this.controls.target.set(this.simulation.truck.x, 1, 0);
      this.controls.update();
    }
  }

  getDiagnostics() {
    return {
      ...this.simulation.diagnostics(),
      render: {
        calls: this.renderer.info.render.calls,
        triangles: this.renderer.info.render.triangles,
        geometries: this.renderer.info.memory.geometries,
        textures: this.renderer.info.memory.textures,
      },
      freeView: this.freeView,
      interactiveTime: this.interactiveTime,
    };
  }
}
