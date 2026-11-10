import React from "react";
import {
  Board,
  Burst,
  CameraShot,
  Counter,
  Desk,
  Door,
  faceChange,
  foleyCues,
  Foliage,
  frameSpot,
  handWorld,
  HEAD_Y,
  HIP_HEIGHT,
  InkBox,
  InkCylinder,
  jump,
  Label,
  Lamp,
  MUSIC_FILES,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  SmokePlume,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Video,
  Window,
  beatPath,
  moodBackground,
} from "../../engine";
import { GOLD_BG, goldLight, GoldCountrySet } from "../../three/GoldCountrySet";
import { TOWN_BG, townLight, WesternTownSet } from "../../three/WesternTownSet";
import { FlyingHat } from "../niagara-silent/props";
import { Coach, Handkerchief, HangingShirt, Ledger, Poem, Rifle, SackHead, Shotgun, Stamp, Strongbox } from "./props";
import TIMING_JSON from "./timing.json";

// "The Gentleman Bandit Caught by His Laundry": Black Bart robbed at least 28 stagecoaches with a sack over his head
// and never fired a shot; in 1883 he fled a holdup under fire and dropped a handkerchief with the laundry mark
// F.X.O.7, which the detectives carried from laundry to laundry until a clerk read it in his book: Mr Bolton.
// Sets: GoldCountrySet (new; the Sierra foothills, Codex-painted hills), WesternTownSet in its fog mode (a San
// Francisco street), and Room interiors.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "black-bart";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const UNITS = 1060 / 1.3;
const ASPECT = 9 / 16;
const yawTo = (from: [number, number], cam: CameraShot) => Math.atan2(cam.position[0] - from[0], cam.position[2] - from[1]);

// ---------- cast ----------

const BANDIT: PuppetLook = { skin: "#e8c0a0", hair: "#c8c8c8", outfit: "#3a3430", vest: "#5a4a3a", beard: "#ececec" };
const BOLTON: PuppetLook = { skin: "#e8c0a0", hair: "#c8c8c8", outfit: "#f6f6f4", vest: "#6a6a74", beard: "#ececec" };
const BOLTON_ROBE: PuppetLook = { ...BOLTON, outfit: "#7a2a3a", vest: "#5a1a2a" };
const DRIVER: PuppetLook = { skin: "#d8a47a", hair: "#5a3a24", outfit: "#a07a4a", hat: "#6a4a2a", beard: "#5a3a24" };
const ROLLERI: PuppetLook = { skin: "#f0c8a0", hair: "#3a2414", outfit: "#e8e0d0", suspenders: "#5a3a24", hat: "#d8c08a", hatStyle: "boater" };
const HUME: PuppetLook = { skin: "#e0b890", hair: "#4a3020", outfit: "#7a5a3a", vest: "#4a3a2a", hat: "#2a2018", hatStyle: "bowler" };
const MORSE: PuppetLook = { skin: "#e8c8a8", hair: "#6a6a6a", outfit: "#5a6070", vest: "#3a3e48", hat: "#2a2a30", hatStyle: "bowler", beard: "#6a6a6a" };
const CLERK: PuppetLook = { skin: "#f0c8a0", hair: "#a05a2a", outfit: "#f4f0e6", apron: "#e8e4d8", suspenders: "#3a5a7a" };

const lampLight = (points: [number, number, number][], tint = "#ffd8a0", extra: PuppetLight["distant"] = []): PuppetLight => ({
  tint,
  tintAmount: 0.08,
  shadow: 0.22,
  points: points.slice(0, 2).map((p) => ({ position: p, color: "#ffc070", strength: 1.8, range: 3.0 })),
  distant: extra,
});

// The sack-headed bandit's head piece follows the puppet; it turns toward the camera by `turn` (0 profile .. 1 front).
const sackFor = (at: [number, number], camera: CameraShot, facing: 1 | -1, turn = 0.55, air = 0) => {
  const toCam = yawTo(at, camera);
  const profile = toCam + (facing === 1 ? Math.PI / 2 : -Math.PI / 2);
  const yaw = profile + (toCam - profile) * turn;
  const off = 0.04;
  return <SackHead at={[at[0] + Math.sin(toCam) * off, HEAD_Y + 0.02 + air / UNITS, at[1] + Math.cos(toCam) * off]} yaw={yaw} />;
};

