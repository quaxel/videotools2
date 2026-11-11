import React from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { cardTilt, livenPose, PuppetPlacement, PuppetPose, toonRamp, useShotFrame, useSpeech } from "../../engine";
import { turnToCamera } from "../../puppet/PuppetBillboard";
import { useOwned } from "../../three/BalloonSets";

// 1816-17 costume pieces the puppet kit lacks, riding on each card like what-if-waterloo/hats.tsx does for bicornes
// (the same live pose Stage draws, the card's yaw and lean-back tilt, the head's own transform): a tall black top
// hat (3D, turns with the card), a white cravat with high collar points, a straw poke bonnet with a ribbon, and a
// shawl over the shoulders. No bowlers (post-1850), no caps.

const K = 1.3 / 1060;
const INK = "#161212";

const rot = (p: [number, number], deg: number, c: [number, number]): [number, number] => {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - c[0];
  const dy = p[1] - c[1];
  return [c[0] + dx * Math.cos(a) - dy * Math.sin(a), c[1] + dx * Math.sin(a) + dy * Math.cos(a)];
};

// A point on the drawn figure (puppet units, front view, y down) moved with the head, and the head's roll.
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

export type Costume = { topHat?: string; cravat?: boolean; bonnet?: string; ribbon?: string; shawl?: string; hatOff?: number; tails?: string };

// The top hat in its own frame: crown up y, base on y = 0 round the head; a little taller than wide, slightly
// flared toward the top, a darker silk band, a brim curled up at the sides.
export const TopHatMesh: React.FC<{ color?: string; band?: string; scale?: number; puppet?: string }> = ({ color = "#17151a", band = "#2c2630", scale = 1, puppet }) => {
  const geo = useOwned(() => {
    const crown = new THREE.LatheGeometry([new THREE.Vector2(0, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0.172, 0.12), new THREE.Vector2(0.182, 0.3), new THREE.Vector2(0.17, 0.315), new THREE.Vector2(0, 0.318)], 32);
    const brimS = new THREE.Shape();
    brimS.absellipse(0, 0, 0.29, 0.25, 0, Math.PI * 2, false, 0);
    const brim = new THREE.ExtrudeGeometry(brimS, { depth: 0.018, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.012, bevelSegments: 2, curveSegments: 40 });
    brim.rotateX(-Math.PI / 2);
    // curl the sides up
    const pos = brim.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      pos.setY(i, pos.getY(i) + 0.9 * Math.pow(Math.abs(x) / 0.3, 3) * 0.06);
    }
    brim.computeVertexNormals();
    const bandG = new THREE.CylinderGeometry(0.175, 0.173, 0.05, 32, 1, true);
    return { crown, brim, bandG, dispose: () => (crown.dispose(), brim.dispose(), bandG.dispose()) };
  }, []);
  const mats = useOwned(() => {
    const felt = new THREE.MeshToonMaterial({ color, gradientMap: toonRamp });
    const ink = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
    const b = new THREE.MeshToonMaterial({ color: band, gradientMap: toonRamp });
    const sheen = new THREE.MeshBasicMaterial({ color: "#5a5462", transparent: true, opacity: 0.5 });
    return { felt, ink, b, sheen, dispose: () => [felt, ink, b, sheen].forEach((m) => m.dispose()) };
  }, [color, band]);
  return (
    <group scale={scale} userData={puppet ? { hatOf: puppet } : undefined}>
      <mesh geometry={geo.crown} material={mats.felt} position={[0, 0.02, 0]} />
      <mesh geometry={geo.crown} material={mats.ink} position={[0, 0.012, 0]} scale={[1.06, 1.04, 1.06]} />
      <mesh geometry={geo.bandG} material={mats.b} position={[0, 0.06, 0]} scale={[1.01, 1, 1.01]} />
      {/* a silk highlight down the crown */}
      <mesh position={[-0.07, 0.19, 0.16]} rotation={[0, -0.4, 0]} material={mats.sheen}>
        <planeGeometry args={[0.025, 0.2]} />
      </mesh>
      <mesh geometry={geo.brim} material={mats.felt} position={[0, 0.0, 0]} />
      <mesh geometry={geo.brim} material={mats.ink} position={[0, -0.006, 0]} scale={[1.04, 1.6, 1.05]} />
    </group>
  );
};

