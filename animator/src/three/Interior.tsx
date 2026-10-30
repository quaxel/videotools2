import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "./CasinoSet";
import { InkBox, InkCylinder, toonRamp } from "./toon";
import {
  makeDisplayTexture,
  makeLabelTexture,
  makeReelTexture,
  makeStripTexture,
  makeWheelTexture,
  NEAR_MISS_ROWS,
  STRIP,
  STRIP_HEIGHT_PX,
  VIRTUAL_ROWS,
} from "./textures";

// Paper strip geometry, shared with the scene so cameras can aim at a given row.
const STRIP_W = 0.6;
const STRIP_H = (STRIP_W * STRIP_HEIGHT_PX) / STRIP.width;
const STRIP_TOP = 2.2;
export const stripRowY = (row: number) => STRIP_TOP - ((STRIP.header + (row + 0.5) * STRIP.rowH) / STRIP_HEIGHT_PX) * STRIP_H;
export const STRIP_HEADER_Y = STRIP_TOP - (STRIP.header / 2 / STRIP_HEIGHT_PX) * STRIP_H;

const Label: React.FC<{ text: string; position: [number, number, number]; size: [number, number]; fg: string; bg: string }> = ({
  text,
  position,
  size,
  fg,
  bg,
}) => {
  const tex = useMemo(() => makeLabelTexture(text, fg, bg), [text, fg, bg]);
  return (
    <mesh position={position}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

// Inside the cabinet: reel unit on top, the RNG board, and the virtual reel strip.
export const InteriorStrip: React.FC<{
  frame: number;
  camera: CameraShot;
  reelSpin: number;
  stamps: number;
  highlight: boolean;
  stampPress?: number; // 0..1 while the stamp is coming down
}> = ({ frame, camera, reelSpin, stamps, highlight, stampPress }) => {
  const reelTex = useMemo(makeReelTexture, []);
  const stripTex = useMemo(() => makeStripTexture(stamps, highlight), [stamps, highlight]);
  const tallyTex = useMemo(() => makeDisplayTexture("NEAR MISS", `x${stamps}`), [stamps]);
  const ledOn = Math.floor(frame / 3) % 2 === 0;
  const stampRow = NEAR_MISS_ROWS[Math.min(stamps, NEAR_MISS_ROWS.length - 1)];

  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#24110a"]} />
      <ambientLight intensity={1.7} color="#ffd9b0" />
      <pointLight position={[0.3, 2.6, 1.4]} intensity={7} distance={6} color="#ffb070" />
      <directionalLight position={[-1, 3, 4]} intensity={1.6} color="#fff1dc" />

      {/* Cabinet walls */}
      <mesh position={[0, 1.2, -0.25]}>
        <planeGeometry args={[3, 5]} />
        <meshToonMaterial color="#6b3d1c" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[0.08, 5, 0.6]} position={[-0.95, 1.2, 0]} color="#8a4f24" />
      <InkBox size={[0.08, 5, 0.6]} position={[0.95, 1.2, 0]} color="#8a4f24" />

      {/* Reel unit, seen from inside, still spinning */}
      {[-0.24, 0, 0.24].map((x, i) => (
        <group key={x} position={[x, 2.6, -0.02]} rotation={[reelSpin * (1 + i * 0.15), 0, 0]}>
          <mesh rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.3, 0.3, 0.2, 48]} />
            <meshToonMaterial map={reelTex} gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      <InkBox size={[0.86, 0.06, 0.5]} position={[0, 2.25, -0.02]} color="#3a3a3a" />

      {/* RNG board with a blinking LED */}
      <InkBox size={[0.5, 0.42, 0.04]} position={[-0.6, 1.8, -0.1]} color="#1f7a3a" />
      <InkBox size={[0.22, 0.22, 0.05]} position={[-0.6, 1.8, -0.05]} color="#151515" ink={0.01} />
      <Label text="RNG" position={[-0.6, 1.8, -0.02]} size={[0.18, 0.06]} fg="#ffffff" bg="#151515" />
      <mesh position={[-0.43, 1.96, -0.06]}>
        <sphereGeometry args={[0.022, 12, 12]} />
        <meshBasicMaterial color={ledOn ? "#39ff7a" : "#0d4020"} toneMapped={false} />
      </mesh>
      {[-0.74, -0.68, -0.52, -0.46].map((x) => (
        <InkBox key={x} size={[0.03, 0.08, 0.02]} position={[x, 1.64, -0.07]} color="#c8a24a" ink={0.006} />
      ))}

      {/* The virtual reel strip */}
      <mesh position={[0, STRIP_TOP - STRIP_H / 2, 0.02]}>
        <planeGeometry args={[STRIP_W, STRIP_H]} />
        <meshBasicMaterial map={stripTex} toneMapped={false} />
      </mesh>

      {/* Near-miss tally beside the jackpot row */}
      <InkBox size={[0.3, 0.11, 0.04]} position={[0.55, stripRowY(29), 0.0]} color="#120606" ink={0.01} />
      <mesh position={[0.55, stripRowY(29), 0.022]}>
        <planeGeometry args={[0.28, 0.078]} />
        <meshBasicMaterial map={tallyTex} toneMapped={false} />
      </mesh>

      {/* Rubber stamp coming down on the next row */}
      {stampPress !== undefined && (
        <group position={[0.17, stripRowY(stampRow), 0.05 + 0.22 * (1 - stampPress)]}>
          <InkBox size={[0.2, 0.06, 0.04]} position={[0, 0, 0]} color="#d62828" ink={0.008} />
          <InkCylinder radius={0.03} height={0.14} position={[0, 0, 0.09]} rotation={[Math.PI / 2, 0, 0]} color="#a0662e" ink={0.008} />
          <mesh position={[0, 0, 0.17]}>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshToonMaterial color="#a0662e" gradientMap={toonRamp} />
          </mesh>
        </group>
      )}
    </>
  );
};

const WHEEL_STEP = (Math.PI * 2) / VIRTUAL_ROWS;
// Mesh rotation that brings slice k under the pointer at the top.
export const wheelAngleFor = (slice: number) => Math.PI + slice * WHEEL_STEP;

const CYAN = "#4fd6ff";

const WireBox: React.FC<{ size: [number, number, number]; position: [number, number, number] }> = ({ size, position }) => {
  // size is a new array literal every render; key on its values so the geometry is built once
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(...size)), [size[0], size[1], size[2]]);
  return (
    <lineSegments position={position} geometry={edges}>
      <lineBasicMaterial color={CYAN} transparent opacity={0.85} />
    </lineSegments>
  );
};

