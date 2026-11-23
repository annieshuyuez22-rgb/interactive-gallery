import * as THREE from 'three';

/* ------------------------------------------------------------ utilities */
const params = new URLSearchParams(location.search);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const damp = (dt, rate) => 1 - Math.exp(-dt * rate);
let seed = 0x2f6e2b1;
function random() {
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
const rand = (a, b) => a + random() * (b - a);
const choose = arr => arr[Math.floor(random() * arr.length)];
const fmt = n => Math.max(0, Math.floor(n)).toLocaleString('en-US');

const ui = Object.fromEntries([
  'titleScreen', 'titleBest', 'scoreCard', 'score', 'combo', 'distance', 'airFill',
  'pauseBtn', 'muteBtn', 'soundOn', 'soundOff', 'boltCounter', 'bolts', 'toast',
  'gameoverScreen', 'finalScore', 'bestLabel', 'finalDistance', 'finalBolts',
  'finalCombo', 'retryBtn', 'flash'
].map(id => [id, document.getElementById(id)]));

/* ------------------------------------------------------------- renderer */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.14;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd68e83);
scene.fog = new THREE.Fog(0xc58179, 72, 285);
const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.1, 520);
camera.position.set(0, 2.2, 6.5);

const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
function canvasTexture(w, h, draw, repeat) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  draw(canvas.getContext('2d'), w, h);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAniso;
  if (repeat) {
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
  }
  return texture;
}
function rounded(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.lineTo(x + w - r, y); g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r); g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h); g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r); g.quadraticCurveTo(x, y, x + r, y); g.closePath();
}

/* -------------------------------------------------------- sky and light */
const skyTexture = canvasTexture(64, 1024, (g, w, h) => {
  const gradient = g.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#b86575');
  gradient.addColorStop(.28, '#e89288');
  gradient.addColorStop(.58, '#f7b093');
  gradient.addColorStop(.82, '#ffd0a0');
  gradient.addColorStop(1, '#f5ae7f');
  g.fillStyle = gradient; g.fillRect(0, 0, w, h);
});
const sky = new THREE.Mesh(
  new THREE.PlaneGeometry(650, 330),
  new THREE.MeshBasicMaterial({ map: skyTexture, fog: false, depthWrite: false })
);
sky.position.set(0, 80, -330);
scene.add(sky);

const glowTexture = canvasTexture(256, 256, (g, w, h) => {
  const gradient = g.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
  gradient.addColorStop(0, 'rgba(255,255,238,1)');
  gradient.addColorStop(.18, 'rgba(255,238,178,.95)');
  gradient.addColorStop(.42, 'rgba(255,183,112,.4)');
  gradient.addColorStop(1, 'rgba(255,139,89,0)');
  g.fillStyle = gradient; g.fillRect(0, 0, w, h);
});
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({
  map: glowTexture, transparent: true, depthWrite: false, fog: false, toneMapped: false
}));
sunSprite.position.set(66, 51, -285);
sunSprite.scale.set(52, 52, 1);
scene.add(sunSprite);

const cloudTexture = canvasTexture(512, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  const blobs = [[90,150,90],[175,120,110],[280,145,130],[390,155,90],[245,85,70]];
  for (const [x, y, r] of blobs) {
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'rgba(255,211,181,.5)');
    grad.addColorStop(.55, 'rgba(245,166,157,.25)');
    grad.addColorStop(1, 'rgba(229,137,143,0)');
    g.fillStyle = grad; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
});
for (let i = 0; i < 7; i++) {
  const cloud = new THREE.Sprite(new THREE.SpriteMaterial({
    map: cloudTexture, transparent: true, opacity: rand(.35, .65), depthWrite: false, fog: false
  }));
  cloud.position.set(-180 + i * 61 + rand(-20, 20), rand(43, 88), -295 + rand(-8, 8));
  cloud.scale.set(rand(55, 92), rand(20, 32), 1);
  scene.add(cloud);
}

scene.add(new THREE.HemisphereLight(0xffd5b0, 0x493044, 1.7));
scene.add(new THREE.AmbientLight(0x9b6373, .32));
const sunLight = new THREE.DirectionalLight(0xffaa78, 2.7);
sunLight.position.set(-38, 62, 34);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -42; sunLight.shadow.camera.right = 42;
sunLight.shadow.camera.top = 48; sunLight.shadow.camera.bottom = -35;
sunLight.shadow.camera.near = 1; sunLight.shadow.camera.far = 155;
sunLight.shadow.bias = -.00035;
sunLight.shadow.normalBias = .025;
sunLight.target.position.set(0, 0, -18);
scene.add(sunLight, sunLight.target);
const rimLight = new THREE.DirectionalLight(0xd7819a, .65);
rimLight.position.set(35, 25, -45);
scene.add(rimLight);

/* ------------------------------------------------------- shared meshes */
const unitBox = new THREE.BoxGeometry(1, 1, 1);
function box(w, h, d, material, shadow = true) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.castShadow = shadow; mesh.receiveShadow = shadow;
  return mesh;
}
function loftGeometry(w, l, y0, frontY, rearY, frontTopZ, rearTopZ, topW) {
  const fw = w / 2, rw = w / 2, tw = (topW || w * .92) / 2;
  const vertices = new Float32Array([
    -fw,y0,-l/2,  fw,y0,-l/2,  rw,y0,l/2,  -rw,y0,l/2,
    -tw,frontY,frontTopZ,  tw,frontY,frontTopZ,
     tw,rearY,rearTopZ, -tw,rearY,rearTopZ
  ]);
  const indices = [
    0,1,2, 0,2,3,
    0,4,5, 0,5,1,
    3,2,6, 3,6,7,
    0,3,7, 0,7,4,
    1,5,6, 1,6,2,
    4,7,6, 4,6,5
  ];
  let geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry = geometry.toNonIndexed();
  geometry.computeVertexNormals();
  return geometry;
}
function cylinder(rt, rb, h, segments, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
  mesh.castShadow = true; mesh.receiveShadow = true;
  return mesh;
}

