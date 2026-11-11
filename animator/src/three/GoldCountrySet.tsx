import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Foliage } from "./kit";
import { Pine, Rock } from "./LakeSet";
import { InkCylinder, toonRamp } from "./toon";
import { SkyDome } from "./sky";
import { useImage } from "./WesternTownSet";
import type { PuppetLight } from "../puppet/PuppetBillboard";
import { rand } from "../engine/helpers";

// California gold country (Sierra Nevada foothills), 1870s-80s: a rutted dirt stage road runs along x (z within
// ±ROAD.half) through dry golden grass, valley oaks, a few pines, rocks and brush. Beyond: the Codex-painted rolling
// hills and the far Sierra (public/backdrops/goldcountry/), in front of a sky dome. Modes: `day` (high summer sun from
// the left) and `dusk` (low sun behind the hills, red sky). Light puppets with `goldLight(mode)`.

type Vec3 = [number, number, number];
export type GoldMode = "day" | "dusk";
export const ROAD = { half: 1.3 };
export const GOLD_BG: Record<GoldMode, string> = { day: "#5a8ad0", dusk: "#4a1a2a" };

export const goldLight = (mode: GoldMode): PuppetLight =>
  mode === "day"
    ? { tint: "#fff2d8", shadow: 0.14, distant: [{ direction: [-0.6, 0.8, 0.4], color: "#fff0d0", strength: 1.2 }] }
    : { tint: "#ffb090", tintAmount: 0.1, shadow: 0.32, distant: [{ direction: [0.3, 0.15, -1], color: "#ff8a4a", strength: 2.2 }, { direction: [-0.3, 0.5, 1], color: "#8a6ad0", strength: 0.45 }] };

const grassCanvas = (dusk: boolean) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = dusk ? "#a8703a" : "#d8aa52";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 80; i++) {
      ctx.fillStyle = rand(i) > 0.5 ? "rgba(150,100,40,0.25)" : "rgba(240,200,110,0.3)";
      ctx.beginPath();
      ctx.ellipse(rand(i + 3) * 1024, rand(i + 400) * 1024, 40 + rand(i + 9) * 70, 20 + rand(i + 11) * 40, rand(i + 2) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 9000; i++) {
      const v = rand(i + 900);
      ctx.strokeStyle = v > 0.7 ? "#f0cc78" : v > 0.4 ? "#b88a3e" : v > 0.15 ? "#c89a4a" : "#8a6a32";
      ctx.lineWidth = 2;
      const x = rand(i) * 1024, y = rand(i + 7000) * 1024;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rand(i + 5) - 0.5) * 6, y - 10 - rand(i + 6) * 10);
      ctx.stroke();
    }
  });

const roadCanvas = () =>
  canvasTexture(2048, 512, (ctx) => {
    ctx.fillStyle = "#b08a5e";
    ctx.fillRect(0, 0, 2048, 512);
    for (const cy of [170, 340]) {
      for (let x = 0; x < 2048; x += 4) {
        const y = cy + Math.sin(x * 0.003 + cy) * 10;
        ctx.fillStyle = "rgba(110,76,48,0.22)";
        ctx.fillRect(x, y - 22, 4, 44);
        ctx.fillStyle = "rgba(90,60,38,0.25)";
        ctx.fillRect(x, y - 8, 4, 16);
      }
    }
    for (let i = 0; i < 1500; i++) {
      const v = rand(i + 50);
      ctx.fillStyle = v > 0.6 ? "rgba(80,56,36,0.5)" : "rgba(230,200,150,0.45)";
      ctx.fillRect(rand(i) * 2048, rand(i + 3000) * 512, 2 + rand(i + 1) * 5, 2 + rand(i + 2) * 4);
    }
    // soft grassy edges
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "rgba(200,160,80,0.9)");
    g.addColorStop(0.12, "rgba(200,160,80,0)");
    g.addColorStop(0.88, "rgba(200,160,80,0)");
    g.addColorStop(1, "rgba(200,160,80,0.9)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 2048, 512);
  });

// A valley oak: a short thick trunk and a wide, low crown of green clumps.
export const Oak: React.FC<{ position: Vec3; scale?: number; seed?: number; dusk?: boolean }> = ({ position, scale = 1, seed = 1, dusk }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.14} height={1.3} position={[0, 0.65, 0]} color="#4a3626" ink={0.02} />
    <Foliage position={[0, 1.05, 0]} size={2.4} color={dusk ? "#3a4a2a" : "#5a7a32"} seed={seed} />
  </group>
);

// Dry grass tufts scattered off the road (instanced).
const Tufts: React.FC<{ dusk: boolean }> = ({ dusk }) => {
  const mesh = useMemo(() => {
    const g = new THREE.ConeGeometry(0.05, 0.22, 4);
    g.translate(0, 0.11, 0);
    const m = new THREE.MeshToonMaterial({ color: dusk ? "#9a6a34" : "#e0b45a", gradientMap: toonRamp });
    const n = 1400;
    const im = new THREE.InstancedMesh(g, m, n);
    const o = new THREE.Object3D();
    let k = 0;
    for (let i = 0; k < n && i < n * 3; i++) {
      const x = (rand(i) - 0.5) * 40;
      const z = 4 - rand(i + 999) * 30;
      if (Math.abs(z) < ROAD.half + 0.2) continue;
      o.position.set(x, 0, z);
      o.rotation.set((rand(i + 5) - 0.5) * 0.4, rand(i + 6) * 3, (rand(i + 7) - 0.5) * 0.4);
      o.scale.setScalar(0.6 + rand(i + 8) * 0.9);
      o.updateMatrix();
      im.setMatrixAt(k++, o.matrix);
    }
    im.count = k;
    return im;
  }, [dusk]);
  return <primitive object={mesh} />;
};

