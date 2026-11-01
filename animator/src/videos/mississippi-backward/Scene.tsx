import React from "react";
import {
  CameraShot,
  faceChange,
  Headline,
  Label,
  lerp3,
  lieDown,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  sitDown,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import {
  BankSlab,
  BOAT,
  Chimney,
  CypressLakeSet,
  FallingTree,
  Flatboat,
  GroundCrack,
  LAKE,
  POST,
  RIVER,
  riverBg,
  riverLight,
  RiverMode,
  RiverSet,
  RiverSliceSet,
  SandBlow,
  SLICE,
  sliceWaterY,
  Splash,
  surfaceY,
  VillageSet,
} from "../../three/RiverSets";
import { HOUSE } from "../../three/FarmyardSet";
import TIMING_JSON from "./timing.json";

// "The Day the Mississippi Ran Backward": the New Madrid earthquakes of 1811-1812. A flatboat crew floating down to
// New Orleans sees the banks cave in, the land under the river push up like a step, waterfalls form and the current
// run upstream for a few hours; then the river turns south again and the sunken ground becomes Reelfoot Lake.
// Sets: guide/references/mississippi-1812.md (src/three/RiverSets.tsx).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "mississippi-backward";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const UNITS = 1060 / 1.3; // puppet units per metre (for `air`)

// ---------- cast ----------

const BOATMAN: PuppetLook = { skin: "#e8b890", hair: "#a8a8a8", outfit: "#b83a2a", vest: "#4a3a2a", hat: "#3a2e24", beard: "#d0d0d0" };
const DECKHAND: PuppetLook = { skin: "#f0c8a4", hair: "#6a4a2a", outfit: "#4a6a9a", suspenders: "#2a2420" };
const ELIZA: PuppetLook = { skin: "#f2cca8", hair: "#3a2418", outfit: "#e8e0d0", skirt: true, long: true, kerchief: "#7a3a4a" };
const SETTLER: PuppetLook = { skin: "#e8b890", hair: "#5a3a22", outfit: "#6a4a32", hat: "#2e2620", beard: "#5a3a22" };
const FISHER: PuppetLook = { skin: "#c89068", hair: "#2a1a10", outfit: "#7a8a5a", hat: "#d8c088" };

const BG_LAKE = "#c07ab8";
const BG_NIGHT = riverBg("night");

// Several cuts in one place share one Stage (one WebGL context): each part is a function of its own shot frame.
const multi = (parts: [number, (f: number) => React.ReactElement][]): React.FC => () => {
  const f = useShotFrame();
  let start = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    if (f < start + parts[i][0]) return parts[i][1](f - start);
    start += parts[i][0];
  }
  return parts[parts.length - 1][1](f - start);
};
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());

// The crew on the deck of a flatboat at `boat` (x, z): boatman at the steering post, deckhand by the cabin.
const lanternAt = (boat: Vec3): Vec3 => [boat[0] + BOAT.lantern[0], boat[1] + BOAT.lantern[1], boat[2] + BOAT.lantern[2]];

// ---------- 0-3 s: the hook ----------

// Water level, pre-dawn: a wall of brown water races UP the river at the lens, logs riding it, past the NEW ORLEANS
// post. `offset` shifts the clock: the last shot is this one just before frame 0 so the Short loops.
const LOOP = 24;
const surgeAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 30);
  const bore = -20 + (f + LOOP) * 0.55;
  const camera: CameraShot = { position: lerp3([3.0, 1.15, 10.5], [2.5, 1.1, 9.4], p), target: [0.2, 0.5, -6], fov: 52 };
  return (
    <Stage
      set={<RiverSet camera={camera} frame={f + 100} mode="predawn" water={{ drift: (f + LOOP) * 0.55 + 20, chop: 1.6, bore, boreH: 1.25 }} />}
      camera={camera}
      bg={riverBg("predawn")}
      energy={0}
    />
  );
};
const HookSurge = surgeAt(0);
const LoopIn = surgeAt(-LOOP);

// Hard cut: the boatman at his steering oar by lantern light snaps round, eyes wide (the seed: him and his boat).
const HookBoatman: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-0.9, 1.35, 4.0], [-0.6, 1.25, 3.4], ease(f, 0, 28)), target: [0.1, 1.0, 1.4], fov: 40 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 140} mode="night" water={{ drift: f * 0.4, chop: 1.4 }} post={false}>
          <Flatboat frame={f} sweep={0.4} />
        </RiverSet>
      }
      camera={camera}
      bg={BG_NIGHT}
      puppets={[{ id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "neutral"], [6, "shocked"]], f), lookX: 0.7, gesture: "shrug" }, at: [0.15, 1.6] }]}
      light={riverLight("night", f, BOAT.lantern)}
    />
  );
};

