import React from "react";
import { AbsoluteFill } from "remotion";
import {
  CameraShot,
  faceChange,
  Halo,
  Headline,
  InkBox,
  Label,
  Lamp,
  lerp3,
  MusicCue,
  PuppetLight,
  PuppetLook,
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
  Video,
} from "../../engine";
import {
  Binoculars,
  Compressor,
  Crate,
  Easel,
  fieldBg,
  fieldLight,
  GhostFieldSet,
  Hedgerow,
  Hose,
  MapTable,
  PaintPots,
  RadioSet,
  RubberStamp,
  Sherman,
  SoundTruck,
  StampMark,
  StarDecal,
} from "../../three/GhostArmySets";
import TIMING_JSON from "./timing.json";

// "These WWII Tanks Were Full of Air": the Ghost Army (23rd Headquarters Special Troops) faked whole divisions with
// inflatable Shermans, speaker half-tracks blasting recorded battle sounds and spoof radio, so the enemy watched the
// fake army while real troops moved elsewhere. Sets: guide/references/ghost-army.md (src/three/GhostArmySets.tsx).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "ghost-army";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// ---------- cast ----------

const HELMET = "#4f5a2c";
const GI: PuppetLook = { skin: "#f2c9a4", hair: "#5a3a24", outfit: "#5d6532", hat: HELMET, hatStyle: "helmet" };
const GI2: PuppetLook = { skin: "#8a5a3c", hair: "#1e1612", outfit: "#5d6532", hat: HELMET, hatStyle: "helmet" };
const GI3: PuppetLook = { skin: "#eab890", hair: "#c88a4a", outfit: "#626a38", hat: HELMET, hatStyle: "helmet" };
const GI4: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#58602e", hat: HELMET, hatStyle: "helmet" };
const ARTIST: PuppetLook = { skin: "#f4d0b0", hair: "#3a2418", outfit: "#6a7040", pattern: "#f2f0e4", glasses: true };
const RADIOMAN: PuppetLook = { skin: "#e8b890", hair: "#4a3020", outfit: "#5a6236" };
const OBSERVER: PuppetLook = { skin: "#e8c4a0", hair: "#7a5a3a", outfit: "#5a6472", hat: "#4a525e", hatStyle: "stahl" };
const OFFICER: PuppetLook = { skin: "#eac09a", hair: "#8a7a6a", outfit: "#4e524c", glasses: true };

const pose = (p: Partial<PuppetPose>) => ({ expression: "neutral", ...p }) as PuppetPose;

// Several cuts in one place share one Stage: each part is a function of its own shot frame.
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

// The decoy park seen in the wide shots: three rows of rubber Shermans dressed with branches.
const DECOYS: [number, number, number][] = [
  [-3.2, -3.0, 0.3],
  [0.6, -3.6, 0.2],
  [4.2, -3.2, 0.35],
  [-1.6, -6.4, 0.25],
  [2.4, -6.8, 0.3],
  [-4.6, -7.2, 0.2],
];
const DecoyPark: React.FC<{ frame: number; inflate?: (i: number) => number }> = ({ frame, inflate }) => (
  <>
    {DECOYS.map(([x, z, r], i) => (
      <Sherman key={i} frame={frame} position={[x, 0, z]} rotationY={r} inflate={inflate ? inflate(i) : 1} branches />
    ))}
  </>
);

// ---------- 0-3 s: the hook ----------

// Low in the dawn grass: a Sherman's turret swings its barrel straight at the lens. `offset` shifts the clock: the
// last shot is this one just before frame 0 so the Short loops.
const LOOP = 24;
const hookBarrelAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 24);
  const camera: CameraShot = { position: lerp3([4.6, 0.3, 3.0], [3.7, 0.4, 2.3], p), target: lerp3([0.2, 1.3, 0], [0.5, 1.2, 0.2], p), fov: 50 };
  const turret = 0.7 - 1.25 * ease(f, -LOOP + 4, 18);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 60} mode="dawn">
          <Sherman frame={f} turret={turret} />
          <Sherman frame={f} position={[-3.5, 0, -5]} rotationY={0.3} branches />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("dawn")}
      energy={0}
    />
  );
};
const HookBarrel = hookBarrelAt(0);
const LoopIn = hookBarrelAt(-LOOP);

