// Screen-space ink lines for the 3D set, ported from animated-short's bridge (templates/bridge/ink.ts).
//  1. Re-render the set alone (puppet cards, sky, smoke, effect sprites and the sets' own inverted-hull outlines
//     hidden) into a normal + depth target.
//  2. Edge mask: the near side of every depth jump (silhouettes, object against object) and creases where the
//     surface normal turns sharply. Coverage is continuous in the width, so lines never pop while the camera moves;
//     the width shrinks a little with distance and fades out far away. No ink where something not in the set buffer
//     (a puppet) is in front.
//  3. Composite: tent-filtered mask, near-black ink blended in display gamma, written back into the input buffer.
// It is a Pass, so it runs before the lens blur and the lines blur with what they belong to.
// Hidden objects are switched off with `visible` for step 1 only (not moved to another layer): the framing audit's
// raycaster sees layer 0 only.
// Widths are given in px at 1080x1920 and scaled with the buffer height, so stills, the 1080p and the 2K render match.
import * as THREE from "three";
import { Pass } from "postprocessing";

export type InkOptions = {
  color?: THREE.ColorRepresentation; // sRGB hex of the ink
  strength?: number; // max opacity
  widthNear?: number; // silhouette line width in px at distNear (1080x1920 output)
  widthFar?: number; // ... at distFar
  distNear?: number; // m
  distFar?: number; // m
  creaseScale?: number; // crease line width / silhouette line width
  depthLo?: number; // relative depth jump where lines start
  depthHi?: number; // ... where they are full strength
  angleLo?: number; // crease angle (deg) where lines start
  angleHi?: number; // ... where they are full strength
  concaveGain?: number; // strength of concave folds (object meets floor, inner corners)
  farOpacity?: number; // opacity multiplier reached at distFar
  fadeNear?: number; // m: start of the far fade-out
  fadeFar?: number; // m: lines gone
};

// Our sets are rooms and near exteriors a few metres across (the bridge's were a town 100 m deep): lines a little
// thinner than the bridge's 5.1 px and fading out sooner. 3.2 px read as barely there next to the sets' own
// ~2 px hull outlines, and 4.6 px still read as subtle, so they sit at 6 px (thicker than the bridge).
const DEF: Required<InkOptions> = {
  color: "#161212", strength: 1.0,
  widthNear: 6.0, widthFar: 4.0, distNear: 3, distFar: 40, creaseScale: 0.85,
  depthLo: 0.01, depthHi: 0.03, angleLo: 32, angleHi: 48, concaveGain: 0.7,
  farOpacity: 0.95, fadeNear: 60, fadeFar: 200,
};

const FS_VERT = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

// set-only normal pass (scene.overrideMaterial); cut-out materials (map + alphaTest) keep their shape
const NORMAL_VERT = /* glsl */ `
#include <common>
#include <skinning_pars_vertex>
uniform mat3 cutUv;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  vN = transformedNormal;
  vCut = (cutUv * vec3(uv, 1.0)).xy;
  #include <begin_vertex>
  #include <project_vertex>
  vV = mvPosition.xyz;
}`;
const NORMAL_FRAG = /* glsl */ `
uniform sampler2D tCut;
uniform float cut;
varying vec3 vN;
varying vec3 vV;
varying vec2 vCut;
void main() {
  if (cut > 0.0 && texture2D(tCut, vCut).a < cut) discard;
  vec3 n;
  if (dot(vN, vN) < 1e-8) n = normalize(cross(dFdx(vV), dFdy(vV)));
  else n = normalize(vN) * (gl_FrontFacing ? 1.0 : -1.0);
  gl_FragColor = vec4(n, 1.0);
}`;