/* ------------------------------------------------------------ textures */
const asphaltTexture = canvasTexture(512, 512, (g, w, h) => {
  g.fillStyle = '#4a3945'; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7200; i++) {
    const light = random() > .53;
    g.fillStyle = light ? `rgba(225,173,172,${rand(.015,.075)})` : `rgba(17,13,25,${rand(.025,.11)})`;
    const s = rand(.4, 2.4); g.fillRect(random() * w, random() * h, s, s);
  }
  for (let i = 0; i < 24; i++) {
    const x = random() * w, y = random() * h, r = rand(18, 80);
    const grad = g.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(27,18,31,${rand(.03,.12)})`); grad.addColorStop(1, 'rgba(27,18,31,0)');
    g.fillStyle = grad; g.fillRect(x-r, y-r, r*2, r*2);
  }
}, [2.2, 5.5]);

const roadMat = new THREE.MeshStandardMaterial({
  map: asphaltTexture, color: 0xd6c3cd, roughness: .48, metalness: .1
});
const lineMat = new THREE.MeshStandardMaterial({ color: 0xf1e8df, roughness: .58, emissive: 0x31282a, emissiveIntensity: .18 });
const yellowLineMat = new THREE.MeshStandardMaterial({ color: 0xf5c64f, roughness: .6, emissive: 0x5a3610, emissiveIntensity: .25 });
const leftWallMat = new THREE.MeshStandardMaterial({ color: 0xb77359, roughness: .9 });
const rightWallMat = new THREE.MeshStandardMaterial({ color: 0x784452, roughness: .9 });
const wallCapMat = new THREE.MeshStandardMaterial({ color: 0x9d6255, roughness: .82 });
const groundMat = new THREE.MeshStandardMaterial({ color: 0x69603d, roughness: 1 });
const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x28252c, roughness: .62, metalness: .4 });
const poleMat = new THREE.MeshStandardMaterial({ color: 0x49343a, roughness: .72, metalness: .32 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x493029, roughness: .95, flatShading: true });
const palmMats = [
  new THREE.MeshStandardMaterial({ color: 0x174d2c, roughness: .92, flatShading: true, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x276b36, roughness: .9, flatShading: true, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x3d793c, roughness: .9, flatShading: true, side: THREE.DoubleSide })
];
const shrubMats = [0x28512d,0x3e672e,0x664638,0x8e4358,0xa34f68].map(color =>
  new THREE.MeshStandardMaterial({ color, roughness: .96, flatShading: true })
);
const shrubGeometry = new THREE.IcosahedronGeometry(1, 1);

function makeBuildingTexture(base, window, lit) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    const cols = 5, rows = 7, cw = w / cols, rh = h / rows;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      g.fillStyle = random() < .14 ? lit : window;
      g.fillRect(x * cw + cw * .25, y * rh + rh * .22, cw * .48, rh * .55);
      g.fillStyle = 'rgba(255,255,255,.055)';
      g.fillRect(x * cw + cw * .25, y * rh + rh * .22, cw * .48, 2);
    }
    g.fillStyle = 'rgba(45,20,31,.16)';
    for (let y = 1; y < rows; y++) g.fillRect(0, y * rh - 2, w, 3);
  });
}
const buildingPalettes = [
  ['#9c635b','#543942','#d99a79'], ['#b87966','#61404a','#e5ae87'],
  ['#80515b','#432f3d','#c98374'], ['#c28b72','#6e4b52','#edbd91'],
  ['#8d6670','#4f3a48','#d89483'], ['#aa7569','#553d47','#e3a184']
];
const buildingMats = buildingPalettes.map(p => new THREE.MeshStandardMaterial({
  map: makeBuildingTexture(...p), roughness: .94, metalness: 0
}));
const roofMat = new THREE.MeshStandardMaterial({ color: 0x76505a, roughness: .96 });

/* ------------------------------------------------------------ palm trees */
const frondGeometry = new THREE.BufferGeometry();
frondGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  0,0,0,  .38,.22,.16,  .72,.05,.11,
  0,0,0,  .72,.05,.11,  1,-.48,0,
  0,0,0,  1,-.48,0,  .72,.05,-.11,
  0,0,0,  .72,.05,-.11,  .38,.22,-.16,
  .38,.22,.16, .38,.22,-.16, .72,.05,-.11,
  .38,.22,.16, .72,.05,-.11, .72,.05,.11
], 3));
frondGeometry.computeVertexNormals();

function makePalm(height = 9) {
  const palm = new THREE.Group();
  const trunk = cylinder(.16, .34, height, 6, trunkMat);
  trunk.position.y = height / 2;
  trunk.rotation.z = rand(-.045, .045);
  palm.add(trunk);
  const crown = new THREE.Group();
  crown.position.set(trunk.rotation.z * -height * .45, height, 0);
  const count = 7 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const frond = new THREE.Mesh(frondGeometry, palmMats[i % palmMats.length]);
    frond.rotation.y = i / count * Math.PI * 2 + rand(-.18, .18);
    frond.rotation.z = rand(-.08, .16);
    const size = rand(3.2, 4.7);
    frond.scale.set(size, size, size);
    crown.add(frond);
  }
  for (let i = 0; i < 3; i++) {
    const nut = new THREE.Mesh(shrubGeometry, trunkMat);
    nut.scale.setScalar(.22); nut.position.set(rand(-.3,.3), height + rand(-.25,.15), rand(-.3,.3));
    palm.add(nut);
  }
  palm.add(crown);
  palm.rotation.y = rand(0, Math.PI * 2);
  return palm;
}

/* -------------------------------------------------------------- signs */
function signTexture(title, subtitle, arrow) {
  return canvasTexture(512, 300, (g, w, h) => {
    g.fillStyle = '#245c48'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#e6e6ce'; g.lineWidth = 7; rounded(g, 13, 13, w - 26, h - 26, 16); g.stroke();
    g.strokeStyle = 'rgba(230,230,206,.45)'; g.lineWidth = 2; rounded(g, 26, 26, w - 52, h - 52, 10); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#f0efdb';
    g.font = '600 53px Arial'; g.fillText(title, w / 2 + (arrow ? -28 : 0), 112);
    g.font = '600 35px Arial'; g.fillText(subtitle, w / 2 + (arrow ? -28 : 0), 184);
    if (arrow) {
      g.save(); g.translate(w - 75, 143); if (arrow === 'down') g.rotate(Math.PI);
      g.beginPath(); g.moveTo(0,-58); g.lineTo(36,-18); g.lineTo(15,-18); g.lineTo(15,53); g.lineTo(-15,53); g.lineTo(-15,-18); g.lineTo(-36,-18); g.closePath(); g.fill(); g.restore();
    }
  });
}
const signPhrases = [
  ['Honking','Does nothing','up'], ['Sky','Next exit','up'],
  ['Rush hour','Since 1987','down'], ['Merge?','Just fly','up'],
  ['Carpool lane closed','Try up','up'], ['Brake lights','Next 40 miles','down'],
  ['Speed limit','Ground only','up'], ['Exit 22','Almost there','down']
];
const signMaterials = signPhrases.map(p => new THREE.MeshBasicMaterial({ map: signTexture(...p), toneMapped: false }));
function makeSignGantry(index) {
  const group = new THREE.Group();
  const leftPost = box(.22, 7.6, .22, poleMat); leftPost.position.set(-9.8, 3.8, 0);
  const rightPost = box(.22, 7.6, .22, poleMat); rightPost.position.set(9.8, 3.8, 0);
  const beam = box(20, .25, .25, poleMat); beam.position.y = 7.45;
  group.add(leftPost, rightPost, beam);
  for (let s = 0; s < 2; s++) {
    const material = signMaterials[(index * 2 + s) % signMaterials.length];
    const back = box(6.7, 3.25, .18, new THREE.MeshStandardMaterial({ color: 0x254b3e, roughness: .8 }));
    back.position.set(s ? 3.55 : -3.55, 6.25, 0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 3.05), material);
    face.position.set(s ? 3.55 : -3.55, 6.25, .101);
    group.add(back, face);
  }
  return group;
}

/* -------------------------------------------------------- road chunks */
const LANE_COUNT = 6, LANE_W = 3.15, CHUNK_LENGTH = 30, CHUNK_COUNT = 11;
const laneX = lane => (lane - (LANE_COUNT - 1) / 2) * LANE_W;
const chunks = [];
function addBuilding(chunk, side, z, index) {
  const w = rand(7, 13), h = rand(11, 25), d = rand(7, 12);
  const mesh = new THREE.Mesh(unitBox, [buildingMats[index % buildingMats.length],buildingMats[index % buildingMats.length],roofMat,roofMat,buildingMats[index % buildingMats.length],buildingMats[index % buildingMats.length]]);
  mesh.scale.set(w, h, d);
  mesh.position.set(side * rand(28, 42), h / 2 - .1, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  chunk.add(mesh);
  if (random() < .35) {
    const cap = box(w * .55, rand(2,5), d * .6, roofMat);
    cap.position.set(mesh.position.x, h + cap.scale.y / 2, z);
    chunk.add(cap);
  }
}
function addStreetlight(chunk, side, z) {
  const group = new THREE.Group();
  const pole = box(.12, 7.2, .12, poleMat); pole.position.y = 3.6;
  const arm = box(2.1, .1, .1, poleMat); arm.position.set(-side * .95, 7.15, 0);
  const lamp = box(.7, .13, .38, darkMetalMat); lamp.position.set(-side * 1.85, 7.05, 0);
  group.add(pole, arm, lamp); group.position.set(side * 11.8, 0, z);
  chunk.add(group);
}
function makeChunk(index) {
  const chunk = new THREE.Group();
  const road = box(21.2, .12, CHUNK_LENGTH, roadMat, false);
  road.position.y = -.08; road.receiveShadow = true; chunk.add(road);
  for (const side of [-1, 1]) {
    const shoulder = box(18, .09, CHUNK_LENGTH, groundMat, false);
    shoulder.position.set(side * 19.6, -.12, 0); shoulder.receiveShadow = true; chunk.add(shoulder);
    for (let j = 0; j < 3; j++) {
      const wall = box(.48, 1.55, 9.82, side < 0 ? leftWallMat : rightWallMat);
      wall.position.set(side * 10.72, .72, -10 + j * 10);
      const cap = box(.6, .12, 9.85, wallCapMat);
      cap.position.set(side * 10.72, 1.52, -10 + j * 10);
      chunk.add(wall, cap);
    }
  }
  for (let boundary = 1; boundary < LANE_COUNT; boundary++) {
    const x = (boundary - LANE_COUNT / 2) * LANE_W;
    for (let z = -12; z <= 12; z += 8) {
      const dash = box(.13, .025, 3.9, lineMat, false);
      dash.position.set(x, .001, z); chunk.add(dash);
    }
  }
  const yellow = box(.14, .028, CHUNK_LENGTH, yellowLineMat, false);
  yellow.position.set(-9.62, .004, 0); chunk.add(yellow);
  const edge = box(.13, .025, CHUNK_LENGTH, lineMat, false);
  edge.position.set(9.62, .003, 0); chunk.add(edge);

  for (const side of [-1, 1]) {
    const palm = makePalm(rand(7.5, 12.5));
    palm.position.set(side * rand(13.2, 18), 0, rand(-12, 12)); chunk.add(palm);
    if (index % 2 === 0) {
      const second = makePalm(rand(8, 13));
      second.position.set(side * rand(15, 21), 0, rand(-14, 14)); chunk.add(second);
    }
    for (let j = 0; j < 3; j++) {
      const shrub = new THREE.Mesh(shrubGeometry, choose(shrubMats));
      shrub.scale.set(rand(1.1,2.5), rand(.7,1.5), rand(1,2));
      shrub.position.set(side * rand(12.2, 18.5), shrub.scale.y * .65, rand(-14,14));
      shrub.castShadow = true; chunk.add(shrub);
    }
    addBuilding(chunk, side, rand(-10, 10), index * 2 + (side > 0 ? 1 : 0));
    if (index % 3 === 0) addBuilding(chunk, side, rand(-14, 14), index + 3);
    if (index % 2 === 0) addStreetlight(chunk, side, rand(-12,12));
  }
  if (index % 4 === 2) chunk.add(makeSignGantry(index));
  chunk.position.z = 15 - index * CHUNK_LENGTH;
  scene.add(chunk); chunks.push(chunk);
}
for (let i = 0; i < CHUNK_COUNT; i++) makeChunk(i);

/* ------------------------------------------------------------- vehicles */
const tireMat = new THREE.MeshStandardMaterial({ color: 0x17151a, roughness: .82 });
const hubMat = new THREE.MeshStandardMaterial({ color: 0x847781, roughness: .35, metalness: .75 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x302b35, roughness: .18, metalness: .42 });
const playerGlassMat = new THREE.MeshStandardMaterial({ color: 0x5d5258, roughness: .22, metalness: .32 });
const tailMat = new THREE.MeshStandardMaterial({ color: 0xff174f, emissive: 0xff003c, emissiveIntensity: 3.4, roughness: .25, toneMapped: false });
const whiteTailMat = new THREE.MeshStandardMaterial({ color: 0xff5964, emissive: 0xe32238, emissiveIntensity: 1.25, roughness: .4 });
const cyanMat = new THREE.MeshBasicMaterial({ color: 0x72f5f2, transparent: true, opacity: .9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

function addWheel(group, x, y, z, radius = .43) {
  const wheel = cylinder(radius, radius, .3, 12, tireMat);
  wheel.rotation.z = Math.PI / 2; wheel.position.set(x, y, z); group.add(wheel);
  const hub = cylinder(radius * .48, radius * .48, .315, 10, hubMat);
  hub.rotation.z = Math.PI / 2; hub.position.set(x, y, z); group.add(hub);
}
function simpleCar(color, type = 'sedan') {
  const group = new THREE.Group();
  const isSUV = type === 'suv';
  const w = isSUV ? 2.25 : 2.1, l = isSUV ? 4.5 : 4.15;
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: .38, metalness: .16, flatShading: true });
  const body = new THREE.Mesh(loftGeometry(w,l,.28,isSUV?.78:.65,isSUV?1.02:.82,-l*.43,l*.43,w*.97), bodyMat);
  body.castShadow = true; body.receiveShadow = true; group.add(body);
  const cabin = new THREE.Mesh(loftGeometry(w*.87,l*(isSUV?.62:.54),isSUV?.9:.78,isSUV?1.65:1.34,isSUV?1.72:1.4,-l*(isSUV?.25:.18),l*(isSUV?.27:.2),w*.65), glassMat);
  cabin.castShadow = true; group.add(cabin);
  const roof = box(w*.68,.07,l*(isSUV?.37:.25),bodyMat);
  roof.position.set(0,isSUV?1.7:1.4,isSUV?.1:.05); group.add(roof);
  for (const x of [-w*.49,w*.49]) for (const z of [-l*.31,l*.31]) addWheel(group,x,.43,z,.42);
  for (const x of [-w*.32,w*.32]) {
    const tail = box(w*.23,.13,.06,whiteTailMat,false); tail.position.set(x,.72,l*.455); group.add(tail);
  }
  const bumper = box(w*.9,.18,.16,darkMetalMat); bumper.position.set(0,.38,l*.46); group.add(bumper);
  group.userData.length = l;
  return group;
}
function makeTruck(color = 0xd6c5ba) {
  const group = new THREE.Group();
  const cargoMat = new THREE.MeshStandardMaterial({ color, roughness: .68, metalness: .05 });
  const cabMat = new THREE.MeshStandardMaterial({ color: 0xc56b45, roughness: .48, metalness: .12 });
  const cargo = box(2.65,2.9,5.8,cargoMat); cargo.position.set(0,1.8,1.15); group.add(cargo);
  const stripe = box(2.69,.22,5.82,new THREE.MeshStandardMaterial({color:0xc27b45,roughness:.6})); stripe.position.set(0,1.05,1.15); group.add(stripe);
  const cab = box(2.5,2.25,2.25,cabMat); cab.position.set(0,1.35,-2.85); group.add(cab);
  const windshield = box(2.05,.8,.06,glassMat,false); windshield.position.set(0,1.8,-4); group.add(windshield);
  for (const x of [-1.18,1.18]) for (const z of [-2.8,.3,2.3]) addWheel(group,x,.52,z,.5);
  group.userData.length = 8.3;
  return group;
}
function makeCarrier() {
  const group = new THREE.Group();
  const red = new THREE.MeshStandardMaterial({color:0x9e3540,roughness:.55,metalness:.25});
  const bed = box(2.9,.3,8.7,red); bed.position.set(0,.65,.6); group.add(bed);
  const cab = box(2.6,2.1,2.2,new THREE.MeshStandardMaterial({color:0xb43c42,roughness:.5})); cab.position.set(0,1.25,-4.25); group.add(cab);
  for (const x of [-1.25,1.25]) for (const z of [-4.1,-1.5,2.5,3.7]) addWheel(group,x,.48,z,.48);
  for (const z of [-1.25,2.25]) {
    const car = simpleCar(choose([0x5f83b9,0x58a79c,0xcf7a4e])); car.scale.setScalar(.66); car.position.set(0,.78,z); group.add(car);
  }
  group.userData.length = 10;
  return group;
}

function makePlayer() {
  const car = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe9dfd8, roughness: .25, metalness: .28, flatShading: true });
  const body = new THREE.Mesh(loftGeometry(2.35,4.5,.28,.58,.84,-2.05,1.96,2.27),bodyMat);
  body.castShadow = true; body.receiveShadow = true; car.add(body);
  const cabin = new THREE.Mesh(loftGeometry(1.98,2.75,.78,1.28,1.46,-.83,.72,1.52),bodyMat);
  cabin.castShadow = true; car.add(cabin);
  const roof = box(1.52,.075,1.48,bodyMat); roof.position.set(0,1.455,-.03); car.add(roof);
  const rearWindow = new THREE.Mesh(new THREE.PlaneGeometry(1.58,.76),new THREE.MeshStandardMaterial({color:0x74686b,roughness:.25,metalness:.24}));
  rearWindow.position.set(0,1.145,1.08); rearWindow.rotation.x = -.69; car.add(rearWindow);
  for (const side of [-1,1]) {
    const pillar = box(.075,.08,1.65,bodyMat); pillar.position.set(side*.79,1.34,.03); pillar.rotation.x = -.03; car.add(pillar);
    const sideWindow = box(.035,.5,1.22,playerGlassMat,false); sideWindow.position.set(side*.84,1.15,-.03); car.add(sideWindow);
    const skirt = box(.13,.22,3.4,darkMetalMat); skirt.position.set(side*1.12,.34,.05); car.add(skirt);
  }
  const rearPanel = box(2.26,.42,.22,darkMetalMat); rearPanel.position.set(0,.49,2.09); car.add(rearPanel);
  const light = box(2.18,.075,.065,tailMat,false); light.position.set(0,.81,2.225); car.add(light);
  const lightGlow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xff174f,transparent:true,opacity:.2,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  lightGlow.position.set(0,.82,2.28); lightGlow.scale.set(3.1,.55,1); car.add(lightGlow);
  const diffuser = box(2.05,.18,.42,darkMetalMat); diffuser.position.set(0,.23,1.98); car.add(diffuser);
  for (let i=-2;i<=2;i++) {
    const fin = box(.055,.28,.5,darkMetalMat); fin.position.set(i*.3,.15,2.02); car.add(fin);
  }
  for (const x of [-1.09,1.09]) for (const z of [-1.38,1.38]) addWheel(car,x,.43,z,.45);
  const flames = [];
  for (const x of [-.58,.58]) {
    const nozzle = cylinder(.13,.18,.3,8,darkMetalMat); nozzle.rotation.x = Math.PI/2; nozzle.position.set(x,.24,2.05); car.add(nozzle);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(.16,1.7,8,1,true),cyanMat.clone());
    flame.rotation.x = Math.PI/2; flame.position.set(x,.24,2.95); flame.scale.set(1,.35,1); car.add(flame); flames.push(flame);
  }
  const underglow = new THREE.PointLight(0x4ee8ef,1.7,7,2); underglow.position.set(0,.2,1.8); car.add(underglow);
  car.userData.flames = flames;
  car.userData.underglow = underglow;
  return car;
}

const playerMesh = makePlayer();
scene.add(playerMesh);
const player = {
  lane: 2, x: laneX(2), y: 0, vy: 0, grounded: true, air: 100,
  rolling: false, rollTime: 0, rollDir: 1, rollAngle: 0,
  spaceHeld: false, boostHeld: false
};

/* ------------------------------------------------------- coins and ramps */
const coinMat = new THREE.MeshStandardMaterial({ color: 0xf4b735, emissive: 0xb46a08, emissiveIntensity: .8, roughness: .3, metalness: .72 });
const coinIconMat = new THREE.MeshBasicMaterial({ color: 0xfff3ae, toneMapped: false, side: THREE.DoubleSide });
const lightningShape = new THREE.Shape();
lightningShape.moveTo(.08,.42); lightningShape.lineTo(-.22,.03); lightningShape.lineTo(-.03,.03);
lightningShape.lineTo(-.12,-.4); lightningShape.lineTo(.25,.08); lightningShape.lineTo(.04,.08); lightningShape.closePath();
const lightningGeometry = new THREE.ShapeGeometry(lightningShape);
function makeCoin() {
  const group = new THREE.Group();
  const disk = cylinder(.42,.42,.11,18,coinMat); disk.rotation.x = Math.PI/2; group.add(disk);
  for (const side of [-1,1]) {
    const icon = new THREE.Mesh(lightningGeometry,coinIconMat);
    icon.position.z = side*.061; icon.rotation.y = side < 0 ? Math.PI : 0; icon.scale.setScalar(.78); group.add(icon);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({map:glowTexture,color:0xffc340,transparent:true,opacity:.35,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  glow.scale.set(1.65,1.65,1); group.add(glow);
  return group;
}
const coinTrails = [];
for (let t = 0; t < 9; t++) {
  const trail = new THREE.Group();
  trail.userData.coins = [];
  for (let i = 0; i < 5; i++) {
    const coin = makeCoin(); coin.position.set(0,0,-i*2.25); trail.add(coin); trail.userData.coins.push(coin);
  }
  trail.userData.high = t % 4 === 3;
  trail.position.y = trail.userData.high ? 3.4 : 1.25;
  scene.add(trail); coinTrails.push(trail);
}

const rampTexture = canvasTexture(256,512,(g,w,h)=>{
  g.fillStyle='#e89336';g.fillRect(0,0,w,h);
  g.strokeStyle='#342832';g.lineWidth=25;g.lineCap='square';
  for(let y=85;y<h;y+=105){g.beginPath();g.moveTo(45,y+45);g.lineTo(w/2,y);g.lineTo(w-45,y+45);g.stroke();}
  g.fillStyle='#f2444e';g.fillRect(0,0,15,h);g.fillRect(w-15,0,15,h);
});
const rampTopMat = new THREE.MeshStandardMaterial({map:rampTexture,roughness:.58,metalness:.05});
const rampSideMat = new THREE.MeshStandardMaterial({color:0xe35c3f,roughness:.65});
function makeRamp() {
  const group = new THREE.Group();
  const angle = .24;
  const base = box(2.85,.18,5.1,rampSideMat); base.rotation.x=angle;base.position.y=.66;group.add(base);
  const top = new THREE.Mesh(new THREE.PlaneGeometry(2.7,5),rampTopMat);
  top.rotation.x=-Math.PI/2+angle;top.position.set(0,.77,0);top.receiveShadow=true;group.add(top);
  const lip = box(2.85,.35,.25,rampSideMat);lip.position.set(0,1.25,-2.48);group.add(lip);
  return group;
}
const ramps = [makeRamp(),makeRamp(),makeRamp()];
ramps.forEach(r=>scene.add(r));

/* -------------------------------------------------------------- traffic */
const trafficColors = [0x65b7c9,0x4fa896,0x8a56c7,0xd96564,0xe7ddd5,0xe6b656,0x6298c4,0xbd5c87];
const traffic = [];
for (let i=0;i<19;i++) {
  const roll = random();
  let mesh, type;
  if (roll < .12) { mesh = makeTruck(choose([0xd8ccc2,0xd6bd9f,0xc7c4c5])); type='truck'; }
  else if (roll < .17) { mesh = makeCarrier(); type='carrier'; }
  else { type = roll < .43 ? 'suv' : 'sedan'; mesh = simpleCar(choose(trafficColors),type); }
  scene.add(mesh);
  traffic.push({mesh,type,speed:14,lane:0,passed:false});
}

/* ------------------------------------------------------------ particles */
const smokeTexture = canvasTexture(128,128,(g,w,h)=>{
  const grad=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);
  grad.addColorStop(0,'rgba(255,255,255,.85)');grad.addColorStop(.38,'rgba(230,235,236,.55)');grad.addColorStop(1,'rgba(205,210,215,0)');
  g.fillStyle=grad;g.fillRect(0,0,w,h);
});
const particles = [];
function particle(kind, position, velocity, life, size, color=0xffffff) {
  if (particles.length>220) return;
  const additive = kind!=='smoke';
  const material = new THREE.SpriteMaterial({
    map:kind==='smoke'?smokeTexture:glowTexture,color,transparent:true,opacity:kind==='smoke'?.55:1,
    depthWrite:false,blending:additive?THREE.AdditiveBlending:THREE.NormalBlending,toneMapped:false
  });
  const sprite = new THREE.Sprite(material);sprite.position.copy(position);sprite.scale.setScalar(size);scene.add(sprite);
  particles.push({sprite,kind,velocity:velocity.clone(),life,maxLife:life,size,growth:kind==='smoke'?1.6:.25});
}
function burst(position,count=30,fiery=false) {
  for(let i=0;i<count;i++) {
    const v=new THREE.Vector3(rand(-4,4),rand(-1,5),rand(-3,5));
    particle(fiery&&i%3?'spark':'smoke',position,v,rand(.45,1.25),rand(.3,1.2),fiery?choose([0xffd86a,0xff7b32,0xfff2bd]):0xd9e5e7);
  }
}
function updateParticles(dt) {
  for(let i=particles.length-1;i>=0;i--) {
    const p=particles[i];p.life-=dt;
    if(p.life<=0){scene.remove(p.sprite);p.sprite.material.dispose();particles.splice(i,1);continue;}
    p.sprite.position.addScaledVector(p.velocity,dt);
    p.velocity.y+=(p.kind==='smoke'?.35:-4.5)*dt;
    const progress=1-p.life/p.maxLife;
    const scale=p.size*(1+progress*p.growth);p.sprite.scale.setScalar(scale);
    p.sprite.material.opacity=(p.kind==='smoke'?.48:1)*(1-progress)*(p.kind==='smoke'?1:1-progress*.3);
  }
}

/* ---------------------------------------------------------------- audio */
let audioCtx=null,masterGain=null,engineOsc=null,engineGain=null,muted=false;
function initAudio(){
  if(audioCtx){if(audioCtx.state==='suspended')audioCtx.resume();return;}
  try{
    audioCtx=new (window.AudioContext||window.webkitAudioContext)();
    masterGain=audioCtx.createGain();masterGain.gain.value=muted?0:.45;masterGain.connect(audioCtx.destination);
    engineOsc=audioCtx.createOscillator();engineOsc.type='sawtooth';engineOsc.frequency.value=62;
    const filter=audioCtx.createBiquadFilter();filter.type='lowpass';filter.frequency.value=260;
    engineGain=audioCtx.createGain();engineGain.gain.value=0;
    engineOsc.connect(filter);filter.connect(engineGain);engineGain.connect(masterGain);engineOsc.start();
  }catch(e){audioCtx=null;}
}
function blip(frequency=720,duration=.09,volume=.12){
  if(!audioCtx||muted)return;
  const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.setValueAtTime(frequency,audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(frequency*1.45,audioCtx.currentTime+duration);
  gain.gain.setValueAtTime(volume,audioCtx.currentTime);gain.gain.exponentialRampToValueAtTime(.001,audioCtx.currentTime+duration);
  osc.connect(gain);gain.connect(masterGain);osc.start();osc.stop(audioCtx.currentTime+duration);
}

/* ------------------------------------------------------------ game state */
let state='title',score=0,distance=0,bolts=0,combo=1,bestCombo=1,currentSpeed=0;
let best=4024,elapsed=0,crashTime=0,toastTimer=0,skyToastShown=false,exhaustTimer=0;
let autopilot=params.get('demo')==='1',autoTimer=0,autoJumpTimer=2.5;
try{best=Math.max(best,parseInt(localStorage.getItem('roadster-rush-best')||'0',10)||0);}catch(e){}
ui.titleBest.textContent=fmt(best);

function setState(next){state=next;document.body.dataset.state=next;}
function showToast(text='WELCOME TO THE SKY LANE',duration=2.2){
  ui.toast.textContent=text;ui.toast.classList.add('show');toastTimer=duration;
}
function resetTraffic(){
  traffic.forEach((car,i)=>{
    car.lane=(i*5+1)%LANE_COUNT;car.speed=rand(11,20);car.passed=false;
    car.mesh.position.set(laneX(car.lane),0,-58-i*14.5);
    car.mesh.rotation.set(0,0,0);
  });
}
function resetCoins(){
  coinTrails.forEach((trail,t)=>{
    trail.position.x=laneX((t*2+1)%LANE_COUNT);trail.position.z=-38-t*36;
    trail.position.y=trail.userData.high?3.4:1.25;
    trail.userData.coins.forEach(c=>{c.visible=true;c.userData.collected=false;});
  });
}
function resetRamps(){
  ramps.forEach((r,i)=>{r.position.set(laneX((i*2+2)%LANE_COUNT),0,-115-i*125);});
}
function resetGame(){
  score=0;distance=0;bolts=0;combo=1;bestCombo=1;elapsed=0;crashTime=0;currentSpeed=25;
  skyToastShown=false;toastTimer=0;exhaustTimer=0;
  player.lane=2;player.x=laneX(2);player.y=0;player.vy=0;player.grounded=true;player.air=100;
  player.rolling=false;player.rollAngle=0;player.spaceHeld=false;player.boostHeld=false;
  playerMesh.position.set(player.x,0,0);playerMesh.rotation.set(0,0,0);
  resetTraffic();resetCoins();resetRamps();updateUI();
}
function startGame(){
  initAudio();resetGame();setState('playing');
  ui.titleScreen.classList.add('departing');ui.gameoverScreen.classList.remove('visible');
  ui.pauseBtn.textContent='Ⅱ';
}
function endGame(){
  if(state!=='playing')return;
  setState('gameover');crashTime=0;player.spaceHeld=false;player.boostHeld=false;
  playerMesh.userData.flames.forEach(f=>{f.visible=false;});
  best=Math.max(best,Math.floor(score));
  try{localStorage.setItem('roadster-rush-best',String(best));}catch(e){}
  ui.finalScore.textContent=fmt(score);ui.finalDistance.textContent=fmt(distance);
  ui.finalBolts.textContent=fmt(bolts);ui.finalCombo.textContent='×'+bestCombo;
  ui.bestLabel.textContent='BEST '+fmt(best);ui.titleBest.textContent=fmt(best);
  ui.gameoverScreen.classList.add('visible');
  ui.flash.classList.remove('burst');void ui.flash.offsetWidth;ui.flash.classList.add('burst');
  burst(new THREE.Vector3(player.x,player.y+1,0),52,true);blip(105,.5,.3);
  if(engineGain)engineGain.gain.setTargetAtTime(0,audioCtx.currentTime,.08);
}
function togglePause(){
  if(state==='playing'){setState('paused');ui.pauseBtn.textContent='▶';player.spaceHeld=false;player.boostHeld=false;}
  else if(state==='paused'){setState('playing');ui.pauseBtn.textContent='Ⅱ';initAudio();}
}
function changeLane(direction){
  if(state!=='playing')return;
  const next=clamp(player.lane+direction,0,LANE_COUNT-1);
  if(next!==player.lane){player.lane=next;blip(170,.045,.025);}
}
function jump(){
  if(state!=='playing'||!player.grounded)return;
  player.grounded=false;player.vy=7.4;player.air=Math.max(player.air,35);
  burst(new THREE.Vector3(player.x,.25,1.5),8,false);blip(240,.18,.08);
}
function barrelRoll(direction){
  if(state!=='playing'||player.grounded||player.rolling)return;
  player.rolling=true;player.rollTime=0;player.rollDir=direction;
  score+=100*combo;bestCombo=Math.max(bestCombo,combo);showToast(direction<0?'LEFT BARREL +'+100*combo:'RIGHT BARREL +'+100*combo,1.1);blip(420,.2,.07);
}

/* ---------------------------------------------------------------- input */
addEventListener('keydown',event=>{
  if(['Space','ArrowLeft','ArrowRight'].includes(event.code))event.preventDefault();
  if(event.code==='Space'){
    if(state==='title'||state==='gameover'){startGame();return;}
    if(state==='playing'){if(!event.repeat)jump();player.spaceHeld=true;}
  }else if(event.code==='KeyA'||event.code==='ArrowLeft')changeLane(-1);
  else if(event.code==='KeyD'||event.code==='ArrowRight')changeLane(1);
  else if(event.code==='KeyQ')barrelRoll(-1);
  else if(event.code==='KeyE')barrelRoll(1);
  else if(event.code==='ShiftLeft'||event.code==='ShiftRight')player.boostHeld=true;
  else if(event.code==='KeyP'||event.code==='Escape')togglePause();
});
addEventListener('keyup',event=>{
  if(event.code==='Space')player.spaceHeld=false;
  if(event.code==='ShiftLeft'||event.code==='ShiftRight')player.boostHeld=false;
});
ui.pauseBtn.addEventListener('click',togglePause);
ui.retryBtn.addEventListener('click',startGame);
ui.muteBtn.addEventListener('click',()=>{
  muted=!muted;ui.soundOn.style.display=muted?'none':'block';ui.soundOff.style.display=muted?'block':'none';
  if(masterGain)masterGain.gain.setTargetAtTime(muted?0:.45,audioCtx.currentTime,.03);
});
let touchX=0,touchY=0;
renderer.domElement.addEventListener('touchstart',event=>{
  const t=event.changedTouches[0];touchX=t.clientX;touchY=t.clientY;
  if(state==='title'||state==='gameover')startGame();else{jump();player.spaceHeld=true;}
},{passive:true});
renderer.domElement.addEventListener('touchend',event=>{
  const t=event.changedTouches[0],dx=t.clientX-touchX,dy=t.clientY-touchY;player.spaceHeld=false;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy))changeLane(dx>0?1:-1);
},{passive:true});

/* --------------------------------------------------------------- updates */
function updateUI(){
  ui.score.textContent=fmt(score);ui.distance.textContent=fmt(distance)+' M';
  ui.combo.textContent='×'+combo;ui.bolts.textContent=fmt(bolts);
  ui.airFill.style.transform=`scaleX(${clamp(player.air/100,0,1)})`;
}
function updatePlayer(dt){
  const targetX=laneX(player.lane);
  player.x=lerp(player.x,targetX,damp(dt,7.5));
  const wasGrounded=player.grounded;
  if(!player.grounded){
    if(player.spaceHeld&&player.air>0){
      player.vy+=17*dt;player.vy=Math.min(player.vy,5.2);player.air=Math.max(0,player.air-17*dt);
    }
    player.vy-=10.5*dt;
    if(player.y>8.2)player.vy=Math.min(player.vy,0);
    player.y+=player.vy*dt;
    if(player.y<=0){
      player.y=0;player.vy=0;player.grounded=true;player.rolling=false;player.rollAngle=0;
      burst(new THREE.Vector3(player.x,.15,1.2),10,false);
    }
  }else{
    player.air=Math.min(100,player.air+11*dt);
  }
  if(!wasGrounded&&player.y>2.3&&!skyToastShown){skyToastShown=true;showToast();}
  if(player.rolling){
    player.rollTime+=dt;
    const p=clamp(player.rollTime/.72,0,1),ease=1-Math.pow(1-p,3);
    player.rollAngle=player.rollDir*Math.PI*2*ease;
    if(p>=1){player.rolling=false;player.rollAngle=0;}
  }
  const boosting=player.boostHeld&&player.air>0;
  if(boosting)player.air=Math.max(0,player.air-13*dt);
  const targetSpeed=boosting?43:28;
  currentSpeed=lerp(currentSpeed,targetSpeed,damp(dt,boosting?3.5:2));
  const lateralError=targetX-player.x;
  playerMesh.position.set(player.x,player.y,0);
  playerMesh.rotation.z=player.rollAngle-lateralError*.09;
  playerMesh.rotation.y=lerp(playerMesh.rotation.y,-lateralError*.09,damp(dt,7));
  playerMesh.rotation.x=lerp(playerMesh.rotation.x,player.grounded?0:clamp(-player.vy*.025,-.15,.12),damp(dt,4));
  const flamePower=boosting?1.35:(!player.grounded&&player.spaceHeld?1.1:.12);
  playerMesh.userData.flames.forEach((flame,i)=>{
    flame.visible=flamePower>.2;
    flame.scale.y=lerp(flame.scale.y,flamePower+Math.sin(elapsed*35+i)*.045,damp(dt,15));
    flame.material.opacity=.22+flamePower*.45;
  });
  playerMesh.userData.underglow.intensity=.6+flamePower*1.8;
  exhaustTimer-=dt;
  if(exhaustTimer<=0&&(boosting||!player.grounded)){
    exhaustTimer=boosting?.025:.055;
    const pos=new THREE.Vector3(player.x+rand(-.55,.55),player.y+.25,2.6);
    particle('smoke',pos,new THREE.Vector3(rand(-.5,.5),rand(-.2,.5),rand(4,7)),rand(.55,1),rand(.45,.85),0xd9e7e9);
    if(boosting)particle('spark',pos,new THREE.Vector3(rand(-.3,.3),rand(-.2,.2),rand(3,6)),.3,rand(.2,.45),0x63e8ee);
  }
  const moved=currentSpeed*dt;
  distance+=moved*.87;score+=moved*2.8;
  if(engineGain&&audioCtx){
    engineGain.gain.setTargetAtTime(muted?0:(boosting?.055:.035),audioCtx.currentTime,.08);
    engineOsc.frequency.setTargetAtTime(48+currentSpeed*1.7,audioCtx.currentTime,.06);
  }
}
function updateWorld(dt){
  const travel=currentSpeed*dt;
  for(const chunk of chunks){
    chunk.position.z+=travel;
    if(chunk.position.z>45)chunk.position.z-=CHUNK_COUNT*CHUNK_LENGTH;
  }
  for(const car of traffic){
    car.mesh.position.z+=(currentSpeed-car.speed)*dt;
    if(car.mesh.position.z>38){
      car.lane=Math.floor(random()*LANE_COUNT);car.speed=rand(11,20);car.passed=false;
      car.mesh.position.x=laneX(car.lane);car.mesh.position.z=-rand(245,320);
    }
    if(!car.passed&&car.mesh.position.z>3){car.passed=true;}
    const hitDepth=(car.mesh.userData.length||4.5)*.42+1.15;
    if(Math.abs(car.mesh.position.z)<hitDepth&&Math.abs(car.mesh.position.x-player.x)<1.55&&player.y<1.65){endGame();return;}
  }
  for(const trail of coinTrails){
    trail.position.z+=travel;
    if(trail.position.z>42){
      trail.position.z-=330;trail.position.x=laneX(Math.floor(random()*LANE_COUNT));
      trail.userData.high=random()<.24;trail.position.y=trail.userData.high?3.4:1.25;
      trail.userData.coins.forEach(c=>{c.visible=true;c.userData.collected=false;});
    }
    for(const coin of trail.userData.coins){
      if(!coin.visible)continue;
      coin.rotation.y+=dt*2.8;coin.position.y=Math.sin(elapsed*3+coin.position.z)*.09;
      const worldZ=trail.position.z+coin.position.z;
      const coinY=trail.position.y+coin.position.y;
      if(Math.abs(worldZ)<1.35&&Math.abs(trail.position.x-player.x)<1.15&&Math.abs(coinY-(player.y+1))<1.45){
        coin.visible=false;coin.userData.collected=true;bolts++;combo=Math.min(5,1+Math.floor(bolts/10));bestCombo=Math.max(bestCombo,combo);
        score+=22*combo;blip(620+Math.min(bolts%10,6)*55,.08,.08);
        const p=new THREE.Vector3(trail.position.x,coinY,worldZ);burst(p,7,false);
      }
    }
  }
  for(const ramp of ramps){
    ramp.position.z+=travel;
    if(ramp.position.z>38){ramp.position.z-=365;ramp.position.x=laneX(Math.floor(random()*LANE_COUNT));}
    if(Math.abs(ramp.position.z)<1.7&&Math.abs(ramp.position.x-player.x)<1.35&&player.y<.5){
      player.grounded=false;player.vy=9.4;player.air=Math.min(100,player.air+28);score+=75;
      showToast('SKY LANE +75',1.2);blip(280,.22,.1);ramp.position.z-=10;
    }
  }
}
function updateCamera(dt){
  if(state==='title'){
    camera.position.x=lerp(camera.position.x,player.x,damp(dt,3));
    camera.position.y=lerp(camera.position.y,2.35,damp(dt,3));
    camera.position.z=lerp(camera.position.z,7.6,damp(dt,3));
    camera.lookAt(player.x,.9,0);camera.fov=lerp(camera.fov,49,damp(dt,3));
  }else if(state==='gameover'){
    crashTime+=dt;
    const angle=.45+crashTime*.16;
    const target=new THREE.Vector3(player.x+Math.sin(angle)*10.5,4.4+Math.sin(crashTime*.3)*.4,Math.cos(angle)*10.5);
    camera.position.lerp(target,damp(dt,2.2));camera.lookAt(player.x,.9,0);
    camera.fov=lerp(camera.fov,52,damp(dt,2));
  }else{
    const boosting=currentSpeed>35;
    const tx=player.x*.78,ty=5+player.y*.65,tz=8+player.y*.1+(boosting?1.1:0);
    camera.position.x=lerp(camera.position.x,tx,damp(dt,4.5));
    camera.position.y=lerp(camera.position.y,ty,damp(dt,4));
    camera.position.z=lerp(camera.position.z,tz,damp(dt,4));
    camera.lookAt(player.x*.85,-.85+player.y*.3,-8.5-player.y*.35);
    camera.fov=lerp(camera.fov,boosting?63:55,damp(dt,3.5));
  }
  camera.updateProjectionMatrix();
}
function updateAutopilot(dt){
  if(!autopilot||state!=='playing')return;
  autoTimer-=dt;autoJumpTimer-=dt;
  if(autoTimer<=0){autoTimer=rand(.9,1.7);changeLane(random()<.5?-1:1);}
  if(autoJumpTimer<=0){autoJumpTimer=rand(4.5,7);jump();player.spaceHeld=true;}
  if(!player.grounded){player.spaceHeld=player.y<4.8&&player.air>15;if(random()<dt*.35)barrelRoll(random()<.5?-1:1);}
  player.boostHeld=Math.sin(elapsed*.37)>.55;
}

/* ------------------------------------------------------------- main loop */
const clock=new THREE.Clock();
function animate(){
  requestAnimationFrame(animate);
  const dt=Math.min(clock.getDelta(),.04);
  if(state==='playing'){
    elapsed+=dt;updateAutopilot(dt);updatePlayer(dt);updateWorld(dt);
    if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)ui.toast.classList.remove('show');}
    updateUI();
  }else if(state==='title'){
    elapsed+=dt;playerMesh.userData.flames.forEach(f=>{f.visible=false;});
  }else if(state==='paused'){
    if(engineGain&&audioCtx)engineGain.gain.setTargetAtTime(.006,audioCtx.currentTime,.1);
  }
  updateParticles(dt);updateCamera(dt);renderer.render(scene,camera);
}
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);
  renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.8));
});

resetGame();setState('title');currentSpeed=0;
const preset=params.get('scene');
if(preset){
  startGame();
  if(preset==='game'){score=1340;distance=226;bolts=10;combo=2;}
  if(preset==='flight'){
    score=401;distance=140;bolts=5;player.y=4.1;player.vy=1.4;player.grounded=false;player.spaceHeld=true;player.air=82;showToast();
  }
  if(preset==='gameover'){score=2928;distance=656;bolts=37;combo=2;bestCombo=2;endGame();}
  updateUI();
}
window.__roadster={start:startGame,end:endGame,player,camera,playerMesh,get state(){return state;},get score(){return score;}};
animate();
