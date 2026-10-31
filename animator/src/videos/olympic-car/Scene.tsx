import React from "react";
import {
  Automobile,
  CameraShot,
  CAR,
  carSeat,
  DustTrail,
  faceChange,
  Headline,
  jump,
  lerp3,
  moodBackground,
  MusicCue,
  PuppetPlacement,
  PuppetPose,
  ramp,
  RoadSet,
  Sfx,
  sfx,
  Shot,
  Stage,
  StadiumSet,
  stroll,
  summerLight,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { DRIVER, FAN_M, FAN_W, HICKS, LORZ, OFFICIAL, TRAINER_A, TRAINER_B } from "./cast";
import TIMING_JSON from "./timing.json";

// "The Olympic Marathon Runner Who Took a Car": St. Louis, 30 August 1904. Fred Lorz quits on a hot dusty road,
// rides in a car, runs the last stretch when it breaks down, crosses first, is cheered and then disqualified; the
// real winner, Thomas Hicks, is held up across the line. Sets: guide/references/st-louis-1904-marathon.md.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "olympic-car";
export const timing = TIMING;

const BG = moodBackground("daylight");
const LIGHT = summerLight();

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// The car on the road: x in its lane, driving toward the camera (+z).
const CAR_X = 0.62;
const PASSENGER: [number, number] = [0.26, CAR.front[1]];
const DRIVER_SEAT: [number, number] = [-0.26, CAR.front[1]];

// The car with its driver and (optionally) Lorz riding, at z, plus the dust it raises along `zAt`.
const carWith = (f: number, z: number, opts: { lorz?: Partial<PuppetPose>; steam?: number; bump?: number; zAt?: (g: number) => number | null; driver?: Partial<PuppetPose> }) => {
  const at: [number, number] = [CAR_X, z];
  const d = carSeat(at, 0, DRIVER_SEAT);
  const l = carSeat(at, 0, PASSENGER);
  const cast: PuppetPlacement[] = [{ id: "driver", look: DRIVER, pose: { expression: "neutral", sit: true, air: d.air, ...opts.driver } as PuppetPose, at: d.at }];
  if (opts.lorz) cast.push({ id: "lorz", look: LORZ, pose: { expression: "smug", sit: true, air: l.air, ...opts.lorz } as PuppetPose, at: l.at });
  const set = (
    <>
      <Automobile position={[CAR_X, 0, z]} roll={z} frame={f} steam={opts.steam} bump={opts.bump} />
      {opts.zAt && (
        <DustTrail
          frame={f}
          path={(g) => {
            const zz = opts.zAt!(g);
            return zz === null ? null : [CAR_X, 0, zz - CAR.halfLength];
          }}
        />
      )}
    </>
  );
  return { cast, set };
};

const road = (camera: CameraShot, f: number, children?: React.ReactNode) => (
  <RoadSet camera={camera} frame={f}>
    {children}
  </RoadSet>
);

// ---------- 0-2 s: the hook ----------

// Down at the road, looking up: running shoes slapping the dust in the foreground, the whole runner above them,
// the camera racing backwards in front of him. `offset` shifts the shot's clock: the video's last shot is this one
// just before frame 0 (offset -LOOP), so the end runs straight into the start when the Short loops.
const LOOP = 24;
const shoesAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const w = stroll(f, -60, 110, [-0.4, -5], [-0.4, 2.2]);
  const camera: CameraShot = { position: [w.at[0] + 0.35, 0.1, w.at[1] + 1.7], target: [w.at[0], 0.72, w.at[1]], fov: 52 };
  return (
    <Stage
      set={road(camera, f, <DustTrail frame={f} path={(g) => [-0.4, 0, -5 + 7.2 * ramp(g, -60, 50)]} every={4} life={24} size={0.18} />)}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "determined", ...w.pose } as PuppetPose, at: w.at }]}
      light={LIGHT}
      energy={0}
    />
  );
};
const Shoes = shoesAt(0);
const LoopIn = shoesAt(-LOOP);

