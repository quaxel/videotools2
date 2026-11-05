import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import {
  CameraShot,
  faceChange,
  Foliage,
  frameSpot,
  lerp3,
  lieDown,
  MUSIC_FILES,
  MusicCue,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { ThoughtCloud } from "../pisces-sign/props";
import { NEIGHBOUR, YOU } from "./Design";
import { Badge, Dog, DogNoseProp, DogPose, Drumstick, ease, FeedCard, ScentBlast, ScentRibbon, SockMonster, StinkLines } from "./props";
import { BED, bedroomLight, BedroomSet, BINS, CORNER_X, KitchenSet, kitchenLight, NoseVoid, SOCKS, STOVE, StreetMode, StreetSet, streetLight, TREE, VOID_YOU } from "./sets";
import { Dutch, Shout } from "./Shout";
import TIMING_JSON from "./timing.json";

// "You Wake Up With a Dog's Nose": the user's own comedy script. You wake with a dog's nose, the smells of the
// house hit you (the neighbour's breakfast, yesterday's pizza, socks that come alive), outside the street tree is a
// dog social feed (Rocky posted twelve times), a golden chicken smell drags you down the street to a trash can where
// Rocky is already waiting: "Bro. Get in line." You get in line. Pixar-look sets in sets.tsx
// (guide/references/suburb-street.md), characters and props in props.tsx, designed on the DogNoseDesign board.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "dog-nose";
export const timing = TIMING;

const cam = (position: Vec3, target: Vec3, fov = 40): CameraShot => ({ position, target, fov });
const move = (a: CameraShot, b: CameraShot, p: number): CameraShot => {
  const e = ease(p);
  return { position: lerp3(a.position, b.position, e), target: lerp3(a.target, b.target, e), fov: a.fov + (b.fov - a.fov) * e };
};
const you = (at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id: "narrator", look: YOU, at, pose });
// Seated on the front edge of the bed: the mattress is higher than a chair, so the puppet is lifted by `air`.
const BED_AT: [number, number] = [BED.x + 0.1, BED.z + 1.18];
const BED_AIR = (BED.top - 0.36) * 815;
// The dog nose on your face, in world space, for front-on shots.
const noseAt = (at: [number, number], air = 0): Vec3 => [at[0], 0.95 + air / 815, at[1] + 0.05];

const street = (mode: StreetMode, c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, opts: { near?: Vec3; binLid?: number; binShake?: number; blur?: number; energy?: number; foreground?: React.ReactNode } = {}) => (
  <Stage
    bg="#88c8ff"
    camera={c}
    set={
      <StreetSet camera={c} f={f} mode={mode} binLid={opts.binLid} binShake={opts.binShake}>
        {extra}
      </StreetSet>
    }
    puppets={puppets}
    light={streetLight(mode, opts.near)}
    blur={opts.blur}
    energy={opts.energy}
    foreground={opts.foreground}
  />
);
const bedroom = (c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, opts: { blur?: number; energy?: number; socks?: boolean; shaft?: boolean } = {}) => (
  <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} socks={opts.socks} shaft={opts.shaft}>{extra}</BedroomSet>} puppets={puppets} light={bedroomLight()} blur={opts.blur} energy={opts.energy} />
);

// Coffee and pizza scent paths through the bedroom (from the door and the desk toward the bed).
const COFFEE_PATH: Vec3[] = [[2.6, 1.6, 1.2], [1.6, 1.3, 0.6], [0.6, 1.1, 0.1], [BED_AT[0] + 0.1, 0.95, BED_AT[1] + 0.12]];
const PIZZA_PATH: Vec3[] = [[1.3, 0.85, -1.85], [0.9, 1.15, -1.1], [0.3, 1.0, -0.6], [BED_AT[0] + 0.12, 0.93, BED_AT[1] + 0.12]];

// ---------- 0-5 s: the hook ----------

// Close on you sitting up in bed: eyes snap open, the dog nose twitches, smell ribbons stream past the lens. The
// shot's clock can be offset: the video's last frames are this shot just before frame 0, so the Short loops.
const LOOP = 30;
const wakeAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const c = move(cam([BED_AT[0] + 0.28, 1.2, BED_AT[1] + 1.25], [BED_AT[0], 1.12, BED_AT[1]], 36), cam([BED_AT[0] + 0.2, 1.16, BED_AT[1] + 0.95], [BED_AT[0], 1.12, BED_AT[1]], 36), (f + LOOP) / (26 + LOOP));
  const face = faceChange([[-99, "sad"], [6, "shocked"]], f);
  return bedroom(
    c,
    f,
    [you(BED_AT, { sit: true, air: BED_AIR, ...face, blink: f < 6 ? true : face.blink, lookX: f < 6 ? 0 : 0.5 })],
    <>
      <DogNoseProp position={noseAt(BED_AT, BED_AIR)} f={f} sniff={f > 4 ? 1 : 0.3} scale={0.7} />
      <ScentRibbon points={COFFEE_PATH} f={f} color="#9a5a2a" radius={0.06} glowK={0.5} grow={ramp(f, -LOOP, 10)} />
      <ScentRibbon points={PIZZA_PATH} f={f} color="#ff7a2a" radius={0.06} glowK={0.5} grow={ramp(f, -20, 14)} seed={4} />
    </>,
    { blur: 4, energy: 0 },
  );
};
const Wake = wakeAt(0);
const LoopIn = wakeAt(-LOOP);

