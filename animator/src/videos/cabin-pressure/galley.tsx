import React from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, PuppetLight, Vec3 } from "../../engine";
import { Cyl, RBox } from "../dog-nose/props";
import { Lights, Motes, useOwnedTex } from "../dog-nose/sets";
import { rnd } from "../pisces-sign/props";
import { GalleyCart, glowColor, RedLatch } from "./cockpitProps";

// The forward galley of "cabin-pressure" (guide/references/airliner-galley.md), puppet scale (a standing puppet's
// shoulders are 0.67 m up, so the worktop is at 0.6). Units across the back at z -0.85: a row of aluminium carts with
// red latches under the dark worktop, coffee makers and ovens above, lockers with black and red latches, a ceiling of
// strip lights with an oxygen drop box over the working area (GALLEY_DROP, door hanging open). Left: the attendant's
// jump seat folded up on the wall, a handset; right: the navy curtain to the cabin. Floor y = 0; Sofia stands at
// SOFIA_AT facing the camera. Steel grey, cool strip light, an amber caution light flashing for the emergency.

export const SOFIA_AT: [number, number] = [0, 0.05];
export const GALLEY_DROP: Vec3 = [0.3, 1.74, 0.14];
export const GALLEY_BACK = -0.85;
const CEIL = 1.78;

const steelTex = (base: string, seed: number) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 220; i++) {
      ctx.fillStyle = `rgba(${rnd(i + seed) > 0.5 ? "255,255,255" : "60,70,80"},${0.03 + rnd(i + seed + 2) * 0.05})`;
      ctx.fillRect(rnd(i + seed + 5) * 512, rnd(i + seed + 9) * 512, 60 + rnd(i + seed) * 160, 1 + rnd(i + seed + 1) * 2);
    }
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = "rgba(40,40,50,0.07)";
      ctx.beginPath();
      ctx.ellipse(rnd(i + seed + 40) * 512, rnd(i + seed + 50) * 512, 40, 12, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const floorTex = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#4a5266";
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.1)";
      ctx.fillRect(rnd(i + 1) * 512, rnd(i + 2) * 512, 3, 3);
    }
    ctx.strokeStyle = "rgba(20,24,34,0.4)";
    ctx.lineWidth = 4;
    for (let x = 0; x <= 512; x += 128) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 512);
      ctx.stroke();
    }
  });

// A steel oven or storage unit front: brushed face, a dark window or a handle, little green display.
const Unit: React.FC<{ position: Vec3; w: number; h: number; kind: "oven" | "box"; map: THREE.Texture }> = ({ position, w, h, kind, map }) => (
  <group position={position}>
    <RBox size={[w - 0.012, h - 0.012, 0.05]} color="#ffffff" map={map} radius={0.012} rough={0.4} />
    {kind === "oven" ? (
      <>
        <RBox size={[w * 0.6, h * 0.4, 0.01]} position={[0, -0.02, 0.026]} color="#1b1f25" radius={0.01} />
        <RBox size={[w * 0.5, 0.018, 0.02]} position={[0, h * 0.3, 0.03]} color="#7f868f" radius={0.006} />
        <mesh position={[w * 0.32, h * 0.38, 0.027]}>
          <planeGeometry args={[0.04, 0.018]} />
          <meshBasicMaterial color={glowColor("#46e08a", 1.3)} toneMapped={false} />
        </mesh>
      </>
    ) : (
      <>
        <Cyl r={0.018} h={0.016} position={[0, 0, 0.03]} rotation={[Math.PI / 2, 0, 0]} color="#1b1f25" />
        <RBox size={[w * 0.7, 0.012, 0.004]} position={[0, -h * 0.3, 0.027]} color="#f2d24a" radius={0.002} />
      </>
    )}
    <RedLatch position={[w / 2 - 0.03, h / 2 - 0.02, 0.035]} turn={0.15} />
  </group>
);

