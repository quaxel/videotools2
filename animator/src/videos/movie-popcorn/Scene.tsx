import React from "react";
import { Easing, interpolate } from "remotion";
import {
  Board,
  breathe,
  CameraShot,
  Counter,
  Crates,
  Desk,
  Door,
  InkBox,
  InkCylinder,
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
  countText,
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
import { DollarCoin, Bucket, CandySpill, CashDrawer, CinemaSeats, CoinBoard, Contract, Jar, Marquee, MovieScreen, OpenBriefcase, PopcornMachine, RubberStamp, Sack, Seesaw } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Movie Popcorn Costs So Much" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "movie-popcorn";
export const timing = TIMING;

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#2b1d14", outfit: "#3fae5a" };
const BUDDY: PuppetLook = { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#ff9f1c", cap: "#1d4fa8" };
const CASHIER: PuppetLook = { skin: "#fbe9d6", hair: "#7a2e1a", outfit: "#d62828", cap: "#d62828", lanyard: "#ffd23f" };
const STUDIO: PuppetLook = { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#1d1a2a", glasses: true, chain: "#e8b04a" };
const MANAGER: PuppetLook = { skin: "#f6dcc4", hair: "#9aa0a6", outfit: "#f7f7f2", lanyard: "#1d4fa8", glasses: true };
const NEWBIE: PuppetLook = { skin: "#fffaf2", hair: "#c0392b", outfit: "#9b5de5" };
const EXTRAS: PuppetLook[] = [
  { skin: "#f6dcc4", hair: "#3a2a20", outfit: "#f2b630" },
  { skin: "#fbe9d6", hair: "#c0392b", outfit: "#2a9d8f" },
  { skin: "#fff3e6", hair: "#1d1a1a", outfit: "#e76f51", glasses: true },
  { skin: "#f6dcc4", hair: "#9aa0a6", outfit: "#4f7dff", cap: "#264653" },
  { skin: "#fffaf2", hair: "#4a2c1a", outfit: "#f28482" },
];

const POPCORN_R = { item: "popcorn", hand: "R" } as const;
const CANDY_R = { item: "candy", hand: "R" } as const;
const CASE_R = { item: "briefcase", hand: "R" } as const;
const HOLD: [number, number] = [10, -78];
const CARRY: [number, number] = [8, 62];
const HANG: [number, number] = [6, 4];
const ARMS_CROSSED = { armL: [10, -95] as [number, number], armR: [10, -95] as [number, number] };

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
const seatedClose = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 0.8, pz - 1.7], [px + dx * 0.8, 0.78, pz - 1.45], p),
  target: [px, 0.66, pz],
  fov: 36,
});

// ---------- locations ----------

const COUNTER_TOP = 0.8;
const LobbySet: React.FC<{ camera: CameraShot; f: number; seesaw?: number }> = ({ camera, f, seesaw }) => (
  <Room camera={camera} mood="warm" floor="#4a1820" wall="#c0392b" stripe="#ffd23f" width={9} depth={6} wallPattern="wallpaper" floorPattern="carpet">
    <Screen position={[0.7, 2.3, -2.9]} size={[1.5, 0.6]} text={"POPCORN $9\nSODA $7"} glow="#ffd23f" bg="#1a0808" />
    <Label text="SNACKS" position={[-1.5, 2.45, -2.92]} width={1.0} fg="#ffffff" bg="#1d1a1a" />
    <PopcornMachine position={[-1.5, 0, -2.4]} f={f} />
    <Counter position={[0, 0, -1.3]} size={[2.8, 0.75, 0.6]} color="#1d1a1a" top="#ffd23f" />
    <Bucket position={[0.45, COUNTER_TOP, -1.2]} price="$9" />
    <Bucket position={[0.8, COUNTER_TOP, -1.3]} />
    <InkBox size={[0.3, 0.22, 0.26]} position={[-0.9, COUNTER_TOP + 0.11, -1.35]} color="#2c3a40" />
    <Door position={[3.2, 0, -2.94]} sign="THEATER 3" glow="#2b0d45" />
    <Plant position={[-3.4, 0, -2.2]} scale={1.2} />
    {seesaw !== undefined && <Seesaw position={[0, 0, -0.2]} tilt={seesaw} />}
  </Room>
);

