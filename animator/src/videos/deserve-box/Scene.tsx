import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  Halo,
  handWorld,
  Headline,
  InkBox,
  Label,
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
  stepFrames,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Horse, HORSE } from "../niagara-silent/props";
import { Splash } from "../../three/RiverSets";
import { Candlestick } from "../../three/ThroneRoomSet";
import {
  AISLE,
  AisleSet,
  Balloon,
  BonePile,
  CASKET_X,
  Casket,
  EarthAndWorms,
  EMPEROR_AT,
  Gauge,
  GAUGE_AT,
  hallBg,
  HALL_CANDLES,
  hallLight,
  HallMode,
  HallSet,
  HeroBox,
  Hose,
  Inscription,
  KNIGHT_AT,
  Lance,
  Lever,
  LISTS,
  LISTS_BG,
  listsLight,
  ListsSet,
  MudPuddle,
  Pump,
  Skull,
  StudyBook,
  TABLE,
  Treasure,
  Trophy,
  WOMAN_AT,
  Worm,
} from "./sets";
import TIMING_JSON from "./timing.json";

// "Why 'You Deserve It' Picks the Wrong Box": a muddy tournament winner faces the Gesta Romanorum's three caskets. The
// gold one says WHOSO CHOOSETH ME SHALL FIND THAT HE DESERVETH; he grabs it and gets dust and dead men's bones, silver
// gives earth and worms. The pivot: Cavanaugh (2014) found that feeling you deserve it, not mood, best predicts treating
// yourself; his VICTORY pump inflates the I DESERVE IT balloon that shoves his hand to the gold. The quiet woman ignores
// the needle and opens plain lead: fine gold and precious stones. Today that gold box sits on a shelf.
// Sources: ../videos/deserve-box/research.md. Sets: ./sets.tsx, guide/references/casket-hall.md.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "deserve-box";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());
const UNITS = 1060 / 1.3; // puppet units per metre
const ASPECT = 9 / 16;

// ---------- cast ----------

const KNIGHT: PuppetLook = { skin: "#f0c8a8", hair: "#c8682a", outfit: "#2a5aa8", tunic: true, mail: "#a8acb4", mud: "#6a4a2a", belt: "#5a3a22", cloak: "#b02a2a", build: "broad", pants: "#5a5a64", stubble: "#a85a2a" };
const WOMAN: PuppetLook = { skin: "#e8b890", hair: "#3a2416", long: true, skirt: true, outfit: "#8a7a68", belt: "#5a4a3a" };
const EMPEROR: PuppetLook = { skin: "#f0c8a8", hair: "#e8e4dc", beard: "#e8e4dc", outfit: "#8a1f24", tunic: true, belt: "#e0b040", cloak: "#5a1a6a", hat: "#e8b838", hatStyle: "crown", build: "broad", pants: "#5a1a2a" };
const RIVAL: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#c8302a", tunic: true, mail: "#9aa0a8", belt: "#4a3020", pants: "#4a4a54", beard: "#2a1e16" };
const SHOPPER: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", long: true, outfit: "#3ab0a0", pants: "#2a3a5a", shoes: "#f2f2f2" };

const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: { expression: "neutral", ...p } as PuppetPose });

// The knight on his stool, facing the caskets (+x).
const seated = (p: Partial<PuppetPose>, at: [number, number] = KNIGHT_AT): PuppetPlacement => P("knight", KNIGHT, at, { sit: true, view: "side", facing: 1, ...p });

const casketY = TABLE.top;
const casketZ = TABLE.z;
const GOLD: Vec3 = [CASKET_X.gold, casketY, casketZ];
const SILVER: Vec3 = [CASKET_X.silver, casketY, casketZ];
const LEAD: Vec3 = [CASKET_X.lead, casketY, casketZ];

type HallShotProps = {
  camera: CameraShot;
  f: number;
  mode: HallMode;
  puppets?: PuppetPlacement[];
  blur?: number;
  foreground?: React.ReactNode;
  table?: boolean;
  stool?: boolean;
  near?: Vec3[];
  truth?: number;
  children?: React.ReactNode;
};
const Hall: React.FC<HallShotProps> = ({ camera, f, mode, puppets, blur = 4, foreground, table, stool, near = [HALL_CANDLES[0], HALL_CANDLES[1]], truth, children }) => (
  <Stage
    set={
      <HallSet camera={camera} frame={f} mode={mode} table={table} stool={stool}>
        {children}
      </HallSet>
    }
    camera={camera}
    bg={hallBg(mode)}
    puppets={puppets}
    light={hallLight(mode, f, near)}
    blur={blur}
    truth={truth}
    foreground={foreground}
  />
);

// The three caskets on the table, with optional per-casket state.
const Caskets: React.FC<{ f: number; gold?: Partial<React.ComponentProps<typeof Casket>>; silver?: Partial<React.ComponentProps<typeof Casket>>; lead?: Partial<React.ComponentProps<typeof Casket>>; jump?: number }> = ({ f, gold, silver, lead, jump = 0 }) => (
  <>
    <Casket kind="gold" position={[GOLD[0], GOLD[1] + jump, GOLD[2]]} frame={f} {...gold} />
    <Casket kind="silver" position={[SILVER[0], SILVER[1] + jump * 0.7, SILVER[2]]} frame={f} {...silver} />
    <Casket kind="lead" position={[LEAD[0], LEAD[1] + jump * 0.5, LEAD[2]]} frame={f} {...lead} />
  </>
);

// ---------- 1. 0-217: the hook, warm hall ----------

