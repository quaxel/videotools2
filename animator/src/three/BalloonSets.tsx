import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { Haze, Pine, Ridge, Rock, SmokePlume } from "./LakeSet";
import { SkyDome, CLEAR_SKY, SUN_DIR } from "./sky";
import { InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// The WWII paper balloon bomb (Fu-Go) and its two places, built from photo references
// (guide/references/balloon-bomb.md):
// - `PaperBalloon`: the washi envelope with its gores, shroud lines and the aluminium "chandelier" ring with sandbags
//   and bombs. Its origin is the ring; the envelope sits `BALLOON.lines + BALLOON.r` above it.
// - `BeachLaunchSet`: a launch beach on the Pacific coast of Japan at a winter dawn. Grey sand (floor y = 0), the
//   sea from z = BEACH.shore, the sun rising out of it straight ahead (-z), black pines leaning in from the sides,
//   hydrogen cylinders and the stake ring. `balloon` = height of the ring (null: no balloon).
// - `PineForestSet`: open ponderosa pine forest in Oregon, May 1945, midday. A deflated balloon hangs over a branch
//   of the hero pine (`HERO`) and its chandelier dangles at `DANGLE` above the needles.

type Vec3 = [number, number, number];
const INK = "#161212";

export const BALLOON = { r: 3.4, lines: 4.2, ring: 0.42 };
export const BEACH = { shore: -11 };
export const HERO = { x: -1.3, z: -0.6, branchY: 5.8 };
export const DANGLE: Vec3 = [0.55, 1.15, 0.1];

// A texture or geometry made for one mount and freed (on the GPU too) when the shot ends. Render tabs keep old
// WebGL contexts alive, so anything left undisposed piles up shot after shot until Chrome refuses a new context.
export const useOwned = <T extends { dispose: () => void }>(make: () => T, deps: React.DependencyList = []): T => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(make, deps);
  React.useEffect(() => () => v.dispose(), [v]);
  return v;
};

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Dawn on the sea: the low sun straight ahead, warm rim on the edges facing it.
export const dawnLight = (): PuppetLight => ({
  tint: "#c8b8e8",
  shadow: 0.2,
  distant: [{ direction: [0.15, 0.2, -1], color: "#ffb070", strength: 1.3 }],
});

// ---------- textures ----------

// Laminated washi: pale grey-white with the gore seams running pole to pole (u = longitude on a sphere), paste
// overlaps as darker strips and blotches.
export const paperCanvas = (gores: number) =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#ece6d6";
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(190,180,160,0.22)" : "rgba(255,252,240,0.35)";
      ctx.fillRect(rand(i + 3) * 1024, rand(i + 5) * 512, 30 + rand(i + 7) * 90, 14 + rand(i + 9) * 40);
    }
    // horizontal laps where the sheets were pasted
    for (let r = 1; r < 9; r++) {
      ctx.fillStyle = "rgba(170,160,138,0.28)";
      ctx.fillRect(0, r * 57 + rand(r) * 6, 1024, 5);
    }
    const w = 1024 / gores;
    for (let g = 0; g < gores; g++) {
      ctx.fillStyle = "rgba(120,110,92,0.55)";
      ctx.fillRect(g * w, 0, 4, 512);
      ctx.fillStyle = "rgba(255,255,250,0.4)";
      ctx.fillRect(g * w + 4, 0, 3, 512);
    }
  });

const sandCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#8c8478";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rand(i + 4) > 0.5 ? "rgba(70,64,58,0.25)" : "rgba(170,160,140,0.22)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 200) * 1024, 40 + rand(i + 9) * 90, 20 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // wind ripples and footprints
    ctx.strokeStyle = "rgba(60,54,48,0.28)";
    ctx.lineWidth = 2;
    for (let r = 0; r < 60; r++) {
      const y = r * 17 + rand(r) * 8;
      ctx.beginPath();
      for (let x = 0; x <= 1024; x += 16) ctx.lineTo(x, y + Math.sin(x * 0.02 + r) * 4);
      ctx.stroke();
    }
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = rand(i + 50) > 0.5 ? "rgba(40,36,32,0.35)" : "rgba(210,200,180,0.35)";
      ctx.fillRect(rand(i) * 1024, rand(i + 9000) * 1024, 2, 2);
    }
  });

const floorCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#9a7a52";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 70; i++) {
      const g = rand(i + 70) > 0.45;
      ctx.fillStyle = g ? "rgba(120,140,70,0.45)" : "rgba(80,58,36,0.3)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 30 + rand(i + 9) * 70, 20 + rand(i + 11) * 50, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // fallen needles in little crossed strokes
    for (let i = 0; i < 11000; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      const a = rand(i + 3) * Math.PI;
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.7 ? "#c49a62" : v > 0.4 ? "#7a5634" : v > 0.15 ? "#b08450" : "#5e6a30";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12);
      ctx.stroke();
    }
  });

// Ponderosa bark: big orange-brown plates, taller than wide and staggered column by column (never in rows), split
// by deep dark fissures, with flaky lighter scales on each plate.
const barkCanvas = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#2e1a10";
    ctx.fillRect(0, 0, 256, 512);
    let x = 0;
    let c = 0;
    while (x < 256) {
      const w = 34 + rand(c * 5) * 34;
      let y = -rand(c + 50) * 120;
      let r = 0;
      while (y < 512) {
        const h = 70 + rand(c * 13 + r) * 110;
        const v = rand(c * 31 + r * 7);
        const j = (k: number) => (rand(c * 17 + r * 3 + k) - 0.5) * 10;
        ctx.fillStyle = v > 0.7 ? "#c87a42" : v > 0.4 ? "#b4663a" : v > 0.15 ? "#d48e52" : "#a06048";
        ctx.beginPath();
        ctx.moveTo(x + 4 + j(1), y + 5);
        ctx.lineTo(x + w * 0.5 + j(2), y + 2 + j(3) * 0.5);
        ctx.lineTo(x + w - 4 + j(4), y + 6);
        ctx.lineTo(x + w - 3 + j(5), y + h * 0.5);
        ctx.lineTo(x + w - 5 + j(6), y + h - 5);
        ctx.lineTo(x + w * 0.45 + j(7), y + h - 2);
        ctx.lineTo(x + 3 + j(8), y + h - 6);
        ctx.lineTo(x + 5 + j(9), y + h * 0.5);
        ctx.closePath();
        ctx.fill();
        for (let k = 0; k < 7; k++) {
          ctx.fillStyle = rand(c * 7 + r * 11 + k) > 0.5 ? "rgba(255,200,140,0.28)" : "rgba(90,50,30,0.25)";
          ctx.fillRect(x + 8 + rand(c + r * 5 + k) * (w - 20), y + 10 + rand(c * 3 + r + k * 9) * (h - 24), 6 + rand(k + c) * 10, 3);
        }
        y += h;
        r++;
      }
      x += w;
      c++;
    }
  });

