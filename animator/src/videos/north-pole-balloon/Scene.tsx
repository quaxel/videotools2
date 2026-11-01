import React from "react";
import {
  CameraShot,
  faceChange,
  Halo,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  lerp3,
  lieDown,
  moodBackground,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Blob, Cord } from "../../three/BalloonSets";
import {
  arcticSunLight,
  ArcticSkySet,
  DownedBalloon,
  fogLight,
  Gulls,
  HangarSet,
  KvitoyaSet,
  OrnenBalloon,
  PackIceSet,
  PressureRidge,
  Sled,
  SilkBoat,
  SnowBurst,
} from "../../three/ArcticSets";
import { BoxCamera, DevTray, Diary, FilmTin, Print, PrintLine } from "./props";
import TIMING_JSON from "./timing.json";

// "The North Pole Expedition Lost for 33 Years": in 1897 Andrée, Strindberg and Frænkel fly the hydrogen balloon
// Eagle from Danes Island toward the pole; the drag ropes fall off, fog ices the envelope and they come down on the
// pack ice; they haul sleds for three months and vanish. In 1930 seal hunters find their camp on White Island, and
// Strindberg's film is developed. Sets: guide/references/arctic-balloon.md (src/three/ArcticSets.tsx).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "north-pole-balloon";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// ---------- cast ----------

const ANDREE: PuppetLook = { skin: "#f0c8a4", hair: "#4a3426", outfit: "#3a3a46", vest: "#5a4a3a", hat: "#2e2a26" };
const STRINDBERG: PuppetLook = { skin: "#f4d0b0", hair: "#b08a58", outfit: "#8a8676" };
const FRAENKEL: PuppetLook = { skin: "#eec4a0", hair: "#3a2a1e", outfit: "#6a6a72", beard: "#3a2a1e" };
const CREW: PuppetLook = { skin: "#eac4a0", hair: "#6a4a30", outfit: "#5a5048", hat: "#3a342c", beard: "#6a4a30" };
const SEALER: PuppetLook = { skin: "#e8b890", hair: "#8a6a4a", outfit: "#d0a832", hat: "#c8a030", beard: "#8a6a4a" };
const SEALER_B: PuppetLook = { skin: "#eec6a2", hair: "#d8c098", outfit: "#3a4a5a", suspenders: "#2a2420" };
const DEVELOPER: PuppetLook = { skin: "#f2cca8", hair: "#5a3a26", outfit: "#f0ece4", apron: "#3a2a20", glasses: true };

const BG_SUN = "#5a7ec0";
const BG_FOG = "#aab4c0";
const BG_ICE = "#c8d6e2";
const BG_DUSK = "#7a6aa8";
const BG_STORM = "#2a344e";
const BG_ISLAND = "#8a98a8";
const BG_HANGAR = "#9aaabb";
const BG_DARK = "#2a0a0a";

const duskLight = (): PuppetLight => ({ tint: "#e4dcf4", shadow: 0.2, distant: [{ direction: [-0.8, 0.15, -0.4], color: "#ffb090", strength: 1.3 }] });
const redLight = (): PuppetLight => ({ tint: "#ff8a7a", tintAmount: 0.25, shadow: 0.3, points: [{ position: [0.4, 2.2, 0.6], color: "#ff3a2a", strength: 2.4, range: 4 }] });

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

// The three men standing in the basket (its floor at the origin).
const basketCrew = (f: number, swap: boolean, poses: { andree?: Partial<PuppetPose>; strindberg?: Partial<PuppetPose>; fraenkel?: Partial<PuppetPose> } = {}): PuppetPlacement[] => [
  { id: "andree", look: ANDREE, pose: { expression: "excited", ...poses.andree } as PuppetPose, at: [-0.26, 0.05] },
  { id: "strindberg", look: STRINDBERG, pose: { expression: "happy", ...poses.strindberg } as PuppetPose, at: swap ? [0.05, -0.25] : [0.2, 0.2] },
  { id: "fraenkel", look: FRAENKEL, pose: { expression: "determined", ...poses.fraenkel } as PuppetPose, at: swap ? [0.24, 0.2] : [0.05, -0.25] },
];

// ---------- 0-4 s: the hook ----------

// The Eagle rushes at the lens over the pack ice in the low midnight sun. `offset` shifts the clock: the last shot is
// this one just before frame 0 so the Short loops.
const LOOP = 24;
const hookBalloonAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ramp(f, -LOOP, 28);
  const camera: CameraShot = { position: lerp3([7.5, -3.2, 15], [2.6, -1.4, 5.2], p), target: lerp3([0, 3.4, 0], [0, 4.6, 0], p), fov: 50 };
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 100} mode="sun" speed={0.5}>
          <group rotation={[0.06 * Math.sin(f * 0.1), 0, 0.08 * Math.sin(f * 0.08 + 0.6)]}>
            <OrnenBalloon frame={f} />
          </group>
          <Gulls frame={f + 40} centre={[0, 4, -4]} radius={9} count={5} size={1.6} />
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_SUN}
      energy={0}
    />
  );
};
const HookBalloon = hookBalloonAt(0);
const LoopIn = hookBalloonAt(-LOOP);

