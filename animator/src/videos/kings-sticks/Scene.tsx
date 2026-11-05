import React from "react";
import {
  Burst,
  CameraShot,
  Desk,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  jump,
  Label,
  Lamp,
  lerp3,
  lieDown,
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
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Crate } from "../../three/GhostArmySets";
import { BENCH, Candlestick, CANDLE_TOP, CANDLES, Necklace, STAND, throneBg, throneLight, ThroneMode, ThroneRoomSet } from "../../three/ThroneRoomSet";
import { Bundle, FallingCurl, HeldStick, Hourglass, Knife, LogPile, RulerBoard, Shavings, SHORT, Stick, STICK, StickRack, StumpAxe } from "./props";
import TIMING_JSON from "./timing.json";

// "The King's Sticks": a palace whodunit. The Queen's necklace vanishes from a locked throne room; the King hands
// twelve guards identical sticks and says the thief's will grow an inch overnight. Only the thief believes it, so only
// he shaves his stick, and the one short stick names him. Set: guide/references/throne-room.md (src/three/ThroneRoomSet).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "kings-sticks";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const UNITS = 1060 / 1.3; // puppet units per metre (for `air`)
const BENCH_AIR = (BENCH.h - 0.34) * UNITS;
const THRONE_AIR = (0.54 - 0.34) * UNITS + 0.24 * UNITS; // the seat stands on the dais
const ASPECT = 9 / 16;

// ---------- cast ----------

const SHAKO = "#1a1a22";
const TUNIC = "#b8242a";
const SHIRT = "#f2e6c8";
const KING: PuppetLook = { skin: "#eec4a0", hair: "#d8d4cc", outfit: "#e0b040", vest: "#5a2a7a", hat: "#f2c230", hatStyle: "crown", beard: "#d8d4cc" };
const QUEEN: PuppetLook = { skin: "#f6d2b0", hair: "#3a1f14", outfit: "#2a8a6a", long: true, skirt: true, hat: "#f2c230", hatStyle: "crown" };
const THIEF: PuppetLook = { skin: "#f0c8a0", hair: "#1d1410", outfit: SHIRT, vest: TUNIC, hat: SHAKO, hatStyle: "shako", beard: "#1d1410" };
const guard = (skin: string, hair: string): PuppetLook => ({ skin, hair, outfit: SHIRT, vest: TUNIC, hat: SHAKO, hatStyle: "shako" });
const MEASURER = guard("#d8a47a", "#2a1e16");
const COMPARER = guard("#f4d0b0", "#8a5a2a");
const SLEEPER = guard("#8a5a3c", "#1e1612");
const EXTRAS = [guard("#eab890", "#c88a4a"), guard("#c8946a", "#2a1e16"), guard("#f2c9a4", "#5a3a24"), guard("#9a6a48", "#1a1410"), guard("#f6d8bc", "#3a2a1e"), guard("#e0a878", "#6a4a2a"), guard("#b07a52", "#2a1e16")];
const WOODCUTTER: PuppetLook = { skin: "#e8b890", hair: "#6a4a2a", outfit: "#a8784a", vest: "#4a3a2a", beard: "#6a4a2a", hat: "#5a4a3a" };

const pose = (p: Partial<PuppetPose>) => ({ expression: "neutral", ...p }) as PuppetPose;
const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: pose(p) });

// ---------- shot helpers ----------

const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());

// Two candles nearest the camera's target light the puppets.
const nearCandles = (cam: CameraShot) =>
  [...CANDLES].sort((a, b) => Math.hypot(a[0] - cam.target[0], a[2] - cam.target[2]) - Math.hypot(b[0] - cam.target[0], b[2] - cam.target[2])).slice(0, 2);

type ThroneProps = {
  camera: CameraShot;
  f: number;
  mode: ThroneMode;
  puppets?: PuppetPlacement[];
  light?: PuppetLight;
  blur?: number;
  truth?: number;
  energy?: number;
  foreground?: React.ReactNode;
  bolt?: number;
  necklace?: boolean;
  candles?: number[];
  rays?: boolean;
  children?: React.ReactNode;
};
const Throne: React.FC<ThroneProps> = ({ camera, f, mode, puppets, light, blur, truth, energy, foreground, bolt, necklace, candles, rays, children }) => (
  <Stage
    set={
      <ThroneRoomSet camera={camera} frame={f} mode={mode} bolt={bolt} necklace={necklace} candles={candles} rays={rays}>
        {children}
      </ThroneRoomSet>
    }
    camera={camera}
    bg={throneBg(mode)}
    puppets={puppets}
    light={light ?? throneLight(mode, f, nearCandles(camera))}
    blur={blur}
    truth={truth}
    energy={energy}
    foreground={foreground}
  />
);

const cam = (from: Vec3, to: Vec3, target: Vec3, fov: number, p: number): CameraShot => ({ position: lerp3(from, to, p), target, fov });
const held = (at: [number, number], reach: [number, number], camera: CameraShot, opts: { tilt?: number; length?: number; grip?: number; shaved?: boolean; lift?: number } = {}) => {
  const h = handWorld(at, reach, camera);
  return <HeldStick hand={[h[0], h[1] + (opts.lift ?? 0), h[2]]} cam={camera.position} tilt={opts.tilt} length={opts.length} grip={opts.grip} shaved={opts.shaved} />;
};

// A purple velvet drape behind the jewel stand (the Queen's corner).
const Drape: React.FC = () => (
  <group position={[STAND[0], 0, -2.82]}>
    {Array.from({ length: 7 }, (_, i) => (
      <InkBox key={i} size={[0.24, 3.2, 0.06]} position={[-0.72 + i * 0.24, 1.6, (i % 2) * 0.05]} color={i % 2 ? "#4a1f6a" : "#5e2a82"} ink={0.006} />
    ))}
    <InkBox size={[1.9, 0.12, 0.14]} position={[0, 3.2, 0.06]} color="#e0b040" ink={0.008} />
  </group>
);

// ---------- 0-3 s: the hook ----------

// The empty velvet cushion rushes at the lens. `offset` shifts the clock: the last shot is this one just before frame 0.
const LOOP = 24;
const hookAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 22);
  const camera = cam([1.45, 1.42, 0.35], [1.7, 1.26, -0.62], [1.95, 1.0, -1.9], 42, p);
  return (
    <Throne camera={camera} f={f + 40} mode="candle" energy={0} blur={4}>
      <Drape />
    </Throne>
  );
};
const HookCushion = hookAt(0);
const LoopIn = hookAt(-LOOP);

// The Queen sees it: hands to her cheeks.
const QueenGasp = (f: number) => {
  const camera = cam([1.15, 1.08, 0.75], [1.22, 1.04, 0.45], [1.45, 0.94, -1.2], 36, ease(f, 0, 29));
  const up = ease(f, 2, 8);
  return (
    <Throne
      camera={camera}
      f={f + 66}
      mode="candle"
      blur={6}
      puppets={[P("queen", QUEEN, [1.45, -1.15], { ...faceChange([[0, "worried"], [4, "shocked"]], f), reachL: [-150 - 60 * (1 - up), -760 + 260 * (1 - up)], reachR: [150 + 60 * (1 - up), -760 + 260 * (1 - up)], frontL: true, frontR: true, handL: "open", handR: "open", lean: -4 * up, view: "front" })]}
    >
      <Drape />
    </Throne>
  );
};

