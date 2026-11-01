import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "A Capricorn Schedules Her Fun".
// Parts that touch are kept 1-2 cm apart (or fully inside one another) so no two faces are coplanar.

const INK = "#161212";
const FONT = "'Arial Black', Impact, sans-serif";

export const Ball: React.FC<{ position: Vec3; radius: number; color: string; glow?: boolean; scale?: Vec3 }> = ({ position, radius, color, glow, scale = [1, 1, 1] }) => (
  <group position={position} scale={scale}>
    <mesh castShadow={!glow}>
      <sphereGeometry args={[radius, 20, 16]} />
      {glow ? <meshBasicMaterial color={color} toneMapped={false} /> : <meshToonMaterial color={color} gradientMap={toonRamp} />}
    </mesh>
    {!glow && (
      <mesh scale={1.06}>
        <sphereGeometry args={[radius, 20, 16]} />
        <meshBasicMaterial color={INK} side={THREE.BackSide} />
      </mesh>
    )}
  </group>
);

// Text drawn on a canvas for a screen face (no glow halo, dark text on light).
const useTextTex = (lines: string[], w: number, h: number, fg: string, bg: string, accent?: string) =>
  useMemo(
    () =>
      canvasTexture(1024, Math.round((1024 * h) / w), (ctx) => {
        const H = Math.round((1024 * h) / w);
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1024, H);
        if (accent) {
          ctx.fillStyle = accent;
          ctx.fillRect(0, 0, 1024, H * 0.18);
        }
        const longest = Math.max(...lines.map((l) => l.length));
        let fs = Math.min(H / (lines.length + 0.8), 1600 / Math.max(5, longest));
        ctx.font = `900 ${fs}px ${FONT}`;
        const widest = Math.max(...lines.map((l) => ctx.measureText(l).width));
        if (widest > 900) fs = (fs * 900) / widest;
        ctx.font = `900 ${fs}px ${FONT}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        lines.forEach((l, i) => {
          ctx.fillStyle = i === 0 && accent ? "#ffffff" : fg;
          const y = accent && i === 0 ? H * 0.09 : H / 2 + (i - (lines.length - 1) / 2) * fs * 1.15 + (accent ? H * 0.06 : 0);
          ctx.fillText(l, 512, y);
        });
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines.join("|"), w, h, fg, bg, accent],
  );

// ---------- office ----------

// Glass partition: thin steel frame, a pale glass pane and a frosted band at eye height. Faces +z.
export const GlassWall: React.FC<{ position: Vec3; width: number; height?: number; panes?: number }> = ({ position, width, height = 2.4, panes = 3 }) => (
  <group position={position}>
    <mesh position={[0, height / 2, 0]}>
      <planeGeometry args={[width, height]} />
      <meshBasicMaterial color="#cfeaf5" transparent opacity={0.28} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 1.2, 0.004]}>
      <planeGeometry args={[width, 0.22]} />
      <meshBasicMaterial color="#ffffff" transparent opacity={0.55} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
    {Array.from({ length: panes + 1 }, (_, i) => (
      <InkBox key={i} size={[0.04, height, 0.05]} position={[-width / 2 + (width / panes) * i, height / 2, 0]} color="#5b6b7a" ink={0.004} />
    ))}
    <InkBox size={[width + 0.04, 0.05, 0.06]} position={[0, height + 0.025, 0]} color="#5b6b7a" ink={0.004} />
    <InkBox size={[width + 0.04, 0.06, 0.07]} position={[0, 0.03, 0]} color="#5b6b7a" ink={0.004} />
  </group>
);

// Desk monitor on a stand; the screen is a caller-provided node in front of it (kit Screen).
export const MonitorStand: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.2, 0.02, 0.14]} position={[0, 0.01, 0]} color="#3a3f48" ink={0.003} />
    <InkBox size={[0.04, 0.22, 0.03]} position={[0, 0.13, -0.03]} color="#3a3f48" ink={0.003} />
  </group>
);

// Office task chair on a five-spoke base, seat top at 0.36 m. `tip` 0..1 tips it over backwards.
export const TaskChair: React.FC<{ position: Vec3; color?: string; tip?: number; rotationY?: number }> = ({ position, color = "#2b3a55", tip = 0, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <group position={[0, 0, -0.25]} rotation={[-tip * 1.45, 0, 0]}>
      <group position={[0, 0, 0.25]}>
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <group key={i}>
              <InkBox size={[0.03, 0.03, 0.26]} position={[Math.sin(a) * 0.12, 0.05, Math.cos(a) * 0.12]} rotation={[0, a, 0]} color="#2a2a30" ink={0.003} />
              <Ball position={[Math.sin(a) * 0.24, 0.025, Math.cos(a) * 0.24]} radius={0.025} color="#2a2a30" />
            </group>
          );
        })}
        <InkCylinder radius={0.025} height={0.26} position={[0, 0.19, 0]} color="#8a8f98" ink={0.003} />
        <InkBox size={[0.44, 0.06, 0.42]} position={[0, 0.34, 0]} color={color} />
        <InkBox size={[0.42, 0.5, 0.06]} position={[0, 0.66, -0.2]} color={color} />
      </group>
    </group>
  </group>
);

// Round wall clock showing a time; faces +z.
export const WallClock: React.FC<{ position: Vec3; hour: number; minute: number; size?: number }> = ({ position, hour, minute, size = 0.34 }) => {
  const ha = -((hour % 12) + minute / 60) * (Math.PI / 6);
  const ma = -minute * (Math.PI / 30);
  return (
    <group position={position}>
      <InkCylinder radius={size / 2} height={0.04} rotation={[Math.PI / 2, 0, 0]} color="#ffffff" ink={0.01} />
      {Array.from({ length: 12 }, (_, i) => (
        <InkBox key={i} size={[0.012, 0.03, 0.004]} position={[Math.sin((i * Math.PI) / 6) * size * 0.4, Math.cos((i * Math.PI) / 6) * size * 0.4, 0.024]} rotation={[0, 0, -(i * Math.PI) / 6]} color={INK} ink={0} />
      ))}
      <group position={[0, 0, 0.028]} rotation={[0, 0, ha]}>
        <InkBox size={[0.018, size * 0.24, 0.004]} position={[0, size * 0.12, 0]} color={INK} ink={0} />
      </group>
      <group position={[0, 0, 0.033]} rotation={[0, 0, ma]}>
        <InkBox size={[0.012, size * 0.36, 0.004]} position={[0, size * 0.18, 0]} color="#e0262f" ink={0} />
      </group>
    </group>
  );
};

// Small desk clutter: keyboard, mug and a paper tray, sitting on a desk top at height y.
export const DeskClutter: React.FC<{ x: number; y: number; z: number; mug?: string }> = ({ x, y, z, mug = "#e0262f" }) => (
  <group position={[x, y, z]}>
    <InkBox size={[0.36, 0.02, 0.12]} position={[0, 0.012, 0.12]} color="#e6ecf2" ink={0.003} />
    <InkCylinder radius={0.04} height={0.1} position={[0.32, 0.052, 0.08]} color={mug} ink={0.003} />
    <InkBox size={[0.24, 0.05, 0.18]} position={[-0.42, 0.027, 0.0]} color="#3a3f48" ink={0.003} />
    <InkBox size={[0.2, 0.012, 0.15]} position={[-0.42, 0.06, 0.0]} color="#ffffff" ink={0} />
  </group>
);

// ---------- laptop ----------

// Laptop: base on the table, lid hinged at the back; `open` 0 = shut, 1 = open (about 105 deg). Screen faces +z.
export const Laptop: React.FC<{ position: Vec3; rotation?: Vec3; open?: number; text?: string; scale?: number; glow?: string }> = ({ position, rotation = [0, 0, 0], open = 1, text = "WORK", scale = 1, glow = "#bfe3ff" }) => {
  const tex = useTextTex(text.split("\n"), 0.3, 0.19, "#13235e", glow);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <InkBox size={[0.34, 0.02, 0.23]} position={[0, 0.01, 0]} color="#8a9099" ink={0.003} />
      <InkBox size={[0.28, 0.004, 0.1]} position={[0, 0.022, -0.03]} color="#3a3f48" ink={0} />
      <group position={[0, 0.02, -0.115]} rotation={[-(1 - open) * 1.83 + 0.0, 0, 0]}>
        <group rotation={[-0.25 * open, 0, 0]}>
          <InkBox size={[0.34, 0.22, 0.014]} position={[0, 0.11, 0]} color="#8a9099" ink={0.003} />
          {open > 0.15 && (
            <mesh position={[0, 0.11, 0.0085]}>
              <planeGeometry args={[0.3, 0.19]} />
              <meshBasicMaterial map={tex} toneMapped={false} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
};

// A closed laptop held upright against the chest (world space, in front of a front-facing puppet). Ghost for collide.
export const HeldLaptop: React.FC<{ at: [number, number]; y?: number; dx?: number; tilt?: number }> = ({ at, y = 0.5, dx = 0, tilt = 0 }) => (
  <group position={[at[0] + dx, y, at[1] + 0.09]} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
    <InkBox size={[0.34, 0.23, 0.035]} position={[0, 0, 0]} color="#8a9099" ink={0.004} />
    <InkBox size={[0.3, 0.004, 0.02]} position={[0, -0.1, 0.01]} color="#5b6170" ink={0} />
  </group>
);

// ---------- planner wall ----------

// A wall planner: white board, red header and a grid of cells; `cells` text by index (row-major), `hot` cell index
// drawn red. Faces +z.
export const Planner: React.FC<{ position: Vec3; title: string; cols: number; rows: number; cells?: Record<number, string>; hot?: number; width?: number; height?: number }> = ({
  position,
  title,
  cols,
  rows,
  cells = {},
  hot = -1,
  width = 2.2,
  height = 1.4,
}) => {
  const key = JSON.stringify(cells) + hot + title;
  const tex = useMemo(
    () =>
      canvasTexture(1024, Math.round((1024 * height) / width), (ctx) => {
        const W = 1024;
        const H = Math.round((1024 * height) / width);
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, W, H);
        const head = H * 0.2;
        ctx.fillStyle = "#e0262f";
        ctx.fillRect(0, 0, W, head);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${head * 0.62}px ${FONT}`;
        ctx.fillText(title, W / 2, head / 2);
        const cw = W / cols;
        const ch = (H - head) / rows;
        ctx.strokeStyle = "#c9ced3";
        ctx.lineWidth = 4;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            const x = c * cw;
            const y = head + r * ch;
            if (i === hot) {
              ctx.fillStyle = "#e0262f";
              ctx.fillRect(x + 4, y + 4, cw - 8, ch - 8);
            }
            ctx.strokeRect(x, y, cw, ch);
            if (cells[i]) {
              const ls = cells[i].split("\n");
              let fs = Math.min(ch / (ls.length + 0.6), (cw * 1.5) / Math.max(4, ...ls.map((l) => l.length)));
              ctx.font = `900 ${fs}px ${FONT}`;
              const widest = Math.max(...ls.map((l) => ctx.measureText(l).width));
              if (widest > cw * 0.88) fs = (fs * cw * 0.88) / widest;
              ctx.font = `900 ${fs}px ${FONT}`;
              ctx.fillStyle = i === hot ? "#ffffff" : "#13235e";
              ls.forEach((l, k) => ctx.fillText(l, x + cw / 2, y + ch / 2 + (k - (ls.length - 1) / 2) * fs * 1.1));
            }
          }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, W - 16, H - 16);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, cols, rows, width, height],
  );
  return (
    <group position={position}>
      <InkBox size={[width + 0.06, height + 0.06, 0.04]} position={[0, 0, 0]} color="#3a3f48" ink={0.006} />
      <mesh position={[0, 0, 0.022]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---------- bank ----------

export const PiggyBank: React.FC<{ position: Vec3; scale?: number; color?: string; squash?: Vec3 }> = ({ position, scale = 1, color = "#ff8fc8", squash = [1, 1, 1] }) => (
  <group position={position} scale={[scale * squash[0], scale * squash[1], scale * squash[2]]}>
    <Ball position={[0, 0.16, 0]} radius={0.14} color={color} scale={[1.25, 1, 1]} />
    <InkCylinder radius={0.045} height={0.05} position={[0.19, 0.17, 0]} rotation={[0, 0, Math.PI / 2]} color={color} ink={0.004} />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkCylinder key={`${sx}${sz}`} radius={0.025} height={0.06} position={[sx * 0.09, 0.03, sz * 0.06]} color={color} ink={0.003} />),
    )}
    <InkBox size={[0.06, 0.012, 0.012]} position={[0, 0.305, 0]} color={INK} ink={0} />
    <Ball position={[0.13, 0.24, 0.08]} radius={0.016} color={INK} />
  </group>
);

