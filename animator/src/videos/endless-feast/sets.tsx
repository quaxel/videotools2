import React from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, Campfire, Halo, InkBox, InkCylinder, Label, PuppetLight, Screen, SmokePlume, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { flicker } from "../../three/ThroneRoomSet";

// Sets and props for "The King Who Banned the Music From Stopping": musicians' stage, drums, the oud whose string
// snaps, the gong, the iron ring, the JOY dial with its GETTING USED TO IT spring and BREAK scissors (the dial itself
// is the Gauge from ../deserve-box/sets), the blacksmith's forge (guide/references/forge.md) and a modern living room.
// The banquet hall is the kit's ThroneRoomSet (guide/references/throne-room.md).

type Vec3 = [number, number, number];
const INK = "#161212";
const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Fixed places in the throne room for the feast.
export const SHAH_AT: [number, number] = [0, -2.02];
export const SEAT_AIR = (0.54 - 0.34) * (1060 / 1.3); // seated on the throne cushion
export const STAGE = { x0: -3.8, x1: -1.55, z0: -2.55, z1: -0.75, h: 0.18 };
export const STAGE_AIR = STAGE.h * (1060 / 1.3);
export const JOY_AT: Vec3 = [0.95, 0, -1.8];
export const GONG_AT: Vec3 = [3.05, 0, -0.9];
export const FEAST_TABLE = { x: 0, z: -1.05, w: 1.6, d: 0.55, top: 0.28 };

// ---------- stage and banquet ----------

const rugCanvas = () =>
  canvasTexture(512, 256, (ctx) => {
    ctx.fillStyle = "#1f7a6a";
    ctx.fillRect(0, 0, 512, 256);
    ctx.strokeStyle = "#e0b040";
    ctx.lineWidth = 14;
    ctx.strokeRect(14, 14, 484, 228);
    ctx.strokeStyle = "#1f3f9a";
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, 440, 184);
    ctx.fillStyle = "#e0b040";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const cx = 96 + i * 80;
      ctx.moveTo(cx, 80);
      ctx.lineTo(cx + 26, 128);
      ctx.lineTo(cx, 176);
      ctx.lineTo(cx - 26, 128);
      ctx.closePath();
      ctx.fill();
    }
  });

export const Stage3: React.FC = () => {
  const rug = useOwned(() => rugCanvas());
  const w = STAGE.x1 - STAGE.x0;
  const d = STAGE.z1 - STAGE.z0;
  return (
    <group position={[(STAGE.x0 + STAGE.x1) / 2, 0, (STAGE.z0 + STAGE.z1) / 2]}>
      <InkBox size={[w, STAGE.h, d]} position={[0, STAGE.h / 2, 0]} color="#6a4428" ink={0.012} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, STAGE.h + 0.004, 0]}>
        <planeGeometry args={[w - 0.2, d - 0.2]} />
        <meshToonMaterial map={rug} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

const Fruit: React.FC<{ position: Vec3; color: string; r?: number }> = ({ position, color, r = 0.05 }) => (
  <mesh position={position}>
    <sphereGeometry args={[r, 16, 12]} />
    <meshToonMaterial color={color} gradientMap={toonRamp} />
  </mesh>
);

// The low banquet table before the throne: a brass tray of fruit, a pitcher and cups.
export const FeastTable: React.FC<{ frame: number }> = ({ frame }) => {
  const t = FEAST_TABLE;
  return (
    <group position={[t.x, 0, t.z]}>
      <InkBox size={[t.w, 0.05, t.d]} position={[0, t.top - 0.025, 0]} color="#5a3420" ink={0.01} />
      {[-1, 1].map((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.06, t.top - 0.05, 0.06]} position={[sx * (t.w / 2 - 0.08), (t.top - 0.05) / 2, sz * (t.d / 2 - 0.08)]} color="#4a2a18" ink={0.006} />))}
      <InkCylinder radius={0.26} height={0.02} position={[-0.3, t.top + 0.01, 0]} color="#d8a838" ink={0.006} />
      {[[-0.38, 0.04, "#c8302a"], [-0.25, -0.06, "#e8a020"], [-0.3, 0.1, "#7a3a8a"], [-0.18, 0.06, "#c8302a"], [-0.42, -0.08, "#3a9a3a"]].map(([x, z, c], i) => (
        <Fruit key={i} position={[x as number, t.top + 0.06, z as number]} color={c as string} r={0.045 + (i % 2) * 0.01} />
      ))}
      <InkCylinder radius={0.07} height={0.26} position={[0.3, t.top + 0.13, 0.02]} color="#c8962a" ink={0.006} />
      <InkCylinder radius={0.035} height={0.08} position={[0.48, t.top + 0.04, 0.08]} color="#e0b040" ink={0.004} />
      <InkCylinder radius={0.035} height={0.08} position={[0.58, t.top + 0.04, -0.06]} color="#e0b040" ink={0.004} />
      {/* steam curling off the pitcher */}
      <mesh position={[0.3, t.top + 0.33 + 0.02 * Math.sin(frame * 0.1), 0.02]} scale={[0.03, 0.05, 0.03]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.35} />
      </mesh>
    </group>
  );
};

