import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import {
  BlenderModel,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  handWorld,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  Sfx,
  sfx,
  Shot,
  ShotList,
  SoundTrack,
  Stage,
  useShotFrame,
} from "../engine";
import { DUSK_BG, duskLight, Tumbleweed, WesternTownSet } from "../three/WesternTownSet";

// High noon at sundown: two gunfighters face off down the main street. One still frame (9:16), a low
// over-the-shoulder: the hero in back view close to the lens, soft; the outlaw sharp in the middle of the street,
// the setting sun just over his shoulder, every shadow stretching toward the camera.
// Render: npx remotion still DuelPreview out/duel/duel.png --frame=0 --props='{"post":true}'
// DuelAnim (5 s): the same frame comes alive, a slow push, a tumbleweed rolls across, hands creep, the hero fires from the hip.
// npx remotion render DuelAnim out/duel/duel.mp4 --props='{"post":true}'

const HERO: PuppetLook = { skin: "#e8b48a", hair: "#6a3a1e", outfit: "#4a6a8a", vest: "#3a2a20", hat: "#8a6a4a" };
const OUTLAW: PuppetLook = { skin: "#d49a72", hair: "#1a1412", outfit: "#5a2a2a", vest: "#1e1a1a", beard: "#1a1412", kerchief: "#2a2a2a", hat: "#1a1616" };

export const DUEL_CAMERA: CameraShot = { position: [-0.6, 0.42, 7.6], target: [0.15, 1.0, -4], fov: 48 };
const HERO_AT: [number, number] = [-0.72, 4.85];
const OUTLAW_AT: [number, number] = [0.3, -0.5];

// A holstered six-shooter on the hip (screen side -1 left, 1 right), turned to the camera, a little in front of the card.
export const Holster: React.FC<{ at: [number, number]; side: number; camera: CameraShot }> = ({ at, side, camera }) => {
  const [x, , z] = handWorld(at, [side, -330], camera);
  const dx = camera.position[0] - at[0];
  const dz = camera.position[2] - at[1];
  const l = Math.hypot(dx, dz);
  return <BlenderModel src="models/duel/holster.glb" position={[x + (dx / l) * 0.06, 0.2, z + (dz / l) * 0.06]} rotation={[0, Math.atan2(dx, dz) + Math.sign(side) * 0.25, 0]} ink={0.008} />;
};

const focusOn = (camera: CameraShot, at: [number, number]) => {
  const [px, py, pz] = camera.position;
  const [tx, ty, tz] = camera.target;
  const len = Math.hypot(tx - px, ty - py, tz - pz);
  return ((at[0] - px) * (tx - px) + (0.98 - py) * (ty - py) + (at[1] - pz) * (tz - pz)) / len;
};

const ease = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.cubic) });
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];

export const DUEL_FRAMES = 150;
const SHOT = 126; // the hero fires

