import React from "react";
import {
  beatPath,
  CameraShot,
  ease,
  easeIn,
  easeOut,
  faceChange,
  foleyCues,
  frameSpot,
  Headline,
  jump,
  mix,
  MUSIC_FILES,
  MusicCue,
  pup,
  PuppetLook,
  PuppetPose,
  rand,
  settle,
  Sfx,
  sfx,
  Shot,
  smooth,
  Stage,
  stroll,
  Timing,
  UNITS,
  useShotFrame,
  Video,
} from "../../engine";
import TIMING_JSON from "./timing.json";
import { MOON_BG, MoonDust, MoonMode, MoonRock, MoonSet, moonLight } from "./MoonSet";
import { CoffeeMug, HoustonSet, houstonLight, MUG } from "./HoustonSet";
import { MunichSet, munichLight } from "./MunichSet";
import { TruthLabSet, labLight } from "./TruthLabSet";
import { PackShopSet, shopLight } from "./PackShopSet";

// "What If Your Moon Jump Went Too High?" Apollo 16, April 1972: at the end of the last moonwalk Charlie Duke makes
// a big push off the Moon, gets about four feet up, the weight of his backpack pulls him over backward and he lands
// on it, the fiberglass shell that holds his air. The Moon cuts your weight to about a sixth, not your mass.
// Story set in 1972; every moon shot is MoonSet re-lit by mode.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-moon-jump";
export const timing = TIMING;

const ASPECT = 9 / 16;

// ---------- cast (1972) ----------
// The 1972 A7LB moon suit: white suit, white lunar overshoes, white gloves, bubble helmet under the white visor shell
// with the gold visor raised, the white backpack (look.space). The commander, Young, has red bands; Duke none.
const SUIT = { outfit: "#f1eee7", pants: "#f1eee7", shoes: "#e6e2da", sleeves: "#f1eee7", gloves: "#ece8e0", bulk: 3.2 };
const DUKE: PuppetLook = { skin: "#f0c8a8", hair: "#3a2a1e", ...SUIT, space: {} };
const YOUNG: PuppetLook = { skin: "#e6b896", hair: "#6a4a30", ...SUIT, space: { stripe: "#c8302c" } };
// Houston 1972: short-sleeved shirts, dark slacks, dark leather shoes.
const ENGLAND: PuppetLook = { skin: "#eac4a0", hair: "#5a3e28", outfit: "#f4f2ec", pants: "#2e2e36", shoes: "#2a2220", tie: "#1e2a44", headset: "#3a3a40" };
const CONTROLLER: PuppetLook = { skin: "#f2d0b0", hair: "#b88a4a", outfit: "#a8c4e0", pants: "#4a4a52", shoes: "#2a2220", glasses: true, tie: "#a8582a", tieWide: true, headset: "#3a3a40" };
// Munich 1972: red athletics vest, short shorts, white spikes.
const JUMPER: PuppetLook = { skin: "#c89878", hair: "#1a1410", outfit: "#c8302c", shorts: "#f4f2ec", shoes: "#f4f2ec" };
// The viewer in the dream: the same suit with orange bands.
const YOU: PuppetLook = { skin: "#c48a64", hair: "#1a1410", ...SUIT, space: { stripe: "#f08a2a" } };

// ---------- Duke's jump: one arc on the video clock, shared by the hook, the jump and the fall ----------
// He pushes off at LAUNCH, rises about four feet (0.88 m at the puppet's scale) by APEX, hangs, starts tipping back
// as he straightens up, keeps going, and slams onto the backpack at IMPACT ("right onto the backpack").
const LAUNCH = 588;
const APEX = 626;
const FALL0 = 700;
const IMPACT = 826;
const H_MAX = 0.88;

const arcH = (vf: number) => {
  if (vf < LAUNCH) return 0;
  if (vf < APEX) return H_MAX * easeOut((vf - LAUNCH) / (APEX - LAUNCH));
  if (vf < FALL0) return H_MAX + 0.05 * Math.sin((Math.PI * (vf - APEX)) / (FALL0 - APEX));
  if (vf < IMPACT) return H_MAX * (1 - easeIn((vf - FALL0) / (IMPACT - FALL0)));
  return 0;
};
const arcLie = (vf: number) => {
  if (vf < 664) return 0;
  if (vf < IMPACT - 14) return 0.6 * Math.pow((vf - 664) / (IMPACT - 14 - 664), 1.5);
  if (vf < IMPACT) return 0.6 + 0.4 * easeIn((vf - IMPACT + 14) / 14);
  return 1 - 0.05 * Math.max(0, settle(vf - IMPACT, 2.6, 0.4));
};

