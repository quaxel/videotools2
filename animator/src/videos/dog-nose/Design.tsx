import React from "react";
import { AbsoluteFill } from "remotion";
import { CameraShot, PuppetLook, PuppetPlacement, Shot, ShotList, Stage, stroll, useShotFrame, Vec3 } from "../../engine";
import { Dog, DogNoseProp, Drumstick, FeedCard, ScentRibbon, SockMonster } from "./props";
import { VOID_YOU, BedroomSet, BINS, CORNER_X, KitchenSet, NoseVoid, SOCKS, STOVE, StreetMode, StreetSet, streetLight, TREE, bedroomLight, kitchenLight } from "./sets";
import { Dutch, Shout } from "./Shout";

// Design board for dog-nose: every set and character from the angles the video will use, 10 frames each, for the
// scored design loop (videos/dog-nose/design.md). Composition `DogNoseDesign`; stills at frame 10k + 5.

export const YOU: PuppetLook = { skin: "#fde3c8", hair: "#4a2a16", outfit: "#4a7bd8", pattern: "#bfe0ff" };
export const NEIGHBOUR: PuppetLook = { skin: "#e8b48a", hair: "#d8d8d8", outfit: "#ff8a5a", apron: "#ffffff", glasses: true };

const cam = (position: Vec3, target: Vec3, fov = 38): CameraShot => ({ position, target, fov });
const you = (at: [number, number], pose: PuppetPlacement["pose"]): PuppetPlacement => ({ id: "narrator", look: YOU, at, pose });

