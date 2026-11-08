import React from "react";
import {
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  GodRays,
  Headline,
  InkBox,
  jump,
  Label,
  lerp3,
  lieDown,
  moveChange,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stepFrames,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Splash } from "../../three/RiverSets";
import {
  Barge,
  Calendar,
  CommitteeRoom,
  CommonsSet,
  CR,
  CrossnessSet,
  CX,
  Hat,
  LibrarySet,
  outsideWaterY,
  Sack,
  Stink,
  TankSet,
  TANK,
  TH,
  thamesBg,
  thamesLight,
  ThamesSet,
  TideDial,
  TunnelSet,
  TUNNEL,
  waterY,
} from "./sets";
import TIMING_JSON from "./timing.json";

// "Why the Thames Kept Bringing Parliament's Stink Back": London, summer 1858. An MP has lime tipped into the sewer
// mouths under Parliament; the ebb carries the brown water away, he flings his stinking hat after it, then the tide
// turns and brings the hat (and everything else) back to his window. Behind the scenes: the Thames at Westminster is
// tidal, so filth sloshes up and down; Bazalgette's intercepting sewers carry it east to Crossness, where the
// reservoir's sluice opens at high tide and the ebb takes it to sea. Sources: ../videos/thames-tide/research.md.
// Sets: ./sets.tsx, references guide/references/thames-westminster-1858.md.

const TIMING = TIMING_JSON as Timing;
export const SLUG = "thames-tide";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const cam = (from: Vec3, to: Vec3, target: Vec3, fov: number, p: number): CameraShot => ({ position: lerp3(from, to, p), target, fov });
const camT = (from: Vec3, to: Vec3, t0: Vec3, t1: Vec3, fov: number, p: number): CameraShot => ({ position: lerp3(from, to, p), target: lerp3(t0, t1, p), fov });
const one = (part: (f: number) => React.ReactElement): React.FC => () => part(useShotFrame());
const ASPECT = 1080 / 1920;

// ---------- cast ----------

const MP: PuppetLook = { skin: "#f0c8a8", hair: "#5a3a24", outfit: "#f2ece0", vest: "#3a2a3a", hat: "#2a2420", hatStyle: "bowler", beard: "#5a3a24", build: "broad", pants: "#2a2430" };
const MP_BARE: PuppetLook = { ...MP, hat: undefined, hatStyle: undefined };
const MEMBER_A: PuppetLook = { skin: "#e8c0a0", hair: "#cfcfcf", beard: "#dcdcdc", outfit: "#f0ece0", vest: "#1e1e28", build: "narrow", pants: "#1e1e28" };
const MEMBER_B: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#f0e8d8", vest: "#a8342a", pants: "#3a3040", stubble: "#2a1e16" };
const BARGEMAN: PuppetLook = { skin: "#d8a47a", hair: "#3a2a1e", outfit: "#e8dcc8", suspenders: "#4a3020", hat: "#6a5a3a", pants: "#4a4a5a", stubble: "#3a2a1e" };
const BAZALGETTE: PuppetLook = { skin: "#ecc4a0", hair: "#2a1e16", beard: "#2a1e16", outfit: "#f0ece0", vest: "#1a1a22", build: "narrow", pants: "#1a1a22" };
const WORKER: PuppetLook = { skin: "#c89068", hair: "#1a1410", outfit: "#d8d0bc", apron: "#5a4030", hat: "#3a3028", pants: "#3a3a40" };
const CLERK: PuppetLook = { skin: "#f2d2b4", hair: "#f2efe8", long: true, outfit: "#1a1a22", pants: "#1a1a22" };

const pose = (p: Partial<PuppetPose>) => ({ expression: "neutral", ...p }) as PuppetPose;
const P = (id: string, look: PuppetLook, at: [number, number], p: Partial<PuppetPose>): PuppetPlacement => ({ id, look, at, pose: pose(p) });

// ---------- river helpers ----------

const DAY = thamesBg("haze");
const DUSK = thamesBg("dusk");
const W0 = RIVERY(0);
function RIVERY(level: number) {
  return -0.32 + level;
}

// The hook: low on the water, a LIME sack drops at the lens and smacks the river. `offset` shifts the clock: the last
// LOOP frames of the video are this shot just before frame 0, so the Short loops.
const LOOP = 24;
const SPLASH = 12;
const sackY = (f: number) => (f < SPLASH ? 1.7 - 2.0 * Math.pow((f + LOOP) / (SPLASH + LOOP), 2) : W0 - Math.min(0.25, (f - SPLASH) * 0.02));
const hookAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ease(f, -LOOP, 22);
  const camera = cam([1.1, 0.1, 1.5], [0.8, 0.02, 1.15], [0.1, 0.3, -1.2], 50, p);
  const w = { drift: (f + 200) * 0.03, chop: 1.2 };
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 200} water={w} quay={false}>
          <group position={[-1.8, 0, -3.6]}>
            <Barge frame={f} sail={false} />
          </group>
          <Sack position={[0.15, sackY(f), -0.55]} rotation={[0.2 + f * 0.02, 0.1, 0.25 + f * 0.015]} scale={0.75} />
          <Splash at={[0.15, W0, -0.55]} t={f - SPLASH} power={1.4} count={44} color="#d8d0b0" />
          <Burst kind="dust" at={[0.15, W0 + 0.05, -0.55]} frame={f - SPLASH} count={20} size={1.3} speed={1.0} colors={["#ffffff", "#f2f0e6"]} floor={null} seed={3} />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
      energy={0}
    />
  );
};
const HookSplash = hookAt(0);
const LoopIn = hookAt(-LOOP);

// Hard cut: the MP on the lighter, nose pinched, pointing his men at the sewer mouth (the seed: him and his hat).
const HookMP = one((f) => {
  const camera = cam([-1.0, 1.25, 1.6], [-1.25, 1.15, 0.95], [-1.75, 1.0, -1.1], 40, ease(f, 0, 26));
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 230} water={{ drift: (f + 230) * 0.03 }} quay={false}>
          <group position={[-0.6, 0, -1.2]}>
            <Barge frame={f} sail={false} />
          </group>
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
      puppets={[P("mp", MP, [-1.8, -1.1], { ...faceChange([[0, "disgusted"], [12, "smug"]], f), reachL: [-40, -780], frontL: true, gesture: "point", lookX: 0.5 })]}
      light={thamesLight("haze")}
    />
  );
});

