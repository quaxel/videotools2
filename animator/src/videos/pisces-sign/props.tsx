import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "A Pisces Already Planned the Wedding".
// Parts that touch are kept 1-2 cm apart (or fully inside one another) so no two faces are coplanar.

const INK = "#161212";
const FONT = "'Arial Black', Impact, sans-serif";

export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A cel ball with an ink outline.
export const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3; ink?: number; opacity?: number }> = ({
  position,
  radius,
  color,
  glow,
  scale = [1, 1, 1],
  ink = 1.07,
  opacity,
}) => (
  <group position={position} scale={scale}>
    <mesh castShadow={!glow && opacity === undefined}>
      <sphereGeometry args={[radius, 20, 16]} />
      {glow || opacity !== undefined ? (
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
      ) : (
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      )}
    </mesh>
    {!glow && opacity === undefined && ink > 1 && (
      <mesh scale={ink}>
        <sphereGeometry args={[radius, 20, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

export const Heart: React.FC<{ color?: string; position?: Vec3; scale?: number }> = ({ color = "#ff2f6e", position = [0, 0, 0], scale = 1 }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(0, -0.07);
    s.bezierCurveTo(-0.1, 0.0, -0.08, 0.08, 0, 0.04);
    s.bezierCurveTo(0.08, 0.08, 0.1, 0.0, 0, -0.07);
    return s;
  }, []);
  return (
    <group position={position} scale={scale}>
      <mesh scale={1.18} position={[0, 0.0, -0.002]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Hearts that pop out of a point and float up (love at first smile). `t` = frames since they started.
export const HeartBurst: React.FC<{ position: Vec3; t: number; count?: number; spread?: number }> = ({ position, t, count = 6, spread = 0.5 }) => {
  if (t < 0) return null;
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const k = t - i * 3;
        if (k < 0) return null;
        const p = Math.min(1, k / 30);
        const pop = k < 6 ? (k / 6) * 1.25 : 1.25 - Math.min(0.25, (k - 6) * 0.04);
        const fade = 1 - Math.max(0, (k - 34) / 12);
        if (fade <= 0) return null;
        const x = (rnd(i + 3) - 0.5) * spread + Math.sin(k * 0.15 + i) * 0.04;
        return <Heart key={i} position={[x, p * 0.45 + rnd(i) * 0.1, 0.02 * i]} scale={pop * fade * (0.7 + rnd(i + 9) * 0.6)} color={i % 3 ? "#ff2f6e" : "#ff8fc8"} />;
      })}
    </group>
  );
};

export const SkyPlane: React.FC<{ stops: string[]; position: Vec3; size: [number, number] }> = ({ stops, position, size }) => {
  const tex = useMemo(
    () =>
      canvasTexture(256, 1024, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 1024);
        stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 1024);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stops.join("|")],
  );
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} fog={false} toneMapped={false} />
    </mesh>
  );
};

export const MusicNotes: React.FC<{ position: Vec3; f: number; count?: number; color?: string; spread?: number; rise?: number }> = ({ position, f, count = 5, color = "#13235e", spread = 0.5, rise = 0.6 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const t = ((f + i * 13) % 50) / 50;
      const x = (rnd(i) - 0.5) * spread + Math.sin(t * 6 + i) * 0.05;
      const y = t * rise;
      const s = Math.min(1, t * 5) * (1 - Math.max(0, (t - 0.8) / 0.2));
      return (
        <group key={i} position={[x, y, 0.02 * i]} scale={s}>
          <mesh scale={[1.25, 1, 1]}>
            <circleGeometry args={[0.03, 16]} />
            <meshBasicMaterial color={color} />
          </mesh>
          <mesh position={[0.032, 0.07, 0]}>
            <planeGeometry args={[0.012, 0.14]} />
            <meshBasicMaterial color={color} />
          </mesh>
          {i % 2 === 0 && (
            <mesh position={[0.06, 0.12, 0]} rotation={[0, 0, -0.5]}>
              <planeGeometry args={[0.06, 0.02]} />
              <meshBasicMaterial color={color} />
            </mesh>
          )}
        </group>
      );
    })}
  </group>
);

// Tears: drops that run from under both eyes and fall. `at` = the face point (between the eyes, world), `amount` 0..1.
export const Tears: React.FC<{ at: Vec3; f: number; amount?: number; gap?: number }> = ({ at, f, amount = 1, gap = 0.055 }) => {
  if (amount <= 0) return null;
  return (
    <group position={at} userData={{ ghost: true }}>
      {[-1, 1].map((s) =>
        [0, 1, 2].map((k) => {
          const t = ((f + k * 7 + (s > 0 ? 4 : 0)) % 21) / 21;
          const y = -0.02 - t * t * 0.32;
          return <Ball key={`${s}${k}`} position={[s * gap + s * t * 0.02, y, 0.01]} radius={0.013 * amount} color="#7fd3ff" glow scale={[0.8, 1.3, 0.8]} />;
        }),
      )}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * gap, -0.035, 0.005]}>
          <planeGeometry args={[0.014, 0.05 * amount]} />
          <meshBasicMaterial color="#9fe3ff" transparent opacity={0.85} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- coffee shop ----------

// Counter seen from the customer side: vertical wood planks, a butcher-block top (0.62 m tall so the barista reads).
export const CafeCounter: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 2.6 }) => {
  const planks = Math.round(width / 0.16);
  return (
    <group position={position}>
      <InkBox size={[width, 0.6, 0.6]} position={[0, 0.3, 0]} color="#6b4429" />
      {Array.from({ length: planks }, (_, i) => (
        <InkBox key={i} size={[0.012, 0.56, 0.01]} position={[-width / 2 + (i + 0.5) * (width / planks), 0.3, 0.306]} color="#4a2c18" ink={0} />
      ))}
      <InkBox size={[width + 0.08, 0.05, 0.68]} position={[0, 0.625, 0]} color="#b07a45" />
      <InkBox size={[width, 0.06, 0.02]} position={[0, 0.03, 0.31]} color="#3d2416" ink={0} />
    </group>
  );
};

// Espresso machine on the back counter: steel body, two group heads with portafilters, cups upside down on top, steam.
export const EspressoMachine: React.FC<{ position: Vec3; f: number; steam?: boolean }> = ({ position, f, steam = true }) => (
  <group position={position}>
    <InkBox size={[0.8, 0.42, 0.42]} position={[0, 0.21, 0]} color="#a9adb0" />
    <InkBox size={[0.82, 0.05, 0.44]} position={[0, 0.445, 0]} color="#d8dcde" />
    <InkBox size={[0.72, 0.1, 0.02]} position={[0, 0.34, 0.215]} color="#e0262f" ink={0.004} />
    {[-0.2, 0.2].map((x) => (
      <group key={x} position={[x, 0.14, 0.24]}>
        <InkCylinder radius={0.05} height={0.06} position={[0, 0.04, 0]} color="#5b6170" ink={0.004} />
        <InkBox size={[0.03, 0.03, 0.16]} position={[0, 0.0, 0.08]} color="#1d1a1a" ink={0.003} />
      </group>
    ))}
    <InkBox size={[0.6, 0.02, 0.12]} position={[0, 0.03, 0.26]} color="#5b6170" ink={0.003} />
    {/* steam wand */}
    <InkCylinder radius={0.01} height={0.22} position={[0.36, 0.12, 0.24]} rotation={[0, 0, 0.2]} color="#c9ced3" ink={0.003} />
    {/* cups upside-down on the warming tray */}
    {[-0.28, -0.14, 0, 0.14, 0.28].map((x, i) => (
      <InkCylinder key={x} radius={0.045} height={0.07} position={[x, 0.505 + (i % 2) * 0.0, 0.05 - (i % 2) * 0.1]} color="#f2e8d8" ink={0.003} />
    ))}
    {steam && (
      <group userData={{ ghost: true }}>
        {[0, 1, 2, 3].map((k) => {
          const t = ((f + k * 11) % 44) / 44;
          return <Ball key={k} position={[0.39 + Math.sin(t * 5 + k) * 0.04, 0.15 + t * 0.55, 0.3]} radius={0.04 + t * 0.06} color="#ffffff" opacity={0.5 * (1 - t)} />;
        })}
      </group>
    )}
  </group>
);

// Conical grinder with a clear bean hopper.
export const Grinder: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.16, 0.28, 0.2]} position={[0, 0.14, 0]} color="#2a2f3a" />
    <InkCylinder radius={0.07} height={0.16} position={[0, 0.37, 0]} color="#6b4429" ink={0.004} />
    <InkCylinder radius={0.075} height={0.03} position={[0, 0.465, 0]} color="#1d1a1a" ink={0.003} />
  </group>
);

// Curved-glass pastry case on the counter: two shelves of croissants and muffins.
export const PastryCase: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 0.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.04, 0.4]} position={[0, 0.02, 0]} color="#2a2f3a" ink={0.004} />
    {[0.05, 0.2].map((y, r) =>
      Array.from({ length: 4 }, (_, i) => {
        const x = -width / 2 + 0.11 + i * ((width - 0.22) / 3);
        return r === 0 ? (
          <Ball key={`${r}${i}`} position={[x, y + 0.03, 0.02]} radius={0.05} color="#d9963a" scale={[1.4, 0.6, 0.9]} />
        ) : (
          <group key={`${r}${i}`}>
            <InkCylinder radius={0.035} height={0.04} position={[x, y + 0.02, 0.02]} color="#f2e8d8" ink={0.003} />
            <Ball position={[x, y + 0.06, 0.02]} radius={0.042} color={i % 2 ? "#6b3a1e" : "#e88aa8"} scale={[1, 0.7, 1]} />
          </group>
        );
      }),
    )}
    <InkBox size={[width - 0.04, 0.012, 0.36]} position={[0, 0.175, -0.01]} color="#e8eef0" ink={0} />
    <mesh position={[0, 0.17, 0.205]}>
      <planeGeometry args={[width, 0.34]} />
      <meshBasicMaterial color="#dff3ff" transparent opacity={0.22} depthWrite={false} />
    </mesh>
    <InkBox size={[width, 0.02, 0.4]} position={[0, 0.35, 0]} color="#2a2f3a" ink={0.003} />
  </group>
);

