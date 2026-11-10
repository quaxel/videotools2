import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp } from "../../engine";

type Vec3 = [number, number, number];

const IRON = "#2a3a32";
const IRON_DARK = "#1a2420";
const BRASS = "#c89a3a";

// A clock dial: numbers round the rim, `label` under the centre; drawn on a canvas.
const dialCanvas = (label: string, face = "#f4ecd8") =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#2a1a10";
    ctx.lineWidth = 14;
    ctx.stroke();
    ctx.fillStyle = "#2a1a10";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 58px Georgia";
    for (let h = 1; h <= 12; h++) {
      const a = (h / 12) * Math.PI * 2;
      ctx.fillText(String(h), 256 + Math.sin(a) * 190, 256 - Math.cos(a) * 190);
    }
    if (label) {
      ctx.font = "bold 40px Georgia";
      ctx.fillText(label, 256, 360);
    }
  });

// The hand of a clock: `turn` in hours (0..12) from twelve.
const Hand: React.FC<{ turn: number; length: number; z: number; color?: string; width?: number }> = ({ turn, length, z, color = "#1a1010", width }) => (
  <group rotation={[0, 0, -(turn / 12) * Math.PI * 2]} position={[0, 0, z]}>
    <mesh position={[0, length / 2, 0]}>
      <planeGeometry args={[width ?? length * 0.12, length]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  </group>
);

const Dial: React.FC<{ position: Vec3; radius: number; hour: number; label?: string; face?: string }> = ({ position, radius, hour, label = "", face }) => {
  const t = useMemo(() => dialCanvas(label, face), [label, face]);
  return (
    <group position={position}>
      <mesh>
        <circleGeometry args={[radius, 48]} />
        <meshBasicMaterial map={t} toneMapped={false} />
      </mesh>
      <Hand turn={hour} length={radius * 0.55} z={0.003} />
      <Hand turn={(hour % 1) * 12} length={radius * 0.8} z={0.004} width={radius * 0.06} />
    </group>
  );
};

// ---------- the safe ----------

// The bank's iron safe, painted dark green with gold lines, a small glass TIME LOCK window above the handle.
// Its door hinges on the left (-x); `open` 0..1 swings it out, `handle` 0..1 turns the brass lever a quarter turn.
// Inside: cash in bundles and coin sacks. Front faces +z. 0.9 m wide, 1.25 m tall.
export const SAFE = { w: 0.9, h: 1.25, d: 0.75 };
export const Safe: React.FC<{ position: Vec3; rotationY?: number; open?: number; handle?: number; hour?: number; glow?: number }> = ({ position, rotationY = 0, open = 0, handle = 0, hour = 10.2, glow = 0 }) => {
  const { w, h, d } = SAFE;
  const face = useMemo(
    () =>
      canvasTexture(512, 712, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 712);
        g.addColorStop(0, "#2e5a3e");
        g.addColorStop(1, "#1c3a28");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 712);
        // a painted landscape vignette, as on period bank safes
        ctx.fillStyle = "#c89a4a";
        ctx.beginPath();
        ctx.ellipse(256, 300, 150, 70, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#5a7a9a";
        ctx.beginPath();
        ctx.ellipse(256, 290, 140, 60, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#3a6a3a";
        ctx.beginPath();
        ctx.moveTo(116, 310); ctx.quadraticCurveTo(200, 250, 300, 300); ctx.quadraticCurveTo(360, 280, 396, 310);
        ctx.lineTo(396, 330); ctx.lineTo(116, 330); ctx.fill();
        ctx.strokeStyle = "#d8b050";
        ctx.lineWidth = 8;
        ctx.strokeRect(26, 26, 460, 660);
        ctx.lineWidth = 3;
        ctx.strokeRect(44, 44, 424, 624);
        ctx.fillStyle = "#e8c060";
        ctx.textAlign = "center";
        ctx.font = "bold 40px Georgia";
        ctx.fillText("FIRST NATIONAL", 256, 108);
        ctx.fillText("BANK", 256, 152);
        ctx.font = "italic 30px Georgia";
        ctx.fillText("Northfield, Minn.", 256, 640);
        // painted scroll corners
        ctx.strokeStyle = "rgba(216,176,80,0.7)";
        ctx.lineWidth = 4;
        for (const [x, y, sx, sy] of [[60, 60, 1, 1], [452, 60, -1, 1], [60, 652, 1, -1], [452, 652, -1, -1]]) {
          ctx.beginPath();
          ctx.arc(x + sx * 30, y + sy * 30, 26, 0, Math.PI * 1.5);
          ctx.stroke();
        }
      }),
    [],
  );
  const swing = -open * 1.75;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* the body: back, sides, top and bottom, so the inside shows when the door opens */}
      <InkBox size={[w - 0.12, h - 0.16, 0.06]} position={[0, h / 2 + 0.06, -d / 2 + 0.03]} color={IRON} ink={0} />
      <InkBox size={[0.06, h, d]} position={[-w / 2 + 0.03, h / 2 + 0.06, 0]} color={IRON} ink={0.012} />
      <InkBox size={[0.06, h, d]} position={[w / 2 - 0.03, h / 2 + 0.06, 0]} color={IRON} ink={0.012} />
      <InkBox size={[w - 0.12, 0.06, d - 0.004]} position={[0, h + 0.025, 0]} color={IRON} ink={0} />
      <InkBox size={[w - 0.12, 0.08, d - 0.004]} position={[0, 0.1, 0]} color={IRON} ink={0} />
      <InkBox size={[w + 0.06, 0.06, d + 0.06]} position={[0, h + 0.095, 0]} color={IRON_DARK} ink={0.012} />
      {/* feet */}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkCylinder key={`${sx}${sz}`} radius={0.04} height={0.06} position={[sx * (w / 2 - 0.08), 0.03, sz * (d / 2 - 0.08)]} color={IRON_DARK} ink={0.004} />))}
      {/* inside: two shelves of cash bundles and coin sacks */}
      <InkBox size={[w - 0.14, 0.03, d - 0.14]} position={[0, 0.62, 0]} color="#3a2a1a" ink={0.006} />
      {[0, 1, 2, 3].map((i) => (
        <InkBox key={i} size={[0.17, 0.08, 0.1]} position={[-0.26 + i * 0.175, 0.68 + (i % 2) * 0.0, 0.02]} color="#6a8a4a" ink={0.006} />
      ))}
      {[0, 1, 2].map((i) => (
        <InkBox key={`b${i}`} size={[0.17, 0.08, 0.1]} position={[-0.18 + i * 0.18, 0.76, 0.0]} color="#7a9a5a" ink={0.006} />
      ))}
      {[-0.22, 0.02, 0.24].map((x, i) => (
        <mesh key={`s${i}`} position={[x, 0.24, 0.02]} scale={[1, 1.15, 1]} castShadow>
          <sphereGeometry args={[0.1, 14, 10]} />
          <meshToonMaterial color="#c8a878" gradientMap={toonRamp} />
        </mesh>
      ))}
      {glow > 0 && (
        <pointLight position={[0, 0.7, 0.1]} color="#ffd27a" intensity={glow * 0.7} distance={1.6} />
      )}
      {/* the door, hinged at the left front edge */}
      <group position={[-w / 2, 0, d / 2]} rotation={[0, swing, 0]}>
        <group position={[w / 2, 0, 0]}>
          <InkBox size={[w, h, 0.09]} position={[0, h / 2 + 0.06, 0.045]} color="#ffffff" map={face} ink={0.014} />
          {/* the TIME LOCK window: a brass ring with two little clock dials behind glass */}
          <group position={[0, h * 0.62 + 0.06, 0.095]}>
            <InkCylinder radius={0.17} height={0.03} rotation={[Math.PI / 2, 0, 0]} color={BRASS} ink={0.006} />
            <mesh position={[0, 0, 0.018]}>
              <circleGeometry args={[0.145, 40]} />
              <meshBasicMaterial color="#efe4c8" toneMapped={false} />
            </mesh>
            <Dial position={[-0.065, 0.0, 0.02]} radius={0.06} hour={hour} />
            <Dial position={[0.065, 0.0, 0.02]} radius={0.06} hour={hour} />
            <mesh position={[0, 0, 0.026]}>
              <circleGeometry args={[0.145, 40]} />
              <meshBasicMaterial color="#cfe6f0" transparent opacity={0.18} toneMapped={false} />
            </mesh>
            <Label text="TIME LOCK" position={[0, -0.235, 0.0]} width={0.36} bg="#c89a3a" fg="#1a1208" />
          </group>
          {/* the combination dial and the handle */}
          <group position={[0, h * 0.33 + 0.06, 0.1]}>
            <InkCylinder radius={0.065} height={0.03} position={[-0.17, 0, 0]} rotation={[Math.PI / 2, 0, 0]} color={BRASS} ink={0.005} />
            <InkCylinder radius={0.03} height={0.05} position={[0.15, 0, 0.01]} rotation={[Math.PI / 2, 0, 0]} color={BRASS} ink={0.005} />
            <group position={[0.15, 0, 0.04]} rotation={[0, 0, -handle * (Math.PI / 2)]}>
              <InkBox size={[0.04, 0.24, 0.03]} position={[0, -0.1, 0]} color={BRASS} ink={0.005} />
              <mesh position={[0, -0.22, 0]}>
                <sphereGeometry args={[0.035, 12, 10]} />
                <meshToonMaterial color={BRASS} gradientMap={toonRamp} />
              </mesh>
            </group>
          </group>
          {/* hinges */}
          {[0.3, h - 0.15].map((y) => (
            <InkCylinder key={y} radius={0.03} height={0.16} position={[-w / 2 + 0.01, y, 0.07]} color={IRON_DARK} ink={0.004} />
          ))}
        </group>
      </group>
    </group>
  );
};

