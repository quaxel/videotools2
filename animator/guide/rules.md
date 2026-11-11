# Rules for every explainer video

The house style: a fast hook, then a slow camera travelling through one 3D world per shot, a cream dip between
locations, and a loop back to the opening picture. Each rule is in one place, here; the pipeline gates or reports it
at the first stage that can know it, and the rest is checked by eye.

## Story (seven beats)

Two or three quick hook beats, then nine to twelve shots, one location each; the story beats sit on the shots as below
(shot numbers for a 10-shot video, percentages of the runtime).

1. **Hook (the hook beats and shots 1-3):** the first word at frame 0, no intro, no channel name. The first sentence
   states the premise as a paradox, something that sounds impossible; the hook is 5-23 words (aim 16) and ends at
   about 4-5 s.
   **Fast opening:** the first 3 s are 2-3 beats of the strange event, 0.7-1.5 s each, hard cuts (`false`) between
   them, all over by 3.5 s: the thing coming at the lens, a face reacting, the impact or the result. Each is a
   different picture of the event, at its peak from its first frame, with the camera already moving, the hero object
   close to the lens. They are separate shot-list entries cut on the words of the first sentence, may share one set
   and do not count towards the 9-12 shots; then the slow camera takes over.
   **Triple hook:** by frame 15 (0.5 s) all three channels are live at once, each doing a different job:
   - *Visual — "what is happening?"*: the strange thing is in frame and already moving or changing at frame 0
     (a streak in the sky, something falling, a thing in the wrong place); the camera move carries onto it, it does
     not arrive late.
   - *Verbal — "why should I care?"*: the first sentence, from frame 0, a question or a claim that sounds impossible,
     tied to the viewer where it can be ("you", a cost, a loss, a near miss).
   - *Text — "what is this about?"*: a `Headline` in shot 1, `at` ≤ 9 (readable by frame 12, settled by frame 17):
     the video's label, question or a contrasting angle, 2-6 words on at most 2 lines, whole in the frame, clear of
     the captions and not over the hero object, a face or a hat. Never the spoken words: "WHAT IF IT HIT ELSEWHERE?"
     over "The asteroid that killed the dinosaurs may have hit the unluckiest spot on Earth" is right.
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
7. **Closing line:** 5-19 words (about 9) that land the story. No outro, no call to action.
   **The video loops** (a replay counts towards the view percentage): the last shot ends on the opening picture,
   with the first beat's camera, the strange thing back in its frame-0 state and the opening light, and no dip, fade
   or held end picture. The closing line and the first sentence read as one thought, and the music's end meets its
   start. Check the last still beside the first and the `loop seam` that `motion` prints.

- Escalation reads as but / then / so; one idea per sentence, concrete numbers and names.
- **Seed:** the person or object the pivot depends on is visible within the first 20 s.
- **Gags:** at least two physical actions (smack, fall, pop, spill, dive). Expression changes alone do not count. Aim for one visual joke every ~15 s.

## Script and voice

- **Word budget:** 180–210 words for 50–60 s. Target pace 190–215 words per minute.
- Sentences of 4–10 words, plain spoken English, concrete numbers ("2 minutes", "3 years").
- The narrator is excited and gripping, never a calm documentary read, even for history or mystery topics.
- Spell years out as words ("eighteen seventy-six") so Qwen reads them right, and put the spelled form in the
  sourced claim too, or the report's fact check flags it.
- **Never** use ellipses (...) or one-word repeated sentences ("Seven. Seven."): Qwen pauses 1–2 s on them.
- **Pauses:** `pauseAfter` ≤ 0.3 s, except about 0.4 s on the line before the pivot and on the line before the
  closing line; only the pre-pivot one may go over 0.6 s; none on the closing line.
- **Pace** (gated at `voice`): duration, words, wpm, `long_pauses`, and `speech_cover` ≥ 82 % on the voice track.
- Dialogue is a separate line with its own speaker (`buddy`, `boss`, ...), one short line each.
- **Facts:** every number spoken as a fact must be backed by a sourced claim in `research.md`. Story numbers go in `plan.json` → `story_numbers`.

## Picture

- **Locations:** at least 8, no two neighbouring locations in the same colour family, at least 5 families over the
  video, none above 40 % of the runtime. Re-light a location (warm, cold blue "truth", purple dream, night) to vary colour without a new set.
- **Characters:** at least 4.
- **Shots:** after the hook beats, 9-12, one location each (average 4-7 s, none under 1.5 s or over 10 s). A shot ends on
  a real sentence end from the voice timing. Inside a shot the camera does not cut: it carries from one subject to the next (`beatPath`).
