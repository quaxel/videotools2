# Rules for every explainer video

Distilled from frame-by-frame study of three reference Shorts and two comparison rounds against our own output;
story, cutting and camera since replaced by the 3D-story house style (a slow camera travelling through one 3D world
per shot, a cream dip between locations). `scripts/pipeline.py report` measures the numeric ones; the rest are
checked by eye on the contact sheet.

## Story (seven beats)

Nine to twelve shots, one location each; the beats sit on the shots as below (shot numbers for a 10-shot video,
percentages of the runtime).

1. **Hook (shots 1-3):** the first word at frame 0, no intro, no channel name. The first sentence states the premise
   as a paradox, something that sounds impossible; the hook is 5-23 words (aim 16) and ends at about 4-5 s. The
   picture is one continuous camera move onto the strange thing (the visual hook: what moves or changes on screen),
   not a burst of cuts. Put the hero object close to the camera so it fills part of the frame.
   **Triple hook:** by frame 15 (0.5 s) all three channels are live at once, each doing a different job:
   - *Visual — "what is happening?"*: the strange thing is in frame and already moving or changing at frame 0
     (a streak in the sky, something falling, a thing in the wrong place); the camera move carries onto it, it does
     not arrive late.
   - *Verbal — "why should I care?"*: the first sentence, from frame 0, a question or a claim that sounds impossible,
     tied to the viewer where it can be ("you", a cost, a loss, a near miss).
   - *Text — "what is this about?"*: a `Headline` in shot 1, fully in by frame 12: the video's label, question or a
     contrasting angle, 2-6 words on at most 2 lines. Never the words of the spoken sentence (the captions already
     show those); "WHAT IF IT HIT ELSEWHERE?" over "The asteroid that killed the dinosaurs may have hit the unluckiest
     spot on Earth" is right, the same sentence in caps is not.
   - Test: cover any one channel and the other two still pull; if two channels say the same thing, rewrite one.
   - Balance: when the picture alone is startling, keep the headline short (2-3 words) and let the picture lead.
   - Nothing waits: no fade from black, no title card, no slow reveal before the three are on screen.
2. **But (shot 4):** the obstacle.
3. **Then (shot 5):** what was tried, or what happened next.
4. **Conflict (shot 6):** the complaint, the cost, who is unhappy.
5. **Pivot, at 53-87 %:** "You see, ..." — the real reason, told by the narrator. Show it only with **labelled
   physical props** in the scene (buttons, padlocks, switches, dials, wheels, stamps, counters, corkboards) with short
   UPPERCASE labels. No charts, arrows or floating numbers; numbers appear only on objects (a counter, a screen, a
   calendar).
6. **So..., at 80-93 %:** the consequence.
7. **Closing line:** 5-19 words (about 9) that land the story. No outro, no call to action, no loop back to the start.

- Escalation reads as but / then / so; one idea per sentence, concrete numbers and names.
- **Seed:** the person or object the pivot depends on is visible within the first 20 s.
- **Gags:** at least two physical actions (smack, fall, pop, spill, dive). Expression changes alone do not count. Aim for one visual joke every ~15 s.

## Script and voice

- **Word budget:** 180–210 words for 50–60 s. Target pace 190–215 words per minute.
- Sentences of 4–10 words, plain spoken English, concrete numbers ("2 minutes", "3 years").
- The narrator is excited and gripping, never a calm documentary read, even for history or mystery topics.
  Keep `pauseAfter` short (≤ 0.3 s) except before the pivot and before the closing line.
- Spell years out as words ("eighteen seventy-six") so Qwen reads them right, and put the spelled form in the
  sourced claim too, or the report's fact check flags it.
- **Never** use ellipses (...) or one-word repeated sentences ("Seven. Seven."): Qwen pauses 1–2 s on them.
- At most one pause over 0.6 s, and only before the pivot (use `pauseAfter` on the line before "You see").
- Dialogue is a separate line with its own speaker (`buddy`, `boss`, ...), one short line each.
- **Facts:** every number spoken as a fact must be backed by a sourced claim in `research.md`. Story numbers go in `plan.json` → `story_numbers`.

## Picture

- **Locations:** at least 8, each with its own dominant colour family. No colour above 40 % of the runtime. Re-light a location (warm, cold blue "truth", purple dream, night) to vary colour without a new set.
- **Characters:** at least 4.
- **Shots:** 9-12, one location each (average 4-7 s, none under 1.5 s or over 10 s). A shot ends on a real sentence end
  from the voice timing. Inside a shot the camera does not cut: it carries from one subject to the next (`beatPath`).
- **Transitions:** a 12-frame (0.4 s) cream `"dip"` at every change of location; a 12-frame `"dissolve"` for a change
  of time in one place; at most one hard cut (`false`) in the whole video, kept for the one moment that needs a jolt.
  New videos do not use the whip (`true`). Every transition is a shot boundary in the shot list (never a switch inside
  one shot component), so check, QA and sync see it.
- **Camera speed:** mostly slow and smooth. Every shot has net travel, about 10 % of the frame width per second
  (25-40 % travel or push over a shot); ease in at the start, ease out to rest at the end, almost no wobble (`Video`
  `steady`). No sudden tilt or snap unless the story needs one; a jolt only on an impact sound.
