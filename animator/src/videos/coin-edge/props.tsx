import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Props for "The Coin That Wrote a Warning on Its Edge": hammered, milled and modern coins (the milled crown carries
// DECUS ET TUTAMEN round its edge; a clipped one loses the end of the sentence), slivers, scissors, the clippings jar,
// the Mint's screw press and furnace, the edge die, the Tower skyline backdrop, bread, a hand bell, scales, a thumb.
// Coins are drawn 2-3x real size in close shots (plan.json format_note). Reference: guide/references/london-mint-1696.md.

type Vec3 = [number, number, number];
const INK = "#161212";
const SILVER = "#b4b9c2";
const SILVER_DARK = "#8a909a";
const RAW = "#f4f7fb"; // fresh-cut silver
const FONT = "Georgia, 'Times New Roman', serif";

const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

export type CoinKind = "hammered" | "milled" | "modern";
export const EDGE_TEXT = "DECUS ET TUTAMEN";

// ---------- coins ----------

// Outline of a coin of radius r: a circle, a ragged hammered flan, or either with a clipped chord (`clip` = the arc
// in radians that the cut removes, centred on angle `clipAt`).
const coinShape = (r: number, kind: CoinKind, clip: number, clipAt: number, seed: number) => {
  const s = new THREE.Shape();
  const N = 120;
  const half = clip / 2;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * Math.PI * 2;
    let rr = r;
    if (kind === "hammered") rr = r * (0.93 + 0.05 * Math.sin(a * 3 + seed) + 0.03 * Math.sin(a * 7 + seed * 2) + 0.02 * (rnd(i + seed * 13) - 0.5));
    if (clip > 0) {
      let d = Math.abs(((a - clipAt + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (d < half + 0.4) rr = Math.min(rr, (r * Math.cos(half)) / Math.cos(Math.min(d, Math.PI / 2 - 0.01)));
    }
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) s.moveTo(x, y);
    else s.lineTo(x, y);
  }
  return s;
};

// The face: a profile bust in a beaded ring with lettering (machine-struck), an off-centre cross with lettering half
// off the flan (hammered), or a plain modern design.
const faceTexture = (kind: CoinKind, back: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    const c = 256;
    ctx.fillStyle = kind === "modern" ? "#c8a86a" : SILVER;
    ctx.fillRect(0, 0, 512, 512);
    const g = ctx.createRadialGradient(200, 180, 30, 256, 256, 300);
    g.addColorStop(0, "rgba(255,255,255,0.55)");
    g.addColorStop(1, "rgba(0,0,0,0.12)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);
    const dx = kind === "hammered" ? 26 : 0;
    const dy = kind === "hammered" ? -18 : 0;
    ctx.strokeStyle = kind === "modern" ? "#7a5a2a" : SILVER_DARK;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(c + dx, c + dy, 214, 0, Math.PI * 2);
    ctx.stroke();
    if (kind !== "modern") {
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        ctx.fillStyle = SILVER_DARK;
        ctx.beginPath();
        ctx.arc(c + dx + Math.cos(a) * 196, c + dy + Math.sin(a) * 196, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.fillStyle = kind === "modern" ? "#6a4a20" : "#6a707a";
    if (kind === "modern" || back) {
      // a simple crowned shield / a plain numeral-free emblem
      ctx.beginPath();
      ctx.moveTo(c + dx - 70, c + dy - 70);
      ctx.lineTo(c + dx + 70, c + dy - 70);
      ctx.lineTo(c + dx + 70, c + dy + 20);
      ctx.quadraticCurveTo(c + dx, c + dy + 120, c + dx - 70, c + dy + 20);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = kind === "modern" ? "#c8a86a" : SILVER;
      ctx.fillRect(c + dx - 8, c + dy - 60, 16, 130);
      ctx.fillRect(c + dx - 60, c + dy - 18, 120, 16);
    } else if (kind === "hammered") {
      ctx.fillRect(c + dx - 14, c + dy - 120, 28, 240);
      ctx.fillRect(c + dx - 120, c + dy - 14, 240, 28);
      for (const [px, py] of [[-60, -60], [60, -60], [-60, 60], [60, 60]]) {
        ctx.beginPath();
        ctx.arc(c + dx + px, c + dy + py, 14, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      // profile bust facing right, long curled wig
      ctx.beginPath();
      ctx.ellipse(c - 6, c - 30, 70, 88, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(c + 50, c - 40);
      ctx.lineTo(c + 82, c - 6);
      ctx.lineTo(c + 52, c + 4);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(c - 40, c + 40, 70, 90, 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(c - 70, c + 90, 150, 50);
      ctx.fillStyle = SILVER;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(c - 70 + (i % 3) * 22, c - 40 + Math.floor(i / 3) * 40, 9, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // lettering round the face
    ctx.fillStyle = kind === "modern" ? "#6a4a20" : "#5a606a";
    ctx.font = `bold 34px ${FONT}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const word = kind === "modern" ? "" : back ? "MAG BR FRA ET HIB REX" : "GULIELMUS III DEI GRA";
    const span = kind === "hammered" ? 2.6 : 4.2;
    for (let i = 0; i < word.length; i++) {
      const a = -Math.PI / 2 - span / 2 + (i / Math.max(1, word.length - 1)) * span;
      ctx.save();
      ctx.translate(c + dx + Math.cos(a) * 172, c + dy + Math.sin(a) * 172);
      ctx.rotate(a + Math.PI / 2);
      ctx.fillText(word[i], 0, 0);
      ctx.restore();
    }
  });

// The edge band: the sentence once round the rim (milled), fine vertical reeding (modern), a plain dull edge
// (hammered). `cutFrom` 0..1 marks where a clipped edge loses the rest of the sentence: raw bright silver after it.
const edgeTexture = (kind: CoinKind, cutFrom: number) =>
  canvasTexture(2048, 128, (ctx) => {
    ctx.fillStyle = kind === "modern" ? "#b8985a" : "#b8bcc4";
    ctx.fillRect(0, 0, 2048, 128);
    if (kind === "modern") {
      ctx.fillStyle = "#7a5a2a";
      for (let x = 0; x < 2048; x += 16) ctx.fillRect(x, 0, 7, 128);
    } else if (kind === "milled") {
      ctx.fillStyle = "#2a2e36";
      ctx.font = `bold 104px ${FONT}`;
      ctx.textBaseline = "middle";
      const text = `${EDGE_TEXT} ✦ `;
      ctx.textAlign = "left";
      // spread the sentence over the whole rim
      const w = ctx.measureText(text).width;
      const k = 2048 / w;
      ctx.save();
      ctx.scale(k, 1);
      ctx.fillText(text, 0, 68);
      ctx.restore();
    } else {
      ctx.fillStyle = "#9a9ea6";
      for (let i = 0; i < 40; i++) ctx.fillRect(rnd(i) * 2048, rnd(i + 3) * 128, 30 + rnd(i + 5) * 80, 6);
    }
    if (cutFrom < 1) {
      const x0 = cutFrom * 2048;
      ctx.fillStyle = RAW;
      ctx.fillRect(x0, 0, 2048 - x0, 128);
      ctx.strokeStyle = "#c8ccd4";
      ctx.lineWidth = 4;
      for (let x = x0; x < 2048; x += 22) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 40, 128);
        ctx.stroke();
      }
    }
  });

// Where the clipped crown's sentence breaks: after "DECUS ET TUT" (a share of the rim).
const CUT_SHARE = 12 / 19;

/**
 * A coin facing +z (lay it flat with rotation [-PI/2, 0, 0]). `r` radius, `t` thickness in metres.
 * `clipped` cuts a chord off (for a milled coin it takes the end of the sentence with it).
 */
export const Coin: React.FC<{
  position?: Vec3;
  rotation?: Vec3;
  r?: number;
  t?: number;
  kind?: CoinKind;
  clipped?: boolean;
  seed?: number;
  ink?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], r = 0.05, t, kind = "milled", clipped = false, seed = 1, ink }) => {
  const th = t ?? r * (kind === "hammered" ? 0.1 : 0.2);
  // the clipped chord sits where the sentence breaks; the band's 0 is at the cylinder's theta 0 (+z after the turn)
  const clip = clipped ? 0.9 : 0;
  const clipAt = Math.PI * 2 * (CUT_SHARE + (1 - CUT_SHARE) / 2) - Math.PI / 2;
  const geo = useOwned(() => {
    const g = new THREE.ExtrudeGeometry(coinShape(r, kind, clip, clipAt, seed), {
      depth: th,
      bevelEnabled: true,
      bevelThickness: th * 0.18,
      bevelSize: r * 0.025,
      bevelSegments: 2,
      curveSegments: 4,
    });
    g.translate(0, 0, -th / 2);
    return g;
  }, [r, kind, clip, th, seed]);
  const face = useOwned(() => {
    const tx = faceTexture(kind, false);
    tx.repeat.set(1 / (2 * r * 1.05), 1 / (2 * r * 1.05));
    tx.offset.set(0.5, 0.5);
    return tx;
  }, [kind, r]);
  const edge = useOwned(() => edgeTexture(kind, clipped ? CUT_SHARE : 1), [kind, clipped]);
  const band = clipped ? Math.PI * 2 - clip : Math.PI * 2;
  return (
    <group position={position} rotation={rotation}>
      <mesh geometry={geo} castShadow receiveShadow>
        <meshToonMaterial attach="material-0" color="#d8dce2" map={face} gradientMap={toonRamp} />
        <meshToonMaterial attach="material-1" color={kind === "modern" ? "#b8985a" : SILVER} gradientMap={toonRamp} />
      </mesh>
      {kind !== "hammered" && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[r * 1.026, r * 1.026, th * 0.92, 160, 1, true, Math.PI / 2 + (clipped ? clipAt + clip / 2 - Math.PI / 2 : 0), band]} />
          <meshToonMaterial map={edge} color="#e4e6ea" gradientMap={toonRamp} />
        </mesh>
      )}
      {(ink ?? r * 0.05) > 0 && (
        <mesh geometry={geo} scale={[1 + (ink ?? r * 0.05) / r, 1 + (ink ?? r * 0.05) / r, 1.25]}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

// A thin curl of cut silver, falling or lying.
export const Sliver: React.FC<{ position: Vec3; rotation?: Vec3; size?: number }> = ({ position, rotation = [0, 0, 0], size = 0.03 }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <mesh>
      <torusGeometry args={[size, size * 0.18, 6, 16, Math.PI * 0.9]} />
      <meshToonMaterial color="#dfe3ea" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A sliver flying from `from` toward `to` over `len` frames (t = frames since the cut), tumbling.
export const FlyingSliver: React.FC<{ from: Vec3; to: Vec3; t: number; len?: number; size?: number; arc?: number }> = ({ from, to, t, len = 14, size = 0.03, arc = 0.15 }) => {
  if (t < 0) return null;
  const p = Math.min(1, t / len);
  const pos: Vec3 = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p + Math.sin(p * Math.PI) * arc, from[2] + (to[2] - from[2]) * p];
  return <Sliver position={pos} rotation={[t * 0.5, t * 0.3, t * 0.2]} size={size} />;
};

// ---------- tools ----------

// Shears, pivot at the origin, blades along +x; `open` 0..1.
export const Scissors: React.FC<{ position: Vec3; rotation?: Vec3; open?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], open = 0, scale = 1 }) => {
  const a = 0.05 + open * 0.42;
  const half = (s: 1 | -1) => (
    <group rotation={[0, 0, s * a]}>
      <mesh position={[0.11, 0, s * 0.004]} scale={[1, 0.22, 1]}>
        <coneGeometry args={[0.03, 0.22, 4]} />
        <meshToonMaterial color="#8a909a" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.07, 0.012, 0.008]} position={[-0.035, 0, s * 0.004]} color="#2a2a30" ink={0.003} />
      <mesh position={[-0.1, s * -0.012, s * 0.004]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.03, 0.008, 8, 20]} />
        <meshToonMaterial color="#2a2a30" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
      <group rotation={[0, 0, -Math.PI / 2]}>
        <group rotation={[0, 0, Math.PI / 2]}>
          {half(1)}
          {half(-1)}
        </group>
      </group>
      <mesh position={[0, 0, 0.012]}>
        <sphereGeometry args={[0.008, 10, 8]} />
        <meshToonMaterial color="#e8c860" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A glass jar holding silver clippings to `fill` 0..1 of its height.
export const ClippingJar: React.FC<{ position: Vec3; fill: number; scale?: number }> = ({ position, fill, scale = 1 }) => {
  const h = 0.24;
  const level = Math.max(0.01, Math.min(1, fill)) * h * 0.92;
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, level / 2 + 0.005, 0]}>
        <cylinderGeometry args={[0.068, 0.068, level, 24]} />
        <meshToonMaterial color="#9ea4ae" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => (
        <Sliver key={i} position={[(rnd(i) - 0.5) * 0.1, level + 0.008, (rnd(i + 7) - 0.5) * 0.1]} rotation={[Math.PI / 2, 0, rnd(i + 3) * 6]} size={0.016} />
      ))}
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.08, 0.08, h, 32, 1, true]} />
        <meshBasicMaterial color="#cfe8f2" transparent opacity={0.22} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.084, 0.084, h, 32, 1, true]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <InkCylinder radius={0.086} height={0.02} position={[0, h + 0.01, 0]} color="#8a6a3a" ink={0.004} />
      <mesh position={[-0.05, h * 0.55, 0.075]} scale={[0.012, h * 0.35, 0.01]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.5} toneMapped={false} />
      </mesh>
    </group>
  );
};

// A clay crucible on a small iron brazier with glowing coals (`glow` 0..1); a melted silver puddle shows with `melt`.
export const Brazier: React.FC<{ position: Vec3; frame: number; glow?: number; melt?: number }> = ({ position, frame, glow = 1, melt = 0 }) => {
  const k = 0.85 + 0.15 * Math.sin(frame * 0.5) * Math.sin(frame * 0.17 + 1);
  return (
    <group position={position}>
      <InkCylinder radius={0.16} height={0.12} position={[0, 0.06, 0]} color="#2a2624" ink={0.008} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.03, 0.08, 0.03]} position={[s * 0.12, -0.02, 0]} color="#2a2624" ink={0.004} />
      ))}
      <mesh position={[0, 0.125, 0]}>
        <cylinderGeometry args={[0.14, 0.14, 0.01, 24]} />
        <meshBasicMaterial color={new THREE.Color("#ff6a1a").multiplyScalar(1 + glow * 1.4 * k)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.19, 0]}>
        <cylinderGeometry args={[0.07, 0.05, 0.11, 20]} />
        <meshToonMaterial color="#9a5a3a" gradientMap={toonRamp} />
      </mesh>
      {melt > 0 && (
        <mesh position={[0, 0.244, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.06 * Math.min(1, melt), 20]} />
          <meshBasicMaterial color={new THREE.Color("#fff2d8").multiplyScalar(1.6)} toneMapped={false} />
        </mesh>
      )}
      <Halo position={[0, 0.2, 0.05]} size={0.9} color="#ff8a3a" strength={0.45 * glow * k} />
      <pointLight position={[0, 0.35, 0.15]} intensity={3 * glow * k} distance={2.5} color="#ff8a3a" />
    </group>
  );
};

// ---------- the Mint ----------

// An iron screw press: two pillars and a crossbeam, the screw with the fly (a long bar with a ball at each end)
// turned by `fly` radians, the ram pressed down by `press` 0..1 onto the lower die.
export const ScrewPress: React.FC<{ position: Vec3; fly?: number; press?: number; label?: boolean }> = ({ position, fly = 0, press = 0, label = true }) => {
  const IRON = "#2e3238";
  const ramY = 0.95 - press * 0.1;
  return (
    <group position={position}>
      <InkBox size={[1.1, 0.5, 0.7]} position={[0, 0.25, 0]} color="#5a4030" ink={0.012} />
      <InkBox size={[0.9, 0.12, 0.5]} position={[0, 0.56, 0]} color={IRON} ink={0.01} />
      {[-0.38, 0.38].map((x) => (
        <InkBox key={x} size={[0.14, 1.3, 0.22]} position={[x, 1.25, 0]} color={IRON} ink={0.01} />
      ))}
      <InkBox size={[1.0, 0.24, 0.3]} position={[0, 1.95, 0]} color={IRON} ink={0.012} />
      {/* lower die */}
      <InkCylinder radius={0.09} height={0.12} position={[0, 0.68, 0]} color="#6a707a" ink={0.006} />
      {/* screw, ram and upper die */}
      <InkCylinder radius={0.06} height={0.9} position={[0, ramY + 0.6, 0]} color="#4a4e56" ink={0.006} />
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[0, ramY + 0.3 + i * 0.1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.065, 0.012, 6, 20]} />
          <meshToonMaterial color="#6a707a" gradientMap={toonRamp} />
        </mesh>
      ))}
      <InkCylinder radius={0.09} height={0.14} position={[0, ramY - 0.1, 0]} color="#6a707a" ink={0.006} />
      {/* the fly */}
      <group position={[0, 2.2, 0]} rotation={[0, fly, 0]}>
        <InkCylinder radius={0.07} height={0.16} position={[0, 0, 0]} color={IRON} ink={0.006} />
        <InkCylinder radius={0.03} height={2.6} rotation={[0, 0, Math.PI / 2]} color={IRON} ink={0.006} />
        {[-1.3, 1.3].map((x) => (
          <mesh key={x} position={[x, 0, 0]} castShadow>
            <sphereGeometry args={[0.15, 20, 16]} />
            <meshToonMaterial color="#3a3e46" gradientMap={toonRamp} />
          </mesh>
        ))}
        {[-1.3, 1.3].map((x) => (
          <mesh key={`i${x}`} position={[x, 0, 0]}>
            <sphereGeometry args={[0.165, 20, 16]} />
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
        ))}
      </group>
      {label && <Label text="MILL" position={[0, 1.5, 0.2]} width={0.34} bg="#f2c230" />}
    </group>
  );
};

// A brick furnace with a glowing mouth.
export const Furnace: React.FC<{ position: Vec3; frame: number; size?: number }> = ({ position, frame, size = 1 }) => {
  const k = 0.85 + 0.15 * Math.sin(frame * 0.4) * Math.sin(frame * 0.13 + 2);
  return (
    <group position={position} scale={size}>
      <InkBox size={[1.2, 1.3, 0.8]} position={[0, 0.65, 0]} color="#8a3a2a" ink={0.014} />
      <InkBox size={[0.5, 1.4, 0.5]} position={[0, 1.9, -0.1]} color="#7a3224" ink={0.012} />
      <mesh position={[0, 0.6, 0.405]}>
        <circleGeometry args={[0.28, 24, 0, Math.PI]} />
        <meshBasicMaterial color={new THREE.Color("#ff7a20").multiplyScalar(1.8 * k)} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.45, 0.405]}>
        <planeGeometry args={[0.56, 0.3]} />
        <meshBasicMaterial color={new THREE.Color("#ff9a3a").multiplyScalar(2 * k)} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0.6, 0.5]} size={2.2} color="#ff7a2a" strength={0.55 * k} />
      <pointLight position={[0, 0.7, 0.9]} intensity={6 * k} distance={5} color="#ff8a3a" />
    </group>
  );
};

// The edge die: two straight steel bars with the sentence cut into them; the blank rolls between them (`roll` 0..1)
// and the letters appear on its rim as it goes. Faces +z.
export const EdgeDie: React.FC<{ position: Vec3; roll: number; label?: boolean }> = ({ position, roll, label = true }) => {
  const bar = useOwned(() =>
    canvasTexture(1024, 96, (ctx) => {
      ctx.fillStyle = "#8a909a";
      ctx.fillRect(0, 0, 1024, 96);
      ctx.fillStyle = "#2a2e36";
      ctx.font = `bold 70px ${FONT}`;
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.fillText(EDGE_TEXT, 512, 52);
    }),
  );
  return (
    <group position={position}>
      {[0.36, -0.36].map((y) => (
        <group key={y} position={[0, y, 0]}>
          <InkBox size={[1.1, 0.12, 0.16]} color="#6a707a" ink={0.01} map={bar} />
        </group>
      ))}
      {label && <Label text="EDGE DIE" position={[0, -0.62, 0.05]} width={0.46} bg="#f2c230" />}
      <Coin position={[-0.4 + roll * 0.8, 0, 0.02]} rotation={[0, 0, -roll * 5]} r={0.3} t={0.08} kind="milled" ink={0.012} />
    </group>
  );
};

// ---------- London ----------

// The Tower skyline painted on a backdrop: crenellated outer wall, the whitened keep with four turrets and small lead
// cupolas, river mist; `night` lights a few windows under a dark blue sky with a moon.
export const TowerBackdrop: React.FC<{ position: Vec3; width?: number; night?: boolean; smoke?: number }> = ({ position, width = 4, night = false, smoke = 0 }) => {
  const tex = useOwned(
    () =>
      canvasTexture(1024, 512, (ctx) => {
        const sky = ctx.createLinearGradient(0, 0, 0, 512);
        if (night) {
          sky.addColorStop(0, "#0a1230");
          sky.addColorStop(1, "#2a3a6a");
        } else {
          sky.addColorStop(0, "#6fb2e8");
          sky.addColorStop(1, "#d8ecf6");
        }
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, 1024, 512);
        if (night) {
          ctx.fillStyle = "#fff6d8";
          ctx.beginPath();
          ctx.arc(820, 90, 34, 0, Math.PI * 2);
          ctx.fill();
          for (let i = 0; i < 40; i++) ctx.fillRect(rnd(i) * 1024, rnd(i + 9) * 220, 3, 3);
        }
        const stone = night ? "#8a94b0" : "#ece6d6";
        const shade = night ? "#5a6480" : "#c8c0aa";
        // far roofs
        ctx.fillStyle = night ? "#1a2240" : "#9aa4b4";
        for (let i = 0; i < 12; i++) ctx.fillRect(i * 90 - 20, 360 - rnd(i) * 40, 80, 200);
        // the keep
        const kx = 340;
        const kw = 340;
        ctx.fillStyle = stone;
        ctx.fillRect(kx, 170, kw, 260);
        ctx.fillStyle = shade;
        ctx.fillRect(kx + kw - 60, 170, 60, 260);
        for (const tx of [kx - 18, kx + kw - 42]) {
          ctx.fillStyle = stone;
          ctx.fillRect(tx, 120, 60, 310);
          ctx.fillStyle = night ? "#3a4258" : "#5a6270";
          ctx.beginPath();
          ctx.moveTo(tx - 4, 122);
          ctx.quadraticCurveTo(tx + 30, 40, tx + 64, 122);
          ctx.fill();
          ctx.fillRect(tx + 27, 52, 6, 30);
        }
        for (const tx of [kx + 90, kx + 220]) {
          ctx.fillStyle = stone;
          ctx.fillRect(tx, 140, 46, 60);
          ctx.fillStyle = night ? "#3a4258" : "#5a6270";
          ctx.beginPath();
          ctx.moveTo(tx - 4, 142);
          ctx.quadraticCurveTo(tx + 23, 80, tx + 50, 142);
          ctx.fill();
        }
        // battlements on the keep
        ctx.fillStyle = stone;
        for (let x = kx; x < kx + kw; x += 28) ctx.fillRect(x, 156, 16, 16);
        // windows
        for (let r = 0; r < 3; r++)
          for (let c = 0; c < 5; c++) {
            ctx.fillStyle = night && (r + c) % 3 === 0 ? "#ffcf6a" : night ? "#2a3048" : "#4a4e5a";
            ctx.beginPath();
            const wx = kx + 40 + c * 62;
            const wy = 220 + r * 70;
            ctx.fillRect(wx, wy, 18, 30);
            ctx.arc(wx + 9, wy, 9, Math.PI, 0);
            ctx.fill();
          }
        // outer curtain wall
        ctx.fillStyle = night ? "#6a7290" : "#d8d0bc";
        ctx.fillRect(0, 400, 1024, 112);
        for (let x = 0; x < 1024; x += 40) ctx.fillRect(x, 384, 24, 18);
        ctx.fillStyle = night ? "#4a5270" : "#b8b0a0";
        for (let i = 0; i < 26; i++) ctx.fillRect((i * 97) % 1024, 420 + (i % 4) * 22, 50, 3);
        // mint chimney smoke
        if (smoke > 0) {
          ctx.fillStyle = night ? "rgba(160,170,200,0.35)" : "rgba(120,120,130,0.45)";
          for (let i = 0; i < 6; i++) {
            ctx.beginPath();
            ctx.arc(760 + i * 26, 300 - i * 34, 22 + i * 7, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.fillStyle = night ? "#4a4258" : "#7a5a4a";
          ctx.fillRect(744, 300, 26, 110);
        }
      }),
    [night, smoke > 0],
  );
  return (
    <mesh position={position}>
      <planeGeometry args={[width, width / 2]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

// A window frame with small leaded panes, set in a wall facing +z, showing whatever is behind it.
export const LeadedWindow: React.FC<{ position: Vec3; size?: [number, number] }> = ({ position, size = [1.0, 0.9] }) => (
  <group position={position}>
    {[
      [0, size[1] / 2 + 0.05, size[0] + 0.2, 0.1],
      [0, -size[1] / 2 - 0.05, size[0] + 0.3, 0.12],
    ].map(([x, y, w, h], i) => (
      <InkBox key={i} size={[w, h, 0.14]} position={[x, y, 0]} color="#5a3a22" ink={0.008} />
    ))}
    {[-size[0] / 2 - 0.05, size[0] / 2 + 0.05].map((x) => (
      <InkBox key={x} size={[0.1, size[1] + 0.2, 0.14]} position={[x, 0, 0]} color="#5a3a22" ink={0.008} />
    ))}
    {Array.from({ length: 3 }, (_, i) => (
      <InkBox key={`v${i}`} size={[0.012, size[1], 0.012]} position={[-size[0] / 2 + ((i + 1) * size[0]) / 4, 0, 0.03]} color="#2a2420" ink={0} />
    ))}
    {Array.from({ length: 3 }, (_, i) => (
      <InkBox key={`h${i}`} size={[size[0], 0.012, 0.012]} position={[0, -size[1] / 2 + ((i + 1) * size[1]) / 4, 0.03]} color="#2a2420" ink={0} />
    ))}
  </group>
);

// A brick shopfront with a door, a bay window and a painted sign on an iron bracket (`sign` drawn as a picture).
export const Shopfront: React.FC<{ position: Vec3; color?: string; sign: "loaf" | "key" | "boot" | "coin"; swing?: number; awning?: string }> = ({
  position,
  color = "#a84a32",
  sign,
  swing = 0,
  awning,
}) => {
  const tex = useOwned(
    () =>
      canvasTexture(256, 256, (ctx) => {
        ctx.fillStyle = "#1e3a5a";
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = "#e0b040";
        ctx.lineWidth = 14;
        ctx.strokeRect(10, 10, 236, 236);
        ctx.fillStyle = "#e0b040";
        if (sign === "loaf") {
          ctx.beginPath();
          ctx.ellipse(128, 140, 80, 50, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "#1e3a5a";
          ctx.lineWidth = 8;
          for (const x of [96, 128, 160]) {
            ctx.beginPath();
            ctx.moveTo(x - 10, 110);
            ctx.lineTo(x + 10, 170);
            ctx.stroke();
          }
        } else if (sign === "key") {
          ctx.beginPath();
          ctx.arc(80, 128, 36, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillRect(110, 118, 110, 20);
          ctx.fillRect(190, 138, 14, 30);
        } else if (sign === "boot") {
          ctx.fillRect(100, 60, 50, 120);
          ctx.fillRect(100, 160, 100, 36);
        } else {
          ctx.beginPath();
          ctx.arc(128, 128, 70, 0, Math.PI * 2);
          ctx.fill();
        }
      }),
    [sign],
  );
  return (
    <group position={position}>
      <InkBox size={[2.0, 3.4, 0.3]} position={[0, 1.7, 0]} color={color} ink={0.012} />
      <InkBox size={[2.1, 0.14, 0.4]} position={[0, 3.3, 0.05]} color="#3a2a1e" ink={0.008} />
      <InkBox size={[0.7, 1.6, 0.06]} position={[-0.5, 0.8, 0.16]} color="#3a5a3a" ink={0.008} />
      <InkCylinder radius={0.025} height={0.04} position={[-0.3, 0.85, 0.2]} rotation={[Math.PI / 2, 0, 0]} color="#e0b040" ink={0.004} />
      <InkBox size={[0.8, 0.8, 0.12]} position={[0.45, 1.4, 0.16]} color="#2a1e16" ink={0.008} />
      <mesh position={[0.45, 1.4, 0.23]}>
        <planeGeometry args={[0.66, 0.66]} />
        <meshBasicMaterial color="#ffd890" toneMapped={false} />
      </mesh>
      <InkBox size={[0.012, 0.66, 0.012]} position={[0.45, 1.4, 0.24]} color="#2a1e16" ink={0} />
      <InkBox size={[0.66, 0.012, 0.012]} position={[0.45, 1.4, 0.24]} color="#2a1e16" ink={0} />
      {awning && (
        <group position={[0.45, 1.95, 0.4]} rotation={[0.5, 0, 0]}>
          <InkBox size={[1.0, 0.03, 0.55]} color={awning} ink={0.008} />
        </group>
      )}
      <InkBox size={[0.7, 0.03, 0.03]} position={[0.75, 2.6, 0.5]} rotation={[0, Math.PI / 2, 0]} color="#1a1a1e" ink={0.004} />
      <group position={[0.75, 2.58, 0.75]} rotation={[swing, 0, 0]}>
        <InkBox size={[0.04, 0.42, 0.42]} position={[0, -0.24, 0]} color="#1e3a5a" ink={0.008} />
        {[1, -1].map((s) => (
          <mesh key={s} position={[s * 0.022, -0.24, 0]} rotation={[0, (s * Math.PI) / 2, 0]}>
            <planeGeometry args={[0.38, 0.38]} />
            <meshBasicMaterial map={tex} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------- small things ----------

export const Loaf: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh scale={[0.13, 0.065, 0.08]} castShadow>
      <sphereGeometry args={[1, 20, 14]} />
      <meshToonMaterial color="#c8843a" gradientMap={toonRamp} />
    </mesh>
    <mesh scale={[0.138, 0.072, 0.088]}>
      <sphereGeometry args={[1, 20, 14]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {[-0.05, 0, 0.05].map((x) => (
      <InkBox key={x} size={[0.012, 0.004, 0.07]} position={[x, 0.062, 0]} rotation={[0, 0.5, 0]} color="#f2d8a0" ink={0} />
    ))}
  </group>
);

export const HandBell: React.FC<{ position: Vec3; swing?: number }> = ({ position, swing = 0 }) => (
  <group position={position} rotation={[0, 0, swing]} userData={{ ghost: true }}>
    <InkCylinder radius={0.018} height={0.14} position={[0, 0.07, 0]} color="#5a3a22" ink={0.004} />
    <mesh position={[0, -0.05, 0]}>
      <coneGeometry args={[0.07, 0.11, 20, 1, true]} />
      <meshToonMaterial color="#e0b040" gradientMap={toonRamp} side={THREE.DoubleSide} emissive="#3a2a0a" />
    </mesh>
    <mesh position={[0, -0.05, 0]}>
      <coneGeometry args={[0.076, 0.12, 20, 1, true]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// A balance with two pans; `tip` -1..1 tips the beam.
export const Scales: React.FC<{ position: Vec3; tip?: number; label?: string }> = ({ position, tip = 0, label }) => (
  <group position={position}>
    <InkCylinder radius={0.09} height={0.03} position={[0, 0.015, 0]} color="#8a6a2a" ink={0.005} />
    <InkCylinder radius={0.015} height={0.4} position={[0, 0.22, 0]} color="#c89a3a" ink={0.004} />
    <group position={[0, 0.42, 0]} rotation={[0, 0, tip * 0.25]}>
      <InkBox size={[0.5, 0.02, 0.02]} color="#c89a3a" ink={0.004} />
      {[-0.24, 0.24].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, 0, -tip * 0.25]}>
          <InkCylinder radius={0.004} height={0.16} position={[0, -0.08, 0]} color="#2a2420" ink={0} />
          <InkCylinder radius={0.08} height={0.015} position={[0, -0.16, 0]} color="#c89a3a" ink={0.004} />
        </group>
      ))}
    </group>
    {label && <Label text={label} position={[0, 0.62, 0.02]} width={0.36} bg="#f2c230" />}
  </group>
);

// A big cartoon thumb (skin, nail), pointing along -x from its base, for coin macros.
export const Thumb: React.FC<{ position: Vec3; rotation?: Vec3; skin?: string; scale?: number }> = ({ position, rotation = [0, 0, 0], skin = "#f0c8a0", scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
      <capsuleGeometry args={[0.05, 0.16, 8, 16]} />
      <meshToonMaterial color={skin} gradientMap={toonRamp} />
    </mesh>
    <mesh rotation={[0, 0, Math.PI / 2]}>
      <capsuleGeometry args={[0.056, 0.16, 8, 16]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <mesh position={[-0.1, 0.03, 0]} scale={[0.04, 0.012, 0.035]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshToonMaterial color="#f8e0d0" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A wooden table top on legs.
export const Table: React.FC<{ position: Vec3; size?: Vec3; color?: string }> = ({ position, size = [1.4, 0.72, 0.8], color = "#7a5232" }) => {
  const [w, h, d] = size;
  return (
    <group position={position}>
      <InkBox size={[w, 0.06, d]} position={[0, h - 0.03, 0]} color={color} ink={0.01} />
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.07, h - 0.06, 0.07]} position={[sx * (w / 2 - 0.08), (h - 0.06) / 2, sz * (d / 2 - 0.08)]} color="#4a3220" ink={0.006} />),
      )}
    </group>
  );
};

// A ceiling beam.
export const Beam: React.FC<{ position: Vec3; length?: number }> = ({ position, length = 6 }) => (
  <InkBox size={[length, 0.2, 0.22]} position={position} color="#4a3220" ink={0.01} />
);

// A rolled coin (modern) on its edge, rolling `dist` metres along +x; spin follows the distance.
export const RollingCoin: React.FC<{ position: Vec3; dist: number; r?: number; wobble?: number }> = ({ position, dist, r = 0.08, wobble = 0 }) => (
  <group position={[position[0] + dist, position[1] + r, position[2]]} rotation={[wobble, 0, 0]}>
    <Coin rotation={[0, 0, -dist / r]} r={r} kind="modern" />
  </group>
);

// Memo for a list of seeded scatter points.
export const useScatter = (n: number, seed: number) => useMemo(() => Array.from({ length: n }, (_, i) => [rnd(i + seed * 17), rnd(i + seed * 31 + 5), rnd(i + seed * 7 + 11)] as Vec3), [n, seed]);
