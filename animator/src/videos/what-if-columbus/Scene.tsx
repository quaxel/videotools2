import React from "react";
import {
  beatPath,
  Burst,
  CameraShot,
  Door,
  faceChange,
  foleyCues,
  frameSpot,
  handWorld,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  moodBackground,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  ramp,
  Room,
  Sfx,
  sfx,
  Shot,
  Stage,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Cord } from "../../three/BalloonSets";
import { Barrel, CanaryPeak, CrowsNest, DECK, DeckSet, GreenIsland, MoonCliff, RopeCoil, SeaSet, seaBg, seaLight, seaY, Ship, Wake } from "./Sets";
import { BerryBranch, Candle, CarvedStick, Crate, HangLantern, Logbook, OilLamp, Page, Purse, SternWindows, Stool, WritingTable } from "./props";
import TIMING_JSON from "./timing.json";

// "What if Columbus's crew had turned back?" (October 1492). Sets (this folder, guide/references/atlantic-1492.md):
// SeaSet (open Atlantic, eight moods) with the sand3d nao and caravel (../videos/what-if-columbus/sand3d/ship.py),
// DeckSet (the Santa María's waist), the Pinta's crow's nest; Room interiors for the cabin, the friar's study and the
// swap table.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-columbus";
export const timing = TIMING;

const ASPECT = 9 / 16;
const K = 1.3 / 1060; // metres per puppet unit
const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

// ---------- cast ----------

const COLUMBUS: PuppetLook = { skin: "#f0c8a8", hair: "#e6e0d4", outfit: "#8a2a2a", vest: "#1e1a1a", hat: "#1c1818", long: true };
const SAILOR: PuppetLook = { skin: "#d8a07a", hair: "#3a2a1a", outfit: "#4a6a9a", beard: "#3a2a1a", kerchief: "#b83a2a" };
const MATE: PuppetLook = { skin: "#f0c8a0", hair: "#8a5a2a", outfit: "#c89a3a", vest: "#5a3a24" };
const LOOKOUT: PuppetLook = { skin: "#e0b088", hair: "#2a1a10", outfit: "#f2ece0", kerchief: "#2a7a4a" };
const FRIAR: PuppetLook = { skin: "#f0c8a8", hair: "#7a6a5a", outfit: "#f4f0e6", vest: "#1c1a1a" };
const WRITER: PuppetLook = { skin: "#f2cca8", hair: "#4a3020", outfit: "#2a5a3a", hat: "#2a2018", beard: "#4a3020" };
const TAINO: PuppetLook = { skin: "#b87a52", hair: "#14100c", outfit: "#d8b888", long: true };
const MERCHANT: PuppetLook = { skin: "#f0c8a8", hair: "#5a3a20", outfit: "#3a4a8a", hat: "#5a2a2a" };

// ---------- the cabin (shots 1 and 3) ----------

const TABLE: Vec3 = [0, 0, -1.0];
const TABLE_TOP = 0.44;
const COL_AT: [number, number] = [0, -1.38];
// the two logbooks lie on the slanted board; FOR THE CREW on the left, TRUE on the right
const BOOK_Y = TABLE_TOP + 0.1;
const BOOK_L: Vec3 = [-0.24, BOOK_Y, TABLE[2] - 0.02];
const BOOK_R: Vec3 = [0.24, BOOK_Y, TABLE[2] - 0.02];

const Cabin: React.FC<{ camera: CameraShot; frame: number; night?: boolean; door?: number; children?: React.ReactNode }> = ({ camera, frame, night = false, door = 0, children }) => (
  <Room camera={camera} mood={night ? "night" : "warm"} floor="#6a4428" wall={night ? "#3a3048" : "#8a5a34"} wallPattern="panel" floorPattern="wood" width={5} depth={4} stripe={night ? "#2a2238" : "#6a3a20"}>
    {/* low ceiling beams */}
    {[-1.5, -0.6, 0.3].map((z) => (
      <InkBox key={z} size={[5, 0.16, 0.18]} position={[0, 2.35, z]} color={night ? "#2a2028" : "#5a3420"} ink={0.012} />
    ))}
    <SternWindows position={[0.55, 1.5, -1.93]} sky={night ? "#26346a" : "#f8c27a"} sea={night ? "#1a2244" : "#2e6e9a"} moon={night} />
    <WritingTable position={TABLE} top={TABLE_TOP} />
    <Stool position={[COL_AT[0], 0, COL_AT[1] - 0.12]} />
    {/* a sea chest and a rolled chart in the corner, a hat peg */}
    <InkBox size={[0.7, 0.42, 0.42]} position={[1.55, 0.21, -1.6]} color="#5a3420" ink={0.012} />
    <InkBox size={[0.72, 0.06, 0.44]} position={[1.55, 0.44, -1.6]} color="#c8a060" ink={0.008} />
    <InkCylinder radius={0.06} height={0.7} position={[-1.6, 0.35, -1.7]} rotation={[0.3, 0, 0.2]} color="#e8d8b0" ink={0.006} />
    <Door position={[-0.95, 0, -1.94]} open={door} color="#5a3420" />
    {night ? <Candle position={[0.47, TABLE_TOP, -1.2]} frame={frame} /> : <HangLantern position={[0.55, 2.27, -0.75]} frame={frame} swing={0.06 * Math.sin(frame * 0.05)} drop={0.55} />}
    {children}
  </Room>
);

const cabinLight = (night: boolean, frame: number): PuppetLight =>
  night
    ? { tint: "#b0b8e0", tintAmount: 0.06, shadow: 0.3, points: [{ position: [0.47, TABLE_TOP + 0.2, -1.2], color: "#ffb060", strength: 2.0 * (0.9 + 0.1 * Math.sin(frame * 0.9)), range: 2.2 }] }
    : { tint: "#ffe0c0", shadow: 0.2, points: [{ position: [0.55, 1.6, -0.75], color: "#ffb05a", strength: 2.4, range: 2.8 }] };

// Columbus at his table, writing: the quill hand travels along the line and lifts at its end.
const writing = (f: number, x0: number, speed = 1) => {
  const t = f * 0.11 * speed;
  const line = Math.floor(t / 6);
  const p = (t % 6) / 6;
  return [x0 + p * 90, -470 - line * 0 + Math.abs(Math.sin(t * 3.1)) * -10 + (p > 0.9 ? -25 : 0)] as [number, number];
};

// ---------- 1. Hook (0-247): push past a beam onto Columbus writing in two logbooks ----------

