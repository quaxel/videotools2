---
name: make-video
description: Produce a 50-60 s vertical explainer cartoon (the "why X secretly works like this" Shorts format) end to end in animator/ - research, script, Qwen TTS voice, Remotion + three.js scene code, review, render and a measured report. Use when the user asks for a new video on a topic, e.g. "/make-video why airlines overbook flights".
---

# Make an explainer video

Work in `animator/` (cwd for every command below). Per-video work (`../videos/<slug>/`), renders (`../output/`) and the uploader (`../uploader/`) live at the repository root, outside `animator/`. The deterministic stages are `scripts/pipeline.py`;
you write the research, script and scene code. Read these first, every time:

- `guide/rules.md` — the rules the video must meet (story beats, word budget, picture, sound).
- `guide/library.md` — engine, set kit, puppet and sound API.
- `src/videos/slot-machines/Scene.tsx` — a complete scene to copy the structure from.

`PY=.venv/bin/python`. Pick a short kebab-case slug from the topic.

## 1. Scaffold

```bash
.venv/bin/python scripts/pipeline.py new <slug> "<topic>"
```

At any point `pipeline.py status <slug>` lists every stage as done / stale / missing (stale = its output is older
than the scene, timing or voice it was made from), with run times, and prints the next command.
`pipeline.py go <slug>` runs the missing and stale stages in order up to `motion` and stops when `check` or `sync`
fails, `collide` finds a hit, or an approval is missing; `--to report --2k` carries on through the render and
report, `--plan` only prints the plan. Each stage's run time goes to `../videos/<slug>/build/timings.jsonl`.
Approvals: `pipeline.py approve <slug> script` (before voice) and `approve <slug> stills` (before render); each
lapses when its file changes (lines.json, the contact sheet), so a later edit needs a new look.
`pipeline.py web` opens the panel (http://127.0.0.1:8766) with every video's stages, run / stop, the live log,
approvals and outputs, for the user to follow or drive the pipeline.

## 2. Research → `../videos/<slug>/research.md`

If the user gave no topic or only a broad one, first list the topics already made (`ls ../videos/`, the uploader's
database) and propose 5 new ones that are not among them: a title, the triple hook (the visual: what moves or
changes on screen at frame 0; the verbal: the first sentence; the text: the shot-1 headline), the escalation
(but / then / so) and 2-3 hard numbers or names each, checked with a quick search. Ask which one;
then scaffold.

Use web search. Open the pages you cite. Write one paragraph on the mechanism, then a `## Claims` list:
`- <claim with its number> — <URL>`. Every factual number in the script must appear in a claim.
If a number cannot be sourced, write the script without it. A key number or name that only one source gives, or
that sources disagree on, stays out too. End with `## Left out`: the tempting details you dropped and why, so they
do not creep back into the script.

## 3. Plan → `../videos/<slug>/plan.json`

Fill every field: title, mechanism (one sentence), the seven beats (hook, but, then, conflict, pivot, so, closing;
guide/rules.md → Story), the `triple_hook` (rules.md → Story, triple hook: `visual` what is in frame and moving at
frame 0, `verbal` the first sentence, `text` the shot-1 headline; three different jobs, none repeating another),
the seed (what, and the index of the first
line where it appears on screen), at least 8 locations (id, set, dominant colour; no two neighbours share a
colour), at least 4 characters with looks, at least 2 physical gags, and `story_numbers`.
For each mechanism idea, name the labelled physical prop that shows it.
Set `year`: the year the story is set in (negative for BC, `[from, to]` for a span, `null` for a present-day story).
For a story set in the past, decide each character's whole costume here, from the research: head, body, legs, feet
and anything they carry, as worn in that year and place by that rank or trade (an 1815 marshal: bicorne, braided
coat, breeches, boots; no bowler, no sneakers). Write it into the character's look. The scene step builds it; it
does not choose it.

## 4. Script → `../videos/<slug>/lines.json`

180-210 words, one line per sentence pair, dialogue as separate speakers (add the voice under `voices`; Qwen
English voices: Ryan, Aiden, Eric, Dylan, Uncle_Fu male; Vivian, Serena female). No ellipses, no repeated
one-word sentences. Only the line before the pivot ("You see ...") may carry `"pauseAfter": 0.4`. End sentences where the shots will
change: 9-12 shots, one per location. The first line is the plan's `triple_hook.verbal`.

```bash
.venv/bin/python scripts/pipeline.py voice <slug>
```

It prints duration, words, wpm, each line's frame span, and `speech_cover` and `long_pauses` measured on the voice
track (target ≥ 82 % there: the final mix measures 1-2 points lower; four what-if videos missed 80 % in the report
because nobody looked until the end). If any of them misses, edit the lines now (a few more words, a shorter
`pauseAfter`, `tempo` +0.05 on a slow speaker) and run `voice` again (unchanged lines are cached): after the scene
is built a re-voice moves every cut. `pipeline.py pace <slug>` re-measures without re-voicing. Then show the user the script and the numbers in one short
message and continue unless they object; record it with `pipeline.py approve <slug> script` (after their OK, or
once they have seen it and not objected).

## 5. Scene → `src/videos/<slug>/Scene.tsx` (+ `props.tsx` for new props)

For a location the kit does not already have, research it first (library.md → New locations: research references
first): look at 3-5 photo references in the browser, write `guide/references/<set>.md`, then build the set from it.
Calibrate a new set on one still before building shots on it: build in order room → light → puppets → camera,
render a still after each step and list in plain words what still differs from the references (boxy props, missing
wear, wrong scale, flat light) before fixing it.
Reuse existing sets where they fit (`LakeSet`, `SpaceBaseSet`, `AlleySet`, `GreatWallSet`).

Open with one continuous camera move onto the strange thing while the first sentence states the paradox
(guide/rules.md → Story, Hook). Build shot 1 as the triple hook (rules.md → Story, triple hook): the strange thing
in frame and already moving at frame 0, and the plan's `triple_hook.text` as a `Headline` with `at` ≤ 9 and `out`
near the end of the hook. On-screen titles use `Headline` (library.md → Birds, on-screen headlines). Period characters wear
the costume from the plan. Run the period check (library.md → Puppets, Period check) on every look: every field it
sets, every held item and every piece the video adds, from head to feet. When the kit lacks a piece the period needs,
build it in the video's own folder, as `src/videos/what-if-waterloo/hats.tsx` does for bicornes, rather than taking
the nearest kit piece.

Pass `post` and `steady` to `Video` (library.md → Post chain: depth of field, bloom, colour grade; `steady`: the
camera glides, almost no hand-held drift).

First write `../videos/<slug>/camera_plan.md` (guide/rules.md → Camera moves): per shot the time, location, camera path
start → end, move type (about half push, a third crane, a fifth sideways track), net travel (25-40 % of the frame
width), the foreground / midground / background objects and the in-world labels. Then write the shot list against
the printed frames: 9-12 shots, one location each, each ending on a sentence end (average 4-7 s, none under 1.5 s or
over 10 s); `"dip"` at every change of location, `"dissolve"` for a change of time in one place, at most one hard cut
(`false`) in the video, no whips. Inside a shot move the camera with `beatPath` (library.md → Engine), one key per
subject at the frame its name is spoken, so it eases out of the first key, glides through the others and comes to
rest at the last. Every shot gets a foreground object near the lens (Stage `foreground` + `frameSpot`), the subject
sharp, the background soft. Use `Room` + kit props for new locations, and a different mood per location. Put the seed on screen by its line. Add SFX for every mechanical action and MUSIC cues.
Write each repeated action (a bite, a knock, a wave) with its own path, timing and body acting every time, and let
rhythmic motion (chewing, walking) drift in pace and size (guide/rules.md → No action twice the same way). A seated
puppet behind a table: top ≤ 0.45 m, hands above it.
A puppet seated on a sofa, chair, bench or stool takes the sitting pose (`sit: true`, or `sitDown`) and sits on it,
never stands in it with its legs inside the seat: build the seat top at `HIP_HEIGHT` (0.34 m) and place the puppet
(`at`) at the seat's front edge, 1-3 cm in front of it, so the bent knees and shins are drawn in front of the seat and
the feet rest on the floor. A sofa or chair placed behind the puppet's `at` hides the legs and reads as a figure
standing inside the furniture (the user caught this on the microwave-candy-bar sofa). Check it on the first still of
every seated shot, and keep a coffee table or desk in front clear of the feet.
Puppets are lit by the set (library.md → Puppet lighting): leave `lighting` on. Ambient room colour does not
change them; where a shot has a strong source (fire, lamp, headlights) pass a Stage `light` with that point or distant light. Outdoors, reuse `LakeSet` or its pieces (`Campfire`,
`SmokePlume`, `Pine`, `Ridge` + `Haze` with parallax) and truck the camera sideways in front of distant backdrops.

```bash
.venv/bin/python scripts/pipeline.py check <slug>
```

Fix until it passes (tsc + contiguous shots + no shot over 4 s + costume). The costume part tests every look in
`src/videos/<slug>/` and every held item against the plan's `year` and fails on a piece from another era (a `cap`
before 1900, a bowler before 1850, a `lanyard`, a `phone`, a `tunic` or `mail` in modern times). It only knows the
kit fields, so the period check in the scene step still covers colours, slug-built pieces and what is missing. A
look that is right on purpose (a present-day historian in an 1815 story) gets `// period-ok: <why>` on its line.
Then check the sound cues against the picture:

