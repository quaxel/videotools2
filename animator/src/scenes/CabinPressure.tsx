import React from "react";
import * as THREE from "three";
import { BlenderModel, CameraRig, CameraShot, canvasTexture, handWorld, PUPPET_HEIGHT, PuppetLook, PuppetPlacement, Stage } from "../engine";
import { SkySet } from "../three/BalloonSets";
import { Ball, Cyl, RBox } from "../videos/dog-nose/props";
import { Lights, Motes, useOwnedTex } from "../videos/dog-nose/sets";

// Two stills for the cabin-pressure scenario (guide/references/airliner-cabin.md), 9:16.
//   CabinExterior: the airliner cruising over the cloud deck at 35,000 ft, seen from below its nose.
//   CabinInterior: the cabin seen from the front galley down the aisle, just after the masks dropped: yellow cups
//   swinging on their tubes from the open drop doors, passengers frozen in shock, one already pressing a mask on.
// POST=1 STILL_SCALE=1 node scripts/stills.mjs CabinExterior ../output/stills-cabin-pressure 0

type Vec3 = [number, number, number];

// ---------- exterior ----------

const EXT_CAM: CameraShot = { position: [-15, 3.0, 8.5], target: [-1.2, 1.2, 0.2], fov: 44 };

// Heaps of cumulus a few metres under the plane: clusters of soft balls, sunlit white tops and blue-grey bellies, so
// the cloud sea reads under the post chain's grade (the deck far below washes out to white on its own).
const rnd = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const CumulusField: React.FC = () => (
  <group>
    {Array.from({ length: 80 }, (_, i) => {
      const x = -16 + rnd(i) * 44;
      const z = -32 + rnd(i + 50) * 40;
      const s = 2.2 + rnd(i + 90) * 2.6;
      return (
        <group key={i} position={[x, -7.2 - rnd(i + 7) * 1.5, z]} scale={[s * 1.3, s * 0.75, s]}>
          {[
            [0, 0.25, 0, 1],
            [-1.0, 0, 0.2, 0.78],
            [1.05, 0.02, -0.1, 0.82],
            [0.45, 0.75, 0.1, 0.62],
            [-0.5, 0.62, -0.2, 0.58],
            [0.1, -0.35, 0.3, 0.9],
          ].map(([bx, by, bz, r], k) => (
            <mesh key={k} position={[bx, by, bz]}>
              <sphereGeometry args={[r, 20, 14]} />
              <meshStandardMaterial color={k === 5 ? "#7d93b8" : k === 1 || k === 2 ? "#c9d5e6" : "#e4ebf4"} roughness={1} />
            </mesh>
          ))}
        </group>
      );
    })}
  </group>
);

export const CabinExterior: React.FC = () => (
  <Stage
    set={
      <SkySet camera={EXT_CAM} frame={260} mode="day" speed={0.9} streaks={false}>
        {/* the model's nose (+Z) turned to -X, banked away from the camera so its top and windows face the lens */}
        <group position={[0, 0, 0]} rotation={[0.38, 0, -0.05]}>
          <group rotation={[0, -Math.PI / 2, 0]}>
            <BlenderModel src="videos/cabin-pressure/models/airliner.glb" ink={0.03} />
          </group>
        </group>
        <CumulusField />
      </SkySet>
    }
    camera={EXT_CAM}
    bg="#2f66c4"
    energy={0}
  />
);

// ---------- interior ----------

// The cabin runs along -z, away from the camera standing in the front galley. Seats face +z (toward the camera), so
// the passengers face it too. Puppet scale: a seated puppet's head is about 0.7 m up.
const R = 2.1; // radius of the cabin tube
const CY = -0.1; // height of its axis (below the floor: the tube is cut by it)
const AISLE = 0.27; // half width of the aisle
const SEAT_W = 0.5; // wider than a seated puppet's big head, so the back shows round it
const PITCH = 0.82;
const ROW0 = 1.15; // z of the first row's seat
const ROWS = 9;
const BIN_Y = 1.45; // underside of the overhead bins, well above the seated heads (as in a real cabin)
const CEIL = 1.86; // the lowered ceiling over the aisle
const seatX = (side: number, k: number) => side * (AISLE + SEAT_W / 2 + k * (SEAT_W + 0.02)); // k 0 aisle .. 2 window
const rowZ = (r: number) => ROW0 - r * PITCH;
const wallX = (y: number) => Math.sqrt(R * R - (y - CY) * (y - CY));

