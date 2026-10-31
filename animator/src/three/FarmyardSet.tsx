import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture } from "./kit";
import { Campfire, firePoint, Haze, SmokePlume } from "./LakeSet";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { SkyDome, SUN_DIR } from "./sky";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// A Kentucky farmyard on a clear March morning in 1876, built from photo references
// (guide/references/kentucky-farmyard-1876.md). Floor y = 0 is short early-spring grass with a trodden dirt patch.
// A hewn-log house with pale chinking, a stone end chimney and a shingle roof stands at the back (front wall at
// z = HOUSE.front); worm (zigzag rail) fences run along the left, behind the house and down the right. In the yard:
// the soap station — a black iron kettle on legs over a small wood fire at `KETTLE`, an ash hopper on a frame
// dripping into a bucket, a lye barrel and a woodpile. Beyond: pasture, a line of bare trees and cedars, and the
// wooded knobs of Bath County fading blue (parallax). The sky is cloudless.
// Light puppets with `farmLight(f)`, and `farmLight(f, true)` when they stand by the kettle fire.

type Vec3 = [number, number, number];

export const KETTLE: Vec3 = [0.5, 0, 0.6];
export const KETTLE_RIM = 0.58; // height of the kettle's lip
export const HOUSE = { front: -3.0, left: -2.7, right: 1.5 };
export const HOPPER: Vec3 = [-1.35, 0, -0.9];
const FENCE_GREY = ["#a39d90", "#8f897c", "#b0aa9c"];

// The high late-morning sun (front-left) as a warm-white key, plus the kettle fire when a puppet stands next to it.
export const farmLight = (frame: number, fire = false): PuppetLight => ({
  tint: "#fff6e8",
  shadow: 0.14,
  distant: [{ direction: [-0.55, 0.75, 0.45], color: "#fff0d0", strength: 1.1 }],
  points: fire ? [{ ...firePoint(KETTLE, frame), strength: 1.8 * (firePoint(KETTLE, frame).strength / 2.8), range: 0.9 }] : [],
});

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- textures ----------

const grassCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#8ea457";
    ctx.fillRect(0, 0, 1024, 1024);
    // Soft clumps of darker and drier grass
    for (let i = 0; i < 90; i++) {
      const v = rand(i + 50);
      ctx.fillStyle = v > 0.6 ? "rgba(96,124,58,0.35)" : v > 0.3 ? "rgba(180,164,102,0.3)" : "rgba(150,176,92,0.35)";
      ctx.beginPath();
      ctx.ellipse(rand(i) * 1024, rand(i + 400) * 1024, 30 + rand(i + 9) * 60, 18 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // March grass: green with tan, last year's dry blades showing through, in short strokes
    for (let i = 0; i < 9000; i++) {
      const x = rand(i) * 1024;
      const y = rand(i + 7000) * 1024;
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.78 ? "#c2ad70" : v > 0.5 ? "#6f8c40" : v > 0.22 ? "#a6bc68" : "#5e7a36";
      ctx.lineWidth = 2 + rand(i + 5) * 1.5;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 3) - 0.5) * 8, y - 7 - rand(i + 4) * 10);
      ctx.stroke();
    }
    // Clover leaves and a few bare earth specks
    for (let i = 0; i < 260; i++) {
      const x = rand(i + 3000) * 1024;
      const y = rand(i + 3100) * 1024;
      if (rand(i + 3200) > 0.35) {
        ctx.fillStyle = "#5f8a3a";
        for (let k = 0; k < 3; k++) {
          ctx.beginPath();
          ctx.arc(x + Math.cos(k * 2.1) * 4, y + Math.sin(k * 2.1) * 4, 3.6, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        ctx.fillStyle = "rgba(120,94,64,0.7)";
        ctx.fillRect(x, y, 5, 3);
      }
    }
  });

// Big soft light and dark patches laid over the grass at a larger scale, so the tiling never reads.
const patchCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.clearRect(0, 0, 512, 512);
    for (let i = 0; i < 26; i++) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      const dark = rand(i + 70) > 0.5;
      g.addColorStop(0, dark ? "rgba(60,80,30,0.32)" : "rgba(230,220,150,0.22)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.save();
      ctx.translate(rand(i) * 512, rand(i + 20) * 512);
      ctx.scale(60 + rand(i + 40) * 90, 40 + rand(i + 41) * 60);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });

