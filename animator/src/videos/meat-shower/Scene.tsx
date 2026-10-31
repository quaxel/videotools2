import React from "react";
import {
  CameraShot,
  faceChange,
  FarmyardSet,
  farmLight,
  handWorld,
  Headline,
  KETTLE,
  KETTLE_RIM,
  lerp3,
  moodBackground,
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
  Vultures,
} from "../../engine";
import { FallingFlake, LyingFlake, Paddle, SoapSplash } from "./props";
import TIMING_JSON from "./timing.json";

// "The Day Meat Fell From the Sky in Kentucky": Bath County, 3 March 1876. A fast historical-mystery Short in one
// farmyard (guide/references/kentucky-farmyard-1876.md). The vultures are shown only as a theory.
// The meat pieces are drawn at twice the reported size (most ~2 in, one 3-4 in) so they read on a phone.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "meat-shower";
export const timing = TIMING;

const BG = moodBackground("daylight");

// Eased 0..1 between frames a and b.
const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// ---------- cast (1870s farm dress; Mrs. Crouch is a historical re-enactment, no portrait of her survives) ----------

const CROUCH: PuppetLook = { skin: "#f2cfae", hair: "#5a3420", outfit: "#4f6f9a", pattern: "#6f8cb8", long: true, skirt: true, apron: "#f4efe2", kerchief: "#b8473a" };
const ELDER: PuppetLook = { skin: "#e6b88e", hair: "#3a2a1e", outfit: "#d8c49a", vest: "#5a4030", hat: "#4a3a2c", beard: "#4a3424" };
const YOUNG: PuppetLook = { skin: "#f4d0b0", hair: "#8a5a2a", outfit: "#9aa0a0", suspenders: "#5a3a24", hat: "#e0c27a" };

const CROUCH_AT: [number, number] = [-0.22, 0.78];
const ELDER_AT: [number, number] = [1.95, -0.15];
const YOUNG_AT: [number, number] = [1.38, 0.5];

const PIECE = 0.04; // a typical piece (2x the reported ~2 in)
const BIG = 0.072; // the one by her hand (2x the reported 3-4 in)
const RIM_SPOT: Vec3 = [0.24, KETTLE_RIM + 0.01, 0.56];

// Mrs. Crouch stirring: her right hand circles over the kettle's near rim, the paddle runs down into the brew.
const stirReach = (f: number, still = 0): [number, number] => {
  const k = 1 - still;
  return [318 + 26 * Math.sin(f * 0.19) * k, -498 + 14 * Math.cos(f * 0.19) * k];
};
const stirring = (f: number, camera: CameraShot, extra: Partial<PuppetPose> = {}, still = 0) => {
  const reach = stirReach(f, still);
  const pose: PuppetPose = { expression: "neutral", reachR: reach, handR: "fist", frontR: true, ...extra };
  const hand = handWorld(CROUCH_AT, reach, camera);
  const blade: Vec3 = [KETTLE[0] - 0.05 + Math.sin(f * 0.19) * 0.08 * (1 - still), KETTLE_RIM - 0.12, KETTLE[2] + Math.cos(f * 0.19) * 0.06 * (1 - still)];
  return { puppet: { id: "crouch", look: CROUCH, pose, at: CROUCH_AT } as PuppetPlacement, paddle: <Paddle hand={hand} blade={blade} /> };
};

// Pieces already down by the time the neighbours come: on the grass round the yard and on the fence rails.
const YARD_PIECES: { at: Vec3; tilt?: number }[] = [
  { at: [0.95, 0, 1.25] },
  { at: [-0.75, 0, 1.4] },
  { at: [0.15, 0, -0.35] },
  { at: [-1.3, 0, 0.55] },
  { at: [1.15, 0, -0.6] },
  { at: [1.75, 0, 1.6] },
  { at: [-0.4, 0, 2.1] },
  { at: [2.42, 0.86, 0.95], tilt: 0.2 },
  { at: [2.38, 0.55, -0.85], tilt: -0.3 },
  { at: [2.5, 0.7, 2.3], tilt: 0.25 },
];
const Pieces: React.FC<{ skip?: number }> = ({ skip = -1 }) => (
  <>
    {YARD_PIECES.map((p, i) => (i === skip ? null : <LyingFlake key={i} at={p.at} size={PIECE} seed={i + 3} tilt={p.tilt} />))}
    <LyingFlake at={RIM_SPOT} size={BIG} seed={5} />
  </>
);