// The sun's glitter path on the sea: a vertical streak of short bright dashes, densest near the horizon.
const glitterCanvas = (seed: number) =>
  canvasTexture(256, 512, (ctx) => {
    ctx.clearRect(0, 0, 256, 512);
    for (let i = 0; i < 520; i++) {
      const y = Math.pow(rand(seed + i), 1.6) * 512;
      const spread = 20 + (y / 512) * 110;
      const x = 128 + (rand(seed + i + 300) - 0.5) * 2 * spread * rand(seed + i + 600);
      ctx.fillStyle = `rgba(255,${200 + Math.floor(rand(i) * 50)},150,${0.5 + rand(i + 9) * 0.5})`;
      ctx.fillRect(x, y, 6 + (y / 512) * 26, 2 + (y / 512) * 3);
    }
  });

export const tiled = (t: THREE.Texture, x: number, y: number) => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(x, y);
  t.anisotropy = 8;
  return t;
};

// ---------- small helpers ----------

// A thin line (rope, shroud line) between two points.
export const Cord: React.FC<{ a: Vec3; b: Vec3; width?: number; color?: string }> = ({ a, b, width = 0.016, color = "#3a342c" }) => {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const len = d.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const pos = va.add(d.multiplyScalar(0.5)).toArray() as Vec3;
  // a unit cylinder scaled to the length, so a moving rope keeps its geometry instead of rebuilding it every frame
  return (
    <mesh position={pos} quaternion={quat} scale={[width, len, width]}>
      <cylinderGeometry args={[1, 1, 1, 5]} />
      <meshBasicMaterial color={color} />
    </mesh>
  );
};