// Low angle on the palace door: the iron bolt slams home.
const BOLT = 12;
const DoorSlam = (f: number) => {
  const camera = cam([-2.55, 0.62, -0.55], [-2.7, 0.66, -0.85], [-3.4, 1.3, -2.95], 46, ease(f, 0, 31));
  const bolt = ease(f, 0, BOLT) ** 1.6;
  return (
    <Throne camera={camera} f={f + 95} mode="candle" bolt={bolt}>
      <Candlestick position={[-2.35, 0, -2.55]} frame={f + 95} seed={5} />
      <pointLight position={[-2.9, 1.7, -2.1]} intensity={5} distance={4} color="#ffa850" />
    </Throne>
  );
};

// ---------- 3-6 s: twelve suspects ----------

const RING = Array.from({ length: 12 }, (_, i) => {
  const a = (i / 12) * Math.PI * 2 + 0.3;
  return [Math.sin(a) * 1.55, 0.5 + Math.cos(a) * 1.35] as [number, number];
});
const ringLook = (i: number) => (i === 0 ? THIEF : i === 4 ? MEASURER : i === 8 ? COMPARER : i === 6 ? SLEEPER : EXTRAS[i % EXTRAS.length]);

// Top-down over the twelve guards standing in a ring on the carpet; the camera turns slowly.
const TopRing = (f: number) => {
  const a = 0.4 + f * 0.008;
  const camera: CameraShot = { position: [Math.sin(a) * 0.9, 7.2 - f * 0.03, 0.5 + Math.cos(a) * 0.9 + 0.4], target: [0, 0, 0.5], fov: 44 };
  return (
    <Throne
      camera={camera}
      f={f + 120}
      mode="candle"
      puppets={RING.map((at, i) => P(i === 0 ? "thief" : `g${i}`, ringLook(i), at, { expression: i === 0 ? "smug" : i % 3 ? "worried" : "skeptical", lookX: Math.sin(f * 0.05 + i) * 0.8 }))}
    />
  );
};

// Down the line of guards from its right end, so every head stays whole; it eases in on the grinning one (the seed).
const LINE_X = [-2.3, -1.75, -1.2, -0.65, -0.1, 0.45, 1.0, 1.55, 2.1];
const LineTruck = (f: number) => {
  const p = ease(f, 0, 63);
  const camera: CameraShot = { position: [4.3 - p * 0.1, 1.25, 1.5 - p * 0.15], target: [-0.5 + p * 0.3, 0.92, -0.15], fov: 50 };
  const looks = [EXTRAS[0], EXTRAS[1], MEASURER, EXTRAS[2], COMPARER, EXTRAS[3], SLEEPER, EXTRAS[4], THIEF];
  return (
    <>
      <Throne
        camera={camera}
        f={f + 150}
        mode="candle"
        puppets={LINE_X.map((lx, i) =>
          looks[i] === THIEF
            ? P("thief", THIEF, [lx, 0.25], { ...faceChange([[0, "neutral"], [34, "smug"]], f), lookX: -0.4, headTilt: 6 })
            : P(`l${i}`, looks[i], [lx, 0.2 + (i % 2) * 0.08], { expression: i % 3 === 0 ? "worried" : i % 3 === 1 ? "skeptical" : "awkward", lookX: Math.sin(f * 0.06 + i * 1.7) * 0.9, headTilt: (i % 2 ? -1 : 1) * 4 }),
        )}
      />
      <Headline f={f} text="12 GUARDS. 1 THIEF." at={24} />
    </>
  );
};

// ---------- 6-10 s: the King and the sticks ----------

// Low angle: the King strides down the carpet with a bundle of sticks.
const KingWalk = (f: number) => {
  const camera = cam([0.4, 0.42, 2.4], [0.3, 0.46, 2.1], [0, 1.15, -0.6], 46, ease(f, 0, 37));
  const w = stroll(f, -6, 40, [-0.1, -1.4], [-0.1, 0.35]);
  const hand = handWorld(w.at, [210, -560], camera);
  return (
    <Throne camera={camera} f={f + 191} mode="candle" puppets={[P("king", KING, w.at, { expression: "determined", reachR: [210, -560], frontR: true, handR: "fist", ...w.pose, view: "front" })]}>
      <group userData={{ ghost: true }}>
        <Bundle position={[hand[0], hand[1] - 0.22, hand[2] + 0.06]} count={9} />
      </group>
    </Throne>
  );
};

// Two-shot past a candlestick: the King hands a guard his stick.
const GIVE = 26;
const HandOut = (f: number) => {
  const camera0 = cam([0.15, 1.2, 3.4], [0.15, 1.2, 3.4], [0.05, 0.95, 0.5], 36, 0);
  const camera = cam([0.15, 1.2, 3.4], [0.05, 1.17, 3.05], [0.05, 0.95, 0.5], 36, ease(f, 0, 62));
  const king: [number, number] = [-0.38, 0.55];
  const g: [number, number] = [0.45, 0.6];
  const k = ease(f, 6, GIVE);
  const kingReach: [number, number] = [150 + 140 * k, -520 - 60 * k];
  const gReach: [number, number] = [-120 - 150 * ease(f, 14, GIVE), -470 - 110 * ease(f, 14, GIVE)];
  const stand = frameSpot(camera0, ASPECT, -0.88, -0.55, 1.25);
  return (
    <Throne
      camera={camera}
      f={f + 228}
      mode="candle"
      puppets={[
        P("king", KING, king, { expression: "smug", reachR: kingReach, frontR: true, handR: "fist", lookX: 0.6 }),
        P("comparer", COMPARER, g, { ...faceChange([[0, "worried"], [GIVE + 4, "awkward"]], f), reachL: gReach, frontL: true, handL: f > GIVE ? "fist" : "open", lookX: -0.6 }),
        P("e1", EXTRAS[1], [-1.25, -0.7], { expression: "worried", reachR: [120, -560], frontR: true, handR: "fist" }),
        P("e2", EXTRAS[2], [1.3, -0.8], { expression: "skeptical", reachL: [-120, -560], frontL: true, handL: "fist" }),
      ]}
      foreground={<Candlestick position={[stand[0], stand[1] - CANDLE_TOP + 0.25, stand[2]]} frame={f + 228} seed={7} />}
    >
      {f < GIVE ? held(king, kingReach, camera) : held(g, gReach, camera)}
      {held([-1.25, -0.7], [120, -560], camera)}
      {held([1.3, -0.8], [-120, -560], camera)}
    </Throne>
  );
};

// Close on the King, a stick raised by his face: "These are my wizard's sticks."
const KingClose = (f: number) => {
  const camera = cam([0.32, 1.12, 2.35], [0.22, 1.07, 2.0], [-0.02, 0.98, 0.4], 36, ease(f, 0, 78));
  const reach: [number, number] = [230, -780 - 40 * ease(f, 4, 20)];
  return (
    <Throne camera={camera} f={f + 290} mode="candle" blur={7} puppets={[P("king", KING, [0, 0.4], { expression: "smug", reachR: reach, frontR: true, handR: "fist", lookX: 0.3, headTilt: -4 })]}>
      {held([0, 0.4], reach, camera, { tilt: -0.08 })}
    </Throne>
  );
};

