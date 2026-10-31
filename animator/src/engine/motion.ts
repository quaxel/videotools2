// Animation-principle helpers shared by the moves in anim.ts and the idle life in liven.ts. Everything is a pure
// function of the frame, because Remotion renders frames independently and out of order: there is no state to
// integrate, so lag and spring settle are computed by sampling the motion's own past.

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
// Slow in / slow out.
export const smooth = (p: number) => {
  const q = clamp01(p);
  return q * q * (3 - 2 * q);
};
export const easeIn = (p: number) => clamp01(p) ** 2;
export const easeOut = (p: number) => 1 - (1 - clamp01(p)) ** 2;

// Anticipation and overshoot in one curve (0 -> 1): a small dip the wrong way first, then past the target and
// back. `a` is the size of the dip, `o` of the overshoot (0.1 = 10 %).
export const anticipate = (p: number, a = 0.08, o = 0.08) => {
  const q = clamp01(p);
  if (q < 0.2) return -a * Math.sin((q / 0.2) * Math.PI); // wind-up
  const r = (q - 0.2) / 0.8;
  // Fast through the middle, past the end, settling back.
  return smooth(Math.min(1, r * 1.15)) + o * Math.sin(Math.min(1, Math.max(0, (r - 0.55) / 0.45)) * Math.PI);
};

// Settle after reaching a target: 1 at t = 0 decaying in a few wobbles (a spring's step response minus the step).
// `freq` wobbles per second at 30 fps, `damping` 0..1 (0.3 bouncy, 0.7 calm).
export const settle = (t: number, freq = 2.2, damping = 0.45) => {
  if (t < 0) return 0;
  const w = (2 * Math.PI * freq) / 30;
  return Math.exp(-damping * w * t) * Math.cos(w * Math.sqrt(1 - damping * damping) * t);
};

// Follow-through and overlap: how far a soft part (hair, a loose arm) trails a moving value. It is the response of
// a damped spring to `fn`'s acceleration, found by sampling fn over the last `window` frames, so the part lags when
// the body starts, swings past when it stops, and settles on its own.
export const follow = (fn: (f: number) => number, f: number, freq = 1.6, damping = 0.4, window = 30) => {
  const w = (2 * Math.PI * freq) / 30;
  const wd = w * Math.sqrt(1 - damping * damping);
  let out = 0;
  for (let i = 1; i <= window; i++) {
    const acc = fn(f - i + 1) - 2 * fn(f - i) + fn(f - i - 1);
    out += acc * Math.exp(-damping * w * i) * Math.sin(wd * i) * (w / Math.sqrt(1 - damping * damping));
  }
  return -out;
};