export const Coin: React.FC<{ position: Vec3 }> = ({ position }) => (
  <InkCylinder radius={0.035} height={0.008} position={position} rotation={[Math.PI / 2, 0, 0]} color="#ffcc33" ink={0.003} />
);

// Queue post with a rope to the next post at +gap on x.
export const QueuePosts: React.FC<{ position: Vec3; count: number; gap?: number }> = ({ position, count, gap = 0.8 }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => (
      <group key={i} position={[i * gap, 0, 0]}>
        <InkCylinder radius={0.1} height={0.03} position={[0, 0.015, 0]} color="#d4a63a" ink={0.004} />
        <InkCylinder radius={0.022} height={0.9} position={[0, 0.47, 0]} color="#d4a63a" ink={0.003} />
        <Ball position={[0, 0.94, 0]} radius={0.035} color="#d4a63a" />
        {i < count - 1 && (
          <mesh position={[gap / 2, 0.78, 0]} rotation={[0, 0, Math.PI / 2]}>
            <torusGeometry args={[gap / 2, 0.014, 6, 24, Math.PI]} />
            <meshToonMaterial color="#a0182a" gradientMap={toonRamp} />
          </mesh>
        )}
      </group>
    ))}
  </group>
);

// Cake with a few candles and a number flag.
export const Cake: React.FC<{ position: Vec3; label?: string; flame?: number }> = ({ position, label = "26", flame = 0 }) => (
  <group position={position}>
    <InkCylinder radius={0.13} height={0.12} position={[0, 0.06, 0]} color="#fff6dc" ink={0.004} />
    <InkCylinder radius={0.135} height={0.03} position={[0, 0.115, 0]} color="#ff8fc8" ink={0.003} />
    {[-0.06, 0, 0.06].map((x) => (
      <group key={x}>
        <InkCylinder radius={0.008} height={0.07} position={[x, 0.165, 0]} color="#4f7dff" ink={0} />
        <Ball position={[x, 0.21 + Math.sin(flame + x * 30) * 0.004, 0]} radius={0.012} color="#ffcc33" glow scale={[1, 1.6, 1]} />
      </group>
    ))}
    <Label text={label} position={[0, 0.07, 0.138]} width={0.13} fg="#e0262f" bg="#fff6dc" />
  </group>
);

