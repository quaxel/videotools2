import React from "react";
import type { Gesture } from "./gestures";

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
  // Period dress (1870s farm folk): each is a colour, or `skirt` true for a long skirt in the outfit colour.
  skirt?: boolean; // ankle-length flared skirt (the feet show under the hem)
  apron?: string; // bib apron over the dress
  kerchief?: string; // cloth tied over the hair, knot at the nape
  hat?: string; // wide-brimmed, low-crowned felt or straw hat
  beard?: string; // full short beard round the jaw (the mouth shows over it)
  vest?: string; // waistcoat over the shirt (the outfit colour shows down the front)
  suspenders?: string; // braces over the shoulders
  hatStyle?: "wide" | "bowler" | "boater" | "helmet" | "stahl" | "crown" | "shako"; // shape of `hat`: wide felt brim (default), round bowler, flat straw boater, WWII M1 steel helmet, flared coal-scuttle helmet, a king's gold crown (sits on the hair), a palace guard's tall plumed shako
  shorts?: string; // athletic shorts to mid-thigh (runners)
  bib?: string; // race number on a white cloth bib, front and back (e.g. "31")
  pants?: string; // trouser colour: a coloured leg inside the ink outline (default: plain ink legs)
  shoes?: string; // shoe colour: a coloured sneaker inside the ink outline
  iris?: string; // iris colour: a coloured ring round the pupil (default: plain black dots); pose `gold` turns it glowing gold
};

// Pants and shoe colours reach every Leg and Foot through context, so the front, side and back views share them.
const WearCtx = React.createContext<{ pants?: string; shoes?: string }>({});

export type PuppetPose = {
  expression: Expression;
  blink?: boolean;
  mouthOpen?: number; // 0..1, used while talking
  gold?: number; // 0..1 the iris (look.iris) glows gold: eagle eyes
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
  lean?: number; // degrees the upper body tips from the hips, + toward screen right
  slump?: number; // 1 = shoulders and head sink (sad, bored), -1 = chest up and shoulders raised (proud, shrug)
  reachL?: [number, number]; // put the screen-left hand at this point (puppet units); overrides armL
  reachR?: [number, number];
  frontL?: boolean; // draw the arm over the body and head (crossed arms, hand on chin, facepalm)
  frontR?: boolean;
  handL?: HandShape;
  handR?: HandShape;
  gesture?: Gesture; // a ready-made body pose from gestures.ts (animated by Stage); fields set here win over it
  fromGesture?: Gesture; // with blend < 1, the gesture being left (see moveChange in engine/anim.ts)
  crouch?: number; // 0..1 knees bend and the hips sink (feet stay put); with `air` it tucks the legs in a jump
  air?: number; // units the whole puppet is off the ground (jumps)
  bend?: number; // 0..1 bend forward at the hips (toward the camera in front view, toward `facing` in profile)
  seat?: number; // 0..1 legs between standing and seated (sitting down / getting up); `sit` is the same as 1
  lie?: number; // 0..1 tip over onto the back, head to screen-left (sleeping, fainting); 1 = flat on the floor
  sleep?: boolean; // eyes shut in sleep, a slack mouth and floating "z"s
  crawl?: number; // on hands and knees in profile; the number is the crawl cycle phase (frames)
  stride?: number; // walk cycle phase (frames; `walk` sets it): the swinging leg lifts its foot and bends its knee
  bodyBlend?: number; // like blend, for the body during a moveChange; may dip below 0 and run past 1 (anticipation, overshoot)
  stepLift?: number; // how high a walking foot lifts (1 = normal, 0.3 = a dragging shuffle)
  armSwing?: number; // walking arms swing against the legs this much (1 = normal); arms you set yourself are kept
  squash?: number; // + squashes (landing, sitting down hard), - stretches (take-off); keeps the volume, feet stay put
  hair?: { lift?: number; sway?: number }; // soft hair trailing the body: lift (units, + floats up), sway (degrees)
};

// ---------- period costume pieces (drawn in the puppet's own units, front view unless named Side/Back) ----------

const SKIRT_D = (hem: number) => `M -150 -380 C -175 -250 -212 ${hem - 80} -236 ${hem} Q 0 ${hem + 26} 236 ${hem} C 212 ${hem - 80} 175 -250 150 -380 Z`;
const SIDE_SKIRT_D = (hem: number) => `M -124 -380 C -150 -250 -178 ${hem - 80} -196 ${hem} Q 10 ${hem + 22} 210 ${hem} C 186 ${hem - 80} 152 -250 128 -380 Z`;
const HAT_CROWN_D = "M -168 -930 C -176 -1030 -140 -1092 0 -1094 C 140 -1092 176 -1030 168 -930 Z";
const SIDE_HAT_CROWN_D = "M -150 -930 C -156 -1030 -110 -1092 26 -1094 C 166 -1092 206 -1030 200 -930 Z";
const KERCHIEF_D = "M -214 -828 C -236 -1000 -110 -1056 0 -1056 C 110 -1056 236 -1000 214 -828 C 160 -900 80 -930 0 -930 C -80 -930 -160 -900 -214 -828 Z";
const SIDE_KERCHIEF_D = "M -186 -820 C -206 -990 -86 -1060 30 -1058 C 160 -1052 240 -968 230 -884 C 150 -912 50 -914 -40 -880 C -100 -858 -150 -836 -186 -820 Z";
const BACK_KERCHIEF_D = "M -214 -790 C -236 -990 -110 -1058 0 -1058 C 110 -1058 236 -990 214 -790 C 140 -740 -140 -740 -214 -790 Z";
const BEARD_D = "M -198 -770 C -196 -630 -110 -556 0 -552 C 110 -556 196 -630 198 -770 C 168 -706 120 -664 62 -660 L -62 -660 C -120 -664 -168 -706 -198 -770 Z";
const SIDE_BEARD_D = "M -40 -812 C -70 -690 10 -582 120 -572 C 186 -574 224 -620 230 -690 C 200 -660 160 -652 132 -668 C 96 -692 50 -730 22 -800 Z";

