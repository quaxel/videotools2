import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  FADE,
  HEAD_Y,
  lerp3,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  Shot,
  speaking,
  Stage,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Vec3,
  Video,
  walk,
} from "../../engine";
import { CasinoSet, seatOf } from "../../three/CasinoSet";
import { InteriorStrip, STRIP_HEADER_Y, stripRowY, wheelAngleFor, XrayWheel } from "../../three/Interior";
import { AtmSet, ExteriorSet, LabSet } from "../../three/MoreSets";
import { reelAngleFor } from "../../three/SlotMachine";
import { JACKPOT_ROW, STOPS } from "../../three/textures";
import TIMING_JSON from "./timing.json";

// "The Science Behind Slot Machines" (v3, voice-first). Every shot is cut to the frames in timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "slot-machines";
export const timing = TIMING;

type Reels = [number, number, number];

const STEP = (Math.PI * 2) / STOPS.length;
const NEXT_X = 1.15; // the second machine

// ---------- cast ----------

const PLAYER: PuppetLook = { skin: "#fffaf2", hair: "#1d1a1a", outfit: "#2a9d8f", pattern: "#f4d35e", lanyard: "#d62828" };
const BUDDY: PuppetLook = { skin: "#fbe9d6", hair: "#4a2c1a", outfit: "#efe2c6", cap: "#d62828", chain: "#e8b04a" };
const TECH: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#2b4a7a", cap: "#f2b630", lanyard: "#f2b630" };
const ENGINEER: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };

const CUP = { item: "cup", hand: "R" } as const;
const DRINK = { item: "drink", hand: "L" } as const;
const HOLD_IN_FRONT: [number, number] = [10, -78];
const SIDE_CARRY: [number, number] = [8, 62];

// ---------- reels ----------

type ReelStop = { stop: number; offset: number; at: number; spins: number; bump: number };
const NEAR_MISS = (t1: number, t2: number, t3: number): ReelStop[] => [
  { stop: 0, offset: 0, at: t1, spins: 3, bump: 0.12 },
  { stop: 6, offset: 0, at: t2, spins: 4, bump: 0.12 },
  { stop: 0, offset: 1, at: t3, spins: 5, bump: 0.4 }, // teases toward the line, settles one click high
];
const reelAngle = (f: number, r: ReelStop) => {
  const target = reelAngleFor(r.stop, r.offset) + Math.PI * 2 * r.spins;
  if (f < r.at) return target - Math.PI * 2 * r.spins * (1 - Easing.out(Easing.cubic)(Math.max(0, f) / r.at));
  const t = f - r.at;
  return target + r.bump * STEP * Math.exp(-t / 3) * Math.sin(t / 2.2);
};
const reelsAt = (f: number, stops: ReelStop[]) => stops.map((r) => reelAngle(f, r)) as Reels;
const settled = (stops: ReelStop[]) => reelsAt(10_000, stops);
const kick = (f: number, stops: ReelStop[]) =>
  stops.reduce((sum, r) => (f < r.at ? sum : sum + 0.012 * Math.exp(-(f - r.at) / 2.5) * Math.cos((f - r.at) * 1.8)), 0);
const spinning = (f: number): Reels => [f * 0.9, f + 1, f * 1.1 + 2];

const HOOK = NEAR_MISS(18, 30, 64);
const AGAIN = NEAR_MISS(6, 13, 21);
const LOOP = NEAR_MISS(22, 36, 66);

const buddyTalking = (finalFrame: number) => speaking(TIMING, "buddy", finalFrame);

type CasinoProps = {
  camera: CameraShot;
  hero?: Reels;
  next?: Reels;
  credits?: number;
  heroShake?: number;
  nextDoor?: number;
  nextKey?: number;
  night?: boolean;
  blur?: number;
  truth?: number;
  flash?: number;
  puppets?: PuppetPlacement[];
};
const Casino: React.FC<CasinoProps> = ({ camera, hero = settled(HOOK), next = settled(AGAIN), credits, heroShake, nextDoor, nextKey, night, ...rest }) => {
  const frame = useShotFrame();
  return (
    <Stage
      bg={night ? "#070b1c" : "#1c0a0f"}
      camera={camera}
      {...rest}
      set={<CasinoSet frame={frame} camera={camera} heroReels={hero} nextReels={next} nextCredits={credits} heroShake={heroShake} nextDoor={nextDoor} nextKey={nextKey} night={night} />}
    />
  );
};