// Inked toon blob (foliage pad, sandbag, bush): a sphere scaled to `scale`.
export const Blob: React.FC<{ position: Vec3; scale: Vec3; color: string; rotation?: Vec3; ink?: number; detail?: number }> = ({
  position,
  scale,
  color,
  rotation = [0, 0, 0],
  ink = 0.06,
  detail = 1,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh castShadow receiveShadow>
      <icosahedronGeometry args={[1, detail]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    {ink > 0 && (
      <mesh scale={1 + ink}>
        <icosahedronGeometry args={[1, detail]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// ---------- the balloon ----------

// The aluminium ring with its four spokes, the control box in the middle, sandbags round the rim and the bombs
// hanging below. Origin = the ring's centre. `bags` = how many sandbags are still on (of 24).
export const Chandelier: React.FC<{ frame: number; bags?: number; swing?: number }> = ({ frame, bags = 24, swing = 1 }) => {
  const R = BALLOON.ring;
  return (
    <group rotation={[Math.sin(frame * 0.05) * 0.05 * swing, frame * 0.004 * swing, Math.sin(frame * 0.037 + 1) * 0.06 * swing]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
        <torusGeometry args={[R, 0.028, 8, 48]} />
        <meshToonMaterial color="#b8c0c8" gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[R, 0.042, 8, 48]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {[0, 1, 2, 3].map((k) => (
        <InkCylinder key={k} radius={0.016} height={R * 2} rotation={[0, (k * Math.PI) / 4, Math.PI / 2]} color="#a8b0b8" ink={0.008} />
      ))}
      {/* aneroid control box and its battery */}
      <InkCylinder radius={0.11} height={0.16} position={[0, 0.02, 0]} color="#7a8088" />
      <InkCylinder radius={0.06} height={0.06} position={[0, 0.13, 0]} color="#c8a040" />
      {Array.from({ length: 24 }, (_, i) => {
        if (i >= bags) return null;
        const a = (i / 24) * Math.PI * 2;
        const x = Math.cos(a) * R;
        const z = Math.sin(a) * R;
        return (
          <group key={i} position={[x, 0, z]}>
            <Cord a={[0, 0, 0]} b={[0, -0.09, 0]} width={0.006} />
            <Blob position={[0, -0.15, 0]} scale={[0.042, 0.062, 0.042]} color={rand(i) > 0.5 ? "#c8b08a" : "#bca07a"} ink={0.16} />
          </group>
        );
      })}
      {/* the high-explosive bomb under the hub, four small incendiaries round it */}
      <Cord a={[0, -0.06, 0]} b={[0, -0.32, 0]} width={0.01} />
      <group position={[0, -0.62, 0]}>
        <InkCylinder radius={0.085} height={0.46} color="#4a4f45" />
        <Blob position={[0, -0.23, 0]} scale={[0.085, 0.11, 0.085]} color="#4a4f45" ink={0.12} detail={2} />
        <InkCylinder radius={0.088} height={0.035} position={[0, 0.1, 0]} color="#c8a040" ink={0.006} />
        {[0, 1, 2, 3].map((k) => (
          <mesh key={k} position={[0, 0.27, 0]} rotation={[0, (k * Math.PI) / 2, 0]}>
            <boxGeometry args={[0.2, 0.12, 0.008]} />
            <meshToonMaterial color="#3e423a" gradientMap={toonRamp} />
          </mesh>
        ))}
      </group>
      {[0, 1, 2, 3].map((k) => {
        const a = (k + 0.5) * (Math.PI / 2);
        const x = Math.cos(a) * R * 0.55;
        const z = Math.sin(a) * R * 0.55;
        return (
          <group key={k}>
            <Cord a={[x, 0, z]} b={[x, -0.16, z]} width={0.006} />
            <InkCylinder radius={0.035} height={0.2} position={[x, -0.26, z]} color="#7a6a4a" ink={0.008} />
          </group>
        );
      })}
    </group>
  );
};

// The inflated envelope over its chandelier. Origin = the ring. `bags` passes through to the chandelier.
export const PaperBalloon: React.FC<{ frame: number; bags?: number }> = ({ frame, bags }) => {
  const paper = useOwned(() => paperCanvas(20));
  const { r, lines } = BALLOON;
  const cy = lines + r * 0.92; // envelope centre above the ring
  const band = -0.35; // latitude (sin) of the load band
  const points = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const rr = r * Math.sqrt(1 - band * band);
        return [Math.cos(a) * rr, cy + band * r, Math.sin(a) * rr] as Vec3;
      }),
    [cy, r],
  );
  const apex: Vec3 = [0, 0.55, 0];
  // the paper breathes a little as the hydrogen warms and the envelope rocks
  const breathe = 1 + Math.sin(frame * 0.09) * 0.006;
  return (
    <group rotation={[0, 0, Math.sin(frame * 0.03) * 0.02]}>
      <group position={[0, cy, 0]} scale={[breathe, 1 / breathe, breathe]}>
        <mesh castShadow>
          <sphereGeometry args={[r, 64, 40]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={paper} />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[r, 48, 32]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        {/* load band: a darker paper belt where the shroud lines are glued on */}
        <mesh position={[0, band * r, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r * Math.sqrt(1 - band * band) * 1.004, 0.05, 6, 64]} />
          <meshToonMaterial color="#c8bca4" gradientMap={toonRamp} />
        </mesh>
        {/* the appendix sleeve at the bottom */}
        <mesh position={[0, -r * 1.0, 0]}>
          <cylinderGeometry args={[0.16, 0.22, 0.35, 16]} />
          <meshToonMaterial color="#d8d0bc" gradientMap={toonRamp} />
        </mesh>
      </group>
      {points.map((p, i) => (
        <Cord key={i} a={p} b={apex} width={0.014} />
      ))}
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2 + Math.PI / 4;
        return <Cord key={k} a={apex} b={[Math.cos(a) * BALLOON.ring, 0, Math.sin(a) * BALLOON.ring]} width={0.01} />;
      })}
      <Chandelier frame={frame} bags={bags} swing={0.6} />
    </group>
  );
};

// The empty envelope draped over a branch running along x at height `y`: the paper hangs down both sides in folds,
// its torn hem ragged; the shroud lines run from the hem down to `to` (the chandelier, relative to the branch).
export const DrapedPaper: React.FC<{ frame: number; width: number; to: Vec3 }> = ({ frame, width, to }) => {
  const paper = useOwned(() => paperCanvas(14));
  const geo = useMemo(() => {
    const nu = 60;
    const nv = 40;
    const g = new THREE.PlaneGeometry(1, 1, nu, nv);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * 2; // -1..1 along the branch
      const v = pos.getY(i) * 2; // -1..1 across: front side down, over the top, back side down
      const side = Math.sign(v) || 1;
      const t = Math.abs(v);
      const hang = 1.9 + 0.5 * Math.sin(u * 4.1 + side) + 0.35 * Math.sin(u * 9.3 + 2 * side); // ragged hem
      const drop = Math.max(0, t - 0.15) / 0.85;
      const fold = Math.sin(u * 11 + v * 2) * 0.16 * drop + Math.sin(u * 4.3 + side) * 0.22 * drop;
      const x = u * (width / 2) * (1 - 0.18 * drop) + Math.sin(v * 3 + u) * 0.06;
      const y = 0.06 * Math.cos(Math.min(t, 0.15) / 0.15 * (Math.PI / 2)) - Math.pow(drop, 1.15) * hang;
      const z = side * (Math.sin(Math.min(t, 0.2) / 0.2 * (Math.PI / 2)) * 0.1 + drop * 0.45 + fold);
      pos.setXYZ(i, x, y, z);
    }
    g.computeVertexNormals();
    return g;
  }, [width]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  const sway = Math.sin(frame * 0.04) * 0.02;
  const hemPts = useMemo(() => Array.from({ length: 9 }, (_, i) => {
    const u = -0.8 + (i / 8) * 1.6;
    const side = i % 2 ? 1 : -1;
    const hang = 1.9 + 0.5 * Math.sin(u * 4.1 + side) + 0.35 * Math.sin(u * 9.3 + 2 * side);
    return [u * (width / 2) * 0.82, -hang * 0.96, side * 0.5] as Vec3;
  }), [width]);
  return (
    <group rotation={[sway, 0, 0]}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={paper} side={THREE.DoubleSide} />
      </mesh>
      {hemPts.map((p, i) => (
        <Cord key={i} a={p} b={to} width={0.012} />
      ))}
    </group>
  );
};

// ---------- trees ----------

// Japanese black pine on the windbreak: a crooked trunk leaning seaward, flat pads of dark needles.
const BlackPine: React.FC<{ position: Vec3; lean: number; scale?: number; seed: number }> = ({ position, lean, scale = 1, seed }) => {
  const segs = 5;
  const parts: { p: Vec3; rz: number; h: number; r: number }[] = [];
  let x = 0;
  let y = 0;
  let a = 0;
  for (let i = 0; i < segs; i++) {
    a = lean * (0.4 + i * 0.18) + (rand(seed + i) - 0.5) * 0.35;
    const h = 1.1;
    const r = 0.16 - i * 0.022;
    parts.push({ p: [x - (Math.sin(a) * h) / 2, y + (Math.cos(a) * h) / 2, 0], rz: a, h, r });
    x -= Math.sin(a) * h;
    y += Math.cos(a) * h;
  }
  return (
    <group position={position} scale={scale}>
      {parts.map((s, i) => (
        <InkCylinder key={i} radius={s.r} height={s.h + 0.1} position={s.p} rotation={[0, 0, s.rz]} color="#4a3628" ink={0.02} />
      ))}
      {Array.from({ length: 6 }, (_, k) => {
        const s = parts[Math.min(segs - 1, 2 + (k % 3))];
        const side = k % 2 ? 1 : -1;
        return (
          <Blob
            key={k}
            position={[s.p[0] + side * (0.5 + rand(seed + k) * 0.5), s.p[1] + 0.3 + rand(seed + k + 9) * 0.6, (rand(seed + k + 4) - 0.5) * 0.8]}
            scale={[0.75 + rand(seed + k) * 0.35, 0.22, 0.6]}
            color={k % 3 ? "#203a2e" : "#2a4636"}
            ink={0.05}
          />
        );
      })}
    </group>
  );
};

// A ponderosa pine: tall straight orange trunk, bare below, open crown of needle tufts high up. `branches` adds
// short limbs from `low` upward.
const Ponderosa: React.FC<{ position: Vec3; height: number; radius: number; seed: number; bark: THREE.Texture; low?: number; crown?: boolean }> = ({
  position,
  height,
  radius,
  seed,
  bark,
  low,
  crown = true,
}) => {
  const start = low ?? height * 0.55;
  const limbs = 9;
  return (
    <group position={position}>
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[radius * 0.35, radius, height, 12]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={bark} />
      </mesh>
      <mesh position={[0, height / 2, 0]}>
        <cylinderGeometry args={[radius * 0.35 + 0.025, radius + 0.025, height + 0.02, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {crown && Array.from({ length: limbs }, (_, i) => {
        const y = start + ((height - start) * (i + 0.5)) / limbs;
        const a = rand(seed + i * 3) * Math.PI * 2;
        const len = (1.3 + rand(seed + i) * 1.2) * (1 - (y - start) / (height - start) * 0.55);
        const dx = Math.cos(a) * len;
        const dz = Math.sin(a) * len;
        return (
          <group key={i}>
            <Cord a={[0, y, 0]} b={[dx, y + 0.25, dz]} width={0.05} color="#4a2c18" />
            <Blob position={[dx, y + 0.35, dz]} scale={[0.6, 0.38, 0.6]} color={i % 2 ? "#2f4a2a" : "#3a5a32"} ink={0.06} />
            <Blob position={[dx * 0.6, y + 0.3, dz * 0.6]} scale={[0.42, 0.3, 0.42]} color="#2a4226" ink={0.07} />
          </group>
        );
      })}
      {crown && <Blob position={[0, height + 0.2, 0]} scale={[0.5, 0.7, 0.5]} color="#33502c" ink={0.06} />}
    </group>
  );
};

// The crowns of every background ponderosa (the same limbs and needle tufts `Ponderosa` draws) as three instanced
// meshes: limbs, tufts and their ink hulls. As separate meshes the forest was ~3,000 GPU objects per shot, enough to
// stall headless Chrome over a long render.
const ForestCrowns: React.FC<{ trees: { p: Vec3; h: number; s: number }[] }> = ({ trees }) => {
  const meshes = useMemo(() => {
    const limbs: THREE.Matrix4[] = [];
    const tufts: { m: THREE.Matrix4; ink: THREE.Matrix4; c: string }[] = [];
    const o = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    const tuft = (x: number, y: number, z: number, sx: number, sy: number, c: string, ink: number) => {
      o.position.set(x, y, z);
      o.quaternion.identity();
      o.scale.set(sx, sy, sx);
      o.updateMatrix();
      const m = o.matrix.clone();
      o.scale.set(sx * (1 + ink), sy * (1 + ink), sx * (1 + ink));
      o.updateMatrix();
      tufts.push({ m, ink: o.matrix.clone(), c });
    };
    for (const t of trees) {
      const [px, , pz] = t.p;
      const start = t.h * 0.55;
      for (let i = 0; i < 9; i++) {
        const y = start + ((t.h - start) * (i + 0.5)) / 9;
        const a = rand(t.s + i * 3) * Math.PI * 2;
        const len = (1.3 + rand(t.s + i) * 1.2) * (1 - ((y - start) / (t.h - start)) * 0.55);
        const dx = Math.cos(a) * len;
        const dz = Math.sin(a) * len;
        const d = new THREE.Vector3(dx, 0.25, dz);
        o.position.set(px + dx / 2, y + 0.125, pz + dz / 2);
        o.quaternion.setFromUnitVectors(up, d.clone().normalize());
        o.scale.set(0.05, d.length(), 0.05);
        o.updateMatrix();
        limbs.push(o.matrix.clone());
        tuft(px + dx, y + 0.35, pz + dz, 0.6, 0.38, i % 2 ? "#2f4a2a" : "#3a5a32", 0.06);
        tuft(px + dx * 0.6, y + 0.3, pz + dz * 0.6, 0.42, 0.3, "#2a4226", 0.07);
      }
      tuft(px, t.h + 0.2, pz, 0.5, 0.7, "#33502c", 0.06);
    }
    const limbMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), new THREE.MeshBasicMaterial({ color: "#4a2c18" }), limbs.length);
    limbs.forEach((m, i) => limbMesh.setMatrixAt(i, m));
    const ico = new THREE.IcosahedronGeometry(1, 1);
    const tuftMesh = new THREE.InstancedMesh(ico, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), tufts.length);
    const inkMesh = new THREE.InstancedMesh(ico, new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), tufts.length);
    const c = new THREE.Color();
    tufts.forEach((t, i) => {
      tuftMesh.setMatrixAt(i, t.m);
      tuftMesh.setColorAt(i, c.set(t.c));
      inkMesh.setMatrixAt(i, t.ink);
    });
    tuftMesh.castShadow = true;
    return [limbMesh, tuftMesh, inkMesh];
  }, [trees]);
  React.useEffect(
    () => () =>
      meshes.forEach((m) => {
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        m.dispose();
      }),
    [meshes],
  );
  return (
    <>
      {meshes.map((m, i) => (
        <primitive key={i} object={m} />
      ))}
    </>
  );
};

