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
import { crestZ, ErieSet, erieHalf, fallsBg, fallsLight, MILL, NIAGARA, NiagaraSet } from "../../three/NiagaraSets";
import { Fingerpost, Splash } from "../../three/RiverSets";
import { Drop, Fish, FlyingHat, Horse, HORSE, Lantern, Musket, PocketWatch } from "./props";
import TIMING_JSON from "./timing.json";

// "The Day Niagara Falls Went Silent": March 1848. Gale winds drove Lake Erie's ice into the mouth of the Niagara
// River, the jam plugged it like a cork, and the falls stopped for about thirty hours: people walked and rode across
// the bare riverbed until the ice broke and a wall of water came back. Sets: guide/references/niagara-1848.md
// (src/three/NiagaraSets.tsx).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "niagara-silent";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const UNITS = 1060 / 1.3; // puppet units per metre (for `air`)
const LIFT = NIAGARA.bankH; // sets on the bank are lowered by this so the bank is the floor

// ---------- cast ----------

const MILLER: PuppetLook = { skin: "#e8b890", hair: "#b0b0b0", outfit: "#e8e0cc", apron: "#f6f2e6", vest: "#6a4a32", hat: "#5a4632", beard: "#d8d8d8" };
const MARTHA: PuppetLook = { skin: "#f2cca8", hair: "#8a3a1e", outfit: "#3a5a9a", skirt: true, long: true, kerchief: "#c8a060" };
const TOM: PuppetLook = { skin: "#f0c8a4", hair: "#c87a3a", outfit: "#c0392b", suspenders: "#3a2a1a" };
const RIDER: PuppetLook = { skin: "#e0b088", hair: "#2a1a10", outfit: "#3a6a3a", hat: "#2e2620" };
const RIDER_NOHAT: PuppetLook = { ...RIDER, hat: undefined };
const WALKER: PuppetLook = { skin: "#d8a47c", hair: "#1a1a1a", outfit: "#6a3a7a", skirt: true, long: true, apron: "#e8e0d0" };

// A puppet sitting in the saddle of a horse standing at (x, z).
const saddleAir = (HORSE.saddle - 0.34) * UNITS;

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

// ---------- 0-2 s: the hook ----------

// From the gorge rim: the roaring falls, mist boiling up at the lens, a rainbow. `offset` shifts the clock: the last
// shot is this one just before frame 0, so the Short loops.
const LOOP = 27;
const HOOK_CAM = (f: number): CameraShot => {
  const p = ease(f, -LOOP, 20);
  return { position: lerp3([12.5, 2.6, 17], [11, 1.6, 13.5], p), target: lerp3([-1, -4.4, -1], [-1.5, -4.8, -1], p), fov: 52 };
};
const roarAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const camera = HOOK_CAM(f);
  return (
    <Stage
      set={<NiagaraSet camera={camera} frame={f + 400} mode="day" water={{ flow: 1 }} rainbow={0.9} mill={false} />}
      camera={camera}
      bg={fallsBg("day")}
      energy={0}
    />
  );
};
const HookRoar = roarAt(0);
const LoopIn = roarAt(-LOOP);

// Hard cut, at the brink: the green lip of water pours over the edge right past the lens; tilt down after it.
const HookLip: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([-6.5, 1.1, 1.4], [-6.2, 0.9, 2.2], ease(f, 0, 14)), target: lerp3([-3.2, -1.0, -1.6], [-3, -3.6, 0.4], ease(f, 0, 14)), fov: 54 };
  return <Stage set={<NiagaraSet camera={camera} frame={f + 440} mode="day" water={{ flow: 1 }} mill={false} />} camera={camera} bg={fallsBg("day")} energy={0.4} />;
};

// SILENT: the same view as the hook, at night: bare cliff, three trickles, no mist. The camera jolts back.
const HookSilent: React.FC = () => {
  const f = useShotFrame();
  const camera = HOOK_CAM(20 - f * 0.25);
  return <Stage set={<NiagaraSet camera={camera} frame={f + 460} mode="night" water={{ flow: 0 }} mill={false} />} camera={camera} bg={fallsBg("night")} energy={0} />;
};

// ---------- 2-6 s: the mill, the night of 29 March ----------

const DOOR: [number, number] = [MILL.x - 2.3, MILL.z + 1.0];
const LANTERN: [number, number, number] = [MILL.x - 1.95, LIFT + 1.9, MILL.z + 1.75]; // set coords (before the lift)

