import React from "react";
import { AbsoluteFill } from "remotion";
import {
  CameraShot,
  HOLO,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  SpaceBaseSet,
  spaceLight,
  Stage,
  useShotFrame,
} from "../engine";

// Five-second tour of SpaceBaseSet: wide on the deck and the planet, the crew lit by the hologram, then a low
// angle behind the table at the window as the beacon sweeps.

const NOVA: PuppetLook = { skin: "#f6d2b0", hair: "#1d1a1a", outfit: "#e8ecf4", pattern: "#f77f00", long: true };
const REX: PuppetLook = { skin: "#c98a5e", hair: "#3a1f14", outfit: "#f77f00", pattern: "#e8ecf4", glasses: true };

const BG = moodBackground("space");

const crew = (expressionNova: "excited" | "neutral", expressionRex: "skeptical" | "shocked"): PuppetPlacement[] => [
  { id: "nova", look: NOVA, pose: { expression: expressionNova, armR: [70, -40] }, at: [HOLO[0] - 0.62, HOLO[2] + 0.15] },
  { id: "rex", look: REX, pose: { expression: expressionRex, lookX: -0.5 }, at: [HOLO[0] + 0.62, HOLO[2] + 0.15] },
];

const Wide: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f, 0, 50);
  // Trucks left to right so the planet, ridges and moonscape slide apart.
  const camera: CameraShot = { position: lerp3([-1.1, 1.75, 7.0], [0.4, 1.6, 6.1], p), target: lerp3([-0.5, 1.35, -3], [0.2, 1.35, -3], p), fov: 42 };
  return <Stage set={<SpaceBaseSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={crew("excited", "skeptical")} light={spaceLight(f)} />;
};

const Holo: React.FC = () => {
  const f = useShotFrame() + 50;
  const p = ramp(f, 50, 100);
  const camera: CameraShot = { position: lerp3([0.18, 1.2, 4.9], [-0.18, 1.15, 4.55], p), target: lerp3([0.04, 1.0, 0.3], [-0.04, 1.0, 0.3], p), fov: 38 };
  return <Stage set={<SpaceBaseSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={crew("excited", "shocked")} light={spaceLight(f)} />;
};

const Window: React.FC = () => {
  const f = useShotFrame() + 100;
  const p = ramp(f, 100, 150);
  const camera: CameraShot = { position: lerp3([0.95, 0.78, 0.6], [0.8, 0.8, 0.35], p), target: [0.75, 1.9, -12], fov: 46 };
  const cast: PuppetPlacement[] = [{ id: "nova", look: NOVA, pose: { expression: "neutral", view: "back" }, at: [0.5, -2.35] }];
  // Close to the subject, so a calmer hand-held drift than the default.
  return <Stage set={<SpaceBaseSet camera={camera} frame={f} />} camera={camera} bg={BG} puppets={cast} light={spaceLight(f)} energy={0.4} />;
};

const SHOTS: Shot[] = [
  [0, 50, Wide, false],
  [50, 100, Holo, false],
  [100, 150, Window, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("hum"), volume: 0.35, until: 150 },
  { at: 52, src: sfx("chime"), volume: 0.35 },
  { at: 96, src: sfx("whoosh"), volume: 0.5 },
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.mystery, from: 0, to: 150, volume: 0.45 }];

export const SpacePreview: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={150} />
  </AbsoluteFill>
);