// Over the King's shoulder: three guards stare at their sticks. THE THIEF'S STICK GROWS.
const OverKing = (f: number) => {
  const camera = cam([1.2, 1.48, 3.5], [1.08, 1.42, 3.2], [-0.1, 0.98, -0.3], 34, ease(f, 0, 89));
  const gs: [PuppetLook, [number, number], number][] = [
    [MEASURER, [-0.75, -0.25], 0],
    [THIEF, [-0.05, -0.45], 1],
    [EXTRAS[3], [0.6, -0.3], 2],
  ];
  return (
    <>
      <Throne
        camera={camera}
        f={f + 368}
        mode="candle"
        puppets={[
          P("king", KING, [0.62, 1.75], { expression: "smug", view: "back" }),
          ...gs.map(([look, at, i]) =>
            P(look === THIEF ? "thief" : `o${i}`, look, at, look === THIEF ? { expression: "smug", reachR: [140, -560], frontR: true, handR: "fist", lookX: 0.6 } : { ...faceChange([[0, "worried"], [30 + i * 9, "shocked"]], f), reachR: [140, -560], frontR: true, handR: "fist", lookX: 0.4, headTilt: 8 }),
          ),
        ]}
      >
        {gs.map(([, at], i) => (
          <React.Fragment key={i}>{held(at, [140, -560], camera)}</React.Fragment>
        ))}
      </Throne>
      <Headline f={f} text="THE THIEF'S STICK GROWS" at={18} />
    </>
  );
};

// ---------- 15-19 s: the grin, the joke, "Tomorrow." ----------

const ThiefGrin = (f: number) => {
  const camera = cam([0.58, 1.1, 2.4], [0.46, 1.05, 1.95], [0.28, 0.96, 0.3], 34, ease(f, 0, 42));
  const reach: [number, number] = [210, -860];
  return (
    <Throne
      camera={camera}
      f={f + 457}
      mode="candle"
      blur={7}
      puppets={[P("thief", THIEF, [0.3, 0.3], { ...faceChange([[0, "smug"], [24, "happy"]], f), reachR: reach, frontR: true, handR: "fist", headTilt: 8 + Math.sin(f * 0.4) * 3 }), P("e4", EXTRAS[4], [-0.55, -0.7], { expression: "worried", lookX: 1 })]}
    >
      {held([0.3, 0.3], reach, camera, { tilt: -0.9, grip: 0.15 })}
    </Throne>
  );
};

// The grinning guard steps up laughing and thrusts his stick at the King; the guards behind gasp.
const ThiefMock = (f: number) => {
  const camera = cam([0.2, 1.25, 3.9], [0.15, 1.2, 3.45], [0.1, 1.0, 0.4], 40, ease(f, 0, 55));
  const w = stroll(f, 0, 14, [0.35, 0.2], [0.1, 0.85]);
  const up = ease(f, 14, 22);
  const reach: [number, number] = [150 + 90 * up, -560 - 440 * up];
  return (
    <Throne
      camera={camera}
      f={f + 499}
      mode="candle"
      puppets={[
        P("thief", THIEF, w.at, { expression: "excited", reachR: reach, handR: "fist", lean: 6 * up, ...w.pose, ...(f >= 14 ? { view: "front" } : {}) }),
        P("m1", MEASURER, [-0.75, -0.6], { ...faceChange([[0, "worried"], [18, "shocked"]], f), lookX: 0.8 }),
        P("m2", EXTRAS[5], [0.95, -0.7], { ...faceChange([[0, "skeptical"], [20, "shocked"]], f), lookX: -0.8 }),
      ]}
    >
      {held(w.at, reach, camera, { tilt: up * 0.15 })}
    </Throne>
  );
};

const KingTomorrow = (f: number) => {
  const camera = cam([-0.06, 1.05, 1.75], [-0.04, 1.03, 1.58], [0, 0.97, 0.3], 32, ease(f, 0, 26));
  return (
    <Throne
      camera={camera}
      f={f + 554}
      mode="candle"
      blur={7}
      puppets={[P("king", KING, [0, 0.3], { ...faceChange([[0, "neutral"], [5, "smug"]], f), headTilt: -6, lookX: 0.5 })]}
    />
  );
};

// ---------- 19-33 s: the night ----------

// Night (dissolve): guards on the bench stare at their sticks; seen down the bench from its far end, every head
// whole, the camera eases in towards the grinning one nearest us.
const BENCH_ZS = [-1.0, -0.25, 0.5, 1.25, 2.0];
const NightStare = (f: number) => {
  const p = ease(f, -12, 84);
  const camera: CameraShot = { position: [1.6 + p * 0.1, 1.15, 3.0 - p * 0.3], target: [3.75, 0.75, -0.3 + p * 0.6], fov: 46 };
  const looks = [MEASURER, EXTRAS[0], COMPARER, SLEEPER, THIEF];
  const x = BENCH.x - 0.24;
  return (
    <Throne
      camera={camera}
      f={f + 580}
      mode="night"
      puppets={BENCH_ZS.map((bz, i) =>
        P(looks[i] === THIEF ? "thief" : `b${i}`, looks[i], [x, bz], {
          sit: true,
          air: BENCH_AIR,
          expression: looks[i] === THIEF ? "smug" : i === 3 ? "bored" : "worried",
          reachR: [70, -590],
          frontR: true,
          handR: "fist",
          lookX: 0.3,
          headTilt: 10 + Math.sin(f * 0.05 + i) * 4,
          blink: looks[i] !== THIEF && (f + i * 13) % 70 < 3,
        }),
      )}
    >
      {BENCH_ZS.map((bz, i) => {
        const h = handWorld([x, bz], [70, -590], camera);
        return <HeldStick key={i} hand={[h[0], h[1] + BENCH_AIR * (1.3 / 1060), h[2]]} cam={camera.position} />;
      })}
    </Throne>
  );
};

// Top-down at midnight: one guard crawls along the tiles, flipping his stick end over end to measure it.
const MeasureTop = (f: number) => {
  const c = crawlish(f, 0, 43, [-1.25, 1.42], [-0.05, 1.42]);
  // Ride along with the crawler so his head never leaves the frame.
  const cx = c.at[0] + 0.85;
  const camera: CameraShot = { position: [cx, 3.5, 1.75], target: [cx, 0, 1.25], fov: 44 };
  const hop = Math.min(3, Math.floor(f / 13));
  const flip = ease(f - hop * 13, 0, 6);
  const sx = -0.75 + hop * 0.3 + 0.15 * flip;
  return (
    <Throne camera={camera} f={f + 664} mode="night" puppets={[P("measurer", MEASURER, c.at, { expression: "thinking", ...c.pose })]}>
      <group userData={{ ghost: true }}>
        <Stick position={[sx, 0.03 + Math.sin(flip * Math.PI) * 0.18, 1.25]} rotation={[0, 0, Math.PI / 2 + flip * Math.PI]} />
      </group>
    </Throne>
  );
};
const crawlish = (f: number, start: number, frames: number, from: [number, number], to: [number, number]) => {
  const p = ramp(f, start, start + frames);
  const at: [number, number] = [from[0] + (to[0] - from[0]) * p, from[1] + (to[1] - from[1]) * p];
  return { at, pose: { view: "side", facing: 1, crawl: f - start, bob: Math.sin(f / 3) * 7, headTilt: Math.sin(f / 6 - 0.9) * 5 } as Partial<PuppetPose> };
};

