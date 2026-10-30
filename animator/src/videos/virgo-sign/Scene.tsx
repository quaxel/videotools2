import React from "react";
import { Easing } from "remotion";
import {
  Board,
  breathe,
  CameraShot,
  Counter,
  Desk,
  Door,
  Halo,
  InkBox,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetBillboard,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shelf,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
  Window,
  ZodiacBadge,
} from "../../engine";
import { BigStamp, Bookshelf, Clipboard, Couch, DizzyStars, Jar, LabelMaker, NoteDrawer, Notes, PictureFrame, Protractor, RainbowCloset, Ruler, SpiceRack } from "./props";
import TIMING_JSON from "./timing.json";

// "A Virgo Will Fix Your Life Uninvited" — cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "virgo-sign";
export const timing = TIMING;

// ---------- cast ----------

const ANNA: PuppetLook = { skin: "#f6dcc4", hair: "#2a1a10", outfit: "#2d6a4f", glasses: true, long: true };
const MEL: PuppetLook = { skin: "#fbe9d6", hair: "#e8c15a", outfit: "#f77f00", long: true };
const BEN: PuppetLook = { skin: "#c68642", hair: "#2a1a10", outfit: "#c0392b", cap: "#13235e" };
const KIM: PuppetLook = { skin: "#8d5a3b", hair: "#1d1a1a", outfit: "#2a9d8f", long: true };
const LOU: PuppetLook = { skin: "#fbe9d6", hair: "#a0442a", outfit: "#c77dff", long: true };

const ARMS_UP = { armL: [150, -20] as [number, number], armR: [150, -20] as [number, number] };
const PROUD = { armL: [20, -60] as [number, number], armR: [20, -60] as [number, number] };
const POINT = { armR: [110, -10] as [number, number], armL: [20, -40] as [number, number] };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });

const close = (px: number, pz: number, p: number, dx = -0.2): CameraShot => ({
  position: lerp3([px + dx, 1.15, pz + 1.85], [px + dx * 0.8, 1.12, pz + 1.55], p),
  target: [px, 1.0, pz],
  fov: 36,
});

type Grade = { blur?: number; truth?: number; flash?: number };

// ---------- locations ----------

// Mel's front door: green.
const DOOR_X = 0.6;
const ANNA_DOOR: [number, number] = [-0.25, -1.9];
const DoorSet: React.FC<{ camera: CameraShot; f: number; virgo?: number; name?: number; traits?: number; bell?: number }> = ({ camera, virgo, name, traits, bell }) => (
  <Room camera={camera} mood="daylight" floor="#6b4a2a" wall="#3fae5a" stripe="#fff6dc" width={9} depth={6} wallPattern="brick" floorPattern="wood" sun={{ x: -1.6, color: "#f2ffe6", bars: 4 }}>
    {virgo !== undefined && <ZodiacBadge sign="virgo" position={[-0.25, 2.5, -2.92]} size={0.7} bg="#13235e" fg="#ffffff" appear={virgo} />}
    {virgo !== undefined && <Label text="VIRGO" position={[-0.25, 1.95, -2.94]} width={0.95} fg="#ffffff" bg="#e0262f" appear={virgo - 4} />}
    <Door position={[DOOR_X, 0, -2.94]} color="#f7f2ff" glow="#7b2cbf" sign="PARTY!" />
    <InkBox size={[0.1, 0.1, 0.04]} position={[DOOR_X + 0.62, 1.15, -2.92]} color="#ffd23f" />
    {bell !== undefined && <Label text="DOORBELL" position={[DOOR_X + 0.62, 0.98, -2.86]} width={0.32} fg="#13235e" bg="#ffffff" appear={bell} />}
    {name !== undefined && <Label text="ANNA" position={[-1.3, 2.4, -2.92]} width={0.75} fg="#ffffff" bg="#13235e" appear={name} />}
    {traits !== undefined &&
      ["SMART", "HELPFUL", "ORGANIZED"].map((t, i) => (
        <Label key={t} text={t} position={[-1.3, 2.05 - i * 0.3, -2.9]} width={0.62} fg="#13235e" bg="#ffd23f" appear={traits - i * 16} />
      ))}
    <Plant position={[-2.6, 0, -2.5]} scale={1.2} />
    <Lamp position={[DOOR_X, 2.6, -2.6]} color="#fff2c2" />
  </Room>
);

// Spice rack: terracotta.
const RACK_AT: Vec3 = [0, 1.35, -2.75];
const SpiceSet: React.FC<{ camera: CameraShot; f: number; abc?: number }> = ({ camera, abc }) => (
  <Room camera={camera} mood="warm" floor="#5a2a1e" wall="#c8553d" stripe="#fff6dc" width={8} depth={6} wallPattern="tile" floorPattern="tile">
    <Counter position={[0, 0, -2.6]} size={[2.2, 0.9, 0.6]} color="#fff6dc" top="#8a4a1e" />
    <SpiceRack position={RACK_AT} />
    {abc !== undefined && <Label text="A → Z" position={[0, 2.5, -2.9]} width={0.7} fg="#ffffff" bg="#13235e" appear={abc} />}
    <Window position={[2.2, 1.7, -2.94]} size={[1.0, 1.0]} sky="#ffe0c2" />
  </Room>
);