// Hard cut: the three men at the basket rim, Strindberg clicks his box camera (the seed).
const CLICK = 18;
const HookFaces: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: lerp3([1.15, 1.35, 2.7], [0.75, 1.2, 2.2], ease(f, 0, 30)), target: [0.05, 0.95, 0], fov: 42 };
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 140} mode="sun" speed={0.5}>
          <group userData={{ ghost: true }}>
            <OrnenBalloon frame={f} />
            <BoxCamera position={[0.42, 0.76, 0.5]} rotation={[0, 0.5, 0]} scale={1.3} click={ramp(f, CLICK, CLICK + 3)} />
          </group>
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_SUN}
      puppets={basketCrew(f, false, {
        andree: { gesture: "point", lookX: -0.6 },
        strindberg: { ...faceChange([[0, "determined"], [CLICK + 2, "happy"]], f), reachR: [190, -430], frontR: true, lookX: 0.5 },
        fraenkel: { expression: "excited", lookX: -0.4 },
      })}
      light={arcticSunLight()}
      flash={f >= CLICK && f < CLICK + 4 ? 0.5 * (1 - (f - CLICK) / 4) : 0}
    />
  );
};

// Hard cut: low on the ice, the basket skims a pressure ridge and slams it: snow bursts, the camera jolts.
const HIT = 12;
const HookRidge: React.FC = () => {
  const f = useShotFrame();
  const x = -6 + f * 0.36;
  const bounce = f > HIT ? Math.sin((f - HIT) * 0.4) * Math.exp(-(f - HIT) * 0.12) * 0.5 : 0;
  const y = 1.0 - Math.max(0, 1 - Math.abs(f - HIT) / 10) * 0.35 + bounce;
  const camera: CameraShot = { position: [2.4 + f * 0.03, 0.45, 6.6], target: [0, 1.6, 0], fov: 54 };
  return (
    <Stage
      set={
        <PackIceSet camera={camera} frame={f + 200} mode="day">
          <group position={[x, y, 0]} rotation={[0, 0, f > HIT ? -0.2 * Math.exp(-(f - HIT) * 0.1) : 0.08]}>
            <OrnenBalloon frame={f} ropes={0.15} />
          </group>
          <group scale={squash(f, HIT, 0.3)}>
            <PressureRidge a={[-1.6, 0.2]} b={[1.6, -0.2]} height={1.6} seed={21} blocks={22} />
          </group>
          <SnowBurst at={[x, 0.9, 0.3]} t={f - HIT} power={1.4} />
        </PackIceSet>
      }
      camera={camera}
      bg={BG_ICE}
    />
  );
};

// Hard cut: wide, tracking alongside the Eagle over the endless ice, gulls wheeling. TO THE NORTH POLE.
const HookWide: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [-15 + f * 0.12, 1.5 + f * 0.05, 22], target: [0, 3.6, 0], fov: 46 };
  return (
    <>
      <Stage
        set={
          <ArcticSkySet camera={camera} frame={f + 260} mode="sun" speed={0.6}>
            <group rotation={[0, 0.4, -0.05]}>
              <OrnenBalloon frame={f} />
            </group>
            <Gulls frame={f} centre={[-4, 2, 6]} radius={5} count={4} size={1.4} />
          </ArcticSkySet>
        }
        camera={camera}
        bg={BG_SUN}
        light={arcticSunLight()}
      />
      <Headline f={f} text="TO THE NORTH POLE" at={4} />
    </>
  );
};

// ---------- 4-9 s: launch and the lost ropes ----------

// Low angle at the foot of the plank hangar: the Eagle rises out of its open top, the crew cheer.
const HangarLow = (f: number) => {
  const p = ease(f, 0, 36);
  const rise = 3.5 + p * 7;
  const camera: CameraShot = { position: lerp3([9.5, 0.6, 17], [8.2, 0.7, 15.5], p), target: lerp3([0, 7, 0], [0, 10, 0], p), fov: 54 };
  return (
    <Stage
      set={<HangarSet camera={camera} frame={f + 50} balloon={rise} />}
      camera={camera}
      bg={BG_HANGAR}
      puppets={[
        { id: "crew-a", look: CREW, pose: { expression: "excited", gesture: "cheer" }, at: [5.6, 9.4] },
        { id: "crew-b", look: { ...CREW, outfit: "#4a4a54", beard: undefined }, pose: { expression: "happy", gesture: "wave" }, at: [6.8, 9.0] },
      ]}
    />
  );
};

// Over the shoulder of a crewman: the Eagle floats out over the grey sea, ropes trailing.
const CrewOTS = (f: number) => {
  const p = ease(f, 0, 35);
  const camera: CameraShot = { position: lerp3([3.4, 1.45, 13.2], [3.1, 1.5, 12.6], p), target: [-8, 7.5, 0], fov: 48 };
  return (
    <Stage
      set={
        <HangarSet camera={camera} frame={f + 90}>
          <group position={[-15 - f * 0.05, 7 + f * 0.05, -2]}>
            <OrnenBalloon frame={f} />
          </group>
        </HangarSet>
      }
      camera={camera}
      bg={BG_HANGAR}
      puppets={[{ id: "crew-a", look: CREW, pose: { expression: "happy", view: "back", gesture: "wave" }, at: [2.6, 11.6] }]}
    />
  );
};