// Hard cut to a big spoked wheel spinning in the dust.
const Wheel: React.FC = () => {
  const f = useShotFrame();
  const z = -1 + f * 0.11;
  const camera: CameraShot = { position: [CAR_X + 1.25, 0.38, z + 0.9 + f * 0.01], target: [CAR_X + 0.6, 0.34, z + 0.75], fov: 38 };
  const c = carWith(f, z, { zAt: (g) => -1 + g * 0.11 });
  // A macro on the wheel only: the riders are not in this shot.
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} light={LIGHT} />;
};

// Pull back fast: there he is, riding in the car, grinning and waving. A CAR?!
const CarReveal: React.FC = () => {
  const f = useShotFrame();
  const z = 1 + f * 0.06;
  const e = ease(f, 0, 30);
  const camera: CameraShot = { position: lerp3([CAR_X + 0.9, 1.25, z + 1.9], [CAR_X - 0.3, 1.6, z + 4.4], e), target: [CAR_X + 0.15, 0.95, z], fov: 42 };
  const c = carWith(f, z, { lorz: { expression: "smug", gesture: "wave" }, zAt: (g) => 1 + g * 0.06 });
  return (
    <>
      <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={c.cast} light={LIGHT} />
      <Headline f={f} text="A CAR?!" at={2} size={120} />
    </>
  );
};

// ---------- 2-10 s: the hot, dusty road and the ride ----------

const LORZ_STOP: [number, number] = [-0.55, 1.4];

// Wide: the long dusty road shimmering in the heat, Lorz labouring toward us.
const RoadWide: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -20, 120, [-0.55, -9], [-0.55, -1.0]);
  const camera: CameraShot = { position: lerp3([1.6, 0.7, 4.8], [0.3, 1.0, 3.8], ease(f, 0, 52)), target: lerp3([-0.4, 1.5, -6], [-0.5, 1.2, -3], ease(f, 0, 52)), fov: 46 };
  return (
    <>
      <Stage set={road(camera, f)} camera={camera} bg={BG} puppets={[{ id: "lorz", look: LORZ, pose: { expression: "sad", ...w.pose } as PuppetPose, at: w.at }]} light={LIGHT} />
      <Headline f={f} text={"ST. LOUIS, 1904"} at={8} out={44} />
    </>
  );
};

// Close, backing away in front of him: sweat, worry, the legs going.
const Struggle: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -40, 110, [-0.55, -2.2], LORZ_STOP);
  const camera: CameraShot = { position: [w.at[0] + 0.35, 1.0, w.at[1] + 1.9 - f * 0.004], target: [w.at[0] + 0.05, 0.9, w.at[1]], fov: 38 };
  return (
    <Stage
      set={road(camera, f)}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "worried", ...w.pose } as PuppetPose, at: w.at }]}
      light={LIGHT}
      blur={5}
    />
  );
};

// He stops dead and doubles over, hands on knees, panting.
const Stop: React.FC = () => {
  const f = useShotFrame();
  const a = 0.6 - 0.9 * ease(f, 0, 42);
  const camera: CameraShot = { position: [LORZ_STOP[0] + Math.sin(a) * 2.0, 0.9, LORZ_STOP[1] + Math.cos(a) * 2.0], target: [LORZ_STOP[0], 0.7, LORZ_STOP[1]], fov: 40 };
  const pose: PuppetPose = {
    ...faceChange([[0, "worried"], [10, "sad"]], f),
    bend: 0.45 * ease(f, 2, 10),
    crouch: 0.25 * ease(f, 2, 10),
    reachL: [-120, -330],
    reachR: [120, -330],
    bob: Math.sin(f * 0.5) * 10,
  };
  return <Stage set={road(camera, f)} camera={camera} bg={BG} puppets={[{ id: "lorz", look: LORZ, pose, at: LORZ_STOP }]} light={LIGHT} />;
};