const SLAM = 9;
const HookShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.62, 0.86, 1.4], target: [-1.02, 0.62, -0.2], fov: 40 },
      { at: 50, position: [-0.95, 1.15, 2.35], target: [-1.2, 0.85, -0.6], fov: 40 },
      { at: 92, position: [-0.95, 1.2, 2.55], target: [-1.15, 0.85, -0.6], fov: 40 },
      { at: 165, position: [-0.05, 1.25, 2.8], target: [-0.05, 0.8, -0.6], fov: 40 },
      { at: 203, position: [0.5, 1.2, 2.7], target: [0.45, 0.8, -0.7], fov: 40 },
    ],
    f,
  );
  const drop = ease(f, -6, SLAM);
  const trophyY = f < SLAM ? 0.78 - 0.36 * drop * drop : TABLE.top;
  const jump = f >= SLAM && f < SLAM + 10 ? Math.sin(((f - SLAM) / 10) * Math.PI) * 0.03 : 0;
  // the needle whips from the green into the red as he hears "what he deserves"
  const needle = 0.18 + 0.86 * ease(f, 62, 90) + 0.06 * Math.sin(Math.max(0, f - 90) * 0.5) * Math.exp(-Math.max(0, f - 90) / 12);
  return (
    <>
      <Hall
        camera={camera}
        f={f}
        mode="warm"
        blur={4}
        puppets={[
          seated({ ...faceChange([[0, "excited"], [SLAM + 2, "angry"], [30, "excited"], [70, "smug"], [150, "happy"]], f), reachR: f < SLAM + 14 ? [260, -540 + 120 * (1 - ease(f, -6, SLAM))] : [180, -470], handR: "fist", reachL: [-40, -470], handL: "open", lean: f < SLAM + 6 ? 12 : 4, lookX: 0.6 }),
          P("emperor", EMPEROR, EMPEROR_AT, { ...faceChange([[0, "neutral"], [SLAM + 3, "shocked"], [40, "smug"]], f), gesture: f > 130 ? "point" : undefined, reachR: f > 130 ? [260, -640] : undefined, lookX: -0.4 }),
          P("woman", WOMAN, WOMAN_AT, { expression: "neutral", lookX: -0.5 }),
        ]}
      >
        <Caskets f={f} jump={jump} />
        <Trophy position={[-0.98, trophyY, -0.16]} scale={1.05} rotation={[0, 0.3, f < SLAM ? 0.15 * (1 - drop) : 0]} />
        <Burst kind="dust" at={[-0.98, TABLE.top + 0.01, -0.16]} frame={f - SLAM} count={18} size={0.6} speed={0.7} colors={["#f2e6c8", "#e6d6b0"]} floor={TABLE.top} seed={2} />
        <Burst kind="stars" at={[-0.98, TABLE.top + 0.2, -0.16]} frame={f - SLAM} count={6} size={0.6} seed={3} />
        <Gauge position={GAUGE_AT} value={needle} label={"I DESERVE\nIT"} glow={ease(f, 85, 95)} />
      </Hall>
      <Headline f={f} text="GOLD, SILVER OR LEAD?" at={139} out={214} />
    </>
  );
});

// ---------- 2. 217-379: the tournament this morning ----------