const MASK_FRAG = /* glsl */ `
#include <packing>
uniform sampler2D tNormal;
uniform sampler2D tDepth;
uniform sampler2D tMainDepth;
uniform vec2 texel;
uniform float cNear;
uniform float cFar;
uniform float p00;
uniform float p11;
uniform float wNear;
uniform float wFar;
uniform float dNear;
uniform float dFar;
uniform float creaseScale;
uniform float depthLo;
uniform float depthHi;
uniform float cosLo;
uniform float cosHi;
uniform float concaveGain;
uniform float farOpacity;
uniform float fadeNear;
uniform float fadeFar;
uniform float strength;
uniform float useMain;
uniform float pxScale;   // buffer px per 1080x1920 px
varying vec2 vUv;

const vec2 STEP[4] = vec2[4](vec2(1.0, 0.0), vec2(0.0, 1.0), vec2(1.0, 1.0), vec2(1.0, -1.0));
const float SLEN[4] = float[4](1.0, 1.0, 1.41421, 1.41421);
#define RMAX 14   // 6 px x pxScale 2 (the 2x supersampled canvas) = 12 px, + AA ramp and headroom

float dist(sampler2D t, vec2 uv) { return -perspectiveDepthToViewZ(textureLod(t, uv, 0.0).x, cNear, cFar); }
vec3 viewPos(vec2 uv, float d) { vec2 n = uv * 2.0 - 1.0; return vec3(n.x * d / p00, n.y * d / p11, -d); }

float crease(vec3 n0, vec3 P0, float zc, vec2 uq, float zq) {
  vec4 nq = textureLod(tNormal, uq, 0.0);
  if (nq.a < 0.5 || abs(zq - zc) > zc * depthLo) return 0.0;
  float k = 1.0 - smoothstep(cosHi, cosLo, dot(n0, nq.xyz));
  if (dot(viewPos(uq, zq) - P0, n0) > 0.0) k *= concaveGain;
  return k;
}

void main() {
  vec4 nc = textureLod(tNormal, vUv, 0.0);
  if (nc.a < 0.5) { gl_FragColor = vec4(0.0); return; }
  float zc = dist(tDepth, vUv);
  if (useMain > 0.5) {   // a puppet (not in the set buffer) in front of this pixel: no set ink over it
    float zm = dist(tMainDepth, vUv);
    zm = min(zm, dist(tMainDepth, vUv + vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(texel.x, 0.0)));
    zm = min(zm, dist(tMainDepth, vUv + vec2(0.0, texel.y)));
    zm = min(zm, dist(tMainDepth, vUv - vec2(0.0, texel.y)));
    if (zm < zc * 0.985 - 0.03) { gl_FragColor = vec4(0.0); return; }
  }
  float t = clamp(log(zc / dNear) / log(dFar / dNear), 0.0, 1.0);
  float w = mix(wNear, wFar, t) * pxScale;
  float hc = 0.5 * w * creaseScale;
  float Wc = 1.0 / zc;
  vec3 n0 = nc.xyz;
  vec3 P0 = viewPos(vUv, zc);
  float eD = 0.0, eN = 0.0;
  for (int a = 0; a < 4; a++) {
    for (int r = 1; r <= RMAX; r++) {
      vec2 o = STEP[a] * texel * float(r);
      float d = (float(r) - 0.5) * SLEN[a];
      float cw = clamp(w + 0.5 - d, 0.0, 1.0);
      float ch = clamp(hc + 0.5 - d, 0.0, 1.0);
      if (cw <= 0.0 && ch <= 0.0) break;
      float z1 = dist(tDepth, vUv - o), z2 = dist(tDepth, vUv + o);
      float s = (1.0 / z1 + 1.0 / z2 - 2.0 * Wc) / Wc;
      eD = max(eD, smoothstep(depthLo, depthHi, -s) * cw);
      if (ch > 0.0) eN = max(eN, max(crease(n0, P0, zc, vUv - o, z1), crease(n0, P0, zc, vUv + o, z2)) * ch);
    }
  }
  float ink = max(eD, eN) * strength * mix(1.0, farOpacity, t) * (1.0 - smoothstep(fadeNear, fadeFar, zc));
  gl_FragColor = vec4(ink, 0.0, 0.0, 1.0);
}`;

const COMP_FRAG = /* glsl */ `
uniform sampler2D inputBuffer;
uniform sampler2D tMask;
uniform vec2 texel;
uniform vec3 inkColor;
uniform int debug;
varying vec2 vUv;
float m(float x, float y) { return texture2D(tMask, vUv + vec2(x, y) * texel).r; }
void main() {
  float a = (4.0 * m(0.0, 0.0)
    + 2.0 * (m(1.0, 0.0) + m(-1.0, 0.0) + m(0.0, 1.0) + m(0.0, -1.0))
    + m(1.0, 1.0) + m(-1.0, 1.0) + m(1.0, -1.0) + m(-1.0, -1.0)) / 16.0;
  vec4 c = texture2D(inputBuffer, vUv);
  if (debug == 1) { gl_FragColor = vec4(vec3(1.0 - a), 1.0); return; }
  vec3 g = pow(max(c.rgb, 0.0), vec3(1.0 / 2.2));   // blend in display gamma, like the puppets' Canvas2D ink
  gl_FragColor = vec4(pow(mix(g, pow(inkColor, vec3(1.0 / 2.2)), a), vec3(2.2)), c.a);
}`;

