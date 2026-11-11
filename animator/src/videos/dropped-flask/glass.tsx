import React from "react";
import * as THREE from "three";
import { Halo, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Glass that cracks into a web and holds ("The Dropped Flask That Would Not Fall Apart"): a crack-web generator, the
// lab flask (a lathe in cartoon glass, cracks drawn as bright lines with a dark edge over its surface, a cutaway mode
// that shows the dried film inside), a flat pane with the same web, flying shards for plain glass and the impact
// ring of shine. The flask is drawn about 2x a real 250 ml flask so the web reads on a phone (plan.json format_note).

const INK = "#161212";
export const GLASS = "#7cbfc8";
export const GLASS_DARK = "#5e9ea6";
export const FILM = "#e0a24a";
const CRACK_EDGE = "#0e2a30";

export const rnd = (i: number, k = 0) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const glow = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

// ---------- the crack web (2D, metres from the impact point) ----------

export type CrackPt = { u: number; v: number; d: number };
export type CrackLine = CrackPt[];

// Broken glass from one impact: 8-12 straight-ish radial cracks that kink at sharp, irregular angles (a run of straight
// segments, not a smooth wander), a couple of short side splits, and 2-3 broken concentric rings of short straight
// cross cracks between neighbouring rays (many gaps). `d` on each point is how far the crack has run there (path
// length for rays, the ring radius for rings): reveal the web by showing every point with d below the front. Ring
// lines are flagged `ring` so their ends can carry a glint where they meet a ray.
export const crackWeb = (
  seed: number,
  o: { rays?: number; aMin?: number; aMax?: number; reach?: [number, number]; step?: number; rings?: number[]; jag?: number; full?: boolean } = {},
): CrackLine[] => {
  const rays = o.rays ?? 10;
  const aMin = o.aMin ?? 0;
  const aMax = o.aMax ?? Math.PI * 2;
  const reach = o.reach ?? [0.1, 0.2];
  const step = (o.step ?? 0.007) * 1.6;
  const jag = o.jag ?? 0.32;
  const rings = o.rings ?? [0.03, 0.065, 0.11];
  const out: CrackLine[] = [];
  const rayPts: CrackLine[] = [];
  for (let k = 0; k < rays; k++) {
    const a0 = aMin + ((k + 0.5 + (rnd(k, seed) - 0.5) * 0.8) / rays) * (aMax - aMin);
    const len = mix(reach[0], reach[1], rnd(k, seed + 1) ** 0.7);
    let dir = a0 + (rnd(k, seed + 11) - 0.5) * 0.3;
    let u = 0;
    let v = 0;
    let d = 0;
    const pts: CrackLine = [{ u, v, d }];
    let i = 0;
    while (d < len) {
      // mostly straight; now and then a sharp kink, pulled back toward the ray's heading
      if (rnd(i + k * 97, seed + 2) < 0.38) dir += (rnd(i + k * 53, seed + 12) - 0.5) * jag * 2.6;
      dir += (a0 - dir) * 0.3;
      const sl = step * (0.6 + rnd(i + k * 7, seed + 13) * 0.9);
      u += Math.cos(dir) * sl;
      v += Math.sin(dir) * sl;
      d += sl;
      pts.push({ u, v, d });
      if (i > 1 && rnd(i + k * 31, seed + 3) < 0.06) {
        // a short side split
        const bd = dir + (rnd(i, seed + 4) > 0.5 ? 0.9 : -0.9);
        const bl = (len - d) * 0.3 + step;
        out.push([{ u, v, d }, { u: u + Math.cos(bd) * bl * 0.55, v: v + Math.sin(bd) * bl * 0.55, d: d + bl * 0.55 }, { u: u + Math.cos(bd + 0.3) * bl, v: v + Math.sin(bd + 0.3) * bl, d: d + bl }]);
      }
      i++;
    }
    rayPts.push(pts);
    out.push(pts);
  }
  const n = rayPts.length;
  rings.forEach((R, ri) => {
    for (let k = 0; k < (o.full === false ? n - 1 : n); k++) {
      const A = rayPts[k];
      const B = rayPts[(k + 1) % n];
      if (rnd(k + ri * 13, seed + 6) < 0.38) continue; // broken rings: many gaps
      const ra = R * (1 + (rnd(k, seed + 7 + ri) - 0.5) * 0.3);
      const rb = R * (1 + (rnd(k + 1, seed + 7 + ri) - 0.5) * 0.3);
      const pa = A.find((p) => p.d >= ra);
      const pb = B.find((p) => p.d >= rb);
      if (!pa || !pb) continue;
      const gap = Math.hypot(pa.u - pb.u, pa.v - pb.v);
      if (gap > R * 1.5) continue;
      // a straight cross crack with one small kink
      const t = 0.35 + rnd(k, seed + 9 + ri) * 0.3;
      const mu = mix(pa.u, pb.u, t) + (rnd(k, seed + 15 + ri) - 0.5) * gap * 0.18;
      const mv = mix(pa.v, pb.v, t) + (rnd(k, seed + 16 + ri) - 0.5) * gap * 0.18;
      const L: CrackLine = [
        { u: pa.u, v: pa.v, d: R },
        { u: mu, v: mv, d: R * 1.03 },
        { u: pb.u, v: pb.v, d: R * 1.06 },
      ];
      (L as CrackLine & { ring?: boolean }).ring = true;
      out.push(L);
    }
  });
  return out;
};

// ---------- crack ribbons in 3D ----------

export type Crack3 = { p: Vec3; n: Vec3; d: number }[];

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: Vec3, b: Vec3): Vec3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: Vec3): Vec3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

