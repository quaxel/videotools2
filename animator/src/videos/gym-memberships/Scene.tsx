import React from "react";
import { Easing, interpolate } from "remotion";
import {
  Board,
  breathe,
  CameraShot,
  Counter,
  Desk,
  Door,
  InkBox,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Screen,
  Sfx,
  sfx,
  Shelf,
  Shot,
  speaking,
  squash,
  stroll,
  Stage,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Vec3,
  Video,
  walk,
  Window,
} from "../../engine";
import { AutopayMachine, Bench, CarRear, Couch, DeskBell, DumbbellRack, GymBag, Lockers, MemberCard, MonthBoard, PiggyBank, PriceSign, SpinBike, Treadmill, WallCalendar } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Your Gym Wants You To Skip" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "gym-memberships";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#9b5de5" };
const COACH: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#e0262f", cap: "#1d1a1a", lanyard: "#ffd23f" };
const NEIGHBOR: PuppetLook = { skin: "#fffaf2", hair: "#6b4423", outfit: "#4f7dff", pattern: "#ffffff" };
const ECONOMIST: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };
const EXTRAS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#f2b630" },
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#2a9d8f" },
  { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#e76f51", glasses: true },
  { skin: "#f6dcc4", hair: "#9aa0a6", outfit: "#4f7dff", cap: "#264653" },
  { skin: "#fffaf2", hair: "#4a2c1a", outfit: "#f28482" },
  { skin: "#fbe9d6", hair: "#1d1a1a", outfit: "#3fae5a" },
];

const PHONE_R = { item: "phone", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 1.02, pz + 1.85], [px + dx * 0.8, 1.0, pz + 1.6], p),
  target: [px, 0.9, pz],
  fov: 36,
});
const medium = (px: number, pz: number, p: number, dx = -0.5): CameraShot => ({
  position: lerp3([px + dx, 1.2, pz + 3.4], [px + dx * 0.85, 1.18, pz + 3.05], p),
  target: [px, 0.82, pz],
  fov: 38,
});

// ---------- locations ----------

const DESK_TOP = 0.65;
const BELL_AT: [number, number, number] = [0.55, DESK_TOP, -1.05];
const CARD_AT: [number, number, number] = [0.15, DESK_TOP + 0.005, -1.05];
const COACH_AT: [number, number] = [0.2, -1.75];
const FrontDeskSet: React.FC<{ camera: CameraShot; f: number; press?: number; ring?: number; bellSquash?: Vec3; card?: boolean; sign?: boolean; members?: number }> = ({
  camera,
  f,
  press = 0,
  ring = 0,
  bellSquash,
  card,
  sign,
  members,
}) => (
  <Room camera={camera} mood="golden" floor="#7a4a1a" wall="#f2b630" stripe="#e0262f" width={9} depth={6} wallPattern="panel" floorPattern="tile" sun={{ x: -2.2, color: "#ffd27a", bars: 4 }}>
    <Screen position={[0, 2.25, -2.9]} size={[1.6, 0.6]} text={members !== undefined ? `MEMBERS\n${members.toLocaleString("en-US")}` : "NEW YEAR\nNEW YOU"} glow={members !== undefined ? "#39ff7a" : "#ffd23f"} bg="#1a0f08" />
    <Label text="JOIN TODAY" position={[-2.2, 2.0, -2.92]} width={1.2} fg="#ffffff" bg="#e0262f" />
    <Window position={[2.4, 1.8, -2.94]} size={[1.4, 1.0]} sky="#bfe6ff" />
    <Counter position={[0, 0, -1.15]} size={[2.4, 0.6, 0.6]} color="#1d1a2a" top="#ffd23f" />
    <DeskBell position={BELL_AT} press={press} ring={ring} squash={bellSquash} />
    {card && <MemberCard position={CARD_AT} price="$70" rotationZ={0.12} />}
    {sign && <PriceSign position={[-0.6, DESK_TOP, -1.1]} text={"NEW YOU\nPLAN"} bg="#e0262f" width={0.5} />}
    <Plant position={[-3.4, 0, -2.3]} scale={1.2} />
    <Door position={[3.4, 0, -2.94]} sign="GYM FLOOR" glow="#14062b" />
  </Room>
);

