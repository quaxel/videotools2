import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { faceChange, moveChange } from "../engine/anim";
import { livenPose } from "../engine/liven";
import { Gesture } from "../puppet/gestures";
import { Expression, Puppet, PuppetLook } from "../puppet/Puppet";

// Five seconds of every expression held, with the automatic micro-expressions on, for checking that no face freezes.

const LOOK: PuppetLook = { skin: "#e9b48a", hair: "#b5562a", outfit: "#e8b923", pattern: "#fff6b0", long: true };
const ALL: Expression[] = ["neutral", "excited", "smug", "skeptical", "shocked", "angry", "sad", "confused", "worried", "awkward", "happy", "thinking", "disgusted", "bored", "determined"];

export const FacePreview: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        {ALL.map((e, i) => {
          const id = `face-${e}`;
          const { pose } = livenPose({ expression: e }, [0, 0], id, f, 1);
          const x = (i % 3) * 360;
          const y = 20 + Math.floor(i / 3) * 380;
          return (
            <g key={e}>
              <svg x={x} y={y} width={360} height={340} viewBox="-300 -1130 600 640">
                <Puppet look={LOOK} pose={pose} id={id} />
              </svg>
              <text x={x + 180} y={y + 368} textAnchor="middle" fontFamily="Helvetica" fontSize={30} fill="#222">
                {e}
              </text>
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// One character going through every expression, two seconds each, easing from one face to the next, with its name on screen.
export const FACE_TOUR_STEP = 60;
export const FaceTour: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(ALL.length - 1, Math.floor(f / FACE_TOUR_STEP));
  const e = ALL[i];
  const face = faceChange(ALL.map((x, n) => [n * FACE_TOUR_STEP, x]), f, 10);
  const { pose } = livenPose(face, [0, 0], "tour", f, 1);
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <svg x={0} y={260} width={1080} height={1500} viewBox="-460 -1160 920 1280">
          <Puppet look={LOOK} pose={pose} id="tour" />
        </svg>
        <text x={540} y={1840} textAnchor="middle" fontFamily="Helvetica" fontWeight={700} fontSize={76} fill="#222">
          {e}
        </text>
        <text x={540} y={160} textAnchor="middle" fontFamily="Helvetica" fontSize={40} fill="#777">
          {i + 1} / {ALL.length}
        </text>
      </svg>
    </AbsoluteFill>
  );
};

// The ready-made gestures one after another, each with a fitting face, easing from one to the next.
const GESTURE_TOUR: [Gesture, Expression][] = [
  ["wave", "happy"],
  ["point", "determined"],
  ["shrug", "awkward"],
  ["armsCrossed", "skeptical"],
  ["handsOnHips", "smug"],
  ["chin", "thinking"],
  ["scratchHead", "confused"],
  ["facepalm", "sad"],
  ["cheer", "excited"],
  ["clap", "happy"],
];
export const GESTURE_TOUR_FRAMES = FACE_TOUR_STEP * GESTURE_TOUR.length;
export const GestureTour: React.FC = () => {
  const f = useCurrentFrame();
  const i = Math.min(GESTURE_TOUR.length - 1, Math.floor(f / FACE_TOUR_STEP));
  const [g] = GESTURE_TOUR[i];
  const move = moveChange(GESTURE_TOUR.map(([gesture, e], n) => [n * FACE_TOUR_STEP, e, gesture]), f, 12);
  const { pose } = livenPose(move, [0, 0], "gtour", f, 1);
  return (
    <AbsoluteFill style={{ background: "#fdf3e3" }}>
      <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
        <svg x={0} y={260} width={1080} height={1500} viewBox="-460 -1160 920 1280">
          <Puppet look={LOOK} pose={pose} id="gtour" />
        </svg>
        <text x={540} y={1840} textAnchor="middle" fontFamily="Helvetica" fontWeight={700} fontSize={76} fill="#222">
          {g}
        </text>
      </svg>
    </AbsoluteFill>
  );
};