// From the floor: the smells rip across the room at the lens.
const RibbonRush: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.4, 0.18, 1.6], [0.2, 0.9, -0.6], 62), cam([1.1, 0.25, 1.2], [0.0, 1.0, -0.6], 64), f / 26);
  return (
    <Dutch deg={8}>
      {bedroom(
        c,
        f,
        [you(BED_AT, { sit: true, air: BED_AIR, expression: "shocked", lookX: 0.7 })],
        <>
          <ScentRibbon points={[[-0.4, 1.0, -0.6], [0.3, 0.8, 0.2], [0.8, 0.55, 0.8], [1.0, 0.4, 1.15]]} f={f + 30} color="#9a5a2a" radius={0.05} glowK={0.6} speed={2} />
          <ScentRibbon points={[[0.6, 1.3, -1.6], [0.9, 0.9, -0.4], [1.1, 0.6, 0.5], [1.5, 0.45, 1.0]]} f={f + 20} color="#ff7a2a" radius={0.05} glowK={0.6} speed={2} seed={3} />
          <ScentRibbon points={[[SOCKS[0], 0.1, SOCKS[2]], [0.9, 0.3, 0.9], [1.2, 0.25, 1.5]]} f={f} color="#7fd63a" radius={0.05} glowK={0.5} seed={7} />
        </>,
        { energy: 0.4 },
      )}
    </Dutch>
  );
};

// Nose vision: you float in a purple space where every smell pours into your nose. Fast orbit.
const NoseVision: React.FC = () => {
  const f = useShotFrame();
  const a = interpolate(f, [0, 44], [-0.5, 0.5]);
  const c = cam([Math.sin(a) * 2.6, 1.3 + f * 0.003, VOID_YOU[1] + Math.cos(a) * 2.6], [0, 1.15, VOID_YOU[1]], 50);
  return (
    <Stage
      bg="#2e1460"
      camera={c}
      set={
        <NoseVoid camera={c} f={f + 30}>
          <DogNoseProp position={[0, 0.97, 1.04]} f={f} sniff={1} scale={0.9} />
        </NoseVoid>
      }
      puppets={[you(VOID_YOU, { ...faceChange([[0, "excited"], [26, "shocked"]], f), lookX: 0.4, view: "front" })]}
      energy={0.3}
    />
  );
};

// "This is a terrible idea": Dutch close-up, the nose twitching, all the smells coiling round your head.
const TerribleIdea: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.3, -0.2];
  const c = move(cam([0.48, 1.05, 1.75], [0.3, 0.98, -0.2], 34), cam([0.42, 1.03, 1.35], [0.3, 0.98, -0.2], 34), f / 65);
  // three smells coiling up round your head, each starting at the nose
  const coil = (k: number): Vec3[] =>
    Array.from({ length: 6 }, (_, i): Vec3 => {
      if (i === 0) return [at[0] + 0.03, 0.92, at[1] + 0.12];
      const a = i * 1.1 + f * 0.05 + k * 2.1;
      return [at[0] + Math.cos(a) * (0.4 + i * 0.03), 0.75 + i * 0.09, at[1] - 0.08 - Math.abs(Math.sin(a)) * 0.25];
    });
  return (
    <Dutch deg={-9}>
      {bedroom(
        c,
        f,
        [you(at, { ...faceChange([[0, "shocked"], [30, "disgusted"]], f), headTilt: Math.sin(f * 0.4) * 3 })],
        <>
          <DogNoseProp position={noseAt(at)} f={f} sniff={1} scale={0.7} />
          <ScentRibbon points={coil(0)} f={f} color="#9a5a2a" radius={0.035} glowK={0.5} />
          <ScentRibbon points={coil(1)} f={f} color="#ff7a2a" radius={0.035} glowK={0.5} seed={2} />
          <ScentRibbon points={coil(2)} f={f} color="#7fd63a" radius={0.035} glowK={0.5} seed={5} />
        </>,
        { blur: 5, energy: 0.3 },
      )}
    </Dutch>
  );
};

// ---------- the house smells ----------

// The neighbour's breakfast: eggs and bacon sizzle, the smell flies out of the window.
const Breakfast: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([-0.6, 1.3, 1.3], [0.1, 1.0, -1.4], 44), cam([-0.25, 1.22, 0.75], [0.1, 1.0, -1.4], 44), f / 53);
  const flip = ramp(f, 18, 30);
  return (
    <Stage
      bg="#ffe9a8"
      camera={c}
      set={<KitchenSet camera={c} f={f + 20} />}
      puppets={[{ id: "neighbour", look: NEIGHBOUR, at: [STOVE[0] + 0.55, STOVE[2] + 0.75], pose: { expression: "happy", lookX: -0.6, armR: [60 + flip * 50, -80 + flip * 40], headTilt: Math.sin(f * 0.2) * 4 } }]}
      light={kitchenLight()}
      energy={0.6}
    />
  );
};

// Yesterday's pizza: a high angle sliding over the desk, the greasy smell curling up.
const Pizza: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.0, 1.7, -1.1], [1.25, 0.78, -1.9], 42), cam([1.3, 1.45, -1.3], [1.25, 0.78, -1.9], 40), f / 37);
  return bedroom(c, f + 10, [], undefined, { blur: 3, energy: 0.3 });
};

// "And your socks?": creeping along the floor toward the pile; flies, stink lines, ominous.
const SocksCreep: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([SOCKS[0] + 0.9, 0.16, SOCKS[2] + 1.5], [SOCKS[0], 0.2, SOCKS[2]], 50), cam([SOCKS[0] + 0.45, 0.14, SOCKS[2] + 0.8], [SOCKS[0], 0.22, SOCKS[2]], 48), f / 44);
  return bedroom(c, f, [], <StinkLines at={[SOCKS[0], 0.15, SOCKS[2]]} f={f} count={3} height={0.5} />, { blur: 4, energy: 0.3 });
};

