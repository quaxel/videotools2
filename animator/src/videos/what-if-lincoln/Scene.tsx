import React from "react";
import {
  beatPath,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  MusicCue,
  PuppetLight,
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
  Video,
} from "../../engine";
import { BackFigure, Balance, CallingCard, Candle, Flash, Glass, HandStamp, HazeCard, PaperStack, Plank, Sheet } from "./props";
import {
  airFor,
  BOX,
  boxLight,
  boxWorld,
  CHAIR_AT,
  FordsSet,
  GALLERY,
  HearingSet,
  hearingLight,
  houseLight,
  LINCOLN_SEAT,
  MARY_SEAT,
  OfficeSet,
  officeLight,
  PASS,
  PassageSet,
  passLight,
  SALOON,
  SaloonSet,
  saloonLight,
  STAGE,
  standAir,
  stairUp,
  StairsSet,
  WH,
  WhiteHouseSet,
  whLight,
} from "./sets";
import TIMING_JSON from "./timing.json";

// "What if Lincoln's guard had stayed at his door?": Ford's Theatre, 14 April 1865. The policeman posted at the
// State Box, John Parker, was reportedly next door at the Star Saloon; Booth climbed the stairs, showed a card,
// barred the passage door and fired under the play's biggest laugh. Sets: sets.tsx (guide/references/
// fords-theatre-1865.md); the State Box front, Lincoln's rocker and the passage chair are sand3d models
// (../videos/what-if-lincoln/sand3d/). No wound, no blood, no gun on screen: the shot is a flash over the laughter.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-lincoln";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const ASPECT = 9 / 16;

// ---------- cast ----------

const LINCOLN: PuppetLook = { skin: "#e6c09c", hair: "#1e1612", outfit: "#18181e", beard: "#1e1612", vest: "#121216" };
const MARY: PuppetLook = { skin: "#f4d8c0", hair: "#2a1a12", outfit: "#5a2a4a", skirt: true, long: true };
const PARKER: PuppetLook = { skin: "#e8c0a0", hair: "#5a3a24", outfit: "#1e2a4a", vest: "#2a3858" };
const BARMAN: PuppetLook = { skin: "#f0c8a8", hair: "#3a2a1a", outfit: "#f0ece0", vest: "#3a2a1a", apron: "#f8f6ee" };
const FORBES: PuppetLook = { skin: "#ecc8a8", hair: "#3a2a20", outfit: "#4a4a56", vest: "#6a6a76" };
const BOOTH: PuppetLook = { skin: "#f0d0b8", hair: "#141010", outfit: "#121216", hat: "#101012" };
const BOOTH_BARE: PuppetLook = { ...BOOTH, hat: undefined };
const ACTOR: PuppetLook = { skin: "#f0c8a8", hair: "#8a5a2a", outfit: "#b8863e", vest: "#e8dcb8", hat: "#efe6cc" };
const JOHNSON: PuppetLook = { skin: "#e8c0a0", hair: "#4a3a30", outfit: "#1a1a1e", vest: "#2a2a30" };
const BOARD1: PuppetLook = { skin: "#e8c4a4", hair: "#9a9a9a", outfit: "#1e1e26", beard: "#9a9a9a" };
const BOARD2: PuppetLook = { skin: "#dcb090", hair: "#3a2a20", outfit: "#2a2a34" };

const at2 = (v: [number, number, number]): [number, number] => [v[0], v[2]];
const lincolnAt = at2(boxWorld(LINCOLN_SEAT.lx, LINCOLN_SEAT.lz));
const maryAt = at2(boxWorld(MARY_SEAT.lx, MARY_SEAT.lz));
const boxCast = (lincoln: Partial<PuppetPose>, mary: Partial<PuppetPose>, drop = 0): PuppetPlacement[] => {
  const boxAir = airFor(BOX.y - drop + 0.36);
  return [
  { id: "lincoln", look: LINCOLN, at: lincolnAt, pose: { sit: true, air: boxAir, view: "front", expression: "happy", ...lincoln } as PuppetPose },
  { id: "mary", look: MARY, at: maryAt, pose: { sit: true, air: boxAir, view: "front", expression: "happy", ...mary } as PuppetPose },
  ];
};

// ---------- 1. Hook (0-113): the passage at night, push onto the empty chair by the white door ----------

