import React, { useMemo } from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, Halo, Hills, InkBox, InkCylinder, Label, SkyDome, toonRamp, Vec3 } from "../../engine";
import { useOwnedTex } from "../dog-nose/sets";
import { AshPlume, rnd } from "./props";

// Sets and props for "Why a Volcano Invented the Bicycle" beyond the town street: Tambora at night and under the
// spreading veil, the rain-rotted 1816 field, the stable, the workshop, the truth room, the June lane, the study.

const INK = "#161212";

const Lit: React.FC<{ fog: string; amb: number; ambC?: string; hemi?: [string, string, number]; sun: Vec3; key: string; ki: number; far?: number; near?: number }> = ({ fog, amb, ambC = "#ffffff", hemi, sun, key, ki, far = 140, near = 30 }) => (
  <>
    <color attach="background" args={[fog]} />
    <fog attach="fog" args={[fog, near, far]} />
    <ambientLight intensity={amb} color={ambC} />
    {hemi && <hemisphereLight args={hemi} />}
    <directionalLight
      position={sun}
      intensity={ki}
      color={key}
      castShadow
      shadow-mapSize={[4096, 4096]}
      shadow-bias={-0.0004}
      shadow-normalBias={0.02}
      shadow-camera-left={-10}
      shadow-camera-right={10}
      shadow-camera-top={10}
      shadow-camera-bottom={-10}
      shadow-camera-near={0.5}
      shadow-camera-far={50}
    />
  </>
);

// ---------- Tambora, Sumbawa, April 1815: mountain and sky only ----------

export type VolcanoMode = "night" | "veil";

// The big cone: a lathe with a broad base and a broken summit, lava streaks painted on its flanks.
const Cone: React.FC<{ position: Vec3; r: number; h: number; glow: number; mode: VolcanoMode }> = ({ position, r, h, glow, mode }) => {
  const tex = useOwnedTex(
    () =>
      canvasTexture(1024, 512, (ctx) => {
        ctx.fillStyle = mode === "night" ? "#2a2230" : "#5a5068";
        ctx.fillRect(0, 0, 1024, 512);
        for (let i = 0; i < 200; i++) {
          ctx.fillStyle = `rgba(${mode === "night" ? 20 : 70},${mode === "night" ? 16 : 60},${mode === "night" ? 30 : 80},0.5)`;
          ctx.fillRect(rnd(i, 4) * 1024, rnd(i + 1, 4) * 512, 8 + rnd(i + 2, 4) * 30, 4 + rnd(i + 3, 4) * 10);
        }
        if (mode === "night") {
          for (let k = 0; k < 9; k++) {
            const x0 = 60 + k * 112 + rnd(k, 8) * 40;
            ctx.strokeStyle = "rgba(255,120,40,0.95)";
            ctx.lineWidth = 7 + rnd(k, 9) * 6;
            ctx.beginPath();
            ctx.moveTo(x0, 0);
            for (let y = 0; y < 512; y += 32) ctx.lineTo(x0 + Math.sin(y * 0.03 + k) * 22, y);
            ctx.stroke();
          }
        }
      }),
    [mode],
  );
  const geo = useMemo(() => {
    const pts = [new THREE.Vector2(r, 0), new THREE.Vector2(r * 0.62, h * 0.32), new THREE.Vector2(r * 0.3, h * 0.78), new THREE.Vector2(r * 0.17, h), new THREE.Vector2(r * 0.12, h * 0.96), new THREE.Vector2(0.01, h * 0.9)];
    return new THREE.LatheGeometry(pts, 48);
  }, [r, h]);
  return (
    <group position={position}>
      <mesh geometry={geo}>
        <meshToonMaterial color="#ffffff" map={tex} gradientMap={toonRamp} emissive={mode === "night" ? "#ff5a1a" : "#000000"} emissiveIntensity={0.25 * glow} emissiveMap={mode === "night" ? tex : null} />
      </mesh>
      <mesh geometry={geo} scale={[1.01, 1.005, 1.01]}>
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  );
};

// Lava fountain at the summit: glowing blobs thrown up on arcs and falling back (closed form in the frame).
const LavaFountain: React.FC<{ position: Vec3; frame: number; power: number; scale?: number }> = ({ position, frame, power, scale = 1 }) => {
  if (power <= 0.01) return null;
  return (
    <group position={position} scale={scale} userData={{ ghost: true, noInk: true }}>
      {Array.from({ length: 28 }, (_, i) => {
        const period = 34 + rnd(i, 3) * 26;
        const t = ((frame + rnd(i, 5) * period) % period) / period;
        const vx = (rnd(i, 6) - 0.5) * 2.6;
        const vz = (rnd(i, 7) - 0.5) * 1.2;
        const vy = 3 + rnd(i, 8) * 2.2;
        const y = (vy * t - 4.2 * t * t) * power;
        const s = 0.18 + rnd(i, 9) * 0.22;
        return (
          <mesh key={i} position={[vx * t * power, Math.max(0, y), vz * t * power]} scale={s * (1 - t * 0.5)}>
            <sphereGeometry args={[1, 10, 8]} />
            <meshBasicMaterial color={new THREE.Color(2.6, 1.0 + 0.6 * (1 - t), 0.25)} toneMapped={false} />
          </mesh>
        );
      })}
      <Halo position={[0, 1, 0.5]} size={7 * power} color="#ff7a2a" strength={0.6} />
    </group>
  );
};

