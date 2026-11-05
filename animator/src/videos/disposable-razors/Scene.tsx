import React from "react";
import { interpolate } from "remotion";
import {
  breathe,
  CameraShot,
  Counter,
  Desk,
  faceChange,
  handWorld,
  Headline,
  InkBox,
  jump,
  Label,
  Lamp,
  lerp3,
  lieDown,
  moodBackground,
  Mood,
  MUSIC_FILES,
  MusicCue,
  Plant,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Screen,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Video,
  Window,
} from "../../engine";
import { Balance, Conveyor, Diamond, LockedCase, PatentPaper, Pedestal, PegWall, PelletJar, Razor, RazorPack, RefillPack, ShowCase, Stamp, SteelBin, Vanity } from "./props";
import TIMING_JSON from "./timing.json";

// "Why Razor Refills Are Locked Up Like Jewelry": the handle is cheap bait, the refills (under thirty cents of
// steel and plastic) sell for five dollars, so stores lock them up next to perfume and watches.
// Aisle set: guide/references/razor-aisle.md. Cut to timing.json.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "disposable-razors";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// ---------- cast ----------

const YOU: PuppetLook = { skin: "#fff3e6", hair: "#5a3a1a", outfit: "#2f6fd8" };
const CLERK: PuppetLook = { skin: "#f6dcc4", hair: "#1d1a1a", outfit: "#6a2c8a", lanyard: "#e8b04a", long: true };
const INVENTOR: PuppetLook = { skin: "#fbe9d6", hair: "#3a2a1a", outfit: "#3a3f45", hat: "#2c2420", beard: "#3a2a1a", vest: "#7a5a3a" };
const HOST: PuppetLook = { skin: "#fbe9d6", hair: "#f2cf6b", outfit: "#ff4fa3", glasses: true, lanyard: "#ffffff" };
const NEWGUY: PuppetLook = { skin: "#fbe9d6", hair: "#c8501e", outfit: "#3fae5a", cap: "#1d1a1a" };

const pup = (id: string, look: PuppetLook, at: [number, number], pose: PuppetPose): PuppetPlacement => ({ id, look, at, pose });
const you = (at: [number, number], pose: PuppetPose) => pup("you", YOU, at, pose);

const close = (px: number, pz: number, p: number, dx = -0.3): CameraShot => ({
  position: lerp3([px + dx, 1.05, pz + 1.95], [px + dx * 0.7, 1.02, pz + 1.6], p),
  target: [px, 0.92, pz],
  fov: 36,
});
const medium = (px: number, pz: number, p: number, dx = -0.5): CameraShot => ({
  position: lerp3([px + dx, 1.25, pz + 3.3], [px + dx * 0.8, 1.2, pz + 2.9], p),
  target: [px, 0.85, pz],
  fov: 38,
});

type Grade = { blur?: number; truth?: number; energy?: number };
const stage = (mood: Mood, set: React.ReactNode, camera: CameraShot, puppets: PuppetPlacement[] = [], grade: Grade = {}) => (
  <Stage bg={moodBackground(mood)} camera={camera} puppets={puppets} set={set} {...grade} />
);

// ---------- locations ----------

// The drugstore aisle (back wall z = -2.5): peg wall of handles, then perfume, the locked refills, phones, watches.
const PEG_X = -2.3;
const CASE_X = 0.15;
const SWING_PACK: [number, number, number] = [PEG_X - 0.5 + 0.16 + (1 - 0.32) / 3, 1.65 - 0.3, -2.36];
const AisleSet: React.FC<{ camera: CameraShot; f: number; open?: number; taken?: boolean; swing?: number; help?: boolean }> = ({ camera, f, open = 0, taken = false, swing = 0, help = false }) => (
  <Room camera={camera} mood="daylight" floor="#cfd6de" wall="#dfe8f2" stripe="#2f6fd8" width={8} depth={5} wallPattern="panel" floorPattern="tile">
    <PegWall position={[PEG_X, 0, -2.4]} taken={taken} swing={swing} />
    <ShowCase position={[-1.1, 0, -2.05]} kind="perfume" />
    <LockedCase position={[CASE_X, 0, -2.05]} open={open} f={f} help={help} />
    <ShowCase position={[1.4, 0, -2.05]} kind="phones" />
    <ShowCase position={[2.65, 0, -2.05]} kind="watches" />
    <Label text="SHAVE" position={[-2.3, 2.3, -2.42]} width={0.6} bg="#2f6fd8" fg="#ffffff" />
  </Room>
);
const aisle = (cam: CameraShot, f: number, puppets: PuppetPlacement[], extra: { open?: number; taken?: boolean; swing?: number; help?: boolean } = {}, grade: Grade = {}) =>
  stage("daylight", <AisleSet camera={cam} f={f} {...extra} />, cam, puppets, grade);

// The bathroom (teal tile): vanity against the back wall.
const VANITY_Z = -2.2;
const BathSet: React.FC<{ camera: CameraShot; children?: React.ReactNode }> = ({ camera, children }) => (
  <Room camera={camera} mood="office" floor="#e8ecf0" wall="#2a9d8f" stripe="#ffffff" width={6} depth={5} wallPattern="tile" floorPattern="tile">
    <Vanity position={[0, 0, VANITY_Z]} />
    <Plant position={[-1.3, 0, -2.1]} scale={0.8} />
    {children}
  </Room>
);
const bath = (cam: CameraShot, puppets: PuppetPlacement[], children?: React.ReactNode, grade: Grade = {}) => stage("office", <BathSet camera={cam}>{children}</BathSet>, cam, puppets, grade);
const YOU_BATH: [number, number] = [0.05, -1.45];