const RUN_Z = -0.6;
const FloorSet: React.FC<{ camera: CameraShot; f: number; belt?: number }> = ({ camera, f, belt = 0 }) => (
  <Room camera={camera} mood="neon" floor="#2a163f" wall="#ff4fa3" stripe="#39ff7a" width={9} depth={6} wallPattern="brick" floorPattern="concrete">
    <Screen position={[0, 2.25, -2.9]} size={[1.4, 0.55]} text="PUSH IT" glow={f % 20 < 10 ? "#ff4fd8" : "#ffffff"} bg="#14062b" />
    <Treadmill position={[-0.3, 0, RUN_Z]} belt={belt} />
    <Treadmill position={[-0.3, 0, -1.9]} belt={belt * 0.5} />
    <DumbbellRack position={[1.9, 0, -2.3]} />
    <Label text="NO PAIN\nNO GAIN" position={[-2.4, 1.8, -2.92]} width={1.1} fg="#14062b" bg="#39ff7a" />
  </Room>
);

const COUCH_Z = -1.2;
const LivingSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="warm" floor="#6b3a2a" wall="#e76f51" width={7} depth={5} wallPattern="wallpaper" floorPattern="wood">
    <Couch position={[0, 0, COUCH_Z]} color="#2a9d8f" />
    <Screen position={[0, 1.9, -2.42]} size={[1.0, 0.5]} text={f % 30 < 15 ? "GAME ON" : "SNACKS"} glow="#ffd23f" bg="#101018" />
    <Lamp position={[-1.4, 1.5, -1.6]} color="#ffd27a" />
    <InkBox size={[0.6, 0.35, 0.4]} position={[1.3, 0.175, -1.2]} color="#8a5a3a" />
    <InkBox size={[0.12, 0.2, 0.12]} position={[1.3, 0.45, -1.2]} color="#ffd23f" ink={0.006} />
    <Shelf position={[2.2, 0, -2.2]} width={0.8} rows={3} color="#8a3a1a" seed={7} />
  </Room>
);