const C = {
  wall: "#efe7d6",
  bin: "#f6f3ec",
  psu: "#d9dde3",
  seat: "#2b4a8c",
  seatDark: "#1f3466",
  cover: "#e3e7ec",
  carpet: "#56607a",
  mask: "#f3c623",
  tube: "#d8eef5",
};

// Carpet: blue-grey with a small woven pattern and scuffs down the aisle.
const carpetTex = () =>
  canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 512, 512);
    for (let y = 0; y < 512; y += 16)
      for (let x = 0; x < 512; x += 16) {
        ctx.fillStyle = (x + y) % 32 ? "rgba(40,60,110,0.10)" : "rgba(255,255,255,0.0)";
        ctx.fillRect(x + 4, y + 4, 8, 8);
      }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(20,20,30,0.08)";
      ctx.beginPath();
      ctx.ellipse(200 + Math.sin(i * 7.1) * 80, (i * 97) % 512, 30, 12, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

// Sidewall panel with a soft gradient and a faint seam every row.
const wallTex = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#fbf8f2";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(120,110,90,0.10)";
    ctx.fillRect(0, 0, 256, 2);
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "rgba(120,110,90,0.05)";
      ctx.fillRect((i * 53) % 256, (i * 31) % 256, 20, 2);
    }
  });

// The cabin shell: the tube's sidewalls and ceiling (seen from inside), the floor, a closed bulkhead far aft.
const Shell: React.FC = () => {
  const carpet = useOwnedTex(() => {
    const t = carpetTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(2, 10);
    return t;
  });
  const wall = useOwnedTex(() => {
    const t = wallTex();
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1, 12);
    return t;
  });
  const L = 15;
  const zc = 4.5 - L / 2;
  // the arc above the floor: from the floor on one side round over the top to the floor on the other side
  const a0 = Math.asin(-CY / R);
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, zc]} receiveShadow>
        <planeGeometry args={[2 * wallX(0), L]} />
        <meshStandardMaterial color={C.carpet} map={carpet} roughness={0.95} />
      </mesh>
      {/* the aisle runner, a shade lighter */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.002, zc]} receiveShadow>
        <planeGeometry args={[AISLE * 2, L]} />
        <meshStandardMaterial color="#6a7590" map={carpet} roughness={0.95} />
      </mesh>
      <mesh position={[0, CY, zc]} rotation={[Math.PI / 2, 0, 0]} receiveShadow>
        <cylinderGeometry args={[R, R, L, 64, 1, true, -Math.PI / 2 - (Math.PI / 2 + a0), Math.PI + 2 * (Math.PI / 2 + a0) - 0.0001]} />
        <meshStandardMaterial color={C.wall} map={wall} roughness={0.8} side={THREE.BackSide} emissive="#f2e8d4" emissiveIntensity={0.42} />
      </mesh>
      {/* the lowered ceiling over the aisle: a panel per row with a seam, light strips along both edges */}
      {Array.from({ length: 13 }, (_, i) => (
        <RBox key={`c${i}`} size={[1.5, 0.05, PITCH - 0.02]} position={[0, CEIL, ROW0 + 1.6 - i * PITCH]} color="#efe9de" radius={0.02} emissive="#f2e8d4" k={0.05} />
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={`cs${i}`} position={[0, CEIL - 0.034, ROW0 + 1.6 - (i + 0.5) * PITCH]}>
          <boxGeometry args={[1.3, 0.012, 0.03]} />
          <meshStandardMaterial color="#bdb4a2" roughness={0.9} />
        </mesh>
      ))}
      {[-1, 1].map((sd) => (
        <mesh key={`l${sd}`} position={[sd * 0.66, CEIL - 0.035, ROW0 + 1.6 - 6 * PITCH]}>
          <boxGeometry args={[0.07, 0.012, 13 * PITCH]} />
          <meshBasicMaterial color={new THREE.Color("#fff3da").multiplyScalar(1.5)} toneMapped={false} />
        </mesh>
      ))}
      {/* the lit seat-belt and no-smoking signs over the aisle every few rows */}
      {[0.6, -1.9, -4.4].map((z) => (
        <group key={`s${z}`} position={[0, CEIL - 0.05, z]}>
          <RBox size={[0.26, 0.05, 0.1]} color="#e8e4dc" radius={0.015} />
          <mesh position={[0, -0.005, 0.052]}>
            <planeGeometry args={[0.2, 0.035]} />
            <meshBasicMaterial color={new THREE.Color("#ffe9a8").multiplyScalar(1.3)} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* aft bulkhead with a curtain gap */}
      <RBox size={[3.6, 2.4, 0.08]} position={[0, 1.0, 4.5 - L + 0.3]} color="#ddd3c0" radius={0.03} />
      <RBox size={[0.7, 1.55, 0.06]} position={[0, 0.78, 4.5 - L + 0.36]} color="#3b4f86" radius={0.02} />
    </group>
  );
};

