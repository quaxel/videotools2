import React from "react";
import * as THREE from "three";
import { canvasTexture, Vec3 } from "../../engine";
import { Ball, Cap, Cyl, RBox } from "../dog-nose/props";
import { useOwnedGeo, useOwnedTex } from "../dog-nose/sets";

// Props for "You Wake Up With an Eagle's Vision": a 3D eagle and pigeon, the fly, a macro eagle eye, a mirror.
// Rounded, smooth-shaded Pixar-style forms; birds face +z with their wings along x.

const INK = "#161212";
const hot = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k).getStyle();

// ---------- the eagle ----------

// One wing: a narrow arm with coverts, a trailing row of secondaries and a fan of long primaries. `a` raises (+) or drops (-)
// the tip, `fold` 0..1 tucks it in.
const Wing: React.FC<{ side: 1 | -1; a: number; fold?: number; brown: string; edge: string; tip: string; len?: number }> = ({ side, a, fold = 0, brown, edge, tip, len = 1 }) => {
  const f = 1 - fold * 0.78;
  return (
    <group rotation={[0, fold * side * -0.9, side * a]}>
      {/* arm and coverts: rounded, overlapping */}
      <Ball position={[side * 0.22 * len * f, 0, -0.02]} radius={0.2} color={brown} scale={[1.2 * len * f, 0.13, 0.9]} rough={0.8} />
      <Ball position={[side * 0.5 * len * f, 0.0, -0.04]} radius={0.16} color={edge} scale={[1.35 * len * f, 0.12, 0.85]} rough={0.8} />
      {/* secondaries: short feathers along the trailing edge */}
      {Array.from({ length: 6 }, (_, i) => (
        <group key={i} position={[side * (0.14 + i * 0.1) * len * f, 0, -0.14]} rotation={[0, side * (0.02 + i * 0.01), 0]}>
          <Ball position={[0, 0, -0.1]} radius={0.13} color={i % 2 ? brown : edge} scale={[0.48 * len, 0.07, 1.0]} rough={0.8} />
        </group>
      ))}
      <group position={[side * 0.74 * len * f, 0, -0.02]} rotation={[0, 0, side * (-0.08 - fold * 0.5)]}>
        {Array.from({ length: 8 }, (_, i) => {
          const k = i / 7;
          return (
            <group key={i} rotation={[0, side * (-0.12 + k * 0.78 - fold * 0.5), side * (k * 0.1)]}>
              <Ball position={[side * 0.25 * len, 0, 0]} radius={0.26 * len * (1 - k * 0.2)} color={i % 2 ? tip : edge} scale={[1, 0.05, 0.3]} rough={0.8} />
            </group>
          );
        })}
      </group>
    </group>
  );
};