// A jagged lightning bolt inside the ash column (volcanic lightning), on for a few frames.
const Bolt: React.FC<{ position: Vec3; on: number; seed: number; length?: number }> = ({ position, on, seed, length = 6 }) => {
  const geo = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    let x = 0;
    for (let i = 0; i <= 8; i++) {
      pts.push(new THREE.Vector3(x, -i * (length / 8), 0));
      x += (rnd(i, seed) - 0.5) * 1.2;
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.1), 32, 0.07, 5, false);
  }, [seed, length]);
  if (on <= 0.01) return null;
  return (
    <group position={position} userData={{ ghost: true, noInk: true }}>
      <mesh geometry={geo}>
        <meshBasicMaterial color={new THREE.Color(3, 3, 3.6).multiplyScalar(on)} toneMapped={false} />
      </mesh>
      <Halo position={[0, -length / 2, 0.5]} size={length * 1.4} color="#c8d8ff" strength={0.45 * on} />
    </group>
  );
};

// A coconut palm at the shore: a curved trunk and a crown of drooping fronds (silhouette-dark at night).
export const Palm: React.FC<{ position: Vec3; scale?: number; lean?: number; color?: string; frond?: string; frame?: number }> = ({ position, scale = 1, lean = 0.2, color = "#3a2a20", frond = "#24402a", frame = 0 }) => {
  const trunk = useMemo(() => {
    const pts = Array.from({ length: 8 }, (_, i) => new THREE.Vector3(Math.sin((i / 7) * 1.2) * lean * 2, i * 0.55, 0));
    return { curve: new THREE.CatmullRomCurve3(pts), geo: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 8, false) };
  }, [lean]);
  const top = trunk.curve.getPoint(1);
  return (
    <group position={position} scale={scale} userData={{ ghost: true }}>
      <mesh geometry={trunk.geo}>
        <meshToonMaterial color={color} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => {
        const a = (i / 9) * Math.PI * 2;
        const sway = 0.08 * Math.sin(frame * 0.05 + i);
        return (
          <group key={i} position={[top.x, top.y, top.z]} rotation={[0, a, 0]}>
            <group rotation={[0, 0, -0.5 - 0.25 * rnd(i, 3) + sway]}>
              <mesh position={[0.6, -0.1, 0]} rotation={[0, 0, -0.35]} scale={[0.75, 0.07, 0.2]}>
                <sphereGeometry args={[1, 12, 6]} />
                <meshToonMaterial color={frond} gradientMap={toonRamp} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

const seaCanvas = (mode: VolcanoMode) =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = mode === "night" ? "#141a36" : "#4a4a66";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 700; i++) {
      const v = rnd(i, 12);
      ctx.fillStyle = mode === "night" ? (v > 0.8 ? "rgba(255,120,60,0.55)" : "rgba(80,100,170,0.5)") : "rgba(140,140,170,0.5)";
      ctx.fillRect(rnd(i + 1, 12) * 1024, rnd(i + 2, 12) * 1024, 20 + v * 50, 3);
    }
  });

// Sumbawa from the shore: dark sea, a beach, palms, and Tambora's cone across the bay. `blast` 0..1 grows the
// eruption column; `veil` 0..1 (veil mode) spreads the ash and sulphur flat across the sky and dims the sun.
export const VolcanoSet: React.FC<{ camera: CameraShot; frame: number; mode: VolcanoMode; blast?: number; veil?: number; children?: React.ReactNode }> = ({ camera, frame, mode, blast = 0, veil = 0, children }) => {
  const night = mode === "night";
  const sea = useOwnedTex(() => {
    const t = seaCanvas(mode);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(6, 6);
    t.offset.set(frame * 0.0006, frame * 0.0004);
    return t;
  }, [mode]);
  sea.offset.set(frame * 0.0006, frame * 0.0004);
  const fog = night ? "#1a1424" : "#8a8090";
  const sky: [number, string][] = night
    ? [[-0.1, "#3a1a1a"], [0.0, "#5a2418"], [0.06, "#3a1a2a"], [0.2, "#1e1430"], [1.0, "#0a0a1e"]]
    : (() => {
        // a clear dawn sky going grey as the veil spreads over it
        const blue: [number, string][] = [[-0.1, "#f0e4d0"], [0.0, "#f2dcc0"], [0.08, "#c8d8ec"], [0.25, "#8ab4e4"], [0.6, "#5a8cd0"], [1.0, "#3a6ab8"]];
        const grey: [number, string][] = [[-0.1, "#a8a29a"], [0.0, "#b0a898"], [0.08, "#a09c98"], [0.25, "#8a8890"], [0.6, "#74727e"], [1.0, "#5e5c68"]];
        const k = Math.round(Math.min(1, veil * 1.1) * 12) / 12; // a few steps, so the dome is rebuilt only now and then
        return blue.map(([h, c], i) => [h, "#" + new THREE.Color(c).lerp(new THREE.Color(grey[i][1]), k).getHexString()] as [number, string]);
      })();
  const sunDir: Vec3 = night ? [3, 5, -8] : [2, 2.4, -8];
  const bolt = (s: number) => (Math.sin(frame * 0.9 + s) > 0.93 && blast > 0.5 ? 1 : 0);
  return (
    <>
      <CameraRig {...camera} />
      <Lit fog={fog} amb={night ? 0.5 : 0.85} ambC={night ? "#c08070" : "#d0c8d0"} hemi={[night ? "#ff8a5a" : "#b8b0c0", "#2a2a3a", 0.4]} sun={night ? [0, 8, -20] : [2, 6, -10]} key={night ? "#ff8a4a" : "#e8e0d0"} ki={night ? 1.2 + 0.8 * blast : 0.9} far={220} near={60} />
      <group position={camera.position}>
        <SkyDome sun={sunDir} stops={sky} glow={night ? "#ff7a3a" : "#fff2d0"} />
      </group>
      {!night && (
        // the sun: a pale disc fading behind the veil
        <mesh position={[camera.position[0] + 20, camera.position[1] + 42, camera.position[2] - 64]} onUpdate={(m) => m.lookAt(camera.position[0], camera.position[1], camera.position[2])}>
          <circleGeometry args={[2.6, 32]} />
          <meshBasicMaterial color={new THREE.Color("#fff2c8").multiplyScalar(0.95 - 0.4 * veil)} toneMapped={false} fog={false} transparent opacity={1 - 0.55 * veil} />
        </mesh>
      )}
      <Hills z={-110} width={420} low={2} high={9} color={night ? "#1a1424" : "#6a6074"} seed={5} />
      <Cone position={[4, -0.5, -78]} r={22} h={13.5} glow={blast} mode={mode} />
      {/* the eruption column and its spreading head */}
      {night && blast > 0.01 && <AshPlume position={[4, 12.6, -78]} frame={frame} size={30 * (0.25 + 0.75 * blast)} lit={0.9} color="#6a5a6a" count={34} />}
      {night && <LavaFountain position={[4, 12.8, -76]} frame={frame} power={0.3 + 0.7 * blast} scale={1.7} />}
      {night && <Bolt position={[1.5, 12.6 + 26 * (0.25 + 0.75 * blast), -75]} on={bolt(0)} seed={2} length={9} />}
      {night && <Bolt position={[8, 12.6 + 20 * (0.25 + 0.75 * blast), -75]} on={bolt(2.3)} seed={7} length={7} />}
      {night && blast > 0.05 && <pointLight position={[4, 16, -66]} color="#ff6a2a" intensity={6 * blast} distance={200} />}
      {!night && <AshVeil frame={frame} veil={veil} camera={camera} />}
      {!night && <AshPlume position={[4, 12.6, -78]} frame={frame} size={30} color="#7a6e7e" count={30} />}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -40]}>
        <planeGeometry args={[400, 120]} />
        <meshToonMaterial color="#ffffff" map={sea} gradientMap={toonRamp} />
      </mesh>
      {/* the beach the camera stands on */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0, 6]}>
        <planeGeometry args={[60, 16]} />
        <meshToonMaterial color={night ? "#3a3036" : "#8a7a70"} gradientMap={toonRamp} />
      </mesh>
      {children}
    </>
  );
};

