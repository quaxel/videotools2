import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Halo, PuppetLight, PuppetPlacement } from "../../engine";
import { rnd } from "../pisces-sign/props";
import { Ball, Cyl, RBox } from "../dog-nose/props";
import { LightShaft, Lights, useOwnedTex } from "../dog-nose/sets";

// The airliner cabin of "cabin-pressure" (guide/references/airliner-cabin.md) in the Pixar look: rounded, softly
// shaded forms, warm bounce light, light shafts from the left windows, haze, painted wear on every big surface.

type Vec3 = [number, number, number];

// The cabin runs along -z, away from a camera standing in the front galley. Seats face +z (toward the camera), so
// the passengers face it too. Puppet scale: a seated puppet's head centre is about 0.98 m up (top ~1.25 m).
export const R = 2.1; // radius of the cabin tube
export const CY = -0.1; // height of its axis (below the floor: the tube is cut by it)
export const AISLE = 0.27; // half width of the aisle
export const SEAT_W = 0.5; // wider than a seated puppet's big head, so the back shows round it
export const PITCH = 0.82;
export const ROW0 = 1.15; // z of the first row's seat
export const ROWS = 9;
export const BIN_Y = 1.45; // underside of the overhead bins, well above the seated heads (as in a real cabin)
export const CEIL = 1.86; // the lowered ceiling over the aisle
export const BIN_IN = 0.6; // inner (aisle-side) edge of the bins and the service units under them
export const PSU_Y = BIN_Y - 0.045; // underside of the passenger service unit (mask doors, reading lights)
export const seatX = (side: number, k: number) => side * (AISLE + SEAT_W / 2 + k * (SEAT_W + 0.02)); // k 0 aisle .. 2 window
export const rowZ = (r: number) => ROW0 - r * PITCH;
export const wallX = (y: number) => Math.sqrt(R * R - (y - CY) * (y - CY));
const FRONT = 4.5; // the shell runs from here (behind the galley camera) aft
const LEN = 15;
const AFT = FRONT - LEN + 0.3; // the aft bulkhead

export const C = {
  wall: "#efe7d6",
  bin: "#f6f3ec",
  psu: "#d9dde3",
  seat: "#2b4a8c",
  seatDark: "#1f3466",
  cover: "#e3e7ec",
  carpet: "#56607a",
  mask: "#f3c623",
  tube: "#d8eef5",
  tray: "#a3abb8",
  metal: "#6c727d",
  arm: "#2a3458",
};
const FONT = "'Arial Black', Impact, sans-serif";
const glowStyle = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k);

// ---------- painted textures (stains, scuffs, wear: never a spotless flat fill) ----------