// Colour-coded closet and the to-do list: white.
const ClosetSet: React.FC<{ camera: CameraShot; f: number; coded?: number; todo?: number }> = ({ camera, coded, todo }) => (
  <Room camera={camera} mood="daylight" floor="#c9ced3" wall="#f2f2f2" stripe="#4f7dff" width={8} depth={6} wallPattern="panel" floorPattern="wood">
    <RainbowCloset position={[-0.5, 0, -2.55]} />
    {coded !== undefined && <Label text="COLOR-CODED" position={[-0.5, 2.5, -2.9]} width={1.1} fg="#ffffff" bg="#7b2cbf" appear={coded} />}
    <Board position={[1.5, 1.6, -2.92]} cards={["TO-DO LIST", "1. WRITE TO-DO LIST", "2. CHECK IT", "3. LABEL IT"]} width={1.0} height={1.1} color="#fff6dc" />
    {todo !== undefined && <Label text="TO-DO LIST'S TO-DO LIST" position={[1.5, 2.35, -2.9]} width={1.0} fg="#ffffff" bg="#e0262f" appear={todo} />}
  </Room>
);

// Mel's kitchen: yellow, every jar labelled.
const JARS = ["SALT", "SUGAR", "FORKS", "SPOONS", "TEA", "MEL'S MUG"];
const KitchenSet: React.FC<{ camera: CameraShot; f: number; tags?: number }> = ({ camera, tags = 99 }) => (
  <Room camera={camera} mood="golden" floor="#8a5a1e" wall="#ffd23f" stripe="#e0262f" width={8} depth={6} wallPattern="tile" floorPattern="tile" sun={{ x: 1.4, color: "#fff2c2", bars: 4 }}>
    <Counter position={[0, 0, -2.55]} size={[2.6, 0.9, 0.6]} color="#fff6dc" top="#3fae5a" />
    {JARS.map((t, i) => (
      <Jar key={t} position={[-1.0 + i * 0.4, 0.9, -2.5]} text={t} color={["#cfe9ff", "#ffe0ee", "#e8f6ff"][i % 3]} tag={ramp(tags, i * 6, i * 6 + 5)} />
    ))}
    <Shelf position={[1.9, 0, -2.6]} width={0.8} rows={3} color="#8a5a1e" seed={5} />
    <Window position={[-0.3, 1.8, -2.94]} size={[1.2, 0.8]} sky="#9fd8ff" />
    <Label text="LABELLED" position={[-1.6, 2.4, -2.9]} width={0.9} fg="#ffffff" bg="#13235e" appear={tags - 30} />
  </Room>
);

// The party room: purple, the frame high on the back wall above the bookshelf; couch to the right.
// "cold" relights it for the frame; "late" is the burgundy after-party corner.
const FRAME_AT: Vec3 = [-1.4, 2.35, -2.9];
const SHELF_AT: Vec3 = [-1.4, 0, -2.75];
const COUCH_AT: Vec3 = [0.6, 0, -2.4];
const COUCH_W = 2.4;
const MEL_AT: [number, number] = [0.5, -1.5];
const ANNA_P: [number, number] = [-0.35, -1.35];
const KIM_AT: [number, number] = [-1.9, -1.6];
const LOU_AT: [number, number] = [-2.6, -1.3];
type PartyMode = "party" | "cold" | "late";
const PARTY = {
  party: { mood: "neon", floor: "#2a1a40", wall: "#7b2cbf", stripe: "#ffd23f" },
  cold: { mood: "cold", floor: "#26324a", wall: "#4a6fa5", stripe: "#dff6ff" },
  late: { mood: "warm", floor: "#3a1018", wall: "#7a1e3a", stripe: "#ffd23f" },
} as const;
const STOOL_H = 0.8;
const PartySet: React.FC<{ camera: CameraShot; f: number; mode?: PartyMode; tilt?: number; tip?: number; music?: number; stool?: boolean; children?: React.ReactNode }> = ({
  camera,
  f,
  mode = "party",
  tilt = 0.05,
  tip = 0,
  music = 0,
  stool = false,
  children,
}) => {
  const m = PARTY[mode];
  return (
    <Room camera={camera} mood={m.mood} floor={m.floor} wall={m.wall} stripe={m.stripe} width={9} depth={6} wallPattern="wallpaper" floorPattern="wood">
      <PictureFrame position={FRAME_AT} tilt={tilt} />
      <Bookshelf position={SHELF_AT} tip={tip} />
      {stool && (
        // She stands on it, so it never counts as a collision.
        <group userData={{ ghost: true }}>
          <InkBox size={[0.5, STOOL_H, 0.4]} position={[SHELF_AT[0], STOOL_H / 2, -2.18]} color="#c9a26b" />
        </group>
      )}
      <Couch position={COUCH_AT} color={mode === "late" ? "#c0392b" : "#e0262f"} width={COUCH_W} />
      <Window position={[2.9, 1.6, -2.94]} size={[1.0, 1.1]} sky="#1b2a5e" />
      <Lamp position={[0.6, 2.5, -1.8]} color={mode === "cold" ? "#cfe9ff" : "#ffb3ff"} />
      <Plant position={[-3.2, 0, -2.5]} />
      {music > 0 && <Notes position={[0.4, 1.6, -2.3]} f={f} amount={music} />}
      {children}
    </Room>
  );
};