const S1_CAM0: CameraShot = { position: [-1.0, 1.8, 2.8], target: [0.0, 0.64, -1.1], fov: 40 };
const S1: React.FC = () => {
  const f = useShotFrame(); // 0..247
  const camera = beatPath(
    [
      { at: 0, ...S1_CAM0 },
      { at: 31, position: [-0.7, 1.65, 2.25], target: [0.0, 0.62, -1.1], fov: 40 },
      { at: 116, position: [-0.3, 1.5, 1.75], target: [0.0, 0.6, -1.1], fov: 40 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    {
      id: "columbus",
      look: COLUMBUS,
      at: COL_AT,
      pose: {
        sit: true,
        ...faceChange([[0, "neutral"], [56, "smug"], [96, "worried"]], f),
        reachR: f < 70 ? writing(f, 40) : [110, -470],
        reachL: f < 70 ? [-110, -455] : writing(f, -160, 0.8),
        handR: "fist",
        handL: "open",
        lookX: f < 70 ? 0.35 : -0.35,
        headTilt: f > 96 ? -5 : 4,
      },
    },
  ];
  return (
    <>
      <Stage
        set={
          <Cabin camera={camera} frame={f}>
            <Logbook position={BOOK_L} rotation={[0.5, 0.06, 0]} heading={"FOR THE\nCREW"} seed={11} cover="#2a4a6a" />
            <Logbook position={BOOK_R} rotation={[0.5, -0.06, 0]} heading="TRUE" seed={4} />
          </Cabin>
        }
        camera={camera}
        bg={moodBackground("warm")}
        blur={1.6}
        puppets={cast}
        light={cabinLight(false, f)}
        foreground={<InkBox size={[0.16, 2.4, 0.16]} position={frameSpot(S1_CAM0, ASPECT, -0.95, 0, 1.1)} color="#4a2a18" ink={0.01} />}
      />
      <Headline f={f} text="WHAT IF THEY TURNED BACK?" at={6} out={112} />
    </>
  );
};

// ---------- 2. Departure (119-247): three ships sail west from the Canaries, golden morning ----------

const SHIPS_WEST = (f: number): { kind: "nao" | "caravel"; at: [number, number]; phase: number; scale: number }[] => [
  { kind: "nao", at: [1.2 - f * 0.012, -9], phase: 0, scale: 1 },
  { kind: "caravel", at: [-4.6 - f * 0.012, -13.5], phase: 30, scale: 0.95 },
  { kind: "caravel", at: [6.4 - f * 0.012, -15], phase: 60, scale: 0.9 },
];
const S2_CAM0: CameraShot = { position: [3.6, 1.35, 5.0], target: [2.4, 2.0, -9], fov: 40 };
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..128
  const camera = beatPath(
    [
      { at: 0, ...S2_CAM0 },
      { at: 64, position: [2.2, 1.6, 4.4], target: [0.8, 2.1, -9], fov: 40 },
      { at: 127, position: [0.7, 1.85, 3.9], target: [-0.6, 2.2, -9], fov: 40 },
    ],
    f,
  );
  const ships = SHIPS_WEST(f + 119);
  const bob = seaY(1.6, 2.2, f + 119);
  return (
    <>
      <Stage
        set={
          <SeaSet camera={camera} frame={f + 119} mode="golden">
            <CanaryPeak position={[22, 0, -75]} size={1.1} />
            {ships.map((s, i) => (
              <React.Fragment key={i}>
                <Ship kind={s.kind} at={s.at} heading={-Math.PI / 2} frame={f + 119} phase={s.phase} scale={s.scale} />
                <Wake at={s.at} heading={-Math.PI / 2} frame={f + 119} scale={s.scale} />
              </React.Fragment>
            ))}
          </SeaSet>
        }
        camera={camera}
        bg={seaBg("golden")}
        blur={1.2}
        foreground={<Barrel position={[1.45, bob - 0.28, 2.3]} color="#7a5232" h={0.5} />}
        focus={12}
      />
      <Headline f={f} text="SEPTEMBER 1492" at={4} out={120} />
    </>
  );
};

// ---------- 3. The pivot (247-404): the two counts; a sailor bursts in, the TRUE log is slammed shut and hidden ----------

const S3: React.FC = () => {
  const f = useShotFrame(); // 0..157
  const BURST = 374 - 247; // "so they won't panic"
  const SLAM = BURST + 6;
  const camera = beatPath(
    [
      { at: 0, position: [0.0, 1.5, 1.8], target: [0.0, 0.6, -1.1], fov: 40 },
      { at: 75, position: [0.22, 1.45, 1.65], target: [0.1, 0.6, -1.1], fov: 40 },
      { at: 103, position: [-0.22, 1.45, 1.65], target: [-0.1, 0.6, -1.1], fov: 40 },
      { at: 156, position: [-0.4, 1.5, 2.15], target: [-0.42, 0.72, -1.3], fov: 40 },
    ],
    f,
  );
  const shut = ease(f, SLAM, SLAM + 5);
  const hide = ease(f, SLAM + 8, SLAM + 22);
  const right: Vec3 = [mix(BOOK_R[0], BOOK_L[0], hide), BOOK_R[1] - 0.012 * hide + 0.02 * Math.sin(Math.PI * hide), mix(BOOK_R[2], BOOK_L[2] - 0.03, hide)];
  const door = ease(f, BURST - 4, BURST + 4);
  const enter = ease(f, BURST - 2, BURST + 18);
  const cast: PuppetPlacement[] = [
    {
      id: "columbus",
      look: COLUMBUS,
      at: COL_AT,
      pose: {
        sit: true,
        ...faceChange([[0, "neutral"], [70, "smug"], [BURST, "shocked"], [SLAM + 24, "awkward"]], f),
        reachR: f < BURST ? writing(f, 60) : f < SLAM + 22 ? [mix(120, -100, hide), -500 + 40 * shut] : [-60, -470],
        reachL: f < BURST ? [-150, -455] : [-120, -470],
        handR: f < BURST ? "fist" : "open",
        handL: "open",
        lookX: f < BURST ? 0.3 : -0.8,
        headTilt: f > SLAM ? 6 : 0,
      },
    },
  ];
  if (f > BURST + 2)
    cast.push({
      id: "mate",
      look: MATE,
      at: [-0.85, mix(-1.5, -1.2, enter)],
      pose: { ...faceChange([[0, "neutral"], [SLAM + 6, "confused"]], f), lookX: 0.7, gesture: f > SLAM + 6 ? "scratchHead" : undefined },
    });
  return (
    <Stage
      set={
        <Cabin camera={camera} frame={f + 247} night door={door}>
          <Logbook position={BOOK_L} rotation={[0.5, 0.06, 0]} heading={"FOR THE\nCREW"} seed={11} cover="#2a4a6a" />
          <Logbook position={right} rotation={[0.5, -0.06, 0]} heading="TRUE" seed={4} shut={shut} />
          <Burst kind="dust" at={[BOOK_L[0], BOOK_Y + 0.05, BOOK_L[2]]} frame={f - SLAM - 5} count={8} size={0.18} seed={5} colors={["#e8dcc0", "#c8b898"]} />
        </Cabin>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={1.8}
      truth={0.25}
      puppets={cast}
      light={cabinLight(true, f)}
      foreground={<InkBox size={[0.12, 0.04, 0.09]} position={frameSpot({ position: [0.0, 1.5, 1.8], target: [0.0, 0.6, -1.1], fov: 40 }, ASPECT, 0.92, -0.92, 0.8)} rotation={[0, 0.4, 0]} color="#3a2a40" ink={0.004} />}
    />
  );
};

// ---------- 4. The deck (404-547): weeks, no land; October tenth, the crew has had enough ----------

const COL_DECK: [number, number] = [1.35, -0.3];
const S4: React.FC = () => {
  const f = useShotFrame(); // 0..143
  const TENTH = 456 - 404;
  const ENOUGH = 497 - 404;
  const TURN = 513 - 404;
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 2.7, 5.2], target: [0.45, 0.95, -0.6], fov: 40 },
      { at: TENTH, position: [0.35, 2.0, 5.0], target: [0.5, 0.9, -0.5], fov: 40 },
      { at: 142, position: [0.55, 1.6, 4.7], target: [0.55, 0.9, -0.45], fov: 40 },
    ],
    f,
  );
  const stride = ease(f, ENOUGH - 4, TURN + 4);
  const cast: PuppetPlacement[] = [
    {
      id: "mate",
      look: MATE,
      at: [-0.3, -0.95],
      pose: f < TENTH - 6 ? { view: "back", expression: "neutral", reachR: [60, -900], handR: "open" } : { ...faceChange([[0, "sad"], [ENOUGH - TENTH + 6, "angry"]], f - TENTH + 6), lookX: 0.6, gesture: f > ENOUGH ? "armsCrossed" : undefined },
    },
    {
      id: "sailor",
      look: SAILOR,
      at: [mix(0.05, 0.6, stride), mix(0.1, 0.0, stride)],
      pose: {
        ...faceChange([[0, "bored"], [TENTH, "sad"], [ENOUGH - 10, "angry"]], f),
        lookX: f > TENTH ? 0.9 : -0.3,
        ...(f > TURN - 2 ? { reachR: [160, -640], handR: "point" as const, lean: 6 } : f > ENOUGH ? { handR: "fist" as const, handL: "fist" as const } : { gesture: "chin" as const }),
        ...(stride > 0 && stride < 1 ? { stride: f * 1.0, legSwing: Math.sin(f / 3) * 22, bob: -Math.abs(Math.sin(f / 3)) * 12 } : {}),
      },
    },
    {
      id: "columbus",
      look: COLUMBUS,
      at: COL_DECK,
      pose: { ...faceChange([[0, "thinking"], [TURN, "worried"], [TURN + 22, "determined"]], f), lookX: -0.9, gesture: f < TURN ? "handsOnHips" : undefined, reachL: f >= TURN ? [-150, -620] : undefined, handL: "open" },
    },
  ];
  return (
    <>
      <Stage
        set={
          <DeckSet camera={camera} frame={f + 404} mode="dusk" roll={0.012 * Math.sin((f + 404) * 0.045)}>
            <Barrel position={[-1.1, 0, -0.95]} color="#946c46" h={0.5} />
            <RopeCoil position={[0.2, 0, 0.9]} size={0.8} />
            {/* tally marks of the days, cut into the mast */}
            {Array.from({ length: 12 }, (_, i) => (
              <InkBox key={i} size={[0.012, 0.16, 0.01]} position={[DECK.mast[0] - 0.09 + (i % 6) * 0.035, 1.35 - Math.floor(i / 6) * 0.22, DECK.mast[1] + 0.13]} rotation={[0, 0, i % 6 === 5 ? 1.1 : 0]} color="#2a1a10" ink={0} />
            ))}
          </DeckSet>
        }
        camera={camera}
        bg={seaBg("dusk")}
        blur={1.6}
        puppets={cast}
        light={seaLight("dusk")}
        foreground={<RopeCoil position={[-0.85, 0, 2.05]} size={1.0} />}
      />
      <Headline f={f} text="OCTOBER 10" at={TENTH - 6} out={TURN - 4} />
    </>
  );
};