```bash
.venv/bin/python scripts/pipeline.py sync <slug>
```

Fix every error. Fix the warnings that are not on purpose: a looped effect ending a few frames off a cut, and music
gaps.
For the video's own score instead of the library loops, write `../videos/<slug>/music.py` (library.md → The video's own
score), run `pipeline.py music <slug>` and pass `score` to `Video`.

Building blocks for the picture (library.md has each API):
- **Blender models** for complex props. Decide per prop while writing the shot list, without asking: build it from
  kit pieces (`InkBox`, `InkCylinder`, existing props) when it is boxes, cylinders and slabs (a desk, a crate, a sign,
  a door); model it in Blender when the viewer must recognise it by its silhouette and that needs curved or compound
  surfaces or many fitted parts (a car, a bicycle, a boat, a plane, an animal, an instrument, a cannon). When in
  doubt and the prop is on screen for more than one shot or close to the lens, use Blender. Model it with the
  **sand3d-model** skill: a sand3d program in `../videos/<slug>/sand3d/<name>.py` (from `guide/sand3d/car.py`), exported
  to `public/videos/<slug>/models/<name>.glb`, checked in `ModelPreview`, shown with `BlenderModel` and its joints
  posed by name (library.md → Blender models). Raw bpy (`guide/blender/car.py`) only for what sand3d can't express.
  The program is the source: change it and run it again, never hand-edit in a live Blender session.