// Carpet: blue-grey with a small woven diamond, darker traffic wear and a few stains.
const carpetTex = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 16)
      for (let x = 0; x < 512; x += 16) {
        ctx.fillStyle = (x + y) % 32 ? "rgba(40,60,110,0.12)" : "rgba(255,255,255,0.06)";
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 2);
        ctx.lineTo(x + 14, y + 8);
        ctx.lineTo(x + 8, y + 14);
        ctx.lineTo(x + 2, y + 8);
        ctx.fill();
      }
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(10,20,40,0.07)";
      ctx.fillRect(rnd(i + 1) * 512, rnd(i + 2) * 512, 2, 2);
    }
    for (let i = 0; i < 9; i++) {
      ctx.fillStyle = `rgba(30,25,20,${0.06 + rnd(i + 30) * 0.08})`;
      ctx.beginPath();
      ctx.ellipse(rnd(i + 40) * 512, rnd(i + 50) * 512, 14 + rnd(i) * 30, 9 + rnd(i + 3) * 16, rnd(i + 5) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// The aisle runner: a deeper blue band with a cream border stripe and a worn, lighter path down its middle.
const runnerTex = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#3d4a72";
    ctx.fillRect(0, 0, 256, 512);
    const wear = ctx.createLinearGradient(0, 0, 256, 0);
    wear.addColorStop(0, "rgba(255,255,255,0)");
    wear.addColorStop(0.5, "rgba(190,200,225,0.22)");
    wear.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = wear;
    ctx.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 32)
      for (let x = 36; x < 220; x += 32) {
        ctx.fillStyle = "rgba(230,200,140,0.16)";
        ctx.beginPath();
        ctx.arc(x + ((y / 32) % 2) * 16, y + 16, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    ctx.fillStyle = "#d8c49a";
    ctx.fillRect(10, 0, 8, 512);
    ctx.fillRect(238, 0, 8, 512);
    ctx.fillStyle = "rgba(20,20,30,0.35)";
    ctx.fillRect(0, 0, 6, 512);
    ctx.fillRect(250, 0, 6, 512);
    for (let i = 0; i < 2500; i++) {
      ctx.fillStyle = rnd(i + 7) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.08)";
      ctx.fillRect(rnd(i + 8) * 256, rnd(i + 9) * 512, 2, 2);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(20,15,10,0.12)";
      ctx.beginPath();
      ctx.ellipse(90 + rnd(i + 60) * 80, rnd(i + 61) * 512, 16, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Sidewall, painted from the floor (canvas x = 0) round to the ceiling edge (x = 512) over one window pitch (y):
// a dark kick strip with air-return slots, the scuffed lower lining, a trim line, the window belt with hand smudges
// round the window, and a soft gradient lighter toward the top; a panel seam at every pitch.
const wallTex = () =>
  canvasTexture(512, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, "#d9cfbd");
    g.addColorStop(0.3, "#e6dcc9");
    g.addColorStop(0.6, "#f2ebdd");
    g.addColorStop(1, "#faf6ee");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = "#5f6577";
    ctx.fillRect(0, 0, 26, 256);
    for (let y = 20; y < 256; y += 40) {
      ctx.fillStyle = "#2c3040";
      ctx.fillRect(8, y, 10, 22);
    }
    ctx.fillStyle = "rgba(150,135,110,0.55)";
    ctx.fillRect(122, 0, 4, 256);
    for (let i = 0; i < 26; i++) {
      ctx.strokeStyle = `rgba(90,80,70,${0.08 + rnd(i) * 0.1})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const x = 30 + rnd(i + 2) * 80;
      const y = rnd(i + 3) * 256;
      ctx.moveTo(x, y);
      ctx.lineTo(x + 6 + rnd(i) * 14, y + (rnd(i + 4) - 0.5) * 30);
      ctx.stroke();
    }
    // window reveal shadow and smudges round it (the window sits at the middle of the pitch)
    const w = ctx.createRadialGradient(232, 128, 20, 232, 128, 110);
    w.addColorStop(0, "rgba(120,105,85,0.18)");
    w.addColorStop(1, "rgba(120,105,85,0)");
    ctx.fillStyle = w;
    ctx.fillRect(120, 10, 230, 236);
    for (let i = 0; i < 7; i++) {
      ctx.fillStyle = "rgba(110,95,80,0.07)";
      ctx.beginPath();
      ctx.ellipse(190 + rnd(i + 20) * 90, 70 + rnd(i + 21) * 120, 10, 6, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(120,110,90,0.28)";
    ctx.fillRect(0, 0, 512, 3);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(120,110,90,0.05)";
      ctx.fillRect(rnd(i + 70) * 512, rnd(i + 71) * 256, 18, 2);
    }
  });

// Bin doors and service units: off-white with a soft gradient, a seam, scuffs round the latch.
const binTex = () =>
  canvasTexture(256, 256, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, "#fbf9f4");
    g.addColorStop(1, "#e9e4da");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(120,110,95,0.35)";
    ctx.fillRect(0, 0, 3, 256);
    ctx.fillRect(253, 0, 3, 256);
    for (let i = 0; i < 18; i++) {
      ctx.strokeStyle = `rgba(100,90,80,${0.06 + rnd(i + 90) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const x = 100 + rnd(i + 91) * 60;
      const y = 150 + rnd(i + 92) * 100;
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd(i) - 0.5) * 30, y + rnd(i + 1) * 12);
      ctx.stroke();
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = "rgba(110,100,85,0.06)";
      ctx.beginPath();
      ctx.ellipse(rnd(i + 95) * 256, 180 + rnd(i + 96) * 60, 16, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Seat fabric: navy with a fine weave, a small lighter diamond and paler pilled wear on the edges.
const fabricTex = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#2a477f";
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 4) {
      ctx.fillStyle = y % 8 ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.06)";
      ctx.fillRect(0, y, 256, 2);
    }
    for (let y = 0; y < 256; y += 32)
      for (let x = 0; x < 256; x += 32) {
        ctx.fillStyle = "rgba(120,150,210,0.18)";
        const cx = x + 16 + ((y / 32) % 2) * 16;
        ctx.beginPath();
        ctx.moveTo(cx, y + 9);
        ctx.lineTo(cx + 5, y + 16);
        ctx.lineTo(cx, y + 23);
        ctx.lineTo(cx - 5, y + 16);
        ctx.fill();
      }
    const edge = ctx.createRadialGradient(128, 128, 70, 128, 128, 182);
    edge.addColorStop(0, "rgba(160,180,220,0)");
    edge.addColorStop(1, "rgba(160,180,220,0.22)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = rnd(i + 300) > 0.5 ? "rgba(200,215,240,0.10)" : "rgba(5,10,30,0.12)";
      ctx.fillRect(rnd(i + 301) * 256, rnd(i + 302) * 256, 2, 2);
    }
  });

// A soft round spot, white in the middle fading to nothing (light pools).
const radialTex = () =>
  canvasTexture(128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.5, "rgba(255,255,255,0.45)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });

// One texture holder per CabinSet mount, shared by every seat, bin and panel through context.
type CabinTextures = { fabric: THREE.Texture; bin: THREE.Texture };
const TexCtx = React.createContext<CabinTextures | null>(null);

// ---------- the shell ----------

// One sidewall as an arc from the floor up to the ceiling edge, along the whole cabin, normals facing in. UV: u from
// the floor (0) to the ceiling (1), v one unit per window pitch with the window at v = 0.5.
const sidewallGeometry = (side: number) => {
  const a0 = Math.acos((CY - 0) / R); // angle from straight down to the floor line
  const a1 = Math.acos((CY - CEIL) / R);
  const nu = 24;
  const nz = 60;
  const pos: number[] = [];
  const uv: number[] = [];
  const nrm: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= nu; i++) {
    const a = a0 + ((a1 - a0) * i) / nu; // a: angle from the downward axis
    const x = side * R * Math.sin(a);
    const y = CY - R * Math.cos(a);
    for (let j = 0; j <= nz; j++) {
      const z = FRONT - (LEN * j) / nz;
      pos.push(x, y, z);
      nrm.push(-side * Math.sin(a), Math.cos(a), 0);
      uv.push(i / nu, (z - (ROW0 + 0.1)) / PITCH + 0.5);
    }
  }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nz; j++) {
      const a = i * (nz + 1) + j;
      const b = a + nz + 1;
      if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1);
      else idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
};

const Sidewall: React.FC<{ side: number; tex: THREE.Texture }> = ({ side, tex }) => {
  const geo = useMemo(() => sidewallGeometry(side), [side]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial map={tex} roughness={0.85} emissive="#f2e8d4" emissiveIntensity={0.18} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A lit sign: dark housing, glowing text (EXIT in red, the seat-belt signs in warm white).
const SignFace: React.FC<{ text: string; w: number; h: number; color: string; k?: number; arrows?: boolean }> = ({ text, w, h, color, k = 1.6, arrows }) => {
  const tex = useOwnedTex(
    () =>
      canvasTexture(256, Math.round((256 * h) / w), (ctx) => {
        const H = ctx.canvas.height;
        ctx.fillStyle = "#000000";
        ctx.fillRect(0, 0, 256, H);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 ${Math.round(H * 0.62)}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, 128, H * 0.54);
        if (arrows) {
          ctx.beginPath();
          ctx.moveTo(10, H / 2);
          ctx.lineTo(34, H * 0.22);
          ctx.lineTo(34, H * 0.78);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(246, H / 2);
          ctx.lineTo(222, H * 0.22);
          ctx.lineTo(222, H * 0.78);
          ctx.fill();
        }
      }),
    [text, w, h, arrows],
  );
  return (
    <mesh>
      <planeGeometry args={[w, h]} />
      <meshBasicMaterial map={tex} color={glowStyle(color, k)} toneMapped={false} />
    </mesh>
  );
};

export const ExitSign: React.FC<{ position: Vec3; rotationY?: number; arrows?: boolean; scale?: number }> = ({ position, rotationY = 0, arrows, scale = 1 }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
    <RBox size={[0.34, 0.12, 0.05]} color="#3a3d46" radius={0.02} />
    <group position={[0, 0, 0.026]}>
      <SignFace text="EXIT" w={0.3} h={0.09} color="#ff3a2a" k={1.5} arrows={arrows} />
    </group>
  </group>
);

// The cabin shell: carpet and aisle runner, both painted sidewalls, the lowered ceiling with its light strips and
// signs, the aft bulkhead with a galley curtain and an exit sign.
export const Shell: React.FC<{ strip?: string; stripK?: number }> = ({ strip = "#fff3da", stripK = 1.5 }) => {
  const carpet = useOwnedTex(() => {
    const t = carpetTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(4, 26);
    return t;
  });
  const runner = useOwnedTex(() => {
    const t = runnerTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 18);
    return t;
  });
  const wall = useOwnedTex(() => {
    const t = wallTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const ceil = useOwnedTex(() => {
    const t = binTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const zc = FRONT - LEN / 2;
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zc]} receiveShadow>
        <planeGeometry args={[2 * wallX(0), LEN]} />
        <meshStandardMaterial color="#8590ab" map={carpet} roughness={0.95} />
      </mesh>
      {/* the aisle runner */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, zc]} receiveShadow>
        <planeGeometry args={[AISLE * 2 - 0.02, LEN]} />
        <meshStandardMaterial map={runner} roughness={0.95} />
      </mesh>
      <Sidewall side={-1} tex={wall} />
      <Sidewall side={1} tex={wall} />
      {/* the lowered ceiling over the aisle: a panel per row with a seam, light strips along both edges */}
      {Array.from({ length: 16 }, (_, i) => (
        <RBox key={`c${i}`} size={[1.5, 0.05, PITCH - 0.015]} position={[0, CEIL, ROW0 + 2.4 - i * PITCH]} color="#efe9de" map={ceil} radius={0.02} emissive="#f2e8d4" k={0.05} />
      ))}
      {[-1, 1].map((sd) => (
        <group key={`l${sd}`}>
          <mesh position={[sd * 0.68, CEIL - 0.033, zc]}>
            <boxGeometry args={[0.06, 0.012, LEN - 1]} />
            <meshBasicMaterial color={glowStyle(strip, stripK)} toneMapped={false} />
          </mesh>
          {/* the strip's soft spill on the ceiling */}
          <mesh position={[sd * 0.6, CEIL - 0.03, zc]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.3, LEN - 1]} />
            <meshBasicMaterial color={strip} transparent opacity={0.1} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* the over-wing exit signs hanging from the ceiling, facing forward */}
      {[-2.55, -6.6].map((z) => (
        <group key={`x${z}`}>
          <RBox size={[0.03, 0.06, 0.03]} position={[0, CEIL - 0.05, z]} color="#9aa0aa" radius={0.01} />
          <ExitSign position={[0, CEIL - 0.13, z]} arrows />
        </group>
      ))}
      {/* aft bulkhead: lavatory and galley walls with a curtain gap, an exit sign over it */}
      <RBox size={[3.6, 2.4, 0.08]} position={[0, 1.0, AFT]} color="#e2d8c4" map={ceil} radius={0.03} />
      <RBox size={[0.74, 1.6, 0.06]} position={[0, 0.8, AFT + 0.06]} color="#3b4f86" radius={0.03} />
      {Array.from({ length: 5 }, (_, i) => (
        <RBox key={`f${i}`} size={[0.06, 1.56, 0.03]} position={[-0.28 + i * 0.14, 0.8, AFT + 0.1]} color="#33457a" radius={0.015} />
      ))}
      <ExitSign position={[0, 1.72, AFT + 0.06]} scale={1.3} />
      {[-1, 1].map((sd) => (
        <RBox key={`d${sd}`} size={[0.7, 1.5, 0.05]} position={[sd * 0.9, 0.78, AFT + 0.05]} color="#d4c9b2" radius={0.03} />
      ))}
    </group>
  );
};

// A window: a rounded bezel in the sidewall with the shade part way up, the bright sky and the cloud deck in it.
// `sun` brightens the pane (the sunny side).
export const CabinWindow: React.FC<{ side: number; z: number; shade: number; sun?: number }> = ({ side, z, shade, sun = 0 }) => {
  const y = 0.8;
  const x = side * (wallX(y) - 0.02);
  const ang = Math.atan2(y - CY, wallX(y)); // the wall's slope at the window
  return (
    <group position={[x, y, z]} rotation={[0, 0, side * ang]}>
      <group rotation={[0, -side * Math.PI / 2, 0]}>
        <RBox size={[0.32, 0.42, 0.05]} color="#ece6da" radius={0.11} />
        <RBox size={[0.25, 0.33, 0.02]} position={[0, -0.01, 0.018]} color="#d6cebf" radius={0.09} />
        <mesh position={[0, -0.03, 0.03]}>
          <planeGeometry args={[0.19, 0.25]} />
          <meshBasicMaterial color={glowStyle(sun > 0 ? "#fff2d8" : "#dff0ff", 1.1 + sun * 0.5)} toneMapped={false} />
        </mesh>
        {/* the cloud deck far below, a white band in the lower part of the pane */}
        <mesh position={[0, -0.12, 0.031]}>
          <planeGeometry args={[0.19, 0.06]} />
          <meshBasicMaterial color={glowStyle("#ffffff", 1.3)} toneMapped={false} />
        </mesh>
        <RBox size={[0.2, 0.26 * shade, 0.01]} position={[0, 0.1 - 0.13 * shade + 0.03, 0.036]} color="#f1ece2" radius={0.004} />
        <RBox size={[0.06, 0.012, 0.012]} position={[0, 0.1 - 0.26 * shade + 0.035, 0.042]} color="#bdb4a4" radius={0.004} />
      </group>
    </group>
  );
};

// ---------- overhead bins and service units ----------

// Where mask k (0 aisle .. 2 window) of a seat block hangs from: under the service unit, in front of its seat.
// k follows the cluster order the shots already use: 0 nearest the wall (window seat) .. 2 nearest the aisle.
const MASK_X = [1.42, 1.2, 0.74];
const MASK_DZ = [0.33, 0.27, 0.3];
export const maskTop = (side: number, row: number, k: number): Vec3 => [side * MASK_X[k], PSU_Y - 0.01, rowZ(row) + MASK_DZ[k]];
const DOOR_Z = 0.3; // the mask door's centre in front of the seat (z offset from the row)
const DOOR_W = 0.84;
const DOOR_D = 0.15;

// Overhead bins along one side (a door per two rows) with the passenger service units under them: reading lights,
// air nozzles, a lit sign and the mask door per row, and the cove light along the top.
export const Bins: React.FC<{ side: number; doors?: boolean; strip?: string; stripK?: number }> = ({ side, doors = false, strip = "#fff1d6", stripK = 1.4 }) => {
  const tex = React.useContext(TexCtx);
  const out = 1.75; // outer end, buried in the wall
  const w = out - BIN_IN;
  const zEnd = rowZ(ROWS - 1) - 0.5;
  return (
    <group>
      {Array.from({ length: 8 }, (_, i) => {
        const z = 3.1 - (i + 0.5) * PITCH * 2;
        return (
          <group key={i} position={[side * (BIN_IN + w / 2), BIN_Y + 0.15, z]}>
            <RBox size={[w, 0.3, PITCH * 2 - 0.025]} color={C.bin} map={tex?.bin} radius={0.1} />
            {/* the curved door: an inset panel with a seam between the two doors, the lower lip and the latch */}
            <RBox size={[0.03, 0.2, PITCH * 2 - 0.12]} position={[-side * (w / 2 - 0.003), 0.0, 0]} color="#ece6da" map={tex?.bin} radius={0.012} />
            <RBox size={[0.034, 0.22, 0.012]} position={[-side * (w / 2 - 0.002), 0.0, 0]} color="#c9c2b4" radius={0.004} shadows={false} />
            <RBox size={[0.05, 0.05, PITCH * 2 - 0.08]} position={[-side * (w / 2 - 0.01), -0.12, 0]} color="#e4dfd3" radius={0.02} />
            {[-0.38, 0.38].map((dz) => (
              <group key={dz}>
                <RBox size={[0.03, 0.045, 0.15]} position={[-side * (w / 2 + 0.015), -0.085, dz]} color="#8f949e" radius={0.012} />
                <RBox size={[0.02, 0.02, 0.1]} position={[-side * (w / 2 + 0.03), -0.085, dz]} color="#5d626c" radius={0.006} shadows={false} />
              </group>
            ))}
          </group>
        );
      })}
      {/* the service strip */}
      <RBox size={[w, 0.05, 3.1 - zEnd]} position={[side * (BIN_IN + w / 2), PSU_Y + 0.025, (3.1 + zEnd) / 2]} color={C.psu} map={tex?.bin} radius={0.02} />
      {Array.from({ length: ROWS }, (_, r) => (
        <group key={r}>
          {/* reading lights (one on), air nozzles and the call button over the seats */}
          {[0.68, 1.0, 1.3].map((dx, k) => (
            <React.Fragment key={k}>
              <Ball position={[side * dx, PSU_Y - 0.004, rowZ(r) + 0.06]} radius={0.022} color={(r + k) % 3 === 1 ? "#fff3cc" : "#c9ced6"} glow={(r + k) % 3 === 1} scale={[1, 0.4, 1]} ink={0} />
              <Cyl r={0.014} r2={0.01} h={0.025} position={[side * (dx + 0.12), PSU_Y - 0.012, rowZ(r) + 0.06]} color="#8d939e" />
            </React.Fragment>
          ))}
          <Ball position={[side * 0.86, PSU_Y - 0.003, rowZ(r) - 0.06]} radius={0.012} color="#5b8de0" scale={[1, 0.4, 1]} ink={0} />
          {/* lit seat-belt sign */}
          <mesh position={[side * 0.95, PSU_Y - 0.002, rowZ(r) - 0.08]} rotation={[Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.16, 0.05]} />
            <meshBasicMaterial color={glowStyle("#ffe9a8", 1.15)} toneMapped={false} />
          </mesh>
          {/* the shut mask door: its seam on the service unit */}
          {!doors && <RBox size={[DOOR_W, 0.012, DOOR_D]} position={[side * (BIN_IN + 0.02 + DOOR_W / 2), PSU_Y - 0.006, rowZ(r) + DOOR_Z]} color="#e2e5ea" radius={0.005} />}
        </group>
      ))}
      {/* cove light along the top edge of the bins */}
      <mesh position={[side * (BIN_IN + 0.02), BIN_Y + 0.31, -2.4]}>
        <boxGeometry args={[0.03, 0.025, 11]} />
        <meshBasicMaterial color={glowStyle(strip, stripK)} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---------- seats ----------

// One seat: cushion and its front roll with a lap belt, a reclined back with a white headrest cover wrapped over the
// top, and on the back's rear (facing -z) the tray table with its latch and the seat pocket with a safety card. The
// passenger's card stands at the middle of the cushion (SEAT_IN), so the cushion's front edge and the armrests pass in
// front of the hips; the legs are not the card's but the seat's (SeatedLegs, below).
export const SEAT_IN = 0.0;
export const SEAT_TOP = 0.3; // top of the cushion
export const BACK_TOP = 1.0; // top of the backrest: level with the middle of a seated head, which rises above it
const BACK_H = BACK_TOP - SEAT_TOP + 0.02;
const CUSHION_Z = 0.04; // cushion centre, from the seat's z
const CUSHION_D = 0.46;
const CUSHION_FRONT = CUSHION_Z + CUSHION_D / 2; // the front face of the cushion and its roll
const ROLL_H = 0.05;
const ROLL_D = 0.1;
const ROLL_TOP = SEAT_TOP - 0.01 + ROLL_H / 2; // the front roll stands a little proud of the cushion
const BACK_TILT = 0.1; // the backrest reclines this many radians
export const Seat: React.FC<{ x: number; z: number; card?: number }> = ({ x, z, card = 0 }) => {
  const tex = React.useContext(TexCtx);
  const fab = tex?.fabric;
  return (
    <group position={[x, 0, z]}>
      <RBox size={[SEAT_W - 0.02, 0.13, CUSHION_D]} position={[0, SEAT_TOP - 0.065, CUSHION_Z]} color={fab ? "#ffffff" : C.seat} map={fab} radius={0.06} rough={0.9} />
      <RBox size={[SEAT_W - 0.04, ROLL_H, ROLL_D]} position={[0, SEAT_TOP - 0.01, CUSHION_FRONT - ROLL_D / 2]} color={fab ? "#c9d2e6" : C.seatDark} map={fab} radius={0.025} rough={0.9} />
      {/* lap belt lying across the cushion, buckle in the middle */}
      <RBox size={[SEAT_W - 0.08, 0.008, 0.035]} position={[0, SEAT_TOP + 0.002, 0.13]} color="#4a4f5c" radius={0.003} shadows={false} />
      <RBox size={[0.07, 0.012, 0.045]} position={[0, SEAT_TOP + 0.006, 0.13]} color="#c4c8d0" radius={0.005} shadows={false} />
      <group position={[0, SEAT_TOP - 0.02, -0.2]} rotation={[-BACK_TILT, 0, 0]}>
        <RBox size={[SEAT_W - 0.02, BACK_H, 0.12]} position={[0, BACK_H / 2, 0]} color={fab ? "#ffffff" : C.seat} map={fab} radius={0.07} rough={0.9} />
        {/* a stitched lumbar seam */}
        <RBox size={[SEAT_W - 0.08, 0.012, 0.01]} position={[0, BACK_H * 0.38, 0.06]} color="#1c2c55" radius={0.004} shadows={false} />
        <RBox size={[SEAT_W - 0.08, 0.2, 0.135]} position={[0, BACK_H - 0.09, 0]} color={C.cover} radius={0.06} rough={0.95} />
        {/* the back's rear: hard shell, tray table and latch, seat pocket with a card and a magazine */}
        <RBox size={[SEAT_W - 0.05, BACK_H - 0.24, 0.02]} position={[0, (BACK_H - 0.24) / 2 + 0.02, -0.06]} color="#3a4766" radius={0.01} shadows={false} />
        <RBox size={[SEAT_W - 0.14, 0.23, 0.016]} position={[0, BACK_H * 0.6, -0.072]} color={C.tray} radius={0.03} shadows={false} />
        <RBox size={[0.06, 0.022, 0.014]} position={[0, BACK_H * 0.6 + 0.135, -0.074]} color="#d6d9df" radius={0.006} shadows={false} />
        <RBox size={[SEAT_W - 0.1, 0.17, 0.035]} position={[0, 0.15, -0.075]} color="#1a2b52" radius={0.02} shadows={false} />
        <RBox size={[SEAT_W - 0.11, 0.02, 0.04]} position={[0, 0.235, -0.077]} color="#33467a" radius={0.008} shadows={false} />
        <RBox size={[0.12, 0.08, 0.006]} position={[-0.09 + card * 0.03, 0.25, -0.083]} rotation={[0, 0, 0.05]} color="#f2d36b" radius={0.004} shadows={false} />
        <RBox size={[0.14, 0.06, 0.008]} position={[0.07, 0.245, -0.087]} rotation={[0, 0, -0.04]} color={card % 2 ? "#d0563c" : "#4a9ab8"} radius={0.004} shadows={false} />
      </group>
      {/* the frame under the cushion */}
      <RBox size={[0.06, 0.18, 0.32]} position={[0, 0.09, -0.04]} color="#3c4252" radius={0.025} />
    </group>
  );
};

export const SeatBlock: React.FC<{ side: number; z: number; row?: number }> = ({ side, z, row = 0 }) => (
  <group>
    {[0, 1, 2].map((k) => (
      <Seat key={k} x={seatX(side, k)} z={z} card={(row * 3 + k) % 4} />
    ))}
    {[0, 1, 2, 3].map((k) => {
      const ax = side * (AISLE + k * (SEAT_W + 0.02)) - side * 0.01;
      return (
        <group key={`a${k}`} position={[ax, 0, z]}>
          <RBox size={[0.06, 0.065, 0.42]} position={[0, SEAT_TOP + 0.115, 0.03]} color={C.arm} radius={0.03} />
          <RBox size={[0.065, 0.075, 0.06]} position={[0, SEAT_TOP + 0.115, 0.25]} color="#8a92a6" radius={0.025} />
          <RBox size={[0.035, 0.12, 0.04]} position={[0, SEAT_TOP + 0.04, 0.2]} color="#3c4252" radius={0.012} />
        </group>
      );
    })}
    {/* legs and the cross beam, metal */}
    {[0.42, 1.25].map((dx) => (
      <React.Fragment key={dx}>
        {[-0.12, 0.14].map((dz) => (
          <Cyl key={dz} r={0.018} h={0.17} position={[side * (AISLE + dx), 0.085, z + dz]} color={C.metal} rough={0.4} />
        ))}
      </React.Fragment>
    ))}
    <RBox size={[1.5, 0.04, 0.04]} position={[side * (AISLE + 0.8), 0.17, z + 0.02]} color={C.metal} radius={0.015} rough={0.4} />
    {/* a bag stowed under a seat now and then */}
    {(row * 5 + (side > 0 ? 2 : 0)) % 3 === 0 && (
      <RBox size={[0.26, 0.15, 0.2]} position={[seatX(side, (row + 1) % 3), 0.075, z - 0.05]} rotation={[0, 0.2, 0]} color={["#c8553d", "#3f7f6a", "#6a5aa8", "#c99a3a"][(row + (side > 0 ? 1 : 0)) % 4]} radius={0.05} />
    )}
  </group>
);

// ---------- seated legs ----------

// A passenger's legs belong to the seat, not to the card. The card turns to face the camera and its own legs hang
// straight down from the hips in the card's plane: through the middle of the cushion, out under the seat. So every
// seated passenger goes through `seatLegs`: it takes the legs off the card (noLegs) and builds them here, fixed to
// the seat in the world: thighs from behind the card over the cushion, knees past the front roll, shins down to
// the floor in front of the seat, feet pointing forward. Ink sticks and feet as the puppets' own 3D limbs.
const INK = "#161212";
const PUPPET_K = 1.3 / 1060; // metres per puppet unit
const HIP_Y = 280 * PUPPET_K; // a seated card's hip height (its body ends a little above)
const LEG_R = 0.0185; // the 3D limbs' ink radius (puppet/CardLimbs.tsx)
const LEG = {
  hip: { x: 0.06, y: HIP_Y - 0.004, z: -0.05 }, // behind the card, under its body: the root never shows
  knee: { x: 0.09, y: Math.max(HIP_Y + 0.006, ROLL_TOP + LEG_R + 0.015), z: CUSHION_FRONT + LEG_R + 0.035 },
  ankle: { x: 0.095, y: 0.065, z: CUSHION_FRONT + LEG_R + 0.05 },
  foot: { dz: 0.03, half: [0.042, 0.026, 0.055] as Vec3 },
};
// The legs must clear the seat with room to spare and stop short of the seat ahead: fail the build otherwise, so a
// change to the seat can never put a leg back inside the cushion.
{
  // the thigh's underside where it crosses a depth z (it runs straight from hip to knee)
  const under = (z: number) => LEG.hip.y + ((LEG.knee.y - LEG.hip.y) * (z - LEG.hip.z)) / (LEG.knee.z - LEG.hip.z) - LEG_R;
  const overRoll = Math.min(under(CUSHION_FRONT - ROLL_D), under(CUSHION_FRONT)) - ROLL_TOP;
  const overCushion = Math.min(under(LEG.hip.z), under(CUSHION_FRONT - ROLL_D)) - SEAT_TOP;
  const shinBack = Math.min(LEG.knee.z, LEG.ankle.z) - LEG_R;
  const toeTip = LEG.ankle.z + LEG.foot.dz + LEG.foot.half[2];
  const aheadBack = PITCH - 0.2 - 0.087 - BACK_H * Math.sin(BACK_TILT); // nearest point of the seat ahead's back shell
  const problems = [
    overRoll < 0.008 && `thighs ${overRoll.toFixed(3)} m over the cushion's front roll`,
    overCushion < 0.008 && `thighs ${overCushion.toFixed(3)} m over the cushion`,
    LEG.knee.z - LEG_R < CUSHION_FRONT + 0.01 && "knees not past the cushion's front edge",
    shinBack < CUSHION_FRONT + 0.015 && `shins ${(shinBack - CUSHION_FRONT).toFixed(3)} m in front of the cushion`,
    toeTip > aheadBack - 0.03 && `toes ${(aheadBack - toeTip).toFixed(3)} m from the seat ahead`,
    LEG.knee.x + LEG_R > SEAT_W / 2 - 0.04 && "knees into the armrests",
  ].filter(Boolean);
  if (problems.length) throw new Error(`cabin.tsx seated legs pass through the seats: ${problems.join(", ")}`);
}

const LegStick: React.FC<{ a: THREE.Vector3; b: THREE.Vector3; color?: string }> = ({ a, b, color }) => {
  const d = b.clone().sub(a);
  const len = d.length();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return (
    <group position={a.clone().add(b).multiplyScalar(0.5)} quaternion={quat}>
      <mesh castShadow>
        <capsuleGeometry args={[color ? LEG_R * 0.68 : LEG_R, len, 4, 12]} />
        <meshBasicMaterial color={color ?? INK} toneMapped={false} fog={false} />
      </mesh>
      {color && (
        <mesh>
          <capsuleGeometry args={[LEG_R, len, 4, 12]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} toneMapped={false} fog={false} />
        </mesh>
      )}
    </group>
  );
};

export const SeatedLegs: React.FC<{ at: [number, number]; pants?: string; shoes?: string }> = ({ at, pants, shoes }) => (
  <group userData={{ ghost: true }}>
    {[-1, 1].map((s) => {
      const p = (j: { x: number; y: number; z: number }) => new THREE.Vector3(at[0] + s * j.x, j.y, at[1] + j.z);
      const [hip, knee, ankle] = [p(LEG.hip), p(LEG.knee), p(LEG.ankle)];
      const h = LEG.foot.half;
      return (
        <group key={s}>
          <LegStick a={hip} b={knee} color={pants} />
          <LegStick a={knee} b={ankle} color={pants} />
          <group position={[ankle.x + s * 0.004, h[1], ankle.z + LEG.foot.dz]}>
            <mesh castShadow scale={h}>
              <sphereGeometry args={[1, 16, 10]} />
              <meshBasicMaterial color={shoes ?? INK} toneMapped={false} fog={false} />
            </mesh>
            {shoes && (
              <mesh scale={h.map((v) => v + 0.006) as Vec3}>
                <sphereGeometry args={[1, 16, 10]} />
                <meshBasicMaterial color={INK} side={THREE.BackSide} toneMapped={false} fog={false} />
              </mesh>
            )}
          </group>
        </group>
      );
    })}
  </group>
);

// The card turns to face the camera, so from a side angle its far half swings back into the reclined backrest and
// the body looks sunk behind the seat back. Slide it forward along the seat just enough that its back edge (head
// ~0.27 m, body ~0.2 m off centre at backrest height) clears the backrest's front face; from the front nothing moves.
const CARD_HALF = 0.27;
const BACK_FRONT = 0.175; // backrest front face behind the card (seat z), at head height, less a margin
const cardSlide = (at: [number, number], camera: CameraShot) => {
  const yaw = Math.atan2(camera.position[0] - at[0], camera.position[2] - at[1]);
  return Math.min(0.12, Math.max(0, CARD_HALF * Math.abs(Math.sin(yaw)) - BACK_FRONT));
};

// Every seated passenger of a CabinSet shot goes through this: the placements come back without card legs (and slid
// clear of the backrest for the camera), and `legs` (to draw inside the CabinSet) holds their legs on the seats.
export const seatLegs = (puppets: PuppetPlacement[], camera: CameraShot) => ({
  puppets: puppets.map((p) =>
    p.pose.sit ? { ...p, at: [p.at[0], p.at[1] + cardSlide(p.at, camera)] as [number, number], pose: { ...p.pose, noLegs: true } } : p,
  ),
  legs: (
    <>
      {puppets
        .filter((p) => p.pose.sit)
        .map((p) => (
          <SeatedLegs key={`legs-${p.id}`} at={p.at} pants={p.look.pants} shoes={p.look.shoes} />
        ))}
    </>
  ),
});

// ---------- oxygen masks ----------

// A curved tube from a to b sagging a little: thin, clear-blue, catching the light.
export const Tube: React.FC<{ a: Vec3; b: Vec3; sag?: number; bend?: number }> = ({ a, b, sag = 0.04, bend = 0 }) => {
  const curve = React.useMemo(() => {
    const m = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), 0.5).add(new THREE.Vector3(bend, -sag, bend * 0.5));
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), m, new THREE.Vector3(...b));
  }, [a[0], a[1], a[2], b[0], b[1], b[2], sag, bend]);
  const geo = React.useMemo(() => new THREE.TubeGeometry(curve, 16, 0.006, 6, false), [curve]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={C.tube} roughness={0.25} transparent opacity={0.8} />
    </mesh>
  );
};

