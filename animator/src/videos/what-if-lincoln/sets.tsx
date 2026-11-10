import React from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, Halo, HIP_HEIGHT, InkBox, InkCylinder, PuppetLight, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwned } from "../../three/BalloonSets";
import { Audience, Bottle, GasBracket, Glass, GuardChair, HazeCard, Lantern, LightShaft, makeSeats, MODELS, Motes, Painted, rand, Rocker, TopHat, Umbrella } from "./props";

// Sets for what-if-lincoln, built from guide/references/fords-theatre-1865.md. Metres, puppets 1.3 m tall.

export const U = 1.3 / 1060; // metres per puppet unit
export const airFor = (y: number) => (y - HIP_HEIGHT) / U; // a seated puppet whose seat top is at y
export const standAir = (y: number) => y / U; // a standing puppet on a floor at y

// ---------- shared ----------

const wallpaper = (base: string, motif: string, stripe: string | null, seed: number, w = 512, h = 512) =>
  canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    if (stripe) {
      ctx.fillStyle = stripe;
      for (let x = 0; x < w; x += 64) ctx.fillRect(x, 0, 18, h);
    }
    ctx.fillStyle = motif;
    for (let y = 16; y < h; y += 64)
      for (let x = (y / 64) % 2 ? 48 : 16; x < w; x += 64) {
        ctx.beginPath();
        ctx.ellipse(x, y, 7, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(x - 1, y + 10, 2, 10);
      }
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = rand(seed + i) > 0.5 ? "rgba(30,20,10,0.10)" : "rgba(255,255,255,0.06)";
      ctx.beginPath();
      ctx.ellipse(rand(seed + i * 3) * w, rand(seed + i * 7) * h, 10 + rand(seed + i * 5) * 50, 8 + rand(seed + i * 11) * 40, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "rgba(0,0,0,0.18)");
    g.addColorStop(0.6, "rgba(0,0,0,0)");
    g.addColorStop(1, "rgba(40,20,10,0.22)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });

const boards = (base: string, seed: number, w = 512, h = 512, n = 10) =>
  canvasTexture(w, h, (ctx) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = `rgba(${rand(seed + i) > 0.5 ? "255,240,220" : "40,20,10"},${0.04 + rand(seed + i * 2) * 0.08})`;
      ctx.fillRect(0, (i * h) / n, w, h / n);
      ctx.fillStyle = "rgba(20,10,5,0.35)";
      ctx.fillRect(0, (i * h) / n, w, 3);
      ctx.fillRect(rand(seed + i * 5) * w, (i * h) / n, 3, h / n);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(20,10,5,0.08)";
      ctx.beginPath();
      ctx.ellipse(rand(seed + i * 3) * w, rand(seed + i * 7) * h, 20 + rand(i) * 40, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

const Tex: React.FC<{ make: () => THREE.Texture; repeat?: [number, number]; children: (t: THREE.Texture) => React.ReactNode; deps?: React.DependencyList }> = ({ make, repeat = [1, 1], children, deps = [] }) => {
  const t = useOwned(() => {
    const x = make();
    x.wrapS = x.wrapT = THREE.RepeatWrapping;
    x.repeat.set(repeat[0], repeat[1]);
    return x;
  }, [...deps, repeat[0], repeat[1]]);
  return <>{children(t)}</>;
};

// A flat textured wall or floor plane (toon-lit).
export const Surface: React.FC<{ position: Vec3; size: [number, number]; rotation?: Vec3; color: string; make: () => THREE.Texture; repeat?: [number, number]; id: string }> = ({ position, size, rotation = [0, 0, 0], color, make, repeat, id }) => (
  <Tex make={make} repeat={repeat} deps={[id]}>
    {(t) => (
      <mesh position={position} rotation={rotation} receiveShadow>
        <planeGeometry args={size} />
        <meshToonMaterial color={color} map={t} gradientMap={toonRamp} />
      </mesh>
    )}
  </Tex>
);

// Background, fog, ambient, hemisphere and an optional shadow-casting key; the camera rig.
const Air: React.FC<{ camera: CameraShot; bg: string; fog: [number, number]; amb: [number, string]; hemi?: [string, string, number]; sun?: { at: Vec3; color: string; i: number; box?: number } }> = ({ camera, bg, fog, amb, hemi, sun: key }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={[bg]} />
    <fog attach="fog" args={[bg, fog[0], fog[1]]} />
    <ambientLight intensity={amb[0]} color={amb[1]} />
    {hemi && <hemisphereLight args={[hemi[0], hemi[1], hemi[2]]} />}
    {key && (
      <directionalLight
        position={key.at}
        intensity={key.i}
        color={key.color}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-(key.box ?? 6)}
        shadow-camera-right={key.box ?? 6}
        shadow-camera-top={key.box ?? 6}
        shadow-camera-bottom={-(key.box ?? 6)}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
    )}
  </>
);

// ---------- Ford's Theatre: the house, the stage and the State Box ----------

export const STAGE = { top: 0.6, front: 0, back: -4.2, half: 3.0 };
export const BOX = { x: 3.62, y: 2.15, z: 0.75, rot: -1.0 };
export const boxWorld = (lx: number, lz: number, ly = 0): Vec3 => {
  const c = Math.cos(BOX.rot);
  const s = Math.sin(BOX.rot);
  return [BOX.x + lx * c + lz * s, BOX.y + ly, BOX.z - lx * s + lz * c];
};
export const LINCOLN_SEAT = { lx: 0.92, lz: -0.3 };
export const MARY_SEAT = { lx: 0.4, lz: -0.26 };
export const GALLERY = { x0: 3.95, x1: 5.0, y: 2.0, door: 2.3 }; // the right-hand dress circle gallery and its passage door

export type HouseMode = "show" | "intermission";

const dropCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // Act 3 of Our American Cousin: a painted drawing room, panelled walls, a tall window with drapes, a door
  ctx.fillStyle = "#8aa48a";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#6a845e";
  for (let x = 0; x < w; x += 128) ctx.fillRect(x + 10, h * 0.12, 108, h * 0.62);
  ctx.fillStyle = "#5a4a32";
  ctx.fillRect(0, h * 0.74, w, h * 0.26);
  ctx.fillStyle = "#c8b890";
  ctx.fillRect(0, h * 0.72, w, h * 0.03);
  // window
  ctx.fillStyle = "#a8c4d8";
  ctx.fillRect(w * 0.6, h * 0.16, w * 0.16, h * 0.46);
  ctx.strokeStyle = "#f0e6cc";
  ctx.lineWidth = 8;
  ctx.strokeRect(w * 0.6, h * 0.16, w * 0.16, h * 0.46);
  ctx.beginPath();
  ctx.moveTo(w * 0.68, h * 0.16);
  ctx.lineTo(w * 0.68, h * 0.62);
  ctx.stroke();
  ctx.fillStyle = "#9a2a2a";
  ctx.fillRect(w * 0.56, h * 0.12, w * 0.05, h * 0.55);
  ctx.fillRect(w * 0.75, h * 0.12, w * 0.05, h * 0.55);
  // door
  ctx.fillStyle = "#6a4a2a";
  ctx.fillRect(w * 0.18, h * 0.3, w * 0.14, h * 0.44);
  ctx.fillStyle = "#e0c070";
  ctx.beginPath();
  ctx.arc(w * 0.3, h * 0.53, 6, 0, Math.PI * 2);
  ctx.fill();
  // a painted mirror and a portrait
  ctx.fillStyle = "#d8b860";
  ctx.fillRect(w * 0.4, h * 0.2, w * 0.12, h * 0.2);
  ctx.fillStyle = "#4a5a5a";
  ctx.fillRect(w * 0.41, h * 0.215, w * 0.1, h * 0.17);
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "rgba(0,0,0,0.25)");
  g.addColorStop(0.5, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
};

const HOUSE_SEATS = makeSeats(
  Array.from({ length: 13 }, (_, i) => ({ z: 1.35 + i * 0.58, y: 0, x0: -3.7, x1: 3.3 })),
  1,
);
const GALLERY_SEATS = makeSeats(
  [
    ...Array.from({ length: 2 }, (_, i) => ({ z: 9.0 + i * 0.5, y: 2.0, x0: -3.9, x1: 3.6, step: 0.45 })),
  ],
  7,
);
const LEFT_GALLERY = makeSeats(Array.from({ length: 2 }, (_, i) => ({ z: 0, y: 2.0, x0: 2.0, x1: 8.4, step: 0.45 })), 11).map((s, i) => ({
  ...s,
  p: [-4.35 - (i % 2) * 0.45, 2.0, s.p[0]] as Vec3,
}));

export const FordsSet: React.FC<{
  camera: CameraShot;
  frame: number;
  mode?: HouseMode;
  laugh?: number;
  dark?: number; // 0..1, the gas going down
  rock?: number; // Lincoln's rocker
  galleryChair?: boolean;
  drop?: number; // lower the whole house by this (a raised floor becomes y = 0, so puppets on it need no air)
  children?: React.ReactNode;
}> = ({ camera, frame, mode = "show", laugh = 0, dark = 0, rock = 0, galleryChair = true, drop = 0, children }) => {
  const lit = 1 - dark;
  const house = mode === "intermission" ? 1.25 : 1;
  const foot = mode === "intermission" ? 0.5 : 1;
  return (
    <>
      <Air camera={camera} bg={dark > 0.6 ? "#05040a" : "#1a0c08"} fog={[9, 26]} amb={[0.55 * lit * house + 0.06, "#ffd8a8"]} hemi={["#ffcc90", "#2a1408", 0.5 * lit * house + 0.04]} sun={{ at: [-2, 8, 6], color: "#ffd8a0", i: 1.2 * lit * house, box: 9 }} />
      <group position={[0, -drop, 0]}>
      {/* footlights and the chandelier */}
      <pointLight position={[0, 1.0, 0.6]} intensity={9 * lit * foot} distance={7} color="#ffc070" decay={1.6} />
      <pointLight position={[0, 5.4, 4.5]} intensity={6 * lit * house} distance={14} color="#ffd8a0" decay={1.2} />
      <pointLight position={[3.0, 3.2, 2.4]} intensity={2.5 * lit} distance={4} color="#ffd0a0" />
      {/* parquet floor and walls */}
      <Surface id="parq" position={[0, 0, 5]} size={[10.4, 10.4]} rotation={[-Math.PI / 2, 0, 0]} color="#7a5232" make={() => boards("#c08a5a", 3)} repeat={[4, 4]} />
      <Surface id="wallL" position={[-5.0, 3.2, 5]} size={[10.4, 6.4]} rotation={[0, Math.PI / 2, 0]} color="#8a2a2a" make={() => wallpaper("#b8343c", "#e05a64", null, 5)} repeat={[5, 3]} />
      <Surface id="wallR" position={[5.0, 3.2, 5]} size={[10.4, 6.4]} rotation={[0, -Math.PI / 2, 0]} color="#8a2a2a" make={() => wallpaper("#b8343c", "#e05a64", null, 6)} repeat={[5, 3]} />
      <Surface id="wallB" position={[0, 3.2, 10.3]} size={[10.4, 6.4]} rotation={[0, Math.PI, 0]} color="#8a2a2a" make={() => wallpaper("#b8343c", "#e05a64", null, 7)} repeat={[5, 3]} />
      <mesh position={[0, 6.2, 4]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[12, 14]} />
        <meshToonMaterial color="#3a2418" gradientMap={toonRamp} />
      </mesh>
      {/* the chandelier: a gilt ring of gas jets */}
      <group position={[0, 5.3, 4.5]}>
        <InkCylinder radius={0.01} height={0.9} position={[0, 0.45, 0]} color="#c8a040" ink={0.004} />
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.7, 0.04, 8, 40]} />
          <meshToonMaterial color="#d8b048" gradientMap={toonRamp} />
        </mesh>
        {Array.from({ length: 12 }, (_, i) => (
          <Halo key={i} position={[Math.cos((i / 12) * Math.PI * 2) * 0.7, 0.08, Math.sin((i / 12) * Math.PI * 2) * 0.7]} size={0.5} color="#ffd080" strength={0.8 * lit * house} />
        ))}
        <Halo position={[0, 0, 0]} size={4} color="#ffc070" strength={0.18 * lit * house} />
      </group>

      {/* row backs and the audience */}
      {Array.from({ length: 13 }, (_, i) => (
        <InkBox key={i} size={[7.4, 0.42, 0.05]} position={[-0.2, 0.21, 1.35 + i * 0.58 + 0.24]} color="#4a2a1a" ink={0.006} />
      ))}
      <Audience seats={HOUSE_SEATS} frame={frame} laugh={laugh} />
      <Audience seats={GALLERY_SEATS} frame={frame + 40} laugh={laugh} />
      <Audience seats={LEFT_GALLERY} frame={frame + 80} laugh={laugh} />

      {/* the stage: platform, boards, apron, footlights, proscenium, curtain, the painted drawing room */}
      <InkBox size={[6.8, STAGE.top, 4.4]} position={[0, STAGE.top / 2, -2.2]} color="#3a2414" ink={0.01} />
      <Surface id="stageFloor" position={[0, STAGE.top + 0.002, -2.1]} size={[6.6, 4.2]} rotation={[-Math.PI / 2, 0, 0]} color="#8a6a3a" make={() => boards("#b8905a", 9, 512, 512, 14)} repeat={[2, 1]} />
      <InkBox size={[6.9, 0.1, 0.12]} position={[0, STAGE.top - 0.02, 0.0]} color="#d8b048" ink={0.008} />
      <InkBox size={[6.6, 0.12, 0.14]} position={[0, STAGE.top + 0.06, -0.12]} color="#2a1a10" ink={0.006} />
      {Array.from({ length: 17 }, (_, i) => {
        const x = -2.9 + i * 0.3625;
        const f = 0.85 + 0.15 * Math.sin(frame * 0.5 + i * 2.1);
        return (
          <group key={i} position={[x, STAGE.top + 0.13, -0.1]}>
            <mesh>
              <sphereGeometry args={[0.035, 10, 8]} />
              <meshBasicMaterial color={new THREE.Color(3 * lit * foot * f, 2.1 * lit * foot * f, 0.7 * lit * foot)} toneMapped={false} />
            </mesh>
            {lit * foot > 0.05 && <Halo position={[0, 0.05, -0.05]} size={0.7} color="#ffc070" strength={0.5 * lit * foot * f} />}
          </group>
        );
      })}
      {lit * foot > 0.05 && <LightShaft from={[0, STAGE.top + 0.1, -0.05]} to={[0, 2.4, -1.4]} width={6.4} color="#ffc070" opacity={0.08 * lit * foot} />}
      {/* proscenium pillars and header */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <InkBox size={[0.5, 5.0, 0.4]} position={[s * 3.35, 2.5, -0.35]} color="#efe2c4" ink={0.012} />
          <InkBox size={[0.06, 4.6, 0.42]} position={[s * 3.13, 2.6, -0.35]} color="#d8a840" ink={0.006} />
          {/* side curtains */}
          <InkBox size={[0.45, 4.2, 0.12]} position={[s * 2.92, 2.7, -0.6]} color="#8e1a26" ink={0.01} />
        </group>
      ))}
      <InkBox size={[7.2, 0.9, 0.4]} position={[0, 5.0, -0.35]} color="#efe2c4" ink={0.012} />
      <InkBox size={[6.2, 0.08, 0.42]} position={[0, 4.58, -0.35]} color="#d8a840" ink={0.006} />
      {/* the curtain: up during the play, down at intermission */}
      <InkBox size={[6.0, 0.7, 0.14]} position={[0, 4.2, -0.6]} color="#8e1a26" ink={0.01} />
      {mode === "intermission" && <InkBox size={[5.9, 3.6, 0.1]} position={[0, STAGE.top + 1.8, -0.7]} color="#9a2030" ink={0.01} />}
      <Painted position={[0, STAGE.top + 1.9, -4.1]} size={[6.2, 3.8]} draw={dropCanvas} />
      {/* wings */}
      {[-1, 1].map((s) =>
        [-1.4, -2.6].map((z) => <InkBox key={`${s}${z}`} size={[0.06, 3.6, 0.9]} position={[s * 2.7, STAGE.top + 1.8, z]} color="#6a845e" ink={0.008} />),
      )}
      {/* a few stage props in the drawing room: a settee and a table */}
      <InkBox size={[1.0, 0.35, 0.4]} position={[-1.2, STAGE.top + 0.2, -2.6]} color="#7a3a4a" ink={0.01} />
      <InkBox size={[1.0, 0.4, 0.08]} position={[-1.2, STAGE.top + 0.5, -2.8]} color="#7a3a4a" ink={0.01} />
      <InkCylinder radius={0.32} height={0.04} position={[1.3, STAGE.top + 0.45, -2.2]} color="#6a4a2a" ink={0.008} />
      <InkCylinder radius={0.04} height={0.45} position={[1.3, STAGE.top + 0.22, -2.2]} color="#6a4a2a" ink={0.006} />

      {/* the dress circle: left, back and right galleries with cream fronts and gas jets */}
      {[
        { p: [-4.35, 1.0, 5.5] as Vec3, s: [1.3, 2.0, 7.0] as Vec3 },
        { p: [0, 1.0, 9.65] as Vec3, s: [10, 2.0, 1.3] as Vec3 },
        { p: [(GALLERY.x0 + GALLERY.x1) / 2, 1.0, 5.9] as Vec3, s: [GALLERY.x1 - GALLERY.x0, 2.0, 7.4] as Vec3 },
      ].map((g, i) => (
        <InkBox key={i} size={g.s} position={g.p} color="#3a2216" ink={0} />
      ))}
      {/* fronts */}
      <InkBox size={[0.1, 0.5, 7.0]} position={[-3.68, 2.2, 5.5]} color="#efe2c4" ink={0.01} />
      <InkBox size={[7.4, 0.5, 0.1]} position={[-0.2, 2.2, 8.97]} color="#efe2c4" ink={0.01} />
      <InkBox size={[0.1, 0.5, 7.4]} position={[GALLERY.x0 - 0.02, 2.2, 5.9]} color="#efe2c4" ink={0.01} />
      <InkBox size={[0.12, 0.05, 7.0]} position={[-3.68, 2.46, 5.5]} color="#d8a840" ink={0.006} />
      <InkBox size={[7.4, 0.05, 0.12]} position={[-0.2, 2.46, 8.97]} color="#d8a840" ink={0.006} />
      <InkBox size={[0.12, 0.05, 7.4]} position={[GALLERY.x0 - 0.02, 2.46, 5.9]} color="#d8a840" ink={0.006} />
      {[2.8, 4.6, 6.4, 8.2].map((z) => (
        <React.Fragment key={z}>
          <Halo position={[-3.6, 2.62, z]} size={0.45} color="#ffd080" strength={0.7 * lit * house} />
          <Halo position={[GALLERY.x0 + 0.06, 2.62, z]} size={0.45} color="#ffd080" strength={0.7 * lit * house} />
        </React.Fragment>
      ))}
      {[-2.4, 0, 2.4].map((x) => (
        <Halo key={x} position={[x, 2.62, 8.9]} size={0.45} color="#ffd080" strength={0.7 * lit * house} />
      ))}
      {/* the right gallery's back wall: the passage door to the State Box, Parker's chair beside it */}
      <group position={[GALLERY.x1 - 0.02, 2.0, GALLERY.door]} rotation={[0, -Math.PI / 2, 0]}>
        <InkBox size={[0.95, 2.05, 0.06]} position={[0, 1.02, 0]} color="#f2ece0" ink={0.01} />
        <InkBox size={[0.78, 1.9, 0.04]} position={[0, 0.98, 0.04]} color="#f8f4ec" ink={0.008} />
        <InkCylinder radius={0.025} height={0.05} position={[0.3, 0.95, 0.08]} rotation={[Math.PI / 2, 0, 0]} color="#d8b048" ink={0.004} />
      </group>
      {galleryChair && <GuardChair position={[GALLERY.x1 - 0.42, GALLERY.y, GALLERY.door + 0.75]} rotationY={-Math.PI / 2 + 0.3} />}
      <GasBracket position={[GALLERY.x1 - 0.03, GALLERY.y + 1.75, GALLERY.door + 1.4]} rotationY={-Math.PI / 2} frame={frame} lit={lit} />

      {/* the State Box, high beside the stage, with Lincoln's rocker and Mary's chair */}
      <group position={[BOX.x, BOX.y, BOX.z]} rotation={[0, BOX.rot, 0]}>
        <BlenderModel src={MODELS.statebox} ink={0.012} />
      </group>
      <Rocker position={boxWorld(LINCOLN_SEAT.lx, LINCOLN_SEAT.lz - 0.06)} rotationY={BOX.rot - 0.25} rock={rock} />
      <TopHat position={boxWorld(1.18, 0.0, 0.5)} rotation={[0, 0, 0.1]} scale={0.8} />
      <pointLight position={boxWorld(0, 0.6, 1.2)} intensity={1.6 * lit + 0.3} distance={2.6} color="#ffd8a8" />

      {/* gas haze over the house */}
      {lit > 0.05 && (
        <>
          <HazeCard position={[0, 2.6, 1.0]} size={[9, 4]} color="#ffb860" opacity={0.1 * lit} />
          <HazeCard position={[0, 3.6, 4.5]} size={[10, 5]} color="#ffc070" opacity={0.07 * lit * house} />
          <Motes center={[0.5, 2.8, 2.0]} size={[6, 3.5, 3]} frame={frame} count={140} seed={3} speck={0.007} />
        </>
      )}
      {children}
      </group>
    </>
  );
};

