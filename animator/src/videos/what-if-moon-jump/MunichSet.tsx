import React, { useLayoutEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, clamp01, easeIn, easeOut, Halo, InkCylinder, PuppetLight, rand, ramp, SkyDome, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { RBox, WavingFlag } from "./HoustonSet";

// The 1972 Olympic stadium in Munich at dusk, the high-jump fan. Metres, floor y = 0 (red synthetic apron).
// The bar rests at BAR.y between BAR.x0 and BAR.x1 at z = BAR.z on two uprights at x = ±UPRIGHT_X; the blue landing
// mat (MAT) lies behind it. The jumper's run-up is clear on the right (x 1..6, z -0.5..3). Behind: the track (lanes
// along x, z -2.2..-4.3), flagpoles, the stand's front wall with the MUNICH 1972 banner (z = STAND.wall), seven rows of
// an instanced crowd rising to y 3.4, the translucent tent roof on cables and masts, floodlights, a far tower, and a
// camera-riding dusk dome (orange horizon to violet). `bar` 0..1 knocks the bar off: it hops on its pegs, the uprights
// shudder and it drops back onto the mat (pure function of `bar`; `barPose(bar)` gives its ends).

type Vec3 = [number, number, number];

export const BAR = { y: 1.1, x0: -0.7, x1: 0.7, z: 0 };
export const UPRIGHT_X = 0.76;
export const MAT = { z0: -0.6, z1: -1.6, top: 0.5, half: 1.5 };
export const STAND = { wall: -4.6, wallTop: 1.4 };
export const RUN_UP: [number, number] = [3.6, 1.6]; // a start mark for the jumper's curved run-up (x, z)
export const MUNICH_CAM: CameraShot = { position: [0.6, 1.2, 3.8], target: [0, 1.0, 0], fov: 40 };

const BAR_LEN = BAR.x1 - BAR.x0 + 0.04;
const ROWS = 7;
const ROW = { z0: -5.0, depth: 0.7, rise: 0.28 };
const rowZ = (i: number) => ROW.z0 - i * ROW.depth;
const rowY = (i: number) => STAND.wallTop + i * ROW.rise;

// Dusk light on the puppets: the low orange sun from front-left, the floodlights from above-behind as a pale rim.
export const munichLight = (frame: number): PuppetLight => ({
  tint: "#ffb088",
  tintAmount: 0.07,
  shadow: 0.18,
  distant: [
    { direction: [-0.8, 0.35, 0.55], color: "#ffb070", strength: 1.35 },
    { direction: [0.25, 0.9, -0.55], color: "#fff0dc", strength: 0.9 + 0.02 * Math.sin(frame * 0.3) },
  ],
});

// The bar's two ends for a knock 0..1: the right end (struck first) hops and goes, the left follows, both drop back
// onto the mat and bounce.
export const barPose = (bar: number): { a: Vec3; b: Vec3; shake: number } => {
  const p = clamp01(bar);
  if (p <= 0) return { a: [BAR.x0, BAR.y, BAR.z], b: [BAR.x1, BAR.y, BAR.z], shake: 0 };
  const end = (x: number, start: number, land: Vec3): Vec3 => {
    const hop = 0.07 * Math.sin(Math.PI * ramp(p, start - 0.12, start + 0.04));
    const t = ramp(p, start, start + 0.42);
    const zt = easeOut(t);
    const yt = easeIn(t);
    const b = ramp(p, start + 0.42, start + 0.42 + 0.3);
    const bounce = 0.07 * Math.abs(Math.sin(b * Math.PI * 2)) * (1 - b);
    return [x + (land[0] - x) * zt, BAR.y + hop + (land[1] - BAR.y) * yt + bounce, BAR.z + (land[2] - BAR.z) * zt];
  };
  const b = end(BAR.x1, 0.12, [0.55, MAT.top + 0.022, -0.82]);
  const a = end(BAR.x0, 0.24, [-0.78, MAT.top + 0.022, -0.7]);
  const shake = Math.sin(p * 60) * Math.exp(-p * 5) * ramp(p, 0, 0.05);
  return { a, b, shake };
};

// ---------- textures ----------

const tartanTex = () => {
  const t = canvasTexture(1024, 1024, (ctx) => {
    const g = ctx.createRadialGradient(512, 512, 100, 512, 512, 720);
    g.addColorStop(0, "#b8473a");
    g.addColorStop(1, "#a23c31");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 1024);
    // rubber granules
    for (let i = 0; i < 16000; i++) {
      const v = rand(i, 201);
      ctx.fillStyle = v > 0.6 ? "rgba(255,190,160,0.10)" : v > 0.3 ? "rgba(60,10,6,0.12)" : "rgba(140,40,30,0.15)";
      ctx.fillRect(rand(i, 202) * 1024, rand(i, 203) * 1024, 2, 2);
    }
    // worn patches and spike scuffs
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = i % 3 ? "rgba(70,18,12,0.09)" : "rgba(255,200,170,0.06)";
      ctx.beginPath();
      ctx.ellipse(rand(i, 204) * 1024, rand(i, 205) * 1024, 20 + rand(i, 206) * 90, 10 + rand(i, 207) * 40, rand(i, 208) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 200; i++) {
      ctx.strokeStyle = "rgba(60,14,10,0.18)";
      ctx.lineWidth = 2;
      const x = rand(i, 209) * 1024;
      const y = rand(i, 210) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i, 211) - 0.5) * 18, y + (rand(i, 212) - 0.5) * 18);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
  return t;
};

