import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cardTilt, livenPose, PuppetPlacement, PuppetPose, toonRamp, useShotFrame, useSpeech } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";

// 1815 bicornes for the officers, as a 3D prop riding on each puppet's head (the puppet kit has no bicorne, and the
// shared puppet is frozen). It follows the card exactly: the same live pose Stage draws (livenPose + turnToCamera),
// the card's yaw toward the camera and its lean-back tilt, and the head's own transform in the SVG (bob, crouch,
// air, lean/tip, head tilt), so it rides every nod. Rendered through Stage's `foreground` slot, which comes after
// the cast, so it sees the same livened camera as the cards.
// Napoleon wears his side to side ("en bataille"); the marshals and generals wear theirs front to back.

const K = 1.3 / 1060;
const INK = "#161212";
const FELT = "#17161b";

export type HatSpec = { wear: "across" | "along"; cockade: string[]; trim?: string; plume?: boolean; scale?: number };
export const HATS: Record<string, HatSpec> = {
  napoleon: { wear: "across", cockade: ["#2a3f9a", "#f6f2ea", "#d42a2a"], scale: 1.0 },
  grouchy: { wear: "along", cockade: ["#2a3f9a", "#f6f2ea", "#d42a2a"], trim: "#e8c040", plume: true },
  gerard: { wear: "along", cockade: ["#2a3f9a", "#f6f2ea", "#d42a2a"], trim: "#e8c040" },
  wellington: { wear: "along", cockade: ["#141414", "#2a2a2a"] },
  blucher: { wear: "along", cockade: ["#141414", "#f6f2ea", "#141414"], trim: "#d8d8d0" },
};

// A point (x, y) in the SVG, rotated by `deg` (clockwise on screen, as SVG) about (cx, cy).
const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

// Where the hat sits on the drawn head, in puppet units (SVG, y down), and its roll in screen degrees.
const hatAnchor = (pose: PuppetPose): { p: [number, number]; roll: number; view: "front" | "side" | "back"; facing: 1 | -1 } => {
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
    let p = rot([26, -958], tiltH, [0, -640]);
    p = rot(p, tip, [0, -280]);
    p = [p[0] + back, p[1] + bob + drop - air];
    return { p: facing === 1 ? p : [-p[0], p[1]], roll: facing === 1 ? tip + tiltH : -(tip + tiltH), view, facing };
  }
  const slump = pose.slump ?? 0;
  const k = 1 - 0.55 * bend;
  const headDrop = slump * 34 + 520 * (1 - k);
  const lean = pose.lean ?? 0;
  let p = rot([0, -958], tiltH, [0, -640]);
  p = [p[0], p[1] + headDrop];
  p = rot(p, lean, [0, -280]);
  p = [p[0], p[1] + bob + crouch * 150 - air];
  return { p, roll: lean + tiltH, view, facing: 1 };
};