const BedWide: React.FC = () => {
  const f = useShotFrame() + 60;
  const c = cam([1.6, 2.1, 3.4], [-0.3, 0.7, -1.2], 50);
  return <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} />} puppets={[you([0.25, -0.35], { expression: "shocked", lookX: 0.6 })]} light={bedroomLight()} energy={0} />;
};
const SockLow: React.FC = () => {
  const f = useShotFrame() + 40;
  const c = cam([SOCKS[0] + 0.15, 0.12, SOCKS[2] + 1.1], [SOCKS[0], 0.55, SOCKS[2] - 0.4], 62);
  return (
    <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} shaft={false}><SockMonster position={SOCKS} f={f} rise={1} roar={0.9} /></BedroomSet>} puppets={[you([1.3, -0.8], { expression: "shocked", lookX: -0.7 })]} light={bedroomLight()} energy={0} />
  );
};
const MonsterMacro: React.FC = () => {
  const f = useShotFrame() + 20;
  const c = cam([SOCKS[0] - 0.05, 0.66, SOCKS[2] + 1.25], [SOCKS[0] - 0.02, 0.66, SOCKS[2]], 52);
  return <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} shaft={false}><SockMonster position={SOCKS} f={f} rise={1} roar={0.8} /></BedroomSet>} blur={3} energy={0} />;
};
const PizzaTop: React.FC = () => {
  const f = useShotFrame();
  const c = cam([1.05, 1.05, -1.2], [1.25, 0.84, -1.9], 46);
  return <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} />} energy={0} />;
};
const Kitchen: React.FC = () => {
  const f = useShotFrame();
  const c = cam([-0.9, 1.35, 1.6], [0.1, 1.0, -1.2], 44);
  return <Stage bg="#ffe9a8" camera={c} set={<KitchenSet camera={c} f={f} />} puppets={[{ id: "neighbour", look: NEIGHBOUR, at: [STOVE[0] + 0.55, STOVE[2] + 0.75], pose: { expression: "happy", lookX: -0.6, armR: [60, -80] } }]} light={kitchenLight()} energy={0} />;
};
const Void: React.FC = () => {
  const f = useShotFrame() + 30;
  const c = cam([0.3, 1.25, 3.0], [0, 1.4, -1], 52);
  return <Stage bg="#2e1460" camera={c} set={<NoseVoid camera={c} f={f}><DogNoseProp position={[0, 0.97, 1.04]} f={f} sniff={1} scale={0.9} /></NoseVoid>} puppets={[you(VOID_YOU, { expression: "excited", lookX: 0.4 })]} energy={0} />;
};
const street = (mode: StreetMode, c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, near?: Vec3, binLid = 0) => (
  <Stage bg="#88c8ff" camera={c} set={<StreetSet camera={c} f={f} mode={mode} binLid={binLid}>{extra}</StreetSet>} puppets={puppets} light={streetLight(mode, near)} energy={0} />
);
const StreetMorning: React.FC = () => {
  const f = useShotFrame();
  const c = cam([-1.7, 1.3, 3.8], [-0.5, 1.45, 0], 52);
  return street("morning", c, f, [you([-1.0, 0.2], { expression: "happy", lookX: 0.5 })]);
};
const TreeFeed: React.FC = () => {
  const f = useShotFrame() + 30;
  // worm's-eye up the trunk with the cards popping round it
  const c = cam([TREE[0] + 0.35, 0.6, TREE[2] + 3.3], [TREE[0], 1.9, TREE[2]], 54);
  return street(
    "morning",
    c,
    f,
    [],
    <>
      <FeedCard width={0.85} position={[TREE[0] - 0.12, 1.2, TREE[2] + 1.0]} rotation={[0.1, 0.1, 0.04]} breed="max" name="MAX" text="WAS HERE" likes="38" appear={f - 5} />
      <FeedCard width={0.85} position={[TREE[0] + 0.14, 1.72, TREE[2] + 1.15]} rotation={[0.12, 0.1, -0.05]} breed="bella" name="BELLA" text="WAS HERE" likes="52" appear={f - 15} accent="#ff7ad0" />
      <FeedCard width={0.85} position={[TREE[0] - 0.08, 2.25, TREE[2] + 1.35]} rotation={[0.15, 0.1, 0.04]} breed="rocky" name="ROCKY" text="POSTED 12 TIMES" likes="99+" appear={f - 25} accent="#ff8a2a" badge="12" />
    </>,
  );
};
const Chase: React.FC = () => {
  const f = useShotFrame() + 40;
  const walkPose = stroll(f, 0, 200, [0, 0], [8, 0]).pose;
  const c = cam([5.4, 0.55, 3.1], [7.0, 1.2, 0], 60);
  return (
    <Dutch deg={-15}>
      {street(
        "golden",
        c,
        f,
        [you([6.6, 0.1], { expression: "excited", lookX: 1, view: "side", facing: 1, ...walkPose })],
        <>
          <ScentRibbon points={[[6.8, 0.92, 0.15], [7.1, 1.35, 0.2], [7.4, 1.25, -0.1], [7.75, 1.55, -0.3]]} f={f} color="#f0a020" radius={0.12} glowK={0.9} wobble={0.15} />
          <Drumstick position={[7.8, 1.6, -0.3]} scale={2.2} gold f={f} rotation={[0, 0, -1.35]} />
        </>,
      )}
    </Dutch>
  );
};
const TopDown: React.FC = () => {
  const f = useShotFrame() + 40;
  const c = cam([10.4, 2.5, 3.3], [11.8, 0.6, -0.3], 54);
  return street(
    "golden",
    c,
    f,
    [you([11.0, 0.0], { expression: "excited", view: "side", facing: 1 })],
    <>
      <ScentRibbon points={[[11.2, 0.9, -0.3], [11.7, 1, -0.45], [12.2, 1.1, -0.3], [12.7, 1.2, -0.4]]} f={f} color="#f0a020" radius={0.12} glowK={0.9} />
      <Drumstick position={[12.95, 1.25, -0.4]} scale={1.8} gold f={f} rotation={[0, 0, -1.35]} />
    </>,
  );
};
const Corner: React.FC = () => {
  const f = useShotFrame();
  const c = cam([CORNER_X + 0.5, 1.2, 3.5], [BINS[0], 1.0, BINS[2]], 50);
  return street("dusk", c, f, [you([CORNER_X + 1.0, 0.25], { expression: "excited", view: "side", facing: 1 })], <ScentRibbon points={[[CORNER_X + 1.25, 0.8, 0.3], [CORNER_X + 1.6, 0.75, 0.75], [BINS[0], 0.8, BINS[2]]]} f={f} color="#ffc21a" radius={0.08} glowK={0.9} />, [BINS[0] + 1.35, 0, 1.4]);
};
const BinsNight: React.FC = () => {
  const f = useShotFrame() + 50;
  // low, from the gutter: Rocky sitting by the bins, judging
  const c = cam([BINS[0] + 0.2, 0.5, BINS[2] + 2.4], [BINS[0] + 0.3, 0.55, BINS[2] + 0.3], 50);
  return street("night", c, f, [], <Dog position={[BINS[0] + 0.35, 0, BINS[2] + 0.75]} f={f} breed="rocky" pose={{ lid: 0.55, brow: 0.2, lookX: 0, wag: 0 }} rotationY={-0.05} tag="R" />, [BINS[0], 0, BINS[2]], 0.6);
};
const RockyMacro: React.FC = () => {
  const f = useShotFrame();
  const p: Vec3 = [BINS[0] + 0.45, 0, BINS[2] + 0.7];
  const c = cam([p[0] - 0.05, 0.72, p[2] + 1.1], [p[0], 0.68, p[2]], 36);
  return <Stage bg="#0e2040" camera={c} set={<StreetSet camera={c} f={f} mode="night"><Dog position={p} f={f} breed="rocky" pose={{ lid: 0.55, brow: 0.3, lookX: -0.2, sniff: 0.5 }} tag="R" /></StreetSet>} light={streetLight("night", p)} blur={6} energy={0} />;
};
const Lineup: React.FC = () => {
  const f = useShotFrame();
  const c = cam([3.5, 0.8, 3.7], [3.5, 0.55, 0.25], 52);
  return street(
    "morning",
    c,
    f,
    [],
    <>
      <Dog position={[2.9, 0, 0.3]} f={f} breed="max" pose={{ lid: 0.1, mouth: 0.6, tongue: true, wag: 1 }} rotationY={0.2} />
      <Dog position={[3.5, 0, 0.2]} f={f} breed="rocky" pose={{ lid: 0.55, brow: 0.3 }} tag="R" />
      <Dog position={[4.1, 0, 0.3]} f={f} breed="bella" pose={{ lid: 0.05, mouth: 0.5, tongue: true, earUp: 0.2, wag: 1 }} rotationY={-0.2} />
    </>,
  );
};
const NoseFace: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.35, 1.0, 2.3], [0.3, 0.9, -0.2], 36);
  return (
    <Stage
      bg="#2a1f3a"
      camera={c}
      set={<BedroomSet camera={c} f={f}><DogNoseProp position={[0.3, 0.92, -0.1]} f={f} sniff={1} scale={0.7} /></BedroomSet>}
      puppets={[you([0.3, -0.2], { expression: "shocked" })]}
      light={bedroomLight()}
      energy={0}
    />
  );
};
const Headlines: React.FC = () => {
  const f = useShotFrame() + 20;
  const c = cam([0.3, 1.25, 3.0], [0, 1.4, -1], 52);
  return (
    <AbsoluteFill>
      <Stage bg="#2e1460" camera={c} set={<NoseVoid camera={c} f={f} />} energy={0} />
      <Shout f={f} text={"THEY'RE ALIVE! 💀"} at={0} color="#7fd63a" />
      <Shout f={f} text={"CHICKEN DETECTED! 🍗"} at={0} y={600} color="#ffc21a" tilt={3} />
      <Shout f={f} text={"BRO. GET IN LINE. 😐"} at={0} y={970} color="#2f6fd8" />
    </AbsoluteFill>
  );
};

export const DESIGN: [string, React.FC][] = [
  ["bedroom wide", BedWide],
  ["sock monster, floor angle", SockLow],
  ["sock monster macro", MonsterMacro],
  ["pizza box top-down", PizzaTop],
  ["neighbour kitchen", Kitchen],
  ["nose-vision void", Void],
  ["street morning", StreetMorning],
  ["tree feed, worm's-eye", TreeFeed],
  ["golden chase, dutch", Chase],
  ["chase top-down", TopDown],
  ["corner dusk", Corner],
  ["bins night, gutter angle", BinsNight],
  ["rocky macro", RockyMacro],
  ["dog lineup", Lineup],
  ["you with dog nose", NoseFace],
  ["headlines + emoji", Headlines],
];
const SHOTS: Shot[] = DESIGN.map(([, C], i) => [i * 10, i * 10 + 10, C, false]);
export const DESIGN_FRAMES = DESIGN.length * 10;
export const DogNoseDesign: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