// Hard cut, low on the water by the cut bank: a cottonwood crashes into the river right at the lens.
const SMASH = 13;
const HookTree: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [-2.2 + f * 0.02, 0.4, 6.5], target: [-5.2, 2.6, -1], fov: 54 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 200} mode="predawn" water={{ drift: f * 0.5, chop: 1.8 }} clear={[3, -5]}>
          <FallingTree position={[-RIVER.half - 0.8, 1, -1]} height={9} fall={ease(f, -6, SMASH)} dir={1} />
          <Splash at={[-1.5, RIVER.water, -1]} t={f - SMASH} power={1.8} count={46} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("predawn")}
    />
  );
};

// ---------- 3-7 s: New Madrid ----------

// Drone down the river under the moon, the flatboat's lantern a warm dot on the black water. 1811 - 1812.
const NightAerial: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [4 - f * 0.05, 9 - f * 0.04, 22 - f * 0.18], target: [0, 0, -4 - f * 0.18], fov: 50 };
  return (
    <>
      <Stage
        set={
          <RiverSet camera={camera} frame={f + 260} mode="night" water={{ drift: -f * 0.08 }}>
            <group position={[-1.5, 0, -2 - f * 0.05]}>
              <Flatboat frame={f} />
            </group>
          </RiverSet>
        }
        camera={camera}
        bg={BG_NIGHT}
      />
      <Headline f={f} text="1811 – 1812" at={3} />
    </>
  );
};

// The village shakes in the moonlight; Eliza runs out of her door, the settler stumbles out after her.
const VillageWide = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.8, 1.5, 7.2], [1.2, 1.3, 6.0], ease(f, 0, 40)), target: [-0.4, 1.3, -1.5], fov: 50 };
  const a = stroll(f, 2, 30, [-1.0, -2.55], [-0.6, 1.6]);
  const b = stroll(f, 12, 26, [-1.0, -2.55], [0.9, 0.6]);
  return (
    <Stage
      set={<VillageSet camera={camera} frame={f + 300} shake={1} chimney={false}>
        <Chimney position={[HOUSE.right + 0.38, 0, HOUSE.front - 1.8]} fall={0} />
      </VillageSet>}
      camera={camera}
      bg={BG_NIGHT}
      puppets={[
        { id: "eliza", look: ELIZA, pose: { expression: "shocked", ...a.pose, armL: [140, -30], armR: [140, -30] } as PuppetPose, at: a.at },
        { id: "settler", look: SETTLER, pose: { expression: "worried", ...b.pose } as PuppetPose, at: b.at },
      ]}
      light={riverLight("night", f)}
    />
  );
};

// Gag: the chimney breaks and topples; its top lands on the settler's hat, squashing him flat for a beat.
const TOPPLE = 6;
const CRUSH = 20;
const ChimneyGag = (f: number) => {
  const camera: CameraShot = { position: lerp3([3.9, 1.3, 2.6], [3.5, 1.2, 2.2], ease(f, 0, 30)), target: [2.0, 1.3, -1.6], fov: 48 };
  const k = squash(f, CRUSH, 0.6)[1] - 1;
  return (
    <Stage
      set={
        <VillageSet camera={camera} frame={f + 340} shake={1} chimney={false}>
          <Chimney position={[HOUSE.right + 0.38, 0, HOUSE.front - 1.8]} fall={ease(f, TOPPLE, CRUSH)} />
          <SandBlow at={[2.3, 0, -0.4]} t={f - CRUSH} power={0.3} color="#8a8070" />
        </VillageSet>
      }
      camera={camera}
      bg={BG_NIGHT}
      puppets={[{ id: "settler", look: SETTLER, pose: { ...faceChange([[0, "worried"], [CRUSH, "confused"]], f), squash: f >= CRUSH ? -k * 2 + 0.25 * ramp(f, CRUSH, CRUSH + 4) * (1 - ramp(f, CRUSH + 14, CRUSH + 20)) : 0, lookX: 0.4, headTilt: f > CRUSH ? 12 : 0 }, at: [2.35, 0.1] }]}
      light={riverLight("night", f)}
    />
  );
};

