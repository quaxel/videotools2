import React from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, PuppetLight, SkyDome, Vec3 } from "../../engine";
import { rnd } from "../pisces-sign/props";
import { Ball, Cap, CoffeeMug, Cyl, RBox } from "../dog-nose/props";
import { Cloud, LightShaft, Lights, Motes, useOwnedTex, wallpaper } from "../dog-nose/sets";
import { Cable, GlassCrack, Mug } from "./props";

// Sets for "You Wake Up With an Eagle's Vision" (Pixar look, like dog-nose): the neighbour's brick apartment block
// with the nose-picking window, and a glass-fronted corner café that StreetSet carries as a child. References:
// guide/references/cafe-glass-door.md (café), guide/references/apartment-window.md (block, window).

const FONT = "'Arial Black', Impact, sans-serif";

// ---------- the neighbour's block (third-floor window) ----------

export const NEIGHBOUR_WIN = { x: 0, sill: 0.7, top: 2.1, half: 0.85, roomZ: -4 };
export const neighbourLight = (): PuppetLight => ({
  tint: "#fff3d8",
  shadow: 0.14,
  distant: [{ direction: [0.4, 0.5, 0.8], color: "#ffe9b8", strength: 0.9 }],
  points: [{ position: [0.9, 1.5, -1.2], color: "#ffb36b", strength: 0.6, range: 2.4 }],
});

const SKY_DAY: [number, string][] = [
  [-0.1, "#e8f6ff"],
  [0.1, "#a8dcff"],
  [0.4, "#6ab8f7"],
  [1.0, "#2f78d8"],
];

const brickTex = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#c9a58a";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 8; y++) {
      for (let x = -1; x < 5; x++) {
        const ox = (y % 2) * 32;
        const k = rnd(y * 7 + x + 3);
        ctx.fillStyle = ["#b8553c", "#c4624a", "#a84a34", "#cf7050"][Math.floor(k * 4)];
        ctx.fillRect(x * 64 + ox + 2, y * 32 + 2, 60, 28);
      }
    }
  });

const Plant: React.FC<{ position: Vec3; s?: number; flowers?: string }> = ({ position, s = 1, flowers }) => (
  <group position={position} scale={s}>
    <Cyl r={0.07} r2={0.055} h={0.12} position={[0, 0.06, 0]} color="#d8643a" />
    {[0, 1, 2, 3, 4].map((i) => (
      <Ball key={i} position={[Math.cos(i * 1.3) * 0.06, 0.16 + (i % 2) * 0.06, Math.sin(i * 1.3) * 0.05]} radius={0.065} color={["#3f9a50", "#52ae5f", "#2f8a42"][i % 3]} rough={0.9} />
    ))}
    {flowers &&
      [0, 1, 2].map((i) => <Ball key={`f${i}`} position={[Math.cos(i * 2.1) * 0.075, 0.24 + (i % 2) * 0.04, Math.sin(i * 2.1) * 0.06 + 0.04]} radius={0.028} color={flowers} glow />)}
  </group>
);

// A neighbour's window in the brick block, facing +z; the camera looks at it from the street.
const WindowBox: React.FC<{ x: number; y: number; w?: number; h?: number; curtain: string; lit?: boolean; plant?: boolean; ac?: boolean; blind?: number }> = ({ x, y, w = 1.2, h = 1.35, curtain, lit = false, plant = false, ac = false, blind = 0.5 }) => (
  <group position={[x, y, 0.02]}>
    <RBox size={[w + 0.24, h + 0.24, 0.1]} position={[0, 0, 0]} color="#fffaf0" radius={0.04} />
    <mesh position={[0, 0, 0.06]}>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial color={new THREE.Color(lit ? "#ffd27a" : "#7fa3c8").multiplyScalar(lit ? 1.4 : 0.8)} toneMapped={false} />
    </mesh>
    {/* sky reflection streak */}
    <mesh position={[-w * 0.15, h * 0.1, 0.065]} rotation={[0, 0, -0.5]}>
      <planeGeometry args={[0.12, h * 1.3]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.28} toneMapped={false} />
    </mesh>
    <RBox size={[0.05, h, 0.05]} position={[0, 0, 0.09]} color="#fffaf0" radius={0.01} />
    <RBox size={[w, 0.05, 0.05]} position={[0, 0.05, 0.09]} color="#fffaf0" radius={0.01} />
    {/* curtain or half-drawn blind */}
    <RBox size={[w * 0.46, h * (0.5 + blind * 0.4), 0.05]} position={[-w * 0.26, h * 0.25 - h * blind * 0.2, 0.12]} color={curtain} radius={0.03} rough={0.95} />
    <RBox size={[w * 0.3, h * 0.8, 0.05]} position={[w * 0.35, h * 0.1, 0.12]} color={curtain} radius={0.03} rough={0.95} />
    <RBox size={[w + 0.5, 0.07, 0.3]} position={[0, -h / 2 - 0.16, 0.18]} color="#e8e0d0" radius={0.03} />
    {plant && <Plant position={[w * 0.25, -h / 2 - 0.12, 0.2]} flowers="#ff5a6a" />}
    {ac && (
      <group position={[0, -h / 2 - 0.55, 0.28]}>
        <RBox size={[0.7, 0.4, 0.4]} color="#d8dde4" radius={0.05} />
        <RBox size={[0.55, 0.22, 0.02]} position={[0, 0, 0.21]} color="#aab2bd" radius={0.01} />
      </group>
    )}
  </group>
);

