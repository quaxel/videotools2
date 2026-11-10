import React from "react";
import { useCurrentFrame } from "remotion";
import { CameraShot, drinkFrom, Stage } from "../engine";
import { PuppetLook } from "../puppet/Puppet";
import { Puppet3D } from "../puppet/Puppet3D";
import { SaloonSet, saloonLight } from "../videos/olcu/props";

// Side by side in the saloon: the puppet as today's flat card (left) and as a 3D figure (right), both drinking a
// glass of water while the camera swings round them, so the difference shows from several angles.

export const PUPPET3D_FRAMES = 90;
const LOOK: PuppetLook = { skin: "#d9a07a", hair: "#2a2018", outfit: "#3d7fc4", pattern: "#bfe0ff", pants: "#2a2a34" };
const smooth = (t: number) => {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
};

export const Puppet3DPreview: React.FC = () => {
  const f = useCurrentFrame();
  const a = -0.55 + 1.1 * smooth(f / 90);
  const camera: CameraShot = { position: [Math.sin(a) * 2.9, 1.15, 1.0 + Math.cos(a) * 2.9], target: [0, 0.72, 1.0], fov: 40 };
  // the 3D drinker: lift (14 f), drink (40 f), lower
  const t = f - 8;
  const up = t < 14 ? smooth(t / 14) : t < 54 ? 1 : 1 - smooth((t - 54) / 14);
  const drink = smooth((t - 14) / 40);
  const tilt = -(0.4 + 0.9 * drink) * up;
  const lips = { x: 0.03, y: 0.9 + 0.03 * up, z: 0.29 };
  // the glass's rim is ~0.06 m from the grip along the glass: put the grip below and in front of the lips
  const grip: [number, number, number] = [lips.x, lips.y - 0.06 * Math.cos(tilt), lips.z - 0.03 + 0.06 * Math.sin(-tilt) * 0.3];
  const rest: [number, number, number] = [0.2, 0.42, 0.08];
  const hand: [number, number, number] = [rest[0] + (grip[0] - rest[0]) * up, rest[1] + (grip[1] - rest[1]) * up, rest[2] + (grip[2] - rest[2]) * up];
  const card = drinkFrom(f, { start: 8, sip: 40 });
  return (
    <Stage
      set={
        <SaloonSet camera={camera}>
          <Puppet3D
            look={LOOK}
            position={[0.3, 0, 1.0]}
            yaw={-0.15}
            pose={{ expression: up > 0.5 ? "happy" : "neutral", handR: hand, headPitch: 0.25 * up * (0.5 + drink), glass: { fill: 0.85 - 0.7 * drink, tilt } }}
          />
        </SaloonSet>
      }
      camera={camera}
      bg="#2a140c"
      light={saloonLight()}
      puppets={[{ id: "card", look: LOOK, at: [-0.3, 1.0], pose: { expression: "happy", ...card.pose } }]}
    />
  );
};