const S1: React.FC = () => {
  const f = useShotFrame();
  const k0: CameraShot = { position: [1.05, 0.95, 3.0], target: [0.1, 0.62, -0.7], fov: 40 };
  const camera = beatPath(
    [
      { at: 0, ...k0 },
      { at: 60, position: [0.62, 0.82, 1.9], target: [0.02, 0.58, -0.7], fov: 40 },
      { at: 112, position: [0.42, 0.74, 1.28], target: [-0.02, 0.55, -0.7], fov: 40 },
    ],
    f,
  );
  const fg = frameSpot(k0, ASPECT, 0.95, 0.0, 1.0);
  return (
    <>
      <Stage
        set={<PassageSet camera={camera} frame={f} mode="night" doorOpen={0.12} />}
        camera={camera}
        bg="#041614"
        blur={2.2}
        light={passLight("night")}
        foreground={<InkBox size={[0.1, 3.0, 0.1]} position={[fg[0], 1.2, fg[2]]} color="#14302c" ink={0.01} />}
      />
      <Headline f={f} text="WHERE WAS HIS GUARD?" at={20} out={108} />
    </>
  );
};

const D2 = BOX.y;

// ---------- 2. The house (113-340): crane up over the packed house to the flag-draped State Box ----------

const S2: React.FC = () => {
  const f = useShotFrame(); // 0..227
  const camera = beatPath(
    [
      { at: 0, position: [-1.5, 1.15 - D2, 8.7], target: [3.2, 1.85 - D2, 0.6], fov: 44 },
      { at: 110, position: [-0.2, 2.15 - D2, 6.4], target: [3.6, 2.55 - D2, 0.8], fov: 44 },
      { at: 226, position: [0.87, 3.05 - D2, 3.3], target: [4.23, 2.87 - D2, 1.14], fov: 40 },
    ],
    f,
  );
  const rock = Math.sin(f * 0.07) * 0.06;
  const cast = boxCast(
    { ...faceChange([[0, "happy"], [150, "excited"], [175, "happy"]], f), lookX: -0.7, headTilt: Math.sin(f * 0.07) * 3 },
    { ...faceChange([[0, "neutral"], [150, "happy"]], f), lookX: -0.6, reachR: [60, -560], handR: "open" },
    D2,
  );
  return (
    <>
      <Stage set={<FordsSet camera={camera} frame={f + 200} rock={rock} drop={D2} />} camera={camera} bg="#1a0c08" blur={2.0} puppets={cast} light={boxLight(0, D2)} />
      <Headline f={f} text={"WASHINGTON\n14 APRIL 1865"} at={4} out={118} />
    </>
  );
};

// ---------- 3. The dress circle (340-464): Parker by the passage door; at intermission he gets up and goes ----------

const CHAIR_G: [number, number] = [GALLERY.x1 - 0.42, GALLERY.door + 0.75];
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..124
  const camera = beatPath(
    [
      { at: 0, position: [0.35, 1.45, 2.2], target: [4.55, 0.72, 2.95], fov: 40 },
      { at: 60, position: [0.4, 1.45, 2.8], target: [4.5, 0.72, 3.5], fov: 40 },
      { at: 123, position: [0.5, 1.5, 4.2], target: [4.5, 0.75, 4.95], fov: 40 },
    ],
    f,
  );
  const UP = 58;
  const w = stroll(f, UP + 8, 46, [CHAIR_G[0] - 0.4, CHAIR_G[1] - 0.45], [GALLERY.x1 - 0.55, 4.85]);
  const seated = f < UP;
  const parker: PuppetPlacement = {
    id: "parker",
    look: PARKER,
    at: seated ? [CHAIR_G[0] - 0.05, CHAIR_G[1] - 0.25] : f < UP + 8 ? [CHAIR_G[0] - 0.4, CHAIR_G[1] - 0.45] : w.at,
    pose: seated
      ? { sit: true, air: airFor(0.36), view: "front", ...faceChange([[0, "bored"], [34, "thinking"]], f), lookX: -0.8, reachR: [70, -470], reachL: [-70, -470], handR: "open", handL: "open" }
        : { ...w.pose, ...faceChange([[UP, "neutral"], [UP + 20, "smug"]], f) },
  };
  return (
    <Stage set={<FordsSet camera={camera} frame={f + 500} mode="intermission" drop={GALLERY.y} />} camera={camera} bg="#1a0c08" blur={1.8} puppets={[parker]} light={houseLight(0, "intermission", GALLERY.y)} />
  );
};

