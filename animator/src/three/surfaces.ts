import * as THREE from "three";

// Procedural surface patterns for walls and floors. Each is drawn in greys around mid-tone so it multiplies
// the material colour: the colour stays what the scene asked for, the surface gains texture. Built once per
// pattern and shared; callers set repeat for the surface size.

export type WallPattern = "plaster" | "brick" | "panel" | "wallpaper" | "tile" | "plain";
export type FloorPattern = "wood" | "tile" | "carpet" | "concrete" | "plain";

const SIZE = 512;
const cache = new Map<string, THREE.CanvasTexture>();

const rng = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
};

const grey = (v: number, a = 1) => `rgba(${v},${v},${v},${a})`;

const DRAW: Record<string, (ctx: CanvasRenderingContext2D, r: () => number) => void> = {
  plaster: (ctx, r) => {
    ctx.fillStyle = grey(236);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 260; i++) {
      const x = r() * SIZE, y = r() * SIZE, rad = 8 + r() * 46;
      const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
      const v = r() > 0.5 ? 255 : 180;
      g.addColorStop(0, grey(v, 0.3));
      g.addColorStop(1, grey(v, 0));
      ctx.fillStyle = g;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  },
  brick: (ctx, r) => {
    ctx.fillStyle = grey(170);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const bh = SIZE / 8, bw = SIZE / 4;
    for (let row = 0; row < 8; row++)
      for (let col = -1; col < 5; col++) {
        const x = col * bw + (row % 2 ? bw / 2 : 0);
        ctx.fillStyle = grey(222 + Math.floor(r() * 30));
        ctx.fillRect(x + 4, row * bh + 4, bw - 8, bh - 8);
      }
  },
  panel: (ctx) => {
    ctx.fillStyle = grey(238);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = grey(176);
      ctx.fillRect(i * (SIZE / 4), 0, 6, SIZE);
      ctx.fillStyle = grey(252);
      ctx.fillRect(i * (SIZE / 4) + 5, 0, 3, SIZE);
    }
  },
  wallpaper: (ctx) => {
    ctx.fillStyle = grey(238);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 8; i++) {
      ctx.fillStyle = grey(i % 2 ? 250 : 210);
      ctx.fillRect(i * (SIZE / 8), 0, SIZE / 16, SIZE);
    }
    ctx.fillStyle = grey(212);
    for (let y = 32; y < SIZE; y += 64)
      for (let x = 32; x < SIZE; x += 64) {
        ctx.beginPath();
        ctx.arc(x + ((y / 64) % 2) * 32, y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
  },
  tile: (ctx, r) => {
    ctx.fillStyle = grey(190);
    ctx.fillRect(0, 0, SIZE, SIZE);
    const t = SIZE / 4;
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 4; x++) {
        ctx.fillStyle = grey(228 + Math.floor(r() * 20));
        ctx.fillRect(x * t + 3, y * t + 3, t - 6, t - 6);
        ctx.fillStyle = grey(255, 0.25);
        ctx.fillRect(x * t + 8, y * t + 8, t * 0.35, 6);
      }
  },
  wood: (ctx, r) => {
    const pw = SIZE / 6;
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = grey(214 + Math.floor(r() * 30));
      ctx.fillRect(i * pw, 0, pw, SIZE);
      ctx.strokeStyle = grey(180, 0.5);
      ctx.lineWidth = 2;
      for (let k = 0; k < 7; k++) {
        const x = i * pw + 8 + r() * (pw - 16);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.bezierCurveTo(x + 6, SIZE * 0.3, x - 6, SIZE * 0.7, x + 3, SIZE);
        ctx.stroke();
      }
      ctx.fillStyle = grey(150);
      ctx.fillRect(i * pw, 0, 3, SIZE);
      ctx.fillRect(i * pw, (i * 173) % SIZE, pw, 3);
    }
  },
  carpet: (ctx, r) => {
    ctx.fillStyle = grey(226);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = grey(r() > 0.5 ? 245 : 200, 0.5);
      ctx.fillRect(r() * SIZE, r() * SIZE, 2, 2);
    }
  },
  concrete: (ctx, r) => {
    ctx.fillStyle = grey(228);
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 4000; i++) {
      ctx.fillStyle = grey(r() > 0.5 ? 250 : 196, 0.35);
      const s = 1 + r() * 3;
      ctx.fillRect(r() * SIZE, r() * SIZE, s, s);
    }
    ctx.fillStyle = grey(190);
    ctx.fillRect(0, SIZE / 2, SIZE, 2);
    ctx.fillRect(SIZE / 2, 0, 2, SIZE);
  },
};

// `repeat` is how many times the 512 px tile repeats across the surface (one tile ≈ 1 m for floors).
export const surfaceTexture = (pattern: WallPattern | FloorPattern, repeatX: number, repeatY: number) => {
  if (pattern === "plain") return undefined;
  const key = `${pattern}:${repeatX}:${repeatY}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = SIZE;
  DRAW[pattern](c.getContext("2d")!, rng(pattern.length * 7919));
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  t.anisotropy = 8;
  cache.set(key, t);
  return t;
};

// Soft dark gradient (top transparent, bottom dark) for contact shadows where surfaces meet.
let aoTex: THREE.CanvasTexture | undefined;
export const aoGradient = () => {
  if (aoTex) return aoTex;
  const c = document.createElement("canvas");
  c.width = 4;
  c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.55)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 4, 128);
  aoTex = new THREE.CanvasTexture(c);
  return aoTex;
};

// Radial glow for halos around screens and lamps.
let haloTex: THREE.CanvasTexture | undefined;
export const haloTexture = () => {
  if (haloTex) return haloTex;
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, "rgba(255,255,255,0.9)");
  g.addColorStop(0.35, "rgba(255,255,255,0.35)");
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  haloTex = new THREE.CanvasTexture(c);
  return haloTex;
};

// Window light: soft-edged parallel bars (blinds) or panes, white on black, used additively.
const lightCache = new Map<string, THREE.CanvasTexture>();
export const lightPoolTexture = (bars: number) => {
  const key = String(bars);
  const hit = lightCache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, 512, 512);
  ctx.filter = "blur(10px)";
  ctx.fillStyle = "#fff";
  const h = 512 / bars;
  for (let i = 0; i < bars; i++) ctx.fillRect(30, i * h + h * 0.18, 452, h * 0.62);
  ctx.filter = "none";
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  lightCache.set(key, t);
  return t;
};

// Hand-painted shading for a bare prop face: lighter at the top, a soft darker rim round the edges, so flat
// toon boxes read as painted objects with rounded edges. Very low frequency, so it never looks stretched on
// long or thin faces. Multiplies the material colour.
let paintTex: THREE.CanvasTexture | undefined;
export const paintTexture = () => {
  if (paintTex) return paintTex;
  const S = 128;
  const c = document.createElement("canvas");
  c.width = c.height = S;
  const ctx = c.getContext("2d")!;
  const top = ctx.createLinearGradient(0, 0, 0, S);
  top.addColorStop(0, grey(255));
  top.addColorStop(1, grey(226));
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, S, S);
  for (const [x0, y0, x1, y1] of [
    [0, 0, 0, S * 0.14],
    [0, S, 0, S * 0.86],
    [0, 0, S * 0.14, 0],
    [S, 0, S * 0.86, 0],
  ]) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0, "rgba(0,0,0,0.13)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  }
  paintTex = new THREE.CanvasTexture(c);
  paintTex.colorSpace = THREE.SRGBColorSpace;
  return paintTex;
};
