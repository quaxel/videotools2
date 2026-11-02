import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { Haze } from "./LakeSet";
import { Hills } from "./FarmyardSet";
import { Blob, useOwned } from "./BalloonSets";
import { Forest, Lights, Mood, MOODS, Sky, tiled, TreeSpot } from "./RiverSets";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// Niagara Falls and the Lake Erie ice jam of March 1848, built from guide/references/niagara-1848.md.
//
// NiagaraSet: the upper river runs toward +z over a flat bed of grey dolomite ledges (bed top y = 0) between stone
// banks (|x| > NIAGARA.bank, top y = NIAGARA.bankH) and falls over a gently curved crest (`crestZ(x)`, |x| <
// NIAGARA.half) into the gorge, whose plunge pool lies NIAGARA.drop below. `flow` 0..1 is how much water the river
// carries: 1 = full roaring falls with a white curtain, rapids and a mist cloud; 0 = the dry bed with pools and a few
// trickles. `surge` (a z) sends a foaming wall of water down the dry bed: water upstream of it, dry ahead. `lift`
// lowers the whole set so a bank (lift = bankH) is the floor puppets stand on. The mill with its water wheel stands on
// the right bank at MILL. Children are drawn in the set's coordinates (before `lift`).
//
// ErieSet: Lake Erie's outlet: dark lake water toward -z narrowing into the Niagara River's mouth (the neck) at z = 0.
// `push` slides the ice sheets toward the neck in the gale, `jam` piles them into a ridge across it, `burst` 0..1
// breaks the ridge and throws the slabs downstream.

type Vec3 = [number, number, number];
const INK = "#161212";

export const NIAGARA = { half: 12, curve: 2.2, drop: 9, bank: 15, bankH: 1.4, full: 0.5, dry: -0.25 };
export const crestZ = (x: number) => -NIAGARA.curve * (1 - Math.min(1, (x / NIAGARA.half) ** 2));
export const MILL = { x: NIAGARA.bank + 3.2, z: -7, wheel: [NIAGARA.bank - 0.55, 0.95, -7] as Vec3 };

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// ---------- moods ----------

export type FallsMode = "day" | "night" | "dawn" | "dusk" | "sunset" | "gale";
const FMOODS: Record<FallsMode, Mood> = {
  day: { ...MOODS.day, sun: [-4, 7, 9], water: "#3a8a80", foam: "#ffffff", far: ["#9fb4c8", "#7f98a6", "#4f6a50"] },
  night: { ...MOODS.night, water: "#2a3e5e", foam: "#a8bce0" },
  dawn: { ...MOODS.dawn, sun: [-6, 0.6, -10], water: "#2e5a7a", foam: "#fff4dc" },
  dusk: {
    stops: [[-0.1, "#f0a0a8"], [0.0, "#e090a8"], [0.06, "#a07ac0"], [0.2, "#6a5ab0"], [0.45, "#3e3a8a"], [1.0, "#1e1e5a"]],
    sun: [5, 0.3, -10],
    glow: "#ffc0c8",
    bg: "#5a4aa0",
    fog: ["#8a70b0", 25, 120],
    ambient: [1.0, "#c8b8f0"],
    hemi: ["#b0a0e8", "#2a2040", 0.6],
    key: [1.3, "#ffb8c8"],
    water: "#3e5a80",
    foam: "#ece4ff",
    far: ["#4a3e7a", "#3a3268", "#2a2650"],
  },
  sunset: {
    stops: [[-0.1, "#ffd090"], [0.0, "#ffb070"], [0.05, "#ff8a70"], [0.14, "#e0709a"], [0.3, "#9a70c0"], [0.6, "#5a6ac0"], [1.0, "#3a4aa0"]],
    sun: [-4, 0.9, 10],
    glow: "#fff0c0",
    bg: "#e0709a",
    fog: ["#f0a8a0", 30, 140],
    ambient: [1.15, "#ffe0d0"],
    hemi: ["#ffc8b0", "#4a3040", 0.6],
    key: [2.2, "#ffc090"],
    water: "#3a8078",
    foam: "#fff6ec",
    far: ["#a07090", "#805a80", "#4a4a5a"],
  },
  gale: {
    stops: [[-0.1, "#4a5a78"], [0.0, "#56688a"], [0.1, "#3e4e72"], [0.35, "#2a3658"], [1.0, "#141c38"]],
    sun: [6, 5, -10],
    glow: "#c8d8ff",
    bg: "#2a3658",
    fog: ["#3a4a6a", 18, 90],
    ambient: [1.0, "#9ab0d8"],
    hemi: ["#8aa0d8", "#1a2030", 0.55],
    key: [1.2, "#c8dcff"],
    water: "#1e3450",
    foam: "#c8e0f0",
    far: ["#1e2844", "#222e4c", "#18223a"],
    moon: true,
  },
};
export const fallsBg = (mode: FallsMode) => FMOODS[mode].bg;

export const lanternPoint = (position: Vec3, frame: number) => ({
  position,
  color: "#ffb05a",
  strength: 2.6 * (0.9 + 0.1 * Math.sin(frame * 0.5) * Math.sin(frame * 0.23 + 1)),
  range: 2.4,
});

