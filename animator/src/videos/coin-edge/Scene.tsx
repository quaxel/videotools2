import React from "react";
import {
  Burst,
  CameraShot,
  Chair,
  Counter,
  Door,
  foleyCues,
  faceChange,
  Halo,
  Headline,
  InkBox,
  InkCylinder,
  jump,
  Label,
  lerp3,
  Mood,
  moodBackground,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shot,
  sitDown,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  handWorld,
} from "../../engine";
import { Candlestick } from "../../three/ThroneRoomSet";
import {
  Beam,
  Brazier,
  ClippingJar,
  Coin,
  EdgeDie,
  FlyingSliver,
  Furnace,
  HandBell,
  LeadedWindow,
  Loaf,
  RollingCoin,
  Scales,
  Scissors,
  ScrewPress,
  Shopfront,
  Sliver,
  Table,
  Thumb,
  TowerBackdrop,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The Coin That Wrote a Warning on Its Edge": a 1690s London clipper snips silver off ragged hammered coins and
// spends them at full value. The Mint in the Tower strikes new coins by machine with DECUS ET TUTAMEN round the edge;
// he clips one anyway, the baker's thumb finds the sentence cut short, the Mint's men burst in, and Isaac Newton
// waits in the Tower. The catch is a dramatisation of why the lettered edge works (plan.json format_note).
// References: guide/references/london-mint-1696.md.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "coin-edge";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const cam = (from: Vec3, to: Vec3, target: Vec3, fov: number, p: number): CameraShot => ({ position: lerp3(from, to, p), target, fov });
const camT = (from: Vec3, to: Vec3, t0: Vec3, t1: Vec3, fov: number, p: number): CameraShot => ({ position: lerp3(from, to, p), target: lerp3(t0, t1, p), fov });
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());

// ---------- cast ----------

const CLIPPER: PuppetLook = { skin: "#e8c0a0", hair: "#2a1e16", outfit: "#d8c8a8", vest: "#6a4a32", hat: "#2a2420", stubble: "#2a1e16", build: "narrow", pants: "#3a2a20" };
const CRIER: PuppetLook = { skin: "#f0c8a8", hair: "#e8e4dc", outfit: "#f2e6c8", vest: "#b8242a", hat: "#1a1a22", beard: "#e8e4dc", pants: "#2a2420" };
const BAKER: PuppetLook = { skin: "#f2cfb0", hair: "#7a3a1e", outfit: "#e0a86a", long: true, skirt: true, apron: "#fbf6ea", kerchief: "#c84a3a" };
const MERCHANT: PuppetLook = { skin: "#d8a47a", hair: "#3a2a1e", outfit: "#f2e6c8", vest: "#2a7a4a", build: "broad", hat: "#3a2a1e", pants: "#4a3a2a" };
const MINT_A: PuppetLook = { skin: "#eab890", hair: "#5a3a24", outfit: "#d8d0bc", vest: "#1e2a5a", hat: "#14141c", build: "broad", pants: "#1e2030" };
const MINT_B: PuppetLook = { skin: "#9a6a48", hair: "#1a1410", outfit: "#d8d0bc", vest: "#1e2a5a", hat: "#14141c", pants: "#1e2030" };
const WORKER_A: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#e8dcc8", apron: "#5a4030", build: "broad", pants: "#3a2a20" };
const WORKER_B: PuppetLook = { skin: "#f0c8a0", hair: "#8a5a2a", outfit: "#e8dcc8", apron: "#5a4030", pants: "#3a2a20" };
const NEWTON: PuppetLook = { skin: "#f2d2b4", hair: "#f2efe8", long: true, outfit: "#f2ede0", vest: "#2a2430", pants: "#2a2430" };

const pose = (p: Partial<PuppetPose>) => ({ expression: "neutral", ...p }) as PuppetPose;
const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: pose(p) });

// ---------- lights ----------

const pointsLight = (pts: { position: Vec3; color: string; strength: number; range: number }[], tint?: string): PuppetLight => ({ points: pts, tint, tintAmount: tint ? 0.06 : 0 });
const flick = (f: number, seed = 0) => 0.85 + 0.15 * Math.sin(f * 0.6 + seed) * Math.sin(f * 0.23 + seed * 2);

// ---------- locations ----------

type SetProps = { camera: CameraShot; f: number; children?: React.ReactNode };

// The clipper's garret (amber): brick, beams, a work bench with a candle, the jar and coins, and a leaded window
// onto the Tower at night (the seed: that is where the Mint is).
const BENCH: Vec3 = [0, 0, -1.0];
const BENCH_H = 0.6;
const CANDLE: Vec3 = [-0.48, BENCH_H, -1.12];
const JAR: Vec3 = [0.42, BENCH_H, -1.02];
const COIN_AT: Vec3 = [0.02, BENCH_H + 0.006, -0.86];
const WIN: Vec3 = [1.35, 1.55, -2.42];
const CLIP_AT: [number, number] = [0, -1.5];
const BRAZIER: Vec3 = [-1.45, 0, -1.4];
const GarretSet: React.FC<SetProps & { jar?: number; coins?: boolean; melt?: number; candles?: number }> = ({ camera, f, jar = 0.35, coins = true, melt = 0, children }) => (
  <Room camera={camera} mood="warm" floor="#6a4a32" wall="#8a5a3a" width={6} depth={5} wallPattern="brick" floorPattern="wood">
    <TowerBackdrop position={[WIN[0], WIN[1], -2.62]} width={2.2} night smoke={1} />
    <InkBox size={[2.6, 1.2, 0.12]} position={[WIN[0], WIN[1] + 1.15, -2.45]} color="#8a5a3a" ink={0} />
    <LeadedWindow position={WIN} size={[1.0, 0.9]} />
    {[-1.6, 0, 1.6].map((z, i) => (
      <Beam key={i} position={[0, 2.75, z - 0.6]} length={6} />
    ))}
    <Table position={BENCH} size={[1.3, BENCH_H, 0.62]} />
    <Candlestick position={CANDLE} frame={f} height={0.36} seed={2} />
    <ClippingJar position={JAR} fill={jar} />
    {coins && (
      <>
        <Coin position={COIN_AT} rotation={[-Math.PI / 2, 0, 0.3]} r={0.05} kind="hammered" seed={3} />
        <Coin position={[-0.18, BENCH_H + 0.004, -0.95]} rotation={[-Math.PI / 2, 0, 1.2]} r={0.045} kind="hammered" seed={5} />
        <Coin position={[0.2, BENCH_H + 0.004, -1.12]} rotation={[-Math.PI / 2, 0, 2.2]} r={0.048} kind="hammered" seed={8} />
        <Sliver position={[0.1, BENCH_H + 0.006, -0.8]} rotation={[Math.PI / 2, 0, 1]} size={0.014} />
        <Sliver position={[-0.08, BENCH_H + 0.006, -0.78]} rotation={[Math.PI / 2, 0, 2.4]} size={0.012} />
      </>
    )}
    <InkBox size={[0.4, 0.45, 0.4]} position={[BRAZIER[0], 0.225, BRAZIER[2]]} color="#5a3a22" ink={0.008} />
    <Brazier position={[BRAZIER[0], 0.45, BRAZIER[2]]} frame={f} melt={melt} />
    <InkBox size={[0.9, 0.9, 0.5]} position={[-2.2, 0.45, -2.1]} color="#6a4428" ink={0.01} />
    {children}
  </Room>
);
const garretLight = (f: number, extra: { position: Vec3; color: string; strength: number; range: number }[] = []): PuppetLight =>
  pointsLight([{ position: [CANDLE[0], CANDLE[1] + 0.4, CANDLE[2] + 0.1] as Vec3, color: "#ffa850", strength: 2.6 * flick(f), range: 1.8 }, ...extra].slice(0, 2), "#ffb070");