// Hair under a hat: only what hangs below the brim shows.
const UnderHat: React.FC<{ id: string; on: boolean; children: React.ReactNode }> = ({ id, on, children }) =>
  on ? (
    <g>
      <clipPath id={`${id}-underhat`}>
        <rect x={-600} y={-936} width={1200} height={900} />
      </clipPath>
      <g clipPath={`url(#${id}-underhat)`}>{children}</g>
    </g>
  ) : (
    <>{children}</>
  );

const Inked: React.FC<{ d: string; fill: string; uid: string; name: string; width?: number }> = ({ d, fill, uid, name, width = STROKE }) => (
  <g>
    <path d={d} fill={fill} stroke={INK} strokeWidth={width} strokeLinejoin="round" />
    <Cel uid={uid} name={name} d={d} />
  </g>
);

// A strap drawn as a coloured band with an ink edge.
const Strap: React.FC<{ d: string; color: string; w?: number }> = ({ d, color, w = 22 }) => (
  <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} stroke={INK} strokeWidth={w + 12} />
    <path d={d} stroke={color} strokeWidth={w} />
  </g>
);

// Waistcoat front: the shirt (outfit colour) shows in a V down the middle, three buttons on the edge.
const VestFront: React.FC<{ shirt: string }> = ({ shirt }) => (
  <g>
    <path d="M -50 -622 L 50 -622 L 24 -330 L 0 -296 L -24 -330 Z" fill={shirt} stroke={INK} strokeWidth={8} strokeLinejoin="round" />
    {[-520, -450, -380].map((y) => (
      <circle key={y} cx={-30 + (y + 520) * 0.04} cy={y} r={9} fill={INK} />
    ))}
  </g>
);

const ApronFront: React.FC<{ color: string; hem: number; uid: string }> = ({ color, hem, uid }) => {
  const d = `M -84 -566 L 84 -566 L 92 -392 L 128 -380 C 140 -280 150 ${hem - 60} 156 ${hem + 4} Q 0 ${hem + 22} -156 ${hem + 4} C -150 ${hem - 60} -140 -280 -128 -380 L -92 -392 Z`;
  return (
    <g>
      <Strap d="M -80 -560 L -56 -624" color={color} w={14} />
      <Strap d="M 80 -560 L 56 -624" color={color} w={14} />
      <Inked d={d} fill={color} uid={uid} name="apron" width={9} />
      <path d="M -150 -386 Q 0 -372 150 -386" fill="none" stroke={INK} strokeWidth={8} />
      <path d="M -60 -470 L 60 -470" stroke={INK} strokeWidth={6} opacity={0.35} />
    </g>
  );
};

const BOWLER_CROWN_D = "M -150 -930 C -164 -1040 -96 -1088 0 -1088 C 96 -1088 164 -1040 150 -930 Z";
const BOATER_CROWN_D = "M -168 -932 L -166 -1018 Q 0 -1034 166 -1018 L 168 -932 Z";

// WWII steel helmets: a round M1 dome with a rolled rim, and the flared coal-scuttle shape (skirt over the ears).
const M1_FRONT_D = "M -238 -878 C -244 -1012 -152 -1090 0 -1092 C 152 -1090 244 -1012 238 -878 Q 0 -912 -238 -878 Z";
const STAHL_FRONT_D = "M -262 -806 L -226 -890 C -232 -1014 -150 -1086 0 -1088 C 150 -1086 232 -1014 226 -890 L 262 -806 Q 220 -836 190 -872 Q 0 -914 -190 -872 Q -220 -836 -262 -806 Z";
const M1_SIDE_D = "M -214 -868 C -218 -1030 -116 -1096 30 -1096 C 186 -1094 252 -1012 248 -878 Q 20 -912 -214 -868 Z";
const STAHL_SIDE_D = "M -250 -770 L -214 -884 C -210 -1032 -112 -1092 30 -1092 C 186 -1090 246 -1012 240 -900 L 266 -876 Q 40 -916 -150 -872 L -250 -770 Z";

const Helmet: React.FC<{ color: string; uid: string; d: string; rim: string }> = ({ color, uid, d, rim }) => (
  <g>
    <Inked d={d} fill={color} uid={uid} name="helmet" />
    <path d={rim} fill="none" stroke={INK} strokeWidth={9} opacity={0.45} strokeLinecap="round" />
    <path d="M -110 -1040 Q -40 -1074 40 -1070" fill="none" stroke="#fff" strokeWidth={20} strokeLinecap="round" opacity={0.22} />
  </g>
);

// A king's crown: a gold band with five points and jewels, sitting on top of the hair (the hair is not clipped).
const CROWN_D = "M -150 -952 L -164 -1072 L -110 -1028 L -62 -1108 L -22 -1036 L 0 -1124 L 22 -1036 L 62 -1108 L 110 -1028 L 164 -1072 L 150 -952 Q 0 -976 -150 -952 Z";
const Crown: React.FC<{ color: string; uid: string; dx?: number }> = ({ color, uid, dx = 0 }) => (
  <g transform={`translate(${dx} 0)`}>
    <Inked d={CROWN_D} fill={color} uid={uid} name="crown" />
    <path d="M -152 -990 Q 0 -1012 152 -990" fill="none" stroke={INK} strokeWidth={8} opacity={0.5} />
    {[-164, -62, 0, 62, 164].map((x, i) => (
      <circle key={i} cx={x} cy={[-1074, -1110, -1126, -1110, -1074][i]} r={16} fill="#f7f0d8" stroke={INK} strokeWidth={6} />
    ))}
    <circle cx={0} cy={-970} r={24} fill="#c8102e" stroke={INK} strokeWidth={7} />
    <circle cx={-90} cy={-966} r={15} fill="#1d5fd0" stroke={INK} strokeWidth={6} />
    <circle cx={90} cy={-966} r={15} fill="#1d5fd0" stroke={INK} strokeWidth={6} />
    <path d="M -120 -1000 Q -60 -1014 -10 -1012" fill="none" stroke="#fff" strokeWidth={14} strokeLinecap="round" opacity={0.35} />
  </g>
);