// ---------- 1. The road: the coach stopped, the bandit with the sack, the box thrown down ----------

const COACH_X = -1.6;
const BART_ROAD: [number, number] = [2.8, 0.75];
const DRIVER_AT: [number, number] = [COACH_X + 1.05, 0];
const DRIVER_AIR = (1.56 - HIP_HEIGHT) * UNITS;

const S1: React.FC = () => {
  const f = useShotFrame(); // 0..259
  const camera = beatPath(
    [
      { at: 0, position: [-0.6, 4.2, 10.5], target: [0.2, 0.8, -1.0], fov: 44 },
      { at: 100, position: [3.4, 1.45, 5.6], target: [1.6, 1.0, 0.0], fov: 42 },
      { at: 200, position: [4.3, 1.1, 4.1], target: [2.45, 1.05, 0.4], fov: 40 },
      { at: 258, position: [4.4, 1.05, 3.9], target: [2.5, 1.05, 0.4], fov: 40 },
    ],
    f,
  );
  // the strongbox: thrown from the driver's box at 236, lands on the road by Bart's boot at 250
  const THROW = 236, LAND = 250;
  const tb = ramp(f, THROW, LAND);
  const boxAt: [number, number, number] =
    f < THROW ? [DRIVER_AT[0] + 0.1, 1.6, 0.3] : [mix(DRIVER_AT[0] + 0.1, BART_ROAD[0] - 0.4, tb), mix(1.6, 0, tb) + Math.sin(tb * Math.PI) * 0.7, mix(0.3, BART_ROAD[1] + 0.25, tb)];
  const hop = f >= LAND ? jump(f, LAND + 1, 60, 16) : {};
  const grip = handWorld(BART_ROAD, [-170, -560], camera);
  const fg = frameSpot({ position: [-0.6, 4.2, 10.5], target: [0.2, 0.8, -1.0], fov: 44 }, ASPECT, 0.75, -0.8, 2.5);
  const cast: PuppetPlacement[] = [
    {
      id: "bart",
      look: BANDIT,
      at: BART_ROAD,
      pose: { expression: "neutral", view: "side", facing: -1, reachR: [-220, -560], handR: "fist", reachL: [-120, -540], handL: "fist", ...(f >= LAND ? { expression: "shocked" as const, ...hop } : {}) },
    },
    {
      id: "driver",
      look: DRIVER,
      at: DRIVER_AT,
      pose: { expression: f < THROW ? "worried" : "awkward", sit: true, air: DRIVER_AIR, view: "front", armL: [160, -10], armR: f < THROW - 6 ? [160, -10] : [110, -40], handL: "open", handR: "open", lookX: 0.7 },
    },
  ];
  return (
    <Stage
      set={
        <GoldCountrySet camera={camera} frame={f} mode="day">
          <Coach x={COACH_X} />
          {sackFor(BART_ROAD, camera, -1, 0.82, (hop as PuppetPose).air ?? 0)}
          <Shotgun at={grip} yaw={Math.PI} pitch={0.08} />
          {f < LAND + 40 && <Strongbox position={boxAt} rotation={[0, 0.3 + tb * 0.6, f < THROW ? 0 : (1 - tb) * 1.2]} scale={0.8} />}
          {f >= LAND + 40 && <Strongbox position={[BART_ROAD[0] - 0.4, 0, BART_ROAD[1] + 0.25]} rotation={[0, 0.9, 0]} scale={0.8} />}
          <Burst kind="dust" at={[BART_ROAD[0] - 0.4, 0.02, BART_ROAD[1] + 0.25]} frame={f - LAND} count={14} size={0.8} seed={3} />
          <Burst kind="stars" at={[BART_ROAD[0], HEAD_Y + 0.3, BART_ROAD[1]]} frame={f - LAND - 2} count={6} size={0.5} seed={4} />
        </GoldCountrySet>
      }
      camera={camera}
      bg={GOLD_BG.day}
      blur={2.2}
      puppets={cast}
      light={goldLight("day")}
      foreground={<Foliage position={fg} size={0.5} color="#8a8a3a" seed={7} />}
    />
  );
};

// ---------- 2. The ridge: a poem on the open strongbox, the bandit walks off into the hills ----------