// A window: a rounded bezel in the sidewall with the shade half up and the bright sky in it.
const CabinWindow: React.FC<{ side: number; z: number; shade: number }> = ({ side, z, shade }) => {
  const y = 0.8;
  const x = side * (wallX(y) - 0.02);
  const ang = Math.atan2(y - CY, wallX(y)); // the wall's slope at the window
  return (
    <group position={[x, y, z]} rotation={[0, 0, side * ang]}>
      <group rotation={[0, -side * Math.PI / 2, 0]}>
        <RBox size={[0.3, 0.4, 0.04]} color="#e9e4da" radius={0.1} />
        <mesh position={[0, -0.03, 0.021]}>
          <planeGeometry args={[0.2, 0.26]} />
          <meshBasicMaterial color={new THREE.Color("#dff0ff").multiplyScalar(1.15)} toneMapped={false} />
        </mesh>
        {/* the cloud deck far below, a white band in the lower part of the pane */}
        <mesh position={[0, -0.12, 0.022]}>
          <planeGeometry args={[0.2, 0.06]} />
          <meshBasicMaterial color={new THREE.Color("#ffffff").multiplyScalar(1.3)} toneMapped={false} />
        </mesh>
        <RBox size={[0.21, 0.26 * shade, 0.01]} position={[0, 0.1 - 0.13 * shade + 0.03, 0.026]} color="#f1ece2" radius={0.004} />
      </group>
    </group>
  );
};

// Overhead bins along one side, a door per two rows, the passenger service strip under them, and the cove light.
const Bins: React.FC<{ side: number }> = ({ side }) => {
  const inner = 0.98;
  return (
    <group>
      {Array.from({ length: 7 }, (_, i) => {
        const z = 3.1 - (i + 0.5) * PITCH * 2; // on past the first row to the galley behind the camera
        return (
          <group key={i} position={[side * (inner + 0.32), BIN_Y + 0.15, z]}>
            <RBox size={[0.66, 0.3, PITCH * 2 - 0.03]} color={C.bin} radius={0.1} />
            {/* the latch */}
            <RBox size={[0.04, 0.05, 0.18]} position={[-side * 0.33, 0.05, 0]} color="#c9ccd2" radius={0.015} />
          </group>
        );
      })}
      {/* service strip: reading lights and air nozzles, one set per row */}
      <RBox size={[0.6, 0.06, 3.1 - rowZ(ROWS - 1) + 0.4]} position={[side * (inner + 0.3), BIN_Y - 0.02, (3.1 + rowZ(ROWS - 1) - 0.4) / 2]} color={C.psu} radius={0.02} />
      {Array.from({ length: ROWS }, (_, r) =>
        [0.15, 0.3, 0.45].map((dx, k) => (
          <Ball key={`${r}${k}`} position={[side * (inner + dx), BIN_Y - 0.055, rowZ(r) + 0.1]} radius={0.018} color={k === 1 ? "#fff3cc" : "#9aa2ae"} glow={k === 1} scale={[1, 0.5, 1]} ink={0} />
        )),
      )}
      {/* cove light along the top edge of the bins */}
      <mesh position={[side * (inner - 0.02), BIN_Y + 0.27, -2.4]}>
        <boxGeometry args={[0.03, 0.03, 11]} />
        <meshBasicMaterial color={new THREE.Color("#fff1d6").multiplyScalar(1.4)} toneMapped={false} />
      </mesh>
    </group>
  );
};

