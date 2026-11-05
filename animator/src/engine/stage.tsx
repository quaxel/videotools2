import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import * as THREE from "three";
import { HEAD_Y, PuppetBillboard, PuppetLight, PuppetPlacement } from "../puppet/PuppetBillboard";
import { Vec3 } from "./anim";
import { useShotDuration, useShotFrame, useShotStart } from "./clock";
import { lightForBackground, puppetTint } from "../three/moods";
import { livenCamera, livenPose } from "./liven";
import { useFramingFor, useImpact, useLighting, usePost, useSpeech } from "./Video";
import { Post } from "./post/Post";
import { applyFramingDelta, framingDelta, keepHeadsInFrame } from "./framing";
import { getInputProps } from "remotion";
import { WebGPURenderer } from "three/webgpu";

// WebGPU trial (input prop `webgpu`): "on" draws the canvases with three's WebGPURenderer, "off" with WebGL. Either
// value turns the post chain and the lit puppet shader off (both are WebGL-only GLSL), so the two compare like for
// like. Unset: the normal look.
const GPU_TRIAL = (getInputProps() as { webgpu?: "on" | "off" }).webgpu;
// R3F 9 awaits an async gl factory, though its types only describe the sync one.
const gpuGl =
  GPU_TRIAL === "on"
    ? ((async (props: { canvas: HTMLCanvasElement }) => {
        const r = new WebGPURenderer({ canvas: props.canvas, antialias: false });
        await r.init();
        return r;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      }) as any)
    : undefined;

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

// Foreground framing (animated-short's FOREGROUND): the world point at screen position (x, y) (-1..1 from the
// centre, +y up) and `dist` metres in front of `cam`, for a Stage `foreground` object. Place it from the shot's
// first camera, not the current frame's, so the object stays put in the world and the camera moves past it
// (parallax); keep it at 0.3-0.5 x the focus distance, over 10-25 % of one frame edge, never over a face.
export const frameSpot = (cam: CameraShot, aspect: number, x: number, y: number, dist: number): Vec3 => {
  const p = new THREE.Vector3(...cam.position);
  const fwd = new THREE.Vector3(...cam.target).sub(p).normalize();
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3().crossVectors(right, fwd);
  const h = dist * Math.tan((cam.fov * Math.PI) / 360);
  const q = p.addScaledVector(fwd, dist).addScaledVector(right, x * h * aspect).addScaledVector(up, y * h);
  return [q.x, q.y, q.z];
};

// Fine paper grain over every frame (an SVG noise tile), so flat colour reads as painted rather than digital.
const GRAIN = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0.55 0'/></filter><rect width='256' height='256' filter='url(#n)'/></svg>",
)}")`;

