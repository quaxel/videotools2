import React from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { Crack3, CrackRibbons, FILM, GLASS, GLASS_DARK, paneWeb, Pane, rnd } from "./glass";

// Sets and props for "The Dropped Flask That Would Not Fall Apart": the Paris lab of 1903
// (guide/references/paris-lab-1903.md), a Paris street about 1905, the giant glass sandwich of the pivot, a First
// World War trench, and a present-day car on a road. No brands or makes anywhere.

const INK = "#161212";
const OAK = "#5a3a24";
const OAK_DARK = "#3e2818";

export const Stick: React.FC<{ a: Vec3; b: Vec3; radius: number; color: string; ink?: number }> = ({ a, b, radius, color, ink = 0.004 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(0.001, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return <InkCylinder radius={radius} height={len} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} color={color} ink={ink} />;
};

// ---------- the lab ----------

// An artist's easel with a canvas on it (a small painted landscape): he is a chemist and an artist.
export const Easel: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => {
  const tex = useOwned(() => {
    return canvasTexture(256, 320, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 320);
      g.addColorStop(0, "#9cc4e0");
      g.addColorStop(0.55, "#f0dca8");
      g.addColorStop(0.56, "#6a9a5a");
      g.addColorStop(1, "#3a6a3a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 320);
      ctx.fillStyle = "#f4e8b0";
      ctx.beginPath();
      ctx.arc(180, 90, 26, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#2e4e2e";
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(30 + i * 50, 190 - (i % 2) * 14, 26, 40, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#5a3a24";
      ctx.lineWidth = 14;
      ctx.strokeRect(0, 0, 256, 320);
    });
  }, []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <Stick a={[-0.22, 0, 0.12]} b={[-0.06, 1.5, -0.02]} radius={0.016} color={OAK} />
      <Stick a={[0.22, 0, 0.12]} b={[0.06, 1.5, -0.02]} radius={0.016} color={OAK} />
      <Stick a={[0, 0, -0.32]} b={[0, 1.4, -0.04]} radius={0.014} color={OAK} />
      <InkBox size={[0.56, 0.03, 0.06]} position={[0, 0.66, 0.08]} color={OAK} ink={0.005} />
      <group position={[0, 0.95, 0.1]} rotation={[-0.09, 0, 0]}>
        <InkBox size={[0.5, 0.6, 0.025]} color="#e8dcc0" ink={0.006} />
        <mesh position={[0, 0, 0.014]}>
          <planeGeometry args={[0.47, 0.57]} />
          <meshToonMaterial map={tex} gradientMap={toonRamp} />
        </mesh>
      </group>
    </group>
  );
};

// A broom: the handle from `grip` (where the hand holds it) to `head` (the bristles' top).
export const Broom: React.FC<{ grip: Vec3; head: Vec3 }> = ({ grip, head }) => {
  const d = new THREE.Vector3(head[0] - grip[0], head[1] - grip[1], head[2] - grip[2]).normalize();
  const top: Vec3 = [grip[0] - d.x * 0.32, grip[1] - d.y * 0.32, grip[2] - d.z * 0.32];
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group userData={{ ghost: true }}>
      <Stick a={top} b={head} radius={0.013} color="#a87a4a" />
      <group position={head} rotation={[e.x, e.y, e.z]}>
        <InkBox size={[0.2, 0.05, 0.05]} position={[0, -0.02, 0]} color="#5a3a24" ink={0.005} />
        <InkBox size={[0.24, 0.14, 0.05]} position={[0, -0.11, 0]} color="#d8b860" ink={0.006} />
      </group>
    </group>
  );
};

// A low cupboard (top at `h`) with reagent bottles on it: where he sets the flask aside.
export const LowCupboard: React.FC<{ position: Vec3; width?: number; h?: number; bottles?: number[] }> = ({ position, width = 1.0, h = 0.86, bottles = [-0.38, -0.22, 0.25, 0.4] }) => (
  <group position={position}>
    <InkBox size={[width, h, 0.42]} position={[0, h / 2, 0]} color={OAK} ink={0.01} />
    <InkBox size={[width + 0.04, 0.035, 0.46]} position={[0, h + 0.017, 0]} color={OAK_DARK} ink={0.006} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <InkBox size={[width / 2 - 0.05, h - 0.12, 0.02]} position={[(s * width) / 4, h / 2, 0.215]} color="#6a4a2e" ink={0.004} />
        <InkBox size={[0.02, 0.08, 0.02]} position={[s * 0.05, h * 0.55, 0.235]} color="#c8a040" ink={0.002} />
      </group>
    ))}
    {bottles.map((x, i) => (
      <group key={x} position={[x * width, h + 0.035, 0.02 * (i % 2)]}>
        <InkCylinder radius={0.04} height={0.15 + 0.05 * rnd(i, 2)} position={[0, 0.08, 0]} color={i % 3 ? "#5a3216" : "#2a4a5a"} ink={0.004} />
        <InkCylinder radius={0.016} height={0.04} position={[0, 0.18 + 0.05 * rnd(i, 2), 0]} color="#d8c8a8" ink={0.002} />
        <InkBox size={[0.05, 0.05, 0.005]} position={[0, 0.08, 0.041]} color="#f0e8d0" ink={0.002} />
      </group>
    ))}
  </group>
);