const Flat: React.FC<{ shape: THREE.Shape; color: string; ink?: number; z?: number; dep?: unknown[] }> = ({ shape, color, ink = 1.06, z = 0, dep = [] }) => {
  const g = useOwned(() => {
    const geo = new THREE.ShapeGeometry(shape, 18);
    return { geo, dispose: () => geo.dispose() };
  }, dep);
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={g.geo} position={[0, 0, 0.002]}>
        {/* flat colour: a lit white toon cloth went over 1.0 next to a lamp and bloomed */}
        <meshBasicMaterial color={color} />
      </mesh>
      {ink > 0 && (
        <mesh geometry={g.geo} scale={[ink, ink, 1]}>
          <meshBasicMaterial color={INK} />
        </mesh>
      )}
    </group>
  );
};

const ellipse = (rx: number, ry: number, cx = 0, cy = 0) => {
  const s = new THREE.Shape();
  s.absellipse(cx, cy, rx, ry, 0, Math.PI * 2, false, 0);
  return s;
};

// A white cravat: a soft bunched knot at the throat with two collar points standing up to the jaw.
const Cravat: React.FC<{ side: boolean }> = ({ side }) => {
  const knot = React.useMemo(() => ellipse(side ? 0.045 : 0.07, 0.042), [side]);
  const pointShape = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.03, 0);
    s.lineTo(0.03, 0);
    s.lineTo(0.012, 0.07);
    s.closePath();
    return s;
  }, []);
  return (
    <group>
      {!side &&
        [-1, 1].map((sx) => (
          <group key={sx} position={[sx * 0.06, 0.005, -0.004]} rotation={[0, 0, -sx * 0.25]} scale={[sx, 1, 1]}>
            <Flat shape={pointShape} color="#e4e0d4" dep={[sx]} />
          </group>
        ))}
      {side && (
        <group position={[0.025, 0.01, -0.004]} rotation={[0, 0, 0.15]}>
          <Flat shape={pointShape} color="#e4e0d4" dep={["s"]} />
        </group>
      )}
      <Flat shape={knot} color="#e8e4d8" z={0.004} dep={[side]} />
      <group position={[0, -0.05, 0.003]}>
        <Flat shape={React.useMemo(() => ellipse(side ? 0.025 : 0.035, 0.03), [side])} color="#dcd8cc" dep={[side, "t"]} />
      </group>
    </group>
  );
};

