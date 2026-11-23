# Interactive Cloth Lab · Improvement archive

**Evidence level:** Prompt evolution — Basic → Advanced specification refinement

## Starting point

A WebGL cloth lab with a roughly 48×48 Verlet grid, turbulent wind, dragging, PULSE, simulation controls and a 60 FPS target.

## What changed

1. **Cloth stability is tightened** — Exactly 2304 particles, structural/shear/bending constraints, an anchored upper edge, bounded stretching and damped release are specified.

2. **Fabric replaces a generic shiny surface** — Procedural weave, translucent thin edges and fiber-aligned white sheen are required, explicitly avoiding a metallic look.

3. **Controls must affect the real simulation** — Picking must occur on the actual cloth, every slider must affect its named property, and measured FPS/particle count must be shown.

## Measured details

- No additional quantitative claim is made.

## Before / after evidence

No visual before/after pair is claimed for this project.

## Versions

- No earlier runnable version is claimed.

## Additional evidence

No additional evidence file is linked.

## Evidence boundary

This entry documents specification refinement from Basic to Advanced. It does not prove that every requirement was implemented or verified, and it is not presented as a complete code iteration log.
