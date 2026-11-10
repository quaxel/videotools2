import React from "react";
import { beatPath, Burst, CameraShot, canvasTexture, faceChange, foleyCues, frameSpot, handWorld, lerp3, PuppetLook, PuppetPlacement, PuppetPose, ramp, Sfx, sfx, Stage, useShotFrame, Vec3 } from "../../engine";
import { Cyl, RBox } from "../dog-nose/props";
import { useOwnedTex } from "../dog-nose/sets";
import { Bag, cabinBg, cabinLight, CabinSet, DROPS, hangPoint, Mask, MaskDrop, maskTop, PSU_Y, rowZ, SEAT_IN, seatLegs, seatX, Tube } from "./cabin";
import { BARRY, EXTRAS, MIA, ROSE, SEATING } from "./cast";
import { at, beat, SHOT } from "./shots";

// The three CabinSet shots of "cabin-pressure" (camera_plan.md shots 2, 5 and 6):
//   CabinBarry: push in on Barry giggling under the swinging masks; he swats his mask away, it swings back and bonks him.
//   PsuDrop: amber alarm; from the CABIN ALT gauge nearing 15,000 the camera cranes up to the ceiling as the mask doors
//     pop row by row and the masks drop; the passengers flinch.
//   CabinRows: sideways track along row 1: Rose helps the window passenger and puts Mia's mask on, her own mask hangs
//     unused; on to Barry poking his limp bag and laughing; "Nobody screams" settles on calm, dazed faces.

const ASPECT = 9 / 16;
const K = 1.3 / 1060; // metres per puppet unit
const FONT = "'Arial Black', Impact, sans-serif";
const sm = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const seat = (s: { side: number; k: number; r: number }): [number, number] => [seatX(s.side, s.k), rowZ(s.r) + SEAT_IN];
const BARRY_AT = seat(SEATING.barry);
const MIA_AT = seat(SEATING.mia);
const ROSE_AT = seat(SEATING.rose);
const WIN_AT = seat(SEATING.windowLeft);
const WIN_LOOK = EXTRAS[1];

const sitter = (id: string, look: PuppetLook, at: [number, number], pose: Partial<PuppetPose>, crop = false): PuppetPlacement => ({
  id,
  look,
  at,
  pose: { expression: "neutral", sit: true, ...pose } as PuppetPose,
  crop,
});

// A point on a seated puppet's card (puppet units, front view) after the body leans `lean` degrees from the hips,
// in the world, pushed `toward` metres toward the camera (to sit on the face rather than in it).
const leanPt = (p: [number, number], lean: number): [number, number] => {
  const t = (lean * Math.PI) / 180;
  const dx = p[0];
  const dy = p[1] + 280;
  return [dx * Math.cos(t) - dy * Math.sin(t), dx * Math.sin(t) + dy * Math.cos(t) - 280];
};
const towardCam = (at: [number, number], camera: CameraShot): [number, number] => {
  const dx = camera.position[0] - at[0];
  const dz = camera.position[2] - at[1];
  const l = Math.hypot(dx, dz) || 1;
  return [dx / l, dz / l];
};
const onCard = (at: [number, number], p: [number, number], lean: number, camera: CameraShot, toward = 0): Vec3 => {
  const w = handWorld(at, leanPt(p, lean), camera);
  const fw = towardCam(at, camera);
  return [w[0] + fw[0] * toward, w[1], w[2] + fw[1] * toward];
};
// A mask pressed on a face: its rim toward the face (away from the camera).
const faceTurn = (at: [number, number], camera: CameraShot) => {
  const fw = towardCam(at, camera);
  return Math.atan2(-fw[0], -fw[1]);
};
const MOUTH: [number, number] = [0, -712];

// A mask dangling near the lens (a Stage foreground): its tube runs up out of the frame.
const FgMask: React.FC<{ at: Vec3; f: number; seed?: number }> = ({ at, f, seed = 0 }) => {
  const sw = 0.12 * Math.sin(f * 0.07 + seed);
  const cup: Vec3 = [at[0] + Math.sin(sw) * 0.08, at[1], at[2]];
  return (
    <group>
      <Tube a={[at[0], at[1] + 0.7, at[2]]} b={[cup[0], cup[1] + 0.05, cup[2]]} sag={0} bend={sw * 0.05} />
      <Mask at={cup} turn={0.5 + sw} tilt={0.9} bag={false} />
    </group>
  );
};

// ---------- 2. CabinBarry (116-238): push in on Barry, the swat and the bonk ----------

// Barry's own mask hangs from his service unit just right of his face: a pendulum about BM_PIVOT, swinging in the
// vertical plane through his head, so it can come back and hit him.
const BM_PIVOT: Vec3 = [0.74, PSU_Y - 0.01, 0.48];
const BM_L = 0.41;
const BM_AWAY: [number, number] = (() => {
  const x = BM_PIVOT[0] - BARRY_AT[0];
  const z = BM_PIVOT[2] - BARRY_AT[1];
  const l = Math.hypot(x, z);
  return [x / l, z / l];
})();
const bmCup = (theta: number): Vec3 => [BM_PIVOT[0] + BM_L * Math.sin(theta) * BM_AWAY[0], BM_PIVOT[1] - BM_L * Math.cos(theta), BM_PIVOT[2] + BM_L * Math.sin(theta) * BM_AWAY[1]];
const bagOf = (cup: Vec3): Vec3 => [cup[0], cup[1] - 0.135, cup[2] - 0.01];

