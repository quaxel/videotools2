import React from "react";
import { Easing, interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  Desk,
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
  squash,
  Stage,
  stroll,
  talk,
  Timing,
  useFinalFrame,
  useShotFrame,
  Video,
  Window,
} from "../../engine";
import {
  ButtonPanel,
  ButtonWall,
  CAR_FRONT_Z,
  CarShell,
  CrosswalkPole,
  ElevatorFront,
  LawBook,
  PANEL_AT,
  PanelGuts,
  PinchedCase,
  SignalCabinet,
  Stamp,
  TrafficLight,
  Wheelchair,
} from "./props";
import TIMING_JSON from "./timing.json";

// "Why the Close Door Button Does Nothing" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "placebo-buttons";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#f7f7f2", lanyard: "#d62828" };
const FIREFIGHTER: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#c0392b", cap: "#ffd23f", lanyard: "#ffd23f" };
const INTERVIEWER: PuppetLook = { skin: "#fbe9d6", hair: "#9aa0a6", outfit: "#1d3557", glasses: true };
const LAWMAKER: PuppetLook = { skin: "#fffaf2", hair: "#4a2c1a", outfit: "#e8e0c8", glasses: true, lanyard: "#1d4fa8" };
const RIDER: PuppetLook = { skin: "#f6dcc4", hair: "#7a2e1a", outfit: "#ffd23f" };
const PEDESTRIAN: PuppetLook = { skin: "#fbe9d6", hair: "#3a2a20", outfit: "#ff9f1c", cap: "#264653" };
const INSPECTOR: PuppetLook = { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#2a9d8f", lanyard: "#ffd23f", glasses: true };
const NEW_RIDER: PuppetLook = { skin: "#fbe9d6", hair: "#c0392b", outfit: "#3fae5a" };

const CASE_L = { item: "briefcase", hand: "L" } as const;
const KEY_L = { item: "key", hand: "L" } as const;
const PHONE_R = { item: "phone", hand: "R" } as const;

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

// Six quick jabs: 0 out, 1 pressed.
const jab = (f: number, period = 5.3) => Math.max(0, Math.sin((f / period) * Math.PI)) ** 0.6;
const jabArm = (f: number, period = 5.3): [number, number] => [interpolate(jab(f, period), [0, 1], [60, 92]), interpolate(jab(f, period), [0, 1], [-50, -4])];

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
// Macro on the car's button panel at height y.
const panelMacro = (y: number, p: number, dx = 0.05, dist = 0.78): CameraShot => ({
  position: lerp3([PANEL_AT[0] + dx, y + 0.04, PANEL_AT[2] + dist], [PANEL_AT[0] + dx * 0.6, y + 0.03, PANEL_AT[2] + dist - 0.1], p),
  target: [PANEL_AT[0] + 0.01, y, PANEL_AT[2]],
  fov: 40,
});

// ---------- locations ----------

type CarProps = { open: number; gap?: number; floorText?: string; fire?: boolean; panel?: React.ComponentProps<typeof ButtonPanel>; pinch?: number };
const CarSet: React.FC<{ camera: CameraShot } & CarProps> = ({ camera, open, gap, floorText = "1", fire = false, panel = { position: PANEL_AT }, pinch }) => (
  <Room camera={camera} mood={fire ? "alarm" : "golden"} floor={fire ? "#4a0f14" : "#8a3a2a"} wall={fire ? "#5a1018" : "#f4a261"} width={6} depth={6} wallPattern="panel" floorPattern="carpet">
    <CarShell open={open} gap={gap} wall={fire ? "#b3202a" : "#e0b44a"} lightColor={fire ? "#ff5a4a" : "#fff2c4"} floorText={floorText} panel={{ ...panel, position: PANEL_AT, fire: fire ? 1 : panel.fire }} />
    {pinch !== undefined && <PinchedCase position={[0, 0.9, CAR_FRONT_Z + 0.04]} t={pinch} />}
  </Room>
);

const LobbySet: React.FC<{ camera: CameraShot; open: number }> = ({ camera, open }) => (
  <Room camera={camera} mood="warm" floor="#f2e3c6" wall="#e8833a" stripe="#ffd23f" width={8} depth={5} wallPattern="plaster" floorPattern="tile" sun={{ x: -2.2, color: "#ffe6a8", bars: 4 }}>
    <ElevatorFront position={[0, 0, -2.45]} open={open} floorText="1" />
    <ElevatorFront position={[-1.7, 0, -2.45]} open={0} floorText="27" />
    <Label text="LOBBY" position={[1.7, 2.3, -2.43]} width={0.9} fg="#ffffff" bg="#8a3a2a" />
    <Plant position={[2.4, 0, -2.0]} scale={1.2} />
  </Room>
);

const CapitolSet: React.FC<{ camera: CameraShot; f: number; yearAt?: number; stamp?: number; stamped?: number }> = ({ camera, f, yearAt = -99, stamp, stamped = -1 }) => (
  <Room camera={camera} mood="office" floor="#5b3a29" wall="#3fae5a" stripe="#ffffff" width={7} depth={5} wallPattern="wallpaper" floorPattern="wood" sun={{ x: 1.8, color: "#fffbe6", bars: 4 }}>
    <Label text="1990" position={[-0.55, 2.15, -2.42]} width={0.9} fg="#14301c" bg="#ffd23f" appear={f - yearAt} />
    <Window position={[1.4, 1.5, -2.45]} />
    <Desk position={[0, 0, -0.9]} size={[1.6, 0.6, 0.7]} color="#8a5a3a" />
    <LawBook position={[0, 0.6, -0.9]} stamped={stamped} />
    {stamp !== undefined && <Stamp position={[0.02, 0.7, -0.78]} press={stamp} scale={squash(stamped, 0, 0.3)} />}
  </Room>
);

const HallSet: React.FC<{ camera: CameraShot; open: number; timer?: string; chair?: [number, number, number] }> = ({ camera, open, timer, chair }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#7b4fc0" width={7} depth={5} wallPattern="wallpaper" floorPattern="carpet">
    <ElevatorFront position={[0, 0, -2.45]} open={open} floorText="5" frame="#ffd23f" />
    {timer && <Screen position={[0.98, 1.75, -2.4]} size={[0.62, 0.36]} text={timer} glow="#5ad1ff" bg="#071226" />}
    {chair && <Wheelchair position={[chair[0], 0, chair[1]]} roll={chair[2]} />}
    <Plant position={[-2.1, 0, -2.0]} />
  </Room>
);

const GutsSet: React.FC<{ camera: CameraShot; open: number; fire: number; cutAt?: number }> = ({ camera, open, fire, cutAt }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.6, color: "#8fb3ff", bars: 8 }}>
    <PanelGuts position={[0, 1.8, -2.4]} open={open} fire={fire} cutAt={cutAt} />
  </Room>
);