// Checkout (golden): counter with a register screen.
const CLERK_AT: [number, number] = [0.15, -1.75];
const CheckoutSet: React.FC<{ camera: CameraShot; f: number; total?: number; tags?: number }> = ({ camera, f, total, tags }) => (
  <Room camera={camera} mood="golden" floor="#7a5a2a" wall="#f2b630" stripe="#e0262f" width={7} depth={5} wallPattern="tile" floorPattern="tile">
    <Label text="CHECKOUT" position={[0, 2.35, -2.43]} width={1.2} bg="#e0262f" fg="#ffffff" />
    <Counter position={[0, 0, -1.05]} size={[1.8, 0.62, 0.6]} color="#2c3a40" top="#e8ecf0" />
    <group position={[0.62, 0.645, -1.1]}>
      <InkBox size={[0.36, 0.2, 0.3]} position={[0, 0.1, 0]} color="#2c3a40" />
      <Screen position={[0, 0.5, -0.05]} size={[0.56, 0.28]} text="$40.00" glow="#4dff9a" bg="#06140c" appear={total} count={total === undefined ? 0 : ramp(total, 0, 22)} />
    </group>
    <RefillPack position={[-0.05, 0.645, -0.95]} scale={1.6} />
    {tags !== undefined && (
      <>
        <RazorPack position={[-0.5, 1.1, -0.95]} scale={1.3} />
        <Label text="$10" position={[-0.5, 1.22, -0.88]} width={0.24} bg="#ffffff" fg="#1d1a1a" appear={tags} />
        <Label text="$40" position={[-0.05, 1.05, -0.88]} width={0.32} bg="#e0262f" fg="#ffffff" appear={tags - 14} />
      </>
    )}
    <Plant position={[-2.2, 0, -2.0]} />
    <Lamp position={[2.0, 0, -2.0]} />
  </Room>
);
const checkout = (cam: CameraShot, f: number, puppets: PuppetPlacement[], extra: { total?: number; tags?: number } = {}, grade: Grade = {}) =>
  stage("golden", <CheckoutSet camera={cam} f={f} {...extra} />, cam, puppets, grade);

// The cost lab (cold blue): a giant refill on the bench, the steel bin and the pellet jar.
const BIN_AT: [number, number, number] = [-0.55, 0.75, -1.3];
const JAR_AT: [number, number, number] = [0.55, 0.75, -1.3];
const LabSet: React.FC<{ camera: CameraShot; f: number; steelAt?: number; plasticAt?: number }> = ({ camera, f, steelAt = -99, plasticAt = -99 }) => (
  <Room camera={camera} mood="cold" floor="#1b2a4a" wall="#2f5fb0" stripe="#8fb3ff" width={7} depth={5} wallPattern="brick" floorPattern="concrete" sun={{ x: 1.4, color: "#8fb3ff", bars: 8 }}>
    <Desk position={[0, 0, -1.3]} size={[2.0, 0.75, 0.75]} color="#3a4a5c" />
    <SteelBin position={BIN_AT} f={f} />
    <PelletJar position={JAR_AT} />
    <RefillPack position={[0, 0.75, -1.55]} scale={3.2} />
    <Label text="STEEL  <5¢" position={[BIN_AT[0], 1.22, -1.1]} width={0.44} bg="#ffd23f" appear={f - steelAt} />
    <Label text="PLASTIC  3-5¢" position={[JAR_AT[0], 1.3, -1.1]} width={0.5} bg="#ffd23f" appear={f - plasticAt} />
    <Label text="COST LAB" position={[0, 2.4, -2.43]} width={1.1} bg="#ffffff" fg="#1d4fa8" />
  </Room>
);
const lab = (cam: CameraShot, f: number, puppets: PuppetPlacement[], extra: { steelAt?: number; plasticAt?: number } = {}, grade: Grade = {}) =>
  stage("cold", <LabSet camera={cam} f={f} {...extra} />, cam, puppets, grade);

// The price balance (alarm red): a pinch of materials on the left pan, the $5 tag slams onto the right.
const BAL_AT: [number, number, number] = [0, 0.7, -1.3];
const ScaleSet: React.FC<{ camera: CameraShot; f: number; drop?: number; costAt?: number; dial?: number }> = ({ camera, f, drop, costAt = -99, dial }) => {
  const d = drop === undefined ? -1 : drop;
  const landed = d >= 10;
  const tagY = landed ? 0.02 : 0.02 + 0.9 * (1 - Math.min(1, Math.max(0, d) / 10) ** 2);
  const tilt = landed ? interpolate(d, [10, 16, 22, 30], [0, 1.15, 0.92, 1], { extrapolateRight: "clamp" }) : 0;
  return (
    <Room camera={camera} mood="alarm" floor="#2a0a0a" wall="#b3202a" stripe="#ffd23f" width={7} depth={5} wallPattern="brick" floorPattern="concrete">
      <Desk position={[0, 0, -1.3]} size={[1.5, 0.7, 0.6]} color="#3a3f45" />
      <Balance
        position={BAL_AT}
        tilt={tilt}
        left={
          <group>
            <InkBox size={[0.05, 0.006, 0.02]} position={[-0.02, 0.01, 0]} color="#cfd8e0" ink={0.001} />
            <mesh position={[0.03, 0.015, 0.01]}>
              <sphereGeometry args={[0.014, 8, 6]} />
              <meshToonMaterial color="#2f6fd8" />
            </mesh>
          </group>
        }
        right={d >= 0 ? <Label text="$5" position={[0, tagY + 0.11, 0]} rotation={[0, 0, landed ? 0 : d * 0.2]} width={0.3} bg="#e0262f" fg="#ffffff" /> : null}
      />
      <Label text="UNDER 30¢" position={[-0.45, 1.68, -1.2]} width={0.44} bg="#ffd23f" appear={f - costAt} />
      {dial !== undefined && <Screen position={[0, 2.05, -2.4]} size={[1.1, 0.5]} text="x15-20" glow="#ffd23f" bg="#140404" appear={dial} count={ramp(dial, 0, 20)} />}
    </Room>
  );
};
const scale = (cam: CameraShot, f: number, puppets: PuppetPlacement[], extra: { drop?: number; costAt?: number; dial?: number } = {}, grade: Grade = {}) =>
  stage("alarm", <ScaleSet camera={cam} f={f} {...extra} />, cam, puppets, grade);

