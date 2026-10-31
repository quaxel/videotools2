import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  Label,
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
  Shot,
  speaking,
  Stage,
  stroll,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Video,
  walk,
} from "../../engine";
import { Carousel, ComplaintBox, Corridor, MapBoard, MirrorElevators } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Airports Make You Walk Farther" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "airport-walk";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#ff9f1c" };
const MANAGER: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#1d3557", glasses: true, long: true, lanyard: "#ffd23f" };
const HANDLER: PuppetLook = { skin: "#fbe9d6", hair: "#1d1a1a", outfit: "#ffd23f", cap: "#2c3a40" };
const COMPLAINER: PuppetLook = { skin: "#fffaf2", hair: "#9aa0a6", outfit: "#d62828", glasses: true };
const EXPERT: PuppetLook = { skin: "#fff3e6", hair: "#9aa0a6", outfit: "#f7f7f2", glasses: true, lanyard: "#3fae5a" };
const GUEST: PuppetLook = { skin: "#fbe9d6", hair: "#c0392b", outfit: "#ffd23f", long: true };
const EXTRAS: PuppetLook[] = [
  { skin: "#fbe9d6", hair: "#4a2c1a", outfit: "#2a9d8f" },
  { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#9b5de5", long: true },
  { skin: "#fff3e6", hair: "#7a2e1a", outfit: "#4f7dff", cap: "#264653" },
  { skin: "#fffaf2", hair: "#2b1d14", outfit: "#3fae5a", long: true },
];

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const you = (at: [number, number], pose: PuppetPose) => pup("you", YOU, at, pose);

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

const DOOR_Z = -2.2;
const HallSet: React.FC<{ camera: CameraShot; door?: number }> = ({ camera, door = 0 }) => (
  <Room camera={camera} mood="daylight" floor="#c9ced3" wall="#2a9d8f" width={3} depth={50} wallPattern="panel" floorPattern="tile">
    <Corridor z0={4} length={28} doorZ={DOOR_Z} door={door} />
  </Room>
);

const BELT_AT: [number, number, number] = [0, 0, -1.3];
const ClaimSet: React.FC<{ camera: CameraShot; f: number; busy?: boolean; speed?: number; bonk?: number; wait?: number }> = ({ camera, f, busy = false, speed = 0.02, bonk, wait }) => (
  <Room camera={camera} mood={busy ? "neon" : "golden"} floor={busy ? "#3d2a55" : "#7a5a2a"} wall={busy ? "#ff4fa3" : "#f2b630"} stripe="#ffffff" width={8} depth={5} wallPattern={busy ? "brick" : "tile"} floorPattern="tile">
    <Label text={busy ? "BELT 9" : "BAGGAGE CLAIM"} position={[0, 2.4, -2.43]} width={busy ? 0.8 : 1.6} fg="#ffffff" bg="#1d4fa8" />
    <Carousel position={BELT_AT} t={f * speed} bonk={bonk} />
    {wait !== undefined && <Screen position={[0.95, 1.95, -2.4]} size={[0.8, 0.42]} text={"AVG WAIT\n8 MIN"} glow="#ffd23f" bg="#140a02" appear={wait} count={ramp(wait, 0, 20)} />}
  </Room>
);

const MAP_AT: [number, number, number] = [0, 1.85, -2.4];
const ControlSet: React.FC<{ camera: CameraShot; drag: number; route?: number }> = ({ camera, drag, route }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.6, color: "#8fb3ff", bars: 8 }}>
    <MapBoard position={MAP_AT} drag={drag} route={route} />
    <Label text="CONTROL ROOM" position={[1.6, 2.45, -2.43]} width={1.0} fg="#ffffff" bg="#161212" />
  </Room>
);

