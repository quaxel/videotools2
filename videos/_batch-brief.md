# Batch brief (coordinator notes for every video in this batch)

Read `.claude/skills/make-video/SKILL.md` and follow it end to end in `animator/`, plus `guide/rules.md` and `guide/library.md`.
The most recent finished example in the same house style is `src/videos/microwave-candy-bar/` (Scene.tsx, props.tsx)
and `../videos/microwave-candy-bar/` (research, plan, lines, camera_plan): copy its structure, its `wide()/path()`
camera helper and its `solveReach` helper.

## The hook comes first (the user's priority)

- Frame 0 must already show the strange thing moving, big enough to read on a phone, with the camera already moving
  onto it. Do not open on a wide establishing view with a small subject.
- The first sentence is a paradox that sounds impossible, 12-18 words, with "you" or a loss where it fits.
- The headline (`Headline`, `at` ≤ 9, `size` about 70 so it takes 2 lines) does a different job from the sentence.
  It must not cover the subject or a face: keep the hero object and faces below the top 25 % of the frame.
- Check the first 4 stills (frames 2, 15, 45, 75) before anything else and write in `build/mistakes_1.md` whether
  each of the three channels is live and readable by frame 15.

## Lessons from microwave-candy-bar (each cost a round)

1. **Camera distance.** The cut-out heads are big, so a medium shot needs the camera about 3 m from the subject
   (2 m frames a head and shoulders). Pull every key back from its target (the `wide(c, k)` helper with K ≈ 1.5) and
   use k ≈ 1.0-1.25 only for real close-ups.
2. **Foreground objects.** Place them with `frameSpot` at ≥ 1.1 m and a small scale, at the frame corner. A
   foreground placed from the end camera of a shot whose camera moves a lot drifts into the middle of the frame, so
   drop it in such shots.
3. **keepHeads pans the camera.** When a puppet's head nears the edge, the framing pass pans, and a label at the
   other edge gets cut. Keep labelled props within about 0.5 m of the main puppet, or leave the label off in shots
   after the prop has been labelled once.
4. **Seated puppets** (user rule, now in SKILL.md): `sit: true` on a seat whose top is at `HIP_HEIGHT` (0.34 m),
   with `at` at the seat's front edge. Never stand a puppet inside a sofa or chair.
5. **Held props must be held.** A prop the story hangs on (a stamp, a tool, a bag) is at `handWorld` of a reach that
   actually reaches it, or it rests on something. A hand drawn on the card behind a prop is hidden. Never let a prop
   float or move on its own. When an arm cannot reach, build a mounted mechanism (a press, a lever) instead.
6. **Gestures end.** Hands thrown over a face for a shock come down again in 1-1.5 s. Check every shot for a pose
   stuck past its moment.
7. **Things rest on things.** No prop hovers above its base (an oven over its scale) and no label floats above a top.
8. **Puppets behind props.** A puppet standing in front of the bench that holds the gag hides the gag. Put the cast
   behind the bench (top ≤ 0.65 m) and the gag on the bench in front of them.
9. **Effects vs speech.** Keep effects that land under spoken words at or below about -6 LU over the voice. Then check
   the mix report's `Lowest line p10 margin` (target ≥ 3 LU) before rendering, not after.
10. **After the render, read the QA sheets** (`build/qa/sheet_*.jpg`) of every shot with a gag or a mechanism, not
    only the pops.

## Reporting

- Stop after your first full `stills` sheet that passes your own checks (before collide, motion and render). Report
  the sheet's path, the 4 hook stills, the round's mistakes file and anything you are unsure of. Then wait for the
  coordinator's review.
- After the review, finish: collide, motion, mix, the full stills, approval, render `--2k`, report, `youtube.md`
  (no CC BY credits: the user adds them), the uploader import. Your final report gives the report's misses, the QA
  pops you looked at, buried or hot effects, and anything you skipped.
- Do not commit. Do not edit other videos' folders. Shared kit or engine changes only when unavoidable; say so.
- Never write the company or brand names the idea's notes exclude.