// ---------- chat / lounge ----------

export const Couch: React.FC<{ position: Vec3; color?: string; width?: number }> = ({ position, color = "#e8590c", width = 2.0 }) => (
  <group position={position}>
    <InkBox size={[width - 0.36, 0.26, 0.7]} position={[0, 0.17, 0.02]} color={color} />
    <InkBox size={[width - 0.4, 0.08, 0.6]} position={[0, 0.3, 0.06]} color={color} />
    <InkBox size={[width - 0.04, 0.62, 0.2]} position={[0, 0.5, -0.33]} color={color} />
    {[-1, 1].map((s) => (
      <InkBox key={s} size={[0.18, 0.5, 0.78]} position={[s * (width / 2 - 0.09), 0.25, 0]} color={color} />
    ))}
  </group>
);

// Giant phone standing upright (screen faces +z) with chat bubbles. `bubbles` = [text, fromMe][].
export const ChatPhone: React.FC<{ position: Vec3; bubbles: [string, boolean, number?][]; scale?: number }> = ({ position, bubbles, scale = 1 }) => (
  <group position={position} scale={scale}>
    <InkBox size={[1.0, 1.9, 0.1]} position={[0, 0.95, 0]} color="#1d1a1a" />
    <mesh position={[0, 0.95, 0.052]}>
      <planeGeometry args={[0.9, 1.7]} />
      <meshBasicMaterial color="#fff0f6" toneMapped={false} />
    </mesh>
    <InkBox size={[0.22, 0.04, 0.02]} position={[0, 1.82, 0.06]} color="#3a3a44" ink={0} />
    {bubbles.map(([t, me, appear], i) => (
      <Label key={i} text={t} position={[me ? 0.16 : -0.16, 1.55 - i * 0.32, 0.06]} width={0.55} fg={me ? "#ffffff" : "#13235e"} bg={me ? "#4f7dff" : "#ffffff"} appear={appear} />
    ))}
  </group>
);