// The duel at frame f of the animation; `still` freezes it as the poster frame.
const Duel: React.FC<{ f: number; still?: boolean }> = ({ f, still }) => {
  const push = still ? 0 : ease(f, 0, DUEL_FRAMES);
  const kick = still ? 0 : Math.max(0, 1 - (f - SHOT) / 10) * (f >= SHOT ? 1 : 0);
  const base: CameraShot = {
    position: mix3([-0.6, 0.42, 7.6], [-0.62, 0.38, 7.25], push),
    target: mix3([0.15, 1.0, -4], [0.12, 0.98, -4], push),
    fov: mix(48, 46, push),
  };
  // the shot's jolt: a sharp shake that dies out in a third of a second
  const camera: CameraShot = kick
    ? { ...base, position: [base.position[0] + Math.sin(f * 2.7) * 0.025 * kick, base.position[1] + Math.cos(f * 3.1) * 0.02 * kick, base.position[2]], fov: base.fov - 1.2 * kick }
    : base;
  const creep = still ? 0 : ease(f, 30, 118); // both hands sink toward the guns
  const draw = still ? 0 : ease(f, SHOT - 5, SHOT); // the hero's hand slaps down onto the grip
  const twitch = still ? 0 : Math.max(0, Math.sin(((f - 78) / 10) * Math.PI)) * (f > 78 && f < 88 ? 1 : 0); // the outlaw's fingers twitch
  const after = !still && f >= SHOT;
  const cast: PuppetPlacement[] = [
    {
      id: "hero",
      look: HERO,
      at: HERO_AT,
      pose: {
        expression: "determined",
        view: "side",
        facing: 1,
        armR: [mix(mix(24, 15, creep), 6, draw), mix(mix(-30, -48, creep), -72, draw)],
        handR: draw > 0.5 ? "fist" : "open",
        armL: [8, -10],
        lookX: 0.5,
        face: { lid: mix(0.35, 0.55, creep), brow: mix(0.6, 0.9, creep) },
      },
    },
    {
      id: "outlaw",
      look: OUTLAW,
      at: OUTLAW_AT,
      pose: {
        ...(still ? { expression: "determined" as const } : faceChange([[0, "determined"], [SHOT + 3, "shocked"]], f, 6)),
        view: "front",
        armR: [mix(22, 15, creep) + twitch * 5, mix(-18, -34, creep)],
        handR: twitch > 0.5 ? "point" : "open",
        armL: after ? [40, -30] : [8, -6],
        handL: after ? "open" : "fist",
        lookX: 0,
        face: after ? { lid: -0.3 } : { lid: mix(0.3, 0.5, creep), brow: mix(0.7, 1, creep) },
        lean: after ? -6 : 0,
      },
    },
  ];
  // the tumbleweed rolls in from the right, bouncing, across the gap between them
  const roll = still ? 0.58 : interpolate(f, [0, 115], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const twX = mix(3.4, -2.6, roll);
  const twZ = mix(1.9, 0.9, roll);
  const hop = Math.abs(Math.sin(roll * Math.PI * 4.5)) * 0.18;
  const muzzle = handWorld(HERO_AT, [70, -360], camera);
  return (
    <Stage
      set={
        <WesternTownSet camera={camera} frame={f}>
          <Tumbleweed position={[twX, hop, twZ]} size={0.36} spin={-(twX - 3.4) / 0.36} />
          <Holster at={HERO_AT} side={45} camera={camera} />
          <Holster at={OUTLAW_AT} side={-150} camera={camera} />
          {!still && (
            <>
              <Burst kind="sparks" at={[muzzle[0] + 0.12, muzzle[1] + 0.05, muzzle[2] - 0.15]} frame={f - SHOT} count={40} size={0.7} speed={2.2} spray={[1.6, 0.4, -1.2]} seed={3} />
              <Burst kind="dust" at={[muzzle[0] + 0.1, muzzle[1], muzzle[2] - 0.1]} frame={f - SHOT} count={10} size={0.5} seed={7} />
              <Burst kind="dust" at={[OUTLAW_AT[0] - 0.35, 0.02, OUTLAW_AT[1] + 0.2]} frame={f - SHOT - 3} count={14} size={0.9} seed={11} />
            </>
          )}
        </WesternTownSet>
      }
      camera={camera}
      bg={DUSK_BG}
      energy={0}
      keepHeads={false} // framed by hand: every head stays whole through the push
      blur={2.6}
      focus={focusOn(camera, OUTLAW_AT)}
      puppets={cast}
      light={duskLight()}
      flash={after ? Math.max(0, 1 - (f - SHOT) / 5) * 0.55 : 0}
    />
  );
};

export const DuelPreview: React.FC = () => <Duel f={0} still />;

const DuelShot: React.FC = () => <Duel f={useShotFrame()} />;
const SHOTS: Shot[] = [[0, DUEL_FRAMES, DuelShot, false]];
const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.55, until: DUEL_FRAMES },
  { at: 6, src: sfx("whoosh"), volume: 0.18 },
  { at: 80, src: sfx("riser"), volume: 0.35 },
  ...foleyCues("gunshot-echo", [SHOT], 0.85), // recorded shot with its echo down the street (Pixabay, flutie8211)
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.tension, from: 0, to: SHOT, volume: 0.35 }];

export const DuelAnim: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={DUEL_FRAMES} />
  </AbsoluteFill>
);