// ---------- birds ----------

// Gulls crossing the dawn sky: white bodies, grey-tipped wings that flap and glide.
const Gulls: React.FC<{ frame: number; count?: number; centre: Vec3 }> = ({ frame, count = 4, centre }) => (
  <group position={centre} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const t = frame * (0.05 + rand(i) * 0.02) + i * 3.1;
      const x = ((t * 1.2 + i * 7) % 30) - 15;
      const y = rand(i + 2) * 4 + Math.sin(t * 0.7 + i) * 0.4;
      const z = (rand(i + 5) - 0.5) * 6;
      const flap = Math.sin(frame * 0.35 + i * 2) * (Math.sin(frame * 0.03 + i) > -0.2 ? 0.55 : 0.08);
      return (
        <group key={i} position={[x, y, z]} rotation={[0, -0.2, Math.sin(t) * 0.15]} scale={0.9}>
          <Blob position={[0, 0, 0]} scale={[0.22, 0.07, 0.07]} color="#f4f0ea" ink={0.12} />
          {[-1, 1].map((s) => (
            <group key={s} rotation={[s * flap, 0, 0]}>
              <mesh position={[0.02, 0, s * 0.28]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.14, 0.5]} />
                <meshToonMaterial color="#e8e6e2" gradientMap={toonRamp} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0.0, 0.002, s * 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.1, 0.1]} />
                <meshBasicMaterial color="#2a2a30" side={THREE.DoubleSide} />
              </mesh>
            </group>
          ))}
        </group>
      );
    })}
  </group>
);

// ---------- sets ----------

const DAWN_SKY: [number, string][] = [
  [-0.1, "#ffb878"],
  [0.0, "#ffa860"],
  [0.04, "#f08a6a"],
  [0.1, "#b0708a"],
  [0.2, "#6a5a8a"],
  [0.38, "#3a4478"],
  [0.65, "#24305e"],
  [1.0, "#1a2448"],
];
const DAWN_SUN: Vec3 = [0.12, 0.035, -1];

export const BeachLaunchSet: React.FC<{ camera: CameraShot; frame: number; balloon?: number | null; children?: React.ReactNode }> = ({
  camera,
  frame,
  balloon = 0.9,
  children,
}) => {
  const camX = camera.position[0];
  const sand = useOwned(() => tiled(sandCanvas(), 10, 8));
  const glitter = useOwned(() => glitterCanvas(3));
  const sunPos = new THREE.Vector3(...DAWN_SUN).normalize().multiplyScalar(280);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#3a4478"]} />
      <fog attach="fog" args={["#b88a9a", 30, 140]} />
      <ambientLight intensity={0.95} color="#c8c0e8" />
      <hemisphereLight args={["#8a8ac8", "#5a4a40", 0.5]} />
      <directionalLight
        position={[2, 3, -14]}
        intensity={2.0}
        color="#ffb27a"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={14}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />
      <directionalLight position={[-3, 6, 8]} intensity={0.55} color="#9aa8e8" />

      {/* Sky dome and the rising sun ride with the camera */}
      <group position={camera.position}>
        <SkyDome sun={DAWN_SUN} stops={DAWN_SKY} glow="#ffd8a0" />
        <mesh position={sunPos.toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[9, 48]} />
          <meshBasicMaterial color="#fff0c0" fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
        <Halo position={sunPos.clone().multiplyScalar(0.98).toArray() as Vec3} size={80} color="#ffb070" strength={0.5} />
      </group>
      {/* a far headland on the left, the sea to the horizon */}
      <Ridge z={-90} shift={camX * 0.8 - 40} width={60} low={1.2} high={4} peaks={3} color="#4a3e5e" seed={4} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.12, BEACH.shore - 150]}>
        <planeGeometry args={[600, 300]} />
        <meshToonMaterial color="#2e3c62" gradientMap={toonRamp} />
      </mesh>
      {/* the sun's path on the water, flickering */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[camX + 12, -0.1, BEACH.shore - 60]}>
        <planeGeometry args={[30, 100]} />
        <meshBasicMaterial map={glitter} transparent opacity={0.65 + 0.25 * Math.sin(frame * 0.7)} depthWrite={false} toneMapped={false} fog={false} />
      </mesh>
      {/* breakers rolling in: white foam bands that run up the sand and fade */}
      {[0, 1, 2, 3].map((k) => {
        const p = ((frame / 90 + k / 4) % 1 + 1) % 1;
        return (
          <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.09 + p * 0.08, BEACH.shore - 9 + p * 9.5]}>
            <planeGeometry args={[200, 0.35 + p * 0.5]} />
            <meshBasicMaterial color="#e8e0ee" transparent opacity={Math.sin(p * Math.PI) * 0.85} depthWrite={false} />
          </mesh>
        );
      })}
      {/* wet sand mirror strip at the waterline */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, BEACH.shore + 0.9]}>
        <planeGeometry args={[200, 2.4]} />
        <meshBasicMaterial color="#a8889a" transparent opacity={0.55} depthWrite={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, BEACH.shore + 25]} receiveShadow>
        <planeGeometry args={[200, 50]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={sand} />
      </mesh>

      {/* the launch pad: stake ring, hydrogen cylinders and the hose */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return <InkCylinder key={i} radius={0.035} height={0.3} position={[Math.cos(a) * 2.6, 0.15, Math.sin(a) * 2.6]} color="#7a5a3a" ink={0.01} />;
      })}
      {[0, 1, 2, 3, 4].map((i) => (
        <InkCylinder key={i} radius={0.14} height={1.3} position={[3.6 + i * 0.32, 0.14, 1.6 + (i % 2) * 0.1]} rotation={[Math.PI / 2, 0, 0.1]} color="#4a5a48" />
      ))}
      <Cord a={[3.5, 0.15, 0.95]} b={[1.2, 0.04, 0.3]} width={0.03} color="#2a2420" />
      {/* black pines on the windbreak, leaning seaward */}
      <BlackPine position={[-4.2, 0, 2.5]} lean={0.35} scale={1.3} seed={3} />
      <BlackPine position={[-6.0, 0, -1.5]} lean={0.25} scale={1.1} seed={11} />
      <BlackPine position={[5.6, 0, 3.4]} lean={-0.3} scale={1.4} seed={21} />
      <BlackPine position={[7.4, 0, -0.5]} lean={-0.2} scale={1.0} seed={29} />

      {balloon !== null && (
        <group position={[0, balloon, 0]}>
          <PaperBalloon frame={frame} />
        </group>
      )}
      <Gulls frame={frame} centre={[-2, 9, -10]} count={5} />
      {children}
    </>
  );
};