const garret = (camera: CameraShot, f: number, puppets: PuppetPlacement[], opts: { jar?: number; coins?: boolean; melt?: number; blur?: number; energy?: number; light?: PuppetLight; foreground?: React.ReactNode } = {}, children?: React.ReactNode) => (
  <Stage
    set={
      <GarretSet camera={camera} f={f} jar={opts.jar} coins={opts.coins} melt={opts.melt}>
        {children}
      </GarretSet>
    }
    camera={camera}
    bg={moodBackground("warm")}
    puppets={puppets}
    light={opts.light ?? garretLight(f)}
    blur={opts.blur}
    energy={opts.energy}
    foreground={opts.foreground}
  />
);

// The market street (teal daylight): brick shopfronts with hanging signs, cobbles, a stall.
const STALL: Vec3 = [0.9, 0, -1.2];
const StreetSet: React.FC<SetProps> = ({ camera, f, children }) => (
  <Room camera={camera} mood="daylight" floor="#8c8a84" wall="#9ab8c0" width={10} depth={7} wallPattern="plaster" floorPattern="concrete" sun={{ x: -1.2, color: "#fff2c8", bars: 4 }}>
    <Shopfront position={[-2.15, 0, -3.25]} sign="key" color="#a84a32" swing={Math.sin(f * 0.05) * 0.08} />
    <Shopfront position={[0, 0, -3.25]} sign="boot" color="#7a8a6a" swing={Math.sin(f * 0.05 + 1) * 0.08} awning="#2a8a8a" />
    <Shopfront position={[2.15, 0, -3.25]} sign="loaf" color="#b86a3a" swing={Math.sin(f * 0.05 + 2) * 0.08} />
    <Counter position={STALL} size={[1.3, 0.55, 0.55]} color="#7a5232" top="#c8a878" />
    <group position={[STALL[0], 1.75, STALL[2] - 0.1]} rotation={[0.35, 0, 0]}>
      <InkBox size={[1.5, 0.04, 0.9]} color="#2a8a8a" ink={0.008} />
    </group>
    {[-0.6, 0.6].map((dx) => (
      <InkBox key={dx} size={[0.05, 1.7, 0.05]} position={[STALL[0] + dx, 0.85, STALL[2] + 0.22]} color="#4a3220" ink={0.006} />
    ))}
    {[-0.4, -0.15, 0.1, 0.35].map((dx, i) => (
      <Loaf key={dx} position={[STALL[0] + dx, 0.62, STALL[2] + (i % 2) * 0.08]} rotation={[0, i * 0.7, 0]} scale={0.8} />
    ))}
    {children}
  </Room>
);
const street = (camera: CameraShot, f: number, puppets: PuppetPlacement[], opts: { blur?: number; energy?: number; foreground?: React.ReactNode } = {}, children?: React.ReactNode) => (
  <Stage set={<StreetSet camera={camera} f={f}>{children}</StreetSet>} camera={camera} bg={moodBackground("daylight")} puppets={puppets} blur={opts.blur} energy={opts.energy} foreground={opts.foreground} />
);

// Outside the Tower (pale stone, blue sky): the painted keep behind a cobbled quay, a mooring post or two.
const TowerSet: React.FC<SetProps> = ({ camera, children }) => (
  <Room camera={camera} mood="daylight" floor="#9a968c" wall="#d8ecf6" width={14} depth={9} wallPattern="plain" floorPattern="concrete">
    <TowerBackdrop position={[0, 2.6, -4.35]} width={11} smoke={1} />
    {[-2.4, -0.8, 0.8, 2.4].map((x) => (
      <InkCylinder key={x} radius={0.1} height={0.7} position={[x, 0.35, -1.8]} color="#3a3a3e" ink={0.008} />
    ))}
    {children}
  </Room>
);

// Inside the Mint (red): brick, a furnace, the screw press worked by two men.
const PRESS: Vec3 = [0.25, 0, -1.3];
const PRESS_SCALE = 0.62;
const FURNACE: Vec3 = [-1.85, 0, -2.2];
const MintSet: React.FC<SetProps & { fly?: number; press?: number }> = ({ camera, f, fly = 0, press = 0, children }) => (
  <Room camera={camera} mood="alarm" floor="#4a3a32" wall="#6a3a2e" width={7} depth={5.5} wallPattern="brick" floorPattern="tile">
    <Furnace position={FURNACE} frame={f} />
    <group position={PRESS} scale={PRESS_SCALE}>
      <ScrewPress position={[0, 0, 0]} fly={fly} press={press} />
    </group>
    <Label text="ROYAL MINT" position={[0.25, 1.95, -2.68]} width={0.8} bg="#f2c230" />
    <InkBox size={[0.7, 0.5, 0.5]} position={[2.0, 0.25, -2.0]} color="#6a4428" ink={0.01} />
    {children}
  </Room>
);
const mintLight = (f: number): PuppetLight => pointsLight([{ position: [FURNACE[0] + 0.3, 0.8, FURNACE[2] + 1.0], color: "#ff8a3a", strength: 2.8 * flick(f, 1), range: 3.2 }], "#ff7a5a");
const mint = (camera: CameraShot, f: number, puppets: PuppetPlacement[], opts: { fly?: number; press?: number; blur?: number; energy?: number } = {}, children?: React.ReactNode) => (
  <Stage
    set={
      <MintSet camera={camera} f={f} fly={opts.fly} press={opts.press}>
        {children}
      </MintSet>
    }
    camera={camera}
    bg={moodBackground("alarm")}
    puppets={puppets}
    light={mintLight(f)}
    blur={opts.blur}
    energy={opts.energy}
  />
);

// The bakery (cream, golden sun): counter, bread shelves, the street door at the back left.
const COUNTER: Vec3 = [0.1, 0, -0.75];
const COUNTER_H = 0.6;
const TOP = COUNTER_H + 0.05; // counter surface (the top lip)
const BAKER_AT: [number, number] = [0.45, -1.35];
const BUYER_AT: [number, number] = [-0.75, -0.1];
const BDOOR: Vec3 = [-1.85, 0, -2.42];
const BakerySet: React.FC<SetProps & { mood: Mood; door?: number; tray?: number }> = ({ camera, f, mood, door = 0, tray = 0, children }) => (
  <Room camera={camera} mood={mood} floor="#c89a6a" wall="#f2e2b0" width={7} depth={5} wallPattern="wallpaper" floorPattern="tile" stripe="#c84a3a" sun={mood === "golden" ? { x: 1.4, color: "#ffe6a8", bars: 6 } : undefined}>
    <Counter position={COUNTER} size={[2.0, COUNTER_H, 0.6]} color="#8a5a32" top="#e8d8b8" />
    {[0, 1, 2].map((row) => (
      <group key={row}>
        <InkBox size={[2.2, 0.05, 0.36]} position={[0.9, 0.9 + row * 0.5, -2.3]} color="#7a5232" ink={0.008} />
        {Array.from({ length: 6 }, (_, i) => (
          <Loaf key={i} position={[0.05 + i * 0.34, 0.97 + row * 0.5, -2.28]} rotation={[0, (i + row) * 0.6, 0]} scale={0.85} />
        ))}
      </group>
    ))}
    <Door position={BDOOR} open={door} color="#5a3a22" frame="#3a2a1e" glow={mood === "cold" ? "#8fb3ff" : "#ffe6a8"} />
    {/* the tray of loaves at the counter's end; `tray` 0..1 tips it and they tumble */}
    {Array.from({ length: 4 }, (_, i) => {
      const t = ease(tray * 30, i * 3, 14 + i * 3);
      return <Loaf key={i} position={[-0.75 + i * 0.12 - t * 0.2, TOP + 0.06 - t * (TOP + 0.02) + Math.sin(t * Math.PI) * 0.15, COUNTER[2] + 0.1 + t * (0.35 + i * 0.08)]} rotation={[t * 3 * (i % 2 ? 1 : -1), i, t * 2]} scale={0.8} />;
    })}
    {children}
  </Room>
);
const bakery = (camera: CameraShot, f: number, puppets: PuppetPlacement[], opts: { mood?: Mood; door?: number; tray?: number; blur?: number; energy?: number; light?: PuppetLight; foreground?: React.ReactNode } = {}, children?: React.ReactNode) => {
  const mood = opts.mood ?? "golden";
  return (
    <Stage
      set={
        <BakerySet camera={camera} f={f} mood={mood} door={opts.door} tray={opts.tray}>
          {children}
        </BakerySet>
      }
      camera={camera}
      bg={moodBackground(mood)}
      puppets={puppets}
      light={opts.light}
      blur={opts.blur}
      energy={opts.energy}
      foreground={opts.foreground}
      truth={mood === "cold" ? 0.25 : 0}
    />
  );
};