const S2: React.FC = () => {
  const f = useShotFrame(); // 0..108
  const camera = beatPath(
    [
      { at: 0, position: [1.3, 0.55, 4.9], target: [0.1, 0.35, 2.6], fov: 42 },
      { at: 48, position: [1.25, 0.95, 5.1], target: [-0.3, 0.6, 1.6], fov: 42 },
      { at: 107, position: [1.15, 1.55, 5.4], target: [-1.2, 1.0, -1.2], fov: 42 },
    ],
    f,
  );
  const w = stroll(f, 30, 78, [0.5, 2.3], [-2.0, -2.6]);
  const cast: PuppetPlacement[] = [{ id: "bart", look: BANDIT, at: w.at, pose: { expression: "happy", ...w.pose, reachR: [-160, -600], handR: "fist" } }];
  const grip = handWorld(w.at, [-160, -600], camera);
  return (
    <Stage
      set={
        <GoldCountrySet camera={camera} frame={f} mode="day">
          <Strongbox position={[0.05, 0, 2.6]} rotation={[0, 0.4, 0]} open={1} scale={0.8} />
          <Poem position={[0.12, 0.27, 2.68]} rotation={[-Math.PI / 2, 0, 0.4]} size={0.28} />
          {sackFor(w.at, camera, f < 30 ? 1 : -1, 0.4)}
          <Shotgun at={grip} yaw={-0.6} pitch={-1.2} length={0.7} />
        </GoldCountrySet>
      }
      camera={camera}
      bg={GOLD_BG.day}
      blur={2.4}
      puppets={cast}
      light={goldLight("day")}
    />
  );
};

// ---------- 3. The detectives' office: a wanted board with no face ----------

const OFFICE_LAMP: [number, number, number] = [0.7, 1.05, -0.6];
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..172
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 1.3, 4.2], target: [0.0, 1.2, -2.0], fov: 42 },
      { at: 60, position: [0.0, 1.15, 3.4], target: [-0.3, 1.05, 0.0], fov: 40 },
      { at: 171, position: [-0.25, 1.05, 2.6], target: [-0.45, 0.98, 0.4], fov: 38 },
    ],
    f,
  );
  const said = f > 108;
  const cast: PuppetPlacement[] = [
    { id: "hume", look: HUME, at: [-0.45, 0.45], pose: { expression: said ? "angry" : "worried", lookX: said ? 0 : -0.4, headTilt: said ? -8 : 0 } },
    { id: "morse", look: MORSE, at: [0.3, -0.4], pose: { expression: "thinking", gesture: "chin", lookX: -0.7 } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#6a4a32" wall="#2f4a3a" wallPattern="panel" floorPattern="wood" width={6} depth={5}>
          <Board position={[-0.35, 1.45, -1.7]} cards={["WANTED: BLACK BART", "NO NAME", "NO FACE"]} width={1.5} height={1.1} />
          <Desk position={[0.9, 0, -0.7]} />
          <Lamp position={OFFICE_LAMP} />
          <Shelf position={[1.9, 1.2, -2.45]} width={1.2} rows={3} color="#3a2a1a" seed={2} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.2}
      puppets={cast}
      light={lampLight([[OFFICE_LAMP[0], OFFICE_LAMP[1] + 0.3, OFFICE_LAMP[2]]])}
    />
  );
};

