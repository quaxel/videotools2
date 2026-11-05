import React from "react";
import { AbsoluteFill, interpolate } from "remotion";

// The video's on-screen shout: heavy comic type, white with a thick ink outline and a hard drop shadow on a tilted
// sticker in the scene's accent colour, high in the frame above the captions. Slams in at `at` (overshoot and a
// little wobble), fades at `out`.
export const Shout: React.FC<{ f: number; text: string; at?: number; out?: number; y?: number; size?: number; color?: string; tilt?: number }> = ({
  f,
  text,
  at = 0,
  out = 9999,
  y = 230,
  size = 104,
  color = "#ff3d7f",
  tilt = -3,
}) => {
  const dt = f - at;
  if (dt < 0 || f > out + 8) return null;
  const s = interpolate(dt, [0, 3, 6, 10], [2.2, 0.9, 1.06, 1], { extrapolateRight: "clamp" });
  const wob = Math.sin(dt * 0.25) * 1.2;
  const o = Math.min(interpolate(dt, [0, 2], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [out, out + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: y, left: 40, right: 40, display: "flex", justifyContent: "center", opacity: o, transform: `scale(${s}) rotate(${tilt + wob}deg)` }}>
        <div
          style={{
            background: color,
            border: "9px solid #161212",
            borderRadius: 34,
            boxShadow: "0 14px 0 #161212",
            padding: "14px 34px 20px",
            fontFamily: "'Arial Black', Impact, sans-serif",
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.0,
            color: "#ffffff",
            textAlign: "center",
            whiteSpace: "pre-line",
            WebkitTextStroke: "5px #161212",
            paintOrder: "stroke fill",
            textShadow: "0 7px 0 #161212",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// A Dutch tilt: rotates the whole shot (scaled up so the corners stay filled).
export const Dutch: React.FC<{ deg: number; children: React.ReactNode }> = ({ deg, children }) => {
  const k = 1 + Math.abs(Math.sin((deg * Math.PI) / 180)) * 1.9;
  return <AbsoluteFill style={{ transform: `rotate(${deg}deg) scale(${k})` }}>{children}</AbsoluteFill>;
};
