import React, { useMemo } from "react";
import * as THREE from "three";
import { canvasTexture, Halo, InkBox, InkCylinder, Label, toonRamp, Vec3 } from "../../engine";

// Props for "Why Your Gym Wants You To Skip".

const INK = "#161212";
const BLOCK_FONT = "Arial Black, Impact, sans-serif";

// Brass service bell labelled AUTOPAY. `press` 0..1 pushes the plunger; `ring` 0..1 shows ring waves.
export const DeskBell: React.FC<{ position: Vec3; press?: number; ring?: number; scale?: number; squash?: Vec3 }> = ({ position, press = 0, ring = 0, scale = 1, squash = [1, 1, 1] }) => (
  <group position={position} scale={[scale * squash[0], scale * squash[1], scale * squash[2]]}>
    <InkCylinder radius={0.11} height={0.025} position={[0, 0.0125, 0]} color="#3a2a20" ink={0.006} />
    <mesh position={[0, 0.025, 0]} castShadow>
      <sphereGeometry args={[0.09, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshToonMaterial color="#e8b04a" gradientMap={toonRamp} />
    </mesh>
    <InkCylinder radius={0.008} height={0.05} position={[0, 0.13 - press * 0.03, 0]} color="#c9ced3" ink={0.003} />
    <mesh position={[0, 0.16 - press * 0.03, 0]}>
      <sphereGeometry args={[0.018, 12, 12]} />
      <meshToonMaterial color="#c9ced3" gradientMap={toonRamp} />
    </mesh>
    <Label text="AUTOPAY" position={[0, 0.035, 0.13]} width={0.24} fg="#ffffff" bg="#d62828" />
    {ring > 0 &&
      [0, 1, 2].map((k) => {
        const r = 0.12 + ((ring * 3 + k / 3) % 1) * 0.25;
        return (
          <mesh key={k} position={[0, 0.08, 0]} rotation={[0, 0, 0]}>
            <torusGeometry args={[r, 0.006, 6, 48]} />
            <meshBasicMaterial color="#fff4c2" transparent opacity={1 - (r - 0.12) / 0.25} toneMapped={false} />
          </mesh>
        );
      })}
  </group>
);

// Membership card lying flat on a desk.
export const MemberCard: React.FC<{ position: Vec3; price: string; rotationZ?: number; width?: number }> = ({ position, price, rotationZ = 0, width = 0.36 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1024, 640, (ctx) => {
        ctx.fillStyle = "#1d1a2a";
        ctx.fillRect(0, 0, 1024, 640);
        ctx.fillStyle = "#ffd23f";
        ctx.fillRect(0, 0, 1024, 150);
        ctx.fillStyle = INK;
        ctx.font = `900 96px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("MEMBER", 512, 110);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 170px ${BLOCK_FONT}`;
        ctx.fillText(price, 512, 380);
        ctx.font = `900 80px ${BLOCK_FONT}`;
        ctx.fillStyle = "#ff4fd8";
        ctx.fillText("PER MONTH", 512, 520);
        ctx.strokeStyle = INK;
        ctx.lineWidth = 20;
        ctx.strokeRect(10, 10, 1004, 620);
      }),
    [price],
  );
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, rotationZ]}>
      <planeGeometry args={[width, width * 0.625]} />
      <meshBasicMaterial map={tex} toneMapped={false} />
    </mesh>
  );
};

// Treadmill facing +x (runner in profile). `belt` scrolls the stripes.
export const Treadmill: React.FC<{ position: Vec3; belt?: number; rotationY?: number }> = ({ position, belt = 0, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[1.5, 0.12, 0.6]} position={[0, 0.06, 0]} color="#2c3a40" />
    {Array.from({ length: 6 }, (_, i) => {
      const x = (((i / 6 + belt) % 1) - 0.5) * 1.4;
      return <InkBox key={i} size={[0.05, 0.005, 0.52]} position={[x, 0.125, 0]} color="#5a6a70" ink={0} shadows={false} />;
    })}
    {[-0.27, 0.27].map((z) => (
      <InkBox key={z} size={[0.05, 1.0, 0.05]} position={[0.68, 0.55, z]} rotation={[0, 0, -0.15]} color="#c9ced3" ink={0.006} />
    ))}
    <InkBox size={[0.18, 0.12, 0.64]} position={[0.76, 1.05, 0]} color="#1d1a2a" />
    <mesh position={[0.67, 1.06, 0]} rotation={[0, -Math.PI / 2, 0]}>
      <planeGeometry args={[0.5, 0.08]} />
      <meshBasicMaterial color="#39ff7a" toneMapped={false} />
    </mesh>
  </group>
);