// Hard cut: a sewer arch in the terrace wall gushing at the lens; the lime bursts white in the brown water.
const HookSewer = one((f) => {
  const camera = cam([6.4, 0.35, -8.2], [6.0, 0.3, -8.9], [5.2, 0.15, -13], 44, ease(f, 0, 28));
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 260} water={{ drift: (f + 260) * 0.03 }} quay={false}>
          <Burst kind="dust" at={[5.3, W0 + 0.05, -12.2]} frame={f - 6} count={26} size={1.6} speed={1.0} colors={["#ffffff", "#ecebe2"]} floor={null} seed={5} />
          <Splash at={[5.3, W0, -12.2]} t={f - 6} power={0.6} count={20} color="#cfc6a4" />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
    />
  );
});

// Hard cut, wide: Parliament's river front in the heat haze, the brown water and its filth sliding past; crane up.
const HookWide = one((f) => {
  const camera = camT([-6.5, 1.4, 5.5], [-3.2, 3.6, 4.6], [-1, 2.2, -14], [0.5, 5.2, -14], 42, ease(f, 0, 56));
  return (
    <>
      <Stage
        set={
          <ThamesSet camera={camera} frame={f + 290} water={{ drift: (f + 290) * 0.035 }} filth={50}>
            <group position={[-2, 0, -7.5]}>
              <Barge frame={f + 30} sail={false} />
            </group>
            <Stink at={[-4, W0 + 0.2, -9]} frame={f} size={0.3} rise={3} wind={1.6} />
            <Stink at={[3, W0 + 0.2, -11]} frame={f} size={0.3} rise={3.4} wind={1.4} seed={3} />
          </ThamesSet>
        }
        camera={camera}
        bg={DAY}
      />
    </>
  );
});

// ---------- the story ----------

// Aerial over the river toward the Victoria Tower and the Clock Tower. LONDON, 1858.
const London = one((f) => {
  const camera = camT([14, 7.5, 2], [8, 8.5, -0.5], [2, 5, -16], [-4, 7, -16], 48, ease(f, 0, 49));
  return (
    <>
      <Stage
        set={
          <ThamesSet camera={camera} frame={f + 330} water={{ drift: (f + 330) * 0.035 }} filth={60}>
            <group position={[6, 0, -4]}>
              <Barge frame={f} />
            </group>
            <group position={[-6, 0, -9]} rotation={[0, Math.PI, 0]}>
              <Barge frame={f + 20} />
            </group>
          </ThamesSet>
        }
        camera={camera}
        bg={DAY}
      />
      <Headline f={f} text="LONDON, 1858" at={4} />
    </>
  );
});

// Macro on the committee room's thermometer: the red climbs to 30; the MP behind, sweating, fans himself.
const Thermo = one((f) => {
  const camera = cam([-0.95, 1.6, -0.45], [-1.15, 1.56, -0.8], [-1.5, 1.5, -2.2], 36, ease(f, 0, 58));
  const fan = Math.sin(f * 0.55) * 0.5 + Math.sin(f * 0.23) * 0.2;
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f} thermo={0.55 + ease(f, 0, 30) * 0.45}>
          <Label text="30°" position={[-1.55, 2.08, -2.12]} width={0.26} appear={f - 30} />
        </CommitteeRoom>
      }
      camera={camera}
      bg="#7a4e2e"
      blur={6}
      puppets={[P("mp", MP, [-0.55, -1.95], { expression: "worried", reachR: [120 + fan * 60, -720], frontR: true, lookX: -0.4 })]}
    />
  );
});

// The sewer arch pouring into the river; the TIDE gauge beside it on the terrace wall (the seed); a bollard frames it.
const Sewer = one((f) => {
  const c0 = cam([4.9, 0.7, -7.6], [3.8, 0.75, -7.9], [4.2, 0.2, -13], 40, 0);
  const camera = cam([4.9, 0.7, -7.6], [3.8, 0.75, -7.9], [4.2, 0.2, -13], 40, ease(f, 0, 52));
  return (
    <Stage
      set={<ThamesSet camera={camera} frame={f + 400} water={{ drift: (f + 400) * 0.035 }} filth={40} />}
      camera={camera}
      bg={DAY}
      foreground={
        <group position={frameSpot(c0, ASPECT, 0.92, -0.78, 1.1)}>
          <InkBox size={[0.22, 0.5, 0.22]} position={[0, 0, 0]} color="#2a2a2a" ink={0.012} />
          <InkBox size={[0.3, 0.06, 0.3]} position={[0, 0.26, 0]} color="#2a2a2a" ink={0.012} />
        </group>
      }
      blur={4}
    />
  );
});

// Tilt up from the arch to Parliament's windows, stink rising up the stone.
const Windows = one((f) => {
  const camera = camT([3.4, 1.1, -6.2], [3.0, 1.6, -6.6], [4.6, 0.6, -13], [3.5, 6.2, -14], 44, ease(f, 0, 34));
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 452} water={{ drift: (f + 452) * 0.035 }} filth={40}>
          <Stink at={[5.2, W0 + 0.3, -12.4]} frame={f + 20} size={0.22} rise={5} wind={0.3} />
          <Stink at={[2.4, W0 + 0.3, -12.2]} frame={f + 40} size={0.2} rise={5} wind={0.2} seed={4} />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
    />
  );
});

// The library: two members flee past the shelves, holding their noses, as the fumes curl in.
const Library = one((f) => {
  const camera = cam([-0.4, 1.3, 3.8], [0.4, 1.25, 3.5], [0.0, 0.95, -0.3], 40, ease(f, 0, 48));
  const a = stroll(f, 0, 40, [-1.0, 0.6], [1.0, 1.0]);
  const b = stroll(f, 6, 40, [-1.5, 1.2], [0.6, 1.5]);
  return (
    <Stage
      set={<LibrarySet camera={camera} frame={f} />}
      camera={camera}
      bg="#9a3a2e"
      puppets={[
        { id: "member-a", look: MEMBER_A, at: a.at, pose: pose({ expression: "disgusted", ...a.pose, reachR: [30, -770], frontR: true }) },
        { id: "member-b", look: MEMBER_B, at: b.at, pose: pose({ expression: "shocked", ...b.pose, reachL: [-30, -770], frontL: true, armR: [130, -40] }) },
      ]}
    />
  );
});

