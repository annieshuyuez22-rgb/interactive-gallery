# Stickman Website Wreck · Improvement archive

**Evidence level:** Source study — Current implementation details; no earlier version claimed

## Starting point

Only the current Stickman source snapshot is available. The page documents implementation choices rather than inventing an iteration history.

## What changed

1. **Webpage-to-tile pipeline** — A page image is captured or replaced by an offline fallback, split into 16px tiles and classified against the dominant background color.

2. **Destruction that inherits the source page** — Tiles have health, scorching, fire spread and area damage; debris uses the original webpage pixels with smoke, sparks and explosion particles.

3. **Character and payload controls** — Running, jumping, flips, sustained flight, slam collisions, three viewport-clearing payloads and a bouncing timed grenade are implemented.

4. **Feedback and budgets** — Smooth follow, explosion shake, destruction HUD, cooldowns, pause/restart, sound and dark-mode controls are capped by a 1,300-particle budget and a 2× pixel-ratio limit.

## Measured details

- No additional quantitative claim is made.

## Before / after evidence

No visual before/after pair is claimed for this project.

## Versions

- [Current source](source/stickman-destroy/index.html) — Only verified source snapshot

## Additional evidence

No additional evidence file is linked.

## Evidence boundary

No prompt pair, earlier source or iteration log was found. These are current implementation features, not claims of sequential optimization.