// OH NO: the sock monster bursts up out of the pile. Low on the floor.
const MonsterRise: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([SOCKS[0] + 0.15, 0.12, SOCKS[2] + 1.1], [SOCKS[0], 0.5, SOCKS[2] - 0.4], 62), cam([SOCKS[0] + 0.1, 0.1, SOCKS[2] + 1.0], [SOCKS[0], 0.6, SOCKS[2] - 0.4], 66), f / 35);
  return (
    <AbsoluteFill>
      {bedroom(c, f, [you([1.3, -0.8], { expression: "shocked", lookX: -0.7, armL: [150, -20], armR: [150, -20] })], <SockMonster position={SOCKS} f={f} rise={ramp(f, 0, 14)} roar={ramp(f, 12, 22)} />, { energy: 0.5, shaft: false })}
      <Shout f={f} text={"THEY'RE ALIVE! 💀"} at={26} color="#58b02c" />
    </AbsoluteFill>
  );
};

// The monster lunges at the lens, fangs out.
const MonsterLunge: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([SOCKS[0] - 0.05, 0.66, SOCKS[2] + 1.45], [SOCKS[0], 0.66, SOCKS[2]], 52), cam([SOCKS[0] - 0.03, 0.64, SOCKS[2] + 1.2], [SOCKS[0], 0.66, SOCKS[2]], 54), f / 30);
  return (
    <AbsoluteFill>
      {bedroom(c, f + 35, [], <SockMonster position={SOCKS} f={f + 35} rise={1} roar={0.8 + Math.sin(f * 0.5) * 0.2} lunge={ease(ramp(f, 4, 20))} />, { blur: 3, energy: 0.5 })}
      <Shout f={f} text={"THEY'RE ALIVE! 💀"} at={-4} color="#58b02c" out={26} />
    </AbsoluteFill>
  );
};

// Gag: you fall flat on your back on the rug.
const Fall: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.4, -0.2];
  const c = move(cam([1.7, 2.3, 2.6], [0.1, 0.4, -0.4], 46), cam([1.5, 2.6, 2.0], [0.1, 0.3, -0.4], 46), f / 28);
  return bedroom(c, f + 50, [you(at, { expression: "shocked", ...lieDown(f, 2, 14) })], <SockMonster position={SOCKS} f={f + 50} rise={1} roar={0.6} rotationY={-0.6} />, { energy: 0.4 });
};

// ---------- outside ----------

const DOOR: [number, number] = [0.7, -2.65];
// The front door flies open, you sprint down the path toward the camera for fresh air.
const RunOut: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 50, DOOR, [0.9, -0.2]);
  const c = move(cam([1.9, 0.5, 2.6], [0.8, 1.0, -2.5], 46), cam([1.8, 0.55, 2.4], [0.9, 1.0, -1.0], 46), f / 60);
  return street("morning", c, f, [you(w.at, { expression: "happy", ...w.pose })], undefined, { energy: 0.6 });
};

// BIG MISTAKE: a wall of smells slams into you on the sidewalk. Dutch, you stagger back.
const Slam: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.9, -0.2 - ease(ramp(f, 3, 14)) * 0.35];
  const c = move(cam([0.6, 1.1, 1.8], [0.9, 1.0, -0.4], 46), cam([0.65, 1.05, 1.5], [0.9, 1.0, -0.4], 46), f / 49);
  return (
    <Dutch deg={11}>
      {street("morning", c, f, [you(at, { expression: "disgusted", lean: -12 * ease(ramp(f, 3, 12)), armL: [120, -40], armR: [120, -40] })], <ScentBlast origin={[0.9, 1.0, -3.0]} f={f} t={f} />, { energy: 0.6 })}
    </Dutch>
  );
};

// That tree? A crane up the big street tree, a leafy branch sliding past in the foreground.
const TreeCrane: React.FC = () => {
  const f = useShotFrame();
  const c0 = cam([-1.4, 0.4, 4.2], [0, 1.4, TREE[2]], 50);
  const c = move(c0, cam([-1.1, 1.6, 3.9], [0, 2.8, TREE[2]], 50), f / 63);
  return street("morning", c, f, [you([1.0, 0.0], { view: "side", facing: -1, expression: "skeptical" })], undefined, {
    foreground: <Foliage position={frameSpot(c0, 1080 / 1920, -0.85, 0.75, 1.4)} size={0.7} color="#4f9f58" />,
    energy: 0.6,
  });
};