// ---------- 4. The hotel room: Charles Bolton, gentleman in mining, buttons a fine white shirt ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..138
  const camera = beatPath(
    [
      { at: 0, position: [-1.5, 1.15, 3.0], target: [-0.6, 1.0, 0.2], fov: 40 },
      { at: 60, position: [-0.9, 1.12, 3.0], target: [-0.1, 1.0, 0.2], fov: 40 },
      { at: 137, position: [-0.25, 1.1, 2.9], target: [0.3, 1.0, 0.2], fov: 39 },
    ],
    f,
  );
  const cuff = Math.sin(f * 0.18) * 30;
  const cast: PuppetPlacement[] = [
    { id: "bolton", look: BOLTON, at: [0.0, 0.3], pose: { expression: f > 60 ? "smug" : "happy", view: "front", reachR: [60 + cuff * 0.3, -560], reachL: [-40, -620 + cuff], handR: "fist", handL: "open", frontR: true, frontL: true, lookX: -0.5 } },
  ];
  const chest = handWorld([0.0, 0.3], [-70, -640], camera);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#7a5a8a" wall="#e8e0c8" wallPattern="wallpaper" floorPattern="carpet" width={6} depth={5} sun={{ x: 1.2 }}>
          <Window position={[1.6, 1.5, -2.45]} size={[1.0, 1.2]} sky="#cfe4f4" />
          {/* the dressing mirror */}
          <group position={[-1.0, 0, -0.6]} rotation={[0, 0.6, 0]}>
            <InkBox size={[0.7, 1.4, 0.06]} position={[0, 1.1, 0]} color="#6a4a2a" ink={0.012} />
            <mesh position={[0, 1.1, 0.035]}>
              <planeGeometry args={[0.58, 1.26]} />
              <meshBasicMaterial color="#c8dce8" toneMapped={false} />
            </mesh>
          </group>
          {/* shirts on the chair */}
          <InkBox size={[0.5, 0.45, 0.5]} position={[1.2, 0.22, 0.4]} color="#8a5a3a" ink={0.012} />
          <InkBox size={[0.46, 0.08, 0.4]} position={[1.2, 0.49, 0.4]} color="#f6f6f4" ink={0.008} />
          <InkBox size={[0.46, 0.08, 0.4]} position={[1.2, 0.57, 0.38]} color="#f0f0ee" ink={0.008} />
          {/* the handkerchief, folded in his breast pocket (the seed) */}
          <InkBox size={[0.07, 0.06, 0.01]} position={[chest[0], chest[1], chest[2] + 0.03]} rotation={[0, 0, 0.4]} color="#ffffff" ink={0.004} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      blur={2}
      puppets={cast}
    />
  );
};

// ---------- 5. Funk Hill at sunset: a young man fires, the bandit runs, the handkerchief falls ----------

const S5_COACH = -2.4;
const ROLLERI_AT: [number, number] = [-0.6, 1.7];
const SHOT_F = 82;
const BUSH: [number, number] = [2.0, -1.55];
const S5: React.FC = () => {
  const f = useShotFrame(); // 0..244
  const camera = beatPath(
    [
      { at: 0, position: [-1.2, 1.4, 6.0], target: [-0.4, 0.9, 0.0], fov: 44 },
      { at: 82, position: [0.0, 1.25, 5.4], target: [1.1, 0.9, -0.3], fov: 44 },
      { at: 122, position: [0.9, 1.18, 4.3], target: [2.7, 0.85, -0.6], fov: 44 },
      { at: 165, position: [1.5, 1.1, 3.2], target: [2.4, 0.7, -1.0], fov: 42 },
      { at: 243, position: [1.85, 1.45, 0.3], target: [2.0, 0.05, -1.25], fov: 40 },
    ],
    f,
  );
  // Bart runs from the road toward the brush; the shot comes at SHOT_F, he leaps and keeps going
  const run = stroll(f, 40, 150, [0.6, 0.2], [4.2, -1.0]);
  const leap = f >= SHOT_F + 2 && f < SHOT_F + 22 ? jump(f, SHOT_F + 2, 120, 18) : {};
  const bartAt = run.at;
  const drop = 150; // the handkerchief slips out of his coat
  const dp = ramp(f, drop, drop + 34);
  const hk: [number, number, number] = [mix(2.6, BUSH[0], dp), mix(0.75, 0.04, dp) + Math.sin(dp * Math.PI * 3) * 0.05 * (1 - dp), mix(-0.6, BUSH[1] + 0.3, dp)];
  const aim = handWorld(ROLLERI_AT, [200, -620], camera);
  const hat = ramp(f, SHOT_F + 2, SHOT_F + 40);
  const HAT_FROM = stroll(SHOT_F + 2, 40, 150, [0.6, 0.2], [4.2, -1.0]).at; // where he was when the shot came
  const cast: PuppetPlacement[] = [
    { id: "rolleri", look: ROLLERI, at: ROLLERI_AT, pose: { expression: f < SHOT_F ? "determined" : "excited", view: "side", facing: 1, reachR: [210, -640], reachL: [120, -600], handR: "fist", handL: "fist", ...(f >= SHOT_F && f < SHOT_F + 6 ? { lean: -6 } : {}) } },
    { id: "bart", look: BANDIT, at: bartAt, pose: { expression: f > SHOT_F ? "shocked" : "worried", ...run.pose, ...leap } },
  ];
  return (
    <Stage
      set={
        <GoldCountrySet camera={camera} frame={f} mode="dusk">
          <Coach x={S5_COACH} />
          {sackFor(bartAt, camera, 1, 0.3, (leap as PuppetPose).air ?? 0)}
          <Rifle at={aim} yaw={-0.25} pitch={0.06} />
          <Foliage position={[BUSH[0] - 0.2, 0, BUSH[1] - 0.15]} size={0.8} color="#8a7a3a" seed={33} />
          <Burst kind="sparks" at={[aim[0] + 0.75, aim[1] + 0.05, aim[2] - 0.3]} frame={f - SHOT_F} count={30} size={0.6} speed={2.2} spray={[2.2, 0.4, -1.0]} seed={5} />
          {f > SHOT_F + 2 && <FlyingHat position={[HAT_FROM[0] + hat * 0.9, mix(HEAD_Y + 0.25, 0.03, hat) + Math.sin(hat * Math.PI) * 0.6, HAT_FROM[1] + hat * 0.3]} spin={hat < 1 ? hat * 9 : 0} color="#1c1a1a" />}
          {f > drop - 1 && <Handkerchief position={hk} rotation={[-Math.PI / 2 + (1 - dp) * 1.2, (1 - dp) * 2, 0]} size={0.26} crumple={0.6} mark={false} />}
        </GoldCountrySet>
      }
      camera={camera}
      bg={GOLD_BG.dusk}
      blur={2.4}
      puppets={cast}
      light={goldLight("dusk")}
    />
  );
};

