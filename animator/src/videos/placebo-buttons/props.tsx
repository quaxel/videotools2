import React from "react";
import * as THREE from "three";
import { Halo, InkBox, InkCylinder, Label, Screen, Vec3 } from "../../engine";

// Props for "Why the Close Door Button Does Nothing".

const STEEL = "#c9ced3";
const BRASS = "#d9a93a";
const FACE: Vec3 = [Math.PI / 2, 0, 0]; // a cylinder turned to face the camera (+z)

// Two steel door leaves in a frame; `open` 0..1 slides them apart. `gap` keeps them from meeting (a pinched briefcase).
export const ElevatorDoors: React.FC<{ position: Vec3; open: number; gap?: number; color?: string; frame?: string; glow?: string }> = ({
  position,
  open,
  gap = 0,
  color = STEEL,
  frame = BRASS,
  glow,
}) => {
  const half = 0.25 + Math.max(open * 0.5, gap / 2);
  return (
    <group position={position}>
      {glow && (
        <mesh position={[0, 1.05, -0.04]}>
          <planeGeometry args={[1.0, 2.1]} />
          <meshBasicMaterial color={glow} toneMapped={false} />
        </mesh>
      )}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * half, 1.05, 0]}>
          <InkBox size={[0.5, 2.1, 0.04]} color={color} ink={0.006} />
          <InkBox size={[0.02, 2.1, 0.045]} position={[-s * 0.24, 0, 0]} color="#8a9096" ink={0} shadows={false} />
        </group>
      ))}
      <InkBox size={[0.14, 2.3, 0.1]} position={[-0.57, 1.15, 0.03]} color={frame} />
      <InkBox size={[0.14, 2.3, 0.1]} position={[0.57, 1.15, 0.03]} color={frame} />
      <InkBox size={[1.28, 0.14, 0.1]} position={[0, 2.17, 0.03]} color={frame} />
    </group>
  );
};

// One round button with its label to the right. `press` 0..1 pushes it in; `lit` glows it.
const Btn: React.FC<{ y: number; label: string; press?: number; lit?: string; capOff?: number; floorY: number; bg?: string; fg?: string }> = ({ y, label, press = 0, lit, capOff, floorY, bg = "#fffdf4", fg }) => {
  let cap: Vec3 = [-0.06, y, 0.022 - press * 0.012];
  let spin = 0;
  if (capOff !== undefined && capOff >= 0) {
    const t = capOff;
    const yy = y + 0.03 * t - 0.0016 * t * t;
    cap = [-0.06 + 0.012 * t, Math.max(floorY, yy), 0.022 + 0.014 * t];
    spin = t * 0.45;
  }
  return (
    <group>
      <InkCylinder radius={0.042} height={0.012} position={[-0.06, y, 0.012]} rotation={FACE} color="#3a3f45" ink={0.003} />
      <InkCylinder radius={0.034} height={0.02} position={cap} rotation={[FACE[0] + spin, spin * 0.6, 0]} color={lit ?? "#f2f2ec"} emissive={lit ? lit : undefined} ink={0.004} />
      {lit && <Halo position={[-0.06, y, 0.03]} size={0.16} color={lit} strength={0.6} />}
      <Label text={label} position={[0.06, y, 0.016]} width={0.13} bg={bg} fg={fg} />
    </group>
  );
};