// One ribbon mesh for every crack line, cut at the reveal front `front` (metres of crack run so far). `shift` moves the
// ribbon sideways by that many widths (the dark edge sits on one side of the bright line only).
const ribbonGeometry = (lines: Crack3[], front: number, width: number, lift: number, maxD: number, shift = 0) => {
  const pos: number[] = [];
  for (const L of lines) {
    const pts: { p: Vec3; n: Vec3; d: number }[] = [];
    for (let i = 0; i < L.length; i++) {
      if (L[i].d <= front) pts.push(L[i]);
      else {
        if (i > 0) {
          const a = L[i - 1];
          const b = L[i];
          const t = (front - a.d) / Math.max(1e-6, b.d - a.d);
          pts.push({ p: [mix(a.p[0], b.p[0], t), mix(a.p[1], b.p[1], t), mix(a.p[2], b.p[2], t)], n: a.n, d: front });
        }
        break;
      }
    }
    if (pts.length < 2) continue;
    // per segment (sharp corners, no smoothing): a quad from a to b
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const t = norm(sub(b.p, a.p));
      const sd = norm(cross(t, a.n));
      const wa = (width / 2) * (1 - 0.6 * Math.min(1, a.d / maxD));
      const wb = (width / 2) * (1 - 0.6 * Math.min(1, b.d / maxD));
      const off = (w: number): Vec3 => [sd[0] * w * shift * 2, sd[1] * w * shift * 2, sd[2] * w * shift * 2];
      const la: Vec3 = add3(add3(a.p, scale3(a.n, lift)), off(wa));
      const lb: Vec3 = add3(add3(b.p, scale3(b.n, lift)), off(wb));
      const a0 = sub(la, scale3(sd, wa));
      const a1 = add3(la, scale3(sd, wa));
      const b0 = sub(lb, scale3(sd, wb));
      const b1 = add3(lb, scale3(sd, wb));
      pos.push(...a0, ...a1, ...b1, ...a0, ...b1, ...b0);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  return g;
};
const add3 = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale3 = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];