// ---------- the vault ----------

// The walk-in vault built against the back wall: a masonry frame round a dark doorway, the heavy iron door on
// hinges at the left. `open` 1 stands it wide open against the wall, 0 shut. Front faces +z, the doorway centre at
// x = 0, `inner` the dark room behind it (the safe goes there).
export const VAULT = { w: 1.3, h: 1.95, wall: 0.45 };
export const Vault: React.FC<{ position: Vec3; open?: number; wing?: number; wallH?: number; wallColor?: string; label?: boolean; children?: React.ReactNode }> = ({ position, open = 1, wing = 3, wallH = 4.2, wallColor = "#b8ac94", label = true, children }) => {
  const { w, h, wall } = VAULT;
  const swing = -open * 1.85;
  const rivets = useMemo(() => {
    const r: [number, number][] = [];
    for (let i = 0; i < 6; i++) for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) r.push([x, 0.15 + i * ((h - 0.3) / 5)]);
    for (let i = 1; i < 5; i++) for (const y of [0.1, h - 0.1]) r.push([-w / 2 + 0.07 + i * ((w - 0.14) / 5), y]);
    return r;
  }, [w, h]);
  return (
    <group position={position}>
      {/* masonry frame */}
      {/* the wall the vault is built into, wings either side of the doorway */}
      <InkBox size={[wing, wallH, wall]} position={[-w / 2 - 0.03 - wing / 2, wallH / 2, 0]} color={wallColor} ink={0} />
      <InkBox size={[wing, wallH, wall]} position={[w / 2 + 0.03 + wing / 2, wallH / 2, 0]} color={wallColor} ink={0} />
      <InkBox size={[w + 0.06, wallH - h - 0.03, wall - 0.01]} position={[0, h + 0.03 + (wallH - h - 0.03) / 2, 0]} color={wallColor} ink={0} />
      {/* the stone surround of the doorway */}
      <InkBox size={[0.16, h + 0.16, wall + 0.04]} position={[-w / 2 - 0.08, (h + 0.16) / 2, 0]} color="#8a7a60" ink={0.014} />
      <InkBox size={[0.16, h + 0.16, wall + 0.04]} position={[w / 2 + 0.08, (h + 0.16) / 2, 0]} color="#8a7a60" ink={0.014} />
      <InkBox size={[w + 0.32, 0.16, wall + 0.04]} position={[0, h + 0.08, 0]} color="#8a7a60" ink={0.014} />
      {label && <Label text="VAULT" position={[0, h + 0.34, wall / 2 + 0.03]} width={0.5} bg="#2a2018" fg="#e8c060" border={false} />}
      {/* the dark room behind */}
      <group position={[0, 0, -wall / 2]}>
        <InkBox size={[w + 0.56, 0.04, 1.76]} position={[0, 0.025, -0.9]} color="#3a3a34" ink={0} />
        <InkBox size={[w + 0.6, h + 0.1, 0.05]} position={[0, (h + 0.1) / 2, -1.8]} color="#2a302a" ink={0} />
        <InkBox size={[0.05, h + 0.1, 1.8]} position={[-(w + 0.6) / 2, (h + 0.1) / 2, -0.9]} color="#263028" ink={0} />
        <InkBox size={[0.05, h + 0.1, 1.8]} position={[(w + 0.6) / 2, (h + 0.1) / 2, -0.9]} color="#263028" ink={0} />
        <InkBox size={[w + 0.56, 0.05, 1.76]} position={[0, h + 0.12, -0.9]} color="#1e2420" ink={0} />
        {children}
      </group>
      {/* the door: hinged at the left of the opening, front face +z */}
      <group position={[-w / 2, 0, wall / 2]} rotation={[0, swing, 0]}>
        <group position={[w / 2, 0, 0.09]}>
          <InkBox size={[w, h, 0.18]} position={[0, h / 2, 0]} color="#3a4440" ink={0.016} />
          <InkBox size={[w - 0.18, h - 0.22, 0.03]} position={[0, h / 2, 0.1]} color="#4a5650" ink={0.01} />
          {rivets.map(([x, y], i) => (
            <mesh key={i} position={[x, y, 0.095]}>
              <sphereGeometry args={[0.018, 8, 6]} />
              <meshToonMaterial color="#20282a" gradientMap={toonRamp} />
            </mesh>
          ))}
          {/* the spoked wheel */}
          <group position={[0.12, h * 0.52, 0.14]}>
            <mesh>
              <torusGeometry args={[0.16, 0.018, 8, 28]} />
              <meshToonMaterial color={BRASS} gradientMap={toonRamp} />
            </mesh>
            {[0, 1, 2].map((i) => (
              <InkBox key={i} size={[0.32, 0.025, 0.02]} rotation={[0, 0, (i * Math.PI) / 3]} color={BRASS} ink={0.004} />
            ))}
          </group>
          {/* bolts on the edge */}
          {[0.4, h / 2, h - 0.4].map((y) => (
            <InkCylinder key={y} radius={0.035} height={0.1} position={[w / 2 + 0.02, y, 0]} rotation={[0, 0, Math.PI / 2]} color="#8a8a8a" ink={0.004} />
          ))}
        </group>
      </group>
    </group>
  );
};