// Low under the blazing sun: he wipes his brow; far down the road a car comes, trailing dust.
const HotSun: React.FC = () => {
  const f = useShotFrame();
  const z = -26 + f * 0.25;
  const camera: CameraShot = { position: lerp3([-0.2, 0.4, 3.9], [-0.4, 0.35, 3.6], ease(f, 0, 32)), target: lerp3([-0.85, 1.7, -3], [-0.75, 1.4, -6], ease(f, 0, 32)), fov: 46 };
  const c = carWith(f, z, { zAt: (g) => -26 + g * 0.25 });
  const pose: PuppetPose = { expression: "sad", slump: 0.5, headTilt: Math.sin(f * 0.15) * 6, bob: Math.sin(f * 0.5) * 8 };
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={[{ id: "lorz", look: LORZ, pose, at: LORZ_STOP }, ...c.cast]} light={LIGHT} />;
};

// The car pulls up beside him; he looks at it, grins and hops on — and they are off.
const GetRide: React.FC = () => {
  const f = useShotFrame();
  const arrive = (g: number) => -12 + 13.6 * ease(g, -10, 20); // stops level with him
  const hop = 27;
  const away = (g: number) => LORZ_STOP[1] + 0.2 + 0.035 * (g - hop) ** 1.25;
  const z = f < hop ? arrive(f) : away(f);
  const camera: CameraShot = { position: lerp3([-2.0, 1.2, 4.4], [-1.6, 1.5, 7.6], ease(f, 0, 58)), target: [0.2, 0.9, Math.max(0.6, z)], fov: 44 };
  const riding = f >= hop;
  const c = carWith(f, z, {
    lorz: riding ? { ...faceChange([[hop, "excited"], [hop + 10, "smug"]], f), gesture: "wave", bob: -70 * Math.max(0, Math.sin(ramp(f, hop, hop + 8) * Math.PI)) } : undefined,
    bump: f >= 18 && f < 22 ? 0.02 : 0,
    zAt: (g) => (g < hop ? arrive(g) : away(g)),
  });
  const cast = riding
    ? c.cast
    : [...c.cast, { id: "lorz", look: LORZ, pose: { ...faceChange([[0, "sad"], [16, "smug"]], f), view: f > 14 ? ("side" as const) : undefined, facing: 1 as const, bend: 0.3 * (1 - ramp(f, 10, 18)) }, at: LORZ_STOP } as PuppetPlacement];
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={cast} light={LIGHT} />;
};

// ---------- 10-16 s: the breakdown and the run in ----------

// Riding along: Lorz leans back, hands behind his head; the car rattles over the ruts.
const Cruise: React.FC = () => {
  const f = useShotFrame();
  const z = 3 + f * 0.09;
  const camera: CameraShot = { position: [CAR_X + 1.0, 1.3, z + 2.2 - f * 0.02], target: [CAR_X + 0.15, 0.95, z], fov: 40 };
  const c = carWith(f, z, { lorz: { expression: "smug", armL: [150, -120], armR: [150, -120], headTilt: 6 }, bump: Math.abs(Math.sin(f * 0.7)) * 0.015, zAt: (g) => 3 + g * 0.09 });
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={c.cast} light={LIGHT} />;
};

// BANG: steam blasts out of the hood, the car lurches and dies; Lorz is thrown forward, shocked.
const Breakdown: React.FC = () => {
  const f = useShotFrame();
  const z = 5.5 + 0.9 * ease(f, 0, 8);
  const camera: CameraShot = { position: lerp3([CAR_X - 1.4, 1.1, z + 3.0], [CAR_X - 0.7, 1.0, z + 2.3], ease(f, 0, 30)), target: [CAR_X, 0.9, z], fov: 42 };
  const c = carWith(f, z, {
    lorz: { ...faceChange([[0, "smug"], [5, "shocked"]], f), lean: 10 * Math.max(0, Math.sin(ramp(f, 5, 14) * Math.PI)) },
    driver: faceChange([[0, "neutral"], [6, "shocked"]], f),
    steam: ease(f, 5, 12),
    bump: 0.06 * Math.max(0, Math.sin(ramp(f, 5, 12) * Math.PI)),
  });
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={c.cast} light={LIGHT} />;
};