// The mill on the bank under the moon; the door opens and Martha steps out, worried. MARCH 1848.
const MillNight = (f: number) => {
  const camera: CameraShot = { position: lerp3([MILL.x - 6.5, 3.2, MILL.z + 6.5], [MILL.x - 5.4, 2.0, MILL.z + 5.2], ease(f, 0, 42)), target: [MILL.x - 1.8, 0.9, MILL.z + 0.6], fov: 46 };
  const w = stroll(f, 6, 26, [DOOR[0] + 0.3, DOOR[1]], [DOOR[0] - 0.2, DOOR[1] + 1.4]);
  return (
    <>
      <Stage
        set={
          <NiagaraSet camera={camera} frame={f + 500} mode="night" water={{ flow: 0 }} lift={LIFT}>
            <Lantern position={LANTERN} frame={f} />
          </NiagaraSet>
        }
        camera={camera}
        bg={fallsBg("night")}
        puppets={[{ id: "martha", look: MARTHA, pose: { ...faceChange([[0, "confused"], [22, "worried"]], f), ...w.pose, lookX: -0.6 } as PuppetPose, at: w.at }]}
        light={fallsLight("night", f, [LANTERN[0], LANTERN[1] - LIFT, LANTERN[2]])}
      />
      <Headline f={f} text="MARCH 1848" at={14} />
    </>
  );
};

// The miller hurries past her to the river wall, holding his hat on.
const MillerOut = (f: number) => {
  const camera: CameraShot = { position: lerp3([MILL.x - 3.6, 1.35, MILL.z + 4.6], [MILL.x - 3.9, 1.3, MILL.z + 3.6], ease(f, 0, 40)), target: [MILL.x - 2.2, 0.9, MILL.z + 0.4], fov: 44 };
  const w = stroll(f, 0, 30, [DOOR[0] + 0.2, DOOR[1] - 0.2], [NIAGARA.bank + 0.75, MILL.z - 0.6]);
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 540} mode="night" water={{ flow: 0 }} lift={LIFT}>
          <Lantern position={LANTERN} frame={f} />
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("night")}
      puppets={[
        { id: "miller", look: MILLER, pose: { expression: "worried", ...w.pose, reachR: [60, -1010] } as PuppetPose, at: w.at },
        { id: "martha", look: MARTHA, pose: { expression: "worried", lookX: -0.8 }, at: [DOOR[0] - 0.2, DOOR[1] + 1.4] },
      ]}
      light={fallsLight("night", f, [LANTERN[0], LANTERN[1] - LIFT, LANTERN[2]])}
    />
  );
};

// Over his shoulder: the river below him is bare rock under the moon, the wheel dead still. Push in.
const OverShoulder = (f: number) => {
  const at: [number, number] = [NIAGARA.bank + 0.6, MILL.z + 3.8];
  const camera: CameraShot = { position: lerp3([at[0] + 2.9, 2.05, at[1] + 2.2], [at[0] + 2.5, 1.9, at[1] + 1.9], ease(f, 0, 48)), target: [at[0] - 9, -1.6, at[1] - 4], fov: 46 };
  return (
    <Stage
      set={<NiagaraSet camera={camera} frame={f + 580} mode="night" water={{ flow: 0 }} lift={LIFT} />}
      camera={camera}
      bg={fallsBg("night")}
      puppets={[{ id: "miller", look: MILLER, pose: { expression: "shocked", view: "back" }, at }]}
      light={fallsLight("night", f)}
    />
  );
};

// ---------- 6-9 s: no roar, no mist, bare rock ----------

// Straight down over the dry brink: the gorge black below, three thin trickles. The camera sinks toward the edge.
const TopDown = (f: number) => {
  const camera: CameraShot = { position: lerp3([1, 15, -3], [0.6, 10, -2.2], ease(f, 0, 43)), target: [0.4, -NIAGARA.drop, -1.8], fov: 50 };
  return <Stage set={<NiagaraSet camera={camera} frame={f + 620} mode="night" water={{ flow: 0 }} mill={false} />} camera={camera} bg={fallsBg("night")} />;
};