// Newton's room in the Tower (deep blue night): panelled walls, a desk with a candle, scales and papers.
const NDESK: Vec3 = [0, 0, -1.15];
const NEWTON_AT: [number, number] = [0, -1.62];
const NCANDLE: Vec3 = [-0.5, 0.45, -1.1];
const NewtonSet: React.FC<SetProps> = ({ camera, f, children }) => (
  <Room camera={camera} mood="night" floor="#3a2a4a" wall="#2a3450" width={6} depth={5} wallPattern="panel" floorPattern="carpet">
    <Window position={[1.4, 1.65, -2.44]} size={[0.8, 1.0]} sky="#1a2a5a" />
    <Chair position={[NEWTON_AT[0], 0, NEWTON_AT[1] - 0.05]} color="#5a2a3a" />
    <Table position={NDESK} size={[1.5, 0.45, 0.7]} color="#5a3a24" />
    <Candlestick position={NCANDLE} frame={f} height={0.36} seed={4} />
    <Scales position={[0.48, 0.45, -1.05]} tip={Math.sin(f * 0.05) * 0.2} />
    <InkBox size={[0.3, 0.01, 0.22]} position={[0.02, 0.455, -0.95]} rotation={[0, 0.2, 0]} color="#f2ead2" ink={0.004} />
    <InkBox size={[1.2, 1.6, 0.3]} position={[-1.6, 0.8, -2.25]} color="#4a2e1e" ink={0.01} />
    {children}
  </Room>
);
const newtonLight = (f: number): PuppetLight => pointsLight([{ position: [NCANDLE[0], NCANDLE[1] + 0.45, NCANDLE[2] + 0.2], color: "#ffa850", strength: 2.6 * flick(f, 3), range: 1.8 }], "#8fa8ff");

// The mechanism room (purple dream): a stage for the giant coins.
const MechSet: React.FC<SetProps> = ({ camera, children }) => (
  <Room camera={camera} mood="dream" floor="#2a1040" wall="#3a1a5a" width={8} depth={6} wallPattern="plain" floorPattern="plain" stripe="#ff6fd8">
    {children}
  </Room>
);
const mech = (camera: CameraShot, children: React.ReactNode, opts: { blur?: number; energy?: number } = {}) => (
  <Stage set={<MechSet camera={camera} f={0}>{children}</MechSet>} camera={camera} bg={moodBackground("dream")} puppets={[]} blur={opts.blur} energy={opts.energy} />
);

// Today (magenta neon): a bedroom floor, a chair with jeans thrown over it.
const TodaySet: React.FC<SetProps> = ({ camera, children }) => (
  <Room camera={camera} mood="neon" floor="#6a4a7a" wall="#4a2a6a" width={6} depth={5} wallPattern="wallpaper" floorPattern="wood">
    <Chair position={[-0.6, 0, -1.4]} color="#2a8a8a" rotationY={0.4} />
    {/* jeans over the seat and hanging down the front */}
    <InkBox size={[0.36, 0.05, 0.44]} position={[-0.6, 0.39, -1.4]} rotation={[0, 0.4, 0]} color="#3a5a9a" ink={0.006} />
    <InkBox size={[0.34, 0.36, 0.05]} position={[-0.52, 0.22, -1.2]} rotation={[0.1, 0.4, 0]} color="#3a5a9a" ink={0.006} />
    <InkBox size={[0.12, 0.08, 0.01]} position={[-0.47, 0.3, -1.17]} rotation={[0.1, 0.4, 0]} color="#2a4a8a" ink={0.004} />
    <Window position={[1.3, 1.6, -2.44]} size={[1.0, 1.0]} sky="#ff7ad8" />
    {children}
  </Room>
);
const today = (camera: CameraShot, children: React.ReactNode, opts: { blur?: number } = {}) => (
  <Stage set={<TodaySet camera={camera} f={0}>{children}</TodaySet>} camera={camera} bg={moodBackground("neon")} puppets={[]} blur={opts.blur} />
);

// ---------- 0-2 s: the hook ----------

// Macro on the bench: the shears bite the rim of a hammered coin and a sliver flies at the lens. `offset` shifts the
// clock: the last shot is this one just before frame 0.
const LOOP = 24;
const SNIP = 12;
const hookAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 26);
  const camera = cam([0.24, 0.86, -0.42], [0.12, 0.74, -0.58], [0.0, 0.62, -0.88], 40, p);
  const open = f < SNIP ? 0.9 - 0.25 * ease(f, -LOOP, SNIP - 4) : Math.max(0, 0.9 - (f - SNIP) * 0.35);
  return (
    <Stage
      set={
        <GarretSet camera={camera} f={f + 40} coins={false}>
          <Coin position={COIN_AT} rotation={[-Math.PI / 2, 0, 0.3]} r={0.06} kind="hammered" seed={3} />
          <Scissors position={[COIN_AT[0] + 0.11, COIN_AT[1] + 0.018, COIN_AT[2] + 0.02]} rotation={[-Math.PI / 2, 0, Math.PI - 0.25]} open={open} scale={1.15} />
          <FlyingSliver from={[COIN_AT[0] + 0.05, COIN_AT[1] + 0.02, COIN_AT[2] + 0.02]} to={[0.13, 0.76, -0.62]} t={f - SNIP} len={12} size={0.02} arc={0.05} />
        </GarretSet>
      }
      camera={camera}
      bg={moodBackground("warm")}
      light={garretLight(f)}
      energy={0}
      blur={5}
    />
  );
};
const HookSnip = hookAt(0);
const LoopIn = hookAt(-LOOP);

// The clipper's grin, lit by the candle.
const Grin = one((f) => {
  const camera = cam([-0.38, 1.1, 0.35], [-0.3, 1.06, 0.15], [-0.08, 0.95, -1.4], 36, ease(f, 0, 16));
  return garret(camera, f + 66, [P("clipper", CLIPPER, CLIP_AT, { ...faceChange([[0, "thinking"], [4, "smug"]], f), lookX: 0.3, headTilt: -6, reachR: [140, -470], frontR: true, handR: "fist" })], { blur: 6 });
});

// The sliver drops into the jar: clink, a small jolt.
const DROP = 6;
const JarDrop = one((f) => {
  const camera = cam([0.62, 0.86, -0.42], [0.55, 0.82, -0.52], [JAR[0], 0.72, JAR[2]], 38, ease(f, 0, 15));
  const t = f + 6;
  const y = Math.max(BENCH_H + 0.22, 1.05 - t * t * 0.0028);
  return garret(camera, f + 82, [], { jar: 0.35, blur: 4, energy: 0.5 }, <Sliver position={[JAR[0] + 0.01, y, JAR[2]]} rotation={[f * 0.4, f * 0.3, 0]} size={0.02} />);
});