// Hard cut: an enemy observer at the hedge lowers his binoculars, stunned (the seed).
const HookBinoc: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([0.55, 1.12, 2.5], [0.4, 1.06, 2.05], ease(f, 0, 22)), target: [0, 0.92, 0], fov: 38 };
  const down = ease(f, 3, 10);
  const handY = -790 + down * 260;
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 90} mode="dawn">
          <Hedgerow a={[-3, -1.2]} b={[3, -1.2]} seed={7} />
          <group userData={{ ghost: true }}>
            <Binoculars position={[0.02, 0.96 - down * 0.32, 0.4]} rotation={[down * 0.6, 0, 0]} scale={1.8} />
          </group>
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("dawn")}
      puppets={[
        {
          id: "observer",
          look: OBSERVER,
          at: [0, 0],
          pose: pose({ ...faceChange([[0, "thinking"], [8, "shocked"]], f), reachL: [-60, handY], reachR: [60, handY], frontL: true, frontR: true, handL: "fist", handR: "fist", view: "front" }),
        },
      ]}
      light={fieldLight("dawn")}
      blur={6}
    />
  );
};

// Hard cut: a GI slaps the hull: it squeaks and wobbles like jelly; the camera jolts.
const SLAP = 7;
const HookSlap: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([3.3, 1.0, 3.6], [3.0, 0.95, 3.2], ease(f, 0, 20)), target: [1.2, 0.85, 0.3], fov: 46 };
  const hit = f >= SLAP;
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 110} mode="dawn">
          <Sherman frame={f} wobble={f - SLAP} rotationY={0} />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("dawn")}
      puppets={[
        {
          id: "gi",
          look: GI,
          at: [2.3, 0.55],
          pose: pose({
            ...faceChange([[0, "determined"], [SLAP + 3, "excited"]], f),
            view: "side",
            facing: -1,
            reachL: hit ? [-330, -640] : [-250, -860],
            handL: "open",
            lean: hit ? -6 : 4,
            view: "front",
          }),
        },
      ]}
      light={fieldLight("dawn")}
    />
  );
};

// Pull back: four GIs lift the whole tank over their heads. FULL OF AIR.
const HookLift: React.FC = () => {
  const f = useShotFrame();
  const p = ease(f, 0, 34);
  const camera: CameraShot = { position: lerp3([0.8, 1.25, 4.4], [1.2, 1.2, 5.9], p), target: [0, 1.5, 0], fov: 48 };
  const lift = 1.3 + ease(f, 0, 9) * 0.12 + Math.sin(f * 0.25) * 0.03;
  const arms = (k: number): Partial<PuppetPose> => ({ armL: [150 + Math.sin(f * 0.25 + k) * 4, -20], armR: [150 + Math.sin(f * 0.25 + k) * 4, -20], handL: "open", handR: "open", view: "front" });
  return (
    <>
      <Stage
        set={
          <GhostFieldSet camera={camera} frame={f + 130} mode="dawn">
            <group position={[0, lift, 0]} rotation={[0, 0.0, Math.sin(f * 0.2) * 0.03]}>
              <Sherman frame={f} />
            </group>
          </GhostFieldSet>
        }
        camera={camera}
        bg={fieldBg("dawn")}
        puppets={[
          { id: "gi", look: GI, at: [-1.15, 0.5], pose: pose({ expression: "excited", ...arms(0) }) },
          { id: "gi2", look: GI2, at: [-0.38, 0.55], pose: pose({ expression: "happy", ...arms(1) }) },
          { id: "gi3", look: GI3, at: [0.4, 0.5], pose: pose({ expression: "excited", ...arms(2) }) },
          { id: "gi4", look: GI4, at: [1.18, 0.55], pose: pose({ expression: "smug", ...arms(3) }) },
        ]}
        light={fieldLight("dawn")}
      />
      <Headline f={f} text="FULL OF AIR" at={7} />
    </>
  );
};

// ---------- 3-6 s: the secret unit ----------

