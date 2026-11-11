import React from "react";
import * as THREE from "three";
import { toonRamp } from "../three/toon";
import { PuppetLook } from "./Puppet";

// PROTOTYPE: the puppet as a real 3D figure instead of a flat card, in the same design (big round head, bean body,
// ink stick limbs, round dark hands), cel-shaded with an ink hull so it sits in the toon sets. Same height as the
// card (PUPPET_HEIGHT 1.3 m). Arms reach 3D points with two-bone IK, so a hand can hold a prop from every angle.
// Faces are built from flat ink shapes on the head; only "happy", "neutral" and "determined" are drawn so far.

type V3 = [number, number, number];
const INK = "#161212";
const K = 1.3 / 1060; // metres per 2D puppet unit, so proportions match the card

const HEAD_Y = 800 * K;
const HEAD_R = 205 * K;
const SHOULDER: V3 = [0.15, 0.66, 0];
const UPPER = 0.18; // a little longer than the card's arms, so a hand reaches the lips and a tool in front
const LOWER = 0.17;

export type Pose3D = {
  expression?: "happy" | "neutral" | "determined";
  handL?: V3; // hand targets in the puppet's own frame (metres; +x its left on screen when facing camera, +z its front)
  handR?: V3;
  headPitch?: number; // radians, + tips the head back
  headYaw?: number;
  lean?: number; // radians the body tips forward at the hips
  glass?: { fill: number; tilt: number }; // a water glass in the right hand: fill 0..1, tilt (radians, toward the face)
};

const toon = (color: string) => <meshToonMaterial color={color} gradientMap={toonRamp} />;
const hull = <meshBasicMaterial color={INK} side={THREE.BackSide} />;

const v = (a: V3) => new THREE.Vector3(...a);

// A stick (limb) from p to q.
const Stick: React.FC<{ p: THREE.Vector3; q: THREE.Vector3; r?: number }> = ({ p, q, r = 0.017 }) => {
  const d = q.clone().sub(p);
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const mid = p.clone().add(q).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={quat}>
      <mesh castShadow>
        <capsuleGeometry args={[r, d.length(), 4, 10]} />
        <meshToonMaterial color={INK} gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// Two-bone IK: the elbow bends down and back, like a real arm.
const solveArm = (s: THREE.Vector3, t: THREE.Vector3) => {
  const dir = t.clone().sub(s);
  const d = Math.min(UPPER + LOWER - 0.001, Math.max(Math.abs(UPPER - LOWER) + 0.001, dir.length()));
  const u = dir.normalize();
  const pole = new THREE.Vector3(0, -1, -0.6);
  const n = pole.sub(u.clone().multiplyScalar(pole.dot(u))).normalize();
  const x = (UPPER * UPPER - LOWER * LOWER + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, UPPER * UPPER - x * x));
  const elbow = s.clone().add(u.clone().multiplyScalar(x)).add(n.multiplyScalar(h));
  const hand = s.clone().add(u.clone().multiplyScalar(d));
  return { elbow, hand };
};