// ---------- 5. The friar's study (547-730): the summary of the log; a later writer's three-day deal ----------

const FRIAR_AT: [number, number] = [-0.36, -0.85];
const WRITER_AT: [number, number] = [0.72, -0.75];
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..183
  const SUMMARY = 599 - 547;
  const LATER = 650 - 547;
  const DAYS = 702 - 547;
  const camera = beatPath(
    [
      { at: 0, position: [-0.55, 1.65, 3.5], target: [0.0, 0.8, -0.8], fov: 40 },
      { at: SUMMARY, position: [-0.3, 1.5, 3.15], target: [0.05, 0.8, -0.8], fov: 40 },
      { at: LATER + 10, position: [0.3, 1.5, 3.0], target: [0.15, 0.82, -0.8], fov: 40 },
      { at: 182, position: [0.45, 1.45, 2.85], target: [0.15, 0.82, -0.8], fov: 40 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    {
      id: "friar",
      look: FRIAR,
      at: FRIAR_AT,
      pose: { sit: true, ...faceChange([[0, "thinking"], [SUMMARY + 20, "happy"]], f), reachR: writing(f, 30, 1.2), handR: "fist", reachL: [-140, -460], handL: "open", lookX: 0.2 },
    },
    {
      id: "writer",
      look: WRITER,
      at: WRITER_AT,
      pose: {
        ...faceChange([[0, "thinking"], [LATER, "smug"], [DAYS, "excited"]], f),
        lookX: -0.5,
        ...(f > DAYS - 4 ? { reachL: [-170, -820] as [number, number], handL: "open" as const, reachR: [120, -560] as [number, number], handR: "fist" as const } : { reachR: writing(f, 60, 0.9), handR: "fist" as const }),
      },
    },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#5a2a20" wall="#8a3a2a" wallPattern="panel" floorPattern="tile" width={6} depth={4.4} stripe="#5a1a14">
          {/* the friar's table with the summary */}
          <WritingTable position={[FRIAR_AT[0], 0, FRIAR_AT[1] + 0.42]} top={0.44} width={0.9} />
          <Stool position={[FRIAR_AT[0], 0, FRIAR_AT[1] - 0.12]} color="#4a2418" />
          <Logbook position={[FRIAR_AT[0], 0.54, FRIAR_AT[1] + 0.4]} rotation={[0.5, 0, 0]} heading={"HE CALMED\nTHEM"} seed={21} cover="#4a2a1a" />
          <Candle position={[FRIAR_AT[0] + 0.36, 0.44, FRIAR_AT[1] + 0.55]} frame={f} />
          {/* the later writer's standing desk, a page held up on it */}
          <InkBox size={[0.08, 0.8, 0.08]} position={[WRITER_AT[0] - 0.5, 0.4, WRITER_AT[1] + 0.3]} color="#4a2418" ink={0.01} />
          <InkBox size={[0.5, 0.04, 0.4]} position={[WRITER_AT[0] - 0.5, 0.82, WRITER_AT[1] + 0.3]} rotation={[0.55, 0, 0]} color="#6a3a22" ink={0.01} />
          <Page position={[WRITER_AT[0] - 0.5, 0.86, WRITER_AT[1] + 0.33]} rotation={[-1.0, 0, 0]} heading={"A DEAL:\n3 MORE DAYS"} size={0.36} seed={9} />
          {/* bookshelves and a crucifix-free plain arch window */}
          <InkBox size={[1.0, 1.8, 0.32]} position={[0.1, 0.9, -2.05]} color="#4a2418" ink={0.012} />
          {[0.35, 0.8, 1.25, 1.7].map((y, r) => (
            <group key={y}>
              <InkBox size={[0.96, 0.03, 0.3]} position={[0.1, y - 0.2, -2.0]} color="#3a1a10" ink={0} />
              {Array.from({ length: 7 }, (_, i) => (
                <InkBox key={i} size={[0.1, 0.3 + ((i + r) % 3) * 0.04, 0.22]} position={[-0.3 + i * 0.13, y - 0.04, -1.98]} color={["#7a2a1a", "#2a4a6a", "#c8a060", "#3a5a2a"][(i + r) % 4]} ink={0.004} />
              ))}
            </group>
          ))}
          <InkBox size={[0.7, 1.0, 0.06]} position={[-1.9, 1.6, -2.15]} color="#f2d890" ink={0.01} emissive="#5a3a10" />
          <pointLight position={[-1.9, 1.6, -1.4]} intensity={1.4} color="#ffd890" distance={4} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={1.6}
      puppets={cast}
      light={{ tint: "#ffe0c8", shadow: 0.2, points: [{ position: [FRIAR_AT[0] + 0.36, 0.7, FRIAR_AT[1] + 0.55], color: "#ffb060", strength: 1.8, range: 2 }], distant: [{ direction: [-0.8, 0.4, 0.2], color: "#ffe0a0", strength: 0.9 }] }}
      foreground={
        <group position={frameSpot({ position: [-0.55, 1.65, 3.5], target: [0.0, 0.8, -0.8], fov: 40 }, ASPECT, -0.85, -0.9, 1.3)}>
          <InkBox size={[0.3, 0.08, 0.22]} color="#7a2a1a" ink={0.006} />
          <InkBox size={[0.28, 0.07, 0.2]} position={[0.02, 0.075, 0]} rotation={[0, 0.3, 0]} color="#2a4a6a" ink={0.006} />
        </group>
      }
    />
  );
};

// ---------- 6. Clues in the water (730-809): the carved stick floats in and is hooked up out of the water ----------

const SAILOR_RAIL: [number, number] = [-0.28, -1.12];
const MATE_RAIL: [number, number] = [0.52, -1.12];
const LVL = DECK.water;
const stickFloat = (fr: number): Vec3 => {
  const t = ease(fr, 730, 790);
  const x = mix(-1.6, -0.45, t);
  const z = mix(-3.6, -2.2, t);
  return [x, LVL + seaY(x, z, fr) + 0.02, z];
};
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..79
  const fr = f + 730;
  const STICK = 787 - 730;
  const HOOK = 790 - 730;
  const camera = beatPath(
    [
      { at: 0, position: [-1.7, -1.1, -5.6], target: [-1.3, -1.62, -3.4], fov: 40 },
      { at: STICK, position: [-0.75, -1.15, -4.3], target: [-0.55, -1.62, -2.6], fov: 40 },
      { at: 78, position: [-0.55, -1.0, -4.1], target: [-0.45, -1.45, -2.4], fov: 40 },
    ],
    f,
  );
  // a boathook comes down from the rail above and lifts the stick out
  const lift = ease(f, HOOK + 4, 79);
  const st = stickFloat(Math.min(fr, 790));
  const stick: Vec3 = [st[0], st[1] + lift * 1.6, st[2] + lift * 0.4];
  const hookTip: Vec3 = f < HOOK ? [mix(-0.2, st[0] + 0.05, ease(f, HOOK - 18, HOOK)), mix(1.2, st[1] + 0.05, ease(f, HOOK - 18, HOOK)), mix(-1.6, st[2], ease(f, HOOK - 18, HOOK))] : [stick[0] + 0.05, stick[1] + 0.05, stick[2]];
  return (
    <Stage
      set={
        <DeckSet camera={camera} frame={fr} mode="teal" roll={0}>
          <group userData={{ ghost: true }}>
            <CarvedStick length={0.9} position={stick} rotation={[0, 0.6 + Math.sin(fr * 0.04) * 0.1 * (1 - lift), lift * 0.3]} />
            <Cord a={[-0.15, 1.3, -1.5]} b={hookTip} width={0.035} color="#8a6a44" />
            <BerryBranch position={[1.0, LVL + seaY(1.0, -2.6, fr) + 0.03, -2.6]} rotation={[0, -0.4 + Math.sin(fr * 0.03) * 0.15, 0]} size={1.6} />
            <Burst kind="dust" at={[st[0], LVL + 0.02, st[2]]} frame={f - HOOK - 4} count={10} size={0.3} seed={12} colors={["#ffffff", "#c8f0ec"]} />
          </group>
        </DeckSet>
      }
      camera={camera}
      bg={seaBg("teal")}
      blur={1.4}
      light={seaLight("teal")}
      foreground={<InkBox size={[0.6, 0.12, 0.14]} position={[-1.15, LVL + seaY(-1.15, -5.0, fr) + 0.03, -5.0]} rotation={[0, 0.5, Math.sin(fr * 0.05) * 0.05]} color="#7a5232" ink={0.008} />}
    />
  );
};