// The office inside her head: grey.
const DESK_AT: Vec3 = [0, 0, -2.2];
const STAMP_AT: Vec3 = [0, 1.15, -2.2];
const RULER_AT: Vec3 = [-1.6, 2.1, -2.9];
const CLIP_AT: Vec3 = [1.65, 1.6, -2.88];
const DRAWER_AT: Vec3 = [0.3, 0.5, -2.12];
const OfficeSet: React.FC<{
  camera: CameraShot;
  f: number;
  inside?: number;
  lift?: number;
  shake?: number;
  wrong?: number;
  degrees?: number;
  fix?: number;
  scroll?: number;
  drawer?: number;
}> = ({ camera, inside, lift = 1, shake = 0, wrong, degrees, fix, scroll = 0, drawer = 0 }) => (
  <Room camera={camera} mood="office" floor="#3a3a44" wall="#8a8f98" stripe="#13235e" width={8} depth={6} wallPattern="panel" floorPattern="carpet">
    {inside !== undefined && <Label text="INSIDE ANNA" position={[-0.9, 2.75, -2.92]} width={1.3} fg="#ffffff" bg="#13235e" appear={inside} />}
    <ZodiacBadge sign="virgo" position={[2.6, 2.6, -2.92]} size={0.45} bg="#ffd23f" fg="#13235e" />
    <Desk position={DESK_AT} size={[1.6, 0.75, 0.8]} color="#c9ced3" />
    <InkBox size={[0.66, 0.32, 0.56]} position={[DRAWER_AT[0], 0.55, -2.16]} color="#c9ced3" />
    <NoteDrawer position={DRAWER_AT} out={drawer} />
    <BigStamp position={STAMP_AT} lift={lift} shake={shake} />
    {wrong !== undefined && <Label text="NEVER PUT DOWN" position={[0, 1.2, -2.9]} width={0.85} fg="#ffffff" bg="#d62828" appear={wrong} />}
    <Ruler position={RULER_AT} length={1.6} tilt={0.035} />
    {degrees !== undefined && <Label text="TWO DEGREES" position={[RULER_AT[0], RULER_AT[1] - 0.35, -2.88]} width={0.85} fg="#ffffff" bg="#13235e" appear={degrees} />}
    <Clipboard position={CLIP_AT} scroll={scroll} />
    {fix !== undefined && <Label text="FIX IT" position={[CLIP_AT[0], CLIP_AT[1] + 0.72, -2.86]} width={0.6} fg="#ffffff" bg="#e0262f" appear={fix} />}
    <Lamp position={[1.0, 2.5, -1.6]} color="#e8f6ff" />
  </Room>
);

// ---------- stage wrappers ----------

const door = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof DoorSet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} {...grade} set={<DoorSet camera={camera} f={f} {...extra} />} />
);
const spice = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof SpiceSet>> = {}) => (
  <Stage bg={moodBackground("warm")} camera={camera} puppets={puppets} set={<SpiceSet camera={camera} f={f} {...extra} />} />
);
const closet = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof ClosetSet>> = {}) => (
  <Stage bg={moodBackground("daylight")} camera={camera} puppets={puppets} set={<ClosetSet camera={camera} f={f} {...extra} />} />
);
const kitchen = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof KitchenSet>> = {}) => (
  <Stage bg={moodBackground("golden")} camera={camera} puppets={puppets} set={<KitchenSet camera={camera} f={f} {...extra} />} />
);
const party = (camera: CameraShot, f: number, puppets: PuppetPlacement[], extra: Partial<React.ComponentProps<typeof PartySet>> = {}, grade: Grade = {}) => (
  <Stage bg={moodBackground(PARTY[extra.mode ?? "party"].mood)} camera={camera} puppets={puppets} {...grade} set={<PartySet camera={camera} f={f} {...extra} />} />
);
const office = (camera: CameraShot, f: number, extra: Partial<React.ComponentProps<typeof OfficeSet>> = {}, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground("office")} camera={camera} puppets={puppets} {...grade} set={<OfficeSet camera={camera} f={f} {...extra} />} />
);

const guests = (f: number, pose: Partial<PuppetPose> = {}): PuppetPlacement[] => [
  pup("kim", KIM, KIM_AT, { expression: "excited", ...ARMS_UP, bob: Math.abs(Math.sin(f / 4)) * -14, headTilt: Math.sin(f / 5) * 8, ...pose }),
  pup("lou", LOU, LOU_AT, { expression: "excited", armL: [120, -30], armR: [60, -40], bob: Math.abs(Math.sin(f / 4 + 1)) * -14, headTilt: Math.sin(f / 5 + 2) * 8, ...pose }),
];

// ---------- shots ----------

// Hook: Anna at the party door under the VIRGO sign, label maker raised.
const HookDoor: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.35, 1.2], [0.0, 1.32, 0.85], f / 45), target: [0, 1.4, -2.2], fov: 52 };
  return door(cam, f, [pup("anna", ANNA, ANNA_DOOR, { expression: "smug", armR: [70, -60], armL: [70, -60], lookX: 0.4, bob: breathe(f) })], {
    virgo: f - 2,
  });
};