// Colour grade over the picture: truth = cold blue "behind the curtain" tint, flash = white-out (both 0..1).
// `vignette` off when the post chain's grade draws its own.
export const Grade: React.FC<{ truth?: number; flash?: number; vignette?: boolean }> = ({ truth = 0, flash = 0, vignette = true }) => (
  <>
    <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundSize: "256px 256px", mixBlendMode: "overlay", opacity: 0.35 }} />
    {truth > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(30,70,180,${0.45 * truth})`, mixBlendMode: "multiply" }} />}
    {vignette && <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 42%, transparent 55%, rgba(10,0,4,0.55) 100%)" }} />}
    {flash > 0 && <AbsoluteFill style={{ backgroundColor: `rgba(255,250,235,${flash})` }} />}
  </>
);

// Where the lens focuses: the nearest puppet's head in front of the camera, else the point the camera looks at
// (metres along the view axis).
const focusDistance = (cam: CameraShot, puppets: PuppetPlacement[]) => {
  const [px, py, pz] = cam.position;
  const fx = cam.target[0] - px, fy = cam.target[1] - py, fz = cam.target[2] - pz;
  const len = Math.hypot(fx, fy, fz) || 1;
  const along = (x: number, y: number, z: number) => ((x - px) * fx + (y - py) * fy + (z - pz) * fz) / len;
  const heads = puppets.map((p) => along(p.at[0], HEAD_Y, p.at[1])).filter((d) => d > 0.3);
  return heads.length ? Math.min(...heads) : len;
};

// Blur-disc radius at infinity (px at 1080x1920) for a Stage's `blur` (the CSS blur radius it had before the post
// chain). x3 matches the old softness of a background a few metres behind the subject (checked on ghost-army).
const LENS_PER_BLUR = 3;

// The colour lift every Stage had before the post chain; the post grade replaces it.
const CSS_GRADE = "saturate(1.08) contrast(1.05)";

// A 3D set plus puppets placed on its floor. With `blur` the set and the cast render on two canvases from the
// same camera, so the background softens and faces stay sharp. With the post chain on (Video `post`) it is one
// canvas and `blur` becomes a real depth of field focused on the nearest puppet.
// `energy` (default 1) adds automatic camera push/drift and idle acting; 0 keeps the shot exactly as authored.
// `foreground`: framing objects between the lens and the subject (a branch, a railing, a crate corner; place them
// with `frameSpot`). They are drawn in front of the cast and left out of the collide check; with the post chain the
// depth of field blurs them, without it they get their own canvas over the cast, blurred 3 x `blur` (6 px at least).
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
  foreground?: React.ReactNode;
}> = ({ set, camera: authored, bg, puppets = [], blur, truth, flash, energy = 1, light, keepHeads = true, foreground }) => {
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
  const lit = GPU_TRIAL ? undefined : light ?? (useLighting() ? lightForBackground(bg) : undefined);
  const cast = puppets.map((p) => {
    // A speaking puppet's mouth follows its voice, over whatever the shot authored.
    const said = speech(p.id);
    const pose = said === null ? p.pose : { ...p.pose, mouthOpen: said.mouth, viseme: said.viseme };
    const live = livenPose(pose, p.at, p.id, f, energy, said);
    return <PuppetBillboard key={p.id} {...p} pose={live.pose} at={live.at} tint={tint} light={p.light ?? lit} />;
  });
  // Rendered after the set, this rig wins over the set's own and applies the livened camera.
  const rig = <CameraRig {...camera} />;
  const front = foreground ? <group userData={{ ghost: true }}>{foreground}</group> : null;
  const usedPost = usePost();
  const post = GPU_TRIAL ? null : usedPost;
  if (post) {
    const inkDebug = (getInputProps() as { inkDebug?: boolean }).inkDebug === true;
    return (
      <AbsoluteFill style={{ backgroundColor: bg, filter: post.grade ? undefined : CSS_GRADE }}>
        <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE} gl={gpuGl}>
          {set}
          {rig}
          {cast}
          {front}
          <Post parts={post} focus={focusDistance(camera, puppets)} cInf={(blur ?? 0) * LENS_PER_BLUR} inkDebug={inkDebug} />
        </ThreeCanvas>
        <Grade truth={truth} flash={flash} vignette={!post.grade} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ backgroundColor: bg, filter: CSS_GRADE }}>
      {blur ? (
        <>
          <AbsoluteFill style={{ filter: `blur(${blur}px)` }}>
            <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE} gl={gpuGl}>
              {set}
              {rig}
            </ThreeCanvas>
          </AbsoluteFill>
          <AbsoluteFill>
            <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE} gl={gpuGl}>
              <CameraRig {...camera} />
              {cast}
            </ThreeCanvas>
          </AbsoluteFill>
          {front && (
            // nearer than the subject, so softer than the background: on its own canvas over the cast, lit flat
            <AbsoluteFill style={{ filter: `blur(${Math.max(6, blur * 3)}px)` }}>
              <ThreeCanvas width={width} height={height} flat dpr={SUPERSAMPLE} gl={gpuGl}>
                <CameraRig {...camera} />
                <hemisphereLight args={["#ffffff", "#5a5a66", 1.6]} />
                {front}
              </ThreeCanvas>
            </AbsoluteFill>
          )}
        </>
      ) : (
        <ThreeCanvas width={width} height={height} flat shadows dpr={SUPERSAMPLE} gl={gpuGl}>
          {set}
          {rig}
          {cast}
          {front}
        </ThreeCanvas>
      )}
      <Grade truth={truth} flash={flash} />
    </AbsoluteFill>
  );
};
