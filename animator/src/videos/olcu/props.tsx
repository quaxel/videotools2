import React, { useMemo } from "react";
import * as THREE from "three";
import { BlenderModel, CameraShot, Counter, Halo, InkBox, InkCylinder, Room, Shelf, toonRamp, Window } from "../../engine";
import type { PuppetLight } from "../../engine";

type Vec3 = [number, number, number];

// ---------- the saloon ----------

// Room x ±3.5, back wall z = -3. The upright piano stands against the left wall, its keys toward +x; the pianist
// sits at `PIANO_SEAT` in profile facing it. The bar runs along the right; the back window looks onto the street.
export const PIANO: Vec3 = [-3.05, 0, -1.0];
export const PIANO_SEAT: [number, number] = [-2.05, -1.0];
export const BAR_X = 2.3;
export const WINDOW: Vec3 = [0.6, 1.45, -2.95];
const LAMPS: Vec3[] = [
  [-1.6, 2.35, -0.6],
  [1.2, 2.35, -1.2],
];

export const saloonLight = (): PuppetLight => ({
  tint: "#ffc890",
  tintAmount: 0.1,
  shadow: 0.25,
  points: LAMPS.map((p) => ({ position: p, color: "#ffc070", strength: 1.6, range: 3.2 })),
  distant: [{ direction: [0.1, 0.25, -1], color: "#ff9a50", strength: 0.8 }], // the sunset through the window
});

const HangingLamp: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.008} height={0.6} position={[0, 0.45, 0]} color="#2a2420" ink={0} />
    <InkCylinder radius={0.13} height={0.05} position={[0, 0.14, 0]} color="#4a3a2a" ink={0.008} />
    <mesh position={[0, 0.02, 0]}>
      <sphereGeometry args={[0.09, 16, 12]} />
      <meshBasicMaterial color={new THREE.Color(2.4, 1.7, 0.9)} toneMapped={false} />
    </mesh>
    <Halo position={[0, 0.02, 0.05]} size={1.1} color="#ffb860" strength={0.45} />
    <pointLight color="#ffb060" intensity={3.2} distance={6} decay={1.4} />
  </group>
);

export const SaloonSet: React.FC<{ camera: CameraShot; lid?: number; children?: React.ReactNode }> = ({ camera, lid = 0, children }) => (
  <Room camera={camera} mood="warm" floor="#7a5236" wall="#7a2a22" width={7} depth={6} sideWalls wallPattern="wallpaper" floorPattern="wood">
    {/* wainscot along the walls */}
    <InkBox size={[7, 0.9, 0.06]} position={[0, 0.45, -2.96]} color="#5a3420" ink={0.01} />
    <InkBox size={[0.06, 0.9, 6]} position={[-3.46, 0.45, 0]} color="#5a3420" ink={0.01} />
    <Window position={WINDOW} size={[1.5, 1.1]} sky="#ffa060" />
    <Halo position={[WINDOW[0], WINDOW[1], WINDOW[2] + 0.2]} size={2.4} color="#ff9a50" strength={0.35} />
    {/* the bar, bottles behind it */}
    <Counter position={[BAR_X, 0, -1.1]} size={[0.7, 0.95, 3.0]} color="#5a3020" top="#3a1e12" />
    <Shelf position={[BAR_X + 0.6, 1.1, -2.85]} width={1.6} rows={3} color="#4a2a18" seed={4} />
    {Array.from({ length: 6 }, (_, i) => (
      <InkCylinder key={i} radius={0.035} height={0.22} position={[BAR_X - 0.15 + (i % 3) * 0.12, 0.95 + 0.11, -2.0 + i * 0.35]} color={["#2a6a3a", "#7a3a1a", "#d8c890"][i % 3]} ink={0.006} />
    ))}
    {/* the piano against the left wall, its stool, a spittoon */}
    <BlenderModel src="videos/olcu/models/piano.glb" position={PIANO} rotation={[0, Math.PI / 2, 0]} joints={{ lid }} />
    <InkCylinder radius={0.17} height={0.3} position={[PIANO_SEAT[0], 0.15, PIANO_SEAT[1]]} color="#3a2416" ink={0.01} />
    <InkCylinder radius={0.1} height={0.14} position={[-2.6, 0.07, 0.3]} color="#b8902a" ink={0.008} />
    {/* tables and chairs out front */}
    {[
      [0.2, 0.6],
      [-0.6, 1.8],
    ].map(([x, z], i) => (
      <group key={i}>
        <InkCylinder radius={0.42} height={0.05} position={[x, 0.55, z]} color="#6a4228" ink={0.01} />
        <InkCylinder radius={0.05} height={0.55} position={[x, 0.27, z]} color="#3a2416" ink={0.008} />
      </group>
    ))}
    {LAMPS.map((p, i) => (
      <HangingLamp key={i} position={p} />
    ))}
    {children}
  </Room>
);

// ---------- props on the street ----------