// ---------- 6b. The rail (809-898, a hard cut): he hooks the berry branch, nearly goes over, his mate grabs him;
// "Look! Someone carved this!" ----------

const S6B: React.FC = () => {
  const f = useShotFrame(); // 0..89
  const fr = f + 809;
  const TOPPLE = 822 - 809;
  const GRAB = TOPPLE + 4;
  const SAVED = GRAB + 14;
  const LOOK = 846 - 809;
  const camera = beatPath(
    [
      { at: 0, position: [0.45, 1.2, -5.0], target: [0.2, 0.75, -1.4], fov: 44 },
      { at: LOOK, position: [0.3, 1.25, -4.65], target: [0.15, 0.85, -1.4], fov: 44 },
      { at: 88, position: [0.2, 1.3, -4.4], target: [0.12, 0.9, -1.4], fov: 44 },
    ],
    f,
  );
  const air = 260;
  const lean = f < TOPPLE ? ease(f, 0, TOPPLE) * 12 : f < SAVED ? 12 + ease(f, TOPPLE, GRAB + 2) * 16 - ease(f, GRAB + 2, SAVED) * 20 : 6;
  const reachR: [number, number] = f < LOOK - 3 ? [-170, mix(-520, -330, ease(f, 0, TOPPLE))] : [150, -900];
  const reachL: [number, number] = f < LOOK - 3 ? [60, -470] : [-150, -560];
  const hand = handWorld(SAILOR_RAIL, reachR, camera);
  const handL = handWorld(SAILOR_RAIL, reachL, camera);
  const up = air * K;
  // the branch: hooked at TOPPLE, swung up onto the rail by SAVED
  const bfloat: Vec3 = [0.35, LVL + seaY(0.35, -2.0, fr) + 0.03, -2.0];
  const bp = ease(f, GRAB, SAVED + 6);
  const branch: Vec3 = [mix(bfloat[0], 0.7, bp), mix(bfloat[1], DECK.rail + 0.12, bp), mix(bfloat[2], DECK.far - 0.02, bp)];
  const hookTip: Vec3 = f < TOPPLE ? [mix(hand[0] - 0.3, bfloat[0], ease(f, 0, TOPPLE)), mix(hand[1] + up - 1.0, bfloat[1] + 0.05, ease(f, 0, TOPPLE)), mix(-1.7, bfloat[2], ease(f, 0, TOPPLE))] : [branch[0] - 0.05, branch[1] + 0.04, branch[2]];
  const showHook = f < LOOK - 4;
  const stick: Vec3 = f < LOOK - 3 ? [handL[0] - 0.02, handL[1] + up - 0.05, handL[2] - 0.06] : [hand[0], hand[1] + up + 0.05, hand[2] - 0.06];
  const cast: PuppetPlacement[] = [
    {
      id: "sailor",
      look: SAILOR,
      at: SAILOR_RAIL,
      pose: {
        view: "front",
        air,
        ...faceChange([[0, "determined"], [TOPPLE, "shocked"], [SAVED, "happy"], [LOOK, "excited"]], f),
        lean: -lean,
        reachR,
        handR: "fist",
        reachL,
        handL: "fist",
        lookX: f < LOOK ? -0.5 : 0.3,
      },
    },
    {
      id: "mate",
      look: MATE,
      at: MATE_RAIL,
      pose: {
        view: "front",
        air: 220,
        ...faceChange([[0, "neutral"], [TOPPLE + 1, "shocked"], [SAVED + 4, "happy"]], f),
        reachL: f > TOPPLE + 1 && f < SAVED + 8 ? [-300, -560] : [-120, -500],
        handL: f > TOPPLE + 1 && f < SAVED + 8 ? "fist" : "open",
        frontL: f > TOPPLE + 1 && f < SAVED + 8,
        lean: f > GRAB && f < SAVED + 8 ? 12 : 0,
        lookX: -0.8,
      },
    },
  ];
  return (
    <Stage
      set={
        <DeckSet camera={camera} frame={fr} mode="teal" roll={0}>
          <group userData={{ ghost: true }}>
            <CarvedStick length={0.6} position={stick} rotation={[0, 0, f < LOOK - 3 ? 0.15 : 0.7]} />
            {showHook && <Cord a={[hand[0], hand[1] + up, hand[2] - 0.04]} b={hookTip} width={0.035} color="#8a6a44" />}
            <BerryBranch position={branch} rotation={[0, -0.4 + Math.sin(fr * 0.03) * 0.15 * (1 - bp), bp * 0.2]} size={1.4} />
            <Burst kind="dust" at={[bfloat[0], LVL + 0.03, bfloat[2]]} frame={f - GRAB} count={10} size={0.3} seed={14} colors={["#ffffff", "#c8f0ec"]} />
          </group>
        </DeckSet>
      }
      camera={camera}
      bg={seaBg("teal")}
      blur={1.2}
      puppets={cast}
      light={seaLight("teal")}
      foreground={<InkBox size={[0.6, 0.12, 0.14]} position={[0.95, LVL + seaY(0.95, -4.6, fr) + 0.03, -4.6]} rotation={[0, -0.5, Math.sin(fr * 0.05) * 0.05]} color="#7a5232" ink={0.008} />}
    />
  );
};

