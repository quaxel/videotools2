import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot, canvasTexture, PuppetLight, SkyDome, Vec3 } from "../../engine";
import { rnd } from "../pisces-sign/props";
import { Ball, Cap, CoffeeMug, Cyl, Drumstick, frac, Hydrant, Mailbox, PizzaSlice, RBox, ScentRibbon, Sock, SockPile, StinkLines, WheelieBin } from "./props";

// Sets for "You Wake Up With a Dog's Nose", in a Pixar look (guide/references/suburb-street.md): rounded, bevelled
// forms with smooth shading and no ink, warm bounce light, light shafts with dust motes, haze, dense dressing.
// Bedroom (morning), the neighbour's kitchen, the suburban street (morning, golden, dusk, night) and a nose-vision
// void where smells float.

const INK = "#161212";
const FONT = "'Arial Black', Impact, sans-serif";

// ---------- building blocks ----------

export const useOwnedGeo = <T extends THREE.BufferGeometry>(make: () => T, deps: unknown[]) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps);
  useEffect(() => () => g.dispose(), [g]);
  return g;
};
export const useOwnedTex = (make: () => THREE.Texture, deps: unknown[] = []) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps);
  useEffect(() => () => t.dispose(), [t]);
  return t;
};

// A shaft of light: two crossed additive planes fading from the source down to the floor.
export const LightShaft: React.FC<{ from: Vec3; to: Vec3; width: number; color?: string; opacity?: number }> = ({ from, to, width, color = "#ffe2a8", opacity = 0.35 }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(128, 256, (ctx) => {
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, "rgba(255,255,255,0.95)");
      g.addColorStop(0.6, "rgba(255,255,255,0.35)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 128, 256);
      const h = ctx.createLinearGradient(0, 0, 128, 0);
      h.addColorStop(0, "rgba(0,0,0,1)");
      h.addColorStop(0.25, "rgba(0,0,0,0)");
      h.addColorStop(0.75, "rgba(0,0,0,0)");
      h.addColorStop(1, "rgba(0,0,0,1)");
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = h;
      ctx.fillRect(0, 0, 128, 256);
    }),
  );
  const a = new THREE.Vector3(...from);
  const b = new THREE.Vector3(...to);
  const len = a.distanceTo(b);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), b.clone().sub(a).normalize());
  return (
    <group position={from} quaternion={q} userData={{ ghost: true }}>
      {[0, Math.PI / 2].map((ry) => (
        <mesh key={ry} position={[0, -len / 2, 0]} rotation={[0, ry, 0]} renderOrder={5}>
          <planeGeometry args={[width, len]} />
          <meshBasicMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// Dust motes drifting in a box (in light shafts, over the street at golden hour).
export const Motes: React.FC<{ center: Vec3; size: Vec3; f: number; count?: number; color?: string; r?: number }> = ({ center, size, f, count = 40, color = "#fff1c8", r = 0.006 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const x = center[0] + (rnd(i) - 0.5) * size[0] + Math.sin(f * 0.02 + i) * 0.05;
      const y = center[1] + (frac(rnd(i + 50) + f * 0.0015 * (0.5 + rnd(i + 9))) - 0.5) * size[1];
      const z = center[2] + (rnd(i + 99) - 0.5) * size[2] + Math.cos(f * 0.017 + i) * 0.05;
      const tw = 0.6 + 0.4 * Math.sin(f * 0.2 + i * 3);
      return <Ball key={i} position={[x, y, z]} radius={r * (0.6 + rnd(i + 3))} color={new THREE.Color(color).multiplyScalar(1.3 * tw).getStyle()} glow />;
    })}
  </group>
);

// Canvas textures (painted, never photos)
export const planks = (base: string, seed: number) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let row = 0; row < 8; row++) {
      let x = -rnd(row + seed) * 400;
      while (x < 1024) {
        const w = 260 + rnd(x + row * 13 + seed) * 300;
        const v = rnd(row * 31 + x + seed);
        ctx.fillStyle = `rgba(${v > 0.5 ? "255,240,220" : "90,50,20"},${0.08 + rnd(x + row) * 0.1})`;
        ctx.fillRect(x, row * 128, w, 128);
        for (let g = 0; g < 6; g++) {
          ctx.strokeStyle = "rgba(90,50,20,0.12)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          const gy = row * 128 + 15 + g * 18 + rnd(g + x) * 8;
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + w * 0.3, gy + 6, x + w * 0.6, gy - 6, x + w, gy);
          ctx.stroke();
        }
        ctx.fillStyle = "rgba(60,30,10,0.35)";
        ctx.fillRect(x, row * 128, 4, 128);
        x += w;
      }
      ctx.fillStyle = "rgba(60,30,10,0.4)";
      ctx.fillRect(0, row * 128, 1024, 5);
    }
  });

export const wallpaper = (base: string, dot: string) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    ctx.fillStyle = dot;
    for (let y = 0; y < 8; y++)
      for (let x = 0; x < 8; x++) {
        const cx = x * 64 + (y % 2) * 32 + 16;
        const cy = y * 64 + 32;
        ctx.beginPath();
        // little stars
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
          const rr = k % 2 ? 5 : 12;
          ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
        }
        ctx.fill();
      }
  });

const tiles = (base: string, grout: string, n = 8) =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, 512, 512);
    const s = 512 / n;
    for (let y = 0; y < n; y++)
      for (let x = 0; x < n; x++) {
        const v = rnd(x * 7 + y * 13);
        ctx.fillStyle = base;
        ctx.globalAlpha = 0.85 + v * 0.15;
        ctx.beginPath();
        ctx.roundRect(x * s + 3, y * s + 3, s - 6, s - 6, 6);
        ctx.fill();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(x * s + 8, y * s + 8, s * 0.35, 5);
        ctx.globalAlpha = 1;
      }
  });

const grassTex = (a: string, b: string, c: string) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = a;
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? `${b}55` : `${c}44`;
      ctx.beginPath();
      ctx.ellipse(rnd(i + 3) * 1024, rnd(i + 7) * 1024, 40 + rnd(i + 1) * 90, 30 + rnd(i + 2) * 60, rnd(i + 4) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 12000; i++) {
      const x = rnd(i * 1.3) * 1024;
      const y = rnd(i * 2.7 + 5) * 1024;
      ctx.strokeStyle = rnd(i + 11) > 0.5 ? b : c;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (rnd(i + 3) - 0.5) * 6, y - 8 - rnd(i) * 8);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  });

const slabs = () =>
  canvasTexture(1024, 512, (ctx) => {
    ctx.fillStyle = "#d9d2c4";
    ctx.fillRect(0, 0, 1024, 512);
    for (let i = 0; i < 3000; i++) {
      ctx.fillStyle = rnd(i) > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(80,70,60,0.1)";
      ctx.fillRect(rnd(i + 1) * 1024, rnd(i + 2) * 512, 3, 3);
    }
    for (let x = 0; x <= 1024; x += 256) {
      ctx.fillStyle = "rgba(70,60,50,0.55)";
      ctx.fillRect(x - 3, 0, 6, 512);
    }
    ctx.fillRect(0, 254, 1024, 5);
    // a crack and a few stains
    ctx.strokeStyle = "rgba(60,50,40,0.45)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(600, 40);
    ctx.lineTo(640, 120);
    ctx.lineTo(620, 200);
    ctx.stroke();
  });

const asphalt = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#4a4a52";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 9000; i++) {
      const v = rnd(i);
      ctx.fillStyle = v > 0.6 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(rnd(i + 1) * 1024, rnd(i + 2) * 1024, 2 + v * 3, 2 + v * 3);
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = "rgba(20,20,26,0.25)";
      ctx.beginPath();
      ctx.ellipse(rnd(i + 70) * 1024, rnd(i + 80) * 1024, 120, 50, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// ---------- lights ----------

export const Lights: React.FC<{ camera: CameraShot; sun: Vec3; sunColor: string; sunK: number; sky: string; ground: string; hemiK: number; ambient?: number; box?: number }> = ({
  camera,
  sun,
  sunColor,
  sunK,
  sky,
  ground,
  hemiK,
  ambient = 0.25,
  box = 7,
}) => {
  const t = camera.target;
  const target = useMemo(() => new THREE.Object3D(), []);
  target.position.set(t[0], 0, t[2]);
  target.updateMatrixWorld();
  return (
    <>
      <ambientLight intensity={ambient} />
      <hemisphereLight args={[sky, ground, hemiK]} />
      <primitive object={target} />
      <directionalLight
        position={[t[0] + sun[0], sun[1], t[2] + sun[2]]}
        target={target}
        intensity={sunK}
        color={sunColor}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0003}
        shadow-normalBias={0.03}
        shadow-radius={6}
        shadow-camera-left={-box}
        shadow-camera-right={box}
        shadow-camera-top={box}
        shadow-camera-bottom={-box}
        shadow-camera-near={0.5}
        shadow-camera-far={60}
      />
    </>
  );
};

// ---------- bedroom ----------

