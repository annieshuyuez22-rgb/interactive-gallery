# Ship in a Bottle · Improvement archive

**Evidence level:** Verified iteration — Source snapshots, technical logs and/or measurable checks

## Starting point

S.V. Kestrel preserves R0, R1 and R2 source snapshots. The Bottled Sea preserves a separate pre-refinement source archive and the current TypeScript implementation. These are related project lines, not one artificial four-release sequence.

## What changed

1. **R0 → R1: 50 documented details** — The first refinement adds 50 enumerated visual and interaction details. Independent deterministic random streams preserve the original layout, while instancing and a centralized update function control the added animation cost.

2. **R1 → R2: 50 more documented details** — A second independent random stream and bake pass add weather-reactive jellyfish, rain rings, lightning reflections, cloud shadows and other scene behavior without resetting the earlier composition.

3. **R4: glass, rigging and camera behavior** — A later project line refines hollow glass, curve highlights, physical rigging and lighthouse beams. Manual camera selection now stops automatic rotation. Only the five actually documented R4 motion details are claimed.

4. **Brighter studio and director timeline** — The R4 presentation introduces a brighter studio, layered blue water and a wall-clock camera timeline so software rendering does not slow the intended transitions.

5. **The Bottled Sea: source-level visual refinement** — The preserved before/after sources show deeper water, richer storm mixing, wakes and spray, curved sails, physical rigging, ship lights, adjusted glass reflections and rebalanced day/night fill and rim lighting.

6. **Non-destructive recording and deterministic fallback** — Output and frame paths can be redirected instead of overwriting earlier takes. A wider final hero shot and explicit fallback state improve repeatable recording.

## Measured details

- R1: 50 enumerated additions
- R2: 50 further additions
- 9 build and interaction checks passed, including 390px touch layout
- Dual-video playback passed with zero browser errors

## Before / after evidence

No visual before/after pair is claimed for this project.

## Versions

- [S.V. Kestrel R0](versions/r0/index.html) — Baseline snapshot
- [S.V. Kestrel R1](versions/r1/index.html) — First 50-detail snapshot
- [S.V. Kestrel R2](versions/r2/index.html) — Second 50-detail snapshot
- [Current Bottled Sea](source/bottled-sea/dist/index.html) — Current production implementation

## Additional evidence

- [R1/R2 detail checklist](process-evidence/kestrel-details.md)
- [Interaction verification](process-evidence/bottled-sea-verification.json)

## Evidence boundary

R4 is a separate refinement line, not a continuous R2→R4 snapshot chain. Water uses wave functions, spring damping and sampling approximations rather than a full fluid solver. The archive records successful build, interaction and playback checks; the complete verify:record regression was not rerun during packaging.
