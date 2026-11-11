import React from "react";
import { AbsoluteFill } from "remotion";

// One character on a plain white background, in several poses. Drawn after the reference image: swept quiff,
// freckles, ear, blue knit sweater with ribbed collar/cuffs/hem and a patch pocket.
const INK = "#2b0f08";
const S = { stroke: INK, strokeWidth: 11, strokeLinejoin: "round", strokeLinecap: "round" } as const;

type Face = "happy" | "grin" | "open" | "surprised";
type Leg = { hx: number; fx: number; fy: number; cx: number; cy: number; dir: 1 | -1 };
export type Age = "kid" | "adult" | "old";
export type PoseName = "stand" | "wave" | "cheer" | "point" | "surprised" | "walk";
type PoseDef = { armL: number; armR: number; legL: Leg; legR: Leg; face: Face; tilt: number; dy: number; look?: number };

const LEG_L = { hx: 392, fx: 345, fy: 1440, cx: 372, cy: 1320, dir: -1 } as const;
const LEG_R = { hx: 528, fx: 510, fy: 1450, cx: 520, cy: 1330, dir: 1 } as const;

export const POSES: Record<PoseName, PoseDef> = {
  stand: { armL: 26, armR: -4, legL: LEG_L, legR: LEG_R, face: "happy", tilt: 0, dy: 0 },
  wave: { armL: 14, armR: -150, legL: LEG_L, legR: LEG_R, face: "grin", tilt: -4, dy: 0 },
  cheer: {
    armL: 140, armR: -140, face: "grin", tilt: 0, dy: -70,
    legL: { hx: 392, fx: 290, fy: 1400, cx: 300, cy: 1290, dir: -1 },
    legR: { hx: 528, fx: 610, fy: 1390, cx: 600, cy: 1285, dir: 1 },
  },
  point: { armL: 92, armR: -4, legL: LEG_L, legR: LEG_R, face: "open", tilt: 6, dy: 0, look: -14 },
  surprised: {
    armL: 58, armR: -58, face: "surprised", tilt: 0, dy: 0,
    legL: { hx: 392, fx: 325, fy: 1440, cx: 350, cy: 1320, dir: -1 },
    legR: { hx: 528, fx: 535, fy: 1450, cx: 530, cy: 1330, dir: 1 },
  },
  walk: {
    armL: 48, armR: -34, face: "happy", tilt: -3, dy: 0,
    legL: { hx: 392, fx: 330, fy: 1445, cx: 345, cy: 1320, dir: -1 },
    legR: { hx: 528, fx: 590, fy: 1385, cx: 640, cy: 1300, dir: 1 },
  },
};

const Shoe: React.FC<{ x: number; y: number; dir: 1 | -1 }> = ({ x, y, dir }) => (
  <g transform={`translate(${x} ${y}) scale(${dir} 1)`}>
    <path d="M-48 -8 C-52 -45 -10 -55 30 -46 C70 -36 100 -12 92 24 C86 50 20 62 -36 52 C-52 46 -50 20 -48 -8 Z" fill="#3a1a10" {...S} />
    <path d="M-22 -26 C0 -36 32 -34 48 -26" fill="none" stroke="#7a4a3a" strokeWidth={8} strokeLinecap="round" />
    <path d="M-30 48 C20 60 70 52 88 30" fill="none" stroke="#5a3428" strokeWidth={9} strokeLinecap="round" />
  </g>
);