export const BED = { x: -0.75, z: -1.45, top: 0.56 }; // mattress top height; headboard against the back wall
export const SOCKS: Vec3 = [0.55, 0, 0.35];
export const DESK: Vec3 = [1.45, 0, -1.9];
export const bedroomLight = (): PuppetLight => ({
  tint: "#fff1e0",
  shadow: 0.14,
  distant: [{ direction: [-0.5, 0.6, -0.4], color: "#ffd9a0", strength: 1.3 }],
});

// A cosy, messy teen bedroom on a sunny morning: lilac star wallpaper, plank floor, a window with a sun shaft and
// dust, unmade bed, clothes rail, desk with an open pizza box and a mug, posters, fairy lights, the sock pile.
export const BedroomSet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode; socks?: boolean; shaft?: boolean; paw?: boolean; hang?: boolean }> = ({ camera, f, children, socks = true, shaft = true, paw = true, hang = true }) => {
  const floor = useOwnedTex(() => {
    const t = planks("#c98f5a", 3);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 3);
    return t;
  });
  const paper = useOwnedTex(() => {
    const t = wallpaper("#b9a3e3", "#cdb9f2");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(5, 2.6);
    return t;
  });
  const duvet = useOwnedTex(() => {
    const t = canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = "#ff9f6b";
      ctx.fillRect(0, 0, 512, 512);
      ctx.fillStyle = "#ffd36b";
      for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        ctx.arc(rnd(i) * 512, rnd(i + 4) * 512, 14 + rnd(i + 2) * 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.strokeStyle = "#e8744a";
      ctx.lineWidth = 6;
      for (let x = 0; x < 512; x += 128) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 512);
        ctx.stroke();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  });
  const W = 5.4;
  const back = -2.6;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#2a1f3a"]} />
      <fog attach="fog" args={["#e9c9b8", 9, 22]} />
      <Lights camera={camera} sun={[-2.5, 4.5, -6]} sunColor="#ffd59a" sunK={1.45} sky="#ffe7d0" ground="#a2705a" hemiK={0.9} ambient={0.32} box={5} />
      {/* warm bounce off the floor and a cool fill from the room */}
      <pointLight position={[0.2, 0.4, 0.6]} intensity={1.4} distance={5} color="#ffb98a" />
      <pointLight position={[1.8, 2.3, 1.8]} intensity={1.1} distance={6} color="#b7a8ff" />
      {/* floor, walls, skirting */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[W * 2, 9]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
      <RBox size={[W, 3.2, 0.12]} position={[0, 1.6, back]} color="#ffffff" map={paper} radius={0.01} rough={0.9} />
      <RBox size={[0.12, 3.2, 6]} position={[-W / 2, 1.6, back + 3]} color="#ffffff" map={paper} radius={0.01} rough={0.9} />
      <RBox size={[0.12, 3.2, 6]} position={[W / 2, 1.6, back + 3]} color="#ffffff" map={paper} radius={0.01} rough={0.9} />
      <RBox size={[W, 0.12, 0.05]} position={[0, 0.06, back + 0.08]} color="#fff6ea" radius={0.015} />
      <RBox size={[W, 0.06, 0.04]} position={[0, 1.0, back + 0.08]} color="#fff6ea" radius={0.015} />
      {/* rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.35, 0.006, -0.2]} receiveShadow>
        <circleGeometry args={[1.05, 48]} />
        <meshStandardMaterial color="#4fb3a6" roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.35, 0.008, -0.2]}>
        <ringGeometry args={[0.8, 0.9, 48]} />
        <meshStandardMaterial color="#f2e6c9" roughness={1} />
      </mesh>
      {/* window on the back wall, right of the bed, with sky, a tree outside and curtains */}
      <group position={[0.55, 1.65, back + 0.07]}>
        <RBox size={[1.2, 1.25, 0.08]} position={[0, 0, 0]} color="#fff6ea" radius={0.03} />
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.04, 1.1]} />
          <meshBasicMaterial color={new THREE.Color("#bfe6ff").multiplyScalar(1.25)} toneMapped={false} />
        </mesh>
        <Ball position={[0.25, -0.2, 0.05]} radius={0.3} color={new THREE.Color("#8fd16a").multiplyScalar(1.15).getStyle()} glow scale={[1, 0.8, 0.05]} />
        <Ball position={[-0.3, -0.35, 0.05]} radius={0.22} color={new THREE.Color("#ffd8a8").multiplyScalar(1.15).getStyle()} glow scale={[1.2, 0.6, 0.05]} />
        <RBox size={[0.05, 1.12, 0.06]} position={[0, 0, 0.07]} color="#fff6ea" radius={0.01} />
        <RBox size={[1.06, 0.05, 0.06]} position={[0, 0, 0.07]} color="#fff6ea" radius={0.01} />
        <RBox size={[1.4, 0.07, 0.2]} position={[0, -0.66, 0.1]} color="#fff6ea" radius={0.02} />
        {/* a cactus and a little robot on the sill */}
        <Cap a={[0.4, -0.6, 0.12]} b={[0.4, -0.45, 0.12]} r={0.035} color="#4fa860" />
        <Cyl r={0.05} r2={0.06} h={0.07} position={[0.4, -0.6, 0.12]} color="#e86f4a" />
        <RBox size={[0.09, 0.11, 0.08]} position={[-0.4, -0.57, 0.12]} color="#8fb8de" radius={0.02} />
        {/* curtains: soft folds */}
        {[-1, 1].map((s) =>
          Array.from({ length: 4 }, (_, i) => <Cap key={`${s}${i}`} a={[s * (0.62 + i * 0.06), 0.66, 0.16]} b={[s * (0.66 + i * 0.07), -0.75, 0.2 + (i % 2) * 0.03]} r={0.05} color={i % 2 ? "#ff7f8f" : "#ff94a2"} />),
        )}
        <Cyl r={0.02} h={1.9} position={[0, 0.7, 0.18]} rotation={[0, 0, Math.PI / 2]} color="#c99a5a" />
      </group>
      {shaft && <LightShaft from={[0.55, 1.75, back + 0.1]} to={[0.0, 0.0, -0.9]} width={1.0} color="#ffd9a0" opacity={0.2} />}
      <Motes center={[0.3, 1.0, -1.2]} size={[1.2, 1.8, 1.6]} f={f} count={45} />
      {/* bed */}
      <group position={[BED.x, 0, BED.z]}>
        <RBox size={[1.45, 0.3, 2.1]} position={[0, 0.18, 0]} color="#7a4b2f" radius={0.05} />
        <RBox size={[1.5, 0.95, 0.12]} position={[0, 0.6, -1.05]} color="#8a5634" radius={0.06} />
        <RBox size={[1.36, 0.22, 2.0]} position={[0, 0.42, 0.02]} color="#fff8ee" radius={0.08} />
        <RBox size={[1.5, 0.16, 1.4]} position={[0.02, 0.58, 0.32]} rotation={[0.04, 0.05, -0.03]} color="#ffffff" map={duvet} radius={0.08} rough={0.9} />
        {/* duvet bunched and hanging off the side */}
        {hang && <Cap a={[0.62, 0.55, 1.0]} b={[0.78, 0.15, 0.6]} r={0.12} color="#ff9f6b" />}
        <RBox size={[0.6, 0.18, 0.38]} position={[-0.3, 0.6, -0.72]} rotation={[0.2, 0.1, 0.05]} color="#fff2d6" radius={0.09} rough={0.9} />
        <RBox size={[0.55, 0.16, 0.36]} position={[0.34, 0.6, -0.78]} rotation={[0.25, -0.2, -0.1]} color="#c8e7ff" radius={0.08} rough={0.9} />
        {/* plush dog on the bed */}
        <Ball position={[0.45, 0.72, -0.5]} radius={0.08} color="#d9a066" />
        <Ball position={[0.45, 0.85, -0.47]} radius={0.065} color="#d9a066" />
      </group>
      {/* bedside table and lamp + an alarm clock */}
      <group position={[-1.95, 0, -2.2]}>
        <RBox size={[0.5, 0.55, 0.4]} position={[0, 0.28, 0]} color="#5fb0d8" radius={0.04} />
        <Cyl r={0.05} r2={0.07} h={0.25} position={[0.08, 0.68, 0]} color="#ffdc7a" />
        <Cyl r={0.15} r2={0.1} h={0.18} position={[0.08, 0.88, 0]} color="#fff3c8" emissive="#ffd27a" k={0.3} />
        <pointLight position={[0.08, 0.85, 0.2]} intensity={0.7} distance={2} color="#ffcf8a" />
        <RBox size={[0.14, 0.12, 0.07]} position={[-0.12, 0.62, 0.05]} color="#e0453a" radius={0.03} />
      </group>
      {/* desk with the pizza box and mug; posters above */}
      <group position={DESK}>
        <RBox size={[1.3, 0.06, 0.6]} position={[0, 0.74, 0]} color="#4f9fd8" radius={0.025} />
        {[-0.6, 0.6].map((x) => (
          <RBox key={x} size={[0.06, 0.72, 0.56]} position={[x, 0.36, 0]} color="#3f86c0" radius={0.02} />
        ))}
        <PizzaBox position={[-0.2, 0.775, 0.02]} f={f} />
        <CoffeeMug position={[0.4, 0.775, 0.08]} scale={1.1} />
        {["#e0453a", "#ffd23f", "#3aa65a", "#8a5ad8"].map((c, i) => (
          <RBox key={c} size={[0.05, 0.24 - i * 0.02, 0.18]} position={[-0.55 + i * 0.055, 0.89 - i * 0.01, -0.15]} rotation={[0, 0, i === 3 ? 0.25 : 0]} color={c} radius={0.01} />
        ))}
        <Cyl r={0.04} h={0.12} position={[0.15, 0.83, -0.18]} color="#ff8a5a" />
        {[0, 1, 2].map((k) => (
          <Cyl key={k} r={0.006} h={0.16} position={[0.13 + k * 0.02, 0.92, -0.18]} rotation={[0, 0, (k - 1) * 0.2]} color={["#ffd23f", "#2f6fd8", "#e0453a"][k]} />
        ))}
        <RBox size={[0.36, 0.26, 0.03]} position={[0.32, 1.05, -0.2]} rotation={[-0.15, 0, 0]} color="#30333d" radius={0.015} />
        <mesh position={[0.32, 1.055, -0.18]} rotation={[-0.15, 0, 0]}>
          <planeGeometry args={[0.32, 0.21]} />
          <meshBasicMaterial color={new THREE.Color("#8fd3ff").multiplyScalar(1.1)} toneMapped={false} />
        </mesh>
      </group>
      <Poster position={[1.6, 1.9, back + 0.08]} kind="rocket" />
      {paw && <Poster position={[-0.75, 2.05, back + 0.08]} kind="paw" />}
      <FairyLights from={[-2.4, 2.6, back + 0.12]} to={[2.4, 2.55, back + 0.12]} f={f} />
      {/* clothes rail at the left wall */}
      <group position={[-2.2, 0, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <Cyl r={0.018} h={1.1} position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} color="#d8d8dd" rough={0.3} />
        {[-0.5, 0.5].map((x) => (
          <Cyl key={x} r={0.02} h={1.55} position={[x, 0.78, 0]} color="#d8d8dd" rough={0.3} />
        ))}
        {["#ffcc4d", "#4f86f7", "#ff6f91", "#6ad19a", "#ffffff"].map((c, i) => (
          <RBox key={c} size={[0.06, 0.62, 0.42]} position={[-0.36 + i * 0.18, 1.2, 0]} rotation={[0, 0, (rnd(i) - 0.5) * 0.15]} color={c} radius={0.03} rough={0.95} />
        ))}
      </group>
      {/* laundry heap and a t-shirt on the floor */}
      <RBox size={[0.5, 0.05, 0.4]} position={[1.4, 0.03, -0.6]} rotation={[0, 0.5, 0]} color="#4f86f7" radius={0.025} rough={0.95} />
      {socks && <SockPile position={SOCKS} f={f} />}
      {children}
    </>
  );
};