// He jumps out and runs on toward the stadium, the dead car steaming behind him.
const RunAgain: React.FC = () => {
  const f = useShotFrame();
  const z = 6.4;
  const w = stroll(f, 4, 60, [-0.95, 6.6], [-0.95, 9.6]);
  const camera: CameraShot = { position: [w.at[0] + 0.6, 1.0, w.at[1] + 2.2], target: lerp3([-0.5, 0.9, 6.6], [w.at[0], 0.9, w.at[1]], ease(f, 0, 14)), fov: 44 };
  const c = carWith(f, z, { steam: 1 });
  const pose: PuppetPose = { expression: "determined", ...jump(f, -2, 90, 12), ...w.pose } as PuppetPose;
  return <Stage set={road(camera, f, c.set)} camera={camera} bg={BG} puppets={[...c.cast, { id: "lorz", look: LORZ, pose, at: w.at }]} light={LIGHT} />;
};

// ---------- 16-21 s: the finish ----------

const FANS: PuppetPlacement[] = [
  { id: "fan1", look: FAN_M, pose: { expression: "happy" }, at: [-1.6, -1.7] },
  { id: "fan2", look: FAN_W, pose: { expression: "happy" }, at: [1.3, -1.7] },
  { id: "fan3", look: { ...FAN_M, outfit: "#4a3e34", hat: "#22222a", hatStyle: "bowler" }, pose: { expression: "happy" }, at: [3.2, -1.7] },
];
const fans = (expression: PuppetPose["expression"], gesture?: PuppetPose["gesture"]) =>
  FANS.map((p) => ({ ...p, pose: { ...p.pose, expression, gesture } as PuppetPose }));

const stadium = (camera: CameraShot, f: number, o: { cheer?: number; tape?: number; dq?: number }, children?: React.ReactNode) => (
  <StadiumSet camera={camera} frame={f} cheer={o.cheer} tape={o.tape} dq={o.dq}>
    {children}
  </StadiumSet>
);

// Into the stadium: Lorz pounds down the cinder track toward the tape, the stand rising behind him.
const StadiumRun: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -20, 64, [-6, 0.1], [-0.6, 0.1]);
  const camera: CameraShot = { position: [w.at[0] + 1.6, 1.0, 3.2], target: [w.at[0] + 0.6, 1.0, 0], fov: 44 };
  return (
    <Stage
      set={stadium(camera, f, { cheer: 0.6 })}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "determined", ...w.pose } as PuppetPose, at: w.at }, ...fans("excited")]}
      light={LIGHT}
    />
  );
};

// Low at the line: he bursts through the tape — and the hats go flying.
const Tape: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, -14, 30, [-2.6, 0.1], [0.9, 0.1]);
  const camera: CameraShot = { position: lerp3([2.9, 0.45, 1.3], [3.3, 0.6, 1.6], ease(f, 0, 33)), target: [-0.4, 1.15, -0.4], fov: 50 };
  const hats: React.ReactNode[] = Array.from({ length: 6 }, (_, i) => {
    const t = f - 6 - i * 2;
    if (t < 0) return null;
    const x = -2.4 + i * 1.0;
    return (
      <mesh key={i} position={[x + t * 0.01, 1.6 + t * 0.09 - 0.0025 * t * t, -2.3 - (i % 2) * 0.6]} rotation={[t * 0.3, t * 0.2, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.05, 16]} />
        <meshToonMaterial color={i % 2 ? "#e6cc84" : "#22222a"} />
      </mesh>
    );
  });
  return (
    <Stage
      set={stadium(camera, f, { cheer: 1, tape: ease(f, 0, 6) }, <group userData={{ ghost: true }}>{hats}</group>)}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "excited", ...w.pose, ...(f > 12 ? { gesture: "cheer" } : {}) } as PuppetPose, at: w.at }, ...fans("excited", "cheer")]}
      light={LIGHT}
    />
  );
};