// The block opposite (facing +z): brick wall with a grid of windows, a fire-escape rail, laundry, trees in front for depth, the
// street far below. The main window (NEIGHBOUR_WIN) is open on a lit room: armchair, TV glowing, lamp, shelf, fish on the wall.
export const NeighbourSet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode; tv?: number }> = ({ camera, f, children, tv = 1 }) => {
  const brick = useOwnedTex(() => {
    const t = brickTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(7, 6);
    return t;
  });
  const paper = useOwnedTex(() => {
    const t = wallpaper("#c9e0c0", "#dcefd2");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 1.6);
    return t;
  });
  const tvTex = useOwnedTex(() =>
    canvasTexture(256, 160, (ctx) => {
      const cols = ["#ff5a6a", "#ffd23f", "#4fd18a", "#3fa6ff", "#b36bff"];
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i * 52, 0, 52, 160);
      });
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      ctx.beginPath();
      ctx.arc(128, 80, 40, 0, Math.PI * 2);
      ctx.fill();
    }),
  );
  const { half, sill, top, roomZ } = NEIGHBOUR_WIN;
  const L = 14;
  const rows = [4.45, 1.4, -1.65, -4.7, -7.75];
  const cols = [-6, -3, 3, 6];
  const curt = ["#ff9f6b", "#8fb8de", "#f2c84a", "#c8a0e8", "#7ed2a0", "#ff8fb1"];
  const tvPulse = 0.85 + 0.15 * Math.sin(f * 0.37);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#cfe8ff"]} />
      <fog attach="fog" args={["#cfe8ff", 22, 70]} />
      <Lights camera={camera} sun={[-5, 8, 12]} sunColor="#fff2d8" sunK={2.0} sky="#cfe8ff" ground="#9a7a62" hemiK={1.05} ambient={0.32} box={9} />
      <group position={camera.position}>
        <SkyDome sun={[-5, 8, 12]} stops={SKY_DAY} glow="#fff6dc" />
      </group>
      {[[-30, 10, -60, 5], [25, 14, -70, 6], [-8, 22, -50, 4]].map(([x, y, z, s], i) => (
        <Cloud key={i} position={[x + camera.position[0] * 0.8, y, z]} s={s} color="#ffffff" />
      ))}
      {/* brick wall with the open window cut out */}
      {[
        { size: [L, sill + 9.4, 0.35] as Vec3, pos: [0, (sill - 9.4) / 2, -0.175] as Vec3 },
        { size: [L, 7.2 - top, 0.35] as Vec3, pos: [0, top + (7.2 - top) / 2, -0.175] as Vec3 },
        { size: [L / 2 - half, top - sill, 0.35] as Vec3, pos: [-(L / 2 + half) / 2, (sill + top) / 2, -0.175] as Vec3 },
        { size: [L / 2 - half, top - sill, 0.35] as Vec3, pos: [(L / 2 + half) / 2, (sill + top) / 2, -0.175] as Vec3 },
      ].map((p, i) => (
        <RBox key={i} size={p.size} position={p.pos} color="#ffffff" map={brick} radius={0.03} rough={0.95} />
      ))}
      {/* cornice and roof edge */}
      <RBox size={[L + 0.4, 0.35, 0.6]} position={[0, 7.3, 0.15]} color="#e8dccb" radius={0.08} />
      <RBox size={[L + 0.2, 0.18, 0.4]} position={[0, 6.9, 0.1]} color="#d8c9b4" radius={0.05} />
      {/* other windows */}
      {rows.map((y, ri) =>
        cols.map((x, ci) =>
          Math.abs(y - 1.4) < 0.01 && Math.abs(x) < 1 ? null : (
            <WindowBox key={`${ri}${ci}`} x={x} y={y} curtain={curt[(ri * 5 + ci * 2) % curt.length]} lit={(ri + ci) % 5 === 2} plant={(ri + ci) % 3 === 0} ac={(ri * 3 + ci) % 4 === 1} blind={((ri + ci) % 3) * 0.3} />
          ),
        ),
      )}
      {/* third-floor windows either side of ours, and a fire-escape rail running along the floor below */}
      <WindowBox x={-3} y={1.4} curtain="#8fb8de" plant />
      <WindowBox x={3} y={1.4} curtain="#ff9f6b" ac />
      <group position={[0, 0.0, 0.5]}>
        <RBox size={[L - 1, 0.07, 0.8]} position={[0, -0.12, 0]} color="#3a3f4a" radius={0.02} />
        {Array.from({ length: 36 }, (_, i) => (
          <Cyl key={i} r={0.012} h={0.8} position={[-L / 2 + 0.7 + i * 0.37, 0.28, 0.4]} color="#3a3f4a" />
        ))}
        <RBox size={[L - 1, 0.05, 0.05]} position={[0, 0.68, 0.4]} color="#3a3f4a" radius={0.01} />
      </group>
      {/* the open casement: two sashes swung outward, curtains drawn back, a flower box and a mug on the sill */}
      <group position={[0, 0, 0]}>
        <RBox size={[half * 2 + 0.2, 0.1, 0.4]} position={[0, sill - 0.04, 0.12]} color="#fffaf0" radius={0.03} />
        <RBox size={[half * 2 + 0.2, 0.1, 0.22]} position={[0, top + 0.04, -0.02]} color="#fffaf0" radius={0.03} />
        {[-1, 1].map((s) => (
          <group key={s} position={[s * half, (sill + top) / 2, 0.02]} rotation={[0, -s * 1.05, 0]}>
            <RBox size={[0.07, top - sill, 0.05]} position={[0, 0, 0]} color="#fffaf0" radius={0.015} />
            <RBox size={[0.07, top - sill, 0.05]} position={[-s * 0.82, 0, 0]} color="#fffaf0" radius={0.015} />
            <RBox size={[0.82, 0.06, 0.05]} position={[-s * 0.41, 0.6, 0]} color="#fffaf0" radius={0.015} />
            <RBox size={[0.82, 0.06, 0.05]} position={[-s * 0.41, -0.6, 0]} color="#fffaf0" radius={0.015} />
            <mesh position={[-s * 0.41, 0, 0]}>
              <planeGeometry args={[0.8, 1.2]} />
              <meshBasicMaterial color="#bfe6ff" transparent opacity={0.35} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
          </group>
        ))}
        {[-1, 1].map((s) =>
          Array.from({ length: 4 }, (_, i) => (
            <Cap key={`${s}${i}`} a={[s * (half - 0.05 + i * 0.05), top - 0.05, 0.05]} b={[s * (half + 0.05 + i * 0.07), sill + 0.05, 0.1 + (i % 2) * 0.04]} r={0.05} color={i % 2 ? "#ff7f8f" : "#ff94a2"} />
          )),
        )}
        <Cyl r={0.018} h={half * 2 + 0.6} position={[0, top - 0.02, 0.1]} rotation={[0, 0, Math.PI / 2]} color="#c99a5a" />
        {/* flower box under the sill */}
        <RBox size={[1.5, 0.2, 0.26]} position={[0, sill - 0.2, 0.3]} color="#b8793a" radius={0.04} />
        {Array.from({ length: 9 }, (_, i) => (
          <group key={i} position={[-0.65 + i * 0.16, sill - 0.04, 0.3]}>
            <Ball position={[0, 0.03, 0]} radius={0.06} color="#3f9a50" rough={0.9} />
            <Ball position={[0, 0.08, 0.02]} radius={0.04} color={["#ff4f6a", "#ffd23f", "#ff8fb1"][i % 3]} glow />
          </group>
        ))}
        <Mug position={[0.62, sill + 0.02, 0.1]} color="#fff6ea" steam={1} f={f} scale={1.5} />
      </group>
      {/* the room behind: floor, back wall, shelf, armchair, TV, lamp, fish on the wall */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, roomZ / 2]} receiveShadow>
        <planeGeometry args={[4.4, Math.abs(roomZ)]} />
        <meshStandardMaterial color="#b98a5a" roughness={0.6} />
      </mesh>
      <RBox size={[4.4, 3.2, 0.1]} position={[0, 1.6, roomZ]} color="#ffffff" map={paper} radius={0.01} rough={0.9} />
      <RBox size={[0.1, 3.2, Math.abs(roomZ)]} position={[-2.2, 1.6, roomZ / 2]} color="#c9e0c0" radius={0.01} />
      <RBox size={[0.1, 3.2, Math.abs(roomZ)]} position={[2.2, 1.6, roomZ / 2]} color="#c9e0c0" radius={0.01} />
      <RBox size={[4.4, 0.08, Math.abs(roomZ)]} position={[0, 2.64, roomZ / 2]} color="#f6efe4" radius={0.01} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, -1.9]}>
        <circleGeometry args={[1.1, 40]} />
        <meshStandardMaterial color="#d8643a" roughness={1} />
      </mesh>
      {/* armchair left, TV on a cabinet right, floor lamp, shelf with frames */}
      <group position={[-1.3, 0, -2.6]} rotation={[0, 0.35, 0]}>
        <RBox size={[0.9, 0.4, 0.8]} position={[0, 0.3, 0]} color="#4a6fd8" radius={0.14} />
        <RBox size={[0.9, 0.7, 0.24]} position={[0, 0.65, -0.32]} color="#4a6fd8" radius={0.12} />
        {[-1, 1].map((s) => (
          <RBox key={s} size={[0.18, 0.4, 0.8]} position={[s * 0.5, 0.45, 0]} color="#3f5fc0" radius={0.08} />
        ))}
      </group>
      <group position={[1.35, 0, -3.5]}>
        <RBox size={[1.4, 0.5, 0.5]} position={[0, 0.25, 0]} color="#7a4b2f" radius={0.04} />
        <RBox size={[1.1, 0.7, 0.1]} position={[0, 0.9, 0]} color="#25252b" radius={0.04} />
        <mesh position={[0, 0.9, 0.056]}>
          <planeGeometry args={[1.0, 0.6]} />
          <meshBasicMaterial map={tvTex} color={new THREE.Color(tvPulse * tv, tvPulse * tv, tvPulse * tv).multiplyScalar(1.2)} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 0.9, 0.7]} intensity={1.1 * tv} distance={3.2} color="#9ad0ff" />
      </group>
      <group position={[1.85, 0, -1.2]}>
        <Cyl r={0.02} h={1.6} position={[0, 0.8, 0]} color="#3a3f4a" />
        <Cyl r={0.16} r2={0.1} h={0.28} position={[0, 1.7, 0]} color="#fff3c8" emissive="#ffd27a" k={0.4} />
        <pointLight position={[0, 1.6, 0.2]} intensity={1.0} distance={3} color="#ffcf8a" />
      </group>
      <RBox size={[1.2, 0.05, 0.22]} position={[-1.0, 1.7, roomZ + 0.15]} color="#8a5634" radius={0.015} />
      {["#ff6b4a", "#ffd23f", "#4fa6ff"].map((c, i) => (
        <RBox key={c} size={[0.24, 0.3, 0.03]} position={[-1.35 + i * 0.35, 1.9, roomZ + 0.1]} rotation={[0, 0, (i - 1) * 0.08]} color={c} radius={0.01} />
      ))}
      {/* a mounted fish above the TV */}
      <group position={[1.35, 1.95, roomZ + 0.1]} rotation={[0, 0, 0.12]}>
        <Ball position={[0, 0, 0]} radius={0.22} color="#4fa6a0" scale={[1.6, 0.8, 0.3]} rough={0.4} />
        <Ball position={[-0.34, 0, 0]} radius={0.12} color="#4fa6a0" scale={[1, 1.2, 0.2]} rough={0.4} />
        <Ball position={[0.26, 0.04, 0.07]} radius={0.03} color="#ffffff" />
      </group>
      <Cyl r={0.06} h={9.5} position={[2.05, -2.3, 0.12]} color="#5a6270" rough={0.5} />
      <Cyl r={0.06} h={9.5} position={[-2.05, -2.3, 0.12]} color="#5a6270" rough={0.5} />
      {Array.from({ length: 16 }, (_, i) => (
        <Ball key={i} position={[4.6 + Math.sin(i * 1.7) * 0.35, -2.5 + i * 0.5, 0.12 + (i % 3) * 0.02]} radius={0.2 + (i % 3) * 0.05} color={["#3f9a50", "#52ae5f", "#2f8a42"][i % 3]} rough={0.9} />
      ))}
      <group position={[-4.6, 1.9, 0.2]}>
        <Cap a={[0, 0, 0]} b={[0, 0.25, 0.25]} r={0.02} color="#2a2d33" ink={0} />
        <Cyl r={0.12} r2={0.07} h={0.18} position={[0, 0.3, 0.28]} color="#fff3c8" emissive="#ffd27a" k={0.5} />
      </group>
      <Motes center={[0, 1.4, -1.2]} size={[1.6, 1.4, 1.8]} f={f} count={24} />
      {/* trees in front of the block, for depth and parallax, and power lines */}
      {[[-7.4, 10], [7.2, 12], [-10.5, 15]].map(([x, z], i) => (
        <group key={i} position={[x, -9.4, z]}>
          <Cyl r={0.25} r2={0.18} h={7.6} position={[0, 3.8, 0]} color="#7a5a3a" rough={1} />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <Ball key={k} position={[Math.cos(k * 1.1) * 1.4, 7.4 + (k % 3) * 1.1, Math.sin(k * 1.1) * 1.2]} radius={1.9 + (k % 2) * 0.4} color={["#4f9f58", "#3f8f4a", "#5cb86a"][k % 3]} rough={1} />
          ))}
        </group>
      ))}
      <Cable a={[-12, 6.1, 17]} b={[12, 6.6, 17]} sag={0.7} />
      <Cable a={[-12, 5.7, 17]} b={[12, 6.2, 17]} sag={0.7} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -9.5, 9]} receiveShadow>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial color="#6b7380" roughness={0.9} />
      </mesh>
      <LightShaft from={[-1.5, 3.2, 3]} to={[1.2, 0.2, 0.2]} width={1.3} color="#fff2c0" opacity={0.1} />
      {children}
    </>
  );
};