const PizzaBox: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    <RBox size={[0.46, 0.05, 0.46]} position={[0, 0.025, 0]} color="#d9b27a" radius={0.008} />
    <group position={[0, 0.05, -0.23]} rotation={[-1.9, 0, 0]}>
      <RBox size={[0.46, 0.012, 0.46]} position={[0, 0, 0.23]} color="#e2c08c" radius={0.004} />
    </group>
    {/* grease spots, a red-check napkin, a cheese string */}
    {[[-0.12, 0.1], [0.14, -0.12], [0.05, 0.15]].map(([x, z], i) => (
      <mesh key={i} position={[x, 0.052, z]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.035 + i * 0.01, 20]} />
        <meshStandardMaterial color="#b88a4a" roughness={0.3} transparent opacity={0.6} />
      </mesh>
    ))}
    <Napkin position={[0.36, 0.002, 0.12]} />
    {/* the last slice on its greasy paper, crust at the back, a little mould and stink */}
    <mesh position={[0, 0.055, 0.02]} rotation={[-Math.PI / 2, 0, 0.1]}>
      <circleGeometry args={[0.2, 24]} />
      <meshStandardMaterial color="#f2e6c8" roughness={0.4} />
    </mesh>
    <PizzaSlice position={[0.0, 0.07, 0.07]} rotation={[-Math.PI / 2, 0, Math.PI + 0.15]} scale={1.3} bite />
    {[[-0.04, 0.03], [0.05, -0.02], [0.0, 0.1]].map(([x, z], i) => (
      <Ball key={i} position={[x, 0.112, z]} radius={0.012} color="#7a9a3a" scale={[1, 0.3, 1]} />
    ))}
    <StinkLines at={[0.0, 0.12, 0.05]} f={f} color="#c8e05a" count={2} height={0.3} spread={0.12} />
    <ScentRibbon points={[[0.02, 0.09, 0.04], [0.2, 0.25, 0.0], [0.45, 0.42, -0.08], [0.75, 0.62, -0.1]]} f={f} color="#ff6a2a" radius={0.03} sparkles={4} glowK={0.4} />
  </group>
);

const Napkin: React.FC<{ position: Vec3 }> = ({ position }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = "rgba(220,40,50,0.75)";
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(i * 16, 0, 8, 128);
        ctx.fillRect(0, i * 16, 128, 8);
      }
    }),
  );
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0.4]} receiveShadow>
      <planeGeometry args={[0.24, 0.24]} />
      <meshStandardMaterial map={tex} roughness={0.9} />
    </mesh>
  );
};