// ---------- 4. The Star Saloon (464-598): "What'll it be, officer?"; the camera drifts to the window ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..134
  const camera = beatPath(
    [
      { at: 0, position: [0.25, 1.3, 2.7], target: [0.45, 1.05, -1.0], fov: 42 },
      { at: 133, position: [0.42, 1.15, 1.85], target: [0.48, 1.05, -1.0], fov: 42 },
    ],
    f,
  );
  const slide = ease(f, 26, 46);
  const glassX = -0.3 + slide * 0.75;
  const cast: PuppetPlacement[] = [
    { id: "barman", look: BARMAN, at: [0.05, -1.12], pose: { view: "front", ...faceChange([[0, "happy"], [70, "neutral"]], f), lookX: 0.8, reachR: f < 46 ? [140 + slide * 200, -470] : [90, -480], handR: "open", reachL: [-80, -470], handL: "open" } },
    { id: "parker", look: PARKER, at: [0.55, -0.15], pose: { view: "front", ...faceChange([[0, "neutral"], [40, "happy"], [80, "smug"]], f), lookX: -0.8, reachL: f > 44 ? [-120, -500] : [-60, -420], handL: "open" } },
    { id: "forbes", look: FORBES, at: [0.92, 0.0], pose: { view: "front", ...faceChange([[0, "neutral"], [60, "happy"]], f), lookX: -0.5 } },
  ];
  const fg = frameSpot({ position: [0.25, 1.3, 2.7], target: [0.45, 1.05, -1.0], fov: 42 }, ASPECT, -0.9, -0.95, 1.0);
  return (
    <Stage
      set={
        <SaloonSet camera={camera} frame={f}>
          <Glass position={[glassX, SALOON.barTop + 0.045, SALOON.bar + 0.12]} />
        </SaloonSet>
      }
      camera={camera}
      bg="#08140a"
      blur={2.0}
      puppets={cast}
      light={saloonLight}
      foreground={<InkCylinder radius={0.035} height={0.26} position={[fg[0], fg[1], fg[2]]} color="#2f6a3a" ink={0.008} />}
    />
  );
};

// ---------- 5. The White House, 11 April (598-748): Lincoln at the lit window; Booth in the crowd ----------

const S5: React.FC = () => {
  const f = useShotFrame(); // 0..150
  const camera = beatPath(
    [
      { at: 0, position: [0.25, 3.35 - WH.winY, 1.4], target: [0.0, 3.35 - WH.winY, -2.9], fov: 42 },
      { at: 64, position: [0.6, 2.7 - WH.winY, 2.8], target: [0.05, 2.8 - WH.winY, -2.6], fov: 42 },
      { at: 149, position: [1.35, 1.6 - WH.winY, 4.1], target: [0.35, 2.2 - WH.winY, -1.8], fov: 42 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "lincoln", look: LINCOLN, at: [WH.winX, WH.front + 0.18], pose: { view: "front", ...faceChange([[0, "determined"], [40, "neutral"]], f), lookX: 0.2, reachL: [-70, -560], reachR: [60 + Math.sin(f * 0.08) * 20, -580], handL: "open", handR: "open" } },
  ];
  return (
    <>
      <Stage
        set={
          <WhiteHouseSet camera={camera} frame={f} drop={WH.winY}>
            <Candle position={[WH.winX + 0.45, WH.winY + 0.02, WH.front + 0.3]} frame={f} />
            <BackFigure position={[0.72, 0, 2.35]} coat="#121216" hat="#101012" skin="#f0d0b8" turn={0.25 * ease(f, 90, 130)} />
            <BackFigure position={[-0.75, 0, 1.0]} coat="#2a3a7a" skin="#6a4230" hat="#22305a" scale={0.98} />
            <BackFigure position={[1.55, 0, 1.5]} coat="#3a4a6a" hair="#6a4020" scale={0.95} />
          </WhiteHouseSet>
        }
        camera={camera}
        bg="#0a1230"
        blur={1.8}
        puppets={cast}
        light={whLight}
      />
      <Headline f={f} text="11 APRIL 1865" at={2} out={70} />
    </>
  );
};

// ---------- 6. The stairs (748-809): Booth's silhouette climbs into the gaslight ----------

const boothSilhouette: PuppetLight = { tint: "#2a1416", tintAmount: 0.55, shadow: 0.6, points: [{ position: [3.7, 3.9, -0.5], color: "#ffb060", strength: 3.2, range: 5 }] };
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..61
  const camera = beatPath(
    [
      { at: 0, position: [-3.7, 0.9, 0.75], target: [1.2, 1.35, -0.1], fov: 42 },
      { at: 60, position: [-2.4, 1.5, 0.85], target: [2.4, 2.2, -0.1], fov: 42 },
    ],
    f,
  );
  const w = stroll(f, 0, 70, [-0.8, 0.15], [2.6, 0.12]);
  const booth: PuppetPlacement = { id: "booth", look: BOOTH, at: w.at, pose: { ...w.pose, view: "back", air: standAir(stairUp(w.at[0] + 0.14) + 0.02), expression: "determined" } };
  return <Stage set={<StairsSet camera={camera} frame={f + 300} />} camera={camera} bg="#0c0406" blur={1.6} puppets={[booth]} light={boothSilhouette} />;
};

