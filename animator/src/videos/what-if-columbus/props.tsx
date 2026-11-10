import React, { useMemo, useRef } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, toonRamp, Vec3 } from "../../engine";
import { useSignAudit } from "../../engine/audit";

// Props for what-if-columbus: logbooks with readable headings, the captain's writing table, a hanging lantern, the
// carved stick and the berry branch (drawn about twice real size, plan.json format_note), crates for the swap, the
// reward purse.

const INK = "#1c1410";
const FONT = "Arial Black, Impact, sans-serif";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A parchment page: a heading in big ink capitals and rows of scribbled handwriting under it.
const pageTexture = (heading: string, seed: number, paper = "#f2e4c0") =>
  canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, 512, 640);
    const g = ctx.createRadialGradient(256, 320, 120, 256, 320, 420);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(120,80,30,0.35)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 640);
    const lines = heading.split("\n");
    ctx.fillStyle = INK;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const longest = Math.max(...lines.map((l) => l.length));
    let size = Math.min(120, Math.floor(820 / Math.max(4, longest)));
    ctx.font = `900 ${size}px ${FONT}`;
    const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
    if (widest > 440) size = Math.floor((size * 440) / widest);
    ctx.font = `900 ${size}px ${FONT}`;
    lines.forEach((l, i) => ctx.fillText(l, 256, 90 + i * size * 1.1));
    const top = 90 + lines.length * size * 1.1 + 10;
    ctx.strokeStyle = "rgba(40,28,20,0.55)";
    ctx.lineWidth = 4;
    for (let y = top; y < 600; y += 34) {
      ctx.beginPath();
      let x = 50;
      ctx.moveTo(x, y);
      while (x < 460) {
        const w = 18 + rand(seed + x + y) * 40;
        for (let k = 0; k < w; k += 6) ctx.lineTo(x + k, y + Math.sin((x + k) * 0.6 + seed) * 5);
        x += w + 12;
        ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
  });