// Macro across wet rock: a puddle holds the moon; a stranded fish flops in it.
const FISH: [number, number, number] = [-2.2, 0.02, -8];
const Puddle = (f: number) => {
  const camera: CameraShot = { position: lerp3([FISH[0] + 1.1, 0.32, FISH[2] + 1.3], [FISH[0] + 0.7, 0.28, FISH[2] + 1.0], ease(f, 0, 32)), target: [FISH[0], 0.1, FISH[2]], fov: 44 };
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 660} mode="night" water={{ flow: 0 }} mill={false} clear={[[FISH[0], FISH[2], 1.6]]}>
          <mesh position={[FISH[0], 0.012, FISH[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.6, 28]} />
            <meshToonMaterial color="#3a5a88" emissive="#6a80b0" emissiveIntensity={0.3} />
          </mesh>
          <mesh position={[FISH[0] - 0.15, 0.016, FISH[2] - 0.2]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.12, 20]} />
            <meshBasicMaterial color="#f4f0dc" />
          </mesh>
          <Fish position={FISH} t={f} />
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("night")}
    />
  );
};

// ---------- 9-10 s: "Where did the water go?" ----------

// Close on the miller by the stopped wheel; he cups his ear at the silence; a last drop off a paddle hits his nose.
const DRIP = 30;
const Ear = (f: number) => {
  const at: [number, number] = [NIAGARA.bank + 0.75, MILL.z + 1.2];
  const camera: CameraShot = { position: lerp3([at[0] - 0.75, 1.15, at[1] + 2.1], [at[0] - 0.55, 1.1, at[1] + 1.7], ease(f, 0, 46)), target: [at[0] - 0.15, 0.95, at[1]], fov: 40 };
  const dropY = 2.3 - Math.max(0, f - DRIP + 14) ** 2 * 0.0065;
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 700} mode="night" water={{ flow: 0 }} lift={LIFT}>
          {f < DRIP && f > DRIP - 16 && <Drop position={[at[0] + 0.02, dropY + LIFT, at[1] + 0.18]} />}
          <Lantern position={LANTERN} frame={f} />
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("night")}
      puppets={[
        {
          id: "miller",
          look: MILLER,
          pose: { ...faceChange([[0, "confused"], [DRIP, "disgusted"], [DRIP + 12, "confused"]], f), reachR: f < DRIP ? [175, -800] : undefined, lookX: 0.4, headTilt: f < DRIP ? -10 : 4 } as PuppetPose,
          at,
        },
      ]}
      light={fallsLight("night", f, [LANTERN[0], LANTERN[1] - LIFT, LANTERN[2]])}
    />
  );
};

// ---------- 10-13 s: Lake Erie, the gale ----------

// Low over Lake Erie in the night gale: ice sheets slide at the lens past the LAKE ERIE post.
const Gale = (f: number) => {
  const camera: CameraShot = { position: lerp3([-6.6, 1.6, 2.4], [-6.2, 1.3, 1.2], ease(f, 0, 41)), target: [-7.2, 0.8, -12], fov: 52 };
  return (
    <Stage
      set={
        <ErieSet camera={camera} frame={f + 800} mode="gale" push={f * 0.12}>
          <Fingerpost position={[-erieHalf(-4.5) - 0.35, 0.35, -4.5]} text="LAKE ERIE" appear={f - 6} />
        </ErieSet>
      }
      camera={camera}
      bg={fallsBg("gale")}
    />
  );
};

// Right on the water: a slab grinds up over another and looms at the lens.
const Grind = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.2, 0.45, -3.6], [1.0, 0.6, -3.0], ease(f, 0, 45)), target: [-0.3, 0.3, -10], fov: 50 };
  return <Stage set={<ErieSet camera={camera} frame={f + 860} mode="gale" push={5 + f * 0.14} jam={ease(f, 10, 45) * 0.35} />} camera={camera} bg={fallsBg("gale")} />;
};

// ---------- 13-17 s: the cork in the bottle ----------

// Straight down on the lake narrowing into the river like a bottle neck: the ice crams in and plugs it. ICE JAM.
const Cork = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.6, 30, 4], [0.3, 22, 2.5], ease(f, 0, 52)), target: [0, 0, -3], fov: 50 };
  return (
    <Stage
      set={
        <ErieSet camera={camera} frame={f + 900} mode="dawn" push={9 + f * 0.1} jam={0.35 + ease(f, 0, 30) * 0.65} gale={0.5}>
          <Label text="ICE JAM" position={[0, 3, -7.5]} rotation={[-Math.PI / 2, 0, 0]} width={6.5} appear={f - 30} />
        </ErieSet>
      }
      camera={camera}
      bg={fallsBg("dawn")}
    />
  );
};