// ---------- 2-9 s: the ragged edge ----------

// The garret wide: candle, bench, and the Tower through the window (the seed).
const GarretWide = one((f) => {
  const camera = camT([-1.25, 1.5, 1.7], [-0.95, 1.42, 1.45], [0.4, 1.15, -1.6], [0.55, 1.18, -1.7], 42, ease(f, 0, 43));
  const snip = Math.abs(Math.sin(f * 0.25));
  return (
    <>
      {garret(camera, f + 97, [P("clipper", CLIPPER, CLIP_AT, { expression: "happy", reachR: [120 - 30 * snip, -440], reachL: [-110, -430], frontR: true, frontL: true, handR: "fist", handL: "fist", lookX: 0.2 })])}
      <Headline f={f} text="LONDON" at={6} />
    </>
  );
});

// Macro: a hammered coin turning on the bench, its rim ragged; a label pops in.
const Ragged = one((f) => {
  const camera = cam([0.08, 0.82, -0.5], [0.04, 0.78, -0.58], [0.02, 0.66, -0.86], 36, ease(f, 0, 55));
  const spin = f * 0.03;
  return garret(
    camera,
    f + 140,
    [],
    { coins: false, blur: 5, energy: 0.5 },
    <>
      <group position={[COIN_AT[0], COIN_AT[1] + 0.07, COIN_AT[2]]} rotation={[-0.35, spin, 0]}>
        <Coin r={0.07} kind="hammered" seed={3} />
      </group>
      <Label text="RAGGED EDGE" position={[0.02, 0.86, -0.92]} width={0.2} appear={f - 18} />
    </>,
  );
});

// Top-down on the bench: snip, snip; slivers fall.
const TopSnips = one((f) => {
  const a = 0.15 + f * 0.004;
  const camera: CameraShot = { position: [Math.sin(a) * 0.06, 1.12 - f * 0.002, -0.88 + Math.cos(a) * 0.06], target: [0.04, BENCH_H, -0.88], fov: 40 };
  const cut = (k: number) => Math.max(0, Math.sin((f - k) * 0.35));
  return garret(
    camera,
    f + 200,
    [],
    { coins: true },
    <>
      <Scissors position={[0.14, BENCH_H + 0.03, -0.84]} rotation={[-Math.PI / 2, 0, Math.PI - 0.3 + Math.sin(f * 0.04) * 0.2]} open={cut(0) * 0.8} scale={1.1} />
      {[8, 26, 44].map((k, i) => (
        <FlyingSliver key={k} from={[0.07, BENCH_H + 0.03, -0.85]} to={[0.12 + i * 0.05, BENCH_H + 0.006, -0.72 + i * 0.03]} t={f - k} len={10} size={0.014} arc={0.03} />
      ))}
    </>,
  );
});

// The street: the merchant takes a clipped coin without a glance.
const NoNotice = one((f) => {
  const camera = cam([-0.3, 1.25, 2.6], [-0.15, 1.22, 2.35], [0.45, 0.92, -1.0], 38, ease(f, 0, 60));
  const give = ease(f, 6, 22);
  const hand = handWorld([0.9, -1.75], [-210, -520], camera);
  return street(
    camera,
    f + 300,
    [
      P("merchant", MERCHANT, [0.9, -1.75], { ...faceChange([[0, "neutral"], [24, "happy"]], f), reachL: [-210, -520], frontL: true, handL: f > 22 ? "fist" : "open", lookX: -0.5 }),
      P("clipper", CLIPPER, [-0.05, -0.6], { expression: "smug", reachR: [160 + 60 * give, -520], frontR: true, handR: f < 22 ? "fist" : "open", lookX: 0.6 }),
    ],
    {},
    f < 24 ? <Coin position={[hand[0] - 0.15 * (1 - give), hand[1] + 0.02, hand[2] + 0.05]} rotation={[0, 0, 0]} r={0.05} kind="hammered" seed={5} /> : undefined,
  );
});

// Melting the clippings: the crucible glows, the puddle grows.
const Melt = one((f) => {
  const camera = cam([-1.15, 1.0, 1.3], [-1.2, 0.98, 1.1], [-1.25, 0.72, -1.3], 40, ease(f, 0, 50));
  const tip = ease(f, 4, 18);
  return garret(
    camera,
    f + 270,
    [P("clipper", CLIPPER, [-1.0, -1.15], { expression: "excited", view: "side", facing: -1, bend: 0.12, reachL: [-180, -420 - 60 * tip], handL: "open" })],
    { melt: ease(f, 10, 45), light: garretLight(f, [{ position: [BRAZIER[0], 0.7, BRAZIER[2] + 0.2], color: "#ff8a3a", strength: 2.6, range: 1.4 }]) },
    <>
      {[0, 5, 10].map((k) => (
        <FlyingSliver key={k} from={[BRAZIER[0] + 0.22, 0.95, BRAZIER[2] + 0.05]} to={[BRAZIER[0], 0.66, BRAZIER[2]]} t={f - 8 - k} len={9} size={0.014} arc={0.05} />
      ))}
    </>,
  );
});

// Full value: the clipped coin spins down on the stall's counter; the merchant beams; label.
const FullValue = one((f) => {
  const camera = cam([0.65, 1.0, 0.25], [0.72, 0.98, 0.05], [STALL[0], 0.7, STALL[2]], 38, ease(f, 0, 50));
  const spin = Math.max(0, 1 - f / 34);
  return street(
    camera,
    f + 350,
    [P("merchant", MERCHANT, [0.95, -1.75], { ...faceChange([[0, "neutral"], [22, "excited"]], f), gesture: f > 22 ? "clap" : undefined, lookX: -0.2 })],
    { blur: 4 },
    <>
      <group position={[STALL[0] - 0.05, 0.6 + 0.05 * spin, STALL[2] + 0.12]} rotation={[-Math.PI / 2 + (1 - spin) * 0, f * 0.9 * spin, 0]}>
        <Coin rotation={[spin * 1.4, 0, 0]} r={0.05} kind="hammered" seed={8} />
      </group>
      <Label text="FULL VALUE" position={[STALL[0], 1.4, STALL[2] + 0.3]} width={0.42} appear={f - 24} />
    </>,
  );
});

// "A little off the top, sir?" — the clipper winks at the lens with the shears.
const OffTheTop = one((f) => {
  const camera = cam([-0.6, 1.05, 1.1], [-0.52, 1.03, 0.85], [-0.2, 0.92, -0.6], 36, ease(f, 0, 40));
  const h = handWorld([-0.2, -0.55], [170, -620], camera);
  return street(
    camera,
    f + 400,
    [P("clipper", CLIPPER, [-0.2, -0.55], { ...faceChange([[0, "smug"], [14, "happy"]], f), reachR: [170, -620], frontR: true, handR: "fist", headTilt: 8, blink: f > 18 && f < 26 })],
    { blur: 7 },
    <Scissors position={[h[0] + 0.04, h[1] + 0.08, h[2] + 0.05]} rotation={[0, 0, 1.2]} open={0.4 + 0.3 * Math.abs(Math.sin(f * 0.4))} scale={1.6} />,
  );
});