// The patent office, 1904 (warm wood): desk, patent paper, stamp, a wall calendar.
const DESK_AT: [number, number, number] = [0.2, 0, -1.4];
const INVENTOR_AT: [number, number] = [-0.8, -1.15];
const PatentSet: React.FC<{ camera: CameraShot; press?: number; stamped?: boolean }> = ({ camera, press = 0, stamped = false }) => (
  <Room camera={camera} mood="warm" floor="#6a4426" wall="#c98a4a" stripe="#5a3a1a" width={7} depth={5} wallPattern="panel" floorPattern="wood" sun={{ x: -1.5, color: "#ffe6a8", bars: 4 }}>
    <Window position={[-1.5, 1.55, -2.45]} />
    <Desk position={DESK_AT} size={[1.2, 0.75, 0.7]} color="#7a4a26" />
    <PatentPaper position={[0.25, 0.752, -1.3]} stamped={stamped} />
    <Stamp position={[0.33, 0.752, -1.47]} press={press} />
    <Lamp position={[0.7, 0.75, -1.6]} on />
    <Label text={"PATENT\nOFFICE"} position={[0.9, 2.15, -2.43]} width={0.7} bg="#f3ead2" fg="#5a3a1a" />
    <Label text="1904" position={[-0.2, 2.15, -2.43]} width={0.42} bg="#f3ead2" fg="#a3141a" />
  </Room>
);
const patent = (cam: CameraShot, puppets: PuppetPlacement[], extra: { press?: number; stamped?: boolean } = {}, grade: Grade = {}) =>
  stage("warm", <PatentSet camera={cam} {...extra} />, cam, puppets, grade);

// The factory (dusk): one handle comes off the belt; refill packs stream along it forever.
const FactorySet: React.FC<{ camera: CameraShot; f: number; mode: "once" | "forever" }> = ({ camera, f, mode }) => (
  <Room camera={camera} mood="dusk" floor="#3b2a4a" wall="#e07a3a" stripe="#3b2a6b" width={8} depth={5} wallPattern="brick" floorPattern="concrete">
    <Conveyor position={[0, 0, -1.3]} length={3.4} f={f} />
    {mode === "once" ? (
      <>
        <Razor position={[-1.4 + Math.min(f, 30) * 0.04, 0.8, -1.3]} rotation={[0, 0, -Math.PI / 2]} scale={3.5} />
        <Label text="HANDLE: ONCE" position={[0, 1.6, -1.5]} width={0.9} bg="#ffffff" fg="#1d1a1a" appear={f - 8} />
      </>
    ) : (
      <>
        {Array.from({ length: 14 }, (_, i) => {
          const x = -1.7 + ((i * 0.26 + f * 0.035) % 3.4);
          return <RefillPack key={i} position={[x, 0.755, -1.3]} color={["#f28a1c", "#2f6fd8", "#3fae5a", "#9b5de5"][i % 4]} scale={1.4} />;
        })}
        <Label text="BLADES: FOREVER" position={[0, 1.6, -1.5]} width={1.0} bg="#ffd23f" fg="#1d1a1a" appear={f - 6} />
      </>
    )}
  </Room>
);
const factory = (cam: CameraShot, f: number, mode: "once" | "forever") => stage("dusk", <FactorySet camera={cam} f={f} mode={mode} />, cam);

// The blade-race game show (neon): podium with a razor that grows blades; the razor-mower crosses the floor.
const HOST_AT: [number, number] = [-0.6, -1.2];
const POD: [number, number, number] = [0.35, 0, -1.4];
const ShowSet: React.FC<{ camera: CameraShot; f: number; blades?: number; sign?: string; signAt?: number; mower?: number }> = ({ camera, f, blades = 5, sign, signAt = 0, mower }) => (
  <Room camera={camera} mood="neon" floor="#3d2a55" wall="#ff4fa3" stripe="#ffffff" width={8} depth={5} wallPattern="panel" floorPattern="wood">
    <Label text="BLADE RACE" position={[0, 2.35, -2.43]} width={1.3} bg="#14062b" fg="#ff9ad5" />
    <InkBox size={[0.4, 0.9, 0.4]} position={[POD[0], 0.45, POD[2]]} color="#14062b" />
    <InkBox size={[0.44, 0.04, 0.44]} position={[POD[0], 0.92, POD[2]]} color="#ffd23f" />
    {mower === undefined && <Razor position={[POD[0], 0.94, POD[2]]} rotation={[0, f * 0.03, 0]} scale={2.0} blades={blades} />}
    {sign && <Label text={sign} position={[POD[0], 1.78, POD[2] + 0.1]} width={0.6} bg="#ffffff" fg="#1d1a1a" appear={f - signAt} />}
    {mower !== undefined && (
      // The razor lies on its back on four wheels and drives across the floor toward +x, mowing.
      <group userData={{ ghost: true }}>
      <Razor position={[-2.2 + mower * 4.4, 0.12, 0.1]} rotation={[-Math.PI / 2, 0, -Math.PI / 2]} scale={4.5} blades={7} f={f} wheels={1} />
        <Label text="MOWER MODE" position={[-2.2 + mower * 4.4, 0.5, 0.1]} width={0.5} bg="#ffd23f" fg="#1d1a1a" />
      </group>
    )}
  </Room>
);
const show = (cam: CameraShot, f: number, puppets: PuppetPlacement[], extra: { blades?: number; sign?: string; signAt?: number; mower?: number } = {}, grade: Grade = {}) =>
  stage("neon", <ShowSet camera={cam} f={f} {...extra} />, cam, puppets, grade);