// Gag: still crawling and measuring, he bonks his head on a candlestick; it wobbles, stars pop.
const BONK = 15;
const BONK_AT: Vec3 = [2.55, 0, 1.3];
const Bonk = (f: number) => {
  // Tips down after the hit so his dazed face rides above the captions.
  const camera = cam([2.05, 0.8, 4.4], [2.1, 0.8, 4.15], [2.35, 0.6 - 0.35 * ease(f, BONK, BONK + 10), 1.3], 46, ease(f, 0, 46));
  const c = crawlish(f, -10, BONK + 10, [1.5, 1.3], [2.15, 1.3]);
  const t = f - BONK;
  const wob = t > 0 ? Math.exp(-t / 10) * Math.sin(t * 0.7) * 0.22 : 0;
  const after = t > 0;
  return (
    <Throne
      camera={camera}
      f={f + 707}
      mode="night"
      puppets={[
        P("measurer", MEASURER, after ? [2.15 - 0.2 * ease(t, 0, 6), 1.3] : c.at, after ? { ...faceChange([[0, "shocked"], [14, "sad"]], t), view: "side", facing: 1, crouch: 0.7, reachL: [-30, -1000], handL: "open", bob: t < 6 ? -10 : 0 } : { expression: "thinking", ...c.pose }),
      ]}
      light={throneLight("night", f, [BONK_AT])}
    >
      <group position={BONK_AT} rotation={[0, 0, wob]}>
        <Candlestick position={[0, 0, 0]} frame={f + 707} seed={9} />
      </group>
      <Stick position={[2.0, 0.03, 1.42]} rotation={[0, 0.2, Math.PI / 2]} />
      <Burst kind="stars" at={[2.42, 0.62, 1.35]} frame={t} seed={2} />
    </Throne>
  );
};

// Another guard holds his stick up to a snoring friend's, squinting at the tops.
const SLEEP_AT: [number, number] = [-1.47, 1.0];
const COMP_AT: [number, number] = [-1.1, 1.08];
// The two-shot spreads them a little wider than the topple that follows, so neither head hides behind the other.
const SLEEP_WIDE: [number, number] = [-1.66, 1.0];
const Compare = (f: number) => {
  const camera = cam([-1.38, 1.12, 3.95], [-1.38, 1.1, 3.7], [-1.38, 0.95, 1.0], 44, ease(f, 0, 33));
  const nudge = Math.sin(f * 0.25) * 12;
  return (
    <Throne
      camera={camera}
      f={f + 753}
      mode="night"
      puppets={[
        P("sleeper", SLEEPER, SLEEP_WIDE, { expression: "neutral", sleep: true, reachR: [170, -640], frontR: true, handR: "fist", headTilt: -12, bob: Math.sin(f * 0.12) * 6 }),
        P("comparer", COMPARER, COMP_AT, { expression: "thinking", reachL: [-175, -640 + nudge], frontL: true, handL: "fist", lookX: -0.7, headTilt: -8, lean: -5 }),
      ]}
    >
      {held(SLEEP_WIDE, [170, -640], camera)}
      {held(COMP_AT, [-175, -640 + nudge], camera)}
    </Throne>
  );
};

// Gag: a huge snore and the sleeper keels over backwards, stiff as a plank; his stick bonks the other guard's hat.
const TIP = 6;
const Topple = (f: number) => {
  const camera = cam([-0.95, 0.62, 3.0], [-1.05, 0.66, 2.8], [-1.3, 0.75, 1.0], 44, ease(f, 0, 31));
  const t = f - TIP;
  const fly = ease(t, 0, 12);
  const stickAt: Vec3 = lerp3([-1.36, 0.95, 1.1], [-1.02, 1.45, 1.1], fly);
  return (
    <Throne
      camera={camera}
      f={f + 786}
      mode="night"
      puppets={[
        P("sleeper", SLEEPER, SLEEP_AT, { expression: "neutral", ...lieDown(f, TIP, 14, true) }),
        P("comparer", COMPARER, COMP_AT, t < 12 ? { expression: "thinking", reachL: [-175, -640], frontL: true, handL: "fist", lookX: -0.7 } : { ...faceChange([[0, "shocked"], [10, "angry"]], t - 12), reachL: [-60, -1000], handL: "open", ...jump(t, 12, 120, 22) }),
      ]}
    >
      {t < 12 && held(COMP_AT, [-175, -640], camera)}
      <group userData={{ ghost: true }}>
        <Stick position={t < 12 ? stickAt : [-0.85, 0.03, 1.25]} rotation={[0, 0, t < 0 ? 0 : t < 12 ? fly * 4 : Math.PI / 2]} />
      </group>
      <Burst kind="stars" at={[-1.0, 1.45, 1.1]} frame={t - 12} seed={5} />
    </Throne>
  );
};

// Corner, nearly dark: the grinning guard checks left and right. One candle burns low beside him.
const CORNER: [number, number] = [-3.85, -1.55];
const CORNER_CANDLE: Vec3 = [-3.2, 0, -1.05];
const CornerGlow: React.FC<{ f: number; lit?: number; at?: Vec3 }> = ({ f, lit = 0.6, at = CORNER_CANDLE }) => (
  <>
    <Candlestick position={at} frame={f} lit={lit} seed={11} height={0.9} />
    <pointLight position={[at[0], 1.0, at[2] + 0.2]} intensity={5 * lit} distance={3} color="#ffb070" />
  </>
);
const cornerLight = (f: number) => throneLight("corner", f, [[CORNER_CANDLE[0], 0.9 - CANDLE_TOP, CORNER_CANDLE[2]]]);
const ThiefLook = (f: number) => {
  const camera = cam([-3.05, 0.55, 0.45], [-3.15, 0.6, 0.2], [-3.85, 1.0, -1.6], 42, ease(f, 0, 33));
  const look = f < 10 ? -1 : f < 20 ? 1 : 0;
  return (
    <Throne
      camera={camera}
      f={f + 817}
      mode="corner"
      puppets={[P("thief", THIEF, CORNER, { ...faceChange([[0, "worried"], [22, "smug"]], f), lookX: look, reachR: [110, -560], frontR: true, handR: "fist" })]}
      light={cornerLight(f)}
    >
      {held(CORNER, [110, -560], camera)}
      <CornerGlow f={f + 817} />
    </Throne>
  );
};

// He slides the stick down inside his jacket and pats it.
const Hide = (f: number) => {
  const camera = cam([-3.55, 1.05, -0.2], [-3.62, 1.02, -0.45], [-3.85, 0.94, -1.6], 34, ease(f, 0, 36));
  const down = ease(f, 6, 18);
  const pat = f > 20 ? Math.abs(Math.sin((f - 20) * 0.5)) * 20 : 0;
  const reach: [number, number] = [60, -560 + down * 120 - pat];
  return (
    <Throne
      camera={camera}
      f={f + 850}
      mode="corner"
      blur={6}
      puppets={[P("thief", THIEF, CORNER, { ...faceChange([[0, "awkward"], [20, "smug"]], f), reachR: reach, frontR: true, handR: f > 20 ? "open" : "fist", lookX: f < 18 ? 0.6 : 0 })]}
      light={cornerLight(f)}
    >
      {f < 16 && held(CORNER, reach, camera, { lift: -down * 0.2 })}
      <CornerGlow f={f + 850} />
    </Throne>
  );
};

