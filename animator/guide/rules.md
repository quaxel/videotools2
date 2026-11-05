# Rules for every explainer video

Distilled from frame-by-frame study of three reference Shorts and two comparison rounds against our own output.
`scripts/pipeline.py report` measures the numeric ones; the rest are checked by eye on the contact sheet.

## Story (six beats)

1. **Hook, 0–3 s:** start mid-action at the strangest moment. First word "He", "It's" or "You". No intro, no channel name, no call to action.
   The first 5 s are 3-4 quick, hard shots (0.8-1.2 s each), not one slow establishing move: the strange thing
   coming at the lens, a face reacting, the thing hitting something (a splash, a smash) and an impact with a camera
   jolt (`stamp` at low volume). Put the hero object close to the camera so it fills part of the frame.
2. **Small story:** one character in one concrete situation, told as "you" or in third person.
3. **Rise:** the character thinks they are winning.
4. **Twist:** the win is a trap. It arrives as an **event** (someone walks in, a door opens, a costume changes), not as information.
5. **Mechanism, last 20–35 %:** go behind the scenes. Explain the system only with **labelled physical props** in the scene (buttons, padlocks, switches, dials, wheels, stamps, counters, corkboards) with short UPPERCASE labels. No charts, arrows or floating numbers; numbers appear only on objects (a counter, a screen, a calendar).
6. **Ending:** loop back to the opening shot with a new victim, or land on one final word.

- **Seed:** the person or object the twist depends on is visible within the first 20 s.
- **Gags:** at least two physical actions (smack, fall, pop, spill, dive). Expression changes alone do not count. Aim for one visual joke every ~15 s.

## Script and voice

- **Word budget:** 180–210 words for 50–60 s. Target pace 190–215 words per minute.
- Sentences of 4–10 words, plain spoken English, concrete numbers ("2 minutes", "3 years").
- The narrator is excited and gripping, never a calm documentary read, even for history or mystery topics.
  Keep `pauseAfter` short (≤ 0.3 s) except at the twist and before the last on-screen line.
- Spell years out as words ("eighteen seventy-six") so Qwen reads them right, and put the spelled form in the
  sourced claim too, or the report's fact check flags it.
- **Never** use ellipses (...) or one-word repeated sentences ("Seven. Seven."): Qwen pauses 1–2 s on them.
- At most one pause over 0.6 s, and only at the twist (use `pauseAfter` on that line).
- Dialogue is a separate line with its own speaker (`buddy`, `boss`, ...), one short line each.
- **Facts:** every number spoken as a fact must be backed by a sourced claim in `research.md`. Story numbers go in `plan.json` → `story_numbers`.

## Picture

- **Locations:** at least 8, each with its own dominant colour family. No colour above 40 % of the runtime. Re-light a location (warm, cold blue "truth", purple dream, night) to vary colour without a new set.
- **Characters:** at least 4; at least one costume change or new arrival carries the twist.
- **Shots:** cut to the voice. Average ≤ 2.2 s, none over 4 s. Every shot moves the camera (push-in, pull-back, drift, orbit).
- **Angles:** each video has at least one over-the-shoulder (the head in front ≤ 25 % of the frame, at the edge), one top-down, one low angle and one macro on an object.
- **Transitions:** hard cut inside a location; 8-frame whip pan (`true` in the shot list) when the location changes; a 12-frame `"dissolve"` for a change of time in one place. A cut is always a shot boundary in the shot list (never a switch inside one shot component), so check, QA and sync see it.
- **Explanation shots:** one idea per shot, readable in one second, at most 6 words of readable text per frame.
- **Characters touch the world:** they sit, hold, push, open, walk in profile. Not every shot is front-on.
- **No action twice the same way:** an action a character repeats (a bite, a knock, a wave, a sip) differs each time
  in path, speed and the acting round it (lean, head, the free hand): eager then careful, straight then curved.
  Rhythmic motion (chewing, walking, hammering, nodding) drifts in pace and size from one beat to the next; a
  constant `sin` reads as a loop. Give the free hand something to do (on the cheek, patting, resting, gesturing).
- **Held props stay in sight:** a puppet seated behind a table needs the top at ≤ 0.45 m and its hands above it
  (reach y above about -450); a hand or a fork that dips behind the top vanishes for those frames.
- **Faces read on the stills:** check every expression close up. Contentment and eating read as `happy`;
  `excited` and `neutral` show wide round eyes that read as startled in a close shot.
- **Key small objects must read on a phone:** a prop the story hangs on (a coin, a piece of meat, a pill) may be
  drawn up to 2× its real size; say so in `plan.json` (`format_note`) when the real size is a sourced fact.
- **Sky shots are never an empty flat colour:** a dome sky, something moving in it (birds, falling objects, smoke)
  and a strong camera move (track the subject, tilt, zoom). Sky shots are the stillest in `motion`; fix them first.
- **Effects must not show through props:** smoke from a fire under a pot, steam in front of a hero object; check
  the macro stills for grey blobs over the subject.
- **No half heads:** a head is either whole in the frame or wholly out. Stage enforces it (library.md → `keepHeads`);
  the framing audit in `stills` should list only intended back-view crops. A head sliced off in a straight line inside
  the picture is the puppet's card, not the camera (the audit says "card of X cuts the drawing").
- **No camera jumps:** the camera never snaps between two frames of one shot except on an impact sound. Head framing
  is smoothed per shot by the framing pre-pass; animate camera moves with eased ramps, not steps.
- **Loop:** the last frame runs into the first (library.md → Seamless loop), so the Short replays without a jump.
- **Characters never pass through the set:** no puppet stands inside or walks through a counter, desk or prop
  (`pipeline.py collide` finds them).
- **Motion:** median frame-to-frame change ≥ 6 and fewer than 15 % near-still frame pairs (reference: 8.0 and 10 %).
  `Stage` adds camera push, hand-held drift and idle acting automatically (`energy`, default 1); use `energy={0}`
  only for shots that must hold perfectly still, and fix the stillest shots `pipeline.py motion` lists.

## Sound

- Music ducks under the voice; between words it sits at least 5 dB below speech.
- Every on-screen mechanical action gets an effect (click, thud, whirr, stamp, tick).
- **Effects sit in the scene, under the music, never on top of it:** a chew or a step -5 to 0 LU over voice + music,
  a bite or a clink -5 to +3, only a gag's big hit up to +6 (the effects table of `pipeline.py mix`). Nothing hot
  (> +9, it knocks), nothing buried (< -8). The user found chews at 0 to +4 too loud.
- **Organic and repeated sounds are recorded takes, never one file again and again:** chewing, steps, knocks,
  cutlery come from the foley library (`foleyCues`: a different take and level each time), on frames taken from the
  motion (`jawCloses`, `stepFrames`, `impactCues`), so the sound follows the action. Soft-attack sounds for soft
  actions: chewing is a wet munch, never a thump (`chew` knocks; do not use it for eating).
- **Every one-shot effect has the location's `space`** (`room`, `hall`, `outdoor`, `far` for what happens far off).
- **No effect starts in the last 8 frames** unless it carries over the loop seam on purpose: it is cut into a click.
- Mix lands at -17 to -14 LUFS.

## Process

- Voice first: write `lines.json`, run `pipeline.py voice`, then cut shots to the printed line frames.
- Do not render the full video after every change. Type-check, look at stills, fix, and render once at the end.
- `pipeline.py` deletes the Remotion temp bundles each command leaves behind (~190 MB per still/render run). If you
  call `npx remotion` directly, delete `$TMPDIR/remotion-*` from that run afterwards, or the disk fills up.
