import React from "react";
import { AbsoluteFill, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/PlayfairDisplay";

const { fontFamily: SERIF } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

// A headline set in heavy 19th-century newspaper type on a strip of cream paper, high in the frame (above the
// captions). It drops in with a small overshoot at `at` (shot frames) and fades at `out`.
export const Headline: React.FC<{ f: number; text: string; at?: number; out?: number; y?: number; size?: number }> = ({ f, text, at = 0, out = 9999, y = 250, size = 92 }) => {
  const dt = f - at;
  if (dt < 0 || f > out + 8) return null;
  const s = interpolate(dt, [0, 4, 8], [1.25, 0.96, 1], { extrapolateRight: "clamp" });
  const o = Math.min(interpolate(dt, [0, 3], [0, 1], { extrapolateRight: "clamp" }), interpolate(f, [out, out + 8], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        style={{
          position: "absolute",
          top: y,
          left: 70,
          right: 70,
          display: "flex",
          justifyContent: "center",
          opacity: o,
          transform: `scale(${s}) rotate(-1.2deg)`,
        }}
      >
        <div
          style={{
            background: "#f3ead2",
            border: "6px solid #161212",
            boxShadow: "0 10px 0 rgba(0,0,0,0.35)",
            padding: "18px 34px 22px",
            fontFamily: SERIF,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.02,
            color: "#1d1712",
            textAlign: "center",
            letterSpacing: 1,
            whiteSpace: "pre-line",
          }}
        >
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

