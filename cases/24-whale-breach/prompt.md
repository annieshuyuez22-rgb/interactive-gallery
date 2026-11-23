# Whale Breach · Prompt archive

## Basic prompt

```text
【还原度 · threejs】
（Base 原 Prompt 为空，以下按用户指定主题补写，不冒充原帖 Prompt。）

Create ONE self-contained index.html for a cinematic Three.js scene: a humpback whale breaching out of the ocean. This is one quadrant of a 4-way coding-model comparison. Work only in your assigned output directory. Do not run a browser, do not install packages, and do not create a framework project. Write the actual index.html, not a tutorial or a markdown response.

VISUAL GOAL
A clearly recognizable humpback whale, not a generic fish or torpedo: robust tapered body, small dorsal fin, long pectoral flippers, horizontal tail flukes, dark dorsal skin and a lighter throat/belly. Include a readable eye, mouth line and jaw/ventral detail. Use rich bright ocean color, real perspective, daylight, sky and atmospheric depth. The breach and water are the hero, not UI. No title, logo, model name, controls or explanatory text in the scene. No flat vector whale, no static photograph used as the scene, no aquarium glass.

MANDATORY SYNCHRONIZED 22-SECOND TIMELINE
0–3s: ocean establishing shot; whale back/roil is already visible at the surface, so the first frame is composed and meaningful.
3–6s: whale accelerates upward and its head/body break the surface, with a growing bow-wave and spray.
6–10s: full airborne breach; at 9s the whole whale, both pectoral fins and flukes must fit comfortably inside the frame.
10–13s: graceful twisting arc and downward turn; maintain the whale as the visual anchor.
13–16s: high-energy re-entry and large layered splash crown with droplets and expanding foam.
16–22s: settling foam, concentric ripples, whale briefly visible below/behind the surface, then a clean ocean vista suitable for looping.
Keep these action beats at these times exactly. Use continuous medium-wide lateral tracking with a gentle orbit, not random cuts or an extreme close-up. The whale must never disappear offscreen during the airborne phase.

WATER AND MOTION
Animate ocean normals/vertices, reflected sky/sun glints, foam patches, spray droplets and expanding rings. The whale must have a smooth ascending/arcing trajectory with a banking twist and secondary fin/fluke motion. Splash particles should follow ballistic arcs and be emitted in coherent waves tied to surface breaking and re-entry, not a constant snowstorm. Make the body/water contrast readable.

TECHNICAL CONTRACT
- Single HTML file with inline CSS/JavaScript; Three.js r160 from https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.min.js is allowed. No other dependencies or remote models are needed.
- Full-bleed 1776×820 landscape composition, responsive to other sizes, no scrolling.
- Use actual animated 3D geometry and water shading. You may use procedural textures and particle sprites.
- Expose window.__step(t): render the exact deterministic state at time t seconds (0 <= t <= 22), without advancing an independent simulation. All whale motion, camera, ocean and particles must be reproducible from t.
- Set window.__ready = true only after a successful first render. Support ?freeze=9 to show a static frame and ?auto=1 to play the 22s timeline in real time. Normal load may autoplay.
- Keep geometry and particle counts moderate enough for 30fps capture with hardware WebGL. No external API keys, no audio, no build step.
- Avoid runtime errors and NaNs. Test your own code logically before finishing.

Return by writing index.html in the assigned directory. Keep the implementation focused on the whale, the breach and the water.
```

## Advanced prompt

```text
【还原度 · threejs】
（Base 原 Prompt 为空，以下为 K3 高级补写版。）

Build the premium K3 candidate for a 4-way AI coding comparison: a spectacular, physically convincing humpback whale breaching out of a luminous ocean. Work in the project working directory. Read prompt_basic.txt and obey every technical and timeline requirement in it. Write the finished single-file scene to runs/k3/index.html. Do not only print code in the response.

Two visual references are attached: ref/whale-anatomy.jpg for humpback anatomy/body proportions and ref/whale-splash.jpg for the relationship between the whale, airborne water and scale. They are visual references only. Do not display the photographs as a flat background, do not reuse them in any other model's run, and do not require them at runtime. Study them before modeling.

ART DIRECTION
A bright cinematic ocean at late afternoon: luminous turquoise-to-deep-blue water, warm side light, a subtle horizon, distant atmospheric haze, detailed but restrained sky. Realistic materials and layered depth rather than a toy-like flat scene. Aim for a breathtaking natural spectacle and a poster-worthy first frame. Maintain excellent dark-whale/light-water separation without crushing the whale into a silhouette.

ANATOMY AND SECONDARY DETAIL
Invest in a convincing humpback silhouette: custom smoothly varying body cross-sections, thick torso tapering into a narrow peduncle, broad horizontal flukes, a small hooked dorsal fin and notably long pectoral flippers with pale undersides. Include lower jaw/throat volume, a subtle curved mouth, a small correctly placed eye, ventral pleats and restrained tubercle/barnacle detail. Avoid a stack of obvious spheres or a rigid cigar shape. Use smooth shading, carefully oriented fins and coherent left/right anatomy. Add controlled body flex and fluke/pectoral motion during the breach, with banking/angular inertia rather than rigid translation.

WATER AND BREACH
Use a genuine animated ocean shader or equivalent nuanced shading: multi-scale moving ripples, sky-color Fresnel reflection, glancing-angle sun glints, subtle foam streaks and depth-dependent color. The whale should interact visually with the water through a bow wave, sheets of spray, ballistic droplets of varied size, a layered splash crown, whitewater, expanding rings and a fading turbulent footprint. A few larger stretched droplets near the body plus many fine droplets will give scale. The big re-entry splash is the climax; do not let the whale look weightless or the water look like confetti.

CAMERA AND EXACT TIMING
Use the common 22s timeline from prompt_basic.txt: surface anticipation 0–3, rise 3–6, full breach 6–10, twisting descent 10–13, re-entry/splash 13–16, settling ripples 16–22. First frame already shows an elegant whale-back/roil composition. At 9s show the entire animal in a medium-wide hero composition with comfortable margins and visible ocean below. Camera motion must be continuous and deliberate, following the whale while preserving the horizon and spatial orientation. Do not crop the whale at the apex, do not make sudden cuts, and do not spend several seconds on empty water.

FIVE SELF-REFINEMENT PASSES BEFORE FINISHING
After the initial implementation, inspect and improve the actual file in five focused passes, without starting a new generation session:
1. Anatomy: humpback proportions, long flippers, flukes, jaw, eye and body deformation.
2. Water: layered shader detail, spray variation, whitewater and contact with the whale.
3. Physics: smooth arc, banking, angular inertia and correctly timed splash emission.
4. Cinematography: first-frame composition, 9s full-body hero frame, contrast, scale and continuous tracking.
5. Robustness: deterministic __step(t), no NaNs/errors, complete scene at all timeline beats, and practical rendering cost.

TECHNICAL CONTRACT
Follow prompt_basic.txt exactly: single index.html, Three.js r160 CDN allowed, 1776×820 landscape, no UI/text/branding in the scene, no build system, no installed dependencies. window.__step(t) must deterministically render every animated property at arbitrary t; window.__ready only after a successful render; ?freeze=9 and ?auto=1 supported. The default load should play. Make the output a finished interactive/cinematic 3D scene, not a design document.

Perform the five refinement passes on the file, then finish with a concise report of the file and improvements. Do not run parallel browser recordings; the parent agent will perform QC and capture serially.
```