// A bald-eagle-like bird: white head fused to a white ruff, dark brown streamlined body, big hooked yellow beak, fierce
// brow, white tail. ~2.4 m wingspan at scale 1.
export const Eagle: React.FC<{ position: Vec3; f: number; scale?: number; rotation?: Vec3; glide?: number; fold?: number; talons?: boolean; flap?: number }> = ({
  position,
  f,
  scale = 1,
  rotation = [0, 0, 0],
  glide = 0,
  fold = 0,
  talons = true,
  flap,
}) => {
  const flapA = flap ?? (glide ? 0.12 + Math.sin(f * 0.07) * 0.05 : Math.sin(f * 0.2) * 0.62 + 0.05);
  const brown = "#4a2e1a";
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, Math.sin(f * 0.2) * 0.012 * (1 - glide), 0]}>
        {/* one smooth body: torso, shoulders, a tapering rump */}
        <Ball position={[0, 0, 0]} radius={0.17} color={brown} scale={[0.95, 0.85, 1.7]} rough={0.8} />
        <Ball position={[0, 0.01, 0.2]} radius={0.15} color="#5a3a22" scale={[1, 0.95, 1]} rough={0.8} />
        <Ball position={[0, 0.0, -0.22]} radius={0.12} color={brown} scale={[0.8, 0.7, 1.4]} rough={0.8} />
        {/* white ruff and head in one mass; a curved, hooked beak in three capsule segments; eyes under a heavy brow */}
        <Ball position={[0, 0.05, 0.3]} radius={0.15} color="#fbf7ee" scale={[1, 1, 0.95]} rough={0.7} />
        <Ball position={[0, 0.115, 0.4]} radius={0.115} color="#fbf7ee" scale={[0.95, 0.95, 1.05]} rough={0.7} />
        <Cap a={[0, 0.085, 0.47]} b={[0, 0.085, 0.545]} r={0.043} color="#ffc21a" />
        <Cap a={[0, 0.085, 0.545]} b={[0, 0.062, 0.6]} r={0.031} color="#ffb000" />
        <Cap a={[0, 0.062, 0.6]} b={[0, 0.018, 0.618]} r={0.017} color="#d98c00" />
        <Cap a={[0, 0.055, 0.47]} b={[0, 0.048, 0.565]} r={0.02} color="#e8a010" ink={0} />
        {[-1, 1].map((s) => (
          <group key={s}>
            <Ball position={[s * 0.085, 0.125, 0.455]} radius={0.027} color="#ffe14a" glow />
            <Ball position={[s * 0.099, 0.125, 0.471]} radius={0.013} color={INK} />
            <Cap a={[s * 0.13, 0.175, 0.41]} b={[s * 0.035, 0.16, 0.5]} r={0.024} color="#f2ecdc" ink={0} />
          </group>
        ))}
        {/* tail: seven overlapping white leaf feathers fanned from a rounded base that sits inside the rump */}
        <Ball position={[0, 0.0, -0.3]} radius={0.075} color="#fffdf6" scale={[1.1, 0.5, 1.1]} rough={0.7} />
        {Array.from({ length: 7 }, (_, i) => (
          <group key={i} position={[0, 0.0, -0.3]} rotation={[0.08, (i - 3) * 0.13, 0]}>
            <Ball position={[0, 0, -0.2]} radius={0.2} color={i % 2 ? "#fffdf6" : "#f3efe4"} scale={[0.2, 0.05, 1.0]} rough={0.7} />
          </group>
        ))}
        {/* legs and talons */}
        {talons &&
          [-1, 1].map((s) => (
            <group key={s} position={[s * 0.07, -0.1, -0.04]} rotation={[-0.5 + fold * 0.7, 0, 0]}>
              <Cap a={[0, 0, 0]} b={[0, -0.1, 0.03]} r={0.025} color="#ffc21a" />
              {[-1, 0, 1].map((k) => (
                <Cap key={k} a={[0, -0.1, 0.03]} b={[k * 0.03, -0.15, 0.1]} r={0.01} color="#2a2a30" ink={0} />
              ))}
            </group>
          ))}
        {[-1, 1].map((sd) => (
          <Ball key={sd} position={[sd * 0.1, 0.06, 0.08]} radius={0.12} color="#5a3a22" scale={[1, 0.75, 1.3]} rough={0.8} />
        ))}
        <group position={[0.12, 0.08, 0.06]}>
          <Wing side={1} a={flapA} fold={fold} brown={brown} edge="#6a4528" tip="#3a2414" />
        </group>
        <group position={[-0.12, 0.08, 0.06]}>
          <Wing side={-1} a={flapA} fold={fold} brown={brown} edge="#6a4528" tip="#3a2414" />
        </group>
      </group>
    </group>
  );
};

// ---------- the pigeon ----------

