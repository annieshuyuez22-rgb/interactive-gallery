import './style.css';
import { CONFIG } from './config';
import { CrushSimulation } from './physics';
import { CrushScene, type FrameInfo } from './scene';
import type { DriveControl } from './types';

const params = new URLSearchParams(location.search);
const recordMode = params.has('record');
const carCount = params.get('test') === 'single' ? 1 : CONFIG.carCount;
if (recordMode) document.body.classList.add('record');
const canvas = document.querySelector<HTMLCanvasElement>('#scene')!;
const simulation = new CrushSimulation(carCount);
const world = new CrushScene(canvas, simulation);
const intro = document.querySelector<HTMLElement>('#intro')!;
const replay = document.querySelector<HTMLElement>('#replay')!;
const method = document.querySelector<HTMLElement>('#method')!;
const replayLabel = document.querySelector<HTMLElement>('#replay-label')!;
const phaseLabel = document.querySelector<HTMLElement>('#phase-label')!;
const phaseIndex = document.querySelector<HTMLElement>('#phase-index')!;
const progress = document.querySelector<HTMLElement>('#progress')!;
const speed = document.querySelector<HTMLElement>('#speed')!;
const damage = document.querySelector<HTMLElement>('#damage')!;
document.querySelector<HTMLElement>('#iteration-label')!.textContent = `${CONFIG.iterations} DIRECTED ${CONFIG.iterations === 1 ? 'PASS' : 'PASSES'} · ${CONFIG.version.toUpperCase()}`;

class AudioEngine {
  private context: AudioContext | null = null;
  private engine: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noise: AudioBuffer | null = null;

  private ensure(): void {
    if (recordMode || this.context) return;
    this.context = new AudioContext();
    this.engine = this.context.createOscillator();
    this.engine.type = 'sawtooth';
    this.engineGain = this.context.createGain();
    this.engineGain.gain.value = 0.025;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 240;
    this.engine.connect(filter).connect(this.engineGain).connect(this.context.destination);
    this.engine.start();
    this.noise = this.context.createBuffer(1, this.context.sampleRate, this.context.sampleRate);
    const channel = this.noise.getChannelData(0);
    for (let i = 0; i < channel.length; i++) channel[i] = Math.random() * 2 - 1;
  }

  unlock(): void {
    this.ensure();
    void this.context?.resume();
  }

  update(): void {
    if (!this.context || !this.engine || !this.engineGain) return;
    const now = this.context.currentTime;
    const load = simulation.truck.wheels.reduce((sum, wheel) => sum + wheel.load, 0);
    this.engine.frequency.setTargetAtTime(42 + Math.abs(simulation.truck.vx) * 19 + load * 7, now, 0.06);
    this.engineGain.gain.setTargetAtTime(0.016 + Math.abs(simulation.truck.vx) * 0.008 + load * 0.004, now, 0.08);
    for (const event of simulation.events) {
      if (event.type === 'crush' || event.type === 'glass' || event.type === 'detach') this.burst(event.type === 'glass' ? 4200 : 380, event.type === 'glass' ? 0.12 : 0.2, event.intensity * 0.035);
    }
  }