// Under the basket: the DRAG ROPES tag; the ropes snap off and drop away, the balloon jerks upward.
const SNAP = 14;
const RopeSnap = (f: number) => {
  const camera: CameraShot = { position: lerp3([2.6, -1.0, 4.4], [2.2, -0.9, 3.8], ease(f, 0, 32)), target: [0, -0.3, 0], fov: 52 };
  const fall = f > SNAP ? (f - SNAP) * 0.08 + (f - SNAP) ** 2 * 0.012 : 0;
  const up = ease(f, SNAP, SNAP + 14) * 0.6;
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 320} mode="sun" speed={0.35}>
          <group position={[0, up, 0]}>
            <OrnenBalloon frame={f} ropes={f < SNAP ? 1 : 0} ropeFall={f < SNAP ? 0 : 0.01 + fall} />
          </group>
          <Label text="DRAG ROPES" position={[0.85, -0.6 - fall + up, 0.9]} width={1.15} appear={f - 2} />
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_SUN}
      energy={1.3}
    />
  );
};

// Wide from the hill: the ropes tumble into the sea; the lightened Eagle shoots up; a crewman gapes.
const RopeFall = (f: number) => {
  const p = ease(f, 0, 39);
  const camera: CameraShot = { position: lerp3([5.5, 2.0, 15], [5.0, 1.8, 14.2], p), target: lerp3([-10, 8, -2], [-10, 11, -2], p), fov: 54 };
  return (
    <Stage
      set={
        <HangarSet camera={camera} frame={f + 130}>
          <group position={[-14, 9 + f * 0.12 + f * f * 0.002, -3]}>
            <OrnenBalloon frame={f} ropes={0} ropeFall={2 + f * 0.25 + f * f * 0.006} />
          </group>
        </HangarSet>
      }
      camera={camera}
      bg={BG_HANGAR}
      puppets={[{ id: "crew-b", look: { ...CREW, outfit: "#4a4a54", beard: undefined }, pose: { ...faceChange([[0, "worried"], [10, "shocked"]], f), headTilt: -12, view: "side", facing: -1, armL: [120, -30], armR: [110, -30] }, at: [3.9, 11.4] }]}
    />
  );
};

// ---------- 9-12 s: fog and ice ----------

// Macro under the ring: white frost creeps down the dark silk, icicles grow on the ring. ICE.
const Frost = (f: number) => {
  const ice = ease(f, 0, 34);
  const camera: CameraShot = { position: lerp3([3.6, 0.6, 6.4], [3.0, 1.0, 5.6], ease(f, 0, 40)), target: [0, 3.6, 0], fov: 50 };
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 400} mode="fog" speed={0.3}>
          <OrnenBalloon frame={f} ice={ice} ropes={0} />
          <Label text="ICE" position={[0.9, 1.9, 0.9]} width={0.5} appear={f - 18} />
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_FOG}
    />
  );
};

// Gag: a slab of ice slides off the ring and bonks Frænkel on the head; Andrée and Strindberg flinch.
const BONK = 12;
const IceGag = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.9, 1.75, 2.7], [0.6, 1.65, 2.3], ease(f, 0, 30)), target: [0, 1.15, 0], fov: 44 };
  const k = ramp(f, 0, BONK);
  const slabY = f < BONK ? 2.3 - k * k * 0.85 : 1.42 - (f - BONK) * 0.04;
  const slabX = f < BONK ? 0.05 : 0.05 + (f - BONK) * 0.03;
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 440} mode="fog" speed={0.3}>
          <group userData={{ ghost: true }}>
            <OrnenBalloon frame={f} ice={1} ropes={0} />
            {slabY > 0.7 && <Blob position={[slabX + 0.2, slabY, 0.2]} rotation={[0.3, 0, f * 0.15]} scale={[0.16, 0.06, 0.12]} color="#e4f4ff" ink={0.1} />}
          </group>
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_FOG}
      puppets={basketCrew(f, true, {
        andree: { ...faceChange([[0, "worried"], [BONK + 2, "shocked"]], f), lookX: 0.5 },
        strindberg: { ...faceChange([[0, "worried"], [BONK + 3, "awkward"]], f), lookX: -0.5 },
        fraenkel: { ...faceChange([[0, "determined"], [BONK, "confused"]], f), squash: f >= BONK ? squash(f, BONK, 0.4)[1] - 1 : 0, headTilt: f >= BONK ? 10 : 0 },
      })}
      light={fogLight()}
    />
  );
};

