import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  clampReach,
  hammerSwing,
  strumPlay,
  handWorld,
  PUPPET_HEIGHT,
  Headline,
  InkBox,
  jump,
  Label,
  lieDown,
  moveChange,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { CANDLES, throneBg, throneLight, ThroneMode, ThroneRoomSet } from "../../three/ThroneRoomSet";
import { Gauge } from "../deserve-box/sets";
import {
  ANVIL,
  ANVIL_TOP,
  Drum,
  FeastTable,
  FORGE_BG,
  forgeLight,
  ForgeSet,
  Flute,
  Gong,
  GONG_AT,
  Hammer,
  JOY_AT,
  LIVING_BG,
  LivingSet,
  Mallet,
  Oud,
  Ring,
  Scissors,
  SEAT_AIR,
  SHAH_AT,
  SMITH_AT,
  SOFA,
  Spring,
  Stage3,
  STAGE,
  STAGE_AIR,
  Stick,
} from "./sets";
import TIMING_JSON from "./timing.json";

// "The King Who Banned the Music From Stopping": at his victory feast a Shah decrees the band may never stop; his JOY
// needle sags hour by hour however many drummers he adds. A blacksmith brings a plain ring, THIS TOO SHALL PASS; the
// Shah hurls it, it snaps a lute string, the hall goes silent, and when the music starts again the needle shoots past
// the top. The pivot: Nelson, Meyvis and Galak (2009) found ad breaks made TV more enjoyable, though people said they'd
// rather skip them: getting used to a pleasure drags enjoyment down and a break resets it (not for people who barely
// adapt). Sources: ../videos/endless-feast/research.md. Hall: ThroneRoomSet (guide/references/throne-room.md); forge:
// guide/references/forge.md.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "endless-feast";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());
const UNITS = 1060 / 1.3;

// ---------- cast ----------

const SHAH: PuppetLook = { skin: "#d8a47a", hair: "#1a1410", beard: "#1a1410", outfit: "#2e8a4a", tunic: true, belt: "#e0b040", cloak: "#5a1a6a", hat: "#e8b838", hatStyle: "crown", build: "broad", pants: "#3a1a2a" };
const SMITH: PuppetLook = { skin: "#c8946a", hair: "#2a1e16", outfit: "#d8c8a8", apron: "#5a3a22", stubble: "#2a1e16", build: "broad", pants: "#3a3a40" };
const DRUM1: PuppetLook = { skin: "#d8a47a", hair: "#1a1410", outfit: "#2a5aa8", vest: "#1f3f9a", kerchief: "#e0b040", pants: "#2a2a40" };
const DRUM2: PuppetLook = { skin: "#c8906a", hair: "#1a1410", outfit: "#3a8a5a", kerchief: "#c8302a", beard: "#1a1410", pants: "#2a3a2a" };
const DRUM3: PuppetLook = { skin: "#e0b088", hair: "#3a2416", outfit: "#e07a2a", kerchief: "#2aa59a", pants: "#4a2a1a" };
const LUTIST: PuppetLook = { skin: "#e8b890", hair: "#3a2416", outfit: "#7a3a8a", kerchief: "#c8302a", beard: "#3a2416", pants: "#3a1a3a" };
const LUTIST_BARE: PuppetLook = { ...LUTIST, kerchief: undefined };
const FLUTIST: PuppetLook = { skin: "#e8b890", hair: "#2a1810", long: true, skirt: true, outfit: "#2aa59a", belt: "#e0b040" };
const SERVANT: PuppetLook = { skin: "#c8946a", hair: "#1a1410", outfit: "#e8dcc0", vest: "#7a4a2a", kerchief: "#f2ece0", pants: "#5a4a3a" };
const VIEWER: PuppetLook = { skin: "#f0c8a8", hair: "#5a3a24", outfit: "#e85a2a", pants: "#2a3a5a", shoes: "#f2f2f2" };

const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: { expression: "neutral", ...p } as PuppetPose });

// The Shah on his throne cushion, facing the hall.
const shah = (p: Partial<PuppetPose>): PuppetPlacement => P("shah", SHAH, SHAH_AT, { sit: true, air: SEAT_AIR, view: "front", ...p });
// A musician standing on the stage.
const onStage = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => P(id, look, at, { air: STAGE_AIR, ...p });

// Places on the stage (x -3.7..-1.55, z -2.5..-0.7).
const D1: [number, number] = [-3.2, -1.95];
const D2: [number, number] = [-2.6, -2.05];
const D3: [number, number] = [-2.05, -1.95];
const LUTE: [number, number] = [-2.85, -1.15];
const FLUTE_AT: [number, number] = [-1.95, -1.1];

// A drummer beating a drum in front of him: `pace` beats per frame, `seed` shifts his phase and size of swing.
const drummer = (id: string, look: PuppetLook, at: [number, number], f: number, pace: number, seed: number, p: Partial<PuppetPose> = {}) => {
  const ph = f * pace + seed + 0.4 * Math.sin(f * 0.05 + seed);
  const up = Math.max(0, Math.sin(ph));
  const up2 = Math.max(0, Math.sin(ph + Math.PI));
  return onStage(id, look, at, { reachR: [150, -520 - 160 * up], reachL: [-150, -520 - 160 * up2], handR: "fist", handL: "fist", frontR: true, frontL: true, bob: 6 * up, ...p });
};
// The drum in front of a drummer and its two sticks (sticks follow the hands' swing).
const DrummerKit: React.FC<{ at: [number, number]; f: number; pace: number; seed: number; size?: number }> = ({ at, f, pace, seed, size = 1 }) => {
  const ph = f * pace + seed + 0.4 * Math.sin(f * 0.05 + seed);
  const hit = Math.max(0, -Math.cos(ph)) ** 6;
  return <Drum position={[at[0], STAGE.h + 0.36, at[1] + 0.32]} size={0.62 * size} rotation={[0, Math.PI / 2, 0]} hit={hit} />;
};