// ---------- 7. 2 a.m. (898-1019): the Pinta's lookout in the crow's nest, the moonlit cliff ----------

const NEST_LVL = -14;
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..121
  const fr = f + 898;
  const SHOUT = 976 - 898;
  const SPOT = 941 - 898;
  const camera = beatPath(
    [
      { at: 0, position: [1.5, -0.6, 3.3], target: [0.15, 0.72, 0], fov: 42 },
      { at: SPOT, position: [1.5, 0.35, 3.0], target: [0.1, 0.75, -0.2], fov: 42 },
      { at: 120, position: [1.55, 1.15, 2.7], target: [-0.7, 0.75, -1.6], fov: 42 },
    ],
    f,
  );
  const jumpUp = f > SHOUT ? Math.abs(Math.sin((f - SHOUT) * 0.22)) * 60 * Math.exp(-(f - SHOUT) / 40) : 0;
  const cast: PuppetPlacement[] = [
    {
      id: "lookout",
      look: LOOKOUT,
      at: [0, 0.05],
      pose: {
        ...faceChange([[0, "bored"], [SPOT - 12, "shocked"], [SHOUT - 4, "excited"]], f),
        lookX: f > SPOT - 12 ? -0.9 : 0.2,
        air: jumpUp,
        ...(f > SPOT - 4 ? { reachL: [-300, -820] as [number, number], handL: "point" as const, reachR: f > SHOUT ? ([120, -1040] as [number, number]) : undefined, handR: "open" as const } : { gesture: "chin" as const }),
      },
    },
  ];
  return (
    <>
      <Stage
        set={
          <SeaSet camera={camera} frame={fr} mode="night" level={NEST_LVL} chop={1.2}>
            <CrowsNest frame={fr} />
            <MoonCliff position={[-34, NEST_LVL, -70]} width={40} />
            <Ship kind="nao" at={[10, -26]} heading={-Math.PI / 2 - 0.3} frame={fr} level={NEST_LVL} scale={1.2} />
            <HangLantern position={[0.38, 1.1, 0.0]} frame={fr} drop={0.25} on={0.8} />
          </SeaSet>
        }
        camera={camera}
        bg={seaBg("night")}
        blur={1.4}
        puppets={cast}
        light={seaLight("night", { position: [0.38, 0.72, 0.0], strength: 1.6 })}
        foreground={<InkCylinder radius={0.03} height={1.6} position={frameSpot({ position: [1.5, -0.6, 3.3], target: [0.15, 0.72, 0], fov: 42 }, ASPECT, 0.85, 0.1, 1.0)} rotation={[0, 0, -0.5]} color="#2a2018" ink={0.004} />}
      />
      <Headline f={f} text="2 A.M., OCTOBER 12" at={4} out={70} size={70} />
    </>
  );
};