// ---------- the time lock, cut open (the mechanism shots) ----------

// The inside of the safe door, shown big against black: the TIME LOCK clock at the top, a BLOCK hanging from it that
// sits under the BOLT BAR and stops it moving, the bar with three bolts out of the right edge, the handle spindle at
// the bottom left. `hour` turns the clock hand; `block` 1 sits in the bar's path, 0 has dropped clear; `bolts` 1
// thrown (locked) .. 0 drawn back; `handle` 0..1 a quarter turn; `strain` a small shudder of the handle when blocked.
// About 1.5 m wide, 2.0 m tall, centred at `position`, facing +z.
export const TimeLockCutaway: React.FC<{
  position: Vec3;
  hour: number;
  block: number;
  bolts: number;
  handle: number;
  strain?: number;
  set?: boolean;
  labels?: number; // frames since the labels came on (undefined: shown)
  warm?: boolean;
}> = ({ position, hour, block, bolts, handle, strain = 0, set = true, labels, warm }) => {
  const plate = warm ? "#5a4628" : "#2a2e30";
  const boltX = bolts * 0.22;
  return (
    <group position={position}>
      {/* the door plate, its edge on the right */}
      <InkBox size={[1.3, 2.0, 0.06]} position={[-0.1, 0, -0.04]} color={plate} ink={0.016} />
      <InkBox size={[0.12, 2.03, 0.14]} position={[0.55, 0, 0.005]} color={warm ? "#6a5430" : "#3a4044"} ink={0.014} />
      {/* the clock box */}
      <group position={[-0.15, 0.58, 0.04]}>
        <InkBox size={[0.78, 0.62, 0.08]} color={BRASS} ink={0.012} />
        <Dial position={[0, 0.02, 0.045]} radius={0.25} hour={hour} face={set ? "#f4ecd8" : "#e4dcc8"} />
      </group>
      {/* the block: hangs from the clock on a rod; drops clear when the hour comes */}
      <group position={[0.26, -0.02 - (1 - block) * 0.2, 0.05]}>
        <InkBox size={[0.025, 0.36, 0.02]} position={[0, 0.24, 0]} color="#5a5a5a" ink={0.004} />
        <InkBox size={[0.14, 0.12, 0.06]} position={[0, 0, 0]} color="#c84a2a" ink={0.008} />
      </group>
      {/* the bolt bar and its bolts */}
      <group position={[boltX - 0.22, -0.25, 0.05]}>
        <InkBox size={[0.9, 0.08, 0.05]} position={[0, 0, 0]} color="#9a9a9a" ink={0.008} />
        {[0.55, 0, -0.55].map((dy, i) => (
          <group key={i}>
            <InkBox size={[0.05, Math.abs(dy) + 0.05, 0.04]} position={[0.42, dy / 2, 0]} color="#8a8a8a" ink={0.006} />
            <InkCylinder radius={0.05} height={0.3} position={[0.6, dy, 0]} rotation={[0, 0, Math.PI / 2]} color="#b8b8b8" ink={0.006} />
          </group>
        ))}
      </group>
      {/* the handle spindle with a crank to the bar */}
      <group position={[-0.5, -0.25, 0.08]} rotation={[0, 0, -handle * (Math.PI / 2) + strain * 0.05]}>
        <InkCylinder radius={0.07} height={0.05} rotation={[Math.PI / 2, 0, 0]} color={BRASS} ink={0.006} />
        <InkBox size={[0.05, 0.38, 0.04]} position={[0, -0.18, 0.02]} color={BRASS} ink={0.006} />
        <mesh position={[0, -0.38, 0.02]}>
          <sphereGeometry args={[0.05, 12, 10]} />
          <meshToonMaterial color={BRASS} gradientMap={toonRamp} />
        </mesh>
      </group>
      {/* labels */}
      <Label text="TIME LOCK" position={[-0.15, 1.02, 0.08]} width={0.62} appear={labels} />
      <Label text="BOLTS" position={[0.42, -0.9, 0.1]} width={0.36} appear={labels === undefined ? undefined : labels - 8} />
      <Label text={set ? "SET: 9 O'CLOCK" : "NOT SET"} position={[-0.15, 0.12, 0.1]} width={0.5} bg={set ? "#fff6dc" : "#ffcc4a"} appear={labels === undefined ? undefined : labels - 16} />
    </group>
  );
};