const CAR_AT: [number, number, number] = [0, 0, -1.4];
const DrivewaySet: React.FC<{ camera: CameraShot; open?: number; bag?: number }> = ({ camera, open = 0, bag }) => {
  const fall = bag ?? 0;
  const bx = 0.2;
  const by = interpolate(fall, [0, 0.4, 1], [0.6, 1.05, 0.15], { extrapolateRight: "clamp" });
  const bz = interpolate(fall, [0, 1], [-1.3, -0.3]);
  return (
    <Room camera={camera} mood="night" floor="#2a3242" wall="#1b2a5e" width={10} depth={7} wallPattern="brick" floorPattern="concrete">
      <InkBox size={[3.4, 2.4, 0.1]} position={[0, 1.2, -3.4]} color="#c9ced3" />
      {Array.from({ length: 6 }, (_, i) => (
        <InkBox key={i} size={[3.3, 0.02, 0.02]} position={[0, 0.3 + i * 0.4, -3.34]} color="#9aa0a6" ink={0} />
      ))}
      <mesh position={[2.6, 2.4, -3.3]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshBasicMaterial color="#ffe9a0" toneMapped={false} />
      </mesh>
      <CarRear position={CAR_AT} open={open} />
      <GymBag position={[bx, by, bz]} rotation={[0, 0.3, Math.PI / 2 + fall * 1.4]} />
    </Room>
  );
};

const BackOfficeSet: React.FC<{ camera: CameraShot; text: string; flash?: boolean; flip?: number }> = ({ camera, text, flash, flip = 0 }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="tile" floorPattern="carpet" sun={{ x: 1.6, color: "#8fb3ff", bars: 8 }}>
    <AutopayMachine position={[0.55, 0, -1.6]} text={text} flash={flash} />
    <WallCalendar position={[-0.65, 1.55, -2.42]} pages={["LAST VISIT\nMARCH", "APRIL", "MAY", "JUNE\nCANCEL"]} flip={flip} />
    <Desk position={[-0.7, 0, -1.4]} size={[1.0, 0.7, 0.6]} color="#d8e0ea" />
    <Plant position={[2.4, 0, -2.0]} />
  </Room>
);

const ECON_AT: [number, number] = [0.55, -1.0];
const LabSet: React.FC<{ camera: CameraShot; planned?: number; went?: number }> = ({ camera, planned = 0, went = 0 }) => (
  <Room camera={camera} mood="office" floor="#7d8a97" wall="#4fbf7a" stripe="#ffffff" width={7} depth={5} wallPattern="panel" floorPattern="wood" sun={{ x: -1.8, color: "#ffffff", bars: 5 }}>
    <Label text={"3 YEARS\nOF DATA"} position={[-1.7, 2.2, -2.42]} width={0.9} fg="#ffffff" bg="#1d4fa8" />
    <Board position={[-1.7, 1.35, -2.42]} cards={["MEMBER", "MEMBER", "MEMBER", "MEMBER", "MEMBER", "MEMBER"]} width={1.1} height={0.8} color="#8a6a4a" />
    <MonthBoard position={[0, 1.95, -2.42]} title="PLANNED" marks={planned} kind="plan" width={1.15} />
    <MonthBoard position={[0, 1.15, -2.42]} title="WENT" marks={went} kind="went" width={1.15} />
    <Desk position={[1.6, 0, -1.6]} size={[1.0, 0.75, 0.6]} color="#c99a6b" />
    <Plant position={[2.6, 0, -2.0]} />
  </Room>
);

const LockerSet: React.FC<{ camera: CameraShot; seventeen?: number; pass?: number; signAppear?: number }> = ({ camera, seventeen = 0, pass = 0, signAppear }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2aa198" stripe="#ffffff" width={7} depth={5} wallPattern="tile" floorPattern="tile" sun={{ x: 1.8, color: "#fff6d8", bars: 3 }}>
    <Lockers position={[0, 0, -2.2]} count={7} />
    <Bench position={[0, 0, -0.9]} />
    <group position={[-0.35, 0, -0.8]} scale={seventeen > 0 ? 1 + 0.25 * Math.sin(Math.min(1, seventeen) * Math.PI) : 1}>
      <PriceSign position={[0, 0, 0]} text={seventeen > 0.5 ? "$17\nPER VISIT" : "$70\nPER MONTH"} bg={seventeen > 0.5 ? "#d62828" : "#1d2f5e"} width={0.55} rotationY={0.15} appear={signAppear} />
    </group>
    {pass > 0 && (
      <group position={[0.4, 0, -0.8]} scale={Easing.out(Easing.back(2))(Math.min(1, pass))}>
        <PriceSign position={[0, 0, 0]} text={"10-VISIT PASS\n$10 PER VISIT"} bg="#3fae5a" width={0.62} rotationY={-0.15} />
      </group>
    )}
  </Room>
);

type PiggyLabel = { labelAppear?: number; labelCount?: number };
const SpinSet: React.FC<{ camera: CameraShot; crack?: number; squash?: Vec3 } & PiggyLabel> = ({ camera, crack = 0, squash, ...label }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" width={8} depth={6} wallPattern="panel" floorPattern="wood">
    {[-1.6, -0.8, 0.8, 1.6].map((x) => (
      <SpinBike key={x} position={[x, 0, -1.5]} rotationY={Math.PI / 2} />
    ))}
    <Label text="SPIN CLASS" position={[0, 2.2, -2.92]} width={1.3} fg="#ffffff" bg="#ff4fd8" />
    <PiggyBank position={[0, 0, -0.9]} crack={crack} squash={squash} {...label} />
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const desk = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof FrontDeskSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<FrontDeskSet camera={camera} f={f} {...extra} />} />
);
const floor = (camera: CameraShot, f: number, puppets: PuppetPlacement[], belt = 0, grade: Grade = {}) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} {...grade} set={<FloorSet camera={camera} f={f} belt={belt} />} />
);
const living = (camera: CameraShot, f: number, puppets: PuppetPlacement[], grade: Grade = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<LivingSet camera={camera} f={f} />} />
);
const driveway = (camera: CameraShot, puppets: PuppetPlacement[], extra: { open?: number; bag?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} {...grade} set={<DrivewaySet camera={camera} {...extra} />} />
);
const backOffice = (camera: CameraShot, text: string, extra: { flash?: boolean; flip?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} {...grade} set={<BackOfficeSet camera={camera} text={text} {...extra} />} />
);
const lab = (camera: CameraShot, puppets: PuppetPlacement[], extra: { planned?: number; went?: number } = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<LabSet camera={camera} {...extra} />} />
);
const lockers = (camera: CameraShot, puppets: PuppetPlacement[], extra: { seventeen?: number; pass?: number; signAppear?: number } = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<LockerSet camera={camera} {...extra} />} />
);
const spin = (camera: CameraShot, crack: number, squashed?: Vec3, label: PiggyLabel = {}) => (
  <Stage bg={moodBackground("dream")} camera={camera} set={<SpinSet camera={camera} crack={crack} squash={squashed} {...label} />} />
);

