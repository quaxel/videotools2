---
name: make-video
description: Produce a 50-60 s vertical explainer cartoon (the "why X secretly works like this" Shorts format) end to end in animator/ - research, script, Qwen TTS voice, Remotion + three.js scene code, review, render and a measured report. Use when the user asks for a new video on a topic, e.g. "/make-video why airlines overbook flights".
---

# Make an explainer video

Work in `animator/`. Per-video files live in `../videos/<slug>/`, renders in `../output/`. `pipeline.py X` means
`.venv/bin/python scripts/pipeline.py X`; it runs the deterministic stages, you write research, plan, script and scene.

This file is the procedure; each rule lives once elsewhere:
- `guide/rules.md`: every rule the video must meet. Read Story and Script before step 3, Picture and Sound before step 5.
- `guide/library.md`: the API reference. Look up the section you need, never the whole file. Shared helpers (`ease`,
  `mix`, `rand`, `wide`, `widePath`, `solveReach`, …) come from the engine; never re-define them.

**Pipeline.** `status <slug>` shows each stage done / stale / missing and the next command. `go <slug>` runs the
missing and stale stages up to `motion` (`--to report --2k` through render and report, `--plan` to preview) and stops
on a failed check or sync, a pace or colour miss, a collision or a missing approval. Approvals: `go` runs `voice`
only with `approve <slug> script` and `render` only with `approve <slug> stills` (step 4 runs `voice` by hand, then
approves); each lapses when its file changes and is refused while its targets miss, unless `--force`, which needs
the user's OK. `web` opens the panel at http://127.0.0.1:8766.

## 1. Scaffold

`pipeline.py new <slug> "<topic>"`, with a short kebab-case slug.

## 2. Research → `research.md`

No topic or a broad one: run **ideate** (`/ideate 5 <theme>`) and let the user pick; without the ideation app,
propose 5 topics not in `ls ../videos/` and ask. Search the web and open what you cite. One paragraph on the mechanism,
then `## Claims` (`- <claim with its number> — <URL>`): every factual number in the script is a claim, and a number
with no source, one source only or disagreeing sources stays out. End with `## Left out`: what you dropped and why.

## 3. Plan → `plan.json`

Every field, against rules.md → Story and Picture: title, mechanism (one sentence), the seven beats, `triple_hook`
(`visual`, `verbal`, `text`), seed (what, first line index), locations (id, set, colour), characters with looks, gags,
`story_numbers`, and the labelled prop for each mechanism idea. `year`: negative for BC, `[from, to]` for a span,
`null` for today. For the past, decide each character's whole costume here, head to feet plus what they carry
(rules.md → Costumes fit the year); the scene builds it, it does not choose it.

## 4. Script → `lines.json`

One line per sentence pair; dialogue as its own speaker with a voice under `voices` (Qwen: Ryan, Aiden, Eric, Dylan,
Uncle_Fu male; Vivian, Serena female). Rules: rules.md → Script and voice, and Story (first line = `triple_hook.verbal`
with 2-3 stressed words to cut the hook beats on; the closing line hands over to it).

Run `pipeline.py voice <slug>`. It prints each line's frames and writes the pace to `build/pace.json`; on a miss it
prints a fix per metric and fails. Fix `lines.json` now (more words, shorter `pauseAfter`, `tempo` +0.05) and re-run
(unchanged lines are cached): after the scene exists a re-voice moves every cut. `pace <slug>` re-measures only. Show
the user the script and numbers in one message, go on unless they object, and record `approve <slug> script`.

## 5. Scene → `src/videos/<slug>/Scene.tsx`

`.venv/bin/python scripts/scaffold.py <slug>` writes `Scene.tsx` and `camera_plan.md` cut to the voice (hook beats,
9-12 shots, dips, loop, `post` and `steady`); it passes `check` as written. Start from it, never from an older video. Replace every `// TODO(author)`; `--force` overwrites both
files, so use it only before editing.

1. **Camera.** Fill in `camera_plan.md` (rules.md → Camera moves, Depth), then adjust the shot list (rules.md → Story 1,
   Shots, Transitions). Inside a shot, `beatPath` keys each subject on the frame its name is spoken.
2. **Sets.** Reuse library.md → Set kit where it fits. A new location: 3-5 photo references first, written up in
   `guide/references/<set>.md` (library.md → New locations); build room → light → puppets → camera with a still after
   each step, naming what still differs. `pipeline.py look <slug> <refs> [frames]` puts our stills beside them.
3. **Hook.** 2-3 hook beats in the first 3 s; the first is the triple hook with `triple_hook.text` as a `Headline`
   (`at` ≤ 9) (rules.md → Story 1).
4. **Puppets.** Looks from the plan, with the period check (library.md → Puppets); acting and staging per rules.md →
   Picture. Leave `lighting` on; a Stage `light` only for a strong source (library.md → Puppet lighting).