// Macro in the dark corner by the last candle: a knife shaves the end of a stick; curls fall into a little pile.
const STROKES = [4, 22, 44];
const Scrape = (f: number) => {
  const tip: Vec3 = [-3.62, 1.0, -1.18];
  const camera = cam([-3.15, 1.22, -0.35], [-3.22, 1.18, -0.5], [tip[0] - 0.04, tip[1] - 0.1, tip[2]], 40, ease(f, 0, 65));
  const stroke = (s: number) => ease(f, s, s + 9 + (s % 5));
  const k = STROKES.reduce((acc, s) => (f >= s && f < s + 14 ? stroke(s) : acc), 0);
  return (
    <Throne camera={camera} f={f + 886} mode="corner" candles={[0, 0, 0, 0]} light={cornerLight(f)}>
      <pointLight position={[-3.3, 1.4, -0.75]} intensity={3.5} distance={2.2} color="#ffc890" />
      <group userData={{ ghost: true }}>
        <Stick position={[tip[0] - 0.1, tip[1] - 0.28, tip[2] - 0.04]} rotation={[0.15, 0, -0.35]} />
        <Knife position={[tip[0] + 0.04 - k * 0.12, tip[1] + 0.02 - k * 0.07, tip[2] + 0.05]} rotation={[0.2, 0.2, -2.6]} scale={1.5} />
        {STROKES.map((s, i) => (
          <FallingCurl key={s} at={[tip[0] - 0.06, tip[1] - 0.06, tip[2] + 0.02]} t={f - s - 8} seed={i * 2.1} />
        ))}
        <Shavings position={[-3.75, 0, -1.1]} n={4 + Math.floor(ease(f, 0, 60) * 10)} seed={3} />
      </group>
    </Throne>
  );
};

// Wide and dark: everyone asleep; the last candle sputters out. Silence.
const SLEEPERS: [PuppetLook, [number, number]][] = [
  [MEASURER, [0.2, 1.35]],
  [COMPARER, [1.35, 1.6]],
  [SLEEPER, [0.55, 0.5]],
  [EXTRAS[0], [1.5, 0.3]],
  [EXTRAS[3], [-0.2, 0.1]],
];
const Silence = (f: number) => {
  const camera = cam([-0.3, 2.9, 6.7], [-0.32, 2.7, 6.3], [-0.35, 0.3, 0.6], 48, ease(f, 0, 40));
  const last = 0.6 * (1 - ease(f, 14, 24)) * (f > 8 && f < 12 ? 0.5 : 1);
  return (
    <Throne
      camera={camera}
      f={f + 951}
      mode="night"
      candles={[0, 0, 0, last]}
      puppets={SLEEPERS.map(([look, at], i) => P(`s${i}`, look, at, { expression: "neutral", ...lieDown(f, -60, 22, true) }))}
      light={throneLight("night", f, [])}
    >
      {SLEEPERS.map(([, at], i) => (
        <Stick key={i} position={[at[0] + 0.35, 0.025, at[1] + 0.12]} rotation={[0, 0.3 * i, Math.PI / 2]} />
      ))}
    </Throne>
  );
};

// ---------- 33-39 s: the morning line-up ----------

// The row of sticks on the floor, lying across the frame on the stone tiles right of the carpet: left ends flush at
// x = 0.95, right ends 5 cm past the tile line x = 1.5; the shaved one stops short of it.
const ROW_Z = Array.from({ length: 12 }, (_, i) => -0.3 + i * 0.14);
const ROW_X0 = 0.95;
const SHORT_I = 9;
const Row: React.FC<{ shown?: number }> = ({ shown = 12 }) => (
  <group userData={{ ghost: true }}>
    {ROW_Z.slice(0, shown).map((z, i) => {
      const len = i === SHORT_I ? SHORT : STICK;
      return <Stick key={i} position={[ROW_X0 + len / 2, 0.024, z]} rotation={[0, 0, -Math.PI / 2]} length={len} shaved={i === SHORT_I} />;
    })}
  </group>
);

// Dawn (dissolve): golden shafts; guards kneel and lay the sticks down side by side; the King and Queen walk in.
const DawnRow = (f: number) => {
  const camera = cam([0.05, 1.45, 3.6], [0.2, 1.38, 3.2], [1.0, 0.5, 0.3], 44, ease(f, -12, 77));
  const kw = stroll(f, 18, 50, [-0.3, -1.45], [-0.3, -0.55]);
  const qw = stroll(f, 24, 46, [0.3, -1.45], [0.3, -0.75]);
  const kneel: [PuppetLook, [number, number]][] = [
    [MEASURER, [2.0, -0.2]],
    [EXTRAS[1], [2.05, 0.5]],
    [THIEF, [0.55, 0.9]],
    [COMPARER, [2.1, 1.2]],
  ];
  return (
    <Throne
      camera={camera}
      f={f + 991}
      mode="dawn"
      puppets={[
        P("king", KING, kw.at, { expression: "smug", ...kw.pose }),
        P("queen", QUEEN, qw.at, { expression: "worried", ...qw.pose }),
        ...kneel.map(([look, at], i) => P(look === THIEF ? "thief" : `k${i}`, look, at, { expression: look === THIEF ? "smug" : "worried", crouch: 0.55, bend: 0.25, reachR: [90, -360], handR: "open", lookX: 0.2 })),
      ]}
    >
      <Row shown={Math.min(12, 6 + Math.floor(f / 7))} />
    </Throne>
  );
};

// Top-down along the row: eleven alike ... and one that stops short of the tile line.
const TopSticks = (f: number) => {
  const z = -0.05 + ease(f, 0, 56) * 0.95;
  const camera: CameraShot = { position: [1.27, 2.3, z + 0.22], target: [1.25, 0, z], fov: 40 };
  return (
    <Throne camera={camera} f={f + 1068} mode="dawn">
      <Row />
    </Throne>
  );
};

// Straight down onto the right ends and the tile line they all cross: all but one.
const ShortStick = (f: number) => {
  const camera = cam([1.5, 1.25, 0.86], [1.49, 0.9, 1.0], [1.5, 0, 0.78], 40, ease(f, 0, 39));
  camera.target = lerp3([1.5, 0, 0.78], [1.48, 0, 0.94], ease(f, 8, 39));
  return (
    <Throne camera={camera} f={f + 1127} mode="dawn" blur={3}>
      <Row />
    </Throne>
  );
};

// ---------- 39-44 s: the blurt ----------

const THIEF_AT: [number, number] = [0.95, 0.55];
const ThiefBlurt = (f: number) => {
  const camera = cam([0.92, 1.15, 2.7], [0.95, 1.12, 2.45], [0.97, 0.98, 0.5], 36, ease(f, 0, 38));
  const reach: [number, number] = [220 + Math.sin(f * 0.6) * 25, -900];
  return (
    <Throne
      camera={camera}
      f={f + 1166}
      mode="dawn"
      blur={5}
      puppets={[P("thief", THIEF, THIEF_AT, { ...faceChange([[0, "shocked"], [14, "angry"]], f), reachR: reach, handR: "fist", reachL: [-240, -820 + Math.sin(f * 0.6) * 30], handL: "open" })]}
    >
      {held(THIEF_AT, reach, camera, { length: SHORT, shaved: true, tilt: -0.2 })}
    </Throne>
  );
};