// Night tent: a crate marked 23RD HQ SPECIAL TROOPS gets a red TOP SECRET stamp.
const STAMP = 15;
const TentStamp = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.95, 1.7, 2.9], [0.6, 1.6, 2.4], ease(f, 0, 40)), target: [0, 0.6, 0], fov: 42 };
  const down = f < STAMP ? ease(f, STAMP - 7, STAMP) : 1 - ease(f, STAMP + 4, STAMP + 12);
  const light: PuppetLight = { tint: "#ffe6c0", shadow: 0.25, points: [{ position: [-0.6, 1.9, 0.2], color: "#ffb860", strength: 2.4, range: 3 }] };
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#6a5a3a" wall="#6e6a3e" wallPattern="panel" floorPattern="wood" width={6} depth={4}>
          <Lamp position={[-0.6, 1.6, 0.0]} color="#ffb860" />
          <Crate position={[0, 0, 0]} text={"23RD HQ\nSPECIAL TROOPS"} size={[0.95, 0.6, 0.6]} />
          <Crate position={[-1.0, 0, -0.5]} size={[0.8, 0.5, 0.55]} rotationY={0.3} text="ENGINEERS" />
          <Crate position={[1.0, 0, -0.6]} size={[0.7, 0.9, 0.55]} rotationY={-0.2} />
          <StampMark position={[0, 0.603, 0.06]} rotation={[-Math.PI / 2, 0, 0.12]} text="TOP SECRET" appear={f - STAMP} width={0.62} />
          <group userData={{ ghost: true }}>
            <RubberStamp position={[0.0, 0.6, 0.06]} down={down} />
          </group>
        </Room>
      }
      camera={camera}
      bg="#2a120a"
      puppets={[
        {
          id: "gi",
          look: GI3,
          at: [0.15, -0.55],
          pose: pose({ expression: "determined", reachR: [-60, -600 + (1 - down) * 160], frontR: true, handR: "fist", view: "front" }),
        },
      ]}
      light={light}
    />
  );
};

// The barn: an artist (603rd camoufleur) paints the white star onto a rubber Sherman. THE GHOST ARMY.
const Artist = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.5, 1.2, 3.3], [1.1, 1.12, 2.8], ease(f, 0, 46)), target: [-0.25, 0.92, 0.1], fov: 44 };
  const paint = ease(f, 2, 34);
  const stroke = Math.sin(f * 0.6) * 25;
  return (
    <>
      <Stage
        set={
          <Room camera={camera} mood="golden" floor="#8a6a42" wall="#9a6a3c" wallPattern="panel" floorPattern="wood" width={8} depth={6} sun={{ x: 1.4, bars: 5 }}>
            <Sherman frame={f} position={[-0.6, 0, -0.9]} star={0} />
            <StarDecal position={[-0.85, 0.86, -0.07]} size={0.55} paint={paint} />
            <Easel position={[1.75, 0, -0.6]} rotationY={-0.4} paint={1} />
            <PaintPots position={[0.4, 0, 0.55]} />
          </Room>
        }
        camera={camera}
        bg="#3a2208"
        puppets={[
          {
            id: "artist",
            look: ARTIST,
            at: [0.3, 0.35],
            pose: pose({ expression: "happy", view: "side", facing: -1, reachL: [-330 + stroke, -680 + stroke * 0.6], handL: "fist", lean: -6 }),
          },
        ]}
        light={{ tint: "#fff0d8", shadow: 0.15, distant: [{ direction: [0.6, 0.5, 0.4], color: "#ffd890", strength: 1.3 }] }}
      />
      <Headline f={f} text="THE GHOST ARMY" at={6} />
    </>
  );
};

// ---------- 6-9 s: inflatable tanks in open fields ----------