const SidewalkSet: React.FC<{ camera: CameraShot; f: number; on?: number }> = ({ camera, f, on = 1 }) => (
  <Room camera={camera} mood="night" floor="#2a3242" wall="#1b2a5e" width={12} depth={7} wallPattern="brick" floorPattern="concrete">
    <Marquee position={[0, 2.55, -3.25]} text="NOW SHOWING" f={f} on={on} width={3.4} />
    <Door position={[-0.6, 0, -3.44]} glow={on > 0.5 ? "#ffcf6b" : "#2a2418"} color="#c0392b" />
    <Door position={[0.6, 0, -3.44]} glow={on > 0.5 ? "#ffcf6b" : "#2a2418"} color="#c0392b" />
    <Label text={"POPCORN\n& FILMS"} position={[-2.6, 1.5, -3.46]} width={1.0} fg="#ffd23f" bg="#1d1a1a" />
    <Label text="TICKETS" position={[2.6, 1.5, -3.46]} width={1.0} fg="#ffffff" bg="#c0392b" />
    {[-4, 4].map((x) => (
      <group key={x}>
        <InkCylinder radius={0.05} height={2.6} position={[x, 1.3, -1.2]} color="#2c3a40" />
        <mesh position={[x, 2.65, -1.2]}>
          <sphereGeometry args={[0.16, 16, 16]} />
          <meshBasicMaterial color="#ffe9a0" toneMapped={false} />
        </mesh>
      </group>
    ))}
  </Room>
);

const SCREEN_W = 4.4;
const AuditoriumSet: React.FC<{ camera: CameraShot; f: number; dim?: number; spill?: number }> = ({ camera, f, dim = 0, spill }) => (
  <Room camera={camera} mood="dream" floor="#2b0d45" wall="#5a2a8a" width={8} depth={10} wallPattern="panel" floorPattern="carpet">
    <MovieScreen position={[0, 2.0, -4.9]} width={SCREEN_W} f={f} on={dim > 0.5 ? 0 : 1} />
    <CinemaSeats rows={4} cols={[-1.6, -1.05, -0.5, 0.05, 0.6, 1.15, 1.7]} z0={0} />
    {spill !== undefined && <CandySpill origin={[0.05, 0.5, -0.15]} t={spill} />}
  </Room>
);

const BOOTH_CASHIER: [number, number] = [-0.3, -1.25];
const BOOTH_DRAWER: [number, number, number] = [-0.15, 0.6, -0.6];
const BoxOfficeSet: React.FC<{ camera: CameraShot; take?: number; slam?: number; caseFill?: number; drawerSquash?: Vec3 }> = ({ camera, take = 0, slam = 0, caseFill, drawerSquash }) => (
  <Room camera={camera} mood="golden" floor="#7a4a1a" wall="#f2b630" stripe="#c0392b" width={6} depth={5} wallPattern="panel" floorPattern="tile" sun={{ x: -1.4, color: "#ffd27a", bars: 4 }}>
    <Label text="BOX OFFICE" position={[0, 2.15, -2.44]} width={1.4} fg="#ffffff" bg="#c0392b" />
    <Window position={[-1.4, 1.6, -2.44]} size={[1.0, 0.8]} sky="#ffcf6b" />
    <Door position={[1.7, 0, -2.44]} sign="STAFF" color="#8a3a1a" />
    <Counter position={[0, 0, -0.6]} size={[2.2, 0.55, 0.5]} color="#8a3a1a" top="#fff6dc" />
    <CashDrawer position={BOOTH_DRAWER} take={take} slam={slam} squash={drawerSquash} />
    <InkCylinder radius={0.08} height={0.12} position={[-0.75, 0.66, -0.55]} rotation={[0, 0, Math.PI / 2]} color="#ffb8ec" ink={0.008} />
    {caseFill !== undefined && <OpenBriefcase position={[0.55, 0.6, -0.6]} fill={caseFill} />}
    <Shelf position={[-2.2, 0, -2.1]} width={0.8} rows={2} color="#8a3a1a" seed={2} />
  </Room>
);

const STUDIO_MAN: [number, number] = [0.15, -1.6];
const StudioSet: React.FC<{ camera: CameraShot; drawer?: boolean; stamp?: number; stamped?: boolean; caseFill?: number }> = ({ camera, drawer, stamp, stamped, caseFill }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={8} depth={6} wallPattern="brick" floorPattern="carpet" sun={{ x: 1.4, color: "#8fb3ff", bars: 8 }}>
    <Board position={[-1.9, 1.65, -2.92]} cards={["OPENING\nWEEK", "BOX\nOFFICE", "FILM\nDEALS", "SEQUEL"]} width={1.5} height={1.0} color="#8a6a4a" />
    <Screen position={[0.6, 2.05, -2.9]} size={[1.5, 0.7]} text={"BIG STUDIO\nPICTURES"} glow="#5ad1ff" bg="#071226" />
    <Desk position={[0, 0, -0.9]} size={[1.7, 0.75, 0.8]} color="#d8e0ea" />
    {drawer && <CashDrawer position={[0, 0.78, -0.85]} divider />}
    {stamp !== undefined && (
      <>
        <Contract position={[0, 0.785, -0.85]} stamp={stamped ? 1 : 0} mark="70%" />
        <RubberStamp position={[0, 0.785, -0.85]} press={stamp} />
      </>
    )}
    {caseFill !== undefined && <OpenBriefcase position={[0.45, 0.78, -0.9]} fill={caseFill} />}
    <Lamp position={[-0.65, 0.78, -1.05]} color="#cfe0ff" />
    <Plant position={[3.0, 0, -2.3]} />
  </Room>
);