// ---------- instruments ----------

// A davul: a drum on its side with rope lacing; `size` scales it (1 = 0.5 m across), `hit` 0..1 squashes the skin.
export const Drum: React.FC<{ position: Vec3; size?: number; rotation?: Vec3; hit?: number; shell?: string; label?: string }> = ({ position, size = 1, rotation = [0, 0, 0], hit = 0, shell = "#b8501e", label }) => {
  const r = 0.25 * size;
  const depth = 0.32 * size;
  return (
    <group position={position} rotation={rotation} scale={[1 + hit * 0.04, 1 - hit * 0.04, 1 + hit * 0.04]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <InkCylinder radius={r} height={depth} color={shell} ink={0.01 * size} />
        <InkCylinder radius={r * 1.04} height={0.04 * size} position={[0, depth / 2, 0]} color="#e0b040" ink={0.006 * size} />
        <InkCylinder radius={r * 1.04} height={0.04 * size} position={[0, -depth / 2, 0]} color="#e0b040" ink={0.006 * size} />
      </group>
      <mesh position={[0, 0, depth / 2 + 0.022 * size]}>
        <circleGeometry args={[r * 0.98, 36]} />
        <meshToonMaterial color="#f2e2c0" gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return <InkBox key={i} size={[0.012 * size, 0.012 * size, depth * 1.05]} position={[Math.cos(a) * r * 1.02, Math.sin(a) * r * 1.02, 0]} rotation={[0, 0, a]} color="#f2e6c8" ink={0} />;
      })}
      {label && <Label text={label} position={[0, -r * 0.15, depth / 2 + 0.03 * size]} width={r * 1.3} />}
    </group>
  );
};

// A drumstick (a stick with a felt knob) at a hand; `swing` angle in radians.
export const Stick: React.FC<{ position: Vec3; swing: number; flip?: boolean }> = ({ position, swing, flip }) => (
  <group position={position} rotation={[0, 0, (flip ? -1 : 1) * swing]} userData={{ ghost: true }}>
    <InkCylinder radius={0.012} height={0.36} position={[0, 0.18, 0]} color="#c89060" ink={0.004} />
    <mesh position={[0, 0.37, 0]}>
      <sphereGeometry args={[0.03, 12, 10]} />
      <meshToonMaterial color="#e8dcc0" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// The oud: a pear-shaped bowl, a short neck, the pegbox bent back, a rosette and strings. `snap` 0..1 breaks the
// top string: its two halves whip apart and curl.
export const Oud: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; snap?: number; frame?: number }> = ({ position, rotation = [0, 0, 0], scale = 1, snap = 0, frame = 0 }) => {
  const wob = snap > 0 && snap < 1 ? Math.sin(frame * 2.2) * 0.4 * (1 - snap) : 0;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh scale={[0.17, 0.21, 0.08]}>
        <sphereGeometry args={[1, 32, 24]} />
        <meshToonMaterial color="#8a4a22" gradientMap={toonRamp} />
      </mesh>
      <mesh scale={[0.182, 0.222, 0.092]}>
        <sphereGeometry args={[1, 24, 18]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0, 0.078]} scale={[0.15, 0.19, 1]}>
        <circleGeometry args={[1, 32]} />
        <meshToonMaterial color="#e8c890" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.05, 0.081]}>
        <circleGeometry args={[0.035, 20]} />
        <meshBasicMaterial color="#3a2010" />
      </mesh>
      <InkBox size={[0.07, 0.025, 0.012]} position={[0, -0.12, 0.085]} color="#3a2010" ink={0.003} />
      <InkBox size={[0.06, 0.22, 0.035]} position={[0, 0.3, 0.05]} color="#5a2a12" ink={0.006} />
      <group position={[0, 0.41, 0.04]} rotation={[-0.9, 0, 0]}>
        <InkBox size={[0.055, 0.14, 0.03]} position={[0, 0.07, 0]} color="#5a2a12" ink={0.005} />
        {[0.03, 0.07, 0.11].map((y) => [-1, 1].map((s) => <InkCylinder key={`${y}${s}`} radius={0.007} height={0.05} position={[s * 0.04, y, 0]} rotation={[0, 0, Math.PI / 2]} color="#2a1a0a" ink={0} />))}
      </group>
      {/* strings: bridge (y -0.12) to nut (y 0.41) */}
      {[-0.018, -0.006, 0.006].map((x) => (
        <InkBox key={x} size={[0.003, 0.53, 0.003]} position={[x, 0.145, 0.092]} color="#f2f2e8" ink={0} />
      ))}
      {snap <= 0 ? (
        <InkBox size={[0.003, 0.53, 0.003]} position={[0.018, 0.145, 0.092]} color="#f2f2e8" ink={0} />
      ) : (
        <>
          <group position={[0.018, -0.12, 0.092]} rotation={[0.8 * snap + wob, 0, 0.6 * snap]}>
            <InkBox size={[0.003, 0.26 * (1 - 0.4 * snap), 0.003]} position={[0, 0.13 * (1 - 0.4 * snap), 0]} color="#f2f2e8" ink={0} />
          </group>
          <group position={[0.018, 0.41, 0.092]} rotation={[-0.8 * snap - wob, 0, -0.7 * snap]}>
            <InkBox size={[0.003, 0.26 * (1 - 0.4 * snap), 0.003]} position={[0, -0.13 * (1 - 0.4 * snap), 0]} color="#f2f2e8" ink={0} />
          </group>
        </>
      )}
    </group>
  );
};