const HS = 0.82; // horses drawn a little small so the rider reads on top
const SADDLE = HORSE.saddle * HS;
const SADDLE_AIR = (SADDLE - 0.34) * UNITS;
const RIDE_Z = 0.3;
const HIT = 36; // the lances meet ("every rider")
const SPLAT = 72; // the rival lands in the mud ("mud")
const MUD: Vec3 = [0.75, 0, 0.75];
const ListsShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.9, 1.5, 4.7], target: [-0.4, 1.0, -0.8], fov: 42 },
      { at: HIT, position: [-0.1, 1.55, 4.6], target: [0.05, 1.0, -0.8], fov: 42 },
      { at: SPLAT + 6, position: [0.6, 1.45, 3.9], target: [0.7, 0.6, 0.0], fov: 42 },
      { at: 145, position: [1.45, 1.65, 3.8], target: [1.45, 1.2, -1.1], fov: 40 },
    ],
    f,
  );
  // the knight gallops +x along the near side, reins in after the hit
  const kx = f < 110 ? -1.9 + 3.4 * Math.sin(Math.min(1, f / 110) * Math.PI * 0.5) : 1.5;
  const kRun = f < 80 ? 1.3 : 1.3 * (1 - ease(f, 80, 115));
  const kPhase = f * 0.5 - Math.max(0, f - 80) * 0.25;
  const kz = -1.55;
  // the rival gallops -x along the far side until the hit, then flies out of the saddle and lands back-first in the mud
  const rx = f < HIT ? 2.1 - 2.1 * (f / HIT) : 0.0 - 0.6 * ease(f, HIT, HIT + 40);
  const rz = -0.25;
  const fly = ramp(f, HIT, SPLAT);
  const riderX = f < HIT ? rx + 0.04 : 0.04 + (MUD[0] - 0.04) * fly;
  const riderZ = f < HIT ? rz + RIDE_Z * -1 + 0.6 : rz + 0.3 + (MUD[2] - rz - 0.3) * fly;
  const riderAir = f < HIT ? SADDLE_AIR : f < SPLAT ? SADDLE_AIR * (1 - fly) + Math.sin(fly * Math.PI) * 300 : 0;
  const cheer = 0.3 + 0.7 * ease(f, HIT + 4, HIT + 20);
  const kAir = SADDLE_AIR + Math.abs(Math.cos(kPhase)) * 0.04 * kRun * UNITS;
  const kAt: [number, number] = [kx - 0.04, kz + RIDE_Z];
  const kReach: [number, number] = f > 86 ? [150, -980] : [200, -620];
  const kh = handWorld(kAt, kReach, camera);
  const kHand: Vec3 = [kh[0], kh[1] + kAir / UNITS, kh[2] + 0.02];
  const rAt: [number, number] = [rx + 0.04, rz + RIDE_Z];
  const rh = handWorld(rAt, [200, -620], camera);
  const rHand: Vec3 = [rh[0], rh[1] + SADDLE_AIR / UNITS, rh[2] + 0.02];
  return (
    <Stage
      set={
        <ListsSet camera={camera} frame={f + 217} cheer={cheer}>
          <group position={[kx, 0, kz]} userData={{ ghost: true }}>
            <Horse scale={HS} phase={kPhase} run={kRun} saddle="#2a5aa8" coat="#e8e0d0" />
          </group>
          <Lance position={kHand} rotation={[0, -0.35 * (1 - ease(f, HIT + 10, 100)), f > 86 ? 1.3 * ease(f, 86, 104) : -0.05]} length={2.2} broken={f >= HIT} />
          <group position={[rx, 0, rz]} rotation={[0, Math.PI, 0]} userData={{ ghost: true }}>
            <Horse scale={HS} phase={f * 0.5} run={f < HIT ? 1.3 : 1.3 * (1 - ease(f, HIT, HIT + 40))} saddle="#c8302a" coat="#5a3a24" />
          </group>
          {f < HIT && <Lance position={rHand} rotation={[0, Math.PI - 0.35, 0]} length={2.2} />}
          <MudPuddle position={MUD} r={0.75} />
          <Burst kind="sparks" at={[0.1, SADDLE + 0.35, -0.8]} frame={f - HIT} count={12} size={0.8} seed={4} colors={["#fff2c0", "#f2e6c8"]} />
          <Burst kind="dust" at={[0.1, SADDLE + 0.3, -0.8]} frame={f - HIT} count={14} size={0.6} speed={0.9} colors={["#f6efe0", "#e8d8b8"]} floor={null} seed={5} />
          <Burst kind="dust" at={[MUD[0], 0.02, MUD[2]]} frame={f - SPLAT} count={14} size={0.45} speed={0.7} colors={["#7a5a38", "#5a3e24"]} seed={6} />
        </ListsSet>
      }
      camera={camera}
      bg={LISTS_BG}
      light={listsLight()}
      blur={3}
      puppets={[
        P("knight", KNIGHT, kAt, {
          ...faceChange([[0, "determined"], [HIT + 2, "excited"], [86, "happy"]], f),
          sit: true,
          air: kAir,
          view: f > 100 ? "front" : "side",
          facing: 1,
          lean: f < HIT ? 10 : 0,
          reachR: kReach,
          handR: "fist",
          reachL: [80, -600],
          handL: "fist",
        }),
        P("rival", RIVAL, [riderX, riderZ], {
          ...faceChange([[0, "determined"], [HIT, "shocked"], [SPLAT + 4, "disgusted"]], f),
          sit: f < HIT,
          air: riderAir,
          view: "side",
          facing: -1,
          lean: f < HIT ? 8 : -40 * fly,
          reachR: f < HIT ? [200, -620] : undefined,
          handR: "fist",
          lie: f >= SPLAT ? 1 : f > HIT ? fly * 0.8 : 0,
          armL: f > HIT ? [150, -30] : undefined,
          armR: f > HIT ? [140, -20] : undefined,
        }),
      ]}
      foreground={<InkBox size={[0.1, 1.2, 0.1]} position={frameSpot({ position: [-0.9, 1.5, 4.7], target: [-0.4, 1.0, -0.8], fov: 42 }, ASPECT, -0.95, -0.55, 1.6)} color="#c83a2a" ink={0.01} />}
    />
  );
});

// ---------- 3. 379-449: the woman waits, dusk corner ----------

const CornerShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [1.9, 2.0, 0.6], target: [2.5, 1.6, -2.1], fov: 40 },
      { at: 58, position: [1.75, 1.12, 0.35], target: [2.45, 0.78, -2.1], fov: 38 },
    ],
    f,
  );
  return (
    <Hall
      camera={camera}
      f={f + 379}
      mode="dusk"
      blur={5}
      near={[HALL_CANDLES[2], HALL_CANDLES[1]]}
      puppets={[P("woman", WOMAN, WOMAN_AT, { ...faceChange([[0, "neutral"], [30, "thinking"]], f), reachL: [-150, -420], handL: "open", lookX: -0.6, headTilt: -4 + 3 * ease(f, 20, 60) })]}
    >
      <Caskets f={f} />
      <Gauge position={[1.85, 0, -1.25]} value={0.12} label={"I DESERVE\nIT"} top={1.2} size={0.34} />
    </Hall>
  );
});

// ---------- 4. 449-550: the gold inscription, cool day light ----------

const PLAQUE: Vec3 = [CASKET_X.gold, 1.1, casketZ - 0.26];
const InscriptionShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.5, 1.22, 1.05], target: [-0.66, 1.06, -0.66], fov: 32 },
      { at: 57, position: [-0.53, 1.1, 1.1], target: [-0.66, 0.96, -0.66], fov: 32 },
      { at: 88, position: [-0.48, 0.98, 1.25], target: [-0.66, 0.8, -0.6], fov: 34 },
    ],
    f,
  );
  return (
    <Hall camera={camera} f={f + 449} mode="day" blur={1.5}>
      <Caskets f={f} />
      <Trophy position={[-0.98, TABLE.top, -0.6]} scale={1.05} rotation={[0, 0.3, 0]} />
      <group position={[PLAQUE[0], 0, PLAQUE[2] - 0.02]}>
        <InkCylinder2 />
      </group>
      <Inscription kind="gold" position={PLAQUE} width={0.34} appear={[f - 37, f - 57, f - 79]} />
    </Hall>
  );
});

