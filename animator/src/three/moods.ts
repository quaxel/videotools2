import type { PuppetLight } from "../puppet/PuppetBillboard";

// Lighting moods: background, fog and light colours per location type. The kit's Room lights a set with one;
// Stage tints puppets toward the mood's ambient colour so they sit in the same light as the set.

export type Mood = "warm" | "daylight" | "cold" | "dream" | "night" | "neon" | "golden" | "office" | "alarm" | "dusk";

export const MOODS: Record<Mood, { bg: string; ambient: [number, string]; key: [number, string]; fill: [number, string] }> = {
  warm: { bg: "#2a120a", ambient: [1.5, "#ffe2c4"], key: [2.6, "#fff1dc"], fill: [6, "#ffb070"] },
  daylight: { bg: "#bfe6ff", ambient: [2.0, "#ffffff"], key: [2.4, "#fffaf0"], fill: [2, "#ffffff"] },
  cold: { bg: "#0a1430", ambient: [1.1, "#9fb6ff"], key: [1.8, "#c8d6ff"], fill: [5, "#4f7dff"] },
  dream: { bg: "#2b0d45", ambient: [1.4, "#e6b8ff"], key: [1.8, "#ffc2f0"], fill: [6, "#ff6fd8"] },
  night: { bg: "#070b1c", ambient: [0.9, "#8fa8ff"], key: [1.4, "#b9c8ff"], fill: [4, "#5a7dff"] },
  neon: { bg: "#14062b", ambient: [1.0, "#c8a8ff"], key: [1.4, "#ffb8ec"], fill: [6, "#ff4fd8"] },
  golden: { bg: "#3a2208", ambient: [1.6, "#ffe0a0"], key: [2.8, "#ffd27a"], fill: [5, "#ffb347"] },
  office: { bg: "#dfe9e4", ambient: [1.9, "#f2fff8"], key: [2.2, "#ffffff"], fill: [3, "#d8fff0"] },
  alarm: { bg: "#2a0606", ambient: [1.3, "#ffc8c0"], key: [2.2, "#ffd6d0"], fill: [6, "#ff3b30"] },
  dusk: { bg: "#3b2a6b", ambient: [1.2, "#e8c0ff"], key: [2.4, "#ffc890"], fill: [5, "#ff8a5c"] },
};

export const moodBackground = (mood: Mood) => MOODS[mood].bg;

// Puppets are unlit cut-outs. A Stage whose background is a mood's tints them 20 % toward that mood's ambient
// light, so a puppet in a night or neon set does not look pasted in. Other backgrounds leave them white.
export const puppetTint = (bg: string) => {
  const mood = Object.values(MOODS).find((m) => m.bg.toLowerCase() === bg.toLowerCase());
  if (!mood) return "#ffffff";
  const c = parseInt(mood.ambient[1].slice(1), 16);
  const mix = (v: number) => Math.round(255 + (v - 255) * 0.2).toString(16).padStart(2, "0");
  return `#${mix((c >> 16) & 255)}${mix((c >> 8) & 255)}${mix(c & 255)}`;
};

// The puppets' light in a lit video when a shot gives no `light` of its own. A mood has no strong light source,
// so the puppet keeps its own colours with only a trace of the mood's ambient colour; shots with a fire, a lamp
// or headlights pass their own `light`.
export const moodLight = (mood: Mood): PuppetLight => ({ tint: MOODS[mood].ambient[1] });

// The mood rig for a Stage background, or undefined when the background is not a mood's (the puppets stay flat).
export const lightForBackground = (bg: string) => {
  const mood = (Object.keys(MOODS) as Mood[]).find((k) => MOODS[k].bg.toLowerCase() === bg.toLowerCase());
  return mood ? moodLight(mood) : undefined;
};
