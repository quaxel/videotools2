import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { CameraShot, canvasTexture, SkyDome, toonRamp } from "../../engine";
import { haloTexture, paintTexture } from "../../three/surfaces";
import { useOwned } from "../../three/BalloonSets";

// Pieces for the two exterior shots of cabin-pressure (exterior.tsx): the airliner (airliner.glb, shown at 3x so a
// puppet fits behind its windows), a camera-riding sky, cumulus decks that stream past from nose to tail, the lit
// cabin behind the hero window (masks, seats), the turquoise sea and coast far below, light shafts and lens wisps.

type Vec3 = [number, number, number];
const INK = "#161212";
// Sprites can't be raycast without a camera on the ray (the stills audit raycasts the scene): skip them.
const noRay = () => null;

export const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

// ---------- the airliner ----------

export const MODEL = "videos/cabin-pressure/models/airliner.glb";
export const S = 3; // model metres -> world metres: 12 m model, a 36 m airliner
// Mirrors ../videos/cabin-pressure/sand3d/airliner.py (Blender coords: x port, y aft, z up).
const Z0 = 0.6;
const WIN = { y0: -3.9, pitch: 0.36, z: Z0 + 1.0, w: 0.18, h: 0.25, hero: 3 };
const HERO_Y = WIN.y0 + WIN.hero * WIN.pitch;
const FLOOR_Z = WIN.z - 1.0 / 3;
const SKIN_X = 0.7 * Math.sqrt(1 - ((WIN.z - (Z0 + 0.95)) / 0.75) ** 2); // the hull's half width at the window row

// The model sits nose toward -x, its port side (and the hero window) facing +z, and the cabin floor behind the
// hero window on y = 0 with the window centred on x = 0: world = S * (by, bz, bx) + OFF.
export const OFF: Vec3 = [-S * HERO_Y, -S * FLOOR_Z, 0];
export const bw = (bx: number, by: number, bz: number): Vec3 => [S * by + OFF[0], S * bz + OFF[1], S * bx + OFF[2]];
const bm = (bx: number, by: number, bz: number): Vec3 => [bx, bz, -by]; // inside the model group (three coords)
export const HERO_WIN = { center: bw(SKIN_X, HERO_Y, WIN.z), half: [(S * WIN.w) / 2, (S * WIN.h) / 2] as [number, number] };
// The cabin cavity behind it (world): x +-1.65, y 0..CEIL, z from CAB_BACK to the skin.
export const CEIL = S * (Z0 + 1.32) + OFF[1];
const ROOM_FRONT = S * 0.46 + OFF[2]; // the room's window-side wall (the slot and the hole go on to the skin)
export const CAB_BACK = S * -0.3 + OFF[2];
export const BARRY_Z = 0.3; // where Barry sits, 1.8 m behind the glass
export const AXIS_Y = S * (Z0 + 0.95) + OFF[1]; // the fuselage centre line
export const PLANE_MID: Vec3 = bw(0, 0.3, Z0 + 0.95); // about the centre of gravity

const cache = new Map<string, Promise<GLTF>>();
const loadGltf = (url: string) => {
  if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url));
  return cache.get(url)!;
};