- **Physics** for a gag where things fall, topple or scatter: `../videos/<slug>/physics.mjs`, baked by
  `pipeline.py physics <slug>` (check, stills and render re-bake it when it changes), played by `<Simulation>`. Tune by
  baking and reading the printed impacts; keep the scatter inside the narrow 9:16 frame.
- **Particles** (`Burst`, `Shower`): dust on every hard landing, stars on a bonk, sparks, confetti. Pure functions
  of the frame; hang them off the physics impacts or the cue frames.
- **Sunbeams** (`GodRays`) for a sunny interior: the sun must cross the frame (a big x part) against a mid-dark wall,
  `strength` about 0.08, `frame` for drifting motes, `tops` for a patch on a table.

Sound, after the cues pass `sync` (guide/rules.md → Sound):
- Effects for organic or repeated actions come from the foley takes (`foley.py list`; library.md → Foley) through
  `foleyCues`, on frames from the motion: `jawCloses` for chewing, `stepFrames` for a `stroll`, `impactCues` for a
  physics bake (louder with the speed; `hit` for a camera jolt). Never put one file on a run of cues.
- Give every one-shot effect the location's `space`.
- A sound the library lacks: search the shared sound library first (`node ../../videotools/sound-library/kutuphane.mjs
  liste <word>`), then propose CC0 files to the user with name, page and size, and download only on their yes (never
  from a site that blocks scripts; ask the user to fetch those into `sound-library/_gelen/`). Add them to the
  library's catalog (`kutuphane.mjs ekle ... --lisans --kaynak --yazar`), then `foley.py import <name> lib:<glob>`
  (`--lowpass` softens a crisp recording).