// The veil: a layer of ash and sulphur puffs sliding out across the whole sky, high over the camera.
const AshVeil: React.FC<{ frame: number; veil: number; camera: CameraShot }> = ({ frame, veil }) => {
  const puffs = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ x: (rnd(i, 1) - 0.5) * 2, z: rnd(i, 2), r: 5 + rnd(i, 3) * 7, y: rnd(i, 4) * 6, yellow: rnd(i, 5) > 0.55 })), []);
  return (
    <group userData={{ ghost: true, audit: false }}>
      {puffs.map((p, i) => {
        const reach = veil * 1.15 - p.z * 0.6; // puffs nearer the volcano arrive first
        if (reach <= 0) return null;
        const k = Math.min(1, reach * 2);
        return (
          <mesh key={i} position={[p.x * 90 + 0.3 * Math.sin(frame * 0.01 + i), 34 + p.y, -78 + p.z * 50 * Math.min(1, reach)]} scale={[p.r * k * 1.8, p.r * k * 0.22, p.r * k]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshToonMaterial color={p.yellow ? "#c8c0a0" : "#9a96a0"} gradientMap={toonRamp} fog={false} transparent opacity={0.55} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// A beach signboard on two posts.
export const SignBoard: React.FC<{ position: Vec3; text: string; width?: number; rotationY?: number; appear?: number; bg?: string; post?: string; height?: number }> = ({ position, text, width = 0.6, rotationY = 0, appear, bg = "#efe2c0", post = "#4a3020", height = 0.8 }) => {
  const lines = text.split("\n").length;
  const h = (width / 4) * lines;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {[-1, 1].map((s) => (
        <InkCylinder key={s} radius={0.03} height={height + h / 2} position={[s * width * 0.4, (height + h / 2) / 2, -0.03]} color={post} ink={0.008} />
      ))}
      <InkBox size={[width + 0.06, h + 0.06, 0.04]} position={[0, height + h / 2, -0.01]} color={post} ink={0.01} />
      <Label text={text} position={[0, height + h / 2, 0.015]} width={width} bg={bg} appear={appear} />
    </group>
  );
};

// ---------- the field, summer 1816: cold rain, flattened rotting wheat ----------

const mudCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#4e4c44";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1800; i++) {
      const v = rnd(i, 21);
      ctx.fillStyle = v > 0.7 ? "rgba(120,126,130,0.55)" : v > 0.4 ? "rgba(60,58,50,0.6)" : "rgba(96,98,80,0.5)";
      ctx.fillRect(rnd(i + 1, 21) * 1024, rnd(i + 2, 21) * 1024, 6 + v * 16, 2 + v * 5);
    }
    // puddles
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(150,170,190,0.6)";
      ctx.beginPath();
      ctx.ellipse(rnd(i, 31) * 1024, rnd(i + 1, 31) * 1024, 20 + rnd(i + 2, 31) * 50, 6 + rnd(i + 3, 31) * 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Instanced wheat stalks, most beaten flat and grey-brown, some still standing with drooping heads.
const Wheat: React.FC<{ area: [number, number, number, number]; count?: number; seed?: number; clear?: [number, number, number][] }> = ({ area, count = 1600, seed = 1, clear = [] }) => {
  const mesh = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.006, 0.01, 0.5, 4);
    g.translate(0, 0.25, 0);
    const head = new THREE.SphereGeometry(0.03, 6, 4);
    head.scale(0.7, 1.6, 0.7);
    head.translate(0, 0.52, 0);
    const merged = new THREE.BufferGeometry();
    const geos = [g, head];
    const pos: number[] = [];
    const nor: number[] = [];
    geos.forEach((gg) => {
      const ng = gg.index ? gg.toNonIndexed() : gg;
      pos.push(...(ng.attributes.position.array as Float32Array));
      nor.push(...(ng.attributes.normal.array as Float32Array));
    });
    merged.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(nor, 3));
    const m = new THREE.MeshToonMaterial({ color: "#a8986a", gradientMap: toonRamp });
    const im = new THREE.InstancedMesh(merged, m, count);
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    let k = 0;
    for (let i = 0; k < count && i < count * 3; i++) {
      const x = area[0] + rnd(i, seed) * (area[2] - area[0]);
      const z = area[1] + rnd(i + 7, seed) * (area[3] - area[1]);
      if (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r)) continue;
      const flat = rnd(i + 3, seed) > 0.3;
      o.position.set(x, 0, z);
      o.rotation.set(flat ? 1.3 + rnd(i + 4, seed) * 0.25 : (rnd(i + 4, seed) - 0.5) * 0.5, rnd(i + 5, seed) * Math.PI * 2, 0);
      o.scale.setScalar(0.7 + rnd(i + 6, seed) * 0.6);
      o.updateMatrix();
      im.setMatrixAt(k, o.matrix);
      c.set(flat ? (rnd(i + 8, seed) > 0.5 ? "#7a6e50" : "#6a6a52") : "#b0a06a");
      im.setColorAt(k, c);
      k++;
    }
    im.count = k;
    im.instanceMatrix.needsUpdate = true;
    return im;
  }, [area, count, seed, clear]);
  return <primitive object={mesh} userData={{ ghost: true }} />;
};