// ---------- small things ----------

// A revolver held in a hand: `at` the grip, pointing along `yaw` (0 = +x) with `pitch`.
export const Revolver: React.FC<{ at: Vec3; yaw: number; pitch?: number; scale?: number }> = ({ at, yaw, pitch = 0, scale = 1 }) => (
  <group position={at} rotation={[0, yaw, pitch, "YZX"]} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.05, 0.11, 0.035]} position={[-0.02, -0.05, 0]} rotation={[0, 0, 0.3]} color="#5a3a22" ink={0.005} />
    <InkCylinder radius={0.026} height={0.05} position={[0.03, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} color="#3a3a40" ink={0.004} />
    <InkCylinder radius={0.011} height={0.17} position={[0.13, 0.03, 0]} rotation={[0, 0, Math.PI / 2]} color="#2a2a30" ink={0.004} />
  </group>
);

// The little coin pouch the gang got away with, its tag reading $26.70.
export const CoinPouch: React.FC<{ position: Vec3; tag?: boolean }> = ({ position, tag = true }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh scale={[1, 1.2, 1]} castShadow>
      <sphereGeometry args={[0.06, 12, 10]} />
      <meshToonMaterial color="#b89a6a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.02} height={0.03} position={[0, 0.075, 0]} color="#7a5a3a" ink={0.003} />
    {tag && <Label text="$26.70" position={[0.0, 0.2, 0.02]} width={0.3} bg="#fff6dc" />}
  </group>
);