- **Camera moves:** about half push-ins, a third crane moves (rising or sinking), a fifth sideways tracks. Inside a
  location the camera travels from subject to subject and reaches each as the narrator names it (`beatPath`, keys
  on the word frames). Write the plan per shot in `../videos/<slug>/camera_plan.md`: time, location, path start → end,
  move type, foreground / midground / background objects and the in-world labels.
- **Depth in every shot:** a foreground object close to the lens (blurred), the subject sharp in the midground, the
  background softly blurred (Stage `foreground` + `frameSpot`, the post chain's depth of field focused on the subject).
  The foreground never covers a face or a label.
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
  and a clear camera move (track the subject, tilt, crane). Sky shots are the stillest in `motion`; fix them first.
- **Effects must not show through props:** smoke from a fire under a pot, steam in front of a hero object; check
  the macro stills for grey blobs over the subject.
- **No half heads:** a head is either whole in the frame or wholly out. Stage enforces it (library.md → `keepHeads`);
  the framing audit in `stills` should list only intended back-view crops. A head sliced off in a straight line inside
  the picture is the puppet's card, not the camera (the audit says "card of X cuts the drawing").
- **No camera jumps:** the camera never snaps between two frames of one shot except on an impact sound. Head framing
  is smoothed per shot by the framing pre-pass; animate camera moves with eased ramps, not steps.
- **Painted, not rendered:** flat colour fills with soft cel bands; no grain, gloss, bevels or reflections. Big
  surfaces (walls, floors, crates, hulls) carry painted wear in their `canvasTexture`: stains, chips, scratches, a
  gentle gradient on walls. A spotless flat fill reads as a placeholder.
- **Light follows the story:** warm and bright from the hook to the conflict, deeper and bluer at the pivot, and a slow drift of light inside long shots (a sun patch sliding, a lamp flickering, dusk coming on).
- **Character size:** a speaking puppet's body is 40-60 % of the frame height in a medium shot, 70 %+ in a close
  shot. A wide shot is the exception, not the default.
- **The main event happens in steps:** the thing the story is about (a collapse, a launch, a lift) is shown as
  cause and effect, not a jump between two states: a small first move, a shudder, the big move, then dust or debris
  (`Burst`, physics) and someone reacting. One idea per shot still holds; give the event two or three shots.
- **Secondary motion:** something besides the camera and the speaker moves in most shots: cloth, a curtain, a rope,
  water ripples, smoke, dust in a light beam, a sign swinging.
- **The world reacts:** background people turn, point or flinch when the main event happens; nobody stands frozen.
- **Act on the words:** a label or number appears on the word that says it, the thing happens on its verb, the
  camera arrives at a subject as it is named. Timing is per line (`voice` prints each line's frame span); place a
  word inside its line by its position in the text. A gesture or face change lands on the stressed word, and the
  video uses 3-5 different expressions that follow the script's emotion.
- **Nothing floats or flickers:** every prop rests on something or is mounted; no black voids under buildings or in
  openings; no limbs without a body, no feet sliding on the floor; nothing pops in, stretches or intersects.
- **The camera stays clear:** never inside a wall or prop, nothing passes through the lens, no pole, lamp or prop
  crosses a face or sits behind a head as if growing from it. Every move eases out to rest, never stops with a
  jolt.
- **Characters never pass through the set:** no puppet stands inside or walks through a counter, desk or prop
  (`pipeline.py collide` finds them).
- **Motion:** median frame-to-frame change ≥ 3 and at most 30 % near-still frame pairs. Provisional: the old 6 / 15 %
  came from fast, hand-held references; recalibrate from the first video made with the slow camera. `Stage` adds a
  push and idle acting automatically (`energy`, default 1; with `steady` almost no drift); use `energy={0}` only for
  shots that must hold perfectly still, and give the stillest shots `pipeline.py motion` lists more net travel.

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
- **No effect starts in the last 8 frames:** it is cut into a click.
- Mix lands at -17 to -14 LUFS.

## Process

- Voice first: write `lines.json`, run `pipeline.py voice`, then cut shots to the printed line frames.
- Do not render the full video after every change. Type-check, look at stills, fix, and render once at the end.
- Test small first: one still, then a short clip of the hardest shot when it is new (a new set, a physics gag, the
  main event), then the full video.
- Judge by eye. A check can pass while the picture still looks wrong; then say what is different in plain words and
  fix that, not the number.
- Fix from a list, not at random: write every problem found on the stills or a render to
  `../videos/<slug>/build/mistakes_<round>.md` (numbered: time or frame, shot, problem, severity high / medium / low),
  fix high first, one shot at a time, and look at the new frame of each fix before calling it fixed.
- Facts on screen: every date, name and number in a label, sign or `Headline` matches the script and is spelled
  right.
- `pipeline.py` deletes the Remotion temp bundles each command leaves behind (~190 MB per still/render run). If you
  call `npx remotion` directly, delete `$TMPDIR/remotion-*` from that run afterwards, or the disk fills up.