const farm = (camera: CameraShot, f: number, children?: React.ReactNode) => (
  <FarmyardSet camera={camera} frame={f}>
    {children}
  </FarmyardSet>
);

// ---------- the hook: four quick, hard shots ----------

// Flat on our back in the yard, pushing up fast into a blazing blue sky: pieces tumble down straight at us.
const RAIN: [Vec3, Vec3, number, number, number][] = [
  // from, to, land frame (shot frames), fall frames, seed — two tumble right past the lens
  [[1.7, 2.4, 1.75], [1.68, 0, 1.72], 22, 30, 61],
  [[1.62, 3.2, 1.15], [1.58, 0, 1.08], 30, 34, 62],
  [[0.6, 7, -1.0], [1.2, 0, 0.6], 34, 40, 63],
  [[2.6, 8, -2.0], [2.2, 0, 0.2], 38, 40, 64],
  [[1.2, 9, -3.0], [1.4, 0, -0.4], 44, 40, 65],
];
const SkyRain: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 26);
  const camera: CameraShot = { position: lerp3([1.95, 0.22, 2.9], [1.75, 0.3, 2.45], e), target: lerp3([0.9, 3.6, -2.2], [1.2, 4.2, -1.4], e), fov: lerp3([64, 0, 0], [54, 0, 0], e)[0] };
  return (
    <>
      <Stage
        set={farm(camera, f, (
          <>
            {RAIN.map(([from, to, land, fall, seed]) => (
              <FallingFlake key={seed} f={f} from={from} to={to} land={land} fall={fall} size={PIECE} seed={seed} />
            ))}
          </>
        ))}
        camera={camera}
        bg={BG}
        light={farmLight(f)}
      />
      <Headline f={f} text="MEAT FROM THE SKY?" at={3} />
    </>
  );
};

// Low on Mrs. Crouch: she throws her hands up, shocked, as pieces drop past right in front of the lens.
const Shocked: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 30);
  const camera: CameraShot = { position: lerp3([-0.75, 0.3, 2.45], [-0.45, 0.42, 2.0], e), target: lerp3([-0.15, 1.15, 0.2], [-0.2, 1.0, 0.4], e), fov: 46 };
  const pose: PuppetPose = {
    ...faceChange([[0, "neutral"], [3, "shocked"]], f),
    armL: [150 * ramp(f, 3, 9), -25],
    armR: [150 * ramp(f, 3, 9), -25],
    handL: "open",
    handR: "open",
    slump: -0.7 * ramp(f, 3, 8),
    bob: -14 * Math.sin(ramp(f, 3, 9) * Math.PI),
  };
  const near: [Vec3, Vec3, number, number][] = [
    [[-0.55, 2.4, 1.55], [-0.62, 0, 1.6], 18, 71],
    [[0.0, 2.6, 1.75], [0.05, 0, 1.8], 26, 72],
    [[0.5, 2.8, 1.0], [0.62, 0, 1.25], 30, 73],
  ];
  return (
    <>
      <Stage
        set={farm(camera, f + 26, (
          <>
            <Paddle hand={[0.12, 0.95, 0.78]} blade={[KETTLE[0] - 0.05, KETTLE_RIM - 0.12, KETTLE[2]]} />
            {near.map(([from, to, land, seed]) => (
              <FallingFlake key={seed} f={f} from={from} to={to} land={land} fall={22} size={PIECE} seed={seed} />
            ))}
          </>
        ))}
        camera={camera}
        bg={BG}
        puppets={[{ id: "crouch", look: CROUCH, pose, at: CROUCH_AT }]}
        light={farmLight(f, true)}
      />
      <Headline f={f} text="MEAT FROM THE SKY?" at={-26} />
    </>
  );
};