- **Transitions:** a 12-frame (0.4 s) cream `"dip"` at every change of location; a 12-frame `"dissolve"` for a change
  of time in one place; hard cuts (`false`) between the hook beats and into shot 1, and after that at most one in the whole video, kept for the one moment
  that needs a jolt.
  New videos do not use the whip (`true`; `check` warns on one). Every transition is a shot boundary in the shot list (never a switch inside
  one shot component), so check, QA and sync see it.
- **Camera speed:** mostly slow and smooth. Every shot has net travel, about 10 % of the frame width per second
  (25-40 % travel or push over a shot); ease in at the start, ease out to rest at the end, almost no wobble (`Video`
  `steady`). No sudden tilt or snap unless the story needs one; a jolt only on an impact sound.
- **Camera moves:** about half push-ins, a third crane moves (rising or sinking), a fifth sideways tracks. Inside a
  location the camera travels from subject to subject and reaches each as the narrator names it (`beatPath`, keys
  on the word frames). Write the plan per shot in `../videos/<slug>/camera_plan.md`: time, location, path start → end,
  move type, foreground / midground / background objects and the in-world labels.
- **Depth:** the subject sharp in the midground, the background softly blurred, and in most shots a foreground object
  close to the lens (Stage `foreground` + `frameSpot` from the shot's first camera, at ≥ 1.1 m, small, at one frame
  corner, 10-25 % of the frame). The foreground never covers a face or a label; over a third of the frame is an audit
  fault (the framing audit reports both). An over-the-shoulder head stays under 25 % of the frame (checked by eye;
  the audit never counts puppets as foreground). Drop it in a shot whose camera travels a lot: it drifts into the middle of
  the frame. A foreground *behind* a head that seems to grow out of it
  is not reported: look for it.
- **Z-depth:** no two surfaces at the same depth (a sign, decal or poster flush on a wall, a patch on a floor, boxes
  sharing a face): they z-fight and flicker. Lift the front one 1-2 cm off, or give its material `polygonOffset`.
  The framing audit reports `z-fighting:` pairs and shots missing a depth layer (`depth:`).
- **Explanation shots:** one idea per shot, readable in one second, at most 6 words of readable text per frame.
- **Characters touch the world:** they sit, hold, push, open, walk in profile. Not every shot is front-on.
- **No action twice the same way:** an action a character repeats (a bite, a knock, a wave, a sip) differs each time
  in path, speed and the acting round it (lean, head, the free hand): eager then careful, straight then curved.
  Rhythmic motion (chewing, walking, hammering, nodding) drifts in pace and size from one beat to the next; a
  constant `sin` reads as a loop. Give the free hand something to do (on the cheek, patting, resting, gesturing).
- **Held props stay in sight:** a puppet seated behind a table needs the top at ≤ 0.45 m and its hands above it
  (reach y above about -450); a hand or a fork that dips behind the top vanishes for those frames.
- **Held props are held:** a prop the story hangs on (a stamp, a tool, a bag) is at the hand of a reach that actually
  reaches it, or rests on something; never floating beside the hand or moving on its own. When an arm cannot reach,
  build a mounted mechanism (a press, a lever).
- **Tools are used, visibly:** a puppet using a tool (playing, hammering, driving, drinking, sawing) has its hands on
  it and moving in every shot and camera angle, never hanging or frozen while the tool moves on its own. Build it
  with `puppet/tools.ts`; for a 3D prop send the hand to it with `worldR` / `worldL` (library.md → Puppets).
- **Seated puppets sit:** a puppet on a sofa, chair, bench or stool takes `sit: true` (or `sitDown`) on a seat whose
  top is at `HIP_HEIGHT` (0.34 m), with `at` 1-3 cm in front of the seat's front edge, so the knees and shins are
  drawn in front of the seat and the feet rest on the floor. A seat behind the puppet's `at` hides the legs and reads
  as a figure standing inside the furniture. `sit: true` hangs the card legs straight down through the cushion, so give
  every sitter `noLegs: true` and build its legs in world space: thighs over the cushion, knees past the front edge,
  shins down to the floor (`seatLegs` / `SeatedLegs` in `src/videos/cabin-pressure/cabin.tsx`; `collide` skips
  seated puppets, so check side and low angles on full-size stills). Keep a table in front clear of the feet; check the first still of every
  seated shot.
- **Cast behind the gag:** a puppet standing in front of the bench or board that holds the gag or the label hides
  it. Put the cast behind it (a bench top ≤ 0.65 m) and the gag in front of them.
- **Gestures end:** a shock or gesture pose (hands over the face, arms up, a point) comes down again within
  1-1.5 s.
- **Crowds move on the shot's clock:** troops, crowds and walks are timed from the shot's first frame, not the
  video's, or they have marched off before the shot starts.
- **Faces read on the stills:** check every expression close up. Contentment and eating read as `happy`;
  `excited` and `neutral` show wide round eyes that read as startled in a close shot.
- **Key small objects must read on a phone:** a prop the story hangs on (a coin, a piece of meat, a pill) may be
  drawn up to 2× its real size; say so in `plan.json` (`format_note`) when the real size is a sourced fact.
