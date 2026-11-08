import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import {
  Burst,
  CameraShot,
  faceChange,
  Foliage,
  frameSpot,
  handWorld,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  ramp,
  sfx,
  Sfx,
  Shot,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { BJORN, DARO, FELIX, FELIX_KIT, OFFICER } from "./cast";
import { BATH, BathhouseSet, bathLight, FORT, fortLight, FortStreetSet } from "./fort";
import { Axe, Shield, Spear } from "./props";
import { DOORWAY, Doorway, FarmTestSet, morningLight, reachTo } from "./sets";
import { BigTitle } from "./Title";
import TIMING_JSON from "./timing.json";

// "Your Daily Life as a Viking vs. a Roman Soldier", 16:9 long form. This file holds the opening (0:00-0:10):
//   0-47     split: Bjorn on his farm | Felix in the fort street, VIKING / ROMAN SOLDIER slam in on the words
//   47-84    split, pushed in on the two faces: "Choose your daily life."
//   84-143   from inside the longhouse the door bangs open on the bright yard; Bjorn steps out and stretches
//   143-197  "right outside your house": the axe comes down on the log at "house" (split, chips, jolt)
//   197-247  the fort street: Felix walks up it in his kit, Daro and an officer busy behind
//   247-285  the bathhouse: through the steam to Felix in the hot basin; on "bathhouse" his shoulders drop
//   285-end  split again: "Sounds good?" Bjorn's smug brow | Felix blissed out in the water

const TIMING = TIMING_JSON as Timing;
export const SLUG = "viking-vs-roman";
export const timing = TIMING;
export const SIZE: [number, number] = [1920, 1080];

const ease = Easing.inOut(Easing.cubic);
const cam = (position: Vec3, target: Vec3, fov = 32): CameraShot => ({ position, target, fov });
const mix3 = (a: Vec3, b: Vec3, t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const glide = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// Felix in the water: no tunic, the body in skin tone.
const FELIX_BATH: PuppetLook = { skin: FELIX.skin, hair: FELIX.hair, stubble: FELIX.stubble, outfit: "#dca880", build: "narrow" };
const SOLDIER_A: PuppetLook = { skin: "#d8a47e", hair: "#3a2a20", outfit: "#b5604c", tunic: true, belt: "#674A36", shoes: "#674A36", stubble: "#3a2a20" };
const SOLDIER_B: PuppetLook = { skin: "#e8b896", hair: "#7a5434", outfit: "#a04e3e", tunic: true, belt: "#5a4030", shoes: "#5a4030", cloak: "#7a6c5e" };

// ---------- the split frame ----------

// Two Stages side by side, cut by a slanted seam. `lean` tilts the seam (fraction of the width over the height).
const Split: React.FC<{ left: React.ReactNode; right: React.ReactNode; f: number; lean?: number }> = ({ left, right, lean = 0.1 }) => {
  const a = 50 + lean * 50;
  const b = 50 - lean * 50;
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(${a}% 0, 100% 0, 100% 100%, ${b}% 100%)` }}>{right}</AbsoluteFill>
      <AbsoluteFill style={{ clipPath: `polygon(0 0, ${a}% 0, ${b}% 100%, 0 100%)` }}>{left}</AbsoluteFill>
      <svg width="100%" height="100%" viewBox="0 0 1920 1080" style={{ position: "absolute", inset: 0 }}>
        <line x1={(a / 100) * 1920} y1={-10} x2={(b / 100) * 1920} y2={1090} stroke="#1d1712" strokeWidth={14} />
        <line x1={(a / 100) * 1920} y1={-10} x2={(b / 100) * 1920} y2={1090} stroke="#e9d9b0" strokeWidth={3} opacity={0.8} />
      </svg>
    </AbsoluteFill>
  );
};

// Shift a camera's target sideways so the subject sits at screen x (-1..1 of the full width) instead of the centre.
const offCentre = (c: CameraShot, sx: number): CameraShot => {
  const dx = c.target[0] - c.position[0];
  const dz = c.target[2] - c.position[2];
  const d = Math.hypot(dx, dz);
  const half = Math.tan(((c.fov / 2) * Math.PI) / 180) * (16 / 9) * d;
  const rx = -dz / d;
  const rz = dx / d;
  return { ...c, target: [c.target[0] - rx * half * sx, c.target[1], c.target[2] - rz * half * sx] };
};

const BJ_FARM: [number, number] = [0.95, 0.75];
const FX_STREET: [number, number] = [0.15, -1.2];

// Felix in kit: shield on his shield arm, spear upright.
const kitProps = (at: [number, number], c: CameraShot, shieldReach: [number, number] = [210, -430], spearReach: [number, number] = [-215, -480]) => {
  const sh = handWorld(at, shieldReach, c);
  const sp = handWorld(at, spearReach, c);
  return (
    <group>
      <Shield position={[sh[0] + 0.02, sh[1] + 0.06, sh[2] + 0.07]} rotation={[0, -0.12, 0]} />
      <Spear base={[sp[0], 0.01, sp[2] + 0.04]} tip={[sp[0] + 0.02, 1.62, sp[2] + 0.04]} />
    </group>
  );
};

const bjornFarm = (f: number, c: CameraShot, pose: PuppetPlacement["pose"]) => (
  <Stage bg="#c6dbe8" camera={c} set={<FarmTestSet camera={c} frame={f + 200} gate={{ sag: 1 }} />} puppets={[{ id: "narrator-off", look: BJORN, at: BJ_FARM, pose }]} light={morningLight()} energy={0.6} blur={3} />
);
const felixStreet = (f: number, c: CameraShot, pose: PuppetPlacement["pose"], kit = true) => (
  <Stage
    bg="#c2d2de"
    camera={c}
    set={<FortStreetSet camera={c} frame={f + 300}>{kit && kitProps(FX_STREET, c)}</FortStreetSet>}
    puppets={[
      { id: "felix", look: kit ? FELIX_KIT : FELIX, at: FX_STREET, pose: kit ? { reachR: [210, -430], reachL: [-215, -480], handR: "fist", handL: "fist", ...pose } : pose },
      { id: "bgsoldier", look: SOLDIER_A, at: [-1.0, -6.5], pose: { expression: "neutral", view: "side", facing: 1, ...stroll(f, 0, 80, [-1.0, -6.5], [0.2, -6.0]).pose } },
    ]}
    light={fortLight()}
    energy={0.6}
    blur={3}
  />
);

const SplitOpen: React.FC = () => {
  const f = useShotFrame();
  const p = glide(f, 0, 47);
  const cl = offCentre(cam(mix3([1.9, 0.9, 4.6], [1.75, 0.95, 4.0], p), [0.95, 0.85, 0.4], 30), -0.5);
  const cr = offCentre(cam(mix3([-0.6, 1.0, 3.4], [-0.45, 1.05, 2.8], p), [0.15, 0.88, -1.2], 30), 0.5);
  return (
    <AbsoluteFill>
      <Split
        f={f}
        left={bjornFarm(f, cl, { expression: "smug", gesture: "handsOnHips", headTilt: -5, lookX: 0.2 })}
        right={felixStreet(f, cr, { ...faceChange([[0, "neutral"], [26, "determined"]], f), lookX: -0.2 })}
      />
      <BigTitle f={f} text="VIKING" at={0} x={0.235} y={60} size={176} metal="bronze" sub="AD 900 · DENMARK" />
      <BigTitle f={f} text="ROMAN" line2="SOLDIER" at={25} x={0.765} y={34} size={124} metal="gold" sub="AD 105 · VINDOLANDA" />
    </AbsoluteFill>
  );
};

const SplitFaces: React.FC = () => {
  const f = useShotFrame();
  const p = glide(f, 0, 37);
  const cl = offCentre(cam(mix3([1.45, 1.0, 2.6], [1.3, 1.0, 2.2], p), [0.95, 0.98, 0.75], 30), -0.5);
  const cr = offCentre(cam(mix3([-0.2, 1.05, 1.4], [-0.1, 1.05, 1.0], p), [0.15, 1.0, -1.2], 30), 0.5);
  return (
    <AbsoluteFill>
      <Split
        f={f}
        lean={-0.08}
        left={bjornFarm(f + 47, cl, { ...faceChange([[0, "smug"], [16, "excited"]], f), headTilt: -6 + glide(f, 14, 22) * 4, lookX: 0.1 })}
        right={felixStreet(f + 47, cr, { ...faceChange([[0, "determined"], [18, "skeptical"]], f), lookX: -0.1, headTilt: 4 })}
      />
      <BigTitle f={f} text="CHOOSE YOUR" line2="DAILY LIFE" at={1} x={0.5} y={770} size={96} width={0.7} metal="cream" />
    </AbsoluteFill>
  );
};

// ---------- Bjorn ----------

const DOOR_AT: [number, number] = [DOORWAY.x + 0.05, DOORWAY.z + 0.25];
const DoorOut: React.FC = () => {
  const f = useShotFrame() + 84; // final frames, to read off the word timing
  const open = interpolate(f, [94, 99, 103, 107], [0, 1.06, 0.97, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const w = stroll(f, 99, 24, DOOR_AT, [DOORWAY.x + 0.3, DOORWAY.z + 2.3]);
  const c = cam(
    mix3([DOORWAY.x + 0.12, 0.74, DOORWAY.z - 2.1], [DOORWAY.x + 0.1, 0.8, DOORWAY.z - 0.7], glide(f, 98, 140)),
    mix3([DOORWAY.x + 0.1, 0.72, DOORWAY.z + 3], [DOORWAY.x + 0.3, 0.9, DOORWAY.z + 3], glide(f, 118, 140)),
    36,
  );
  const stretch = f > 121;
  return (
    <Stage
      bg="#1c1612"
      camera={c}
      set={
        <FarmTestSet camera={c} frame={f + 100} gate={{ sag: 1 }} house={false}>
          <Doorway open={open} />
        </FarmTestSet>
      }
      puppets={[
        {
          id: "bjorn",
          look: BJORN,
          at: w.at,
          pose: stretch ? { view: "back", ...faceChange([[121, "neutral"], [124, "happy"]], f), armL: [150 + Math.sin(f / 4) * 6, -20], armR: [150 - Math.sin(f / 4) * 6, -20], bob: -glide(f, 122, 130) * 20 } : { expression: "determined", view: "back", ...w.pose },
        },
      ]}
      light={morningLight()}
      energy={0.5}
      blur={2}
    />
  );
};

const BLOCK: Vec3 = [2.85, 0.4, -6.15]; // the chopping stump's top (the Woodpile's stump)
const CHOP_AT: [number, number] = [2.42, -5.72];
const HIT = 179;
const AxeChop: React.FC = () => {
  const f = useShotFrame() + 143;
  const c = cam(mix3([3.75, 0.5, -3.9], [3.55, 0.55, -4.25], glide(f, 143, 197)), [2.55, 0.62, -6.0], 34);
  // the axe goes up over his head (152-172), hangs a beat, then comes down hard on the word "house"
  const up = glide(f, 150, 170);
  const down = interpolate(f, [174, HIT], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) });
  const log: Vec3 = [BLOCK[0], BLOCK[1] + 0.22, BLOCK[2]];
  const rest: [number, number] = [230, -330];
  const raised: [number, number] = [330, -960];
  const hitHand = reachTo(CHOP_AT, [log[0] - 0.36, log[1] + 0.16, log[2]], c);
  const reach: [number, number] = down > 0 ? [raised[0] + (hitHand[0] - raised[0]) * down, raised[1] + (hitHand[1] - raised[1]) * down] : [rest[0] + (raised[0] - rest[0]) * up, rest[1] + (raised[1] - rest[1]) * up];
  const hand = handWorld(CHOP_AT, reach, c);
  // the head: behind and above the hand while raised, swinging through to the log
  const headUp: Vec3 = [hand[0] + 0.05, hand[1] + 0.5, hand[2] - 0.12];
  const headRest: Vec3 = [hand[0] + 0.1, hand[1] - 0.45, hand[2]];
  const head = down > 0 ? mix3(headUp, [log[0], log[1] + 0.06, log[2]], down) : mix3(headRest, headUp, up);
  const split = Math.max(0, f - HIT);
  const fly = (s: 1 | -1) => {
    const t = split / 30;
    return [log[0] + s * Math.min(0.5, t * 1.4), Math.max(0.09, log[1] + t * 0.9 - t * t * 2.6), log[2] + t * 0.15] as Vec3;
  };
  return (
    <Stage
      bg="#c6dbe8"
      camera={c}
      set={
        <FarmTestSet camera={c} frame={f + 100} gate={{ sag: 1 }}>
          <Axe hand={hand} head={head} />
          {split === 0 ? (
            <mesh position={log} castShadow>
              <cylinderGeometry args={[0.1, 0.1, 0.24, 14]} />
              <meshToonMaterial color="#7e6248" />
            </mesh>
          ) : (
            ([-1, 1] as const).map((s) => (
              <mesh key={s} position={fly(s)} rotation={[0, 0, s * Math.min(1.4, split * 0.12)]} castShadow>
                <cylinderGeometry args={[0.1, 0.1, 0.24, 14, 1, false, s > 0 ? 0 : Math.PI, Math.PI]} />
                <meshToonMaterial color="#9a7a58" side={2} />
              </mesh>
            ))
          )}
          <Burst kind="dust" at={[log[0], 0.42, log[2]]} frame={f - HIT} count={14} size={0.6} seed={3} />
          <Burst kind="stars" at={[log[0], log[1] + 0.1, log[2]]} frame={f - HIT} count={6} size={0.5} seed={4} />
        </FarmTestSet>
      }
      puppets={[
        {
          id: "bjorn",
          look: BJORN,
          at: CHOP_AT,
          pose: {
            ...faceChange([[143, "smug"], [168, "determined"], [HIT + 2, "excited"]], f),
            reachR: reach,
            handR: "fist",
            frontR: down > 0.3 || up < 0.2,
            lean: -6 * down + 4 * up * (1 - down),
            crouch: 0.25 * down,
            lookX: 0.5,
          },
        },
      ]}
      light={morningLight()}
      energy={0.4}
      blur={3}
    />
  );
};

// ---------- Felix ----------

const FortStreet: React.FC = () => {
  const f = useShotFrame() + 197;
  const w = stroll(f, 190, 60, [0.1, -5.2], [0.25, -1.4]);
  const c = cam(mix3([0.9, 0.7, 2.2], [0.75, 0.75, 1.3], glide(f, 190, 247)), mix3([0.1, 0.95, -4], [0.2, 0.95, -2.5], glide(f, 190, 247)), 34);
  const daro = stroll(f, 185, 70, [-0.7, -7.5], [-0.55, -3.6]);
  const props = kitProps(w.at, c, [210, -430], [-215, -480]);
  const fg = <Foliage position={frameSpot(cam([0.75, 0.75, 1.3], [0.2, 0.95, -2.5], 34), 16 / 9, 1.02, -0.86, 0.9)} size={0.2} color="#5f7a3a" seed={11} />;
  return (
    <Stage
      bg="#c2d2de"
      camera={c}
      set={<FortStreetSet camera={c} frame={f}>{props}</FortStreetSet>}
      puppets={[
        { id: "felix", look: FELIX_KIT, at: w.at, pose: { ...faceChange([[197, "determined"], [214, "neutral"]], f), ...w.pose, reachR: [210, -430], reachL: [-215, -480], handR: "fist", handL: "fist", view: "front", lookX: 0.2 } },
        { id: "daro", look: DARO, at: daro.at, pose: { expression: "happy", ...daro.pose, hold: { item: "toolbox", hand: "R" }, view: "front" } },
        { id: "officer", look: OFFICER, at: [-FORT.street + 0.6, -6.8], pose: { expression: "neutral", gesture: "point", view: "side", facing: 1 } },
        { id: "soldier", look: SOLDIER_B, at: [FORT.street - 0.5, -9.5], pose: { expression: "bored", view: "side", facing: -1 } },
      ]}
      light={fortLight()}
      energy={0.5}
      blur={3}
      foreground={fg}
    />
  );
};

const FELIX_TUB: [number, number] = [BATH.basin[0] + 0.15, BATH.basin[2] + 0.1];
const Bath: React.FC = () => {
  const f = useShotFrame() + 247;
  const p = glide(f, 240, 285);
  const c = cam(mix3([1.6, 1.4, 3.4], [0.85, 1.25, 2.2], p), mix3([-0.2, 0.62, -1.2], [-0.15, 0.6, -1.15], p), 34);
  const relax = glide(f, 256, 268);
  return (
    <Stage
      bg="#3a3532"
      camera={c}
      set={
        <BathhouseSet camera={c} frame={f}>
          {/* rings round him in the water */}
          {[0, 1, 2].map((i) => {
            const t = ((f - 250 + i * 14) % 42) / 42;
            return (
              <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[FELIX_TUB[0], BATH.water + 0.004, FELIX_TUB[1] + 0.05]}>
                <ringGeometry args={[0.2 + t * 0.45, 0.22 + t * 0.45, 40]} />
                <meshBasicMaterial color="#e8f0ea" transparent opacity={0.4 * (1 - t)} />
              </mesh>
            );
          })}
        </BathhouseSet>
      }
      puppets={[
        {
          id: "felix",
          look: FELIX_BATH,
          at: FELIX_TUB,
          pose: {
            ...faceChange([[247, "neutral"], [258, "happy"]], f),
            sit: true,
            slump: relax * 0.9,
            bob: Math.sin(f / 10) * 4,
            headTilt: relax * 8,
            armL: [62, -10],
            armR: [62, -10],
            view: "front",
          },
        },
      ]}
      light={bathLight(f)}
      energy={0.4}
      blur={4}
    />
  );
};

// ---------- end of the hook ----------

const SplitEnd: React.FC = () => {
  const f = useShotFrame() + 285;
  const p = glide(f, 285, 323);
  const cl = offCentre(cam(mix3([1.6, 1.0, 3.0], [1.45, 1.0, 2.6], p), [0.95, 0.95, 0.75], 30), -0.5);
  const cr = offCentre(cam(mix3([1.0, 1.2, 1.6], [0.8, 1.15, 1.35], p), [-0.15, 0.62, -1.15], 32), 0.5);
  return (
    <Split
      f={f}
      left={bjornFarm(f, cl, { ...faceChange([[285, "smug"], [292, "excited"]], f), gesture: "point", lookX: 0, headTilt: -6 })}
      right={
        <Stage
          bg="#3a3532"
          camera={cr}
          set={<BathhouseSet camera={cr} frame={f} />}
          puppets={[{ id: "felix", look: FELIX_BATH, at: FELIX_TUB, pose: { expression: "happy", sit: true, slump: 0.9, headTilt: 8, armL: [62, -10], armR: [62, -10], view: "front", bob: Math.sin(f / 10) * 4 } }]}
          light={bathLight(f)}
          energy={0.4}
          blur={4}
        />
      }
    />
  );
};

const SHOTS: Shot[] = [
  [0, 47, SplitOpen, false],
  [47, 84, SplitFaces, false],
  [84, 143, DoorOut, true],
  [143, 197, AxeChop, false],
  [197, 247, FortStreet, true],
  [247, 285, Bath, true],
  [285, TIMING.totalFrames, SplitEnd, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("stamp"), volume: 0.55 },
  { at: 25, src: sfx("stamp"), volume: 0.55 },
  { at: 0, src: sfx("wind"), volume: 0.12, until: 47 },
  { at: 50, src: sfx("pop"), volume: 0.3 },
  { at: 80, src: sfx("whoosh"), volume: 0.4 },
  { at: 94, src: sfx("door"), volume: 0.55 },
  { at: 95, src: sfx("wind"), volume: 0.22, until: 197 },
  { at: 150, src: sfx("whoosh"), volume: 0.15 },
  { at: HIT, src: sfx("stamp"), volume: 0.7 },
  { at: HIT, src: sfx("crack"), volume: 0.35 },
  { at: 193, src: sfx("whoosh"), volume: 0.4 },
  { at: 197, src: sfx("ambience"), volume: 0.18, until: 247 },
  { at: 243, src: sfx("whoosh"), volume: 0.4 },
  { at: 249, src: sfx("hiss"), volume: 0.3 },
  { at: 258, src: sfx("splash"), volume: 0.18 },
  { at: 281, src: sfx("whoosh"), volume: 0.35 },
];

const MUSIC: MusicCue[] = [{ src: "music/upbeat.wav", from: 0, to: TIMING.totalFrames, volume: 0.28 }];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post captions={false} />;
