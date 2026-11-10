import React from "react";
import {
  beatPath,
  cardTilt,
  handWorld,
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  frameSpot,
  Headline,
  InkBox,
  InkCylinder,
  Label,
  Lamp,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
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
  moodBackground,
} from "../../engine";
import { Hat } from "../thames-tide/sets";
import { Bomb, CAR, Crown, Domino, Flash, GeneralHat, LampPole, MapTable, Newspaper, Pedestal, route, seatAt, SeatName, SmokeBurst, Tourer, WallCalendar } from "./props";
import { CITY_BG, cityLight, Q, SarajevoSet, TOWNHALL } from "./SarajevoSet";
import TIMING_JSON from "./timing.json";

// "What if the Archduke's driver had known the route?": Sarajevo, 28 June 1914. A route change nobody passed to the
// drivers sends Franz Ferdinand's open car into a wrong turn at the Latin Bridge; it stands still beside Gavrilo
// Princip. Sets: SarajevoSet (this folder, guide/references/sarajevo-1914.md), Room interiors (Town Hall, the map
// room, the crown hall). The car is a sand3d model (../videos/what-if-sarajevo/sand3d/tourer.py).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "what-if-sarajevo";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const ASPECT = 9 / 16;

// ---------- cast ----------

const ARCHDUKE: PuppetLook = { skin: "#f0c8a8", hair: "#6a5a48", outfit: "#9cc0e0" };
const SOPHIE: PuppetLook = { skin: "#f6d8c4", hair: "#4a3020", outfit: "#faf8f2", skirt: true, long: true, hat: "#f6f2ea" };
const DRIVER: PuppetLook = { skin: "#e8c0a0", hair: "#2a2018", outfit: "#4a4a52" };
const GOVERNOR: PuppetLook = { skin: "#ecc4a4", hair: "#c8c8c8", outfit: "#34466a" };
const PRINCIP: PuppetLook = { skin: "#e8c4a4", hair: "#2a1e18", outfit: "#2e2e36", vest: "#4a4038", hat: "#2a2620" };
const PRINCIP_BARE: PuppetLook = { ...PRINCIP, hat: undefined };
const BOMBER: PuppetLook = { skin: "#e4bc98", hair: "#1a1410", outfit: "#7a5a3a" };
const CROWD_M: PuppetLook = { skin: "#d8a47a", hair: "#3a2414", outfit: "#e8e0cc", vest: "#5a3a2a", hat: "#3a3028" };
const CROWD_W: PuppetLook = { skin: "#f0c8a0", hair: "#6a4020", outfit: "#c8607a", skirt: true, long: true, kerchief: "#f0e0a0" };
const CROWD_B: PuppetLook = { skin: "#e8c0a0", hair: "#8a5a30", outfit: "#5a7a9a", suspenders: "#3a2a1a" };
const CROWD_O: PuppetLook = { skin: "#d8b090", hair: "#9a9a9a", outfit: "#3a3a2a", beard: "#9a9a9a", hat: "#1a1a1a" };
const CROWD_G: PuppetLook = { skin: "#f6d8c0", hair: "#3a2414", outfit: "#e8d48a", skirt: true, long: true, apron: "#f4f0e4" };
const OFFICER: PuppetLook = { skin: "#e8c0a0", hair: "#5a4030", outfit: "#5a6a7a" };
const LAMPLIGHTER: PuppetLook = { skin: "#e0b890", hair: "#4a3424", outfit: "#3a5a8a", hat: "#2a2a3a" };

// Everyone in the Archduke's car at `at` facing `heading`. `poses` overrides per seat; `hat` puts the plumed hat on.
const carCast = (at: [number, number], heading: number, poses: Partial<Record<SeatName, Partial<PuppetPose>>> = {}, lift = 0) => {
  const who: [SeatName, string, PuppetLook][] = [
    ["driver", "driver", DRIVER],
    ["governor", "governor", GOVERNOR],
    ["archduke", "archduke", ARCHDUKE],
    ["sophie", "sophie", SOPHIE],
  ];
  return who.map(([seat, id, look]) => {
    const s = seatAt(at, heading, seat, lift);
    return { id, look, at: s.at, pose: { expression: "neutral", sit: true, air: s.air, view: "front", ...poses[seat] } as PuppetPose } as PuppetPlacement;
  });
};
// The hat sits on the head of the card, which leans back from high cameras (cardTilt): follow it.
const hatSpot = (at: [number, number], heading: number, camera: CameraShot, lift = 0): { p: [number, number, number]; lean: number; yaw: number } => {
  const s = seatAt(at, heading, "archduke", lift);
  const h = s.headY + 0.17;
  const t = cardTilt(camera.position, s.at);
  const dx = camera.position[0] - s.at[0];
  const dz = camera.position[2] - s.at[1];
  const l = Math.hypot(dx, dz) || 1;
  const back = -h * Math.sin(t);
  return { p: [s.at[0] + (dx / l) * back, h * Math.cos(t), s.at[1] + (dz / l) * back], lean: -t, yaw: Math.atan2(dx, dz) };
};
const archHat = (at: [number, number], heading: number, camera: CameraShot, tilt = 0, lift = 0) => {
  const h = hatSpot(at, heading, camera, lift);
  return (
    <group position={h.p} rotation={[0, h.yaw, 0]}>
      <GeneralHat position={[0, 0, 0]} rotation={[h.lean, 0, tilt]} />
    </group>
  );
};

// ---------- the Archduke's car through the corner ----------

// s (metres along `route`) for the Archduke's car, from the frame since S7 began (758). It runs at 0.1 m/frame,
// enters the turn as the narrator says "follows", and brakes from frame 80 to stand still at STOP.
const V = 0.1;
const BRAKE = 80;
const BRAKE_LEN = 73;
const S80 = -6.7 + V * BRAKE;
const STOP = S80 + (V * BRAKE_LEN) / 2;
const archS = (t: number) => {
  if (t <= BRAKE) return -6.7 + V * t;
  const u = Math.min(BRAKE_LEN, t - BRAKE);
  return S80 + V * (u - (u * u) / (2 * BRAKE_LEN));
};
const STOPPED = route(STOP);