Then measure the levels:

```bash
.venv/bin/python scripts/pipeline.py mix <slug>
```

Read the effects table in `../videos/<slug>/build/mix/mix.md`: chews and steps -5 to 0 LU, bites and clinks -5 to +3, a
gag's big hit up to +6; fix every hot, buried or stamped-out (repeated file) row and run `mix` again. A 15 ms click
measures low: give it more volume rather than reading it as buried.

## 6. Review on stills (no full render)

```bash
.venv/bin/python scripts/pipeline.py stills <slug>
```

It renders one still per second plus the start, middle and end of every shot (camera moves are where heads and
signs leave the frame; the per-second stills alone missed cut faces in the published Petrov video). It also prints
a framing audit (saved to `../videos/<slug>/build/stills/framing.txt`): faces, heads (people, animals, crowd figures,
hats included) or text cut by the frame edge, under the captions, or hidden behind the set. **Every hit is a fix**,
background figures and signs included: the user's rule is that nothing is half visible. A crowd edge is fixed by
reframing, a foreground element that bleeds cleanly off the edge, dropping the edge figures, or deep shadow.
Read `../videos/<slug>/build/stills/contact.jpg` (in time order; the frame numbers are the file names in that folder). The
first tile must show the triple hook: the strange thing moving in frame, the first line's caption and the headline
fully in, whole and not covering each other; fix it before anything else. Then check: faces in frame and not cut,
labels readable, no empty or black frames, over-the-shoulder head ≤ 25 %, colour varies, gags read, Blender models
read at a glance in the toon look (ink outline, flat bands, right way round and on the floor). Also (guide/rules.md →
Picture): camera inside geometry or something through the lens, a pole or prop crossing a face, floating props or
black voids, puppets too small to act (40-60 % of the frame height in a medium shot), the main event shown in steps,
the light following the story, every date, name and number on screen spelled as in the script, and every costume
right for the year, piece by piece from head to feet, plus what each character holds.
**Before the first `stills` run, go through the mistakes every recent video made** (all found late, each one cost a
full extra round). Look for each of these in your own scene code and on the first sheet:
1. a foreground object near the lens (console, bottle, pole, rope, crate, curtain) that crosses a face or fills a third
   of the frame during the move (Petrov 5×, Fleming 7×, Columbus 4×): keep foreground at the frame edge, or drop it;
2. a sign, label or headline cut by the edge at the end of a track or push, or a face or label inside the caption band
   (lower third);
3. bloom, god rays or a point light blowing a table or cloth out to white;
4. one hue over 40 % (a yellow grade on grass gave 71 %): measure it on the first sheet, not in the report;
5. costumes wrong for the year (bowler hats on 1815 marshals): check every hat against plan.json `year`;
6. troops, crowds or walks timed on the video frame instead of the shot frame (they have marched off by the shot);
7. a crowd, an animal or a hat cut by the edge, which the audit now reports too;
8. z-depth: two flat surfaces at the same depth (a sign or decal flush on a wall, a floor patch on the floor, two boxes
   sharing a face) flicker between frames (z-fighting): lift the front one 1-2 cm off the surface (or `polygonOffset`);
   a shot without depth layers (subject against a wall filling the frame) reads flat: give it a background layer
   behind the subject and keep any foreground to the frame edge. The audit reports z-fighting pairs and an oversized foreground as faults; frames with no background layer go to
   `depth-notes.txt` as notes (most interiors have only a back wall: fine when the wall is lit, dressed and not flat).