// The vault (night): one refill under a glass dome, flanked by diamonds.
const VaultSet: React.FC<{ camera: CameraShot; f: number }> = ({ camera, f }) => (
  <Room camera={camera} mood="night" floor="#141a30" wall="#1f2a55" stripe="#e8b04a" width={7} depth={5} wallPattern="panel" floorPattern="carpet">
    <Pedestal position={[0, 0, -1.4]}>
      <RefillPack position={[0, 0, 0]} scale={1.3} />
    </Pedestal>
    <Pedestal position={[-0.85, 0, -1.7]} color="#1f5c3a">
      <Diamond position={[0, 0.13, 0]} f={f} />
    </Pedestal>
    <Pedestal position={[0.85, 0, -1.7]} color="#1f5c3a">
      <Diamond position={[0, 0.13, 0]} f={f + 30} color="#ffd6f0" />
    </Pedestal>
    <Label text="REFILLS" position={[0, 1.55, -1.25]} width={0.4} bg="#e8b04a" fg="#14062b" />
  </Room>
);
const vault = (cam: CameraShot, f: number, puppets: PuppetPlacement[] = [], grade: Grade = {}) => stage("night", <VaultSet camera={cam} f={f} />, cam, puppets, grade);

// ---------- 0-3.5 s: the hook ----------

// Macro: the $10 handle swings on its peg; the camera rushes in. `offset` shifts the clock so the video's last
// shot is this one just before frame 0 and the Short loops without a jump.
const LOOP = 24;
const hookAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 30);
  const cam: CameraShot = { position: lerp3([SWING_PACK[0] + 0.35, 1.5, -0.95], [SWING_PACK[0] + 0.08, 1.46, -1.72], p), target: [SWING_PACK[0], 1.45, SWING_PACK[2]], fov: 40 };
  return aisle(cam, f, [], { swing: f / 5 }, { energy: 0 });
};
const Hook = hookAt(0);
const LoopIn = hookAt(-LOOP);

const YOU_PEG: [number, number] = [-2.15, -1.35];
const grabReach: [number, number] = [150, -760];

// You snatch the pack and hold it up, grinning; the LOCKED case (the seed) sits behind you.
const Grin: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.35, 1.1, 0.55], [-1.5, 1.08, 0.3], f / 26), target: [-2.0, 1.0, -1.5], fov: 40 };
  return (
    <>
      {stage("daylight", <><AisleSet camera={cam} f={f} taken /><group userData={{ ghost: true }}><RazorPack position={handWorld(YOU_PEG, grabReach, cam)} /></group></>, cam, [you(YOU_PEG, { view: "front", expression: "excited", reachR: grabReach, handR: "fist" })], { energy: 0.5 })}
    </>
  );
};

// The $10 tag stamps onto the pack with a jolt.
const PackSlam: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.95, 1.3, -0.55], [-2.0, 1.27, -0.72], f / 26), target: [-2.1, 1.18, -1.4], fov: 38 };
  const s = squash(f, 6, 0.3);
  return stage(
    "daylight",
    <>
      <AisleSet camera={cam} f={f} taken />
      <group position={[-2.1, 1.38, -1.35]} scale={s}>
        <RazorPack position={[0, 0, 0]} />
        <Label text="$10" position={[0.0, -0.12, 0.07]} rotation={[0, 0, -0.18]} width={0.13} bg="#e0262f" fg="#ffffff" appear={f - 6} />
      </group>
    </>,
    cam,
  );
};

// Low angle: you cheer with the pack. WHAT A BARGAIN!
const Bargain: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.7, 0.45, 0.6], [-1.8, 0.5, 0.25], f / 28), target: [-2.1, 1.05, -1.4], fov: 46 };
  return (
    <>
      {aisle(cam, f, [you(YOU_PEG, { view: "front", expression: "excited", gesture: "cheer" })], { taken: true })}
      <Headline f={f} text="WHAT A BARGAIN!" at={2} />
    </>
  );
};

// ---------- 3.5-10 s: the first shave ----------

const razorInHand = (at: [number, number], reach: [number, number], cam: CameraShot, rot: [number, number, number] = [0, 0, 0.4]) => (
  <group userData={{ ghost: true }}>
    <Razor position={handWorld(at, reach, cam)} rotation={rot} scale={1.6} />
  </group>
);

// Top-down on the basin: the razor glides through the foam.
const BathTop: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.02, 2.05, -1.85], [0.02, 1.85, -1.9], f / 34), target: [0, 0.85, -2.18], fov: 42 };
  const x = Math.sin(f / 5) * 0.08;
  return bath(cam, [], <Razor position={[x, 0.88, -2.05]} rotation={[-Math.PI / 2 + 0.2, 0, 0.3]} scale={1.8} />);
};

