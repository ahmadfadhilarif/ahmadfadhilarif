# Phase 1: Design proposal

## The idea in one paragraph

Bend the long strip into a ring. The 9 places and the 9 links between them stay exactly as they are inside, but each one is lifted as a whole, turned and set down on a ring around a new central landmark. The ring is the outer loop path. It's the same path that already runs through every place and link, now closed into a circle. Paths cross the middle of the ring from each place to the centre. The Welcome Garden becomes a walled peninsula on the south coast with one gate onto the ring.

Every place keeps:
- its art, puzzles, pets, sounds and animations;
- its sea, on the outer side of the ring.

## Areas

| # | Area | Mechanic (one rule) | Look | Tall landmark | Puzzles in order | Opener | Finale |
|---|---|---|---|---|---|---|---|
| Start | Welcome Garden | Drawing a line, cable power, stars and clouds | Walled garden by the boat landing | Welcome Gate | start_1 … start_4 | start_1 | start_4 opens the Welcome Gate for good |
| 1 | Place Value Castle | Smallest to biggest | Stone courtyard, royal red | Castle towers and sigil banner | castle_1 … castle_8 | castle_1, castle_2 | castle_8 |
| 2 | Windmill Hill | Counting in steps | Golden farmland | Windmill | windmill_1 … windmill_8 | windmill_1, windmill_2 | windmill_8 |
| 3 | Adding Garden | Adding up | Bright playground garden | Maypole + beacon | adding_1 … adding_8 | adding_1, adding_2 | adding_8 |
| 4 | Times Table Village | One times table | White village houses | Chimneys + beacon | times_1 … times_8 | times_1, times_2 | times_8 |
| 5 | Odd and Even Pond | Fence odd from even | Pond, reeds, blue-green | Beacon over the pond | oddeven_1 … oddeven_8 | oddeven_1, oddeven_2 | oddeven_8 |
| 6 | Snowflake Hollow | Taking away | Snow and ice | Giant igloo, Christmas tree | snow_1 … snow_8 | snow_1, snow_2 | snow_8 |
| 7 | Glasshouse Gardens | Doubles and halves | Glass and flowers | The glasshouse | glass_1 … glass_8 | glass_1, glass_2 | glass_8 |
| 8 | Match Maker Market | Same answers in each area | Market stalls | Hall clock tower | match_1 … match_8 | match_1, match_2 | match_8 |
| 9 | Number Bond Beach | Each area makes the target | Sand and sea | Lighthouse | bonds_1 … bonds_8 | bonds_1, bonds_2 | bonds_8 |

- **Same puzzles, same order:** every area keeps its 8 puzzles in today's order. Puzzle `castle_4` is today's `6-3`, and so on. The puzzles themselves don't change (same seed, same generator).
- **One chain per area:** with 8 puzzles, no area goes over the brief's "more than about 8" line for splitting. Inside an area, puzzle N needs puzzle N−1.
- **Self-contained:** every area teaches its own rule with two 3×3 openers.
  - Match Maker Market and Glasshouse Gardens use plain adding, taking away and times inside their own fence rule. Each panel states its rule.
  - I propose treating plain arithmetic as part of the basics, so nothing moves to an optional spot. No puzzle needs another area.
- **Leftover puzzles:** none. Every puzzle fits its area.

## Progression

- **R1 Start area:** start_1 → start_4 in a chain. start_4 opens the Welcome Gate for good.
- **R2 Area access:** once the Welcome Gate is open, every area's gates are open and its first panel has power.
- **R3 In-area unlocks:** a puzzle only needs the puzzle before it in the same area. The castle drawbridge still comes down after castle_4.
- **R4 Area complete:** the area's finale (puzzle 8) is solved.
- **R5 Area reward:** the area's new **beacon** lights. A beam of light shines from it to the top of the launch tower in the centre, and a matching lamp lights on Launch Hill's wall. The area's **shortcut gate** opens, straight from beside the finale onto the central meadow.
- **R6 Endgame:** at 6 of 9 areas, rounding up 65% of 9, the gate in Launch Hill's wall opens. Press the launch button for the ending: the rocket launch, fireworks and the "You finished" card.
- **R7 Bonus:** at 9 of 9, the lift up the launch tower opens to the **Sky Deck**. It holds 5 new optional challenge panels, marked "advanced", that mix the areas' rules at their hardest. They use the existing generators, so no existing puzzle changes. Solving them ends in a golden beam and a night of fireworks.
- **R8 Persistence:** saved separately and kept when you quit:
  - every solved puzzle
  - every opened door
  - every lit beacon
  - the rocket launch