// ---------- the glass café on the corner lot ----------

// The café carries its own coordinates: StreetSet (without house 20 and the corner) is the ground, sky and neighbours.
export const CAFE = { x: 21, front: -2.3, doorX: 21, doorW: 1.1, glassH: 2.75 };

const glassSheen = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    const g = ctx.createLinearGradient(0, 256, 256, 0);
    g.addColorStop(0.2, "rgba(255,255,255,0)");
    g.addColorStop(0.3, "rgba(255,255,255,0.9)");
    g.addColorStop(0.38, "rgba(255,255,255,0)");
    g.addColorStop(0.52, "rgba(255,255,255,0)");
    g.addColorStop(0.58, "rgba(255,255,255,0.55)");
    g.addColorStop(0.63, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
  });

const tilesTex = () =>
  canvasTexture(128, 128, (ctx) => {
    ctx.fillStyle = "#e6dcc8";
    ctx.fillRect(0, 0, 128, 128);
    ctx.strokeStyle = "#c4b8a0";
    ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, 128, 128);
    ctx.strokeRect(0, 0, 64, 64);
    ctx.strokeRect(64, 64, 64, 64);
  });

const signTex = () =>
  canvasTexture(512, 96, (ctx) => {
    ctx.fillStyle = "#1f4a3e";
    ctx.fillRect(0, 0, 512, 96);
    ctx.fillStyle = "#fff0d0";
    ctx.font = `900 56px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("COFFEE & BAKES", 256, 52);
    ctx.strokeStyle = "#f2c12e";
    ctx.lineWidth = 5;
    ctx.strokeRect(10, 10, 492, 76);
  });

const doorTex = () =>
  canvasTexture(512, 192, (ctx) => {
    ctx.clearRect(0, 0, 512, 192);
    ctx.fillStyle = "rgba(255,255,255,0.88)";
    ctx.fillRect(0, 0, 512, 192);
    ctx.fillStyle = "#161212";
    ctx.font = `900 150px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("DOOR", 256, 104);
  });