export const GoldCountrySet: React.FC<{ camera: CameraShot; frame: number; mode?: GoldMode; children?: React.ReactNode }> = ({ camera, mode = "day", children }) => {
  const dusk = mode === "dusk";
  const camX = camera.position[0];
  const grass = useMemo(() => {
    const t = grassCanvas(dusk);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 12);
    return t;
  }, [dusk]);
  const road = useMemo(() => {
    const t = roadCanvas();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
  }, []);
  const hills = useImage(dusk ? "backdrops/goldcountry/hills_dusk.png" : "backdrops/goldcountry/hills_day.png");
  // mirror-repeat the painting sideways so the plane is wide enough that its edges never show
  if (hills && hills.wrapS !== THREE.MirroredRepeatWrapping) {
    hills.wrapS = THREE.MirroredRepeatWrapping;
    hills.repeat.set(180 / 90, 1);
    hills.offset.set(-(180 / 90 - 1) / 2, 0);
    hills.needsUpdate = true;
  }
  const sunDir: Vec3 = dusk ? [0.15, 0.1, -1] : [-6, 9, 5];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[dusk ? "#c0503a" : "#9cc4ec"]} />
      <fog attach="fog" args={[dusk ? "#c8664a" : "#cfe0ee", 22, 85]} />
      <ambientLight intensity={dusk ? 0.85 : 1.15} color={dusk ? "#ffc0a0" : "#ffffff"} />
      <hemisphereLight args={[dusk ? "#a070c0" : "#cfe4ff", dusk ? "#7a3a20" : "#8a7a3a", 0.55]} />
      <directionalLight
        position={dusk ? [2, 2.6, -30] : [-6, 9, 5]}
        intensity={dusk ? 2.6 : 2.4}
        color={dusk ? "#ff9a5a" : "#fff2dc"}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-near={1}
        shadow-camera-far={70}
      />
      <group position={camera.position}>
        <SkyDome sun={sunDir} stops={dusk ? [[-0.1, "#ffb060"], [0.05, "#ff6a3a"], [0.2, "#d0384a"], [0.5, "#8a1e48"], [1, "#6a1840"]] : [[-0.1, "#cfe6f8"], [0.05, "#6aa8ee"], [0.2, "#2a7ae6"], [0.5, "#1f6fe0"], [1, "#1a62d8"]]} />
      </group>
      {hills && (
        // the painting's grass line (92 % down) on the ground, 80 m out
        <mesh position={[camX * 0.8, 60 * 0.42, -80]} renderOrder={-8}>
          <planeGeometry args={[180, 60]} />
          <meshBasicMaterial map={hills} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      {/* ground and road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -30]} receiveShadow>
        <planeGeometry args={[120, 100]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={grass} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[60, ROAD.half * 2 + 0.6]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={road} transparent />
      </mesh>
      <Tufts dusk={dusk} />
      {/* trees, rocks and brush along the road */}
      <Oak position={[-5.5, 0, -4.5]} scale={1.2} seed={3} dusk={dusk} />
      <Oak position={[4.8, 0, -6.5]} scale={1.4} seed={7} dusk={dusk} />
      <Oak position={[9.5, 0, -3.2]} seed={11} dusk={dusk} />
      <Oak position={[-11, 0, -9]} scale={1.6} seed={13} dusk={dusk} />
      <Pine position={[-2.6, 0, -9]} scale={1.6} color={dusk ? "#2a3a2a" : "#2f5a3a"} />
      <Pine position={[1.6, 0, -12]} scale={2.0} color={dusk ? "#2a3a2a" : "#2f5a3a"} />
      <Pine position={[7.5, 0, -14]} scale={1.8} color={dusk ? "#2a3a2a" : "#2f5a3a"} />
      <Rock position={[-3.2, 0, -2.4]} size={0.7} color={dusk ? "#6a4a4a" : "#9a8a78"} seed={2} />
      <Rock position={[-3.0, 0, 3.4]} size={0.5} color={dusk ? "#6a4a4a" : "#9a8a78"} seed={5} />
      <Rock position={[-7, 0, 2.2]} size={0.9} color={dusk ? "#6a4a4a" : "#9a8a78"} seed={9} />
      {[
        [-1.6, -2.2], [2.4, -2.4], [6.2, -2.0], [-4.6, 2.3], [5.4, 2.8], [-8.5, -2.6],
      ].map(([x, z], i) => (
        <Foliage key={i} position={[x, 0, z]} size={0.9 + rand(i) * 0.5} color={dusk ? "#7a6a3a" : "#7a8a3a"} seed={20 + i} />
      ))}
      {children}
    </>
  );
};