// You shave in front of the mirror, smooth as a dolphin.
const Dolphin: React.FC = () => {
  const f = useShotFrame();
  const reach: [number, number] = [70 + Math.sin(f / 4) * 25, -760];
  const cam = medium(YOU_BATH[0], YOU_BATH[1], f / 35, -0.45);
  return bath(cam, [you(YOU_BATH, { view: "front", expression: "happy", reachR: reach, frontR: true, handR: "fist", headTilt: 8 })], razorInHand(YOU_BATH, reach, cam), { energy: 0.6 });
};

// Movie star: you point at yourself in the mirror, sparkling.
const Star: React.FC = () => {
  const f = useShotFrame();
  return bath(close(YOU_BATH[0], YOU_BATH[1], f / 39, -0.25), [you(YOU_BATH, { view: "front", expression: "smug", gesture: "point", headTilt: -6, bob: breathe(f) })], null, { blur: 6 });
};

// Two weeks later: the same shave, but bored.
const TwoWeeks: React.FC = () => {
  const f = useShotFrame();
  const reach: [number, number] = [70 + Math.sin(f / 6) * 15, -760];
  const cam = medium(YOU_BATH[0], YOU_BATH[1], (f + 8) / 44, 0.5);
  return bath(cam, [you(YOU_BATH, { view: "front", expression: "bored", reachR: reach, frontR: true, handR: "fist" })], razorInHand(YOU_BATH, reach, cam), { energy: 0.6 });
};

// Gag: the blade tugs and you jump with a yelp.
const Pliers: React.FC = () => {
  const f = useShotFrame();
  const hit = f >= 12;
  const reach: [number, number] = [70, -760];
  const cam = close(YOU_BATH[0], YOU_BATH[1], f / 56, -0.3);
  return bath(
    cam,
    [you(YOU_BATH, { view: "front", ...faceChange([[0, "worried"], [12, "shocked"], [40, "angry"]], f), ...(hit ? { ...jump(f, 12, 180, 30), armL: [150, -20] } : { reachR: reach, frontR: true, handR: "fist" }) })],
    hit ? null : razorInHand(YOU_BATH, reach, cam),
  );
};

// ---------- 10-15.5 s: the locked case ----------

const YOU_CASE: [number, number] = [CASE_X - 0.35, -1.25];

const AisleWalk: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 30, [-1.6, -1.1], YOU_CASE);
  const cam: CameraShot = { position: lerp3([-1.0, 1.35, 1.9], [-0.7, 1.3, 1.6], (f + 8) / 42), target: [-0.4, 1.0, -1.6], fov: 46 };
  return aisle(cam, f, [you(w.at, { expression: "happy", ...w.pose })]);
};

// Macro: the padlock; your hand yanks the door, it rattles and holds.
const Padlock: React.FC = () => {
  const f = useShotFrame();
  const rattle = f > 8 ? Math.sin(f * 2.2) * 0.02 * Math.max(0, 1 - (f - 8) / 30) : 0;
  const cam: CameraShot = { position: lerp3([CASE_X + 0.75, 1.15, -1.0], [CASE_X + 0.6, 1.1, -1.25], f / 47), target: [CASE_X + 0.42, 1.02, -2.05], fov: 40 };
  return aisle(cam, f, [], { open: rattle });
};

// Truck along the glass: perfume, refills, phones, watches.
const Neighbours: React.FC = () => {
  const f = useShotFrame();
  const x = interpolate(f, [0, 43], [-1.1, 2.2]);
  const cam: CameraShot = { position: [x - 0.2, 1.35, 0.2], target: [x + 0.2, 1.15, -2.05], fov: 46 };
  return aisle(cam, f, []);
};

// You press the red HELP button; it blinks.
const Help: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([CASE_X - 0.1, 1.25, 0.6], [CASE_X, 1.22, 0.3], f / 39), target: [CASE_X + 0.2, 1.05, -1.8], fov: 44 };
  return aisle(cam, f, [you([CASE_X + 0.45, -1.35], { view: "front", expression: "awkward", reachR: [120, -660], handR: "point", lookX: 0.6 })], { help: f >= 8 });
};

// ---------- 15.5-21 s: the twist ----------

// The clerk strolls in with a giant key and swings the door open.
const ClerkKey: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 20, [1.6, -0.95], [CASE_X + 0.5, -1.0]);
  const cam: CameraShot = { position: lerp3([CASE_X - 0.35, 1.3, 1.8], [CASE_X - 0.25, 1.28, 1.5], f / 42), target: [CASE_X + 0.1, 1.0, -1.6], fov: 44 };
  const key = (
    <group userData={{ ghost: true }} position={[w.at[0] - 0.3, 0.98, w.at[1] + 0.05]} rotation={[0, 0, 0.5 + Math.sin(f / 4) * 0.1]}>
      <InkBox size={[0.03, 0.3, 0.02]} position={[0, -0.05, 0]} color="#e8b04a" ink={0.003} />
      <mesh position={[0, 0.14, 0]}>
        <torusGeometry args={[0.06, 0.016, 8, 20]} />
        <meshToonMaterial color="#e8b04a" />
      </mesh>
      <InkBox size={[0.06, 0.04, 0.02]} position={[0.035, -0.18, 0]} color="#e8b04a" ink={0.002} />
    </group>
  );
  return stage(
    "daylight",
    <>
      <AisleSet camera={cam} f={f} open={ease(f, 24, 40)} />
      {key}
    </>,
    cam,
    [pup("clerk", CLERK, w.at, { expression: "smug", ...w.pose, armR: [60, -40] }), you([CASE_X - 0.95, -0.85], { view: "front", expression: "confused" })],
  );
};