type HallProps = { camera: CameraShot; f: number; mode: ThroneMode; puppets?: PuppetPlacement[]; blur?: number; near?: Vec3[]; truth?: number; flash?: number; children?: React.ReactNode; candles?: number[] };
const Hall: React.FC<HallProps> = ({ camera, f, mode, puppets, blur = 4, near = [CANDLES[0], CANDLES[1]], truth, flash, children, candles }) => (
  <Stage
    set={
      <ThroneRoomSet camera={camera} frame={f} mode={mode} candles={candles}>
        <group userData={{ ghost: true }}>
          <Stage3 />
        </group>
        <FeastTable frame={f} />
        <Gong position={GONG_AT} frame={f} />
        {children}
      </ThroneRoomSet>
    }
    camera={camera}
    bg={throneBg(mode)}
    puppets={puppets}
    light={throneLight(mode, f, near)}
    blur={blur}
    truth={truth}
    flash={flash}
  />
);

// ---------- 1. 0-222: the hook, candle-lit feast late at night ----------

// Beats of the band in the hook: the needle drops one notch on each big BOOM.
const BOOMS = [18, 40, 61, 84, 104, 126, 150, 171, 196];
const notch = (f: number) => BOOMS.filter((b) => f >= b).length;
const HookShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-1.7, 0.55, 1.1], target: [-2.55, 0.6, -0.9], fov: 42 },
      { at: 60, position: [-1.35, 1.35, 2.3], target: [-2.4, 1.05, -1.4], fov: 42 },
      { at: 120, position: [0.05, 1.35, 1.9], target: [0.35, 1.1, -2.0], fov: 40 },
      { at: 210, position: [0.35, 1.25, 1.2], target: [0.45, 1.12, -2.0], fov: 40 },
    ],
    f,
  );
  // the cart-sized drum rolls in from the left, pushed by a servant, toward the stage front
  const roll = ease(f, -10, 70);
  const bigX = -4.2 + 1.9 * roll;
  const bigZ = -0.25;
  const spin = -(bigX + 4.2) / 0.6;
  const n = notch(f);
  const needle = 0.62 - 0.055 * n + 0.03 * Math.exp(-(f - (BOOMS[n - 1] ?? -99)) / 4);
  const shout = f >= 134 && f < 222;
  return (
    <>
      <Hall
        camera={camera}
        f={f}
        mode="candle"
        blur={4}
        puppets={[
          drummer("d1", DRUM1, D1, f, 0.3, 0),
          drummer("d2", DRUM2, D2, f, 0.34, 1.7),
          drummer("d3", DRUM3, D3, f, 0.27, 3.1),
          onStage("lute", LUTIST, LUTE, { ...faceChange([[0, "bored"], [100, "worried"]], f), ...strumPlay(f, { body: [120, -560], neck: [-140, -640] }), view: "front" }),
          P("servant", SERVANT, [bigX - 0.85, bigZ + 0.05], { ...faceChange([[0, "determined"], [70, "worried"]], f), view: "side", facing: 1, reachR: [220, -620], reachL: [200, -560], lean: 18, bend: 0.2 }),
          shah({ ...faceChange([[0, "bored"], [60, "angry"], [134, "angry"], [180, "determined"]], f), gesture: shout ? "point" : undefined, reachR: shout ? [-330, -760] : [120, -460], handR: shout ? "point" : "open", reachL: [-120, -470], lookX: -0.6 }),
        ]}
      >
        <DrummerKit at={D1} f={f} pace={0.3} seed={0} />
        <DrummerKit at={D2} f={f} pace={0.34} seed={1.7} />
        <DrummerKit at={D3} f={f} pace={0.27} seed={3.1} />
        <Oud position={[LUTE[0] + 0.12, STAGE.h + 0.62, LUTE[1] + 0.15]} rotation={[0, 0, -0.5]} scale={1.1} />
        <group userData={{ ghost: true }}>
          <Drum position={[bigX, 0.6, bigZ]} size={2.4} rotation={[0, Math.PI / 2, spin]} label="BIGGER" />
        </group>
        <Gauge position={JOY_AT} value={needle} label="JOY" accent="#2aa59a" top={1.35} size={0.42} />
        {BOOMS.map((b, i) => (
          <Burst key={b} kind="dust" at={[D2[0], STAGE.h + 0.6, D2[1] + 0.6]} frame={f - b} count={6} size={0.35} speed={0.5} colors={["#ffe6b0", "#f2d890"]} floor={null} seed={i + 2} />
        ))}
      </Hall>
      <Headline f={f} text="MORE MUSIC, LESS JOY?" at={14} out={128} />
    </>
  );
});

// ---------- 2. 222-316: the first song, bright day (dissolve: earlier that day) ----------

const FirstSongShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [1.45, 1.45, 1.6], target: [0.45, 1.15, -1.9], fov: 40 },
      { at: 80, position: [1.1, 1.32, 0.9], target: [0.55, 1.15, -1.9], fov: 38 },
    ],
    f,
  );
  const needle = 0.35 + 0.72 * ease(f, 50, 80) - 0.04 * Math.sin(Math.max(0, f - 80) * 0.6) * Math.exp(-Math.max(0, f - 80) / 10);
  return (
    <Hall
      camera={camera}
      f={f + 222}
      mode="day"
      blur={4}
      puppets={[shah({ ...moveChange([[0, "happy"], [52, "excited", "cheer"]], f), lookX: -0.5 })]}
    >
      <Gauge position={JOY_AT} value={needle} label="JOY" accent="#2aa59a" top={1.35} size={0.42} glow={ease(f, 74, 84)} />
      <Burst kind="confetti" at={[0.2, 1.8, -1.6]} frame={f - 62} count={40} size={0.6} seed={3} />
    </Hall>
  );
});

// ---------- 3. 316-390: the blacksmith in the yard forge ----------

const BLOWS = [8, 23, 36, 51, 64];
const ForgeShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.3, 2.1, 3.0], target: [-0.5, 1.3, -1.0], fov: 40 },
      { at: 66, position: [1.15, 1.5, 3.3], target: [0.45, 1.0, -0.5], fov: 40 },
    ],
    f,
  );
  // each blow: wind up over the shoulder, strike fast onto the anvil on the BLOWS frames (the sparks), recoil.
  // The anvil top is screen-left of the smith (ANVIL x - SMITH_AT x), at ANVIL_TOP; reach points are screen space.
  const strike: [number, number] = [((ANVIL[0] - 0.05 - SMITH_AT[0]) / PUPPET_HEIGHT) * 1060, (-(ANVIL_TOP + 0.03) / PUPPET_HEIGHT) * 1060];
  const swing = hammerSwing(f, { blows: BLOWS, strike, hand: "R", handle: 277, view: "side", facing: -1, lift: 1 - 0.15 * Math.sin(f * 0.05), other: [strike[0] + 90, strike[1] - 20] });
  const h = handWorld(SMITH_AT, swing.grip, camera);
  return (
    <Stage
      set={
        <ForgeSet camera={camera} frame={f + 316}>
          <Ring position={[ANVIL[0] - 0.05, ANVIL_TOP + 0.03, ANVIL[2] + 0.02]} rotation={[-Math.PI / 2, 0, 0]} scale={1.6} hot={1 - 0.5 * ramp(f, 0, 74)} />
          <Hammer position={h} rotation={[0, 0, swing.roll]} />
          {BLOWS.map((b, i) => (
            <Burst key={b} kind="sparks" at={[ANVIL[0] - 0.05, ANVIL_TOP + 0.06, ANVIL[2] + 0.04]} frame={f - b} count={10 + (i % 2) * 6} size={0.5} seed={i + 1} />
          ))}
        </ForgeSet>
      }
      camera={camera}
      bg={FORGE_BG}
      light={forgeLight(f)}
      blur={4}
      puppets={[P("smith", SMITH, SMITH_AT, { ...faceChange([[0, "determined"], [40, "thinking"]], f), view: "side", facing: -1, ...swing.pose })]}
    />
  );
});

// ---------- 4. 390-485: hours later, golden light, the needle barely moves ----------

const LaterShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-1.6, 1.4, 1.6], target: [-2.5, 1.0, -1.5], fov: 40 },
      { at: 50, position: [-0.5, 1.3, 1.2], target: [-0.3, 0.45, -1.05], fov: 40 },
      { at: 86, position: [0.2, 1.3, 1.5], target: [0.4, 1.1, -1.95], fov: 40 },
    ],
    f,
  );
  const twitch = f > 71 && f < 84 ? 0.04 * Math.sin((f - 71) * 0.8) : 0;
  return (
    <Hall
      camera={camera}
      f={f + 390}
      mode="corner"
      blur={4}
      puppets={[
        drummer("d1", DRUM1, D1, f, 0.16, 0, { ...faceChange([[0, "bored"]], f) }),
        onStage("lute", LUTIST, LUTE, { ...faceChange([[0, "bored"], [30, "sad"]], f), ...strumPlay(f, { body: [120, -560], neck: [-140, -640], energy: 0.5 }), view: "front", headTilt: 8 }),
        shah({ ...faceChange([[0, "bored"], [60, "sad"]], f), reachL: [-60, -760], frontL: true, handL: "open", headTilt: -10, slump: 0.6, lookX: -0.4 }),
      ]}
    >
      <DrummerKit at={D1} f={f} pace={0.16} seed={0} />
      <Oud position={[LUTE[0] + 0.12, STAGE.h + 0.62, LUTE[1] + 0.15]} rotation={[0, 0, -0.5]} scale={1.1} />
      <Gauge position={JOY_AT} value={0.3 + twitch} label="JOY" accent="#2aa59a" top={1.35} size={0.42} />
    </Hall>
  );
});

// ---------- 5. 485-670: more musicians, a bigger drum, the cart drum rolls off ----------