// The bright crack lines, a dark edge on one side, and small glints where the ring cracks meet the rays and at the
// impact. `front` metres of crack shown; `width` of the bright line.
export const CrackRibbons: React.FC<{ lines: Crack3[]; front: number; width?: number; bright?: number; maxD?: number; glints?: boolean }> = ({ lines, front, width = 0.0028, bright = 1.15, maxD = 0.2, glints = true }) => {
  const q = Math.round(front * 400) / 400;
  const geo = useOwned(() => {
    const edge = ribbonGeometry(lines, q, width * 0.9, 0.0012, maxD, 0.9);
    const core = ribbonGeometry(lines, q, width, 0.0022, maxD, 0);
    return { edge, core, dispose: () => (edge.dispose(), core.dispose()) };
  }, [lines, q, width, maxD]);
  if (q <= 0) return null;
  const spots: { p: Vec3; n: Vec3; s: number }[] = [];
  if (glints) {
    const first = lines.find((L) => L.length > 0);
    if (first) spots.push({ p: first[0].p, n: first[0].n, s: 2.2 });
    for (const L of lines) if ((L as Crack3 & { ring?: boolean }).ring && L[0].d <= q) spots.push({ p: L[0].p, n: L[0].n, s: 1 });
  }
  return (
    <group userData={{ noInk: true }}>
      <mesh geometry={geo.edge}>
        <meshBasicMaterial color={CRACK_EDGE} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>
      <mesh geometry={geo.core}>
        <meshBasicMaterial color={glow("#ffffff", bright)} toneMapped={false} side={THREE.DoubleSide} polygonOffset polygonOffsetFactor={-4} polygonOffsetUnits={-4} />
      </mesh>
      {spots.map((g, i) => {
        const r = width * 1.6 * g.s;
        const q2 = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(...g.n));
        return (
          <group key={i} position={add3(g.p, scale3(g.n, 0.003))} quaternion={q2}>
            <mesh rotation={[0, 0, Math.PI / 4 + i]}>
              <planeGeometry args={[r * 0.5, r * 2.6]} />
              <meshBasicMaterial color={glow("#ffffff", 1.4)} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4 + i]}>
              <planeGeometry args={[r * 0.5, r * 2.0]} />
              <meshBasicMaterial color={glow("#ffffff", 1.4)} toneMapped={false} side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const keepRing = <T,>(src: unknown, out: T[]): T[] => Object.assign(out, { ring: (src as { ring?: boolean }).ring });

// ---------- the flask ----------

// Erlenmeyer profile at scale 1 (r, y), metres: 0.07 base radius, 0.24 tall, a lip at the top.
const PROFILE: [number, number][] = [
  [0.0, 0.0],
  [0.064, 0.0],
  [0.071, 0.006],
  [0.072, 0.018],
  [0.066, 0.04],
  [0.03, 0.158],
  [0.023, 0.172],
  [0.022, 0.222],
  [0.028, 0.226],
  [0.028, 0.236],
  [0.019, 0.236],
];
// The film's cut edge in the cutaway: the inner wall's profile on both sides of the cut plane (z = 0), from the base
// up the cone to the neck, as crack-style lines (always fully shown).
const FILM_RIM: Crack3[] = [-1, 1].map((sx) => {
  const pts = PROFILE.slice(1, 7).map(([r, y]) => [sx * (r - 0.0045), y + 0.002] as [number, number]);
  let d = 0;
  return pts.map((q, i) => {
    if (i > 0) d += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1]);
    return { p: [q[0], q[1], 0.002] as Vec3, n: [0, 0, 1] as Vec3, d };
  });
});

// The outside wall only (the side the cracks run on): from the base corner to the lip.
const WALL = PROFILE.slice(2, 9);
const WALL_S = (() => {
  const s = [0];
  for (let i = 1; i < WALL.length; i++) s.push(s[i - 1] + Math.hypot(WALL[i][0] - WALL[i - 1][0], WALL[i][1] - WALL[i - 1][1]));
  return s;
})();
// The wall at arc length s from the base corner: radius, height and the outward normal in the profile plane.
const wallAt = (s: number) => {
  const S = Math.max(0, Math.min(WALL_S[WALL_S.length - 1], s));
  let i = 1;
  while (i < WALL_S.length - 1 && WALL_S[i] < S) i++;
  const t = (S - WALL_S[i - 1]) / Math.max(1e-6, WALL_S[i] - WALL_S[i - 1]);
  const [r0, y0] = WALL[i - 1];
  const [r1, y1] = WALL[i];
  const dr = r1 - r0;
  const dy = y1 - y0;
  const l = Math.hypot(dr, dy) || 1;
  return { r: mix(r0, r1, t), y: mix(y0, y1, t), nr: dy / l, ny: -dr / l };
};

// The web on the flask wall: impact at angle `theta0` (0 faces +z) just above the base corner, the rays running up
// and round the wall. Returned in the flask's own (unscaled) frame.
export const flaskWeb = (seed: number, theta0 = 0.25): Crack3[] => {
  const web = crackWeb(seed, { rays: 10, aMin: -0.1 * Math.PI, aMax: 1.1 * Math.PI, reach: [0.08, 0.17], step: 0.006, rings: [0.03, 0.06, 0.1], jag: 0.4, full: false });
  const s0 = 0.012;
  return web.map((L) =>
    keepRing(
      L,
      L.filter((p) => s0 + p.v > 0.002).map((p) => {
        const w = wallAt(s0 + p.v);
        const th = theta0 + p.u / Math.max(0.02, w.r);
        const sn = Math.sin(th);
        const cs = Math.cos(th);
        return { p: [w.r * sn, w.y, w.r * cs] as Vec3, n: [w.nr * sn, w.ny, w.nr * cs] as Vec3, d: p.d };
      }),
    ),
  );
};

const lathe = (pts: [number, number][], grow: number, phiStart?: number, phiLength?: number) => {
  // offset each point outward along the profile normal by `grow` (the ink hull)
  const v = pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    const dr = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dr, dy) || 1;
    return new THREE.Vector2(Math.max(0, p[0] + (dy / l) * grow), p[1] - (dr / l) * grow);
  });
  return new THREE.LatheGeometry(v, 48, phiStart, phiLength);
};