// ---------- 6. In the bushes: the handkerchief, and its four tiny marks ----------

const S6: React.FC = () => {
  const f = useShotFrame(); // 0..119
  const H: [number, number, number] = [BUSH[0], 0.03, BUSH[1] + 0.3];
  const camera = beatPath(
    [
      { at: 0, position: [H[0] - 0.1, 1.2, H[2] + 0.85], target: [H[0], 0.0, H[2] + 0.05], fov: 40 },
      { at: 60, position: [H[0] + 0.05, 0.95, H[2] + 0.6], target: [H[0] + 0.07, 0.0, H[2] + 0.12], fov: 38 },
      { at: 118, position: [H[0] + 0.09, 0.78, H[2] + 0.5], target: [H[0] + 0.09, 0.0, H[2] + 0.15], fov: 36 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <GoldCountrySet camera={camera} frame={f} mode="dusk">
          <Handkerchief position={H} rotation={[-Math.PI / 2, 0, 0]} size={0.5} crumple={0.5} color="#b8b4c0" />
          <Foliage position={[H[0] - 0.35, 0, H[2] - 0.15]} size={0.5} color="#4a4a2a" seed={41} />
        </GoldCountrySet>
      }
      camera={camera}
      bg={GOLD_BG.dusk}
      blur={3}
      puppets={[]}
      light={goldLight("dusk")}
    />
  );
};

// ---------- 7. The laundry: every collar stamped with a code, every code in the book ----------

const LEDGER_ROWS: [string, string][] = [
  ["A.K.3", "J. MURPHY"],
  ["B.L.9", "H. LEE"],
  ["M.T.2", "S. KLEIN"],
  ["R.D.5", "P. OLSEN"],
];
const STAMPS = [36, 70, 98];
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..224
  const camera = beatPath(
    [
      { at: 0, position: [0.45, 1.15, 2.9], target: [0.0, 0.85, 0.0], fov: 40 },
      { at: 90, position: [0.55, 1.2, 2.7], target: [0.2, 0.9, -0.2], fov: 40 },
      { at: 140, position: [1.0, 1.4, 1.2], target: [1.05, 1.12, -0.9], fov: 38 },
      { at: 223, position: [1.05, 1.42, 0.85], target: [1.05, 1.12, -0.9], fov: 36 },
    ],
    f,
  );
  const press = Math.max(...STAMPS.map((s) => Math.max(0, 1 - Math.abs(f - s) / 5)));
  const steam = f > 104 && f < 130;
  const cast: PuppetPlacement[] = [
    { id: "laundryman", look: CLERK, at: [-0.2, -0.45], pose: { expression: steam ? "shocked" : "happy", view: "front", reachR: [180, -520 + press * 60], handR: "fist", reachL: [-120, -480], handL: "open", lookX: 0.4, ...(steam ? { lean: -8 } : {}) } },
  ];
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#8a9090" wall="#cfe0dc" wallPattern="tile" floorPattern="concrete" width={6} depth={4}>
          {/* the work table with a collar and the stamp */}
          <InkBox size={[1.4, 0.06, 0.6]} position={[0.0, 0.58, 0.1]} color="#8a6a4a" ink={0.012} />
          <InkBox size={[1.3, 0.55, 0.5]} position={[0.0, 0.28, 0.1]} color="#6a5038" ink={0.012} />
          <InkBox size={[0.3, 0.02, 0.18]} position={[0.12, 0.62, 0.15]} color="#f6f6f4" ink={0.004} />
          <InkBox size={[0.12, 0.015, 0.08]} position={[-0.25, 0.62, 0.2]} color="#1a2a5a" ink={0.004} />
          <Stamp position={[0.12, 0.62, 0.15]} press={press} />
          {/* shirts on the drying line, a tub with steam */}
          {[-1.6, -1.1, -0.6, 0.6, 1.1].map((x, i) => (
            <HangingShirt key={i} position={[x, 2.05, -1.2 - (i % 2) * 0.3]} sway={Math.sin(f * 0.05 + i)} />
          ))}
          <InkCylinder radius={0.012} height={4} position={[0, 2.05, -1.35]} rotation={[0, 0, Math.PI / 2]} color="#4a4a4a" ink={0} />
          <InkCylinder radius={0.35} height={0.55} position={[-1.5, 0.28, -0.6]} color="#7a8a8a" ink={0.012} />
          <SmokePlume position={[-1.5, 0.6, -0.6]} world={[-1.5, -0.6]} frame={f} size={0.12} rise={1.4} wind={0.3} period={60} puffs={6} />
          {steam && <SmokePlume position={[-0.55, 0.65, 0.1]} world={[-0.55, 0.1]} frame={f - 104} size={0.1} rise={0.6} wind={-0.2} period={20} puffs={4} />}
          {/* the book on its shelf */}
          <InkBox size={[0.5, 1.0, 0.4]} position={[1.05, 0.5, -0.95]} color="#5a3a24" ink={0.012} />
          <Ledger position={[1.05, 1.08, -0.9]} rotation={[-0.55, 0, 0]} rows={LEDGER_ROWS} size={0.62} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={2}
      puppets={cast}
    />
  );
};

