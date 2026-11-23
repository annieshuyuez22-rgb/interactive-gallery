import * as THREE from 'three';
import { CONFIG } from './config';
import { bottleRadiusAt } from './ocean';
import { box, canvasTexture, cylinder, labelTexture, rod, seededRandom, standard, VoxelBatch, woodTexture } from './utils';

interface WaterfallDrop { x: number; z: number; offset: number; speed: number }

export class World {
  readonly glass: THREE.Mesh;
  readonly lamp = new THREE.PointLight(0xffc86b, 0, 11, 1.7);
  private beam = new THREE.Group();
  private beamMaterial: THREE.MeshBasicMaterial;
  private waterfallMaterial: THREE.ShaderMaterial;
  private waterfallPoints: THREE.Points;
  private waterfallDrops: WaterfallDrop[] = [];
  private palms: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private tag = new THREE.Group();

  constructor(readonly scene: THREE.Scene, readonly assembly: THREE.Group) {
    this.buildRoom();
    this.buildStand();
    this.buildSeabed();
    this.buildCliff();
    this.buildPalmIsland();
    this.buildClouds();
    this.glass = this.buildBottle();
    this.buildCorkAndTag();
    this.beamMaterial = this.beam.children[0].children[0] instanceof THREE.Mesh
      ? (this.beam.children[0].children[0] as THREE.Mesh).material as THREE.MeshBasicMaterial
      : new THREE.MeshBasicMaterial();
    this.waterfallMaterial = this.createWaterfall();
    this.waterfallPoints = this.createWaterfallDrops();
  }

