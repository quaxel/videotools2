// Thin-lens depth of field, ported from animated-short's bridge (templates/bridge/lensblur.ts). Blur-disc radius
// (px at 1080x1920) = cInf * |1 - focus / depth|, x nearScale in front of the focus plane, clamped to maxCoC; scaled
// in the shader by buffer height / 1920.
//   pre  : 16-tap gather over 0.29 x the CoC, fills the gaps between the main taps (a smooth disc, no ghost copies).
//   main : 64-tap Vogel disc over 0.96 x the CoC, plus a 32-tap near-field gather so a blurred foreground spreads
//          over sharper pixels behind it.
// A sample counts only if its own disc reaches this pixel, and a farther sample never spreads wider than this
// pixel's own disc: sharp subjects keep clean silhouettes, no halos. Fixed sample pattern: no flicker.
import { BlendFunction, Effect, EffectAttribute } from "postprocessing";
import { Uniform } from "three";

const frag = /* glsl */ `
uniform float focus;      // focus distance along the view axis (m)
uniform float cInf;       // blur-disc radius (px at 1080x1920) of things at infinity; 0 = off
uniform float nearScale;
uniform float maxCoC;     // px at 1080x1920
#define GOLDEN 2.39996323

float cocAt(float d, float s) {
  float c = cInf * s * (1.0 - focus / max(d, 1e-3));
  if (c < 0.0) c *= nearScale;
  return clamp(c, -maxCoC * s, maxCoC * s);
}
float distAt(vec2 uv) { return -getViewZ(readDepth(uv)); }

void mainImage(const in vec4 inputColor, const in vec2 uv, const in float depth, out vec4 outputColor) {
  if (cInf < 0.25) { outputColor = inputColor; return; }
  float s = resolution.y / 1920.0;
  float d0 = -getViewZ(depth);
  float r0 = abs(cocAt(d0, s));
  float R = r0 * SPREAD;
  vec3 acc = inputColor.rgb; float wsum = 1.0;
  if (R > 0.5) {
    for (int i = 0; i < TAPS; i++) {
      float rr = sqrt((float(i) + 0.5) / float(TAPS)) * R;
      float a = float(i) * GOLDEN + ROT;
      vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
      float ds = distAt(suv);
      float rs = abs(cocAt(ds, s)) * SPREAD;
      if (ds > d0) rs = min(rs, R);
      float w = clamp(rs - rr + 0.5, 0.0, 1.0);
      acc += texture2D(inputBuffer, suv).rgb * w; wsum += w;
    }
  }
  vec3 col = acc / wsum;
#if NEAR_TAPS > 0
  float M = maxCoC * s;
  vec3 fg = vec3(0.0); float fw = 0.0, cov = 0.0;
  for (int i = 0; i < NEAR_TAPS; i++) {
    float rr = sqrt((float(i) + 0.5) / float(NEAR_TAPS)) * M;
    if (rr <= R) continue;
    float a = float(i) * GOLDEN + 1.0;
    vec2 suv = uv + vec2(cos(a), sin(a)) * rr * texelSize;
    float ds = distAt(suv);
    if (ds >= d0 * 0.97) continue;
    float rs = abs(cocAt(ds, s));
    float w = clamp(rs - rr + 0.5, 0.0, 1.0);
    fg += texture2D(inputBuffer, suv).rgb * w; fw += w;
    cov += w * (M * M) / max(rs * rs, 1.0);
  }
  if (fw > 0.0) col = mix(col, fg / fw, clamp(cov / float(NEAR_TAPS), 0.0, 1.0));
#endif
  outputColor = vec4(col, inputColor.a);
}`;

type Stage = { taps: number; spread: number; nearTaps: number; rot: number };
const PRE: Stage = { taps: 16, spread: 0.287, nearTaps: 0, rot: 0.61 };
const MAIN: Stage = { taps: 64, spread: 0.958, nearTaps: 32, rot: 0 };

class LensBlurEffect extends Effect {
  constructor({ maxCoC, nearScale, stage }: { maxCoC: number; nearScale: number; stage: Stage }) {
    super("LensBlurEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      attributes: EffectAttribute.DEPTH | EffectAttribute.CONVOLUTION,
      defines: new Map<string, string>([
        ["TAPS", String(stage.taps)], ["SPREAD", stage.spread.toFixed(4)], ["NEAR_TAPS", String(stage.nearTaps)], ["ROT", stage.rot.toFixed(4)],
      ]),
      uniforms: new Map<string, Uniform>([
        ["focus", new Uniform(10)], ["cInf", new Uniform(0)], ["nearScale", new Uniform(nearScale)], ["maxCoC", new Uniform(maxCoC)],
      ]),
    });
  }
}

/** The pair of effects the composer needs (pre first, then main, each in its own EffectPass); set focus and cInf
 *  once per frame on this object. */
export class LensBlur {
  readonly pre: LensBlurEffect;
  readonly main: LensBlurEffect;
  constructor({ maxCoC = 24, nearScale = 1.2 } = {}) {
    this.pre = new LensBlurEffect({ maxCoC, nearScale, stage: PRE });
    this.main = new LensBlurEffect({ maxCoC, nearScale, stage: MAIN });
  }
  set focus(v: number) {
    this.pre.uniforms.get("focus")!.value = v;
    this.main.uniforms.get("focus")!.value = v;
  }
  set cInf(v: number) {
    this.pre.uniforms.get("cInf")!.value = v;
    this.main.uniforms.get("cInf")!.value = v;
  }
  dispose() {
    this.pre.dispose();
    this.main.dispose();
  }
}
