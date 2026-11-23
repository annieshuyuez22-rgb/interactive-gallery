# POS Card Swipe · Improvement archive

**Evidence level:** Prompt evolution — Basic → Advanced specification refinement

## Starting point

A minimal isometric SVG card swipe with a moving card, glowing chip, receipt, success check and smooth easing.

## What changed

1. **Geometry and material layers are specified** — Thirty-degree isometry, separate terminal faces, screen, keypad, reader slot, print port, embossed card details and ground shadow are added.

2. **Occlusion becomes a correctness requirement** — Inserted card sections must be clipped by the reader edge, the chip glows only during the swipe, and the receipt respects the print-port layer order.

3. **The transaction becomes an eight-second sequence** — Swipe, confirmation pulse, receipt expansion, stamped check, hold, card return and receipt reset must not overlap or jump at the loop boundary.

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