const Poster: React.FC<{ position: Vec3; kind: "rocket" | "paw" }> = ({ position, kind }) => {
  const tex = useOwnedTex(
    () =>
      canvasTexture(256, 340, (ctx) => {
        ctx.fillStyle = kind === "rocket" ? "#263a78" : "#ffd23f";
        ctx.fillRect(0, 0, 256, 340);
        if (kind === "rocket") {
          ctx.fillStyle = "#ffffff";
          for (let i = 0; i < 40; i++) ctx.fillRect(rnd(i) * 256, rnd(i + 5) * 340, 3, 3);
          ctx.fillStyle = "#ff6b4a";
          ctx.beginPath();
          ctx.moveTo(128, 50);
          ctx.quadraticCurveTo(180, 140, 160, 230);
          ctx.lineTo(96, 230);
          ctx.quadraticCurveTo(76, 140, 128, 50);
          ctx.fill();
          ctx.fillStyle = "#8fd3ff";
          ctx.beginPath();
          ctx.arc(128, 140, 22, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffd23f";
          ctx.beginPath();
          ctx.moveTo(100, 235);
          ctx.lineTo(128, 300);
          ctx.lineTo(156, 235);
          ctx.fill();
        } else {
          ctx.fillStyle = "#e0453a";
          ctx.font = `900 64px ${FONT}`;
          ctx.textAlign = "center";
          ctx.fillText("GOOD", 128, 90);
          ctx.fillText("BOY", 128, 160);
          ctx.fillStyle = INK;
          ctx.beginPath();
          ctx.ellipse(128, 255, 46, 38, 0, 0, Math.PI * 2);
          ctx.fill();
          [-50, -18, 18, 50].forEach((dx, i) => {
            ctx.beginPath();
            ctx.ellipse(128 + dx, 205 - (i === 1 || i === 2 ? 18 : 0), 15, 20, 0, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      }),
    [kind],
  );
  return (
    <group position={position} rotation={[0, 0, kind === "rocket" ? 0.04 : -0.05]}>
      <mesh>
        <planeGeometry args={[0.5, 0.66]} />
        <meshStandardMaterial map={tex} roughness={0.8} />
      </mesh>
    </group>
  );
};

const FairyLights: React.FC<{ from: Vec3; to: Vec3; f: number; count?: number }> = ({ from, to, f, count = 18 }) => (
  <group>
    {Array.from({ length: count }, (_, i) => {
      const u = i / (count - 1);
      const sag = Math.sin(u * Math.PI * 3) * 0.08 - 0.06;
      const c = ["#ffd36b", "#ff8fb1", "#8fe3ff", "#b6ff8a"][i % 4];
      const tw = 0.85 + 0.25 * Math.sin(f * 0.15 + i * 1.7);
      return <Ball key={i} position={[from[0] + (to[0] - from[0]) * u, from[1] + (to[1] - from[1]) * u + sag, from[2]]} radius={0.025} color={new THREE.Color(c).multiplyScalar(1.6 * tw).getStyle()} glow />;
    })}
  </group>
);

// ---------- the neighbour's kitchen ----------

export const STOVE: Vec3 = [0.1, 0, -1.55];
export const kitchenLight = (): PuppetLight => ({
  tint: "#fff3d8",
  shadow: 0.12,
  distant: [{ direction: [0.6, 0.7, 0.3], color: "#ffe6a0", strength: 0.6 }],
  points: [{ position: [STOVE[0], 1.0, STOVE[2] + 0.3], color: "#ffb36b", strength: 0.5, range: 1.4 }],
});

// A sunny butter-yellow kitchen: mint retro fridge, tiled backsplash, stove with a pan of sizzling eggs and bacon,
// toaster, coffee machine with steam, a window over the sink with plants and a sun shaft, hanging copper pans.
export const KitchenSet: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode }> = ({ camera, f, children }) => {
  const tile = useOwnedTex(() => {
    const t = tiles("#ffffff", "#9fd8d0", 6);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 1.2);
    return t;
  });
  const floor = useOwnedTex(() => {
    const t = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#f4efe2";
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = "#e2574c";
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillRect(128, 128, 128, 128);
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(10, 8);
    return t;
  });
  const back = -2.1;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#ffe9a8"]} />
      <fog attach="fog" args={["#ffe9b8", 8, 20]} />
      <Lights camera={camera} sun={[-3, 5, 2]} sunColor="#fff0c8" sunK={1.6} sky="#fff6dc" ground="#e0a070" hemiK={0.85} ambient={0.28} box={4} />
      <pointLight position={[0, 2.2, 0.5]} intensity={1.2} distance={6} color="#ffd9a0" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[10, 8]} />
        <meshStandardMaterial map={floor} roughness={0.35} />
      </mesh>
      <RBox size={[6, 3.2, 0.12]} position={[0, 1.6, back]} color="#ffd65a" radius={0.01} rough={0.9} />
      <RBox size={[0.12, 3.2, 5]} position={[-2.6, 1.6, back + 2.5]} color="#ffcf4a" radius={0.01} rough={0.9} />
      <mesh position={[0.4, 1.3, back + 0.07]}>
        <planeGeometry args={[3.6, 0.7]} />
        <meshStandardMaterial map={tile} roughness={0.25} />
      </mesh>
      {/* counter run */}
      <RBox size={[3.8, 0.86, 0.62]} position={[0.4, 0.43, back + 0.36]} color="#3aa6a0" radius={0.04} />
      <RBox size={[3.9, 0.06, 0.68]} position={[0.4, 0.89, back + 0.37]} color="#fbf6ea" radius={0.02} rough={0.3} />
      {[-1.1, -0.3, 1.1, 1.9].map((x) => (
        <Cyl key={x} r={0.018} h={0.12} position={[x, 0.75, back + 0.68]} rotation={[0, 0, Math.PI / 2]} color="#f2c12e" rough={0.3} />
      ))}
      {/* counter dressing: jars, a kettle, a chopping board */}
      {[-0.55, -0.45, -0.35].map((x, i) => (
        <group key={x} position={[x, 0.92, back + 0.25]}>
          <Cyl r={0.04} h={0.12 + i * 0.03} position={[0, 0.06 + i * 0.015, 0]} color={["#ffd27a", "#e86f4a", "#a8e6cf"][i]} rough={0.2} />
          <Cyl r={0.042} h={0.02} position={[0, 0.13 + i * 0.03, 0]} color="#c87a3a" />
        </group>
      ))}
      <RBox size={[0.4, 0.03, 0.26]} position={[1.6, 0.935, back + 0.4]} rotation={[0, 0.2, 0]} color="#d8a868" radius={0.012} />
      <group position={[1.85, 0.92, back + 0.25]}>
        <Ball position={[0, 0.12, 0]} radius={0.12} color="#3a9aa6" rough={0.25} scale={[1, 0.9, 1]} />
        <Cap a={[0.1, 0.12, 0]} b={[0.2, 0.2, 0]} r={0.018} color="#3a9aa6" />
      </group>
      {/* stove top + pan with eggs and bacon */}
      <group position={[STOVE[0], 0.92, STOVE[2]]} scale={1.5}>
        <RBox size={[0.7, 0.03, 0.5]} position={[0, 0, 0]} color="#2a2a30" radius={0.01} rough={0.3} />
        <Cyl r={0.17} r2={0.2} h={0.05} position={[0, 0.045, 0]} color="#30303a" rough={0.35} />
        <Cyl r={0.02} h={0.28} position={[0.32, 0.06, 0.05]} rotation={[0, 0.3, Math.PI / 2]} color="#30303a" />
        {[-0.07, 0.06].map((x, i) => (
          <group key={i} position={[x, 0.075, -0.02 + i * 0.05]}>
            <Ball position={[0, 0, 0]} radius={0.07} color="#ffffff" scale={[1, 0.12, 0.9]} />
            <Ball position={[0, 0.008, 0]} radius={0.028} color="#ffb51e" scale={[1, 0.6, 1]} rough={0.2} />
          </group>
        ))}
        <Cap a={[-0.1, 0.075, 0.1]} b={[0.1, 0.075, 0.12]} r={0.016} color="#c8452e" />
        <Cap a={[-0.08, 0.077, 0.07]} b={[0.11, 0.077, 0.08]} r={0.014} color="#d8603a" />
        <ScentRibbon points={[[0, 0.1, 0], [0.08, 0.4, 0.1], [-0.05, 0.75, 0.25], [0.15, 1.05, 0.6]]} f={f} color="#ffe27a" radius={0.03} glowK={0.45} sparkles={4} />
      </group>
      {/* coffee machine with steam + coffee scent */}
      <group position={[-1.0, 0.92, back + 0.3]}>
        <RBox size={[0.32, 0.42, 0.3]} position={[0, 0.21, 0]} color="#e0453a" radius={0.06} rough={0.3} />
        <CoffeeMug position={[0, 0.02, 0.12]} scale={1.1} />
        <ScentRibbon points={[[0, 0.18, 0.16], [0.1, 0.45, 0.25], [0.3, 0.75, 0.5], [0.8, 0.95, 0.9]]} f={f} color="#9a5a2a" radius={0.032} glowK={0.35} sparkles={4} seed={3} />
      </group>
      {/* toaster with toast popping */}
      <group position={[1.15, 0.92, back + 0.35]}>
        <RBox size={[0.3, 0.2, 0.18]} position={[0, 0.1, 0]} color="#cfd6de" radius={0.06} rough={0.2} />
        {[-0.05, 0.05].map((x, i) => (
          <RBox key={x} size={[0.03, 0.14, 0.13]} position={[x, 0.2 + Math.max(0, Math.sin(f * 0.08 + i)) * 0.08, 0]} color="#e0a45a" radius={0.015} />
        ))}
      </group>
      {/* fridge */}
      <group position={[-2.05, 0, back + 0.45]}>
        <RBox size={[0.8, 1.9, 0.7]} position={[0, 0.95, 0]} color="#a8e6cf" radius={0.15} rough={0.3} />
        <RBox size={[0.04, 0.4, 0.05]} position={[0.3, 1.25, 0.36]} color="#e8e8ea" radius={0.015} rough={0.2} />
        <RBox size={[0.74, 0.02, 0.02]} position={[0, 1.42, 0.355]} color="#7ec4ac" radius={0.005} />
      </group>
      {/* window with plants and the sun shaft */}
      <group position={[0.9, 1.95, back + 0.07]}>
        <RBox size={[1.2, 0.85, 0.08]} position={[0, 0, 0]} color="#ffffff" radius={0.03} />
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[1.06, 0.72]} />
          <meshBasicMaterial color={new THREE.Color("#a8dcff").multiplyScalar(0.9)} toneMapped={false} />
        </mesh>
        {/* the garden outside: a lawn, a fence and a round tree */}
        <mesh position={[0, -0.22, 0.05]}>
          <planeGeometry args={[1.06, 0.28]} />
          <meshBasicMaterial color={new THREE.Color("#7cc86a").multiplyScalar(0.85)} toneMapped={false} />
        </mesh>
        {Array.from({ length: 9 }, (_, k) => (
          <mesh key={k} position={[-0.48 + k * 0.12, -0.16, 0.052]}>
            <planeGeometry args={[0.05, 0.16]} />
            <meshBasicMaterial color="#f4efe2" toneMapped={false} />
          </mesh>
        ))}
        <Ball position={[0.3, 0.08, 0.05]} radius={0.2} color={new THREE.Color("#4f9f58").multiplyScalar(0.9).getStyle()} glow scale={[1, 1, 0.05]} />
        {[-1, 1].map((sd) => (
          <Cap key={sd} a={[sd * 0.5, 0.42, 0.13]} b={[sd * 0.56, -0.42, 0.16]} r={0.06} color="#ff8a6b" />
        ))}
        {[-0.35, 0, 0.35].map((x, i) => (
          <group key={x} position={[x, -0.4, 0.12]}>
            <Cyl r={0.06} r2={0.07} h={0.1} position={[0, 0, 0]} color={["#e86f4a", "#5fb0d8", "#ffd23f"][i]} />
            <Ball position={[0, 0.1, 0]} radius={0.08} color="#4fa860" />
          </group>
        ))}
      </group>
      <LightShaft from={[0.9, 2.0, back + 0.1]} to={[1.3, 0.0, -0.6]} width={0.9} color="#fff0b8" opacity={0.22} />
      <Motes center={[0.5, 1.2, -0.8]} size={[1.2, 1.6, 1.4]} f={f} count={30} />
      {/* hanging copper pans */}
      {[-0.4, -0.1, 0.25].map((x, i) => (
        <group key={x} position={[x - 0.5, 2.55 - i * 0.05, back + 0.25]} rotation={[0, 0, Math.sin(f * 0.05 + i) * 0.04]}>
          <Cyl r={0.012} h={0.28} position={[0, -0.14, 0]} color="#c87a3a" rough={0.25} />
          <Cyl r={0.13 - i * 0.02} h={0.03} position={[0, -0.32, 0]} rotation={[Math.PI / 2, 0, 0]} color="#d8894a" rough={0.25} />
        </group>
      ))}
      {children}
    </>
  );
};