const stripeTex = () =>
  canvasTexture(128, 32, (ctx) => {
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = i % 2 ? "#fff0d0" : "#d23b33";
      ctx.fillRect(i * 16, 0, 16, 32);
    }
  });

// Frame the glass door: black steel frame, bar pull, push bar, closer arm, OPEN sign on a chain, bell, frosted DOOR vinyl.
const GlassDoor: React.FC<{ f: number; sheen: number; smudge: number; hit: number; vinyl: boolean; crack: number }> = ({ f, sheen, smudge, hit, vinyl, crack }) => {
  const sh = useOwnedTex(glassSheen);
  const dv = useOwnedTex(doorTex);
  const W = CAFE.doorW;
  const H = 2.2;
  const wob = hit * Math.sin(f * 1.3) * 0.012;
  return (
    <group position={[CAFE.doorX, 0, CAFE.front]} rotation={[0, wob, 0]}>
      {/* frame */}
      <RBox size={[W + 0.2, 0.1, 0.12]} position={[0, H + 0.05, 0]} color="#1e2124" radius={0.02} />
      {[-1, 1].map((s) => (
        <RBox key={s} size={[0.1, H, 0.12]} position={[s * (W / 2 + 0.05), H / 2, 0]} color="#1e2124" radius={0.02} />
      ))}
      <RBox size={[W, 0.2, 0.09]} position={[0, 0.1, 0]} color="#1e2124" radius={0.02} />
      <group userData={{ ghost: true }}>
        <mesh position={[0, H / 2 + 0.1, 0.0]}>
          <planeGeometry args={[W - 0.02, H - 0.2]} />
          <meshStandardMaterial color="#bfe0f0" transparent opacity={0.16} roughness={0.05} metalness={0.3} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, H / 2 + 0.1, 0.012]}>
          <planeGeometry args={[W - 0.02, H - 0.2]} />
          <meshBasicMaterial map={sh} transparent opacity={sheen} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
        {vinyl && (
          <mesh position={[0, 1.48, 0.016]}>
            <planeGeometry args={[W - 0.06, 0.4]} />
            <meshBasicMaterial map={dv} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        )}
        <GlassCrack position={[0, 1.12, 0.022]} t={crack} size={0.42} />
        {smudge > 0 && (
          <group position={[0, 1.32, 0.02]}>
            <Ball position={[0, 0, 0]} radius={0.2} color="#ffffff" opacity={0.3 * smudge} scale={[1, 1.2, 0.02]} rough={0.9} />
            <Ball position={[0, 0.02, 0.003]} radius={0.05} color="#ffe2d0" opacity={0.5 * smudge} scale={[1, 1.1, 0.04]} rough={0.9} />
          </group>
        )}
      </group>
      {/* hardware: vertical bar pull outside, push bar inside, closer arm, bell */}
      <Cyl r={0.018} h={0.55} position={[W / 2 - 0.04, 0.78, 0.12]} color="#c9ced6" rough={0.2} />
      <Cyl r={0.018} h={0.9} position={[0, 1.0, -0.12]} rotation={[0, 0, Math.PI / 2]} color="#c9ced6" rough={0.2} />
      <RBox size={[0.4, 0.04, 0.04]} position={[W / 2 - 0.25, H + 0.12, -0.05]} color="#2a2d33" radius={0.01} />
      {/* OPEN sign on a chain, swinging */}
      <group position={[-0.1, 1.95, 0.035]} rotation={[0, 0, Math.sin(f * 0.14) * 0.05 + hit * Math.sin(f * 1.0) * 0.2]}>
        <Cap a={[0, 0, 0]} b={[0, -0.12, 0]} r={0.004} color="#2a2d33" ink={0} />
        <RBox size={[0.34, 0.14, 0.02]} position={[0, -0.2, 0]} color="#d23b33" radius={0.02} />
        <RBox size={[0.28, 0.08, 0.004]} position={[0, -0.2, 0.012]} color="#fff6ea" radius={0.01} />
      </group>
    </group>
  );
};