// Over the King's shoulder: everyone turns to look at him.
const THIEF_UP_R: [number, number] = [230.5, -880.5];
const OverKing2 = (f: number) => {
  const camera = cam([-0.5, 1.45, 3.65], [-0.42, 1.42, 3.4], [0.55, 1.0, 0.1], 34, ease(f, 0, 40));
  const turn = ease(f, 4, 14);
  return (
    <Throne
      camera={camera}
      f={f + 1204}
      mode="dawn"
      puppets={[
        P("king", KING, [-0.22, 1.95], { expression: "smug", view: "back" }),
        P("thief", THIEF, [0.62, 0.25], { expression: "excited", reachR: THIEF_UP_R, handR: "fist", reachL: [-230.5, -880.5 + Math.sin(f * 0.5) * 20], handL: "open" }),
        P("t1", MEASURER, [-0.25, 0.0], { ...faceChange([[0, "neutral"], [8, "shocked"]], f), lookX: -0.6 + turn * 1.6 }),
        P("t2", COMPARER, [1.45, -0.05], { ...faceChange([[0, "neutral"], [10, "skeptical"]], f), lookX: 0.6 - turn * 1.6 }),
      ]}
    >
      {held([0.62, 0.25], THIEF_UP_R, camera, { length: SHORT, shaved: true })}
    </Throne>
  );
};

// Crash zoom: he freezes, hand over his mouth.
const Freeze = (f: number) => {
  const camera = cam([0.98, 1.12, 2.9], [0.98, 1.02, 1.62], [0.96, 0.95, 0.5], 36, 1 - (1 - ease(f, 0, 7)) ** 2);
  camera.position = [camera.position[0] + Math.sin(f * 0.08) * 0.02, camera.position[1], camera.position[2] - ease(f, 8, 40) * 0.08];
  return (
    <Throne
      camera={camera}
      f={f + 1244}
      mode="dawn"
      blur={6}
      puppets={[P("thief", THIEF, THIEF_AT, { ...faceChange([[0, "shocked"], [6, "awkward"]], f), reachL: [-40, -700], frontL: true, handL: "open", reachR: [140, -480], handR: "fist", lookX: -0.8 })]}
    >
      {held(THIEF_AT, [140, -480], camera, { length: SHORT, shaved: true })}
    </Throne>
  );
};

// Low angle: the King holds out his palm. "The necklace."
const KingPalm = (f: number) => {
  const camera = cam([0.32, 0.5, 2.25], [0.28, 0.52, 2.05], [0.02, 1.2, 0.3], 44, ease(f, 0, 21));
  const out = ease(f, 0, 8);
  return (
    <Throne camera={camera} f={f + 1284} mode="dawn" rays={false} puppets={[P("king", KING, [0, 0.3], { expression: "smug", reachR: [140 + 140 * out, -520 - 60 * out], frontR: true, handR: "open", headTilt: -4 })]} />
  );
};

// Profile two-shot: he shakes his sleeve and the necklace drops into the King's palm.
const DROP = 13;
const NecklaceDrop = (f: number) => {
  const camera = cam([0.05, 1.05, 2.65], [0.05, 1.02, 2.45], [0.05, 0.86, 0.5], 34, ease(f, 0, 22));
  const kingAt: [number, number] = [-0.42, 0.5];
  const thiefAt: [number, number] = [0.52, 0.5];
  const shake = f < DROP ? Math.sin(f * 1.4) * 30 : 0;
  const thiefHand = handWorld(thiefAt, [-200 + shake, -600], camera);
  const kingHand = handWorld(kingAt, [230, -540], camera);
  const fall = ease(f, 4, DROP);
  const neck: Vec3 = [thiefHand[0] + (kingHand[0] - thiefHand[0]) * fall, thiefHand[1] - 0.02 + (kingHand[1] + 0.13 - thiefHand[1]) * fall * fall, thiefHand[2] + 0.05];
  return (
    <Throne
      camera={camera}
      f={f + 1305}
      mode="dawn"
      rays={false}
      puppets={[
        P("king", KING, kingAt, { expression: "smug", view: "side", facing: 1, reachR: [230, -540], handR: "open" }),
        P("thief", THIEF, thiefAt, { ...faceChange([[0, "awkward"], [DROP, "sad"]], f), view: "side", facing: -1, reachL: [-200 + shake, -600], handL: "open", slump: ease(f, DROP, DROP + 8) * 0.5 }),
      ]}
    >
      {f >= 3 && (
        <group userData={{ ghost: true }}>
          <Necklace position={neck} frame={f} hang={1} scale={1.3} />
        </group>
      )}
    </Throne>
  );
};

// ---------- 44-55 s: the trick ----------

// The palace woodshed (warm brown): log piles, a stump, and a woodcutter bringing in a bundle of plain sticks.
const Woodshed: React.FC<{ camera: CameraShot; f: number; children?: React.ReactNode; puppets?: PuppetPlacement[] }> = ({ camera, f, children, puppets }) => (
  <Stage
    set={
      <Room camera={camera} mood="warm" floor="#7a5634" wall="#8a5a34" wallPattern="panel" floorPattern="wood" width={7} depth={5} sun={{ x: 1.2, bars: 4 }}>
        <LogPile position={[-1.6, 0, -2.0]} />
        <LogPile position={[1.7, 0, -2.1]} rows={4} width={1.3} />
        <StumpAxe position={[1.1, 0, -0.4]} />
        <Crate position={[-0.15, 0, -0.75]} size={[0.95, 0.6, 0.6]} text={"PALACE\nWOODSHED"} />
        <Bundle position={[-0.95, 0, -0.85]} count={10} />
        <Bundle position={[0.62, 0, -0.95]} count={8} />
        {children}
      </Room>
    }
    camera={camera}
    bg="#2a120a"
    puppets={puppets}
    light={{ tint: "#ffe2c4", shadow: 0.18, distant: [{ direction: [0.6, 0.6, 0.5], color: "#ffc070", strength: 1.2 }] }}
  />
);

const WoodshedWide = (f: number) => {
  const camera = cam([0.7, 1.55, 3.7], [0.4, 1.48, 3.25], [0, 0.4, -0.6], 44, ease(f, -8, 51));
  const w = stroll(f, 0, 34, [-1.9, 0.6], [-0.95, 0.35]);
  const hand = handWorld(w.at, [160, -900], camera);
  return (
    <>
      <Woodshed camera={camera} f={f} puppets={[P("woodcutter", WOODCUTTER, w.at, { expression: "happy", reachR: [160, -900], handR: "fist", ...w.pose })]}>
        <group userData={{ ghost: true }}>
          <Bundle position={[hand[0] - 0.3, hand[1] + 0.02, hand[2] + 0.05]} lying count={7} />
        </group>
      </Woodshed>
      <Headline f={f} text="NOT A WIZARD'S STICK" at={16} />
    </>
  );
};

const CrateMacro = (f: number) => {
  const camera = cam([-0.1, 1.15, 1.72], [-0.14, 1.12, 1.6], [-0.15, 0.22, -0.6], 42, ease(f, 0, 50));
  return (
    <Woodshed camera={camera} f={f}>
      <Label text="PLAIN WOOD" position={[-0.15, 0.84, -0.5]} width={0.45} appear={f - 13} />
    </Woodshed>
  );
};