// The iced Eagle sinks through the fog toward the white floe, the camera tilting down with it.
const Sink = (f: number) => {
  const camera: CameraShot = { position: [5.5, 2.5 - f * 0.08, 13], target: [0, 3 - f * 0.12, 0], fov: 50 };
  return (
    <Stage
      set={
        <ArcticSkySet camera={camera} frame={f + 480} mode="fog" speed={0.2} altitude={12 - f * 0.35}>
          <group position={[0, -f * 0.05, 0]} rotation={[0, 0, 0.1]}>
            <OrnenBalloon frame={f} ice={1} ropes={0} slack={0.3} />
          </group>
        </ArcticSkySet>
      }
      camera={camera}
      bg={BG_FOG}
    />
  );
};

// ---------- 12-17 s: down on the ice ----------

// Low on the floe: the basket slams onto the ice, bounces, the envelope slumps. 65 HOURS.
const CRASH = 6;
const Crash = (f: number) => {
  const bounce = f > CRASH ? Math.abs(Math.sin((f - CRASH) * 0.35)) * Math.exp(-(f - CRASH) * 0.15) * 0.8 : 0;
  const y = f < CRASH ? (CRASH - f) * 0.5 : bounce;
  const camera: CameraShot = { position: lerp3([4.6, 0.5, 8.8], [4.0, 0.7, 8.0], ease(f, 0, 36)), target: [0, 2.6, 0], fov: 54 };
  return (
    <>
      <Stage
        set={
          <PackIceSet camera={camera} frame={f + 520} mode="day">
            <group position={[0, y, 0]} rotation={[0, 0, f > CRASH ? 0.12 * Math.exp(-(f - CRASH) * 0.08) : 0]}>
              <OrnenBalloon frame={f} ice={1} ropes={0} slack={0.3 + ease(f, CRASH, 36) * 0.5} />
            </group>
            <SnowBurst at={[0, 0.1, 0.5]} t={f - CRASH} power={1.2} count={32} />
          </PackIceSet>
        }
        camera={camera}
        bg={BG_ICE}
      />
      <Headline f={f} text="65 HOURS. DOWN." at={CRASH + 2} />
    </>
  );
};

// Top-down crane: Strindberg's photo come to life, three tiny men beside the slumped balloon on endless ice.
const TopDown = (f: number) => {
  const p = ease(f, 0, 37);
  const camera: CameraShot = { position: lerp3([-1.6, 5.5, 3.2], [-1.2, 14, 1.2], p), target: [-1.6, 0, 0], fov: 50 };
  return (
    <>
      <Stage
        set={
          <PackIceSet camera={camera} frame={f + 560} mode="day">
            <DownedBalloon frame={f} />
          </PackIceSet>
        }
        camera={camera}
        bg={BG_ICE}
        puppets={[
          { id: "andree", look: ANDREE, pose: { expression: "sad", lookX: 0.5 }, at: [-3.0, 1.0] },
          { id: "fraenkel", look: FRAENKEL, pose: { expression: "worried" }, at: [-2.4, 1.3] },
          { id: "strindberg", look: STRINDBERG, pose: { expression: "thinking", gesture: "scratchHead" }, at: [-3.6, 1.5] },
        ]}
      />
      <Headline f={f} text="FAR SHORT OF THE POLE" at={4} />
    </>
  );
};

// ---------- 17-20 s: the march ----------

// Dusk on the pack: the three haul loaded sleds in profile past the ridges, the camera trucking alongside.
const TREK: { id: string; look: PuppetLook; dx: number; dz: number }[] = [
  { id: "andree", look: ANDREE, dx: 0, dz: 0 },
  { id: "fraenkel", look: FRAENKEL, dx: -2.4, dz: 0.5 },
  { id: "strindberg", look: STRINDBERG, dx: -4.8, dz: 0.15 },
];
const Trek = (f: number) => {
  const camera: CameraShot = { position: [-1.6 + f * 0.04, 0.9, 5.4], target: [-1.2 + f * 0.04, 0.8, 0.2], fov: 50 };
  const cast: PuppetPlacement[] = TREK.map((c) => {
    const w = stroll(f, -40, 140, [-1.5 + c.dx, 0.3 + c.dz], [2.5 + c.dx, 0.3 + c.dz]);
    return { id: c.id, look: c.look, pose: { expression: c.id === "strindberg" ? "sad" : "determined", ...w.pose, lean: 14 } as PuppetPose, at: w.at };
  });
  return (
    <>
      <Stage
        set={
          <PackIceSet camera={camera} frame={f + 600} mode="dusk" snow>
            {cast.map((c) => (
              <group key={c.id} userData={{ ghost: true }}>
                <group position={[c.at[0] - 1.25, 0, c.at[1] - 0.05]}>
                  <Sled />
                </group>
                <Cord a={[c.at[0] - 0.12, 0.62, c.at[1]]} b={[c.at[0] - 0.45, 0.22, c.at[1]]} width={0.012} />
              </group>
            ))}
          </PackIceSet>
        }
        camera={camera}
        bg={BG_DUSK}
        puppets={cast}
        light={duskLight()}
      />
      <Headline f={f} text="3 MONTHS ON THE ICE" at={6} />
    </>
  );
};

