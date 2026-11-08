import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { LookContext } from "../../engine/Video";
import { Campfire, CameraShot, firePoint, Foliage, frameSpot, handWorld, moveChange, PuppetLight, PuppetPlacement, Room, Shot, ShotList, Stage, useShotFrame, Vec3 } from "../../engine";
import { BJORN, FELIX_KIT } from "./cast";
import { Shield, Spear } from "./props";
import { FarmTestSet, GATE_GRIP, GateState, morningLight, reachTo } from "./sets";

// First interaction and light tests for viking-vs-roman (16:9). They carry the production's look (puppets lit by the
// set, post chain on), so a plain `npx remotion still src/index.ts VikingRomanGate out.png` matches.
export const VR_LOOK = { lighting: true, post: true };
const Look: React.FC<{ children: React.ReactNode }> = ({ children }) => <LookContext.Provider value={VR_LOOK}>{children}</LookContext.Provider>;

const ramp = (f: number, a: number, b: number, ease = Easing.inOut(Easing.cubic)) => interpolate(f, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

// ---------- same frame, same light ----------

const BJ_AT: [number, number] = [-0.62, 0.25];
const FX_AT: [number, number] = [0.62, 0.25];
const FIRE: Vec3 = [0, 0, 0.95];

const together = (evening: boolean): React.FC => () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [0.15 + f * 0.002, 1.0, 3.7], target: [0, 0.72, 0.2], fov: 32 };
  // Felix's shield on his shield arm (screen right), spear upright in the other hand.
  const shieldReach: [number, number] = [210, -430];
  const spearReach: [number, number] = [-215, -480];
  const sh = handWorld(FX_AT, shieldReach, camera);
  const sp = handWorld(FX_AT, spearReach, camera);
  const puppets: PuppetPlacement[] = [
    { id: "bjorn", look: BJORN, at: BJ_AT, pose: { expression: evening ? "happy" : "smug", gesture: evening ? undefined : "handsOnHips", lookX: 0.4 } },
    { id: "felix", look: FELIX_KIT, at: FX_AT, pose: { expression: evening ? "happy" : "determined", reachR: shieldReach, reachL: spearReach, handR: "fist", handL: "fist", lookX: -0.4 } },
  ];
  const light: PuppetLight | undefined = evening
    ? { tint: "#ffe6cc", shadow: 0.22, points: [{ ...firePoint(FIRE, f), range: 1.6 }] }
    : { tint: "#f6f4ef", shadow: 0.14, distant: [{ direction: [-0.55, 0.55, 0.65], color: "#fff6e6", strength: 1.2 }] };
  return (
    <Stage
      bg={evening ? "#2a2018" : "#e8e0d0"}
      camera={camera}
      set={
        <Room camera={camera} mood={evening ? "warm" : "daylight"} floor={evening ? "#6a5644" : "#bfae90"} wall={evening ? "#4a3a30" : "#ddd2bc"} floorPattern="plain" wallPattern="plaster" width={10} depth={6}>
          {evening && <Campfire position={FIRE} frame={f} />}
          <Shield position={[sh[0] + 0.02, sh[1] + 0.06, sh[2] + 0.07]} rotation={[0, -0.12, 0]} />
          <Spear base={[sp[0] - 0.01, 0.01, sp[2] + 0.04]} tip={[sp[0] + 0.01, 1.62, sp[2] + 0.04]} />
        </Room>
      }
      puppets={puppets}
      light={light}
      energy={0}
      blur={2}
    />
  );
};

const LIT_SHOTS: Shot[] = [
  [0, 1, together(false), false],
  [1, 2, together(true), false],
];
export const VikingRomanLit: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Look><ShotList shots={LIT_SHOTS} /></Look>
  </AbsoluteFill>
);

// ---------- Bjorn and the gate ----------
// 0-24 walks the last step and puts his hand on the top rail · 24-42 tests it (the gate rattles) · 44-58 "Easy."
// chin up · 60-68 the shove · 66-84 the whole gate drops sideways, bounce · 86-150 hand still in the air, shocked,
// then the eyes slide: who saw that?

export const GATE_FRAMES = 150;
const BJ_GATE_AT: [number, number] = [GATE_GRIP[0] + 0.4, 0.1];

const gateAt = (f: number): GateState => {
  const test = f > 24 && f < 44 ? Math.sin((f - 24) * 0.9) * (1 - (f - 24) / 20) : 0;
  const drop = ramp(f, 64, 82, Easing.in(Easing.quad));
  const bounce = f > 82 ? Math.abs(Math.sin((f - 82) * 0.35)) * Math.exp(-(f - 82) * 0.12) * 0.08 : 0;
  return { sag: 1 + ramp(f, 58, 64) * 0.4, wobble: test, fall: drop - bounce };
};