Write what you find to `build/mistakes_<round>.md` (rules.md → Process) and fix high severity first.
Work in rounds. Write every finding of the round down, apply all the fixes, then check only the shots you changed:
`pipeline.py stills <slug> --shots 3,7` renders every 15 frames through those shots (camera moves included) and
re-measures only their head framing (about 10-30 s a shot), into `build/stills-check/`; a frame list
(`stills <slug> 120,480,900`) works the same way. Neither touches the full sheet in `build/stills/`, which comes back
only for the approval (step 7). At most 3 rounds.

Then check that no character walks or stands through a set object (every 5th frame, tiny scale):

```bash
.venv/bin/python scripts/pipeline.py collide <slug>
```

Fix every hit (saved to `../videos/<slug>/build/collide/collide.txt`): move the puppet's spot or route a walk around the counter,
desk or prop (`stroll` goes in a straight line, so split it into two strolls around the obstacle). Smoke, held props and effects
that may overlap a character go under `<group userData={{ ghost: true }}>`. Run `collide` again until it prints "collisions: none".
A full run renders every 5th frame of the whole video in three tabs (about 3-4 min); after fixing hits, re-check only
those shots with `pipeline.py collide <slug> --shots 4,9` (seconds, into `build/collide-shots/`), and run the full
pass once more before the approval.

Then check motion without a full render (30 % draft, ~2 min):

```bash
.venv/bin/python scripts/pipeline.py motion <slug>
```

If motion < 3 or still frames > 30 % (provisional targets for the slow camera), give the listed stillest shots more
net travel (up to 40 % of the frame width) or more puppet and secondary action; never add wobble. Every shot keeps
the camera travelling (push, crane, track) and eases out to rest.

When the hardest shot is new (a new set, a physics gag, the main event), look at it moving before the full render:
render those few seconds as a clip (`npx remotion render "$(node scripts/bundle.mjs)" <slug> $D/hard.mp4 --frames=<a>-<b>
--props='{"post":true}' --gl=angle`, `$D` a scratch folder) and look at frames from it for stiff acting, outline
flicker, popping and camera clipping.

## 7. Render once, then report

When stills, collide and motion all pass, run `pipeline.py stills <slug>` once more without a frame list (after the
last collide or motion fix) and look at the full sheet. Then record it: `pipeline.py approve <slug> stills`. `go`
renders only with this approval in place.

```bash
.venv/bin/python scripts/pipeline.py render <slug> --2k
```

`--2k` renders the delivery size, 1440x2560 (without it 1080x1920, for a quick look). The render ends with the
frame-by-frame QA (`../videos/<slug>/build/qa/`: black, white, frozen and sudden-jump frames, loudness, 2 s contact
sheets with frame numbers). Look at every frame it lists as a pop on its sheet: a set that vanishes for a frame
(a lost WebGL canvas) or a camera jump inside a shot is a real fault, a face change is not.

Render checks every segment for broken frames (a lost WebGL canvas shows as a run of flat background colour) and
renders that segment again; `pipeline.py glitch <slug>` checks a finished MP4 the same way.

```bash
.venv/bin/python scripts/pipeline.py report <slug>
```

The report (`../videos/<slug>/report.md`) lists every target with ok/MISS (black frames and frozen spans included),
the QA's pops and any spoken number without a sourced claim. Fix cheap misses (one more render at most); report the rest to the user honestly.

## 8. YouTube metadata → `../videos/<slug>/youtube.md`