// Into the kettle: a piece drops into the soap and throws up a splash; the camera dives at the brew.
const KettleSplash: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 28);
  const brew: Vec3 = [KETTLE[0] + 0.05, KETTLE_RIM - 0.05, KETTLE[2] + 0.05];
  const camera: CameraShot = { position: lerp3([KETTLE[0] + 1.05, 1.05, KETTLE[2] + 0.75], [KETTLE[0] + 0.62, 0.92, KETTLE[2] + 0.42], e), target: lerp3([brew[0], brew[1] + 0.05, brew[2]], brew, e), fov: 38 };
  const sink = Math.min(1, Math.max(0, (f - 12) / 10));
  return (
    <>
      <Stage
        set={<FarmyardSet camera={camera} frame={f + 56} steam={false}>{(
          <>
            <Paddle hand={[0.12, 0.95, 0.78]} blade={[KETTLE[0] - 0.05, KETTLE_RIM - 0.12, KETTLE[2]]} />
            {f < 12 ? (
              <FallingFlake f={f} from={[brew[0] - 0.2, 2.2, brew[2] - 0.3]} to={brew} land={12} fall={12} size={PIECE} seed={81} />
            ) : (
              <LyingFlake at={[brew[0], brew[1] - 0.03 * sink, brew[2]]} size={PIECE} seed={81} />
            )}
            <SoapSplash f={f} at={12} centre={brew} />
          </>
        )}</FarmyardSet>}
        camera={camera}
        bg={BG}
        light={farmLight(f, true)}
      />
      <Headline f={f} text="MEAT FROM THE SKY?" at={-56} />
    </>
  );
};

// Down in the grass: the last piece slams in right in front of us; the camera jolts and punches in.
const GrassImpact: React.FC = () => {
  const f = useShotFrame();
  const a = -0.35 + 0.6 * ease(f, 0, 32);
  const r = 0.6 - 0.16 * ease(f, 19, 32);
  const camera: CameraShot = { position: [1.75 + Math.sin(a) * r, 0.2 - 0.05 * ease(f, 19, 32), 0.35 + Math.cos(a) * r], target: [1.75, -0.02, 0.35], fov: 30 };
  return (
    <>
      <Stage set={farm(camera, f + 84, <FallingFlake f={f} from={[1.62, 1.4, 0.2]} to={[1.75, 0, 0.35]} land={19} fall={16} size={PIECE} seed={2} />)} camera={camera} bg={BG} light={farmLight(f)} />
      <Headline f={f} text="MEAT FROM THE SKY?" at={-84} out={26} />
    </>
  );
};

// ---------- Mrs. Crouch at her soap kettle ----------

// "The sky was clear." Craning fast down out of the cloudless sky onto Mrs. Crouch stirring her kettle.
const ClearSky: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 56);
  const camera: CameraShot = { position: lerp3([0.4, 3.2, 4.6], [-0.7, 1.05, 3.3], e), target: lerp3([-0.4, 6.5, -6.0], [0.12, 0.5, 0.6], e), fov: 42 };
  const s = stirring(f, camera);
  return (
    <>
      <Stage set={farm(camera, f + 116, s.paddle)} camera={camera} bg={BG} puppets={[s.puppet]} light={farmLight(f, true)} />
      <Headline f={f} text={"NO CLOUDS.\nNO STORM."} at={12} out={52} />
    </>
  );
};

// Over her shoulder at the kettle: a big piece lands on the rim right by her hand.
const RimLanding: React.FC = () => {
  const f = useShotFrame();
  const p = ease(f, 0, 60);
  const camera: CameraShot = { position: lerp3([-0.95, 1.7, -1.65], [-0.5, 1.45, -1.25], p), target: lerp3([0.5, 0.42, 1.0], [0.36, 0.52, 0.8], p), fov: 36 };
  const s = stirring(f + 60, camera, { view: "back" }, ramp(f, 42, 48));
  return (
    <Stage
      set={farm(camera, f + 176, (
        <>
          {s.paddle}
          <FallingFlake f={f} from={[0.15, 2.6, 0.2]} to={RIM_SPOT} land={42} fall={30} size={BIG} seed={5} />
        </>
      ))}
      camera={camera}
      bg={BG}
      puppets={[s.puppet]}
      light={farmLight(f, true)}
    />
  );
};

// Snap in on her face: she freezes and looks up.
const LookUp: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-0.62, 1.0, 2.6], [-0.42, 1.02, 2.05], ease(f, 0, 26)), target: [-0.22, 0.95, 0.78], fov: 36 };
  const s = stirring(f + 120, camera, { ...faceChange([[0, "neutral"], [3, "shocked"], [18, "confused"]], f), headTilt: -8 * ramp(f, 3, 12), slump: -0.6 * ramp(f, 3, 10) }, 1);
  return <Stage set={farm(camera, f + 236, <>{s.paddle}<LyingFlake at={RIM_SPOT} size={BIG} seed={5} /></>)} camera={camera} bg={BG} puppets={[s.puppet]} light={farmLight(f, true)} blur={7} />;
};