// Rain: instanced streaks falling and slanting in the wind (closed form in the frame).
export const Rain: React.FC<{ frame: number; center: Vec3; size: Vec3; count?: number; color?: string }> = ({ frame, center, size, count = 500, color = "#c8d4e4" }) => {
  const mesh = useMemo(() => {
    const g = new THREE.BoxGeometry(0.006, 0.22, 0.006);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
    return new THREE.InstancedMesh(g, m, count);
  }, [count, color]);
  const o = useMemo(() => new THREE.Object3D(), []);
  for (let i = 0; i < count; i++) {
    const fall = ((rnd(i, 41) + frame * 0.045 * (0.8 + rnd(i, 42) * 0.4)) % 1) * size[1];
    o.position.set(center[0] + (rnd(i, 43) - 0.5) * size[0] - fall * 0.15, center[1] + size[1] / 2 - fall, center[2] + (rnd(i, 44) - 0.5) * size[2]);
    o.rotation.set(0, 0, 0.15);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} userData={{ ghost: true, noInk: true, audit: false }} />;
};

export const FieldSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const mud = useOwnedTex(() => {
    const t = mudCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(12, 10);
    return t;
  });
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <Lit fog="#8e98a4" amb={1.0} ambC="#c8d4e0" hemi={["#a8b8cc", "#3a3a34", 0.5]} sun={[-3, 9, 4]} key="#d4dce8" ki={0.8} near={12} far={70} />
      <group position={camera.position}>
        <SkyDome sun={[-3, 9, 4]} stops={[[-0.1, "#9aa4ae"], [0.0, "#8e98a4"], [0.15, "#7a8694"], [0.5, "#646e7e"], [1.0, "#525a6a"]]} glow="#a8b0b8" />
      </group>
      {/* low rain clouds */}
      {Array.from({ length: 14 }, (_, i) => (
        <mesh key={i} position={[(rnd(i, 51) - 0.5) * 70 + camX * 0.6 + Math.sin(frame * 0.004 + i) * 0.8, 14 + rnd(i, 52) * 5, -40 - rnd(i, 53) * 20]} scale={[8 + rnd(i, 54) * 8, 2.2, 4]}>
          <sphereGeometry args={[1, 14, 8]} />
          <meshToonMaterial color="#5e6676" gradientMap={toonRamp} fog={false} />
        </mesh>
      ))}
      <Hills z={-45} shift={camX * 0.5} width={220} low={1} high={3.5} color="#5e6a6e" seed={9} />
      {/* a farmhouse far off and a row of bare trees */}
      <group position={[camX * 0.2 - 6, 0, -22]}>
        <InkBox size={[3.5, 2.2, 2.4]} position={[0, 1.1, 0]} color="#8a8478" ink={0.03} />
        <mesh position={[0, 2.2, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1, 1, 1]}>
          <coneGeometry args={[2.6, 1.6, 4]} />
          <meshToonMaterial color="#4a3a34" gradientMap={toonRamp} />
        </mesh>
      </group>
      {[-12, -8.5, -4, 3, 7, 11.5].map((x, i) => (
        <InkCylinder key={i} radius={0.08} height={3.4} position={[x + camX * 0.15, 1.7, -18 - i]} color="#3a3430" ink={0.02} />
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[120, 60]} />
        <meshToonMaterial color="#ffffff" map={mud} gradientMap={toonRamp} />
      </mesh>
      <Wheat area={[-6, -9, 6, 2.4]} count={2200} seed={3} clear={[[0, 0.15, 0.55]]} />
      <Rain frame={frame} center={[camera.position[0], 2, camera.position[2] - 3]} size={[5, 4, 5]} />
      {children}
    </>
  );
};

// ---------- props for the stable, the square, the workshop ----------