const matTex = () =>
  canvasTexture(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#5f8fe0");
    g.addColorStop(1, "#4a78c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    // quilted panels and stitching
    ctx.strokeStyle = "rgba(20,40,90,0.45)";
    ctx.lineWidth = 3;
    for (let x = 0; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    ctx.setLineDash([6, 6]);
    ctx.strokeStyle = "rgba(220,235,255,0.35)";
    ctx.lineWidth = 2;
    for (let x = 6; x <= 512; x += 64) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 256);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    // scuffs, dusty footprints of red tartan, a faded patch
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = i % 4 ? "rgba(20,30,60,0.10)" : "rgba(180,80,60,0.12)";
      ctx.beginPath();
      ctx.ellipse(rand(i, 221) * 512, rand(i, 222) * 256, 6 + rand(i, 223) * 40, 4 + rand(i, 224) * 14, rand(i, 225) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(0, 0, 512, 30);
  });

const concreteTex = () => {
  const t = canvasTexture(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#d8c8bc");
    g.addColorStop(1, "#b8a69a");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rand(i, 231) > 0.5 ? "rgba(60,40,30,0.08)" : "rgba(255,255,255,0.06)";
      ctx.fillRect(rand(i, 232) * 512, rand(i, 233) * 256, 2, 2);
    }
    // water streaks and form joints
    for (let i = 0; i < 24; i++) {
      const x = rand(i, 234) * 512;
      const s = ctx.createLinearGradient(0, 0, 0, 256);
      s.addColorStop(0, "rgba(60,40,30,0.16)");
      s.addColorStop(1, "rgba(60,40,30,0)");
      ctx.fillStyle = s;
      ctx.fillRect(x, 0, 4 + rand(i, 235) * 10, 120 + rand(i, 236) * 130);
    }
    ctx.fillStyle = "rgba(50,35,25,0.3)";
    for (let x = 0; x < 512; x += 128) ctx.fillRect(x, 0, 2, 256);
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
};

const bannerTex = () =>
  canvasTexture(1024, 256, (ctx) => {
    ctx.fillStyle = "#f4ead6";
    ctx.fillRect(0, 0, 1024, 256);
    // pastel stripes at the ends, in the games' palette
    const stripes = ["#8cc6e8", "#7ab87a", "#f0a040", "#e0603a"];
    stripes.forEach((c, i) => {
      ctx.fillStyle = c;
      ctx.fillRect(14 + i * 22, 0, 16, 256);
      ctx.fillRect(1024 - 30 - i * 22, 0, 16, 256);
    });
    ctx.fillStyle = "#c8482e";
    ctx.font = "bold 132px Helvetica, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MUNICH 1972", 512, 136);
    // weathering
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(120,90,60,0.07)";
      ctx.beginPath();
      ctx.ellipse(rand(i, 241) * 1024, rand(i, 242) * 256, 10 + rand(i, 243) * 60, 4 + rand(i, 244) * 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const barTex = () =>
  canvasTexture(256, 16, (ctx) => {
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = i === 0 || i === 15 ? "#1a1a1a" : i % 2 ? "#d8382c" : "#f6f2ea";
      ctx.fillRect(i * 16, 0, 16, 16);
    }
  });

const uprightTex = () =>
  canvasTexture(32, 512, (ctx) => {
    ctx.fillStyle = "#e8e6e0";
    ctx.fillRect(0, 0, 32, 512);
    ctx.fillStyle = "#222";
    for (let k = 0; k < 64; k++) ctx.fillRect(0, k * 8, k % 5 === 0 ? 20 : 10, 2);
  });

// The tent roof's acrylic panels: a square cable net over pale, slightly milky sheets.
const roofTex = () => {
  const t = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(200,190,220,0.25)";
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if ((i + j) % 2) ctx.fillRect(i * 64, j * 64, 64, 64);
    ctx.strokeStyle = "rgba(40,30,50,0.65)";
    ctx.lineWidth = 3;
    for (let k = 0; k <= 256; k += 64) {
      ctx.beginPath();
      ctx.moveTo(k, 0);
      ctx.lineTo(k, 256);
      ctx.moveTo(0, k);
      ctx.lineTo(256, k);
      ctx.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(16, 6);
  return t;
};

// ---------- pieces ----------

// A tent-roof lobe: the leading edge scallops low between anchor points and the cloth lifts to peaks at the masts.
const ROOF = { x0: -30, x1: 30, zBack: -34 };
const roofEdge = (x: number): [number, number] => [-11.5 - 1.6 * Math.cos(x * 0.33 + 0.4), 5.5 + 0.9 * Math.sin(x * 0.16 + 0.9) + 0.6 * Math.cos(x * 0.33 + 0.4)];
const PEAKS: [number, number, number][] = [
  [-9, -19, 6],
  [3.5, -22, 7],
  [15, -18, 5],
];
const roofY = (x: number, z: number, v: number) => {
  const [, ye] = roofEdge(x);
  let y = ye + (13 - ye) * Math.pow(v, 0.7);
  for (const [px, pz, h] of PEAKS) y += h * Math.exp(-((x - px) ** 2 + (z - pz) ** 2) / 26);
  return y;
};
const Roof: React.FC = () => {
  const tex = useOwned(roofTex);
  const geo = useOwned(() => {
    const nx = 90;
    const nz = 30;
    const g = new THREE.PlaneGeometry(1, 1, nx, nz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (i % (nx + 1)) / nx;
      const v = Math.floor(i / (nx + 1)) / nz;
      const x = ROOF.x0 + (ROOF.x1 - ROOF.x0) * u;
      const [ze] = roofEdge(x);
      const z = ze + (ROOF.zBack - ze) * v;
      pos.setXYZ(i, x, roofY(x, z, v), z);
    }
    g.computeVertexNormals();
    return g;
  });
  // the thick edge cable along the leading edge
  const edge = useOwned(() => {
    const pts = Array.from({ length: 121 }, (_, i) => {
      const x = ROOF.x0 + ((ROOF.x1 - ROOF.x0) * i) / 120;
      const [z] = roofEdge(x);
      return new THREE.Vector3(x, roofY(x, z, 0), z);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.09, 6, false);
  });
  return (
    <group userData={{ audit: false }}>
      <mesh geometry={geo}>
        <meshBasicMaterial map={tex} color="#e8dcf0" transparent opacity={0.32} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh geometry={edge}>
        <meshToonMaterial color="#4a3a48" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A tall leaning steel mast with cables down to the roof peaks.
const Mast: React.FC<{ foot: Vec3; top: Vec3; to: Vec3[] }> = ({ foot, top, to }) => {
  const seg = (a: Vec3, b: Vec3, r: number, color: string, key?: string) => {
    const va = new THREE.Vector3(...a);
    const vb = new THREE.Vector3(...b);
    const d = vb.clone().sub(va);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return (
      <mesh key={key} position={va.clone().add(vb).multiplyScalar(0.5).toArray()} quaternion={q}>
        <cylinderGeometry args={[r, r, d.length(), 8]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
    );
  };
  return (
    <group userData={{ audit: false }}>
      {seg(foot, top, 0.45, "#6a5a6e")}
      {to.map((p, i) => seg(top, p, 0.05, "#3a2e3c", `c${i}`))}
      <mesh position={top}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshToonMaterial color="#5a4a5e" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A bank of floodlights hung from the roof edge, aimed down at the field.
const Floodlight: React.FC<{ position: Vec3; frame: number; seed: number }> = ({ position, frame, seed }) => {
  const hot = new THREE.Color("#fff3d8").multiplyScalar(3.2 + 0.15 * Math.sin(frame * 0.4 + seed));
  return (
    <group position={position} rotation={[0.5, 0, 0]}>
      <mesh>
        <boxGeometry args={[1.5, 0.75, 0.25]} />
        <meshToonMaterial color="#3a3240" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[(i % 4) * 0.35 - 0.525, Math.floor(i / 4) * 0.32 - 0.16, 0.13]}>
          <circleGeometry args={[0.13, 16]} />
          <meshBasicMaterial color={hot} toneMapped={false} />
        </mesh>
      ))}
      <Halo position={[0, 0, 0.3]} size={5} color="#ffe8c0" strength={0.45} />
    </group>
  );
};

// A row of a seated crowd, instanced: bodies (shirt colours), heads (skin), and raised arms on the cheering ones.
const CROWD_SHIRTS = ["#e0603a", "#f0a040", "#8cc6e8", "#f4ead6", "#c8382c", "#7ab87a", "#d8b060", "#6a5a8a", "#ffffff", "#a8442e"];
const CROWD_SKIN = ["#f0c8a8", "#e0b090", "#c8916a", "#9a6a48", "#f4d6bc"];
const Crowd: React.FC<{ frame: number }> = ({ frame }) => {
  const seats = useMemo(() => {
    const out: { x: number; y: number; z: number; i: number }[] = [];
    let i = 0;
    for (let r = 0; r < ROWS; r++)
      for (let x = -16; x <= 16; x += 0.5) {
        i++;
        if (rand(i, 301) < 0.08) continue; // an empty seat now and then
        out.push({ x: x + (rand(i, 302) - 0.5) * 0.14 + (r % 2) * 0.25, y: rowY(r), z: rowZ(r) - 0.18, i });
      }
    return out;
  }, []);
  const n = seats.length;
  const bodyGeo = useOwned(() => new THREE.CapsuleGeometry(0.15, 0.2, 4, 10).translate(0, 0.27, 0));
  const headGeo = useOwned(() => new THREE.SphereGeometry(0.11, 12, 10).translate(0, 0.6, 0));
  const armGeo = useOwned(() => new THREE.CapsuleGeometry(0.04, 0.26, 3, 6).translate(0, 0.17, 0));
  const bodyMat = useOwned(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp }));
  const headMat = useOwned(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp }));
  const armMat = useOwned(() => new THREE.MeshToonMaterial({ gradientMap: toonRamp }));
  const bodies = useRef<THREE.InstancedMesh>(null);
  const heads = useRef<THREE.InstancedMesh>(null);
  const arms = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const B = bodies.current;
    const H = heads.current;
    const A = arms.current;
    if (!B || !H || !A) return;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    seats.forEach((s, k) => {
      const cheer = rand(s.i, 303) > 0.72;
      const ph = rand(s.i, 304) * 6.28;
      const bob = cheer ? Math.max(0, Math.sin(frame * 0.32 + ph)) * 0.06 : Math.sin(frame * 0.05 + ph) * 0.008;
      const sz = 0.92 + rand(s.i, 305) * 0.16;
      o.position.set(s.x, s.y + bob, s.z);
      o.rotation.set(0, (rand(s.i, 306) - 0.5) * 0.5, Math.sin(frame * 0.1 + ph) * 0.03);
      o.scale.setScalar(sz);
      o.updateMatrix();
      B.setMatrixAt(k, o.matrix);
      H.setMatrixAt(k, o.matrix);
      // two arms up for the cheering ones, waving
      const w = Math.sin(frame * 0.32 + ph) * 0.35;
      for (let side = 0; side < 2; side++) {
        const j = k * 2 + side;
        const sgn = side ? 1 : -1;
        if (cheer) {
          o.position.set(s.x + sgn * 0.15 * sz, s.y + bob + 0.4 * sz, s.z);
          o.rotation.set(0, 0, sgn * (-0.35 - w * sgn * 0.5));
          o.scale.setScalar(sz);
        } else {
          o.scale.setScalar(0.0001);
        }
        o.updateMatrix();
        A.setMatrixAt(j, o.matrix);
        A.setColorAt(j, c.set(CROWD_SKIN[Math.floor(rand(s.i, 307) * CROWD_SKIN.length)]));
      }
      B.setColorAt(k, c.set(CROWD_SHIRTS[Math.floor(rand(s.i, 308) * CROWD_SHIRTS.length)]));
      H.setColorAt(k, c.set(CROWD_SKIN[Math.floor(rand(s.i, 307) * CROWD_SKIN.length)]));
    });
    for (const m of [B, H, A]) {
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
      m.computeBoundingSphere();
    }
  });
  return (
    // the stands run past the frame edges on purpose: the crowd is left out of the edge audit
    <group userData={{ audit: false }}>
      <instancedMesh ref={bodies} args={[bodyGeo, bodyMat, n]} userData={{ heads: { y: 0.6, r: 0.11 }, audit: false }} castShadow /* the stands run past the frame edges on purpose */ />
      <instancedMesh ref={heads} args={[headGeo, headMat, n]} />
      <instancedMesh ref={arms} args={[armGeo, armMat, n * 2]} />
    </group>
  );
};

