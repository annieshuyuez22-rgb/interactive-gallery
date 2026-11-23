# Interactive Cloth Lab · Prompt archive

## Basic prompt

```text
Build a single self-contained HTML file, all CSS and JavaScript inline, no external assets: an interactive cloth physics website called "INTERACTIVE CLOTH LAB" with a dramatic wind effect at a smooth 60 FPS.

The scene is one large piece of dark, sheer fabric simulated as a verlet-integration cloth grid of roughly 2300 particles (about 48 by 48 points connected by structural and shear constraints) filling the viewport, rendered in WebGL. The fabric ripples in slow diagonal waves driven by a turbulent wind field based on curl or simplex noise. Background is deep charcoal to near-black; the fabric is deep grey with glossy reflections, a soft sheen on the folds, and bright white highlights along the wave crests. Use one accent color, a mint green close to #7CFFB2. The camera is fixed at a slight low angle, fabric occupying most of the frame.

Interactions: a vertical "WIND" slider on the left edge (mint accent, small wind icon on top) that changes wind strength live; on the right a glassmorphic "SIMULATION" panel with sliders for Turbulence (default about 39), Stiffness (default 100) and Sheen (default 100), each showing its live value; a translucent "LIVE FABRIC ENGINE" status card listing MESH high density, LIGHT gloss plus reflection, INPUT drag plus pull, WIND turbulent. The user can grab any fold with the mouse and drag or pull it, using constraint-based picking with a soft radial influence; a "PULSE" button sends a pressure pulse wave through the fabric. Show a real-time readout in the top-right corner, like "60 FPS · 2304 PTS".

UI is a sleek dark landing-page layout: top nav bar labeled "INTERACTIVE CLOTH LAB" with tabs SHOWCASE / PHYSICS / TEXTURE / CONTROLS, a center-left hero title in huge bold type with the subtitle "Interactive WebGL cloth system", and a bottom bar titled "KINETIC BANNER" with the hint "Grab any fold, tune the wind field, or send a pressure pulse through the mesh." Everything must feel buttery smooth and physically plausible, with satisfying spring-back and no jitter, polished like a premium studio site. Physics, UI and interaction are all part of the deliverable.
```

## Advanced prompt

```text
Build INTERACTIVE CLOTH LAB as one self-contained HTML file with inline CSS/JavaScript, no external visual assets, and WebGL rendering; a Three.js CDN import is allowed. Target 60 FPS with a 48 × 48 Verlet cloth mesh: exactly 2304 particles joined by structural, shear, and bending constraints.

Fill most of the viewport with dark sheer fabric anchored along its upper edge. Use a fixed, slightly low camera, diagonal turbulent wind, and broad folds passing into smaller ripples. Show a fine procedural weave, translucent thin edges, and directional white sheen that follows fiber orientation rather than making the cloth look metallic. Use charcoal #090C10, deep-gray fabric, soft-white highlights, and mint #7CFFB2 as the sole accent. Place a large soft light above-left and a restrained rim light behind the fabric.

Implement pointer picking on the actual cloth surface with a soft radial influence. Dragging stretches nearby folds; release produces damped spring-back. Prevent explosive stretching and visible self-intersections. PULSE sends an expanding pressure wave through the mesh. A vertical WIND slider on the left changes wind strength continuously. The right SIMULATION glassmorphic panel contains Turbulence, Stiffness, and Sheen sliders with live values, initially 39, 100, and 100. Every control must affect its named property.

Preserve the INTERACTIVE CLOTH LAB navigation label, large wordmark, SHOWCASE / PHYSICS / TEXTURE / CONTROLS tabs, and subtitle Interactive WebGL cloth system. Tabs reveal relevant information or controls without replacing the animated fabric. Include the translucent LIVE FABRIC ENGINE card with MESH high density, LIGHT gloss + reflection, INPUT drag + pull, and WIND turbulent. Display measured FPS and the actual particle count at top-right.

Use the exact subheadline: Grab any fold, tune the wind field, or send a pressure pulse through the mesh. Keep KINETIC BANNER in the bottom bar. Animate slider feedback, button presses, and tab transitions; maintain readable typography and unobstructed dragging on smaller screens.
```
