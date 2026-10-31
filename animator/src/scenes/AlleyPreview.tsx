import React from "react";
import { AbsoluteFill } from "remotion";
import {
  AlleySet,
  alleyLight,
  CameraShot,
  COOK,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  SEATS,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  Stage,
  useShotFrame,
} from "../engine";

// Five-second tour of AlleySet: down the rainy alley to the ramen stall, the customer and the cook under the
// stall's tube light, then a low angle on the wet ground as a car creeps in with its headlights on.

const MIKA: PuppetLook = { skin: "#f6d2b0", hair: "#3a1f14", outfit: "#2a9d8f", pattern: "#ffd23f", long: true };
const KEN: PuppetLook = { skin: "#e0a878", hair: "#1d1a1a", outfit: "#f4efe2", pattern: "#d62828", cap: "#1b2a55" };

const BG = moodBackground("night");

const cast = (mika: PuppetPlacement["pose"], ken: PuppetPlacement["pose"]): PuppetPlacement[] => [
  { id: "mika", look: MIKA, pose: { sit: true, view: "side", facing: 1, ...mika }, at: SEATS[1] },
  { id: "ken", look: KEN, pose: { view: "side", facing: -1, ...ken }, at: COOK },
];

const Wide: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  const camera: CameraShot = { position: lerp3([-0.55, 1.7, 6.4], [0.1, 1.55, 5.5], p), target: lerp3([-0.2, 1.3, -8], [0.05, 1.3, -8], p), fov: 42 };
  return <Stage set={<AlleySet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast({ expression: "neutral" }, { expression: "neutral", armL: [60, -70] })} light={alleyLight(f)} />;
};

const Counter: React.FC = () => {
  const f = useShotFrame() + 50;
  const p = ramp(f, 50, 100);
  // Three-quarter view from the alley: Mika in profile at the counter, Ken behind it under the tube light.
  const camera: CameraShot = { position: lerp3([-1.1, 1.3, 3.1], [-0.95, 1.25, 2.75], p), target: lerp3([0.3, 0.95, -0.5], [0.28, 0.95, -0.5], p), fov: 45 };
  return (
    <Stage
      set={<AlleySet camera={camera} frame={f} />}
      camera={camera}
      bg={BG}
      puppets={cast({ expression: "excited", armR: [40, -60] }, { expression: "smug", armL: [80, -40] })}
      light={alleyLight(f)}
    />
  );
};

const CarIn: React.FC = () => {
  const f = useShotFrame() + 100;
  const car = ramp(f, 100, 146);
  // Low in the car's lane, on the wet ground: Mika at the stall on the right as the headlights creep in.
  const camera: CameraShot = { position: lerp3([-0.95, 0.32, 3.2], [-0.8, 0.36, 2.8], ramp(f, 100, 150)), target: [-0.3, 1.0, -8], fov: 42 };
  return (
    <Stage
      set={<AlleySet camera={camera} frame={f} car={car} />}
      camera={camera}
      bg={BG}
      puppets={cast({ expression: "shocked", lookX: -0.8 }, { expression: "skeptical" }).slice(0, 1)}
      light={alleyLight(f, car)}
    />
  );
};

const SHOTS: Shot[] = [
  [0, 50, Wide, false],
  [50, 100, Counter, false],
  [100, 150, CarIn, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.4, until: 150 },
  { at: 96, src: sfx("whoosh"), volume: 0.45 },
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.lounge, from: 0, to: 150, volume: 0.4 }];

export const AlleyPreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={150} />
  </AbsoluteFill>
);
