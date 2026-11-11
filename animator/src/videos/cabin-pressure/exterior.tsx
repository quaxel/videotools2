import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { beatPath, CameraRig, CameraShot, Headline, PuppetPlacement, Sfx, sfx, Stage, useShotFrame } from "../../engine";
import { BARRY } from "./cast";
import {
  Airliner,
  BARRY_Z,
  Cirrus,
  CloudLayer,
  CloudLayerSpec,
  HERO_WIN,
  HeroCabin,
  HeroGlass,
  LensWisps,
  LightShaft,
  SeaCoast,
  SkyRig,
  Wisp,
} from "./exteriorProps";
import { at, SHOT } from "./shots";

// The airliner outside (camera_plan.md shots 1 and 12). The model (airliner.glb, ../videos/cabin-pressure/sand3d/
// airliner.py) is shown at 3x, nose toward -x, port side to +z; the cabin floor behind its hero window is y = 0 and
// the window is centred on x = 0 (exteriorProps.tsx: OFF, HERO_WIN). The plane stays put and the cloud decks stream
// past toward +x.
//   ExtHook (line 0, deep blue): one glide from a 3/4 front view over the cumulus sea, along the fuselage to the hero
//     window; behind its glass the masks swing and Barry grins. "35,000 FT" drops in at f20.
//   ExtLow (line 15, turquoise): levelled off below the cloud deck over a turquoise sea and coast; sun shafts through
//     the gaps; a sideways track that pulls back and settles. "MASK FIRST." at video frame 1640.

type Vec3 = [number, number, number];
const ASPECT = 1080 / 1920;

// ---------- 35,000 ft ----------

const HOOK_SUN: Vec3 = [0.3, 0.72, 0.62]; // high, on the camera's side: the port side and the cloud tops are lit
const HOOK_SKY: [number, string][] = [
  [-0.1, "#a9c3e8"],
  [0.0, "#b3cbec"],
  [0.03, "#a0c0ea"],
  [0.1, "#6d9fe2"],
  [0.22, "#3a72cf"],
  [0.45, "#2252ad"],
  [0.75, "#173c8a"],
  [1.0, "#10306f"],
];
const HOOK_HAZE = "#a7c1e6";

const HOOK_DECKS: CloudLayerSpec[] = [
  // the near heaps a few dozen metres under the wings
  { seed: 1, count: 120, area: [-420, 520, -520, 170], y: -30, size: [12, 26], speed: 0.55, puffs: 7, tall: 0.6, colors: ["#e9eef6", "#c6d3e8", "#8a9fc6"], detail: 24 },
  // the main deck further down
  { seed: 2, count: 190, area: [-700, 800, -800, 260], y: -78, size: [24, 46], speed: 0.32, puffs: 6, tall: 0.45, flat: 0.62, colors: ["#e3e9f3", "#bfcde3", "#869bc1"], detail: 16 },
  // the far floor toward the horizon
  { seed: 3, count: 150, area: [-900, 900, -950, -250], y: -120, size: [45, 80], speed: 0.18, puffs: 5, tall: 0.3, flat: 0.5, colors: ["#d9e2f0", "#bccbe2", "#93a8cb"], detail: 10 },
];

const HookSet: React.FC<{ camera: CameraShot; frame: number; f: number }> = ({ camera, frame, f }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={[HOOK_SKY[4][1]]} />
    <fog attach="fog" args={[HOOK_HAZE, 260, 1100]} />
    <ambientLight intensity={0.75} color="#ffffff" />
    <hemisphereLight args={["#d9e7ff", "#7d93bf", 0.65]} />
    <directionalLight position={[HOOK_SUN[0] * 100, HOOK_SUN[1] * 100, HOOK_SUN[2] * 100]} intensity={2.7} color="#fff2dc" />
    <SkyRig camera={camera} stops={HOOK_SKY} sun={HOOK_SUN} glow="#fff3d6" halo={0.5} flare={{ dir: [0.95, 0.3, -0.25], size: 300, opacity: 0.22, color: "#ffe9c0" }} />
    <Cirrus camera={camera} frame={frame} opacity={0.85} />
    {HOOK_DECKS.map((d) => (
      <CloudLayer key={d.seed} spec={d} frame={frame} />
    ))}
    <Airliner frame={f} fan={f * 9} />
    <HeroCabin frame={f + 40} />
    <HeroGlass />
  </>
);

// The window the glide ends on, and Barry behind it (1.5 m in, seated, grinning), seen only through the glass.
const WIN = HERO_WIN.center;
const BARRY_AT: [number, number] = [0.02, BARRY_Z];
const barryMask: PuppetPlacement["mask"] = {
  center: [WIN[0], WIN[1], WIN[2]],
  u: [1 / (HERO_WIN.half[0] * 1.2), 0, 0],
  v: [0, 1 / (HERO_WIN.half[1] * 1.15), 0],
};