export const Flute: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkCylinder radius={0.012} height={0.42} rotation={[0, 0, Math.PI / 2]} color="#c8a060" ink={0.004} />
  </group>
);

// The gong in its carved frame; `ring` 0..1 swings and shimmers it after a strike.
export const Gong: React.FC<{ position: Vec3; ring?: number; frame?: number }> = ({ position, ring = 0, frame = 0 }) => {
  const sway = Math.sin(frame * 0.5) * 0.08 * ring;
  return (
    <group position={position}>
      {[-0.55, 0.55].map((x) => (
        <InkBox key={x} size={[0.08, 1.7, 0.08]} position={[x, 0.85, 0]} color="#5a2a18" ink={0.008} />
      ))}
      <InkBox size={[1.3, 0.1, 0.1]} position={[0, 1.72, 0]} color="#5a2a18" ink={0.008} />
      <InkBox size={[1.2, 0.04, 0.3]} position={[0, 0.02, 0]} color="#4a2414" ink={0.006} />
      <group position={[0, 1.6, 0]} rotation={[sway, 0, 0]}>
        <InkBox size={[0.01, 0.12, 0.01]} position={[-0.2, -0.06, 0]} color="#2a1a0a" ink={0} />
        <InkBox size={[0.01, 0.12, 0.01]} position={[0.2, -0.06, 0]} color="#2a1a0a" ink={0} />
        <group position={[0, -0.58, 0]}>
          <InkCylinder radius={0.45} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#d8a838" ink={0.01} />
          <mesh position={[0, 0, 0.025]}>
            <circleGeometry args={[0.16, 28]} />
            <meshToonMaterial color="#b8801a" gradientMap={toonRamp} />
          </mesh>
          {ring > 0.02 && <Halo position={[0, 0, 0.05]} size={1.4} color="#ffe6a0" strength={0.35 * ring} />}
        </group>
      </group>
    </group>
  );
};

export const Mallet: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkCylinder radius={0.015} height={0.5} position={[0, 0.25, 0]} color="#7a4a22" ink={0.004} />
    <mesh position={[0, 0.52, 0]} scale={[0.07, 0.07, 0.07]}>
      <sphereGeometry args={[1, 14, 10]} />
      <meshToonMaterial color="#c8302a" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// The plain iron ring; `glint` adds a highlight. Its words are on a tag (THIS TOO SHALL PASS) shown with `tag`.