// Over the shoulder of a member: the MP bangs the green table. "Lime! Pour it into every sewer mouth!"
const SLAM = 22;
const Order = one((f) => {
  const camera = cam([1.55, 1.55, 3.9], [1.35, 1.5, 3.5], [0.05, 1.0, -0.8], 36, ease(f, 0, 60));
  const slam = f >= SLAM - 6 && f < SLAM + 10;
  return (
    <Stage
      set={<CommitteeRoom camera={camera} frame={f + 60} />}
      camera={camera}
      bg="#7a4e2e"
      puppets={[
        P("mp", MP, [0.0, -0.85], {
          ...faceChange([[0, "determined"], [SLAM - 2, "angry"], [SLAM + 16, "determined"]], f),
          ...(slam ? { reachR: [150, -420], handR: "fist" } : { armR: [150 - ease(f, 0, 10) * 20, -30], handR: f < SLAM - 6 ? "fist" : "open" }),
          gesture: f > SLAM + 14 ? "point" : undefined,
          lean: slam ? 8 : 0,
        }),
        P("member-a", MEMBER_A, [-0.95, -1.0], { ...faceChange([[0, "disgusted"], [SLAM, "shocked"], [SLAM + 14, "thinking"]], f) }),
        { id: "member-b", look: MEMBER_B, at: [0.85, 1.35], pose: pose({ expression: "neutral", view: "back" }) },
      ]}
    />
  );
});

// The lighter at a sewer mouth: the bargeman tips a sack, the lime cloud puffs into his face, he sneezes and topples
// back onto the sacks.
const TIP = 8;
const PUFF = 16;
const SNEEZE = 30;
const LimeTip = one((f) => {
  const camera = cam([-5.9, 0.95, -6.8], [-6.4, 0.9, -7.4], [-7.6, 0.55, -11], 40, ease(f, 0, 50));
  const sx = -7.6;
  const sz = -11.8;
  const fallT = ramp(f, TIP, TIP + 10);
  const sackPos: Vec3 = [-7.7, 0.55 - fallT * fallT * 1.0, -11.1 - fallT * 0.7];
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 520} water={{ drift: (f + 520) * 0.035 }} filth={30}>
          <group position={[-7.4, 0, -11]}>
            <Barge frame={f} sail={false} />
          </group>
          {f < TIP + 12 && <Sack position={sackPos} rotation={[fallT * 2, 0.3, 1.2]} scale={0.8} />}
          <Splash at={[sx, W0, sz]} t={f - TIP - 10} power={0.9} count={26} color="#e8e4d4" />
          <Burst kind="dust" at={[sx, W0 + 0.1, sz]} frame={f - TIP - 9} count={30} size={2.6} speed={1.3} colors={["#ffffff", "#f0eee4"]} floor={null} seed={8} />
          <Burst kind="dust" at={[-7.95, 1.0, -10.75]} frame={f - PUFF} count={22} size={1.6} speed={0.7} colors={["#ffffff", "#f4f2ea"]} floor={null} seed={9} />
          <Burst kind="stars" at={[-7.95, 1.15, -10.7]} frame={f - SNEEZE - 6} count={6} size={0.8} seed={2} />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
      puppets={[
        P("bargeman", BARGEMAN, [-7.95, -10.7], {
          ...faceChange([[0, "determined"], [PUFF, "shocked"], [SNEEZE - 6, "disgusted"], [SNEEZE + 8, "confused"]], f),
          ...(f < TIP + 4 ? { reachL: [-120, -600], reachR: [120, -600] } : {}),
          ...(f >= SNEEZE ? lieDown(f, SNEEZE, 14) : {}),
          ...(f >= SNEEZE - 6 && f < SNEEZE ? { lean: -10, slump: -0.6 } : {}),
        }),
      ]}
      light={thamesLight("haze")}
    />
  );
});

// Top-down over the river: the white lime and the brown water slide away downstream (to the right).
const Away = one((f) => {
  const camera = cam([-2.5, 9.5, -2.5], [1.8, 9.2, -2.8], [0, 0, -6.2], 44, ease(f, 0, 45));
  const drift = 18 + f * 0.11;
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 572} water={{ drift }} filth={70} quay>
          {Array.from({ length: 12 }, (_, i) => {
            const x = -3 + i * 0.6 + f * 0.11;
            const z = -8.5 + Math.sin(i * 1.7) * 1.5;
            return (
              <mesh key={i} position={[x, waterY(x, z, f + 572, { drift }) + 0.03, z]} rotation={[-Math.PI / 2, 0, i]} scale={[0.35 + (i % 3) * 0.12, 0.2, 1]}>
                <circleGeometry args={[1, 12]} />
                <meshBasicMaterial color="#f4f2ea" transparent opacity={0.7} depthWrite={false} />
              </mesh>
            );
          })}
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
    />
  );
});

// Over his shoulder at the window: he swings the casements open, sunlight pours in, he breathes in.
const OPEN = 6;
const WindowOpen = one((f) => {
  const camera = cam([0.95, 1.4, 0.4], [0.8, 1.38, 0.1], [0.2, 1.3, -3.0], 42, ease(f, 0, 41));
  const open = ease(f, OPEN, OPEN + 12);
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 120} open={open} outside={{ drift: 20 + f * 0.04, level: 0 }}>
          {open > 0.2 && <GodRays center={[0, 1.7, CR.wall + 0.16]} size={[1.4, 1.8]} panes={[2, 2]} sun={[-0.25, -0.5, 1]} strength={0.08 * open} frame={f} />}
        </CommitteeRoom>
      }
      camera={camera}
      bg="#7a4e2e"
      puppets={[
        P("mp", MP, CR.mp, {
          view: "back",
          ...(f < OPEN + 10 ? { reachL: [-160, -620], reachR: [160, -620] } : { armL: [120 + Math.sin(f * 0.2) * 8, -20], armR: [120, -20] }),
          slump: -ease(f, OPEN + 12, OPEN + 26) * 0.9,
          lean: -ease(f, OPEN + 12, OPEN + 26) * 6,
        }),
      ]}
      light={{ distant: [{ direction: [0.2, 0.4, -1], color: "#fff0c8", strength: 1.4 }], shadow: 0.14 }}
    />
  );
});

// Facing him, the open window behind: "Gone! Good riddance, filthy river!"
const Gone = one((f) => {
  const camera = cam([-0.15, 1.12, 0.55], [0.05, 1.08, 0.15], [0.35, 1.08, -1.9], 40, ease(f, 0, 70));
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 165} open={1} outside={{ drift: 22 + f * 0.05, level: 0 }} chairs={false}>
          <GodRays center={[0, 1.7, CR.wall + 0.16]} size={[1.4, 1.8]} panes={[2, 2]} sun={[-0.25, -0.5, 1]} strength={0.07} frame={f} />
        </CommitteeRoom>
      }
      camera={camera}
      bg="#7a4e2e"
      blur={3}
      puppets={[P("mp", MP, [0.35, -1.65], { view: "front", ...moveChange([[0, "excited", "cheer"], [30, "smug", "wave"], [56, "happy", "handsOnHips"]], f) })]}
      light={{ distant: [{ direction: [0.1, 0.3, -1], color: "#ffe8c0", strength: 1.2 }], shadow: 0.14 }}
    />
  );
});