// A glass-stoppered jar of collodion and a flat brush.
export const CollodionJar: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.055} height={0.12} position={[0, 0.06, 0]} color="#c89848" ink={0.005} />
    <InkCylinder radius={0.03} height={0.03} position={[0, 0.135, 0]} color={GLASS} ink={0.003} />
    <InkBox size={[0.07, 0.05, 0.005]} position={[0, 0.065, 0.056]} color="#f4ecd8" ink={0.002} />
  </group>
);
export const Brush: React.FC<{ tip: Vec3; tilt?: number }> = ({ tip, tilt = 0.6 }) => (
  <group position={tip} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
    <InkBox size={[0.04, 0.04, 0.012]} position={[0, 0.02, 0]} color="#e0b860" ink={0.003} />
    <InkBox size={[0.03, 0.03, 0.01]} position={[0, 0.055, 0]} color="#b8b8c0" ink={0.002} />
    <InkCylinder radius={0.007} height={0.18} position={[0, 0.16, 0]} color="#7a2a22" ink={0.002} />
  </group>
);

// The newspaper he reads at night: a masthead, ACCIDENT! and a little drawing of a car.
const newsCanvas = () =>
  canvasTexture(512, 360, (ctx) => {
    ctx.fillStyle = "#ece4d0";
    ctx.fillRect(0, 0, 512, 360);
    ctx.fillStyle = "#1e1a18";
    ctx.font = "bold 40px Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("NOUVELLES", 256, 52);
    ctx.fillRect(20, 64, 472, 4);
    ctx.font = "bold 64px Georgia, serif";
    ctx.fillText("ACCIDENT!", 256, 136);
    // a little car drawing
    ctx.lineWidth = 6;
    ctx.strokeStyle = "#1e1a18";
    ctx.strokeRect(150, 170, 150, 50);
    ctx.strokeRect(190, 150, 60, 22);
    ctx.beginPath();
    ctx.arc(180, 232, 18, 0, Math.PI * 2);
    ctx.arc(280, 232, 18, 0, Math.PI * 2);
    ctx.stroke();
    // shards flying from the car
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      const x = 320 + i * 18;
      const y = 160 + ((i * 37) % 60);
      ctx.moveTo(x, y);
      ctx.lineTo(x + 10, y - 8);
      ctx.lineTo(x + 6, y + 8);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(30,26,24,0.55)";
    for (let r = 0; r < 6; r++) for (let c = 0; c < 2; c++) ctx.fillRect(30 + c * 250, 270 + r * 14, 200 - (r % 3) * 30, 6);
  });