export const houseLight = (dark = 0, mode: HouseMode = "show", drop = 0): PuppetLight => ({
  tint: "#ffd8b0",
  tintAmount: 0.1,
  shadow: 0.2 + dark * 0.5,
  points: [{ position: [0, 1.0 - drop, 0.6], color: "#ffc070", strength: (mode === "show" ? 2.0 : 1.0) * (1 - dark), range: 6 }],
  distant: [{ direction: [-0.4, 0.8, 0.5], color: "#ffd8a0", strength: 0.9 * (1 - dark) + 0.1 }],
});
export const boxLight = (dark = 0, drop = 0): PuppetLight => ({
  tint: "#ffd8b0",
  tintAmount: 0.1,
  shadow: 0.25,
  points: [{ position: [0, 1.4 - drop, 0.4], color: "#ffc070", strength: 1.8 * (1 - dark), range: 6 }],
  distant: [{ direction: [-0.8, 0.5, 0.4], color: "#ffd8a0", strength: 1.1 * (1 - dark) + 0.1 }],
});

// ---------- the dress circle passage, the vestibule and the stairs ----------

export const PASS = { back: -1, front: 1.2, x0: -1.6, x1: 2.6, h: 2.6, door: 0.7, vx0: 0.3, vx1: 1.1, vend: -3.2 };
export const CHAIR_AT: Vec3 = [-0.05, 0, -0.66];
export const STAIR = { steps: 12, run: 0.28, rise: 0.17 }; // down toward -x from x0

