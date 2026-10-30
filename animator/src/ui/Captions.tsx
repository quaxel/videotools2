import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { loadFont } from "@remotion/google-fonts/Montserrat";

const { fontFamily } = loadFont("normal", { weights: ["800"], subsets: ["latin"] });

export type CaptionChunk = { from: number; to: number; text: string };

// Numbers are what viewers should remember, so they stand out: digits, money, percentages and number words
// show in yellow, a little larger, and their chunk pops in harder.
const NUMBER_WORDS = new Set(
  ("zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen " +
    "eighteen nineteen twenty thirty forty fifty sixty seventy eighty ninety hundred thousand million billion half " +
    "percent dozen").split(" "),
);
const isNumber = (word: string) => /[0-9$%¢]/.test(word) || NUMBER_WORDS.has(word.toLowerCase().replace(/[^a-z]/g, ""));
const HIGHLIGHT = "#ffd23f";

// 1-3 word chunks, white with a heavy black stroke, centred at ~70% of the frame height.
export const Captions: React.FC<{ chunks: CaptionChunk[] }> = ({ chunks }) => {
  const frame = useCurrentFrame();
  const chunk = chunks.find((c) => frame >= c.from && frame < c.to);
  if (!chunk) return null;
  const words = chunk.text.split(" ");
  const loud = words.some(isNumber);
  const pop = loud
    ? interpolate(frame - chunk.from, [0, 3, 6], [0.7, 1.12, 1], { extrapolateRight: "clamp" })
    : interpolate(frame - chunk.from, [0, 2], [0.92, 1], { extrapolateRight: "clamp" });
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 1300,
        textAlign: "center",
        fontFamily,
        fontWeight: 800,
        fontSize: 84,
        color: "#fff",
        WebkitTextStroke: "18px #000",
        paintOrder: "stroke fill",
        textShadow: "0 6px 0 rgba(0,0,0,0.35)",
        transform: `scale(${pop})`,
      }}
    >
      {words.map((w, i) => (
        <span key={i} style={isNumber(w) ? { color: HIGHLIGHT, fontSize: "1.15em" } : undefined}>
          {i ? " " : ""}
          {w}
        </span>
      ))}
    </div>
  );
};