// Instanced bunchgrass and bitterbrush over the forest floor, kept off the bomb's patch.
const ForestTufts: React.FC = () => {
  const mesh = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.02, 0.22, 3);
    blade.translate(0, 0.11, 0);
    const pos: number[] = [];
    [-0.4, -0.15, 0.15, 0.4].forEach((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.rotateY(k * 1.3);
      pos.push(...(b.toNonIndexed().attributes.position.array as Float32Array));
    });
    const merged = new THREE.BufferGeometry();
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.computeVertexNormals();
    const count = 2200;
    const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; n < count && i < count * 3; i++) {
      const x = -8 + rand(i * 3 + 1) * 16;
      const z = -12 + rand(i * 3 + 2) * 22;
      if (Math.hypot(x - DANGLE[0], z - DANGLE[2]) < 0.6) continue;
      if (Math.hypot(x - 2.0, z + 1.6) < 0.8) continue; // keep the forgotten remnant in view
      o.position.set(x, 0, z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.6 + rand(i * 7) * 1.0;
      o.scale.set(k, k * (0.7 + rand(i * 11) * 0.7), k);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      const v = rand(i * 13);
      m.setColorAt(n, c.set(v > 0.7 ? "#b0a060" : v > 0.3 ? "#7a8a44" : "#94a052"));
      n++;
    }
    m.count = n;
    m.receiveShadow = true;
    return m;
  }, []);
  React.useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  return <primitive object={mesh} />;
};

const FallenLog: React.FC<{ position: Vec3; rotationY: number; length: number; bark: THREE.Texture }> = ({ position, rotationY, length, bark }) => (
  <group position={position} rotation={[0, rotationY, Math.PI / 2]}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[0.2, 0.24, length, 10]} />
      <meshToonMaterial color="#9a8a7a" gradientMap={toonRamp} map={bark} />
    </mesh>
    <mesh>
      <cylinderGeometry args={[0.225, 0.265, length + 0.03, 10]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// `balloon` false leaves the limb empty; `scorch` 0..1 blackens the clearing under it and lets smoke drift up
// (the aftermath); `light` 0..1 dims the sun for the sombre shots.
export const PineForestSet: React.FC<{ camera: CameraShot; frame: number; balloon?: boolean; scorch?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  balloon = true,
  scorch = 0,
  children,
}) => {
  const camX = camera.position[0];
  const floor = useOwned(() => tiled(floorCanvas(), 12, 12));
  const bark = useOwned(() => tiled(barkCanvas(), 2, 4));
  const logBark = useOwned(() => tiled(barkCanvas(), 2, 1));
  const trees = useMemo(() => {
    const out: { p: Vec3; h: number; r: number; s: number }[] = [];
    for (let i = 0; out.length < 34 && i < 400; i++) {
      const x = -22 + rand(i * 7 + 1) * 44;
      const z = -40 + rand(i * 7 + 2) * 46;
      if (z > -3 && Math.abs(x) < 5) continue; // keep the clearing round the hero pine open
      if (Math.hypot(x - HERO.x, z - HERO.z) < 3) continue;
      if (out.some((t) => Math.hypot(t.p[0] - x, t.p[2] - z) < 3.2)) continue;
      out.push({ p: [x, 0, z], h: 16 + rand(i + 9) * 8, r: 0.32 + rand(i + 4) * 0.22, s: i });
    }
    return out;
  }, []);
  const branchY = HERO.branchY;
  const branchEnd: Vec3 = [HERO.x + 3.6, branchY + 0.35, HERO.z + 0.1];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#7fb3ea"]} />
      <fog attach="fog" args={["#c8d8e4", 14, 70]} />
      <ambientLight intensity={1.1} color="#ffffff" />
      <hemisphereLight args={["#cfe4ff", "#6a5a3a", 0.55]} />
      <directionalLight
        position={[-6, 12, 5]}
        intensity={2.6}
        color="#fff2dc"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={12}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />

      <group position={camera.position}>
        <SkyDome sun={SUN_DIR} stops={CLEAR_SKY} />
      </group>
      {/* Gearhart Mountain, still snowy in May, through the trunks */}
      <Ridge z={-85} shift={camX * 0.8} width={180} low={10} high={24} peaks={4} color="#7a8aa8" seed={6} snow="#f2f4f8" />
      <Haze z={-75} color="#e4ecf2" />
      <Ridge z={-60} shift={camX * 0.55} width={160} low={6} high={12} peaks={6} color="#4a6a52" seed={12} />
      <Haze z={-52} color="#dfe8e4" />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -15]} receiveShadow>
        <planeGeometry args={[120, 80]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={floor} />
      </mesh>
      <ForestTufts />
      {Array.from({ length: 14 }, (_, i) => [-7 + rand(i + 40) * 14, -9 + rand(i + 50) * 13] as [number, number])
        .filter(([x, z]) => !(x > -0.5 && x < 4.5 && z > -2.5 && z < 4.5)) // the clearing the picnic walks through
        .map(([x, z], i) => (
        <Blob
          key={i}
          position={[x, 0.18, z]}
          scale={[0.35 + rand(i) * 0.3, 0.25, 0.35 + rand(i + 1) * 0.3]}
          color={i % 2 ? "#7a8a64" : "#8a9a6a"}
          ink={0.08}
        />
      ))}
      <Rock position={[2.4, 0.12, -1.8]} size={0.35} color="#8a8a86" seed={3} />
      <Rock position={[-3.2, 0.1, 1.8]} size={0.28} color="#7e7c78" seed={7} />
      <FallenLog position={[2.6, 0.2, -3.5]} rotationY={0.5} length={4.5} bark={logBark} />

      {trees.map((t) => (
        <Ponderosa key={t.s} position={t.p} height={t.h} radius={t.r} seed={t.s} bark={bark} crown={false} />
      ))}
      <ForestCrowns trees={trees} />
      {/* the hero pine and the long limb the balloon came down on */}
      <Ponderosa position={[HERO.x, 0, HERO.z]} height={22} radius={0.42} seed={77} bark={bark} low={8.5} />
      <Cord a={[HERO.x, branchY - 0.1, HERO.z]} b={branchEnd} width={0.09} color="#4a2c18" />
      <Blob position={branchEnd} scale={[0.7, 0.42, 0.6]} color="#2f4a2a" ink={0.06} />
      <Blob position={[HERO.x + 2.4, branchY + 0.45, HERO.z - 0.3]} scale={[0.5, 0.32, 0.45]} color="#3a5a32" ink={0.07} />
      {balloon && (
        <>
          <group position={[HERO.x + 1.75, branchY + 0.12, HERO.z + 0.05]}>
            <DrapedPaper frame={frame} width={2.8} to={[DANGLE[0] - (HERO.x + 1.75), DANGLE[1] + 0.02 - (branchY + 0.12), DANGLE[2] - (HERO.z + 0.05)]} />
          </group>
          <group position={DANGLE}>
            <Chandelier frame={frame} bags={9} swing={1} />
          </group>
        </>
      )}
      {scorch > 0 && (
        <group userData={{ ghost: true }}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[DANGLE[0], 0.01, DANGLE[2]]}>
            <circleGeometry args={[1.1, 32]} />
            <meshBasicMaterial color="#2a2018" transparent opacity={0.75 * scorch} depthWrite={false} />
          </mesh>
          <SmokePlume position={[DANGLE[0], 0.05, DANGLE[2]]} world={[DANGLE[0], DANGLE[2]]} frame={frame} size={0.09} rise={2.6} wind={0.4} period={90} puffs={7} colors={["#d8d4d0", "#a8a4a0", "#c8c4c0", "#949090"]} />
        </group>
      )}
      {children}
    </>
  );
};

