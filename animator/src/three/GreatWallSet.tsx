import React, { useMemo } from "react";
import * as THREE from "three";
import { CameraRig, CameraShot } from "../engine/stage";
import { canvasTexture, Halo } from "./kit";
import { Haze } from "./LakeSet";
import { InkBox, toonRamp } from "./toon";
import type { PuppetLight } from "../puppet/PuppetBillboard";

// The Great Wall on a mountain crest at golden hour, built from photo references (guide/references/great-wall.md).
// The walkway (x ±1.8, floor y = 0) runs away from the camera along -z between a tall crenellated outer parapet
// (left, merlons with loopholes) and a low inner parapet (right). From z = WALL.stairs it bends right and climbs in
// steps to a watchtower with an arched doorway and a tiled pavilion on top. Below both parapets green slopes drop away; beyond,
// mountain ranges fade into haze with the wall snaking along every crest, a tower on each peak (parallax layers).
// Puppets walk on the flat part (z between WALL.stairs and 4.5). Light them with `wallLight()`.

export const WALL = { half: 1.8, stairs: -4.6, near: 4.6 };
const STEP = { rise: 0.17, depth: 0.36, count: 8 };
const TOP = STEP.rise * STEP.count; // platform height in front of the tower
const STAIR_END = WALL.stairs - STEP.depth * STEP.count;
const TOWER_Z = STAIR_END - 1.2 - 2.0; // tower centre (2 m deep half)
const VALLEY_Y = -8;
const TURN = -0.5; // the climb to the tower bends this far right (radians)

// The low sun behind and to the right: warm side light and a rim on the edges facing it.
export const wallLight = (): PuppetLight => ({
  tint: "#ffe8c8",
  shadow: 0.15,
  distant: [{ direction: [0.65, 0.45, -0.6], color: "#ffc878", strength: 1.4 }],
});

const rand = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// ---------- textures ----------

const brickCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#c8b8a0";
    ctx.fillRect(0, 0, 256, 256);
    for (let r = 0; r < 16; r++) {
      const off = r % 2 ? 24 : 0;
      for (let c = -1; c < 6; c++) {
        const v = rand(r * 13 + c);
        ctx.fillStyle = v > 0.66 ? "#a08c74" : v > 0.33 ? "#94806a" : "#9a8670";
        ctx.fillRect(c * 48 + off + 2, r * 16 + 2, 44, 12);
      }
    }
    ctx.fillStyle = "rgba(60,50,40,0.25)";
    for (let i = 0; i < 40; i++) ctx.fillRect(rand(i + 300) * 256, rand(i + 400) * 256, 3 + rand(i) * 8, 2);
  });

const slabCanvas = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#8a8274";
    ctx.fillRect(0, 0, 256, 256);
    let y = 0;
    let r = 0;
    while (y < 256) {
      const h = 38 + rand(r) * 30;
      let x = -rand(r + 9) * 40;
      let c = 0;
      while (x < 256) {
        const w = 50 + rand(r * 7 + c) * 50;
        const v = rand(r * 31 + c * 3);
        ctx.fillStyle = v > 0.6 ? "#b8b0a0" : v > 0.3 ? "#aca494" : "#b2aa9a";
        ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
        x += w;
        c++;
      }
      y += h;
      r++;
    }
  });

// A shared brick or slab texture repeated to suit a surface `w` x `h` metres.
const tiled = (base: THREE.Texture, w: number, h: number, size = 1.6) => {
  const t = base.clone();
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(Math.max(1, w / size), Math.max(1, h / size));
  t.needsUpdate = true;
  return t;
};

const archCanvas = (glow: boolean) =>
  canvasTexture(128, 192, (ctx) => {
    ctx.clearRect(0, 0, 128, 192);
    ctx.fillStyle = "#c8b8a0";
    ctx.beginPath();
    ctx.moveTo(4, 192);
    ctx.lineTo(4, 64);
    ctx.arc(64, 64, 60, Math.PI, 0);
    ctx.lineTo(124, 192);
    ctx.fill();
    ctx.fillStyle = "#2a241e";
    ctx.beginPath();
    ctx.moveTo(16, 192);
    ctx.lineTo(16, 66);
    ctx.arc(64, 66, 48, Math.PI, 0);
    ctx.lineTo(112, 192);
    ctx.fill();
    if (glow) {
      // Daylight at the far end of the passage
      ctx.fillStyle = "#ffe0a8";
      ctx.beginPath();
      ctx.moveTo(44, 192);
      ctx.lineTo(44, 110);
      ctx.arc(64, 110, 20, Math.PI, 0);
      ctx.lineTo(84, 192);
      ctx.fill();
    }
  });