const HOOK_KEYS = [
  { at: 0, position: [-46, 9, 37] as Vec3, target: [5, -1.5, 0] as Vec3, fov: 40 },
  { at: 32, position: [-25, 7.5, 23] as Vec3, target: [2, 0, 0] as Vec3, fov: 40 },
  { at: 62, position: [-7, 2.8, 10.5] as Vec3, target: [0, 1.0, 1.6] as Vec3, fov: 39 },
  { at: 88, position: [0, 1.05, 4.75] as Vec3, target: [0, 0.99, 1.4] as Vec3, fov: 38 },
];
// After the arrival the camera keeps pushing gently toward the glass until the cut (the dip covers the last frames).
const hookCamera = (f: number): CameraShot => {
  if (f <= 88) return beatPath(HOOK_KEYS, f);
  const u = Easing.inOut(Easing.sin)(Math.min(1, (f - 88) / 28));
  return { position: [0, 1.05 - 0.01 * u, 4.75 - 0.4 * u], target: [0, 0.99, 1.4], fov: 38 };
};

const HOOK_WISPS: Wisp[] = [
  { x: -0.9, y: -0.8, dist: 3.2, size: 0.9, drift: 0.004, opacity: 0.8, seed: 11 },
  { x: 0.95, y: 0.55, dist: 4.0, size: 1.2, drift: 0.005, opacity: 0.65, seed: 23 },
  { x: -1.05, y: 0.2, dist: 2.6, size: 0.65, drift: 0.007, opacity: 0.6, seed: 37 },
];