const GateShot: React.FC = () => {
  const f = useShotFrame();
  // Low, long-lens and always drifting: a slow push in to the shove, a small lift as the gate drops, then easing back
  // to take in the yard while he looks round.
  const camera: CameraShot = {
    position: [1.7 - ramp(f, 0, GATE_FRAMES) * 0.6 + ramp(f, 70, 90) * 0.1, 0.82 + ramp(f, 64, 84) * 0.08, 3.9 - ramp(f, 0, 60) * 0.3 + ramp(f, 86, 145) * 0.5],
    target: [0.25 - ramp(f, 60, 90) * 0.25, 0.7, -0.4],
    fov: 30,
  };
  // the framing plant is placed from the shot's last camera, so it sits in the corner at the end and the push-in starts with it off to the left
  const first: CameraShot = { position: [1.1, 0.9, 4.1], target: [0.0, 0.7, -0.4], fov: 30 };
  const g = gateAt(f);
  // The hand rests on the rail end and moves with it while he tests it; on the shove it pushes in, then stays put.
  const shove = ramp(f, 58, 66, Easing.out(Easing.cubic));
  const grip: Vec3 = [GATE_GRIP[0] - shove * 0.1, GATE_GRIP[1] - (g.wobble ?? 0) * 0.02 - ramp(f, 58, 64) * 0.03, GATE_GRIP[2]];
  const target = reachTo(BJ_GATE_AT, grip, camera);
  const rest: [number, number] = [-140, -300];
  const reachIn = ramp(f, 8, 22);
  const reach: [number, number] = [rest[0] + (target[0] - rest[0]) * reachIn, rest[1] + (target[1] - rest[1]) * reachIn];
  const move = moveChange(
    [
      [0, "smug"],
      [44, "determined"],
      [66, "shocked"],
      [100, "awkward"],
    ],
    f,
    10,
  );
  const look = f < 100 ? -0.5 : interpolate(f, [100, 116, 128, 142], [-0.5, 0.95, 0.95, -0.95], { extrapolateRight: "clamp" });
  const puppets: PuppetPlacement[] = [
    {
      id: "bjorn",
      look: BJORN,
      at: BJ_GATE_AT,
      pose: {
        ...move,
        reachL: reach,
        handL: f > 66 ? "open" : "fist",
        armR: f > 44 && f < 60 ? [12, 10] : undefined,
        lean: -6 * shove + 3 * ramp(f, 44, 52) * (1 - shove),
        headTilt: f > 44 && f < 60 ? -7 : 0,
        mouthOpen: f > 46 && f < 56 ? 0.6 * Math.sin(((f - 46) / 10) * Math.PI) : 0,
        lookX: look,
        view: "front",
      },
    },
  ];
  // a clump of meadow plants in the bottom-left corner, close to the lens, for depth
  const fg = <Foliage position={frameSpot(first, 16 / 9, -1.0, -0.9, 1.1)} size={0.26} color="#5f7a3a" seed={7} />;
  return <Stage bg="#c6dbe8" camera={camera} set={<FarmTestSet camera={camera} frame={f} gate={g} />} puppets={puppets} light={morningLight()} energy={0} blur={3} foreground={fg} />;
};

// The three states of the gate the story needs, one per frame: loose (morning), fallen (after the shove), mended
// (the new pale strut and brace; Bjorn claps the dust off his hands and nothing breaks).
const statesShot = (i: 0 | 1 | 2): React.FC => () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [1.0, 0.85, 4.2], target: [0.0, 0.7, -0.5], fov: 32 };
  const gate: GateState = i === 0 ? { sag: 1 } : i === 1 ? { fall: 1 } : { fixed: true };
  const pose: PuppetPlacement["pose"] =
    i === 0 ? { expression: "smug", gesture: "handsOnHips" } : i === 1 ? { expression: "awkward", lookX: 0.9 } : { expression: "happy", gesture: "clap" };
  return (
    <Stage
      bg="#c6dbe8"
      camera={camera}
      set={<FarmTestSet camera={camera} frame={f + 40 * i} gate={gate} />}
      puppets={[{ id: "bjorn", look: BJORN, at: BJ_GATE_AT, pose }]}
      light={morningLight()}
      energy={0}
      blur={2}
    />
  );
};

const GATE_SHOTS: Shot[] = [[0, GATE_FRAMES, GateShot, false]];
export const VikingRomanGate: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Look><ShotList shots={GATE_SHOTS} /></Look>
  </AbsoluteFill>
);
const STATE_SHOTS: Shot[] = [
  [0, 1, statesShot(0), false],
  [1, 2, statesShot(1), false],
  [2, 3, statesShot(2), false],
];
export const VikingRomanGateStates: React.FC = () => (
  <AbsoluteFill style={{ background: "#000" }}>
    <Look><ShotList shots={STATE_SHOTS} /></Look>
  </AbsoluteFill>
);
