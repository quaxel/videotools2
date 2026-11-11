import React from "react";
import * as THREE from "three";

// 3D arms and legs for a puppet card. The card's SVG is drawn with limbs as invisible joint markers (Puppet with
// limbs="markers"); `probeJoints` reads where those markers land, and <CardLimbs> builds ink sticks, hands and feet
// on them in the card's own frame (x right, y up, z toward the camera; 1 puppet unit = K metres). So every pose the
// card can do (walks, sitting, gestures, reaches, tool motions) keeps its limbs, now with depth: arms in front of the
// body come toward the camera, the others sit just behind it. A hand given a world point (pose.worldL / worldR)
// reaches it in 3D from the card's shoulder.

export type Joint = { x: number; y: number; shape?: string; front?: boolean };
export type Joints = Record<string, Joint>;

const INK = "#161212";
const LIMB_R = 0.0185; // LIMB 30 units / 2, in metres
const UPPER = 0.165;
const LOWER = 0.155;

// Read the joint markers of an SVG puppet markup: their positions in the root viewBox units.
export const probeJoints = (markup: string): Joints => {
  const out: Joints = {};
  if (typeof document === "undefined" || !markup.includes("data-j")) return out;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;visibility:hidden;pointer-events:none;";
  host.innerHTML = markup;
  document.body.appendChild(host);
  try {
    const root = host.querySelector("svg") as SVGSVGElement | null;
    const rootM = root?.getScreenCTM();
    if (!root || !rootM) return out;
    const inv = rootM.inverse();
    host.querySelectorAll<SVGGraphicsElement>("[data-j]").forEach((el) => {
      const m = el.getScreenCTM();
      if (!m) return; // inside a display:none group (noArms / noLegs)
      const p = new DOMPoint(Number(el.getAttribute("cx")), Number(el.getAttribute("cy"))).matrixTransform(inv.multiply(m));
      out[el.getAttribute("data-j")!] = { x: p.x, y: p.y, shape: el.getAttribute("data-shape") ?? undefined, front: el.getAttribute("data-front") === "1" };
    });
  } finally {
    host.remove();
  }
  return out;
};

export const twoBone = (s: THREE.Vector3, t: THREE.Vector3, a: number, b: number, pole: THREE.Vector3) => {
  const dir = t.clone().sub(s);
  const d = Math.min(a + b - 0.001, Math.max(Math.abs(a - b) + 0.001, dir.length()));
  const u = dir.normalize();
  const n = pole.clone().sub(u.clone().multiplyScalar(pole.dot(u)));
  if (n.lengthSq() < 1e-8) n.set(0, -1, 0);
  n.normalize();
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  return { joint: s.clone().add(u.clone().multiplyScalar(x)).add(n.multiplyScalar(h)), end: s.clone().add(u.clone().multiplyScalar(d)) };
};

const Mat: React.FC<{ color: string; back?: boolean }> = ({ color, back }) => (
  <meshBasicMaterial color={color} side={back ? THREE.BackSide : THREE.FrontSide} toneMapped={false} fog={false} />
);

const Stick: React.FC<{ p: THREE.Vector3; q: THREE.Vector3; r?: number; color?: string }> = ({ p, q, r = LIMB_R, color }) => {
  const d = q.clone().sub(p);
  const len = d.length();
  if (len < 1e-5) return null;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  const mid = p.clone().add(q).multiplyScalar(0.5);
  return (
    <group position={mid} quaternion={quat}>
      {color ? (
        <>
          <mesh castShadow>
            <capsuleGeometry args={[r * 0.68, len, 4, 12]} />
            <Mat color={color} />
          </mesh>
          <mesh>
            <capsuleGeometry args={[r, len, 4, 12]} />
            <Mat color={INK} back />
          </mesh>
        </>
      ) : (
        <mesh castShadow>
          <capsuleGeometry args={[r, len, 4, 12]} />
          <Mat color={INK} />
        </mesh>
      )}
    </group>
  );
};

// A coloured band round the middle of a limb segment (a suit's commander stripe).
const Band: React.FC<{ p: THREE.Vector3; q: THREE.Vector3; r: number; color: string }> = ({ p, q, r, color }) => {
  const d = q.clone().sub(p);
  const len = d.length();
  if (len < 1e-5) return null;
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  const mid = p.clone().lerp(q, 0.5);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[r * 0.74, r * 0.74, len * 0.22, 16]} />
      <Mat color={color} />
    </mesh>
  );
};