// Macro: the label maker spits out PARTY.
const LabelPrint: React.FC = () => {
  const f = useShotFrame();
  const at: Vec3 = [ANNA_DOOR[0] + 0.1, 0.78, ANNA_DOOR[1] + 0.32];
  const cam: CameraShot = { position: lerp3([at[0] + 0.55, 1.15, at[2] + 1.2], [at[0] + 0.5, 1.12, at[2] + 0.95], f / 38), target: [at[0] + 0.15, 0.9, at[2]], fov: 44 };
  return (
    <Stage
      bg={moodBackground("daylight")}
      camera={cam}
      puppets={[pup("anna", ANNA, ANNA_DOOR, { expression: "smug", armR: [70, -60], armL: [70, -60], bob: breathe(f) })]}
      set={
        <>
          <DoorSet camera={cam} f={f} />
          <LabelMaker position={at} strip={ramp(f, 6, 26)} text="PARTY" scale={1.3} />
        </>
      }
    />
  );
};

// Anna: name and traits.
const AnnaIntro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.25, 1.2], [-0.65, 1.22, 0.85], (f + 6) / 60), target: [-0.75, 1.3, -2.2], fov: 52 };
  return door(cam, f, [pup("anna", ANNA, ANNA_DOOR, { expression: "smug", ...PROUD, headTilt: Math.sin(f / 10) * 4, bob: breathe(f) })], { virgo: 99, name: f - 4, traits: f - 22 });
};

// She labels the doorbell.
const BellLabel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([DOOR_X + 0.65, 1.2, -0.4], [DOOR_X + 0.7, 1.18, -0.7], f / 50), target: [DOOR_X + 0.8, 1.0, -2.7], fov: 46 };
  return door(cam, f, [pup("anna", ANNA, [DOOR_X + 0.95, -2.3], { expression: "smug", view: "side", facing: -1, armR: [80, -10], lookX: 1 })], { bell: f - 20 });
};

// Spice rack, alphabetical.
const SpiceShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 1.65, -0.9], [0.3, 1.65, -1.0], f / 48), target: [0, 1.65, -2.75], fov: 46 };
  return spice(cam, f, [], { abc: f - 8 });
};

// Colour-coded closet.
const ClosetShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.2], [-0.3, 1.38, 0.8], f / 57), target: [-0.3, 1.35, -2.5], fov: 52 };
  return closet(cam, f, [pup("anna", ANNA, [1.3, -1.35], { expression: "smug", ...POINT, armR: [110 + Math.sin(f / 4) * 8, -10], lookX: -0.9, bob: breathe(f) })], { coded: f - 8 });
};

// The to-do list's to-do list.
const TodoShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.2, 1.55, 0.0], [1.3, 1.55, -0.4], f / 38), target: [1.5, 1.45, -2.9], fov: 46 };
  return closet(cam, f, [], { todo: f - 4 });
};

const TodoAnna: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [1.3, -1.35];
  return closet(close(at[0], at[1], f / 40, 0.2), f, [pup("anna", ANNA, at, { expression: "excited", hold: { item: "phone", hand: "R" }, armR: [90, -60], lookX: 0.4, bob: breathe(f) })], { todo: 99 });
};

// Kitchen: every jar labelled, one by one.
const ANNA_K: [number, number] = [0.4, -1.75];
const KitchenWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.4, 1.2], [0.05, 1.38, 0.85], f / 40), target: [0, 1.1, -2.4], fov: 52 };
  return kitchen(cam, f, [pup("anna", ANNA, ANNA_K, { view: "back", expression: "smug", armR: [80 + Math.sin(f / 2) * 20, -20], armL: [60, -40] })], { tags: f });
};

const JarMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.5, 1.3, -1.0], [0.2, 1.3, -1.1], f / 44), target: [-0.1, 1.05, -2.5], fov: 44 };
  return kitchen(cam, f, [], { tags: 40 + f });
};

// The party: Mel loves it. The frame (seed) sits crooked on the wall behind her.
const MelAmazing: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.3, 1.6], [0.15, 1.28, 1.3], f / 44), target: [-0.1, 1.2, -2.4], fov: 54 };
  return party(cam, f, [pup("mel", MEL, MEL_AT, { expression: "excited", ...ARMS_UP, hold: { item: "drink", hand: "L" }, bob: breathe(f), lookX: -0.6 }), pup("anna", ANNA, ANNA_P, { expression: "smug", ...PROUD, lookX: 0.6 }), ...guests(f)], {
    music: 1,
  });
};

const MelClose: React.FC = () => {
  const f = useShotFrame();
  return party(close(MEL_AT[0], MEL_AT[1], f / 40, 0.25), f, [pup("mel", MEL, MEL_AT, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 5) * 6, bob: breathe(f) })], { music: 1 }, { blur: 6 });
};

// Anna glows: someone finally appreciates the system.
const AnnaGlow: React.FC = () => {
  const f = useShotFrame();
  return party(close(ANNA_P[0], ANNA_P[1], f / 45, -0.2), f, [pup("anna", ANNA, ANNA_P, { expression: "smug", headTilt: 8, ...PROUD, bob: breathe(f) })], {
    music: 1,
    children: <Halo position={[ANNA_P[0], 1.0, ANNA_P[1] - 0.2]} size={1.4} color="#ffd23f" strength={0.25 + ramp(f, 0, 20) * 0.35} />,
  }, { blur: 6 });
};

const SystemWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.6, 2.9], [-0.7, 1.55, 2.5], f / 50), target: [-0.7, 1.2, -2.2], fov: 58 };
  return party(cam, f, [pup("mel", MEL, MEL_AT, { expression: "excited", hold: { item: "drink", hand: "L" }, lookX: -0.6, bob: breathe(f) }), pup("anna", ANNA, ANNA_P, { expression: "smug", ...PROUD }), ...guests(f)], { music: 1 });
};

// Twist: her eyes find the frame.
const FrameSpot: React.FC = () => {
  const f = useShotFrame();
  return party(close(ANNA_P[0], ANNA_P[1], f / 34, 0.2), f, [pup("anna", ANNA, ANNA_P, { expression: f > 8 ? "shocked" : "smug", lookX: -0.4, headTilt: f > 8 ? -6 : 6, blink: false })], { music: 1 - ramp(f, 10, 30) }, { blur: 6 });
};

const FramePush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 34));
  const cam: CameraShot = { position: lerp3([FRAME_AT[0] + 0.1, 1.9, 0.2], [FRAME_AT[0] + 0.03, 2.25, -1.6], p), target: FRAME_AT, fov: 44 };
  return party(cam, f, [], { mode: "cold" }, { truth: ramp(f, 0, 20) * 0.4 });
};

// Macro: two degrees to the left.
const FrameMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([FRAME_AT[0] + 0.02, FRAME_AT[1], -0.5], [FRAME_AT[0], FRAME_AT[1], -0.8], f / 46), target: [FRAME_AT[0], FRAME_AT[1], FRAME_AT[2]], fov: 42 };
  return party(cam, f, [], {
    mode: "cold",
    children: (
      <>
        <Protractor position={[FRAME_AT[0], FRAME_AT[1] - 0.3, FRAME_AT[2] + 0.12]} appear={ramp(f, 4, 12) * 0.6} />
        <Label text="2° LEFT" position={[FRAME_AT[0], FRAME_AT[1] + 0.42, FRAME_AT[2] + 0.14]} width={0.4} fg="#ffffff" bg="#e0262f" appear={f - 14} />
      </>
    ),
  }, { truth: 0.4 });
};

// The music and the guests fade away.
const Silence: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.5, 1.8], [0.2, 1.45, 1.4], f / 46), target: [-0.4, 1.2, -2.2], fov: 52 };
  return party(cam, f, [pup("anna", ANNA, ANNA_P, { view: "back", expression: "skeptical" }), pup("mel", MEL, MEL_AT, { expression: "excited", hold: { item: "drink", hand: "L" }, lookX: -0.8 }), ...guests(f * (1 - ramp(f, 0, 20) * 0.9))], {
    mode: "cold",
    music: 1 - ramp(f, 0, 24),
  }, { truth: 0.3 + ramp(f, 0, 30) * 0.3 });
};

const StareClose: React.FC = () => {
  const f = useShotFrame();
  return party(close(ANNA_P[0], ANNA_P[1], f / 26, -0.25), f, [pup("anna", ANNA, ANNA_P, { expression: "shocked", lookX: -0.5, headTilt: -8 + Math.sin(f) * 1.5, blink: false })], { mode: "cold" }, { truth: 0.5, blur: 6 });
};

// "Does nobody else see this?"
const AnnaPoint: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.4, 1.3, 1.4], [0.35, 1.28, 1.1], f / 46), target: [0.0, 1.15, -2.0], fov: 50 };
  return party(cam, f, [pup("anna", ANNA, ANNA_P, { expression: "shocked", armR: [150 + Math.sin(f / 2) * 8, 20], armL: [30, -40], lookX: 0.6, mouthOpen: 0.6 }), pup("mel", MEL, MEL_AT, { expression: "skeptical", hold: { item: "drink", hand: "L" }, lookX: -1 })], { mode: "cold" }, { truth: 0.3 });
};

// Mel: "See what? It's a party!"
const MelShrug: React.FC = () => {
  const f = useShotFrame();
  return party(close(MEL_AT[0], MEL_AT[1], f / 46, -0.25), f, [pup("mel", MEL, MEL_AT, { expression: "excited", ...ARMS_UP, headTilt: Math.sin(f / 3) * 8, bob: breathe(f) }), pup("anna", ANNA, ANNA_P, { expression: "shocked", lookX: 1 })], { music: 0.6 }, { blur: 6 });
};

// Push into her head.
const HeadPush: React.FC = () => {
  const f = useShotFrame();
  const p = Easing.in(Easing.cubic)(ramp(f, 0, 38));
  const cam: CameraShot = { position: lerp3([ANNA_P[0] + 0.05, 1.1, ANNA_P[1] + 1.6], [ANNA_P[0] + 0.02, 1.02, ANNA_P[1] + 0.2], p), target: [ANNA_P[0], 1.0, ANNA_P[1]], fov: 38 };
  return party(cam, f, [pup("anna", ANNA, ANNA_P, { expression: "skeptical", blink: false })], { mode: "cold" }, { flash: ramp(f, 30, 44), truth: 0.3 });
};