// The car's button panel, centred at `position` (about head height), facing +z.
export const ButtonPanel: React.FC<{
  position: Vec3;
  closePress?: number;
  capOff?: number;
  lit?: number; // floor button lit (40 or 12)
  fire?: number; // 0..1 the fire key mode is on: CLOSE glows red
  keyIn?: number; // 0..1 the key slides in
  keyTurn?: number; // 0..1 the key turns a quarter
  padlock?: number; // frames since a padlock clamped over CLOSE
}> = ({ position, closePress = 0, capOff, lit, fire = 0, keyIn, keyTurn = 0, padlock }) => {
  const floorY = -position[1] + 0.03;
  const lockScale = padlock === undefined || padlock < 0 ? 0 : 1 + 0.6 * Math.exp(-padlock / 3) * Math.cos(padlock * 0.9);
  return (
    <group position={position}>
      <InkBox size={[0.32, 0.78, 0.025]} color={STEEL} ink={0.006} />
      <InkBox size={[0.34, 0.8, 0.012]} position={[0, 0, -0.012]} color={BRASS} ink={0} />
      <Btn y={0.29} label="40" floorY={floorY} lit={lit === 40 ? "#ffd23f" : undefined} />
      <Btn y={0.18} label="12" floorY={floorY} lit={lit === 12 ? "#ffd23f" : undefined} />
      <Btn y={0.07} label="1" floorY={floorY} />
      <Btn y={-0.06} label="OPEN" floorY={floorY} />
      <Btn y={-0.18} label="CLOSE" press={closePress} capOff={capOff} floorY={floorY} lit={fire > 0.5 ? "#ff3b30" : undefined} />
      {/* Fire service keyhole: the seed */}
      <InkCylinder radius={0.036} height={0.014} position={[-0.06, -0.31, 0.014]} rotation={FACE} color="#e0262f" ink={0.004} />
      <InkBox size={[0.012, 0.03, 0.01]} position={[-0.06, -0.31, 0.022]} color="#161212" ink={0} />
      <Label text="FIRE" position={[0.06, -0.31, 0.016]} width={0.13} bg="#e0262f" fg="#ffffff" />
      {keyIn !== undefined && (
        <group position={[-0.06, -0.31, 0.03 + (1 - keyIn) * 0.09]} rotation={[0, 0, (keyTurn * Math.PI) / 2]}>
          <InkBox size={[0.01, 0.022, 0.03]} position={[0, 0, 0]} color="#e8b04a" ink={0.002} />
          <InkBox size={[0.05, 0.05, 0.012]} position={[0, 0, 0.026]} color="#e8b04a" ink={0.003} />
        </group>
      )}
      {lockScale > 0 && (
        <group position={[-0.06, -0.18, 0.05]} scale={lockScale}>
          <InkBox size={[0.09, 0.07, 0.03]} position={[0, -0.01, 0]} color="#ffd23f" ink={0.004} />
          <mesh position={[0, 0.035, 0]}>
            <torusGeometry args={[0.028, 0.008, 8, 20, Math.PI]} />
            <meshToonMaterial color="#9aa0a6" />
          </mesh>
        </group>
      )}
    </group>
  );
};

// The inside of the elevator car seen from the back: front wall with the door opening, brass side walls and a ceiling.
// The hall beyond the doors is the Room's own back wall.
export const CAR_FRONT_Z = -1.0;
export const PANEL_AT: Vec3 = [0.78, 1.12, CAR_FRONT_Z + 0.03];
export const CarShell: React.FC<{ open: number; gap?: number; wall: string; floorText: string; lightColor?: string; panel: React.ComponentProps<typeof ButtonPanel> }> = ({
  open,
  gap,
  wall,
  floorText,
  lightColor = "#fff2c4",
  panel,
}) => (
  <group>
    <InkBox size={[0.6, 2.5, 0.06]} position={[-0.95, 1.25, CAR_FRONT_Z - 0.02]} color={wall} />
    <InkBox size={[0.6, 2.5, 0.06]} position={[0.95, 1.25, CAR_FRONT_Z - 0.02]} color={wall} />
    <InkBox size={[2.5, 0.3, 0.06]} position={[0, 2.35, CAR_FRONT_Z - 0.02]} color={wall} />
    <InkBox size={[0.06, 2.5, 3.6]} position={[-1.25, 1.25, CAR_FRONT_Z + 1.8]} color={wall} />
    <InkBox size={[0.06, 2.5, 3.6]} position={[1.25, 1.25, CAR_FRONT_Z + 1.8]} color={wall} />
    <InkBox size={[0.04, 0.06, 3.6]} position={[-1.2, 0.95, CAR_FRONT_Z + 1.8]} color={BRASS} ink={0.004} />
    <InkBox size={[0.04, 0.06, 3.6]} position={[1.2, 0.95, CAR_FRONT_Z + 1.8]} color={BRASS} ink={0.004} />
    <InkBox size={[2.5, 0.06, 3.6]} position={[0, 2.5, CAR_FRONT_Z + 1.8]} color="#f4ead2" />
    <mesh position={[0, 2.46, CAR_FRONT_Z + 1.2]} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.2, 0.8]} />
      <meshBasicMaterial color={lightColor} toneMapped={false} />
    </mesh>
    <ElevatorDoors position={[0, 0, CAR_FRONT_Z + 0.02]} open={open} gap={gap} />
    <Screen position={[0, 2.38, CAR_FRONT_Z + 0.04]} size={[0.36, 0.17]} text={floorText} glow="#ff9f1c" bg="#140a02" />
    <ButtonPanel {...panel} position={PANEL_AT} />
  </group>
);