// Feet positions: seated puppets sit just in front of their stool.
const HERO_AT: [number, number] = [seatOf(0)[0], seatOf(0)[1] + 0.22];
const NEXT_AT: [number, number] = [seatOf(NEXT_X)[0], seatOf(NEXT_X)[1] + 0.22];
const BUDDY_STAND: [number, number] = [NEXT_X - 0.9, 1.28];
const TECH_STAND: [number, number] = [NEXT_X + 0.08, 1.32];

const shift = (c: CameraShot, dx: number): CameraShot => ({
  ...c,
  position: [c.position[0] + dx, c.position[1], c.position[2]],
  target: [c.target[0] + dx, c.target[1], c.target[2]],
});
const reelsCam = (p: number): CameraShot => ({ position: lerp3([-0.38, 0.95, 2.75], [-0.3, 1.0, 2.4], p), target: [0, 1.28, 0], fov: 34 });
const mediumCam = (mx: number, p: number): CameraShot => ({ position: lerp3([mx - 0.9, 1.25, 4.2], [mx - 0.82, 1.22, 3.8], p), target: [mx - 0.1, 1.0, 0.4], fov: 36 });
const wideCam = (mx: number, p: number): CameraShot => ({ position: lerp3([mx - 0.4, 1.6, 5.4], [mx - 0.3, 1.55, 5.0], p), target: [mx, 1.0, 0], fov: 38 });
const closeCam = (mx: number, p: number): CameraShot => ({ position: lerp3([mx - 0.55, 1.05, 2.95], [mx - 0.5, 1.03, 2.65], p), target: [mx - 0.28, HEAD_Y - 0.08, 1.1], fov: 36 });
const twoShotCam = (p: number): CameraShot => ({ position: lerp3([NEXT_X - 0.8, 1.15, 4.3], [NEXT_X - 0.75, 1.15, 4.0], p), target: [NEXT_X - 0.45, 0.95, 0.6], fov: 38 });

const player = (at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id: "player", look: PLAYER, at, pose });

// ---------- shots (final frames) ----------

const Hook: React.FC = () => {
  const f = useShotFrame();
  const cam = reelsCam(f / 80);
  cam.position = [cam.position[0], cam.position[1] + kick(f, HOOK), cam.position[2]];
  return <Casino camera={cam} hero={reelsAt(f, HOOK)} />;
};

const Excited: React.FC = () => {
  const f = useShotFrame();
  return (
    <Casino
      camera={mediumCam(0, f / 45)}
      puppets={[player(HERO_AT, { sit: true, hold: CUP, expression: "excited", armL: [150, -25], armR: [150, -25], bob: breathe(f) + Math.abs(Math.sin(f / 2.5)) * -14 })]}
    />
  );
};

const Longing: React.FC = () => {
  const f = useShotFrame();
  return (
    <Casino
      camera={closeCam(0, f / 47)}
      blur={7}
      puppets={[player(HERO_AT, { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: f < 24 ? "excited" : "smug", lookX: 0.8, headTilt: -6, blink: f >= 30 && f < 33 })]}
    />
  );
};

// Gag: the player smacks the machine; the cabinet rattles. The repair guy crosses the back of the room (the seed).
const Smack: React.FC = () => {
  const f = useShotFrame();
  const up = ramp(f, 0, 12);
  const down = ramp(f, 12, 15);
  const armR: [number, number] = [interpolate(up - down, [0, 1], [20, 165]), interpolate(up - down, [0, 1], [-60, 0])];
  const shake = f >= 15 ? Math.exp(-(f - 15) / 9) : 0;
  return (
    <Casino
      camera={wideCam(0, f / 59)}
      heroShake={shake}
      puppets={[
        player(HERO_AT, { sit: true, hold: CUP, armL: HOLD_IN_FRONT, armR, expression: f < 15 ? "skeptical" : "shocked", lookX: 1, bob: f >= 15 ? -shake * 18 : 0 }),
        { id: "tech", look: TECH, at: [interpolate(f, [0, 59], [-1.6, 1.4]), 2.3], pose: { view: "side", facing: 1, hold: { item: "toolbox", hand: "R" }, armR: [6, 4], expression: "neutral", ...walk(f) } },
      ]}
    />
  );
};

