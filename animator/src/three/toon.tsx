import React from "react";
import * as THREE from "three";
import { paintTexture } from "./surfaces";

// Three-step cel shading ramp shared by every toon material.
export const toonRamp = (() => {
  const t = new THREE.DataTexture(new Uint8Array([110, 185, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

const INK = "#161212";

type Vec3 = [number, number, number];

// Toon box with an inverted-hull ink outline of fixed thickness.
export const InkBox: React.FC<{
  size: Vec3;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  ink?: number;
  emissive?: string;
  map?: THREE.Texture; // surface pattern, multiplied by `color` (default: soft painted shading)
  shadows?: boolean; // cast and receive shadows (default true)
}> = ({ size, position = [0, 0, 0], rotation = [0, 0, 0], color, ink = 0.018, emissive, map, shadows = true }) => {
  const [w, h, d] = size;
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow={shadows} receiveShadow={shadows}>
        <boxGeometry args={size} />
        <meshToonMaterial color={color} gradientMap={toonRamp} emissive={emissive ?? "#000"} map={map ?? paintTexture()} />
      </mesh>
      {ink > 0 && (
        <mesh>
          <boxGeometry args={[w + ink * 2, h + ink * 2, d + ink * 2]} />
          <meshBasicMaterial color={INK} side={THREE.BackSide} />
        </mesh>
      )}
    </group>
  );
};

export const InkCylinder: React.FC<{
  radius: number;
  height: number;
  position?: Vec3;
  rotation?: Vec3;
  color: string;
  ink?: number;
  emissive?: string;
}> = ({ radius, height, position = [0, 0, 0], rotation = [0, 0, 0], color, ink = 0.015, emissive }) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow receiveShadow>
      <cylinderGeometry args={[radius, radius, height, 40]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} emissive={emissive ?? "#000"} map={paintTexture()} />
    </mesh>
    {ink > 0 && (
      <mesh>
        <cylinderGeometry args={[radius + ink, radius + ink, height + ink * 2, 40]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);