// Low macro by the compressor: the flywheel spins, air pulses down the hose and the Sherman swells up behind it.
const Pump = (f: number) => {
  const camera: CameraShot = { position: lerp3([-0.45, 0.55, 5.0], [-0.6, 0.6, 4.5], ease(f, 0, 39)), target: [-0.5, 0.85, 1.0], fov: 56 };
  const inflate = ease(f, 0, 34);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 200} mode="noon">
          <Sherman frame={f} inflate={inflate} rotationY={0.15} star={inflate > 0.7 ? 1 : 0} />
          <Compressor frame={f} position={[-0.65, 0, 2.3]} rotationY={0.2} />
          <Hose frame={f} points={[[-0.6, 0.22, 2.65], [-0.15, 0.04, 2.7], [0.25, 0.04, 1.8], [-0.2, 0.3, 1.15], [-0.45, 0.7, 0.9]]} />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("noon")}
      puppets={[{ id: "gi2", look: GI2, at: [0.95, 2.3], pose: pose({ expression: "excited", gesture: "cheer" }) }]}
      light={fieldLight("noon")}
    />
  );
};

// Top-down over the field: rubber tanks pop up one after another in rows while GIs run between them.
const TopDown = (f: number) => {
  const a = f * 0.006;
  const camera: CameraShot = { position: [Math.sin(a) * 1.4, 14 - f * 0.04, 1.4 + Math.cos(a) * 1.4], target: [0, 0, -1], fov: 42 };
  const pop = (i: number) => ease(f, i * 5 - 4, i * 5 + 6);
  const run1 = stroll(f, 0, 38, [-0.2, 4.0], [-0.15, -1.4]);
  const run2 = stroll(f, 4, 34, [0.25, 3.0], [0.2, -3.6]);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 240} mode="noon">
          {[
            [-1.5, 2.6],
            [1.5, 2.2],
            [-1.5, -1.2],
            [1.5, -1.6],
            [-1.5, -5.0],
            [1.5, -5.4],
          ].map(([x, z], i) => (
            <Sherman key={i} frame={f} position={[x, 0, z]} rotationY={Math.PI / 2 + (i % 2 ? 0.1 : -0.08)} inflate={pop(i)} />
          ))}
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("noon")}
      puppets={[
        { id: "gi", look: GI, at: run1.at, pose: pose({ expression: "excited", ...run1.pose }) },
        { id: "gi3", look: GI3, at: run2.at, pose: pose({ expression: "happy", ...run2.pose }) },
      ]}
      light={fieldLight("noon")}
    />
  );
};

// ---------- 9-12 s: battle sounds and fake radio ----------

// Dusk, low angle: the half-track's speaker array blasts recorded battle sounds; a GI holds his ears.
const Speakers = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.5, 0.45, 5.4], [1.1, 0.5, 4.6], ease(f, 0, 51)), target: [-0.8, 1.8, 0], fov: 50 };
  const blast = ease(f, 3, 9);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 300} mode="dusk">
          <SoundTruck frame={f} rotationY={0.1} blast={blast} />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("dusk")}
      puppets={[
        {
          id: "gi4",
          look: GI4,
          at: [1.55, 2.5],
          pose: pose({ ...faceChange([[0, "happy"], [6, "shocked"]], f), reachL: [-215, -820], reachR: [215, -820], handL: "open", handR: "open", crouch: 0.15 * blast, view: "front" }),
        },
      ]}
      light={fieldLight("dusk")}
    />
  );
};

// Inside the radio truck: the operator taps out fake messages on the Morse key; the dial lamp blinks with it.
const Radio = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.15, 1.5, 3.1], [0.0, 1.42, 2.7], ease(f, 0, 48)), target: [-0.2, 1.15, -0.65], fov: 50 };
  const tap = Math.sin(f * 0.9) > 0.2 ? 1 : 0;
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#3a3e34" wall="#2e4a44" wallPattern="panel" floorPattern="concrete" width={5} depth={3.4}>
          <RadioSet frame={f} position={[0.1, 0, -0.75]} tap={tap} />
          <Halo position={[0.35, 1.2, -0.6]} size={1.2} color="#4affb0" strength={0.25} />
        </Room>
      }
      camera={camera}
      bg="#0a1430"
      puppets={[
        {
          id: "radioman",
          look: RADIOMAN,
          at: [-0.6, 0.15],
          pose: pose({ expression: "smug", reachR: [180, -660 + tap * 14], frontR: true, handR: "fist", lookX: 0.5, view: "front" }),
        },
      ]}
      light={{ tint: "#c8f0e0", shadow: 0.25, points: [{ position: [0.6, 1.2, -0.35], color: "#6affb0", strength: tap ? 2.2 : 1.2, range: 2.5 }] }}
    />
  );
};