const POLE_AT: [number, number, number] = [0, 0, -0.9];
const StreetSet: React.FC<{ camera: CameraShot; f: number; press?: number; walkSign?: boolean; fall?: number; shake?: number; yearAt?: number }> = ({ camera, f, press, walkSign, fall, shake, yearAt }) => (
  <Room camera={camera} mood="daylight" floor="#5b6670" wall="#2a9d8f" width={8} depth={5} wallPattern="brick" floorPattern="plain" sun={{ x: -1.6, color: "#fff6d8", bars: 3 }}>
    {[-1.2, -0.6, 0, 0.6, 1.2].map((x) => (
      <mesh key={x} position={[x - 0.3, 0.004, 0.6]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.34, 1.6]} />
        <meshBasicMaterial color="#f2f2ec" />
      </mesh>
    ))}
    <Label text="NEW YORK" position={[-1.3, 2.3, -2.43]} width={1.1} fg="#ffffff" bg="#1f6b3a" />
    {yearAt !== undefined && <Label text="CITY CHECK 2004" position={[0.95, 2.3, -2.43]} width={0.9} bg="#ffd23f" appear={f - yearAt} />}
    <CrosswalkPole position={POLE_AT} press={press} walk={walkSign} fall={fall} shake={shake} fallTo={[0.32, 1.38]} />
  </Room>
);

const CityHallSet: React.FC<{ camera: CameraShot; f: number; screen: string; glow?: string; appear?: number; count?: number; dead: number; tagAt?: number }> = ({ camera, f, screen, glow = "#5ad1ff", appear, count, dead, tagAt }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={7} depth={5} wallPattern="panel" floorPattern="tile">
    <Screen position={[0, 2.2, -2.4]} size={[1.3, 0.6]} text={screen} glow={glow} bg="#0b0a14" appear={appear} count={count} />
    <ButtonWall position={[0, 1.15, -2.42]} dead={dead} />
    {tagAt !== undefined && <Label text="$1 MILLION" position={[0.42, 1.5, -2.28]} rotation={[0, 0, -0.12]} width={0.8} bg="#ffd23f" appear={f - tagAt} count={ramp(f, tagAt, tagAt + 22)} />}
  </Room>
);