// The limp reservoir bag that hangs under a mask: a clear, slightly crumpled pouch. `squash` > 0 flattens it (a poke),
// `swing` (radians) swings it on its neck about the z axis, `tip` about the x axis.
export const Bag: React.FC<{ at: Vec3; squash?: number; swing?: number; tip?: number }> = ({ at, squash = 0, swing = 0, tip = 0 }) => (
  <group position={at} rotation={[tip, 0, swing]}>
    <Cyl r={0.012} h={0.04} position={[0, -0.02, 0]} color="#dfeee8" rough={0.4} />
    <group position={[0, -0.085, 0]} scale={[1 + squash * 0.6, 1 - squash * 0.45, 1 + squash * 0.3]}>
      <mesh scale={[0.85, 1.4, 0.5]}>
        <sphereGeometry args={[0.048, 20, 14]} />
        <meshStandardMaterial color="#e6f4ee" roughness={0.35} transparent opacity={0.55} depthWrite={false} />
      </mesh>
      {/* crumples */}
      <mesh position={[0.012, -0.01, 0.018]} rotation={[0, 0, 0.5]} scale={[0.35, 1.0, 0.2]}>
        <sphereGeometry args={[0.04, 12, 8]} />
        <meshStandardMaterial color="#ffffff" roughness={0.3} transparent opacity={0.4} depthWrite={false} />
      </mesh>
      <mesh position={[0, -0.072, 0]} scale={[0.9, 0.25, 0.5]}>
        <sphereGeometry args={[0.03, 12, 8]} />
        <meshStandardMaterial color="#cfe3da" roughness={0.4} transparent opacity={0.6} depthWrite={false} />
      </mesh>
    </group>
  </group>
);

