import React from "react";
import { beatPath, CameraShot, drinkFrom, faceChange, foleyCues, frameSpot, PuppetPlacement, PuppetPose, ramp, Sfx, sfx, Stage, useShotFrame, Vec3 } from "../../engine";
import { BIN_Y, CabinSet, rowZ, SEAT_IN, seatLegs, seatX } from "./cabin";
import { BARRY, CAPTAIN, FIRST_OFFICER, SEATING, SOFIA } from "./cast";
import { CardGroup, cardFrame, cardPoint, Dial, feetText, GeneratorPSU, Hose, MaskBox, Mug, PilotMask, smooth, WornMask } from "./cockpitProps";
import { CAPT, cockpitLight, CockpitSet, FO, maskBoxAt, POD, POD_SIZE, yokeAt } from "./cockpitSets";
import { GALLEY_DROP, galleyLight, GalleySet, SOFIA_AT } from "./galley";
import { at, SHOT } from "./shots";

// Agent "cockpit-galley": the flight deck at cruise and in the dive, the forward galley, the oxygen-generator macro
// (camera_plan.md shots 3, 8, 9, 10). Sets: cockpitSets.tsx (guide/references/airliner-cockpit.md), galley.tsx
// (guide/references/airliner-galley.md); props: cockpitProps.tsx. Word frames come from timing.json's word spans.

const ASPECT = 1080 / 1920;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpV = (a: Vec3, b: Vec3, t: number): Vec3 => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
const ease = (f: number, a: number, b: number) => smooth(ramp(f, a, b));
// Distance from the camera to a point along the view axis (Stage `focus`, for a story prop that is the subject).
const alongAxis = (c: CameraShot, p: Vec3) => {
  const d = [c.target[0] - c.position[0], c.target[1] - c.position[1], c.target[2] - c.position[2]];
  const l = Math.hypot(d[0], d[1], d[2]) || 1;
  return ((p[0] - c.position[0]) * d[0] + (p[1] - c.position[1]) * d[1] + (p[2] - c.position[2]) * d[2]) / l;
};
const P = (id: string, look: PuppetPlacement["look"], atXZ: [number, number], pose: PuppetPose, crop = false): PuppetPlacement => ({ id, look, at: atXZ, pose, crop });

// Word frames (video frames, timing.json words), as frames inside each shot.
const CRUISE0 = SHOT.cockpitCruise[0];
const W_SQUEEZE = 374 - CRUISE0; // "squeezes"
const W_EIGHT = 406 - CRUISE0; // "eight (thousand)"
const DIVE0 = SHOT.cockpitDive[0];
const W_MASK = 1382 - DIVE0; // "mask (up)"
const W_DIVE = 1414 - DIVE0; // "dive"
const W_TEN = 1425 - DIVE0; // "ten (thousand)"
const GALLEY0 = SHOT.galley[0];
const W_PULL = 1170 - GALLEY0;
const W_BREATHE = 1209 - GALLEY0;
const W_HELP = 1228 - GALLEY0;
const GEN0 = SHOT.generator[0];
const W_YANK = 1250 - GEN0;
const W_OXYGEN = 1270 - GEN0;
const W_TWELVE = 1311 - GEN0;
const W_FLAT = 1353 - GEN0;

// ---------- the flight deck ----------

// Horns of a yoke (world), pushed forward by `push`.
const horn = (side: number, s: number, push: number): Vec3 => {
  const y = yokeAt(side, push);
  return [y[0] + s * 0.12, y[1] + 0.05, y[2] + 0.02];
};
// A pilot in profile facing the centre (captain screen-right, first officer screen-left).
const pilot = (id: "captain" | "firstofficer", pose: Partial<PuppetPose>, crop = false): PuppetPlacement =>
  P(
    id,
    id === "captain" ? CAPTAIN : FIRST_OFFICER,
    id === "captain" ? CAPT : FO,
    {
      sit: true,
      view: "side",
      facing: id === "captain" ? 1 : -1,
      ...pose,
    } as PuppetPose,
    crop,
  );