const SignalSet: React.FC<{ camera: CameraShot; f: number; yearAt: number; computerAt?: number; unplug: number }> = ({ camera, f, yearAt, computerAt, unplug }) => (
  <Room camera={camera} mood="warm" floor="#5a3a22" wall="#8a5a3a" stripe="#d8c9a3" width={7} depth={5} wallPattern="panel" floorPattern="wood">
    <Label text="1970s" position={[-0.45, 2.2, -2.42]} width={0.8} fg="#3a2414" bg="#ffd23f" appear={f - yearAt} />
    <SignalCabinet position={[-0.45, 0, -2.0]} unplug={unplug} f={f} />
    <TrafficLight position={[0.75, 2.0, -2.3]} f={f} />
    {computerAt !== undefined && <Screen position={[0.7, 1.1, -2.2]} size={[0.72, 0.42]} text={"COMPUTER\nTIMED"} glow="#4dff9a" bg="#06140c" appear={f - computerAt} />}
  </Room>
);

const OfficeSet: React.FC<{ camera: CameraShot }> = ({ camera }) => (
  <Room camera={camera} mood="office" floor="#4a5a6a" wall="#dfe7ef" stripe="#1d3557" width={7} depth={5} wallPattern="plain" floorPattern="carpet" sun={{ x: -1.5, color: "#ffffff", bars: 5 }}>
    <Screen position={[-0.75, 2.0, -2.4]} size={[0.6, 0.3]} text="9:02" glow="#ff3b30" bg="#140404" />
    <Label text="FLOOR 40" position={[0.6, 2.2, -2.43]} width={0.9} fg="#ffffff" bg="#1d3557" />
    <Window position={[-2.0, 1.4, -2.45]} />
    <Desk position={[0.3, 0, -1.4]} size={[1.4, 0.6, 0.7]} color="#c9a26b" />
    <Plant position={[2.2, 0, -2.0]} />
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const car = (camera: CameraShot, puppets: PuppetPlacement[], props: CarProps, grade: Grade = {}) => (
  <Stage bg={moodBackground(props.fire ? "alarm" : "golden")} camera={camera} puppets={puppets} {...grade} set={<CarSet camera={camera} {...props} />} />
);
const lobby = (camera: CameraShot, puppets: PuppetPlacement[], open = 1) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} set={<LobbySet camera={camera} open={open} />} />
);
const capitol = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { yearAt?: number; stamp?: number; stamped?: number } = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<CapitolSet camera={camera} f={f} {...extra} />} />
);
const hall = (camera: CameraShot, puppets: PuppetPlacement[], open: number, timer?: string, chair?: [number, number, number]) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} set={<HallSet camera={camera} open={open} timer={timer} chair={chair} />} />
);
const guts = (camera: CameraShot, open: number, fire: number, cutAt?: number) => (
  <Stage bg={moodBackground("cold")} camera={camera} set={<GutsSet camera={camera} open={open} fire={fire} cutAt={cutAt} />} />
);
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { press?: number; walkSign?: boolean; fall?: number; shake?: number; yearAt?: number } = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<StreetSet camera={camera} f={f} {...extra} />} />
);
const cityHall = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: { screen: string; glow?: string; appear?: number; count?: number; dead: number; tagAt?: number }) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<CityHallSet camera={camera} f={f} {...extra} />} />
);
const signal = (camera: CameraShot, f: number, extra: { yearAt: number; computerAt?: number; unplug: number }) => (
  <Stage bg={moodBackground("warm")} camera={camera} set={<SignalSet camera={camera} f={f} {...extra} />} />
);
const office = (camera: CameraShot, puppets: PuppetPlacement[]) => <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<OfficeSet camera={camera} />} />;

// Where people stand in the car (feet x, z).
const YOU_CAR: [number, number] = [0.45, -0.6];
const FF_CAR: [number, number] = [-0.35, -0.5];
const carWide = (p: number): CameraShot => ({ position: lerp3([0.05, 1.5, 2.45], [0.08, 1.46, 2.15], p), target: [0.1, 1.0, -1.0], fov: 50 });

const you = (at: [number, number], pose: PuppetPose) => pup("you", YOU, at, pose);
const firefighter = (at: [number, number], pose: PuppetPose) => pup("firefighter", FIREFIGHTER, at, pose);

// ---------- shots ----------

// Macro: the close button jabbed again and again. The FIRE keyhole sits just below it (the seed).
const Hook: React.FC = () => {
  const f = useShotFrame();
  return car(panelMacro(0.8, f / 32), [], { open: 1, panel: { position: PANEL_AT, closePress: jab(f) } });
};

const JabMedium: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.05, 1.25, 2.3], [0.1, 1.24, 2.0], f / 54), target: [0.55, 1.0, -0.8], fov: 42 };
  return car(cam, [you(YOU_CAR, { view: "side", facing: 1, hold: CASE_L, armR: jabArm(f), expression: "skeptical", bob: jab(f) * -6 })], { open: 1, panel: { position: PANEL_AT, closePress: jab(f) } });
};