  private burst(frequency: number, duration: number, volume: number): void {
    if (!this.context || !this.noise) return;
    const source = this.context.createBufferSource();
    source.buffer = this.noise;
    const filter = this.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = frequency;
    filter.Q.value = 0.75;
    const gain = this.context.createGain();
    const now = this.context.currentTime;
    gain.gain.setValueAtTime(Math.min(0.12, volume), now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    source.connect(filter).connect(gain).connect(this.context.destination);
    source.start(now);
    source.stop(now + duration);
  }
}

const audio = new AudioEngine();
let paused = false;
let slow = false;
let freeView = false;
let lastTime = performance.now();
let accumulator = 0;
const keys = new Set<string>();
const phases = ['APPROACH', 'FRONT AXLE / YIELD', 'DUAL-AXLE CRUSH', 'SECONDARY CRUSH', 'DEBRIS SETTLING', 'PERMANENT RESIDUE'];

function updateHud(info: FrameInfo): void {
  intro.classList.toggle('visible', info.mode === 'intro');
  replay.classList.toggle('visible', info.mode === 'replay');
  method.classList.toggle('visible', info.mode === 'method');
  replayLabel.textContent = info.replayLabel;
  const phase = info.mode === 'replay' ? 'INSPECTION REPLAY' : info.mode === 'method' ? 'PERMANENT RESIDUE' : simulation.phase;
  phaseLabel.textContent = phase;
  const index = Math.max(0, phases.indexOf(phase));
  phaseIndex.textContent = `${String(index + 1).padStart(2, '0')} / 06`;
  progress.style.width = `${Math.min(100, Math.max(0, info.videoTime / CONFIG.duration * 100))}%`;
  speed.textContent = `${Math.abs(simulation.truck.vx).toFixed(1)} M/S`;
  const affected = simulation.cars.filter((car) => car.totalDamage > 0.1).length;
  damage.textContent = `${affected}/${simulation.cars.length} PLASTIC`;
}

function renderFrame(time: number) {
  const info = world.renderVideoFrame(time);
  updateHud(info);
  return { ...info, diagnostics: world.getDiagnostics(), events: simulation.events };
}

function renderInteractive(): void {
  world.renderInteractive(freeView);
  updateHud({ videoTime: simulation.time + 2, simulationTime: simulation.time, mode: 'main', replayLabel: '', playbackRate: slow ? 0.35 : 1 });
}

function setAutomatic(value: boolean): void {
  simulation.automatic = value;
  document.querySelector<HTMLButtonElement>('#auto')!.classList.toggle('active', value);
  if (!value) simulation.control = { throttle: 0, steer: 0 };
}

function reset(targetCount = carCount): void {
  world.reset(targetCount);
  setAutomatic(true);
  paused = false;
  accumulator = 0;
  document.querySelector<HTMLButtonElement>('#pause')!.textContent = 'PAUSE';
  renderInteractive();
}

function runSteps(count: number, control?: DriveControl) {
  setAutomatic(false);
  if (control) simulation.control = control;
  for (let i = 0; i < count; i++) world.stepInteractive(CONFIG.fixedDt);
  renderInteractive();
  return world.getDiagnostics();
}

document.querySelector<HTMLButtonElement>('#auto')!.addEventListener('click', () => {
  audio.unlock();
  setAutomatic(!simulation.automatic);
});
document.querySelector<HTMLButtonElement>('#pause')!.addEventListener('click', (event) => {
  audio.unlock();
  paused = !paused;
  (event.currentTarget as HTMLButtonElement).textContent = paused ? 'RESUME' : 'PAUSE';
  (event.currentTarget as HTMLButtonElement).classList.toggle('active', paused);
});
document.querySelector<HTMLButtonElement>('#slow')!.addEventListener('click', (event) => {
  audio.unlock();
  slow = !slow;
  (event.currentTarget as HTMLButtonElement).classList.toggle('active', slow);
});
document.querySelector<HTMLButtonElement>('#reset')!.addEventListener('click', () => {
  audio.unlock();
  reset();
});
document.querySelector<HTMLButtonElement>('#camera')!.addEventListener('click', (event) => {
  audio.unlock();
  freeView = !freeView;
  world.setFreeView(freeView);
  (event.currentTarget as HTMLButtonElement).classList.toggle('active', freeView);
});
window.addEventListener('keydown', (event) => {
  if (['KeyW', 'KeyS', 'KeyA', 'KeyD', 'Space', 'KeyR'].includes(event.code)) event.preventDefault();
  keys.add(event.code);
  if (['KeyW', 'KeyS', 'KeyA', 'KeyD'].includes(event.code)) {
    audio.unlock();
    setAutomatic(false);
  }
  if (event.code === 'Space') document.querySelector<HTMLButtonElement>('#pause')!.click();
  if (event.code === 'KeyR') reset();
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('resize', () => world.resize());

function animate(now: number): void {
  const elapsed = Math.min(0.08, (now - lastTime) / 1000);
  lastTime = now;
  if (!paused) {
    accumulator += elapsed * (slow ? 0.35 : 1);
    while (accumulator >= CONFIG.fixedDt) {
      if (!simulation.automatic) {
        simulation.control.throttle = (keys.has('KeyW') ? 1 : 0) + (keys.has('KeyS') ? -1 : 0);
        simulation.control.steer = (keys.has('KeyD') ? 1 : 0) + (keys.has('KeyA') ? -1 : 0);
      }
      world.stepInteractive(CONFIG.fixedDt);
      accumulator -= CONFIG.fixedDt;
    }
  }
  renderInteractive();
  audio.update();
  requestAnimationFrame(animate);
}

const api = {
  ready: true,
  renderFrame,
  getState: () => world.getDiagnostics(),
  getCarField: (id: number) => {
    const car = simulation.cars[id];
    return car ? { nx: car.nx, nz: car.nz, values: Array.from(car.damage) } : null;
  },
  setSimulationTime: (time: number) => {
    world.setSimulationTime(time);
    renderInteractive();
    return world.getDiagnostics();
  },
  reset,
  runSteps,
  setAutomatic,
  setControl: (control: DriveControl) => {
    setAutomatic(false);
    simulation.control = control;
  },
  setPaused: (value: boolean) => { paused = value; },
  setFreeView: (value: boolean) => {
    freeView = value;
    world.setFreeView(value);
    renderInteractive();
  },
};

declare global {
  interface Window { __crush: typeof api }
}
window.__crush = api;
world.resize();
if (recordMode) renderFrame(0);
else {
  renderInteractive();
  requestAnimationFrame(animate);
}
