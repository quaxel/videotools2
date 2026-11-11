import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { Ridge, Rock } from "./LakeSet";
import { SkyDome } from "./sky";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { Blob, Cord, tiled, useOwned } from "./BalloonSets";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// Andrée's 1897 North Pole balloon and its places, built from photo references (guide/references/arctic-balloon.md):
// - `OrnenBalloon`: the Eagle, a dark varnished silk envelope under a cord net, the load ring with gear sacks, the
//   squat wicker basket and its drag ropes. Origin = the basket floor (puppets stand in it at y = 0).
// - `ArcticSkySet`: high over the pack ice; `mode` sun (low golden midnight sun) or fog (grey, icing). The ice far
//   below scrolls past the balloon kept near the origin.
// - `HangarSet`: the octagonal plank balloon tower on Danes Island, snowy rocks, dark mountains and the grey sea.
// - `PackIceSet`: the floe (floor y = 0) with pressure ridges and open leads; `mode` day (fog-white), dusk (violet)
//   or storm (navy, blowing snow).
// - `KvitoyaSet`: White Island in 1930: a gravel shore under the ice cap, drift ice and the sealing ship.
// - Props: `DownedBalloon` (the envelope slumped on the ice, after Strindberg's photo), `Sled`, `SilkBoat`, `Gulls`.

type Vec3 = [number, number, number];
const INK = "#161212";

export const ORNEN = { r: 3.0, ring: 2.3, basket: 0.62, rim: 0.66 };

// The low midnight sun behind the balloon: a warm rim on the edges facing it.
export const arcticSunLight = (): PuppetLight => ({
  tint: "#e8eef8",
  shadow: 0.16,
  distant: [{ direction: [0.6, 0.25, -0.8], color: "#ffc890", strength: 1.2 }],
});
export const fogLight = (): PuppetLight => ({ tint: "#e4e8ee", shadow: 0.1 });

// ---------- textures ----------

// Varnished silk: dark brown with sewn panel seams (u = longitude) and a soft sheen band.
const silkCanvas = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#4a3a2e";
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(30,20,14,0.25)" : "rgba(140,110,80,0.18)";
      ctx.fillRect(rand(i + 3) * 1024, rand(i + 5) * 512, 20 + rand(i + 7) * 70, 10 + rand(i + 9) * 40);
    }
    ctx.strokeStyle = "rgba(20,14,10,0.55)";
    ctx.lineWidth = 3;
    for (let g = 0; g < 24; g++) {
      ctx.beginPath();
      ctx.moveTo((g / 24) * 1024, 0);
      ctx.lineTo((g / 24) * 1024, 512);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(20,14,10,0.3)";
    ctx.lineWidth = 2;
    for (let b = 1; b < 10; b++) {
      ctx.beginPath();
      ctx.moveTo(0, b * 51);
      ctx.lineTo(1024, b * 51);
      ctx.stroke();
    }
  });

