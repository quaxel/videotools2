import React, { createContext, useContext } from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import { CaptionChunk, Captions } from "../ui/Captions";
import { Shot, ShotList, useFinalFrame } from "./clock";
import { MusicCue, Sfx, SoundTrack } from "./sound";
import type { Viseme } from "../puppet/Puppet";

// The whole video: shots, the narration track, effects + ducked music, and word-synced captions.
export type Timing = {
  fps: number;
  totalFrames: number;
  captions: CaptionChunk[];
  words: Record<string, number[][]>; // per speaker: [fromFrame, toFrame] for each spoken word
  lines?: { i: number; speaker: string; text: string; from: number; to: number }[];
  mouth?: Record<string, string>; // per speaker: one digit 0-9 per frame, how open the mouth is (from the voice)
};

// What the shots can read about the whole video: the voice timing and the effect cues.
const VideoContext = createContext<{ timing: Timing; sfx: Sfx[] } | null>(null);

export const Video: React.FC<{ slug: string; timing: Timing; shots: Shot[]; sfx: Sfx[]; music: MusicCue[] }> = ({ slug, timing, shots, sfx, music }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <VideoContext.Provider value={{ timing, sfx }}>
      <ShotList shots={shots} />
    </VideoContext.Provider>
    <Audio src={staticFile(`videos/${slug}/voice.wav`)} />
    <SoundTrack sfx={sfx} music={music} captions={timing.captions} total={timing.totalFrames} />
    <Captions chunks={timing.captions} />
  </AbsoluteFill>
);

// True while `speaker` is saying a word at this final frame (drives mouthOpen).
export const speaking = (timing: Timing, speaker: string, finalFrame: number) =>
  (timing.words[speaker] ?? []).some(([a, b]) => finalFrame >= a && finalFrame < b + 2);

// Accents: the stressed syllables a speaker hits, from the mouth track (a loud onset after a quieter stretch).
// At most one every 14 frames, and each gets one kind of beat gesture, chosen by a hash so a speaker varies them.
export type Beat = "nod" | "arm" | "lean";
const BEATS: Beat[] = ["nod", "arm", "nod", "lean", "arm"];
const accentCache = new WeakMap<Timing, Record<string, { at: number; beat: Beat }[]>>();
const accentsOf = (timing: Timing) => {
  const cached = accentCache.get(timing);
  if (cached) return cached;
  const out: Record<string, { at: number; beat: Beat }[]> = {};
  for (const [speaker, track] of Object.entries(timing.mouth ?? {})) {
    const list: { at: number; beat: Beat }[] = [];
    for (let k = 3; k < track.length; k++) {
      const v = Number(track[k]);
      const before = Math.min(Number(track[k - 1]), Number(track[k - 2]), Number(track[k - 3]));
      if (v >= 7 && before <= 4 && (!list.length || k - list[list.length - 1].at >= 14)) {
        list.push({ at: k, beat: BEATS[(k * 7 + speaker.length * 3) % BEATS.length] });
      }
    }
    out[speaker] = list;
  }
  accentCache.set(timing, out);
  return out;
};

// A beat gesture's shape over the frames after its accent: a quick rise, a small overshoot back, then rest.
const beatCurve = (dt: number) => (dt < 0 || dt > 30 ? 0 : Math.sin(dt * 0.38) * Math.exp(-dt / 7));

// Every word a speaker says with its frame span, from the line texts and the word spans (same order).
const wordCache = new WeakMap<Timing, Record<string, { a: number; b: number; word: string }[]>>();
const wordsOf = (timing: Timing) => {
  const cached = wordCache.get(timing);
  if (cached) return cached;
  const out: Record<string, { a: number; b: number; word: string }[]> = {};
  const next: Record<string, number> = {};
  for (const line of timing.lines ?? []) {
    for (const word of line.text.split(/\s+/).filter(Boolean)) {
      const k = next[line.speaker] ?? 0;
      const span = timing.words[line.speaker]?.[k];
      next[line.speaker] = k + 1;
      if (span) (out[line.speaker] ??= []).push({ a: span[0], b: span[1], word: word.toLowerCase() });
    }
  }
  wordCache.set(timing, out);
  return out;
};

// The mouth shape on this frame: the letter of the current word at the matching point through it, or the next
// vowel when that letter is a consonant without a shape of its own. Quiet frames close the lips.
const SHAPE: Record<string, Viseme> = { m: "mbp", b: "mbp", p: "mbp", f: "fv", v: "fv", o: "o", u: "o", w: "o", e: "e", i: "e", y: "e", a: "a" };
const visemeAt = (timing: Timing, speaker: string, frame: number, open: number): Viseme => {
  if (open < 0.1) return "mbp";
  const w = (wordsOf(timing)[speaker] ?? []).find((x) => frame >= x.a && frame < x.b + 2);
  const letters = (w?.word ?? "").replace(/[^a-z]/g, "");
  if (!w || !letters) return "a";
  const i = Math.min(letters.length - 1, Math.floor(((frame - w.a) / Math.max(1, w.b - w.a)) * letters.length));
  for (let j = i; j < letters.length; j++) if (SHAPE[letters[j]] && (j === i || "aeiouy".includes(letters[j]))) return SHAPE[letters[j]];
  return "a";
};

export type Speech = {
  mouth: number;
  viseme: Viseme;
  nod: number;
  arm: number;
  lean: number;
  prev: { nod: number; arm: number; lean: number }; // the same gestures 3 frames ago, for follow-through
};

// For a puppet whose id is a speaker: while that speaker is talking, how open the mouth is on this frame (from
// the voice itself) and the beat gestures on its stressed syllables. Null when the puppet is not talking or the
// video has no mouth track. Stage applies it.
export const useSpeech = () => {
  const video = useContext(VideoContext);
  const frame = useFinalFrame();
  return (id: string): Speech | null => {
    const track = video?.timing.mouth?.[id];
    if (!video || !track || !speaking(video.timing, id, frame)) return null;
    const mouth = Number(track[frame] ?? 0) / 9;
    const speech: Speech = { mouth, viseme: visemeAt(video.timing, id, frame, mouth), nod: 0, arm: 0, lean: 0, prev: { nod: 0, arm: 0, lean: 0 } };
    for (const a of accentsOf(video.timing)[id] ?? []) {
      speech[a.beat] += beatCurve(frame - a.at);
      speech.prev[a.beat] += beatCurve(frame - 3 - a.at);
    }
    return speech;
  };
};

// How hard the picture is hit on this frame (0..1), from the impact sounds in the effect list: each kicks in on
// its cue and dies away over a third of a second. Stage shakes the camera by it.
const IMPACTS: Record<string, number> = { "sfx/boom.wav": 1, "sfx/sting.wav": 0.8, "sfx/reel-stop.wav": 0.6, "sfx/stamp.wav": 0.45 };
export const useImpact = () => {
  const video = useContext(VideoContext);
  const frame = useFinalFrame();
  let hit = 0;
  for (const e of video?.sfx ?? []) {
    const dt = frame - Math.round(e.at);
    const w = IMPACTS[e.src];
    if (w && dt >= 0 && dt < 10) hit += w * Math.min(1, e.volume * 2) * (1 - dt / 10) ** 2;
  }
  return Math.min(1, hit);
};