export const News: React.FC<{ position: Vec3; rotation?: Vec3; size?: [number, number] }> = ({ position, rotation = [0, 0, 0], size = [0.5, 0.35] }) => {
  const tex = useOwned(() => {
    const t = newsCanvas();
    return t;
  }, []);
  return (
    <group position={position} rotation={rotation} userData={{ ghost: true }}>
      <mesh>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[size[0] + 0.012, size[1] + 0.012]} />
        <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// A desk lamp with a green glass shade (night study and lab).
export const GreenLamp: React.FC<{ position: Vec3; on?: number }> = ({ position, on = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.07} height={0.03} position={[0, 0.015, 0]} color="#b08a3a" ink={0.004} />
    <InkCylinder radius={0.012} height={0.3} position={[0, 0.17, 0]} color="#b08a3a" ink={0.003} />
    <group position={[0, 0.33, 0.05]} rotation={[0.35, 0, 0]}>
      <InkCylinder radius={0.11} height={0.07} color="#2a6a4a" ink={0.006} />
      <mesh position={[0, -0.036, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.1, 24]} />
        <meshBasicMaterial color={new THREE.Color("#fff0c0").multiplyScalar(1 + on)} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </group>
    {on > 0 && <Halo position={[0, 0.25, 0.1]} size={0.6} color="#ffd890" strength={0.35 * on} />}
  </group>
);

// The patent: a cream document with a red wax seal; the year on the paper.
export const Patent: React.FC<{ position: Vec3; rotation?: Vec3; appear?: number }> = ({ position, rotation = [0, 0, 0], appear }) => (
  <group position={position} rotation={rotation} userData={{ ghost: true }}>
    <InkBox size={[0.26, 0.34, 0.006]} color="#f0e6cc" ink={0.004} />
    <Label text={"PATENT\n1909"} position={[0, 0.06, 0.006]} width={0.2} bg="#f0e6cc" border={false} appear={appear} />
    <mesh position={[0.06, -0.1, 0.006]}>
      <circleGeometry args={[0.035, 18]} />
      <meshToonMaterial color="#b02a22" gradientMap={toonRamp} />
    </mesh>
  </group>
);

// ---------- a Paris street, about 1905 ----------

const facadeCanvas = (seed: number, tint: string) =>
  canvasTexture(512, 640, (ctx) => {
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, 512, 640);
    // stone courses
    ctx.strokeStyle = "rgba(120,100,70,0.25)";
    ctx.lineWidth = 2;
    for (let y = 20; y < 640; y += 26) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
    // tall French windows, three floors, with shutters
    for (let fl = 0; fl < 3; fl++)
      for (let c = 0; c < 3; c++) {
        const x = 50 + c * 160;
        const y = 50 + fl * 150;
        ctx.fillStyle = "#3a4a5a";
        ctx.fillRect(x, y, 90, 110);
        ctx.fillStyle = "rgba(200,220,235,0.45)";
        ctx.fillRect(x + 8, y + 8, 32, 40);
        ctx.fillStyle = rnd(c + fl * 3, seed) > 0.5 ? "#5a6a4a" : "#6a5a4a";
        ctx.fillRect(x - 22, y, 20, 110);
        ctx.fillRect(x + 92, y, 20, 110);
        ctx.strokeStyle = "#f0e8d8";
        ctx.lineWidth = 5;
        ctx.strokeRect(x, y, 90, 110);
        ctx.beginPath();
        ctx.moveTo(x + 45, y);
        ctx.lineTo(x + 45, y + 110);
        ctx.stroke();
        // iron balcony rail
        if (fl === 0) {
          ctx.fillStyle = "#1e1e22";
          ctx.fillRect(x - 24, y + 96, 138, 6);
          for (let k = 0; k < 9; k++) ctx.fillRect(x - 22 + k * 16, y + 100, 3, 18);
        }
      }
    // grime toward the bottom
    const g = ctx.createLinearGradient(0, 400, 0, 640);
    g.addColorStop(0, "rgba(90,70,50,0)");
    g.addColorStop(1, "rgba(90,70,50,0.25)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 400, 512, 240);
  });

const cobbleCanvas = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#7a7064";
    ctx.fillRect(0, 0, 512, 512);
    for (let r = 0; r < 16; r++)
      for (let c = 0; c < 12; c++) {
        const x = c * 44 + (r % 2) * 22;
        const y = r * 32;
        const v = 120 + Math.floor(rnd(r * 12 + c, 4) * 40);
        ctx.fillStyle = `rgb(${v},${v - 8},${v - 18})`;
        ctx.beginPath();
        ctx.ellipse(x + 20, y + 15, 19, 13, 0, 0, Math.PI * 2);
        ctx.fill();
      }
  });