// One seat: cushion, reclined back, a white headrest cover, armrests; the back's rear (with the tray) faces -z.
// The passenger's card stands at the middle of the cushion (SEAT_IN), so the cushion's front edge and the armrests
// pass in front of the hips and the legs hang down from under the edge: it reads as sitting in the seat, not in front
// of it. The back rises past the head and frames it.
const SEAT_IN = 0.0;
const SEAT_TOP = 0.3; // top of the cushion
const BACK_TOP = 1.0; // top of the backrest: level with the middle of a seated head, which rises above it
const Seat: React.FC<{ x: number; z: number }> = ({ x, z }) => (
  <group position={[x, 0, z]}>
    <RBox size={[SEAT_W - 0.02, 0.13, 0.46]} position={[0, SEAT_TOP - 0.065, 0.04]} color={C.seat} radius={0.06} />
    <RBox size={[SEAT_W - 0.04, 0.05, 0.1]} position={[0, SEAT_TOP - 0.01, 0.22]} color={C.seatDark} radius={0.025} />
    <group position={[0, SEAT_TOP - 0.02, -0.2]} rotation={[-0.1, 0, 0]}>
      <RBox size={[SEAT_W - 0.02, BACK_TOP - SEAT_TOP + 0.02, 0.12]} position={[0, (BACK_TOP - SEAT_TOP + 0.02) / 2, 0]} color={C.seat} radius={0.07} />
      <RBox size={[SEAT_W - 0.1, 0.18, 0.13]} position={[0, BACK_TOP - SEAT_TOP - 0.08, 0.005]} color={C.cover} radius={0.05} />
    </group>
    <RBox size={[0.08, SEAT_TOP - 0.13, 0.3]} position={[0, (SEAT_TOP - 0.13) / 2, -0.05]} color={C.seatDark} radius={0.03} />
  </group>
);

const SeatBlock: React.FC<{ side: number; z: number }> = ({ side, z }) => (
  <group>
    {[0, 1, 2].map((k) => (
      <Seat key={k} x={seatX(side, k)} z={z} />
    ))}
    {[0, 1, 2, 3].map((k) => (
      <RBox key={`a${k}`} size={[0.06, 0.07, 0.44]} position={[side * (AISLE + 0.0 + k * (SEAT_W + 0.02)) - side * 0.01, SEAT_TOP + 0.11, z + 0.04]} color="#2a3458" radius={0.03} />
    ))}
  </group>
);

// A curved tube from a to b sagging a little: thin, clear-blue, catching the light.
const Tube: React.FC<{ a: Vec3; b: Vec3; sag?: number; bend?: number }> = ({ a, b, sag = 0.04, bend = 0 }) => {
  const curve = React.useMemo(() => {
    const m = new THREE.Vector3(...a).lerp(new THREE.Vector3(...b), 0.5).add(new THREE.Vector3(bend, -sag, bend * 0.5));
    return new THREE.QuadraticBezierCurve3(new THREE.Vector3(...a), m, new THREE.Vector3(...b));
  }, [a, b, sag, bend]);
  const geo = React.useMemo(() => new THREE.TubeGeometry(curve, 16, 0.006, 6, false), [curve]);
  React.useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={C.tube} roughness={0.25} transparent opacity={0.75} />
    </mesh>
  );
};

// One oxygen mask: a yellow cup (open side toward `face`), its elastic, and the limp clear bag under it.
const Mask: React.FC<{ at: Vec3; turn?: number; tilt?: number }> = ({ at, turn = 0, tilt = 0 }) => (
  <group position={at} rotation={[tilt, turn, 0]}>
    <Cyl r={0.06} r2={0.042} h={0.07} rotation={[Math.PI / 2, 0, 0]} color={C.mask} rough={0.45} />
    <mesh position={[0, 0, 0.036]}>
      <torusGeometry args={[0.058, 0.007, 8, 24]} />
      <meshStandardMaterial color="#e2b10f" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0, 0.034]}>
      <circleGeometry args={[0.052, 24]} />
      <meshStandardMaterial color="#b8890a" roughness={0.7} />
    </mesh>
    {/* the reservoir bag, see-through */}
    <Ball position={[0, -0.12, -0.01]} radius={0.05} scale={[0.9, 1.5, 0.55]} color="#e9f6fb" opacity={0.42} ink={0} />
  </group>
);

