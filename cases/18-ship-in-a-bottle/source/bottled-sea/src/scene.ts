import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { CONFIG, INITIAL_STATE, type SceneState, type Weather } from './config';
import { Effects } from './effects';
import { Ocean } from './ocean';
import { Ship } from './ship';
import { clamp, smoothstep } from './utils';
import { World } from './world';

export type SceneAction = 'fire' | 'dolphins' | 'barrel' | 'shake' | 'ripple' | 'weather' | 'reset';
interface LightStop {
  hour: number;
  background: number;
  key: number;
  sky: number;
  keyIntensity: number;
  hemi: number;
  exposure: number;
  darkness: number;
}

const LIGHT_STOPS: LightStop[] = [
  { hour: 0, background: 0x071522, key: 0x8aa9ce, sky: 0x6687a6, keyIntensity: 0.5, hemi: 0.46, exposure: 0.96, darkness: 1 },
  { hour: 5, background: 0x132532, key: 0xa6b5cb, sky: 0x728da3, keyIntensity: 0.62, hemi: 0.5, exposure: 0.98, darkness: 0.9 },
  { hour: 6.8, background: 0x3a4448, key: 0xffb47a, sky: 0xb7c4c1, keyIntensity: 1.5, hemi: 0.78, exposure: 1.04, darkness: 0.35 },
  { hour: 9, background: 0x243844, key: 0xffdfad, sky: 0xc3d8dc, keyIntensity: 2.35, hemi: 1.08, exposure: 1.08, darkness: 0 },
  { hour: 12.5, background: 0x263b47, key: 0xffedc9, sky: 0xc9e0e2, keyIntensity: 2.65, hemi: 1.18, exposure: 1.08, darkness: 0 },
  { hour: 16.8, background: 0x33404a, key: 0xffc483, sky: 0xb9c9c9, keyIntensity: 2.05, hemi: 0.92, exposure: 1.06, darkness: 0.1 },
  { hour: 18.6, background: 0x382e37, key: 0xff9668, sky: 0x9c8fa1, keyIntensity: 1.25, hemi: 0.62, exposure: 1.0, darkness: 0.58 },
  { hour: 20.2, background: 0x0a1928, key: 0x8ea9cf, sky: 0x6687a6, keyIntensity: 0.52, hemi: 0.46, exposure: 0.97, darkness: 1 },
  { hour: 24, background: 0x071522, key: 0x8aa9ce, sky: 0x6687a6, keyIntensity: 0.5, hemi: 0.46, exposure: 0.96, darkness: 1 },
];

const DEMO_CAMERA = [
  { t: 0, p: [18, 12.2, 36], target: [0.5, 3.4, 0] },
  { t: 5, p: [16.2, 11.5, 33], target: [0.4, 3.6, 0] },
  { t: 10, p: [11.8, 10.6, 28.2], target: [1.2, 3.85, 0] },
  { t: 15, p: [11.5, 10.8, 26], target: [0, 3.5, 0] },
  { t: 21, p: [15.8, 11.8, 31.5], target: [0, 3.4, 0] },
  { t: 27, p: [11.8, 9.8, 27], target: [-0.4, 3.8, 0] },
  { t: 33, p: [1.5, 10.4, 28.5], target: [0.6, 3.7, 0] },
  { t: 36, p: [11.8, 11.8, 32.5], target: [0.8, 3.55, 0] },
  { t: 38, p: [15.8, 11.7, 32.8], target: [0.8, 3.45, 0] },
  { t: 40, p: [15.8, 11.7, 32.8], target: [0.8, 3.45, 0] },
];