// The jar gets heavier every week; it overflows and puffs silver dust in his face. (gag)
const PUFF = 46;
const JarFull = one((f) => {
  const camera = cam([0.65, 1.12, 0.45], [0.55, 1.08, 0.25], [0.25, 0.85, -1.2], 38, ease(f, 0, 64));
  const fill = 0.35 + 0.7 * ease(f, 0, PUFF);
  const sneeze = f > PUFF + 6;
  return garret(
    camera,
    f + 420,
    [
      P("clipper", CLIPPER, [0.2, -1.45], {
        ...faceChange([[0, "happy"], [PUFF, "shocked"], [PUFF + 6, "disgusted"]], f),
        ...(sneeze ? jump(f, PUFF + 6, 90, 20) : {}),
        lean: f < PUFF ? 10 : -6,
        reachL: [-120, -470],
        reachR: [120, -470],
        frontL: true,
        frontR: true,
        handL: "open",
        handR: "open",
      }),
    ],
    { jar: Math.min(1, fill) },
    <>
      <Burst kind="dust" at={[JAR[0], BENCH_H + 0.26, JAR[2]]} frame={f - PUFF} size={0.45} colors={["#b8bcc4", "#9aa0aa"]} seed={3} />
      {f > PUFF - 6 && <Sliver position={[JAR[0] + 0.06, BENCH_H + 0.27 + Math.max(0, (f - PUFF) * -0.004), JAR[2] + 0.04]} rotation={[f * 0.2, 0, 1]} size={0.016} />}
    </>,
  );
});

// Low angle: the town crier rings his bell.
const Crier = one((f) => {
  const camera = cam([0.35, 0.36, 1.7], [0.25, 0.4, 1.45], [0, 1.25, -0.6], 46, ease(f, 0, 66));
  const ring = Math.sin(f * 0.9) * 0.6;
  const h = handWorld([0, -0.3], [200, -720], camera);
  return street(
    camera,
    f + 480,
    [
      P("crier", CRIER, [0, -0.3], { expression: "excited", reachR: [200, -720], frontR: true, handR: "fist", reachL: [-160, -620], handL: "open", lean: -4 }),
      P("merchant", MERCHANT, [0.95, -2.4], { ...faceChange([[0, "neutral"], [20, "confused"]], f), lookX: -0.7 }),
      P("baker", BAKER, [-0.95, -2.5], { ...faceChange([[0, "happy"], [24, "worried"]], f), lookX: 0.7 }),
    ],
    {},
    <HandBell position={[h[0], h[1] + 0.06, h[2] + 0.04]} swing={ring} />,
  );
});

// ---------- 18-26 s: the new coins ----------

// The Tower and the Mint's smoke; the camera cranes up over the quay.
const Tower = one((f) => {
  const camera = camT([0.6, 0.9, 4.2], [0.2, 1.7, 3.6], [0, 1.6, -3], [0, 2.4, -3.5], 44, ease(f, 0, 54));
  return (
    <>
      <Stage set={<TowerSet camera={camera} f={f} />} camera={camera} bg={moodBackground("daylight")} puppets={[]} />
      <Headline f={f} text="1696" at={4} />
    </>
  );
});

// The press: the men swing the fly, the ram drops — boom — and a perfect coin.
const STRIKE = 30;
const pressFly = (f: number, strike: number) => -1.2 + 2.2 * ease(f, strike - 18, strike);
const pressDown = (f: number, strike: number) => Math.max(0, 1 - Math.abs(f - strike) / 6);
const Press = one((f) => {
  const camera = cam([0.3, 1.15, 1.6], [0.28, 1.1, 1.3], [0.25, 0.85, -1.2], 40, ease(f, 0, 68));
  const swing = ease(f, STRIKE - 18, STRIKE);
  return mint(
    camera,
    f + 600,
    [
      P("w1", WORKER_A, [-0.45, -0.8], { ...faceChange([[0, "determined"], [STRIKE, "happy"]], f), reachR: [200, -900 + 200 * swing], handR: "fist", lean: 6 * swing, frontR: true }),
      P("w2", WORKER_B, [0.95, -0.85], { ...faceChange([[0, "determined"], [STRIKE, "excited"]], f), reachL: [-200, -900 + 200 * swing], handL: "fist", lean: -6 * swing, frontL: true }),
    ],
    { fly: pressFly(f, STRIKE), press: pressDown(f, STRIKE) },
    <>
      {f > STRIKE && <Coin position={[PRESS[0], 0.45 + Math.min(0.25, (f - STRIKE) * 0.03), PRESS[2] + 0.25]} rotation={[0, (f - STRIKE) * 0.25, 0]} r={0.07} kind="milled" />}
      <Burst kind="sparks" at={[PRESS[0], 0.44, PRESS[2] + 0.1]} frame={f - STRIKE} count={30} seed={2} />
    </>,
  );
});

// Macro: the new coin turns; its edge reads DECUS ET TUTAMEN.
const NewCoin = one((f) => {
  const camera = cam([0.08, 0.56, 0.05], [0.04, 0.54, -0.05], [0, 0.5, -0.45], 34, ease(f, 0, 52));
  return mint(
    camera,
    f + 668,
    [],
    { blur: 5, energy: 0.4 },
    <>
      <InkBox size={[0.5, 0.42, 0.5]} position={[0, 0.21, -0.5]} color="#5a4030" ink={0.008} />
      <group position={[0, 0.52, -0.45]} rotation={[0, -0.8 + f * 0.04, 0]}>
        <Coin rotation={[0, Math.PI / 2, 0]} r={0.09} kind="milled" t={0.022} />
      </group>
    </>,
  );
});

// Over his shoulder at the window: he holds the shiny coin up against the Tower and grins.
const Shoulder = one((f) => {
  const camera = cam([0.98, 1.22, -1.15], [1.05, 1.24, -1.3], [1.36, 1.28, -2.3], 38, ease(f, 0, 60));
  const at: [number, number] = [1.12, -1.75];
  const lift = ease(f, 4, 20);
  return garret(
    camera,
    f + 720,
    [P("clipper", CLIPPER, at, { expression: "smug", view: "back", reachR: [150, -600 - 150 * lift], handR: "fist" })],
    { blur: 3 },
    <Coin position={[1.33, 1.05 + 0.22 * lift, -2.05]} rotation={[0, -0.3 + f * 0.01, 0]} r={0.08} kind="milled" />,
  );
});

// "New coin, same old scissors." — then the shears skid off the ridged edge and snap on his thumb. (gag)
const OUCH = 40;
const Ouch = one((f) => {
  const camera = cam([-0.15, 1.08, 0.5], [-0.1, 1.04, 0.25], [0.05, 0.86, -1.3], 38, ease(f, 0, 55));
  const hurt = f > OUCH;
  return garret(
    camera,
    f + 781,
    [
      P("clipper", CLIPPER, CLIP_AT, {
        ...faceChange([[0, "smug"], [OUCH, "shocked"], [OUCH + 4, "angry"]], f),
        ...(hurt ? jump(f, OUCH, 120, 24) : {}),
        reachR: hurt ? [220, -760] : [110, -470],
        reachL: [-90, -470],
        frontR: true,
        frontL: true,
        handR: hurt ? "open" : "fist",
        handL: "fist",
      }),
    ],
    { blur: 5 },
    <>
      <Coin position={[-0.06, BENCH_H + 0.012, -0.95]} rotation={[-Math.PI / 2, 0, 0]} r={0.06} kind="milled" />
      <Scissors position={[0.05 + (hurt ? 0.08 : 0), BENCH_H + 0.04, -0.9]} rotation={[-Math.PI / 2, 0, Math.PI - 0.3 + (hurt ? 0.8 : 0)]} open={hurt ? 0 : 0.6} scale={1.2} />
      <Burst kind="stars" at={[0.1, 1.15, -1.4]} frame={f - OUCH} count={8} seed={4} />
    </>,
  );
});

// ---------- 28-35 s: the bakery ----------