// The feed lights up: paw prints glow round the trunk and pink notification bubbles pop. Low angle.
const FEED = {
  max: [TREE[0] - 0.12, 1.2, TREE[2] + 1.0] as Vec3,
  bella: [TREE[0] + 0.14, 1.72, TREE[2] + 1.15] as Vec3,
  rocky: [TREE[0] - 0.08, 2.25, TREE[2] + 1.35] as Vec3,
};
const feedCam = (p: number) => move(cam([TREE[0] + 0.35, 0.6, TREE[2] + 3.6], [TREE[0], 1.9, TREE[2]], 54), cam([TREE[0] + 0.25, 0.7, TREE[2] + 3.1], [TREE[0], 1.9, TREE[2]], 54), p);
const Cards: React.FC<{ f: number; max: number; bella: number; rocky: number }> = ({ f, max, bella, rocky }) => (
  <>
    <FeedCard width={0.85} position={FEED.max} rotation={[0.1, 0.1, 0.04]} breed="max" name="MAX" text="WAS HERE" likes="38" appear={f - max} />
    <FeedCard width={0.85} position={FEED.bella} rotation={[0.12, 0.1, -0.05]} breed="bella" name="BELLA" text="WAS HERE" likes="52" appear={f - bella} accent="#ff7ad0" />
    <FeedCard width={0.85} position={FEED.rocky} rotation={[0.15, 0.1, 0.04]} breed="rocky" name="ROCKY" text="POSTED 12 TIMES" likes="99+" appear={f - rocky} accent="#ff8a2a" />
  </>
);
const Pings: React.FC<{ f: number }> = ({ f }) => (
  <>
    {Array.from({ length: 7 }, (_, k) => {
      const a = k * 0.9 + 0.4;
      return <Badge key={k} position={[TREE[0] + Math.cos(a) * 0.55, 0.6 + k * 0.27, TREE[2] + 0.55 + Math.sin(a) * 0.2]} text="♥" size={0.14} appear={f - 6 - k * 5} color="#ff3d7f" />;
    })}
  </>
);
const FeedGlow: React.FC = () => {
  const f = useShotFrame();
  return street("morning", feedCam(f / 50), f, [], <Pings f={f} />, { energy: 0.6 });
};

// Over your shoulder at the glowing tree: the feed is real.
const FeedOTS: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.75, 1.5, -2.4], [0.0, 1.5, TREE[2]], 46), cam([1.65, 1.45, -2.2], [0.0, 1.6, TREE[2]], 46), f / 48);
  return street("morning", c, f + 50, [you([1.4, -0.15], { expression: "neutral", view: "back" })], <Pings f={f + 50} />, { energy: 0.5 });
};

const MaxCard: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([FEED.max[0] + 0.3, FEED.max[1] - 0.05, FEED.max[2] + 2.1], FEED.max, 40), cam([FEED.max[0] + 0.2, FEED.max[1], FEED.max[2] + 1.8], FEED.max, 40), f / 30);
  return street("morning", c, f, [], <Cards f={f} max={3} bella={999} rocky={999} />, { blur: 4, energy: 0.4 });
};
const BellaCard: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([FEED.bella[0] - 0.3, FEED.bella[1] + 0.05, FEED.bella[2] + 2.1], FEED.bella, 40), cam([FEED.bella[0] - 0.2, FEED.bella[1], FEED.bella[2] + 1.8], FEED.bella, 40), f / 27);
  return street("morning", c, f, [], <Cards f={f} max={-40} bella={3} rocky={999} />, { blur: 4, energy: 0.4 });
};
// Rocky's card with a counter racing to 12.
const RockyCard: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([FEED.rocky[0] + 0.15, FEED.rocky[1] - 0.3, FEED.rocky[2] + 2.5], [FEED.rocky[0] + 0.1, FEED.rocky[1], FEED.rocky[2]], 42), cam([FEED.rocky[0] + 0.12, FEED.rocky[1] - 0.15, FEED.rocky[2] + 2.1], [FEED.rocky[0] + 0.1, FEED.rocky[1], FEED.rocky[2]], 42), f / 56);
  const n = Math.max(1, Math.round(12 * ease(ramp(f, 30, 50))));
  return (
    <AbsoluteFill>
      {street(
        "morning",
        c,
        f,
        [],
        <>
          <Cards f={f} max={-60} bella={-30} rocky={3} />
          <Badge key={n} position={[FEED.rocky[0] + 0.38, FEED.rocky[1] + 0.14, FEED.rocky[2] + 0.02]} text={String(n)} size={0.2} appear={f - 28} />
        </>,
        { blur: 4, energy: 0.4 },
      )}
      <Shout f={f} text={"ROCKY POSTED\n12 TIMES!"} at={40} color="#ff8a2a" y={260} size={92} />
    </AbsoluteFill>
  );
};

// You, jaw dropped, the feed lighting your face.
const Gasp: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [1.0, 0.0];
  const c = move(cam([0.55, 1.0, 1.5], [1.0, 0.98, 0.0], 36), cam([0.6, 1.0, 1.2], [1.0, 0.98, 0.0], 36), f / 53);
  return (
    <AbsoluteFill>
      {street("morning", c, f, [you(at, { expression: "shocked", lookX: -0.8, armL: [140, -60], armR: [140, -60], handL: "open", handR: "open" })], <DogNoseProp position={noseAt(at)} f={f} sniff={0.4} scale={0.7} />, { blur: 6, energy: 0.4 })}
      <Shout f={f} text={"ROCKY POSTED\n12 TIMES!"} at={-16} out={30} color="#ff8a2a" y={260} size={92} />
    </AbsoluteFill>
  );
};

// ---------- the chicken ----------

// Then suddenly: you freeze, the nose catches something. Push in on the face.
const Sniff: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [1.0, 0.0];
  const c = move(cam([1.2, 1.0, 1.6], [1.0, 0.96, 0.0], 34), cam([1.12, 0.98, 0.95], [1.0, 0.94, 0.0], 32), ease(ramp(f, 0, 39)));
  return street("morning", c, f, [you(at, { ...faceChange([[0, "thinking"], [22, "excited"]], f), lookX: ramp(f, 10, 22) * 0.9, headTilt: -6 })], <DogNoseProp position={noseAt(at)} f={f} sniff={1} scale={0.7} />, { blur: 6, energy: 0.3 });
};