const Unlucky: React.FC = () => {
  const f = useShotFrame();
  // Low angle up at the player and the sign
  const cam: CameraShot = { position: lerp3([-0.62, 0.55, 2.25], [-0.6, 0.52, 2.05], f / 63), target: [-0.2, 1.3, 0.6], fov: 44 };
  return <Casino camera={cam} puppets={[player(HERO_AT, { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: "skeptical", lookX: 1, headTilt: -5, blink: f >= 40 && f < 43 })]} />;
};

const Switch: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.inOut(Easing.quad)(f / 28);
  return (
    <Casino
      camera={mediumCam(p * NEXT_X, p)}
      puppets={[player([interpolate(p, [0, 1], [HERO_AT[0], NEXT_AT[0]]), 1.15], { view: "side", facing: 1, hold: CUP, armR: SIDE_CARRY, expression: "neutral", ...walk(f) })]}
    />
  );
};

const Again: React.FC = () => {
  const f = useShotFrame();
  // Over the shoulder: the back of the head stays small, low in the corner.
  const cam: CameraShot = { position: lerp3([NEXT_AT[0] - 0.55, 1.72, 5.2], [NEXT_AT[0] - 0.53, 1.7, 5.0], f / 25), target: [NEXT_X + 0.12, 1.22, 0], fov: 24 };
  cam.position = [cam.position[0], cam.position[1] + kick(f, AGAIN), cam.position[2]];
  return <Casino camera={cam} next={reelsAt(f, AGAIN)} puppets={[player(NEXT_AT, { view: "back", sit: true, expression: "neutral", bob: breathe(f) * 0.4 })]} />;
};

const Buddy: React.FC = () => {
  const f = useShotFrame();
  const enter = Easing.out(Easing.cubic)(ramp(f, 0, 14));
  const speaking = buddyTalking(useFinalFrame());
  return (
    <Casino
      camera={twoShotCam(f / 48)}
      puppets={[
        player(NEXT_AT, { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: "skeptical", lookX: -1, headTilt: -4, bob: breathe(f) }),
        {
          id: "buddy",
          look: BUDDY,
          at: [interpolate(enter, [0, 1], [BUDDY_STAND[0] - 0.9, BUDDY_STAND[0]]), BUDDY_STAND[1]],
          pose:
            f < 14
              ? { view: "side", facing: 1, hold: { item: "drink", hand: "R" }, armR: SIDE_CARRY, expression: "smug", ...walk(f) }
              : { expression: "smug", hold: DRINK, armL: HOLD_IN_FRONT, lookX: 1, headTilt: 14, mouthOpen: speaking ? talk(f) : 0, armR: speaking ? [70, 40] : [14, 10], bob: breathe(f) },
        },
      ]}
    />
  );
};

const Atm: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.2, 2.9], [-0.45, 1.15, 2.6], (f + FADE) / 38), target: [0.05, 0.95, 0], fov: 40 };
  return (
    <Stage
      bg="#08292b"
      camera={cam}
      set={<AtmSet camera={cam} frame={f} />}
      puppets={[player([-0.3, 0.55], { hold: CUP, armL: HOLD_IN_FRONT, armR: [40 + Math.sin(f / 2) * 6, -30], expression: "neutral", lookX: 1, bob: breathe(f) })]}
    />
  );
};

const Cash: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.38, 1.3, 0.55], [0.37, 1.18, 0.5], f / 29), target: [0.35, 0.72, 0.02], fov: 42 };
  return <Stage bg="#08292b" camera={cam} set={<AtmSet camera={cam} frame={f} cash={Easing.out(Easing.cubic)(ramp(f, 2, 22))} />} />;
};

const Drain: React.FC = () => {
  const f = useShotFrame();
  const credits = Math.max(0, 100 - Math.floor(Math.max(0, f - 2) / 3.5) * 10);
  const cam: CameraShot = { position: lerp3([NEXT_X - 0.02, 1.02, 2.0], [NEXT_X - 0.05, 1.0, 1.75], (f + FADE) / 49), target: [NEXT_X - 0.08, 0.92, 0.35], fov: 38 };
  return <Casino camera={cam} next={spinning(f)} credits={credits} />;
};