// Over your shoulder at checkout: the clerk names the total.
const ClerkTalk: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.55, 1.6], [-0.55, 1.52, 1.4], f / 40), target: [0.42, 1.1, -1.6], fov: 34 };
  return checkout(cam, f, [you([-0.5, 0.15], { view: "back", expression: "neutral" }), pup("clerk", CLERK, CLERK_AT, { expression: "smug", lookX: -0.5, armL: [40, -60] })], { total: f - 30 });
};

// The register counts up to $40.00.
const Total: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.62, 1.25, 0.2], [0.62, 1.2, -0.05], f / 24), target: [0.62, 1.12, -1.15], fov: 40 };
  return checkout(cam, f, [], { total: f + 10 });
};

// Gag: you faint flat on your back.
const Faint: React.FC = () => {
  const f = useShotFrame();
  return checkout(
    medium(-0.4, -0.2, f / 50, -0.3),
    f,
    [you([-0.4, -0.2], { view: "front", ...faceChange([[0, "shocked"]], f), ...(f >= 10 ? lieDown(f, 10, 18) : { armL: [150, -20], armR: [150, -20] }) }), pup("clerk", CLERK, CLERK_AT, { expression: "smug", lookX: -0.7, bob: breathe(f) })],
    {},
    { truth: ramp(f, 0, 20) * 0.35 },
  );
};

// Low angle across the counter: the $10 handle next to $40 of refills.
const Tags: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.3, 0.8, 1.2], [-0.28, 0.82, 1.0], f / 35), target: [-0.28, 1.0, -1.0], fov: 46 };
  return checkout(cam, f, [], { tags: f - 2, total: 99 });
};

// The handle dangles from a fishing line in front of you: bait.
const Bait: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.02, -0.35];
  const sway = Math.sin(f / 8) * 0.12;
  const cam: CameraShot = { position: lerp3([0.35, 1.35, 1.75], [0.3, 1.33, 1.5], f / 38), target: [0.05, 1.25, -1.3], fov: 42 };
  return stage(
    "golden",
    <>
      <CheckoutSet camera={cam} f={f} total={99} />
      <group userData={{ ghost: true }} position={[0.15, 0, -1.15]} rotation={[0, 0, sway]}>
        <mesh position={[0, 2.25, 0]}>
          <cylinderGeometry args={[0.003, 0.003, 1.1, 6]} />
          <meshBasicMaterial color="#161212" />
        </mesh>
        <RazorPack position={[0, 1.7, 0]} scale={1.2} />
      </group>
    </>,
    cam,
    [you(at, { view: "front", ...faceChange([[0, "excited"], [20, "skeptical"]], f), reachR: f < 20 ? [160, -900] : undefined, lookX: 0.6 })],
  );
};

// ---------- 23-36 s: the cost lab and the balance ----------

const LabWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.55, 1.6], [0.0, 1.5, 1.25], (f + 8) / 50), target: [0, 1.0, -1.4], fov: 44 };
  return lab(cam, f, []);
};

const Steel: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([BIN_AT[0] + 0.15, 1.5, 0.15], [BIN_AT[0] + 0.1, 1.45, -0.1], f / 50), target: [BIN_AT[0], 1.08, -1.3], fov: 42 };
  return lab(cam, f, [], { steelAt: 30 });
};

// Top-down into the pellet jar.
const Plastic: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([JAR_AT[0] + 0.15, 1.85, -0.2], [JAR_AT[0] + 0.08, 1.75, -0.45], f / 72), target: [JAR_AT[0], 1.0, -1.3], fov: 44 };
  return lab(cam, f, [], { steelAt: -99, plasticAt: 40 });
};

const Pinch: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.55, 1.35, 0.2], [-0.5, 1.32, -0.05], f / 50), target: [-0.3, 1.1, -1.3], fov: 42 };
  return scale(cam, f, [], { costAt: 34 });
};

// Gag: the $5 tag drops onto the right pan and slams it down.
const Slam: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.15, 1.3, 0.9], [0.1, 1.28, 0.6], f / 79), target: [0.1, 1.05, -1.3], fov: 44 };
  return scale(cam, f, [], { drop: f - 40, costAt: -99 });
};

const Dial: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.7, 1.0], [0.0, 1.75, 0.7], f / 33), target: [0, 1.9, -2.2], fov: 44 };
  return scale(cam, f, [], { drop: 99, costAt: -99, dial: f - 4 });
};

const Facepalm: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [-0.6, -0.5];
  return scale(close(at[0], at[1], f / 40, 0.3), f, [you(at, { view: "front", expression: "sad", gesture: "facepalm" })], { drop: 99, dial: 99 }, { blur: 6 });
};

// ---------- 36-42 s: 1904 ----------

const OfficeWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.2, 1.4, 1.9], [-0.1, 1.35, 1.55], (f + 8) / 55), target: [0, 1.05, -1.4], fov: 44 };
  return patent(cam, [pup("inventor", INVENTOR, INVENTOR_AT, { expression: "determined", lookX: 0.7, armR: [40, -70] })]);
};

// Top-down: the stamp comes down on the patent.
const StampDown: React.FC = () => {
  const f = useShotFrame();
  const press = f < 10 ? ease(f, 0, 10) : 1 - ease(f, 14, 26);
  const cam: CameraShot = { position: lerp3([0.28, 2.0, -1.0], [0.28, 1.8, -1.05], f / 33), target: [0.28, 0.75, -1.35], fov: 44 };
  return patent(cam, [], { press, stamped: f >= 10 });
};