export type PassMode = "night" | "booth" | "whatif" | "dawn";
const PASS_LOOK: Record<PassMode, { bg: string; amb: [number, string]; hemi: [string, string, number]; wall: string; motif: string; gas: number; gasColor: string; stair: string }> = {
  night: { bg: "#041614", amb: [0.75, "#6ad8d0"], hemi: ["#6ad0c8", "#0a1a18", 0.6], wall: "#24a094", motif: "#5ad0c0", gas: 0.7, gasColor: "#ffe0b0", stair: "#7a1a24" },
  booth: { bg: "#0c0406", amb: [0.28, "#d88888"], hemi: ["#c86060", "#140808", 0.35], wall: "#5a2a30", motif: "#7a3a40", gas: 1, gasColor: "#ffb060", stair: "#8a1424" },
  whatif: { bg: "#160a2a", amb: [0.75, "#c8a8ff"], hemi: ["#d0b0ff", "#2a1a40", 0.55], wall: "#5a4a9a", motif: "#7a6ab8", gas: 0.8, gasColor: "#ffd0f0", stair: "#5a2a7a" },
  dawn: { bg: "#8a96a8", amb: [0.75, "#c8d4e4"], hemi: ["#d0dcec", "#3a4048", 0.6], wall: "#6a7a84", motif: "#7e8e98", gas: 0, gasColor: "#ffc070", stair: "#5a3a44" },
};

