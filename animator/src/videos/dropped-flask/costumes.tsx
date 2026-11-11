import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cardTilt, livenPose, PuppetPlacement, PuppetPose, toonRamp, useShotFrame, useSpeech } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";

// 1903-1918 costume pieces the puppet kit lacks, riding on each card like volcano-bicycle/costumes.tsx (the same live
// pose Stage draws, the card's yaw and lean-back tilt, the head's own transform): a moustache, a high stiff collar and
// tie, a flat motoring cap with goggles pushed up on it (motorists after about 1900), a wide lady's hat with a chiffon
// veil tied under the chin, a brimmed First World War steel helmet and a gas mask with two round glass eyepieces.

const K = 1.3 / 1060;
const INK = "#161212";

const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

// A point on the drawn figure (puppet units, front view, y down) moved with the head, and the head's roll.
const headPoint = (pose: PuppetPose, pt: [number, number]): { p: [number, number]; roll: number; facing: 1 | -1 } => {
  const view = pose.view === "side" ? "side" : pose.view === "back" ? "back" : "front";
  const air = pose.air ?? 0;
  const bob = pose.bob ?? 0;
  const crouch = Math.max(0, Math.min(1, pose.crouch ?? 0));
  const bend = Math.max(0, Math.min(1, pose.bend ?? 0));
  const tiltH = pose.headTilt ?? 0;
  if (view === "side") {
    const facing = pose.facing ?? 1;
    const seat = pose.sit ? 1 : Math.max(0, Math.min(1, pose.seat ?? 0));
    const drop = crouch * 130;
    const back = -(crouch * 120 + Math.sin(seat * Math.PI) * 70);
    const tip = bend * 70 + crouch * 32 + Math.sin(seat * Math.PI) * 18;
    let p = rot([pt[0] + 26, pt[1]], tiltH, [0, -640]);
    p = rot(p, tip, [0, -280]);
    p = [p[0] + back, p[1] + bob + drop - air];
    return { p: facing === 1 ? p : [-p[0], p[1]], roll: facing === 1 ? tip + tiltH : -(tip + tiltH), facing };
  }
  const slump = pose.slump ?? 0;
  const k = 1 - 0.55 * bend;
  const headDrop = slump * 34 + 520 * (1 - k);
  const lean = pose.lean ?? 0;
  let p = rot(pt, tiltH, [0, -640]);
  p = [p[0], p[1] + headDrop];
  p = rot(p, lean, [0, -280]);
  p = [p[0], p[1] + bob + crouch * 150 - air];
  return { p, roll: lean + tiltH, facing: 1 };
};

const ellipse = (rx: number, ry: number, cx = 0, cy = 0) => {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
};
const CACHE = new Map<string, THREE.Shape>();
const shape = (make: () => THREE.Shape, key: string) => {
  let v = CACHE.get(key);
  if (!v) CACHE.set(key, (v = make()));
  return v;
};
const halfEllipse = (rx: number, ry: number) => {
  const s = new THREE.Shape();
  s.absellipse(0, 0, rx, ry, 0, Math.PI, false, 0);
  s.closePath();
  return s;
};

// A flat shape in the card plane with an ink rim (a slightly larger copy behind it).
const Flat: React.FC<{ shape: THREE.Shape; color: string; ink?: number; z?: number; opacity?: number; toon?: boolean; dep: unknown[] }> = ({ shape, color, ink = 0.008, z = 0, opacity = 1, toon = false, dep }) => {
  const g = useOwned(() => {
    const geo = new THREE.ShapeGeometry(shape, 20);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!;
    const cx = (bb.min.x + bb.max.x) / 2;
    const cy = (bb.min.y + bb.max.y) / 2;
    const w = Math.max(0.001, bb.max.x - bb.min.x);
    const h = Math.max(0.001, bb.max.y - bb.min.y);
    const rim = geo.clone();
    rim.translate(-cx, -cy, 0);
    rim.scale((w + ink * 2) / w, (h + ink * 2) / h, 1);
    rim.translate(cx, cy, 0);
    return { geo, rim, dispose: () => (geo.dispose(), rim.dispose()) };
  }, dep);
  return (
    <group position={[0, 0, z]}>
      {ink > 0 && opacity >= 1 && (
        <mesh geometry={g.rim}>
          <meshBasicMaterial color={INK} />
        </mesh>
      )}
      <mesh geometry={g.geo} position={[0, 0, 0.0015]}>
        {toon ? <meshToonMaterial color={color} gradientMap={toonRamp} transparent={opacity < 1} opacity={opacity} /> : <meshBasicMaterial color={color} transparent={opacity < 1} opacity={opacity} depthWrite={opacity >= 1} />}
      </mesh>
    </group>
  );
};

