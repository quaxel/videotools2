import React from "react";
import { Easing, interpolate } from "remotion";
import {
  BigButton,
  InkBox,
  Board,
  breathe,
  CameraShot,
  Chair,
  Counter,
  Crates,
  Desk,
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
import { AlarmClock, Bed, BoardingPass, DotGrid, Fridge, Plane, Printer, Runway, SeatRows, SlapHand, TicketStream } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Airlines Sell Your Seat Twice" — first video made with the pipeline (voice-first, cut to timing.json).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "airline-overbooking";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#3fae5a" };
const STRANGER: PuppetLook = { skin: "#f6dcc4", hair: "#7a2e1a", outfit: "#d62828", chain: "#e8b04a" };
const AGENT: PuppetLook = { skin: "#fbe9d6", hair: "#1d1a1a", outfit: "#1d2f5e", cap: "#1d2f5e", lanyard: "#f2b630" };
const SLEEPER: PuppetLook = { skin: "#fffaf2", hair: "#6b4423", outfit: "#4f7dff", pattern: "#ffffff" };
const ANALYST: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };
const EXTRAS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#f2b630" },
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#9b5de5" },
  { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#e76f51", glasses: true },
  { skin: "#f6dcc4", hair: "#9aa0a6", outfit: "#2a9d8f", cap: "#264653" },
  { skin: "#fffaf2", hair: "#4a2c1a", outfit: "#f28482" },
];