// Gag: Andrée's sled snags on a ridge block and tips; he goes flat on his back; Frænkel laughs.
const TRIP = 12;
const SledGag = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.6, 1.0, 3.6], [1.2, 0.85, 3.0], ease(f, 0, 41)), target: [0.2, 0.55, 0.2], fov: 46 };
  return (
    <Stage
      set={
        <PackIceSet camera={camera} frame={f + 650} mode="dusk" snow>
          <group position={[-0.9, 0, 0.2]} userData={{ ghost: true }}>
            <Sled tip={ease(f, TRIP, TRIP + 8)} />
          </group>
          <InkBox size={[0.4, 0.3, 0.4]} position={[-0.2, 0.12, 0.25]} rotation={[0.3, 0.6, 0.2]} color="#cfe4f2" ink={0.015} />
        </PackIceSet>
      }
      camera={camera}
      bg={BG_DUSK}
      puppets={[
        { id: "andree", look: ANDREE, pose: { ...faceChange([[0, "determined"], [TRIP, "shocked"], [TRIP + 20, "sad"]], f), view: f < TRIP ? "side" : undefined, facing: 1, ...lieDown(f, TRIP, 14) } as PuppetPose, at: [0.35, 0.3] },
        { id: "fraenkel", look: FRAENKEL, pose: { ...faceChange([[0, "determined"], [TRIP + 8, "happy"]], f), lookX: -0.5 }, at: [1.25, -0.2] },
      ]}
      light={duskLight()}
    />
  );
};

// ---------- 20-22 s: gone ----------

// Night blizzard: the three walk away into the blowing snow until it swallows them.
const Vanish = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.6, 1.3, 4.2], [0.3, 1.2, 3.4], ease(f, 0, 38)), target: [0, 0.9, -3], fov: 46 };
  const cast: PuppetPlacement[] = TREK.map((c, i) => {
    const w = stroll(f, -10 + i * 4, 90, [-0.6 + i * 0.6, 0.4 - i * 0.3], [-0.4 + i * 0.5, -6 - i * 0.6]);
    return { id: c.id, look: c.look, pose: { expression: "sad", ...w.pose, view: "back" } as PuppetPose, at: w.at };
  });
  return <Stage set={<PackIceSet camera={camera} frame={f + 700} mode="storm" snow />} camera={camera} bg={BG_STORM} puppets={cast} truth={0.25} />;
};

// Top-down crane: their footprints fill with snow and disappear. NO ANSWERS.
const Tracks = (f: number) => {
  const p = ease(f, 0, 36);
  const camera: CameraShot = { position: lerp3([0.3, 3.2, 1.6], [0.2, 9, 0.5], p), target: [0, 0, -0.6], fov: 50 };
  const fill = ease(f, 0, 30);
  return (
    <>
      <Stage
        set={
          <PackIceSet camera={camera} frame={f + 740} mode="storm" snow>
            {Array.from({ length: 16 }, (_, i) => (
              <mesh key={i} position={[(i % 2 ? 0.12 : -0.12) + Math.sin(i * 0.5) * 0.3, 0.012, 2 - i * 0.42]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[0.07, 10]} />
                <meshBasicMaterial color="#3a4a68" transparent opacity={0.85 * (1 - fill)} />
              </mesh>
            ))}
          </PackIceSet>
        }
        camera={camera}
        bg={BG_STORM}
        truth={0.3}
      />
      <Headline f={f} text="NO BODIES. NO ANSWERS." at={6} />
    </>
  );
};

// ---------- 22-28 s: White Island, 1930 ----------

// The sealing ship noses through drift ice toward the white dome of the island. 33 YEARS LATER.
const ShipIn = (f: number) => {
  const p = ease(f, 0, 40);
  const camera: CameraShot = { position: lerp3([4, 1.6, 9], [2.6, 2.2, 8], p), target: [-6, 1.8, -12], fov: 50 };
  return (
    <>
      <Stage
        set={
          <KvitoyaSet camera={camera} frame={f + 800} ship={[-16 + f * 0.06, 0, -14]}>
            <Gulls frame={f} centre={[-6, 5, -8]} radius={5} count={4} size={1.3} />
            <Label text="BRATVAAG" position={[-16 + f * 0.06 + 1.5, 0.6, -12.85]} rotation={[0, 0.5, 0]} width={1.6} fg="#f4f2ea" bg="#2a2a2a" border={false} />
          </KvitoyaSet>
        }
        camera={camera}
        bg={BG_ISLAND}
      />
      <Headline f={f} text="33 YEARS LATER" at={2} />
    </>
  );
};

// Low angle on the gravel: two sealers stride up the beach toward the camera.
const Landing = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.8, 0.45, 5.6], [0.6, 0.5, 4.9], ease(f, 0, 38)), target: [0, 1.0, 0], fov: 50 };
  const a = stroll(f, -20, 70, [-0.6, -4], [-0.45, 0.6]);
  const b = stroll(f, -14, 70, [0.6, -4.6], [0.5, 0.1]);
  return (
    <Stage
      set={<KvitoyaSet camera={camera} frame={f + 840} snow />}
      camera={camera}
      bg={BG_ISLAND}
      puppets={[
        { id: "sealer", look: SEALER, pose: { expression: "determined", ...a.pose } as PuppetPose, at: a.at },
        { id: "sealer-b", look: SEALER_B, pose: { expression: "neutral", ...b.pose } as PuppetPose, at: b.at },
      ]}
    />
  );
};