export const ExtHook: React.FC = () => {
  const f = useShotFrame();
  const camera = hookCamera(f);
  const giggle = Math.sin(f * 0.55) * Math.exp(-Math.max(0, 110 - f) / 60);
  const barry: PuppetPlacement = {
    id: "barry",
    look: BARRY,
    at: BARRY_AT,
    crop: true,
    mask: barryMask,
    light: { tint: "#ffe2bc", tintAmount: 0.08, distant: [{ direction: [-0.2, 0.5, 1], color: "#fff0d8", strength: 0.8 }] },
    pose: {
      view: "front",
      sit: true,
      noLegs: true, // below the window, inside the hull: no legs to hang through a seat
      expression: "happy",
      headTilt: 6 + giggle * 5,
      lookX: 0.15,
      bob: Math.abs(giggle) * 8,
    },
  };
  return (
    <AbsoluteFill>
      <Stage
        set={<HookSet camera={camera} frame={f + 300} f={f} />}
        camera={camera}
        bg="#2252ad"
        puppets={[barry]}
        energy={0.15}
        blur={2}
        foreground={<LensWisps camera={camera} frame={f} wisps={HOOK_WISPS} fade={interpolate(f, [52, 80], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />}
      />
      <Headline f={f} text="35,000 FT" at={20} out={100} />
    </AbsoluteFill>
  );
};

// ---------- 10,000 ft, below the deck ----------

const LOW_SUN: Vec3 = [-0.22, 0.93, -0.28]; // high above the deck, a little left and beyond: the shafts lean right
const LOW_SKY: [number, string][] = [
  [-0.1, "#98cddd"],
  [0.0, "#bfe8ee"],
  [0.035, "#b2e0ec"],
  [0.1, "#86c3e8"],
  [0.25, "#5aa0de"],
  [1.0, "#3a7ccc"],
];
const LOW_HAZE = "#98cddd";

// The deck overhead and the gaps the sun breaks through (x, z, radius): the clusters keep clear of them and a shaft
// hangs under each. The gaps sit along the end camera's view, one right over the plane.
const DECK_Y = 24;
const DECK_AREA: [number, number, number, number] = [-500, 600, -650, 120];
const DECK_SPEED = 0.35;
const GAPS: [number, number, number][] = [
  [26, -36, 13],
  [-28, -78, 17],
  [84, -112, 21],
  [8, -170, 25],
  [130, -40, 15],
  [-90, -150, 22],
];
const LOW_DECKS: CloudLayerSpec[] = [
  {
    seed: 7,
    count: 430,
    area: DECK_AREA,
    y: DECK_Y,
    size: [18, 40],
    speed: DECK_SPEED,
    puffs: 6,
    tall: 0.3,
    flat: 0.5,
    colors: ["#eef3f8", "#c0d0e1", "#7a93b7"],
    detail: 22,
    keep: (x, z) => GAPS.every(([gx, gz, r]) => Math.hypot(x - gx, z - gz) > r + 14),
  },
  // loose heaps at the plane's height, further out, for parallax
  { seed: 8, count: 34, area: [-500, 500, -620, -110], y: 2, size: [9, 17], speed: 0.6, puffs: 6, tall: 0.5, colors: ["#f2f6fa", "#d2deea", "#93abc9"], detail: 14 },
];
const wrapX = (x: number) => {
  const [x0, x1] = DECK_AREA;
  return ((((x - x0) % (x1 - x0)) + (x1 - x0)) % (x1 - x0)) + x0;
};

const LowSet: React.FC<{ camera: CameraShot; frame: number; f: number; rise: number }> = ({ camera, frame, f, rise }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={[LOW_SKY[3][1]]} />
    <fog attach="fog" args={[LOW_HAZE, 280, 950]} />
    <ambientLight intensity={0.8} color="#ffffff" />
    <hemisphereLight args={["#e3f4ff", "#4fb0b8", 0.7]} />
    <directionalLight position={[LOW_SUN[0] * 100, LOW_SUN[1] * 100, LOW_SUN[2] * 100]} intensity={2.2} color="#fff1d8" />
    <directionalLight position={[25, 25, 100]} intensity={0.9} color="#d6f2f6" />
    <SkyRig camera={camera} stops={LOW_SKY} sun={LOW_SUN} glow="#fff4d8" halo={0.5} disc={false} />
    <group position={[0, rise, 0]}>
      {LOW_DECKS.map((d) => (
        <CloudLayer key={d.seed} spec={d} frame={frame} />
      ))}
      <SeaCoast frame={frame} speed={0.45} heading={0.92} center={[150, -140]} />
      {GAPS.map(([gx, gz, r], i) => (
        <LightShaft
          key={i}
          top={[wrapX(gx + frame * DECK_SPEED), DECK_Y + 4, gz]}
          dir={[-LOW_SUN[0], -LOW_SUN[1], -LOW_SUN[2]]}
          length={(DECK_Y + 4 + 22) / LOW_SUN[1]}
          r0={r * 0.6}
          r1={r * 1.3}
          strength={0.3 + 0.06 * Math.sin(f * 0.07 + i * 1.7)}
        />
      ))}
    </group>
    <Airliner frame={f} fan={f * 9} pitch={0.07 * (1 - Easing.inOut(Easing.cubic)(Math.min(1, f / 75)))} glow={1.3} />
  </>
);

const LOW_KEYS = [
  { at: 0, position: [-20, 7, 27] as Vec3, target: [6, 3.5, 0] as Vec3, fov: 40 },
  { at: 75, position: [-33, 10, 37] as Vec3, target: [6.5, 4.5, 0] as Vec3, fov: 41 },
  { at: 150, position: [-44, 12, 44] as Vec3, target: [7, 5, 0] as Vec3, fov: 42 },
];

const LOW_WISPS: Wisp[] = [
  { x: -0.9, y: 0.82, dist: 6, size: 1.8, drift: 0.002, opacity: 0.6, seed: 63 },
  { x: 0.95, y: 0.5, dist: 7, size: 1.6, drift: 0.0015, opacity: 0.45, seed: 71 },
];

const HEADLINE_LOW = 1640 - SHOT.extLow[0];

export const ExtLow: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(LOW_KEYS, f);
  const rise = 7 * Easing.inOut(Easing.cubic)(Math.min(1, f / 75)); // the plane still sinking at the start: the world rises
  return (
    <AbsoluteFill>
      <Stage
        set={<LowSet camera={camera} frame={f + 200} f={f} rise={rise} />}
        camera={camera}
        bg="#5a9fe0"
        energy={0.2}
        blur={1.5}
        foreground={<LensWisps camera={camera} frame={f} wisps={LOW_WISPS} tint="#f4fbff" />}
      />
      <Headline f={f} text="MASK FIRST." at={HEADLINE_LOW} />
    </AbsoluteFill>
  );
};

// ---------- sound ----------

export const exteriorSfx: Sfx[] = [
  { at: SHOT.extHook[0], src: sfx("wind"), volume: 0.32, until: SHOT.extHook[1] },
  { at: SHOT.extHook[0], src: sfx("hum"), volume: 0.1, until: SHOT.extHook[1] },
  { at: at("extHook", 3), src: sfx("whoosh"), volume: 0.28, space: "outdoor" },
  { at: at("extHook", 58), src: sfx("whoosh"), volume: 0.2, space: "outdoor" },
  { at: SHOT.extLow[0], src: sfx("wind"), volume: 0.26, until: SHOT.extLow[1] },
  { at: SHOT.extLow[0], src: sfx("hum"), volume: 0.08, until: SHOT.extLow[1] },
  { at: at("extLow", 8), src: sfx("whoosh"), volume: 0.36, space: "outdoor" },
];