// Instanced tufts of grass over the yard (three blades each), kept off the trodden dirt and the house.
const Tufts: React.FC = () => {
  const mesh = useMemo(() => {
    const blade = new THREE.ConeGeometry(0.012, 0.11, 3);
    blade.translate(0, 0.055, 0);
    const parts = [-0.35, 0, 0.35].map((a, k) => {
      const b = blade.clone();
      b.rotateZ(a);
      b.translate((k - 1) * 0.012, 0, (k % 2) * 0.01);
      return b;
    });
    const merged = new THREE.BufferGeometry();
    const pos: number[] = [];
    for (const p of parts) {
      const nonIndexed = p.toNonIndexed();
      pos.push(...(nonIndexed.attributes.position.array as Float32Array));
    }
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.computeVertexNormals();
    const count = 2600;
    const m = new THREE.InstancedMesh(merged, new THREE.MeshToonMaterial({ gradientMap: toonRamp }), count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let n = 0;
    for (let i = 0; n < count && i < count * 4; i++) {
      const x = -3.4 + rand(i * 3 + 1) * 6.0;
      const z = -2.7 + rand(i * 3 + 2) * 9.5;
      const dirt = ((x + 0.2) / 2.1) ** 2 + ((z - 0.1) / 1.6) ** 2 < 1;
      if (dirt && rand(i + 77) > 0.12) continue;
      if (Math.hypot(x - 1.75, z - 0.35) < 0.75) continue; // keep the macro spot in the grass clear
      o.position.set(x, 0, z);
      o.rotation.set(0, rand(i * 5) * 6.28, 0);
      const k = 0.7 + rand(i * 7) * 0.9;
      o.scale.set(k, k * (0.8 + rand(i * 11) * 0.6), k);
      o.updateMatrix();
      m.setMatrixAt(n, o.matrix);
      const v = rand(i * 13);
      m.setColorAt(n, c.set(v > 0.75 ? "#9aa060" : v > 0.35 ? "#6f8c3e" : "#86a24c"));
      n++;
    }
    m.count = n;
    m.receiveShadow = true;
    return m;
  }, []);
  return <primitive object={mesh} />;
};

const dirtCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
    g.addColorStop(0, "rgba(150,118,84,1)");
    g.addColorStop(0.75, "rgba(150,118,84,0.85)");
    g.addColorStop(1, "rgba(150,118,84,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 160; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(110,84,60,0.5)" : "rgba(190,160,120,0.45)";
      const r = Math.hypot(rand(i + 1) - 0.5, rand(i + 2) - 0.5);
      if (r < 0.42) ctx.fillRect(rand(i + 1) * 256, rand(i + 2) * 256, 3 + rand(i + 3) * 4, 2);
    }
  });

// Hewn logs with pale chinking between them; `rows` logs high.
const logCanvas = (rows: number) =>
  canvasTexture(512, 64 * rows, (ctx) => {
    for (let r = 0; r < rows; r++) {
      const y = r * 64;
      ctx.fillStyle = "#e6d9bc";
      ctx.fillRect(0, y, 512, 64);
      const v = rand(r * 3);
      ctx.fillStyle = v > 0.6 ? "#8a5e3c" : v > 0.3 ? "#7e5536" : "#946844";
      ctx.fillRect(0, y + 9, 512, 46);
      ctx.fillStyle = "rgba(60,36,20,0.35)";
      ctx.fillRect(0, y + 44, 512, 11);
      ctx.fillStyle = "rgba(255,230,190,0.18)";
      ctx.fillRect(0, y + 11, 512, 6);
      // adze marks
      ctx.fillStyle = "rgba(60,36,20,0.3)";
      for (let k = 0; k < 6; k++) ctx.fillRect(rand(r * 11 + k) * 500, y + 18 + rand(r * 5 + k) * 22, 18, 2);
    }
  });

const shingleCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#5c4a3c";
    ctx.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++) {
      const off = r % 2 ? 14 : 0;
      for (let c = -1; c < 10; c++) {
        const v = rand(r * 17 + c);
        ctx.fillStyle = v > 0.66 ? "#7a6a5a" : v > 0.33 ? "#6c5c4c" : "#857464";
        ctx.fillRect(c * 28 + off + 1, r * 16 + 1, 26, 13);
      }
    }
  });

const stoneCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#6a645c";
    ctx.fillRect(0, 0, 256, 256);
    let y = 0;
    let r = 0;
    while (y < 256) {
      const h = 22 + rand(r) * 18;
      let x = -rand(r + 5) * 30;
      let c = 0;
      while (x < 256) {
        const w = 30 + rand(r * 9 + c) * 34;
        const v = rand(r * 31 + c);
        ctx.fillStyle = v > 0.66 ? "#a8a092" : v > 0.33 ? "#968e80" : "#b4ab9a";
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 2, h / 2 - 2, 0, 0, Math.PI * 2);
        ctx.fill();
        x += w;
        c++;
      }
      y += h;
      r++;
    }
  });

// A line of bare March trees and dark cedars, painted flat (it sits 20 m away).
const treelineCanvas = (seed: number) =>
  canvasTexture(2048, 256, (ctx) => {
    ctx.clearRect(0, 0, 2048, 256);
    const branch = (x: number, y: number, len: number, a: number, w: number, depth: number, s: number) => {
      const x2 = x + Math.sin(a) * len;
      const y2 = y - Math.cos(a) * len;
      ctx.lineWidth = w;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (depth > 0) {
        branch(x2, y2, len * 0.72, a - 0.45 - rand(s) * 0.2, w * 0.65, depth - 1, s * 3 + 1);
        branch(x2, y2, len * 0.72, a + 0.4 + rand(s + 1) * 0.2, w * 0.65, depth - 1, s * 3 + 2);
      }
    };
    for (let i = 0; i < 46; i++) {
      const x = (i + rand(seed + i) * 0.8) * 45;
      const h = 70 + rand(seed + i * 3) * 70;
      if (rand(seed + i * 5) > 0.78) {
        // eastern red cedar: a dark green spire
        ctx.fillStyle = rand(i) > 0.5 ? "#2f4a34" : "#3a5638";
        ctx.beginPath();
        ctx.moveTo(x, 256 - h * 1.05);
        ctx.quadraticCurveTo(x + 20, 256 - h * 0.4, x + 18, 256);
        ctx.lineTo(x - 18, 256);
        ctx.quadraticCurveTo(x - 20, 256 - h * 0.4, x, 256 - h * 1.05);
        ctx.fill();
      } else {
        ctx.strokeStyle = rand(i + 50) > 0.5 ? "#6e5c52" : "#7b6a5e";
        ctx.lineCap = "round";
        branch(x, 256, h * 0.42, (rand(i + 9) - 0.5) * 0.2, 7, 4, i + seed);
        // the faintest early-spring green haze in the crown
        ctx.fillStyle = "rgba(160,180,110,0.18)";
        ctx.beginPath();
        ctx.ellipse(x, 256 - h * 0.75, h * 0.32, h * 0.28, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

// ---------- pieces ----------

// Rounded hills or flat-topped knobs: a smooth crest `width` wide on the ground at z, `shift` for parallax.
export const Hills: React.FC<{ z: number; shift?: number; width: number; low: number; high: number; color: string; seed: number; flat?: boolean; y?: number }> = ({
  z,
  shift = 0,
  width,
  low,
  high,
  color,
  seed,
  flat,
  y = 0,
}) => {
  const geo = useMemo(() => {
    const n = 140;
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -3);
    for (let i = 0; i <= n; i++) {
      const x = -width / 2 + (width * i) / n;
      const k = x / width;
      let v = 0.5 + 0.32 * Math.sin(k * 17 + seed) + 0.14 * Math.sin(k * 41 + seed * 1.7) + 0.05 * Math.sin(k * 97 + seed * 0.3);
      if (flat) v = Math.min(v, 0.62 + 0.03 * Math.sin(k * 60 + seed)); // knobs capped by hard rock: flat tops
      shape.lineTo(x, low + (high - low) * v);
    }
    shape.lineTo(width / 2, -3);
    return new THREE.ShapeGeometry(shape);
  }, [width, low, high, seed, flat]);
  return (
    <mesh geometry={geo} position={[shift, y, z]}>
      <meshBasicMaterial color={color} fog={false} toneMapped={false} />
    </mesh>
  );
};

// A worm fence from a to b (x, z): split rails stacked six high in a zigzag, each panel `panel` m long, the rail
// ends of neighbouring panels interleaving; a crossed pair of stakes at every other corner.
export const WormFence: React.FC<{ a: [number, number]; b: [number, number]; panel?: number; rails?: number; seed?: number }> = ({
  a,
  b,
  panel = 2.6,
  rails = 6,
  seed = 0,
}) => {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  const dir = Math.atan2(dx, dz); // yaw of the run
  const n = Math.max(1, Math.round(len / (panel * 0.94)));
  const zig = 0.36; // radians each panel turns off the run
  const step = len / n;
  const off = Math.tan(zig) * step * 0.5;
  return (
    <group position={[a[0], 0, a[1]]} rotation={[0, dir, 0]}>
      {Array.from({ length: n }, (_, i) => {
        const s = i % 2 ? 1 : -1;
        const z0 = i * step;
        const railLen = Math.hypot(step, off * 2) + 0.24;
        return (
          <group key={i} position={[0, 0, z0 + step / 2]} rotation={[0, s * zig, 0]}>
            {Array.from({ length: rails }, (_, r) => {
              const v = rand(seed + i * 13 + r);
              return (
                <InkBox
                  key={r}
                  size={[0.085, 0.075, railLen]}
                  position={[0, 0.1 + r * 0.155 + (i % 2) * 0.075, 0]}
                  rotation={[0, 0, (v - 0.5) * 0.25]}
                  color={FENCE_GREY[Math.floor(v * 3)]}
                  ink={0.008}
                />
              );
            })}
            {i % 2 === 0 &&
              [-1, 1].map((k) => (
                <InkCylinder key={k} radius={0.022} height={1.35} position={[s * off, 0.66, -step / 2]} rotation={[0, 0, k * 0.28]} color="#857e70" ink={0.006} />
              ))}
          </group>
        );
      })}
    </group>
  );
};

// The log house: hewn logs with chinking, log ends sticking out at the corners, a plank door, one small
// six-pane window, a shingle gable roof and a fieldstone chimney on the right end with a thin line of smoke.
const House: React.FC<{ frame: number }> = ({ frame }) => {
  const logs = useMemo(() => {
    const t = logCanvas(8);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2.4, 1);
    return t;
  }, []);
  const shingles = useMemo(() => {
    const t = shingleCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 2);
    return t;
  }, []);
  const stone = useMemo(() => {
    const t = stoneCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 3);
    return t;
  }, []);
  const gableTex = useMemo(() => {
    const t = logCanvas(4);
    return t;
  }, []);
  const W = HOUSE.right - HOUSE.left;
  const cx = (HOUSE.right + HOUSE.left) / 2;
  const D = 3.6;
  const cz = HOUSE.front - D / 2;
  const H = 2.05;
  const pitch = 0.62;
  const ridgeY = H + Math.tan(pitch) * (D / 2);
  const slopeLen = Math.hypot(D / 2, ridgeY - H) + 0.42;
  const gable = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-D / 2, 0);
    s.lineTo(D / 2, 0);
    s.lineTo(0, ridgeY - H);
    s.closePath();
    return new THREE.ShapeGeometry(s);
  }, [ridgeY]);
  return (
    <group>
      <InkBox size={[W, H, D]} position={[cx, H / 2, cz]} color="#ffffff" map={logs} ink={0.02} />
      {/* Log ends at the front corners, one per course */}
      {Array.from({ length: 8 }, (_, i) =>
        [HOUSE.left - 0.08, HOUSE.right + 0.08].map((x) => (
          <InkCylinder key={`${i}${x}`} radius={0.11} height={0.3} position={[x, 0.13 + i * 0.255, HOUSE.front - 0.12]} rotation={[0, 0, Math.PI / 2]} color={i % 2 ? "#7e5536" : "#8a5e3c"} ink={0.008} />
        )),
      )}
      {/* Gable ends */}
      {[HOUSE.left - 0.001, HOUSE.right + 0.001].map((x, k) => (
        <mesh key={x} geometry={gable} position={[x, H, cz]} rotation={[0, k ? Math.PI / 2 : -Math.PI / 2, 0]}>
          <meshToonMaterial color="#a07a58" gradientMap={toonRamp} map={gableTex} side={THREE.DoubleSide} />
        </mesh>
      ))}
      {/* Roof: two shingle slopes (with an overhang) and a ridge board */}
      {[-1, 1].map((s) => (
        <InkBox
          key={s}
          size={[W + 0.7, 0.08, slopeLen]}
          position={[cx, (ridgeY + H) / 2 + 0.05 - Math.sin(pitch) * 0.2, cz + s * (D / 4 + Math.cos(pitch) * 0.2)]}
          rotation={[s * pitch, 0, 0]}
          color="#ffffff"
          map={shingles}
          ink={0.015}
        />
      ))}
      <InkBox size={[W + 0.75, 0.1, 0.12]} position={[cx, ridgeY + 0.07, cz]} color="#4a3a2e" ink={0.01} />
      {/* Plank door */}
      <InkBox size={[0.72, 1.55, 0.06]} position={[cx - 0.5, 0.78, HOUSE.front + 0.03]} color="#5e4630" ink={0.012} />
      {[-0.22, 0, 0.22].map((x) => (
        <InkBox key={x} size={[0.02, 1.5, 0.02]} position={[cx - 0.5 + x, 0.78, HOUSE.front + 0.07]} color="#3e2c1e" ink={0} />
      ))}
      <InkBox size={[0.62, 0.05, 0.03]} position={[cx - 0.5, 0.5, HOUSE.front + 0.08]} color="#3e2c1e" ink={0} />
      <InkBox size={[0.62, 0.05, 0.03]} position={[cx - 0.5, 1.15, HOUSE.front + 0.08]} color="#3e2c1e" ink={0} />
      {/* Six-pane window */}
      <InkBox size={[0.62, 0.52, 0.05]} position={[cx + 0.85, 1.2, HOUSE.front + 0.03]} color="#efe6d0" ink={0.012} />
      {[0, 1].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <mesh key={`${r}${c}`} position={[cx + 0.85 - 0.19 + c * 0.19, 1.2 - 0.11 + r * 0.22, HOUSE.front + 0.06]}>
            <planeGeometry args={[0.16, 0.19]} />
            <meshBasicMaterial color={r ? "#9fc0d8" : "#5a7488"} />
          </mesh>
        )),
      )}
      {/* Stone chimney on the right end */}
      <InkBox size={[0.75, ridgeY + 0.7, 0.8]} position={[HOUSE.right + 0.38, (ridgeY + 0.7) / 2, cz]} color="#ffffff" map={stone} ink={0.02} />
      <InkBox size={[0.55, 0.12, 0.6]} position={[HOUSE.right + 0.38, ridgeY + 0.76, cz]} color="#6a645c" ink={0.01} />
      <SmokePlume position={[HOUSE.right + 0.38, ridgeY + 0.85, cz]} world={[HOUSE.right + 0.38, cz]} frame={frame} size={0.1} rise={1.6} wind={-0.9} period={80} puffs={6} />
    </group>
  );
};