// Low on the street: a crack races across the ground at the lens and a sand blow fountains out of it.
const Crack = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.6, 0.35, 4.6], [0.4, 0.5, 3.8], ease(f, 0, 35)), target: [-0.2, 0.6, -1.5], fov: 52 };
  return (
    <>
      <Stage
        set={
          <VillageSet camera={camera} frame={f + 380} shake={0.8}>
            <GroundCrack a={[-3, -2]} b={[1.6, 3.6]} open={ease(f, 0, 14)} seed={4} />
            <SandBlow at={[-0.4, 0, 0.6]} t={f - 8} power={1.3} />
          </VillageSet>
        }
        camera={camera}
        bg={BG_NIGHT}
      />
      <Headline f={f} text="NEW MADRID, MISSOURI" at={0} />
    </>
  );
};

// ---------- 7-10 s: the banks cave in ----------

// On top of the cut bank: a crack opens behind the edge, the cottonwood on the slab sways.
const BankTop = (f: number) => {
  const camera: CameraShot = { position: lerp3([-RIVER.half + 5.0, 3.0, 8.2], [-RIVER.half + 4.2, 2.8, 7.2], ease(f, 0, 33)), target: [-RIVER.half - 1.0, 1.6, -1.4], fov: 50 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 420} mode="predawn" water={{ drift: -f * 0.1 }} clear={[3, -5]}>
          <BankSlab z={-1.2} crack={ease(f, 2, 26)} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("predawn")}
    />
  );
};

// From the water: the whole slab with its tree slumps into the river; a brown wall of water.
const DROP = 12;
const BankFall = (f: number) => {
  const camera: CameraShot = { position: lerp3([2.0, 0.6, 9.5], [1.6, 0.8, 8.6], ease(f, 0, 32)), target: [-RIVER.half, 0.8, -1.2], fov: 52 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 460} mode="predawn" water={{ drift: -f * 0.1, chop: 1.4 }} clear={[3, -5]}>
          <BankSlab z={-1.2} crack={1} fall={ease(f, 0, DROP + 6)} />
          <Splash at={[-RIVER.half + 1.4, RIVER.water, -1.2]} t={f - DROP} power={2.2} count={50} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("predawn")}
    />
  );
};

// ---------- 10-13 s: the land pushes up ----------

// The river cut open like a cake: the block under the bed rises; its water pours back over the step; the little
// flatboat on the left lurches. LAND PUSHES UP.
const RISE = 8;
const Slice = (f: number) => {
  const rise = ease(f, RISE, RISE + 24);
  const camera: CameraShot = { position: lerp3([0.5, 0.9, 13.6], [0.2, 0.7, 12.4], ease(f, 0, 58)), target: [0.1, -0.9, -0.8], fov: 46 };
  const bx = -1.5;
  const by = sliceWaterY(bx, rise);
  return (
    <Stage
      set={
        <RiverSliceSet camera={camera} frame={f + 500} rise={rise}>
          <group position={[bx, by + 0.02, -0.8]} rotation={[0, Math.PI / 2, Math.sin(f * 0.4) * 0.06 * rise]} scale={0.32}>
            <Flatboat frame={f} lantern={false} />
          </group>
          <Label text={"LAND\nPUSHES UP"} position={[1.6, 1.25, 0.4]} width={1.6} appear={f - RISE - 10} />
        </RiverSliceSet>
      }
      camera={camera}
      bg={riverBg("dawn")}
      energy={0.6}
    />
  );
};

// Behind the boat, looking downstream: the river ahead heaves up into a step, the forest lifts, white water pours back.
const STEP = 8;
const StepRise = (f: number) => {
  const up = ease(f, STEP, STEP + 18);
  const camera: CameraShot = { position: lerp3([1.4, 2.2, 8.5], [1.0, 2.6, 7.4], ease(f, 0, 43)), target: [0, 1.2 + up, -10], fov: 50 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 560} mode="predawn" water={{ drift: f * 0.3 * up, chop: 1.5, uplift: up }}>
          <Flatboat frame={f} pitch={-0.04 * up} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("predawn")}
      puppets={[
        { id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "worried"], [STEP + 6, "shocked"]], f), view: "back" }, at: [0.2, 1.4] },
        { id: "deckhand", look: DECKHAND, pose: { ...faceChange([[0, "worried"], [STEP + 8, "shocked"]], f), view: "back", armL: [150, -20], armR: [150, -20] }, at: [-0.25, 0.7] },
      ]}
      light={riverLight("predawn", f, BOAT.lantern)}
    />
  );
};

// ---------- 13-15 s: "The river's running the wrong way!" ----------

