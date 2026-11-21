# Prime Meridian

A 3D walking maths puzzle game for the browser, set on a round island. You land by boat on the south coast and solve the four teaching panels of the Welcome Garden. Its gate then opens onto a ring of nine places around Meridian Hill, and from there you can play them in any order.

Each place teaches one rule with 8 line-drawing panels, from very easy to hard. If one place is too tricky, walk to another; your progress in each is kept.

| Place | Rule |
|---|---|
| Welcome Garden (start) | Drawing a line, cable power, stars and clouds (no maths) |
| Place Value Castle | Ordering numbers |
| Windmill Hill | Counting in steps |
| Adding Garden | Adding up |
| Times Table Village | Times tables |
| Odd and Even Pond | Odd and even numbers |
| Snowflake Hollow | Taking away |
| Glasshouse Gardens | Doubles and halves |
| Match Maker Market | Adding, taking away, times |
| Number Bond Beach | Number bonds |
| Summit Garden (bonus) | Five advanced challenges, one rule at its hardest each |

## How it fits together

- **Gates:** each place has two gates on the loop path that runs round the island. A spoke path leads from each place up Meridian Hill.
- **Lanterns:** a lantern by each gate shows dark (not started), amber (under way) or green (complete).
- **Finishing a place:** its beacon lights and shines a beam of its colour to the Meridian Spire on the hilltop. A shortcut gate in its hill-side wall also opens onto the meadow.
- **Six finished places** open the launch pad on top of the hill. Press the button, watch the rocket go, and the "You finished" card follows 5 seconds after lift-off.
- **All nine** open the Summit Garden behind the spire, on the island's middle line (the prime meridian, marked in brass).

The island is full of life:
- fish in the rivers and ponds, kingfishers with their chicks, seagulls, and a polar bear cub and its friend
- a fisherman, farmers, beekeepers, market sellers, a mayor, a king, a princess and her maid, an archer and a lifeguard
- ice skaters and a snowball fight
- a jetski and skimboarders at the beach, and two snack kiosks with picnic tables

Pets with a free paw wave when you come up to them. One day on the island lasts one real hour, with sunrise, sunset, a starry night and moonlight.

## Play

Open `index.html` in a modern browser. It is a single self-contained file that loads three.js (r128) from cdnjs and fonts from Google Fonts, so it needs an internet connection.

Progress is saved in the browser (localStorage, save version 8). A save from Number Grove, the game's earlier, linear version, is carried over automatically.

## Controls

- **Walk:** W A S D (Shift to run), or left thumb on a tablet
- **Look:** mouse or arrow keys, or drag on a tablet
- **Solve:** click a panel, click to start the line at the big circle, trace, click at the rounded end
- **Solve current:** the button in the corner solves the next panel with power for you
- **Step back:** Esc, right-click, or the Step back button
- **Sit:** look at a bench or a picnic-table seat and press E or click
- **Menu:** M or the Menu button. Places lets you visit any open place, Meridian Hill or the Summit Garden.

## Quality

Ultra, High and Low quality levels trade post-processing and shadow detail for speed. The game also:
- lowers its resolution a little when the frame rate drops, and raises it again when there is room
- swaps in lighter versions of animals, props, buildings and plants when they are far away
- skips places that are out of view

## For developers

- **Progression data:** areas, puzzles, what each needs and what it opens, and doors all live in the `pm-progression` data block at the top of `index.html`.
- **Debug tools:** open `index.html?debug` for a debug panel. In the console, `GAME.debug` has `tp`, `solve`, `solveArea`, `state`, `validate` and `reset`.
- **Design and test notes:** [docs/redesign](docs/redesign):
  - the audit
  - the design
  - the playtest report, with the final area table and map, and how to add a puzzle or area