const SH = {
  gogRim: ellipse(0.055, 0.045),
  gogGlass: ellipse(0.038, 0.03),
  eyeRim: ellipse(0.066, 0.066),
  eye: ellipse(0.05, 0.05),
  snout: ellipse(0.045, 0.04),
  veil: ellipse(0.27, 0.2),
  bow: ellipse(0.06, 0.035),
  knot: ellipse(0.018, 0.014),
};

export type Costume = {
  moustache?: string;
  collar?: string; // high stiff collar colour (with `tie`)
  tie?: string;
  flatCap?: string;
  goggles?: boolean;
  veilHat?: string; // hat colour; the veil is pale chiffon
  veil?: string;
  helmet?: string;
  gasMask?: string; // mask cloth colour
  hatOff?: number; // metres the hat has flown off (up and back), 0 on the head
};

const Moustache: React.FC<{ color: string; side: boolean }> = ({ color, side }) => {
  const s = React.useMemo(() => {
    const sh = new THREE.Shape();
    if (side) {
      sh.moveTo(-0.03, 0.008);
      sh.quadraticCurveTo(0.0, 0.03, 0.035, 0.006);
      sh.quadraticCurveTo(0.01, -0.02, -0.03, -0.004);
      sh.closePath();
    } else {
      sh.moveTo(0, 0.012);
      sh.quadraticCurveTo(0.05, 0.03, 0.085, -0.012);
      sh.quadraticCurveTo(0.05, -0.006, 0, -0.008);
      sh.quadraticCurveTo(-0.05, -0.006, -0.085, -0.012);
      sh.quadraticCurveTo(-0.05, 0.03, 0, 0.012);
    }
    return sh;
  }, [side]);
  return <Flat shape={s} color={color} ink={0.004} dep={[side, color, "m"]} />;
};

const CollarTie: React.FC<{ collar: string; tie: string }> = ({ collar, tie }) => {
  const band = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.075, 0.03);
    s.lineTo(0.075, 0.03);
    s.lineTo(0.07, -0.015);
    s.lineTo(0.012, -0.03);
    s.lineTo(-0.012, -0.03);
    s.lineTo(-0.07, -0.015);
    s.closePath();
    return s;
  }, []);
  const tieS = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.016, 0);
    s.lineTo(0.016, 0);
    s.lineTo(0.022, -0.17);
    s.lineTo(0, -0.195);
    s.lineTo(-0.022, -0.17);
    s.closePath();
    return s;
  }, []);
  return (
    <group>
      <Flat shape={tieS} color={tie} ink={0.004} z={0.001} dep={[tie, "t"]} />
      <group position={[0, 0.018, 0.004]}>
        <Flat shape={band} color={collar} ink={0.004} dep={[collar, "c"]} />
      </group>
      <group position={[0, -0.006, 0.008]}>
        <Flat shape={SH.knot} color={tie} ink={0.003} dep={[tie, "k"]} />
      </group>
    </group>
  );
};