// On deck, close: the boatman points back past the camera at the water rushing upstream past the NEW ORLEANS post.
const Shout = (f: number) => {
  const boat: Vec3 = [3.2, 0, 4];
  const camera: CameraShot = { position: lerp3([boat[0] - 1.1, 1.2, boat[2] + 2.9], [boat[0] - 0.8, 1.15, boat[2] + 2.5], ease(f, 0, 55)), target: [boat[0] + 0.4, 1.05, boat[2] + 0.2], fov: 42 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 600} mode="predawn" water={{ drift: f * 0.45, chop: 1.6 }}>
          <group position={boat} rotation={[0, 0.25, 0]}>
            <Flatboat frame={f} sweep={-0.5} />
          </group>
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("predawn")}
      puppets={[{ id: "boatman", look: BOATMAN, pose: { expression: "shocked", gesture: "point", lookX: 0.6 }, at: [boat[0] + 0.25, boat[2] + 1.2] }]}
      light={riverLight("predawn", f, lanternAt(boat))}
    />
  );
};

// ---------- 15-19 s: upstream, waterfalls ----------

// High over the river as the sky pales: logs and foam stream north, away from the NEW ORLEANS post. FLOWING UPSTREAM.
const Upstream = (f: number) => {
  const camera: CameraShot = { position: [POST[0] + 1.0 + f * 0.02, 6.2 - f * 0.02, POST[2] + 6.5 + f * 0.05], target: [POST[0] - 3.2, 0, POST[2] - 1.5 + f * 0.05], fov: 50 };
  return (
    <>
      <Stage set={<RiverSet camera={camera} frame={f + 650} mode="dawn" water={{ drift: f * 0.5 + 10, chop: 1.3 }} />} camera={camera} bg={riverBg("dawn")} />
      <Headline f={f} text="FLOWING UPSTREAM" at={4} />
    </>
  );
};

// Gag: the current shoves the boat backward; the deckhand hauling the sweep loses his footing and goes flat.
const SHOVE = 10;
const Shove = (f: number) => {
  const heave = Math.max(0, Math.sin(ramp(f, SHOVE - 4, SHOVE + 10) * Math.PI)) * 0.18;
  const camera: CameraShot = { position: lerp3([1.9, 1.5, 4.6], [1.6, 1.35, 4.0], ease(f, 0, 32)), target: [-0.1, 0.6, 1.2], fov: 46 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 700} mode="dawn" water={{ drift: f * 0.6, chop: 2 }} post={false}>
          <Flatboat frame={f} heave={heave} pitch={-heave * 0.25} sweep={f < SHOVE ? 0.2 : 0.2 + ease(f, SHOVE, SHOVE + 8) * 0.6} lantern={false} />
          <Splash at={[-BOAT.half - 0.6, RIVER.water, 0.4]} t={f - SHOVE} power={1.1} count={30} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("dawn")}
      puppets={[
        { id: "deckhand", look: DECKHAND, pose: { ...faceChange([[0, "determined"], [SHOVE, "shocked"]], f), air: heave * UNITS, view: f < SHOVE ? "side" : undefined, facing: 1, reachR: f < SHOVE ? [220, -500] : undefined, ...lieDown(f, SHOVE + 2, 12) } as PuppetPose, at: [0.1, 1.5] },
        { id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "worried"], [SHOVE + 4, "shocked"]], f), air: heave * UNITS, lookX: 0.6 }, at: [-0.7, 0.6] },
      ]}
      light={riverLight("dawn", f)}
    />
  );
};

// Low at the foot of the new falls at dawn: white water thunders across the whole river, mist rising; crane up.
const Falls = (f: number) => {
  const p = ease(f, 0, 51);
  const camera: CameraShot = { position: lerp3([2.6, 0.7, RIVER.step + 12], [1.8, 1.8, RIVER.step + 9.5], p), target: lerp3([0, 1.2, RIVER.step], [-0.5, 2.0, RIVER.step], p), fov: 54 };
  return (
    <>
      <Stage
        set={<RiverSet camera={camera} frame={f + 760} mode="dawn" water={{ drift: f * 0.5 + 30, chop: 1.8, uplift: 1 }} post={false} debris={false} />}
        camera={camera}
        bg={riverBg("dawn")}
      />
      <Headline f={f} text="WATERFALLS" at={8} />
    </>
  );
};

// ---------- 19-22 s: huge waves, falling trees ----------