const BOX_AT: [number, number, number] = [-0.45, 0, -1.4];
const OfficeSet: React.FC<{ camera: CameraShot; f: number; burst?: number; count?: number; countAt?: number }> = ({ camera, f, burst, count, countAt }) => (
  <Room camera={camera} mood="warm" floor="#8a5a3a" wall="#e8833a" stripe="#ffd23f" width={7} depth={5} wallPattern="plaster" floorPattern="wood" sun={{ x: -1.6, color: "#ffe6a8", bars: 4 }}>
    <ComplaintBox position={BOX_AT} burst={burst} />
    {count !== undefined && <Screen position={[0.65, 2.0, -2.4]} size={[0.9, 0.42]} text={`COMPLAINTS\n${count}`} glow="#ff5a4a" bg="#140404" appear={countAt === undefined ? undefined : f - countAt} />}
    <Plant position={[2.0, 0, -2.0]} />
  </Room>
);

const TimingSet: React.FC<{ camera: CameraShot; f: number; walkAt?: number; waitAt?: number; times?: number; stopwatch?: boolean }> = ({ camera, f, walkAt, waitAt, times, stopwatch }) => (
  <Room camera={camera} mood="night" floor="#1c2433" wall="#1b2a5e" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    {stopwatch && <Screen position={[0, 1.8, -2.4]} size={[1.0, 0.5]} text={`STOPWATCH\n0:0${Math.floor(f / 4) % 10}`} glow="#ffd23f" bg="#140a02" />}
    {walkAt !== undefined && <Screen position={[0, 2.3, -2.4]} size={[1.0, 0.46]} text={"WALK\n1 MIN"} glow="#4dff9a" bg="#06140c" appear={f - walkAt} />}
    {waitAt !== undefined && <Screen position={[0, 1.8, -2.4]} size={[1.0, 0.42]} text={"WAIT\n7 MIN"} glow="#ff5a4a" bg="#140404" appear={f - waitAt} count={ramp(f, waitAt, waitAt + 18)} />}
    {times !== undefined && <Screen position={[0, 1.75, -2.4]} size={[1.1, 0.6]} text={"WALK\nx6"} glow="#4dff9a" bg="#06140c" appear={f - times} />}
  </Room>
);

const LabSet: React.FC<{ camera: CameraShot; f: number; yearAt?: number; ruleAt?: number }> = ({ camera, f, yearAt = -99, ruleAt }) => (
  <Room camera={camera} mood="office" floor="#d8e0ea" wall="#3fae5a" stripe="#ffffff" width={7} depth={5} wallPattern="wallpaper" floorPattern="wood">
    <Label text="1985" position={[-0.85, 2.3, -2.42]} width={0.7} fg="#14301c" bg="#ffd23f" appear={f - yearAt} />
    {ruleAt !== undefined && <Label text={"BUSY TIME\nFEELS SHORTER"} position={[0.25, 1.75, -2.42]} width={1.1} bg="#fffdf4" appear={f - ruleAt} />}
  </Room>
);

const HotelSet: React.FC<{ camera: CameraShot; open?: number }> = ({ camera, open = 0 }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" stripe="#ffd23f" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <MirrorElevators position={[0, 0, -2.42]} open={open} />
    <Label text="HOTEL" position={[0, 2.55, -2.43]} width={0.8} fg="#2b0d45" bg="#ffd23f" />
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const hall = (camera: CameraShot, puppets: PuppetPlacement[], door = 0) => <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<HallSet camera={camera} door={door} />} />;
const claim = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { busy?: boolean; speed?: number; bonk?: number; wait?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(extra.busy ? "neon" : "golden")} camera={camera} puppets={puppets} {...grade} set={<ClaimSet camera={camera} f={f} {...extra} />} />
);
const control = (camera: CameraShot, puppets: PuppetPlacement[], drag: number, route?: number, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<ControlSet camera={camera} drag={drag} route={route} />} />
);
const office = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { burst?: number; count?: number; countAt?: number } = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} set={<OfficeSet camera={camera} f={f} {...extra} />} />
);
const timer = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { walkAt?: number; waitAt?: number; times?: number; stopwatch?: boolean }) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<TimingSet camera={camera} f={f} {...extra} />} />
);
const lab = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { yearAt?: number; ruleAt?: number }) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<LabSet camera={camera} f={f} {...extra} />} />
);
const hotel = (camera: CameraShot, puppets: PuppetPlacement[], open = 0) => <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<HotelSet camera={camera} open={open} />} />;

