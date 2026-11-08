import React from "react";
import { useCurrentFrame } from "remotion";
import { BlenderModel, CameraRig, CameraShot, InkBox, InkCylinder, Foliage, moodBackground, PuppetLook, Stage } from "../engine";
import { toonRamp } from "../three/toon";
import { MOODS } from "../three/moods";

// A character driving a small closed car (sand3d, guide/sand3d/coupe.py → public/models/preview/coupe.glb) down a
// sunny town street. The camera travels with the car, so the car stays put at the origin, its front toward -x
// (screen-left), and the street slides past toward +x: shop fronts, lamp posts, trees and the lane dashes wrap
// around every SPAN metres. The wheels turn from the distance travelled; the driver sits behind the wheel and is
// seen through the side window.
export const DRIVE_FRAMES = 180;

const SPEED = 0.2; // metres a frame (6 m/s)
const WHEEL_R = 0.27; // guide/sand3d/coupe.py R
const SPAN = 36; // the street repeats every SPAN metres
const wrap = (x: number) => ((((x + SPAN / 2) % SPAN) + SPAN) % SPAN) - SPAN / 2;

const ROAD = { far: -3, near: 1.6 }; // road edges (z); far sidewalk to z = -5, the shop fronts behind it
const SHOP_Z = -5.2;

const rnd = (k: number) => {
  const v = Math.sin(k * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
};
const WALLS = ["#f2b630", "#e07a5f", "#81b29a", "#f4f1de", "#9fc5e8", "#e6a8c8", "#c9a26b"];
const AWNINGS = ["#e04646", "#2a9d8f", "#4f7dff", "#9b5de5"];
// Shop fronts laid edge to edge along x, SPAN metres in all.
const SHOPS = (() => {
  const out: { x: number; w: number; h: number; wall: string; awning: string | null; seed: number }[] = [];
  let x = -SPAN / 2;
  for (let i = 0; x < SPAN / 2 - 2; i++) {
    const w = Math.min(3 + Math.round(rnd(i) * 3) * 0.75, SPAN / 2 - x);
    out.push({ x: x + w / 2, w, h: 3.2 + rnd(i + 7) * 2.6, wall: WALLS[i % WALLS.length], awning: rnd(i + 3) > 0.4 ? AWNINGS[i % AWNINGS.length] : null, seed: i });
    x += w;
  }
  return out;
})();

const Shop: React.FC<{ w: number; h: number; wall: string; awning: string | null; seed: number }> = ({ w, h, wall, awning, seed }) => {
  const cols = Math.max(2, Math.floor(w / 1.1));
  const rows = Math.max(1, Math.floor((h - 2.4) / 1.1));
  return (
    <group>
      <InkBox size={[w - 0.04, h, 0.5]} position={[0, h / 2, 0]} color={wall} ink={0.012} />
      <InkBox size={[w + 0.06, 0.16, 0.6]} position={[0, h + 0.08, 0]} color="#5a4a42" ink={0.01} />
      {/* Ground floor: a shop window and a door. */}
      <InkBox size={[w * 0.55, 1.3, 0.04]} position={[-w * 0.12, 1.05, 0.26]} color="#bfe3ee" ink={0.008} />
      <InkBox size={[0.7, 1.9, 0.04]} position={[w / 2 - 0.65, 0.95, 0.26]} color={rnd(seed + 11) > 0.5 ? "#6b4226" : "#2f4858"} ink={0.008} />
      {awning && <InkBox size={[w * 0.7, 0.08, 0.7]} position={[-w * 0.08, 2.0, 0.55]} rotation={[0.35, 0, 0]} color={awning} ink={0.01} />}
      {/* Upper floors: rows of windows. */}
      {Array.from({ length: rows * cols }, (_, i) => {
        const c = i % cols, r = Math.floor(i / cols);
        return (
          <InkBox key={i} size={[0.55, 0.75, 0.04]} position={[-w / 2 + (c + 0.5) * (w / cols), 2.9 + r * 1.1, 0.26]} color={rnd(seed * 31 + i) > 0.8 ? "#ffe9a8" : "#a8d4e6"} ink={0.006} />
        );
      })}
    </group>
  );
};

const LampPost: React.FC = () => (
  <group>
    <InkCylinder radius={0.05} height={3.2} position={[0, 1.6, 0]} color="#2f3a40" ink={0.01} />
    <InkBox size={[0.7, 0.06, 0.08]} position={[0.3, 3.2, 0]} color="#2f3a40" ink={0.01} />
    <InkBox size={[0.26, 0.12, 0.2]} position={[0.6, 3.12, 0]} color="#fff2b0" ink={0.008} />
  </group>
);

const Tree: React.FC<{ seed: number }> = ({ seed }) => (
  <group>
    <InkCylinder radius={0.08} height={1.6} position={[0, 0.8, 0]} color="#6b4226" ink={0.01} />
    <Foliage position={[0, 1.5, 0]} size={1.7} seed={seed} color="#3f9a4f" />
  </group>
);

const StreetSet: React.FC<{ camera: CameraShot; travelled: number; children?: React.ReactNode }> = ({ camera, travelled, children }) => {
  const m = MOODS.daylight;
  const at = (x0: number) => wrap(x0 + travelled);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={[m.bg]} />
      <fog attach="fog" args={[m.bg, 16, 42]} />
      <ambientLight intensity={m.ambient[0] * 0.85} color={m.ambient[1]} />
      <directionalLight
        position={[-4, 8, 5]}
        intensity={m.key[0] * 1.15}
        color={m.key[1]}
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-10}
        shadow-camera-right={10}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
      />
      {/* Asphalt, the far and near sidewalks with their kerbs. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (ROAD.far + ROAD.near) / 2]} receiveShadow>
        <planeGeometry args={[80, ROAD.near - ROAD.far]} />
        <meshToonMaterial color="#5b6066" gradientMap={toonRamp} />
      </mesh>
      <InkBox size={[80, 0.14, 2.4]} position={[0, 0.07, ROAD.far - 1.2]} color="#c9c3b6" ink={0.006} />
      <InkBox size={[80, 0.14, 3]} position={[0, 0.07, ROAD.near + 1.5]} color="#c9c3b6" ink={0.006} />
      {/* Moving marks sell the speed: lane dashes, paving joints on both sidewalks. */}
      {Array.from({ length: 12 }, (_, i) => (
        <InkBox key={`d${i}`} size={[1.2, 0.01, 0.12]} position={[at(i * 3), 0.005, -1.1]} color="#f4f1de" ink={0} />
      ))}
      {Array.from({ length: 24 }, (_, i) => (
        <React.Fragment key={`j${i}`}>
          <InkBox size={[0.03, 0.01, 2.4]} position={[at(i * 1.5), 0.145, ROAD.far - 1.2]} color="#a39d90" ink={0} />
          <InkBox size={[0.03, 0.01, 3]} position={[at(i * 1.5 + 0.7), 0.145, ROAD.near + 1.5]} color="#a39d90" ink={0} />
        </React.Fragment>
      ))}
      {SHOPS.map((s) => (
        <group key={s.seed} position={[at(s.x), 0, SHOP_Z]}>
          <Shop {...s} />
        </group>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={`l${i}`} position={[at(i * 9), 0.14, ROAD.far - 0.35]}>
          <LampPost />
        </group>
      ))}
      {Array.from({ length: 4 }, (_, i) => (
        <group key={`t${i}`} position={[at(i * 9 + 4.5), 0.14, ROAD.far - 1.4]}>
          <Tree seed={i + 2} />
        </group>
      ))}
      {children}
    </>
  );
};