// Side-on in the swell: the boat climbs and drops over brown waves, spray over the bow, the crew hang on.
const Waves = (f: number) => {
  const w = { drift: f * 0.4, chop: 2.2, swell: 1 };
  const heave = surfaceY(0, 0, f, w) - RIVER.water;
  const pitch = (surfaceY(0, -2, f, w) - surfaceY(0, 2, f, w)) * 0.12;
  const camera: CameraShot = { position: [5.2, 1.5 + heave * 0.5, 2.6 - f * 0.02], target: [0, 0.9 + heave * 0.7, 0.2], fov: 50 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 820} mode="dawn" water={w} post={false}>
          <Flatboat frame={f} heave={heave} pitch={pitch} roll={Math.sin(f * 0.15) * 0.04} lantern={false} />
          <Splash at={[0.4, RIVER.water + heave, BOAT.bow - 0.3]} t={(f % 24) - 2} power={1.0} count={24} />
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("dawn")}
      puppets={[
        { id: "boatman", look: BOATMAN, pose: { expression: "determined", air: heave * UNITS, lean: -8, reachR: [220, -380], view: "side", facing: -1 }, at: [0.1, 1.7] },
        { id: "deckhand", look: DECKHAND, pose: { expression: "shocked", air: heave * UNITS, armL: [150, -20], armR: [150, -20] }, at: [0.5, 0.6] },
      ]}
      light={riverLight("dawn", f)}
    />
  );
};

// Gag: a cottonwood topples off the bank and slaps the water beside the boat; a wall of water drenches the boatman.
const SLAP = 18;
const TreeSlap = (f: number) => {
  const boat: Vec3 = [-3.4, 0, 0];
  const camera: CameraShot = { position: lerp3([boat[0] + 2.4, 1.25, 5.0], [boat[0] + 2.0, 1.2, 4.4], ease(f, 0, 50)), target: [boat[0] - 0.9, 1.25, 0.2], fov: 52 };
  const soaked = f > SLAP + 8;
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 860} mode="dawn" water={{ drift: f * 0.3, chop: 1.8 }} clear={[4, -4]} post={false}>
          <FallingTree position={[-RIVER.half - 0.6, 1, -0.6]} height={9.5} fall={ease(f, 0, SLAP)} dir={1} seed={7} />
          <group position={boat}>
            <Flatboat frame={f} heave={f > SLAP ? Math.sin((f - SLAP) * 0.4) * Math.exp(-(f - SLAP) * 0.1) * 0.12 : 0} lantern={false} />
          </group>
          <Splash at={[boat[0] - 2.0, RIVER.water, -0.6]} t={f - SLAP} power={1.9} count={50} />
          {soaked && (
            <group userData={{ ghost: true }}>
            {Array.from({ length: 6 }, (_, i) => (
              <mesh key={i} position={[boat[0] + 0.3 + (i % 3) * 0.12 - 0.12, 1.15 - ((f * 0.05 + i * 0.3) % 1) * 0.9, 1.6]}>
                <sphereGeometry args={[0.025, 8, 6]} />
                <meshBasicMaterial color="#cfe4f0" />
              </mesh>
            ))}
            </group>
          )}
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("dawn")}
      puppets={[
        { id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "worried"], [SLAP - 6, "shocked"], [SLAP + 10, "disgusted"]], f), lookX: -0.7, hair: soaked ? { lift: -20 } : undefined }, at: [boat[0] + 0.3, 1.6] },
      ]}
      light={riverLight("dawn", f)}
    />
  );
};

// ---------- 22-27 s: south again, the land changed ----------

// Golden calm: the current turns back south; the boat drifts away past the NEW ORLEANS post; the boatman sits down hard.
const South = (f: number) => {
  const boat: Vec3 = [1.4, 0, 1.5 - f * 0.03];
  const camera: CameraShot = { position: lerp3([POST[0] + 0.4, 1.8, POST[2] + 6.5], [POST[0] - 0.4, 2.0, POST[2] + 5.6], ease(f, 0, 64)), target: [boat[0], 0.9, boat[2] - 1], fov: 46 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 920} mode="dawn" water={{ drift: -f * 0.35, chop: 0.8 }} postAppear={4}>
          <group position={boat}>
            <Flatboat frame={f} lantern={false} />
          </group>
        </RiverSet>
      }
      camera={camera}
      bg={riverBg("dawn")}
      puppets={[{ id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "worried"], [20, "happy"]], f), ...sitDown(f, 16) } as PuppetPose, at: [boat[0] + 0.5, boat[2] + 1.5] }]}
      light={riverLight("dawn", f)}
    />
  );
};

