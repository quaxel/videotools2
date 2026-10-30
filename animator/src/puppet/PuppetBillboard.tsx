import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useThree } from "@react-three/fiber";
import { cancelRender, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { usePuppetAudit } from "../engine/audit";
import { Puppet, PuppetLook, PuppetPose } from "./Puppet";

// The SVG puppet rasterised onto a camera-facing plane inside the 3D set, so it can stand
// behind objects, sit on stools and cast a contact shadow.

export const PUPPET_HEIGHT = 1.3; // metres from feet to the top of the head (cartoon-short next to 2.1 m cabinets)
const K = PUPPET_HEIGHT / 1060; // metres per puppet unit
export const HIP_HEIGHT = 280 * K; // stools are built to this height
export const HEAD_Y = 800 * K; // centre of the head above the feet
const VB = { x: -440, y: -1120, w: 880, h: 1160 }; // covers raised arms and caps
// Texture density in pixels per puppet unit. It follows the puppet's size on screen (a close-up needs ~2,
// a wide shot ~0.3), snapped to a few steps so the canvas is not reallocated every frame. Rasterising the
// SVG and uploading it is the main render cost, so this is what keeps crowded shots fast.
// The canvas pixel ratio (Stage supersamples) is part of the need, so close-ups reach the top steps.
const DENSITY_STEPS = [0.25, 0.35, 0.5, 0.7, 1.0, 1.4, 2.0, 2.8];

// Puppets rasterising for the same canvas share one counter; only the last one to finish re-draws the scene,
// instead of every puppet triggering a full three.js render of its own.
const pendingByCanvas = new WeakMap<object, { n: number }>();

export type PuppetPlacement = {
  id: string;
  look: PuppetLook;
  pose: PuppetPose;
  at: [number, number]; // feet position on the floor: x, z
  tint?: string; // multiplies the cut-out's colours, so it takes on the set's light (Stage sets it from the mood)
};

// Puppets face the front of the set (+z). When the camera has swung round to the side the cut-out turns to
// profile, and from behind it shows its back, unless the pose names a view or a facing itself, or sits.
const SIDE_FROM = 1.05; // radians off the front (about 60 degrees)
const BACK_FROM = 2.2; // about 125 degrees
export const turnToCamera = (pose: PuppetPose, yaw: number): PuppetPose => {
  if (pose.view || pose.facing || pose.sit) return pose;
  const off = Math.abs(yaw);
  if (off >= BACK_FROM) return { ...pose, view: "back" };
  // Camera on the +x side sees the puppet's front (+z) pointing screen-left.
  if (off >= SIDE_FROM) return { ...pose, view: "side", facing: yaw > 0 ? -1 : 1 };
  return pose;
};

export const PuppetBillboard: React.FC<PuppetPlacement> = ({ id, look, pose: authored, at, tint = "#ffffff" }) => {
  const [x, z] = at;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // Turn to face the camera around the vertical axis only, like a cardboard cut-out.
  const yaw = Math.atan2(camera.position.x - x, camera.position.z - z);
  const pose = turnToCamera(authored, yaw);
  const root = useRef<THREE.Group>(null);
  usePuppetAudit(root, () => root.current?.parent?.localToWorld(new THREE.Vector3(x, HEAD_Y, z)) ?? new THREE.Vector3(x, HEAD_Y, z), 205 * K, id, !!pose.sit);
  const advance = useThree((s) => s.advance);
  const gl = useThree((s) => s.gl);
  const screenH = useThree((s) => s.size.height);

  // Pixels per metre at the puppet's head, from the camera already placed by the CameraRig rendered before us.
  const dist = Math.max(0.3, Math.hypot(camera.position.x - x, camera.position.y - HEAD_Y, camera.position.z - z));
  const pxPerMetre = (screenH * gl.getPixelRatio()) / (2 * dist * Math.tan((camera.fov * Math.PI) / 360));
  const need = pxPerMetre * K * 1.15;
  const density = DENSITY_STEPS.find((d) => d >= need) ?? DENSITY_STEPS[DENSITY_STEPS.length - 1];

  const markup = useMemo(
    () =>
      renderToStaticMarkup(
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`${VB.x} ${VB.y} ${VB.w} ${VB.h}`}
          width={Math.round(VB.w * density)}
          height={Math.round(VB.h * density)}
        >
          <Puppet id={id} look={look} pose={pose} />
        </svg>,
      ),
    [id, look, pose, density],
  );

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = Math.round(VB.w * density);
    c.height = Math.round(VB.h * density);
    return c;
  }, [density]);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    // The canvas already matches the on-screen size, so skip per-upload mipmap generation.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  // Shadow caster that keeps the puppet's silhouette instead of its whole rectangle.
  const depthMaterial = useMemo(
    () => new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: texture, alphaTest: 0.5 }),
    [texture],
  );

  // Rasterising an SVG is async: hold the frame until the new pose is on the texture.
  useLayoutEffect(() => {
    const handle = delayRender(`Rasterising puppet ${id}`);
    const pending = pendingByCanvas.get(gl) ?? { n: 0 };
    pendingByCanvas.set(gl, pending);
    pending.n++;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      texture.needsUpdate = true;
      if (--pending.n === 0) advance(performance.now());
      continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`Could not rasterise puppet ${id}`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  }, [markup, canvas, texture, advance, gl, id]);

  return (
    <group ref={root} position={[x, 0, z]} userData={{ puppet: true }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[1, 0.42, 1]}>
        <circleGeometry args={[0.28, 40]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <mesh position={[(VB.x + VB.w / 2) * K, -(VB.y + VB.h / 2) * K, 0]} castShadow customDepthMaterial={depthMaterial}>
          <planeGeometry args={[VB.w * K, VB.h * K]} />
          <meshBasicMaterial map={texture} color={tint} transparent alphaTest={0.02} toneMapped={false} fog={false} />
        </mesh>
      </group>
    </group>
  );
};