// A grain sack: a soft bag with a gathered, tied neck; `empty` 0..1 sags it. Built upright, neck up.
export const Sack: React.FC<{ position: Vec3; rotation?: Vec3; empty?: number; label?: string; scale?: number }> = ({ position, rotation = [0, 0, 0], empty = 1, label, scale = 1 }) => (
  <group position={position} scale={scale}>
    {label && <Label text={label} position={[0, -0.01, 0.125]} width={0.2} bg="#e8d8b0" />}
  <group rotation={rotation}>
    <mesh position={[0, 0.0, 0]} scale={[0.16, 0.16 * (1 - 0.35 * empty), 0.1 + 0.05 * (1 - empty)]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshToonMaterial color="#c8ae7a" gradientMap={toonRamp} />
    </mesh>
    <mesh position={[0, 0.0, 0]} scale={[0.17, 0.17 * (1 - 0.35 * empty), 0.11 + 0.05 * (1 - empty)]}>
      <sphereGeometry args={[1, 16, 12]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <InkCylinder radius={0.035} height={0.1} position={[0, 0.16 - 0.05 * empty, 0]} color="#b89a68" ink={0.006} />
    <InkCylinder radius={0.04} height={0.02} position={[0, 0.13 - 0.05 * empty, 0]} color="#6a4a2a" ink={0.004} />
    </group>
  </group>
);

// A farm cart standing without its horse: a plank box on two spoked wheels, the shafts down on the cobbles.
export const Cart: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[1.3, 0.35, 0.8]} position={[0, 0.65, 0]} color="#8a6a44" ink={0.012} />
    <InkBox size={[1.34, 0.05, 0.84]} position={[0, 0.82, 0]} color="#6a4a2e" ink={0.008} />
    {[-1, 1].map((s) => (
      <group key={s} position={[0, 0.42, s * 0.44]}>
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[0.38, 0.03, 8, 30]} />
          <meshToonMaterial color="#5a3a22" gradientMap={toonRamp} />
        </mesh>
        {Array.from({ length: 8 }, (_, i) => (
          <InkBox key={i} size={[0.025, 0.74, 0.02]} rotation={[0, 0, (i * Math.PI) / 8]} color="#6a4a2e" ink={0.004} />
        ))}
        <InkCylinder radius={0.06} height={0.08} rotation={[Math.PI / 2, 0, 0]} color="#3a2a1e" ink={0.005} />
      </group>
    ))}
    {/* the two shafts sloping down to the ground in front */}
    {[-0.3, 0.3].map((z) => (
      <group key={z} position={[0.65, 0.5, z]} rotation={[0, 0, -0.42]}>
        <InkBox size={[1.3, 0.05, 0.05]} position={[0.6, 0, 0]} color="#7a5a38" ink={0.006} />
      </group>
    ))}
  </group>
);

// A hanging shop sign on an iron arm, swinging a little.
export const HangingSign: React.FC<{ position: Vec3; text: string; frame: number; width?: number; appear?: number; bg?: string }> = ({ position, text, frame, width = 0.62, appear, bg = "#f2e4c4" }) => {
  const lines = text.split("\n").length;
  const h = (width / 4) * lines;
  const swing = 0.06 * Math.sin(frame * 0.06);
  return (
    <group position={position}>
      <InkBox size={[0.04, 0.04, 0.8]} position={[0, 0, 0.4]} color="#2a2a2e" ink={0.006} />
      <group position={[0, -0.02, 0.62]} rotation={[swing, 0, 0]}>
        <InkCylinder radius={0.006} height={0.12} position={[-width * 0.4, -0.06, 0]} color="#2a2a2e" ink={0} />
        <InkCylinder radius={0.006} height={0.12} position={[width * 0.4, -0.06, 0]} color="#2a2a2e" ink={0} />
        <InkBox size={[width + 0.06, h + 0.06, 0.03]} position={[0, -0.12 - h / 2, 0]} color="#5a3a22" ink={0.008} />
        <Label text={text} position={[0, -0.12 - h / 2, 0.018]} width={width} bg={bg} appear={appear} />
      </group>
    </group>
  );
};

// A bundle carried on the shoulder or in the hand: a cloth bag tied up.
export const Bundle: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#8a5a4a" }) => (
  <group position={position}>
    <mesh scale={[0.11, 0.09, 0.08]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh scale={[0.118, 0.098, 0.088]}>
      <sphereGeometry args={[1, 12, 8]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <mesh position={[0, 0.08, 0]} scale={[0.03, 0.03, 0.03]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
  </group>
);

// A child's hobby horse: a carved wooden horse head on a stick (the horse that never eats).
export const HobbyHorse: React.FC<{ position: Vec3; rotation?: Vec3; scale?: number }> = ({ position, rotation = [0, 0, 0], scale = 1 }) => (
  <group position={position} rotation={rotation} scale={scale}>
    <InkCylinder radius={0.012} height={0.62} position={[0, 0.31, 0]} color="#c08a4e" ink={0.004} />
    <group position={[0, 0.66, 0]}>
      <mesh rotation={[0, 0, -0.35]} scale={[0.05, 0.1, 0.04]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshToonMaterial color="#b07a48" gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[0, 0, -0.35]} scale={[0.056, 0.106, 0.046]}>
        <sphereGeometry args={[1, 14, 10]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0.09, 0.03, 0]} rotation={[0, 0, -2.0]} scale={[0.035, 0.1, 0.035]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshToonMaterial color="#b07a48" gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0.09, 0.03, 0]} rotation={[0, 0, -2.0]} scale={[0.04, 0.106, 0.04]}>
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* mane, ear and eye */}
      <InkBox size={[0.02, 0.12, 0.03]} position={[-0.03, 0.03, 0]} rotation={[0, 0, -0.4]} color="#3a2414" ink={0.003} />
      <InkBox size={[0.02, 0.04, 0.02]} position={[0.0, 0.1, 0]} rotation={[0, 0, -0.3]} color="#b07a48" ink={0.003} />
      <mesh position={[0.04, 0.05, 0.04]}>
        <sphereGeometry args={[0.008, 8, 6]} />
        <meshBasicMaterial color="#141010" />
      </mesh>
    </group>
  </group>
);