// CHICKEN! The giant golden drumstick of smell blasts into the frame on its ribbon.
const Chicken: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([2.6, 1.2, 2.6], [3.7, 1.3, -0.3], 56), cam([2.7, 1.15, 2.25], [3.8, 1.3, -0.3], 58), f / 23);
  const fly = ease(ramp(f, 0, 12));
  const at: Vec3 = [6.0 - fly * 2.1, 1.3 + Math.sin(f * 0.3) * 0.05, -0.35];
  return (
    <AbsoluteFill>
      {street(
        "golden",
        c,
        f,
        [you([2.1, 0.1], { expression: "excited", lookX: 1, view: "side", facing: 1 })],
        <>
          <ScentRibbon points={[[2.4, 0.92, 0.15], [2.9, 1.3, 0.2], [at[0] - 0.7, 1.2, -0.1], [at[0] - 0.4, at[1] - 0.1, at[2]]]} f={f} color="#ffc21a" radius={0.11} glowK={0.85} wobble={0.12} grow={fly} />
          <Drumstick position={at} scale={1.8 * (0.6 + fly * 0.4)} gold f={f} rotation={[0, -Math.PI / 2 + 0.4, 1.35 + Math.sin(f * 0.2) * 0.15]} />
        </>,
        { energy: 0.7 },
      )}
      <Shout f={f} text={"CHICKEN DETECTED! 🍗"} at={3} color="#f2a818" tilt={3} />
    </AbsoluteFill>
  );
};

// You follow the smell: a Dutch tracking shot racing beside you, the drumstick bobbing ahead.
const RUN_X = (f: number) => 2.2 + f * 0.11;
const ChaseSide: React.FC = () => {
  const f = useShotFrame();
  const x = RUN_X(f);
  const c = cam([x - 2.2, 0.95, -0.45], [x + 0.8, 1.1, 0.15], 56);
  const d: Vec3 = [x + 1.5, 1.3 + Math.sin(f * 0.25) * 0.08, -0.55];
  return (
    <AbsoluteFill>
      <Dutch deg={-10}>
        {street(
          "golden",
          c,
          f,
          [you([x, 0.1], { expression: "excited", lookX: 1, view: "side", facing: 1, ...stroll(f, 0, 9999, [0, 0], [9999 * 0.11, 0]).pose })],
          <>
            <ScentRibbon points={[[x + 0.2, 0.92, 0.15], [x + 0.5, 1.15, 0.0], [x + 0.9, 1.2, -0.3], [d[0] - 0.35, d[1] - 0.05, d[2]]]} f={f} color="#ffc21a" radius={0.12} glowK={0.85} wobble={0.15} speed={2} />
            <Drumstick position={d} scale={3.0} gold f={f} rotation={[0, -Math.PI / 2 + 0.35, 1.35]} />
          </>,
          { energy: 0.8 },
        )}
      </Dutch>
      <Shout f={f} text={"CHICKEN DETECTED! 🍗"} at={-23} out={20} color="#f2a818" tilt={3} />
    </AbsoluteFill>
  );
};

// Past three houses: a high angle racing along beside you, the houses and mailboxes streaming by.
const TopChase: React.FC = () => {
  const f = useShotFrame();
  const x = 5.0 + f * 0.17;
  const c = cam([x - 0.2, 2.5, 3.3], [x + 1.0, 0.7, -0.3], 56);
  return street(
    "golden",
    c,
    f + 60,
    [you([x, 0.0], { expression: "excited", view: "side", facing: 1, ...stroll(f, 0, 9999, [0, 0], [9999 * 0.17, 0]).pose })],
    <>
      <ScentRibbon points={[[x + 0.2, 0.9, -0.3], [x + 0.5, 1, -0.45], [x + 0.85, 1.05, -0.35], [x + 1.15, 1.1, -0.45]]} f={f} color="#f0a020" radius={0.12} glowK={0.9} speed={2} />
      <Drumstick position={[x + 1.45, 1.1, -0.45]} scale={2.4} gold f={f} rotation={[0, 0, 1.35]} />
    </>,
    { energy: 0.7 },
  );
};

// Around the corner: from behind you on the sidewalk at dusk, the camera swings past the hedge and finds the bins.
const Corner: React.FC = () => {
  const f = useShotFrame();
  const c0 = cam([CORNER_X - 1.9, 1.35, 0.2], [CORNER_X + 2.0, 1.0, 0.5], 52);
  const c = move(c0, cam([CORNER_X - 0.7, 1.15, -0.1], [BINS[0], 0.8, 0.9], 50), ease(ramp(f, 0, 40)));
  const w = stroll(f, 0, 55, [CORNER_X - 0.3, 0.15], [CORNER_X + 1.4, 0.25]);
  return street(
    "dusk",
    c,
    f,
    [you(w.at, { expression: "excited", ...w.pose })],
    <ScentRibbon points={[[w.at[0] + 0.25, 0.8, 0.25], [w.at[0] + 0.6, 0.75, 0.6], [BINS[0], 0.8, BINS[2] - 0.2]]} f={f} color="#ffc21a" radius={0.08} glowK={0.9} />,
    { near: [BINS[0] + 1.35, 0, 1.4], energy: 0.6 },
  );
};

// ---------- the trash can ----------
// Staged from the lawn side, looking out over the bins to the road and the houses across the street.

