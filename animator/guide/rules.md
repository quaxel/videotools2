# Rules for every explainer video

Distilled from frame-by-frame study of three reference Shorts and two comparison rounds against our own output.
`scripts/pipeline.py report` measures the numeric ones; the rest are checked by eye on the contact sheet.

## Story (six beats)

1. **Hook, 0–3 s:** start mid-action at the strangest moment. First word "He", "It's" or "You". No intro, no channel name, no call to action.
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
- **Never** use ellipses (...) or one-word repeated sentences ("Seven. Seven."): Qwen pauses 1–2 s on them.
- At most one pause over 0.6 s, and only at the twist (use `pauseAfter` on that line).
- Dialogue is a separate line with its own speaker (`buddy`, `boss`, ...), one short line each.
- **Facts:** every number spoken as a fact must be backed by a sourced claim in `research.md`. Story numbers go in `plan.json` → `story_numbers`.

## Picture

- **Locations:** at least 8, each with its own dominant colour family. No colour above 40 % of the runtime. Re-light a location (warm, cold blue "truth", purple dream, night) to vary colour without a new set.
- **Characters:** at least 4; at least one costume change or new arrival carries the twist.
- **Shots:** cut to the voice. Average ≤ 2.2 s, none over 4 s. Every shot moves the camera (push-in, pull-back, drift, orbit).
- **Angles:** each video has at least one over-the-shoulder (the head in front ≤ 25 % of the frame, at the edge), one top-down, one low angle and one macro on an object.
- **Transitions:** hard cut inside a location; 8-frame whip pan (`true` in the shot list) when the location changes.
- **Explanation shots:** one idea per shot, readable in one second, at most 6 words of readable text per frame.
- **Characters touch the world:** they sit, hold, push, open, walk in profile. Not every shot is front-on.
- **Characters never pass through the set:** no puppet stands inside or walks through a counter, desk or prop
  (`pipeline.py collide` finds them).
- **Motion:** median frame-to-frame change ≥ 6 and fewer than 15 % near-still frame pairs (reference: 8.0 and 10 %).
  `Stage` adds camera push, hand-held drift and idle acting automatically (`energy`, default 1); use `energy={0}`
  only for shots that must hold perfectly still, and fix the stillest shots `pipeline.py motion` lists.

## Sound

- Music ducks under the voice; between words it sits at least 5 dB below speech.
- Every on-screen mechanical action gets an effect (click, thud, whirr, stamp, tick).
- Mix lands at -17 to -14 LUFS.

## Process

- Voice first: write `lines.json`, run `pipeline.py voice`, then cut shots to the printed line frames.
- Do not render the full video after every change. Type-check, look at stills, fix, and render once at the end.