const InventorSmug: React.FC = () => {
  const f = useShotFrame();
  return patent(close(INVENTOR_AT[0], INVENTOR_AT[1], f / 28, -0.25), [pup("inventor", INVENTOR, INVENTOR_AT, { expression: "smug", gesture: "handsOnHips", headTilt: 6 })], { stamped: true }, { blur: 6 });
};

// ---------- 42-44.5 s: handle once, blades forever ----------

const HandleOnce: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.6, 1.4, 1.2], [-0.3, 1.38, 1.0], f / 37), target: [0, 1.0, -1.3], fov: 44 };
  return factory(cam, f, "once");
};

const Forever: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.9, 1.3, 1.0], [0.7, 1.32, 0.8], f / 41), target: [-0.1, 1.1, -1.3], fov: 44 };
  return factory(cam, f, "forever");
};

// ---------- 44.5-50.7 s: the blade race ----------

const HostWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-0.1, 1.45, 1.8], [-0.05, 1.4, 1.45], (f + 8) / 47), target: [0, 1.05, -1.4], fov: 44 };
  return show(cam, f, [pup("host", HOST, HOST_AT, { expression: "excited", gesture: "cheer" })], { blades: 5 });
};

const Podium: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([POD[0] + 0.5, 1.6, 0.4], [POD[0] + 0.3, 1.58, 0.15], f / 36), target: [POD[0], 1.5, POD[2]], fov: 40 };
  return show(cam, f, [], { blades: 5 });
};

const TwoBlades: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([POD[0] - 0.35, 1.62, 0.35], [POD[0] - 0.2, 1.6, 0.1], f / 45), target: [POD[0], 1.55, POD[2]], fov: 40 };
  return show(cam, f, [], { blades: 2, sign: "2 BLADES", signAt: 6 });
};

const SevenBlades: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([POD[0] + 0.35, 1.62, 0.3], [POD[0] + 0.2, 1.6, 0.05], f / 54), target: [POD[0], 1.55, POD[2]], fov: 40 };
  const s = squash(f, 4, 0.3);
  return stage(
    "neon",
    <>
      <ShowSet camera={cam} f={f} blades={f < 4 ? 2 : 7} sign="7 BLADES" signAt={4} />
      <group position={[POD[0], 0.94, POD[2]]} scale={s} />
    </>,
    cam,
  );
};

// The razor-mower charges across the floor.
const Mower: React.FC = () => {
  const f = useShotFrame();
  const m = ramp(f, 0, 51) * 0.6 + 0.05;
  const mx = -2.2 + m * 4.4;
  const cam: CameraShot = { position: [mx - 0.15, 0.65, 1.5], target: [mx + 0.05, 0.3, 0.1], fov: 46 };
  return show(cam, f, [], { mower: m });
};

// Gag: the host jumps as the mower zooms under them.
const Dive: React.FC = () => {
  const f = useShotFrame();
  const m = 0.32 + ramp(f, 0, 42) * 0.35;
  return show(medium(HOST_AT[0], 0.1, f / 42, 0.4), f, [pup("host", HOST, [HOST_AT[0], 0.1], { view: "front", ...faceChange([[0, "shocked"]], f), ...jump(f, 4, 230, 32), armL: [150, -20], armR: [150, -20] })], { mower: m });
};

// ---------- 50.7-53 s: the vault ----------

const VaultWide: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([0.0, 1.45, 1.5], [0.0, 1.38, 1.1], (f + 8) / 45), target: [0, 1.05, -1.5], fov: 44 };
  return vault(cam, f);
};

const Polish: React.FC = () => {
  const f = useShotFrame();
  const at: [number, number] = [0.45, -1.05];
  return vault(close(at[0] - 0.15, at[1], f / 33, -0.35), f, [pup("clerk", CLERK, at, { view: "front", expression: "smug", reachL: [-160 + Math.sin(f / 3) * 30, -620], handL: "open", headTilt: 6 })], { blur: 5 });
};

// ---------- 53-58 s: a new victim, back to the hook ----------

const NewGuyWalk: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 32, [-0.6, -1.1], YOU_PEG);
  const cam: CameraShot = { position: lerp3([-1.1, 1.35, 1.6], [-1.3, 1.3, 1.3], (f + 8) / 55), target: [-1.7, 1.0, -1.6], fov: 46 };
  return aisle(cam, f, [pup("newguy", NEWGUY, w.at, { expression: "happy", ...w.pose })]);
};

const NewGuyGrab: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-1.4, 1.1, 0.4], [-1.55, 1.08, 0.2], f / 43), target: [-1.9, 1.0, -1.5], fov: 40 };
  return aisle(cam, f, [pup("newguy", NEWGUY, YOU_PEG, { view: "front", ...faceChange([[0, "happy"], [14, "excited"]], f), reachR: f < 14 ? [140, -900] : grabReach, handR: "fist" })], { taken: f >= 14 });
};

// Over the new guy's shoulder: the LOCKED case waits. What a bargain.
const Waits: React.FC = () => {
  const f = useShotFrame();
  const cam: CameraShot = { position: lerp3([-2.2, 1.4, 0.5], [-2.15, 1.38, 0.35], f / 28), target: [0.75, 1.2, -2.05], fov: 40 };
  return aisle(cam, f, [pup("newguy", NEWGUY, [-1.35, -0.5], { view: "back", expression: "happy" })], { taken: true });
};

