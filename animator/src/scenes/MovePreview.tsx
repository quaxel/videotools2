import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { crawlTo, jump, lieDown, ramp, sitDown, standUp, stroll } from "../engine/anim";
import { settle, smooth } from "../engine/motion";
import { livenPose } from "../engine/liven";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";

// One puppet running through the whole-body moves: walk in, jump, sit down on a stool and get up, bend to pick
// something up, crawl across, lie down and fall asleep. 2D only, for checking the moves.

const LOOK: PuppetLook = { skin: "#e9b48a", hair: "#b5562a", outfit: "#e8b923", pattern: "#fff6b0", long: true };
export const MOVE_TOUR_FRAMES = 470;

// [start, label]
const STEPS: [number, string][] = [
  [0, "walk"],
  [72, "jump"],
  [122, "sitDown"],
  [172, "standUp"],
  [215, "bend"],
  [265, "crawlTo"],
  [345, "lieDown + sleep"],
];

export const MoveTour: React.FC = () => {
  const f = useCurrentFrame();
  // Puppet x on the floor in puppet units (the stage below is 2600 units wide).
  let x = 0;
  let pose: PuppetPose = { expression: "neutral" };
  if (f < 72) {
    // stroll works in metres on the floor; 1060 units = 1.3 m.
    const s = stroll(f, 0, 56, [(-900 * 1.3) / 1060, 0], [0, 0]);
    x = (s.at[0] * 1060) / 1.3;
    pose = { expression: "happy", ...s.pose };
  } else if (f < 122) {
    pose = { expression: f < 74 ? "happy" : "excited", ...jump(f, 74) };
  } else if (f < 215) {
    pose = { expression: f < 140 ? "neutral" : "happy", ...(f < 172 ? sitDown(f, 124) : standUp(f, 174)) };
  } else if (f < 265) {
    const b = Math.sin(ramp(f, 218, 258) * Math.PI);
    pose = { expression: "thinking", view: "side", facing: 1, bend: b * 0.9, armR: [10 + b * 40, 10] };
  } else if (f < 345) {
    const c = crawlTo(f, 268, 70, [0, 0], [700, 0]);
    x = c.at[0];
    pose = { expression: "determined", ...c.pose };
  } else {
    x = 700;
    pose = { expression: "bored", ...lieDown(f, 348, 22, true) };
  }
  const { pose: live } = livenPose(pose, [0, 0], "mover", f, 1);
  const label = [...STEPS].reverse().find(([s]) => f >= s)![1];
  const stool = f >= 112 && f < 212;
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <svg x={0} y={420} width={1080} height={1100} viewBox="-1300 -1500 2600 1640">
          <rect x={-1300} y={0} width={2600} height={140} fill="#e9d6b0" />
          {stool && (
            // A stool at hip height (seats are built to HIP_HEIGHT) behind the puppet.
            <g stroke="#161212" strokeWidth={12}>
              <rect x={-120} y={-300} width={240} height={40} rx={14} fill="#c47a3a" />
              <line x1={-90} y1={-262} x2={-110} y2={0} />
              <line x1={90} y1={-262} x2={110} y2={0} />
            </g>
          )}
          <g transform={`translate(${x} 0)`}>
            <Puppet look={LOOK} pose={live} id="mover" />
          </g>
        </svg>
        <text x={540} y={1760} textAnchor="middle" fontFamily="Helvetica" fontWeight={700} fontSize={70} fill="#222">
          {label}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// The perspective floor the walk-toward previews share: camera 1.2 m up, looking level, horizon at y = 640.
const F = 1100;
const CAM_H = 1.2;
const HORIZON = 640;
const TowardStage: React.FC<{ pose: PuppetPose; depth: number; x?: number; id: string }> = ({ pose, depth, x = 0, id }) => {
  const groundY = HORIZON + (F * CAM_H) / depth;
  const scale = (F * 1.3) / depth / 1060;
  const sx = 540 + (F * x) / depth;
  const lines = [-3, -2, -1, 0, 1, 2, 3];
  const rows = Array.from({ length: 24 }, (_, i) => 1 + i * 0.6);
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <rect x={0} y={HORIZON} width={1080} height={1920 - HORIZON} fill="#eadbb8" />
        {lines.map((l) => (
          <line key={l} x1={540 + (l * F) / 60} y1={HORIZON} x2={540 + l * F * 1.2} y2={HORIZON + (F * CAM_H) / 0.5} stroke="#d4bf94" strokeWidth={3} />
        ))}
        {rows.map((z) => (
          <line key={z} x1={0} y1={HORIZON + (F * CAM_H) / z} x2={1080} y2={HORIZON + (F * CAM_H) / z} stroke="#d4bf94" strokeWidth={2} />
        ))}
        <ellipse cx={sx} cy={groundY} rx={260 * scale} ry={60 * scale} fill="#000" opacity={0.18} />
        <g transform={`translate(${sx} ${groundY}) scale(${scale})`}>
          <Puppet look={LOOK} pose={pose} id={id} />
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// A puppet walking from far away straight toward the camera, in simple perspective (front view the whole way).
export const WALK_TOWARD_FRAMES = 170;
export const WalkToward: React.FC = () => {
  const f = useCurrentFrame();
  const s = stroll(f, 12, 120, [0, 9], [0, 1.8]);
  const { pose } = livenPose({ expression: "happy", view: "front", ...s.pose }, [0, 0], "toward", f, 1);
  return <TowardStage pose={pose} depth={s.at[1]} id="toward" />;
};

// The same walk, unhappy and worn out: slow and heavy, feet dragging, weaving a little off the line, a stumble
// halfway, and a long sigh once it stops.
export const SAD_WALK_FRAMES = 330;
export const SadWalk: React.FC = () => {
  const f = useCurrentFrame();
  const s = stroll(f, 12, 230, [0, 9], [0, 2.3]);
  const depth = s.at[1];
  // Drifting off the straight line and back.
  const x = Math.sin((9 - depth) * 1.1) * 0.22;
  // The stumble: a toe catches, the body pitches and the arms jerk out, then it rights itself (squash, settle).
  const st = f - 118;
  const trip = st >= 0 && st < 26 ? Math.max(0, settle(st - 3, 1.6, 0.5)) * (st < 3 ? st / 3 : 1) : 0;
  const stumble: Partial<PuppetPose> =
    trip > 0.02 ? { crouch: 0.35 * trip, lean: 4 * trip, headTilt: 6 * trip, armL: [12 + 50 * trip, 10 + 30 * trip], armR: [12 + 35 * trip, 10 + 40 * trip], squash: 0.12 * trip, blink: st < 6 } : {};
  // The sigh after stopping: shoulders lift on the breath in, then sink lower than before and the head drops.
  const sg = f - 262;
  const sigh: Partial<PuppetPose> =
    sg >= 0 ? { slump: 0.9 - 0.5 * Math.sin(Math.min(1, sg / 18) * Math.PI) * (sg < 18 ? 1 : 0) + (sg >= 18 ? 0.3 * smooth((sg - 18) / 24) : 0), headTilt: sg >= 18 ? -9 * smooth((sg - 18) / 24) : 0, blink: sg > 20 && sg < 34 } : {};
  const { pose } = livenPose({ expression: "sad", view: "front", ...s.pose, ...stumble, ...sigh }, [0, 0], "sadwalk", f, 1);
  return <TowardStage pose={pose} depth={depth} x={x} id="sadwalk" />;
};