// From above, circling her: more pieces drop onto the dirt all round her.
const AroundHer: React.FC = () => {
  const f = useShotFrame();
  const a = 0.5 - 0.9 * ease(f, 0, 26);
  const camera: CameraShot = { position: [-0.1 + Math.sin(a) * 2.2, 3.2, 0.6 + Math.cos(a) * 2.2], target: [0.0, 0.2, 0.6], fov: 46 };
  const s = stirring(0, camera, { ...faceChange([[0, "confused"]], f), lookX: Math.sin(f * 0.3) * 0.8 }, 1);
  const drops: [Vec3, number][] = [
    [[-0.85, 0, 1.25], 4],
    [[0.35, 0, 1.4], 9],
    [[-0.6, 0, 0.1], 14],
    [[0.95, 0, 0.85], 19],
  ];
  return (
    <Stage
      set={farm(camera, f + 262, (
        <>
          {s.paddle}
          <LyingFlake at={RIM_SPOT} size={BIG} seed={5} />
          {drops.map(([to, land], i) => (
            <FallingFlake key={i} f={f} from={[to[0] - 0.3, 3.0, to[2] - 0.6]} to={to} land={land} fall={18} size={PIECE} seed={20 + i} />
          ))}
        </>
      ))}
      camera={camera}
      bg={BG}
      puppets={[s.puppet]}
      light={farmLight(f, true)}
    />
  );
};

// Wide and low, trucking sideways: the whole yard under an empty sky, a few pieces still coming down.
const YardWide: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-2.6, 0.5, 6.2], [-0.9, 0.65, 5.8], ease(f, 0, 26)), target: lerp3([-0.3, 1.9, -1.5], [0.4, 2.0, -1.5], ease(f, 0, 26)), fov: 50 };
  const s = stirring(0, camera, { expression: "confused", lookX: 0.4 }, 1);
  const drops: [Vec3, number][] = [
    [[1.3, 0, 2.2], 6],
    [[-1.6, 0, 1.8], 12],
    [[2.45, 0.8, 1.5], 18],
    [[0.6, 0, 3.0], 23],
  ];
  return (
    <Stage
      set={farm(camera, f + 284, (
        <>
          {s.paddle}
          <LyingFlake at={RIM_SPOT} size={BIG} seed={5} />
          {drops.map(([to, land], i) => (
            <FallingFlake key={i} f={f} from={[to[0] - 0.6, 4.5, to[2] - 1]} to={to} land={land} fall={26} size={PIECE} seed={40 + i} />
          ))}
        </>
      ))}
      camera={camera}
      bg={BG}
      puppets={[s.puppet]}
      light={farmLight(f)}
    />
  );
};

// ---------- later, two neighbours inspect a piece; one tastes it ----------

const neighbours = (elder: Partial<PuppetPose>, young: Partial<PuppetPose>): PuppetPlacement[] => [
  { id: "man1", look: ELDER, pose: { expression: "skeptical", ...elder } as PuppetPose, at: ELDER_AT },
  { id: "man2", look: YOUNG, pose: { expression: "neutral", ...young } as PuppetPose, at: YOUNG_AT },
];

