import React from "react";
import { InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Libra Friend Cannot Pick a Restaurant".

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale }) => (
  <mesh position={position} scale={scale} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

// A parked car seen from the front: dashboard, wheel, seat backs, pillars (ghost: the puppets sit inside it).
// Front seats at z = -0.35 relative to `position`, the back seat at z = -1.0.
export const CarInterior: React.FC<{ position: Vec3; color?: string; wheelTurn?: number; coin?: boolean }> = ({ position, color = "#5b7fb8", wheelTurn = 0, coin = true }) => (
  <group position={position} userData={{ ghost: true }}>
    {/* seat backs */}
    {[-0.42, 0.42].map((x) => (
      <InkBox key={x} size={[0.6, 0.85, 0.15]} position={[x, 0.65, -0.55]} color="#3a3a44" />
    ))}
    <InkBox size={[1.5, 0.8, 0.15]} position={[0, 0.62, -1.2]} color="#3a3a44" />
    {/* body sides and roof pillars */}
    {[-0.95, 0.95].map((x) => (
      <group key={x}>
        <InkBox size={[0.1, 0.55, 2.2]} position={[x, 0.45, -0.6]} color={color} />
        <InkBox size={[0.06, 0.95, 0.06]} position={[x * 0.95, 1.2, 0.35]} rotation={[0.35, 0, 0]} color={color} ink={0.004} />
        <InkBox size={[0.06, 1.0, 0.06]} position={[x * 0.97, 1.15, -1.5]} color={color} ink={0.004} />
      </group>
    ))}
    <InkBox size={[1.95, 0.06, 1.9]} position={[0, 1.66, -0.6]} color={color} />
    {/* dashboard in front */}
    <InkBox size={[1.9, 0.18, 0.4]} position={[0, 0.66, 0.35]} color="#2a2a30" />
    <InkBox size={[1.86, 0.5, 0.1]} position={[0, 0.33, 0.47]} color={color} />
    {/* steering wheel in front of the left seat */}
    <group position={[-0.42, 0.7, 0.28]} rotation={[-0.9, 0, wheelTurn]}>
      <mesh>
        <torusGeometry args={[0.17, 0.025, 10, 28]} />
        <meshToonMaterial color="#1d1a1a" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.3, 0.03, 0.03]} position={[0, 0, 0]} color="#1d1a1a" ink={0.002} />
    </group>
    {coin && <InkCylinder radius={0.04} height={0.01} position={[0.3, 0.77, 0.32]} color="#f2c14e" ink={0.002} />}
  </group>
);

// A giant open notebook on an easel: three columns PROS / CONS / BOTH, `ticks` 0..1 fills them with marks.
export const ListBook: React.FC<{ position: Vec3; ticks?: number; heads?: number }> = ({ position, ticks = 0, heads = 99 }) => {
  const cols = ["PROS", "CONS", "BOTH"];
  return (
    <group position={position}>
      <InkBox size={[2.0, 1.3, 0.05]} position={[0, 0, 0]} color="#fffaf0" />
      <InkBox size={[0.03, 1.3, 0.01]} position={[0, 0, 0.03]} color="#c9b48a" ink={0} />
      {[-0.33, 0.33].map((x) => (
        <InkBox key={x} size={[0.015, 1.05, 0.01]} position={[x, -0.08, 0.03]} color="#7fa8d8" ink={0} />
      ))}
      {cols.map((c, i) => (
        <Label key={c} text={c} position={[(i - 1) * 0.66, 0.5, 0.06]} width={0.45} fg="#ffffff" bg={["#3ccf6e", "#e04646", "#7b2cbf"][i]} appear={heads - i * 6} />
      ))}
      {cols.map((_, i) =>
        Array.from({ length: 5 }, (_, k) => {
          const show = ticks * 15 > i * 5 + k;
          return show ? <InkBox key={`${i}${k}`} size={[0.32 - (k % 2) * 0.08, 0.025, 0.02]} position={[(i - 1) * 0.66, 0.3 - k * 0.17, 0.045]} color="#2a2a30" ink={0} /> : null;
        }),
      )}
      <InkBox size={[0.05, 1.6, 0.05]} position={[-0.7, -0.9, -0.1]} rotation={[0, 0, 0.1]} color="#8a5a3a" ink={0.003} />
      <InkBox size={[0.05, 1.6, 0.05]} position={[0.7, -0.9, -0.1]} rotation={[0, 0, -0.1]} color="#8a5a3a" ink={0.003} />
    </group>
  );
};