// The crowd roars; he soaks it up, arms high. We believe it for a second.
const Cheer: React.FC = () => {
  const f = useShotFrame();
  const a = -0.5 + 0.8 * ease(f, 0, 51);
  const at: [number, number] = [1.0, 0.1];
  const camera: CameraShot = { position: [at[0] + Math.sin(a) * 2.6, 1.15, at[1] + Math.cos(a) * 2.6], target: [at[0], 1.05, at[1] - 0.4], fov: 44 };
  return (
    <Stage
      set={stadium(camera, f, { cheer: 1, tape: 1 })}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "excited", gesture: "cheer" }, at }, ...fans("excited", "cheer")]}
      light={LIGHT}
    />
  );
};

// ---------- 18-21 s: the twist ----------

// The cheering stops dead. An official in a bowler marches in and points; Lorz's grin goes awkward.
const Officials: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [0.95, 2.3], [0.45, 0.85]); // from the officials' side, clear of the finish post
  const camera: CameraShot = { position: lerp3([1.9, 1.2, 3.6], [1.4, 1.1, 2.9], ease(f, 0, 52)), target: [0.6, 1.0, 0.4], fov: 42 };
  const off: PuppetPose = { ...faceChange([[0, "angry"]], f), ...w.pose, ...(f > 30 ? { gesture: "point" as const } : {}) } as PuppetPose;
  return (
    <Stage
      set={stadium(camera, f, { cheer: 1 - ramp(f, 6, 10), tape: 1 })}
      camera={camera}
      bg={BG}
      puppets={[
        { id: "lorz", look: LORZ, pose: { ...faceChange([[0, "excited"], [10, "awkward"]], f) }, at: [1.0, 0.1] },
        { id: "official", look: OFFICIAL, pose: off, at: w.at },
        ...fans("shocked"),
      ]}
      light={LIGHT}
    />
  );
};

// The results board: a chalk line through his name, DISQUALIFIED written beside it.
const Board: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([1.1, 1.3, 4.4], [1.4, 1.15, 3.9], ease(f, 0, 58)), target: [2.6, 1.05, 1.9], fov: 45 };
  return <Stage set={stadium(camera, f, { tape: 1, dq: ease(f, 6, 46) })} camera={camera} bg={BG} light={LIGHT} />;
};

// Head down, he trudges off along the track; the crowd sits silent.
const Shame: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 70, [1.0, 0.1], [3.2, 0.3]);
  const camera: CameraShot = { position: lerp3([-0.6, 1.1, 3.0], [0.6, 1.0, 3.2], ease(f, 0, 50)), target: [w.at[0], 0.95, 0], fov: 42 };
  return (
    <Stage
      set={stadium(camera, f, { tape: 1, dq: 1 })}
      camera={camera}
      bg={BG}
      puppets={[{ id: "lorz", look: LORZ, pose: { expression: "sad", ...w.pose } as PuppetPose, at: w.at }, ...fans("skeptical")]}
      light={LIGHT}
    />
  );
};

// ---------- 21-30 s: the real winner ----------