// Chalkboard menu in a wood frame with chalk lines and doodles (one word heading so it stays readable).
export const Chalkboard: React.FC<{ position: Vec3; width?: number; height?: number; title?: string }> = ({ position, width = 1.3, height = 0.85, title = "MENU" }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, Math.round((1024 * height) / width), (ctx) => {
        const H = Math.round((1024 * height) / width);
        ctx.fillStyle = "#2b2b28";
        ctx.fillRect(0, 0, 1024, H);
        ctx.fillStyle = "#f4f1e8";
        ctx.font = `900 130px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(title, 512, 150);
        ctx.strokeStyle = "rgba(244,241,232,0.75)";
        ctx.lineWidth = 12;
        ctx.lineCap = "round";
        for (let i = 0; i < 4; i++) {
          const y = 240 + i * ((H - 290) / 4);
          ctx.beginPath();
          ctx.moveTo(90, y);
          ctx.lineTo(560 + (i % 2) * 80, y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(800, y);
          ctx.lineTo(930, y);
          ctx.stroke();
        }
        // a chalk cup doodle with steam
        ctx.strokeStyle = "#ffd27a";
        ctx.lineWidth = 10;
        ctx.strokeRect(700, H - 190, 90, 80);
        ctx.beginPath();
        ctx.arc(800, H - 150, 25, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(730, H - 210);
        ctx.quadraticCurveTo(710, H - 240, 735, H - 265);
        ctx.moveTo(765, H - 210);
        ctx.quadraticCurveTo(745, H - 240, 770, H - 265);
        ctx.stroke();
      }),
    [width, height, title],
  );
  return (
    <group position={position}>
      <InkBox size={[width + 0.1, height + 0.1, 0.04]} position={[0, 0, 0]} color="#6b4429" ink={0.006} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Bare filament bulb on a black cord, with a glow.
export const PendantBulb: React.FC<{ position: Vec3; drop?: number; on?: number }> = ({ position, drop = 0.6, on = 1 }) => (
  <group position={position}>
    <mesh position={[0, drop / 2, 0]}>
      <cylinderGeometry args={[0.005, 0.005, drop, 6]} />
      <meshBasicMaterial color={INK} />
    </mesh>
    <InkCylinder radius={0.025} height={0.05} position={[0, 0.0, 0]} color="#2a2f3a" ink={0.003} />
    <Ball position={[0, -0.07, 0]} radius={0.05} color={on > 0.5 ? "#ffcf7a" : "#e8dcc0"} glow scale={[1, 1.25, 1]} />
    {on > 0.5 && <Halo position={[0, -0.07, 0.03]} size={0.45} color="#ffcf7a" strength={0.45 * on} />}
  </group>
);

// Small register tablet on a stand and a glass tip jar.
export const Register: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.04} height={0.02} position={[0, 0.01, 0]} color="#2a2f3a" ink={0.003} />
    <InkBox size={[0.025, 0.14, 0.025]} position={[0, 0.08, 0]} color="#2a2f3a" ink={0.003} />
    <group position={[0, 0.17, 0.01]} rotation={[-0.35, 0, 0]}>
      <InkBox size={[0.22, 0.16, 0.015]} position={[0, 0, 0]} color="#1d1a1a" ink={0.003} />
      <mesh position={[0, 0, 0.009]}>
        <planeGeometry args={[0.19, 0.13]} />
        <meshBasicMaterial color="#bfe3ff" toneMapped={false} />
      </mesh>
    </group>
  </group>
);
export const TipJar: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.07, 0]}>
      <cylinderGeometry args={[0.055, 0.05, 0.14, 20, 1, true]} />
      <meshBasicMaterial color="#dff3ff" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <InkCylinder radius={0.045} height={0.04} position={[0, 0.025, 0]} color="#3fae5a" ink={0.002} />
  </group>
);

// Framed photo by the register: the barista and his wife with a heart (the seed). Faces +z.
export const CouplePhoto: React.FC<{ position: Vec3; rotation?: Vec3; size?: number }> = ({ position, rotation = [0, 0, 0], size = 0.22 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(400, 400, (ctx) => {
        ctx.fillStyle = "#ffe0ea";
        ctx.fillRect(0, 0, 400, 400);
        const face = (x: number, hair: string, long: boolean, skin: string, shirt: string) => {
          ctx.fillStyle = shirt;
          ctx.beginPath();
          ctx.ellipse(x, 390, 85, 110, 0, 0, Math.PI * 2);
          ctx.fill();
          if (long) {
            ctx.fillStyle = hair;
            ctx.beginPath();
            ctx.ellipse(x, 200, 82, 120, 0, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = skin;
          ctx.beginPath();
          ctx.arc(x, 180, 62, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = hair;
          ctx.beginPath();
          ctx.arc(x, 150, 64, Math.PI, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.arc(x - 22, 185, 7, 0, Math.PI * 2);
          ctx.arc(x + 22, 185, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = INK;
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(x, 205, 20, 0.2, Math.PI - 0.2);
          ctx.stroke();
        };
        face(130, "#3a2a20", false, "#d9a47e", "#6b4429");
        face(275, "#1d1a1a", true, "#c68642", "#e0262f");
        ctx.fillStyle = "#ff2f6e";
        ctx.font = `900 90px ${FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("♥", 202, 90);
      }),
    [],
  );
  return (
    <group position={position} rotation={rotation}>
      <InkBox size={[size + 0.04, size + 0.04, 0.02]} position={[0, 0, 0]} color="#d8b77a" ink={0.004} />
      <mesh position={[0, 0, 0.011]}>
        <planeGeometry args={[size, size]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <InkBox size={[0.02, 0.1, 0.08]} position={[0, -size / 2 + 0.03, -0.05]} rotation={[0.4, 0, 0]} color="#d8b77a" ink={0.002} />
    </group>
  );
};

// Shelf of mugs and bean bags on the back wall.
export const MugShelf: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.2 }) => (
  <group position={position}>
    {[0, 0.36].map((y, r) => (
      <group key={r}>
        <InkBox size={[width, 0.03, 0.22]} position={[0, y, 0]} color="#b07a45" ink={0.004} />
        {Array.from({ length: 6 }, (_, i) => {
          const x = -width / 2 + 0.1 + i * ((width - 0.2) / 5);
          return r === 0 ? (
            <InkCylinder key={i} radius={0.04} height={0.09} position={[x, y + 0.06, 0]} color={["#f2e8d8", "#e88aa8", "#7fd3ff", "#f2e8d8", "#ffd27a", "#f2e8d8"][i]} ink={0.003} />
          ) : (
            <InkBox key={i} size={[0.1, 0.16, 0.08]} position={[x, y + 0.095, 0]} color={i % 2 ? "#8a5a3a" : "#c9a074"} ink={0.003} />
          );
        })}
      </group>
    ))}
  </group>
);