// ---------- 12-14.5 s: the enemy sees an army ----------

// Over the observer's shoulder on the ridge: below, a whole field of tanks and the speaker truck booming.
const ObserverOTS = (f: number) => {
  const camera: CameraShot = { position: lerp3([2.05, 1.15, 8.45], [1.8, 1.2, 8.1], ease(f, 0, 36)), target: [-0.4, 0.9, -4], fov: 44 };
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 360} mode="dusk">
          <DecoyPark frame={f} />
          <SoundTruck frame={f} position={[4.6, 0, -0.6]} rotationY={-0.6} blast={1} label={false} />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("dusk")}
      puppets={[{ id: "observer", look: OBSERVER, at: [1.05, 4.9], pose: pose({ expression: "worried", view: "back", reachL: [-90, -800], reachR: [90, -800] }) }]}
      light={fieldLight("dusk")}
      energy={0.5}
    />
  );
};

// Through his binoculars: two round lenses on rows of tanks; a slow pan finds more and more of them.
const BinocPOV = (f: number) => {
  const camera: CameraShot = { position: [0.4 - f * 0.02, 2.2, 7.4], target: [-2.2 + f * 0.1, 0.7, -4], fov: 24 };
  return (
    <>
      <Stage
        set={
          <GhostFieldSet camera={camera} frame={f + 400} mode="dusk">
            <DecoyPark frame={f} />
            <SoundTruck frame={f} position={[4.6, 0, -0.6]} rotationY={-0.6} blast={1} label={false} />
          </GhostFieldSet>
        }
        camera={camera}
        bg={fieldBg("dusk")}
        energy={1.4}
      />
      <AbsoluteFill>
        <svg width="100%" height="100%" viewBox="0 0 1080 1920" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="binoc">
              <rect width={1080} height={1920} fill="white" />
              <circle cx={330} cy={820} r={330} fill="black" />
              <circle cx={750} cy={820} r={330} fill="black" />
            </mask>
          </defs>
          <rect width={1080} height={1920} fill="#050505" mask="url(#binoc)" />
          <line x1={540} y1={700} x2={540} y2={940} stroke="#050505" strokeWidth={6} opacity={0.5} />
        </svg>
      </AbsoluteFill>
    </>
  );
};

// ---------- 14.5-18 s: 1,100 pretend to be 30,000 ----------

// The unit's own tally board: OUR MEN 1,100 counts up behind three GIs.
const RollCall = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.25, 0.95, 2.7], [0.1, 1.05, 2.1], ease(f, 0, 53)), target: [0, 1.45, -1], fov: 46 };
  return (
    <Stage
      set={
        <Room camera={camera} mood="golden" floor="#6a6a40" wall="#8a8658" wallPattern="panel" floorPattern="wood" width={6} depth={4} sun={{ x: -1.2, bars: 4 }}>
          <InkBox size={[1.5, 1.0, 0.06]} position={[0, 2.0, -1.85]} color="#2e3a30" ink={0.02} />
          <Label text={"OUR MEN\n1,100"} position={[0, 2.0, -1.8]} width={1.2} count={ease(f, 4, 30)} appear={f - 2} />
          <Crate position={[-1.6, 0, -1.4]} text="SECRET" />
        </Room>
      }
      camera={camera}
      bg="#3a2208"
      puppets={[
        { id: "gi", look: GI, at: [-0.6, -0.2], pose: pose({ expression: "smug", gesture: "handsOnHips" }) },
        { id: "gi2", look: GI2, at: [0.05, 0.0], pose: pose({ expression: "happy" }) },
        { id: "gi3", look: GI3, at: [0.65, -0.25], pose: pose({ expression: "excited", gesture: "point", lookX: -0.5 }) },
      ]}
      light={{ tint: "#fff0d8", shadow: 0.15, distant: [{ direction: [-0.5, 0.6, 0.5], color: "#ffd890", strength: 1.1 }] }}
    />
  );
};