// ---------- 8. What if (1019-1166): the ships turn back; Portugal reaches Brazil in 1500 ----------

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..147
  const fr = f + 1019;
  const TURNED = 1048 - 1019;
  const ELSE = 1069 - 1019;
  const BRAZIL = 1124 - 1019;
  const camera = beatPath(
    [
      { at: 0, position: [2.6, 2.4, 9.0], target: [2.4, 1.6, -6], fov: 40 },
      { at: ELSE, position: [0.6, 2.4, 8.6], target: [0.0, 1.6, -6], fov: 40 },
      { at: 146, position: [-4.2, 2.1, 7.0], target: [-6.0, 1.7, -7], fov: 40 },
    ],
    f,
  );
  const turn = ease(f, TURNED - 6, TURNED + 34);
  const heading = mix(-Math.PI / 2, Math.PI / 2, turn);
  const home = Math.max(0, f - TURNED - 20) * 0.015;
  const fleet: { kind: "nao" | "caravel"; at: [number, number]; s: number }[] = [
    { kind: "nao", at: [2.4 + home, -6], s: 1 },
    { kind: "caravel", at: [-0.8 + home, -10], s: 0.95 },
    { kind: "caravel", at: [5.6 + home, -11], s: 0.9 },
  ];
  const pX = mix(-1.0, -6.2, ease(f, ELSE - 20, 146));
  return (
    <>
      <Stage
        set={
          <SeaSet camera={camera} frame={fr} mode="violet">
            {fleet.map((s, i) => (
              <Ship key={i} kind={s.kind} at={s.at} heading={heading} frame={fr} phase={i * 30} scale={s.s} />
            ))}
            <Ship kind="caravel" at={[pX, -7.5]} heading={-Math.PI / 2 + 0.25} frame={fr} phase={70} scale={1.0} />
            <Wake at={[pX, -7.5]} heading={-Math.PI / 2 + 0.25} frame={fr} />
            <GreenIsland position={[-22, 0, -42]} width={36} frame={fr} />
            <Label text="PORTUGAL" position={[pX + 0.2, 0.9, -5.6]} width={1.4} appear={f - BRAZIL + 6} bg="#2a7a4a" fg="#ffffff" />
          </SeaSet>
        }
        camera={camera}
        bg={seaBg("violet")}
        blur={1.2}
        truth={0}
        light={seaLight("violet")}
        focus={14}
        foreground={<Barrel position={frameSpot({ position: [2.6, 2.4, 9.0], target: [2.4, 1.6, -6], fov: 40 }, ASPECT, 0.85, -0.85, 2.0)} color="#6a4a6a" h={0.5} />}
      />
      <Headline f={f} text="WHAT IF?" at={2} out={ELSE} />
      <Headline f={f} text="BRAZIL, 1500" at={BRAZIL} out={150} />
    </>
  );
};

// ---------- 9. The great swap (1166-1437): potatoes and cacao go east, smallpox goes west; the west's lamps go out ----------