// ---------- the street ----------

export type StreetMode = "morning" | "golden" | "dusk" | "night";
// Street runs along x. Sidewalk centre z = 0 (|z| < 0.65), verge with trees 0.65..1.6, kerb at 1.6, road to z = 9,
// houses behind lawns (front walls at z = -4.2), the far side's houses face back from z = 12.
export const STREET = { walkZ: 0, kerb: 1.6, houseFront: -4.2 };
export const TREE: Vec3 = [0, 0, 1.12];
export const BINS: Vec3 = [16.2, 0, 1.15];
export const CORNER_X = 14.2;
const HOUSES = [-18, -12, -6, 0, 6, 20];
const HOUSE_COLORS = ["#8fd3c8", "#ffb3a7", "#ffe08a", "#a9c8ff", "#c8b6ff", "#ffcf9a"];
const DOOR_COLORS = ["#e0453a", "#2f6fd8", "#3aa65a", "#ff8a2a", "#e0267f", "#264a8a"];

const SKIES: Record<StreetMode, [number, string][]> = {
  morning: [
    [-0.1, "#e8f6ff"],
    [0.0, "#d8f0ff"],
    [0.1, "#a8dcff"],
    [0.3, "#6ab8f7"],
    [0.6, "#3f94ea"],
    [1.0, "#2f78d8"],
  ],
  golden: [
    [-0.1, "#ffd39a"],
    [0.0, "#ffc07a"],
    [0.08, "#ffb070"],
    [0.2, "#f7a37f"],
    [0.4, "#b78bc0"],
    [1.0, "#5c6fb8"],
  ],
  dusk: [
    [-0.1, "#ff9f6b"],
    [0.0, "#ff8a6b"],
    [0.08, "#e86f8f"],
    [0.2, "#9a5ab0"],
    [0.45, "#4a3f8f"],
    [1.0, "#22265e"],
  ],
  night: [
    [-0.1, "#1c3a5a"],
    [0.0, "#1a3352"],
    [0.1, "#132a48"],
    [0.3, "#0e2040"],
    [1.0, "#08142c"],
  ],
};
const MODE = {
  morning: { sun: [-7, 9, 8] as Vec3, sunColor: "#fff2d8", sunK: 2.1, sky: "#cfe8ff", ground: "#7aa04a", hemiK: 1.05, fog: "#d6ecff", glow: "#fff6dc", ambient: 0.3, windows: 0 },
  golden: { sun: [9, 2.6, 6] as Vec3, sunColor: "#ffa848", sunK: 2.6, sky: "#ffc8a0", ground: "#a8783a", hemiK: 1.05, fog: "#ffc89a", glow: "#ffe0a0", ambient: 0.22, windows: 0.2 },
  dusk: { sun: [-6, 3, 8] as Vec3, sunColor: "#ff9a8a", sunK: 1.7, sky: "#d08ad0", ground: "#6a4a6a", hemiK: 1.35, fog: "#a06a9a", glow: "#ffb08a", ambient: 0.35, windows: 1 },
  night: { sun: [-5, 8, 6] as Vec3, sunColor: "#a8c4ff", sunK: 1.3, sky: "#5a7ab0", ground: "#2a3a4a", hemiK: 1.25, fog: "#1a3050", glow: "#dfe8ff", ambient: 0.32, windows: 1 },
};

export const streetLight = (mode: StreetMode, near?: Vec3): PuppetLight => {
  const m = MODE[mode];
  const dir = new THREE.Vector3(...m.sun).normalize().toArray() as Vec3;
  return {
    tint: mode === "night" ? "#dfe8ff" : "#fff4e6",
    shadow: mode === "morning" ? 0.12 : 0.2,
    distant: [{ direction: dir, color: m.sunColor, strength: mode === "golden" ? 1.6 : mode === "morning" ? 1.1 : 0.6 }],
    points: near && (mode === "dusk" || mode === "night") ? [{ position: [near[0], 2.6, near[2]], color: "#ffb35a", strength: 1.6, range: 3 }] : [],
  };
};

// A suburban house: rounded pastel box, chunky bevelled roof, white trim, porch with posts and a lamp, round-topped
// windows that glow at dusk, a door in a strong colour, a chimney.
export const SuburbHouse: React.FC<{ x: number; i: number; windows: number; facing?: 1 | -1 }> = ({ x, i, windows, facing = 1 }) => {
  const c = HOUSE_COLORS[(i + 60) % HOUSE_COLORS.length];
  const door = DOOR_COLORS[(i + 60) % DOOR_COLORS.length];
  const roof = ["#6a4a6a", "#5a5f7a", "#8a4a3a", "#4a6a7a"][(i + 40) % 4];
  const roofShape = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-2.75, 0);
    s.lineTo(0, 1.7);
    s.lineTo(2.75, 0);
    s.lineTo(-2.75, 0);
    return s;
  }, []);
  const win = new THREE.Color(windows > 0.5 ? "#ffd27a" : "#cfe8ff").multiplyScalar(windows > 0.5 ? 1.5 : 0.95);
  const siding = useOwnedTex(() => {
    const t = canvasTexture(64, 256, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 64, 256);
      for (let y = 0; y < 256; y += 32) {
        const g = ctx.createLinearGradient(0, y, 0, y + 32);
        g.addColorStop(0, "rgba(255,255,255,1)");
        g.addColorStop(0.85, "rgba(225,225,232,1)");
        g.addColorStop(1, "rgba(150,150,170,1)");
        ctx.fillStyle = g;
        ctx.fillRect(0, y, 64, 32);
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 3.5);
    return t;
  });
  return (
    <group position={[x, 0, facing === 1 ? STREET.houseFront - 2 : 14]} rotation={[0, facing === 1 ? 0 : Math.PI, 0]}>
      <RBox size={[5, 3.0, 4]} position={[0, 1.5, 0]} color={c} radius={0.12} rough={0.85} map={siding} />
      <mesh position={[0, 3.0, -2.15]} castShadow>
        <extrudeGeometry args={[roofShape, { depth: 4.3, bevelEnabled: true, bevelSize: 0.12, bevelThickness: 0.12, bevelSegments: 3 }]} />
        <meshStandardMaterial color={roof} roughness={0.8} />
      </mesh>
      <RBox size={[0.5, 1.4, 0.5]} position={[1.4, 4.2, -0.6]} color="#b0584a" radius={0.06} />
      {/* trim */}
      <RBox size={[5.1, 0.14, 4.1]} position={[0, 3.0, 0]} color="#fffaf0" radius={0.05} />
      {/* windows: two down, two up */}
      {[
        [-1.5, 1.4],
        [1.5, 1.4],
        [-1.2, 2.45],
        [1.2, 2.45],
      ].map(([wx, wy], k) => (
        <group key={k} position={[wx, wy, 2.01]}>
          <RBox size={[0.95, 0.85, 0.1]} position={[0, 0, 0]} color="#fffaf0" radius={0.05} />
          <mesh position={[0, 0, 0.06]}>
            <planeGeometry args={[0.78, 0.68]} />
            <meshBasicMaterial color={win} toneMapped={false} />
          </mesh>
          <RBox size={[0.04, 0.7, 0.05]} position={[0, 0, 0.08]} color="#fffaf0" radius={0.01} />
          <RBox size={[1.1, 0.07, 0.18]} position={[0, -0.47, 0.08]} color="#fffaf0" radius={0.02} />
          {/* shutters */}
          {[-1, 1].map((s) => (
            <RBox key={s} size={[0.22, 0.86, 0.05]} position={[s * 0.6, 0, 0.03]} color={door} radius={0.02} />
          ))}
        </group>
      ))}
      {/* door, porch, steps */}
      <RBox size={[0.85, 1.75, 0.1]} position={[0, 0.98, 2.03]} color={door} radius={0.06} rough={0.4} />
      <Ball position={[0.28, 0.95, 2.1]} radius={0.04} color="#f2c12e" rough={0.2} />
      <RBox size={[2.0, 0.12, 1.2]} position={[0, 0.12, 2.55]} color="#e8e0d0" radius={0.04} />
      <RBox size={[1.2, 0.12, 0.4]} position={[0, 0.04, 3.3]} color="#ddd5c4" radius={0.03} />
      <RBox size={[2.2, 0.12, 1.4]} position={[0, 2.0, 2.65]} rotation={[-0.08, 0, 0]} color="#fffaf0" radius={0.04} />
      {[-0.9, 0.9].map((px) => (
        <Cyl key={px} r={0.07} h={1.95} position={[px, 1.0, 3.2]} color="#fffaf0" />
      ))}
      <RBox size={[2.1, 0.16, 0.14]} position={[0, 1.92, 3.22]} color="#fffaf0" radius={0.03} />
      {[-0.9, 0.9].map((px) => (
        <RBox key={`k${px}`} size={[0.08, 0.1, 1.2]} position={[px, 1.9, 2.6]} color="#fffaf0" radius={0.02} />
      ))}
      <RBox size={[0.8, 1.6, 0.04]} position={[0, 0.95, 2.09]} color="#ffffff" radius={0.02} rough={0.3} />
      <Ball position={[0.7, 1.9, 2.1]} radius={0.07} color={new THREE.Color("#ffd27a").multiplyScalar(windows > 0.5 ? 1.8 : 1.0).getStyle()} glow />
      {windows > 0.5 && <pointLight position={[0.7, 1.8, 2.5]} intensity={1.2} distance={4} color="#ffb35a" />}
      {/* bushes under the windows */}
      {[-1.6, -1.1, 1.1, 1.6].map((bx, k) => (
        <Ball key={k} position={[bx, 0.35, 2.4]} radius={0.38} color={["#4fa860", "#5cb86a", "#3f9850"][k % 3]} rough={0.9} />
      ))}
    </group>
  );
};