// A mitten hand: a ball, a pointing finger along the forearm, or a flatter open palm.
const Hand3: React.FC<{ at: THREE.Vector3; along: THREE.Vector3; shape?: string; glove?: string }> = ({ at, along, shape, glove }) => {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), along.clone().normalize());
  const r = (shape === "fist" ? 0.036 : 0.033) * (glove ? 1.35 : 1);
  return (
    <group position={at} quaternion={q}>
      <mesh castShadow scale={shape === "open" ? [1.15, 1.05, 0.75] : [1, 1, 1]}>
        <sphereGeometry args={[glove ? r * 0.8 : r, 16, 12]} />
        <Mat color={glove ?? INK} />
      </mesh>
      {glove && (
        <mesh scale={shape === "open" ? [1.15, 1.05, 0.75] : [1, 1, 1]}>
          <sphereGeometry args={[r, 16, 12]} />
          <Mat color={INK} back />
        </mesh>
      )}
      {shape === "point" && (
        <mesh position={[0, 0.045, 0]}>
          <capsuleGeometry args={[0.011, 0.045, 4, 8]} />
          <Mat color={INK} />
        </mesh>
      )}
    </group>
  );
};

const Foot3: React.FC<{ at: THREE.Vector3; scale: number; profile: boolean; facing: number; shoes?: string }> = ({ at, scale, profile, facing, shoes }) => {
  // the card foot is 76 x 36 units; in profile it points along facing (x), from the front toward the camera (z)
  const s = (scale / 1.3) * 1;
  const dims: [number, number, number] = profile ? [0.05 * s, 0.024 * s, 0.033 * s] : [0.042 * s, 0.024 * s, 0.05 * s];
  return (
    <group position={[at.x + (profile ? facing * 0.012 : 0), at.y, at.z + (profile ? 0 : 0.02)]}>
      <mesh castShadow scale={dims}>
        <sphereGeometry args={[1, 16, 10]} />
        <Mat color={shoes ?? INK} />
      </mesh>
      {shoes && (
        <mesh scale={dims.map((d) => d + 0.006) as [number, number, number]}>
          <sphereGeometry args={[1, 16, 10]} />
          <Mat color={INK} back />
        </mesh>
      )}
    </group>
  );
};

export const CardLimbs: React.FC<{
  joints: Joints;
  K: number;
  profile: boolean;
  facing: number; // 1 / -1 in profile
  pants?: string;
  shoes?: string;
  sleeves?: string;
  gloves?: string;
  bulk?: number;
  stripe?: string;
  // world hand targets already converted into the card frame (metres)
  reachL?: THREE.Vector3;
  reachR?: THREE.Vector3;
}> = ({ joints, K, profile, facing, pants, shoes, sleeves, gloves, bulk = 1, stripe, reachL, reachR }) => {
  const R = LIMB_R * bulk;
  const P = (j: Joint | undefined, z: number) => (j ? new THREE.Vector3(j.x * K, -j.y * K, z) : undefined);
  const arms = (["armL", "armR"] as const).map((name) => {
    const s = joints[`${name}:s`];
    const e = joints[`${name}:e`];
    const h = joints[`${name}:h`];
    if (!s || !e || !h) return null;
    const front = !!s.front;
    const world = name === "armL" ? reachL : reachR;
    const S = P(s, 0)!;
    let E: THREE.Vector3;
    let H: THREE.Vector3;
    if (world) {
      const out = Math.sign(s.x) || (name === "armL" ? -1 : 1);
      const r = twoBone(S, world, UPPER, LOWER, new THREE.Vector3(out * 0.8, -1, -0.5));
      E = r.joint;
      H = r.end;
    } else {
      // card arm, with depth: in front of the body it comes toward the camera, behind it stays just behind
      E = P(e, front ? 0.03 : -0.012)!;
      H = P(h, front ? 0.06 : -0.012)!;
    }
    return (
      <group key={name}>
        <Stick p={S} q={E} r={R} color={sleeves} />
        <Stick p={E} q={H} r={R} color={sleeves} />
        {stripe && <Band p={S} q={E} r={R} color={stripe} />}
        <Hand3 at={H} along={H.clone().sub(E)} shape={h.shape} glove={gloves} />
      </group>
    );
  });
  const legs = (["legL", "legR"] as const).map((name) => {
    const hip = joints[`${name}:s`];
    const kn = joints[`${name}:e`];
    const ank = joints[`${name}:h`];
    const ft = joints[`${name}:f`];
    if (!hip || !kn || !ank) return null;
    const z = profile ? (name === "legL" ? -0.016 : -0.006) : -0.01;
    const [A, B, C] = [P(hip, z)!, P(kn, z)!, P(ank, z)!];
    return (
      <group key={name}>
        <Stick p={A} q={B} r={R} color={pants} />
        <Stick p={B} q={C} r={R} color={pants} />
        {stripe && <Band p={A} q={B} r={R} color={stripe} />}
        {ft && <Foot3 at={P(ft, z)!} scale={Number(ft.shape ?? 1.3)} profile={profile} facing={facing} shoes={shoes} />}
      </group>
    );
  });
  return (
    <group userData={{ ghost: true }}>
      {legs}
      {arms}
    </group>
  );
};