const CART_IN = 82; // "then one the size of a cart"
const TIP = 130; // "It rolls off the stage"
const SPLAT = 158; // "flattens the flute player"
const FLAT_AT: [number, number] = [-2.0, 0.35];
const CrowdShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.4, 1.4, 2.0], target: [0.0, 1.1, -1.9], fov: 40 },
      { at: 40, position: [-1.6, 1.5, 2.8], target: [-2.5, 1.05, -1.4], fov: 42 },
      { at: TIP, position: [-1.9, 1.5, 3.6], target: [-2.4, 0.8, -0.6], fov: 42 },
      { at: 176, position: [-1.8, 1.35, 3.3], target: [-2.05, 0.5, 0.1], fov: 40 },
    ],
    f,
  );
  // the cart drum is wheeled in on the stage, then tips over its front edge and rolls down onto the flute player
  const inP = ease(f, CART_IN - 30, CART_IN + 10);
  const roll = ramp(f, TIP, SPLAT);
  const cx = -4.4 + 1.9 * inP + 0.5 * roll;
  const cz = -1.35 + 1.7 * roll * roll;
  const cy = (STAGE.h + 0.55) * (1 - roll) + 0.55 * roll + Math.sin(roll * Math.PI) * 0.15;
  const spin = -(cx + 4.4) / 0.75 - roll * 3;
  const flat = f >= SPLAT;
  const w = stroll(f, 0, 30, [-2.0, -0.95], [-2.0, 0.35]);
  return (
    <Hall
      camera={camera}
      f={f + 485}
      mode="night"
      blur={4}
      near={[CANDLES[0], [-3.3, 0, 0.4]]}
      puppets={[
        shah({ ...moveChange([[0, "angry", "point"], [40, "determined"]], f), lookX: -0.6 }),
        drummer("d1", DRUM1, D1, f, 0.22, 0),
        drummer("d2", DRUM2, D2, f, 0.25, 1.7),
        drummer("d3", DRUM3, D3, f, 0.2, 3.1),
        onStage("lute", LUTIST, LUTE, { ...faceChange([[0, "worried"], [TIP, "shocked"]], f), ...strumPlay(f, { body: [120, -560], neck: [-140, -640] }), view: "front" }),
        P("flute", FLUTIST, flat ? FLAT_AT : w.at, {
          ...faceChange([[0, "neutral"], [TIP - 4, "shocked"], [SPLAT + 6, "confused"]], f),
          ...(flat ? lieDown(f, SPLAT - 2, 6) : { ...w.pose, reachR: [250, -700], reachL: [60, -700], frontR: true, frontL: true }),
        }),
        P("servant", SERVANT, [Math.min(-2.9, cx - 1.0), -1.3], { ...faceChange([[0, "determined"], [TIP, "shocked"]], f), air: STAGE_AIR, view: "side", facing: 1, reachR: [220, -640], reachL: [200, -580], lean: f < TIP ? 18 : -6 }),
      ]}
    >
      <DrummerKit at={D1} f={f} pace={0.22} seed={0} />
      <DrummerKit at={D2} f={f} pace={0.25} seed={1.7} />
      <DrummerKit at={D3} f={f} pace={0.2} seed={3.1} />
      <Oud position={[LUTE[0] + 0.12, STAGE.h + 0.62, LUTE[1] + 0.15]} rotation={[0, 0, -0.5]} scale={1.1} />
      {!flat && <Flute position={[w.at[0] + 0.26, 0.8, w.at[1] + 0.1]} rotation={[0, 0, -0.25]} />}
      <group userData={{ ghost: true }}>
        <Drum position={[cx, flat ? 0.55 : cy, cz]} size={2.2} rotation={[0, Math.PI / 2, spin]} label="BIGGER" />
        <Burst kind="dust" at={[FLAT_AT[0], 0.02, FLAT_AT[1]]} frame={f - SPLAT} count={20} size={1.0} seed={4} />
        <Burst kind="stars" at={[FLAT_AT[0] - 0.3, 0.5, FLAT_AT[1] + 0.3]} frame={f - SPLAT - 2} count={6} size={0.7} seed={6} />
      </group>
      {flat && <Flute position={[FLAT_AT[0] + 0.5, 0.03, FLAT_AT[1] + 0.35]} rotation={[0, 0.6, 0]} />}
      <Gauge position={JOY_AT} value={0.22 + 0.06 * ease(f, CART_IN, CART_IN + 10) - 0.06 * ease(f, CART_IN + 20, CART_IN + 40)} label="JOY" accent="#2aa59a" top={1.35} size={0.42} />
    </Hall>
  );
});

// ---------- 6. 670-876: the blacksmith offers the ring ----------

const SMITH_HALL: [number, number] = [0.98, -1.45];
const TAG = 67; // "this too shall pass"
const RingShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.25, 1.25, 0.9], target: [0.55, 0.95, -1.5], fov: 38 },
      { at: TAG, position: [0.3, 1.05, 0.2], target: [0.52, 0.8, -1.5], fov: 36 },
      { at: 120, position: [0.75, 1.3, 1.5], target: [0.25, 1.05, -1.8], fov: 40 },
      { at: 196, position: [0.45, 1.3, 1.2], target: [0.12, 1.08, -1.95], fov: 40 },
    ],
    f,
  );
  const reach: [number, number] = [260, -680];
  const h: Vec3 = [0.52, 0.86, -1.5];
  const yell = f >= 115;
  return (
    <Hall
      camera={camera}
      f={f + 670}
      mode="corner"
      blur={4}
      near={[CANDLES[1], CANDLES[0]]}
      puppets={[
        P("smith", SMITH, SMITH_HALL, { ...faceChange([[0, "neutral"], [TAG, "happy"], [118, "shocked"]], f), view: "side", facing: -1, reachR: reach, handR: "open", bend: 0.15, lean: -8 * ease(f, 118, 130) }),
        shah({ ...moveChange([[0, "skeptical"], [TAG + 8, "disgusted"], [115, "angry", "point"], [160, "angry"]], f), lookX: 0.6, reachR: yell ? [300, -760] : undefined, handR: yell ? "fist" : undefined }),
      ]}
    >
      <Ring position={[h[0] - 0.04, h[1] + 0.05, h[2] + 0.05]} rotation={[0, 0.3, 0]} scale={1.3} glint={ease(f, 10, 30)} />
      <InkBox size={[0.003, 0.08, 0.003]} position={[h[0] - 0.04, h[1] - 0.03, h[2] + 0.06]} color="#5a3a22" ink={0} />
      <Label text={"THIS TOO\nSHALL PASS"} position={[h[0] - 0.04, h[1] - 0.18, h[2] + 0.07]} width={0.3} appear={f - TAG} />
      <Gauge position={JOY_AT} value={0.18} label="JOY" accent="#2aa59a" top={1.35} size={0.42} />
    </Hall>
  );
});

