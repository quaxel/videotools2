import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { PuppetBillboard, PuppetLight, PuppetPlacement } from "../puppet/PuppetBillboard";
import { Vec3 } from "./anim";
import { useShotDuration, useShotFrame, useShotStart } from "./clock";
import { lightForBackground, puppetTint } from "../three/moods";
import { livenCamera, livenPose } from "./liven";
import { useFramingFor, useImpact, useLighting, useSpeech } from "./Video";
import { applyFramingDelta, framingDelta, keepHeadsInFrame } from "./framing";
import { getInputProps } from "remotion";

export type CameraShot = { position: Vec3; target: Vec3; fov: number };

// Put inside a set to aim the camera. Every frame sets it from scratch, so shots stay deterministic.
export const CameraRig: React.FC<CameraShot> = ({ position, target, fov }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  camera.position.set(...position);
  camera.fov = fov;
  camera.lookAt(...target);
  camera.updateProjectionMatrix();
  return null;
};

// The 3D canvases draw at this multiple of the video size and the browser scales them down, which smooths ink
// edges, thin floor lines and texture text far better than the GPU's own antialiasing.
export const SUPERSAMPLE = 2;

// Camera shake for an impact of strength `hit` (0..1): a fast jitter of position and aim that grows with the
// square of the hit and with the camera's distance, plus a small punch-in. Smooth sines, so it is the same on
// every render.
const shake = (cam: CameraShot, hit: number, f: number): CameraShot => {
  if (hit <= 0) return cam;
  const d = Math.hypot(cam.position[0] - cam.target[0], cam.position[1] - cam.target[1], cam.position[2] - cam.target[2]);
  const a = hit * hit * 0.03 * d;
  const j = (k: number) => Math.sin(f * 2.9 + k) * 0.6 + Math.sin(f * 5.3 + k * 2.1) * 0.4;
  return {
    position: [cam.position[0] + j(0) * a, cam.position[1] + j(1.3) * a, cam.position[2]],
    target: [cam.target[0] + j(2.6) * a * 0.5, cam.target[1] + j(3.9) * a * 0.5, cam.target[2]],
    fov: cam.fov * (1 - 0.04 * hit),
  };
};

// Fine paper grain over every frame (an SVG noise tile), so flat colour reads as painted rather than digital.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0'/></filter><rect width='256' height='256' filter='url(#n)'/></svg>",
)}")`;

// Colour grade over the picture: truth = cold blue "behind the curtain" tint, flash = white-out (both 0..1).
export const Grade: React.FC<{ truth?: number; flash?: number }> = ({ truth = 0, flash = 0 }) => (
  <>
    <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: "256px 256px", mixBlendMode: "overlay", opacity: 0.35 }} />
    {truth > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(30,70,180,${0.45 * truth})`, mixBlendMode: "multiply" }} />}
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(10,0,4,0.55) 100%)" }} />
    {flash > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(255,250,235,${flash})` }} />}
  </>
);

// A 3D set plus puppets placed on its floor. With `blur` the set and the cast render on two canvases from the
// same camera, so the background softens and faces stay sharp.
// `energy` (default 1) adds automatic camera push/drift and idle acting; 0 keeps the shot exactly as authored.
// The set receives the livened camera through `set(camera)` when given a function; a plain node keeps its own
// <CameraRig>, which an extra rig placed after it overrides.
export const Stage: React.FC<{
  set: React.ReactNode;
  camera: CameraShot;
  bg: string;
  puppets?: PuppetPlacement[];
  blur?: number;
  truth?: number;
  flash?: number;
  energy?: number;
  light?: PuppetLight; // the set's lights as puppets see them (fire, lamps, sun); default: derived from the mood
  keepHeads?: boolean; // default true: pan (or widen) so no puppet's head is cut by the frame edge (engine/framing.ts)
}> = ({ set, camera: authored, bg, puppets = [], blur, truth, flash, energy = 1, light, keepHeads = true }) => {
  const { width, height } = useVideoConfig();
  const f = useShotFrame();
  const moved = shake(livenCamera(authored, f, useShotDuration(), energy), useImpact(), f);
  // Whole heads, without jumps: the pipeline's framing pass logs the raw correction every frame, smooths it over each
  // shot (it eases in before a head reaches the edge and holds) and the render applies the smoothed table. With no
  // table yet the raw correction is used directly.
  const start = useShotStart();
  const smoothed = useFramingFor(start, f);
  const pass = (getInputProps() as { framingPass?: boolean }).framingPass === true;
  let camera = moved;
  if (keepHeads) {
    if (smoothed && !pass) camera = applyFramingDelta(moved, smoothed);
    else {
      camera = keepHeadsInFrame(moved, width / height, puppets);
      if (pass) console.log(`[framefix] ${JSON.stringify({ s: start, f, d: framingDelta(moved, camera).map((v) => Math.round(v * 1e4) / 1e4) })}`);
    }
  }
  const speech = useSpeech();
  const tint = puppetTint(bg);
  // Lit videos light puppets from the Stage's own rig, or one derived from the mood its background belongs to.
  const lit = light ?? (useLighting() ? lightForBackground(bg) : undefined);
  const cast = puppets.map((p) => {
    // A speaking puppet's mouth follows its voice, over whatever the shot authored.
    const said = speech(p.id);
    const pose = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
    const live = livenPose(pose, p.at, p.id, f, energy, said);
    return <PuppetBillboard key={p.id} {...p} pose={live.pose} at={live.at} tint={tint} light={p.light ?? lit} />;
  });
  // Rendered after the set, this rig wins over the set's own and applies the livened camera.
  const rig = <CameraRig {...camera} />;
  return (
    <AbsoluteFill style={{ backgroundColor: bg, filter: "saturate(1.08) contrast(1.05)" }}>
      {blur ? (
        <>
          <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
            <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE}>
              {set}
              {rig}
            </ThreeCanvas>
          </AbsoluteFill>
          <AbsoluteFill>
            <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE}>
              <CameraRig {...camera} />
              {cast}
            </ThreeCanvas>
          </AbsoluteFill>
        </>
      ) : (
        <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE}>
          {set}
          {rig}
          {cast}
        </ThreeCanvas>
      )}
      <Grade truth={truth} flash={flash} />
    </AbsoluteFill>
  );
};