// Walking toward the camera down the corridor.
const walker = (f: number, z: number, look = YOU, id = "you", speed = 1, pose: Partial<PuppetPose> = {}): PuppetPlacement =>
  pup(id, look, [0.0, z], { view: "front", expression: "neutral", ...walk(f * speed), ...pose });

const YOU_CLAIM: [number, number] = [-0.6, 0.0];
const MANAGER_AT: [number, number] = [0.55, -1.7];

// ---------- shots ----------

// Hook, low angle: you trudge toward the camera; the corridor runs on forever, the STAFF ONLY door on the right (the seed).
const Hook: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 47], [-3.2, -1.6]);
  const cam: CameraShot = { position: lerp3([0.35, 0.45, 1.2], [0.3, 0.5, 0.95], f / 47), target: [0, 1.3, -4.0], fov: 52 };
  return hall(cam, [walker(f, z, YOU, "you", 1, { expression: "skeptical" })]);
};

// High and wide: the hallway just keeps going.
const Endless: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 61], [-5.5, -4.2]);
  const cam: CameraShot = { position: lerp3([0.2, 2.4, 1.5], [0.15, 2.45, 2.4], f / 61), target: [0, 0.8, -9], fov: 46 };
  return hall(cam, [walker(f, z, YOU, "you", 1, { expression: "skeptical", headTilt: -6 })]);
};

const Arrive: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [-2.0, 0.0], YOU_CLAIM);
  const cam: CameraShot = { position: lerp3([-0.5, 1.4, 2.6], [-0.4, 1.35, 2.25], (f + 8) / 50), target: [-0.2, 0.85, -1.0], fov: 46 };
  return claim(cam, f, [you(w.at, { expression: "neutral", lookX: 0.6, ...w.pose })]);
};

// Top-down macro: your suitcase rides round the bend.
const CaseMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.75, 2.5, -0.95], [-0.75, 2.2, -0.97], f / 65), target: [-0.75, 0.4, -1.2], fov: 46 };
  return claim(cam, f, [], { speed: 0.025 });
};

const Lucky: React.FC = () => {
  const f = useShotFrame();
  return claim(close(YOU_CLAIM[0], YOU_CLAIM[1], f / 54, -0.25), f, [you(YOU_CLAIM, { expression: "smug", armR: [150, -60], headTilt: 8, blink: f > 24 && f < 28 })], {}, { blur: 7 });
};

// Twist: the staff door in the corridor swings open.
const DoorOpens: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.9, 1.5, DOOR_Z + 1.4], [-0.6, 1.45, DOOR_Z + 0.7], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 68))), target: [1.34, 1.45, DOOR_Z], fov: 46 };
  return hall(cam, [], Easing.out(Easing.back(1.4))(ramp(f, 6, 20)));
};

const Manager: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.4, 1.9], [0.15, 1.38, 1.6], (f + 8) / 46), target: [0.15, 1.35, -2.0], fov: 46 };
  return control(cam, [pup("manager", MANAGER, MANAGER_AT, { expression: "smug", armL: [150, -40], lookX: -0.8, bob: breathe(f) })], ramp(f, 4, 38) * 0.4);
};

// Over the manager's shoulder: she drags your gate to the far end of the map.
const Drag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.75, 1.4, 0.35], [0.72, 1.38, 0.15], f / 49), target: [0.0, 1.55, -2.4], fov: 42 };
  return control(cam, [pup("manager", MANAGER, [0.45, -1.5], { view: "back", expression: "smug", armL: [140, -10] })], 0.4 + Easing.inOut(Easing.cubic)(ramp(f, 0, 36)) * 0.6, 1);
};

