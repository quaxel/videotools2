import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { crawlTo, jump, lieDown, ramp, sitDown, standUp, stroll } from "../engine/anim";
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
