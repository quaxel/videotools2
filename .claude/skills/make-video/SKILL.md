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
message and continue unless they object.

## 5. Scene → `src/videos/<slug>/Scene.tsx` (+ `props.tsx` for new props)

For a location the kit does not already have, research it first (library.md → New locations: research references
first): look at 3-5 photo references in the browser, write `guide/references/<set>.md`, then build the set from it.
Reuse existing sets where they fit (`LakeSet`, `SpaceBaseSet`, `AlleySet`).

Write the shot list against the printed frames: cut on line and caption boundaries, average ≤ 2.2 s, none
over 4 s, whip (`true`) on location changes. Use `Room` + kit props for new locations, and a different mood per
location. Put the seed on screen by its line. Add SFX for every mechanical action and MUSIC cues.
Puppets are lit by the set (library.md → Puppet lighting): leave `lighting` on. Ambient room colour does not
change them; where a shot has a strong source (fire, lamp, headlights) pass a Stage `light` with that point or distant light. Outdoors, reuse `LakeSet` or its pieces (`Campfire`,
`SmokePlume`, `Pine`, `Ridge` + `Haze` with parallax) and truck the camera sideways in front of distant backdrops.

```bash
.venv/bin/python scripts/pipeline.py check <slug>
```

Fix until it passes (tsc + contiguous shots + no shot over 4 s).

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

## 7. Render once, then report

```bash
.venv/bin/python scripts/pipeline.py render <slug>
```

```bash
.venv/bin/python scripts/pipeline.py report <slug>
```

The report (`videos/<slug>/report.md`) lists every target with ok/MISS and any spoken number without a
sourced claim. Fix cheap misses (one more render at most); report the rest to the user honestly.

## Deliver

Send `out/<slug>.mp4` to the user, with the report's misses and any unverified numbers. Do not say a check
passed unless the report shows it.