// Behind him: he whips off his hat and flings it out of the window; it sails down to the river.
const THROW = 8;
const Fling = one((f) => {
  const camera = cam([0.9, 1.4, -0.3], [0.75, 1.45, -0.5], [0.2, 1.1, -3.5], 42, ease(f, 0, 21));
  const t = ramp(f, THROW, THROW + 14);
  const hat: Vec3 = [0.35 - t * 0.3, 1.25 + t * 0.6 - t * t * 2.4, -1.75 - t * 3.2];
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 236} open={1} outside={{ drift: 25 + f * 0.05, level: 0 }}>
          {f >= THROW && <Hat position={hat} rotation={[t * 3, t * 4, t * 2]} scale={1.2} />}
        </CommitteeRoom>
      }
      camera={camera}
      bg="#7a4e2e"
      puppets={[
        P("mp", f < THROW ? MP : MP_BARE, CR.mp, {
          view: "back",
          ...(f < THROW ? { reachR: [60, -980] } : { armR: [150 - t * 60, -10] }),
          lean: f < THROW ? -4 : 6,
        }),
      ]}
    />
  );
});

// Outside: the hat plops into the brown water and drifts off downstream.
const HAT_IN = 4;
const hatX = (f: number) => 1.8 + Math.max(0, f - HAT_IN) * 0.05;
const HatLands = one((f) => {
  const camera = cam([2.9, 0.55, -8.4], [3.4, 0.5, -8.6], [2.4, -0.2, -11.4], 40, ease(f, 0, 30));
  const w = { drift: 30 + f * 0.05 };
  const x = hatX(f);
  const z = -11.4;
  const y = f < HAT_IN ? 1.8 - (f / HAT_IN) * 2.1 : waterY(x, z, f + 700, w);
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 700} water={w} filth={36}>
          <Hat position={[x, y, z]} rotation={[0.15 * Math.sin(f * 0.2), f * 0.03, 0.12 * Math.sin(f * 0.17)]} scale={1.6} />
          <Splash at={[1.8, W0, z]} t={f - HAT_IN} power={0.6} count={18} color="#d8d0b0" />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
    />
  );
});

// ---------- the twist ----------

// Dissolve to dusk at the TIDE gauge: the water stops, turns and climbs the gauge.
const TideTurns = one((f) => {
  const camera = cam([3.6, 0.35, -9.2], [3.1, 0.45, -10.1], [2.6, 0.25, -12.5], 42, ease(f, 0, 62));
  const level = ease(f, 6, 62) * 0.85;
  const drift = 40 + f * 0.05 * (1 - ease(f, 0, 26)) - ease(f, 26, 62) * (f - 26) * 0.06;
  return (
    <Stage
      set={<ThamesSet camera={camera} frame={f + 760} mode="dusk" water={{ drift }} level={level} filth={30} />}
      camera={camera}
      bg={DUSK}
    />
  );
});

// Wide at dusk: the river runs backward; the hat rides back upstream toward Parliament.
const Backward = one((f) => {
  const camera = camT([4.5, 1.7, 4.6], [1.0, 1.6, 4.4], [3.0, 0.6, -9], [-0.5, 0.6, -10], 42, ease(f, 0, 45));
  const w = { drift: 30 - f * 0.12, chop: 1.3 };
  const x = 6 - f * 0.12;
  const z = -9.5;
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 830} mode="dusk" water={w} level={0.9} filth={60}>
          <Hat position={[x, waterY(x, z, f + 830, w, 0.9), z]} rotation={[0.2 * Math.sin(f * 0.2), -f * 0.04, 0.15 * Math.sin(f * 0.15)]} scale={1.8} wet />
          <Stink at={[0, RIVERY(0.9) + 0.2, -10]} frame={f} size={0.3} rise={3} wind={-1.4} />
        </ThamesSet>
      }
      camera={camera}
      bg={DUSK}
      light={thamesLight("dusk")}
    />
  );
});

// Through the window from outside: the high water rides the hat up and slaps it onto his face.
const SLAP = 30;
const HatSlap = one((f) => {
  const camera = cam([0.2, 1.3, -3.25], [0.25, 1.22, -2.95], [0.35, 1.08, -1.6], 42, ease(f, 0, 52));
  const level = 0.8 + ease(f, 0, 24) * 0.15;
  const wy = outsideWaterY(level);
  const up = ease(f, 18, SLAP);
  const hat: Vec3 = f < SLAP ? [0.8 - up * 0.45, wy + (up * up) * (1.05 - wy), -2.9 + up * 1.05] : [0.35, 1.02, -1.83];
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 300} open={1} panic={0.4 + ease(f, SLAP, SLAP + 10) * 0.4} outside={{ drift: 30 - f * 0.1, level, dusk: true }} curtains>
          <Hat position={hat} rotation={f < SLAP ? [0.2 * Math.sin(f * 0.3), f * 0.05, 0] : [-1.45, 0, 0.1]} scale={1.3} wet />
          <Burst kind="stars" at={[0.35, 1.1, -1.75]} frame={f - SLAP} count={7} size={0.9} seed={4} />
          <Burst kind="dust" at={[0.35, 1.0, -1.85]} frame={f - SLAP} count={14} size={0.7} speed={0.8} colors={["#6a5a30", "#8a7a40"]} floor={null} seed={6} />
        </CommitteeRoom>
      }
      camera={camera}
      bg="#4a5a3a"
      puppets={[
        P("mp", MP_BARE, [0.35, -1.6], {
          view: "front",
          ...faceChange([[0, "confused"], [14, "shocked"], [SLAP + 2, "disgusted"]], f),
          ...(f >= SLAP ? { reachL: [-80, -820], reachR: [80, -820], frontL: true, frontR: true, lean: -10 } : { armL: [30, -20], armR: [30, -20] }),
        }),
      ]}
      light={{ points: [{ position: [0.3, 1.4, -0.6], color: "#b8ff6a", strength: 1.2, range: 3 }], shadow: 0.2 }}
    />
  );
});