// Duke's body along the arc (side view facing +1 falls to screen-left; front view leans back).
const dukeArc = (vf: number): Partial<PuppetPose> => {
  const dip = ease(vf, LAUNCH - 14, LAUNCH - 2) * (1 - ease(vf, LAUNCH - 2, LAUNCH + 3));
  const up = ease(vf, LAUNCH - 2, LAUNCH + 8);
  const flail = vf > 724 && vf < IMPACT ? ease(vf, 724, 740) : 0;
  const w = vf * 0.42 + Math.sin(vf * 0.11) * 1.2;
  const after = vf >= IMPACT ? vf - IMPACT : -1;
  const arms: Partial<PuppetPose> =
    after >= 0
      ? { armL: [30 + 40 * Math.max(0, settle(after - 3, 2.2, 0.35)), 8], armR: [40 + 40 * Math.max(0, settle(after - 5, 2.0, 0.35)), 12] }
      : flail > 0
        ? { armL: [mix(140, 150 + 30 * Math.sin(w), flail), 20 + 25 * Math.sin(w * 1.3)], armR: [mix(140, -70 + 45 * Math.sin(w + 2.6), flail), 30 + 25 * Math.cos(w * 1.1)], handL: "open", handR: "open" }
        : { armL: [mix(mix(12, 8, dip), 150, up), mix(10, 30, dip)], armR: [mix(mix(12, 8, dip), 140, up), mix(10, 26, dip)], handL: "open", handR: "open" };
  const kick = after >= 0 ? Math.max(0, 1 - after / 70) : 0;
  return {
    crouch: 0.7 * dip + (vf > LAUNCH && vf < APEX ? 0.25 * Math.sin((Math.PI * (vf - LAUNCH)) / (APEX - LAUNCH)) : 0),
    squash: -0.12 * up * (1 - ease(vf, LAUNCH + 8, LAUNCH + 24)) + 0.08 * dip,
    ...arms,
    // boots up in the air after the landing, kicking, settling
    legSwing: after >= 0 ? 34 * kick + 12 * Math.sin(after * 0.45) * kick : vf > 760 ? 10 * Math.sin(vf * 0.3) : 0,
    ...faceChange(
      [
        [0, "determined"],
        [LAUNCH, "excited"],
        [668, "worried"],
        [702, "shocked"],
      ],
      vf,
    ),
  };
};

// In profile the near arm (drawn over the body) swings back and low and the far arm reaches up, so neither crosses
// the visor; after the landing they flop as dukeArc has them.
const profileArms = (vf: number): Partial<PuppetPose> =>
  vf >= IMPACT ? {} : { armR: [-55 + 35 * Math.sin(vf * 0.37), 25 + 15 * Math.sin(vf * 0.29)], armL: [-30 + 22 * Math.sin(vf * 0.41 + 1), 18], handL: "open", handR: "open" };

// A body in the air that also tips: `rise` lifts the whole card in the world (Puppet tips `air` with the body).
const airborne = (at: [number, number], H: number, lie: number, _camera?: CameraShot): { at: [number, number]; rise: number; lie: number } => ({ at, rise: H, lie });

// The middle of Duke's body along the arc, in world metres (x along screen-right for a camera looking down -z).
const bodyMid = (vf: number): [number, number] => {
  const phi = (arcLie(vf) * Math.PI) / 2;
  return [-0.5 * Math.sin(phi), arcH(vf) + 0.5 * Math.cos(phi) + 0.2 * arcLie(vf)];
};

// ---------- shared shot pieces ----------
const rockFg = (cam: CameraShot, x: number, y: number, dist: number, size = 0.18, seed = 3) => <MoonRock position={frameSpot(cam, ASPECT, x, y, dist)} size={size} color="#8a867e" seed={seed} />;

const moonStage = (mode: MoonMode, camera: CameraShot, f: number, vf: number, puppets: ReturnType<typeof pup>[], extra?: React.ReactNode, opts: { lm?: boolean; rover?: boolean; flag?: boolean; fg?: React.ReactNode; blur?: number; energy?: number } = {}) => (
  <Stage
    set={
      <MoonSet camera={camera} frame={vf} mode={mode} lm={opts.lm} rover={opts.rover} flag={opts.flag}>
        {extra}
      </MoonSet>
    }
    camera={camera}
    bg={MOON_BG[mode]}
    blur={opts.blur ?? 2.4}
    energy={opts.energy}
    light={moonLight(mode)}
    puppets={puppets}
    foreground={opts.fg}
  />
);

// ---------- the hook: 3 beats on the words of line 0, hard cuts ----------
// line 0 (0-119): "On the Moon, a jump of just four feet nearly killed a man, and his own backpack did it."
const OPEN_CAM: CameraShot = { position: [0.55, 0.5, 4.4], target: [-0.2, 1.5, -0.6], fov: 42 }; // frame 0, and the loop's rest
const HEADLINE = "WHAT IF YOU JUMP TOO HIGH?";
// Young by the flag, a hand over his visor as Duke goes up: the end of the last shot and frame 0 (the loop).
// He stands on the lander's porch at the top of the ladder (LM at [-2.1, 0, -5.2], turned 0.45: the porch 2.2 m up).
const YOUNG_LOOP_AT: [number, number] = [-1.34, -3.6];
const YOUNG_LOOP_POSE: Partial<PuppetPose> = { view: "front", expression: "worried", gesture: "facepalm", rise: 2.24 };
// The hook's arc frames: frame 0 is the jump rising past the flag (arc frame 630).
const H1_ARC = 640;