const SWAT = beat(1, 0.45, "cabinBarry"); // "fan-TAS-tic"
const BONK = 80; // "thousand feet"
const swatTheta = (t: number) => {
  if (t < SWAT) return 0.06 * Math.sin(t * 0.14);
  if (t < SWAT + 24) return 1.38 * Math.sin(((t - SWAT) / 24) * (Math.PI / 2));
  if (t < SWAT + 32) return 1.38 - 0.03 * ((t - SWAT - 24) / 8);
  if (t < BONK) {
    const u = (t - SWAT - 32) / (BONK - SWAT - 32);
    return 1.35 - (1.35 + 0.42) * u * u;
  }
  if (t < BONK + 10) return -0.42 + 0.9 * Math.sin(((t - BONK) / 10) * (Math.PI / 2));
  return 0.48 * Math.cos((t - BONK - 10) * 0.17) * Math.exp(-(t - BONK - 10) / 24);
};

const CB_CAM0: CameraShot = { position: [0.02, 1.2, 3.95], target: [0.5, 0.88, 0.2], fov: 40 };
const CB_CAM1: CameraShot = { position: [0.3, 1.1, 2.78], target: [0.55, 0.93, 0.3], fov: 40 };

export const CabinBarry: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, ...CB_CAM0 },
      { at: SWAT + 4, position: [0.1, 1.17, 3.55], target: [0.52, 0.9, 0.25], fov: 40 },
      { at: BONK, position: [0.24, 1.12, 3.0], target: [0.55, 0.92, 0.3], fov: 40 },
      { at: 116, ...CB_CAM1 },
    ],
    f,
  );
  const th = swatTheta(f);
  const cup = bmCup(th);
  const bag = bagOf(cup);
  // the swat: wind up, hit the bag at SWAT, follow through, back to the armrest
  const rest = handWorld(BARRY_AT, [150, -400], camera);
  const wind = handWorld(BARRY_AT, [175, -470], camera);
  const hitAt = bagOf(bmCup(0));
  const hit: Vec3 = [hitAt[0] - BM_AWAY[0] * 0.035, hitAt[1], hitAt[2] - BM_AWAY[1] * 0.035];
  const thru: Vec3 = [hit[0] + BM_AWAY[0] * 0.09, hit[1] + 0.05, hit[2] + BM_AWAY[1] * 0.09];
  const rubLean = 6 - 6 * sm(f, SWAT + 6, SWAT + 20);
  const rub = onCard(BARRY_AT, [195, -770], rubLean, camera, 0.08);
  let hand: Vec3 = rest;
  if (f < SWAT - 2) hand = lerp3(rest, wind, sm(f, SWAT - 10, SWAT - 4));
  else if (f < SWAT + 2) hand = lerp3(wind, hit, sm(f, SWAT - 3, SWAT));
  else if (f < SWAT + 8) hand = lerp3(hit, thru, sm(f, SWAT, SWAT + 6));
  else if (f < BONK + 2) hand = lerp3(thru, rest, sm(f, SWAT + 8, SWAT + 22));
  else if (f < BONK + 24) hand = lerp3(rest, rub, sm(f, BONK + 3, BONK + 10));
  else hand = lerp3(rub, rest, sm(f, BONK + 24, BONK + 34));
  // rubbing the bump
  if (f > BONK + 8 && f < BONK + 26) hand = [hand[0], hand[1] + 0.012 * Math.sin((f - BONK) * 1.1), hand[2]];
  const dt = f - BONK;
  const squashK = dt < 0 || dt > 20 ? 0 : 0.12 * Math.cos(dt * 0.75) * Math.exp(-dt / 4);
  const laugh = f > BONK + 6 ? sm(f, BONK + 6, BONK + 14) : 0;
  const giggle = laugh * (5 * Math.sin((f - BONK) * 0.55) + 2.5 * Math.sin((f - BONK) * 1.3));
  const barry = sitter("barry", BARRY, BARRY_AT, {
    ...faceChange([[-30, "happy"], [BONK - 1, "shocked"], [BONK + 8, "happy"]], f, 4),
    blink: dt >= 0 && dt < 5 ? true : undefined,
    worldR: hand,
    handR: f > SWAT - 4 && f < SWAT + 8 ? "open" : f > BONK + 4 && f < BONK + 26 ? "open" : undefined,
    reachL: laugh > 0 ? [-40, -430] : [-150, -400],
    frontL: laugh > 0.5,
    handL: "open",
    lean: (f < SWAT + 6 ? 6 * sm(f, SWAT - 10, SWAT) : 6 - 6 * sm(f, SWAT + 6, SWAT + 20)) + giggle - 10 * squashK,
    squash: squashK,
    headTilt: (dt > 0 ? -16 * Math.exp(-dt / 9) : 0) + giggle * 0.8,
    lookX: f < SWAT ? 0.15 : f < BONK - 4 ? 0.15 + 0.6 * sm(f, SWAT, SWAT + 12) - 0.4 * sm(f, SWAT + 34, BONK - 4) : 0.05,
    mouthOpen: f > BONK + 6 ? 0.5 + 0.4 * Math.abs(Math.sin((f - BONK) * 0.55)) : f > 44 && f < BONK ? 0.25 + 0.2 * Math.abs(Math.sin(f * 0.4)) : undefined,
    bob: laugh * 6 * Math.abs(Math.sin((f - BONK) * 0.55)),
  });
  const puppets: PuppetPlacement[] = [
    barry,
    sitter("winR", EXTRAS[3], seat({ side: 1, k: 2, r: 1 }), { expression: "bored", lookX: -0.4 }, true),
    sitter("r2a", EXTRAS[0], seat({ side: 1, k: 1, r: 2 }), { ...faceChange([[-30, "bored"], [BONK + 2, "happy"]], f), lookX: -0.3 }, true),
    sitter("r2b", EXTRAS[2], seat({ side: -1, k: 0, r: 2 }), { expression: "happy", lookX: 0.4 }, true),
    sitter("r3", EXTRAS[4], seat({ side: 1, k: 2, r: 3 }), { expression: "bored" }, true),
    sitter("mia", MIA, MIA_AT, { expression: "happy", lookX: 0.6 }, true),
  ];
  const d = DROPS[(1 + 4) % DROPS.length];
  return (
    <Stage
      bg={cabinBg("cruise")}
      camera={camera}
      blur={4}
      light={cabinLight("cruise", f)}
      puppets={seatLegs(puppets, camera).puppets}
      set={
        <CabinSet camera={camera} f={f} mood="cruise" noSeats={["1:0", "-1:0"]} hide={["1:1", "1:0", "-1:0"]}>
          {seatLegs(puppets, camera).legs}
          {/* the rest of Barry's cluster hangs as usual; his own mask is the pendulum */}
          <MaskDrop side={1} z={rowZ(1)} lens={d.lens} swing={d.lens.map((_, k) => 0.12 * Math.sin(f * 0.085 + k * 2.3 + 2.7))} hide={[1, 2]} />
          <Tube a={BM_PIVOT} b={[cup[0], cup[1] + 0.05, cup[2]]} sag={0} bend={th * 0.04} />
          <Mask at={cup} turn={-0.45 + th * 0.35} tilt={1.0 + th * 0.3} bagSwing={-th * 0.5 + (f > SWAT && f < SWAT + 12 ? 0.4 * Math.sin((f - SWAT) * 0.5) : 0)} squash={f >= SWAT && f < SWAT + 10 ? 0.5 * Math.exp(-(f - SWAT) / 3) : 0} />
          <Burst kind="stars" at={[cup[0] - 0.02, 1.13, 0.42]} frame={f - BONK} count={7} size={0.55} seed={3} />
        </CabinSet>
      }
      foreground={
        <>
          <FgMask at={frameSpot(CB_CAM0, ASPECT, -0.82, 0.55, 1.3)} f={f} seed={1} />
          <FgMask at={frameSpot(CB_CAM1, ASPECT, 0.88, 0.66, 0.95)} f={f} seed={2.5} />
        </>
      }
    />
  );
};