// ---------- inflation on the beach ----------

// The envelope being filled on the sand before the carriage goes on: a paper dome swelling from a sagging heap to a
// full sphere (`fill` 0..1), held down by guide ropes to stakes round it. Origin = the centre of its footprint.
export const InflatingEnvelope: React.FC<{ frame: number; fill: number }> = ({ frame, fill }) => {
  const paper = useOwned(() => paperCanvas(20));
  const r = BALLOON.r * (0.6 + 0.4 * fill);
  const sy = 0.45 + 0.55 * fill;
  const cy = r * sy * (0.55 + 0.4 * fill);
  const wob = Math.sin(frame * 0.4) * 0.015 * (1 - fill) + Math.sin(frame * 0.11) * 0.01;
  const ropes = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2 + 0.13;
    const top: Vec3 = [Math.cos(a) * r * 0.82, cy + r * sy * 0.35, Math.sin(a) * r * 0.82];
    const ground: Vec3 = [Math.cos(a) * 2.6, 0.25, Math.sin(a) * 2.6];
    return { top, ground };
  });
  return (
    <group>
      <group position={[0, cy, 0]} scale={[1 + wob, sy - wob, 1 + wob]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[r, 64, 40]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={paper} />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[r, 48, 32]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      </group>
      {ropes.map((k, i) => (
        <Cord key={i} a={k.top} b={k.ground} width={0.018} color="#5a4a36" />
      ))}
    </group>
  );
};

// A balloon that has come down on open ground: the paper collapsed into a long crumpled heap, the lines trailing to
// the chandelier lying tipped on its side. Origin = the heap's centre; `heading` turns it on the ground.
export const GroundedBalloon: React.FC<{ frame: number; heading?: number; snow?: boolean }> = ({ frame, heading = 0, snow = false }) => {
  const paper = useOwned(() => paperCanvas(14));
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 24);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const crumple = 1 + 0.18 * Math.sin(x * 9 + z * 4) + 0.12 * Math.sin(z * 13 + y * 6) + 0.08 * Math.sin(x * 21);
      pos.setXYZ(i, x * 2.2 * crumple, Math.max(-0.05, y) * 0.32 * crumple, z * 1.1 * crumple);
    }
    g.computeVertexNormals();
    return g;
  }, []);
  React.useEffect(() => () => geo.dispose(), [geo]);
  const flutter = Math.sin(frame * 0.2) * 0.02;
  return (
    <group rotation={[0, heading, 0]}>
      <mesh geometry={geo} position={[0, 0.02, 0]} scale={[1, 1 + flutter, 1]} castShadow receiveShadow>
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={paper} />
      </mesh>
      <mesh geometry={geo} position={[0, 0.02, 0]} scale={[1.02, 1.05 + flutter, 1.03]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {snow && (
        <mesh geometry={geo} position={[0, 0.06, 0]} scale={[0.85, 0.9, 0.8]}>
          <meshToonMaterial color="#f4f8fc" gradientMap={toonRamp} transparent opacity={0.35} />
        </mesh>
      )}
      {[-0.5, -0.2, 0.15, 0.45].map((z, i) => (
        <Cord key={i} a={[2.0, 0.08, z]} b={[3.4, 0.25, 0]} width={0.012} />
      ))}
      <group position={[3.55, 0.3, 0]} rotation={[0, 0, -1.2]}>
        <Chandelier frame={0} bags={14} swing={0} />
      </group>
    </group>
  );
};

// ---------- above the clouds ----------

const SKIES: Record<"day" | "night" | "coast", { stops: [number, string][]; sun: Vec3; glow: string; cloud: [string, string]; fog: string; bg: string }> = {
  day: {
    stops: [[-0.1, "#e4eef8"], [0.0, "#d6e6f6"], [0.06, "#9cc4ee"], [0.16, "#5a94e0"], [0.34, "#2f66c4"], [0.62, "#1e4aa0"], [1.0, "#16367a"]],
    sun: [-0.6, 0.55, 0.6],
    glow: "#ffffff",
    cloud: ["#ffffff", "#a8bede"],
    fog: "#dce8f6",
    bg: "#2f66c4",
  },
  night: {
    stops: [[-0.1, "#3a4a78"], [0.0, "#34446e"], [0.08, "#1e2a52"], [0.25, "#121c3e"], [1.0, "#0a1028"]],
    sun: [0.5, 0.35, -1],
    glow: "#dfe8ff",
    cloud: ["#9aaad0", "#4a5a88"],
    fog: "#2a3660",
    bg: "#121c3e",
  },
  coast: {
    stops: [[-0.1, "#ffe0b0"], [0.0, "#ffd49a"], [0.06, "#f6c08a"], [0.16, "#a8b8d8"], [0.4, "#5a86c8"], [1.0, "#2a5aa8"]],
    sun: [0.7, 0.12, -1],
    glow: "#fff0c8",
    cloud: ["#fff4e4", "#c8a8a0"],
    fog: "#f0d8c0",
    bg: "#5a86c8",
  },
};