export const DumbbellRack: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[1.4, 0.06, 0.4]} position={[0, 0.5, 0]} color="#2c3a40" />
    {[-0.6, 0.6].map((x) => (
      <InkBox key={x} size={[0.06, 0.5, 0.36]} position={[x, 0.25, 0]} color="#2c3a40" ink={0.006} />
    ))}
    {[-0.45, -0.15, 0.15, 0.45].map((x, i) => (
      <group key={x} position={[x, 0.6, 0]} rotation={[0, Math.PI / 2, 0]}>
        <InkCylinder radius={0.02} height={0.3} rotation={[0, 0, Math.PI / 2]} color="#c9ced3" ink={0.004} />
        {[-0.13, 0.13].map((z) => (
          <InkCylinder key={z} radius={0.05 + i * 0.008} height={0.06} position={[z, 0, 0]} rotation={[0, 0, Math.PI / 2]} color="#1d1a1a" ink={0.006} />
        ))}
      </group>
    ))}
  </group>
);

export const Couch: React.FC<{ position: Vec3; color?: string }> = ({ position, color = "#2a9d8f" }) => (
  <group position={position}>
    <InkBox size={[1.7, 0.3, 0.7]} position={[0, 0.2, 0]} color={color} />
    <InkBox size={[1.7, 0.5, 0.18]} position={[0, 0.5, -0.3]} color={color} />
    {[-0.82, 0.82].map((x) => (
      <InkBox key={x} size={[0.16, 0.42, 0.7]} position={[x, 0.32, 0]} color={color} />
    ))}
    <InkBox size={[0.36, 0.22, 0.1]} position={[-0.55, 0.48, -0.18]} rotation={[0.2, 0.2, 0]} color="#ffd23f" ink={0.006} />
  </group>
);

// The rear of a car: body, bumper, tail lights and a trunk lid that pops up with `open` 0..1.
export const CarRear: React.FC<{ position: Vec3; open?: number; color?: string }> = ({ position, open = 0, color = "#c0392b" }) => (
  <group position={position}>
    <InkBox size={[1.7, 0.55, 1.4]} position={[0, 0.5, -0.2]} color={color} />
    <InkBox size={[1.4, 0.45, 0.9]} position={[0, 1.0, -0.45]} color={color} />
    <mesh position={[0, 1.0, 0.006]}>
      <planeGeometry args={[1.2, 0.34]} />
      <meshBasicMaterial color="#1b2a5e" toneMapped={false} />
    </mesh>
    <InkBox size={[1.78, 0.14, 0.12]} position={[0, 0.25, 0.5]} color="#2c3a40" />
    {[-0.7, 0.7].map((x) => (
      <group key={x}>
        <mesh position={[x, 0.62, 0.51]}>
          <planeGeometry args={[0.22, 0.12]} />
          <meshBasicMaterial color="#ff3b3b" toneMapped={false} />
        </mesh>
        <Halo position={[x, 0.62, 0.55]} size={0.5} color="#ff3b3b" strength={0.4} />
      </group>
    ))}
    {[-0.62, 0.62].map((x) => (
      <InkCylinder key={x} radius={0.24} height={0.18} position={[x, 0.24, 0.2]} rotation={[0, 0, Math.PI / 2]} color="#1d1a1a" />
    ))}
    {/* trunk lid hinged at the back window */}
    <group position={[0, 0.79, -0.05]} rotation={[-open * 1.2, 0, 0]}>
      <InkBox size={[1.6, 0.05, 0.55]} position={[0, 0, 0.275]} color={color} />
    </group>
  </group>
);