// ---------- 1. Hook (0-107): one push down Franz Joseph Street onto the stopped car and the young man by the deli ----------

const PRINCIP_AT: [number, number] = [-1.22, -3.1];

const S1: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, position: [0.6, 4.2, -11.0], target: [-0.35, 0.95, -3.2], fov: 42 },
      { at: 60, position: [0.1, 3.1, -8.2], target: [-0.5, 0.95, -3.2], fov: 42 },
      { at: 104, position: [-0.25, 2.55, -6.9], target: [-0.55, 0.95, -3.2], fov: 42 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    ...carCast(STOPPED.at, STOPPED.heading, {
      driver: { expression: "worried", lookX: -0.5 },
      governor: { expression: "shocked", lookX: 0.5 },
      archduke: { expression: f < 60 ? "neutral" : "worried", lookX: -0.8 },
      sophie: { expression: "neutral", lookX: -0.6 },
    }),
    { id: "princip", look: PRINCIP, at: PRINCIP_AT, pose: { view: "front", expression: f < 46 ? "thinking" : "determined", lookX: 0.8, reachR: [60, -360], reachL: [-70, -380], handR: "fist", handL: "open" } },
  ];
  const fg = frameSpot({ position: [0.6, 4.2, -11.0], target: [-0.35, 0.95, -3.2], fov: 42 }, ASPECT, 0.9, -0.85, 2.6);
  return (
    <>
      <Stage
        set={
          <SarajevoSet camera={camera} frame={f} mode="morning">
            <Tourer at={STOPPED.at} heading={STOPPED.heading} roll={STOP} />
            {archHat(STOPPED.at, STOPPED.heading, camera)}
          </SarajevoSet>
        }
        camera={camera}
        bg={CITY_BG.morning}
        blur={2.0}
        puppets={cast}
        light={cityLight("morning")}
        foreground={<InkCylinder radius={0.22} height={0.5} position={fg} color="#7a5a3a" ink={0.01} />}
      />
      <Headline f={f} text="ONE WRONG TURN" at={28} out={104} />
    </>
  );
};

// ---------- 2. The Appel Quay (107-307): the motorcade past the crowds, crane down to the open car ----------

const quayCar = (s: number) => ({ at: [1.6 - s, 0.2] as [number, number], heading: -Math.PI / 2 });
const QUAY_CROWD: { id: string; look: PuppetLook; at: [number, number]; wave: number }[] = [
  { id: "c1", look: CROWD_M, at: [3.1, -2.05], wave: 0 },
  { id: "c2", look: CROWD_W, at: [3.8, -2.2], wave: 1 },
  { id: "c3", look: CROWD_B, at: [4.6, -1.95], wave: 2 },
  { id: "c4", look: CROWD_O, at: [5.5, -2.15], wave: 0 },
  { id: "c5", look: CROWD_G, at: [6.3, -2.0], wave: 3 },
  { id: "c6", look: CROWD_M, at: [7.2, -2.2], wave: 1 },
];
const S2: React.FC = () => {
  const f = useShotFrame(); // 0..200
  const s = -7.6 + f * 0.026; // centre x from 9.2 to 4.0
  const car = quayCar(s);
  const camera = beatPath(
    [
      { at: 0, position: [5.4, 4.4, 6.6], target: [8.0, 0.9, -0.6], fov: 44 },
      { at: 96, position: [4.6, 2.8, 3.8], target: [6.0, 1.0, -0.4], fov: 42 },
      { at: 199, position: [2.3, 1.85, 1.9], target: [4.45, 1.05, 0.0], fov: 40 },
    ],
    f,
  );
  const lead = quayCar(s + 5.2);
  const cast: PuppetPlacement[] = [
    ...carCast(car.at, car.heading, {
      archduke: { expression: "happy", gesture: f > 40 ? "wave" : undefined, lookX: 0.5 },
      sophie: { expression: "happy", lookX: 0.6, headTilt: 5 },
      governor: { expression: "smug", lookX: -0.3 },
    }),
    ...QUAY_CROWD.map((c, i) => ({
      id: c.id,
      look: c.look,
      at: c.at,
      pose: { expression: (i % 2 ? "happy" : "excited") as PuppetPose["expression"], gesture: (c.wave === 1 || c.wave === 3) && f > 20 + i * 9 ? ("wave" as const) : c.wave === 2 ? ("cheer" as const) : undefined, lookX: 0.6 },
    })),
  ];
  const fg = frameSpot({ position: [5.4, 4.4, 6.6], target: [8.0, 0.9, -0.6], fov: 44 }, ASPECT, -0.9, -0.9, 3.2);
  return (
    <>
      <Stage
        set={
          <SarajevoSet camera={camera} frame={f + 200} mode="day">
            <Tourer at={car.at} heading={car.heading} roll={s} />
            {archHat(car.at, car.heading, camera)}
            <Tourer at={lead.at} heading={lead.heading} roll={s + 5.2} />
          </SarajevoSet>
        }
        camera={camera}
        bg={CITY_BG.day}
        blur={1.8}
        puppets={cast}
        light={cityLight("day")}
        foreground={<InkBox size={[0.7, 0.35, 0.5]} position={fg} color="#c8bca4" ink={0.012} />}
      />
      <Headline f={f} text={"SARAJEVO\n28 JUNE 1914"} at={18} out={196} />
    </>
  );
};

// ---------- 3. The bomb (307-465): thrown from the river wall, it bounces off the folded top, blows up under the next car ----------