const Facade: React.FC<{ x: number; z: number; w: number; h: number; seed: number; tint: string; awning?: string }> = ({ x, z, w, h, seed, tint, awning }) => {
  const tex = useOwned(() => {
    const t = facadeCanvas(seed, tint);
    return t;
  }, [seed, tint]);
  return (
    <group position={[x, 0, z]}>
      {/* the ground floor shop and the upper floors */}
      <InkBox size={[w, 1.25, 0.3]} position={[0, 0.625, 0]} color="#6a4a3a" ink={0.01} />
      <mesh position={[0, 0.66, 0.152]}>
        <planeGeometry args={[w * 0.7, 0.82]} />
        <meshBasicMaterial color="#e8c890" />
      </mesh>
      <InkBox size={[w, h - 1.25, 0.3]} position={[0, 1.25 + (h - 1.25) / 2, -0.02]} color="#ffffff" ink={0.01} map={tex} />
      <InkBox size={[w + 0.1, 0.12, 0.4]} position={[0, h, 0]} color="#cfc2a4" ink={0.008} />
      <InkBox size={[w + 0.06, 0.6, 0.5]} position={[0, h + 0.3, -0.2]} color="#6a7a8a" ink={0.008} />
      {awning && (
        <group position={[0, 1.24, 0.35]} rotation={[0.5, 0, 0]}>
          {Array.from({ length: 8 }, (_, i) => (
            <InkBox key={i} size={[w / 8, 0.03, 0.62]} position={[-w / 2 + (i + 0.5) * (w / 8), 0, 0]} color={i % 2 ? awning : "#f0e8d8"} ink={0.003} />
          ))}
        </group>
      )}
    </group>
  );
};

export const GasLamp: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.04} height={0.15} position={[0, 0.075, 0]} color="#2a3a32" ink={0.005} />
    <InkCylinder radius={0.022} height={1.9} position={[0, 1.0, 0]} color="#2a3a32" ink={0.004} />
    <InkBox size={[0.16, 0.2, 0.16]} position={[0, 2.05, 0]} color="#e8e0b0" ink={0.008} />
    <InkBox size={[0.2, 0.04, 0.2]} position={[0, 2.17, 0]} color="#2a3a32" ink={0.005} />
  </group>
);

// Street along x, the kerb at z = -1.8, the house fronts at z = -2.6. Cobbles up to the kerb.
export const ParisStreet: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const cob = useOwned(() => {
    const t = cobbleCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 3);
    return t;
  }, []);
  const tints = ["#e8dcc0", "#efe2c6", "#e2d2b4", "#ece0c8", "#e6d8bc"];
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[16, 6]} />
        <meshToonMaterial map={cob} gradientMap={toonRamp} />
      </mesh>
      {/* pavement and kerb */}
      <InkBox size={[16, 0.1, 0.8]} position={[0, 0.05, -2.2]} color="#b8ae9c" ink={0.006} />
      {[-6, -3.6, -1.2, 1.2, 3.6, 6].map((x, i) => (
        <Facade key={x} x={x} z={-2.75} w={2.4} h={4.2 + 0.3 * (i % 2)} seed={i} tint={tints[i % tints.length]} awning={i === 2 ? "#2a6a4a" : i === 4 ? "#a83a2a" : undefined} />
      ))}
      {[-2.4, 2.4].map((x) => (
        <GasLamp key={x} position={[x, 0.1, -2.0]} />
      ))}
      {children}
    </group>
  );
};