const H1: React.FC = () => {
  const f = useShotFrame(); // 0..29, "On the Moon, a jump"
  const camera = beatPath([{ at: 0, ...OPEN_CAM }, { at: 29, position: [0.45, 0.56, 3.9], target: [-0.22, 1.6, -0.6], fov: 42 }], f);
  const vf = H1_ARC + f * 0.9;
  const a = airborne([0, 0], arcH(vf), 0.06 * ease(f, 0, 29), camera);
  return (
    <>
      {moonStage(
        "golden",
        camera,
        f,
        f,
        [
          pup("duke", DUKE, a.at, { view: "front", ...dukeArc(vf), expression: "excited", rise: a.rise, lie: a.lie, lookX: 0.2 }),
          pup("young", YOUNG, YOUNG_LOOP_AT, YOUNG_LOOP_POSE),
        ],
        <MoonDust at={[0, 0, 0]} frame={f + (H1_ARC - LAUNCH)} seed={3} slow={1.4} />,
        { fg: rockFg(OPEN_CAM, -0.85, -0.85, 1.3, 0.16), energy: 0 }, // no automatic push: frame 0 and the last frame are the same picture (the loop)
      )}
      <Headline f={f} text={HEADLINE} at={3} out={95} size={70} y={150} />
    </>
  );
};

const H2: React.FC = () => {
  const f = useShotFrame(); // 0..39, "of just four feet nearly killed"
  const vf = 700 + f * 1.4;
  const camera = beatPath([{ at: 0, position: [-0.35, 1.95, 3.3], target: [-0.05, 1.7, 0], fov: 40 }, { at: 39, position: [-0.3, 1.9, 2.9], target: [-0.05, 1.68, 0], fov: 40 }], f);
  const a = airborne([0, 0], arcH(vf), 0.08 + 0.1 * ease(f, 0, 39), camera);
  return (
    <>
      {moonStage("golden", camera, f + 30, f + 30, [pup("duke", DUKE, a.at, { view: "front", ...dukeArc(vf), expression: "shocked", rise: a.rise, lie: a.lie, lookX: -0.3, headTilt: -8 })], null, { blur: 3 })}
      <Headline f={f} text={HEADLINE} at={-30} out={30} size={70} y={150} />
    </>
  );
};

const H3: React.FC = () => {
  const f = useShotFrame(); // 0..33, "a man, and his own backpack did it" — the slam on "own backpack" (f 21)
  const vf = IMPACT - 21 + f;
  const m0 = bodyMid(vf);
  const camera: CameraShot = { position: [m0[0] + 0.35 - f * 0.004, 0.75, 3.7 - f * 0.012], target: [m0[0], Math.max(0.42, m0[1]), 0], fov: 42 };
  const a = airborne([0, 0], arcH(vf), arcLie(vf), camera);
  return (
    <>
      {moonStage(
        "golden",
        camera,
        f + 70,
        f + 70,
        [pup("duke", DUKE, a.at, { view: "side", facing: 1, ...dukeArc(vf), ...profileArms(vf), rise: a.rise, lie: a.lie })],
        <MoonDust at={[-0.5, 0.05, 0]} frame={f - 21} count={90} speed={1.6} up={0.9} seed={7} />,
        { flag: false },
      )}
          </>
  );
};

// ---------- 1 · frames 104-273 · lm-site (golden) ----------
// line 0 tail + line 1: "April nineteen seventy-two. Apollo sixteen's Charlie Duke (198) and John Young (213) finish
// their last moonwalk (245-271)." Wide on the landing site: the lander, the flag, the rover; a crane down onto the two
// of them loping back toward the flag.
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..168
  const vf = f + 104;
  const camera = beatPath(
    [
      { at: 0, position: [0.5, 2.6, 7.2], target: [-0.8, 1.2, -2.6], fov: 42 },
      { at: 94, position: [0.4, 1.9, 5.6], target: [-0.6, 1.0, -0.6], fov: 40 }, // "Charlie Duke"
      { at: 168, position: [0.75, 1.45, 4.6], target: [0.05, 0.95, -0.3], fov: 40 },
    ],
    f,
  );
  const d = stroll(f, 6, 120, [-1.6, -1.6], [-0.35, -0.2]);
  const y = stroll(f, 0, 130, [1.5, -0.9], [0.6, -0.05]);
  const lope = (g: number, ph: number) => Math.max(0, Math.sin(g * 0.16 + ph)) * 60;
  return moonStage(
    "pale",
    camera,
    f,
    vf,
    [
      pup("duke", DUKE, d.at, { ...d.pose, bob: -lope(f, 0), ...faceChange([[0, "happy"], [94, "excited"]], f), ...(f > 128 ? { view: "front" } : {}) }),
      pup("young", YOUNG, y.at, { ...y.pose, bob: -lope(f, 1.7), ...faceChange([[0, "neutral"], [109, "happy"]], f), ...(f > 134 ? { view: "front", gesture: f > 140 ? "wave" : undefined } : {}) }),
    ],
    null,
    { fg: rockFg({ position: [0.75, 1.45, 4.6], target: [0.05, 0.95, -0.3], fov: 40 }, 0.88, -0.86, 1.4, 0.2, 11) },
  );
};