const COFFEE = { item: "drink", hand: "R" } as const;
const PHONE_R = { item: "phone", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const CARRY: [number, number] = [8, 62];
const ARMS_CROSSED = { armL: [10, -95] as [number, number], armR: [10, -95] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

// ---------- camera helpers (subject feet at px, pz) ----------

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

const GATE_CHAIRS = [-1.6, -0.85, -0.1, 0.65, 1.4];
const seat = (x: number): [number, number] => [x, 0.75];

const GateSet: React.FC<{ camera: CameraShot; f: number; passes?: number; stamp?: number; screen?: string }> = ({ camera, f, passes, stamp = 0, screen = "GATE 14\nFLIGHT 214" }) => (
  <Room camera={camera} mood="warm" floor="#5b3a2a" wall="#e8833a" stripe="#ffd23f" width={9} depth={6} wallPattern="panel" floorPattern="carpet">
    <Window position={[-2.6, 1.85, -2.94]} size={[2.0, 1.1]} sky="#1b2a5e" />
    <Window position={[2.6, 1.85, -2.94]} size={[2.0, 1.1]} sky="#1b2a5e" />
    <Screen position={[0, 2.25, -2.9]} size={[1.4, 0.6]} text={screen} glow={Math.floor(f / 12) % 2 && screen.includes("OVERSOLD") ? "#ff6b6b" : "#ffd23f"} bg="#1a0f08" />
    <Counter position={[0, 0, -1.8]} size={[2.0, 0.75, 0.6]} color="#1d2f5e" top="#f2e6d0" />
    {passes !== undefined && (
      <>
        <BoardingPass position={[-0.14, 0.805, -1.72]} rotation={[-Math.PI / 2, 0, 0.08]} name="YOU" stamp={stamp} width={0.38} />
        <BoardingPass position={[0.14, 0.81, -1.66]} rotation={[-Math.PI / 2, 0, -0.1]} name="STRANGER" stamp={stamp} width={0.38} />
      </>
    )}
    {GATE_CHAIRS.map((x) => (
      <Chair key={x} position={[x, 0, 0.55]} color="#2a9d8f" />
    ))}
    <Plant position={[-3.2, 0, -2.2]} />
    <Plant position={[3.2, 0, -2.2]} scale={1.2} />
  </Room>
);

const BEDROOM_SLEEPER: [number, number] = [0, -0.4];
const BedroomSet: React.FC<{ camera: CameraShot; f: number; time: string; jump?: number; slap?: number; morning?: boolean; clockSquash?: Vec3 }> = ({ camera, f, time, jump, slap, morning, clockSquash }) => (
  <Room camera={camera} mood={morning ? "golden" : "dream"} floor="#3b2a5c" wall={morning ? "#b48ae0" : "#7b4fc0"} width={6} depth={5} wallPattern="wallpaper" sun={morning ? { x: -1.6, color: "#ffd27a" } : { x: -1.6, color: "#8fa8ff", bars: 8 }}>
    <Window position={[-1.6, 1.6, -2.44]} size={[1.0, 0.9]} sky={morning ? "#ffd27a" : "#1a1240"} blinds={!morning} />
    <Bed position={[0, 0, -0.8]} />
    <InkBox size={[0.5, 0.55, 0.45]} position={[0.95, 0.275, -0.5]} color="#8a5a3a" />
    <AlarmClock position={[0.95, 0.55, -0.45]} time={time} jump={jump} frame={f} squash={clockSquash} />
    {slap !== undefined && <SlapHand target={[0.95, 0.82, -0.45]} reach={slap} />}
    <Lamp position={[-0.95, 1.55, -0.6]} on={!morning} color="#ffb8ec" />
    <Shelf position={[1.9, 0, -2.2]} width={0.9} rows={3} color="#5a3d7a" seed={3} />
  </Room>
);

const CheckInSet: React.FC<{ camera: CameraShot }> = ({ camera }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2aa198" width={9} depth={6} stripe="#ffffff" wallPattern="tile" floorPattern="tile" sun={{ x: -2.4, color: "#fff6d8", bars: 3 }}>
    <Label text="CHECK-IN" position={[0, 2.3, -2.9]} width={1.6} fg="#ffffff" bg="#1f7f78" />
    <Screen position={[-2.1, 1.9, -2.9]} size={[1.3, 0.6]} text={"FLIGHT 214\nON TIME"} glow="#ffd23f" bg="#0b1a14" />
    <Counter position={[0, 0, -1.4]} size={[2.4, 0.95, 0.6]} color="#ffffff" top="#2c3a40" />
    <Crates position={[2.4, 0, -1.6]} count={4} color="#e76f51" />
    <Plant position={[-3.0, 0, -2.0]} scale={1.3} />
  </Room>
);

const FridgeSet: React.FC<{ camera: CameraShot; open: number; expired: boolean; appear?: number }> = ({ camera, open, expired, appear }) => (
  <Room camera={camera} mood="golden" floor="#c9a26b" wall="#f2c94c" width={6} depth={5} wallPattern="tile" floorPattern="tile" sun={{ x: 1.0, color: "#ffd27a" }}>
    <Fridge position={[0, 0, -1.4]} open={open} expired={expired} appear={appear} />
    <Window position={[1.6, 1.6, -2.44]} size={[0.9, 0.8]} sky="#9fd8ff" />
    <Shelf position={[-1.5, 0, -2.2]} width={0.9} rows={2} color="#b5651d" seed={5} />
  </Room>
);

const ANALYST_AT: [number, number] = [0, -1.15];
type Reveal = { appear?: number; count?: number };
const OfficeSet: React.FC<{ camera: CameraShot; f: number; screen: string; press?: number; tickets?: number; dots?: number; reveal?: Reveal }> = ({ camera, screen, press = 0, tickets, dots, reveal }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" width={8} depth={6} stripe="#8fb3ff" wallPattern="brick" floorPattern="carpet" sun={{ x: 1.2, color: "#8fb3ff", bars: 8 }}>
    <Board position={[-1.9, 1.65, -2.92]} cards={["NYC-MIA", "LAX-SEA", "BOS-ORD", "DFW-DEN", "SFO-LAS", "NO-SHOW\nLOG"]} width={1.5} height={1.0} color="#8a6a4a" />
    <Screen position={[0.2, 2.0, -2.9]} size={[1.5, 0.8]} text={screen} glow="#5ad1ff" bg="#071226" {...reveal} />
    {dots !== undefined && <DotGrid position={[2.0, 1.75, -2.9]} size={1.1} red={dots} />}
    <Desk position={[0, 0, -0.65]} size={[1.6, 0.75, 0.7]} color="#d8e0ea" />
    <BigButton position={[0.45, 0.78, -0.55]} label="SELL +16" press={press} />
    <Printer position={[-0.55, 0.78, -0.55]} />
    {tickets !== undefined && <TicketStream origin={[-0.55, 1.05, -0.35]} t={tickets} />}
    <Plant position={[2.9, 0, -2.3]} />
  </Room>
);

const CABIN_SEATS: [number, number][] = [
  [-0.95, 0.4], [-0.5, 0.4], [0.5, 0.4], [0.95, 0.4],
  [-0.95, -0.5], [-0.5, -0.5], [0.5, -0.5], [0.95, -0.5],
  [-0.95, -1.4], [0.5, -1.4], [0.95, -1.4], [-0.5, -1.4],
];
const CabinSet: React.FC<{ camera: CameraShot; sign?: string; reveal?: Reveal }> = ({ camera, sign, reveal }) => (
  <Room camera={camera} mood="office" floor="#7d8a97" wall="#cfeee0" width={3.2} depth={8} sideWalls wallPattern="panel" floorPattern="carpet">
    <SeatRows rows={5} z0={0.4} color="#1d4fa8" />
    {sign && <Screen position={[0, 1.78, 1.2]} size={[1.1, 0.62]} text={sign} glow="#3ccf6e" bg="#0b1a14" {...reveal} />}
  </Room>
);

const DeskSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={8} depth={6} wallPattern="brick" floorPattern="concrete">
    <Screen position={[0, 2.15, -2.9]} size={[1.5, 0.6]} text="VOLUNTEERS?" glow={f % 20 < 10 ? "#ff4fd8" : "#ffffff"} bg="#14062b" />
    <Label text={"BUMPED?\nUP TO 4x FARE"} position={[2.1, 1.75, -2.92]} width={1.2} fg="#ffffff" bg="#1d2f5e" />
    <Label text={"FREE FLIGHT\nVOUCHER"} position={[-2.1, 1.75, -2.92]} width={1.2} fg="#14062b" bg="#ffd23f" />
    <Counter position={[0, 0, -1.6]} size={[2.2, 0.75, 0.6]} color="#2a163f" top="#ffb8ec" />
    <Plant position={[-3.1, 0, -2.2]} />
  </Room>
);

const RunwaySet: React.FC<{ camera: CameraShot; t: number }> = ({ camera, t }) => (
  <Room camera={camera} mood="night" floor="#1c2433" wall="#0b1430" width={40} depth={30} wallPattern="plain" floorPattern="concrete">
    <Runway />
    <Plane position={[0, 0.45, -1.5]} t={t} />
  </Room>
);

// ---------- shots ----------

const gate = (camera: CameraShot, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof GateSet>> = {}, grade: { blur?: number; truth?: number } = {}) => (f: number) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<GateSet camera={camera} f={f} {...extra} />} />
);