- **R9 No re-locking:** nothing that opens ever closes again.

## The island

```
                                         N
                          Snowflake    Frosty     Odd and Even
                            Hollow   Pine Path       Pond
                   Kingfisher  .-------------------------.  Sunflower
                     Creek   /    \        |        /     \   Lane
            Glasshouse     /        \      |      /         \     Times Table
             Gardens      |           \    |    /            |      Village
                          |             \  |  /              |
           Lavender ------|------  (  LAUNCH HILL  )  -------|------ Stepping
             Path         |          rocket + tower          |       Stone Brook
                          |             /  |  \              |
           Match Maker    |           /    |    \            |    Adding
             Market        \        /      |      \         /     Garden
                  Otter      \    /        |        \     /      Rose
                  Stream       '--------[Welcome]--------'        Walk
              Number Bond Beach   Tulip    Gate   Place Value   Windmill
                                  Walk     |      Castle        Hill
                                       Welcome Garden          Willow River
                                       boat landing
                                         S
```

### Size and layout

- **Shape:** a ring of 18 pieces (9 areas, 9 links). Each piece turns 20° from the last.
  - inner edge about 130 m from the centre
  - loop path about 170 m from the centre
  - outer coast about 210 m from the centre
- **Size:** about 420 m east–west and 520 m north–south, including the Welcome Garden peninsula. That's a ratio of about 1.25 : 1, against today's 12 : 1.
- **Coast:** bays and headlands between the pieces, where the coast is free to wander.

### Paths

- **Loop path:** the existing path through every area and link, joined into a circle. Each area is entered by its two loop gates, from either neighbour.
- **Spokes:** from every area's entrance, a path runs between the area and its link straight to Launch Hill. There's also one from the Welcome Gate.
- **Ways in:** every area has at least two ways in (both loop gates). Its shortcut gate becomes a third once the area is complete.

### Walking times

At 5 m/s walking speed (Shift runs at 8):

| Route | Time |
|---|---|
| Welcome Gate to the nearest area (castle) | about 8 s |
| Welcome Gate to the farthest area entrance, by the spokes | about 75 s |
| Once round the whole loop | about 3½ min |
| Straight across the island | about 85 s |

No fast travel is needed. The menu's "Visit" buttons stay and work for every area once the Welcome Gate is open.

### Sightlines and movement

- **Sightlines:** the rocket (46 m), its tower (48 m) and the lightning masts (55 m) stand in the middle, 130–210 m from every area entrance. Fog only starts at 90 m, so they show from everywhere. Across the meadow you also see the beacons and landmarks of the areas opposite.
- **Free movement:**
  - Only the coast stops you; there are no invisible walls between areas.
  - Areas are walled on their centre side by their own themed wall, with the shortcut gate in it.
  - Links are open to the meadow.

## Visible feedback

- **Cables:** inside each area, the existing cables show the chain: solved is lit, unsolved is dark. Each area's entry cable lights when the Welcome Gate opens.
- **Entrance markers:** a lantern and an 8-pip board at both loop gates of every area. The lantern is dark when you haven't started, amber in progress and green when complete.
- **Beams:** completed areas send beams to the tower, visible from anywhere, especially at night.
- **The fountain:** Launch Hill's fountain gains one jet per completed area. This is the brief's "the world reacts to progress".

## Data and code (Phases 2 and 5)

