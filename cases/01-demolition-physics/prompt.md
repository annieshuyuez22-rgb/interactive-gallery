# Demolition Physics · Prompt archive

## Basic prompt

```text
【原话 · single-html-canvas】
Build a single self-contained HTML file (all HTML, CSS, and JavaScript inline, no external assets, no CDN, no external libraries) that renders a demolition physics scene on an HTML5 canvas:

A crane on the right side of the scene swings a heavy wrecking ball into an apartment block standing on the left. The building is made of many separate bricks/blocks. On each impact, blocks break loose, fly and tumble with rotation, collide with each other and the ground with inertia and bounce, and pile up as rubble. Add dust puffs on impacts. The wrecking ball swings back and forth automatically, smashing the building bit by bit until it fully collapses, then the scene loops after a short pause.

Requirements:
- Real 2D physics: gravity, velocity, angular rotation, brick-vs-brick collision, ground friction/bounce.
- Bright daylight colors, fixed side camera, scene runs on its own in one continuous take.
- Pseudo-3D look (simple shading on blocks is enough).
- Page must load with zero console errors at a 1776x820 viewport.
- Write the result to a file named index.html in the current working directory.
```

## Advanced prompt

```text
Build three separate self-contained HTML files, each an interactive 3D physics scene with inline CSS and application JavaScript. Use procedural geometry and materials with no external assets; CDN physics/rendering libraries are allowed. Preserve a crisp low-poly cartoon style: cobalt sky, emerald grass, terracotta masonry, safety-yellow machinery, and clear blue water. Each scene begins its physical event automatically.

1. A tornado that sucks in a whole field: populate rolling farmland with 12 houses, 3 barns, 40 trees, fences, hay bales, and loose props. A visibly rotating funnel travels across the field. Apply distance-dependent radial suction, tangential force, and uplift to nearby rigid bodies: fences detach, roofs lift, and objects spiral upward before ejecting and colliding with the ground. Layer ground-hugging dust, airborne leaves, and larger debris without obscuring the funnel.

2. A wrecking ball taking down an apartment block: construct a six-story brick building with visible floors, windows, and bonded wall blocks. A yellow lattice crane suspends a brushed-steel ball from a constrained chain. Contact breaks local bonds first; cracks propagate, unsupported sections collapse, and rubble settles into persistent piles. Repeated swings progressively demolish the building. Include impact dust, brick chips, chain tension, and ball recoil.

3. An overloaded truck collapsing a truss bridge: an orange steel truss spans a translucent flowing river. The loaded truck visibly compresses its suspension; the bridge deflects before overloaded joints fail sequentially. Deck sections and truck fall, strike the river, generate spray and expanding ripples, then sink or float according to density.

Use gravity, collision response, mass, angular momentum, breakable constraints, and a fixed simulation timestep; destruction must emerge from forces. Provide Pause, Reset, speed controls, and working 28mm aerial, 40mm action, and 65mm impact camera presets. Keep contact points readable and objects out of intact surfaces.
```
