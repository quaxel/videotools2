import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { Expression, Puppet, PuppetLook, PuppetPose } from "../../puppet/Puppet";
import { ASTRID, BJORN, BJORN_COLD, DARO, FELIX, FELIX_KIT, LIV, OFFICER, PALETTE } from "./cast";

// 16:9 model sheets for viking-vs-roman, one per frame (composition `VikingRomanSheet`):
//   0  turnaround: Bjorn and Felix at the same scale, front / side / back, plus the cold-weather and drill kits
//   1  expressions: eight faces each, from the design doc's acting notes
//   2  the whole cast in one line-up, at the same scale

const W = 1920;
const H = 1080;
const BG = "#efe8da";
const INK = "#2b2722";
const FONT = "Helvetica, Arial, sans-serif";

// One puppet drawn in a box; the puppet is 1300 units tall with its feet at y = 0.
const Fig: React.FC<{ look: PuppetLook; pose?: Partial<PuppetPose>; x: number; y: number; h: number; id: string }> = ({ look, pose, x, y, h, id }) => {
  const w = h * (880 / 1360);
  return (
    <svg x={x - w / 2} y={y} width={w} height={h} viewBox="-440 -1290 880 1360">
      <ellipse cx={0} cy={8} rx={190} ry={26} fill="#000" opacity={0.12} />
      <Puppet look={look} pose={{ expression: "neutral", ...pose } as PuppetPose} id={id} />
    </svg>
  );
};

const Caption: React.FC<{ x: number; y: number; size?: number; weight?: number; color?: string; anchor?: "start" | "middle" | "end"; children: React.ReactNode }> = ({
  x,
  y,
  size = 22,
  weight = 600,
  color = INK,
  anchor = "middle",
  children,
}) => (
  <text x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontWeight={weight} fontSize={size} fill={color}>
    {children}
  </text>
);

const Swatches: React.FC<{ items: readonly (readonly [string, string])[]; x: number; y: number }> = ({ items, x, y }) => (
  <g>
    {items.map(([name, hex], i) => (
      <g key={name} transform={`translate(${x + i * 118} ${y})`}>
        <rect width={104} height={44} rx={8} fill={hex} stroke={INK} strokeWidth={2} />
        <Caption x={52} y={66} size={15}>{name}</Caption>
        <Caption x={52} y={86} size={14} weight={400} color="#6a6258">{hex}</Caption>
      </g>
    ))}
  </g>
);

const Header: React.FC<{ x: number; name: string; sub: string; tint: string }> = ({ x, name, sub, tint }) => (
  <g>
    <rect x={x} y={28} width={900} height={64} rx={12} fill={tint} />
    <Caption x={x + 28} y={73} size={38} weight={800} color="#fbf6ec" anchor="start">{name}</Caption>
    <Caption x={x + 872} y={70} size={22} weight={500} color="#fbf6ec" anchor="end">{sub}</Caption>
  </g>
);

const VIEWS: [string, Partial<PuppetPose>][] = [
  ["front", { view: "front" }],
  ["side", { view: "side", facing: 1 }],
  ["back", { view: "back" }],
];

const Turnaround: React.FC = () => {
  const figH = 640;
  const top = 150;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
      <Header x={40} name="BJORN" sub="c. AD 900 · farm in Denmark · ~34" tint="#4f5c3f" />
      <Header x={980} name="FELIX" sub="c. AD 105 · Vindolanda · ~27" tint="#8e4536" />
      <line x1={960} y1={120} x2={960} y2={1050} stroke={INK} strokeWidth={2} opacity={0.25} strokeDasharray="6 8" />
      {/* Bjorn: everyday front / side / back, then the cold-weather cloak */}
      {VIEWS.map(([label, v], i) => (
        <g key={`b${label}`}>
          <Fig look={BJORN} pose={{ ...v, expression: i === 0 ? "smug" : "neutral", headTilt: i === 0 ? -4 : 0 }} x={140 + i * 215} y={top} h={figH} id={`sb${i}`} />
          <Caption x={140 + i * 215} y={top + figH + 34}>{label}</Caption>
        </g>
      ))}
      <Fig look={BJORN_COLD} pose={{ view: "front", expression: "happy" }} x={820} y={top} h={figH} id="sbc" />
      <Caption x={820} y={top + figH + 34}>cold: cloak</Caption>
      {/* Felix: work tunic front / side / back, then drill and watch kit */}
      {VIEWS.map(([label, v], i) => (
        <g key={`f${label}`}>
          <Fig look={FELIX} pose={{ ...v, expression: i === 0 ? "neutral" : "neutral", lookX: i === 0 ? 0.3 : 0 }} x={1100 + i * 215} y={top} h={figH} id={`sf${i}`} />
          <Caption x={1100 + i * 215} y={top + figH + 34}>{label}</Caption>
        </g>
      ))}
      <Fig look={FELIX_KIT} pose={{ view: "front", expression: "determined" }} x={1780} y={top} h={figH} id="sfk" />
      <Caption x={1780} y={top + figH + 34}>drill / watch</Caption>
      <Swatches items={PALETTE.bjorn} x={64} y={890} />
      <Swatches items={PALETTE.felix} x={1004} y={890} />
      <Caption x={480} y={1040} size={18} weight={400} color="#6a6258">
        Moves from the chest · chin up before every job · eyes slide sideways when it goes wrong
      </Caption>
      <Caption x={1440} y={1040} size={18} weight={400} color="#6a6258">
        Short, measured moves · squares things to the table edge · looks at the object, then the culprit
      </Caption>
    </svg>
  );
};

