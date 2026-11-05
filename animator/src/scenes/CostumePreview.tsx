import React from "react";
import { AbsoluteFill } from "remotion";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";

// The period costume options (skirt, apron, kerchief, hat, beard, vest, suspenders) on three 1870s farm folk,
// each in front, side and back view.

const CROUCH: PuppetLook = { skin: "#f2cfae", hair: "#5a3420", outfit: "#4f6f9a", long: true, skirt: true, apron: "#f4efe2", kerchief: "#b8473a" };
const ELDER: PuppetLook = { skin: "#e6b88e", hair: "#3a2a1e", outfit: "#d8c49a", vest: "#5a4030", hat: "#4a3a2c", beard: "#3a2a1e" };
const YOUNG: PuppetLook = { skin: "#f4d0b0", hair: "#8a5a2a", outfit: "#9aa0a0", suspenders: "#5a3a24", hat: "#e0c27a" };
const RUNNER: PuppetLook = { skin: "#f2c9a4", hair: "#2a1d16", outfit: "#f4f2ea", shorts: "#2a2f4a", bib: "31" };
const OFFICIAL: PuppetLook = { skin: "#eac09a", hair: "#4a3a2a", outfit: "#2e2e36", hat: "#1e1e24", hatStyle: "bowler", beard: "#4a3a2a" };

const KING: PuppetLook = { skin: "#eec4a0", hair: "#d8d4cc", outfit: "#5a2a7a", vest: "#e0b040", hat: "#f2c230", hatStyle: "crown", beard: "#d8d4cc" };
const GUARD: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#b8242a", vest: "#1f2a5a", hat: "#1a1a22", hatStyle: "shako" };

const VIEWS: Partial<PuppetPose>[] = [{ view: "front" }, { view: "side", facing: 1 }, { view: "back" }];

export const CostumePreview: React.FC = () => (
  <AbsoluteFill style={{ background: "#e8eef2" }}>
    <svg viewBox="0 0 1080 1920" width={1080} height={1920}>
      {[KING, GUARD, RUNNER, OFFICIAL].map((look, r) =>
        VIEWS.map((v, c) => (
          <svg key={`${r}${c}`} x={c * 360} y={20 + r * 470} width={360} height={460} viewBox="-440 -1280 880 1320">
            <Puppet look={look} pose={{ expression: c === 0 ? (r === 2 ? "disgusted" : "neutral") : "happy", ...v } as PuppetPose} id={`c${r}${c}`} />
          </svg>
        )),
      )}
    </svg>
  </AbsoluteFill>
);