// ---------- 2 · frames 273-356 · munich ----------
// line 2: "Munich's Olympics are coming, so they invent the Moon Olympics." A 1972 high jumper flops backward over
// the bar under the stadium's tent roof (the backward flop rhymes with Duke's fall).
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..82
  const camera = beatPath([{ at: 0, position: [2.0, 1.35, 5.4], target: [0.5, 1.25, 0], fov: 42 }, { at: 82, position: [0.5, 1.35, 4.7], target: [-0.1, 1.2, 0], fov: 42 }], f);
  const run = stroll(f, 0, 30, [1.45, 0.5], [0.55, 0.15]);
  const t = f - 30; // take-off
  const p = Math.max(0, Math.min(1, t / 26));
  const flying = t >= 0 && t < 26;
  const H = flying ? 1.25 * Math.sin(Math.PI * p) : 0;
  const lie = t < 0 ? 0 : Math.min(1, smooth(p) * 1.1);
  const spot: [number, number] = t < 0 ? run.at : [mix(0.55, 0.3, smooth(p)), mix(0.15, -0.95, smooth(p))];
  const a = airborne(spot, t >= 0 ? (t >= 26 ? 0.64 + 0.03 * settle(t - 26, 2.4, 0.4) : H + 0.64 * p) : 0, lie, camera);
  return (
    <Stage
      set={<MunichSet camera={camera} frame={f + 273} />}
      camera={camera}
      bg="#c86a3a"
      blur={2.6}
      light={munichLight(f + 273)}
      puppets={[
        pup("jumper", JUMPER, t < 0 ? run.at : a.at, t < 0 ? { ...run.pose, expression: "determined" } : { view: "side", facing: 1, expression: t < 20 ? "determined" : "happy", rise: a.rise, lie: a.lie, armL: [30, 10], armR: [-20, 10], legSwing: flying ? -20 : 10 }),
      ]}
    />
  );
};

// ---------- 3 · frames 356-548 · earthshine ----------
// line 3 (357-447) young: "Watch this, Charlie. I can jump flat-footed, straight up!"; line 4 (450-546): "Up here, you
// weigh one sixth as much. Young bounces like a kid." Earth huge behind; Young hops three times, each one different:
// a tight show-off hop, a big spread-eagle bounce, a little twisting hop; his last dust sprays Duke's visor.
const YOUNG_HOPS: [number, number, number][] = [
  // shot frame, height (units), length
  [60, 280, 44],
  [114, 460, 56],
  [160, 220, 36],
];
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..191
  const camera = beatPath(
    [
      { at: 0, position: [0.9, 0.55, 4.4], target: [0.5, 1.55, -1.2], fov: 42 },
      { at: 116, position: [0.75, 0.6, 3.9], target: [0.45, 1.45, -1.0], fov: 42 }, // "one sixth"
      { at: 191, position: [0.55, 0.7, 3.4], target: [0.35, 1.25, -0.6], fov: 42 },
    ],
    f,
  );
  let hop: Partial<PuppetPose> = {};
  for (const [s, h, l] of YOUNG_HOPS) {
    const j = jump(f, s, h, l);
    if (Object.keys(j).length) hop = j;
  }
  const landF = YOUNG_HOPS.map(([s, , l]) => s + Math.round(l * (24 / 34)));
  const wipe = ease(f, 168, 174) * (1 - ease(f, 184, 190));
  return moonStage(
    "earth",
    camera,
    f,
    f + 356,
    [
      pup("young", YOUNG, [0.3, -0.4], {
        view: "front",
        ...faceChange([[0, "smug"], [40, "excited"], [150, "happy"]], f),
        ...(f < 56 ? { gesture: f > 10 && f < 40 ? "point" : undefined } : {}),
        ...hop,
        ...(f > 160 && f < 190 ? { headTilt: Math.sin(f * 0.5) * 8 } : {}),
      }),
      pup("duke", DUKE, [-0.45, 0.35], {
        view: "front",
        ...faceChange([[0, "skeptical"], [118, "confused"], [172, "awkward"]], f),
        lookX: 0.6,
        ...(wipe > 0 ? { reachR: [mix(150, 120 - 200 * ease(f, 174, 184), wipe), mix(-560, -790, wipe)], frontR: true, handR: "open" } : {}),
      }),
    ],
    <>
      {landF.map((lf, i) => (
        <MoonDust key={i} at={[0.3, 0.02, -0.4]} frame={f - lf} count={40 + i * 20} speed={0.9 + i * 0.4} up={0.8} seed={11 + i * 5} dir={i === 2 ? [-1.2, 0.5] : [0, 0]} />
      ))}
    </>,
    { lm: true, fg: rockFg({ position: [0.9, 0.55, 4.4], target: [0.5, 1.55, -1.2], fov: 42 }, -0.92, -0.96, 1.2, 0.09, 21) },
  );
};

