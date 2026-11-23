# Rocket Launch 3D · Improvement archive

**Evidence level:** Implementation comparison — Real code-level variants, not a fabricated release timeline

## Starting point

A separate experimental Rocket file contains buildBasicWorld() and buildAdvancedWorld() implementations. They provide a real code-level comparison, but not a proven day-by-day version history.

## What changed

1. **Rocket geometry and materials** — The richer path adds PBR environment reflections, seams, hatches and a shaped engine bell rather than relying on a simple Phong rocket.

2. **Ignition and heat** — A two-layer flame becomes a white-hot core, middle and outer plume with glow and simulated heat disturbance.

3. **Smoke and exhaust** — A single radial smoke pool becomes two recycling particle pools, with large smoke moving sideways through the flame trench and a denser exhaust trail.

4. **Launch mechanism** — Clamp release, umbilical-arm retraction and the flame trench turn launch into a sequence of mechanical events.

5. **Camera and telemetry** — Pad, Aerial and Tracking presets add smooth transitions, while countdown, altitude, stage, day/night and pad lights make the sequence easier to read.

## Measured details

- 3 camera presets in the richer implementation
- 2 recycling smoke pools plus a separate exhaust trail

## Before / after evidence

No visual before/after pair is claimed for this project.

## Versions

- [Current browser study](source/rocket-launch/index.html) — Public presentation with price and ranking overlays removed

## Additional evidence

No additional evidence file is linked.

## Evidence boundary

The Basic/Rich functions are compared inside one experimental file; they are not presented as two dated releases. A separate v2 note records metal, rim-light, smoke, acceleration and pacing changes, but no v1 snapshot exists. Historical price or marketing overlays are intentionally removed from the public app.