// ---------- 7. 876-984: the ring snaps the lute string, the hall goes silent ----------

const THROW = 2;
const HIT = 50;
const SILENT = 72;
const OUD_AT: Vec3 = [LUTE[0] + 0.12, STAGE.h + 0.62, LUTE[1] + 0.15];
const SnapShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-2.3, 1.15, 0.35], target: [-2.75, 0.95, -1.0], fov: 40 },
      { at: HIT, position: [-2.4, 1.05, 0.15], target: [-2.75, 0.9, -1.0], fov: 38 },
      { at: 100, position: [-1.7, 1.45, 1.9], target: [-2.4, 1.0, -1.3], fov: 42 },
    ],
    f,
  );
  const fly = ramp(f, THROW + 26, HIT);
  const ringPos: Vec3 = [OUD_AT[0] + 1.6 * (1 - fly), OUD_AT[1] + 0.2 + Math.sin(fly * Math.PI) * 0.2, OUD_AT[2] + 0.5 * (1 - fly) + 0.04];
  const after = f - HIT;
  const ricochet: Vec3 = [OUD_AT[0] - 0.4 * ramp(after, 0, 20), OUD_AT[1] + 0.2 - 0.9 * ramp(after, 0, 20) ** 2, OUD_AT[2] + 0.3 * ramp(after, 0, 20)];
  const snap = ramp(f, HIT, HIT + 10);
  const frozen = f >= SILENT;
  const cloth = ramp(f, HIT + 2, HIT + 24);
  const freeze = (p: Partial<PuppetPose>) => (frozen ? { ...p, energy: 0 } : p);
  return (
    <Hall
      camera={camera}
      f={frozen ? 876 + SILENT : f + 876}
      mode="candle"
      blur={4}
      flash={0.35 * Math.exp(-Math.max(0, after) / 4) * (after >= 0 ? 1 : 0)}
      puppets={[
        onStage("lute", f >= HIT + 2 ? LUTIST_BARE : LUTIST, LUTE, freeze({ ...faceChange([[0, "happy"], [HIT, "shocked"]], f), ...strumPlay(f, { body: [120, -560], neck: [-140, -640] }), view: "front", hair: { lift: f > HIT ? 60 * (1 - cloth) : 0 } })),
        drummer("d2", DRUM2, D2, frozen ? SILENT : f, 0.25, 1.7, freeze({ ...faceChange([[0, "neutral"], [SILENT - 6, "shocked"]], f) })),
        drummer("d3", DRUM3, D3, frozen ? SILENT : f, 0.2, 3.1, freeze({ ...faceChange([[0, "neutral"], [SILENT - 4, "awkward"]], f) })),
      ]}
    >
      <Oud position={OUD_AT} rotation={[0, 0, -0.5]} scale={1.1} snap={snap} frame={f} />
      <DrummerKit at={D2} f={frozen ? SILENT : f} pace={0.25} seed={1.7} />
      <DrummerKit at={D3} f={frozen ? SILENT : f} pace={0.2} seed={3.1} />
      {f >= THROW + 26 && <Ring position={f < HIT ? ringPos : ricochet} rotation={[f * 0.4, f * 0.3, 0]} scale={1.3} />}
      {f >= HIT + 2 && (
        <group position={[LUTE[0] + 0.3 * cloth, 1.45 + 0.4 * Math.sin(cloth * Math.PI) - 1.3 * cloth * cloth, LUTE[1] + 0.25]} rotation={[cloth * 4, cloth * 3, cloth * 2]} userData={{ ghost: true }}>
          <InkBox size={[0.22, 0.1, 0.16]} color="#c8302a" ink={0.006} />
        </group>
      )}
      <Burst kind="stars" at={[OUD_AT[0] + 0.05, OUD_AT[1] + 0.2, OUD_AT[2] + 0.1]} frame={f - HIT} count={5} size={0.4} seed={9} />
    </Hall>
  );
});

// ---------- 8. 984-1051: the music starts again, the needle shoots past the top (hard cut in) ----------

const BurstShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [1.0, 1.35, 1.5], target: [0.5, 1.18, -1.9], fov: 40 },
      { at: 60, position: [0.8, 1.3, 0.95], target: [0.55, 1.2, -1.9], fov: 38 },
    ],
    f,
  );
  const needle = 0.1 + 1.1 * ease(f, 30, 50) - 0.06 * Math.sin(Math.max(0, f - 50) * 0.7) * Math.exp(-Math.max(0, f - 50) / 8);
  return (
    <Hall
      camera={camera}
      f={f + 984}
      mode="day"
      blur={4}
      puppets={[shah({ ...moveChange([[0, "shocked"], [10, "excited", "cheer"]], f), ...jump(f, 36, 200, 30), lookX: -0.4 })]}
    >
      <Gauge position={JOY_AT} value={needle} label="JOY" accent="#2aa59a" top={1.35} size={0.42} glow={ease(f, 44, 52)} />
      <Burst kind="confetti" at={[0.4, 2.0, -1.5]} frame={f - 8} count={60} size={0.7} seed={5} />
      <Burst kind="sparks" at={[JOY_AT[0], 1.5, JOY_AT[2] + 0.1]} frame={f - 50} count={14} size={0.5} seed={7} />
    </Hall>
  );
});