// A plump grey city pigeon: iridescent neck, orange eye, pink feet. `walk` is the stride phase (0 = standing), `look` turns
// the head, `bob` the head-bob of a walking pigeon.
export const Pigeon: React.FC<{ position: Vec3; f: number; walk?: number; rotationY?: number; scale?: number; look?: number; cock?: number }> = ({
  position,
  f,
  walk = 0,
  rotationY = 0,
  scale = 1,
  look = 0,
  cock = 0,
}) => {
  const neckTex = useOwnedTex(() =>
    canvasTexture(64, 128, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 128);
      g.addColorStop(0, "#58c89a");
      g.addColorStop(0.35, "#4aa8d8");
      g.addColorStop(0.7, "#a45fc8");
      g.addColorStop(1, "#c46aa8");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 64, 128);
    }),
  );
  const ph = walk * 0.6;
  const bob = walk ? Math.sin(ph * 2) * 0.018 : Math.sin(f * 0.1) * 0.003;
  const head = walk ? Math.sin(ph) * 0.03 : 0;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <group position={[0, 0.17 + bob * 0.5, 0]}>
        <Ball position={[0, 0.02, -0.02]} radius={0.09} color="#98a1b1" scale={[1, 0.95, 1.55]} rough={0.8} />
        <Ball position={[0, 0.0, 0.06]} radius={0.078} color="#b6bfcd" scale={[1.05, 1, 1]} rough={0.8} />
        <Ball position={[0, 0.105, 0.095]} radius={0.062} color="#ffffff" map={neckTex} scale={[1.05, 0.95, 1]} rough={0.3} />
        <group position={[0, 0.18 + bob, 0.13 + head]} rotation={[0, look, cock]}>
          <Ball position={[0, 0, 0]} radius={0.05} color="#8c95a8" rough={0.8} />
          <Ball position={[0, -0.005, 0.05]} radius={0.03} color="#8c95a8" rough={0.8} />
          <Cap a={[0, -0.005, 0.07]} b={[0, -0.018, 0.115]} r={0.014} color="#e9d3bd" ink={0} />
          <Ball position={[0, 0.003, 0.068]} radius={0.012} color="#ffffff" scale={[1.2, 0.8, 0.8]} />
          {[-1, 1].map((s) => (
            <group key={s}>
              <Ball position={[s * 0.034, 0.014, 0.03]} radius={0.017} color="#ff8a1a" glow />
              <Ball position={[s * 0.039, 0.014, 0.042]} radius={0.009} color={INK} />
              <Ball position={[s * 0.04, 0.019, 0.05]} radius={0.003} color="#ffffff" glow />
            </group>
          ))}
        </group>
        {/* folded wings with dark bars, and a tail with a dark band */}
        {[-1, 1].map((s) => (
          <group key={s}>
            <Ball position={[s * 0.07, 0.03, -0.035]} radius={0.085} color="#7d8698" scale={[0.45, 0.85, 1.7]} rough={0.8} />
            <Ball position={[s * 0.1, 0.045, -0.03]} radius={0.04} color="#3c4252" scale={[0.3, 0.4, 1.7]} rough={0.8} />
            <Ball position={[s * 0.09, 0.0, -0.155]} radius={0.03} color="#5a6274" scale={[0.35, 0.3, 1.9]} rough={0.8} />
          </group>
        ))}
        <RBox size={[0.09, 0.016, 0.16]} position={[0, 0.0, -0.2]} rotation={[0.15, 0, 0]} color="#6f7888" radius={0.008} />
        <RBox size={[0.09, 0.017, 0.035]} position={[0, 0.0, -0.275]} rotation={[0.15, 0, 0]} color="#2c303c" radius={0.008} />
      </group>
      {/* feet, alternating while walking */}
      {[-1, 1].map((s) => {
        const sw = Math.sin(ph + (s > 0 ? 0 : Math.PI)) * (walk ? 0.07 : 0);
        const lift = walk ? Math.max(0, Math.cos(ph + (s > 0 ? 0 : Math.PI))) * 0.03 : 0;
        return (
          <group key={s} position={[s * 0.035, 0, sw]}>
            <Cap a={[0, 0.16, 0]} b={[0, 0.02 + lift, 0.01]} r={0.009} color="#e8808a" ink={0} />
            {[-1, 0, 1].map((k) => (
              <Cap key={k} a={[0, 0.02 + lift, 0.01]} b={[k * 0.018, 0.005 + lift, 0.05]} r={0.006} color="#e8808a" ink={0} />
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ---------- the fly ----------

// A housefly on a surface (front legs rubbing) or buzzing. Seen from above on a wall it reads as: a small head with two big
// red compound eyes, a grey thorax with dark stripes, a dark banded abdomen, two veined wings swept back, six bent legs.
export const Fly: React.FC<{ position: Vec3; f: number; scale?: number; rotation?: Vec3; buzz?: number; rub?: number; wall?: number }> = ({ position, f, scale = 1, rotation = [0, 0, 0], buzz = 0, rub = 1, wall }) => {
  const w = buzz ? Math.sin(f * 2.3) * 0.5 : Math.sin(f * 0.3) * 0.03;
  const r = Math.sin(f * 0.7) * rub;
  const wingTex = useOwnedTex(() =>
    canvasTexture(128, 256, (ctx) => {
      ctx.clearRect(0, 0, 128, 256);
      // leaf: narrow root at the bottom, widest at two thirds, rounded tip at the top
      ctx.beginPath();
      ctx.moveTo(64, 250);
      ctx.bezierCurveTo(10, 200, 4, 80, 40, 14);
      ctx.bezierCurveTo(54, -2, 76, -2, 90, 14);
      ctx.bezierCurveTo(124, 80, 118, 200, 64, 250);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, 0, 128, 0);
      g.addColorStop(0, "rgba(200,222,240,0.62)");
      g.addColorStop(0.5, "rgba(236,246,255,0.5)");
      g.addColorStop(1, "rgba(190,214,236,0.66)");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = "rgba(60,72,92,0.9)";
      ctx.stroke();
      ctx.lineWidth = 3;
      ctx.strokeStyle = "rgba(60,72,92,0.75)";
      [[64, 250, 64, 20], [64, 250, 34, 40], [64, 250, 96, 40], [64, 190, 18, 120], [64, 190, 110, 120]].forEach(([x0, y0, x1, y1]) => {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.quadraticCurveTo((x0 + x1) / 2 + (x1 < x0 ? -8 : 8), (y0 + y1) / 2, x1, y1);
        ctx.stroke();
      });
    }),
  );
  const eyeTex = useOwnedTex(() => {
    const t = canvasTexture(512, 512, (ctx) => {
      const g = ctx.createRadialGradient(200, 190, 20, 256, 256, 330);
      g.addColorStop(0, "#ff5a3c");
      g.addColorStop(0.45, "#d4262a");
      g.addColorStop(1, "#6a0a14");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 512, 512);
      const R = 17;
      const dx = R * Math.sqrt(3);
      const dy = R * 1.5;
      for (let row = -1; row < 512 / dy + 1; row++) {
        for (let col = -1; col < 512 / dx + 1; col++) {
          const cx = col * dx + (row % 2 ? dx / 2 : 0);
          const cy = row * dy;
          ctx.beginPath();
          for (let k = 0; k < 6; k++) {
            const a = (Math.PI / 3) * k + Math.PI / 6;
            ctx.lineTo(cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1));
          }
          ctx.closePath();
          ctx.strokeStyle = "rgba(60,0,8,0.55)";
          ctx.lineWidth = 2.2;
          ctx.stroke();
          ctx.fillStyle = "rgba(255,210,190,0.35)";
          ctx.beginPath();
          ctx.arc(cx - R * 0.28, cy - R * 0.3, R * 0.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  });
  const body = (
    <>
      {/* abdomen with three pale bands, thorax with four dark stripes, head with proboscis */}
      <Ball position={[0, 0, -0.055]} radius={0.034} color="#2f2c37" scale={[0.82, 0.6, 1.45]} rough={0.35} />
      {[0, 1, 2].map((k) => (
        <Ball key={k} position={[0, 0.014 - k * 0.0015, -0.03 - k * 0.026]} radius={0.032 - k * 0.003} color="#9a97a4" scale={[0.88, 0.14, 0.2]} rough={0.5} />
      ))}
      <Ball position={[0, 0.004, 0.006]} radius={0.03} color="#8c8997" scale={[1, 0.78, 1.05]} rough={0.35} />
      {[-0.014, -0.0045, 0.0045, 0.014].map((x, i) => (
        <Cap key={i} a={[x, 0.021, -0.02]} b={[x * 0.9, 0.021, 0.03]} r={0.0028} color="#1e1c24" ink={0} />
      ))}
      <Ball position={[0, 0.0, 0.048]} radius={0.021} color="#5a5664" rough={0.35} />
      {[-1, 1].map((s) => (
        <Ball key={s} position={[s * 0.019, 0.005, 0.054]} radius={0.017} color="#ffffff" map={eyeTex} rough={0.15} />
      ))}
      <Cap a={[0, -0.008, 0.062]} b={[0, -0.026, 0.084]} r={0.0038} color="#1a1820" ink={0} />
      {/* wings: two veined leaf planes lying on the back, swept back and slightly spread */}
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.012, 0.027, 0.0]} rotation={[0, -s * (0.26 + w), s * 0.04]}>
          <mesh position={[0, 0, -0.082]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.062, 0.165]} />
            <meshBasicMaterial map={wingTex} transparent side={THREE.DoubleSide} depthWrite={false} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* six bent legs; the front pair rub */}
      {[0, 1, 2].map((k) =>
        [-1, 1].map((s) => {
          const z = 0.02 - k * 0.032;
          const knee: Vec3 = [s * 0.05, 0.012, z + (k === 0 ? 0.014 : 0)];
          const foot: Vec3 = [s * (0.066 + (k === 0 ? Math.abs(r) * -0.018 : 0.0)), -0.03, z + (k === 0 ? 0.034 : k === 1 ? 0 : -0.022)];
          return (
            <group key={`${k}${s}`}>
              <Cap a={[s * 0.012, -0.004, z]} b={knee} r={0.0045} color="#26232c" ink={0} />
              <Cap a={knee} b={foot} r={0.0035} color="#26232c" ink={0} />
            </group>
          );
        }),
      )}
    </>
  );
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {wall === undefined ? body : <group rotation={[0, 0, wall]}><group rotation={[Math.PI / 2, 0, 0]}>{body}</group></group>}
    </group>
  );
};

// ---------- the eagle eye ----------

// A macro eye for the "eagle vision unlocked" moment: skin, a heavy brow, white eyeball, a hazel iris that turns gold
// with radial fibres, a pupil that snaps small, lids that open. Faces +z; the eyeball is ~1 unit wide.
export const EagleEye: React.FC<{ position: Vec3; f: number; open?: number; gold?: number; pupil?: number; scale?: number; rotation?: Vec3; look?: [number, number]; skin?: string; ring?: number }> = ({
  position,
  f,
  open = 1,
  gold = 0,
  pupil = 0.5,
  scale = 1,
  rotation = [0, 0, 0],
  look = [0, 0],
  skin = "#fde3c8",
  ring = 0,
}) => {
  const irisTex = useOwnedTex(
    () =>
      canvasTexture(512, 512, (ctx) => {
        const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
        g.addColorStop(0, "#fff0a0");
        g.addColorStop(0.45, "#ffc21a");
        g.addColorStop(0.85, "#e07a00");
        g.addColorStop(1, "#8a3a00");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        ctx.lineCap = "round";
        for (let i = 0; i < 90; i++) {
          const a = (i / 90) * Math.PI * 2;
          const r0 = 70 + ((i * 37) % 40);
          const r1 = 190 + ((i * 53) % 60);
          ctx.strokeStyle = i % 3 ? "rgba(150,70,0,0.28)" : "rgba(255,248,190,0.38)";
          ctx.lineWidth = 3 + (i % 3);
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0);
          ctx.lineTo(256 + Math.cos(a + 0.05) * r1, 256 + Math.sin(a + 0.05) * r1);
          ctx.stroke();
        }
      }),
  );
  const hazelTex = useOwnedTex(
    () =>
      canvasTexture(512, 512, (ctx) => {
        const g = ctx.createRadialGradient(256, 256, 40, 256, 256, 256);
        g.addColorStop(0, "#a8794a");
        g.addColorStop(0.6, "#6a4126");
        g.addColorStop(1, "#2e1a0e");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 512, 512);
        for (let i = 0; i < 120; i++) {
          const a = (i / 120) * Math.PI * 2;
          ctx.strokeStyle = "rgba(20,10,4,0.45)";
          ctx.lineWidth = 2 + (i % 3);
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * 80, 256 + Math.sin(a) * 80);
          ctx.lineTo(256 + Math.cos(a) * 230, 256 + Math.sin(a) * 230);
          ctx.stroke();
        }
      }),
  );
  const sh = Math.max(0, Math.min(1, 1 - open));
  const lidRot = -Math.PI / 2 + sh * Math.PI * 0.98;
  const lowRot = Math.PI / 2 - sh * 0.35 - 0.15;
  const lx = look[0] * 0.12;
  const ly = look[1] * 0.1;
  const pr = 0.12 + pupil * 0.26;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* skin round the eye and a heavy brow */}
      <Ball position={[0, 0, -0.35]} radius={1.6} color={skin} scale={[1.9, 1.5, 0.35]} rough={0.7} />
      <Cap a={[-1.05, 0.95, 0.05]} b={[0.95, 1.12, 0.05]} r={0.17} color="#4a2a16" />
      <Cap a={[0.95, 1.12, 0.05]} b={[1.25, 0.88, 0.05]} r={0.13} color="#4a2a16" />
      {/* eyeball */}
      <Ball position={[0, 0, 0]} radius={1} color="#fbf4ea" scale={[1.35, 0.92, 0.5]} rough={0.25} />
      <group position={[lx, ly, 0.5]}>
        <mesh position={[0, 0, 0.003]}>
          <circleGeometry args={[0.66, 48]} />
          <meshBasicMaterial map={hazelTex} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.006]}>
          <circleGeometry args={[0.66, 48]} />
          <meshBasicMaterial map={irisTex} color={new THREE.Color(1.12, 1.02, 0.85)} transparent opacity={gold} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0, 0.008]}>
          <ringGeometry args={[0.6, 0.67, 48]} />
          <meshBasicMaterial color="#1a0c04" toneMapped={false} />
        </mesh>
        {ring > 0 && (
          <mesh position={[0, 0, 0.012]} rotation={[0, 0, f * 0.05]}>
            <ringGeometry args={[0.72 + ring * 0.25, 0.76 + ring * 0.25, 48, 1]} />
            <meshBasicMaterial color={new THREE.Color(2.2, 1.7, 0.4)} transparent opacity={Math.max(0, 1 - ring)} toneMapped={false} />
          </mesh>
        )}
        <mesh position={[0, 0, 0.014]}>
          <circleGeometry args={[pr, 48]} />
          <meshBasicMaterial color="#000000" toneMapped={false} />
        </mesh>
        <Ball position={[-0.2, 0.22, 0.05]} radius={0.12} color="#ffffff" glow scale={[1, 1, 0.1]} />
        <Ball position={[0.22, -0.2, 0.05]} radius={0.055} color="#ffffff" glow scale={[1, 1, 0.1]} />
      </group>
      {/* upper lid (a skin dome that tips back when open) and a lower lid */}
      <group rotation={[lidRot, 0, 0]} scale={[1.42, 1.08, 1.0]}>
        <mesh>
          <sphereGeometry args={[0.97, 36, 18, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color={skin} roughness={0.65} side={THREE.DoubleSide} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.97, 0.035, 10, 56]} />
          <meshStandardMaterial color="#3a2010" roughness={0.6} />
        </mesh>
      </group>
      <group rotation={[lowRot - Math.PI, 0, 0]} scale={[1.42, 0.9, 1.0]}>
        <mesh>
          <sphereGeometry args={[0.97, 36, 12, 0, Math.PI * 2, 0, Math.PI / 4]} />
          <meshStandardMaterial color={skin} roughness={0.65} side={THREE.DoubleSide} />
        </mesh>
      </group>
      {/* lashes on the upper lid line */}
      {sh < 0.9 &&
        Array.from({ length: 11 }, (_, i) => {
          const u = (i / 10) * 2 - 1;
          return <Cap key={i} a={[u * 1.2, 0.6 - u * u * 0.5, 0.45]} b={[u * 1.32, 0.78 - u * u * 0.55, 0.5]} r={0.009} color="#2a1608" ink={0} />;
        })}
    </group>
  );
};

