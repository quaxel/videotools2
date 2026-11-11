import { BeatKey, beatPath, Vec3 } from "./anim";

// Camera framing helpers for the cut-out puppets (promoted from microwave-candy-bar).

// How far `wide` pulls a camera back by default. The cut-out heads are big: a camera 2 m from its target frames a
// head and shoulders, a medium shot needs about 3 m, so keys written at "natural" distances are pulled back 1.5x.
export const WIDE = 1.5;

// The same view from k times as far: moves `position` away from `target` along the line of sight (k < 1 moves in).
// Target, fov and any other fields are kept. For a single camera, and for `frameSpot(wide(cam), ...)`.
export const wide = <T extends { position: Vec3; target: Vec3 }>(c: T, k = WIDE): T => ({
  ...c,
  position: [c.target[0] + (c.position[0] - c.target[0]) * k, c.target[1] + (c.position[1] - c.target[1]) * k, c.target[2] + (c.position[2] - c.target[2]) * k] as Vec3,
});

// beatPath with every key pulled back by `wide`: a key's own `k` overrides the default (WIDE).
//   const camera = widePath([{ at: 0, position: [...], target: [...] }, { at: 130, ...END, k: 1.45 }], f);
export type WideKey = BeatKey & { k?: number };
export const widePath = (keys: WideKey[], f: number, k = WIDE) => beatPath(keys.map(({ k: own, ...key }) => wide(key, own ?? k)), f);
