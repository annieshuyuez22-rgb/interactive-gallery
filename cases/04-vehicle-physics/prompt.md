# Vehicle Physics Trio · Prompt archive

## Basic prompt

```text
Build three self-contained HTML5 canvas scenes with real physics demos, one complete runnable HTML file per scene, all CSS and JavaScript inline. Write all physics yourself in vanilla JavaScript — no libraries, no external assets; draw every visual (vehicles, terrain, water, sky, particles) with canvas code. Each scene must simulate real 2D rigid-body physics: gravity, momentum, torque and rotation, collision detection and response, debris, and particle effects. Nothing may clip through the ground or float unrealistically; bodies must break, bounce, and fall in physically plausible ways. Each scene animates automatically on load and plays out its full event.

Scene 1: A train derailing off a broken bridge into the water. A multi-car train — a locomotive plus several cars in different bright colors — rolls across an elevated bridge spanning a wide body of water, with bridge piers visible below. A section of the bridge is broken and collapsed, leaving a gap. When the train reaches the gap it derails: cars pitch, twist, and tumble off the edge one after another, some still coupled together, then splash into the water with white spray, expanding ripples, and rising bubbles, and slowly sink. Include a blue sky with drifting clouds and water with subtle surface reflections.

Scene 2: Two cars jumping off ramps and colliding mid-air over a canyon. In a desert canyon setting with steep rocky cliffs, two cars on opposite rims each accelerate up a wooden or dirt launch ramp, go airborne in high arcs, and smash into each other mid-air above the gap. On impact, glass shards, wheels, and body parts scatter with realistic spin and trajectories, and the wreckage tumbles down into the canyon below, bouncing off the rock walls.

Scene 3: A monster truck crushing a row of parked cars. At a stadium monster truck show with crowd stands in the background, a BIGFOOT-style monster truck with oversized tires drives over a row of parked cars. Car roofs and bodies crumple and deform under the wheels, the truck's suspension bounces over each wreck, and dust and debris fly with every impact.
```

## Advanced prompt

```text
Create three independent physics demos, each delivered as one self-contained HTML file with all CSS and JavaScript inline. Use HTML5 canvas and vanilla JavaScript only: no libraries or external assets. Draw vehicles, terrain, water, sky, spectators, and particles with canvas code. Implement real 2D rigid-body physics with gravity, momentum, angular velocity, friction, collision detection/response, and breakable connections. Each complete event plays automatically on load.

1. Train derailment: a graphite locomotive pulls six differently colored cars across a high stone-pier bridge toward a broken span. Wheels rotate with travel speed; couplers transmit tension. At the gap, cars pitch and tumble sequentially, remaining coupled until forces exceed their connection strength. On entering teal water, bodies displace the surface, throw spray, generate widening ripples and bubbles, lose velocity through drag, and sink. Show reflections, drifting clouds, and debris that floats or submerges according to density.

2. Two cars jumping off ramps and colliding mid-air over a canyon: crimson and electric-blue cars accelerate from opposite sandstone cliffs. Their suspension compresses on the ramps before launch. Solve the airborne collision from actual contact: panels deform, glass fragments scatter, wheels detach where joints fail, and both wrecks tumble into the canyon. Include tire dust, sparks at metal contact, and secondary impacts on ledges.

3. A monster truck crushing a row of parked cars: an orange BIGFOOT-style truck with oversized tires drives across six parked cars in a stadium. Tires rotate against surfaces; suspension compresses and rebounds. Represent crushable car bodies with deformable or breakable structures that retain damage. Include dust, scattered components, stepped spectator stands, and a readable Monster Truck Show banner.

Use a fixed timestep with substeps, prevent ground penetration and hovering, and preserve settled debris. Add Pause, Reset, Slow Motion, and a compact impact-speed readout. Smooth 2D tracking and adjustable zoom must retain the full action while revealing contact details.
```