// Dusty gym bag. `dust` adds grey patches.
export const GymBag: React.FC<{ position: Vec3; rotation?: Vec3 }> = ({ position, rotation = [0, 0, 0] }) => (
  <group position={position} rotation={rotation}>
    <mesh castShadow>
      <capsuleGeometry args={[0.14, 0.4, 6, 16]} />
      <meshToonMaterial color="#1d4fa8" gradientMap={toonRamp} />
    </mesh>
    <mesh scale={[1.06, 1.06, 1.06]}>
      <capsuleGeometry args={[0.14, 0.4, 6, 16]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
    <group rotation={[0, 0, Math.PI / 2]}>
      <Label text="GYM" position={[0, 0, 0.15]} width={0.22} fg="#ffffff" bg="#1d4fa8" border={false} />
    </group>
    {[-0.12, 0.08, 0.18].map((x, i) => (
      <mesh key={x} position={[0.05 * i - 0.04, x, 0.13]}>
        <circleGeometry args={[0.035 + i * 0.01, 12]} />
        <meshBasicMaterial color="#9aa0a6" transparent opacity={0.8} />
      </mesh>
    ))}
  </group>
);

// Autopay terminal: a kiosk with a glowing screen.
export const AutopayMachine: React.FC<{ position: Vec3; text: string; flash?: boolean }> = ({ position, text, flash }) => {
  const tex = useMemo(
    () =>
      canvasTexture(640, 400, (ctx) => {
        ctx.fillStyle = flash ? "#0f5a2a" : "#071226";
        ctx.fillRect(0, 0, 640, 400);
        ctx.fillStyle = flash ? "#7dffb0" : "#5ad1ff";
        ctx.font = `900 64px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText("AUTOPAY", 320, 100);
        ctx.font = `900 120px ${BLOCK_FONT}`;
        ctx.fillText(text, 320, 280);
      }),
    [text, flash],
  );
  return (
    <group position={position}>
      <InkBox size={[0.8, 1.5, 0.45]} position={[0, 0.75, 0]} color="#d8e0ea" />
      <mesh position={[0, 1.15, 0.23]}>
        <planeGeometry args={[0.64, 0.4]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
      <Halo position={[0, 1.15, 0.26]} size={1.2} color={flash ? "#7dffb0" : "#5ad1ff"} strength={0.45} />
      <InkBox size={[0.4, 0.04, 0.1]} position={[0, 0.72, 0.24]} color="#1d1a1a" ink={0.004} />
    </group>
  );
};

// A month grid on a board with `marks` days marked (circles for planned, ticks for actual).
export const MonthBoard: React.FC<{ position: Vec3; title: string; marks: number; kind: "plan" | "went"; width?: number }> = ({ position, title, marks, kind, width = 1.2 }) => {
  const tex = useMemo(
    () =>
      canvasTexture(1050, 640, (ctx) => {
        ctx.fillStyle = "#fffdf4";
        ctx.fillRect(0, 0, 1050, 640);
        ctx.fillStyle = kind === "plan" ? "#1d4fa8" : "#d62828";
        ctx.fillRect(0, 0, 1050, 130);
        ctx.fillStyle = "#ffffff";
        ctx.font = `900 92px ${BLOCK_FONT}`;
        ctx.textAlign = "center";
        ctx.fillText(title, 525, 100);
        const order = [1, 3, 5, 8, 10, 12, 15, 17, 19, 22, 24, 26, 29];
        for (let d = 0; d < 30; d++) {
          const x = (d % 7) * 145 + 85;
          const y = Math.floor(d / 7) * 100 + 185;
          ctx.strokeStyle = "#c8c0a8";
          ctx.lineWidth = 4;
          ctx.strokeRect(x - 60, y - 40, 120, 90);
          const k = order.indexOf(d);
          if (k >= 0 && k < marks) {
            ctx.lineWidth = 14;
            ctx.strokeStyle = kind === "plan" ? "#1d4fa8" : "#d62828";
            ctx.beginPath();
            if (kind === "plan") ctx.arc(x, y + 5, 36, 0, Math.PI * 2);
            else {
              ctx.moveTo(x - 32, y + 5);
              ctx.lineTo(x - 8, y + 32);
              ctx.lineTo(x + 36, y - 26);
            }
            ctx.stroke();
          }
        }
        ctx.strokeStyle = INK;
        ctx.lineWidth = 16;
        ctx.strokeRect(8, 8, 1034, 624);
      }),
    [title, marks, kind],
  );
  return (
    <group position={position}>
      <mesh>
        <planeGeometry args={[width, (width * 640) / 1050]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// Wall calendar whose pages flip away (one page per unit of `flip`), each later page stamped PAID.
export const WallCalendar: React.FC<{ position: Vec3; pages: string[]; flip: number }> = ({ position, pages, flip }) => {
  const shown = Math.min(pages.length - 1, Math.floor(flip));
  const frac = flip - Math.floor(flip);
  return (
    <group position={position}>
      <InkBox size={[0.9, 0.08, 0.06]} position={[0, 0.5, 0.02]} color="#d62828" />
      <Label text={pages[shown]} position={[0, 0.05, 0.03]} width={0.85} fg={INK} bg="#fffdf4" />
      {shown > 0 && (
        <group position={[0.15, -0.05, 0.05]} rotation={[0, 0, -0.25]}>
          <Label text="PAID $70" position={[0, 0, 0]} width={0.5} fg="#d62828" bg="#fffdf4" />
        </group>
      )}
      {shown < pages.length - 1 && frac > 0 && (
        <group position={[0, 0.46, 0.06]} rotation={[-frac * 2.6, 0, 0]}>
          <Label text={pages[shown]} position={[0, -0.41, 0]} width={0.85} fg={INK} bg="#fffdf4" />
        </group>
      )}
    </group>
  );
};

// Piggy bank; `crack` 0..1 splits it into two halves that fall apart (empty inside).
export const PiggyBank: React.FC<{ position: Vec3; crack?: number; squash?: Vec3; labelAppear?: number; labelCount?: number }> = ({ position, crack = 0, squash = [1, 1, 1], labelAppear, labelCount }) => {
  const halves: [number, number][] = [
    [-1, 0],
    [1, Math.PI],
  ];
  return (
    <group position={position} scale={squash}>
      {halves.map(([side, rot]) => (
        <group key={side} position={[side * crack * 0.25, 0, 0]} rotation={[0, 0, side * crack * 0.5]}>
          <mesh rotation={[0, rot, 0]} position={[0, 0.3, 0]} castShadow>
            <sphereGeometry args={[0.3, 32, 16, 0, Math.PI]} />
            <meshToonMaterial color="#ff9fc4" gradientMap={toonRamp} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[side * 0.12, 0.08, 0.1]}>
            <cylinderGeometry args={[0.04, 0.04, 0.14, 12]} />
            <meshToonMaterial color="#ff9fc4" gradientMap={toonRamp} />
          </mesh>
        </group>
      ))}
      {crack < 0.1 && (
        <>
          <mesh position={[0.32, 0.32, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.09, 0.09, 0.06, 20]} />
            <meshToonMaterial color="#ff7eb6" gradientMap={toonRamp} />
          </mesh>
          {[0.08, -0.08].map((z) => (
            <mesh key={z} position={[0.24, 0.48, z]}>
              <coneGeometry args={[0.05, 0.1, 8]} />
              <meshToonMaterial color="#ff7eb6" gradientMap={toonRamp} />
            </mesh>
          ))}
          <mesh position={[0.3, 0.38, 0.12]}>
            <sphereGeometry args={[0.02, 8, 8]} />
            <meshBasicMaterial color={INK} />
          </mesh>
        </>
      )}
      <Label text={crack > 0.5 ? "$600 GONE" : "$600"} position={[0, 0.78, 0]} width={0.6} fg="#ffffff" bg="#d62828" appear={labelAppear} count={labelCount} />
    </group>
  );
};

// Row of lockers with a price tag area.
export const Lockers: React.FC<{ position: Vec3; count?: number; color?: string }> = ({ position, count = 5, color = "#1f7f78" }) => (
  <group position={position}>
    {Array.from({ length: count }, (_, i) => (
      <group key={i} position={[(i - (count - 1) / 2) * 0.5, 0, 0]}>
        <InkBox size={[0.48, 1.8, 0.45]} position={[0, 0.9, 0]} color={color} />
        {[1.5, 1.4, 1.3].map((y) => (
          <InkBox key={y} size={[0.25, 0.02, 0.01]} position={[0, y, 0.23]} color="#0f4f4a" ink={0} />
        ))}
        <InkBox size={[0.04, 0.12, 0.03]} position={[0.17, 1.0, 0.24]} color="#c9ced3" ink={0.004} />
      </group>
    ))}
  </group>
);

export const Bench: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[1.6, 0.06, 0.35]} position={[0, 0.42, 0]} color="#c99a6b" />
    {[-0.65, 0.65].map((x) => (
      <InkBox key={x} size={[0.06, 0.4, 0.3]} position={[x, 0.2, 0]} color="#5a6a70" ink={0.006} />
    ))}
  </group>
);

// Standing price sign on a little easel.
export const PriceSign: React.FC<{ position: Vec3; text: string; bg: string; fg?: string; width?: number; rotationY?: number; appear?: number }> = ({ position, text, bg, fg = "#ffffff", width = 0.6, rotationY = 0, appear }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.04, 0.5, 0.04]} position={[0, 0.25, -0.05]} color="#6b4a2e" ink={0.005} />
    <group position={[0, 0.5 + (width / 4) * text.split("\n").length * 0.5, 0]} rotation={[-0.12, 0, 0]}>
      <Label text={text} position={[0, 0, 0]} width={width} fg={fg} bg={bg} appear={appear} />
    </group>
  </group>
);

export const SpinBike: React.FC<{ position: Vec3; rotationY?: number }> = ({ position, rotationY = 0 }) => (
  <group position={position} rotation={[0, rotationY, 0]}>
    <InkBox size={[0.7, 0.06, 0.3]} position={[0, 0.03, 0]} color="#2c3a40" />
    <InkBox size={[0.06, 0.75, 0.06]} position={[-0.15, 0.4, 0]} rotation={[0, 0, 0.2]} color="#c9ced3" ink={0.006} />
    <InkBox size={[0.24, 0.05, 0.14]} position={[-0.22, 0.8, 0]} color="#1d1a1a" />
    <InkBox size={[0.06, 0.8, 0.06]} position={[0.2, 0.42, 0]} rotation={[0, 0, -0.15]} color="#c9ced3" ink={0.006} />
    <InkBox size={[0.06, 0.04, 0.36]} position={[0.26, 0.84, 0]} color="#1d1a1a" />
    <InkCylinder radius={0.2} height={0.06} position={[0.18, 0.28, 0]} rotation={[Math.PI / 2, 0, 0]} color="#ff4fd8" />
  </group>
);