// The cloud deck far below the balloon: puffy inked blobs on a white floor, scrolling past at `speed` m/frame
// along -x so the balloon (kept near the origin) flies +x. Instanced; every blob wraps round a 160 m tile.
const CloudDeck: React.FC<{ frame: number; y: number; speed: number; colors: [string, string]; sparse?: number }> = ({ frame, y, speed, colors, sparse = 0 }) => {
  const N = 520;
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshToonMaterial({ gradientMap: toonRamp }), N);
    m.receiveShadow = true;
    return m;
  }, []);
  React.useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
    mesh.dispose();
  }, [mesh]);
  useMemo(() => {
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    const shade = new THREE.Color(colors[1]);
    let n = 0;
    for (let i = 0; i < N; i++) {
      if (rand(i * 17) < sparse) continue;
      const bx = rand(i * 3 + 1) * 160;
      const x = ((((bx - frame * speed) % 160) + 160) % 160) - 80;
      const z = -110 + rand(i * 3 + 2) * 125;
      const k = 2.2 + rand(i * 5) * 4.5;
      o.position.set(x, y + rand(i * 7) * 1.4 - (k > 5 ? 0 : 0.8), z);
      o.scale.set(k * 1.25, k * (0.55 + rand(i * 11) * 0.3), k);
      o.rotation.set(0, rand(i) * 6, 0);
      o.updateMatrix();
      mesh.setMatrixAt(n, o.matrix);
      mesh.setColorAt(n, c.set(colors[0]).lerp(shade, rand(i * 13) * 0.35));
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [frame, speed, y, colors, sparse]);
  return <primitive object={mesh} />;
};

// Jet-stream streaks: long thin white dashes rushing past (wind made visible), near the balloon's height.
const WindStreaks: React.FC<{ frame: number; speed: number; color?: string }> = ({ frame, speed, color = "#ffffff" }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 26 }, (_, i) => {
      const x = ((((rand(i) * 60 - frame * speed * 2.2) % 60) + 60) % 60) - 30;
      return (
        <mesh key={i} position={[x, -3 + rand(i + 3) * 16, -6 + rand(i + 7) * 14]}>
          <boxGeometry args={[2.5 + rand(i + 9) * 4, 0.03, 0.03]} />
          <meshBasicMaterial color={color} transparent opacity={0.45 + rand(i + 2) * 0.35} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

// The coastline seen from high above: dark sea on the left, surf, forested land with snowy peaks on the right.
const coastCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#3a5f4a";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "#2a4a38" : "#4a6e52";
      ctx.beginPath();
      ctx.arc(rand(i + 3) * 1024, rand(i + 7) * 1024, 4 + rand(i + 9) * 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#2a4a78";
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= 1024; y += 16) ctx.lineTo(330 + Math.sin(y * 0.012) * 70 + Math.sin(y * 0.05) * 18, y);
    ctx.lineTo(0, 1024);
    ctx.fill();
    ctx.strokeStyle = "#e8eef4";
    ctx.lineWidth = 7;
    ctx.beginPath();
    for (let y = 0; y <= 1024; y += 16) ctx.lineTo(330 + Math.sin(y * 0.012) * 70 + Math.sin(y * 0.05) * 18, y);
    ctx.stroke();
    for (let i = 0; i < 14; i++) {
      const x = 640 + rand(i + 40) * 360;
      const y = rand(i + 50) * 1024;
      ctx.fillStyle = "#f4f6fa";
      ctx.beginPath();
      ctx.moveTo(x, y - 40);
      ctx.lineTo(x + 30, y + 10);
      ctx.lineTo(x - 30, y + 10);
      ctx.fill();
    }
  });

// High above the clouds. `mode`: day (the jet stream, deep blue), night (moon and stars, silver clouds), coast (dawn
// over America, gaps in the deck showing the forested coast). `speed` scrolls the deck (m/frame); children are the
// balloon etc. near the origin. Camera anywhere within ±10 m of it.
export const SkySet: React.FC<{ camera: CameraShot; frame: number; mode: "day" | "night" | "coast"; speed?: number; streaks?: boolean; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  speed = 0.35,
  streaks = true, // the jet-stream dashes; off for a big subject they would cross
  children,
}) => {
  const sky = SKIES[mode];
  const coast = useOwned(() => tiled(coastCanvas(), 1, 1));
  const stars = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const p: number[] = [];
    for (let i = 0; i < 900; i++) {
      const a = rand(i) * Math.PI * 2;
      const h = 0.05 + rand(i + 900) * 0.95;
      const r = Math.sqrt(1 - h * h);
      p.push(Math.cos(a) * r * 250, h * 250, Math.sin(a) * r * 250);
    }
    g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);
  React.useEffect(() => () => stars.dispose(), [stars]);
  const sunPos = new THREE.Vector3(...sky.sun).normalize().multiplyScalar(270);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[sky.bg]} />
      <fog attach="fog" args={[sky.fog, 40, 150]} />
      <ambientLight intensity={mode === "night" ? 0.7 : 1.05} color={mode === "night" ? "#9aa8d8" : "#ffffff"} />
      <hemisphereLight args={[mode === "night" ? "#6a7ab8" : "#cfe0ff", mode === "night" ? "#2a3050" : "#d8d0c0", 0.5]} />
      <directionalLight position={sunPos.toArray()} intensity={mode === "night" ? 1.1 : 2.4} color={mode === "night" ? "#cfdcff" : mode === "coast" ? "#ffd8a8" : "#fff8ec"} />
      <group position={camera.position}>
        <SkyDome sun={sky.sun} stops={sky.stops} glow={sky.glow} />
        {mode === "night" && (
          <points geometry={stars}>
            <pointsMaterial color="#ffffff" size={1.6} sizeAttenuation={false} fog={false} transparent opacity={0.85} />
          </points>
        )}
        <mesh position={sunPos.toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[mode === "night" ? 8 : 9, 48]} />
          <meshBasicMaterial color={mode === "night" ? "#f2f0e4" : "#fffbe8"} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
        <Halo position={sunPos.clone().multiplyScalar(0.97).toArray() as Vec3} size={mode === "night" ? 50 : 70} color={sky.glow} strength={0.45} />
      </group>
      {mode === "coast" && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(((-frame * speed * 0.5) % 200) + 200) % 200 - 60, -40, -60]}>
          <planeGeometry args={[260, 260]} />
          <meshBasicMaterial map={coast} fog={false} toneMapped={false} />
        </mesh>
      )}
      <CloudDeck frame={frame} y={-9} speed={speed} colors={sky.cloud} sparse={mode === "coast" ? 0.6 : 0} />
      {mode !== "coast" && <CloudDeck frame={frame + 400} y={-16} speed={speed * 0.6} colors={sky.cloud} />}
      {streaks && mode === "day" && <WindStreaks frame={frame} speed={speed} />}
      {streaks && mode === "night" && <WindStreaks frame={frame} speed={speed} color="#aab8e8" />}
      {children}
    </>
  );
};

