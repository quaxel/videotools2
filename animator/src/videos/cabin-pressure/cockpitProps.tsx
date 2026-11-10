import React, { useMemo } from "react";
import * as THREE from "three";
import { Burst, CameraShot, canvasTexture, cardTilt, Halo, handWorld, Label, Vec3 } from "../../engine";
import { Ball, Cyl, RBox } from "../dog-nose/props";
import { useOwnedGeo, useOwnedTex } from "../dog-nose/sets";
import { rnd } from "../pisces-sign/props";

// Story props for the cockpit, the galley and the oxygen-generator macro of "cabin-pressure"
// (guide/references/airliner-cockpit.md, airliner-galley.md): the big CABIN ALT / ALTITUDE dials, the pilots'
// quick-donning masks, a passenger mask worn on a face (flat bag), the opened passenger service unit with its
// chemical oxygen generator, heat shimmer, galley carts. Pixar look: rounded, smooth-shaded, painted wear.

const FONT = "'Arial Black', Impact, sans-serif";
const PI = Math.PI;
export const glowColor = (c: string, k: number) => new THREE.Color(c).multiplyScalar(k);
export const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

// ---------- a puppet's card frame: put a 3D prop on a face ----------

// Where a point of a puppet card (puppet units, as reachR: +x screen right, head centre [0, -800]) is in the world,
// and the card's yaw (it turns to the camera) and lean-back (high cameras). Build a prop in the card's own frame
// (x screen-right, y up, z toward the camera, metres) inside <CardGroup> and it sits on the drawing from any angle.
export const cardFrame = (at: [number, number], camera: CameraShot, point: [number, number], lift = 0) => ({
  position: handWorld(at, point, camera, lift) as Vec3,
  yaw: Math.atan2(camera.position[0] - at[0], camera.position[2] - at[1]),
  tilt: cardTilt(camera.position, at),
});
// A point given in a card frame (metres: x screen-right, y up, z toward the camera), in world coordinates.
export const cardPoint = (fr: ReturnType<typeof cardFrame>, p: Vec3): Vec3 => {
  const v = new THREE.Vector3(...p).applyEuler(new THREE.Euler(-fr.tilt, 0, 0)).applyEuler(new THREE.Euler(0, fr.yaw, 0));
  return [fr.position[0] + v.x, fr.position[1] + v.y, fr.position[2] + v.z];
};
export const CardGroup: React.FC<{ frame: ReturnType<typeof cardFrame>; children: React.ReactNode }> = ({ frame, children }) => (
  <group position={frame.position} rotation={[0, frame.yaw, 0]}>
    <group rotation={[-frame.tilt, 0, 0]}>{children}</group>
  </group>
);

// A curved tube through points (a hose, a strap, a lanyard), rebuilt when the points move.
export const Hose: React.FC<{ points: Vec3[]; r: number; color: string; opacity?: number; rough?: number; glowK?: number; additive?: boolean }> = ({ points, r, color, opacity, rough = 0.5, glowK = 0, additive = false }) => {
  const key = points.map((p) => p.map((v) => v.toFixed(4)).join(",")).join(";");
  const geo = useOwnedGeo(() => {
    const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
    return new THREE.TubeGeometry(curve, Math.max(8, points.length * 10), r, 8, false);
  }, [key, r]);
  if (additive)
    return (
      <mesh geometry={geo}>
        <meshBasicMaterial color={color} transparent opacity={opacity ?? 0.3} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
    );
  return (
    <mesh geometry={geo} castShadow={opacity === undefined}>
      <meshStandardMaterial color={color} roughness={rough} transparent={opacity !== undefined} opacity={opacity ?? 1} emissive={glowK ? color : "#000"} emissiveIntensity={glowK} />
    </mesh>
  );
};

// ---------- dials ----------

// [from, to, colour] in dial units.
export type Arc = [number, number, string];
// Clockwise from 12 o'clock: 0 at bottom-left, max at bottom-right (270 degrees of sweep).
const dialAngle = (v: number, max: number) => ((-135 + (270 * Math.max(-0.02 * max, Math.min(max * 1.03, v))) / max) * PI) / 180;

