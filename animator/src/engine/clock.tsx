import React, { createContext, useContext } from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";

// Every shot sees its own frame from 0. A shot with a dissolve starts FADE frames early and sees
// -FADE..0 while it whips in: the previous shot slides out to the left, this one slides in from the right,
// both smeared sideways at the fastest point (a whip pan, which reads cleaner than two sets cross-fading).

export const FADE = 8;

const ShotClock = createContext({ from: 0, lead: 0, dur: 1 });
export const useShotFrame = () => useCurrentFrame() - useContext(ShotClock).lead;
// Length of the current shot in frames (without the dissolve lead).
export const useShotDuration = () => useContext(ShotClock).dur;
// Frame on the whole video's timeline (the frames in timing.json).
export const useFinalFrame = () => useCurrentFrame() - useContext(ShotClock).lead + useContext(ShotClock).from;

// [from, to, component, dissolve in] in final frames.
export type Shot = [number, number, React.FC, boolean];

// 0..1 eased progress of a whip, and how much sideways smear goes with it at progress p.
const whip = (p: number) => {
  const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  return { e, smear: 46 * Math.sin(Math.PI * p) ** 2 };
};

// Moves its shot during the whip that starts at sequence frame `start`: "in" slides from the right edge to
// rest, "out" from rest off the left edge.
const Whip: React.FC<{ side: "in" | "out"; start: number; id: string; children: React.ReactNode }> = ({ side, start, id, children }) => {
  const p = (useCurrentFrame() - start) / FADE;
  if (p < 0 || p >= 1) return <AbsoluteFill>{children}</AbsoluteFill>;
  const { e, smear } = whip(p);
  const x = side === "in" ? (1 - e) * 100 : -e * 100;
  return (
    <AbsoluteFill style={{ transform: `translateX(${x}%)`, filter: smear > 0.5 ? `url(#${id})` : undefined }}>
      <svg width={0} height={0} style={{ position: "absolute" }}>
        <filter id={id} x="-20%" y="0" width="140%" height="100%">
          <feGaussianBlur stdDeviation={`${smear} 0`} edgeMode="duplicate" />
        </filter>
      </svg>
      {children}
    </AbsoluteFill>
  );
};

export const ShotList: React.FC<{ shots: Shot[] }> = ({ shots }) => (
  <>
    {shots.map(([from, to, ShotComponent, fade], i) => {
      const lead = fade ? FADE : 0;
      const exits = shots[i + 1]?.[3] ?? false;
      let shot = <ShotComponent />;
      if (exits) shot = <Whip side="out" start={to - from + lead - FADE} id={`whip-out-${from}`}>{shot}</Whip>;
      if (fade) shot = <Whip side="in" start={0} id={`whip-in-${from}`}>{shot}</Whip>;
      return (
        <Sequence key={from} from={from - lead} durationInFrames={to - from + lead} layout="none">
          <ShotClock.Provider value={{ from, lead, dur: to - from }}>
            <AbsoluteFill>{shot}</AbsoluteFill>
          </ShotClock.Provider>
        </Sequence>
      );
    })}
  </>
);