// A big round street tree: flared trunk, a canopy of overlapping soft leaf balls in three greens, a root bump.
export const StreetTree: React.FC<{ position: Vec3; f: number; seed?: number; scale?: number; tint?: string }> = ({ position, f, seed = 0, scale = 1, tint }) => {
  const greens = tint ? [tint, tint, tint] : ["#5cb85a", "#74c862", "#479e4c"];
  const leaves = useOwnedTex(() => {
    const t = canvasTexture(256, 256, (ctx) => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 260; i++) {
        const v = rnd(i + 5);
        ctx.fillStyle = v > 0.55 ? "rgba(255,255,210,0.55)" : "rgba(20,70,30,0.35)";
        ctx.beginPath();
        ctx.ellipse(rnd(i) * 256, rnd(i + 300) * 256, 6 + v * 7, 3 + v * 4, rnd(i + 9) * 3, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(3, 2);
    return t;
  });
  const sway = Math.sin(f * 0.03 + seed) * 0.02;
  return (
    <group position={position} scale={scale}>
      <Cyl r={0.2} r2={0.13} h={2.6} position={[0, 1.3, 0]} color="#7a5236" rough={0.95} />
      <Cyl r={0.34} r2={0.2} h={0.35} position={[0, 0.17, 0]} color="#7a5236" rough={0.95} />
      {[0.5, 2.0, 3.6, 5.1].map((a, k) => (
        <Cap key={k} a={[0, 0.06, 0]} b={[Math.cos(a) * 0.5, 0.02, Math.sin(a) * 0.5]} r={0.07} color="#6e4a30" />
      ))}
      <Cap a={[0, 2.2, 0]} b={[0.7, 3.0, 0.1]} r={0.08} color="#7a5236" />
      <Cap a={[0, 2.3, 0]} b={[-0.6, 3.1, -0.1]} r={0.08} color="#7a5236" />
      <group position={[0, 3.6, 0]} rotation={[0, 0, sway]}>
        {Array.from({ length: 14 }, (_, k) => {
          const a = rnd(k + seed * 10) * Math.PI * 2;
          const d = 0.4 + rnd(k + 7 + seed) * 0.85;
          const y = (rnd(k + 20 + seed) - 0.4) * 1.3;
          return (
            <mesh key={k} position={[Math.cos(a) * d, y, Math.sin(a) * d * 0.8]} castShadow receiveShadow>
              <sphereGeometry args={[0.62 + rnd(k + 33) * 0.35, 28, 20]} />
              <meshStandardMaterial color={greens[k % 3]} map={leaves} roughness={0.9} />
            </mesh>
          );
        })}
        {/* small leaf clumps round the edge break up the silhouette */}
        {Array.from({ length: 34 }, (_, k) => {
          const a = rnd(k + 80 + seed) * Math.PI * 2;
          const e = (rnd(k + 90) - 0.35) * 1.6;
          const R = 1.45 + rnd(k + 95) * 0.25;
          return <Ball key={`c${k}`} position={[Math.cos(a) * Math.cos(e) * R, Math.sin(e) * R * 0.85, Math.sin(a) * Math.cos(e) * R * 0.8]} radius={0.18 + rnd(k + 70) * 0.14} color={greens[(k + 1) % 3]} rough={0.9} />;
        })}
      </group>
    </group>
  );
};

// Puffy cartoon clouds high in the sky.
export const Cloud: React.FC<{ position: Vec3; s: number; color: string }> = ({ position, s, color }) => (
  <group position={position} scale={s}>
    {[
      [0, 0, 0, 1],
      [-1.1, -0.2, 0.1, 0.75],
      [1.1, -0.15, 0, 0.8],
      [0.5, 0.45, -0.2, 0.7],
      [-0.5, 0.35, 0.1, 0.65],
    ].map(([x, y, z, r], i) => (
      <mesh key={i} position={[x, y, z]}>
        <sphereGeometry args={[r, 24, 16]} />
        <meshStandardMaterial color={color} roughness={1} emissive={color} emissiveIntensity={0.35} fog={false} />
      </mesh>
    ))}
  </group>
);

// Instanced grass blades over the verge and the front of the lawns, freed on unmount.
const Blades: React.FC<{ x0: number; x1: number; color: string; skip?: [number, number, number, number] }> = ({ x0, x1, color, skip }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute([-0.014, 0, 0, 0.014, 0, 0, 0.004, 0.1, 0.01], 3));
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 0.9, side: THREE.DoubleSide });
    const n = 14000;
    const m = new THREE.InstancedMesh(geo, mat, n);
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const verge = i % 3 === 0;
      const x = x0 + rnd(i * 1.7) * (x1 - x0);
      const z = verge ? 0.7 + rnd(i * 2.3) * 0.85 : -0.7 - rnd(i * 3.1) * 3.2;
      o.position.set(x, 0, z);
      o.rotation.set((rnd(i + 5) - 0.5) * 0.5, rnd(i) * 6, (rnd(i + 9) - 0.5) * 0.5);
      const s = skip && x > skip[0] && x < skip[1] && z > skip[2] && z < skip[3] ? 0 : 0.6 + rnd(i + 13) * 0.9;
      o.scale.set(s, s, s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.set(color).offsetHSL((rnd(i + 2) - 0.5) * 0.06, 0.05, (rnd(i + 4) - 0.35) * 0.14));
    }
    m.castShadow = false;
    m.receiveShadow = true;
    return m;
  }, [x0, x1, color, skip]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  return <primitive object={mesh} />;
};

// A street lamp with a warm head that lights up at dusk and night.
export const StreetLamp: React.FC<{ position: Vec3; on: number }> = ({ position, on }) => (
  <group position={position}>
    <Cyl r={0.07} r2={0.05} h={3.4} position={[0, 1.7, 0]} color="#3a4a5a" rough={0.4} />
    <Cap a={[0, 3.35, 0]} b={[0, 3.5, -0.6]} r={0.045} color="#3a4a5a" />
    <RBox size={[0.36, 0.16, 0.26]} position={[0, 3.45, -0.65]} color="#3a4a5a" radius={0.06} />
    <Ball position={[0, 3.36, -0.65]} radius={0.1} color={new THREE.Color("#ffd27a").multiplyScalar(on > 0.5 ? 2.2 : 0.9).getStyle()} glow scale={[1.2, 0.6, 1]} />
    {on > 0.5 && <pointLight position={[0, 3.1, -0.65]} intensity={3.2} distance={7} decay={1.6} color="#ffb35a" castShadow={false} />}
    {on > 0.5 && <LightShaft from={[0, 3.3, -0.65]} to={[0, 0, -0.4]} width={1.6} color="#ffbf70" opacity={0.18} />}
  </group>
);