// A palace guard's shako: a tall drum with a gold band, a black visor and a white plume.
const SHAKO_D = "M -176 -930 L -162 -1110 Q 0 -1128 162 -1110 L 176 -930 Q 0 -950 -176 -930 Z";
const Shako: React.FC<{ color: string; uid: string; dx?: number }> = ({ color, uid, dx = 0 }) => (
  <g transform={`translate(${dx} 0)`}>
    <path d="M -10 -1112 C -56 -1180 -30 -1240 20 -1256 C 10 -1214 46 -1166 30 -1112 Z" fill="#f7f4ea" stroke={INK} strokeWidth={9} strokeLinejoin="round" />
    <Inked d={SHAKO_D} fill={color} uid={uid} name="shako" />
    <path d="M -172 -980 Q 0 -1000 172 -980 L 170 -952 Q 0 -972 -170 -952 Z" fill="#e8b84a" stroke={INK} strokeWidth={7} />
    <path d="M -166 -1092 Q 0 -1110 166 -1092" fill="none" stroke="#e8b84a" strokeWidth={14} />
    <circle cx={0} cy={-1036} r={28} fill="#e8b84a" stroke={INK} strokeWidth={7} />
    <path d="M -186 -934 Q 0 -960 186 -934 Q 150 -900 0 -902 Q -150 -900 -186 -934 Z" fill={INK} />
  </g>
);

const HatFront: React.FC<{ color: string; uid: string; style?: PuppetLook["hatStyle"] }> = ({ color, uid, style = "wide" }) => {
  if (style === "helmet") return <Helmet color={color} uid={uid} d={M1_FRONT_D} rim="M -226 -900 Q 0 -932 226 -900" />;
  if (style === "stahl") return <Helmet color={color} uid={uid} d={STAHL_FRONT_D} rim="M -214 -902 Q 0 -936 214 -902" />;
  if (style === "crown") return <Crown color={color} uid={uid} />;
  if (style === "shako") return <Shako color={color} uid={uid} />;
  const crown = style === "bowler" ? BOWLER_CROWN_D : style === "boater" ? BOATER_CROWN_D : HAT_CROWN_D;
  const brim = style === "bowler" ? 222 : style === "boater" ? 262 : 292;
  return (
    <g>
      <Inked d={crown} fill={color} uid={uid} name="hat" />
      {style === "boater" ? (
        <path d="M -167 -972 Q 0 -986 167 -972 L 168 -936 Q 0 -950 -168 -936 Z" fill="#2a3a6a" />
      ) : (
        <path d="M -170 -968 Q 0 -984 170 -968 L 168 -932 Q 0 -948 -168 -932 Z" fill={INK} opacity={0.55} />
      )}
      {style === "boater" && <ellipse cx={0} cy={-1020} rx={166} ry={18} fill={color} stroke={INK} strokeWidth={9} />}
      <ellipse cx={0} cy={-934} rx={brim} ry={style === "bowler" ? 24 : 32} fill={color} stroke={INK} strokeWidth={STROKE} />
      <path d={`M ${-brim + 22} -924 Q 0 -896 ${brim - 22} -924`} fill="none" stroke={SHADE} strokeWidth={10} opacity={0.25} />
    </g>
  );
};

// A white cloth race bib with a big black number, pinned on the chest (or the back).
const Bib: React.FC<{ text: string; x?: number; w?: number }> = ({ text, x = 0, w = 150 }) => (
  <g>
    <rect x={x - w / 2} y={-540} width={w} height={118} rx={6} fill="#f7f4ea" stroke={INK} strokeWidth={8} />
    <text x={x} y={-452} textAnchor="middle" fontFamily="Arial Black, Impact, sans-serif" fontWeight={900} fontSize={w * 0.55} fill="#161212">
      {text}
    </text>
  </g>
);

const SHORTS_D = "M -128 -310 L 128 -310 L 140 -168 L 22 -168 L 0 -226 L -22 -168 L -140 -168 Z";
const SIDE_SHORTS_D = "M -112 -310 L 112 -310 L 126 -176 L -108 -176 Z";

// How loose hair hangs for `hair`: it swings from the crown and its ends float up (or drop) with `lift`.
const hairMove = (h: PuppetPose["hair"], k = 1) => {
  const lift = Math.max(-60, Math.min(160, (h?.lift ?? 0) * k));
  return `rotate(${(h?.sway ?? 0) * k} 0 -950) translate(0 -1000) scale(1 ${1 - lift / 500}) translate(0 1000)`;
};

export type HandShape = "open" | "point" | "fist";

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
const Hand: React.FC<{ x: number; y: number; side: 1 | -1; angle: number; shape?: HandShape }> = ({ x, y, side, angle, shape = "open" }) =>
  shape === "fist" ? (
    <g transform={`translate(${x} ${y}) rotate(${-side * angle}) scale(1.17)`}>
      <ellipse cx={0} cy={8} rx={30} ry={30} fill={INK} />
    </g>
  ) : shape === "point" ? (
    // Index finger straight out along the forearm, the thumb tucked up.
    <g transform={`translate(${x} ${y}) rotate(${-side * angle}) scale(1.17)`}>
      <g stroke={INK} strokeLinecap="round" fill="none">
        <line x1={0} y1={10} x2={0} y2={60} strokeWidth={20} />
        <line x1={side * 14} y1={-4} x2={side * 30} y2={6} strokeWidth={20} />
      </g>
      <ellipse cx={0} cy={4} rx={27} ry={26} fill={INK} />
    </g>
  ) : (
  <g transform={`translate(${x} ${y}) rotate(${-side * angle}) scale(1.17)`}>
    <g stroke={INK} strokeLinecap="round" fill="none">
      <line x1={0} y1={12} x2={0} y2={22} strokeWidth={52} />
      <line x1={side * 14} y1={-6} x2={side * 34} y2={2} strokeWidth={27} />
    </g>
    <ellipse cx={0} cy={0} rx={27} ry={26} fill={INK} />
  </g>
  );

// Simple rounded foot.
const Foot: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1.3 }) => {
  const { shoes } = React.useContext(WearCtx);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-38} y={-14} width={76} height={36} rx={18} fill={INK} />
      {shoes && (
        <>
          <rect x={-31} y={-8} width={62} height={24} rx={12} fill={shoes} />
          <rect x={-31} y={10} width={62} height={7} rx={3.5} fill="#d9d4cc" />
        </>
      )}
    </g>
  );
};