const COPY_FRAG = /* glsl */ `
uniform sampler2D tSrc;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(tSrc, vUv);
  #include <colorspace_fragment>
}`; // sRGB-encodes only when this pass is the last one and writes to the screen

/** Objects the set ink must not outline: camera-facing cards (puppets cast a shadow through a customDepthMaterial),
 *  sprites, points and lines, anything that does not write depth (sky dome, haze, smoke), see-through or glowing
 *  materials (holograms, rings, glass, light cones), alpha-tested basic cut-outs, the sets' own inverted-hull outlines
 *  (back-side basic meshes), instanced scatter (grass blades, tree crowns, rocks: a line round every blade reads as
 *  scribble, and the sets give the larger ones hull outlines) and anything marked userData.noInk. */
export const skipsInk = (o: THREE.Object3D) => {
  if (o.userData.noInk) return true;
  const m = o as THREE.Mesh;
  if ((o as THREE.Sprite).isSprite || (o as THREE.Points).isPoints || (o as THREE.Line).isLine) return true;
  if (!m.isMesh) return false;
  if (m.customDepthMaterial || (m as THREE.InstancedMesh).isInstancedMesh) return true;
  const mats = (Array.isArray(m.material) ? m.material : [m.material]) as THREE.Material[];
  return mats.some((x) => x && (x.depthWrite === false
    || (x.transparent && x.opacity < 0.99)
    || x.blending === THREE.AdditiveBlending
    || ((x as THREE.MeshBasicMaterial).isMeshBasicMaterial && (x.alphaTest > 0 || x.side === THREE.BackSide))));
};

export class InkPass extends Pass {
  /** 0 = normal, 1 = show the ink mask */
  debug = 0;
  private world: THREE.Scene;
  private cam: THREE.Camera;
  private rt: THREE.WebGLRenderTarget;
  private maskRT: THREE.WebGLRenderTarget;
  private tmpRT: THREE.WebGLRenderTarget;
  private normalMat: THREE.ShaderMaterial;
  private maskMat: THREE.ShaderMaterial;
  private compMat: THREE.ShaderMaterial;
  private copyMat: THREE.ShaderMaterial;
  private fsScene = new THREE.Scene();
  private fsCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private clearCol = new THREE.Color();
  private hidden: THREE.Object3D[] = [];