// Gag: the cup goes upside down, one sad coin drops out.
const Shake: React.FC = () => {
  const f = useShotFrame();
  const flip = ramp(f, 0, 6);
  const drop = f >= 18 ? Math.min(1, (f - 18) / 10) ** 2 * 520 : undefined;
  const cam: CameraShot = { position: lerp3([NEXT_X - 0.6, 1.0, 2.4], [NEXT_X - 0.56, 0.98, 2.2], f / 51), target: [NEXT_AT[0] + 0.05, 0.7, 1.1], fov: 40 };
  return (
    <Casino
      camera={cam}
      credits={0}
      puppets={[
        player(NEXT_AT, {
          sit: true,
          hold: CUP,
          itemTilt: flip * 180,
          coinDrop: drop,
          armR: [70 + Math.sin(f * 1.6) * (f < 18 ? 14 : 0), -20],
          expression: f < 28 ? "skeptical" : "shocked",
          lookX: 0.4,
          headTilt: f > 28 ? 8 : 0,
        }),
      ]}
    />
  );
};

const Repairman: React.FC = () => {
  const f = useShotFrame();
  const arrive = Easing.out(Easing.quad)(ramp(f, 0, 30));
  return (
    <Casino
      camera={twoShotCam(0.5 + f / 108)}
      night
      puppets={[
        player(NEXT_AT, { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: "skeptical", lookX: 1, bob: breathe(f) }),
        {
          id: "tech",
          look: TECH,
          at: [interpolate(arrive, [0, 1], [TECH_STAND[0] + 1.4, TECH_STAND[0]]), TECH_STAND[1]],
          pose:
            f < 30
              ? { view: "side", facing: -1, hold: { item: "toolbox", hand: "R" }, armR: [6, 4], expression: "neutral", ...walk(f) }
              : { hold: { item: "key", hand: "L" }, armL: [40, -40], expression: "smug", lookX: -1, bob: breathe(f) },
        },
      ]}
    />
  );
};

const Key: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([NEXT_X + 0.15, 0.75, 1.55], [NEXT_X + 0.2, 0.7, 1.35], f / 40), target: [NEXT_X + 0.3, 0.5, 0.46], fov: 36 };
  return <Casino camera={cam} truth={0.3} nextDoor={0} nextKey={Easing.inOut(Easing.cubic)(ramp(f, 4, 26))} />;
};

const DoorOpen: React.FC = () => {
  const f = useShotFrame();
  const push = Easing.in(Easing.cubic)(ramp(f, 14, 49));
  const cam: CameraShot = { position: lerp3([NEXT_X - 0.2, 0.95, 2.6], [NEXT_X, 0.7, 0.75], push), target: [NEXT_X, 0.65, 0], fov: 38 };
  return <Casino camera={cam} night nextDoor={Easing.out(Easing.back(1.4))(ramp(f, 0, 18))} flash={ramp(f, 40, 49)} />;
};

const Inside: React.FC<{ camera: CameraShot; stamps?: number; highlight?: boolean; stampPress?: number; flash?: number; spin?: number }> = ({
  camera,
  stamps = 0,
  highlight = false,
  stampPress,
  flash = 0,
  spin,
}) => {
  const f = useShotFrame();
  return (
    <Stage
      bg="#24110a"
      camera={camera}
      flash={flash}
      set={<InteriorStrip frame={f} camera={camera} reelSpin={spin ?? f * 0.35} stamps={stamps} highlight={highlight} stampPress={stampPress} />}
    />
  );
};

const ReelsInside: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.inOut(Easing.quad)(f / 54);
  return <Inside camera={{ position: lerp3([0, 2.55, 1.15], [-0.25, 2.0, 1.4], p), target: lerp3([0, 2.55, 0], [-0.4, 1.85, 0], p), fov: 44 }} flash={1 - ramp(f, 0, 10)} />;
};

const Header: React.FC = () => {
  const f = useShotFrame();
  const y = STRIP_HEADER_Y;
  return <Inside spin={0} camera={{ position: lerp3([0.25, y + 0.1, 1.0], [0.1, y + 0.02, 0.8], f / 47), target: [0.02, y, 0], fov: 40 }} />;
};

const Scroll: React.FC = () => {
  const f = useShotFrame();
  const y = interpolate(Easing.inOut(Easing.quad)(f / 44), [0, 1], [stripRowY(4), stripRowY(24)]);
  return <Inside spin={0} camera={{ position: [-0.15, y + 0.12, 1.2], target: [0.02, y, 0], fov: 38 }} />;
};