// A hall or lobby wall with elevator doors in it; behind the doors, the lit car.
export const ElevatorFront: React.FC<{ position: Vec3; open: number; floorText: string; frame?: string; inside?: string }> = ({ position, open, floorText, frame = BRASS, inside = "#f2cf6b" }) => (
  <group position={position}>
    <ElevatorDoors position={[0, 0, 0.02]} open={open} frame={frame} glow={inside} />
    <Screen position={[0, 2.5, 0.04]} size={[0.36, 0.17]} text={floorText} glow="#ff9f1c" bg="#140a02" />
    <InkBox size={[0.14, 0.24, 0.03]} position={[0.85, 1.05, 0.02]} color={STEEL} ink={0.004} />
    <InkCylinder radius={0.035} height={0.02} position={[0.85, 1.05, 0.045]} rotation={FACE} color="#fffdf4" ink={0.003} />
  </group>
);

// A briefcase pinched in the closing doors, papers bursting out (`t` frames since the slam).
export const PinchedCase: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => (
  <group position={position}>
    <InkBox size={[0.1, 0.32, 0.42]} color="#6b3e1f" ink={0.006} />
    <InkBox size={[0.04, 0.06, 0.16]} position={[0, 0.19, 0]} color="#3a2414" ink={0.004} />
    {t >= 0 &&
      Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const v = 0.006 + (i % 3) * 0.003;
        const k = Math.min(t, 40);
        return (
          <mesh key={i} position={[Math.cos(a) * v * k, 0.2 + 0.034 * k - 0.0009 * k * k, 0.06 + Math.abs(Math.sin(a)) * v * k * 0.5]} rotation={[k * 0.2 + i, k * 0.15, i]}>
            <planeGeometry args={[0.16, 0.21]} />
            <meshToonMaterial color="#fffdf4" side={THREE.DoubleSide} />
          </mesh>
        );
      })}
  </group>
);

// A wheelchair in profile, travelling along x (`facing` 1 = to the right); wheels turn with `roll` (metres).
export const Wheelchair: React.FC<{ position: Vec3; roll: number; facing?: 1 | -1 }> = ({ position, roll, facing = 1 }) => (
  <group position={position} scale={[facing, 1, 1]}>
    {[-0.24, 0.24].map((z) => (
      <group key={z} position={[-0.05, 0.3, z]} rotation={[0, 0, -roll / 0.3]}>
        <InkCylinder radius={0.26} height={0.03} rotation={FACE} color="#2c3a40" />
        <InkBox size={[0.44, 0.015, 0.035]} color="#9aa0a6" ink={0} />
        <InkBox size={[0.015, 0.44, 0.035]} color="#9aa0a6" ink={0} />
      </group>
    ))}
    <InkBox size={[0.42, 0.05, 0.42]} position={[0.02, 0.36, 0]} color="#1d4fa8" />
    <InkBox size={[0.05, 0.42, 0.42]} position={[-0.2, 0.6, 0]} color="#1d4fa8" />
    <InkCylinder radius={0.06} height={0.03} position={[0.2, 0.06, 0.18]} rotation={FACE} color="#2c3a40" />
    <InkCylinder radius={0.06} height={0.03} position={[0.2, 0.06, -0.18]} rotation={FACE} color="#2c3a40" />
  </group>
);