const coachPose = (f: number, talking: boolean, extra: Partial<PuppetPose> = {}): PuppetPose => ({
  expression: "excited",
  mouthOpen: talking ? talk(f) : 0,
  lookX: 0,
  bob: breathe(f),
  ...extra,
});
const YOU_DESK: [number, number] = [-0.45, -0.35];

// ---------- shots ----------

const SignUp: React.FC = () => {
  const f = useShotFrame();
  return desk(medium(-0.1, -0.6, f / 42, -0.3), f, [
    pup("you", YOU, YOU_DESK, { expression: "excited", armR: [40 + Math.sin(f / 3) * 10, -70], lookX: 0.6, bob: breathe(f) }),
    pup("coach", COACH, COACH_AT, coachPose(f, false, { lookX: -0.6, armL: [60, -30] })),
  ], { card: true });
};

const YouSign: React.FC = () => {
  const f = useShotFrame();
  return desk(close(YOU_DESK[0], YOU_DESK[1], f / 43, -0.2), f, [pup("you", YOU, YOU_DESK, { expression: "excited", armL: [120 + Math.sin(f / 4) * 15, -30], headTilt: 6, bob: breathe(f) })], { card: true }, { blur: 6 });
};

// Top-down: the membership card next to the AUTOPAY bell (the seed).
const CardMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.36, 2.15, -0.62], [0.36, 2.0, -0.7], f / 33), target: [0.36, DESK_TOP, -1.06], fov: 44 };
  return desk(cam, f, [], { card: true });
};

const CoachHype: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "coach", useFinalFrame());
  return desk(close(COACH_AT[0], COACH_AT[1], f / 44, 0.2), f, [pup("coach", COACH, COACH_AT, coachPose(f, talking, { armL: [150 + Math.sin(f / 3) * 10, -20], armR: [150 - Math.sin(f / 3) * 10, -20] }))], { card: true }, { blur: 6 });
};

// Over the shoulder: your head small at the corner, the coach pointing at you.
const CoachOTS: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "coach", useFinalFrame());
  const cam: CameraShot = { position: lerp3([-0.75, 1.55, 1.7], [-0.72, 1.52, 1.5], f / 37), target: [0.25, 1.0, -1.75], fov: 30 };
  return desk(cam, f, [pup("you", YOU, YOU_DESK, { view: "back", expression: "neutral" }), pup("coach", COACH, COACH_AT, coachPose(f, talking, { armR: [90, -10] }))], { card: true });
};

// Profile: running on the treadmill.
const Running: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.1, 2.4], [-0.3, 1.05, 2.1], (f + 8) / 40), target: [-0.3, 0.8, RUN_Z], fov: 42 };
  return floor(cam, f, [pup("you", YOU, [-0.3, RUN_Z], { view: "side", facing: 1, expression: "excited", ...walk(f * 2.2), bob: 0.12 + Math.abs(Math.sin(f / 2.2)) * 0.03 })], f / 20);
};

const Unstoppable: React.FC = () => {
  const f = useShotFrame();
  const pump = Math.abs(Math.sin(f / 4));
  return floor(medium(1.2, -1.3, f / 28, -0.3), f, [pup("you", YOU, [1.2, -1.3], { expression: "excited", armL: [150 - pump * 60, -20 - pump * 60], armR: [150 - pump * 60, -20 - pump * 60], bob: breathe(f) })]);
};