const Seven: React.FC = () => {
  const f = useShotFrame();
  const y = stripRowY(JACKPOT_ROW);
  return <Inside spin={0} highlight={f >= 16} camera={{ position: lerp3([0.05, y + 0.3, 1.35], [0.08, y + 0.05, 1.0], Easing.out(Easing.cubic)(f / 34)), target: [0.05, y, 0], fov: 40 }} />;
};

const One: React.FC = () => {
  const f = useShotFrame();
  const y = stripRowY(JACKPOT_ROW);
  return <Inside spin={0} highlight camera={{ position: lerp3([0.12, y + 0.03, 0.62], [0.14, y + 0.02, 0.5], f / 34), target: [0.14, y, 0], fov: 36 }} />;
};

// Twelve stamps over two shots, six each; a stamp lands every 8 frames.
const Stamps: React.FC<{ first: number; camera: (p: number) => CameraShot; dur: number }> = ({ first, camera, dur }) => {
  const f = useShotFrame();
  const t = Math.max(0, f - 2);
  const k = Math.min(5, Math.floor(t / 8));
  const phase = (t % 8) / 8;
  const stamps = first + Math.min(6, k + (phase >= 0.5 ? 1 : 0));
  return <Inside spin={0} highlight stamps={stamps} stampPress={t < 48 ? Math.sin(phase * Math.PI) : undefined} camera={camera(f / dur)} />;
};
const StampsA: React.FC = () => {
  const y = stripRowY(JACKPOT_ROW);
  return <Stamps first={0} dur={48} camera={(p) => ({ position: lerp3([0.12, y, 1.3], [0.14, y, 1.15], p), target: [0.12, y, 0], fov: 42 })} />;
};
const StampsB: React.FC = () => {
  const y = stripRowY(JACKPOT_ROW);
  return <Stamps first={6} dur={50} camera={(p) => ({ position: lerp3([0.55, y + 0.65, 0.8], [0.5, y + 0.6, 0.7], p), target: [0.12, y - 0.05, 0], fov: 44 })} />;
};

const engineer = (pose: PuppetPose): PuppetPlacement => ({ id: "engineer", look: ENGINEER, at: [-1.25, 0.45], pose });

const Lab: React.FC<{ camera: CameraShot; jackpot: number; nearMiss: number; pop?: number; pose: PuppetPose }> = ({ camera, jackpot, nearMiss, pop, pose }) => {
  const f = useShotFrame();
  return <Stage bg="#0e2a5e" camera={camera} set={<LabSet camera={camera} frame={f} jackpot={jackpot} nearMiss={nearMiss} pop={pop} />} puppets={[engineer(pose)]} />;
};

const LabWide: React.FC = () => {
  const f = useShotFrame();
  return (
    <Lab
      camera={{ position: lerp3([-0.75, 1.45, 4.2], [-0.7, 1.4, 3.9], (f + FADE) / 44), target: [-0.6, 0.85, 0], fov: 42 }}
      jackpot={0.5}
      nearMiss={0.5}
      pose={{ expression: "smug", armL: [30, -40], armR: [30, -40], lookX: 0, bob: breathe(f) }}
    />
  );
};