// An inverted hull whose thickness is a constant share of the screen (k x the distance to the camera), so the
// outline stays a few pixels wide from 80 m out to a close-up on one window.
const inkMaterial = (k: number) => {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.inkK = { value: k };
    shader.vertexShader = `uniform float inkK;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      `vec4 inkMv = modelViewMatrix * vec4(position, 1.0);
      float inkS = length(modelMatrix[0].xyz);
      vec3 transformed = vec3(position) + normalize(normal) * inkK * max(-inkMv.z, 0.0) / inkS;`,
    );
  };
  return m;
};

const LIGHT_PARTS = ["Nav_Red", "Nav_Green", "Nav_Tail", "Beacon_Top", "Beacon_Bot"];

type Built = { root: THREE.Object3D; lamps: Record<string, THREE.MeshToonMaterial>; dispose: () => void };

const build = (gltf: GLTF, inkK: number): Built => {
  const root = gltf.scene.clone(true);
  const hull = inkMaterial(inkK);
  const made: THREE.Material[] = [hull];
  const lamps: Record<string, THREE.MeshToonMaterial> = {};
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    o.userData.rest = { position: o.position.clone(), quaternion: o.quaternion.clone() };
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    const src = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const lamp = LIGHT_PARTS.find((n) => mesh.name.startsWith(n));
    const m = new THREE.MeshToonMaterial({
      color: lamp ? src.emissive.clone() : src.color,
      map: paintTexture(),
      emissive: lamp ? src.emissive.clone() : new THREE.Color("#000"),
      emissiveIntensity: lamp ? 2.2 : 1,
      gradientMap: toonRamp,
    });
    made.push(m);
    mesh.material = m;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    if (lamp) lamps[lamp] = m;
    if (!mesh.name.endsWith("_noink") && !lamp) {
      const h = new THREE.Mesh(mesh.geometry, hull);
      h.userData.ink = true;
      mesh.add(h);
    }
  }
  return { root, lamps, dispose: () => made.forEach((m) => m.dispose()) };
};

// Anti-collision beacons flash red about once a second, the white tail strobe double-flashes.
export const beaconOn = (f: number) => (f + 7) % 34 < 4;
export const strobeOn = (f: number) => {
  const p = (f + 19) % 40;
  return p < 2 || (p >= 5 && p < 7);
};

const LAMP_AT: Record<string, Vec3> = {
  Nav_Red: bm(6.0, 1.36, Z0 + 0.42 + 6 * 0.0875 + 0.06),
  Nav_Green: bm(-6.0, 1.36, Z0 + 0.42 + 6 * 0.0875 + 0.06),
  Nav_Tail: bm(0, 5.98, Z0 + 1.78),
  Beacon_Top: bm(0, 0.4, Z0 + 1.72),
  Beacon_Bot: bm(0, 0.9, Z0 + 0.15),
};
const LAMP_COLOR: Record<string, string> = { Nav_Red: "#ff3b30", Nav_Green: "#3dff7a", Nav_Tail: "#ffffff", Beacon_Top: "#ff4030", Beacon_Bot: "#ff4030" };

const Glow: React.FC<{ position: Vec3; size: number; color: string; opacity: number }> = ({ position, size, color, opacity }) => {
  const tex = useMemo(() => haloTexture(), []);
  if (opacity <= 0.001) return null;
  return (
    <sprite raycast={noRay} position={position} scale={[size, size, 1]} renderOrder={5}>
      <spriteMaterial map={tex} color={color} transparent opacity={opacity} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
    </sprite>
  );
};

// The airliner in world space (see OFF). `fan` turns both fans (degrees), `pitch` / `roll` (radians) tilt it about
// PLANE_MID, `ink` is the outline as a share of the camera distance, `glow` scales the lamps' halos.
export const Airliner: React.FC<{ frame: number; fan: number; pitch?: number; roll?: number; ink?: number; glow?: number }> = ({
  frame,
  fan,
  pitch = 0,
  roll = 0,
  ink = 0.0016,
  glow = 1,
}) => {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender(`Loading model ${MODEL}`));
  useEffect(() => {
    loadGltf(staticFile(MODEL))
      .then(setGltf)
      .catch((e) => cancelRender(new Error(`Could not load model ${MODEL}: ${e}`)));
  }, []);
  const built = useMemo(() => (gltf ? build(gltf, ink) : null), [gltf, ink]);
  useEffect(() => () => built?.dispose(), [built]);
  const advance = useThree((s) => s.advance);
  const released = useRef(false);
  useEffect(() => {
    if (built && !released.current) {
      released.current = true;
      advance(performance.now());
      continueRender(handle);
    }
  }, [built, handle, advance]);

  if (built) {
    for (const name of ["fan_L", "fan_R"]) {
      const node = built.root.getObjectByName(name);
      const j = node?.userData.s3d_joint as { axis: Vec3 } | undefined;
      if (!node || !j) continue;
      const rest = node.userData.rest as { position: THREE.Vector3; quaternion: THREE.Quaternion };
      node.quaternion.copy(rest.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(...j.axis).normalize(), THREE.MathUtils.degToRad(fan)));
    }
    const beacon = beaconOn(frame);
    const strobe = strobeOn(frame);
    for (const [name, m] of Object.entries(built.lamps)) {
      const on = name.startsWith("Beacon") ? beacon : name === "Nav_Tail" ? strobe : true;
      m.emissiveIntensity = on ? (name.startsWith("Nav_") && name !== "Nav_Tail" ? 2.0 : 3.2) : 0.15;
    }
  }
  const beacon = beaconOn(frame);
  const strobe = strobeOn(frame);
  const [px, py, pz] = PLANE_MID;
  return (
    <group position={PLANE_MID} rotation={[roll, 0, pitch]}>
      <group position={[-px, -py, -pz]}>
        <group position={OFF} scale={S}>
          <group rotation={[0, -Math.PI / 2, 0]}>
            {built && <primitive object={built.root} />}
            {Object.entries(LAMP_AT).map(([name, p]) => {
              const on = name.startsWith("Beacon") ? beacon : name === "Nav_Tail" ? strobe : true;
              const big = name.startsWith("Beacon") || name === "Nav_Tail";
              return <Glow key={name} position={p} size={(big ? 0.9 : 0.75) * glow} color={LAMP_COLOR[name]} opacity={on ? (big ? 0.8 : 0.6) : 0} />;
            })}
          </group>
        </group>
      </group>
    </group>
  );
};

// ---------- the cabin behind the hero window ----------

const CABIN = { wall: "#efe4cf", bin: "#f7f3ea", psu: "#d3d8df", seat: "#27448a", seatDark: "#1b3168", cover: "#e6ebf1", mask: "#f6c21c", tube: "#cfeaf3" };

const Cushion: React.FC<{ size: Vec3; position: Vec3; color: string; radius?: number; rotation?: Vec3; emissive?: string; ek?: number }> = ({
  size,
  position,
  color,
  radius = 0.05,
  rotation = [0, 0, 0],
  emissive = "#000000",
  ek = 0,
}) => {
  const geo = useMemo(() => {
    const [w, h, d] = size;
    const r = Math.min(radius, w / 2, h / 2, d / 2);
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + r, -h / 2);
    shape.lineTo(w / 2 - r, -h / 2);
    shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    shape.lineTo(w / 2, h / 2 - r);
    shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    shape.lineTo(-w / 2 + r, h / 2);
    shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    shape.lineTo(-w / 2, -h / 2 + r);
    shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    const g = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r * 0.9, bevelSegments: 4, curveSegments: 6 });
    g.translate(0, 0, -(d - 2 * r) / 2);
    g.computeVertexNormals();
    return g;
  }, [size, radius]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo} position={position} rotation={rotation}>
      <meshToonMaterial color={color} gradientMap={toonRamp} map={paintTexture()} emissive={emissive} emissiveIntensity={ek} />
    </mesh>
  );
};

// A clear tube from a to b with a slight sag.
const Tube: React.FC<{ a: Vec3; b: Vec3; sag?: number }> = ({ a, b, sag = 0.03 }) => {
  const geo = useMemo(() => {
    const m = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), 0.5).add(new THREE.Vector3(0.02, -sag, 0));
    const g = new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), m, new THREE.Vector3(...b)), 12, 0.012, 6, false);
    return g;
  }, [a, b, sag]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshToonMaterial color={CABIN.tube} gradientMap={toonRamp} transparent opacity={0.8} />
    </mesh>
  );
};

// One oxygen mask hanging from `top` on its tube, swinging sideways by `swing` radians: a yellow cup (open side to
// the window) with its elastic and the limp clear bag. Drawn 1.3x real size so it reads through the glass.
const HangingMask: React.FC<{ top: Vec3; len: number; swing: number; twist?: number }> = ({ top, len, swing, twist = 0 }) => {
  const cup: Vec3 = [top[0] + Math.sin(swing) * len, top[1] - Math.cos(swing) * len, top[2] + Math.sin(swing * 0.6) * 0.04];
  return (
    <group>
      <Tube a={top} b={[cup[0], cup[1] + 0.07, cup[2]]} sag={0.02} />
      <group position={cup} rotation={[0.25, twist, swing * 0.8]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.085, 0.06, 0.09, 24]} />
          <meshToonMaterial color={CABIN.mask} gradientMap={toonRamp} emissive="#7a5200" emissiveIntensity={0.25} />
        </mesh>
        <mesh position={[0, 0, 0.047]}>
          <torusGeometry args={[0.08, 0.011, 8, 24]} />
          <meshToonMaterial color="#e0aa10" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, 0, 0.044]}>
          <circleGeometry args={[0.072, 24]} />
          <meshToonMaterial color="#a37808" gradientMap={toonRamp} />
        </mesh>
        <mesh position={[0, -0.15, -0.01]} scale={[0.9, 1.5, 0.55]}>
          <sphereGeometry args={[0.06, 16, 12]} />
          <meshToonMaterial color="#eaf6fb" gradientMap={toonRamp} transparent opacity={0.5} />
        </mesh>
        <mesh position={[0, 0, -0.01]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.1, 0.004, 4, 24, Math.PI]} />
          <meshBasicMaterial color="#d8d0c0" />
        </mesh>
      </group>
    </group>
  );
};

// A seat seen side-on from the window: the backrest (a navy slab across the cabin, thin along x), its white
// headrest cover and the cushion. The passenger faces -x (the nose).
const SideSeat: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <group rotation={[0, 0, -0.12]}>
      <Cushion size={[0.13, 0.98, 0.56]} position={[0.08, 0.86, 0]} color={CABIN.seat} radius={0.06} />
      <Cushion size={[0.15, 0.24, 0.46]} position={[0.07, 1.22, 0]} color={CABIN.cover} radius={0.06} />
    </group>
    <Cushion size={[0.5, 0.13, 0.54]} position={[-0.18, 0.36, 0]} color={CABIN.seat} radius={0.05} />
    <Cushion size={[0.42, 0.06, 0.06]} position={[-0.16, 0.48, 0.27]} color={CABIN.seatDark} radius={0.025} />
  </group>
);

// The lit cabin behind the hero window: cream walls, the overhead bins on the far side with a bright window under
// them, the ceiling panel with its light strip, Barry's row of seats (side-on), and the masks hanging from the open
// service-unit door, swinging. Barry is a puppet in the shot (x 0, z ~0.6).
export const HeroCabin: React.FC<{ frame: number; swing?: number }> = ({ frame, swing = 1 }) => {
  const f = frame;
  // damped pendulums after the drop, each with its own length, phase and a slow re-push from the cabin air
  const sw = (k: number, len: number, a0: number, ph: number) => {
    const w = Math.sqrt(9.8 / len) / 30;
    const amp = a0 * (0.55 + 0.45 * Math.exp(-f / 70));
    return swing * amp * Math.sin(f * w + ph);
  };
  const lightWarm = new THREE.Color("#fff0d4");
  return (
    <group>
      {/* walls: the back (far side of the cabin), the ceiling, the floor, the end walls of the room */}
      <mesh position={[0, CEIL / 2, CAB_BACK + 0.02]}>
        <planeGeometry args={[3.3, CEIL]} />
        <meshToonMaterial color={CABIN.wall} gradientMap={toonRamp} map={paintTexture()} emissive="#5a4630" emissiveIntensity={0.35} />
      </mesh>
      <mesh position={[0, CEIL - 0.02, (CAB_BACK + ROOM_FRONT) / 2]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.3, ROOM_FRONT - CAB_BACK - 0.02]} />
        <meshToonMaterial color="#f3ead8" gradientMap={toonRamp} emissive="#6a5638" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0, 0.005, (CAB_BACK + ROOM_FRONT) / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[3.3, ROOM_FRONT - CAB_BACK - 0.02]} />
        <meshToonMaterial color="#5d6a86" gradientMap={toonRamp} />
      </mesh>
      {/* overhead bins across the cabin and the far window glowing under them */}
      <Cushion size={[3.3, 0.5, 0.42]} position={[0, CEIL - 0.3, CAB_BACK + 0.24]} color={CABIN.bin} radius={0.1} emissive="#4a3a26" ek={0.3} />
      {[-1.05, 0.05, 1.15].map((x) => (
        <Cushion key={x} size={[0.06, 0.05, 0.03]} position={[x, CEIL - 0.48, CAB_BACK + 0.46]} color="#b9bec6" radius={0.012} />
      ))}
      {[-1.0, 0.1, 1.2].map((x) => (
        <group key={`w${x}`} position={[x, 1.02, CAB_BACK + 0.03]}>
          <Cushion size={[0.5, 0.66, 0.04]} position={[0, 0, 0]} color="#e7decb" radius={0.12} />
          <mesh position={[0, -0.03, 0.022]}>
            <planeGeometry args={[0.32, 0.44]} />
            <meshBasicMaterial color={new THREE.Color("#cfe6ff").multiplyScalar(1.1)} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.12, 0.024]}>
            <planeGeometry args={[0.32, 0.16]} />
            <meshToonMaterial color="#efe8da" gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      {/* the ceiling light strip and the service unit over Barry's row with its open drop door */}
      <mesh position={[0, CEIL - 0.04, 0.95]}>
        <boxGeometry args={[3.2, 0.02, 0.08]} />
        <meshBasicMaterial color={lightWarm.clone().multiplyScalar(1.4)} toneMapped={false} />
      </mesh>
      <Cushion size={[2.6, 0.08, 0.5]} position={[0, CEIL - 0.06, 0.55]} color={CABIN.psu} radius={0.03} emissive="#3a3a40" ek={0.2} />
      <group position={[0, CEIL - 0.1, 0.82]} rotation={[0.9 + Math.sin(f * 0.21) * 0.06 * Math.exp(-f / 60), 0, 0]}>
        <Cushion size={[0.9, 0.03, 0.26]} position={[0, -0.0, -0.13]} color="#c9ced6" radius={0.012} />
      </group>
      {/* Barry's row: his seat behind him (aft, +x) and the one in front of him (-x) */}
      <SideSeat x={0.46} z={BARRY_Z} />
      <SideSeat x={-0.62} z={BARRY_Z} />
      {/* the masks: two in front of the window on either side of his head, one behind him */}
      <HangingMask top={[-0.26, CEIL - 0.1, 0.98]} len={0.5} swing={-0.02 + sw(0, 0.5, 0.2, 0.4)} twist={0.95} />
      <HangingMask top={[0.24, CEIL - 0.1, 0.9]} len={0.56} swing={0.02 + sw(1, 0.56, 0.18, 2.1)} twist={-0.9} />
      <HangingMask top={[0.42, CEIL - 0.1, -0.1]} len={0.6} swing={sw(2, 0.6, 0.2, 4.0)} twist={0.1} />
      <HangingMask top={[-0.78, CEIL - 0.1, 0.45]} len={0.62} swing={0.05 + sw(3, 0.62, 0.22, 1.3)} />
    </group>
  );
};

// The glass of the hero window: a faint pane with two highlight streaks, over the opening.
export const HeroGlass: React.FC = () => {
  const tex = useOwned(() =>
    canvasTexture(256, 352, (ctx) => {
      ctx.clearRect(0, 0, 256, 352);
      const g = ctx.createLinearGradient(0, 0, 256, 352);
      g.addColorStop(0, "rgba(255,255,255,0.22)");
      g.addColorStop(0.5, "rgba(220,235,255,0.05)");
      g.addColorStop(1, "rgba(255,255,255,0.12)");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 352);
      ctx.fillStyle = "rgba(255,255,255,0.32)";
      ctx.beginPath();
      ctx.moveTo(40, 0);
      ctx.lineTo(95, 0);
      ctx.lineTo(0, 150);
      ctx.lineTo(0, 64);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.beginPath();
      ctx.moveTo(130, 0);
      ctx.lineTo(150, 0);
      ctx.lineTo(0, 238);
      ctx.lineTo(0, 205);
      ctx.fill();
    }),
  );
  const [w, h] = HERO_WIN.half;
  return (
    <mesh position={[HERO_WIN.center[0], HERO_WIN.center[1], HERO_WIN.center[2] - 0.06]} renderOrder={4}>
      <planeGeometry args={[w * 2, h * 2]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
};

// ---------- sky ----------

// The sky dome, the sun disc and a wide glow, riding with the camera.
// `flare`: an extra warm glow in another direction (the sun's light spilling into the frame from just outside it).
export const SkyRig: React.FC<{
  camera: CameraShot;
  stops: [number, string][];
  sun: Vec3;
  glow?: string;
  disc?: boolean;
  halo?: number;
  flare?: { dir: Vec3; size: number; opacity: number; color: string };
}> = ({ camera, stops, sun, glow = "#fff6dc", disc = true, halo = 0.55, flare }) => {
  const dir = new THREE.Vector3(...sun).normalize();
  const tex = useMemo(() => haloTexture(), []);
  return (
    <group position={camera.position}>
      <SkyDome sun={sun} stops={stops} glow={glow} />
      {disc && (
        <mesh position={dir.clone().multiplyScalar(270).toArray() as Vec3} onUpdate={(m) => m.lookAt(0, 0, 0)} renderOrder={-9}>
          <circleGeometry args={[7, 40]} />
          <meshBasicMaterial color={new THREE.Color("#fffaf0").multiplyScalar(1.6)} fog={false} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
      <sprite raycast={noRay} position={dir.clone().multiplyScalar(260).toArray() as Vec3} scale={[200, 200, 1]} renderOrder={-8}>
        <spriteMaterial map={tex} color={glow} transparent opacity={halo} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
      </sprite>
      {flare && (
        <sprite raycast={noRay} position={new THREE.Vector3(...flare.dir).normalize().multiplyScalar(250).toArray() as Vec3} scale={[flare.size, flare.size, 1]} renderOrder={-8}>
          <spriteMaterial map={tex} color={flare.color} transparent opacity={flare.opacity} blending={THREE.AdditiveBlending} depthWrite={false} fog={false} toneMapped={false} />
        </sprite>
      )}
    </group>
  );
};

// High cirrus painted on a band of the dome (elevation ~6-40 degrees): feathery streaks that drift slowly.
export const Cirrus: React.FC<{ camera: CameraShot; frame: number; opacity?: number; tint?: string; seed?: number }> = ({ camera, frame, opacity = 0.75, tint = "#ffffff", seed = 3 }) => {
  const tex = useOwned(() => {
    const t = canvasTexture(2048, 512, (ctx) => {
      ctx.clearRect(0, 0, 2048, 512);
      ctx.filter = "blur(3px)";
      for (let i = 0; i < 46; i++) {
        // one wisp: soft elongated puffs along a gentle curve, a hooked tail at one end (mares' tails)
        const x0 = rnd(seed + i) * 2048;
        const y0 = 315 + rnd(seed + i + 100) * 180; // low in the band: about 6-20 degrees up
        const len = 90 + rnd(seed + i + 200) * 170;
        const bend = (rnd(seed + i + 300) - 0.5) * 40;
        const n = 14;
        for (let k = 0; k < n; k++) {
          const u = k / (n - 1);
          const x = x0 + (u - 0.5) * len;
          const y = y0 + Math.sin(u * Math.PI) * bend - (u > 0.8 ? (u - 0.8) * 90 : 0);
          const r = 10 + Math.sin(u * Math.PI) * 16 * (0.6 + rnd(i * 31 + k) * 0.6);
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(2.6, 0.55);
          const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
          g.addColorStop(0, `rgba(255,255,255,${0.36 + rnd(i * 17 + k) * 0.2})`);
          g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(0, 0, r, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    });
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(2, 1);
    return t;
  });
  const geo = useOwned(() => new THREE.SphereGeometry(280, 64, 16, 0, Math.PI * 2, Math.PI * 0.27, Math.PI * 0.2));
  return (
    <group position={camera.position} rotation={[0, frame * 0.0006, 0]}>
      <mesh geometry={geo} renderOrder={-7}>
        <meshBasicMaterial map={tex} color={tint} transparent opacity={opacity} side={THREE.BackSide} depthWrite={false} fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---------- clouds ----------

export type CloudLayerSpec = {
  seed: number;
  count: number;
  area: [number, number, number, number]; // x0, x1, z0, z1 (the tile the clusters wrap round along x)
  y: number;
  size: [number, number]; // cluster radius range (m)
  speed: number; // m per frame toward +x (the plane flies -x)
  puffs?: number;
  tall?: number; // how high the heaps tower (x radius)
  flat?: number; // squash of the puffs (y scale)
  colors: [string, string, string]; // top, middle, base
  detail?: number;
  keep?: (x: number, z: number) => boolean; // leave clusters out here (a gap, a lane for the camera)
};

// A deck of cumulus heaps: each a cluster of soft overlapping ellipsoid puffs, flat-bottomed, taller in the middle,
// sunlit white on top and blue-grey at the base. Instanced, wrapped round the tile so the deck streams past.
export const CloudLayer: React.FC<{ spec: CloudLayerSpec; frame: number; material?: "lambert" | "toon" }> = ({ spec, frame, material = "lambert" }) => {
  const plan = useMemo(() => {
    const out: { c: number; dx: number; dy: number; dz: number; sx: number; sy: number; sz: number; col: THREE.Color; x0: number; z: number; y: number }[] = [];
    const [x0, x1, z0, z1] = spec.area;
    const [top, mid, base] = spec.colors.map((c) => new THREE.Color(c));
    const s0 = spec.seed * 1000;
    for (let c = 0; c < spec.count; c++) {
      const cx = x0 + rnd(s0 + c * 7 + 1) * (x1 - x0);
      const cz = z0 + rnd(s0 + c * 7 + 2) * (z1 - z0);
      if (spec.keep && !spec.keep(cx, cz)) continue;
      const s = spec.size[0] + rnd(s0 + c * 7 + 3) * (spec.size[1] - spec.size[0]);
      const cy = spec.y + (rnd(s0 + c * 7 + 4) - 0.5) * s * 0.3;
      const n = (spec.puffs ?? 7) + Math.floor(rnd(s0 + c * 7 + 5) * 4);
      const tall = spec.tall ?? 0.55;
      const flat = spec.flat ?? 0.72;
      const stretch = 1.2 + rnd(s0 + c * 7 + 6) * 0.5;
      for (let k = 0; k < n; k++) {
        const kk = s0 + c * 131 + k * 17;
        const a = rnd(kk) * Math.PI * 2;
        const rr = Math.pow(rnd(kk + 1), 0.8) * 0.8;
        const pr = s * (0.36 + 0.26 * rnd(kk + 2)) * (1.1 - 0.45 * rr);
        const lift = (1 - rr) * tall * s * (0.4 + 0.6 * rnd(kk + 3));
        const dy = pr * flat * 0.55 + lift;
        const h = Math.min(1, (dy + pr * flat) / (s * (tall + 0.6)));
        const col = base.clone().lerp(mid, Math.min(1, h * 1.6)).lerp(top, Math.max(0, h * 1.6 - 0.6));
        out.push({ c, dx: Math.cos(a) * rr * s * stretch, dy, dz: Math.sin(a) * rr * s * 0.85, sx: pr * 1.18, sy: pr * flat, sz: pr, col, x0: cx, z: cz, y: cy });
      }
      // a wide flat skirt along the base
      for (let k = 0; k < 3; k++) {
        const kk = s0 + c * 131 + 90 + k;
        out.push({
          c,
          dx: (k - 1) * s * 0.75 * stretch,
          dy: s * 0.12,
          dz: (rnd(kk) - 0.5) * s * 0.5,
          sx: s * 0.62,
          sy: s * 0.2,
          sz: s * 0.5,
          col: base.clone().lerp(mid, 0.25),
          x0: cx,
          z: cz,
          y: cy,
        });
      }
    }
    return out;
  }, [spec]);
  const mesh = useMemo(() => {
    const d = spec.detail ?? 16;
    const geo = new THREE.SphereGeometry(1, d, Math.round(d * 0.75));
    const mat =
      material === "toon"
        ? new THREE.MeshToonMaterial({ gradientMap: toonRamp })
        : new THREE.MeshLambertMaterial();
    const m = new THREE.InstancedMesh(geo, mat, plan.length);
    m.frustumCulled = false;
    return m;
  }, [plan, spec.detail, material]);
  useEffect(
    () => () => {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
      mesh.dispose();
    },
    [mesh],
  );
  useMemo(() => {
    const o = new THREE.Object3D();
    const [x0, x1] = spec.area;
    const W = x1 - x0;
    plan.forEach((p, i) => {
      const x = ((((p.x0 + frame * spec.speed - x0) % W) + W) % W) + x0;
      o.position.set(x + p.dx, p.y + p.dy, p.z + p.dz);
      o.scale.set(p.sx, p.sy, p.sz);
      o.rotation.set(0, (p.c % 7) * 0.4, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, p.col);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [mesh, plan, frame, spec]);
  return <primitive object={mesh} />;
};

// ---------- lens wisps ----------

// Soft cloud wisps riding just in front of the lens, drifting across the frame edges as the plane flies through thin
// cloud. `spots`: screen position (x, y in -1..1), distance (m), size (m), drift (screen units per frame), opacity.
export type Wisp = { x: number; y: number; dist: number; size: number; drift: number; opacity: number; seed: number };
const wispTexture = (seed: number) =>
  canvasTexture(256, 256, (ctx) => {
    ctx.clearRect(0, 0, 256, 256);
    for (let i = 0; i < 26; i++) {
      const x = 128 + (rnd(seed + i) - 0.5) * 150;
      const y = 128 + (rnd(seed + i + 40) - 0.5) * 70;
      const r = 26 + rnd(seed + i + 80) * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, "rgba(255,255,255,0.26)");
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const LensWisps: React.FC<{ camera: CameraShot; frame: number; wisps: Wisp[]; aspect?: number; tint?: string; fade?: number }> = ({
  camera,
  frame,
  wisps,
  aspect = 9 / 16,
  tint = "#ffffff",
  fade = 1,
}) => {
  const texs = useMemo(() => wisps.map((w) => wispTexture(w.seed)), [wisps]);
  useEffect(() => () => texs.forEach((t) => t.dispose()), [texs]);
  const p = new THREE.Vector3(...camera.position);
  const fwd = new THREE.Vector3(...camera.target).sub(p).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const tanV = Math.tan((camera.fov * Math.PI) / 360);
  return (
    <group>
      {wisps.map((w, i) => {
        const sx = w.x + w.drift * frame;
        const h = w.dist * tanV;
        const q = p.clone().addScaledVector(fwd, w.dist).addScaledVector(right, sx * h * aspect).addScaledVector(up, w.y * h);
        const edge = Math.max(0, 1 - Math.max(0, Math.abs(sx) - 1.1) * 2);
        return (
          <sprite raycast={noRay} key={i} position={q.toArray() as Vec3} scale={[w.size * 1.6, w.size, 1]} renderOrder={20}>
            <spriteMaterial map={texs[i]} color={tint} transparent opacity={w.opacity * fade * edge} depthWrite={false} depthTest={false} fog={false} />
          </sprite>
        );
      })}
    </group>
  );
};

// ---------- below the deck: sea, coast, light shafts ----------

// The sea and the coast seen from ten thousand feet: turquoise shallows along a curving shore, deeper blue offshore,
// a white beach line, green land with darker woods and a little white town. One big plane, its texture sliding
// past as the plane flies (+x relative to the airliner).
const seaCanvas = () =>
  canvasTexture(2048, 2048, (ctx) => {
    const W = 2048;
    // deep water
    const g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, "#1f6fa8");
    g.addColorStop(0.55, "#2a8cbc");
    g.addColorStop(1, "#2a8cbc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, W);
    const shore = (y: number) => 1250 + Math.sin(y * 0.0042) * 160 + Math.sin(y * 0.013 + 1) * 46;
    // turquoise shallows: bands toward the shore
    const bands: [number, string][] = [
      [260, "#2fa3c4"],
      [170, "#38bccb"],
      [95, "#4fd2cf"],
      [40, "#7fe3d6"],
    ];
    for (const [d, c] of bands) {
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(W, 0);
      for (let y = 0; y <= W; y += 16) ctx.lineTo(shore(y) - d - Math.sin(y * 0.02 + d) * 12, y);
      ctx.lineTo(W, W);
      ctx.fill();
    }
    // land
    ctx.fillStyle = "#5f9a4a";
    ctx.beginPath();
    ctx.moveTo(W, 0);
    for (let y = 0; y <= W; y += 16) ctx.lineTo(shore(y), y);
    ctx.lineTo(W, W);
    ctx.fill();
    for (let i = 0; i < 260; i++) {
      const y = rnd(i + 900) * W;
      const x = shore(y) + 40 + rnd(i + 910) * 700;
      ctx.fillStyle = rnd(i + 920) > 0.5 ? "rgba(52,110,48,0.55)" : "rgba(140,170,80,0.4)";
      ctx.beginPath();
      ctx.ellipse(x, y, 20 + rnd(i + 930) * 60, 12 + rnd(i + 940) * 30, rnd(i) * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // a little white town by the shore
    for (let i = 0; i < 160; i++) {
      const y = 940 + (rnd(i + 1200) - 0.5) * (rnd(i + 1250) * 220);
      const x = shore(y) + 22 + Math.pow(rnd(i + 1210), 1.6) * 110;
      ctx.fillStyle = rnd(i + 1220) > 0.35 ? "#e8e3d6" : "#b0705c";
      ctx.fillRect(x, y, 2 + rnd(i + 1230) * 2.5, 2 + rnd(i + 1240) * 1.5);
    }
    // beach and surf
    ctx.strokeStyle = "#f3e2b0";
    ctx.lineWidth = 12;
    ctx.beginPath();
    for (let y = 0; y <= W; y += 12) ctx.lineTo(shore(y) + 4, y);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    for (let y = 0; y <= W; y += 12) ctx.lineTo(shore(y) - 8, y);
    ctx.stroke();
    // wind ripples on the open sea
    for (let i = 0; i < 900; i++) {
      const y = rnd(i + 3000) * W;
      const x = rnd(i + 3100) * W;
      if (x > shore(y) - 30) continue;
      ctx.strokeStyle = `rgba(255,255,255,${0.05 + rnd(i + 3200) * 0.08})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 14 + rnd(i + 3300) * 20, y + 3);
      ctx.stroke();
    }
  });