// Gag: flung off the back of the treadmill, landing on your bottom.
const FallOff: React.FC = () => {
  const f = useShotFrame();
  const fly = Easing.out(Easing.quad)(ramp(f, 2, 12));
  const x = interpolate(fly, [0, 1], [-0.5, -1.35]);
  const cam: CameraShot = { position: lerp3([-1.0, 0.95, 2.6], [-1.1, 0.9, 2.4], f / 27), target: [-1.0, 0.6, RUN_Z], fov: 50 };
  return floor(cam, f, [pup("you", YOU, [x, RUN_Z], { view: f < 12 ? "side" : "front", facing: 1, sit: f >= 12, expression: "shocked", ...ARMS_UP, bob: f < 12 ? 0.12 + Math.sin(fly * Math.PI) * 0.25 : 0 })], f / 8);
};

const NeighborLaugh: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.0, 2.0], [0.2, 0.95, 1.7], (f + 8) / 57), target: [0, 0.7, COUCH_Z], fov: 40 };
  const shake = Math.sin(f / 2);
  return living(cam, f, [pup("neighbor", NEIGHBOR, [0, COUCH_Z + 0.05], { sit: true, expression: "excited", mouthOpen: 0.4 + 0.3 * Math.abs(shake), armL: [30, -100], armR: [30, -100], headTilt: shake * 8, bob: Math.abs(shake) * 0.03 })]);
};

// Gag: the trunk pops and the forgotten bag thumps out.
const TrunkPop: React.FC = () => {
  const f = useShotFrame();
  const open = Easing.out(Easing.back(2))(ramp(f, 34, 42));
  const cam: CameraShot = { position: lerp3([0.6, 1.4, 2.6], [0.4, 1.3, 2.1], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 70))), target: [0, 0.7, -1.0], fov: 44 };
  return driveway(cam, [], { open, bag: ramp(f, 40, 52) });
};

// Low angle: the coach reaches for the bell.
const ReachBell: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 0.45, 1.3], [0.1, 0.48, 1.05], (f + 8) / 53), target: [0.4, 1.0, -1.4], fov: 46 };
  return desk(cam, f, [pup("coach", COACH, COACH_AT, coachPose(f, false, { expression: "smug", armR: [interpolate(ramp(f, 0, 40), [0, 1], [10, 70]), -40], lookX: 0.5 }))]);
};

// Macro: ding.
const BellMacro: React.FC<{ hit?: number }> = ({ hit = 10 }) => {
  const f = useShotFrame();
  const press = f < hit ? ramp(f, hit - 4, hit) : 1 - ramp(f, hit + 2, hit + 6);
  const cam: CameraShot = { position: lerp3([0.5, 0.95, -0.45], [0.52, 0.9, -0.6], f / 42), target: [BELL_AT[0], DESK_TOP + 0.08, BELL_AT[2]], fov: 40 };
  return desk(cam, f, [], { press, ring: f >= hit ? ramp(f, hit, hit + 30) : 0, bellSquash: squash(f, hit, 0.3) }, { blur: 4 });
};
const BellHit: React.FC = () => <BellMacro hit={10} />;
const BellLoop: React.FC = () => <BellMacro hit={12} />;

const AutopayFlash: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.3, 1.6], [0.5, 1.25, 1.2], (f + 8) / 72), target: [0.55, 1.1, -1.6], fov: 42 };
  return backOffice(cam, "PAID $70", { flash: f % 16 < 8 }, { truth: 0.3 });
};

const PhoneShock: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.0, 1.3], [0.25, 0.98, 1.05], (f + 8) / 63), target: [0.0, 0.88, -0.2], fov: 38 };
  return driveway(cam, [pup("you", YOU, [0, -0.2], { expression: f < 10 ? "neutral" : "shocked", hold: PHONE_R, armR: HOLD, lookX: 0.4, headTilt: -4 })], { open: 1, bag: 1 }, { blur: 6, truth: ramp(f, 0, 25) * 0.5 });
};

const SellsPlan: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.4, 1.3, 2.0], [-0.3, 1.25, 1.7], (f + 8) / 57), target: [-0.3, 1.05, -1.4], fov: 42 };
  return desk(cam, f, [pup("coach", COACH, COACH_AT, coachPose(f, false, { expression: "smug", armL: [80, -20], lookX: -0.7 }))], { sign: true });
};