const SKID: [number, number] = [BINS[0] - 0.25, 0.45];
const NEAR: Vec3 = [BINS[0] + 1.35, 0, 1.4];
// Straight to a trash can: you skid in and slam into the green bin; the lid flips up and bangs.
const TrashSlam: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 26, [BINS[0] - 2.6, 0.2], SKID);
  const hit = 26;
  const c = move(cam([BINS[0] - 1.1, 0.75, -1.7], [BINS[0] - 0.6, 0.8, 0.6], 52), cam([BINS[0] - 0.7, 0.8, -1.45], [BINS[0] - 0.2, 0.8, 0.7], 52), f / 80);
  const lid = f < hit ? 0 : Math.max(0, Math.sin(((f - hit) / 22) * Math.PI)) * 0.9;
  return street(
    "night",
    c,
    f,
    [you(w.at, f < hit ? { expression: "excited", ...w.pose } : ({ ...faceChange([[hit, "shocked"], [hit + 30, "awkward"]], f), view: "front", lean: 8, scale: squash(f, hit, 0.3) } as PuppetPose))],
    <ScentRibbon points={[[w.at[0] + 0.25, 0.95, w.at[1]], [BINS[0] - 0.2, 1.0, 0.7], [BINS[0], 0.95, BINS[2]]]} f={f} color="#ffc21a" radius={0.08} glowK={0.85} grow={1 - ramp(f, hit, hit + 20) * 0.7} />,
    { near: NEAR, binLid: lid, binShake: f >= hit ? Math.exp(-(f - hit) / 12) : 0, energy: 0.6 },
  );
};

// Rocky sits on the sidewalk by the bins, facing the lawn (and the camera).
const ROCKY: Vec3 = [BINS[0] + 0.4, 0, 0.42];
const rocky = (f: number, pose: DogPose, turn = 0.25) => <Dog position={ROCKY} f={f} breed="rocky" pose={{ lid: 0.55, brow: 0, wag: 0, ...pose }} rotationY={Math.PI + turn} tag="R" />;

// There's already a dog there: you freeze, eyes sliding sideways.
const YouFreeze: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([SKID[0] - 0.35, 1.0, SKID[1] - 1.35], [SKID[0], 0.98, SKID[1]], 36), cam([SKID[0] - 0.3, 1.0, SKID[1] - 1.1], [SKID[0], 0.98, SKID[1]], 36), f / 50);
  return street("night", c, f, [you(SKID, { expression: "awkward", lookX: -0.9, view: "front" })], <DogNoseProp position={[SKID[0], 0.95, SKID[1] - 0.05]} f={f} sniff={0.2} scale={0.7} />, { near: NEAR, blur: 6, energy: 0.3 });
};
// The camera drops to the gutter and finds Rocky.
const RockyReveal: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([ROCKY[0] + 0.1, 0.3, ROCKY[2] - 1.0], [ROCKY[0], 0.6, ROCKY[2]], 44), cam([ROCKY[0] + 0.3, 0.42, ROCKY[2] - 1.6], [ROCKY[0] + 0.05, 0.62, ROCKY[2] + 0.2], 48), f / 50);
  return street("night", c, f, [], rocky(f, { lookX: 0.5 }), { near: NEAR, energy: 0.4 });
};

// He looks at you: slow push into the deadpan stare.
const RockyStare: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([ROCKY[0] + 0.05, 0.72, ROCKY[2] - 1.2], [ROCKY[0], 0.7, ROCKY[2]], 36), cam([ROCKY[0] + 0.03, 0.72, ROCKY[2] - 0.85], [ROCKY[0], 0.7, ROCKY[2]], 34), f / 62);
  return street("night", c, f, [], rocky(f, { lookX: 0.15, lid: 0.55 + ramp(f, 20, 40) * 0.08, sniff: f > 45 ? 0.6 : 0 }, 0.1), { near: NEAR, blur: 6, energy: 0.2 });
};
// You look at him: the comic silence (crickets), Rocky soft at the edge of frame, a bead of sweat on you.
const YouStare: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([SKID[0] + 0.55, 0.9, SKID[1] - 1.5], [SKID[0], 0.95, SKID[1]], 40), cam([SKID[0] + 0.5, 0.9, SKID[1] - 1.3], [SKID[0], 0.95, SKID[1]], 38), f / 72);
  return street(
    "night",
    c,
    f + 60,
    [you(SKID, { expression: "awkward", lookX: 0.6, view: "front", blink: f > 40 && f < 44 })],
    <>
      <DogNoseProp position={[SKID[0], 0.95, SKID[1] - 0.05]} f={f} sniff={0} scale={0.7} />
      {rocky(f + 60, { lookX: -0.4 }, -0.6)}
    </>,
    { near: NEAR, blur: 5, energy: 0.2 },
  );
};

// He's like: a thought bubble opens over Rocky with a tiny queue of dogs in it. BRO. GET IN LINE.
const Bubble: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([ROCKY[0] + 0.1, 0.85, ROCKY[2] - 1.9], [ROCKY[0], 1.05, ROCKY[2]], 40), cam([ROCKY[0] + 0.08, 0.85, ROCKY[2] - 1.65], [ROCKY[0], 1.08, ROCKY[2]], 40), f / 49);
  return (
    <AbsoluteFill>
      {street(
        "night",
        c,
        f,
        [],
        <>
          {rocky(f, { lookX: 0.1, brow: 0.4 }, 0.1)}
          <group position={[ROCKY[0] - 0.05, 1.32, ROCKY[2] - 0.05]} rotation={[0, Math.PI, 0]}>
            <ThoughtCloud position={[0, 0, 0]} appear={f - 4} size={0.62} tail={1}>
              {(["rocky", "max", "bella"] as const).map((b, i) => (
                <Dog key={b} position={[-0.17 + i * 0.17, -0.12, 0]} f={f} breed={b} scale={0.32} pose={{ lid: b === "rocky" ? 0.55 : 0.1 }} />
              ))}
            </ThoughtCloud>
          </group>
        </>,
        { near: NEAR, energy: 0.2 },
      )}
      <Shout f={f} text={"BRO. GET IN LINE. 😐"} at={20} color="#2f6fd8" y={210} size={96} />
    </AbsoluteFill>
  );
};