// ---------- 4 · frames 548-655 · jump (golden, low angle) ----------
// line 5: "Duke wants to beat him (549-570). He makes a big push (591) and flies about four feet high (616-650)."
// A crane up with him from a low angle; Young watching behind.
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..106
  const vf = f + 548;
  const camera = beatPath(
    [
      { at: 0, position: [0.7, 0.75, 3.6], target: [0.0, 0.9, 0], fov: 42 },
      { at: 49, position: [0.6, 0.6, 3.3], target: [0.0, 0.95, 0], fov: 42 }, // "big push"
      { at: 106, position: [0.5, 0.55, 3.2], target: [0.0, 1.75, -0.2], fov: 44 },
    ],
    f,
  );
  const a = airborne([0, 0], arcH(vf), 0, camera);
  return moonStage(
    "golden",
    camera,
    f,
    vf,
    [
      pup("duke", DUKE, a.at, { view: "front", ...dukeArc(vf), rise: a.rise, ...(vf < LAUNCH - 16 ? { gesture: "point", lookX: 0.5 } : {}) }),
      pup("young", YOUNG, [1.25, -1.1], { view: "front", ...faceChange([[0, "smug"], [55, "shocked"], [80, "excited"]], f), ...(f > 60 ? { gesture: "cheer" } : {}) }),
    ],
    <MoonDust at={[0, 0.02, 0]} frame={vf - LAUNCH} count={80} speed={1.2} up={0.7} seed={5} />,
    { fg: rockFg({ position: [0.7, 0.75, 3.6], target: [0, 0.9, 0], fov: 42 }, -0.86, -0.9, 1.1, 0.16, 31) },
  );
};

// ---------- 5 · frames 655-863 · shadow-side ----------
// line 6: "But as he straightens up (664-676), his backpack pulls him over backward (686-730)." line 7 duke: "Whoa,
// whoa, I can't correct it!" line 8 first sentence: "He falls four feet, right onto the backpack (841)." Profile, in
// the lander's cold shadow; the camera tilts down with him and lands low as he hits.
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..207
  const vf = f + 655;
  const m = bodyMid(vf);
  const push = ease(f, 0, 207);
  const camera: CameraShot = { position: [m[0] * 0.8 + 0.1, mix(1.5, 0.85, ease(f, 120, 200)), mix(4.2, 3.6, push)], target: [m[0], Math.max(0.45, m[1]), 0], fov: 42 };
  const a = airborne([0, 0], arcH(vf), arcLie(vf), camera);
  return moonStage(
    "shadow",
    camera,
    f,
    vf,
    [pup("duke", DUKE, a.at, { view: "side", facing: 1, ...dukeArc(vf), ...profileArms(vf), rise: a.rise, lie: a.lie })],
    <>
      <MoonDust at={[a.at[0] - 0.55, 0.05, 0]} frame={vf - IMPACT} count={110} speed={1.7} up={0.9} spread={1.3} seed={9} />
      <MoonDust at={[a.at[0] - 0.2, 0.05, 0]} frame={vf - IMPACT - 2} count={40} speed={0.8} up={1.1} seed={19} />
    </>,
    { flag: false, rover: false, fg: rockFg({ position: [0.1, 1.5, 4.2], target: [0, 1.4, 0], fov: 42 }, 0.86, -0.9, 1.2, 0.16, 41) },
  );
};

// ---------- 6 · frames 863-931 · houston ----------
// line 8 tail: "And that backpack is his air (873-915)." The flight controllers watch the fall on the big TV; the
// controller flinches and his coffee mug tips over.
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..67
  const camera = beatPath([{ at: 0, position: [0.25, 1.25, 3.7], target: [0.05, 0.95, 0.4], fov: 40 }, { at: 67, position: [0.05, 1.15, 3.05], target: [0.0, 0.92, 0.5], fov: 40 }], f);
  const flinch = ease(f, 4, 10) * (1 - ease(f, 40, 56));
  return (
    <Stage
      set={
        <HoustonSet camera={camera} frame={f + 863} tv={1}>
          <CoffeeMug position={MUG} tip={ease(f, 12, 30)} frame={f + 863} color="#f4f0e8" />
        </HoustonSet>
      }
      camera={camera}
      bg="#10201c"
      blur={2.4}
      light={houstonLight(f + 863)}
      puppets={[
        pup("england", ENGLAND, [-0.45, 0.9], { sit: true, view: "front", ...faceChange([[0, "shocked"], [36, "worried"]], f), lookX: -0.2, ...(f > 20 ? { reachL: [-215, -790], frontL: true, handL: "open" } : {}) }),
        pup("controller", CONTROLLER, [0.45, 0.9], { sit: true, view: "front", ...faceChange([[0, "shocked"], [44, "worried"]], f), lean: -10 * flinch, armR: [mix(12, 120, flinch), mix(10, -30, flinch)], armL: [mix(12, 110, flinch), mix(10, -25, flinch)], handL: "open", handR: "open", lookX: 0.5 * flinch }),
      ]}
    />
  );
};

// ---------- 7 · frames 931-1116 · truth-lab ----------
// line 9 "You see, the Moon cuts your weight (956-980), but not your mass (995)." line 10 "Duke said the pack weighed as
// much as he did. Once it tips (1073-1085), it keeps going (1093-1112)." The scale's needle drops to 1/6; the pack on
// its post tips and keeps going.
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..184
  const camera = beatPath(
    [
      { at: 0, position: [-0.1, 1.22, 3.85], target: [-0.08, 0.86, 0], fov: 40 },
      { at: 64, position: [0.0, 1.16, 3.55], target: [0.0, 0.84, 0], fov: 40 }, // "mass"
      { at: 184, position: [0.08, 1.1, 3.35], target: [0.06, 0.8, 0], fov: 40 },
    ],
    f,
  );
  return (
    <Stage
      set={<TruthLabSet camera={camera} frame={f + 931} needle={ease(f, 22, 48)} tip={Math.min(1, Math.max(0, (f - 140) / 36))} />}
      camera={camera}
      bg="#0e1a2e"
      blur={2.2}
      light={labLight(f + 931)}
    />
  );
};