// The flat cap from the front: a full soft crown wider than the head, the short peak under it; goggles pushed up.
const FlatCap: React.FC<{ color: string; goggles: boolean; side: boolean }> = ({ color, goggles, side }) => (
  <group>
    <group position={[side ? -0.02 : 0, 0.02, 0]}>
      <Flat shape={shape(() => halfEllipse(side ? 0.25 : 0.26, 0.11), `halfEllipse(side ? 0.25 : 0.26, 0.11)`.replace(/\s/g, "") + side)} color={color} toon dep={[color, side, "crown"]} />
    </group>
    <group position={[side ? 0.2 : 0, 0.0, 0.006]}>
      <Flat shape={shape(() => ellipse(side ? 0.1 : 0.22, 0.032), `ellipse(side ? 0.1 : 0.22, 0.032)`.replace(/\s/g, "") + side)} color={new THREE.Color(color).multiplyScalar(0.75).getStyle()} dep={[color, side, "peak"]} />
    </group>
    {goggles && !side && (
      <group position={[0, 0.07, 0.012]}>
        <mesh position={[0, 0, -0.001]}>
          <planeGeometry args={[0.5, 0.03]} />
          <meshBasicMaterial color="#3a2a1e" />
        </mesh>
        {[-1, 1].map((sx) => (
          <group key={sx} position={[sx * 0.075, 0, 0]}>
            <Flat shape={SH.gogRim} color="#c8a050" ink={0.006} dep={["gr", sx]} />
            <group position={[0, 0, 0.003]}>
              <Flat shape={SH.gogGlass} color="#9fd0dc" ink={0} dep={["gl", sx]} />
            </group>
          </group>
        ))}
      </group>
    )}
  </group>
);

const VeilHat: React.FC<{ color: string; veil: string; side: boolean }> = ({ color, veil, side }) => (
  <group>
    {/* the veil, behind the brim: falls past the cheeks and ties under the chin */}
    {!side && (
      <group position={[0, -0.16, -0.02]}>
        <Flat shape={SH.veil} color={veil} opacity={0.55} ink={0} dep={["veil", veil]} />
      </group>
    )}
    <group position={[0, 0.06, 0.004]}>
      <Flat shape={shape(() => halfEllipse(side ? 0.13 : 0.16, 0.1), `halfEllipse(side ? 0.13 : 0.16, 0.1)`.replace(/\s/g, "") + side)} color={color} toon dep={[color, side, "vc"]} />
    </group>
    <group position={[0, 0.05, 0.008]}>
      <Flat shape={shape(() => ellipse(side ? 0.3 : 0.38, 0.05), `ellipse(side ? 0.3 : 0.38, 0.05)`.replace(/\s/g, "") + side)} color={color} toon dep={[color, side, "vb"]} />
    </group>
    {/* a band and a bow of chiffon on the crown */}
    <group position={[side ? 0.0 : 0.1, 0.1, 0.012]}>
      <Flat shape={SH.bow} color={veil} ink={0.004} dep={["bow", veil]} />
    </group>
  </group>
);

const Helmet: React.FC<{ color: string; side: boolean }> = ({ color, side }) => (
  <group>
    <group position={[0, 0.0, 0]}>
      <Flat shape={shape(() => halfEllipse(side ? 0.2 : 0.21, 0.15), `halfEllipse(side ? 0.2 : 0.21, 0.15)`.replace(/\s/g, "") + side)} color={color} toon dep={[color, side, "dome"]} />
    </group>
    <group position={[0, 0.0, 0.008]}>
      <Flat shape={shape(() => ellipse(side ? 0.34 : 0.33, 0.04), `ellipse(side ? 0.34 : 0.33, 0.04)`.replace(/\s/g, "") + side)} color={new THREE.Color(color).multiplyScalar(0.8).getStyle()} dep={[color, side, "brim"]} />
    </group>
  </group>
);

// The gas mask: a cloth face piece over the face, two round eyepieces with dark rims (laminated glass, the pivot of
// shot 10), a snout with the outlet valve and a hose running down.
const GasMask: React.FC<{ color: string; side: boolean; glint: number }> = ({ color, side, glint }) => (
  <group>
    <Flat shape={shape(() => ellipse(side ? 0.16 : 0.205, 0.2), `ellipse(side ? 0.16 : 0.205, 0.2)`.replace(/\s/g, "") + side)} color={color} toon dep={[color, side, "face"]} />
    {(side ? [0.06] : [-0.075, 0.075]).map((x) => (
      <group key={x} position={[x, 0.03, 0.01]}>
        <Flat shape={SH.eyeRim} color="#2a2a2a" ink={0.004} dep={["rim", x]} />
        <group position={[0, 0, 0.003]}>
          <Flat shape={SH.eye} color="#a8d8dc" ink={0} dep={["eye", x]} />
        </group>
        <mesh position={[-0.015, 0.016, 0.008]} rotation={[0, 0, 0.6]}>
          <planeGeometry args={[0.012, 0.04]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.6 + 0.4 * glint} toneMapped={false} />
        </mesh>
      </group>
    ))}
    <group position={[side ? 0.11 : 0, -0.12, 0.014]}>
      <Flat shape={SH.snout} color="#4a4a44" dep={["snout", side]} />
    </group>
    <mesh position={[side ? 0.12 : 0.02, -0.25, 0.01]} rotation={[0, 0, side ? 0.4 : -0.15]}>
      <planeGeometry args={[0.035, 0.2]} />
      <meshBasicMaterial color="#3a3a34" />
    </mesh>
  </group>
);