// Camera flashes popping in the stands.
const Flashes: React.FC<{ frame: number }> = ({ frame }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 14 }, (_, k) => {
      const slot = Math.floor((frame + k * 7) / 5);
      if (rand(k, slot + 400) < 0.55) return null;
      const r = Math.floor(rand(k, slot + 401) * ROWS);
      const x = (rand(k, slot + 402) - 0.5) * 14;
      return (
        <group key={k} position={[x, rowY(r) + 0.5, rowZ(r) + 0.05]}>
          <mesh>
            <sphereGeometry args={[0.05, 8, 6]} />
            <meshBasicMaterial color={new THREE.Color("#ffffff").multiplyScalar(4)} toneMapped={false} />
          </mesh>
          <Halo position={[0, 0, 0.06]} size={0.9} color="#e8f0ff" strength={0.6} />
        </group>
      );
    })}
  </group>
);

const tricolour = (cols: string[], vertical = false) => (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  cols.forEach((c, i) => {
    ctx.fillStyle = c;
    if (vertical) ctx.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h);
    else ctx.fillRect(0, (i * h) / cols.length, w, h / cols.length + 1);
  });
};
const FLAG_DRAWS = [
  tricolour(["#1a1a1a", "#d8382c", "#f0c040"]),
  tricolour(["#2a58a8", "#f6f2ea", "#d8382c"], true),
  tricolour(["#3a8a4a", "#f6f2ea", "#d8382c"], true),
  tricolour(["#f6f2ea", "#2a58a8", "#d8382c"]),
  tricolour(["#8cc6e8", "#f6f2ea", "#8cc6e8"]),
];

