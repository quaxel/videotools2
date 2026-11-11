import React from "react";
import { AbsoluteFill } from "remotion";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";
import { CameraShot, pup, Room, Shot, ShotList, Stage, useShotFrame } from "../engine";

// The Apollo moon suit (look.space): front, side, back and lying, flat (SVG) and in a 3D Stage.
const SUIT: PuppetLook = { skin: "#f0c8a8", hair: "#2a1e16", outfit: "#f1eee7", pants: "#f1eee7", shoes: "#f1eee7", sleeves: "#f1eee7", gloves: "#f1eee7", bulk: 1.9, space: {} };
const CDR: PuppetLook = { ...SUIT, skin: "#e8b898", space: { stripe: "#c8302c" } };
const VIEWS: Partial<PuppetPose>[] = [{ view: "front" }, { view: "side", facing: 1 }, { view: "back" }, { view: "side", facing: 1, lie: 0.5 }, { view: "side", facing: 1, lie: 1 }];

export const SuitPreview: React.FC = () => (
  <AbsoluteFill style={{ background: "#e8eef2" }}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      {[SUIT, CDR].map((look, r) =>
        VIEWS.map((v, c) => (
          <svg key={`${r}${c}`} x={(c % 3) * 360} y={20 + r * 940 + Math.floor(c / 3) * 470} width={360} height={460} viewBox="-640 -1300 1280 1360">
            <Puppet look={look} pose={{ expression: c === 3 ? "shocked" : "happy", ...v } as PuppetPose} id={`s${r}${c}`} />
          </svg>
        )),
      )}
    </svg>
  </AbsoluteFill>
);

const CAM: CameraShot = { position: [0.2, 1.3, 5.2], target: [0.2, 0.7, 0], fov: 40 };
const SuitShot: React.FC = () => {
  const f = useShotFrame();
  return (
    <Stage
      set={<Room camera={CAM} mood="cold" floor="#77777a" wall="#2a2e3a" width={8} depth={4}>{null}</Room>}
      camera={CAM}
      bg="#202430"
      energy={0}
      puppets={[
        pup("a", CDR, [-1.1, 0.2], { view: "front", expression: "happy" }),
        pup("b", SUIT, [-0.1, 0.2], { view: "side", facing: 1, expression: "shocked", lie: f > 0 ? 0.45 : 0.45, air: 300 }),
        pup("c", SUIT, [1.2, 0.2], { view: "side", facing: 1, expression: "worried", lie: 1 }),
        pup("d", CDR, [0.3, -1.0], { view: "back" }),
      ]}
    />
  );
};

const SHOTS: Shot[] = [[0, 30, SuitShot, false]];
export const SuitStage: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