// Every piece for every puppet in `cast` that has a costume. `energy` as the Stage's (default 1).
export const Costumes: React.FC<{ cast: PuppetPlacement[]; looks: Record<string, Costume>; energy?: number }> = ({ cast, looks, energy = 1 }) => {
  const f = useShotFrame();
  const speech = useSpeech();
  const camera = useThree((s) => s.camera);
  return (
    <group userData={{ ghost: true }}>
      {cast
        .filter((p) => looks[p.id])
        .map((p) => {
          const o = looks[p.id];
          const said = speech(p.id);
          const pose0 = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
          const live = livenPose(pose0, p.at, p.id, f, energy, said);
          const [x, z] = live.at;
          const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
          const pose = turnToCamera(live.pose, yaw);
          if ((pose.lie ?? 0) > 0) return null;
          const tilt = cardTilt([camera.position.x, camera.position.y, camera.position.z], live.at);
          const side = pose.view === "side";
          const backV = pose.view === "back";
          const hat = headPoint(pose, [0, -905]);
          const lip = headPoint(pose, [side ? 150 : 0, -722]);
          const face = headPoint(pose, [side ? 100 : 0, -770]);
          const neck = headPoint(pose, [0, -585]);
          const r = (q: { roll: number }) => (-q.roll * Math.PI) / 180;
          const off = o.hatOff ?? 0;
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  {o.moustache && !backV && (
                    <group position={[lip.p[0] * K, -lip.p[1] * K, 0.05]} rotation={[0, 0, r(lip)]} scale={[lip.facing, 1, 1]}>
                      <Moustache color={o.moustache} side={side} />
                    </group>
                  )}
                  {o.collar && o.tie && !backV && !side && (
                    <group position={[neck.p[0] * K, -neck.p[1] * K, 0.045]} rotation={[0, 0, r(neck)]}>
                      <CollarTie collar={o.collar} tie={o.tie} />
                    </group>
                  )}
                  {o.gasMask && !backV && (
                    <group position={[face.p[0] * K, -face.p[1] * K, 0.055]} rotation={[0, 0, r(face)]} scale={[face.facing, 1, 1]}>
                      <GasMask color={o.gasMask} side={side} glint={0.5 + 0.5 * Math.sin(f * 0.08)} />
                    </group>
                  )}
                  {o.flatCap && (
                    <group position={[hat.p[0] * K, -hat.p[1] * K + off, 0.06]} rotation={[0, 0, r(hat) + off * 2]} scale={[hat.facing, 1, 1]} userData={{ hatOf: p.id }}>
                      <FlatCap color={o.flatCap} goggles={!!o.goggles} side={side} />
                    </group>
                  )}
                  {o.veilHat && (
                    <group position={[hat.p[0] * K - off * 0.6, -hat.p[1] * K + off, 0.06]} rotation={[0, 0, r(hat) + off * 3]} scale={[hat.facing, 1, 1]} userData={{ hatOf: p.id }}>
                      <VeilHat color={o.veilHat} veil={o.veil ?? "#f0e8f0"} side={side} />
                    </group>
                  )}
                  {o.helmet && (
                    <group position={[hat.p[0] * K, -hat.p[1] * K - 0.01, 0.065]} rotation={[0, 0, r(hat)]} scale={[hat.facing, 1, 1]} userData={{ hatOf: p.id }}>
                      <Helmet color={o.helmet} side={side} />
                    </group>
                  )}
                </group>
              </group>
            </group>
          );
        })}
    </group>
  );
};
