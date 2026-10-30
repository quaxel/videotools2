import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Your Libra Sign Is Secretly Wrong".

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

// A toon cone with an ink outline (the spinning top, party hats).
const InkCone: React.FC<{ radius: number; height: number; position?: Vec3; rotation?: Vec3; color: string; ink?: number }> = ({
  radius,
  height,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  color,
  ink = 0.012,
}) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow>
      <coneGeometry args={[radius, height, 40]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <mesh>
      <coneGeometry args={[radius + ink, height + ink * 2, 40]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean }> = ({ position, radius, color, glow }) => (
  <mesh position={position} castShadow={!glow}>
    <sphereGeometry args={[radius, 20, 16]} />
    {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
  </mesh>
);

export const Bed: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#9b5de5" }) => (
  <group position={position}>
    <InkBox size={[1.5, 0.3, 1.9]} position={[0, 0.15, 0]} color="#8a5a3a" />
    <InkBox size={[1.45, 0.14, 1.85]} position={[0, 0.37, 0]} color="#fff6dc" />
    <InkBox size={[1.48, 0.06, 1.2]} position={[0, 0.46, 0.33]} color={color} />
    <InkBox size={[0.55, 0.14, 0.3]} position={[-0.35, 0.5, -0.7]} color="#ffffff" />
    <InkBox size={[0.55, 0.14, 0.3]} position={[0.35, 0.5, -0.7]} color="#ffffff" />
    <InkBox size={[1.5, 0.9, 0.08]} position={[0, 0.45, -0.95]} color="#6b3a2a" />
  </group>
);

// A balance: post, beam tipped by `tilt` (radians), two pans hanging plumb.
export const Scales: React.FC<{ position: Vec3; tilt?: number; scale?: number; color?: string }> = ({ position, tilt = 0, scale = 1, color = "#e8b04a" }) => {
  const arm = 0.42;
  const pan = (side: number) => {
    const x = side * arm * Math.cos(tilt);
    const y = 0.9 + side * arm * Math.sin(tilt);
    return (
      <group key={side} position={[x, y, 0]}>
        <InkBox size={[0.01, 0.3, 0.01]} position={[0, -0.15, 0]} color="#3a2a20" ink={0} />
        <InkCylinder radius={0.16} height={0.03} position={[0, -0.31, 0]} color={color} ink={0.006} />
      </group>
    );
  };
  return (
    <group position={position} scale={scale}>
      <InkCylinder radius={0.18} height={0.06} position={[0, 0.03, 0]} color="#6b3a2a" />
      <InkCylinder radius={0.025} height={0.88} position={[0, 0.47, 0]} color={color} ink={0.006} />
      <Ball position={[0, 0.94, 0]} radius={0.045} color={color} />
      <InkBox size={[arm * 2 + 0.04, 0.035, 0.035]} position={[0, 0.9, 0]} rotation={[0, 0, tilt]} color={color} ink={0.006} />
      {pan(-1)}
      {pan(1)}
    </group>
  );
};

// A mug with a sign on its side.
export const Mug: React.FC<{ position: Vec3; text?: string; color?: string; scale?: number }> = ({ position, text = "LIBRA", color = "#9b5de5", scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.07} height={0.16} position={[0, 0.08, 0]} color={color} ink={0.005} />
    <InkBox size={[0.03, 0.09, 0.02]} position={[0.085, 0.085, 0]} color={color} ink={0.005} />
    <Label text={text} position={[0, 0.085, 0.072]} width={0.12} fg="#ffffff" bg={color} border={false} />
  </group>
);

export const Telescope: React.FC<{ position: Vec3; aim?: number; color?: string }> = ({ position, aim = 0.6, color = "#f7f7f2" }) => (
  <group position={position}>
    {[0, 2.1, 4.2].map((a) => (
      <InkBox key={a} size={[0.03, 0.95, 0.03]} position={[Math.sin(a) * 0.17, 0.46, Math.cos(a) * 0.17]} rotation={[Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35]} color="#3a3a44" ink={0.004} />
    ))}
    <group position={[0, 0.95, 0]} rotation={[0, 0, aim]}>
      <InkCylinder radius={0.08} height={0.95} rotation={[0, 0, Math.PI / 2]} position={[0.1, 0, 0]} color={color} ink={0.008} />
      <InkCylinder radius={0.1} height={0.12} rotation={[0, 0, Math.PI / 2]} position={[0.58, 0, 0]} color="#1d4fa8" ink={0.008} />
    </group>
  </group>
);

// Twinkling stars scattered on a wall at depth z.
export const StarField: React.FC<{ z: number; width: number; f: number; count?: number; bottom?: number }> = ({ z, width, f, count = 60, bottom = 1.0 }) => (
  <group>
    {Array.from({ length: count }, (_, i) => {
      const x = (((i * 7919) % 1000) / 1000 - 0.5) * width;
      const y = bottom + (((i * 104729) % 1000) / 1000) * (3.1 - bottom);
      const tw = 0.6 + 0.4 * Math.sin(f / 5 + i);
      return <Ball key={i} position={[x, y, z]} radius={0.012 + (i % 3) * 0.007} color={tw > 0.8 ? "#ffffff" : "#ffe9a0"} glow />;
    })}
  </group>
);

export const Balloon: React.FC<{ position: Vec3; color: string; f: number; seed?: number }> = ({ position, color, f, seed = 0 }) => (
  <group position={[position[0], position[1] + Math.sin(f / 12 + seed) * 0.03, position[2]]}>
    <mesh scale={[1, 1.2, 1]} castShadow>
      <sphereGeometry args={[0.16, 24, 18]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} />
    </mesh>
    <InkBox size={[0.006, 0.7, 0.006]} position={[0, -0.55, 0]} color="#ffffff" ink={0} />
  </group>
);

// Birthday cake on a table; `fall` 0..1 knocks it off the edge onto the floor, `splat` flattens it there.
export const CakeTable: React.FC<{ position: Vec3; fall?: number }> = ({ position, fall = 0 }) => {
  const top = 0.7;
  const x = fall * 0.75;
  const y = fall < 0.35 ? top : top - ((fall - 0.35) / 0.65) ** 2 * top;
  const flat = fall >= 1 ? 0.45 : 1;
  return (
    <group position={position}>
      <InkBox size={[1.0, 0.06, 0.6]} position={[0, top - 0.03, 0]} color="#ffffff" />
      {[-0.42, 0.42].map((dx) => (
        <InkBox key={dx} size={[0.05, top - 0.06, 0.05]} position={[dx, (top - 0.06) / 2, 0]} color="#8a5a3a" ink={0.005} />
      ))}
      <group position={[x, y, 0.05]} rotation={[0, 0, -fall * 1.3]} scale={[1 + (1 - flat) * 0.8, flat, 1 + (1 - flat) * 0.8]}>
        <InkCylinder radius={0.18} height={0.14} position={[0, 0.07, 0]} color="#ff8fc8" ink={0.006} />
        <InkCylinder radius={0.19} height={0.03} position={[0, 0.15, 0]} color="#ffffff" ink={0.004} />
        {[-0.08, 0, 0.08].map((dx) => (
          <group key={dx}>
            <InkBox size={[0.015, 0.08, 0.015]} position={[dx, 0.21, 0]} color="#4f7dff" ink={0} />
            <Ball position={[dx, 0.26, 0]} radius={0.014} color="#ffd23f" glow />
          </group>
        ))}
      </group>
    </group>
  );
};

// Flat star chart (held or lying flat) with a short caption.
export const StarChart: React.FC<{ position: Vec3; rotation?: Vec3; width?: number; text: string; mark?: number }> = ({ position, rotation = [0, 0, 0], width = 0.42, text, mark = 0 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 768, (ctx) => {
        ctx.fillStyle = "#13235e";
        ctx.fillRect(0, 0, 1024, 768);
        for (let i = 0; i < 70; i++) {
          ctx.fillStyle = "#ffffff";
          ctx.beginPath();
          ctx.arc((i * 7919) % 1024, ((i * 3571) % 520) + 20, 3 + (i % 4) * 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = "#8fb3ff";
        ctx.lineWidth = 6;
        ctx.beginPath();
        [[200, 260], [330, 180], [470, 230], [560, 360], [700, 300], [820, 200]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
        ctx.stroke();
        ctx.fillStyle = "#ffd23f";
        ctx.font = `900 120px ${BLOCK_FONT}`;
        const fs = Math.min(120, (120 * 900) / ctx.measureText(text).width);
        ctx.font = `900 ${fs}px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(text, 512, 700);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, 1004, 748);
      }),
    [text],
  );
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <planeGeometry args={[width, width * 0.75]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      {mark > 0 && (
        <mesh position={[0.02 * width, 0.08 * width, 0.004]}>
          <ringGeometry args={[0.1 * width * mark, 0.13 * width * mark, 40]} />
          <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// Clay tablet with the sign dates carved in; `stamp` 0..1 brings the FIXED stamp down.
export const Tablet: React.FC<{ position: Vec3; stamp?: number; stamped?: boolean }> = ({ position, stamp = 0, stamped }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.12, 0.6]} position={[0, 0.06, 0]} color="#b9875a" />
    <Label text={"SIGN DATES"} position={[0, 0.125, -0.12]} rotation={[-Math.PI / 2, 0, 0]} width={0.7} fg="#5a3a1a" bg="#d9a877" />
    {stamped && <Label text="FIXED" position={[0, 0.126, 0.14]} rotation={[-Math.PI / 2, 0, -0.12]} width={0.42} fg="#ffffff" bg="#d62828" />}
    {(stamp > 0 || stamped) && <group position={[0.05, 0.6 - stamp * 0.45, 0.14]}>
      <InkCylinder radius={0.03} height={0.3} position={[0, 0.2, 0]} color="#6b3a2a" ink={0.005} />
      <InkBox size={[0.26, 0.08, 0.18]} position={[0, 0.02, 0]} color="#d62828" />
    </group>}
  </group>
);

// Spinning top labelled EARTH. `spin` turns it about its own axis; its axis leans by `lean` and circles with `precess`.
export const SpinningTop: React.FC<{ position: Vec3; spin: number; precess: number; lean?: number; scale?: number; trail?: number }> = ({
  position,
  spin,
  precess,
  lean = 0.4,
  scale = 1,
  trail = 0,
}) => (
  <group position={position} scale={scale}>
    <InkCylinder radius={0.55} height={0.04} position={[0, 0.02, 0]} color="#2b4a7a" />
    {trail > 0 && (
      <mesh position={[0, 0.04 + 0.95 * Math.cos(lean), 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.95 * Math.sin(lean) - 0.008, 0.95 * Math.sin(lean) + 0.008, 64, 1, 0, Math.PI * 2 * trail]} />
        <meshBasicMaterial color="#ffd23f" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    )}
    <group position={[0, 0.04, 0]} rotation={[0, precess, 0]}>
      <group rotation={[lean, 0, 0]}>
        <group rotation={[0, spin, 0]}>
          <InkCone radius={0.32} height={0.45} position={[0, 0.225, 0]} rotation={[Math.PI, 0, 0]} color="#3f8fe0" />
          <InkCylinder radius={0.33} height={0.12} position={[0, 0.5, 0]} color="#3fae5a" ink={0.008} />
          {[0, 1, 2, 3].map((k) => (
            <InkBox key={k} size={[0.06, 0.125, 0.02]} position={[Math.sin((k * Math.PI) / 2) * 0.33, 0.5, Math.cos((k * Math.PI) / 2) * 0.33]} rotation={[0, (k * Math.PI) / 2, 0]} color="#ffffff" ink={0} />
          ))}
          <InkCylinder radius={0.03} height={0.4} position={[0, 0.76, 0]} color="#e0262f" ink={0.006} />
        </group>
      </group>
    </group>
  </group>
);

// Wall dial: one tick per degree; the needle advances by `turn` ticks.
export const Dial: React.FC<{ position: Vec3; turn: number }> = ({ position, turn }) => (
  <group position={position}>
    <InkCylinder radius={0.38} height={0.05} rotation={[Math.PI / 2, 0, 0]} color="#fff6dc" />
    {Array.from({ length: 24 }, (_, i) => (
      <InkBox key={i} size={[0.012, 0.06, 0.01]} position={[Math.sin((i / 24) * Math.PI * 2) * 0.32, Math.cos((i / 24) * Math.PI * 2) * 0.32, 0.03]} rotation={[0, 0, -(i / 24) * Math.PI * 2]} color={INK} ink={0} />
    ))}
    <group position={[0, 0, 0.04]} rotation={[0, 0, -turn * ((Math.PI * 2) / 24)]}>
      <InkBox size={[0.03, 0.28, 0.02]} position={[0, 0.13, 0]} color="#d62828" ink={0.004} />
    </group>
    <Ball position={[0, 0, 0.05]} radius={0.035} color={INK} />
  </group>
);

const CONSTELLATIONS: { name: string; dots: [number, number][]; color: string }[] = [
  { name: "LEO", dots: [[-0.3, 0.2], [-0.1, 0.3], [0.1, 0.15], [0.3, 0.1], [0.05, -0.1], [-0.25, -0.15]], color: "#e76f51" },
  { name: "VIRGO", dots: [[-0.35, 0.25], [-0.15, 0.1], [0.0, 0.25], [0.15, 0.05], [0.35, -0.05], [0.05, -0.2], [-0.2, -0.15]], color: "#3fae5a" },
  { name: "LIBRA", dots: [[-0.25, 0.2], [0.0, 0.3], [0.25, 0.2], [-0.2, -0.15], [0.2, -0.15]], color: "#9b5de5" },
  { name: "SCORPIO", dots: [[-0.35, 0.2], [-0.2, 0.1], [-0.05, 0.0], [0.1, -0.1], [0.25, -0.15], [0.35, 0.0], [0.3, 0.15]], color: "#e0262f" },
];
export const PANEL_W = 1.05;
export const panelX = (i: number) => (i - 1.5) * PANEL_W;

// Four zodiac panels in a row (LEO, VIRGO, LIBRA, SCORPIO) and a sun disc at x = sunX in front of them.
export const ConstellationWall: React.FC<{ position: Vec3; sunX: number; f: number; dates?: { i: number; text: string; appear?: number }[] }> = ({ position, sunX, f, dates = [] }) => (
  <group position={position}>
    {CONSTELLATIONS.map((c, i) => (
      <group key={c.name} position={[panelX(i), 0, 0]}>
        <InkBox size={[PANEL_W - 0.06, 1.0, 0.05]} position={[0, 0, 0]} color="#13235e" />
        {c.dots.map(([x, y], k) => (
          <Ball key={k} position={[x, y + 0.08, 0.035]} radius={0.022} color="#ffffff" glow />
        ))}
        <Label text={c.name} position={[0, -0.36, 0.04]} width={0.62} fg="#ffffff" bg={c.color} />
      </group>
    ))}
    {dates.map((d) => (
      <Label key={d.i} text={d.text} position={[panelX(d.i), 0.72, 0.05]} width={0.95} fg={INK} bg="#ffd23f" appear={d.appear} />
    ))}
    <group position={[sunX, 0.12, 0.12]}>
      <Halo position={[0, 0, -0.02]} size={0.9} color="#ffb347" strength={0.7 + 0.1 * Math.sin(f / 4)} />
      <Ball position={[0, 0, 0]} radius={0.15} color="#ffd23f" glow />
    </group>
  </group>
);

// A giant cartoon scorpion facing +z (claws toward camera). `cut` 0..1 drops both claws to the floor.
export const Scorpion: React.FC<{ position: Vec3; cut?: number; f: number; scale?: number }> = ({ position, cut = 0, f, scale = 1 }) => {
  const body = "#c0392b";
  const drop = Math.min(1, cut);
  const bounce = drop >= 1 ? 0 : Math.abs(Math.sin(drop * Math.PI * 2)) * 0.08 * (1 - drop);
  const clawY = 0.32 - drop * 0.26 + bounce;
  const claw = (side: number) => (
    <group key={side} position={[side * 0.42, clawY, 0.62 + drop * 0.15]} rotation={[drop * 0.4, side * (0.3 + drop * 0.8), Math.sin(f / 6) * 0.08 * (1 - drop)]}>
      <InkBox size={[0.08, 0.06, 0.3]} position={[0, 0, -0.15]} color={body} ink={0.008} />
      <InkBox size={[0.07, 0.06, 0.16]} position={[-side * 0.05, 0, 0.06]} rotation={[0, side * 0.4, 0]} color={body} ink={0.008} />
      <InkBox size={[0.07, 0.06, 0.16]} position={[side * 0.06, 0, 0.06]} rotation={[0, -side * 0.4, 0]} color={body} ink={0.008} />
    </group>
  );
  return (
    <group position={position} scale={scale}>
      {[0, 1, 2].map((k) => (
        <InkBox key={k} size={[0.42 - k * 0.04, 0.16, 0.22]} position={[0, 0.2, 0.3 - k * 0.22]} color={body} ink={0.01} />
      ))}
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k / 4) * Math.PI * 0.95;
        return <Ball key={k} position={[0, 0.25 + Math.sin(a) * 0.55, -0.35 - Math.sin(a * 0.5) * 0.3 + (k > 2 ? (k - 2) * 0.12 : 0)]} radius={0.08 - k * 0.006} color={body} />;
      })}
      <InkCone radius={0.05} height={0.14} position={[0, 0.82, -0.05]} rotation={[1.8, 0, 0]} color="#1d1a1a" />
      {[-1, 1].flatMap((side) =>
        [0, 1, 2].map((k) => <InkBox key={`${side}${k}`} size={[0.3, 0.03, 0.03]} position={[side * 0.3, 0.1, 0.25 - k * 0.2]} rotation={[0, 0, side * -0.5]} color="#8a2a20" ink={0.005} />),
      )}
      {/* The claw arms stay on until they are cut. */}
      {cut <= 0 && [-1, 1].map((side) => <InkBox key={side} size={[0.24, 0.05, 0.05]} position={[side * 0.3, 0.26, 0.42]} rotation={[0, side * -0.6, 0]} color={body} ink={0.006} />)}
      <Ball position={[-0.08, 0.3, 0.42]} radius={0.03} color="#ffffff" />
      <Ball position={[0.08, 0.3, 0.42]} radius={0.03} color="#ffffff" />
      {claw(-1)}
      {claw(1)}
    </group>
  );
};

// Giant scissors, blades opening by `open` 0..1.
export const Scissors: React.FC<{ position: Vec3; open: number; rotation?: Vec3 }> = ({ position, open, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    {[-1, 1].map((side) => (
      <group key={side} rotation={[0, 0, side * open * 0.35]}>
        <InkBox size={[0.04, 0.4, 0.02]} position={[0, 0.2, side * 0.012]} color="#c9ced3" ink={0.005} />
        <InkCylinder radius={0.05} height={0.02} rotation={[Math.PI / 2, 0, 0]} position={[side * 0.04, -0.06, side * 0.012]} color="#e0262f" ink={0.005} />
      </group>
    ))}
  </group>
);

// A named star on the wall: glowing ball with a halo.
export const StarLamp: React.FC<{ position: Vec3; f: number; color?: string }> = ({ position, f, color = "#fff4c2" }) => (
  <group position={position}>
    <Halo position={[0, 0, -0.02]} size={0.7} color={color} strength={0.55 + 0.15 * Math.sin(f / 5)} />
    <Ball position={[0, 0, 0]} radius={0.09} color={color} glow />
  </group>
);