// The opened control board behind the button: CLOSE runs to a cut wire, and to the door motor only through FIRE MODE.
export const PanelGuts: React.FC<{ position: Vec3; open: number; fire: number; cutAt?: number }> = ({ position, open, fire, cutAt }) => {
  const hot = fire > 0.5;
  const copper = hot ? "#ffb347" : "#b87333";
  return (
    <group position={position}>
      <InkBox size={[1.3, 1.7, 0.06]} color="#1c2b45" />
      <InkCylinder radius={0.12} height={0.06} position={[0, 0.6, 0.05]} rotation={FACE} color={hot ? "#ff3b30" : "#f2f2ec"} emissive={hot ? "#ff3b30" : undefined} />
      {hot && <Halo position={[0, 0.6, 0.08]} size={0.6} color="#ff3b30" strength={0.6} />}
      <Label text="CLOSE" position={[0, 0.38, 0.04]} width={0.42} />
      <InkBox size={[0.03, 0.3, 0.02]} position={[0, 0.17, 0.04]} color={copper} emissive={hot ? "#ff8a00" : undefined} ink={0} />
      {/* the everyday wire: goes nowhere */}
      <InkBox size={[0.42, 0.03, 0.02]} position={[0.21, 0.03, 0.04]} color="#b87333" ink={0} />
      <InkBox size={[0.03, 0.12, 0.02]} position={[0.42, -0.02, 0.04]} rotation={[0, 0, 0.5]} color="#b87333" ink={0} />
      <Label text={"NOT\nCONNECTED"} position={[0.4, -0.27, 0.04]} width={0.44} bg="#e0262f" fg="#ffffff" appear={cutAt} />
      {/* the fire wire: through the key switch to the doors */}
      <InkBox size={[0.03, 0.16, 0.02]} position={[-0.3, -0.03, 0.04]} color={copper} emissive={hot ? "#ff8a00" : undefined} ink={0} />
      <InkBox size={[0.3, 0.03, 0.02]} position={[-0.15, 0.03, 0.04]} color={copper} emissive={hot ? "#ff8a00" : undefined} ink={0} />
      {/* the key switch, labelled above so the label clears the captions */}
      <group position={[-0.3, -0.2, 0.05]} scale={1.3}>
        <InkBox size={[0.22, 0.32, 0.04]} color="#e6ecf2" />
        <group position={[0, 0, 0.03]} rotation={[(fire - 0.5) * 1.2, 0, 0]}>
          <InkBox size={[0.04, 0.14, 0.04]} position={[0, 0.07, 0]} color={fire > 0.5 ? "#3ccf6e" : "#e04646"} ink={0.004} />
        </group>
      </group>
      <Label text="FIRE MODE" position={[-0.3, 0.16, 0.05]} width={0.4} bg="#ffd23f" />
      {/* the front cover, hinged on the left */}
      <group position={[-0.65, 0, 0.09]} rotation={[0, -open * 1.9, 0]}>
        <InkBox size={[1.3, 1.7, 0.03]} position={[0.65, 0, 0]} color={STEEL} />
        <InkCylinder radius={0.12} height={0.04} position={[0.65, 0.3, 0.03]} rotation={FACE} color="#f2f2ec" />
        <Label text="CLOSE" position={[0.65, 0.08, 0.02]} width={0.42} />
      </group>
    </group>
  );
};

