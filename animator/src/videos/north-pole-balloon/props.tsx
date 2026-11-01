import React from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp } from "../../engine";
import { useOwned } from "../../three/BalloonSets";

// Story props for "The North Pole Expedition Lost for 33 Years": Strindberg's box camera, the film tin, the diary,
// the developing tray with the print coming up, and the drying line of prints.

type Vec3 = [number, number, number];
const INK = "#161212";

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// Strindberg's wooden box camera with a brass lens (drawn ~2x size so it reads). Lens faces +z.
// `click` 0..1 drops the shutter lever.
export const BoxCamera: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number; click?: number }> = ({ position, rotation = [0, 0, 0], scale = 1, click = 0 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkBox size={[0.26, 0.2, 0.3]} color="#6a4428" ink={0.012} />
    <InkBox size={[0.27, 0.03, 0.31]} position={[0, 0.06, 0]} color="#3a2414" ink={0} />
    <InkCylinder radius={0.06} height={0.07} position={[0, 0, 0.18]} rotation={[Math.PI / 2, 0, 0]} color="#c8a040" ink={0.008} />
    <mesh position={[0, 0, 0.217]}>
      <circleGeometry args={[0.042, 24]} />
      <meshBasicMaterial color="#1a2a3a" />
    </mesh>
    <mesh position={[0.015, 0.015, 0.218]}>
      <circleGeometry args={[0.012, 12]} />
      <meshBasicMaterial color="#cfe6ff" />
    </mesh>
    {/* shutter lever on the side */}
    <group position={[0.14, 0.05, 0.08]} rotation={[0, 0, -0.5 - click * 0.9]}>
      <InkBox size={[0.02, 0.09, 0.02]} position={[0, 0.045, 0]} color="#c8a040" ink={0.005} />
    </group>
    {/* leather strap */}
    <mesh position={[0, 0.12, 0]} rotation={[0, Math.PI / 2, 0]}>
      <torusGeometry args={[0.12, 0.01, 4, 16, Math.PI]} />
      <meshBasicMaterial color="#2a1a10" />
    </mesh>
  </group>
);

// A dented tin film box with its lid (`open` 0..1 lifts it) and a FILM label.
export const FilmTin: React.FC<{ position: Vec3; open?: number; rotationY?: number }> = ({ position, open = 0, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.32, 0.12, 0.22]} position={[0, 0.06, 0]} color="#8a8a80" ink={0.01} />
    <group position={[0, 0.125, -0.11]} rotation={[-open * 1.6, 0, 0]}>
      <InkBox size={[0.33, 0.025, 0.23]} position={[0, 0, 0.115]} color="#7a7a70" ink={0.01} />
    </group>
    {/* rust */}
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} position={[-0.12 + rand(i) * 0.24, 0.03 + rand(i + 1) * 0.07, 0.111]}>
        <circleGeometry args={[0.012 + rand(i + 2) * 0.02, 10]} />
        <meshBasicMaterial color="#8a4a24" />
      </mesh>
    ))}
    {open > 0.3 &&
      [-0.08, 0.0, 0.08].map((x) => (
        <InkCylinder key={x} radius={0.035} height={0.09} position={[x, 0.08, 0]} color="#2a2420" ink={0.006} />
      ))}
    <Label text="FILM" position={[0, 0.06, 0.115]} width={0.2} />
  </group>
);

