# Social Bench · Improvement Archive

This is the process counterpart to the final project gallery. It preserves **how the work changed**: source snapshots, technical refinements, visual comparisons, prompt evolution and measurable checks.

## Evidence standard

- **Verified iteration · 5 projects:** real source versions, technical logs and/or measurable verification.
- **Implementation comparison · 1 project:** real code-level variants, without inventing a dated release sequence.
- **Prompt evolution · 7 projects:** Basic → Advanced specification refinement; not presented as code commits.
- **Source study · 2 projects:** current implementation details only; no earlier version is claimed.
- **Final presentation · 10 projects:** no reliable process record, so no intermediate steps are invented.

Internal prices, token accounting, private review states, people, record IDs, attachment tokens and unrelated backend details are excluded. Where the surviving evidence is incomplete, the limitation is stated on the project page.

## Verified iteration histories

### [04 · Vehicle Physics Trio](cases/04-vehicle-physics/process.md)

Seven logged refinement rounds: contact geometry, shared damage fields, deterministic replay, resource cleanup, 21-point tire support and load-dependent flattening. Includes initial/final source, the iteration log and a final reset soak.

### [18 · Ship in a Bottle](cases/18-ship-in-a-bottle/process.md)

S.V. Kestrel R0/R1/R2 source snapshots, two 50-item refinement checklists, a separate R4 glass/camera line, and The Bottled Sea's source-level water, sail, rigging, lighting and recording improvements.

### [23 · Fjord Seaplane](cases/23-fjord-seaplane/process.md)

Water and exposure, terrain and reflections, float contact, camera composition, wake physics, frame-step correctness, clipping repair and the final alpine-lake implementation switch.

### [24 · Whale Breach](cases/24-whale-breach/process.md)

Three retained browser source stages plus a separate Blender asset branch: orientation, multi-scale ocean, 2,450 spray emitters, verified asset orientation, water-entry rerendering and an 11-second lateral choreography.

### [25 · Fawn Deer Motion](cases/25-fawn-deer-motion/process.md)

Asset preservation, packed textures, 30 light-direction tests and five sun angles, short-fur shading, EEVEE shadow/sampling improvements and an honest distinction between source frames and interpolated slow motion.

## Implementation and prompt studies

- [06 · Rocket Launch 3D](cases/06-rocket-launch/process.md): Basic/Rich implementation differences without a claimed release timeline.
- [17 · Stickman Website Wreck](cases/17-stickman-destroy/process.md): current webpage-tile destruction pipeline, controls and resource budgets.
- [22 · Roadster](cases/22-roadster-rush/process.md): reference-to-implementation engineering notes without invented optimization rounds.
- Prompt-evolution archives: [01](cases/01-demolition-physics/process.md), [02](cases/02-interactive-cloth-lab/process.md), [03](cases/03-cannon-brick-wall/process.md), [05](cases/05-galton-board/process.md), [07](cases/07-roman-colosseum/process.md), [08](cases/08-pelican-cyclist-svg/process.md), [09](cases/09-pos-card-swipe/process.md).

## Complete evidence index

| # | Project | Evidence level | Documented changes | Linked versions |
|---:|---|---|---:|---:|
| 01 | [Demolition Physics](cases/01-demolition-physics/process.md) | Prompt evolution | 3 | 0 |
| 02 | [Interactive Cloth Lab](cases/02-interactive-cloth-lab/process.md) | Prompt evolution | 3 | 0 |
| 03 | [Cannon & Brick Wall](cases/03-cannon-brick-wall/process.md) | Prompt evolution | 3 | 0 |
| 04 | [Vehicle Physics Trio](cases/04-vehicle-physics/process.md) | Verified iteration | 6 | 3 |
| 05 | [Galton Board](cases/05-galton-board/process.md) | Prompt evolution | 3 | 0 |
| 06 | [Rocket Launch 3D](cases/06-rocket-launch/process.md) | Implementation comparison | 5 | 1 |
| 07 | [Roman Colosseum](cases/07-roman-colosseum/process.md) | Prompt evolution | 3 | 0 |
| 08 | [Pelican Cyclist · SVG](cases/08-pelican-cyclist-svg/process.md) | Prompt evolution | 3 | 0 |
| 09 | [POS Card Swipe](cases/09-pos-card-swipe/process.md) | Prompt evolution | 3 | 0 |
| 10 | [Pelican Cyclist · 3D](cases/10-pelican-cyclist-3d/process.md) | Final presentation | 0 | 0 |
| 11 | [Robot Arm Stacking](cases/11-robot-arm-stacking/process.md) | Final presentation | 0 | 0 |
| 12 | [Drowned City](cases/12-drowned-city/process.md) | Final presentation | 0 | 0 |
| 13 | [Minecraft Self-Portrait](cases/13-minecraft-self-portrait/process.md) | Final presentation | 0 | 0 |
| 14 | [Cyclist Motion Study](cases/14-cyclist-comparison/process.md) | Final presentation | 0 | 0 |
| 15 | [Pixel Cheetah](cases/15-pixel-cheetah/process.md) | Final presentation | 0 | 0 |
| 16 | [20 Questions · Emoji](cases/16-emoji-twenty-questions/process.md) | Final presentation | 0 | 0 |
| 17 | [Stickman Website Wreck](cases/17-stickman-destroy/process.md) | Source study | 4 | 1 |
| 18 | [Ship in a Bottle](cases/18-ship-in-a-bottle/process.md) | Verified iteration | 6 | 4 |
| 19 | [Pelican Bench · Variant I](cases/19-pelican-bench-variant-1/process.md) | Final presentation | 0 | 0 |
| 20 | [Pelican Rider · Variant II](cases/20-pelican-rider-variant-2/process.md) | Final presentation | 0 | 0 |
| 21 | [Bowser Motion Study](cases/21-bowser-motion-study/process.md) | Final presentation | 0 | 0 |
| 22 | [Roadster](cases/22-roadster-rush/process.md) | Source study | 4 | 1 |
| 23 | [Fjord Seaplane](cases/23-fjord-seaplane/process.md) | Verified iteration | 8 | 2 |
| 24 | [Whale Breach](cases/24-whale-breach/process.md) | Verified iteration | 7 | 3 |
| 25 | [Fawn Deer Motion](cases/25-fawn-deer-motion/process.md) | Verified iteration | 6 | 2 |

## Reading the artifacts

- `process.md` and `process.html` live beside every project's final presentation.
- `versions/` contains retained source snapshots where their provenance is clear.
- `process-evidence/` contains selected visual comparisons, technical logs and public verification summaries.
- The final gallery and source packages remain separate, so process documentation never substitutes for a runnable final artifact.
