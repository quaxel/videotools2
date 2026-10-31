import React from "react";

// A flat 2D cartoon puppet: round head, dot eyes, bean body, stick limbs.
// Origin is between the feet; the figure is ~1060 units tall (head top at y = -1060).

export type Expression =
  | "neutral"
  | "excited"
  | "skeptical"
  | "smug"
  | "shocked"
  | "angry"
  | "sad"
  | "confused"
  | "worried"
  | "awkward"
  | "happy"
  | "thinking"
  | "disgusted"
  | "bored"
  | "determined";

// Small live offsets on top of an expression, so a held face never freezes (Stage fills these in; see liven.ts).
// Units are puppet units; 0 / 1 leave the face exactly as the expression draws it.
export type FaceMicro = {
  brow?: number; // both brows down (+) / up (-)
  browL?: number; // extra for the screen-left brow
  browR?: number; // extra for the screen-right brow
  lid?: number; // upper lids down (+) / up (-)
  lookY?: number; // pupils down (+) / up (-)
  mouthW?: number; // width of the held mouth, 1 = as drawn
  mouthX?: number;
  mouthY?: number;
  t?: number; // frame, drives the sweat drop and the question mark
};

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
  face?: FaceMicro; // micro-expression offsets (Stage adds them automatically)
  from?: Expression; // the expression being left; with blend < 1 the face eases from it to `expression`
  blend?: number; // 0 = still showing `from`, 1 = fully `expression` (see faceChange in engine/anim.ts)
};

// Mouth shapes: closed lips (m, b, p), rounded (o, u, w), wide (e, i), open (a), lip under teeth (f, v).
export type Viseme = "mbp" | "o" | "e" | "a" | "fv";

export type HeldItem = "cup" | "drink" | "phone" | "toolbox" | "key" | "popcorn" | "briefcase" | "candy" | "wine";

const INK = "#161212";
const STROKE = 12;
const LIMB = 30; // arm and leg thickness
const SHADE = "#4a2038"; // cel-shading shadow colour, laid over any fill at low opacity

const circD = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0 Z`;

// Cel shading: a flat shadow on the side away from the light (upper left) with a slightly soft edge,
// clipped to the shape it shades. `uid` is the puppet's pattern id, so the ids stay unique per puppet.
const Cel: React.FC<{ uid: string; name: string; d: string; dx?: number; dy?: number; opacity?: number; extra?: React.ReactNode }> = ({
  uid,
  name,
  d,
  dx = -42,
  dy = -30,
  opacity = 0.22,
  extra,
}) => {
  const cid = `${uid}-${name}`;
  return (
    <g>
      <clipPath id={`c-${cid}`}>
        <path d={d} />
      </clipPath>
      <mask id={`m-${cid}`} maskUnits="userSpaceOnUse" x={-600} y={-1200} width={1200} height={1300}>
        <rect x={-600} y={-1200} width={1200} height={1300} fill="#fff" />
        <path d={d} transform={`translate(${dx} ${dy})`} fill="#000" filter={`url(#${uid}-soft)`} />
      </mask>
      <g clipPath={`url(#c-${cid})`}>
        <rect x={-600} y={-1200} width={1200} height={1300} fill={SHADE} opacity={opacity} mask={`url(#m-${cid})`} />
        {extra}
      </g>
    </g>
  );
};

// Mitten hand: a palm, one block for the four fingers and a thumb. Drawn around the wrist point, fingers along the forearm.
const Hand: React.FC<{ x: number; y: number; side: 1 | -1; angle: number }> = ({ x, y, side, angle }) => (
  <g transform={`translate(${x} ${y}) rotate(${-side * angle}) scale(1.17)`}>
    <g stroke={INK} strokeLinecap="round" fill="none">
      <line x1={0} y1={12} x2={0} y2={22} strokeWidth={52} />
      <line x1={side * 14} y1={-6} x2={side * 34} y2={2} strokeWidth={27} />
    </g>
    <ellipse cx={0} cy={0} rx={27} ry={26} fill={INK} />
  </g>
);

// Simple rounded foot.
const Foot: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1.3 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-38} y={-14} width={76} height={36} rx={18} fill={INK} />
  </g>
);