export const Ring: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; glint?: number; hot?: number }> = ({ position, rotation = [0, 0, 0], scale = 1, glint = 0, hot = 0 }) => (
  <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
    <mesh>
      <torusGeometry args={[0.05, 0.014, 12, 32]} />
      <meshToonMaterial color={hot > 0 ? new THREE.Color("#5a5a60").lerp(new THREE.Color("#ff7a20"), hot).getStyle() : "#5a5a60"} gradientMap={toonRamp} emissive={hot > 0 ? "#ff5a10" : "#000"} emissiveIntensity={hot} />
    </mesh>
    <mesh>
      <torusGeometry args={[0.05, 0.019, 10, 28]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    {glint > 0 && <Halo position={[0.03, 0.04, 0.03]} size={0.12} color="#ffffff" strength={0.6 * glint} />}
  </group>
);

// ---------- the mechanism ----------

// A coil spring between two points (a helix tube), with a label on a tag beside it. `stretch` is implied by the ends.
export const Spring: React.FC<{ from: Vec3; to: Vec3; turns?: number; radius?: number; cut?: number; label?: string; labelAt?: Vec3 }> = ({ from, to, turns = 12, radius = 0.035, cut = 0, label, labelAt }) => {
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const geo = React.useMemo(() => {
    const pts: THREE.Vector3[] = [];
    const n = turns * 16;
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      pts.push(new THREE.Vector3(Math.cos(u * turns * Math.PI * 2) * radius, u * len, Math.sin(u * turns * Math.PI * 2) * radius));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, 0.007, 6, false);
  }, [len, turns, radius]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  // once cut, the two halves recoil toward their ends
  if (cut > 0) {
    const ra = Math.max(0.05, 0.5 - 0.42 * cut);
    return (
      <group>
        <group position={from} rotation={[e.x, e.y, e.z]} scale={[1, ra, 1]}>
          <mesh geometry={geo}>
            <meshToonMaterial color="#b8bcc4" gradientMap={toonRamp} />
          </mesh>
        </group>
        <group position={to} rotation={[e.x + Math.PI, e.y, e.z]} scale={[1, ra, 1]}>
          <mesh geometry={geo}>
            <meshToonMaterial color="#b8bcc4" gradientMap={toonRamp} />
          </mesh>
        </group>
        {label && labelAt && <Label text={label} position={labelAt} width={0.42} />}
      </group>
    );
  }
  return (
    <group>
      <group position={from} rotation={[e.x, e.y, e.z]}>
        <mesh geometry={geo}>
          <meshToonMaterial color="#b8bcc4" gradientMap={toonRamp} />
        </mesh>
      </group>
      {label && labelAt && <Label text={label} position={labelAt} width={0.42} />}
    </group>
  );
};

// Big scissors labelled BREAK: `close` 0..1 shuts the blades; pivot at the origin, blades toward +x.
export const Scissors: React.FC<{ position: Vec3; rotation?: Vec3; close: number; label?: string; scale?: number; flip?: boolean }> = ({ position, rotation = [0, 0, 0], close, label = "BREAK", scale = 1, flip = false }) => {
  const open = 0.45 * (1 - close);
  const blade = (s: number) => (
    <group rotation={[0, 0, s * open]}>
      <mesh position={[0.17, 0, 0]} scale={[0.17, 0.025, 0.008]}>
        <sphereGeometry args={[1, 16, 8]} />
        <meshToonMaterial color="#d8dce4" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[-0.1, -s * 0.03, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.045, 0.012, 8, 20]} />
        <meshToonMaterial color="#d82a2a" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
  return (
    <group position={position} rotation={rotation} scale={scale} userData={{ ghost: true }}>
      <group scale={[flip ? -1 : 1, 1, 1]}>
        {blade(1)}
        {blade(-1)}
      </group>
      <mesh>
        <sphereGeometry args={[0.018, 10, 8]} />
        <meshToonMaterial color="#5a5a60" gradientMap={toonRamp} />
      </mesh>
      {label && <Label text={label} position={[flip ? 0.12 : -0.12, -0.13, 0.01]} width={0.22} />}
    </group>
  );
};

// ---------- the forge ----------

const sootCanvas = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#5a4a3e";
    ctx.fillRect(0, 0, 1024, 512);
    for (let r = 0; r < 8; r++) {
      let x = -((r * 53) % 90);
      let k = 0;
      while (x < 1024) {
        const w = 90 + rand(r * 7 + k) * 70;
        const tone = 0.75 + rand(r * 11 + k * 3) * 0.3;
        ctx.fillStyle = `rgb(${[150, 112, 88].map((v) => Math.round(v * tone)).join(",")})`;
        ctx.beginPath();
        ctx.roundRect(x + 4, r * 64 + 4, w - 8, 56, 8);
        ctx.fill();
        x += w;
        k++;
      }
    }
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(20,12,8,0.6)");
    g.addColorStop(0.5, "rgba(20,12,8,0.15)");
    g.addColorStop(1, "rgba(20,12,8,0.3)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
  });

