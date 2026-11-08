import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, toonRamp, Vec3 } from "../../engine";

// Felix's kit as 3D props, so they take the set's light like the gate does: the oval auxiliary shield (deep red, a
// leather-toned rim, a metal boss and a plain cream geometric motif: a made-up unit mark) and the spear.

const shieldFace = () =>
  canvasTexture(512, 720, (ctx) => {
    ctx.fillStyle = "#813F38";
    ctx.fillRect(0, 0, 512, 720);
    // weathering
    for (let i = 0; i < 60; i++) {
      ctx.fillStyle = `rgba(${i % 2 ? "60,24,20" : "170,90,80"},0.08)`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * 512, Math.random() * 720, 20 + Math.random() * 60, 10 + Math.random() * 30, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = "#e9dcb8";
    ctx.lineCap = "round";
    // the made-up unit mark: a ring round the boss, two bars and four chevrons, readable from far off
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.ellipse(256, 360, 110, 110, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(256, 70);
    ctx.lineTo(256, 230);
    ctx.moveTo(256, 490);
    ctx.lineTo(256, 650);
    ctx.stroke();
    ctx.lineWidth = 18;
    for (const [y, d] of [[200, 1], [520, -1]] as const) {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(256 + s * 70, y);
        ctx.lineTo(256 + s * 170, y - d * 90);
        ctx.stroke();
      }
    }
  });

export const Shield: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => {
  const face = useMemo(shieldFace, []);
  React.useEffect(() => () => face.dispose(), [face]);
  const H = 0.74;
  const W = 0.5;
  // a shallow curved oval: a plane bowed toward the front, cut to an oval by the alpha mask
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(W, H, 24, 32);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = (p.getX(i) / (W / 2)) ** 2;
      const v = (p.getY(i) / (H / 2)) ** 2;
      p.setZ(i, 0.07 * (1 - Math.min(1, u * 0.75 + v * 0.25)));
    }
    g.computeVertexNormals();
    return g;
  }, []);
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} castShadow>
        <meshToonMaterial map={face} gradientMap={toonRamp} side={THREE.DoubleSide} alphaTest={0.5} alphaMap={ovalMask()} />
      </mesh>
      {/* rim */}
      <mesh scale={[W * 0.5, H * 0.5, 1]} position={[0, 0, 0.004]}>
        <torusGeometry args={[0.99, 0.03, 8, 64]} />
        <meshToonMaterial color="#674A36" gradientMap={toonRamp} />
      </mesh>
      {/* boss */}
      <mesh position={[0, 0, 0.068]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.6, 1]} castShadow>
        <sphereGeometry args={[0.075, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshToonMaterial color="#9aa5a8" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 0, 0.071]}>
        <ringGeometry args={[0.075, 0.105, 32]} />
        <meshToonMaterial color="#8A9698" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

let OVAL: THREE.Texture | null = null;
const ovalMask = () => {
  if (OVAL) return OVAL;
  OVAL = canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.ellipse(128, 128, 126, 126, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  return OVAL;
};

export const Spear: React.FC<{ base: Vec3; tip: Vec3 }> = ({ base, tip }) => {
  const a = new THREE.Vector3(...base);
  const b = new THREE.Vector3(...tip);
  const len = a.distanceTo(b);
  const mid = a.clone().add(b).multiplyScalar(0.5);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group position={mid.toArray() as Vec3} rotation={[e.x, e.y, e.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.014, 0.016, len, 8]} />
        <meshToonMaterial color="#8a6a48" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, len / 2 + 0.07, 0]} castShadow>
        <coneGeometry args={[0.03, 0.16, 4]} />
        <meshToonMaterial color="#9aa5a8" gradientMap={toonRamp} />
      </mesh>
    </group>
  );
};

// A bearded axe blade: a socket round the haft, the blade sweeping out and down (its edge at +x).
const AXE_HEAD = (() => {
  const sh = new THREE.Shape();
  sh.moveTo(-0.03, 0.04);
  sh.lineTo(0.06, 0.035);
  sh.quadraticCurveTo(0.12, 0.06, 0.17, 0.075);
  sh.quadraticCurveTo(0.19, -0.02, 0.165, -0.12);
  sh.quadraticCurveTo(0.11, -0.08, 0.06, -0.03);
  sh.lineTo(-0.03, -0.035);
  sh.closePath();
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.022, bevelEnabled: true, bevelSize: 0.006, bevelThickness: 0.006, bevelSegments: 2 });
  g.translate(0, 0, -0.011);
  return g;
})();

// Bjorn's work axe (not his war gear): an ash haft and an iron head, gripped at `hand`, the head at `head`.
export const Axe: React.FC<{ hand: Vec3; head: Vec3 }> = ({ hand, head }) => {
  const a = new THREE.Vector3(...hand);
  const b = new THREE.Vector3(...head);
  const dir = b.clone().sub(a).normalize();
  const len = a.distanceTo(b) + 0.08;
  const mid = a.clone().add(dir.clone().multiplyScalar(len / 2 - 0.08));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const e = new THREE.Euler().setFromQuaternion(q);
  return (
    <group position={mid.toArray() as Vec3} rotation={[e.x, e.y, e.z]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.018, 0.022, len, 8]} />
        <meshToonMaterial color="#b08a5a" gradientMap={toonRamp} />
      </mesh>
      <group position={[0, len / 2 - 0.06, 0]}>
        <mesh geometry={AXE_HEAD} castShadow>
          <meshToonMaterial color="#8d969a" gradientMap={toonRamp} />
        </mesh>
        <mesh geometry={AXE_HEAD} scale={[1.12, 1.12, 1.6]}>
          <meshBasicMaterial color="#1d1712" side={THREE.BackSide} />
        </mesh>
      </group>
    </group>
  );
};