// Inside: a slop of brown water and filth heaves over the sill; the fumes pour in; the members gag.
const Slop = one((f) => {
  const camera = cam([-0.6, 1.45, 3.4], [-0.4, 1.4, 3.0], [0.0, 1.1, -1.2], 44, ease(f, 0, 33));
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 352} open={1} panic={0.9} outside={{ drift: 26 - f * 0.1, level: 0.95, dusk: true }}>
          <Burst kind="dust" at={[0, CR.sill + 0.1, CR.wall + 0.3]} frame={f - 2} count={30} size={1.4} speed={1.6} spray={[0, 0.5, 2.2]} colors={["#5a4026", "#7a6a3a", "#6a7a2a"]} floor={0} seed={11} />
          <Stink at={[0, CR.sill + 0.3, CR.wall + 0.4]} frame={f + 30} size={0.16} rise={1.4} wind={-0.6} />
          <Stink at={[-0.5, CR.sill + 0.2, CR.wall + 0.3]} frame={f} size={0.14} rise={1.2} wind={-0.9} seed={5} />
        </CommitteeRoom>
      }
      camera={camera}
      bg="#4a5a3a"
      puppets={[
        P("member-a", MEMBER_A, [-0.4, 1.6], { ...faceChange([[0, "shocked"], [10, "disgusted"]], f), reachR: [30, -770], frontR: true, lean: -8 }),
        P("member-b", MEMBER_B, [0.6, 1.3], { ...faceChange([[0, "disgusted"], [16, "shocked"]], f), armL: [150, -20], armR: [150, -20], ...jump(f, 8, 120, 24) }),
      ]}
      light={{ points: [{ position: [0, 1.4, -1.6], color: "#b8ff6a", strength: 1.4, range: 3.5 }], shadow: 0.2 }}
    />
  );
});

// Two strolls in a row (around the table): from -> via over the first half, via -> to over the rest.
const legs = (f: number, start: number, frames: number, from: [number, number], via: [number, number], to: [number, number]) => {
  const h = Math.round(frames / 2);
  return f < start + h ? stroll(f, start, h, from, via) : stroll(f, start + h, frames - h, via, to);
};

// Wide: the committee stampedes for the door; chairs go over; three men jam in the doorway.
const JAM = 32;
const Stampede = one((f) => {
  const camera = cam([-1.7, 1.75, 3.4], [-1.3, 1.6, 3.0], [1.1, 0.9, -1.0], 44, ease(f, 0, 50));
  const a = legs(f, 0, JAM, [-1.2, 1.6], [1.95, 1.6], [2.05, -1.75]);
  const b = legs(f, 4, JAM - 4, [0.3, 1.75], [2.45, 1.75], [2.45, -1.7]);
  const c = stroll(f, 8, JAM - 6, [0.4, -1.2], [2.3, -1.45]);
  const jam = f >= JAM ? squash(f, JAM, 0.3) : [1, 1, 1];
  const tip = (k: number) => ease(f, 4 + k * 5, 12 + k * 5);
  return (
    <Stage
      set={
        <CommitteeRoom camera={camera} frame={f + 385} open={1} panic={1} chairs={false} door={ease(f, 6, 16)} outside={{ drift: 22 - f * 0.1, level: 0.95, dusk: true }}>
          {[-0.9, 0, 0.9].map((x, k) => (
            <group key={x} userData={{ ghost: true }} position={[x, 0, 0.95]} rotation={[tip(k) * 1.45, k * 0.3, 0]}>
              <InkBox size={[0.42, 0.06, 0.42]} position={[0, 0.44, 0]} color="#7a2a22" ink={0.008} />
              <InkBox size={[0.42, 0.55, 0.05]} position={[0, 0.74, 0.19]} color="#4a2a1a" ink={0.008} />
              {[-0.17, 0.17].map((p) => [-0.17, 0.17].map((q) => <InkBox key={`${p}${q}`} size={[0.04, 0.44, 0.04]} position={[p, 0.22, q]} color="#4a2a1a" ink={0.004} />))}
            </group>
          ))}
          <Burst kind="stars" at={[2.3, 1.2, -1.6]} frame={f - JAM} count={8} size={1} seed={7} />
          <Stink at={[0, 1.2, -2.0]} frame={f} size={0.16} rise={1.6} wind={1.2} />
        </CommitteeRoom>
      }
      camera={camera}
      bg="#4a5a3a"
      puppets={[
        { id: "member-a", look: MEMBER_A, at: a.at, pose: pose({ expression: "disgusted", ...a.pose, reachR: [30, -770], frontR: true }) },
        { id: "member-b", look: MEMBER_B, at: b.at, pose: pose({ expression: "shocked", ...b.pose, armL: [150, -30], armR: [150, -30] }) },
        { id: "mp", look: MP_BARE, at: c.at, pose: pose({ expression: f >= JAM ? "awkward" : "disgusted", ...c.pose, squash: f >= JAM ? 1 - jam[1] : 0 } as Partial<PuppetPose>) },
      ]}
      light={{ points: [{ position: [0, 1.5, -1.8], color: "#b8ff6a", strength: 1.2, range: 4 }], shadow: 0.2 }}
    />
  );
});

// ---------- the mechanism ----------

// The Thames in a glass tank: WESTMINSTER at one end, the SEA plunger at the other, the TIDE dial on the wall.
const tideAt = (f: number) => Math.sin(f * 0.05);
const TankWide = one((f) => {
  const camera = camT([0.5, 1.45, 2.4], [0.3, 1.35, 1.9], [-0.1, 1.2, -0.5], [-0.12, 1.1, -0.3], 42, ease(f, 0, 83));
  const s = tideAt(f);
  return (
    <Stage set={<TankSet camera={camera} frame={f} slosh={s} tide={s} />} camera={camera} bg="#3e5a86" />
  );
});

// Top-down: the sea pushes in, the water piles toward Westminster.
const PushIn = one((f) => {
  const camera = cam([0.0, 3.3, 0.7], [-0.05, 3.15, 0.6], [-0.05, 0.9, 0], 40, ease(f, 0, 58));
  const s = -1 + ease(f, 2, 40) * 2;
  return <Stage set={<TankSet camera={camera} frame={f + 90} slosh={s} tide={s} />} camera={camera} bg="#3e5a86" />;
});