export const ANVIL: Vec3 = [0.35, 0, 0.0];
export const ANVIL_TOP = 0.62;
export const HEARTH: Vec3 = [-0.9, 0, -1.3];
export const SMITH_AT: [number, number] = [0.95, -0.05];
export const forgeLight = (frame: number): PuppetLight => ({
  shadow: 0.3,
  points: [{ position: [HEARTH[0], 1.0, HEARTH[2] + 0.4], color: "#ff8a30", strength: 2.6 * flicker(frame * 0.6, 2), range: 3.2 }],
  distant: [{ direction: [0.4, 0.6, 0.6], color: "#8a9ad8", strength: 0.3 }],
});
export const FORGE_BG = "#1a0c06";

export const Anvil: React.FC<{ position?: Vec3 }> = ({ position = ANVIL }) => (
  <group position={position}>
    <InkCylinder radius={0.2} height={0.42} position={[0, 0.21, 0]} color="#6a4428" ink={0.01} />
    <InkBox size={[0.24, 0.1, 0.14]} position={[0, 0.47, 0]} color="#3a3a40" ink={0.008} />
    <InkBox size={[0.42, 0.08, 0.16]} position={[0, 0.58, 0]} color="#4a4a52" ink={0.01} />
    <mesh position={[-0.29, 0.585, 0]} rotation={[0, 0, Math.PI / 2]}>
      <coneGeometry args={[0.05, 0.18, 16]} />
      <meshToonMaterial color="#4a4a52" gradientMap={toonRamp} />
    </mesh>
  </group>
);

export const Hammer: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkCylinder radius={0.014} height={0.34} position={[0, 0.17, 0]} color="#8a5a2a" ink={0.004} />
    <InkBox size={[0.12, 0.05, 0.05]} position={[0, 0.34, 0]} color="#3a3a40" ink={0.005} />
  </group>
);

export const ForgeSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const wall = useOwned(() => {
    const t = sootCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 1.4);
    return t;
  });
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[FORGE_BG]} />
      <fog attach="fog" args={[FORGE_BG, 5, 13]} />
      <ambientLight intensity={0.45} color="#ffb080" />
      <hemisphereLight args={["#ff9a5a", "#1a0c06", 0.35]} />
      <directionalLight position={[3, 4, 3]} intensity={0.5} color="#9aa8ff" castShadow shadow-mapSize={[1024, 1024]} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshToonMaterial color="#4a3a2e" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 2.2, -2.2]} receiveShadow>
        <planeGeometry args={[8, 4.4]} />
        <meshToonMaterial map={wall} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[-2.6, 2.2, 0.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[6, 4.4]} />
        <meshToonMaterial map={wall} gradientMap={toonRamp} />
      </mesh>
      {/* the hearth: a waist-high brick bed with a hood and chimney */}
      <group position={HEARTH}>
        <InkBox size={[1.2, 0.75, 0.9]} position={[0, 0.375, 0]} color="#7a4a34" ink={0.012} />
        <InkBox size={[1.0, 0.06, 0.7]} position={[0, 0.76, 0.05]} color="#2a1a14" ink={0.006} />
        <mesh position={[0, 1.85, -0.05]}>
          <cylinderGeometry args={[0.25, 0.62, 0.9, 4, 1]} />
          <meshToonMaterial color="#5a3a2a" gradientMap={toonRamp} />
        </mesh>
        <InkBox size={[0.4, 1.6, 0.4]} position={[0, 3.0, -0.1]} color="#5a3a2a" ink={0.01} />
        <group position={[0, 0.78, 0.05]}>
          <Campfire position={[0, 0, 0]} frame={frame} smoke={false} />
        </group>
        <SmokePlume position={[0, 2.3, -0.1]} world={[HEARTH[0], HEARTH[2]]} frame={frame} size={0.08} rise={1.2} wind={0.2} period={60} puffs={5} dark />
        {/* bellows on the side */}
        <group position={[0.8, 0.55, 0.05]} rotation={[0, 0, 0.2 + 0.06 * Math.sin(frame * 0.12)]}>
          <InkBox size={[0.42, 0.06, 0.3]} position={[0.1, 0.06, 0]} color="#6a3a1a" ink={0.006} />
          <InkBox size={[0.42, 0.06, 0.3]} position={[0.1, -0.06, 0]} color="#6a3a1a" ink={0.006} />
          <InkBox size={[0.36, 0.1, 0.26]} position={[0.1, 0, 0]} color="#3a2010" ink={0.004} />
        </group>
      </group>
      {/* tools on the wall */}
      {[-0.1, 0.25, 0.6, 0.95].map((x, i) => (
        <group key={x} position={[x, 1.55, -2.15]}>
          <InkCylinder radius={0.012} height={0.6} position={[0, -0.3, 0]} color="#2a2a2e" ink={0.004} />
          <InkBox size={[i % 2 ? 0.08 : 0.12, 0.05, 0.03]} position={[0, -0.62, 0]} color="#2a2a2e" ink={0.004} />
        </group>
      ))}
      <InkCylinder radius={0.18} height={0.36} position={[1.1, 0.18, -0.9]} color="#5a3a22" ink={0.01} />
      <mesh position={[1.1, 0.35, -0.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.16, 24]} />
        <meshBasicMaterial color="#2a3a4a" />
      </mesh>
      <Anvil />
      {children}
    </>
  );
};

