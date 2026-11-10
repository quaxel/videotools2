import React, { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AbsoluteFill } from "remotion";
import { probeJoints } from "../puppet/CardLimbs";
import { Puppet, PuppetLook, PuppetPose } from "../puppet/Puppet";

// Debug: the joint markers read back from the card SVG, printed, for checking CardLimbs against the 2D puppet.
const LOOK: PuppetLook = { skin: "#e9b48a", hair: "#4a2e1e", outfit: "#3d7fc4" };
const CASES: [string, PuppetPose][] = [
  ["front neutral armL/armR [12,10]", { expression: "neutral", armL: [0, 0], armR: [0, 0] }],
  ["side facing -1 reachR [-200,-500]", { expression: "neutral", view: "side", facing: -1, reachR: [-200, -500] }],
  ["front reachL [-150,-700]", { expression: "neutral", reachL: [-150, -700] }],
];
export const JointProbe: React.FC = () => {
  const lines = useMemo(
    () =>
      CASES.map(([name, pose]) => {
        const m = renderToStaticMarkup(
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="-560 -1160 1120 1240" width={2240} height={2480}>
            <Puppet id="p" look={LOOK} pose={pose} limbs="markers" />
          </svg>,
        );
        const j = probeJoints(m);
        const f = (k: string) => (j[k] ? `${k}=(${j[k].x.toFixed(0)},${j[k].y.toFixed(0)})` : `${k}=-`);
        return `${name}: ${["armL:s", "armR:s", "armL:h", "armR:h", "legL:h", "legR:f"].map(f).join(" ")}`;
      }),
    [],
  );
  return (
    <AbsoluteFill style={{ background: "#fff", padding: 40, fontSize: 30, fontFamily: "monospace" }}>
      {lines.map((l) => (
        <div key={l} style={{ marginBottom: 30, whiteSpace: "pre-wrap" }}>
          {l}
        </div>
      ))}
    </AbsoluteFill>
  );
};