const dialFace = (title: string, unit: string, max: number, nums: number[], arcs: Arc[], minor: number) =>
  canvasTexture(1024, 1024, (ctx) => {
    const c = 512;
    const face = ctx.createRadialGradient(c, c - 160, 40, c, c, 500);
    face.addColorStop(0, "#323840");
    face.addColorStop(1, "#14171b");
    ctx.fillStyle = face;
    ctx.beginPath();
    ctx.arc(c, c, 506, 0, 2 * PI);
    ctx.fill();
    for (const [a, b, col] of arcs) {
      ctx.strokeStyle = col;
      ctx.lineWidth = 40;
      ctx.beginPath();
      ctx.arc(c, c, 418, dialAngle(a, max) - PI / 2, dialAngle(b, max) - PI / 2);
      ctx.stroke();
    }
    ctx.strokeStyle = "#f4f1e8";
    ctx.lineCap = "round";
    for (let v = 0; v <= max + 1e-6; v += minor) {
      const a = dialAngle(v, max);
      const major = nums.some((n) => Math.abs(n - v) < 1e-6);
      const r0 = major ? 404 : 438;
      ctx.lineWidth = major ? 22 : 12;
      ctx.beginPath();
      ctx.moveTo(c + Math.sin(a) * r0, c - Math.cos(a) * r0);
      ctx.lineTo(c + Math.sin(a) * 478, c - Math.cos(a) * 478);
      ctx.stroke();
    }
    ctx.fillStyle = "#f4f1e8";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 118px ${FONT}`;
    for (const n of nums) {
      const a = dialAngle(n, max);
      ctx.fillText(String(n), c + Math.sin(a) * 300, c - Math.cos(a) * 300 + 6);
    }
    // the title and unit sit under the hub, above the readout window
    let fs = 100;
    ctx.font = `900 ${fs}px ${FONT}`;
    const w = ctx.measureText(title).width;
    if (w > 440) fs = Math.floor((fs * 440) / w);
    ctx.font = `900 ${fs}px ${FONT}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(title, c, c + 118);
    ctx.font = `900 46px ${FONT}`;
    ctx.fillStyle = "#b9c2cc";
    ctx.fillText(unit, c, c + 186);
    // painted wear: a faint scuff and a soft highlight across the upper face
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.beginPath();
    ctx.ellipse(c - 120, c - 300, 260, 90, -0.4, 0, 2 * PI);
    ctx.fill();
  });

const readoutTex = (text: string, color: string) =>
  canvasTexture(640, 192, (ctx) => {
    ctx.fillStyle = "#06080a";
    ctx.fillRect(0, 0, 640, 192);
    ctx.strokeStyle = "#3a414a";
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 630, 182);
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let fs = 132;
    ctx.font = `900 ${fs}px ${FONT}`;
    const w = ctx.measureText(text).width;
    if (w > 590) fs = Math.floor((fs * 590) / w);
    ctx.font = `900 ${fs}px ${FONT}`;
    ctx.shadowColor = color;
    ctx.shadowBlur = 18;
    ctx.fillText(text, 320, 102);
  });

// Thousands with a comma, in `step` ft steps: 35000 -> "35,000 FT".
export const feetText = (ft: number, step = 100) => `${(Math.round(ft / step) * step).toLocaleString("en-US")} FT`;