// Overhead: two identical boarding passes on the counter (opening and loop).
const TwoPasses: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.95, -1.42], [0, 1.8, -1.5], f / 45), target: [0, 0.8, -1.69], fov: 46 };
  return gate(cam, [], { passes: 1 })(f);
};

const Standoff: React.FC = () => {
  const f = useShotFrame();
  return gate(medium(0, 1.15, f / 48, 0), [
    pup("you", YOU, [-0.37, 1.15], { expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: 1, headTilt: -5, bob: breathe(f) }),
    pup("stranger", STRANGER, [0.37, 1.15], { expression: "smug", hold: { item: "phone", hand: "L" }, armL: HOLD, lookX: -1, headTilt: 6, bob: breathe(f + 9) }),
  ])(f);
};

const bedroom = (camera: CameraShot, f: number, time: string, pose: PuppetPose, extra: { jump?: number; slap?: number; morning?: boolean; clockSquash?: Vec3 } = {}) => (
  <Stage
    bg={moodBackground(extra.morning ? "golden" : "dream")}
    camera={camera}
    puppets={[pup("sleeper", SLEEPER, BEDROOM_SLEEPER, pose)]}
    set={<BedroomSet camera={camera} f={f} time={time} {...extra} />}
  />
);

const Snoring: React.FC = () => {
  const f = useShotFrame();
  return bedroom(medium(0.2, -0.4, (f + 8) / 50, -0.4), f, "6:00", { expression: "neutral", blink: true, headTilt: 8 + Math.sin(f / 9) * 3, mouthOpen: 0.15 + 0.1 * Math.sin(f / 5) });
};

// Gag: the snooze slap sends the clock flying.
const Snooze: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.5], [0.3, 1.25, 1.3], f / 46), target: [1.05, 0.75, -0.45], fov: 40 };
  const slap = f < 10 ? Easing.in(Easing.quad)(ramp(f, 0, 10)) : 1 - ramp(f, 14, 24);
  return bedroom(cam, f, "6:00", { expression: "neutral", blink: true }, { slap, jump: ramp(f, 10, 34), clockSquash: squash(f, 9, 0.3) });
};