export const PassageSet: React.FC<{ camera: CameraShot; frame: number; mode: PassMode; doorOpen?: number; boxDoor?: number; chair?: boolean; children?: React.ReactNode }> = ({ camera, frame, mode, doorOpen = 0, boxDoor = 0.15, chair = true, children }) => {
  const L = PASS_LOOK[mode];
  const wallMake = () => wallpaper(L.wall, L.motif, mode === "booth" ? null : "rgba(0,0,0,0.08)", 21);
  const stairWall = () => wallpaper(L.stair, "rgba(255,200,160,0.35)", null, 23);
  const gasPos: Vec3 = [-0.75, 1.75, PASS.back + 0.02];
  const topGas: Vec3 = [PASS.x0 - 0.45, 1.85, PASS.back + 0.02];
  const H = PASS.h;
  return (
    <>
      <Air camera={camera} bg={L.bg} fog={[7, 18]} amb={L.amb} hemi={L.hemi} sun={mode === "dawn" ? { at: [5, 6, 3], color: "#dce6f4", i: 0.9, box: 6 } : mode === "whatif" ? { at: [-3, 6, 4], color: "#ffd8f8", i: 1.0, box: 6 } : undefined} />
      {L.gas > 0 && <pointLight position={[gasPos[0], gasPos[1] + 0.15, gasPos[2] + 0.4]} intensity={4.5 * L.gas} distance={5} color={L.gasColor} decay={1.5} castShadow shadow-mapSize={[1024, 1024]} />}
      {L.gas > 0 && <pointLight position={[topGas[0], topGas[1] + 0.15, topGas[2] + 0.4]} intensity={mode === "booth" ? 7 : 3} distance={5} color={L.gasColor} decay={1.5} />}
      {/* floors: passage carpet, stair carpet */}
      <Surface id={`pf${mode}`} position={[0.5, 0, 0.1]} size={[4.2, 2.2]} rotation={[-Math.PI / 2, 0, 0]} color={mode === "dawn" ? "#6a5a5a" : "#6a2028"} make={() => boards("#b86a5a", 31, 512, 256, 6)} repeat={[2, 1]} />
      <Surface id={`vf${mode}`} position={[(PASS.vx0 + PASS.vx1) / 2, 0.001, (PASS.back + PASS.vend) / 2]} size={[PASS.vx1 - PASS.vx0, -PASS.vend + PASS.back]} rotation={[-Math.PI / 2, 0, 0]} color="#5a2a22" make={() => boards("#a87a5a", 33, 256, 512, 8)} />
      {/* back wall with the door opening; vestibule walls; the end wall with the box door */}
      <Surface id={`bw1${mode}`} position={[(PASS.x0 - 4.6 + PASS.door - 0.45) / 2, H / 2, PASS.back]} size={[PASS.door - 0.45 - PASS.x0 + 4.6, H]} color="#ffffff" make={wallMake} repeat={[3, 1.6]} />
      <Surface id={`bw2${mode}`} position={[(PASS.door + 0.45 + PASS.x1) / 2, H / 2, PASS.back]} size={[PASS.x1 - PASS.door - 0.45, H]} color="#ffffff" make={wallMake} repeat={[1.2, 1.6]} />
      <Surface id={`bw3${mode}`} position={[PASS.door, 2.25, PASS.back]} size={[0.9, 0.7]} color="#ffffff" make={wallMake} repeat={[0.5, 0.4]} />
      <InkBox size={[4.2 + 4.6, 0.12, 0.05]} position={[(PASS.x0 - 4.6 + PASS.x1) / 2, 0.06, PASS.back + 0.03]} color="#3a2216" ink={0.006} />
      <InkBox size={[4.2 + 4.6, 0.06, 0.05]} position={[(PASS.x0 - 4.6 + PASS.x1) / 2, H - 0.03, PASS.back + 0.03]} color="#d8b048" ink={0.006} />
      {[PASS.vx0, PASS.vx1].map((x, i) => (
        <InkBox key={x} size={[0.08, H, -PASS.vend + PASS.back]} position={[x + (i ? 0.04 : -0.04), H / 2, (PASS.back + PASS.vend) / 2]} color={L.wall} ink={0.012} />
      ))}
      <InkBox size={[PASS.vx1 - PASS.vx0 + 0.16, H, 0.08]} position={[(PASS.vx0 + PASS.vx1) / 2, H / 2, PASS.vend - 0.04]} color={L.wall} ink={0.012} />
      {/* the box door at the end of the vestibule, ajar onto the warm light of the box */}
      <mesh position={[(PASS.vx0 + PASS.vx1) / 2, 0.95, PASS.vend + 0.005]}>
        <planeGeometry args={[0.62, 1.85]} />
        <meshBasicMaterial color={mode === "dawn" ? "#3a3a40" : new THREE.Color(1.6, 1.0, 0.45)} toneMapped={false} />
      </mesh>
      <group position={[PASS.vx0 + 0.09, 0, PASS.vend + 0.04]} rotation={[0, -boxDoor * 1.4, 0]}>
        <InkBox size={[0.62, 1.85, 0.04]} position={[0.31, 0.925, 0]} color="#f2ece0" ink={0.008} />
      </group>
      {/* the white passage door, hinged on its left, opening inward (toward -z) */}
      <InkBox size={[0.98, 2.08, 0.06]} position={[PASS.door, 1.04, PASS.back + 0.005]} color="#f4efe2" ink={0} />
      <mesh position={[PASS.door, 0.97, PASS.back - 0.02]}>
        <planeGeometry args={[0.82, 1.92]} />
        <meshBasicMaterial color={mode === "dawn" ? "#2a2a30" : mode === "whatif" ? "#3a2a5a" : "#2a1410"} />
      </mesh>
      <group position={[PASS.door - 0.41, 0, PASS.back - 0.03]} rotation={[0, doorOpen * 1.5, 0]}>
        <InkBox size={[0.82, 1.92, 0.05]} position={[0.41, 0.96, 0]} color="#f8f4ea" ink={0.01} />
        <InkBox size={[0.6, 0.7, 0.01]} position={[0.41, 1.36, 0.03]} color="#ece4d4" ink={0.004} />
        <InkBox size={[0.6, 0.6, 0.01]} position={[0.41, 0.5, 0.03]} color="#ece4d4" ink={0.004} />
        <InkCylinder radius={0.028} height={0.05} position={[0.72, 0.96, 0.05]} rotation={[Math.PI / 2, 0, 0]} color="#d8b048" ink={0.004} />
      </group>
      {/* right end wall with a small high window (grey at dawn) */}
      <InkBox size={[0.08, H, 2.3]} position={[PASS.x1 + 0.04, H / 2, 0.1]} color={L.wall} ink={0.012} />
      <mesh position={[PASS.x1 - 0.005, 1.9, 0.0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[0.6, 0.6]} />
        <meshBasicMaterial color={mode === "dawn" ? new THREE.Color(1.4, 1.5, 1.7) : mode === "whatif" ? "#6a5aa8" : "#0a1828"} toneMapped={false} />
      </mesh>
      <InkBox size={[0.04, 0.66, 0.05]} position={[PASS.x1 - 0.02, 1.9, 0]} color="#3a2a22" ink={0.004} />
      <InkBox size={[0.04, 0.05, 0.66]} position={[PASS.x1 - 0.02, 1.9, 0]} color="#3a2a22" ink={0.004} />
      {mode === "dawn" && <LightShaft from={[PASS.x1 - 0.1, 1.9, 0]} to={[CHAIR_AT[0] + 0.3, 0.3, CHAIR_AT[2] + 0.2]} width={0.7} color="#dce8ff" opacity={0.22} />}
      {/* the gas brackets */}
      <GasBracket position={gasPos} frame={frame} lit={L.gas} color={L.gasColor} />
      <GasBracket position={topGas} frame={frame + 30} lit={L.gas} color={L.gasColor} glow={mode === "booth" ? 1.5 : 1} />
      <Motes center={[gasPos[0] + 0.3, 1.4, -0.3]} size={[1.6, 1.8, 1.2]} frame={frame} count={70} color={mode === "dawn" ? "#e8f0ff" : L.gasColor} seed={5} />
      {mode === "dawn" && <Motes center={[1.4, 1.2, -0.2]} size={[2.2, 1.6, 1.0]} frame={frame} count={70} color="#eef4ff" seed={6} />}
      {/* the chair */}
      {chair && <GuardChair position={CHAIR_AT} rotationY={0.25} />}
      {/* the stairs down to the left: crimson carpet, a side wall and a banister with a newel post */}
      {Array.from({ length: STAIR.steps }, (_, i) => {
        const x = PASS.x0 - (i + 0.5) * STAIR.run;
        const y = -(i + 1) * STAIR.rise;
        return (
          <group key={i}>
            <InkBox size={[STAIR.run, STAIR.rise, 2.0]} position={[x, y + STAIR.rise / 2, 0.1]} color={L.stair} ink={0.006} />
            <InkBox size={[0.04, 0.02, 1.6]} position={[x + STAIR.run / 2 - 0.02, y + STAIR.rise + 0.005, 0.1]} color="#d8b048" ink={0} />
          </group>
        );
      })}
      <InkBox size={[STAIR.steps * STAIR.run + 1.5, 4.8, 0.1]} position={[PASS.x0 - (STAIR.steps * STAIR.run) / 2 - 0.5, -0.1, -0.95]} color="#ffffff" ink={0} />
      <Surface id={`sw${mode}`} position={[PASS.x0 - (STAIR.steps * STAIR.run) / 2 - 0.5, 0.2, -0.89]} size={[STAIR.steps * STAIR.run + 1.5, 4.8]} color="#ffffff" make={stairWall} repeat={[3, 3]} />
      <Surface id={`lf${mode}`} position={[PASS.x0 - STAIR.steps * STAIR.run - 1.0, -STAIR.steps * STAIR.rise, 0.6]} size={[2.0, 3.0]} rotation={[-Math.PI / 2, 0, 0]} color="#4a1a20" make={() => boards("#8a4a3a", 35)} />
      {/* banister on the open side */}
      <group>
        {(() => {
          const a: Vec3 = [PASS.x0 - STAIR.steps * STAIR.run, -STAIR.steps * STAIR.rise + 0.85, 1.05];
          const b: Vec3 = [PASS.x0 + 0.1, 0.85, 1.05];
          const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          return (
            <>
              <InkBox size={[len, 0.07, 0.08]} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]]} rotation={[0, 0, ang]} color="#4a2414" ink={0.008} />
              {Array.from({ length: STAIR.steps }, (_, i) => {
                const x = PASS.x0 - (i + 0.5) * STAIR.run;
                const y = -(i + 1) * STAIR.rise + STAIR.rise;
                return <InkCylinder key={i} radius={0.018} height={0.85} position={[x, y + 0.42, 1.05]} color="#5a2a18" ink={0.004} />;
              })}
              <InkCylinder radius={0.06} height={1.1} position={[a[0], a[1] - 0.3, a[2]]} color="#4a2414" ink={0.008} />
              <mesh position={[a[0], a[1] + 0.28, a[2]]}>
                <sphereGeometry args={[0.08, 14, 10]} />
                <meshToonMaterial color="#5a2a18" gradientMap={toonRamp} />
              </mesh>
            </>
          );
        })()}
      </group>
      {/* the bench where the footman waits */}
      <InkBox size={[0.7, 0.34, 0.32]} position={[1.95, 0.17, -0.8]} color="#5a3420" ink={0.01} />
      {children}
    </>
  );
};

