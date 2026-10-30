import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "./CasinoSet";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import { makeBillTexture } from "./textures";

// Three more locations, each with its own dominant colour: ATM corner (teal), casino exterior at night
// (purple neon), and the slot maker's design lab (blueprint blue).

const BLOCK_FONT = "Arial Black, Impact, sans-serif";
const INK = "#161212";

const canvasTexture = (w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d")!);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};

const Plane: React.FC<{ map: THREE.Texture; size: [number, number]; position: [number, number, number]; rotation?: [number, number, number]; transparent?: boolean }> = ({
  map,
  size,
  position,
  rotation = [0, 0, 0],
  transparent,
}) => (
  <mesh position={position} rotation={rotation}>
    <planeGeometry args={size} />
    <meshBasicMaterial map={map} toneMapped={false} transparent={transparent} />
  </mesh>
);

const Floor: React.FC<{ color: string }> = ({ color }) => (
  <mesh rotation={[-Math.PI / 2, 0, 0]}>
    <planeGeometry args={[20, 20]} />
    <meshToonMaterial color={color} gradientMap={toonRamp} />
  </mesh>
);

// ---------- ATM corner ----------

export const AtmSet: React.FC<{ camera: CameraShot; frame: number; cash?: number }> = ({ camera, frame, cash }) => {
  const screen = useMemo(
    () =>
      canvasTexture(512, 320, (ctx) => {
        ctx.fillStyle = "#0b2a1c";
        ctx.fillRect(0, 0, 512, 320);
        ctx.fillStyle = "#4dff9a";
        ctx.font = `900 54px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("WITHDRAW", 256, 120);
        ctx.font = `900 96px ${BLOCK_FONT}`;
        ctx.fillText("$100", 256, 240);
      }),
    [],
  );
  const sign = useMemo(
    () =>
      canvasTexture(512, 160, (ctx) => {
        ctx.fillStyle = "#0d2b2a";
        ctx.fillRect(0, 0, 512, 160);
        ctx.shadowColor = "#4dff9a";
        ctx.shadowBlur = 24;
        ctx.fillStyle = "#b9ffd7";
        ctx.font = `900 110px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("ATM", 256, 86);
      }),
    [],
  );
  const bill = useMemo(makeBillTexture, []);
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#08292b"]} />
      <fog attach="fog" args={["#08292b", 3, 9]} />
      <ambientLight intensity={1.6} color="#d9fff6" />
      <directionalLight position={[-2, 3, 4]} intensity={2.2} color="#ffffff" />
      <pointLight position={[0.35, 1.9, 0.6]} intensity={4} distance={4} color="#7dffc4" />
      <Floor color="#1c5c5f" />
      <mesh position={[0, 2, -0.6]}>
        <planeGeometry args={[12, 4]} />
        <meshToonMaterial color="#2aa198" gradientMap={toonRamp} />
      </mesh>
      {[-1.6, -0.9, 1.4, 2.1].map((x) => (
        <InkBox key={x} size={[0.04, 4, 0.04]} position={[x, 2, -0.58]} color="#1f7f78" ink={0} />
      ))}
      {/* The machine */}
      <InkBox size={[0.8, 1.6, 0.5]} position={[0.35, 0.8, -0.3]} color="#c9d2d6" />
      <InkBox size={[0.62, 0.42, 0.04]} position={[0.35, 1.25, -0.04]} color="#2c3a40" />
      <Plane map={screen} size={[0.52, 0.32]} position={[0.35, 1.25, -0.015]} />
      {Array.from({ length: 12 }, (_, i) => (
        <InkBox
          key={i}
          size={[0.06, 0.04, 0.03]}
          position={[0.25 + (i % 3) * 0.1, 1.0 - Math.floor(i / 3) * 0.06, -0.03]}
          color={i === 11 ? "#3ccf6e" : i === 9 ? "#e04646" : "#eef2f4"}
          ink={0.005}
        />
      ))}
      <InkBox size={[0.36, 0.04, 0.06]} position={[0.35, 0.7, -0.03]} color="#161616" />
      <InkBox size={[0.3, 0.012, 0.01]} position={[0.35, 0.7, 0.0]} color={blink ? "#4dff9a" : "#1c6b3e"} ink={0} />
      {cash !== undefined &&
        [0, 1, 2].map((k) => (
          <mesh key={k} position={[0.35 + k * 0.006, 0.705 + k * 0.004, -0.02 + Math.min(1, cash * (1 + k * 0.15)) * 0.14]} rotation={[-Math.PI / 2, 0, 0.04 * k]}>
            <planeGeometry args={[0.16, 0.08]} />
            <meshBasicMaterial map={bill} side={THREE.DoubleSide} />
          </mesh>
        ))}
      <InkBox size={[0.6, 0.18, 0.06]} position={[0.35, 1.75, -0.04]} color="#0d2b2a" />
      <Plane map={sign} size={[0.56, 0.16]} position={[0.35, 1.75, -0.005]} />
      {/* Plant for scale */}
      <InkCylinder radius={0.14} height={0.3} position={[-0.75, 0.15, -0.2]} color="#c97a3a" />
      <mesh position={[-0.75, 0.52, -0.2]}>
        <sphereGeometry args={[0.24, 24, 24]} />
        <meshToonMaterial color="#3fae5a" gradientMap={toonRamp} />
      </mesh>
    </>
  );
};