const RaceIn: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f + 8, 0, 48);
  const cam: CameraShot = { position: lerp3([-1.6, 1.3, 3.6], [-0.6, 1.25, 3.4], p), target: lerp3([-1.0, 0.9, 0], [0, 0.9, -0.6], p), fov: 40 };
  return (
    <Stage
      bg={moodBackground("daylight")}
      camera={cam}
      puppets={[pup("you", YOU, [interpolate(p, [0, 1], [-2.6, -0.1]), 0.4], { view: "side", facing: 1, hold: COFFEE, armR: CARRY, expression: "neutral", ...walk(f * 1.4) })]}
      set={<CheckInSet camera={cam} />}
    />
  );
};

const FeelSafe: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 0.45, 2.1], [-0.12, 0.42, 1.9], f / 47), target: [0, 1.25, -0.6], fov: 46 };
  const up = ramp(f, 4, 12);
  return (
    <Stage
      bg={moodBackground("daylight")}
      camera={cam}
      puppets={[pup("you", YOU, [0, -0.6], { expression: f < 6 ? "neutral" : "excited", hold: COFFEE, armL: [interpolate(up, [0, 1], [12, 150]), -20], armR: HOLD, bob: breathe(f) })]}
      set={<CheckInSet camera={cam} />}
    />
  );
};

const AGENT_AT: [number, number] = [0, -2.25];
const agentPose = (f: number, talking: boolean): PuppetPose => ({ expression: "neutral", hold: { item: "phone", hand: "R" }, armR: [30, -110], mouthOpen: talking ? talk(f) : 0, lookX: 0, bob: breathe(f) });

const Announcement: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "agent", useFinalFrame());
  const cam: CameraShot = { position: lerp3([0.25, 1.25, 0.3], [0.2, 1.22, 0.0], (f + 8) / 52), target: [0, 1.0, -2.25], fov: 32 };
  return gate(cam, [pup("agent", AGENT, AGENT_AT, agentPose(f, talking))], { screen: "FLIGHT 214\nOVERSOLD" })(f);
};

const crowdSeated = (f: number, you: PuppetPose): PuppetPlacement[] => [
  pup("x0", EXTRAS[0], seat(-1.6), { sit: true, expression: "neutral", lookX: -1, bob: breathe(f + 3), ...ARMS_CROSSED }),
  pup("x1", EXTRAS[1], seat(-0.85), { sit: true, expression: "skeptical", lookX: 1, bob: breathe(f + 7) }),
  pup("you", YOU, seat(-0.1), { sit: true, hold: COFFEE, armR: HOLD, ...you }),
  pup("stranger", STRANGER, seat(0.65), { sit: true, expression: "smug", lookX: -1, hold: { item: "phone", hand: "L" }, armL: HOLD, bob: breathe(f + 11) }),
  pup("x2", EXTRAS[2], seat(1.4), { sit: true, expression: "neutral", lookX: 1, bob: breathe(f + 5), ...ARMS_CROSSED }),
];

const NobodyMoves: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "agent", useFinalFrame());
  const cam: CameraShot = { position: lerp3([0, 1.7, 4.6], [0, 1.65, 4.3], f / 54), target: [0, 0.85, -0.6], fov: 44 };
  return gate(cam, [...crowdSeated(f, { expression: "neutral", lookX: 0, bob: breathe(f) }), pup("agent", AGENT, AGENT_AT, agentPose(f, talking))], { screen: "FLIGHT 214\nOVERSOLD" })(f);
};

// Over the shoulder: the back of your head small in the corner, the agent across the room.
const YourName: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.95, 1.6, 4.6], [-0.92, 1.58, 4.4], f / 36), target: [0.15, 1.0, -2.2], fov: 22 };
  return gate(cam, [pup("you", YOU, seat(-0.1), { view: "back", sit: true, expression: "neutral" }), pup("agent", AGENT, AGENT_AT, { ...agentPose(f, false), armR: [100, -10], hold: undefined, lookX: 0 })], {
    screen: "FLIGHT 214\nOVERSOLD",
  })(f);
};