// ---------- 5. PsuDrop (570-675): CABIN ALT nearing 15,000, the doors pop, the masks drop ----------

// The cabin-altitude gauge: a round dial (0 to 20,000 ft over 270 degrees), CABIN ALT and FT under the centre, a
// red band from 15,000 with its mark, and the needle at `value` feet. Faces +z; `size` is the dial's radius.
const gaugeAngle = (v: number) => ((-135 + (270 * Math.min(20000, Math.max(0, v))) / 20000) * Math.PI) / 180; // from 12 o'clock, clockwise
const AltGauge: React.FC<{ position: Vec3; value: number; size?: number; glow?: number }> = ({ position, value, size = 0.1, glow = 0 }) => {
  const face = useOwnedTex(() =>
    canvasTexture(512, 512, (ctx) => {
      ctx.fillStyle = "#f6f2e6";
      ctx.beginPath();
      ctx.arc(256, 256, 256, 0, Math.PI * 2);
      ctx.fill();
      const pt = (v: number, r: number): [number, number] => {
        const a = gaugeAngle(v);
        return [256 + Math.sin(a) * r, 256 - Math.cos(a) * r];
      };
      // the red band from 15,000
      ctx.strokeStyle = "#d8322a";
      ctx.lineWidth = 34;
      ctx.beginPath();
      ctx.arc(256, 256, 212, gaugeAngle(15000) - Math.PI / 2, gaugeAngle(20000) - Math.PI / 2);
      ctx.stroke();
      for (let i = 0; i <= 20; i++) {
        const major = i % 5 === 0;
        const [x0, y0] = pt(i * 1000, major ? 168 : 190);
        const [x1, y1] = pt(i * 1000, 232);
        ctx.strokeStyle = i === 15 ? "#b8141a" : "#1d1f26";
        ctx.lineWidth = i === 15 ? 12 : major ? 9 : 5;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      // the 15,000 mark: a red pointer outside the tick and its figure, clear of the needle's sweep
      const [mx, my] = pt(15000, 246);
      const [mx2, my2] = pt(14700, 262);
      const [mx3, my3] = pt(15300, 262);
      ctx.fillStyle = "#c0181e";
      ctx.beginPath();
      ctx.moveTo(mx, my);
      ctx.lineTo(mx2, my2);
      ctx.lineTo(mx3, my3);
      ctx.fill();
      ctx.font = `900 46px ${FONT}`;
      ctx.fillText("15,000", 362, 282);
      ctx.fillStyle = "#1d1f26";
      ctx.font = `900 56px ${FONT}`;
      ctx.fillText("CABIN ALT", 256, 372);
      ctx.font = `900 36px ${FONT}`;
      ctx.fillText("FT", 256, 424);
    }),
  );
  const a = gaugeAngle(value);
  return (
    <group position={position}>
      <Cyl r={size * 1.22} h={0.05} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.01]} color="#2c2f38" rough={0.5} />
      <mesh position={[0, 0, 0.017]}>
        <circleGeometry args={[size, 48]} />
        <meshStandardMaterial map={face} roughness={0.7} emissive="#ffffff" emissiveMap={face} emissiveIntensity={0.25 + glow * 0.2} />
      </mesh>
      {/* the needle, pivoting at the centre */}
      <group position={[0, 0, 0.024]} rotation={[0, 0, -a]}>
        <mesh position={[0, size * 0.36, 0]}>
          <boxGeometry args={[size * 0.07, size * 0.92, 0.006]} />
          <meshStandardMaterial color="#ff7a1a" roughness={0.5} emissive="#ff6a10" emissiveIntensity={0.3} />
        </mesh>
        <mesh position={[0, -size * 0.12, 0]}>
          <boxGeometry args={[size * 0.1, size * 0.2, 0.006]} />
          <meshStandardMaterial color="#1d1f26" roughness={0.5} />
        </mesh>
      </group>
      <Cyl r={size * 0.1} h={0.02} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.03]} color="#1d1f26" />
      {/* a soft glass glint */}
      <mesh position={[-size * 0.35, size * 0.45, 0.034]} rotation={[0, 0, 0.6]}>
        <planeGeometry args={[size * 0.5, size * 0.12]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.25} depthWrite={false} />
      </mesh>
    </group>
  );
};

