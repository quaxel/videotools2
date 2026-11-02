// The post chain on a Stage's canvas, ported from animated-short's bridge (Bridge.tsx):
//   render -> [ink (own pass), off by default] -> lens blur pre -> lens blur main -> bloom + grade (one merged pass).
// The screen-space ink is off: the sets keep only their own hull outlines (tried at 3.2-6 px, 2026-11-02, and
// dropped). `{"ink": true}` in the `post` input prop still turns it on. Ink before the depth of field so the lines blur with what they belong to; bloom after it so glows defocus with
// their source; the grade last, on display values. No tone mapping (the canvas is `flat`) and no MSAA: the canvas is
// already drawn at 2x (SUPERSAMPLE) and scaled down. Half-float buffers, so bright emissives above 1 can bloom.
// Mounted inside the ThreeCanvas: a useFrame with priority 1 takes over rendering from R3F.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { BlendFunction, BloomEffect, EffectComposer, EffectPass, RenderPass } from "postprocessing";
import { InkPass } from "./ink";
import { LensBlur } from "./lens";
import { GradeEffect } from "./grade";

export type PostParts = { ink: boolean; lens: boolean; bloom: boolean; grade: boolean };
export const ALL_PARTS: PostParts = { ink: false, lens: true, bloom: true, grade: true };

// Bloom for emissive sources only (threshold 1.0: white label boards and screens must not glow). Its mip chain is sized from a 1920-high frame whatever the buffer, so the glow
// keeps the same size relative to the frame at every scale.
const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 1.6, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.85 });
  const mip = b.mipmapBlurPass;
  const setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};

// Buffers at the renderer's own size and pixel ratio. The composer resizes the canvas when given any other size.
const fitToRenderer = (composer: EffectComposer) => {
  const s = composer.getRenderer().getSize(new THREE.Vector2());
  composer.setSize(s.x, s.y, false);
};

/** `focus`: metres along the view axis that stay sharp; `cInf`: blur-disc radius (px at 1080x1920) at infinity,
 *  0 = everything sharp. */
export const Post: React.FC<{ parts: PostParts; focus: number; cInf: number; inkDebug?: boolean }> = ({ parts, focus, cInf, inkDebug }) => {
  const { gl, scene, camera, size } = useThree();
  const chain = useMemo(() => {
    const composer = new EffectComposer(gl, { frameBufferType: THREE.HalfFloatType, multisampling: 0 });
    const ink = parts.ink ? new InkPass(scene, camera) : null;
    const lens = parts.lens ? new LensBlur() : null;
    const effects = [parts.bloom ? makeBloom() : null, parts.grade ? new GradeEffect() : null].filter((e) => e !== null);
    composer.addPass(new RenderPass(scene, camera));
    if (ink) composer.addPass(ink);
    if (lens) {
      composer.addPass(new EffectPass(camera, lens.pre));
      composer.addPass(new EffectPass(camera, lens.main));
    }
    if (effects.length) composer.addPass(new EffectPass(camera, ...effects));
    // Set now, not in an effect: Remotion draws the first frame before this component's effects run.
    fitToRenderer(composer);
    return { composer, ink, lens };
  }, [gl, scene, camera, parts.ink, parts.lens, parts.bloom, parts.grade]);
  // Free every render target with the shot: a render tab keeps finished shots' contexts alive.
  useEffect(() => () => chain.composer.dispose(), [chain]);
  useEffect(() => fitToRenderer(chain.composer), [chain, size.width, size.height]);
  if (chain.ink) chain.ink.debug = inkDebug ? 1 : 0;
  if (chain.lens) {
    chain.lens.focus = Math.max(0.2, focus);
    chain.lens.cInf = cInf;
  }
  useFrame(() => chain.composer.render(), 1);
  return null;
};
