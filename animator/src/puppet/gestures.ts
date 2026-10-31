import { Expression, PuppetPose } from "./Puppet";

// Ready-made body poses. Spread one into a pose: { expression: "confused", ...GESTURES.scratchHead }.
// Reach points are in puppet units (feet at 0, head centre at y = -800, shoulders at x = ±130, y = -545).

export type Gesture = "shrug" | "point" | "wave" | "armsCrossed" | "handsOnHips" | "chin" | "scratchHead" | "facepalm" | "cheer" | "clap";

export const GESTURES: Record<Gesture, Partial<PuppetPose>> = {
  shrug: { armL: [40, 75], armR: [40, 75], slump: -0.8, headTilt: -6 },
  point: { armR: [96, -6], handR: "point", armL: [14, 12] },
  wave: { armR: [128, 34], frontR: true, armL: [12, 10] },
  armsCrossed: { reachL: [70, -470], reachR: [-70, -450], frontL: true, frontR: true, handL: "fist", handR: "fist" },
  handsOnHips: { reachL: [-178, -370], reachR: [178, -370], handL: "fist", handR: "fist", slump: -0.3 },
  chin: { reachR: [26, -600], frontR: true, handR: "fist", reachL: [96, -500], frontL: true, headTilt: 6 },
  scratchHead: { reachR: [222, -790], frontR: true, headTilt: 8 },
  facepalm: { reachR: [56, -750], frontR: true, slump: 0.4, headTilt: -4 },
  cheer: { armR: [150, 10], handR: "fist", frontR: true, armL: [30, 30], handL: "fist", slump: -0.6, bob: -24 },
  clap: { reachL: [-14, -560], reachR: [14, -560], frontL: true, frontR: true },
};

// The body language of each expression when nothing else is authored.
export const POSTURE: Record<Expression, Partial<PuppetPose>> = {
  neutral: {},
  excited: { slump: -0.5, armL: [34, 40], armR: [34, 40], bob: -16 },
  happy: { slump: -0.3, headTilt: 6, armL: [18, 16], armR: [18, 16] },
  smug: { ...GESTURES.handsOnHips, headTilt: -7 },
  skeptical: { ...GESTURES.armsCrossed, headTilt: 9 },
  shocked: { slump: -0.7, armL: [62, 40], armR: [62, 40], bob: -12 },
  angry: { slump: -0.4, armL: [10, 0], armR: [10, 0], handL: "fist", handR: "fist", lean: 3 },
  sad: { slump: 1, headTilt: -5, armL: [3, 2], armR: [3, 2] },
  confused: { ...GESTURES.scratchHead },
  worried: { slump: 0.4, reachL: [-22, -430], reachR: [22, -430], frontL: true, frontR: true },
  awkward: { slump: 0.3, headTilt: -8, reachR: [222, -760], frontR: true },
  thinking: { ...GESTURES.chin },
  disgusted: { lean: -6, reachL: [-160, -600], reachR: [150, -630], frontL: true, frontR: true, headTilt: -8 },
  bored: { slump: 0.9, lean: 4, headTilt: 10, armL: [2, 2], armR: [2, 2] },
  determined: { slump: -0.4, armL: [14, -6], armR: [14, -6], handL: "fist", handR: "fist" },
};