const StockroomSet: React.FC<{ camera: CameraShot; f: number; erupt?: number; count?: number }> = ({ camera, f, erupt, count = 1 }) => (
  <Room camera={camera} mood="daylight" floor="#d8e0ea" wall="#2aa198" stripe="#ffffff" width={7} depth={5} wallPattern="tile" floorPattern="concrete" sun={{ x: -1.8, color: "#fff6d8", bars: 3 }}>
    <PopcornMachine position={[0.5, 0, -1.4]} f={f} erupt={erupt} tag={countText("FOOD COST\n17¢", count)} />
    <Crates position={[-1.3, 0, -1.6]} count={2} color="#c9a26b" />
    <DollarCoin position={[-1.3, 1.2, -1.45]} />
    <Sack position={[-2.3, 0, -1.9]} />
    <Sack position={[-2.0, 0, -1.3]} rotationY={0.4} />
    <Sack position={[2.0, 0, -1.9]} rotationY={-0.3} />
    <Shelf position={[2.4, 0, -2.2]} width={0.8} rows={3} color="#1f7f78" seed={4} />
  </Room>
);

const OfficeSet: React.FC<{ camera: CameraShot; fill: number; appear?: number }> = ({ camera, fill, appear }) => (
  <Room camera={camera} mood="office" floor="#7d8a97" wall="#4fbf7a" stripe="#ffffff" width={7} depth={5} wallPattern="panel" floorPattern="wood" sun={{ x: 1.8, color: "#ffffff", bars: 5 }}>
    <Jar position={[-0.2, 0, -1.3]} label="MONEY" snack={0.2} fill={fill} band="SNACKS 20%" appear={appear} />
    <Jar position={[0.45, 0, -1.3]} label="PROFIT" snack={0.4} fill={fill} band="SNACKS 40%" appear={appear} />
    <Window position={[1.8, 1.7, -2.44]} size={[1.1, 0.9]} sky="#bfe6ff" />
    <Board position={[-1.9, 1.7, -2.42]} cards={["RENT", "STAFF", "POWER", "SCREEN"]} width={1.2} height={0.8} color="#8a6a4a" />
    <Plant position={[-2.8, 0, -1.9]} />
  </Room>
);

const CountingSet: React.FC<{ camera: CameraShot; spent: number }> = ({ camera, spent }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
    <CoinBoard position={[0, 1.55, -2.44]} spent={spent} size={1.3} />
    <Desk position={[0, 0, -1.2]} size={[1.6, 0.75, 0.6]} color="#2a163f" />
    {[-0.5, -0.3, 0.3, 0.5].map((x, i) => (
      <InkCylinder key={x} radius={0.06} height={0.06 + i * 0.03} position={[x, 0.78 + (0.06 + i * 0.03) / 2, -1.2]} color="#ffcc33" ink={0.006} />
    ))}
    <Lamp position={[-0.7, 0.78, -1.3]} color="#ffb8ec" />
    <Plant position={[2.6, 0, -1.9]} />
  </Room>
);

// ---------- stage wrappers ----------

type Grade = { blur?: number; truth?: number };
const lobby = (camera: CameraShot, f: number, puppets: PuppetPlacement[], grade: Grade = {}, seesaw?: number) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} {...grade} set={<LobbySet camera={camera} f={f} seesaw={seesaw} />} />
);
const sidewalk = (camera: CameraShot, f: number, puppets: PuppetPlacement[] = [], on = 1) => (
  <Stage bg={moodBackground("night")} camera={camera} puppets={puppets} set={<SidewalkSet camera={camera} f={f} on={on} />} />
);
const auditorium = (camera: CameraShot, f: number, puppets: PuppetPlacement[], grade: Grade = {}, dim = 0, spill?: number) => (
  <Stage bg={moodBackground("dream")} camera={camera} puppets={puppets} {...grade} set={<AuditoriumSet camera={camera} f={f} dim={dim} spill={spill} />} />
);
const boxOffice = (camera: CameraShot, puppets: PuppetPlacement[], extra: { take?: number; slam?: number; caseFill?: number; drawerSquash?: Vec3 } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} {...grade} set={<BoxOfficeSet camera={camera} {...extra} />} />
);
const studio = (camera: CameraShot, puppets: PuppetPlacement[], extra: { drawer?: boolean; stamp?: number; stamped?: boolean; caseFill?: number } = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("cold")} camera={camera} puppets={puppets} {...grade} set={<StudioSet camera={camera} {...extra} />} />
);

const CASHIER_AT: [number, number] = [0, -1.85];
const cashierPose = (f: number, extra: Partial<PuppetPose> = {}): PuppetPose => ({ expression: "excited", lookX: 0, bob: breathe(f + 4), ...extra });
const SEAT_Z = 0.05;

// ---------- shots ----------