// A chalk hopscotch drawn on the sidewalk.
const Hopscotch: React.FC<{ x: number }> = ({ x }) => {
  const tex = useOwnedTex(() =>
    canvasTexture(512, 128, (ctx) => {
      ctx.clearRect(0, 0, 512, 128);
      ctx.strokeStyle = "rgba(255,120,200,0.85)";
      ctx.lineWidth = 7;
      ctx.fillStyle = "rgba(120,200,255,0.85)";
      ctx.font = `900 40px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      [0, 1, 2, 3, 4].forEach((k) => {
        ctx.strokeRect(20 + k * 95, 24, 90, 80);
        ctx.fillText(String(k + 1), 65 + k * 95, 66);
      });
    }),
  );
  return (
    <mesh position={[x, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.6, 0.4]} />
      <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

// A street sign on a post with two blades.
const StreetSign: React.FC<{ position: Vec3; a: string; b: string }> = ({ position, a, b }) => {
  const make = (t: string) =>
    canvasTexture(512, 128, (ctx) => {
      ctx.fillStyle = "#1f7a4a";
      ctx.beginPath();
      ctx.roundRect(4, 4, 504, 120, 18);
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(14, 14, 484, 100, 12);
      ctx.stroke();
      ctx.fillStyle = "#ffffff";
      ctx.font = `900 70px ${FONT}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(t, 256, 68);
    });
  const ta = useOwnedTex(() => make(a), [a]);
  const tb = useOwnedTex(() => make(b), [b]);
  return (
    <group position={position}>
      <Cyl r={0.04} h={2.6} position={[0, 1.3, 0]} color="#7a8a96" rough={0.3} />
      {[0, Math.PI].map((ry) => (
        <group key={ry}>
          <mesh position={[0, 2.5, 0]} rotation={[0, ry, 0]}>
            <planeGeometry args={[1.0, 0.25]} />
            <meshStandardMaterial map={ta} roughness={0.5} />
          </mesh>
          <mesh position={[0, 2.22, 0]} rotation={[0, Math.PI / 2 + ry, 0]}>
            <planeGeometry args={[1.0, 0.25]} />
            <meshStandardMaterial map={tb} roughness={0.5} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// The suburban street. `mode` sets the sky, sun and lamps. `children` go in the world (dogs, scent, effects).
export const StreetSet: React.FC<{ camera: CameraShot; f: number; mode: StreetMode; children?: React.ReactNode; binLid?: number; binShake?: number; bins?: boolean; omit?: number[]; corner?: boolean; clear?: [number, number]; skipBlades?: [number, number, number, number] }> = ({
  camera,
  f,
  mode,
  children,
  binLid = 0,
  binShake = 0,
  bins = true,
  omit = [],
  corner = true,
  clear,
  skipBlades,
}) => {
  const keep = (x: number) => !clear || x < clear[0] || x > clear[1];
  const m = MODE[mode];
  const camX = camera.position[0];
  const lit = mode === "dusk" || mode === "night" ? 1 : 0;
  const grass = useOwnedTex(() => {
    const t = grassTex("#66b84a", "#86d05a", "#4a9a3a");
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(30, 4);
    return t;
  });
  const walk = useOwnedTex(() => {
    const t = slabs();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(26, 1);
    return t;
  });
  const road = useOwnedTex(() => {
    const t = asphalt();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 2);
    return t;
  });
  const x0 = -24;
  const x1 = 30;
  const L = x1 - x0;
  const cx = (x0 + x1) / 2;
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.fog]} />
      <fog attach="fog" args={[m.fog, 11, 55]} />
      <Lights camera={camera} sun={m.sun} sunColor={m.sunColor} sunK={m.sunK} sky={m.sky} ground={m.ground} hemiK={m.hemiK} ambient={m.ambient} box={9} />
      <group position={camera.position}>
        <SkyDome sun={m.sun} stops={SKIES[mode]} glow={m.glow} />
        {mode === "night" &&
          Array.from({ length: 120 }, (_, i) => {
            const a = rnd(i) * Math.PI * 2;
            const e = 0.15 + rnd(i + 3) * 0.8;
            return <Ball key={i} position={[Math.cos(a) * Math.cos(e) * 200, Math.sin(e) * 200, Math.sin(a) * Math.cos(e) * 200]} radius={0.5 + rnd(i + 7) * 0.6} color="#ffffff" glow />;
          })}
        {mode === "night" && <Ball position={[-60, 90, -120]} radius={9} color="#fff6d8" glow />}
      </group>
      {mode !== "night" &&
        [
          [-30, 26, -70, 4],
          [10, 32, -80, 5],
          [45, 24, -60, 3.5],
          [-5, 40, 70, 5],
          [30, 30, 60, 4],
        ].map(([x, y, z, s], i) => <Cloud key={i} position={[x + camX * 0.85, y, z]} s={s} color={mode === "morning" ? "#ffffff" : mode === "golden" ? "#ffd6b0" : "#e89ab8"} />)}
      {/* far trees behind the houses, both sides */}
      {Array.from({ length: 14 }, (_, k) => (
        <Ball key={`b${k}`} position={[x0 + k * 4 + rnd(k) * 2, 3.5 + rnd(k + 4) * 1.5, -12 - rnd(k + 2) * 3]} radius={2.4 + rnd(k + 6) * 1.2} color={["#3f8f4a", "#4f9f58", "#2f7f42"][k % 3]} rough={1} />
      ))}
      {Array.from({ length: 14 }, (_, k) => (
        <Ball key={`f${k}`} position={[x0 + k * 4 + rnd(k + 50) * 2, 3.5 + rnd(k + 54) * 1.5, 20 + rnd(k + 52) * 3]} radius={2.4 + rnd(k + 56) * 1.2} color={["#3f8f4a", "#4f9f58", "#2f7f42"][k % 3]} rough={1} />
      ))}
      {/* ground: lawns, sidewalk, verge, kerb, gutter, road, far lawn */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0, -6]} receiveShadow>
        <planeGeometry args={[L, 10.7]} />
        <meshStandardMaterial map={grass} roughness={0.95} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.02, 0]} receiveShadow>
        <planeGeometry args={[L, 1.3]} />
        <meshStandardMaterial map={walk} roughness={0.85} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.005, 1.12]} receiveShadow>
        <planeGeometry args={[L, 0.95]} />
        <meshStandardMaterial map={grass} roughness={0.95} />
      </mesh>
      <RBox size={[L, 0.16, 0.18]} position={[cx, 0.0, STREET.kerb + 0.05]} color="#cfc8ba" radius={0.04} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, -0.06, 5.4]} receiveShadow>
        <planeGeometry args={[L, 7.4]} />
        <meshStandardMaterial map={road} roughness={0.8} />
      </mesh>
      {Array.from({ length: 14 }, (_, k) => (
        <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[x0 + 2 + k * 4, -0.055, 5.4]}>
          <planeGeometry args={[1.8, 0.14]} />
          <meshStandardMaterial color="#f2d23a" roughness={0.6} />
        </mesh>
      ))}
      <RBox size={[L, 0.16, 0.18]} position={[cx, 0.0, 9.15]} color="#cfc8ba" radius={0.04} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.0, 13]} receiveShadow>
        <planeGeometry args={[L, 7.6]} />
        <meshStandardMaterial map={grass} roughness={0.95} />
      </mesh>
      <Blades x0={x0} x1={x1} color="#6cc452" skip={skipBlades} />
      <Cyl r={0.45} h={0.02} position={[11.5, -0.05, 4.2]} color="#3a3a42" rough={0.5} />
      <Hopscotch x={11.6} />
      {Array.from({ length: 40 }, (_, k) => (
        <mesh key={`l${k}`} position={[x0 + rnd(k + 400) * L, 0.03, -0.6 + rnd(k + 410) * 2.1]} rotation={[-Math.PI / 2, 0, rnd(k) * 6]}>
          <circleGeometry args={[0.05, 6]} />
          <meshStandardMaterial color={["#e8a33a", "#d8642a", "#f2c84a"][k % 3]} roughness={0.9} />
        </mesh>
      ))}
      {/* driveways cutting the lawn to the road */}
      {HOUSES.filter((hx) => !omit.includes(hx)).map((hx) => (
        <mesh key={hx} rotation={[-Math.PI / 2, 0, 0]} position={[hx + 3.1, 0.012, -2.4]} receiveShadow>
          <planeGeometry args={[1.4, 3.6]} />
          <meshStandardMaterial color="#cbc3b4" roughness={0.9} />
        </mesh>
      ))}
      {HOUSES.map((hx, i) => (omit.includes(hx) ? null : <SuburbHouse key={hx} x={hx} i={i} windows={lit + m.windows * 0} />))}
      {HOUSES.map((hx, i) => (
        <SuburbHouse key={`o${hx}`} x={hx + 3} i={i + 3} windows={lit} facing={-1} />
      ))}
      {/* picket fences along the front of the lawns */}
      {HOUSES.map((hx, i) => omit.includes(hx) ? null : (
        <group key={`p${hx}`} position={[hx - 1.2, 0, -0.85]}>
          {i % 2 === 0 &&
            Array.from({ length: 14 }, (_, k) => <RBox key={k} size={[0.1, 0.7 + (k % 2) * 0.04, 0.04]} position={[-1.5 + k * 0.22, 0.36, 0]} color="#fffaf0" radius={0.02} />)}
          {i % 2 === 0 && <RBox size={[3.1, 0.06, 0.04]} position={[0, 0.5, -0.03]} color="#fffaf0" radius={0.015} />}
          {i % 2 === 1 && <RBox size={[3.2, 0.7, 0.55]} position={[0, 0.35, -0.2]} color="#3f9850" radius={0.25} rough={0.95} />}
        </group>
      ))}
      {/* the tree of gossip and its neighbours along the verge */}
      {keep(TREE[0]) && <StreetTree position={TREE} f={f} />}
      {keep(-8) && <StreetTree position={[-8, 0, 1.12]} f={f} seed={2} scale={0.9} />}
      {keep(8.5) && <StreetTree position={[8.5, 0, 1.12]} f={f} seed={4} scale={1.05} />}
      {keep(-16) && <StreetTree position={[-16, 0, 1.12]} f={f} seed={6} />}
      {keep(22) && <StreetTree position={[22, 0, 1.12]} f={f} seed={8} />}
      {keep(2.4) && <Hydrant position={[2.4, 0, 1.2]} />}
      {mode === "morning" &&
        [-0.9, 0.2, 1.1].map((dx, k) => (
          <LightShaft key={k} from={[TREE[0] + dx - 1.2, 4.2, TREE[2] - 0.8]} to={[TREE[0] + dx + 0.4, 0, TREE[2] + 0.2 + k * 0.3]} width={0.45} color="#fff2c0" opacity={0.16} />
        ))}
      {HOUSES.map((hx, i) => keep(hx + 2.2) && !omit.includes(hx) && (
        <Mailbox key={`m${hx}`} position={[hx + 2.2, 0, 1.3]} color={DOOR_COLORS[(i + 2) % DOOR_COLORS.length]} flag={i % 2 === 0} />
      ))}
      {[-10, 4.5, BINS[0] + 1.35].filter(keep).map((lx) => (
        <StreetLamp key={lx} position={[lx, 0, 1.4]} on={lit} />
      ))}
      {/* utility poles with sagging wires */}
      {[-14, 0, 14].filter((px) => keep(px + 5)).map((px) => (
        <group key={px} position={[px + 5, 0, 1.45]}>
          <Cyl r={0.12} r2={0.1} h={6} position={[0, 3, 0]} color="#7a5a3a" rough={1} />
          <RBox size={[1.6, 0.12, 0.12]} position={[0, 5.6, 0]} color="#7a5a3a" radius={0.03} />
        </group>
      ))}
      {[-0.6, 0.6].map((dx) =>
        Array.from({ length: 2 }, (_, k) => {
          const a: Vec3 = [-9 + k * 14 + dx, 5.65, 1.45];
          const b: Vec3 = [5 + k * 14 + dx, 5.65, 1.45];
          return <Cap key={`${dx}${k}`} a={a} b={[(a[0] + b[0]) / 2, 5.25, 1.45]} r={0.012} color="#2a2a30" />;
        }),
      )}
      {[-0.6, 0.6].map((dx) =>
        Array.from({ length: 2 }, (_, k) => {
          const a: Vec3 = [-2 + k * 14 + dx, 5.25, 1.45];
          return <Cap key={`h${dx}${k}`} a={a} b={[5 + k * 14 + dx, 5.65, 1.45]} r={0.012} color="#2a2a30" />;
        }),
      )}
      {/* the corner: a tall rounded hedge on the corner lot, a street sign, then the bins */}
      {corner && (
        <>
          <RBox size={[0.9, 1.9, 4.6]} position={[CORNER_X, 0.95, -2.9]} color="#3f9a50" radius={0.4} rough={0.95} />
          <RBox size={[0.9, 1.6, 0.9]} position={[CORNER_X, 0.8, 1.05]} color="#3f9a50" radius={0.4} rough={0.95} />
          <StreetSign position={[CORNER_X + 0.35, 0, -0.85]} a="SNIFF AVE" b="BARK ST" />
        </>
      )}
      {bins && (
        <>
          <WheelieBin position={BINS} color="#2f8a4a" lid={binLid} f={f} shake={binShake} rotationY={0.1} />
          <WheelieBin position={[BINS[0] + 0.62, 0, BINS[2] + 0.05]} color="#3a5a8a" rotationY={-0.12} />
          <WheelieBin position={[BINS[0] - 0.64, 0, BINS[2] - 0.04]} color="#5a6070" rotationY={0.2} lid={0.15} />
          <Ball position={[BINS[0] - 0.62, 1.0, BINS[2] + 0.05]} radius={0.16} color="#2a2a30" rough={0.3} scale={[1.2, 0.7, 1]} />
          {/* a torn bag and a chicken bone at the foot of the green bin */}
          <Ball position={[BINS[0] - 0.75, 0.15, BINS[2] + 0.35]} radius={0.18} color="#2a2a30" rough={0.3} scale={[1.2, 0.8, 1]} />
        </>
      )}
      {mode === "golden" && <Motes center={[camera.target[0], 1.4, 0.5]} size={[6, 2.5, 3]} f={f} count={60} color="#ffd890" r={0.012} />}
      {children}
    </>
  );
};