// ---------- 8 · frames 1116-1201 · pack-shop ----------
// line 11: "And it's a fiberglass shell (1125-1150). Crack it (1153), and your air rushes out (1175-1198)."
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..84
  const camera = beatPath([{ at: 0, position: [0.12, 1.15, 2.6], target: [-0.04, 0.95, 0], fov: 38 }, { at: 84, position: [0.0, 1.05, 2.25], target: [-0.04, 0.95, 0], fov: 38 }], f);
  return (
    <Stage
      set={<PackShopSet camera={camera} frame={f + 1116} crack={ease(f, 37, 47)} leak={ease(f, 56, 70)} />}
      camera={camera}
      bg="#2a1a14"
      blur={2.2}
      light={shopLight(f + 1116, ease(f, 56, 70))}
    />
  );
};

// ---------- 9 · frames 1201-1418 · help-up (neutral) ----------
// line 12 young: "Charlie! That ain't very smart." line 13: "Young helps him up (1258-1285). Duke freezes, listening
// for a hiss (1330), a leak (1344), anything (1359)." line 14: "Nothing (1373). The pack held (1391-1410)."
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..216
  // Duke lies with his feet at DUKE_AT, head toward screen-left; Young stands behind his shoulders. On "helps him up"
  // their hands meet at one world point that rises as Duke gets up.
  const DUKE_AT: [number, number] = [0.7, 0.15];
  const YOUNG_AT: [number, number] = [0.15, 0.38];
  const camera = beatPath(
    [
      { at: 0, position: [0.25, 1.55, 4.3], target: [0.15, 0.6, 0], fov: 40 },
      { at: 64, position: [0.3, 1.35, 3.9], target: [0.25, 0.8, 0], fov: 40 }, // "helps him up"
      { at: 216, position: [0.35, 1.2, 3.3], target: [0.35, 1.0, 0], fov: 40 },
    ],
    f,
  );
  const reach = ease(f, 50, 60);
  const up = ease(f, 60, 92);
  const grip = reach * (1 - ease(f, 96, 104));
  const hand: [number, number, number] = [mix(0.15, 0.5, up), mix(0.42, 0.85, up), 0.25];
  const aside = stroll(f, 94, 24, YOUNG_AT, [-0.55, 0.3]);
  const listen = ease(f, 100, 110) * (1 - ease(f, 170, 180));
  return moonStage(
    "neutral",
    camera,
    f,
    f + 1201,
    [
      pup("duke", DUKE, DUKE_AT, {
        view: up < 0.5 ? "side" : "front",
        facing: 1,
        lie: 1 - up,
        crouch: Math.sin(up * Math.PI) * 0.35,
        legSwing: up < 0.05 ? 8 * Math.sin(f * 0.22) + 6 : 0,
        ...faceChange([[0, "awkward"], [90, "worried"], [175, "happy"]], f),
        ...(grip > 0.02 ? { worldR: hand, handR: "fist" } : f < 50 ? { armR: [mix(30, 110, ease(f, 30, 50)), 10] } : {}),
        ...(listen > 0 ? { reachL: [-200, mix(-560, -790, listen)], frontL: true, handL: "open", lookX: Math.sin(f * 0.18) * 0.7, headTilt: 10 * listen } : {}),
        ...(f > 182 ? { gesture: "cheer" } : {}),
      }),
      pup("young", YOUNG, aside.at, {
        view: "front",
        ...faceChange([[0, "skeptical"], [56, "neutral"], [180, "happy"]], f),
        ...(f > 94 && f < 118 ? aside.pose : {}),
        ...(f < 48 ? { gesture: "handsOnHips", headTilt: Math.sin(f * 0.25) * 6 } : {}),
        ...(grip > 0.02 ? { worldR: hand, handR: "fist", bend: 0.35 * (1 - up) * reach } : {}),
        ...(f > 182 ? { gesture: "clap" } : {}),
      }),
    ],
    null,
    { fg: rockFg({ position: [0.25, 1.55, 4.3], target: [0.15, 0.6, 0], fov: 40 }, -0.9, -0.9, 1.3, 0.14, 51) },
  );
};