// Flat ink pieces stuck on the head surface, facing out along `dir` from the head centre.
const OnHead: React.FC<{ dir: V3; lift?: number; children: React.ReactNode }> = ({ dir, lift = 0.004, children }) => {
  const n = v(dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
  return (
    <group position={n.clone().multiplyScalar(HEAD_R + lift)} quaternion={q}>
      {children}
    </group>
  );
};

const Arc: React.FC<{ r: number; arc: number; rot: number; tube?: number }> = ({ r, arc, rot, tube = 0.0075 }) => (
  <mesh rotation={[0, 0, rot]}>
    <torusGeometry args={[r, tube, 6, 20, arc]} />
    <meshBasicMaterial color={INK} />
  </mesh>
);

const Face: React.FC<{ expression: Pose3D["expression"] }> = ({ expression = "neutral" }) => (
  <>
    {[-1, 1].map((s) => (
      <React.Fragment key={s}>
        {expression === "happy" ? (
          // closed happy eyes: upturned arcs
          <OnHead dir={[s * 0.34, 0.06, 0.94]}>
            <Arc r={0.03} arc={Math.PI} rot={0} />
          </OnHead>
        ) : (
          <OnHead dir={[s * 0.34, 0.06, 0.94]} lift={0}>
            <mesh scale={[1, 1, 0.35]}>
              <sphereGeometry args={[0.042, 20, 14]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
            <mesh scale={[1, 1, 0.35]}>
              <sphereGeometry args={[0.049, 20, 14]} />
              {hull}
            </mesh>
            <mesh position={[s * -0.004, -0.004, 0.016]}>
              <sphereGeometry args={[0.017, 14, 10]} />
              <meshBasicMaterial color={INK} />
            </mesh>
          </OnHead>
        )}
        {/* brows */}
        <OnHead dir={[s * 0.34, 0.3, 0.9]}>
          <mesh rotation={[0, 0, expression === "determined" ? s * 0.35 : s * -0.08]}>
            <boxGeometry args={[0.07, 0.013, 0.006]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </OnHead>
        {/* cheeks */}
        {expression === "happy" && (
          <OnHead dir={[s * 0.52, -0.16, 0.84]} lift={0.001}>
            <mesh scale={[1, 0.6, 0.1]}>
              <sphereGeometry args={[0.03, 14, 10]} />
              <meshBasicMaterial color="#f08a8a" transparent opacity={0.55} />
            </mesh>
          </OnHead>
        )}
      </React.Fragment>
    ))}
    {/* mouth: a smile, or a flat line */}
    <OnHead dir={[0, -0.36, 0.93]}>{expression === "determined" ? <Arc r={0.05} arc={Math.PI * 0.5} rot={Math.PI * 0.25} /> : <Arc r={0.045} arc={Math.PI * 0.8} rot={Math.PI * 1.1} />}</OnHead>
  </>
);

const Glass: React.FC<{ fill: number; tilt: number }> = ({ fill, tilt }) => {
  const H = 0.11;
  const f = Math.max(0, Math.min(1, fill));
  return (
    // gripped round its middle; tilts about the hand toward the face
    <group rotation={[tilt, 0, 0]}>
      <mesh position={[0, -H / 2 + (H * f) / 2, 0]}>
        <cylinderGeometry args={[0.03, 0.027, H * f, 20]} />
        <meshToonMaterial color="#5ab8e8" gradientMap={toonRamp} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.034, 0.029, H, 24, 1, true]} />
        <meshBasicMaterial color="#dff3fb" transparent opacity={0.35} side={THREE.DoubleSide} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.037, 0.032, H + 0.004, 24, 1, true]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

export const Puppet3D: React.FC<{ look: PuppetLook; pose?: Pose3D; position: V3; yaw?: number }> = ({ look, pose = {}, position, yaw = 0 }) => {
  const lean = pose.lean ?? 0;
  const restL: V3 = [-0.2, 0.42, 0.03];
  const restR: V3 = [0.2, 0.42, 0.03];
  const arms = ([-1, 1] as const).map((s) => {
    const sh = v([s * SHOULDER[0], SHOULDER[1], SHOULDER[2]]);
    const target = v((s < 0 ? pose.handL : pose.handR) ?? (s < 0 ? restL : restR));
    return { s, sh, ...solveArm(sh, target) };
  });
  const hairColor = look.hair;
  return (
    <group position={position} rotation={[0, yaw, 0]}>
      {/* legs and feet */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <Stick p={v([s * 0.068, 0.36, 0])} q={v([s * 0.075, 0.04, 0.01])} r={0.018} />
          <mesh position={[s * 0.078, 0.025, 0.035]} scale={[1, 0.55, 1.5]} castShadow>
            <sphereGeometry args={[0.04, 16, 10]} />
            <meshToonMaterial color={look.shoes ?? INK} gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      <group position={[0, 0.34, 0]} rotation={[lean, 0, 0]}>
        <group position={[0, -0.34, 0]}>
          {/* bean body */}
          <group position={[0, 0.535, 0]} scale={[1, 1, 0.78]}>
            <mesh castShadow>
              <capsuleGeometry args={[0.17, 0.14, 8, 24]} />
              {toon(look.vest ?? look.outfit)}
            </mesh>
            <mesh>
              <capsuleGeometry args={[0.178, 0.14, 8, 24]} />
              {hull}
            </mesh>
          </group>
          {/* arms and hands */}
          {arms.map(({ s, sh, elbow, hand }) => (
            <group key={s}>
              <Stick p={sh} q={elbow} />
              <Stick p={elbow} q={hand} />
              <mesh position={hand} castShadow>
                <sphereGeometry args={[0.036, 16, 12]} />
                <meshToonMaterial color={INK} gradientMap={toonRamp} />
              </mesh>
              {s > 0 && pose.glass && (
                <group position={hand.clone().add(new THREE.Vector3(0, 0.0, 0.03))}>
                  <Glass {...pose.glass} />
                </group>
              )}
            </group>
          ))}
          {/* head */}
          <group position={[0, 0.74, 0]} rotation={[-(pose.headPitch ?? 0), pose.headYaw ?? 0, 0]}>
            <group position={[0, HEAD_Y - 0.74, 0]}>
              <mesh castShadow>
                <sphereGeometry args={[HEAD_R, 40, 28]} />
                {toon(look.skin)}
              </mesh>
              <mesh>
                <sphereGeometry args={[HEAD_R + 0.009, 40, 28]} />
                {hull}
              </mesh>
              {[-1, 1].map((s) => (
                <mesh key={s} position={[s * HEAD_R * 0.98, -0.01, 0]} scale={[0.6, 1, 1]}>
                  <sphereGeometry args={[0.04, 14, 10]} />
                  {toon(look.skin)}
                </mesh>
              ))}
              {/* hair: a cap over the top and back, tipped back so the forehead shows */}
              <group rotation={[-0.55, 0, 0]}>
                <mesh castShadow>
                  <sphereGeometry args={[HEAD_R * 1.05, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  <meshToonMaterial color={hairColor} gradientMap={toonRamp} side={THREE.DoubleSide} />
                </mesh>
                <mesh>
                  <sphereGeometry args={[HEAD_R * 1.05 + 0.008, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
                  {hull}
                </mesh>
              </group>
              <Face expression={pose.expression} />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};
