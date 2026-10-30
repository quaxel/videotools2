import React from "react";

// A flat 2D cartoon puppet: round head, dot eyes, bean body, stick limbs.
// Origin is between the feet; the figure is ~1060 units tall (head top at y = -1060).

export type Expression = "neutral" | "excited" | "skeptical" | "smug" | "shocked";

export type PuppetLook = {
  skin: string;
  hair: string;
  outfit: string;
  pattern?: string; // colour of small leaf marks on the outfit
  lanyard?: string;
  cap?: string; // backwards baseball cap
  chain?: string; // neck chain
  glasses?: boolean;
  long?: boolean; // long hair down to the shoulders
};

export type PuppetPose = {
  expression: Expression;
  blink?: boolean;
  mouthOpen?: number; // 0..1, used while talking
  viseme?: Viseme; // mouth shape for the sound being said (Stage sets it from the words); default "a"
  swing?: number; // degrees the lanyard, chain and cap brim lag behind the body (follow-through)
  lookX?: number; // -1..1 pupil shift
  headTilt?: number; // degrees
  armL?: [number, number]; // shoulder, elbow in degrees (0 = straight down)
  armR?: [number, number];
  bob?: number; // vertical body offset in units
  legSwing?: number; // degrees, opposite swing per leg while walking
  sit?: boolean; // knees bent toward the camera, hips at stool height
  view?: "front" | "side" | "back";
  facing?: 1 | -1; // side view: 1 faces screen-right, -1 faces screen-left
  hold?: { item: HeldItem; hand: "L" | "R" }; // side view holds in the near hand
  itemTilt?: number; // degrees the held item is turned (180 = upside down)
  coinDrop?: number; // a coin falling from the hand: units below the hand, undefined = none
};

// Mouth shapes: closed lips (m, b, p), rounded (o, u, w), wide (e, i), open (a), lip under teeth (f, v).
export type Viseme = "mbp" | "o" | "e" | "a" | "fv";

export type HeldItem = "cup" | "drink" | "phone" | "toolbox" | "key" | "popcorn" | "briefcase" | "candy" | "wine";

const INK = "#161212";
const STROKE = 12;