// A big round aircraft dial in a square black bezel with four screws (guide/references/airliner-cockpit.md), facing
// +z: white ticks and numbers, coloured arcs, the title printed on the face, a broad white needle at `value`, and a
// glowing digital readout in the bottom gap. `size` = face diameter. `pop` = frames since the readout lit (a quick
// swell and flash), `glowK` how bright the readout digits are (> 1 blooms).
export const Dial: React.FC<{
  position: Vec3;
  rotation?: Vec3;
  size: number;
  value: number;
  max: number;
  nums: number[];
  arcs?: Arc[];
  minor?: number;
  title: string;
  unit?: string;
  readout?: string;
  readoutColor?: string;
  glowK?: number;
  pop?: number;
}> = ({ position, rotation = [0, 0, 0], size, value, max, nums, arcs = [], minor = 1, title, unit = "x1000 FT", readout, readoutColor = "#ffb43a", glowK = 1.25, pop = 99 }) => {
  const face = useOwnedTex(() => dialFace(title, unit, max, nums, arcs, minor), [title, unit, max, nums.join(","), arcs.flat().join(","), minor]);
  const ro = useOwnedTex(() => readoutTex(readout ?? "", readoutColor), [readout, readoutColor]);
  const a = dialAngle(value, max);
  const B = size * 1.16;
  const swell = pop >= 0 && pop < 10 ? 1 + 0.18 * Math.sin((pop / 10) * PI) : 1;
  const flash = pop >= 0 && pop < 12 ? (1 - pop / 12) * 0.6 : 0;
  return (
    <group position={position} rotation={rotation}>
      <RBox size={[B, B, 0.06]} position={[0, 0, -0.03]} color="#1c1f24" radius={0.035} rough={0.5} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sy) => <Cyl key={`${sx}${sy}`} r={size * 0.035} h={0.012} position={[sx * B * 0.41, sy * B * 0.41, 0.004]} rotation={[PI / 2, 0, 0]} color="#7d848c" rough={0.4} />),
      )}
      {/* the deep round well and its rim */}
      <mesh position={[0, 0, 0.002]}>
        <torusGeometry args={[size * 0.5, size * 0.035, 12, 48]} />
        <meshStandardMaterial color="#2a2e34" roughness={0.45} />
      </mesh>
      <mesh position={[0, 0, 0.003]}>
        <circleGeometry args={[size * 0.5, 64]} />
        <meshBasicMaterial map={face} toneMapped={false} />
      </mesh>
      {readout !== undefined && (
        <group position={[0, -size * 0.335, 0.008]} scale={swell}>
          <mesh>
            <planeGeometry args={[size * 0.44, size * 0.132]} />
            <meshBasicMaterial map={ro} color={glowColor("#ffffff", glowK)} toneMapped={false} />
          </mesh>
          {flash > 0 && (
            <mesh position={[0, 0, 0.002]}>
              <planeGeometry args={[size * 0.44, size * 0.132]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={flash} depthWrite={false} toneMapped={false} />
            </mesh>
          )}
        </group>
      )}
      {/* the needle: broad white blade with a counterweight, on a dark hub */}
      <group position={[0, 0, 0.016]} rotation={[0, 0, -a]}>
        <mesh position={[0, size * 0.2, 0]}>
          <boxGeometry args={[size * 0.06, size * 0.4, 0.008]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh position={[0, size * 0.4, 0]}>
          <circleGeometry args={[size * 0.034, 3, 0, 2 * PI]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh position={[0, -size * 0.06, 0]}>
          <boxGeometry args={[size * 0.05, size * 0.12, 0.008]} />
          <meshBasicMaterial color="#d8d8d8" toneMapped={false} />
        </mesh>
      </group>
      <Cyl r={size * 0.06} h={0.02} position={[0, 0, 0.02]} rotation={[PI / 2, 0, 0]} color="#2a2e34" rough={0.35} />
      <Halo position={[0, -size * 0.335, 0.02]} size={size * 0.9} color={readoutColor} strength={readout ? 0.22 : 0} />
    </group>
  );
};

// ---------- the pilots' quick-donning mask ----------

const MASK_GREY = "#5f666e";
const HARNESS = "#7a8088";

// A full-face quick-donning mask for a profile card facing screen-right (facing 1; -1 mirrors it), in the card frame
// (metres from the head centre; the face front is at x ~ +0.24). A clear visor shell over the eye, a big grey rubber
// cup over nose and mouth with the regulator and its red tab, two broad harness straps over and round the head.
// `grip` 0..1: the harness swells open (0) and grips the head (1); `cup` the cup alone (the mask on its way up).
const visorShape = () => {
  const sh = new THREE.Shape();
  sh.moveTo(0.03, 0.15);
  sh.quadraticCurveTo(0.29, 0.17, 0.3, 0.02);
  sh.lineTo(0.25, -0.05);
  sh.lineTo(0.05, -0.04);
  sh.quadraticCurveTo(0.0, 0.05, 0.03, 0.15);
  return sh;
};
export const PilotMask: React.FC<{ facing: 1 | -1; grip?: number; cup?: boolean }> = ({ facing, grip = 1, cup = false }) => {
  const g = 1 + 0.16 * (1 - grip); // the harness inflates open, then grips
  const visor = useOwnedGeo(() => new THREE.ShapeGeometry(visorShape(), 12), []);
  return (
    <group scale={[facing, 1, 1]}>
      {/* oronasal cup: a rounded cone pointing forward from the nose and mouth */}
      <group position={[0.22, -0.1, 0.07]} rotation={[0, 0, -PI / 2]}>
        <Cyl r={0.095} r2={0.07} h={0.12} position={[0, 0.04, 0]} color={MASK_GREY} rough={0.55} />
        <Ball position={[0, 0.1, 0]} radius={0.068} color="#565d64" scale={[1, 0.5, 1]} ink={0} />
      </group>
      {/* regulator block, red tab */}
      <RBox size={[0.07, 0.08, 0.08]} position={[0.36, -0.12, 0.08]} color="#3f454c" radius={0.022} />
      <RBox size={[0.026, 0.06, 0.03]} position={[0.4, -0.07, 0.1]} color="#d8322c" radius={0.009} />
      {!cup && (
        <>
          {/* visor: a clear shell over the eye, framed in black rubber, a glint */}
          <mesh geometry={visor} position={[0, 0, 0.085]}>
            <meshStandardMaterial color="#cfeaf8" transparent opacity={0.28} roughness={0.1} depthWrite={false} side={THREE.DoubleSide} />
          </mesh>
          <Hose points={[[0.03, 0.15, 0.088], [0.17, 0.175, 0.088], [0.28, 0.1, 0.088], [0.3, 0.02, 0.088], [0.25, -0.05, 0.088]]} r={0.013} color="#1e2226" rough={0.6} />
          <mesh position={[0.22, 0.09, 0.092]} rotation={[0, 0, -0.6]}>
            <planeGeometry args={[0.014, 0.07]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.7} />
          </mesh>
          {/* harness: broad straps over the crown and round the nape, a pad at the back */}
          <group scale={g}>
            <Hose points={[[0.04, 0.15, 0.07], [-0.04, 0.24, 0.07], [-0.17, 0.2, 0.07], [-0.24, 0.06, 0.07]]} r={0.02} color={HARNESS} rough={0.8} />
            <Hose points={[[0.16, -0.14, 0.07], [0.0, -0.13, 0.07], [-0.14, -0.08, 0.07], [-0.24, 0.0, 0.07]]} r={0.02} color={HARNESS} rough={0.8} />
            <RBox size={[0.06, 0.12, 0.03]} position={[-0.245, 0.03, 0.07]} color={HARNESS} radius={0.02} />
          </group>
        </>
      )}
    </group>
  );
};

// The mask's stowage box on a side console: a small grey box with the lid flipped open once the mask is out.
export const MaskBox: React.FC<{ position: Vec3; open: number; rotationY?: number }> = ({ position, open, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <RBox size={[0.16, 0.12, 0.16]} position={[0, 0.06, 0]} color="#4a5058" radius={0.02} />
    <RBox size={[0.13, 0.015, 0.13]} position={[0, 0.121, 0]} color="#1f2328" radius={0.005} />
    <group position={[0, 0.12, -0.08]} rotation={[-1.9 * open, 0, 0]}>
      <RBox size={[0.16, 0.02, 0.16]} position={[0, 0.01, 0.08]} color="#5a616a" radius={0.008} />
      <RBox size={[0.07, 0.008, 0.03]} position={[0, 0.022, 0.13]} color="#e8e4d8" radius={0.003} />
    </group>
  </group>
);

// ---------- passenger mask worn on a face ----------

// The yellow cup over the nose and mouth of a front-view card (card frame, centred on the cup), its elastic round the
// head and the clear reservoir bag under it; `flat` 0..1 lets the bag sag flat and crumpled.
export const WornMask: React.FC<{ flat?: number; poke?: number; elastic?: boolean }> = ({ flat = 1, poke = 0, elastic = true }) => {
  const sx = 0.85 - 0.15 * flat;
  const sz = 0.55 - 0.38 * flat + 0.06 * poke;
  return (
    <group>
      <group rotation={[PI / 2, 0, 0]}>
        <Cyl r={0.075} r2={0.052} h={0.075} position={[0, 0.04, 0]} color="#f3c623" rough={0.45} />
      </group>
      <mesh position={[0, 0, 0.078]}>
        <torusGeometry args={[0.052, 0.008, 8, 24]} />
        <meshStandardMaterial color="#e2b10f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0, 0.077]}>
        <circleGeometry args={[0.048, 24]} />
        <meshStandardMaterial color="#c99a12" roughness={0.7} />
      </mesh>
      {/* the elastic round the head, or hanging in a loop */}
      {elastic ? (
        <>
          <Hose points={[[-0.07, 0.0, 0.03], [-0.16, 0.03, 0.01], [-0.245, 0.07, -0.01]]} r={0.008} color="#c9b98a" />
          <Hose points={[[0.07, 0.0, 0.03], [0.16, 0.03, 0.01], [0.245, 0.07, -0.01]]} r={0.008} color="#c9b98a" />
        </>
      ) : (
        <Hose points={[[-0.06, 0.02, 0.03], [-0.03, -0.06, 0.06], [0.03, -0.06, 0.06], [0.06, 0.02, 0.03]]} r={0.005} color="#d9d2c0" />
      )}
      {/* the reservoir bag: clear, limp, with a crease */}
      <group position={[0, -0.13 + 0.02 * flat, 0.05]} rotation={[0.25 * flat, 0, 0.12 * poke]}>
        <Ball position={[0, 0, 0]} radius={0.058} scale={[sx, 1.55 - 0.25 * flat, sz]} color="#e9f6fb" opacity={0.55} ink={0} />
        <mesh position={[0, -0.01, 0.058 * sz + 0.002]} rotation={[0, 0, 0.3]}>
          <planeGeometry args={[0.006, 0.09]} />
          <meshBasicMaterial color="#9fc4d4" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- the passenger service unit, opened, with the chemical oxygen generator ----------

const genLabel = () =>
  canvasTexture(1024, 320, (ctx) => {
    ctx.fillStyle = "#f6f1e2";
    ctx.fillRect(0, 0, 1024, 320);
    ctx.fillStyle = "#c0392b";
    ctx.fillRect(0, 0, 1024, 46);
    ctx.fillRect(0, 274, 1024, 46);
    ctx.fillStyle = "#17191c";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `900 150px ${FONT}`;
    let fs = 150;
    const w = ctx.measureText("O2 GENERATOR").width;
    if (w > 960) fs = Math.floor((150 * 960) / w);
    ctx.font = `900 ${fs}px ${FONT}`;
    ctx.fillText("O2 GENERATOR", 512, 166);
    ctx.fillStyle = "rgba(90,70,40,0.12)";
    for (let i = 0; i < 30; i++) ctx.fillRect(rnd(i) * 1024, 50 + rnd(i + 7) * 220, 20 + rnd(i + 3) * 60, 3);
  });

const beige = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#ddd3b8";
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? "rgba(120,100,60,0.08)" : "rgba(255,255,255,0.08)";
      ctx.beginPath();
      ctx.ellipse(rnd(i + 1) * 256, rnd(i + 2) * 256, 10 + rnd(i + 3) * 30, 4 + rnd(i + 4) * 8, rnd(i) * 3, 0, 2 * PI);
      ctx.fill();
    }
  });

// The generator canister's local frame: lying along z, centre at the origin, radius GEN.r, length GEN.len; the firing
// mechanism at +z. The PSU tray hangs open round it: back wall at +x (window side), top at +y, open toward -x (the
// aisle) and -y (the drop door). `hot` 0..1 heats it (orange glow, light, shimmer); `pin` frames since the pin was
// pulled (it pops out along the lanyard with a spark); `twelve` frames since the 12 MIN tag lit.
export const GEN = { r: 0.058, len: 0.36, pin: [0, -0.02, 0.24] as Vec3 };
export const GeneratorPSU: React.FC<{ position: Vec3; f: number; hot: number; pin: number; twelve: number; lanyardTo?: Vec3; tagYaw?: number }> = ({ position, f, hot, pin, twelve, lanyardTo, tagYaw = -PI / 2 }) => {
  const label = useOwnedTex(genLabel);
  const tray = useOwnedTex(beige);
  const steel = new THREE.Color("#c8ccd2").lerp(new THREE.Color("#ff7a2a"), 0.55 * hot);
  const glowK = 0.55 * hot * (0.9 + 0.1 * Math.sin(f * 0.9) * Math.sin(f * 0.37));
  // the pin: held in the striker, then yanked out down the lanyard, tumbling, and left dangling on it
  const out = pin < 0 ? 0 : smooth(pin / 6);
  const pinPos: Vec3 = [GEN.pin[0] - 0.05 * out, GEN.pin[1] - 0.16 * out - 0.04 * Math.max(0, Math.sin(Math.min(pin, 20) * 0.4)) * out, GEN.pin[2] + 0.07 * out];
  return (
    <group position={position}>
      {/* the tray: back, top and end walls in painted beige, a dark seam, the bracket strap screws */}
      <RBox size={[0.03, 0.26, 0.66]} position={[0.12, 0.0, 0.02]} color="#ffffff" map={tray} radius={0.012} />
      <RBox size={[0.3, 0.03, 0.66]} position={[0.0, 0.12, 0.02]} color="#ffffff" map={tray} radius={0.012} />
      {/* the drop door, hanging open from the window-side edge */}
      <group position={[0.13, -0.11, 0.02]} rotation={[0, 0, 1.25]}>
        <RBox size={[0.24, 0.02, 0.62]} position={[-0.12, 0, 0]} color="#d9dde3" radius={0.01} />
      </group>
      {/* the canister: steel, two clamp straps, a green band, the label facing the aisle */}
      <group rotation={[PI / 2, 0, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[GEN.r, GEN.r, GEN.len, 40]} />
          <meshStandardMaterial color={steel} roughness={0.35} emissive="#ff6a1a" emissiveIntensity={glowK} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[0, s * GEN.len * 0.5, 0]}>
            <sphereGeometry args={[GEN.r, 28, 12, 0, 2 * PI, s > 0 ? 0 : PI / 2, PI / 2]} />
            <meshStandardMaterial color={steel} roughness={0.35} emissive="#ff6a1a" emissiveIntensity={glowK * 0.9} />
          </mesh>
        ))}
        {[-0.155, 0.155].map((y) => (
          <mesh key={y} position={[0, y, 0]} rotation={[PI / 2, 0, 0]}>
            <torusGeometry args={[GEN.r + 0.004, 0.007, 8, 32]} />
            <meshStandardMaterial color="#4a4f56" roughness={0.5} />
          </mesh>
        ))}
        <mesh position={[0, 0.15, 0]}>
          <cylinderGeometry args={[GEN.r + 0.002, GEN.r + 0.002, 0.03, 40]} />
          <meshStandardMaterial color="#3e8a5a" roughness={0.5} emissive="#ff6a1a" emissiveIntensity={glowK * 0.5} />
        </mesh>
      </group>
      {/* label wrapped on the aisle side */}
      <mesh position={[-GEN.r - 0.003, 0, -0.02]} rotation={[0, -PI / 2, 0]}>
        <planeGeometry args={[0.26, 0.081]} />
        <meshBasicMaterial map={label} color={glowColor("#ffffff", 0.98)} toneMapped={false} />
      </mesh>
      {/* firing mechanism at the +z end: striker housing, spring, the pin with its red tag */}
      <RBox size={[0.07, 0.08, 0.07]} position={[0, 0, GEN.len / 2 + 0.05]} color="#8e959e" radius={0.015} />
      <Cyl r={0.018} h={0.05} position={[0, 0.0, GEN.len / 2 + 0.1]} rotation={[PI / 2, 0, 0]} color="#5d636a" />
      <group position={pinPos} rotation={[0.8 * out, 2.2 * out, 0.4 * out]}>
        <Cyl r={0.006} h={0.07} rotation={[0, 0, PI / 2]} color="#e8e8ea" rough={0.3} />
        <mesh position={[-0.04, 0, 0]}>
          <torusGeometry args={[0.014, 0.004, 8, 16]} />
          <meshStandardMaterial color="#e8e8ea" roughness={0.3} />
        </mesh>
        <RBox size={[0.035, 0.05, 0.004]} position={[-0.05, -0.035, 0]} color="#d8322c" radius={0.004} />
      </group>
      <Burst kind="sparks" at={GEN.pin} frame={pin} count={14} size={0.35} speed={0.6} seed={5} colors={["#fff2c0", "#ffb03a"]} />
      {lanyardTo && <Hose points={[pinPos, [(pinPos[0] + lanyardTo[0]) / 2, (pinPos[1] + lanyardTo[1]) / 2 - 0.01, (pinPos[2] + lanyardTo[2]) / 2], lanyardTo]} r={0.0035} color="#f2efe6" />}
      {/* heat: light, halo and shimmer once it fires */}
      {hot > 0.01 && (
        <>
          <pointLight position={[-0.35, -0.25, 0.1]} color="#ff8a3a" intensity={0.35 * hot} distance={1.2} decay={1} />
          <Halo position={[0.1, 0.02, 0]} size={0.55} color="#ff7a1a" strength={0.22 * hot} />
          <HeatShimmer position={[-0.035, GEN.r - 0.01, 0]} f={f} k={hot} height={0.09} />
        </>
      )}
      {/* the 12 MIN tag: a timer card that pops out on the strap facing the aisle (and the lens) */}
      {twelve >= 0 && (
        <group position={[-GEN.r - 0.05, -0.118, -0.02]} rotation={[0, tagYaw, 0]}>
          <Cyl r={0.003} h={0.035} position={[0, 0.04, 0]} color="#f2efe6" />
          <Label text="12 MIN" position={[0, 0, 0.004]} width={0.17} bg="#ffd23f" appear={twelve} />
        </group>
      )}
    </group>
  );
};