// ---------- 7. The passage and the vestibule (809-974): the card, the door, the pine bar, the wait ----------

// Seen from inside the vestibule, by the box door: through the opening passage door Booth shows the footman his
// card, steps in, shuts the door, takes the pine bar from the wall and wedges it between the door and a notch in
// the wall, then turns and waits in the dark.
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..165
  const camera = beatPath(
    [
      { at: 0, position: [0.7, 1.12, -4.5], target: [0.7, 1.05, -0.5], fov: 46 },
      { at: 80, position: [0.69, 1.08, -4.25], target: [0.68, 1.0, -0.5], fov: 46 },
      { at: 164, position: [0.7, 1.04, -4.0], target: [0.68, 0.98, -0.5], fov: 46 },
    ],
    f,
  );
  const OUT: [number, number] = [0.5, -0.66]; // in the passage, just outside the door
  const IN: [number, number] = [0.76, -2.0];
  const BRACE: [number, number] = [0.62, -1.6];
  const WAIT: [number, number] = [0.64, -1.8];
  const door = 1 - ease(f, 58, 70);
  const stepIn = stroll(f, 40, 16, OUT, IN);
  const toBrace = stroll(f, 74, 8, IN, BRACE);
  const toWait = stroll(f, 118, 14, BRACE, WAIT);
  const push = ease(f, 84, 104);
  let bAt: [number, number];
  let bPose: PuppetPose;
  if (f < 40) {
    bAt = OUT;
    bPose = { view: "front", expression: "smug", lookX: -0.8, reachL: [-150, -500], handL: "open", frontL: true };
  } else if (f < 56) {
    bAt = stepIn.at;
    bPose = { ...stepIn.pose, view: "front", expression: "determined" };
  } else if (f < 74) {
    bAt = IN;
    bPose = { view: "back", expression: "determined", reachR: [120, -520 + ease(f, 58, 68) * 40], handR: "open" };
  } else if (f < 118) {
    bAt = f < 82 ? toBrace.at : BRACE;
    bPose = { view: "back", expression: "determined", reachR: [150, -560 + push * 70], reachL: [-130, -500 + push * 60], handR: "fist", handL: "fist", lean: push * 7 };
  } else {
    bAt = toWait.at;
    bPose = f < 132 ? { ...toWait.pose, view: "back", expression: "determined" } : { view: "back", expression: "determined", crouch: 0.18 * ease(f, 136, 150), lean: 6 * ease(f, 136, 150) };
  }
  const booth: PuppetPlacement = { id: "booth", look: BOOTH, at: bAt, pose: bPose };
  const forbes: PuppetPlacement = { id: "forbes", look: FORBES, at: [0.86, -0.3], pose: { sit: true, view: "front", ...faceChange([[0, "neutral"], [20, "confused"], [34, "neutral"]], f), lookX: 0.8, reachR: f >= 16 && f < 40 ? [140, -480] : [70, -420], handR: "open" } };
  const card = f >= 14 && f < 38 ? handWorld(OUT, [-150, -500], camera) : null;
  // the pine bar: leaning on the right wall, lifted at f 74, pressed between the door and the left-wall notch by 104
  const lean = { a: [1.04, 0.03, -2.25] as [number, number, number], b: [1.05, 1.0, -2.0] as [number, number, number] };
  const set = { a: [0.72, 0.9, PASS.back - 0.08] as [number, number, number], b: [PASS.vx1 - 0.03, 0.24, -1.85] as [number, number, number] };
  const lift = ease(f, 74, 86);
  const lerp = (u: [number, number, number], v: [number, number, number], t: number): [number, number, number] => [u[0] + (v[0] - u[0]) * t, u[1] + (v[1] - u[1]) * t, u[2] + (v[2] - u[2]) * t];
  const mid = { a: [0.7, 1.15, -1.3] as [number, number, number], b: [0.95, 0.6, -1.9] as [number, number, number] };
  const barA = lift < 1 ? lerp(lean.a, mid.a, lift) : lerp(mid.a, set.a, push);
  const barB = lift < 1 ? lerp(lean.b, mid.b, lift) : lerp(mid.b, set.b, push);
  const boothLight: PuppetLight = {
    tint: "#e0b0b0",
    tintAmount: 0.18,
    shadow: 0.5,
    points: [
      { position: [0.7, 1.7, door > 0.05 ? 0.2 : -1.3], color: "#ffb060", strength: door > 0.05 ? 2.8 : 1.4, range: 4 },
      { position: [0.7, 1.3, -4.6], color: "#ff9a50", strength: 1.0, range: 3 },
    ],
  };
  return (
    <Stage
      set={
        <PassageSet camera={camera} frame={f + 400} mode="booth" doorOpen={door} chair={false} boxDoor={0}>
          {card && <CallingCard position={card} rotation={[0, 0.3, 0.2]} />}
          <Plank from={barA} to={barB} />
          {/* the notch cut in the wall where the bar ends */}
          <InkBox size={[0.03, 0.08, 0.08]} position={[PASS.vx1 - 0.01, 0.24, -1.85]} color="#1a0a08" ink={0} />
          <pointLight position={[0.7, 1.4, -4.6]} intensity={0.9} distance={4} color="#ff9a50" />
          <HazeCard position={[0.7, 1.4, -0.9]} size={[1.0, 2.0]} color="#ffb060" opacity={0.18 * door + 0.04} />
        </PassageSet>
      }
      camera={camera}
      bg="#0c0406"
      blur={1.4}
      puppets={f < 52 ? [booth, forbes] : [booth]}
      light={boothLight}
    />
  );
};