// "And the water just stopped": from the gorge the curtain thins, breaks into strands, then trickles; mist fades.
const STOP = 14;
const Stopping = (f: number) => {
  const flow = 1 - ease(f, STOP - 4, STOP + 34);
  const camera: CameraShot = { position: lerp3([4, -6.2, 21], [3, -5.4, 17], ease(f, 0, 69)), target: [0, -3.6, 0], fov: 54 };
  return <Stage set={<NiagaraSet camera={camera} frame={f + 960} mode="dawn" water={{ flow }} mill={false} />} camera={camera} bg={fallsBg("dawn")} />;
};

// ---------- 17-22 s: thirty hours on the riverbed ----------

// Macro: a pocket watch on a ledge at sunrise, its hands racing round. 30 HOURS.
const WATCH: [number, number, number] = [2.4, 0.2, -10];
const Watch = (f: number) => {
  const camera: CameraShot = { position: lerp3([WATCH[0] + 0.45, 0.85, WATCH[2] + 0.75], [WATCH[0] + 0.3, 0.7, WATCH[2] + 0.55], ease(f, 0, 42)), target: [WATCH[0], WATCH[1] + 0.08, WATCH[2]], fov: 46 };
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 1040} mode="dawn" water={{ flow: 0 }} mill={false} clear={[[WATCH[0], WATCH[2], 1.4]]}>
          <mesh position={[WATCH[0], 0.1, WATCH[2]]}>
            <boxGeometry args={[0.9, 0.2, 0.6]} />
            <meshToonMaterial color="#8a867c" />
          </mesh>
          <PocketWatch position={WATCH} hours={ease(f, 2, 40) * 30} scale={1.2} rotation={[0, 0.3, 0]} />
          <Label text="30 HOURS" position={[WATCH[0] + 0.03, WATCH[1] + 0.27, WATCH[2] + 0.02]} rotation={[-0.55, 0.45, 0]} width={0.2} appear={f - 8} count={ease(f, 8, 40)} />
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("dawn")}
    />
  );
};

// Wide at sunrise from upstream: people walk out across the bare bed away from the dry brink. Crane down.
const BED_CLEAR: [number, number, number][] = [
  [0, -7, 5.5],
  [3, -10, 2.2],
];
const Walkers = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.0, 2.4, -13.4], [0.6, 1.5, -12.2], ease(f, 0, 54)), target: [0, 0.8, -6], fov: 50 };
  const a = stroll(f, 0, 60, [-1.4, -3.4], [-1.2, -8.6]);
  const b = stroll(f, 4, 56, [0.6, -3.0], [0.9, -8.0]);
  const c = stroll(f, 0, 50, [2.2, -4.2], [2.6, -9.6]);
  return (
    <Stage
      set={<NiagaraSet camera={camera} frame={f + 1080} mode="dawn" water={{ flow: 0 }} mill={false} clear={BED_CLEAR} />}
      camera={camera}
      bg={fallsBg("dawn")}
      puppets={[
        { id: "martha", look: MARTHA, pose: { expression: "excited", ...a.pose } as PuppetPose, at: a.at },
        { id: "walker", look: WALKER, pose: { expression: "happy", ...b.pose } as PuppetPose, at: b.at },
        { id: "tom", look: TOM, pose: { expression: "excited", ...c.pose } as PuppetPose, at: c.at },
      ]}
      light={fallsLight("dawn", f)}
    />
  );
};

// Low on the rock: a rider trots past the lens, waving his hat at the sky.
const Ride = (f: number) => {
  const x = -5.5 + f * 0.16;
  const z = -7.2;
  const camera: CameraShot = { position: [x * 0.55 + 0.6, 0.28, -3.4], target: [x * 0.8, 1.05, z], fov: 52 };
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 1140} mode="dawn" water={{ flow: 0 }} mill={false} clear={BED_CLEAR}>
          <group position={[x, 0, z]} userData={{ ghost: true }}>
            <Horse phase={f * 0.42} />
          </group>
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("dawn")}
      puppets={[
        {
          id: "rider",
          look: RIDER,
          pose: { expression: "excited", sit: true, air: saddleAir + Math.abs(Math.cos(f * 0.42)) * 0.04 * UNITS, view: "side", facing: 1, armR: [150 + Math.sin(f * 0.5) * 20, -20] } as PuppetPose,
          at: [x - 0.02, z],
        },
      ]}
      light={fallsLight("dawn", f)}
    />
  );
};