// A straw poke bonnet seen from the front: the brim framing the face (behind the head) and its rim arching over the
// hair (in front), a ribbon tied under the chin. In profile: the brim reaching forward over the face.
const Bonnet: React.FC<{ color: string; ribbon: string; side: boolean; facing: 1 | -1 }> = ({ color, ribbon, side }) => {
  const back = React.useMemo(() => ellipse(side ? 0.26 : 0.33, 0.32, 0, 0), [side]);
  const rim = useOwned(() => {
    const g = new THREE.TorusGeometry(side ? 0.0 : 0.3, 0.04, 8, 40, Math.PI);
    return { g, dispose: () => g.dispose() };
  }, [side]);
  const sideBrim = React.useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.2, 0.18);
    s.quadraticCurveTo(0.05, 0.36, 0.3, 0.18);
    s.quadraticCurveTo(0.34, 0.0, 0.24, -0.16);
    s.lineTo(0.18, -0.12);
    s.quadraticCurveTo(0.24, 0.05, 0.2, 0.14);
    s.quadraticCurveTo(0.0, 0.22, -0.18, 0.1);
    s.closePath();
    return s;
  }, []);
  return (
    <group>
      {!side && (
        <>
          <group position={[0, 0.02, -0.03]}>
            <Flat shape={back} color={color} dep={[side, color]} />
          </group>
          <mesh geometry={rim.g} position={[0, 0.03, 0.04]} scale={[1, 1.05, 0.4]}>
            <meshToonMaterial color={color} gradientMap={toonRamp} />
          </mesh>
          <mesh geometry={rim.g} position={[0, 0.03, 0.035]} scale={[1.03, 1.09, 0.4]}>
            <meshBasicMaterial color={INK} side={THREE.BackSide} />
          </mesh>
          {/* ribbon band and the bow under the chin */}
          <mesh position={[0, 0.2, 0.06]} scale={[1, 0.35, 0.3]}>
            <torusGeometry args={[0.2, 0.025, 6, 24, Math.PI]} />
            <meshToonMaterial color={ribbon} gradientMap={toonRamp} />
          </mesh>
        </>
      )}
      {side && (
        <group position={[0, 0.02, 0.03]}>
          <Flat shape={sideBrim} color={color} dep={["side", color]} />
        </group>
      )}
    </group>
  );
};

const Bow: React.FC<{ color: string }> = ({ color }) => (
  <group>
    {[-1, 1].map((sx) => (
      <group key={sx} position={[sx * 0.03, 0, 0]} rotation={[0, 0, sx * 0.4]}>
        <Flat shape={React.useMemo(() => ellipse(0.032, 0.02), [])} color={color} dep={[sx, color]} />
      </group>
    ))}
    <group position={[0, 0, 0.004]}>
      <Flat shape={React.useMemo(() => ellipse(0.014, 0.014), [])} color={color} dep={["k", color]} />
    </group>
  </group>
);

const Shawl: React.FC<{ color: string; side: boolean }> = ({ color, side }) => {
  const s = React.useMemo(() => {
    const sh = new THREE.Shape();
    const w = side ? 0.12 : 0.21;
    sh.moveTo(-w, 0.02);
    sh.quadraticCurveTo(0, 0.07, w, 0.02);
    sh.quadraticCurveTo(w * 0.8, -0.1, 0, -0.17);
    sh.quadraticCurveTo(-w * 0.8, -0.1, -w, 0.02);
    return sh;
  }, [side]);
  return <Flat shape={s} color={color} dep={[side, color]} />;
};

// The body's own transform on the card (SVG units, y down): side view translate(back, bob + drop - air) and a tip about
// the hip; front view the lean about the hip and the bob. Returned as a three.js group transform in metres.
const bodyFrame = (pose: PuppetPose): { x: number; y: number; roll: number; facing: 1 | -1; side: boolean } => {
  const side = pose.view === "side";
  const air = pose.air ?? 0;
  const bob = pose.bob ?? 0;
  const crouch = Math.max(0, Math.min(1, pose.crouch ?? 0));
  const bend = Math.max(0, Math.min(1, pose.bend ?? 0));
  if (side) {
    const facing = pose.facing ?? 1;
    const seat = pose.sit ? 1 : Math.max(0, Math.min(1, pose.seat ?? 0));
    const drop = crouch * 130;
    const back = -(crouch * 120 + Math.sin(seat * Math.PI) * 70);
    const tip = bend * 70 + crouch * 32 + Math.sin(seat * Math.PI) * 18;
    return { x: back * facing, y: bob + drop - air, roll: tip * facing, facing, side };
  }
  return { x: 0, y: bob + crouch * 150 - air, roll: pose.lean ?? 0, facing: 1, side };
};