const skyCanvas = () =>
  canvasTexture(1024, 512, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, "#3f6fb8");
    g.addColorStop(0.45, "#8fbbe6");
    g.addColorStop(0.75, "#d8e4ee");
    g.addColorStop(1, "#ffd8a0");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);
    // Flat-bottomed cel clouds: white tops, a warm shaded underside
    for (const [x, y, s] of [
      [200, 170, 1.0],
      [620, 110, 0.8],
      [470, 250, 1.3],
      [880, 290, 0.75],
      [80, 300, 0.6],
    ] as const) {
      ctx.fillStyle = "#f2c8a8";
      ctx.beginPath();
      ctx.ellipse(x, y + 10 * s, 70 * s, 16 * s, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      for (const [dx, dy, r] of [
        [-40, 0, 24],
        [-10, -14, 32],
        [26, -6, 26],
        [52, 2, 18],
      ])
        ctx.beginPath(), ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2), ctx.fill();
      ctx.fillRect(x - 64 * s, y - 4 * s, 128 * s, 12 * s);
    }
  });

// ---------- walkway ----------

// Tall outer parapet along x = -half: a base wall with square merlons, each pierced by a loophole.
const OuterParapet: React.FC<{ brick: THREE.Texture; part: "flat" | "stairs" }> = ({ brick, part }) => {
  const len = WALL.near - WALL.stairs;
  const zc = (WALL.near + WALL.stairs) / 2;
  const x = -WALL.half - 0.2;
  const merlons = Math.floor(len / 0.78);
  const stairLen = STEP.depth * STEP.count;
  const slope = Math.atan2(TOP, stairLen);
  const tex = useMemo(() => tiled(brick, len, 1, 1.4), [brick]);
  if (part === "flat")
    return (
      <group>
        <InkBox size={[0.4, 1.0, len]} position={[x, 0.5, zc]} color="#ffffff" map={tex} />
        {Array.from({ length: merlons }, (_, i) => {
        const z = WALL.near - 0.4 - i * 0.78;
        return (
          <group key={i} position={[x, 1.27, z]}>
            <InkBox size={[0.4, 0.54, 0.46]} color="#ffffff" map={tex} />
            <mesh position={[0.205, -0.02, 0]} rotation={[0, Math.PI / 2, 0]}>
              <planeGeometry args={[0.11, 0.13]} />
              <meshBasicMaterial color="#2a241e" />
            </mesh>
          </group>
        );
      })}
      </group>
    );
  return (
    <group>
      {/* Up the stairs: a sloped wall with stepped merlons */}
      <group position={[x, TOP / 2 + 0.5, WALL.stairs - stairLen / 2]} rotation={[slope, 0, 0]}>
        <InkBox size={[0.4, 1.0, Math.hypot(stairLen, TOP) + 0.1]} color="#ffffff" map={tex} />
      </group>
      {Array.from({ length: 4 }, (_, i) => {
        const t = (i + 0.5) / 4;
        return <InkBox key={`s${i}`} size={[0.4, 0.54, 0.46]} position={[x, 1.27 + TOP * t, WALL.stairs - stairLen * t]} color="#ffffff" map={tex} />;
      })}
    </group>
  );
};

// Low inner parapet along x = +half with a flat coping, and tufts of grass at its foot.
const InnerParapet: React.FC<{ brick: THREE.Texture; frame: number; part: "flat" | "stairs" }> = ({ brick, frame, part }) => {
  const len = WALL.near - WALL.stairs;
  const zc = (WALL.near + WALL.stairs) / 2;
  const x = WALL.half + 0.17;
  const stairLen = STEP.depth * STEP.count;
  const slope = Math.atan2(TOP, stairLen);
  const tex = useMemo(() => tiled(brick, len, 0.8, 1.4), [brick]);
  if (part === "stairs")
    return (
      <group position={[x, TOP / 2 + 0.4, WALL.stairs - stairLen / 2]} rotation={[slope, 0, 0]}>
        <InkBox size={[0.34, 0.8, Math.hypot(stairLen, TOP) + 0.1]} color="#ffffff" map={tex} />
      </group>
    );
  return (
    <group>
      <InkBox size={[0.34, 0.75, len]} position={[x, 0.375, zc]} color="#ffffff" map={tex} />
      <InkBox size={[0.44, 0.08, len]} position={[x, 0.79, zc]} color="#a8a090" />
      {Array.from({ length: 10 }, (_, i) => {
        const side = i % 2 ? 1 : -1;
        const z = WALL.near - 0.6 - rand(i + 5) * (len - 1);
        return (
          <group key={i} position={[side * (WALL.half - 0.06), 0, z]} rotation={[0, 0, Math.sin(frame * 0.08 + i) * 0.08]}>
            {[0, 1, 2].map((k) => (
              <InkBox key={k} size={[0.02, 0.12 + rand(i * 3 + k) * 0.1, 0.02]} position={[(k - 1) * 0.025, 0.07, (k - 1) * 0.02]} rotation={[0, 0, (k - 1) * 0.35]} color="#6f9a4a" ink={0.003} />
            ))}
          </group>
        );
      })}
    </group>
  );
};