// ---------- 8. A foggy city street: the detectives go from laundry to laundry ----------

const S8: React.FC = () => {
  const f = useShotFrame(); // 0..86
  const t = ease(f, 0, 86);
  const camera: CameraShot = { position: [mix(0.9, 0.1, t), 1.1, mix(4.6, 3.2, t)], target: [mix(-1.6, -2.2, t), 1.0, mix(0.4, -1.0, t)], fov: 44 };
  const h = stroll(f, 0, 86, [-1.4, 2.4], [-1.6, 0.0]);
  const m = stroll(f, 0, 86, [-0.8, 2.8], [-1.0, 0.4]);
  return (
    <Stage
      set={
        <WesternTownSet camera={camera} frame={f} mode="fog">
          <Label text={"LAUNDRY"} position={[-2.6, 2.3, -0.6]} width={1.1} />
        </WesternTownSet>
      }
      camera={camera}
      bg={TOWN_BG.fog}
      blur={2.4}
      puppets={[
        { id: "hume", look: HUME, at: h.at, pose: { expression: "determined", ...h.pose } },
        { id: "morse", look: MORSE, at: m.at, pose: { expression: "determined", ...m.pose } },
      ]}
      light={townLight("fog")}
    />
  );
};

// ---------- 9. The counter: the clerk reads the mark and the book gives the name ----------