// How puppets are lit at the falls: low sun (dawn / sunset), moon rim (night, gale), lantern if given.
export const fallsLight = (mode: FallsMode, frame: number, lantern?: Vec3): PuppetLight => {
  const points = lantern ? [lanternPoint(lantern, frame)] : [];
  if (mode === "night" || mode === "gale") return { tint: "#a0b0e0", tintAmount: 0.06, shadow: 0.25, points, distant: [{ direction: [0.6, 0.5, -0.6], color: "#b8c8ff", strength: 0.6 }] };
  if (mode === "dawn") return { tint: "#ffe8d0", shadow: 0.16, points, distant: [{ direction: [-0.5, 0.15, -0.8], color: "#ffc070", strength: 1.5 }] };
  if (mode === "dusk") return { tint: "#e8d8ff", shadow: 0.2, points, distant: [{ direction: [0.4, 0.1, -1], color: "#ffa8c0", strength: 1.0 }] };
  if (mode === "sunset") return { tint: "#ffe0d0", shadow: 0.16, points, distant: [{ direction: [-0.4, 0.15, 1], color: "#ffb070", strength: 1.5 }] };
  return { tint: "#fff6e8", shadow: 0.14, points, distant: [{ direction: [-0.5, 0.7, 0.6], color: "#fff0d0", strength: 1.1 }] };
};

// ---------- textures ----------

// Dry dolomite ledges seen from above: grey slabs with dark joints, wet streaks and pale lime.
const ledgeCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#7c7a74";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 46; i++) {
      const x = rand(i) * 512;
      const y = rand(i + 50) * 512;
      const w = 50 + rand(i + 3) * 120;
      const h = 30 + rand(i + 4) * 90;
      const v = rand(i + 5);
      ctx.fillStyle = v > 0.66 ? "#8a877f" : v > 0.33 ? "#6e6c66" : "#959088";
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(30,30,28,0.65)";
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, w, h);
    }
    for (let i = 0; i < 1600; i++) {
      ctx.fillStyle = rand(i + 900) > 0.5 ? "rgba(40,44,42,0.25)" : "rgba(200,196,186,0.22)";
      ctx.fillRect(rand(i + 1) * 512, rand(i + 2) * 512, 3, 3);
    }
    // wet dark streaks running with the old current
    ctx.strokeStyle = "rgba(38,44,46,0.35)";
    for (let i = 0; i < 26; i++) {
      ctx.lineWidth = 6 + rand(i + 70) * 14;
      const x = rand(i + 71) * 512;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 20, 170, x - 20, 340, x + 10, 512);
      ctx.stroke();
    }
  });

// The gorge cliff: horizontal grey-brown strata with dark seams.
const cliffCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#5a554c";
    ctx.fillRect(0, 0, 512, 512);
    let y = 0;
    let i = 0;
    while (y < 512) {
      const h = 18 + rand(i) * 26;
      const v = rand(i + 3);
      ctx.fillStyle = v > 0.66 ? "#8a8272" : v > 0.33 ? "#6e6858" : "#9a9280";
      ctx.fillRect(0, y, 512, h - 4);
      // vertical joints break each bed into blocks
      ctx.fillStyle = "rgba(20,18,16,0.7)";
      for (let x = rand(i + 7) * 60; x < 512; x += 40 + rand(i + x) * 70) ctx.fillRect(x, y, 3, h - 4);
      // a lighter top lip and a dark seam under each bed
      ctx.fillStyle = "rgba(255,250,235,0.25)";
      ctx.fillRect(0, y, 512, 3);
      ctx.fillStyle = "rgba(16,14,12,0.85)";
      ctx.fillRect(0, y + h - 4, 512, 4);
      y += h;
      i++;
    }
  });

// Falling water: green glassy lip at the top turning into white streaks.
const curtainCanvas = () =>
  canvasTexture(256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#2e8a74");
    g.addColorStop(0.1, "#56b49a");
    g.addColorStop(0.2, "#d8eee6");
    g.addColorStop(1, "#f4f8f6");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 110; i++) {
      const x = rand(i) * 256;
      const y = rand(i + 9) * 512;
      ctx.fillStyle = y < 60 ? "rgba(200,240,226,0.5)" : rand(i + 5) > 0.45 ? "rgba(255,255,255,0.95)" : "rgba(150,186,184,0.55)";
      ctx.fillRect(x, y, 2 + rand(i + 3) * 7, 50 + rand(i + 4) * 180);
    }
  });

// River water from above: teal with white rapids streaks along the flow.
const rapidsCanvas = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 512);
    ctx.lineCap = "round";
    for (let i = 0; i < 140; i++) {
      ctx.strokeStyle = rand(i + 2) > 0.5 ? "rgba(120,170,170,0.45)" : "rgba(255,255,255,0.9)";
      ctx.lineWidth = 1.5 + rand(i + 3) * 3;
      const x = rand(i) * 256;
      const y = rand(i + 1) * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (rand(i + 5) - 0.5) * 12, y + 40, x + (rand(i + 6) - 0.5) * 8, y + 60 + rand(i + 4) * 90);
      ctx.stroke();
    }
  });