// The high-jump standard: weighted base, a marked upright and the peg holder at bar height.
const Upright: React.FC<{ x: number; side: -1 | 1; tilt: number; tex: THREE.Texture }> = ({ x, side, tilt, tex }) => (
  <group position={[x, 0, BAR.z]} rotation={[tilt * 0.6, 0, tilt * side]}>
    <RBox size={[0.36, 0.06, 0.36]} r={0.025} position={[0, 0.03, 0]} color="#4a4a52" />
    <RBox size={[0.07, 0.04, 0.07]} r={0.01} position={[0, 0.08, 0]} color="#8a8a92" />
    <mesh position={[0, 1.2, 0]} castShadow>
      <boxGeometry args={[0.045, 2.3, 0.045]} />
      <meshToonMaterial color="#ffffff" map={tex} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 1.2, 0]}>
      <boxGeometry args={[0.061, 2.316, 0.061]} />
      <meshBasicMaterial color="#161212" side={THREE.BackSide} />
    </mesh>
    <RBox size={[0.09, 0.09, 0.08]} r={0.015} position={[0, BAR.y + 0.01, 0]} color="#d8382c" ink={0.006} />
    <mesh position={[-side * 0.05, BAR.y - 0.03, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.012, 0.012, 0.07, 8]} />
      <meshToonMaterial color="#c0c0c8" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// ---------- the set ----------