// A highlight band down the glass (a slice of the wall a little outside it), for the look of glass.
const SHINE_PTS = PROFILE.slice(3, 8);

export const Flask: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  scale?: number;
  crack?: number; // metres of crack run (0 = whole)
  web?: Crack3[];
  shine?: number; // 0..1 extra flash on the highlight (the impact)
  cutaway?: boolean; // the front half cut away: the inside wall shows the film
  film?: number; // 0..1 the dried amber film on the inside (cutaway only)
  liquid?: number; // 0..1 fill level of collodion (cutaway only)
  ink?: number;
  color?: string;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, crack = 0, web, shine = 0, cutaway = false, film = 0, liquid = 0, ink = 0.004, color = GLASS }) => {
  const geo = useOwned(() => {
    const phiS = cutaway ? Math.PI / 2 : undefined;
    const phiL = cutaway ? Math.PI : undefined;
    const body = lathe(PROFILE, 0, phiS, phiL);
    const hull = lathe(PROFILE, ink / Math.max(0.2, scale), phiS, phiL);
    const shineG = lathe(SHINE_PTS, 0.0015, -0.95, 0.22);
    const shine2 = lathe(SHINE_PTS, 0.0015, -0.6, 0.07);
    const filmG = lathe(PROFILE.slice(0, 8), -0.0035, Math.PI / 2, Math.PI);
    return { body, hull, shineG, shine2, filmG, dispose: () => [body, hull, shineG, shine2, filmG].forEach((g) => g.dispose()) };
  }, [cutaway, ink, scale]);
  // the liquid's cut face (front view, x-y plane) and its back half, up to the level
  const level = 0.005 + liquid * 0.13;
  const liq = useOwned(() => {
    if (!cutaway || liquid <= 0) return { face: null as THREE.ShapeGeometry | null, back: null as THREE.LatheGeometry | null, dispose: () => undefined };
    const pts: [number, number][] = [];
    for (const [r, y] of PROFILE.slice(0, 8)) if (y < level) pts.push([Math.max(0, r - 0.004), y]);
    const top = wallAt(0);
    void top;
    // radius at the level
    let rl = 0.06;
    for (let i = 1; i < PROFILE.length; i++)
      if (PROFILE[i][1] >= level) {
        const [r0, y0] = PROFILE[i - 1];
        const [r1, y1] = PROFILE[i];
        rl = mix(r0, r1, (level - y0) / Math.max(1e-6, y1 - y0)) - 0.004;
        break;
      }
    pts.push([rl, level], [0, level]);
    const s = new THREE.Shape();
    s.moveTo(-pts[0][0], pts[0][1]);
    for (const [r, y] of pts) s.lineTo(r, y);
    for (let i = pts.length - 1; i >= 0; i--) s.lineTo(-pts[i][0], pts[i][1]);
    const face = new THREE.ShapeGeometry(s, 8);
    const back = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 32, Math.PI / 2, Math.PI);
    return { face, back, dispose: () => (face.dispose(), back.dispose()) };
  }, [cutaway, Math.round(level * 400)]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo.body} castShadow>
        <meshToonMaterial color={color} gradientMap={toonRamp} side={cutaway ? THREE.DoubleSide : THREE.FrontSide} />
      </mesh>
      <mesh geometry={geo.hull}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* the dark mouth of the neck */}
      <mesh position={[0, 0.2362, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.0188, 24]} />
        <meshBasicMaterial color={GLASS_DARK} />
      </mesh>
      {!cutaway && (
        <>
          <mesh geometry={geo.shineG}>
            <meshBasicMaterial color={glow("#ffffff", 0.95 + 0.4 * shine)} toneMapped={false} transparent opacity={0.55 + 0.45 * shine} />
          </mesh>
          <mesh geometry={geo.shine2}>
            <meshBasicMaterial color="#ffffff" toneMapped={false} transparent opacity={0.45 + 0.4 * shine} />
          </mesh>
        </>
      )}
      {cutaway && film > 0 && (
        <group>
          {/* the dried coat: a faint glossy sheen on the inner wall and a bright line along its cut edge */}
          <mesh geometry={geo.filmG}>
            <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.16 * film} depthWrite={false} toneMapped={false} />
          </mesh>
          <group scale={[1, 1, 1]}>
            <CrackRibbons lines={FILM_RIM} front={0.6 * film} width={0.0032} bright={1.25} maxD={10} glints={false} />
          </group>
        </group>
      )}
      {cutaway && liq.face && liq.back && (
        <group>
          <mesh geometry={liq.back}>
            <meshToonMaterial color="#c08a3a" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh geometry={liq.face} position={[0, 0, 0.001]}>
            <meshToonMaterial color="#d09a48" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {web && crack > 0 && <CrackRibbons lines={web} front={crack} width={0.003} bright={1.3} />}
    </group>
  );
};