// X-ray view: the machine as a cyan wireframe, a weighted prize wheel where the reels' odds live.
export const XrayWheel: React.FC<{ frame: number; camera: CameraShot; wheel: number; nearMisses: number }> = ({
  frame,
  camera,
  wheel,
  nearMisses,
}) => {
  const wheelTex = useMemo(makeWheelTexture, []);
  const tallyTex = useMemo(() => makeDisplayTexture("NEAR MISSES", `x${nearMisses}`), [nearMisses]);
  const grid = useMemo(() => new THREE.GridHelper(12, 48, "#1f5a8a", "#123458"), []);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#08142e"]} />
      <ambientLight intensity={2.2} color="#ffffff" />
      <primitive object={grid} />

      {/* Cabinet outline */}
      <WireBox size={[1.0, 0.95, 0.7]} position={[0, 0.475, 0]} />
      <WireBox size={[1.0, 0.7, 0.7]} position={[0, 1.3, 0]} />
      <WireBox size={[1.04, 0.46, 0.5]} position={[0, 1.9, 0]} />
      <WireBox size={[0.76, 0.52, 0.04]} position={[0, 1.2, 0.36]} />
      {[-0.24, 0, 0.24].map((x) => (
        <mesh key={x} position={[x, 1.2, 0.04]} rotation={[frame * 0.02, 0, -Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 0.2, 20, 1, true]} />
          <meshBasicMaterial color={CYAN} wireframe transparent opacity={0.35} />
        </mesh>
      ))}

      {/* Tally where the reel window would be */}
      <mesh position={[0, 1.2, 0.38]}>
        <planeGeometry args={[0.6, 0.17]} />
        <meshBasicMaterial map={tallyTex} toneMapped={false} />
      </mesh>

      {/* The weighted wheel */}
      <group position={[0, 0.5, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh rotation={[0, wheel, 0]}>
          <cylinderGeometry args={[0.38, 0.38, 0.03, 96]} />
          <meshBasicMaterial attach="material-0" color="#3a1a1a" />
          <meshBasicMaterial attach="material-1" map={wheelTex} toneMapped={false} />
          <meshBasicMaterial attach="material-2" color="#3a1a1a" />
        </mesh>
      </group>
      {/* Pointer */}
      <mesh position={[0, 0.5 + 0.42, 0.26]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.04, 0.09, 3]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} />
      </mesh>
    </>
  );
};