// The black iron soap kettle on three short legs over a small wood fire, steam rising off the brew.
export const SoapKettle: React.FC<{ frame: number; position?: Vec3; steam?: boolean }> = ({ frame, position = KETTLE, steam = true }) => {
  const bowl = useMemo(() => new THREE.SphereGeometry(0.32, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), []);
  const rimY = KETTLE_RIM;
  return (
    <group position={position}>
      <group scale={0.62}>
        <Campfire position={[0, 0, 0]} frame={frame} smoke={false} />
      </group>
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2 + 0.5;
        return <InkCylinder key={i} radius={0.025} height={0.34} position={[Math.cos(a) * 0.22, 0.17, Math.sin(a) * 0.22]} rotation={[Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]} color="#1e1c1e" ink={0.006} />;
      })}
      <group position={[0, rimY, 0]}>
        <mesh geometry={bowl} castShadow>
          <meshToonMaterial color="#121014" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={bowl} scale={1.04}>
          <meshBasicMaterial color="#161212" side={THREE.BackSide} />
        </mesh>
        {/* Rolled lip and the two lugs */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.32, 0.028, 10, 40]} />
          <meshToonMaterial color="#1c1a20" gradientMap={toonRamp} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.35, -0.02, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[0.04, 0.012, 8, 16]} />
            <meshToonMaterial color="#2a282c" gradientMap={toonRamp} />
          </mesh>
        ))}
        {/* The soap: thick tan brew with a few bubbles */}
        <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.3, 32]} />
          <meshToonMaterial color="#d6bf86" gradientMap={toonRamp} />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const t = ((frame + i * 11) % 40) / 40;
          return (
            <mesh key={i} position={[Math.cos(i * 2.1) * 0.15, -0.045, Math.sin(i * 2.1) * 0.15]} scale={0.02 + 0.02 * Math.sin(t * Math.PI)}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshToonMaterial color="#ecdcae" gradientMap={toonRamp} />
            </mesh>
          );
        })}
      </group>
      {steam && <group userData={{ ghost: true }}>
        <SmokePlume position={[0, rimY + 0.05, 0]} world={[position[0], position[2]]} frame={frame} size={0.07} rise={0.9} wind={-0.25} period={56} puffs={5} />
      </group>}
    </group>
  );
};