// Gag: hearing your name, the coffee tips over.
const CoffeeSpill: React.FC = () => {
  const f = useShotFrame();
  const tip = Easing.out(Easing.back(2))(ramp(f, 4, 14));
  return gate(
    close(-0.1, 0.95, f / 51, -0.15),
    [pup("you", YOU, seat(-0.1), { sit: true, hold: COFFEE, armR: [10 + tip * 40, -78 + tip * 30], itemTilt: tip * 110, expression: "shocked", headTilt: 4 })],
    {},
    { blur: 7 },
  )(f);
};

const NothingWrong: React.FC = () => {
  const f = useShotFrame();
  return gate(close(-0.1, 0.95, (f + 8) / 46, 0.2), [pup("you", YOU, seat(-0.1), { sit: true, expression: "skeptical", lookX: -0.6, blink: f > 30 && f < 33 })], {}, { blur: 7, truth: ramp(f, 0, 20) * 0.6 })(f);
};

const SoldTwice: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.95, -1.42], [0, 1.8, -1.5], f / 72), target: [0, 0.8, -1.69], fov: 46 };
  return gate(cam, [], { passes: 1, stamp: Easing.out(Easing.cubic)(ramp(f, 30, 40)) }, { truth: 0.6 })(f);
};

const FreshMilk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.4, 2.6], [0.1, 1.3, 1.4], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 60))), target: [0, 1.2, -1.4], fov: 40 };
  return <Stage bg={moodBackground("golden")} camera={cam} set={<FridgeSet camera={cam} open={Easing.out(Easing.back(1.3))(ramp(f, 4, 22))} expired={false} />} />;
};

const Expired: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.3, 0.15], [0.08, 1.28, -0.05], f / 59), target: [0, 1.2, -1.3], fov: 38 };
  return <Stage bg={moodBackground("golden")} camera={cam} set={<FridgeSet camera={cam} open={1} expired={f >= 26} appear={f - 26} />} />;
};

const NoShow: React.FC = () => {
  const f = useShotFrame();
  return bedroom(close(0, -0.4, (f + 8) / 72, -0.25), f, "9:40", { expression: "neutral", blink: true, headTilt: -10 + Math.sin(f / 9) * 3, mouthOpen: 0.2 + 0.15 * Math.sin(f / 5) }, { morning: true });
};

const office = (camera: CameraShot, f: number, screen: string, analyst: PuppetPose, extra: { press?: number; tickets?: number; dots?: number; reveal?: Reveal } = {}, grade: { blur?: number } = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={[pup("analyst", ANALYST, ANALYST_AT, analyst)]} {...grade} set={<OfficeSet camera={camera} f={f} screen={screen} {...extra} />} />
);

const Tracking: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.6, 4.4], [0.4, 1.55, 4.0], (f + 8) / 48), target: [-0.3, 1.2, -1.2], fov: 42 };
  return office(cam, f, "NO-SHOWS\nBY ROUTE", { expression: "smug", armL: [70 + Math.sin(f / 3) * 8, -40], lookX: -1, bob: breathe(f) });
};

const BoardClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.7, 1.7, -1.0], [-1.85, 1.66, -1.4], f / 37), target: [-1.9, 1.62, -2.9], fov: 44 };
  return office(cam, f, "NO-SHOWS\nBY ROUTE", { expression: "smug" });
};

const Range: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 2.0, 0.9], [0.2, 2.0, 0.6], f / 45), target: [0.2, 2.0, -2.9], fov: 40 };
  return office(cam, f, "NO-SHOWS\n5-15%", { expression: "smug" }, { reveal: { appear: f - 4, count: ramp(f, 4, 30) } });
};

const Pointing: React.FC = () => {
  const f = useShotFrame();
  return office(medium(0, -1.15, f / 47, -0.6), f, "NO-SHOWS\n5-15%", { expression: "smug", armL: [120, 10], lookX: -1, bob: breathe(f) });
};

const Seats160: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 2.0, 0.9], [0.2, 2.0, 0.55], f / 56), target: [0.2, 2.0, -2.9], fov: 40 };
  const reveal = f < 40 ? { appear: f - 2, count: ramp(f, 2, 26) } : { appear: f - 40 };
  return office(cam, f, f < 40 ? "160 SEATS" : "SELL 176?", { expression: "smug" }, { reveal });
};

