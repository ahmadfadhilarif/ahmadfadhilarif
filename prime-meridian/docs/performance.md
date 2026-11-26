# Performance audit and fixes

The goal: run as efficiently as a well-optimised Unity or Unreal game, without rewriting the engine (three.js r128) or changing how the game looks.

## The overlay

To show the overlay:
- press **F3** or **`**
- or click the fps counter
- or open `index.html?perf` (`?debug` shows it too)

Every half second it shows:

| Line | What it means |
|---|---|
| `62 fps  16.1 ms/frame` | Frames per second, and the average time between frames. |
| `CPU 3.2 ms  GPU 7.9 ms` | CPU time to prepare a frame (game logic plus three.js), and GPU time to draw it. GPU time uses `EXT_disjoint_timer_query_webgl2` where the browser offers it. Most browsers hide that timer for privacy, so the overlay then estimates it instead (`GPU ≈ 7.9 ms (est.)`): every 20th frame it waits for the GPU to finish and times the wait. |
| `GPU: NVIDIA GeForce RTX 3060` | Which GPU is drawing the game, from `WEBGL_debug_renderer_info`. If it's a software renderer (SwiftShader, llvmpipe, Microsoft Basic Render and similar), the line turns red and reads `NO GPU: … (software)`. A message also tells you to turn on hardware acceleration in the browser. |
| `1.4 k draw calls (85 shadow)` | Draw calls per frame, summed over every render pass: the shadow map, the world and post-processing. The shadow pass's share is in brackets. |
| `2.71 M triangles` | Triangles per frame, over all passes. |
| `1920×1080 · 1.00x · Ultra` | Render resolution, pixel ratio and quality level. |
| `screen 144 Hz · drawing every 2nd refresh` | The measured refresh rate, and what the frame limiter is doing. |

"GPU n/a" never meant the CPU was drawing the game. WebGL always draws on the GPU unless the browser has fallen back to software rendering, and the GPU line shows which case you're in.

The counts are correct across passes because `renderer.info.autoReset` is off. The overlay resets the counters once per frame, not once per `render()` call.

## Baseline

Ultra (the desktop default), 1280×720, pixel ratio 1. Counts are per frame, summed over all passes.

| Spot | Draw calls | Shadow draws | Triangles |
|---|---|---|---|
| Welcome Garden | 2,122 | 169 | 3.11 M |
| Castle courtyard | 1,089 | 309 | 2.46 M |
| Times village | 1,579 | 756 | 2.90 M |

The scene had:
- 14,087 objects and 12,271 meshes
- 2,517 materials, of which 1,632 were exact duplicates
- 62 shader programs

About 0.5–1 MB of garbage was made per frame.

From the Welcome Garden, the main pass drew:

| What | Draws | Triangles |
|---|---|---|
| Single unmerged meshes | 1,059 | 0.40 M |
| Merged static meshes | 370 | 0.35 M |
| Instanced plant chunks | 361 | 1.48 M |
| Everything else | about 150 | about 0.25 M |

## Ranked problems, biggest first

1. **No frame cap.** `requestAnimationFrame` runs at the screen's refresh rate. It's vsynced, so there's no tearing, but a 120, 144 or 240 Hz monitor drew 2–4× as many frames as a 60 Hz one, and every cost below was multiplied by that.
2. **Resolution higher than needed, plus wasted MSAA.**
   - Pixel ratio went up to 2.0, which is 4× the pixels on high-DPI screens, feeding a full-resolution half-float HDR pipeline.
   - The canvas was created with 4× MSAA, but the final image is a fullscreen FXAA pass, so the multisampled buffer was resolved every frame for nothing. At 2880×1800 that's about 170 MB.
3. **Shadow map redrawn every frame.** One sun light, 4096² PCF-soft on Ultra: 170–760 extra draws and 0.6–1.0 M triangles per frame. The sun moves about 1° every 10 s and most casters never move.
4. **Draw calls with no instancing, merging or distance culling.**
   - The laser towers (about 30 parts each), lanterns (about 9 parts each), world path ribbons, gate leaves (the castle portcullis alone was 118 meshes) and the rocket were drawn part by part.
   - The world-level ones were missing from distance culling.
   - Duplicate materials split static merging into more meshes than needed.
5. **Per-frame garbage**, causing GC hitches:
   - `gates.concat()` every frame
   - `Math.hypot` in culling loops
   - array destructuring in particle loops
   - the sky re-bake allocating 4 MB every 15 s
6. **Per-frame work that could run only on change:**
   - a raycast against all 86 puzzle panels every frame
   - six DOM lookups every frame
   - chimney smoke and fountain spray animated and re-uploaded every frame, even far out of sight
7. **Post-processing** was already at sensible sizes: AO and bloom at ½ resolution, sun rays and depth of field at ¼, and composite and FXAA at full resolution as they need to be. Its real cost was resolution, which #2 fixes.
8. **Frustum culling and LOD** existed: per piece and per object, plant LOD, mesh LOD and distance culling. The only gap was the world-level objects in #4.

Not problems:
- **Shader programs:** 62 is fine.
- **Puzzle logic:** only runs on input.

Not changed, to keep the look:
- plant triangle counts
- shadow-map size and softness
- post-processing quality

## Fixes

### 1. Frame rate limit

The refresh rate is measured from the median of 40 frame intervals. On fast screens the game then draws on every 2nd, 3rd or 4th refresh:

| Screen | Frame rate |
|---|---|
| 60–100 Hz | unchanged |
| 120 Hz | 60 |
| 144 Hz | 72 |
| 165 Hz | 82 |
| 240 Hz | 60 |

Frames stay evenly spaced. When the game can't keep up, nothing is skipped. To turn it off: Settings → Limit frame rate.

**Expect:** the overlay's fps drops to 60–82 on fast screens and its last line says which refresh it draws on. CPU and GPU ms per frame are unchanged, but work per second halves, or quarters at 240 Hz.

### 2. Resolution and anti-aliasing

- Pixel ratio is capped at 1.5, down from 2.0.
- The canvas is created without MSAA wherever the post-processing chain can run (WebGL 2 with float buffers).
- Low quality, which used the MSAA canvas, now draws into an 8-bit buffer encoded exactly like the screen, followed by the same FXAA pass. It looks the same as before.
- Effect buffers exist only while effects are on.

**Expect:** on a 2× screen the resolution line drops from e.g. 2880×1800 to 2160×1350 at 1.50x, which is 44% fewer pixels in every full-screen pass. GPU ms falls by roughly a third there. On 1× screens only the MSAA saving applies.

### 3. Shadow map every other frame

`shadowMap.autoUpdate` is off. The map is redrawn on alternate frames, or at once after a teleport. The shadow camera follows you in steps of exactly one shadow-map texel, so the reused map lines up. This also stops shadow edges crawling as you walk.

**Expect:** the shadow figure in brackets halves, and GPU ms falls by about 10–20% on Ultra.

### 4. Fewer draw calls

| What | Change | Draws |
|---|---|---|
| Laser towers | Fixed parts merged per material. All lamp rings are one mesh, with the climbing pulse worked out in the shader from a per-vertex ring height. The beam's three layers are one mesh. Small parts at the foot are left out beyond about 80 m. | About 26 → 9 per tower |
| Lanterns | Iron parts merged. Left out beyond about 85 m. | 7 → 3 |
| World path ribbons, joins and spokes | One mesh per colour. | 38 → 3 |
| Gate leaves (every gate and shortcut gate) | Merged per material, since each leaf moves as one piece. | Castle portcullis 118 → 2 |
| Rocket and launch arm | Merged per material. | 99 → about 10 |
| Static merging | Groups identical-looking plain materials together, so duplicates no longer split merges. Anything whose colour, glow or opacity changes in play keeps its own material. | Merged buckets 1,327 → 1,057 |

### 5. Less garbage

- The gate list is made once, not every frame.
- `Math.sqrt` replaces `Math.hypot` in the LOD loop.
- Particle loops index arrays instead of destructuring them.
- The wall helper makes no arrays.
- The sky re-bake works out its 24,576 texel directions once and reuses its pixel buffers.

### 6. Per-frame work only when needed

- The aim raycast only tests panels within 6 m.
- The frame loop's page elements are looked up once.
- Chimney smoke and fountain spray stop animating and re-uploading when more than 90–120 m away, where they're already hidden.

## Results

Same spots and settings as the baseline. Headless at pixel ratio 1, so fixes 1 and 2 don't show here.

| Spot | Draw calls | Shadow draws | Triangles |
|---|---|---|---|
| Welcome Garden | 2,122 → **1,494** (−30%) | 169 → **85** | 3.11 M → **2.78 M** |
| Castle courtyard | 1,089 → **815** (−25%) | 309 → **122** | 2.46 M → **2.00 M** |
| Times village | 1,579 → **1,081** (−32%) | 756 → **334** | 2.90 M → **2.42 M** |

- Scene objects: 14,087 → 12,706.
- Materials: 2,517 → 2,227.
- Garbage at the Welcome Garden: about 1.2 MB → **38 KB** per frame (heap growth between collections). What remains is mostly three.js's own per-frame bookkeeping.
- Average shadow-pass time in the test browser: 5.6 → 1.7 ms per frame.
- On real hardware, add the frame cap (half the work per second on 120–144 Hz screens) and the resolution cap (44% fewer pixels on 2× screens).

Screenshots before and after match at Low, High and Ultra. The remaining differences are animation: butterflies, pets and clouds.

## After the hill rework

The caves, the nine laser receivers, the themed towers and the lift add very little:
- **Towers and receivers:** their parts are merged per material, and their plain-coloured parts share one vertex-coloured mesh.
- **Cave mouths:** their decorations are left out beyond about 120 m, like other small things.
- **Cavern:** everything in it is drawn only when you're near or below the hill.

| Spot | Draw calls | Shadow draws | Triangles |
|---|---|---|---|
| Welcome Garden | 1,494 → **1,589** | 85 → **87** | 2.78 M → **2.86 M** |
| Castle courtyard | 815 → **824** | 122 → **124** | 2.00 M → **2.06 M** |
| Times village | 1,081 → **1,082** | 334 → **341** | 2.42 M → **2.46 M** |

The next batch added moving parts to four laser towers, a house round the Times Table Village tower, and paving to close narrow gaps between paths. Draw calls rose to **1,609** at the Welcome Garden, **838** in the castle courtyard and **1,112** in the Times village, 1–3% more. The gap filling adds about half a second to loading.

## Measuring it yourself

Open `index.html?perf` and walk to the Welcome Garden, the castle courtyard and the Times village. On a desktop GPU, compare fps, GPU ms and draw calls with the tables above. Then turn Settings → Limit frame rate off to see the uncapped figures on a fast screen.