// The pilot's mask, from its box up onto the face. `lift` 0..1 carries it up, `grip` 0..1 the harness closes.
// Returns the props to draw and the point the hand holds (the regulator), in world space.
const donning = (who: [number, number], facing: 1 | -1, camera: CameraShot, lift: number, grip: number) => {
  const fr = cardFrame(who, camera, [0, -800]);
  const box = maskBoxAt(Math.sign(who[0]));
  const boxTop: Vec3 = [box[0], box[1] + 0.16, box[2]];
  const onFace = cardPoint(fr, [0.27 * facing, -0.1, 0.06]);
  const cupAt = lerpV(boxTop, onFace, lift);
  // the hand rides under the regulator
  const hand: Vec3 = lift >= 1 ? cardPoint(fr, [0.32 * facing, -0.19, 0.07]) : [cupAt[0], cupAt[1] - 0.06, cupAt[2]];
  const regulator = lift >= 1 ? cardPoint(fr, [0.34 * facing, -0.16, 0.06]) : [cupAt[0], cupAt[1] - 0.04, cupAt[2]];
  const hose: Vec3[] = [regulator as Vec3, [lerp(regulator[0], box[0], 0.4), Math.min(regulator[1], box[1]) - 0.08, lerp(regulator[2], box[2], 0.5)], [box[0], box[1] + 0.12, box[2]]];
  const node =
    lift >= 1 ? (
      <CardGroup frame={fr}>
        <PilotMask facing={facing} grip={grip} />
      </CardGroup>
    ) : (
      <group position={cupAt} rotation={[0, fr.yaw, 0]}>
        <group scale={0.9}>
          <PilotMask facing={facing} cup />
        </group>
      </group>
    );
  return { node, hand, hose };
};

// The cockpit cameras: K_CAPT from behind the observer seat on the captain (medium), K_DIAL low behind the
// pedestal looking up at the big dial on the glareshield with the windscreen behind it.
const K_CAPT: CameraShot = {
  position: [-0.08, 1.36, 2.4],
  target: [-0.5, 1.02, -0.3],
  fov: 40,
};
const K_DIAL: CameraShot = {
  position: [0.03, 1.0, 0.5],
  target: [0.0, 1.12, -0.8],
  fov: 40,
};

