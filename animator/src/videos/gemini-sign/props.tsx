import React from "react";
import * as THREE from "three";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Gemini Friend Is Two People".

const INK = "#161212";

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; opacity?: number; scale?: Vec3 }> = ({ position, radius, color, glow, opacity = 1, scale }) => (
  <mesh position={position} scale={scale} castShadow={!glow && opacity === 1}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? (
      <meshBasicMaterial color={color} toneMapped={false} />
    ) : (
      <meshToonMaterial color={color} gradientMap={toonRamp} transparent={opacity < 1} opacity={opacity} />
    )}
  </mesh>
);

// Round brunch table with plates and two coffee cups; `tip` 0..1 knocks the right-hand cup over.
export const BrunchTable: React.FC<{ position: Vec3; tip?: number; top?: string }> = ({ position, tip = 0, top = "#fff6dc" }) => (
  <group position={position}>
    <InkCylinder radius={0.42} height={0.04} position={[0, 0.62, 0]} color={top} />
    <InkCylinder radius={0.04} height={0.6} position={[0, 0.3, 0]} color="#3a3a44" ink={0.004} />
    <InkCylinder radius={0.2} height={0.03} position={[0, 0.015, 0]} color="#3a3a44" ink={0.004} />
    {[-0.2, 0.2].map((x) => (
      <InkCylinder key={x} radius={0.12} height={0.015} position={[x, 0.65, 0.12]} color="#ffffff" ink={0.003} />
    ))}
    <Ball position={[-0.2, 0.68, 0.12]} radius={0.05} color="#ffd23f" scale={[1, 0.35, 1]} />
    <Ball position={[0.2, 0.68, 0.12]} radius={0.05} color="#ff8fc8" scale={[1, 0.5, 1]} />
    <InkCylinder radius={0.035} height={0.08} position={[-0.12, 0.68, -0.15]} color="#ffffff" ink={0.003} />
    <group position={[0.14, 0.64, -0.12]} rotation={[0, 0, -tip * 1.5]}>
      <InkCylinder radius={0.035} height={0.08} position={[0, 0.04, 0]} color="#ffffff" ink={0.003} />
    </group>
    {tip > 0.5 && <InkCylinder radius={0.09 + tip * 0.06} height={0.004} position={[0.32, 0.643, -0.05]} color="#6b3a1f" ink={0} />}
  </group>
);

// Coffee pouring off the table edge into a lap: a falling stream of drops (ghost).
export const CoffeeSplash: React.FC<{ position: Vec3; f: number; amount: number }> = ({ position, f, amount }) => (
  <group position={position} userData={{ ghost: true }}>
    {amount > 0 &&
      Array.from({ length: 9 }, (_, i) => {
        const t = (f * 0.09 + i / 9) % 1;
        return <Ball key={i} position={[Math.sin(i * 2.1) * 0.05 + t * 0.12, -t * 0.32, Math.cos(i) * 0.03]} radius={0.022 * amount} color="#6b3a1f" />;
      })}
  </group>
);

// A brown stain on a lap (flat disc, ghost so it never counts as a set object).
export const Stain: React.FC<{ position: Vec3; size: number }> = ({ position, size }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh rotation={[0, 0, 0]}>
      <circleGeometry args={[size, 20]} />
      <meshBasicMaterial color="#6b3a1f" />
    </mesh>
  </group>
);

// Speech bubble with a word in it, pinned to the air (ghost).
export const Bubble: React.FC<{ position: Vec3; text: string; appear: number; color?: string }> = ({ position, text, appear, color = "#ffffff" }) =>
  appear < 0 ? null : (
    <group position={position} userData={{ ghost: true }}>
      <Label text={text} position={[0, 0, 0]} width={0.1 + text.length * 0.07} fg="#13235e" bg={color} appear={appear} />
    </group>
  );