// Macro: the nine-dollar bucket on the counter.
const BucketMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.25, 1.12, -0.35], [0.33, 1.06, -0.6], f / 41), target: [0.45, 0.92, -1.2], fov: 38 };
  return lobby(cam, f, [pup("cashier", CASHIER, CASHIER_AT, cashierPose(f))], { blur: 3 });
};

const YouPay: React.FC = () => {
  const f = useShotFrame();
  return lobby(medium(-0.2, 0.2, f / 32, -0.4), f, [
    pup("you", YOU, [-0.45, 0.2], { expression: "shocked", hold: POPCORN_R, armR: HOLD, lookX: 0.6, bob: breathe(f) }),
    pup("buddy", BUDDY, [0.45, 0.3], { expression: "skeptical", lookX: -1, ...ARMS_CROSSED, bob: breathe(f + 8) }),
    pup("cashier", CASHIER, CASHIER_AT, cashierPose(f)),
  ]);
};

const BuddyRant: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "buddy", useFinalFrame());
  const flap = Math.sin(f / 4) * 20;
  return lobby(close(0.45, 0.3, f / 58, 0.25), f, [
    pup("buddy", BUDDY, [0.45, 0.3], { expression: "skeptical", mouthOpen: talking ? talk(f) : 0, armL: [70 + flap, -30], armR: [60 - flap, -40], lookX: -0.4, headTilt: Math.sin(f / 7) * 6 }),
  ], { blur: 6 });
};

const BuddyReveal: React.FC = () => {
  const f = useShotFrame();
  const talking = speaking(TIMING, "buddy", useFinalFrame());
  const open = Easing.out(Easing.back(2))(ramp(f, 2, 12));
  return lobby(medium(0.45, 0.3, f / 34, 0.3), f, [
    pup("you", YOU, [-0.45, 0.2], { expression: "skeptical", hold: POPCORN_R, armR: HOLD, lookX: 1, bob: breathe(f) }),
    pup("buddy", BUDDY, [0.45, 0.3], { expression: "smug", mouthOpen: talking ? talk(f) : 0, hold: CANDY_R, armR: [10 + open * 100, -60], armL: [open * 50, -10], lookX: -0.5 }),
  ]);
};

// Low angle: the buddy struts past the marquee with candy in hand.
const SidewalkStrut: React.FC = () => {
  const f = useShotFrame();
  const p = ramp(f + 8, 0, 61);
  const x = interpolate(p, [0, 1], [-2.4, 0.6]);
  const cam: CameraShot = { position: lerp3([-1.4, 0.35, 2.8], [-0.4, 0.4, 2.6], p), target: lerp3([-1.0, 1.4, -1.0], [0.2, 1.5, -1.0], p), fov: 50 };
  return sidewalk(cam, f, [pup("buddy", BUDDY, [x, -0.6], { view: "side", facing: 1, hold: CANDY_R, armR: CARRY, expression: "smug", ...walk(f * 1.3) })]);
};

// Gag: he drops into his seat and candy rains out of his jacket.
const CandyRain: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 0.95, -2.3], [0.25, 0.9, -2.0], (f + 8) / 64), target: [-0.2, 0.5, 0], fov: 42 };
  const sat = f > 6;
  return auditorium(cam, f, [
    pup("buddy", BUDDY, [0.05, SEAT_Z], { view: "front", sit: sat, expression: f < 22 ? "excited" : "smug", armL: [40, -30], armR: [40, -30], bob: sat ? breathe(f) : 0.04 }),
    pup("you", YOU, [-0.5, SEAT_Z], { sit: true, expression: "skeptical", lookX: 1, hold: POPCORN_R, armR: HOLD }),
  ], {}, 0, ramp(f, 6, 30));
};

// Over the shoulder: two heads small at the bottom edge, the giant screen ahead.
const BackRow: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.35, 2.6], [-0.45, 1.32, 2.3], f / 46), target: [0.0, 1.5, -4.9], fov: 46 };
  return auditorium(cam, f, [
    pup("you", YOU, [-0.5, SEAT_Z], { view: "back", sit: true, expression: "neutral" }),
    pup("buddy", BUDDY, [0.05, SEAT_Z], { view: "back", sit: true, expression: "neutral", headTilt: Math.sin(f / 5) * 4 }),
  ]);
};

const SEED_AT: [number, number] = [0.5, -1.3];
// The cashier counts the ticket cash; the man in the suit waits by the staff door (the seed).
const Counting: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 3.2], [0.05, 1.3, 2.85], (f + 8) / 59), target: [0.1, 0.95, -1.0], fov: 42 };
  return boxOffice(cam, [
    pup("cashier", CASHIER, BOOTH_CASHIER, { expression: "neutral", armL: [20 + Math.abs(Math.sin(f / 3)) * 25, -70], armR: [15, -60], lookX: 0, bob: breathe(f) }),
    pup("studio", STUDIO, SEED_AT, { expression: "smug", hold: CASE_R, armR: HANG, lookX: -1, bob: breathe(f + 5) }),
  ]);
};