const DRIVER: PuppetLook = { skin: "#e8b48a", hair: "#3a2418", outfit: "#4f7dff" };

export const DrivePreview: React.FC = () => {
  const f = useCurrentFrame();
  const travelled = f * SPEED;
  const spin = ((travelled / WHEEL_R) * 180) / Math.PI; // wheels roll with the distance, so they don't skid
  const bump = Math.sin(f * 0.9) * 0.006 + Math.sin(f * 2.3) * 0.003; // the road under the tyres, car and driver alike
  // The camera rides alongside, a little ahead of the car (3/4 front), drifting from low to a touch higher.
  const camera: CameraShot = { position: [-5.0 + f * 0.0015, 1.4 + f * 0.0015, 6.6], target: [-0.1, 0.8, 0], fov: 40 };
  return (
    <Stage
      set={
        <StreetSet camera={camera} travelled={travelled}>
          <BlenderModel
            src="models/preview/coupe.glb"
            position={[0, bump, 0]}
            rotation={[0, -Math.PI / 2, 0]}
            joints={{ spin_FL: spin, spin_FR: spin, spin_RL: spin, spin_RR: spin }}
          />
        </StreetSet>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      energy={0.3}
      puppets={[
        {
          id: "driver",
          look: DRIVER,
          at: [0.15, 0.3],
          pose: { view: "side", facing: -1, sit: true, expression: "happy", armL: [70, 30], armR: [70, 30], bob: bump * 815 /* metres to puppet units (1060 / 1.3) */ },
        },
      ]}
    />
  );
};