// The office in her head.
const OfficeWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.3, 1.8, 2.6], [0.2, 1.75, 2.2], (f + 6) / 50), target: [0, 1.4, -2.2], fov: 54 };
  return office(cam, f, { inside: f - 4 }, [], { flash: 1 - ramp(f, 0, 10) });
};

// The WRONG stamp hovers, trembling; it never comes down.
const StampShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.35, 1.8, -0.4], [0.3, 1.78, -0.75], f / 47), target: [0, 1.75, -2.2], fov: 46 };
  return office(cam, f, { shake: Math.sin(f * 2.1), wrong: 99 });
};

const StampLow: React.FC = () => {
  const f = useShotFrame();
  const dip = Math.sin(ramp(f, 6, 30) * Math.PI) * 0.6;
  const cam: CameraShot = { position: lerp3([0.25, 0.95, -0.7], [0.2, 0.95, -0.95], f / 48), target: [0, 1.45, -2.2], fov: 52 };
  return office(cam, f, { lift: 1 - dip, shake: Math.sin(f * 2.1), wrong: f - 4 });
};

// The ruler: TWO DEGREES.
const RulerShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.1, 1.95, -0.3], [-1.35, 1.95, -0.7], f / 40), target: [RULER_AT[0], 1.95, -2.9], fov: 46 };
  return office(cam, f, { degrees: f - 6 });
};

const RulerMacro: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([RULER_AT[0] - 0.3, 1.95, -0.9], [RULER_AT[0] + 0.3, 1.95, -1.0], f / 35), target: [RULER_AT[0], 1.95, -2.9], fov: 44 };
  return office(cam, f, { degrees: 99 });
};

// The FIX IT clipboard, list scrolling forever.
const ClipShot: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.2, 1.9, -0.2], [1.4, 1.9, -0.6], f / 40), target: [CLIP_AT[0], 1.85, -2.9], fov: 46 };
  return office(cam, f, { degrees: 99, fix: f - 4, scroll: f * 0.03 });
};

const ClipScroll: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([CLIP_AT[0] - 0.1, 1.7, -0.9], [CLIP_AT[0] - 0.05, 1.7, -1.15], f / 44), target: [CLIP_AT[0], 1.68, -2.9], fov: 44 };
  return office(cam, f, { degrees: 99, fix: 99, scroll: 1.2 + f * 0.09 });
};

// The drawer and its tiny note.
const DrawerOpen: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([1.0, 1.35, -0.6], [0.95, 1.3, -0.85], f / 36), target: [DRAWER_AT[0], 0.5, DRAWER_AT[2]], fov: 46 };
  return office(cam, f, { degrees: 99, fix: 99, drawer: Easing.out(Easing.cubic)(ramp(f, 6, 18)) });
};

const NoteMacro: React.FC = () => {
  const f = useShotFrame();
  const at: Vec3 = [DRAWER_AT[0] + 0.05, DRAWER_AT[1] + 0.1, DRAWER_AT[2] + 0.4];
  const cam: CameraShot = { position: lerp3([at[0], 0.95, at[2] + 0.3], [at[0], 0.85, at[2] + 0.22], f / 35), target: at, fov: 42 };
  return office(cam, f, { degrees: 99, fix: 99, drawer: 1 });
};

// Nobody reads it: the drawer slides shut while the stamp keeps shaking.
const DrawerShut: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.2, 1.6, 1.3], [0.15, 1.55, 1.0], f / 46), target: [0.1, 1.1, -2.2], fov: 50 };
  return office(cam, f, { degrees: 99, fix: 99, shake: Math.sin(f * 2.1), drawer: 1 - Easing.in(Easing.cubic)(ramp(f, 10, 22)), scroll: f * 0.05 });
};

// Ending: Anna climbs the bookshelf to the frame (late burgundy).
const ANNA_CLIMB: [number, number] = [SHELF_AT[0], -2.15];
const onStool = (f: number, pose: PuppetPose, lift = STOOL_H) => (
  <group position={[0, lift, 0]}>
    <PuppetBillboard id="anna" look={ANNA} at={ANNA_CLIMB} pose={pose} />
  </group>
);
const ClimbShelf: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.45, 0.9], [-0.65, 1.5, 0.6], f / 40), target: [SHELF_AT[0], 1.3, -2.4], fov: 52 };
  return party(cam, f, [], {
    mode: "late",
    stool: true,
    children: onStool(f, { view: "back", expression: "skeptical", ...ARMS_UP, armL: [150 + Math.sin(f / 3) * 15, -20], bob: -Math.abs(Math.sin(f / 4)) * 14 }),
  });
};

const ReachClose: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([FRAME_AT[0] + 1.0, 1.95, -0.2], [FRAME_AT[0] + 0.95, 1.95, -0.45], f / 34), target: [FRAME_AT[0] + 0.1, 1.95, -2.6], fov: 50 };
  return party(cam, f, [], {
    mode: "late",
    stool: true,
    tilt: 0.05 - ramp(f, 14, 30) * 0.03,
    children: onStool(f, { view: "back", expression: "skeptical", armR: [125, 50], armL: [110 + Math.sin(f / 2) * 12, 30], bob: Math.sin(f / 2) * 8 }),
  });
};