const Late: React.FC = () => {
  const f = useShotFrame();
  return car(close(YOU_CAR[0], YOU_CAR[1], f / 40), [you(YOU_CAR, { view: "front", hold: CASE_L, armL: [12, -60], expression: "shocked", lookX: 0.7, headTilt: -6 })], { open: 1 }, { blur: 7 });
};

// Low angle up the panel: floor 40 lights up.
const Forty: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([PANEL_AT[0] - 0.12, 1.05, PANEL_AT[2] + 0.5], [PANEL_AT[0] - 0.08, 1.08, PANEL_AT[2] + 0.42], f / 40), target: [PANEL_AT[0], 1.36, PANEL_AT[2]], fov: 40 };
  return car(cam, [], { open: 1, panel: { position: PANEL_AT, lit: f >= 8 ? 40 : undefined } });
};

// Lobby, low angle: you jab inside the open car while a firefighter strolls past (the seed).
const LobbyPass: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 0.6, 2.4], [-0.4, 0.65, 2.1], (f + 8) / 68), target: [0, 1.25, -2.2], fov: 48 };
  const w = stroll(f, 0, 60, [-2.2, -0.9], [0.9, -0.9]);
  return lobby(cam, [
    you([0.05, -2.2], { view: "front", hold: CASE_L, armR: [130 + jab(f, 4) * 20, -30], expression: "skeptical", lookX: 0.4 }),
    firefighter(w.at, { hold: KEY_L, expression: "smug", lookX: -0.6, ...w.pose }),
  ]);
};

// Gag: one hard jab and the button cap pops off.
const CapPop: React.FC = () => {
  const f = useShotFrame();
  const wind = ramp(f, 0, 10);
  const hit = ramp(f, 10, 13);
  const armR: [number, number] = f < 13 ? [interpolate(wind - hit, [0, 1], [70, 140]), interpolate(wind - hit, [0, 1], [-10, -60])] : [92, -4];
  const cam: CameraShot = { position: lerp3([0.0, 1.2, 1.6], [0.05, 1.18, 1.35], (f + 8) / 59), target: [0.6, 1.0, -0.85], fov: 40 };
  return car(cam, [you(YOU_CAR, { view: "side", facing: 1, hold: CASE_L, armR, expression: f < 15 ? "skeptical" : "shocked", bob: f >= 13 && f < 20 ? -10 : 0 })], {
    open: 1,
    panel: { position: PANEL_AT, closePress: f >= 12 && f < 16 ? 1 : 0, capOff: f >= 14 ? f - 14 : undefined },
  });
};

const DoorsShut: React.FC = () => {
  const f = useShotFrame();
  const shut = 1 - Easing.inOut(Easing.cubic)(ramp(f, 4, 32));
  return car(carWide(f / 51), [you(YOU_CAR, { view: "back", hold: CASE_L, expression: "smug" })], { open: shut });
};

const ThumbSmug: React.FC = () => {
  const f = useShotFrame();
  return car(close(YOU_CAR[0], YOU_CAR[1], f / 38, 0.22), [you(YOU_CAR, { view: "front", hold: CASE_L, armR: [150, -70], expression: "smug", headTilt: 8, blink: f > 20 && f < 24 })], { open: 0, floorText: "5" }, { blur: 7 });
};

// Low angle on the floor display: 12.
const Twelve: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.75, -0.1], [0.06, 1.8, -0.3], f / 36), target: [0, 2.38, CAR_FRONT_Z], fov: 40 };
  return car(cam, [], { open: 0, floorText: "12" });
};

// The doors open and the firefighter steps in.
const StepIn: React.FC = () => {
  const f = useShotFrame();
  const open = Easing.out(Easing.cubic)(ramp(f, 0, 14));
  const w = stroll(f, 10, 34, [-0.05, -2.3], FF_CAR);
  return car(carWide(f / 56), [
    you(YOU_CAR, { view: "front", hold: CASE_L, expression: "skeptical", lookX: -0.8 }),
    firefighter(w.at, { view: "front", hold: KEY_L, armL: [40, -60], expression: "neutral", ...w.pose }),
  ], { open, floorText: "12" });
};

const KeyTurn: React.FC = () => {
  const f = useShotFrame();
  return car(panelMacro(0.76, f / 28, -0.04, 0.6), [], { open: 1, floorText: "12", panel: { position: PANEL_AT, keyIn: ramp(f, 0, 8), keyTurn: Easing.out(Easing.back(1.6))(ramp(f, 11, 19)) } });
};

// The same button, now in fire mode: the car turns red and the tap lands.
const TapClose: React.FC = () => {
  const f = useShotFrame();
  const fire = f >= 4;
  return car(panelMacro(0.82, f / 41, 0.08, 0.7), [], { open: 1, floorText: "12", fire, panel: { position: PANEL_AT, keyIn: 1, keyTurn: 1, closePress: f >= 30 && f < 38 ? 1 : 0 } });
};