// A windscreen for the 1904 car (MarathonSets Automobile, which has none): a pane on a brass frame over the dash,
// in the car's own frame (front toward +z). `shatter` is handled by the scene (shards).
export const CarScreen: React.FC<{ gone?: boolean; web?: Crack3[]; crack?: number }> = ({ gone = false, web, crack = 0 }) => (
  <group position={[0, 0.98, 0.5]}>
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.03, 0.42, 0.03]} position={[s * 0.44, 0, 0]} color="#d8a84a" ink={0.004} />
    ))}
    <InkBox size={[0.92, 0.03, 0.03]} position={[0, 0.2, 0]} color="#d8a84a" ink={0.004} />
    {!gone && <Pane size={[0.86, 0.38]} position={[0, -0.02, 0]} clear={0.6} web={web} crack={crack} thick={0.008} width={0.004} />}
  </group>
);

// ---------- the pivot: the giant glass sandwich ----------

// Glass, plastic, glass, lying flat on a low stand (top glass up). `drop` per layer 0..1 lowers it into place;
// `tilt` 0..1 stands the whole sandwich up toward the camera on its front edge; the web runs over the top glass.
export const SANDWICH = { w: 0.9, d: 0.6, g: 0.13, p: 0.07, base: 0.72 };
export const Sandwich: React.FC<{ position: Vec3; drop: [number, number, number]; tilt?: number; web?: Crack3[]; crack?: number; bulge?: number }> = ({ position, drop, tilt = 0, web, crack = 0, bulge = 0 }) => {
  const { w, d, g, p, base } = SANDWICH;
  const y1 = g / 2;
  const y2 = g + p / 2;
  const y3 = g + p + g / 2;
  return (
    <group position={position}>
      {/* the stand: a steel table top on four legs */}
      <InkBox size={[w + 0.12, 0.04, d + 0.1]} position={[0, base - 0.02, 0]} color="#8a909c" ink={0.008} />
      {[-1, 1].flatMap((sx) => [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, base - 0.04, 0.05]} position={[sx * (w / 2 - 0.02), (base - 0.04) / 2, sz * (d / 2 - 0.02)]} color="#5a606c" ink={0.005} />))}
      <group position={[0, base, d / 2]} rotation={[tilt * 1.25, 0, 0]}>
        <group position={[0, 0, -d / 2]}>
          <group position={[0, y1 + (1 - drop[0]) * 1.6, 0]}>
            <InkBox size={[w, g, d]} color={GLASS} ink={0.012} />
          </group>
          <group position={[0, y2 + (1 - drop[1]) * 1.6, 0]}>
            <InkBox size={[w - 0.004, p, d - 0.004]} color={FILM} ink={0.008} />
          </group>
          <group position={[0, y3 + (1 - drop[2]) * 1.6, 0]}>
            <InkBox size={[w, g, d]} color={GLASS} ink={0.012} />
            {/* highlight streaks on the top */}
            {[-0.3, -0.18].map((x, i) => (
              <mesh key={x} position={[x * w, g / 2 + 0.002, 0.05]} rotation={[-Math.PI / 2, 0, 0.6]}>
                <planeGeometry args={[i ? 0.04 : 0.08, d * 0.8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.5} toneMapped={false} depthWrite={false} />
              </mesh>
            ))}
            {web && crack > 0 && (
              <group position={[0, g / 2 + 0.001 + bulge * 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <CrackRibbons lines={web} front={crack} width={0.009} maxD={0.6} />
              </group>
            )}
            {web && crack > 0 && (
              // the web shows on the front edge too
              <mesh position={[0, 0, d / 2 + 0.002]}>
                <planeGeometry args={[w * 0.02, g * 0.9]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
              </mesh>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};
export const sandwichWeb = (seed: number) => paneWeb(seed, [-0.05, 0.0], [SANDWICH.w / 2, SANDWICH.d / 2], [0.25, 0.5], [0.05, 0.1, 0.17, 0.26]);

// The giant mallet: steel head on a wooden handle, pivoting about `pivot`; `angle` radians (0 = handle level,
// pointing -x from the pivot; positive swings the head down).
export const Mallet: React.FC<{ pivot: Vec3; angle: number; len?: number }> = ({ pivot, angle, len = 1.25 }) => (
  <group position={pivot} rotation={[0, 0, angle]} userData={{ ghost: true }}>
    <InkBox size={[len, 0.07, 0.07]} position={[-len / 2, 0, 0]} color="#a87a4a" ink={0.008} />
    <group position={[-len, 0, 0]}>
      <InkBox size={[0.26, 0.42, 0.26]} color="#8a929a" ink={0.012} />
      <InkBox size={[0.27, 0.05, 0.27]} position={[0, 0.17, 0]} color="#5a6268" ink={0.006} />
      <InkBox size={[0.27, 0.05, 0.27]} position={[0, -0.17, 0]} color="#5a6268" ink={0.006} />
    </group>
  </group>
);

// ---------- a First World War trench ----------

const Sandbag: React.FC<{ position: Vec3; rotationY?: number; color?: string }> = ({ position, rotationY = 0, color = "#9a8a5a" }) => (
  <group position={position} rotation={[0, rotationY, 0]} scale={[1, 0.62, 0.62]}>
    <mesh castShadow receiveShadow>
      <capsuleGeometry args={[0.13, 0.26, 4, 10]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.06}>
      <capsuleGeometry args={[0.13, 0.26, 4, 10]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);
// rotate the capsules lying along x
export const SandbagWall: React.FC<{ x0: number; x1: number; z: number; rows: number; y0?: number; seed?: number }> = ({ x0, x1, z, rows, y0 = 0, seed = 1 }) => {
  const bags: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    for (let x = x0 + (r % 2) * 0.25; x < x1; x += 0.5) {
      const tone = rnd(Math.floor(x * 10) + r * 31, seed);
      bags.push(
        <group key={`${r}-${x.toFixed(2)}`} position={[x, y0 + 0.09 + r * 0.17, z + (tone - 0.5) * 0.04]} rotation={[0, 0, Math.PI / 2]}>
          <Sandbag position={[0, 0, 0]} color={tone > 0.6 ? "#8a7a4e" : tone > 0.3 ? "#a0905e" : "#94844e"} />
        </group>,
      );
    }
  }
  return <group>{bags}</group>;
};

export const Duckboard: React.FC<{ position: Vec3; length?: number }> = ({ position, length = 3 }) => (
  <group position={position}>
    {[-0.22, 0.22].map((x) => (
      <InkBox key={x} size={[0.05, 0.05, length]} position={[x, 0.025, 0]} color="#4a3a24" ink={0.004} />
    ))}
    {Array.from({ length: Math.floor(length / 0.14) }, (_, i) => (
      <InkBox key={i} size={[0.56, 0.025, 0.09]} position={[0, 0.06, -length / 2 + 0.07 + i * 0.14]} color={i % 3 ? "#6a5434" : "#5a4a2e"} ink={0.003} />
    ))}
  </group>
);

// A yellow-green gas cloud rolling in over the parapet: flat cel puffs drifting along +x and sinking.
export const GasCloud: React.FC<{ frame: number; x0: number; x1: number; y: number; z: number; count?: number; amount?: number }> = ({ frame, x0, x1, y, z, count = 16, amount = 1 }) => (
  <group userData={{ ghost: true, noInk: true }}>
    {Array.from({ length: count }, (_, i) => {
      const span = x1 - x0;
      const x = x0 + ((rnd(i, 2) * span + frame * 0.006 * (0.7 + rnd(i, 3) * 0.6)) % span);
      const s = (0.25 + rnd(i, 4) * 0.35) * amount;
      return (
        <mesh key={i} position={[x, y + rnd(i, 5) * 0.4 - 0.05 * Math.sin(frame * 0.03 + i), z + rnd(i, 6) * 0.6]} scale={[s * 1.4, s, s]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshToonMaterial color={i % 3 ? "#b4c470" : "#9cb060"} gradientMap={toonRamp} transparent opacity={0.55} depthWrite={false} />
        </mesh>
      );
    })}
  </group>
);

export const BarbedWire: React.FC<{ x0: number; x1: number; y: number; z: number }> = ({ x0, x1, y, z }) => (
  <group>
    {Array.from({ length: Math.floor((x1 - x0) / 0.9) + 1 }, (_, i) => (
      <Stick key={i} a={[x0 + i * 0.9, y - 0.05, z]} b={[x0 + i * 0.9 + 0.05, y + 0.45, z]} radius={0.018} color="#4a3a2a" />
    ))}
    {[0.15, 0.3].map((h) => (
      <mesh key={h} position={[(x0 + x1) / 2, y + h, z + 0.02]}>
        <boxGeometry args={[x1 - x0, 0.008, 0.008]} />
        <meshBasicMaterial color="#2a2a2a" />
      </mesh>
    ))}
  </group>
);

// ---------- the road today ----------

const roadCanvas = () =>
  canvasTexture(256, 512, (ctx) => {
    ctx.fillStyle = "#54585e";
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = rnd(i, 1) > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.07)";
      ctx.fillRect(rnd(i, 2) * 256, rnd(i, 3) * 512, 4, 4);
    }
    ctx.fillStyle = "#f0f0e8";
    ctx.fillRect(122, 0, 12, 220);
  });

// The road runs along z (the car drives toward +z, the road scrolls toward -z by `scroll` metres): asphalt with a
// dashed centre line, grass verges, poplars and hills going past.
export const RoadToday: React.FC<{ scroll: number }> = ({ scroll }) => {
  const tex = useOwned(() => {
    const t = roadCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 6);
    return t;
  }, []);
  tex.offset.set(0, -scroll / 5);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, -4]}>
        <planeGeometry args={[3.4, 30]} />
        <meshToonMaterial map={tex} gradientMap={toonRamp} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} rotation={[-Math.PI / 2, 0, 0]} position={[s * 1.74, 0.005, -4]}>
          <planeGeometry args={[0.08, 30]} />
          <meshBasicMaterial color="#e8e8e0" />
        </mesh>
      ))}
      {Array.from({ length: 14 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const z = 4 - ((i * 2.3 + scroll) % 32);
        const x = side * (2.6 + rnd(i, 3) * 1.2);
        const h = 1.6 + rnd(i, 4) * 0.8;
        return (
          <group key={i} position={[x, 0, z]}>
            <InkCylinder radius={0.06} height={0.5} position={[0, 0.25, 0]} color="#5a4030" ink={0.005} />
            <mesh position={[0, 0.5 + h / 2, 0]} scale={[0.4, h / 2, 0.4]} castShadow>
              <sphereGeometry args={[1, 12, 10]} />
              <meshToonMaterial color={i % 3 ? "#4a8a4a" : "#3a7a44"} gradientMap={toonRamp} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// A present-day car seen from the front, in its own frame (front toward +z, the driver on the left at x = -0.32).
// The windscreen (`SCREEN`) carries the web; `screenPoint(u, v)` is a point on it in the car frame.
export const SCREEN = { c: [0, 1.0, 0.24] as Vec3, a: -0.94, w: 1.28, h: 0.78 };
export const screenPoint = (u: number, v: number, lift = 0): Vec3 => {
  const cy = Math.cos(SCREEN.a);
  const sy = Math.sin(SCREEN.a);
  // local (u, v, lift) rotated about x by a
  return [SCREEN.c[0] + u, SCREEN.c[1] + v * cy - lift * sy, SCREEN.c[2] + v * sy + lift * cy];
};
export const CAR_SEAT_Y = 0.35;
export const ModernCar: React.FC<{ position: Vec3; color?: string; web?: Crack3[]; crack?: number; bounce?: number }> = ({ position, color = "#d8dee4", web, crack = 0, bounce = 0 }) => (
  <group position={position}>
    {[-1, 1].flatMap((sx) =>
      [1.2, -1.2].map((z) => <InkCylinder key={`${sx}${z}`} radius={0.27} height={0.2} position={[sx * 0.72, 0.27, z]} rotation={[0, 0, Math.PI / 2]} color="#1e1e22" ink={0.008} />),
    )}
    <group position={[0, bounce, 0]}>
      {/* lower body, bonnet, roof */}
      <InkBox size={[1.6, 0.42, 3.4]} position={[0, 0.52, 0]} color={color} ink={0.014} />
      <InkBox size={[1.56, 0.1, 1.0]} position={[0, 0.76, 1.15]} rotation={[0.08, 0, 0]} color={color} ink={0.01} />
      <InkBox size={[1.3, 0.07, 1.0]} position={[0, 1.33, -0.55]} color={color} ink={0.01} />
      {/* pillars */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Stick a={[s * 0.68, 0.74, 0.6]} b={[s * 0.64, 1.32, -0.08]} radius={0.04} color={color} ink={0.006} />
          <Stick a={[s * 0.68, 0.74, -1.3]} b={[s * 0.64, 1.32, -1.0]} radius={0.05} color={color} ink={0.006} />
          {/* wing mirror */}
          <InkBox size={[0.16, 0.1, 0.06]} position={[s * 0.86, 0.86, 0.5]} color="#2a2a30" ink={0.004} />
          {/* headlight */}
          <InkBox size={[0.34, 0.1, 0.03]} position={[s * 0.52, 0.6, 1.71]} color="#f4f6f0" ink={0.004} />
        </group>
      ))}
      <InkBox size={[0.7, 0.14, 0.03]} position={[0, 0.48, 1.71]} color="#2a2e34" ink={0.004} />
      {/* bonnet lines: the crease down the middle and the seam under the windscreen */}
      {[-0.22, 0.22].map((x) => (
        <InkBox key={x} size={[0.012, 0.012, 0.95]} position={[x, 0.82, 1.15]} rotation={[0.08, 0, 0]} color="#7a2420" ink={0} />
      ))}
      <InkBox size={[1.5, 0.02, 0.03]} position={[0, 0.8, 0.62]} color="#1e1e22" ink={0} />
      {/* the dark cabin behind the windscreen (seat backs, rear), so the web reads */}
      <InkBox size={[1.3, 0.62, 0.06]} position={[0, 0.95, -0.75]} color="#2a2e36" ink={0.004} />
      {/* dashboard and steering wheel */}
      <InkBox size={[1.4, 0.12, 0.3]} position={[0, 0.76, 0.42]} color="#2a2a2e" ink={0.006} />
      <mesh position={[-0.32, 0.7, 0.3]} rotation={[-0.5, 0, 0]}>
        <torusGeometry args={[0.15, 0.022, 8, 24]} />
        <meshToonMaterial color="#1a1a1e" gradientMap={toonRamp} />
      </mesh>
      {/* the windscreen */}
      <group position={SCREEN.c} rotation={[SCREEN.a, 0, 0]}>
        <Pane size={[SCREEN.w, SCREEN.h]} clear={0.72} color="#bfe0ec" web={web} crack={crack} thick={0.01} width={0.008} maxD={0.6} streaks={false} />
      </group>
    </group>
  </group>
);

export const Stone: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position} userData={{ ghost: true }}>
    <mesh>
      <dodecahedronGeometry args={[0.03, 0]} />
      <meshToonMaterial color="#8a8478" gradientMap={toonRamp} />
    </mesh>
    <mesh scale={1.25}>
      <dodecahedronGeometry args={[0.03, 0]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

void GLASS_DARK;