// ---------- small props ----------

// An oval wall mirror with a glossy pane (diagonal sheen) in a wooden frame; put a puppet just behind the glass plane.
export const Mirror: React.FC<{ position: Vec3; rotation?: Vec3; width?: number; height?: number; sheen?: number; front?: number }> = ({ position, rotation = [0, 0, 0], width = 1.2, height = 1.7, sheen = 0.5, front = 0.02 }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);
      const g = ctx.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0.25, "rgba(255,255,255,0)");
      g.addColorStop(0.34, "rgba(255,255,255,0.8)");
      g.addColorStop(0.4, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0)");
      g.addColorStop(0.56, "rgba(255,255,255,0.45)");
      g.addColorStop(0.6, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }),
  );
  return (
    <group position={position} rotation={rotation}>
      <group scale={[width / 2, height / 2, 1]}>
        <mesh position={[0, 0, -0.01]}>
          <circleGeometry args={[1.0, 48]} />
          <meshStandardMaterial color="#e6d4f6" roughness={0.12} metalness={0.15} emissive="#a58ad0" emissiveIntensity={0.35} />
        </mesh>
        <mesh>
          <torusGeometry args={[1.0, 0.07, 14, 56]} />
          <meshStandardMaterial color="#b8793a" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0, front]}>
          <circleGeometry args={[0.98, 48]} />
          <meshBasicMaterial map={tex} transparent opacity={sheen} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// A short motion trail behind something fast (the zoom to the bird): additive streaks.
