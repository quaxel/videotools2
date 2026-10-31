# Component library

Everything a scene imports comes from `src/engine` (`import { ... } from "../../engine"`). A complete worked
example is `src/videos/slot-machines/Scene.tsx`; copy its structure.

## Scene file contract (`src/videos/<slug>/Scene.tsx`)

```tsx
import TIMING_JSON from "./timing.json";
const TIMING = TIMING_JSON as Timing;
export const SLUG = "<slug>";
export const timing = TIMING;
const SHOTS: Shot[] = [ [from, to, ShotComponent, dissolveIn], ... ]; // final frames, contiguous, first from 0, last to TIMING.totalFrames
const SFX: Sfx[] = [...];
const MUSIC: MusicCue[] = [...];
export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
```

- Write each SHOTS entry on one line as `[123, 456, Name, false]` (numbers or `TIMING.totalFrames`); `pipeline.py check` parses it.
- **Seamless loop** (Shorts replay): end the video on the opening shot just before its frame 0. Write the first shot
  as a factory over a clock offset (`const shotAt = (offset) => () => { const f = useShotFrame() + offset; ... }`),
  use `shotAt(0)` first and `shotAt(-N)` as the last N frames (whip `true` from the shot before), with `energy={0}`
  in it so the hand-held drift matches, and repeat its sound under the last N frames. Example: `src/videos/olympic-car`.
- Cut points come from `timing.json` → `lines[i].from / to` and `captions[k].from`.
- Inside a shot: `const f = useShotFrame();` (0 at the cut; negative while the shot whips in). `useFinalFrame()` gives the video frame.
- Mouth sync is automatic: a puppet in a `Stage` whose `id` equals a speaker in `lines.json` opens its mouth from the voice (`timing.json` → `mouth`) while that speaker talks, over any authored `mouthOpen`. So give the talking puppet the speaker's name as its id. `voice` writes the tracks; `voice_assemble.py <slug> --mouth` adds them to an older video.
- Acting is automatic too: a talking puppet makes a beat gesture (nod, arm or lean) on stressed syllables; every puppet breathes, blinks at its own rhythm and glances to a spot and holds there. Author big actions in the pose; leave the small life to `Stage`.
- Impacts shake the camera automatically: a `boom`, `reel-stop` or `stamp` cue in the effect list gives a short jolt and punch-in, scaled by its volume. For the prop that takes the hit, spread `squash(f, hitFrame, 0.25)` into its group `scale` (squashes, springs back, settles).

## Engine

