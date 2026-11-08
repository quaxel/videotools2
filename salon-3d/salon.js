// Salon — 3D reconstruction of the living room from the WhatsApp walk-through video.
// Units: metres, Y up. Room interior spans x ∈ [-W/2, W/2], z ∈ [-D/2, D/2], floor at y = 0.
//
//   North wall (z = -D/2) : TV wall — glazed double doors to the hall (west end), armchair,
//                           white sideboard + TV, torchiere lamp; dropped beam along the top
//   East  wall (x = +W/2) : mauve accent wall — beige column at the north end, dining table
//                           with 4 chairs, deer print, palm; dropped beam along the top
//   South wall (z = +D/2) : full-height curtained balcony section (east), mauve pier,
//                           window with 3-seat sofa, drum lamp + orchids + purifier (west corner)
//   West  wall (x = -W/2) : 2-seat sofa, flower print, tall vase, white display cabinet
//
// All sizes are estimates from the ultrawide footage using standard furniture sizes.
// Furniture is placed relative to wall ends, so changing ROOM rescales the layout.
// buildSalon() returns { group, walls, ceiling, overhead, materials }.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Scale reference: the TV is 40" (16:9 → 0.89 × 0.50 m screen). In the video the sideboard is
// ~2.15× the TV width and the armchair about one TV width, which sets the TV-wall run.
export const ROOM = { W: 5.1, D: 4.0, H: 2.75 };

// ---------------------------------------------------------------- textures

function canvasTex(w, h, draw, repeat = [1, 1]) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(...repeat);
  t.anisotropy = 8;
  return t;
}

function rand(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Oak strip parquet (staggered strips, like the floor in the video)
function parquetTexture() {
  const r = rand(7);
  return canvasTex(1024, 1024, (g, w, h) => {
    const rows = 16, rowH = h / rows;
    for (let i = 0; i < rows; i++) {
      let x = -r() * 300;
      while (x < w) {
        const len = 160 + r() * 260;
        const base = 0.85 + r() * 0.3;
        const c = (v) => Math.min(255, Math.round(v * base));
        g.fillStyle = `rgb(${c(184)},${c(120)},${c(62)})`;
        g.fillRect(x, i * rowH, len, rowH);
        // grain
        for (let k = 0; k < 7; k++) {
          g.strokeStyle = `rgba(90,45,15,${0.05 + r() * 0.08})`;
          g.lineWidth = 1 + r() * 1.5;
          const y = i * rowH + r() * rowH;
          g.beginPath(); g.moveTo(x, y);
          g.bezierCurveTo(x + len * 0.3, y + (r() - 0.5) * 6, x + len * 0.6, y + (r() - 0.5) * 6, x + len, y);
          g.stroke();
        }
        g.fillStyle = 'rgba(60,30,10,0.55)';
        g.fillRect(x, i * rowH, 2, rowH);
        x += len;
      }
      g.fillStyle = 'rgba(60,30,10,0.45)';
      g.fillRect(0, i * rowH, w, 2);
    }
  }, [3, 3]);
}

function rugTexture() {
  const r = rand(3);
  return canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#8d8984'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40000; i++) {
      const v = 110 + r() * 60;
      g.fillStyle = `rgba(${v},${v - 3},${v - 6},0.35)`;
      g.fillRect(r() * w, r() * h, 1.5, 1.5);
    }
  }, [3, 3]);
}

function fabricTexture(hex) {
  const r = rand(11);
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = hex; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      g.fillStyle = `rgba(0,0,0,${0.02 + r() * 0.03})`;
      g.fillRect(0, y, w, 1);
    }
    for (let i = 0; i < 4000; i++) {
      g.fillStyle = `rgba(255,255,255,${r() * 0.06})`;
      g.fillRect(r() * w, r() * h, 1, 1);
    }
  }, [2, 2]);
}

function deerPrint() {
  return canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#e4e2df'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#7d7a78'; g.lineWidth = 1.2;
    // geometric deer head: low-poly lines
    const P = (x, y) => [x * w, y * h];
    const pts = [P(.5, .78), P(.42, .55), P(.58, .55), P(.4, .42), P(.6, .42), P(.45, .32), P(.55, .32)];
    const tri = [[0, 1, 2], [1, 2, 3], [2, 3, 4], [3, 4, 5], [4, 5, 6], [1, 3, 5], [2, 4, 6]];
    tri.forEach(([a, b, c]) => { g.beginPath(); g.moveTo(...pts[a]); g.lineTo(...pts[b]); g.lineTo(...pts[c]); g.closePath(); g.stroke(); });
    const antler = (s) => {
      g.beginPath();
      g.moveTo(...P(.5 + s * .06, .32)); g.lineTo(...P(.5 + s * .16, .18)); g.lineTo(...P(.5 + s * .26, .12));
      g.moveTo(...P(.5 + s * .16, .18)); g.lineTo(...P(.5 + s * .14, .08));
      g.moveTo(...P(.5 + s * .21, .15)); g.lineTo(...P(.5 + s * .3, .2));
      g.moveTo(...P(.5 + s * .11, .25)); g.lineTo(...P(.5 + s * .22, .27));
      g.stroke();
    };
    antler(1); antler(-1);
    g.beginPath(); g.moveTo(...P(.42, .4)); g.lineTo(...P(.3, .36)); g.lineTo(...P(.4, .45)); g.stroke();
    g.beginPath(); g.moveTo(...P(.58, .4)); g.lineTo(...P(.7, .36)); g.lineTo(...P(.6, .45)); g.stroke();
  });
}

