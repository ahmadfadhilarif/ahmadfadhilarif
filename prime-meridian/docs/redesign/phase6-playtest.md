# Phase 6: Playtest report

Every item below was checked in an automated browser run, a headless Chromium with a software GPU, against the
committed build. The checks are: the validation test, a walk over every path, a shortest-path walking-time
calculation, raycast sightlines, save and reload, an old save, and screenshots.

## Acceptance checklist

| # | Item | Result | Notes |
|---|---|---|---|
| 1 | After the start gate opens, every area's first puzzle can be reached without solving anything else | **Pass** | After only the Welcome Garden, every place's entrance and exit gates are open and its first puzzle has power. Its second puzzle stays locked. Walking the loop path, every gap between pieces, the Welcome Gate path and all nine spokes finds nothing in the way. |
| 2 | Leave area A halfway, finish area B, come back: A's progress is still there | **Pass** | Progress is kept per puzzle. Solving another area never changes it. It's saved after every solve and survives a reload. |
| 3 | Any combination of areas reaching the threshold opens the endgame | **Pass** | The threshold is 6 of 9 (65% rounded up). The test completed five areas: launch still closed. Any sixth: the launch gate opens. The rule counts completed areas, not which ones. |
| 4 | Completing all areas unlocks the bonus | **Pass** | Nine of nine opens the Summit Garden gate and powers its first challenge. Its five challenges then run in order. |
| 5 | The central landmark is visible from every area entrance | **Pass** | From just outside both gates of every place, a ray reaches the spire's sphere or the rocket's nose, usually both. Where one was blocked, it was blocked by something right next to the viewpoint (a pine or an arch) or right at the target. Fog starts at 90 m, and the landmarks are 160–190 m away, so they show softened. |
| 6 | Every area has at least two ways in, or one plus a shortcut out | **Pass** | Two loop gates per place, both open after the Welcome Garden, plus a shortcut gate onto the meadow once the place is complete. |
| 7 | Length-to-width ratio about 1.5 : 1 or less | **Pass** | Land measures 412 m east–west by 515 m north–south, 1.25 : 1. It was 12 : 1. |
| 8 | Start gate to any area entrance under about 120 s | **Pass** | Shortest path at walking speed (5 m/s): castle 10 s, beach 17 s, windmill 36 s, Match Maker 44 s, Adding 63 s, Glasshouse 71 s, Times 86 s, Snowflake 89 s, Odd and Even 91 s. Running (Shift) is about 40% faster. The summit path is 39 s from the gate. One lap of the loop is 4.0 min. |
| 9 | Each area entrance shows not started, in progress or complete | **Pass** | A lantern and pip board inside both loop gates, plus one by the shortcut gate. The lantern is dark when not started, amber when under way and green when complete. |
| 10 | Each completed area sends a visible signal to the central landmark | **Pass** | The place's beacon lights and a beam of its colour reaches the Meridian Spire. The spire's sphere glows brighter per beam, and the hilltop fountain gains one jet per finished place. Screenshots at day, dusk and night show all nine beams converging. |
| 11 | Quitting and reloading keeps every solved puzzle and opened door | **Pass** | The save (version 8) holds solved puzzles, opened doors, the rocket and where you stood. A reload restored all of them, with doors opening silently. |
| 12 | A save from the old linear version loads and maps correctly | **Pass** | A `number-grove-v7` save (the Welcome Garden plus the castle's first five) converted to start_1–4 and castle_1–5. The Welcome Gate, ring gates and drawbridge opened, and the beach's first puzzle was powered. A note tells the player their progress was carried over. |
| 13 | The validation test passes | **Pass** | 81 puzzles in 11 areas, 9 self-contained areas (threshold 6). It also runs at load in the `?debug` panel. |
| 14 | Every original puzzle is still in the game and solves exactly as before | **Pass** | All 76 original puzzles are identical to the previous version: grid, numbers, clues and solution. Every one of the 81 puzzles validates against its own solution. |

**What I couldn't check by hand:**
- I couldn't play with a mouse, so real walking feel and timings come from path lengths, not a stopwatch.
- Sounds were checked for errors only, not listened to.
- The test browser renders very slowly, about 1–7 frames a second, so gates and the rocket countdown, which run in game time, take far longer there than in real play.

## Optimisation, after the redesign

Measured in the test browser at the same eight viewpoints:
- the landing beach
- the junction by the Welcome Gate
- inside Place Value Castle
- Snowflake Hollow
- Number Bond Beach
- the hilltop, both looking along the summit and out over the island
- the Summit Garden

Counts include the shadow pass.

| | Before | After |
|---|---|---|
| Triangles per frame | 2.5–8.4 million | 1.4–3.6 million |
| Draw calls per frame | 1,670–2,820 | 880–2,150 |
| Load time (test browser) | about 41 s | about 33 s |
| Page memory after exploring | about 450 MB | under 400 MB |

How:
- **Detail by distance:** simplified copies of the dense pets, animals and sculpted props, and far versions of big merged buildings, swapped in by distance (shadows use them too).
- **Flowers:** three detail levels for tulips, the island's default flower.
- **Plants:** they switch to lighter versions sooner, only the nearest version casts shadows, and they are batched in bigger cells.
- **Shadows:** small props stop casting shadows a short way off.
- **Whole places:** skipped when out of view and not nearby.
- **Memory:** unchanging geometry released from page memory once it's on the graphics card.
- **Pets:** sculpted on a slightly coarser grid, with no visible difference up close.

Up close everything keeps its full detail.

## What changed, phase by phase

- **Phase 2 (progression):**
  - a data block of areas, puzzles and doors
  - one progression manager with events
  - save version 8 with v7 migration
  - the validation test
  - console debug commands
- **Phase 3 (island):**
  - The ten old places and nine links were lifted onto a ring round Meridian Hill. Each piece is still built in its own coordinates and set down by one turn and offset.
  - New world-space coast, ground, sea, hill, paths, spokes and wild planting.
  - The player walks in world coordinates, with collisions per piece.
- **Phase 4 (feedback):**
  - hill-side walls with shortcut gates
  - beacons and beams
  - lanterns
  - the launch enclosure and gate
  - the Meridian Spire and the brass meridian line
  - the Summit Garden with its gate, paths and cables
  - fountain jets
  - river springs
- **Phase 5 (tools):**
  - the `?debug` panel (teleport, solve next, solve area, state, validate, reset)
  - Meridian Hill and the Summit Garden in the menu's places list
  - a final validation run

**Files:** `prime-meridian/index.html` (changed), `prime-meridian/README.md` (rewritten), and `prime-meridian/docs/redesign/*` (new). The folder was renamed from `number-grove`. No files were deleted.

## Final area table

| Area | Mechanic | Puzzles (in order) | Opener | Finale |
|---|---|---|---|---|
| Welcome Garden (start) | Drawing a line, cable power, stars and clouds | start_1 … start_4 | start_1 | start_4 (opens the Welcome Gate) |
| Place Value Castle | Smallest to biggest | castle_1 … castle_8 | castle_1, castle_2 | castle_8 |
| Windmill Hill | Counting in steps | windmill_1 … windmill_8 | windmill_1, windmill_2 | windmill_8 |
| Adding Garden | Adding up | adding_1 … adding_8 | adding_1, adding_2 | adding_8 |
| Times Table Village | One times table | times_1 … times_8 | times_1, times_2 | times_8 |
| Odd and Even Pond | Fence odd from even | oddeven_1 … oddeven_8 | oddeven_1, oddeven_2 | oddeven_8 |
| Snowflake Hollow | Taking away | snow_1 … snow_8 | snow_1, snow_2 | snow_8 |
| Glasshouse Gardens | Doubles and halves | glass_1 … glass_8 | glass_1, glass_2 | glass_8 |
| Match Maker Market | Same answers in each area | match_1 … match_8 | match_1, match_2 | match_8 |
| Number Bond Beach | Each area makes the target | beach_1 … beach_8 | beach_1, beach_2 | beach_8 |
| Summit Garden (bonus) | Advanced challenges, one per rule at its hardest | summit_1 … summit_5 | summit_1 | summit_5 |

- The ending: the launch gate opens at 6 of 9 places. Launching the rocket brings the "You finished" card 5 s after lift-off.
- Old ids map as before: `castle_4` is old `6-3`, `beach_1` is old `5-0`, and so on (the `legacyId` field).

## Final map

```
                                         N
                          Snowflake    Frosty     Odd and Even
                            Hollow   Pine Path       Pond
                   Kingfisher  .-------------------------.  Sunflower
                     Creek   /    \        |        /     \   Lane
            Glasshouse     /        \      |      /         \     Times Table
             Gardens      |           \    |    /            |      Village
                          |      [Summit Garden]             |
           Lavender ------|------  ( MERIDIAN HILL )  -------|------ Stepping
             Path         |        spire · launch pad        |       Stone Brook
                          |           /    |    \            |
           Match Maker    |         /      |      \          |    Adding
             Market        \      /        |        \       /     Garden
                  Otter      \  /          |          \   /      Rose
                  Stream       '--------[Welcome]--------'        Walk
              Number Bond Beach   Tulip    Gate   Place Value   Windmill
                                  Walk     |      Castle        Hill
                                       Welcome Garden          Willow River
                                       boat landing
                                         S
```

- **The ring:** the outer ring is the loop path through every place and link.
- **Spokes:** the lines in the middle are the spokes from each place up to the path round the summit. Each spoke clears its own way through the link's planting.
- **The summit:** the hilltop is about 12 m up, and the hill is about 230 m across, larger than any place. On top:
  - the walled Finish Meadow and launch pad facing south
  - the Meridian Spire on the island's middle line
  - the walled Summit Garden to the north

## Adding a puzzle or an area

Puzzles have two halves: what the puzzle *is* (generator settings and where it stands), and how it *fits* (its progression entry).

1. **The puzzle itself.**
   - In `ROOMS` (search for `const ROOMS=[`), add a generator entry to the place's `panels` list.
   - Add its standing spot to `spots`: x and z in the place's own coordinates, then a facing.
   - For the Summit Garden, use `SUMMIT`.
   - Puzzles are seeded by place and position, so existing ones never change. Append new ones at the end of a list.
2. **How it fits.** In the `pm-progression` data block at the top of the page, add a puzzle entry:

   ```json
   {"id":"castle_9","areaId":"castle","legacyId":"6-8","requires":{"all":["castle_8"]},"optional":false,"advanced":false,"unlocks":[]}
   ```

   - `legacyId` is `"<the place's number>-<its index in panels>"`.
   - `requires` can use `all` or `any`, but only with puzzles from the same area.
   - To make it the new finale, also update the area's `finalePuzzleIds`.
3. **A door it opens.**
   - Add the door to `doors`, with `opensWhen` set to `{puzzle}`, `{area}`, `{endgame}` or `{bonus}`.
   - List the door in the puzzle's `unlocks`.
   - Give it an action in `DOOR_ACT`.
4. **A new area.**
   - Add an area entry with `openerPuzzleIds`, `finalePuzzleIds` and `completionRule`.
   - Add its puzzles.
   - Add a place to `ROOMS` with a builder.
   - The ring adds a piece for every place automatically. Beacons, walls, lanterns and spokes are built per place.
5. **Check it.** Open the game with `?debug` and press Validate, or run `GAME.debug.validate()` in the console.

## Testing it yourself

Open `index.html?debug` for the debug panel. In the console:

| Command | What it does |
|---|---|
| `GAME.debug.tp('snow')` | Teleport to an area (`'hill'` for the hilltop) |
| `GAME.debug.solve('castle_3')` | Solve one puzzle |
| `GAME.debug.solveArea('beach')` | Solve a whole area |
| `GAME.debug.state()` | Print the progression state |
| `GAME.debug.validate()` | Run the validation test |
| `GAME.debug.reset()` | Reset all progress |