const Stairs: React.FC<{ slab: THREE.Texture }> = ({ slab }) => {
  const tex = useMemo(() => tiled(slab, WALL.half * 2, 0.4, 1.2), [slab]);
  return (
    <group>
      {Array.from({ length: STEP.count }, (_, i) => {
        const h = STEP.rise * (i + 1);
        return <InkBox key={i} size={[WALL.half * 2, h, STEP.depth]} position={[0, h / 2, WALL.stairs - STEP.depth * (i + 0.5)]} color="#ffffff" map={tex} ink={0.008} />;
      })}
      <InkBox size={[WALL.half * 2 + 0.8, TOP, 1.2]} position={[0, TOP / 2, STAIR_END - 0.6]} color="#ffffff" map={tex} ink={0.008} />
    </group>
  );
};

// Square two-storey brick tower: arched doorway on the walkway, arched windows, crenellated top, tiled pavilion.
const Tower: React.FC<{ brick: THREE.Texture }> = ({ brick }) => {
  const tex = useMemo(() => tiled(brick, 4.6, 6.6, 1.4), [brick]);
  const door = useMemo(() => archCanvas(true), []);
  const win = useMemo(() => archCanvas(false), []);
  const front = TOWER_Z + 2.0;
  const roofY = 4.6;
  return (
    <group>
      <InkBox size={[4.6, 6.6, 4.0]} position={[0, roofY - 3.3, TOWER_Z]} color="#ffffff" map={tex} ink={0.02} />
      <mesh position={[0, TOP + 1.0, front + 0.01]}>
        <planeGeometry args={[1.3, 2.0]} />
        <meshBasicMaterial map={door} transparent />
      </mesh>
      {[-1.5, 1.5].map((x) => (
        <mesh key={x} position={[x, 3.2, front + 0.01]}>
          <planeGeometry args={[0.55, 0.85]} />
          <meshBasicMaterial map={win} transparent />
        </mesh>
      ))}
      <InkBox size={[4.7, 0.1, 4.1]} position={[0, roofY - 0.05, TOWER_Z]} color="#8a7a66" ink={0.006} />
      {/* Merlons round the top */}
      {Array.from({ length: 6 }, (_, i) => {
        const t = -2.0 + i * 0.8;
        return (
          <group key={i}>
            <InkBox size={[0.42, 0.45, 0.3]} position={[t, roofY + 0.22, front - 0.15]} color="#ffffff" map={tex} />
            <InkBox size={[0.3, 0.45, 0.42]} position={[-2.15, roofY + 0.22, TOWER_Z + t * 0.9]} color="#ffffff" map={tex} />
            <InkBox size={[0.3, 0.45, 0.42]} position={[2.15, roofY + 0.22, TOWER_Z + t * 0.9]} color="#ffffff" map={tex} />
          </group>
        );
      })}
      {/* Pavilion with a grey tiled roof and upturned eaves */}
      <InkBox size={[1.8, 1.0, 1.6]} position={[0, roofY + 0.5, TOWER_Z - 0.4]} color="#ffffff" map={tex} />
      <mesh position={[0, roofY + 0.45, TOWER_Z + 0.41]}>
        <planeGeometry args={[0.45, 0.75]} />
        <meshBasicMaterial map={win} transparent />
      </mesh>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[1.35, 0.08, 2.1]} position={[s * 0.55, roofY + 1.25, TOWER_Z - 0.4]} rotation={[0, 0, -s * 0.5]} color="#5a5a62" />
      ))}
      <InkBox size={[0.1, 0.12, 2.2]} position={[0, roofY + 1.55, TOWER_Z - 0.4]} color="#3e3e46" />
      {[-1, 1].flatMap((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.12, roofY + 1.02, TOWER_Z - 0.4 + sz * 1.02]} rotation={[sz * 0.6, 0, -sx * 0.6]}>
            <coneGeometry args={[0.06, 0.24, 6]} />
            <meshToonMaterial color="#5a5a62" gradientMap={toonRamp} />
          </mesh>
        )),
      )}
    </group>
  );
};

