import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { livenPose } from "../engine/liven";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";
import { drinkFrom, hammerSwing, pianoPlay, steer } from "../puppet/tools";

// Every tool motion in puppet/tools.ts, front view on the left and profile on the right, with flat stand-in props
// drawn at the points the helpers return, so you can check that the hands stay on the tool and keep working.

export const TOOL_TOUR_FRAMES = 120;
const LOOK: PuppetLook = { skin: "#e9b48a", hair: "#4a2e1e", outfit: "#3d7fc4", pattern: "#bfe0ff" };
const INK = "#1b1b1f";

type Cell = { label: string; pose: PuppetPose; props?: React.ReactNode; under?: React.ReactNode };

const hammerProp = (grip: [number, number], roll: number) => (
  <g transform={`translate(${grip[0]} ${grip[1]}) rotate(${(-roll * 180) / Math.PI})`} stroke={INK} strokeWidth={8} strokeLinejoin="round">
    <rect x={-9} y={-277} width={18} height={290} fill="#8a5a2a" />
    <rect x={-50} y={-300} width={100} height={46} rx={6} fill="#4a4a52" />
  </g>
);
const anvil = (x: number, y: number) => <path d={`M ${x - 110} ${y} L ${x + 110} ${y} L ${x + 70} ${y + 50} L ${x + 50} ${y + 200} L ${x - 50} ${y + 200} L ${x - 70} ${y + 50} Z`} fill="#3a3a42" stroke={INK} strokeWidth={8} />;
const keyboard = (x: number, y: number, w: number) => (
  <g stroke={INK} strokeWidth={6}>
    <rect x={x - w / 2} y={y} width={w} height={40} fill="#fafafa" />
    {Array.from({ length: Math.floor(w / 34) }, (_, i) => (
      <rect key={i} x={x - w / 2 + 22 + i * 34} y={y} width={16} height={24} fill={INK} />
    ))}
    <rect x={x - w / 2 - 10} y={y + 40} width={w + 20} height={300} fill="#5a3422" />
  </g>
);
const wheel = (x: number, y: number, r: number, flat: number, a: number) => (
  <g transform={`translate(${x} ${y}) scale(1 ${flat}) rotate(${(-a * 180) / Math.PI})`} stroke={INK} strokeWidth={9} fill="none">
    <circle r={r} strokeWidth={22} stroke="#3a2a1e" />
    {[0, 120, 240].map((d) => (
      <line key={d} x1={0} y1={0} x2={0} y2={-r} transform={`rotate(${d})`} strokeWidth={12} stroke="#2a2018" />
    ))}
    <circle r={22} fill="#d8a84a" />
  </g>
);

export const ToolTour: React.FC = () => {
  const f = useCurrentFrame();
  const sit = { sit: true };
  const hF = hammerSwing(f, { blows: [20, 44, 68, 92], strike: [-260, -330], hand: "R", handle: 277 });
  const hS = hammerSwing(f, { blows: [20, 44, 68, 92], strike: [-420, -380], hand: "R", handle: 277, view: "side", facing: -1, other: [-330, -400] });
  const sF = steer(f, { wheel: [0, -470], r: 122, flat: 0.65, turn: 0.5 * Math.sin(f / 30) });
  const sS = steer(f, { wheel: [230, -620], r: 122, view: "side", facing: 1, turn: 0.5 * Math.sin(f / 30) });
  const dF = drinkFrom(f, { start: 10, sip: 60 });
  const dS = drinkFrom(f, { start: 10, sip: 60, view: "side", facing: 1 });
  const cells: Cell[] = [
    { label: "piano front", pose: { expression: "happy", ...sit, ...pianoPlay(f, { keys: [0, -430] }) }, props: keyboard(0, -420, 520) },
    { label: "piano side", pose: { expression: "happy", ...sit, view: "side", facing: -1, ...pianoPlay(f, { keys: [-230, -440], view: "side", facing: -1 }) }, under: keyboard(-330, -430, 200) },
    { label: "hammer front", pose: { expression: "determined", ...hF.pose }, under: anvil(-260, -330), props: hammerProp(hF.grip, hF.roll) },
    { label: "hammer side", pose: { expression: "determined", view: "side", facing: -1, ...hS.pose }, under: anvil(-420, -380), props: hammerProp(hS.grip, hS.roll) },
    { label: "drive front", pose: { expression: "happy", ...sit, ...sF.pose }, props: wheel(0, -470, 122, 0.65, sF.wheelAngle) },
    { label: "drive side", pose: { expression: "happy", ...sit, view: "side", facing: 1, ...sS.pose }, props: wheel(230, -620, 122, 0.25, sS.wheelAngle) },
    { label: "drink front", pose: { expression: "happy", ...dF.pose } },
    { label: "drink side", pose: { expression: "happy", view: "side", facing: 1, ...dS.pose } },
  ];
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        {cells.map((c, i) => {
          const id = `tool-${i}`;
          const { pose } = livenPose(c.pose, [0, 0], id, f, 1);
          const x = (i % 2) * 540;
          const y = Math.floor(i / 2) * 480;
          return (
            <g key={c.label}>
              <svg x={x} y={y} width={540} height={440} viewBox="-560 -1140 1120 1180">
                {c.under}
                <Puppet look={LOOK} pose={pose} id={id} />
                {c.props}
              </svg>
              <text x={x + 270} y={y + 468} textAnchor="middle" fontFamily="Helvetica" fontSize={28} fill="#222">
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};