// A thick law book lying on a desk, cover up; `stamped` shows the red PASSED imprint.
export const LawBook: React.FC<{ position: Vec3; stamped: number }> = ({ position, stamped }) => (
  <group position={position}>
    <InkBox size={[0.62, 0.1, 0.44]} position={[0, 0.05, 0]} color="#1d4fa8" />
    <InkBox size={[0.6, 0.08, 0.02]} position={[0, 0.05, 0.215]} color="#fffdf4" ink={0} />
    <Label text={"DISABILITY\nLAW"} position={[0, 0.102, -0.08]} rotation={[-Math.PI / 2, 0, 0]} width={0.5} bg="#1d4fa8" fg="#ffd23f" border={false} />
    {stamped >= 0 && <Label text="PASSED" position={[0.02, 0.103, 0.12]} rotation={[-Math.PI / 2, 0, -0.12]} width={0.36} bg="#fffdf4" fg="#e0262f" appear={stamped} />}
  </group>
);

// A rubber stamp hovering above a point; `press` 0..1 brings it down.
export const Stamp: React.FC<{ position: Vec3; press: number; scale?: Vec3 }> = ({ position, press, scale = [1, 1, 1] }) => (
  <group position={[position[0], position[1] + 0.32 * (1 - press), position[2]]} scale={scale}>
    <InkBox size={[0.22, 0.06, 0.14]} position={[0, 0.03, 0]} color="#e0262f" />
    <InkCylinder radius={0.03} height={0.16} position={[0, 0.14, 0]} color="#6b3e1f" />
    <InkCylinder radius={0.06} height={0.06} position={[0, 0.24, 0]} color="#6b3e1f" />
  </group>
);

// A crosswalk pole: the push-button box with its sign, a WAIT/WALK head on top. `fall` 0..1 drops the sign
// onto whoever stands at `fallTo` (relative x, y).
export const CrosswalkPole: React.FC<{ position: Vec3; press?: number; walk?: boolean; fall?: number; fallTo?: [number, number]; shake?: number }> = ({
  position,
  press = 0,
  walk = false,
  fall = 0,
  fallTo = [0.3, 1.36],
  shake = 0,
}) => {
  const signY = 1.62 + (fallTo[1] - 1.62) * fall;
  const signX = fallTo[0] * fall;
  return (
    <group position={position}>
      <group rotation={[0, 0, Math.sin(shake * 2.2) * 0.04 * Math.min(1, Math.abs(shake))]}>
        <InkCylinder radius={0.045} height={2.6} position={[0, 1.3, 0]} color="#2c3a40" />
        <InkBox size={[0.36, 0.3, 0.14]} position={[0, 2.35, 0.08]} color="#1d1a1a" />
        <Screen position={[0, 2.35, 0.16]} size={[0.28, 0.2]} text={walk ? "WALK" : "WAIT"} glow={walk ? "#ffffff" : "#ff7a1a"} bg="#100804" />
        <InkBox size={[0.14, 0.2, 0.08]} position={[0, 1.08, 0.08]} color="#ffd23f" />
        <InkCylinder radius={0.04} height={0.03} position={[0, 1.08, 0.13 - press * 0.015]} rotation={FACE} color="#9aa0a6" />
      </group>
      <group position={[signX, signY, 0.07 + 0.1 * fall]} rotation={[0, 0, -fall * 0.35]}>
        <Label text={"TO CROSS\nPUSH BUTTON"} position={[0, 0, 0]} width={0.42} />
      </group>
    </group>
  );
};