// The plaque's stand: a gilded post behind the gold casket.
const InkCylinder2: React.FC = () => <InkBox size={[0.04, 1.0, 0.04]} position={[0, 0.5, -0.02]} color="#b8801a" ink={0.006} />;

// ---------- 5. 550-651: the needle slams into the red, ember ----------

const ReachShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-1.25, 1.3, 2.45], target: [-1.45, 0.98, -0.7], fov: 40 },
      { at: 48, position: [-1.1, 1.15, 2.25], target: [-1.3, 0.88, -0.6], fov: 40 },
      { at: 88, position: [-0.85, 1.02, 1.95], target: [-1.05, 0.72, -0.4], fov: 38 },
    ],
    f,
  );
  const needle = 0.55 + 0.53 * ease(f, 22, 46) - 0.04 * Math.sin(Math.max(0, f - 46) * 0.6) * Math.exp(-Math.max(0, f - 46) / 10);
  const reach = ease(f, 60, 90);
  return (
    <Hall
      camera={camera}
      f={f + 550}
      mode="ember"
      blur={4}
      puppets={[seated({ ...faceChange([[0, "smug"], [30, "excited"], [62, "determined"]], f), reachR: [140 + 230 * reach, -470 - 70 * reach], handR: reach > 0.6 ? "open" : "fist", reachL: [-60, -430], lean: 4 + 16 * reach, lookX: 0.7, headTilt: 6 * reach })]}
    >
      <Caskets f={f} />
      <Trophy position={[-0.98, TABLE.top, -0.6]} scale={1.05} rotation={[0, 0.3, 0]} />
      <Gauge position={GAUGE_AT} value={needle} label={"I DESERVE\nIT"} glow={ease(f, 40, 50)} />
    </Hall>
  );
});

// ---------- 6. 651-796: dust and dead men's bones, sick green (hard cut in) ----------

const LIFT = 12;
const PUFF = 32;
const BONES = 62;
const HOP = 92;
const LAP = 126;
const LAP_AT: Vec3 = [-1.12, 0.47, -0.2];
const skullPath = (f: number): Vec3 => {
  const t = ramp(f, HOP, LAP);
  const from: Vec3 = [GOLD[0], GOLD[1] + 0.2, GOLD[2] + 0.02];
  const x = from[0] + (LAP_AT[0] - from[0]) * t;
  const z = from[2] + (LAP_AT[2] - from[2]) * t;
  const arc = Math.sin(t * Math.PI) * 0.22;
  const y = from[1] + (LAP_AT[1] - from[1]) * t + arc;
  const settle = f > LAP ? Math.abs(Math.sin((f - LAP) * 0.5)) * 0.04 * Math.exp(-(f - LAP) / 6) : 0;
  return [x, y + settle, z];
};
const BonesShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.45, 1.15, 2.3], target: [-0.85, 0.72, -0.4], fov: 40 },
      { at: PUFF, position: [-0.5, 1.1, 2.15], target: [-0.88, 0.72, -0.4], fov: 40 },
      { at: HOP, position: [-0.6, 1.1, 2.4], target: [-1.0, 0.7, -0.35], fov: 40 },
      { at: 135, position: [-0.8, 1.0, 2.15], target: [-1.12, 0.62, -0.3], fov: 40 },
    ],
    f,
  );
  const open = ease(f, LIFT, LIFT + 16);
  const shake = f < LIFT ? ramp(f, 0, LIFT) : 0;
  const sp = skullPath(f);
  const blast = ease(f, PUFF, PUFF + 6) * (1 - ease(f, PUFF + 10, PUFF + 30));
  return (
    <Hall
      camera={camera}
      f={f + 651}
      mode="sick"
      blur={4}
      puppets={[
        seated({ ...faceChange([[0, "excited"], [PUFF, "shocked"], [LAP + 2, "disgusted"]], f), reachR: f < PUFF ? [330, -560] : f < LAP ? [120, -760] : [180, -360], handR: "open", reachL: f < LAP ? [-40, -700] : [140, -380], handL: "open", lean: f < PUFF ? 14 : -14 * blast - 4, hair: { lift: 60 * blast, sway: -10 * blast } }),
        P("emperor", EMPEROR, EMPEROR_AT, { ...faceChange([[0, "neutral"], [PUFF + 2, "smug"]], f), lookX: -0.6 }),
      ]}
    >
      <Caskets f={f} gold={{ open, shake, inside: <BonePile rise={ease(f, BONES - 10, BONES + 6)} /> }} />
      <Trophy position={[-0.98, TABLE.top, -0.6]} scale={1.05} rotation={[0, 0.3, 0]} />
      {f >= HOP - 4 && <Halo position={[sp[0], sp[1], sp[2] + 0.12]} size={0.35} color="#fff8e0" strength={0.35} />}
      {f >= HOP - 4 && <Skull position={f < HOP ? [GOLD[0], GOLD[1] + 0.17, GOLD[2]] : sp} rotation={[0, 0.4 + ramp(f, HOP, LAP) * 2.4, ramp(f, HOP, LAP) * 5.5]} scale={0.95} jaw={f > LAP ? 0.6 + 0.4 * Math.sin(f * 0.5) : 0} />}
      <group userData={{ ghost: true }}>
        <Burst kind="dust" at={[GOLD[0], GOLD[1] + 0.3, GOLD[2]]} frame={f - PUFF} count={40} size={1.6} speed={1.3} colors={["#d8d0a8", "#b8b090", "#e8e2c8"]} floor={null} seed={7} spray={[-0.6, 0.3, 0.3]} />
        <Halo position={[GOLD[0], GOLD[1] + 0.35, GOLD[2] + 0.1]} size={0.9} color="#a8e070" strength={0.35 * open} />
      </group>
      <Gauge position={GAUGE_AT} value={1.05 - 0.9 * ease(f, PUFF, PUFF + 30)} label={"I DESERVE\nIT"} />
    </Hall>
  );
});