// ---------- 22-25 s: the musket ----------

// Tom, bent double among the green pools, tugs at something stuck in the rock: a rusty musket.
const TOM_AT: [number, number] = [3, -10];
const MUSKET_SPOT: [number, number, number] = [3.55, 0.12, -10];
const Tug = (f: number) => {
  const camera: CameraShot = { position: lerp3([TOM_AT[0] + 0.6, 0.95, TOM_AT[1] + 3.5], [TOM_AT[0] + 0.7, 0.85, TOM_AT[1] + 3.0], ease(f, 0, 41)), target: [TOM_AT[0] + 0.35, 0.45, TOM_AT[1]], fov: 44 };
  const tug = Math.sin(f * 0.6) * 0.5 + 0.5;
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 1200} mode="day" water={{ flow: 0 }} mill={false} clear={BED_CLEAR}>
          <group userData={{ ghost: true }}>
            <Musket position={MUSKET_SPOT} rotation={[0, 0.25, 0.35 - tug * 0.06]} />
          </group>
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("day")}
      puppets={[{ id: "tom", look: TOM, pose: { ...faceChange([[0, "determined"], [20, "excited"]], f), view: "side", facing: 1, bend: 0.45 + tug * 0.1, lean: -tug * 8, reachR: [150, -380], reachL: [130, -370] } as PuppetPose, at: TOM_AT }]}
      light={fallsLight("day", f)}
    />
  );
};

// Gag: it comes free, Tom flies back flat into a pool with a splash; the musket lands across his chest; he laughs.
const YANK = 6;
const Yank = (f: number) => {
  const camera: CameraShot = { position: lerp3([TOM_AT[0] + 0.2, 1.0, TOM_AT[1] + 2.9], [TOM_AT[0] - 0.1, 1.15, TOM_AT[1] + 2.5], ease(f, 0, 36)), target: [TOM_AT[0] - 0.2, 0.35, TOM_AT[1]], fov: 46 };
  const fly = ramp(f, YANK, YANK + 16);
  const mx = MUSKET_SPOT[0] + (TOM_AT[0] - 0.3 - MUSKET_SPOT[0]) * fly;
  const my = MUSKET_SPOT[1] + Math.sin(fly * Math.PI) * 1.4 + (0.32 - MUSKET_SPOT[1]) * fly;
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 1240} mode="day" water={{ flow: 0 }} mill={false} clear={BED_CLEAR}>
          <mesh position={[TOM_AT[0] - 0.4, 0.012, TOM_AT[1]]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]}>
            <circleGeometry args={[0.8, 24]} />
            <meshToonMaterial color="#4a9a90" />
          </mesh>
          <group userData={{ ghost: true }}>
            <Musket position={[mx, my, MUSKET_SPOT[2] + 0.12]} rotation={[0, 0.1, 0.35 + fly * 6.0]} />
          </group>
          <Splash at={[TOM_AT[0] - 0.4, 0.02, TOM_AT[1]]} t={f - YANK - 8} power={0.7} count={26} color="#d8f0ec" />
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("day")}
      puppets={[{ id: "tom", look: TOM, pose: { ...faceChange([[0, "determined"], [YANK, "shocked"], [YANK + 18, "excited"]], f), ...lieDown(f, YANK, 10), view: f < YANK ? "side" : undefined, facing: 1, bend: f < YANK ? 0.4 : 0 } as PuppetPose, at: TOM_AT }]}
      light={fallsLight("day", f)}
    />
  );
};

// ---------- 25-28 s: the ice breaks, the water comes back ----------

// At the river mouth at dusk: the jam cracks open and the slabs burst downstream.
const BURST = 6;
const Burst = (f: number) => {
  const camera: CameraShot = { position: lerp3([7.5, 2.6, 6.5], [6.6, 2.2, 5.6], ease(f, 0, 32)), target: [0, 0.6, -1.5], fov: 50 };
  return <Stage set={<ErieSet camera={camera} frame={f + 1300} mode="dusk" push={14} jam={1} burst={ease(f, BURST, BURST + 26)} gale={0.6} />} camera={camera} bg={fallsBg("dusk")} />;
};