// An open book lying on a slope, its pages facing up-and-toward the camera. `heading` sits on the right page.
// `shut` 0..1 closes the right page over the left; `slide` moves it (metres along x) as it is shoved away.
export const Logbook: React.FC<{ position: Vec3; rotation?: Vec3; heading: string; width?: number; shut?: number; cover?: string; seed?: number }> = ({
  position,
  rotation = [0, 0, 0],
  heading,
  width = 0.36,
  shut = 0,
  cover = "#6a2a1a",
  seed = 1,
}) => {
  const left = useMemo(() => pageTexture("", seed + 5), [seed]);
  const right = useMemo(() => pageTexture(heading, seed), [heading, seed]);
  const h = width * 0.62;
  const pw = width / 2;
  const ref = useRef<THREE.Group>(null);
  useSignAudit(ref, pw, h, `LOGBOOK ${heading.replace(/\n/g, " ")}`);
  return (
    <group position={position} rotation={rotation}>
      <InkBox size={[width + 0.03, 0.025, h + 0.03]} position={[0, -0.012, 0]} color={cover} ink={0.006} />
      <mesh position={[-pw / 2, 0.003, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[pw, h]} />
        <meshBasicMaterial map={left} toneMapped={false} />
      </mesh>
      {/* the right page turns over the spine (z axis) as the book shuts */}
      <group rotation={[0, 0, shut * Math.PI * 0.98]}>
        <group ref={ref} position={[pw / 2, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <planeGeometry args={[pw, h]} />
            <meshBasicMaterial map={right} toneMapped={false} side={THREE.FrontSide} />
          </mesh>
          <mesh position={[0, 0, -0.004]} rotation={[0, Math.PI, 0]}>
            <planeGeometry args={[pw + 0.015, h + 0.015]} />
            <meshToonMaterial color={cover} gradientMap={toonRamp} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// A loose page or a sheet held up on a slanted reading desk.
export const Page: React.FC<{ position: Vec3; rotation?: Vec3; heading: string; size?: number; seed?: number; paper?: string }> = ({ position, rotation = [0, 0, 0], heading, size = 0.4, seed = 3, paper }) => {
  const tex = useMemo(() => pageTexture(heading, seed, paper), [heading, seed, paper]);
  const ref = useRef<THREE.Group>(null);
  useSignAudit(ref, size, size * 1.25, `PAGE ${heading.replace(/\n/g, " ")}`);
  return (
    <group ref={ref} position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[size, size * 1.25]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// The captain's low writing table (top at `top`, under 0.45 m so a seated puppet's hands show over it) with a
// slanted board on it for the logbooks, an inkwell and a quill, a rolled chart.
export const WritingTable: React.FC<{ position: Vec3; width?: number; top?: number; slope?: number }> = ({ position, width = 1.1, top = 0.44, slope = 0.5 }) => (
  <group position={position}>
    <InkBox size={[width, 0.05, 0.55]} position={[0, top - 0.025, 0]} color="#7a4a2a" ink={0.012} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.07, top - 0.05, 0.45]} position={[s * (width / 2 - 0.08), (top - 0.05) / 2, 0]} color="#5a3420" ink={0.01} />
    ))}
    <InkBox size={[width - 0.1, 0.03, 0.42]} position={[0, top + 0.08, -0.02]} rotation={[slope, 0, 0]} color="#8a5a32" ink={0.01} />
    <InkBox size={[width - 0.1, 0.04, 0.03]} position={[0, top + 0.02, 0.18]} color="#5a3420" ink={0.006} />
    <InkCylinder radius={0.035} height={0.06} position={[width / 2 - 0.12, top + 0.03, 0.16]} color="#1c1c24" ink={0.005} />
    <InkBox size={[0.012, 0.22, 0.012]} position={[width / 2 - 0.1, top + 0.14, 0.15]} rotation={[0, 0, -0.3]} color="#f6f2ea" ink={0.004} />
    <InkBox size={[0.04, 0.12, 0.012]} position={[width / 2 - 0.07, top + 0.22, 0.15]} rotation={[0, 0, -0.3]} color="#ffffff" ink={0.004} />
    <InkCylinder radius={0.045} height={0.5} position={[-width / 2 + 0.2, top + 0.045, 0.16]} rotation={[0, 0, Math.PI / 2]} color="#e8d8b0" ink={0.006} />
  </group>
);

export const Stool: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#5a3420" }) => (
  <group position={position}>
    <InkBox size={[0.44, 0.06, 0.36]} position={[0, 0.31, 0]} color={color} ink={0.01} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.06, 0.28, 0.3]} position={[s * 0.17, 0.14, 0]} color={color} ink={0.008} />
    ))}
  </group>
);

// A ship's lantern hanging from a beam: iron frame, horn panes glowing, a halo and a point light. `swing` radians.
export const HangLantern: React.FC<{ position: Vec3; frame: number; swing?: number; on?: number; drop?: number }> = ({ position, frame, swing = 0, on = 1, drop = 0.5 }) => {
  const flick = 0.92 + 0.08 * Math.sin(frame * 0.7) * Math.sin(frame * 0.31 + 1);
  return (
    <group position={position} rotation={[0, 0, swing]} userData={{ ghost: true }}>
      <InkCylinder radius={0.008} height={drop} position={[0, -drop / 2, 0]} color="#2a2420" ink={0} />
      <group position={[0, -drop - 0.13, 0]}>
        <InkBox size={[0.17, 0.22, 0.17]} color="#3a2e24" ink={0.008} />
        <InkBox size={[0.14, 0.17, 0.18]} color="#ffd890" ink={0} emissive={on > 0 ? "#c08030" : undefined} />
        <InkBox size={[0.18, 0.17, 0.14]} color="#ffd890" ink={0} emissive={on > 0 ? "#c08030" : undefined} />
        <mesh position={[0, 0.15, 0]}>
          <coneGeometry args={[0.13, 0.09, 4]} />
          <meshToonMaterial color="#2a2420" gradientMap={toonRamp} />
        </mesh>
        {on > 0 && (
          <>
            <mesh>
              <sphereGeometry args={[0.04, 10, 8]} />
              <meshBasicMaterial color="#fff0c0" toneMapped={false} />
            </mesh>
            <Halo position={[0, 0, 0.1]} size={1.1} color="#ffb05a" strength={0.5 * on * flick} />
            <pointLight color="#ffb05a" intensity={3.2 * on * flick} distance={5} decay={1.5} />
          </>
        )}
      </group>
    </group>
  );
};

