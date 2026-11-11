import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";
import { rand } from "../engine/helpers";
import type { CameraShot } from "../engine/stage";
import { canvasTexture } from "./kit";

// Pixar-look primitives and set helpers, moved here from src/videos/dog-nose (props.tsx, sets.tsx) because other
// videos (eagle-vision, cabin-pressure) imported them across folders. Bodies unchanged: smooth standard shading, no
// cel steps (the toon pieces are InkBox / InkCylinder in toon.tsx and the props in props.tsx).

type Vec3 = [number, number, number];
const INK = "#161212";
// x mod 1, positive for negative frames too
const frac = (x: number) => x - Math.floor(x);

// A geometry made for one mount (or one set of deps), disposed when it is replaced or the shot ends.
export const useOwnedGeo = <T extends THREE.BufferGeometry>(make: () => T, deps: unknown[]) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const g = useMemo(make, deps);
  useEffect(() => () => g.dispose(), [g]);
  return g;
};
// A texture made for one mount (or one set of deps), disposed when it is replaced or the shot ends.
export const useOwnedTex = (make: () => THREE.Texture, deps: unknown[] = []) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const t = useMemo(make, deps);
  useEffect(() => () => t.dispose(), [t]);
  return t;
};

// ---------- soft shapes ----------

// A rounded, bevelled box with smooth shading.
export const RBox: React.FC<{ size: Vec3; position?: Vec3; rotation?: Vec3; color: string; radius?: number; rough?: number; map?: THREE.Texture | null; emissive?: string; k?: number; shadows?: boolean }> = ({
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  radius = 0.04,
  rough = 0.65,
  map = null,
  emissive,
  k = 0,
  shadows = true,
}) => {
  const r = Math.min(radius, size[0] / 2.01, size[1] / 2.01, size[2] / 2.01);
  const geo = useOwnedGeo(() => new RoundedBoxGeometry(size[0], size[1], size[2], 3, r), [size[0], size[1], size[2], r]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation} castShadow={shadows} receiveShadow={shadows}>
      <meshStandardMaterial color={color} roughness={rough} metalness={0} map={map} emissive={emissive ?? "#000"} emissiveIntensity={k} />
    </mesh>
  );
};

// A smooth cylinder (r2 = top radius for a taper).
export const Cyl: React.FC<{ r: number; h: number; position?: Vec3; rotation?: Vec3; color: string; r2?: number; rough?: number; emissive?: string; k?: number; seg?: number }> = ({
  r,
  h,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  r2,
  rough = 0.6,
  emissive,
  k = 0,
  seg = 32,
}) => (
  <mesh position={position} rotation={rotation} castShadow receiveShadow>
    <cylinderGeometry args={[r2 ?? r, r, h, seg]} />
    <meshStandardMaterial color={color} roughness={rough} emissive={emissive ?? "#000"} emissiveIntensity={k} />
  </mesh>
);

// The Pixar-style surface: smooth shading (no cel steps, no ink hull), soft roughness, a hint of sheen.
export const soft = (color: string, rough = 0.62, emissive?: string, k = 0) => (
  <meshStandardMaterial color={color} roughness={rough} metalness={0} emissive={emissive ?? "#000"} emissiveIntensity={k} />
);

// A smooth ball. `glow` draws it unlit (sparkles, highlights); `opacity` makes it see-through; `ink` > 1 adds a hull.
export const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3; ink?: number; opacity?: number; rough?: number; map?: THREE.Texture }> = ({
  position,
  radius,
  color,
  glow: lit,
  scale = [1, 1, 1],
  ink = 1,
  opacity,
  rough = 0.55,
  map,
}) => (
  <group position={position} scale={scale}>
    <mesh castShadow={!lit && opacity === undefined}>
      <sphereGeometry args={[radius, 28, 20]} />
      {lit || opacity !== undefined ? (
        <meshBasicMaterial color={color} toneMapped={false} transparent={opacity !== undefined} opacity={opacity ?? 1} depthWrite={opacity === undefined} />
      ) : map ? (
        <meshStandardMaterial color={color} roughness={rough} map={map} />
      ) : (
        soft(color, rough)
      )}
    </mesh>
    {!lit && opacity === undefined && ink > 1 && (
      <mesh scale={ink}>
        <sphereGeometry args={[radius, 20, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// ---------- light ----------

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

// Dust motes drifting in a box (in light shafts, over a street at golden hour).
export const Motes: React.FC<{ center: Vec3; size: Vec3; f: number; count?: number; color?: string; r?: number }> = ({ center, size, f, count = 40, color = "#fff1c8", r = 0.006 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => {
      const x = center[0] + (rand(i) - 0.5) * size[0] + Math.sin(f * 0.02 + i) * 0.05;
      const y = center[1] + (frac(rand(i + 50) + f * 0.0015 * (0.5 + rand(i + 9))) - 0.5) * size[1];
      const z = center[2] + (rand(i + 99) - 0.5) * size[2] + Math.cos(f * 0.017 + i) * 0.05;
      const tw = 0.6 + 0.4 * Math.sin(f * 0.2 + i * 3);
      return <Ball key={i} position={[x, y, z]} radius={r * (0.6 + rand(i + 3))} color={new THREE.Color(color).multiplyScalar(1.3 * tw).getStyle()} glow />;
    })}
  </group>
);

// Outdoor/indoor light rig for a Pixar-look set: ambient, sky/ground hemisphere and a soft shadow-casting sun placed
// relative to the camera's target (`sun` offset), its shadow box `box` metres either side.
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