const BJORN_FACES: [Expression, string, Partial<PuppetPose>][] = [
  ["smug", "confident", { headTilt: -6 }],
  ["shocked", "unexpected problem", {}],
  ["awkward", "who saw that?", { lookX: 0.9 }],
  ["thinking", "asking for help", {}],
  ["happy", "real satisfaction", {}],
  ["determined", "\"easy\"", {}],
  ["confused", "losing the board game", { headTilt: 8 }],
  ["excited", "chicken caught", {}],
];
const FELIX_FACES: [Expression, string, Partial<PuppetPose>][] = [
  ["neutral", "ready and orderly", {}],
  ["skeptical", "order disturbed", { lookX: -0.7 }],
  ["bored", "patience running out", {}],
  ["shocked", "surprised", {}],
  ["happy", "relief (bathhouse)", {}],
  ["worried", "new duty", { lookX: 0.8 }],
  ["thinking", "planning the load", {}],
  ["smug", "dry socks", {}],
];

// Heads only: the box shows the top 640 units of the puppet (head and shoulders).
const Face: React.FC<{ look: PuppetLook; expression: Expression; pose: Partial<PuppetPose>; x: number; y: number; id: string; label: string }> = ({
  look,
  expression,
  pose,
  x,
  y,
  id,
  label,
}) => (
  <g>
    <rect x={x - 100} y={y} width={200} height={200} rx={16} fill="#fbf6ec" stroke={INK} strokeWidth={2} opacity={0.9} />
    <svg x={x - 100} y={y} width={200} height={200} viewBox="-330 -1150 660 660">
      <Puppet look={look} pose={{ expression, view: "front", ...pose } as PuppetPose} id={id} />
    </svg>
    <Caption x={x} y={y + 230} size={18}>{label}</Caption>
  </g>
);

const Expressions: React.FC = () => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
    <Header x={40} name="BJORN · faces" sub="big brows, readable at wide-shot size" tint="#4f5c3f" />
    <Header x={980} name="FELIX · faces" sub="small moves, eyes do the work" tint="#8e4536" />
    {BJORN_FACES.map(([e, label, p], i) => (
      <Face key={`b${i}`} look={BJORN} expression={e} pose={p} label={label} x={150 + (i % 4) * 220} y={150 + Math.floor(i / 4) * 300} id={`eb${i}`} />
    ))}
    {FELIX_FACES.map(([e, label, p], i) => (
      <Face key={`f${i}`} look={FELIX} expression={e} pose={p} label={label} x={1110 + (i % 4) * 220} y={150 + Math.floor(i / 4) * 300} id={`ef${i}`} />
    ))}
    <Face look={FELIX_KIT} expression="determined" pose={{}} label="on watch" x={1550} y={770} id="efk" />
    <Face look={BJORN_COLD} expression="sad" pose={{}} label="opened the door: wind" x={590} y={770} id="ebc" />
  </svg>
);

const CAST: [PuppetLook, string, string, Partial<PuppetPose>][] = [
  [ASTRID, "Astrid", "Bjorn's wife · calm, capable", { expression: "skeptical" }],
  [LIV, "Liv", "~12 · quick, fetches tools", { expression: "smug" }],
  [BJORN, "Bjorn", "", { expression: "smug" }],
  [FELIX, "Felix", "", { expression: "neutral" }],
  [DARO, "Daro", "Felix's mess-mate · relaxed", { expression: "happy" }],
  [OFFICER, "Officer", "older · short hand signals", { expression: "neutral", armR: [40, -60] }],
];

const Lineup: React.FC = () => (
  <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
    <Header x={40} name="FARM · DENMARK" sub="Astrid · Liv · Bjorn" tint="#4f5c3f" />
    <Header x={980} name="FORT · VINDOLANDA" sub="Felix · Daro · officer" tint="#8e4536" />
    {CAST.map(([look, name, note, pose], i) => {
      const x = 190 + i * 308;
      // Liv is about 12: drawn at four fifths of the adults' height.
      const h = name === "Liv" ? 560 : name === "Daro" ? 660 : 700;
      return (
        <g key={name}>
          <Fig look={look} pose={pose} x={x} y={170 + (700 - h)} h={h} id={`l${i}`} />
          <Caption x={x} y={920} size={30} weight={800}>{name}</Caption>
          <Caption x={x} y={956} size={18} weight={400} color="#6a6258">{note}</Caption>
        </g>
      );
    })}
  </svg>
);

const PAGES = [Turnaround, Expressions, Lineup];
export const SHEET_FRAMES = PAGES.length;

export const VikingRomanSheet: React.FC = () => {
  const f = useCurrentFrame();
  const Page = PAGES[Math.min(PAGES.length - 1, f)];
  return (
    <AbsoluteFill style={{ background: BG }}>
      <Page />
    </AbsoluteFill>
  );
};