// Gag: SELL +16 slammed, a fountain of tickets.
const SellButton: React.FC = () => {
  const f = useShotFrame();
  const press = f < 8 ? ramp(f, 2, 8) : 1 - ramp(f, 12, 18);
  const cam: CameraShot = { position: lerp3([0.6, 1.35, 1.9], [0.5, 1.3, 1.7], f / 47), target: [-0.25, 1.0, -0.6], fov: 46 };
  return office(cam, f, "SELL 176", { expression: f < 8 ? "smug" : "excited", armR: [interpolate(press, [0, 1], [60, 20]), -60], armL: [20, -40] }, { press, tickets: ramp(f, 8, 47) });
};

const cabinCrowd = (f: number): PuppetPlacement[] =>
  CABIN_SEATS.map(([x, z], i) => pup(`p${i}`, i % 6 === 2 ? YOU : EXTRAS[i % EXTRAS.length], [x, z + 0.22], { sit: true, expression: i % 3 ? "neutral" : "smug", lookX: x < 0 ? 0.6 : -0.6, blink: (f + i * 7) % 60 < 3, bob: breathe(f + i * 4) * 0.5 }));

const FullCabin: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.75, 3.9], [0, 1.7, 3.5], (f + 8) / 54), target: [0, 0.85, -0.8], fov: 44 };
  return <Stage bg={moodBackground("office")} camera={cam} puppets={cabinCrowd(f)} set={<CabinSet camera={cam} />} />;
};

const CabinMath: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.65, 4.3], [0.02, 1.68, 4.0], f / 47), target: [0, 1.6, 1.2], fov: 40 };
  return <Stage bg={moodBackground("office")} camera={cam} puppets={cabinCrowd(f)} set={<CabinSet camera={cam} sign={"176 SOLD\n16 NO-SHOWS\n160 FULL"} reveal={{ appear: f - 4, count: ramp(f, 4, 34) }} />} />;
};

const EveryoneShows: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 3.4, 3.2], [0, 3.2, 2.9], f / 49), target: [0, 0.6, -0.4], fov: 46 };
  const crowd = [-1.3, -0.7, -0.1, 0.5, 1.1, 1.7].flatMap((x, i) => [
    pup(`c${i}`, i === 2 ? YOU : EXTRAS[i % EXTRAS.length], [x, -0.6 + (i % 2) * 0.35], { expression: i % 2 ? "shocked" : "skeptical", lookX: 0, hold: i === 2 ? COFFEE : undefined, armR: i === 2 ? HOLD : undefined, bob: breathe(f + i * 5) }),
  ]);
  return gate(cam, [...crowd, pup("stranger", STRANGER, [-1.9, -0.3], { expression: "smug", bob: breathe(f) })], { screen: "FLIGHT 214\nOVERSOLD" })(f);
};

const desk = (camera: CameraShot, f: number, puppets: PuppetPlacement[]) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<DeskSet camera={camera} f={f} />} />
);
const DESK_AGENT: [number, number] = [0, -2.05];

const Vouchers: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.4, 3.4], [-0.2, 1.35, 3.0], (f + 8) / 59), target: [0, 1.25, -1.8], fov: 40 };
  return desk(cam, f, [pup("agent", AGENT, DESK_AGENT, { expression: "smug", hold: PHONE_R, armR: [60 + Math.sin(f / 4) * 10, -40], bob: breathe(f) })]);
};

const VoucherWall: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.7, 1.6, 0.9], [-1.9, 1.62, 0.5], f / 59), target: [-2.1, 1.75, -2.92], fov: 40 };
  return desk(cam, f, []);
};

const NobodyBites: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 1.15, 3.2], [0.4, 1.12, 2.9], f / 46), target: [0, 0.95, -0.6], fov: 42 };
  return desk(cam, f, [
    pup("agent", AGENT, DESK_AGENT, { expression: "neutral", hold: PHONE_R, armR: [60, -40] }),
    ...[-1.0, -0.3, 0.4, 1.1].map((x, i) => pup(`n${i}`, EXTRAS[(i + 1) % EXTRAS.length], [x, 0.1], { view: i === 1 ? "back" : "front", expression: "skeptical", lookX: x < 0 ? 1 : -1, ...ARMS_CROSSED, bob: breathe(f + i * 6) })),
  ]);
};