// Heat shimmer: thin, wavy, faintly glowing ribbons rising and wobbling over a hot surface (additive, ghost).
export const HeatShimmer: React.FC<{ position: Vec3; f: number; k: number; count?: number; width?: number; height?: number }> = ({ position, f, k, count = 7, width = 0.3, height = 0.16 }) => (
  <group position={position} userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const z = (i / (count - 1) - 0.5) * width;
      const ph = f * 0.22 + i * 1.7;
      const rise = ((f * 0.012 + rnd(i)) % 1) * 0.04;
      const pts: Vec3[] = [0, 0.33, 0.66, 1].map((u) => [Math.sin(ph + u * 5) * 0.015 * (0.3 + u), rise + u * height, z + Math.cos(ph * 0.8 + u * 4) * 0.012]);
      return <Hose key={i} points={pts} r={0.004 + 0.003 * rnd(i + 3)} color="#ffcf8a" opacity={0.22 * k * (0.6 + 0.4 * Math.sin(ph))} additive />;
    })}
  </group>
);

// ---------- coffee ----------

// The captain's coffee mug, origin at the grip (the rim 0.09 above it): white with a teal band, coffee inside, the
// handle toward +x, so in a card frame it sits in a hand facing screen-right.
export const Mug: React.FC<{ fill?: number }> = ({ fill = 0.8 }) => (
  <group position={[0, 0.02, 0]}>
    <Cyl r={0.045} r2={0.048} h={0.11} color="#f4f1ea" rough={0.45} />
    <mesh position={[0, -0.0, 0]}>
      <cylinderGeometry args={[0.0485, 0.0465, 0.025, 28]} />
      <meshStandardMaterial color="#2f9a8a" roughness={0.5} />
    </mesh>
    <mesh position={[0, -0.055 + 0.105 * fill, 0]} rotation={[-PI / 2, 0, 0]}>
      <circleGeometry args={[0.042, 24]} />
      <meshStandardMaterial color="#5a3216" roughness={0.3} />
    </mesh>
    <mesh position={[-0.05, 0.0, 0]} rotation={[0, 0, PI / 2]}>
      <torusGeometry args={[0.028, 0.009, 8, 16, PI]} />
      <meshStandardMaterial color="#f4f1ea" roughness={0.45} />
    </mesh>
  </group>
);

