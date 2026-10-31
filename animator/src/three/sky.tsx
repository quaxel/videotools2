import React, { useMemo } from "react";
import * as THREE from "three";

// A sky dome that rides with the camera (put it in a group at the camera position): painted bands from the zenith to
// a pale horizon, with a glow round the sun. No clouds. Use a dome for any set with look-up shots: flat sky planes
// show their edges and read as a backdrop. `stops` are [height (-0.1..1), colour] from the horizon up; keep the sun
// on the key light's side, behind the usual camera direction, so look-up shots stay a deep colour.
export const SUN_DIR: [number, number, number] = [-6, 9, 5]; // high, behind-left: the farmyard's key light

export const CLEAR_SKY: [number, string][] = [
  [-0.1, "#e8f0f2"],
  [0.0, "#dbe9f3"],
  [0.08, "#b6d5f1"],
  [0.16, "#7fb3ea"],
  [0.32, "#4f8fdc"],
  [0.6, "#3274cc"],
  [1.0, "#245fb8"],
];

export const SkyDome: React.FC<{ sun: [number, number, number]; stops?: [number, string][]; glow?: string }> = ({ sun, stops = CLEAR_SKY, glow = "#fff6dc" }) => {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(300, 96, 48);
    const pos = g.attributes.position;
    const col = new Float32Array(pos.count * 3);
    const bands = stops.map(([h, c]) => [h, new THREE.Color(c)] as [number, THREE.Color]);
    const sunDir = new THREE.Vector3(...sun).normalize();
    const v = new THREE.Vector3();
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      // soft banding: ease the height into steps so the gradient reads as painted, not airbrushed
      const raw = v.y;
      const band = Math.round(raw * 14) / 14;
      const h = raw + (band - raw) * 0.55;
      let k = 0;
      while (k < bands.length - 2 && h > bands[k + 1][0]) k++;
      const [a, ca] = bands[k];
      const [b, cb] = bands[k + 1];
      c.copy(ca).lerp(cb, Math.min(1, Math.max(0, (h - a) / (b - a))));
      const toward = Math.max(0, v.dot(sunDir));
      c.lerp(new THREE.Color(glow), Math.pow(toward, 60) * 0.9 + Math.pow(toward, 12) * 0.08);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [sun, stops, glow]);
  return (
    <mesh geometry={geo} renderOrder={-10}>
      <meshBasicMaterial vertexColors side={THREE.BackSide} fog={false} toneMapped={false} depthWrite={false} />
    </mesh>
  );
};