// Tailcoat tails: two cut-away tails hanging from the back of the waist to the backs of the knees.
const Tails: React.FC<{ color: string; side: boolean }> = ({ color, side }) => {
  const shape = React.useMemo(() => {
    const s = new THREE.Shape();
    // puppet units, y up here (flipped from the SVG), origin at the hip pivot (0, -280 in SVG)
    if (side) {
      s.moveTo(-40, 70);
      s.lineTo(-95, 60);
      s.quadraticCurveTo(-130, -40, -118, -150);
      s.lineTo(-78, -160);
      s.quadraticCurveTo(-70, -40, -30, 40);
      s.closePath();
    } else {
      s.moveTo(-118, 60);
      s.lineTo(-40, 60);
      s.lineTo(-50, -150);
      s.lineTo(-110, -140);
      s.closePath();
      s.moveTo(40, 60);
      s.lineTo(118, 60);
      s.lineTo(110, -140);
      s.lineTo(50, -150);
      s.closePath();
    }
    return s;
  }, [side]);
  const g = useOwned(() => {
    const geo = new THREE.ShapeGeometry(shape, 12);
    geo.scale(K, K, 1);
    return { geo, dispose: () => geo.dispose() };
  }, [side]);
  return (
    <group>
      <mesh geometry={g.geo} position={[0, 0, 0.001]}>
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      <mesh geometry={g.geo} scale={[1.05, 1.04, 1]}>
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
};

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
          const hat = headPoint(pose, [0, -935]);
          const neck = headPoint(pose, [side ? 30 : 0, -590]);
          const head = headPoint(pose, [side ? -10 : 0, -830]);
          const chin = headPoint(pose, [side ? 40 : 0, -640]);
          const shoulder = headPoint(pose, [0, -540]);
          const hatTurn = side ? (pose.facing === -1 ? Math.PI : 0) : 0;
          const body = bodyFrame(pose);
          const off = o.hatOff ?? 0; // 0 on the head; > 0 lifted off (metres) for the hat-hop gag
          return (
            <group key={p.id} position={[x, 0, z]}>
              <group rotation={[0, yaw, 0]}>
                <group rotation={[-tilt, 0, 0]}>
                  {o.tails && !backV && (
                    // behind the card: only the parts that hang past the body and legs show
                    <group position={[body.x * K, (280 - body.y) * K, -0.012]} rotation={[0, 0, (-body.roll * Math.PI) / 180]} scale={[body.facing, 1, 1]}>
                      <Tails color={o.tails} side={body.side} />
                    </group>
                  )}
                  {o.topHat && (
                    <group position={[hat.p[0] * K, -hat.p[1] * K + off, 0.05]} rotation={[0, 0, (-hat.roll * Math.PI) / 180 + off * 1.2]}>
                      <group rotation={[0.12, hatTurn, 0]}>
                        <TopHatMesh color={o.topHat} puppet={p.id} />
                      </group>
                    </group>
                  )}
                  {o.cravat && !backV && (
                    <group position={[neck.p[0] * K, -neck.p[1] * K, 0.045]} rotation={[0, 0, (-neck.roll * Math.PI) / 180]} scale={[neck.facing, 1, 1]}>
                      <Cravat side={side} />
                    </group>
                  )}
                  {o.shawl && !backV && (
                    <group position={[shoulder.p[0] * K, -shoulder.p[1] * K, 0.04]} rotation={[0, 0, (-shoulder.roll * Math.PI) / 180]}>
                      <Shawl color={o.shawl} side={side} />
                    </group>
                  )}
                  {o.bonnet && (
                    <group position={[head.p[0] * K, -head.p[1] * K, 0.0]} rotation={[0, 0, (-head.roll * Math.PI) / 180]} scale={[head.facing, 1, 1]} userData={{ hatOf: p.id }}>
                      <Bonnet color={o.bonnet} ribbon={o.ribbon ?? "#8a2a3a"} side={side} facing={head.facing} />
                    </group>
                  )}
                  {o.bonnet && !side && !backV && (
                    <group position={[chin.p[0] * K, -chin.p[1] * K - 0.03, 0.06]}>
                      <Bow color={o.ribbon ?? "#8a2a3a"} />
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
