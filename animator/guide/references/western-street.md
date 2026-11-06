# Frontier main street at sunset (WesternTownSet)

Built for the duel scene (`src/scenes/DuelPreview.tsx`, compositions `DuelPreview` and `DuelAnim`), from general
knowledge of 1870s-1880s western boom-town streets and western film framing. No photos were copied.

## Details that make it read
- False-front wooden buildings: a tall square or stepped facade hiding a lower gable roof, a sign board across it.
- Clapboard / board-and-batten walls in weathered, faded paint (ox-blood red, grey-blue, mustard, raw brown).
- Raised plank boardwalks on both sides, porch roofs on thin posts over them.
- Hitching rails, a water trough, barrels; a water tower and a windmill at the edge of town.
- Telegraph poles with a sagging wire along one side.
- A wide, rutted dirt street with hoof prints; tumbleweed.
- Beyond the last buildings: open desert, mesas and buttes on the horizon.

## Palette and light
- Low sun at the end of the street (the street axis), hot yellow-orange disc with bloom; sky violet at the top,
  through magenta and coral to gold at the horizon (Codex-painted `public/backdrops/western/sky.png`).
- Mid-distance rocks, saguaros and windmill as a chroma-keyed strip (`rocks.png`, keyed in the set).
- Shadows stretch toward the camera. Puppets lit with `duskLight()`: a hot rim from behind, violet sky fill.

## Framing in 9:16
- One-point perspective down the street: facades converge to the sun, the frame stacks ground, figure, sun, sky.
- Low camera (~0.4 m), hero in profile as a soft foreground on the left, the opponent sharp in mid-frame with the
  sun beside him (Stage `focus` puts the lens on him rather than the nearest puppet).