// ---------- 7. 796-962: earth and worms, dust brown ----------

const S_OPEN = 4;
const EARTH = 92;
const WORM_ON = 112;
const SHAKE_OFF = 128;
const KNIGHT_STAND: [number, number] = [-0.72, 0.06];
const SilverShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [0.25, 1.15, 1.15], target: [0.02, 0.8, -0.45], fov: 40 },
      { at: 38, position: [0.2, 1.2, 0.85], target: [0.02, 0.92, -0.62], fov: 38 },
      { at: EARTH, position: [0.15, 1.12, 0.55], target: [0.02, 0.55, -0.4], fov: 38 },
      { at: 116, position: [-0.05, 1.2, 2.0], target: [-0.3, 0.82, -0.2], fov: 40 },
      { at: 150, position: [-0.25, 1.15, 2.7], target: [-0.45, 0.85, -0.12], fov: 40 },
    ],
    f,
  );
  const open = ease(f, S_OPEN, S_OPEN + 18);
  const handOnRim = f > 60 && f < SHAKE_OFF;
  const shakeArm = f >= SHAKE_OFF && f < SHAKE_OFF + 14 ? Math.sin((f - SHAKE_OFF) * 1.6) * 80 : 0;
  // the worm climbs from the earth onto his hand on the rim, then flies off when he shakes it
  const wormT = ramp(f, WORM_ON - 14, WORM_ON);
  const flick = ramp(f, SHAKE_OFF, SHAKE_OFF + 16);
  const wormPos: Vec3 = f < SHAKE_OFF ? [SILVER[0] - 0.2 + 0.0 * wormT, SILVER[1] + 0.2 + 0.08 * wormT, SILVER[2] + 0.14] : [SILVER[0] - 0.2 - 0.6 * flick, SILVER[1] + 0.28 + Math.sin(flick * Math.PI) * 0.35 - 0.6 * flick * flick, SILVER[2] + 0.14 + 0.4 * flick];
  return (
    <Hall
      camera={camera}
      f={f + 796}
      mode="dust"
      blur={4}
      stool={true}
      puppets={[
        P("knight", KNIGHT, KNIGHT_STAND, {
          ...faceChange([[0, "worried"], [EARTH, "disgusted"], [WORM_ON + 2, "shocked"], [132, "angry"]], f),
          view: "side",
          facing: 1,
          reachR: handOnRim ? [330, -560] : f >= SHAKE_OFF + 14 ? [120, -880] : [240 + shakeArm * 0.3, -620 + shakeArm],
          handR: f >= SHAKE_OFF + 14 ? "fist" : "open",
          reachL: f > 130 ? [40, -700] : [-60, -450],
          handL: "fist",
          lean: handOnRim ? 14 : 2,
          bend: handOnRim ? 0.15 : 0,
        }),
      ]}
    >
      <Caskets f={f} gold={{ open: 1, inside: <BonePile rise={1} /> }} silver={{ open, inside: <EarthAndWorms frame={f} rise={ease(f, EARTH - 20, EARTH)} /> }} />
      <Inscription kind="silver" position={[SILVER[0], 1.0, casketZ - 0.26]} width={0.4} appear={[f - 4, f - 30]} />
      <group position={[SILVER[0], 0, casketZ - 0.28]}>
        <InkBox size={[0.04, 0.9, 0.04]} position={[0, 0.45, -0.02]} color="#8a909c" ink={0.006} />
      </group>
      <Skull position={[-1.05, 0.08, 0.15]} rotation={[0.2, 1.2, 0.3]} scale={0.95} />
      {f > WORM_ON - 16 && f < SHAKE_OFF + 18 && (
        <group userData={{ ghost: true }}>
          <Worm position={wormPos} frame={f} length={0.1} seed={9} rotation={[0, 0, f < SHAKE_OFF ? 1.2 : 1.2 + flick * 8]} />
        </group>
      )}
    </Hall>
  );
});

// ---------- 8. 962-1188: the study, cold blue truth ----------