// Thomas Hicks, barely upright, held up by two men on either side, staggering in.
const hicksGroup = (f: number, from: [number, number], to: [number, number], start: number, frames: number, hicks: Partial<PuppetPose>): PuppetPlacement[] => {
  const w = stroll(f, start, frames, from, to);
  const sway = Math.sin(f * 0.18) * 7;
  const [x, z] = w.at;
  return [
    {
      id: "hicks",
      look: HICKS,
      pose: { expression: "bored", slump: 1, crouch: 0.22 + 0.06 * Math.sin(f * 0.3), lean: sway, stepLift: 0.25, ...w.pose, ...hicks, headTilt: sway * 1.6, armL: [70, -10], armR: [70, -10] } as PuppetPose,
      at: [x, z],
    },
    { id: "trainerA", look: TRAINER_A, pose: { expression: "worried", ...w.pose, reachR: [150, -560], frontR: true, armL: undefined } as PuppetPose, at: [x - 0.42, z + 0.04] },
    { id: "trainerB", look: TRAINER_B, pose: { expression: "worried", ...w.pose, reachL: [-150, -560], frontL: true, armR: undefined } as PuppetPose, at: [x + 0.42, z + 0.04] },
  ];
};

const HicksArrive: React.FC = () => {
  const f = useShotFrame();
  const gx = -7.5 + 3.3 * ramp(f, -10, 80);
  const camera: CameraShot = { position: [gx + 1.9 - 0.6 * ease(f, 0, 70), 0.6 + 0.2 * ease(f, 0, 70), 2.4], target: [gx, 0.95, 0], fov: 44 };
  return (
    <Stage
      set={stadium(camera, f, { tape: 1, dq: 1 })}
      camera={camera}
      bg={BG}
      puppets={hicksGroup(f, [-7.5, 0.1], [-4.2, 0.1], -10, 90, {})}
      light={LIGHT}
    />
  );
};

// Close on Hicks: his eyes roll, his knees buckle, the two men haul him up again.
const HicksClose: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-1.6, 0.1];
  const camera: CameraShot = { position: lerp3([at[0] + 0.5, 1.05, 2.4], [at[0] + 0.25, 1.0, 1.8], ease(f, 0, 66)), target: [at[0], 0.85, at[1]], fov: 40 };
  const buckle = Math.max(0, Math.sin(ramp(f, 20, 44) * Math.PI));
  return (
    <Stage
      set={stadium(camera, f, { tape: 1, dq: 1 })}
      camera={camera}
      bg={BG}
      puppets={hicksGroup(f, [at[0], at[1] - 0.7], at, -20, 40, { // walking toward the camera: front view throughout, no flip from profile
         ...faceChange([[0, "bored"], [22, "sad"]], f), crouch: 0.25 + 0.3 * buckle, blink: buckle > 0.5 })}
      light={LIGHT}
    />
  );
};

// ---------- 27-33 s: first across is not the winner ----------

// At the line: Hicks held up, the official raising his arm; Lorz in the background, alone.
const Verdict: React.FC = () => {
  const f = useShotFrame();
  const a = 0.35 - 0.6 * ease(f, 0, 79);
  const c: [number, number] = [0.9, 0.2];
  const camera: CameraShot = { position: [c[0] + Math.sin(a) * 3.2, 1.25, c[1] + Math.cos(a) * 3.2], target: [c[0], 1.0, c[1] - 0.3], fov: 42 };
  const group = hicksGroup(f, [0.9, 0.1], [0.9, 0.1], 0, 1, {});
  return (
    <>
      <Stage
        set={stadium(camera, f, { tape: 1, dq: 1 })}
        camera={camera}
        bg={BG}
        puppets={[
          ...group,
          { id: "lorz", look: LORZ, pose: { expression: "sad", view: "side", facing: -1 }, at: [3.1, -0.6] },
        ]}
        light={LIGHT}
      />
      <Headline f={f} text={"FIRST ACROSS\n≠ WINNER"} at={10} />
    </>
  );
};