// Twist: the doors slam instantly and pinch your briefcase; papers fly.
const Slam: React.FC = () => {
  const f = useShotFrame();
  const shut = 1 - Easing.in(Easing.quad)(ramp(f, 0, 4));
  return car(carWide(0.4 + f / 120), [
    you(YOU_CAR, { view: "front", armL: [150, -20], armR: [150, -20], expression: "shocked", bob: f < 10 ? -Math.abs(Math.sin(f)) * 10 : 0 }),
    firefighter(FF_CAR, { view: "front", hold: KEY_L, armL: [40, -60], expression: "smug", lookX: 0.6 }),
  ], { open: shut, gap: 0.1, floorText: "12", fire: true, pinch: f - 3 });
};

// Over your shoulder: the firefighter talks.
const ItWorks: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "firefighter", useFinalFrame());
  const cam: CameraShot = { position: lerp3([0.62, 1.5, 1.75], [0.58, 1.48, 1.55], f / 43), target: [-0.3, 1.0, -0.5], fov: 30 };
  return car(cam, [
    you([0.42, 0.45], { view: "back", expression: "neutral" }),
    firefighter(FF_CAR, { view: "front", hold: KEY_L, armL: [60, -50], expression: "smug", headTilt: 8, lookX: 0.8, mouthOpen: talking ? talk(f) : 0 }),
  ], { open: 0, gap: 0.1, floorText: "12", fire: true, pinch: 60 });
};

const NotForYou: React.FC = () => {
  const f = useShotFrame();
  return car(close(YOU_CAR[0], YOU_CAR[1], f / 27, 0.2), [you(YOU_CAR, { view: "front", expression: "shocked", lookX: -0.7, headTilt: -10 })], { open: 0, gap: 0.1, floorText: "12", fire: true }, { blur: 7 });
};

const LAWMAKER_AT: [number, number] = [0.0, -1.6];
const Capitol: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.75, 1.9], [-0.22, 1.7, 1.6], (f + 8) / 53), target: [-0.1, 1.0, -1.3], fov: 46 };
  return capitol(cam, f, [pup("lawmaker", LAWMAKER, LAWMAKER_AT, { expression: "excited", armL: [150, -20], armR: [40, -60], bob: breathe(f) })], { yearAt: 12 });
};

// Top-down: the stamp comes down on the law book.
const StampTop: React.FC = () => {
  const f = useShotFrame();
  const down = Easing.in(Easing.quad)(ramp(f, 4, 10)) - 5 * Easing.in(Easing.quad)(ramp(f, 16, 26));
  const cam: CameraShot = { position: lerp3([0.02, 1.9, -0.82], [0.02, 1.7, -0.84], f / 37), target: [0, 0.6, -0.9], fov: 44 };
  return capitol(cam, f, [], { stamp: down, stamped: f >= 10 ? f - 10 : -1 });
};

// A wheelchair rolls up to the open doors.
const Rolling: React.FC = () => {
  const f = useShotFrame();
  const x = interpolate(Easing.out(Easing.cubic)(ramp(f, 0, 50)), [0, 1], [-1.9, -0.15]);
  const cam: CameraShot = { position: lerp3([-0.6, 1.3, 2.4], [-0.45, 1.25, 2.05], (f + 8) / 68), target: [-0.3, 1.0, -1.6], fov: 44 };
  return hall(cam, [pup("rider", RIDER, [x + 0.02, -1.55], { sit: true, view: "side", facing: 1, expression: "smug", armR: [40, -70], bob: breathe(f) * 0.3 })], 1, undefined, [x, -1.55, x + 1.9]);
};

const HeldOpen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 0.5, 1.2], [0.3, 0.55, 0.95], f / 38), target: [0, 1.3, -2.45], fov: 46 };
  const x = interpolate(ramp(f, 0, 38), [0, 1], [-0.15, 0.1]);
  return hall(cam, [pup("rider", RIDER, [x, -1.95], { sit: true, view: "side", facing: 1, expression: "smug", bob: breathe(f) * 0.3 })], 1, undefined, [x - 0.02, -1.95, x + 2]);
};

// The door timer counts down from 3.
const Timer: React.FC = () => {
  const f = useShotFrame();
  const n = Math.max(1, 3 - Math.floor(f / 13));
  const cam: CameraShot = { position: lerp3([0.75, 1.72, -0.95], [0.82, 1.73, -1.2], f / 40), target: [0.98, 1.75, -2.4], fov: 42 };
  return hall(cam, [], 1, `OPEN\n${n} SEC`);
};

// A padlock clamps over CLOSE.
const Padlock: React.FC = () => {
  const f = useShotFrame();
  return car(panelMacro(0.82, f / 49, -0.05, 0.7), [], { open: 1, floorText: "5", panel: { position: PANEL_AT, padlock: f - 6 } });
};

