import './style.css';
import { CONFIG, type Weather } from './config';
import { BottledSeaScene, type SceneAction } from './scene';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const canvas = $<HTMLCanvasElement>('#scene');
const params = new URLSearchParams(location.search);
const recordMode = params.get('record') === '1';
const scene = new BottledSeaScene(canvas);
const reducePreference = matchMedia('(prefers-reduced-motion: reduce)').matches;
scene.state.reducedMotion = reducePreference;
if (innerWidth < 720) scene.state.quality = 'eco';
scene.applyQuality();

const messages: Record<SceneAction, string> = {
  fire: 'A broadside salute echoes within the glass.',
  dolphins: 'Three dolphins answer the Kestrel’s call.',
  barrel: 'A provision barrel splashes into the inner sea.',
  shake: 'The bottle rocks; the ocean follows a moment later.',
  ripple: 'A small ripple travels across the water.',
  weather: 'The sea changes its mood.',
  reset: 'Course reset. A fresh breeze fills the sails.',
};
let toastTimer = 0;
function toast(message: string) {
  if (recordMode) return;
  const element = $('#toast');
  element.textContent = message;
  element.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => element.classList.remove('visible'), 2200);
}
function formatTime(hour: number) {
  const totalMinutes = Math.round(hour * 60) % 1440;
  return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
}
function addLog(message: string) {
  const entries = $('#log-entries');
  const item = document.createElement('li');
  const time = document.createElement('time');
  time.textContent = formatTime(scene.state.timeOfDay);
  const text = document.createElement('span');
  text.textContent = message;
  item.append(time, text);
  entries.append(item);
  while (entries.children.length > 4) entries.firstElementChild?.remove();
}
function syncAuto() {
  const button = $<HTMLButtonElement>('#auto-cycle');
  button.classList.toggle('active', scene.state.autoCycle);
  button.setAttribute('aria-pressed', String(scene.state.autoCycle));
  button.querySelector('use')!.setAttribute('href', scene.state.autoCycle ? '#i-pause' : '#i-play');
}
function syncUI() {
  document.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach((button) => {
    const active = button.dataset.weather === scene.state.weather;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  $('#weather-readout').textContent = scene.state.weather === 'calm' ? 'CALM WATERS' : scene.state.weather === 'storm' ? 'STORM WARNING' : 'GENTLE BREEZE';
  $('#time-output').textContent = formatTime(scene.state.timeOfDay);
  $<HTMLInputElement>('#time-slider').value = String(scene.state.timeOfDay);
  $<HTMLButtonElement>('#motion-toggle').classList.toggle('active', scene.state.reducedMotion);
  $<HTMLButtonElement>('#motion-toggle').setAttribute('aria-pressed', String(scene.state.reducedMotion));
  $<HTMLButtonElement>('#quality-toggle').textContent = scene.state.quality === 'high' ? 'HD' : 'ECO';
  syncAuto();
}
scene.onTimeChange = () => {
  $('#time-output').textContent = formatTime(scene.state.timeOfDay);
  $<HTMLInputElement>('#time-slider').value = String(scene.state.timeOfDay);
};
scene.onAction = (action) => {
  if (action === 'weather') {
    messages.weather = scene.state.weather === 'storm' ? 'Storm clouds gather; the Kestrel holds her course.' : scene.state.weather === 'calm' ? 'The inner ocean settles into calm waters.' : 'A gentle breeze returns to the bottle.';
  }
  addLog(messages[action]);
  if (action !== 'ripple' && action !== 'weather' && action !== 'reset') toast(messages[action]);
  if (action === 'reset') toast('The little ocean has been reset.');
  syncUI();
  if (!recordMode && ['fire', 'dolphins', 'barrel', 'shake'].includes(action)) {
    const button = document.querySelector(`[data-action="${action}"]`);
    button?.classList.add('fired');
    window.setTimeout(() => button?.classList.remove('fired'), 600);
  }
};

document.querySelectorAll<HTMLButtonElement>('[data-weather]').forEach((button) => {
  button.addEventListener('click', () => scene.setWeather(button.dataset.weather as Weather));
});
document.querySelectorAll<HTMLButtonElement>('[data-action]').forEach((button) => {
  button.addEventListener('click', () => scene.action(button.dataset.action as 'fire' | 'dolphins' | 'barrel' | 'shake'));
});
$('#time-slider').addEventListener('input', (event) => {
  scene.state.autoCycle = false;
  scene.setTime(Number((event.target as HTMLInputElement).value));
  syncAuto();
});
$('#auto-cycle').addEventListener('click', () => {
  scene.state.autoCycle = !scene.state.autoCycle;
  addLog(scene.state.autoCycle ? 'The day–night cycle is now underway.' : 'The sun holds its position.');
  syncAuto();
});
$('#motion-toggle').addEventListener('click', () => {
  scene.state.reducedMotion = !scene.state.reducedMotion;
  toast(scene.state.reducedMotion ? 'Reduced motion enabled.' : 'Full motion restored.');
  syncUI();
});
$('#quality-toggle').addEventListener('click', () => {
  scene.state.quality = scene.state.quality === 'high' ? 'eco' : 'high';
  scene.applyQuality();
  syncUI();
});
$('#reset').addEventListener('click', () => scene.reset());
$('#log-toggle').addEventListener('click', () => {
  const log = $('#log-panel');
  const mobile = innerWidth <= 720;
  const expanded = mobile ? log.classList.toggle('expanded') : !log.classList.toggle('collapsed');
  $('#log-toggle').setAttribute('aria-expanded', String(expanded));
});

let drag: { id: number; startX: number; startY: number; startAngle: number; lastX: number; lastTime: number; velocity: number; moved: boolean } | null = null;
canvas.addEventListener('pointerdown', (event) => {
  if (event.button !== 0 || recordMode || !scene.hitBottle(event.clientX, event.clientY)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const startAngle = scene.beginBottleDrag();
  drag = { id: event.pointerId, startX: event.clientX, startY: event.clientY, startAngle, lastX: event.clientX, lastTime: performance.now(), velocity: 0, moved: false };
  canvas.setPointerCapture(event.pointerId);
}, { capture: true });
canvas.addEventListener('pointermove', (event) => {
  if (!drag || drag.id !== event.pointerId) return;
  const now = performance.now();
  const dt = Math.max(8, now - drag.lastTime) / 1000;
  const delta = event.clientX - drag.lastX;
  drag.velocity = delta * 0.0022 / dt;
  drag.lastX = event.clientX;
  drag.lastTime = now;
  if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 5) drag.moved = true;
  scene.dragBottle(drag.startAngle + (event.clientX - drag.startX) * 0.0022);
});
function finishDrag(event: PointerEvent) {
  if (!drag || drag.id !== event.pointerId) return;
  const wasMoved = drag.moved;
  const velocity = drag.velocity;
  drag = null;
  scene.endBottleDrag(velocity);
  if (!wasMoved) scene.clickOcean(event.clientX, event.clientY);
  else scene.onAction('shake');
}
canvas.addEventListener('pointerup', finishDrag);
canvas.addEventListener('pointercancel', finishDrag);

addEventListener('resize', () => scene.resize());
document.addEventListener('visibilitychange', () => { previous = performance.now(); });
let previous = performance.now();
let fpsFrames = 0;
let fpsTime = 0;
function tick(now: number) {
  requestAnimationFrame(tick);
  const dt = Math.min((now - previous) / 1000, 0.05);
  previous = now;
  if (document.hidden) return;
  scene.step(dt);
  scene.render();
  fpsFrames++;
  fpsTime += dt;
  if (fpsTime > 0.75) {
    $('#fps-readout').textContent = `${Math.round(fpsFrames / fpsTime)} FPS`;
    fpsFrames = fpsTime = 0;
  }
}

declare global {
  interface Window {
    __bottledSea: {
      ready: boolean;
      duration: number;
      renderFrame: (time: number) => ReturnType<BottledSeaScene['getDiagnostics']>;
      diagnostics: () => ReturnType<BottledSeaScene['getDiagnostics']>;
      action: (action: 'fire' | 'dolphins' | 'barrel' | 'shake') => void;
      setWeather: (weather: Weather) => void;
      setTime: (hour: number) => void;
      reset: () => void;
    };
  }
}
const initialLogHTML = $('#log-entries').innerHTML;
window.__bottledSea = {
  ready: true,
  duration: CONFIG.demoDuration,
  renderFrame: (time) => {
    if (recordMode && (time === 0 || time < scene.getDiagnostics().demoTime)) $('#log-entries').innerHTML = initialLogHTML;
    scene.renderDemoAt(time);
    syncUI();
    return scene.getDiagnostics();
  },
  diagnostics: () => scene.getDiagnostics(),
  action: (action) => scene.action(action),
  setWeather: (weather) => scene.setWeather(weather),
  setTime: (hour) => scene.setTime(hour),
  reset: () => scene.reset(false),
};

syncUI();
if (recordMode) {
  document.body.classList.add('recording');
  $('#fps-readout').textContent = 'WEBGL2';
  scene.renderDemoAt(0);
} else {
  requestAnimationFrame(tick);
}
Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1800))]).then(() => {
  requestAnimationFrame(() => $('#loading').classList.add('loaded'));
});