// Crane up over the morning valley: the risen step across river and forest, rapids where the falls were.
const Changed = (f: number) => {
  const p = ease(f, 0, 67);
  const camera: CameraShot = { position: lerp3([6, 6, RIVER.step + 22], [9, 18, RIVER.step + 26], p), target: lerp3([0, 0, RIVER.step - 2], [0, 0, RIVER.step - 6], p), fov: 50 };
  return (
    <>
      <Stage
        set={
          <RiverSet camera={camera} frame={f + 980} mode="day" water={{ drift: -f * 0.3, uplift: 0.55 }} post={false}>
            {[
              [-RIVER.half - 2, -6, 0.75],
              [-RIVER.half - 4.5, -9, 0.9],
            ].map(([x, z, fall], i) => (
              <FallingTree key={i} position={[x, x < 0 ? 1 : 0.6, z]} height={8} fall={fall} dir={x < 0 ? 1 : -1} seed={i * 5 + 2} yaw={i * 0.4} />
            ))}
          </RiverSet>
        }
        camera={camera}
        bg={riverBg("day")}
      />
      <Headline f={f} text="CHANGED FOREVER" at={16} />
    </>
  );
};

// ---------- 27-31 s: Reelfoot Lake ----------

// Low over the sunken forest floor at sunrise: water creeps in and rises up the cypress trunks.
const Flood = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.6, 0.4, 7.5], [1.0, 1.0, 6.2], ease(f, 0, 53)), target: [0, 0.6, -6], fov: 52 };
  return <Stage set={<CypressLakeSet camera={camera} frame={f + 1040} flood={ease(f, 0, 50)} canoe={false} />} camera={camera} bg={BG_LAKE} />;
};

// Orbit round the fisherman in his dugout among the cypress; the sign on a post: REELFOOT LAKE.
const Reelfoot = (f: number) => {
  const a = -0.5 + ease(f, 0, 58) * 0.6;
  const c = LAKE.canoe;
  const camera: CameraShot = { position: [c[0] + Math.sin(a) * 4.2, 1.5, c[2] + Math.cos(a) * 4.2], target: [c[0] - 0.4, 1.1, c[2] - 0.8], fov: 44 };
  return (
    <Stage
      set={
        <CypressLakeSet camera={camera} frame={f + 1100}>
          <group position={[c[0] - 0.3, LAKE.water, c[2] - 1.8]}>
            <mesh position={[0, 0.7, 0]}>
              <cylinderGeometry args={[0.06, 0.06, 1.6, 10]} />
              <meshToonMaterial color="#6a4a30" />
            </mesh>
          </group>
          <Label text={"REELFOOT\nLAKE"} position={[c[0] - 0.3, 1.75, c[2] - 1.75]} rotation={[0, a * 0.8, 0]} width={1.0} appear={f - 6} />
        </CypressLakeSet>
      }
      camera={camera}
      bg={BG_LAKE}
      puppets={[{ id: "fisher", look: FISHER, pose: { ...faceChange([[0, "neutral"], [20, "happy"]], f), seat: 1, gesture: f > 26 ? "wave" : undefined, lookX: -0.3 }, at: [c[0], c[2]] }]}
      light={{ tint: "#ffd8e0", shadow: 0.16, distant: [{ direction: [-0.5, 0.2, -0.8], color: "#ffb090", strength: 1.3 }] }}
    />
  );
};

// ---------- 31-34 s: the wrong way ----------

// A sweeping aerial in the pre-dawn: the wall of water runs up the whole river between the dark forests.
const Sweep = (f: number) => {
  const camera: CameraShot = { position: [-9 + f * 0.16, 7 + f * 0.02, 6 - f * 0.1], target: [0, 0, -12 - f * 0.2], fov: 50 };
  return (
    <>
      <Stage
        set={<RiverSet camera={camera} frame={f + 1160} mode="predawn" water={{ drift: f * 0.6 + 40, chop: 1.5, bore: -30 + f * 0.6, boreH: 1.7 }} />}
        camera={camera}
        bg={riverBg("predawn")}
      />
      <Headline f={f} text="THE WRONG WAY" at={18} />
    </>
  );
};