// A dust sheet thrown over the machine: a draped box that lifts and flies off with `off` 0..1.
export const DustSheet: React.FC<{ position: Vec3; off: number; size?: Vec3; heading?: number }> = ({ position, off, size = [0.98, 0.5, 0.3], heading = 0 }) => {
  if (off >= 0.7) return null;
  return (
    <group position={position} rotation={[0, heading, 0]}>
    <group position={[off * 0.5, size[1] * 0.62 + off * off * 4, -off * 0.6]} rotation={[0, 0, -off * 1.4]} scale={1 - off * 0.8} userData={{ ghost: true }}>
      <mesh scale={[size[0] / 2, size[1] / 2, size[2] / 2]}>
        <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshToonMaterial color="#a8a498" gradientMap={toonRamp} side={THREE.DoubleSide} />
      </mesh>
      <mesh scale={[size[0] / 2 + 0.01, size[1] / 2 + 0.01, size[2] / 2 + 0.01]}>
        <sphereGeometry args={[1, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
      {/* folds */}
      {[-0.25, 0, 0.25].map((x) => (
        <InkBox key={x} size={[0.01, size[1] * 0.5, 0.01]} position={[x, 0.02, size[2] / 2 - 0.02]} color="#7a7668" ink={0} />
      ))}
    </group>
    </group>
  );
};

// A workbench with a vice, shavings and tools.
export const Bench: React.FC<{ position: Vec3; width?: number; height?: number }> = ({ position, width = 1.5, height = 0.62 }) => (
  <group position={position}>
    <InkBox size={[width, 0.07, 0.55]} position={[0, height - 0.035, 0]} color="#a87a48" ink={0.01} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.07, height - 0.07, 0.45]} position={[s * (width / 2 - 0.08), (height - 0.07) / 2, 0]} color="#7a5230" ink={0.008} />
    ))}
    <InkBox size={[width - 0.2, 0.05, 0.4]} position={[0, 0.15, 0]} color="#7a5230" ink={0.006} />
    {/* shavings */}
    {Array.from({ length: 10 }, (_, i) => (
      <mesh key={i} position={[-width / 2 + 0.2 + rnd(i, 61) * (width - 0.4), height + 0.006, -0.18 + rnd(i, 62) * 0.36]} rotation={[0, rnd(i, 63) * 3, Math.PI / 2]}>
        <torusGeometry args={[0.02, 0.005, 4, 10, Math.PI * 1.5]} />
        <meshToonMaterial color="#e8c898" gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

// A tool board on the wall: a saw, a mallet, chisels, a drawknife.
export const ToolBoard: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[1.2, 0.6, 0.03]} color="#8a6038" ink={0.008} />
    <InkBox size={[0.42, 0.14, 0.01]} position={[-0.32, 0.12, 0.025]} color="#b8bcc0" ink={0.004} />
    <InkBox size={[0.12, 0.05, 0.02]} position={[-0.08, 0.12, 0.025]} color="#6a4428" ink={0.004} />
    <InkBox size={[0.04, 0.3, 0.02]} position={[0.15, 0.0, 0.025]} color="#6a4428" ink={0.004} />
    <InkBox size={[0.12, 0.08, 0.04]} position={[0.15, 0.17, 0.03]} color="#5a3a20" ink={0.004} />
    {[0.33, 0.39, 0.45].map((x) => (
      <InkBox key={x} size={[0.02, 0.24, 0.015]} position={[x, -0.05, 0.025]} color={x > 0.4 ? "#a8acb0" : "#7a5a34"} ink={0.003} />
    ))}
  </group>
);

// A low round plinth for the truth room.
export const Plinth: React.FC<{ position: Vec3; r?: number; h?: number; color?: string }> = ({ position, r = 0.62, h = 0.12, color = "#3a4a7a" }) => (
  <group position={position}>
    <InkCylinder radius={r} height={h} position={[0, h / 2, 0]} color={color} ink={0.01} />
    <InkCylinder radius={r * 1.04} height={0.02} position={[0, 0.01, 0]} color="#2a3460" ink={0.006} />
  </group>
);

// A framed picture on a wall: a horse (lean, 1816) or the running machine (1817), drawn in ink on cream.
const pictureCanvas = (what: "horse" | "machine") =>
  canvasTexture(512, 400, (ctx) => {
    ctx.fillStyle = "#efe4c8";
    ctx.fillRect(0, 0, 512, 400);
    ctx.strokeStyle = "#3a2a1e";
    ctx.lineWidth = 9;
    ctx.lineCap = "round";
    ctx.beginPath();
    if (what === "horse") {
      ctx.ellipse(250, 200, 120, 48, 0, 0, Math.PI * 2);
      for (const x of [160, 190, 300, 330]) {
        ctx.moveTo(x, 235);
        ctx.lineTo(x + (x % 3) * 2, 340);
      }
      ctx.moveTo(360, 180);
      ctx.lineTo(420, 120);
      ctx.lineTo(450, 150);
      ctx.moveTo(130, 190);
      ctx.lineTo(100, 260);
      // ribs
      for (const x of [215, 245, 275]) {
        ctx.moveTo(x, 170);
        ctx.lineTo(x, 230);
      }
    } else {
      ctx.arc(150, 280, 62, 0, Math.PI * 2);
      ctx.moveTo(422, 280);
      ctx.arc(360, 280, 62, 0, Math.PI * 2);
      ctx.moveTo(120, 200);
      ctx.lineTo(400, 200);
      ctx.moveTo(150, 280);
      ctx.lineTo(150, 200);
      ctx.moveTo(360, 280);
      ctx.lineTo(370, 150);
      ctx.lineTo(320, 140);
      ctx.moveTo(230, 200);
      ctx.lineTo(230, 185);
      ctx.lineTo(280, 185);
    }
    ctx.stroke();
  });
export const Picture: React.FC<{ position: Vec3; what: "horse" | "machine"; size?: [number, number] }> = ({ position, what, size = [0.42, 0.33] }) => {
  const tex = useOwnedTex(() => pictureCanvas(what), [what]);
  return (
    <group position={position}>
      <InkBox size={[size[0] + 0.06, size[1] + 0.06, 0.03]} color="#6a4a2a" ink={0.006} />
      <mesh position={[0, 0, 0.017]}>
        <planeGeometry args={size} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---------- the country lane, June 1817 ----------

const fieldCanvas = () =>
  canvasTexture(1024, 1024, (ctx) => {
    ctx.fillStyle = "#7aa04a";
    ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 1600; i++) {
      const v = rnd(i, 71);
      ctx.fillStyle = v > 0.7 ? "rgba(150,180,80,0.6)" : v > 0.35 ? "rgba(96,140,60,0.55)" : "rgba(200,190,90,0.4)";
      ctx.fillRect(rnd(i + 1, 71) * 1024, rnd(i + 2, 71) * 1024, 5 + v * 12, 2 + v * 3);
    }
  });
const laneCanvas = () =>
  canvasTexture(2048, 256, (ctx) => {
    ctx.fillStyle = "#c8a878";
    ctx.fillRect(0, 0, 2048, 256);
    for (let i = 0; i < 1400; i++) {
      const v = rnd(i, 81);
      ctx.fillStyle = v > 0.6 ? "rgba(140,110,76,0.5)" : "rgba(226,206,160,0.5)";
      ctx.fillRect(rnd(i + 1, 81) * 2048, rnd(i + 2, 81) * 256, 3 + v * 6, 2 + v * 3);
    }
    ctx.fillStyle = "rgba(150,118,80,0.35)";
    ctx.fillRect(0, 70, 2048, 14);
    ctx.fillRect(0, 170, 2048, 14);
  });

// A Lombardy poplar: a tall narrow column of green on a thin trunk.
export const Poplar: React.FC<{ position: Vec3; scale?: number; frame?: number; seed?: number }> = ({ position, scale = 1, frame = 0, seed = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.08} height={1.2} position={[0, 0.6, 0]} color="#5a4a3a" ink={0.02} />
    <group rotation={[0, 0, 0.015 * Math.sin(frame * 0.04 + seed)]}>
      <mesh position={[0, 3.0, 0]} scale={[0.75, 2.4, 0.75]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshToonMaterial color={seed % 2 ? "#4e7a36" : "#5a8a3a"} gradientMap={toonRamp} />
      </mesh>
      <mesh position={[0, 3.0, 0]} scale={[0.78, 2.44, 0.78]}>
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    </group>
  </group>
);

// The coaching inn: a long two-storey house with a hipped roof, a coach arch, and a sign.
export const Inn: React.FC<{ position: Vec3; frame: number; appear?: number }> = ({ position, frame, appear }) => (
  <group position={position}>
    <InkBox size={[5, 2.8, 3]} position={[0, 1.4, 0]} color="#ecdcb4" ink={0.03} />
    <mesh position={[0, 3.45, 0]} rotation={[0, Math.PI / 4, 0]} scale={[1.7, 1, 1.05]}>
      <coneGeometry args={[2.6, 1.3, 4]} />
      <meshToonMaterial color="#9a4a32" gradientMap={toonRamp} />
    </mesh>
    {/* the coach arch and windows on the front (z + 1.5) */}
    <InkBox size={[1.3, 1.6, 0.04]} position={[-1.2, 0.8, 1.52]} color="#4a2e1c" ink={0.01} />
    {[0.3, 1.2, 2.0, -2.1].map((x) => (
      <InkBox key={x} size={[0.4, 0.55, 0.04]} position={[x, 2.0, 1.52]} color="#3a4c66" ink={0.008} />
    ))}
    {[0.7, 1.8].map((x) => (
      <InkBox key={x} size={[0.4, 0.55, 0.04]} position={[x, 0.85, 1.52]} color="#3a4c66" ink={0.008} />
    ))}
    <HangingSign position={[0.25, 2.25, 1.5]} text={"COACHING\nINN"} frame={frame} width={0.62} appear={appear} />
  </group>
);

export const LaneSet: React.FC<{ camera: CameraShot; frame: number; children?: React.ReactNode }> = ({ camera, frame, children }) => {
  const field = useOwnedTex(() => {
    const t = fieldCanvas();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(14, 10);
    return t;
  });
  const lane = useOwnedTex(() => {
    const t = laneCanvas();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(4, 1);
    return t;
  });
  const camX = camera.position[0];
  return (
    <>
      <CameraRig {...camera} />
      <Lit fog="#dcecf0" amb={1.05} hemi={["#cfe4ff", "#6a7a3a", 0.5]} sun={[-6, 9, 5]} key="#fff2d8" ki={2.3} />
      <group position={camera.position}>
        <SkyDome sun={[-6, 9, 5]} />
      </group>
      {Array.from({ length: 8 }, (_, i) => (
        <mesh key={i} position={[(rnd(i, 91) - 0.5) * 90 + camX * 0.7 + frame * 0.004, 16 + rnd(i, 92) * 6, -60 - rnd(i, 93) * 20]} scale={[5 + rnd(i, 94) * 4, 1.6, 2]}>
          <sphereGeometry args={[1, 14, 8]} />
          <meshToonMaterial color="#ffffff" gradientMap={toonRamp} fog={false} />
        </mesh>
      ))}
      <Hills z={-70} shift={camX * 0.7} width={320} low={1.5} high={4} color="#9ab4c0" seed={6} />
      <Hills z={-40} shift={camX * 0.4} width={220} low={0.5} high={1.8} color="#7a9a5a" seed={2} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -10]} receiveShadow>
        <planeGeometry args={[140, 60]} />
        <meshToonMaterial color="#ffffff" map={field} gradientMap={toonRamp} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} receiveShadow>
        <planeGeometry args={[60, 1.5]} />
        <meshToonMaterial color="#ffffff" map={lane} gradientMap={toonRamp} />
      </mesh>
      {Array.from({ length: 16 }, (_, i) => (
        <Poplar key={i} position={[-14 + i * 2.6, 0, -5.5 - (i % 2) * 0.3]} scale={0.75 + rnd(i, 95) * 0.2} frame={frame} seed={i} />
      ))}
      {children}
    </>
  );
};

