# Cannon & Brick Wall · Prompt archive

## Basic prompt

```text
Build three self-contained HTML5 canvas scenes with real physics:

- A cannon demolishing a brick wall
- A bowling ball knocking down the pins
- A tornado that sucks in random objects
```

## Advanced prompt

```text
Build three separate self-contained HTML5 canvas scenes with real physics. Deliver three complete runnable HTML files with their own inline styling and JavaScript. Render the scenes on canvas, and make every collision affect the simulation rather than triggering a canned destruction animation.

1. A cannon demolishing a brick wall: place a black iron cannon at lower-left, a staggered orange-red wall of at least 120 individually simulated bricks at right, a cobalt sky, and dark ground. The cannon recoils when firing; its projectile follows a gravity-driven arc. A direct hit dislodges nearby bricks, breaks supporting connections, and causes unsupported masonry to tumble into a persistent rubble pile. Include a brief warm muzzle flash, smoke that expands and fades, mortar dust, and bouncing chips. Let users aim, change launch power, and fire again.

2. A bowling ball knocking down the pins: build a polished wooden lane with ten ivory pins in the standard triangular arrangement and red neck bands. Animate ball rolling, pin rotation, pin-to-pin impacts, and sliding before settling. Provide drag-to-aim, launch strength, two throws per frame, an accurate standing-pin count, and a reset. A strike produces restrained celebratory particles above the lane. Reflections should track the moving ball and pins.

3. A tornado that sucks in random objects: scatter at least 40 objects with different masses and shapes. A traveling funnel applies inward, rotational, and upward forces, lifting objects into visible spiral trajectories before ejecting them. Objects collide, rotate, and land under gravity. Include dust concentrated near the ground and lighter airborne debris. Users can steer the tornado and adjust its strength.

Use stable timesteps, restitution, friction, and angular motion; prevent fast projectiles passing through walls. Start each scene with an automatic demonstration. Give each a compact Pause/Reset HUD, useful numeric controls, and camera framing that keeps the active event visible.
```
