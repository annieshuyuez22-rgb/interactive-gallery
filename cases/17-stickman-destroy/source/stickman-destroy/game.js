/* Destroy Any Website — stickman edition. Vanilla JS, no deps. */
'use strict';

// ============================== utils ==============================
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist2 = (x1, y1, x2, y2) => { const dx = x2 - x1, dy = y2 - y1; return dx * dx + dy * dy; };
const TAU = Math.PI * 2;

// ============================== DOM ==============================
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const $ = id => document.getElementById(id);
const ui = {
  menu: $('menu'), loading: $('loading'), pause: $('pause'), win: $('win'), hud: $('hud'),
  urlInput: $('urlInput'), btnPlay: $('btnPlay'),
  loadStatus: $('loadStatus'), loadUrl: $('loadUrl'),
  siteInfo: $('siteInfo'), pauseHost: $('pauseHost'), winHost: $('winHost'),
  weapons: $('weapons'),
  stTime: $('stTime'), stTiles: $('stTiles'), stShots: $('stShots'),
};

let DPR = 1, VIEW_W = 0, VIEW_H = 0;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  VIEW_W = window.innerWidth; VIEW_H = window.innerHeight;
  canvas.width = Math.round(VIEW_W * DPR);
  canvas.height = Math.round(VIEW_H * DPR);
  canvas.style.width = VIEW_W + 'px';
  canvas.style.height = VIEW_H + 'px';
}
window.addEventListener('resize', resize);
resize();

// ============================== audio ==============================
const AudioSys = {
  ctx: null, master: null, enabled: true, noiseBuf: null, lastCrumble: 0,
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.4;
    this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  },
  resume() { if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); },
  env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  },
  tone(type, f0, f1, dur, vol, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    this.env(g, t, 0.004, vol, dur);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol, type = 'lowpass', f0 = 1000, f1 = 100, Q = 0.8, delay = 0) {
    if (!this.ctx || !this.enabled) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = Q;
    f.frequency.setValueAtTime(f0, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(f1, 10), t + dur);
    const g = this.ctx.createGain();
    this.env(g, t, 0.005, vol, dur);
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start(t); s.stop(t + dur + 0.05);
  },
  shoot(w) {
    if (!this.ctx || !this.enabled) return;
    switch (w) {
      case 0: this.noise(0.09, 0.5, 'highpass', 1200, 500, 1); this.tone('square', 320, 90, 0.08, 0.25); break;
      case 1: this.noise(0.06, 0.35, 'highpass', 1500, 700, 1); this.tone('square', 380, 140, 0.05, 0.16); break;
      case 2: this.noise(0.22, 0.8, 'lowpass', 3000, 200, 1); this.tone('sine', 140, 45, 0.22, 0.6); break;
      case 3: this.noise(0.5, 0.4, 'bandpass', 500, 1500, 2); this.tone('sawtooth', 160, 400, 0.35, 0.14); break;
      case 4: this.tone('sawtooth', 2400, 80, 0.3, 0.4); this.noise(0.25, 0.5, 'highpass', 2500, 800, 2); break;
      case 6: this.noise(0.25, 0.3, 'bandpass', 700, 1800, 2); break;
    }
  },
  explode(size = 1) {
    if (!this.ctx || !this.enabled) return;
    this.noise(0.5 * size, 0.9, 'lowpass', 900, 60, 0.6);
    this.tone('sine', 110, 30, 0.45 * size, 0.8);
    this.noise(0.18, 0.4, 'highpass', 2000, 500, 1);
  },
  crumble() {
    const now = performance.now();
    if (now - this.lastCrumble < 60) return;
    this.lastCrumble = now;
    this.noise(0.05, 0.16, 'bandpass', 1800, 900, 1.5);
  },
  jump() { this.tone('sine', 280, 520, 0.12, 0.18); },
  flip() { this.tone('sine', 400, 800, 0.14, 0.15); },
  land(hard) { this.noise(0.08, hard ? 0.4 : 0.15, 'lowpass', 500, 120, 1); },
  bounce() { this.tone('sine', 200, 120, 0.06, 0.12); },
  win() { [523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.22, 0.3, i * 0.12)); },
  // continuous loops (flamethrower / jetpack)
  makeLoop(freq, q, type = 'lowpass') {
    if (!this.ctx) return null;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = this.ctx.createGain(); g.gain.value = 0;
    s.connect(f); f.connect(g); g.connect(this.master);
    s.start();
    return { s, g };
  },
};

// ============================== input ==============================
const keys = {};
const mouse = { x: 0, y: 0, down: false, clicked: false, rclicked: false };
let wheelDelta = 0;

window.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') togglePause();
  if (state === 'play') {
    if (e.code.startsWith('Digit')) {
      const n = +e.code.slice(5);
      if (n >= 1 && n <= WEAPONS.length) switchWeapon(n - 1);
    }
    if (e.code === 'KeyR' || e.code === 'KeyG') throwGrenade();
  }
});
window.addEventListener('keyup', e => { keys[e.code] = false; });
canvas.addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
canvas.addEventListener('mousedown', e => {
  AudioSys.init(); AudioSys.resume();
  if (e.button === 0) { mouse.down = true; mouse.clicked = true; }
  if (e.button === 2) { mouse.rclicked = true; }
});
window.addEventListener('mouseup', e => { if (e.button === 0) mouse.down = false; });
window.addEventListener('contextmenu', e => e.preventDefault());
window.addEventListener('wheel', e => { if (state === 'play') { wheelDelta += Math.sign(e.deltaY); e.preventDefault(); } }, { passive: false });
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(true); });

// ============================== level ==============================
const TILE = 16;
const MAX_LEVEL_H = 8000;

const level = {
  w: 0, h: 0, cols: 0, rows: 0,
  srcCanvas: null,          // pristine screenshot copy (for debris pixels)
  viewCanvas: null, vctx: null, // destructible render
  solid: null, hp: null,
  burning: new Map(),
  totalSolid: 0, destroyed: 0,
  host: '', url: '',
};
const TILE_HP = 30;

function tileIndex(tx, ty) { return ty * level.cols + tx; }
function solidAt(tx, ty) {
  if (tx < 0 || tx >= level.cols || ty < 0) return false;
  if (ty >= level.rows) return true; // invisible floor
  return !!level.solid[tileIndex(tx, ty)];
}
function solidAtPx(x, y) { return solidAt(Math.floor(x / TILE), Math.floor(y / TILE)); }

function screenshotURLs(url) {
  const w = 1280;
  return [
    `https://image.thum.io/get/fullpage/width/${w}/${url}`,
    `https://image.thum.io/get/width/${w}/${url}`,
  ];
}

function loadImage(url, timeout = 45000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    const to = setTimeout(() => { img.src = ''; reject(new Error('timeout')); }, timeout);
    img.onload = () => { clearTimeout(to); resolve(img); };
    img.onerror = () => { clearTimeout(to); reject(new Error('load failed')); };
    img.src = url;
  });
}

async function loadLevel(url, onStatus) {
  let img = null;
  if (url !== 'demo') {
    onStatus('Contacting the website…');
    for (const shot of screenshotURLs(url)) {
      try {
        onStatus('Downloading page render…');
        img = await loadImage(shot);
        break;
      } catch (e) { /* try next */ }
    }
  }
  await new Promise(r => requestAnimationFrame(r));
  if (!img) {
    onStatus('Site unreachable — deploying the offline demo site…');
    await new Promise(r => setTimeout(r, 500));
    img = buildDemoSite();
  }
  onStatus('Slicing into tiles…');
  await new Promise(r => requestAnimationFrame(r));
  sliceLevel(img, url);
}

function sliceLevel(img, url) {
  const w = img.width || img.naturalWidth || 1280;
  const h = Math.min(img.height || img.naturalHeight || 800, MAX_LEVEL_H);
  level.w = w; level.h = h;
  level.cols = Math.ceil(w / TILE);
  level.rows = Math.ceil(h / TILE);

  level.srcCanvas = document.createElement('canvas');
  level.srcCanvas.width = w; level.srcCanvas.height = h;
  level.srcCanvas.getContext('2d').drawImage(img, 0, 0, w, h);

  level.viewCanvas = document.createElement('canvas');
  level.viewCanvas.width = w; level.viewCanvas.height = h;
  level.vctx = level.viewCanvas.getContext('2d');
  level.vctx.drawImage(img, 0, 0, w, h);

  // scorch layer: fuzzy charred halos around destroyed areas (drawn over the page)
  level.scorchCanvas = document.createElement('canvas');
  level.scorchCanvas.width = w; level.scorchCanvas.height = h;
  level.sctx = level.scorchCanvas.getContext('2d');

  // dominant background color (sampled histogram)
  const data = level.vctx.getImageData(0, 0, w, h).data;
  const hist = new Map();
  const step = 16;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4;
      const key = ((data[i] >> 4) << 8) | ((data[i + 1] >> 4) << 4) | (data[i + 2] >> 4);
      hist.set(key, (hist.get(key) || 0) + 1);
    }
  }
  let bgKey = 0xfff, bgN = 0;
  for (const [k, n] of hist) if (n > bgN) { bgN = n; bgKey = k; }
  const bg = { r: ((bgKey >> 8) & 15) * 17, g: ((bgKey >> 4) & 15) * 17, b: (bgKey & 15) * 17 };

  level.solid = new Uint8Array(level.cols * level.rows);
  level.hp = new Float32Array(level.cols * level.rows);
  level.burning.clear();
  level.totalSolid = 0; level.destroyed = 0;

  const THRESH = 42 * 42; // squared color distance from background
  for (let ty = 0; ty < level.rows; ty++) {
    for (let tx = 0; tx < level.cols; tx++) {
      const x0 = tx * TILE, y0 = ty * TILE;
      let ink = 0, n = 0;
      for (let y = y0; y < Math.min(y0 + TILE, h); y += 2) {
        for (let x = x0; x < Math.min(x0 + TILE, w); x += 2) {
          const i = (y * w + x) * 4;
          const dr = data[i] - bg.r, dg = data[i + 1] - bg.g, db = data[i + 2] - bg.b;
          if (dr * dr + dg * dg + db * db > THRESH) ink++;
          n++;
        }
      }
      if (n > 0 && ink / n > 0.05) {
        const idx = tileIndex(tx, ty);
        level.solid[idx] = 1;
        level.hp[idx] = TILE_HP;
        level.totalSolid++;
      }
    }
  }
  level.url = url;
  try { level.host = url === 'demo' ? 'offline-demo.site' : new URL(url).hostname; } catch { level.host = url; }
}