// Gag: the bookshelf goes over; Anna flies onto the couch.
// Feet end of the lying cut-out; it lies along -x, its centre line just above the seat (0.42 m), clear of both armrests.
const ANNA_COUCH: Vec3 = [COUCH_AT[0] + 0.85, 0.66, COUCH_AT[2] + 0.15];
const Topple: React.FC = () => {
  const f = useShotFrame();
  const tip = Easing.in(Easing.quad)(ramp(f, 8, 22));
  const fly = Easing.inOut(Easing.quad)(ramp(f, 0, 22));
  const at = lerp3([SHELF_AT[0] + 0.3, 1.25, -1.9], ANNA_COUCH, fly);
  const arc = Math.sin(fly * Math.PI) * 0.5;
  const cam: CameraShot = { position: lerp3([0.0, 1.7, 2.2], [0.0, 1.65, 1.95], f / 36), target: [-0.3, 1.0, -2.0], fov: 58 };
  return party(cam, f, [], {
    mode: "late",
    tip,
    tilt: 0.02,
    children: (
      <group position={[at[0], at[1] + arc, at[2]]} rotation={[0, 0, (fly * Math.PI) / 2]} scale={squash(f, 26, 0.2)} userData={{ ghost: true }}>
        <PuppetBillboard id="anna" look={ANNA} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false, sit: true }} />
      </group>
    ),
  });
};

const CouchLand: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.9, 0.9], [0.1, 1.8, 0.6], f / 48), target: [ANNA_COUCH[0] - 0.6, 0.6, ANNA_COUCH[2]], fov: 50 };
  return party(cam, f, [], {
    mode: "late",
    tip: 1,
    tilt: 0.02,
    children: (
      <>
        <group position={ANNA_COUCH} rotation={[0, 0, Math.PI / 2]} scale={squash(f, 0, 0.15)} userData={{ ghost: true }}>
          <PuppetBillboard id="anna" look={ANNA} at={[0, 0]} pose={{ expression: "shocked", ...ARMS_UP, blink: false, sit: true }} />
        </group>
        <DizzyStars position={[ANNA_COUCH[0] - 0.98, ANNA_COUCH[1] + 0.3, ANNA_COUCH[2] + 0.1]} f={f} />
      </>
    ),
  });
};

// The frame: perfectly straight.
const FrameStraight: React.FC = () => {
  const f = useShotFrame();
  const settle = f < 10 ? Math.sin(f * 1.2) * 0.03 * (1 - f / 10) : 0;
  const cam: CameraShot = { position: lerp3([FRAME_AT[0] + 0.05, FRAME_AT[1], -0.6], [FRAME_AT[0], FRAME_AT[1], -0.9], f / 40), target: [FRAME_AT[0], FRAME_AT[1], FRAME_AT[2]], fov: 42 };
  return party(cam, f, [], {
    mode: "late",
    tip: 1,
    tilt: settle,
    children: <Label text="0° PERFECT" position={[FRAME_AT[0], FRAME_AT[1] + 0.42, FRAME_AT[2] + 0.1]} width={0.55} fg="#ffffff" bg="#3fae5a" appear={f - 10} />,
  });
};

const HappyCouch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.1, 1.35, 0.95], [0.1, 1.3, 0.7], f / 44), target: [ANNA_COUCH[0] - 0.9, 0.75, ANNA_COUCH[2]], fov: 38 };
  return party(cam, f, [], {
    mode: "late",
    tip: 1,
    tilt: 0,
    children: (
      <group position={ANNA_COUCH} rotation={[0, 0, Math.PI / 2]} userData={{ ghost: true }}>
        <PuppetBillboard id="anna" look={ANNA} at={[0, 0]} pose={{ expression: "smug", ...ARMS_UP, headTilt: Math.sin(f / 6) * 5, sit: true }} />
      </group>
    ),
  });
};

// Ben walks in; Anna spots him; MAYBE slaps onto his forehead.
const BEN_AT: [number, number] = [-0.1, -1.2];
const BenSpot: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 22, [2.4, -0.6], BEN_AT);
  const cam: CameraShot = { position: lerp3([0.3, 1.3, 1.4], [0.25, 1.28, 1.1], f / 40), target: [0.2, 1.05, -1.8], fov: 50 };
  return party(cam, f, [pup("ben", BEN, w.at, { expression: "excited", ...w.pose, hold: { item: "drink", hand: "R" }, lookX: 0.6 }), pup("mel", MEL, [0.65, -1.45], { expression: "excited", lookX: -1, ...ARMS_UP })], { mode: "late", tip: 1, tilt: 0, music: 0.6 });
};

const MaybeSlap: React.FC = () => {
  const f = useShotFrame();
  const slap = Easing.out(Easing.back(3))(ramp(f, 14, 20));
  const cam = close(BEN_AT[0], BEN_AT[1], f / 60, 0.25);
  return party(cam, f, [pup("ben", BEN, BEN_AT, { expression: f > 18 ? "shocked" : "excited", hold: { item: "drink", hand: "R" }, blink: f > 18 ? false : undefined, lookX: f > 18 ? 0 : 0.6 })], {
    mode: "late",
    tip: 1,
    tilt: 0,
    children: (
      <group userData={{ ghost: true }}>
        {slap > 0.01 && <Label text="MAYBE" position={[BEN_AT[0] + (1 - slap) * 0.5, 1.12, BEN_AT[1] + 0.3]} rotation={[0, 0, -0.12]} width={0.3 * slap + 0.001} fg={"#161212"} bg="#ffffff" />}
        <LabelMaker position={[BEN_AT[0] + 0.55 - slap * 0.1, 0.95, BEN_AT[1] + 0.35]} rotation={[0, 0, 0.3]} strip={ramp(f, 4, 14) * (1 - slap)} text="MAYBE" scale={1.2} />
      </group>
    ),
  });
};