// The glass front door in a slim black frame: push bar, OPEN sign on a chain, frosted band.
// `wobble` shakes the pane after an impact; `smudge` 0..1 shows the face print. Faces +z (the inside of the café is -z).
export const GlassDoor: React.FC<{ position: Vec3; wobble?: number; smudge?: number; f?: number; side?: "in" | "out" }> = ({ position, wobble = 0, smudge = 0, f = 0, side = "in" }) => {
  const sway = Math.sin(f * 0.25) * 0.08 + wobble * 0.25;
  return (
    <group position={position}>
      {/* frame */}
      <InkBox size={[1.0, 0.06, 0.08]} position={[0, 2.17, 0]} color="#1e2124" ink={0.004} />
      <InkBox size={[1.0, 0.12, 0.08]} position={[0, 0.06, 0]} color="#1e2124" ink={0.004} />
      <InkBox size={[0.06, 2.2, 0.08]} position={[-0.5, 1.1, 0]} color="#1e2124" ink={0.004} />
      <InkBox size={[0.06, 2.2, 0.08]} position={[0.5, 1.1, 0]} color="#1e2124" ink={0.004} />
      <group rotation={[wobble * 0.02, 0, 0]} position={[0, 0, wobble * 0.01]}>
        <mesh position={[0, 1.12, 0]}>
          <planeGeometry args={[0.94, 2.0]} />
          <meshBasicMaterial color="#bcd9e8" transparent opacity={0.3} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {/* diagonal reflection streaks */}
        {[0, 1].map((k) => (
          <mesh key={k} position={[-0.15 + k * 0.28, 1.35 - k * 0.2, 0.004]} rotation={[0, 0, 0.6]}>
            <planeGeometry args={[0.06 - k * 0.025, 1.2]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
        ))}
        {/* frosted band at eye height */}
        <mesh position={[0, 1.42, 0.003]}>
          <planeGeometry args={[0.94, 0.12]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.45} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
        {smudge > 0 && (
          <group position={[0, 1.0, side === "in" ? -0.006 : 0.006]}>
            <mesh>
              <circleGeometry args={[0.13 * smudge, 24]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.4 * smudge} depthWrite={false} side={THREE.DoubleSide} />
            </mesh>
            {[-0.04, 0.04].map((x) => (
              <mesh key={x} position={[x, 0.02, 0.001]}>
                <circleGeometry args={[0.018 * smudge, 12]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6 * smudge} depthWrite={false} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        )}
        {/* push bar (inside) */}
        <InkCylinder radius={0.02} height={0.8} position={[0, 1.0, side === "in" ? -0.07 : 0.07]} rotation={[0, 0, Math.PI / 2]} color="#c9ced3" ink={0.003} />
        {/* glass edge highlights */}
        <InkBox size={[0.012, 1.98, 0.012]} position={[-0.465, 1.12, 0]} color="#e8f4ff" ink={0} />
        <InkBox size={[0.012, 1.98, 0.012]} position={[0.465, 1.12, 0]} color="#e8f4ff" ink={0} />
      </group>
      {/* OPEN sign swinging on a chain, readable from the side it faces */}
      <group position={[0.2, 1.95, side === "in" ? 0.06 : -0.06]} rotation={[0, side === "in" ? 0 : Math.PI, sway]}>
        <mesh position={[-0.1, -0.06, 0]} rotation={[0, 0, -0.5]}>
          <planeGeometry args={[0.004, 0.16]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <mesh position={[0.1, -0.06, 0]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.004, 0.16]} />
          <meshBasicMaterial color={INK} />
        </mesh>
        <Label text="OPEN" position={[0, -0.19, 0.005]} width={0.32} fg="#ffffff" bg="#d23b33" />
      </group>
    </group>
  );
};

// Comic impact star.
export const ImpactStar: React.FC<{ position: Vec3; t: number; size?: number }> = ({ position, t, size = 0.35 }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 16; i++) {
      const r = i % 2 ? 0.45 : 1;
      const a = (i / 16) * Math.PI * 2;
      if (i === 0) s.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else s.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    return s;
  }, []);
  if (t < 0 || t > 12) return null;
  const sc = size * (t < 3 ? (t / 3) * 1.2 : 1.2 - (t - 3) * 0.1);
  return (
    <group position={position} scale={sc} rotation={[0, 0, t * 0.05]} userData={{ ghost: true }}>
      <mesh scale={1.12} position={[0, 0, -0.002]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color={INK} transparent depthWrite={false} />
      </mesh>
      <mesh>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} transparent depthWrite={false} />
      </mesh>
    </group>
  );
};

// Little cartoon birds circling a dazed head.
export const DizzyStars: React.FC<{ center: Vec3; f: number; r?: number }> = ({ center, f, r = 0.16 }) => (
  <group position={center} userData={{ ghost: true }}>
    {[0, 1, 2].map((i) => {
      const a = f * 0.2 + (i * Math.PI * 2) / 3;
      return <Ball key={i} position={[Math.cos(a) * r, Math.sin(a * 2) * 0.02, Math.sin(a) * r * 0.5]} radius={0.022} color="#ffd23f" glow />;
    })}
  </group>
);

// A brown paper lunch bag (held at its top fold).
export const LunchBag: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkBox size={[0.14, 0.18, 0.09]} position={[0, -0.12, 0]} color="#c9a074" ink={0.004} />
    <InkBox size={[0.14, 0.05, 0.03]} position={[0, -0.01, 0]} color="#b08a5a" ink={0.003} />
    <Label text="LUNCH" position={[0, -0.12, 0.047]} width={0.12} fg="#3d2416" bg="#c9a074" border={false} />
  </group>
);

// A gold wedding ring with a sparkle (world space; place it at the hand).
export const Ring: React.FC<{ position: Vec3; f: number; size?: number; sparkle?: number }> = ({ position, f, size = 1, sparkle = 1 }) => (
  <group position={position} scale={size} userData={{ ghost: true }}>
    <mesh rotation={[0.3, 0, 0]}>
      <torusGeometry args={[0.025, 0.007, 10, 24]} />
      <meshToonMaterial color="#ffcf3a" gradientMap={toonRamp} emissive="#7a5a00" />
    </mesh>
    <Ball position={[0, 0.03, 0]} radius={0.01} color="#e8fbff" glow />
    {sparkle > 0 && (
      <group position={[0.02, 0.04, 0.02]} rotation={[0, 0, f * 0.1]} scale={sparkle * (0.8 + 0.3 * Math.sin(f * 0.6))}>
        {[0, 1].map((k) => (
          <mesh key={k} rotation={[0, 0, (k * Math.PI) / 2]}>
            <planeGeometry args={[0.07, 0.01]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        ))}
        <Halo position={[0, 0, 0]} size={0.12} color="#fff4c8" strength={0.6} />
      </group>
    )}
  </group>
);

// ---------- dream wedding ----------

// Round flower arch: a hoop on two posts, roses and peonies packed heavier on one side, trailing leaves.
export const FlowerArch: React.FC<{ position: Vec3; radius?: number; f?: number }> = ({ position, radius = 1.0, f = 0 }) => (
  <group position={position}>
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.07, 1.3, 0.07]} position={[s * radius, 0.65, 0]} color="#d8b77a" ink={0.004} />
    ))}
    <mesh position={[0, 1.3, 0]}>
      <torusGeometry args={[radius, 0.035, 10, 48, Math.PI]} />
      <meshToonMaterial color="#d8b77a" gradientMap={toonRamp} />
    </mesh>
    {Array.from({ length: 34 }, (_, i) => {
      const a = (i / 33) * Math.PI;
      const heavy = a > Math.PI * 0.45 ? 1 : 0.55;
      const r = radius + (rnd(i) - 0.5) * 0.08;
      const x = Math.cos(a) * r;
      const y = 1.3 + Math.sin(a) * r;
      const c = ["#f4c9cf", "#e391a1", "#fbf6f1", "#ff8fb0"][i % 4];
      return <Ball key={i} position={[x, y, 0.06]} radius={(0.07 + rnd(i + 5) * 0.05) * heavy} color={c} ink={1.08} />;
    })}
    {/* flowers down the left post and trailing leaves */}
    {Array.from({ length: 10 }, (_, i) => (
      <Ball key={`p${i}`} position={[-radius + (rnd(i + 30) - 0.5) * 0.12, 0.3 + i * 0.1, 0.07]} radius={0.06 + rnd(i + 40) * 0.04} color={i % 3 ? "#f4c9cf" : "#fbf6f1"} />
    ))}
    {Array.from({ length: 8 }, (_, i) => {
      const a = Math.PI * (0.6 + i * 0.05);
      const sway = Math.sin(f * 0.06 + i) * 0.03;
      return (
        <InkBox key={`l${i}`} size={[0.05, 0.22 + (i % 3) * 0.08, 0.01]} position={[Math.cos(a) * radius + sway, 1.3 + Math.sin(a) * radius - 0.18, 0.1]} rotation={[0, 0, 0.3 - i * 0.05]} color="#9fb59a" ink={0.003} />
      );
    })}
  </group>
);

// White folding chair with a satin bow on its back (aisle chairs).
export const BowChair: React.FC<{ position: Vec3; bow?: boolean }> = ({ position, bow = true }) => (
  <group position={position}>
    <InkBox size={[0.38, 0.04, 0.36]} position={[0, 0.42, 0]} color="#fbf6f1" ink={0.004} />
    <InkBox size={[0.38, 0.4, 0.04]} position={[0, 0.66, -0.17]} color="#fbf6f1" ink={0.004} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.03, 0.42, 0.03]} position={[sx * 0.16, 0.21, sz * 0.15]} color="#e8dcd0" ink={0.003} />))}
    {bow && (
      <group position={[0, 0.72, -0.13]}>
        <Ball position={[-0.07, 0, 0]} radius={0.06} color="#f4c9cf" scale={[1.3, 0.8, 0.4]} />
        <Ball position={[0.07, 0, 0]} radius={0.06} color="#f4c9cf" scale={[1.3, 0.8, 0.4]} />
        <Ball position={[0, 0, 0.01]} radius={0.03} color="#e391a1" />
        <InkBox size={[0.04, 0.25, 0.01]} position={[-0.03, -0.14, 0.01]} rotation={[0, 0, 0.15]} color="#f4c9cf" ink={0.002} />
        <InkBox size={[0.04, 0.25, 0.01]} position={[0.03, -0.14, 0.01]} rotation={[0, 0, -0.15]} color="#f4c9cf" ink={0.002} />
      </group>
    )}
  </group>
);

// Crystal chandelier: rings of glowing drops.
export const Chandelier: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position} rotation={[0, f * 0.004, 0]}>
    <mesh position={[0, 0.4, 0]}>
      <cylinderGeometry args={[0.006, 0.006, 0.8, 6]} />
      <meshBasicMaterial color="#d8b77a" />
    </mesh>
    <mesh>
      <torusGeometry args={[0.3, 0.015, 8, 32]} />
      <meshToonMaterial color="#d8b77a" gradientMap={toonRamp} />
    </mesh>
    {Array.from({ length: 12 }, (_, i) => {
      const a = (i / 12) * Math.PI * 2;
      return <Ball key={i} position={[Math.cos(a) * 0.3, -0.06 - (i % 2) * 0.04, Math.sin(a) * 0.3]} radius={0.025} color="#fff4e0" glow scale={[0.7, 1.4, 0.7]} />;
    })}
    {Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      return <Ball key={`c${i}`} position={[Math.cos(a) * 0.16, 0.05, Math.sin(a) * 0.16]} radius={0.03} color="#ffe6b0" glow />;
    })}
    <Halo position={[0, 0, 0.1]} size={1.2} color="#ffe6b0" strength={0.35} />
  </group>
);

// A swag of fairy lights between two points, sagging; warm dots that twinkle.
export const FairyLights: React.FC<{ from: Vec3; to: Vec3; sag?: number; count?: number; f?: number }> = ({ from, to, sag = 0.3, count = 16, f = 0 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count + 1 }, (_, i) => {
      const t = i / count;
      const x = from[0] + (to[0] - from[0]) * t;
      const y = from[1] + (to[1] - from[1]) * t - Math.sin(t * Math.PI) * sag;
      const z = from[2] + (to[2] - from[2]) * t;
      const tw = 0.75 + 0.25 * Math.sin(f * 0.2 + i * 1.7);
      return <Ball key={i} position={[x, y, z]} radius={0.018 * tw} color="#ffe6b0" glow />;
    })}
  </group>
);