export const CockpitCruise: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, position: [0.0, 1.56, 0.62], target: [0.0, 1.6, -3.0], fov: 46 },
      { at: 28, position: [0.0, 1.5, 0.8], target: [0.0, 1.48, -3.0], fov: 46 },
      // crane back and down between the seats (both heads still just outside the narrow frame), then pan left onto
      // the captain while pulling back (the first officer stays wholly out on the right); then a quick push past the
      // captain so his head leaves the frame within a few frames
      { at: 52, position: [0.0, 1.32, 1.3], target: [0.0, 1.15, -1.5], fov: 40 },
      { at: 70, ...K_CAPT },
      { at: 102, position: [-0.07, 1.35, 2.3], target: [-0.46, 1.03, -0.3], fov: 40 },
      { at: 122, position: [0.0, 1.13, 0.85], target: [0.0, 1.1, -0.8], fov: 40 },
      { at: W_EIGHT, ...K_DIAL },
      {
        at: 195,
        position: [0.03, 0.99, 0.44],
        target: [0.0, 1.12, -0.8],
        fov: 40,
      },
    ],
    f,
  );
  // the jet squeezes the cabin: the needle drops from the outside altitude to eight thousand on "eight"
  const cabinAlt = 35 - 27 * ease(f, W_SQUEEZE - 8, W_EIGHT);
  // the captain sips his coffee: the mug in his near hand (3D, in the card frame at the hand)
  const sip = drinkFrom(f, { start: 68, sip: 26, view: "side", facing: 1 });
  const reachR = sip.pose.reachR as [number, number];
  const mugFrame = cardFrame(CAPT, camera, reachR, -(sip.pose.bob ?? 0));
  const tiltRad = ((sip.pose.itemTilt ?? 0) * Math.PI) / 180;
  const captain = pilot(
    "captain",
    {
      ...faceChange(
        [
          [0, "happy"],
          [70, "neutral"],
          [110, "happy"],
        ],
        f,
      ),
      ...sip.pose,
      hold: undefined,
      worldR: cardPoint(mugFrame, [-0.04, 0.0, 0.02]),
      handR: "fist",
      worldL: horn(-1, -1, 0),
      handL: "fist",
    },
    f < 68 || f > 100,
  );
  // the first officer leans back, hands behind his head, eyes half shut (always just out of frame on the right)
  const fo = pilot(
    "firstofficer",
    {
      expression: "happy",
      face: { lid: 0.45 },
      lean: -6,
      reachR: [150, -860],
      reachL: [110, -900],
      handL: "open",
      handR: "open",
      headTilt: -6 + 3 * Math.sin(f * 0.05),
    },
    true,
  );
  return (
    <Stage
      bg="#123a3a"
      camera={camera}
      set={
        <CockpitSet camera={camera} f={f} mode="cruise" thrust={0.75}>
          <Dial
            position={POD}
            size={POD_SIZE}
            value={cabinAlt}
            max={40}
            nums={[0, 10, 20, 30, 40]}
            minor={2}
            arcs={[
              [0, 8, "#3fbf6a"],
              [8, 14, "#f2c12e"],
              [14, 40, "#d8322c"],
            ]}
            title="CABIN ALT"
            readout={feetText(cabinAlt * 1000, 500)}
            pop={f - W_EIGHT}
          />
          <PodStand />
          <MaskBox position={maskBoxAt(-1)} open={0} />
          <MaskBox position={maskBoxAt(1)} open={0} />
          <CardGroup frame={mugFrame}>
            <group rotation={[0, 0, tiltRad]}>
              <Mug fill={sip.pose.itemFill ?? 0.8} />
            </group>
          </CardGroup>
        </CockpitSet>
      }
      puppets={[captain, fo]}
      light={cockpitLight("cruise", f)}
      blur={4}
      energy={0.7}
      focus={f > 112 ? alongAxis(camera, POD) : f < 36 ? alongAxis(camera, [0, 1.3, -1.0]) : undefined}
      foreground={<ChecklistCard position={[0.17, 1.6, 0.2]} f={f} top={2.0} />}
    />
  );
};

// The pod the big dial stands on, on the glareshield centre.
const PodStand: React.FC = () => (
  <group position={[POD[0], 0, POD[2] - 0.02]}>
    <mesh position={[0, 0.98, 0]}>
      <boxGeometry args={[0.14, 0.06, 0.1]} />
      <meshStandardMaterial color="#1a1d22" roughness={0.6} />
    </mesh>
  </group>
);

// A checklist card hanging on a short chain from the overhead panel's back edge, swaying: soft, near the lens at
// the start of the crane.
const ChecklistCard: React.FC<{ position: Vec3; f: number; top: number }> = ({ position, f, top }) => {
  const chain = Math.max(0.02, top - position[1] - 0.04);
  return (
    <group position={position} rotation={[0, 0.3, 0.05 * Math.sin(f * 0.06)]}>
      <mesh position={[0, 0.04 + chain / 2, 0]}>
        <cylinderGeometry args={[0.004, 0.004, chain, 6]} />
        <meshStandardMaterial color="#9aa1aa" roughness={0.4} />
      </mesh>
      <mesh position={[0, -0.06, 0]}>
        <boxGeometry args={[0.15, 0.2, 0.006]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.8} />
      </mesh>
      {Array.from({ length: 5 }, (_, i) => (
        <mesh key={i} position={[-0.01, 0.0 - i * 0.03, 0.004]}>
          <planeGeometry args={[0.1 - (i % 2) * 0.03, 0.008]} />
          <meshBasicMaterial color="#3a3f46" />
        </mesh>
      ))}
      <mesh position={[0, 0.02, 0.004]}>
        <planeGeometry args={[0.13, 0.025]} />
        <meshBasicMaterial color="#c0392b" />
      </mesh>
    </group>
  );
};

