// Colour grade, ported from animated-short's bridge (templates/bridge/grade.ts). It works on display-referred
// values (encode to sRGB, grade, decode back):
//   1. RGB tone curve: monotone cubic Hermite through 7 knots at x = 0, .1, .25, .5, .75, .9, 1
//   2. saturation around luma, separately for shadows / mids / highlights
//   3. split tone: zero-luma RGB offsets in shadows, mids, highlights
//   4. vignette: x (1 - k * smoothstep(r0, 1, r)), r = elliptical radius
// With the post chain on it replaces Stage's CSS saturate/contrast filter and radial vignette.
import { BlendFunction, Effect } from "postprocessing";
import { Uniform, Vector2, Vector3 } from "three";

const frag = /* glsl */ `
uniform float gradeKy[7];
uniform float gradeKm[7];
uniform vec3 gradeSat;      // shadows, mids, highlights
uniform vec3 gradeTintS;
uniform vec3 gradeTintM;
uniform vec3 gradeTintH;
uniform vec2 gradeVig;      // strength k, start radius r0

vec3 gradeEncode(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
}
vec3 gradeDecode(vec3 c) {
  return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
}
float gradeHermite(float v, float x0, float x1, float y0, float y1, float m0, float m1) {
  float h = x1 - x0, t = (v - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2.0 * t3 - 3.0 * t2 + 1.0) * y0 + (t3 - 2.0 * t2 + t) * h * m0 + (-2.0 * t3 + 3.0 * t2) * y1 + (t3 - t2) * h * m1;
}
float gradeCurve(float v) {
  v = clamp(v, 0.0, 1.0);
  if (v < 0.1)  return gradeHermite(v, 0.0, 0.1, gradeKy[0], gradeKy[1], gradeKm[0], gradeKm[1]);
  if (v < 0.25) return gradeHermite(v, 0.1, 0.25, gradeKy[1], gradeKy[2], gradeKm[1], gradeKm[2]);
  if (v < 0.5)  return gradeHermite(v, 0.25, 0.5, gradeKy[2], gradeKy[3], gradeKm[2], gradeKm[3]);
  if (v < 0.75) return gradeHermite(v, 0.5, 0.75, gradeKy[3], gradeKy[4], gradeKm[3], gradeKm[4]);
  if (v < 0.9)  return gradeHermite(v, 0.75, 0.9, gradeKy[4], gradeKy[5], gradeKm[4], gradeKm[5]);
  return gradeHermite(v, 0.9, 1.0, gradeKy[5], gradeKy[6], gradeKm[5], gradeKm[6]);
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec3 c = gradeEncode(inputColor.rgb);
  c = vec3(gradeCurve(c.r), gradeCurve(c.g), gradeCurve(c.b));
  const vec3 W = vec3(0.2126, 0.7152, 0.0722);
  float y = dot(c, W);
  float wS = 1.0 - smoothstep(0.0, 0.55, y);
  float wH = smoothstep(0.45, 1.0, y);
  float wM = 1.0 - wS - wH;
  float s = gradeSat.y + (gradeSat.x - gradeSat.y) * wS + (gradeSat.z - gradeSat.y) * wH;
  c = vec3(y) + s * (c - vec3(y));
  c += wS * gradeTintS + wM * gradeTintM + wH * gradeTintH;
  vec2 p = uv * 2.0 - 1.0;
  float r = length(p) * 0.70710678;
  c *= 1.0 - gradeVig.x * smoothstep(gradeVig.y, 1.0, r);
  outputColor = vec4(gradeDecode(clamp(c, 0.0, 1.0)), inputColor.a);
}`;

// BT.709 zero-luma chroma basis: unit Cb and unit Cr as RGB offsets with luma unchanged
const tintRGB = (cb: number, cr: number) => new Vector3(1.5748 * cr, -0.18733 * cb - 0.46813 * cr, 1.8556 * cb);

const KX = [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1];
// Fritsch-Carlson monotone tangents for the 7 knots
const monoTangents = (ky: number[]) => {
  const n = KX.length, h: number[] = [], d: number[] = [], m = new Array(n).fill(0);
  for (let k = 0; k < n - 1; k++) {
    h.push(KX[k + 1] - KX[k]);
    d.push((ky[k + 1] - ky[k]) / h[k]);
  }
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let k = 1; k < n - 1; k++) {
    if (d[k - 1] * d[k] <= 0) continue;
    const w1 = 2 * h[k] + h[k - 1], w2 = h[k] + 2 * h[k - 1];
    m[k] = (w1 + w2) / (w1 / d[k - 1] + w2 / d[k]);
  }
  return m;
};

export type GradeParams = {
  ky: number[]; // 7 curve values at KX
  sat: [number, number, number]; // shadows, mids, highlights
  tintS: [number, number]; // (Cb, Cr) per zone
  tintM: [number, number];
  tintH: [number, number];
  vig: [number, number]; // strength, start radius
};

// The base look, well past the CSS look it replaces (saturate 1.08, contrast 1.05, oval vignette): a strong
// S-curve, richer mids and highlights (glows and fire keep their colour), cool violet shadows against warm
// highlights, and a slightly heavier vignette.
const BASE: GradeParams = {
  ky: [0, 0.06, 0.19, 0.5, 0.81, 0.95, 1],
  sat: [1.1, 1.35, 1.25],
  tintS: [0.04, 0.006],
  tintM: [0, 0],
  tintH: [-0.02, 0.014],
  vig: [0.3, 0.45], // half the original 0.6: edges half as dark (user, 2026-11-06)
};

/** `p` pushed `k` times as far from neutral: the curve's distance from the diagonal, saturation above 1 and the
 *  tints. The vignette stays as it is (at 1.6x its corners would go 96 % dark). */
export const scaleGrade = (p: GradeParams, k: number): GradeParams => {
  const t = (v: [number, number]): [number, number] => [v[0] * k, v[1] * k];
  return {
    ky: p.ky.map((y, i) => Math.min(1, Math.max(0, KX[i] + (y - KX[i]) * k))),
    sat: p.sat.map((v) => 1 + (v - 1) * k) as [number, number, number],
    tintS: t(p.tintS),
    tintM: t(p.tintM),
    tintH: t(p.tintH),
    vig: p.vig,
  };
};

// How strong the grade is, relative to BASE (1.6 chosen on the post-compare stills, 2026-11-02).
export const GRADE_STRENGTH = 1.6;
export const GRADE: GradeParams = scaleGrade(BASE, GRADE_STRENGTH);

/** The same grade with its vignette strength scaled by `k` (0.5 = half as dark at the edges). */
export const withVignette = (p: GradeParams, k: number): GradeParams => (k === 1 ? p : { ...p, vig: [p.vig[0] * k, p.vig[1]] });

export class GradeEffect extends Effect {
  constructor(p: GradeParams = GRADE) {
    super("GradeEffect", frag, {
      blendFunction: BlendFunction.NORMAL,
      uniforms: new Map<string, Uniform>([
        ["gradeKy", new Uniform(p.ky.slice())],
        ["gradeKm", new Uniform(monoTangents(p.ky))],
        ["gradeSat", new Uniform(new Vector3(...p.sat))],
        ["gradeTintS", new Uniform(tintRGB(...p.tintS))],
        ["gradeTintM", new Uniform(tintRGB(...p.tintM))],
        ["gradeTintH", new Uniform(tintRGB(...p.tintH))],
        ["gradeVig", new Uniform(new Vector2(...p.vig))],
      ]),
    });
  }
}