// Things a hand can hold, drawn around the grip point (0, 0).
const Item: React.FC<{ item: HeldItem }> = ({ item }) => {
  if (item === "cup") {
    // Casino coin cup with coins heaped on top
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        {[-22, 2, 24].map((x, i) => (
          <ellipse key={x} cx={x} cy={-104 - (i % 2) * 8} rx={18} ry={9} fill="#ffcc33" />
        ))}
        <path d="M -44 -96 L 44 -96 L 34 20 L -34 20 Z" fill="#d62828" />
        <rect x={-36} y={-62} width={72} height={30} fill="#ffcc33" strokeWidth={6} />
        <text x={0} y={-38} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontWeight={900} fontSize={24} fill="#d62828" stroke="none">
          777
        </text>
      </g>
    );
  }
  if (item === "drink") {
    // Tall glass with a straw and a paper umbrella
    return (
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round">
        <line x1={14} y1={-120} x2={34} y2={-176} />
        <path d="M 4 -150 L 60 -178 L 52 -134 Z" fill="#ff6fa5" />
        <path d="M -34 -128 L 34 -128 L 26 20 L -26 20 Z" fill="#dff4ff" />
        <path d="M -30 -84 L 30 -84 L 26 16 L -26 16 Z" fill="#ff9f1c" stroke="none" />
      </g>
    );
  }
  if (item === "toolbox") {
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <path d="M -30 -6 L -30 -30 L 30 -30 L 30 -6" fill="none" strokeWidth={10} />
        <rect x={-80} y={-8} width={160} height={84} rx={10} fill="#d62828" />
        <rect x={-80} y={14} width={160} height={10} fill="#a51d1d" strokeWidth={0} />
        <rect x={-14} y={10} width={28} height={16} rx={3} fill="#c9ced3" />
      </g>
    );
  }
  if (item === "key") {
    return (
      <g stroke={INK} strokeWidth={6} strokeLinejoin="round">
        <circle cx={0} cy={-34} r={20} fill="#ffcc33" />
        <circle cx={0} cy={-34} r={7} fill="#fff" />
        <path d="M -6 -16 L 6 -16 L 6 40 L 18 40 L 18 50 L 6 50 L 6 60 L -6 60 Z" fill="#ffcc33" />
      </g>
    );
  }
  if (item === "popcorn") {
    // Striped cinema bucket heaped with popcorn
    return (
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
        {[-36, -14, 8, 30, -24, 0, 22].map((x, i) => (
          <circle key={i} cx={x} cy={i < 4 ? -112 : -128} r={17} fill="#fff4c2" />
        ))}
        <path d="M -52 -104 L 52 -104 L 38 24 L -38 24 Z" fill="#ffffff" />
        {[-30, 0, 30].map((x) => (
          <path key={x} d={`M ${x - 9} -104 L ${x + 9} -104 L ${x * 0.73 + 7} 24 L ${x * 0.73 - 7} 24 Z`} fill="#e0262f" strokeWidth={0} />
        ))}
        <path d="M -52 -104 L 52 -104 L 38 24 L -38 24 Z" fill="none" />
      </g>
    );
  }
  if (item === "briefcase") {
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <path d="M -26 -6 L -26 -28 L 26 -28 L 26 -6" fill="none" strokeWidth={10} />
        <rect x={-84} y={-8} width={168} height={96} rx={8} fill="#5a3a22" />
        <rect x={-84} y={22} width={168} height={8} fill="#3f2816" strokeWidth={0} />
        <rect x={-14} y={14} width={28} height={18} rx={3} fill="#e8b04a" />
      </g>
    );
  }
  if (item === "wine") {
    return (
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
        <path d="M -8 -170 L 8 -170 L 8 -120 Q 24 -104 24 -80 L 24 24 L -24 24 L -24 -80 Q -24 -104 -8 -120 Z" fill="#2f5a2a" />
        <rect x={-24} y={-56} width={48} height={50} fill="#fffdf4" strokeWidth={5} />
        <rect x={-24} y={-56} width={16} height={50} fill="#1d4fa8" strokeWidth={0} />
        <rect x={8} y={-56} width={16} height={50} fill="#e0262f" strokeWidth={0} />
        <rect x={-10} y={-178} width={20} height={12} fill="#7a1a2a" />
      </g>
    );
  }
  if (item === "candy") {
    return (
      <g stroke={INK} strokeWidth={7} strokeLinejoin="round">
        <rect x={-22} y={-96} width={44} height={110} rx={4} fill="#7a3fd0" />
        <rect x={-22} y={-62} width={44} height={34} fill="#ffd23f" strokeWidth={5} />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth={8}>
      <rect x={-30} y={-104} width={60} height={110} rx={12} fill="#1e1e24" />
      <rect x={-20} y={-92} width={40} height={78} rx={4} fill="#7fd1ff" strokeWidth={0} />
    </g>
  );
};

const Arm: React.FC<{ x: number; y: number; side: 1 | -1; angles: [number, number]; item?: HeldItem; tilt?: number; drop?: number }> = ({
  x,
  y,
  side,
  angles,
  item,
  tilt = 0,
  drop,
}) => {
  const [shoulder, elbow] = angles;
  const upper = 130;
  const lower = 120;
  // Angles open outward, away from the body.
  const a1 = (shoulder * Math.PI) / 180;
  const ex = x + side * Math.sin(a1) * upper;
  const ey = y + Math.cos(a1) * upper;
  const a2 = ((shoulder + elbow) * Math.PI) / 180;
  const hx = ex + side * Math.sin(a2) * lower;
  const hy = ey + Math.cos(a2) * lower;
  return (
    <g>
      <polyline
        points={`${x},${y} ${ex},${ey} ${hx},${hy}`}
        fill="none"
        stroke={INK}
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {item && (
        <g transform={`translate(${hx} ${hy - 6}) rotate(${tilt})`}>
          <Item item={item} />
        </g>
      )}
      {drop !== undefined && (
        <ellipse cx={hx} cy={hy + 60 + drop} rx={22} ry={22 * Math.abs(Math.cos(drop / 40))} fill="#ffcc33" stroke={INK} strokeWidth={7} />
      )}
      <circle cx={hx} cy={hy} r={22} fill={INK} />
    </g>
  );
};

