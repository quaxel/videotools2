# kings-sticks: mix

Stems rendered by `pipeline.py mix` at their mix gain (`build/mix/voice.wav`, `music.wav`, `sfx.wav`); the music stem already carries the engine's ducking under the voice. BS.1770 loudness.

- Whole video: voice -16.8 LUFS, music -38.2 LUFS, sfx -24.2 LUFS, bed -25.7 LUFS, mix -16.5 LUFS
- Lowest line p10 margin: 3.0 LU (target ≥ 3)

## Per music section (integrated LUFS)

| section | time s | voice | music | sfx | bed | margin LU |
|---|---|---|---|---|---|---|
| mystery | 0.00-19.33 | -16.5 | -38.7 | -22.3 | -24.3 | 7.8 |
| tension | 19.33-38.87 | -16.7 | -38.5 | -24.9 | -26.5 | 9.8 |
| mystery | 38.87-44.23 | -15.5 | -35.2 | -26.4 | -30.2 | 14.6 |
| lounge | 44.23-55.10 | -17.1 | -40.0 | -24.2 | -24.3 | 7.1 |
| mystery | 55.10-58.87 | -21.2 | -36.3 | -25.9 | -29.2 | 8.0 |

## Per line: voice over the bed while it speaks

Momentary (400 ms) margin voice - bed over the line's words; a word with no bed under it counts as 40 LU.

| line | time s | speech median LU | p10 LU | quietest words (s) |
|---|---|---|---|---|
| 1: It's gone. The Queen's necklace vanished from a … | 0.00-2.73 | 13.0 | 6.8 | 2.13 (5.3), 2.30 (6.2), 2.03 (6.3) |
| 2: Every door was bolted. So the thief is one of th… | 2.87-6.27 | 21.8 | 5.0 | 4.87 (0.8), 5.07 (4.5), 5.23 (5.3) |
| 3: The King locks them in and hands each guard the … | 6.37-9.57 | 21.3 | 4.1 | 8.47 (-0.0), 8.70 (2.4), 8.17 (3.5) |
| 4: These are my wizard's sticks. Tonight, the thief… | 9.67-15.13 | 17.4 | 4.4 | 12.87 (-4.2), 12.97 (-0.7), 10.50 (1.0) |
| 5: One guard can't stop grinning. | 15.23-16.50 | 24.1 | 21.3 | 15.23 (20.4), 15.67 (20.9), 15.97 (21.9) |
| 6: Then measure mine first! | 16.63-18.37 | 16.5 | 4.2 | 17.73 (2.6), 17.27 (3.1), 16.83 (12.6) |
| 7: Tomorrow. | 18.47-19.20 | 23.5 | 22.3 | 18.47 (21.7) |
| 8: All night, the guards stare at their sticks. | 19.30-22.00 | 19.3 | 14.8 | 20.97 (13.7), 21.43 (14.0), 21.27 (15.5) |
| 9: At midnight, one measures his against the floor … | 22.13-25.00 | 9.6 | 3.9 | 24.10 (2.1), 24.30 (3.1), 23.80 (3.6) |
| 10: Another holds his up to a snoring friend's stick… | 25.10-27.10 | 8.4 | 3.6 | 26.53 (2.4), 26.93 (3.4), 25.80 (5.7) |
| 11: But the grinning guard hides his stick inside hi… | 27.23-29.43 | 12.3 | 6.0 | 29.07 (4.9), 28.90 (6.2), 28.57 (8.4) |
| 12: Just before sunrise, a faint scraping comes from… | 29.53-32.93 | 10.7 | 3.0 | 30.30 (-1.1), 30.70 (2.4), 30.83 (2.9) |
| 13: By morning, the guards lay their sticks side by … | 33.03-35.50 | 22.0 | 19.8 | 34.40 (18.9), 35.13 (19.4), 34.00 (19.6) |
| 14: Eleven match perfectly. One is shorter. | 35.60-38.33 | 23.4 | 4.5 | 37.90 (3.3), 37.77 (6.3), 37.57 (10.9) |
| 15: That's impossible! It was supposed to grow! | 38.87-41.33 | 22.3 | 18.4 | 38.87 (16.3), 40.37 (17.9), 40.13 (18.2) |
| 16: He freezes. Too late. | 41.47-42.67 | 14.5 | 6.1 | 41.57 (4.2), 41.47 (12.6), 42.27 (12.7) |
| 17: The necklace. | 42.80-44.13 | 14.9 | 12.5 | 43.17 (11.6), 42.80 (15.6) |
| 18: Here's the trick. These were never a wizard's st… | 44.23-46.93 | 7.9 | 3.9 | 44.23 (-1.1), 46.37 (3.0), 44.63 (3.7) |
| 19: They came from the palace woodshed. No stick cou… | 47.07-49.70 | 20.3 | 4.2 | 47.80 (3.7), 48.47 (4.0), 47.60 (5.4) |
| 20: So the innocent guards had no reason to touch th… | 49.83-52.33 | 13.5 | 4.3 | 50.10 (1.6), 49.83 (3.4), 51.23 (5.6) |
| 21: Only the thief believed. So he shaved one inch o… | 52.47-54.97 | 8.4 | 4.6 | 53.07 (3.5), 53.70 (3.8), 53.87 (3.9) |
| 22: The King never measured anything. The thief did … | 55.10-58.07 | 14.2 | 7.1 | 57.83 (5.1), 55.37 (6.6), 55.20 (6.7) |

