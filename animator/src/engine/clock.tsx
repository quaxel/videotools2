import React, { createContext, useContext } from "react";
import { AbsoluteFill, getInputProps, Sequence, useCurrentFrame } from "remotion";

// Every shot sees its own frame from 0. A shot with a transition starts early and sees negative frames while it
// comes in:
//   true        a whip pan, FADE frames: the previous shot slides out to the left, this one slides in from the
//               right, both smeared sideways at the fastest point (location changes: reads cleaner than two sets
//               cross-fading)
//   "dissolve"  DISSOLVE frames: this shot fades in over the previous one, which plays on to the cut (a change of
//               time in one place: night to dawn, before and after; ported from animated-short's XFADE)
//   "dip"       DIP frames (0.4 s): the previous shot plays on while the frame fills with cream, this one takes over
//               under the full cream at the midpoint and the cream clears by the cut (every change of location)

export const FADE = 8;
export const DISSOLVE = 12;
export const DIP = 12;
export const DIP_COLOUR = "#f2e6d0";

const ShotClock = createContext({ from: 0, lead: 0, dur: 1 });
export const useShotFrame = () => useCurrentFrame() - useContext(ShotClock).lead;
// Length of the current shot in frames (without the dissolve lead).
export const useShotDuration = () => useContext(ShotClock).dur;
// The video frame this shot starts on (identifies the shot, e.g. for its framing table).
export const useShotStart = () => useContext(ShotClock).from;
// Frame on the whole video's timeline (the frames in timing.json).
export const useFinalFrame = () => useCurrentFrame() - useContext(ShotClock).lead + useContext(ShotClock).from;

// [from, to, component, transition in] in final frames.
export type Transition = boolean | "dissolve" | "dip";
export type Shot = [number, number, React.FC, Transition];
export const leadOf = (t: Transition) => (t === "dissolve" ? DISSOLVE : t === "dip" ? DIP : t ? FADE : 0);

// 0..1 eased progress of a whip, and how much sideways smear goes with it at progress p.
const whip = (p: number) => {
  const e = p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2;
  return { e, smear: 46 * Math.sin(Math.PI * p) ** 2 };
};

// Moves its shot during the whip that starts at sequence frame `start`: "in" slides from the right edge to
// rest, "out" from rest off the left edge.
// The tree keeps one shape before, during and after the whip (the shot first, the filter after it): when the shot
// moved in the tree it remounted at both ends of every whip, and each remount opened a fresh WebGL context, until
// headless Chrome refused to create more in a long render.
const Whip: React.FC<{ side: "in" | "out"; start: number; id: string; children: React.ReactNode }> = ({ side, start, id, children }) => {
  const p = (useCurrentFrame() - start) / FADE;
  const moving = p >= 0 && p < 1;
  const { e, smear } = whip(moving ? p : 0);
  const x = side === "in" ? (1 - e) * 100 : -e * 100;
  const blur = moving && smear > 0.5;
  return (
    <AbsoluteFill style={moving ? { transform: `translateX(${x}%)`, filter: blur ? `url(#${id})` : undefined } : undefined}>
      {children}
      {blur && (
        <svg width={0} height={0} style={{ position: "absolute" }}>
          <filter id={id} x="-20%" y="0" width="140%" height="100%">
            <feGaussianBlur stdDeviation={`${smear} 0`} edgeMode="duplicate" />
          </filter>
        </svg>
      )}
    </AbsoluteFill>
  );
};

// Fades its shot in over the DISSOLVE lead (eased), drawn over the previous shot. Same tree before, during and after.
const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const p = Math.min(1, (useCurrentFrame() + 1) / (DISSOLVE + 1));
  const a = p * p * (3 - 2 * p);
  return <AbsoluteFill style={p < 1 ? { opacity: a } : undefined}>{children}</AbsoluteFill>;
};

// Dips through cream over the DIP lead: the cream rises over the previous shot, this shot appears under it at the
// midpoint (when the cream is opaque) and the cream clears by the cut. Same tree before, during and after.
const Dip: React.FC<{ children: React.ReactNode; colour?: string }> = ({ children, colour = DIP_COLOUR }) => {
  const p = Math.min(1, (useCurrentFrame() + 1) / (DIP + 1));
  const k = Math.min(1, (1 - Math.abs(2 * p - 1)) * 1.25); // holds full cream for a frame or two round the midpoint
  const cream = k * k * (3 - 2 * k);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={p < 0.5 ? { opacity: 0 } : undefined}>{children}</AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: colour, opacity: p < 1 ? cream : 0 }} />
    </AbsoluteFill>
  );
};

// `soundOnly` (input prop: the soundtrack render, the cue dump) mounts no shot, so a preview composition's sound
// renders as fast as a Video's.
// `dip` (optional): the colour the "dip" transitions pass through (default cream; a dark film can dip through black).
export const ShotList: React.FC<{ shots: Shot[]; dip?: string }> = ({ shots, dip }) =>
  (getInputProps() as { soundOnly?: boolean }).soundOnly === true ? null : (
  <>
    {shots.map(([from, to, ShotComponent, fade], i) => {
      const lead = leadOf(fade);
      const exits = shots[i + 1]?.[3] === true;
      let shot = <ShotComponent />;
      if (exits) shot = <Whip side="out" start={to - from + lead - FADE} id={`whip-out-${from}`}>{shot}</Whip>;
      if (fade === true) shot = <Whip side="in" start={0} id={`whip-in-${from}`}>{shot}</Whip>;
      if (fade === "dissolve") shot = <Dissolve>{shot}</Dissolve>;
      if (fade === "dip") shot = <Dip colour={dip}>{shot}</Dip>;
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