// A candle in a holder (the night cabin).
export const Candle: React.FC<{ position: Vec3; frame: number }> = ({ position, frame }) => {
  const flick = 0.9 + 0.1 * Math.sin(frame * 0.9) * Math.sin(frame * 0.37);
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkCylinder radius={0.06} height={0.02} position={[0, 0.01, 0]} color="#b08a40" ink={0.004} />
      <InkCylinder radius={0.022} height={0.14} position={[0, 0.09, 0]} color="#f6efe0" ink={0.004} />
      <mesh position={[0, 0.185, 0]} scale={[1, 1.8 * flick, 1]}>
        <sphereGeometry args={[0.016, 10, 8]} />
        <meshBasicMaterial color="#ffd070" toneMapped={false} />
      </mesh>
      <Halo position={[0, 0.19, 0.05]} size={0.32} color="#ffb05a" strength={0.22 * flick} />
      <pointLight position={[0, 0.2, 0.05]} color="#ffb060" intensity={2.2 * flick} distance={3.5} decay={1.6} />
    </group>
  );
};

// Small leaded stern windows set in the back wall, the sky (and the sea line) beyond.
export const SternWindows: React.FC<{ position: Vec3; sky: string; sea: string; count?: number; moon?: boolean }> = ({ position, sky, sea, count = 3, moon = false }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = sea;
        ctx.fillRect(0, 170, 256, 86);
        if (moon) {
          ctx.fillStyle = "#f4f0dc";
          ctx.beginPath();
          ctx.arc(170, 70, 26, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "#2a2018";
        ctx.lineWidth = 6;
        for (let k = -256; k < 512; k += 64) {
          ctx.beginPath();
          ctx.moveTo(k, 0);
          ctx.lineTo(k + 256, 256);
          ctx.moveTo(k + 256, 0);
          ctx.lineTo(k, 256);
          ctx.stroke();
        }
      }),
    [sky, sea, moon],
  );
  return (
    <group position={position}>
      {Array.from({ length: count }, (_, i) => (
        <group key={i} position={[(i - (count - 1) / 2) * 0.62, 0, 0]}>
          <InkBox size={[0.5, 0.48, 0.06]} color="#4a2e1c" ink={0.01} />
          <mesh position={[0, 0, 0.035]}>
            <planeGeometry args={[0.4, 0.38]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// The carved stick: a pale branch with notched, cut-in bands (drawn about 2x real size).
export const CarvedStick: React.FC<{ position: Vec3; rotation?: Vec3; length?: number }> = ({ position, rotation = [0, 0, 0], length = 0.7 }) => (
  <group position={position} rotation={rotation}>
    <InkCylinder radius={0.035} height={length} rotation={[0, 0, Math.PI / 2]} color="#d8c090" ink={0.008} />
    {Array.from({ length: 6 }, (_, i) => (
      <InkCylinder key={i} radius={0.038} height={0.025} position={[-length / 2 + 0.12 + i * (length - 0.24) / 5, 0, 0]} rotation={[0, 0, Math.PI / 2 + (i % 2 ? 0.4 : -0.4)]} color="#6a4a2a" ink={0} />
    ))}
    <InkCylinder radius={0.02} height={0.12} position={[length / 2 + 0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c0a070" ink={0.006} />
  </group>
);

// The branch with berries: a green twig with leaves and red berries (drawn about 2x real size).
export const BerryBranch: React.FC<{ position: Vec3; rotation?: Vec3; size?: number }> = ({ position, rotation = [0, 0, 0], size = 1 }) => (
  <group position={position} rotation={rotation} scale={size}>
    <InkCylinder radius={0.014} height={0.6} rotation={[0, 0, Math.PI / 2]} color="#6a5a2a" ink={0.006} />
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.1, 0.012, 0.05]} position={[-0.26 + i * 0.085, 0.01, (i % 2 ? 1 : -1) * 0.05]} rotation={[0, (i % 2 ? 1 : -1) * 0.6, 0]} color={i % 3 ? "#3a8a3a" : "#4a9a3a"} ink={0.004} />
    ))}
    {Array.from({ length: 9 }, (_, i) => (
      <mesh key={`b${i}`} position={[-0.22 + (i % 5) * 0.1 + rand(i) * 0.03, 0.03 + rand(i + 2) * 0.02, (rand(i + 4) - 0.5) * 0.08]}>
        <sphereGeometry args={[0.022, 10, 8]} />
        <meshToonMaterial color="#d0282a" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// A labelled crate with a card on its front (a POTATOES / CACAO / SMALLPOX box for the swap).
export const Crate: React.FC<{ position: Vec3; label: string; color?: string; card?: string; ink?: string; size?: Vec3; tilt?: number; contents?: string }> = ({
  position,
  label,
  color = "#b88a52",
  card = "#fff2d0",
  ink = INK,
  size = [0.46, 0.32, 0.34],
  tilt = 0,
  contents,
}) => {
  const tex = useMemo(
    () =>
      canvasTexture(512, 160, (ctx) => {
        ctx.fillStyle = card;
        ctx.fillRect(0, 0, 512, 160);
        ctx.strokeStyle = ink;
        ctx.lineWidth = 12;
        ctx.strokeRect(6, 6, 500, 148);
        ctx.fillStyle = ink;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        let s = 104;
        ctx.font = `900 ${s}px ${FONT}`;
        const w = ctx.measureText(label).width;
        if (w > 460) s = Math.floor((s * 460) / w);
        ctx.font = `900 ${s}px ${FONT}`;
        ctx.fillText(label, 256, 86);
      }),
    [label, card, ink],
  );
  const ref = useRef<THREE.Group>(null);
  const cw = size[0] * 0.92;
  useSignAudit(ref, cw, cw * 0.3125, label);
  return (
    <group position={position} rotation={[0, 0, tilt]}>
      <InkBox size={size} position={[0, size[1] / 2, 0]} color={color} ink={0.012} />
      {[0.25, 0.75].map((k) => (
        <InkBox key={k} size={[size[0] + 0.01, 0.03, size[2] + 0.01]} position={[0, size[1] * k, 0]} color="#7a5232" ink={0} />
      ))}
      {contents && (
        <group position={[0, size[1], 0]}>
          {Array.from({ length: 7 }, (_, i) => (
            <mesh key={i} position={[(rand(i) - 0.5) * size[0] * 0.75, 0.03, (rand(i + 3) - 0.5) * size[2] * 0.7]} scale={[1.2, 0.8, 1]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshToonMaterial color={contents} gradientMap={toonRamp} />
            </mesh>
          ))}
        </group>
      )}
      <group ref={ref} position={[0, size[1] * 0.5, size[2] / 2 + 0.006]}>
        <mesh>
          <planeGeometry args={[cw, cw * 0.3125]} />
          <meshBasicMaterial map={tex} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// The reward purse: a leather pouch with a drawstring and a card.
export const Purse: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh scale={[1, 1.1, 0.8]}>
      <sphereGeometry args={[0.1, 16, 12]} />
      <meshToonMaterial color="#8a5a2a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.035} height={0.06} position={[0, 0.12, 0]} color="#6a4220" ink={0.005} />
    <InkCylinder radius={0.05} height={0.015} position={[0, 0.1, 0]} color="#e8c040" ink={0} />
  </group>
);

// A small oil lamp on a stand (a village light at the west end of the swap table): `on` 0..1.
export const OilLamp: React.FC<{ position: Vec3; on: number; frame: number }> = ({ position, on, frame }) => {
  const flick = 0.9 + 0.1 * Math.sin(frame * 0.8 + position[0] * 9);
  return (
    <group position={position} userData={{ ghost: true }}>
      <InkCylinder radius={0.06} height={0.05} position={[0, 0.025, 0]} color="#a05a32" ink={0.005} />
      <InkCylinder radius={0.012} height={0.03} position={[0, 0.06, 0]} color="#3a2a1a" ink={0} />
      {on > 0.02 && (
        <>
          <mesh position={[0, 0.095, 0]} scale={[on, on * 1.7 * flick, on]}>
            <sphereGeometry args={[0.02, 10, 8]} />
            <meshBasicMaterial color="#ffd070" toneMapped={false} />
          </mesh>
          <Halo position={[0, 0.1, 0.04]} size={0.28} color="#ffb05a" strength={0.22 * on * flick} />
          <pointLight position={[0, 0.12, 0.05]} color="#ffb060" intensity={1.2 * on} distance={1.6} decay={1.6} />
        </>
      )}
    </group>
  );
};
