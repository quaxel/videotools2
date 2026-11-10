import React, { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useThree } from "@react-three/fiber";
import { cancelRender, continueRender, delayRender } from "remotion";
import * as THREE from "three";
import { auditCardEdges, usePuppetAudit } from "../engine/audit";
import { Puppet, PuppetLook, PuppetPose } from "./Puppet";

// The SVG puppet rasterised onto a camera-facing plane inside the 3D set, so it can stand
// behind objects, sit on stools and cast a contact shadow.

export const PUPPET_HEIGHT = 1.3; // metres from feet to the top of the head (cartoon-short next to 2.1 m cabinets)
const K = PUPPET_HEIGHT / 1060; // metres per puppet unit
export const HIP_HEIGHT = 280 * K; // stools are built to this height
export const HEAD_Y = 800 * K; // centre of the head above the feet
const VB_STAND = { x: -540, y: -1120, w: 1080, h: 1160 }; // covers raised and outstretched arms, caps and hat brims
// A puppet lying down (or on its way down) stretches to the left of its feet, head first.
const VB_LIE = { x: -1180, y: -1120, w: 1620, h: 1160 };
// A crawling puppet tips its body forward, head reaching past the standing box on whichever side it faces.
const VB_CRAWL = { x: -1180, y: -1120, w: 2360, h: 1160 };
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
  light?: PuppetLight; // light the cut-out from the set's lights instead of the flat tint
  fixedYaw?: number; // do not turn to the camera: keep the card facing this direction (radians; 0 = +z, PI / 2 = +x), e.g. lying in a mirror
  crop?: boolean; // let the frame edge cut this puppet's head (Stage otherwise pans to keep every head whole)
  // Show the puppet only inside an ellipse in world space (a reflection in a mirror, a figure behind a porthole): pixels where
  // ((p - center) . u)^2 + ((p - center) . v)^2 > 1 are not drawn. u and v are the ellipse axes scaled by 1 / radius.
  // With `archBottom` (a negative number in v units) the shape is an arch instead: a rectangle from there up to the centre line
  // topped by the half ellipse above it (a standing mirror).
  mask?: { center: [number, number, number]; u: [number, number, number]; v: [number, number, number]; archBottom?: number };
};

// The set's light as the cut-out sees it. Only strong light sources change a puppet: point lights (a campfire,
// a bare bulb) and distant ones (car headlights, a low sun) brighten and colour the side facing them and draw a
// soft rim along the silhouette edges that face them; the far side keeps the puppet's own colours, dimmed by
// `shadow` (default 0.12 when there are lights). The room's ambient colour barely touches it: `tint` mixed in
// by `tintAmount` (default 0.06). At most two point and two distant lights.
export type PuppetLight = {
  tint?: string;
  tintAmount?: number;
  shadow?: number;
  points?: { position: [number, number, number]; color: string; strength: number; range: number }[];
  distant?: { direction: [number, number, number]; color: string; strength: number }[]; // direction toward the light
};

// How far in from the silhouette (puppet units) the rim light fades out: past the ink stroke into the fill.
const RIM = 40;
// Half-width (m) of the cylinder the flat card is shaded as, so a light beside it lights one side and leaves a terminator.
const BODY_HALF = 0.2;