// Aisle runner with scattered petals.
export const AisleRunner: React.FC<{ z0: number; z1: number; width?: number }> = ({ z0, z1, width = 0.9 }) => (
  <group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, (z0 + z1) / 2]} receiveShadow>
      <planeGeometry args={[width, Math.abs(z1 - z0)]} />
      <meshToonMaterial color="#fbf6f1" gradientMap={toonRamp} />
    </mesh>
    {Array.from({ length: 40 }, (_, i) => {
      const side = i % 2 ? 1 : -1;
      const x = side * (width / 2 - 0.04 - rnd(i) * 0.12);
      const z = z0 + (z1 - z0) * rnd(i + 50);
      return (
        <mesh key={i} rotation={[-Math.PI / 2, 0, rnd(i + 7) * 3]} position={[x, 0.007, z]}>
          <circleGeometry args={[0.025, 6]} />
          <meshBasicMaterial color={i % 3 ? "#f4c9cf" : "#e391a1"} />
        </mesh>
      );
    })}
  </group>
);

// Tiered wedding cake with sugar flowers down one side.
export const WeddingCake: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.6, 0.72, 0.5]} position={[0, 0.36, 0]} color="#fbf6f1" ink={0.006} />
    {[0.22, 0.17, 0.12].map((r, i) => (
      <InkCylinder key={i} radius={r} height={0.14} position={[0, 0.8 + i * 0.15, 0]} color="#fffaf4" ink={0.004} />
    ))}
    {[0, 1, 2, 3, 4].map((i) => (
      <Ball key={i} position={[0.12 - i * 0.03, 1.15 - i * 0.09, 0.15 + (i % 2) * 0.03]} radius={0.03} color={i % 2 ? "#e391a1" : "#f4c9cf"} />
    ))}
  </group>
);

// Baby crib with a mobile, pastel.
export const Crib: React.FC<{ position: Vec3; color?: string; f?: number }> = ({ position, color = "#bfe3ff", f = 0 }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.05, 0.4]} position={[0, 0.3, 0]} color={color} ink={0.004} />
    <InkBox size={[0.66, 0.08, 0.36]} position={[0, 0.36, 0]} color="#ffffff" ink={0.003} />
    {Array.from({ length: 8 }, (_, i) => (
      <InkBox key={i} size={[0.02, 0.4, 0.02]} position={[-0.33 + i * (0.66 / 7), 0.5, 0.19]} color={color} ink={0.002} />
    ))}
    <InkBox size={[0.72, 0.03, 0.03]} position={[0, 0.7, 0.19]} color={color} ink={0.003} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.04, 0.72, 0.42]} position={[s * 0.36, 0.36, 0]} color={color} ink={0.004} />
    ))}
    {/* mobile */}
    <group position={[0.22, 1.05, 0]} rotation={[0, f * 0.03, 0]}>
      <InkBox size={[0.3, 0.012, 0.012]} position={[0, 0, 0]} color="#d8b77a" ink={0} />
      {[-0.13, 0.13].map((x, i) => (
        <Ball key={x} position={[x, -0.09, 0]} radius={0.03} color={i ? "#ffd23f" : "#ff8fc8"} />
      ))}
    </group>
    <InkBox size={[0.02, 0.4, 0.02]} position={[0.36, 0.86, 0]} color="#d8b77a" ink={0.002} />
  </group>
);

// Wedding dress on a dress form.
export const DressForm: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.12} height={0.02} position={[0, 0.01, 0]} color="#d8b77a" ink={0.003} />
    <InkCylinder radius={0.015} height={0.5} position={[0, 0.25, 0]} color="#d8b77a" ink={0.003} />
    <mesh position={[0, 0.55, 0]} rotation={[0, f * 0.01, 0]}>
      <coneGeometry args={[0.36, 0.75, 24]} />
      <meshToonMaterial color="#fffaf4" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.55, 0]} scale={1.04}>
      <coneGeometry args={[0.36, 0.75, 24]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <Ball position={[0, 1.02, 0]} radius={0.13} color="#fffaf4" scale={[1, 1.4, 0.75]} />
    <InkBox size={[0.24, 0.04, 0.16]} position={[0, 0.86, 0]} color="#f4c9cf" ink={0.003} />
    <Ball position={[0, 1.24, 0]} radius={0.04} color="#d8b77a" />
    {/* veil */}
    <mesh position={[0.05, 0.9, -0.05]} rotation={[0, 0, 0.1]}>
      <planeGeometry args={[0.35, 0.8]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  </group>
);

// A small cel dog sitting, facing +z; `wag` frames drive the tail, `bow` puts a bow tie on, `tag` hangs a name tag.
export const Dog: React.FC<{ position: Vec3; f?: number; color?: string; bow?: boolean; tag?: string; tagAppear?: number; scale?: number; rotationY?: number; hop?: number }> = ({
  position,
  f = 0,
  color = "#d9a066",
  bow,
  tag,
  tagAppear,
  scale = 1,
  rotationY = 0,
  hop = 0,
}) => {
  const wag = Math.sin(f * 0.6) * 0.6;
  return (
    <group position={[position[0], position[1] + hop, position[2]]} scale={scale} rotation={[0, rotationY, 0]}>
      <Ball position={[0, 0.2, -0.05]} radius={0.16} color={color} scale={[1, 1.1, 1.2]} />
      <Ball position={[0, 0.42, 0.04]} radius={0.13} color={color} />
      <Ball position={[0, 0.39, 0.15]} radius={0.06} color="#f2d8b0" scale={[1, 0.8, 1]} />
      <Ball position={[0, 0.42, 0.21]} radius={0.022} color={INK} />
      {[-0.05, 0.05].map((x) => (
        <Ball key={x} position={[x, 0.47, 0.13]} radius={0.016} color={INK} />
      ))}
      {[-1, 1].map((s) => (
        <Ball key={s} position={[s * 0.12, 0.43 - Math.abs(wag) * 0.02, 0.0]} radius={0.06} color="#8a5a3a" scale={[0.6, 1.4, 0.6]} />
      ))}
      {[-1, 1].map((s) => (
        <Ball key={`f${s}`} position={[s * 0.07, 0.04, 0.1]} radius={0.045} color={color} scale={[1, 0.7, 1.3]} />
      ))}
      <group position={[0, 0.18, -0.22]} rotation={[0.6, 0, wag]}>
        <Ball position={[0, 0.08, 0]} radius={0.03} color={color} scale={[1, 2.6, 1]} />
      </group>
      {bow && (
        <group position={[0, 0.3, 0.13]}>
          <Ball position={[-0.04, 0, 0]} radius={0.03} color="#13235e" scale={[1.3, 0.8, 0.5]} />
          <Ball position={[0.04, 0, 0]} radius={0.03} color="#13235e" scale={[1.3, 0.8, 0.5]} />
        </group>
      )}
      {tag && <Label text={tag} position={[0, 0.2, 0.19]} width={0.2} fg="#ffffff" bg="#e0267f" appear={tagAppear} />}
    </group>
  );
};

// Record on a turntable with an OUR SONG card.
export const RecordPlayer: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position}>
    <InkBox size={[0.42, 0.08, 0.34]} position={[0, 0.04, 0]} color="#8a5a3a" ink={0.004} />
    <group position={[-0.04, 0.09, 0]} rotation={[0, f * 0.15, 0]}>
      <InkCylinder radius={0.14} height={0.01} position={[0, 0, 0]} color="#1d1a1a" ink={0.002} />
      <InkCylinder radius={0.05} height={0.012} position={[0, 0.002, 0]} color="#e391a1" ink={0} />
    </group>
    <InkBox size={[0.02, 0.02, 0.18]} position={[0.15, 0.11, 0.0]} rotation={[0, 0.4, 0]} color="#c9ced3" ink={0.002} />
  </group>
);

// ---------- Mila's room ----------

export const Bed: React.FC<{ position: Vec3; color?: string; sheet?: string }> = ({ position, color = "#7a5aa8", sheet = "#f4c9ff" }) => (
  <group position={position}>
    <InkBox size={[1.0, 0.25, 1.9]} position={[0, 0.25, 0]} color="#c9a0e0" />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, 0.14, 0.06]} position={[sx * 0.44, 0.07, sz * 0.88]} color="#6b4a7e" ink={0.003} />))}
    <InkBox size={[0.96, 0.14, 1.84]} position={[0, 0.44, 0]} color="#fff6fc" ink={0.004} />
    <InkBox size={[0.98, 0.06, 1.2]} position={[0, 0.53, 0.32]} color={sheet} ink={0.004} />
    <InkBox size={[0.6, 0.12, 0.3]} position={[0, 0.57, -0.72]} color="#ffffff" ink={0.004} />
    <InkBox size={[1.0, 0.7, 0.06]} position={[0, 0.55, -0.96]} color={color} />
  </group>
);

// Box of tissues with one sticking up.
export const Tissues: React.FC<{ position: Vec3; f?: number }> = ({ position, f = 0 }) => (
  <group position={position}>
    <InkBox size={[0.2, 0.09, 0.11]} position={[0, 0.045, 0]} color="#7fd3ff" ink={0.003} />
    <InkBox size={[0.08, 0.1, 0.005]} position={[0, 0.13, 0]} rotation={[0, 0, Math.sin(f * 0.2) * 0.15]} color="#ffffff" ink={0.002} />
  </group>
);