// On the bed looking upstream: a foaming wall of water comes round the bend at the lens; the walkers spin and run.
const Wall = (f: number) => {
  const surge = -30 + f * 0.7;
  const camera: CameraShot = { position: lerp3([0.8, 0.75, -1.4], [0.6, 0.9, -0.6], ease(f, 0, 32)), target: [0, 1.2, -20], fov: 54 };
  const a = stroll(f, 10, 22, [-0.9, -9.0], [-0.7, -6.0]);
  const b = stroll(f, 6, 24, [1.0, -9.6], [1.2, -6.4]);
  return (
    <Stage
      set={<NiagaraSet camera={camera} frame={f + 1340} mode="dusk" water={{ flow: 0, surge }} mill={false} clear={BED_CLEAR} />}
      camera={camera}
      bg={fallsBg("dusk")}
      puppets={[
        { id: "walker", look: WALKER, pose: { ...faceChange([[0, "neutral"], [8, "shocked"]], f), ...(f < 10 ? { view: "back" } : a.pose), armL: [150, -20], armR: [150, -20] } as PuppetPose, at: a.at },
        { id: "martha", look: MARTHA, pose: { ...faceChange([[0, "neutral"], [5, "shocked"]], f), ...(f < 6 ? { view: "back" } : b.pose) } as PuppetPose, at: b.at },
      ]}
      light={fallsLight("dusk", f)}
    />
  );
};

// Gag: side on, the horse rears at the water, spins and bolts; the rider's hat flies off into the foam.
const REAR = 4;
const Bolt = (f: number) => {
  const surge = -17 + f * 0.33;
  const z = -6 + Math.max(0, f - 14) ** 1.6 * 0.03;
  const hx = 0;
  const camera: CameraShot = { position: [8.6, 2.1, z + 0.8 - f * 0.01], target: [0, 0.9, z - 0.8], fov: 54 };
  const rear = Math.sin(ramp(f, REAR, REAR + 12) * Math.PI) * 0.8;
  const turned = f > REAR + 8;
  const hatT = f - (REAR + 4);
  return (
    <Stage
      set={
        <NiagaraSet camera={camera} frame={f + 1380} mode="dusk" water={{ flow: 0, surge }} mill={false} clear={BED_CLEAR}>
          <group position={[hx, 0, z]} rotation={[0, turned ? -Math.PI / 2 : Math.PI / 2, 0]} userData={{ ghost: true }}>
            <Horse phase={f * (turned ? 0.7 : 0.2)} rear={rear} run={turned ? 1.4 : 0.5} />
          </group>
          {hatT > 0 && <FlyingHat position={[hx, 2.0 + hatT * 0.06 - hatT * hatT * 0.004, z - 0.2 - hatT * 0.12]} spin={hatT * 0.4} />}
        </NiagaraSet>
      }
      camera={camera}
      bg={fallsBg("dusk")}
      puppets={[
        {
          id: "rider",
          look: hatT > 0 ? RIDER_NOHAT : RIDER,
          pose: { expression: "shocked", sit: true, air: saddleAir + rear * 0.35 * UNITS, view: "side", facing: turned ? -1 : 1, lean: turned ? 12 : -rear * 20, armL: [150, -20], armR: [140, -30] } as PuppetPose,
          at: [hx, z],
        },
      ]}
      light={fallsLight("dusk", f)}
    />
  );
};

// ---------- 28-33 s: Niagara roars back ----------

// Over the family's shoulders on the bank at sunset: the falls thunder again, a rainbow over the mist.
const FAM: [number, number] = [NIAGARA.bank + 1.3, 2.5];
const Family = (f: number) => {
  const camera: CameraShot = { position: lerp3([FAM[0] + 6.4, 2.3, FAM[1] + 1.6], [FAM[0] + 5.4, 2.4, FAM[1] + 1.3], ease(f, 0, 47)), target: [-1, -4.6, -1], fov: 50 };
  return (
    <Stage
      set={<NiagaraSet camera={camera} frame={f + 1440} mode="sunset" water={{ flow: 1 }} lift={LIFT} rainbow={ease(f, 6, 30)} wheel={-f * 0.06} />}
      camera={camera}
      bg={fallsBg("sunset")}
      puppets={[
        { id: "miller", look: MILLER, pose: { ...faceChange([[0, "shocked"], [16, "happy"]], f), view: "back" }, at: [FAM[0], FAM[1] - 0.55] },
        { id: "martha", look: MARTHA, pose: { expression: "happy", view: "back", gesture: f > 14 ? "cheer" : undefined }, at: [FAM[0] + 0.1, FAM[1]] },
        { id: "tom", look: TOM, pose: { expression: "excited", view: "back", armL: [150, -20], armR: [150, -20] }, at: [FAM[0] + 0.25, FAM[1] + 0.55] },
      ]}
      light={fallsLight("sunset", f)}
    />
  );
};