// "LATER": the two men come up to the fence and the young one picks a piece off the rail.
const Later: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([0.2, 1.45, 3.9], [0.85, 1.2, 3.1], ease(f, 0, 40)), target: lerp3([1.6, 0.9, 0.3], [1.8, 0.8, 0.0], ease(f, 0, 40)), fov: 40 };
  const w1 = stroll(f, -26, 34, [1.95, 1.4], ELDER_AT);
  const w2 = stroll(f, -20, 34, [0.6, 1.6], YOUNG_AT);
  const pick = ramp(f, 18, 28);
  const reach: [number, number] = [150 + 90 * Math.sin(pick * Math.PI) + (1 - pick) * 120, -560 + pick * 60];
  const piece = handWorld(YOUNG_AT, reach, camera);
  const cast: PuppetPlacement[] = [
    { id: "man1", look: ELDER, pose: { expression: "thinking", gesture: "chin", ...w1.pose } as PuppetPose, at: w1.at },
    { id: "man2", look: YOUNG, pose: { expression: "thinking", reachR: reach, handR: "fist", frontR: true, ...w2.pose } as PuppetPose, at: w2.at },
  ];
  return (
    <>
      <Stage
        set={farm(camera, f + 310, (
          <>
            <Pieces skip={7} />
            {f < 24 ? (
              <LyingFlake at={YARD_PIECES[7].at} size={PIECE} seed={10} tilt={0.2} />
            ) : (
              <group userData={{ ghost: true }}>
                <LyingFlake at={[piece[0], piece[1] - 0.03, piece[2] + 0.05]} size={PIECE} seed={10} />
              </group>
            )}
          </>
        ))}
        camera={camera}
        bg={BG}
        puppets={cast}
        light={farmLight(f)}
      />
      <Headline f={f} text="LATER" at={0} out={32} size={110} />
    </>
  );
};

// Close, pushing in: he raises the piece to his mouth, hesitates, nibbles; his eyes go wide.
const Taste: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([0.85, 1.08, 2.4], [1.12, 1.0, 1.85], ease(f, 0, 30)), target: [1.33, 0.93, 0.5], fov: 34 };
  const up = ramp(f, 0, 8) - 0.25 * Math.max(0, Math.sin(ramp(f, 8, 13) * Math.PI)); // up, a hesitant dip, in
  const reach: [number, number] = [150 - 110 * up, -480 - 200 * up];
  const hand = handWorld(YOUNG_AT, reach, camera);
  const pose: PuppetPose = {
    ...faceChange([[0, "worried"], [10, "disgusted"], [21, "shocked"]], f),
    reachR: reach,
    handR: "fist",
    frontR: true,
    slump: 0.3 - 0.8 * ramp(f, 21, 25),
  };
  return (
    <Stage
      set={farm(camera, f + 350, <group userData={{ ghost: true }}><LyingFlake at={[hand[0], hand[1] + 0.02, hand[2] + 0.1]} size={PIECE} seed={10} /></group>)}
      camera={camera}
      bg={BG}
      puppets={[{ id: "man2", look: YOUNG, pose, at: YOUNG_AT }]}
      light={farmLight(f)}
    />
  );
};

// Two-shot, arcing round them: the young one stunned, holding the piece out; the elder leans back, disgusted.
const Verdict: React.FC = () => {
  const f = useShotFrame();
  const a = -0.35 + 0.5 * ease(f, 0, 28);
  const camera: CameraShot = { position: [1.65 + Math.sin(a) * 3.0, 1.2, 0.15 + Math.cos(a) * 3.0], target: [1.68, 0.85, 0.15], fov: 38 };
  const reach: [number, number] = [260, -560];
  const hand = handWorld(YOUNG_AT, reach, camera);
  return (
    <Stage
      set={farm(camera, f + 376, (
        <>
          <Pieces skip={7} />
          <group userData={{ ghost: true }}>
            <LyingFlake at={[hand[0], hand[1] - 0.03, hand[2] + 0.08]} size={PIECE} seed={10} />
          </group>
        </>
      ))}
      camera={camera}
      bg={BG}
      puppets={neighbours(
        { ...faceChange([[0, "skeptical"], [6, "disgusted"]], f), lean: -6 * ramp(f, 6, 12) },
        { ...faceChange([[0, "shocked"], [16, "awkward"]], f), reachR: reach, handR: "fist", frontR: true, gesture: f > 16 ? "shrug" : undefined },
      )}
      light={farmLight(f)}
    />
  );
};

// ---------- "How did it get up there?" — up into the sky, one theory ----------

// Low behind the two men; the camera rises and tilts up off them into the sky.
const TiltUp: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 2, 30);
  const camera: CameraShot = { position: lerp3([0.9, 0.55, 2.6], [0.6, 1.1, 2.9], e), target: lerp3([1.7, 1.0, 0.0], [-0.5, 9.5, -12.0], e), fov: 46 };
  return (
    <Stage
      set={farm(camera, f + 404, <Pieces skip={7} />)}
      camera={camera}
      bg={BG}
      puppets={neighbours({ expression: "thinking", headTilt: 6 }, { expression: "confused", headTilt: -6, gesture: "scratchHead" })}
      light={farmLight(f)}
    />
  );
};