// ---------- Casino exterior at night ----------

export const ExteriorSet: React.FC<{ camera: CameraShot; frame: number }> = ({ camera, frame }) => {
  const neon = useMemo(
    () =>
      canvasTexture(1024, 360, (ctx) => {
        ctx.clearRect(0, 0, 1024, 360);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        for (const [text, y, size, color] of [
          ["LUCKY 7s", 140, 170, "#ff4fd8"],
          ["CASINO", 290, 96, "#4ff3ff"],
        ] as const) {
          ctx.font = `900 ${size}px ${BLOCK_FONT}`;
          ctx.shadowColor = color;
          ctx.shadowBlur = 40;
          ctx.strokeStyle = color;
          ctx.lineWidth = 14;
          ctx.strokeText(text, 512, y);
          ctx.shadowBlur = 0;
          ctx.fillStyle = "#fff6ff";
          ctx.fillText(text, 512, y);
        }
      }),
    [],
  );
  const sky = useMemo(
    () =>
      canvasTexture(256, 512, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, "#14062b");
        g.addColorStop(0.65, "#4a1670");
        g.addColorStop(1, "#ff6fa5");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 512);
        ctx.fillStyle = "#ffffff";
        for (let i = 0; i < 70; i++) ctx.fillRect((i * 97) % 256, (i * 53) % 300, 2, 2);
      }),
    [],
  );
  // The neon buzzes: a brief dip every couple of seconds.
  const flicker = frame % 47 < 2 ? 0.45 : 1;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#14062b"]} />
      <ambientLight intensity={1.0} color="#c8a8ff" />
      <directionalLight position={[2, 3, 4]} intensity={1.4} color="#ffb8ec" />
      <pointLight position={[0, 2.4, 0.6]} intensity={6 * flicker} distance={5} color="#ff4fd8" />
      <pointLight position={[1.7, 2.2, 0.8]} intensity={4} distance={4} color="#ffd27a" />
      <Plane map={sky} size={[30, 14]} position={[0, 5, -6]} />
      <mesh position={[-3.5, 6.2, -5.9]}>
        <circleGeometry args={[0.8, 48]} />
        <meshBasicMaterial color="#fff3d6" toneMapped={false} />
      </mesh>
      <Floor color="#3d2a55" />
      <mesh position={[0, 0.002, 2.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20, 2.4]} />
        <meshToonMaterial color="#231735" gradientMap={toonRamp} />
      </mesh>
      {/* Facade, glowing doors and the neon sign */}
      <InkBox size={[7, 3.4, 0.4]} position={[0, 1.7, -1.2]} color="#3b1f5c" />
      <mesh position={[0, 0.95, -0.99]}>
        <planeGeometry args={[1.3, 1.9]} />
        <meshBasicMaterial color="#ffd27a" toneMapped={false} />
      </mesh>
      <InkBox size={[0.06, 1.9, 0.06]} position={[0, 0.95, -0.97]} color="#2a163f" ink={0} />
      <InkBox size={[1.5, 0.12, 0.12]} position={[0, 1.95, -0.95]} color="#2a163f" />
      <mesh position={[0, 2.75, -0.97]}>
        <planeGeometry args={[3.0, 1.05]} />
        <meshBasicMaterial map={neon} transparent opacity={flicker} toneMapped={false} />
      </mesh>
      {/* Street lamp */}
      <InkCylinder radius={0.04} height={2.6} position={[1.8, 1.3, 0.9]} color="#2a1f3a" ink={0.01} />
      <mesh position={[1.8, 2.65, 0.9]}>
        <sphereGeometry args={[0.13, 20, 20]} />
        <meshBasicMaterial color="#ffe6a8" toneMapped={false} />
      </mesh>
    </>
  );
};

// ---------- The slot maker's design lab ----------