// Low in the gorge: the curtain slams back across the whole crest and a cloud of mist explodes at the lens. Crane up.
const Refill = (f: number) => {
  const flow = ease(f, 0, 18);
  const camera: CameraShot = { position: lerp3([2.5, -7.2, 19], [3.5, -2.0, 24], ease(f, 0, 50)), target: lerp3([0, -4.5, crestZ(0)], [0, -2.4, crestZ(0)], ease(f, 0, 50)), fov: 54 };
  return <Stage set={<NiagaraSet camera={camera} frame={f + 1500} mode="sunset" water={{ flow }} mist={flow} rainbow={ease(f, 20, 45)} mill={false} />} camera={camera} bg={fallsBg("sunset")} />;
};

// ---------- shot list ----------

const HookLipShot = HookLip;
const HookSilentShot = HookSilent;
const MillShot = multi([[42, MillNight], [40, MillerOut]]);
const ShoulderShot = one(OverShoulder);
const TopShot = one(TopDown);
const PuddleShot = one(Puddle);
const EarShot = one(Ear);
const ErieShot = multi([[41, Gale], [45, Grind]]);
const CorkShot = one(Cork);
const StopShot = one(Stopping);
const WatchShot = one(Watch);
const WalkShot = one(Walkers);
const RideShot = one(Ride);
const MusketShot = multi([[41, Tug], [36, Yank]]);
const BurstShot = one(Burst);
const WallShot = one(Wall);
const BoltShot = one(Bolt);
const FamilyShot = one(Family);
const RefillShot = one(Refill);

// Cuts inside multi shots: 100 (miller out); 358 (grind); 722 (yank).
const SHOTS: Shot[] = [
  [0, 20, HookRoar, false],
  [20, 34, HookLipShot, false],
  [34, 58, HookSilentShot, false],
  [58, 140, MillShot, true],
  [140, 188, ShoulderShot, false],
  [188, 231, TopShot, true],
  [231, 263, PuddleShot, false],
  [263, 317, EarShot, true],
  [317, 403, ErieShot, true],
  [403, 455, CorkShot, false],
  [455, 524, StopShot, true],
  [524, 566, WatchShot, true],
  [566, 620, WalkShot, false],
  [620, 681, RideShot, false],
  [681, 758, MusketShot, false],
  [758, 790, BurstShot, false],
  [790, 822, WallShot, true],
  [822, 853, BoltShot, false],
  [853, 900, FamilyShot, true],
  [900, 951, RefillShot, true],
  [951, TIMING.totalFrames, LoopIn, true], // 951 = totalFrames - LOOP
];