export const MunichSet: React.FC<{ camera: CameraShot; frame: number; bar?: number; children?: React.ReactNode }> = ({ camera, frame, bar = 0, children }) => {
  const camX = camera.position[0];
  const floor = useOwned(tartanTex);
  const mat = useOwned(matTex);
  const concrete = useOwned(concreteTex);
  const banner = useOwned(bannerTex);
  const barT = useOwned(barTex);
  const upTex = useOwned(uprightTex);
  const { a, b, shake } = barPose(bar);
  const va = new THREE.Vector3(...a);
  const vb = new THREE.Vector3(...b);
  const dir = vb.clone().sub(va).normalize();
  const mid = va.clone().add(vb).multiplyScalar(0.5);
  const barQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const SKY: [number, string][] = [
    [-0.1, "#ffa850"],
    [0.0, "#ffa850"],
    [0.08, "#ff9050"],
    [0.16, "#f87a5a"],
    [0.26, "#d8607a"],
    [0.4, "#9a4a8e"],
    [0.65, "#563888"],
    [1.0, "#241c4a"],
  ];
  const sun: Vec3 = [-7, 0.5, -9];
  const tower = camX * 0.85;
  const beacon = frame % 45 < 22 ? 2.6 : 0.3;

  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#e06a6e"]} />
      <fog attach="fog" args={["#e88a70", 30, 130]} />
      <ambientLight intensity={0.6} color="#f0b8c0" />
      <hemisphereLight args={["#c8a0e8", "#7a3020", 0.55]} />
      <directionalLight
        position={[-6, 3.2, 5]}
        intensity={1.45}
        color="#ffb070"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      {/* the floodlights' wash from above-behind */}
      <directionalLight position={[2, 12, -10]} intensity={0.9} color="#fff0dc" />
      <pointLight position={[0, 3.5, 1]} intensity={2.2} distance={8} color="#ffd8b0" />

      <group position={camera.position}>
        <SkyDome sun={sun} stops={SKY} glow="#ffe0a0" />
      </group>

      {/* far tower and city silhouette, with parallax */}
      <group position={[tower, 0, 0]} userData={{ audit: false }}>
        <group position={[-14, 0, -95]}>
          <mesh position={[0, 13, 0]}>
            <cylinderGeometry args={[0.5, 1.1, 26, 12]} />
            <meshBasicMaterial color="#6a4a7a" fog={false} />
          </mesh>
          <mesh position={[0, 24, 0]}>
            <cylinderGeometry args={[2.0, 1.4, 2.2, 16]} />
            <meshBasicMaterial color="#5a3e6c" fog={false} />
          </mesh>
          <mesh position={[0, 29, 0]}>
            <cylinderGeometry args={[0.12, 0.3, 8, 8]} />
            <meshBasicMaterial color="#5a3e6c" fog={false} />
          </mesh>
          <mesh position={[0, 33.2, 0]}>
            <sphereGeometry args={[0.35, 8, 6]} />
            <meshBasicMaterial color={new THREE.Color("#ff3020").multiplyScalar(beacon)} toneMapped={false} fog={false} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => (
            <mesh key={i} position={[(i - 2) * 0.9, 24 + (i % 2) * 0.3, 1.9]}>
              <planeGeometry args={[0.4, 0.25]} />
              <meshBasicMaterial color={new THREE.Color("#ffd890").multiplyScalar(1.4)} toneMapped={false} fog={false} />
            </mesh>
          ))}
        </group>
      </group>

      {/* ---------- ground: apron, kerb, lanes ---------- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -8]} receiveShadow>
        <planeGeometry args={[80, 40]} />
        <meshToonMaterial color="#d4aaa0" map={floor} gradientMap={toonRamp} />
      </mesh>
      <InkCylinder radius={0.04} height={60} position={[0, 0.04, -2.2]} rotation={[0, 0, Math.PI / 2]} color="#e8e8ec" ink={0.006} />
      {[-2.5, -3.1, -3.7, -4.25].map((z) => (
        <mesh key={z} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, z]}>
          <planeGeometry args={[60, 0.05]} />
          <meshBasicMaterial color="#f4eee6" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ))}
      {/* chalk tape marks on the run-up and a curved run-up line */}
      {[
        [RUN_UP[0], RUN_UP[1], 0.3],
        [2.2, 1.1, -0.4],
        [1.3, 0.55, 0.8],
      ].map(([x, z, r], i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, r]} position={[x, 0.003, z]}>
          <planeGeometry args={[0.3, 0.06]} />
          <meshBasicMaterial color="#f4eee6" polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
        <ringGeometry args={[4.6, 4.65, 64, 1, -0.15, 1.0]} />
        <meshBasicMaterial color="#f4eee6" transparent opacity={0.6} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
      </mesh>

      {/* ---------- landing mat ---------- */}
      <RBox size={[MAT.half * 2, MAT.top - 0.06, MAT.z0 - MAT.z1]} r={0.1} position={[0, (MAT.top - 0.06) / 2, (MAT.z0 + MAT.z1) / 2]} color="#3a68c0" map={mat} />
      <RBox size={[MAT.half * 2 - 0.08, 0.08, MAT.z0 - MAT.z1 - 0.06]} r={0.035} position={[0, MAT.top - 0.04, (MAT.z0 + MAT.z1) / 2]} color="#ffffff" map={mat} />
      {/* side handles */}
      {[-0.9, 0, 0.9].map((x) => (
        <mesh key={x} position={[x, 0.24, MAT.z0 + 0.002]}>
          <planeGeometry args={[0.3, 0.06]} />
          <meshToonMaterial color="#20386a" gradientMap={toonRamp} polygonOffset polygonOffsetFactor={-2} polygonOffsetUnits={-2} />
        </mesh>
      ))}
      {/* a low second mat at the back */}
      <RBox size={[MAT.half * 2 + 0.4, 0.3, 0.6]} r={0.08} position={[0, 0.15, MAT.z1 - 0.3]} color="#2e5aa8" map={mat} />

      {/* ---------- uprights and bar ---------- */}
      <Upright x={-UPRIGHT_X} side={-1} tilt={shake * 0.02} tex={upTex} />
      <Upright x={UPRIGHT_X} side={1} tilt={shake * 0.035} tex={upTex} />
      <group position={mid.toArray()} quaternion={barQ}>
        <mesh castShadow>
          <cylinderGeometry args={[0.02, 0.02, BAR_LEN, 12]} />
          <meshToonMaterial color="#ffffff" map={barT} gradientMap={toonRamp} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.027, 0.027, BAR_LEN + 0.014, 12]} />
          <meshBasicMaterial color="#161212" side={THREE.BackSide} />
        </mesh>
      </group>

      {/* ---------- props by the fan ---------- */}
      <group position={[-2.2, 0, -0.2]}>
        <RBox size={[0.8, 0.05, 0.5]} r={0.02} position={[0, 0.72, 0]} color="#e8dcc8" />
        {[-0.35, 0.35].map((x) => (
          <mesh key={x} position={[x, 0.36, 0]}>
            <boxGeometry args={[0.04, 0.72, 0.4]} />
            <meshToonMaterial color="#8a8a92" gradientMap={toonRamp} />
          </mesh>
        ))}
        <RBox size={[0.25, 0.02, 0.32]} r={0.005} position={[-0.1, 0.755, 0]} rotation={[0, 0.2, 0]} color="#fbf6e6" ink={0.003} />
      </group>
      {[
        [2.6, -0.9],
        [-1.9, -1.9],
      ].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          <mesh position={[0, 0.16, 0]} castShadow>
            <coneGeometry args={[0.11, 0.32, 16]} />
            <meshToonMaterial color="#ff7a2a" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0, 0.16, 0]}>
            <cylinderGeometry args={[0.065, 0.085, 0.06, 16, 1, true]} />
            <meshToonMaterial color="#f6f2ea" gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}

      {/* ---------- flagpoles along the track ---------- */}
      {[-3.2, -1.3, 1.1, 3.0, 5.0].map((x, i) => (
        <WavingFlag key={i} position={[x, 3.0, -4.3]} size={[0.9, 0.56]} frame={frame} draw={FLAG_DRAWS[i % FLAG_DRAWS.length]} pole={3.0} amp={0.07} speed={0.16} seed={i * 1.7} />
      ))}

      {/* ---------- the stand ---------- */}
      <RBox size={[60, STAND.wallTop, 0.3]} r={0.04} position={[0, STAND.wallTop / 2, STAND.wall - 0.15]} color="#ffffff" map={concrete} ink={0} />
      <mesh position={[-0.35, 1.85, STAND.wall + 0.004]}>
        <planeGeometry args={[2.3, 0.58]} />
        <meshToonMaterial map={banner} gradientMap={toonRamp} />
      </mesh>
      {/* rail along the wall top */}
      <InkCylinder radius={0.025} height={60} position={[0, STAND.wallTop + 0.45, STAND.wall - 0.05]} rotation={[0, 0, Math.PI / 2]} color="#c8c8d0" ink={0.005} />
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} position={[-15 + i, STAND.wallTop + 0.22, STAND.wall - 0.05]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
          <meshToonMaterial color="#c8c8d0" gradientMap={toonRamp} />
        </mesh>
      ))}
      {/* stepped terraces with benches */}
      {Array.from({ length: ROWS }, (_, r) => (
        <group key={r}>
          <mesh position={[0, rowY(r) / 2, rowZ(r) - ROW.depth / 2 + 0.35]} receiveShadow>
            <boxGeometry args={[60, rowY(r), ROW.depth]} />
            <meshToonMaterial color={r % 2 ? "#d8c4b8" : "#ccb8ac"} gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0, rowY(r) + 0.06, rowZ(r) - 0.1]}>
            <boxGeometry args={[60, 0.05, 0.28]} />
            <meshToonMaterial color={r % 3 === 0 ? "#e0603a" : r % 3 === 1 ? "#f0a040" : "#c8482e"} gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      {/* back rim of the stand */}
      <mesh position={[0, rowY(ROWS) / 2 + 0.3, rowZ(ROWS) - 0.2]}>
        <boxGeometry args={[60, rowY(ROWS) + 0.6, 0.4]} />
        <meshToonMaterial color="#a8949a" gradientMap={toonRamp} />
      </mesh>
      <Crowd frame={frame} />
      <Flashes frame={frame} />

      {/* ---------- the tent roof, masts and floodlights ---------- */}
      <Roof />
      <Mast foot={[5, 0, -36]} top={[7.5, 32, -30]} to={[[3.5, roofY(3.5, -22, 0.4) + 0.2, -22], [15, roofY(15, -18, 0.3) + 0.2, -18], [-9, roofY(-9, -19, 0.35) + 0.2, -19]]} />
      <Mast foot={[-16, 0, -40]} top={[-17, 28, -32]} to={[[-9, roofY(-9, -19, 0.35) + 0.2, -19], [-20, roofY(-20, -16, 0.2), -16]]} />
      {[-6, -2.2, 1.6, 5.4].map((x, i) => {
        const [z] = roofEdge(x);
        return <Floodlight key={i} position={[x, roofY(x, z, 0) - 0.5, z + 0.3]} frame={frame} seed={i} />;
      })}
      {/* hazy shafts of floodlight down onto the field */}
      <group userData={{ ghost: true }}>
        {[-2.2, 1.6].map((x, i) => {
          const [z] = roofEdge(x);
          const top = new THREE.Vector3(x, roofY(x, z, 0) - 0.6, z + 0.4);
          const foot = new THREE.Vector3(x * 0.3, 0, 0.5);
          const d = foot.clone().sub(top);
          const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d.clone().normalize());
          return (
            <mesh key={i} position={top.clone().add(foot).multiplyScalar(0.5).toArray()} quaternion={q}>
              <cylinderGeometry args={[0.6, 4.0, d.length(), 32, 1, true]} />
              <meshBasicMaterial color="#ffe6c0" transparent opacity={0.03} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
            </mesh>
          );
        })}
      </group>
      {children}
    </>
  );
};