const BOARD: Vec3 = [0.35, 0, -1.3];
const MOOD_AT: Vec3 = [BOARD[0] - 0.42, 0, BOARD[2]];
const DESERVE_AT: Vec3 = [BOARD[0] + 0.42, 0, BOARD[2]];
const LEVER_AT: Vec3 = [BOARD[0], 0.8, BOARD[2] + 0.06];
const BOOK_AT: Vec3 = [-0.95, 0, -0.35];
const TruthShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.45, 1.5, 1.35], target: [-0.95, 1.0, -0.35], fov: 40 },
      { at: 40, position: [-0.35, 1.42, 1.8], target: [-0.75, 0.98, -0.5], fov: 40 },
      { at: 107, position: [0.3, 1.2, 2.0], target: [0.35, 0.85, -1.2], fov: 40 },
      { at: 165, position: [0.15, 1.35, 1.9], target: [0.0, 1.1, -1.25], fov: 40 },
      { at: 212, position: [0.85, 1.3, 2.15], target: [0.8, 1.0, -1.2], fov: 40 },
    ],
    f,
  );
  // MOOD swings all over the place (sad, happy) while the lever never moves; I DESERVE IT rises and pulls it down
  const moodSwing = f > 140 ? 0.5 + 0.42 * Math.sin((f - 140) * 0.32) * Math.sin((f - 140) * 0.07 + 1) : 0.5;
  const deserve = 0.15 + 0.85 * ease(f, 186, 206);
  const down = ease(f, 200, 210);
  return (
    <Hall
      camera={camera}
      f={f + 962}
      mode="truth"
      blur={4}
      table={false}
      stool={false}
      truth={0.15}
      puppets={[P("emperor", EMPEROR, [1.42, -0.95], { ...moveChange([[0, "neutral"], [100, "thinking", "chin"], [150, "skeptical"], [205, "happy", "point"]], f), lookX: -0.7, view: "front" })]}
    >
      <InkBox size={[1.5, 1.3, 0.06]} position={[BOARD[0], 0.95, BOARD[2] - 0.08]} color="#3a2a1e" ink={0.012} />
      <Gauge position={[MOOD_AT[0], 0, MOOD_AT[2]]} value={moodSwing} label="MOOD" post={false} top={1.25} size={0.4} accent="#4a7ae0" />
      <Gauge position={[DESERVE_AT[0], 0, DESERVE_AT[2]]} value={deserve} label={"I DESERVE\nIT"} post={false} top={1.25} size={0.4} glow={down} />
      {/* a rod from I DESERVE IT down to the lever; MOOD's rod hangs loose, connected to nothing */}
      <InkBox size={[0.02, 0.14, 0.02]} position={[DESERVE_AT[0], 0.98 - 0.04 * down, BOARD[2] + 0.02]} color="#c8c8c8" ink={0.004} />
      <InkBox size={[0.3, 0.02, 0.02]} position={[BOARD[0] + 0.28, 0.98 - 0.04 * down, BOARD[2] + 0.02]} color="#c8c8c8" ink={0.004} />
      <InkBox size={[0.02, 0.26, 0.02]} position={[MOOD_AT[0], 0.9, BOARD[2] + 0.02]} rotation={[0, 0, 0.12 * Math.sin(f * 0.2)]} color="#c8c8c8" ink={0.004} />
      <Lever position={LEVER_AT} down={down} label={"TREAT\nYOURSELF"} />
      <Burst kind="confetti" at={[LEVER_AT[0], LEVER_AT[1] + 0.5, LEVER_AT[2] + 0.1]} frame={f - 208} count={30} size={0.5} colors={["#f0c030", "#ffe080", "#e8a020"]} seed={11} />
      <StudyBook position={BOOK_AT} label={"CAVANAUGH,\n2014"} rotationY={0.25} />
    </Hall>
  );
});

// ---------- 9. 1188-1396: the VICTORY pump and the balloon, dream purple ----------

const POP = 184;
const PUMP_AT: Vec3 = [-1.62, 0, -0.08];
const PumpShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-1.0, 0.95, 2.2], target: [-1.5, 0.62, 0.0], fov: 40 },
      { at: 60, position: [-0.85, 1.3, 2.6], target: [-1.5, 0.95, -0.4], fov: 40 },
      { at: 120, position: [-0.6, 1.2, 2.5], target: [-1.15, 0.85, -0.45], fov: 40 },
      { at: POP, position: [-1.1, 1.15, 2.1], target: [-1.5, 0.95, -0.45], fov: 38 },
    ],
    f,
  );
  // he pumps faster and faster; each stroke drifts in pace and depth
  const pace = 0.22 + 0.1 * ease(f, 0, 120);
  const phase = f * pace + 0.6 * Math.sin(f * 0.05);
  const press = f < POP ? 0.5 + 0.45 * Math.sin(phase) * (0.8 + 0.2 * Math.sin(f * 0.13)) : 0.2;
  const grow = ease(f, 6, 150);
  const r = 0.07 + 0.23 * grow;
  const pop = ramp(f, POP, POP + 5);
  const push = ease(f, 58, 90);
  const balloonPos: Vec3 = [-1.95 + 0.3 * push, 0.9 + r, -0.85 + 0.15 * push];
  const handY = -560 + press * 200;
  return (
    <Hall
      camera={camera}
      f={f + 1188}
      mode="dream"
      blur={4}
      puppets={[
        seated({
          ...faceChange([[0, "excited"], [60, "determined"], [120, "smug"], [POP + 1, "shocked"], [POP + 30, "confused"]], f),
          reachL: f < POP ? [-230, handY - 40] : [-120, -760],
          handL: "fist",
          reachR: [160 + 220 * push, -470 - 60 * push],
          handR: push > 0.6 ? "open" : "fist",
          lean: 4 + 18 * push - (f > POP ? 18 * (1 - ease(f, POP, POP + 20)) : 0),
          hair: { lift: f > POP ? 70 * (1 - ease(f, POP, POP + 24)) : 0 },
          lookX: 0.6,
        }),
      ]}
    >
      <Caskets f={f} gold={{ open: 0 }} />
      <Pump position={PUMP_AT} press={press} label="VICTORY" scale={1.1} />
      <Hose points={[[PUMP_AT[0] - 0.06, 0.1, PUMP_AT[2]], [-1.95, 0.05, -0.2], [-2.0, 0.4, -0.55], [balloonPos[0] - 0.05, balloonPos[1] - r * 1.08 - 0.05, balloonPos[2]]]} />
      <Balloon position={balloonPos} r={r} pop={pop} />
      <Burst kind="confetti" at={balloonPos} frame={f - POP} count={36} size={0.7} speed={1.2} colors={["#e83a3a", "#c82020", "#ff6a6a"]} seed={13} />
      <Halo position={[GOLD[0], GOLD[1] + 0.3, GOLD[2] + 0.2]} size={0.7} color="#ffe6a0" strength={0.35 * ease(f, 100, 130) * (1 - pop)} />
    </Hall>
  );
});