// ---------- 8. The stage (974-1123): the line, the laugh, the flash in the box, the gas goes down ----------

const FIRE = 70;
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..149
  const camera = beatPath(
    [
      { at: 0, position: [-2.3, 1.95, 4.5], target: [2.46, 2.2, 0.85], fov: 46 },
      { at: FIRE, position: [-2.1, 2.0, 4.4], target: [2.62, 2.25, 0.78], fov: 46 },
      { at: 148, position: [-1.9, 2.05, 4.3], target: [2.8, 2.3, 0.7], fov: 46 },
    ],
    f,
  );
  const laugh = ease(f, 46, 58) * (1 - ease(f, FIRE + 6, FIRE + 22));
  const dark = 0.9 * ease(f, FIRE + 8, FIRE + 30);
  const arms = ease(f, 40, 50) * (1 - ease(f, 66, 80));
  const actor: PuppetPlacement = {
    id: "actor",
    look: ACTOR,
    at: [2.55, -0.7],
    pose: {
      view: "front",
      air: standAir(STAGE.top),
      ...faceChange([[0, "smug"], [36, "excited"], [FIRE + 4, "shocked"]], f),
      lookX: 0.9,
      reachR: [110 + arms * 120, -560 - arms * 380],
      reachL: [-110 - arms * 120, -560 - arms * 380],
      handR: "open",
      handL: "open",
      lean: -arms * 6,
    },
  };
  const cast: PuppetPlacement[] = [
    actor,
    ...boxCast(
      { ...faceChange([[0, "happy"], [50, "excited"], [FIRE, "neutral"]], f), lookX: -0.9 },
      { ...faceChange([[0, "happy"], [50, "excited"], [FIRE + 4, "shocked"]], f), lookX: 0.6 },
    ),
  ];
  const flashAt = boxWorld(LINCOLN_SEAT.lx + 0.32, LINCOLN_SEAT.lz - 0.3, 0.95);
  return (
    <Stage
      set={
        <FordsSet camera={camera} frame={f + 800} laugh={laugh} dark={dark}>
          <Flash at={flashAt} t={f - FIRE} size={0.45} />
        </FordsSet>
      }
      camera={camera}
      bg="#1a0c08"
      blur={1.8}
      puppets={cast}
      light={houseLight(dark)}
      flash={f >= FIRE && f < FIRE + 3 ? 0.25 : 0}
    />
  );
};

// ---------- 9. What if (1123-1274): violet light; Parker stays, Booth is turned away ----------

const S9: React.FC = () => {
  const f = useShotFrame(); // 0..151
  const camera = beatPath(
    [
      { at: 0, position: [0.9, 1.3, 3.1], target: [-0.45, 0.95, -0.4], fov: 42 },
      { at: 150, position: [0.35, 1.15, 2.3], target: [-0.5, 0.95, -0.35], fov: 42 },
    ],
    f,
  );
  const STAND = 55;
  const inW = stroll(f, 10, 44, [-1.0, 0.35], [-0.72, 0.2]);
  const outW = stroll(f, 92, 40, [-0.72, 0.2], [-0.98, 0.45]);
  const booth: PuppetPlacement = {
    id: "booth",
    look: BOOTH,
    at: f < 92 ? inW.at : outW.at,
    pose: f < 58 ? { ...inW.pose, view: "front", expression: "determined" } : f < 92 ? { view: "front", ...faceChange([[58, "determined"], [70, "worried"]], f), lookX: 0.7 } : { ...outW.pose, view: "front", ...faceChange([[92, "worried"], [104, "sad"]], f), lookX: 0.6 },
  };
  const parker: PuppetPlacement = {
    id: "parker",
    look: PARKER,
    at: f < STAND ? [CHAIR_AT[0] + 0.05, CHAIR_AT[2] + 0.2] : [CHAIR_AT[0] + 0.12, CHAIR_AT[2] + 0.45],
    pose:
      f < STAND
        ? { sit: true, view: "front", expression: "neutral", lookX: -0.8 }
        : { view: "front", ...faceChange([[STAND, "skeptical"], [STAND + 30, "determined"]], f), lookX: -0.9, reachR: f < 120 ? [-260, -720] : [70, -470], handR: "open", frontR: true },
  };
  return (
    <>
      <Stage set={<PassageSet camera={camera} frame={f + 600} mode="whatif" chair />} camera={camera} bg="#160a2a" blur={2.0} puppets={[parker, booth]} light={passLight("whatif")} />
      <Headline f={f} text="WHAT IF?" at={2} out={60} />
    </>
  );
};