const grassCanvas = (base: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 4500; i++) {
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.7 ? "rgba(50,40,20,0.45)" : v > 0.35 ? "rgba(170,160,90,0.35)" : "rgba(100,100,50,0.4)";
      ctx.lineWidth = 2;
      const x = rand(i) * 512;
      const y = rand(i + 7000) * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 6, y - 5 - rand(i + 4) * 7);
      ctx.stroke();
    }
  });

const stoneWallCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#4a4640";
    ctx.fillRect(0, 0, 512, 256);
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 9; c++) {
        const v = rand(r * 17 + c);
        ctx.fillStyle = v > 0.6 ? "#8a8274" : v > 0.3 ? "#7a7264" : "#958c7c";
        const off = r % 2 ? 28 : 0;
        ctx.fillRect(c * 60 + off + 3, r * 32 + 3, 54, 26);
      }
  });

const plankCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    for (let r = 0; r < 8; r++) {
      const v = rand(r * 7);
      ctx.fillStyle = v > 0.6 ? "#9a6a44" : v > 0.3 ? "#8a5c3a" : "#a8764c";
      ctx.fillRect(r * 32, 0, 32, 256);
      ctx.fillStyle = "rgba(40,24,12,0.6)";
      ctx.fillRect(r * 32 + 30, 0, 2, 256);
    }
  });

// ---------- the bed outline (everything at y = 0 that is not gorge) ----------

const bedShape = () => {
  const { half, bank } = NIAGARA;
  const s = new THREE.Shape();
  // shape y = -world z
  s.moveTo(-bank, 140);
  s.lineTo(bank, 140);
  s.lineTo(bank, -60);
  s.lineTo(half, -60);
  for (let i = 0; i <= 40; i++) {
    const x = half - (2 * half * i) / 40;
    s.lineTo(x, -crestZ(x));
  }
  s.lineTo(-half, -60);
  s.lineTo(-bank, -60);
  s.lineTo(-bank, 140);
  return s;
};

// ---------- water on the bed ----------

export type FallsWater = { flow: number; surge?: number };

// Water height over the bed at (x, z): full level times flow, or the surge: full behind its front, a foaming lip at
// the front, dry ahead.
export const bedWaterY = (x: number, z: number, frame: number, w: FallsWater) => {
  const { full, dry } = NIAGARA;
  let level = dry + (full - dry) * w.flow;
  if (w.surge !== undefined) {
    const d = z - w.surge;
    const behind = 1 - smooth(-0.6, 0.4, d);
    level = dry + (full + 0.25 - dry) * behind + 1.9 * Math.exp(-(d * d) / 1.6) * smooth(-30, -0, w.surge + 40);
  }
  const wet = level > 0 ? 1 : 0;
  return level + wet * (0.05 * Math.sin(z * 1.3 - frame * 0.35 + x * 0.6) + 0.03 * Math.sin(x * 2.1 + z * 0.7 - frame * 0.5));
};