export const Streaks: React.FC<{ position: Vec3; rotation?: Vec3; length?: number; count?: number; f: number; color?: string }> = ({ position, rotation = [0, 0, 0], length = 2, count = 14, f, color = "#fff2c0" }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + i;
      const r = 0.1 + ((i * 0.37) % 1) * 0.5;
      const o = ((f * 0.07 + i * 0.31) % 1) * length;
      return <Cap key={i} a={[Math.cos(a) * r, Math.sin(a) * r, o]} b={[Math.cos(a) * r, Math.sin(a) * r, o + length * 0.25]} r={0.006} color={color} ink={0} emissive={color} glowK={1} />;
    })}
  </group>
);

// A power line across the street with a bird-sized perch: two thin cables.
export const Cable: React.FC<{ a: Vec3; b: Vec3; sag?: number }> = ({ a, b, sag = 0.4 }) => {
  const n = 12;
  const pts: Vec3[] = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - Math.sin(t * Math.PI) * sag, a[2] + (b[2] - a[2]) * t];
  });
  return (
    <group>
      {pts.slice(0, -1).map((p, i) => (
        <Cap key={i} a={p} b={pts[i + 1]} r={0.012} color="#25252b" ink={0} />
      ))}
    </group>
  );
};

export const Mug: React.FC<{ position: Vec3; color?: string; steam?: number; f?: number; scale?: number; rotation?: Vec3 }> = ({ position, color = "#ffffff", steam = 0, f = 0, scale = 1, rotation = [0, 0, 0] }) => (
  <group position={position} scale={scale} rotation={rotation}>
    <Cyl r={0.045} r2={0.04} h={0.09} position={[0, 0.045, 0]} color={color} />
    <Cyl r={0.038} h={0.004} position={[0, 0.088, 0]} color="#5a3320" />
    <mesh position={[0.05, 0.05, 0]} rotation={[0, 0, 0]}>
      <torusGeometry args={[0.022, 0.006, 8, 16]} />
      <meshStandardMaterial color={color} roughness={0.4} />
    </mesh>
    {steam > 0 &&
      [0, 1, 2].map((k) => {
        const t = ((f * 0.03 + k / 3) % 1);
        return <Ball key={k} position={[Math.sin(t * 6 + k) * 0.012, 0.1 + t * 0.12, 0]} radius={0.012 + t * 0.014} color="#ffffff" opacity={0.5 * (1 - t) * steam} />;
      })}
  </group>
);

