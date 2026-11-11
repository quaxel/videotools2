# Audience analytics

Generated 2026-11-10T21:39:24+00:00 by `uploader/server.py --analytics-report`. 8 uploaded videos, 4 with YouTube Analytics data. Private channel data: keep this file out of git.

## Videos, best average percentage viewed first

`avg %` = averageViewPercentage (can pass 100 when a Short loops). `ret` columns = share of viewers still watching at that point (audienceWatchRatio; above 100% means rewatches). `engaged %` = engagedViews / views, a rough stand-in for Studio's “viewed vs swiped away”, which the API does not expose. Views depend on the video's age (`days`); `avg %` and the retention columns mostly do not.

| video | series | days | views | engaged % | avg % | avg s | ret 3 s | ret 25% | ret 50% | ret 100% | likes | comments | shares | subs | avg_shot | wpm | motion | hook words |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| coin-edge | other | 1 | 696 | 47.6 | 68.3 | 40 | 113% | 79% | 65% | 33% | 15 | 0 | 0 | 1 | 1.74 | 207 | 8.2 | 7 |
| disposable-razors | other | 6 | 1431 | 53.5 | 67.5 | 39 | 116% | 84% | 66% | 38% | 22 | 0 | 0 | 1 | 1.34 | 192 | 11 | 13 |
| ghost-army | other | 6 | 1492 | 47.1 | 66.2 | 17 | 118% | 77% | 56% | 40% | 17 | 0 | 0 | 1 | 1.35 | 189 | 8.3 | 9 |
| dog-nose | other | 5 | 1 | 0 | 0 | 0 |  |  |  |  | 0 | 0 | 0 | 0 | 1.58 | 128 | 11.1 | 9 |
| cabin-pressure | other | 0 | 999 |  |  |  |  |  |  |  |  |  |  |  | 4.71 | 202 | 9.1 | 17 |
| deserve-box | other | 0 | 1107 |  |  |  |  |  |  |  |  |  |  |  | 5.05 | 210 | 13.6 | 15 |
| endless-feast | other | 0 | 41 |  |  |  |  |  |  |  |  |  |  |  | 4.9 | 214 | 11.8 | 13 |
| thames-tide | other | 0 | 838 |  |  |  |  |  |  |  |  |  |  |  | 1.66 | 205 | 11.3 | 11 |

## By series

Series comes from the slug: `what-if-*` = what-if, `*-sign` = zodiac, everything else = other.

| series | videos | mean avg % | median avg % | mean ret 3 s | mean views | read as |
| --- | --- | --- | --- | --- | --- | --- |
| other | 4 | 50.5 | 66.9 | 116% | 905 | too small to read (fewer than 5 videos) |

## What moves average percentage viewed

Pearson r between averageViewPercentage and one production metric at a time (−1 … +1; the sign says the direction, not the cause). Under 5 videos the number is noise; under about 20 treat even a strong r as a hint to test, not a rule.

| production metric | videos | r | read as |
| --- | --- | --- | --- |
| average shot length (s) | 4 | -0.25 | too small to read (fewer than 5 videos) |
| words per minute | 4 | +0.98 | too small to read (fewer than 5 videos) |
| motion score | 4 | -0.59 | too small to read (fewer than 5 videos) |
| words in the first line | 4 | +0.13 | too small to read (fewer than 5 videos) |
| still share (%) | 4 | +0.35 | too small to read (fewer than 5 videos) |
| speech cover (%) | 4 | +0.91 | too small to read (fewer than 5 videos) |

## Hooks, best first

| video | avg % | ret 3 s | hook words | hook |
| --- | --- | --- | --- | --- |
| coin-edge | 68.3 | 113% | 7 | Scissors bite into a silver coin's rim, a sliver of silver flies at the lens; the clipper grins; the sliver drops into a jar with a clink. |
| disposable-razors | 67.5 | 116% | 13 | Macro: a $10 razor pack swings on its peg toward the lens; you grab it grinning; the $10 tag stamps on; you cheer WHAT A BARGAIN. |
| ghost-army | 66.2 | 118% | 9 | A Sherman's barrel swings at the lens at dawn; an enemy observer lowers his binoculars; a GI slaps the hull and it wobbles like jelly; four GIs lift the whole tank over their heads |
| dog-nose | 0 |  | 9 | Your eyes snap open, your nose twitches and coffee and pizza scent ribbons fly at the lens. |
| cabin-pressure |  |  | 17 | When the oxygen masks drop, the most dangerous thing on the plane is how good you feel: Barry giggles under the swinging masks. |
| deserve-box |  |  | 15 | The muddy tournament winner slams his trophy down in front of three sealed caskets; the camera glides onto the gold one as his I DESERVE IT gauge whips to red: the gold box promises him exactly what he deserves. |
| endless-feast |  |  | 13 | Mid-feast: a servant rolls in a drum taller than himself, four drummers pound, the Shah bellows LOUDER, and his JOY needle drops a notch on every beat. |
| thames-tide |  |  | 11 | A sack stencilled LIME tumbles off a barge and splashes brown water at the lens; the MP holds his nose; Parliament's river front in the heat haze; a sewer arch gushing. |