// The attendant jump seat, folded up against the wall: cushion up, harness straps hanging, headrest pad.
const JumpSeat: React.FC<{ position: Vec3; rotationY: number }> = ({ position, rotationY }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[0.46, 0.5, 0.05]} position={[0, 0.85, 0]} color="#5a6170" radius={0.03} rough={0.9} />
    <RBox size={[0.44, 0.4, 0.07]} position={[0, 0.42, 0.04]} color="#6b7282" radius={0.04} rough={0.9} />
    <RBox size={[0.3, 0.16, 0.06]} position={[0, 1.18, 0.02]} color="#5a6170" radius={0.03} rough={0.9} />
    {[-1, 1].map((s) => (
      <RBox key={s} size={[0.05, 0.5, 0.012]} position={[s * 0.12, 0.85, 0.035]} rotation={[0, 0, s * 0.12]} color="#a9adb3" radius={0.004} />
    ))}
    <RBox size={[0.08, 0.06, 0.02]} position={[0, 0.62, 0.045]} color="#c8ccd2" radius={0.008} />
    {/* the handset in its cradle beside it */}
    <RBox size={[0.08, 0.2, 0.05]} position={[0.34, 0.95, 0.02]} color="#d7dbe0" radius={0.02} />
    <RBox size={[0.05, 0.16, 0.04]} position={[0.34, 0.95, 0.05]} color="#2a2e34" radius={0.018} />
  </group>
);

// The galley's own drop box in the ceiling: the panel with its door hanging open.
export const DropBox: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <RBox size={[0.3, 0.05, 0.22]} position={[0, 0.02, 0]} color="#d9dde3" radius={0.012} />
    <RBox size={[0.24, 0.02, 0.16]} position={[0, -0.005, 0]} color="#3a3f46" radius={0.006} />
    <group position={[-0.15, -0.01, 0]} rotation={[0, 0, -1.2]}>
      <RBox size={[0.3, 0.018, 0.2]} position={[0.15, 0, 0]} color="#9aa1aa" radius={0.008} />
    </group>
  </group>
);

export const amberFlash = (f: number) => 0.55 + 0.45 * Math.max(0, Math.sin(f * 0.42)) ** 3;

export const galleyLight = (f: number): PuppetLight => ({
  tint: "#d8dee8",
  shadow: 0.14,
  distant: [{ direction: [0.15, 1, 0.55], color: "#f2f6ff", strength: 1.25 }],
  points: [{ position: [1.1, 1.5, 0.6], color: "#ffb000", strength: 0.9 * amberFlash(f), range: 2.2 }],
});