const S9: React.FC = () => {
  const f = useShotFrame(); // 0..97
  const camera = beatPath(
    [
      { at: 0, position: [-0.15, 1.2, 2.5], target: [-0.05, 0.98, 0.0], fov: 44 },
      { at: 45, position: [-0.05, 1.15, 2.1], target: [0.0, 0.95, 0.1], fov: 44 },
      { at: 96, position: [0.0, 1.12, 1.9], target: [0.0, 0.93, 0.15], fov: 44 },
    ],
    f,
  );
  const reads = f > 40;
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#7a5a3a" wall="#d8b060" wallPattern="panel" floorPattern="wood" width={6} depth={4}>
          <Counter position={[0, 0, 0.2]} size={[2.2, 0.6, 0.6]} color="#6a4428" top="#4a2a18" />
          <InkBox size={[0.55, 0.2, 0.3]} position={[0.05, 0.7, 0.28]} rotation={[0.5, 0, 0]} color="#4a2a18" ink={0.008} />
          <Ledger position={[0.05, 0.86, 0.36]} rotation={[-0.75, 0, 0]} rows={[["D.W.4", "T. BRENNAN"], ["F.X.O.7", "CHAS. BOLTON"], ["G.P.1", "A. RUIZ"]]} hl={reads ? 1 : -1} size={0.62} />
          <Handkerchief position={[-0.55, 0.615, 0.42]} rotation={[-Math.PI / 2, 0, 0.4]} size={0.26} crumple={0.4} />
          <Shelf position={[0, 1.2, -1.9]} width={2.4} rows={3} color="#5a3a20" seed={9} />
          <InkCylinder radius={0.05} height={0.04} position={[0.85, 0.62, 0.3]} color="#d8b040" ink={0.006} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("golden")}
      blur={2}
      puppets={[{ id: "laundryman", look: CLERK, at: [-0.15, -0.3], pose: { expression: reads ? "excited" : "thinking", view: "front", ...(reads ? { reachR: [160, -560] as [number, number], handR: "point" as const } : { gesture: "chin" as const }), lookX: 0.2 } }]}
    />
  );
};

// ---------- 10. The hotel corridor: a knock, Mr Bolton opens the door ----------

const DOOR_X = 0.4;
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..165
  const camera = beatPath(
    [
      { at: 0, position: [-0.6, 1.2, 4.0], target: [0.2, 1.0, -1.0], fov: 42 },
      { at: 60, position: [-0.4, 1.12, 3.2], target: [0.3, 1.0, -1.0], fov: 41 },
      { at: 164, position: [-0.25, 1.05, 2.6], target: [0.35, 0.98, -1.0], fov: 40 },
    ],
    f,
  );
  const open = ease(f, 40, 56);
  const caught = f > 112;
  const rattle = caught ? Math.sin(f * 2.4) * 14 * Math.max(0, 1 - (f - 112) / 40) : 0;
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#5a2a2a" wall="#8a2a2a" wallPattern="wallpaper" floorPattern="carpet" width={4} depth={4}>
          <Door position={[DOOR_X, 0, -1.95]} open={open} sign="12" />
          <Door position={[-1.3, 0, -1.95]} sign="11" />
          <Lamp position={[1.4, 0, -1.6]} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2}
      puppets={[
        { id: "hume", look: HUME, at: [-0.95, -0.75], pose: { expression: "determined", view: "side", facing: 1, ...(f > 14 && f < 34 ? { reachR: [200, -700 + Math.abs(Math.sin(f * 0.8)) * 60] as [number, number], handR: "fist" as const } : {}) } },
        { id: "morse", look: MORSE, at: [-0.5, -0.35], pose: { expression: caught ? "smug" : "neutral", view: "side", facing: 1, ...(f > 60 ? { gesture: "handsOnHips" as const } : {}) } },
        ...(open > 0.3 ? [{ id: "bolton", look: BOLTON_ROBE, at: [DOOR_X + 0.2, -1.5] as [number, number], pose: { expression: caught ? ("shocked" as const) : ("happy" as const), view: "front" as const, hold: { item: "cup" as const, hand: "R" as const }, itemTilt: rattle } }] : []),
      ]}
    />
  );
};

// ---------- 11. The office at night: the board now has a face, the handkerchief pinned beside it ----------