const THERMAL: Vec3 = [-2.5, 10, -12];

// Up: vultures circling on a thermal, banking and teetering as they turn. Only a theory.
const Thermal: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([1.2, 1.0, 3.2], [-0.4, 1.7, 2.2], ease(f, 0, 51)), target: lerp3([1.5, 8.0, -9], [-3.2, 10.5, -12], ease(f, 0, 51)), fov: lerp3([54, 0, 0], [42, 0, 0], ease(f, 0, 51))[0] };
  return (
    <>
      <Stage set={farm(camera, f + 431, <Vultures frame={f + 431} centre={THERMAL} radius={5} size={2.0} fade={ramp(f, 0, 8)} />)} camera={camera} bg={BG} energy={0.6} />
      <Headline f={f} text={"ONE THEORY:\nVULTURES."} at={12} />
    </>
  );
};

// Closer, tracking one bird as it sweeps past, the label staying up.
const ThermalClose: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-0.4, 1.7, 2.2], [0.6, 1.4, 1.6], ease(f, 0, 52)), target: lerp3([0.8, 9.6, -11], [-6.5, 10.8, -13], ease(f, 0, 52)), fov: lerp3([36, 0, 0], [24, 0, 0], ease(f, 0, 52))[0] };
  return (
    <>
      <Stage set={farm(camera, f + 482, <Vultures frame={f + 482} centre={THERMAL} radius={5} size={2.0} />)} camera={camera} bg={BG} energy={0.5} />
      <Headline f={f} text={"ONE THEORY:\nVULTURES."} at={-51} out={44} />
    </>
  );
};

// "The reports never mention any birds": the camera pulls back and the birds rise away and vanish.
const Gone: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([0.6, 1.4, 1.6], [1.2, 1.1, 3.6], ease(f, 0, 51)), target: lerp3([-5.5, 10.5, -13], [-1.0, 7.5, -12], ease(f, 0, 51)), fov: lerp3([30, 0, 0], [44, 0, 0], ease(f, 0, 51))[0] };
  return <Stage set={farm(camera, f + 534, <Vultures frame={f + 534} centre={THERMAL} radius={5} size={2.0} fade={1 - ramp(f, 4, 32)} />)} camera={camera} bg={BG} energy={0.5} />;
};

// What she saw: low under her, circling, looking up past her into a sky with nothing in it.
const Witness: React.FC = () => {
  const f = useShotFrame();
  const a = -0.45 + 0.7 * ease(f, 0, 49);
  const camera: CameraShot = { position: [-0.22 + Math.sin(a) * 1.5, 0.3, 0.78 + Math.cos(a) * 1.5], target: lerp3([-0.15, 1.3, -0.4], [-0.1, 1.7, -0.9], ease(f, 0, 49)), fov: 46 };
  const s = stirring(0, camera, { ...faceChange([[0, "confused"], [26, "thinking"]], f), headTilt: -6 }, 1);
  return <Stage set={farm(camera, f + 585, <>{s.paddle}<LyingFlake at={RIM_SPOT} size={BIG} seed={5} /></>)} camera={camera} bg={BG} puppets={[s.puppet]} light={farmLight(f, true)} />;
};

// ---------- back down to the quiet yard ----------

// Craning back down from the sky onto the empty yard: the kettle steaming, pieces lying where they fell.
const CraneDown: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 56);
  const camera: CameraShot = { position: lerp3([1.4, 4.6, 7.0], [1.8, 1.5, 4.8], e), target: lerp3([-0.5, 7.0, -8], [0.2, 0.5, 0.2], e), fov: 44 };
  return <Stage set={farm(camera, f + 634, <Pieces />)} camera={camera} bg={BG} />;
};

// Macro, sliding along the fence onto a piece stuck to a rail.
const FenceMacro: React.FC = () => {
  const f = useShotFrame();
  const piece = YARD_PIECES[7].at;
  const e = ease(f, 0, 58);
  const camera: CameraShot = {
    position: lerp3([piece[0] - 0.75, piece[1] + 0.4, piece[2] + 0.95], [piece[0] - 0.45, piece[1] + 0.28, piece[2] + 0.38], e),
    target: lerp3([piece[0], piece[1], piece[2] + 0.3], piece, e),
    fov: 30,
  };
  return <Stage set={farm(camera, f + 690, <Pieces />)} camera={camera} bg={BG} blur={6} />;
};