// Wall hook with a jacket hanging on it.
export const HangingJacket: React.FC<{ position: Vec3; color: string; sway?: number }> = ({ position, color, sway = 0 }) => (
  <group position={position}>
    <InkBox size={[0.06, 0.06, 0.08]} position={[0, 0, 0.04]} color="#c9ced3" ink={0.004} />
    <group position={[0, -0.04, 0.08]} rotation={[0, 0, sway]}>
      <InkBox size={[0.38, 0.5, 0.06]} position={[0, -0.3, 0]} color={color} />
      <InkBox size={[0.1, 0.42, 0.05]} position={[-0.24, -0.3, 0]} rotation={[0, 0, 0.12]} color={color} />
      <InkBox size={[0.1, 0.42, 0.05]} position={[0.24, -0.3, 0]} rotation={[0, 0, -0.12]} color={color} />
      <InkBox size={[0.02, 0.48, 0.065]} position={[0, -0.3, 0]} color="#f7f7f2" ink={0} />
    </group>
  </group>
);

// Small phone screen on a stand: a group chat with its name and an unread bubble that buzzes.
export const ChatPhone: React.FC<{ position: Vec3; name: string; f: number; seed: number; glow: string; on?: boolean }> = ({ position, name, f, seed, glow, on = true }) => {
  const buzz = on && (f + seed * 7) % 24 < 3 ? Math.sin(f * 3) * 0.02 : 0;
  return (
    <group position={[position[0] + buzz, position[1], position[2]]}>
      <InkBox size={[0.36, 0.56, 0.04]} color="#14102a" ink={0.005} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[0.3, 0.48]} />
        <meshBasicMaterial color={on ? glow : "#2a2440"} toneMapped={false} />
      </mesh>
      <Label text={name} position={[0, 0.12, 0.03]} width={0.28} fg="#ffffff" bg="#13235e" border={false} />
      {on && <Ball position={[0.15, 0.25, 0.04]} radius={0.05} color="#e0262f" glow />}
    </group>
  );
};

// A steering wheel tilted toward the driver (who sits behind it at -z), turned by `turn` radians, its label on the hub.
const Wheel: React.FC<{ position: Vec3; turn: number; color: string; label?: string }> = ({ position, turn, color, label }) => (
  <group position={position} rotation={[-0.75, 0, 0]}>
    <group rotation={[0, 0, turn]}>
      <mesh>
        <torusGeometry args={[0.2, 0.025, 10, 32]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.38, 0.03, 0.03]} color={INK} ink={0} />
      <InkBox size={[0.03, 0.2, 0.03]} position={[0, -0.1, 0]} color={INK} ink={0} />
      {label && <Label text={label} position={[0, 0.02, 0.03]} width={0.3} fg="#ffffff" bg={INK} border={false} />}
    </group>
  </group>
);