const TABLE_X = 1.0;
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..271
  const fr = f + 1166;
  const POT = 1249 - 1166;
  const CHOC = 1264 - 1166;
  const EAST = 1280 - 1166;
  const POX = 1303 - 1166;
  const WEST = 1317 - 1166;
  const WAR = 1341 - 1166;
  const KILLED = 1379 - 1166;
  // one wide view the whole time (both people always whole), a slow crane down and push
  const camera = beatPath(
    [
      { at: 0, position: [0.0, 2.7, 6.5], target: [0.0, 0.9, -0.6], fov: 42 },
      { at: POT, position: [-0.15, 2.0, 5.8], target: [-0.1, 0.9, -0.6], fov: 42 },
      { at: EAST + 6, position: [0.15, 1.85, 5.5], target: [0.1, 0.9, -0.6], fov: 42 },
      { at: WEST + 10, position: [-0.1, 1.8, 5.3], target: [-0.1, 0.92, -0.6], fov: 42 },
      { at: 270, position: [-0.2, 1.7, 5.0], target: [-0.15, 0.95, -0.6], fov: 42 },
    ],
    f,
  );
  const pot = ease(f, POT, CHOC + 22);
  const pox = ease(f, POX, WEST + 14);
  const dark = ease(f, WAR, KILLED + 40);
  const lamps = [-0.95, -0.75, -0.55, -0.35, -0.15].map((x, i) => ({ x, on: 1 - ease(f, WAR + i * 12, WAR + i * 12 + 8) }));
  const top = 0.62;
  const cacaoOn = f >= CHOC - 8;
  const cast: PuppetPlacement[] = [
    {
      id: "taino",
      look: TAINO,
      at: [-0.85, -1.3],
      pose: {
        ...faceChange([[0, "happy"], [POX + 20, "worried"], [WAR + 10, "sad"]], f),
        lookX: f < POX ? 0.6 : 0.4,
        ...(f > POT - 20 && f < CHOC + 4 ? { reachR: [190, -500] as [number, number], handR: "open" as const } : {}),
      },
    },
    {
      id: "merchant",
      look: MERCHANT,
      at: [0.92, -1.3],
      pose: {
        ...faceChange([[0, "neutral"], [EAST - 6, "happy"], [WAR + 20, "worried"]], f),
        lookX: -0.6,
        ...(f > EAST - 10 && f < EAST + 24 ? { reachL: [-190, -500] as [number, number], handL: "open" as const } : f > POX - 16 && f < POX + 4 ? { reachL: [-200, -480] as [number, number], handL: "open" as const } : {}),
      },
    },
  ];
  const px = mix(-0.55, 0.3, pot);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#4a6a7a" wall="#3fa89c" wallPattern="plaster" floorPattern="tile" width={6} depth={4} stripe="#2a6a64">
          {/* the long trading table, a blue sea cloth down its middle */}
          <InkBox size={[TABLE_X * 2 + 0.3, 0.06, 0.7]} position={[0, top - 0.03, -0.5]} color="#8a5a32" ink={0.012} />
          {[-1, 1].map((s) => (
            <InkBox key={s} size={[0.08, top - 0.06, 0.55]} position={[s * TABLE_X, (top - 0.06) / 2, -0.5]} color="#5a3420" ink={0.01} />
          ))}
          <InkBox size={[0.5, 0.005, 0.68]} position={[0, top + 0.003, -0.5]} color="#3a7ab0" ink={0} />
          <Label text="WEST" position={[-0.9, 2.05, -1.94]} width={0.6} bg="#f6e8c8" />
          <Label text="EAST" position={[0.9, 2.05, -1.94]} width={0.6} bg="#f6e8c8" />
          {/* potatoes, with the cacao set on top, slide east; smallpox is set down mid-table and slides west */}
          <group position={[px, top, -0.4]}>
            <Crate position={[0, 0, 0]} label="POTATOES" contents="#c8a060" size={[0.5, 0.3, 0.34]} />
            {cacaoOn && <Crate position={[0.02, 0.3 + Math.max(0, CHOC - f) * 0.03, 0]} label="CACAO" color="#9a6a42" contents="#6a3a1a" size={[0.44, 0.26, 0.3]} />}
          </group>
          {f > POX - 14 && <Crate position={[mix(-0.25, -0.55, pox), top + Math.max(0, POX - f) * 0.02, -0.4]} label="SMALLPOX" color="#4a4a52" card="#d8d8d0" size={[0.5, 0.32, 0.34]} />}
          {/* the west's lamps on a wall shelf behind the table */}
          <InkBox size={[1.1, 0.04, 0.22]} position={[-0.55, 1.28, -1.86]} color="#6a4428" ink={0.008} />
          {lamps.map((l, i) => (
            <group key={i} position={[l.x, 1.3, -1.82]} scale={1.35}>
              <OilLamp position={[0, 0, 0]} on={l.on} frame={fr} />
            </group>
          ))}
          <InkBox size={[0.6, 0.8, 0.06]} position={[1.9, 1.6, -1.95]} color="#f2d890" ink={0.01} emissive="#5a3a10" />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={1.2}
      truth={dark * 0.75}
      puppets={cast}
      light={{ tint: "#f4f8f0", shadow: 0.18, distant: [{ direction: [-0.5, 0.6, 0.6], color: "#fff4dc", strength: 1.0 * (1 - dark * 0.6) }] }}
      foreground={<InkCylinder radius={0.12} height={0.6} position={frameSpot({ position: [0.0, 2.7, 6.5], target: [0.0, 0.9, -0.6], fov: 42 }, ASPECT, 0.9, -0.95, 1.8)} color="#7a5232" ink={0.008} />}
    />
  );
};

// ---------- 10. Dawn (1437-1584): a lie, one tense night, a few twigs; the island at sunrise ----------

const S10: React.FC = () => {
  const f = useShotFrame(); // 0..147
  const fr = f + 1437;
  const TWIGS = 1507 - 1437;
  const camera = beatPath(
    [
      { at: 0, position: [0.6, 0.35, 3.2], target: [0.3, 0.0, 0.0], fov: 40 },
      { at: TWIGS, position: [0.5, 0.6, 3.6], target: [0.2, 0.2, -1.0], fov: 40 },
      { at: 146, position: [-0.4, 2.6, 6.2], target: [0.0, 2.2, -12], fov: 40 },
    ],
    f,
  );
  const twig: [number, number] = [0.25, -0.2];
  return (
    <Stage
      set={
        <SeaSet camera={camera} frame={fr} mode="dawn">
          <BerryBranch position={[twig[0], seaY(twig[0], twig[1], fr) + 0.03, twig[1]]} rotation={[0, 0.5 + Math.sin(fr * 0.03) * 0.1, 0]} size={1.2} />
          <CarvedStick position={[-0.35, seaY(-0.35, -0.6, fr) + 0.02, -0.6]} rotation={[0, -0.4, 0]} length={0.6} />
          <Ship kind="nao" at={[-1.5, -16]} heading={-Math.PI / 2 + 0.2} frame={fr} />
          <Ship kind="caravel" at={[3.8, -20]} heading={-Math.PI / 2 + 0.2} frame={fr} phase={30} scale={0.95} />
          <Ship kind="caravel" at={[-6.8, -21]} heading={-Math.PI / 2 + 0.2} frame={fr} phase={60} scale={0.9} />
          <GreenIsland position={[-6, 0, -55]} width={46} frame={fr} />
        </SeaSet>
      }
      camera={camera}
      bg={seaBg("dawn")}
      blur={1.4}
      light={seaLight("dawn")}
      foreground={<InkBox size={[0.5, 0.1, 0.12]} position={[-0.75, seaY(-0.75, 1.6, fr) + 0.02, 1.6]} rotation={[0, -0.3, 0]} color="#6a4a32" ink={0.006} />}
    />
  );
};

// ---------- 11. The reward (1584-1695): the lookout holds out his hand; Columbus points at "his" light and pockets the purse ----------