// ---------- 10. Johnson's office (1274-1561): PARDON, VETO, and the balance LINCOLN / CONGRESS ----------

const DESK = { y: 0.45, z: -0.55 };
const JOHN_AT: [number, number] = [-0.1, -1.05];
const PARDON_HITS = [68, 78, 86, 93, 99];
const VETO_HITS = [110, 124];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..287
  const camera = beatPath(
    [
      { at: 0, position: [-0.15, 1.3, 2.9], target: [-0.05, 0.85, -0.6], fov: 40 },
      { at: 100, position: [0.08, 1.27, 2.7], target: [0.1, 0.83, -0.6], fov: 40 },
      { at: 150, position: [0.12, 1.26, 2.6], target: [0.12, 0.83, -0.6], fov: 40 },
      { at: 185, position: [0.36, 1.35, 3.4], target: [0.36, 0.95, -0.6], fov: 40 },
      { at: 286, position: [0.38, 1.3, 3.15], target: [0.38, 0.95, -0.6], fov: 40 },
    ],
    f,
  );
  // the stamping arm: up and down on each hit, over the stack then over the bills
  const hits = [...PARDON_HITS, ...VETO_HITS];
  const next = hits.find((h) => h >= f - 3) ?? 999;
  const prev = [...hits].reverse().find((h) => h <= f) ?? -99;
  const down = Math.max(0, 1 - Math.abs(f - next) / 5, 1 - Math.abs(f - prev) / 5);
  const onBills = f > 104;
  const reachR: [number, number] = onBills ? [360, -440 - (1 - down) * 120] : [-140, -440 - (1 - down) * 140];
  const johnson: PuppetPlacement = {
    id: "johnson",
    look: JOHNSON,
    at: JOHN_AT,
    pose: { sit: true, view: "front", ...faceChange([[0, "neutral"], [60, "determined"], [140, "smug"]], f), lookX: onBills ? 0.6 : -0.5, reachR, handR: "fist", frontR: true, reachL: [-60, -470], handL: "open" },
  };
  const hand = handWorld(JOHN_AT, reachR, camera);
  const sheets = 2 + PARDON_HITS.filter((h) => f >= h).length * 3;
  const tilt = 0.2 * ease(f, 170, 215) - 0.32 * ease(f, 245, 280);
  return (
    <Stage
      set={
        <OfficeSet camera={camera} frame={f}>
          {/* the desk */}
          <InkBox size={[1.9, 0.05, 0.75]} position={[0.1, DESK.y - 0.025, DESK.z]} color="#3a2a1a" ink={0.01} />
          <InkBox size={[1.85, DESK.y - 0.05, 0.05]} position={[0.1, (DESK.y - 0.05) / 2, DESK.z + 0.33]} color="#1e3a26" ink={0.01} />
          <InkBox size={[1.6, 0.012, 0.5]} position={[0.1, DESK.y + 0.006, DESK.z]} color="#2a5a3a" ink={0} />
          <PaperStack position={[-0.38, DESK.y + 0.01, DESK.z + 0.08]} n={sheets} seed={3} />
          {f < 100 && <Label text="PARDON" position={[-0.38, DESK.y + 0.2, DESK.z + 0.32]} width={0.3} appear={f - PARDON_HITS[0]} />}
          {/* the two bills, stood up on a book rest */}
          {f >= 100 && f < 152 && (
            <>
              <Label text={"FREEDMEN'S\nBUREAU"} position={[0.14, DESK.y + 0.24, DESK.z + 0.3]} width={0.28} bg="#f4ead0" fg="#1a1410" rotation={[-0.15, 0, 0]} appear={f - 100} />
              <Label text={"CIVIL\nRIGHTS"} position={[0.42, DESK.y + 0.24, DESK.z + 0.3]} width={0.24} bg="#f4ead0" fg="#1a1410" rotation={[-0.15, 0.1, 0]} appear={f - 103} />
              <Label text="VETO" position={[0.14, DESK.y + 0.4, DESK.z + 0.31]} width={0.2} bg="#c8202a" fg="#fff6dc" rotation={[-0.15, 0, -0.12]} appear={f - VETO_HITS[0]} />
              <Label text="VETO" position={[0.42, DESK.y + 0.4, DESK.z + 0.31]} width={0.2} bg="#c8202a" fg="#fff6dc" rotation={[-0.15, 0.1, 0.1]} appear={f - VETO_HITS[1]} />
            </>
          )}
          <HandStamp position={[hand[0], Math.max(DESK.y + 0.02, hand[1] - 0.16), hand[2] + 0.02]} />
          {/* the side table with the balance */}
          <Balance position={[0.55, DESK.y, DESK.z - 0.15]} tilt={tilt} left="LINCOLN" right="CONGRESS" appear={f - 180} />
        </OfficeSet>
      }
      camera={camera}
      bg="#06180c"
      blur={1.5}
      focus={3.7 - 0.9 * (ease(f, 90, 104) - ease(f, 150, 164))}
      puppets={[johnson]}
      light={officeLight}
    />
  );
};