// An impact starburst on a surface facing +z: white rays that flash out and fade (t = frames since the hit).
export const Burst: React.FC<{ position: Vec3; t: number; size?: number; color?: string }> = ({ position, t, size = 0.5, color = "#ffffff" }) => {
  if (t < 0 || t > 14) return null;
  const k = Math.min(1, t / 4);
  const o = 1 - Math.max(0, (t - 6) / 8);
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + 0.2;
        const r0 = size * 0.25 * (0.6 + k);
        const r1 = size * (0.45 + 0.4 * ((i * 7) % 3) / 2) * k;
        return <Cap key={i} a={[Math.cos(a) * r0, Math.sin(a) * r0, 0.03]} b={[Math.cos(a) * r1, Math.sin(a) * r1, 0.03]} r={0.012} color={color} ink={0} emissive={color} glowK={0.35 * o} />;
      })}
    </group>
  );
};

// Cartoon dizzy stars orbiting a point (a head after a bonk): small yellow four-spike stars at a tilted ring.
export const DizzyStars: React.FC<{ position: Vec3; f: number; radius?: number; count?: number; size?: number }> = ({ position, f, radius = 0.32, count = 5, size = 0.05 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + f * 0.09;
      const p: Vec3 = [Math.cos(a) * radius, Math.sin(a * 2) * 0.03, Math.sin(a) * radius * 0.45];
      return (
        <group key={i} position={p} rotation={[0, 0, f * 0.07 + i]}>
          <Ball position={[0, 0, 0]} radius={size * 0.55} color={new THREE.Color("#ffd23f").multiplyScalar(1.5).getStyle()} glow />
          <Cap a={[-size, 0, 0]} b={[size, 0, 0]} r={size * 0.16} color="#ffd23f" ink={0} emissive="#ffd23f" glowK={0.9} />
          <Cap a={[0, -size, 0]} b={[0, size, 0]} r={size * 0.16} color="#ffd23f" ink={0} emissive="#ffd23f" glowK={0.9} />
        </group>
      );
    })}
  </group>
);