// The next day's newspaper on the counter.
export const Newspaper: React.FC<{ position: Vec3; rotation?: Vec3; size?: number }> = ({ position, rotation = [-Math.PI / 2, 0, 0], size = 0.5 }) => {
  const page = useMemo(
    () =>
      canvasTexture(512, 680, (ctx) => {
        ctx.fillStyle = "#f0e8d4";
        ctx.fillRect(0, 0, 512, 680);
        ctx.fillStyle = "#1a1410";
        ctx.textAlign = "center";
        ctx.font = "bold 34px Georgia";
        ctx.fillText("NORTHFIELD", 256, 56);
        ctx.fillRect(30, 76, 452, 4);
        ctx.font = "900 70px Georgia";
        ctx.fillText("GANG", 256, 170);
        ctx.fillText("ROUTED", 256, 245);
        ctx.font = "bold 42px Georgia";
        ctx.fillText("3 KILLED", 256, 325);
        ctx.fillText("3 CAPTURED", 256, 380);
        ctx.fillRect(30, 410, 452, 3);
        ctx.fillStyle = "rgba(40,30,20,0.45)";
        for (let i = 0; i < 9; i++) {
          ctx.fillRect(40, 440 + i * 24, 200, 8);
          ctx.fillRect(272, 440 + i * 24, 200, 8);
        }
      }),
    [],
  );
  return (
    <mesh position={position} rotation={rotation} userData={{ ghost: true }}>
      <planeGeometry args={[size, size * 1.33]} />
      <meshToonMaterial map={page} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
  );
};