const KeepWalking: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "manager", useFinalFrame());
  return control(close(MANAGER_AT[0], MANAGER_AT[1], f / 39, -0.25), [pup("manager", MANAGER, MANAGER_AT, { expression: "smug", headTilt: 6, lookX: 0.4, mouthOpen: talking ? talk(f) : 0 })], 1, 1, { blur: 7 });
};

// Low angle on the manager in front of the map.
const NeverComplain: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "manager", useFinalFrame());
  const cam: CameraShot = { position: lerp3([0.4, 0.45, -0.25], [0.38, 0.48, -0.4], f / 39), target: [0.5, 1.1, -1.7], fov: 50 };
  return control(cam, [pup("manager", MANAGER, MANAGER_AT, { expression: "smug", armR: [80, -30], mouthOpen: talking ? talk(f) : 0 })], 1, 1);
};

const COMPLAINER_AT: [number, number] = [0.35, -0.9];
const Complaints: React.FC = () => {
  const f = useShotFrame();
  return office(medium(-0.05, -1.1, (f + 8) / 53, -0.35), f, [pup("complainer", COMPLAINER, COMPLAINER_AT, { expression: "skeptical", armR: [150 + Math.sin(f / 2) * 15, -30], lookX: -0.8, bob: breathe(f) })]);
};

// Gag: the box bursts and letters rain on the complainer.
const Burst: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 8;
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.5], [-0.15, 1.38, 1.25], f / 53), target: [-0.1, 1.15, -1.3], fov: 46 };
  return office(cam, f, [pup("complainer", COMPLAINER, COMPLAINER_AT, { expression: hit ? "shocked" : "skeptical", armL: hit ? [150, -20] : [10, 0], armR: hit ? [150, -20] : [150, -30], bob: hit && f < 14 ? -10 : 0 })], { burst: f - 6 });
};

// High angle: more baggage handlers at the carousel.
const Handlers: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 2.5, 2.4], [0.05, 2.4, 2.1], f / 49), target: [0, 0.6, -0.8], fov: 50 };
  return claim(cam, f, [0, 1, 2].map((i) => pup(`h${i}`, HANDLER, [-0.8 + i * 0.8, 0.15], { expression: "excited", armL: [40, -60], armR: [40, -60], ...walk(f + i * 7) })), { speed: 0.04 });
};

const WaitScreen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.7, 1.75, 0.4], [0.75, 1.8, 0.1], f / 36), target: [0.95, 1.95, -2.4], fov: 42 };
  return claim(cam, f, [], { wait: f - 4 });
};

const StillComplaining: React.FC = () => {
  const f = useShotFrame();
  return office(close(COMPLAINER_AT[0], COMPLAINER_AT[1], f / 40, -0.25), f, [pup("complainer", COMPLAINER, COMPLAINER_AT, { expression: "skeptical", armR: [150 + Math.sin(f / 2) * 15, -30], headTilt: -8, mouthOpen: talk(f) * 0.6 })], { burst: 40 });
};

const Timed: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.4, 2.1], [0.0, 1.45, 1.2], Easing.inOut(Easing.quad)((f + 8) / 47)), target: [0.0, 1.4, -2.0], fov: 46 };
  return timer(cam, f, [pup("manager", MANAGER, [-0.4, -1.3], { expression: "neutral", armR: [80, -60], lookX: 0.8, bob: breathe(f) })], { stopwatch: true });
};

const WalkMin: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.25, 2.05, 0.4], [0.1, 2.05, -0.35], Easing.inOut(Easing.quad)(f / 42)), target: [0, 2.05, -2.4], fov: 42 };
  return timer(cam, f, [], { walkAt: 2 });
};

const WaitMin: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.95, 0.1], [-0.1, 1.95, -0.6], Easing.inOut(Easing.quad)(f / 47)), target: [0, 1.95, -2.4], fov: 42 };
  return timer(cam, f, [], { walkAt: 99, waitAt: 2 });
};