const S11: React.FC = () => {
  const f = useShotFrame(); // 0..111
  const fr = f + 1584;
  const LIGHT = 1640 - 1584;
  const KEPT = 1662 - 1584;
  const camera = beatPath(
    [
      { at: 0, position: [-0.2, 1.6, 3.9], target: [0.1, 1.05, -0.5], fov: 40 },
      { at: 110, position: [0.05, 1.35, 2.85], target: [0.15, 0.98, -0.5], fov: 40 },
    ],
    f,
  );
  const LOOK_AT: [number, number] = [-0.45, -0.35];
  const COL_AT2: [number, number] = [0.65, -0.4];
  const pocket = ease(f, KEPT - 4, KEPT + 10);
  const colReachR: [number, number] = [mix(-120, 40, pocket), mix(-640, -520, pocket)];
  const hand = handWorld(COL_AT2, colReachR, camera);
  const cast: PuppetPlacement[] = [
    {
      id: "lookout",
      look: LOOKOUT,
      at: LOOK_AT,
      pose: { ...faceChange([[0, "excited"], [LIGHT, "confused"], [KEPT + 4, "shocked"]], f), reachR: [190, -600], handR: "open", lookX: 0.8 },
    },
    {
      id: "columbus",
      look: COLUMBUS,
      at: COL_AT2,
      pose: {
        ...faceChange([[0, "neutral"], [LIGHT - 14, "smug"], [KEPT + 6, "happy"]], f),
        reachR: colReachR,
        handR: "fist",
        frontR: pocket > 0.5,
        ...(f > LIGHT - 16 && f < KEPT ? { reachL: [-90, -1150] as [number, number], handL: "point" as const } : { reachL: [-130, -560] as [number, number], handL: "open" as const }),
        lookX: f > LIGHT - 16 && f < KEPT ? -0.2 : -0.7,
        headTilt: f > LIGHT - 16 && f < KEPT ? -8 : 0,
      },
    },
  ];
  return (
    <Stage
      set={
        <DeckSet camera={camera} frame={fr} mode="morning" roll={0.01 * Math.sin(fr * 0.05)}>
          <GreenIsland position={[-4, DECK.water, -38]} width={40} frame={fr} />
          <group userData={{ ghost: true }}>{pocket < 0.85 && <Purse position={[hand[0], hand[1] - 0.06, hand[2] + 0.04]} scale={0.9} />}</group>
          <Label text={"10,000\nMARAVEDIS"} position={[0.1, 1.72, -0.3]} width={0.6} appear={f - 6} bg="#f6e8c8" />
        </DeckSet>
      }
      camera={camera}
      bg={seaBg("morning")}
      blur={1.5}
      puppets={cast}
      light={seaLight("morning")}
      foreground={<RopeCoil position={frameSpot({ position: [-0.2, 1.6, 3.9], target: [0.1, 1.05, -0.5], fov: 40 }, ASPECT, -0.85, -0.95, 1.5)} size={0.9} />}
    />
  );
};

// [from, to, shot, transition in]
const SHOTS: Shot[] = [
  [0, 119, S1, false],
  [119, 247, S2, "dip"],
  [247, 404, S3, "dip"],
  [404, 547, S4, "dip"],
  [547, 730, S5, "dip"],
  [730, 809, S6, "dip"],
  [809, 898, S6B, false],
  [898, 1019, S7, "dip"],
  [1019, 1166, S8, "dip"],
  [1166, 1437, S9, "dip"],
  [1437, 1584, S10, "dip"],
  [1584, TIMING.totalFrames, S11, "dip"],
];

// ---------- sound ----------

// Foley takes with a level per cue (from the mix report), a different take on each.
const fc = (name: string, frames: number[], vols: number[], opts: Parameters<typeof foleyCues>[3]): Sfx[] =>
  foleyCues(name, frames, 1, opts).map((c, i) => ({ ...c, volume: c.volume * vols[i] }));

const SFX: Sfx[] = [
  // 1. the cabin: timbers creak, the quill scratches, a page turns
  { at: 0, src: sfx("creak"), volume: 0.028, until: 119 },
  ...fc("scrape", [8, 66, 100], [0.36, 0.26, 0.37], { space: "room" }),
  { at: 36, src: sfx("paper"), volume: 0.32, space: "room" },
  // 2. departure: wind and sea wash
  { at: 119, src: sfx("wind"), volume: 0.033, until: 247 },
  { at: 119, src: sfx("river"), volume: 0.022, until: 247 },
  { at: 180, src: sfx("creak"), volume: 0.42, space: "outdoor" },
  // 3. the pivot: sting, the quill, the door bursts, the book slams
  { at: 251, src: sfx("sting"), volume: 0.39 },
  { at: 247, src: sfx("creak"), volume: 0.022, until: 404 },
  ...fc("scrape", [262, 328], [0.42, 0.4], { space: "room" }),
  { at: 370, src: sfx("door"), volume: 0.1, space: "room" },
  ...foleyCues("thud", [381], 0.75, { space: "room" }),
  // 4. the deck at dusk: wind, a creak, the sailor's stamp across the planks
  { at: 404, src: sfx("wind"), volume: 0.039, until: 547 },
  { at: 404, src: sfx("river"), volume: 0.017, until: 547 },
  { at: 420, src: sfx("creak"), volume: 0.3, space: "outdoor" },
  ...fc("thud", [500, 507], [0.74, 0.83], { space: "outdoor" }),
  // 5. the study: quills, the page
  ...fc("scrape", [560, 640], [0.5, 0.3], { space: "room" }),
  { at: 690, src: sfx("paper"), volume: 0.28, space: "room" },
  // 6. clues: sea wash, the hook, the topple, the grab
  { at: 730, src: sfx("river"), volume: 0.033, until: 898 },
  { at: 730, src: sfx("wind"), volume: 0.022, until: 898 },
  { at: 794, src: sfx("splash"), volume: 0.43, space: "outdoor" },
  { at: 822, src: sfx("splash"), volume: 0.29, space: "outdoor" },
  { at: 823, src: sfx("whoosh"), volume: 0.22, space: "outdoor" },
  ...fc("thud", [835, 841], [0.55, 0.64], { space: "outdoor" }),
  // 7. 2 a.m.: night wind, the mast creaks, the lantern
  { at: 898, src: sfx("wind"), volume: 0.044, until: 1019 },
  { at: 920, src: sfx("creak"), volume: 0.31, space: "outdoor" },
  // 8. what if: the ships come about
  { at: 1019, src: sfx("wind"), volume: 0.028, until: 1166 },
  { at: 1043, src: sfx("whoosh"), volume: 0.3, space: "outdoor" },
  { at: 1118, src: sfx("pop"), volume: 0.11, space: "outdoor" },
  // 9. the swap: crates slide and land, the lamps go out
  ...fc("scrape", [1250, 1266, 1304], [0.58, 0.14, 0.5], { space: "room" }),
  ...fc("thud", [1278, 1293, 1331], [0.1, 0.15, 0.42], { space: "room" }),
  // 10. dawn: sea, wind, creaks
  { at: 1437, src: sfx("river"), volume: 0.028, until: 1584 },
  { at: 1437, src: sfx("wind"), volume: 0.028, until: 1584 },
  { at: 1520, src: sfx("creak"), volume: 0.29, space: "outdoor" },
  // 11. the reward: the label pops, coins jingle into his vest
  { at: 1584, src: sfx("wind"), volume: 0.028, until: TIMING.totalFrames },
  { at: 1591, src: sfx("pop"), volume: 0.15, space: "outdoor" },
  ...fc("jingle", [1600, 1660], [0.11, 0.5], { space: "outdoor" }),
];

const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 404, volume: 0.2 },
  { src: "music/tension.wav", from: 404, to: 1019, volume: 0.22 },
  { src: "music/mystery.wav", from: 1019, to: 1437, volume: 0.22 },
  { src: "music/lounge.wav", from: 1437, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