// He slides the coin across the counter; the baker smiles.
const Pay = one((f) => {
  const camera = cam([-1.05, 1.15, 1.35], [-0.92, 1.12, 1.1], [0.0, 0.88, -0.8], 38, ease(f, 0, 64));
  const slide = ease(f, 8, 30);
  return bakery(
    camera,
    f + 837,
    [
      P("baker", BAKER, BAKER_AT, { ...faceChange([[0, "neutral"], [30, "happy"]], f), reachL: [-160, -500], frontL: true, handL: "open", lookX: -0.4 }),
      P("clipper", CLIPPER, BUYER_AT, { expression: "smug", view: "side", facing: 1, reachR: [220, -470], handR: "open" }),
    ],
    {},
    <Coin position={[-0.3 + slide * 0.55, TOP + 0.008, COUNTER[2] + 0.15 - slide * 0.1]} rotation={[-Math.PI / 2, 0, slide * 2]} r={0.05} kind="milled" clipped />,
  );
});

// Macro: her thumb runs round the edge as she turns the coin — the letters pass — and it stops at the cut.
const STOP = 52;
const ThumbEdge = one((f) => {
  const camera = cam([0.06, TOP + 0.16, -0.22], [0.04, TOP + 0.12, -0.3], [0, TOP + 0.02, -0.62], 32, ease(f, 0, 70));
  const turn = -2.6 + 2.4 * ease(f, 0, STOP);
  return bakery(
    camera,
    f + 903,
    [],
    { blur: 6, energy: 0.3 },
    <>
      <group position={[0, TOP + 0.014, -0.62]} rotation={[0, turn, 0]}>
        <Coin rotation={[-Math.PI / 2, 0, 0]} r={0.1} kind="milled" clipped t={0.026} />
      </group>
      <Thumb position={[0.13, TOP + 0.04, -0.6 + (f > STOP ? 0 : Math.sin(f * 0.3) * 0.004)]} rotation={[0, 0.15, -0.15]} skin={BAKER.skin} scale={0.75} />
    </>,
  );
});

// "Decus et tut? Where is the rest of it?" — she holds it up.
const Baker = one((f) => {
  const camera = cam([0.15, 1.08, 0.55], [0.22, 1.06, 0.3], [0.42, 0.95, -1.3], 36, ease(f, 0, 46));
  const h = handWorld(BAKER_AT, [150, -760], camera);
  return bakery(
    camera,
    f + 974,
    [P("baker", BAKER, BAKER_AT, { ...faceChange([[0, "skeptical"], [26, "angry"]], f), reachR: [150, -760], frontR: true, handR: "fist", headTilt: -8 })],
    { blur: 7 },
    <Coin position={[h[0] + 0.02, h[1] + 0.07, h[2] + 0.06]} rotation={[0, 0.5, 0.2]} r={0.045} kind="milled" clipped />,
  );
});

// The clipper sweats.
const Sweat = one((f) => {
  const camera = cam([-0.95, 1.04, 1.25], [-0.88, 1.02, 1.0], [-0.75, 0.94, -0.1], 34, ease(f, 0, 46));
  return bakery(camera, f + 1020, [P("clipper", CLIPPER, BUYER_AT, { ...faceChange([[0, "awkward"], [22, "worried"]], f), lookX: 0.6, headTilt: 6, gesture: "scratchHead" })], { blur: 7 });
});

// The door bangs open: the Mint's men, cold light behind them; the clipper dives under the counter and the loaves
// tumble. (gag) The twist arrives as people at the door.
const BANG = 4;
const Raid = one((f) => {
  const camera = cam([-0.2, 1.15, 1.2], [-0.3, 1.12, 0.95], [-1.2, 0.95, -1.6], 42, ease(f, 0, 44));
  const w1 = stroll(f, BANG + 4, 30, [-1.95, -2.1], [-1.3, -1.25]);
  const w2 = stroll(f, BANG + 10, 30, [-1.55, -1.95], [-0.9, -1.6]);
  return bakery(
    camera,
    f + 1066,
    [
      P("mint1", MINT_A, w1.at, { expression: "determined", ...w1.pose, view: f > BANG + 34 ? "front" : undefined }),
      P("mint2", MINT_B, w2.at, { expression: "angry", ...w2.pose, view: f > BANG + 40 ? "front" : undefined, gesture: f > BANG + 40 ? "point" : undefined }),
      P("clipper", CLIPPER, [0.0 + ease(f, 8, 22) * 0.35, -0.05], { ...faceChange([[0, "worried"], [BANG + 2, "shocked"]], f), crouch: ease(f, 8, 20), bend: 0.4 * ease(f, 8, 20), view: "side", facing: 1 }),
    ],
    { mood: "cold", door: ease(f, BANG - 2, BANG + 3), tray: ease(f, 14, 40), light: { distant: [{ direction: [-1, 0.3, -0.6], color: "#bcd0ff", strength: 2 }] } },
  );
});

// Newton at his desk in the Tower, candlelit; he looks up.
const Newton = one((f) => {
  const camera = cam([0.25, 1.05, 1.0], [0.12, 1.0, 0.55], [0, 0.85, -1.5], 38, ease(f, 0, 82));
  return (
    <>
      <Stage
        set={<NewtonSet camera={camera} f={f + 1110} />}
        camera={camera}
        bg={moodBackground("night")}
        puppets={[P("newton", NEWTON, NEWTON_AT, { ...sitDown(f, -60), ...faceChange([[0, "thinking"], [30, "smug"]], f), lookX: f < 30 ? -0.3 : 0, reachL: [-140, -420], frontL: true, handL: "open" })]}
        light={newtonLight(f)}
        blur={5}
      />
      <Headline f={f} text="ISAAC NEWTON, WARDEN OF THE MINT" at={28} size={70} />
    </>
  );
});

// ---------- 40-52 s: the mechanism ----------

// The edge die: a blank rolls between two lettered bars and comes out with the sentence on its rim.
const DieRoll = one((f) => {
  const camera = cam([0.0, 1.15, 2.6], [0.0, 1.12, 2.3], [0, 1.05, -0.8], 40, ease(f, 0, 78));
  return mech(
    camera,
    <>
      <EdgeDie position={[0, 1.0, -0.8]} roll={ease(f, 6, 70)} />
      <Label text="NEW COINS" position={[0, 1.68, -0.8]} width={0.5} appear={f - 4} />
    </>,
  );
});

// Macro across the giant coin's rim as it turns: the words go by.
const GIANT: Vec3 = [0, 0.95, -0.8];
const Words = one((f) => {
  const camera = cam([0.2, 1.08, 0.2], [0.12, 1.04, 0.05], [0, 0.95, -0.4], 36, ease(f, 0, 66));
  return mech(
    camera,
    <>
      <group position={GIANT} rotation={[0, -1.2 - f * 0.035, 0]}>
        <Coin rotation={[-Math.PI / 2, 0, 0]} r={0.42} kind="milled" t={0.1} ink={0.012} />
      </group>
      <InkCylinder radius={0.3} height={0.85} position={[0, 0.42, -0.8]} color="#5a2a7a" ink={0.01} />
      <Label text={"AN ORNAMENT\nAND A SAFEGUARD"} position={[0.075, 1.06, -0.2]} width={0.085} appear={f - 20} />
    </>,
    {},
  );
});

// Giant shears bite the giant coin; the end of the sentence drops away.
const CHOP = 18;
const Chop = one((f) => {
  const camera = cam([0.0, 1.3, 2.2], [0.0, 1.28, 1.9], [0, 1.0, -0.8], 40, ease(f, 0, 55));
  const cut = f > CHOP;
  const fall = Math.max(0, f - CHOP);
  return mech(
    camera,
    <>
      <InkCylinder radius={0.3} height={0.85} position={[0, 0.42, -0.8]} color="#5a2a7a" ink={0.01} />
      <group position={GIANT}>
        <Coin rotation={[-Math.PI / 2 + 0.5, 0, 0.6]} r={0.42} kind="milled" t={0.1} clipped={cut} ink={0.012} />
      </group>
      <Scissors position={[0.55, 1.05, -0.6]} rotation={[0, 0, Math.PI - 0.5]} open={f < CHOP ? 0.9 * ease(f, 0, 10) : 0} scale={5} />
      {cut && <Sliver position={[0.45, 1.0 - fall * fall * 0.004, -0.5]} rotation={[fall * 0.2, 0, fall * 0.15]} size={0.14} />}
      <Label text="SENTENCE BROKEN" position={[0, 1.78, -0.8]} width={0.72} appear={f - CHOP - 6} />
    </>,
  );
});