export const passLight = (mode: PassMode): PuppetLight => {
  if (mode === "night") return { tint: "#bfe0dc", tintAmount: 0.12, shadow: 0.3, points: [{ position: [-0.75, 1.9, -0.6], color: "#ffc070", strength: 2.4, range: 4 }] };
  if (mode === "booth") return { tint: "#e0b0b0", tintAmount: 0.14, shadow: 0.45, points: [{ position: [-2.05, 2.0, -0.6], color: "#ffb060", strength: 3.0, range: 4 }] };
  if (mode === "whatif") return { tint: "#e8d8ff", tintAmount: 0.14, shadow: 0.2, distant: [{ direction: [-0.6, 0.6, 0.6], color: "#ffd8f8", strength: 1.2 }] };
  return { tint: "#d8e0ec", tintAmount: 0.14, shadow: 0.25, distant: [{ direction: [1, 0.5, 0.2], color: "#e0e8ff", strength: 1.0 }] };
};

// ---------- the Star Saloon ----------

const streetCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  // 10th Street at night: the brick front of Ford's Theatre with its arched doors lit, gas lamps, a carriage
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#0e1a3a");
  g.addColorStop(0.5, "#22346a");
  g.addColorStop(1, "#2a3050");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#4a2a2a";
  ctx.fillRect(w * 0.05, h * 0.15, w * 0.95, h * 0.62);
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 5; c++) {
      ctx.fillStyle = "#1a2040";
      ctx.fillRect(w * (0.12 + c * 0.17), h * (0.2 + r * 0.16), w * 0.07, h * 0.1);
    }
  for (let c = 0; c < 5; c++) {
    ctx.fillStyle = "#ffcf7a";
    ctx.beginPath();
    ctx.moveTo(w * (0.1 + c * 0.17), h * 0.77);
    ctx.lineTo(w * (0.1 + c * 0.17), h * 0.6);
    ctx.arc(w * (0.145 + c * 0.17), h * 0.6, w * 0.045, Math.PI, 0);
    ctx.lineTo(w * (0.19 + c * 0.17), h * 0.77);
    ctx.fill();
  }
  ctx.fillStyle = "#1a1a28";
  ctx.fillRect(0, h * 0.77, w, h * 0.23);
  ctx.fillStyle = "#3a3a52";
  ctx.fillRect(0, h * 0.77, w, h * 0.02);
  for (const x of [0.02, 0.55]) {
    ctx.fillStyle = "#101018";
    ctx.fillRect(w * x, h * 0.4, 6, h * 0.42);
    ctx.fillStyle = "#ffe0a0";
    ctx.beginPath();
    ctx.arc(w * x + 3, h * 0.4, 14, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const SALOON = { bar: -0.55, barTop: 0.62, back: -1.9, win: 1.75 };

export const SaloonSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const sw = 0.9 + 0.1 * Math.sin(frame * 0.05);
  return (
    <>
      <Air camera={camera} bg="#08140a" fog={[6, 14]} amb={[0.65, "#c8f0b0"]} hemi={["#b8e8a0", "#102010", 0.5]} sun={{ at: [-2, 5, 3], color: "#e8f8c0", i: 0.9, box: 5 }} />
      <pointLight position={[-0.3, 2.0, -0.2]} intensity={5} distance={5} color="#f0e8a0" decay={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[SALOON.win, 1.3, SALOON.back + 0.6]} intensity={1.6} distance={3} color="#6a88d8" />
      <Surface id="sfloor" position={[0, 0, 0]} size={[6, 5]} rotation={[-Math.PI / 2, 0, 0]} color="#3a4a2a" make={() => boards("#9a7048", 41)} repeat={[3, 2]} />
      <Surface id="swall" position={[-0.6, 1.5, SALOON.back]} size={[3.6, 3.0]} color="#ffffff" make={() => wallpaper("#3e8a3a", "#6ab45a", "rgba(0,30,0,0.12)", 43)} repeat={[2, 1.6]} />
      <Surface id="swallR" position={[2.55, 1.5, SALOON.back]} size={[0.7, 3.0]} color="#ffffff" make={() => wallpaper("#3e8a3a", "#6ab45a", "rgba(0,30,0,0.12)", 44)} repeat={[0.5, 1.6]} />
      <Surface id="swallL" position={[-2.4, 1.5, 0]} size={[4, 3.0]} rotation={[0, Math.PI / 2, 0]} color="#ffffff" make={() => wallpaper("#3e8a3a", "#6ab45a", "rgba(0,30,0,0.12)", 45)} repeat={[2, 1.6]} />
      <InkBox size={[6, 0.9, 0.06]} position={[0, 0.45, SALOON.back + 0.03]} color="#4a3018" ink={0.006} />
      <Surface id="sceil" position={[0, 2.7, 0]} size={[6, 5]} rotation={[Math.PI / 2, 0, 0]} color="#6a5a3a" make={() => boards("#8a7a52", 47, 512, 512, 8)} repeat={[3, 2]} />
      {/* the window onto 10th Street */}
      <Painted position={[SALOON.win, 1.35, SALOON.back - 0.3]} size={[1.4, 1.5]} draw={streetCanvas} emissive={0.9} />
      <InkBox size={[1.2, 0.08, 0.1]} position={[SALOON.win, 0.62, SALOON.back + 0.02]} color="#3a2414" ink={0.008} />
      <InkBox size={[1.2, 0.08, 0.1]} position={[SALOON.win, 2.08, SALOON.back + 0.02]} color="#3a2414" ink={0.008} />
      <InkBox size={[0.06, 1.5, 0.1]} position={[SALOON.win, 1.35, SALOON.back + 0.02]} color="#3a2414" ink={0.006} />
      <InkBox size={[1.2, 0.04, 0.08]} position={[SALOON.win, 1.35, SALOON.back + 0.02]} color="#3a2414" ink={0.006} />
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.08, 1.54, 0.1]} position={[SALOON.win + s * 0.6, 1.35, SALOON.back + 0.02]} color="#3a2414" ink={0.008} />
      ))}
      <LightShaft from={[SALOON.win, 1.4, SALOON.back + 0.05]} to={[SALOON.win - 0.6, 0.0, SALOON.back + 1.6]} width={1.2} color="#7a9aff" opacity={0.12} />
      {/* the back bar: shelves of bottles, a mirror */}
      <InkBox size={[2.6, 1.0, 0.4]} position={[-0.7, 0.5, SALOON.back + 0.22]} color="#2a3a1a" ink={0.01} />
      <InkBox size={[2.2, 0.8, 0.03]} position={[-0.7, 1.55, SALOON.back + 0.03]} color="#8aa0a0" ink={0.01} />
      <InkBox size={[2.4, 0.06, 0.25]} position={[-0.7, 1.12, SALOON.back + 0.14]} color="#5a3418" ink={0.006} />
      <InkBox size={[2.4, 0.06, 0.25]} position={[-0.7, 2.05, SALOON.back + 0.14]} color="#5a3418" ink={0.006} />
      {Array.from({ length: 14 }, (_, i) => (
        <Bottle key={i} position={[-1.85 + i * 0.165, i % 2 ? 2.08 : 1.15, SALOON.back + 0.16]} color={["#2f6a3a", "#6a3a1a", "#3a5a2a", "#8a6a2a"][i % 4]} h={0.2 + rand(i) * 0.08} />
      ))}
      {/* the bar counter: brass foot rail */}
      <InkBox size={[3.0, SALOON.barTop, 0.5]} position={[-0.6, SALOON.barTop / 2, SALOON.bar]} color="#5a3418" ink={0.012} />
      <InkBox size={[3.1, 0.05, 0.6]} position={[-0.6, SALOON.barTop + 0.02, SALOON.bar]} color="#7a4a24" ink={0.008} />
      <InkCylinder radius={0.02} height={3.0} position={[-0.6, 0.12, SALOON.bar + 0.33]} rotation={[0, 0, Math.PI / 2]} color="#d8b048" ink={0.004} />
      {[-1.6, -0.6, 0.4].map((x) => (
        <InkBox key={x} size={[0.5, 0.42, 0.02]} position={[x, 0.32, SALOON.bar + 0.26]} color="#6a4020" ink={0.004} />
      ))}
      <Bottle position={[-1.6, SALOON.barTop + 0.04, SALOON.bar - 0.05]} color="#6a3a1a" />
      <Glass position={[-1.3, SALOON.barTop + 0.04, SALOON.bar + 0.1]} />
      {/* the lamp over the bar, smoke in the light */}
      <group position={[-0.3, 2.2, -0.2]}>
        <InkCylinder radius={0.01} height={0.6} position={[0, 0.3, 0]} color="#2a2018" ink={0.004} />
        <mesh position={[0, -0.05, 0]}>
          <coneGeometry args={[0.28, 0.16, 18, 1, true]} />
          <meshToonMaterial color="#3a5a2a" gradientMap={toonRamp} side={THREE.DoubleSide} />
        </mesh>
        <mesh position={[0, -0.1, 0]}>
          <sphereGeometry args={[0.07, 14, 10]} />
          <meshBasicMaterial color={new THREE.Color(2.8 * sw, 2.0 * sw, 0.8)} toneMapped={false} />
        </mesh>
        <Halo position={[0, -0.12, 0.1]} size={1.6 * sw} color="#ffc070" strength={0.45} />
      </group>
      <LightShaft from={[-0.3, 2.1, -0.2]} to={[-0.3, 0.6, -0.2]} width={1.5} color="#ffc070" opacity={0.12} />
      <HazeCard position={[0.2, 1.7, -0.5]} size={[4, 1.4]} color="#b8d890" opacity={0.12} />
      <HazeCard position={[-0.6, 2.1, -1.2]} size={[3, 1.0]} color="#a8c880" opacity={0.1} />
      <Motes center={[-0.3, 1.4, -0.3]} size={[2.0, 1.6, 1.2]} frame={frame} count={60} color="#ffd890" seed={9} />
      {children}
    </>
  );
};