// The dive's soft foreground: a checklist card hanging from the ceiling at the upper right of the opening view.
const DIVE_CARD = frameSpot(K_CAPT, ASPECT, 0.82, 0.62, 0.9);

export const CockpitDive: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, ...K_CAPT },
      {
        at: 24,
        position: [-0.08, 1.34, 2.28],
        target: [-0.48, 1.02, -0.3],
        fov: 40,
      },
      { at: 42, position: [0.0, 1.1, 0.85], target: [0.0, 1.12, -0.8], fov: 40 },
      { at: W_TEN, ...K_DIAL },
      {
        at: 106,
        position: [0.02, 0.99, 0.38],
        target: [0.0, 1.14, -0.8],
        fov: 40,
      },
    ],
    f,
  );
  const pitch = 0.32 * ease(f, W_DIVE - 6, W_DIVE + 16);
  const descent = ease(f, W_DIVE - 6, 106);
  const push = 0.07 * ease(f, W_DIVE - 4, W_DIVE + 8);
  const thrust = 0.75 - 0.72 * ease(f, W_DIVE - 4, W_DIVE + 6);
  const alt = 35 - 25 * ease(f, 20, W_TEN);
  // the captain: hand to the box, mask up and on by "mask up", harness grips, then both hands on the yoke
  const lift = ease(f, -2, W_MASK - 2);
  const grip = ease(f, W_MASK - 2, W_MASK + 5);
  const capt = donning(CAPT, 1, camera, lift, grip);
  const toYoke = ease(f, W_MASK + 6, W_MASK + 16);
  const boxL: Vec3 = [maskBoxAt(-1)[0], maskBoxAt(-1)[1] + 0.14, maskBoxAt(-1)[2]];
  const reachBox = ease(f, -8, -1);
  const handL: Vec3 = lift <= 0 ? lerpV(horn(-1, -1, 0), boxL, reachBox) : lerpV(capt.hand, horn(-1, -1, push), toYoke);
  const fo = donning(FO, -1, camera, ease(f, 2, W_MASK + 2), ease(f, W_MASK + 2, W_MASK + 8));
  const captain = pilot(
    "captain",
    {
      ...faceChange(
        [
          [-10, "shocked"],
          [W_MASK + 4, "determined"],
        ],
        f,
      ),
      worldL: handL,
      handL: "fist",
      worldR: horn(-1, 1, push),
      handR: "fist",
      lean: 4 * push * 14,
    },
    f > 36,
  );
  const firstOfficer = pilot(
    "firstofficer",
    {
      ...faceChange(
        [
          [-10, "shocked"],
          [W_MASK + 8, "determined"],
        ],
        f,
      ),
      worldR: fo.hand,
      handR: "fist",
      worldL: horn(1, -1, push * 0.5),
      handL: "fist",
    },
    true,
  );
  return (
    <Stage
      bg="#2a3550"
      camera={camera}
      set={
        <CockpitSet camera={camera} f={f} mode="dive" pitch={pitch} descent={descent} thrust={thrust} yokePush={push}>
          <Dial
            position={POD}
            size={POD_SIZE}
            value={alt}
            max={40}
            nums={[0, 10, 20, 30, 40]}
            minor={2}
            arcs={[[0, 10, "#3fbf6a"]]}
            title="ALTITUDE"
            readout={feetText(alt * 1000, 250)}
            readoutColor="#7fe0ff"
            pop={f - W_TEN}
          />
          <PodStand />
          <MaskBox position={maskBoxAt(-1)} open={ease(f, -4, 2)} />
          <MaskBox position={maskBoxAt(1)} open={ease(f, 0, 6)} />
          {capt.node}
          <Hose points={capt.hose} r={0.016} color="#5a6168" rough={0.7} />
          {fo.node}
          <Hose points={fo.hose} r={0.016} color="#5a6168" rough={0.7} />
        </CockpitSet>
      }
      puppets={[captain, firstOfficer]}
      light={cockpitLight("dive", f)}
      blur={4}
      energy={0.6}
      focus={f > 34 ? alongAxis(camera, POD) : undefined}
      foreground={<ChecklistCard position={DIVE_CARD} f={f + 40} top={2.1} />}
    />
  );
};

