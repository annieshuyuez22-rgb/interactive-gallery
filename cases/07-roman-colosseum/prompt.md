# Roman Colosseum · Prompt archive

## Basic prompt

```text
Build a 3D Roman Colosseum gladiator arena game as a single self-contained HTML file using Three.js loaded from a CDN, with all CSS and JavaScript inline. It must run directly in the browser with no build step and be fully playable end to end.

The scene is a massive elliptical stone amphitheater under bright daylight with a soft, hazy pale-blue sky. The Colosseum is built from warm gray and tan stone, with multiple tiers of arched openings and stepped seating rising in an oval ring around the arena. The arena floor is an oval of light sand. Around the upper rim, place a ring of tall poles flying colored banner flags — red, blue, orange, and purple — that wave gently. Fill the stands with a dense crowd of small colored spectator figures. Scatter props around the arena floor edges: broken columns, weapon racks, and debris.

The player controls a gladiator on the sand from a smooth third-person follow camera with mouse orbit. Combat moves: light sword slash, heavy sword slash, dash, and parry. Parrying an enemy attack at the right moment staggers the opponent. AI gladiators spawn in the arena, circle the player, approach across real distance, and attack with visible wind-ups. Weapon contact produces a bright flash, recoil, and hit reactions. Both player and enemies have health and stamina; dashing and heavy attacks drain stamina. Defeating all enemies in a wave advances to the next round.

The HUD shows health and stamina bars, a round and wave indicator, control hints such as "DASH + PARRY", and a combat log line narrating each exchange with short flavor text, like an agile fighter crossing distance or a bright weapon contact and recoil. When a round ends, show a score or victory banner.

Use directional daylight with soft shadows. Keep it performant and responsive.
```

## Advanced prompt

```text
Build a fully playable 3D Roman Colosseum gladiator game as one self-contained HTML file using Three.js from a CDN, with inline CSS/JavaScript and no build step.

Create a massive elliptical amphitheater with three tiers of stone arches, radial stairways, individual stepped seating, and a sandy oval arena. Use warm travertine, cool recessed shadows, and vivid red, blue, orange, and purple banners. Fill the stands with at least 12000 instanced spectator figures arranged in seats, with staggered waving and cheering motions. Flags flutter continuously. Add broken columns, weapon racks, and scattered debris outside the main fighting area; all solid arena obstacles need collision.

Control a visibly modeled gladiator using WASD, mouse orbit, left-click light slash, right-click heavy slash, Space dash, and Shift parry. Animate weight shifts, footsteps, shield positioning, sword arcs, and recovery. Use health and regenerating stamina for the player and each opponent. Attacks have distinct wind-up, active, and recovery phases; sword contact must depend on range and attack timing. A correctly timed parry staggers the attacker and opens a punish window. Prevent hits through obstacles and attacks from across the arena.

Run three winnable rounds with one, two, and three opponents. Enemies circle, close actual distance, manage stamina, telegraph attacks, and react to damage. Impacts produce metal sparks, a short bright contact flash, recoil, and sand dust. Defeated opponents remain grounded. Show health/stamina bars, round, score, control hints, and one concise combat-log line describing the latest exchange. Include explicit victory, defeat, and restart states.

Use a damped 60-degree third-person follow camera with collision avoidance and brief restrained hit shake. Add overview and arena-side spectator presets outside active combat. Default to bright hazy daylight; offer Sunset and Torchlit Night with matching shadows and practical lights. Keep combat silhouettes readable in every mode and animate idle breathing even before the first exchange.
```