const SHOTS: Shot[] = [
  [0, 40, HookDoor, false],
  [40, 78, LabelPrint, false],
  [78, 130, AnnaIntro, false],
  [130, 192, BellLabel, false],
  [192, 240, SpiceShot, true],
  [240, 297, ClosetShot, true],
  [297, 335, TodoShot, false],
  [335, 374, TodoAnna, false],
  [374, 412, KitchenWide, true],
  [412, 456, JarMacro, false],
  [456, 497, MelAmazing, true],
  [497, 537, MelClose, false],
  [537, 580, AnnaGlow, false],
  [580, 630, SystemWide, false],
  [630, 664, FrameSpot, false],
  [664, 698, FramePush, false],
  [698, 744, FrameMacro, false],
  [744, 790, Silence, false],
  [790, 817, StareClose, false],
  [817, 864, AnnaPoint, false],
  [864, 915, MelShrug, false],
  [915, 961, HeadPush, false],
  [961, 1000, OfficeWide, true],
  [1000, 1047, StampShot, false],
  [1047, 1095, StampLow, false],
  [1095, 1135, RulerShot, false],
  [1135, 1170, RulerMacro, false],
  [1170, 1210, ClipShot, false],
  [1210, 1254, ClipScroll, false],
  [1254, 1290, DrawerOpen, false],
  [1290, 1325, NoteMacro, false],
  [1325, 1371, DrawerShut, false],
  [1371, 1410, ClimbShelf, true],
  [1410, 1444, ReachClose, false],
  [1444, 1480, Topple, false],
  [1480, 1529, CouchLand, false],
  [1529, 1570, FrameStraight, false],
  [1570, 1614, HappyCouch, false],
  [1614, 1655, BenSpot, false],
  [1655, TIMING.totalFrames, MaybeSlap, false],
];

// ---------- sound ----------
// Soft one-shots on words, beds low, so speech stays well above the mix.

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.08, until: 192 },
  { at: 4, src: sfx("pop"), volume: 0.35 },
  ...[48, 54, 60].map((at) => ({ at, src: sfx("tick"), volume: 0.25 })),
  { at: 100, src: sfx("pop"), volume: 0.3 },
  { at: 150, src: sfx("paper"), volume: 0.25 },
  { at: 200, src: sfx("chime"), volume: 0.2 },
  { at: 248, src: sfx("pop"), volume: 0.3 },
  { at: 301, src: sfx("paper"), volume: 0.25 },
  ...[380, 386, 392, 398, 404].map((at) => ({ at, src: sfx("tick"), volume: 0.2 })),
  { at: 456, src: sfx("ambience"), volume: 0.1, until: 630 },
  { at: 545, src: sfx("chime"), volume: 0.25 },
  // The twist: record scratch, the room goes cold.
  { at: 634, src: sfx("tape-stop"), volume: 0.35 },
  { at: 640, src: sfx("riser"), volume: 0.12 },
  { at: 664, src: sfx("hum"), volume: 0.12, until: 915 },
  { at: 702, src: sfx("sting"), volume: 0.3 },
  { at: 820, src: sfx("near-miss"), volume: 0.15 },
  { at: 918, src: sfx("whoosh"), volume: 0.3 },
  { at: 961, src: sfx("hum"), volume: 0.1, until: 1371 },
  { at: 964, src: sfx("pop"), volume: 0.3 },
  ...[1060, 1070].map((at) => ({ at, src: sfx("near-miss"), volume: 0.15 })),
  { at: 1100, src: sfx("pop"), volume: 0.3 },
  { at: 1174, src: sfx("pop"), volume: 0.3 },
  ...[1215, 1225, 1235].map((at) => ({ at, src: sfx("paper"), volume: 0.2 })),
  { at: 1260, src: sfx("drawer"), volume: 0.35 },
  { at: 1337, src: sfx("drawer"), volume: 0.3 },
  { at: 1371, src: sfx("ambience"), volume: 0.08, until: TIMING.totalFrames },
  ...[1376, 1386, 1396].map((at) => ({ at, src: sfx("tick"), volume: 0.2 })),
  { at: 1452, src: sfx("boom"), volume: 0.4 },
  { at: 1470, src: sfx("boom"), volume: 0.3 },
  { at: 1484, src: sfx("chime"), volume: 0.2 },
  { at: 1542, src: sfx("credit-blip"), volume: 0.25 },
  { at: 1660, src: sfx("tick"), volume: 0.25 },
  { at: 1670, src: sfx("stamp"), volume: 0.35 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 630, volume: 0.12 },
  { src: MUSIC_FILES.tension, from: 630, to: 961, volume: 0.13 },
  { src: MUSIC_FILES.mystery, from: 961, to: 1371, volume: 0.13 },
  { src: MUSIC_FILES.lounge, from: 1371, to: TIMING.totalFrames, volume: 0.12 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