const Bumped: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.95, -1.42], [0, 1.8, -1.5], f / 40), target: [0, 0.8, -1.69], fov: 46 };
  return gate(cam, [], { passes: 1, stamp: Easing.out(Easing.cubic)(ramp(f, 4, 14)) }, { truth: 0.3 })(f);
};

const FourTimes: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.5, 1.2, 0.9], [1.7, 1.25, 0.5], f / 47), target: [2.1, 1.75, -2.92], fov: 40 };
  return desk(cam, f, []);
};

const Rare: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.2, 1.7, 1.6], [1.6, 1.75, 0.4], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 66))), target: [2.0, 1.75, -2.9], fov: 40 };
  return office(cam, f, "DENIED\nBOARDING", { expression: "neutral" }, { dots: 9 });
};

const NineDots: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([2.0, 1.75, -1.9], [2.0, 1.75, -2.25], f / 60), target: [2.0, 1.75, -2.9], fov: 40 };
  return office(cam, f, "DENIED\nBOARDING", { expression: "neutral" }, { dots: 9 });
};

const ItWasYou: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 0.45, 3.1], [-0.2, 0.42, 2.9], (f + 8) / 54), target: [-0.1, 1.1, 1.15], fov: 44 };
  return gate(cam, [pup("you", YOU, [-0.1, 1.15], { expression: "skeptical", hold: PHONE_R, armR: HOLD, lookX: 0.4, blink: f > 26 && f < 29 })], { screen: "FLIGHT 214\nBOARDING" }, { truth: 0.5 })(f);
};

const TakeVoucher: React.FC = () => {
  const f = useShotFrame();
  return gate(medium(0.1, 1.15, f / 39, -0.5), [
    pup("you", YOU, [-0.2, 1.15], { expression: "smug", hold: PHONE_R, armR: [40, -60], lookX: -0.5, bob: breathe(f) }),
    pup("agent", AGENT, [0.55, 1.0], { expression: "smug", armL: [60, -20], lookX: -1, bob: breathe(f + 4) }),
  ], { screen: "FLIGHT 214\nBOARDING" })(f);
};

const Takeoff: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 0.5, 2.6], [-0.3, 0.55, 2.3], (f + 8) / 62), target: [0.8, 1.0, -1.5], fov: 52 };
  return <Stage bg={moodBackground("night")} camera={cam} set={<RunwaySet camera={cam} t={ramp(f + 8, 0, 62)} />} />;
};

const WakeUp: React.FC = () => {
  const f = useShotFrame();
  const stretch = ramp(f, 4, 14);
  return bedroom(medium(0.2, -0.4, (f + 8) / 44, -0.4), f, "11:15", { expression: f < 10 ? "neutral" : "excited", blink: f < 6, armL: [stretch * 150, -20], armR: [stretch * 150, -20], bob: breathe(f) }, { morning: true });
};

const Booked: React.FC = () => {
  const f = useShotFrame();
  return bedroom(close(0, -0.4, f / 42, 0.2), f, "11:15", { expression: "smug", hold: PHONE_R, armR: HOLD, lookX: 0.6, bob: breathe(f) }, { morning: true });
};

const LoopPasses: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.95, -1.42], [0, 1.8, -1.5], f / 52), target: [0, 0.8, -1.69], fov: 46 };
  return gate(cam, [], { passes: 1 })(f);
};