const BedWater: React.FC<{ frame: number; m: Mood; w: FallsWater }> = ({ frame, m, w }) => {
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(NIAGARA.bank * 2, 120, 60, 240);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -60 + 0.5);
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 3), 3));
    return g;
  });
  const tex = useOwned(() => tiled(rapidsCanvas(), 6, 24));
  tex.offset.y = frame * 0.02;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  const base = new THREE.Color(m.water);
  const foam = new THREE.Color(m.foam);
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const cz = Math.abs(x) < NIAGARA.half ? crestZ(x) : 0;
    let y = bedWaterY(x, Math.min(z, cz), frame, w);
    // past the crest the sheet bends over the lip and down; with no water at the lip it is tucked away under the pool
    if (z > cz) y = y > 0.02 ? y - (z - cz) * 6 : -NIAGARA.drop - 2;
    pos.setY(i, Math.max(y, -NIAGARA.drop));
    c.copy(base);
    // whiter toward the crest (the rapids speed up) and at the surge front
    c.lerp(foam, Math.min(0.75, smooth(cz - 10, cz, z) * 0.55 + (w.surge !== undefined ? Math.exp(-((z - w.surge + 0.8) ** 2) / 1.5) * 0.7 : 0)));
    if (w.surge !== undefined && z > w.surge && z < w.surge + 1.6) c.multiplyScalar(0.7);
    col.setXYZ(i, c.r, c.g, c.b);
  }
  pos.needsUpdate = true;
  col.needsUpdate = true;
  geo.computeVertexNormals();
  return (
    <group userData={{ ghost: true }}>
      <mesh geometry={geo} receiveShadow>
        <meshToonMaterial color="#ffffff" vertexColors map={tex} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// Standing white waves of the rapids (rows of foam lumps) and the foaming front of a surge.
const Whitewater: React.FC<{ frame: number; w: FallsWater; m: Mood }> = ({ frame, w, m }) => {
  const n = 220;
  const items: React.ReactElement[] = [];
  for (let i = 0; i < n; i++) {
    const x = (rand(i) - 0.5) * NIAGARA.bank * 1.9;
    const z = -2 - rand(i + 1) * 60;
    const wet = bedWaterY(x, z, frame, w);
    if (wet < 0.05) continue;
    const near = w.surge !== undefined ? Math.abs(z - w.surge) < 1.2 : false;
    const amount = w.surge !== undefined ? (near ? 1 : 0.25) : w.flow;
    if (rand(i + 2) > amount) continue;
    const s = (0.18 + rand(i + 3) * 0.25) * (near ? 2.2 : 1) * (0.85 + 0.15 * Math.sin(frame * 0.6 + i));
    items.push(<Blob key={i} position={[x, wet + 0.02, z + Math.sin(frame * 0.3 + i) * 0.1]} rotation={[0, i, frame * 0.1 + i]} scale={[s * 1.4, s * 0.45, s * 0.8]} color={m.foam} ink={0.04} detail={0} />);
  }
  // the rolling white crest of a surge: a row of tumbling foam lumps right across the bed
  if (w.surge !== undefined)
    for (let i = 0; i < 34; i++) {
      const x = -NIAGARA.bank + 0.3 + (i / 33) * (NIAGARA.bank * 2 - 0.6) + (rand(i + 60) - 0.5) * 0.4;
      const top = bedWaterY(x, w.surge, frame, w);
      const s = (0.45 + rand(i + 61) * 0.3) * (0.85 + 0.15 * Math.sin(frame * 0.5 + i * 2.3));
      items.push(<Blob key={`c${i}`} position={[x, top - 0.05, w.surge + 0.25 + (rand(i + 62) - 0.5) * 0.4]} rotation={[frame * 0.2 + i, i, 0]} scale={[s * 1.3, s * 0.75, s]} color="#f6f4ff" ink={0.05} detail={1} />);
    }
  // spray flung ahead of a surge front
  if (w.surge !== undefined)
    for (let i = 0; i < 40; i++) {
      const life = 16;
      const age = (frame + rand(i + 5) * life) % life;
      const x = (rand(i + 6) - 0.5) * NIAGARA.bank * 1.8;
      const y = 0.9 + age * 0.09 - age * age * 0.006;
      const s = 0.08 + rand(i + 7) * 0.1;
      items.push(<Blob key={`s${i}`} position={[x, y, w.surge + 0.4 + age * 0.12]} scale={[s, s, s]} color="#ffffff" ink={0.1} detail={1} />);
    }
  return <group userData={{ ghost: true }}>{items}</group>;
};

// ---------- the falls ----------

// One ribbon of falling water: from the lip at the origin, bowing out toward +z and down to the pool.
const ribbonGeo = () => {
  const g = new THREE.PlaneGeometry(1, 1, 1, 18);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const v = 0.5 - p.getY(i); // 0 top .. 1 bottom
    p.setXYZ(i, p.getX(i), -NIAGARA.drop * v, 1.3 * Math.sqrt(v) + 0.15);
  }
  g.computeVertexNormals();
  return g;
};

const Curtain: React.FC<{ frame: number; flow: number }> = ({ frame, flow }) => {
  const geo = useOwned(ribbonGeo);
  const tex = useOwned(() => tiled(curtainCanvas(), 1, 1));
  tex.offset.y = -((frame * 0.045) % 1);
  tex.wrapT = THREE.ClampToEdgeWrapping;
  const mat = useOwned(() => new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, toneMapped: false, depthWrite: false }));
  const N = 44;
  const { half } = NIAGARA;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: N }, (_, i) => {
        const x = -half + ((i + 0.5) / N) * half * 2;
        const step = (half * 2) / N;
        // each strand has its own threshold: as the flow drops the curtain breaks into strands, then trickles
        const keep = smooth(rand(i + 3) * 0.7, rand(i + 3) * 0.7 + 0.25, flow);
        const trickle = [9, 22, 33].includes(i) ? 0.12 : 0;
        const width = step * 1.08 * keep + trickle * (1 - keep);
        if (width < 0.02) return null;
        const yaw = Math.atan2((crestZ(x + 0.1) - crestZ(x - 0.1)) / 0.2, 1);
        return (
          <mesh key={i} geometry={geo} material={mat} position={[x, NIAGARA.full * flow + 0.02, crestZ(x)]} rotation={[0, -yaw, 0]} scale={[width, 1, 1]} />
        );
      })}
    </group>
  );
};