// A sandstone milestone with its words cut in.
export const Milestone: React.FC<{ position: Vec3; text: string; appear?: number; hide?: number }> = ({ position, text, appear, hide = 0 }) => (
  <group position={position}>
    <InkBox size={[0.36, 0.55, 0.16]} position={[0, 0.275, 0]} color="#c8785a" ink={0.01} />
    <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1, 0.44, 1]}>
      <cylinderGeometry args={[0.18, 0.18, 0.16, 24, 1, false, 0, Math.PI]} />
      <meshToonMaterial color="#c8785a" gradientMap={toonRamp} />
    </mesh>
    {hide < 0.98 && (
      <group position={[0, 0.36, 0.085]} scale={1 - hide}>
        <Label text={text} position={[0, 0, 0]} width={0.3} bg="#ecc8a8" appear={appear} />
      </group>
    )}
  </group>
);

// A muddy pothole on the lane.
export const Pothole: React.FC<{ position: Vec3; splash?: number }> = ({ position, splash = -1 }) => (
  <group position={position}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
      <circleGeometry args={[0.22, 24]} />
      <meshBasicMaterial color="#6a5440" />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.02, 0.008, 0.01]} scale={[1, 0.6, 1]}>
      <circleGeometry args={[0.14, 20]} />
      <meshBasicMaterial color="#8a9aa8" />
    </mesh>
    {splash >= 0 && splash < 18 && (
      <group userData={{ ghost: true, noInk: true }}>
        {Array.from({ length: 10 }, (_, i) => {
          const t = splash / 18;
          const a = (i / 10) * Math.PI * 2;
          return (
            <mesh key={i} position={[Math.cos(a) * 0.3 * t, 0.35 * t - 0.5 * t * t + 0.02, Math.sin(a) * 0.15 * t]} scale={0.03 * (1 - t * 0.5)}>
              <sphereGeometry args={[1, 8, 6]} />
              <meshToonMaterial color="#7a6048" gradientMap={toonRamp} />
            </mesh>
          );
        })}
      </group>
    )}
  </group>
);

