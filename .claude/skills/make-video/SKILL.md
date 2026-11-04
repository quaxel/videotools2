---
name: make-video
description: Produce a 50-60 s vertical explainer cartoon (the "why X secretly works like this" Shorts format) end to end in animator/ - research, script, Qwen TTS voice, Remotion + three.js scene code, review, render and a measured report. Use when the user asks for a new video on a topic, e.g. "/make-video why airlines overbook flights".
---

# Make an explainer video

Work in `animator/` (cwd for every command below). The deterministic stages are `scripts/pipeline.py`;
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
report, `--plan` only prints the plan. Each stage's run time goes to `videos/<slug>/build/timings.jsonl`.
Approvals: `pipeline.py approve <slug> script` (before voice) and `approve <slug> stills` (before render); each
lapses when its file changes (lines.json, the contact sheet), so a later edit needs a new look.
`pipeline.py web` opens the panel (http://127.0.0.1:8766) with every video's stages, run / stop, the live log,
approvals and outputs, for the user to follow or drive the pipeline.

## 2. Research → `videos/<slug>/research.md`

Use web search. Open the pages you cite. Write one paragraph on the mechanism, then a `## Claims` list:
`- <claim with its number> — <URL>`. Every factual number in the script must appear in a claim.
If a number cannot be sourced, write the script without it.

## 3. Plan → `videos/<slug>/plan.json`

Fill every field: title, mechanism (one sentence), the six beats, the seed (what, and the index of the first
line where it appears on screen), at least 8 locations (id, set, dominant colour; no two neighbours share a
colour), at least 4 characters with looks, at least 2 physical gags, and `story_numbers`.
For each mechanism idea, name the labelled physical prop that shows it.

## 4. Script → `videos/<slug>/lines.json`

180-210 words, one line per sentence pair, dialogue as separate speakers (add the voice under `voices`; Qwen
English voices: Ryan, Aiden, Eric, Dylan, Uncle_Fu male; Vivian, Serena female). No ellipses, no repeated
one-word sentences. Only the twist line may carry `"pauseAfter": 0.4`.

```bash
.venv/bin/python scripts/pipeline.py voice <slug>
```

It prints duration, words, wpm and each line's frame span. If duration or wpm misses, edit the lines and
run `voice` again (unchanged lines are cached). Then show the user the script and the numbers in one short
message and continue unless they object; record it with `pipeline.py approve <slug> script` (after their OK, or
once they have seen it and not objected).

## 5. Scene → `src/videos/<slug>/Scene.tsx` (+ `props.tsx` for new props)

For a location the kit does not already have, research it first (library.md → New locations: research references
first): look at 3-5 photo references in the browser, write `guide/references/<set>.md`, then build the set from it.
Reuse existing sets where they fit (`LakeSet`, `SpaceBaseSet`, `AlleySet`, `GreatWallSet`).

Open with 3-4 hard, quick shots in the first 5 s (guide/rules.md → Hook): the strange thing coming at the lens, a
reaction, an impact. On-screen titles use `Headline` (library.md → Birds, on-screen headlines). Period characters use
the costume options (library.md → Puppets), never `cap`.

Pass `post` to `Video` (library.md → Post chain: depth of field, bloom, colour grade).

Write the shot list against the printed frames: cut on line and caption boundaries, average ≤ 2.2 s, none
over 4 s, whip (`true`) on location changes, `"dissolve"` for a change of time in one place; every cut is its
own shot in the list. Give two or three shots a foreground framing object (Stage `foreground` + `frameSpot`, library.md). Use `Room` + kit props for new locations, and a different mood per
location. Put the seed on screen by its line. Add SFX for every mechanical action and MUSIC cues.
Write each repeated action (a bite, a knock, a wave) with its own path, timing and body acting every time, and let
rhythmic motion (chewing, walking) drift in pace and size (guide/rules.md → No action twice the same way). A seated
puppet behind a table: top ≤ 0.45 m, hands above it.
Puppets are lit by the set (library.md → Puppet lighting): leave `lighting` on. Ambient room colour does not
change them; where a shot has a strong source (fire, lamp, headlights) pass a Stage `light` with that point or distant light. Outdoors, reuse `LakeSet` or its pieces (`Campfire`,
`SmokePlume`, `Pine`, `Ridge` + `Haze` with parallax) and truck the camera sideways in front of distant backdrops.

```bash
.venv/bin/python scripts/pipeline.py check <slug>
```

Fix until it passes (tsc + contiguous shots + no shot over 4 s). Then check the sound cues against the picture:

```bash
.venv/bin/python scripts/pipeline.py sync <slug>
```

Fix every error. Fix the warnings that are not on purpose: a looped effect ending a few frames off a cut, music
gaps, and the loop seam (the bed under the last frame should be the one under frame 0).
For the video's own score instead of the library loops, write `videos/<slug>/music.py` (library.md → The video's own
score), run `pipeline.py music <slug>` and pass `score` to `Video`.

Building blocks for the picture (library.md has each API):
- **Physics** for a gag where things fall, topple or scatter: `videos/<slug>/physics.mjs`, baked by
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