// A rifle on the hardware store's wall rack (lying on pegs), or `held` at a grip like Black Bart's Rifle.
export const RackRifle: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.34, 0.08, 0.05]} position={[-0.42, -0.02, 0]} rotation={[0, 0, -0.1]} color="#8a5228" ink={0.008} />
    <InkCylinder radius={0.015} height={0.72} position={[0.12, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} color="#2a2a30" ink={0.006} />
  </group>
);

// The teller grille along the counter top: thin brass bars with an arched window.
export const Grille: React.FC<{ position: Vec3; width: number; height?: number }> = ({ position, width, height = 0.55 }) => {
  const n = Math.round(width / 0.07);
  return (
    <group position={position}>
      <InkBox size={[width, 0.04, 0.04]} position={[0, height, 0]} color={BRASS} ink={0.004} />
      {Array.from({ length: n + 1 }, (_, i) => {
        const x = -width / 2 + (i * width) / n;
        if (Math.abs(x) < 0.18) return null; // the window
        return <InkCylinder key={i} radius={0.007} height={height} position={[x, height / 2, 0]} color={BRASS} ink={0} />;
      })}
      <mesh position={[0, height - 0.06, 0]}>
        <torusGeometry args={[0.18, 0.012, 6, 24, Math.PI]} />
        <meshToonMaterial color={BRASS} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// ---------- dressing ----------

// A hanging oil lamp on a chain: brass shade, a glowing chimney (blooms when `on`) and a warm point light.
export const HangingLamp: React.FC<{ position: Vec3; chain?: number; on?: boolean; light?: number }> = ({ position, chain = 0.7, on = true, light = 1.2 }) => (
  <group position={position}>
    <InkCylinder radius={0.006} height={chain} position={[0, chain / 2, 0]} color="#3a3020" ink={0} />
    <mesh position={[0, 0.0, 0]} castShadow>
      <coneGeometry args={[0.18, 0.1, 20, 1, true]} />
      <meshToonMaterial color={BRASS} gradientMap={toonRamp} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, -0.09, 0]}>
      <sphereGeometry args={[0.055, 14, 10]} />
      <meshBasicMaterial color={on ? new THREE.Color(3.4, 2.5, 1.3) : new THREE.Color("#d8c8a0")} toneMapped={false} />
    </mesh>
    <InkCylinder radius={0.065} height={0.08} position={[0, -0.18, 0]} color={BRASS} ink={0.004} />
    {on && <pointLight position={[0, -0.12, 0]} color="#ffb860" intensity={light} distance={4.5} />}
  </group>
);

// A toothed brass gear turned by `angle` (radians) about its axle, facing +z.
export const Gear: React.FC<{ position: Vec3; radius: number; teeth?: number; angle: number; color?: string; depth?: number }> = ({ position, radius, teeth = 14, angle, color = BRASS, depth = 0.04 }) => (
  <group position={position} rotation={[0, 0, angle]}>
    <InkCylinder radius={radius} height={depth} rotation={[Math.PI / 2, 0, 0]} color={color} ink={0.005} />
    {Array.from({ length: teeth }, (_, i) => {
      const a = (i / teeth) * Math.PI * 2;
      return <InkBox key={i} size={[radius * 0.2, radius * 0.22, depth * 0.9]} position={[Math.cos(a) * (radius + radius * 0.08), Math.sin(a) * (radius + radius * 0.08), 0]} rotation={[0, 0, a + Math.PI / 2]} color={color} ink={0.003} />;
    })}
    <InkCylinder radius={radius * 0.62} height={depth + 0.004} rotation={[Math.PI / 2, 0, 0]} color="#8a6420" ink={0} />
    <InkCylinder radius={radius * 0.18} height={depth + 0.02} rotation={[Math.PI / 2, 0, 0]} color="#d8d0c0" ink={0.003} />
  </group>
);