// Coffee table: top at 0.4 m on four legs.
export const CoffeeTable: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#ffffff" }) => (
  <group position={position}>
    <InkBox size={[0.9, 0.05, 0.45]} position={[0, 0.4, 0]} color={color} />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, 0.38, 0.04]} position={[sx * 0.4, 0.19, sz * 0.18]} color="#c2185b" ink={0.003} />),
    )}
  </group>
);

// ---------- party ----------

// Confetti cannon: a striped tube on a twist base, labelled PARTY; it points along its local +y. `fire` 0..1 kicks it.
export const ConfettiCannon: React.FC<{ position: Vec3; rotation?: Vec3; fire?: number; scale?: number }> = ({ position, rotation = [0, 0, 0], fire = 0, scale = 1 }) => {
  const kick = Math.sin(Math.min(1, fire * 3) * Math.PI) * 0.03;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <group position={[0, -kick, 0]}>
        <InkCylinder radius={0.05} height={0.1} position={[0, 0.05, 0]} color="#ffd23f" ink={0.004} />
        <InkCylinder radius={0.06} height={0.26} position={[0, 0.23, 0]} color="#e0262f" ink={0.004} />
        {[0.15, 0.25].map((y) => (
          <InkCylinder key={y} radius={0.0615} height={0.025} position={[0, y, 0]} color="#ffffff" ink={0} />
        ))}
        <InkCylinder radius={0.066} height={0.02} position={[0, 0.37, 0]} color="#4f7dff" ink={0.003} />
        <Label text="PARTY" position={[0, 0.2, 0.066]} width={0.12} fg="#ffffff" bg="#13235e" />
      </group>
    </group>
  );
};

const CONFETTI_COLORS = ["#e0262f", "#ffd23f", "#4f7dff", "#3fae5a", "#ff8fc8", "#9b5de5", "#ffffff"];
const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