const B = { throw: 38, land: 55, ground: 72, rest: 100, boom: 117 };
const bombXc = (t: number) => -6.6 + (B.boom - t) * 0.035 - Math.max(0, t - B.land) * 0.02; // the Archduke's car speeds up after the hit
const nextXc = (t: number) => -6.6 + (B.boom - t) * 0.035 + 4.5;
const BOMBER_AT: [number, number] = [-3.62, 1.42];
const arc = (a: [number, number, number], b: [number, number, number], p: number, h: number): [number, number, number] => [
  mix(a[0], b[0], p),
  mix(a[1], b[1], p) + 4 * h * p * (1 - p),
  mix(a[2], b[2], p),
];
const bombAt = (t: number): [number, number, number] | null => {
  const hand: [number, number, number] = [BOMBER_AT[0] + 0.12, 1.32, BOMBER_AT[1] - 0.1];
  const top: [number, number, number] = [bombXc(B.land) + 1.32, 1.2, 0.2];
  const ground: [number, number, number] = [top[0] + 1.45, 0.09, 0.5];
  const rest: [number, number, number] = [nextXc(B.rest) + 0.55, 0.09, 0.25];
  if (t < B.throw) return null;
  if (t < B.land) return arc(hand, top, (t - B.throw) / (B.land - B.throw), 0.75);
  if (t < B.ground) return arc(top, ground, (t - B.land) / (B.ground - B.land), 0.35);
  if (t < B.rest) return arc(ground, rest, Math.sin(((t - B.ground) / (B.rest - B.ground)) * (Math.PI / 2)), 0);
  if (t < B.boom) return rest;
  return null;
};
const S3: React.FC = () => {
  const f = useShotFrame(); // 0..158
  const camera = beatPath(
    [
      { at: 0, position: [-5.0, 2.3, 3.4], target: [-3.5, 0.8, 0.2], fov: 46 },
      { at: B.land, position: [-4.4, 2.3, 3.5], target: [-3.0, 0.8, 0.1], fov: 46 },
      { at: B.boom, position: [-1.6, 2.4, 3.5], target: [-1.3, 0.6, 0.1], fov: 46 },
      { at: 157, position: [-1.45, 2.45, 3.4], target: [-1.2, 0.6, 0.1], fov: 46 },
    ],
    f,
  );
  const xc = bombXc(f);
  const xn = nextXc(f);
  const car = { at: [xc, 0.2] as [number, number], heading: -Math.PI / 2 };
  const t = f - B.boom;
  const jolt = t >= 0 ? Math.max(0, Math.sin(Math.min(1, t / 9) * Math.PI)) * 0.2 * Math.exp(-t / 20) : 0;
  const next = { at: [xn, 0.2] as [number, number], heading: -Math.PI / 2 };
  const b = bombAt(f);
  const reacting = f > B.land;
  const afterBoom = t >= 0;
  const throwArm: [number, number] = f < B.throw - 10 ? [70, -420] : f < B.throw ? [-120, -820] : f < B.throw + 8 ? [260, -560] : [120, -380];
  const cast: PuppetPlacement[] = [
    ...carCast(car.at, car.heading, {
      archduke: { expression: reacting ? "shocked" : "happy", lookX: reacting ? 0.9 : 0.2, reachL: reacting && f < B.ground + 10 ? [-140, -760] : undefined, frontL: true },
      sophie: { expression: reacting ? "shocked" : "happy", lookX: 0.8 },
      driver: { expression: reacting ? "worried" : "neutral" },
      governor: { expression: reacting ? "shocked" : "neutral" },
    }),
    ...(f >= 90
      ? [
          { id: "officer1", look: OFFICER, at: [xn + 0.14, 0.47] as [number, number], pose: { sit: true, air: (0.62 + jolt - 0.34) / (1.3 / 1060), view: "front" as const, expression: afterBoom ? ("shocked" as const) : ("neutral" as const), lookX: 0.4 } },
          { id: "officer2", look: OFFICER, at: [xn + 0.76, -0.05] as [number, number], pose: { sit: true, air: (0.7 + jolt - 0.34) / (1.3 / 1060), view: "front" as const, expression: afterBoom ? ("shocked" as const) : ("neutral" as const), lookX: -0.3 } },
        ]
      : []),
    { id: "bomber", look: BOMBER, at: BOMBER_AT, pose: { view: "back", expression: f < B.throw ? "determined" : f < B.boom ? "worried" : "shocked", reachR: throwArm, handR: f < B.throw ? "fist" : "open", frontR: true, lookX: 0.6 } },
    { id: "crowd", look: CROWD_O, at: [-2.5, -2.15], pose: { view: "front", expression: f < 60 ? "happy" : "shocked", gesture: f > 64 && f < 110 ? "point" : undefined, lookX: -0.5, ...(afterBoom ? { crouch: 0.4 * Math.exp(-t / 30) } : {}) } },
    { id: "c7", look: CROWD_W, at: [-1.55, -2.2], pose: { view: "front", expression: afterBoom ? "shocked" : f > B.throw + 6 ? "worried" : "happy", lookX: 0.6, ...(afterBoom ? { crouch: 0.5 * Math.exp(-t / 30) } : {}) } },
  ];
  return (
    <Stage
      set={
        <SarajevoSet camera={camera} frame={f + 400} mode="morning">
          <Tourer at={car.at} heading={car.heading} roll={-xc} />
          {archHat(car.at, car.heading, camera, reacting && f < B.ground + 12 ? 0.25 : 0)}
          <Tourer at={next.at} heading={next.heading} roll={-xn} bump={jolt} pitch={jolt * 0.4} />
          {b && <Bomb position={b} frame={f} />}
          <Flash at={[nextXc(B.rest) + 0.55, 0.4, 0.25]} t={t} size={0.9} />
          <SmokeBurst at={[nextXc(B.rest) + 0.55, 0.1, 0.25]} t={t} size={1.3} count={16} seed={3} />
          <Burst kind="dust" at={[nextXc(B.rest) + 0.55, 0.02, 0.3]} frame={t} count={18} size={1.2} seed={4} />
        </SarajevoSet>
      }
      camera={camera}
      bg={CITY_BG.morning}
      blur={1.8}
      puppets={cast}
      light={cityLight("morning")}
    />
  );
};

// ---------- 4. The deli corner in the shade (465-599): Princip drifts to the corner ----------