- **Sky shots are never an empty flat colour:** a dome sky, something moving in it (birds, falling objects, smoke)
  and a clear camera move (track the subject, tilt, crane). Sky shots are the stillest in `motion`; fix them first.
- **Effects must not show through props:** smoke from a fire under a pot, steam in front of a hero object; check
  the macro stills for grey blobs over the subject.
- **Nothing half visible:** every head (people, animals, crowd figures, hats included) and every piece of text
  (signs, labels, headlines, boards) is whole in the frame or wholly out, through the whole shot, camera moves
  included, and clear of the caption band. Stage keeps puppet heads whole (`keepHeads`); the framing audit in `stills`
  reports the rest (library.md → Framing audit), and every hit is a fix or an intended crop opted out in code
  (`userData.audit = false`, a puppet's `crop`, a model's `heads={false}`). A head sliced in a straight line inside
  the picture is the puppet's card ("card of X cuts the drawing").
- **No camera jumps:** the camera never snaps between two frames of one shot except on an impact sound. Head framing
  is smoothed per shot by the framing pre-pass; animate camera moves with eased ramps, not steps.
- **Painted, not rendered:** flat colour fills with soft cel bands; no grain, gloss, bevels or reflections in
  materials and textures (the fine paper grain the approved look lays over the whole picture is the only grain). Big
  surfaces (walls, floors, crates, hulls) carry painted wear in their `canvasTexture`: stains, chips, scratches, a
  gentle gradient on walls. A spotless flat fill reads as a placeholder.
- **Light follows the story:** warm and bright from the hook to the conflict, deeper and bluer at the pivot, and a slow drift of light inside long shots (a sun patch sliding, a lamp flickering, dusk coming on).
- **Nothing blows out:** bloom, god rays or a point light never turn a table, a cloth, a face or a wall into flat
  white.
- **Character size:** a speaking puppet's body is 40-60 % of the frame height in a medium shot, 70 %+ in a close
  shot. A wide shot is the exception, not the default. The cut-out heads are big, so a medium shot needs the camera
  about 3 m from the subject: pull every key back with `wide(c, k)` / `widePath(keys, f)` (default k 1.5), k ≈
  1.0-1.25 only for a real close-up.
- **Labels stay near the cast:** when a head nears the edge, `keepHeads` pans the camera and can push a label at
  the other edge out. Keep labelled props within about 0.5 m of the main puppet, or leave the label off once the
  prop has been labelled.
- **Costumes fit the year:** for a story set in the past, every piece of every look, head to feet, and everything
  a character holds belongs to the plan's `year`, place and the character's rank or trade (an 1815 marshal:
  bicorne, braided coat, breeches, boots). The costume is decided in `plan.json`, built with the period check
  (library.md → Puppets) and tested by `check` for kit pieces; a piece the kit lacks is built in the video's folder,
  not taken from the nearest kit piece. Women wear
  long hair (`long: true`).
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
- **Motion:** median frame-to-frame change ≥ 3 and at most 30 % near-still frame pairs (`pipeline.py motion`). `Stage`
  adds a push and idle acting automatically (`energy`, default 1; with `steady` almost no drift); use `energy={0}`
  only for shots that must hold perfectly still. Give the stillest shots `motion` lists more net travel (up to 40 % of
  the frame width) or more puppet and secondary action, never wobble.

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
- **No effect starts in the last 8 frames:** it is cut into a click (`sync` warns).
- **Effects never drown a word:** an effect under spoken words stays at or below about -6 LU over the voice; the mix
  report's `Lowest line p10 margin` is at least 3 LU.
- Mix lands at -17 to -14 LUFS.

## Process

- A gate is passed by fixing it or by `approve <slug> script|stills --force` with the user's OK, never by going on
  to the render.
- Do not render the full video after every change. Type-check, look at stills, fix, and render once at the end.
- Test small first: one still, then a short clip of the hardest shot when it is new (a new set, a physics gag, the
  main event), then the full video.
- Judge by eye. A check can pass while the picture still looks wrong; then say what is different in plain words and
  fix that, not the number.
- Fix from a list, not at random: the `video-reviewer` agent (`.claude/agents/video-reviewer.md`), not the author,
  reviews each stills sheet and writes `../videos/<slug>/build/mistakes_<round>.md` (numbered: time or frame, shot,
  problem, severity high / medium / low). Fix high first, one shot at a time, and look at the new frame of each fix
  before calling it fixed. At most 3 review rounds; all fixes of a round go into one `stills --shots` run.
- After the render, read the QA sheets (`build/qa/sheet_*.jpg`) of every shot with a gag or a mechanism, not only
  the listed pops.
- **Facts on screen:** every date, name and number in a label, sign or `Headline` matches the script and is spelled
  right.