// A housefly: a black body with two blurred wings beating, `at` its position.
export const Fly: React.FC<{ at: Vec3; frame: number; landed?: boolean }> = ({ at, frame, landed }) => {
  const beat = landed ? 0.15 : Math.sin(frame * 3.1) * 0.9;
  return (
    <group position={at} userData={{ ghost: true }}>
      <mesh scale={[1.3, 0.9, 0.9]}>
        <sphereGeometry args={[0.011, 10, 8]} />
        <meshBasicMaterial color="#101010" />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.009, 0.008, 0]} rotation={[0, 0, s * (0.5 + beat)]}>
          <planeGeometry args={[0.02, 0.012]} />
          <meshBasicMaterial color="#d8e0e8" transparent opacity={0.55} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
};

// A cloth measuring tape stretched from a to b (yellow, inch marks), with its leather case at a.
export const Tape: React.FC<{ a: Vec3; b: Vec3; sag?: number }> = ({ a, b, sag = 0.04 }) => {
  const marks = useMemo(() => {
    const t = new THREE.CanvasTexture(
      (() => {
        const c = document.createElement("canvas");
        c.width = 512;
        c.height = 16;
        const ctx = c.getContext("2d")!;
        ctx.fillStyle = "#f2d24a";
        ctx.fillRect(0, 0, 512, 16);
        ctx.fillStyle = "#2a2010";
        for (let i = 0; i < 64; i++) ctx.fillRect(i * 8, 0, 1.5, i % 4 === 0 ? 10 : 5);
        return c;
      })(),
    );
    t.wrapS = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  const A = new THREE.Vector3(...a);
  const B = new THREE.Vector3(...b);
  const len = A.distanceTo(B);
  marks.repeat.set(Math.max(1, len / 0.5), 1);
  const segs = 8;
  const pts = Array.from({ length: segs + 1 }, (_, i) => {
    const t = i / segs;
    return A.clone().lerp(B, t).add(new THREE.Vector3(0, -Math.sin(Math.PI * t) * sag * len, 0));
  });
  return (
    <group userData={{ ghost: true }}>
      {pts.slice(0, -1).map((p, i) => {
        const q = pts[i + 1];
        const mid = p.clone().add(q).multiplyScalar(0.5);
        const d = q.clone().sub(p);
        const yaw = Math.atan2(-d.z, d.x);
        const pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
        return (
          <mesh key={i} position={mid.toArray()} rotation={[0, yaw, pitch, "YZX"]}>
            <boxGeometry args={[d.length() + 0.002, 0.018, 0.003]} />
            <meshBasicMaterial map={marks} toneMapped={false} />
          </mesh>
        );
      })}
      <InkCylinder radius={0.04} height={0.025} position={a} rotation={[Math.PI / 2, 0, 0]} color="#5a3420" ink={0.006} />
    </group>
  );
};

// The undertaker's flat cart with two coffins standing on it, rolled along the boardwalk (wheels from the distance).
export const CoffinCart: React.FC<{ position: Vec3; rolled: number }> = ({ position, rolled }) => (
  <group position={position}>
    <InkBox size={[0.7, 0.06, 1.5]} position={[0, 0.16, 0]} color="#5a4030" ink={0.01} />
    {[-1, 1].flatMap((sx) =>
      [-1, 1].map((sz) => (
        <group key={`${sx}${sz}`} position={[sx * 0.36, 0.1, sz * 0.55]} rotation={[rolled / 0.1, 0, 0]}>
          <InkCylinder radius={0.1} height={0.04} rotation={[0, 0, Math.PI / 2]} color="#2a2420" ink={0.006} />
          <InkBox size={[0.045, 0.16, 0.02]} color="#6a5a4a" ink={0} />
        </group>
      )),
    )}
    <InkBox size={[0.05, 0.7, 0.05]} position={[0, 0.5, 0.75]} color="#5a4030" ink={0.008} />
    <BlenderModel src="videos/olcu/models/coffin_pine.glb" position={[0, 0.19, -0.35]} rotation={[0, Math.PI / 2 - 0.25, 0]} />
    <BlenderModel src="videos/olcu/models/coffin_fancy.glb" position={[0, 0.19, 0.38]} rotation={[0, Math.PI / 2 - 0.25, 0]} />
  </group>
);

// A hand lantern (ghost) with its warm point light.
export const Lantern: React.FC<{ position: Vec3; frame: number; on?: number }> = ({ position, frame, on = 1 }) => (
  <group position={position} userData={{ ghost: true }}>
    <InkBox size={[0.12, 0.18, 0.12]} color="#2a2018" ink={0.006} />
    <InkCylinder radius={0.006} height={0.12} position={[0, 0.15, 0]} color="#2a2018" ink={0} />
    <mesh>
      <sphereGeometry args={[0.055, 12, 10]} />
      <meshBasicMaterial color={new THREE.Color(1 + 2 * on, 0.8 + 1.4 * on, 0.4 + 0.5 * on)} toneMapped={false} />
    </mesh>
    <pointLight color="#ffb05a" intensity={on * 3.4 * (0.92 + 0.08 * Math.sin(frame * 0.45))} distance={6} decay={1.4} />
  </group>
);

export { toonRamp };