// One oxygen mask at `at`: a yellow cup whose open rim faces +z of its group (turn / tilt it), the elastic band across
// the opening, and the reservoir bag hanging under it (gravity-aligned, not turned with the cup). `bag` = false
// leaves the bag off; `squash` / `bagSwing` pass through to it.
export const Mask: React.FC<{ at: Vec3; turn?: number; tilt?: number; bag?: boolean; squash?: number; bagSwing?: number; bagTip?: number; strap?: boolean }> = ({
  at,
  turn = 0,
  tilt = 0,
  bag = true,
  squash = 0,
  bagSwing = 0,
  bagTip = 0,
  strap = true,
}) => (
  <group position={at}>
    <group rotation={[tilt, turn, 0]}>
      {/* the cup: a soft dome, closed side toward -z */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.85, 1]} castShadow>
        <sphereGeometry args={[0.066, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={C.mask} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, -0.006]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.75, 1]}>
        <sphereGeometry args={[0.058, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#e0a812" roughness={0.7} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <torusGeometry args={[0.064, 0.009, 10, 32]} />
        <meshStandardMaterial color="#e8b414" roughness={0.5} />
      </mesh>
      {/* the valve nub on the dome */}
      <Cyl r={0.016} h={0.02} position={[0, -0.012, -0.058]} rotation={[Math.PI / 2, 0, 0]} color="#dca80f" />
      {strap && (
        <mesh position={[0, 0, 0.004]} rotation={[0, 0, 0.1]}>
          <torusGeometry args={[0.07, 0.0035, 6, 32, Math.PI]} />
          <meshStandardMaterial color="#d8d2c4" roughness={0.8} />
        </mesh>
      )}
    </group>
    {bag && <Bag at={[0, -0.05, -0.01]} squash={squash} swing={bagSwing} tip={bagTip} />}
  </group>
);

// Where a hanging mask's cup is: from its top at `top` on a lanyard `len` long, swung `swing` radians sideways (toward
// the aisle when positive) and `fore` radians toward +z.
export const hangPoint = (top: Vec3, side: number, len: number, swing: number, fore = 0.12): Vec3 => [
  top[0] - side * len * Math.sin(swing),
  top[1] - len * Math.cos(swing) * Math.cos(fore),
  top[2] + len * Math.sin(fore),
];
const maskLen = (lens: number) => 0.2 + lens * 0.36;

// The masks of one service unit dropping: 0 = door shut, masks stowed; 0..0.25 the door pops open with an
// overshoot; 0.25..0.5 the masks fall (one after another); 0.5..1 they bounce on their tubes and start to swing.
const OPEN = 1.72;
const doorAngle = (p: number) => {
  const q = Math.min(1, Math.max(0, p / 0.25));
  return OPEN * (1 - Math.cos(q * Math.PI * 2.5) * Math.exp(-q * 4));
};
const fallOf = (p: number, k: number) => {
  const q = Math.min(1, Math.max(0, (p - 0.25 - k * 0.03) / 0.22));
  const b = Math.min(1, Math.max(0, (p - 0.47 - k * 0.03) / 0.5));
  const bounce = q < 1 ? 0 : 0.28 * Math.sin(b * Math.PI * 3.5) * Math.exp(-b * 3.5);
  return { reach: q * q + bounce, settle: q < 1 ? 0 : 1 - Math.pow(1 - b, 3), out: q > 0 };
};

// The drop door of the service unit over a seat block, hinged on its aft edge, and three masks (one per seat,
// k 0 window .. 2 aisle) dangling from it at different lengths and swings. `drop` (0..1, see above) animates the
// drop; without it the masks are down. `hide` leaves those masks out (a shot draws them itself).
export const MaskDrop: React.FC<{ side: number; z: number; lens: number[]; swing: number[]; hide?: number[]; door?: boolean; drop?: number }> = ({ side, z, lens, swing, hide = [], door = true, drop }) => {
  const p = drop ?? 1;
  const a = doorAngle(p);
  const hingeZ = z + DOOR_Z - DOOR_D / 2;
  const doorX = side * (BIN_IN + 0.02 + DOOR_W / 2);
  return (
    <group>
      {door && (
        <>
          {/* the dark compartment behind the door, then the door hanging from its hinge */}
          {a > 0.05 && <RBox size={[DOOR_W - 0.02, 0.008, DOOR_D - 0.02]} position={[doorX, PSU_Y - 0.002, z + DOOR_Z]} color="#1f2129" radius={0.002} shadows={false} />}
          <group position={[doorX, PSU_Y - 0.008, hingeZ]} rotation={[a, 0, 0]}>
            <RBox size={[DOOR_W, 0.012, DOOR_D]} position={[0, 0, DOOR_D / 2]} color="#e2e5ea" radius={0.005} />
            {/* the door's inner face (seen once it hangs open): grey-blue with a warning stripe */}
            <RBox size={[DOOR_W - 0.03, 0.004, DOOR_D - 0.03]} position={[0, 0.007, DOOR_D / 2]} color="#a3adbd" radius={0.002} shadows={false} />
            <RBox size={[DOOR_W - 0.06, 0.004, 0.025]} position={[0, 0.0095, DOOR_D - 0.035]} color="#e6b52e" radius={0.002} shadows={false} />
            <RBox size={[DOOR_W * 0.3, 0.006, 0.02]} position={[0, -0.008, DOOR_D - 0.03]} color="#b4b9c2" radius={0.003} shadows={false} />
          </group>
        </>
      )}
      {lens.map((len, k) => {
        if (hide.includes(k)) return null;
        const top: Vec3 = [side * MASK_X[k], PSU_Y - 0.01, z + MASK_DZ[k]];
        const fall = fallOf(p, k);
        if (!fall.out && p < 0.12) return null;
        const L = Math.max(0.035, maskLen(len) * fall.reach);
        const sw = swing[k] * fall.settle + (1 - fall.settle) * 0.08 * Math.sin(k * 2.1 + side);
        const cup = hangPoint(top, side, L, sw);
        return (
          <group key={k}>
            {L > 0.06 && <Tube a={top} b={[cup[0], cup[1] + 0.05, cup[2]]} sag={0} bend={sw * 0.05} />}
            <Mask at={cup} turn={-side * 0.35 + sw * 0.8} tilt={1.0 + sw * 0.3} bag={L > 0.12} bagSwing={-sw * 0.6} />
          </group>
        );
      })}
    </group>
  );
};

// Each row's mask drops: lengths and swings drawn by hand so no two clusters hang alike.
export const DROPS: { lens: number[]; swing: number[] }[] = [
  { lens: [0.42, 0.55, 0.36], swing: [0.1, -0.2, 0.3] },
  { lens: [0.5, 0.38, 0.6], swing: [-0.15, 0.25, 0.05] },
  { lens: [0.33, 0.58, 0.47], swing: [0.3, 0.0, -0.25] },
  { lens: [0.55, 0.44, 0.39], swing: [-0.05, 0.2, 0.35] },
  { lens: [0.4, 0.52, 0.57], swing: [0.2, -0.3, 0.1] },
  { lens: [0.47, 0.35, 0.5], swing: [-0.25, 0.15, -0.1] },
  { lens: [0.58, 0.45, 0.4], swing: [0.05, 0.3, -0.2] },
  { lens: [0.36, 0.5, 0.44], swing: [0.25, -0.1, 0.2] },
  { lens: [0.5, 0.42, 0.55], swing: [-0.2, 0.05, 0.3] },
];
const dropOf = (side: number, r: number) => DROPS[(r + (side > 0 ? 4 : 0)) % DROPS.length];
// The swing of mask k over seat block (side, r) at frame f, as CabinSet draws it.
export const maskSwing = (side: number, r: number, k: number, f: number) =>
  dropOf(side, r).swing[k] * 0.6 + 0.16 * Math.sin(f * 0.085 + r * 1.7 + k * 2.3 + side) + 0.05 * Math.sin(f * 0.21 + k * 1.3 + r);
// Where CabinSet hangs the cup of mask k over seat block (side, r) at frame f (fully dropped).
export const maskCup = (side: number, r: number, k: number, f: number): Vec3 => hangPoint(maskTop(side, r, k), side, maskLen(dropOf(side, r).lens[k]), maskSwing(side, r, k, f));

// Dust motes drifting in the cabin air round the camera's target, never within a metre of the lens (where one
// would turn into a big bright blob).
const CabinMotes: React.FC<{ camera: CameraShot; f: number; count: number; color: string }> = ({ camera, f, count, color }) => {
  const [cx, , cz] = camera.target;
  const p = camera.position;
  const c = glowStyle(color, 1.3);
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const x = Math.max(-1.6, Math.min(1.6, cx + (rnd(i) - 0.5) * 3.2)) + Math.sin(f * 0.02 + i) * 0.05;
        const y = 0.4 + (((rnd(i + 50) + f * 0.0012 * (0.5 + rnd(i + 9))) % 1) + 1) % 1 * 1.35;
        const z = cz + (rnd(i + 99) - 0.3) * 5 + Math.cos(f * 0.017 + i) * 0.05;
        if (Math.hypot(x - p[0], y - p[1], z - p[2]) < 1.1) return null;
        const tw = 0.6 + 0.4 * Math.sin(f * 0.2 + i * 3);
        return (
          <mesh key={i} position={[x, y, z]}>
            <sphereGeometry args={[0.007 * (0.6 + rnd(i + 3)), 8, 6]} />
            <meshBasicMaterial color={c.clone().multiplyScalar(tw)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---------- moods and light ----------

// The cabin's moods (one per location in plan.json): cruise (warm daylight), alarm (amber caution light), fog (cold
// blue-white after the decompression), dream (pink-purple euphoria), sunlit (low gold sun after the descent).
export type CabinMood = "cruise" | "alarm" | "fog" | "dream" | "sunlit";
type MoodSpec = {
  fog: string;
  near: number;
  far: number;
  sun: string;
  sunK: number;
  sky: string;
  ground: string;
  hemi: number;
  ambient: number;
  strip: string;
  stripK: number;
  shaft: string;
  shaftK: number;
  motes: number;
  mote: string;
  bounce: string;
};
const MOODS: Record<CabinMood, MoodSpec> = {
  cruise: { fog: "#e3d8c6", near: 7, far: 19, sun: "#fff0d8", sunK: 1.7, sky: "#f4f6ff", ground: "#b39a7a", hemi: 0.95, ambient: 0.32, strip: "#fff1d6", stripK: 1.4, shaft: "#ffe6b8", shaftK: 0.13, motes: 60, mote: "#fff1c8", bounce: "#ffcf9a" },
  alarm: { fog: "#cfb898", near: 5, far: 16, sun: "#ffe6c4", sunK: 1.05, sky: "#f0e0cc", ground: "#7a6048", hemi: 0.8, ambient: 0.26, strip: "#ffbb66", stripK: 1.25, shaft: "#ffcf8a", shaftK: 0.07, motes: 50, mote: "#ffd08a", bounce: "#ff9a3a" },
  fog: { fog: "#c9d6e4", near: 2.5, far: 11, sun: "#eaf2ff", sunK: 1.2, sky: "#eef4ff", ground: "#8a96a8", hemi: 1.05, ambient: 0.36, strip: "#e8f2ff", stripK: 1.3, shaft: "#e0ecff", shaftK: 0.1, motes: 160, mote: "#ffffff", bounce: "#c8d8f0" },
  dream: { fog: "#d7b8e6", near: 4, far: 15, sun: "#ffc6ea", sunK: 1.2, sky: "#f2d4ff", ground: "#8a5aa8", hemi: 1.0, ambient: 0.32, strip: "#ffa8e6", stripK: 1.5, shaft: "#ffbdf2", shaftK: 0.14, motes: 90, mote: "#ffd8fa", bounce: "#e89ad8" },
  sunlit: { fog: "#f0d6a8", near: 7, far: 20, sun: "#ffc878", sunK: 2.1, sky: "#fff0d8", ground: "#b0804a", hemi: 0.95, ambient: 0.3, strip: "#fff1d6", stripK: 1.3, shaft: "#ffd08a", shaftK: 0.2, motes: 80, mote: "#ffe6b0", bounce: "#ffb870" },
};
export const cabinBg = (mood: CabinMood = "cruise") => MOODS[mood].fog;

// The amber caution lamps on the ceiling over the aisle (mood "alarm"), and their slow pulse at frame f.
export const AMBER: Vec3[] = [
  [0, CEIL - 0.06, 1.85],
  [0, CEIL - 0.06, -1.7],
  [0, CEIL - 0.06, -5.0],
];
export const amberPulse = (f: number) => 0.72 + 0.28 * Math.pow(0.5 + 0.5 * Math.sin(f * 0.21), 2);

// The sun through the left windows: the way the light comes from (toward the light), shared by the set's key light
// and the puppets.
const SUN_DIR: Vec3 = [-1, 0.55, 0.32];

// How the cabin's light falls on the puppets: the window sun from the left for every mood, coloured by it; the
// amber caution lamp at the front for "alarm" (pulsing with `f`).
export const cabinLight = (mood: CabinMood = "cruise", f = 0): PuppetLight => {
  const m = MOODS[mood];
  if (mood === "alarm")
    return {
      tint: "#ffd9a8",
      shadow: 0.16,
      distant: [{ direction: SUN_DIR, color: m.sun, strength: 0.65 }],
      points: [{ position: [0, 1.75, 2.1], color: "#ffa23a", strength: 1.7 * amberPulse(f), range: 4.2 }],
    };
  return {
    tint: mood === "dream" ? "#ffe6fa" : mood === "fog" ? "#eef4ff" : "#fff3e0",
    shadow: 0.12,
    distant: [{ direction: mood === "sunlit" ? [-1, 0.38, 0.4] : SUN_DIR, color: m.sun, strength: mood === "sunlit" ? 1.5 : 1.1 }],
  };
};

// The airliner cabin. Aisle along -z, seats face +z (toward a camera in the front galley), floor y = 0. Passengers
// sit with `sit: true` at [seatX(side, k), rowZ(r) + SEAT_IN]; pass the shot's puppets through `seatLegs` and draw
// its `legs` among the children, so the legs hang over the cushion's front edge instead of through the seat.
//   masks: false = stowed (mask doors shut), true = down everywhere (or dropping, with `drop`).
//   drop(side, row): each cluster's drop progress 0..1 (0 door shut, then the door pops, the masks fall, bounce and
//     swing; see MaskDrop). Without it the masks are simply down.
//   hide: "side:row" clusters a shot draws itself (door and masks: draw them with MaskDrop, `hide` for held masks).
//   noSeats: "side:row" seat blocks left out, so a camera can stand there (their masks still hang).
//   shafts: the light shafts from the left windows (default on).
// Children are drawn in the set (shot props, effects). Light the puppets with cabinLight(mood, f).
export const CabinSet: React.FC<{
  camera: CameraShot;
  f: number;
  mood?: CabinMood;
  masks?: boolean;
  hide?: string[];
  drop?: (side: number, row: number) => number;
  noSeats?: string[];
  shafts?: boolean;
  children?: React.ReactNode;
}> = ({ camera, f, mood = "cruise", masks = true, hide = [], drop, noSeats = [], shafts = true, children }) => {
  const m = MOODS[mood];
  const fabric = useOwnedTex(() => {
    const t = fabricTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.4, 1.4);
    return t;
  });
  const bin = useOwnedTex(() => {
    const t = binTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const soft = useOwnedTex(() => radialTex());
  const tex = useMemo(() => ({ fabric, bin }), [fabric, bin]);
  const pulse = amberPulse(f);
  const alarm = mood === "alarm";
  const strip = alarm ? m.strip : m.strip;
  const stripK = alarm ? m.stripK * (0.75 + 0.35 * pulse) : m.stripK;
  return (
    <TexCtx.Provider value={tex}>
      <CameraRig {...camera} />
      <color attach="background" args={[m.fog]} />
      <fog attach="fog" args={[m.fog, m.near, m.far]} />
      {/* daylight through the left windows, the strong source; sky fill, warm bounce off the floor, cool ceiling fill */}
      <Lights camera={camera} sun={[SUN_DIR[0] * 6, SUN_DIR[1] * 6, SUN_DIR[2] * 6]} sunColor={m.sun} sunK={m.sunK} sky={m.sky} ground={m.ground} hemiK={m.hemi} ambient={m.ambient} box={7} />
      <pointLight position={[0, 0.45, camera.target[2] + 0.9]} intensity={0.7} distance={4} color={m.bounce} />
      <pointLight position={[0, 1.25, camera.target[2] + 1.6]} intensity={0.35} distance={4} color={alarm ? "#ffb060" : "#e4ecff"} />
      {alarm &&
        AMBER.map((p, i) => (
          <group key={`am${i}`}>
            <pointLight position={[p[0], p[1] - 0.5, p[2] + 0.2]} intensity={1.3 * pulse} distance={4} color="#ffa640" />
            <RBox size={[0.36, 0.05, 0.16]} position={p} color="#5a4a3a" radius={0.02} />
            <mesh position={[p[0], p[1] - 0.028, p[2]]} rotation={[Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.3, 0.11]} />
              <meshBasicMaterial color={glowStyle("#ffb850", 1.05 + 0.35 * pulse)} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
            <Halo position={[p[0], p[1] - 0.05, p[2] + 0.1]} size={0.6} color="#ffa840" strength={0.18 * pulse} />
            {/* the amber pool it throws on the aisle */}
            <mesh position={[0, 0.006, p[2]]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.6, 2.0]} />
              <meshBasicMaterial map={soft} color="#ff9a2a" transparent opacity={0.22 * pulse} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
            </mesh>
          </group>
        ))}
      <Shell strip={strip} stripK={stripK} />
      {[-1, 1].map((side) => (
        <group key={side}>
          <Bins side={side} doors={masks} strip={strip} stripK={stripK} />
          {Array.from({ length: ROWS }, (_, r) => {
            const d = dropOf(side, r);
            const sw = d.lens.map((_, k) => maskSwing(side, r, k, f));
            const key = `${side}:${r}`;
            return (
              <React.Fragment key={r}>
                {!noSeats.includes(key) && <SeatBlock side={side} z={rowZ(r)} row={r} />}
                <CabinWindow side={side} z={rowZ(r) + 0.1} shade={0.25 + ((r * 7 + (side > 0 ? 3 : 0)) % 5) * 0.12} sun={side < 0 ? 1 : 0} />
                {masks && !hide.includes(key) && <MaskDrop side={side} z={rowZ(r)} lens={d.lens} swing={sw} drop={drop?.(side, r)} />}
              </React.Fragment>
            );
          })}
        </group>
      ))}
      {/* sun shafts from the left windows slanting down across the cabin, with a warm patch where each lands */}
      {shafts &&
        Array.from({ length: 7 }, (_, r) => {
          const from: Vec3 = [-wallX(0.85) + 0.08, 0.86, rowZ(r) + 0.1];
          const t = 0.86 / SUN_DIR[1];
          const to: Vec3 = [from[0] - SUN_DIR[0] * t, 0.0, from[2] - SUN_DIR[2] * t];
          return (
            <group key={`sh${r}`}>
              <LightShaft from={from} to={to} width={0.2} color={m.shaft} opacity={m.shaftK} />
              <mesh position={[to[0], 0.008, to[2]]} rotation={[-Math.PI / 2, 0, 0.3]} userData={{ ghost: true }}>
                <planeGeometry args={[0.55, 0.3]} />
                <meshBasicMaterial map={soft} color={m.shaft} transparent opacity={m.shaftK * 1.6} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            </group>
          );
        })}
      <CabinMotes camera={camera} f={f} count={m.motes} color={m.mote} />
      {children}
    </TexCtx.Provider>
  );
};
