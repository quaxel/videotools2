import React from "react";
import { useCurrentFrame } from "remotion";
import { BlenderModel, CameraShot, moodBackground, Room, Stage } from "../engine";

// One model on the floor of a plain warm room, the camera orbiting it once over 120 frames, so its silhouette, ink
// outline and joints read from every side. Props: `src` (under public/), `joints` as degrees (or metres) per frame,
// e.g. { spin_FL: 6 } turns that joint 6° a frame, and `size` (the model's rough length in metres, sets the distance).
export const MODEL_PREVIEW_FRAMES = 120;

export type ModelPreviewProps = { src: string; joints?: Record<string, number>; size?: number };

export const ModelPreview: React.FC<ModelPreviewProps> = ({ src, joints = {}, size = 3.6 }) => {
  const f = useCurrentFrame();
  const a = Math.PI / 5 + (f / MODEL_PREVIEW_FRAMES) * Math.PI * 2; // starts at a 3/4 front view (front faces +Z)
  const d = size * 2.6;
  const camera: CameraShot = { position: [Math.sin(a) * d, size * 0.55, Math.cos(a) * d], target: [0, size * 0.18, 0], fov: 50 };
  const posed = Object.fromEntries(Object.entries(joints).map(([k, v]) => [k, v * f]));
  return (
    <Stage
      set={
        <Room camera={camera} mood="warm" floor="#9a7550" wall="#d9c3a0" width={d * 3} depth={d * 3}>
          <BlenderModel src={src} joints={posed} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("warm")}
    />
  );
};
