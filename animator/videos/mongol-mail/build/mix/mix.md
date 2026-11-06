# mongol-mail: mix

Stems rendered by `pipeline.py mix` at their mix gain (`build/mix/voice.wav`, `music.wav`, `sfx.wav`); the music stem already carries the engine's ducking under the voice. BS.1770 loudness.

- Whole video: voice -16.3 LUFS, music -38.7 LUFS, sfx -23.8 LUFS, bed -24.2 LUFS, mix -15.9 LUFS
- Lowest line p10 margin: 3.1 LU (target ≥ 3)

## Per music section (integrated LUFS)

| section | time s | voice | music | sfx | bed | margin LU |
|---|---|---|---|---|---|---|
| upbeat | 0.00-19.80 | -16.3 | -40.4 | -27.0 | -28.0 | 11.7 |
| lounge | 19.80-33.80 | -15.7 | -40.0 | -23.0 | -24.7 | 9.0 |
| tension | 33.80-50.53 | -16.7 | -36.6 | -23.2 | -23.1 | 6.3 |
| upbeat | 50.53-58.10 | -16.1 | -38.8 | -23.4 | -23.6 | 7.6 |

## Per line: voice over the bed while it speaks

Momentary (400 ms) margin voice - bed over the line's words; a word with no bed under it counts as 40 LU.

| line | time s | speech median LU | p10 LU | quietest words (s) |
|---|---|---|---|---|
| 1: Marco Polo wrote that the Khan's letters raced t… | 0.00-5.37 | 17.2 | 13.7 | 1.93 (3.6), 1.70 (4.0), 2.13 (5.7) |
| 2: His riders went bound in tight bands, their belt… | 5.50-9.37 | 13.9 | 4.5 | 8.60 (3.4), 8.10 (4.3), 8.80 (7.0) |
| 3: But a horse at full gallop tires long before sun… | 9.50-12.13 | 21.3 | 3.3 | 11.27 (1.3), 11.63 (3.6), 10.90 (6.6) |
| 4: So every twenty-five miles, the Khan built a sta… | 12.27-16.20 | 22.6 | 7.0 | 12.60 (1.5), 13.13 (3.4), 14.20 (15.0) |
| 5: Some kept four hundred horses, half saddled, hal… | 16.30-19.77 | 21.4 | 5.5 | 18.20 (-0.6), 18.30 (4.1), 19.00 (4.5) |
| 6: Polo counted over ten thousand stations and thre… | 19.87-24.10 | 11.9 | 5.0 | 22.40 (2.6), 21.03 (3.5), 20.43 (4.3) |
| 7: And who supplied all those horses? The villages … | 24.20-27.37 | 22.7 | 19.1 | 26.20 (14.8), 26.63 (18.3), 26.93 (18.6) |
| 8: Four hundred horses? I have three goats! | 27.50-30.60 | 22.5 | 5.4 | 29.73 (2.7), 29.53 (4.8), 29.27 (10.6) |
| 9: Every rider also carried a paiza, a metal tablet… | 30.70-33.73 | 11.4 | 3.3 | 32.63 (1.4), 32.83 (2.0), 33.20 (3.9) |
| 10: If his horse broke down, anyone he met had to ha… | 33.87-36.77 | 8.6 | 3.4 | 36.33 (2.1), 35.03 (2.9), 36.07 (3.2) |
| 11: Hey! That's my horse! | 36.90-38.43 | 8.9 | 4.9 | 37.43 (3.9), 37.67 (6.8), 37.80 (7.5) |
| 12: You see, no horse ran far. Only the letter did. | 38.93-41.83 | 8.9 | 3.3 | 38.93 (0.3), 39.03 (2.5), 40.00 (4.1) |
| 13: The bells rang out long before the rider arrived… | 41.97-44.10 | 9.1 | 5.2 | 42.97 (2.8), 42.47 (5.7), 42.70 (6.6) |
| 14: So the next station saddled a fresh horse, and a… | 44.23-48.13 | 18.7 | 4.4 | 47.80 (1.9), 46.90 (2.5), 47.10 (3.5) |
| 15: The letter changed hands at a gallop and never s… | 48.27-50.50 | 6.9 | 3.1 | 48.27 (-2.2), 48.53 (2.7), 48.43 (4.2) |
| 16: Fruit picked one morning in the capital reached … | 50.60-54.70 | 22.2 | 5.7 | 54.13 (4.2), 53.80 (4.6), 53.60 (4.9) |
| 17: Every horse got tired. The letter never did. | 54.83-57.30 | 8.8 | 6.5 | 55.53 (2.6), 54.83 (5.7), 55.30 (5.8) |

## Effects over the rest of the mix