// The quiet yard, rising and pulling back; the question.
const Final: React.FC = () => {
  const f = useShotFrame();
  const e = ease(f, 0, 92);
  const camera: CameraShot = { position: lerp3([0.4, 1.2, 4.0], [-1.4, 2.4, 6.8], e), target: lerp3([0.3, 1.0, -0.6], [0.2, 1.9, -1.6], e), fov: 46 };
  return (
    <>
      <Stage set={farm(camera, f + 748, <Pieces />)} camera={camera} bg={BG} />
      <Headline f={f} text={"WHAT REALLY\nHAPPENED?"} at={26} />
    </>
  );
};

const SHOTS: Shot[] = [
  [0, 26, SkyRain, false],
  [26, 56, Shocked, false],
  [56, 84, KettleSplash, false],
  [84, 116, GrassImpact, false],
  [116, 176, ClearSky, false],
  [176, 236, RimLanding, false],
  [236, 262, LookUp, false],
  [262, 284, AroundHer, false],
  [284, 310, YardWide, false],
  [310, 350, Later, true],
  [350, 376, Taste, false],
  [376, 404, Verdict, false],
  [404, 431, TiltUp, false],
  [431, 482, Thermal, false],
  [482, 534, ThermalClose, false],
  [534, 585, Gone, false],
  [585, 634, Witness, false],
  [634, 690, CraneDown, false],
  [690, 748, FenceMacro, false],
  [748, TIMING.totalFrames, Final, false],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.32, until: TIMING.totalFrames },
  { at: 3, src: sfx("pop"), volume: 0.35 },
  { at: 6, src: sfx("whoosh"), volume: 0.3 },
  { at: 22, src: sfx("plop"), volume: 0.3 },
  { at: 30, src: sfx("whoosh"), volume: 0.25 },
  { at: 44, src: sfx("plop"), volume: 0.35 },
  { at: 52, src: sfx("plop"), volume: 0.3 },
  { at: 68, src: sfx("plop"), volume: 0.6 },
  { at: 68, src: sfx("paper"), volume: 0.2 },
  { at: 92, src: sfx("whoosh"), volume: 0.2 },
  { at: 103, src: sfx("plop"), volume: 0.75 },
  { at: 103, src: sfx("stamp"), volume: 0.35 },
  { at: 116, src: sfx("whoosh"), volume: 0.2 },
  { at: 116, src: sfx("crackle"), volume: 0.22, until: 310 },
  { at: 128, src: sfx("pop"), volume: 0.3 },
  { at: 218, src: sfx("plop"), volume: 0.7 },
  { at: 218, src: sfx("tick"), volume: 0.25 },
  { at: 266, src: sfx("plop"), volume: 0.35 },
  { at: 271, src: sfx("plop"), volume: 0.3 },
  { at: 276, src: sfx("plop"), volume: 0.35 },
  { at: 281, src: sfx("plop"), volume: 0.3 },
  { at: 290, src: sfx("plop"), volume: 0.2 },
  { at: 302, src: sfx("whoosh"), volume: 0.35 },
  { at: 310, src: sfx("pop"), volume: 0.3 },
  { at: 330, src: sfx("paper"), volume: 0.15 },
  { at: 359, src: sfx("chew"), volume: 0.55 },
  { at: 371, src: sfx("pop"), volume: 0.2 },
  { at: 404, src: sfx("whoosh"), volume: 0.25 },
  { at: 443, src: sfx("pop"), volume: 0.3 },
  { at: 585, src: sfx("crackle"), volume: 0.16, until: 634 },
  { at: 634, src: sfx("whoosh"), volume: 0.2 },
  { at: 634, src: sfx("crackle"), volume: 0.1, until: TIMING.totalFrames },
  { at: 774, src: sfx("pop"), volume: 0.3 },
];

// The hook gets a dark sting of music; Mrs. Crouch at work has wind and soft thuds only; a pulsing bed drives the
// rest and stops right after the final question.
const MUSIC: MusicCue[] = [
  { src: "music/mystery.wav", from: 0, to: 104, volume: 0.28 },
  { src: "music/tension.wav", from: 258, to: 790, volume: 0.3 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