const THIGH = 133;
const SHIN = 133;

// Two-bone leg from hip to foot: the knee bends toward (kx, ky) (outward in front view, forward in profile).
const knee = (hx: number, hy: number, fx: number, fy: number, kx: number, ky: number): [number, number] => {
  const dx = fx - hx;
  const dy = fy - hy;
  const d = Math.min(THIGH + SHIN - 0.5, Math.max(1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const off = Math.acos(Math.min(1, (THIGH * THIGH + d * d - SHIN * SHIN) / (2 * THIGH * d)));
  const cand = [base + off, base - off].map((a) => [hx + Math.cos(a) * THIGH, hy + Math.sin(a) * THIGH] as [number, number]);
  return cand.sort((p, q) => (q[0] - hx) * kx + (q[1] - hy) * ky - ((p[0] - hx) * kx + (p[1] - hy) * ky))[0];
};
const Leg: React.FC<{ pts: [number, number][]; foot: [number, number]; footScale?: number }> = ({ pts, foot, footScale }) => {
  const { pants } = React.useContext(WearCtx);
  const d = pts.map((p) => p.join(",")).join(" ");
  return (
    <g>
      <polyline points={d} fill="none" stroke={INK} strokeWidth={LIMB} strokeLinecap="round" strokeLinejoin="round" />
      {pants && <polyline points={d} fill="none" stroke={pants} strokeWidth={LIMB - 10} strokeLinecap="round" strokeLinejoin="round" />}
      <Foot x={foot[0]} y={foot[1]} scale={footScale} />
    </g>
  );
};
// Straight back-view leg (a line from the hip), with the pants colour inside the outline.
const BackLeg: React.FC<{ x1: number; y1: number; x2: number; y2: number }> = ({ x1, y1, x2, y2 }) => {
  const { pants } = React.useContext(WearCtx);
  return (
    <>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={LIMB} strokeLinecap="round" />
      {pants && <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={pants} strokeWidth={LIMB - 10} strokeLinecap="round" />}
    </>
  );
};
const lerp2 = (a: [number, number], b: [number, number], t: number): [number, number] => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

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

const UPPER = 130;
const LOWER = 120;

// Two-bone reach: the elbow and hand for a hand placed at (tx, ty), the elbow bending outward and down.
const reachArm = (x: number, y: number, side: 1 | -1, tx: number, ty: number) => {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.min(UPPER + LOWER - 1, Math.max(Math.abs(UPPER - LOWER) + 1, Math.hypot(dx, dy)));
  const base = Math.atan2(dy, dx);
  const off = Math.acos((UPPER * UPPER + d * d - LOWER * LOWER) / (2 * UPPER * d));
  // Of the two elbow positions, take the one further out to this arm's side (then lower).
  const cand = [base + off, base - off].map((a) => [x + Math.cos(a) * UPPER, y + Math.sin(a) * UPPER] as [number, number]);
  const [ex, ey] = cand.sort((p, q) => side * (q[0] - p[0]) + (q[1] - p[1]) * 0.3)[0];
  const hx = ex + ((tx - ex) / Math.hypot(tx - ex, ty - ey)) * LOWER;
  const hy = ey + ((ty - ey) / Math.hypot(tx - ex, ty - ey)) * LOWER;
  return { ex, ey, hx, hy };
};

const Arm: React.FC<{ x: number; y: number; side: 1 | -1; angles: [number, number]; reach?: [number, number]; hand?: HandShape; item?: HeldItem; tilt?: number; drop?: number }> = ({
  x,
  y,
  side,
  angles,
  reach,
  hand,
  item,
  tilt = 0,
  drop,
}) => {
  const [shoulder, elbow] = angles;
  // Angles open outward, away from the body.
  const a1 = (shoulder * Math.PI) / 180;
  const a2 = ((shoulder + elbow) * Math.PI) / 180;
  const { ex, ey, hx, hy } = reach
    ? reachArm(x, y, side, reach[0], reach[1])
    : (() => {
        const ex = x + side * Math.sin(a1) * UPPER;
        const ey = y + Math.cos(a1) * UPPER;
        return { ex, ey, hx: ex + side * Math.sin(a2) * LOWER, hy: ey + Math.cos(a2) * LOWER };
      })();
  // Forearm direction as an angle from straight down, outward positive (what Hand expects).
  const fore = (Math.atan2(side * (hx - ex), hy - ey) * 180) / Math.PI;
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
      <Hand x={hx} y={hy} side={side} angle={fore} shape={hand} />
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

const hex = (c: string): [number, number, number] => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
const mixHex = (a: string, b: string, t: number) => {
  const A = hex(a);
  const B = hex(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(",")})`;
};

const Eyes: React.FC<{ expression: Expression; from?: Expression; blend: number; blink: boolean; asleep?: boolean; lookX: number; skin: string; uid: string; micro: FaceMicro; iris?: string; gold?: number }> = ({
  iris,
  gold = 0,
  expression,
  asleep,
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
  if (asleep) {
    // Asleep: soft closed curves.
    return (
      <g fill="none" stroke={INK} strokeWidth={11} strokeLinecap="round">
        {xs.map((x) => (
          <path key={x} d={`M ${x - 30} ${y - 2} Q ${x} ${y + 16} ${x + 30} ${y - 2}`} />
        ))}
      </g>
    );
  }
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
            {iris && (
              <>
                {gold > 0.05 && <circle cx={x + px + mix(A.px, B.px, t)} cy={y + 4 + mix(A.py, B.py, t) + (micro.lookY ?? 0)} r={r * 0.9} fill="#ffe27a" opacity={0.7 * gold} />}
                <circle cx={x + px + mix(A.px, B.px, t)} cy={y + 4 + mix(A.py, B.py, t) + (micro.lookY ?? 0)} r={r * 0.68} fill={mixHex(iris, "#ffc21a", gold)} stroke={mixHex("#3a2210", "#ff9a00", gold)} strokeWidth={4} />
              </>
            )}
            <circle cx={x + px + mix(A.px, B.px, t)} cy={y + 4 + mix(A.py, B.py, t) + (micro.lookY ?? 0)} r={mix(A.pr, B.pr, t) + (iris ? 3 : 0)} fill={INK} />
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
  // Lying down, the arms settle along the body.
  const lying = Math.max(0, Math.min(1, pose.lie ?? 0));
  const rest = (a: [number, number] | undefined): [number, number] => {
    const [x, y] = a ?? [12, 10];
    return [x + (4 - x) * lying, y + (2 - y) * lying];
  };
  // Walking arms seen from the front swing toward and away from the camera: the forward arm bends at the elbow and
  // its hand comes up, the back arm hangs straight. They swing against the legs (right leg forward = left arm forward).
  const swingArm = (side: -1 | 1): [number, number] | undefined => {
    if (!pose.armSwing) return undefined;
    const fwd = -((pose.legSwing ?? 0) / 20) * side * pose.armSwing;
    return [10 - Math.max(0, -fwd) * 4, 12 + Math.max(0, fwd) * 46];
  };
  const armL = rest(pose.armL ?? swingArm(-1));
  const armR = rest(pose.armR ?? swingArm(1));
  const patternId = `leaf-${id}`;
  const micro = pose.face ?? {};
  const slump = pose.slump ?? 0;
  const crouch = Math.max(0, Math.min(1, pose.crouch ?? 0));
  const drop = crouch * 150; // hips sink this far
  const bend = Math.max(0, Math.min(1, pose.bend ?? 0));
  const k = 1 - 0.55 * bend; // bending toward the camera foreshortens the torso
  const sh = -280 + (-265 + slump * 22) * k; // shoulder height
  const headDrop = slump * 34 + 520 * (1 - k);
  const head = `translate(0 ${headDrop}) rotate(${pose.headTilt ?? 0} 0 -640) translate(0 -800) scale(${1 + 0.18 * bend}) translate(0 800)`;
  const torso = `translate(0 -280) scale(${1 + 0.06 * bend} ${k}) translate(0 280)`;
  const seat = pose.sit ? 1 : Math.max(0, Math.min(1, pose.seat ?? 0));
  const arm = (side: "L" | "R") => {
    const s = side === "L" ? -1 : 1;
    const held = pose.hold?.hand === side;
    return (
      <Arm
        x={s * 130}
        y={sh}
        side={s}
        angles={side === "L" ? armL : armR}
        reach={lying > 0.3 ? undefined : side === "L" ? pose.reachL : pose.reachR}
        hand={side === "L" ? pose.handL : pose.handR}
        item={held ? pose.hold!.item : undefined}
        tilt={held ? pose.itemTilt : undefined}
        drop={held ? pose.coinDrop : undefined}
      />
    );
  };
  // Holding arms and front arms come over the body; the rest hang behind it.
  const inFront = (side: "L" | "R") => pose.hold?.hand === side || (side === "L" ? pose.frontL : pose.frontR);
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

      {/* Legs: swing from the hips, bend at the knee when crouching, fold toward the camera when seated */}
      <g transform={`translate(0 ${-(pose.air ?? 0)})`}>
        {[-1, 1].map((side) => {
          if (pose.stride !== undefined && seat === 0) {
            // Walking toward (or away from) the camera: the legs step forward and back, not out to the sides. The
            // forward foot lands lower on the screen and a little bigger, the back foot higher and smaller; the
            // swinging leg lifts its foot and its knee comes forward. depth +1 = right leg fully forward.
            const depth = ((pose.legSwing ?? 0) / 20) * side;
            const lift = Math.max(0, Math.cos(pose.stride / 3) * side) ** 1.5 * 54 * (pose.stepLift ?? 1);
            const hip: [number, number] = [side * 55, -280 + drop - depth * 6];
            const foot: [number, number] = [side * 60, -14 + depth * 26 - lift];
            const kn = lift > 1 ? knee(hip[0], hip[1], foot[0], foot[1], side * 0.5, 0.4) : lerp2(hip, foot, 0.5);
            return <Leg key={side} pts={[hip, kn, foot]} foot={[foot[0] + side * 6, foot[1] - 4]} footScale={1.3 * (1 + 0.12 * depth)} />;
          }
          const hip: [number, number] = [side * 55, -280 + drop];
          const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
          const lift = 0;
          const standFoot: [number, number] = [side * 55 + Math.sin(a) * 266 + side * 7 + side * crouch * 24, -280 + Math.cos(a) * 266 - lift];
          // Standing and seated outlines, mixed by `seat`.
          const standKnee = crouch > 0 || lift > 0 ? knee(hip[0], hip[1], standFoot[0], standFoot[1], side, 0.2) : lerp2(hip, standFoot, 0.5);
          const seated: [number, number][] = [[side * 55, -280], [side * 92, -236], [side * 84, -18]];
          const pts = [hip, standKnee, standFoot].map((p, i) => lerp2(p, seated[i], seat));
          const foot = lerp2([standFoot[0] + side * 8, standFoot[1] - 4], [side * 96, -16], seat);
          return <Leg key={side} pts={pts} foot={foot} />;
        })}
      </g>

      <g transform={`translate(0 ${bob + drop - (pose.air ?? 0)}) rotate(${pose.lean ?? 0} 0 -280)`}>
        {/* Long hair hangs behind the body (and the arms), so none of it shows under the chin */}
        {look.long && (
          <g transform={`${head} ${hairMove(pose.hair)}`}>
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
        {look.shorts && <Inked d={SHORTS_D} fill={look.shorts} uid={patternId} name="shorts" width={10} />}
        {/* A long skirt hangs from the waist over the legs (behind the arms, so hanging hands stay in sight) */}
        {look.skirt && <Inked d={SKIRT_D(-66 - drop)} fill={look.outfit} uid={patternId} name="skirt" />}
        {/* Arms behind the body */}
        {!inFront("L") && arm("L")}
        {!inFront("R") && arm("R")}

        <g transform={torso}>
        {/* Bean body */}
        <path
          d={BODY_D}
          fill={look.vest ?? look.outfit}
          stroke={INK}
          strokeWidth={STROKE}
        />
        {look.pattern && !look.vest && (
          <path
            d={BODY_D}
            fill={`url(#${patternId})`}
          />
        )}
        <Cel uid={patternId} name="body" d={BODY_D} />
        {look.vest && <VestFront shirt={look.outfit} />}
        {look.suspenders && (
          <g>
            <Strap d="M -92 -612 L -74 -272" color={look.suspenders} />
            <Strap d="M 92 -612 L 74 -272" color={look.suspenders} />
          </g>
        )}
        {look.apron && <ApronFront color={look.apron} hem={look.skirt ? -110 - drop : -300} uid={patternId} />}
        {look.bib && <Bib text={look.bib} />}
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
        </g>
        {/* A holding arm comes in front of the body so the item shows */}
        {pose.hold?.hand === "L" && arm("L")}
        {pose.hold?.hand === "R" && arm("R")}

        {/* Head */}
        <g transform={head}>
          <circle cx={0} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          {/* The bangs cast a shadow on the forehead */}
          <Cel
            uid={patternId}
            name="head"
            d={circD(0, -800, 205)}
            extra={<path d={BANGS_D} transform="translate(0 30)" fill={SHADE} opacity={0.22} filter={`url(#${patternId}-soft)`} />}
          />
          {look.beard && <Inked d={BEARD_D} fill={look.beard} uid={patternId} name="beard" />}
          {/* Messy hair */}
          <UnderHat id={patternId} on={!!look.hat && look.hatStyle !== "crown"}>
          <g transform={`translate(0 ${-Math.max(-20, Math.min(40, (pose.hair?.lift ?? 0) * 0.12))})`}>
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
          </g>
          </UnderHat>
          {look.kerchief && <Inked d={KERCHIEF_D} fill={look.kerchief} uid={patternId} name="kerchief" />}
          {look.hat && <HatFront color={look.hat} uid={patternId} style={look.hatStyle} />}
          {look.cap && (
            <g stroke={INK} strokeWidth={STROKE} strokeLinejoin="round">
              <path d="M -204 -850 Q -196 -1056 0 -1060 Q 196 -1056 204 -850 Q 0 -900 -204 -850 Z" fill={look.cap} />
              <ellipse cx={-196} cy={-872} rx={78} ry={24} transform={`rotate(${-28 + (pose.swing ?? 0) * 0.6} -150 -860)`} fill={look.cap} />
              <circle cx={0} cy={-1058} r={14} fill={look.cap} />
            </g>
          )}
          <Brows expression={pose.expression} from={pose.from} blend={blend} micro={micro} />
          <Eyes expression={pose.expression} from={pose.from} blend={blend} blink={pose.blink ?? false} asleep={pose.sleep} lookX={pose.lookX ?? 0} skin={look.skin} uid={patternId} micro={micro} iris={look.iris} gold={pose.gold} />
          {pose.sleep ? (
            <ellipse cx={0} cy={-680} rx={16} ry={11 + Math.sin((micro.t ?? 0) / 14) * 3} fill={INK} />
          ) : changing ? (
            <g>
              {/* The old face's extras fade out, the old mouth closes, then the new mouth opens. The squash never reaches 0:
                  a zero scale is a non-invertible transform, which crashes Chrome's GPU raster and takes the WebGL canvas with it */}
              <g opacity={1 - blend}>
                <Extras expression={pose.from!} t={micro.t ?? 0} />
              </g>
              <g opacity={blend}>
                <Extras expression={pose.expression} t={micro.t ?? 0} />
              </g>
              {blend < 0.5 && (
                <g transform={`${mouthMove} translate(0 -690) scale(${0.6 + 0.4 * (1 - blend * 2)} ${Math.max(0.02, 1 - blend * 2)}) translate(0 690)`}>
                  <Mouth expression={pose.from!} open={0} uid={patternId} />
                </g>
              )}
              {blend >= 0.5 && (
                <g transform={`${mouthMove} translate(0 -690) scale(${0.6 + 0.4 * (blend * 2 - 1)} ${Math.max(0.02, blend * 2 - 1)}) translate(0 690)`}>
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
        {/* Arms that cross the body or touch the face */}
        {pose.frontL && pose.hold?.hand !== "L" && arm("L")}
        {pose.frontR && pose.hold?.hand !== "R" && arm("R")}
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
      {pose.blink || pose.sleep ? (
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
  const crawling = pose.crawl !== undefined;
  const cyc = crawling ? Math.sin((pose.crawl ?? 0) / 6) : 0;
  // On all fours the torso tips nearly flat and the hips come down to knee-on-the-floor height.
  const crouch = crawling ? 0 : Math.max(0, Math.min(1, pose.crouch ?? 0));
  const drop = crawling ? 78 : crouch * 130;
  const tip = crawling ? 72 : Math.max(0, Math.min(1, pose.bend ?? 0)) * 70 + crouch * 32;
  const seat = pose.sit ? 1 : Math.max(0, Math.min(1, pose.seat ?? 0));
  // Crouching (and halfway down to a seat) pushes the hips back so the knees come out in front of the body.
  const back = crawling ? 0 : -(crouch * 120 + Math.sin(seat * Math.PI) * 70);
  const sw = pose.armSwing ?? 1;
  const nearArm: [number, number] = crawling ? [62 - cyc * 14, 26] : pose.armR ?? [-swing * 1.2 * sw, 14 + Math.max(0, -swing) * sw];
  const farArm: [number, number] = crawling ? [62 + cyc * 14, 26] : pose.armL ?? [swing * 1.2 * sw, 14 + Math.max(0, swing) * sw];
  const leg = (a: number, key: string, phase: number) => {
    const hip: [number, number] = [back, -280 + drop];
    if (crawling) {
      // Knee on the floor under the hip, shin trailing behind.
      const kn: [number, number] = [phase * 30 - 10, -36];
      const foot: [number, number] = [kn[0] - 128, -18];
      return <Leg key={key} pts={[hip, kn, foot]} foot={[foot[0] - 8, foot[1] - 4]} footScale={1.1} />;
    }
    const r = (a * Math.PI) / 180;
    // Walking: the leg swinging forward (the far leg while cos(stride / 3) > 0) lifts its foot, so its knee bends.
    const lift = pose.stride !== undefined ? Math.max(0, Math.cos(pose.stride / 3) * (phase >= 0 ? 1 : -1)) * 46 * (pose.stepLift ?? 1) : 0;
    const standFoot: [number, number] = [Math.sin(r) * 266 + crouch * 70, -280 + Math.cos(r) * 266 - lift];
    const standKnee = crouch > 0 || lift > 0 ? knee(hip[0], hip[1], standFoot[0], standFoot[1], 1, -0.6) : lerp2(hip, standFoot, 0.5);
    const seated: [number, number][] = [[0, -280], [150, -282], [146, -20]];
    const pts = [hip, standKnee, standFoot].map((p, i) => lerp2(p, seated[i], seat));
    // Halfway between standing and seated the knee pokes forward instead of collapsing onto the hip.
    if (seat > 0 && seat < 1) pts[1] = knee(pts[0][0], pts[0][1], pts[2][0], pts[2][1], 1, 0);
    return <Leg key={key} pts={pts} foot={lerp2([standFoot[0] + 14, standFoot[1] - 4], [168, -18], seat)} />;
  };
  return (
    <g transform={`scale(${pose.facing ?? 1} 1)`}>
      <LeafPattern look={look} id={patternId} />
      <g transform={`translate(0 ${-(pose.air ?? 0)})`}>{[leg(swing, "far", crawling ? -cyc : 1), leg(-swing, "near", crawling ? cyc : -1)]}</g>
      <g transform={`translate(${back} ${bob + drop - (pose.air ?? 0)}) rotate(${tip + Math.sin(seat * Math.PI) * 18} 0 -280)`}>
        <Arm x={-6} y={-552} side={1} angles={farArm} />
        {look.shorts && <Inked d={SIDE_SHORTS_D} fill={look.shorts} uid={patternId} name="shorts" width={10} />}
        <path d={SIDE_BODY} fill={look.vest ?? look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && !look.vest && <path d={SIDE_BODY} fill={`url(#${patternId})`} />}
        <Cel uid={patternId} name="body" d={SIDE_BODY} />
        {look.skirt && <Inked d={SIDE_SKIRT_D(-66 - drop)} fill={look.outfit} uid={patternId} name="skirt" />}
        {look.vest && <path d="M 96 -622 L 136 -560 C 146 -480 146 -400 136 -330 L 100 -330 Z" fill={look.outfit} stroke={INK} strokeWidth={8} strokeLinejoin="round" />}
        {look.suspenders && <Strap d="M 30 -628 L 22 -272" color={look.suspenders} />}
        {look.bib && <Bib text={look.bib} x={70} w={96} />}
        {look.apron && (
          <g>
            <Strap d="M 104 -566 L 60 -628" color={look.apron} w={14} />
            <Inked
              d={`M 98 -566 L 140 -566 C 150 -500 152 -430 150 -386 C 176 -280 ${look.skirt ? 214 : 160} ${look.skirt ? -170 - drop : -320} ${look.skirt ? 222 : 160} ${look.skirt ? -104 - drop : -290} L ${look.skirt ? 150 : 120} ${look.skirt ? -110 - drop : -296} C 136 -250 120 -330 104 -392 Z`}
              fill={look.apron}
              uid={patternId}
              name="apron"
              width={9}
            />
            <path d="M -124 -388 Q 20 -372 150 -388" fill="none" stroke={look.apron} strokeWidth={16} />
            <path d="M -124 -388 Q 20 -372 150 -388" fill="none" stroke={INK} strokeWidth={4} opacity={0.5} />
          </g>
        )}
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
          {look.beard && <Inked d={SIDE_BEARD_D} fill={look.beard} uid={patternId} name="beard" />}
          {/* Long hair is one piece: over the top, the back of the head and the nape, down to the shoulders */}
          <UnderHat id={patternId} on={!!look.hat && look.hatStyle !== "crown"}>
          <g transform={look.long ? hairMove(pose.hair, 0.6) : ""}>
          <path
            d={sideHair}
            fill={look.hair}
            stroke={INK}
            strokeWidth={STROKE}
            strokeLinejoin="round"
          />
          <Cel uid={patternId} name="hair" d={sideHair} />
          </g>
          </UnderHat>
          {look.kerchief && (
            <g>
              <Inked d={SIDE_KERCHIEF_D} fill={look.kerchief} uid={patternId} name="kerchief" />
              {/* The knot and its two tails at the nape */}
              <path d="M -186 -840 L -262 -800 L -214 -770 Z M -186 -840 L -246 -730 L -196 -740 Z" fill={look.kerchief} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            </g>
          )}
          {look.hat && (look.hatStyle === "helmet" || look.hatStyle === "stahl") && (
            <Helmet
              color={look.hat}
              uid={patternId}
              d={look.hatStyle === "helmet" ? M1_SIDE_D : STAHL_SIDE_D}
              rim={look.hatStyle === "helmet" ? "M -200 -892 Q 20 -930 236 -900" : "M -200 -900 Q 20 -934 230 -916"}
            />
          )}
          {look.hat && look.hatStyle === "crown" && <Crown color={look.hat} uid={patternId} dx={26} />}
          {look.hat && look.hatStyle === "shako" && <Shako color={look.hat} uid={patternId} dx={26} />}
          {look.hat && look.hatStyle !== "helmet" && look.hatStyle !== "stahl" && look.hatStyle !== "crown" && look.hatStyle !== "shako" && (
            <g>
              <Inked d={look.hatStyle === "bowler" ? BOWLER_CROWN_D : look.hatStyle === "boater" ? BOATER_CROWN_D : SIDE_HAT_CROWN_D} fill={look.hat} uid={patternId} name="hat" />
              <path d="M -152 -968 Q 26 -984 202 -968 L 200 -932 Q 26 -948 -150 -932 Z" fill={INK} opacity={0.55} />
              <ellipse cx={26} cy={-934} rx={look.hatStyle === "bowler" ? 230 : look.hatStyle === "boater" ? 270 : 300} ry={26} transform="rotate(-3 26 -934)" fill={look.hat} stroke={INK} strokeWidth={STROKE} />
            </g>
          )}
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
        [-1, 1].map((side) => <BackLeg key={side} x1={side * 55} y1={-280} x2={side * 62} y2={-210} />)
      ) : (
        [-1, 1].map((side) => {
          const a = ((pose.legSwing ?? 0) * side * Math.PI) / 180;
          const fx = side * 55 + Math.sin(a) * 266 + side * 7;
          const fy = -280 + Math.cos(a) * 266;
          return (
            <g key={side}>
              <BackLeg x1={side * 55} y1={-280} x2={fx} y2={fy} />
              <Foot x={fx} y={fy - 4} scale={1.05} />
            </g>
          );
        })
      )}
      <g transform={`translate(0 ${bob})`}>
        {look.skirt && <Inked d={SKIRT_D(-66)} fill={look.outfit} uid={patternId} name="skirt" />}
        {look.shorts && <Inked d={SHORTS_D} fill={look.shorts} uid={patternId} name="shorts" width={10} />}
        <path d={body} fill={look.vest ?? look.outfit} stroke={INK} strokeWidth={STROKE} />
        {look.pattern && !look.vest && <path d={body} fill={`url(#${patternId})`} />}
        <Cel uid={patternId} name="body" d={body} />
        {look.suspenders && <path d="M -92 -612 L 0 -440 L 92 -612 M 0 -440 L 0 -272" fill="none" stroke={look.suspenders} strokeWidth={22} />}
        {look.bib && <Bib text={look.bib} />}
        {look.apron && (
          <g>
            <path d="M -150 -386 Q 0 -372 150 -386" fill="none" stroke={look.apron} strokeWidth={22} />
            <path d="M 0 -380 L -46 -410 L -46 -350 Z M 0 -380 L 46 -410 L 46 -350 Z M 0 -380 L -20 -300 M 0 -380 L 22 -296" fill={look.apron} stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          </g>
        )}
        {(look.lanyard || look.chain) && (
          <path d="M -70 -616 Q 0 -596 70 -616" fill="none" stroke={look.lanyard ?? look.chain} strokeWidth={12} strokeLinecap="round" />
        )}
        <Arm x={-130} y={-545} side={-1} angles={armL} item={pose.hold?.hand === "L" ? pose.hold.item : undefined} />
        <Arm x={130} y={-545} side={1} angles={armR} item={pose.hold?.hand === "R" ? pose.hold.item : undefined} />
        <g transform={`rotate(${pose.headTilt ?? 0} 0 -640)`}>
          <circle cx={-204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={204} cy={-792} r={30} fill={look.skin} stroke={INK} strokeWidth={10} />
          <circle cx={0} cy={-800} r={205} fill={look.skin} stroke={INK} strokeWidth={STROKE} />
          {/* a steel helmet sits high at the back: the hair shows below it, so it is not clipped */}
          <UnderHat id={patternId} on={!!look.hat && look.hatStyle !== "helmet" && look.hatStyle !== "stahl" && look.hatStyle !== "crown"}>
            <path d={backHair} fill={look.hair} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
            <Cel uid={patternId} name="hair" d={backHair} />
          </UnderHat>
          {look.kerchief && (
            <g>
              <Inked d={BACK_KERCHIEF_D} fill={look.kerchief} uid={patternId} name="kerchief" />
              <path d="M 0 -760 L -50 -690 L -12 -680 Z M 0 -760 L 46 -686 L 10 -678 Z" fill={look.kerchief} stroke={INK} strokeWidth={9} strokeLinejoin="round" />
            </g>
          )}
          {look.hat && <HatFront color={look.hat} uid={patternId} style={look.hatStyle} />}
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

// Floating "z"s over a sleeper's head at (x, y), rising and fading on a loop.
const Zzz: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => (
  <g fontFamily="Arial Black, Impact, sans-serif" fontWeight={900} fill="#ffffff" stroke={INK} strokeWidth={7} paintOrder="stroke">
    {[0, 1, 2].map((i) => {
      const p = (t / 45 + i / 3) % 1;
      return (
        <text key={i} x={x + p * 120} y={y - p * 260} fontSize={90 + i * 30} opacity={Math.min(1, (1 - p) * 3, p * 6)}>
          z
        </text>
      );
    })}
  </g>
);

export const Puppet: React.FC<{ look: PuppetLook; pose: PuppetPose; id: string }> = (props) => {
  const { pose } = props;
  const inner = pose.view === "side" ? <SidePuppet {...props} /> : pose.view === "back" ? <BackPuppet {...props} /> : <FrontPuppet {...props} />;
  const body = <WearCtx.Provider value={{ pants: props.look.pants, shoes: props.look.shoes }}>{inner}</WearCtx.Provider>;
  // Squash and stretch about the contact point (the feet, or the middle of the body in the air); sy * sx^2 = 1.
  const sq = Math.max(-0.45, Math.min(0.45, pose.squash ?? 0));
  const sy = 1 - sq;
  const sx = 1 / Math.sqrt(sy);
  const py = (pose.air ?? 0) > 1 ? -(pose.air ?? 0) - 500 : 0;
  const squashed = sq ? <g transform={`translate(0 ${py}) scale(${sx} ${sy}) translate(0 ${-py})`}>{body}</g> : body;
  const lie = Math.max(0, Math.min(1, pose.lie ?? 0));
  if (!lie && !pose.sleep) return squashed;
  // Lying: tip over backwards around the feet onto the floor, head to screen-left, body resting on y = 0.
  const a = (-90 * lie * Math.PI) / 180;
  const head: [number, number] = [800 * Math.sin(a), -800 * Math.cos(a) - 155 * lie];
  return (
    <g>
      <g transform={`translate(0 ${-155 * lie}) rotate(${-90 * lie})`}>{squashed}</g>
      {pose.sleep && <Zzz x={head[0] + 60} y={head[1] - (lie > 0.5 ? 120 : 240)} t={pose.face?.t ?? 0} />}
    </g>
  );
};