// Radial cracks in a pane facing +z: thin white lines with forks, `t` 0..1 grows them.
export const GlassCrack: React.FC<{ position: Vec3; t: number; size?: number }> = ({ position, t, size = 0.5 }) => {
  if (t <= 0) return null;
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        const L = size * (0.45 + ((i * 37) % 10) / 10) * Math.min(1, t * 1.4);
        const mid: Vec3 = [Math.cos(a) * L * 0.55 + Math.sin(a) * 0.02, Math.sin(a) * L * 0.55 - Math.cos(a) * 0.02, 0.02];
        const end: Vec3 = [Math.cos(a) * L, Math.sin(a) * L, 0.02];
        const fork: Vec3 = [mid[0] + Math.cos(a + 0.7) * L * 0.3, mid[1] + Math.sin(a + 0.7) * L * 0.3, 0.02];
        return (
          <group key={i}>
            <Cap a={[0, 0, 0.02]} b={mid} r={0.0045} color="#ffffff" ink={0} emissive="#ffffff" glowK={0.5} />
            <Cap a={mid} b={end} r={0.003} color="#ffffff" ink={0} emissive="#ffffff" glowK={0.5} />
            <Cap a={mid} b={fork} r={0.0025} color="#ffffff" ink={0} emissive="#ffffff" glowK={0.4} />
          </group>
        );
      })}
    </group>
  );
};