// ---------- the galley ----------

const K_GALLEY: CameraShot = {
  position: [0.5, 1.12, 3.4],
  target: [0.08, 0.9, 0],
  fov: 40,
};
export const Galley: React.FC = () => {
  const f = useShotFrame();
  const camera = beatPath(
    [
      { at: 0, ...K_GALLEY },
      {
        at: 74,
        position: [0.24, 1.02, 2.35],
        target: [0.08, 0.88, 0],
        fov: 38,
      },
    ],
    f,
  );
  const [sx, sz] = SOFIA_AT;
  // the mask: hanging and swinging, grabbed, yanked down hard on "Pull ... down", held up on "breathe"
  const hang: Vec3 = [sx + 0.25 + 0.02 * Math.sin(f * 0.25), 0.85, sz + 0.12];
  const low: Vec3 = [sx + 0.2, 0.7, sz + 0.2];
  const up: Vec3 = [sx + 0.2, 0.8, sz + 0.24];
  const yank = ease(f, W_PULL + 1, W_PULL + 8);
  const raise = ease(f, W_BREATHE - 4, W_BREATHE + 4) * (1 - ease(f, W_HELP - 2, W_HELP + 6));
  const shake = f > W_PULL + 8 && f < W_BREATHE - 4 ? 0.015 * Math.sin(f * 1.3) : 0;
  const mask: Vec3 = lerpV(lerpV(hang, low, yank), up, raise);
  mask[1] += shake;
  const reach = ease(f, -8, 0);
  const rest: Vec3 = [sx + 0.2, 0.45, sz + 0.08];
  const grab: Vec3 = [mask[0], mask[1] + 0.1, mask[2] + 0.03];
  const handR: Vec3 = f < 0 ? lerpV(rest, [hang[0], hang[1] + 0.1, hang[2] + 0.03], reach) : grab;
  const drop: Vec3 = [GALLEY_DROP[0], GALLEY_DROP[1] - 0.02, GALLEY_DROP[2]];
  const slack = 1 - yank;
  const tube: Vec3[] = [drop, [lerp(drop[0], mask[0], 0.5) + 0.03 * slack, lerp(drop[1], mask[1], 0.5) - 0.04 * slack, lerp(drop[2], mask[2], 0.5)], [mask[0], mask[1] + 0.07, mask[2]]];
  const other: Vec3 = [GALLEY_DROP[0] + 0.16 + 0.04 * Math.sin(f * 0.21 + 1), 1.16, GALLEY_DROP[2] + 0.03 * Math.cos(f * 0.17)];
  const sofia = P("sofia", SOFIA, SOFIA_AT, {
    view: "front",
    ...faceChange(
      [
        [-10, "shocked"],
        [W_PULL, "determined"],
        [W_HELP - 2, "angry"],
      ],
      f,
    ),
    worldR: handR,
    handR: "fist",
    frontR: true,
    lean: 5 * yank * (1 - raise),
    slump: 0.15 * yank,
    reachL: f > W_HELP ? [-250, -760 - 30 * ease(f, W_HELP, W_HELP + 6)] : [-170, -430],
    handL: f > W_HELP ? "point" : "open",
  });
  const curtain = frameSpot(K_GALLEY, ASPECT, 0.78, 0, 1.1);
  return (
    <Stage
      bg="#5a626e"
      camera={camera}
      set={
        <GalleySet camera={camera} f={f}>
          <Hose points={tube} r={0.007} color="#d8eef5" opacity={0.8} rough={0.25} />
          <group position={mask} rotation={[0.3 * (1 - yank), 0, 0]}>
            <WornMask flat={0.3} elastic={false} />
          </group>
          <Hose points={[drop, [other[0], other[1] + 0.07, other[2]]]} r={0.007} color="#d8eef5" opacity={0.8} rough={0.25} />
          <group position={other} rotation={[0.3, -0.3, 0.2 * Math.sin(f * 0.21)]}>
            <WornMask flat={0.3} elastic={false} />
          </group>
        </GalleySet>
      }
      puppets={[sofia]}
      light={galleyLight(f)}
      blur={4}
      energy={0.7}
      foreground={<NearCurtain position={[curtain[0], 0, curtain[2]]} f={f} />}
    />
  );
};