// Ash hopper: a V trough of boards on a frame, dripping brown lye into a bucket; a lye barrel beside it.
const AshHopper: React.FC<{ frame: number }> = ({ frame }) => {
  const drip = (frame % 24) / 24;
  return (
    <group position={HOPPER}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.7, 0.05, 1.1]} position={[s * 0.18, 1.05, 0]} rotation={[0, 0, s * 0.62]} color="#8e7a5e" ink={0.01} />
      ))}
      <InkBox size={[0.62, 0.06, 1.08]} position={[0, 1.36, 0]} color="#6e6a64" ink={0.006} />
      {[-0.42, 0.42].flatMap((z) =>
        [-0.32, 0.32].map((x) => <InkBox key={`${x}${z}`} size={[0.06, 1.05, 0.06]} position={[x, 0.52, z]} rotation={[0, 0, -Math.sign(x) * 0.12]} color="#6e5a42" ink={0.006} />),
      )}
      <InkBox size={[0.08, 0.06, 0.4]} position={[0, 0.74, 0.62]} rotation={[0.3, 0, 0]} color="#7a6448" ink={0.006} />
      <InkCylinder radius={0.16} height={0.28} position={[0, 0.14, 0.8]} color="#8a6a46" ink={0.008} />
      <mesh position={[0, 0.66 - drip * 0.36, 0.8]} scale={[0.012, 0.02, 0.012]}>
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial color="#6a4420" />
      </mesh>
      {/* Lye barrel */}
      <InkCylinder radius={0.24} height={0.62} position={[0.75, 0.31, 0.55]} color="#7e6040" ink={0.012} />
      {[0.12, 0.5].map((y) => (
        <mesh key={y} position={[0.75, y, 0.55]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.245, 0.012, 6, 30]} />
          <meshBasicMaterial color="#2a2420" />
        </mesh>
      ))}
    </group>
  );
};