// A burst of confetti from `from` toward `to` (world), spreading in a cone, then drifting down. `t` = frames since fire.
export const ConfettiBurst: React.FC<{ from: Vec3; to: Vec3; t: number; count?: number; spread?: number; size?: number }> = ({ from, to, t, count = 90, spread = 0.35, size = 0.035 }) => {
  if (t < 0) return null;
  return (
    <group userData={{ ghost: true }}>
      {Array.from({ length: count }, (_, i) => {
        const speed = 0.7 + rnd(i) * 0.5;
        const p = Math.min(1, (t / 9) * speed);
        const fly = 1 - (1 - p) ** 2;
        const after = Math.max(0, t - 9 / speed);
        const off: Vec3 = [(rnd(i + 1) - 0.5) * spread * 2, (rnd(i + 2) - 0.5) * spread * 2, (rnd(i + 3) - 0.5) * spread];
        const x = from[0] + (to[0] - from[0] + off[0]) * fly + Math.sin(after * 0.2 + i) * 0.03 * Math.min(1, after / 10);
        const y = from[1] + (to[1] - from[1] + off[1]) * fly - after * 0.012 * (0.6 + rnd(i + 4));
        const z = from[2] + (to[2] - from[2] + off[2]) * fly;
        if (y < 0.01) return null;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[t * 0.3 + i, t * 0.2 + i * 2, i]}>
            <planeGeometry args={[size, size * 0.6]} />
            <meshBasicMaterial color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// Confetti lying on the floor (or on a puppet) in a patch around (x, z); y lifts it.
export const ConfettiPatch: React.FC<{ x: number; z: number; w: number; d: number; y?: number; count?: number; seed?: number }> = ({ x, z, w, d, y = 0.006, count = 70, seed = 0 }) => (
  <group userData={{ ghost: true }}>
    {Array.from({ length: count }, (_, i) => (
      <mesh key={i} position={[x + (rnd(i + seed) - 0.5) * w, y + rnd(i + seed + 9) * 0.004, z + (rnd(i + seed + 5) - 0.5) * d]} rotation={[-Math.PI / 2, 0, rnd(i + seed + 7) * 6]}>
        <planeGeometry args={[0.035, 0.022]} />
        <meshBasicMaterial color={CONFETTI_COLORS[i % CONFETTI_COLORS.length]} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

// Balloon on a string tied at `anchor` (the string's foot); it floats `h` above and sways with `f`.
export const Balloon: React.FC<{ anchor: Vec3; color: string; h?: number; f?: number; seed?: number }> = ({ anchor, color, h = 0.7, f = 0, seed = 0 }) => {
  const sx = Math.sin(f * 0.06 + seed) * 0.05;
  const top: Vec3 = [anchor[0] + sx, anchor[1] + h, anchor[2]];
  const len = Math.hypot(sx, h);
  return (
    <group userData={{ ghost: true }}>
      <Ball position={[top[0], top[1] + 0.14, top[2]]} radius={0.14} color={color} scale={[1, 1.2, 1]} />
      <mesh position={[anchor[0] + sx / 2, anchor[1] + h / 2, anchor[2]]} rotation={[0, 0, -Math.atan2(sx, h)]}>
        <cylinderGeometry args={[0.004, 0.004, len, 4]} />
        <meshBasicMaterial color={INK} />
      </mesh>
    </group>
  );
};

// Bunting: a row of triangle flags along x between two points on the wall.
export const Bunting: React.FC<{ y: number; z: number; from: number; to: number; sag?: number }> = ({ y, z, from, to, sag = 0.18 }) => {
  const n = Math.round((to - from) / 0.22);
  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const u = (i + 0.5) / n;
        const x = from + (to - from) * u;
        const yy = y - Math.sin(u * Math.PI) * sag;
        return (
          <mesh key={i} position={[x, yy - 0.08, z]} rotation={[0, 0, Math.PI]}>
            <circleGeometry args={[0.1, 3]} />
            <meshBasicMaterial color={CONFETTI_COLORS[i % 6]} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// Long meeting table (top at 0.74 m) on two pedestal legs.
export const MeetingTable: React.FC<{ position: Vec3; size?: [number, number]; color?: string }> = ({ position, size = [2.4, 0.9], color = "#5a3a2a" }) => (
  <group position={position}>
    <InkBox size={[size[0], 0.05, size[1]]} position={[0, 0.74, 0]} color={color} />
    {[-1, 1].map((s) => (
      <group key={s}>
        <InkBox size={[0.1, 0.7, size[1] * 0.5]} position={[s * size[0] * 0.32, 0.36, 0]} color="#2a2a30" ink={0.004} />
        <InkBox size={[0.3, 0.03, size[1] * 0.7]} position={[s * size[0] * 0.32, 0.015, 0]} color="#2a2a30" ink={0.003} />
      </group>
    ))}
  </group>
);

// A kitchen timer with a readout; `ring` shakes it.
export const Timer: React.FC<{ position: Vec3; text: string; ring?: number }> = ({ position, text, ring = 0 }) => (
  <group position={position} rotation={[0, 0, Math.sin(ring * 2.2) * 0.15 * (ring > 0 ? 1 : 0)]}>
    <InkBox size={[0.3, 0.2, 0.12]} position={[0, 0.1, 0]} color="#e0262f" />
    <InkCylinder radius={0.03} height={0.05} position={[0, 0.22, 0]} color="#ffd23f" ink={0.003} />
    <Label text={text} position={[0, 0.1, 0.062]} width={0.24} fg="#3fae5a" bg="#13235e" border={false} />
  </group>
);

// ---------- pool ----------

export const Lounger: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#ffffff" }) => (
  <group position={position}>
    <InkBox size={[0.6, 0.06, 1.5]} position={[0, 0.3, 0]} color={color} />
    <InkBox size={[0.6, 0.06, 0.6]} position={[0, 0.48, -0.86]} rotation={[0.75, 0, 0]} color={color} />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, 0.27, 0.04]} position={[sx * 0.26, 0.135, sz * 0.66]} color="#8a8f98" ink={0.003} />),
    )}
    <InkBox size={[0.5, 0.03, 0.5]} position={[0, 0.345, 0.45]} color="#ff6b5a" ink={0.003} />
  </group>
);

export const Parasol: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkCylinder radius={0.025} height={2.1} position={[0, 1.05, 0]} color="#ffffff" ink={0.003} />
    <InkCylinder radius={0.25} height={0.04} position={[0, 0.02, 0]} color="#8a8f98" ink={0.003} />
    {Array.from({ length: 8 }, (_, i) => (
      <mesh key={i} position={[0, 2.12, 0]} rotation={[0, (i * Math.PI) / 4, 0]}>
        <coneGeometry args={[1.0, 0.36, 2, 1, true, 0, Math.PI / 4]} />
        <meshToonMaterial color={i % 2 ? "#ffffff" : "#ff6b5a"} side={THREE.DoubleSide} gradientMap={toonRamp} />
      </mesh>
    ))}
  </group>
);

export const Palm: React.FC<{ position: Vec3; scale?: number; f?: number }> = ({ position, scale = 1, f = 0 }) => (
  <group position={position} scale={scale}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <InkCylinder key={i} radius={0.09 - i * 0.008} height={0.42} position={[Math.sin(i * 0.4) * 0.05 * i, 0.21 + i * 0.4, 0]} rotation={[0, 0, -0.05 * i]} color={i % 2 ? "#a8784a" : "#8a5a3a"} ink={0.004} />
    ))}
    {Array.from({ length: 7 }, (_, i) => {
      const a = (i / 7) * Math.PI * 2;
      return (
        <group key={i} position={[0.35, 2.5, 0]} rotation={[0, a, 0]}>
          <InkBox size={[0.9, 0.03, 0.22]} position={[0.45, -0.15 + Math.sin(f * 0.08 + i) * 0.03, 0]} rotation={[0, 0, -0.35]} color="#3fae5a" ink={0.004} />
        </group>
      );
    })}
  </group>
);