// ---------- 9. 1051-1291: the study, two TV sets, night blue ----------

const OldTV: React.FC<{ position: Vec3; ad: boolean; label: string; f: number }> = ({ position, ad, label, f }) => (
  <group position={position}>
    <InkBox size={[0.46, 0.36, 0.34]} position={[0, 0.18, 0]} color="#6a4428" ink={0.01} />
    <mesh position={[-0.04, 0.19, 0.171]}>
      <planeGeometry args={[0.3, 0.24]} />
      <meshBasicMaterial color={ad ? "#ffd84a" : "#7fd8ff"} toneMapped={false} />
    </mesh>
    {ad && <Label text="AD" position={[-0.04, 0.19, 0.173]} width={0.16} border={false} bg="#ffd84a" />}
    {!ad && (
      <mesh position={[-0.04 + 0.06 * Math.sin(f * 0.15), 0.17, 0.173]}>
        <circleGeometry args={[0.04, 16]} />
        <meshBasicMaterial color="#2a5aa8" />
      </mesh>
    )}
    {[0.12, 0.06].map((y) => (
      <mesh key={y} position={[0.17, y + 0.1, 0.172]}>
        <circleGeometry args={[0.02, 12]} />
        <meshBasicMaterial color="#2a1a10" />
      </mesh>
    ))}
    <Label text={label} position={[0, 0.47, 0.1]} width={0.42} />
  </group>
);

const TV_Y = 0.28;
const TV_A: Vec3 = [-0.4, TV_Y, -1.05];
const TV_B: Vec3 = [0.4, TV_Y, -1.05];
const StudyShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.1, 1.3, 1.8], target: [0.0, 0.62, -1.05], fov: 40 },
      { at: 80, position: [-0.5, 1.2, 1.3], target: [-0.4, 0.72, -1.1], fov: 38 },
      { at: 150, position: [-0.4, 1.2, 1.25], target: [-0.42, 0.8, -1.1], fov: 38 },
      { at: 225, position: [0.45, 1.2, 1.35], target: [0.4, 0.8, -1.1], fov: 38 },
    ],
    f,
  );
  const adOn = f > 100 && Math.floor((f - 100) / 30) % 2 === 0;
  const joyA = 0.75 - 0.5 * ease(f, 120, 220);
  const joyB = 0.75 - 0.3 * ease(f, 120, 160) + (f > 130 ? 0.3 * ease(f, 190, 215) : 0) + 0.05 * Math.sin(f * 0.1);
  return (
    <Hall
      camera={camera}
      f={f + 1051}
      mode="night"
      blur={4}
      truth={0.4}
      puppets={[shah({ ...faceChange([[0, "thinking"], [150, "confused"], [205, "happy"]], f), lookX: 0.2 })]}
    >
      <OldTV position={TV_A} ad={false} label="NO BREAKS" f={f} />
      <OldTV position={TV_B} ad={adOn} label="WITH BREAKS" f={f} />
      <Gauge position={[TV_A[0], 0, TV_A[2] - 0.12]} value={joyA} label="JOY" accent="#2aa59a" top={1.12} size={0.26} post={false} />
      <Gauge position={[TV_B[0], 0, TV_B[2] - 0.12]} value={joyB} label="JOY" accent="#2aa59a" top={1.12} size={0.26} post={false} glow={ease(f, 205, 215)} />
      <Label text="STUDY, 2009" position={[0, 0.62, -0.85]} width={0.36} appear={f - 32} />
      <Label text="PREFERRED" position={[TV_A[0], 0.9, TV_A[2] + 0.05]} width={0.3} appear={f - 152} />
    </Hall>
  );
});

// ---------- 10. 1291-1557: the spring and the scissors ----------