// The open drop door of the service unit over a seat block, hanging on its hinge, and three masks dangling from it
// at different lengths and swings.
const MaskDrop: React.FC<{ side: number; z: number; lens: number[]; swing: number[]; hide?: number[]; door?: boolean }> = ({ side, z, lens, swing, hide = [], door = true }) => {
  const hinge: Vec3 = [side * 1.12, BIN_Y - 0.05, z + 0.12];
  return (
    <group>
      {door && (
        <group position={hinge} rotation={[0, 0, side * 1.25]}>
          <RBox size={[0.03, 0.22, 0.4]} position={[0, -0.11, 0]} color="#cdd2d9" radius={0.012} />
        </group>
      )}
      {lens.map((len, k) => {
        if (hide.includes(k)) return null;
        const top: Vec3 = [hinge[0] - side * (0.06 + k * 0.05), hinge[1] - 0.03, hinge[2] - 0.12 + k * 0.12];
        const cup: Vec3 = [top[0] - side * (0.08 + swing[k] * 0.4), top[1] - len * 0.72, top[2] + 0.06 + swing[k] * 0.15];
        return (
          <group key={k}>
            <Tube a={top} b={[cup[0], cup[1] + 0.05, cup[2]]} sag={0.0} bend={swing[k] * 0.1} />
            <Mask at={cup} turn={-side * 0.5 + swing[k]} tilt={0.25 + swing[k] * 0.4} />
          </group>
        );
      })}
    </group>
  );
};

const INT_CAM: CameraShot = { position: [0.3, 1.08, 3.0], target: [-0.3, 0.66, -0.9], fov: 44 };

const looks: PuppetLook[] = [
  { skin: "#e8b48a", hair: "#4a2e1c", outfit: "#d0563c" },
  { skin: "#c98b5e", hair: "#1c1410", outfit: "#3f8f6a", long: true },
  { skin: "#f1c9a0", hair: "#c88a3a", outfit: "#f2cc8f", long: true },
  { skin: "#8d5b3c", hair: "#1a1412", outfit: "#7a63b8", glasses: true },
  { skin: "#e9b98f", hair: "#6a3a1e", outfit: "#2e7fb8" },
  { skin: "#d49a72", hair: "#2a1a12", outfit: "#e07a5f", long: true },
  { skin: "#f0c8a4", hair: "#8a8a8a", outfit: "#5a6e3a" },
];

// Where a fist holding a mask to the face sits on the card (puppet units): just under the mouth.
const HOLD_REACH: [number, number] = [22, -705];

// The passengers: aisle seats on both sides, a few in the middle and window seats nearer the front.
const SEATED: { side: number; k: number; r: number; look: number; pose: PuppetPlacement["pose"] }[] = [
  // front left, aisle: grabs the mask in front of her and pulls it to her face
  { side: -1, k: 0, r: 0, look: 1, pose: { expression: "worried", reachR: HOLD_REACH, handR: "fist", frontR: true, lookX: 0.2 } },
  { side: -1, k: 1, r: 0, look: 6, pose: { expression: "shocked", armL: [150, -30], reachR: HOLD_REACH, handR: "fist", frontR: true, lookX: 0.4, headTilt: 6 } },
  { side: 1, k: 0, r: 0, look: 0, pose: { expression: "shocked", reachL: [-120, -980], handL: "open", lookX: -0.3, headTilt: -5 } },
  { side: -1, k: 0, r: 1, look: 4, pose: { expression: "shocked", lookX: 0.5 } },
  { side: 1, k: 0, r: 1, look: 2, pose: { expression: "worried", reachR: [110, -900], handR: "open", lookX: -0.5 } },
  { side: -1, k: 0, r: 2, look: 5, pose: { expression: "confused", lookX: 0.3 } },
  { side: 1, k: 0, r: 2, look: 3, pose: { expression: "shocked", lookX: -0.3 } },
  { side: -1, k: 0, r: 3, look: 0, pose: { expression: "worried" } },
  { side: 1, k: 0, r: 3, look: 6, pose: { expression: "shocked" } },
];