// An open diary lying on the snow, pages lifting in the wind (`frame`), handwriting lines.
const pageCanvas = () =>
  canvasTexture(256, 320, (ctx) => {
    ctx.fillStyle = "#efe4c8";
    ctx.fillRect(0, 0, 256, 320);
    ctx.strokeStyle = "rgba(40,40,80,0.75)";
    ctx.lineWidth = 3;
    for (let y = 30; y < 300; y += 22) {
      ctx.beginPath();
      ctx.moveTo(20, y);
      let x = 20;
      while (x < 236) {
        const w = 10 + rand(x * y) * 26;
        ctx.quadraticCurveTo(x + w / 2, y - 6 + rand(x + y) * 8, x + w, y);
        x += w + 6;
        ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(120,90,50,0.25)";
    ctx.beginPath();
    ctx.ellipse(190, 250, 40, 26, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
export const Diary: React.FC<{ position: Vec3; frame: number; rotationY?: number; scale?: number }> = ({ position, frame, rotationY = 0, scale = 1 }) => {
  const page = useOwned(() => pageCanvas());
  const flip = (Math.sin(frame * 0.18) * 0.5 + 0.5) * 2.4;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <InkBox size={[0.5, 0.03, 0.34]} position={[0, 0.015, 0]} color="#5a2a1a" ink={0.008} />
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.034, 0]} rotation={[-Math.PI / 2, 0, s * 0.03]}>
          <planeGeometry args={[0.23, 0.31]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={page} />
        </mesh>
      ))}
      {/* the page lifting in the wind */}
      <group position={[0, 0.036, 0]} rotation={[0, 0, flip]}>
        <mesh position={[0.115, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.23, 0.31]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={page} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
};

// The print: Strindberg's photo of the Eagle down on the floe, in grey tones (painted in the kit's flat style).
export const photoCanvas = () =>
  canvasTexture(640, 480, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, "#b8b4ac");
    g.addColorStop(0.55, "#dcd8d0");
    g.addColorStop(0.62, "#ece8e0");
    g.addColorStop(1, "#d4d0c8");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 640, 480);
    // the envelope
    ctx.fillStyle = "#3a3632";
    ctx.beginPath();
    ctx.ellipse(440, 270, 120, 112, 0, Math.PI, 0);
    ctx.lineTo(560, 300);
    ctx.lineTo(320, 300);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.ellipse(400, 210, 34, 50, -0.3, 0, Math.PI * 2);
    ctx.fill();
    // net lines to the basket
    ctx.strokeStyle = "#2a2622";
    ctx.lineWidth = 2;
    for (let i = 0; i < 7; i++) {
      ctx.beginPath();
      ctx.moveTo(330 + i * 4, 220 + i * 10);
      ctx.lineTo(190, 290);
      ctx.stroke();
    }
    ctx.fillStyle = "#2a2622";
    ctx.fillRect(160, 276, 40, 22);
    // two small men
    for (const x of [222, 240]) {
      ctx.fillRect(x, 268, 7, 26);
      ctx.beginPath();
      ctx.arc(x + 3.5, 264, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // grain, scratches, vignette
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.08)";
      ctx.fillRect(rand(i + 1) * 640, rand(i + 2) * 480, 2, 2);
    }
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      const x = rand(i + 50) * 640;
      ctx.moveTo(x, 0);
      ctx.lineTo(x + 20, 480);
      ctx.stroke();
    }
    const v = ctx.createRadialGradient(320, 240, 160, 320, 240, 420);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, 640, 480);
  });

// A print on a plane, `develop` 0..1 brings the image up out of blank paper (as in the developer).
export const Print: React.FC<{ position: Vec3; rotation?: Vec3; size?: number; develop?: number }> = ({ position, rotation = [0, 0, 0], size = 0.4, develop = 1 }) => {
  const photo = useOwned(() => photoCanvas());
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[size * 1.12, size * 0.84 + size * 0.12]} />
        <meshBasicMaterial color="#f4f0e6" side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={[size, size * 0.75]} />
        <meshBasicMaterial map={photo} transparent opacity={develop} />
      </mesh>
      <mesh position={[0, 0, -0.002]}>
        <planeGeometry args={[size * 1.14, size * 0.98]} />
        <meshBasicMaterial color={INK} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

// The developing tray on the bench: shallow enamel tray, liquid, the print in it (ripples as it's rocked).
export const DevTray: React.FC<{ position: Vec3; frame: number; develop: number }> = ({ position, frame, develop }) => (
  <group position={position} rotation={[Math.sin(frame * 0.12) * 0.03, 0, 0]}>
    <InkBox size={[0.7, 0.08, 0.55]} position={[0, 0.04, 0]} color="#e8e4dc" ink={0.012} />
    <mesh position={[0, 0.082, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[0.64, 0.49]} />
      <meshBasicMaterial color="#3a1a1a" />
    </mesh>
    <Print position={[0, 0.086, 0]} rotation={[-Math.PI / 2, 0, 0]} size={0.5} develop={develop} />
    <mesh position={[0.1, 0.088, 0.05]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.05 + ((frame * 0.006) % 0.15), 0.06 + ((frame * 0.006) % 0.15), 32]} />
      <meshBasicMaterial color="#ff8a7a" transparent opacity={0.35} />
    </mesh>
  </group>
);

// A drying line strung across the darkroom with prints pegged on it.
export const PrintLine: React.FC<{ y: number; z: number; from: number; to: number; frame: number }> = ({ y, z, from, to, frame }) => {
  const n = Math.round((to - from) / 0.42);
  return (
    <group>
      <mesh position={[(from + to) / 2, y, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.006, 0.006, to - from, 4]} />
        <meshBasicMaterial color="#2a2020" />
      </mesh>
      {Array.from({ length: n }, (_, i) => (
        <group key={i} position={[from + 0.21 + i * 0.42, y - 0.16, z]} rotation={[0, 0, Math.sin(frame * 0.05 + i) * 0.04]}>
          <InkBox size={[0.03, 0.06, 0.02]} position={[0, 0.15, 0.01]} color="#c8a878" ink={0.004} />
          <Print position={[0, 0, 0]} size={0.3} develop={1} />
        </group>
      ))}
    </group>
  );
};