const SHOTS: Shot[] = [
  [0, 40, TwoPasses, false],
  [40, 88, Standoff, false],
  [88, 128, Snoring, true],
  [128, 174, Snooze, false],
  [174, 214, RaceIn, true],
  [214, 261, FeelSafe, false],
  [261, 305, Announcement, true],
  [305, 359, NobodyMoves, false],
  [359, 395, YourName, false],
  [395, 446, CoffeeSpill, false],
  [446, 492, NothingWrong, false],
  [492, 564, SoldTwice, false],
  [564, 616, FreshMilk, true],
  [616, 675, Expired, false],
  [675, 750, NoShow, true],
  [750, 790, Tracking, true],
  [790, 827, BoardClose, false],
  [827, 872, Range, false],
  [872, 919, Pointing, false],
  [919, 975, Seats160, false],
  [975, 1022, SellButton, false],
  [1022, 1068, FullCabin, true],
  [1068, 1115, CabinMath, false],
  [1115, 1164, EveryoneShows, true],
  [1164, 1215, Vouchers, true],
  [1215, 1274, VoucherWall, false],
  [1274, 1320, NobodyBites, false],
  [1320, 1360, Bumped, true],
  [1360, 1407, FourTimes, true],
  [1407, 1465, Rare, true],
  [1465, 1525, NineDots, false],
  [1525, 1571, ItWasYou, true],
  [1571, 1610, TakeVoucher, false],
  [1610, 1664, Takeoff, true],
  [1664, 1700, WakeUp, true],
  [1700, 1742, Booked, false],
  [1742, TIMING.totalFrames, LoopPasses, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.14, until: 88 },
  { at: 2, src: sfx("paper"), volume: 0.4 },
  { at: 88, src: sfx("hum"), volume: 0.08, until: 174 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 92 + k * 8, src: sfx("credit-blip"), volume: 0.35 })),
  { at: 137, src: sfx("button"), volume: 0.9 },
  { at: 138, src: sfx("reel-stop"), volume: 0.6 },
  { at: 160, src: sfx("boom"), volume: 0.3 },
  { at: 174, src: sfx("whoosh"), volume: 0.4 },
  { at: 174, src: sfx("ambience"), volume: 0.14, until: 261 },
  { at: 222, src: sfx("chime"), volume: 0.25 },
  { at: 255, src: sfx("chime"), volume: 0.4 },
  { at: 261, src: sfx("ambience"), volume: 0.14, until: 446 },
  // The twist: a riser through "Nobody moves", a sting on "name".
  { at: 375, src: sfx("riser"), volume: 0.25 },
  { at: 399, src: sfx("near-miss"), volume: 0.4 },
  { at: 423, src: sfx("sting"), volume: 0.4 },
  { at: 403, src: sfx("paper"), volume: 0.3 },
  { at: 446, src: sfx("hum"), volume: 0.1, until: 564 },
  { at: 524, src: sfx("stamp"), volume: 0.8 },
  { at: 570, src: sfx("whoosh"), volume: 0.35 },
  { at: 642, src: sfx("stamp"), volume: 0.6 },
  { at: 675, src: sfx("hum"), volume: 0.08, until: 750 },
  { at: 750, src: sfx("hum"), volume: 0.15, until: 1022 },
  ...Array.from({ length: 6 }, (_, k) => ({ at: 790 + k * 6, src: sfx("tick"), volume: 0.4 })),
  { at: 831, src: sfx("pop"), volume: 0.5 },
  { at: 921, src: sfx("pop"), volume: 0.5 },
  { at: 959, src: sfx("credit-blip"), volume: 0.4 },
  { at: 959, src: sfx("pop"), volume: 0.45 },
  { at: 979, src: sfx("button"), volume: 0.9 },
  ...Array.from({ length: 16 }, (_, k) => ({ at: 983 + k * 2.5, src: sfx("tick"), volume: 0.45 })),
  { at: 1068, src: sfx("chime"), volume: 0.35 },
  { at: 1072, src: sfx("pop"), volume: 0.5 },
  { at: 1115, src: sfx("ambience"), volume: 0.2, until: 1164 },
  { at: 1164, src: sfx("hum"), volume: 0.1, until: 1407 },
  { at: 1222, src: sfx("chime"), volume: 0.3 },
  { at: 1326, src: sfx("stamp"), volume: 0.8 },
  { at: 1410, src: sfx("hum"), volume: 0.12, until: 1525 },
  { at: 1475, src: sfx("tick"), volume: 0.6 },
  { at: 1525, src: sfx("near-miss"), volume: 0.3 },
  { at: 1584, src: sfx("card"), volume: 0.45 },
  { at: 1610, src: sfx("whoosh"), volume: 0.7 },
  { at: 1630, src: sfx("boom"), volume: 0.3 },
  { at: 1700, src: sfx("credit-blip"), volume: 0.4 },
  { at: 1742, src: sfx("paper"), volume: 0.4 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 359, volume: 0.2 },
  { src: MUSIC_FILES.mystery, from: 359, to: 750, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 750, to: 1525, volume: 0.3 },
  { src: MUSIC_FILES.lounge, from: 1525, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