// Close on the plunger: it drags out and the water runs back to the sea.
const DragOut = one((f) => {
  const camera = cam([1.05, 1.2, 1.0], [0.9, 1.15, 0.85], [0.35, 1.0, 0], 40, ease(f, 0, 39));
  const s = 1 - ease(f, 0, 30) * 2;
  return (
    <Stage
      set={
        <TankSet camera={camera} frame={f + 150} slosh={s} tide={s}>
          <TideDial position={[0.85, 1.5, -0.5]} tide={s} size={0.45} />
        </TankSet>
      }
      camera={camera}
      bg="#3e5a86"
    />
  );
});

// Close on the model Westminster: the filth sloshes up and down under its windows, over and over.
const Slosh = one((f) => {
  const camera = cam([0.2, 1.18, 0.85], [0.05, 1.12, 0.7], [-0.3, 1.0, 0], 40, ease(f, 0, 74));
  const s = Math.sin(f * 0.11);
  return (
    <Stage
      set={
        <TankSet camera={camera} frame={f + 200} slosh={s} tide={s}>
        </TankSet>
      }
      camera={camera}
      bg="#3e5a86"
      blur={4}
    />
  );
});

// A LIME sack drops in: a white cloud, and the water goes on sloshing all the same.
const DROP = 6;
const LimeTank = one((f) => {
  const camera = cam([0.35, 1.3, 1.25], [0.2, 1.25, 1.05], [0.05, 1.0, 0], 40, ease(f, 0, 51));
  const s = Math.sin((f + 30) * 0.11);
  const t = ramp(f, 0, DROP);
  const y = f < DROP ? 1.8 - t * t * (1.8 - (TANK.table + 0.22)) : TANK.table + 0.2 - Math.min(0.06, (f - DROP) * 0.004);
  return (
    <Stage
      set={
        <TankSet camera={camera} frame={f + 280} slosh={s} tide={s} lime={ease(f, DROP, DROP + 14)} sackY={y}>
          <Burst kind="dust" at={[0.1, TANK.table + 0.22, 0]} frame={f - DROP} count={18} size={0.5} speed={0.5} colors={["#ffffff", "#f0eee6"]} floor={null} seed={12} />
          <Label text="LIME" position={[0.3, 1.3, -0.1]} width={0.26} appear={f - DROP - 4} />
        </TankSet>
      }
      camera={camera}
      bg="#3e5a86"
    />
  );
});

// In the sewer: Joseph Bazalgette strides along the walkway by lantern light.
const lanternLight = (z: number) => ({ points: [{ position: [-1.2, 1.7, z] as Vec3, color: "#ffb05a", strength: 2.4, range: 3 }], shadow: 0.22 });
const Bazalgette = one((f) => {
  const camera = camT([-0.3, 1.05, 1.4], [-0.4, 1.0, 0.9], [-0.8, 0.95, -3.2], [-0.8, 0.95, -2.4], 40, ease(f, 0, 66));
  const w = stroll(f, 0, 44, [-0.85, -4.2], [-0.85, -1.4]);
  return (
    <Stage
      set={<TunnelSet camera={camera} frame={f} />}
      camera={camera}
      bg="#120a06"
      puppets={[{ id: "bazalgette", look: BAZALGETTE, at: w.at, pose: pose({ expression: "determined", ...w.pose }) }]}
      light={lanternLight(-2.5)}
    />
  );
});

// He hauls the lever; the TO RIVER flap gate slams shut: the sewage now runs only east.
const SHUT = 12;
const GateShut = one((f) => {
  const camera = cam([-0.35, 1.1, 0.55], [-0.2, 1.05, 0.3], [0.8, 0.6, -1.4], 42, ease(f, 0, 39));
  return (
    <Stage
      set={
        <TunnelSet camera={camera} frame={f + 66} gate={ease(f, SHUT - 8, SHUT)}>
          <group position={[-0.25, 0, -1.2]} rotation={[0, 0, 0.6 - ease(f, SHUT - 8, SHUT) * 1.2]}>
            <InkBox size={[0.05, 0.7, 0.05]} position={[0, 0.35, 0]} color="#3a3a3a" ink={0.006} />
            <InkBox size={[0.1, 0.1, 0.1]} position={[0, 0.72, 0]} color="#c8302a" ink={0.006} />
          </group>
          <Burst kind="dust" at={[1.0, 0.1, -1.3]} frame={f - SHUT} count={12} size={0.6} speed={0.6} colors={["#7a5a3a", "#9a7a50"]} seed={13} />
        </TunnelSet>
      }
      camera={camera}
      bg="#120a06"
      puppets={[P("bazalgette", BAZALGETTE, [-0.75, -1.05], { ...faceChange([[0, "determined"], [SHUT + 4, "smug"]], f), reachR: f < SHUT ? [140, -520] : [150, -380], lean: f < SHUT ? 6 : 0, lookX: 0.6 })]}
      light={lanternLight(-2.5)}
    />
  );
});

// Truck down the tunnel with the flow, east, past the cast-iron plaque: 82 MILES.
const Miles = one((f) => {
  const camera = camT([-0.2, 1.2, -2.2], [-0.2, 1.15, -5.0], [-1.55, 1.15, -3.0], [-0.5, 0.7, -14], 40, ease(f, 12, 75));
  return <Stage set={<TunnelSet camera={camera} frame={f + 105} gate={1} plaque={f - 4} />} camera={camera} bg="#120a06" />;
});

// Crossness, low angle: the reservoir fills, the gauge counts 27,000,000 GALLONS.
const Reservoir = one((f) => {
  const camera = cam([0.6, 2.2, 4.0], [0.2, 2.1, 3.6], [-1.6, 1.5, -0.6], 46, ease(f, 0, 78));
  const fill = 0.3 + ease(f, 0, 50) * 0.7;
  return (
    <Stage
      set={
        <CrossnessSet camera={camera} frame={f} fill={fill} gate={0} water={{ drift: f * 0.02 }}>
          <Label text={"27,000,000\nGALLONS"} position={[CX.gauge[0], 2.6, CX.gauge[2] + 0.35]} width={0.95} count={ease(f, 6, 50)} appear={f - 4} />
        </CrossnessSet>
      }
      camera={camera}
      bg="#a8b8cc"
    />
  );
});