// Rectangular pool cut into the floor: water surface just below the deck, a tiled rim and a chrome ladder.
export const Pool: React.FC<{ position: Vec3; size: [number, number]; f: number }> = ({ position, size, f }) => {
  const [w, d] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshBasicMaterial color="#2ec4c4" toneMapped={false} />
      </mesh>
      {Array.from({ length: 9 }, (_, i) => (
        <mesh key={i} position={[((i * 0.37) % 1 - 0.5) * w * 0.8 + Math.sin(f * 0.05 + i) * 0.1, 0.016, ((i * 0.61) % 1 - 0.5) * d * 0.8]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 0.025]} />
          <meshBasicMaterial color="#bff6f2" toneMapped={false} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <InkBox key={`x${s}`} size={[w + 0.3, 0.05, 0.15]} position={[0, 0.025, s * (d / 2 + 0.075)]} color="#f2e6c8" ink={0.004} />
      ))}
      {[-1, 1].map((s) => (
        <InkBox key={`z${s}`} size={[0.15, 0.05, d]} position={[s * (w / 2 + 0.075), 0.025, 0]} color="#f2e6c8" ink={0.004} />
      ))}
      {[-0.15, 0.15].map((x) => (
        <mesh key={x} position={[w / 2 - 0.5 + x, 0.25, d / 2 + 0.08]}>
          <torusGeometry args={[0.18, 0.015, 6, 16, Math.PI]} />
          <meshToonMaterial color="#e6ecf2" gradientMap={toonRamp} />
        </mesh>
      ))}
    </group>
  );
};

