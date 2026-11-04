import React, { useMemo } from "react";
import { Audio, getInputProps, interpolate, Sequence, staticFile } from "remotion";
import { CaptionChunk } from "../ui/Captions";

// Sound effects and music on the final timeline. Files live in public/sfx and public/music
// (regenerate with scripts/sfx_generate.py) and public/foley (recorded or varied sounds, scripts/foley.py).

// Where a sound happens: the effect plays with that place's reflections (`room` a small furnished room, `hall` a big
// hard one, `outdoor` open air with a far slap, `far` across a field: duller and mostly reflections). Baked by
// scripts/foley.py into public/space/<space>/<src> for the cues that use it (pipeline.py makes them before sync,
// mix and render). Never on a looped cue: a reflection tail would break its seam.
export type Space = "room" | "hall" | "outdoor" | "far";
// `until` loops the file up to that frame. `hit` (0..1) jolts the camera on the cue like the library's impact sounds
// (boom, stamp ...) do, for an impact from the foley library or the physics bake.
export type Sfx = { at: number; src: string; volume: number; until?: number; space?: Space; hit?: number };
// The file a cue actually plays: its own (`src`, also what the sync check, the QA and the camera jolt read) or the
// baked version for its space.
export const playedSrc = (e: Sfx) => (e.space && e.until === undefined ? `space/${e.space}/${e.src}` : e.src);
// `loop` (default true) repeats a library loop over the cue; `fade` (default true) eases it in and out. A video's own
// score (`score` on Video) plays once, cut to the picture, with neither.
export type MusicCue = { src: string; from: number; to: number; volume: number; loop?: boolean; fade?: boolean };

export const SFX_FILES = [
  "reel-spin", "reel-stop", "near-miss", "chime", "button", "bill-whirr", "credit-blip", "whoosh",
  "tape-stop", "hum", "stamp", "tick", "boom", "paper", "ambience",
  "pop", "drawer", "card", "door", "sting", "riser",
  "wind", "plop", "crackle", "chew",
  "crowd", "engine", "honk", "hiss", "steps",
  "rumble", "river", "falls", "splash", "crack", "creak",
  "tank", "compressor", "squeak", "morse", "battle", "deflate", "hooves", "munch",
  "scrape", "snore", "clink", "bolt",
  // `chew` is two hard thumps and knocks when repeated: use foleyCues("munch", jawCloses(...)) for a puppet eating.
] as const;
export const sfx = (name: (typeof SFX_FILES)[number]) => `sfx/${name}.wav`;
// lounge: light and cheeky; mystery: dark, curious; upbeat: bright hook energy; tension: pulsing build to a reveal.
export const MUSIC_FILES = { lounge: "music/lounge.wav", mystery: "music/mystery.wav", upbeat: "music/upbeat.wav", tension: "music/tension.wav" } as const;

// Music ducks under the voice: a mask from caption spans, smoothed so the bed eases back in.
const speechMask = (captions: CaptionChunk[], total: number) => {
  const mask = new Float32Array(total + 1);
  for (const c of captions) for (let f = c.from; f < c.to && f < mask.length; f++) mask[f] = 1;
  const smooth = new Float32Array(mask.length);
  for (let f = 0; f < mask.length; f++) {
    let sum = 0;
    let n = 0;
    for (let k = -10; k <= 10; k++) if (f + k >= 0 && f + k < mask.length) (sum += mask[f + k]), n++;
    smooth[f] = sum / n;
  }
  return smooth;
};

// `stem` (input prop, `pipeline.py mix` / STEM=... scripts/sound.mjs) keeps one part, so a preview composition that
// plays a SoundTrack without Video can be measured too.
export const SoundTrack: React.FC<{ sfx: Sfx[]; music: MusicCue[]; captions: CaptionChunk[]; total: number }> = ({ sfx: all, music: allMusic, captions, total }) => {
  const { stem, cueDump } = getInputProps() as { stem?: "voice" | "music" | "sfx"; cueDump?: boolean };
  const events = stem && stem !== "sfx" ? [] : all;
  const music = stem && stem !== "music" ? [] : allMusic;
  // scripts/cues.mjs reads this when the composition is not a Video (a preview): its effects and music, no shots.
  if (cueDump) console.log("[soundtrack] " + JSON.stringify({ sfx: all, music: allMusic }));
  const mask = useMemo(() => speechMask(captions, total), [captions, total]);
  const duck = (f: number) => 1 - 0.7 * (mask[Math.min(mask.length - 1, Math.max(0, Math.round(f)))] ?? 0);
  return (
    <>
      {events.map((e, i) => (
        <Sequence key={i} from={Math.round(e.at)} durationInFrames={e.until !== undefined ? Math.max(1, Math.round(e.until) - Math.round(e.at)) : undefined} layout="none">
          <Audio src={staticFile(playedSrc(e))} volume={e.volume} loop={e.until !== undefined} />
        </Sequence>
      ))}
      {music.map((m, i) => {
        const dur = m.to - m.from;
        const fade = m.fade ?? true;
        return (
          <Sequence key={`m${i}`} from={m.from} durationInFrames={dur} layout="none">
            <Audio
              src={staticFile(m.src)}
              loop={m.loop ?? true}
              volume={(f) => m.volume * duck(m.from + f) * (fade ? interpolate(f, [0, 15, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 1)}
            />
          </Sequence>
        );
      })}
    </>
  );
};