const LabMap: React.FC = () => {
  const f = useShotFrame();
  return (
    <Lab
      camera={{ position: lerp3([-1.0, 0.55, 2.4], [-0.95, 0.52, 2.2], f / 70), target: [-0.75, 0.95, 0.2], fov: 46 }}
      jackpot={interpolate(f, [10, 60], [0.5, 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}
      nearMiss={0.5}
      pose={{ expression: "smug", armL: [40 + Math.sin(f / 3) * 6, -60], armR: [30, -40], lookX: -0.6, bob: breathe(f) }}
    />
  );
};

const JackpotDial: React.FC = () => {
  const f = useShotFrame();
  return <Lab camera={{ position: lerp3([-0.5, 1.5, 0.82], [-0.5, 1.42, 0.74], f / 44), target: [-0.5, 0.98, 0.3], fov: 40 }} jackpot={0.08} nearMiss={0.5} pose={{ expression: "smug" }} />;
};

const NearMissDial: React.FC = () => {
  const f = useShotFrame();
  return (
    <Lab
      camera={{ position: lerp3([0.5, 1.5, 0.82], [0.5, 1.42, 0.74], f / 40), target: [0.5, 0.98, 0.3], fov: 40 }}
      jackpot={0.08}
      nearMiss={interpolate(f, [2, 34], [0.5, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.quad) })}
      pose={{ expression: "excited" }}
    />
  );
};

// Gag: cranked past the end stop, the knob pops off and the engineer flinches.
const KnobPop: React.FC = () => {
  const f = useShotFrame();
  const pop = ramp(f, 4, 26);
  return (
    <Lab
      camera={{ position: lerp3([-0.55, 1.25, 3.3], [-0.6, 1.22, 3.1], f / 35), target: [-0.4, 1.2, 0.2], fov: 46 }}
      jackpot={0.08}
      nearMiss={1}
      pop={pop > 0 ? pop : undefined}
      pose={{ expression: f < 6 ? "excited" : "shocked", armL: f < 6 ? [30, -40] : [150, -20], armR: f < 6 ? [30, -40] : [150, -20], bob: f >= 6 ? -Math.abs(Math.sin(f / 2)) * 10 : 0 }}
    />
  );
};

// The weighted wheel, cut into three short shots that each end on one landing.
const WHEEL_LANDINGS = [
  { at: 34, slice: 3 },
  { at: 66, slice: -5 },
  { at: 96, slice: 1 },
];
const wheelAt = (t: number) => {
  let start = wheelAngleFor(0) - Math.PI * 4;
  let begin = 0;
  for (const l of WHEEL_LANDINGS) {
    const end = wheelAngleFor(l.slice) + Math.PI * 2 * Math.ceil((start - wheelAngleFor(l.slice)) / (Math.PI * 2) + 2);
    if (t < l.at) return start + (end - start) * Easing.out(Easing.cubic)(ramp(t, begin, l.at));
    start = end;
    begin = l.at + 4;
  }
  return start;
};
const WHEEL_FROM = 1217; // final frame where the wheel clock starts

const Wheel: React.FC<{ camera: (p: number) => CameraShot; dur: number }> = ({ camera, dur }) => {
  const f = useShotFrame();
  const t = useFinalFrame() - WHEEL_FROM;
  return (
    <Stage
      bg="#08142e"
      camera={camera(f / dur)}
      set={<XrayWheel frame={f} camera={camera(f / dur)} wheel={wheelAt(t)} nearMisses={WHEEL_LANDINGS.filter((l) => t >= l.at).length} />}
    />
  );
};
const WheelA: React.FC = () => <Wheel dur={48} camera={(p) => ({ position: lerp3([0, 0.55, 1.25], [0, 0.55, 1.1], p), target: [0, 0.55, 0], fov: 42 })} />;
const WheelB: React.FC = () => <Wheel dur={30} camera={(p) => ({ position: lerp3([0.55, 1.35, 1.0], [0.5, 1.3, 0.9], p), target: [0, 0.6, 0.2], fov: 40 })} />;
const WheelC: React.FC = () => (
  <Wheel dur={35} camera={(p) => ({ position: lerp3([0, 0.7, 1.6], [0, 1.05, 3.4], Easing.inOut(Easing.cubic)(p)), target: lerp3([0, 0.6, 0], [0, 1.0, 0], p), fov: 42 })} />
);

const Brain: React.FC = () => {
  const f = useShotFrame();
  return (
    <Casino
      camera={closeCam(NEXT_X, (f + FADE) / 56)}
      blur={8}
      truth={1}
      puppets={[player(NEXT_AT, { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: f < 28 ? "shocked" : "skeptical", lookX: f < 28 ? 0 : 0.8, blink: f >= 30 && f < 33 })]}
    />
  );
};

const Leave: React.FC = () => {
  const f = useShotFrame();
  const out = Easing.in(Easing.quad)(ramp(f, 8, 55));
  return (
    <Casino
      camera={twoShotCam(1)}
      truth={0.35}
      puppets={[
        player(
          [interpolate(out, [0, 1], [NEXT_AT[0], NEXT_X + 1.7]), f < 8 ? NEXT_AT[1] : 1.15],
          f < 8 ? { sit: true, hold: CUP, armR: HOLD_IN_FRONT, expression: "smug", lookX: 1 } : { view: "side", facing: 1, hold: CUP, armR: SIDE_CARRY, expression: "smug", ...walk(f) },
        ),
        { id: "buddy", look: BUDDY, at: BUDDY_STAND, pose: { hold: DRINK, armL: HOLD_IN_FRONT, expression: "neutral", lookX: 1, bob: breathe(f) } },
      ]}
    />
  );
};

const Exit: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f + FADE, 0, 83);
  const cam: CameraShot = { position: lerp3([-0.9, 0.35, 3.6], [-0.8, 0.32, 3.3], p), target: [0.1, 1.45, -0.4], fov: 46 };
  const pocket = ramp(f, 50, 62);
  return (
    <Stage
      bg="#14062b"
      camera={cam}
      set={<ExteriorSet camera={cam} frame={f} />}
      puppets={[
        player([interpolate(p, [0, 1], [0.0, 0.85]), interpolate(p, [0, 1], [-0.75, 1.2])], {
          expression: pocket > 0 ? "smug" : "neutral",
          armR: [interpolate(pocket, [0, 1], [12, 25]), interpolate(pocket, [0, 1], [10, -95])],
          ...walk(f),
        }),
      ]}
    />
  );
};