// ---------- the living room today ----------

export const LIVING_BG = "#1a1430";
export const SOFA: Vec3 = [0, 0, 0.6];
export const TV: Vec3 = [0, 0, -1.4];

export const LivingSet: React.FC<{ camera: CameraShot; frame: number; ad: number; children?: React.ReactNode }> = ({ camera, frame, ad, children }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={[LIVING_BG]} />
    <fog attach="fog" args={[LIVING_BG, 5, 14]} />
    <ambientLight intensity={0.55} color="#9a8ad8" />
    <hemisphereLight args={["#8a7ad8", "#1a1430", 0.4]} />
    <directionalLight position={[-2, 4, 3]} intensity={0.5} color="#c8b8ff" castShadow shadow-mapSize={[1024, 1024]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[10, 10]} />
      <meshToonMaterial color="#6a4a3a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 1.8, -1.8]}>
      <planeGeometry args={[8, 3.6]} />
      <meshToonMaterial color="#4a3a6a" gradientMap={toonRamp} />
    </mesh>
    {/* rug */}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -0.2]}>
      <circleGeometry args={[1.4, 40]} />
      <meshToonMaterial color="#c8a040" gradientMap={toonRamp} />
    </mesh>
    {/* TV cabinet and the TV */}
    <InkBox size={[1.6, 0.45, 0.4]} position={[TV[0], 0.225, TV[2]]} color="#3a2a22" ink={0.01} />
    <InkBox size={[1.3, 0.78, 0.06]} position={[TV[0], 0.95, TV[2]]} color="#111" ink={0.012} />
    <Screen position={[TV[0], 0.95, TV[2] + 0.035]} size={[1.2, 0.68]} text={ad > 0.5 ? "AD BREAK" : "ON AIR"} glow={ad > 0.5 ? "#ffd84a" : "#7fd8ff"} bg={ad > 0.5 ? "#3a1a4a" : "#0a2a3a"} />
    <Halo position={[TV[0], 0.95, TV[2] + 0.2]} size={2.4} color={ad > 0.5 ? "#ffd84a" : "#7fd8ff"} strength={0.25 + 0.05 * Math.sin(frame * 0.3)} />
    <pointLight position={[TV[0], 0.95, TV[2] + 0.6]} intensity={1.6} distance={4} color={ad > 0.5 ? "#ffd8a0" : "#9ad8ff"} />
    {/* lamp and plant */}
    <InkCylinder radius={0.02} height={1.4} position={[-1.3, 0.7, -1.2]} color="#2a2a2a" ink={0.004} />
    <mesh position={[-1.3, 1.45, -1.2]}>
      <coneGeometry args={[0.2, 0.25, 20, 1, true]} />
      <meshToonMaterial color="#f2d890" gradientMap={toonRamp} emissive="#c8a040" side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[-1.3, 1.4, -1.1]} intensity={1.0} distance={3} color="#ffd890" />
    {/* the sofa */}
    <group position={SOFA}>
      <InkBox size={[1.8, 0.36, 0.8]} position={[0, 0.18, 0]} color="#3a6a8a" ink={0.012} />
      <InkBox size={[1.8, 0.5, 0.2]} position={[0, 0.55, 0.32]} color="#3a6a8a" ink={0.012} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.2, 0.55, 0.8]} position={[s * 0.92, 0.28, 0]} color="#2e5a7a" ink={0.01} />
      ))}
    </group>
    {children}
  </>
);