// The near edge of the galley curtain, close to the lens (soft foreground).
const NearCurtain: React.FC<{ position: Vec3; f: number }> = ({ position, f }) => (
  <group position={position}>
    <mesh position={[0.15, 1.76, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.012, 0.012, 0.5, 8]} />
      <meshStandardMaterial color="#c8ccd2" roughness={0.4} />
    </mesh>
    {Array.from({ length: 4 }, (_, i) => (
      <mesh key={i} position={[0.04 + i * 0.07, 0.88, (i % 2) * 0.04 + Math.sin(f * 0.06 + i) * 0.005]}>
        <boxGeometry args={[0.08, 1.76, 0.06]} />
        <meshStandardMaterial color={i % 2 ? "#2a3a6e" : "#33447a"} roughness={0.95} />
      </mesh>
    ))}
  </group>
);

// ---------- the oxygen generator, then Barry ----------

const BARRY_AT: [number, number] = [seatX(SEATING.barry.side, SEATING.barry.k), rowZ(SEATING.barry.r) + SEAT_IN];
const BARRY_HEAD: Vec3 = [BARRY_AT[0], 0.95, BARRY_AT[1]];
// The opened service unit over Barry's row, turned a little toward the aisle so its canister lies across the macro.
const GEN_AT: Vec3 = [1.12, BIN_Y - 0.185, rowZ(SEATING.barry.r) + 0.12];
const GEN_YAW = 0.6;
const genLocal = (p: Vec3): Vec3 => {
  const c = Math.cos(GEN_YAW);
  const s = Math.sin(GEN_YAW);
  return [GEN_AT[0] + p[0] * c + p[2] * s, GEN_AT[1] + p[1], GEN_AT[2] - p[0] * s + p[2] * c];
};
// Macro cameras face the canister's label (its normal is the unit's -x turned by GEN_YAW), a little below it.
const LABEL_N: Vec3 = [-Math.cos(GEN_YAW), 0, Math.sin(GEN_YAW)];
const macro = (target: Vec3, dist: number, fov = 40, rise = -0.12): CameraShot => ({
  position: [target[0] + LABEL_N[0] * dist, target[1] + rise, target[2] + LABEL_N[2] * dist],
  target,
  fov,
});
// Barry from across the aisle at head height (a high camera leans a seated card back into its own headrest), clear
// of the row in front.
const K_BARRY: CameraShot = {
  position: [-0.36, 1.0, 1.1],
  target: [BARRY_AT[0], 0.9, BARRY_AT[1] + 0.02],
  fov: 46,
};

