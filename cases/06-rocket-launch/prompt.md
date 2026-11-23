# Rocket Launch 3D · Prompt archive

## Basic prompt

```text
Create a single self-contained HTML file (all CSS and JS inline, CDN imports allowed) with an interactive 3D rocket launch scene built with Three.js.

The scene is a coastal rocket launch complex sitting on a wide gray concrete pad at the edge of the ocean. At the center stands a tall white multi-stage rocket in vertical position, with a black interstage band, a pointed fairing, and small engine nozzles at the base. Next to it, a lattice-style service tower slightly taller than the rocket, built from dark steel truss segments, with an umbilical arm reaching toward the rocket's upper stage. Around the pad scatter several white spherical and cylindrical fuel storage tanks, two or three small low support buildings, and a few tall thin lightning masts at the corners of the complex.

Behind the pad the ocean stretches to the horizon with gently animated waves and subtle specular highlights. The sky has soft drifting clouds and supports a full day/night cycle: warm orange-pink gradients at dawn and dusk, a bright blue noon, and a dark night sky filled with stars and a moon. Directional sunlight casts soft shadows that move with the time of day.

Add a UI overlay panel in the bottom-left corner containing two controls: a prominent orange "Launch" button and a "Time of Day" slider. Moving the slider smoothly shifts the sun position, sky color, ambient light intensity, and shadow direction. Clicking Launch starts a short on-screen countdown, then ignition: a bright orange-yellow engine flame, billowing gray-white smoke particles spreading outward from the pad, a low rumble with camera shake, and the rocket slowly lifting off, accelerating upward with a long exhaust trail until it leaves the frame.

Use realistic proportions and smooth orbit camera controls so the scene can be inspected from any angle before launch. Keep everything performant at 60fps. No external assets — generate all geometry procedurally.
```

## Advanced prompt

```text
Create one self-contained HTML file with inline CSS and JavaScript, using Three.js with CDN imports allowed. Build an interactive 3D rocket launch complex entirely from procedural geometry and materials; use no external assets. Target 60 FPS.

Place a realistically proportioned white multistage rocket with black interstage bands on a concrete coastal pad. Model engine bells, panel seams, access hatches, launch clamps, and soot around the flame trench. Add a steel lattice service tower with platforms, stairs, and an articulated umbilical arm; four lightning masts; six spherical or cylindrical fuel tanks; pipes; service roads; and small support buildings. The ocean stretches to the horizon, with visibly moving waves, transparent turquoise crests, deeper cobalt troughs, and changing sun reflections.

The bottom-left panel contains a prominent orange Launch button and a Time of Day slider. Launch starts a visible ten-second countdown. Retract the umbilical, release clamps at liftoff, ignite a bright white-hot engine core with orange turbulent edges, and push rolling smoke sideways through the flame trench. The rocket initially rises slowly, accelerates, and leaves an expanding exhaust trail before departing the frame. Use layered smoke particles, heat shimmer, restrained ignition shake, and exhaust illumination on nearby structures. Show countdown, altitude, and ascent state from the actual sequence. Include Reset for a repeatable launch.

The time slider continuously updates sun direction, sky gradients, shadows, ambient light, stars, and facility lamps: peach dawn, clear blue noon, saturated orange dusk, and navy night. Keep nighttime geometry readable under practical lights.

Offer damped orbit controls before launch and three named camera presets: Pad, a low 35mm view; Aerial, a 28mm overview; and Tracking, a 70mm ascent follow shot. Transition smoothly without crossing geometry. Keep the main launch composition active by default, with the tower, rocket, ocean, and expanding plume simultaneously legible at ignition.
```