const SHOTS: Shot[] = [
  [0, 26, Hook, false],
  [26, 52, Grin, false],
  [52, 78, PackSlam, false],
  [78, 106, Bargain, false],
  [106, 140, BathTop, true],
  [140, 175, Dolphin, false],
  [175, 214, Star, false],
  [214, 250, TwoWeeks, false],
  [250, 306, Pliers, false],
  [306, 340, AisleWalk, true],
  [340, 387, Padlock, false],
  [387, 430, Neighbours, false],
  [430, 469, Help, false],
  [469, 511, ClerkKey, false],
  [511, 551, ClerkTalk, true],
  [551, 575, Total, false],
  [575, 625, Faint, false],
  [625, 660, Tags, false],
  [660, 698, Bait, false],
  [698, 740, LabWide, true],
  [740, 794, Steel, false],
  [794, 868, Plastic, false],
  [868, 918, Pinch, true],
  [918, 997, Slam, false],
  [997, 1030, Dial, false],
  [1030, 1070, Facepalm, false],
  [1070, 1117, OfficeWide, true],
  [1117, 1150, StampDown, false],
  [1150, 1178, InventorSmug, false],
  [1178, 1215, HandleOnce, true],
  [1215, 1256, Forever, false],
  [1256, 1295, HostWide, true],
  [1295, 1331, Podium, false],
  [1331, 1376, TwoBlades, false],
  [1376, 1430, SevenBlades, false],
  [1430, 1481, Mower, false],
  [1481, 1523, Dive, false],
  [1523, 1560, VaultWide, true],
  [1560, 1593, Polish, false],
  [1593, 1640, NewGuyWalk, true],
  [1640, 1683, NewGuyGrab, false],
  [1683, 1711, Waits, false],
  [1711, TIMING.totalFrames, LoopIn, true],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  { at: 0, src: sfx("ambience"), volume: 0.12, until: 106 },
  { at: 2, src: sfx("whoosh"), volume: 0.4 },
  { at: 30, src: sfx("card"), volume: 0.4 },
  { at: 58, src: sfx("stamp"), volume: 0.35 },
  { at: 80, src: sfx("pop"), volume: 0.45 },
  { at: 106, src: sfx("hum"), volume: 0.08, until: 306 },
  { at: 112, src: sfx("paper"), volume: 0.25 },
  { at: 186, src: sfx("chime"), volume: 0.35 },
  { at: 262, src: sfx("boom"), volume: 0.3 },
  { at: 263, src: sfx("near-miss"), volume: 0.3 },
  { at: 306, src: sfx("ambience"), volume: 0.14, until: 511 },
  { at: 350, src: sfx("door"), volume: 0.3 },
  { at: 352, src: sfx("stamp"), volume: 0.25 },
  { at: 438, src: sfx("button"), volume: 0.45 },
  ...Array.from({ length: 4 }, (_, k) => ({ at: 446 + k * 8, src: sfx("tick"), volume: 0.3 })),
  { at: 485, src: sfx("drawer"), volume: 0.25 },
  { at: 493, src: sfx("door"), volume: 0.35 },
  { at: 541, src: sfx("credit-blip"), volume: 0.35 },
  // The twist: the total lands on "forty dollars".
  { at: 527, src: sfx("riser"), volume: 0.22 },
  { at: 575, src: sfx("sting"), volume: 0.4 },
  { at: 590, src: sfx("boom"), volume: 0.35 },
  { at: 627, src: sfx("pop"), volume: 0.45 },
  { at: 641, src: sfx("pop"), volume: 0.45 },
  { at: 665, src: sfx("whoosh"), volume: 0.3 },
  { at: 698, src: sfx("hum"), volume: 0.15, until: 868 },
  { at: 770, src: sfx("pop"), volume: 0.5 },
  { at: 834, src: sfx("pop"), volume: 0.5 },
  { at: 868, src: sfx("hum"), volume: 0.12, until: 1070 },
  { at: 902, src: sfx("pop"), volume: 0.5 },
  { at: 958, src: sfx("whoosh"), volume: 0.35 },
  { at: 968, src: sfx("stamp"), volume: 0.6 },
  { at: 1001, src: sfx("credit-blip"), volume: 0.35 },
  { at: 1070, src: sfx("ambience"), volume: 0.1, until: 1178 },
  { at: 1123, src: sfx("stamp"), volume: 0.55 },
  { at: 1178, src: sfx("hum"), volume: 0.18, until: 1256 },
  { at: 1186, src: sfx("pop"), volume: 0.45 },
  { at: 1221, src: sfx("pop"), volume: 0.45 },
  { at: 1256, src: sfx("crowd"), volume: 0.18, until: 1523 },
  { at: 1337, src: sfx("pop"), volume: 0.45 },
  { at: 1380, src: sfx("boom"), volume: 0.35 },
  { at: 1381, src: sfx("pop"), volume: 0.5 },
  { at: 1430, src: sfx("engine"), volume: 0.3, until: 1523 },
  { at: 1485, src: sfx("whoosh"), volume: 0.4 },
  { at: 1523, src: sfx("hum"), volume: 0.1, until: 1593 },
  { at: 1530, src: sfx("chime"), volume: 0.35 },
  { at: 1593, src: sfx("ambience"), volume: 0.12, until: TIMING.totalFrames },
  { at: 1655, src: sfx("card"), volume: 0.4 },
  { at: 1713, src: sfx("whoosh"), volume: 0.4 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 306, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: 306, to: 469, volume: 0.22 },
  { src: MUSIC_FILES.mystery, from: 469, to: 698, volume: 0.3 },
  { src: MUSIC_FILES.tension, from: 698, to: 1256, volume: 0.28 },
  { src: MUSIC_FILES.upbeat, from: 1256, to: 1523, volume: 0.24 },
  { src: MUSIC_FILES.mystery, from: 1523, to: 1593, volume: 0.28 },
  { src: MUSIC_FILES.upbeat, from: 1593, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;