const DIAL: Vec3 = [0.1, 0, -1.0];
const DIAL_TOP = 1.3;
const DIAL_R = 0.3;
const CUT = 120; // "cuts the spring"
const FLAT: Vec3 = [1.05, 0, -1.0];
const SpringShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.3, 1.25, 1.3], target: [0.1, 1.05, -1.0], fov: 40 },
      { at: 70, position: [0.15, 1.15, 1.45], target: [0.08, 0.98, -1.0], fov: 38 },
      { at: CUT, position: [0.1, 1.12, 1.6], target: [0.02, 0.95, -1.0], fov: 38 },
      { at: 252, position: [1.3, 1.35, 2.1], target: [1.2, 1.1, -0.9], fov: 40 },
    ],
    f,
  );
  // the spring drags the needle down; the scissors close on it and the needle springs back up
  const cut = ramp(f, CUT, CUT + 8);
  const value = f < CUT ? 0.8 - 0.62 * ease(f, 20, 95) : 0.18 + 0.9 * ease(f, CUT + 40, CUT + 60) - 0.05 * Math.sin(Math.max(0, f - CUT - 60) * 0.6) * Math.exp(-Math.max(0, f - CUT - 60) / 10);
  const a = Math.PI / 2 - value * Math.PI;
  const tip: Vec3 = [DIAL[0] + Math.cos(a) * DIAL_R * 0.78, DIAL_TOP - DIAL_R * 0.14 + Math.sin(a) * DIAL_R * 0.78, DIAL[2] + 0.06];
  const peg: Vec3 = [DIAL[0] - 0.05, 0.62, DIAL[2] + 0.06];
  const close = ease(f, CUT - 12, CUT);
  const scissorsAt: Vec3 = [peg[0] + 0.36 - 0.15 * ease(f, 60, CUT - 12), (peg[1] + tip[1]) / 2 - 0.05, DIAL[2] + 0.12];
  return (
    <Hall
      camera={camera}
      f={f + 1291}
      mode="corner"
      blur={4}
      near={[CANDLES[1], CANDLES[0]]}
      truth={0.45}
      puppets={[P("guard", DRUM3, [1.5, -0.65], { ...faceChange([[0, "neutral"], [200, "bored"]], f), view: "front", lookX: -0.6 })]}
    >
      <InkBox size={[0.1, 0.7, 0.1]} position={[DIAL[0], 0.35, DIAL[2] - 0.05]} color="#5a3a22" ink={0.008} />
      <Gauge position={DIAL} value={value} label="JOY" accent="#2aa59a" top={DIAL_TOP} size={DIAL_R * 2} post={false} glow={f > CUT + 50 ? 1 : 0} />
      <InkBox size={[0.06, 0.06, 0.06]} position={peg} color="#3a3a40" ink={0.004} />
      <Spring from={peg} to={tip} cut={cut} label={"GETTING\nUSED TO IT"} labelAt={[DIAL[0] - 0.28, 0.98, DIAL[2] + 0.12]} />
      <Scissors position={scissorsAt} close={close} rotation={[0, 0, -0.1]} scale={1.1} flip />
      {/* the guard who barely gets used to anything: his JOY dial has no spring and never sags */}
      <Gauge position={FLAT} value={0.7 + 0.03 * Math.sin(f * 0.08)} label="JOY" accent="#2aa59a" top={1.25} size={0.3} />
      <Label text="BARELY GETS USED" position={[FLAT[0] + 0.15, 1.55, FLAT[2] + 0.06]} width={0.4} appear={f - 205} />
    </Hall>
  );
});

// ---------- 11. 1557-1643: the Shah strikes the gong ----------

const STRIKE = 64; // just before "gong", clear of the dip
const GONG_SHAH: [number, number] = [2.2, -0.6];
const GongShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [1.75, 1.4, 2.6], target: [2.6, 1.05, -0.8], fov: 40 },
      { at: STRIKE, position: [2.1, 1.35, 2.2], target: [2.7, 1.0, -0.8], fov: 38 },
    ],
    f,
  );
  const wind = ease(f, 40, STRIKE - 2);
  const hit = f >= STRIKE;
  // kept within arm's length, so the mallet placed at the same point stays in the hand
  const reachR: [number, number] = clampReach([10, -548], hit ? [340, -580] : [240 - 140 * wind, -560]);
  const h = handWorld(GONG_SHAH, reachR, camera);
  return (
    <Hall
      camera={camera}
      f={f + 1557}
      mode="night"
      blur={4}
      near={[CANDLES[1], CANDLES[3]]}
      puppets={[P("shah", SHAH, GONG_SHAH, { ...faceChange([[0, "determined"], [STRIKE, "excited"]], f), view: "side", facing: 1, reachR, handR: "fist", lean: hit ? 14 : -10 * wind, ...(hit ? jump(f, STRIKE + 2, 120, 26) : {}) })]}
    >
      <Gong position={GONG_AT} ring={hit ? Math.exp(-(f - STRIKE) / 30) : 0} frame={f} />
      <Mallet position={h} rotation={[0, 0, hit ? -1.55 : -1.25 + 0.35 * wind]} />
      <Burst kind="stars" at={[GONG_AT[0], 1.05, GONG_AT[2] + 0.1]} frame={f - STRIKE} count={7} size={0.6} seed={8} />
    </Hall>
  );
});

// ---------- 12. 1643-1764: today, a living room, the show cuts to an ad ----------

const AD = 75; // "cut to an ad"
const LivingShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [1.4, 2.3, 3.4], target: [-0.1, 0.7, -1.0], fov: 40 },
      { at: AD, position: [1.1, 2.15, 3.0], target: [-0.15, 0.78, -1.2], fov: 40 },
      { at: 108, position: [1.0, 2.1, 2.85], target: [-0.15, 0.8, -1.25], fov: 40 },
    ],
    f,
  );
  const ad = f >= AD ? 1 : 0;
  return (
    <Stage
      set={<LivingSet camera={camera} frame={f} ad={ad} />}
      camera={camera}
      bg={LIVING_BG}
      blur={4}
      light={{ shadow: 0.2, points: [{ position: [0, 0.95, -0.9], color: ad ? "#ffd8a0" : "#9ad8ff", strength: 1.6, range: 3 }] }}
      puppets={[P("viewer", VIEWER, [SOFA[0] + 0.3, SOFA[2] - 0.05], { sit: true, ...moveChange([[0, "bored"], [AD + 2, "happy", "cheer"]], f), lookX: -0.5, view: "front" })]}
    />
  );
});

// ---------- shot list ----------