// The forward attendant station at the front left: a low partition with the attendant panel (buttons, the
// interphone handset in its cradle, the CABIN ALT gauge), its face toward the galley (+z).
const STATION_Z = 2.15;
const GAUGE_AT: Vec3 = [-1.18, 0.65, STATION_Z + 0.08];
const AttendantStation: React.FC<{ value: number; pulse: number }> = ({ value, pulse }) => (
  <group>
    <RBox size={[1.38, 1.2, 0.1]} position={[-1.29, 0.6, STATION_Z]} color="#e8e1d2" radius={0.04} />
    <RBox size={[1.4, 0.05, 0.14]} position={[-1.29, 1.21, STATION_Z]} color="#d6cdbb" radius={0.02} />
    <RBox size={[0.62, 0.5, 0.04]} position={[-1.18, 0.68, STATION_Z + 0.06]} color="#b9bcc4" radius={0.03} />
    <RBox size={[0.56, 0.44, 0.02]} position={[-1.18, 0.68, STATION_Z + 0.08]} color="#d6d8dd" radius={0.025} />
    {/* buttons: a row of lit squares, one amber and blinking */}
    {[0, 1, 2, 3].map((i) => (
      <RBox
        key={i}
        size={[0.045, 0.035, 0.015]}
        position={[-1.4 + i * 0.06, 0.49, STATION_Z + 0.095]}
        color={i === 1 ? "#ffb347" : "#cfd6e2"}
        radius={0.006}
        emissive={i === 1 ? "#ff9a2a" : "#9fb3d0"}
        k={i === 1 ? 1.2 * pulse : 0.3}
      />
    ))}
    {/* the interphone handset in its cradle, coiled cord */}
    <RBox size={[0.07, 0.24, 0.06]} position={[-0.97, 0.66, STATION_Z + 0.1]} color="#d9d6cf" radius={0.03} />
    <RBox size={[0.05, 0.08, 0.05]} position={[-0.97, 0.8, STATION_Z + 0.12]} color="#c4c0b8" radius={0.02} />
    <AltGauge position={GAUGE_AT} value={value} size={0.1} glow={pulse} />
  </group>
);

const PSU_POP = beat(6, 0.53, "psuDrop"); // "pops"
const PSU_FALL = beat(6, 0.82, "psuDrop"); // "masks drop"
const popAt = (side: number, row: number) => PSU_POP + row * 2.6 + (side > 0 ? 1.3 : 0);
const fallAt = (side: number, row: number) => PSU_FALL + row * 1.6 + (side > 0 ? 0.8 : 0);
const psuProgress = (f: number) => (side: number, row: number) => {
  const p = popAt(side, row);
  const q = fallAt(side, row);
  if (f < p) return 0;
  if (f < p + 8) return (0.25 * (f - p)) / 8;
  if (f < q) return 0.25 + 0.02 * ramp(f, p + 8, q);
  return 0.27 + 0.73 * Math.min(1, (f - q) / 20);
};
// the needle: climbing toward the red 15,000 mark on "fifteen thousand", then trembling just under it
const needle = (f: number) => 12300 + 2350 * sm(f, -10, 26) + 280 * sm(f, 30, 90) + 60 * Math.sin(f * 0.9) * sm(f, 10, 30);