// Behind the panel: the cover swings open.
const PanelOpen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.8, 0.6], [0.2, 1.78, 0.1], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 55))), target: [0, 1.68, -2.4], fov: 42 };
  return guts(cam, Easing.out(Easing.back(1.2))(ramp(f, 4, 24)), 0);
};

const WireCut: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.55, 1.72, -1.15], [0.5, 1.7, -1.35], f / 53), target: [0.4, 1.62, -2.4], fov: 42 };
  return guts(cam, 1, 0, f - 6);
};

// The fire switch flips and the CLOSE button lights.
const FireSwitch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.15, 1.75, 0.0], [-0.12, 1.73, -0.25], f / 46), target: [-0.08, 1.7, -2.4], fov: 46 };
  return guts(cam, 1, ramp(f, 12, 16), 99);
};

// Fire mode: the firefighter presses close and the doors snap shut.
const FireCar: React.FC = () => {
  const f = useShotFrame();
  const shut = 1 - Easing.in(Easing.quad)(ramp(f, 16, 20));
  const reach = ramp(f, 2, 12);
  return car(carWide((f + 8) / 71), [
    firefighter([0.32, -0.62], { view: "side", facing: 1, hold: KEY_L, armR: [interpolate(reach, [0, 1], [10, 92]), interpolate(reach, [0, 1], [10, -4])], expression: "smug" }),
  ], { open: shut, floorText: "12", fire: true, panel: { position: PANEL_AT, closePress: f >= 12 && f < 20 ? 1 : 0, keyIn: 1, keyTurn: 1 } });
};

const PED_AT: [number, number] = [0.33, -0.75];
// Gag: the pedestrian pounds the dead button until the sign drops on their head.
const SignFall: React.FC = () => {
  const f = useShotFrame();
  const fall = Easing.in(Easing.quad)(ramp(f, 24, 30));
  const cam: CameraShot = { position: lerp3([-0.25, 1.3, 2.2], [-0.15, 1.28, 1.85], (f + 8) / 56), target: [0.1, 1.15, -0.9], fov: 42 };
  return street(cam, f, [pup("ped", PEDESTRIAN, PED_AT, { view: "side", facing: -1, armR: f < 24 ? jabArm(f, 4) : [150, -20], armL: f < 24 ? [20, -20] : [150, -20], expression: f < 30 ? "skeptical" : "shocked", bob: f >= 30 && f < 36 ? -12 : 0 })], {
    press: f < 24 ? jab(f, 4) : 0,
    fall,
    shake: f < 24 ? jab(f, 4) : Math.max(0, 1 - (f - 24) / 10),
  });
};

const Inspector: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 6, 30, [-1.7, -0.6], [-0.42, -0.6]);
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 2.6], [-0.1, 1.38, 2.25], f / 74), target: [0.3, 1.25, -1.2], fov: 44 };
  return street(cam, f, [
    pup("inspector", INSPECTOR, w.at, { hold: PHONE_R, armR: [10, -78], expression: "neutral", lookX: 0.6, ...w.pose }),
    pup("ped", PEDESTRIAN, PED_AT, { expression: "skeptical", armR: [150, -60], lookX: -0.6, headTilt: 10 }),
  ], { fall: 1, yearAt: 2 });
};

const Count: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.95, 1.0], [0.0, 2.0, 0.7], (f + 8) / 76), target: [0, 2.1, -2.4], fov: 42 };
  return cityHall(cam, f, [], { screen: "3,250\nWALK BUTTONS", appear: f - 4, count: ramp(f, 4, 40), dead: 0 });
};

const WallDies: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.2, 0.0], [0.0, 1.18, -0.25], f / 43), target: [0, 1.15, -2.42], fov: 42 };
  return cityHall(cam, f, [], { screen: "3,250\nWALK BUTTONS", dead: ramp(f, 2, 38) });
};

const DeadSign: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.6, 0.9], [0.0, 1.65, 1.3], f / 44), target: [0, 1.65, -2.4], fov: 42 };
  return cityHall(cam, f, [], { screen: "2,500+\nDO NOTHING", glow: "#ff5a6e", appear: f - 2, count: ramp(f, 2, 26), dead: 1 });
};

const Seventies: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.6], [-0.3, 1.45, 1.2], (f + 8) / 76), target: [-0.2, 1.4, -2.0], fov: 46 };
  return signal(cam, f, { yearAt: 32, unplug: 0 });
};

const Computer: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.45, 1.1], [0.35, 1.42, 0.8], f / 56), target: [0.3, 1.3, -2.1], fov: 46 };
  return signal(cam, f, { yearAt: -99, computerAt: 2, unplug: Easing.out(Easing.back(1.5))(ramp(f, 20, 30)) });
};