function drawScorch(px, py, big = false) {
  // irregular fuzzy burn mark: main blob + satellite blobs
  const s = level.sctx;
  if (!s) return;
  const R = TILE * (big ? rand(1.5, 2.2) : rand(1.05, 1.4));
  const blob = (x, y, r, a) => {
    const g = s.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(18,14,36,${a})`);
    g.addColorStop(0.55, `rgba(18,14,36,${a * 0.75})`);
    g.addColorStop(1, 'rgba(18,14,36,0)');
    s.fillStyle = g;
    s.fillRect(x - r, y - r, r * 2, r * 2);
  };
  blob(px, py, R, 0.92);
  blob(px + rand(-TILE * 0.7, TILE * 0.7), py + rand(-TILE * 0.7, TILE * 0.7), R * 0.6, 0.8);
  if (Math.random() < 0.6) blob(px + rand(-TILE, TILE), py + rand(-TILE, TILE), R * 0.4, 0.7);
}

function destroyTile(tx, ty, dirx = 0, diry = -1, silent = false) {
  if (!solidAt(tx, ty) || ty >= level.rows) return false;
  const idx = tileIndex(tx, ty);
  level.solid[idx] = 0;
  level.burning.delete(idx);
  level.destroyed++;
  level.vctx.clearRect(tx * TILE, ty * TILE, TILE, TILE);
  drawScorch(tx * TILE + TILE / 2, ty * TILE + TILE / 2);
  if (!silent) {
    spawnTileDebris(tx, ty, dirx, diry);
    AudioSys.crumble();
  }
  return true;
}

// area damage: destroy the core, scorch-damage the rim
function splashDamage(x, y, r, dmg) {
  const tx0 = Math.max(0, Math.floor((x - r) / TILE)), tx1 = Math.min(level.cols - 1, Math.floor((x + r) / TILE));
  const ty0 = Math.max(0, Math.floor((y - r) / TILE)), ty1 = Math.min(level.rows - 1, Math.floor((y + r) / TILE));
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!solidAt(tx, ty)) continue;
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      const d = Math.sqrt(dist2(x, y, cx, cy));
      if (d > r) continue;
      const nx = (cx - x) / (d || 1), ny = (cy - y) / (d || 1);
      if (d < r * 0.62) destroyTile(tx, ty, nx * 260, ny * 260 - 90);
      else damageTile(tx, ty, dmg * (1 - d / r) + 8, nx * 160, ny * 160);
    }
  }
}

function damageTile(tx, ty, dmg, dirx = 0, diry = -1) {
  if (!solidAt(tx, ty) || ty >= level.rows) return false;
  const idx = tileIndex(tx, ty);
  level.hp[idx] -= dmg;
  if (level.hp[idx] <= 0) {
    destroyTile(tx, ty, dirx, diry);
  } else {
    // scorch mark
    level.vctx.fillStyle = 'rgba(0,0,0,0.16)';
    level.vctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
  }
  return true;
}

function igniteTile(tx, ty) {
  if (!solidAt(tx, ty) || ty >= level.rows) return;
  const idx = tileIndex(tx, ty);
  if (!level.burning.has(idx)) level.burning.set(idx, rand(1.2, 2));
}

function explode(x, y, r, opts = {}) {
  const tx0 = Math.max(0, Math.floor((x - r) / TILE)), tx1 = Math.min(level.cols - 1, Math.floor((x + r) / TILE));
  const ty0 = Math.max(0, Math.floor((y - r) / TILE)), ty1 = Math.min(level.rows - 1, Math.floor((y + r) / TILE));
  const kill = r * 0.62;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (!solidAt(tx, ty)) continue;
      const cx = tx * TILE + TILE / 2, cy = ty * TILE + TILE / 2;
      const d = Math.sqrt(dist2(x, y, cx, cy));
      if (d > r) continue;
      const nx = (cx - x) / (d || 1), ny = (cy - y) / (d || 1);
      const force = 180 + r * 1.6;
      if (d < kill) destroyTile(tx, ty, nx * force, ny * force - 120);
      else damageTile(tx, ty, 60 * (1 - d / r) + 20, nx * force * 0.6, ny * force * 0.6);
      if (!opts.noFire && Math.random() < 0.14) igniteTile(tx, ty);
    }
  }
  // juice
  spawnExplosionParticles(x, y, r);
  camera.trauma = Math.min(1, camera.trauma + r / 150);
  if (!opts.silent) AudioSys.explode(clamp(r / 90, 0.6, 1.5));
  // player knockback (rocket jump!)
  const px = player.x, py = player.y - player.h / 2;
  const d = Math.sqrt(dist2(x, y, px, py));
  const reach = r * 1.6;
  if (state === 'play' && d < reach) {
    const f = (1 - d / reach) * 1250;
    player.vx += ((px - x) / (d || 1)) * f;
    player.vy += ((py - y) / (d || 1)) * f - 220;
    player.onGround = false;
  }
  checkWin();
}

function updateBurning(dt) {
  if (level.burning.size === 0) return;
  let spreadTimer = (updateBurning.t || 0) + dt;
  const doSpread = spreadTimer > 0.25;
  if (doSpread) updateBurning.t = 0; else updateBurning.t = spreadTimer;
  const toIgnite = [];
  for (const [idx, t] of level.burning) {
    const tx = idx % level.cols, ty = (idx / level.cols) | 0;
    const nt = t - dt;
    level.hp[idx] -= 26 * dt;
    if (Math.random() < 0.35) spawnFlame(tx * TILE + rand(TILE), ty * TILE + rand(TILE), rand(-20, 20), rand(-90, -40), 0.5);
    if (level.hp[idx] <= 0 || nt <= 0) {
      destroyTile(tx, ty, rand(-60, 60), rand(-160, -60));
      continue;
    }
    level.burning.set(idx, nt);
    if (doSpread) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (Math.random() < 0.14 && solidAt(tx + dx, ty + dy)) toIgnite.push([tx + dx, ty + dy]);
      }
    }
  }
  for (const [tx, ty] of toIgnite) igniteTile(tx, ty);
}

// --------- offline demo site (drawn on a canvas, behaves like a screenshot) ---------
function buildDemoSite() {
  const w = 1280, h = 2600;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, w, h);
  const wrap = (text, x, y, maxW, lh, font, color) => {
    g.font = font; g.fillStyle = color;
    for (const para of text.split('\n')) {
      let line = '';
      for (const word of para.split(' ')) {
        const t = line ? line + ' ' + word : word;
        if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = word; }
        else line = t;
      }
      if (line) { g.fillText(line, x, y); y += lh; }
      y += lh * 0.4;
    }
    return y;
  };
  // masthead
  g.fillStyle = '#111118'; g.fillRect(0, 0, w, 96);
  g.fillStyle = '#ff7a1a'; g.font = '900 44px Georgia, serif'; g.fillText('THE DAILY STICK', 40, 62);
  g.fillStyle = '#8a8a95'; g.font = '14px sans-serif'; g.fillText('All the news that fits to print · est. 2006', 40, 84);
  g.fillStyle = '#ff7a1a'; g.fillRect(0, 96, w, 6);
  // nav
  g.fillStyle = '#f2f2f6'; g.fillRect(0, 102, w, 44);
  g.font = 'bold 15px sans-serif'; g.fillStyle = '#333340';
  ['FRONTLINES', 'WEATHER', 'CATS', 'ECONOMY', 'SPORTS', 'OPINION', 'PIXELS'].forEach((s, i) => g.fillText(s, 44 + i * 165, 130));
  // hero
  let y = 220;
  y = wrap('STICKMAN DECLARES WAR ON LOCAL WEBSITE, VOWS TO BREAK EVERY LAST PIXEL', 40, y, 760, 52, '900 44px Georgia, serif', '#15151c');
  y += 10;
  y = wrap('Witnesses report a small orange figure armed with an improbable arsenal. "It just kept jumping and shouting about therapy," said one paragraph, moments before being blown to pieces.', 40, y, 740, 26, 'italic 18px Georgia, serif', '#55555f');
  y += 26;
  // hero image
  const grad = g.createLinearGradient(820, 180, 1240, 560);
  grad.addColorStop(0, '#ff9a3c'); grad.addColorStop(1, '#c33d00');
  g.fillStyle = grad; g.fillRect(820, 180, 420, 380);
  g.strokeStyle = '#111'; g.lineWidth = 5;
  g.beginPath(); g.arc(1030, 300, 26, 0, TAU); g.moveTo(1030, 326); g.lineTo(1030, 420); g.moveTo(1030, 350); g.lineTo(980, 390); g.moveTo(1030, 350); g.lineTo(1085, 380); g.moveTo(1030, 420); g.lineTo(990, 500); g.moveTo(1030, 420); g.lineTo(1075, 500); g.stroke();
  g.fillStyle = '#111'; g.fillRect(980, 560, 260, 18);
  g.font = '12px sans-serif'; g.fillStyle = '#777'; g.fillText('The suspect, moments before the incident.', 820, 596);
  // body columns
  const lorem = 'The website, a respected collection of text and images, had stood peacefully for years before the attack. Residents of the header described a single blinding flash, followed by half the page simply ceasing to exist.\nAuthorities advise staying inside solid divs and avoiding all falling debris. The sidebar has been evacuated. Experts estimate the damage at well over one hundred percent of the page.\n"Frankly, we had it coming," admitted the footer. "Nobody should have that many carousel slides."';
  let y2 = wrap(lorem, 40, y, 560, 24, '17px Georgia, serif', '#22222a');
  // fact box
  g.fillStyle = '#fff4e8'; g.fillRect(640, y - 10, 300, 250);
  g.strokeStyle = '#ff7a1a'; g.lineWidth = 3; g.strokeRect(640, y - 10, 300, 250);
  y = wrap('BY THE NUMBERS\n3 payloads. 1 stickman. 0 survivors. 100% of pixels considered harmed.', 660, y + 24, 260, 24, 'bold 16px sans-serif', '#a3540a');
  // more text
  y2 = wrap('In related news, a grenade was seen bouncing innocently near the comment section before the entire area was scorched beyond recognition. The comment section is not expected to recover, which experts call "no great loss".\nThe stickman was last seen jetpacking toward the footer, laughing. Anyone with information is asked to remain perfectly calm and keep scrolling.', 40, y2 + 20, 560, 24, '17px Georgia, serif', '#22222a');
  // image row
  for (let i = 0; i < 3; i++) {
    const gx = 40 + i * 410, gy = 1560;
    const gg = g.createLinearGradient(gx, gy, gx + 380, gy + 240);
    gg.addColorStop(0, ['#3c7dff', '#37c872', '#b03cff'][i]);
    gg.addColorStop(1, ['#0a2fa0', '#0a6a38', '#5a0a90'][i]);
    g.fillStyle = gg; g.fillRect(gx, gy, 380, 240);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '900 60px sans-serif';
    g.fillText(['POW', 'BAM', 'KABOOM'][i], gx + 40, gy + 140);
    g.fillStyle = '#777'; g.font = '12px sans-serif';
    g.fillText('Artist\'s rendering of events #' + (i + 1), gx, gy + 262);
  }
  // long article tail
  let y3 = wrap('BREAKING: everything is fine. Please disregard the previous eight paragraphs. The situation is under control and the website has never been in better shape. This sentence exists purely to give you more to destroy.\n' + 'More text means more tiles. More tiles means more debris. More debris means more fun. '.repeat(12), 40, 1900, 1180, 24, '17px Georgia, serif', '#22222a');
  // footer
  g.fillStyle = '#111118'; g.fillRect(0, 2450, w, 150);
  g.fillStyle = '#666'; g.font = '14px sans-serif';
  g.fillText('© 2006–2026 The Daily Stick · All rights reserved · Especially the right to remain destroyed', 40, 2500);
  g.fillStyle = '#ff7a1a'; g.fillText('This site was built to be broken.', 40, 2530);
  return c;
}

// ============================== particles ==============================
let particles = [];
const MAX_PARTICLES = 1300;

function spawnTileDebris(tx, ty, dirx = 0, diry = -100) {
  if (particles.length > MAX_PARTICLES - 8 && Math.random() < 0.6) return;
  const s = TILE / 2;
  for (let cy = 0; cy < 2; cy++) {
    for (let cx = 0; cx < 2; cx++) {
      particles.push({
        kind: 'debris',
        x: tx * TILE + cx * s + s / 2, y: ty * TILE + cy * s + s / 2,
        vx: dirx * rand(0.2, 0.8) + rand(-90, 90),
        vy: diry * rand(0.2, 0.8) + rand(-140, -20),
        rot: rand(TAU), vr: rand(-9, 9),
        sx: tx * TILE + cx * s, sy: ty * TILE + cy * s, s,
        ttl: rand(1.6, 2.8), max: 2.8,
      });
    }
  }
}
function spawnSparks(x, y, n, dirx = 0, diry = 0, spread = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.atan2(diry, dirx) + rand(-spread, spread);
    const sp = rand(120, 520);
    particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, ttl: rand(0.15, 0.4), max: 0.4 });
  }
}
function spawnSmoke(x, y, n, big = false) {
  for (let i = 0; i < n; i++) {
    particles.push({
      kind: 'smoke', x: x + rand(-8, 8), y: y + rand(-8, 8),
      vx: rand(-40, 40), vy: rand(-90, -30),
      r: big ? rand(10, 22) : rand(4, 9), grow: big ? rand(20, 40) : rand(8, 16),
      ttl: rand(0.6, 1.3), max: 1.3,
    });
  }
}
function spawnFlame(x, y, vx, vy, ttl = 0.5) {
  particles.push({ kind: 'flame', x, y, vx: vx + rand(-35, 35), vy: vy + rand(-35, 35), r: rand(8, 16), ttl: ttl * rand(0.7, 1.1), max: ttl });
}
function spawnFlash(x, y, r) {
  particles.push({ kind: 'flash', x, y, r, ttl: 0.09, max: 0.09 });
}
function spawnRing(x, y, r) {
  particles.push({ kind: 'ring', x, y, r, ttl: 0.32, max: 0.32 });
}
function spawnCasing(x, y, dir) {
  particles.push({ kind: 'casing', x, y, vx: -dir * rand(60, 140) + rand(-20, 20), vy: rand(-190, -120), rot: rand(TAU), vr: rand(-14, 14), ttl: 1.4, max: 1.4 });
}
function spawnDust(x, y, n) {
  for (let i = 0; i < n; i++) {
    particles.push({ kind: 'smoke', x: x + rand(-8, 8), y: y - 2, vx: rand(-70, 70), vy: rand(-40, -5), r: rand(2, 5), grow: rand(6, 12), ttl: rand(0.3, 0.6), max: 0.6 });
  }
}
function spawnExplosionParticles(x, y, r) {
  spawnFlash(x, y, r * 1.4);
  spawnRing(x, y, r * 1.15);
  // pixel fireball: chunky orange/red blobs, like classic sprite explosions
  const n = Math.round(r / 7);
  const palette = ['#ffd23c', '#ff9a1f', '#ff6a1f', '#e83a1a', '#a3220e'];
  for (let i = 0; i < n; i++) {
    const a = rand(TAU), d = rand(0, r * 0.55);
    particles.push({
      kind: 'fireblob',
      x: x + Math.cos(a) * d, y: y + Math.sin(a) * d,
      vx: Math.cos(a) * rand(60, 320), vy: Math.sin(a) * rand(60, 320) - 60,
      s: rand(8, 8 + r * 0.14),
      col: palette[Math.floor(rand(palette.length))],
      ttl: rand(0.3, 0.55), max: 0.55,
    });
  }
  spawnSmoke(x, y, Math.round(r / 9), true);
  // long-range sparks flying across the screen
  const ns = Math.round(r / 4.5);
  for (let i = 0; i < ns; i++) {
    const a = rand(TAU);
    const sp = rand(350, 950);
    particles.push({ kind: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 150, ttl: rand(0.3, 0.75), max: 0.75 });
  }
  for (let i = 0; i < r / 10; i++) spawnFlame(x + rand(-r / 3, r / 3), y + rand(-r / 3, r / 3), rand(-140, 140), rand(-240, -60), 0.55);
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.ttl -= dt;
    if (p.ttl <= 0) { particles.splice(i, 1); continue; }
    switch (p.kind) {
      case 'debris': case 'casing': {
        p.vy += 1500 * dt;
        const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt;
        if (solidAtPx(nx, ny + (p.kind === 'debris' ? p.s / 2 : 2))) {
          p.vy *= -0.35; p.vx *= 0.55; p.vr *= 0.5;
          p.x = nx; // stay above
        } else { p.x = nx; p.y = ny; }
        p.rot += p.vr * dt;
        break;
      }
      case 'spark': p.vy += 800 * dt; p.x += p.vx * dt; p.y += p.vy * dt; break;
      case 'smoke': p.vy -= 40 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.r += p.grow * dt; break;
      case 'flame': p.vy -= 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; break;
      case 'fireblob': p.vy += 300 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= (1 - 2.2 * dt); break;
    }
  }
}

// ============================== projectiles ==============================
let bullets = [], rockets = [], missiles = [], grenades = [], flameShots = [], beams = [];

function updateBullets(dt) {
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.ttl -= dt;
    let dead = b.ttl <= 0;
    if (!dead) {
      const steps = Math.ceil((b.speed * dt) / 8);
      for (let s = 0; s < steps && !dead; s++) {
        b.x += (b.vx * dt) / steps;
        b.y += (b.vy * dt) / steps;
        const tx = Math.floor(b.x / TILE), ty = Math.floor(b.y / TILE);
        if (solidAt(tx, ty) && ty < level.rows) {
          splashDamage(b.x, b.y, b.splash || 5, b.dmg);
          spawnSparks(b.x, b.y, 5, -b.vx, -b.vy, 1.8);
          spawnFlash(b.x, b.y, 8);
          dead = true;
        }
        if (b.x < 0 || b.x > level.w || b.y > level.h) dead = true;
      }
    }
    if (dead) bullets.splice(i, 1);
  }
}

function updateRockets(dt) {
  for (let i = rockets.length - 1; i >= 0; i--) {
    const r = rockets[i];
    r.ttl -= dt;
    r.x += r.vx * dt; r.y += r.vy * dt;
    if (Math.random() < 0.8) particles.push({ kind: 'smoke', x: r.x, y: r.y, vx: rand(-15, 15), vy: rand(-15, 15), r: rand(2, 4), grow: 14, ttl: 0.5, max: 0.5 });
    spawnFlame(r.x - r.vx * 0.012, r.y - r.vy * 0.012, -r.vx * 0.15, -r.vy * 0.15, 0.16);
    if (r.ttl <= 0 || solidAtPx(r.x, r.y)) { explode(r.x, r.y, 175); rockets.splice(i, 1); }
  }
}

function updateMissiles(dt) {
  for (let i = missiles.length - 1; i >= 0; i--) {
    const m = missiles[i];
    m.ttl -= dt;
    m.retarget -= dt;
    if (m.retarget <= 0) {
      m.retarget = 0.18;
      m.target = findMissileTarget(m);
    }
    if (m.target) {
      const want = Math.atan2(m.target.y - m.y, m.target.x - m.x);
      let diff = want - m.angle;
      while (diff > Math.PI) diff -= TAU;
      while (diff < -Math.PI) diff += TAU;
      m.angle += clamp(diff, -5.5 * dt, 5.5 * dt);
    }
    m.speed = Math.min(m.speed + 700 * dt, 520);
    m.x += Math.cos(m.angle) * m.speed * dt;
    m.y += Math.sin(m.angle) * m.speed * dt;
    particles.push({ kind: 'smoke', x: m.x, y: m.y, vx: rand(-10, 10), vy: rand(-10, 10), r: rand(1.5, 3), grow: 9, ttl: 0.35, max: 0.35 });
    if (m.ttl <= 0 || solidAtPx(m.x, m.y)) { explode(m.x, m.y, 78, { noFire: true }); missiles.splice(i, 1); }
  }
}

function findMissileTarget(m) {
  let best = null, bestD = 620 * 620;
  const fx = Math.cos(m.angle), fy = Math.sin(m.angle);
  // sample solid tiles near the missile's forward arc
  const tx0 = Math.max(0, Math.floor((m.x - 400) / TILE)), tx1 = Math.min(level.cols - 1, Math.floor((m.x + 400) / TILE));
  const ty0 = Math.max(0, Math.floor((m.y - 400) / TILE)), ty1 = Math.min(level.rows - 1, Math.floor((m.y + 400) / TILE));
  for (let ty = ty0; ty <= ty1; ty += 2) {
    for (let tx = tx0; tx <= tx1; tx += 2) {
      if (!solidAt(tx, ty)) continue;
      const cx = tx * TILE + 10, cy = ty * TILE + 10;
      const dx = cx - m.x, dy = cy - m.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > bestD) continue;
      const d = Math.sqrt(d2) || 1;
      if ((dx / d) * fx + (dy / d) * fy < 0.3) continue;
      bestD = d2; best = { x: cx, y: cy };
    }
  }
  return best;
}

function updateGrenades(dt) {
  for (let i = grenades.length - 1; i >= 0; i--) {
    const g = grenades[i];
    g.fuse -= dt;
    g.vy += 1500 * dt;
    // x axis
    g.x += g.vx * dt;
    if (solidAtPx(g.x + Math.sign(g.vx) * 5, g.y)) { g.vx *= -0.5; g.vy *= 0.85; g.x -= Math.sign(g.vx) * 3; AudioSys.bounce(); }
    // y axis
    g.y += g.vy * dt;
    if (solidAtPx(g.x, g.y + Math.sign(g.vy) * 5)) { g.vy *= -0.45; g.vx *= 0.75; g.y -= Math.sign(g.vy) * 3; AudioSys.bounce(); }
    if (g.fuse <= 0) { explode(g.x, g.y, 125); grenades.splice(i, 1); }
  }
}

function updateFlameShots(dt) {
  for (let i = flameShots.length - 1; i >= 0; i--) {
    const f = flameShots[i];
    f.ttl -= dt;
    f.vy -= 420 * dt; // fire rises
    f.x += f.vx * dt; f.y += f.vy * dt;
    spawnFlame(f.x, f.y, rand(-20, 20), rand(-30, 10), 0.4);
    let dead = f.ttl <= 0;
    if (!dead) {
      const tx = Math.floor(f.x / TILE), ty = Math.floor(f.y / TILE);
      if (solidAt(tx, ty) && ty < level.rows) {
        igniteTile(tx, ty);
        splashDamage(f.x, f.y, 13, 22);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (Math.random() < 0.35) igniteTile(tx + dx, ty + dy);
        dead = true;
      }
    }
    if (dead) flameShots.splice(i, 1);
  }
}

function updateBeams(dt) {
  for (let i = beams.length - 1; i >= 0; i--) {
    beams[i].ttl -= dt;
    if (beams[i].ttl <= 0) beams.splice(i, 1);
  }
}

// ============================== weapons ==============================
// the destroy function comes in 3 view-wipe sizes:
// S wipes 20% of the tiles visible in the current viewport, M 30%, L 50% (per use)
const WEAPONS = [
  { name: 'S · 20%', cd: 1.6, auto: false, len: 14, frac: 0.20 },
  { name: 'M · 30%', cd: 5.0, auto: false, len: 16, frac: 0.30 },
  { name: 'L · 50%', cd: 12.0, auto: false, len: 18, frac: 0.50 },
];

let shotsFired = 0;
let flameLoop = null, jetLoop = null;

function shoulderPos() { return { x: player.x, y: player.y - player.h * 0.706 }; }
function muzzlePos() {
  const s = shoulderPos();
  const L = (WEAPONS[player.weapon].len + 4) * (player.h / 34);
  return { x: s.x + Math.cos(player.aimA) * L, y: s.y + Math.sin(player.aimA) * L };
}

// page-wipe strikes: queued tiles destroyed in waves over several frames
let strikes = [];

function fireCurrent() {
  const p = player, w = WEAPONS[p.weapon];
  if (p.cd > 0) return;
  const m = muzzlePos();
  const a = p.aimA;
  const tx = mouse.x + camera.x, ty = mouse.y + camera.y;
  if (!destroyFraction(w.frac, tx, ty)) return; // nothing left to break
  shotsFired++;
  p.cd = w.cd;
  p.kick = 6 + w.frac * 46;
  spawnFlash(m.x, m.y, 26 + w.frac * 40);
  spawnSparks(m.x, m.y, 6, Math.cos(a), Math.sin(a), 0.6);
  AudioSys.explode(0.7 + w.frac * 1.7);
  camera.trauma = Math.min(1, camera.trauma + 0.25 + w.frac * 0.6);
}

// blast at the crosshair + queue the nearest frac·(visible solid tiles) for destruction
function destroyFraction(frac, cx, cy) {
  // scope: solid tiles inside the currently visible viewport
  const tx0 = Math.max(0, Math.floor(camera.x / TILE));
  const ty0 = Math.max(0, Math.floor(camera.y / TILE));
  const tx1 = Math.min(level.cols - 1, Math.floor((camera.x + VIEW_W - 1) / TILE));
  const ty1 = Math.min(level.rows - 1, Math.floor((camera.y + VIEW_H - 1) / TILE));
  let visPre = 0;
  for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) if (level.solid[tileIndex(tx, ty)]) visPre++;
  if (!visPre) return false;
  const d0 = level.destroyed;
  explode(cx, cy, 70 + frac * 240, { noFire: true });
  const cand = [];
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      if (level.solid[tileIndex(tx, ty)]) {
        cand.push({ d: dist2(cx, cy, tx * TILE + TILE / 2, ty * TILE + TILE / 2), tx, ty });
      }
    }
  }
  if (!cand.length) return true; // the opening blast cleared the whole view by itself
  cand.sort((a, b) => a.d - b.d);
  // the opening blast counts toward the quota, so a wipe lands on frac of the view exactly
  const quota = Math.min(cand.length, Math.max(1, Math.round(visPre * frac) - (level.destroyed - d0)));
  strikes.push({ tiles: cand.slice(0, quota), i: 0, per: Math.max(30, Math.ceil(quota / 16)) });
  return true;
}

function updateStrikes(dt) {
  for (let i = strikes.length - 1; i >= 0; i--) {
    const s = strikes[i];
    let done = 0;
    while (done < s.per && s.i < s.tiles.length) {
      const t0 = s.tiles[s.i++];
      if (destroyTile(t0.tx, t0.ty, rand(-200, 200), rand(-320, -80))) done++;
    }
    // juice over the freshly wiped area
    for (let j = 0; j < 4 && s.i > 0; j++) {
      const t0 = s.tiles[Math.floor(rand(s.i))];
      spawnExplosionParticles(t0.tx * TILE + TILE / 2, t0.ty * TILE + TILE / 2, rand(36, 80));
    }
    camera.trauma = Math.min(1, camera.trauma + 0.09);
    if (Math.random() < 0.6) AudioSys.explode(0.55);
    if (s.i >= s.tiles.length) { strikes.splice(i, 1); checkWin(); }
  }
}

function throwGrenade() {
  if (state !== 'play') return;
  const p = player;
  if ((p.grenCd || 0) > 0) return;
  p.grenCd = 0.55;
  const s = shoulderPos();
  grenades.push({ x: s.x, y: s.y, vx: Math.cos(p.aimA) * 620 + p.vx * 0.4, vy: Math.sin(p.aimA) * 620 - 60, fuse: 1.5 });
  AudioSys.bounce();
}

function updateFlamethrower(dt) {
  const p = player;
  const firing = mouse.down && p.weapon === 5;
  if (firing) {
    const m = muzzlePos();
    for (let i = 0; i < 4; i++) {
      const ang = p.aimA + rand(-0.2, 0.2);
      const sp = rand(480, 640);
      flameShots.push({ x: m.x, y: m.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ttl: rand(0.34, 0.55) });
    }
    if (Math.random() < 0.4) shotsFired++;
    camera.trauma = Math.min(1, camera.trauma + 0.008);
  }
  if (!flameLoop) flameLoop = AudioSys.makeLoop(700, 0.6);
  if (flameLoop) flameLoop.g.gain.value = lerp(flameLoop.g.gain.value, firing && AudioSys.enabled ? 0.22 : 0, 0.3);
}

// ============================== player ==============================
const PHYS = { speed: 400, accel: 3400, airAccel: 2200, fric: 3000, grav: 2600, jump: 1050, maxFall: 1450, flyThrust: 4000, flyMax: -620 };
const player = {
  x: 0, y: 0, vx: 0, vy: 0, w: 22, h: 80,
  face: 1, aimA: 0, onGround: false, coyote: 0,
  flip: 0, flipTotal: 0.45, flipAng: 0, runPh: 0,
  weapon: 0, cd: 0, grenCd: 0, kick: 0, flying: false, jumpWas: false,
};

function approach(v, target, d) {
  if (v < target) return Math.min(v + d, target);
  if (v > target) return Math.max(v - d, target);
  return v;
}

function boxCollides(x, y) {
  const hw = player.w / 2;
  const tx0 = Math.floor((x - hw) / TILE), tx1 = Math.floor((x + hw - 0.01) / TILE);
  const ty0 = Math.floor((y - player.h) / TILE), ty1 = Math.floor((y - 0.01) / TILE);
  for (let ty = ty0; ty <= ty1; ty++)
    for (let tx = tx0; tx <= tx1; tx++)
      if (solidAt(tx, ty)) return true;
  return false;
}

function updatePlayer(dt) {
  const p = player;
  const left = keys.KeyA || keys.ArrowLeft, right = keys.KeyD || keys.ArrowRight;
  const down = keys.KeyS || keys.ArrowDown;
  const jumpHeld = !!(keys.Space || keys.KeyW || keys.ArrowUp);
  const jumpPressed = jumpHeld && !p.jumpWas;
  p.jumpWas = jumpHeld;

  // aim
  const mx = mouse.x + camera.x, my = mouse.y + camera.y;
  p.aimA = Math.atan2(my - (p.y - p.h + 12), mx - p.x);
  if (Math.abs(mx - p.x) > 4) p.face = mx > p.x ? 1 : -1;

  // horizontal
  const target = (right ? PHYS.speed : 0) - (left ? PHYS.speed : 0);
  if (target !== 0) p.vx = approach(p.vx, target, (p.onGround ? PHYS.accel : PHYS.airAccel) * dt);
  else p.vx = approach(p.vx, 0, (p.onGround ? PHYS.fric : PHYS.fric * 0.15) * dt);

  // jump / flip / fly
  p.coyote = p.onGround ? 0.09 : Math.max(0, p.coyote - dt);
  if (jumpPressed) {
    if (p.onGround || p.coyote > 0) {
      p.vy = -PHYS.jump; p.onGround = false; p.coyote = 0;
      AudioSys.jump(); spawnDust(p.x, p.y, 4);
    } else if (p.flip <= 0) {
      p.flip = p.flipTotal;
      if (p.vy > 0) p.vy = -330;
      AudioSys.flip();
    }
  }
  p.flying = false;
  if (jumpHeld && !p.onGround && p.flip <= 0 && p.vy > PHYS.flyMax) {
    p.vy = Math.max(p.vy - PHYS.flyThrust * dt, PHYS.flyMax);
    p.flying = true;
    spawnFlame(p.x - p.face * 5, p.y - 10, rand(-25, 25), rand(60, 140), 0.28);
    if (Math.random() < 0.4) spawnSparks(p.x - p.face * 5, p.y - 8, 1, 0, 1, 0.5);
  }
  if (!jetLoop) jetLoop = AudioSys.makeLoop(1800, 1.2, 'bandpass');
  if (jetLoop) jetLoop.g.gain.value = lerp(jetLoop.g.gain.value, p.flying && AudioSys.enabled ? 0.07 : 0, 0.25);

  // gravity + slam
  p.vy = Math.min(p.vy + PHYS.grav * dt, PHYS.maxFall);
  const slamming = down && !p.onGround;
  if (slamming) p.vy = Math.min(p.vy + 2800 * dt, PHYS.maxFall * 1.25);

  // X move & collide
  p.x += p.vx * dt;
  if (boxCollides(p.x, p.y)) {
    const hw = p.w / 2;
    if (p.vx > 0) p.x = Math.floor((p.x + hw) / TILE) * TILE - hw - 0.01;
    else if (p.vx < 0) p.x = (Math.floor((p.x - hw) / TILE) + 1) * TILE + hw + 0.01;
    else { // pushed into a tile by explosion knockback etc — eject upward
      p.x -= p.vx * dt;
    }
    p.vx = 0;
  }
  p.x = clamp(p.x, p.w / 2, level.w - p.w / 2);

  // Y move & collide
  const wasAir = !p.onGround, vyBefore = p.vy;
  p.onGround = false;
  p.y += p.vy * dt;
  if (boxCollides(p.x, p.y)) {
    if (p.vy > 0) {
      p.y = Math.floor(p.y / TILE) * TILE - 0.001; // feet on top of the tile row
      p.onGround = true;
    } else if (p.vy < 0) {
      p.y = (Math.floor((p.y - p.h) / TILE) + 1) * TILE + p.h + 0.01;
    }
    p.vy = 0;
  }

  if (p.onGround && wasAir) {
    const hard = vyBefore > 800;
    AudioSys.land(hard);
    spawnDust(p.x, p.y, hard ? 12 : 4);
    if (vyBefore > 950) { // slam landing breaks tiles
      camera.trauma = Math.min(1, camera.trauma + 0.25);
      spawnRing(p.x, p.y, 46);
      const tx0 = Math.floor((p.x - 34) / TILE), tx1 = Math.floor((p.x + 34) / TILE);
      const ty = Math.floor(p.y / TILE);
      for (let tx = tx0; tx <= tx1; tx++) damageTile(tx, ty, 45, (tx * TILE - p.x) * 4, -120);
      checkWin();
    }
  }

  // flip animation
  if (p.flip > 0) {
    p.flip -= dt;
    p.flipAng = (1 - Math.max(p.flip, 0) / p.flipTotal) * TAU;
    if (p.flip <= 0) p.flipAng = 0;
  }
  if (Math.abs(p.vx) > 20 && p.onGround) p.runPh += dt * Math.abs(p.vx) * 0.055;

  p.cd = Math.max(0, p.cd - dt);
  p.grenCd = Math.max(0, p.grenCd - dt);
  p.kick = Math.max(0, p.kick - dt * 30);

  // firing
  if (state === 'play') {
    if (mouse.down && p.cd <= 0 && WEAPONS[p.weapon].auto) fireCurrent();
    else if (mouse.clicked && p.cd <= 0 && !WEAPONS[p.weapon].auto) fireCurrent();
    updateFlamethrower(dt);
    if (mouse.rclicked) { throwGrenade(); mouse.rclicked = false; }
  }
}

// ---------- stickman drawing ----------
const STICK = '#ff7a1a';
const STICK_DARK = 'rgba(30,12,0,0.6)';

// pixel-art pipeline: draw the stickman at low res, blit upscaled with smoothing off
const playerSprite = document.createElement('canvas');
playerSprite.width = 72; playerSprite.height = 72;
const psctx = playerSprite.getContext('2d');
const SPRITE_BLIT = 132;

function drawPlayer() {
  const p = player;
  psctx.setTransform(1, 0, 0, 1, 0, 0);
  psctx.clearRect(0, 0, 72, 72);
  psctx.save();
  psctx.translate(36, 36);
  psctx.scale(0.55, 0.55);
  drawPlayerArt(psctx);
  psctx.restore();

  ctx.save();
  ctx.translate(p.x, p.y - p.h / 2);
  if (p.flipAng) ctx.rotate(p.flipAng * p.face);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(playerSprite, -SPRITE_BLIT / 2, -SPRITE_BLIT / 2, SPRITE_BLIT, SPRITE_BLIT);
  ctx.imageSmoothingEnabled = true;
  ctx.restore();
}

function drawPlayerArt(g) {
  const p = player;
  g.save();
  g.scale(p.h / 34, p.h / 34); // art is tuned for h=34

  const GEAR = '#3f4a35', GEAR_D = '#23232b', PANTS = '#37404d', RED = '#c93a2a',
    ACC = '#ffb020', SILVER = '#c8c8d2';
  const now = performance.now() / 1000;

  const line = (x1, y1, x2, y2, w2 = 3.4) => {
    g.strokeStyle = STICK_DARK; g.lineWidth = w2 + 2.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = STICK; g.lineWidth = w2;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  };
  // colored stroke with dark outline (gear straps etc.)
  const seg = (x1, y1, x2, y2, w, c) => {
    g.strokeStyle = STICK_DARK; g.lineWidth = w + 1.6; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
    g.strokeStyle = c; g.lineWidth = w;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.stroke();
  };
  // outlined filled rect (gear chunks)
  const box = (x, y, w, h, c) => {
    g.fillStyle = STICK_DARK; g.fillRect(x - 0.8, y - 0.8, w + 1.6, h + 1.6);
    g.fillStyle = c; g.fillRect(x, y, w, h);
  };
  const dot = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill(); };

  const lean = clamp(p.vx * 0.012, -3.5, 3.5);
  const hx = lean * 1.4, hy = -17;
  const bk = -p.face; // gear hangs on the back side

  // ---- backpack ----
  box(bk * 7.2 - 3.2, -10, 6.4, 11.5, GEAR_D);           // detail 01 · backpack body
  box(bk * 7.2 - 3.2, -10, 6.4, 2.8, GEAR);              // 02 · flap
  box(bk * 7.2 - 1.6, -4.6, 3.2, 2.4, GEAR);             // 03 · pouch
  seg(bk * 5.2, -9.6, bk * 1.2, -3.4, 1.5, GEAR);        // 04 · shoulder strap
  seg(bk * 8.6, -10.2, bk * 10.4, -16.4, 0.9, GEAR_D);   // 05 · antenna
  dot(bk * 10.4, -16.4, 1.1, (now * 2 % 1) < 0.5 ? '#ff5030' : '#7a2015'); // 06 · antenna light (blinks)

  // ---- legs (feet at +17) ----
  const running = Math.abs(p.vx) > 25 && p.onGround;
  let f1, f2;
  if (running) {
    const s = Math.sin(p.runPh), c = Math.cos(p.runPh);
    f1 = { x: s * 7, y: 17 - Math.max(0, -c) * 4 };
    f2 = { x: -s * 7, y: 17 - Math.max(0, c) * 4 };
  } else if (!p.onGround) {
    f1 = { x: 5, y: 13 }; f2 = { x: -4, y: 17 };
  } else {
    f1 = { x: -4, y: 17 }; f2 = { x: 5, y: 17 };
  }
  line(0, 3, f1.x, f1.y);
  line(0, 3, f2.x, f2.y);
  const at = (f, t) => ({ x: lerp(0, f.x, t), y: lerp(3, f.y, t) });
  const m1 = at(f1, 0.62), m2 = at(f2, 0.62); // knees
  const c1 = at(f1, 0.8), c2 = at(f2, 0.8);   // shins
  seg(c1.x, c1.y, f1.x, f1.y, 4.6, PANTS);                 // 07 · pant leg L
  seg(c2.x, c2.y, f2.x, f2.y, 4.6, PANTS);                 // 08 · pant leg R
  box(m1.x - 1.8, m1.y - 1.6, 3.6, 3.2, GEAR);             // 09 · knee pad L
  box(m2.x - 1.8, m2.y - 1.6, 3.6, 3.2, GEAR);             // 10 · knee pad R
  box(c1.x - 1.7, c1.y - 0.8, 3.4, 1.6, GEAR_D);           // 11 · shin strap L
  box(c2.x - 1.7, c2.y - 0.8, 3.4, 1.6, GEAR_D);           // 12 · shin strap R
  box(f1.x - 2.6, f1.y - 2.6, 6.2, 3.6, GEAR_D);           // 13 · boot L
  box(f2.x - 2.6, f2.y - 2.6, 6.2, 3.6, GEAR_D);           // 14 · boot R
  box(f1.x - 2.6, f1.y + 0.4, 6.8, 1.3, '#101016');        // 15 · boot sole L
  box(f2.x - 2.6, f2.y + 0.4, 6.8, 1.3, '#101016');        // 16 · boot sole R
  box(f1.x + p.face * 3.2 - 1, f1.y - 2.4, 2, 2, GEAR);    // 17 · toe cap L
  box(f2.x + p.face * 3.2 - 1, f2.y - 2.4, 2, 2, GEAR);    // 18 · toe cap R

  // ---- torso ----
  line(0, 3, lean, -10); // body with lean
  const tA = { x: lerp(0, lean, 0.22), y: lerp(3, -10, 0.22) };
  const tB = { x: lerp(0, lean, 0.9), y: lerp(3, -10, 0.9) };
  seg(tA.x, tA.y, tB.x, tB.y, 4.8, GEAR);                  // 19 · combat vest
  seg(tA.x - 1.4, tA.y, tB.x - 1.4, tB.y, 0.9, GEAR_D);    // 20 · vest strap L
  seg(tA.x + 1.4, tA.y, tB.x + 1.4, tB.y, 0.9, GEAR_D);    // 21 · vest strap R
  seg(lean - 1.6, -9.6, 1.8, 2.6, 1.7, '#4a3a28');         // 22 · bandolier
  for (let i = 0; i < 5; i++) {                            // 23-27 · bandolier shells ×5
    const t2 = (i + 1) / 6;
    box(lerp(lean - 1.6, 1.8, t2) - 0.6, lerp(-9.6, 2.6, t2) - 0.9, 1.2, 1.8, ACC);
  }
  box(lean * 0.5 + p.face * 0.6 - 1.1, -4.6, 2.2, 2.1, GEAR_D); // 28 · chest pocket
  dot(lean * 0.5 + p.face * 0.6, -4.9, 0.5, SILVER);       // 29 · pocket button
  seg(lean - 1.2, -9.9, lean + 0.6, -7.6, 0.6, SILVER);    // 30 · dog-tag chain
  box(lean + 0.1, -7.9, 1.7, 2.5, SILVER);                 // 31 · dog tag
  box(-3.6, 1.1, 7.2, 2.3, GEAR_D);                        // 32 · belt
  box(-1.2, 1.3, 2.4, 1.9, ACC);                           // 33 · belt buckle
  box(bk * 3.4 - 1.3, 0.6, 2.6, 3.1, GEAR);                // 34 · belt pouch
  dot(p.face * 4.6, 1.9, 1.8, '#2c3a2c');                  // 35 · frag grenade
  box(p.face * 4.6 - 0.7, -0.9, 1.4, 1.1, SILVER);         // 36 · grenade pin

  // ---- neck & head ----
  seg(lean, -10, hx * 0.8, hy + 5.6, 2.2, STICK);          // 37 · neck
  g.fillStyle = STICK_DARK;
  g.beginPath(); g.arc(hx, hy, 7.6, 0, TAU); g.fill();
  g.fillStyle = STICK;
  g.beginPath(); g.arc(hx, hy, 6.2, 0, TAU); g.fill();
  dot(hx - 2, hy - 2.4, 1.3, 'rgba(255,255,255,0.45)');    // 38 · head highlight
  box(hx - 6.2, hy - 4.8, 12.4, 2.7, RED);                 // 39 · bandana band
  box(hx - 6.2, hy - 2.5, 12.4, 0.8, '#8e2318');           // 40 · bandana shade
  const kx = hx - p.face * 6.6, ky = hy - 3.6, wv = Math.sin(now * 6 + p.runPh) * 1.5;
  dot(kx, ky, 1.8, RED);                                   // 41 · bandana knot
  seg(kx, ky, kx - p.face * 4.6, ky + 1.6 + wv * 0.4, 1.4, RED); // 42 · bandana tail 1
  seg(kx - p.face * 4.6, ky + 1.6 + wv * 0.4, kx - p.face * 8.2, ky + 2.6 + wv, 1.2, RED); // 43 · tail 1 tip
  seg(kx, ky + 1, kx - p.face * 3.8, ky + 3.6 - wv * 0.4, 1.2, '#8e2318'); // 44 · bandana tail 2
  dot(hx - p.face * 5.4, hy + 0.8, 1.3, STICK);            // 45 · ear
  seg(hx - p.face * 3.6, hy + 0.4, hx - p.face * 2.4, hy + 1.8, 0.7, '#a3521a'); // 46 · scar
  const e1x = hx + p.face * 1.2, e2x = hx + p.face * 4, pa = { x: Math.cos(p.aimA) * 0.85, y: Math.sin(p.aimA) * 0.85 };
  dot(e1x, hy - 0.7, 1.75, '#fff');                        // 47 · eye L white
  dot(e2x, hy - 0.7, 1.75, '#fff');                        // 48 · eye R white
  dot(e1x + pa.x, hy - 0.7 + pa.y, 0.8, '#1a0d00');        // 49 · pupil L (tracks aim)
  dot(e2x + pa.x, hy - 0.7 + pa.y, 0.8, '#1a0d00');        // 50 · pupil R
  seg(e1x - 1.3, hy - 3.5, e1x + 1.4, hy - 2.7, 0.9, '#1a0d00'); // 51 · angry brow L
  seg(e2x - 1.4, hy - 2.7, e2x + 1.3, hy - 3.5, 0.9, '#1a0d00'); // 52 · angry brow R
  box(hx + p.face * 0.7 - 1.3, hy + 2.3, 3.2, 1.6, '#5a1508'); // 53 · grin
  box(hx + p.face * 0.7 - 1.3, hy + 2.3, 3.2, 0.7, '#fff');    // 54 · teeth
  if (p.flying) dot(hx - p.face * 7.8, hy - 3 + (now * 9 % 4), 1, '#7ac8ff'); // 55 · sweat drop (flying)

  // jetpack
  if (p.flying) {
    g.fillStyle = '#33333c';
    g.fillRect(-p.face * 11 - 2, -12, 6, 12);
  }

  // ---- arms + weapon (absolute aim) ----
  dot(-p.face * 1.6, -8, 2.5, GEAR);                       // 56 · shoulder pad (back)
  g.save();
  g.translate(0, -7);
  g.rotate(p.aimA);
  if (Math.cos(p.aimA) < 0) g.scale(1, -1);
  box(2.4, -2.2, 1.6, 2.4, '#7a4a20');                     // 57 · arm tattoo band
  // two arms onto the payload
  line(0, 0, 9, 3, 2.8);
  line(0, 0, 14, -1, 2.8);
  box(5.2, -2.4, 2.6, 2.2, GEAR);                          // 58 · elbow pad
  box(6.2, 1.4, 1.6, 2.2, GEAR_D);                         // 59 · wristband
  drawWeaponShape(p.weapon, g);
  seg(10.4, 0.2, 11.6, 2, 0.9, STICK);                     // 60 · trigger finger
  dot(9, 3, 2.1, GEAR_D);                                  // 61 · glove (front hand)
  dot(14, -1, 2.1, GEAR_D);                                // 62 · glove (back hand)
  g.restore();
  dot(p.face * 1.8, -8.2, 2.7, GEAR);                      // 63 · shoulder pad (front)
  box(p.face * 1.8 - 1.2, -10.4, 2.4, 1.2, ACC);           // 64 · pad marker

  g.restore();
}

function drawWeaponShape(w, g, bright = false) {
  const dark = bright ? '#4e4e60' : '#23232b', mid = bright ? '#7a7a90' : '#3a3a46',
    accent = '#ffb020', olive = bright ? '#5d6e48' : '#4a5d3a', red = '#c93a2a';
  switch (w) {
    case 0: // S · hand bomb — wipes 20%
      g.fillStyle = dark; g.beginPath(); g.arc(8, 0.5, 4, 0, TAU); g.fill();
      g.fillStyle = mid; g.fillRect(6.2, -4.8, 3.6, 2);
      g.strokeStyle = '#7a4a20'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(8, -4.8); g.quadraticCurveTo(9.5, -7.5, 11, -7); g.stroke();
      g.fillStyle = accent; g.beginPath(); g.arc(11.2, -7, 1.2, 0, TAU); g.fill();
      break;
    case 1: // M · dynamite bundle — wipes 30%
      g.fillStyle = red; g.fillRect(3, -3.8, 13, 8.2);
      g.fillStyle = '#a02a1d'; g.fillRect(3, -1.4, 13, 1); g.fillRect(3, 1.8, 13, 1);
      g.fillStyle = dark; g.fillRect(6.5, -3.8, 1.6, 8.2); g.fillRect(11.5, -3.8, 1.6, 8.2);
      g.strokeStyle = '#7a4a20'; g.lineWidth = 1.2; g.lineCap = 'round';
      g.beginPath(); g.moveTo(9, -3.8); g.quadraticCurveTo(10.5, -6.8, 12.5, -6.4); g.stroke();
      g.fillStyle = accent; g.beginPath(); g.arc(12.7, -6.4, 1.2, 0, TAU); g.fill();
      break;
    case 2: // L · mini nuke — wipes 50%
      g.fillStyle = olive; g.fillRect(0, -4.5, 17, 9);
      g.beginPath(); g.arc(17.5, 0, 4.4, 0, TAU); g.fill();
      g.fillStyle = dark;
      g.fillRect(-2.5, -6.2, 4.5, 2.6); g.fillRect(-2.5, 3.6, 4.5, 2.6); g.fillRect(-3.5, -2, 2.5, 4);
      g.fillStyle = accent; g.beginPath(); g.arc(8.5, 0, 2.4, 0, TAU); g.fill();
      g.fillStyle = dark; g.beginPath(); g.arc(8.5, 0, 1.1, 0, TAU); g.fill();
      break;
  }
}

// ============================== camera ==============================
const camera = { x: 0, y: 0, trauma: 0 };
let shakeX = 0, shakeY = 0;

function updateCamera(dt) {
  const tx = clamp(player.x - VIEW_W / 2, 0, Math.max(0, level.w - VIEW_W));
  const ty = clamp(player.y - VIEW_H * 0.55, 0, Math.max(0, level.h - VIEW_H));
  camera.x = level.w < VIEW_W ? (level.w - VIEW_W) / 2 : lerp(camera.x, tx, Math.min(1, 7 * dt));
  camera.y = level.h < VIEW_H ? (level.h - VIEW_H) / 2 : lerp(camera.y, ty, Math.min(1, 7 * dt));
  camera.trauma = Math.max(0, camera.trauma - 1.7 * dt);
  const sh = camera.trauma * camera.trauma * 22;
  shakeX = rand(-sh, sh);
  shakeY = rand(-sh, sh);
}

// ============================== render ==============================
const settings = { sound: true, dark: true };

function drawBackground() {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  if (settings.dark) { g.addColorStop(0, '#241d4e'); g.addColorStop(1, '#12102a'); }
  else { g.addColorStop(0, '#ececf2'); g.addColorStop(1, '#d4d4de'); }
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // parallax grid
  const sp = 64, par = 0.35;
  const ox = ((-camera.x * par) % sp + sp) % sp;
  const oy = ((-camera.y * par) % sp + sp) % sp;
  ctx.strokeStyle = settings.dark ? 'rgba(255,255,255,0.045)' : 'rgba(0,0,0,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = ox; x < VIEW_W; x += sp) { ctx.moveTo(x, 0); ctx.lineTo(x, VIEW_H); }
  for (let y = oy; y < VIEW_H; y += sp) { ctx.moveTo(0, y); ctx.lineTo(VIEW_W, y); }
  ctx.stroke();
}

function render() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  drawBackground();
  if (!level.srcCanvas) return;

  const sx = camera.x + shakeX, sy = camera.y + shakeY;
  ctx.save();
  ctx.translate(-sx, -sy);

  // level
  ctx.drawImage(level.viewCanvas, 0, 0);
  // charred halos over the page edges
  if (level.scorchCanvas) ctx.drawImage(level.scorchCanvas, 0, 0);

  // burning tiles glow
  if (level.burning.size) {
    ctx.fillStyle = `rgba(255,${110 + Math.sin(performance.now() / 60) * 40 | 0},20,0.28)`;
    for (const idx of level.burning.keys()) {
      const tx = idx % level.cols, ty = (idx / level.cols) | 0;
      ctx.fillRect(tx * TILE, ty * TILE, TILE, TILE);
    }
  }

  // railgun beams
  for (const b of beams) {
    const a = b.ttl / b.max;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(120,220,255,${a})`;
    ctx.lineWidth = 5 * a + 1;
    ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    ctx.restore();
  }

  // bullets (tracers)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineCap = 'round';
  for (const b of bullets) {
    ctx.strokeStyle = 'rgba(255,225,140,0.9)';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.014, b.y - b.vy * 0.014);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  ctx.restore();

  // rockets / missiles / grenades
  for (const r of rockets) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(Math.atan2(r.vy, r.vx));
    ctx.fillStyle = '#4a5d3a'; ctx.fillRect(-8, -3.5, 16, 7);
    ctx.fillStyle = '#c93a2a'; ctx.fillRect(6, -3.5, 4, 7);
    ctx.restore();
  }
  for (const m of missiles) {
    ctx.save();
    ctx.translate(m.x, m.y); ctx.rotate(m.angle);
    ctx.fillStyle = '#d8d8e0'; ctx.fillRect(-6, -2, 12, 4);
    ctx.fillStyle = '#ffb020'; ctx.fillRect(4, -2, 3, 4);
    ctx.restore();
  }
  for (const g of grenades) {
    ctx.fillStyle = '#2c3a2c';
    ctx.beginPath(); ctx.arc(g.x, g.y, 5, 0, TAU); ctx.fill();
    ctx.fillStyle = g.fuse % 0.3 < 0.15 ? '#ff5030' : '#777';
    ctx.fillRect(g.x - 1.5, g.y - 8, 3, 3);
  }

  // particles
  for (const p of particles) {
    const a = clamp(p.ttl / p.max, 0, 1);
    switch (p.kind) {
      case 'debris':
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 2);
        ctx.drawImage(level.srcCanvas, p.sx, p.sy, p.s, p.s, -p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
        break;
      case 'casing':
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.min(1, a * 3);
        ctx.fillStyle = '#d8a520';
        ctx.fillRect(-2.5, -1, 5, 2);
        ctx.restore();
        break;
      case 'spark':
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,${180 + a * 60 | 0},60,${a})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02); ctx.stroke();
        ctx.restore();
        break;
      case 'smoke':
        ctx.fillStyle = `rgba(125,125,135,${a * 0.4})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill();
        break;
      case 'flame': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const t = 1 - a; // age
        const cr = 255, cg = Math.round(lerp(220, 60, t)), cb = Math.round(lerp(120, 10, t));
        ctx.fillStyle = `rgba(${cr},${cg},${cb},${a * 0.8})`;
        const fs = p.r * (0.6 + a * 0.9);
        ctx.fillRect(p.x - fs / 2, p.y - fs / 2, fs, fs); // square = pixel feel
        ctx.restore();
        break;
      }
      case 'fireblob': {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.min(1, a * 1.6);
        ctx.fillStyle = p.col;
        const bs = p.s * (0.7 + (1 - a) * 0.6);
        ctx.fillRect(p.x - bs / 2, p.y - bs / 2, bs, bs);
        ctx.globalAlpha = Math.min(1, a * 1.2);
        ctx.fillStyle = '#fff2b0';
        ctx.fillRect(p.x - bs / 4, p.y - bs / 4, bs / 2, bs / 2);
        ctx.restore();
        break;
      }
      case 'flash':
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255,240,200,${a * 0.9})`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1.6 - a * 0.6), 0, TAU); ctx.fill();
        ctx.restore();
        break;
      case 'ring':
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = `rgba(255,200,120,${a * 0.8})`;
        ctx.lineWidth = 3 * a + 1;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 - a * a), 0, TAU); ctx.stroke();
        ctx.restore();
        break;
    }
  }

  drawPlayer();

  ctx.restore();

  // crosshair
  if (state === 'play') {
    const r = 9 + player.kick;
    ctx.strokeStyle = '#ff7a1a';
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, r, 0, TAU); ctx.stroke();
    ctx.beginPath();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      ctx.moveTo(mouse.x + dx * (r + 2), mouse.y + dy * (r + 2));
      ctx.lineTo(mouse.x + dx * (r + 7), mouse.y + dy * (r + 7));
    }
    ctx.stroke();
    ctx.fillStyle = '#ff7a1a';
    ctx.beginPath(); ctx.arc(mouse.x, mouse.y, 1.6, 0, TAU); ctx.fill();
  }
}