// The TIDE dial reads HIGH TIDE; the worker spins the SLUICE wheel and the gate starts to lift.
const LIFT = 26;
const HighTide = one((f) => {
  const camera = cam([2.2, 1.55, 2.6], [1.9, 1.5, 2.2], [1.8, 1.35, -1.9], 46, ease(f, 0, 52));
  const gate = ease(f, LIFT, LIFT + 40) * 0.6;
  const spin = Math.sin(f * 0.4);
  return (
    <Stage
      set={
        <CrossnessSet camera={camera} frame={f + 78} fill={1} gate={gate} water={{ drift: 2 - f * 0.01 }}>
          <TideDial position={CX.dial} tide={1} title="HIGH TIDE" size={0.9} />
        </CrossnessSet>
      }
      camera={camera}
      bg="#a8b8cc"
      puppets={[
        P("worker", WORKER, [2.3, -1.45], {
          ...faceChange([[0, "determined"], [LIFT + 10, "happy"]], f),
          reachL: [-150 + spin * 40, -560 + spin * 30],
          reachR: [-60 - spin * 40, -600 - spin * 30],
          view: "front",
        }),
      ]}
      light={thamesLight("steel")}
    />
  );
});

// Wide: the gate is up, the reservoir pours out and the ebb carries it all away past TO THE SEA.
const Ebb = one((f) => {
  const camera = camT([1.5, 2.8, 3.4], [4.0, 2.6, 2.8], [1.5, 0, -5], [4.5, 0, -6.5], 46, ease(f, 0, 47));
  return (
    <Stage
      set={<CrossnessSet camera={camera} frame={f + 130} fill={1 - ease(f, 0, 40) * 0.6} gate={0.6 + ease(f, 0, 10) * 0.4} water={{ drift: 10 + f * 0.1 }} />}
      camera={camera}
      bg="#a8b8cc"
    />
  );
});

// The Commons: the clerk's calendar counts to 18 DAYS and the stamp comes down: LAW. The members cheer.
const STAMP = 34;
const Commons = one((f) => {
  const camera = camT([0.45, 1.15, 0.7], [0.5, 1.25, 1.3], [0.5, 1.0, -1.2], [0.3, 1.0, -1.5], 40, ease(f, 8, 63));
  return (
    <Stage
      set={
        <CommonsSet camera={camera} frame={f}>
          <Calendar position={[0.32, 0.78, -1.0]} count={ease(f, 0, 30)} stamp={f - STAMP} />
          <group position={[0.62, 0.78 + (f < STAMP ? 0.35 - ease(f, STAMP - 8, STAMP) * 0.3 : 0.05 + ease(f, STAMP, STAMP + 10) * 0.3), -1.0]}>
            <InkBox size={[0.12, 0.06, 0.12]} position={[0, 0, 0]} color="#3a2a1e" ink={0.006} />
            <InkBox size={[0.04, 0.16, 0.04]} position={[0, 0.11, 0]} color="#c8a040" ink={0.004} />
          </group>
        </CommonsSet>
      }
      camera={camera}
      bg="#2f6a3a"
      blur={4}
      puppets={[
        P("clerk", CLERK, [0.75, -1.95], { expression: "smug", reachL: [-120, -560], lookX: -0.5 }),
        P("mp", MP_BARE, [-0.7, -2.3], { ...moveChange([[0, "neutral"], [STAMP, "excited", "cheer"]], f) }),
        P("member-a", MEMBER_A, [-1.3, -1.9], { ...moveChange([[0, "neutral"], [STAMP + 4, "happy", "clap"]], f) }),
      ]}
    />
  );
});

// The hat, still riding the tide: low on the water, it bobs one way, then the other.
const HatRides = one((f) => {
  const camera = camT([0.9, 0.15, -6.0], [0.3, 0.2, -6.4], [0.2, -0.1, -8.6], [-0.2, -0.1, -8.8], 40, ease(f, 0, 58));
  const drift = 50 + Math.sin(f * 0.06) * 3;
  const w = { drift, chop: 1.1 };
  const x = Math.sin(f * 0.06) * 0.6;
  const z = -8.7;
  return (
    <Stage
      set={
        <ThamesSet camera={camera} frame={f + 900} water={w} filth={30}>
          <Hat position={[x, waterY(x, z, f + 900, w), z]} rotation={[0.2 * Math.sin(f * 0.21), f * 0.02, 0.15 * Math.sin(f * 0.17)]} scale={1.6} wet />
        </ThamesSet>
      }
      camera={camera}
      bg={DAY}
    />
  );
});

const SHOTS: Shot[] = [
  [0, 21, HookSplash, false],
  [21, 48, HookMP, false],
  [48, 77, HookSewer, false],
  [77, 133, HookWide, false],
  [133, 182, London, false],
  [182, 241, Thermo, true],
  [241, 293, Sewer, true],
  [293, 327, Windows, false],
  [327, 375, Library, true],
  [375, 439, Order, true],
  [439, 490, LimeTip, true],
  [490, 535, Away, false],
  [535, 580, WindowOpen, true],
  [580, 651, Gone, false],
  [651, 672, Fling, false],
  [672, 693, HatLands, true],
  [693, 755, TideTurns, "dissolve"],
  [755, 800, Backward, false],
  [800, 852, HatSlap, true],
  [852, 885, Slop, false],
  [885, 935, Stampede, false],
  [935, 1022, TankWide, true],
  [1022, 1080, PushIn, false],
  [1080, 1119, DragOut, false],
  [1119, 1193, Slosh, false],
  [1193, 1244, LimeTank, false],
  [1244, 1310, Bazalgette, true],
  [1310, 1349, GateShut, false],
  [1349, 1424, Miles, false],
  [1424, 1502, Reservoir, true],
  [1502, 1554, HighTide, false],
  [1554, 1601, Ebb, false],
  [1601, 1664, Commons, true],
  [1664, 1722, HatRides, true],
  [1722, TIMING.totalFrames, LoopIn, true],
];

// ---------- sound ----------

