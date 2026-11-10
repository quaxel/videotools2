import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { cancelRender, continueRender, delayRender, staticFile } from "remotion";
import { toonRamp } from "./toon";
import { paintTexture } from "./surfaces";
import { modelHeadParts, useModelAudit } from "../engine/audit";

// Props too complex for the kit primitives (a car, a bicycle, an animal) are modelled in Blender by a script in
// videos/<slug>/blender/, exported to public/videos/<slug>/models/<name>.glb and shown with <BlenderModel>.
// On load every material becomes the kit's toon material (base colour and texture kept) and every mesh gets the
// same ink outline as InkBox, so the model sits in the show's look.

const INK = "#161212";
type Vec3 = [number, number, number];

const cache = new Map<string, Promise<GLTF>>();
const loadGltf = (url: string) => {
  if (!cache.has(url)) cache.set(url, new GLTFLoader().loadAsync(url));
  return cache.get(url)!;
};

// Inverted hull pushed out along the normals by `ink` metres (constant thickness whatever the mesh size).
const inkMaterial = (ink: number) => {
  const m = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    shader.uniforms.ink = { value: ink };
    shader.vertexShader = `uniform float ink;\n${shader.vertexShader}`.replace(
      "#include <begin_vertex>",
      "vec3 transformed = vec3( position ) + normalize( normal ) * ink;",
    );
  };
  return m;
};

const toonOf = (src: THREE.Material): THREE.MeshToonMaterial => {
  const s = src as THREE.MeshStandardMaterial;
  return new THREE.MeshToonMaterial({
    color: s.color ?? new THREE.Color("#ffffff"),
    map: s.map ?? paintTexture(),
    emissive: s.emissive ?? new THREE.Color("#000"),
    emissiveMap: s.emissiveMap ?? null,
    transparent: s.transparent,
    opacity: s.opacity,
    // Glass must not hide what is behind it (a puppet card inside a car is drawn after the glass in depth order).
    depthWrite: !s.transparent,
    side: s.side,
    gradientMap: toonRamp,
  });
};

const toonClone = (gltf: GLTF, ink: number, shadows: boolean) => {
  const root = gltf.scene.clone(true);
  const hullMat = ink > 0 ? inkMaterial(ink) : null;
  const meshes: THREE.Mesh[] = [];
  root.traverse((o) => {
    o.userData.rest = { position: o.position.clone(), quaternion: o.quaternion.clone(), scale: o.scale.clone() };
    if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
  });
  for (const mesh of meshes) {
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(toonOf) : toonOf(mesh.material);
    mesh.castShadow = shadows;
    mesh.receiveShadow = shadows;
    if (hullMat && !mesh.name.endsWith("_noink")) {
      const hull = new THREE.Mesh(mesh.geometry, hullMat);
      hull.name = `${mesh.name}_ink`;
      hull.userData.ink = true;
      mesh.add(hull);
    }
  }
  return root;
};

export type PartPose = { position?: Vec3; rotation?: Vec3; scale?: number | Vec3; visible?: boolean };

// `src`: path under public/, e.g. "videos/<slug>/models/car.glb".
// `parts`: per-frame pose for named Blender objects (spin "Wheel_FL", open "Door_L"), relative to the exported rest
// pose: position is added, rotation (Euler, in the part's own axes) turns it from rest, scale multiplies.
// Apply rotation and scale in Blender and put the origin on the pivot, so a part's own axes are the model's.
// `joints`: per-frame value for joints declared in a sand3d model (s3d.joint), by joint name: degrees for revolute and
// continuous, metres for prismatic, from rest. The GLB carries each joint as a node on its pivot with its axis.
// Don't pose the same node through `parts` and `joints`.
// `heads`: for the framing audit, the node names that make the model's head (default: nodes named head or skull,
// with the ears, eyes, muzzle... beside them; see engine/audit.ts modelHeadParts); `false` for a model with no head
// or one meant to be cropped.
export const BlenderModel: React.FC<{
  src: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: number | Vec3;
  ink?: number;
  shadows?: boolean;
  parts?: Record<string, PartPose>;
  joints?: Record<string, number>;
  heads?: string[] | false;
}> = ({ src, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, ink = 0.015, shadows = true, parts, joints, heads }) => {
  const [gltf, setGltf] = useState<GLTF | null>(null);
  const [handle] = useState(() => delayRender(`Loading model ${src}`));
  useEffect(() => {
    loadGltf(staticFile(src))
      .then(setGltf)
      .catch((e) => cancelRender(new Error(`Could not load model ${src}: ${e}`)));
  }, [src]);

  const root = useMemo(() => (gltf ? toonClone(gltf, ink, shadows) : null), [gltf, ink, shadows]);
  // Release the frame only once the model is in the tree.
  // Remotion's canvas only draws on a frame change: draw once more with the model in, then release the frame.
  const advance = useThree((s) => s.advance);
  const released = useRef(false);
  useEffect(() => {
    if (root && !released.current) {
      released.current = true;
      advance(performance.now());
      continueRender(handle);
    }
  }, [root, handle, advance]);

  if (root && parts) {
    for (const [name, pose] of Object.entries(parts)) {
      const node = root.getObjectByName(name);
      if (!node) throw new Error(`Model ${src} has no part "${name}" (names lose dots and spaces on load)`);
      const rest = node.userData.rest as { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
      node.position.copy(rest.position);
      if (pose.position) node.position.add(new THREE.Vector3(...pose.position));
      node.quaternion.copy(rest.quaternion);
      if (pose.rotation) node.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...pose.rotation)));
      node.scale.copy(rest.scale);
      if (pose.scale !== undefined) node.scale.multiply(typeof pose.scale === "number" ? new THREE.Vector3().setScalar(pose.scale) : new THREE.Vector3(...pose.scale));
      node.visible = pose.visible ?? true;
    }
  }

  if (root && joints) {
    for (const [name, value] of Object.entries(joints)) {
      const node = root.getObjectByName(name);
      const j = node?.userData.s3d_joint as { type: string; axis: Vec3 } | undefined;
      if (!node || !j) throw new Error(`Model ${src} has no sand3d joint "${name}"`);
      const rest = node.userData.rest as { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 };
      const axis = new THREE.Vector3(...j.axis).normalize();
      node.position.copy(rest.position);
      node.quaternion.copy(rest.quaternion);
      if (j.type === "prismatic") node.position.add(axis.applyQuaternion(rest.quaternion).multiplyScalar(value));
      else node.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(axis, THREE.MathUtils.degToRad(value)));
    }
  }

  const holder = useRef<THREE.Group>(null);
  const headParts = useMemo(() => (root && heads !== false ? modelHeadParts(root, heads) : []), [root, heads === false ? "" : (heads ?? []).join(",")]);
  useModelAudit(holder, () => headParts, src.split("/").pop()!.replace(/\.glb$/, ""));

  return (
    <group ref={holder} position={position} rotation={rotation} scale={scale} userData={{ model: src }}>
      {root && <primitive object={root} />}
    </group>
  );
};