// The boatman at his oar, lantern lit, looks back up the river: and the water is coming again (into the loop).
const LookBack = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.9, 1.2, 4.2], [0.6, 1.15, 3.6], ease(f, 0, 28)), target: [-0.1, 1.0, 1.4], fov: 40 };
  return (
    <Stage
      set={
        <RiverSet camera={camera} frame={f + 1220} mode="night" water={{ drift: -f * 0.1 }} post={false}>
          <Flatboat frame={f} sweep={-0.4} />
        </RiverSet>
      }
      camera={camera}
      bg={BG_NIGHT}
      puppets={[{ id: "boatman", look: BOATMAN, pose: { ...faceChange([[0, "happy"], [14, "worried"]], f), lookX: -0.7, headTilt: 6 }, at: [-0.15, 1.6] }]}
      light={riverLight("night", f, BOAT.lantern)}
    />
  );
};

const VillageShot = multi([[35, VillageWide], [30, ChimneyGag]]);
const CrackShot = one(Crack);
const BankShot = multi([[34, BankTop], [33, BankFall]]);
const SliceShot = one(Slice);
const StepShot = one(StepRise);
const ShoutShot = one(Shout);
const UpstreamShot = multi([[47, Upstream], [32, Shove]]);
const FallsShot = one(Falls);
const WaveShot = multi([[45, Waves], [61, TreeSlap]]);
const SouthShot = one(South);
const ChangedShot = one(Changed);
const LakeShot = multi([[53, Flood], [58, Reelfoot]]);
const SweepShot = one(Sweep);
const LookShot = one(LookBack);