function flowerPrint() {
  const r = rand(5);
  return canvasTex(320, 256, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, h);
    grd.addColorStop(0, '#9c968c'); grd.addColorStop(1, '#6f6a62');
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3000; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.05})`; g.fillRect(r() * w, r() * h, 2, 2); }
    const flower = (cx, cy, R, n) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.save(); g.translate(cx, cy); g.rotate(a);
        g.fillStyle = '#f4f2ee'; g.strokeStyle = '#9a958d';
        g.beginPath(); g.ellipse(R * 0.55, 0, R * 0.5, R * 0.16, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        g.restore();
      }
      g.fillStyle = '#4a463f'; g.beginPath(); g.arc(cx, cy, R * 0.12, 0, Math.PI * 2); g.fill();
    };
    g.strokeStyle = '#e9e6e0'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(110, 120); g.quadraticCurveTo(120, 200, 100, 256); g.stroke();
    g.beginPath(); g.moveTo(210, 80); g.quadraticCurveTo(200, 180, 215, 256); g.stroke();
    flower(110, 120, 52, 11);
    flower(210, 80, 62, 12);
  });
}

function windowViewTexture() {
  const r = rand(19);
  return canvasTex(512, 512, (g, w, h) => {
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#e9f1f6'); sky.addColorStop(1, '#cfdde3');
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    // distant apartment blocks
    g.fillStyle = '#c9c4bc'; g.fillRect(40, 90, 120, 260); g.fillRect(330, 60, 140, 300);
    g.fillStyle = '#b9b2a8';
    for (let y = 100; y < 340; y += 26) for (let x = 50; x < 150; x += 24) g.fillRect(x, y, 12, 14);
    for (let y = 70; y < 340; y += 26) for (let x = 340; x < 460; x += 24) g.fillRect(x, y, 12, 14);
    // trees
    for (let i = 0; i < 260; i++) {
      const x = r() * w, y = 160 + r() * 380, R = 18 + r() * 40;
      const gr = 90 + r() * 70;
      g.fillStyle = `rgba(${gr * 0.45},${gr},${gr * 0.4},0.55)`;
      g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.fill();
    }
  });
}

// ---------------------------------------------------------------- materials

function makeMaterials() {
  const std = (o) => new THREE.MeshStandardMaterial(o);
  return {
    beige: std({ color: 0xdbd2c5, roughness: 0.92 }),
    mauve: std({ color: 0x968a90, roughness: 0.92 }),
    ceiling: std({ color: 0xeeedea, roughness: 0.95, emissive: 0xeeedea, emissiveIntensity: 0.22 }),
    molding: std({ color: 0xf6f5f2, roughness: 0.7 }),
    floor: std({ map: parquetTexture(), roughness: 0.45, metalness: 0.0 }),
    lacquer: std({ color: 0xf4f3f0, roughness: 0.18, metalness: 0.0 }),
    walnut: std({ color: 0x5a3a24, roughness: 0.5 }),
    doorWood: std({ color: 0xa65f2a, roughness: 0.45 }),
    frostGlass: new THREE.MeshPhysicalMaterial({ color: 0x6b5848, roughness: 0.35, transmission: 0.2, transparent: true, opacity: 0.85 }),
    blackGlass: std({ color: 0x111214, roughness: 0.08, metalness: 0.2 }),
    screen: std({ color: 0x0b0c0e, roughness: 0.1, emissive: 0x3d6f8a, emissiveIntensity: 0.35 }),
    sofa: std({ map: fabricTexture('#d6d1ca'), roughness: 0.95 }),
    sofaCushion: std({ map: fabricTexture('#bfb9b1'), roughness: 0.95 }),
    armchair: std({ map: fabricTexture('#c9c2b8'), roughness: 0.95 }),
    chairFab: std({ map: fabricTexture('#ecebe7'), roughness: 0.95 }),
    rug: std({ map: rugTexture(), roughness: 1 }),
    chrome: std({ color: 0xd9dadd, roughness: 0.18, metalness: 1 }),
    brushed: std({ color: 0xbdbcb8, roughness: 0.35, metalness: 0.9 }),
    leaf: std({ color: 0x3f6b2c, roughness: 0.7, side: THREE.DoubleSide }),
    pot: std({ color: 0xf1efea, roughness: 0.5 }),
    shade: std({ color: 0xe9e2d2, roughness: 0.9, side: THREE.DoubleSide, emissive: 0xfff1d6, emissiveIntensity: 0.15 }),
    curtain: std({ color: 0xf3f0ea, roughness: 0.9, side: THREE.DoubleSide, transparent: true, opacity: 0.5, depthWrite: false }),
    tile: std({ color: 0xa3a3a0, roughness: 0.6 }),
    frontDoor: std({ color: 0x1c1b1c, roughness: 0.5 }),
    black: std({ color: 0x1a1a1a, roughness: 0.6 }),
    white: std({ color: 0xf2f1ee, roughness: 0.6 }),
    frame: std({ color: 0xf7f7f5, roughness: 0.6 }),
  };
}

// ---------------------------------------------------------------- helpers

function box(w, h, d, mat, x = 0, y = 0, z = 0, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, mat, x = 0, y = 0, z = 0, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

// Crown molding: cove profile extruded along local +X, sitting against a wall at local z=0, top at y=0.
function crownMolding(len, mat, depth = 0.11, drop = 0.13) {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.lineTo(depth, 0);
  s.lineTo(depth, -0.02);
  s.quadraticCurveTo(depth * 0.2, -0.03, 0.015, -drop + 0.02);
  s.lineTo(0.015, -drop);
  s.lineTo(0, -drop);
  s.closePath();
  const geo = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: 8 });
  // profile is in XY with extrusion along Z → rotate so extrusion runs along X and profile depth points +Z
  geo.rotateY(-Math.PI / 2);  // extrusion → -x, profile depth → +z (inward)
  geo.translate(len, 0, 0);   // span 0..len
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

// ---------------------------------------------------------------- furniture

function sofa(M, seats, len) {
  const g = new THREE.Group();
  const depth = 0.92, armW = 0.2, seatH = 0.42;
  // plinth + base
  g.add(box(len - 0.04, 0.08, depth - 0.06, M.black, 0, 0.04, 0));
  g.add(box(len, 0.24, depth, M.sofa, 0, 0.2, 0, 0.04));
  // arms (box arms like in the video)
  for (const s of [-1, 1]) g.add(box(armW, 0.62, depth, M.sofa, s * (len / 2 - armW / 2), 0.39, 0, 0.06));
  // back
  g.add(box(len - 2 * armW, 0.42, 0.22, M.sofa, 0, 0.53, -depth / 2 + 0.11, 0.06));
  // seat cushions
  const inner = len - 2 * armW, cw = inner / seats;
  for (let i = 0; i < seats; i++) {
    const x = -inner / 2 + cw * (i + 0.5);
    g.add(box(cw - 0.01, 0.14, depth - 0.24, M.sofa, x, seatH - 0.03, 0.1, 0.06));
  }
  // loose back cushions (taupe)
  const nb = seats === 3 ? 2 : 2;
  const bw = inner / nb;
  for (let i = 0; i < nb; i++) {
    const c = box(bw - 0.04, 0.4, 0.16, M.sofaCushion, -inner / 2 + bw * (i + 0.5), 0.66, -depth / 2 + 0.28, 0.07);
    c.rotation.x = -0.18;
    g.add(c);
  }
  return g;
}

function armchair(M) {
  const g = new THREE.Group();
  const w = 0.78, d = 0.82;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(cyl(0.018, 0.014, 0.1, M.walnut, sx * (w / 2 - 0.06), 0.05, sz * (d / 2 - 0.06)));
  g.add(box(w, 0.26, d, M.armchair, 0, 0.23, 0, 0.04));
  for (const s of [-1, 1]) g.add(box(0.14, 0.32, d, M.armchair, s * (w / 2 - 0.07), 0.52, 0, 0.05));
  g.add(box(w, 0.5, 0.16, M.armchair, 0, 0.6, -d / 2 + 0.08, 0.05));
  g.add(box(w - 0.28, 0.12, d - 0.2, M.armchair, 0, 0.42, 0.06, 0.05));
  const pillow = box(0.42, 0.34, 0.12, M.sofaCushion, 0, 0.66, -d / 2 + 0.24, 0.06);
  pillow.rotation.x = -0.2;
  g.add(pillow);
  return g;
}

function diningChair(M, w = 0.5) {
  // upholstered parsons chair, faces +z (back at -z)
  const g = new THREE.Group();
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.035, 0.46, 0.035, M.walnut, sx * (w / 2 - 0.04), 0.23, sz * 0.2));
  g.add(box(w, 0.1, 0.48, M.chairFab, 0, 0.5, 0, 0.03));
  g.add(box(w, 0.5, 0.08, M.chairFab, 0, 0.8, -0.22, 0.03));
  return g;
}

function diningTable(M, L = 1.4, Wd = 0.85) {
  const g = new THREE.Group();
  const H = 0.76;
  g.add(box(Wd, 0.035, L, M.lacquer, 0, H - 0.018, 0, 0.01));
  g.add(box(Wd - 0.02, 0.05, L - 0.02, M.walnut, 0, H - 0.06, 0)); // wood apron
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.add(box(0.06, H - 0.06, 0.06, M.lacquer, sx * (Wd / 2 - 0.04), (H - 0.06) / 2, sz * (L / 2 - 0.04)));
  // runner + bowl
  g.add(box(0.32, 0.004, L * 0.9, M.white, 0, H + 0.002, 0));
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), M.brushed);
  bowl.material = M.brushed.clone(); bowl.material.side = THREE.DoubleSide;
  bowl.scale.y = 0.45; bowl.position.set(0, H + 0.08, -0.12);
  g.add(bowl);
  g.add(cyl(0.035, 0.03, 0.12, M.white, 0.1, H + 0.06, L / 2 - 0.15));
  return g;
}

function sideboard(M, L = 2.2) {
  // door | 3 drawers | door, white lacquer, dark-wood strip under the top, dark plinth
  const g = new THREE.Group();
  const H = 0.55, D = 0.45, doorW = 0.65;
  g.add(box(L - 0.06, 0.06, D - 0.04, M.black, 0, 0.03, 0));
  g.add(box(L, H - 0.06, D, M.lacquer, 0, 0.06 + (H - 0.06) / 2, 0, 0.01));
  g.add(box(L + 0.01, 0.03, D + 0.01, M.walnut, 0, H + 0.015, 0));
  g.add(box(L, 0.012, D, M.lacquer, 0, H + 0.036, 0));
  const fz = D / 2 + 0.002, midY = 0.06 + (H - 0.06) / 2;
  for (const x of [-L / 2 + doorW, L / 2 - doorW]) g.add(box(0.006, H - 0.08, 0.004, M.black, x, midY, fz));
  const dw = L - 2 * doorW;
  for (const y of [0.22, 0.38]) g.add(box(dw, 0.005, 0.004, M.black, 0, y, fz));
  for (const y of [0.15, 0.3, 0.46]) g.add(box(0.1, 0.012, 0.015, M.brushed, 0, y, fz + 0.008));
  for (const x of [-L / 2 + doorW - 0.05, L / 2 - doorW + 0.05]) g.add(box(0.012, 0.08, 0.015, M.brushed, x, 0.42, fz + 0.008));
  return g;
}

function tv(M, w = 1.23, h = 0.71) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.04, M.black, 0, 0.12 + h / 2, 0, 0.01));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.03, h - 0.03), M.screen);
  scr.position.set(0, 0.12 + h / 2, 0.021);
  g.add(scr);
  g.add(box(0.06, 0.1, 0.04, M.black, 0, 0.06, -0.02));
  g.add(box(0.3, 0.015, 0.2, M.black, 0, 0.008, 0));
  return g;
}

function coffeeTable(M) {
  const g = new THREE.Group();
  const L = 1.2, W = 0.6, H = 0.42;
  g.add(box(W, 0.05, L, M.lacquer, 0, H - 0.025, 0, 0.01));
  g.add(box(W - 0.06, 0.03, L - 0.06, M.lacquer, 0, 0.12, 0, 0.005));
  for (const sz of [-1, 1]) g.add(box(W, H - 0.05, 0.05, M.lacquer, 0, (H - 0.05) / 2, sz * (L / 2 - 0.025), 0.005));
  // toys / bits from the video
  const purple = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 14), new THREE.MeshStandardMaterial({ color: 0x6b2fa8, roughness: 0.3 }));
  purple.scale.set(1, 0.85, 1.25); purple.position.set(0.05, H + 0.04, 0.3); g.add(purple);
  return g;
}

function displayCabinet(M) {
  const g = new THREE.Group();
  const W = 1.0, H = 1.75, D = 0.45;
  g.add(box(W, H, D, M.lacquer, 0, H / 2, 0, 0.01));
  // big black-glass door centre
  g.add(box(W - 0.16, 0.85, 0.01, M.blackGlass, 0, 1.05, D / 2 + 0.006));
  g.add(box(W - 0.16, 0.25, 0.01, M.white, 0, 0.32, D / 2 + 0.006));
  g.add(box(W - 0.06, 0.03, 0.012, M.walnut, 0, 0.55, D / 2 + 0.006));
  // decor on top
  g.add(cyl(0.05, 0.04, 0.12, new THREE.MeshStandardMaterial({ color: 0x78c043 }), -0.25, H + 0.06, 0));
  g.add(box(0.14, 0.12, 0.02, M.frame, 0.2, H + 0.06, -0.05));
  return g;
}

function floorLamp(M, shadeStyle) {
  const g = new THREE.Group();
  g.add(cyl(0.14, 0.15, 0.03, M.brushed, 0, 0.015, 0));
  g.add(cyl(0.012, 0.012, 1.6, M.brushed, 0, 0.8, 0, 12));
  if (shadeStyle === 'drum') {
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.23, 0.3, 32, 1, true), M.shade);
    sh.position.y = 1.55; g.add(sh);
  } else {
    // torchiere up-light
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.04, 0.16, 32, 1, true), M.shade);
    sh.position.y = 1.67; g.add(sh);
  }
  return g;
}

function palm(M, height = 1.75, away = null) {
  // away: optional world-space XZ direction the room lies in; fronds pointing at the walls stay upright
  // kentia-style: upright stems from the pot, arching at the top, drooping leaflets
  const g = new THREE.Group();
  g.add(cyl(0.2, 0.16, 0.36, M.pot, 0, 0.18, 0));
  const r = rand(23);
  const fronds = 13;
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < fronds; i++) {
    const a = (i / fronds) * Math.PI * 2 + r() * 0.5;
    const out = new THREE.Vector3(Math.cos(a), 0, Math.sin(a));
    const towardWall = away && out.dot(away) < 0.6;
    const lean = (0.12 + r() * 0.45) * (towardWall ? 0.25 : 1);
    const len = (height - 0.35) * (0.75 + r() * 0.35) * (towardWall ? 0.8 : 1);
    const base = new THREE.Vector3(out.x * 0.04, 0.34, out.z * 0.04);
    const dir = out.clone().multiplyScalar(Math.sin(lean)).addScaledVector(up, Math.cos(lean));
    const ctrl = base.clone().addScaledVector(dir, len * 0.75);
    const tip = ctrl.clone().addScaledVector(out, len * 0.35).add(new THREE.Vector3(0, -len * 0.2, 0));
    const curve = new THREE.QuadraticBezierCurve3(base, ctrl, tip);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 12, 0.006, 4), M.leaf));
    for (let t = 0.42; t < 1.0; t += 0.035) {
      const p = curve.getPoint(t), tan = curve.getTangent(t);
      const side = new THREE.Vector3().crossVectors(tan, up).normalize();
      for (const s of [-1, 1]) {
        const ll = 0.3 * Math.sin(Math.PI * Math.min(1, (t - 0.38) / 0.66)) + 0.05;
        const geo = new THREE.PlaneGeometry(ll, 0.024);
        geo.translate(ll / 2, 0, 0);
        const leaf = new THREE.Mesh(geo, M.leaf);
        leaf.position.copy(p);
        const tipDir = side.clone().multiplyScalar(s * 0.75).addScaledVector(tan, 0.35).add(new THREE.Vector3(0, -0.75, 0)).normalize();
        leaf.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), tipDir);
        leaf.castShadow = true;
        g.add(leaf);
      }
    }
  }
  return g;
}

function smallPlant(M, scale = 1) {
  const g = new THREE.Group();
  g.add(cyl(0.07, 0.06, 0.1, M.pot, 0, 0.05, 0));
  const r = rand(41);
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.04 + r() * 0.03, 8, 6), M.leaf);
    s.position.set((r() - 0.5) * 0.22, 0.15 + r() * 0.2, (r() - 0.5) * 0.22);
    s.scale.y = 0.5;
    g.add(s);
  }
  g.scale.setScalar(scale);
  return g;
}

function orchidStand(M) {
  const g = new THREE.Group();
  g.add(cyl(0.16, 0.16, 0.02, M.white, 0, 0.62, 0));
  g.add(cyl(0.015, 0.015, 0.62, M.white, 0, 0.31, 0, 8));
  g.add(cyl(0.12, 0.13, 0.02, M.white, 0, 0.01, 0));
  for (const [x, z] of [[-0.06, 0.02], [0.06, -0.03]]) {
    g.add(cyl(0.05, 0.04, 0.09, M.black, x, 0.68, z));
    for (let i = 0; i < 4; i++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 6), M.leaf);
      lf.scale.set(1, 0.15, 0.4); lf.rotation.y = i * 1.4; lf.position.set(x, 0.74, z);
      g.add(lf);
    }
    g.add(cyl(0.004, 0.004, 0.45, M.leaf, x, 0.95, z, 5));
  }
  return g;
}

function purifier(M) {
  const g = new THREE.Group();
  g.add(cyl(0.13, 0.13, 0.42, M.white, 0, 0.21, 0, 32));
  g.add(cyl(0.11, 0.11, 0.01, M.black, 0, 0.425, 0, 32));
  return g;
}

function chandelier(M) {
  const g = new THREE.Group();
  g.add(cyl(0.11, 0.11, 0.03, M.brushed, 0, -0.015, 0));
  g.add(cyl(0.02, 0.02, 0.12, M.chrome, 0, -0.08, 0));
  const hub = new THREE.Vector3(0, -0.14, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const R = 0.32 + (i % 2) * 0.06;
    const end = new THREE.Vector3(Math.cos(a) * R, -0.2 - (i % 2) * 0.06, Math.sin(a) * R);
    const ctrl = new THREE.Vector3(Math.cos(a + 0.6) * R * 0.8, -0.05, Math.sin(a + 0.6) * R * 0.8);
    const curve = new THREE.QuadraticBezierCurve3(hub, ctrl, end);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.008, 6), M.chrome));
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 20, 1, true), M.chrome);
    shade.position.copy(end).add(new THREE.Vector3(0, -0.06, 0));
    g.add(shade);
    const bulb = new THREE.Mesh(new THREE.CircleGeometry(0.04, 16), new THREE.MeshBasicMaterial({ color: 0xfff4dd }));
    bulb.rotation.x = Math.PI / 2; bulb.position.copy(shade.position).add(new THREE.Vector3(0, -0.06, 0));
    g.add(bulb);
  }
  return g;
}

function framedPrint(M, w, h, tex) {
  const g = new THREE.Group();
  g.add(box(w, h, 0.03, M.frame, 0, 0, 0.015));
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.01, h - 0.01), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
  art.position.z = 0.031;
  g.add(art);
  return g;
}

// Curtain: pleated sheer, local plane in XY, hangs from y=height down to y=0
function curtain(M, width, height) {
  const seg = Math.round(width * 60);
  const geo = new THREE.PlaneGeometry(width, height, seg, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i);
    const t = (y + height / 2) / height; // 0 bottom .. 1 top
    p.setZ(i, Math.sin(x * 28) * 0.035 * (0.7 + 0.3 * t) + Math.sin(x * 7.3) * 0.02);
  }
  geo.computeVertexNormals();
  geo.translate(0, height / 2, 0);
  const m = new THREE.Mesh(geo, M.curtain);
  m.renderOrder = 2;
  return m;
}

function frenchDoorLeaf(M, w, h) {
  // hinge at local x=0, leaf extends to +x
  const g = new THREE.Group();
  const stile = 0.09, rail = 0.1;
  g.add(box(stile, h, 0.04, M.doorWood, stile / 2, h / 2, 0));
  g.add(box(stile, h, 0.04, M.doorWood, w - stile / 2, h / 2, 0));
  g.add(box(w, rail * 1.6, 0.04, M.doorWood, w / 2, rail * 0.8, 0));
  g.add(box(w, rail, 0.04, M.doorWood, w / 2, h - rail / 2, 0));
  // glazing bars: 2 columns × 4 rows of panes
  const innerW = w - 2 * stile, innerH = h - rail - rail * 1.6, y0 = rail * 1.6;
  g.add(box(0.035, innerH, 0.035, M.doorWood, w / 2, y0 + innerH / 2, 0));
  for (let k = 1; k < 4; k++) g.add(box(innerW, 0.035, 0.035, M.doorWood, w / 2, y0 + (innerH * k) / 4, 0));
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(innerW, innerH), M.frostGlass);
  glass.position.set(w / 2, y0 + innerH / 2, 0);
  g.add(glass);
  // handle
  g.add(box(0.11, 0.015, 0.015, M.chrome, w - 0.1, 1.0, 0.04));
  g.add(box(0.11, 0.015, 0.015, M.chrome, w - 0.1, 1.0, -0.04));
  return g;
}

// ---------------------------------------------------------------- room shell

// A wall is built in its own local frame: runs along +x from 0..len, inner face at z=0 facing +z.
// openings: [{x0, x1, y0, y1}] cut out of the wall.
function wallSlab(len, H, thick, mat, openings = []) {
  const g = new THREE.Group();
  const cuts = [...openings].sort((a, b) => a.x0 - b.x0);
  let x = 0;
  const add = (x0, x1, y0, y1) => {
    if (x1 - x0 < 1e-3 || y1 - y0 < 1e-3) return;
    g.add(box(x1 - x0, y1 - y0, thick, mat, (x0 + x1) / 2, (y0 + y1) / 2, -thick / 2));
  };
  for (const o of cuts) {
    add(x, o.x0, 0, H);
    add(o.x0, o.x1, 0, o.y0);
    add(o.x0, o.x1, o.y1, H);
    x = o.x1;
  }
  add(x, len, 0, H);
  return g;
}

// Place a local wall group so its local frame (x along wall, +z inward) maps onto the room.
function placeWall(group, side) {
  const { W, D } = ROOM;
  switch (side) {
    case 'N': group.position.set(-W / 2, 0, -D / 2); group.rotation.y = 0; break;           // x: -W/2 → W/2
    case 'E': group.position.set(W / 2, 0, -D / 2); group.rotation.y = -Math.PI / 2; break; // runs along +z
    case 'S': group.position.set(W / 2, 0, D / 2); group.rotation.y = Math.PI; break;       // runs along -x
    case 'W': group.position.set(-W / 2, 0, D / 2); group.rotation.y = Math.PI / 2; break;  // runs along -z
  }
  return group;
}

// ---------------------------------------------------------------- build

export function buildSalon() {
  const { W, D, H } = ROOM;
  const halfW = W / 2, halfD = D / 2;
  const M = makeMaterials();
  const root = new THREE.Group();
  root.name = 'salon';
  const walls = {};
  const overhead = []; // hidden when looking down from above the ceiling
  const T = 0.2;       // wall thickness
  const BEAM_Y = 2.4, BEAM_P = 0.15; // dropped beams on N and E walls: underside height, projection
  const COL = { w: 0.4, p: 0.18 };   // beige column at the NE corner (on the E wall)

  // world → wall-local x helpers
  const nx = (x) => x + halfW;  // N wall runs west → east
  const sx = (x) => halfW - x;  // S wall runs east → west

  // ---- openings (world coords, converted to wall-local)
  const DOOR = { x0: -halfW + 0.5, x1: -halfW + 1.8, top: 2.2 };      // double doors, N wall
  const BALC = { x0: halfW - 1.35, x1: halfW - 0.15, top: 2.3 };      // full-height section, S wall
  const PIER = { x0: halfW - 1.8, x1: halfW - 1.4, p: 0.25 };         // mauve pier, S wall
  const WIN = { x0: halfW - 3.95, x1: halfW - 2.05, y0: 0.88, y1: 2.22 };    // window, S wall

  const spec = {
    N: { len: W, mat: M.beige, open: [{ x0: nx(DOOR.x0), x1: nx(DOOR.x1), y0: 0, y1: DOOR.top }] },
    E: { len: D, mat: M.mauve, open: [] },
    S: { len: W, mat: M.beige, open: [
      { x0: sx(BALC.x1), x1: sx(BALC.x0), y0: 0, y1: BALC.top },
      { x0: sx(WIN.x1), x1: sx(WIN.x0), y0: WIN.y0, y1: WIN.y1 },
    ] },
    W: { len: D, mat: M.beige, open: [] },
  };

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), M.floor);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; floor.name = 'floor';
  M.floor.map.repeat.set(W / 1.6, D / 1.6);
  root.add(floor);

  // Ceiling
  const ceiling = box(W + 0.4, 0.1, D + 0.4, M.ceiling, 0, H + 0.05, 0);
  ceiling.name = 'ceiling';
  root.add(ceiling);
  overhead.push(ceiling);

  for (const side of ['N', 'E', 'S', 'W']) {
    const s = spec[side];
    const g = new THREE.Group();
    g.name = 'wall-' + side;
    g.add(wallSlab(s.len + 2 * T, H + 0.01, T, s.mat, s.open.map((o) => ({ ...o, x0: o.x0 + T, x1: o.x1 + T }))).translateX(-T));
    // skirting, broken at floor-level openings
    let x = 0;
    const segs = [];
    for (const o of [...s.open].sort((a, b) => a.x0 - b.x0).filter((o) => o.y0 === 0)) { segs.push([x, o.x0]); x = o.x1; }
    segs.push([x, s.len]);
    for (const [a, b] of segs) if (b - a > 0.01) g.add(box(b - a, 0.07, 0.012, M.molding, (a + b) / 2, 0.035, 0.006));
    // crown molding (sits on the beam face where there is a beam)
    const onBeam = side === 'N' || side === 'E';
    const cm = crownMolding(s.len, M.molding);
    cm.position.set(0, H, onBeam ? BEAM_P : 0);
    g.add(cm);
    if (onBeam) g.add(box(s.len, H - BEAM_Y, BEAM_P, s.mat, s.len / 2, (H + BEAM_Y) / 2, BEAM_P / 2));
    walls[side] = placeWall(g, side);
    root.add(g);
  }

  // ---- NE beige column (on the E wall, north end); the TV wall and its beam stop against it
  walls.E.add(box(COL.w, H, COL.p, M.beige, COL.w / 2, H / 2, COL.p / 2));
  walls.E.add(crownMolding(COL.w, M.molding).translateY(H).translateZ(COL.p));

  // ---- door: casing + leaves + hall
  {
    const g = walls.N;
    const x0 = nx(DOOR.x0), x1 = nx(DOOR.x1), y1 = DOOR.top;
    g.add(box(0.07, y1 + 0.07, 0.025, M.molding, x0 - 0.035, (y1 + 0.07) / 2, 0.012));
    g.add(box(0.07, y1 + 0.07, 0.025, M.molding, x1 + 0.035, (y1 + 0.07) / 2, 0.012));
    g.add(box(x1 - x0 + 0.14, 0.07, 0.025, M.molding, (x0 + x1) / 2, y1 + 0.035, 0.012));
    g.add(box(x1 - x0, 0.02, T, M.white, (x0 + x1) / 2, y1, -T / 2));
    g.add(box(x1 - x0, 0.02, T, new THREE.MeshStandardMaterial({ color: 0xe6e3dc, roughness: 0.4 }), (x0 + x1) / 2, 0.01, -T / 2)); // marble threshold

    const leafW = (DOOR.x1 - DOOR.x0) / 2 - 0.01, leafH = DOOR.top - 0.03;
    const west = frenchDoorLeaf(M, leafW, leafH);   // closed: points +x
    west.position.set(DOOR.x0 + 0.01, 0.01, -halfD + 0.03);
    west.rotation.y = -1.5;                          // swung into the room, stops before the cabinet
    west.name = 'door-leaf-west';
    const east = frenchDoorLeaf(M, leafW, leafH);   // closed: points -x
    east.position.set(DOOR.x1 - 0.01, 0.01, -halfD + 0.03);
    east.rotation.y = Math.PI + 1.45;                // swung into the room beside the armchair
    east.name = 'door-leaf-east';
    root.add(west, east);

    // hall stub north of the doorway, black front door at the far end
    const hall = new THREE.Group();
    hall.name = 'hall';
    const hx0 = DOOR.x0 - 0.2, hx1 = DOOR.x1 + 0.35, hz1 = -halfD - T, hz0 = hz1 - 2.0;
    const hf = new THREE.Mesh(new THREE.PlaneGeometry(hx1 - hx0, hz1 - hz0), M.tile);
    hf.rotation.x = -Math.PI / 2; hf.position.set((hx0 + hx1) / 2, 0.02, (hz0 + hz1) / 2); hf.receiveShadow = true;
    hall.add(hf);
    hall.add(box(0.1, H, hz1 - hz0, M.beige, hx0 - 0.05, H / 2, (hz0 + hz1) / 2));
    hall.add(box(0.1, H, hz1 - hz0, M.white, hx1 + 0.05, H / 2, (hz0 + hz1) / 2));
    hall.add(box(hx1 - hx0 + 0.2, H, 0.1, M.beige, (hx0 + hx1) / 2, H / 2, hz0 - 0.05));
    const hc = box(hx1 - hx0 + 0.2, 0.05, hz1 - hz0, M.ceiling, (hx0 + hx1) / 2, H + 0.025, (hz0 + hz1) / 2);
    hall.add(hc); overhead.push(hc);
    const fdx = (hx0 + hx1) / 2 - 0.1;
    hall.add(box(0.95, 2.05, 0.06, M.frontDoor, fdx, 1.045, hz0 + 0.03));
    hall.add(box(0.14, 0.03, 0.03, M.chrome, fdx + 0.32, 1.0, hz0 + 0.08));
    hall.add(box(0.05, 0.6, 0.6, M.white, hx1 - 0.03, 0.45, hz0 + 0.7)); // radiator on the right
    const hl = new THREE.PointLight(0xfff0dd, 1.0, 4, 2);
    hl.position.set((hx0 + hx1) / 2, H - 0.3, (hz0 + hz1) / 2);
    hall.add(hl);
    root.add(hall);
  }

  // ---- south wall: balcony section, mauve pier, window, two curtain runs, view outside
  {
    const g = walls.S;
    const fw = 0.06;
    const frame = (w, h, x, y) => g.add(box(w, h, 0.07, M.white, x, y, -T / 2));
    // balcony door + fixed pane
    {
      const x0 = sx(BALC.x1), x1 = sx(BALC.x0), y1 = BALC.top;
      frame(x1 - x0, fw, (x0 + x1) / 2, y1 - fw / 2);
      frame(fw, y1, x0 + fw / 2, y1 / 2);
      frame(fw, y1, x1 - fw / 2, y1 / 2);
      frame(fw, y1, (x0 + x1) / 2, y1 / 2);
      frame(x1 - x0, 0.5, (x0 + x1) / 2, 0.25); // lower opaque panel
    }
    // window: 3 lights
    {
      const x0 = sx(WIN.x1), x1 = sx(WIN.x0), y0 = WIN.y0, y1 = WIN.y1;
      frame(x1 - x0, fw, (x0 + x1) / 2, y0 + fw / 2);
      frame(x1 - x0, fw, (x0 + x1) / 2, y1 - fw / 2);
      frame(fw, y1 - y0, x0 + fw / 2, (y0 + y1) / 2);
      frame(fw, y1 - y0, x1 - fw / 2, (y0 + y1) / 2);
      frame(fw, y1 - y0, x0 + (x1 - x0) * 0.36, (y0 + y1) / 2);
      frame(fw, y1 - y0, x0 + (x1 - x0) * 0.72, (y0 + y1) / 2);
      g.add(box(x1 - x0 + 0.1, 0.03, 0.26, M.white, (x0 + x1) / 2, y0 - 0.015, -T / 2 + 0.03));
    }
    // mauve pier between the two sections
    {
      const x0 = sx(PIER.x1), x1 = sx(PIER.x0);
      g.add(box(x1 - x0, H, PIER.p, M.mauve, (x0 + x1) / 2, H / 2, PIER.p / 2));
      g.add(crownMolding(x1 - x0, M.molding).translateX(x0).translateY(H).translateZ(PIER.p));
    }
    const view = new THREE.Mesh(new THREE.PlaneGeometry(W + 3, 3.4), new THREE.MeshBasicMaterial({ map: windowViewTexture(), toneMapped: false }));
    view.position.set(W / 2, 1.5, -T - 1.4);
    g.add(view);
    overhead.push(view);
    // curtain runs: balcony (corner → pier) and window (pier → past the window)
    const runs = [[0.02, sx(PIER.x1) - 0.01], [sx(PIER.x0) + 0.01, sx(WIN.x0) + 0.3]];
    for (const [a, b] of runs) {
      const zc = a < 0.1 ? 0.12 : 0.1;
      const c = curtain(M, b - a, H - 0.15);
      c.position.set((a + b) / 2, 0, zc);
      g.add(c);
    }
  }

  // ---- furniture ------------------------------------------------------------
  const put = (name, obj, x, z, ry = 0, y = 0) => { obj.name = name; obj.position.set(x, y, z); obj.rotation.y = ry; root.add(obj); return obj; };

  // rug + coffee table (long side parallel to the TV wall)
  const rug = new THREE.Mesh(new RoundedBoxGeometry(3.0, 0.012, 2.4, 2, 0.005), M.rug);
  rug.position.set(-0.55, 0.006, 0.3); rug.receiveShadow = true; rug.name = 'rug';
  root.add(rug);
  put('coffee-table', coffeeTable(M), -0.05, -0.1); // long side parallel to the mauve wall, in front of the dining set

  // North: doors (above), armchair, sideboard + TV, torchiere
  put('armchair-N', armchair(M), DOOR.x1 + 0.47, -halfD + 0.47);
  // TV unit: sideboard + TV + decor, set at a slight angle — the west end touches the wall,
  // the east end is pulled out into the room (sideboard edge vs. crown line in frame h_001)
  const sbL = 1.95, sbAngle = 0.1; // ≈ 6°
  const tvUnit = put('tv-unit', new THREE.Group(), DOOR.x1 + 0.9, -halfD + 0.02, -sbAngle);
  const onUnit = (name, obj, x, z, y = 0) => { obj.name = name; obj.position.set(x, y, z); tvUnit.add(obj); return obj; };
  onUnit('sideboard', sideboard(M, sbL), sbL / 2, 0.22);
  onUnit('tv', tv(M, 0.91, 0.53), sbL / 2 + 0.05, 0.18, 0.6);
  onUnit('plant-sideboard', smallPlant(M, 1.3), 0.3, 0.22, 0.6);
  onUnit('vase-sb1', cyl(0.04, 0.05, 0.18, M.white), sbL - 0.45, 0.18, 0.69);
  onUnit('frame-sb', box(0.16, 0.12, 0.04, M.white), sbL - 0.25, 0.16, 0.66);
  put('lamp-torch', floorLamp(M, 'torch'), halfW - COL.p - 0.1, -halfD + 0.18);
  // small wall ornaments above the armchair
  for (const [dx, y] of [[-0.15, 1.62], [0.05, 1.5]]) put('ornament', cyl(0.03, 0.03, 0.04, M.brushed).rotateX(Math.PI / 2), DOOR.x1 + 0.4 + dx, -halfD + 0.02, 0, y);

  // East: dining — 1.4 × 0.85 table parallel to the mauve wall, six chairs: two per long side
  // (seats tucked ~10 cm under the top) and one at each end. The north end chair stands right in
  // front of the sideboard's east end, the south end chair beside the palm (frames h_004, h_045).
  const tL = 1.4, tW = 0.85;
  const tX = halfW - 0.15 - tW / 2, tZ = 0.05; // east edge 15 cm off the mauve wall, south end chair near the palm
  put('dining-table', diningTable(M, tL, tW), tX, tZ);
  const sideOff = tW / 2 + 0.24 - 0.1, endOff = tL / 2 + 0.24 - 0.08;
  for (const dz of [-0.3, 0.3]) {
    put('chair-w', diningChair(M), tX - sideOff, tZ + dz, Math.PI / 2);
    put('chair-e', diningChair(M), tX + tW / 2 - 0.17, tZ + dz, -Math.PI / 2); // pushed fully in, back against the table edge
  }
  put('chair-n', diningChair(M), tX, tZ - endOff, 0);
  put('chair-s', diningChair(M), tX, tZ + endOff, Math.PI);
  put('print-deer', framedPrint(M, 0.55, 0.55, deerPrint()), halfW, tZ + 0.12, -Math.PI / 2, 1.62);
  put('palm', palm(M, 2.35, new THREE.Vector3(-1, 0, -1).normalize()), halfW - 0.32, halfD - 0.35); // in the SE corner
  put('armchair-SE', armchair(M), halfW - 1.45, halfD - 0.55, Math.PI + 0.55);

  // South: 3-seat sofa under the window, west corner group
  put('sofa-3', sofa(M, 3, 2.1), (WIN.x0 + WIN.x1) / 2 - 0.05, halfD - 0.48, Math.PI);
  put('lamp-drum', floorLamp(M, 'drum'), -halfW + 0.75, halfD - 0.38);
  put('orchids', orchidStand(M), -halfW + 0.3, halfD - 0.28);
  put('purifier', purifier(M), -halfW + 0.24, halfD - 0.62);

  // West: 2-seat sofa, print, vase, display cabinet (NW corner, beside the door)
  put('sofa-2', sofa(M, 2, 1.8), -halfW + 0.47, 0.3, Math.PI / 2);
  put('print-flower', framedPrint(M, 0.72, 0.58, flowerPrint()), -halfW, 0.3, Math.PI / 2, 1.55);
  {
    const vase = new THREE.Group();
    vase.add(cyl(0.07, 0.09, 0.55, M.black, 0, 0.275, 0));
    for (let i = 0; i < 6; i++) { const st = cyl(0.004, 0.004, 0.7, M.white, (i - 2.5) * 0.015, 0.85, 0, 5); st.rotation.z = (i - 2.5) * 0.05; vase.add(st); }
    put('vase-tall', vase, -halfW + 0.14, -0.8);
  }
  put('cabinet', displayCabinet(M), -halfW + 0.23, -halfD + 0.52, Math.PI / 2);

  // ceiling light
  put('chandelier', chandelier(M), -0.2, 0.0, 0, H);

  return { group: root, walls, ceiling, overhead, materials: M };
}