// Arm hanging from the shoulder pivot (0,0), pointing down; rotate about the pivot. `mirror` flips it for the right arm.
const Arm: React.FC<{ x: number; y: number; angle: number; mirror?: boolean }> = ({ x, y, angle, mirror }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle}) scale(${mirror ? -1 : 1} 1)`}>
    <path d="M0 0 L0 300" stroke={INK} strokeWidth={26} strokeLinecap="round" />
    <path d="M-38 320 C-48 285 -8 280 20 288 C46 296 52 330 46 355 C38 390 -6 396 -30 376 C-44 362 -40 345 -26 338 C-34 336 -38 330 -38 320 Z" fill="#3a1a10" {...S} />
  </g>
);

const EyesAndMouth: React.FC<{ face: Face; look: number; age: Age }> = ({ face, look, age }) => {
  const old = age === "old";
  const adult = age === "adult";
  const open = face === "open" || face === "surprised";
  const big = face === "surprised";
  const eye = (cx: number) => (
    <g>
      <ellipse cx={cx} cy={590} rx={big ? 42 : 36} ry={big ? 52 : 44} fill="#ffffff" stroke={INK} strokeWidth={9} />
      <circle cx={cx + look} cy={594} r={big ? 20 : 22} fill={INK} />
      <circle cx={cx + look + 7} cy={585} r={6} fill="#ffffff" />
    </g>
  );
  return (
    <g>
      <g transform={big ? "translate(0 -22)" : undefined}>
        <path d="M300 525 Q350 505 410 520" fill="none" stroke={old ? "#8f8b84" : INK} strokeWidth={old ? 22 : adult ? 16 : 13} strokeLinecap="round" />
        <path d="M515 520 Q570 505 625 525" fill="none" stroke={old ? "#8f8b84" : INK} strokeWidth={old ? 22 : adult ? 16 : 13} strokeLinecap="round" />
      </g>
      {open ? (
        <>
          {eye(368)}
          {eye(562)}
        </>
      ) : (
        <>
          <path d="M310 600 Q335 565 370 570 Q405 575 425 605" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <path d="M500 605 Q520 570 555 568 Q595 570 612 600" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
        </>
      )}
      <ellipse cx={285} cy={640} rx={42} ry={30} fill="#f58a6a" opacity={age === "kid" ? 0.9 : old ? 0.3 : 0.12} />
      <ellipse cx={625} cy={640} rx={42} ry={30} fill="#f58a6a" opacity={age === "kid" ? 0.9 : old ? 0.3 : 0.12} />
      {age === "kid" && (
        <>
          <circle cx={270} cy={688} r={6} fill="#8b3a1c" /><circle cx={292} cy={692} r={7} fill="#8b3a1c" /><circle cx={286} cy={712} r={6} fill="#8b3a1c" />
          <circle cx={305} cy={690} r={5} fill="#8b3a1c" />
        </>
      )}
      {adult && (
        <g>
          <path d="M250 720 C260 780 330 825 450 828 C570 825 650 780 660 720 C620 770 540 790 450 790 C360 790 290 770 250 720 Z" fill={INK} opacity={0.13} />
          <path d="M395 650 C382 685 386 708 398 726 M545 650 C558 685 554 708 542 726 M302 588 L280 582 M302 604 L282 608 M623 588 L645 582 M623 604 L643 608" fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" opacity={0.45} />
        </g>
      )}
      {old && (
        <g fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" opacity={0.75}>
          <path d="M300 575 L270 565 M298 592 L266 592 M300 609 L272 621" />
          <path d="M625 575 L655 565 M627 592 L659 592 M625 609 L653 621" />
          <path d="M335 640 C335 655 345 662 365 660 M590 640 C590 655 580 662 560 660" />
          <path d="M395 650 C375 690 380 715 395 735 M545 650 C565 690 560 715 545 735" />
          <path d="M440 470 C470 462 500 462 530 470 M425 490 C460 482 505 482 540 490" opacity={0.6} />
          <path d="M470 612 C452 650 455 675 485 672" strokeWidth={8} />
        </g>
      )}
      {face === "surprised" ? (
        <ellipse cx={465} cy={745} rx={36} ry={46} fill="#5a1a10" stroke={INK} strokeWidth={10} />
      ) : face === "grin" ? (
        <g>
          <path d="M375 678 C395 800 535 805 560 678 Z" fill="#5a1a10" stroke={INK} strokeWidth={11} strokeLinejoin="round" />
          <path d="M420 770 C450 745 500 748 520 772 C490 795 445 795 420 770 Z" fill="#e8756a" />
          <path d="M385 683 L550 683" stroke="#ffffff" strokeWidth={14} strokeLinecap="round" />
        </g>
      ) : (
        <>
          <path d="M385 685 C420 725 495 730 545 685" fill="none" stroke={INK} strokeWidth={12} strokeLinecap="round" />
          <path d="M545 685 C555 675 565 678 568 690" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
        </>
      )}
      {old && (
        <g>
          <path d="M392 676 C405 640 455 650 468 670 C482 650 535 640 548 676 C525 698 490 688 468 682 C446 688 412 698 392 676 Z" fill="#cfcbc3" stroke={INK} strokeWidth={7} strokeLinejoin="round" />
          <circle cx={368} cy={592} r={58} fill="#ffffff" fillOpacity={0.18} stroke={INK} strokeWidth={9} />
          <circle cx={562} cy={592} r={58} fill="#ffffff" fillOpacity={0.18} stroke={INK} strokeWidth={9} />
          <path d="M426 586 Q465 570 504 586" fill="none" stroke={INK} strokeWidth={9} strokeLinecap="round" />
          <path d="M310 590 L240 575 M620 590 L690 600" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

export const Hero: React.FC<{ pose: PoseName; age?: Age }> = ({ pose, age = "kid" }) => {
  const old = age === "old";
  const p = POSES[pose];
  const H = age === "adult" ? { base: "#6a2e18", dark: "#4e200f", light: "#94502c", back: "#5a2713" } : old ? { base: "#b9b5ad", dark: "#8f8b84", light: "#e4e1da", back: "#9a968f" } : { base: "#8b3a1c", dark: "#6b2a14", light: "#b8643c", back: "#7a3216" };
  const leg = (l: Leg) => (
    <g>
      <path d={`M${l.hx} 1200 Q${l.cx} ${l.cy} ${l.fx} ${l.fy}`} fill="none" stroke={INK} strokeWidth={26} strokeLinecap="round" />
      <Shoe x={l.fx} y={l.fy + 30} dir={l.dir} />
    </g>
  );
  return (
    <g transform={`translate(0 ${p.dy})`}>
      {leg(p.legL)}
      {leg(p.legR)}
      <Arm x={362} y={900} angle={p.armL} />
      <Arm x={608} y={900} angle={p.armR} mirror />
      {/* sweater body */}
      <path d="M415 840 C385 850 362 880 350 940 C340 1010 338 1100 336 1165 C400 1215 540 1215 604 1170 C608 1100 615 1000 625 930 C630 880 600 835 540 825 Z" fill="#2f5faa" {...S} />
      <path d="M336 1165 C400 1215 545 1215 604 1170 L604 1195 C545 1235 400 1230 336 1190 Z" fill="#2a579f" {...S} />
      <path d="M365 1190 L367 1218 M395 1200 L397 1226 M425 1205 L427 1230 M455 1207 L457 1232 M485 1206 L487 1231 M515 1202 L517 1227 M545 1196 L547 1220 M575 1186 L577 1208" stroke={INK} strokeWidth={4} opacity={0.6} />
      <path d="M402 910 C395 1000 390 1060 380 1100 C440 1085 500 1065 548 1020" fill="none" stroke={INK} strokeWidth={7} strokeLinecap="round" />
      <path d="M505 945 L598 908 L612 985 L555 1015 L520 1005 Z" fill="#86b6e3" {...S} strokeWidth={9} />
      <path d="M515 950 L592 920 L603 980 L557 1003 L528 996 Z" fill="none" stroke="#2f5faa" strokeWidth={4} strokeDasharray="12 8" />
      {/* neck + collar */}
      <ellipse cx={490} cy={850} rx={40} ry={20} fill="#e9b78a" {...S} strokeWidth={8} />
      <path d="M418 840 C420 810 470 815 490 818 C530 815 570 820 568 845 C560 895 440 895 418 840 Z" fill="#2a579f" {...S} />
      <ellipse cx={492} cy={850} rx={45} ry={26} fill="#e9b78a" stroke={INK} strokeWidth={8} />
      <path d="M432 862 L436 888 M452 872 L455 896 M474 877 L476 900 M498 878 L500 900 M520 874 L523 896 M543 866 L548 888" stroke={INK} strokeWidth={4} opacity={0.6} />
      {/* head (tilts about the neck) */}
      <g transform={`translate(470 850) rotate(${p.tilt}) scale(${old ? 0.86 : age === "adult" ? 0.88 : 1}) translate(-470 -850)`}>
        <path d="M685 615 C710 585 760 585 772 625 C780 665 750 700 710 695 C690 690 680 650 685 615 Z" fill="#f5c08c" {...S} />
        <path d="M705 630 C725 620 740 635 735 655 C730 665 718 660 715 655" fill="none" stroke={INK} strokeWidth={6} strokeLinecap="round" />
        <path d="M200 520 C185 560 195 600 225 625 L270 560 Z" fill={H.back} {...S} />
        <path d="M520 410 C680 400 775 470 775 580 L700 650 L520 520 Z" fill={H.dark} {...S} />
        <path d="M205 640 C198 520 290 425 450 425 C600 425 690 500 698 640 C700 740 600 825 450 830 C300 830 212 760 205 640 Z" fill="#f5c08c" {...S} />
        <path d="M185 490 C110 440 100 350 150 300 C190 260 250 275 290 285 C400 255 500 225 580 275 C610 295 635 330 670 322 C740 330 790 390 780 470 C775 520 760 560 745 590 C720 560 720 520 700 500 C660 440 600 410 540 420 C505 450 470 470 410 455 C340 440 290 450 250 500 C225 530 215 560 205 590 C190 560 185 520 185 490 Z" fill={H.base} {...S} />
        <path d="M185 490 C110 440 100 350 150 300 C120 380 170 420 330 440 C300 450 260 470 230 520 C215 545 205 575 205 600 C190 565 185 525 185 490 Z" fill={H.dark} opacity={0.7} />
        <path d="M170 345 C260 320 380 315 480 305 C410 340 280 370 185 385 Z" fill={H.light} opacity={0.85} />
        <path d="M625 335 C700 345 765 400 780 470 C775 520 760 560 745 590 C760 520 740 420 625 335 Z" fill={H.dark} opacity={0.7} />
        <EyesAndMouth face={p.face} look={p.look ?? 0} age={age} />
      </g>
    </g>
  );
};

export const CharacterStill: React.FC<{ pose: PoseName; age?: Age }> = ({ pose, age }) => (
  <AbsoluteFill style={{ background: "#ffffff" }}>
    <svg viewBox="-150 0 1242 1672" width={1080} height={1920} preserveAspectRatio="xMidYMid meet">
      <Hero pose={pose} age={age} />
    </svg>
  </AbsoluteFill>
);

// All poses on one sheet (3 x 2).
export const CharacterPoses: React.FC<{ age?: Age }> = ({ age }) => {
  const names = Object.keys(POSES) as PoseName[];
  return (
    <AbsoluteFill style={{ background: "#ffffff" }}>
      {names.map((n, i) => (
        <svg key={n} x={0} style={{ position: "absolute", left: (i % 3) * 600, top: Math.floor(i / 3) * 810 }} viewBox="-150 0 1242 1672" width={600} height={808}>
          <Hero pose={n} age={age} />
        </svg>
      ))}
    </AbsoluteFill>
  );
};