// A seated puppet seen from the front keeps its standing height and draws its legs almost straight down to the floor,
// so in a seat it reads as standing in it. The card is cut off at the cushion (an arch mask with a flat base at HIP)
// and the legs are drawn in 3D instead: thighs lying on the cushion toward the camera, knees past its front edge,
// shins down to the floor, shoes.
// The puppet is lifted (`air`) so the flat bottom of its body sits on top of the 3D thighs, and the card is cut just
// under that bottom edge: the thighs start behind the body, so it rests on the joint instead of the legs crossing it.
const K_UNIT = PUPPET_HEIGHT / 1060; // metres per puppet unit
const LIFT = Math.max(0, SEAT_TOP + 0.022 - 262 * K_UNIT); // the body bottom rests on thighs lying on the cushion
const AIR = LIFT / K_UNIT;
const BODY_BOTTOM = 262 * K_UNIT + LIFT; // the body outline's flat bottom (y -262 on the card)
const HIP = BODY_BOTTOM - 0.012; // where the card is cut: just under the body's bottom ink line
const legMask = (at: [number, number], camera: CameraShot): PuppetPlacement["mask"] => {
  const dx = camera.position[0] - at[0];
  const dz = camera.position[2] - at[1];
  const l = Math.hypot(dx, dz);
  const rx = 0.6;
  const ry = 0.8;
  const cy = 0.62;
  return { center: [at[0], cy, at[1]], u: [dz / l / rx, 0, -dx / l / rx], v: [0, 1 / ry, 0], archBottom: (HIP - cy) / ry };
};

const LEG_INK = "#1e1919";
const Limb: React.FC<{ a: Vec3; b: Vec3; r?: number }> = ({ a, b, r = 0.023 }) => {
  const va = new THREE.Vector3(...a);
  const d = new THREE.Vector3(...b).sub(va);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
  return (
    <group position={va.add(d.clone().multiplyScalar(0.5)).toArray() as Vec3} quaternion={q}>
      <mesh castShadow>
        <capsuleGeometry args={[r, d.length(), 6, 12]} />
        <meshStandardMaterial color={LEG_INK} roughness={0.7} />
      </mesh>
    </group>
  );
};
const SeatedLegs: React.FC<{ at: [number, number] }> = ({ at }) => (
  <group>
    {[-1, 1].map((s) => {
      // knees a little wider and higher than the hips, feet back under the knees: the bend reads from any angle
      const hip: Vec3 = [at[0] + s * 0.06, BODY_BOTTOM + 0.004, at[1] - 0.05]; // behind the card, under the body
      const kneeP: Vec3 = [at[0] + s * 0.135, BODY_BOTTOM + 0.03, at[1] + 0.3];
      const ankle: Vec3 = [at[0] + s * 0.12, 0.06, at[1] + 0.27];
      return (
        <group key={s}>
          <Limb a={hip} b={kneeP} />
          <Limb a={kneeP} b={ankle} />
          <RBox size={[0.075, 0.05, 0.13]} position={[ankle[0] + s * 0.005, 0.03, ankle[2] + 0.035]} color={LEG_INK} radius={0.024} />
        </group>
      );
    })}
  </group>
);

const cast = (): PuppetPlacement[] =>
  SEATED.map((p, i) => ({
    id: `pax${i}`,
    look: looks[p.look],
    at: [seatX(p.side, p.k), rowZ(p.r) + SEAT_IN],
    mask: legMask([seatX(p.side, p.k), rowZ(p.r) + SEAT_IN], INT_CAM),
    pose: { sit: true, view: "front", air: AIR, ...p.pose },
    // the rows behind are extras: they may be cut by the frame edge, so keepHeads does not pull the camera back
    ...(p.r > 0 ? { crop: true } : {}),
  }));