const archShape = (w: number, h: number, y0 = 0) => {
  const r = w / 2;
  const sh = new THREE.Shape();
  sh.moveTo(-r, y0);
  sh.lineTo(r, y0);
  sh.lineTo(r, h - r);
  sh.absarc(0, h - r, r, 0, Math.PI, false);
  sh.lineTo(-r, y0);
  return sh;
};

// A standing arch-top mirror with a flat base: the wooden frame stops flush at the floor (its bottom rail is just below it, hidden),
// the glass is lilac with a diagonal sheen. Local y = 0 is the floor; face +z (rotate [0, PI/2, 0] to face +x). The glass is a
// rectangle up to y = height - width / 2 under a half circle, so a puppet mask with the same shape (center at that height,
// `archBottom`) keeps a reflection inside it.
export const MirrorArch: React.FC<{ position: Vec3; rotation?: Vec3; width?: number; height?: number; sheen?: number; front?: number }> = ({ position, rotation = [0, 0, 0], width = 1.6, height = 2.2, sheen = 0.5, front = 0.02 }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(256, 256, (ctx) => {
      ctx.clearRect(0, 0, 256, 256);
      const g = ctx.createLinearGradient(0, 0, 256, 256);
      g.addColorStop(0.25, "rgba(255,255,255,0)");
      g.addColorStop(0.34, "rgba(255,255,255,0.8)");
      g.addColorStop(0.4, "rgba(255,255,255,0)");
      g.addColorStop(0.5, "rgba(255,255,255,0)");
      g.addColorStop(0.56, "rgba(255,255,255,0.45)");
      g.addColorStop(0.6, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
    }),
  );
  const glass = useOwnedGeo(() => {
    const g = new THREE.ShapeGeometry(archShape(width, height), 48);
    const pos = g.getAttribute("position");
    const uv = new Float32Array(pos.count * 2);
    for (let i = 0; i < pos.count; i++) {
      uv[i * 2] = (pos.getX(i) + width / 2) / width;
      uv[i * 2 + 1] = pos.getY(i) / height;
    }
    g.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
    return g;
  }, [width, height]);
  const frame = useOwnedGeo(() => {
    const outer = archShape(width + 0.16, height + 0.08, -0.08);
    outer.holes.push(archShape(width, height, 0));
    return new THREE.ExtrudeGeometry(outer, { depth: 0.06, bevelEnabled: true, bevelSize: 0.02, bevelThickness: 0.02, bevelSegments: 3, curveSegments: 48 });
  }, [width, height]);
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={frame} position={[0, 0, -0.03]} castShadow>
        <meshStandardMaterial color="#b8793a" roughness={0.5} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, -0.02]}>
        <meshStandardMaterial color="#e6d4f6" roughness={0.12} metalness={0.15} emissive="#a58ad0" emissiveIntensity={0.35} />
      </mesh>
      <mesh geometry={glass} position={[0, 0, front]}>
        <meshBasicMaterial map={tex} transparent opacity={sheen} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  );
};