// The enemy map room, red lamp: tank markers keep popping up on the map; the officer's count reaches 30,000.
const MapRoom = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.2, 1.75, 2.6], [0.1, 1.65, 2.1], ease(f, 0, 56)), target: [0.1, 1.35, -0.8], fov: 50 };
  return (
    <Stage
      set={
        <Room camera={camera} mood="alarm" floor="#4a2a24" wall="#5a3430" wallPattern="brick" floorPattern="wood" width={6} depth={4}>
          <MapTable position={[0, 0, -0.1]} markers={ease(f, 0, 40)} />
          <Lamp position={[0.0, 2.2, -0.2]} color="#ff6a4a" />
          <Label text={"THEY SEE\n30,000"} position={[-0.05, 2.0, -1.85]} width={0.9} count={ease(f, 4, 34)} appear={f - 2} bg="#f4e8d0" />
        </Room>
      }
      camera={camera}
      bg="#2a0606"
      puppets={[
        {
          id: "officer",
          look: OFFICER,
          at: [0.75, -0.9],
          pose: pose({ ...faceChange([[0, "worried"], [24, "shocked"]], f), reachL: [-240, -640], frontL: true, handL: "point", view: "front" }),
        },
      ]}
      light={{ tint: "#ffc8c0", shadow: 0.3, points: [{ position: [0, 1.9, -0.2], color: "#ff5a3a", strength: 2.2, range: 3.5 }] }}
    />
  );
};

// ---------- 18-21.5 s: the twist ----------

// Night: a flare hangs over the fake field; the observer stares through his binoculars, sure of himself.
const Watch = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.6, 1.15, 8.3], [0.35, 1.05, 7.7], ease(f, 0, 36)), target: [0, 1.0, 5.6], fov: 40 };
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 560} mode="night" flare={1}>
          <DecoyPark frame={f} />
          <group userData={{ ghost: true }}>
            <Binoculars position={[0, 0.98, 6.17]} />
          </group>
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("night")}
      puppets={[
        {
          id: "observer",
          look: OBSERVER,
          at: [0, 6.0],
          pose: pose({ expression: "smug", reachL: [-60, -790], reachR: [60, -790], frontL: true, frontR: true, handL: "fist", handR: "fist", view: "front" }),
        },
      ]}
      light={fieldLight("night", 1)}
      blur={5}
    />
  );
};

// Hard cut, low in the dark lane: real tanks roll into frame and past the lens the other way, GIs marching beside.
const Column = (f: number) => {
  const camera: CameraShot = { position: lerp3([2.4, 0.32, 5.2], [1.6, 0.4, 4.6], ease(f, 0, 66)), target: [-0.6, 0.9, 1.0], fov: 48 };
  const x1 = 4.2 - f * 0.15;
  const x2 = x1 + 5.2;
  const m1 = stroll(f, 0, 66, [3.6, 1.7], [-2.4, 1.7]);
  const m2 = stroll(f, 0, 66, [5.0, 1.8], [-1.0, 1.8]);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 600} mode="night" flare={0.8}>
          <Sherman frame={f} position={[x1, 0, 0.4]} rotationY={Math.PI} real />
          <Sherman frame={f} position={[x2, 0, 0.4]} rotationY={Math.PI} real turret={0.1} />
          {[x1, x2].map((x, i) => (
            <group key={i} userData={{ ghost: true }}>
              <Halo position={[x - 1.85, 0.6, 0.95]} size={0.35} color="#ff9a6a" strength={0.6} />
            </group>
          ))}
          <Hedgerow a={[-8, -1.4]} b={[8, -1.4]} seed={13} />
          <pointLight position={[1.5, 3.2, 3.5]} intensity={22} distance={12} color="#a8bcff" />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("night")}
      puppets={[
        { id: "gi", look: GI, at: m1.at, pose: pose({ expression: "determined", ...m1.pose }) },
        { id: "gi2", look: GI2, at: m2.at, pose: pose({ expression: "determined", ...m2.pose }) },
      ]}
      light={fieldLight("night", 0.8)}
    />
  );
};

// ---------- 21.5-25 s: the ending ----------

