import React from "react";
import { AbsoluteFill } from "remotion";

// Screen-space overlays for the eagle-vision shots: a golden targeting HUD (rings, ticks, brackets, readouts), a
// gold edge vignette and radial speed lines for the super-zoom.

const GOLD = "#ffc21a";
const FONT = "'Arial Black', Impact, sans-serif";

export const EagleHud: React.FC<{ f: number; zoom?: number; range?: string; cx?: number; cy?: number; r?: number; lock?: number; label?: string; opacity?: number }> = ({
  f,
  zoom = 0.5,
  range = "412 M",
  cx = 540,
  cy = 760,
  r = 300,
  lock = 0,
  label = "EAGLE VISION",
  opacity = 1,
}) => {
  const ticks = Array.from({ length: 48 }, (_, i) => i);
  const spin = f * 0.9;
  const pulse = 1 + Math.sin(f * 0.3) * 0.015 - lock * 0.12;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <radialGradient id="hudv" cx="50%" cy="42%" r="78%">
            <stop offset="50%" stopColor="rgba(10,16,40,0)" />
            <stop offset="100%" stopColor="rgba(10,16,40,0.5)" />
          </radialGradient>
          <radialGradient id="hudg2" cx="50%" cy="42%" r="45%">
            <stop offset="0%" stopColor="rgba(255,214,90,0.16)" />
            <stop offset="100%" stopColor="rgba(255,194,26,0)" />
          </radialGradient>
          <linearGradient id="hudgl" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(255,255,255,0.18)" />
            <stop offset="22%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <pattern id="hudscan" width="4" height="4" patternUnits="userSpaceOnUse">
            <rect width="4" height="1.4" fill="rgba(255,226,140,0.07)" />
          </pattern>
          <filter id="hudg" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <rect width="1080" height="1920" fill="url(#hudv)" />
        <rect width="1080" height="1920" fill="url(#hudg2)" />
        <rect width="1080" height="1920" fill="url(#hudscan)" />
        <rect width="1080" height="1920" fill="url(#hudgl)" />
        <g filter="url(#hudg)" stroke={GOLD} fill="none" strokeLinecap="round">
          <g transform={`translate(${cx} ${cy}) scale(${pulse})`}>
            <circle r={r} strokeWidth={7} />
            <circle r={r - 34} strokeWidth={3} strokeDasharray="14 22" transform={`rotate(${spin})`} />
            <circle r={r + 30} strokeWidth={3} strokeDasharray="120 60" transform={`rotate(${-spin * 0.6})`} opacity={0.7} />
            {ticks.map((i) => (
              <line key={i} x1={0} y1={-r - 8} x2={0} y2={-r - (i % 6 === 0 ? 42 : 20)} strokeWidth={i % 6 === 0 ? 6 : 3} transform={`rotate(${(i * 360) / 48})`} />
            ))}
            {[0, 90, 180, 270].map((a) => (
              <g key={a} transform={`rotate(${a})`}>
                <line x1={0} y1={-90} x2={0} y2={-r + 60} strokeWidth={4} />
              </g>
            ))}
            <circle r={10} fill={GOLD} stroke="none" />
          </g>
          {[
            [60, 150, 1, 1],
            [1020, 150, -1, 1],
            [60, 1500, 1, -1],
            [1020, 1500, -1, -1],
          ].map(([x, y, sx, sy], i) => (
            <path key={i} d={`M ${x} ${y + sy * 110} L ${x} ${y} L ${x + sx * 110} ${y}`} strokeWidth={8} />
          ))}
        </g>
        <g fontFamily={FONT} fontWeight={900} fill={GOLD} filter="url(#hudg)">
          <circle cx={92} cy={200} r={14} fill={Math.floor(f / 8) % 2 ? GOLD : "#ff3d3d"} />
          <text x={122} y={216} fontSize={44}>
            {label}
          </text>
          <text x={80} y={1470} fontSize={46}>
            {`ZOOM x${Math.round(2 + zoom * 46)}`}
          </text>
          <text x={1000} y={1470} fontSize={46} textAnchor="end">
            {`RANGE ${range}`}
          </text>
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// Radial speed lines for the zoom: white wedges from the centre outward, flickering per frame.
export const ZoomLines: React.FC<{ f: number; strength?: number; cx?: number; cy?: number }> = ({ f, strength = 1, cx = 540, cy = 800 }) => {
  const n = 46;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity: Math.min(1, strength) }}>
      <svg width="1080" height="1920" viewBox="0 0 1080 1920" style={{ position: "absolute", inset: 0 }}>
        {Array.from({ length: n }, (_, i) => {
          const k = Math.sin(i * 12.9898 + Math.floor(f / 2) * 7.1) * 43758.5453;
          const a = ((i + (k - Math.floor(k)) * 0.5) / n) * Math.PI * 2;
          const r0 = 280 + ((i * 53) % 220) + (Math.floor(f / 2) % 3) * 30;
          const r1 = 1500;
          const w = 0.012 + ((i * 17) % 7) * 0.003;
          const p = (r: number, da: number): string => `${cx + Math.cos(a + da) * r},${cy + Math.sin(a + da) * r}`;
          return <polygon key={i} points={`${p(r0, 0)} ${p(r1, -w)} ${p(r1, w)}`} fill="rgba(255,255,255,0.55)" />;
        })}
      </svg>
    </AbsoluteFill>
  );
};
