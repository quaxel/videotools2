import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { canvasTexture, cardTilt, Halo, InkBox, InkCylinder, Label, livenPose, PuppetPlacement, PuppetPose, toonRamp, useShotFrame, useSpeech, Vec3 } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";

// Props for "The Green Glow That Looked Inside the Human Body" (Würzburg 1895-1901). The tube, the screen, the plate
// and the ring are drawn up to 2x real size (plan.json format_note). References: guide/references/wurzburg-lab-1895.md.

const INK = "#161212";
const WALNUT = "#4a2e1e";
const WALNUT_DARK = "#2e1c12";
const rnd = (i: number, k: number) => {
  const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const glowColor = (hex: string, k: number) => new THREE.Color(hex).multiplyScalar(k);

export const Ball: React.FC<{ position: Vec3; radius: number; color: string; scale?: Vec3; ink?: number; basic?: boolean; glow?: number }> = ({ position, radius, color, scale = [1, 1, 1], ink = 0.008, basic, glow = 1 }) => (
  <group position={position} scale={scale}>
    <mesh>
      <sphereGeometry args={[radius, 18, 12]} />
      {basic ? <meshBasicMaterial color={glowColor(color, glow)} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
    </mesh>
    {ink > 0 && (
      <mesh>
        <sphereGeometry args={[radius + ink, 18, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// A stick between two points.
export const Stick: React.FC<{ a: Vec3; b: Vec3; radius: number; color: string; ink?: number }> = ({ a, b, radius, color, ink = 0.004 }) => {
  const d = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const len = Math.max(0.001, d.length());
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return <InkCylinder radius={radius} height={len} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} rotation={[e.x, e.y, e.z]} color={color} ink={ink} />;
};

// ---------- furniture ----------

// A long narrow walnut work table on slim tapered legs with a low stretcher (the Würzburg lab).
export const WorkTable: React.FC<{ position: Vec3; size?: Vec3; rotationY?: number; color?: string }> = ({ position, size = [1.4, 0.75, 0.6], rotationY = 0, color = WALNUT }) => {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[w, 0.05, d]} position={[0, h - 0.025, 0]} color={color} ink={0.008} />
      <InkBox size={[w - 0.08, 0.08, d - 0.08]} position={[0, h - 0.09, 0]} color={WALNUT_DARK} ink={0.005} />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.045, h - 0.05, 0.045]} position={[sx * (w / 2 - 0.06), (h - 0.05) / 2, sz * (d / 2 - 0.06)]} color={WALNUT_DARK} ink={0.005} />),
      )}
      <InkBox size={[w - 0.12, 0.03, 0.03]} position={[0, 0.16, 0]} color={WALNUT_DARK} ink={0.004} />
    </group>
  );
};

// A three-legged wooden stool with a round seat (top at 0.34 m, HIP_HEIGHT). `tip` 0..1 tips it over backwards.
export const Stool: React.FC<{ position: Vec3; tip?: number }> = ({ position, tip = 0 }) => (
  <group position={position}>
    <group position={[0, 0, -0.16]} rotation={[-tip * 1.45, 0, 0]}>
      <group position={[0, 0, 0.16]}>
        <InkCylinder radius={0.16} height={0.045} position={[0, 0.32, 0]} color="#7a4e2e" ink={0.006} />
        {[0, 1, 2].map((i) => {
          const a = (i / 3) * Math.PI * 2 + 0.5;
          return <Stick key={i} a={[Math.cos(a) * 0.08, 0.3, Math.sin(a) * 0.08]} b={[Math.cos(a) * 0.15, 0.0, Math.sin(a) * 0.15]} radius={0.016} color={WALNUT} />;
        })}
      </group>
    </group>
  </group>
);

// A tall window with white frames and small panes; `night` shows a dark sky, else snowy daylight; pale curtains.
export const LabWindow: React.FC<{ position: Vec3; size?: [number, number]; sky?: string; curtain?: string; glow?: number }> = ({ position, size = [0.9, 1.5], sky = "#cfe0ea", curtain = "#d8cfb8", glow = 1 }) => {
  const [w, h] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0, 0.005]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={glowColor(sky, glow)} toneMapped={false} />
      </mesh>
      {[-1, 0, 1].map((i) => (
        <InkBox key={`v${i}`} size={[0.035, h, 0.03]} position={[(i * w) / 2, 0, 0.02]} color="#f2efe6" ink={0.004} />
      ))}
      {[-0.5, -0.17, 0.17, 0.5].map((t) => (
        <InkBox key={`h${t}`} size={[w, 0.03, 0.03]} position={[0, t * h, 0.022]} color="#f2efe6" ink={0.004} />
      ))}
      {[-1, 1].map((s) => (
        <InkBox key={`c${s}`} size={[0.22, h + 0.2, 0.05]} position={[s * (w / 2 + 0.12), 0, 0.06]} color={curtain} ink={0.006} />
      ))}
    </group>
  );
};