// ============================== game state ==============================
let state = 'menu'; // menu | loading | play | pause | win
let startTime = 0;
let winPending = false, winTimer = 0;
let hudTick = 0;

function checkWin() {
  if (state !== 'play' || winPending || level.totalSolid === 0) return;
  if (level.destroyed / level.totalSolid >= 0.95) {
    winPending = true;
    winTimer = 1.0;
  }
}

function showWin() {
  state = 'win';
  winPending = false;
  const secs = Math.round((performance.now() - startTime) / 1000);
  ui.stTime.textContent = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
  ui.stTiles.textContent = level.destroyed.toLocaleString();
  ui.stShots.textContent = shotsFired.toLocaleString();
  ui.winHost.textContent = level.host;
  ui.win.classList.remove('hidden');
  AudioSys.win();
  if (flameLoop) flameLoop.g.gain.value = 0;
  if (jetLoop) jetLoop.g.gain.value = 0;
}

function spawnPlayer() {
  player.x = level.w / 2;
  player.y = 50;
  let guard = 0;
  while (boxCollides(player.x, player.y) && guard++ < 200) player.y += 30;
  player.vx = 0; player.vy = 0; player.onGround = false;
  player.flip = 0; player.flipAng = 0;
  camera.x = clamp(player.x - VIEW_W / 2, 0, Math.max(0, level.w - VIEW_W));
  camera.y = 0;
  camera.trauma = 0;
}