// ---------- snow fields ----------

const snowCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#eef3f8";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(170,190,220,0.22)" : "rgba(255,255,255,0.5)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 1) * 1024, rand(i + 2) * 1024, 50 + rand(i + 3) * 120, 14 + rand(i + 4) * 30, rand(i + 5) * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }
    // wind-carved ridges (sastrugi)
    ctx.strokeStyle = "rgba(140,160,200,0.3)";
    ctx.lineWidth = 3;
    for (let r = 0; r < 50; r++) {
      const y = rand(r + 300) * 1024;
      const x = rand(r + 400) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 60, y - 10, x + 140 + rand(r) * 80, y + 4);
      ctx.stroke();
    }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(rand(i + 5000) * 1024, rand(i + 9000) * 1024, 2, 2);
    }
  });

type SnowVariant = "alaska" | "montana" | "michigan";
const SNOW: Record<SnowVariant, { stops: [number, string][]; sun: Vec3; light: string; fog: string; bg: string; ambient: string }> = {
  alaska: { stops: [[-0.1, "#e4e8ee"], [0.0, "#d8dee8"], [0.2, "#b8c4d4"], [1.0, "#8a9ab4"]], sun: [-0.5, 0.4, -1], light: "#eef2ff", fog: "#dce2ea", bg: "#b8c4d4", ambient: "#e8eeff" },
  montana: { stops: CLEAR_SKY, sun: [-0.6, 0.35, 0.8], light: "#fff2dc", fog: "#d4e2ee", bg: "#7fb3ea", ambient: "#ffffff" },
  michigan: { stops: [[-0.1, "#ffc8a0"], [0.0, "#ffb88a"], [0.08, "#e89a90"], [0.2, "#9a7aa8"], [0.5, "#4a4a88"], [1.0, "#2a2a60"]], sun: [0.6, 0.06, -1], light: "#ffb890", fog: "#d8b0b0", bg: "#9a7aa8", ambient: "#e0d0f0" },
};

// A red barn with a gambrel roof (Michigan farm), front facing +z.
const Barn: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <mesh position={[0, 1.2, 0]} castShadow>
      <boxGeometry args={[3.2, 2.4, 4]} />
      <meshToonMaterial color="#a8322a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[3.26, 2.46, 4.06]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <mesh position={[0, 2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[1.9, 1.9, 4.2, 4, 1, false, Math.PI / 4, Math.PI]} />
      <meshToonMaterial color="#f2f4f8" gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.9, 2.02]}>
      <planeGeometry args={[1.2, 1.8]} />
      <meshBasicMaterial color="#f2ece0" />
    </mesh>
    <mesh position={[0, 0.9, 2.03]}>
      <planeGeometry args={[1.0, 1.6]} />
      <meshBasicMaterial color="#8a2a22" />
    </mesh>
  </group>
);

// Open snowy ground where balloons came down. `variant` picks the place: alaska (overcast tundra, black spruce,
// falling snow), montana (sunny range land, wire fence, the Rockies), michigan (farm field at dusk, red barn, bare
// trees). Floor y = 0; children hold the landed balloon and the sign.
export const SnowFieldSet: React.FC<{ camera: CameraShot; frame: number; variant: SnowVariant; children?: React.ReactNode }> = ({ camera, frame, variant, children }) => {
  const camX = camera.position[0];
  const v = SNOW[variant];
  const snow = useOwned(() => tiled(snowCanvas(), 14, 14));
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[v.bg]} />
      <fog attach="fog" args={[v.fog, 18, 90]} />
      <ambientLight intensity={variant === "alaska" ? 1.35 : 1.1} color={v.ambient} />
      <hemisphereLight args={["#dfe8ff", "#c8d0e0", 0.5]} />
      <directionalLight
        position={new THREE.Vector3(...v.sun).normalize().multiplyScalar(14).toArray()}
        intensity={variant === "alaska" ? 0.9 : 2.2}
        color={v.light}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <group position={camera.position}>
        <SkyDome sun={variant === "montana" ? SUN_DIR : v.sun} stops={v.stops} glow={variant === "michigan" ? "#ffd8a0" : "#ffffff"} />
      </group>
      {variant === "montana" && (
        <>
          <Ridge z={-80} shift={camX * 0.8} width={220} low={10} high={26} peaks={6} color="#8a9ac0" seed={21} snow="#f4f6fa" />
          <Haze z={-70} color="#e8eef6" />
          <Ridge z={-50} shift={camX * 0.5} width={160} low={3} high={7} peaks={7} color="#c8d4e4" seed={33} />
        </>
      )}
      {variant === "alaska" && <Ridge z={-70} shift={camX * 0.7} width={200} low={2} high={5} peaks={5} color="#c4ccd8" seed={44} snow="#eef2f6" />}
      {variant === "michigan" && <Ridge z={-60} shift={camX * 0.6} width={200} low={1} high={3} peaks={6} color="#6a5a80" seed={55} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[160, 100]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={snow} />
      </mesh>
      {variant === "alaska" &&
        Array.from({ length: 30 }, (_, i) => (
          <Pine key={i} position={[-18 + rand(i + 60) * 36, 0, -6 - rand(i + 70) * 30]} scale={0.9 + rand(i) * 1.4} color="#1e2a24" ink={0.02} />
        ))}
      {variant === "montana" &&
        Array.from({ length: 14 }, (_, i) => {
          const x = -7 + i * 1.1;
          return (
            <group key={i}>
              <InkCylinder radius={0.05} height={1.0} position={[x, 0.5, -3.2]} color="#6a4a32" ink={0.012} />
              {[0.45, 0.75].map((y) => (
                <Cord key={y} a={[x, y, -3.2]} b={[x + 1.1, y - 0.02, -3.2]} width={0.006} color="#4a4a52" />
              ))}
            </group>
          );
        })}
      {variant === "michigan" && (
        <>
          <Barn position={[-5.5, 0, -9]} rotationY={0.5} />
          {Array.from({ length: 9 }, (_, i) => (
            <group key={i} position={[2 + i * 2.2, 0, -12 - rand(i) * 6]}>
              <Cord a={[0, 0, 0]} b={[0, 3.2, 0]} width={0.09} color="#3a2e2e" />
              <Cord a={[0, 2.0, 0]} b={[0.9, 3.4, 0.2]} width={0.04} color="#3a2e2e" />
              <Cord a={[0, 2.4, 0]} b={[-0.8, 3.6, -0.1]} width={0.04} color="#3a2e2e" />
            </group>
          ))}
        </>
      )}
      {variant === "alaska" && (
        <group userData={{ ghost: true }}>
          {Array.from({ length: 160 }, (_, i) => {
            const y = 6 - (((frame * (0.025 + rand(i) * 0.02) + rand(i + 3) * 6) % 6) + 6) % 6;
            return (
              <mesh key={i} position={[camera.position[0] - 6 + rand(i + 9) * 12 + Math.sin(frame * 0.05 + i) * 0.2, y, camera.position[2] - 9 + rand(i + 11) * 8]}>
                <sphereGeometry args={[0.025, 5, 4]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            );
          })}
        </group>
      )}
      {children}
    </>
  );
};