// Every thumb in London becomes a guard: a row of townsfolk checking their coins.
const Guards = one((f) => {
  const camera = cam([-0.35, 1.15, 1.9], [0.3, 1.15, 1.9], [0, 1.0, -0.3], 46, ease(f, 0, 56));
  const row: [string, PuppetLook, number][] = [
    ["crier", CRIER, -1.55],
    ["merchant", MERCHANT, -0.55],
    ["baker", BAKER, 0.45],
    ["mint1", MINT_A, 1.45],
  ];
  return street(
    camera,
    f + 1400,
    row.map(([id, look, x], i) =>
      P(id, look, [x * 0.75, -0.1 - (i % 2) * 0.2], { ...faceChange([[0, "thinking"], [18 + i * 6, "skeptical"]], f), reachR: [80, -520], reachL: [-60, -520], frontR: true, frontL: true, handR: "fist", handL: "open", lookX: 0.1 * Math.sin(f * 0.1 + i) }),
    ),
    {},
    <Label text={"EVERY THUMB\nA GUARD"} position={[0, 1.95, -0.9]} width={0.8} appear={f - 10} />,
  );
});

// Side by side: the ragged coin hides the cut; the lettered one confesses it.
const SIDE_L: Vec3 = [-0.42, 1.0, -0.8];
const SIDE_R: Vec3 = [0.42, 1.0, -0.8];
const Hides = one((f) => {
  const camera = cam([-0.25, 1.15, 1.2], [-0.32, 1.12, 1.0], [-0.3, 1.0, -0.8], 38, ease(f, 0, 49));
  return mech(
    camera,
    <>
      <group position={SIDE_L} rotation={[0, Math.sin(f * 0.04) * 0.3, 0]}>
        <Coin r={0.26} kind="hammered" seed={3} ink={0.01} />
      </group>
      <Label text="OLD: HIDES IT" position={[-0.3, 1.42, -0.78]} width={0.46} appear={f - 8} />
      <Coin position={SIDE_R} r={0.26} kind="milled" clipped ink={0.01} />
    </>,
  );
});
const Confesses = one((f) => {
  const camera = cam([0.35, 1.15, 1.0], [0.42, 1.12, 0.8], [0.4, 1.0, -0.8], 38, ease(f, 0, 52));
  const glow = 0.5 + 0.5 * Math.sin(f * 0.3);
  return mech(
    camera,
    <>
      <Coin position={SIDE_L} r={0.26} kind="hammered" seed={3} ink={0.01} />
      <group position={SIDE_R} rotation={[0.25, -0.5 + f * 0.006, 0]}>
        <Coin r={0.26} kind="milled" clipped ink={0.01} />
      </group>
      <Halo position={[SIDE_R[0] + 0.12, SIDE_R[1] - 0.22, SIDE_R[2] + 0.1]} size={0.4} color="#ff4f6a" strength={0.5 * glow} />
      <Label text="NEW: CONFESSES" position={[0.32, 1.42, -0.78]} width={0.5} appear={f - 8} />
    </>,
  );
});

// Three years: the press keeps striking; a tally board counts the years.
const Years = one((f) => {
  const camera = cam([0.0, 1.2, 1.9], [0.15, 1.18, 1.6], [0.25, 1.0, -1.3], 44, ease(f, 0, 78));
  const strikes = [14, 40, 66];
  const last = strikes.filter((s) => f >= s - 18).pop() ?? 14;
  return mint(
    camera,
    f + 1557,
    [
      P("w1", WORKER_A, [-0.45, -0.8], { expression: "determined", reachR: [200, -760], handR: "fist", frontR: true }),
      P("w2", WORKER_B, [0.95, -0.85], { expression: "excited", reachL: [-200, -760], handL: "fist", frontL: true }),
    ],
    { fly: pressFly(f, last) + strikes.indexOf(last) * 2.2, press: Math.max(...strikes.map((s) => pressDown(f, s))) },
    <>
      <Label text="3 YEARS" position={[0.25, 1.72, -1.6]} width={0.55} appear={f - 10} count={ramp(f, 10, 60)} />
      {strikes.map((s, i) => f > s && <Coin key={s} position={[PRESS[0] + 0.15 * i - 0.15, 0.45 + Math.min(0.3, (f - s) * 0.03), PRESS[2] + 0.28]} rotation={[0, (f - s) * 0.3, 0]} r={0.06} kind="milled" />)}
    </>,
  );
});

// ---------- 54-59 s: today ----------

// A coin slips out of the jeans pocket and rolls across the floor.
const Pocket = one((f) => {
  const camera = cam([0.05, 0.42, -0.2], [-0.05, 0.38, -0.32], [-0.35, 0.18, -1.05], 40, ease(f, 0, 53));
  const fall = Math.max(0, f - 6);
  const y = Math.max(0, 0.3 - fall * fall * 0.0025);
  const roll = Math.max(0, f - 18) * 0.022;
  return today(
    camera,
    f < 18 ? (
      <Coin position={[-0.45, y + 0.06, -1.1]} rotation={[0, 0.4, fall * 0.2]} r={0.06} kind="modern" />
    ) : (
      <RollingCoin position={[-0.45, 0, -1.04]} dist={roll} r={0.06} wobble={0.05 * Math.sin(f * 0.5)} />
    ),
  );
});

// Macro: the ridges roll past and the coin spins down to a stop.
const Ridges = one((f) => {
  const camera = cam([0.15, 0.16, -0.35], [0.12, 0.13, -0.45], [0.02, 0.06, -0.8], 38, ease(f, 0, 33));
  const d = 0.35 * (1 - Math.pow(1 - ramp(f, 0, 33), 2));
  camera.position[0] += -0.27 + d;
  camera.target[0] += -0.27 + d;
  return today(camera, <RollingCoin position={[-0.25, 0, -0.8]} dist={d} r={0.06} wobble={0.25 * ramp(f, 18, 33)} />, { blur: 4 });
});

// Safeguard: it settles; the last word.
const Settle = one((f) => {
  const camera = cam([0.1, 0.42, -0.45], [0.06, 0.34, -0.55], [0.05, 0.02, -0.8], 36, ease(f, 0, 25));
  const s = squash(f, 4, 0.2);
  return (
    <>
      {today(
        camera,
        <group position={[0.1, 0.012, -0.8]} scale={s} rotation={[0, f * 0.02, 0]}>
          <Coin rotation={[-Math.PI / 2 + 0.25 * Math.max(0, 1 - f / 8) * Math.sin(f * 1.4), 0, 0]} r={0.06} kind="modern" />
        </group>,
        { blur: 3 },
      )}
      <Headline f={f} text="SAFEGUARD." at={2} />
    </>
  );
});

// ---------- shot list (cut to timing.json lines) ----------