export const saloonLight: PuppetLight = { tint: "#d8f0c0", tintAmount: 0.12, shadow: 0.25, points: [{ position: [-0.3, 2.0, -0.2], color: "#e8eca0", strength: 2.4, range: 4 }] };

// ---------- the White House north front, 11 April 1865, night ----------

export const WH = { front: -3.0, winY: 2.55, winX: 0.0 };

export const WhiteHouseSet: React.FC<{ camera: CameraShot; frame: number; drop?: number; children?: React.ReactNode }> = ({ camera, frame, drop = 0, children }) => {
  const crowd = React.useMemo(
    () =>
      makeSeats(Array.from({ length: 6 }, (_, i) => ({ z: 0.6 + i * 0.55, y: 0.28, x0: -3.2, x1: 3.2, step: 0.5 })), 19).map((s, i) =>
        // a few Union soldiers in the crowd (Lincoln spoke of "those who serve our cause as soldiers")
        i % 9 === 4 ? { ...s, coat: "#2a3a7a", skin: "#6a4230", hair: "#1a1210", bonnet: false } : s,
      ),
    [],
  );
  return (
    <>
      <Air camera={camera} bg="#0a1230" fog={[8, 30]} amb={[0.45, "#8aa0e0"]} hemi={["#7088d0", "#101420", 0.5]} sun={{ at: [-4, 7, 6], color: "#a8b8f0", i: 0.7, box: 8 }} />
      <group position={[0, -drop, 0]}>
      <SkyDome sun={[0.3, 0.4, -1]} stops={[[-0.1, "#1a2448"], [0.0, "#1e2c5a"], [0.15, "#18245a"], [0.4, "#0e1640"], [1.0, "#060a24"]]} glow="#3a4a8a" />
      <pointLight position={[WH.winX, WH.winY + 0.5, WH.front + 0.7]} intensity={5} distance={6} color="#ffc070" decay={1.4} />
      {/* ground: wet gravel drive, a lawn edge */}
      <Surface id="whg" position={[0, 0, 2]} size={[16, 14]} rotation={[-Math.PI / 2, 0, 0]} color="#3a3a48" make={() => boards("#6a6a7a", 51, 512, 512, 4)} repeat={[3, 3]} />
      {/* the facade: pale sandstone painted white, windows lit warm, the portico with columns */}
      <InkBox size={[14, 5.6, 0.4]} position={[0, 2.8, WH.front - 0.2]} color="#5a6488" ink={0.01} />
      {[-5.2, -3.4, 3.4, 5.2].map((x) =>
        [1.0, 3.3].map((y) => (
          <group key={`${x}${y}`}>
            <InkBox size={[0.8, 1.2, 0.06]} position={[x, y, WH.front + 0.02]} color="#bfc4d4" ink={0.008} />
            <mesh position={[x, y, WH.front + 0.06]}>
              <planeGeometry args={[0.62, 1.0]} />
              <meshBasicMaterial color={new THREE.Color(1.5, 1.05, 0.5)} toneMapped={false} />
            </mesh>
            <Halo position={[x, y, WH.front + 0.2]} size={1.6} color="#ffc070" strength={0.25} />
          </group>
        )),
      )}
      {/* the portico: columns, entablature, pediment */}
      {[-1.6, -0.55, 0.55, 1.6].map((x) => (
        <InkCylinder key={x} radius={0.17} height={2.1} position={[x, 1.05, WH.front + 1.4]} color="#7a84a8" ink={0.012} />
      ))}
      <InkBox size={[3.8, 0.3, 1.8]} position={[0, 2.25, WH.front + 0.8]} color="#7a84a8" ink={0.012} />
      <InkBox size={[3.9, 0.06, 1.85]} position={[0, 2.42, WH.front + 0.8]} color="#c8ccd8" ink={0.008} />
      <InkBox size={[1.2, 1.9, 0.06]} position={[0, 0.95, WH.front + 0.03]} color="#3a2a22" ink={0.01} />
      <Halo position={[0, 1.1, WH.front + 0.3]} size={1.8} color="#ffc070" strength={0.3} />
      {/* the window above the portico where Lincoln reads, a candle on the sill */}
      <InkBox size={[1.3, 1.5, 0.08]} position={[WH.winX, WH.winY + 0.75, WH.front + 0.02]} color="#bfc4d4" ink={0.008} />
      <mesh position={[WH.winX, WH.winY + 0.75, WH.front + 0.07]}>
        <planeGeometry args={[1.1, 1.3]} />
        <meshBasicMaterial color={new THREE.Color(1.3, 0.85, 0.42)} toneMapped={false} />
      </mesh>
      <InkBox size={[1.4, 0.08, 0.4]} position={[WH.winX, WH.winY - 0.02, WH.front + 0.25]} color="#a8b0c8" ink={0.008} />
      <Halo position={[WH.winX, WH.winY + 0.7, WH.front + 0.4]} size={3.2} color="#ffb860" strength={0.3} />
      {/* lanterns on poles and in hands, umbrellas, a light rain haze */}
      {[-2.6, 2.4].map((x, i) => (
        <group key={x}>
          <InkCylinder radius={0.03} height={2.4} position={[x, 1.2, 0.3]} color="#1a1a22" ink={0.006} />
          <Lantern position={[x, 2.4, 0.3]} frame={frame} seed={i} glow={1.4} />
          <pointLight position={[x, 2.5, 0.4]} intensity={1.5} distance={3.5} color="#ffb860" />
        </group>
      ))}
      <Audience seats={crowd} frame={frame} />
      {[[-1.9, 1.35, 1.2], [1.3, 1.4, 2.0], [-0.6, 1.38, 3.1], [2.6, 1.36, 3.4]].map(([x, y, z], i) => (
        <Umbrella key={i} position={[x, y, z]} color={["#1a1a22", "#2a2030", "#1a2420", "#30201a"][i]} tilt={(rand(i) - 0.5) * 0.3} />
      ))}
      {[[-1.2, 1.25, 2.4], [0.9, 1.2, 1.0], [2.0, 1.25, 2.8]].map(([x, y, z], i) => (
        <Lantern key={i} position={[x, y, z]} frame={frame} seed={i + 5} />
      ))}
      <HazeCard position={[0, 2.5, -0.5]} size={[12, 4]} color="#6a7ab8" opacity={0.12} />
      <Motes center={[0, 2.2, 1.5]} size={[6, 4, 4]} frame={frame * 6} count={160} color="#b8c8ff" seed={13} speck={0.004} />
      {children}
      </group>
    </>
  );
};