// Frost on the silk: white crust patches growing from the top, transparent between.
const frostCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.clearRect(0, 0, 512, 256);
    // a crust that thins toward the equator, made of many small crystals and rime streaks
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "rgba(236,246,255,0.95)");
    g.addColorStop(0.55, "rgba(236,246,255,0.55)");
    g.addColorStop(1, "rgba(236,246,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    for (let i = 0; i < 1400; i++) {
      const y = Math.pow(rand(i + 1), 1.4) * 256;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + rand(i + 2) * 0.5})`;
      ctx.beginPath();
      ctx.ellipse(rand(i + 3) * 512, y, 2 + rand(i + 4) * 6, 1 + rand(i + 5) * 3, rand(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(160,200,230,0.5)";
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 120; i++) {
      const x = rand(i + 700) * 512;
      const y = rand(i + 800) * 200;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i) - 0.5) * 10, y + 8 + rand(i + 1) * 20);
      ctx.stroke();
    }
  });

const wickerCanvas = () =>
  canvasTexture(256, 128, (ctx) => {
    ctx.fillStyle = "#b08850";
    ctx.fillRect(0, 0, 256, 128);
    for (let y = 0; y < 128; y += 8) {
      for (let x = 0; x < 256; x += 16) {
        const off = (y / 8) % 2 ? 8 : 0;
        ctx.fillStyle = "#c89c60";
        ctx.fillRect(x + off, y + 1, 12, 5);
      }
      ctx.fillStyle = "rgba(60,40,20,0.35)";
      ctx.fillRect(0, y + 7, 256, 1);
    }
    ctx.fillStyle = "rgba(60,40,20,0.4)";
    for (let x = 0; x < 256; x += 16) ctx.fillRect(x, 0, 2, 128);
  });

const planksCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#a07a50";
    ctx.fillRect(0, 0, 512, 512);
    for (let x = 0; x < 512; x += 32) {
      ctx.fillStyle = rand(x) > 0.5 ? "#94704a" : "#ac845a";
      ctx.fillRect(x + 2, 0, 28, 512);
      ctx.fillStyle = "#4a3424";
      ctx.fillRect(x, 0, 2, 512);
      for (let k = 0; k < 4; k++) {
        ctx.fillStyle = "rgba(60,40,24,0.35)";
        ctx.fillRect(x + 6 + rand(x + k) * 18, rand(x * 3 + k) * 512, 2, 30 + rand(k + x) * 60);
      }
    }
    // horizontal battens and weather stains
    ctx.fillStyle = "#5a4030";
    for (let y = 60; y < 512; y += 128) ctx.fillRect(0, y, 512, 7);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(rand(i + 77) * 512, rand(i + 99) * 512, 30, 4);
    }
  });

// Pack ice seen from close: white with blue drift shadows, wind ridges (sastrugi) and sparkle.
const iceCanvas = (tint: string) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 110; i++) {
      ctx.fillStyle = rand(i) > 0.45 ? "rgba(140,180,215,0.22)" : "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 1) * 1024, rand(i + 2) * 1024, 40 + rand(i + 3) * 140, 12 + rand(i + 4) * 34, rand(i + 5) * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(110,150,200,0.32)";
    ctx.lineWidth = 3;
    for (let r = 0; r < 70; r++) {
      const y = rand(r + 300) * 1024;
      const x = rand(r + 400) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + 50, y - 12, x + 120 + rand(r) * 90, y + 5);
      ctx.stroke();
    }
    for (let i = 0; i < 3200; i++) {
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      ctx.fillRect(rand(i + 5000) * 1024, rand(i + 9000) * 1024, 2, 2);
    }
  });

// The pack seen from high above: floes in white and pale blue, split by black leads and grey ridge lines.
const packAerialCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#1a2430";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 160; i++) {
      const x = rand(i + 11) * 1024;
      const y = rand(i + 13) * 1024;
      const s = 30 + rand(i + 17) * 110;
      ctx.fillStyle = rand(i + 19) > 0.3 ? "#eef4f8" : "#cfe0ec";
      ctx.beginPath();
      const n = 6 + Math.floor(rand(i) * 4);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = s * (0.7 + rand(i * 7 + k) * 0.45);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.fill();
    }
    ctx.strokeStyle = "rgba(120,150,180,0.6)";
    ctx.lineWidth = 3;
    for (let r = 0; r < 60; r++) {
      const x = rand(r + 600) * 1024;
      const y = rand(r + 700) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 40 + rand(r) * 60, y + (rand(r + 1) - 0.5) * 40);
      ctx.lineTo(x + 70 + rand(r + 2) * 80, y + (rand(r + 3) - 0.5) * 60);
      ctx.stroke();
    }
  });

const gravelCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#4e4a44";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 5000; i++) {
      const v = 50 + Math.floor(rand(i) * 70);
      ctx.fillStyle = `rgb(${v},${v - 4},${v - 8})`;
      ctx.beginPath();
      ctx.arc(rand(i + 3) * 1024, rand(i + 7) * 1024, 2 + rand(i + 9) * 6, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      const cx = rand(i + 300) * 1024;
      const cy = rand(i + 400) * 1024;
      ctx.fillStyle = "rgba(236,242,246,0.8)";
      for (let k = 0; k < 9; k++) {
        ctx.beginPath();
        ctx.ellipse(cx + (rand(i * 9 + k) - 0.5) * 120, cy + (rand(i * 7 + k) - 0.5) * 50, 6 + rand(i + k) * 18, 3 + rand(i + k + 1) * 8, rand(i + 2) * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

// ---------- the balloon ----------

// Origin = basket floor. `ice` 0..1 frosts the envelope and hangs icicles; `ropes` 0..1 how much of the drag ropes
// still hangs (1 = all, the ropes fall away as it drops); `ropeFall` metres the lost ropes have fallen;
// `slack` 0..1 dents the envelope (losing gas).
export const OrnenBalloon: React.FC<{ frame: number; ice?: number; ropes?: number; ropeFall?: number; slack?: number; basket?: boolean }> = ({
  frame,
  ice = 0,
  ropes = 1,
  ropeFall = 0,
  slack = 0,
  basket = true,
}) => {
  const silk = useOwned(() => silkCanvas());
  const frost = useOwned(() => frostCanvas());
  const wicker = useOwned(() => tiled(wickerCanvas(), 3, 1));
  const { r, ring } = ORNEN;
  const cy = ring + 1.0 + r * 0.95;
  const breathe = 1 + Math.sin(frame * 0.08) * 0.006;
  // the net meridians from the crown down to the ring
  const meridians = 16;
  const netPts = useMemo(
    () =>
      Array.from({ length: meridians }, (_, i) => {
        const a = (i / meridians) * Math.PI * 2;
        const lat = -0.45;
        const rr = r * Math.sqrt(1 - lat * lat);
        return { a, low: [Math.cos(a) * rr, cy + lat * r, Math.sin(a) * rr] as Vec3, ring: [Math.cos(a) * 0.62, ring, Math.sin(a) * 0.62] as Vec3 };
      }),
    [cy, r, ring],
  );
  const sy = 1 - slack * 0.22;
  return (
    <group>
      {/* envelope, a little taller than wide */}
      <group position={[0, cy - slack * 0.5, 0]} scale={[breathe * (1 + slack * 0.08), 1.06 * sy / breathe, breathe * (1 + slack * 0.08)]}>
        <mesh castShadow>
          <sphereGeometry args={[r, 64, 40]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={silk} />
        </mesh>
        <mesh scale={1.012}>
          <sphereGeometry args={[r, 48, 32]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        {ice > 0 && (
          <mesh scale={1.004}>
            <sphereGeometry args={[r, 48, 32, 0, Math.PI * 2, 0, Math.PI * (0.25 + ice * 0.45)]} />
            <meshToonMaterial color="#f4faff" gradientMap={toonRamp} map={frost} transparent opacity={Math.min(1, ice * 1.4)} depthWrite={false} />
          </mesh>
        )}
        {/* varnish sheen */}
        <mesh position={[-r * 0.42, r * 0.38, r * 0.72]} scale={[0.5, 0.9, 0.2]}>
          <sphereGeometry args={[1, 16, 12]} />
          <meshBasicMaterial color="#b89470" transparent opacity={0.22 * (1 - ice)} depthWrite={false} />
        </mesh>
        {/* net rings on the upper half */}
        {[0.2, 0.5, 0.78].map((lat) => (
          <mesh key={lat} position={[0, lat * r, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[r * Math.sqrt(1 - lat * lat) * 1.012, 0.022, 5, 72]} />
            <meshBasicMaterial color="#c8b896" />
          </mesh>
        ))}
        {Array.from({ length: meridians }, (_, i) => (
          <mesh key={i} rotation={[0, (i / meridians) * Math.PI * 2, 0]}>
            <torusGeometry args={[r * 1.012, 0.018, 4, 64, Math.PI * 0.72]} />
            <meshBasicMaterial color="#c8b896" />
          </mesh>
        ))}
        {/* the appendix flap at the bottom (pale fabric) */}
        <mesh position={[0, -r * 1.0, 0]}>
          <cylinderGeometry args={[0.3, 0.42, 0.5, 16]} />
          <meshToonMaterial color="#d8ccb0" gradientMap={toonRamp} />
        </mesh>
      </group>
      {netPts.map((p, i) => (
        <Cord key={i} a={p.low} b={p.ring} width={0.016} color="#8a7a5a" />
      ))}
      {/* load ring with gear sacks hanging round it */}
      <group position={[0, ring, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.05, 8, 40]} />
          <meshToonMaterial color="#7a5a3a" gradientMap={toonRamp} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.62, 0.07, 8, 40]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2 + 0.2;
          return (
            <Blob key={i} position={[Math.cos(a) * 0.62, -0.18, Math.sin(a) * 0.62]} scale={[0.13, 0.17, 0.13]} color={i % 2 ? "#a89a78" : "#8a7a5a"} ink={0.12} />
          );
        })}
        {ice > 0.2 &&
          Array.from({ length: 14 }, (_, i) => {
            const a = (i / 14) * Math.PI * 2;
            const len = (0.12 + rand(i) * 0.25) * Math.min(1, (ice - 0.2) * 1.6);
            return (
              <mesh key={i} position={[Math.cos(a) * 0.66, -0.05 - len / 2, Math.sin(a) * 0.66]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[0.025, len, 5]} />
                <meshToonMaterial color="#dff0ff" gradientMap={toonRamp} />
              </mesh>
            );
          })}
      </group>
      {/* suspension lines ring -> basket rim */}
      {[0, 1, 2, 3, 4, 5].map((k) => {
        const a = (k / 6) * Math.PI * 2;
        return <Cord key={k} a={[Math.cos(a) * 0.6, ring, Math.sin(a) * 0.6]} b={[Math.cos(a) * ORNEN.basket, ORNEN.rim, Math.sin(a) * ORNEN.basket]} width={0.012} />;
      })}
      {basket && (
        <group>
          <mesh position={[0, ORNEN.rim / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[ORNEN.basket, ORNEN.basket * 0.92, ORNEN.rim, 32, 1, true]} />
            <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={wicker} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, ORNEN.rim / 2, 0]}>
            <cylinderGeometry args={[ORNEN.basket + 0.02, ORNEN.basket * 0.92 + 0.02, ORNEN.rim + 0.02, 32, 1, true]} />
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
          <mesh position={[0, ORNEN.rim, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ORNEN.basket, 0.035, 6, 40]} />
            <meshToonMaterial color="#8a6a3a" gradientMap={toonRamp} />
          </mesh>
          <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[ORNEN.basket * 0.92, 32]} />
            <meshToonMaterial color="#8a6a40" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}
      {/* drag ropes: three thick ropes from under the basket, swaying; the lost part drops away */}
      {[0, 1, 2].map((k) => {
        const x0 = (k - 1) * 0.3;
        const len = 9 * ropes;
        const segs = 8;
        const pts: Vec3[] = Array.from({ length: segs + 1 }, (_, s) => {
          const t = s / segs;
          return [x0 + Math.sin(frame * 0.06 + k + t * 3) * 0.35 * t - t * 1.6, -t * len, Math.cos(frame * 0.05 + k * 2) * 0.25 * t];
        });
        return (
          <group key={k}>
            {ropes > 0.01 && pts.slice(1).map((p, s) => <Cord key={s} a={pts[s]} b={p} width={0.035} color="#5a4a32" />)}
            {ropeFall > 0 && (
              <group position={[0, -ropeFall, 0]} rotation={[0, 0, (k - 1) * 0.2 + ropeFall * 0.03]}>
                {Array.from({ length: 6 }, (_, s) => (
                  <Cord
                    key={s}
                    a={[x0 + Math.sin(s + k + ropeFall) * 0.4, -s * 1.3, 0]}
                    b={[x0 + Math.sin(s + 1 + k + ropeFall) * 0.4, -(s + 1) * 1.3, 0]}
                    width={0.035}
                    color="#5a4a32"
                  />
                ))}
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Strindberg's photo: the envelope slumped on the floe like a dark dome, the net lines running to the basket lying
// on its side. Origin on the ice under the envelope.
export const DownedBalloon: React.FC<{ frame: number; snow?: number }> = ({ frame, snow = 0 }) => {
  const silk = useOwned(() => silkCanvas());
  const frost = useOwned(() => frostCanvas());
  const flutter = Math.sin(frame * 0.15) * 0.012;
  return (
    <group>
      <group position={[0, 0, 0]} scale={[1, 0.86 + flutter, 1]}>
        <mesh castShadow receiveShadow>
          <sphereGeometry args={[2.4, 48, 32, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={silk} side={THREE.DoubleSide} />
        </mesh>
        <mesh scale={1.015}>
          <sphereGeometry args={[2.4, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        <mesh scale={1.006}>
          <sphereGeometry args={[2.4, 40, 24, 0, Math.PI * 2, 0, Math.PI * (0.2 + snow * 0.3)]} />
          <meshToonMaterial color="#f4faff" gradientMap={toonRamp} map={frost} transparent opacity={0.5 + snow * 0.5} depthWrite={false} />
        </mesh>
        {[0.35, 0.65].map((lat) => (
          <mesh key={lat} position={[0, lat * 2.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[2.4 * Math.sqrt(1 - lat * lat) * 1.015, 0.02, 5, 60]} />
            <meshBasicMaterial color="#c8b896" />
          </mesh>
        ))}
      </group>
      {/* net lines to the basket on its side, out to the left */}
      {Array.from({ length: 7 }, (_, i) => (
        <Cord key={i} a={[-1.6, 0.4 + i * 0.2, -0.6 + i * 0.2]} b={[-4.2, 0.45, 0]} width={0.014} color="#5a4a3a" />
      ))}
      <group position={[-4.6, 0.38, 0]} rotation={[0, 0, Math.PI / 2 - 0.15]}>
        <InkCylinder radius={0.45} height={0.6} color="#b08850" />
      </group>
      <Blob position={[-3.8, 0.12, 0.6]} scale={[0.25, 0.14, 0.2]} color="#8a7a5a" />
      <Blob position={[-4.1, 0.1, -0.7]} scale={[0.2, 0.12, 0.25]} color="#a89a78" />
    </group>
  );
};

// A Nansen-style sledge: two wooden runners, cross bars and a big square load lashed under canvas. Faces +x.
export const Sled: React.FC<{ tip?: number }> = ({ tip = 0 }) => (
  <group rotation={[tip * 1.2, 0, 0]} position={[0, tip * 0.25, 0]}>
    {[-0.24, 0.24].map((z) => (
      <group key={z}>
        <InkBox size={[1.5, 0.04, 0.04]} position={[0, 0.03, z]} color="#7a5a3a" ink={0.01} />
        <InkBox size={[0.2, 0.04, 0.04]} position={[0.82, 0.1, z]} rotation={[0, 0, 0.6]} color="#7a5a3a" ink={0.01} />
      </group>
    ))}
    {[-0.55, 0, 0.55].map((x) => (
      <InkBox key={x} size={[0.04, 0.16, 0.04]} position={[x, 0.11, 0]} color="#7a5a3a" ink={0.01} />
    ))}
    <InkBox size={[1.3, 0.04, 0.56]} position={[0, 0.2, 0]} color="#8a6a44" ink={0.012} />
    <InkBox size={[1.1, 0.4, 0.5]} position={[0, 0.42, 0]} color="#c8b896" ink={0.016} />
    {[-0.35, 0.05, 0.4].map((x) => (
      <InkBox key={x} size={[0.03, 0.42, 0.52]} position={[x, 0.42, 0]} color="#5a4a32" ink={0} />
    ))}
  </group>
);

// The canvas boat (stretched over a frame) the men carried on a sledge: dark grey hull, bow pointing +x.
export const SilkBoat: React.FC<{ bury?: number }> = ({ bury = 0 }) => (
  <group position={[0, -bury * 0.35, 0]}>
    <group scale={[1.9, 0.42, 0.6]}>
      <mesh castShadow>
        <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshToonMaterial color="#5a5248" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh scale={1.03}>
        <sphereGeometry args={[1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
    <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1.9, 0.6, 1]} position={[0, 0.0, 0]}>
      <torusGeometry args={[1, 0.03, 6, 48]} />
      <meshToonMaterial color="#8a6a44" gradientMap={toonRamp} />
    </mesh>
    {[-0.9, -0.3, 0.3, 0.9].map((x) => (
      <InkBox key={x} size={[0.06, 0.04, 1.0 * Math.sqrt(1 - (x / 1.9) ** 2)]} position={[x, -0.02, 0]} color="#8a6a44" ink={0.008} />
    ))}
  </group>
);

// 3D gulls (ivory and kittiwake look): white body, grey wings with black tips, flapping; they circle `centre`.
export const Gulls: React.FC<{ frame: number; centre: Vec3; radius?: number; count?: number; size?: number }> = ({ frame, centre, radius = 6, count = 5, size = 1 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const a = frame * (0.012 + rand(i) * 0.006) + (i / count) * Math.PI * 2;
      const rr = radius * (0.7 + rand(i + 3) * 0.6);
      const x = centre[0] + Math.cos(a) * rr;
      const z = centre[2] + Math.sin(a) * rr;
      const y = centre[1] + Math.sin(frame * 0.03 + i * 2) * 0.8 + rand(i + 5) * 2;
      const flap = Math.sin(frame * 0.35 + i * 1.7) * 0.6;
      const s = size * (0.8 + rand(i + 7) * 0.4);
      return (
        <group key={i} position={[x, y, z]} rotation={[0, -a, Math.sin(a) * 0.2]} scale={s}>
          <Blob position={[0, 0, 0]} scale={[0.09, 0.08, 0.26]} color="#f4f6f8" ink={0.12} />
          <Blob position={[0, 0.04, 0.2]} scale={[0.06, 0.06, 0.07]} color="#f4f6f8" ink={0.12} />
          <mesh position={[0, 0.05, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.018, 0.07, 5]} />
            <meshBasicMaterial color="#e8c040" />
          </mesh>
          {[-1, 1].map((side) => (
            <group key={side} rotation={[0, 0, side * flap]}>
              <InkBox size={[0.4, 0.015, 0.14]} position={[side * 0.24, 0, 0]} color="#c8d0d8" ink={0.01} />
              <InkBox size={[0.1, 0.016, 0.1]} position={[side * 0.44, 0, -0.01]} color="#202428" ink={0.006} />
            </group>
          ))}
        </group>
      );
    })}
  </group>
);

// Falling or blowing snow round the camera. `wind` m/frame sideways; ghost so it never counts as a collision.
export const Snowfall: React.FC<{ frame: number; around: Vec3; count?: number; wind?: number; fall?: number; size?: number; color?: string }> = ({
  frame,
  around,
  count = 180,
  wind = 0.02,
  fall = 0.03,
  size = 0.022,
  color = "#ffffff",
}) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const y = 6 - ((((frame * (fall + rand(i) * fall) + rand(i + 3) * 6) % 6) + 6) % 6);
      const x = ((((rand(i + 9) * 14 + frame * wind * (0.7 + rand(i + 1) * 0.6)) % 14) + 14) % 14) - 7;
      return (
        <mesh key={i} position={[around[0] + x, around[1] - 3 + y, around[2] - 8 + rand(i + 11) * 8]}>
          <sphereGeometry args={[size * (0.6 + rand(i + 2)), 5, 4]} />
          <meshBasicMaterial color={color} />
        </mesh>
      );
    })}
  </group>
);

// A burst of snow chunks thrown up at `at`, `t` frames after an impact (ghost).
export const SnowBurst: React.FC<{ at: Vec3; t: number; count?: number; power?: number }> = ({ at, t, count = 26, power = 1 }) => {
  if (t < 0 || t > 40) return null;
  return (
    <group userData={{ ghost: true }} position={at}>
      {Array.from({ length: count }, (_, i) => {
        const a = rand(i) * Math.PI * 2;
        const v = (0.04 + rand(i + 1) * 0.06) * power;
        const up = (0.06 + rand(i + 2) * 0.08) * power;
        const x = Math.cos(a) * v * t;
        const z = Math.sin(a) * v * t * 0.6;
        const y = Math.max(0, up * t - 0.006 * t * t);
        const s = (0.04 + rand(i + 3) * 0.07) * (1 - t / 45);
        return <Blob key={i} position={[x, y, z]} scale={[s, s, s]} color="#f4f8fc" ink={0.15} detail={0} />;
      })}
    </group>
  );
};

// ---------- ice ridges (instanced blocks) ----------

// A pressure ridge: tilted ice blocks piled along a line from `a` to `b` (x, z), up to `height`.
export const PressureRidge: React.FC<{ a: [number, number]; b: [number, number]; height?: number; seed?: number; blocks?: number }> = ({ a, b, height = 1.2, seed = 1, blocks = 40 }) => {
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshToonMaterial({ gradientMap: toonRamp }), blocks);
    m.castShadow = true;
    m.receiveShadow = true;
    const ink = new THREE.InstancedMesh(new THREE.BoxGeometry(1.08, 1.08, 1.08), new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide }), blocks);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    for (let i = 0; i < blocks; i++) {
      const t = rand(seed * 31 + i);
      const x = a[0] + (b[0] - a[0]) * t + (rand(seed + i * 3) - 0.5) * 0.8;
      const z = a[1] + (b[1] - a[1]) * t + (rand(seed + i * 5) - 0.5) * 0.8;
      const hump = Math.sin(t * Math.PI) * 0.6 + 0.4;
      const s = (0.35 + rand(seed + i * 7) * 0.6) * height * hump;
      o.position.set(x, s * 0.35, z);
      o.rotation.set((rand(seed + i * 11) - 0.5) * 1.2, rand(seed + i * 13) * 3, (rand(seed + i * 17) - 0.5) * 1.2);
      o.scale.set(s * (0.8 + rand(i + seed) * 0.6), s * (0.5 + rand(i + seed + 1) * 0.5), s * 0.5);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      ink.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(rand(seed + i * 19) > 0.5 ? "#e6f2fa" : "#9cc8e4"));
    }
    const g = new THREE.Group();
    g.add(m, ink);
    return g;
  }, [a[0], a[1], b[0], b[1], height, seed, blocks]);
  React.useEffect(
    () => () => {
      mesh.children.forEach((c) => {
        const im = c as THREE.InstancedMesh;
        im.geometry.dispose();
        (im.material as THREE.Material).dispose();
        im.dispose();
      });
    },
    [mesh],
  );
  return <primitive object={mesh} />;
};

// ---------- sets ----------

const SKY_SUN: [number, string][] = [[-0.1, "#ffd8a8"], [0.0, "#ffc890"], [0.05, "#f0b08a"], [0.12, "#a8b8d8"], [0.3, "#5a7ec0"], [0.6, "#2e4e98"], [1.0, "#1a2e6a"]];
const SKY_FOG: [number, string][] = [[-0.1, "#c8d0d6"], [0.0, "#c4ccd4"], [0.2, "#aab4c0"], [1.0, "#8a96a6"]];

// High over the pack ice. The ice scrolls along -x at `speed` m/frame so the balloon near the origin flies +x;
// `altitude` = how far below the ice lies. Children hold the balloon.
export const ArcticSkySet: React.FC<{ camera: CameraShot; frame: number; mode: "sun" | "fog"; speed?: number; altitude?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  mode,
  speed = 0.12,
  altitude = 40,
  children,
}) => {
  const pack = useOwned(() => tiled(packAerialCanvas(), 3, 3));
  pack.offset.set((frame * speed) / 130, 0);
  const sun: Vec3 = [0.75, 0.12, -1];
  const sunPos = new THREE.Vector3(...sun).normalize().multiplyScalar(270);
  const fog = mode === "fog";
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[fog ? "#aab4c0" : "#5a7ec0"]} />
      <fog attach="fog" args={[fog ? "#c4ccd4" : "#e8dcd0", fog ? 10 : 50, fog ? 40 : 220]} />
      <ambientLight intensity={fog ? 1.25 : 0.95} color={fog ? "#eef2f8" : "#e0e6ff"} />
      <hemisphereLight args={["#dfe8ff", "#e8eef4", 0.5]} />
      <directionalLight position={sunPos.toArray()} intensity={fog ? 0.6 : 2.3} color={fog ? "#ffffff" : "#ffd0a0"} />
      <group position={camera.position}>
        <SkyDome sun={sun} stops={fog ? SKY_FOG : SKY_SUN} glow={fog ? "#ffffff" : "#ffe8c0"} />
        {!fog && (
          <>
            <mesh position={sunPos.toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
              <circleGeometry args={[9, 48]} />
              <meshBasicMaterial color="#fff4d8" fog={false} toneMapped={false} depthWrite={false} />
            </mesh>
            <Halo position={sunPos.clone().multiplyScalar(0.97).toArray() as Vec3} size={80} color="#ffd8a0" strength={0.5} />
          </>
        )}
      </group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -altitude, -60]}>
        <planeGeometry args={[520, 520]} />
        <meshBasicMaterial map={pack} color={fog ? "#d8dee4" : "#ffffff"} />
      </mesh>
      {/* cloud wisps drifting past at the balloon's height */}
      <group userData={{ ghost: true }}>
        {Array.from({ length: fog ? 36 : 14 }, (_, i) => {
          const x = ((((rand(i) * 90 - frame * speed * (fog ? 1.6 : 1.1)) % 90) + 90) % 90) - 45;
          const k = 1.5 + rand(i + 4) * (fog ? 4 : 3);
          return (
            <mesh key={i} position={[x, -6 + rand(i + 1) * (fog ? 16 : 10), -26 + rand(i + 2) * (fog ? 18 : 12)]} scale={[k * 2.2, k * 0.5, k]}>
              <sphereGeometry args={[1, 12, 8]} />
              <meshBasicMaterial color={fog ? "#e4e8ec" : "#fff4ea"} transparent opacity={fog ? 0.55 : 0.75} depthWrite={false} />
            </mesh>
          );
        })}
      </group>
      {children}
    </>
  );
};

// Danes Island: the octagonal plank hangar (centre at origin, radius HANGAR.r), snowy rock slope, dark mountains,
// the grey sea in front-left. Floor y = 0. `balloon` = height of the basket floor over the ground (null: none).
export const HANGAR = { r: 3.2, h: 7.5 };
export const HangarSet: React.FC<{ camera: CameraShot; frame: number; balloon?: number | null; ropes?: number; children?: React.ReactNode }> = ({
  camera,
  frame,
  balloon = null,
  ropes = 1,
  children,
}) => {
  const camX = camera.position[0];
  const planks = useOwned(() => tiled(planksCanvas(), 1, 2));
  const snow = useOwned(() => tiled(iceCanvas("#eef3f8"), 10, 10));
  const sun: Vec3 = [0.6, 0.3, -1];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#9aaabb"]} />
      <fog attach="fog" args={["#c8d2dc", 30, 140]} />
      <ambientLight intensity={1.05} color="#e8eef8" />
      <hemisphereLight args={["#dfe8ff", "#b8b0a8", 0.5]} />
      <directionalLight
        position={new THREE.Vector3(...sun).normalize().multiplyScalar(16).toArray()}
        intensity={1.6}
        color="#ffe8d0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={14}
        shadow-camera-bottom={-6}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
      />
      <group position={camera.position}>
        <SkyDome sun={sun} stops={[[-0.1, "#e4e8ee"], [0.0, "#d8dee6"], [0.15, "#b4c2d2"], [0.4, "#8a9cb4"], [1.0, "#6a7e9a"]]} glow="#fff0dc" />
      </group>
      {/* dark mountains streaked with snow */}
      <Ridge z={-60} shift={camX * 0.6} width={220} low={14} high={30} peaks={6} color="#3a3a42" seed={71} snow="#eef2f6" />
      <Ridge z={-40} shift={camX * 0.3} width={160} low={6} high={14} peaks={5} color="#4a4a50" seed={83} snow="#e8eef4" />
      {/* the sea, front-left */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-30, -0.4, 10]}>
        <planeGeometry args={[60, 60]} />
        <meshToonMaterial color="#4a6268" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-12 - rand(i) * 20, -0.35, -10 + rand(i + 1) * 30]}>
          <planeGeometry args={[1.6 + rand(i + 2) * 2, 0.9]} />
          <meshBasicMaterial color="#e8f0f4" />
        </mesh>
      ))}
      {/* snowy ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[6, 0, -10]} receiveShadow>
        <planeGeometry args={[70, 60]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={snow} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <Rock key={i} position={[-6 + rand(i + 20) * 18, 0, -14 + rand(i + 30) * 10]} size={0.4 + rand(i) * 1.1} color="#4a4644" seed={i} />
      ))}
      {/* octagonal plank tower, open top; a gap on the camera side shows the balloon inside */}
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        const side = 2 * HANGAR.r * Math.tan(Math.PI / 8);
        const top = i === 2 ? HANGAR.h * 0.55 : HANGAR.h; // the front wall was taken down for the launch
        return (
          <group key={i} position={[Math.cos(a) * HANGAR.r, 0, Math.sin(a) * HANGAR.r]} rotation={[0, -a + Math.PI / 2, 0]}>
            <InkBox size={[side, top, 0.12]} position={[0, top / 2, 0]} color="#ffffff" map={planks} ink={0.03} />
            {/* scaffold posts */}
            <InkBox size={[0.12, HANGAR.h + 0.6, 0.12]} position={[side / 2, (HANGAR.h + 0.6) / 2, 0.25]} color="#6a4a30" ink={0.015} />
            {[2, 4.5, 7].map((y) => (
              <InkBox key={y} size={[side, 0.08, 0.1]} position={[0, y, 0.3]} color="#6a4a30" ink={0.012} />
            ))}
          </group>
        );
      })}
      {/* flagpole with the Swedish flag */}
      <InkCylinder radius={0.05} height={4} position={[1.8, HANGAR.h + 2, -1.6]} color="#8a6a4a" ink={0.012} />
      <group position={[2.45, HANGAR.h + 3.5, -1.6]} rotation={[0, Math.sin(frame * 0.2) * 0.25, 0]}>
        <mesh>
          <planeGeometry args={[1.3, 0.8, 8, 1]} />
          <meshToonMaterial color="#2a5aa8" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[-0.22, 0, 0.005]}>
          <planeGeometry args={[0.16, 0.8]} />
          <meshBasicMaterial color="#f0c830" side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <planeGeometry args={[1.3, 0.16]} />
          <meshBasicMaterial color="#f0c830" side={THREE.DoubleSide} />
        </mesh>
      </group>
      {balloon !== null && (
        <group position={[0, balloon, 0]}>
          <OrnenBalloon frame={frame} ropes={ropes} />
        </group>
      )}
      {children}
    </>
  );
};

type IceMode = "day" | "dusk" | "storm";
const ICE: Record<IceMode, { stops: [number, string][]; sun: Vec3; light: string; intensity: number; fog: [string, number, number]; bg: string; ambient: string; tint: string }> = {
  day: { stops: [[-0.1, "#e8eef2"], [0.0, "#e0e8ee"], [0.2, "#c8d6e2"], [1.0, "#9ab0c8"]], sun: [0.5, 0.3, -1], light: "#fff4e4", intensity: 1.3, fog: ["#e4eaf0", 14, 80], bg: "#c8d6e2", ambient: "#eef2ff", tint: "#eef4f8" },
  dusk: { stops: [[-0.1, "#ffc8b0"], [0.0, "#f4b0a0"], [0.08, "#c898b8"], [0.25, "#7a6aa8"], [0.6, "#3e3a7a"], [1.0, "#24224e"]], sun: [-0.8, 0.08, -1], light: "#ffb898", intensity: 1.6, fog: ["#c8a8c0", 16, 90], bg: "#7a6aa8", ambient: "#d8d0f0", tint: "#e4e0f4" },
  storm: { stops: [[-0.1, "#4a5878"], [0.0, "#3e4a68"], [0.2, "#2a344e"], [1.0, "#121828"]], sun: [0.3, 0.6, -1], light: "#a8b8e0", intensity: 0.7, fog: ["#3a4660", 4, 30], bg: "#2a344e", ambient: "#8a9ac8", tint: "#c8d4ec" },
};

// The pack ice: floor y = 0 (painted ice, sastrugi), pressure ridges, open leads of black water, ice horizon.
export const PackIceSet: React.FC<{ camera: CameraShot; frame: number; mode: IceMode; snow?: boolean; children?: React.ReactNode }> = ({ camera, frame, mode, snow, children }) => {
  const v = ICE[mode];
  const ice = useOwned(() => tiled(iceCanvas(v.tint), 12, 12), [v.tint]);
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[v.bg]} />
      <fog attach="fog" args={v.fog} />
      <ambientLight intensity={mode === "storm" ? 0.9 : 1.2} color={v.ambient} />
      <hemisphereLight args={["#dfe8ff", "#c8d0e0", 0.45]} />
      <directionalLight
        position={new THREE.Vector3(...v.sun).normalize().multiplyScalar(16).toArray()}
        intensity={v.intensity}
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
        <SkyDome sun={v.sun} stops={v.stops} glow={mode === "dusk" ? "#ffd8b0" : "#ffffff"} />
        {mode === "dusk" && (
          <mesh position={new THREE.Vector3(...v.sun).normalize().multiplyScalar(270).toArray()} onUpdate={(m) => m.lookAt(0, 0, 0)}>
            <circleGeometry args={[8, 40]} />
            <meshBasicMaterial color="#ffe0b8" fog={false} toneMapped={false} depthWrite={false} />
          </mesh>
        )}
      </group>
      {/* distant hummocks on the horizon (parallax) */}
      <Ridge z={-70} shift={camX * 0.7} width={240} low={0.6} high={2.2} peaks={14} color={mode === "storm" ? "#4a5878" : "#d4e2ee"} seed={91} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -20]} receiveShadow>
        <planeGeometry args={[160, 100]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={ice} />
      </mesh>
      {/* open leads of black water */}
      {[
        [-9, -14, 30, 1.4, 0.3],
        [7, -24, 26, 2.2, -0.2],
        [-4, 9, 18, 0.9, 0.5],
      ].map(([x, z, w, d, rot], i) => (
        <group key={i} position={[x, 0.006, z]} rotation={[0, rot, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[w + 0.3, d + 0.3]} />
            <meshBasicMaterial color="#9cc4dc" />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]}>
            <planeGeometry args={[w, d]} />
            <meshBasicMaterial color={mode === "dusk" ? "#2a2440" : "#18222c"} />
          </mesh>
        </group>
      ))}
      <PressureRidge a={[-14, -6]} b={[10, -9]} height={1.4} seed={3} blocks={60} />
      <PressureRidge a={[-6, -18]} b={[16, -16]} height={2.0} seed={7} blocks={60} />
      <PressureRidge a={[4, 2]} b={[14, -3]} height={1.0} seed={11} blocks={30} />
      {snow && <Snowfall frame={frame} around={camera.position} count={mode === "storm" ? 320 : 160} wind={mode === "storm" ? 0.16 : 0.02} fall={mode === "storm" ? 0.02 : 0.03} />}
      {children}
    </>
  );
};

// White Island, 1930: gravel shore (floor y = 0, z > -6), the ice cap rising behind, grey sea with drift ice to the
// left, the sealing ship anchored at `SHIP` (or `ship` overrides its position). Patches of old snow on the gravel.
export const SHIP: Vec3 = [-14, 0, -16];
export const KvitoyaSet: React.FC<{ camera: CameraShot; frame: number; ship?: Vec3; snow?: boolean; children?: React.ReactNode }> = ({ camera, frame, ship = SHIP, snow, children }) => {
  const camX = camera.position[0];
  const gravel = useOwned(() => tiled(gravelCanvas(), 10, 10));
  const sun: Vec3 = [0.6, 0.35, -1];
  const bob = Math.sin(frame * 0.05) * 0.06;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#8a98a8"]} />
      <fog attach="fog" args={["#b8c4cc", 25, 120]} />
      <ambientLight intensity={1.1} color="#e8eef4" />
      <hemisphereLight args={["#dfe8ff", "#8a8478", 0.5]} />
      <directionalLight
        position={new THREE.Vector3(...sun).normalize().multiplyScalar(16).toArray()}
        intensity={1.4}
        color="#fff0e0"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <group position={camera.position}>
        <SkyDome sun={sun} stops={[[-0.1, "#dce2e8"], [0.0, "#cfd6de"], [0.15, "#a8b4c4"], [0.45, "#7a8aa2"], [1.0, "#56647e"]]} glow="#fff4e4" />
      </group>
      {/* the ice cap: a low white dome behind the shore */}
      <group position={[camX * 0.3 + 6, -14, -60]} scale={[60, 22, 30]}>
        <mesh>
          <sphereGeometry args={[1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color="#f4f8fa" gradientMap={toonRamp} />
        </mesh>
        <mesh scale={1.004}>
          <sphereGeometry args={[1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#8a9aaa" side={THREE.BackSide} />
        </mesh>
      </group>
      {/* sea and drift ice, left and behind */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-40, -0.3, -10]}>
        <planeGeometry args={[100, 120]} />
        <meshToonMaterial color="#3a5058" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 24 }, (_, i) => (
        <InkBox
          key={i}
          size={[0.8 + rand(i) * 2.4, 0.25, 0.6 + rand(i + 1) * 1.6]}
          position={[-8 - rand(i + 2) * 34, -0.2 + Math.sin(frame * 0.04 + i) * 0.03, -30 + rand(i + 3) * 40]}
          rotation={[0, rand(i + 4) * 3, 0]}
          color="#eef4f8"
          ink={0.02}
        />
      ))}
      {/* gravel shore */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[10, 0, -6]} receiveShadow>
        <planeGeometry args={[40, 60]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={gravel} />
      </mesh>
      {Array.from({ length: 22 }, (_, i) => (
        <Rock key={i} position={[-4 + rand(i + 40) * 22, 0, -22 + rand(i + 50) * 16]} size={0.3 + rand(i + 60) * 0.9} color="#3e3a36" seed={i + 9} />
      ))}
      {/* the sealing ship: dark hull with red trim, wheelhouse aft, one mast */}
      <group position={[ship[0], ship[1] + bob, ship[2]]} rotation={[Math.sin(frame * 0.04) * 0.02, 0.5, 0]}>
        <InkBox size={[7, 1.4, 2.2]} position={[0, 0.5, 0]} color="#2a2a2a" ink={0.05} />
        <InkBox size={[7.05, 0.18, 2.25]} position={[0, 1.1, 0]} color="#a83a2a" ink={0} />
        <mesh position={[3.9, 0.5, 0]} rotation={[0, 0, -Math.PI / 2]}>
          <coneGeometry args={[1.1, 1.6, 4]} />
          <meshToonMaterial color="#2a2a2a" gradientMap={toonRamp} />
        </mesh>
        <InkBox size={[1.6, 1.2, 1.5]} position={[-2.2, 1.8, 0]} color="#e8e0d0" ink={0.04} />
        <InkBox size={[1.7, 0.12, 1.6]} position={[-2.2, 2.45, 0]} color="#5a4a3a" ink={0.02} />
        <InkCylinder radius={0.09} height={6} position={[0.8, 4, 0]} color="#7a5a3a" ink={0.02} />
        <InkCylinder radius={0.35} height={0.5} position={[0.8, 6.2, 0]} color="#7a5a3a" ink={0.02} />
        <Cord a={[0.8, 6.8, 0]} b={[3.6, 1.2, 0]} width={0.02} />
        <Cord a={[0.8, 6.8, 0]} b={[-3.4, 1.2, 0]} width={0.02} />
        <InkCylinder radius={0.14} height={0.9} position={[-2.6, 2.9, 0]} color="#2a2a2a" ink={0.02} />
      </group>
      {snow && <Snowfall frame={frame} around={camera.position} count={90} wind={0.03} />}
      {children}
    </>
  );
};