// ---------- a flat pane with the web ----------

// The web on a flat pane in its own x-y plane (normal +z), impact at `at`; `half` clips it to the pane.
export const paneWeb = (seed: number, at: [number, number], half: [number, number], reach: [number, number] = [0.2, 0.42], rings = [0.04, 0.09, 0.15, 0.24]): Crack3[] =>
  crackWeb(seed, { rays: 12, reach, step: 0.01, rings, jag: 0.28 })
    .map((L) => {
      const out: Crack3 & { ring?: boolean } = [];
      out.ring = (L as CrackLine & { ring?: boolean }).ring;
      for (const p of L) {
        const x = at[0] + p.u;
        const y = at[1] + p.v;
        if (Math.abs(x) > half[0] - 0.01 || Math.abs(y) > half[1] - 0.01) break;
        out.push({ p: [x, y, 0], n: [0, 0, 1], d: p.d });
      }
      return out;
    })
    .filter((L) => L.length > 1);

// A pane of glass in its x-y plane (front face toward +z): tinted, see-through when `clear`, with a thin dark frame.
export const Pane: React.FC<{ size: [number, number]; position?: Vec3; rotation?: Vec3; web?: Crack3[]; crack?: number; clear?: number; color?: string; frame?: string; thick?: number; width?: number; maxD?: number; streaks?: boolean }> = ({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  web,
  crack = 0,
  clear = 0,
  color = GLASS,
  frame,
  thick = 0.01,
  width = 0.006,
  maxD = 0.4,
  streaks = true,
}) => (
  <group position={position} rotation={rotation}>
    <mesh>
      <boxGeometry args={[size[0], size[1], thick]} />
      {clear > 0 ? (
        <meshBasicMaterial color={color} transparent opacity={1 - clear} depthWrite={false} />
      ) : (
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      )}
    </mesh>
    {/* two highlight streaks */}
    {streaks && [-0.28, -0.18].map((x, i) => (
      <mesh key={x} position={[x * size[0], 0.12 * size[1], thick / 2 + 0.001]} rotation={[0, 0, -0.5]}>
        <planeGeometry args={[(i ? 0.03 : 0.06) * size[0], size[1] * 0.7]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={clear > 0 ? 0.35 : 0.5} depthWrite={false} toneMapped={false} />
      </mesh>
    ))}
    {frame && (
      <group>
        {[-1, 1].map((s) => (
          <mesh key={`h${s}`} position={[0, (s * size[1]) / 2, 0]}>
            <boxGeometry args={[size[0] + 0.02, 0.02, thick + 0.01]} />
            <meshBasicMaterial color={frame} />
          </mesh>
        ))}
        {[-1, 1].map((s) => (
          <mesh key={`v${s}`} position={[(s * size[0]) / 2, 0, 0]}>
            <boxGeometry args={[0.02, size[1] + 0.02, thick + 0.01]} />
            <meshBasicMaterial color={frame} />
          </mesh>
        ))}
      </group>
    )}
    {web && crack > 0 && (
      <group position={[0, 0, thick / 2]}>
        <CrackRibbons lines={web} front={crack} width={width} maxD={maxD} />
      </group>
    )}
  </group>
);

// ---------- shards of plain glass, flying (closed form: thrown, falling, sliding to rest on the floor) ----------

export const Shards: React.FC<{ origin: Vec3; frame: number; count?: number; seed?: number; speed?: number; size?: number; floor?: number; dir?: Vec3; spread?: number }> = ({
  origin,
  frame,
  count = 14,
  seed = 1,
  speed = 1.6,
  size = 0.05,
  floor = 0,
  dir = [0, 0.3, 1],
  spread = 0.9,
}) => {
  const tri = useOwned(() => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.6);
    s.lineTo(0.5, -0.4);
    s.lineTo(-0.45, -0.3);
    s.closePath();
    const g = new THREE.ShapeGeometry(s);
    return { g, dispose: () => g.dispose() };
  }, []);
  if (frame < 0) return null;
  const g = 9.8 / 900;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const a = (rnd(i, seed) - 0.5) * spread * 2;
        const b = (rnd(i, seed + 1) - 0.3) * spread;
        const sp = (speed * (0.5 + rnd(i, seed + 2))) / 30;
        const d = norm([dir[0] + Math.sin(a), dir[1] + b, dir[2] + Math.cos(a) * 0.3]);
        // flight until it reaches the floor, then it slides to a stop
        let t = frame;
        const vy = d[1] * sp;
        const tHit = (vy + Math.sqrt(vy * vy + 2 * g * Math.max(0.001, origin[1] - floor))) / g;
        let x: number;
        let y: number;
        let z: number;
        if (t < tHit) {
          x = origin[0] + d[0] * sp * t;
          z = origin[2] + d[2] * sp * t;
          y = origin[1] + vy * t - 0.5 * g * t * t;
        } else {
          const slide = Math.min(8, t - tHit);
          const k = slide - (slide * slide) / 16; // decelerates to a stop over 8 frames
          x = origin[0] + d[0] * sp * (tHit + k * 0.4);
          z = origin[2] + d[2] * sp * (tHit + k * 0.4);
          y = floor + 0.003;
          t = tHit + slide * 0.3;
        }
        const sz = size * (0.5 + rnd(i, seed + 3));
        const rest = frame >= tHit + 8;
        return (
          <group key={i} position={[x, y, z]} rotation={rest ? [-Math.PI / 2, 0, rnd(i, 9) * 6] : [t * 0.5 * (rnd(i, seed + 4) - 0.5), t * 0.4, t * 0.3 * (rnd(i, seed + 5) - 0.5)]} scale={sz}>
            <mesh geometry={tri.g}>
              <meshBasicMaterial color={i % 3 ? "#bfe6ea" : "#ffffff"} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh geometry={tri.g} scale={1.25} position={[0, 0, -0.002]}>
              <meshBasicMaterial color={GLASS_DARK} side={THREE.DoubleSide} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// ---------- the ring of shine where it hits ----------

export const ImpactRing: React.FC<{ position: Vec3; frame: number; size?: number; normal?: "up" | "front" }> = ({ position, frame, size = 0.3, normal = "up" }) => {
  if (frame < 0 || frame > 16) return null;
  const t = frame / 16;
  const r = size * (0.25 + 0.75 * Math.sqrt(t));
  const o = (1 - t) * (1 - t);
  return (
    <group position={position} rotation={normal === "up" ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} userData={{ ghost: true, noInk: true }}>
      <mesh>
        <ringGeometry args={[r * 0.82, r, 48]} />
        <meshBasicMaterial color={glow("#ffffff", 1.3)} toneMapped={false} transparent opacity={o} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <ringGeometry args={[r * 0.45, r * 0.55, 40]} />
        <meshBasicMaterial color={glow("#dff6ff", 1.1)} toneMapped={false} transparent opacity={o * 0.6} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {/* little glints flying out */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const gr = size * (0.2 + 1.1 * t);
        const s = 0.012 * (1 - t) * (size / 0.3) * (i % 2 ? 1 : 1.6);
        return (
          <mesh key={i} position={[Math.cos(a) * gr, Math.sin(a) * gr, 0.01]} rotation={[0, 0, Math.PI / 4]}>
            <planeGeometry args={[s, s * 3.2]} />
            <meshBasicMaterial color={glow("#ffffff", 1.4)} toneMapped={false} transparent opacity={o} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

export const ImpactGlow: React.FC<{ position: Vec3; frame: number; size?: number }> = ({ position, frame, size = 0.35 }) =>
  frame >= 0 && frame < 12 ? <Halo position={position} size={size * (1 + frame / 12)} color="#e8fbff" strength={0.6 * (1 - frame / 12)} /> : null;

// The same web seen from inside a cutaway flask (on the inner face of the back half): moved in by the wall's
// thickness, normals turned inward so the ribbons lie on the inside.
export const flaskWebInner = (seed: number, theta0 = Math.PI): Crack3[] =>
  flaskWeb(seed, theta0).map((L) => keepRing(L, L.map((q) => ({ p: [q.p[0] - q.n[0] * 0.0045, q.p[1] - q.n[1] * 0.0045, q.p[2] - q.n[2] * 0.0045] as Vec3, n: [-q.n[0], -q.n[1], -q.n[2]] as Vec3, d: q.d }))));