const Stays: React.FC = () => {
  const f = useShotFrame();
  return (
    <Casino
      camera={wideCam(NEXT_X, (f + FADE) / 44)}
      night
      puppets={[{ id: "buddy", look: BUDDY, at: NEXT_AT, pose: { sit: true, hold: DRINK, armL: HOLD_IN_FRONT, expression: "smug", lookX: 1, bob: breathe(f) } }]}
    />
  );
};

const ComeOn: React.FC = () => {
  const f = useShotFrame();
  const talking = buddyTalking(useFinalFrame());
  return (
    <Casino
      camera={closeCam(NEXT_X, f / 40)}
      night
      blur={7}
      next={spinning(f)}
      puppets={[
        {
          id: "buddy",
          look: BUDDY,
          at: NEXT_AT,
          pose: { sit: true, hold: DRINK, armL: HOLD_IN_FRONT, armR: [150, -20], expression: "excited", lookX: 0.7, headTilt: Math.sin(f / 4) * 3, mouthOpen: talking ? talk(f) : 0, bob: breathe(f) * 0.5 },
        },
      ]}
    />
  );
};

const Loop: React.FC = () => {
  const f = useShotFrame();
  const cam = shift(reelsCam(f / 101), NEXT_X);
  cam.position = [cam.position[0], cam.position[1] + kick(f, LOOP), cam.position[2]];
  return <Casino camera={cam} next={reelsAt(f, LOOP)} />;
};

// [from, to, shot, dissolve in]
const SHOTS: Shot[] = [
  [0, 80, Hook, false],
  [80, 125, Excited, false],
  [125, 172, Longing, false],
  [172, 231, Smack, false],
  [231, 294, Unlucky, false],
  [294, 322, Switch, false],
  [322, 347, Again, false],
  [347, 395, Buddy, false],
  [395, 425, Atm, true],
  [425, 454, Cash, false],
  [454, 495, Drain, true],
  [495, 546, Shake, false],
  [546, 600, Repairman, false],
  [600, 640, Key, false],
  [640, 689, DoorOpen, false],
  [689, 743, ReelsInside, false],
  [743, 790, Header, false],
  [790, 834, Scroll, false],
  [834, 868, Seven, false],
  [868, 902, One, false],
  [902, 950, StampsA, false],
  [950, 1000, StampsB, false],
  [1000, 1036, LabWide, true],
  [1036, 1106, LabMap, false],
  [1106, 1150, JackpotDial, false],
  [1150, 1190, NearMissDial, false],
  [1190, 1225, KnobPop, false],
  [1225, 1273, WheelA, true],
  [1273, 1303, WheelB, false],
  [1303, 1338, WheelC, false],
  [1338, 1378, Brain, true],
  [1378, 1433, Leave, false],
  [1433, 1508, Exit, true],
  [1508, 1544, Stays, true],
  [1544, 1584, ComeOn, false],
  [1584, TIMING.totalFrames, Loop, false],
];

// ---------- sound ----------


const reelEvents = (from: number, stops: ReelStop[]): Sfx[] => [
  { at: from, src: "sfx/reel-spin.wav", volume: 0.35, until: from + stops[2].at },
  ...stops.map((r) => ({ at: from + r.at, src: "sfx/reel-stop.wav", volume: 0.7 })),
  { at: from + stops[2].at + 3, src: "sfx/near-miss.wav", volume: 0.45 },
];