- **One data block:** the progression lives in a JSON block inside `index.html`: areas, puzzles, doors and settings. It uses the brief's field names: `openerPuzzleIds`, `finalePuzzleIds`, `completionRule`, `requires`, `unlocks`, `endgameThreshold`, `bonusRequiresAllAreas`. Moving or adding a puzzle is a data edit.
- **One progression manager:**
  - `PROG.puzzleSolved(id)` saves the solve and re-checks what unlocks.
  - It raises `puzzleUnlocked`, `areaCompleted`, `endgameUnlocked` and `bonusUnlocked`.
  - Doors, cables, beacons, markers, the owl's guiding and the menu only listen to those events.
  - Puzzles only report "solved".
- **Save version 8:**
  - It stores solved puzzle ids, opened doors and the rocket.
  - It reads the old `number-grove-v7` list and converts each id (`6-3` → `castle_4`).
  - A save that already reached the end converts to "every area complete".
- **Debug tools:**
  - Console commands under `GAME.debug`: `tp('snow')`, `solve('castle_3')`, `solveArea('beach')`, `reset()`, `state()`, `validate()`.
  - A small debug panel when the page is opened with `?debug`.
- **Validation test:** it fails if any of these are true:
  - a puzzle needs a puzzle in another area
  - a puzzle can't be reached
  - requirements form a loop
  - fewer self-contained areas exist than the threshold
  - an id is duplicated or missing

  It runs in the debug panel and in my automated test before every update.

## How I'll move the places without rewriting them (Phase 3)

Each place and link is built exactly as today, in its own coordinates, then placed on the ring by one rotation and offset. Its pets, animations, colliders and sounds keep working in those coordinates: the game shows each place where it now sits and translates your position into the place's own coordinates. So none of the puzzles, pets or effects need rewriting.

Built new around them:
- the island ground
- the coast and the ocean
- the central meadow and Launch Hill
- the spokes and the gaps between pieces
- the walls on each area's centre side
- the beacons and beams
- the markers and the Sky Deck

The rivers now run from springs at the meadow's edge out to the sea.

## Optimisation (after the restructure)

**Baseline today** (software renderer in my test browser):
- 40 s to load
- about 430 MB of JavaScript memory
- 2,000–2,500 GPU geometries
- 90–140 textures

The new island shows more of the world at once from the centre, so culling has to get smarter. Planned:

- **Culling:**
  - each area and link is culled as a whole when it's behind you or far away
  - small props, pets and panel screens fade out beyond set distances
  - the landmarks and beams stay visible from everywhere
- **Lighter far versions:** far areas show a simplified version of themselves (big shapes only).
- **Cheaper meshes:** more merging and instancing of repeated props, cheaper shadows (fewer casters far away), and smaller textures where they're never seen up close.
- **Less work each frame:** animation jobs for out-of-sight areas sleep or update at a lower rate.
- **Faster loading:** pets of the same kind and pose share one sculpted mesh instead of each being sculpted again. Heavy generation is spread out or cached.
- **Targets:**
  - clearly fewer draw calls and triangles in every view
  - less memory and a shorter load
  - a steady frame rate at High quality on a mid-range laptop
  - no visible loss of detail up close

  I'll report before-and-after numbers.

## New name

**Line & Reason**: a play on "rhyme and reason". You draw lines and reason your way round the island.

Other options: **Isle of Sums**, **Prime Meridian**.

## What I need from you

1. **Approve the design.** Should I then run Phases 2 to 6, the optimisation and the rename straight through? The brief says to stop again after the island blockout and at the end.
2. **Name:** Line & Reason, or one of the others?
3. **Areas' centre side:**
   - **Walled** (recommended): an area wall facing the meadow, with a shortcut gate that opens on completion.
   - **Open woods:** no wall, so no shortcut is needed.
4. **Bonus:** the Sky Deck with 5 new advanced challenge panels? Or a bonus without new puzzles, such as a night fireworks show and a trophy?