// Sunrise: a GI leans on the barrel and it bends down with a hiss; his buddy cracks up.
const LEAN = 10;
const Droop = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.9, 1.25, 5.0], [1.2, 1.18, 4.4], ease(f, 0, 50)), target: [1.1, 1.0, 0], fov: 50 };
  const droop = ease(f, LEAN, LEAN + 22);
  return (
    <Stage
      set={
        <GhostFieldSet camera={camera} frame={f + 650} mode="sunrise">
          <Sherman frame={f} droop={droop} />
        </GhostFieldSet>
      }
      camera={camera}
      bg={fieldBg("sunrise")}
      puppets={[
        {
          id: "gi3",
          look: GI3,
          at: [2.35, 0.4],
          pose: pose({ ...faceChange([[0, "smug"], [LEAN + 6, "shocked"], [LEAN + 26, "awkward"]], f), reachL: [-150 - droop * 230, -1060 + droop * 560], frontL: true, handL: "open", lean: -8 - droop * 16 }),
        },
        { id: "gi2", look: GI2, at: [0.3, 1.45], pose: pose({ ...faceChange([[0, "neutral"], [LEAN + 14, "excited"]], f), gesture: f > LEAN + 14 ? "clap" : undefined }) },
      ]}
      light={fieldLight("sunrise")}
    />
  );
};

// Crane up over the sunrise field and its rubber army. A TRICK THAT SAVED LIVES.
const Crane = (f: number) => {
  const p = ease(f, 0, 46);
  const camera: CameraShot = { position: lerp3([2.6, 1.2, 6.0], [3.8, 4.6, 9.4], p), target: lerp3([0, 1.0, -2], [0, 0.4, -3.5], p), fov: 48 };
  return (
    <>
      <Stage
        set={
          <GhostFieldSet camera={camera} frame={f + 700} mode="sunrise">
            <DecoyPark frame={f} />
            <Sherman frame={f} droop={1} />
          </GhostFieldSet>
        }
        camera={camera}
        bg={fieldBg("sunrise")}
        puppets={[
          { id: "gi", look: GI, at: [1.0, 1.2], pose: pose({ expression: "happy", gesture: "wave" }) },
          { id: "gi4", look: GI4, at: [-1.0, 1.4], pose: pose({ expression: "happy", gesture: "cheer" }) },
        ]}
        light={fieldLight("sunrise")}
      />
      <Headline f={f} text="A TRICK THAT SAVED LIVES" at={13} />
    </>
  );
};

const StampShot = one(TentStamp);
const ArtistShot = one(Artist);
const PumpShot = one(Pump);
const TopShot = one(TopDown);
const SpeakerShot = one(Speakers);
const RadioShot = one(Radio);
const OTSShot = one(ObserverOTS);
const POVShot = one(BinocPOV);
const RollShot = one(RollCall);
const MapShot = one(MapRoom);
const WatchShot = one(Watch);
const ColumnShot = one(Column);
const DroopShot = one(Droop);
const CraneShot = one(Crane);