// The measuring bench (cool blue morning light): a stick on an inch board while the hourglass runs through the night.
const Ruler = (f: number) => {
  const camera = cam([0.35, 2.05, 1.15], [0.2, 1.95, 0.95], [0.05, 0.78, -0.38], 42, ease(f, 0, 67));
  const cycle = (f % 32) / 32;
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#8a9aa8" wall="#5a86a8" wallPattern="plaster" floorPattern="wood" width={6} depth={4}>
          <Desk position={[0, 0, -0.3]} size={[1.4, 0.75, 0.7]} color="#b08a5a" />
          <RulerBoard position={[-0.05, 0.78, -0.25]} />
          <group userData={{ ghost: true }}>
            <Stick position={[-0.044, 0.835, -0.25]} rotation={[0, 0, Math.PI / 2]} />
          </group>
          <Hourglass position={[0.5, 0.78, -0.48]} p={ease(cycle, 0, 0.8)} flip={ease(cycle, 0.85, 1)} />
          <Label text={"GROWTH:\n0 INCHES"} position={[-0.12, 1.12, -0.58]} width={0.42} appear={f - 26} />
          <Lamp position={[0.0, 2.0, -0.2]} color="#fff2d8" />
        </Room>
      }
      camera={camera}
      bg="#0a1430"
      light={{ tint: "#c8d6ff" }}
    />
  );
};

// Back in the throne room, cold "truth" light: the innocent guards doze on the bench, sticks leaning untouched.
const TRUTH_ZS = [0, 0.5, 1.0];
const TruthSleep = (f: number) => {
  // All three sleepers stay whole in frame; only a slow drift along the bench.
  const z = 0.42 + ease(f, 0, 42) * 0.16;
  const camera: CameraShot = { position: [0.3, 1.15, z], target: [3.72, 0.72, z], fov: 46 };
  const looks = [EXTRAS[0], COMPARER, MEASURER];
  const x = BENCH.x - 0.24;
  return (
    <Throne
      camera={camera}
      f={f + 1495}
      mode="night"
      truth={0.6}
      puppets={TRUTH_ZS.map((bz, i) => P(`t${i}`, looks[i], [x, bz], { sit: true, air: BENCH_AIR, expression: "happy", sleep: true, headTilt: (i % 2 ? 1 : -1) * 10 }))}
      light={throneLight("night", f, [])}
    >
      {TRUTH_ZS.map((bz, i) => (
        <Stick key={i} position={[BENCH.x - 0.3, STICK / 2 - 0.02, bz + 0.33]} rotation={[0, 0, 0.16]} />
      ))}
    </Throne>
  );
};

const RACK: Vec3 = [2.85, 0, -2.8];
const RackMacro = (f: number) => {
  const camera = cam([2.7, 1.3, -0.6], [2.74, 1.25, -0.85], [2.85, 0.75, -2.8], 42, ease(f, 0, 37));
  return (
    <Throne camera={camera} f={f + 1537} mode="night" truth={0.6} light={throneLight("night", f, [])}>
      <StickRack position={RACK} label={"UNTOUCHED\n11"} appear={f - 3} countUp={ease(f, 3, 24)} />
    </Throne>
  );
};

// The corner again, in truth light: the thief, sweating, shaves his stick.
const TruthThief = (f: number) => {
  const camera = cam([-3.25, 0.95, -0.35], [-3.32, 0.92, -0.55], [-3.85, 0.85, -1.6], 38, ease(f, 0, 37));
  const k = Math.abs(Math.sin(f * 0.32));
  const reachR: [number, number] = [150, -560];
  const knifeHand = handWorld(CORNER, [-60 + k * 60, -660 + k * 30], camera);
  const stickHand = handWorld(CORNER, reachR, camera);
  return (
    <Throne
      camera={camera}
      f={f + 1574}
      mode="corner"
      truth={0.7}
      candles={[0, 0, 0, 0]}
      puppets={[P("thief", THIEF, CORNER, { expression: "worried", reachR, frontR: true, handR: "fist", reachL: [-60 + k * 60, -660 + k * 30], frontL: true, handL: "fist", lookX: 0.5, headTilt: 8 })]}
      light={cornerLight(f)}
    >
      <HeldStick hand={stickHand} cam={camera.position} tilt={1.25} grip={0.3} />
      <CornerGlow f={f + 1574} />
      <Knife position={[knifeHand[0] + 0.05, knifeHand[1], knifeHand[2] + 0.06]} rotation={[0, 0, -0.5]} scale={1.3} />
    </Throne>
  );
};

// Macro on the floor by the corner candle: the shaved stick beside a full one, shavings in a pile. -1 INCH.
const ShavedEnd = (f: number) => {
  const camera = cam([-3.42, 0.66, -0.4], [-3.45, 0.62, -0.5], [-3.76, 0.06, -1.25], 40, ease(f, 0, 42));
  return (
    <Throne camera={camera} f={f + 1611} mode="corner" truth={0.5} candles={[0, 0, 0, 0]}>
      <CornerGlow f={f + 1611} lit={0.8} />
      <pointLight position={[-3.45, 0.9, -0.8]} intensity={3} distance={2} color="#e0f0ff" />
      <group userData={{ ghost: true }}>
        <Stick position={[-3.92, 0.024, -0.95 - STICK / 2]} rotation={[Math.PI / 2, 0, 0]} />
        <Stick position={[-3.72, 0.024, -0.95 - SHORT / 2]} rotation={[Math.PI / 2, 0, 0]} length={SHORT} shaved />
        <Shavings position={[-3.6, 0, -1.55]} n={16} seed={4} />
      </group>
      <Label text="-1 INCH" position={[-3.8, 0.12, -1.5]} rotation={[-0.45, 0.25, 0]} width={0.24} appear={f - 9} />
    </Throne>
  );
};

// Dawn, the throne: the King dangles the necklace; the Queen beams.
const KingThrone = (f: number) => {
  const camera = cam([0.45, 0.95, 1.1], [0.32, 1.02, 0.7], [0, 1.0, -2.3], 44, ease(f, 0, 56));
  const kingAt: [number, number] = [0, -2.02];
  const reach: [number, number] = [210, -860 + Math.sin(f * 0.15) * 15];
  const hand = handWorld(kingAt, reach, camera);
  return (
    <Throne
      camera={camera}
      f={f + 1653}
      mode="dawn"
      rays={false}
      puppets={[
        P("king", KING, kingAt, { expression: "smug", sit: true, air: THRONE_AIR, reachR: reach, handR: "fist", headTilt: -5, lookX: 0.4 }),
        P("queen", QUEEN, [0.9, -1.25], { ...faceChange([[0, "neutral"], [12, "happy"]], f), gesture: "clap" }),
      ]}
    >
      <group userData={{ ghost: true }}>
        <Necklace position={[hand[0], hand[1] + THRONE_AIR * (1.3 / 1060) - 0.02, hand[2] + 0.05]} frame={f} hang={1} scale={1.3} rotation={[0, 0, Math.sin(f * 0.2) * 0.25]} />
      </group>
    </Throne>
  );
};