// Eyelid over a white eye: a skin-coloured lid with a line and a soft shadow under it. yl / yr are the lid line's height at the
// left and right end of the eye, so a tilted lid reads as angry or sad.
const Lid: React.FC<{ uid: string; cx: number; cy: number; r: number; yl: number; yr: number; skin: string }> = ({ uid, cx, cy, r, yl, yr, skin }) => {
  const id = `${uid}-lid${cx}`;
  const x0 = cx - r - 5;
  const x1 = cx + r + 5;
  const d = `M ${x0} ${cy - r - 30} L ${x1} ${cy - r - 30} L ${x1} ${yr} L ${x0} ${yl} Z`;
  return (
    <g>
      <clipPath id={id}>
        <circle cx={cx} cy={cy} r={r} />
      </clipPath>
      <g clipPath={`url(#${id})`}>
        <path d={d} transform="translate(0 9)" fill={SHADE} opacity={0.28} filter={`url(#${uid}-soft)`} />
        <path d={d} fill={skin} />
        <line x1={x0} y1={yl} x2={x1} y2={yr} stroke={INK} strokeWidth={9} />
      </g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={INK} strokeWidth={9} />
    </g>
  );
};

// Lid line height relative to the eye centre, [inner end, outer end]. Excited and shocked keep the lid out of sight.
const FRONT_LONG_D = "M -215 -820 C -250 -700 -248 -600 -228 -500 C -196 -478 -150 -484 -128 -520 L 128 -520 C 150 -484 196 -478 228 -500 C 248 -600 250 -700 215 -820 C 215 -1010 -215 -1010 -215 -820 Z";
const BODY_D = "M -150 -565 C -175 -430 -165 -310 -112 -262 L 112 -262 C 165 -310 175 -430 150 -565 C 118 -642 -118 -642 -150 -565 Z";
const BANGS_D = "M -196 -840 C -236 -990 -80 -1078 50 -1032 C 150 -1072 262 -980 206 -848 C 178 -902 130 -930 76 -912 C 40 -966 -40 -962 -86 -912 C -130 -936 -170 -900 -196 -840 Z";
const SIDE_HEAD_D = "M 26 -1005 C 150 -1005 231 -920 231 -800 C 231 -700 186 -604 96 -598 C 30 -594 -36 -616 -86 -656 C -150 -706 -179 -764 -179 -820 C -179 -930 -90 -1005 26 -1005 Z";
const SIDE_LONG_HAIR_D = "M 228 -876 C 196 -1010 60 -1062 -62 -1032 C -196 -1000 -250 -880 -250 -700 C -250 -620 -240 -540 -215 -500 C -170 -478 -90 -480 0 -520 C 14 -580 -10 -700 -60 -790 C -72 -808 -80 -816 -88 -824 C -36 -884 62 -930 150 -902 C 190 -890 212 -884 228 -876 Z";
const SIDE_HAIR_D = "M 228 -876 C 196 -1010 60 -1062 -62 -1032 C -196 -1000 -222 -860 -168 -700 C -128 -744 -108 -792 -88 -824 C -36 -884 62 -930 150 -902 C 190 -890 212 -884 228 -876 Z";

const LID: Record<Expression, [number, number]> = {
  neutral: [-24, -24],
  excited: [-62, -62],
  shocked: [-62, -62],
  skeptical: [-2, -2],
  smug: [4, 4],
  angry: [0, -26],
  sad: [-26, 0],
  confused: [-20, -20], // the left eye squints; see Eyes
  worried: [-34, -34],
  awkward: [-14, -14],
  happy: [-62, -62], // eyes closed in a smile; see Eyes
  thinking: [-12, -12],
  disgusted: [-62, -62], // eyes squeezed shut; see Eyes
  bored: [2, 2],
  determined: [-8, -20],
};

// Pupil offset and radius where an expression moves the eyes: [x, y, r].
const PUPIL: Partial<Record<Expression, [number, number, number]>> = {
  confused: [10, -2, 15],
  worried: [0, 2, 10],
  thinking: [-12, -14, 15],
  bored: [0, 8, 15],
};

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
        strokeWidth={LIMB}
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
      <Hand x={hx} y={hy} side={side} angle={shoulder + elbow} />
    </g>
  );
};