// Crumpled tissue balls on the floor.
export const TissuePile: React.FC<{ x: number; z: number; count?: number; spread?: number }> = ({ x, z, count = 8, spread = 0.5 }) => (
  <group>
    {Array.from({ length: count }, (_, i) => (
      <Ball key={i} position={[x + (rnd(i) - 0.5) * spread, 0.035, z + (rnd(i + 20) - 0.5) * spread * 0.6]} radius={0.035 + rnd(i + 5) * 0.015} color="#ffffff" ink={1.1} />
    ))}
  </group>
);

// A side table (tissues, a lamp).
export const SideTable: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#f2e8ff" }) => (
  <group position={position}>
    <InkBox size={[0.45, 0.05, 0.38]} position={[0, 0.52, 0]} color={color} ink={0.004} />
    {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, 0.5, 0.04]} position={[sx * 0.19, 0.25, sz * 0.15]} color="#8a6aa8" ink={0.003} />))}
  </group>
);

// ---------- balcony ----------

// Thin-baluster metal railing along x at z, with planter boxes hooked over the top rail.
export const Railing: React.FC<{ z: number; from: number; to: number; height?: number }> = ({ z, from, to, height = 1.0 }) => {
  const n = Math.round((to - from) / 0.12);
  return (
    <group>
      <InkBox size={[to - from, 0.05, 0.07]} position={[(from + to) / 2, height, z]} color="#2a2440" ink={0.004} />
      <InkBox size={[to - from, 0.03, 0.04]} position={[(from + to) / 2, 0.08, z]} color="#2a2440" ink={0.003} />
      {Array.from({ length: n + 1 }, (_, i) => (
        <InkBox key={i} size={[0.018, height - 0.08, 0.018]} position={[from + i * ((to - from) / n), height / 2 + 0.03, z]} color="#2a2440" ink={0} />
      ))}
    </group>
  );
};
export const Planter: React.FC<{ position: Vec3; width?: number; flowers?: string; seed?: number }> = ({ position, width = 0.6, flowers = "#ff5fa8", seed = 0 }) => (
  <group position={position}>
    <InkBox size={[width, 0.16, 0.18]} position={[0, 0.08, 0]} color="#b85a4a" ink={0.004} />
    {Array.from({ length: Math.round(width / 0.09) }, (_, i) => {
      const x = -width / 2 + 0.05 + i * 0.09;
      return (
        <group key={i}>
          <Ball position={[x, 0.2 + rnd(i + seed) * 0.06, 0]} radius={0.06} color="#4f7a52" />
          {i % 2 === 0 && <Ball position={[x + 0.02, 0.27 + rnd(i + seed + 9) * 0.05, 0.03]} radius={0.035} color={flowers} />}
        </group>
      );
    })}
  </group>
);
// Flat rooftop silhouettes (chimneys, water tanks, antennas) for a layered skyline.
export const Rooftops: React.FC<{ z: number; shift: number; color: string; seed: number; base?: number; windows?: string }> = ({ z, shift, color, seed, base = -2, windows }) => (
  <group position={[shift, 0, z]}>
    {Array.from({ length: 14 }, (_, i) => {
      const w = 1.2 + rnd(i + seed) * 1.4;
      const h = 2 + rnd(i + seed + 30) * 3;
      const x = -12 + i * 1.8 + rnd(i + seed + 60) * 0.4;
      return (
        <group key={i}>
          <mesh position={[x, base + h / 2, 0]}>
            <planeGeometry args={[w, h]} />
            <meshBasicMaterial color={color} fog={false} />
          </mesh>
          {i % 3 === 0 && (
            <mesh position={[x + w * 0.25, base + h + 0.25, 0]}>
              <planeGeometry args={[0.18, 0.5]} />
              <meshBasicMaterial color={color} fog={false} />
            </mesh>
          )}
          {i % 4 === 1 && (
            <mesh position={[x - w * 0.2, base + h + 0.35, 0]}>
              <planeGeometry args={[0.5, 0.7]} />
              <meshBasicMaterial color={color} fog={false} />
            </mesh>
          )}
          {windows &&
            [0, 1, 2].map((k) =>
              rnd(i * 7 + k + seed) > 0.55 ? (
                <mesh key={k} position={[x - w * 0.25 + k * w * 0.25, base + h - 0.5 - (k % 2) * 0.6, 0.01]}>
                  <planeGeometry args={[0.15, 0.2]} />
                  <meshBasicMaterial color={windows} fog={false} toneMapped={false} />
                </mesh>
              ) : null,
            )}
        </group>
      );
    })}
  </group>
);

// ---------- inside her head: the flooded tank room ----------

// Scrolling vertical streak texture for falling water sheets.
const streakTex = () =>
  canvasTexture(128, 512, (ctx) => {
    ctx.clearRect(0, 0, 128, 512);
    ctx.fillStyle = "rgba(150,235,240,0.55)";
    ctx.fillRect(0, 0, 128, 512);
    for (let i = 0; i < 18; i++) {
      const x = rnd(i) * 128;
      const w = 2 + rnd(i + 3) * 6;
      const y = rnd(i + 7) * 512;
      const h = 60 + rnd(i + 11) * 180;
      ctx.fillStyle = `rgba(255,255,255,${0.45 + rnd(i + 13) * 0.45})`;
      ctx.fillRect(x, y, w, h);
      ctx.fillRect(x, y - 512, w, h);
    }
  });

// A falling water sheet: a translucent ribbon with streaks running down it. `len` metres long, hangs down from its top.
export const WaterSheet: React.FC<{ position: Vec3; width: number; len: number; f: number; speed?: number; rotation?: Vec3; opacity?: number }> = ({ position, width, len, f, speed = 0.06, rotation = [0, 0, 0], opacity = 0.85 }) => {
  const tex = useMemo(() => {
    const t = streakTex();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    return t;
  }, []);
  tex.repeat.set(Math.max(1, width / 0.3), Math.max(1, len / 0.8));
  tex.offset.set(0, (f * speed) % 1);
  return (
    <mesh position={[position[0], position[1] - len / 2, position[2]]} rotation={rotation}>
      <planeGeometry args={[width, len]} />
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// Drops falling from a lip at height y to the floor (y = 0) in a cycle; a splash crown where they land.
export const Drips: React.FC<{ from: Vec3; f: number; count?: number; spread?: number; period?: number; size?: number }> = ({ from, f, count = 6, spread = 0.4, period = 18, size = 0.02 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const t = ((f + rnd(i) * period) % period) / period;
      const x = from[0] + (rnd(i + 3) - 0.5) * spread;
      const y = from[1] * (1 - t * t);
      return <Ball key={i} position={[x, y, from[2] + (rnd(i + 8) - 0.5) * 0.04]} radius={size} color="#bff4f8" glow scale={[0.8, 1.5, 0.8]} />;
    })}
  </group>
);