Momentary (400 ms) peak of each one-shot effect against the median of voice + music round it (looped effects are left out). Hot above +9 LU, buried under -8 LU.

- Hot (turn down): none
- Buried (turn up or cut): 240, 1112
- Same file stamped out (use foleyCues for takes): none

| frame | effect | volume | effect LU | rest LU | over the rest |
|---|---|---|---|---|---|
| 60 | sfx/pop.wav | 0.50 | -24.3 | -18.6 | -5.7  |
| 240 | foley/jingle/06.wav (outdoor) | 0.21 | -25.9 | -16.1 | -9.8 **buried** |
| 337 | foley/thud/03.wav (outdoor) | 0.57 | -18.3 | -15.9 | -2.4  |
| 345 | foley/thud/03.wav (outdoor) | 0.84 | -18.4 | -15.8 | -2.6  |
| 394 | sfx/pop.wav | 0.85 | -20.1 | -14.4 | -5.7  |
| 546 | sfx/pop.wav | 0.77 | -21.0 | -18.3 | -2.7  |
| 576 | sfx/pop.wav | 0.77 | -21.1 | -15.5 | -5.6  |
| 604 | foley/scrape/02.wav (room) | 0.30 | -23.9 | -16.7 | -7.2  |
| 634 | sfx/pop.wav | 0.55 | -19.1 | -15.5 | -3.6  |
| 635 | sfx/credit-blip.wav | 0.27 | -19.1 | -15.5 | -3.6  |
| 684 | sfx/pop.wav | 0.50 | -23.8 | -16.6 | -7.2  |
| 685 | sfx/credit-blip.wav | 0.14 | -23.8 | -16.5 | -7.3  |
| 889 | foley/thud/03.wav (outdoor) | 0.52 | -20.7 | -14.9 | -5.8  |
| 890 | sfx/chime.wav | 0.14 | -20.7 | -14.9 | -5.8  |
| 954 | sfx/pop.wav | 0.55 | -23.9 | -17.1 | -6.8  |
| 981 | sfx/chime.wav (room) | 0.31 | -17.7 | -16.1 | -1.5  |
| 1026 | foley/jingle/06.wav (outdoor) | 0.31 | -22.7 | -15.6 | -7.1  |
| 1090 | foley/thud/03.wav (outdoor) | 0.92 | -18.2 | -16.0 | -2.2  |
| 1112 | foley/jingle/06.wav (outdoor) | 0.19 | -26.7 | -14.8 | -12.0 **buried** |
| 1118 | sfx/riser.wav | 0.25 | -26.1 | -19.0 | -7.1  |
| 1168 | sfx/sting.wav | 0.40 | -19.7 | -18.3 | -1.4  |
| 1172 | foley/jingle/06.wav (outdoor) | 0.35 | -19.7 | -17.7 | -1.9  |
| 1201 | foley/jingle/01.wav (outdoor) | 0.28 | -20.3 | -15.0 | -5.3  |
| 1262 | foley/jingle/06.wav (far) | 0.44 | -25.2 | -19.2 | -5.9  |
| 1285 | foley/jingle/01.wav (far) | 0.36 | -20.8 | -14.5 | -6.3  |
| 1409 | foley/scrape/02.wav (outdoor) | 0.49 | -17.3 | -14.5 | -2.8  |
| 1409 | sfx/pop.wav | 0.77 | -17.3 | -14.5 | -2.8  |
| 1425 | foley/jingle/06.wav (outdoor) | 0.16 | -20.0 | -13.7 | -6.3  |
| 1452 | foley/jingle/01.wav (outdoor) | 0.13 | -23.1 | -20.0 | -3.2  |
| 1475 | sfx/whoosh.wav | 0.15 | -26.1 | -21.7 | -4.5  |
| 1479 | foley/jingle/02.wav (outdoor) | 0.13 | -25.8 | -19.8 | -6.0  |
| 1590 | foley/crunch/06.wav (room) | 0.14 | -26.4 | -20.5 | -5.8  |
| 1606 | sfx/pop.wav | 0.42 | -20.7 | -17.6 | -3.1  |
| 1612 | foley/munch/03.wav (room) | 0.50 | -20.6 | -15.7 | -4.9  |
| 1620 | foley/munch/06.wav (room) | 0.54 | -20.1 | -15.0 | -5.2  |
| 1629 | foley/munch/04.wav (room) | 0.51 | -20.7 | -15.6 | -5.1  |
| 1637 | foley/munch/02.wav (room) | 0.51 | -22.4 | -17.3 | -5.2  |
| 1650 | foley/jingle/06.wav (outdoor) | 0.32 | -22.3 | -16.7 | -5.6  |
| 1681 | foley/jingle/01.wav (outdoor) | 0.26 | -21.7 | -16.7 | -5.1  |