Read the effects table in `videos/<slug>/build/mix/mix.md`: chews and steps -5 to 0 LU, bites and clinks -5 to +3, a
gag's big hit up to +6; fix every hot, buried or stamped-out (repeated file) row and run `mix` again. A 15 ms click
measures low: give it more volume rather than reading it as buried.

## 6. Review on stills (no full render)

```bash
.venv/bin/python scripts/pipeline.py stills <slug>
```

It also prints a framing audit (saved to `videos/<slug>/build/stills/framing.txt`): faces or signs cut by the frame edge, under
the captions, or hidden behind the set. Fix every hit on a key face or sign; background signs and crowd extras at the edge can stay.
Read `videos/<slug>/build/stills/contact.jpg` (one frame per second). Check: faces in frame and not cut,
labels readable, no empty or black frames, over-the-shoulder head ≤ 25 %, colour varies, gags read.
For a closer look pass frames: `pipeline.py stills <slug> 120,480,900`. Fix and repeat, at most 3 rounds.

Then check that no character walks or stands through a set object (every 5th frame, tiny scale):

```bash
.venv/bin/python scripts/pipeline.py collide <slug>
```

Fix every hit (saved to `videos/<slug>/build/collide/collide.txt`): move the puppet's spot or route a walk around the counter,
desk or prop (`stroll` goes in a straight line, so split it into two strolls around the obstacle). Smoke, held props and effects
that may overlap a character go under `<group userData={{ ghost: true }}>`. Run `collide` again until it prints "collisions: none".

Then check motion without a full render (30 % draft, ~2 min):

```bash
.venv/bin/python scripts/pipeline.py motion <slug>
```

If motion < 6 or still frames > 15 %, give the listed stillest shots a bigger camera move or puppet action.
Every shot keeps the camera moving (orbit, crane, truck, push); sky shots need the biggest moves.

## 7. Render once, then report

When stills, collide and motion all pass (a collide or motion fix re-renders the stills, so approve after the last
one), record it: `pipeline.py approve <slug> stills`. `go` renders only with this approval in place.

```bash
.venv/bin/python scripts/pipeline.py render <slug> --2k
```

`--2k` renders the delivery size, 1440x2560 (without it 1080x1920, for a quick look). The render ends with the
frame-by-frame QA (`videos/<slug>/build/qa/`: black, white, frozen and sudden-jump frames, loudness, 2 s contact
sheets with frame numbers). Look at every frame it lists as a pop on its sheet: a set that vanishes for a frame
(a lost WebGL canvas) or a camera jump inside a shot is a real fault, a face change is not.

Render checks every segment for broken frames (a lost WebGL canvas shows as a run of flat background colour) and
renders that segment again; `pipeline.py glitch <slug>` checks a finished MP4 the same way.

```bash
.venv/bin/python scripts/pipeline.py report <slug>
```

The report (`videos/<slug>/report.md`) lists every target with ok/MISS (black frames and frozen spans included),
the QA's pops and any spoken number without a sourced claim. Fix cheap misses (one more render at most); report the rest to the user honestly.

## 8. YouTube metadata → `videos/<slug>/youtube.md`

Every rendered video gets one: the uploader page (`uploader/server.py`) fills title, description and tags from it.
Write it in English, in this exact shape (see `videos/ghost-army/youtube.md`):

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
uploader's database (after this, only `out/<slug>.mp4` is needed; `videos/<slug>/` can be removed):

```bash
.venv/bin/python uploader/server.py --import <slug>
```

## Short clips and stills outside the pipeline

When the user asks for a single frame or a few seconds rather than a full explainer, write a composition in
`src/scenes/<Name>.tsx` (a `ShotList` plus `SoundTrack`, as `src/scenes/SunlitLunch.tsx` does: one function of the
frame that both a still and a clip use) and register it in `src/Root.tsx`. The same rules apply to picture and sound.

```bash
POST=1 STILL_SCALE=1 node scripts/stills.mjs <Name> out/stills-<name> <frames>
```

For a clip, check the effects the same way (`$D` a scratch folder):

```bash
node scripts/cues.mjs <Name> $D/cues.json && .venv/bin/python scripts/foley.py space --cues $D/cues.json && STEM=sfx node scripts/sound.mjs <Name> $D/sfx.wav && STEM=music node scripts/sound.mjs <Name> $D/music.wav && .venv/bin/python scripts/mixreport.py effects $D/cues.json $D
```

Then render it with the post chain and bring the audio to -15 LUFS (the clip has no pipeline mastering):

```bash
npx remotion render <Name> $D/raw.mp4 --props='{"post":true}' --gl=angle && ffmpeg -y -i $D/raw.mp4 -c:v copy -af loudnorm=I=-15:TP=-2:LRA=11 -c:a aac -b:a 320k -ar 48000 out/<name>.mp4
```

Check the result with `pipeline.glitch_frames` (no broken frames) before sending it, and delete `$TMPDIR/remotion-*`
afterwards (set `TMPDIR` to the scratch folder for these commands so the bundles land there).

## Deliver

Send `out/<slug>.mp4` to the user, with the report's misses and any unverified numbers. Do not say a check
passed unless the report shows it.