Every rendered video gets one: the uploader page (`../uploader/server.py`) fills title, description and tags from it.
Write it in English, in this exact shape (see `../videos/ghost-army/youtube.md`):

```markdown
# YouTube metadata — <slug>

## Title
<hook-style title, ≤ 100 characters incl. emoji and " #Shorts">

## Description
<one-line hook>

<one paragraph telling the story with the key sourced numbers>

<a question to the viewer> 👇

Sources:
• <publisher, what it supports>: <url from research.md>

<for history: "Animated historical re-enactment; characters' looks are illustrative.">

#Shorts #<5-6 topic hashtags>

## Tags
<15-25 comma-separated search phrases, ≤ 500 characters in total>
```

Only facts from research.md's claims; no `<` or `>` anywhere in title or description. Then add the video to the
uploader's database (after this, only `../output/<slug>.mp4` is needed; `../videos/<slug>/` can be removed):

```bash
.venv/bin/python ../uploader/server.py --import <slug>
```

## Handing a video to an agent

The coordinator reviews early, not after the render. Brief the agent to stop after its first full stills sheet that
passes its own checks (before collide, motion and render) and report the sheet's path; look at it at once (and at
the stills of every camera move), send all findings in one message, and let it continue. Then review each finished
video as soon as its agent reports, not when the batch is done: in the first what-if batch, finished agents waited
55-155 min for a review, and every finding after the 2K render cost a full stills, collide and render round.

Two agents at once is the limit. The heavy stages (framing pass, collide, motion, render) share one machine-wide lock
(`out/heavy.lock`), so a second agent's heavy stage waits for the first one's ("waiting for the heavy-stage lock:
… is running"); that is expected, not a hang. Start the second agent's video a few minutes later so their research
and scene writing overlap each other's renders instead of their renders colliding.

When you brief a subagent to make a video with this skill, put in the brief what the skill cannot know:
- the story's year and place, and each named character's whole costume (head to feet, plus what they carry),
  checked against references before the agent starts. Napoleon and his marshals in bowlers instead of bicornes cost a whole extra stills,
  collide and render round after the first render.
- no extra check runs beyond step 6's rounds: extra frames for a moving shot go into that round's one `stills` run.

## Short clips and stills outside the pipeline

When the user asks for a single frame or a few seconds rather than a full explainer, write a composition in
`src/scenes/<Name>.tsx` (a `ShotList` plus `SoundTrack`, as `src/scenes/SunlitLunch.tsx` does: one function of the
frame that both a still and a clip use) and register it in `src/Root.tsx`. The same rules apply to picture and sound.

```bash
POST=1 STILL_SCALE=1 node scripts/stills.mjs <Name> ../output/stills-<name> <frames>
```

For a clip, check the effects the same way (`$D` a scratch folder):

```bash
node scripts/cues.mjs <Name> $D/cues.json && .venv/bin/python scripts/foley.py space --cues $D/cues.json && STEM=sfx node scripts/sound.mjs <Name> $D/sfx.wav && STEM=music node scripts/sound.mjs <Name> $D/music.wav && .venv/bin/python scripts/mixreport.py effects $D/cues.json $D
```

Then render it with the post chain and bring the audio to -15 LUFS (the clip has no pipeline mastering):

```bash
npx remotion render <Name> $D/raw.mp4 --props='{"post":true}' --gl=angle && ffmpeg -y -i $D/raw.mp4 -c:v copy -af loudnorm=I=-15:TP=-2:LRA=11 -c:a aac -b:a 320k -ar 48000 ../output/<name>.mp4
```

Check the result with `pipeline.glitch_frames` (no broken frames) before sending it, and delete `$TMPDIR/remotion-*`
afterwards (set `TMPDIR` to the scratch folder for these commands so the bundles land there).

## Deliver

Send `../output/<slug>.mp4` to the user, with the report's misses and any unverified numbers. Do not say a check
passed unless the report shows it.