export class BottledSeaScene {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly controls: OrbitControls;
  readonly assembly = new THREE.Group();
  readonly state: SceneState = { ...INITIAL_STATE };
  readonly ocean: Ocean;
  readonly ship: Ship;
  readonly world: World;
  readonly effects: Effects;
  onAction: (action: SceneAction) => void = () => {};
  onTimeChange: (hour: number) => void = () => {};
  private hemi = new THREE.HemisphereLight(0xc3d8dc, 0x493221, 0.88);
  private key = new THREE.DirectionalLight(0xffdfad, 2.75);
  private fill = new THREE.DirectionalLight(0x8fb7ce, 0.85);
  private rim = new THREE.DirectionalLight(0xd6ecf2, 1.1);
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private elapsed = 0;
  private darkness = 0;
  private bottleAngle = 0;
  private bottleVelocity = 0;
  private draggingBottle = false;
  private dragAngle = 0;
  private demoTime = 0;
  private demoEvents = new Set<string>();

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(CONFIG.camera.fov, 1, 0.1, 180);
    this.camera.position.set(...CONFIG.camera.position);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(...CONFIG.camera.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.065;
    this.controls.enablePan = false;
    this.controls.minDistance = 12;
    this.controls.maxDistance = 62;
    this.controls.minPolarAngle = 0.35;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.scene.fog = new THREE.Fog(0x172a35, 58, 125);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    environment.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material instanceof THREE.MeshLambertMaterial && object.material.emissiveIntensity > 1) {
        object.material.emissiveIntensity *= 0.12;
      }
    });
    this.scene.environment = pmrem.fromScene(environment, 0.055).texture;
    this.scene.environmentIntensity = 0.48;
    environment.dispose();
    pmrem.dispose();
    this.key.position.set(-11, 20, 15);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    Object.assign(this.key.shadow.camera, { left: -22, right: 22, top: 20, bottom: -17, near: 1, far: 70 });
    this.key.shadow.bias = -0.0003;
    this.key.shadow.normalBias = 0.035;
    this.fill.position.set(14, 9, 7);
    this.rim.position.set(4, 13, -15);
    this.scene.add(this.hemi, this.key, this.fill, this.rim);
    this.assembly.position.y = CONFIG.axisY;
    this.assembly.name = 'Bottle and independent inner ocean';
    this.scene.add(this.assembly);
    this.world = new World(this.scene, this.assembly);
    this.ocean = new Ocean(this.assembly);
    this.ship = new Ship();
    this.assembly.add(this.ship.group);
    this.effects = new Effects(this.assembly);
    this.resize();
    this.step(0);
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const width = this.canvas.clientWidth || innerWidth;
    const height = this.canvas.clientHeight || innerHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.zoom = Math.min(1, this.camera.aspect / 1.45);
    this.camera.updateProjectionMatrix();
  }

  step(dt: number, demo = false) {
    this.elapsed += dt;
    if (this.state.autoCycle && !demo) {
      this.state.timeOfDay = (this.state.timeOfDay + dt * 0.22) % 24;
      this.onTimeChange(this.state.timeOfDay);
    }
    if (demo) this.applyDemoTimeline();
    const wind = this.state.weather === 'calm' ? 0.35 : this.state.weather === 'storm' ? 2.3 : 1;
    if (!this.draggingBottle) {
      this.bottleVelocity += (-this.bottleAngle * 18 - this.bottleVelocity * 5.2) * dt;
      this.bottleAngle += this.bottleVelocity * dt;
    } else {
      const previous = this.bottleAngle;
      this.bottleAngle = THREE.MathUtils.damp(this.bottleAngle, this.dragAngle, 15, dt);
      this.bottleVelocity = dt > 0 ? (this.bottleAngle - previous) / dt : 0;
    }
    this.bottleAngle = clamp(this.bottleAngle, -0.16, 0.16);
    this.assembly.rotation.z = this.bottleAngle;
    this.ocean.update(this.elapsed, dt, this.state.weather, this.bottleAngle, this.bottleVelocity, this.state.reducedMotion);
    this.ship.update(this.elapsed, dt, (x, z) => this.ocean.sample(x, z), wind, this.darkness, this.state.reducedMotion);
    this.world.update(this.elapsed, this.darkness, wind, this.state.reducedMotion);
    this.effects.update(this.elapsed, dt, this.state.weather, (x, z) => this.ocean.sample(x, z), this.state.reducedMotion);
    this.updateLighting();
    if (demo) this.applyDemoCamera(this.demoTime);
    this.controls.update();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  private updateLighting() {
    const hour = this.state.timeOfDay;
    let a = LIGHT_STOPS[0];
    let b = LIGHT_STOPS[1];
    for (let i = 0; i < LIGHT_STOPS.length - 1; i++) {
      if (hour >= LIGHT_STOPS[i].hour && hour <= LIGHT_STOPS[i + 1].hour) {
        a = LIGHT_STOPS[i]; b = LIGHT_STOPS[i + 1]; break;
      }
    }
    const blend = smoothstep(hour, a.hour, b.hour);
    const background = new THREE.Color(a.background).lerp(new THREE.Color(b.background), blend);
    const keyColor = new THREE.Color(a.key).lerp(new THREE.Color(b.key), blend);
    const skyColor = new THREE.Color(a.sky).lerp(new THREE.Color(b.sky), blend);
    let keyIntensity = THREE.MathUtils.lerp(a.keyIntensity, b.keyIntensity, blend);
    let hemiIntensity = THREE.MathUtils.lerp(a.hemi, b.hemi, blend);
    let exposure = THREE.MathUtils.lerp(a.exposure, b.exposure, blend);
    this.darkness = THREE.MathUtils.lerp(a.darkness, b.darkness, blend);
    if (this.state.weather === 'storm') {
      background.lerp(new THREE.Color(0x101c28), 0.65);
      keyIntensity = Math.max(0.85, keyIntensity * 0.75);
      hemiIntensity = Math.max(0.55, hemiIntensity * 0.8);
      exposure = Math.max(1, exposure);
      this.darkness = Math.max(this.darkness, 0.68);
    }
    const lightning = this.effects.lightningAt(this.elapsed, this.state.weather);
    keyIntensity += lightning * 7;
    background.lerp(new THREE.Color(0xb8d3e1), lightning * 0.42);
    this.scene.background = background;
    this.key.color.copy(keyColor);
    this.key.intensity = keyIntensity;
    this.hemi.color.copy(skyColor);
    this.hemi.intensity = hemiIntensity;
    this.renderer.toneMappingExposure = exposure;
    this.scene.environmentIntensity = (0.48 - this.darkness * 0.32) * (this.state.weather === 'storm' ? 0.78 : 1);
    this.ocean.setLighting(this.darkness);
    const sunAngle = (hour - 6) / 12 * Math.PI;
    this.key.position.set(-11 + Math.cos(sunAngle) * 6, 8 + Math.max(0, Math.sin(sunAngle)) * 14, 15);
    this.fill.color.copy(new THREE.Color(0xa9c5d4).lerp(new THREE.Color(0x789fc4), this.darkness));
    this.fill.intensity = 0.64 - this.darkness * 0.14;
    this.rim.color.copy(new THREE.Color(0xd6ecf2).lerp(new THREE.Color(0x79a9dc), this.darkness));
    this.rim.intensity = 0.85 + this.darkness * 0.95;
  }

  setWeather(weather: Weather, notify = true) {
    this.state.weather = weather;
    if (notify) this.onAction('weather');
  }

  setTime(hour: number) {
    this.state.timeOfDay = ((hour % 24) + 24) % 24;
    this.onTimeChange(this.state.timeOfDay);
  }

  action(action: Exclude<SceneAction, 'weather' | 'ripple' | 'reset'>) {
    if (action === 'fire') this.effects.fire(this.ship, this.elapsed);
    if (action === 'dolphins') this.effects.summonDolphins(this.elapsed);
    if (action === 'barrel') this.effects.dropBarrel(this.elapsed);
    if (action === 'shake') this.bottleVelocity += this.state.reducedMotion ? 0.35 : 1.65;
    this.onAction(action);
  }

  applyQuality() {
    const high = this.state.quality === 'high';
    this.renderer.setPixelRatio(high ? Math.min(devicePixelRatio, 1.75) : 1);
    this.key.shadow.mapSize.setScalar(high ? 2048 : 1024);
    if (this.key.shadow.map) { this.key.shadow.map.dispose(); this.key.shadow.map = null; }
    this.resize();
  }

  reset(notify = true) {
    Object.assign(this.state, INITIAL_STATE);
    this.darkness = 0;
    this.ship.reset();
    this.ocean.reset();
    this.effects.reset();
    this.bottleAngle = this.bottleVelocity = 0;
    this.draggingBottle = false;
    this.dragAngle = 0;
    this.assembly.rotation.z = 0;
    this.controls.enableDamping = false;
    this.controls.update();
    this.camera.position.set(...CONFIG.camera.position);
    this.controls.target.set(...CONFIG.camera.target);
    this.controls.update();
    this.controls.enableDamping = true;
    this.applyQuality();
    if (notify) this.onAction('reset');
    this.onTimeChange(this.state.timeOfDay);
  }

  private setPointer(clientX: number, clientY: number) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set((clientX - rect.left) / rect.width * 2 - 1, -(clientY - rect.top) / rect.height * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  hitBottle(clientX: number, clientY: number) {
    this.setPointer(clientX, clientY);
    return this.raycaster.intersectObject(this.world.glass, false).length > 0;
  }

  beginBottleDrag() {
    this.draggingBottle = true;
    this.dragAngle = this.bottleAngle;
    return this.bottleAngle;
  }
  dragBottle(angle: number) { this.dragAngle = clamp(angle, -0.13, 0.13); }
  endBottleDrag(velocity: number) {
    this.draggingBottle = false;
    this.bottleVelocity += clamp(velocity, -2.5, 2.5) * (this.state.reducedMotion ? 0.25 : 1);
  }

  clickOcean(clientX: number, clientY: number) {
    this.setPointer(clientX, clientY);
    const hit = this.raycaster.intersectObject(this.ocean.surface, false)[0];
    if (!hit) return false;
    const local = this.assembly.worldToLocal(hit.point.clone());
    this.ocean.addRipple(local.x, local.z);
    this.effects.spawnSplash(new THREE.Vector3(local.x, CONFIG.seaLevel + this.ocean.sample(local.x, local.z) + 0.08, local.z), 8, 0.35);
    this.onAction('ripple');
    return true;
  }

  private applyDemoTimeline() {
    const t = this.demoTime;
    const once = (key: string, at: number, action: () => void) => {
      if (t >= at && !this.demoEvents.has(key)) { this.demoEvents.add(key); action(); }
    };
    once('salute', 6.1, () => this.action('fire'));
    once('dolphins', 8.7, () => this.action('dolphins'));
    once('barrel', 11.8, () => this.action('barrel'));
    once('rock', 13.4, () => this.action('shake'));
    once('storm', 20.7, () => this.setWeather('storm'));
    once('storm-rock', 22.5, () => this.action('shake'));
    once('calm-night', 26.8, () => this.setWeather('breeze'));
    once('night-dolphins', 28.2, () => this.action('dolphins'));
    if (t >= 14.5 && t < 20.7) this.setTime(THREE.MathUtils.lerp(10.4, 18.3, smoothstep(t, 14.5, 19.5)));
    else if (t >= 20.7 && t < 32) this.setTime(THREE.MathUtils.lerp(18.3, 22, smoothstep(t, 20.7, 24)));
    else if (t >= 32) this.setTime((22 + (t - 32) * 1.55) % 24);
  }

  private applyDemoCamera(t: number) {
    let a = DEMO_CAMERA[0];
    let b = DEMO_CAMERA[1];
    for (let i = 0; i < DEMO_CAMERA.length - 1; i++) {
      if (t >= DEMO_CAMERA[i].t && t <= DEMO_CAMERA[i + 1].t) { a = DEMO_CAMERA[i]; b = DEMO_CAMERA[i + 1]; break; }
    }
    const f = smoothstep(t, a.t, b.t);
    this.camera.position.set(
      THREE.MathUtils.lerp(a.p[0], b.p[0], f),
      THREE.MathUtils.lerp(a.p[1], b.p[1], f),
      THREE.MathUtils.lerp(a.p[2], b.p[2], f),
    );
    this.controls.target.set(
      THREE.MathUtils.lerp(a.target[0], b.target[0], f),
      THREE.MathUtils.lerp(a.target[1], b.target[1], f),
      THREE.MathUtils.lerp(a.target[2], b.target[2], f),
    );
  }

  renderDemoAt(time: number) {
    if (time < this.demoTime || time === 0) {
      this.reset(false);
      this.elapsed = 0;
      this.demoTime = 0;
      this.demoEvents.clear();
      this.step(0, true);
    }
    while (this.demoTime < time - 0.00001) {
      const dt = Math.min(1 / 30, time - this.demoTime);
      this.demoTime += dt;
      this.step(dt, true);
    }
    this.render();
    return this.demoTime;
  }

  getDiagnostics() {
    const gl = this.renderer.getContext();
    const extension = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      elapsed: this.elapsed,
      demoTime: this.demoTime,
      timeOfDay: this.state.timeOfDay,
      weather: this.state.weather,
      bottleAngle: this.bottleAngle,
      waterAmplitude: this.ocean.waveAmplitude,
      camera: this.camera.position.toArray(),
      quality: this.state.quality,
      reducedMotion: this.state.reducedMotion,
      autoCycle: this.state.autoCycle,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    };
  }
}