const Economist: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.45, 3.2], [0.1, 1.4, 2.8], (f + 8) / 62), target: [-0.1, 1.3, -2.0], fov: 48 };
  return lab(cam, [pup("econ", ECONOMIST, ECON_AT, { expression: "neutral", armL: [110, -10], lookX: -1, bob: breathe(f) })]);
};

const ThreeYears: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.5, 1.9, 0.0], [-1.6, 1.85, -0.35], f / 30), target: [-1.7, 1.8, -2.42], fov: 42 };
  return lab(cam, []);
};

const Planned: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.6, 0.6], [0, 1.6, 0.3], f / 77), target: [0, 1.6, -2.42], fov: 46 };
  return lab(cam, [], { planned: Math.round(ramp(f, 8, 50) * 9) });
};

const Went: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.4, 0.4], [0, 1.25, 0.1], f / 40), target: [0, 1.3, -2.42], fov: 44 };
  return lab(cam, [], { planned: 9, went: Math.round(ramp(f, 2, 24) * 4) });
};

const Tag70: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 0.85, 1.3], [-0.5, 0.82, 1.0], (f + 8) / 53), target: [-0.35, 0.55, -0.8], fov: 40 };
  return lockers(cam, []);
};

const Tag17: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.45, 0.82, 0.9], [-0.4, 0.8, 0.65], f / 61), target: [-0.35, 0.56, -0.8], fov: 40 };
  // The price swaps to $17 with a pop and a flash halfway through the swell.
  return lockers(cam, [], { seventeen: ramp(f, 12, 24), signAppear: f - 18 });
};

const PassSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 0.85, 1.0], [0.35, 0.82, 0.75], (f + 4) / 49), target: [0.4, 0.58, -0.8], fov: 40 };
  return lockers(cam, [], { seventeen: 1, pass: ramp(f, 2, 14) });
};

const BothSigns: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.2, 2.4], [0.05, 1.15, 2.1], f / 44), target: [0.0, 0.75, -0.9], fov: 44 };
  return lockers(cam, [pup("you", YOU, [0, -1.05], { sit: true, expression: "skeptical", lookX: f < 20 ? -1 : 1, bob: breathe(f) })], { seventeen: 1, pass: 1 });
};

const Piggy: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.1, 2.0], [0.3, 0.9, 1.1], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 54))), target: [0, 0.45, -0.9], fov: 42 };
  // The $600 counts up from zero as the camera closes in.
  return spin(cam, 0, undefined, { labelCount: ramp(f, 2, 30) });
};

// Gag: the piggy bank splits open; nothing inside.
const PiggyCrack: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.7, 1.3, 0.8], [0.6, 1.55, 1.2], Easing.inOut(Easing.quad)(ramp(f, 0, 70))), target: [0, 0.4, -0.9], fov: 44 };
  // It squashes as if bracing, then bursts.
  return spin(cam, Easing.out(Easing.back(1.5))(ramp(f, 10, 22)), squash(f, 3, 0.3), { labelAppear: f - 13 });
};

const CalendarFlip: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.45, 2.4], [-0.25, 1.42, 2.0], (f + 8) / 69), target: [-0.1, 1.25, -2.0], fov: 48 };
  return backOffice(cam, "PAID $70", { flip: interpolate(f, [20, 60], [0, 1.9], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), flash: f % 20 < 10 });
};

const CalendarClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.6, 0.0], [-0.62, 1.58, -0.35], f / 46), target: [-0.65, 1.55, -2.42], fov: 40 };
  return backOffice(cam, "PAID $70", { flip: interpolate(f, [0, 34], [1.9, 3], { extrapolateRight: "clamp" }) });
};

const MemberCount: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 2.0, 0.9], [0, 2.1, 0.5], (f + 8) / 56), target: [0, 2.2, -2.9], fov: 42 };
  return desk(cam, f, [], { members: Math.round(Easing.out(Easing.cubic)(ramp(f, 0, 36)) * 70) * 100 });
};

const EmptyFloor: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.8, 1.6, 4.2], [0.6, 1.55, 3.8], (f + 8) / 50), target: [0, 0.8, -1.0], fov: 46 };
  return floor(cam, f, [
    pup("x0", EXTRAS[0], [-0.3, RUN_Z], { view: "side", facing: 1, expression: "neutral", ...walk(f * 1.6) }),
    pup("coach", COACH, [1.2, 0.3], { expression: "smug", armL: [10, -95], armR: [10, -95], bob: breathe(f) }),
  ], f / 30);
};

