# Number Grove

A 3D walking maths puzzle game for the browser, set on a remote island. You land on a jetty at the island's north tip and walk south through ten places, each with line-drawing puzzle panels that get harder as you go. Solving a place's last panel opens its exit gate; halfway along the walk to the next place, that place's own themed gate opens.

Places are met in order of difficulty, easiest first:

| # | Place | Topic |
|---|---|---|
| 1 | Welcome Garden | Getting started: drawing a line, cable power, stars and clouds (no maths) |
| 2 | Place Value Castle | Ordering numbers |
| 3 | Windmill Hill | Counting in steps |
| 4 | Adding Garden | Adding up |
| 5 | Times Table Village | Times tables |
| 6 | Odd and Even Pond | Odd and even numbers |
| 7 | Snowflake Hollow | Taking away |
| 8 | Glasshouse Gardens | Doubles and halves |
| 9 | Match Maker Market | Adding, taking away, times |
| 10 | Number Bond Beach | Number bonds |

The Welcome Garden has 4 panels and every other place has 8: 76 puzzles in all. At the end, Finish Meadow has a rocket that launches behind the fountain.

One day on the island lasts one real hour, with sunrise, sunset, a starry night and moonlight. Everything stays easy to see at night.

## Play

Open `index.html` in a modern browser. It is a single self-contained file; it loads three.js (r128) from cdnjs and fonts from Google Fonts, so it needs an internet connection. Progress is saved in the browser (localStorage).

## Controls

- **Walk:** W A S D (Shift to run), or left thumb on a tablet
- **Look:** mouse or arrow keys, or drag on a tablet
- **Solve:** click a panel, click to start the line at the big circle, trace, click at the rounded end
- **Solve current:** the button in the corner solves the next unsolved panel for you
- **Step back:** Esc, right-click, or the Step back button
- **Sit:** look at a bench and press E or click
- **Menu:** M or the Menu button

## Quality

Ultra, High and Low quality levels trade post-processing and shadow detail for speed. The game also lowers its resolution a little when the frame rate drops, and raises it again when there is room.