  constructor(scene: THREE.Scene, camera: THREE.Camera, options: InkOptions = {}) {
    super("InkPass");
    const o = { ...DEF, ...options };
    this.world = scene;
    this.cam = camera;
    this.needsSwap = false; // writes back into the input buffer (keeps the composer's depth texture)
    this.needsDepthTexture = true;
    this.rt = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: true, samples: 0,
      depthTexture: new THREE.DepthTexture(1, 1, THREE.UnsignedIntType),
    });
    this.maskRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.UnsignedByteType, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter,
      generateMipmaps: false, depthBuffer: false,
    });
    this.tmpRT = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter,
      generateMipmaps: false, depthBuffer: false,
    });
    this.normalMat = new THREE.ShaderMaterial({
      vertexShader: NORMAL_VERT, fragmentShader: NORMAL_FRAG, side: THREE.DoubleSide,
      uniforms: { tCut: { value: null }, cut: { value: 0 }, cutUv: { value: new THREE.Matrix3() } },
    });
    this.normalMat.onBeforeRender = (_r, _s, _c, _g, object, group) => {
      const mat = (object as THREE.Mesh).material as THREE.Material | THREE.Material[];
      const gi = (group as unknown as { materialIndex?: number } | null)?.materialIndex ?? 0;
      const src = (Array.isArray(mat) ? mat[gi] : mat) as THREE.MeshLambertMaterial;
      const u = this.normalMat.uniforms;
      const map = src && src.alphaTest > 0 ? src.map : null;
      u.tCut.value = map;
      u.cut.value = map ? src.alphaTest : 0;
      if (map) {
        map.updateMatrix();
        (u.cutUv.value as THREE.Matrix3).copy(map.matrix);
      }
      this.normalMat.uniformsNeedUpdate = true;
    };
    const fs = (fragmentShader: string, uniforms: Record<string, THREE.IUniform>) =>
      new THREE.ShaderMaterial({ vertexShader: FS_VERT, fragmentShader, uniforms, depthTest: false, depthWrite: false });
    const texel = new THREE.Vector2(1, 1);
    this.maskMat = fs(MASK_FRAG, {
      tNormal: { value: this.rt.texture }, tDepth: { value: this.rt.depthTexture }, tMainDepth: { value: null },
      texel: { value: texel }, cNear: { value: 0.1 }, cFar: { value: 1000 }, p00: { value: 1 }, p11: { value: 1 },
      wNear: { value: o.widthNear }, wFar: { value: o.widthFar }, dNear: { value: o.distNear }, dFar: { value: o.distFar },
      creaseScale: { value: o.creaseScale }, depthLo: { value: o.depthLo }, depthHi: { value: o.depthHi },
      cosLo: { value: Math.cos((o.angleLo * Math.PI) / 180) }, cosHi: { value: Math.cos((o.angleHi * Math.PI) / 180) },
      concaveGain: { value: o.concaveGain }, farOpacity: { value: o.farOpacity },
      fadeNear: { value: o.fadeNear }, fadeFar: { value: o.fadeFar }, strength: { value: o.strength },
      useMain: { value: 0 }, pxScale: { value: 1 },
    });
    this.compMat = fs(COMP_FRAG, {
      inputBuffer: { value: null }, tMask: { value: this.maskRT.texture }, texel: { value: texel },
      inkColor: { value: new THREE.Color(o.color) }, debug: { value: 0 },
    });
    this.copyMat = fs(COPY_FRAG, { tSrc: { value: this.tmpRT.texture } });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.maskMat);
    this.quad.frustumCulled = false;
    this.fsScene.add(this.quad);
  }

  override setDepthTexture(depthTexture: THREE.Texture) {
    this.maskMat.uniforms.tMainDepth.value = depthTexture ?? null;
    this.maskMat.uniforms.useMain.value = depthTexture ? 1 : 0;
  }

  override setSize(width: number, height: number) {
    this.rt.setSize(width, height);
    this.maskRT.setSize(width, height);
    this.tmpRT.setSize(width, height);
    (this.maskMat.uniforms.texel.value as THREE.Vector2).set(1 / width, 1 / height);
    this.maskMat.uniforms.pxScale.value = height / 1920;
  }

  override render(renderer: THREE.WebGLRenderer, inputBuffer: THREE.WebGLRenderTarget) {
    const scene = this.world;
    const cam = this.cam as THREE.PerspectiveCamera;
    const autoClear = renderer.autoClear, shadowAuto = renderer.shadowMap.autoUpdate;
    const override = scene.overrideMaterial, background = scene.background;
    renderer.getClearColor(this.clearCol);
    const clearAlpha = renderer.getClearAlpha();
    renderer.autoClear = false;

    // 1) set-only normals + depth
    this.hidden.length = 0;
    scene.traverseVisible((o) => {
      if (o !== scene && skipsInk(o)) this.hidden.push(o);
    });
    for (const o of this.hidden) o.visible = false;
    scene.overrideMaterial = this.normalMat;
    scene.background = null;
    renderer.shadowMap.autoUpdate = false;
    renderer.setClearColor(0x000000, 0);
    renderer.setRenderTarget(this.rt);
    renderer.clear(true, true, false);
    renderer.render(scene, cam);
    for (const o of this.hidden) o.visible = true;
    scene.overrideMaterial = override;
    scene.background = background;
    renderer.shadowMap.autoUpdate = shadowAuto;
    renderer.setClearColor(this.clearCol, clearAlpha);

    // 2) edge mask
    const u = this.maskMat.uniforms, e = cam.projectionMatrix.elements;
    u.cNear.value = cam.near;
    u.cFar.value = cam.far;
    u.p00.value = e[0];
    u.p11.value = e[5];
    this.quad.material = this.maskMat;
    renderer.setRenderTarget(this.maskRT);
    renderer.render(this.fsScene, this.fsCam);

    // 3) composite into a temp target, 4) copy back into the input buffer
    this.compMat.uniforms.inputBuffer.value = inputBuffer.texture;
    this.compMat.uniforms.debug.value = this.debug;
    this.quad.material = this.compMat;
    renderer.setRenderTarget(this.tmpRT);
    renderer.render(this.fsScene, this.fsCam);
    this.quad.material = this.copyMat;
    renderer.setRenderTarget(this.renderToScreen ? null : inputBuffer);
    renderer.render(this.fsScene, this.fsCam);
    renderer.autoClear = autoClear;
  }

  override dispose() {
    this.rt.depthTexture?.dispose();
    this.rt.dispose();
    this.maskRT.dispose();
    this.tmpRT.dispose();
    this.normalMat.dispose();
    this.maskMat.dispose();
    this.compMat.dispose();
    this.copyMat.dispose();
    this.quad.geometry.dispose();
  }
}