// Round restaurant table with a cloth; `coin` shows the lucky coin lying flat (`edge` stands it up).
export const RoundTable: React.FC<{ position: Vec3; cloth?: string; coin?: "flat" | "edge" | "none" }> = ({ position, cloth = "#fff6dc", coin = "flat" }) => (
  <group position={position}>
    <InkCylinder radius={0.5} height={0.04} position={[0, 0.66, 0]} color={cloth} />
    <InkCylinder radius={0.52} height={0.16} position={[0, 0.58, 0]} color={cloth} ink={0.003} />
    <InkCylinder radius={0.05} height={0.5} position={[0, 0.25, 0]} color="#3a2a1a" ink={0.003} />
    <InkCylinder radius={0.25} height={0.03} position={[0, 0.015, 0]} color="#3a2a1a" ink={0.003} />
    {[-0.25, 0.25].map((x) => (
      <InkCylinder key={x} radius={0.11} height={0.015} position={[x, 0.7, 0.18]} color="#ffffff" ink={0.003} />
    ))}
    {coin === "flat" && <InkCylinder radius={0.045} height={0.012} position={[0.05, 0.7, 0.05]} color="#f2c14e" ink={0.002} />}
    {coin === "edge" && <InkCylinder radius={0.045} height={0.012} position={[0.05, 0.73, 0.05]} rotation={[Math.PI / 2, 0, 0]} color="#f2c14e" ink={0.002} />}
  </group>
);