// ---------- nose vision ----------

const VOID_SKY: [number, string][] = [
  [-1, "#1a0b3a"],
  [-0.3, "#2e1460"],
  [0.0, "#5a2a9a"],
  [0.3, "#8a3ab8"],
  [0.7, "#3a1a7a"],
  [1.0, "#1a0b3a"],
];

// Nose vision: a dreamy purple space where every smell floats as a glowing ribbon with its object at the end
// (coffee, pizza, socks, chicken, flowers, a bone). The camera flies through it.
export const VOID_YOU: [number, number] = [0, 1.0];
const NOSE: Vec3 = [0, 0.9, 1.06];
export const NoseVoid: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode }> = ({ camera, f, children }) => {
  const smells: { at: Vec3; c: string; kind: string }[] = [
    { at: [-0.7, 1.75, 0.1], c: "#ff8a2a", kind: "pizza" },
    { at: [0.72, 1.6, 0.0], c: "#ffc21a", kind: "chicken" },
    { at: [-0.62, 0.55, 0.3], c: "#7fd63a", kind: "sock" },
  ];
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#2e1460"]} />
      <fog attach="fog" args={["#3a1a7a", 4, 14]} />
      <ambientLight intensity={0.6} color="#d8c8ff" />
      <hemisphereLight args={["#ff9ae8", "#4a2aa0", 1.2]} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} color="#fff0f8" />
      <group position={camera.position}>
        <SkyDome sun={[0, 1, 0]} stops={VOID_SKY} glow="#ff9ae8" />
      </group>
      {smells.map((s, i) => {
        const bob = Math.sin(f * 0.05 + i) * 0.08;
        const spin = f * 0.02 + i;
        const at: Vec3 = [s.at[0], s.at[1] + bob, s.at[2]];
        const src: Vec3 = NOSE;
        return (
          <group key={i}>
            <ScentRibbon points={[src, [(src[0] + at[0]) / 2 + 0.3, (src[1] + at[1]) / 2 + 0.25, (src[2] + at[2]) / 2], at]} f={f} color={s.c} radius={0.05} wobble={0.12} seed={i * 3} glowK={0.75} />
            <group position={at} rotation={[0, spin, 0.2]}>
              {s.kind === "mug" && <CoffeeMug position={[0, -0.18, 0]} scale={3.2} />}
              {s.kind === "pizza" && <PizzaSlice position={[0, -0.1, 0]} scale={2.6} bite />}
              {s.kind === "sock" && <group scale={1.8}><Sock at={[-0.1, 0, 0]} color="#f2f2ea" stripe="#e0453a" tilt={1.1} leg={0.22} /></group>}
              {s.kind === "chicken" && <Drumstick position={[0, 0, 0]} scale={2.0} gold f={f} />}
              {s.kind === "flower" &&
                Array.from({ length: 6 }, (_, k) => <Ball key={k} position={[Math.cos(k) * 0.09, Math.sin(k) * 0.09, 0]} radius={0.06} color="#ff7ad0" />)}
              {s.kind === "bone" && (
                <>
                  <Cap a={[-0.15, 0, 0]} b={[0.15, 0, 0]} r={0.04} color="#fff6e8" />
                  {[-1, 1].map((sx) => [-1, 1].map((sy) => <Ball key={`${sx}${sy}`} position={[sx * 0.17, sy * 0.04, 0]} radius={0.05} color="#fff6e8" />))}
                </>
              )}
            </group>
          </group>
        );
      })}
      {/* soft fog banks at three depths for parallax */}
      {Array.from({ length: 12 }, (_, k) => (
        <Ball key={`fog${k}`} position={[(rnd(k + 200) - 0.5) * 8, -0.5 + rnd(k + 210) * 4, -2 - (k % 3) * 2.5]} radius={1.2 + rnd(k + 220) * 1.2} color={["#c86ae0", "#8a4ad0", "#ff8ad8"][k % 3]} opacity={0.18} />
      ))}
      <Motes center={[0, 1.5, -1]} size={[4, 3.5, 4]} f={f} count={90} color="#ffd8ff" r={0.01} />
      {children}
    </>
  );
};