// ---------- galley carts ----------

const cartTex = () =>
  canvasTexture(256, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, "#b9bfc7");
    g.addColorStop(0.5, "#d6dbe1");
    g.addColorStop(1, "#b3b9c1");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    // brushed streaks and scuffs
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(${rnd(i) > 0.5 ? "255,255,255" : "70,80,90"},${0.04 + rnd(i + 2) * 0.05})`;
      ctx.fillRect(rnd(i + 5) * 256, rnd(i + 9) * 512, 1 + rnd(i) * 2, 20 + rnd(i + 1) * 80);
    }
    ctx.fillStyle = "rgba(60,60,70,0.25)";
    ctx.fillRect(0, 0, 256, 8);
    ctx.fillRect(0, 504, 256, 8);
    // the yellow placard
    ctx.fillStyle = "#f2d24a";
    ctx.fillRect(70, 150, 116, 70);
    ctx.fillStyle = "#2a2a2a";
    for (let l = 0; l < 4; l++) ctx.fillRect(80, 162 + l * 14, 96 - l * 12, 5);
  });

// A galley cart (trolley) front facing +z: brushed aluminium, a recessed bar handle, a yellow placard, a red brake
// pedal at the foot. Origin on the floor at its centre.
export const GalleyCart: React.FC<{ position: Vec3; h?: number; w?: number; rotationY?: number }> = ({ position, h = 0.55, w = 0.3, rotationY = 0 }) => {
  const tex = useOwnedTex(cartTex);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <RBox size={[w, h, 0.5]} position={[0, h / 2 + 0.02, 0]} color="#ffffff" map={tex} radius={0.025} rough={0.4} />
      <RBox size={[w * 0.75, 0.03, 0.02]} position={[0, h - 0.06, 0.255]} color="#7f868f" radius={0.008} />
      <RBox size={[0.06, 0.02, 0.03]} position={[w * 0.25, 0.03, 0.255]} color="#d8322c" radius={0.006} />
      {[-1, 1].map((s) => (
        <Cyl key={s} r={0.018} h={0.02} position={[s * w * 0.35, 0.018, 0.2]} rotation={[0, 0, PI / 2]} color="#2a2d32" />
      ))}
    </group>
  );
};

// A red turn-paddle latch (galley bays, lockers), hanging down from its pivot; `turn` radians.
export const RedLatch: React.FC<{ position: Vec3; turn?: number }> = ({ position, turn = 0 }) => (
  <group position={position} rotation={[0, 0, turn]}>
    <Cyl r={0.012} h={0.02} rotation={[PI / 2, 0, 0]} color="#8a1a16" />
    <RBox size={[0.028, 0.08, 0.018]} position={[0, -0.035, 0.01]} color="#d8322c" radius={0.008} rough={0.45} />
  </group>
);

// A cloud puff: a cluster of soft white balls with a cool shaded underside (flat, painted).
export const Puff: React.FC<{ position: Vec3; s: number; seed?: number; shade?: string }> = ({ position, s, seed = 0, shade = "#b9c6d8" }) => {
  const balls = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        p: [(rnd(i + seed) - 0.5) * 1.6, (rnd(i + seed + 11) - 0.3) * 0.5, (rnd(i + seed + 23) - 0.5) * 0.9] as Vec3,
        r: 0.45 + rnd(i + seed + 5) * 0.4,
      })),
    [seed],
  );
  return (
    <group position={position} scale={s}>
      {balls.map((b, i) => (
        <mesh key={i} position={b.p}>
          <sphereGeometry args={[b.r, 18, 12]} />
          <meshStandardMaterial color={i % 3 === 0 ? "#ffffff" : "#f4f7fb"} emissive={shade} emissiveIntensity={0.35} roughness={1} fog />
        </mesh>
      ))}
    </group>
  );
};