// The hat in its own frame: long axis x, up y, flaps facing ±z; base on y = 0 round the head.
const Bicorne: React.FC<{ spec: HatSpec }> = ({ spec }) => {
  const geo = useOwned(() => {
    const w = 0.56;
    const h = 0.25;
    const s = new THREE.Shape();
    s.moveTo(-w / 2, 0.02);
    s.bezierCurveTo(-w * 0.42, h * 0.75, -w * 0.18, h, 0, h);
    s.bezierCurveTo(w * 0.18, h, w * 0.42, h * 0.75, w / 2, 0.02);
    s.quadraticCurveTo(0, 0.07, -w / 2, 0.02);
    const flap = new THREE.ExtrudeGeometry(s, { depth: 0.035, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 18 });
    flap.translate(0, 0, -0.0175);
    const trim = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(
        Array.from({ length: 17 }, (_, i) => {
          const t = i / 16;
          const pt = s.getPoint(t * 0.5);
          return new THREE.Vector3(pt.x, pt.y, 0);
        }),
      ),
      40,
      spec.plume ? 0.016 : 0.011,
      6,
      false,
    );
    return { flap, trim, dispose: () => (flap.dispose(), trim.dispose()) };
  }, [spec.plume]);
  const mats = useOwned(() => {
    const felt = new THREE.MeshToonMaterial({ color: FELT, gradientMap: toonRamp });
    const ink = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    const trim = new THREE.MeshToonMaterial({ color: spec.trim ?? FELT, gradientMap: toonRamp });
    const plume = new THREE.MeshToonMaterial({ color: "#f4f2ec", gradientMap: toonRamp });
    return { felt, ink, trim, plume, dispose: () => [felt, ink, trim, plume].forEach((m) => m.dispose()) };
  }, [spec.trim]);
  const flapAt = (z: number, lean: number, key: string, cockade: boolean) => (
    <group key={key} position={[0, 0.03, z]} rotation={[lean, 0, 0]}>
      <mesh geometry={geo.flap} material={mats.felt} />
      <mesh geometry={geo.flap} material={mats.ink} scale={[1.03, 1.04, 1.5]} />
      {spec.trim && <mesh geometry={geo.trim} material={spec.plume ? mats.plume : mats.trim} position={[0, 0, z > 0 ? 0.03 : -0.03]} />}
      {cockade &&
        spec.cockade.map((c, i) => (
          <mesh key={i} position={[-0.12, 0.13, (z > 0 ? 1 : -1) * (0.032 + i * 0.002)]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05 - i * 0.016, 0.05 - i * 0.016, 0.006, 20]} />
            <meshToonMaterial color={c} gradientMap={toonRamp} />
          </mesh>
        ))}
    </group>
  );
  return (
    <group scale={spec.scale ?? 1}>
      {/* the crown band round the head */}
      <mesh position={[0, 0.035, 0]}>
        <cylinderGeometry args={[0.165, 0.17, 0.07, 28]} />
        <meshToonMaterial color={FELT} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.035, 0]} scale={1.05}>
        <cylinderGeometry args={[0.165, 0.17, 0.07, 28]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {flapAt(0.075, -0.16, "f", true)}
      {flapAt(-0.075, 0.16, "b", false)}
    </group>
  );
};

// Hats for every officer in `cast` (the same placements the Stage gets). `energy` as the Stage's (default 1).
export const Bicornes: React.FC<{ cast: PuppetPlacement[]; energy?: number }> = ({ cast, energy = 1 }) => {
  const f = useShotFrame();
  const speech = useSpeech();
  const camera = useThree((s) => s.camera);
  return (
    <group userData={{ ghost: true }}>
      {cast
        .filter((p) => HATS[p.id])
        .map((p) => {
          const said = speech(p.id);
          const pose0 = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
          const live = livenPose(pose0, p.at, p.id, f, energy, said);
          const [x, z] = live.at;
          const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
          const pose = turnToCamera(live.pose, yaw);
          if ((pose.lie ?? 0) > 0) return null;
          const tilt = cardTilt([camera.position.x, camera.position.y, camera.position.z], live.at);
          const a = hatAnchor(pose);
          const spec = HATS[p.id];
          const across = spec.wear === "across";
          // Seen exactly edge-on a bicorne reads as a spike, so those views are turned a three-quarter toward the camera.
          const EDGE = 0.8;
          const turn = a.view === "side" ? (across ? Math.PI / 2 - 1.15 * a.facing : 0) : across ? 0 : Math.PI / 2 - EDGE;
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  <group position={[a.p[0] * K, -a.p[1] * K, 0.06]} rotation={[0, 0, (-a.roll * Math.PI) / 180]}>
                    <group rotation={[0, turn + (a.view === "side" && a.facing === -1 && !across ? Math.PI : 0), 0]}>
                      <Bicorne spec={spec} />
                    </group>
                  </group>
                </group>
              </group>
            </group>
          );
        })}
    </group>
  );
};