const SFX: Sfx[] = [
  // hook: the roar, then dead silence on "silent"
  { at: 0, src: sfx("falls"), volume: 0.6, until: 34 },
  { at: 20, src: sfx("splash"), volume: 0.5 },
  { at: 33, src: sfx("tape-stop"), volume: 0.45 },
  { at: 34, src: sfx("stamp"), volume: 0.25 },
  // the mill at night
  { at: 54, src: sfx("whoosh"), volume: 0.35 },
  { at: 58, src: sfx("wind"), volume: 0.08, until: 188 },
  { at: 62, src: sfx("door"), volume: 0.45 },
  { at: 72, src: sfx("pop"), volume: 0.3 },
  { at: 100, src: sfx("steps"), volume: 0.18, until: 130 },
  { at: 184, src: sfx("whoosh"), volume: 0.3 },
  // no roar, no mist: one drip, a flopping fish
  { at: 210, src: sfx("plop"), volume: 0.25 },
  { at: 236, src: sfx("plop"), volume: 0.35 },
  { at: 246, src: sfx("plop"), volume: 0.3 },
  { at: 259, src: sfx("whoosh"), volume: 0.3 },
  { at: 263 + DRIP, src: sfx("plop"), volume: 0.5 },
  // Lake Erie: the gale, grinding ice
  { at: 313, src: sfx("whoosh"), volume: 0.4 },
  { at: 317, src: sfx("wind"), volume: 0.45, until: 455 },
  { at: 317, src: sfx("rumble"), volume: 0.18, until: 455 },
  { at: 323, src: sfx("pop"), volume: 0.3 },
  { at: 340, src: sfx("crack"), volume: 0.35 },
  { at: 362, src: sfx("crack"), volume: 0.5 },
  { at: 380, src: sfx("creak"), volume: 0.5 },
  { at: 410, src: sfx("crack"), volume: 0.4 },
  { at: 433, src: sfx("pop"), volume: 0.4 },
  { at: 433, src: sfx("stamp"), volume: 0.3 },
  // the falls die away
  { at: 451, src: sfx("whoosh"), volume: 0.35 },
  { at: 455, src: sfx("falls"), volume: 0.5, until: 495 },
  { at: 485, src: sfx("tape-stop"), volume: 0.4 },
  { at: 485, src: sfx("sting"), volume: 0.45 },
  // thirty hours on the bed
  { at: 520, src: sfx("whoosh"), volume: 0.35 },
  { at: 524, src: sfx("tick"), volume: 0.35, until: 566 },
  { at: 532, src: sfx("pop"), volume: 0.3 },
  { at: 566, src: sfx("wind"), volume: 0.1, until: 758 },
  { at: 566, src: sfx("steps"), volume: 0.12, until: 620 },
  { at: 620, src: sfx("hooves"), volume: 0.55, until: 681 },
  { at: 640, src: sfx("whoosh"), volume: 0.3 },
  // the musket
  { at: 690, src: sfx("creak"), volume: 0.3 },
  { at: 708, src: sfx("creak"), volume: 0.3 },
  { at: 722 + YANK, src: sfx("pop"), volume: 0.5 },
  { at: 722 + YANK + 8, src: sfx("splash"), volume: 0.6 },
  { at: 722 + YANK + 16, src: sfx("plop"), volume: 0.5 },
  // the ice breaks, the wall of water
  { at: 754, src: sfx("whoosh"), volume: 0.4 },
  { at: 758 + BURST - 48, src: sfx("riser"), volume: 0.35 },
  { at: 758 + BURST, src: sfx("boom"), volume: 0.6 },
  { at: 758 + BURST, src: sfx("crack"), volume: 0.7 },
  { at: 758 + BURST, src: sfx("sting"), volume: 0.5 },
  { at: 762, src: sfx("river"), volume: 0.35, until: 853 },
  { at: 786, src: sfx("whoosh"), volume: 0.4 },
  { at: 790, src: sfx("rumble"), volume: 0.35, until: 853 },
  { at: 800, src: sfx("splash"), volume: 0.5 },
  { at: 822 + REAR, src: sfx("hooves"), volume: 0.6, until: 853 },
  { at: 822 + REAR + 4, src: sfx("whoosh"), volume: 0.35 },
  { at: 845, src: sfx("splash"), volume: 0.7 },
  // the roar returns and runs into the loop
  { at: 849, src: sfx("whoosh"), volume: 0.4 },
  { at: 853, src: sfx("falls"), volume: 0.4, until: 900 },
  { at: 870, src: sfx("chime"), volume: 0.3 },
  { at: 896, src: sfx("whoosh"), volume: 0.4 },
  { at: 900, src: sfx("boom"), volume: 0.45 },
  { at: 900, src: sfx("falls"), volume: 0.6, until: 951 },
  { at: 900, src: sfx("splash"), volume: 0.6 },
  { at: 947, src: sfx("whoosh"), volume: 0.45 },
  { at: 951, src: sfx("falls"), volume: 0.6, until: TIMING.totalFrames },
];

// No music under the silence; mystery from the gale, bright for the riverbed, tension for the return.
const MUSIC: MusicCue[] = [
  { src: "music/mystery.wav", from: 317, to: 524, volume: 0.22 },
  { src: "music/upbeat.wav", from: 524, to: 758, volume: 0.2 },
  { src: "music/tension.wav", from: 758, to: TIMING.totalFrames, volume: 0.22 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