const S4: React.FC = () => {
  const f = useShotFrame(); // 0..134
  const w1 = stroll(f, 0, 78, [-4.4, -2.05], [-1.85, -2.15]);
  const w2 = stroll(f, 80, 34, [-1.85, -2.15], PRINCIP_AT);
  const w = f < 80 ? w1 : w2;
  const camera = beatPath(
    [
      { at: 0, position: [-3.4, 1.45, 1.3], target: [-3.7, 1.0, -2.2], fov: 42 },
      { at: 72, position: [-1.5, 1.4, 1.0], target: [-2.0, 1.0, -2.3], fov: 42 },
      { at: 133, position: [0.05, 1.38, 0.2], target: [-1.25, 1.0, -3.0], fov: 41 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "princip", look: PRINCIP, at: w.at, pose: { ...faceChange([[0, "sad"], [70, "bored"], [112, "thinking"]], f), ...w.pose, ...(f >= 114 ? { view: "front" as const, lookX: 0.5, reachR: [70, -370] as [number, number], reachL: [-70, -370] as [number, number] } : {}) } },
  ];
  const fg = frameSpot({ position: [-3.4, 1.45, 1.3], target: [-3.7, 1.0, -2.2], fov: 42 }, ASPECT, -0.85, -0.9, 1.4);
  return (
    <Stage
      set={<SarajevoSet camera={camera} frame={f + 600} mode="shade" />}
      camera={camera}
      bg={CITY_BG.shade}
      blur={1.8}
      puppets={cast}
      light={cityLight("shade")}
      foreground={<InkBox size={[0.9, 0.62, 0.32]} position={[fg[0], 0.31, fg[2]]} color="#c8bca4" ink={0.012} />}
    />
  );
};

// ---------- 5. The Town Hall (599-669): the Archduke changes plans, finger on HOSPITAL ----------

const S5: React.FC = () => {
  const f = useShotFrame(); // 0..70
  const camera = beatPath(
    [
      { at: 0, position: [0.55, 1.35, 3.0], target: [0.05, 1.05, -0.6], fov: 40 },
      { at: 69, position: [0.25, 1.28, 2.25], target: [-0.05, 1.08, -0.7], fov: 40 },
    ],
    f,
  );
  const cast: PuppetPlacement[] = [
    { id: "archduke", look: ARCHDUKE, at: [-0.35, -0.55], pose: { ...faceChange([[0, "worried"], [16, "determined"]], f), view: "front", reachR: f > 12 ? [260, -760] : [120, -460], handR: f > 12 ? "point" : "open", lookX: 0.6 } },
    { id: "sophie", look: SOPHIE, at: [0.42, -0.45], pose: { expression: f < 40 ? "worried" : "happy", view: "front", lookX: -0.6, reachL: [-60, -470], reachR: [60, -470], handL: "open", handR: "open" } },
  ];
  const fg = frameSpot({ position: [0.55, 1.35, 3.0], target: [0.05, 1.05, -0.6], fov: 40 }, ASPECT, 0.7, -0.92, 1.0);
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#7a2a24" wall="#d8a048" wallPattern="tile" floorPattern="carpet" width={6} depth={4} stripe="#b8302a">
          {/* the city map on an easel, HOSPITAL pinned */}
          <InkBox size={[1.0, 0.75, 0.04]} position={[0.05, 1.45, -1.6]} color="#e8d8b0" ink={0.01} />
          {[[-0.3, 1.6], [0.2, 1.35], [0.35, 1.65], [-0.15, 1.25]].map(([x, y], i) => (
            <InkBox key={i} size={[0.3, 0.02, 0.005]} position={[x, y, -1.575]} rotation={[0, 0, i * 0.7]} color="#8a7a5a" ink={0} />
          ))}
          <Label text="HOSPITAL" position={[0.3, 1.52, -1.56]} width={0.42} appear={f - 18} />
          <mesh position={[0.3, 1.38, -1.555]}>
            <sphereGeometry args={[0.025, 10, 8]} />
            <meshToonMaterial color="#d8202a" />
          </mesh>
          <InkBox size={[0.05, 1.1, 0.05]} position={[-0.35, 0.55, -1.65]} color="#5a3a24" ink={0.006} />
          <InkBox size={[0.05, 1.1, 0.05]} position={[0.45, 0.55, -1.65]} color="#5a3a24" ink={0.006} />
          {/* Moorish arches on the back wall */}
          {[-2.2, 2.2].map((x) => (
            <group key={x} position={[x, 0, -1.94]}>
              <InkBox size={[0.9, 2.2, 0.04]} position={[0, 1.1, 0]} color="#c84a3a" ink={0.01} />
              <InkCylinder radius={0.45} height={0.04} position={[0, 2.2, 0]} rotation={[Math.PI / 2, 0, 0]} color="#c84a3a" ink={0.01} />
            </group>
          ))}
          <Lamp position={[1.6, 0, -1.2]} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
      blur={2.0}
      puppets={cast}
      foreground={<InkBox size={[0.5, 0.06, 0.3]} position={[fg[0], fg[1], fg[2]]} color="#7a4a24" ink={0.006} />}
    />
  );
};

// ---------- 6. The drivers waiting at the Town Hall (669-758): nobody tells them; one dozes under his newspaper ----------

const PARK = { at: [TOWNHALL.x - 0.8, -0.75] as [number, number], heading: -Math.PI / 2 };
const S6: React.FC = () => {
  const f = useShotFrame(); // 0..89
  const camera = beatPath(
    [
      { at: 0, position: [TOWNHALL.x - 1.9, 2.3, 3.9], target: [TOWNHALL.x - 1.15, 1.2, -1.3], fov: 42 },
      { at: 88, position: [TOWNHALL.x - 1.35, 1.85, 2.75], target: [TOWNHALL.x - 0.95, 1.1, -1.2], fov: 42 },
    ],
    f,
  );
  const d = seatAt(PARK.at, PARK.heading, "driver");
  const snore = 0.5 + 0.5 * Math.sin(f * 0.16 + Math.sin(f * 0.05) * 0.8);
  const cast: PuppetPlacement[] = [
    { id: "driver", look: DRIVER, at: d.at, pose: { sit: true, air: d.air, view: "front", expression: "neutral", sleep: true, headTilt: 14 + snore * 4, slump: 0.4 } },
    { id: "driver2", look: OFFICER, at: [TOWNHALL.x - 1.65, -2.15], pose: { view: "front", expression: f < 50 ? "bored" : "skeptical", lookX: 0.7, reachR: [80, -560], reachL: [-80, -560], handL: "open", handR: "open" } },
  ];
  return (
    <Stage
      set={
        <SarajevoSet camera={camera} frame={f + 800} mode="day">
          <Tourer at={PARK.at} heading={PARK.heading} />
          <Newspaper position={[d.at[0] + 0.02, d.headY - 0.36, d.at[1] + 0.2]} rotation={[-0.9, 0, 0]} flutter={snore} />
          <Newspaper position={[TOWNHALL.x - 1.65, 0.62, -1.95]} rotation={[0.2, 0, 0]} />
        </SarajevoSet>
      }
      camera={camera}
      bg={CITY_BG.day}
      blur={1.8}
      puppets={cast}
      light={cityLight("day")}
    />
  );
};