const dialTexture = (label: string, danger: boolean) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#f4f1e8";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    const a0 = Math.PI * 0.75;
    const a1 = Math.PI * 2.25;
    if (danger) {
      ctx.strokeStyle = "#e0262f";
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.arc(256, 256, 196, a0 + (a1 - a0) * 0.7, a1);
      ctx.stroke();
    }
    ctx.strokeStyle = INK;
    for (let i = 0; i <= 10; i++) {
      const a = a0 + ((a1 - a0) * i) / 10;
      ctx.lineWidth = i % 5 ? 6 : 12;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 220, 256 + Math.sin(a) * 220);
      ctx.lineTo(256 + Math.cos(a) * (i % 5 ? 180 : 160), 256 + Math.sin(a) * (i % 5 ? 180 : 160));
      ctx.stroke();
    }
    ctx.fillStyle = INK;
    ctx.font = `900 54px ${BLOCK_FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(label, 256, 430);
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(256, 256, 248, 0, Math.PI * 2);
    ctx.stroke();
  });

// value 0..1 maps onto the 270-degree scale; the dial faces +y in its own frame.
const Dial: React.FC<{ x: number; label: string; danger: boolean; value: number; pop?: number }> = ({ x, label, danger, value, pop }) => {
  const face = useMemo(() => {
    const t = dialTexture(label, danger);
    // Cylinder caps map the canvas sideways; turn it so the label reads upright.
    t.center.set(0.5, 0.5);
    t.rotation = Math.PI / 2;
    return t;
  }, [label, danger]);
  const angle = -(Math.PI * 0.75 + Math.PI * 1.5 * value) + Math.PI / 2;
  const p = pop ?? 0;
  return (
    <group position={[x, 0.98, 0.28]} rotation={[0.35, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.24, 0.24, 0.03, 48]} />
        <meshToonMaterial attach="material-0" color="#9aa7b4" gradientMap={toonRamp} />
        <meshBasicMaterial attach="material-1" map={face} toneMapped={false} />
        <meshToonMaterial attach="material-2" color="#9aa7b4" gradientMap={toonRamp} />
      </mesh>
      {/* Knob with a pointer; when it pops it flies up and spins away */}
      <group position={[0, 0.06 + p * 1.4 - p * p * 0.9, p * 0.5]} rotation={[p * 7, angle - p * 9, 0]}>
        <InkCylinder radius={0.075} height={0.08} color={danger ? "#e0262f" : "#2c3a40"} ink={0.01} />
        <InkBox size={[0.02, 0.012, 0.16]} position={[0, 0.045, 0.06]} color="#ffffff" ink={0.004} />
      </group>
    </group>
  );
};

export const LabSet: React.FC<{ camera: CameraShot; frame: number; jackpot: number; nearMiss: number; pop?: number }> = ({
  camera,
  frame,
  jackpot,
  nearMiss,
  pop,
}) => {
  const grid = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#1d4fa8";
        ctx.fillRect(0, 0, 512, 512);
        ctx.strokeStyle = "#ffffff33";
        ctx.lineWidth = 2;
        for (let i = 0; i <= 512; i += 32) {
          ctx.beginPath();
          ctx.moveTo(i, 0);
          ctx.lineTo(i, 512);
          ctx.moveTo(0, i);
          ctx.lineTo(512, i);
          ctx.stroke();
        }
        ctx.strokeStyle = "#ffffffaa";
        ctx.lineWidth = 4;
        ctx.strokeRect(80, 120, 200, 260);
        ctx.beginPath();
        ctx.arc(380, 200, 70, 0, Math.PI * 2);
        ctx.stroke();
      }),
    [],
  );
  useMemo(() => {
    grid.wrapS = grid.wrapT = THREE.RepeatWrapping;
    grid.repeat.set(4, 2);
  }, [grid]);
  const alarm = nearMiss > 0.85 && Math.floor(frame / 5) % 2 === 0;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#0e2a5e"]} />
      <ambientLight intensity={1.7} color="#eaf2ff" />
      <directionalLight position={[-1, 4, 4]} intensity={2.2} color="#ffffff" />
      <pointLight position={[0.6, 1.8, 0.8]} intensity={alarm ? 6 : 0} distance={3} color="#ff3030" />
      <Floor color="#d8e0ea" />
      <mesh position={[0, 2, -1.0]}>
        <planeGeometry args={[12, 4]} />
        <meshBasicMaterial map={grid} toneMapped={false} />
      </mesh>
      {/* Console */}
      <InkBox size={[2.0, 0.86, 0.6]} position={[0, 0.43, 0.2]} color="#e6ecf2" />
      <InkBox size={[2.0, 0.06, 0.56]} position={[0, 0.92, 0.24]} rotation={[0.35, 0, 0]} color="#c4cfda" />
      <Dial x={-0.5} label="JACKPOT" danger={false} value={jackpot} />
      <Dial x={0.5} label="NEAR MISS" danger value={nearMiss} pop={pop} />
      <mesh position={[0.95, 1.08, 0.12]}>
        <sphereGeometry args={[0.07, 20, 20]} />
        <meshBasicMaterial color={alarm ? "#ff3030" : "#5a1414"} toneMapped={false} />
      </mesh>
    </>
  );
};