const SFX_RAW: Sfx[] = [
  // hook
  { at: 0, src: sfx("river"), volume: 0.12, until: 133 },
  { at: 2, src: sfx("whoosh"), volume: 0.3 },
  { at: SPLASH, src: sfx("splash"), volume: 0.5, space: "outdoor" },
  { at: SPLASH + 1, src: sfx("stamp"), volume: 0.22, space: "outdoor" },
  { at: 21 + 10, src: sfx("sniff"), volume: 0.8, space: "outdoor" },
  { at: 48 + 6, src: sfx("splash"), volume: 0.5, space: "outdoor" },
  { at: 48 + 7, src: sfx("hiss"), volume: 0.35, space: "outdoor" },
  { at: 77 + 4, src: sfx("wind"), volume: 0.12, until: 182 },
  { at: 133 + 4, src: sfx("pop"), volume: 1.0 },
  // the heat, the sewers
  { at: 178, src: sfx("whoosh"), volume: 0.4 },
  { at: 182 + 30, src: sfx("pop"), volume: 1.0 },
  { at: 182 + 10, src: sfx("paper"), volume: 0.35, space: "room" },
  { at: 237, src: sfx("whoosh"), volume: 0.4 },
  { at: 241, src: sfx("river"), volume: 0.18, until: 327 },
  { at: 241 + 4, src: sfx("slime"), volume: 0.4, space: "outdoor" },
  { at: 323, src: sfx("whoosh"), volume: 0.4 },
  { at: 371, src: sfx("whoosh"), volume: 0.4 },
  { at: 375 + SLAM, src: sfx("stamp"), volume: 0.4, space: "room" },
  { at: 375 + SLAM + 1, src: sfx("clink"), volume: 0.35, space: "room" },
  { at: 435, src: sfx("whoosh"), volume: 0.4 },
  { at: 439, src: sfx("river"), volume: 0.15, until: 535 },
  { at: 439 + TIP + 10, src: sfx("splash"), volume: 0.35, space: "outdoor" },
  { at: 439 + PUFF, src: sfx("hiss"), volume: 0.18, space: "outdoor" },
  { at: 439 + SNEEZE - 2, src: sfx("sniff"), volume: 0.3, space: "outdoor" },
  { at: 439 + SNEEZE + 8, src: sfx("plop"), volume: 0.45, space: "outdoor" },
  { at: 490 + 4, src: sfx("slime"), volume: 0.7, space: "outdoor" },
  { at: 531, src: sfx("whoosh"), volume: 0.4 },
  { at: 535 + OPEN, src: sfx("creak"), volume: 0.45, space: "room" },
  { at: 535 + OPEN + 10, src: sfx("wind"), volume: 0.1, until: 693 },
  { at: 535 + 26, src: sfx("sniff"), volume: 0.7, space: "room" },
  { at: 672 + HAT_IN, src: sfx("plop"), volume: 0.75, space: "outdoor" },
  // the twist
  { at: 708, src: sfx("sting"), volume: 0.3 },
  { at: 693, src: sfx("river"), volume: 0.16, until: 800 },
    { at: 796, src: sfx("whoosh"), volume: 0.4 },
  { at: 800 + SLAP, src: sfx("splash"), volume: 0.35, space: "room" },
  { at: 800 + SLAP + 1, src: sfx("stamp"), volume: 0.35, space: "room" },
  { at: 852 + 2, src: sfx("slime"), volume: 0.6, space: "room" },
  { at: 852 + 8, src: sfx("splash"), volume: 0.4, space: "room" },
  { at: 885 + 6, src: sfx("door"), volume: 0.5, space: "room" },
  ...foleyCues("thud", [885 + 9, 885 + 14, 885 + 19], 0.5, { space: "room" }),
  { at: 885 + JAM, src: sfx("squeak"), volume: 0.6, space: "room" },
  { at: 885 + JAM + 1, src: sfx("boom"), volume: 0.25, space: "room" },
  // the mechanism
  { at: 931, src: sfx("whoosh"), volume: 0.45 },
  { at: 935 + 6, src: sfx("pop"), volume: 0.3 },
  { at: 1022 + 2, src: sfx("creak"), volume: 0.35, space: "room" },
  { at: 1022 + 14, src: sfx("slime"), volume: 0.7, space: "room" },
  { at: 1080 + 2, src: sfx("creak"), volume: 0.35, space: "room" },
  { at: 1080 + 14, src: sfx("slime"), volume: 0.3, space: "room" },
  { at: 1119 + 20, src: sfx("slime"), volume: 0.8, space: "room" },
  { at: 1119 + 48, src: sfx("slime"), volume: 0.75, space: "room" },
  { at: 1193 + DROP, src: sfx("plop"), volume: 1.0, space: "room" },
  { at: 1193 + DROP + 4, src: sfx("pop"), volume: 0.5 },
  { at: 1240, src: sfx("whoosh"), volume: 0.4 },
  { at: 1244, src: sfx("river"), volume: 0.14, until: 1424 },
  ...foleyCues("thud", stepFrames(1244, 44, [-0.85, -4.2], [-0.85, -1.4]), 0.5, { space: "hall" }),
  { at: 1310 + SHUT - 8, src: sfx("creak"), volume: 0.4, space: "hall" },
  { at: 1310 + SHUT, src: sfx("clang"), volume: 0.6, space: "hall" },
  { at: 1310 + SHUT + 1, src: sfx("stamp"), volume: 0.25, space: "hall" },
  { at: 1349 + 4, src: sfx("pop"), volume: 1.0 },
  { at: 1420, src: sfx("whoosh"), volume: 0.4 },
  { at: 1424 + 4, src: sfx("pop"), volume: 0.6 },
  { at: 1424 + 6, src: sfx("tick"), volume: 0.3, until: 1424 + 50 },
  { at: 1502 + 6, src: sfx("creak"), volume: 0.25, space: "outdoor" },
  { at: 1502 + LIFT, src: sfx("clang"), volume: 0.7, space: "outdoor" },
  { at: 1554, src: sfx("river"), volume: 0.25, until: 1601 },
  { at: 1554 + 2, src: sfx("splash"), volume: 0.3, space: "outdoor" },
  // the ending
  { at: 1597, src: sfx("whoosh"), volume: 0.4 },
  { at: 1601 + STAMP, src: sfx("stamp"), volume: 1.0, space: "hall" },
  { at: 1601 + STAMP + 4, src: sfx("crowd"), volume: 0.12, until: 1664 },
  { at: 1660, src: sfx("whoosh"), volume: 0.4 },
  { at: 1664, src: sfx("river"), volume: 0.14, until: 1722 },
  { at: 1718, src: sfx("whoosh"), volume: 0.45 },
  { at: 1722, src: sfx("river"), volume: 0.12, until: TIMING.totalFrames },
];

// Effects sit under the voice: loops (river, wind) low, one-shots at 65 % (the mix report found words masked).
const SFX: Sfx[] = SFX_RAW.map((c) => ({ ...c, volume: c.volume * (c.until ? 0.4 : 0.65) }));

const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 375, volume: 0.28 },
  { src: "music/lounge.wav", from: 375, to: 693, volume: 0.26 },
  { src: "music/mystery.wav", from: 693, to: 935, volume: 0.28 },
  { src: "music/tension.wav", from: 935, to: 1601, volume: 0.27 },
  { src: "music/upbeat.wav", from: 1601, to: TIMING.totalFrames, volume: 0.28 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;