// ---------- 7. High over the Latin Bridge corner (758-876): the lead car turns, his driver follows; "Wrong way! Stop!" ----------

const leadS = (t: number) => -1.7 + V * t;
const SHOUT = 83;
const S7: React.FC = () => {
  const f = useShotFrame(); // 0..118
  const s = archS(f);
  const car = route(s);
  const lead = route(leadS(f));
  const camera = beatPath(
    [
      { at: 0, position: [4.2, 7.4, 7.6], target: [1.2, 0.2, -0.6], fov: 44 },
      { at: 63, position: [3.6, 5.6, 5.2], target: [0.5, 0.5, -1.4], fov: 44 },
      { at: 117, position: [3.0, 4.4, 2.6], target: [0.0, 0.8, -2.6], fov: 44 },
    ],
    f,
  );
  const shout = f >= SHOUT - 4;
  const cast = carCast(car.at, car.heading, {
    governor: shout ? { expression: "angry", gesture: "point" } : { expression: "neutral", lookX: 0.5 },
    driver: { expression: shout ? "shocked" : "neutral", lookX: shout ? 0.6 : 0 },
    archduke: { expression: shout ? "confused" : "neutral" },
    sophie: { expression: shout ? "worried" : "happy" },
  });
  return (
    <Stage
      set={
        <SarajevoSet camera={camera} frame={f + 900} mode="day">
          <Tourer at={car.at} heading={car.heading} roll={s} />
          {archHat(car.at, car.heading, camera)}
          <Tourer at={lead.at} heading={lead.heading} roll={leadS(f)} />
        </SarajevoSet>
      }
      camera={camera}
      bg={CITY_BG.day}
      blur={1.4}
      puppets={cast}
      light={cityLight("day")}
    />
  );
};

// ---------- 8. The side street (876-1048): the car brakes and stands still beside Princip; two shots; the hat on the cobbles ----------

const SHOT1 = 85;
const SHOT2 = 95;
const S8: React.FC = () => {
  const f = useShotFrame(); // 0..172
  const t7 = 118 + f; // continue the braking from S7
  const s = archS(t7);
  const car = route(s);
  const stopJolt = t7 >= BRAKE + BRAKE_LEN ? Math.sin(Math.min(1, (t7 - BRAKE - BRAKE_LEN) / 10) * Math.PI) * 0.04 * Math.exp(-(t7 - BRAKE - BRAKE_LEN) / 12) : 0;
  const camera = beatPath(
    [
      { at: 0, position: [-0.1, 2.9, -8.4], target: [-0.35, 0.9, -3.4], fov: 42 },
      { at: 70, position: [-0.45, 2.5, -7.0], target: [-0.7, 0.95, -3.3], fov: 42 },
      { at: SHOT1, position: [-0.6, 2.35, -6.5], target: [-0.8, 0.95, -3.25], fov: 42 },
      { at: 130, position: [-0.75, 2.05, -5.75], target: [-0.85, 0.75, -3.0], fov: 42 },
      { at: 171, position: [-0.8, 1.85, -5.35], target: [-0.88, 0.65, -2.95], fov: 42 },
    ],
    f,
  );
  const aim = f >= 76;
  const step = stroll(f, 44, 26, PRINCIP_AT, [-1.05, -3.22]);
  const hatFall = ramp(f, SHOT1 + 6, SHOT1 + 26);
  const h0 = hatSpot(car.at, car.heading, camera);
  const hatPos: [number, number, number] = [mix(h0.p[0], -1.3, hatFall), mix(h0.p[1], 0.24, hatFall) + 0.35 * Math.sin(hatFall * Math.PI), mix(h0.p[2], -2.6, hatFall)];
  const hit = f >= SHOT1;
  const cast: PuppetPlacement[] = [
        ...carCast(car.at, car.heading, {
          driver: { expression: f < 30 ? "worried" : "shocked", lookX: 0.4 },
          governor: { expression: hit ? "shocked" : "angry", lookX: -0.5 },
          archduke: hit ? { expression: "shocked", slump: 0.6 * ramp(f, SHOT1, SHOT1 + 14), headTilt: -10 * ramp(f, SHOT1, SHOT1 + 14) } : { expression: "worried", lookX: -0.7 },
          sophie: hit ? { expression: "shocked", slump: 0.5 * ramp(f, SHOT2, SHOT2 + 14), headTilt: 8 * ramp(f, SHOT2, SHOT2 + 14) } : { expression: "worried", lookX: -0.7 },
        }, stopJolt),
        {
          id: "princip",
          look: PRINCIP,
          at: f < 44 ? PRINCIP_AT : step.at,
          pose: {
            ...(f >= 44 && f < 70 ? step.pose : { view: "front" as const }),
            expression: f < 40 ? "shocked" : "determined",
            lookX: 0.9,
            ...(aim && f < SHOT2 + 20 ? { reachR: [300, -640] as [number, number], handR: "fist" as const, frontR: true, lean: 6 } : {}),
          },
        },
      ];
  const gun: [number, number, number] = [-0.86, 1.04, -3.1];
  return (
    <Stage
      set={
        <SarajevoSet camera={camera} frame={f + 1000} mode="cold">
          <Tourer at={car.at} heading={car.heading} roll={s} bump={stopJolt} pitch={stopJolt * 0.6} />
          {f < SHOT1 + 6 ? archHat(car.at, car.heading, camera, 0, stopJolt) : <GeneralHat position={hatPos} rotation={[Math.sin(hatFall * Math.PI) * 1.2, hatFall * 0.6, hatFall * 1.35]} />}
          <Flash at={gun} t={f - SHOT1} size={0.16} />
          <Flash at={gun} t={f - SHOT2} size={0.14} />
          <SmokeBurst at={gun} t={f - SHOT1} size={0.25} count={6} seed={11} />
          <SmokeBurst at={[gun[0] + 0.02, gun[1] + 0.02, gun[2]]} t={f - SHOT2} size={0.22} count={6} seed={17} />
          <Burst kind="dust" at={[-1.3, 0.1, -2.6]} frame={f - SHOT1 - 26} count={8} size={0.4} seed={9} />
        </SarajevoSet>
      }
      camera={camera}
      bg={CITY_BG.cold}
      blur={2.0}
      truth={0.15 + 0.6 * ramp(f, SHOT1, SHOT1 + 40)}
      puppets={cast}
      light={cityLight("cold")}
    />
  );
};