const Eyes: React.FC<{ expression: Expression; blink: boolean; lookX: number }> = ({
  expression,
  blink,
  lookX,
}) => {
  const xs = [-72, 72];
  const y = -800;
  const px = lookX * 12;
  if (blink) {
    return (
      <g stroke={INK} strokeWidth={10} strokeLinecap="round">
        {xs.map((x) => (
          <line key={x} x1={x - 22} y1={y} x2={x + 22} y2={y} />
        ))}
      </g>
    );
  }
  if (expression === "excited" || expression === "shocked") {
    const shocked = expression === "shocked";
    return (
      <g>
        {xs.map((x) => (
          <g key={x}>
            <circle cx={x} cy={y} r={shocked ? 46 : 40} fill="#fff" stroke={INK} strokeWidth={9} />
            <circle cx={x + px} cy={y + 4} r={shocked ? 8 : 15} fill={INK} />
          </g>
        ))}
      </g>
    );
  }
  if (expression === "skeptical" || expression === "smug") {
    // Half-closed lids: a dot under a heavy lid line.
    return (
      <g>
        {xs.map((x) => (
          <g key={x}>
            <circle cx={x + px} cy={y + 6} r={15} fill={INK} />
            <path
              d={`M ${x - 34} ${y - 6} Q ${x} ${y - 16} ${x + 34} ${y - 6}`}
              fill="none"
              stroke={INK}
              strokeWidth={11}
              strokeLinecap="round"
            />
          </g>
        ))}
      </g>
    );
  }
  return (
    <g>
      {xs.map((x) => (
        <circle key={x} cx={x + px} cy={y} r={17} fill={INK} />
      ))}
    </g>
  );
};

const Brows: React.FC<{ expression: Expression }> = ({ expression }) => {
  // [left y-in, left y-out, right y-in, right y-out]
  const shapes: Record<Expression, [number, number, number, number]> = {
    neutral: [-868, -868, -868, -868],
    excited: [-890, -880, -890, -880],
    skeptical: [-858, -862, -880, -912], // right brow raised
    smug: [-856, -866, -856, -866],
    shocked: [-912, -900, -912, -900],
  };
  const [li, lo, ri, ro] = shapes[expression];
  return (
    <g stroke={INK} strokeWidth={12} strokeLinecap="round">
      <line x1={-110} y1={lo} x2={-40} y2={li} />
      <line x1={40} y1={ri} x2={110} y2={ro} />
    </g>
  );
};

// A talking mouth in the shape of the sound, sized by how loud it is.
const SpeechMouth: React.FC<{ open: number; viseme: Viseme; y: number; x?: number; scale?: number }> = ({ open, viseme, y, x = 0, scale = 1 }) => {
  const k = scale;
  if (viseme === "mbp") return <path d={`M ${x - 40 * k} ${y} Q ${x} ${y + 10 * k} ${x + 40 * k} ${y}`} fill="none" stroke={INK} strokeWidth={13 * k} strokeLinecap="round" />;
  if (viseme === "fv")
    return (
      <g>
        <rect x={x - 40 * k} y={y - 14 * k} width={80 * k} height={(22 + open * 10) * k} rx={10 * k} fill={INK} />
        <rect x={x - 30 * k} y={y - 12 * k} width={60 * k} height={11 * k} rx={3 * k} fill="#fff" />
      </g>
    );
  if (viseme === "o") {
    const h = (26 + open * 34) * k;
    return (
      <g>
        <ellipse cx={x} cy={y} rx={24 * k} ry={h / 2} fill={INK} />
        <ellipse cx={x} cy={y + h / 4} rx={13 * k} ry={h / 6} fill="#e0525a" />
      </g>
    );
  }
  if (viseme === "e") {
    const h = (14 + open * 26) * k;
    return (
      <g>
        <rect x={x - 54 * k} y={y - h / 2} width={108 * k} height={h} rx={h / 2} fill={INK} />
        <rect x={x - 40 * k} y={y - h / 2 + 3 * k} width={80 * k} height={Math.min(10 * k, h / 3)} rx={3 * k} fill="#fff" />
      </g>
    );
  }
  const h = (18 + open * 46) * k;
  return (
    <g>
      <ellipse cx={x} cy={y} rx={42 * k} ry={h / 2} fill={INK} />
      <ellipse cx={x} cy={y + h / 4} rx={24 * k} ry={h / 5} fill="#e0525a" />
    </g>
  );
};