const SHOTS: Shot[] = [
  [0, 222, HookShot, false],
  [222, 316, FirstSongShot, "dissolve"],
  [316, 390, ForgeShot, "dip"],
  [390, 485, LaterShot, "dip"],
  [485, 670, CrowdShot, "dip"],
  [670, 876, RingShot, "dip"],
  [876, 984, SnapShot, "dip"],
  [984, 1051, BurstShot, false],
  [1051, 1291, StudyShot, "dip"],
  [1291, 1557, SpringShot, "dip"],
  [1557, 1643, GongShot, "dip"],
  [1643, TIMING.totalFrames, LivingShot, "dip"],
];

// ---------- sound ----------

const SFX_RAW: Sfx[] = [
  // 1. hook: the band's booms, the rolling drum
  ...BOOMS.map((b, i) => ({ at: b, src: sfx("boom"), volume: (b > 134 ? 0.08 : 0.15) + 0.03 * (i % 3), space: "hall" as const })),
  ...foleyCues("thud", [8, 29, 50, 73, 94, 116], 0.3, { space: "hall" }),
  ...foleyCues("thud", [139, 161, 185, 206], 0.18, { space: "hall" }),
  { at: 0, src: sfx("rumble"), volume: 0.12, until: 72 },
  // 2. first song
  { at: 222 + 62, src: sfx("pop"), volume: 0.5 },
  { at: 222 + 74, src: sfx("chime"), volume: 0.3 },
  // 3. the forge
  { at: 316, src: sfx("crackle"), volume: 0.3, until: 390 },
  { at: 316 + BLOWS[0], src: sfx("clang"), volume: 0.3, space: "room" },
  ...foleyCues("fork-plate", BLOWS.slice(1).map((b) => 316 + b), 0.55, { space: "room" }),
  // 4. hours later
  ...foleyCues("thud", [390 + 14, 390 + 34, 390 + 56, 390 + 77], 0.18, { space: "hall" }),
  { at: 390 + 72, src: sfx("tick"), volume: 0.35 },
  // 5. more musicians, the cart drum
  ...foleyCues("thud", [485 + 10, 485 + 26, 485 + 41, 485 + 57, 485 + 72, 485 + 88, 485 + 104], 0.28, { space: "hall" }),
  { at: 485 + CART_IN - 30, src: sfx("rumble"), volume: 0.12, until: 485 + CART_IN + 10 },
  { at: 485 + TIP, src: sfx("creak"), volume: 0.3, space: "hall" },
  { at: 485 + TIP + 4, src: sfx("rumble"), volume: 0.14, until: 485 + SPLAT },
  { at: 485 + SPLAT, src: sfx("boom"), volume: 0.28, space: "hall", hit: 0.6 },
  { at: 485 + SPLAT + 2, src: sfx("squeak"), volume: 0.18, space: "hall" },
  // 6. the ring
  { at: 670 + 12, src: sfx("chime"), volume: 0.25 },
  { at: 670 + TAG, src: sfx("pop"), volume: 0.45 },
  // 7. the snap and the silence
  { at: 876 + THROW + 24, src: sfx("whoosh"), volume: 0.35 },
  { at: 876 + HIT, src: sfx("tape-stop"), volume: 0.18 },
  { at: 876 + HIT + 1, src: sfx("clink"), volume: 0.28, space: "hall" },
  // 8. the music starts again
  { at: 984 + 2, src: sfx("boom"), volume: 0.35, space: "hall" },
  { at: 984 + 8, src: sfx("pop"), volume: 0.6 },
  { at: 984 + 48, src: sfx("chime"), volume: 0.35 },
  // 9. the study
  { at: 1051 - 46, src: sfx("riser"), volume: 0.2 },
  { at: 1051 + 12, src: sfx("sting"), volume: 0.22 },
  { at: 1051 + 32, src: sfx("pop"), volume: 0.45 },
  ...[100, 160, 220].map((t) => ({ at: 1051 + t, src: sfx("button"), volume: 0.3, space: "hall" as const })),
  { at: 1051 + 152, src: sfx("card"), volume: 0.35 },
  // 10. the spring and the scissors
  { at: 1291 + 22, src: sfx("squeak"), volume: 0.25, space: "hall" },
  { at: 1291 + CUT, src: sfx("scrape"), volume: 0.3, space: "hall" },
  { at: 1291 + CUT + 2, src: sfx("bolt"), volume: 0.4, space: "hall" },
  { at: 1291 + CUT + 42, src: sfx("whoosh"), volume: 0.3 },
  { at: 1291 + 205, src: sfx("pop"), volume: 0.4 },
  // 11. the gong
  { at: 1557 + STRIKE, src: sfx("clang"), volume: 0.6, space: "hall", hit: 0.4 },
  { at: 1557 + STRIKE + 1, src: sfx("chime"), volume: 0.4, space: "hall" },
  // 12. the living room
  { at: 1643, src: sfx("ambience"), volume: 0.12, until: TIMING.totalFrames },
  { at: 1643 + AD, src: sfx("button"), volume: 0.35, space: "room" },
];

const SFX: Sfx[] = SFX_RAW.map((c) => ({ ...c, volume: c.volume * (c.until ? 0.4 : 0.65) }));

// The band plays all night; it stops dead when the string snaps (silence) and comes back on the hard cut.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 390, volume: 0.27 },
  { src: "music/lounge.wav", from: 390, to: 670, volume: 0.24 },
  { src: "music/mystery.wav", from: 670, to: 876 + HIT, volume: 0.26 },
  { src: "music/upbeat.wav", from: 984, to: 1051, volume: 0.3, fade: false },
  { src: "music/tension.wav", from: 1051, to: 1557, volume: 0.25 },
  { src: "music/upbeat.wav", from: 1557, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