// ---------- 10. 1396-1558: the woman opens plain lead, rose ----------

const W_START = 0;
const W_FRAMES = 62;
const W_FROM: [number, number] = [2.45, -1.75];
const W_TO: [number, number] = [1.25, -0.04];
const L_OPEN = 64;
const GLOW = 100;
const LeadShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [2.75, 1.35, 2.4], target: [2.2, 0.95, -1.4], fov: 40 },
      { at: 44, position: [1.95, 1.3, 2.6], target: [1.5, 0.9, -0.6], fov: 40 },
      { at: GLOW, position: [0.5, 1.5, 3.0], target: [0.95, 0.78, -0.3], fov: 40 },
      { at: 148, position: [0.48, 1.45, 2.7], target: [0.92, 0.74, -0.35], fov: 38 },
    ],
    f,
  );
  const w = stroll(f, W_START, W_FRAMES, W_FROM, W_TO);
  const open = ease(f, L_OPEN, L_OPEN + 18);
  const glow = ease(f, L_OPEN + 6, GLOW);
  const reaching = f > W_FRAMES - 4 && f < L_OPEN + 22;
  return (
    <Hall
      camera={camera}
      f={f + 1396}
      mode="jewel"
      blur={4}
      near={[HALL_CANDLES[1], HALL_CANDLES[2]]}
      puppets={[
        P("woman", WOMAN, w.at, {
          ...faceChange([[0, "neutral"], [GLOW, "happy"]], f),
          ...w.pose,
          ...(f >= W_FRAMES ? { view: "side", facing: -1 } : {}),
          reachR: reaching ? [240, -560 - 80 * open] : undefined,
          reachL: reaching ? [180, -540] : undefined,
          lookX: -0.4,
        } as Partial<PuppetPose>),
        seated({ ...faceChange([[0, "sad"], [GLOW + 4, "shocked"]], f), reachR: [80, -420], reachL: [40, -400], handR: "open", lookX: 0.8 }),
        P("emperor", EMPEROR, EMPEROR_AT, { ...faceChange([[0, "neutral"], [GLOW + 6, "happy"]], f), lookX: 0.5 }),
      ]}
    >
      <Caskets f={f} gold={{ open: 1, inside: <BonePile rise={1} /> }} silver={{ open: 1, inside: <EarthAndWorms frame={f} rise={1} /> }} lead={{ open, inside: <Treasure frame={f} glow={glow} /> }} />
      <Skull position={[-1.12, 0.47, -0.2]} rotation={[0.1, 0.9, 0.2]} scale={0.95} jaw={f > GLOW + 4 ? 0.8 : 0} />
      <Gauge position={[1.85, 0, -1.25]} value={0.12 + 0.02 * Math.sin(f * 0.1)} label={"I DESERVE\nIT"} top={1.2} size={0.34} />
      <Inscription kind="lead" position={[LEAD[0], 1.0, casketZ - 0.26]} width={0.4} appear={[f - 66, f - 72]} />
      <group position={[LEAD[0], 0, casketZ - 0.28]}>
        <InkBox size={[0.04, 0.9, 0.04]} position={[0, 0.45, -0.02]} color="#4a4e54" ink={0.006} />
      </group>
      <Burst kind="sparks" at={[LEAD[0], LEAD[1] + 0.3, LEAD[2]]} frame={f - (L_OPEN + 14)} count={16} size={0.6} colors={["#ffe6f2", "#fff2b0", "#bfefff"]} seed={15} />
    </Hall>
  );
});

// ---------- 11. 1558-1667: the shelf today ----------

const AisleShot = one((f) => {
  const camera = beatPath(
    [
      { at: 0, position: [-0.45, 1.45, 3.3], target: [-0.05, 1.1, -0.8], fov: 40 },
      { at: 35, position: [-0.1, 1.4, 2.8], target: [0.1, 1.15, -0.8], fov: 38 },
      { at: 82, position: [0.12, 1.4, 2.25], target: [0.14, 1.2, -0.8], fov: 36 },
    ],
    f,
  );
  const reach = ease(f, 20, 70);
  return (
    <Stage
      set={
        <AisleSet camera={camera} frame={f}>
          <group position={AISLE.hero} scale={1.3}>
            <HeroBox position={[0, 0, 0]} frame={f} glint={ease(f, 50, 70)} />
          </group>
          <group position={[AISLE.hero[0] + 0.12, AISLE.hero[1] - 0.04, AISLE.hero[2] + 0.25]} rotation={[0, 0, 0.12 * Math.sin(f * 0.15) * (1 - ease(f, 40, 90))]}>
            <InkBox size={[0.003, 0.05, 0.003]} position={[0, -0.025, 0]} color="#888" ink={0} />
            <Label text="$" position={[0, -0.08, 0]} width={0.1} appear={f - 35} />
          </group>
        </AisleSet>
      }
      camera={camera}
      bg="#e8f4f6"
      blur={4}
      puppets={[P("shopper", SHOPPER, [0.36, -0.22], { ...faceChange([[0, "neutral"], [30, "happy"]], f), view: "side", facing: -1, reachR: [140 + 200 * reach, -820 - 160 * reach], handR: "open" })]}
    />
  );
});

// ---------- shot list ----------

const SHOTS: Shot[] = [
  [0, 217, HookShot, false],
  [217, 379, ListsShot, "dip"],
  [379, 449, CornerShot, "dip"],
  [449, 550, InscriptionShot, "dip"],
  [550, 651, ReachShot, "dip"],
  [651, 796, BonesShot, false],
  [796, 962, SilverShot, "dip"],
  [962, 1188, TruthShot, "dip"],
  [1188, 1396, PumpShot, "dip"],
  [1396, 1558, LeadShot, "dip"],
  [1558, TIMING.totalFrames, AisleShot, "dip"],
];