// Gag: everyone shows up at once.
const Flood: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 2.6, 4.0], [0, 2.4, 3.6], f / 44), target: [0, 0.6, -0.4], fov: 50 };
  const crowd = Array.from({ length: 18 }, (_, i) => {
    const col = i % 6;
    const row = Math.floor(i / 6);
    const arrive = ramp(f, i * 1.2, i * 1.2 + 10);
    return pup(`c${i}`, i === 7 ? YOU : EXTRAS[i % EXTRAS.length], [-1.5 + col * 0.6 + (row % 2) * 0.3, interpolate(arrive, [0, 1], [3.5, -1.2 + row * 0.7])], {
      expression: i % 3 ? "excited" : "shocked",
      ...(arrive < 1 ? walk(f * 1.5 + i) : {}),
      ...(i % 4 === 0 ? ARMS_UP : {}),
      bob: breathe(f + i * 3),
    });
  });
  return floor(cam, f, crowd, f / 30);
};

const CoachShock: React.FC = () => {
  const f = useShotFrame();
  return floor(close(1.2, 0.3, f / 33, 0.2), f, [pup("coach", COACH, [1.2, 0.3], { expression: "shocked", armL: [40, -30], armR: [40, -30], headTilt: -6 })], f / 30, { blur: 6 });
};

const NeighborUp: React.FC = () => {
  const f = useShotFrame();
  const up = ramp(f, 14, 26);
  const cam: CameraShot = { position: lerp3([-0.3, 1.1, 2.6], [-0.2, 1.08, 2.2], (f + 8) / 69), target: [0, 0.8, COUCH_Z], fov: 40 };
  return living(cam, f, [pup("neighbor", NEIGHBOR, [0, COUCH_Z + 0.05 + up * 0.5], { sit: up < 0.5, expression: up > 0.5 ? "excited" : "neutral", armL: [up * 150, -20], armR: [up * 150, -20], bob: breathe(f) })]);
};

const NeighborSigns: React.FC = () => {
  const f = useShotFrame();
  // He strides in from the left and lands at the desk, then waves.
  const walkIn = stroll(f, -8, 22, [-1.7, -0.15], YOU_DESK);
  return desk(medium(-0.1, -0.6, (f + 8) / 48, -0.3), f, [
    pup("neighbor", NEIGHBOR, walkIn.at, { expression: "excited", armR: [40 + Math.sin(f / 3) * 10, -70], lookX: 0.6, bob: breathe(f), ...walkIn.pose }),
    pup("coach", COACH, COACH_AT, coachPose(f, false, { lookX: -0.6, armL: [60, -30] })),
  ], { card: true });
};

const CardMacro2: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 2.1, -0.62], [0.36, 2.0, -0.72], f / 37), target: [0.36, DESK_TOP, -1.06], fov: 44 };
  return desk(cam, f, [], { card: true });
};

const CoachHype2: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "coach", useFinalFrame());
  return desk(close(COACH_AT[0], COACH_AT[1], f / 43, -0.25), f, [pup("coach", COACH, COACH_AT, coachPose(f, talking, { armL: [150, -20], armR: [100, -10], lookX: -0.5 }))], { card: true }, { blur: 6 });
};