// The sealer stops dead and points: a dark hull sticks out of the old snow.
const Mound: React.FC<{ bury: number }> = ({ bury }) => (
  <group position={[-1.0, 0, -0.6]} rotation={[0, 0.4, 0]}>
    <group position={[0.4, 0.3, 0]} rotation={[0, 0, 0.22]}>
      <SilkBoat bury={bury} />
    </group>
    <Blob position={[0.2, 0, 0]} scale={[2.2, 0.5 * bury + 0.05, 1.0]} color="#f2f6f8" ink={0.04} />
  </group>
);
const SpotIt = (f: number) => {
  const camera: CameraShot = { position: lerp3([2.6, 1.4, 4.6], [2.2, 1.3, 4.0], ease(f, 0, 38)), target: [-0.9, 0.5, -0.6], fov: 50 };
  return (
    <Stage
      set={
        <KvitoyaSet camera={camera} frame={f + 880}>
          <Mound bury={0.55} />
        </KvitoyaSet>
      }
      camera={camera}
      bg={BG_ISLAND}
      puppets={[
        { id: "sealer", look: SEALER, pose: { ...faceChange([[0, "neutral"], [10, "shocked"]], f), gesture: f > 12 ? "point" : undefined, lookX: -0.6 }, at: [1.1, 0.9] },
        { id: "sealer-b", look: SEALER_B, pose: { ...faceChange([[0, "neutral"], [18, "worried"]], f), lookX: -0.5 }, at: [1.9, 0.3] },
      ]}
    />
  );
};

// They dig; the boat comes out of the snow with the expedition's name on the boathook. White flash.
const REVEAL = 20;
const Dig = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.0, 1.4, 3.8], [0.6, 1.25, 3.2], ease(f, 0, 49)), target: [-0.25, 0.6, 0], fov: 48 };
  const dig = Math.sin(f * 0.6);
  return (
    <Stage
      set={
        <KvitoyaSet camera={camera} frame={f + 920}>
          <Mound bury={0.85 - ease(f, 0, REVEAL) * 0.6} />
          <group userData={{ ghost: true }}>
            <InkBox size={[1.3, 0.04, 0.04]} position={[-0.3, 0.42, 0.45]} rotation={[0, 0.3, 0.12]} color="#8a6a44" ink={0.008} />
          </group>
          <Label text={"ANDRÉE'S POLAR\nEXPEDITION"} position={[0.15, 1.05, 1.1]} rotation={[0, 0.1, 0]} width={0.72} appear={f - REVEAL} />
          <SnowBurst at={[0.1, 0.1, 0.2]} t={(f % 14) - 1} count={8} power={0.5} />
        </KvitoyaSet>
      }
      camera={camera}
      bg={BG_ISLAND}
      puppets={[
        { id: "sealer", look: SEALER, pose: { ...faceChange([[0, "determined"], [REVEAL, "shocked"]], f), crouch: 0.5, reachR: [180 + dig * 60, -250], frontR: true, lookX: -0.6 }, at: [0.45, 0.35] },
        { id: "sealer-b", look: SEALER_B, pose: { ...faceChange([[0, "determined"], [REVEAL + 3, "sad"]], f), lookX: -0.4 }, at: [1.3, -0.1] },
      ]}
      flash={f >= REVEAL ? Math.max(0, 1 - (f - REVEAL) / 8) : 0}
    />
  );
};

// Over the sealer's shoulder: the diary lies open in the snow, pages lifting in the wind.
const DiaryOTS = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.75, 1.35, 1.6], [0.6, 1.1, 1.25], ease(f, 0, 56)), target: [0, 0.1, -0.25], fov: 44 };
  return (
    <Stage
      set={
        <KvitoyaSet camera={camera} frame={f + 970}>
          <Diary position={[0, 0.02, -0.2]} frame={f} rotationY={0.2} scale={1.6} />
          <Label text="DIARY" position={[-0.35, 0.3, -0.35]} width={0.34} appear={f - 10} />
        </KvitoyaSet>
      }
      camera={camera}
      bg={BG_ISLAND}
      puppets={[{ id: "sealer-b", look: SEALER_B, pose: { expression: "sad", view: "back", headTilt: 14 }, at: [0.85, 0.85] }]}
      truth={0.12}
    />
  );
};

// Macro: the rusted film tin; the lid comes up on the rolls inside.
const OPEN = 12;
const Film = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.45, 0.55, 0.95], [0.25, 0.42, 0.62], ease(f, 0, 34)), target: [0, 0.08, 0], fov: 42 };
  return (
    <Stage
      set={
        <KvitoyaSet camera={camera} frame={f + 1020}>
          <FilmTin position={[0, 0, 0]} open={ease(f, OPEN, OPEN + 8)} rotationY={-0.3} />
        </KvitoyaSet>
      }
      camera={camera}
      bg={BG_ISLAND}
    />
  );
};