// ---------- 10 · frames 1418-1521 · dream (purple) ----------
// line 15: "Now picture you (1432), jumping twice as high (1445-1470), flipping right over (1484-1505)." The viewer as
// an astronaut leaps twice Duke's height, somersaults twice and lands head-first, stuck like a dart, legs kicking.
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..102
  const camera = beatPath(
    [
      { at: 0, position: [0.4, 1.0, 4.6], target: [0, 1.2, 0], fov: 44 },
      { at: 42, position: [0.3, 1.4, 4.9], target: [0, 2.2, 0], fov: 44 }, // "twice as high"
      { at: 80, position: [0.2, 1.0, 4.1], target: [0, 0.8, 0], fov: 44 },
      { at: 102, position: [0.15, 0.95, 3.9], target: [0, 0.75, 0], fov: 44 },
    ],
    f,
  );
  const L0 = 14;
  const L1 = 70;
  const p = Math.max(0, Math.min(1, (f - L0) / (L1 - L0)));
  const H = f < L0 || f > L1 ? 0 : 1.76 * Math.sin(Math.PI * p);
  const spin = f < L0 ? 0 : f > L1 ? 180 : 540 * smooth(p);
  const stuck = f > L1 ? f - L1 : -1;
  return moonStage(
    "dream",
    camera,
    f,
    f + 1418,
    [
      pup("you", YOU, [0, 0], {
        view: "front",
        ...faceChange([[0, "excited"], [50, "happy"], [70, "shocked"]], f),
        ...(f < L0 ? { crouch: 0.6 * ease(f, 4, 16), armL: [20, 30], armR: [20, 30] } : {}),
        air: stuck >= 0 ? 380 : H * UNITS,
        spin,
        armL: [150, 20],
        armR: [150, 20],
        ...(stuck >= 0 ? { legSwing: 18 * Math.sin(stuck * 0.9), squash: 0.12 * settle(stuck, 2.6, 0.4) } : {}),
      }),
    ],
    <MoonDust at={[0, 0.02, 0]} frame={stuck} count={70} speed={1.3} up={0.9} color="#e0b0e0" seed={23} />,
    { lm: false, rover: false, flag: false, fg: rockFg({ position: [0.4, 1.0, 4.6], target: [0, 1.2, 0], fov: 44 }, 0.86, -0.88, 1.3, 0.2, 61) },
  );
};

// ---------- 11 · frames 1521-1640 · lope (pale) ----------
// line 16: "That's why moonwalkers loped (1538-1560) and skipped (1573), and hopped only for fun (1588-1627)." Both
// cross the frame in profile with low, careful lopes; Young throws in one small kangaroo hop for fun.
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..118
  const camera = beatPath([{ at: 0, position: [1.4, 1.25, 4.4], target: [1.0, 0.95, 0], fov: 40 }, { at: 118, position: [-0.4, 1.2, 4.1], target: [-0.6, 0.9, 0], fov: 40 }], f);
  const d = stroll(f, 0, 118, [1.75, 0.2], [-0.2, 0.1]);
  const y = stroll(f, 0, 112, [0.85, -0.45], [-1.1, -0.45]);
  const lopeD = Math.max(0, Math.sin(f * 0.21)) * (40 + 10 * Math.sin(f * 0.05));
  const lopeY = Math.max(0, Math.sin(f * 0.18 + 1)) * (36 + 12 * Math.sin(f * 0.07));
  const hop = jump(f, 70, 200, 38);
  return moonStage(
    "pale",
    camera,
    f,
    f + 1521,
    [
      pup("duke", DUKE, d.at, { ...d.pose, expression: "happy", bob: -lopeD }),
      pup("young", YOUNG, y.at, { ...y.pose, expression: f > 66 ? "excited" : "happy", bob: f > 66 && f < 112 ? 0 : -lopeY, ...(f > 66 && f < 112 ? { ...hop, view: "side", facing: -1, armL: [-25, 20], armR: [-35, 25] } : {}) }),
    ],
    <>
      {[30, 60, 96].map((s, i) => (
        <MoonDust key={i} at={[mix(1.75, -0.2, smooth(s / 118)), 0.02, 0.2]} frame={f - s} count={24} speed={0.6} up={0.6} seed={70 + i} />
      ))}
      <MoonDust at={[mix(0.85, -1.1, smooth(95 / 112)), 0.02, -0.45]} frame={f - 97} count={40} speed={0.9} up={0.8} seed={77} />
    </>,
    { lm: false, fg: rockFg({ position: [1.4, 1.25, 4.4], target: [1.0, 0.95, 0], fov: 40 }, 0.86, -0.88, 1.3, 0.18, 71) },
  );
};

// ---------- 12 · frames 1640-1780 · lm-site-loop (golden) ----------
// line 17: "So on the Moon, keep your jumps small (1645-1708). Remember the man who didn't (1723-1756)." Back at the
// flag: Duke takes a careful little hop, Young nods; on "didn't" Duke crouches for the big one and launches, and the
// camera comes to rest on the opening camera as he rises past the flag: the video runs back into frame 0.
const LOOP_LAUNCH = 1780 - (H1_ARC - LAUNCH);
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..139
  const vf = f + 1640;
  const camera = beatPath(
    [
      { at: 0, position: [1.6, 1.5, 4.8], target: [0.3, 1.0, -0.4], fov: 42 },
      { at: 70, position: [1.25, 1.0, 4.2], target: [0.2, 1.15, -0.5], fov: 42 }, // "Remember"
      { at: 139, ...OPEN_CAM },
    ],
    f,
  );
  const arcVf = vf - LOOP_LAUNCH + LAUNCH; // the big jump, on Duke's arc clock
  const small = jump(f, 22, 140, 40);
  const a = airborne([0, 0], arcH(arcVf), 0, camera);
  return moonStage(
    "golden",
    camera,
    f,
    vf,
    [
      pup(
        "duke",
        DUKE,
        a.at,
        arcVf >= LAUNCH - 16
          ? { view: "front", ...dukeArc(arcVf), crouch: (dukeArc(arcVf).crouch ?? 0) * 0.35, expression: arcVf > LAUNCH ? "excited" : "determined", rise: a.rise, lookX: 0.2 }
          : { view: "front", ...faceChange([[0, "happy"], [60, "smug"]], f), ...small },
      ),
      pup("young", YOUNG, YOUNG_LOOP_AT, f > 96 ? YOUNG_LOOP_POSE : { view: "front", rise: 2.24, ...faceChange([[0, "happy"], [80, "worried"]], f), headTilt: Math.sin(f * 0.2) * 5, ...(f > 20 && f < 70 ? { gesture: "wave" } : {}) }),
    ],
    <MoonDust at={[0, 0.02, 0]} frame={arcVf - LAUNCH} seed={3} slow={1.4} />,
    { fg: rockFg(OPEN_CAM, -0.85, -0.85, 1.3, 0.16), energy: 0 }, // no automatic push: ends exactly on frame 0 (the loop)
  );
};