const LIT_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vFwd;
void main() {
  vUv = uv;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vRight = normalize(mat3(modelMatrix) * vec3(1.0, 0.0, 0.0));
  vFwd = normalize(mat3(modelMatrix) * vec3(0.0, 0.0, 1.0));
  gl_Position = projectionMatrix * viewMatrix * w;
}`;

// Cel lighting for a flat card: the front band comes from how squarely a light faces the card, the rim from
// how close the silhouette ends toward the light (so only edges facing it catch a soft glow).
const LIT_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 tint;
uniform float tintAmount;
uniform float shadow;
uniform vec3 pPos[2];
uniform vec3 pCol[2];
uniform float pRange[2];
uniform vec3 dDir[2];
uniform vec3 dCol[2];
uniform vec2 rimUv;
uniform vec3 axis;
uniform float bodyHalf;
uniform float headY;
uniform float headR;
uniform float maskOn;
uniform vec3 maskC;
uniform vec3 maskU;
uniform vec3 maskV;
uniform float maskArch;
uniform float maskBMin;
varying vec2 vUv;
varying vec3 vWorld;
varying vec3 vRight;
varying vec3 vFwd;

void shade(vec3 L, vec3 col, inout vec3 diffuse, inout vec3 rim) {
  float d = dot(L, vFwd);
  // Shade the card as a sphere round the head and a cylinder round the body, so the terminator curves across
  // the face. Three cel bands with slightly soft steps, like the puppet's own shading.
  vec3 off = vWorld - axis - vec3(0.0, headY, 0.0);
  float hx = dot(off, vRight) / headR;
  float hy = off.y / headR;
  vec3 N;
  if (hx * hx + hy * hy < 1.0) {
    N = vRight * hx + vec3(0.0, hy, 0.0) + vFwd * sqrt(1.0 - hx * hx - hy * hy);
  } else {
    float nx = clamp(dot(vWorld - axis, vRight) / bodyHalf, -1.0, 1.0);
    N = vRight * nx + vFwd * sqrt(1.0 - nx * nx);
  }
  float n = dot(L, N);
  diffuse += col * (0.45 * smoothstep(-0.04, 0.04, n) + 0.55 * smoothstep(0.36, 0.44, n));
  vec2 s = vec2(dot(L, vRight), L.y);
  float side = length(s);
  if (side > 0.05) {
    // March toward the light: the nearer the silhouette ends, the brighter, fading smoothly inward.
    float edge = 0.0;
    for (int k = 1; k <= 8; k++) {
      float t = float(k) / 8.0;
      float outside = 1.0 - texture2D(map, vUv + (s / side) * rimUv * t).a;
      edge = max(edge, outside * pow(1.0 - t, 1.6));
    }
    // Lights beside or behind the card rim it hardest.
    rim += col * edge * smoothstep(0.05, 0.6, side) * (0.4 + 0.6 * max(0.0, -d));
  }
}

void main() {
  vec4 tex = texture2D(map, vUv);
  if (tex.a < 0.02) discard;
  if (maskOn > 0.5) {
    // Test where the view ray through this pixel meets the mask's plane, so the cut follows the glass outline on screen
    // even though the card stands a little in front of it.
    vec3 mn = normalize(cross(maskU, maskV));
    float mt = dot(maskC - cameraPosition, mn) / dot(vWorld - cameraPosition, mn);
    vec3 md = cameraPosition + (vWorld - cameraPosition) * mt - maskC;
    float ma = dot(md, maskU);
    float mb = dot(md, maskV);
    if (maskArch > 0.5) {
      if (mb <= 0.0) { if (abs(ma) > 1.0 || mb < maskBMin) discard; }
      else if (ma * ma + mb * mb > 1.0) discard;
    } else if (ma * ma + mb * mb > 1.0) discard;
  }
  vec3 diffuse = vec3(0.0);
  vec3 rim = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec3 toL = pPos[i] - vWorld;
    float dist = length(toL);
    float att = pRange[i] > 0.0 ? 1.0 / (1.0 + (dist / pRange[i]) * (dist / pRange[i])) : 0.0;
    shade(toL / max(dist, 0.001), pCol[i] * att, diffuse, rim);
    shade(normalize(dDir[i] + vec3(0.0, 0.0001, 0.0)), dCol[i], diffuse, rim);
  }
  // The puppet keeps its own colours; strong lights add on top of them, the side away from them dims slightly.
  vec3 base = tex.rgb * mix(vec3(1.0), tint, tintAmount);
  // Capped at white: the canvas clips there anyway, and in the post chain's half-float buffer anything brighter
  // passes the bloom threshold (1.0), which washed lit faces and eye whites out in a glow.
  vec3 lit = base * (1.0 - shadow + diffuse * 0.55) + rim * mix(tex.rgb, vec3(1.0), 0.6);
  gl_FragColor = vec4(min(lit, vec3(1.0)), tex.a);
  #include <colorspace_fragment>
}`;