// A dark walnut glass-fronted instrument cabinet with brass things inside.
export const Cabinet: React.FC<{ position: Vec3; width?: number; height?: number }> = ({ position, width = 0.8, height = 1.7 }) => (
  <group position={position}>
    <InkBox size={[width, height, 0.38]} position={[0, height / 2, 0]} color={WALNUT_DARK} ink={0.01} />
    <mesh position={[0, height * 0.6, 0.195]}>
      <planeGeometry args={[width * 0.84, height * 0.62]} />
      <meshToonMaterial color="#3e4a4a" gradientMap={toonRamp} />
    </mesh>
    {[0.42, 0.62, 0.82].map((t, i) => (
      <group key={t}>
        <InkBox size={[width * 0.84, 0.02, 0.3]} position={[0, height * t - 0.1, 0.02]} color={WALNUT} ink={0.003} />
        {[-0.25, 0, 0.25].map((x, k) => (
          <InkCylinder key={x} radius={0.03 + 0.015 * rnd(i, k)} height={0.08 + 0.08 * rnd(k, i)} position={[x * width, height * t - 0.05 + 0.04 * rnd(i, k), 0.05]} color={k % 2 ? "#c8a040" : "#9a7a3a"} ink={0.003} />
        ))}
      </group>
    ))}
    <InkBox size={[width * 0.9, 0.02, 0.02]} position={[0, height * 0.6, 0.2]} color="#c8a040" ink={0} />
  </group>
);

// A wall calendar page (cream, a dark header band) whose text pops in on `appear`.
export const WallDate: React.FC<{ position: Vec3; text: string; appear?: number; width?: number; head?: string }> = ({ position, text, appear, width = 0.34, head = "#7a2a22" }) => (
  <group position={position}>
    <InkBox size={[width + 0.06, width * 1.05, 0.02]} color="#f4f0e6" ink={0.006} />
    <InkBox size={[width + 0.06, width * 0.2, 0.026]} position={[0, width * 0.43, 0.004]} color={head} ink={0.004} />
    <Label text={text} position={[0, -0.04, 0.017]} width={width} bg="#f4f0e6" border={false} appear={appear} />
  </group>
);

// An oil lamp on a table: brass font, glass chimney, flame; `on` 0..1 turns the wick down.
export const TableLamp: React.FC<{ position: Vec3; f: number; on?: number }> = ({ position, f, on = 1 }) => {
  const flick = 1 + Math.sin(f * 0.7) * 0.05 + Math.sin(f * 1.9) * 0.04;
  return (
    <group position={position}>
      <InkCylinder radius={0.07} height={0.03} position={[0, 0.015, 0]} color="#9a7a3a" ink={0.004} />
      <InkCylinder radius={0.02} height={0.12} position={[0, 0.09, 0]} color="#b8892e" ink={0.003} />
      <mesh position={[0, 0.19, 0]}>
        <sphereGeometry args={[0.07, 16, 12]} />
        <meshToonMaterial color="#c99a3a" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.028, 0.045, 0.16, 16, 1, true]} />
        <meshBasicMaterial color="#f4e8c0" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>
      {on > 0.02 && (
        <mesh position={[0, 0.28, 0]} scale={[1, flick * (0.3 + 0.7 * on), 1]}>
          <sphereGeometry args={[0.02, 10, 8]} />
          <meshBasicMaterial color={glowColor("#ffcf5a", 0.8 + 0.15 * on)} toneMapped={false} />
        </mesh>
      )}
      <pointLight position={[0, 0.3, 0.05]} intensity={1.8 * flick * on} distance={4} color="#ffc070" />
      <Halo position={[0, 0.29, -0.06]} size={0.45} color="#ffb860" strength={0.1 * flick * on} />
    </group>
  );
};

// ---------- the apparatus ----------