// The cliff face under the crest, the plunge pool, talus blocks, churning foam and the rising mist cloud.
const Gorge: React.FC<{ frame: number; flow: number; m: Mood; mist: number }> = ({ frame, flow, m, mist }) => {
  const { half, drop, bank } = NIAGARA;
  const cliff = useOwned(() => tiled(cliffCanvas(), 6, 2));
  const cliffSide = useOwned(() => tiled(cliffCanvas(), 14, 2));
  const face = useOwned(() => {
    const pts: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const N = 40;
    for (let i = 0; i <= N; i++) {
      const x = -half + (2 * half * i) / N;
      const z = crestZ(x) + 0.05;
      pts.push(x, 0.02, z, x, -drop - 0.5, z + 0.3);
      uv.push(i / N, 1, i / N, 0);
      if (i < N) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  });
  const poolY = -drop + 0.6 * flow;
  return (
    <>
      <mesh geometry={face}>
        <meshToonMaterial color="#ffffff" map={cliff} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      {/* gorge walls and the land beside the gorge */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <InkBox size={[bank - half + 20, drop + 0.6, 90]} position={[s * (half + (bank - half + 20) / 2), -drop / 2 - 0.3, 45]} color="#ffffff" map={cliffSide} ink={0.03} />
        </group>
      ))}
      {/* plunge pool */}
      <mesh position={[0, poolY, 40]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[half * 2 + 1, 90]} />
        <meshToonMaterial color={m.water} gradientMap={toonRamp} />
      </mesh>
      {/* talus: fallen blocks at the foot, half drowned when the river runs */}
      <group userData={{ ghost: true }}>
        {Array.from({ length: 36 }, (_, i) => {
          const x = (rand(i + 40) - 0.5) * half * 1.9;
          const z = crestZ(x) + 1.0 + rand(i + 41) * 5;
          const s = 0.5 + rand(i + 42) * 1.3;
          return <InkBox key={i} size={[s * 1.4, s, s * 1.1]} position={[x, -drop + s * 0.3, z]} rotation={[rand(i) * 0.5, rand(i + 1) * 3, rand(i + 2) * 0.4]} color={rand(i + 43) > 0.5 ? "#7a766c" : "#66625a"} ink={0.03} />;
        })}
        {/* churning foam at the foot */}
        {flow > 0.05 &&
          Array.from({ length: 34 }, (_, i) => {
            const x = -half + 0.4 + (i / 33) * (half * 2 - 0.8);
            const s = (0.9 + rand(i) * 0.7) * (0.85 + 0.15 * Math.sin(frame * 0.4 + i * 1.7)) * flow;
            return <Blob key={`f${i}`} position={[x, poolY + 0.2, crestZ(x) + 2.0 + rand(i + 3) * 1.5]} scale={[s * 1.4, s * 0.6, s]} color="#f4f8f6" ink={0.04} detail={0} />;
          })}
        {/* the mist cloud boiling up out of the plunge pool */}
        {mist > 0.02 &&
          Array.from({ length: 16 }, (_, i) => {
            const t = (frame * 0.008 + rand(i + 20)) % 1;
            const x = (rand(i + 21) - 0.5) * half * 1.8;
            const r = (0.9 + t * 2.2) * (0.7 + rand(i + 22) * 0.6);
            return (
              <mesh key={`m${i}`} position={[x + Math.sin(t * 3 + i) * 1.5, poolY + 0.5 + t * (drop + 2), crestZ(x) + 2.2 + t * 3.5]}>
                <sphereGeometry args={[r, 16, 12]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.16 * Math.sin(t * Math.PI) * Math.min(1, mist)} depthWrite={false} />
              </mesh>
            );
          })}
      </group>
    </>
  );
};