const INSPECTOR_HALL: [number, number] = [-0.5, -1.3];
const PriceTag: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.45, 2.5], [-0.05, 1.42, 2.2], (f + 8) / 58), target: [0, 1.35, -1.9], fov: 50 };
  const shrug = ramp(f, 30, 38);
  return cityHall(cam, f, [pup("inspector", INSPECTOR, INSPECTOR_HALL, { hold: PHONE_R, armR: [interpolate(shrug, [0, 1], [10, 60]), -78], armL: [interpolate(shrug, [0, 1], [10, 70]), interpolate(shrug, [0, 1], [0, 60])], expression: f < 30 ? "neutral" : "skeptical", lookX: 0.8, bob: breathe(f) })], {
    screen: "2,500+\nDO NOTHING",
    glow: "#ff5a6e",
    dead: 1,
    tagAt: 30,
  });
};

// They left the buttons; the pedestrian still pushes and the light changes anyway.
const LeftThem: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.05, 1.3, 1.75], [0.0, 1.3, 1.5], (f + 8) / 49), target: [0.15, 1.25, -0.9], fov: 50 };
  return street(cam, f, [pup("ped", PEDESTRIAN, PED_AT, { view: "side", facing: -1, armR: f < 20 ? jabArm(f, 5) : [10, 0], expression: f < 26 ? "skeptical" : "smug" })], {
    press: f < 20 ? jab(f, 5) : 0,
    walkSign: f >= 26,
  });
};

const InterviewLate: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 34, [-1.6, -0.4], [-0.45, -0.5]);
  const cam: CameraShot = { position: lerp3([-0.45, 1.4, 2.8], [-0.38, 1.38, 2.45], (f + 8) / 72), target: [-0.15, 1.2, -1.3], fov: 48 };
  return office(cam, [
    you(w.at, { hold: CASE_L, expression: f < 34 ? "neutral" : "shocked", lookX: 0.8, ...w.pose }),
    pup("interviewer", INTERVIEWER, [0.4, -2.0], { expression: "skeptical", armL: [100, -10], lookX: -0.8, bob: breathe(f) }),
  ]);
};

const NewRider: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.1, 1.6], [0.2, 1.12, 1.2], (f + 8) / 55), target: [0, 1.15, -2.2], fov: 44 };
  return lobby(cam, [pup("rider2", NEW_RIDER, [0.05, -2.2], { view: "front", armR: [130 + jab(f, 4) * 20, -30], expression: "skeptical", lookX: 0.4 })]);
};

const LoopMacro: React.FC = () => {
  const f = useShotFrame();
  return car(panelMacro(0.8, f / 52), [], { open: 1, panel: { position: PANEL_AT, closePress: jab(f) } });
};

const SHOTS: Shot[] = [
  [0, 32, Hook, false],
  [32, 86, JabMedium, false],
  [86, 126, Late, false],
  [126, 166, Forty, false],
  [166, 226, LobbyPass, true],
  [226, 277, CapPop, true],
  [277, 328, DoorsShut, false],
  [328, 366, ThumbSmug, false],
  [366, 402, Twelve, false],
  [402, 458, StepIn, false],
  [458, 486, KeyTurn, false],
  [486, 527, TapClose, false],
  [527, 584, Slam, false],
  [584, 627, ItWorks, false],
  [627, 654, NotForYou, false],
  [654, 699, Capitol, true],
  [699, 736, StampTop, false],
  [736, 796, Rolling, true],
  [796, 834, HeldOpen, false],
  [834, 874, Timer, false],
  [874, 923, Padlock, true],
  [923, 970, PanelOpen, true],
  [970, 1023, WireCut, false],
  [1023, 1069, FireSwitch, false],
  [1069, 1132, FireCar, true],
  [1132, 1180, SignFall, true],
  [1180, 1254, Inspector, false],
  [1254, 1322, Count, true],
  [1322, 1365, WallDies, false],
  [1365, 1409, DeadSign, false],
  [1409, 1477, Seventies, true],
  [1477, 1533, Computer, false],
  [1533, 1583, PriceTag, true],
  [1583, 1624, LeftThem, true],
  [1624, 1688, InterviewLate, true],
  [1688, 1735, NewRider, true],
  [1735, TIMING.totalFrames, LoopMacro, true],
];

// ---------- sound ----------

// One button click per jab, from shot frame 0 at `from`.
const jabClicks = (from: number, frames: number, period = 5.3, volume = 0.5): Sfx[] =>
  Array.from({ length: Math.floor(frames / (period * 2)) }, (_, k) => ({ at: from + Math.round(period * (2 * k + 0.5)), src: sfx("button"), volume }));