// Waitress's tray with two covered plates, labelled CHICKEN and FISH (ghost: carried at hand height).
export const Tray: React.FC<{ position: Vec3; lids?: number; labels?: number }> = ({ position, lids = 1, labels = 99 }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkCylinder radius={0.37} height={0.02} position={[0, 0, 0]} color="#c9ced3" ink={0.003} />
    {[-0.16, 0.16].map((x, i) => (
      <group key={x} position={[x, 0.01, 0]}>
        <InkCylinder radius={0.11} height={0.012} position={[0, 0.01, 0]} color="#ffffff" ink={0.002} />
        <mesh position={[0, 0.02 + (1 - lids) * 0.2, 0]}>
          <sphereGeometry args={[0.09, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshToonMaterial color="#e6ecf2" gradientMap={toonRamp} />
        </mesh>
        <Label text={i ? "FISH" : "CHICKEN"} position={[0, 0.14, 0.12]} width={0.24} fg="#ffffff" bg={i ? "#2f6bff" : "#e76f51"} appear={labels - i * 8} />
      </group>
    ))}
  </group>
);

// The giant scale: post, beam, two pans on chains. `tilt` in radians rocks the beam.
export const BigScale: React.FC<{ position: Vec3; tilt?: number; scale?: number }> = ({ position, tilt = 0, scale = 1 }) => {
  const half = 1.0;
  const pan = (side: 1 | -1) => {
    const x = side * half * Math.cos(tilt);
    const y = 2.2 + side * half * Math.sin(tilt);
    return (
      <group key={side} position={[x, y, 0]}>
        {[-1, 1].map((k) => (
          <InkBox key={k} size={[0.015, 0.7, 0.015]} position={[k * 0.15, -0.35, 0]} rotation={[0, 0, -k * 0.2]} color="#c9962b" ink={0} />
        ))}
        <InkCylinder radius={0.32} height={0.05} position={[0, -0.72, 0]} color="#e8b923" />
      </group>
    );
  };
  return (
    <group position={position} scale={scale}>
      <InkCylinder radius={0.4} height={0.1} position={[0, 0.05, 0]} color="#c9962b" />
      <InkCylinder radius={0.06} height={2.2} position={[0, 1.15, 0]} color="#e8b923" />
      <group position={[0, 2.2, 0]} rotation={[0, 0, tilt]}>
        <InkBox size={[2.1, 0.07, 0.07]} position={[0, 0, 0]} color="#e8b923" />
      </group>
      <Ball position={[0, 2.32, 0]} radius={0.09} color="#e8b923" />
      {pan(-1)}
      {pan(1)}
    </group>
  );
};

// A big dial on the wall, 0..1 `level`, the last segment glowing red.
export const Dial: React.FC<{ position: Vec3; level: number; size?: number }> = ({ position, level, size = 0.5 }) => {
  const segs = 6;
  return (
    <group position={position}>
      <InkCylinder radius={size * 1.12} height={0.06} position={[0, 0, -0.03]} rotation={[Math.PI / 2, 0, 0]} color="#2a2a30" />
      {Array.from({ length: segs }, (_, i) => (
        <mesh key={i} position={[0, 0, 0.02]}>
          <ringGeometry args={[size * 0.6, size, 12, 1, Math.PI * 1.25 - ((i + 1) * Math.PI * 1.5) / segs, (Math.PI * 1.5) / segs - 0.03]} />
          <meshBasicMaterial color={["#3ccf6e", "#7ed957", "#ffd23f", "#ffb347", "#ff7a3a", "#e0262f"][i]} toneMapped={false} />
        </mesh>
      ))}
      <group position={[0, 0, 0.045]} rotation={[0, 0, Math.PI * 0.75 - level * Math.PI * 1.5]}>
        <InkBox size={[0.03, size * 0.95, 0.02]} position={[0, size * 0.47, 0]} color="#ffffff" ink={0.002} />
      </group>
      <Ball position={[0, 0, 0.07]} radius={0.06} color="#ffffff" />
    </group>
  );
};

// A big gold coin with YES on both faces; `spin` turns it around y, `flip` around x.
export const YesCoin: React.FC<{ position: Vec3; spin?: number; flip?: number; size?: number }> = ({ position, spin = 0, flip = 0, size = 0.4 }) => (
  <group position={position} rotation={[flip, spin, 0]}>
    <InkCylinder radius={size} height={size * 0.12} rotation={[Math.PI / 2, 0, 0]} color="#e8b923" />
    {[1, -1].map((s) => (
      <group key={s} position={[0, 0, s * (size * 0.06 + Math.max(0.004, size * 0.03))]} rotation={[0, s > 0 ? 0 : Math.PI, 0]}>
        <Label text="YES" position={[0, 0, 0]} width={size * 1.2} fg="#7a5a10" bg="#f2d16b" border={false} />
      </group>
    ))}
  </group>
);

// Sofa with cushions (Nina sits on it).
export const Sofa: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#5b7fb8" }) => (
  <group position={position}>
    <InkBox size={[1.7, 0.32, 0.7]} position={[0, 0.16, 0]} color={color} />
    <InkBox size={[1.7, 0.6, 0.18]} position={[0, 0.6, -0.28]} color={color} />
    {[-0.94, 0.94].map((x) => (
      <InkBox key={x} size={[0.2, 0.52, 0.8]} position={[x, 0.26, 0]} color={color} />
    ))}
  </group>
);

// Takeout bag (paper, folded top) and a red fries box.
export const TakeoutBag: React.FC<{ position: Vec3; fries?: boolean }> = ({ position, fries }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.2, 0.26, 0.12]} position={[0, 0.13, 0]} color="#c9a26b" />
    <InkBox size={[0.215, 0.04, 0.135]} position={[0, 0.275, 0]} color="#b08a55" ink={0.002} />
    {fries && (
      <group position={[0.18, 0.08, 0.05]}>
        <InkBox size={[0.1, 0.12, 0.06]} position={[0, 0.06, 0]} color="#e0262f" />
        {[-0.03, -0.01, 0.01, 0.03].map((x, i) => (
          <InkBox key={x} size={[0.012, 0.08, 0.012]} position={[x, 0.15 + (i % 2) * 0.02, 0]} color="#ffd23f" ink={0} />
        ))}
      </group>
    )}
  </group>
);

// A balloon on a string.
export const Balloon: React.FC<{ position: Vec3; color: string; f: number }> = ({ position, color, f }) => (
  <group position={position} rotation={[0, 0, Math.sin(f / 9) * 0.08]} userData={{ ghost: true }}>
    <InkBox size={[0.006, 0.6, 0.006]} position={[0, 0.3, 0]} color="#ffffff" ink={0} />
    <Ball position={[0, 0.72, 0]} radius={0.15} color={color} scale={[1, 1.2, 1]} />
  </group>
);

// A menu card flying through the air (ghost).
export const FlyingMenu: React.FC<{ position: Vec3; spin: number }> = ({ position, spin }) => (
  <group position={position} rotation={[spin, spin * 0.7, spin * 0.3]} userData={{ ghost: true }}>
    <InkBox size={[0.3, 0.42, 0.02]} position={[0, 0, 0]} color="#7a1226" />
    <InkBox size={[0.22, 0.03, 0.025]} position={[0, 0.12, 0]} color="#f2c14e" ink={0} />
  </group>
);

export const tiltWobble = (f: number, amount = 0.25, decay = 12) => Math.sin(f / 2.2) * amount * Math.exp(-f / decay);