// ---------- the cut ----------
const SHOTS: Shot[] = [
  [0, 30, H1, false],
  [30, 70, H2, false],
  [70, 104, H3, false],
  [104, 273, S1, false],
  [273, 356, S2, "dip"],
  [356, 548, S3, "dip"],
  [548, 655, S4, "dip"],
  [655, 863, S5, "dip"],
  [863, 931, S6, "dip"],
  [931, 1116, S7, "dip"],
  [1116, 1201, S8, "dip"],
  [1201, 1418, S9, "dip"],
  [1418, 1521, S10, "dip"],
  [1521, 1640, S11, "dip"],
  [1640, TIMING.totalFrames, S12, "dip"],
];

// ---------- sound ----------
const youngLands = YOUNG_HOPS.map(([s, , l]) => 356 + s + Math.round(l * (24 / 34)));
const SFX: Sfx[] = [
  // the hook: the rise, the slam
  { at: 0, src: sfx("whoosh"), volume: 0.34, space: "outdoor" },
  { at: 91, src: sfx("boom"), volume: 0.42, space: "outdoor", hit: 0.9 },
  // radio: a beep before each voice from the Moon (the Apollo radio tones)
  { at: 354, src: sfx("credit-blip"), volume: 0.3 },
  { at: 1198, src: sfx("credit-blip"), volume: 0.3 },
  // Munich: the crowd, the run-up, the flop onto the mat
  { at: 273, src: sfx("crowd"), volume: 0.1, until: 356 },
  { at: 303, src: sfx("whoosh"), volume: 0.16, space: "outdoor" },
  { at: 330, src: sfx("plop"), volume: 0.8, space: "outdoor" },
  // Young's hops: a push and a soft landing each
  ...YOUNG_HOPS.map(([s], i) => ({ at: 356 + s + 10, src: sfx("whoosh"), volume: 0.24 + i * 0.05, space: "outdoor" as const })),
  ...foleyCues("thud", youngLands, 0.5, { space: "outdoor" }),
  // Duke's push, the flail, the slam
  { at: LAUNCH, src: sfx("whoosh"), volume: 0.4, space: "outdoor" },
  { at: 736, src: sfx("squeak"), volume: 0.45 },
  { at: IMPACT, src: sfx("boom"), volume: 0.36, space: "outdoor", hit: 1 },
  // Houston: the room hum, the mug
  { at: 863, src: sfx("hum"), volume: 0.06, until: 931 },
  { at: 885, src: sfx("clink"), volume: 0.2, space: "room" },
  // the pivot
  { at: 931, src: sfx("sting"), volume: 0.32 },
  { at: 958, src: sfx("squeak"), volume: 0.38, space: "room" },
  { at: 1102, src: sfx("clang"), volume: 0.8, space: "hall" },
  // the shell
  { at: 1153, src: sfx("crack"), volume: 0.8, space: "room" },
  { at: 1172, src: sfx("hiss"), volume: 0.2, space: "room" },
  // help up: the scrape, the relief
  { at: 1264, src: sfx("scrape"), volume: 0.3, space: "outdoor" },
  { at: 1404, src: sfx("chime"), volume: 0.14 },
  // the dream: the leap, the spin, the dart landing
  { at: 1436, src: sfx("whoosh"), volume: 0.35, space: "outdoor" },
  { at: 1462, src: sfx("whoosh"), volume: 0.28, space: "outdoor" },
  { at: 1418 + 70, src: sfx("boom"), volume: 0.35, space: "outdoor", hit: 0.5 },
  // loping: soft footfalls
  ...foleyCues("thud", [1535, 1551, 1566, 1582, 1600, 1618, 1630].map((x, i) => x + Math.round(rand(i, 4) * 3)), 0.75, { space: "outdoor" }),
  // the loop: the small hop, the launch into frame 0
  { at: 1640 + 30, src: sfx("whoosh"), volume: 0.7, space: "outdoor" },
  { at: LOOP_LAUNCH, src: sfx("whoosh"), volume: 0.35, space: "outdoor" },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 655, volume: 0.26 },
  { src: MUSIC_FILES.tension, from: 655, to: 1201, volume: 0.19 },
  { src: MUSIC_FILES.mystery, from: 1201, to: 1418, volume: 0.16 },
  { src: MUSIC_FILES.lounge, from: 1418, to: 1640, volume: 0.24 },
  { src: MUSIC_FILES.upbeat, from: 1640, to: TIMING.totalFrames, volume: 0.26 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;