// ---------- 9. The pivot (1048-1241): the map room, labelled dominoes topple, the calendar turns to JULY ----------

const DOMINOES = [
  { label: "AUSTRIA", color: "#c8202a", at: [-0.05, 0.75], fall: [22, 34] },
  { label: "SERBIA", color: "#2a4aa8", at: [0.04, 0.33], fall: [90, 102] },
  { label: "RUSSIA", color: "#2a8a4a", at: [-0.04, -0.09], fall: [124, 136] },
  { label: "GERMANY", color: "#3a3a3a", at: [0.05, -0.51], fall: [150, 162] },
  { label: "FRANCE", color: "#2a6ad8", at: [-0.03, -0.93], fall: [176, 188] },
];
const TABLE_Y = 0.85;
const S9: React.FC = () => {
  const f = useShotFrame(); // 0..193
  const camera = beatPath(
    [
      { at: 0, position: [0.2, 3.35, 3.0], target: [0.18, TABLE_Y - 0.05, 0.35], fov: 42 },
      { at: 69, position: [0.2, 3.25, 2.75], target: [0.2, TABLE_Y - 0.05, 0.3], fov: 42 },
      { at: 192, position: [0.18, 3.1, 2.45], target: [0.18, TABLE_Y - 0.05, 0.25], fov: 42 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="cold" floor="#2a3040" wall="#3a4a6a" wallPattern="panel" floorPattern="wood" width={5} depth={4.2}>
          <MapTable position={[0, TABLE_Y, -0.05]} size={[1.5, 2.0]} />
          {DOMINOES.map((d, i) => (
            <Domino key={d.label} position={[d.at[0], TABLE_Y, d.at[1]]} label={d.label} color={d.color} fall={ease(f, d.fall[0], d.fall[1])} w={0.26} h={0.4} flat />
          ))}
          {/* a desk calendar standing on the table beside the row */}
          <group position={[0.45, TABLE_Y + 0.27, -0.25]} rotation={[-0.35, -0.15, 0]} scale={0.6}>
            <WallCalendar position={[0, 0, 0]} flip={ease(f, 66, 80)} />
            <InkBox size={[0.08, 0.7, 0.06]} position={[0, -0.05, -0.2]} rotation={[0.5, 0, 0]} color="#6a4a2e" ink={0.008} />
          </group>
          <Lamp position={[-1.2, 0, -1.2]} />
          <pointLight position={[0, 2.2, 0.4]} color="#b8c8ff" intensity={1.4} distance={5} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("cold")}
      blur={1.6}
      truth={0.35}
    />
  );
};

// ---------- 10. The crown hall (1241-1399): a wave of blocks, the counter toward twenty million, four crowns fall ----------

const CROWNS = [
  { label: "RUSSIA", x: -0.5, at: 121 },
  { label: "GERMANY", x: -0.167, at: 128 },
  { label: "AUSTRIA", x: 0.167, at: 135 },
  { label: "OTTOMANS", x: 0.5, at: 142 },
];
const S10: React.FC = () => {
  const f = useShotFrame(); // 0..158
  const camera = beatPath(
    [
      { at: 0, position: [-0.6, 0.75, 2.4], target: [-0.2, 0.25, 0.7], fov: 42 },
      { at: 61, position: [0.0, 1.7, 3.2], target: [0.0, 1.75, -1.9], fov: 42 },
      { at: 121, position: [0.0, 1.55, 3.6], target: [0.0, 1.0, -0.1], fov: 42 },
      { at: 157, position: [0.0, 1.5, 3.35], target: [0.0, 0.95, -0.1], fov: 42 },
    ],
    f,
  );
  return (
    <Stage
      set={
        <Room camera={camera} mood="dream" floor="#3a1420" wall="#6a1e34" wallPattern="wallpaper" floorPattern="carpet" width={5} depth={4}>
          {/* a wave of little blocks across the floor: most of Europe goes to war */}
          {Array.from({ length: 9 }, (_, i) => (
            <Domino key={i} position={[-1.3 + i * 0.32, 0, 0.75 + (i % 2) * 0.08]} label="" color={["#8a6a2a", "#2a3a8a", "#6a6a6a", "#d8a020", "#5a2a6a", "#2a6a4a", "#8a3a2a", "#3a5a8a", "#6a4a2a"][i]} w={0.2} h={0.32} fall={ease(f, 4 + i * 4.5, 12 + i * 4.5)} flat />
          ))}
          <Label text="ABOUT" position={[0, 2.22, -1.88]} width={0.6} bg="#2a1018" fg="#f0d890" border={false} appear={f - 58} />
          <Label text="20,000,000" position={[0, 1.9, -1.88]} width={1.3} bg="#1a0a10" fg="#ff6a5a" count={ease(f, 61, 106)} appear={f - 58} />
          {CROWNS.map((c, i) => (
            <group key={c.label}>
              <Pedestal position={[c.x, 0, -0.1]} />
              <Crown position={[c.x, 1.04, -0.1]} topple={ease(f, c.at, c.at + 14)} dir={i % 2 ? 1 : -1} color={["#e8b830", "#d8c050", "#e0a828", "#e8c040"][i]} />
            </group>
          ))}
          <pointLight position={[0, 2.4, 1.0]} color="#ff8aa0" intensity={1.6} distance={6} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dream")}
      blur={1.6}
    />
  );
};

// ---------- 11. What if (1399-1553): violet dream light, the car speeds straight past the corner; Princip's hat blows off ----------

const PASS = 80; // frame the Archduke's car passes Princip
const S11: React.FC = () => {
  const f = useShotFrame(); // 0..154
  const sp = 0.16;
  const xc = -1.9 + (PASS - f) * sp; // straight along the quay, no turn
  const lead = -1.9 + (PASS - 34 - f) * sp;
  const camera = beatPath(
    [
      { at: 0, position: [-0.6, 3.0, 4.0], target: [-1.6, 0.9, -1.6], fov: 42 },
      { at: 72, position: [-1.0, 1.7, 2.6], target: [-1.9, 1.0, -1.9], fov: 42 },
      { at: 153, position: [-1.55, 1.4, 1.5], target: [-2.05, 1.05, -2.1], fov: 41 },
    ],
    f,
  );
  const blow = f >= PASS + 2;
  const hp = ramp(f, PASS + 2, PASS + 46);
  const hat: [number, number, number] = [-1.95 - hp * 2.2, 1.48 + Math.sin(hp * Math.PI) * 0.7 - hp * 1.4 * hp, -2.1 + hp * 0.9];
  const cast: PuppetPlacement[] = [
    { id: "princip", look: blow ? PRINCIP_BARE : PRINCIP, at: [-1.95, -2.15], pose: { view: "front", ...faceChange([[0, "determined"], [PASS - 6, "shocked"], [PASS + 20, "confused"]], f), lookX: f < PASS ? 0.8 : -0.9, reachR: blow && f < PASS + 30 ? [90, -900] : undefined, frontR: true } },
    ...(Math.abs(xc + 1.9) < 4.5
      ? carCast([xc, 0.2], -Math.PI / 2, { archduke: { expression: "happy", gesture: "wave" }, sophie: { expression: "happy" }, governor: { expression: "smug" }, driver: { expression: "determined" } })
      : []),
  ];
  return (
    <>
      <Stage
        set={
          <SarajevoSet camera={camera} frame={f + 1400} mode="dream">
            <Tourer at={[xc, 0.2]} heading={-Math.PI / 2} roll={-xc} />
            {archHat([xc, 0.2], -Math.PI / 2, camera)}
            <Tourer at={[lead, 0.2]} heading={-Math.PI / 2} roll={-lead} />
            {blow && hp < 1 && <Hat position={hat} rotation={[hp * 5, hp * 3, hp * 4]} scale={0.8} />}
            {hp >= 1 && <Hat position={[-4.15, 0.08, -1.2]} rotation={[0.1, 0.4, 0]} scale={0.8} />}
            <Burst kind="dust" at={[-1.9, 0.02, 0.3]} frame={f - PASS} count={14} size={0.7} seed={21} />
          </SarajevoSet>
        }
        camera={camera}
        bg={CITY_BG.dream}
        blur={1.6}
        puppets={cast}
        light={cityLight("dream")}
      />
      <Headline f={f} text="WHAT IF?" at={14} out={70} />
    </>
  );
};

// ---------- 12. Dusk at the corner (1553-1766): the lamplighter lights the lamp; the tyre tracks curve into the side street ----------

const LIGHT_AT = 116;
const LAMP_X = 2.4;
const LAMP_Z = Q.kerb - 0.2;
const S12: React.FC = () => {
  const f = useShotFrame(); // 0..213
  const w = stroll(f, 0, 56, [4.3, -2.25], [2.85, -2.05]);
  const camera = beatPath(
    [
      { at: 0, position: [4.5, 1.5, 3.2], target: [3.3, 1.45, -2.0], fov: 46 },
      { at: LIGHT_AT, position: [3.9, 1.6, 3.0], target: [2.7, 1.6, -1.9], fov: 46 },
      { at: 212, position: [3.5, 3.5, 3.8], target: [1.9, 0.6, -1.4], fov: 46 },
    ],
    f,
  );
  const reach = ease(f, 60, LIGHT_AT - 4);
  const lit = ramp(f, LIGHT_AT, LIGHT_AT + 10);
  const handReach: [number, number] = [150, -1000 - reach * 120];
  const tip: [number, number, number] = [mix(2.6, LAMP_X + 0.05, reach), mix(1.9, 2.72, reach), mix(-1.9, LAMP_Z, reach)];
  const cast: PuppetPlacement[] = [
    { id: "lamplighter", look: LAMPLIGHTER, at: w.at, pose: { ...faceChange([[0, "neutral"], [LIGHT_AT + 4, "happy"]], f), ...w.pose, ...(f >= 56 ? { view: "front" as const, reachR: handReach, reachL: [60, -760] as [number, number], handR: "fist" as const, handL: "fist" as const, lookX: -0.6 } : {}) } },
  ];
  const hand = handWorld(w.at, handReach, camera);
  return (
    <Stage
      set={
        <SarajevoSet camera={camera} frame={f + 1600} mode="dusk" lampLit={lit}>
          {/* the wrong turn's tyre tracks in the dust, curving into Franz Joseph Street */}
          {Array.from({ length: 34 }, (_, i) => {
            const r = route(-3 + i * 0.22);
            return [-0.6, 0.6].map((o) => {
              const c = Math.cos(r.heading);
              const sn = Math.sin(r.heading);
              return <InkBox key={`${i}${o}`} size={[0.13, 0.006, 0.26]} position={[r.at[0] + o * c, 0.012, r.at[1] - o * sn]} rotation={[0, r.heading, 0]} color="#5a4630" ink={0} />;
            });
          })}
          <LampPole from={hand} to={tip} wick={f < LIGHT_AT + 20 ? 1 : 0} />
          <Burst kind="sparks" at={[LAMP_X, 2.78, LAMP_Z]} frame={f - LIGHT_AT} count={14} size={0.5} seed={31} />
          {lit > 0 && <pointLight position={[LAMP_X, 2.7, LAMP_Z + 0.3]} color="#ffb860" intensity={2.4 * lit} distance={5} />}
        </SarajevoSet>
      }
      camera={camera}
      bg={CITY_BG.dusk}
      blur={1.6}
      puppets={cast}
      light={{ ...cityLight("dusk"), points: lit > 0 ? [{ position: [LAMP_X, 2.7, LAMP_Z], color: "#ffb860", strength: 2.2 * lit, range: 3 }] : [] }}
    />
  );
};

// [from, to, shot, transition in]
const SHOTS: Shot[] = [
  [0, 107, S1, false],
  [107, 307, S2, "dip"],
  [307, 465, S3, "dip"],
  [465, 599, S4, "dip"],
  [599, 669, S5, "dip"],
  [669, 758, S6, "dip"],
  [758, 876, S7, "dip"],
  [876, 1048, S8, "dip"],
  [1048, 1241, S9, "dip"],
  [1241, 1399, S10, "dip"],
  [1399, 1553, S11, "dip"],
  [1553, TIMING.totalFrames, S12, "dip"],
];

// ---------- sound ----------

const SFX: Sfx[] = [
  // 1. the stopped car's engine ticking over by the river
  { at: 0, src: sfx("engine"), volume: 0.08, until: 107 },
  { at: 0, src: sfx("river"), volume: 0.06, until: 107 },
  // 2. the crowd on the quay, the motorcade's engines
  { at: 107, src: sfx("crowd"), volume: 0.12, until: 307 },
  { at: 107, src: sfx("engine"), volume: 0.1, until: 307 },
  // 3. the bomb: thrown, it thumps on the folded top, clatters onto the road, rolls, blows up
  { at: 307, src: sfx("crowd"), volume: 0.035, until: 465 },
  { at: 307, src: sfx("engine"), volume: 0.045, until: 465 },
  { at: 307 + B.throw, src: sfx("whoosh"), volume: 0.2, space: "outdoor" },
  ...foleyCues("thud", [307 + B.land], 0.55, { space: "outdoor" }),
  { at: 307 + B.ground, src: sfx("plop"), volume: 0.5, space: "outdoor" },
  ...foleyCues("scrape", [307 + B.ground + 4], 0.25, { space: "outdoor" }),
  { at: 307 + B.boom, src: sfx("boom"), volume: 0.36, space: "outdoor", hit: 0.6 },
  // 4. the shaded corner: a breeze
  { at: 465, src: sfx("wind"), volume: 0.08, until: 599 },
  // 5. the Town Hall: the map pinned
  { at: 599 + 18, src: sfx("pop"), volume: 0.2, space: "room" },
  { at: 599 + 6, src: sfx("paper"), volume: 0.5, space: "room" },
  // 6. the driver snores under his newspaper
  ...foleyCues("snore", [686, 703, 755], 0.6, { space: "outdoor" }),
  // 7. engines through the turn, a bulb horn from the lead car
  { at: 758, src: sfx("engine"), volume: 0.12, until: 876 },
  { at: 758 + 30, src: sfx("honk"), volume: 0.5, space: "outdoor" },
  // 8. brakes, the gears grind for reverse, two shots, the hat on the cobbles
  { at: 876, src: sfx("engine"), volume: 0.1, until: 950 },
  { at: 876 + 6, src: sfx("skid"), volume: 0.22, space: "outdoor" },
  ...foleyCues("scrape", [876 + 22], 0.3, { space: "outdoor" }),
  ...foleyCues("gunshot", [876 + SHOT1], 1.0, { space: "outdoor", hit: 0.3 }),
  ...foleyCues("gunshot-2", [876 + SHOT2], 0.95, { space: "outdoor", hit: 0.25 }),
  ...foleyCues("thud", [876 + SHOT1 + 26], 0.62, { space: "outdoor" }),
  // 9. the pivot: sting, the dominoes, the calendar page
  { at: 1048, src: sfx("sting"), volume: 0.4 },
  ...foleyCues("thud", DOMINOES.map((d) => 1048 + d.fall[1]), 0.75, { space: "room" }),
  { at: 1048 + 68, src: sfx("paper"), volume: 0.55, space: "room" },
  // 10. a wave of small blocks, the counter, the crowns
  ...foleyCues("thud", [1241 + 12, 1241 + 21, 1241 + 30, 1241 + 39, 1241 + 48], 0.9, { space: "room" }),
  { at: 1241 + 61, src: sfx("reel-spin"), volume: 0.12, until: 1241 + 106 },
  { at: 1241 + 106, src: sfx("credit-blip"), volume: 0.5, space: "room" },
  ...foleyCues("thud", [1241 + 121 + 12, 1241 + 128 + 12, 1241 + 142 + 12], 0.32, { space: "hall" }).map((c, i) => (i === 0 ? { ...c, volume: c.volume * 2.9 } : c)),
  { at: 1241 + 135 + 12, src: sfx("clink"), volume: 0.3, space: "hall" },
  // 11. the car rushes past, the hat goes
  { at: 1399 + 40, src: sfx("engine"), volume: 0.14, until: 1399 + 110 },
  { at: 1399 + PASS - 8, src: sfx("whoosh"), volume: 0.45, space: "outdoor" },
  { at: 1399 + 20, src: sfx("wind"), volume: 0.08, until: 1553 },
  // 12. dusk: crickets, the lamp catches
  { at: 1553, src: sfx("crickets"), volume: 0.08, until: 1755 },
  { at: 1553 + LIGHT_AT, src: sfx("hiss"), volume: 0.3, space: "outdoor" },
];

const MUSIC: MusicCue[] = [
  { src: "music/tension.wav", from: 0, to: 465, volume: 0.22 },
  { src: "music/mystery.wav", from: 465, to: 1048, volume: 0.26 },
  { src: "music/tension.wav", from: 1048, to: 1399, volume: 0.24 },
  { src: "music/lounge.wav", from: 1399, to: 1553, volume: 0.2 },
  { src: "music/mystery.wav", from: 1553, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;
