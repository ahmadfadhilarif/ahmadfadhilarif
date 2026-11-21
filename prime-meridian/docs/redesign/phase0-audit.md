# Phase 0: Audit

## Engine and project structure

- **One file:** the whole game is `prime-meridian/index.html` (was `prime-meridian/index.html`) (about 700 KB, 5,628 lines). It has no build step, no modules and no asset files.
- **Engine:** three.js r128, loaded from cdnjs. Fonts come from Google Fonts.
- **Everything is made in code at load time:** every model (pets are sculpted from signed-distance shapes), every texture (drawn on canvases), and every sound and piece of music (Web Audio synthesis).
- **Main loop:** `frame()` asks for the next frame, then runs `frameStep()`. That moves the player, runs about 400 animation jobs (`anims`), updates level of detail and culling, and renders.

## How puzzles are defined

- **`ROOMS`** (`index.html:408`) lists the 10 places. Each place has:
  - a name and a topic;
  - `spots`: where each panel stands, in the place's own coordinates;
  - `panels`: the generator settings for each puzzle.
- **Generation:** puzzles are generated at load by `GEN[type]`, checked by `validate()`, and their wording comes from `ruleText()`.
  - The random seed is the place's original number plus the panel index, so every puzzle is identical on every load.
  - A strict generator relaxes its extra rules step by step if it can't build a level, and it always ends the same way.
- **Panel ids:** `"<original place number>-<index>"`, for example `6-3` is the castle's 4th puzzle.
- **Mechanics:** 10 in total.
  - `free`: just draw a line
  - `stars`: touch every star, keep off the clouds
  - `rank`: touch the numbers from smallest to biggest
  - `order`: count in steps
  - `sum`: the numbers you touch add up to the target
  - `mult`: touch one times table only
  - `sep`: fence odd and even numbers apart
  - `take`: take away every number you touch
  - `grp`: fence so each area holds the same answers (sums, or doubles and halves)
  - `bond`: fence so each area adds up to the target
- **One mechanic per place:** each place already uses a single mechanic, with 8 puzzles running from easy to hard. The Welcome Garden has 4.
- **No puzzle reads another puzzle's state.** The only door tied to a puzzle is the castle drawbridge, which comes down when the castle's 4th puzzle is solved. That door is inside its own area, so it already fits the brief's rule R3.

## How unlocking works now

Everything that assumes the fixed order:

| Where | What it does |
|---|---|
| `isPowered` (`index.html:541`) | One chain across the whole game: panel N needs panel N−1 solved, across place boundaries. |
| `check()` (`:5249`) | Solving a place's 8th panel opens that place's exit gate (`roomDone`). |
| Frame loop (`:5592`) | The next place's entrance gate opens when you're halfway along the walk and the previous exit is open. |
| `refreshWorld()` (`:5119`) | A place's entry cable lights only when the previous place is complete. |
| `nextPanel()` (`:4820`) | The first unsolved panel in the whole game. The owl and the cable sparkles guide you to it. |
| `firstOpen()` and `buildPlaces()` (`:5476`) | In the menu's place list, every place after the first unfinished one is locked. |
| Restore progress (`:5518`) | Starts you at the first unfinished place. |
| `placeAt()` and `updateHud()` (`:5131`) | Works out which place you're in from your north–south position on the strip. |
| Finish (frame loop) | Needs every panel solved and you past the end of the strip. Fireworks and the rocket check the same position. |
| `ROOM_ORDER` and `DIFF` | Hard-coded order and difficulty of the places. |

## How the island is built

- **Layout:** a long north-to-south strip. Constants: `AREA`=68 m, `GAP`=24 m, `FIN`=30 m, half-width about 38 m. `z0s[r] = -92·r`, so the island is about 1 km long and 80 m wide (ratio about 12 : 1).
- **Order:** you land by boat at the north tip, walk through the Welcome Garden, then the 9 places in order. Between each pair is a themed link: a garden walk or a river with a bridge. Finish Meadow and the rocket are at the south tip.
- **Coast and sea:** `coastX(side,z)` gives the shore on each side. The ground, the sea-bed shape, the ocean mask, rivers running coast to coast, scattered plants and the sea sound are all built from it.
- **Building:** each place is built by its own function (`buildCastle(z0)`, `buildBeach(z0)` and so on) in coordinates centred on the strip. About 40 more blocks of code (pets, animations) look places up with `z0s[RI('castle')]`.
- **Themed walls:** `divider()` and `makeGate()` build the walls and gates across the strip between places.