export const GalleySet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode }> = ({ camera, f, children }) => {
  const steel = useOwnedTex(() => steelTex("#c9ced4", 3));
  const steel2 = useOwnedTex(() => steelTex("#d7dbe0", 17));
  const wall = useOwnedTex(() => steelTex("#b9bfc7", 31));
  const floor = useOwnedTex(() => {
    const t = floorTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  });
  const Z = GALLEY_BACK;
  const amber = amberFlash(f);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#5a626e"]} />
      <fog attach="fog" args={["#8a93a0", 5, 14]} />
      <Lights camera={camera} sun={[0.6, 4, 2.5]} sunColor="#f2f6ff" sunK={1.35} sky="#e8eef8" ground="#5a6070" hemiK={0.85} ambient={0.3} box={3} />
      <pointLight position={[0, 1.5, 0.6]} intensity={0.8} distance={3} color="#eef4ff" />
      <pointLight position={[1.1, 1.5, 0.6]} intensity={1.4 * amber} distance={2.6} color="#ffb000" />
      {/* floor, side walls, ceiling with strip lights */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 1.4]} receiveShadow>
        <planeGeometry args={[3.2, 6]} />
        <meshStandardMaterial map={floor} roughness={0.9} />
      </mesh>
      <RBox size={[0.08, CEIL, 5.2]} position={[-1.5, CEIL / 2, 1.6]} color="#ffffff" map={wall} radius={0.02} />
      <RBox size={[3.2, 0.06, 5.6]} position={[0, CEIL + 0.03, 1.5]} color="#b9c0ca" radius={0.02} />
      {[-0.55, 0.55].map((x) => (
        <group key={x}>
          <mesh position={[x, CEIL - 0.003, 0.3]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.5, 0.07]} />
            <meshBasicMaterial color={glowColor("#f4f8ff", 1.2)} toneMapped={false} />
          </mesh>
          <Halo position={[x, CEIL - 0.03, 0.3]} size={0.5} color="#eef4ff" strength={0.12} />
        </group>
      ))}
      {/* amber caution light over the curtain */}
      <group position={[1.15, 1.55, 0.55]}>
        <RBox size={[0.16, 0.07, 0.05]} color="#2a2e34" radius={0.015} />
        <mesh position={[0, 0, 0.027]}>
          <planeGeometry args={[0.13, 0.045]} />
          <meshBasicMaterial color={glowColor("#ffb000", 0.6 + 1.6 * amber)} toneMapped={false} />
        </mesh>
        <Halo position={[0, 0, 0.04]} size={0.5} color="#ffb000" strength={0.4 * amber} />
      </group>

      {/* the back wall of units */}
      <RBox size={[3.0, CEIL, 0.06]} position={[0, CEIL / 2, Z - 0.45]} color="#ffffff" map={wall} radius={0.02} />
      {/* cart bays: carts slotted in under the worktop, a red latch at each bay */}
      {Array.from({ length: 7 }, (_, i) => {
        const x = -1.2 + i * 0.4;
        return (
          <group key={i}>
            <RBox size={[0.4, 0.6, 0.04]} position={[x, 0.3, Z - 0.42]} color="#3b4048" radius={0.01} />
            <GalleyCart position={[x, 0, Z - 0.18]} h={0.54} w={0.34} />
            <RedLatch position={[x + 0.18, 0.56, Z + 0.09]} turn={i % 3 === 1 ? 0.6 : 0.05} />
          </group>
        );
      })}
      {/* worktop with its rail, cups, a stack of trays, coffee makers */}
      <RBox size={[2.9, 0.05, 0.5]} position={[0, 0.6, Z - 0.17]} color="#3b4048" radius={0.015} rough={0.5} />
      <RBox size={[2.9, 0.03, 0.025]} position={[0, 0.645, Z + 0.07]} color="#9aa1aa" radius={0.01} />
      {[-0.9, -0.82, 0.62].map((x, i) => (
        <Cyl key={x} r={0.03} r2={0.035} h={0.07} position={[x, 0.66, Z - 0.1 + i * 0.03]} color="#f4f1ea" />
      ))}
      {[0, 1, 2].map((k) => (
        <RBox key={k} size={[0.3, 0.018, 0.22]} position={[0.95, 0.635 + k * 0.02, Z - 0.2]} rotation={[0, 0.05 * k, 0]} color={k % 2 ? "#e8e4d8" : "#d4cfc2"} radius={0.006} />
      ))}
      {[-0.35, 0.05].map((x) => (
        <group key={x} position={[x, 0.62, Z - 0.3]}>
          <RBox size={[0.26, 0.3, 0.2]} position={[0, 0.15, 0]} color="#ffffff" map={steel2} radius={0.02} />
          <Cyl r={0.06} r2={0.07} h={0.12} position={[0, 0.07, 0.1]} color="#2a2e34" rough={0.3} />
          <mesh position={[0.08, 0.24, 0.101]}>
            <planeGeometry args={[0.05, 0.02]} />
            <meshBasicMaterial color={glowColor("#ff6a3a", 1.4)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* ovens and storage units above, then lockers to the ceiling */}
      {Array.from({ length: 6 }, (_, i) => (
        <Unit key={`u${i}`} position={[-1.15 + i * 0.46, 1.08, Z - 0.38]} w={0.46} h={0.42} kind={i % 3 === 1 ? "box" : "oven"} map={i % 2 ? steel : steel2} />
      ))}
      {Array.from({ length: 6 }, (_, i) => (
        <Unit key={`l${i}`} position={[-1.15 + i * 0.46, 1.5, Z - 0.38]} w={0.46} h={0.4} kind="box" map={i % 2 ? steel2 : steel} />
      ))}
      {/* the jump seat folded up on a partition at the left end of the cart row */}
      <RBox size={[0.5, 1.5, 0.06]} position={[-0.72, 0.75, Z + 0.1]} color="#ffffff" map={wall} radius={0.02} />
      <JumpSeat position={[-0.72, 0, Z + 0.15]} rotationY={0} />
      {/* the curtain to the cabin on the right: navy folds on a rail, the cream cabin glimpsed past it */}
      <Cyl r={0.012} h={1.6} position={[1.25, CEIL - 0.06, 0.6]} rotation={[Math.PI / 2, 0, 0]} color="#c8ccd2" />
      {Array.from({ length: 7 }, (_, i) => (
        <RBox key={`c${i}`} size={[0.06, CEIL - 0.1, 0.16]} position={[1.25 + (i % 2) * 0.03, (CEIL - 0.1) / 2, -0.05 + i * 0.13 + Math.sin(f * 0.07 + i) * 0.006]} color={i % 2 ? "#2a3a6e" : "#33447a"} radius={0.03} rough={0.95} />
      ))}
      <RBox size={[0.06, CEIL, 1.6]} position={[1.6, CEIL / 2, 2.1]} color="#efe7d6" radius={0.02} />
      <DropBox position={GALLEY_DROP} />
      <Motes center={[0.1, 1.1, 0.3]} size={[1.4, 1.2, 1.2]} f={f} count={35} color="#f4f8ff" r={0.005} />
      {children}
    </>
  );
};
