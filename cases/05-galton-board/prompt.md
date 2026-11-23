# Galton Board · Prompt archive

## Basic prompt

```text
Build a polished Galton board (bean machine) physics simulation as a single self-contained HTML file — everything inline (HTML + CSS + JS), no external libraries, rendered on an HTML5 canvas with real 2D physics, running smoothly at 60 fps.

The canvas fills the window with a dark, near-black background. In the upper-middle area sits a triangular lattice of small round pegs: about 12 rows, staggered so that a falling ball always strikes exactly one peg per row. Draw each peg as a small light-gray dot, with slightly wider spacing in the lower rows. At the top center of the board there is a single fixed drop slot; balls are released from it one at a time at a steady rate, each drop given a tiny random horizontal jitter so no two trajectories are identical.

Each ball is a small filled circle in a bright saturated color — vary the hue per ball or per drop batch (cyan, magenta, yellow, orange, lime) so individual paths are easy to follow against the dark background. Implement full rigid-body dynamics: constant gravity, elastic ball–peg collisions with restitution, ball–ball collisions among active balls, and wall damping. When a ball hits a peg it must deflect left or right based on the impact offset — no scripted random left/right choices; the binomial distribution must emerge naturally from the collisions themselves.

Below the peg array, a row of narrow vertical bins separated by thin divider walls spans the width of the board. Balls land in a bin, stack and settle visually inside it. As balls accumulate, draw a rising histogram bar in each bin (teal-green bars) so the emerging bell-shaped normal distribution is visible in real time.

Add a small HUD in a corner: a total-balls-dropped counter and drop controls (pause/resume button plus a speed slider). Keep it performant with several hundred balls on screen; cull or recycle balls once settled. Deliver the complete working file, ready to open in a browser.
```

## Advanced prompt

```text
Build a Galton board physics simulation as a single self-contained HTML file with inline HTML, CSS, and JavaScript. Use HTML5 canvas, no external libraries, and real 2D collision physics. Target 60 FPS with several hundred visible balls.

Center a precisely aligned triangular lattice of 12 staggered peg rows above 13 collection bins. Use a near-black #080D14 background, pale silver pegs, fine graphite dividers, and saturated cyan, coral, amber, and violet balls. Give pegs small directional highlights and cast subtle contact shadows without blurring their outlines. A fixed top-center slot releases one ball at a time with a tiny horizontal position jitter.

Implement gravity, circular ball–peg contacts, ball–ball collisions, restitution, friction, and damped wall impacts. Balls must physically deflect according to contact geometry; never choose their paths or destination bins randomly. Use sufficiently small substeps to prevent tunneling and tune spacing for reliable downward progress through every peg row. Briefly brighten a peg when struck and leave a short, fading trail on the most recently released ball so its trajectory remains legible.

Keep accumulated balls visible in the bins, stacking and settling without overlap. Count a ball only after it has entered and settled in a bin. Show teal histogram bars behind the piles, with exact per-bin counts and a shared scale that updates smoothly. Optionally overlay the theoretical binomial profile as a thin dashed curve explicitly labeled as a reference, never as simulated data.

Provide measured FPS, active and settled ball counts, total released, Pause/Resume, Reset, Single Drop, and a drop-rate slider from 1 to 20 balls per second. Start releasing balls automatically. Preserve counts when sleeping settled bodies for performance. Adapt to viewport size while keeping all rows, the release slot, and collection bins visible; controls must remain usable by mouse, touch, and keyboard.
```