5. **Props.** Kit pieces for boxes and slabs; the **sand3d-model** skill for a prop the viewer must know by its
   silhouette (car, boat, animal, instrument). Physics for falls (`physics.mjs`, `pipeline.py physics`), particles
   for dust and sparks, `GodRays` for sunbeams (library.md has each).
6. **Sound** (rules.md → Sound; library.md → Foley). A missing sound: search the shared library first,
   `node ../../video-tools/sound-library/kutuphane.mjs liste <word>`, then propose CC0 files (name, page, size) and
   download only on the user's yes; a site that blocks scripts goes to the user, into `sound-library/_gelen/`. Catalog
   it with `kutuphane.mjs ekle <file> --kategori <k> --baslik "<title>" --lisans <l> --kaynak <url> --yazar <who>`,
   then `foley.py import <name> lib:<glob>`. Own score:
   library.md → The video's own score.

Then fix until each passes: `pipeline.py check <slug>` (tsc, shot list, kit costume pieces against `year`; a look
right on purpose gets `// period-ok: <why>`), `sync <slug>` (fix every error and every unintended warning) and `mix
<slug>` (fix every hot, buried or repeated row in `build/mix/mix.md`; a 15 ms click measures low, so raise it).

## 6. Review on stills

`pipeline.py stills <slug>` renders a still per second plus each shot's start, middle and end into `build/stills/`
with `framing.txt` and `colour.txt`. Every framing line is a fix or an intended crop opted out in code
(`userData.audit = false`, `crop`, `heads={false}`); an edge crowd is reframed, bled off the edge, thinned or shaded.
A colour miss stops `go`: recolour the named shots (the sheet is within ~6 points of the MP4, so `CLOSE` is a warning).

The review is not yours: start `video-reviewer: <slug>, round <n>`, or, if you cannot start agents, stop and report the
sheet. It writes `build/mistakes_<round>.md` (your notes go in your report). Fix high, then medium, and re-check all
of a round's fixes in one `stills <slug> --shots 3,7` (~30 s; a frame list costs ~95 s even for 1-3 frames). At most
3 rounds; on "ready" go on.

- `collide <slug>` (~7 min): puppets inside set objects, in `build/collide/collide.txt`. Move the spot, split a
  `stroll` around the obstacle, or wrap overlapping smoke and held props in `<group userData={{ ghost: true }}>`.
  Re-check with `--shots`; one full pass again before the approval.
- `motion <slug>` (~4 min): a 30 % draft with motion per shot (rules.md → Motion), the exact colour and the QA in
  `build/qa-draft/`. A set vanishing for a frame or a camera jump inside a shot is a fault; a face change is not.
  `--shots` redoes only those shots.
- A new hardest shot (new set, physics gag, main event): render it as a clip first, `npx remotion render "$(node
  scripts/bundle.mjs)" <slug> $D/hard.mp4 --frames=<a>-<b> --props='{"post":true}' --gl=angle` (`$D` a scratch
  folder), and look for stiff acting, popping and clipping.

## 7. Render and report

After the last fix, run `stills <slug>` for the full sheet, have the reviewer look, and `approve <slug> stills` on a
"ready" verdict or the user's OK. Then `pipeline.py render <slug> --2k` (1440x2560; broken shots re-render
themselves) and `pipeline.py report <slug>`. Look at every pop in `build/qa/` and the sheets of every gag and mechanism
shot. A later fix to some shots: `render <slug> --2k --shots 3,7`, naming every shot whose picture changed. Fix cheap
report misses (one more render at most) and report the rest honestly.

## 8. YouTube metadata → `youtube.md`

English, in exactly this shape (the uploader parses it):

```markdown
# YouTube metadata — <slug>

## Title
<hook-style, ≤ 100 characters with emoji and " #Shorts">

## Description
<one-line hook>

<one paragraph with the key sourced numbers>

<a question to the viewer> 👇

Sources:
• <publisher, what it supports>: <url>

<history only: "Animated historical re-enactment; characters' looks are illustrative.">

#Shorts #<5-6 topic hashtags>

## Tags
<15-25 comma-separated search phrases, ≤ 500 characters>
```

Only facts from research.md's claims, and no `<` or `>`. Then `.venv/bin/python ../uploader/server.py --import <slug>`.
Keep `../videos/<slug>/`: ideate compares new ideas with its `plan.json`.

## Coordinating author agents

- Brief each author with the story's year, place and every named character's whole costume, checked against
  references.
- Run `video-reviewer` on each author's first full sheet, after each fix round (at most 3) and on the final sheet
  before `approve stills`. Read its summary and the stills of its high findings yourself; show the user what it
  marked uncertain.
- At most two authors, started a few minutes apart: the heavy stages share `out/heavy.lock`, so "waiting for the
  heavy-stage lock" is expected.

Short clips and single stills: library.md → Short clips and stills outside the pipeline.

## Deliver

Send `../output/<slug>.mp4` with the report's misses and any unverified numbers. Never say a check passed unless the
report shows it.