// The open-eye numbers of an expression, so two expressions can be mixed during a change.
const eyeShape = (e: Expression) => {
  const [inner, outer] = LID[e];
  const pupil = PUPIL[e];
  return {
    r: e === "shocked" ? 46 : 40,
    pr: e === "shocked" ? 8 : pupil?.[2] ?? 15,
    px: pupil?.[0] ?? 0,
    py: pupil?.[1] ?? 0,
    // Lid line height at the left and right end of each eye; confused squints the screen-left eye and opens the other wide.
    left: e === "confused" ? [-12, -6] : [outer, inner],
    right: e === "confused" ? [-40, -40] : [inner, outer],
  };
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const Eyes: React.FC<{ expression: Expression; from?: Expression; blend: number; blink: boolean; lookX: number; skin: string; uid: string; micro: FaceMicro }> = ({
  expression,
  from,
  blend,
  blink,
  lookX,
  skin,
  uid,
  micro,
}) => {
  const xs = [-72, 72];
  const y = -800;
  const px = lookX * 12;
  const lid = micro.lid ?? 0;
  // Closed-eye expressions switch halfway through a change; open eyes mix their lids, pupils and size.
  const shown = from && blend < 0.5 ? from : expression;
  if (shown === "happy") {
    // Closed in a smile: upward arcs.
    return (
      <g fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M ${x - 32} ${y + 8 + lid * 0.3} Q ${x} ${y - 30 + lid * 0.6} ${x + 32} ${y + 8 + lid * 0.3}`} />
        ))}
      </g>
    );
  }
  if (shown === "disgusted") {
    // Squeezed shut: > <
    const k = 22 - lid * 0.4;
    return (
      <g fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" strokeLinejoin="round">
        <path d={`M -100 ${y - k} L -48 ${y} L -100 ${y + k}`} />
        <path d={`M 100 ${y - k} L 48 ${y} L 100 ${y + k}`} />
      </g>
    );
  }
  if (blink) {
    return (
      <g stroke={INK} strokeWidth={10} strokeLinecap="round">
        {xs.map((x) => (
          <line key={x} x1={x - 22} y1={y} x2={x + 22} y2={y} />
        ))}
      </g>
    );
  }
  const A = eyeShape(from ?? expression);
  const B = eyeShape(expression);
  const t = from ? blend : 1;
  const r = mix(A.r, B.r, t);
  return (
    <g>
      {xs.map((x) => {
        const [l0, l1] = x < 0 ? [mix(A.left[0], B.left[0], t), mix(A.left[1], B.left[1], t)] : [mix(A.right[0], B.right[0], t), mix(A.right[1], B.right[1], t)];
        return (
          <g key={x}>
            <circle cx={x} cy={y} r={r} fill="#fff" stroke={INK} strokeWidth={9} />
            <circle cx={x + px + mix(A.px, B.px, t)} cy={y + 4 + mix(A.py, B.py, t) + (micro.lookY ?? 0)} r={mix(A.pr, B.pr, t)} fill={INK} />
            <Lid uid={uid} cx={x} cy={y} r={r} yl={y + lid + l0} yr={y + lid + l1} skin={skin} />
          </g>
        );
      })}
    </g>
  );
};

// [left y-in, left y-out, right y-in, right y-out]
const BROWS: Record<Expression, [number, number, number, number]> = {
  neutral: [-890, -880, -890, -880],
  excited: [-896, -902, -896, -902], // level and high, not worried
  skeptical: [-858, -862, -880, -912], // right brow raised
  smug: [-856, -866, -856, -866],
  shocked: [-886, -880, -886, -880],
  angry: [-860, -900, -860, -900], // inner ends low
  sad: [-915, -875, -915, -875], // inner ends high
  confused: [-852, -866, -898, -912], // one low and frowning, one high
  worried: [-905, -882, -905, -882],
  awkward: [-896, -880, -896, -880],
  happy: [-894, -886, -894, -886],
  thinking: [-878, -880, -906, -902],
  disgusted: [-858, -880, -858, -880],
  bored: [-872, -872, -872, -872],
  determined: [-870, -892, -870, -892],
};

const Brows: React.FC<{ expression: Expression; from?: Expression; blend: number; micro: FaceMicro }> = ({ expression, from, blend, micro }) => {
  const both = micro.brow ?? 0;
  const l = both + (micro.browL ?? 0);
  const r = both + (micro.browR ?? 0);
  const a = BROWS[from ?? expression];
  const [li, lo, ri, ro] = BROWS[expression].map((v, i) => mix(a[i], v, from ? blend : 1) + (i < 2 ? l : r));
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

const Mouth: React.FC<{ expression: Expression; open: number; viseme?: Viseme; uid: string }> = ({ expression, open, viseme, uid }) => {
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
    // Open D-shaped laugh: a strip of upper teeth and a tongue.
    const d = `M -70 ${y - 24} Q 0 ${y - 30} 70 ${y - 24} Q 68 ${y + 50} 0 ${y + 62} Q -68 ${y + 50} -70 ${y - 24} Z`;
    return (
      <g>
        <clipPath id={`${uid}-mouth`}>
          <path d={d} />
        </clipPath>
        <path d={d} fill={INK} />
        <g clipPath={`url(#${uid}-mouth)`}>
          <rect x={-80} y={y - 40} width={160} height={34} fill="#fff" />
          <ellipse cx={0} cy={y + 54} rx={36} ry={22} fill="#e0525a" />
        </g>
        <path d={d} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
      </g>
    );
  }
  if (expression === "shocked") {
    return (
      <g>
        <ellipse cx={0} cy={y} rx={34} ry={46} fill={INK} />
        <ellipse cx={0} cy={y + 14} rx={20} ry={20} fill="#d9534f" />
      </g>
    );
  }
  if (expression === "angry") {
    // Gritted teeth.
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <rect x={-55} y={y - 12} width={110} height={34} rx={16} fill="#fff" />
        <line x1={-55} y1={y + 5} x2={55} y2={y + 5} />
        {[-27.5, 0, 27.5].map((x) => (
          <line key={x} x1={x} y1={y - 12} x2={x} y2={y + 22} />
        ))}
      </g>
    );
  }
  const line = (d: string) => <path d={d} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />;
  if (expression === "confused") return line(`M -24 ${y + 10} Q 0 ${y - 14} 24 ${y + 2} Q 48 ${y + 18} 72 ${y - 10}`);
  if (expression === "worried") return line(`M -44 ${y + 12} Q -22 ${y - 2} 0 ${y + 8} Q 22 ${y - 2} 44 ${y + 12}`);
  if (expression === "awkward") {
    // A forced, toothy grin.
    return (
      <g stroke={INK} strokeWidth={8} strokeLinejoin="round">
        <rect x={-66} y={y - 20} width={132} height={44} rx={18} fill="#fff" />
        <line x1={-66} y1={y + 2} x2={66} y2={y + 2} />
        {[-33, 0, 33].map((x) => (
          <line key={x} x1={x} y1={y - 20} x2={x} y2={y + 24} />
        ))}
      </g>
    );
  }
  if (expression === "happy") return line(`M -64 ${y - 18} Q 0 ${y + 44} 64 ${y - 18}`);
  if (expression === "thinking") return line(`M 6 ${y + 6} L 56 ${y - 6}`);
  if (expression === "disgusted") {
    // "Eww": wavy lips with the tongue out.
    return (
      <g>
        <path d={`M -26 ${y + 2} L -26 ${y + 22} Q 0 ${y + 50} 26 ${y + 22} L 26 ${y + 2} Z`} fill="#e0525a" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        <line x1={0} y1={y + 10} x2={0} y2={y + 26} stroke="#b33a44" strokeWidth={5} strokeLinecap="round" />
        {line(`M -56 ${y + 6} Q -28 ${y - 10} 0 ${y + 2} Q 28 ${y - 10} 56 ${y + 6}`)}
      </g>
    );
  }
  if (expression === "bored") return line(`M -34 ${y + 6} L 34 ${y + 6}`);
  if (expression === "determined") return line(`M -44 ${y + 8} Q 0 ${y - 6} 44 ${y + 8}`);
  if (expression === "sad") {
    return <path d={`M -48 ${y + 18} Q 0 ${y - 26} 48 ${y + 18}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />;
  }
  if (expression === "skeptical") {
    return <path d={`M -44 ${y + 6} L 40 ${y - 8}`} stroke={INK} strokeWidth={11} strokeLinecap="round" />;
  }
  if (expression === "smug") {
    return (
      <path d={`M -50 ${y - 4} Q 0 ${y + 22} 52 ${y - 14}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
    );
  }
  // Neutral: a gentle smile.
  return <path d={`M -56 ${y - 15} Q 0 ${y + 35} 56 ${y - 15}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />;
};

// Blush, a sweat drop and a question mark for the expressions that need them. t moves the drop and the "?".
const Extras: React.FC<{ expression: Expression; t: number }> = ({ expression, t }) => {
  const drop = ((t % 60) / 60) * 26;
  return (
    <g>
      {(expression === "awkward" || expression === "happy") && (
        <g fill="#ff7a8a" opacity={0.35}>
          <ellipse cx={-128} cy={-728} rx={34} ry={18} />
          <ellipse cx={128} cy={-728} rx={34} ry={18} />
        </g>
      )}
      {(expression === "awkward" || expression === "worried") && (
        <path
          d="M 160 -900 Q 140 -862 148 -850 Q 160 -836 172 -850 Q 180 -862 160 -900 Z"
          transform={`translate(0 ${drop})`}
          opacity={drop > 20 ? (26 - drop) / 6 : 1}
          fill="#8fd3ff"
          stroke={INK}
          strokeWidth={7}
          strokeLinejoin="round"
        />
      )}
      {(expression === "disgusted") && (
        <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round">
          <path d="M -18 -786 Q 0 -778 18 -786" />
          <path d="M -14 -768 Q 0 -760 14 -768" />
        </g>
      )}
      {expression === "confused" && (
        <text
          x={190}
          y={-960}
          fontFamily="Arial Black, Impact, sans-serif"
          fontWeight={900}
          fontSize={150}
          fill="#ffffff"
          stroke={INK}
          strokeWidth={9}
          paintOrder="stroke"
          transform={`rotate(${14 + Math.sin(t / 9) * 7} 220 -1000)`}
        >
          ?
        </text>
      )}
    </g>
  );
};

const FrontPuppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = ({ look, pose, id }) => {
  const bob = pose.bob ?? 0;
  const armL = pose.armL ?? [12, 10];
  const armR = pose.armR ?? [12, 10];
  const patternId = `leaf-${id}`;
  const micro = pose.face ?? {};
  // A held (not talking) mouth breathes in width; any mouth can drift a little.
  const held = !pose.viseme && (pose.mouthOpen ?? 0) <= 0.05;
  const blend = pose.from ? Math.min(1, Math.max(0, pose.blend ?? 1)) : 1;
  // Mid-change (and not talking) the mouth swaps through a quick close-and-open.
  const changing = held && !!pose.from && pose.from !== pose.expression && blend < 1;
  const mw = held ? micro.mouthW ?? 1 : 1;
  const mouthMove = `translate(${micro.mouthX ?? 0} ${(micro.mouthY ?? 0) - 690}) scale(${mw} ${1 + (mw - 1) * 0.5}) translate(0 690)`;
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
              strokeWidth={LIMB}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Foot x={side * 96} y={-16} />
          </g>
        ))}
      {!pose.sit && [-1, 1].map((side) => {
        const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
        const fx = side * 55 + Math.sin(a) * 266 + side * 7;
        const fy = -280 + Math.cos(a) * 266;
        return (
          <g key={side}>
            <line x1={side * 55} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={LIMB} strokeLinecap="round" />
            <Foot x={fx + side * 8} y={fy - 4} />
          </g>
        );
      })}

      <g transform={`translate(0 ${bob})`}>
        {/* Long hair hangs behind the body (and the arms), so none of it shows under the chin */}
        {look.long && (
          <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
            <path
              d={FRONT_LONG_D}
              fill={look.hair}
              stroke={INK}
              strokeWidth={STROKE}
              strokeLinejoin="round"
            />
            <Cel uid={patternId} name="hairb" d={FRONT_LONG_D} />
          </g>
        )}
        {/* Arms behind the body */}
        {pose.hold?.hand !== "L" && <Arm x={-130} y={-545} side={-1} angles={armL} />}
        {pose.hold?.hand !== "R" && <Arm x={130} y={-545} side={1} angles={armR} />}

        {/* Bean body */}
        <path
          d={BODY_D}
          fill={look.outfit}
          stroke={INK}
          strokeWidth={STROKE}
        />
        {look.pattern && (
          <path
            d={BODY_D}
            fill={`url(#${patternId})`}
          />
        )}
        <Cel uid={patternId} name="body" d={BODY_D} />
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
          {/* The bangs cast a shadow on the forehead */}
          <Cel
            uid={patternId}
            name="head"
            d={circD(0, -800, 205)}
            extra={<path d={BANGS_D} transform="translate(0 30)" fill={SHADE} opacity={0.22} filter={`url(#${patternId}-soft)`} />}
          />
          {/* Messy hair */}
          <path
            d={BANGS_D}
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <Cel
            uid={patternId}
            name="bangs"
            d={BANGS_D}
            extra={<path d="M -150 -930 Q -60 -1000 40 -985" fill="none" stroke="#fff" strokeWidth={22} strokeLinecap="round" opacity={0.2} />}
          />
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -204 -850 Q -196 -1056 0 -1060 Q 196 -1056 204 -850 Q 0 -900 -204 -850 Z" fill={look.cap} />
              <ellipse cx={-196} cy={-872} rx={78} ry={24} transform={`rotate(${-28 + (pose.swing ?? 0) * 0.6} -150 -860)`} fill={look.cap} />
              <circle cx={0} cy={-1058} r={14} fill={look.cap} />
            </g>
          )}
          <Brows expression={pose.expression} from={pose.from} blend={blend} micro={micro} />
          <Eyes expression={pose.expression} from={pose.from} blend={blend} blink={pose.blink ?? false} lookX={pose.lookX ?? 0} skin={look.skin} uid={patternId} micro={micro} />
          {changing ? (
            <g>
              {/* The old face's extras fade out, the old mouth closes, then the new mouth opens */}
              <g opacity={1 - blend}>
                <Extras expression={pose.from!} t={micro.t ?? 0} />
              </g>
              <g opacity={blend}>
                <Extras expression={pose.expression} t={micro.t ?? 0} />
              </g>
              {blend < 0.5 && (
                <g transform={`${mouthMove} translate(0 -690) scale(${0.6 + 0.4 * (1 - blend * 2)} ${1 - blend * 2}) translate(0 690)`}>
                  <Mouth expression={pose.from!} open={0} uid={patternId} />
                </g>
              )}
              {blend >= 0.5 && (
                <g transform={`${mouthMove} translate(0 -690) scale(${0.6 + 0.4 * (blend * 2 - 1)} ${blend * 2 - 1}) translate(0 690)`}>
                  <Mouth expression={pose.expression} open={0} uid={patternId} />
                </g>
              )}
            </g>
          ) : (
            <g>
              <Extras expression={pose.expression} t={micro.t ?? 0} />
              <g transform={mouthMove}>
                <Mouth expression={pose.expression} open={pose.mouthOpen ?? 0} viseme={pose.viseme} uid={patternId} />
              </g>
            </g>
          )}
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
    <filter id={`${id}-soft`} x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation={4} />
    </filter>
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
const SideFace: React.FC<{ pose: PuppetPose; skin: string; uid: string }> = ({ pose, skin, uid }) => {
  // The profile switches to the new expression halfway through a change.
  const e = pose.from && (pose.blend ?? 1) < 0.5 ? pose.from : pose.expression;
  const ex = 162;
  const ey = -806;
  const look = (pose.lookX ?? 0) * 8;
  const m = pose.face ?? {};
  const browUp =
    (e === "excited" || e === "shocked" ? -12 : e === "skeptical" || e === "confused" || e === "thinking" ? -14 : e === "sad" || e === "worried" ? -10 : e === "angry" || e === "determined" || e === "disgusted" ? 6 : 0) +
    (m.brow ?? 0) +
    (m.browR ?? 0);
  const lid = m.lid ?? 0;
  const open = pose.mouthOpen ?? 0;
  const my = -690 + (m.mouthY ?? 0);
  const line = (d: string) => <path d={d} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <g>
      <line x1={128} y1={-868 + browUp} x2={196} y2={-872 + browUp + (e === "skeptical" ? -10 : 0)} stroke={INK} strokeWidth={12} strokeLinecap="round" />
      {pose.blink ? (
        <line x1={ex - 20} y1={ey} x2={ex + 20} y2={ey} stroke={INK} strokeWidth={10} strokeLinecap="round" />
      ) : e === "happy" ? (
        line(`M ${ex - 26} ${ey + 6} Q ${ex} ${ey - 24 + lid * 0.6} ${ex + 26} ${ey + 6}`)
      ) : e === "disgusted" ? (
        line(`M ${ex + 22} ${ey - 18} L ${ex - 18} ${ey} L ${ex + 22} ${ey + 18}`)
      ) : e === "excited" || e === "shocked" ? (
        <g>
          <circle cx={ex} cy={ey} r={e === "shocked" ? 42 : 36} fill="#fff" stroke={INK} strokeWidth={9} />
          <circle cx={ex + 12 + look} cy={ey + 4} r={e === "shocked" ? 8 : 14} fill={INK} />
        </g>
      ) : (
        <g>
          <circle cx={ex} cy={ey} r={34} fill="#fff" stroke={INK} strokeWidth={9} />
          <circle cx={ex + 8 + look + (PUPIL[e]?.[0] ?? 0) * 0.6} cy={ey + 4 + ((PUPIL[e]?.[1] ?? 0) + (m.lookY ?? 0)) * 0.7} r={PUPIL[e]?.[2] === 10 ? 10 : 14} fill={INK} />
          <Lid uid={uid} cx={ex} cy={ey} r={34} yl={ey + lid + LID[e][0] * 0.85} yr={ey + lid + LID[e][1] * 0.85} skin={skin} />
        </g>
      )}
      {pose.viseme ? (
        <SpeechMouth open={open} viseme={pose.viseme} y={my} x={178} scale={0.55} />
      ) : open > 0.05 ? (
        <ellipse cx={176} cy={my} rx={26} ry={10 + open * 22} fill={INK} />
      ) : e === "excited" ? (
        <g>
          <clipPath id={`${uid}-mouth`}>
            <path d={`M 102 ${my - 22} L 214 ${my - 30} Q 210 ${my + 46} 160 ${my + 54} Q 112 ${my + 46} 102 ${my - 22} Z`} />
          </clipPath>
          <path d={`M 102 ${my - 22} L 214 ${my - 30} Q 210 ${my + 46} 160 ${my + 54} Q 112 ${my + 46} 102 ${my - 22} Z`} fill={INK} />
          <g clipPath={`url(#${uid}-mouth)`}>
            <rect x={96} y={my - 40} width={124} height={34} fill="#fff" />
            <ellipse cx={160} cy={my + 46} rx={30} ry={18} fill="#e0525a" />
          </g>
          <path d={`M 102 ${my - 22} L 214 ${my - 30} Q 210 ${my + 46} 160 ${my + 54} Q 112 ${my + 46} 102 ${my - 22} Z`} fill="none" stroke={INK} strokeWidth={8} strokeLinejoin="round" />
        </g>
      ) : e === "shocked" ? (
        <ellipse cx={184} cy={my} rx={16} ry={22} fill={INK} />
      ) : e === "smug" ? (
        <path d={`M 140 ${my - 2} Q 175 ${my + 16} 208 ${my - 10}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      ) : e === "neutral" ? (
        <path d={`M 146 ${my - 6} Q 176 ${my + 20} 208 ${my - 10}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      ) : e === "sad" ? (
        <path d={`M 146 ${my + 8} Q 178 ${my - 14} 208 ${my + 10}`} fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round" />
      ) : e === "happy" ? (
        line(`M 132 ${my - 12} Q 172 ${my + 30} 212 ${my - 18}`)
      ) : e === "worried" || e === "confused" ? (
        line(`M 146 ${my + 4} Q 160 ${my - 8} 174 ${my + 2} Q 188 ${my + 12} 204 ${my - 2}`)
      ) : e === "awkward" ? (
        <rect x={146} y={my - 14} width={60} height={28} rx={10} fill="#fff" stroke={INK} strokeWidth={8} />
      ) : e === "disgusted" ? (
        <g>
          <path d={`M 168 ${my + 2} L 168 ${my + 18} Q 182 ${my + 36} 196 ${my + 18} L 196 ${my + 2} Z`} fill="#e0525a" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          {line(`M 140 ${my + 4} Q 160 ${my - 8} 178 ${my + 2} Q 196 ${my + 10} 210 ${my}`)}
        </g>
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
  const sideHair = look.long ? SIDE_LONG_HAIR_D : SIDE_HAIR_D;
  const nearArm: [number, number] = pose.armR ?? [-swing * 1.2, 14];
  const farArm: [number, number] = pose.armL ?? [swing * 1.2, 14];
  const leg = (a: number, key: string) => {
    const r = (a * Math.PI) / 180;
    const fx = Math.sin(r) * 266;
    const fy = -280 + Math.cos(r) * 266;
    return (
      <g key={key}>
        <line x1={0} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={LIMB} strokeLinecap="round" />
        <Foot x={fx + 14} y={fy - 4} />
      </g>
    );
  };
  return (
    <g transform={`scale(${pose.facing ?? 1} 1)`}>
      <LeafPattern look={look} id={patternId} />
      {pose.sit ? (
        <g>
          <polyline points="0,-280 150,-282 146,-20" fill="none" stroke={INK} strokeWidth={LIMB} strokeLinecap="round" strokeLinejoin="round" />
          <Foot x={168} y={-18} />
        </g>
      ) : (
        [leg(swing, "far"), leg(-swing, "near")]
      )}
      <g transform={`translate(0 ${bob})`}>
        <Arm x={-6} y={-552} side={1} angles={farArm} />
        <path d={SIDE_BODY} fill={look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && <path d={SIDE_BODY} fill={`url(#${patternId})`} />}
        <Cel uid={patternId} name="body" d={SIDE_BODY} />
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
          <path d={SIDE_HEAD_D} fill={look.skin} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
          <Cel uid={patternId} name="head" d={SIDE_HEAD_D} />
          {/* Long hair is one piece: over the top, the back of the head and the nape, down to the shoulders */}
          <path
            d={sideHair}
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <Cel uid={patternId} name="hair" d={sideHair} />
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -182 -858 Q -150 -1062 60 -1062 Q 240 -1044 234 -880 Q 40 -930 -182 -858 Z" fill={look.cap} />
              <ellipse cx={-212} cy={-874} rx={92} ry={22} transform="rotate(14 -212 -874)" fill={look.cap} />
            </g>
          )}
          <circle cx={-12} cy={-790} r={32} fill={look.skin} stroke={INK} strokeWidth={10} />
          <SideFace pose={pose} skin={look.skin} uid={patternId} />
          {look.glasses && <circle cx={166} cy={-804} r={50} fill="none" stroke={INK} strokeWidth={10} />}
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
  const body = BODY_D;
  const backHair = look.long
    ? "M -215 -740 C -235 -960 -100 -1040 0 -1036 C 120 -1040 235 -960 215 -740 C 228 -640 228 -580 218 -500 C 140 -470 -140 -470 -218 -500 C -228 -580 -228 -640 -215 -740 Z"
    : "M -205 -740 C -230 -960 -100 -1040 0 -1036 C 120 -1040 232 -960 205 -740 C 140 -690 -140 -690 -205 -740 Z";
  return (
    <g>
      <LeafPattern look={look} id={patternId} />
      {pose.sit ? (
        [-1, 1].map((side) => <line key={side} x1={side * 55} y1={-280} x2={side * 62} y2={-210} stroke={INK} strokeWidth={LIMB} strokeLinecap="round" />)
      ) : (
        [-1, 1].map((side) => {
          const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
          const fx = side * 55 + Math.sin(a) * 266 + side * 7;
          const fy = -280 + Math.cos(a) * 266;
          return (
            <g key={side}>
              <line x1={side * 55} y1={-280} x2={fx} y2={fy} stroke={INK} strokeWidth={LIMB} strokeLinecap="round" />
              <Foot x={fx} y={fy - 4} scale={1.05} />
            </g>
          );
        })
      )}
      <g transform={`translate(0 ${bob})`}>
        <path d={body} fill={look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && <path d={body} fill={`url(#${patternId})`} />}
        <Cel uid={patternId} name="body" d={body} />
        {(look.lanyard || look.chain) && (
          <path d="M -70 -616 Q 0 -596 70 -616" fill="none" stroke={look.lanyard ?? look.chain} strokeWidth={12} strokeLinecap="round" />
        )}
        <Arm x={-130} y={-545} side={-1} angles={armL} item={pose.hold?.hand === "L" ? pose.hold.item : undefined} />
        <Arm x={130} y={-545} side={1} angles={armR} item={pose.hold?.hand === "R" ? pose.hold.item : undefined} />
        <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
          <circle cx={-204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={0} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          <path d={backHair} fill={look.hair} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
          <Cel uid={patternId} name="hair" d={backHair} />
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