// The wall's own body below the walkway and the green slopes falling away on both sides, dotted with shrubs.
const Slopes: React.FC<{ brick: THREE.Texture }> = ({ brick }) => {
  const tex = useMemo(() => tiled(brick, 12, 6, 1.4), [brick]);
  const len = 22;
  return (
    <group>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.3, 6, len]} position={[s * (WALL.half + 0.45), -3.2, -3]} color="#ffffff" map={tex} ink={0} />
      ))}
      {[-1, 1].map((s) => (
        <group key={`g${s}`} position={[s * (WALL.half + 0.55), -1.4, -3]} rotation={[0, 0, s * 0.55]}>
          <mesh position={[s * 7, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[14, len]} />
            <meshToonMaterial color="#5f8a4a" gradientMap={toonRamp} />
          </mesh>
          {Array.from({ length: 70 }, (_, i) => {
            const u = 0.4 + rand(i * 3 + (s > 0 ? 1 : 0)) * 12;
            const v = (rand(i * 7 + 2) - 0.5) * len;
            const r = 0.25 + rand(i + 90) * 0.35;
            return (
              <mesh key={i} position={[s * u, r * 0.3, v]} scale={[1, 0.7, 1]}>
                <sphereGeometry args={[r, 10, 8]} />
                <meshToonMaterial color={rand(i + 7) > 0.5 ? "#2f5a2a" : "#3e6a32"} gradientMap={toonRamp} />
              </mesh>
            );
          })}
        </group>
      ))}
    </group>
  );
};

// ---------- distant ranges ----------

// A smooth mountain range `width` wide standing on the valley floor at z, with the wall riding its crest
// (a pale band) and a tower on each peak. `shift` slides it sideways for parallax.
const Range: React.FC<{ z: number; shift: number; width: number; low: number; high: number; color: string; seed: number; wall?: number }> = ({
  z,
  shift,
  width,
  low,
  high,
  color,
  seed,
  wall,
}) => {
  const { body, band, towers } = useMemo(() => {
    const n = 160;
    const crest: [number, number][] = [];
    for (let i = 0; i <= n; i++) {
      const x = -width / 2 + (width * i) / n;
      const k = x / width;
      // Rounded peaks every ~20-30 m with smaller knolls on their shoulders.
      const y =
        low +
        (high - low) *
          (0.45 +
            0.3 * Math.sin(k * 26 + seed) +
            0.18 * Math.abs(Math.sin(k * 61 + seed * 2.3)) +
            0.08 * Math.sin(k * 143 + seed * 0.7));
      crest.push([x, y]);
    }
    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -2);
    crest.forEach(([x, y]) => shape.lineTo(x, y));
    shape.lineTo(width / 2, -2);
    const bandGeo = wall
      ? (() => {
          const pos: number[] = [];
          for (let i = 0; i < n; i++) {
            const [x0, y0] = crest[i];
            const [x1, y1] = crest[i + 1];
            pos.push(x0, y0 - wall * 0.2, 0, x1, y1 - wall * 0.2, 0, x1, y1 + wall, 0, x0, y0 - wall * 0.2, 0, x1, y1 + wall, 0, x0, y0 + wall, 0);
          }
          const g = new THREE.BufferGeometry();
          g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
          return g;
        })()
      : null;
    const peaks = wall ? crest.filter((p, i) => i > 0 && i < n && p[1] > crest[i - 1][1] && p[1] >= crest[i + 1][1]) : [];
    return { body: new THREE.ShapeGeometry(shape), band: bandGeo, towers: peaks };
  }, [width, low, high, seed, wall]);
  return (
    <group position={[shift, VALLEY_Y, z]}>
      <mesh geometry={body}>
        <meshBasicMaterial color={color} fog={false} toneMapped={false} />
      </mesh>
      {band && wall && (
        <>
          <mesh geometry={band} position={[0, 0, 0.02]}>
            <meshBasicMaterial color="#d8c8b0" fog={false} toneMapped={false} side={THREE.DoubleSide} />
          </mesh>
          {towers.map(([x, y], i) => (
            <mesh key={i} position={[x, y + wall * 1.6, 0.03]}>
              <planeGeometry args={[wall * 2.6, wall * 3.2]} />
              <meshBasicMaterial color="#c8b8a0" fog={false} toneMapped={false} />
            </mesh>
          ))}
        </>
      )}
    </group>
  );
};