// Low angle: the suit strides in, profile.
const SuitWalksIn: React.FC = () => {
  const f = useShotFrame();
  const x = interpolate(ramp(f, 0, 36), [0, 1], [1.5, 0.5]);
  const cam: CameraShot = { position: lerp3([0.0, 1.15, 2.6], [0.1, 1.1, 2.3], f / 43), target: [0.5, 1.0, -1.0], fov: 46 };
  return boxOffice(cam, [
    pup("cashier", CASHIER, BOOTH_CASHIER, { expression: "skeptical", lookX: 1, armL: [20, -70], armR: [15, -60] }),
    pup("studio", STUDIO, [x, -1.05], { view: f < 36 ? "side" : "front", facing: -1, hold: CASE_R, armR: f < 36 ? [8, 10] : HANG, expression: "smug", ...(f < 36 ? walk(f * 1.2) : {}) }),
  ]);
};

// Top-down: half the cash goes into the briefcase.
const Scoop: React.FC = () => {
  const f = useShotFrame();
  const take = Easing.inOut(Easing.cubic)(ramp(f, 4, 34));
  const cam: CameraShot = { position: lerp3([0.2, 1.8, -0.42], [0.2, 1.65, -0.5], f / 40), target: [0.2, 0.6, -0.62], fov: 46 };
  return boxOffice(cam, [], { take, caseFill: ramp(f, 14, 36) });
};

// The drawer slams; the cashier is left staring.
const CashierShock: React.FC = () => {
  const f = useShotFrame();
  const slam = Easing.out(Easing.cubic)(ramp(f, 2, 7));
  return boxOffice(close(BOOTH_CASHIER[0], BOOTH_CASHIER[1], f / 35, 0.2), [
    pup("cashier", CASHIER, BOOTH_CASHIER, { expression: "shocked", armL: [40, -20], armR: [40, -20], headTilt: -6, bob: f < 8 ? 0.03 : 0 }),
  ], { take: 1, slam, drawerSquash: squash(f, 4, 0.3) }, { blur: 6, truth: ramp(f, 6, 30) * 0.5 });
};

const StudioDesk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 1.5, 3.4], [0.35, 1.45, 3.0], (f + 8) / 48), target: [0.1, 1.0, -1.2], fov: 40 };
  return studio(cam, [pup("studio", STUDIO, STUDIO_MAN, { expression: "smug", armL: [30 + Math.sin(f / 4) * 10, -60], armR: [30, -60], lookX: 0, bob: breathe(f) })], { drawer: true });
};

// Macro: the ticket drawer, divided down the middle.
const SplitDrawer: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.8, 0.95], [0.0, 1.7, 0.75], f / 43), target: [0, 0.85, -0.85], fov: 40 };
  return studio(cam, [], { drawer: true });
};

const StudioGloat: React.FC = () => {
  const f = useShotFrame();
  const lift = Easing.out(Easing.back(2))(ramp(f, 2, 12));
  return studio(medium(STUDIO_MAN[0], STUDIO_MAN[1], f / 35, -0.4), [
    pup("studio", STUDIO, STUDIO_MAN, { expression: "excited", hold: CASE_R, armR: [lift * 140, -10], armL: [20, -40], lookX: 0.3, bob: breathe(f) }),
  ], { drawer: true });
};

// Top-down: the 70% stamp.
const Stamp70: React.FC = () => {
  const f = useShotFrame();
  const press = f < 24 ? Easing.in(Easing.quad)(ramp(f, 14, 24)) : 1 - Easing.out(Easing.quad)(ramp(f, 27, 37));
  const cam: CameraShot = { position: lerp3([0.02, 1.85, -0.72], [0.02, 1.7, -0.78], f / 51), target: [0, 0.78, -0.86], fov: 44 };
  return studio(cam, [], { stamp: press, stamped: f >= 24 });
};

// Wide exterior: the building the ticket has to pay for.
const Building: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.6, 3.0], [0, 1.9, 4.6], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 49))), target: [0, 1.9, -3.0], fov: 50 };
  return sidewalk(cam, f, [pup("x1", EXTRAS[1], [-1.6, 0.4], { expression: "neutral", hold: POPCORN_R, armR: HOLD, lookX: 1, bob: breathe(f) })]);
};

const Staff: React.FC = () => {
  const f = useShotFrame();
  return lobby(medium(0, -0.5, f / 36, 0.4), f, [
    pup("cashier", CASHIER, [-0.4, -0.5], cashierPose(f, { armL: [130 + Math.sin(f / 3) * 15, -20] })),
    pup("manager", MANAGER, [0.45, -0.5], { expression: "neutral", lookX: -0.5, ...ARMS_CROSSED, bob: breathe(f + 3) }),
  ]);
};

const GiantScreen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.1, 3.6], [0.3, 1.25, 2.9], f / 35), target: [0, 2.0, -4.9], fov: 52 };
  return auditorium(cam, f, []);
};