// ---------- 11. The police board room (1561-1649): NEGLECT OF DUTY, stamped DISMISSED ----------

const S11: React.FC = () => {
  const f = useShotFrame(); // 0..88
  const camera = beatPath(
    [
      { at: 0, position: [-0.45, 1.25, 2.1], target: [0.25, 0.8, -1.0], fov: 42 },
      { at: 87, position: [-0.05, 1.0, 0.85], target: [0.05, 0.62, -0.95], fov: 42 },
    ],
    f,
  );
  const HIT = 70;
  const press = f < HIT - 8 ? 0 : f < HIT ? ease(f, HIT - 8, HIT) : 1 - ease(f, HIT + 4, HIT + 14);
  const cast: PuppetPlacement[] = [
    { id: "board1", look: BOARD1, at: [-0.55, -1.75], pose: { sit: true, view: "front", ...faceChange([[0, "skeptical"], [HIT - 10, "bored"]], f), lookX: 0.7 } },
    { id: "board2", look: BOARD2, at: [0.35, -1.75], pose: { sit: true, view: "front", expression: "neutral", lookX: 0.5, reachR: [140, -380 - press * 60], handR: "fist", frontR: true } },
    { id: "parker", look: PARKER, at: [0.72, -0.45], pose: { view: "front", ...faceChange([[0, "worried"], [HIT + 4, "smug"]], f), lookX: -0.8, reachL: [-70, -470], handL: "open" } },
  ];
  return (
    <Stage
      set={
        <HearingSet camera={camera} frame={f}>
          <Sheet position={[0.0, 0.46, -1.0]} rotY={0.05} seed={41} size={[0.32, 0.42]} />
          {f < HIT && <Label text={"NEGLECT\nOF DUTY"} position={[0.0, 0.66, -0.88]} width={0.46} rotation={[-0.35, 0, 0]} appear={f - 22} />}
          <Label text="DISMISSED" position={[0.02, 0.7, -0.84]} width={0.5} bg="#c8202a" fg="#fff6dc" rotation={[-0.35, 0, -0.1]} appear={f - HIT} />
          <HandStamp position={[0.3, 0.46, -1.05]} press={press} lift={0.22} />
        </HearingSet>
      }
      camera={camera}
      bg="#0c1220"
      blur={1.8}
      puppets={cast}
      light={hearingLight}
    />
  );
};

// ---------- 12. Dawn in the passage (1649-end): the empty chair ----------

const S12: React.FC = () => {
  const f = useShotFrame(); // 0..84
  const camera = beatPath(
    [
      { at: 0, position: [0.35, 0.78, 0.75], target: [-0.05, 0.55, -0.7], fov: 40 },
      { at: 83, position: [0.95, 1.55, 2.5], target: [0.1, 0.75, -0.7], fov: 40 },
    ],
    f,
  );
  return <Stage set={<PassageSet camera={camera} frame={f + 900} mode="dawn" doorOpen={0.3} boxDoor={0.5} />} camera={camera} bg="#8a96a8" blur={2.0} light={passLight("dawn")} />;
};