const SFX: Sfx[] = [
  { at: 0, src: sfx("hum"), volume: 0.1, until: 166 },
  ...jabClicks(0, 86),
  { at: 134, src: sfx("button"), volume: 0.45 },
  { at: 166, src: sfx("ambience"), volume: 0.16, until: 226 },
  ...jabClicks(166, 60, 4, 0.3),
  { at: 226, src: sfx("hum"), volume: 0.1, until: 527 },
  { at: 239, src: sfx("button"), volume: 0.8 },
  { at: 240, src: sfx("pop"), volume: 0.6 },
  { at: 262, src: sfx("tick"), volume: 0.6 },
  { at: 268, src: sfx("tick"), volume: 0.4 },
  { at: 281, src: sfx("whoosh"), volume: 0.3 },
  { at: 368, src: sfx("chime"), volume: 0.5 },
  { at: 402, src: sfx("whoosh"), volume: 0.3 },
  { at: 460, src: sfx("card"), volume: 0.5 },
  { at: 469, src: sfx("tick"), volume: 0.7 },
  { at: 479, src: sfx("riser"), volume: 0.25 },
  { at: 490, src: sfx("drawer"), volume: 0.25 },
  { at: 516, src: sfx("button"), volume: 0.8 },
  // The twist: the doors slam on "doors slam".
  { at: 527, src: sfx("sting"), volume: 0.4 },
  { at: 529, src: sfx("boom"), volume: 0.55 },
  { at: 531, src: sfx("paper"), volume: 0.5 },
  { at: 527, src: sfx("hum"), volume: 0.14, until: 654 },
  { at: 670, src: sfx("pop"), volume: 0.5 },
  { at: 709, src: sfx("stamp"), volume: 0.8 },
  { at: 736, src: sfx("ambience"), volume: 0.12, until: 834 },
  { at: 834, src: sfx("tick"), volume: 0.6 },
  { at: 847, src: sfx("tick"), volume: 0.6 },
  { at: 860, src: sfx("tick"), volume: 0.6 },
  { at: 880, src: sfx("stamp"), volume: 0.45 },
  { at: 881, src: sfx("pop"), volume: 0.4 },
  { at: 923, src: sfx("hum"), volume: 0.16, until: 1069 },
  { at: 927, src: sfx("door"), volume: 0.5 },
  { at: 976, src: sfx("pop"), volume: 0.5 },
  { at: 1035, src: sfx("button"), volume: 0.8 },
  { at: 1037, src: sfx("chime"), volume: 0.3 },
  { at: 1081, src: sfx("button"), volume: 0.7 },
  { at: 1085, src: sfx("boom"), volume: 0.35 },
  { at: 1132, src: sfx("ambience"), volume: 0.2, until: 1254 },
  ...jabClicks(1132, 24, 4, 0.5),
  { at: 1156, src: sfx("boom"), volume: 0.5 },
  { at: 1182, src: sfx("pop"), volume: 0.5 },
  { at: 1258, src: sfx("pop"), volume: 0.5 },
  ...Array.from({ length: 9 }, (_, k) => ({ at: 1260 + k * 4, src: sfx("credit-blip"), volume: 0.25 })),
  ...Array.from({ length: 12 }, (_, k) => ({ at: 1325 + k * 3, src: sfx("tick"), volume: 0.4 })),
  { at: 1367, src: sfx("pop"), volume: 0.5 },
  { at: 1370, src: sfx("near-miss"), volume: 0.3 },
  { at: 1409, src: sfx("hum"), volume: 0.12, until: 1533 },
  { at: 1441, src: sfx("pop"), volume: 0.45 },
  { at: 1479, src: sfx("pop"), volume: 0.5 },
  { at: 1497, src: sfx("drawer"), volume: 0.4 },
  { at: 1563, src: sfx("pop"), volume: 0.5 },
  { at: 1565, src: sfx("bill-whirr"), volume: 0.3 },
  { at: 1583, src: sfx("ambience"), volume: 0.18, until: 1624 },
  ...jabClicks(1583, 20, 5, 0.45),
  { at: 1609, src: sfx("chime"), volume: 0.35 },
  { at: 1624, src: sfx("ambience"), volume: 0.1, until: 1688 },
  { at: 1688, src: sfx("ambience"), volume: 0.14, until: 1735 },
  ...jabClicks(1688, 47, 4, 0.3),
  { at: 1735, src: sfx("hum"), volume: 0.1, until: TIMING.totalFrames },
  ...jabClicks(1735, 52),
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 458, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: 458, to: 654, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 654, to: 1132, volume: 0.28 },
  { src: MUSIC_FILES.upbeat, from: 1132, to: 1254, volume: 0.22 },
  { src: MUSIC_FILES.tension, from: 1254, to: 1533, volume: 0.28 },
  { src: MUSIC_FILES.lounge, from: 1533, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} lighting={false} />;