const PD_CAM0: CameraShot = { position: [-1.0, 0.76, 3.45], target: [-1.17, 0.58, 2.2], fov: 36 };
const PD_CAM1: CameraShot = { position: [0.25, 1.15, 3.6], target: [1.0, 1.0, -1.5], fov: 46 };

export const PsuDrop: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, ...PD_CAM0 },
      { at: 26, position: [-0.98, 0.78, 3.33], target: [-1.15, 0.6, 2.2], fov: 36 },
      { at: PSU_POP - 4, position: [0.12, 1.1, 3.62], target: [0.95, 1.1, -1.3], fov: 46 },
      { at: 100, ...PD_CAM1 },
    ],
    f,
  );
  const pulse = 0.72 + 0.28 * Math.pow(0.5 + 0.5 * Math.sin(f * 0.21), 2);
  // passengers flinch at the pops and again at the drop; heads turn up and about
  const react = (id: string, look: PuppetLook, s: { side: number; k: number; r: number }, calm: "neutral" | "happy" | "bored", turn: number, crop = true) => {
    const p = PSU_POP + 1 + s.r * 1.5 + s.k * 1.5; // the first doors popping up front startle everyone
    const q = fallAt(s.side, s.r) + 2;
    const flinch = (t: number) => (t < 0 ? 0 : Math.exp(-t / 6) * Math.sin(Math.min(t, 6) * 0.5));
    return sitter(
      id,
      look,
      seat(s),
      {
        ...faceChange([[-30, calm], [p, "shocked"]], f),
        lookX: turn * sm(f, p, p + 8),
        headTilt: turn * 9 * sm(f, p, p + 10) - 6 * flinch(f - q),
        bob: -22 * flinch(f - p) - 16 * flinch(f - q),
        slump: 0.6 * flinch(f - p),
        armL: f > p ? [30 * sm(f, p, p + 6), -40] : undefined,
        armR: f > q ? [28 * sm(f, q, q + 6), -40] : undefined,
      },
      crop,
    );
  };
  const puppets: PuppetPlacement[] = [
    react("winR", EXTRAS[3], { side: 1, k: 2, r: 1 }, "bored", 0.5),
    react("barry", BARRY, SEATING.barry, "happy", -0.4),
    react("mia", MIA, SEATING.mia, "neutral", 0.5),
    react("rose", ROSE, SEATING.rose, "neutral", 0.4),
    react("winL", WIN_LOOK, SEATING.windowLeft, "neutral", 0.6),
    react("r2a", EXTRAS[2], { side: -1, k: 0, r: 2 }, "neutral", 0.5),
    react("r2b", EXTRAS[0], { side: 1, k: 1, r: 2 }, "bored", -0.5),
    react("r2c", EXTRAS[5], { side: -1, k: 2, r: 2 }, "neutral", 0.4),
    react("r3a", EXTRAS[4], { side: 1, k: 0, r: 3 }, "neutral", -0.4),
  ];
  return (
    <Stage
      bg={cabinBg("alarm")}
      camera={camera}
      blur={4}
      light={cabinLight("alarm", f)}
      puppets={seatLegs(puppets, camera).puppets}
      focus={1.3 + 1.9 * sm(f, 30, 75)}
      set={
        <CabinSet camera={camera} f={f} mood="alarm" drop={psuProgress(f)} noSeats={["1:0", "-1:0"]}>
          {seatLegs(puppets, camera).legs}
          <AttendantStation value={needle(f)} pulse={pulse} />
        </CabinSet>
      }
      foreground={
        <>
          {/* the handset's coiled cord near the lens at the start, a bin's rounded edge at the end */}
          <group position={frameSpot(PD_CAM0, ASPECT, 0.92, -0.62, 0.33)}>
            {Array.from({ length: 7 }, (_, i) => (
              <mesh key={i} position={[0, -i * 0.018, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.022, 0.006, 8, 20]} />
                <meshStandardMaterial color="#cfcac0" roughness={0.6} />
              </mesh>
            ))}
          </group>
          <RBox size={[0.3, 0.12, 0.5]} position={frameSpot(PD_CAM1, ASPECT, 1.0, 0.9, 0.5)} color="#f3efe6" radius={0.05} />
        </>
      }
    />
  );
};

// ---------- 6. CabinRows (675-894): Rose helps everyone first, Barry pokes his bag, nobody screams ----------