// Cuts inside multi shots: 160 (chimney gag); 259 (bank falls); 497 (shove); 625 (tree slap); 870 (Reelfoot).
const SHOTS: Shot[] = [
  [0, 30, HookSurge, false],
  [30, 58, HookBoatman, false],
  [58, 84, HookTree, false],
  [84, 125, NightAerial, false],
  [125, 190, VillageShot, true],
  [190, 225, CrackShot, false],
  [225, 292, BankShot, true],
  [292, 350, SliceShot, true],
  [350, 393, StepShot, true],
  [393, 450, ShoutShot, false],
  [450, 529, UpstreamShot, true],
  [529, 580, FallsShot, true],
  [580, 686, WaveShot, true],
  [686, 750, SouthShot, false],
  [750, 817, ChangedShot, true],
  [817, 928, LakeShot, true],
  [928, 975, SweepShot, true],
  [975, 1003, LookShot, true], // 1003 = totalFrames - LOOP
  [1003, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  // hook
  { at: 0, src: sfx("river"), volume: 0.35, until: 30 },
  { at: 0, src: sfx("rumble"), volume: 0.25, until: 84 },
  { at: 0, src: sfx("whoosh"), volume: 0.5 },
  { at: 26, src: sfx("splash"), volume: 0.45 },
  { at: 30, src: sfx("creak"), volume: 0.5 },
  { at: 36, src: sfx("stamp"), volume: 0.25 },
  { at: 52, src: sfx("crack"), volume: 0.6 },
  { at: 58 + SMASH, src: sfx("splash"), volume: 0.8 },
  { at: 58 + SMASH, src: sfx("stamp"), volume: 0.4 },
  { at: 84, src: sfx("river"), volume: 0.12, until: 125 },
  { at: 87, src: sfx("pop"), volume: 0.3 },
  { at: 121, src: sfx("whoosh"), volume: 0.4 },
  // New Madrid
  { at: 125, src: sfx("rumble"), volume: 0.38, until: 225 },
  { at: 125, src: sfx("boom"), volume: 0.4 },
  { at: 127, src: sfx("door"), volume: 0.4 },
  { at: 135, src: sfx("steps"), volume: 0.15, until: 160 },
  { at: 160 + TOPPLE, src: sfx("crack"), volume: 0.4 },
  { at: 160 + CRUSH, src: sfx("stamp"), volume: 0.35 },
  { at: 160 + CRUSH, src: sfx("plop"), volume: 0.6 },
  { at: 190, src: sfx("crack"), volume: 0.35 },
  { at: 190, src: sfx("pop"), volume: 0.3 },
  { at: 198, src: sfx("hiss"), volume: 0.4 },
  { at: 221, src: sfx("whoosh"), volume: 0.4 },
  // banks
  { at: 225, src: sfx("rumble"), volume: 0.3, until: 292 },
  { at: 225, src: sfx("river"), volume: 0.15, until: 292 },
  { at: 229, src: sfx("crack"), volume: 0.45 },
  { at: 259 + DROP, src: sfx("boom"), volume: 0.5 },
  { at: 259 + DROP, src: sfx("splash"), volume: 0.85 },
  { at: 288, src: sfx("whoosh"), volume: 0.4 },
  // the land pushes up (twist)
  { at: 292, src: sfx("rumble"), volume: 0.28, until: 393 },
  { at: 350 + STEP - 48, src: sfx("riser"), volume: 0.35 }, // 1.6 s, ends on the step's sting
  { at: 292 + RISE + 6, src: sfx("falls"), volume: 0.15, until: 350 },
  { at: 292 + RISE + 18, src: sfx("pop"), volume: 0.35 },
  { at: 346, src: sfx("whoosh"), volume: 0.4 },
  { at: 350 + STEP, src: sfx("sting"), volume: 0.55 },
  { at: 350 + STEP, src: sfx("boom"), volume: 0.6 },
  { at: 350 + STEP + 6, src: sfx("falls"), volume: 0.25, until: 393 },
  // the shout, upstream, falls
  { at: 393, src: sfx("river"), volume: 0.23, until: 529 },
  { at: 393, src: sfx("creak"), volume: 0.4 },
  { at: 446, src: sfx("whoosh"), volume: 0.4 },
  { at: 454, src: sfx("pop"), volume: 0.3 },
  { at: 497 + SHOVE, src: sfx("splash"), volume: 0.5 },
  { at: 497 + SHOVE, src: sfx("creak"), volume: 0.6 },
  { at: 497 + SHOVE + 6, src: sfx("plop"), volume: 0.7 },
  { at: 497 + SHOVE + 7, src: sfx("stamp"), volume: 0.3 },
  { at: 525, src: sfx("whoosh"), volume: 0.4 },
  { at: 529, src: sfx("falls"), volume: 0.42, until: 580 },
  { at: 537, src: sfx("pop"), volume: 0.3 },
  // waves and the tree
  { at: 576, src: sfx("whoosh"), volume: 0.4 },
  { at: 580, src: sfx("river"), volume: 0.28, until: 686 },
  { at: 582, src: sfx("splash"), volume: 0.4 },
  { at: 598, src: sfx("creak"), volume: 0.5 },
  { at: 606, src: sfx("splash"), volume: 0.4 },
  { at: 625, src: sfx("crack"), volume: 0.7 },
  { at: 625 + SLAP, src: sfx("splash"), volume: 0.9 },
  { at: 625 + SLAP, src: sfx("boom"), volume: 0.45 },
  { at: 625 + SLAP + 10, src: sfx("near-miss"), volume: 0.3 },
  // south again
  { at: 686, src: sfx("river"), volume: 0.1, until: 750 },
  { at: 686, src: sfx("wind"), volume: 0.15, until: 817 },
  { at: 690, src: sfx("pop"), volume: 0.3 },
  { at: 702, src: sfx("plop"), volume: 0.4 },
  { at: 746, src: sfx("whoosh"), volume: 0.4 },
  { at: 766, src: sfx("pop"), volume: 0.3 },
  { at: 750, src: sfx("falls"), volume: 0.07, until: 817 },
  // Reelfoot
  { at: 813, src: sfx("whoosh"), volume: 0.4 },
  { at: 817, src: sfx("river"), volume: 0.1, until: 870 },
  { at: 870, src: sfx("chime"), volume: 0.3 },
  { at: 876, src: sfx("pop"), volume: 0.35 },
  { at: 870, src: sfx("wind"), volume: 0.12, until: 928 },
  // the end, into the loop
  { at: 924, src: sfx("whoosh"), volume: 0.4 },
  { at: 928, src: sfx("rumble"), volume: 0.23, until: 975 },
  { at: 928, src: sfx("river"), volume: 0.25, until: 975 },
  { at: 946, src: sfx("pop"), volume: 0.3 },
  { at: 971, src: sfx("whoosh"), volume: 0.4 },
  { at: 975, src: sfx("creak"), volume: 0.4 },
  { at: 999, src: sfx("whoosh"), volume: 0.5 },
  { at: 1003, src: sfx("river"), volume: 0.35, until: TIMING.totalFrames },
  { at: 1003, src: sfx("rumble"), volume: 0.25, until: TIMING.totalFrames },
];

// Pulsing from the quake to the falls, a big bright bed for the waves and the calm, dark again for the loop.
const MUSIC: MusicCue[] = [
  { src: "music/tension.wav", from: 0, to: 292, volume: 0.22 },
  { src: "music/mystery.wav", from: 292, to: 580, volume: 0.22 },
  { src: "music/upbeat.wav", from: 580, to: 928, volume: 0.22 },
  { src: "music/tension.wav", from: 928, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