// A starving farm horse (sand3d, ../videos/volcano-bicycle/sand3d/thin_horse.py): narrow, ribs and hip bones showing.
export const FarmHorse: React.FC<{ position: Vec3; rotationY?: number; neck?: number; tail?: number; scale?: number; legs?: Record<string, number> }> = ({ position, rotationY = 0, neck = 0, tail = 0, scale = 0.62, legs = {} }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <BlenderModel src="videos/volcano-bicycle/models/thin_horse.glb" scale={scale} joints={{ neck, tail, ...legs }} />
  </group>
);

// The pedal that is not there: a ghostly crank and pedal at the hub, crossed out in red.
export const NoPedal: React.FC<{ position: Vec3; appear: number }> = ({ position, appear }) => {
  if (appear < 0) return null;
  const k = Math.min(1, appear / 6);
  return (
    <group position={position} scale={k} userData={{ ghost: true }}>
      <mesh position={[0.05, -0.05, 0]} rotation={[0, 0, 0.8]}>
        <boxGeometry args={[0.03, 0.15, 0.015]} />
        <meshBasicMaterial color="#c8d4e8" transparent opacity={0.75} />
      </mesh>
      <mesh position={[0.1, -0.1, 0.01]}>
        <boxGeometry args={[0.09, 0.035, 0.03]} />
        <meshBasicMaterial color="#c8d4e8" transparent opacity={0.75} />
      </mesh>
      {[0.785, -0.785].map((r) => (
        <group key={r}>
          <mesh position={[0.06, -0.06, 0.03]} rotation={[0, 0, r]}>
            <boxGeometry args={[0.3, 0.035, 0.01]} />
            <meshBasicMaterial color="#e8262e" />
          </mesh>
          <mesh position={[0.06, -0.06, 0.025]} rotation={[0, 0, r]}>
            <boxGeometry args={[0.32, 0.055, 0.008]} />
            <meshBasicMaterial color="#161212" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// A present-day desk lamp: a round base, two arm sections and a cone shade with the bulb lit.
export const DeskLamp: React.FC<{ position: Vec3; on?: number }> = ({ position, on = 1 }) => (
  <group position={position}>
    <InkCylinder radius={0.07} height={0.02} position={[0, 0.01, 0]} color="#2a2a30" ink={0.004} />
    <group position={[0, 0.02, 0]} rotation={[0, 0, 0.35]}>
      <InkCylinder radius={0.008} height={0.24} position={[0, 0.12, 0]} color="#3a3a42" ink={0.003} />
      <group position={[0, 0.24, 0]} rotation={[0, 0, -1.3]}>
        <InkCylinder radius={0.008} height={0.2} position={[0, 0.1, 0]} color="#3a3a42" ink={0.003} />
        <group position={[0, 0.2, 0]} rotation={[0, 0, -0.9]}>
          <mesh position={[0, -0.03, 0]}>
            <coneGeometry args={[0.06, 0.09, 18, 1, true]} />
            <meshToonMaterial color="#3a6a8a" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, -0.06, 0]}>
            <sphereGeometry args={[0.022, 10, 8]} />
            <meshBasicMaterial color={new THREE.Color("#fff2c8").multiplyScalar(0.9 + 0.6 * on)} toneMapped={false} />
          </mesh>
        </group>
      </group>
    </group>
    <pointLight position={[0.1, 0.25, 0.05]} intensity={1.4 * on} distance={3} color="#fff0d0" />
  </group>
);