const litUniforms = (light: PuppetLight) => {
  const pts = [...(light.points ?? []), null, null].slice(0, 2);
  const dirs = [...(light.distant ?? []), null, null].slice(0, 2);
  const c = (hex: string, k = 1) => new THREE.Color(hex).multiplyScalar(k);
  const lit = (light.points?.length ?? 0) + (light.distant?.length ?? 0) > 0;
  return {
    tint: c(light.tint ?? "#ffffff"),
    tintAmount: light.tintAmount ?? 0.06,
    shadow: light.shadow ?? (lit ? 0.12 : 0),
    pPos: pts.map((p) => new THREE.Vector3(...(p?.position ?? [0, 0, 0]))),
    pCol: pts.map((p) => (p ? c(p.color, p.strength) : new THREE.Color(0, 0, 0))),
    pRange: pts.map((p) => p?.range ?? 0),
    dDir: dirs.map((d) => new THREE.Vector3(...(d?.direction ?? [0, 1, 0])).normalize()),
    dCol: dirs.map((d) => (d ? c(d.color, d.strength) : new THREE.Color(0, 0, 0))),
  };
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

// Seen from high above, an upright card flattens to a sliver; past ~17° of elevation it leans its top away from
// the camera, pivoting on the feet, so it stays square to the line of sight and the figure keeps its full body.
// Radians the card leans back (applied as a rotation of -tilt about its own x axis).
// `lift` (metres, = pose.air * K): a puppet raised off the floor (a theatre box, a saddle, a stage) is measured from
// its own raised head and leans about its raised feet. Measured from the floor instead, a camera level with a puppet
// in a box 2 m up read as a steep high angle once it came within ~4 m, and the card swung back through the set
// behind it (the puppet vanished). Lifts under LIFT_PIVOT (a car seat, a saddle) keep the old floor pivot exactly,
// so slug overlays that rebuild the card with the two-argument call (what-if-waterloo's bicornes on riders) still fit.
export const LIFT_PIVOT = 1.0;
export const pivotLift = (lift: number) => (lift >= LIFT_PIVOT ? lift : 0);
export const cardTilt = (cam: [number, number, number], at: [number, number], lift = 0) => {
  const elevation = Math.atan2(cam[1] - HEAD_Y * 0.7 - pivotLift(lift), Math.hypot(cam[0] - at[0], cam[2] - at[1]));
  return Math.min(0.95, Math.max(0, elevation - 0.3) * 1.1);
};

// For held props (a paddle, a cup in a world-space prop): where a hand at `reach` lands in the scene.
// Where a puppet's hand is in the world: `reach` (puppet units, as in reachR) on the card standing at `at`,
// which turns to face the camera and, from high up, leans back (cardTilt).
// `air`: the pose's air (puppet units) for a puppet lifted LIFT_PIVOT or more, whose card leans about its raised feet;
// `reach` is relative to the lifted body as in the pose, so the hand comes out `air` higher. With air = 0 it is the
// old behaviour exactly (callers that added the air themselves keep doing so).
export const handWorld = (at: [number, number], reach: [number, number], camera: { position: [number, number, number] }, air = 0): [number, number, number] => {
  const dx = camera.position[0] - at[0];
  const dz = camera.position[2] - at[1];
  const l = Math.hypot(dx, dz) || 1;
  const fwd: [number, number] = [dx / l, dz / l];
  const right: [number, number] = [dz / l, -dx / l];
  const lift = pivotLift(air * K);
  const t = cardTilt(camera.position, at, lift);
  const h = (air - reach[1]) * K - lift; // the hand's height above the card's pivot (the body is drawn `air` up)
  const back = -h * Math.sin(t);
  return [at[0] + right[0] * reach[0] * K + fwd[0] * back, lift + h * Math.cos(t), at[1] + right[1] * reach[0] * K + fwd[1] * back];
};

// Where the head centre of a puppet standing at `at` (lifted by `air` puppet units) is in the world, on its card as
// PuppetBillboard draws it: turned to the camera and leaning back by cardTilt. For the framing audit and keepHeads.
export const headWorld = (at: [number, number], air: number, camera: [number, number, number]): [number, number, number] => {
  const dx = camera[0] - at[0];
  const dz = camera[2] - at[1];
  const l = Math.hypot(dx, dz) || 1;
  const lift = pivotLift(air * K);
  const t = cardTilt(camera, at, lift);
  const h = HEAD_Y + air * K - lift; // head above the card's pivot
  const back = -h * Math.sin(t);
  return [at[0] + (dx / l) * back, lift + h * Math.cos(t), at[1] + (dz / l) * back];
};

// The drawn hat's box on the card, in metres from the head centre (x across the card, y up): brims are wider than
// the head and crowns, shakos and plumes rise above it. null without a hat. From the hat shapes in Puppet.tsx.
const HAT_BOX: Record<NonNullable<PuppetLook["hatStyle"]>, [number, number]> = {
  wide: [300, 1110],
  bowler: [232, 1100],
  boater: [272, 1045],
  helmet: [232, 1085],
  stahl: [222, 1085],
  crown: [190, 1160],
  shako: [195, 1272],
  galea: [235, 1120],
};
export const hatBox = (look: PuppetLook, pose: PuppetPose): { x0: number; x1: number; y0: number; y1: number } | null => {
  if (!look.hat) return null;
  const [half, top] = HAT_BOX[look.hatStyle ?? "wide"];
  const side = pose.view === "side" ? (pose.facing ?? 1) * 26 : 0; // the side view draws the hat 26 units forward
  return { x0: (side - half) * K, x1: (side + half) * K, y0: (920 - 800) * K, y1: (top - 800) * K };
};

export const PuppetBillboard: React.FC<PuppetPlacement> = ({ id, look, pose: authored, at, tint = "#ffffff", light: lightIn, mask, fixedYaw }) => {
  const light = lightIn ?? (mask ? ({} as PuppetLight) : undefined);
  const [x, z] = at;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // Turn to face the camera around the vertical axis only, like a cardboard cut-out.
  const yaw = fixedYaw ?? Math.atan2(camera.position.x - x, camera.position.z - z);
  const pose = turnToCamera(authored, yaw);
  const lying = (pose.lie ?? 0) > 0;
  // The card leans about the raised feet of a lifted puppet (cardTilt), so the drawing stays where it was authored.
  const liftM = pivotLift((pose.air ?? 0) * K);
  const tilt = lying || fixedYaw !== undefined ? 0 : cardTilt([camera.position.x, camera.position.y, camera.position.z], at, liftM);
  // The card must grow with the puppet: a puppet lifted off the floor (`air`: a car seat, a jump), bobbed up or
  // stretched (negative `squash`) rises above the standing box, and whatever leaves the box is cut off in a hard
  // straight line (a "half head"). Extend the top by the lift, in steps so the canvas is not rebuilt every frame.
  const lift = Math.max(0, pose.air ?? 0) + Math.max(0, -(pose.bob ?? 0)) + Math.max(0, -(pose.squash ?? 0)) * 1150;
  // Tall headgear (a crown's points, a plumed shako) rises above the standing box too.
  const hatTop = !look.hat ? 0 : look.hatStyle === "shako" ? 150 : look.hatStyle === "crown" ? 40 : 0;
  // A sleeper's "z"s float up past the hat.
  const zzz = pose.sleep && !lying ? 240 : 0;
  const extra = Math.ceil((lift + hatTop + zzz) / 60) * 60;
  const crawling = pose.crawl !== undefined;
  // Lying down, the headgear points to screen-left instead, past the lying box.
  const hatSide = lying ? Math.ceil(hatTop / 60) * 60 : 0;
  const VB = useMemo(() => {
    const base = lying ? { ...VB_LIE, x: VB_LIE.x - hatSide, w: VB_LIE.w + hatSide } : crawling ? VB_CRAWL : VB_STAND;
    return extra ? { ...base, y: base.y - extra, h: base.h + extra } : base;
  }, [lying, crawling, extra, hatSide]);
  const root = useRef<THREE.Group>(null);
  const card = useRef<THREE.Group>(null);
  const headY = HEAD_Y + (pose.air ?? 0) * K; // a puppet lifted onto a seat (a car bench) carries its head up too
  // The head as drawn: on the card (turned to the camera, leaning back by cardTilt about the raised feet), where the
  // drawing has it at headY - liftM above the card's pivot. The audit also takes the hat (`look.hat`) into the head.
  usePuppetAudit(
    root,
    () => card.current?.localToWorld(new THREE.Vector3(0, headY - liftM, 0)) ?? root.current?.parent?.localToWorld(new THREE.Vector3(x, headY, z)) ?? new THREE.Vector3(x, headY, z),
    205 * K,
    id,
    !!pose.sit,
    { card, headOnCard: headY - liftM, hat: hatBox(look, pose) },
  );
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
    [id, look, pose, density, VB],
  );

  const canvas = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = Math.round(VB.w * density);
    c.height = Math.round(VB.h * density);
    // Give it its 2D context now: the texture uploads before the first raster, and WebGPU refuses a context-less canvas.
    c.getContext("2d");
    return c;
  }, [density, VB]);
  const texture = useMemo(() => {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    // The canvas already matches the on-screen size, so skip per-upload mipmap generation.
    t.generateMipmaps = false;
    t.minFilter = THREE.LinearFilter;
    return t;
  }, [canvas]);
  useEffect(() => () => texture.dispose(), [texture]);
  const litMaterial = useMemo(
    () =>
      light
        ? new THREE.ShaderMaterial({
            vertexShader: LIT_VERTEX,
            fragmentShader: LIT_FRAGMENT,
            uniforms: { map: { value: texture }, rimUv: { value: new THREE.Vector2(RIM / VB.w, RIM / VB.h) }, axis: { value: new THREE.Vector3() }, bodyHalf: { value: BODY_HALF }, headY: { value: HEAD_Y }, headR: { value: 0.27 }, maskOn: { value: mask ? 1 : 0 }, maskC: { value: new THREE.Vector3(...(mask?.center ?? [0, 0, 0])) }, maskU: { value: new THREE.Vector3(...(mask?.u ?? [0, 0, 0])) }, maskV: { value: new THREE.Vector3(...(mask?.v ?? [0, 0, 0])) }, maskArch: { value: mask?.archBottom !== undefined ? 1 : 0 }, maskBMin: { value: mask?.archBottom ?? 0 }, ...Object.fromEntries(Object.entries(litUniforms(light)).map(([k, v]) => [k, { value: v }])) },
            transparent: true,
          })
        : null,
    [texture, !!light],
  );
  // three's shadow pass copies `map` and `alphaTest` from the mesh's own material onto the depth material; a
  // ShaderMaterial has neither, so without these the lit card cast its whole rectangle as a shadow.
  if (litMaterial && !(litMaterial as unknown as { map?: THREE.Texture }).map) {
    Object.assign(litMaterial, { map: texture, alphaTest: 0.5 });
  }
  // Lights flicker per frame: refresh the uniforms without rebuilding the material.
  if (litMaterial && light) {
    for (const [k, v] of Object.entries(litUniforms(light))) litMaterial.uniforms[k].value = v;
    litMaterial.uniforms.axis.value.set(x, 0, z);
    litMaterial.uniforms.maskOn.value = mask ? 1 : 0;
    if (mask) {
      litMaterial.uniforms.maskC.value.set(...mask.center);
      litMaterial.uniforms.maskU.value.set(...mask.u);
      litMaterial.uniforms.maskV.value.set(...mask.v);
      litMaterial.uniforms.maskArch.value = mask.archBottom !== undefined ? 1 : 0;
      litMaterial.uniforms.maskBMin.value = mask.archBottom ?? 0;
    }
    litMaterial.uniforms.headY.value = pose.sit ? HEAD_Y - HIP_HEIGHT * 0.55 : HEAD_Y;
  }
  useEffect(() => () => litMaterial?.dispose(), [litMaterial]);
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
      auditCardEdges(canvas, id);
      texture.needsUpdate = true;
      if (--pending.n === 0) advance(performance.now());
      continueRender(handle);
    };
    img.onerror = () => cancelRender(new Error(`Could not rasterise puppet ${id}`));
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup)}`;
  }, [markup, canvas, texture, advance, gl, id]);

  return (
    <group ref={root} position={[x, 0, z]} userData={{ puppet: true }}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[1, 0.42, 1]} visible={!mask}>
        <circleGeometry args={[0.28, 40]} />
        <meshBasicMaterial color="#000" transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <group rotation={[0, yaw, 0]}>
        <group ref={card} position={[0, liftM, 0]} rotation={[-tilt, 0, 0]}>
          <mesh position={[(VB.x + VB.w / 2) * K, -(VB.y + VB.h / 2) * K - liftM, 0]} castShadow customDepthMaterial={depthMaterial} material={litMaterial ?? undefined}>
            <planeGeometry args={[VB.w * K, VB.h * K]} />
            {!litMaterial && <meshBasicMaterial map={texture} color={tint} transparent alphaTest={0.02} toneMapped={false} fog={false} />}
          </mesh>
        </group>
      </group>
    </group>
  );
};