## How saving works

- **Progress:** stored in `localStorage['number-grove-v7']` as a JSON list of solved panel ids. It is **not** a linear position.
- **Gates:** not saved. On load, they are worked out again from the solved panels.
- **Other keys:** `number-grove-rocket` (the rocket has launched), `number-grove-music`, and the quality setting.

## Where the code doesn't match what the brief expects

1. **Saves hold solved ids, not a position.** Migrating is simple: keep the ids, map them to the new names, and add a version number.
2. **No engine data files.** There are no scenes or ScriptableObjects. The progression data will be a JSON block inside `index.html`, which keeps the game a single file.
3. **Mixed arithmetic in two places.** Match Maker Market (puzzles 4–8) and Glasshouse Gardens (puzzles 5 and 8) mix plain adding, taking away and times into their own fence rule. Every panel states its rule in words, so I treat basic arithmetic as part of the basics rather than "another area's mechanic". The design doc explains this.

## Every puzzle

Difficulty is my estimate from the grid size, the place's difficulty and the puzzle's position in it. "Depends on" is the current chain.

| Order | Id | Place | Spot (x, z local) | Mechanic | Grid | Difficulty (1-5) | Depends on |
|---|---|---|---|---|---|---|---|
| 1 | 9-0 | Welcome Garden | -3.6, -12 | Draw a line (no rule) | 3×3 | 1 | none (first panel) |
| 2 | 9-1 | Welcome Garden | 3.6, -26 | Draw a line (no rule) | 4×4 | 1 | 9-0 |
| 3 | 9-2 | Welcome Garden | -3.6, -40 | Touch every star (avoid clouds) | 4×4 | 1 | 9-1 |
| 4 | 9-3 | Welcome Garden | 3.6, -54 | Touch every star (avoid clouds) | 5×5 | 2 | 9-2 |
| 5 | 6-0 | Place Value Castle | -4, -8 | Touch numbers smallest to biggest | 3×3 | 1 | 9-3 |
| 6 | 6-1 | Place Value Castle | 7, -16 | Touch numbers smallest to biggest | 3×3 | 1 | 6-0 |
| 7 | 6-2 | Place Value Castle | -12, -24 | Touch numbers smallest to biggest | 4×4 | 1 | 6-1 |
| 8 | 6-3 | Place Value Castle | 3.6, -31.8 | Touch numbers smallest to biggest (biggest first) | 4×4 | 1 | 6-2 |
| 9 | 6-4 | Place Value Castle | -5, -50 | Touch numbers smallest to biggest | 4×4 | 2 | 6-3 |
| 10 | 6-5 | Place Value Castle | 10, -52 | Touch numbers smallest to biggest (biggest first) | 6×6 | 3 | 6-4 |
| 11 | 6-6 | Place Value Castle | -10.93, -56 | Touch numbers smallest to biggest | 6×6 | 3 | 6-5 |
| 12 | 6-7 | Place Value Castle | 8, -64 | Touch numbers smallest to biggest (biggest first) | 7×7 | 5 | 6-6 |
| 13 | 4-0 | Windmill Hill | -5, -8 | Count in steps, in order (in 2s) | 3×3 | 1 | 6-7 |
| 14 | 4-1 | Windmill Hill | -18.5, -16 | Count in steps, in order (in 10s) | 4×4 | 1 | 4-0 |
| 15 | 4-2 | Windmill Hill | -14.5, -30.5 | Count in steps, in order (in 5s) | 4×4 | 1 | 4-1 |
| 16 | 4-3 | Windmill Hill | -8, -47 | Count in steps, in order (in 3s) | 4×4 | 1 | 4-2 |
| 17 | 4-4 | Windmill Hill | 8, -49 | Count in steps, in order (in 4s, hidden list) | 5×5 | 2 | 4-3 |
| 18 | 4-5 | Windmill Hill | 23, -52 | Count in steps, in order (in 25s, hidden list) | 6×6 | 3 | 4-4 |
| 19 | 4-6 | Windmill Hill | -7, -56 | Count in steps, in order (in 10s, down, hidden list) | 6×6 | 3 | 4-5 |
| 20 | 4-7 | Windmill Hill | -9, -63.5 | Count in steps, in order (in 7s, hidden list) | 7×7 | 5 | 4-6 |
| 21 | 0-0 | Adding Garden | -3.6, -8 | Path sum hits target | 3×3 | 1 | 4-7 |
| 22 | 0-1 | Adding Garden | -3.2, -13 | Path sum hits target | 3×3 | 1 | 0-0 |
| 23 | 0-2 | Adding Garden | 9, -14.3 | Path sum hits target | 4×4 | 2 | 0-1 |
| 24 | 0-3 | Adding Garden | -15.4, -30 | Path sum hits target | 4×4 | 2 | 0-2 |
| 25 | 0-4 | Adding Garden | -6.5, -47.5 | Path sum hits target | 4×4 | 3 | 0-3 |
| 26 | 0-5 | Adding Garden | 8, -53 | Path sum hits target | 5×5 | 4 | 0-4 |
| 27 | 0-6 | Adding Garden | 20.5, -60 | Path sum hits target | 5×5 | 4 | 0-5 |
| 28 | 0-7 | Adding Garden | -13, -59.5 | Path sum hits target | 6×6 | 5 | 0-6 |
| 29 | 1-0 | Times Table Village | -11.93, -9.6 | Touch one times table only (×10) | 3×3 | 1 | 0-7 |
| 30 | 1-1 | Times Table Village | 11.93, -12.6 | Touch one times table only (×2) | 4×4 | 1 | 1-0 |
| 31 | 1-2 | Times Table Village | 0, -20.6 | Touch one times table only (×5) | 4×4 | 2 | 1-1 |
| 32 | 1-3 | Times Table Village | 11.93, -31.6 | Touch one times table only (×3) | 4×4 | 2 | 1-2 |
| 33 | 1-4 | Times Table Village | -14.93, -49.5 | Touch one times table only (×4) | 5×5 | 3 | 1-3 |
| 34 | 1-5 | Times Table Village | 14.93, -55 | Touch one times table only (×6) | 6×6 | 4 | 1-4 |
| 35 | 1-6 | Times Table Village | 7, -62.5 | Touch one times table only (×8) | 6×6 | 4 | 1-5 |
| 36 | 1-7 | Times Table Village | -15.43, -62 | Touch one times table only (×7) | 7×7 | 5 | 1-6 |
| 37 | 2-0 | Odd and Even Pond | -3.6, -6.5 | Fence: odd and even apart | 3×3 | 1 | 1-7 |
| 38 | 2-1 | Odd and Even Pond | 0, -19.2 | Fence: odd and even apart | 3×3 | 1 | 2-0 |
| 39 | 2-2 | Odd and Even Pond | 3, -27 | Fence: odd and even apart | 4×4 | 2 | 2-1 |
| 40 | 2-3 | Odd and Even Pond | -15.2, -33.93 | Fence: odd and even apart | 4×4 | 2 | 2-2 |
| 41 | 2-4 | Odd and Even Pond | -4, -46.5 | Fence: odd and even apart | 4×4 | 3 | 2-3 |
| 42 | 2-5 | Odd and Even Pond | -20, -48 | Fence: odd and even apart | 6×6 | 4 | 2-4 |
| 43 | 2-6 | Odd and Even Pond | 4, -65.5 | Fence: odd and even apart | 6×6 | 4 | 2-5 |
| 44 | 2-7 | Odd and Even Pond | 14, -48 | Fence: odd and even apart | 7×7 | 5 | 2-6 |
| 45 | 8-0 | Snowflake Hollow | -3.6, -8 | Take away along the path | 3×3 | 1 | 2-7 |
| 46 | 8-1 | Snowflake Hollow | 9, -17 | Take away along the path | 3×3 | 1 | 8-0 |
| 47 | 8-2 | Snowflake Hollow | 4.5, -31.5 | Take away along the path | 4×4 | 2 | 8-1 |
| 48 | 8-3 | Snowflake Hollow | -4.5, -32 | Take away along the path | 4×4 | 2 | 8-2 |
| 49 | 8-4 | Snowflake Hollow | 4.5, -40 | Take away along the path | 4×4 | 3 | 8-3 |
| 50 | 8-5 | Snowflake Hollow | 8, -56 | Take away along the path | 6×6 | 4 | 8-4 |
| 51 | 8-6 | Snowflake Hollow | -16, -58 | Take away along the path | 6×6 | 4 | 8-5 |
| 52 | 8-7 | Snowflake Hollow | 7, -64 | Take away along the path | 7×7 | 5 | 8-6 |
| 53 | 7-0 | Glasshouse Gardens | -3.6, -8 | Fence: same answers per area (doubles/halves) | 3×3 | 2 | 8-7 |
| 54 | 7-1 | Glasshouse Gardens | 5, -15 | Fence: same answers per area (doubles/halves) | 3×3 | 2 | 7-0 |
| 55 | 7-2 | Glasshouse Gardens | -16, -19 | Fence: same answers per area (doubles/halves) | 4×4 | 3 | 7-1 |
| 56 | 7-3 | Glasshouse Gardens | -4, -29 | Fence: same answers per area (doubles/halves) | 4×4 | 3 | 7-2 |
| 57 | 7-4 | Glasshouse Gardens | 4, -39 | Fence: same answers per area (doubles/halves +) | 4×4 | 4 | 7-3 |
| 58 | 7-5 | Glasshouse Gardens | 16, -50 | Fence: same answers per area (doubles/halves) | 5×5 | 5 | 7-4 |
| 59 | 7-6 | Glasshouse Gardens | -14, -56 | Fence: same answers per area (doubles/halves) | 5×5 | 4 | 7-5 |
| 60 | 7-7 | Glasshouse Gardens | 7, -64 | Fence: same answers per area (doubles/halves +) | 6×6 | 5 | 7-6 |
| 61 | 3-0 | Match Maker Market | -5.8, -12.5 | Fence: same answers per area (+) | 3×3 | 2 | 7-7 |
| 62 | 3-1 | Match Maker Market | -6.4, -27 | Fence: same answers per area (+) | 3×3 | 2 | 3-0 |
| 63 | 3-2 | Match Maker Market | 6.4, -27 | Fence: same answers per area (+) | 4×4 | 3 | 3-1 |
| 64 | 3-3 | Match Maker Market | 14, -37.12 | Fence: same answers per area (+-) | 4×4 | 3 | 3-2 |
| 65 | 3-4 | Match Maker Market | -3.6, -46 | Fence: same answers per area (+-) | 4×4 | 4 | 3-3 |
| 66 | 3-5 | Match Maker Market | 14, -49 | Fence: same answers per area (+-) | 6×6 | 5 | 3-4 |
| 67 | 3-6 | Match Maker Market | -14, -57 | Fence: same answers per area (+-×) | 6×6 | 4 | 3-5 |
| 68 | 3-7 | Match Maker Market | 4, -65 | Fence: same answers per area (+-×) | 7×7 | 5 | 3-6 |
| 69 | 5-0 | Number Bond Beach | -3.6, -8 | Fence: each area sums to target (to 10) | 3×3 | 2 | 3-7 |
| 70 | 5-1 | Number Bond Beach | 6, -15 | Fence: each area sums to target (to 10) | 3×3 | 2 | 5-0 |
| 71 | 5-2 | Number Bond Beach | -16, -21 | Fence: each area sums to target (to 10) | 4×4 | 3 | 5-1 |
| 72 | 5-3 | Number Bond Beach | 5, -27 | Fence: each area sums to target (to 10) | 4×4 | 3 | 5-2 |
| 73 | 5-4 | Number Bond Beach | 23, -34.75 | Fence: each area sums to target (to 20) | 4×4 | 4 | 5-3 |
| 74 | 5-5 | Number Bond Beach | -8, -46 | Fence: each area sums to target (to 20) | 6×6 | 5 | 5-4 |
| 75 | 5-6 | Number Bond Beach | 6, -54 | Fence: each area sums to target (to 100) | 6×6 | 4 | 5-5 |
| 76 | 5-7 | Number Bond Beach | -14, -62 | Fence: each area sums to target (to 100) | 7×7 | 5 | 5-6 |
