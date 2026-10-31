import React, { useMemo } from "react";
import { Audio, interpolate, Sequence, staticFile } from "remotion";
import { CaptionChunk } from "../ui/Captions";

// Sound effects and music on the final timeline. Files live in public/sfx and public/music
// (regenerate with scripts/sfx_generate.py).

export type Sfx = { at: number; src: string; volume: number; until?: number }; // `until` loops the file up to that frame
export type MusicCue = { src: string; from: number; to: number; volume: number };

export const SFX_FILES = [
  "reel-spin", "reel-stop", "near-miss", "chime", "button", "bill-whirr", "credit-blip", "whoosh",
  "tape-stop", "hum", "stamp", "tick", "boom", "paper", "ambience",
  "pop", "drawer", "card", "door", "sting", "riser",
  "wind", "plop", "crackle", "chew",
  "crowd", "engine", "honk", "hiss", "steps",
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

export const SoundTrack: React.FC<{ sfx: Sfx[]; music: MusicCue[]; captions: CaptionChunk[]; total: number }> = ({ sfx: events, music, captions, total }) => {
  const mask = useMemo(() => speechMask(captions, total), [captions, total]);
  const duck = (f: number) => 1 - 0.7 * (mask[Math.min(mask.length - 1, Math.max(0, Math.round(f)))] ?? 0);
  return (
    <>
      {events.map((e, i) => (
        <Sequence key={i} from={Math.round(e.at)} durationInFrames={e.until !== undefined ? Math.max(1, Math.round(e.until) - Math.round(e.at)) : undefined} layout="none">
          <Audio src={staticFile(e.src)} volume={e.volume} loop={e.until !== undefined} />
        </Sequence>
      ))}
      {music.map((m, i) => {
        const dur = m.to - m.from;
        return (
          <Sequence key={`m${i}`} from={m.from} durationInFrames={dur} layout="none">
            <Audio
              src={staticFile(m.src)}
              loop
              volume={(f) => m.volume * duck(m.from + f) * interpolate(f, [0, 15, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
            />
          </Sequence>
        );
      })}
    </>
  );
};