const Mouth: React.FC<{ expression: Expression; open: number; viseme?: Viseme }> = ({ expression, open, viseme }) => {
  const y = -690;
  if (viseme) return <SpeechMouth open={open} viseme={viseme} y={y} />;
  if (open > 0.05) {
    const h = 18 + open * 46;
    return (
      <g>
        <ellipse cx={0} cy={y} rx={42} ry={h / 2} fill={INK} />
        <ellipse cx={0} cy={y + h / 4} rx={24} ry={h / 5} fill="#e0525a" />
      </g>
    );
  }
  if (expression === "excited") {
    // Wide toothy grin.
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <rect x={-80} y={y - 30} width={160} height={60} rx={22} fill="#fff" />
        <line x1={-80} y1={y} x2={80} y2={y} />
        {[-40, 0, 40].map((x) => (
          <line key={x} x1={x} y1={y - 30} x2={x} y2={y + 30} />
        ))}
      </g>
    );
  }
  if (expression === "shocked") {
    return <ellipse cx={0} cy={y} rx={26} ry={32} fill={INK} />;
  }
  if (expression === "skeptical") {
    return <path d={`M -44 ${y + 6} L 40 ${y - 8}`} stroke={INK} strokeWidth={11} strokeLinecap="round" />;
  }
  if (expression === "smug") {
    return (
      <path d={`M -50 ${y - 4} Q 0 ${y + 22} 52 ${y - 14}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
    );
  }
  return <path d={`M -36 ${y} L 36 ${y}`} stroke={INK} strokeWidth={11} strokeLinecap="round" />;
};

const FrontPuppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = ({ look, pose, id }) => {
  const bob = pose.bob ?? 0;
  const armL = pose.armL ?? [12, 10];
  const armR = pose.armR ?? [12, 10];
  const patternId = `leaf-${id}`;
  return (
    <g>
      <LeafPattern look={look} id={patternId} />

      {/* Legs swing from the hips; seated legs bend at a foreshortened knee */}
      {pose.sit &&
        [-1, 1].map((side) => (
          <g key={side}>
            <polyline
              points={`${side * 55},-280 ${side * 92},-236 ${side * 84},-18`}
              fill="none"
              stroke={INK}
              strokeWidth={14}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <ellipse cx={side * 100} cy={-10} rx={38} ry={16} fill={INK} />
          </g>
        ))}
      {!pose.sit && [-1, 1].map((side) => {
        const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
        const fx = side * 55 + Math.sin(a) * 266 + side * 7;
        const fy = -280 + Math.cos(a) * 266;
        return (
          <g key={side}>
            <line x1={side * 55} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={14} strokeLinecap="round" />
            <ellipse cx={fx + side * 16} cy={fy + 6} rx={38} ry={16} fill={INK} />
          </g>
        );
      })}

      <g transform={`translate(0 ${bob})`}>
        {/* Long hair hangs behind the body (and the arms), so none of it shows under the chin */}
        {look.long && (
          <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
            <path
              d="M -215 -820 C -250 -700 -248 -600 -228 -500 C -196 -478 -150 -484 -128 -520 L 128 -520 C 150 -484 196 -478 228 -500 C 248 -600 250 -700 215 -820 C 215 -1010 -215 -1010 -215 -820 Z"
              fill={look.hair}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
          </g>
        )}
        {/* Arms behind the body */}
        {pose.hold?.hand !== "L" && <Arm x={-130} y={-545} side={-1} angles={armL} />}
        {pose.hold?.hand !== "R" && <Arm x={130} y={-545} side={1} angles={armR} />}

        {/* Bean body */}
        <path
          d="M -150 -565 C -175 -430 -165 -310 -112 -262 L 112 -262 C 165 -310 175 -430 150 -565 C 118 -642 -118 -642 -150 -565 Z"
          fill={look.outfit}
          stroke={INK}
          strokeWidth={STROKE}
        />
        {look.pattern && (
          <path
            d="M -150 -565 C -175 -430 -165 -310 -112 -262 L 112 -262 C 165 -310 175 -430 150 -565 C 118 -642 -118 -642 -150 -565 Z"
            fill={`url(#${patternId})`}
          />
        )}
        {/* Collar */}
        <path d="M -48 -622 L 0 -575 L 48 -622" fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <g transform={`rotate(${pose.swing ?? 0} 0 -615)`}>
        {look.chain && (
          <path
            d="M -78 -612 Q 0 -470 78 -612"
            fill="none"
            stroke={look.chain}
            strokeWidth={16}
            strokeLinecap="round"
            strokeDasharray="1 20"
          />
        )}
        {look.lanyard && (
          <g>
            <path d="M -40 -615 L -8 -470 M 40 -615 L 8 -470" stroke={look.lanyard} strokeWidth={10} strokeLinecap="round" />
            <rect x={-30} y={-472} width={60} height={78} rx={8} fill={look.lanyard} stroke={INK} strokeWidth={7} />
            <rect x={-18} y={-452} width={36} height={14} rx={3} fill="#fff" />
          </g>
        )}
        </g>
        {/* A holding arm comes in front of the body so the item shows */}
        {pose.hold?.hand === "L" && <Arm x={-130} y={-545} side={-1} angles={armL} item={pose.hold.item} tilt={pose.itemTilt} drop={pose.coinDrop} />}
        {pose.hold?.hand === "R" && <Arm x={130} y={-545} side={1} angles={armR} item={pose.hold.item} tilt={pose.itemTilt} drop={pose.coinDrop} />}

        {/* Head */}
        <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
          <circle cx={0} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          {/* Messy hair */}
          <path
            d="M -196 -840 C -236 -990 -80 -1078 50 -1032 C 150 -1072 262 -980 206 -848 C 178 -902 130 -930 76 -912 C 40 -966 -40 -962 -86 -912 C -130 -936 -170 -900 -196 -840 Z"
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -204 -850 Q -196 -1056 0 -1060 Q 196 -1056 204 -850 Q 0 -900 -204 -850 Z" fill={look.cap} />
              <ellipse cx={-196} cy={-872} rx={78} ry={24} transform={`rotate(${-28 + (pose.swing ?? 0) * 0.6} -150 -860)`} fill={look.cap} />
              <circle cx={0} cy={-1058} r={14} fill={look.cap} />
            </g>
          )}
          <Brows expression={pose.expression} />
          <Eyes expression={pose.expression} blink={pose.blink ?? false} lookX={pose.lookX ?? 0} />
          <Mouth expression={pose.expression} open={pose.mouthOpen ?? 0} viseme={pose.viseme} />
          {look.glasses && (
            <g fill="none" stroke={INK} strokeWidth={10}>
              <circle cx={-72} cy={-800} r={52} />
              <circle cx={72} cy={-800} r={52} />
              <line x1={-20} y1={-806} x2={20} y2={-806} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

const LeafPattern: React.FC<{ look: PuppetLook; id: string }> = ({ look, id }) => (
  <defs>
    {look.pattern && (
      <pattern id={id} width={90} height={90} patternUnits="userSpaceOnUse" patternTransform="rotate(18)">
        <path d="M 20 30 q 18 -20 34 0 q -16 10 -34 0 z" fill={look.pattern} />
        <path d="M 60 72 q 14 -16 28 0 q -14 8 -28 0 z" fill={look.pattern} />
      </pattern>
    )}
  </defs>
);

const SIDE_BODY = "M -122 -565 C -146 -430 -138 -310 -96 -262 L 92 -262 C 138 -310 150 -430 128 -565 C 98 -644 -96 -644 -122 -565 Z";

// Profile, drawn facing +x; the caller mirrors it for facing = -1.
const SideFace: React.FC<{ pose: PuppetPose }> = ({ pose }) => {
  const e = pose.expression;
  const ex = 132;
  const ey = -806;
  const look = (pose.lookX ?? 0) * 8;
  const browUp = e === "excited" || e === "shocked" ? -24 : e === "skeptical" ? -14 : 0;
  const open = pose.mouthOpen ?? 0;
  const my = -690;
  return (
    <g>
      <line x1={98} y1={-868 + browUp} x2={166} y2={-872 + browUp + (e === "skeptical" ? -10 : 0)} stroke={INK} strokeWidth={12} strokeLinecap="round" />
      {pose.blink ? (
        <line x1={ex - 20} y1={ey} x2={ex + 20} y2={ey} stroke={INK} strokeWidth={10} strokeLinecap="round" />
      ) : e === "excited" || e === "shocked" ? (
        <g>
          <circle cx={ex} cy={ey} r={e === "shocked" ? 42 : 36} fill="#fff" stroke={INK} strokeWidth={9} />
          <circle cx={ex + 12 + look} cy={ey + 4} r={e === "shocked" ? 8 : 14} fill={INK} />
        </g>
      ) : (
        <g>
          <circle cx={ex + 6 + look} cy={ey + 4} r={16} fill={INK} />
          {(e === "skeptical" || e === "smug") && (
            <path d={`M ${ex - 30} ${ey - 8} Q ${ex} ${ey - 18} ${ex + 30} ${ey - 8}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
          )}
        </g>
      )}
      {pose.viseme ? (
        <SpeechMouth open={open} viseme={pose.viseme} y={my} x={178} scale={0.55} />
      ) : open > 0.05 ? (
        <ellipse cx={176} cy={my} rx={26} ry={10 + open * 22} fill={INK} />
      ) : e === "excited" ? (
        <path d={`M 128 ${my - 14} Q 180 ${my + 40} 220 ${my - 18} Z`} fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      ) : e === "shocked" ? (
        <ellipse cx={184} cy={my} rx={16} ry={22} fill={INK} />
      ) : e === "smug" ? (
        <path d={`M 140 ${my - 2} Q 175 ${my + 16} 208 ${my - 10}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      ) : (
        <line x1={146} y1={my + (e === "skeptical" ? 6 : 0)} x2={200} y2={my - (e === "skeptical" ? 6 : 0)} stroke={INK} strokeWidth={11} strokeLinecap="round" />
      )}
    </g>
  );
};

const SidePuppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = ({ look, pose, id }) => {
  const bob = pose.bob ?? 0;
  const swing = pose.legSwing ?? 0;
  const patternId = `leaf-side-${id}`;
  const nearArm: [number, number] = pose.armR ?? [-swing * 1.2, 14];
  const farArm: [number, number] = pose.armL ?? [swing * 1.2, 14];
  const leg = (a: number, key: string) => {
    const r = (a * Math.PI) / 180;
    const fx = Math.sin(r) * 266;
    const fy = -280 + Math.cos(r) * 266;
    return (
      <g key={key}>
        <line x1={0} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={14} strokeLinecap="round" />
        <ellipse cx={fx + 22} cy={fy + 6} rx={40} ry={16} fill={INK} />
      </g>
    );
  };
  return (
    <g transform={`scale(${pose.facing ?? 1} 1)`}>
      <LeafPattern look={look} id={patternId} />
      {pose.sit ? (
        <g>
          <polyline points="0,-280 150,-282 146,-20" fill="none" stroke={INK} strokeWidth={14} strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx={168} cy={-12} rx={40} ry={16} fill={INK} />
        </g>
      ) : (
        [leg(swing, "far"), leg(-swing, "near")]
      )}
      <g transform={`translate(0 ${bob})`}>
        <Arm x={-6} y={-552} side={1} angles={farArm} />
        <path d={SIDE_BODY} fill={look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && <path d={SIDE_BODY} fill={`url(#${patternId})`} />}
        <path d="M 46 -628 L 86 -592 L 108 -626" fill="#fff" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        {look.chain && (
          <path d="M 18 -618 Q 92 -520 132 -604" fill="none" stroke={look.chain} strokeWidth={16} strokeLinecap="round" strokeDasharray="1 20" />
        )}
        {look.lanyard && (
          <g transform={`rotate(${pose.swing ?? 0} 40 -620)`}>
            <path d="M 40 -620 L 96 -472" stroke={look.lanyard} strokeWidth={10} strokeLinecap="round" />
            <rect x={70} y={-474} width={46} height={72} rx={8} fill={look.lanyard} stroke={INK} strokeWidth={7} />
          </g>
        )}
        <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
          {look.long && (
            <path
              d="M -120 -980 C -240 -880 -250 -680 -215 -500 C -170 -478 -110 -490 -80 -540 C -60 -640 -40 -760 -20 -860 Z"
              fill={look.hair}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
          )}
          <circle cx={26} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          <path
            d="M 228 -876 C 196 -1010 60 -1062 -62 -1032 C -196 -1000 -222 -860 -168 -700 C -128 -744 -108 -792 -88 -824 C -36 -884 62 -930 150 -902 C 190 -890 212 -884 228 -876 Z"
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -182 -858 Q -150 -1062 60 -1062 Q 240 -1044 234 -880 Q 40 -930 -182 -858 Z" fill={look.cap} />
              <ellipse cx={-212} cy={-874} rx={92} ry={22} transform="rotate(14 -212 -874)" fill={look.cap} />
            </g>
          )}
          <circle cx={-12} cy={-790} r={32} fill={look.skin} stroke={INK} strokeWidth={10} />
          <SideFace pose={pose} />
          {look.glasses && <circle cx={136} cy={-804} r={50} fill="none" stroke={INK} strokeWidth={10} />}
        </g>
        <Arm x={10} y={-548} side={1} angles={nearArm} item={pose.hold?.item} tilt={pose.itemTilt} drop={pose.coinDrop} />
      </g>
    </g>
  );
};

const BackPuppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = ({ look, pose, id }) => {
  const bob = pose.bob ?? 0;
  const armL = pose.armL ?? [12, 10];
  const armR = pose.armR ?? [12, 10];
  const patternId = `leaf-back-${id}`;
  const body = "M -150 -565 C -175 -430 -165 -310 -112 -262 L 112 -262 C 165 -310 175 -430 150 -565 C 118 -642 -118 -642 -150 -565 Z";
  return (
    <g>
      <LeafPattern look={look} id={patternId} />
      {pose.sit ? (
        [-1, 1].map((side) => <line key={side} x1={side * 55} y1={-280} x2={side * 62} y2={-210} stroke={INK} strokeWidth={14} strokeLinecap="round" />)
      ) : (
        [-1, 1].map((side) => {
          const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
          const fx = side * 55 + Math.sin(a) * 266 + side * 7;
          const fy = -280 + Math.cos(a) * 266;
          return (
            <g key={side}>
              <line x1={side * 55} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={14} strokeLinecap="round" />
              <ellipse cx={fx} cy={fy + 4} rx={30} ry={16} fill={INK} />
            </g>
          );
        })
      )}
      <g transform={`translate(0 ${bob})`}>
        <path d={body} fill={look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && <path d={body} fill={`url(#${patternId})`} />}
        {(look.lanyard || look.chain) && (
          <path d="M -70 -616 Q 0 -596 70 -616" fill="none" stroke={look.lanyard ?? look.chain} strokeWidth={12} strokeLinecap="round" />
        )}
        <Arm x={-130} y={-545} side={-1} angles={armL} item={pose.hold?.hand === "L" ? pose.hold.item : undefined} />
        <Arm x={130} y={-545} side={1} angles={armR} item={pose.hold?.hand === "R" ? pose.hold.item : undefined} />
        <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
          <circle cx={-204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={0} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          <path
            d={
              look.long
                ? "M -215 -740 C -235 -960 -100 -1040 0 -1036 C 120 -1040 235 -960 215 -740 C 228 -640 228 -580 218 -500 C 140 -470 -140 -470 -218 -500 C -228 -580 -228 -640 -215 -740 Z"
                : "M -205 -740 C -230 -960 -100 -1040 0 -1036 C 120 -1040 232 -960 205 -740 C 140 -690 -140 -690 -205 -740 Z"
            }
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -206 -850 Q -196 -1058 0 -1062 Q 196 -1058 206 -850 Q 0 -900 -206 -850 Z" fill={look.cap} />
              <ellipse cx={0} cy={-858} rx={150} ry={38} fill={look.cap} />
            </g>
          )}
        </g>
      </g>
    </g>
  );
};

export const Puppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = (props) => {
  if (props.pose.view === "side") return <SidePuppet {...props} />;
  if (props.pose.view === "back") return <BackPuppet {...props} />;
  return <FrontPuppet {...props} />;
};