// Open-top car facing the camera (+z): two seats side by side, a steering wheel in front of each, a dashboard,
// fuzzy dice. Drivers sit at x = ±CAR_SEAT_X, z = 0 (local). `turnA`/`turnB` turn the wheels, `dice` swings the dice.
export const CAR_SEAT_X = 0.42;
export const TwinCar: React.FC<{ position: Vec3; turnA?: number; turnB?: number; dice?: number; lean?: number; labels?: boolean }> = ({ position, turnA = 0, turnB = 0, dice, lean = 0, labels = true }) => (
  <group position={position} rotation={[0, 0, lean]}>
    {/* body: floor pan, side walls outside the seats, bonnet in front, boot behind */}
    <InkBox size={[1.5, 0.12, 1.9]} position={[0, 0.16, 0.15]} color="#ff4fa0" />
    <InkBox size={[0.1, 0.36, 1.1]} position={[-0.78, 0.4, 0.05]} color="#ff4fa0" />
    <InkBox size={[0.1, 0.36, 1.1]} position={[0.78, 0.4, 0.05]} color="#ff4fa0" />
    <InkBox size={[1.6, 0.36, 0.6]} position={[0, 0.36, 1.0]} color="#ff4fa0" />
    <InkBox size={[1.6, 0.4, 0.3]} position={[0, 0.36, -0.62]} color="#ff4fa0" />
    {/* headlights */}
    {[-0.55, 0.55].map((x) => (
      <InkCylinder key={x} radius={0.09} height={0.04} position={[x, 0.4, 1.31]} rotation={[Math.PI / 2, 0, 0]} color="#fff6c8" ink={0.004} />
    ))}
    {/* dashboard and windscreen frame */}
    <InkBox size={[1.5, 0.12, 0.2]} position={[0, 0.58, 0.62]} color="#2b1a33" />
    <mesh position={[0, 0.85, 0.72]} rotation={[0.3, 0, 0]}>
      <planeGeometry args={[1.4, 0.4]} />
      <meshBasicMaterial color="#cfe9ff" transparent opacity={0.2} />
    </mesh>
    {/* seats: a cushion under each driver and a back behind */}
    {[-CAR_SEAT_X, CAR_SEAT_X].map((x) => (
      <group key={x}>
        <InkBox size={[0.42, 0.12, 0.4]} position={[x, 0.28, -0.02]} color="#f7f2e6" />
        <InkBox size={[0.42, 0.5, 0.08]} position={[x, 0.55, -0.3]} color="#f7f2e6" />
      </group>
    ))}
    <Wheel position={[-CAR_SEAT_X, 0.6, 0.42]} turn={turnA} color="#ff8fc8" label={labels ? "MOOD A" : undefined} />
    <Wheel position={[CAR_SEAT_X, 0.6, 0.42]} turn={turnB} color="#4f9dff" label={labels ? "MOOD B" : undefined} />
    {/* tyres */}
    {[
      [-0.8, 0.85],
      [0.8, 0.85],
      [-0.8, -0.45],
      [0.8, -0.45],
    ].map(([x, z]) => (
      <InkCylinder key={`${x}${z}`} radius={0.17} height={0.12} position={[x, 0.17, z]} rotation={[0, 0, Math.PI / 2]} color="#1d1a1a" />
    ))}
    {/* fuzzy dice from the mirror (left out when `dice` is undefined) */}
    {dice !== undefined && (
    <group position={[0, 1.1, 0.74]} rotation={[dice * 0.3, 0, dice]}>
      <InkBox size={[0.012, 0.16, 0.012]} position={[0, -0.08, 0]} color={INK} ink={0} />
      <InkBox size={[0.07, 0.07, 0.07]} position={[-0.04, -0.19, 0]} rotation={[0.3, 0.5, 0]} color="#ffffff" ink={0.003} />
      <InkBox size={[0.07, 0.07, 0.07]} position={[0.04, -0.2, 0]} rotation={[0.6, 0.2, 0.3]} color="#ffd23f" ink={0.003} />
    </group>
    )}
  </group>
);

// A coin spinning on its edge; `f` drives the spin, `wobble` 0..1 adds a precession.
export const SpinningCoin: React.FC<{ position: Vec3; f: number; size?: number }> = ({ position, f, size = 0.16 }) => (
  <group position={position}>
    <group position={[0, size, 0]} rotation={[0, f * 0.45, Math.sin(f / 9) * 0.12]}>
      <InkCylinder radius={size} height={0.025} rotation={[Math.PI / 2, 0, 0]} color="#ffc93c" ink={0.004} />
      <InkCylinder radius={size * 0.7} height={0.028} rotation={[Math.PI / 2, 0, 0]} color="#e8a91a" ink={0} />
    </group>
  </group>
);