// [from, to, shot, transition in]
const SHOTS: Shot[] = [
  [0, 113, S1, false],
  [113, 340, S2, "dip"],
  [340, 464, S3, "dip"],
  [464, 598, S4, "dip"],
  [598, 748, S5, "dip"],
  [748, 809, S6, "dip"],
  [809, 974, S7, "dip"],
  [974, 1123, S8, "dip"],
  [1123, 1274, S9, "dip"],
  [1274, 1561, S10, "dip"],
  [1561, 1649, S11, "dip"],
  [1649, TIMING.totalFrames, S12, "dip"],
];

// ---------- sound ----------

const MURMUR = "videos/what-if-lincoln/sfx/murmur.wav";
// pitched copies of the library stamp (made with ffmpeg into this video's folder) so a run of stamps never repeats one file
const STAMP = (i: number) => `videos/what-if-lincoln/sfx/stamp-${(i % 5) + 1}.wav`;
const SFX: Sfx[] = [
  // 1. the passage: the house murmurs through the wall, the gas hums
  { at: 0, src: MURMUR, volume: 0.05, until: 113 },
  { at: 0, src: sfx("hum"), volume: 0.05, until: 113 },
  // 2. the house
  { at: 113, src: MURMUR, volume: 0.1, until: 340 },
  { at: 113 + 80, src: sfx("creak"), volume: 0.29, space: "hall" },
  // 3. intermission: the murmur up, Parker's chair scrapes back
  { at: 340, src: MURMUR, volume: 0.12, until: 464 },
  ...foleyCues("scrape", [340 + 58], 0.4, { space: "hall" }),
  { at: 340 + 100, src: sfx("door"), volume: 0.42, space: "hall" },
  // 4. the saloon: the glass slides, a clink
  { at: 464, src: MURMUR, volume: 0.05, until: 598 },
  ...foleyCues("scrape", [464 + 27], 0.4, { space: "room" }),
  { at: 464 + 46, src: sfx("clink"), volume: 0.3, space: "room" },
  // 5. the White House crowd outside, a breeze
  { at: 598, src: MURMUR, volume: 0.1, until: 748 },
  { at: 598, src: sfx("wind"), volume: 0.05, until: 748 },
  // 6. the stairs creak under Booth
  { at: 748 + 8, src: sfx("creak"), volume: 0.17, space: "room" },
  { at: 748 + 44, src: sfx("creak"), volume: 0.18, space: "room" },
  // 7. the card, the door, the bar wedged
  { at: 809, src: MURMUR, volume: 0.04, until: 974 },
  { at: 809 + 20, src: sfx("card"), volume: 0.35, space: "room" },
  { at: 809 + 40, src: sfx("door"), volume: 0.64, space: "room" },
  ...foleyCues("scrape", [809 + 82], 0.33, { space: "room" }),
  { at: 809 + 100, src: sfx("button"), volume: 0.26, space: "room" },
  // 8. the laugh, the shot inside it, the gas going down
  { at: 974, src: MURMUR, volume: 0.08, until: 1020 },
  { at: 1020, src: MURMUR, volume: 0.22, until: 1060 },
  { at: 1020, src: sfx("crowd"), volume: 0.08, until: 1060 },
  ...foleyCues("gunshot-echo", [974 + FIRE], 0.64, { space: "hall", hit: 0.15 }),
  { at: 1060, src: MURMUR, volume: 0.05, until: 1095 },
  // 9. the pivot
  { at: 1123, src: sfx("sting"), volume: 0.35 },
  { at: 1123 + 120, src: sfx("creak"), volume: 0.23, space: "room" },
  // 10. PARDON, PARDON ... VETO, VETO; the balance
  ...PARDON_HITS.map((h, i) => ({ at: 1274 + h, src: STAMP(i), volume: [0.4, 0.36, 0.38, 0.34, 0.36][i], space: "room" as const })),
  ...VETO_HITS.map((h, i) => ({ at: 1274 + h, src: STAMP(i + 2), volume: 0.3, space: "room" as const })),
  { at: 1274 + 172, src: sfx("clink"), volume: 0.42, space: "room" },
  { at: 1274 + 250, src: sfx("creak"), volume: 0.27, space: "room" },
  // 11. DISMISSED
  { at: 1561 + 4, src: sfx("paper"), volume: 0.6, space: "room" },
  { at: 1561 + 70, src: STAMP(4), volume: 0.34, space: "room" },
  // 12. dawn
  { at: 1649, src: sfx("wind"), volume: 0.04, until: TIMING.totalFrames - 2 },
];

const MUSIC: MusicCue[] = [
  { src: "music/mystery.wav", from: 0, to: 464, volume: 0.24 },
  { src: "music/lounge.wav", from: 464, to: 598, volume: 0.16 },
  { src: "music/tension.wav", from: 598, to: 1123, volume: 0.22 },
  { src: "music/mystery.wav", from: 1123, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