export const whLight: PuppetLight = { tint: "#b8c4f0", tintAmount: 0.14, shadow: 0.3, points: [{ position: [0, 0.45, -2.3], color: "#ffc070", strength: 1.8, range: 5 }], distant: [{ direction: [-0.4, 0.6, 0.6], color: "#a8b8f0", strength: 0.6 }] };

// ---------- interiors: Johnson's office, the police board room ----------

export const OfficeSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => (
  <>
    <Air camera={camera} bg="#06180c" fog={[6, 14]} amb={[0.8, "#b8f0c0"]} hemi={["#a8f0b0", "#0a2010", 0.6]} sun={{ at: [3, 5, 4], color: "#e0f8e0", i: 1.0, box: 5 }} />
    <pointLight position={[-0.6, 1.4, 0.2]} intensity={2.2} distance={4} color="#f0f0c0" decay={1.4} />
    <Surface id="ofloor" position={[0, 0, 0]} size={[7, 5]} rotation={[-Math.PI / 2, 0, 0]} color="#2a4a30" make={() => boards("#8a4a3a", 61)} repeat={[3, 2]} />
    <Surface id="owall" position={[0.4, 1.6, -1.6]} size={[6, 3.2]} color="#ffffff" make={() => wallpaper("#1e9a50", "#46c070", "rgba(0,40,10,0.12)", 63)} repeat={[3, 1.6]} />
    <InkBox size={[6, 1.0, 0.05]} position={[0.4, 0.5, -1.57]} color="#1a3a24" ink={0.006} />
    {/* a tall window with green drapes, night outside */}
    <mesh position={[2.1, 1.6, -1.58]}>
      <planeGeometry args={[0.9, 1.6]} />
      <meshBasicMaterial color="#1a2a4a" />
    </mesh>
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.3, 2.2, 0.08]} position={[2.1 + s * 0.55, 1.6, -1.5]} color="#2a5a3a" ink={0.01} />
    ))}
    {/* a framed portrait and a map of the Union on the wall */}
    <InkBox size={[0.7, 0.9, 0.05]} position={[-1.6, 1.9, -1.55]} color="#c8a040" ink={0.008} />
    <InkBox size={[0.58, 0.78, 0.02]} position={[-1.6, 1.9, -1.52]} color="#3a3028" ink={0} />
    {/* the desk lamp: green shade */}
    <group position={[-0.6, 0.78, -0.55]}>
      <InkCylinder radius={0.05} height={0.03} position={[0, 0.015, 0]} color="#c8a040" ink={0.004} />
      <InkCylinder radius={0.015} height={0.35} position={[0, 0.2, 0]} color="#c8a040" ink={0.004} />
      <mesh position={[0, 0.4, 0]}>
        <coneGeometry args={[0.16, 0.12, 18, 1, true]} />
        <meshToonMaterial color="#2a7a4a" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <Halo position={[0, 0.34, 0.1]} size={0.9} color="#ffd890" strength={0.5} />
    </group>
    <HazeCard position={[-0.4, 1.3, -0.6]} size={[3, 1.6]} color="#ffe0a0" opacity={0.06} />
    <Motes center={[-0.2, 1.2, -0.3]} size={[2.2, 1.5, 1]} frame={frame} count={50} color="#ffe8b0" seed={17} />
    {children}
  </>
);
export const officeLight: PuppetLight = { tint: "#d8f0d8", tintAmount: 0.1, shadow: 0.25, points: [{ position: [-0.6, 1.3, -0.3], color: "#e0f0c0", strength: 1.8, range: 3 }] };