const wheelTicks = (): Sfx[] => {
  const STEP64 = (Math.PI * 2) / 64;
  const ticks: Sfx[] = [];
  let last = Math.floor(wheelAt(0) / STEP64);
  let lastAt = -10;
  for (let t = 0; t <= 120; t += 0.25) {
    const slice = Math.floor(wheelAt(t) / STEP64);
    if (slice !== last && t - lastAt >= 1) {
      ticks.push({ at: WHEEL_FROM + t, src: "sfx/tick.wav", volume: 0.5 });
      lastAt = t;
    }
    last = slice;
  }
  return ticks;
};

const SFX: Sfx[] = [
  { at: 0, src: "sfx/ambience.wav", volume: 0.2, until: 395 },
  ...reelEvents(0, HOOK),
  { at: 82, src: "sfx/chime.wav", volume: 0.25 },
  { at: 187, src: "sfx/stamp.wav", volume: 0.9 },
  { at: 188, src: "sfx/reel-stop.wav", volume: 0.6 },
  ...reelEvents(322, AGAIN),
  { at: 395, src: "sfx/button.wav", volume: 0.4 },
  { at: 410, src: "sfx/button.wav", volume: 0.4 },
  { at: 427, src: "sfx/bill-whirr.wav", volume: 0.5 },
  { at: 454, src: "sfx/ambience.wav", volume: 0.2, until: 546 },
  { at: 454, src: "sfx/reel-spin.wav", volume: 0.3, until: 495 },
  ...Array.from({ length: 10 }, (_, k) => ({ at: 456 + Math.round(3.5 * k), src: "sfx/credit-blip.wav", volume: 0.3 })),
  { at: 513, src: "sfx/credit-blip.wav", volume: 0.5 },
  { at: 524, src: "sfx/tick.wav", volume: 0.8 },
  { at: 546, src: "sfx/hum.wav", volume: 0.18, until: 689 },
  { at: 610, src: "sfx/button.wav", volume: 0.8 },
  { at: 622, src: "sfx/reel-stop.wav", volume: 0.6 },
  { at: 641, src: "sfx/whoosh.wav", volume: 0.4 },
  { at: 672, src: "sfx/whoosh.wav", volume: 0.6 },
  { at: 689, src: "sfx/hum.wav", volume: 0.3, until: 1000 },
  { at: 689, src: "sfx/reel-spin.wav", volume: 0.15, until: 743 },
  { at: 745, src: "sfx/paper.wav", volume: 0.45 },
  { at: 852, src: "sfx/chime.wav", volume: 0.3 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: (k < 6 ? 902 + 6 + 8 * k : 950 + 6 + 8 * (k - 6)), src: "sfx/stamp.wav", volume: 0.65 })),
  { at: 1000, src: "sfx/hum.wav", volume: 0.15, until: 1225 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 1046 + k * 6, src: "sfx/tick.wav", volume: 0.5 })),
  ...Array.from({ length: 10 }, (_, k) => ({ at: 1154 + k * 3, src: "sfx/tick.wav", volume: 0.5 })),
  { at: 1194, src: "sfx/boom.wav", volume: 0.35 },
  { at: 1195, src: "sfx/near-miss.wav", volume: 0.25 },
  ...wheelTicks(),
  ...WHEEL_LANDINGS.map((l) => ({ at: WHEEL_FROM + l.at + 2, src: "sfx/near-miss.wav", volume: 0.35 })),
  { at: 1338, src: "sfx/boom.wav", volume: 0.6 },
  { at: 1378, src: "sfx/ambience.wav", volume: 0.15, until: 1433 },
  { at: 1508, src: "sfx/hum.wav", volume: 0.12, until: 1584 },
  { at: 1560, src: "sfx/button.wav", volume: 0.6 },
  { at: 1560, src: "sfx/reel-spin.wav", volume: 0.3, until: 1584 },
  ...reelEvents(1584, LOOP),
];

const MUSIC: MusicCue[] = [
  { src: "music/lounge.wav", from: 0, to: 546, volume: 0.26 },
  { src: "music/mystery.wav", from: 546, to: 1338, volume: 0.32 },
  { src: "music/lounge.wav", from: 1378, to: TIMING.totalFrames, volume: 0.2 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