export const SEA_Y = -150;
const SEA_SIZE = 1800;
const SHORE_X = (1250 / 2048 - 0.5) * SEA_SIZE; // the shore's mean line in the sea group (land toward +X)

// The sea plane with the coast, low green hills inland and boats. `heading` turns the group so its +X (toward the
// land) points away from the camera; `center` puts it; the whole group slides +x by `speed` m/frame as the plane flies.
export const SeaCoast: React.FC<{ frame: number; speed: number; heading: number; center: [number, number] }> = ({ frame, speed, heading, center }) => {
  const tex = useOwned(() => seaCanvas());
  return (
    <group position={[center[0] + frame * speed, SEA_Y, center[1]]} rotation={[0, heading, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[SEA_SIZE, SEA_SIZE]} />
        <meshLambertMaterial map={tex} />
      </mesh>
      {/* hills inland */}
      {Array.from({ length: 22 }, (_, i) => {
        const s = 30 + rnd(i + 71) * 60;
        return (
          <mesh key={i} position={[SHORE_X + 230 + rnd(i + 70) * 420, -s * 0.3, (rnd(i + 72) - 0.5) * 1500]} scale={[s, s * 0.45, s * 1.6]}>
            <sphereGeometry args={[1, 20, 12]} />
            <meshLambertMaterial color={rnd(i + 73) > 0.5 ? "#4f8a44" : "#6a9a52"} />
          </mesh>
        );
      })}
      {/* boats with their wakes, running along the coast */}
      {[0, 1, 2, 3].map((k) => {
        const z = ((((rnd(k + 40) * 1200 + frame * (0.25 + k * 0.08)) % 1200) + 1200) % 1200) - 600;
        const x = SHORE_X - 120 - rnd(k + 41) * 320;
        return (
          <group key={k} position={[x, 0.6, z]}>
            <mesh>
              <boxGeometry args={[1.6, 1.2, 4.5]} />
              <meshLambertMaterial color="#f6f4ee" />
            </mesh>
            <mesh position={[0, -0.5, -10]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[6, 18]} />
              <meshBasicMaterial color="#ffffff" transparent opacity={0.5} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

// A shaft of sunlight falling from a gap in the deck: an open cone, bright where the view passes through most of it
// (its middle) and at the top, fading toward the bottom. Additive.
const SHAFT_VERT = /* glsl */ `
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  vH = uv.y;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vN = normalize(normalMatrix * normal);
  vV = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
const SHAFT_FRAG = /* glsl */ `
uniform vec3 color;
uniform float strength;
varying float vH;
varying vec3 vN;
varying vec3 vV;
void main() {
  float facing = abs(dot(normalize(vN), normalize(vV)));
  float a = pow(facing, 2.2) * pow(smoothstep(0.0, 0.9, vH), 1.3) * strength;
  gl_FragColor = vec4(color * a, 1.0);
}`;

export const LightShaft: React.FC<{ top: Vec3; dir: Vec3; length: number; r0: number; r1: number; strength: number; color?: string }> = ({
  top,
  dir,
  length,
  r0,
  r1,
  strength,
  color = "#fff3d0",
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SHAFT_VERT,
        fragmentShader: SHAFT_FRAG,
        uniforms: { color: { value: new THREE.Color(color) }, strength: { value: strength } },
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        toneMapped: false,
      }),
    [color, strength],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d);
  const mid = new THREE.Vector3(...top).addScaledVector(d, length / 2);
  return (
    <mesh position={mid.toArray() as Vec3} quaternion={q} material={mat} renderOrder={6} userData={{ ghost: true }}>
      {/* cylinder: +y is the top (r0 at the gap), uv.y 1 at the top */}
      <cylinderGeometry args={[r0, r1, length, 32, 1, true]} />
    </mesh>
  );
};