// ---------- 28-33 s: the darkroom ----------

// Each darkroom shot is its own Stage and uses its own wall/floor pattern pair: two Stages in a row that share a cached
// surface texture lose the second WebGL context in the render (blank, then unlit frames).
const SURFACES = [
  ["tile", "concrete"],
  ["panel", "wood"],
  ["wallpaper", "carpet"],
] as const;
const darkroom = (camera: CameraShot, f: number, children?: React.ReactNode, look = 0) => (
  <Room camera={camera} mood="night" floor="#3a2a28" wall="#4a2a2a" wallPattern={SURFACES[look][0]} floorPattern={SURFACES[look][1]} width={6} depth={5}>
    <InkBox size={[2.6, 0.6, 0.8]} position={[0, 0.3, -0.5]} color="#5a4038" ink={0.02} />
    <InkCylinder radius={0.09} height={0.14} position={[0.4, 2.3, 0.2]} color="#ff3a2a" emissive="#ff2a1a" ink={0.01} />
    <Halo position={[0.4, 2.3, 0.2]} size={2.2} color="#ff3a2a" strength={0.7} />
    <PrintLine y={2.0} z={-1.6} from={-2.6} to={2.6} frame={f} />
    {children}
  </Room>
);

// A developer rocks the tray under the red safelight: the photo of the Eagle on the ice comes up out of the paper.
const Tray = (f: number) => {
  const camera: CameraShot = { position: lerp3([1.5, 1.95, 2.3], [0.7, 1.7, 1.6], ease(f, 0, 32)), target: [0, 0.75, -0.6], fov: 46 };
  return (
    <Stage
      set={darkroom(camera, f, <DevTray position={[0, 0.6, -0.35]} frame={f} develop={ease(f, 4, 28)} />)}
      camera={camera}
      bg={BG_DARK}
      puppets={[{ id: "developer", look: DEVELOPER, pose: { ...faceChange([[0, "thinking"], [20, "happy"]], f), lean: 14, reachL: [-170, -380], reachR: [170, -380], frontL: true, frontR: true }, at: [0, -1.25] }]}
      light={redLight()}
    />
  );
};

// Trucking along the drying line: print after print, the counter on the wall reads 93 PHOTOS.
const Line = (f: number) => {
  const camera: CameraShot = { position: [-1.4 + f * 0.07, 1.6 + f * 0.01, 1.6 - f * 0.015], target: [-0.9 + f * 0.06, 1.95, -1.6], fov: 50 };
  return (
    <Stage
      set={darkroom(
        camera,
        f,
        <>
          <InkBox size={[0.9, 0.42, 0.04]} position={[0.3, 2.45, -2.45]} color="#1a1212" ink={0.015} />
          <Label text={"93\nPHOTOS"} position={[0.3, 2.45, -2.42]} width={0.6} fg="#ffd8c8" bg="#1a1212" border={false} appear={f - 4} count={ramp(f, 4, 22)} />
        </>,
        1,
      )}
      camera={camera}
      bg={BG_DARK}
    />
  );
};

// Push in on one print until the frozen Eagle fills the frame.
const PushPhoto = (f: number) => {
  const p = ease(f, 0, 67);
  const camera: CameraShot = { position: lerp3([0.2, 1.75, 0.3], [0.21, 1.84, -1.2], p), target: [0.21, 1.84, -1.6], fov: 44 };
  return (
    <>
      <Stage
        set={darkroom(camera, f, <Print position={[0.21, 1.84, -1.55]} size={0.3} develop={1} />, 2)}
        camera={camera}
        bg={BG_DARK}
        energy={0.4}
      />
      <Headline f={f} text="THEY NEVER CAME HOME" at={22} />
    </>
  );
};

const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());
const LaunchShot = multi([[36, HangarLow], [35, CrewOTS]]);
const RopeShot = multi([[32, RopeSnap], [39, RopeFall]]);
const FrostShot = one(Frost);
const IceShot = multi([[30, IceGag], [24, Sink]]);
const StrandedShot = multi([[36, Crash], [37, TopDown]]);
const TrekShot = multi([[42, Trek], [41, SledGag]]);
const StormShot = multi([[38, Vanish], [36, Tracks]]);
const ShipShot = one(ShipIn);
const BeachShot = multi([[38, Landing], [38, SpotIt]]);
const DigShot = one(Dig);
const FindShot = multi([[56, DiaryOTS], [34, Film]]);
const TrayShot = one(Tray);
const LineShot = one(Line);
const PushShot = one(PushPhoto);