// Splash crowns along a line on the floor: rings of droplets popping up and falling back.
export const Splashes: React.FC<{ x: number; z: number; width: number; f: number; count?: number; y?: number; seed?: number }> = ({ x, z, width, f, count = 5, y = 0.01, seed = 0 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const period = 14 + Math.round(rnd(i + seed) * 8);
      const t = ((f + i * 5) % period) / period;
      const cx = x + (i / Math.max(1, count - 1) - 0.5) * width + (rnd(i + seed + 4) - 0.5) * 0.06;
      return (
        <group key={i} position={[cx, y, z + (rnd(i + seed + 9) - 0.5) * 0.05]}>
          {Array.from({ length: 6 }, (_, k) => {
            const a = (k / 6) * Math.PI * 2;
            const r = 0.02 + t * 0.09;
            const h = Math.sin(t * Math.PI) * 0.09;
            return <Ball key={k} position={[Math.cos(a) * r, h, Math.sin(a) * r * 0.6]} radius={0.012 * (1 - t * 0.6)} color="#e8fbfb" glow />;
          })}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} scale={[1 + t * 2, 1 + t * 2, 1]}>
            <ringGeometry args={[0.03, 0.045, 24]} />
            <meshBasicMaterial color="#e8fbfb" transparent opacity={0.8 * (1 - t)} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// The flood on the floor: a wobbly translucent water layer that grows with `grow` (0..1), ripple rings and glints.
export const Flood: React.FC<{ x: number; z: number; w: number; d: number; grow: number; f: number; seed?: number }> = ({ x, z, w, d, grow, f, seed = 0 }) => {
  const shape = useMemo(() => {
    const s = new THREE.Shape();
    const n = 28;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 0.85 + rnd(i + seed) * 0.25;
      const px = Math.cos(a) * r * 0.5;
      const py = Math.sin(a) * r * 0.5;
      if (i === 0) s.moveTo(px, py);
      else s.lineTo(px, py);
    }
    return s;
  }, [seed]);
  if (grow <= 0) return null;
  const sx = w * grow;
  const sz = d * grow;
  return (
    <group position={[x, 0, z]} userData={{ ghost: true }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} scale={[sx * 1.04, sz * 1.04, 1]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#e8fbfb" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, 0]} scale={[sx, sz, 1]}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#4fc3c8" transparent opacity={0.72} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* ripple rings */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = ((f + i * 9) % 40) / 40;
        const px = (rnd(i + seed + 20) - 0.5) * sx * 0.7;
        const pz = (rnd(i + seed + 30) - 0.5) * sz * 0.7;
        return (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[px, 0.011, pz]} scale={[0.4 + t * 2.4, (0.4 + t * 2.4) * 0.8, 1]}>
            <ringGeometry args={[0.05, 0.062, 28]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.65 * (1 - t)} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {/* glints */}
      {Array.from({ length: 8 }, (_, i) => {
        const tw = 0.5 + 0.5 * Math.sin(f * 0.3 + i * 2.1);
        return (
          <mesh key={`g${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[(rnd(i + seed + 40) - 0.5) * sx * 0.8, 0.012, (rnd(i + seed + 50) - 0.5) * sz * 0.8]}>
            <planeGeometry args={[0.08 * tw, 0.012]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.9 * tw} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// A cel fish: body, tail and eye. Swims along +x when `dir` = 1.
export const Fish: React.FC<{ position: Vec3; color: string; dir?: 1 | -1; f?: number; size?: number }> = ({ position, color, dir = 1, f = 0, size = 1 }) => (
  <group position={position} scale={[size * dir, size, size]}>
    <Ball position={[0, 0, 0]} radius={0.07} color={color} scale={[1.5, 1, 0.55]} />
    <group position={[-0.11, 0, 0]} rotation={[0, Math.sin(f * 0.5) * 0.5, 0]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.03, 0, 0]}>
        <coneGeometry args={[0.06, 0.08, 3]} />
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
    </group>
    <Ball position={[0.06, 0.015, 0.032]} radius={0.014} color="#ffffff" ink={1.15} />
    <Ball position={[0.065, 0.015, 0.043]} radius={0.007} color={INK} ink={1} />
  </group>
);

// The DAYDREAMS tank: a huge glass box on a cabinet, light hood with the label, gravel, plants, bubbles, fish and a
// water level that bulges over the rim and pours down the front in sheets (`over` 0..1), with drips and splashes.
export const TANK = { w: 2.2, h: 1.4, d: 0.8, base: 0.55 };
export const DreamTank: React.FC<{ position: Vec3; f: number; over?: number; label?: number }> = ({ position, f, over = 1, label }) => {
  const { w, h, d, base } = TANK;
  const top = base + h;
  const caustic = useMemo(
    () =>
      canvasTexture(512, 256, (ctx) => {
        ctx.clearRect(0, 0, 512, 256);
        ctx.strokeStyle = "rgba(255,255,255,0.55)";
        ctx.lineWidth = 5;
        for (let i = 0; i < 14; i++) {
          ctx.beginPath();
          const y0 = rnd(i) * 256;
          ctx.moveTo(0, y0);
          for (let x = 0; x <= 512; x += 32) ctx.lineTo(x, y0 + Math.sin(x * 0.03 + i) * 18 + rnd(i * 3 + x) * 8);
          ctx.stroke();
        }
      }),
    [],
  );
  caustic.wrapS = THREE.RepeatWrapping;
  caustic.wrapT = THREE.RepeatWrapping;
  caustic.offset.set((f * 0.004) % 1, Math.sin(f * 0.05) * 0.05);
  // surface wave
  const wave = (x: number) => Math.sin(x * 6 + f * 0.25) * 0.012 + Math.sin(x * 11 - f * 0.18) * 0.008;
  const level = top - 0.03 + over * 0.05;
  return (
    <group position={position}>
      {/* cabinet stand */}
      <InkBox size={[w + 0.1, base - 0.02, d + 0.06]} position={[0, (base - 0.02) / 2, 0]} color="#13354a" />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[w / 2 - 0.1, base - 0.14, 0.01]} position={[s * (w / 4), base / 2, d / 2 + 0.035]} color="#1b4a63" ink={0.003} />
      ))}
      {/* frame bottom and top */}
      <InkBox size={[w + 0.06, 0.06, d + 0.06]} position={[0, base + 0.03, 0]} color="#1d1a1a" ink={0.004} />
      <InkBox size={[w + 0.06, 0.05, 0.06]} position={[0, top, d / 2]} color="#1d1a1a" ink={0.004} />
      <InkBox size={[w + 0.06, 0.05, 0.06]} position={[0, top, -d / 2]} color="#1d1a1a" ink={0.004} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.06, 0.05, d + 0.06]} position={[s * (w / 2), top, 0]} color="#1d1a1a" ink={0.004} />
      ))}
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.03, h, 0.03]} position={[sx * (w / 2), base + h / 2, sz * (d / 2)]} color="#1d1a1a" ink={0.002} />))}
      {/* back panel: deep water gradient + caustics */}
      <mesh position={[0, base + h / 2, -d / 2 + 0.02]}>
        <planeGeometry args={[w - 0.04, h - 0.04]} />
        <meshBasicMaterial color="#0e5c63" toneMapped={false} />
      </mesh>
      <mesh position={[0, base + h / 2 + 0.1, -d / 2 + 0.03]}>
        <planeGeometry args={[w - 0.04, h - 0.3]} />
        <meshBasicMaterial map={caustic} transparent depthWrite={false} toneMapped={false} />
      </mesh>
      {/* gravel slope */}
      <mesh position={[0, base + 0.1, 0]} rotation={[-Math.PI / 2 + 0.12, 0, 0]}>
        <planeGeometry args={[w - 0.06, d - 0.06]} />
        <meshToonMaterial color="#c7b48f" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 26 }, (_, i) => (
        <Ball key={i} position={[(rnd(i) - 0.5) * (w - 0.2), base + 0.1 + rnd(i + 2) * 0.03, (rnd(i + 4) - 0.5) * (d - 0.2)]} radius={0.025 + rnd(i + 6) * 0.03} color={["#c7b48f", "#a89470", "#e0d0a8"][i % 3]} ink={1.05} />
      ))}
      {/* rocks and a little castle */}
      <Ball position={[-0.75, base + 0.18, -0.15]} radius={0.14} color="#7a8a8f" scale={[1.4, 0.9, 1]} />
      <group position={[0.65, base + 0.1, -0.15]}>
        <InkBox size={[0.22, 0.3, 0.18]} position={[0, 0.15, 0]} color="#e391a1" ink={0.004} />
        <mesh position={[0, 0.38, 0]}>
          <coneGeometry args={[0.15, 0.18, 4]} />
          <meshToonMaterial color="#ff5fa8" gradientMap={toonRamp} />
        </mesh>
        <InkBox size={[0.06, 0.1, 0.02]} position={[0, 0.06, 0.1]} color="#1d1a1a" ink={0} />
      </group>
      {/* swaying plants */}
      {[-0.95, -0.45, 0.1, 0.95].map((x, i) => (
        <group key={x} position={[x, base + 0.1, -0.2 + (i % 2) * 0.1]}>
          {Array.from({ length: 6 }, (_, k) => {
            const sway = Math.sin(f * 0.07 + i + k * 0.5) * 0.05 * k;
            return <InkBox key={k} size={[0.05, 0.14, 0.02]} position={[sway, 0.07 + k * 0.13, 0]} rotation={[0, 0, sway * 2]} color={i % 2 ? "#3f8f5a" : "#5fb06a"} ink={0.003} />;
          })}
        </group>
      ))}
      {/* fish */}
      {[0, 1, 2, 3, 4].map((i) => {
        const dir = (i % 2 ? -1 : 1) as 1 | -1;
        const span = w - 0.4;
        const t = ((f * (0.004 + i * 0.001) + rnd(i)) % 1) * 2;
        const p = t < 1 ? t : 2 - t;
        const goingRight = t < 1 ? dir === 1 : dir === -1;
        return (
          <Fish
            key={i}
            position={[-span / 2 + p * span * (dir === 1 ? 1 : 1), base + 0.45 + i * 0.17 + Math.sin(f * 0.1 + i) * 0.03, -0.1 + (i % 3) * 0.12]}
            color={["#ff7a3a", "#ffd23f", "#ff5fa8", "#7fd3ff", "#ff7a3a"][i]}
            dir={goingRight ? 1 : -1}
            f={f + i * 7}
            size={1 + (i % 2) * 0.3}
          />
        );
      })}
      {/* bubble column from an air stone */}
      {Array.from({ length: 10 }, (_, i) => {
        const t = ((f + i * 6) % 60) / 60;
        return <Ball key={`b${i}`} position={[-0.25 + Math.sin(t * 9 + i) * 0.03, base + 0.15 + t * (h - 0.2), 0.05]} radius={0.012 + t * 0.02} color="#e8fbfb" opacity={0.75} />;
      })}
      {/* water body (in front of everything inside) */}
      <mesh position={[0, (base + 0.06 + level) / 2, d / 2 - 0.012]}>
        <planeGeometry args={[w - 0.04, level - base - 0.06]} />
        <meshBasicMaterial color="#4fc3c8" transparent opacity={0.22} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* front glass sheen */}
      {[0, 1].map((k) => (
        <mesh key={k} position={[-0.6 + k * 0.25, base + h * 0.6, d / 2 + 0.002]} rotation={[0, 0, 0.5]}>
          <planeGeometry args={[0.08 - k * 0.04, h * 0.9]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
        </mesh>
      ))}
      {/* surface with waves, bulging over the rim */}
      {Array.from({ length: 22 }, (_, i) => {
        const x = -w / 2 + (i + 0.5) * (w / 22);
        return <InkBox key={`s${i}`} size={[w / 22 + 0.005, 0.03, d + (over > 0 ? 0.08 : -0.04)]} position={[x, level + wave(x), 0]} color="#7fe3e8" ink={0} shadows={false} />;
      })}
      {/* light hood with the label */}
      <InkBox size={[w + 0.1, 0.12, d + 0.1]} position={[0, top + 0.16, 0]} color="#1d1a1a" ink={0.006} />
      <mesh position={[0, top + 0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w - 0.1, 0.1]} />
        <meshBasicMaterial color="#e8fbff" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.04, 0.13, 0.04]} position={[s * (w / 2 - 0.1), top + 0.06, d / 2 - 0.05]} color="#1d1a1a" ink={0.002} />
      ))}
      {label !== undefined && <Label text="DAYDREAMS" position={[0, top + 0.17, d / 2 + 0.065]} width={1.3} fg="#ffffff" bg="#e0267f" appear={label} />}
      {/* overflow: sheets down the front and sides, ropes of drips, splashes on the floor */}
      {over > 0 && (
        <group userData={{ ghost: true }}>
          {[-0.75, -0.2, 0.35, 0.82].map((x, i) => (
            <WaterSheet key={x} position={[x, top + 0.02, d / 2 + 0.04 + i * 0.002]} width={(0.28 + rnd(i) * 0.2) * over} len={top - base + 0.02} f={f + i * 5} speed={0.05 + i * 0.008} />
          ))}
          {/* the lip of water bulging over the front rim */}
          <InkBox size={[w * 0.9 * over, 0.035, 0.06]} position={[0, top + 0.035 + wave(0.3) * 0.5, d / 2 + 0.02]} color="#9ff0f2" ink={0} shadows={false} />
          {[-1, 1].map((s) => (
            <WaterSheet key={s} position={[s * (w / 2 + 0.035), top + 0.02, 0.05]} width={0.4 * over} len={top - base} f={f + s * 9} rotation={[0, Math.PI / 2, 0]} speed={0.055} />
          ))}
          {/* sheets break into ropes off the bottom frame and fall to the floor */}
          <WaterSheet position={[0, base + 0.02, d / 2 + 0.1]} width={w * 0.8 * over} len={base - 0.01} f={f + 3} speed={0.08} opacity={0.6} />
          <Drips from={[0, base, d / 2 + 0.12]} f={f} count={14} spread={w * 0.8} period={14} size={0.02} />
          <Splashes x={0} z={d / 2 + 0.2} width={w * 0.75} f={f} count={7} />
        </group>
      )}
    </group>
  );
};

// A pipe run on the wall: horizontal at y along x, with flanges.
export const WallPipe: React.FC<{ from: number; to: number; y: number; z: number; color?: string; r?: number }> = ({ from, to, y, z, color = "#5f7470", r = 0.05 }) => (
  <group>
    <InkCylinder radius={r} height={to - from} position={[(from + to) / 2, y, z]} rotation={[0, 0, Math.PI / 2]} color={color} ink={0.004} />
    {[from + 0.05, (from + to) / 2, to - 0.05].map((x) => (
      <InkCylinder key={x} radius={r * 1.35} height={0.05} position={[x, y, z]} rotation={[0, 0, Math.PI / 2]} color="#4a5a56" ink={0.003} />
    ))}
  </group>
);

// The REALITY dial: brass bezel, white face, red needle. Lying on the floor (`fallen`) it is tilted up so it reads,
// cracked across; on the wall it faces +z. A broken stub stays on the pipe.
export const RealityDial: React.FC<{ position: Vec3; fallen?: number; f?: number; label?: number; scale?: number }> = ({ position, fallen = 1, f = 0, label, scale = 1 }) => {
  const face = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#fbf8f0";
        ctx.beginPath();
        ctx.arc(256, 256, 250, 0, Math.PI * 2);
        ctx.fill();
        for (let k = 0; k <= 20; k++) {
          const a = Math.PI * (1.15 - (k / 20) * 1.3);
          ctx.strokeStyle = k > 15 ? "#d23b33" : INK;
          ctx.lineWidth = k % 5 === 0 ? 14 : 6;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * (k % 5 === 0 ? 170 : 195), 280 - Math.sin(a) * (k % 5 === 0 ? 170 : 195));
          ctx.lineTo(256 + Math.cos(a) * 230, 280 - Math.sin(a) * 230);
          ctx.stroke();
        }
        // crack
        ctx.strokeStyle = "#5a5a5a";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(120, 90);
        ctx.lineTo(210, 210);
        ctx.lineTo(190, 300);
        ctx.lineTo(300, 420);
        ctx.moveTo(210, 210);
        ctx.lineTo(330, 170);
        ctx.stroke();
      }),
    [],
  );
  const needle = Math.PI * (1.15 - 0.05 * 1.3) - Math.PI / 2 + Math.sin(f * 0.35) * 0.04 * (1 - fallen);
  return (
    <group position={position} rotation={[-Math.PI / 2 * fallen * 0.75, 0, 0.35 * fallen]} scale={scale}>
      <InkCylinder radius={0.3} height={0.08} rotation={[Math.PI / 2, 0, 0]} color="#b8933f" ink={0.01} />
      <mesh position={[0, 0, 0.042]}>
        <circleGeometry args={[0.26, 40]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      <group position={[0, -0.02, 0.05]} rotation={[0, 0, needle]}>
        <InkBox size={[0.02, 0.2, 0.008]} position={[0, 0.1, 0]} color="#d23b33" ink={0.002} />
      </group>
      <Ball position={[0, -0.02, 0.052]} radius={0.022} color={INK} />
      <mesh position={[0, 0, 0.047]}>
        <circleGeometry args={[0.26, 40]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.12} depthWrite={false} />
      </mesh>
      {label !== undefined && <Label text="REALITY" position={[0, -0.36, 0.03]} width={0.5} fg="#ffffff" bg="#13235e" appear={label} />}
    </group>
  );
};
// Broken stub where the dial used to sit on the pipe: a bent stem with a bolt and a dusty outline on the wall.
export const DialStub: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.025} height={0.18} position={[0, 0.09, 0]} color="#5f7470" ink={0.003} />
    <InkCylinder radius={0.03} height={0.03} position={[0.02, 0.19, 0]} rotation={[0, 0, 0.5]} color="#b8933f" ink={0.003} />
    <mesh position={[0, 0.5, -0.04]}>
      <ringGeometry args={[0.27, 0.31, 40]} />
      <meshBasicMaterial color="#0a3a40" transparent opacity={0.6} depthWrite={false} />
    </mesh>
  </group>
);

// The TEARS tap: a brass tap on a wall pipe, a handle that spins (`turn` radians) and a stream that never stops,
// splashing into a puddle.
export const TearsTap: React.FC<{ position: Vec3; f: number; turn?: number; label?: number; flow?: number }> = ({ position, f, turn = 0, label, flow = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.05} height={0.2} position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]} color="#b8933f" ink={0.005} />
    <InkCylinder radius={0.045} height={0.18} position={[0, -0.07, 0.2]} color="#b8933f" ink={0.005} />
    <InkCylinder radius={0.035} height={0.06} position={[0, 0.1, 0.12]} color="#b8933f" ink={0.004} />
    <group position={[0, 0.15, 0.12]} rotation={[0, turn, 0]}>
      {[0, 1].map((k) => (
        <InkBox key={k} size={[0.22, 0.03, 0.03]} position={[0, 0, 0]} rotation={[0, (k * Math.PI) / 2, 0]} color="#d23b33" ink={0.003} />
      ))}
      <Ball position={[0, 0.02, 0]} radius={0.03} color="#d23b33" />
    </group>
    {/* stream */}
    <group userData={{ ghost: true }}>
      <mesh position={[0, -0.16 - (position[1] - 0.16) / 2, 0.2]}>
        <cylinderGeometry args={[0.016 * flow, 0.024 * flow, position[1] - 0.16, 10]} />
        <meshBasicMaterial color="#9ff0f2" transparent opacity={0.8} toneMapped={false} />
      </mesh>
      <Drips from={[0, position[1] - 0.16, 0.2]} f={f} count={5} spread={0.04} period={10} size={0.014} />
    </group>
    {label !== undefined && <Label text="TEARS" position={[0.32, 0.12, 0.05]} width={0.4} fg="#ffffff" bg="#1b6fa0" appear={label} />}
  </group>
);

// The SAD SONGS speaker: a cabinet with a pulsing cone, blue notes rising, a repeat arrow that turns.
export const SadSpeaker: React.FC<{ position: Vec3; f: number; label?: number; scale?: number }> = ({ position, f, label, scale = 1 }) => {
  const pulse = 1 + Math.max(0, Math.sin(f * 0.45)) * 0.06;
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.6, 1.0, 0.45]} position={[0, 0.5, 0]} color="#2a2440" />
      <group position={[0, 0.62, 0.23]} scale={[pulse, pulse, 1]}>
        <InkCylinder radius={0.22} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.005} />
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.18, 32]} />
          <meshToonMaterial color="#4a4a6a" gradientMap={toonRamp} />
        </mesh>
        <Ball position={[0, 0, 0.03]} radius={0.06} color="#6a6a8a" scale={[1, 1, 0.5]} />
      </group>
      <group position={[0, 0.24, 0.23]}>
        <InkCylinder radius={0.09} height={0.03} rotation={[Math.PI / 2, 0, 0]} color="#1d1a1a" ink={0.004} />
      </group>
      {/* repeat arrow on top */}
      <group position={[0, 1.18, 0.05]} rotation={[0, 0, -f * 0.08]}>
        <mesh>
          <torusGeometry args={[0.12, 0.022, 8, 32, Math.PI * 1.6]} />
          <meshBasicMaterial color="#7fd3ff" toneMapped={false} />
        </mesh>
        <mesh position={[0.12, -0.02, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.05, 0.08, 3]} />
          <meshBasicMaterial color="#7fd3ff" toneMapped={false} />
        </mesh>
      </group>
      <MusicNotes position={[0.05, 1.0, 0.25]} f={f} count={6} color="#7fd3ff" spread={0.7} rise={0.9} />
      {label !== undefined && <Label text="SAD SONGS" position={[0, 0.06, 0.24]} width={0.56} fg="#ffffff" bg="#5a2a8a" appear={label} />}
    </group>
  );
};

// Bubbles drifting up past the camera (the inside-her-head feel).
export const DriftBubbles: React.FC<{ center: Vec3; f: number; count?: number; w?: number; h?: number; seed?: number }> = ({ center, f, count = 14, w = 2, h = 2.4, seed = 0 }) => (
  <group position={center} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const t = ((f * (0.006 + rnd(i + seed) * 0.006) + rnd(i + seed + 3)) % 1);
      return (
        <group key={i} position={[(rnd(i + seed + 6) - 0.5) * w + Math.sin(f * 0.05 + i) * 0.05, t * h, (rnd(i + seed + 9) - 0.5) * 0.8]}>
          <mesh>
            <ringGeometry args={[0.025 + rnd(i) * 0.03, 0.033 + rnd(i) * 0.035, 20]} />
            <meshBasicMaterial color="#e8fbfb" transparent opacity={0.7} depthWrite={false} toneMapped={false} />
          </mesh>
          <mesh position={[0.012, 0.012, 0.001]}>
            <circleGeometry args={[0.008, 8]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
        </group>
      );
    })}
  </group>
);

// ---------- flower shop ----------

// A stepped stand of zinc buckets, one flower colour per bucket.
export const BucketStand: React.FC<{ position: Vec3; tiers?: number; width?: number; seed?: number }> = ({ position, tiers = 3, width = 1.4, seed = 0 }) => {
  const colors = ["#f08cae", "#f5d04e", "#fbf8f0", "#e0262f", "#ff8a3d", "#c9a0e0"];
  return (
    <group position={position}>
      {Array.from({ length: tiers }, (_, t) => {
        const y = t * 0.3;
        const z = -t * 0.28;
        return (
          <group key={t}>
            <InkBox size={[width, 0.04, 0.3]} position={[0, y + 0.3, z]} color="#8a5a3a" ink={0.004} />
            {[-1, 1].map((s) => (
              <InkBox key={s} size={[0.04, y + 0.3, 0.04]} position={[s * (width / 2 - 0.03), (y + 0.3) / 2, z]} color="#6b4429" ink={0.003} />
            ))}
            {Array.from({ length: Math.round(width / 0.28) }, (_, i) => {
              const x = -width / 2 + 0.16 + i * 0.28;
              const c = colors[(i + t * 2 + seed) % colors.length];
              return (
                <group key={i} position={[x, y + 0.32, z]}>
                  <mesh position={[0, 0.11, 0]}>
                    <cylinderGeometry args={[0.1, 0.08, 0.22, 16]} />
                    <meshToonMaterial color="#9aa4a6" gradientMap={toonRamp} />
                  </mesh>
                  {Array.from({ length: 5 }, (_, k) => (
                    <group key={k}>
                      <InkBox size={[0.012, 0.2, 0.012]} position={[(rnd(k + i * 5 + t * 30 + seed) - 0.5) * 0.12, 0.3, (rnd(k + 9 + i) - 0.5) * 0.08]} color="#3f7a3a" ink={0} />
                      <Ball position={[(rnd(k + i * 5 + t * 30 + seed) - 0.5) * 0.14, 0.42 + rnd(k + i + 3) * 0.06, (rnd(k + 9 + i) - 0.5) * 0.1]} radius={0.04 + rnd(k + i) * 0.015} color={c} />
                    </group>
                  ))}
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

// Wrapping counter (0.62 m) with kraft paper roll on a bar behind, ribbon spools and twine.
export const WrapCounter: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.8 }) => (
  <group position={position}>
    <InkBox size={[width, 0.6, 0.55]} position={[0, 0.3, 0]} color="#8a5a3a" />
    {Array.from({ length: Math.round(width / 0.2) }, (_, i) => (
      <InkBox key={i} size={[0.01, 0.54, 0.01]} position={[-width / 2 + (i + 0.5) * 0.2, 0.3, 0.281]} color="#6b4429" ink={0} />
    ))}
    <InkBox size={[width + 0.06, 0.05, 0.6]} position={[0, 0.625, 0]} color="#c9a074" />
    {/* kraft paper sheet and scissors on top */}
    <InkBox size={[0.5, 0.008, 0.35]} position={[0.4, 0.655, 0]} rotation={[0, 0.2, 0]} color="#d9b48a" ink={0.002} />
    <InkBox size={[0.14, 0.012, 0.03]} position={[0.55, 0.665, 0.05]} rotation={[0, -0.5, 0]} color="#c9ced3" ink={0.002} />
    {[-0.6, -0.48, -0.36].map((x, i) => (
      <InkCylinder key={x} radius={0.045} height={0.05} position={[x, 0.675, -0.1]} rotation={[Math.PI / 2, 0, 0]} color={["#ff5fa8", "#ffd23f", "#e0262f"][i]} ink={0.003} />
    ))}
  </group>
);
export const PaperRolls: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.4 }) => (
  <group position={position}>
    <InkCylinder radius={0.015} height={width + 0.1} position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#2a2f3a" ink={0.003} />
    {[-0.45, 0, 0.45].map((x, i) => (
      <group key={x}>
        <InkCylinder radius={0.07} height={0.4} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} color={["#c9a074", "#f4c9cf", "#fbf8f0"][i]} ink={0.004} />
        <InkBox size={[0.38, 0.35, 0.005]} position={[x, -0.24, 0.07]} color={["#c9a074", "#f4c9cf", "#fbf8f0"][i]} ink={0.002} />
      </group>
    ))}
  </group>
);
// Hanging plant in a basket with trailing vines.
export const HangingPlant: React.FC<{ position: Vec3; f?: number; drop?: number }> = ({ position, f = 0, drop = 0.5 }) => (
  <group position={position} rotation={[0, 0, Math.sin(f * 0.04 + position[0]) * 0.04]}>
    <mesh position={[0, drop / 2, 0]}>
      <cylinderGeometry args={[0.004, 0.004, drop, 6]} />
      <meshBasicMaterial color="#c9a074" />
    </mesh>
    <InkCylinder radius={0.13} height={0.12} position={[0, 0, 0]} color="#c9a074" ink={0.004} />
    <Ball position={[0, 0.08, 0]} radius={0.15} color="#4e8a4a" scale={[1.2, 0.7, 1.2]} />
    {[-0.12, -0.04, 0.05, 0.13].map((x, i) => (
      <group key={x}>
        {Array.from({ length: 4 + (i % 2) }, (_, k) => (
          <Ball key={k} position={[x + Math.sin(k + i) * 0.02, -0.06 - k * 0.09, 0.08]} radius={0.035} color={k % 2 ? "#5fb06a" : "#3f7a3a"} scale={[1, 0.7, 0.5]} />
        ))}
      </group>
    ))}
  </group>
);
// Glass-door cooler with buckets of flowers and a cold glow, misted glass.
export const FlowerCooler: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 1.4 }) => (
  <group position={position}>
    <InkBox size={[width + 0.1, 2.1, 0.6]} position={[0, 1.05, 0]} color="#e8eef0" />
    <mesh position={[0, 1.05, 0.302]}>
      <planeGeometry args={[width - 0.06, 1.9]} />
      <meshBasicMaterial color="#d8f4ff" toneMapped={false} />
    </mesh>
    {[0.35, 0.95, 1.55].map((y, r) => (
      <group key={y}>
        <InkBox size={[width - 0.1, 0.02, 0.3]} position={[0, y, 0.18]} color="#c9ced3" ink={0.002} />
        {Array.from({ length: 4 }, (_, i) => (
          <Ball key={i} position={[-width / 2 + 0.2 + i * ((width - 0.4) / 3), y + 0.14, 0.22]} radius={0.1} color={["#f08cae", "#fbf8f0", "#f5d04e", "#e0262f"][(i + r) % 4]} />
        ))}
      </group>
    ))}
    <mesh position={[0, 1.05, 0.31]}>
      <planeGeometry args={[width - 0.06, 1.9]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
    </mesh>
    <InkBox size={[0.04, 1.9, 0.04]} position={[0, 1.05, 0.32]} color="#c9ced3" ink={0.003} />
    <Halo position={[0, 1.05, 0.4]} size={1.6} color="#bfe8ff" strength={0.2} />
  </group>
);

// A single red rose (world space, stem pointing down from the bloom).
export const Rose: React.FC<{ position: Vec3; tilt?: number; scale?: number }> = ({ position, tilt = 0, scale = 1 }) => (
  <group position={position} rotation={[0, 0, tilt]} scale={scale} userData={{ ghost: true }}>
    <InkBox size={[0.012, 0.32, 0.012]} position={[0, -0.13, 0]} color="#3f7a3a" ink={0.002} />
    <InkBox size={[0.06, 0.025, 0.008]} position={[0.03, -0.12, 0]} rotation={[0, 0, 0.5]} color="#4e8a4a" ink={0.002} />
    <Ball position={[0, 0.05, 0]} radius={0.045} color="#e0262f" scale={[1, 1.1, 1]} />
    <Ball position={[0, 0.075, 0.015]} radius={0.022} color="#b5121b" />
  </group>
);

// Thought bubble (three small puffs and a big cloud) with content inside; faces +z.
export const ThoughtCloud: React.FC<{ position: Vec3; appear: number; size?: number; children?: React.ReactNode; tail?: 1 | -1 }> = ({ position, appear, size = 0.7, children, tail = -1 }) => {
  if (appear < 0) return null;
  const s = appear < 8 ? Math.min(1.12, (appear / 8) * 1.12) : 1 + 0.12 * Math.max(0, 1 - (appear - 8) / 6);
  return (
    <group position={position} userData={{ ghost: true }}>
      {[0, 1, 2].map((i) => (
        <Ball key={i} position={[tail * (size * 0.35 + i * 0.07), -size * 0.55 - i * 0.12 + 0.1, 0]} radius={0.025 + (2 - i) * 0.015} color="#ffffff" scale={[1, 1, 0.3]} />
      ))}
      <group scale={s}>
        {Array.from({ length: 9 }, (_, i) => {
          const a = (i / 9) * Math.PI * 2;
          return <Ball key={i} position={[Math.cos(a) * size * 0.42, Math.sin(a) * size * 0.3, -0.02]} radius={size * 0.2} color="#ffffff" scale={[1, 1, 0.3]} ink={1.05} />;
        })}
        <Ball position={[0, 0, -0.01]} radius={size * 0.42} color="#ffffff" scale={[1.05, 0.75, 0.2]} ink={1} />
        <group position={[0, 0, 0.06]}>{children}</group>
      </group>
    </group>
  );
};