// The snack counter: one drawer, all theater.
const SnackDrawer: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.9, 1.3], [-0.4, 1.75, 1.0], (f + 8) / 50), target: [-0.6, 0.85, -1.2], fov: 42 };
  return (
    <Stage
      bg={moodBackground("warm")}
      camera={cam}
      puppets={[pup("cashier", CASHIER, CASHIER_AT, cashierPose(f, { expression: "smug" }))]}
      set={
        <>
          <LobbySet camera={cam} f={f} />
          <CashDrawer position={[-0.6, COUNTER_TOP + 0.01, -1.15]} label={"SNACK CASH\nALL THEATER"} />
        </>
      }
    />
  );
};

// The studio man at the snack counter with an empty briefcase.
const StudioShrug: React.FC = () => {
  const f = useShotFrame();
  const shrug = Math.sin(ramp(f, 2, 18) * Math.PI);
  return lobby(medium(0.3, 0.2, f / 34, 0.3), f, [
    pup("studio", STUDIO, [0.5, 0.2], { expression: "skeptical", hold: CASE_R, armR: [20 + shrug * 50, -30], armL: [20 + shrug * 70, -60], headTilt: shrug * 8, lookX: -0.5 }),
    pup("cashier", CASHIER, CASHIER_AT, cashierPose(f, { expression: "smug", ...ARMS_CROSSED })),
  ]);
};

const stockroom = (camera: CameraShot, f: number, puppets: PuppetPlacement[] = [], erupt?: number, count?: number) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<StockroomSet camera={camera} f={f} erupt={erupt} count={count} />} />
);

const SnackDollar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.0, 1.4, 1.2], [-1.15, 1.35, 0.7], (f + 8) / 57), target: [-1.3, 1.15, -1.45], fov: 40 };
  return stockroom(cam, f);
};

const FoodCost: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.75, 0.9, 1.0], [0.72, 0.75, 0.45], Easing.inOut(Easing.quad)(ramp(f, 0, 47))), target: [0.72, 0.6, -1.1], fov: 40 };
  return stockroom(cam, f, [], undefined, ramp(f, 0, 36));
};

// Gag: the machine erupts, burying everything in popcorn.
const Erupt: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.5, 3.4], [0.25, 1.6, 3.9], f / 43), target: [0.4, 1.3, -1.2], fov: 44 };
  return stockroom(cam, f, [pup("cashier", CASHIER, [-0.5, -0.6], { expression: f < 6 ? "neutral" : "shocked", armL: [150, -20], armR: [150, -20], bob: f > 6 ? Math.abs(Math.sin(f / 3)) * 0.05 : 0 })], ramp(f, 2, 40));
};

const office = (camera: CameraShot, fill: number, puppets: PuppetPlacement[] = [], appear?: number) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} set={<OfficeSet camera={camera} fill={fill} appear={appear} />} />
);

const Jars: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.45, 1.4, 3.5], [0.4, 1.35, 3.1], (f + 8) / 72), target: [0.4, 0.75, -1.2], fov: 50 };
  return office(cam, Easing.out(Easing.cubic)(ramp(f, 2, 40)), [pup("manager", MANAGER, [1.05, -0.9], { expression: "neutral", armL: [100, -10], lookX: -0.8, bob: breathe(f) })], f - 12);
};

const ProfitJar: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.5, 0.65, 1.4], [0.45, 0.6, 1.1], f / 59), target: [0.45, 0.25, -1.3], fov: 42 };
  return office(cam, 1);
};

const counting = (camera: CameraShot, spent: number, puppets: PuppetPlacement[] = []) => (
  <Stage bg={moodBackground("neon")} camera={camera} puppets={puppets} set={<CountingSet camera={camera} spent={spent} />} />
);

const CountRoom: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.4, 2.6], [-0.4, 1.4, 2.2], (f + 8) / 54), target: [0, 1.2, -1.6], fov: 44 };
  return counting(cam, 0, [pup("manager", MANAGER, [0.1, -1.7], { expression: "skeptical", armL: [20 + Math.abs(Math.sin(f / 3)) * 30, -70], armR: [15, -60], lookX: 0, bob: breathe(f) })]);
};

const FourCents: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.1, 1.5], [0, 1.1, 1.2], f / 73), target: [0, 1.0, -2.44], fov: 50 };
  return counting(cam, ramp(f, 4, 48));
};

const Balance: React.FC = () => {
  const f = useShotFrame();
  const tilt = Easing.out(Easing.back(1.6))(ramp(f, 14, 34));
  const cam: CameraShot = { position: lerp3([0.1, 1.05, 3.2], [0.05, 1.0, 2.9], (f + 8) / 82), target: [0, 0.75, -0.2], fov: 54 };
  return lobby(cam, f, [], {}, tilt);
};

