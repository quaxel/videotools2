import React from "react";
import { useCurrentFrame } from "remotion";
import { CameraShot, PuppetLook, Stage } from "../engine";
import { CANDLES, throneBg, throneLight, ThroneMode, ThroneRoomSet } from "../three/ThroneRoomSet";

// ThroneRoomSet in its five moods (one per 10 frames): a wide view of the dais with the King and a guard.

const KING: PuppetLook = { skin: "#eec4a0", hair: "#d8d4cc", outfit: "#e0b040", vest: "#5a2a7a", hat: "#f2c230", hatStyle: "crown", beard: "#d8d4cc" };
const GUARD: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#f2e6c8", vest: "#b8242a", hat: "#1a1a22", hatStyle: "shako" };
const MODES: ThroneMode[] = ["candle", "night", "corner", "dawn", "day"];

export const ThronePreview: React.FC = () => {
  const f = useCurrentFrame();
  const mode = MODES[Math.min(4, Math.floor(f / 10))];
  const camera: CameraShot = { position: [0.4, 1.5, 4.6], target: [0, 1.4, -1.5], fov: 50 };
  return (
    <Stage
      set={<ThroneRoomSet camera={camera} frame={f} mode={mode} />}
      camera={camera}
      bg={throneBg(mode)}
      energy={0}
      puppets={[
        { id: "king", look: KING, at: [0, -1.95], pose: { expression: "smug" } },
        { id: "guard", look: GUARD, at: [0.9, 0.3], pose: { expression: "worried" } },
      ]}
      light={throneLight(mode, f, [CANDLES[0], CANDLES[1]])}
    />
  );
};