export const Generator: React.FC = () => {
  const f = useShotFrame();
  const kPin = macro(genLocal([0, -0.02, 0.2]), 0.72);
  const camera = beatPath(
    [
      { at: 0, ...kPin },
      { at: W_OXYGEN + 10, ...macro(genLocal([-0.03, -0.01, 0.02]), 0.92) },
      {
        at: W_TWELVE + 2,
        ...macro(genLocal([-0.05, -0.07, 0]), 0.88, 40, -0.16),
      },
      {
        at: W_TWELVE + 20,
        ...macro(genLocal([-0.06, -0.08, -0.01]), 0.86, 40, -0.18),
      },
      { at: W_FLAT, ...K_BARRY },
      {
        at: 128,
        position: [-0.32, 0.99, 1.04],
        target: [BARRY_AT[0], 0.9, BARRY_AT[1] + 0.02],
        fov: 46,
      },
    ],
    f,
  );
  const hot = ease(f, W_YANK + 2, W_YANK + 30);
  // Barry: mask on his face, his right hand on it, the left pokes the flat bag on "flat bag"
  const fr = cardFrame(BARRY_AT, camera, [0, -712]);
  const cup = cardPoint(fr, [0, 0, 0.08]);
  const poke = ease(f, W_FLAT - 4, W_FLAT + 2) * (1 - ease(f, W_FLAT + 8, W_FLAT + 14));
  const barry = P(
    "barry",
    BARRY,
    BARRY_AT,
    {
      sit: true,
      view: "front",
      ...faceChange(
        [
          [0, "happy"],
          [W_FLAT - 2, "confused"],
        ],
        f,
      ),
      face: { lid: 0.35 },
      worldR: cardPoint(fr, [0.075, -0.01, 0.05]),
      handR: "open",
      worldL: poke > 0.01 ? cardPoint(fr, [0.0, -0.15 + 0.02 * poke, 0.1]) : undefined,
      handL: poke > 0.01 ? "point" : undefined,
      reachL: poke > 0.01 ? undefined : [-150, -420],
    },
    f < W_FLAT - 12,
  );
  // the mask's tube runs from the unit down to Barry's mask, the lanyard from the pin down beside it
  const tubeTop = genLocal([-0.06, -0.1, 0.3]);
  const tubeDrop = genLocal([-0.06, -0.38, 0.3]);
  const tagFace = Math.atan2(LABEL_N[0], LABEL_N[2]) - GEN_YAW;
  const coil = frameSpot(kPin, ASPECT, -0.93, 0.1, 0.4);
  return (
    <Stage
      bg="#3a2a1a"
      camera={camera}
      set={
        <CabinSet camera={camera} f={f + 1241} mood="alarm" hide={["1:1"]}>
          {seatLegs([barry], camera).legs}
          <group position={GEN_AT} rotation={[0, GEN_YAW, 0]}>
            <GeneratorPSU position={[0, 0, 0]} f={f} hot={hot} pin={f - W_YANK} twelve={f - W_TWELVE} lanyardTo={[-0.06, -0.3, 0.3]} tagYaw={tagFace} />
          </group>
          <Hose
            points={[tubeTop, tubeDrop, cardPoint(fr, [0.36, 0.22, 0.12]), cardPoint(fr, [0.27, -0.02, 0.13]), cardPoint(fr, [0.1, -0.03, 0.1])]}
            r={0.006}
            color="#d8eef5"
            opacity={0.85}
            rough={0.25}
          />
          <CardGroup frame={fr}>
            <WornMask flat={ease(f, 60, W_FLAT)} poke={poke} />
          </CardGroup>
          {/* a loop of the middle seat's clear tube hanging from the unit, close to the lens */}
          <Hose
            points={[
              genLocal([-0.14, -0.12, -0.36]),
              [coil[0], coil[1] + 0.2, coil[2]],
              [coil[0] + 0.015, coil[1], coil[2] + 0.01],
              [coil[0] - 0.01, coil[1] - 0.12, coil[2]],
              [coil[0] + 0.01, coil[1] - 0.4, coil[2]],
            ]}
            r={0.007}
            color="#d8eef5"
            opacity={0.7}
            rough={0.25}
          />
        </CabinSet>
      }
      puppets={seatLegs([barry], camera).puppets}
      light={{
        tint: "#ffe2c0",
        shadow: 0.14,
        distant: [{ direction: [-1, 0.35, 0.45], color: "#fff1dc", strength: 1.1 }],
        points: [
          {
            position: GEN_AT,
            color: "#ff8a3a",
            strength: 0.7 * hot,
            range: 1.1,
          },
        ],
      }}
      blur={5}
      energy={0.6}
      focus={lerp(alongAxis(camera, GEN_AT), alongAxis(camera, BARRY_HEAD), ease(f, W_TWELVE + 10, W_FLAT - 6))}
    />
  );
};