  private buildRoom() {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(90, 1.2, 55),
      new THREE.MeshStandardMaterial({ map: woodTexture(), color: 0xbba48d, roughness: 0.72, metalness: 0.02 }),
    );
    table.position.y = -1.9;
    table.receiveShadow = true;
    this.scene.add(table);
    const backdropTexture = canvasTexture(1024, 1024, (ctx) => {
      const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
      gradient.addColorStop(0, '#35454c');
      gradient.addColorStop(0.42, '#1e303a');
      gradient.addColorStop(1, '#0e1c27');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 1024, 1024);
      const glow = ctx.createRadialGradient(210, 160, 0, 210, 160, 520);
      glow.addColorStop(0, 'rgba(210,189,147,.18)');
      glow.addColorStop(1, 'rgba(210,189,147,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, 1024, 1024);
    });
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(110, 65), new THREE.MeshBasicMaterial({ map: backdropTexture, color: 0x91a5b0 }));
    backdrop.position.set(0, 18, -31);
    this.scene.add(backdrop);
    const chart = new THREE.Mesh(new THREE.PlaneGeometry(9, 5), new THREE.MeshStandardMaterial({
      map: canvasTexture(512, 256, (ctx) => {
        ctx.fillStyle = '#bca77e'; ctx.fillRect(0, 0, 512, 256);
        ctx.strokeStyle = 'rgba(77,78,54,.35)'; ctx.lineWidth = 2;
        for (let i = 0; i < 9; i++) {
          ctx.beginPath();
          for (let x = 0; x <= 512; x += 12) {
            const y = 35 + i * 21 + Math.sin(x * 0.027 + i * 1.7) * 13;
            if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(104,61,43,.55)'; ctx.setLineDash([8, 8]);
        ctx.beginPath(); ctx.moveTo(40, 210); ctx.bezierCurveTo(190, 50, 290, 250, 478, 60); ctx.stroke();
      }), roughness: 0.96, color: 0x8f846e,
    }));
    chart.rotation.x = -Math.PI / 2;
    chart.rotation.z = -0.18;
    chart.position.set(-10, -1.285, -7.5);
    chart.receiveShadow = true;
    this.scene.add(chart);
  }

  private buildStand() {
    const wood = new THREE.MeshStandardMaterial({ color: 0x2d1a13, roughness: 0.56, metalness: 0.03 });
    const edge = standard(0x5b3a26, 0.56);
    const brass = standard(0xa9874f, 0.33, 0.7);
    for (const x of [-6.8, 4.6]) {
      box(this.scene, [2.2, 0.48, 10.1], [x, -1.02, 0], wood);
      box(this.scene, [2.28, 0.09, 10.18], [x, -0.77, 0], edge);
      for (const side of [-1, 1]) {
        box(this.scene, [1.25, 2.4, 0.72], [x, 0.02, side * 3.85], wood, [side * 0.55, 0, 0]);
        box(this.scene, [1.32, 0.16, 0.78], [x, -0.81, side * 4.36], brass);
      }
    }
    const plaqueBase = box(this.scene, [7.1, 0.28, 1.5], [0.1, -1.12, 5.25], wood);
    plaqueBase.rotation.x = -0.04;
    const texture = labelTexture('THE BOTTLED SEA', 'S.V. KESTREL  ·  No. 074');
    const side = standard(0x3c271a, 0.48);
    const face = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.43, metalness: 0.18 });
    const plaque = new THREE.Mesh(new THREE.BoxGeometry(6.3, 1.15, 0.18), [side, side, side, side, face, side]);
    plaque.position.set(0.1, -0.49, 5.45);
    plaque.rotation.x = -0.12;
    plaque.castShadow = true;
    this.scene.add(plaque);
  }

  private buildSeabed() {
    const random = seededRandom(CONFIG.seed + 31);
    const sand = new VoxelBatch();
    const colors = [0x9e956c, 0xb0a37a, 0xc0af82, 0x8c8968, 0xc6b58b];
    const step = CONFIG.waterStep;
    for (let x = -10.65; x < 7.9; x += step) {
      const radius = bottleRadiusAt(x) - 0.23;
      for (let z = -4.5; z <= 4.5; z += step) {
        if (z * z >= radius * radius - 0.2) continue;
        const y = -Math.sqrt(radius * radius - z * z) + 0.13;
        sand.add(x, y, z, step * 0.98, 0.18 + random() * 0.09, step * 0.98, colors[Math.floor(random() * colors.length)]);
      }
    }
    this.assembly.add(sand.build());
    const coral = new VoxelBatch();
    const coralColors = [0xd68569, 0xce9c65, 0x6f9f8e, 0xb87572];
    for (const [cx, cz] of [[-3.8, 3.55], [2.9, 3.65], [6.4, 2.65], [-9.2, 2.7]]) {
      const radius = bottleRadiusAt(cx) - 0.25;
      const base = -Math.sqrt(radius * radius - cz * cz) + 0.3;
      for (let branch = 0; branch < 5; branch++) {
        const x = cx + (random() - 0.5) * 0.65;
        const z = cz + (random() - 0.5) * 0.5;
        const height = 0.25 + random() * 0.6;
        coral.add(x, base + height * 0.5, z, 0.12, height, 0.12, coralColors[branch % coralColors.length]);
        coral.add(x + 0.12, base + height * 0.75, z, 0.28, 0.12, 0.12, coralColors[branch % coralColors.length]);
      }
    }
    this.assembly.add(coral.build());
  }

  private buildCliff() {
    const random = seededRandom(9207);
    const rocks = new VoxelBatch();
    const rockColors = [0x59625c, 0x697068, 0x747a6e, 0x4b5855, 0x7b7e70];
    const grassColors = [0x537f4c, 0x678c52, 0x78965b, 0x466e48];
    const step = 0.43;
    for (let x = -10.25; x <= -5.05; x += step) for (let z = -3.6; z <= 1.55; z += step) {
      const dx = (x + 7.65) / 2.8;
      const dz = (z + 1.05) / 2.65;
      const radial = Math.sqrt(dx * dx + dz * dz);
      if (radial > 1 + (random() - 0.5) * 0.1) continue;
      const top = 1.65 - radial * 0.73 + (random() - 0.5) * 0.28;
      const bottom = CONFIG.seaLevel - 1.25 + radial * 0.4;
      for (let y = bottom; y < top; y += step) {
        const isTop = y > top - step * 1.2;
        rocks.add(x, y, z, step * 0.98, step * 0.98, step * 0.98, isTop ? grassColors[Math.floor(random() * 4)] : rockColors[Math.floor(random() * 5)]);
      }
    }
    this.assembly.add(rocks.build());
    const lighthouse = new THREE.Group();
    lighthouse.position.set(-7.85, 1.35, -1.35);
    lighthouse.scale.setScalar(0.74);
    const tower = new VoxelBatch();
    for (let layer = 0; layer < 10; layer++) {
      const width = 1.03 - layer * 0.035;
      const color = Math.floor(layer / 2) % 2 === 0 ? 0xe2d9bd : 0xa84c3e;
      tower.add(0, 0.2 + layer * 0.3, 0, width, 0.29, width, color);
      if (layer === 2 || layer === 6) tower.add(0, 0.2 + layer * 0.3, width * 0.51, 0.19, 0.19, 0.04, 0x263e47);
    }
    tower.add(0, -0.01, 0, 1.48, 0.25, 1.48, 0x8a8873);
    tower.add(0, 3.12, 0, 1.25, 0.18, 1.25, 0x354044);
    lighthouse.add(tower.build());
    const metal = standard(0x333b3b, 0.42, 0.65);
    for (const x of [-0.52, 0.52]) for (const z of [-0.52, 0.52]) {
      rod(lighthouse, new THREE.Vector3(x, 3.15, z), new THREE.Vector3(x, 3.57, z), 0.025, metal);
    }
    for (const side of [-1, 1]) {
      rod(lighthouse, new THREE.Vector3(-0.55, 3.48, side * 0.55), new THREE.Vector3(0.55, 3.48, side * 0.55), 0.022, metal);
      rod(lighthouse, new THREE.Vector3(side * 0.55, 3.48, -0.55), new THREE.Vector3(side * 0.55, 3.48, 0.55), 0.022, metal);
    }
    const lampMaterial = new THREE.MeshStandardMaterial({ color: 0xffdc91, emissive: 0xffbd52, emissiveIntensity: 1.1, roughness: 0.25 });
    box(lighthouse, [0.62, 0.56, 0.62], [0, 3.48, 0], lampMaterial);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.91, 0.55, 4), standard(0x74382f, 0.62));
    roof.position.y = 4.01;
    roof.rotation.y = Math.PI / 4;
    lighthouse.add(roof);
    rod(lighthouse, new THREE.Vector3(0, 4.2, 0), new THREE.Vector3(0, 4.55, 0), 0.025, metal);
    this.assembly.add(lighthouse);
    this.lamp.position.set(-7.85, 3.93, -1.35);
    this.assembly.add(this.lamp);
    this.beam.position.copy(this.lamp.position);
    const beamMaterial = new THREE.MeshBasicMaterial({ color: 0xffe5a3, transparent: true, opacity: 0.04, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    for (const direction of [0, Math.PI]) {
      const pivot = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.15, 7, 24, 1, true), beamMaterial);
      cone.rotation.z = Math.PI / 2;
      cone.position.x = 3.5;
      pivot.rotation.y = direction;
      pivot.add(cone);
      this.beam.add(pivot);
    }
    this.assembly.add(this.beam);
    const stream = new VoxelBatch();
    for (let i = 0; i < 9; i++) stream.add(-9.25 + i * 0.22, 1.51 - i * 0.035, 0.25 + i * 0.13, 0.32, 0.1, 0.38, i % 2 ? 0x73c6c1 : 0x91d5ca);
    this.assembly.add(stream.build());
  }

  private createWaterfall() {
    const material = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpacity: { value: 0.82 } },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `
        varying vec2 vUv; uniform float uTime; uniform float uOpacity;
        float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
        void main(){
          vec2 uv=vUv; float stream=sin(uv.x*38.0+sin(uv.y*11.0-uTime*3.0)*1.4)*0.5+0.5;
          float rush=sin(uv.y*70.0-uTime*15.0+hash(vec2(floor(uv.x*12.0),0.0))*6.0)*0.5+0.5;
          float edge=smoothstep(0.0,.13,uv.x)*smoothstep(0.0,.13,1.0-uv.x);
          float alpha=(.38+stream*.34+rush*.18)*edge*uOpacity;
          vec3 color=mix(vec3(.28,.67,.70),vec3(.82,.95,.89),stream*.65+rush*.25);
          gl_FragColor=vec4(color,alpha);
        }`,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(1.12, 2.95, 8, 16), material);
    fall.position.set(-7.45, 0.02, 1.63);
    fall.rotation.y = -0.08;
    fall.renderOrder = 2;
    this.assembly.add(fall);
    const second = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 2.7), material);
    second.position.set(-6.85, -0.07, 1.45);
    second.rotation.y = 0.28;
    second.renderOrder = 2;
    this.assembly.add(second);
    return material;
  }

  private createWaterfallDrops() {
    const random = seededRandom(6219);
    const positions = new Float32Array(80 * 3);
    for (let i = 0; i < 80; i++) this.waterfallDrops.push({ x: -7.96 + random() * 1.1, z: 1.68 + random() * 0.22, offset: random() * 3, speed: 1.2 + random() * 1.8 });
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xd8f4e9, size: 0.075, transparent: true, opacity: 0.72, depthWrite: false }));
    this.assembly.add(points);
    return points;
  }

  private buildPalmIsland() {
    const random = seededRandom(4401);
    const island = new VoxelBatch();
    for (let x = 4.95; x <= 8.05; x += 0.35) for (let z = -0.3; z <= 2.85; z += 0.35) {
      const radial = Math.hypot((x - 6.45) / 1.7, (z - 1.25) / 1.55);
      if (radial > 1) continue;
      const top = CONFIG.seaLevel + 0.48 - radial * 0.35 + random() * 0.09;
      for (let y = CONFIG.seaLevel - 0.8; y < top; y += 0.32) {
        island.add(x, y, z, 0.34, 0.32, 0.34, y > top - 0.35 ? (random() > 0.5 ? 0xc5b37f : 0xd2bf89) : 0x998e66);
      }
    }
    this.assembly.add(island.build());
    this.createPalm(new THREE.Vector3(6.05, CONFIG.seaLevel + 0.35, 1.02), 2.25, -0.34);
    this.createPalm(new THREE.Vector3(7.12, CONFIG.seaLevel + 0.22, 1.25), 1.6, 0.27);
  }

  private createPalm(position: THREE.Vector3, height: number, lean: number) {
    const palm = new THREE.Group();
    palm.position.copy(position);
    const trunk = standard(0x795334, 0.9);
    const segments = 8;
    for (let i = 0; i < segments; i++) {
      const part = box(palm, [0.19 - i * 0.008, height / segments * 0.96, 0.19 - i * 0.008], [lean * i / segments, (i + 0.5) * height / segments, 0], trunk, [0, 0, -lean * 0.15]);
      part.rotation.y = i * 0.45;
    }
    const crown = new THREE.Group();
    crown.position.set(lean, height, 0);
    const greens = [standard(0x376d4c, 0.88), standard(0x4d8755, 0.86), standard(0x65945c, 0.88)];
    for (let leaf = 0; leaf < 8; leaf++) {
      const angle = leaf / 8 * Math.PI * 2;
      const branch = new THREE.Group();
      branch.rotation.y = -angle;
      for (let segment = 0; segment < 3; segment++) {
        const length = 0.55 - segment * 0.09;
        box(branch, [length, 0.075, 0.29 - segment * 0.065], [0.25 + segment * 0.45, 0.09 - segment * segment * 0.1, 0], greens[(leaf + segment) % 3], [0, 0, -0.12 - segment * 0.19]);
      }
      crown.add(branch);
    }
    const coconut = standard(0x6c542e, 0.88);
    for (const [x, z] of [[0.12, 0.08], [-0.1, 0.13], [0.02, -0.12]]) box(crown, [0.2, 0.2, 0.2], [x, -0.12, z], coconut);
    palm.add(crown);
    this.palms.push(crown);
    this.assembly.add(palm);
  }

  private buildClouds() {
    const random = seededRandom(7731);
    for (let cloud = 0; cloud < 3; cloud++) {
      const group = new THREE.Group();
      const batch = new VoxelBatch();
      for (let i = 0; i < 9; i++) batch.add((random() - 0.5) * 2.1, (random() - 0.5) * 0.42, (random() - 0.5) * 0.7, 0.5 + random() * 0.5, 0.28 + random() * 0.26, 0.45 + random() * 0.4, 0xc5d3ce);
      group.add(batch.build(new THREE.MeshStandardMaterial({ color: 0x9fb4b4, roughness: 1, transparent: true, opacity: 0.26, depthWrite: false }), false));
      group.position.set(-7 + cloud * 5.5, 3.8 + cloud * 0.22, -2.5 + cloud * 0.25);
      this.clouds.push(group);
      this.assembly.add(group);
    }
  }

  private buildBottle() {
    const profile: [number, number][] = [
      [0, -11.75], [3.5, -11.75], [4.5, -11.55], [5.0, -10.95], [5.15, -10.2],
      [5.15, 6.5], [5.08, 7.35], [4.65, 8.25], [3.65, 9.2], [2.2, 10.05],
      [1.72, 10.65], [1.72, 12.6], [1.96, 12.78], [1.96, 13.05], [1.45, 13.05],
      [1.45, 10.65], [1.95, 9.85], [3.4, 9], [4.4, 8.05], [4.82, 6.5],
      [4.82, -10.1], [4.5, -10.65], [3.7, -11.05], [0, -11.05],
    ];
    const geometry = new THREE.LatheGeometry(profile.map(([r, x]) => new THREE.Vector2(r, x)), 112);
    geometry.rotateZ(-Math.PI / 2);
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xf4fbff,
      metalness: 0,
      roughness: 0.14,
      transmission: 1,
      thickness: 0.16,
      ior: 1.46,
      dispersion: 0.012,
      attenuationColor: new THREE.Color(0xd5f0ed),
      attenuationDistance: 18,
      clearcoat: 0,
      clearcoatRoughness: 0.18,
      envMapIntensity: 0.12,
      specularIntensity: 0.04,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    const glass = new THREE.Mesh(geometry, material);
    glass.name = 'Hand-blown glass bottle';
    glass.renderOrder = 4;
    this.assembly.add(glass);
    this.addHighlights();
    return glass;
  }

  private addHighlights() {
    const rimMaterial = new THREE.MeshBasicMaterial({ color: 0xd5edf1, transparent: true, opacity: 0.27, depthWrite: false });
    for (const [x, radius] of [[-11.55, 4.55], [12.8, 1.97]]) {
      const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.028, 8, 80), rimMaterial);
      rim.rotation.y = Math.PI / 2;
      rim.position.x = x;
      this.assembly.add(rim);
    }
    const streakMaterial = new THREE.MeshBasicMaterial({ color: 0xe2f3f2, transparent: true, opacity: 0.34, depthWrite: false });
    const addStreak = (points: [number, number][], angle: number, radius = 0.022) => {
      const curve = new THREE.CatmullRomCurve3(points.map(([x, r]) => new THREE.Vector3(x, Math.sin(angle) * (r + 0.025), Math.cos(angle) * (r + 0.025))));
      const streak = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 5, false), streakMaterial);
      streak.renderOrder = 5;
      this.assembly.add(streak);
    };
    addStreak([[-10.25, 5.02], [-8.4, 5.17], [-6.1, 5.17], [-4.7, 5.17]], 1.18);
    addStreak([[1.1, 5.17], [3.2, 5.17], [5.25, 5.17], [6.35, 5.15]], 1.18, 0.018);
    addStreak([[6.55, 5.14], [7.35, 5.06], [8.25, 4.63], [9.2, 3.63], [10.02, 2.2]], 0.88, 0.026);
    addStreak([[-10.7, 5.02], [-8.2, 5.17], [-5.7, 5.17]], -1.25, 0.015);
  }

  private buildCorkAndTag() {
    const random = seededRandom(3219);
    const corkTexture = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = '#a47c4c'; ctx.fillRect(0, 0, 512, 512);
      for (let i = 0; i < 6500; i++) {
        const light = random() > 0.5;
        ctx.fillStyle = light ? 'rgba(226,190,127,.18)' : 'rgba(60,35,18,.2)';
        const size = 1 + random() * 4;
        ctx.fillRect(random() * 512, random() * 512, size, size * 0.6);
      }
      ctx.strokeStyle = 'rgba(66,40,22,.25)';
      for (let i = 0; i < 22; i++) {
        const x = random() * 512; const y = random() * 512;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + random() * 40 - 20, y + random() * 60); ctx.stroke();
      }
    });
    corkTexture.wrapS = corkTexture.wrapT = THREE.RepeatWrapping;
    const cork = cylinder(this.assembly, 1.43, 1.49, 2.5, [14.12, 0, 0], new THREE.MeshStandardMaterial({ map: corkTexture, color: 0xd0ad77, roughness: 0.96, bumpMap: corkTexture, bumpScale: 0.06 }), 48);
    cork.rotation.z = Math.PI / 2;
    const corkRing = standard(0x765233, 0.94);
    for (const x of [13.02, 13.17, 15.14]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.47, 0.026, 6, 48), corkRing);
      ring.rotation.y = Math.PI / 2; ring.position.x = x; this.assembly.add(ring);
    }
    const twine = standard(0x9e8860, 0.96);
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.79, 0.042, 6, 64), twine);
      ring.rotation.y = Math.PI / 2; ring.position.x = 11.25 + i * 0.13; this.assembly.add(ring);
    }
    rod(this.assembly, new THREE.Vector3(11.5, -1.6, 0.65), new THREE.Vector3(11.05, -2.65, 1.5), 0.035, twine);
    rod(this.assembly, new THREE.Vector3(11.5, -1.6, -0.65), new THREE.Vector3(11.05, -2.65, 1.5), 0.035, twine);
    this.tag.position.set(11.05, -2.9, 1.55);
    this.tag.rotation.z = -0.1;
    const tagTexture = canvasTexture(512, 256, (ctx) => {
      ctx.fillStyle = '#b9a276'; ctx.fillRect(0, 0, 512, 256);
      ctx.strokeStyle = '#665638'; ctx.lineWidth = 4; ctx.strokeRect(16, 16, 480, 224);
      ctx.fillStyle = '#51442f'; ctx.textAlign = 'center'; ctx.font = '38px Georgia'; ctx.fillText('THE BOTTLED SEA', 256, 113);
      ctx.font = '22px Georgia'; ctx.fillText('No. 074  ·  EST. 1742', 256, 166);
      ctx.beginPath(); ctx.arc(256, 35, 10, 0, Math.PI * 2); ctx.stroke();
    });
    const tag = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.92, 0.055), new THREE.MeshStandardMaterial({ map: tagTexture, roughness: 0.92 }));
    this.tag.add(tag);
    this.assembly.add(this.tag);
  }

  update(t: number, darkness: number, wind: number, reducedMotion: boolean) {
    const motion = reducedMotion ? 0.2 : 1;
    this.beam.rotation.y = t * 0.54 * motion;
    this.beamMaterial.opacity = darkness * 0.065;
    this.lamp.intensity = darkness * (19 + Math.sin(t * 7.3) * 1.1);
    this.waterfallMaterial.uniforms.uTime.value = t * (reducedMotion ? 0.25 : 1);
    const positions = this.waterfallPoints.geometry.attributes.position as THREE.BufferAttribute;
    this.waterfallDrops.forEach((drop, index) => {
      const progress = (t * drop.speed * motion + drop.offset) % 3.1;
      positions.setXYZ(index, drop.x + Math.sin(t * 3 + index) * 0.025, 1.48 - progress, drop.z + Math.max(0, progress - 2.6) * 0.35);
    });
    positions.needsUpdate = true;
    this.palms.forEach((palm, index) => {
      palm.rotation.z = Math.sin(t * 1.1 + index * 1.8) * 0.035 * wind * motion;
      palm.rotation.x = Math.cos(t * 0.83 + index) * 0.025 * wind * motion;
    });
    this.clouds.forEach((cloud, index) => {
      cloud.position.x = -7 + index * 5.5 + Math.sin(t * 0.09 + index) * 1.2 * motion;
    });
    this.tag.rotation.z = -0.1 + Math.sin(t * 0.85) * 0.045 * motion;
  }
}