// ---------- sound ----------

const SFX_RAW: Sfx[] = [
  // 1. hook: the slam, the needle
  { at: 0, src: sfx("crackle"), volume: 0.14, until: 217 },
  { at: SLAM, src: sfx("stamp"), volume: 0.38, space: "hall" },
  { at: SLAM + 1, src: sfx("clink"), volume: 0.28, space: "hall" },
  { at: 62, src: sfx("whoosh"), volume: 0.3 },
  { at: 88, src: sfx("tick"), volume: 0.5, space: "hall" },
  { at: 139, src: sfx("pop"), volume: 0.6 },
  // 2. the lists
  { at: 217, src: sfx("hooves"), volume: 0.4, until: 340 },
  { at: 217, src: sfx("crowd"), volume: 0.18, until: 379 },
  { at: 217 + HIT, src: sfx("crack"), volume: 0.4, space: "outdoor" },
  { at: 217 + HIT + 1, src: sfx("boom"), volume: 0.35, space: "outdoor" },
  { at: 217 + SPLAT, src: sfx("splash"), volume: 0.6, space: "outdoor" },
  { at: 217 + SPLAT + 2, src: sfx("slime"), volume: 0.4, space: "outdoor" },
  // 3. the corner
  { at: 379, src: sfx("crackle"), volume: 0.2, until: 449 },
  // 4. the inscription appears line by line
  { at: 449 + 37, src: sfx("pop"), volume: 0.5 },
  { at: 449 + 57, src: sfx("card"), volume: 0.32 },
  { at: 449 + 79, src: sfx("paper"), volume: 0.5 },
  // 5. the needle slams
  { at: 550 + 22, src: sfx("whoosh"), volume: 0.35 },
  { at: 550 + 46, src: sfx("stamp"), volume: 0.45, space: "hall" },
  { at: 550 + 62, src: sfx("scrape"), volume: 0.3, space: "hall" },
  // 6. the gold lid, the dust, the skull (hard cut in)
  { at: 651 + 2, src: sfx("squeak"), volume: 0.35, space: "hall" },
  { at: 651 + LIFT, src: sfx("creak"), volume: 0.4, space: "hall" },
  { at: 651 + PUFF, src: sfx("hiss"), volume: 0.55, space: "hall" },
  { at: 651 + PUFF + 1, src: sfx("boom"), volume: 0.3, space: "hall" },
  { at: 651 + BONES, src: sfx("clink"), volume: 0.45, space: "hall" },
  ...foleyCues("thud", [651 + HOP, 651 + HOP + 14], 0.35, { space: "hall" }),
  { at: 651 + LAP, src: sfx("plop"), volume: 0.7, space: "hall" },
  // 7. silver: earth and worms
  { at: 796 + S_OPEN, src: sfx("creak"), volume: 0.22, space: "hall" },
  { at: 796 + EARTH - 10, src: sfx("slime"), volume: 0.6, space: "hall" },
  { at: 796 + WORM_ON, src: sfx("squeak"), volume: 0.2, space: "hall" },
  { at: 796 + SHAKE_OFF + 4, src: sfx("whoosh"), volume: 0.3 },
  // 8. the pivot: the study, the gauges, the lever
  { at: 962 - 46, src: sfx("riser"), volume: 0.22 },
  { at: 967, src: sfx("sting"), volume: 0.25 },
  { at: 962 + 30, src: sfx("pop"), volume: 0.5 },
  { at: 962 + 140, src: sfx("tick"), volume: 0.35, until: 962 + 184 },
  { at: 962 + 188, src: sfx("whoosh"), volume: 0.3 },
  { at: 962 + 205, src: sfx("clang"), volume: 0.55, space: "hall" },
  { at: 962 + 209, src: sfx("clink"), volume: 0.45, space: "hall" },
  // 9. the pump, the balloon, the pop
  { at: 1188, src: sfx("compressor"), volume: 0.2, until: 1188 + POP },
  { at: 1188 + 60, src: sfx("squeak"), volume: 0.35, space: "hall" },
  { at: 1188 + POP, src: sfx("boom"), volume: 0.55, space: "hall", hit: 0.5 },
  { at: 1188 + POP + 1, src: sfx("pop"), volume: 1.0, space: "hall" },
  // 10. the lead casket
  ...foleyCues("thud", stepFrames(1396 + W_START, W_FRAMES, W_FROM, W_TO), 0.28, { space: "hall" }),
  { at: 1396 + L_OPEN, src: sfx("creak"), volume: 0.16, space: "hall" },
  { at: 1396 + 90, src: sfx("chime"), volume: 0.25, space: "hall" },
  // 11. the shelf
  { at: 1558, src: sfx("ambience"), volume: 0.12, until: TIMING.totalFrames },
  { at: 1558 + 35, src: sfx("pop"), volume: 0.45 },
];

// Effects sit under the voice: loops low, one-shots at 65 %.
const SFX: Sfx[] = SFX_RAW.map((c) => ({ ...c, volume: c.volume * (c.until ? 0.4 : 0.65) }));

const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 379, volume: 0.27 },
  { src: "music/lounge.wav", from: 379, to: 651, volume: 0.25 },
  { src: "music/mystery.wav", from: 651, to: 962, volume: 0.27 },
  { src: "music/tension.wav", from: 962, to: 1396, volume: 0.26 },
  { src: "music/upbeat.wav", from: 1396, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