| Export | Use |
| --- | --- |
| `Stage({ set, camera, bg, puppets?, blur?, truth?, flash?, energy?, light? })` | Renders a 3D set + puppets. `blur` softens the set only. `truth` 0..1 cold-blue grade, `flash` 0..1 white-out. `energy` (default 1) adds camera push/drift and idle acting on top of the authored shot; 0 = exactly as written. `light` = how the set's lights fall on the puppets (see Puppet lighting); default: a rig derived from the mood of `bg`. |
| `keepHeads` (Stage, default on) | No half heads, ever: every frame Stage checks each puppet's head; one cut by a frame edge makes the camera pan just enough to bring it in, then widen (≤ 25 %), then step back (≤ 3×); if heads still cannot all fit, the outer ones are panned wholly out. Heads wholly off-screen, back-view (over-the-shoulder) puppets and placements with `crop: true` are left alone. So frame shots loosely and let it settle; for a macro on an object, leave the people out of `puppets` rather than half in. Solved frame by frame it would jump, so `pipeline.py framing` (run automatically by `stills`, `motion` and `render` when the scene changed) renders a tiny pass, logs the correction per frame, holds it ±24 frames and eases it per shot into `public/videos/<slug>/framing.json`, which the render applies: the camera starts drifting before a head reaches the edge instead of snapping. (`engine/framing.ts`, `scripts/framing.mjs`) |
| `CameraShot = { position, target, fov }` | Every set must receive the camera and contain `<CameraRig>` (the kit's `Room` does this). |
| `lerp3, ramp, clamp01, breathe, talk, walk` | Animation helpers. `ramp(f, a, b)` 0→1 between frames a and b. `...walk(f)` inside a pose while walking. |
| `Easing, interpolate` | From `remotion`. |
| `FADE` | Location-change transition length (8 frames): the old shot whips out left, the new one in from the right. |
| `sfx("stamp")`, `MUSIC_FILES.lounge / .mystery / .upbeat / .tension` | Sound file paths. |

## New locations: research references first

Before building a new set, look at 3-5 real references (photos on Wikimedia Commons, a travel or stock page) in the
browser and write `guide/references/<set>.md`: the sources, 5-10 concrete details that make the place read as itself
(objects, materials, signage, how things hang), its palette, and which of its lights are strong enough to light the
puppets. Build from those notes in the kit's cel style: never copy an image, download nothing into the project, and
leave out brand names and logos. Pick the 3-4 details that read in a narrow 9:16 frame.

## Set kit (`src/three/kit.tsx`, also exported from the engine)

- `Room({ camera, mood, floor, wall, width?, depth?, sideWalls?, stripe?, wallPattern?, floorPattern?, sun?, children })` — floor, back wall at
  z = -depth/2, a shadow-casting key light, contact shadow where wall meets floor, camera rig.
  `wallPattern`: plaster (default), brick, panel, wallpaper, tile, plain. `floorPattern`: wood (default), tile, carpet, concrete, plain.
  `sun: { x, color?, bars? }` lays window light (soft bars) on the floor and wall. Give every location its own pattern pair.
- `LightPool`, `Halo({ position, size, color })` — extra window light and additive glow (screens and lamps already have halos).
  Moods: `warm`, `daylight`, `cold`, `dream`, `night`, `neon`, `golden`, `office`, `alarm`, `dusk`; `moodBackground(mood)` gives the Stage `bg`.
- Props (positions in metres, y = 0 floor): `Door({position, open, sign, glow})`, `Window`, `Desk`, `Counter`, `Chair`, `Shelf`,
  `Lamp`, `Plant`, `Crates`, `Board({cards})` corkboard, `Screen({text, appear?, count?})` (glowing text; `appear`/`count` as on Label, for a figure that comes up on a monitor), `BigButton({label, press})`, `Switch({label, on})`,
  `Label({text, position, width, appear?, count?})` readable UPPERCASE card (use "\n" for two lines). `appear` = frames since it came on: pops in past full size with a white flash (pass `f - at` from the shot; negative hides it). `count` 0..1 counts its numbers up from zero (`countText(text, p)` does the same for any string). Add a `pop` sound on the frame it appears. Never count years or IDs (1982, FLIGHT 214).
- Lower-level: `InkBox`, `InkCylinder` (cel-shaded with ink outline), `toonRamp`, `canvasTexture(w, h, draw)`.
- `ZodiacBadge({sign, position, size?, bg?, fg?, appear?})` round emblem with the sign's glyph (aries ... pisces). Zodiac videos
  show it in the hook, next to the sign's name.
- `pipeline.py collide` flags a standing puppet whose body is inside a set mesh. Wrap smoke, held props and effects that may
  overlap a character in `<group userData={{ ghost: true }}>` so they are not counted.
- Write a new prop as a small component in `src/videos/<slug>/props.tsx` from these pieces; move it to the kit if it is reusable.

Existing themed sets (slot-machines video): `CasinoSet`, `SlotMachine`, `InteriorStrip`, `XrayWheel`, `AtmSet`, `ExteriorSet`, `LabSet`.

### Outdoor set, fire, smoke and distant mountains (`src/three/LakeSet.tsx`)

- `LakeSet({ camera, frame, fire? })` — mountain lake at dusk (mood `dusk`): grass bank (floor y = 0, z > -1.5), water
  below it, cabin with chimney smoke at x -2.6, dock into the lake at `DOCK.x` (deck y = 0, so puppets can stand on it,
  to z `DOCK.end`), campfire at `FIRE`, pines, fireflies. Light its puppets with `light={lakeLight(f)}`.
  Example shots: `src/scenes/LakePreview.tsx` (composition `LakePreview`).
- `Campfire({ position, frame })` — cartoon fire: layered licking flame tongues under one ink outline, licks that break
  off and burn out, sparks, an ember bed, a light pool on the ground and a flickering point light. `smoke={false}` drops the dark smoke (a fire under a pot or kettle,
  where the smoke would show through the pot). When puppets stand by
  it, add `firePoint(position, frame)` to the Stage `light`'s `points` so the side facing it glows and flickers with it.
- `SmokePlume({ position, world, frame, size, rise, wind, period, puffs, dark? })` — inked cel smoke puffs that swell,
  drift downwind on a curve, turn and shrink away; `world` is the source's [x, z] (the puffs face the camera). Chimney:
  size 0.13, rise 1.9, wind 0.75, period 72, puffs 7. Over a fire: size 0.045, rise 0.75, `dark`.
- `Pine`, `Rock` — faceted inked pine (cone stack) and rock.
- **Distant mountains with parallax:** `Ridge({ z, shift, width, low, high, peaks, color, seed, snow? })` flat ridge
  silhouettes and `Haze({ z, color })` mist bands between them. Real perspective barely moves anything 15-20 m away, so
  each layer is carried sideways by its own share of the camera's x: sky and sun group at `camX`, far ridge
  `shift={camX * 0.55}`, middle ridge 0, near hills `shift={-camX * 1.1}` (camX = `camera.position[0]`). Give shots in
  front of a backdrop a sideways truck (0.8-1.4 m) so the layers slide apart.

### Moon base (`src/three/SpaceBaseSet.tsx`)

- `SpaceBaseSet({ camera, frame })` — control deck (mood `space`, floor y = 0, back wall z = -3) with a panoramic
  window (x ±1.4) onto craters, a rover, a turning dish, a rocket venting steam, habitat domes, grey ridges, a ringed
  planet and Earth (all with parallax). Inside: hologram table at `HOLO` (puppets at x ±0.62 round it), airlock with
  a rotating red beacon at `AIRLOCK.x`, console, radar and an O2 screen on the left. Light puppets with
  `light={spaceLight(f)}` (hologram cyan, beacon red flash as the beam passes, cool rim from the window).
  Example shots: `src/scenes/SpacePreview.tsx` (composition `SpacePreview`); a shot close to a puppet at the window
  uses `energy={0.4}` so the hand-held drift does not swing it out of frame.

### Rainy night alley with a ramen stall (`src/three/AlleySet.tsx`)

Built from photo references: `guide/references/rainy-alley.md`.
- `AlleySet({ camera, frame, car? })` — narrow alley (x ±1.3, floor y = 0) running away along -z: izakaya fronts with
  noren, warm interiors, red chochin and vertical signboards on the left; a plain wall with a row of paper lanterns,
  a red pipe, a fern, AC units and a blue net on the right; overhead cables and a utility pole; neon buildings across
  a wet street at the end; rain streaks, puddle ripples and every light mirrored on the wet ground.
- The ramen stall (yatai) at `STALL`: customers sit at `SEATS` (`sit: true, view: "side", facing: 1`), the cook stands
  at `COOK` (`view: "side", facing: -1`). `car` 0..1 drives a small car down the lane at `CAR_X` with its headlights on
  (`carZ(p)` = its nose).
- Light puppets with `light={alleyLight(f, car)}` (the stall's tube, its red lantern, or the car's headlights).
  Example shots: `src/scenes/AlleyPreview.tsx` (composition `AlleyPreview`).

### The Great Wall at golden hour (`src/three/GreatWallSet.tsx`)

Built from photo references: `guide/references/great-wall.md`.
- `GreatWallSet({ camera, frame })` — the walkway (x ±`WALL.half`, floor y = 0) runs along -z between a crenellated
  outer parapet (left, merlons with loopholes) and a low inner parapet (right); at z = `WALL.stairs` it bends right and
  climbs in steps to a brick watchtower with an arched doorway and a tiled pavilion. Green slopes with shrubs drop away
  on both sides; beyond, ranges fade into haze with the wall snaking along every crest and a tower on each peak
  (parallax shares of the camera's x). Swallows cross the valley.
- Puppets walk on the flat part (z between `WALL.stairs` and 4.5); walk them toward the camera with `stroll`. For the
  view, put the camera high enough to see over the outer parapet (y ≈ 1.8) and look out to the left.
- Light puppets with `light={wallLight()}` (low golden sun behind-right: warm side light and rim).
  Example shots: `src/scenes/GreatWallPreview.tsx` (composition `GreatWallPreview`).

### Kentucky farmyard, clear spring day, 1870s (`src/three/FarmyardSet.tsx`)

Built from photo references: `guide/references/kentucky-farmyard-1876.md`. Used by `src/videos/meat-shower`.
- `FarmyardSet({ camera, frame, steam?, children })` — grass yard (floor y = 0) with a trodden dirt patch, a hewn-log
  house with chinking, shingle roof and stone chimney (front wall z = `HOUSE.front`), worm (zigzag rail) fences left,
  back and right (`WormFence({ a, b })`), a woodpile, an ash hopper at `HOPPER` and the black soap kettle on legs over a
  small fire at `KETTLE` (lip at `KETTLE_RIM`; `steam={false}` for a shot looking into the brew). Beyond: pasture,
  bare trees and cedars, flat-topped knobs (`Hills`) with parallax. Children are drawn in the set (props, effects).
- The ground is a 1024 px painted grass texture, a large-scale patch overlay so the tiling never shows, and ~2,600
  instanced grass tufts (kept off the dirt and a clear spot for grass macros). Do the same for any new outdoor floor:
  a flat tiled colour reads as plastic, especially in low and macro shots.
- The sky is a dome that rides with the camera (painted bands from deep blue overhead to a pale horizon, a sun
  glow in the key light's direction). Use a dome for any set with sky shots: sky planes show edges and flat colour
  when the camera looks up. Keep the sun behind the camera's usual direction so look-up shots stay deep blue.
- Light puppets with `farmLight(f)`, or `farmLight(f, true)` next to the kettle fire.

### Birds, on-screen headlines

- `Vultures({ frame, centre, radius?, count?, size?, fade? })` (`src/three/Birds.tsx`) — 3D inked turkey vultures
  circling a thermal: V-held wings with fingered tips and a silver trailing half, red head, banking and teetering,
  an occasional slow flap. `fade` 1→0 lifts them away and out of sight. Use real 3D birds, never flat sprites, and
  put them close enough (10-20 m) to read in a 9:16 frame; track them with the camera.
- `Headline({ f, text, at?, out?, y?, size? })` (`src/ui/Headline.tsx`, HTML over the shot) — a short title in heavy
  newspaper type on a cream strip, high in the frame above the captions; drops in at `at`, fades at `out`. To keep
  one headline across several shots, render it in each with `at` = minus the shot's offset (no re-pop). Use it for
  the hook question and short on-screen facts ("NO CLOUDS. NO STORM."), at most 6 words.

## Puppets

`PuppetPlacement = { id, look, pose, at: [x, z] }` — feet on the floor at (x, z); always faces the camera.
Height 1.3 m (`PUPPET_HEIGHT`), head centre `HEAD_Y` ≈ 0.98 m, seat height `HIP_HEIGHT` ≈ 0.34 m.

- `PuppetLook`: `skin, hair, outfit, pattern?` (leaf print colour), `lanyard?`, `cap?`, `chain?`, `glasses?`, `long?` (long hair to the shoulders; use it for women).
  Period dress (each a colour unless noted): `skirt?: true` (ankle-length, in the outfit colour), `apron?`, `kerchief?`,
  `hat?` (wide-brimmed, low crown; hair is clipped under the brim), `beard?`, `vest?`, `suspenders?`. Never use `cap`
  (a backwards baseball cap) for anyone before the 20th century. `CostumePreview` shows them in all three views.
- `PuppetPose`:
  - `expression`: `neutral | excited | skeptical | smug | shocked | angry | sad | confused | worried | awkward | happy | thinking | disgusted | bored | determined` (each has its own eyelids, brows and mouth; neutral is a gentle smile; confused shows a "?", worried and awkward a sweat drop, awkward and happy blush, disgusted squeezes the eyes shut with the tongue out); `blink`, `lookX` (-1..1), `headTilt` (deg), `mouthOpen` (0..1)
  - Micro-expressions are automatic: in a `Stage` every held face keeps moving a little (brow flicks, lid droop, lip twitch, mouth width, searching eyes), tuned per expression in `engine/liven.ts`. `face` (`FaceMicro`) adds your own offsets on top; `energy: 0` turns it off. Preview all faces with the `FacePreview` composition.
  - Expression changes ease instead of popping: spread `faceChange([[0, "neutral"], [40, "shocked"], ...], f)` into the pose (it sets `expression`, `from`, `blend`). Brows, lids and pupils glide, the old mouth closes and the new one opens over ~10 frames. `FaceTour` shows one puppet going through every expression this way.
  - Body language is automatic too: a pose that sets no arms takes its expression's posture from `puppet/gestures.ts` (`POSTURE`: sad slumps, smug puts hands on hips, skeptical crosses arms, thinking holds the chin…), easing between postures during a `faceChange`. Poses that author arms keep them and only borrow the posture's `slump` / `lean`.
  - `gesture`: `wave | point | shrug | armsCrossed | handsOnHips | chin | scratchHead | facepalm | cheer | clap` — a ready-made, animated body pose (the wave swings, the clap claps, the cheer pumps). Fields you set in the pose win over the gesture. `GestureTour` previews them all. To change gesture or body mid-shot, spread `moveChange([[0, "neutral"], [30, "happy", "wave"], [80, "thinking", "chin"]], f)` into the pose: face and body ease into each step over ~12 frames (a hanging arm glides into a reach, front/behind and hand shape switch halfway).
  - Whole-body moves (spread into the pose; `MoveTour` previews them): `jump(f, start, height?, len?)` (load, flight with tucked legs, squash landing), `sitDown(f, start)` / `standUp(f, start)` (legs fold onto a hip-height seat, then holds `sit`), `lieDown(f, start, len?, asleep?)` / `getUp(f, start)` (tips back onto the floor; asleep adds shut eyes and floating "z"s), `crawlTo(f, start, frames, from, to)` (all fours in profile, like `stroll`). `walk` / `stroll` lift the swinging foot and swing the arms. Seen from the front (walking toward or away from the camera) the legs step forward and back, the forward foot lower and bigger, and the forward arm bends up toward the camera; `armSwing` (set by Stage) scales the arm swing. `WalkToward` previews a puppet walking up to the camera.
  - **Every walk carries its emotion, automatically.** Stage gives each expression its own gait: happy/excited bounce with big arm swings, sad/bored drag their feet (low `stepLift`), sink on every step, roll and hang their heads, worried shuffles, angry/determined lean in with fists, smug swaggers chin-up, skeptical keeps its arms close and head cocked, confused hesitates, thinking walks slowly head-down, awkward goes stiff, shocked flaps, disgusted shrinks back. Just set the expression on a walking puppet; do not hand-author a flat walk. `SadWalk` previews the sad gait (with a stumble and a sigh you would add per shot). `stroll` ties the steps to the distance covered so the planted foot does not slide; when you move a puppet yourself, use `walkAt(metresCovered, speed01)` instead of `walk(f * speed)`.
  - Body fields behind them: `crouch` (0..1 knees bend, hips sink), `air` (units off the ground), `bend` (0..1 at the hips; reads best in profile), `seat` (0..1 standing to seated), `lie` (0..1 onto the back; the cut-out widens to fit), `sleep`, `crawl` (phase, profile only), `stride` (walk phase).
  - Building blocks behind them: `lean` (deg from the hips), `slump` (1 sinks shoulders and head, -1 lifts the chest), `reachL / reachR: [x, y]` puts a hand at a point (the elbow bends itself; shoulders at x ±130, y -545, head centre y -800), `frontL / frontR` draws that arm over the body and face, `handL / handR: open | point | fist`.
  - `armL / armR: [shoulder, elbow]` degrees, 0 = hanging; `[150, -25]` arms up, `[10, -78]` holding in front, `[8, 62]` carry in profile
  - `bob`, `legSwing`, `sit`
  - `view: front | side | back`, `facing: 1 | -1` (side view). Leave both unset and the cut-out turns itself: profile when the camera is 60° or more off the set's front (+z), its back past 125° (not when sitting). Set `view: "front"` to keep it facing the camera.
  - Walk-ins: `const w = stroll(f, start, frames, from, to)`, then place at `w.at` and spread `...w.pose` last: it strides (in profile when crossing sideways) and stands once it arrives.
  - Mouth shapes (`viseme`), the lanyard/cap follow-through (`swing`) and beat gestures come from `Stage` automatically.
  - `hold: { item: cup | drink | phone | toolbox | key | popcorn | briefcase | candy | wine, hand: L | R }`, `itemTilt` (deg), `coinDrop` (units fallen)
- The cut-out card grows with the puppet: `air` (a car seat, a jump), an upward `bob` and a stretch (negative
  `squash`) extend its top, and it is wide enough for outstretched arms. The `stills` audit reads every card's edge
  pixels and reports "card of X cuts the drawing" if anything still runs off it (the cause of heads sliced off in a
  straight line, which no camera move can fix).
- From high cameras the card leans back on its feet (`cardTilt`), so a puppet seen from above keeps its full body
  instead of flattening to a sliver; nothing to do in the shot. For a world-space prop held in a hand (a paddle, a
  rope), `handWorld(at, reach, camera)` gives the 3D point of a hand at `reachR`/`reachL` (it follows the tilt).
- Vertical frame is narrow: at fov 40 the visible half-width is only about 0.23 × camera distance (1.5 m away → ±0.35 m).
  Keep props and puppets that must share a shot within that width, stack mechanism props vertically, and keep key
  text above the caption band (lower ~30 % of the frame). Puppets behind a counter need it ≤ 0.65 m tall to show their torso.
- Framing references (puppet at z ≈ 1): medium `position [x-0.9, 1.25, 4.2] target [x-0.1, 1.0, 0.4] fov 36`;
  close-up `position [x-0.55, 1.05, 2.95] target [x-0.28, 0.9, 1.1] fov 36` with `blur 7`.

## Puppet lighting

New videos light the puppets from the set (`Video` `lighting`, default on; videos made before it pass
`lighting={false}` and keep the flat mood tint). Only strong light sources change a puppet: the room's ambient colour
barely touches it (a 6 % hint), so skin stays skin in blue or neon rooms. A strong light (campfire, bare bulb, car
headlights, low sun) brightens and colours the side facing it, with a curved cel edge (a sphere round the head, a
cylinder round the body), and a soft rim glows along the silhouette edges that face it, fading inward (directional
only: no glow wrapped round the whole outline). The far side keeps the puppet's colours, dimmed slightly.

- With no `light`, Stage uses `moodLight(mood)`: no lights, just the faint ambient hint, so puppets look as drawn.
- Give a shot its own `light` when it has a strong source: `PuppetLight = { tint?, tintAmount?, shadow?,
  points?: [{ position, color, strength, range }], distant?: [{ direction, color, strength }] }` (at most two of each;
  `direction` points toward the light; `shadow` dims the far side, default 0.12). Fire: `firePoint(...)` (strength
  ~2.8). Headlights from the left: a `distant` light with `direction: [-1, 0.2, 0.3]`, a pale colour, strength ~2.
  Lake: `lakeLight(f)`.
- Preview an older video lit: `LIGHTING=1 node scripts/stills.mjs <slug> <out-dir>`.

## Voice

`lines.json`: each line may carry `"voice": { "instruct", "tempo", "seed" }` to override the speaker's
settings for that line only (e.g. a punchier, faster hook). The default narrator should sound excited and
gripping; a calm read makes the video feel slow.

## Sound

Effects (`public/sfx/*.wav`, synthesised by `scripts/sfx_generate.py`): `reel-spin` (loop), `reel-stop`, `near-miss` (sad wah),
`chime`, `button`, `bill-whirr`, `credit-blip`, `whoosh`, `tape-stop`, `hum` (loop), `stamp`, `tick`, `boom`, `paper`, `ambience` (loop),
`pop` (a sign popping in), `drawer` (cash drawer out + stop), `card` (card slid or swiped), `door` (creak + shut), `sting` (twist hit:
put it on the twist line), `riser` (1.6 s build; start it so it ends on the twist), `wind` (outdoor breeze, loop), `plop`
(a small soft lump landing on grass), `crackle` (small wood fire, loop), `chew` (two squishy chews),
`crowd` (stadium cheering, loop), `engine` (early motor car chugging, loop), `honk` (bulb horn), `hiss` (steam burst),
`steps` (running on dirt, loop).
Music loops: `lounge` (112 BPM, light), `mystery` (84 BPM, dark), `upbeat` (124 BPM, bright: hooks), `tension` (100 BPM, pulsing:
the numbers and the reveal). Use at least three beds across a video. New sounds: add a function at the end of `sfx_generate.py`
(after the originals, so their files stay identical) and re-run it with `../tts/qwen/.venv/bin/python`.

`Sfx = { at, src, volume, until? }` (`until` loops to that frame). `MusicCue = { src, from, to, volume }`; music ducks under the voice automatically.

Look (all views, every puppet): cel shading (flat, slightly soft shadow on the right and below, bangs shadow on the forehead), eyelids on white eyes, 30-unit arms and legs, short thick mitten hands with a thumb, simple rounded feet; excited is an open laugh with upper teeth and a tongue; in profile an egg-shaped head with the eye near the front of the face and, for `long` hair, one piece of hair over the back of the head and the nape. These live in `src/puppet/Puppet.tsx`; change them there so every character follows.