// Rising and pulling back over the field and the stand.
const Final: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 95);
  const camera: CameraShot = { position: lerp3([0.6, 1.6, 4.4], [2.2, 4.6, 9.5], e), target: lerp3([0.2, 1.0, 0], [0.0, 1.0, -1.5], e), fov: 46 };
  return (
    <>
      <Stage
        set={stadium(camera, f, { tape: 1, dq: 1 })}
        camera={camera}
        bg={BG}
        puppets={[...hicksGroup(f, [0.9, 0.1], [0.9, 0.1], 0, 1, {}), { id: "lorz", look: LORZ, pose: { expression: "sad" }, at: [3.1, -0.6] }]}
        light={LIGHT}
      />
      <Headline f={f} text={"FIRST ACROSS\n≠ WINNER"} at={-79} />
    </>
  );
};

const SHOTS: Shot[] = [
  [0, 16, Shoes, false],
  [16, 36, Wheel, false],
  [36, 70, CarReveal, false],
  [70, 122, RoadWide, false],
  [122, 170, Struggle, false],
  [170, 212, Stop, false],
  [212, 244, HotSun, false],
  [244, 302, GetRide, false],
  [302, 330, Cruise, false],
  [330, 360, Breakdown, false],
  [360, 404, RunAgain, false],
  [404, 446, StadiumRun, true],
  [446, 479, Tape, false],
  [479, 530, Cheer, false],
  [530, 582, Officials, false],
  [582, 640, Board, false],
  [640, 690, Shame, false],
  [690, 760, HicksArrive, false],
  [760, 826, HicksClose, false],
  [826, 905, Verdict, false],
  [905, 976, Final, false], // 976 = totalFrames - LOOP
  [976, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("steps"), volume: 0.45, until: 16 },
  { at: 16, src: sfx("engine"), volume: 0.5, until: 70 },
  { at: 36, src: sfx("honk"), volume: 0.45 },
  { at: 38, src: sfx("pop"), volume: 0.35 },
  { at: 70, src: sfx("wind"), volume: 0.28, until: 404 },
  { at: 70, src: sfx("steps"), volume: 0.3, until: 170 },
  { at: 78, src: sfx("pop"), volume: 0.3 },
  { at: 212, src: sfx("engine"), volume: 0.25, until: 330 },
  { at: 268, src: sfx("whoosh"), volume: 0.4 },
  { at: 271, src: sfx("honk"), volume: 0.5 },
  { at: 335, src: sfx("hiss"), volume: 0.7 },
  { at: 335, src: sfx("boom"), volume: 0.35 },
  { at: 335, src: sfx("tape-stop"), volume: 0.4 },
  { at: 362, src: sfx("steps"), volume: 0.4, until: 446 },
  { at: 396, src: sfx("whoosh"), volume: 0.35 },
  { at: 404, src: sfx("crowd"), volume: 0.35, until: 446 },
  { at: 446, src: sfx("crowd"), volume: 0.6, until: 540 },
  { at: 450, src: sfx("paper"), volume: 0.4 },
  { at: 450, src: sfx("chime"), volume: 0.3 },
  { at: 540, src: sfx("tape-stop"), volume: 0.5 },
  { at: 542, src: sfx("sting"), volume: 0.6 },
  { at: 588, src: sfx("paper"), volume: 0.3 },
  { at: 626, src: sfx("stamp"), volume: 0.55 },
  { at: 690, src: sfx("steps"), volume: 0.2, until: 826 },
  { at: 836, src: sfx("pop"), volume: 0.3 },
  { at: 970, src: sfx("whoosh"), volume: 0.3 },
  { at: 976, src: sfx("steps"), volume: 0.45, until: TIMING.totalFrames },
];

// Bright and bouncy through the ride and the run; a pulsing bed for the finish; it stops dead with the cheering at
// the twist, then a dark bed for the real winner, ending after the last line.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 330, volume: 0.32 },
  { src: "music/tension.wav", from: 330, to: 540, volume: 0.32 },
  { src: "music/mystery.wav", from: 600, to: 930, volume: 0.3 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