// The clockwork's balance wheel: a brass ring with spokes rocking by `swing` radians.
export const BalanceWheel: React.FC<{ position: Vec3; radius: number; swing: number }> = ({ position, radius, swing }) => (
  <group position={position} rotation={[0, 0, swing]}>
    <mesh>
      <torusGeometry args={[radius, radius * 0.1, 8, 32]} />
      <meshToonMaterial color="#e8c060" gradientMap={toonRamp} />
    </mesh>
    {[0, 1, 2].map((i) => (
      <InkBox key={i} size={[radius * 2, radius * 0.08, 0.01]} rotation={[0, 0, (i * Math.PI) / 3]} color="#c89a3a" ink={0} />
    ))}
  </group>
);

// A blueprint backdrop for the cutaway: dark paper with a faint grid and a few dimension lines. `warm` turns it
// into old gold drafting paper.
export const Blueprint: React.FC<{ position: Vec3; size: [number, number]; warm?: boolean }> = ({ position, size, warm }) => {
  const t = useMemo(
    () =>
      canvasTexture(1024, 1024, (ctx) => {
        const g = ctx.createRadialGradient(512, 440, 60, 512, 512, 720);
        g.addColorStop(0, warm ? "#5a3a10" : "#14305a");
        g.addColorStop(1, warm ? "#1a0e04" : "#060c1c");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 1024, 1024);
        ctx.strokeStyle = warm ? "rgba(255,200,110,0.12)" : "rgba(120,180,255,0.14)";
        ctx.lineWidth = 2;
        for (let i = 0; i <= 1024; i += 32) {
          ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 1024); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(1024, i); ctx.stroke();
        }
        ctx.strokeStyle = warm ? "rgba(255,210,130,0.3)" : "rgba(150,200,255,0.32)";
        ctx.lineWidth = 3;
        for (const [x0, y0, x1, y1] of [[80, 120, 80, 900], [940, 120, 940, 900], [80, 960, 940, 960], [120, 70, 900, 70]]) {
          ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(512, 500, 380, 0, Math.PI * 2); ctx.stroke();
      }),
    [warm],
  );
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={t} toneMapped={false} />
    </mesh>
  );
};

// A barred vent high in a wall: a stone frame, iron bars and a bright sky behind (blooms).
export const BarredWindow: React.FC<{ position: Vec3; size: [number, number]; bars?: number; glow?: string }> = ({ position, size, bars = 4, glow = "#fff0c8" }) => {
  const [w, h] = size;
  return (
    <group position={position}>
      <InkBox size={[w + 0.16, h + 0.16, 0.06]} position={[0, 0, -0.01]} color="#8a7a60" ink={0.006} />
      <mesh position={[0, 0, 0.025]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={new THREE.Color(glow).multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      {Array.from({ length: bars }, (_, i) => (
        <InkCylinder key={i} radius={0.014} height={h} position={[-w / 2 + ((i + 1) * w) / (bars + 1), 0, 0.04]} color="#2a2a2a" ink={0} />
      ))}
    </group>
  );
};

// A gilt-framed portrait of a bank director on the wall.
export const Portrait: React.FC<{ position: Vec3; size?: [number, number] }> = ({ position, size = [0.5, 0.65] }) => {
  const t = useMemo(
    () =>
      canvasTexture(256, 336, (ctx) => {
        ctx.fillStyle = "#3a2a1a";
        ctx.fillRect(0, 0, 256, 336);
        ctx.fillStyle = "#1a1410";
        ctx.beginPath(); ctx.ellipse(128, 300, 90, 90, 0, Math.PI, 0); ctx.fill();
        ctx.fillStyle = "#c89a72";
        ctx.beginPath(); ctx.ellipse(128, 150, 48, 60, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#e8e0d0";
        ctx.beginPath(); ctx.ellipse(128, 195, 34, 22, 0, 0, Math.PI); ctx.fill();
        ctx.fillStyle = "#2a1a10";
        ctx.fillRect(84, 95, 88, 22);
      }),
    [],
  );
  return (
    <group position={position}>
      <InkBox size={[size[0] + 0.1, size[1] + 0.1, 0.04]} color="#b8892a" ink={0.006} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={size} />
        <meshToonMaterial map={t} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};