const SHOTS: Shot[] = [
  [0, 22, HookBarrel, false],
  [22, 42, HookBinoc, false],
  [42, 62, HookSlap, false],
  [62, 97, HookLift, false],
  [97, 140, StampShot, true],
  [140, 187, ArtistShot, true],
  [187, 226, PumpShot, true],
  [226, 265, TopShot, false],
  [265, 316, SpeakerShot, true],
  [316, 364, RadioShot, true],
  [364, 400, OTSShot, true],
  [400, 439, POVShot, false],
  [439, 492, RollShot, true],
  [492, 548, MapShot, true],
  [548, 584, WatchShot, true],
  [584, 650, ColumnShot, false],
  [650, 700, DroopShot, true],
  [700, 746, CraneShot, false], // 746 = totalFrames - LOOP
  [746, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  // hook
  { at: 0, src: sfx("tank"), volume: 0.55, until: 22 },
  { at: 0, src: sfx("whoosh"), volume: 0.4 },
  { at: 6, src: sfx("creak"), volume: 0.35 },
  { at: 22, src: sfx("wind"), volume: 0.35, until: 97 },
  { at: 30, src: sfx("button"), volume: 0.4 },
  { at: 42 + SLAP, src: sfx("squeak"), volume: 0.8 },
  { at: 42 + SLAP, src: sfx("stamp"), volume: 0.3 },
  { at: 62, src: sfx("whoosh"), volume: 0.4 },
  { at: 64, src: sfx("squeak"), volume: 0.35 },
  { at: 69, src: sfx("pop"), volume: 0.35 },
  { at: 93, src: sfx("whoosh"), volume: 0.4 },
  // secret unit
  { at: 97, src: sfx("hum"), volume: 0.12, until: 140 },
  { at: 97 + STAMP, src: sfx("stamp"), volume: 0.6 },
  { at: 136, src: sfx("whoosh"), volume: 0.4 },
  { at: 140, src: sfx("paper"), volume: 0.3 },
  { at: 146, src: sfx("pop"), volume: 0.35 },
  { at: 183, src: sfx("whoosh"), volume: 0.4 },
  // inflating
  { at: 187, src: sfx("compressor"), volume: 0.5, until: 230 },
  { at: 187, src: sfx("wind"), volume: 0.25, until: 265 },
  { at: 214, src: sfx("squeak"), volume: 0.4 },
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ at: 226 + i * 5 + 2, src: sfx("pop"), volume: 0.35 })),
  { at: 261, src: sfx("whoosh"), volume: 0.4 },
  // sounds and radio
  { at: 268, src: sfx("battle"), volume: 0.38, until: 318 },
  { at: 270, src: sfx("boom"), volume: 0.35 },
  { at: 290, src: sfx("boom"), volume: 0.25 },
  { at: 312, src: sfx("whoosh"), volume: 0.4 },
  { at: 316, src: sfx("morse"), volume: 0.55, until: 364 },
  { at: 360, src: sfx("whoosh"), volume: 0.4 },
  // the enemy watches
  { at: 364, src: sfx("battle"), volume: 0.12, until: 439 },
  { at: 364, src: sfx("wind"), volume: 0.3, until: 439 },
  { at: 402, src: sfx("tick"), volume: 0.4 },
  { at: 435, src: sfx("whoosh"), volume: 0.4 },
  // the numbers
  { at: 441, src: sfx("pop"), volume: 0.35 },
  { at: 443, src: sfx("bill-whirr"), volume: 0.25 },
  { at: 488, src: sfx("whoosh"), volume: 0.4 },
  { at: 494, src: sfx("pop"), volume: 0.35 },
  ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ at: 492 + i * 5, src: sfx("tick"), volume: 0.35 })),
  { at: 496, src: sfx("credit-blip"), volume: 0.3 },
  { at: 544, src: sfx("whoosh"), volume: 0.4 },
  // twist
  { at: 548, src: sfx("wind"), volume: 0.35, until: 584 },
  { at: 548, src: sfx("hiss"), volume: 0.12 },
  { at: 584 - 48, src: sfx("riser"), volume: 0.4 },
  { at: 584, src: sfx("sting"), volume: 0.55 },
  { at: 584, src: sfx("tank"), volume: 0.8, until: 650 },
  { at: 584, src: sfx("steps"), volume: 0.25, until: 650 },
  { at: 646, src: sfx("whoosh"), volume: 0.4 },
  // ending
  { at: 650, src: sfx("wind"), volume: 0.3, until: 746 },
  { at: 650 + LEAN + 2, src: sfx("deflate"), volume: 0.65 },
  { at: 650 + LEAN + 24, src: sfx("squeak"), volume: 0.4 },
  { at: 700, src: sfx("crowd"), volume: 0.15, until: 746 },
  { at: 713, src: sfx("pop"), volume: 0.35 },
  { at: 742, src: sfx("whoosh"), volume: 0.45 },
  { at: 746, src: sfx("tank"), volume: 0.55, until: TIMING.totalFrames },
  { at: 746, src: sfx("whoosh"), volume: 0.4 },
];

// Bright for the hook and the build-up, pulsing through the deception, dark at the twist, bright again to loop.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 265, volume: 0.3 },
  { src: "music/tension.wav", from: 265, to: 584, volume: 0.3 },
  { src: "music/mystery.wav", from: 584, to: 652, volume: 0.32 },
  { src: "music/upbeat.wav", from: 650, to: TIMING.totalFrames, volume: 0.3 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;

