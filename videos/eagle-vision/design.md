# Design loop — eagle-vision

Every set and character is scored on the design board (composition `EagleVisionDesign`, stills with the post chain and
puppet lighting on) before production. Threshold: **8/10 per asset**, at most 5 rounds, independent fresh reviewers.

## Rubric (0-2 each, 10 total)
1. **Reads in 1 s** at phone size in 9:16: subject clear, silhouette readable, not cluttered.
2. **Pixar look**: rounded forms, smooth soft shading, warm bounce light, depth/haze, rich dressing; 3D, not flat.
3. **Colour identity**: its dominant colour differs from the neighbouring locations; pleasing palette.
4. **Story prop legible**: the gag object (golden eye, fly, bird, nose-pick window, DOOR glass, pigeon) reads instantly.
5. **Holds up at weird angles**: the low / top-down / macro / Dutch / telephoto view looks intentional, no holes, no floating parts.

## Rounds
### Round 1-3 (self-check, not scored)
Round 1: trees and lamps blocked Emma, Buddy and the café shots; dog-themed paw poster in the bedroom; fly a red blob;
mirror hidden behind curtains; pigeon macro cut. Fixed: StreetSet `clear` range for verge objects, `paw` option, mirror on the
left wall, fly proportions and `wall` pose, camera re-aims. Round 3 added Buddy and the pigeon to the aftermath.

### Scored rounds (two fresh reviewers each, entries split 1-12 / 13-24)
| round | board | A | B | average | main findings |
| --- | --- | --- | --- | --- | --- |
| 1 | r4 | 5.8 | 5.8 | 5.8 | gag props missing or illegible: fly, eagle anatomy, mug, wave; cropped faces; verge objects blocking |
| 2 | r6 | 5.2 | 6.1 | 5.65 | fly not a fly, mirror empty, eagle blocky, DOOR cropped, stray pole through DOOR |
| 3 | r7 | 5.8 | 6.6 | 6.2 | pigeon missing from frames, bonk streaks on glass, Alex half head |
| 4 | r9 | 5.9 | 6.75 | 6.3 | bonk and low door worst; macro/HUD shots flat |
| 5 | r12 | 6.25 | 7.2 | 6.7 | fly still weak (4), bird anatomy (5), bonk no impact (5), pigeon back hole in aftermath (6) |

| 6 (polish) | r13 | 6.2 | 6.8 | 6.5 | fly rebuilt (veined wings, striped thorax, compound eyes), eagle beak hooked, glass crack + dizzy stars, bedroom blob removed; reviewers still: Emma arm across face (5), Alex cropped in door shot (5), HUD shots flat, eagle wings/tail joins |

**Status: the threshold of 8/10 was not reached** (5 rounds, then one polish round at the user's request; scores plateau 6.2-6.7, about +-0.5 reviewer noise). Best frames: door low angle 9, Buddy 9, pigeon macro 8,
Alex frozen 8, mirror (reflection with gold eyes) now reads. Open defects carried into production staging: fly silhouette,
eagle head/beak, bonk impact beat (add squash + glass flare), pigeon back mesh, Alex half head in the door shot.
Skin tones unified (Alex f6d2b0, Jenkins f0c4a0, Emma eab48c). Puppet cut-out style is the shared approved look and was not changed.

### Targeted fixes after round 6 (user request, not re-scored)
- Mirror: real Alex fully in frame from behind; the reflection is a front-view Alex with the same hanging arms, gold irises, a gold halo in the glass and a gold light pool on the floor in front of the mirror.
- Emma: two-shot uses her front view, arm out to the side clear of her face, eyes and head toward Buddy; Buddy turned to face her and looks up. Wave shot has her arm straight up with Buddy at her feet.
- Door shot: Alex fully in frame at the left, the whole word DOOR clear.
- Eagle: shoulder balls where the wings attach, tail rebuilt as seven overlapping leaf feathers from a rounded base, tip feathers brown not black.
- HUD: neutral cool vignette (no brown corners), faint scan lines, a soft gold centre glow and a glass highlight; clouds behind the eagle in both sky shots.

- Mirror reflection masked to the glass: new `PuppetPlacement.mask` (world-space ellipse, tested along the view ray); the mirror was made taller (glass runs below the floor line) so both sneakers stay inside; nothing of the reflection spills outside the frame.
- Mirror frame no longer sinks into the floor: replaced the tall oval by an arch-top standing mirror (`MirrorArch`) with a flat base flush on the floor; the puppet mask gained an arch shape (`archBottom`).
- The reflection card lies in the mirror surface (`PuppetPlacement.fixedYaw` = the mirror normal) instead of turning to the camera, so it foreshortens with the glass.