const crowd = (f: number): PuppetPlacement[] =>
  [-1.6, -1.05, -0.5, 0.05, 0.6, 1.15, 1.7].map((x, i) =>
    pup(`a${i}`, i === 2 ? YOU : i === 3 ? BUDDY : EXTRAS[i % EXTRAS.length], [x, SEAT_Z], {
      sit: true,
      expression: i === 3 ? "smug" : i % 2 ? "excited" : "neutral",
      hold: i === 3 ? CANDY_R : POPCORN_R,
      armR: HOLD,
      lookX: 0,
      blink: (f + i * 7) % 60 < 3,
      bob: breathe(f + i * 4) * 0.5,
    }),
  );

const FullHouse: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 2.3, -3.2], [0, 2.1, -2.8], (f + 8) / 48), target: [0, 0.6, 0.2], fov: 50 };
  return auditorium(cam, f, crowd(f));
};

const SeatMacro: React.FC = () => {
  const f = useShotFrame();
  return auditorium(seatedClose(-0.5, SEAT_Z, f / 46, -0.15), f, [pup("you", YOU, [-0.5, SEAT_Z], { sit: true, expression: "excited", hold: POPCORN_R, armR: HOLD, lookX: 0.2, bob: breathe(f) })], { blur: 6 });
};

const BuddyChew: React.FC = () => {
  const f = useShotFrame();
  return auditorium(seatedClose(0.05, SEAT_Z, f / 63, 0.2), f, [pup("buddy", BUDDY, [0.05, SEAT_Z], { sit: true, expression: "smug", hold: CANDY_R, armR: [20, -100], mouthOpen: Math.abs(Math.sin(f / 3)) * 0.4, lookX: 0.2 })], { blur: 6, truth: ramp(f, 20, 50) * 0.5 });
};

const StudioPaid: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.25, 1.6], [-0.2, 1.22, 1.3], (f + 8) / 47), target: [0.2, 1.0, -1.2], fov: 40 };
  return studio(cam, [pup("studio", STUDIO, STUDIO_MAN, { expression: "smug", armL: [80, -30], armR: [80, -30], lookX: -0.4, bob: breathe(f) })], { caseFill: 1 });
};

const BuddyDark: React.FC = () => {
  const f = useShotFrame();
  return auditorium(seatedClose(0.05, SEAT_Z, f / 36, -0.25), f, [pup("buddy", BUDDY, [0.05, SEAT_Z], { sit: true, expression: f < 20 ? "smug" : "shocked", hold: CANDY_R, armR: HOLD, lookX: f < 20 ? 0 : -0.6 })], { blur: 6, truth: 0.7 }, f > 18 ? 1 : 0);
};

const MarqueeFlicker: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.7, 1.2], [0.3, 1.9, 0.6], f / 34), target: [0, 2.5, -3.2], fov: 44 };
  const on = [0, 3, 7, 12, 20].some((k) => f >= k && f < k + 2) ? 0 : 1;
  return sidewalk(cam, f, [], on);
};

const NewCustomer: React.FC = () => {
  const f = useShotFrame();
  const take = ramp(f, 16, 26);
  return lobby(medium(-0.2, 0.2, (f + 8) / 59, -0.4), f, [
    pup("newbie", NEWBIE, [-0.3, 0.1], { expression: take > 0.5 ? "excited" : "neutral", hold: take > 0.5 ? POPCORN_R : undefined, armR: take > 0.5 ? HOLD : [40, -40], lookX: 0.4, bob: breathe(f) }),
    pup("cashier", CASHIER, CASHIER_AT, cashierPose(f, { armR: [60, -40] })),
  ]);
};

const BucketLoop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.6, 1.1, -0.3], [0.5, 1.05, -0.55], f / 38), target: [0.45, 0.92, -1.2], fov: 38 };
  return lobby(cam, f, [pup("cashier", CASHIER, CASHIER_AT, cashierPose(f))], { blur: 3 });
};

const LightsOn: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0, 1.5, 2.2], [0, 1.9, 4.4], Easing.inOut(Easing.quad)(ramp(f + 8, 0, 64))), target: [0, 2.0, -3.0], fov: 48 };
  return sidewalk(cam, f, [
    pup("newbie", NEWBIE, [-0.7, -1.6], { view: "back", expression: "neutral", hold: POPCORN_R, armR: HOLD }),
    pup("x3", EXTRAS[3], [0.8, -1.4], { view: "back", expression: "neutral" }),
  ]);
};

