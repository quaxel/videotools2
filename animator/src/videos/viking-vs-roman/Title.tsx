import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { loadFont } from "@remotion/google-fonts/Cinzel";

const { fontFamily: CINZEL } = loadFont("normal", { weights: ["900"], subsets: ["latin"] });

// Metal fills for the big titles (top to bottom), each with the colour of its world in the dark edge and glow.
export const METALS = {
  // Bjorn: bronze-gold, moss-dark edge
  bronze: { stops: ["#fff3c4", "#f2c35a", "#c0812c", "#7a4a18", "#e6b25a"], edge: "#1f1a10", glow: "rgba(242,180,80,0.65)" },
  // Felix: bright Roman gold over crimson
  gold: { stops: ["#fffbe6", "#ffe07a", "#d8a632", "#8a5a12", "#f2cc66"], edge: "#3a0f0c", glow: "rgba(255,200,90,0.7)" },
  // plain cream, for lines that should not compete
  cream: { stops: ["#fffaf0", "#f4ead2", "#e2d2ac", "#c8b488", "#f0e4c4"], edge: "#1d1712", glow: "rgba(255,240,210,0.4)" },
} as const;
export type Metal = keyof typeof METALS;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// One line of slamming letters: each letter drops in from big and blurred, 2 frames after the one before, lands with a
// small squash, and the whole line catches a moving shine.
const Line: React.FC<{ text: string; dt: number; size: number; metal: Metal; delay: number; shineAt: number }> = ({ text, dt, size, metal, delay, shineAt }) => {
  const m = METALS[metal];
  const shine = interpolate(dt, [shineAt, shineAt + 22], [-40, 140], clamp);
  return (
    <div style={{ display: "flex", justifyContent: "center", lineHeight: 1 }}>
      {text.split("").map((ch, i) => {
        const t = dt - delay - i * 2;
        const s = interpolate(t, [0, 4, 7, 10], [2.4, 0.9, 1.06, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
        const o = interpolate(t, [0, 2], [0, 1], clamp);
        const blur = interpolate(t, [0, 4], [10, 0], clamp);
        const y = interpolate(t, [0, 4], [-size * 0.35, 0], { ...clamp, easing: Easing.in(Easing.quad) });
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              whiteSpace: "pre",
              fontFamily: CINZEL,
              fontWeight: 900,
              fontSize: size,
              opacity: o,
              transform: `translateY(${y}px) scale(${s})`,
              filter: `blur(${blur}px) drop-shadow(0 ${size * 0.05}px 0 ${m.edge}) drop-shadow(0 ${size * 0.1}px ${size * 0.18}px rgba(0,0,0,0.55)) drop-shadow(0 0 ${size * 0.16}px ${m.glow})`,
              backgroundImage: `linear-gradient(105deg, transparent ${shine - 12}%, rgba(255,255,255,0.95) ${shine}%, transparent ${shine + 12}%), linear-gradient(180deg, ${m.stops[0]} 0%, ${m.stops[1]} 30%, ${m.stops[2]} 52%, ${m.stops[3]} 58%, ${m.stops[4]} 100%)`,
              backgroundSize: `${text.length * 100}% 100%, 100% 100%`,
              backgroundPosition: `${(i / Math.max(1, text.length - 1)) * 100}% 0, 0 0`,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextStroke: `${Math.max(3, size / 24)}px ${m.edge}`,
              paintOrder: "stroke fill",
              letterSpacing: "0.04em",
            }}
          >
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// A big cinematic title for the 16:9 frame. It slams in at `at` letter by letter with a burst of light and a shake,
// catches a shine, holds and fades at `out`. `x` is the centre as a fraction of the width, `y` the top in pixels.
// `sub` is a small dated line under an ornamental rule.
export const BigTitle: React.FC<{ f: number; text: string; line2?: string; at?: number; out?: number; x?: number; y?: number; size?: number; metal?: Metal; sub?: string; width?: number }> = ({
  f,
  text,
  line2,
  at = 0,
  out = 9999,
  x = 0.5,
  y = 120,
  size = 150,
  metal = "cream",
  sub,
  width = 0.5,
}) => {
  const dt = f - at;
  if (dt < -1 || f > out + 10) return null;
  const fade = interpolate(f, [out, out + 10], [1, 0], clamp);
  const land = text.length * 2 + 4; // the last letter lands
  const shake = dt > 3 && dt < land + 8 ? Math.sin(dt * 3.1) * Math.max(0, land + 8 - dt) * 0.7 : 0;
  // light burst behind the word as it lands
  const burst = interpolate(dt, [2, 6, 20], [0, 1, 0], clamp);
  const ring = interpolate(dt, [2, 18], [0.4, 1.6], clamp);
  const m = METALS[metal];
  const rule = interpolate(dt, [land, land + 10], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const subO = interpolate(dt, [land + 4, land + 12], [0, 1], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: y, left: `${(x - width / 2) * 100}%`, width: `${width * 100}%`, textAlign: "center", opacity: fade, transform: `translate(${shake}px, ${shake * 0.5}px)` }}>
        {/* the burst: a soft flare and an expanding ring */}
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: size * 0.55,
            width: size * 4,
            height: size * 1.6,
            marginLeft: -size * 2,
            marginTop: -size * 0.8,
            background: `radial-gradient(ellipse at center, ${m.glow} 0%, rgba(255,255,255,0) 65%)`,
            opacity: burst,
            transform: `scale(${0.6 + burst * 0.6})`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: size * 0.55,
            width: size * 3,
            height: size * 1.1,
            marginLeft: -size * 1.5,
            marginTop: -size * 0.55,
            borderRadius: "50%",
            border: `${Math.max(2, size / 30)}px solid rgba(255,240,200,${0.8 * (1 - (ring - 0.4) / 1.2)})`,
            transform: `scale(${ring})`,
          }}
        />
        <Line text={text} dt={dt} size={size} metal={metal} delay={0} shineAt={land + 2} />
        {line2 && (
          <div style={{ marginTop: -size * 0.08 }}>
            <Line text={line2} dt={dt} size={size * 0.7} metal={metal} delay={text.length * 2 - 2} shineAt={land + 6} />
          </div>
        )}
        {sub && (
          <div style={{ marginTop: size * 0.1, display: "flex", alignItems: "center", justifyContent: "center", gap: size * 0.12, opacity: subO }}>
            <div style={{ height: Math.max(3, size / 40), width: size * 0.9 * rule, background: `linear-gradient(90deg, rgba(0,0,0,0), ${m.stops[1]})`, boxShadow: `0 2px 0 ${m.edge}` }} />
            <div style={{ width: size * 0.09, height: size * 0.09, background: m.stops[1], transform: "rotate(45deg)", border: `2px solid ${m.edge}` }} />
            <div
              style={{
                fontFamily: CINZEL,
                fontWeight: 900,
                fontSize: size * 0.2,
                letterSpacing: "0.32em",
                color: "#fbf3dc",
                WebkitTextStroke: `${Math.max(2, size / 70)}px ${m.edge}`,
                paintOrder: "stroke fill",
                textShadow: `0 3px 0 ${m.edge}, 0 6px 14px rgba(0,0,0,0.5)`,
                whiteSpace: "nowrap",
              }}
            >
              {sub}
            </div>
            <div style={{ width: size * 0.09, height: size * 0.09, background: m.stops[1], transform: "rotate(45deg)", border: `2px solid ${m.edge}` }} />
            <div style={{ height: Math.max(3, size / 40), width: size * 0.9 * rule, background: `linear-gradient(270deg, rgba(0,0,0,0), ${m.stops[1]})`, boxShadow: `0 2px 0 ${m.edge}` }} />
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