export const HearingSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => (
  <>
    <Air camera={camera} bg="#0c1220" fog={[6, 14]} amb={[0.7, "#b8c8e0"]} hemi={["#c0d0e8", "#1a1e28", 0.55]} sun={{ at: [-3, 5, 3], color: "#dce6f4", i: 1.1, box: 5 }} />
    <Surface id="hfloor" position={[0, 0, 0]} size={[7, 6]} rotation={[-Math.PI / 2, 0, 0]} color="#4a4a52" make={() => boards("#7a7a84", 71)} repeat={[3, 2]} />
    <Surface id="hwall" position={[0, 1.6, -2.2]} size={[7, 3.2]} color="#ffffff" make={() => wallpaper("#4a5a74", "#5e6e88", null, 73)} repeat={[3, 1.6]} />
    <InkBox size={[7, 1.0, 0.05]} position={[0, 0.5, -2.17]} color="#2a2a34" ink={0.006} />
    {/* tall windows with grey daylight */}
    {[-1.6, 1.6].map((x) => (
      <group key={x}>
        <mesh position={[x, 1.8, -2.16]}>
          <planeGeometry args={[0.8, 1.5]} />
          <meshBasicMaterial color={new THREE.Color(1.2, 1.3, 1.45)} toneMapped={false} />
        </mesh>
        <InkBox size={[0.05, 1.5, 0.05]} position={[x, 1.8, -2.14]} color="#2a2a34" ink={0.004} />
        <LightShaft from={[x, 1.8, -2.1]} to={[x + 0.6, 0.2, -0.4]} width={0.8} color="#dce6ff" opacity={0.1} />
      </group>
    ))}
    {/* the board table across the room */}
    <InkBox size={[3.0, 0.05, 0.8]} position={[0, 0.43, -1.2]} color="#4a2a18" ink={0.01} />
    <InkBox size={[3.0, 0.4, 0.05]} position={[0, 0.2, -0.82]} color="#3a2214" ink={0.01} />
    <Motes center={[0, 1.4, -1]} size={[3, 1.6, 1.5]} frame={frame} count={50} color="#e8f0ff" seed={23} />
    {children}
  </>
);
export const hearingLight: PuppetLight = { tint: "#d0dcec", tintAmount: 0.12, shadow: 0.22, distant: [{ direction: [-0.4, 0.6, -0.6], color: "#e0e8ff", strength: 1.0 }] };


// ---------- the stairs up to the dress circle (Booth's climb): rising toward +x from y = 0 ----------

export const UP = { steps: 12, run: 0.28, rise: 0.17 };
export const stairUp = (x: number) => Math.max(0, Math.min(UP.steps * UP.rise, x * (UP.rise / UP.run)));

export const StairsSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const top = UP.steps * UP.rise;
  const len = UP.steps * UP.run;
  const gas: Vec3 = [len + 0.35, top + 1.8, -0.93];
  return (
    <>
      <Air camera={camera} bg="#0c0406" fog={[6, 16]} amb={[0.25, "#d88888"]} hemi={["#c86060", "#140808", 0.3]} />
      <pointLight position={[gas[0], gas[1] + 0.1, gas[2] + 0.5]} intensity={9} distance={6} color="#ffb060" decay={1.4} castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[len + 1.2, top + 1.2, 0.2]} intensity={5} distance={4} color="#ffc070" />
      <Surface id="stfloor" position={[-1.5, 0, 0.2]} size={[3, 3]} rotation={[-Math.PI / 2, 0, 0]} color="#4a1a20" make={() => boards("#8a4a3a", 81)} />
      <Surface id="stland" position={[len + 1.0, top + 0.002, 0.1]} size={[2, 2.2]} rotation={[-Math.PI / 2, 0, 0]} color="#6a2028" make={() => boards("#b86a5a", 82)} />
      <InkBox size={[2, top, 2.2]} position={[len + 1.0, top / 2, 0.1]} color="#2a1014" ink={0} />
      {Array.from({ length: UP.steps }, (_, i) => (
        <group key={i} userData={{ ghost: true }}>
          <InkBox size={[UP.run, (i + 1) * UP.rise, 2.0]} position={[(i + 0.5) * UP.run, ((i + 1) * UP.rise) / 2, 0.1]} color="#8a1424" ink={0.006} />
          <InkBox size={[0.04, 0.02, 1.6]} position={[i * UP.run + 0.02, (i + 1) * UP.rise + 0.005, 0.1]} color="#d8b048" ink={0} />
        </group>
      ))}
      <Surface id="stwall" position={[len / 2, 2.0, -0.95]} size={[len + 6, 5]} color="#ffffff" make={() => wallpaper("#8a1424", "rgba(255,200,160,0.35)", null, 83)} repeat={[5, 3]} />
      {/* the top: a doorway glowing onto the dress circle */}
      <mesh position={[len + 1.95, top + 1.05, 0.1]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[1.0, 2.1]} />
        <meshBasicMaterial color={new THREE.Color(1.8, 1.15, 0.5)} toneMapped={false} />
      </mesh>
      <Halo position={[len + 1.8, top + 1.1, 0.1]} size={3.2} color="#ffb060" strength={0.35} />
      <GasBracket position={gas} frame={frame} lit={1} color="#ffb060" glow={1.6} />
      <LightShaft from={[gas[0], gas[1] + 0.1, gas[2] + 0.25]} to={[len * 0.5, top * 0.5, 0.2]} width={1.4} color="#ffb060" opacity={0.14} />
      <Motes center={[len * 0.7, top + 0.6, -0.2]} size={[2.5, 2.2, 1.4]} frame={frame} count={90} color="#ffc080" seed={29} />
      {/* banister on the open side: rail, balusters, a newel post at the foot */}
      {(() => {
        const a: Vec3 = [0, 0.85, 1.05];
        const b: Vec3 = [len, top + 0.85, 1.05];
        const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
        const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
        return (
          <>
            <InkBox size={[l, 0.07, 0.08]} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]]} rotation={[0, 0, ang]} color="#4a2414" ink={0.008} />
            {Array.from({ length: UP.steps }, (_, i) => (
              <InkCylinder key={i} radius={0.018} height={0.85} position={[(i + 0.5) * UP.run, (i + 1) * UP.rise + 0.42, 1.05]} color="#5a2a18" ink={0.004} />
            ))}
            <InkCylinder radius={0.06} height={1.1} position={[-0.05, 0.55, 1.05]} color="#4a2414" ink={0.008} />
            <mesh position={[-0.05, 1.15, 1.05]}>
              <sphereGeometry args={[0.08, 14, 10]} />
              <meshToonMaterial color="#5a2a18" gradientMap={toonRamp} />
            </mesh>
          </>
        );
      })()}
      {children}
    </>
  );
};
