import React from "react";
import { AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { CameraShot, CasinoSet } from "../three/CasinoSet";
import { reelAngleFor } from "../three/SlotMachine";
import { STOPS } from "../three/textures";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";
import { CaptionChunk, Captions } from "../ui/Captions";

// Hook of a slot-machine explainer: two sevens land, the third stops one click short,
// the player's excitement turns into suspicion.

const STEP = (Math.PI * 2) / STOPS.length;

const PLAYER: PuppetLook = {
  skin: "#fffaf2",
  hair: "#1d1a1a",
  outfit: "#2a9d8f",
  pattern: "#f4d35e",
  lanyard: "#d62828",
};

// Each reel decelerates into its stop, then settles with a small mechanical bump.
const REELS = [
  { stop: 0, offset: 0, at: 16, spins: 3, bump: 0.12 },
  { stop: 6, offset: 0, at: 26, spins: 4, bump: 0.12 },
  { stop: 0, offset: 1, at: 38, spins: 5, bump: 0.4 }, // the near miss teases toward the line
];

const reelAngle = (f: number, r: (typeof REELS)[number]) => {
  const target = reelAngleFor(r.stop, r.offset) + Math.PI * 2 * r.spins;
  if (f < r.at) {
    const p = Easing.out(Easing.cubic)(f / r.at);
    return target - Math.PI * 2 * r.spins * (1 - p);
  }
  const t = f - r.at;
  return target + r.bump * STEP * Math.exp(-t / 3) * Math.sin(t / 2.2);
};

const CAPTIONS: CaptionChunk[] = [
  { from: 0, to: 9, text: "Two" },
  { from: 9, to: 20, text: "sevens." },
  { from: 20, to: 30, text: "The third" },
  { from: 30, to: 40, text: "stops" },
  { from: 40, to: 50, text: "one click" },
  { from: 50, to: 64, text: "short." },
  { from: 64, to: 76, text: "So close" },
  { from: 76, to: 86, text: "you can" },
  { from: 86, to: 100, text: "taste it." },
  { from: 100, to: 114, text: "But that's" },
  { from: 114, to: 150, text: "not luck." },
];

type Shot = { from: number; to: number; camera: (p: number) => CameraShot; blur?: number };

const lerp3 = (a: number[], b: number[], p: number) => a.map((v, i) => v + (b[i] - v) * p) as [number, number, number];

const SHOTS: Shot[] = [
  {
    // Macro on the reels, low angle, slow push-in.
    from: 0,
    to: 40,
    camera: (p) => ({ position: lerp3([-0.38, 0.95, 2.75], [-0.3, 1.0, 2.4], p), target: [0.0, 1.28, 0], fov: 34 }),
  },
  {
    // Medium shot: the player in front of the machine.
    from: 40,
    to: 95,
    camera: (p) => ({ position: lerp3([-0.75, 1.32, 3.1], [-0.7, 1.3, 2.85], p), target: [-0.3, 1.22, 0], fov: 38 }),
  },
  {
    // Punch-in on the face, background softened.
    from: 95,
    to: 150,
    camera: (p) => ({ position: lerp3([-0.45, 1.35, 2.2], [-0.4, 1.35, 2.0], p), target: [0.2, 1.3, 0], fov: 36 }),
    blur: 7,
  },
];

const playerPose = (f: number): { pose: PuppetPose; x: number; headY: number; scale: number } => {
  const breathe = Math.sin(f / 6) * 6;
  if (f < 95) {
    const p = (f - 40) / 55;
    const down = interpolate(f, [56, 68], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const expression = f < 60 ? "excited" : f < 70 ? "neutral" : "skeptical";
    return {
      x: 370,
      headY: 760,
      scale: 1.25 + p * 0.07,
      pose: {
        expression,
        blink: f >= 84 && f < 87,
        lookX: f < 70 ? 0 : 1,
        headTilt: f < 70 ? 4 : -6,
        armL: [interpolate(down, [0, 1], [150, 14]), interpolate(down, [0, 1], [-25, 12])],
        armR: [interpolate(down, [0, 1], [150, 14]), interpolate(down, [0, 1], [-25, 12])],
        bob: breathe + (f < 60 ? Math.abs(Math.sin(f / 2.5)) * -14 : 0),
      },
    };
  }
  const p = (f - 95) / 55;
  return {
    x: 500,
    headY: 820,
    scale: 2.5 + p * 0.25,
    pose: {
      expression: "skeptical",
      blink: f >= 132 && f < 135,
      lookX: 0.6,
      headTilt: interpolate(p, [0, 1], [-9, -4]),
      armL: [14, 12],
      armR: [14, 12],
      bob: breathe * 0.5,
    },
  };
};

export const SlotHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const shot = SHOTS.find((s) => frame >= s.from && frame < s.to) ?? SHOTS[SHOTS.length - 1];
  const p = (frame - shot.from) / (shot.to - shot.from);
  const camera = shot.camera(p);

  // Small camera kick every time a reel lands during the macro shot.
  if (shot.from === 0) {
    const kick = REELS.reduce((sum, r) => {
      const t = frame - r.at;
      return t < 0 ? sum : sum + 0.012 * Math.exp(-t / 2.5) * Math.cos(t * 1.8);
    }, 0);
    camera.position = [camera.position[0], camera.position[1] + kick, camera.position[2]];
  }

  const reels = REELS.map((r) => reelAngle(frame, r)) as [number, number, number];
  const player = playerPose(frame);

  return (
    <AbsoluteFill style={{ backgroundColor: "#1c0a0f" }}>
      <AbsoluteFill style={{ filter: shot.blur ? `blur(${shot.blur}px)` : undefined }}>
        <ThreeCanvas width={width} height={height} flat>
          <CasinoSet frame={frame} camera={camera} heroReels={reels} />
        </ThreeCanvas>
      </AbsoluteFill>

      {frame >= 40 && (
        <AbsoluteFill>
          <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
            <g transform={`translate(${player.x} ${player.headY + 800 * player.scale}) scale(${player.scale})`}>
              <Puppet id="player" look={PLAYER} pose={player.pose} />
            </g>
          </svg>
        </AbsoluteFill>
      )}

      {/* Soft vignette for the warm casino grade */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(10,0,4,0.55) 100%)" }} />
      <Captions chunks={CAPTIONS} />
    </AbsoluteFill>
  );
};