const SHOTS: Shot[] = [
  [0, 42, SignUp, false],
  [42, 85, YouSign, false],
  [85, 118, CardMacro, false],
  [118, 162, CoachHype, false],
  [162, 199, CoachOTS, false],
  [199, 231, Running, true],
  [231, 259, Unstoppable, false],
  [259, 286, FallOff, false],
  [286, 335, NeighborLaugh, true],
  [335, 397, TrunkPop, true],
  [397, 442, ReachBell, true],
  [442, 484, BellHit, false],
  [484, 548, AutopayFlash, true],
  [548, 603, PhoneShock, true],
  [603, 652, SellsPlan, true],
  [652, 706, Economist, true],
  [706, 736, ThreeYears, false],
  [736, 813, Planned, false],
  [813, 853, Went, false],
  [853, 898, Tag70, true],
  [898, 959, Tag17, false],
  [959, 1008, PassSign, false],
  [1008, 1052, BothSigns, false],
  [1052, 1098, Piggy, true],
  [1098, 1168, PiggyCrack, false],
  [1168, 1229, CalendarFlip, true],
  [1229, 1275, CalendarClose, false],
  [1275, 1323, MemberCount, true],
  [1323, 1365, EmptyFloor, true],
  [1365, 1409, Flood, false],
  [1409, 1442, CoachShock, false],
  [1442, 1503, NeighborUp, true],
  [1503, 1543, NeighborSigns, true],
  [1543, 1580, CardMacro2, false],
  [1580, 1623, CoachHype2, false],
  [1623, TIMING.totalFrames, BellLoop, false],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.14, until: 199 },
  { at: 6, src: sfx("paper"), volume: 0.4 },
  { at: 86, src: sfx("card"), volume: 0.45 },
  { at: 90, src: sfx("credit-blip"), volume: 0.35 },
  { at: 199, src: sfx("hum"), volume: 0.1, until: 286 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 201 + k * 4, src: sfx("tick"), volume: 0.35 })),
  { at: 263, src: sfx("whoosh"), volume: 0.45 },
  { at: 271, src: sfx("boom"), volume: 0.45 },
  { at: 286, src: sfx("ambience"), volume: 0.12, until: 335 },
  { at: 335, src: sfx("ambience"), volume: 0.1, until: 397 },
  { at: 369, src: sfx("reel-stop"), volume: 0.6 },
  { at: 384, src: sfx("boom"), volume: 0.5 },
  { at: 397, src: sfx("ambience"), volume: 0.12, until: 484 },
  { at: 452, src: sfx("chime"), volume: 0.7 },
  { at: 484, src: sfx("hum"), volume: 0.1, until: 548 },
  { at: 490, src: sfx("credit-blip"), volume: 0.5 },
  // The twist: a riser through the pause, a sting on "It's selling you the plan".
  { at: 500, src: sfx("riser"), volume: 0.25 },
  { at: 548, src: sfx("sting"), volume: 0.4 },
  { at: 552, src: sfx("near-miss"), volume: 0.35 },
  { at: 652, src: sfx("hum"), volume: 0.08, until: 853 },
  ...Array.from({ length: 9 }, (_, k) => ({ at: 745 + k * 5, src: sfx("tick"), volume: 0.35 })),
  ...Array.from({ length: 4 }, (_, k) => ({ at: 816 + k * 6, src: sfx("stamp"), volume: 0.3 })),
  { at: 912, src: sfx("whoosh"), volume: 0.35 },
  { at: 916, src: sfx("pop"), volume: 0.5 },
  { at: 961, src: sfx("pop"), volume: 0.5 },
  { at: 962, src: sfx("chime"), volume: 0.3 },
  { at: 1108, src: sfx("boom"), volume: 0.4 },
  { at: 1110, src: sfx("near-miss"), volume: 0.35 },
  { at: 1168, src: sfx("hum"), volume: 0.1, until: 1275 },
  ...[1190, 1210, 1235, 1255].map((at) => ({ at, src: sfx("paper"), volume: 0.4 })),
  ...[1198, 1222, 1247].map((at) => ({ at, src: sfx("credit-blip"), volume: 0.35 })),
  ...Array.from({ length: 10 }, (_, k) => ({ at: 1277 + k * 3.5, src: sfx("tick"), volume: 0.3 })),
  { at: 1323, src: sfx("ambience"), volume: 0.12, until: 1442 },
  { at: 1365, src: sfx("ambience"), volume: 0.3, until: 1409 },
  { at: 1412, src: sfx("near-miss"), volume: 0.3 },
  { at: 1442, src: sfx("ambience"), volume: 0.12, until: 1503 },
  { at: 1503, src: sfx("paper"), volume: 0.4 },
  { at: 1544, src: sfx("card"), volume: 0.45 },
  { at: 1635, src: sfx("chime"), volume: 0.7 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 397, volume: 0.2 },
  { src: MUSIC_FILES.mystery, from: 397, to: 853, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 853, to: 1442, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1442, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