function resetRun() {
  particles = []; bullets = []; rockets = []; missiles = []; grenades = []; flameShots = []; beams = [];
  strikes = [];
  shotsFired = 0;
  winPending = false;
  startTime = performance.now();
}

async function startGame(url) {
  url = (url || '').trim();
  if (!url) url = 'demo';
  if (url !== 'demo' && !/^https?:\/\//i.test(url)) url = 'https://' + url;
  state = 'loading';
  ui.menu.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.loading.classList.remove('hidden');
  ui.loadUrl.textContent = url === 'demo' ? 'offline demo' : url;
  try {
    await loadLevel(url, s => { ui.loadStatus.textContent = s; });
  } catch (e) {
    console.error(e);
    ui.loadStatus.textContent = 'Something broke (not in the fun way). Try another site.';
    await new Promise(r => setTimeout(r, 1200));
    backToMenu();
    return;
  }
  if (level.totalSolid === 0) {
    ui.loadStatus.textContent = 'That page rendered blank. Try another site.';
    await new Promise(r => setTimeout(r, 1200));
    backToMenu();
    return;
  }
  resetRun();
  spawnPlayer();
  buildWeaponSlots();
  ui.loading.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  ui.siteInfo.querySelector('.host').textContent = level.host;
  ui.pauseHost.textContent = level.host;
  state = 'play';
  canvas.style.cursor = 'none';
}

function restartLevel() {
  sliceLevel(level.srcCanvas, level.url);
  resetRun();
  spawnPlayer();
  ui.pause.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.hud.classList.remove('hidden');
  state = 'play';
}

function backToMenu() {
  state = 'menu';
  ui.loading.classList.add('hidden');
  ui.pause.classList.add('hidden');
  ui.win.classList.add('hidden');
  ui.hud.classList.add('hidden');
  ui.menu.classList.remove('hidden');
  canvas.style.cursor = 'default';
  if (flameLoop) flameLoop.g.gain.value = 0;
  if (jetLoop) jetLoop.g.gain.value = 0;
  // fresh scene for the attract mode behind the dialog
  if (level.srcCanvas) {
    sliceLevel(level.srcCanvas, level.url);
    resetRun();
    spawnPlayer();
    menuAmbientT = 0.8;
  }
}

function togglePause(force) {
  if (state === 'play' || force === true) {
    if (state !== 'play') return;
    state = 'pause';
    ui.pause.classList.remove('hidden');
    if (flameLoop) flameLoop.g.gain.value = 0;
    if (jetLoop) jetLoop.g.gain.value = 0;
  } else if (state === 'pause') {
    state = 'play';
    ui.pause.classList.add('hidden');
  }
}

// ---------- HUD ----------
function buildWeaponSlots() {
  ui.weapons.style.pointerEvents = 'auto';
  ui.weapons.innerHTML = '';
  WEAPONS.forEach((w, i) => {
    const d = document.createElement('div');
    d.className = 'slot' + (i === player.weapon ? ' active' : '');
    // pixel icon: draw the gun shape tiny, upscale with smoothing off
    const icon = document.createElement('canvas');
    icon.width = 44; icon.height = 30;
    const tiny = document.createElement('canvas');
    tiny.width = 22; tiny.height = 15;
    const tg = tiny.getContext('2d');
    tg.translate(4.5, 7); tg.scale(0.62, 0.62);
    drawWeaponShape(i, tg, true);
    const ig = icon.getContext('2d');
    ig.imageSmoothingEnabled = false;
    ig.drawImage(tiny, 0, 0, 44, 30);
    const key = document.createElement('span');
    key.className = 'key'; key.textContent = i + 1;
    const nm = document.createElement('span');
    nm.className = 'nm'; nm.textContent = w.name;
    d.appendChild(key); d.appendChild(icon); d.appendChild(nm);
    d.addEventListener('click', () => switchWeapon(i));
    ui.weapons.appendChild(d);
  });
}

let wpnTipTimer = 0;
function switchWeapon(i) {
  if (i === player.weapon) return;
  player.weapon = i;
  player.cd = Math.max(player.cd, 0.12);
  player.kick = 4;
  AudioSys.tone('square', 500 + i * 60, 300, 0.05, 0.12);
  const slots = ui.weapons.children;
  for (let s = 0; s < slots.length; s++) slots[s].classList.toggle('active', s === i);
  const tip = $('wpnTip');
  tip.textContent = WEAPONS[i].name;
  tip.classList.add('show');
  clearTimeout(wpnTipTimer);
  wpnTipTimer = setTimeout(() => tip.classList.remove('show'), 900);
}

function updateHUD() {
  if (++hudTick % 5) return;
  checkWin();
  const pct = level.totalSolid ? (level.destroyed / level.totalSolid) * 100 : 0;
  const shown = winPending ? 100 : Math.min(99, Math.floor(pct));
  ui.siteInfo.querySelector('.pct').textContent = shown + '%';
  ui.siteInfo.querySelector('.pbar i').style.width = Math.min(100, pct) + '%';
  // dim the selected slot while its payload reloads
  const slots = ui.weapons.children;
  for (let s = 0; s < slots.length; s++) {
    slots[s].style.opacity = (s === player.weapon && player.cd > 0) ? '0.45' : '1';
  }
}

// ---------- menu attract mode: the demo site gets destroyed live behind the dialog ----------
let menuAmbientT = 1.2;
function menuAmbient(dt) {
  menuAmbientT -= dt;
  if (menuAmbientT > 0) return;
  menuAmbientT = rand(0.45, 0.95);
  for (let tries = 0; tries < 24; tries++) {
    const x = camera.x + rand(60, VIEW_W - 60);
    const y = camera.y + rand(60, VIEW_H - 60);
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    if (solidAt(tx, ty)) {
      explode(tx * TILE + TILE / 2, ty * TILE + TILE / 2, rand(60, 120), { silent: true });
      break;
    }
  }
}

async function bootMenuScene() {
  try {
    await loadLevel('demo', () => {});
    if (state !== 'menu') return;
    spawnPlayer();
    camera.x = clamp(player.x - VIEW_W / 2, 0, Math.max(0, level.w - VIEW_W));
    camera.y = 0;
  } catch (e) { /* menu stays plain */ }
}

// ============================== main loop ==============================
let last = performance.now();

function frame(t) {
  requestAnimationFrame(frame);
  let dt = (t - last) / 1000;
  last = t;
  if (dt <= 0 || dt > 0.05) dt = 0.016;

  if (state === 'play') {
    // wheel weapon switch
    if (wheelDelta !== 0) {
      switchWeapon((player.weapon + (wheelDelta > 0 ? 1 : -1) + WEAPONS.length) % WEAPONS.length);
      wheelDelta = 0;
    }
    updatePlayer(dt);
    updateBullets(dt);
    updateRockets(dt);
    updateMissiles(dt);
    updateGrenades(dt);
    updateFlameShots(dt);
    updateBeams(dt);
    updateParticles(dt);
    updateBurning(dt);
    updateStrikes(dt);
    updateCamera(dt);
    updateHUD();
    if (winPending) {
      winTimer -= dt;
      if (winTimer <= 0) showWin();
    }
  } else if (state === 'menu' && level.srcCanvas) {
    menuAmbient(dt);
    updatePlayer(dt); // stickman idles & aims at the cursor
    updateFlameShots(dt);
    updateBeams(dt);
    updateParticles(dt);
    updateBurning(dt);
    updateCamera(dt);
  }
  mouse.clicked = false;
  render();
}

// ============================== UI wiring ==============================
ui.btnPlay.addEventListener('click', () => { AudioSys.init(); AudioSys.resume(); startGame(ui.urlInput.value); });
ui.urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') { AudioSys.init(); AudioSys.resume(); startGame(ui.urlInput.value); } });
document.querySelectorAll('.chip').forEach(ch => ch.addEventListener('click', () => { AudioSys.init(); AudioSys.resume(); startGame(ch.dataset.url); }));

$('btnResume').addEventListener('click', togglePause);
$('btnRestart').addEventListener('click', restartLevel);
$('btnNew').addEventListener('click', backToMenu);
$('btnAgain').addEventListener('click', backToMenu);
$('btnReplay').addEventListener('click', restartLevel);
$('btnPause').addEventListener('click', () => togglePause());

function syncSound() {
  AudioSys.enabled = settings.sound;
  $('btnSound').classList.toggle('off', !settings.sound);
  $('btnSound').textContent = settings.sound ? '🔊' : '🔇';
  $('tgSound').classList.toggle('on', settings.sound);
  if (!settings.sound) {
    if (flameLoop) flameLoop.g.gain.value = 0;
    if (jetLoop) jetLoop.g.gain.value = 0;
  }
}
function syncBg() {
  $('btnBg').classList.toggle('off', !settings.dark);
  $('tgBg').classList.toggle('on', settings.dark);
}
$('btnSound').addEventListener('click', () => { settings.sound = !settings.sound; syncSound(); });
$('tgSound').addEventListener('click', () => { settings.sound = !settings.sound; syncSound(); });
$('btnBg').addEventListener('click', () => { settings.dark = !settings.dark; syncBg(); });
$('tgBg').addEventListener('click', () => { settings.dark = !settings.dark; syncBg(); });
syncSound(); syncBg();

requestAnimationFrame(frame);
bootMenuScene();