// The camera pulls back: a whole queue of dogs is waiting behind Rocky along the sidewalk.
const QUEUE: { breed: "max" | "bella"; at: Vec3 }[] = [
  { breed: "max", at: [BINS[0] + 1.1, 0, 0.42] },
  { breed: "bella", at: [BINS[0] + 1.85, 0, 0.4] },
];
const YOU_LINE: [number, number] = [BINS[0] + 2.6, 0.35];
const queue = (f: number) => (
  <>
    {rocky(f, { lookX: 0.6 }, 0.35)}
    {QUEUE.map((q, i) => (
      <Dog key={q.breed} position={q.at} f={f + i * 7} breed={q.breed} rotationY={Math.PI + 0.35} pose={{ lid: 0.15, mouth: 0.4, tongue: true, wag: 1, lookX: 0.4 }} />
    ))}
  </>
);
const QueueReveal: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([BINS[0] + 0.7, 0.65, -1.6], [BINS[0] + 0.7, 0.6, 0.4], 46), cam([BINS[0] + 1.2, 1.05, -2.8], [BINS[0] + 1.1, 0.55, 0.4], 48), f / 49);
  return (
    <AbsoluteFill>
      {street("night", c, f, [], queue(f), { near: NEAR, energy: 0.4 })}
      <Shout f={f} text={"BRO. GET IN LINE. 😐"} at={-31} out={24} color="#2f6fd8" y={210} size={96} />
    </AbsoluteFill>
  );
};

// And that's when you realize: you shuffle to the back of the line; looking down the queue from its end.
const InLine: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [YOU_LINE[0] + 0.7, 0.0], YOU_LINE);
  const c = move(cam([BINS[0] + 4.4, 0.85, -0.6], [BINS[0] + 1.4, 0.6, 0.45], 52), cam([BINS[0] + 4.2, 0.82, -0.55], [BINS[0] + 1.6, 0.6, 0.45], 52), f / 69);
  return street("night", c, f + 50, [you(w.at, { expression: "awkward", ...w.pose, view: "front" })], queue(f + 50), { near: NEAR, energy: 0.4 });
};

// Dogs aren't weird: next morning at the tree, you and the dogs read the feed together, tails wagging.
const Gossip: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.8, 0.35];
  const c = move(cam([0.5, 1.0, 4.6], [0.1, 1.4, TREE[2]], 50), cam([0.55, 1.0, 4.3], [0.1, 1.45, TREE[2]], 50), f / 58);
  return street(
    "morning",
    c,
    f + 80,
    [you(at, { ...faceChange([[0, "excited"], [30, "happy"]], f), lookX: -0.7, armR: [120, -40] })],
    <>
      <Cards f={f + 80} max={0} bella={8} rocky={16} />
      <Dog position={[-0.75, 0, 0.45]} f={f} breed="max" rotationY={0.5} pose={{ mouth: 0.5, tongue: true, wag: 1, lookX: 0.5 }} />
      <Dog position={[-0.2, 0, 0.75]} f={f} breed="rocky" rotationY={0.2} pose={{ lid: 0.3, wag: 0.8, lookX: 0.3 }} tag="R" />
      <Dog position={[0.35, 0, 0.7]} f={f} breed="bella" rotationY={-0.3} pose={{ mouth: 0.5, tongue: true, wag: 1, earUp: 0.3 }} />
    </>,
    { energy: 0.5 },
  );
};

// We've just been missing all the gossip: straight down on everyone round the tree, the feed glowing.
const GossipTop: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.9, 2.5, 3.8], [0.0, 0.5, 0.6], 50), cam([1.7, 2.3, 3.5], [0.0, 0.5, 0.6], 50), f / 55);
  return street(
    "morning",
    c,
    f + 140,
    [you([0.8, 0.35], { expression: "excited", armL: [150, -20], armR: [150, -20] })],
    <>
      <Pings f={f + 60} />
      <Dog position={[-0.75, 0, 0.45]} f={f} breed="max" rotationY={0.5} pose={{ mouth: 0.5, tongue: true, wag: 1 }} />
      <Dog position={[-0.2, 0, 0.75]} f={f} breed="rocky" rotationY={0.2} pose={{ lid: 0.3, wag: 0.8 }} tag="R" />
      <Dog position={[0.35, 0, 0.7]} f={f} breed="bella" rotationY={-0.3} pose={{ mouth: 0.5, tongue: true, wag: 1 }} />
    </>,
    { energy: 0.6 },
  );
};

// ---------- the edit ----------