## Effects over the rest of the mix

Momentary (400 ms) peak of each one-shot effect against the median of voice + music round it (looped effects are left out). Hot above +9 LU, buried under -8 LU.

- Hot (turn down): none
- Buried (turn up or cut): 890, 1576
- Same file stamped out (use foleyCues for takes): none

| frame | effect | volume | effect LU | rest LU | over the rest |
|---|---|---|---|---|---|
| 0 | sfx/whoosh.wav | 0.35 | -21.2 | -15.4 | -5.7  |
| 14 | sfx/stamp.wav (hall) | 0.22 | -21.0 | -14.4 | -6.7  |
| 55 | sfx/bolt.wav (hall) | 0.60 | -21.8 | -16.4 | -5.4  |
| 67 | sfx/stamp.wav (hall) | 0.30 | -22.0 | -15.5 | -6.5  |
| 152 | sfx/pop.wav | 0.70 | -21.8 | -17.2 | -4.7  |
| 254 | foley/thud/03.wav (hall) | 0.67 | -18.8 | -16.8 | -2.0  |
| 257 | foley/thud/05.wav (hall) | 0.57 | -18.8 | -16.8 | -2.0  |
| 308 | sfx/whoosh.wav | 0.45 | -19.3 | -17.7 | -1.6  |
| 386 | sfx/pop.wav | 0.55 | -23.9 | -22.7 | -1.3  |
| 514 | sfx/whoosh.wav | 0.60 | -16.8 | -12.6 | -4.2  |
| 670 | foley/thud/03.wav (hall) | 0.62 | -21.3 | -14.4 | -7.0  |
| 722 | foley/thud/03.wav (hall) | 0.48 | -20.0 | -17.4 | -2.6  |
| 723 | sfx/chime.wav | 0.18 | -20.0 | -17.4 | -2.6  |
| 755 | foley/snore/01.wav (hall) | 0.44 | -27.0 | -20.1 | -6.9  |
| 786 | foley/snore/02.wav (hall) | 0.43 | -24.0 | -16.9 | -7.1  |
| 804 | foley/thud/05.wav (hall) | 0.28 | -21.0 | -18.0 | -2.9  |
| 806 | foley/thud/03.wav (hall) | 0.33 | -21.0 | -18.2 | -2.8  |
| 858 | sfx/paper.wav (room) | 0.40 | -24.2 | -17.9 | -6.3  |
| 890 | foley/scrape/02.wav (room) | 0.30 | -23.9 | -15.7 | -8.2 **buried** |
| 1137 | sfx/sting.wav | 0.50 | -19.6 | -16.3 | -3.4  |
| 1244 | sfx/whoosh.wav | 0.22 | -23.3 | -17.2 | -6.1  |
| 1250 | sfx/tape-stop.wav | 0.12 | -23.3 | -17.9 | -5.3  |
| 1318 | sfx/clink.wav (hall) | 0.30 | -20.7 | -23.7 | 3.1  |
| 1323 | sfx/whoosh.wav | 0.30 | -20.7 | -23.7 | 3.0  |
| 1361 | foley/thud/03.wav (room) | 0.33 | -27.2 | -19.7 | -7.4  |
| 1391 | sfx/pop.wav | 0.70 | -21.8 | -17.0 | -4.8  |
| 1424 | sfx/whoosh.wav | 0.40 | -20.4 | -16.9 | -3.4  |
| 1454 | sfx/pop.wav | 0.70 | -21.8 | -17.5 | -4.4  |
| 1491 | sfx/whoosh.wav | 0.30 | -22.8 | -18.7 | -4.1  |
| 1500 | foley/snore/01.wav (hall) | 0.22 | -22.6 | -19.2 | -3.4  |
| 1540 | sfx/pop.wav | 0.35 | -24.7 | -17.5 | -7.2  |
| 1541 | sfx/credit-blip.wav | 0.20 | -24.7 | -17.6 | -7.1  |
| 1576 | foley/scrape/02.wav (room) | 0.28 | -24.5 | -15.2 | -9.3 **buried** |
| 1620 | sfx/pop.wav | 0.60 | -22.8 | -16.7 | -6.1  |
| 1649 | sfx/whoosh.wav | 0.20 | -26.4 | -21.4 | -5.0  |
| 1738 | sfx/whoosh.wav | 0.30 | -22.8 | -23.1 | 0.3  |
