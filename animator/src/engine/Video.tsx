import React, { createContext, useContext, useEffect, useState } from "react";
import { AbsoluteFill, Audio, continueRender, delayRender, getInputProps, staticFile } from "remotion";
import { CaptionChunk, Captions } from "../ui/Captions";
import { Shot, ShotList, useFinalFrame } from "./clock";
import { MusicCue, Sfx, SoundTrack } from "./sound";
import type { Viseme } from "../puppet/Puppet";
import type { FramingDelta } from "./framing";
import { ALL_PARTS, PostParts } from "./post/Post";

// The whole video: shots, the narration track, effects + ducked music, and word-synced captions.
export type Timing = {
  fps: number;
  totalFrames: number;
  captions: CaptionChunk[];
  words: Record<string, number[][]>; // per speaker: [fromFrame, toFrame] for each spoken word
  lines?: { i: number; speaker: string; text: string; from: number; to: number }[];
  mouth?: Record<string, string>; // per speaker: one digit 0-9 per frame, how open the mouth is (from the voice)
};

// What the shots can read about the whole video: the voice timing, the effect cues and whether puppets are lit.
// `framing`: the smoothed head-framing corrections written by `pipeline.py framing` (public/videos/<slug>/framing.json),
// per shot start, then per shot frame (from that shot's first logged frame `f0`).
export type FramingTable = Record<string, { f0: number; d: FramingDelta[] }>;
const VideoContext = createContext<{ timing: Timing; sfx: Sfx[]; lighting: boolean; post: boolean | Partial<PostParts>; framing: FramingTable | null } | null>(null);

// The look (lighting, post chain) for compositions that are not a Video: design boards and tests of a production
// wrap their shots in it so their stills match the video without --props.
export const LookContext = createContext<{ lighting?: boolean; post?: boolean | Partial<PostParts> } | null>(null);

// The framing table for this video, if the pipeline wrote one (null while loading or when there is none).
const useFramingTable = (slug: string) => {
  const [table, setTable] = useState<FramingTable | null>(null);
  const [handle] = useState(() => delayRender(`framing table ${slug}`));
  useEffect(() => {
    if ((getInputProps() as { framingPass?: boolean }).framingPass) {
      continueRender(handle);
      return;
    }
    fetch(staticFile(`videos/${slug}/framing.json`))
      .then((r) => (r.ok ? r.json() : null))
      .then((t) => setTable(t))
      .catch(() => null)
      .finally(() => continueRender(handle));
  }, [slug, handle]);
  return table;
};

// `lighting` (default on): puppets take the set's light (a rig derived from the mood, or a Stage's own `light`)
// instead of the flat mood tint. Videos made before it existed pass `lighting={false}` to keep their look.
// `voiceVolume` (default 1) lifts or lowers the narration when the mix lands outside the loudness target.
// `score` (default off): play the video's own score (public/videos/<slug>/music.wav, written by `pipeline.py music`)
// instead of the `music` cues; the `score` input prop overrides it for an A/B of the soundtrack.
// `captions` (default on): the burned-in Shorts captions; long-form 16:9 videos turn them off.
// `post` (default off): the post chain (engine/post: depth of field, bloom, colour grade) on every
// Stage; `true`, or the parts to change, e.g. `{ lens: false }`. Videos made before it existed leave it off to keep their look.
export const Video: React.FC<{ slug: string; timing: Timing; shots: Shot[]; sfx: Sfx[]; music: MusicCue[]; lighting?: boolean; post?: boolean | Partial<PostParts>; score?: boolean; voiceVolume?: number; captions?: boolean }> = ({
  slug,
  timing,
  shots,
  sfx,
  music,
  lighting = true,
  post = false,
  score = false,
  voiceVolume = 1,
  captions = true,
}) => {
  const framing = useFramingTable(slug);
  // `soundOnly` (input prop, scripts/sound.mjs): the soundtrack alone, without mounting a single 3D shot.
  const { soundOnly: so, cueDump, score: scoreProp, stem } = getInputProps() as { soundOnly?: boolean; cueDump?: boolean; score?: boolean; stem?: "voice" | "music" | "sfx" };
  const soundOnly = so === true;
  // `cueDump` (input prop, scripts/cues.mjs): log the resolved shot, effect and music cues once for the sync check
  // and the score (frames and file paths only, no component names).
  // The score is mastered to the library loops' loudness, so it plays at their usual cue volume.
  const bed: MusicCue[] = (scoreProp ?? score) ? [{ src: `videos/${slug}/music.wav`, from: 0, to: timing.totalFrames, volume: SCORE_VOLUME, loop: false, fade: false }] : music;
  // `library`: the music cues the scene wrote, which a score is cut to even while it replaces them.
  if (cueDump) console.log("[cues] " + JSON.stringify({ shots: shots.map(([a, b, , whip]) => [a, b, whip]), sfx, music: bed, library: music }));
  return (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    {!soundOnly && (
      <VideoContext.Provider value={{ timing, sfx, lighting, post, framing }}>
        <ShotList shots={shots} />
      </VideoContext.Provider>
    )}
    {/* `stem` (input prop, `pipeline.py mix`): one part of the soundtrack alone, at its mix gain (the stems sum to the mix) */}
    {(!stem || stem === "voice") && <Audio src={staticFile(`videos/${slug}/voice.wav`)} volume={voiceVolume} />}
    <SoundTrack sfx={!stem || stem === "sfx" ? sfx : []} music={!stem || stem === "music" ? bed : []} captions={timing.captions} total={timing.totalFrames} />
    {captions && <Captions chunks={timing.captions} />}
  </AbsoluteFill>
  );
};

const SCORE_VOLUME = 0.3;

// The smoothed framing correction for this shot frame, or undefined (no table, or not in it).
export const useFramingFor = (start: number, f: number): FramingDelta | undefined => {
  const t = useContext(VideoContext)?.framing?.[String(start)];
  if (!t) return undefined;
  return t.d[Math.max(0, Math.min(t.d.length - 1, f - t.f0))];
};

// Whether puppets are lit in this video. The `lighting` input prop overrides it, to preview an older video lit:
//   npx remotion still <slug> out/x.png --frame=300 --props='{"lighting":true}'
export const useLighting = () => {
  const override = (getInputProps() as { lighting?: boolean }).lighting;
  const video = useContext(VideoContext);
  const look = useContext(LookContext);
  return override ?? video?.lighting ?? look?.lighting ?? false;
};

// Which parts of the post chain this video's Stages run, or null for none. The `post` input prop overrides the
// video's setting, for A/B stills: `true` / `false`, or the parts to switch, e.g. `{"lens": false}` (the rest as default).
// Off in the passes that only measure (framing pre-pass, collide, soundtrack).
//   npx remotion still <slug> out/x.png --frame=300 --props='{"post":{"lens":false}}'
export const usePost = (): PostParts | null => {
  const props = getInputProps() as { post?: boolean | Partial<PostParts>; framingPass?: boolean; soundOnly?: boolean; collide?: boolean };
  const video = useContext(VideoContext);
  const look = useContext(LookContext);
  if (props.framingPass || props.soundOnly || props.collide) return null;
  const on = props.post ?? video?.post ?? look?.post ?? false;
  return on ? { ...ALL_PARTS, ...(typeof on === "object" ? on : {}) } : null;
};

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
    const w = IMPACTS[e.src] ?? e.hit;
    if (w && dt >= 0 && dt < 10) hit += w * Math.min(1, e.volume * 2) * (1 - dt / 10) ** 2;
  }
  return Math.min(1, hit);
};