// Each row's mask drops: lengths and swings drawn by hand so no two clusters hang alike.
const DROPS: { lens: number[]; swing: number[] }[] = [
  { lens: [0.42, 0.55, 0.36], swing: [0.1, -0.2, 0.3] },
  { lens: [0.5, 0.38, 0.6], swing: [-0.15, 0.25, 0.05] },
  { lens: [0.33, 0.58, 0.47], swing: [0.3, 0.0, -0.25] },
  { lens: [0.55, 0.44, 0.39], swing: [-0.05, 0.2, 0.35] },
  { lens: [0.4, 0.52, 0.57], swing: [0.2, -0.3, 0.1] },
  { lens: [0.47, 0.35, 0.5], swing: [-0.25, 0.15, -0.1] },
  { lens: [0.58, 0.45, 0.4], swing: [0.05, 0.3, -0.2] },
  { lens: [0.36, 0.5, 0.44], swing: [0.25, -0.1, 0.2] },
  { lens: [0.5, 0.42, 0.55], swing: [-0.2, 0.05, 0.3] },
];

const CabinSet: React.FC<{ camera: CameraShot }> = ({ camera }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={["#d8cfbf"]} />
    <fog attach="fog" args={["#d8cfbf", 7, 19]} />
    {/* daylight through the left windows, the strong source; cool soft fill from the cabin lights */}
    <Lights camera={camera} sun={[-6, 1.6, 1.5]} sunColor="#fff4e0" sunK={1.8} sky="#f4f6ff" ground="#8a8a9a" hemiK={1.1} ambient={0.4} box={7} />
    <Shell />
    {[-1, 1].map((side) => (
      <group key={side}>
        <Bins side={side} />
        {Array.from({ length: ROWS }, (_, r) => (
          <React.Fragment key={r}>
            <SeatBlock side={side} z={rowZ(r)} />
            <CabinWindow side={side} z={rowZ(r) + 0.1} shade={0.25 + ((r * 7 + (side > 0 ? 3 : 0)) % 5) * 0.12} />
            <MaskDrop side={side} z={rowZ(r)} lens={DROPS[(r + (side > 0 ? 4 : 0)) % DROPS.length].lens} swing={DROPS[(r + (side > 0 ? 4 : 0)) % DROPS.length].swing} hide={side < 0 && r === 0 ? [0, 1, 2] : []} door={!(side < 0 && r === 0)} />
          </React.Fragment>
        ))}
      </group>
    ))}
    {/* the two front-left passengers hold masks to their faces: each sits in the fist (handWorld), over the mouth,
        its tube running up behind the heads to the open door above them */}
    {[0, 1].map((k) => {
      const at: [number, number] = [seatX(-1, k), rowZ(0) + SEAT_IN];
      const hand = handWorld(at, HOLD_REACH, camera);
      const turn = Math.atan2(camera.position[0] - at[0], camera.position[2] - at[1]);
      const cup: Vec3 = [hand[0] + Math.sin(turn) * 0.07, hand[1] + LIFT + 0.035, hand[2] + Math.cos(turn) * 0.07]; // the hand rises with `air`
      return (
        <group key={`held${k}`}>
          <Tube a={[-1.02 + k * 0.06, BIN_Y - 0.06, rowZ(0) - 0.3]} b={[cup[0], cup[1] + 0.05, cup[2] - 0.04]} sag={-0.04} bend={0.02} />
          <Mask at={cup} turn={turn} tilt={-0.05} />
        </group>
      );
    })}
    {SEATED.map((p, i) => (
      <SeatedLegs key={`legs${i}`} at={[seatX(p.side, p.k), rowZ(p.r) + SEAT_IN]} />
    ))}
    {/* fine mist: the air fogs as the pressure drops */}
    <Motes center={[0, 1.1, -1]} size={[2.6, 1.4, 6]} f={0} count={90} color="#ffffff" r={0.008} />
  </>
);

export const CabinInterior: React.FC = () => (
  <Stage
    set={<CabinSet camera={INT_CAM} />}
    camera={INT_CAM}
    bg="#efe7d6"
    puppets={cast()}
    energy={0}
    blur={4}
    light={{ distant: [{ direction: [-1, 0.45, 0.25], color: "#fff4e0", strength: 1.4 }] }}
  />
);