// Swallows wheeling across the valley.
const Birds: React.FC<{ frame: number }> = ({ frame }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: 5 }, (_, i) => {
      const t = ((frame * (0.6 + rand(i) * 0.3) + i * 40) % 300) / 300;
      const flap = Math.sin(frame * 0.6 + i * 2) * 0.5;
      return (
        <group key={i} position={[-10 + t * 20, 3 + rand(i + 3) * 2 + Math.sin(t * 9 + i) * 0.4, -14 - rand(i + 6) * 6]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.09, 0, 0]} rotation={[0, 0, s * (0.35 + flap)]}>
              <planeGeometry args={[0.2, 0.03]} />
              <meshBasicMaterial color="#2a2a33" />
            </mesh>
          ))}
        </group>
      );
    })}
  </group>
);

export const GreatWallSet: React.FC<{ camera: CameraShot; frame: number }> = ({ camera, frame }) => {
  const camX = camera.position[0];
  const brick = useMemo(() => brickCanvas(), []);
  const slab = useMemo(() => slabCanvas(), []);
  const floorTex = useMemo(() => tiled(slab, WALL.half * 2, WALL.near - WALL.stairs, 1.4), [slab]);
  const sky = useMemo(() => skyCanvas(), []);
  const brickCorner = useMemo(() => tiled(brick, 0.9, 1.5, 1.4), [brick]);
  return (
    <>
      <CameraRig {...camera} />
      <color attach="background" args={["#8fbbe6"]} />
      <fog attach="fog" args={["#c8d8e6", 18, 70]} />
      <ambientLight intensity={1.15} color="#dbe6ff" />
      <hemisphereLight args={["#bcd4ff", "#5a6a3a", 0.6]} />
      <directionalLight
        position={[6, 5, -5]}
        intensity={2.4}
        color="#ffd8a0"
        castShadow
        shadow-mapSize={[4096, 4096]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={10}
        shadow-camera-bottom={-10}
        shadow-camera-near={0.5}
        shadow-camera-far={40}
      />
      <directionalLight position={[-4, 6, 6]} intensity={0.7} color="#cfe0ff" />

      {/* Sky and sun stay put as the camera trucks; the ranges slide at their own shares (parallax). */}
      <group position={[camX, 0, 0]}>
        <mesh position={[0, 18, -95]}>
          <planeGeometry args={[320, 160]} />
          <meshBasicMaterial map={sky} fog={false} toneMapped={false} />
        </mesh>
        <mesh position={[30, 7, -93]}>
          <circleGeometry args={[4.5, 48]} />
          <meshBasicMaterial color="#fff2c8" fog={false} toneMapped={false} />
        </mesh>
        <Halo position={[30, 7, -92.5]} size={36} color="#ffd08a" strength={0.55} />
      </group>
      <Range z={-80} shift={camX * 0.8} width={340} low={14} high={32} color="#a8bcd4" seed={2} />
      <Haze z={-72} color="#e8eef4" />
      <Range z={-60} shift={camX * 0.6} width={260} low={11} high={24} color="#86a2c0" seed={5} wall={0.26} />
      <Range z={-42} shift={camX * 0.3} width={200} low={8} high={17} color="#6e9276" seed={9} wall={0.24} />
      <Haze z={-36} color="#dfe8e0" />
      <Range z={-26} shift={-camX * 0.4} width={140} low={5} high={11.5} color="#4f7a3a" seed={13} wall={0.22} />

      <Slopes brick={brick} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, (WALL.near + WALL.stairs) / 2]} receiveShadow>
        <planeGeometry args={[WALL.half * 2, WALL.near - WALL.stairs]} />
        <meshToonMaterial color="#ffffff" gradientMap={toonRamp} map={floorTex} />
      </mesh>
      <OuterParapet brick={brick} part="flat" />
      <InnerParapet brick={brick} frame={frame} part="flat" />
      {/* The wall bends right at the foot of the stairs, following its ridge, so the ranges open up on the left. */}
      <group position={[0, 0, WALL.stairs]} rotation={[0, TURN, 0]}>
        <group position={[0, 0, -WALL.stairs]}>
          <Stairs slab={slab} />
          <OuterParapet brick={brick} part="stairs" />
          <InnerParapet brick={brick} frame={frame} part="stairs" />
          <Tower brick={brick} />
        </group>
      </group>
      <InkBox size={[0.9, 1.55, 0.9]} position={[-WALL.half - 0.25, 0.775, WALL.stairs - 0.2]} color="#ffffff" map={brickCorner} />
      <Birds frame={frame} />
    </>
  );
};