// The bored crowd stands at the belt.
const crowd = (f: number): PuppetPlacement[] =>
  EXTRAS.map((look, i) => pup(`x${i}`, look, [-1.2 + i * 0.75, 0.0 + (i % 2) * 0.25], { expression: "skeptical", blink: (f + i * 11) % 40 < 4, headTilt: Math.sin(f / 12 + i) * 6, bob: breathe(f + i * 5) * 0.5 }));

const Bored: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.45, 2.8], [0.25, 1.42, 2.45], (f + 8) / 46), target: [0, 0.9, -1.0], fov: 46 };
  return claim(cam, f, crowd(f), { busy: true, speed: 0.01 });
};

// Gag: a suitcase slides off the belt and bonks a waiting passenger.
const Bonk: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 12;
  const cam: CameraShot = { position: lerp3([-1.0, 1.15, 1.6], [-0.95, 1.12, 1.4], f / 31), target: [-0.7, 0.8, -0.6], fov: 44 };
  const people = crowd(f);
  people[0] = { ...people[0], pose: { ...people[0].pose, expression: hit ? "shocked" : "skeptical", armL: hit ? [150, -20] : undefined, bob: hit && f < 18 ? -12 : 0 } };
  return claim(cam, f, people, { busy: true, speed: 0.01, bonk: f });
};

const MovedMap: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.85, 1.1], [0.35, 1.85, 0.6], Easing.inOut(Easing.quad)((f + 8) / 60)), target: [0.1, 1.85, -2.4], fov: 42 };
  return control(cam, [], 1, ramp(f, 4, 30));
};

// The long walk: passengers stream down the corridor toward the camera.
const LongWalk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.5, 1.2], [-0.55, 1.48, 0.6], f / 55), target: [0.1, 1.0, -6], fov: 46 };
  return hall(cam, [
    walker(f, interpolate(f, [0, 55], [-3.4, -2.4]), YOU, "you", 1, { expression: "smug" }),
    ...EXTRAS.slice(0, 3).map((look, i) => pup(`x${i}`, look, [(i - 1) * 0.6, -5 - i * 1.4 + f * 0.02], { view: "front", expression: "smug", ...walk(f + i * 4) })),
  ]);
};

const TimesSix: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.75, 0.6], [0.0, 1.75, 0.3], (f + 8) / 51), target: [0, 1.75, -2.4], fov: 42 };
  return timer(cam, f, [], { times: 4 });
};

const ZeroComplaints: React.FC = () => {
  const f = useShotFrame();
  const n = Math.max(0, Math.round(interpolate(f, [4, 40], [480, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })));
  const cam: CameraShot = { position: lerp3([0.1, 1.5, 1.6], [0.15, 1.55, 1.25], (f + 8) / 64), target: [0.2, 1.45, -2.2], fov: 50 };
  return office(cam, f, [pup("complainer", COMPLAINER, [-0.15, -1.1], { expression: f > 40 ? "smug" : "neutral", lookX: 0.8, bob: breathe(f) })], { count: n, countAt: 2 });
};

const EXPERT_AT: [number, number] = [-0.55, -1.5];
const Expert: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.45, 2.2], [-0.1, 1.42, 1.3], Easing.inOut(Easing.quad)((f + 8) / 72)), target: [-0.2, 1.3, -2.0], fov: 46 };
  return lab(cam, f, [pup("expert", EXPERT, EXPERT_AT, { expression: "neutral", armR: [40 + Math.abs(Math.sin(f / 4)) * 20, -70], lookX: 0.6, bob: breathe(f) })], { yearAt: 16 });
};

const Rule: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.75, 0.95], [0.25, 1.75, 0.6], f / 90), target: [0.25, 1.75, -2.4], fov: 42 };
  return lab(cam, f, [], { ruleAt: 31 });
};