const SHOTS: Shot[] = [
  [0, 41, BucketMacro, false],
  [41, 73, YouPay, false],
  [73, 131, BuddyRant, false],
  [131, 165, BuddyReveal, false],
  [165, 218, SidewalkStrut, true],
  [218, 274, CandyRain, true],
  [274, 320, BackRow, false],
  [320, 379, Counting, true],
  [379, 422, SuitWalksIn, false],
  [422, 462, Scoop, false],
  [462, 497, CashierShock, false],
  [497, 537, StudioDesk, true],
  [537, 580, SplitDrawer, false],
  [580, 615, StudioGloat, false],
  [615, 666, Stamp70, false],
  [666, 707, Building, true],
  [707, 743, Staff, true],
  [743, 778, GiantScreen, true],
  [778, 820, SnackDrawer, true],
  [820, 854, StudioShrug, false],
  [854, 903, SnackDollar, true],
  [903, 950, FoodCost, false],
  [950, 993, Erupt, false],
  [993, 1057, Jars, true],
  [1057, 1116, ProfitJar, false],
  [1116, 1162, CountRoom, true],
  [1162, 1235, FourCents, false],
  [1235, 1309, Balance, true],
  [1309, 1349, FullHouse, true],
  [1349, 1395, SeatMacro, false],
  [1395, 1458, BuddyChew, false],
  [1458, 1497, StudioPaid, true],
  [1497, 1533, BuddyDark, true],
  [1533, 1567, MarqueeFlicker, true],
  [1567, 1618, NewCustomer, true],
  [1618, 1656, BucketLoop, false],
  [1656, TIMING.totalFrames, LightsOn, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.16, until: 165 },
  { at: 4, src: sfx("credit-blip"), volume: 0.4 },
  { at: 44, src: sfx("chime"), volume: 0.3 },
  { at: 133, src: sfx("paper"), volume: 0.5 },
  { at: 165, src: sfx("ambience"), volume: 0.12, until: 218 },
  { at: 218, src: sfx("hum"), volume: 0.06, until: 320 },
  ...Array.from({ length: 7 }, (_, k) => ({ at: 226 + k * 3, src: sfx("tick"), volume: 0.5 })),
  { at: 236, src: sfx("paper"), volume: 0.4 },
  { at: 320, src: sfx("hum"), volume: 0.08, until: 497 },
  ...Array.from({ length: 5 }, (_, k) => ({ at: 326 + k * 9, src: sfx("paper"), volume: 0.25 })),
  { at: 380, src: sfx("door"), volume: 0.4 },
  // The twist: a riser up to "takes half", a sting on it.
  { at: 400, src: sfx("riser"), volume: 0.25 },
  { at: 448, src: sfx("sting"), volume: 0.4 },
  { at: 379, src: sfx("tick"), volume: 0.5 },
  { at: 391, src: sfx("tick"), volume: 0.5 },
  { at: 403, src: sfx("tick"), volume: 0.5 },
  { at: 424, src: sfx("drawer"), volume: 0.45 },
  { at: 428, src: sfx("bill-whirr"), volume: 0.5 },
  { at: 464, src: sfx("boom"), volume: 0.45 },
  { at: 466, src: sfx("near-miss"), volume: 0.35 },
  { at: 497, src: sfx("whoosh"), volume: 0.4 },
  { at: 497, src: sfx("hum"), volume: 0.12, until: 666 },
  { at: 584, src: sfx("chime"), volume: 0.35 },
  { at: 638, src: sfx("stamp"), volume: 0.85 },
  { at: 666, src: sfx("ambience"), volume: 0.14, until: 707 },
  { at: 707, src: sfx("ambience"), volume: 0.14, until: 854 },
  { at: 820, src: sfx("near-miss"), volume: 0.25 },
  { at: 854, src: sfx("hum"), volume: 0.08, until: 993 },
  ...Array.from({ length: 12 }, (_, k) => ({ at: 952 + k * 3, src: sfx("tick"), volume: 0.45 })),
  { at: 954, src: sfx("boom"), volume: 0.35 },
  { at: 997, src: sfx("credit-blip"), volume: 0.35 },
  { at: 1005, src: sfx("pop"), volume: 0.5 },
  { at: 1116, src: sfx("hum"), volume: 0.1, until: 1235 },
  ...Array.from({ length: 8 }, (_, k) => ({ at: 1168 + k * 5, src: sfx("credit-blip"), volume: 0.3 })),
  { at: 1250, src: sfx("reel-stop"), volume: 0.6 },
  { at: 1309, src: sfx("ambience"), volume: 0.15, until: 1497 },
  { at: 1458, src: sfx("chime"), volume: 0.3 },
  { at: 1515, src: sfx("tape-stop"), volume: 0.4 },
  { at: 1533, src: sfx("tick"), volume: 0.5 },
  { at: 1540, src: sfx("tick"), volume: 0.5 },
  { at: 1567, src: sfx("ambience"), volume: 0.15, until: TIMING.totalFrames },
  { at: 1585, src: sfx("credit-blip"), volume: 0.4 },
  { at: 1660, src: sfx("chime"), volume: 0.4 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 379, volume: 0.2 },
  { src: MUSIC_FILES.mystery, from: 379, to: 778, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 778, to: 1235, volume: 0.3 },
  { src: MUSIC_FILES.mystery, from: 1235, to: 1567, volume: 0.28 },
  { src: MUSIC_FILES.lounge, from: 1567, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