// ---------- sound ----------

const cr = (l: number) => at("cockpitCruise", l);
const dv = (l: number) => at("cockpitDive", l);
const gl = (l: number) => at("galley", l);
const gn = (l: number) => at("generator", l);
export const cockpitSfx: Sfx[] = [
  // cruise: the flight deck hum and a little wind on the glass, the cup clinks down after the sip
  {
    at: SHOT.cockpitCruise[0],
    src: sfx("hum"),
    volume: 0.15,
    until: SHOT.cockpitCruise[1],
  },
  {
    at: SHOT.cockpitCruise[0],
    src: sfx("wind"),
    volume: 0.08,
    until: SHOT.cockpitCruise[1],
  },
  { at: cr(68), src: sfx("clink"), volume: 0.24, space: "room" },
  { at: cr(118), src: sfx("clink"), volume: 0.32, space: "room" },
  { at: cr(W_EIGHT), src: sfx("pop"), volume: 0.3, space: "room" },
  // galley: the yank and the clatter of the drop box
  { at: gl(W_PULL + 2), src: sfx("clang"), volume: 0.45, space: "room" },
  ...foleyCues("thud", [gl(W_PULL + 8), gl(W_PULL + 20)], 0.55, {
    space: "room",
  }),
  // generator: the pin pops, oxygen hisses, the canister sizzles hot, the 12 MIN tag pops, the flat bag
  { at: gn(W_YANK + 1), src: sfx("pop"), volume: 0.5, space: "room" },
  { at: gn(W_YANK + 3), src: sfx("hiss"), volume: 0.36, space: "room" },
  {
    at: gn(W_YANK + 8),
    src: sfx("crackle"),
    volume: 0.16,
    until: gn(W_TWELVE + 30),
  },
  { at: gn(W_TWELVE), src: sfx("pop"), volume: 0.55, space: "room" },
  { at: gn(W_FLAT + 2), src: sfx("deflate"), volume: 0.22, space: "room" },
  // dive: master warning chimes (each a little different), the masks snap on, the whoosh of the dive, the wind
  {
    at: SHOT.cockpitDive[0],
    src: sfx("hum"),
    volume: 0.1,
    until: SHOT.cockpitDive[1],
  },
  { at: dv(0), src: sfx("chime"), volume: 0.08, space: "room" },
  { at: dv(10), src: sfx("chime"), volume: 0.13, space: "room" },
  { at: dv(21), src: sfx("chime"), volume: 0.11, space: "room" },
  { at: dv(W_MASK - 1), src: sfx("button"), volume: 0.15, space: "room" },
  { at: dv(W_MASK + 5), src: sfx("button"), volume: 0.22, space: "room" },
  { at: dv(W_MASK + 2), src: sfx("hiss"), volume: 0.14, space: "room" },
  { at: dv(W_DIVE - 5), src: sfx("whoosh"), volume: 0.26, space: "room" },
  {
    at: dv(W_DIVE - 2),
    src: sfx("wind"),
    volume: 0.12,
    until: SHOT.cockpitDive[1],
  },
];