// In this shot Barry's mask hangs a little further right, clear of his eye from the front.
const BR_PIVOT: Vec3 = [0.82, PSU_Y - 0.01, 0.46];
const brCup = (theta: number): Vec3 => [BR_PIVOT[0] + BM_L * Math.sin(theta) * 0.8, BR_PIVOT[1] - BM_L * Math.cos(theta), BR_PIVOT[2] + BM_L * Math.sin(theta) * 0.6];
const CR_CAM0: CameraShot = { position: [-1.12, 1.15, 3.75], target: [-1.04, 0.9, 0.3], fov: 40 };
const CR_CAM1: CameraShot = { position: [0.72, 1.1, 3.3], target: [0.74, 0.92, 0.3], fov: 40 };
const POKE1 = beat(7, 0.62, "cabinRows"); // "pokes"
const POKE2 = beat(7, 0.83, "cabinRows"); // "bag"
const LAUGH = beat(7, 0.9, "cabinRows"); // "laughs"
const ROSE_MIA = beat(7, 0.3, "cabinRows"); // "everyone": Rose presses Mia's mask on

export const CabinRows: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, ...CR_CAM0 },
      { at: ROSE_MIA, position: [-0.84, 1.14, 3.72], target: [-0.78, 0.9, 0.3], fov: 40 },
      { at: POKE1 - 2, position: [0.5, 1.12, 3.62], target: [0.58, 0.9, 0.3], fov: 40 },
      { at: LAUGH + 6, position: [0.6, 1.11, 3.52], target: [0.65, 0.91, 0.3], fov: 40 },
      { at: 150, position: [0.67, 1.1, 3.42], target: [0.7, 0.91, 0.3], fov: 40 },
      { at: 212, ...CR_CAM1 },
    ],
    f,
  );

  // --- the window passenger lifts their mask to their face; Rose's left hand helps push the bag up ---
  const winLean = 5;
  const winFace = onCard(WIN_AT, MOUTH, winLean, camera, 0.075);
  const winLow: Vec3 = [winFace[0] + 0.07, winFace[1] - 0.14, winFace[2] + 0.06];
  const winCup = lerp3(winLow, winFace, sm(f, -4, 16));
  const winTurn = faceTurn(WIN_AT, camera) * sm(f, -4, 16) + 0.3 * (1 - sm(f, -4, 16));
  const winTop = maskTop(-1, 1, 0);
  const winGrip: Vec3 = [winCup[0] + 0.06, winCup[1] - 0.03, winCup[2]];
  const winBag = bagOf(winCup);
  const roseL: Vec3 = f < 24 ? [winBag[0] + 0.05, winBag[1] - 0.02, winBag[2] + 0.01] : lerp3([winBag[0] + 0.05, winBag[1] - 0.02, winBag[2] + 0.01], handWorld(ROSE_AT, [-110, -420], camera), sm(f, 24, 36));

  // --- Rose holds Mia's mask low, then presses it onto her face and keeps it there ---
  const roseLean = -5 + 10 * sm(f, ROSE_MIA - 12, ROSE_MIA);
  const miaLean = -2 * sm(f, ROSE_MIA - 12, ROSE_MIA);
  const miaFace = onCard(MIA_AT, MOUTH, miaLean, camera, 0.075);
  const miaLow: Vec3 = [miaFace[0] - 0.05, miaFace[1] - 0.17, miaFace[2] + 0.07];
  const miaCup = lerp3(miaLow, miaFace, sm(f, ROSE_MIA - 10, ROSE_MIA + 2));
  const miaTurn = faceTurn(MIA_AT, camera) * sm(f, ROSE_MIA - 10, ROSE_MIA + 2) - 0.4 * (1 - sm(f, ROSE_MIA - 10, ROSE_MIA + 2));
  const roseR: Vec3 = [miaCup[0] - 0.062, miaCup[1] - 0.03, miaCup[2] - 0.01];
  const miaTop = maskTop(-1, 1, 2);

  // --- Rose's own mask dangles above, between her and Mia, untouched ---
  const roseTop: Vec3 = [-0.84, PSU_Y - 0.01, 0.56];
  const roseCup = hangPoint(roseTop, -1, 0.2, 0.08 * Math.sin(f * 0.09) + 0.03 * Math.sin(f * 0.23));

  // --- Barry's mask hangs at his right; he pokes the bag twice, then laughs ---
  const bth = f < POKE1 ? 0.05 * Math.sin(f * 0.11) : 0.22 * Math.sin((f - POKE1) * 0.2) * Math.exp(-(f - POKE1) / 26) + (f > POKE2 ? 0.14 * Math.sin((f - POKE2) * 0.24) * Math.exp(-(f - POKE2) / 22) : 0);
  const bCup = brCup(bth);
  const bBag = bagOf(bCup);
  const p1 = f - POKE1;
  const p2 = f - POKE2;
  const bagSquash = (p1 >= 0 && p1 < 20 ? 0.7 * Math.exp(-p1 / 4) * Math.cos(p1 * 0.7) : 0) + (p2 >= 0 && p2 < 20 ? 0.5 * Math.exp(-p2 / 4) * Math.cos(p2 * 0.8) : 0);
  const bagSwing = (p1 >= 0 ? 0.7 * Math.sin(p1 * 0.32) * Math.exp(-p1 / 14) : 0) - bth * 0.4;
  const bagTip = p2 >= 0 ? -0.9 * Math.sin(p2 * 0.3) * Math.exp(-p2 / 12) : 0;
  const bRest = handWorld(BARRY_AT, [150, -400], camera);
  const poke1: Vec3 = [bBag[0] - 0.045, bBag[1] + 0.01, bBag[2] - 0.02];
  const poke2: Vec3 = [bBag[0] - 0.02, bBag[1] - 0.06, bBag[2] + 0.02];
  const belly = handWorld(BARRY_AT, [60, -430], camera);
  let bHand: Vec3 = bRest;
  if (f < POKE1 + 2) bHand = lerp3(bRest, poke1, sm(f, POKE1 - 8, POKE1));
  else if (f < POKE1 + 8) bHand = lerp3(poke1, [poke1[0] - 0.05, poke1[1] - 0.03, poke1[2] + 0.02], sm(f, POKE1 + 1, POKE1 + 6));
  else if (f < POKE2 + 2) bHand = lerp3([poke1[0] - 0.05, poke1[1] - 0.03, poke1[2] + 0.02], poke2, sm(f, POKE2 - 6, POKE2));
  else if (f < LAUGH) bHand = lerp3(poke2, bRest, sm(f, POKE2 + 3, LAUGH - 2));
  else bHand = lerp3(bRest, belly, sm(f, LAUGH, LAUGH + 8));
  const laugh = sm(f, LAUGH - 2, LAUGH + 6) * (1 - 0.6 * sm(f, 120, 140));
  const giggle = laugh * (6 * Math.sin((f - LAUGH) * 0.6) + 2 * Math.sin((f - LAUGH) * 1.4));
  const calmFrom = beat(8, 0.0, "cabinRows");

  const puppets: PuppetPlacement[] = [
    sitter("winL", WIN_LOOK, WIN_AT, { expression: "bored", lean: winLean, worldR: winGrip, handR: "open", lookX: 0.4, headTilt: 4 }, true),
    sitter("rose", ROSE, ROSE_AT, {
      expression: "happy",
      lean: roseLean,
      worldR: roseR,
      handR: "open",
      worldL: roseL,
      handL: "open",
      lookX: f < 22 ? -0.6 : 0.55,
      headTilt: f < 22 ? -6 : 7,
    }, f > 46),
    // crop while the track crosses the aisle, so keepHeads does not pull the camera back mid-move
    sitter("mia", MIA, MIA_AT, { expression: "happy", lean: miaLean, lookX: -0.5, headTilt: -4 }, f > 46),
    sitter("barry", BARRY, BARRY_AT, {
      ...faceChange([[-30, "happy"], [POKE1 - 6, "excited"], [POKE2 + 8, "happy"]], f),
      worldR: bHand,
      handR: f > POKE1 - 8 && f < POKE2 + 6 ? "point" : "open",
      reachL: laugh > 0.2 ? [-50, -430] : [-150, -400],
      frontL: laugh > 0.5,
      handL: "open",
      lean: 4 * sm(f, POKE1 - 8, POKE1) - 4 * sm(f, POKE2 + 4, LAUGH) + giggle,
      headTilt: giggle * 0.9 - 4 * laugh,
      lookX: f < POKE1 - 10 ? 0.1 : f < LAUGH ? 0.7 : 0.1 * (1 - sm(f, calmFrom, calmFrom + 20)) - 0.2 * sm(f, calmFrom, calmFrom + 20),
      mouthOpen: laugh > 0.05 ? laugh * (0.55 + 0.35 * Math.abs(Math.sin((f - LAUGH) * 0.6))) : undefined,
      bob: laugh * 6 * Math.abs(Math.sin((f - LAUGH) * 0.6)),
    }, f < 72),
    sitter("winR", EXTRAS[3], seat({ side: 1, k: 2, r: 1 }), { ...faceChange([[-30, "bored"], [calmFrom + 10, "happy"]], f), lookX: -0.3 }, true),
    sitter("r2a", EXTRAS[0], seat({ side: 1, k: 1, r: 2 }), { ...faceChange([[-30, "happy"], [calmFrom, "bored"]], f), lookX: -0.2, headTilt: -5 }, true),
    sitter("r2b", EXTRAS[2], seat({ side: -1, k: 0, r: 2 }), { expression: "bored", lookX: 0.3 }, true),
    sitter("r2c", EXTRAS[5], seat({ side: -1, k: 2, r: 2 }), { expression: "happy", lookX: 0.4 }, true),
    sitter("r3a", EXTRAS[4], seat({ side: 1, k: 0, r: 3 }), { expression: "happy", headTilt: 6 }, true),
    sitter("r3b", EXTRAS[1], seat({ side: -1, k: 1, r: 3 }), { expression: "bored" }, true),
  ];
  const dR = DROPS[(1 + 4) % DROPS.length];
  return (
    <Stage
      bg={cabinBg("cruise")}
      camera={camera}
      blur={4}
      light={cabinLight("cruise", f)}
      puppets={seatLegs(puppets, camera).puppets}
      set={
        <CabinSet camera={camera} f={f + 400} mood="cruise" noSeats={["1:0", "-1:0"]} hide={["-1:1", "1:1", "-1:0", "1:0", "1:2"]}>
          {seatLegs(puppets, camera).legs}
          {/* row 2 right: leave the mask off the dazed face behind Barry's empty middle seat */}
          <MaskDrop side={1} z={rowZ(2)} lens={DROPS[(2 + 4) % DROPS.length].lens} swing={[0, 1, 2].map((k) => 0.12 * Math.sin(f * 0.085 + k * 2.3 + 1.1))} hide={[1]} />
          {/* Mia's mask, pulled down by Rose and pressed on */}
          <Tube a={miaTop} b={[miaCup[0], miaCup[1] + 0.05, miaCup[2]]} sag={0.03} bend={0.03} />
          <Mask at={miaCup} turn={miaTurn} tilt={0.08} bagSwing={0.1 * Math.sin(f * 0.13)} />
          {/* the window passenger's mask, in their hand */}
          <Tube a={winTop} b={[winCup[0], winCup[1] + 0.05, winCup[2]]} sag={0.03} bend={-0.02} />
          <Mask at={winCup} turn={winTurn} tilt={0.08} bagSwing={0.08 * Math.sin(f * 0.11 + 1)} />
          {/* Rose's own mask, unused */}
          <Tube a={roseTop} b={[roseCup[0], roseCup[1] + 0.05, roseCup[2]]} sag={0} />
          <Mask at={roseCup} turn={0.35} tilt={0.75} bagSwing={-0.1 * Math.sin(f * 0.09)} />
          {/* Barry's cluster: the other two hang as usual; his own is poked */}
          <MaskDrop side={1} z={rowZ(1)} lens={dR.lens} swing={dR.lens.map((_, k) => 0.12 * Math.sin(f * 0.085 + k * 2.3 + 2.7))} hide={[2]} />
          <MaskDrop side={-1} z={rowZ(1)} lens={dR.lens} swing={[0, 0, 0]} hide={[0, 1, 2]} />
          <Tube a={BR_PIVOT} b={[bCup[0], bCup[1] + 0.05, bCup[2]]} sag={0} bend={bth * 0.04} />
          <Mask at={bCup} turn={-0.45 + bth * 0.35} tilt={0.55 + bth * 0.35} bag={false} />
          <Bag at={[bCup[0], bCup[1] - 0.05, bCup[2] - 0.01]} squash={Math.max(-0.25, bagSquash)} swing={bagSwing} tip={bagTip} />
        </CabinSet>
      }
      foreground={
        <>
          <FgMask at={frameSpot(CR_CAM0, ASPECT, 0.86, 0.72, 1.35)} f={f} seed={0.7} />
          <FgMask at={frameSpot(CR_CAM1, ASPECT, 0.86, 0.72, 1.3)} f={f} seed={2.1} />
        </>
      }
    />
  );
};