// The café on the lot where house x = 20 stood: tiled forecourt, brick-cream front with a fascia sign, striped awning,
// a glazed front (two windows and the door, all black steel), the warm interior seen through the glass, A-frame, planters.
export const CafeFront: React.FC<{ f: number; sheen?: number; smudge?: number; hit?: number; vinyl?: boolean; lights?: number; crack?: number }> = ({ f, sheen = 0.28, smudge = 0, hit = 0, vinyl = true, lights = 1, crack = 0 }) => {
  const tiles = useOwnedTex(() => {
    const t = tilesTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 3);
    return t;
  });
  const sign = useOwnedTex(signTex);
  const stripe = useOwnedTex(() => {
    const t = stripeTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
  });
  const sh = useOwnedTex(glassSheen);
  const floor = useOwnedTex(() =>
    canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = "#9a6a43";
      ctx.fillRect(0, 0, 128, 128);
      ctx.strokeStyle = "#7c5230";
      ctx.lineWidth = 3;
      for (let y = 0; y < 128; y += 32) ctx.strokeRect(0, y, 128, 32);
    }),
  );
  const fx = CAFE.x;
  const z0 = CAFE.front;
  const back = z0 - 4.6;
  const gh = CAFE.glassH;
  const dw = CAFE.doorW;
  // glass window panes either side of the door
  const winL = { x0: fx - 4.1, x1: fx - dw / 2 - 0.1 };
  const winR = { x0: fx + dw / 2 + 0.1, x1: fx + 4.1 };
  const pendant = (x: number, z: number, k: number) => (
    <group key={k} position={[x, 0, z]}>
      <Cap a={[0, 3.5, 0]} b={[0, 2.5, 0]} r={0.008} color="#2a2d33" ink={0} />
      <Cyl r={0.2} r2={0.07} h={0.2} position={[0, 2.4, 0]} color="#f2c12e" />
      <Ball position={[0, 2.3, 0]} radius={0.08} color={new THREE.Color("#ffe2a0").multiplyScalar(1.8 * lights).getStyle()} glow />
    </group>
  );
  return (
    <group>
      {/* forecourt tiles over the lawn strip */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[fx, 0.03, (z0 - 0.62) / 2 - 0.05]} receiveShadow>
        <planeGeometry args={[9.0, Math.abs(z0) - 0.58]} />
        <meshStandardMaterial map={tiles} roughness={0.7} />
      </mesh>
      {/* building shell: side walls, back wall, roof, front piers, stall risers, header */}
      <RBox size={[0.3, 4.2, 4.8]} position={[fx - 4.5, 2.1, z0 - 2.4]} color="#e8c9a3" radius={0.08} rough={0.9} />
      <RBox size={[0.3, 4.2, 4.8]} position={[fx + 4.5, 2.1, z0 - 2.4]} color="#e8c9a3" radius={0.08} rough={0.9} />
      <RBox size={[9.3, 4.2, 0.3]} position={[fx, 2.1, back]} color="#e0bf96" radius={0.06} rough={0.9} />
      <RBox size={[9.3, 0.3, 4.9]} position={[fx, 4.2, z0 - 2.4]} color="#d8b88e" radius={0.08} rough={0.9} />
      <RBox size={[9.4, 0.12, 5.0]} position={[fx, 4.4, z0 - 2.4]} color="#fffaf0" radius={0.05} />
      <RBox size={[0.5, gh + 0.1, 0.35]} position={[fx - 4.35, (gh + 0.1) / 2, z0]} color="#d9ab7a" radius={0.06} rough={0.9} />
      <RBox size={[0.5, gh + 0.1, 0.35]} position={[fx + 4.35, (gh + 0.1) / 2, z0]} color="#d9ab7a" radius={0.06} rough={0.9} />
      <RBox size={[9.3, 4.2 - gh, 0.35]} position={[fx, gh + (4.2 - gh) / 2, z0]} color="#e8c9a3" radius={0.06} rough={0.9} />
      {[winL, winR].map((w, i) => (
        <RBox key={i} size={[w.x1 - w.x0, 0.5, 0.3]} position={[(w.x0 + w.x1) / 2, 0.25, z0]} color="#2f3a46" radius={0.05} rough={0.7} />
      ))}
      {/* fascia sign and a hanging blade sign */}
      <mesh position={[fx, gh + 0.55, z0 + 0.19]}>
        <planeGeometry args={[4.6, 0.86]} />
        <meshStandardMaterial map={sign} roughness={0.6} />
      </mesh>
      <group position={[fx + 3.7, 2.9, z0 + 0.35]} rotation={[0, 0, 0.06 * Math.sin(f * 0.07)]}>
        <Cap a={[0, 0.4, 0]} b={[0, 0.15, 0]} r={0.008} color="#2a2d33" ink={0} />
        <RBox size={[0.5, 0.5, 0.05]} position={[0, -0.12, 0]} color="#fff0d0" radius={0.05} />
        <Cyl r={0.12} r2={0.1} h={0.2} position={[0, -0.12, 0.04]} rotation={[Math.PI / 2, 0, 0]} color="#d8643a" />
      </group>
      {/* striped awning over both windows */}
      {[winL, winR].map((w, i) => (
        <group key={i} position={[(w.x0 + w.x1) / 2, gh - 0.1, z0 + 0.5]} rotation={[0.38, 0, 0]}>
          <mesh>
            <boxGeometry args={[w.x1 - w.x0 + 0.1, 0.05, 1.1]} />
            <meshStandardMaterial map={stripe} roughness={0.8} />
          </mesh>
          <RBox size={[w.x1 - w.x0 + 0.1, 0.18, 0.04]} position={[0, -0.08, 0.55]} color="#d23b33" radius={0.02} />
        </group>
      ))}
      {/* glass panes with black steel frames and the sheen */}
      {[winL, winR].map((w, i) => {
        const cx = (w.x0 + w.x1) / 2;
        const ww = w.x1 - w.x0;
        return (
          <group key={i} position={[cx, 0, z0]}>
            <group userData={{ ghost: true }}>
              <mesh position={[0, 0.5 + (gh - 0.5) / 2, 0]}>
                <planeGeometry args={[ww, gh - 0.5]} />
                <meshStandardMaterial color="#bfe0f0" transparent opacity={0.14} roughness={0.05} metalness={0.3} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
              <mesh position={[0, 0.5 + (gh - 0.5) / 2, 0.012]}>
                <planeGeometry args={[ww, gh - 0.5]} />
                <meshBasicMaterial map={sh} transparent opacity={sheen} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
              </mesh>
            </group>
            {[0, 1, 2].map((k) => (
              <RBox key={k} size={[0.06, gh - 0.5, 0.08]} position={[-ww / 2 + (ww * k) / 2, 0.5 + (gh - 0.5) / 2, 0]} color="#1e2124" radius={0.015} />
            ))}
            <RBox size={[ww, 0.07, 0.08]} position={[0, 0.54, 0]} color="#1e2124" radius={0.015} />
            <RBox size={[ww, 0.07, 0.08]} position={[0, gh - 0.02, 0]} color="#1e2124" radius={0.015} />
            <RBox size={[ww, 0.05, 0.08]} position={[0, 1.55, 0]} color="#1e2124" radius={0.01} />
          </group>
        );
      })}
      <GlassDoor f={f} sheen={sheen} smudge={smudge} hit={hit} vinyl={vinyl} crack={crack} />
      {/* interior: wood floor, counter with espresso machine, shelves with cups, pendants, little tables */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[fx, 0.04, z0 - 2.3]} receiveShadow>
        <planeGeometry args={[8.7, 4.5]} />
        <meshStandardMaterial map={floor} roughness={0.6} />
      </mesh>
      <RBox size={[5.2, 1.05, 0.7]} position={[fx, 0.55, back + 1.1]} color="#8a5a34" radius={0.06} />
      <RBox size={[5.3, 0.06, 0.8]} position={[fx, 1.1, back + 1.1]} color="#f2e6d0" radius={0.02} />
      <RBox size={[0.9, 0.6, 0.5]} position={[fx - 1.3, 1.43, back + 1.1]} color="#c9ced6" radius={0.06} rough={0.25} />
      <Cyl r={0.12} h={0.12} position={[fx - 1.3, 1.78, back + 1.1]} color="#2a2d33" />
      <CoffeeMug position={[fx + 0.4, 1.13, back + 1.0]} scale={1.2} />
      <CoffeeMug position={[fx + 0.8, 1.13, back + 1.05]} scale={1.2} />
      <RBox size={[0.6, 0.3, 0.3]} position={[fx + 1.8, 1.28, back + 1.1]} color="#ffd9a8" radius={0.12} />
      <RBox size={[4.6, 0.05, 0.3]} position={[fx, 2.2, back + 0.3]} color="#7a4b2f" radius={0.015} />
      <RBox size={[4.6, 0.05, 0.3]} position={[fx, 1.7, back + 0.3]} color="#7a4b2f" radius={0.015} />
      {Array.from({ length: 12 }, (_, i) => (
        <Cyl key={i} r={0.05} r2={0.04} h={0.09} position={[fx - 2.1 + i * 0.38, 2.27, back + 0.3]} color={["#fff6ea", "#ff7a6a", "#4fb3a6", "#f2c84a"][i % 4]} />
      ))}
      <RBox size={[1.7, 1.0, 0.05]} position={[fx + 2.7, 2.0, back + 0.2]} color="#25302c" radius={0.03} />
      {[fx - 2.8, fx - 1.2, fx + 1.2, fx + 2.8].map((x, i) => (
        <group key={i} position={[x, 0.04, z0 - 1.5 - (i % 2) * 0.5]}>
          <Cyl r={0.33} h={0.04} position={[0, 0.72, 0]} color="#f6efe4" />
          <Cyl r={0.04} h={0.7} position={[0, 0.35, 0]} color="#2a2d33" />
          <CoffeeMug position={[0.05, 0.74, 0.03]} scale={1.1} />
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.5, 0, 0.05]}>
              <Cyl r={0.19} h={0.04} position={[0, 0.45, 0]} color={["#d23b33", "#4fb3a6"][(i + (s > 0 ? 1 : 0)) % 2]} />
              {[0, 1, 2, 3].map((k) => (
                <Cyl key={k} r={0.012} h={0.45} position={[Math.cos(k * 1.57 + 0.8) * 0.14, 0.22, Math.sin(k * 1.57 + 0.8) * 0.14]} color="#2a2d33" />
              ))}
            </group>
          ))}
        </group>
      ))}
      {[fx - 2.4, fx, fx + 2.4].map((x, k) => pendant(x, z0 - 1.6 - (k % 2) * 1.0, k))}
      <pointLight position={[fx, 2.2, z0 - 2.2]} intensity={1.6 * lights} distance={7} color="#ffcf8a" />
      <pointLight position={[fx - 2.6, 1.6, z0 - 1.6]} intensity={0.9 * lights} distance={5} color="#ffe2b0" />
      {/* outside dressing: A-frame chalk sign, planters, a bench */}
      <group position={[fx - 3.0, 0.03, z0 + 0.85]} rotation={[0, 0.25, 0]}>
        {[-1, 1].map((s) => (
          <RBox key={s} size={[0.55, 0.9, 0.04]} position={[0, 0.45, s * 0.14]} rotation={[-s * 0.2, 0, 0]} color="#25302c" radius={0.02} />
        ))}
        <RBox size={[0.45, 0.05, 0.05]} position={[0, 0.7, 0.18]} rotation={[-0.2, 0, 0]} color="#f2e6d0" radius={0.01} />
        <RBox size={[0.34, 0.05, 0.05]} position={[0, 0.58, 0.19]} rotation={[-0.2, 0, 0]} color="#f2e6d0" radius={0.01} />
        <RBox size={[0.4, 0.05, 0.05]} position={[0, 0.46, 0.2]} rotation={[-0.2, 0, 0]} color="#f2c84a" radius={0.01} />
      </group>
      {[fx - 3.9, fx + 3.9].map((x, i) => (
        <group key={i} position={[x, 0.03, z0 + 0.5]}>
          <Cyl r={0.26} r2={0.2} h={0.5} position={[0, 0.25, 0]} color="#d8643a" />
          {[0, 1, 2, 3, 4, 5].map((k) => (
            <Ball key={k} position={[Math.cos(k * 1.05) * 0.18, 0.62 + (k % 2) * 0.12, Math.sin(k * 1.05) * 0.16]} radius={0.17} color={["#3f9a50", "#52ae5f"][k % 2]} rough={0.9} />
          ))}
        </group>
      ))}
      <group position={[fx + 2.9, 0.03, z0 + 0.75]}>
        <RBox size={[1.2, 0.07, 0.4]} position={[0, 0.45, 0]} color="#b8793a" radius={0.03} />
        {[-0.5, 0.5].map((x) => (
          <RBox key={x} size={[0.07, 0.42, 0.36]} position={[x, 0.21, 0]} color="#2a2d33" radius={0.02} />
        ))}
      </group>
      <Motes center={[fx, 1.5, z0 + 0.5]} size={[6, 2.2, 1.6]} f={f} count={26} />
    </group>
  );
};

// A streetlight puppet source for cafe shots: low morning sun, cool glass fill.
export const cafeLight = (): PuppetLight => ({
  tint: "#fff4e6",
  shadow: 0.14,
  distant: [{ direction: [-0.55, 0.55, 0.65], color: "#fff0d0", strength: 1.1 }],
});