export const BeachBall: React.FC<{ position: Vec3; spin?: number }> = ({ position, spin = 0 }) => (
  <group position={position} rotation={[spin, spin * 0.7, 0]} userData={{ ghost: true }}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <mesh key={i} rotation={[0, (i * Math.PI) / 3, 0]}>
        <sphereGeometry args={[0.13, 12, 10, 0, Math.PI / 3]} />
        <meshToonMaterial color={["#e0262f", "#ffffff", "#ffd23f", "#ffffff", "#4f7dff", "#ffffff"][i]} gradientMap={toonRamp} />
      </mesh>
    ))}
    <mesh scale={1.06}>
      <sphereGeometry args={[0.13, 16, 12]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// ---------- mountain ----------

// A faceted stone cliff: a stack of grey slabs forming a wall, front face at z = 0 of its group, `height` tall.
export const Cliff: React.FC<{ position: Vec3; width: number; height: number; seed?: number; color?: string }> = ({ position, width, height, seed = 0, color = "#9a9aa6" }) => {
  const cols = Math.round(width / 0.55);
  return (
    <group position={position}>
      <InkBox size={[width, height, 0.6]} position={[0, height / 2, -0.4]} color="#6d6d80" ink={0} />
      {Array.from({ length: cols }, (_, i) => {
        const h = height * (0.75 + rnd(i + seed) * 0.25);
        const x = -width / 2 + (i + 0.5) * (width / cols);
        return <InkBox key={i} size={[width / cols + 0.02, h, 0.3 + rnd(i + seed + 3) * 0.12]} position={[x, h / 2, -0.15 - rnd(i + seed + 5) * 0.08]} color={i % 2 ? color : "#8a8a98"} ink={0.006} />;
      })}
      {Array.from({ length: Math.round(cols / 2) }, (_, i) => (
        <InkBox key={`l${i}`} size={[0.4, 0.06, 0.22]} position={[-width / 2 + 0.4 + i * 1.1, 0.6 + rnd(i + seed + 9) * (height - 1), 0.02]} color="#b4b4c0" ink={0.004} />
      ))}
    </group>
  );
};

// Steel ladder bolted to the rock: two rails and rungs, `height` tall, front at z = 0.
export const Ladder: React.FC<{ position: Vec3; height: number; width?: number }> = ({ position, height, width = 0.5 }) => {
  const n = Math.floor(height / 0.28);
  return (
    <group position={position}>
      {[-1, 1].map((s) => (
        <InkBox key={s} size={[0.04, height, 0.04]} position={[(s * width) / 2, height / 2, 0]} color="#c9ced3" ink={0.004} />
      ))}
      {Array.from({ length: n }, (_, i) => (
        <InkCylinder key={i} radius={0.014} height={width} position={[0, 0.25 + i * 0.28, 0]} rotation={[0, 0, Math.PI / 2]} color="#e6ecf2" ink={0.003} />
      ))}
      {Array.from({ length: Math.floor(height / 1.2) }, (_, i) => (
        <InkBox key={`b${i}`} size={[width + 0.1, 0.03, 0.12]} position={[0, 0.6 + i * 1.2, -0.06]} color="#5b6170" ink={0.003} />
      ))}
    </group>
  );
};

// Flat cel cloud puffs facing +z.
export const Cloud: React.FC<{ position: Vec3; scale?: number; color?: string }> = ({ position, scale = 1, color = "#f2f4ff" }) => (
  <group position={position} scale={scale}>
    {[
      [-0.45, 0, 0.32],
      [0, 0.12, 0.42],
      [0.45, 0, 0.32],
      [0.2, -0.06, 0.3],
      [-0.2, -0.08, 0.3],
    ].map(([x, y, r], i) => (
      <mesh key={i} position={[x, y, i * 0.01]}>
        <circleGeometry args={[r, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    ))}
  </group>
);

// Rubber stamp on a rock: wooden handle, red pad, APPROVED label; `dust` 0..1 grey layer and a cobweb.
export const Stamp: React.FC<{ position: Vec3; dust?: number; lift?: number; scale?: number }> = ({ position, dust = 1, lift = 0, scale = 1 }) => (
  <group position={position} scale={scale}>
    <group position={[0, lift, 0]}>
      <InkBox size={[0.36, 0.08, 0.2]} position={[0, 0.04, 0]} color="#e0262f" />
      <InkBox size={[0.3, 0.06, 0.14]} position={[0, 0.11, 0]} color="#a8784a" ink={0.004} />
      <InkCylinder radius={0.03} height={0.14} position={[0, 0.21, 0]} color="#a8784a" ink={0.004} />
      <Ball position={[0, 0.31, 0]} radius={0.06} color="#8a5a3a" />
      <Label text="APPROVED" position={[0, 0.045, 0.102]} width={0.3} fg="#e0262f" bg="#fff6dc" />
      {dust > 0.02 && (
        <>
          <InkBox size={[0.37, 0.012 * dust + 0.002, 0.21]} position={[0, 0.087 + 0.006 * dust, 0]} color="#c9c2b0" ink={0} />
          <Ball position={[0, 0.372, 0]} radius={0.04} color="#c9c2b0" scale={[1.5, 0.35 * dust + 0.05, 1.5]} />
        </>
      )}
    </group>
    {dust > 0.5 && (
      <group position={[0.17, 0.2, 0.0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0.06, 0.05, 0.11]} rotation={[0, 0, -0.3 + i * 0.4]}>
            <planeGeometry args={[0.2, 0.004]} />
            <meshBasicMaterial color="#e8e8f0" transparent opacity={0.8} toneMapped={false} />
          </mesh>
        ))}
      </group>
    )}
  </group>
);