// The Hittorf / Crookes tube: a long conical glass bulb lying on its side (wide rounded end toward +x), a narrow neck
// with the cathode wire at -x, a short side arm pointing down near the neck; held by a wooden clamp stand. `glow`
// lights the wide end green and the neck violet; `cover` 0..1 slides a sleeve of black cardboard over it from -x.
export const CrookesTube: React.FC<{ position: Vec3; glow?: number; cover?: number; frame?: number; scale?: number; rotationY?: number; label?: boolean; stand?: boolean }> = ({
  position,
  glow = 0,
  cover = 0,
  frame = 0,
  scale = 1,
  rotationY = 0,
  label = false,
  stand = true,
}) => {
  const geo = useOwned(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      const x = -0.2 + t * 0.36;
      const r = 0.018 + 0.062 * Math.pow(t, 1.25);
      pts.push(new THREE.Vector2(r, x));
    }
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(0.08 * Math.cos(a), 0.16 + 0.05 * Math.sin(a)));
    }
    const g = new THREE.LatheGeometry(pts, 28);
    g.rotateZ(-Math.PI / 2);
    return { g, dispose: () => g.dispose() };
  }, []);
  const flick = glow * (0.88 + 0.12 * Math.sin(frame * 1.3) * Math.sin(frame * 0.41));
  const sleeve = Math.max(0, Math.min(1, cover));
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {stand && (
        <>
          <InkBox size={[0.22, 0.03, 0.16]} position={[0, 0.015, 0]} color={WALNUT} ink={0.005} />
          <InkCylinder radius={0.012} height={0.2} position={[0, 0.13, 0]} color="#8a8a86" ink={0.003} />
          <InkBox size={[0.05, 0.05, 0.05]} position={[0, 0.235, 0]} color={WALNUT} ink={0.004} />
        </>
      )}
      <group position={[0, 0.3, 0]}>
        {/* glass */}
        <mesh geometry={geo.g}>
          <meshBasicMaterial color={flick > 0.05 ? glowColor("#9ae8c0", 0.5 + 0.3 * flick) : "#cfe6e8"} transparent opacity={0.38} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        <mesh geometry={geo.g} scale={1.06}>
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
        {/* glowing end and violet neck */}
        {flick > 0.05 && (
          <>
            <mesh position={[0.2, 0, 0]}>
              <sphereGeometry args={[0.055, 16, 12]} />
              <meshBasicMaterial color={glowColor("#8aff9a", 1.4 * flick)} transparent opacity={0.6} toneMapped={false} depthWrite={false} />
            </mesh>
            <mesh position={[-0.12, 0, 0]}>
              <sphereGeometry args={[0.022, 12, 8]} />
              <meshBasicMaterial color={glowColor("#a890ff", 1.5 * flick)} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
            </mesh>
          </>
        )}
        {/* cathode wire and cap at the neck */}
        <InkCylinder radius={0.012} height={0.05} position={[-0.215, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#b8b4a8" ink={0.003} />
        <InkCylinder radius={0.003} height={0.08} position={[-0.27, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c87a3a" ink={0} />
        {/* the side arm (anode) pointing down */}
        <InkCylinder radius={0.011} height={0.07} position={[-0.09, -0.055, 0]} color="#cfe6e8" ink={0.003} />
        <InkCylinder radius={0.003} height={0.06} position={[-0.09, -0.11, 0]} color="#c87a3a" ink={0} />
        {/* black cardboard sleeve sliding on from the neck end */}
        {sleeve > 0.01 && (
          <group position={[-0.25 + (0.48 * sleeve) / 2, 0, 0]}>
            <InkBox size={[0.48 * sleeve, 0.2, 0.2]} color="#141416" ink={0.008} />
          </group>
        )}
      </group>
      {label && sleeve < 0.5 && <Label text="CROOKES TUBE" position={[0.08, 0.5, 0.05]} width={0.3} />}
      {label && sleeve >= 0.5 && <Label text={"BLACK\nCARDBOARD"} position={[0.08, 0.52, 0.05]} width={0.3} />}
    </group>
  );
};

// The induction coil on its polished base: a fat cream cylinder between end plates, brass interrupter, two
// discharger rods with ball ends; `on` makes a violet spark jump the gap now and then.
export const InductionCoil: React.FC<{ position: Vec3; frame: number; on?: number; rotationY?: number; scale?: number }> = ({ position, frame, on = 0, rotationY = 0, scale = 1 }) => {
  const spark = on > 0 && Math.sin(frame * 2.3) * Math.sin(frame * 0.71) > 0.35;
  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      <InkBox size={[0.5, 0.04, 0.22]} position={[0, 0.02, 0]} color="#8a3a22" ink={0.006} />
      <InkCylinder radius={0.075} height={0.34} position={[0, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} color="#e8dcc0" ink={0.006} />
      {[-0.18, 0.18].map((x) => (
        <InkCylinder key={x} radius={0.09} height={0.015} position={[x, 0.12, 0]} rotation={[0, 0, Math.PI / 2]} color="#a8c0c0" ink={0.004} />
      ))}
      <InkBox size={[0.06, 0.08, 0.08]} position={[-0.22, 0.08, 0]} color="#c8a040" ink={0.004} />
      {[-0.06, 0.06].map((x, i) => (
        <group key={x}>
          <InkCylinder radius={0.007} height={0.14} position={[x, 0.27, 0]} color="#c8a040" ink={0.002} />
          <Ball position={[x * 0.5 + (i ? 0.012 : -0.012), 0.34, 0]} radius={0.014} color="#e0c060" ink={0.003} />
        </group>
      ))}
      {spark && (
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[0.036, 0.006, 0.006]} />
          <meshBasicMaterial color={glowColor("#d8c8ff", 3)} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ---------- the skeleton hand ----------

export type HandSpec = { spread?: number; curl?: number[]; ring?: boolean; bone?: string; flesh?: string; fleshOpacity?: number; ringColor?: string; break?: boolean };

// A flat X-ray picture of a left hand in its own xy plane (fingers up +y, wrist at the origin, about 0.24 m tall):
// radius and ulna stubs, carpals, five metacarpals and the phalanges, with a faint flesh outline round them. `curl`
// (0..1 per finger, thumb first) shortens a finger as it bends toward the palm, `spread` fans them, `ring` puts a
// band on the ring finger. `break` draws a snapped forearm instead (the 1896 doctor's plate).
export const SkeletonHand: React.FC<HandSpec & { position?: Vec3; rotation?: Vec3; scale?: number; z?: number }> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  spread = 0.4,
  curl = [0, 0, 0, 0, 0],
  ring = false,
  bone = "#0c1a0a",
  flesh = "#1e4a18",
  fleshOpacity = 0.35,
  ringColor,
  break: snapped = false,
}) => {
  const mat = useOwned(() => {
    const b = new THREE.MeshBasicMaterial({ color: bone, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const fl = new THREE.MeshBasicMaterial({ color: flesh, transparent: true, opacity: fleshOpacity, toneMapped: false, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const r = new THREE.MeshBasicMaterial({ color: ringColor ?? bone, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3 });
    return { b, fl, r, dispose: () => [b, fl, r].forEach((m) => m.dispose()) };
  }, [bone, flesh, fleshOpacity, ringColor]);
  const cap = useOwned(() => {
    const g = new THREE.CapsuleGeometry(0.5, 1, 4, 10);
    const c = new THREE.CircleGeometry(0.5, 20);
    return { g, c, dispose: () => (g.dispose(), c.dispose()) };
  }, []);
  // one bone: a flat capsule from a to b with width w (z flattened)
  const boneAt = (a: [number, number], b: [number, number], w0: number, key: string, m: THREE.Material = mat.b) => {
    const w = w0 * 1.5;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy);
    const ang = Math.atan2(dy, dx) - Math.PI / 2;
    return (
      <mesh key={key} geometry={cap.g} material={m} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0.002]} rotation={[0, 0, ang]} scale={[w, Math.max(w, len) / 2, 0.002]} />
    );
  };
  // fingers: base on the palm, angle from vertical (rad, + toward screen right), segment lengths, width
  const F = [
    { base: [0.05, 0.05], ang: -0.85, segs: [0.05, 0.04], w: 0.014 }, // thumb (left hand seen palm-down: thumb on the right), two phalanges
    { base: [0.03, 0.11], ang: -0.2, segs: [0.058, 0.036, 0.026], w: 0.011 },
    { base: [0.008, 0.118], ang: -0.04, segs: [0.064, 0.04, 0.028], w: 0.011 },
    { base: [-0.014, 0.112], ang: 0.12, segs: [0.06, 0.038, 0.027], w: 0.0105 },
    { base: [-0.035, 0.1], ang: 0.3, segs: [0.047, 0.03, 0.024], w: 0.0095 },
  ];
  const parts: React.ReactNode[] = [];
  const fleshParts: React.ReactNode[] = [];
  const fleshPts: [number, number][] = [];
  F.forEach((fi, i) => {
    const c = Math.max(0, Math.min(1, curl[i] ?? 0));
    const a0 = -fi.ang * (0.6 + spread); // fan outward: fingers right of the axis lean right
    const meta0: [number, number] = i === 0 ? [0.018, 0.03] : [fi.base[0] * 0.55, 0.035];
    let p: [number, number] = [fi.base[0], fi.base[1]];
    if (i === 0) p = [meta0[0] + 0.03, meta0[1] + 0.025];
    parts.push(boneAt(meta0, p, fi.w * 1.05, `m${i}`));
    let ang = a0;
    fi.segs.forEach((s, k) => {
      ang += (i === 0 ? -1 : 1) * 0 + (k === 0 ? 0 : 0);
      const ls = s * (1 - 0.55 * c);
      const q: [number, number] = [p[0] + Math.sin(ang) * ls, p[1] + Math.cos(ang) * ls];
      parts.push(boneAt(p, q, fi.w * (1 - k * 0.12), `f${i}${k}`));
      fleshParts.push(boneAt(p, [q[0] + Math.sin(ang) * 0.008, q[1] + Math.cos(ang) * 0.008], fi.w * 1.9, `s${i}${k}`, mat.fl));
      if (ring && i === 3 && k === 0) {
        const mid: [number, number] = [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
        parts.push(
          <mesh key="ring" geometry={cap.g} material={mat.r} position={[mid[0], mid[1], 0.004]} rotation={[0, 0, ang + Math.PI / 2 - Math.PI / 2 + Math.PI / 2]} scale={[0.017, 0.02, 0.002]} />,
        );
      }
      p = [q[0] + Math.sin(ang) * 0.004, q[1] + Math.cos(ang) * 0.004];
    });
    fleshPts.push(p);
  });
  // palm and wrist flesh
  fleshParts.push(<mesh key="palm" geometry={cap.c} material={mat.fl} position={[0, 0.055, 0.001]} scale={[0.115, 0.13, 1]} />);
  fleshParts.push(boneAt([0, -0.085], [0, 0.0], 0.08, "wrist", mat.fl));
  // carpals and forearm
  const carp: [number, number][] = [[-0.022, 0.01], [-0.005, 0.014], [0.012, 0.012], [0.026, 0.006], [-0.016, -0.006], [0.0, -0.004], [0.016, -0.008]];
  carp.forEach((c, i) => parts.push(<mesh key={`c${i}`} geometry={cap.c} material={mat.b} position={[c[0], c[1], 0.002]} scale={[0.018, 0.016, 1]} />));
  if (snapped) {
    parts.push(boneAt([-0.014, -0.02], [-0.02, -0.07], 0.018, "u1"));
    parts.push(boneAt([-0.024, -0.085], [-0.03, -0.14], 0.018, "u2"));
    parts.push(boneAt([0.014, -0.02], [0.016, -0.075], 0.02, "r1"));
    parts.push(boneAt([0.026, -0.08], [0.022, -0.14], 0.02, "r2"));
  } else {
    parts.push(boneAt([-0.016, -0.02], [-0.019, -0.075], 0.018, "u"));
    parts.push(boneAt([0.014, -0.02], [0.017, -0.075], 0.021, "r"));
  }
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {fleshParts}
      {parts}
    </group>
  );
};

const Flesh: React.FC<{ shape: THREE.Shape; material: THREE.Material }> = ({ shape, material }) => {
  const g = React.useMemo(() => new THREE.ShapeGeometry(shape, 6), [shape]);
  React.useEffect(() => () => g.dispose(), [g]);
  return <mesh geometry={g} material={material} position={[0, 0, 0.001]} />;
};

// The barium platinocyanide screen: a sheet of paper on a small walnut frame on a stand, its face toward +z. `glow`
// 0..1 makes it fluoresce phosphor green (brighter than white, so it blooms); children sit on the face (the hand
// shadow) in face coordinates (x, y about the paper centre, z = 0 the face). `size` is the paper.
export const BariumScreen: React.FC<{ position: Vec3; rotationY?: number; glow?: number; frame?: number; size?: [number, number]; height?: number; label?: boolean; children?: React.ReactNode }> = ({
  position,
  rotationY = 0,
  glow = 1,
  frame = 0,
  size = [0.5, 0.4],
  height = 1.0,
  label = false,
  children,
}) => {
  const [w, h] = size;
  const flick = glow * (0.94 + 0.06 * Math.sin(frame * 1.7) * Math.sin(frame * 0.53));
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <InkBox size={[0.3, 0.03, 0.22]} position={[0, 0.015, 0]} color={WALNUT} ink={0.005} />
      <InkCylinder radius={0.014} height={height - h / 2} position={[0, (height - h / 2) / 2, -0.02]} color={WALNUT_DARK} ink={0.004} />
      <group position={[0, height, 0]}>
        <InkBox size={[w + 0.06, h + 0.06, 0.025]} position={[0, 0, -0.016]} color={WALNUT} ink={0.007} />
        <mesh position={[0, 0, 0.0]}>
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial color={flick > 0.02 ? glowColor("#62f23a", 0.3 + 0.82 * flick) : "#e8e4c8"} toneMapped={false} />
        </mesh>
        <group position={[0, 0, 0.003]}>{children}</group>
        {flick > 0.02 && <Halo position={[0, 0, -0.03]} size={Math.max(w, h) * 2.4} color="#5aff3a" strength={0.3 * flick} />}
      </group>
      {label && <Label text={"BARIUM\nSCREEN"} position={[-w * 0.18, height + h / 2 + 0.12, 0.0]} width={0.26} />}
    </group>
  );
};

// A fat book (cover, page block, a spine title) in its own frame: spine along y, cover facing +z.
export const BigBook: React.FC<{ position: Vec3; rotation?: Vec3; label?: string }> = ({ position, rotation = [0, 0, 0], label }) => (
  <group position={position} rotation={rotation}>
    <InkBox size={[0.24, 0.32, 0.14]} color="#7a2222" ink={0.006} />
    <InkBox size={[0.22, 0.3, 0.13]} position={[0.012, 0, 0]} color="#f0e8d0" ink={0} />
    <InkBox size={[0.008, 0.32, 0.14]} position={[0.121, 0, 0]} color="#7a2222" ink={0} />
    {label && <Label text={label} position={[0, 0.02, 0.072]} width={0.2} bg="#f4ecd0" />}
  </group>
);

// A rough wooden board, long axis x.
export const Plank: React.FC<{ position: Vec3; rotation?: Vec3; size?: Vec3 }> = ({ position, rotation = [0, 0, 0], size = [0.5, 0.28, 0.035] }) => {
  const tex = useOwned(() => {
    const t = canvasTexture(256, 128, (ctx) => {
      ctx.fillStyle = "#b8864e";
      ctx.fillRect(0, 0, 256, 128);
      ctx.strokeStyle = "rgba(90,50,20,0.55)";
      ctx.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        const y = 8 + i * 14;
        ctx.moveTo(0, y);
        ctx.bezierCurveTo(80, y + 6 * Math.sin(i), 170, y - 6, 256, y + 3);
        ctx.stroke();
      }
      ctx.fillStyle = "rgba(70,40,15,0.7)";
      ctx.beginPath();
      ctx.ellipse(170, 60, 10, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    });
    return { t, dispose: () => t.dispose() };
  }, []);
  return <InkBox size={size} position={position} rotation={rotation} color="#ffffff" map={tex.t} ink={0.006} />;
};

// A glass photographic plate in its dark wooden holder (face +z). `image` 0..1 develops the X-ray picture on it: the
// negative, light bones and a bright ring on a dark plate. `wet` adds drips (in the darkroom).
export const PhotoPlate: React.FC<{ position: Vec3; rotation?: Vec3; image?: number; ring?: boolean; size?: [number, number]; snapped?: boolean; holder?: boolean }> = ({
  position,
  rotation = [0, 0, 0],
  image = 0,
  ring = true,
  size = [0.3, 0.38],
  snapped = false,
  holder = true,
}) => {
  const [w, h] = size;
  return (
    <group position={position} rotation={rotation}>
      {holder && <InkBox size={[w + 0.04, h + 0.04, 0.02]} position={[0, 0, -0.012]} color="#2a1a12" ink={0.006} />}
      <mesh>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={new THREE.Color("#c8c4b0").lerp(new THREE.Color("#2a2a2e"), image)} toneMapped={false} />
      </mesh>
      {image > 0.02 && (
        <SkeletonHand position={[0, -h * 0.12, 0.002]} scale={(h / 0.3) * 0.95} spread={0.55} ring={ring} bone={`#${new THREE.Color("#2a2a2e").lerp(new THREE.Color("#a8a8a2"), image).getHexString()}`} flesh="#8a8a90" fleshOpacity={0.45 * image} ringColor="#ffffff" break={snapped} />
      )}
    </group>
  );
};

// A shallow developing tray with liquid; `slosh` tips the liquid.
export const Tray: React.FC<{ position: Vec3; slosh?: number; color?: string }> = ({ position, slosh = 0, color = "#3a3a3e" }) => (
  <group position={position}>
    <InkBox size={[0.42, 0.06, 0.32]} position={[0, 0.03, 0]} color={color} ink={0.005} />
    <InkBox size={[0.38, 0.01, 0.28]} position={[0, 0.05 + 0.012 * slosh, 0]} rotation={[0, 0, 0.12 * slosh]} color="#6a2a2a" ink={0} />
  </group>
);

// The darkroom safelight: a box lantern with ruby glass.
export const Safelight: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => {
  const k = 1 + 0.04 * Math.sin(f * 0.5);
  return (
    <group position={position}>
      <InkBox size={[0.22, 0.28, 0.16]} color="#1e1414" ink={0.006} />
      <mesh position={[0, -0.01, 0.082]}>
        <planeGeometry args={[0.15, 0.18]} />
        <meshBasicMaterial color={glowColor("#ff3a2a", 1.6 * k)} toneMapped={false} />
      </mesh>
      <Halo position={[0, 0, 0.1]} size={1.2} color="#ff3020" strength={0.45 * k} />
      <pointLight position={[0, 0, 0.3]} intensity={3.5 * k} distance={5} color="#ff4030" />
    </group>
  );
};

// A row of brown chemical bottles on a shelf board.
export const BottleShelf: React.FC<{ position: Vec3; width?: number }> = ({ position, width = 0.9 }) => (
  <group position={position}>
    <InkBox size={[width, 0.03, 0.2]} color={WALNUT} ink={0.005} />
    {Array.from({ length: 6 }, (_, i) => (
      <group key={i} position={[-width / 2 + 0.08 + i * ((width - 0.16) / 5), 0.015, 0]}>
        <InkCylinder radius={0.04} height={0.14 + 0.04 * rnd(i, 3)} position={[0, 0.08, 0]} color={i % 3 ? "#5a3216" : "#2a4a3a"} ink={0.004} />
        <InkCylinder radius={0.018} height={0.03} position={[0, 0.17 + 0.04 * rnd(i, 3), 0]} color="#1a1a1a" ink={0.002} />
      </group>
    ))}
  </group>
);

// ---------- the truth room ----------

// A giant cutaway tube for the pivot (axis x, wide end +x, centred on `position`): the glass bulb with its front half
// cut away, the cathode at the neck, electrons (blue balls) flying from the cathode into the glass at `phase`, and
// X-ray dashes leaving the glass toward +x.
export const GiantTube: React.FC<{ position: Vec3; f: number; electrons?: number; rays?: number; scale?: number }> = ({ position, f, electrons = 1, rays = 0, scale = 1 }) => {
  const geo = useOwned(() => {
    const pts: THREE.Vector2[] = [];
    for (let i = 0; i <= 24; i++) {
      const t = i / 24;
      pts.push(new THREE.Vector2(0.06 + 0.3 * Math.pow(t, 1.2), -0.7 + t * 1.2));
    }
    for (let i = 1; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(0.36 * Math.cos(a), 0.5 + 0.22 * Math.sin(a)));
    }
    const g = new THREE.LatheGeometry(pts, 32);
    g.rotateZ(-Math.PI / 2);
    return { g, dispose: () => g.dispose() };
  }, []);
  return (
    <group position={position} scale={scale}>
      {/* the far wall of the bulb (dark glass inside), then the ink outline, then the clear front glass */}
      <mesh geometry={geo.g} renderOrder={1}>
        <meshBasicMaterial color="#14284a" side={THREE.BackSide} />
      </mesh>
      <mesh geometry={geo.g} scale={[1.03, 1.03, 1.03]} renderOrder={0}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh geometry={geo.g} renderOrder={3}>
        <meshToonMaterial color="#cfeaf4" gradientMap={toonRamp} transparent opacity={0.22} depthWrite={false} />
      </mesh>
      {/* a glossy highlight along the top of the glass */}
      <mesh position={[-0.05, 0.22, 0.2]} rotation={[0, 0, 0.24]} renderOrder={4}>
        <boxGeometry args={[0.7, 0.025, 0.01]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.75} depthWrite={false} />
      </mesh>
      <mesh position={[0.48, 0.28, 0.3]} renderOrder={4}>
        <circleGeometry args={[0.035, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.8} depthWrite={false} />
      </mesh>
      {/* cathode disc and wire */}
      <InkCylinder radius={0.05} height={0.02} position={[-0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c8c4b8" ink={0.005} />
      <InkCylinder radius={0.008} height={0.3} position={[-0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#c87a3a" ink={0.003} />
      {/* the far wall where the electrons hit: a glowing patch */}
      <mesh position={[0.66, 0, -0.02]} rotation={[0, -Math.PI / 2, 0]}>
        <circleGeometry args={[0.2, 24]} />
        <meshBasicMaterial color={glowColor("#9cff6a", 0.6 + 0.8 * electrons)} transparent opacity={0.7} toneMapped={false} depthWrite={false} />
      </mesh>
      {/* electrons */}
      {electrons > 0.02 &&
        Array.from({ length: 9 }, (_, i) => {
          const t = ((f * 0.045 + i / 9) % 1 + 1) % 1;
          const x = -0.6 + t * 1.24;
          const y = (rnd(i, 1) - 0.5) * 0.06 * (0.3 + t * 3);
          const z = (rnd(i, 2) - 0.5) * 0.06 * (0.3 + t * 3) + 0.02;
          return <Ball key={i} position={[x, y, z]} radius={0.028} color="#5ab4ff" glow={1.6} basic ink={0.006} />;
        })}
      {/* X-ray dashes leaving the glowing end */}
      {rays > 0.02 &&
        Array.from({ length: 10 }, (_, i) => {
          const t = ((f * 0.03 + i / 10) % 1 + 1) % 1;
          const a = (rnd(i, 4) - 0.5) * 0.5;
          const r = 0.75 + t * 1.6;
          return (
            <mesh key={i} position={[r * Math.cos(a), r * Math.sin(a) * 0.6, 0.05]} rotation={[0, 0, a * 0.6]}>
              <boxGeometry args={[0.12, 0.016, 0.016]} />
              <meshBasicMaterial color={glowColor("#f4ffb0", 1.4)} transparent opacity={rays * (1 - t * 0.5)} toneMapped={false} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- later locations ----------

// A newspaper held open: masthead, a headline, the picture of a hand X-ray. Face +z, about 0.42 x 0.56 m.
export const RaysPaper: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => {
  const tex = useOwned(() => {
    const t = canvasTexture(420, 560, (ctx) => {
      ctx.fillStyle = "#ece6d4";
      ctx.fillRect(0, 0, 420, 560);
      ctx.fillStyle = "#1a1a1a";
      ctx.font = "900 46px Georgia, serif";
      ctx.textAlign = "center";
      ctx.fillText("THE NEW RAYS", 210, 62);
      ctx.fillRect(20, 78, 380, 4);
      ctx.fillStyle = "#2a2a2e";
      ctx.fillRect(110, 100, 200, 250);
      ctx.fillStyle = "rgba(26,26,26,0.55)";
      for (let i = 0; i < 12; i++) ctx.fillRect(30 + (i % 2) * 200, 375 + Math.floor(i / 2) * 28, 160, 9);
    });
    return { t, dispose: () => t.dispose() };
  }, []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        <planeGeometry args={[0.42, 0.56]} />
        <meshToonMaterial map={tex.t} gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <SkeletonHand position={[0, 0.0, 0.003]} scale={0.85} spread={0.55} ring bone="#e8e8e0" flesh="#8a8a90" fleshOpacity={0.4} ringColor="#ffffff" />
    </group>
  );
};

// The Nobel medal: a gold disc on a ribbon.
export const Medal: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.07} height={0.012} rotation={[Math.PI / 2, 0, 0]} color="#e8b830" ink={0.004} />
    <InkCylinder radius={0.05} height={0.014} rotation={[Math.PI / 2, 0, 0]} color="#f4d060" ink={0} />
  </group>
);

// An open medal case: a dark red box with its lid tipped back and the medal lying on the velvet.
export const MedalCase: React.FC<{ position: Vec3; medal?: boolean }> = ({ position, medal = true }) => (
  <group position={position}>
    <InkBox size={[0.24, 0.05, 0.2]} position={[0, 0.025, 0]} color="#6a1a22" ink={0.005} />
    <InkBox size={[0.21, 0.005, 0.17]} position={[0, 0.051, 0]} color="#1e3a6a" ink={0} />
    <InkBox size={[0.24, 0.2, 0.03]} position={[0, 0.13, -0.11]} rotation={[-0.25, 0, 0]} color="#6a1a22" ink={0.005} />
    {medal && <Medal position={[0, 0.062, 0.01]} rotation={[-Math.PI / 2, 0, 0]} scale={1.1} />}
  </group>
);

// A modern X-ray light box on the wall: a white glowing panel with the film (white bones on black).
export const LightBox: React.FC<{ position: Vec3; on?: number; f?: number; green?: number }> = ({ position, on = 1, green = 0 }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.62, 0.06]} position={[0, 0, -0.03]} color="#d8dce0" ink={0.006} />
    <mesh position={[0, 0, 0.002]}>
      <planeGeometry args={[0.62, 0.54]} />
      <meshBasicMaterial color={new THREE.Color("#eaf6ff").lerp(new THREE.Color("#62f23a"), green).multiplyScalar(0.4 + 0.75 * on)} toneMapped={false} />
    </mesh>
    <mesh position={[0, 0, 0.005]}>
      <planeGeometry args={[0.4, 0.5]} />
      <meshBasicMaterial color="#14181c" toneMapped={false} />
    </mesh>
    <SkeletonHand position={[0, -0.1, 0.008]} scale={1.45} spread={0.6} bone="#f4f8ff" flesh="#5a6670" fleshOpacity={0.5} />
    <Halo position={[0, 0, 0.03]} size={1.3} color={green > 0.5 ? "#5aff3a" : "#bfe4ff"} strength={0.3 * on} />
  </group>
);

// ---------- costume overlays: Röntgen's long beard and white collar, Anna Bertha's pinned-up bun ----------
// The puppet kit's beard is short and it has no bun, so these ride on the card like what-if-waterloo/hats.tsx does
// for bicornes: the same live pose Stage draws, the card's yaw and lean-back tilt, the head transform.

const K = 1.3 / 1060;
const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};
// A point on the drawn head (puppet units, front view, y down) moved with the head, and the head's roll.
const headPoint = (pose: PuppetPose, pt: [number, number]): { p: [number, number]; roll: number; view: "front" | "side" | "back"; facing: 1 | -1 } => {
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
    return { p: facing === 1 ? p : [-p[0], p[1]], roll: facing === 1 ? tip + tiltH : -(tip + tiltH), view, facing };
  }
  const slump = pose.slump ?? 0;
  const k = 1 - 0.55 * bend;
  const headDrop = slump * 34 + 520 * (1 - k);
  const lean = pose.lean ?? 0;
  let p = rot(pt, tiltH, [0, -640]);
  p = [p[0], p[1] + headDrop];
  p = rot(p, lean, [0, -280]);
  p = [p[0], p[1] + bob + crouch * 150 - air];
  return { p, roll: lean + tiltH, view, facing: 1 };
};

export type Overlay = { beard?: string; collar?: boolean; bun?: string; seatLift?: number };

const BeardShape: React.FC<{ color: string; side?: boolean }> = ({ color, side }) => {
  const geo = useOwned(() => {
    const s = new THREE.Shape();
    // a long full beard below the kit's short one: wide at the jaw, tapering to a rounded point on the chest
    const w = side ? 0.06 : 0.115;
    s.moveTo(-w, 0.02);
    s.bezierCurveTo(-w * 1.05, -0.06, -w * 0.7, -0.13, -w * 0.15, -0.17);
    s.quadraticCurveTo(0, -0.185, w * 0.15, -0.17);
    s.bezierCurveTo(w * 0.7, -0.13, w * 1.05, -0.06, w, 0.02);
    s.quadraticCurveTo(0, -0.02, -w, 0.02);
    const g = new THREE.ShapeGeometry(s, 16);
    return { g, dispose: () => g.dispose() };
  }, [side]);
  return (
    <group>
      <mesh geometry={geo.g} position={[0, 0, 0.002]}>
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={geo.g} scale={[1.06, 1.05, 1]}>
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* a few strands */}
      {[-0.05, 0, 0.05].map((x) => (
        <mesh key={x} position={[x * (side ? 0.5 : 1), -0.1, 0.004]}>
          <planeGeometry args={[0.006, 0.12]} />
          <meshBasicMaterial color="#5a5048" />
        </mesh>
      ))}
    </group>
  );
};

export const CostumeOverlays: React.FC<{ cast: PuppetPlacement[]; looks: Record<string, Overlay>; energy?: number }> = ({ cast, looks, energy = 1 }) => {
  const f = useShotFrame();
  const speech = useSpeech();
  const camera = useThree((s) => s.camera);
  return (
    <group userData={{ ghost: true, audit: false }}>
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
          if ((pose.lie ?? 0) > 0 || pose.view === "back") return null;
          const tilt = cardTilt([camera.position.x, camera.position.y, camera.position.z], live.at);
          const side = pose.view === "side";
          const chin = headPoint(pose, [0, -628]);
          const bunAt = headPoint(pose, [side ? -60 : 0, -1030]);
                    const neck = headPoint(pose, [0, -585]);
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  {o.collar && !side && (
                    <group position={[neck.p[0] * K, -neck.p[1] * K, 0.035]} rotation={[0, 0, (-neck.roll * Math.PI) / 180]}>
                      {[-1, 1].map((sx) => (
                        <mesh key={sx} position={[sx * 0.075, 0, 0]} rotation={[0, 0, sx * 0.5]}>
                          <planeGeometry args={[0.06, 0.04]} />
                          <meshToonMaterial color="#f8f6ee" gradientMap={toonRamp} />
                        </mesh>
                      ))}
                    </group>
                  )}
                  {o.beard && (
                    <group position={[chin.p[0] * K + (side ? 0.03 * chin.facing : 0), -chin.p[1] * K, 0.05]} rotation={[0, 0, (-chin.roll * Math.PI) / 180]}>
                      <BeardShape color={o.beard} side={side} />
                    </group>
                  )}
                  {o.bun && (
                    <group position={[bunAt.p[0] * K, -bunAt.p[1] * K, -0.02]}>
                      <Ball position={[0, 0, 0]} radius={0.08} color={o.bun} ink={0.009} />
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