const GUEST_AT: [number, number] = [-0.85, -1.85];
const Hotel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.45, 2.6], [-0.2, 1.42, 2.2], (f + 8) / 59), target: [-0.3, 1.15, -2.2], fov: 48 };
  return hotel(cam, [pup("guest", GUEST, GUEST_AT, { expression: "neutral", lookX: 0.6, bob: breathe(f) })]);
};

const Mirror: React.FC = () => {
  const f = useShotFrame();
  const fix = Math.sin(f / 3);
  return hotel(close(GUEST_AT[0], GUEST_AT[1], f / 45, 0.25), [pup("guest", GUEST, GUEST_AT, { view: "front", expression: "smug", armL: [150 + fix * 10, -70], armR: [140 - fix * 10, -70], headTilt: fix * 8 })], 0);
};

// Gag: she primps so long the elevator doors open and close again behind her.
const DoorsMissed: React.FC = () => {
  const f = useShotFrame();
  const open = ramp(f, 0, 10) - ramp(f, 34, 46);
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.7], [-0.15, 1.38, 1.45], f / 77), target: [-0.4, 1.1, -2.2], fov: 46 };
  const turned = f >= 48;
  return hotel(cam, [pup("guest", GUEST, GUEST_AT, { expression: turned ? "shocked" : "smug", armL: turned ? [10, 0] : [150, -70], armR: turned ? [10, 0] : [140, -70], lookX: turned ? 1 : 0 })], open);
};

// Low angle on your walking feet: the wait is hidden in your legs.
const Legs: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 42], [-2.6, -1.4]);
  const cam: CameraShot = { position: lerp3([0.25, 0.3, 0.6], [0.22, 0.32, 0.5], (f + 8) / 50), target: [0, 0.5, -3.0], fov: 50 };
  return hall(cam, [walker(f, z, YOU, "you", 1.3, { expression: "smug" })]);
};

const Hidden: React.FC = () => {
  const f = useShotFrame();
  return claim(medium(YOU_CLAIM[0] + 0.3, YOU_CLAIM[1], f / 47, -0.3), f, [you(YOU_CLAIM, { expression: "smug", lookX: 0.6, bob: breathe(f) })], { speed: 0.02 });
};

const NextTrip: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.5, 1.8], [0.0, 1.5, 1.4], (f + 8) / 63), target: [0, 1.2, -6], fov: 44 };
  return hall(cam, [pup("you", YOU, [0, interpolate(f, [0, 55], [-1.6, -2.8])], { view: "back", expression: "smug", ...walk(f) })]);
};

const Smile: React.FC = () => {
  const f = useShotFrame();
  const z = interpolate(f, [0, 93], [-3.4, -1.8]);
  const cam: CameraShot = { position: lerp3([0.3, 1.15, 0.2], [0.25, 1.2, 1.4], Easing.inOut(Easing.quad)(f / 93)), target: [0, 0.95, -4.0], fov: 46 };
  return hall(cam, [walker(f, z, YOU, "you", 1, { expression: "smug", blink: f > 50 && f < 54 })]);
};

const SHOTS: Shot[] = [
  [0, 47, Hook, false],
  [47, 108, Endless, false],
  [108, 150, Arrive, true],
  [150, 215, CaseMacro, false],
  [215, 269, Lucky, false],
  [269, 329, DoorOpens, true],
  [329, 367, Manager, true],
  [367, 416, Drag, false],
  [416, 455, KeepWalking, false],
  [455, 494, NeverComplain, false],
  [494, 539, Complaints, true],
  [539, 592, Burst, false],
  [592, 641, Handlers, true],
  [641, 677, WaitScreen, false],
  [677, 717, StillComplaining, true],
  [717, 756, Timed, true],
  [756, 798, WalkMin, false],
  [798, 845, WaitMin, false],
  [845, 883, Bored, true],
  [883, 914, Bonk, false],
  [914, 966, MovedMap, true],
  [966, 1047, LongWalk, true],
  [1047, 1090, TimesSix, true],
  [1090, 1175, ZeroComplaints, true],
  [1175, 1239, Expert, true],
  [1239, 1329, Rule, false],
  [1329, 1380, Hotel, true],
  [1380, 1425, Mirror, false],
  [1425, 1502, DoorsMissed, false],
  [1502, 1544, Legs, true],
  [1544, 1591, Hidden, true],
  [1591, 1646, NextTrip, true],
  [1646, TIMING.totalFrames, Smile, false],
];