// ---------- sound (video frames) ----------

// a different take for every door (foleyCues), the nearest rows loudest
const pops: Sfx[] = [
  ...foleyCues("pop", [0, 1].map((r) => at("psuDrop", Math.round(popAt(r % 2 ? 1 : -1, r)))), 0.36, { space: "room" }),
  ...foleyCues("pop", [2, 3, 4, 5].map((r) => at("psuDrop", Math.round(popAt(r % 2 ? 1 : -1, r)))), 0.27, { space: "room" }),
];
export const cabinShotsSfx: Sfx[] = [
  // CabinBarry: the cabin hum, the swat whoosh, the mask coming back, the bonk
  { at: SHOT.cabinBarry[0], src: sfx("hum"), volume: 0.16, until: SHOT.cabinBarry[1] },
  { at: at("cabinBarry", SWAT), src: sfx("whoosh"), volume: 0.32, space: "room" },
  { at: at("cabinBarry", BONK - 9), src: sfx("whoosh"), volume: 0.2, space: "room" },
  { at: at("cabinBarry", BONK), src: sfx("pop"), volume: 0.55, space: "room", hit: 0.25 },
  // PsuDrop: the alarm chime, the doors popping row by row, the masks falling
  { at: SHOT.psuDrop[0], src: sfx("hum"), volume: 0.12, until: SHOT.psuDrop[1] },
  { at: at("psuDrop", 0), src: sfx("chime"), volume: 0.08, space: "room" },
  { at: at("psuDrop", PSU_POP - 14), src: sfx("chime"), volume: 0.16, space: "room" },
  ...pops,
  { at: at("psuDrop", PSU_FALL - 1), src: sfx("whoosh"), volume: 0.26, space: "room" },
  { at: at("psuDrop", PSU_FALL + 3), src: sfx("paper"), volume: 0.15, space: "room" },
  // CabinRows: the hum, Rose pressing Mia's mask on, Barry's pokes at the bag
  { at: SHOT.cabinRows[0], src: sfx("hum"), volume: 0.15, until: SHOT.cabinRows[1] },
  { at: at("cabinRows", ROSE_MIA), src: sfx("squeak"), volume: 0.5, space: "room" },
  { at: at("cabinRows", POKE1), src: sfx("deflate"), volume: 0.3, space: "room" },
  { at: at("cabinRows", POKE2), src: sfx("squeak"), volume: 0.24, space: "room" },
];