// GROUP CHATS switchboard: 12 jacks (4 x 3), each with a blinking light and a cable arcing down to the desk.
export const Switchboard: React.FC<{ position: Vec3; f: number; plugged?: number; buzz?: number }> = ({ position, f, plugged = 12, buzz = 1 }) => {
  const jacks = Array.from({ length: 12 }, (_, i) => [-0.6 + (i % 4) * 0.4, 1.7 - Math.floor(i / 4) * 0.32] as [number, number]);
  return (
    <group position={position}>
      <InkBox size={[1.9, 1.3, 0.16]} position={[0, 1.42, 0]} color="#5a2e14" />
      <InkBox size={[2.0, 0.75, 0.7]} position={[0, 0.375, 0.3]} color="#7a3e1a" />
      <InkBox size={[2.0, 0.05, 0.72]} position={[0, 0.77, 0.3]} color="#c9a26b" />
      {jacks.map(([x, y], i) => {
        const on = i < plugged;
        const blink = on && (f + i * 5) % 12 < 6;
        const jig = on ? Math.sin(f * 1.7 + i) * 0.012 * buzz : 0;
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, 0.12), new THREE.Vector3(x * 0.7 + jig, 1.0 + jig, 0.45), new THREE.Vector3(x * 0.5, 0.8, 0.5)]);
        return (
          <group key={i}>
            <InkCylinder radius={0.045} height={0.04} position={[x, y, 0.09]} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.003} />
            <Ball position={[x + 0.12, y + 0.08, 0.1]} radius={0.03} color={blink ? "#ffd23f" : "#5a3a10"} glow={blink} />
            {on && (
              <mesh>
                <tubeGeometry args={[curve, 16, 0.014, 6, false]} />
                <meshToonMaterial color={["#e0262f", "#3fae5a", "#4f7dff", "#ffd23f"][i % 4]} gradientMap={toonRamp} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// Stylised tree: trunk and two stacked cones.
export const Tree: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#2f7a3a" }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.08} height={0.6} position={[0, 0.3, 0]} color="#6b4423" />
    <mesh position={[0, 0.95, 0]} castShadow>
      <coneGeometry args={[0.5, 0.9, 8]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 1.45, 0]} castShadow>
      <coneGeometry args={[0.36, 0.7, 8]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A rock to trip over.
export const Rock: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#8a8a8f" }) => (
  <group position={position} scale={scale}>
    <Ball position={[0, 0.06, 0]} radius={0.14} color={color} scale={[1.3, 0.6, 1]} />
  </group>
);

// Far mountain backdrop cone (flat-shaded).
export const Peak: React.FC<{ position: Vec3; radius: number; height: number; color: string; snow?: boolean }> = ({ position, radius, height, color, snow }) => (
  <group position={position}>
    <mesh position={[0, height / 2, 0]}>
      <coneGeometry args={[radius, height, 7]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    {snow && (
      <mesh position={[0, height * 0.86, 0]}>
        <coneGeometry args={[radius * 0.28, height * 0.28, 7]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} />
      </mesh>
    )}
  </group>
);

// Summit flag on a pole; `wave` animates it.
export const Flag: React.FC<{ position: Vec3; f: number; color?: string }> = ({ position, f, color = "#e0262f" }) => (
  <group position={position}>
    <InkCylinder radius={0.02} height={1.4} position={[0, 0.7, 0]} color="#c9ced3" ink={0.003} />
    <group position={[0, 1.25, 0]} rotation={[0, Math.sin(f / 6) * 0.3, 0]}>
      <InkBox size={[0.5, 0.3, 0.02]} position={[0.26, 0, 0]} color={color} ink={0.004} />
    </group>
  </group>
);

// Earbuds/headphones band over a puppet's head (ghost; placed by the scene).
export const Headphones: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh rotation={[0, 0, 0]}>
      <torusGeometry args={[0.2, 0.02, 8, 24, Math.PI]} />
      <meshToonMaterial color="#1d1a1a" gradientMap={toonRamp} />
    </mesh>
    {[-0.2, 0.2].map((x) => (
      <Ball key={x} position={[x, -0.02, 0.02]} radius={0.06} color="#e0262f" />
    ))}
  </group>
);