const NIGHT_LAMP: [number, number, number] = [0.9, 1.05, -0.4];
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..124
  const camera = beatPath(
    [
      { at: 0, position: [0.05, 1.8, 2.9], target: [-0.1, 1.4, -2.0], fov: 42 },
      { at: 60, position: [0.0, 1.45, 2.3], target: [-0.05, 1.2, -1.5], fov: 40 },
      { at: 123, position: [0.0, 1.35, 1.9], target: [0.0, 1.2, -1.5], fov: 38 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="night" floor="#3a2a3a" wall="#3a2f4a" wallPattern="panel" floorPattern="wood" width={6} depth={5}>
          <Board position={[-0.3, 1.55, -2.45]} cards={["BLACK BART", "F.X.O.7"]} width={1.2} height={0.9} />
          <Handkerchief position={[0.55, 1.4, -2.38]} rotation={[0, 0, 0.15]} size={0.42} crumple={0.3} />
          <Desk position={[0.9, 0, -0.5]} />
          <Lamp position={NIGHT_LAMP} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("night")}
      blur={2.4}
      puppets={[
        { id: "bart", look: BOLTON, at: [-0.45, 0.1], pose: { expression: "awkward", sit: true, reachR: [40, -520], reachL: [-40, -520], handR: "fist", handL: "fist", frontR: true, frontL: true, lookX: 0.5 } },
        { id: "hume", look: HUME, at: [0.4, 0.35], pose: { expression: "smug", gesture: "armsCrossed", lookX: -0.5 } },
      ]}
      light={lampLight([[NIGHT_LAMP[0], NIGHT_LAMP[1] + 0.3, NIGHT_LAMP[2]]], "#9a90c8")}
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 259, S1, false],
  [259, 367, S2, "dip"],
  [367, 539, S3, "dip"],
  [539, 677, S4, "dip"],
  [677, 921, S5, "dip"],
  [921, 1040, S6, "dip"],
  [1040, 1264, S7, "dip"],
  [1264, 1350, S8, "dip"],
  [1350, 1447, S9, "dip"],
  [1447, 1612, S10, "dip"],
  [1612, TIMING.totalFrames, S11, "dip"],
];

const SFX: Sfx[] = [
  // the road
  { at: 0, src: sfx("wind"), volume: 0.3, until: 367 },
  { at: 0, src: sfx("hooves"), volume: 0.12, until: 60 },
  { at: 236, src: sfx("whoosh"), volume: 0.3, space: "outdoor" },
  ...foleyCues("thud", [250], 0.55, { space: "outdoor", hit: 0.4 }),
  { at: 252, src: sfx("pop"), volume: 0.12, space: "outdoor" },
  { at: 300, src: sfx("paper"), volume: 0.5, space: "outdoor" },
  // the office
  { at: 367, src: sfx("tick"), volume: 0.15, until: 539 },
  // Funk Hill
  { at: 677, src: sfx("wind"), volume: 0.35, until: 1040 },
  ...foleyCues("gunshot-echo", [677 + SHOT_F], 0.8, { space: "outdoor", hit: 0.5 }),
  { at: 677 + SHOT_F + 4, src: sfx("whoosh"), volume: 0.3, space: "outdoor" },
  // the laundry
  { at: 1040, src: sfx("hum"), volume: 0.08, until: 1264 },
  { at: 1030, src: sfx("sting"), volume: 0.14 },
  { at: 1040 + STAMPS[0], src: sfx("stamp"), volume: 0.7, space: "room" },
  ...foleyCues("thud", [1040 + STAMPS[1], 1040 + STAMPS[2]], 0.8, { space: "room" }),
  { at: 1040 + 104, src: sfx("hiss"), volume: 0.35, space: "room" },
  { at: 1040 + 150, src: sfx("paper"), volume: 0.8, space: "room" },
  // the street, the counter
  { at: 1264, src: sfx("ambience"), volume: 0.25, until: 1350 },
  { at: 1350 + 6, src: sfx("chime"), volume: 0.25, space: "room" },
  { at: 1350 + 42, src: sfx("paper"), volume: 1.0, space: "room" },
  // the corridor
  ...foleyCues("thud", [1447 + 16, 1447 + 24, 1447 + 31], 0.6, { space: "room" }),
  { at: 1447 + 40, src: sfx("door"), volume: 1.0, space: "room" },
  { at: 1447 + 114, src: sfx("clink"), volume: 0.2, space: "room" },
  // the end
  { at: 1612, src: sfx("tick"), volume: 0.2, until: TIMING.totalFrames - 10 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 367, volume: 0.42 },
  { src: MUSIC_FILES.mystery, from: 367, to: 677, volume: 0.36 },
  { src: MUSIC_FILES.tension, from: 677, to: 1040, volume: 0.36 },
  { src: MUSIC_FILES.lounge, from: 1040, to: TIMING.totalFrames, volume: 0.36 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