const Woodpile: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    {Array.from({ length: 12 }, (_, i) => {
      const row = i < 5 ? 0 : i < 9 ? 1 : 2;
      const col = i < 5 ? i : i < 9 ? i - 5 : i - 9;
      return (
        <InkCylinder
          key={i}
          radius={0.07}
          height={0.7}
          position={[col * 0.15 - 0.3 + row * 0.075, 0.07 + row * 0.13, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          color={rand(i) > 0.5 ? "#8a6a4a" : "#9a7a56"}
          ink={0.006}
        />
      );
    })}
    <InkBox size={[0.05, 0.6, 0.05]} position={[0.32, 0.3, 0.2]} rotation={[0.3, 0, -0.1]} color="#6e5a42" ink={0.005} />
  </group>
);

// `steam` false hides the kettle's steam (for a shot looking straight into the brew).
export const FarmyardSet: React.FC<{ camera: CameraShot; frame: number; steam?: boolean; children?: React.ReactNode }> = ({ camera, frame, steam = true, children }) => {
  const camX = camera.position[0];
  const grass = useMemo(() => {
    const t = grassCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(18, 14);
    t.anisotropy = 8;
    return t;
  }, []);
  const patches = useMemo(() => {
    const t = patchCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2.2);
    return t;
  }, []);
  const dirt = useMemo(() => dirtCanvas(), []);
  const trees = useMemo(() => treelineCanvas(3), []);
  const trees2 = useMemo(() => treelineCanvas(17), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#a9cdf0"]} />
      <fog attach="fog" args={["#cfe0ee", 25, 90]} />
      <ambientLight intensity={1.2} color="#ffffff" />
      <hemisphereLight args={["#cfe4ff", "#6a7a3a", 0.6]} />
      <directionalLight
        position={[-6, 9, 5]}
        intensity={2.5}
        color="#fff4e0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-9}
        shadow-camera-right={9}
        shadow-camera-top={9}
        shadow-camera-bottom={-9}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />

      {/* Sky dome and sun ride with the camera; the hills slide at their own shares (parallax) */}
      <group position={camera.position}>
        <SkyDome sun={SUN_DIR} />
        <mesh position={new THREE.Vector3(...SUN_DIR).normalize().multiplyScalar(280).toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
          <circleGeometry args={[7, 48]} />
          <meshBasicMaterial color="#fffdf0" fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
      <Hills z={-80} shift={camX * 0.8} width={340} low={6} high={15} color="#9fb4c8" seed={2} flat />
      <Haze z={-70} color="#e6eef4" />
      <Hills z={-55} shift={camX * 0.6} width={260} low={4} high={10} color="#7f98a6" seed={5} flat />
      <Hills z={-38} shift={camX * 0.3} width={200} low={1.5} high={5} color="#7f9a6a" seed={9} />
      <Haze z={-34} color="#e2ece0" />
      <Hills z={-26} shift={-camX * 0.2} width={140} low={0.4} high={2.2} color="#93a860" seed={13} />
      {/* Tree lines along the pasture edge */}
      <mesh position={[camX * 0.1, 3.1, -22]}>
        <planeGeometry args={[60, 7.5]} />
        <meshBasicMaterial map={trees} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh position={[-camX * 0.05 + 8, 2.3, -14]}>
        <planeGeometry args={[40, 5.5]} />
        <meshBasicMaterial map={trees2} transparent fog={false} toneMapped={false} depthWrite={false} />
      </mesh>

      {/* Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, -10]}>
        <planeGeometry args={[80, 60]} />
        <meshBasicMaterial map={patches} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <Tufts />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.2, 0.003, 0.1]}>
        <planeGeometry args={[4.6, 3.6]} />
        <meshBasicMaterial map={dirt} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0.1]} position={[-1.2, 0.002, -2.2]}>
        <planeGeometry args={[1.0, 2.0]} />
        <meshBasicMaterial map={dirt} transparent depthWrite={false} toneMapped={false} />
      </mesh>

      <House frame={frame} />
      <WormFence a={[-3.6, 4.5]} b={[-3.6, -4.2]} seed={1} />
      <WormFence a={[-3.6, -4.6]} b={[6.5, -4.6]} seed={5} />
      <WormFence a={[2.7, -4.2]} b={[2.7, 4.5]} seed={9} />
      <Woodpile position={[-3.05, 0, -2.4]} />
      <AshHopper frame={frame} />
      <SoapKettle frame={frame} steam={steam} />
      {/* Fat bucket and paddle rest by the kettle */}
      <InkCylinder radius={0.13} height={0.24} position={[KETTLE[0] + 0.62, 0.12, KETTLE[2] - 0.35]} color="#9a7a56" ink={0.008} />
      {children}
    </>
  );
};