// ---------- sound ----------

const steps = (from: number, to: number, every = 10, volume = 0.22): Sfx[] =>
  Array.from({ length: Math.floor((to - from) / every) }, (_, k) => ({ at: from + k * every, src: sfx("tick"), volume }));

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.16, until: 108 },
  ...steps(0, 108),
  { at: 108, src: sfx("hum"), volume: 0.12, until: 269 },
  { at: 108, src: sfx("reel-spin"), volume: 0.12, until: 269 },
  { at: 230, src: sfx("chime"), volume: 0.35 },
  // The twist: a riser up to the door, the sting as it swings open.
  { at: 250, src: sfx("riser"), volume: 0.22 },
  { at: 277, src: sfx("door"), volume: 0.55 },
  { at: 285, src: sfx("sting"), volume: 0.4 },
  { at: 329, src: sfx("hum"), volume: 0.15, until: 494 },
  { at: 367, src: sfx("whoosh"), volume: 0.35 },
  { at: 403, src: sfx("button"), volume: 0.5 },
  { at: 494, src: sfx("ambience"), volume: 0.12, until: 592 },
  { at: 500, src: sfx("paper"), volume: 0.3 },
  { at: 545, src: sfx("boom"), volume: 0.4 },
  { at: 546, src: sfx("paper"), volume: 0.6 },
  { at: 592, src: sfx("reel-spin"), volume: 0.2, until: 677 },
  ...steps(592, 641, 8, 0.25),
  { at: 645, src: sfx("pop"), volume: 0.5 },
  { at: 677, src: sfx("paper"), volume: 0.35 },
  { at: 717, src: sfx("hum"), volume: 0.14, until: 845 },
  ...steps(717, 845, 15, 0.35),
  { at: 758, src: sfx("pop"), volume: 0.5 },
  { at: 800, src: sfx("pop"), volume: 0.5 },
  { at: 845, src: sfx("reel-spin"), volume: 0.12, until: 914 },
  { at: 895, src: sfx("boom"), volume: 0.45 },
  { at: 896, src: sfx("near-miss"), volume: 0.3 },
  { at: 918, src: sfx("whoosh"), volume: 0.35 },
  { at: 966, src: sfx("ambience"), volume: 0.16, until: 1047 },
  ...steps(966, 1047),
  { at: 1051, src: sfx("pop"), volume: 0.5 },
  { at: 1094, src: sfx("credit-blip"), volume: 0.3 },
  ...Array.from({ length: 10 }, (_, k) => ({ at: 1096 + k * 3.5, src: sfx("tick"), volume: 0.3 })),
  { at: 1132, src: sfx("chime"), volume: 0.35 },
  { at: 1191, src: sfx("pop"), volume: 0.45 },
  { at: 1270, src: sfx("stamp"), volume: 0.5 },
  { at: 1329, src: sfx("ambience"), volume: 0.12, until: 1502 },
  { at: 1425, src: sfx("whoosh"), volume: 0.3 },
  { at: 1459, src: sfx("door"), volume: 0.4 },
  { at: 1473, src: sfx("near-miss"), volume: 0.3 },
  { at: 1502, src: sfx("ambience"), volume: 0.14, until: TIMING.totalFrames },
  ...steps(1502, 1544, 8),
  ...steps(1591, TIMING.totalFrames),
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 269, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: 269, to: 494, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 494, to: 1175, volume: 0.28 },
  { src: MUSIC_FILES.lounge, from: 1175, to: 1502, volume: 0.24 },
  { src: MUSIC_FILES.upbeat, from: 1502, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