const SHOTS: Shot[] = [
  [0, 26, HookSnip, false],
  [26, 42, Grin, false],
  [42, 57, JarDrop, false],
  [57, 100, GarretWide, false],
  [100, 155, Ragged, false],
  [155, 210, TopSnips, false],
  [210, 270, NoNotice, true],
  [270, 320, Melt, true],
  [320, 372, FullValue, true],
  [372, 412, OffTheTop, false],
  [412, 480, JarFull, true],
  [480, 546, Crier, true],
  [546, 600, Tower, true],
  [600, 668, Press, true],
  [668, 720, NewCoin, false],
  [720, 781, Shoulder, true],
  [781, 837, Ouch, false],
  [837, 903, Pay, true],
  [903, 974, ThumbEdge, false],
  [974, 1020, Baker, false],
  [1020, 1066, Sweat, false],
  [1066, 1110, Raid, false],
  [1110, 1192, Newton, true],
  [1192, 1274, DieRoll, true],
  [1274, 1345, Words, false],
  [1345, 1400, Chop, false],
  [1400, 1456, Guards, true],
  [1456, 1505, Hides, true],
  [1505, 1557, Confesses, false],
  [1557, 1637, Years, true],
  [1637, 1690, Pocket, true],
  [1690, 1723, Ridges, false],
  [1723, 1748, Settle, false],
  [1748, TIMING.totalFrames, LoopIn, true],
];

// ---------- sound ----------

const SFX_RAW: Sfx[] = [
  // hook
  { at: 0, src: sfx("whoosh"), volume: 0.3 },
  { at: SNIP, src: sfx("scrape"), volume: 0.5, space: "room" },
  { at: 42 + DROP, src: sfx("clink"), volume: 0.7, space: "room" },
  { at: 42 + DROP + 2, src: sfx("stamp"), volume: 0.18, space: "room" },
  { at: 100 + 18, src: sfx("pop"), volume: 0.9 },
  // snips
  { at: 155 + 8, src: sfx("scrape"), volume: 0.5, space: "room" },
  { at: 155 + 26, src: sfx("card"), volume: 0.7, space: "room" },
  { at: 155 + 44, src: sfx("scrape"), volume: 0.2, space: "room" },
  { at: 206, src: sfx("whoosh"), volume: 0.45 },
  { at: 210 + 22, src: sfx("clink"), volume: 0.45, space: "outdoor" },
  { at: 266, src: sfx("whoosh"), volume: 0.45 },
  { at: 270, src: sfx("crackle"), volume: 0.15, until: 320 },
  { at: 316, src: sfx("whoosh"), volume: 0.45 },
  { at: 320 + 4, src: sfx("clink"), volume: 0.5, space: "outdoor" },
  { at: 320 + 24, src: sfx("pop"), volume: 0.55 },
  { at: 408, src: sfx("whoosh"), volume: 0.45 },
  { at: 412 + 14, src: sfx("clink"), volume: 0.35, space: "room" },
  { at: 412 + 30, src: sfx("clink"), volume: 0.4, space: "room" },
  { at: 412 + PUFF, src: sfx("hiss"), volume: 0.3, space: "room" },
  { at: 412 + PUFF + 6, src: sfx("sniff"), volume: 0.3, space: "room" },
  { at: 476, src: sfx("whoosh"), volume: 0.25 },
  { at: 480 + 2, src: sfx("chime"), volume: 0.18, space: "outdoor" },
  { at: 480 + 20, src: sfx("chime"), volume: 0.35, space: "outdoor" },
  { at: 542, src: sfx("whoosh"), volume: 0.45 },
  { at: 546, src: sfx("wind"), volume: 0.15, until: 600 },
  { at: 596, src: sfx("whoosh"), volume: 0.6 },
  // the Mint
  { at: 600, src: sfx("crackle"), volume: 0.15, until: 668 },
  { at: 600 + STRIKE - 16, src: sfx("creak"), volume: 0.45, space: "hall" },
  { at: 600 + STRIKE, src: sfx("boom"), volume: 0.3, space: "hall" },
  { at: 600 + STRIKE + 6, src: sfx("chime"), volume: 0.4, space: "hall" },
  { at: 668 + 6, src: sfx("chime"), volume: 0.3, space: "room" },
  { at: 716, src: sfx("whoosh"), volume: 0.45 },
  { at: 720 + 18, src: sfx("chime"), volume: 0.15, space: "room" },
  { at: 781 + OUCH, src: sfx("clang"), volume: 0.8, space: "room" },
  { at: 781 + OUCH + 1, src: sfx("stamp"), volume: 0.45, space: "room" },
  { at: 781 + OUCH + 2, src: sfx("squeak"), volume: 0.8, space: "room" },
  { at: 833, src: sfx("whoosh"), volume: 0.45 },
  // the bakery
  { at: 837 + 8, src: sfx("scrape"), volume: 0.3, space: "room" },
  { at: 903 + 6, src: sfx("paper"), volume: 0.8, space: "room" },
  { at: 903 + STOP, src: sfx("tape-stop"), volume: 0.2 },
  { at: 974, src: sfx("sting"), volume: 0.3 },
  { at: 1066 + BANG, src: sfx("door"), volume: 0.7, space: "room" },
  { at: 1066 + BANG + 1, src: sfx("boom"), volume: 0.5, space: "room" },
  ...foleyCues("thud", [1066 + 18, 1066 + 24, 1066 + 30], 0.55, { space: "room" }),
  { at: 1106, src: sfx("whoosh"), volume: 0.45 },
  { at: 1110 + 28, src: sfx("pop"), volume: 1.0 },
  // the mechanism
  { at: 1188, src: sfx("whoosh"), volume: 0.45 },
  { at: 1192 + 4, src: sfx("pop"), volume: 0.55 },
  { at: 1192 + 10, src: sfx("reel-spin"), volume: 0.1, until: 1262 },
  { at: 1274 + 20, src: sfx("pop"), volume: 0.8 },
  { at: 1345 + CHOP, src: sfx("clang"), volume: 0.8, space: "hall" },
  { at: 1345 + CHOP + 1, src: sfx("stamp"), volume: 0.5, space: "hall" },
  { at: 1345 + CHOP + 22, src: sfx("clink"), volume: 0.25, space: "hall" },
  { at: 1396, src: sfx("whoosh"), volume: 0.45 },
  { at: 1400 + 10, src: sfx("pop"), volume: 0.55 },
  { at: 1452, src: sfx("whoosh"), volume: 0.45 },
  { at: 1456 + 8, src: sfx("pop"), volume: 0.5 },
  { at: 1505 + 8, src: sfx("pop"), volume: 0.8 },
  { at: 1553, src: sfx("whoosh"), volume: 0.45 },
  { at: 1557, src: sfx("crackle"), volume: 0.12, until: 1637 },
  { at: 1557 + 14, src: sfx("boom"), volume: 0.2, space: "hall" },
  { at: 1557 + 40, src: sfx("stamp"), volume: 0.6, space: "hall" },
  { at: 1557 + 66, src: sfx("clang"), volume: 0.7, space: "hall" },
  { at: 1557 + 10, src: sfx("pop"), volume: 0.3 },
  // today
  { at: 1633, src: sfx("whoosh"), volume: 0.45 },
  { at: 1637 + 16, src: sfx("clink"), volume: 0.25, space: "room" },
  { at: 1637 + 20, src: sfx("reel-spin"), volume: 0.08, until: 1690 },
  { at: 1690 + 18, src: sfx("clink"), volume: 0.6, space: "room" },
  { at: 1723 + 4, src: sfx("clink"), volume: 0.25, space: "room" },
  { at: 1744, src: sfx("whoosh"), volume: 0.5 },
];

// Effects sit under the voice: every cue at 80 % of its written level (the mix report found words masked).
const SFX: Sfx[] = SFX_RAW.map((c) => ({ ...c, volume: c.volume * 0.8 }));

const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 480, volume: 0.28 },
  { src: "music/lounge.wav", from: 480, to: 837, volume: 0.26 },
  { src: "music/tension.wav", from: 837, to: 1192, volume: 0.28 },
  { src: "music/mystery.wav", from: 1192, to: 1637, volume: 0.28 },
  { src: "music/upbeat.wav", from: 1637, to: TIMING.totalFrames, volume: 0.28 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;