// Cuts inside multi shots: 165 (crew OTS); 232 (rope fall); 341 (sink); 401 (top-down); 480 (sled gag); 559 (tracks);
// 673 (spot); 816 (film).
const SHOTS: Shot[] = [
  [0, 28, HookBalloon, false],
  [28, 58, HookFaces, false],
  [58, 90, HookRidge, false],
  [90, 129, HookWide, false],
  [129, 200, LaunchShot, true],
  [200, 271, RopeShot, true],
  [271, 311, FrostShot, true],
  [311, 365, IceShot, false],
  [365, 438, StrandedShot, true],
  [438, 521, TrekShot, true],
  [521, 595, StormShot, true],
  [595, 635, ShipShot, true],
  [635, 711, BeachShot, false],
  [711, 760, DigShot, false],
  [760, 850, FindShot, false],
  [850, 882, TrayShot, true],
  [882, 912, LineShot, false],
  [912, 977, PushShot, false], // 977 = totalFrames - LOOP
  [977, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.45, until: 129 },
  { at: 0, src: sfx("whoosh"), volume: 0.5 },
  { at: 28 + CLICK, src: sfx("button"), volume: 0.6 },
  { at: 58, src: sfx("whoosh"), volume: 0.45 },
  { at: 58 + HIT, src: sfx("stamp"), volume: 0.4 },
  { at: 58 + HIT, src: sfx("plop"), volume: 0.6 },
  { at: 90, src: sfx("whoosh"), volume: 0.35 },
  { at: 94, src: sfx("pop"), volume: 0.3 },
  { at: 125, src: sfx("whoosh"), volume: 0.4 },
  { at: 129, src: sfx("wind"), volume: 0.35, until: 271 },
  { at: 131, src: sfx("crowd"), volume: 0.18, until: 200 },
  { at: 196, src: sfx("whoosh"), volume: 0.4 },
  { at: 202, src: sfx("pop"), volume: 0.3 },
  { at: 200 + SNAP, src: sfx("reel-stop"), volume: 0.35 },
  { at: 200 + SNAP + 1, src: sfx("whoosh"), volume: 0.55 },
  { at: 240, src: sfx("near-miss"), volume: 0.3 },
  { at: 267, src: sfx("whoosh"), volume: 0.4 },
  { at: 271, src: sfx("wind"), volume: 0.5, until: 438 },
  { at: 275, src: sfx("hiss"), volume: 0.25 },
  { at: 289, src: sfx("pop"), volume: 0.3 },
  { at: 311 + BONK, src: sfx("plop"), volume: 0.7 },
  { at: 311 + BONK, src: sfx("stamp"), volume: 0.25 },
  { at: 341, src: sfx("tape-stop"), volume: 0.35 },
  { at: 361, src: sfx("whoosh"), volume: 0.35 },
  { at: 365 + CRASH, src: sfx("boom"), volume: 0.45 },
  { at: 365 + CRASH, src: sfx("stamp"), volume: 0.4 },
  { at: 373, src: sfx("pop"), volume: 0.3 },
  { at: 405, src: sfx("pop"), volume: 0.3 },
  { at: 434, src: sfx("whoosh"), volume: 0.4 },
  { at: 438, src: sfx("steps"), volume: 0.25, until: 492 },
  { at: 444, src: sfx("pop"), volume: 0.3 },
  { at: 480 + TRIP, src: sfx("plop"), volume: 0.7 },
  { at: 480 + TRIP + 2, src: sfx("stamp"), volume: 0.25 },
  { at: 517, src: sfx("whoosh"), volume: 0.4 },
  { at: 521, src: sfx("wind"), volume: 0.7, until: 595 },
  { at: 565, src: sfx("pop"), volume: 0.25 },
  { at: 591, src: sfx("whoosh"), volume: 0.4 },
  { at: 595, src: sfx("engine"), volume: 0.25, until: 640 },
  { at: 595, src: sfx("wind"), volume: 0.3, until: 850 },
  { at: 597, src: sfx("pop"), volume: 0.3 },
  { at: 635, src: sfx("steps"), volume: 0.3, until: 673 },
  { at: 683, src: sfx("chime"), volume: 0.25 },
  { at: 711 + REVEAL - 26, src: sfx("riser"), volume: 0.4 },
  { at: 711 + REVEAL, src: sfx("sting"), volume: 0.6 },
  { at: 711 + REVEAL, src: sfx("pop"), volume: 0.3 },
  { at: 711, src: sfx("paper"), volume: 0.2 },
  { at: 762, src: sfx("paper"), volume: 0.5 },
  { at: 816 + OPEN, src: sfx("drawer"), volume: 0.35 },
  { at: 846, src: sfx("whoosh"), volume: 0.35 },
  { at: 850, src: sfx("hum"), volume: 0.15, until: 977 },
  { at: 852, src: sfx("paper"), volume: 0.3 },
  { at: 886, src: sfx("pop"), volume: 0.35 },
  { at: 934, src: sfx("pop"), volume: 0.25 },
  { at: 973, src: sfx("whoosh"), volume: 0.4 },
  { at: 977, src: sfx("wind"), volume: 0.45, until: TIMING.totalFrames },
  { at: 977, src: sfx("whoosh"), volume: 0.5 },
];

// Bright and driving for the launch, pulsing from the icing through the island, a dark bed for the find and the photos.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 271, volume: 0.32 },
  { src: "music/tension.wav", from: 271, to: 731, volume: 0.3 },
  { src: "music/mystery.wav", from: 740, to: TIMING.totalFrames, volume: 0.32 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