const SHOTS: Shot[] = [
  [0, 26, Wake, false],
  [26, 52, RibbonRush, false],
  [52, 96, NoseVision, true],
  [96, 161, TerribleIdea, true],
  [161, 214, Breakfast, true],
  [214, 251, Pizza, true],
  [251, 295, SocksCreep, false],
  [295, 330, MonsterRise, false],
  [330, 360, MonsterLunge, false],
  [360, 388, Fall, false],
  [388, 448, RunOut, true],
  [448, 497, Slam, false],
  [497, 560, TreeCrane, false],
  [560, 610, FeedGlow, false],
  [610, 658, FeedOTS, false],
  [658, 688, MaxCard, false],
  [688, 715, BellaCard, false],
  [715, 771, RockyCard, false],
  [771, 824, Gasp, false],
  [824, 863, Sniff, false],
  [863, 886, Chicken, true],
  [886, 937, ChaseSide, false],
  [937, 976, TopChase, false],
  [976, 1031, Corner, true],
  [1031, 1111, TrashSlam, true],
  [1111, 1161, YouFreeze, false],
  [1161, 1211, RockyReveal, false],
  [1211, 1273, RockyStare, false],
  [1273, 1345, YouStare, false],
  [1345, 1394, Bubble, false],
  [1394, 1443, QueueReveal, false],
  [1443, 1512, InLine, false],
  [1512, 1570, Gossip, true],
  [1570, 1625, GossipTop, false],
  [1625, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  // hook
  { at: 0, src: sfx("sniff"), volume: 0.3 },
  { at: 26, src: sfx("whoosh"), volume: 0.5 },
  { at: 48, src: sfx("whoosh"), volume: 0.45 },
  { at: 60, src: sfx("chime"), volume: 0.25 },
  { at: 92, src: sfx("whoosh"), volume: 0.25 },
  { at: 100, src: sfx("stamp"), volume: 0.2 },
  { at: 120, src: sfx("sniff"), volume: 0.2 },
  // house smells
  { at: 157, src: sfx("whoosh"), volume: 0.4 },
  { at: 161, src: sfx("crackle"), volume: 0.35, until: 214 },
  { at: 180, src: sfx("pop"), volume: 0.3 },
  { at: 210, src: sfx("whoosh"), volume: 0.22 },
  { at: 222, src: sfx("sniff"), volume: 0.18 },
  { at: 262, src: sfx("hum"), volume: 0.12, until: 295 },
  { at: 293, src: sfx("slime"), volume: 0.2 },
  { at: 300, src: sfx("roar"), volume: 0.1 },
  { at: 306, src: sfx("stamp"), volume: 0.15 },
  { at: 374, src: sfx("roar"), volume: 0.3 },
  { at: 336, src: sfx("slime"), volume: 0.1 },
  { at: 372, src: sfx("boom"), volume: 0.2 },
  // outside
  { at: 384, src: sfx("whoosh"), volume: 0.45 },
  { at: 390, src: sfx("door"), volume: 0.5 },
  { at: 388, src: sfx("ambience"), volume: 0.12, until: 863 },
  { at: 396, src: sfx("steps"), volume: 0.35, until: 448 },
  { at: 448, src: sfx("whoosh"), volume: 0.3 },
  { at: 450, src: sfx("stamp"), volume: 0.28 },
  { at: 456, src: sfx("sniff"), volume: 0.18 },
  { at: 566, src: sfx("notif"), volume: 0.22 },
  { at: 576, src: sfx("notif"), volume: 0.2 },
  { at: 586, src: sfx("notif"), volume: 0.2 },
  { at: 661, src: sfx("notif"), volume: 0.3 },
  { at: 691, src: sfx("notif"), volume: 0.3 },
  { at: 718, src: sfx("notif"), volume: 0.3 },
  ...Array.from({ length: 11 }, (_, k) => ({ at: 745 + k * 2, src: sfx("credit-blip"), volume: 0.14 })),
  { at: 755, src: sfx("pop"), volume: 0.22 },
  { at: 775, src: sfx("sting"), volume: 0.2 },
  // chicken
  { at: 828, src: sfx("sniff"), volume: 0.35 },
  { at: 840, src: sfx("riser"), volume: 0.22 },
  { at: 859, src: sfx("whoosh"), volume: 0.3 },
  { at: 864, src: sfx("boom"), volume: 0.22 },
  { at: 866, src: sfx("chime"), volume: 0.18 },
  { at: 886, src: sfx("steps"), volume: 0.28, until: 1057 },
  { at: 932, src: sfx("whoosh"), volume: 0.45 },
  { at: 972, src: sfx("whoosh"), volume: 0.5 },
  { at: 976, src: sfx("wind"), volume: 0.18, until: 1031 },
  // trash can
  { at: 1027, src: sfx("whoosh"), volume: 0.45 },
  { at: 1031, src: sfx("crickets"), volume: 0.12, until: 1512 },
  { at: 1049, src: sfx("skid"), volume: 0.3 },
  { at: 1057, src: sfx("clang"), volume: 0.35 },
  { at: 1058, src: sfx("stamp"), volume: 0.25 },
  { at: 1165, src: sfx("tick"), volume: 0.3 },
  { at: 1258, src: sfx("sniff"), volume: 0.12 },
  { at: 1349, src: sfx("pop"), volume: 0.3 },
  { at: 1383, src: sfx("stamp"), volume: 0.18 },
  { at: 1398, src: sfx("bark"), volume: 0.22 },
  { at: 1408, src: sfx("bark"), volume: 0.15 },
  { at: 1443, src: sfx("near-miss"), volume: 0.2 },
  // morning after
  { at: 1508, src: sfx("whoosh"), volume: 0.45 },
  { at: 1512, src: sfx("ambience"), volume: 0.12, until: 1625 },
  { at: 1512, src: sfx("notif"), volume: 0.25 },
  { at: 1520, src: sfx("notif"), volume: 0.2 },
  { at: 1528, src: sfx("notif"), volume: 0.2 },
  { at: 1575, src: sfx("bark"), volume: 0.18 },
  // loop seam: the opening sniff again under the last frames
  { at: 1621, src: sfx("whoosh"), volume: 0.4 },
  { at: 1630, src: sfx("sniff"), volume: 0.25 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 388, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: 388, to: 824, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 824, to: 1031, volume: 0.28 },
  { src: MUSIC_FILES.mystery, from: 1031, to: 1320, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: 1345, to: 1512, volume: 0.22 },
  { src: MUSIC_FILES.upbeat, from: 1512, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post score />;