// A rainbow arc standing in the mist, `amount` 0..1.
export const Rainbow: React.FC<{ position: Vec3; radius: number; amount: number; rotation?: Vec3 }> = ({ position, radius, amount, rotation = [0, 0, 0] }) => {
  const cols = ["#ff5a5a", "#ffa040", "#ffe060", "#70e070", "#60a0ff", "#9a70e0"];
  if (amount < 0.02) return null;
  return (
    <group position={position} rotation={rotation} userData={{ ghost: true }}>
      {cols.map((c, i) => (
        <mesh key={i}>
          <torusGeometry args={[radius - i * radius * 0.014, radius * 0.008, 6, 64, Math.PI]} />
          <meshBasicMaterial color={c} transparent opacity={0.6 * amount} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} fog={false} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- the bed ----------

// Flat slabs and blocks lying on the bed (ghost: they are knee-high at most), pools of water left in the hollows.
const Ledges: React.FC<{ clear: [number, number, number][]; dry: number; m: Mood }> = ({ clear, dry, m }) => {
  const slabs = useMemo(() => {
    const out: { p: Vec3; s: Vec3; r: number; c: string }[] = [];
    for (let i = 0; i < 160; i++) {
      const x = (rand(i + 200) - 0.5) * NIAGARA.bank * 1.85;
      const z = Math.min(crestZ(x) - 0.4, 2) - rand(i + 201) * 45;
      if (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      const h = 0.06 + rand(i + 202) * 0.28;
      out.push({ p: [x, h / 2, z], s: [0.7 + rand(i + 203) * 2.2, h, 0.5 + rand(i + 204) * 1.6], r: rand(i + 205) * 0.6, c: rand(i + 206) > 0.5 ? "#8a867c" : "#6c6a64" });
    }
    return out;
  }, [clear]);
  return (
    <group userData={{ ghost: true }}>
      {slabs.map((b, i) => (
        <InkBox key={i} size={b.s} position={b.p} rotation={[0, b.r, 0]} color={b.c} ink={0.02} />
      ))}
      {dry > 0.5 &&
        Array.from({ length: 30 }, (_, i) => {
          const x = (rand(i + 400) - 0.5) * NIAGARA.bank * 1.7;
          const z = Math.min(crestZ(x) - 1, 0) - rand(i + 401) * 40;
          if (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r * 0.6)) return null;
          const r = 0.5 + rand(i + 402) * 1.4;
          return (
            <mesh key={`p${i}`} position={[x, 0.012, z]} rotation={[-Math.PI / 2, 0, rand(i)]} scale={[1, 0.6, 1]}>
              <circleGeometry args={[r, 20]} />
              <meshToonMaterial color={m.water} gradientMap={toonRamp} emissive={m.glow} emissiveIntensity={0.12} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- the mill ----------

// A timber mill on the right bank with a big wooden undershot wheel in the river; `turn` = wheel angle (radians).
export const Mill: React.FC<{ turn: number; frame: number; lamp?: boolean }> = ({ turn, frame, lamp = true }) => {
  const planks = useOwned(() => tiled(plankCanvas(), 3, 2));
  const H = NIAGARA.bankH;
  return (
    <>
      <group position={[MILL.x, H, MILL.z]}>
        <InkBox size={[3.6, 3.0, 4.2]} position={[0, 1.5, 0]} color="#ffffff" map={planks} ink={0.03} />
        {[-1, 1].map((s) => (
          <InkBox key={s} size={[2.3, 0.1, 4.6]} position={[s * 0.95, 3.55, 0]} rotation={[0, 0, -s * 0.62]} color="#4a3a30" ink={0.02} />
        ))}
        {/* door and a lit window toward the river */}
        <InkBox size={[0.04, 1.4, 0.8]} position={[-1.82, 0.7, 1.0]} color="#3a2414" ink={0.01} />
        <InkBox size={[0.04, 0.55, 0.6]} position={[-1.82, 1.9, -0.9]} color={lamp ? "#ffd27a" : "#2a2a34"} ink={0.015} emissive={lamp ? "#c87a20" : undefined} />
        {lamp && <Halo position={[-1.9, 1.9, -0.9]} size={1.6} color="#ffb05a" strength={0.45 + 0.05 * Math.sin(frame * 0.3)} />}
      </group>
      {/* axle and the wheel turning in the river channel */}
      <group position={MILL.wheel} rotation={[turn, 0, 0]}>
        <group userData={{ ghost: true }}>
          {[-0.35, 0.35].map((dx) => (
            <mesh key={dx} position={[dx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[1.3, 0.06, 6, 28]} />
              <meshToonMaterial color="#6a4a30" gradientMap={toonRamp} />
            </mesh>
          ))}
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <group key={i} rotation={[a, 0, 0]}>
                <InkBox size={[0.06, 1.3, 0.06]} position={[0.35, 0.65, 0]} color="#7a5a3a" ink={0.01} />
                <InkBox size={[0.06, 1.3, 0.06]} position={[-0.35, 0.65, 0]} color="#7a5a3a" ink={0.01} />
                <InkBox size={[0.82, 0.4, 0.05]} position={[0, 1.3, 0]} color="#8a6440" ink={0.012} />
              </group>
            );
          })}
          <InkCylinder radius={0.12} height={1.6} rotation={[0, 0, Math.PI / 2]} color="#4a3220" ink={0.01} />
        </group>
      </group>
    </>
  );
};

// ---------- the Niagara set ----------

export const NiagaraSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: FallsMode;
  water: FallsWater;
  mist?: number;
  rainbow?: number;
  lift?: number;
  clear?: [number, number, number][];
  mill?: boolean;
  wheel?: number;
  millLamp?: boolean;
  children?: React.ReactNode;
}> = ({ camera, frame, mode, water, mist, rainbow = 0, lift = 0, clear = [], mill = true, wheel = 0, millLamp, children }) => {
  const m = FMOODS[mode];
  const camX = camera.position[0];
  const { half, bank, bankH, drop } = NIAGARA;
  const ledge = useOwned(() => tiled(ledgeCanvas(), 5, 20));
  const grass = useOwned(() => tiled(grassCanvas(mode === "night" || mode === "gale" ? "#3e4638" : "#7a7a48"), 10, 40));
  const wall = useOwned(() => tiled(stoneWallCanvas(), 30, 1));
  const bed = useOwned(() => {
    const g = new THREE.ShapeGeometry(bedShape(), 1);
    g.rotateX(-Math.PI / 2);
    // shape y = -z, so after rotateX(-90°) a point (x, sy) lands at z = -sy: correct
    const p = g.attributes.position as THREE.BufferAttribute;
    const uv = new Float32Array(p.count * 2);
    for (let i = 0; i < p.count; i++) {
      uv[i * 2] = p.getX(i) / 30 + 0.5;
      uv[i * 2 + 1] = p.getZ(i) / 120;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  });
  const trees = useMemo(() => {
    const out: TreeSpot[] = [];
    for (let i = 0; i < 120; i++) {
      const s = i % 2 ? 1 : -1;
      const x = s * (bank + 2 + rand(i) * 16);
      const z = 30 - rand(i + 500) * 110;
      if (s > 0 && Math.abs(x - MILL.x) < 4 && Math.abs(z - MILL.z) < 5) continue;
      out.push({ p: [x, bankH, z], h: 6 + rand(i + 9) * 5, s: i * 7 });
    }
    return out;
  }, [bank, bankH]);
  const leaf: [string, string] = mode === "night" || mode === "gale" ? ["#22302c", "#3a3a40"] : ["#3e5a40", "#8a7a5a"];
  const flow = water.surge !== undefined ? 0 : water.flow;
  const mistAmount = mist ?? flow;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} reach={18} map={2048} />
      <Sky camera={camera} m={m} />
      <group position={[0, -lift, 0]}>
        <Hills z={-160} shift={camX * 0.8} width={420} low={3} high={8} color={m.far[0]} seed={4} />
        <Haze z={-140} color={m.fog[0]} />
        <Hills z={-125} shift={camX * 0.5} width={320} low={2} high={6} color={m.far[1]} seed={8} />
        <Hills z={110} shift={camX * 0.5} width={320} low={2} high={7} color={m.far[2]} seed={13} />

        <mesh geometry={bed} receiveShadow>
          <meshToonMaterial color="#ffffff" map={ledge} gradientMap={toonRamp} />
        </mesh>
        {/* dark under the bed so a low camera never sees through */}
        <mesh position={[0, -drop - 2, -30]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[200, 200]} />
          <meshBasicMaterial color="#1e1c1a" />
        </mesh>
        <Ledges clear={clear} dry={1 - Math.max(flow, water.surge !== undefined ? 0 : flow)} m={m} />
        <BedWater frame={frame} m={m} w={water} />
        <Whitewater frame={frame} w={water} m={m} />
        <Curtain frame={frame} flow={flow} />
        <Gorge frame={frame} flow={flow} m={m} mist={mistAmount} />

        {/* the banks: stone walls up to grassy land at bankH, both sides, running past the gorge */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <InkBox size={[0.6, bankH + 0.1, 140]} position={[s * (bank + 0.3), bankH / 2 - 0.05, -40]} color="#ffffff" map={wall} ink={0.02} />
            <mesh position={[s * (bank + 40), bankH, -20]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[80, 180]} />
              <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
            </mesh>
            {/* land between the gorge rim and the bank wall, downstream of the crest */}
            <mesh position={[s * (half + (bank - half) / 2), 0.001, 40]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[bank - half, 80]} />
              <meshToonMaterial color="#ffffff" map={ledge} gradientMap={toonRamp} />
            </mesh>
          </group>
        ))}
        <Forest trees={trees} leaf={leaf} />
        {mill && <Mill turn={wheel} frame={frame} lamp={millLamp ?? (mode === "night" || mode === "dusk")} />}
        <Rainbow position={[0, -drop + 1, crestZ(0) + 9]} radius={11} amount={rainbow} />
        {children}
      </group>
    </>
  );
};

// ---------- Lake Erie ----------

export const ERIE = { neck: 3.2, water: 0 };

// The shoreline half-width at z: wide lake for z < -8, narrowing to the river neck at z = 0 and beyond.
export const erieHalf = (z: number) => (z > 0 ? ERIE.neck : ERIE.neck + (z < -14 ? 40 : ((-z / 14) ** 2) * 40));

type Floe = { x: number; z: number; w: number; d: number; t: number; yaw: number };

const makeFloes = (): Floe[] => {
  const out: Floe[] = [];
  for (let i = 0; i < 110; i++) {
    out.push({ x: (rand(i + 1) - 0.5) * 34, z: -6 - rand(i + 2) * 46, w: 1.2 + rand(i + 3) * 2.6, d: 1.0 + rand(i + 4) * 2.2, t: 0.25 + rand(i + 5) * 0.3, yaw: rand(i + 6) * 3 });
  }
  return out;
};

// The ice sheets: slide toward the neck with `push` (metres), pile up tilted in a ridge across it with `jam`
// (0..1), and with `burst` (0..1) the ridge breaks and the slabs tumble away downstream (+z).
const Floes: React.FC<{ frame: number; push: number; jam: number; burst: number }> = ({ frame, push, jam, burst }) => {
  const floes = useMemo(makeFloes, []);
  return (
    <group userData={{ ghost: true }}>
      {floes.map((f, i) => {
        let z = f.z + push * (0.8 + rand(i + 9) * 0.4);
        let x = f.x;
        let y = 0.04 + Math.sin(frame * 0.08 + i) * 0.03;
        let rx = Math.sin(frame * 0.05 + i) * 0.04;
        let rz = 0;
        // squeezed by the narrowing shore toward the neck
        const lim = erieHalf(Math.min(z, 0)) - f.w * 0.3;
        x = Math.max(-lim, Math.min(lim, x * (0.55 + 0.45 * smooth(-3, -18, z))));
        if (i < 46 && jam > 0) {
          // jammed slabs: stacked and tilted in a ridge just above the neck
          const k = smooth(i / 46 - 0.1, i / 46 + 0.15, jam);
          const row = i % 4;
          const jx = (rand(i + 20) - 0.5) * ERIE.neck * 2.2;
          const jz = -1.2 - row * 0.9 + rand(i + 21) * 0.5;
          x = x + (jx - x) * k;
          z = z + (jz - z) * k;
          y = y + k * (0.2 + row * 0.35 + rand(i + 22) * 0.5);
          rx += k * (rand(i + 23) - 0.5) * 1.6;
          rz = k * (rand(i + 24) - 0.5) * 1.4;
          if (burst > 0) {
            const b = burst * (0.8 + rand(i + 25) * 0.6);
            z += b * (6 + rand(i + 26) * 14);
            x += (rand(i + 27) - 0.5) * b * 2;
            y += Math.sin(Math.min(1, b) * Math.PI) * (1 + rand(i + 28) * 1.5);
            rx += b * (rand(i + 29) - 0.5) * 6;
          }
        }
        return (
          <group key={i} position={[x, y, z]} rotation={[rx, f.yaw * (1 - Math.min(1, jam)), rz]}>
            <InkBox size={[f.w, f.t, f.d]} color={rand(i + 30) > 0.4 ? "#eef6fa" : "#dcecf4"} ink={0.03} />
            <InkBox size={[f.w * 0.96, f.t * 0.4, f.d * 0.96]} position={[0, -f.t * 0.45, 0]} color="#8fc0d8" ink={0} />
          </group>
        );
      })}
    </group>
  );
};

// Snow and spray streaking sideways in the gale (ghost).
export const GaleStreaks: React.FC<{ frame: number; centre: Vec3; dir?: number; count?: number }> = ({ frame, centre, dir = 1, count = 70 }) => (
  <group userData={{ ghost: true }} position={centre}>
    {Array.from({ length: count }, (_, i) => {
      const life = 20;
      const age = (frame + rand(i) * life) % life;
      const x = (rand(i + 1) - 0.5) * 16 + dir * (age - life / 2) * 0.9;
      return (
        <mesh key={i} position={[x, rand(i + 2) * 5, (rand(i + 3) - 0.5) * 14]} rotation={[0, 0, -dir * 0.12]}>
          <boxGeometry args={[0.5 + rand(i + 4) * 0.7, 0.025, 0.025]} />
          <meshBasicMaterial color="#e8f2ff" transparent opacity={0.75} toneMapped={false} />
        </mesh>
      );
    })}
  </group>
);

export const ErieSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode: FallsMode;
  push?: number;
  jam?: number;
  burst?: number;
  gale?: number;
  children?: React.ReactNode;
}> = ({ camera, frame, mode, push = 0, jam = 0, burst = 0, gale = 1, children }) => {
  const m = FMOODS[mode];
  const camX = camera.position[0];
  const grass = useOwned(() => tiled(grassCanvas("#4a5040"), 10, 10));
  const geo = useOwned(() => {
    const g = new THREE.PlaneGeometry(90, 140, 90, 140);
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -30);
    return g;
  });
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const z = p.getZ(i);
    p.setY(i, ERIE.water - 0.15 + gale * (0.09 * Math.sin(x * 0.9 + z * 0.4 - frame * 0.25) + 0.05 * Math.sin(x * 2.1 - z * 1.3 - frame * 0.4)));
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
  // the shore: land blocks either side of the narrowing lake and the river
  const shore = useMemo(() => {
    const out: { x: number; z: number; w: number }[] = [];
    for (let z = -40; z <= 30; z += 1.5) out.push({ x: erieHalf(z), z, w: 1.5 });
    return out;
  }, []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={m.fog} />
      <Lights m={m} reach={20} map={2048} />
      <Sky camera={camera} m={m} />
      <Hills z={-160} shift={camX * 0.8} width={420} low={0.5} high={2.5} color={m.far[0]} seed={21} />
      <group userData={{ ghost: true }}>
        <mesh geometry={geo}>
          <meshToonMaterial color={m.water} gradientMap={toonRamp} />
        </mesh>
      </group>
      {shore.map((s, i) =>
        [-1, 1].map((side) => (
          <group key={`${i}${side}`}>
            <mesh position={[side * (s.x + 30), 0.35, s.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[60, s.w + 0.02]} />
              <meshToonMaterial color="#ffffff" map={grass} gradientMap={toonRamp} />
            </mesh>
            <InkBox size={[0.6, 0.7, s.w + 0.05]} position={[side * (s.x + 0.3), 0, s.z]} color="#5a5248" ink={0.015} />
          </group>
        )),
      )}
      <Floes frame={frame} push={push} jam={jam} burst={burst} />
      {/* rushing water bursting out of the broken jam */}
      {burst > 0 &&
        Array.from({ length: 40 }, (_, i) => {
          const t = (frame * 0.05 + rand(i)) % 1;
          const x = (rand(i + 1) - 0.5) * ERIE.neck * 1.8;
          const s = 0.3 + rand(i + 2) * 0.4;
          return <Blob key={i} position={[x, 0.2 + Math.sin(t * Math.PI) * 0.8 * burst, -0.5 + t * 14 * burst]} scale={[s * 1.4, s * 0.6, s]} color="#f0f6fa" ink={0.04} detail={0} />;
        })}
      {gale > 0 && <GaleStreaks frame={frame} centre={[camera.position[0], 0.3, camera.position[2] - 7]} />}
      {children}
    </>
  );
};