// Dust puffs blown off something at `position`; `t` = frames since the blow.
export const DustPuff: React.FC<{ position: Vec3; t: number }> = ({ position, t }) => {
  if (t < 0 || t > 40) return null;
  const p = t / 40;
  return (
    <group position={position} userData={{ ghost: true }}>
      {Array.from({ length: 7 }, (_, i) => (
        <mesh key={i} position={[(rnd(i) - 0.5) * 0.4 * (0.4 + p), 0.05 + p * (0.15 + rnd(i + 2) * 0.25), 0.05 + rnd(i + 4) * 0.1]}>
          <circleGeometry args={[0.04 + p * 0.06, 16]} />
          <meshBasicMaterial color="#d8d0bc" transparent opacity={0.85 * (1 - p)} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

// A big dial on a post: numbers 0..10 round the top, a needle at `value`, a FUN label. Faces +z.
export const FunDial: React.FC<{ position: Vec3; value: number; scale?: number }> = ({ position, value, scale = 1 }) => {
  const face = useMemo(
    () =>
      canvasTexture(512, 512, (ctx) => {
        ctx.fillStyle = "#fff6dc";
        ctx.beginPath();
        ctx.arc(256, 256, 250, 0, Math.PI * 2);
        ctx.fill();
        // Red zone 0-2, then green.
        for (let k = 0; k <= 10; k++) {
          const a = Math.PI * (1 - k / 10);
          ctx.strokeStyle = k <= 2 ? "#e0262f" : "#3fae5a";
          ctx.lineWidth = 14;
          ctx.beginPath();
          ctx.moveTo(256 + Math.cos(a) * 200, 290 - Math.sin(a) * 200);
          ctx.lineTo(256 + Math.cos(a) * 235, 290 - Math.sin(a) * 235);
          ctx.stroke();
          if (k % 2 === 0) {
            ctx.fillStyle = INK;
            ctx.font = `900 46px ${FONT}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(k), 256 + Math.cos(a) * 160, 290 - Math.sin(a) * 160);
          }
        }
      }),
    [],
  );
  const a = Math.PI * (1 - value / 10) - Math.PI / 2;
  return (
    <group position={position} scale={scale}>
      <InkBox size={[0.08, 1.0, 0.08]} position={[0, 0.5, -0.06]} color="#5b6170" ink={0.004} />
      <group position={[0, 1.2, 0]}>
        <InkCylinder radius={0.32} height={0.06} rotation={[Math.PI / 2, 0, 0]} color="#13235e" ink={0.01} />
        <mesh position={[0, 0, 0.032]}>
          <circleGeometry args={[0.29, 40]} />
          <meshBasicMaterial map={face} toneMapped={false} />
        </mesh>
        <group position={[0, -0.04, 0.04]} rotation={[0, 0, a]}>
          <InkBox size={[0.025, 0.22, 0.01]} position={[0, 0.11, 0]} color="#e0262f" ink={0.002} />
        </group>
        <Ball position={[0, -0.04, 0.045]} radius={0.03} color={INK} />
        <Label text="FUN" position={[0, -0.17, 0.05]} width={0.26} fg="#ffffff" bg="#e0262f" />
      </group>
    </group>
  );
};

// ---------- study / folder ----------

// Ring folder lying on a desk (top-down reads best). Closed it shows IMPORTANT on its cover; `open` 0..1 swings the
// cover over to the left on its spine at x = 0, and `cards` 0..1 fans the birthday cards inside.
export const CardFolder: React.FC<{ position: Vec3; rotationY?: number; open?: number; cards?: number }> = ({ position, rotationY = 0, open = 0, cards = 0 }) => {
  const hingeY = 0.052 - 0.034 * open;
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* back cover */}
      <InkBox size={[0.32, 0.012, 0.42]} position={[0.165, 0.006, 0]} color="#13235e" ink={0.003} />
      {[0, 1, 2, 3, 4].map((i) => {
        const fan = cards * (i - 2) * 0.16;
        return (
          <group key={i} position={[0.165, 0.016 + i * 0.006, 0]} rotation={[0, fan, 0]}>
            <InkBox size={[0.22, 0.004, 0.3]} position={[0, 0, 0]} color={["#ff8fc8", "#ffd23f", "#4f7dff", "#3fae5a", "#ffffff"][i]} ink={0.002} />
            {i === 4 && <Label text={"HAPPY\nBIRTHDAY"} position={[0, 0.003, -0.02]} rotation={[-Math.PI / 2, 0, 0]} width={0.18} fg="#e0262f" bg="#ffffff" border={false} />}
            {i === 4 && <Label text="♥" position={[0, 0.003, 0.09]} rotation={[-Math.PI / 2, 0, 0]} width={0.08} fg="#e0262f" bg="#ffffff" border={false} />}
          </group>
        );
      })}
      {/* front cover on the spine */}
      <group position={[0, hingeY, 0]} rotation={[0, 0, Math.PI * open]}>
        <InkBox size={[0.32, 0.012, 0.42]} position={[0.165, 0.006, 0]} color="#13235e" ink={0.003} />
        <Label text="IMPORTANT" position={[0.165, 0.0135, 0.02]} rotation={[-Math.PI / 2, 0, 0]} width={0.28} fg="#ffffff" bg="#e0262f" />
      </group>
    </group>
  );
};

// A birthday card held up (world space, faces +z). Ghost so a held card never counts as a collision.
export const HeldCard: React.FC<{ position: Vec3; open?: number; tilt?: number }> = ({ position, open = 1, tilt = 0 }) => (
  <group position={position} rotation={[0, 0, tilt]} userData={{ ghost: true }}>
    <InkBox size={[0.16, 0.22, 0.008]} position={[0, 0, 0]} color="#ff8fc8" ink={0.003} />
    <group position={[-0.08, 0, 0.006]} rotation={[0, -open * 0.6, 0]}>
      <InkBox size={[0.16, 0.22, 0.006]} position={[0.08, 0, 0]} color="#ffffff" ink={0.003} />
      <Label text={"HAPPY\nB-DAY ♥"} position={[0.08, 0, 0.005]} width={0.14} fg="#e0262f" bg="#ffffff" border={false} />
    </group>
  </group>
);