// A wall of walk buttons: `dead` 0..1 of them (up to `share`) turn grey with a red cross.
const ORDER = Array.from({ length: 48 }, (_, i) => (i * 29 + 7) % 48);
export const ButtonWall: React.FC<{ position: Vec3; dead: number; share?: number }> = ({ position, dead, share = 0.77 }) => {
  const n = Math.round(dead * share * 48);
  const isDead = new Set(ORDER.slice(0, n));
  return (
    <group position={position}>
      <InkBox size={[1.6, 1.1, 0.05]} color="#2c3a40" />
      {Array.from({ length: 48 }, (_, i) => {
        const x = -0.7 + (i % 8) * 0.2;
        const y = 0.42 - Math.floor(i / 8) * 0.17;
        const d = isDead.has(i);
        return (
          <group key={i} position={[x, y, 0.04]}>
            <InkBox size={[0.13, 0.13, 0.03]} color={d ? "#6b7178" : "#ffd23f"} ink={0.003} />
            <InkCylinder radius={0.04} height={0.02} position={[0, 0, 0.02]} rotation={FACE} color={d ? "#9aa0a6" : "#3ccf6e"} emissive={d ? undefined : "#1e8a44"} ink={0.002} />
            {d && (
              <>
                <InkBox size={[0.16, 0.025, 0.01]} position={[0, 0, 0.035]} rotation={[0, 0, 0.785]} color="#e0262f" ink={0} />
                <InkBox size={[0.16, 0.025, 0.01]} position={[0, 0, 0.035]} rotation={[0, 0, -0.785]} color="#e0262f" ink={0} />
              </>
            )}
          </group>
        );
      })}
    </group>
  );
};

// A traffic light that cycles on its own (`f` drives it).
export const TrafficLight: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => {
  const phase = Math.floor(f / 14) % 3;
  const colors = ["#ff3b30", "#ffd23f", "#3ccf6e"];
  return (
    <group position={position}>
      <InkBox size={[0.24, 0.66, 0.16]} color="#1d1a1a" />
      {colors.map((c, i) => (
        <group key={c}>
          <InkCylinder radius={0.07} height={0.03} position={[0, 0.2 - i * 0.2, 0.09]} rotation={FACE} color={phase === i ? c : "#3a3f45"} emissive={phase === i ? c : undefined} ink={0.003} />
          {phase === i && <Halo position={[0, 0.2 - i * 0.2, 0.12]} size={0.35} color={c} strength={0.7} />}
        </group>
      ))}
    </group>
  );
};

// A 1970s signal cabinet with relays and a cable from the walk button; `unplug` 0..1 pulls the cable out.
export const SignalCabinet: React.FC<{ position: Vec3; unplug: number; f: number }> = ({ position, unplug, f }) => (
  <group position={position}>
    <InkBox size={[0.9, 1.6, 0.5]} position={[0, 0.8, 0]} color="#d8c9a3" />
    <InkBox size={[0.7, 0.5, 0.02]} position={[0, 1.2, 0.26]} color="#3a3f45" ink={0.004} />
    {[0, 1, 2].map((i) => (
      <InkCylinder key={i} radius={0.07} height={0.05} position={[-0.22 + i * 0.22, 1.2, 0.29]} rotation={[FACE[0], 0, f * 0.05 * (i + 1)]} color="#e8b04a" />
    ))}
    <Label text="WALK BUTTON" position={[0, 0.72, 0.26]} width={0.62} bg="#ffd23f" />
    <InkBox size={[0.08, 0.06, 0.04]} position={[0, 0.52, 0.27]} color="#1d1a1a" ink={0.003} />
    {/* the cable: plugged in, then yanked out and dangling */}
    <group position={[0, 0.52 - unplug * 0.3, 0.32 + unplug * 0.2]} rotation={[unplug * 0.8, 0, unplug * 0.4]}>
      <InkBox size={[0.06, 0.05, 0.08]} color="#e0262f" ink={0.003} />
      <InkBox size={[0.025, 0.025, 0.6]} position={[0, -0.02, 0.33]} color="#1d1a1a" ink={0} />
    </group>
  </group>
);