// The thief looks at his own short stick, sighs; the camera pulls back.
const ThiefEnd = (f: number) => {
  const camera = cam([0.98, 1.08, 1.85], [1.0, 1.15, 2.6], [0.96, 0.95, 0.5], 36, ease(f, 0, 33));
  const reach: [number, number] = [170, -760];
  return (
    <Throne camera={camera} f={f + 1709} mode="dawn" puppets={[P("thief", THIEF, THIEF_AT, { expression: "sad", reachR: reach, frontR: true, handR: "fist", lookX: 0.6, headTilt: 8, slump: 0.4 })]}>
      {held(THIEF_AT, reach, camera, { length: SHORT, shaved: true, tilt: -0.3 })}
    </Throne>
  );
};

const QueenShot = one(QueenGasp);
const DoorShot = one(DoorSlam);
const RingShot = one(TopRing);
const LineShot = one(LineTruck);
const WalkShot = one(KingWalk);
const GiveShot = one(HandOut);
const KingShot = one(KingClose);
const OverShot = one(OverKing);
const GrinShot = one(ThiefGrin);
const MockShot = one(ThiefMock);
const TomorrowShot = one(KingTomorrow);
const StareShot = one(NightStare);
const MeasureShot = one(MeasureTop);
const BonkShot = one(Bonk);
const CompareShot = one(Compare);
const ToppleShot = one(Topple);
const LookShot = one(ThiefLook);
const HideShot = one(Hide);
const ScrapeShot = one(Scrape);
const SilenceShot = one(Silence);
const DawnShot = one(DawnRow);
const TopSticksShot = one(TopSticks);
const ShortShot = one(ShortStick);
const BlurtShot = one(ThiefBlurt);
const Over2Shot = one(OverKing2);
const FreezeShot = one(Freeze);
const PalmShot = one(KingPalm);
const DropShot = one(NecklaceDrop);
const ShedShot = one(WoodshedWide);
const CrateShot = one(CrateMacro);
const RulerShot = one(Ruler);
const TruthShot = one(TruthSleep);
const RackShot = one(RackMacro);
const TruthThiefShot = one(TruthThief);
const ShavedShot = one(ShavedEnd);
const ThroneShot = one(KingThrone);
const EndShot = one(ThiefEnd);

const SHOTS: Shot[] = [
  [0, 26, HookCushion, false],
  [26, 55, QueenShot, false],
  [55, 86, DoorShot, false],
  [86, 128, RingShot, false],
  [128, 191, LineShot, false],
  [191, 228, WalkShot, false],
  [228, 290, GiveShot, false],
  [290, 368, KingShot, false],
  [368, 457, OverShot, false],
  [457, 499, GrinShot, false],
  [499, 554, MockShot, false],
  [554, 580, TomorrowShot, false],
  [580, 664, StareShot, "dissolve"],
  [664, 707, MeasureShot, false],
  [707, 753, BonkShot, false],
  [753, 786, CompareShot, false],
  [786, 817, ToppleShot, false],
  [817, 850, LookShot, false],
  [850, 886, HideShot, false],
  [886, 951, ScrapeShot, false],
  [951, 991, SilenceShot, false],
  [991, 1068, DawnShot, "dissolve"],
  [1068, 1127, TopSticksShot, false],
  [1127, 1166, ShortShot, false],
  [1166, 1204, BlurtShot, false],
  [1204, 1244, Over2Shot, false],
  [1244, 1284, FreezeShot, false],
  [1284, 1305, PalmShot, false],
  [1305, 1327, DropShot, false],
  [1327, 1378, ShedShot, true],
  [1378, 1428, CrateShot, false],
  [1428, 1495, RulerShot, true],
  [1495, 1537, TruthShot, true],
  [1537, 1574, RackShot, false],
  [1574, 1611, TruthThiefShot, false],
  [1611, 1653, ShavedShot, false],
  [1653, 1709, ThroneShot, true],
  [1709, 1742, EndShot, false],
  [1742, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  // hook
  { at: 0, src: sfx("whoosh"), volume: 0.35 },
  { at: 14, src: sfx("stamp"), volume: 0.22, space: "hall" },
  { at: 55, src: sfx("bolt"), volume: 0.6, space: "hall" },
  { at: 55 + BOLT, src: sfx("stamp"), volume: 0.3, space: "hall" },
  { at: 152, src: sfx("pop"), volume: 0.7 },
  // the King and the sticks
  ...foleyCues("thud", [228 + GIVE, 228 + GIVE + 3], 0.7, { space: "hall" }),
  { at: 290 + 18, src: sfx("whoosh"), volume: 0.45 },
  { at: 386, src: sfx("pop"), volume: 0.55 },
  { at: 499 + 15, src: sfx("whoosh"), volume: 0.6 },
  // night
  ...foleyCues("thud", [664 + 6], 0.65, { space: "hall" }),
  ...foleyCues("thud", [707 + BONK], 0.5, { space: "hall", hit: 0.35 }),
  { at: 707 + BONK + 1, src: sfx("chime"), volume: 0.18 },
  ...foleyCues("snore", [753 + 2, 786], 0.36, { space: "hall" }),
  ...foleyCues("thud", [786 + TIP + 14, 786 + TIP + 12], 0.35, { space: "hall", hit: 0.25 }),
  { at: 850 + 8, src: sfx("paper"), volume: 0.4, space: "room" },
  ...foleyCues("scrape", [886 + STROKES[0]], 0.3, { space: "room" }), // one take holds three strokes
  // morning
  { at: 1137, src: sfx("sting"), volume: 0.5 },
  { at: 1244, src: sfx("whoosh"), volume: 0.22 },
  { at: 1250, src: sfx("tape-stop"), volume: 0.12 },
  { at: 1305 + DROP, src: sfx("clink"), volume: 0.3, space: "hall" },
  // the trick
  { at: 1323, src: sfx("whoosh"), volume: 0.3 },
  ...foleyCues("thud", [1327 + 34], 0.35, { space: "room" }),
  { at: 1378 + 13, src: sfx("pop"), volume: 0.7 },
  { at: 1424, src: sfx("whoosh"), volume: 0.4 },
    { at: 1428 + 26, src: sfx("pop"), volume: 0.7 },
  { at: 1491, src: sfx("whoosh"), volume: 0.3 },
  ...foleyCues("snore", [1500], 0.18, { space: "hall" }),
  { at: 1537 + 3, src: sfx("pop"), volume: 0.35 },
  { at: 1541, src: sfx("credit-blip"), volume: 0.2 },
  ...foleyCues("scrape", [1576], 0.28, { space: "room" }),
  { at: 1611 + 9, src: sfx("pop"), volume: 0.6 },
  { at: 1649, src: sfx("whoosh"), volume: 0.2 },
  { at: 1738, src: sfx("whoosh"), volume: 0.3 },
];

// Dark and curious for the theft, pulsing through the night and the reveal, light for the trick, dark again to loop.
const MUSIC: MusicCue[] = [
  { src: "music/mystery.wav", from: 0, to: 580, volume: 0.3 },
  { src: "music/tension.wav", from: 580, to: 1166, volume: 0.28 },
  { src: "music/mystery.wav", from: 1166, to: 1327, volume: 0.3 },
  { src: "music/lounge.wav", from: 1327, to: 1653, volume: 0.26 },
  { src: "music/mystery.wav", from: 1653, to: TIMING.totalFrames, volume: 0.3 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;

