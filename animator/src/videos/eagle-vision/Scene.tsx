import React from "react";
import { AbsoluteFill } from "remotion";
import {
  CameraShot,
  faceChange,
  lerp3,
  moveChange,
  MUSIC_FILES,
  MusicCue,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import { Badge, Ball, Cap, Dog, ease } from "../dog-nose/props";
import { BedroomSet, bedroomLight, Cloud, StreetMode, StreetSet, streetLight } from "../dog-nose/sets";
import { Dutch, Shout } from "../dog-nose/Shout";
import { ALEX, Backdrop, BED_AIR, BED_AT, EMMA, JENKINS, MIRROR_MASK } from "./Design";
import { EagleHud, ZoomLines } from "./Hud";
import { DizzyStars, Eagle, EagleEye, Fly, MirrorArch, Mug, Pigeon } from "./props";
import { CAFE, CafeFront, NeighbourSet, neighbourLight } from "./sets";
import TIMING_JSON from "./timing.json";

// "You Wake Up With an Eagle's Vision": the user's own comedy script. Alex wakes with a golden eagle eye, zooms across
// the room to a fly and out to an eagle, spots Mr Jenkins picking his nose across the street, waves at Emma (who waves
// at Buddy the dog), stares at a second bird and walks into a glass café door. A pigeon strolls by. Sets: dog-nose's
// bedroom and street plus the neighbour's block and the glass café (sets.tsx), props in props.tsx, designed on the
// EagleVisionDesign board (videos/eagle-vision/design.md).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "eagle-vision";
export const timing = TIMING;

const cam = (position: Vec3, target: Vec3, fov = 40): CameraShot => ({ position, target, fov });
const move = (a: CameraShot, b: CameraShot, p: number): CameraShot => {
  const e = ease(Math.max(0, Math.min(1, p)));
  return { position: lerp3(a.position, b.position, e), target: lerp3(a.target, b.target, e), fov: a.fov + (b.fov - a.fov) * e };
};
const alex = (at: [number, number], pose: Partial<PuppetPose> & { expression: PuppetPose["expression"] }): PuppetPlacement => ({ id: "alex", look: ALEX, at, pose: pose as PuppetPose });
const emma = (at: [number, number], pose: Partial<PuppetPose> & { expression: PuppetPose["expression"] }): PuppetPlacement => ({ id: "emma", look: EMMA, at, pose: pose as PuppetPose });
const jenkins = (at: [number, number], pose: Partial<PuppetPose> & { expression: PuppetPose["expression"] }): PuppetPlacement => ({ id: "jenkins", look: JENKINS, at, pose: pose as PuppetPose });

// ---------- staging helpers ----------

const street = (
  mode: StreetMode,
  c: CameraShot,
  f: number,
  puppets: PuppetPlacement[],
  extra?: React.ReactNode,
  opts: { clear?: [number, number]; blur?: number; energy?: number; sheen?: number; smudge?: number; hit?: number; crack?: number } = {},
) => (
  <Stage
    bg="#88c8ff"
    camera={c}
    set={
      <StreetSet camera={c} f={f} mode={mode} bins={false} corner={false} omit={[20]} clear={opts.clear ?? [16.5, 24.5]} skipBlades={[16.6, 25.4, -4.4, -0.55]}>
        <CafeFront f={f} sheen={opts.sheen} smudge={opts.smudge} hit={opts.hit} crack={opts.crack} />
        {extra}
      </StreetSet>
    }
    puppets={puppets}
    light={streetLight(mode)}
    blur={opts.blur}
    energy={opts.energy ?? 0.5}
  />
);
const bedroom = (c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, opts: { blur?: number; energy?: number } = {}) => (
  <Stage
    bg="#2a1f3a"
    camera={c}
    set={
      <BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false} hang={false}>
        {extra}
      </BedroomSet>
    }
    puppets={puppets}
    light={bedroomLight()}
    blur={opts.blur}
    energy={opts.energy ?? 0.4}
  />
);
const block = (c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, opts: { blur?: number; energy?: number } = {}) => (
  <Stage bg="#cfe8ff" camera={c} set={<NeighbourSet camera={c} f={f}>{extra}</NeighbourSet>} puppets={puppets} light={neighbourLight()} blur={opts.blur} energy={opts.energy ?? 0.3} />
);

// A clear-sky Stage for the eagle close-ups: backdrop, clouds below the bird for depth and parallax.
const skyClose = (c: CameraShot, f: number, eagle: React.ReactNode, energy = 0.4) => (
  <Stage
    bg="#7fc8ff"
    camera={c}
    set={
      <Backdrop camera={c} color="#7fc8ff">
        {eagle}
        <Cloud position={[-2.4, -1.5, -9]} s={1.1} color="#e6f2ff" />
        <Cloud position={[3.4, -1.6, -11]} s={1.4} color="#dcecfb" />
        <Cloud position={[-0.5, -2.6, -14]} s={1.8} color="#e6f2ff" />
      </Backdrop>
    }
    energy={energy}
  />
);

const EAGLE_AT: Vec3 = [7.5, 15, -8];
const skyScene = (c: CameraShot, f: number, eagleRot: Vec3 = [0, -0.7, 0.15], at: Vec3 = EAGLE_AT, puppets: PuppetPlacement[] = []) =>
  street(
    "morning",
    c,
    f + 20,
    puppets,
    <>
      <Eagle position={at} f={f} scale={3.4} rotation={eagleRot} glide={1} />
      <Cloud position={[2, 17, -30]} s={4} color="#ffffff" />
      <Cloud position={[16, 13, -24]} s={3} color="#ffffff" />
      <Cloud position={[9, 22, -36]} s={5} color="#f2f8ff" />
    </>,
    { clear: [3.5, 12], energy: 0.5 },
  );

// ---------- 0-175: the hook ----------

// The video opens, and ends, on one eye: closed lid, then it snaps open and the iris turns gold. The shot's clock can be
// offset: the last frames are this shot just before frame 0, so the Short loops.
const LOOP = 30;
const eyeAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const open = f < 0 ? 0.12 : 0.12 + 0.88 * ease(ramp(f, 0, 22));
  const gold = ease(ramp(f, 14, 26));
  const c = cam([0.3, 0.15, 4.5 - 0.7 * ease(ramp(f, -LOOP, 30))], [0, 0.1, 0], 38);
  return (
    <Dutch deg={-6}>
      <Stage
        bg="#1b1233"
        camera={c}
        set={
          <Backdrop camera={c} color="#2a1a3a">
            <EagleEye position={[0, 0, 0]} f={f} open={open} gold={gold} pupil={0.75 - 0.7 * gold} ring={f > 22 ? ramp(f, 22, 40) : 0} rotation={[0.1, -0.25, 0.14]} />
          </Backdrop>
        }
        energy={0}
      />
    </Dutch>
  );
};
const EyeOpen = eyeAt(0);
const LoopEye = eyeAt(-LOOP);

// Alex's face, golden eyes: the title slams in.
const AlexEyes: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.55, 1.0, 1.9], [0.3, 0.97, -0.2], 30), cam([0.45, 1.0, 1.55], [0.3, 0.97, -0.2], 30), f / 30);
  return (
    <AbsoluteFill>
      <Dutch deg={-14}>
        <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false} hang={false} />} puppets={[alex([0.3, -0.2], { ...faceChange([[0, "shocked"], [12, "excited"]], f), gold: 1, lookX: 0.4 })]} light={bedroomLight()} blur={5} energy={0.2} />
      </Dutch>
      <Shout f={f} text={"EAGLE VISION\nUNLOCKED!"} at={6} y={170} color="#ffb000" size={96} />
    </AbsoluteFill>
  );
};

// "And holy cow!": the mirror shows him with golden eyes (the reflection lies in the glass and is masked to it).
const MirrorShot: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.0, 1.4, 3.7], [-1.9, 1.0, 1.65], 46), cam([0.4, 1.3, 3.0], [-2.0, 1.05, 1.6], 42), f / 42);
  const hang = { armL: [8, 14] as [number, number], armR: [8, 14] as [number, number] };
  return bedroom(
    c,
    f,
    [
      alex([-1.3, 1.7], { expression: "shocked", view: "back", lookX: 0.3, ...hang, armL: [20 + ease(ramp(f, 6, 16)) * 120, 20] }),
      { id: "alex-ref", look: ALEX, at: [-2.46, 1.5], pose: { ...hang, expression: "shocked", gold: 1, lookX: -0.2, view: "front", armR: [20 + ease(ramp(f, 6, 16)) * 120, 20] } as PuppetPose, mask: MIRROR_MASK, fixedYaw: Math.PI / 2 },
    ],
    <>
      <MirrorArch position={[-2.47, 0, 1.5]} rotation={[0, Math.PI / 2, 0]} width={1.6} height={2.2} sheen={0.5} front={0.12} />
      <Ball position={[-2.475, 1.08, 1.5]} radius={0.3} color="#ffc21a" glow opacity={0.28} scale={[0.04, 1, 1]} />
      <pointLight position={[-2.1, 1.1, 1.5]} intensity={0.9} distance={2.2} color="#ffc84a" />
    </>,
    { blur: 3, energy: 0.2 },
  );
};

// "You can see everything": a fly on the wall, HUD locking on, front legs rubbing.
const FlyShot: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([1.55, 2.3, 0.2], [1.85, 2.2, -2.47], 28), cam([1.55, 2.3, -0.5], [1.85, 2.2, -2.47], 20), f / 36);
  return (
    <AbsoluteFill>
      {bedroom(
        c,
        f,
        [],
        <>
          <Fly position={[1.85, 2.2, -2.47]} f={f} scale={3.2} wall={0.3} />
          <mesh position={[1.85, 2.15, -2.485]} rotation={[0, 0, 0.06]}>
            <planeGeometry args={[1.0, 1.2]} />
            <meshStandardMaterial color="#f6efe0" roughness={0.9} />
          </mesh>
        </>,
        { blur: 3, energy: 0.2 },
      )}
      <EagleHud f={f} zoom={0.5 + 0.5 * ramp(f, 0, 30)} range={`${(6 - 2.6 * ramp(f, 0, 30)).toFixed(1)} M`} cy={880} r={300} lock={ramp(f, 14, 30)} />
    </AbsoluteFill>
  );
};

// The camera rockets up out of the window: worm's-eye from the street with zoom lines, a tiny bird in the sky.
const SkyZoom: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([4.8, 0.8, 3.2], [6.5, 6, -6], 64), cam([5.2, 1.0, 3.6], [7.5, 13, -8], 26), f / 37);
  return (
    <AbsoluteFill>
      {skyScene(c, f, [0, -0.7, 0.2], [8.5, 11.5, -8], [alex([5.1, 0.1], { view: "back", expression: "excited" })])}
      <ZoomLines f={f} strength={0.9 - 0.4 * ramp(f, 20, 37)} cy={900} />
    </AbsoluteFill>
  );
};

// "A tiny bird flying way up in the sky?": telephoto, the HUD ranging in.
const SkyTele: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([5.5, 1.0, 4], [7.5, 15, -8], 36), cam([5.5, 1.0, 4], [7.5, 15, -8], 15), f / 40);
  return (
    <AbsoluteFill>
      {skyScene(c, f, [0, -0.7, 0.15], [EAGLE_AT[0] + f * 0.03, EAGLE_AT[1], EAGLE_AT[2]])}
      <EagleHud f={f} zoom={0.3 + 0.7 * ramp(f, 0, 40)} range={`${(1.8 - 0.6 * ramp(f, 0, 40)).toFixed(1)} KM`} cy={800} lock={ramp(f, 20, 44)} />
    </AbsoluteFill>
  );
};

// The eagle, close, locked on.
const EagleLock: React.FC = () => {
  const f = useShotFrame();
  const a = -0.35 + 0.6 * ease(ramp(f, 0, 43));
  const c = cam([0.2 + Math.sin(a) * 0.8, 0.2, 3.4], [-0.1, 0.1, 0], 46);
  return (
    <AbsoluteFill>
      {skyClose(c, f, <Eagle position={[0, 0.1 + Math.sin(f * 0.2) * 0.02, 0]} f={f + 30} scale={1.2} rotation={[0.15, -0.75, 0.15]} />, 0.3)}
      <EagleHud f={f} zoom={0.8} range="0.8 KM" cy={820} lock={0.4 + 0.6 * ramp(f, 4, 30)} />
    </AbsoluteFill>
  );
};

// ---------- 265-352: the street, the block opposite ----------

// "NO PROBLEM!": Alex on the café forecourt, hands on hips, golden eyes, low angle; the glass door with DOOR on it stands
// behind him (the seed of the ending, seen at 9 s).
const NoProblem: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([18.4, 0.35, 3.9], [20.7, 1.25, -0.4], 56), cam([18.8, 0.4, 3.2], [20.6, 1.3, -0.4], 52), f / 40);
  return (
    <Dutch deg={-5}>
      {street("morning", c, f, [alex([19.0, 0.6], { ...faceChange([[0, "excited"], [10, "smug"]], f), gesture: "handsOnHips", gold: 1 })])}
    </Dutch>
  );
};

// "Then you look across the street": the whole block, then a slow push on the window.
const BlockWide: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([-3, 3.2, 34], [0, 1.2, 0], 36), cam([-1.2, 2.0, 18], [0, 1.3, 0], 34), f / 47);
  return (
    <AbsoluteFill>
      {block(c, f, [jenkins([0, -1.1], { expression: "neutral" })], undefined, { energy: 0.3 })}
      <ZoomLines f={f} strength={ramp(f, 30, 47) * 0.7} cy={900} />
    </AbsoluteFill>
  );
};

// Mr Jenkins's hand holding the mug: a black mitten and an arm, drawn in the window plane.
const mugHand = (lift: number): React.ReactNode => (
  <>
    <Mug position={[0.1, 0.62 + lift * 0.14, -0.8]} scale={3.0} steam={1} f={0} />
    <Ball position={[0.3, 0.76 + lift * 0.14, -0.78]} radius={0.055} color="#161212" />
    <Cap a={[0.3, 0.76 + lift * 0.14, -0.78]} b={[0.46, 0.4, -0.9]} r={0.03} color="#161212" ink={0} />
  </>
);

// "Your neighbor is picking his nose": telephoto into the window, Jenkins sipping his coffee.
const PickA: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.4, 1.3, 9.0], [0, 1.28, -1.1], 15), cam([0.25, 1.28, 7.2], [0, 1.26, -1.1], 13), f / 60);
  return (
    <AbsoluteFill>
      {block(c, f, [jenkins([0, -1.1], { expression: "neutral", reachR: [70, -690], frontR: true, handR: "fist", lookX: 0.2 })], mugHand(ramp(f, 20, 40)), { blur: 3 })}
      <EagleHud f={f} zoom={0.8 + 0.2 * ramp(f, 0, 60)} range={`${(60 - 22 * ramp(f, 0, 60)).toFixed(0)} M`} cy={760} r={270} lock={ramp(f, 10, 50)} />
    </AbsoluteFill>
  );
};

// He glances round, the mug goes down on the sill and the finger goes up.
const PickB: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.25, 1.28, 7.2], [0, 1.26, -1.1], 13), cam([0.12, 1.24, 6.2], [0, 1.2, -1.1], 10.5), f / 58);
  const reach: [number, number] = [28 + Math.sin(f * 0.5) * 6, -722 + Math.sin(f * 0.5 + 1) * 6];
  return (
    <AbsoluteFill>
      {block(c, f, [jenkins([0, -1.1], { ...faceChange([[0, "skeptical"], [20, "neutral"]], f), reachR: reach, frontR: true, handR: "point", lookX: ramp(f, 0, 20) * 0.5 })], undefined, { blur: 3 })}
      <EagleHud f={f} zoom={0.95} range="38 M" cy={720} r={260} lock={1} />
    </AbsoluteFill>
  );
};

// "Did he just eat that?!": ECU, the finger to the mouth, a happy chew.
const EatIt: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.12, 1.2, 5.4], [0, 1.1, -1.1], 9), cam([0.05, 1.12, 4.6], [0, 1.0, -1.1], 8), f / 70);
  const mouth = ease(ramp(f, 14, 30));
  return (
    <AbsoluteFill>
      <Dutch deg={8}>
        {block(c, f, [jenkins([0, -1.1], { ...faceChange([[0, "neutral"], [24, "happy"]], f), reachR: [28 - mouth * 20, -722 + mouth * 40], frontR: true, handR: "point" })], undefined, { blur: 2 })}
      </Dutch>
      <Shout f={f} text={"TOO MUCH\nINFORMATION! 💀"} at={50} color="#1fb8a6" y={220} size={84} />
    </AbsoluteFill>
  );
};

// ---------- 540-626: "EWW!" ----------

const Eww: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.5, 1.0, 1.9], [0.3, 0.97, -0.2], 34), cam([0.42, 1.0, 1.4], [0.3, 0.97, -0.2], 34), f / 40);
  return (
    <AbsoluteFill>
      <Dutch deg={-10}>
        <Stage
          bg="#2a1f3a"
          camera={c}
          set={<BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false} hang={false} />}
          puppets={[alex([0.3, -0.2], { ...faceChange([[0, "shocked"], [8, "disgusted"]], f), gold: 1, armL: [150, -90], armR: [150, -90], headTilt: Math.sin(f * 0.6) * 4 })]}
          light={bedroomLight()}
          blur={5}
          energy={0.3}
        />
      </Dutch>
      <Shout f={f} text={"TOO MUCH\nINFORMATION! 💀"} at={5} out={72} color="#1fb8a6" y={220} size={84} />
    </AbsoluteFill>
  );
};

const WhySee: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.9, 0.3, 1.8], [0.3, 0.9, -0.2], 50), cam([0.7, 0.35, 1.5], [0.3, 0.95, -0.2], 50), f / 46);
  return (
    <AbsoluteFill>
      <Dutch deg={9}>
        <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false} hang={false} />} puppets={[alex([0.3, -0.2], { expression: "disgusted", gold: 1, headTilt: Math.sin(f * 0.7) * 8, lean: Math.sin(f * 0.5) * 4, armL: [150, -90], armR: [150, -90] })]} light={bedroomLight()} blur={4} energy={0.3} />
      </Dutch>
      <Shout f={f} text={"TOO MUCH\nINFORMATION! 💀"} at={-35} out={20} color="#1fb8a6" y={220} size={84} />
    </AbsoluteFill>
  );
};

// ---------- 626-830: Emma ----------

// "You quickly look away": out in the street, Alex strides along the sidewalk, head turned the other way.
const LookAway: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 44, [5.4, 0.15], [7.2, 0.15]);
  const c = move(cam([5.4, 0.9, 2.8], [6.4, 1.0, 0], 46), cam([6.4, 0.9, 2.6], [7.4, 1.0, 0], 46), f / 40);
  return street("morning", c, f, [alex(w.at, { expression: "worried", gold: 1, lookX: -0.9, ...w.pose })], undefined, { clear: [3.5, 12] });
};

// "OH! Your crush is waving at you!": far down the street Emma waves; hearts pop.
const EmmaFar: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([9.4, 0.5, 1.8], [5.6, 1.0, 0], 40), cam([9.0, 0.55, 1.6], [5.4, 1.05, 0], 38), f / 39);
  return street(
    "morning",
    c,
    f,
    [alex([8.4, 0.15], { view: "back", expression: "excited", gold: 1 }), emma([4.6, 0.25], { expression: "happy", armR: [168 + Math.sin(f * 0.5) * 8, -8], handR: "open" })],
    <Dog position={[5.55, 0, 0.0]} f={f} breed="buddy" pose={{ tongue: true, mouth: 0.5, wag: 1, lookX: -0.3 }} rotationY={0.35} />,
    { clear: [-1.5, 12] },
  );
};

// The HUD zooms in on her smile; hearts pop.
const EmmaZoom: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([6.6, 0.95, 1.9], [4.7, 0.98, 0.25], 30), cam([5.6, 0.98, 1.3], [4.7, 0.98, 0.25], 20), f / 38);
  return (
    <AbsoluteFill>
      {street(
        "morning",
        c,
        f,
        [emma([4.6, 0.25], { expression: "happy", armR: [168 + Math.sin(f * 0.5) * 10, -8], handR: "open" })],
        <>
          {Array.from({ length: 5 }, (_, k) => (
            <Badge key={k} position={[4.2 + (k % 3) * 0.28, 1.3 + k * 0.14, 0.9 - k * 0.04]} text="♥" size={0.12} appear={f - 6 - k * 5} color="#ff3d7f" />
          ))}
        </>,
        { clear: [-1.5, 12], blur: 3 },
      )}
      <EagleHud f={f} zoom={0.6 + 0.4 * ramp(f, 0, 38)} range="62 M" cy={780} r={270} lock={ramp(f, 12, 36)} />
      <Shout f={f} text={"SHE LIKES ME?! ❤️"} at={10} color="#ff3d7f" y={230} size={90} />
    </AbsoluteFill>
  );
};

// "You wave back!": hair fix, then a big wave, glowing.
const WaveBack: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([7.55, 1.0, 2.2], [7.9, 0.95, 0], 38), cam([7.6, 1.0, 1.8], [7.9, 0.95, 0], 36), f / 45);
  return street("morning", c, f, [alex([7.9, 0.1], { ...moveChange([[0, "smug", "scratchHead"], [24, "excited", "wave"]], f), gold: 1 })], undefined, { clear: [3.5, 12], blur: 5 });
};

// "Hey, Buddy!": Emma calls (she speaks), Buddy sits at her feet, Alex's shoulder in the foreground.
const HeyBuddy: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([8.2, 0.8, 3.4], [8.35, 0.8, 0], 44), cam([8.3, 0.85, 2.9], [8.35, 0.85, 0], 44), f / 40);
  return street(
    "morning",
    c,
    f,
    [alex([7.45, 0.6], { view: "back", expression: "excited", armR: [150, -15], handR: "open", gold: 1 }), emma([8.9, 0.1], { expression: "excited", lookX: -0.9, headTilt: -5, armR: [100 + Math.sin(f * 0.6) * 12, -12], handR: "open" })],
    <Dog position={[8.15, 0, 0.5]} f={f} breed="buddy" pose={{ lid: 0.1, tongue: true, mouth: 0.6, wag: 1, lookX: 0.7, nod: -0.25, earUp: 0.3 }} rotationY={0.95} />,
    { clear: [3.5, 12] },
  );
};

// "Wait a second": Alex's hand freezes in the air.
const Frozen: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([5.9, 1.0, 2.8], [6.3, 1.0, 0], 38), cam([6.0, 1.0, 2.0], [6.3, 1.0, 0], 34), f / 52);
  return street("morning", c, f, [alex([6.2, 0.1], { ...faceChange([[0, "excited"], [10, "awkward"]], f), armR: [135, -25], handR: "open", lookX: -0.7 })], undefined, { blur: 4, clear: [3.5, 12] });
};

// "She's waving at the dog behind you": Emma runs up to Buddy, who was sitting right behind Alex.
const DogBehind: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 4, 34, [4.0, 0.3], [7.8, 0.4]);
  const c = move(cam([7.6, 0.9, 3.5], [7.6, 0.85, 0], 46), cam([7.7, 0.9, 3.0], [7.8, 0.85, 0], 46), f / 62);
  return (
    <AbsoluteFill>
      {street(
        "morning",
        c,
        f,
        [alex([7.2, 0.45], { expression: "awkward", armR: [135, -25], handR: "open", lookX: 0.5, gold: 1 }), emma(w.at, { expression: "excited", ...w.pose, ...(f > 40 ? { crouch: 0.5, armL: [60, -50], armR: [60, -50] } : {}) })],
        <Dog position={[8.5, 0, -0.15]} f={f} breed="buddy" pose={{ lid: 0.05, tongue: true, mouth: 0.6, wag: 1, lookX: -0.5, earUp: 0.3 }} rotationY={0.3} />,
        { clear: [3.5, 12] },
      )}
      <Shout f={f} text={"SHE MEANT\nTHE DOG. 💀"} at={14} color="#e0453a" y={230} size={90} />
    </AbsoluteFill>
  );
};

// ---------- 945-1130: the comedown and the comeback ----------

// "Awesome": the hand lowers slowly, a fake smile freezing.
const Awesome1: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([6.0, 1.0, 2.4], [6.3, 1.0, 0], 36), cam([6.1, 0.98, 1.9], [6.3, 1.0, 0], 32), f / 55);
  const lower = ease(ramp(f, 14, 50));
  return street("morning", c, f, [alex([6.2, 0.1], { ...faceChange([[0, "awkward"], [30, "sad"]], f), armR: [135 - lower * 125, -25 + lower * 35], handR: "open", gold: 0.5, lookX: -0.4 })], undefined, { blur: 4, clear: [3.5, 12] });
};

// "Just awesome": a low Dutch angle on the slump; crickets.
const Awesome2: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([6.5, 0.3, 2.4], [6.2, 0.9, 0], 52), cam([6.4, 0.32, 2.1], [6.2, 0.85, 0], 52), f / 50);
  return (
    <Dutch deg={7}>
      {street("morning", c, f, [alex([6.2, 0.1], { expression: "sad", slump: 0.5, gold: 0, lookX: -0.3 })], undefined, { clear: [3.5, 12] })}
    </Dutch>
  );
};

// "But hey!": the gold flares back in his eyes.
const ButHey: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([6.3, 1.0, 2.0], [6.2, 1.0, 0], 36), cam([6.25, 1.0, 1.5], [6.2, 1.0, 0], 28), ease(ramp(f, 0, 14)));
  return street("morning", c, f, [alex([6.2, 0.1], { ...faceChange([[0, "sad"], [8, "excited"]], f), gold: ease(ramp(f, 6, 18)), armL: [140, -20], armR: [140, -20] })], undefined, { clear: [3.5, 12], blur: 4 });
};

// "At least you've got super eyes!": a low orbit, hands on hips.
const SuperEyes: React.FC = () => {
  const f = useShotFrame();
  const a = -0.5 + 0.9 * ease(ramp(f, 0, 42));
  const c = cam([6.2 + Math.sin(a) * 2.6, 0.35, Math.cos(a) * 2.6], [6.2, 1.1, 0.1], 50);
  return street("morning", c, f, [alex([6.2, 0.1], { ...faceChange([[0, "excited"], [14, "smug"]], f), gesture: "handsOnHips", gold: 1 })], undefined, { clear: [3.5, 12] });
};

// ---------- 1130-1330: the second bird, then the door ----------

const Spot2: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([5.0, 0.9, 3.4], [7.0, 9, -6], 60), cam([5.5, 1.0, 4], [8.0, 16, -8], 20), f / 46);
  return (
    <AbsoluteFill>
      {skyScene(c, f, [0, 0.4, -0.2], [9.5, 15.5, -8], [alex([5.4, 0.1], { view: "back", expression: "excited" })])}
      <EagleHud f={f} zoom={0.5 + 0.5 * ramp(f, 0, 46)} range="2.1 KM" cy={820} lock={ramp(f, 18, 44)} label="EAGLE VISION" />
    </AbsoluteFill>
  );
};

const Wow: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.2, 0.2, 3.4 - 0.4 * ease(ramp(f, 0, 56))], [-0.1, 0.1, 0], 46);
  return (
    <AbsoluteFill>
      {skyClose(c, f, <Eagle position={[0, 0.1, 0]} f={f + 90} scale={1.2} rotation={[0.1, -0.5 + f * 0.01, 0.2]} />, 0.4)}
      <EagleHud f={f} zoom={1} range="0.4 KM" cy={820} lock={1} />
      <ZoomLines f={f} strength={0.35} cy={820} />
      <Shout f={f} text={"SUPER VISION:\n100%"} at={23} color="#ffb000" y={190} size={90} />
    </AbsoluteFill>
  );
};

// He keeps walking with his head tipped back, tracked in profile.
const LookUpWalk: React.FC = () => {
  const f = useShotFrame();
  const x = 14.2 + f * 0.09;
  const c = cam([x - 0.8, 0.5, 2.6], [x + 0.5, 1.1, 0], 50);
  return (
    <Dutch deg={-5}>
      {street("morning", c, f, [alex([x, 0.1], { expression: "excited", gold: 1, view: "side", facing: 1, headTilt: -14, ...stroll(f, 0, 9999, [0, 0], [9999 * 0.09, 0]).pose })], undefined, { clear: [16.5, 24.5] })}
    </Dutch>
  );
};

// The café comes into view, the eagle overhead, Alex heading for the door.
const CafeApproach: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 50, [20.4, 1.3], [20.4, 0.5]);
  const c = move(cam([20.9, 0.5, 5.4], [21.0, 1.8, -2.3], 60), cam([20.9, 0.5, 4.6], [21.0, 1.8, -2.3], 58), f / 50);
  return (
    <Dutch deg={4}>
      {street("morning", c, f, [alex(w.at, { expression: "excited", gold: 1, view: "back", armL: [160, -10], armR: [160, -10], ...w.pose })], <Eagle position={[20.6 + f * 0.01, 3.4, 0.6]} f={f} scale={1.0} rotation={[0, -0.4, 0.3]} flap={0.5} />)}
    </Dutch>
  );
};

// Low, close behind him: DOOR growing ahead.
const DoorApproach: React.FC = () => {
  const f = useShotFrame();
  const w = stroll(f, 0, 44, [CAFE.doorX - 0.6, 0.2], [CAFE.doorX - 0.05, -2.03]);
  const c = move(cam([20.7, 0.25, 2.6], [CAFE.doorX, 1.35, -2.3], 64), cam([21.0, 0.3, 0.9], [CAFE.doorX, 1.3, -2.3], 52), f / 46);
  return street("morning", c, f, [alex(w.at, { expression: "excited", gold: 1, view: "back", armL: [160, -10], armR: [160, -10], headTilt: -8, ...w.pose })], <Eagle position={[22.2, 5.2, 0.5]} f={f} scale={0.9} rotation={[0, -0.8, 0.3]} flap={0.5} />, {});
};

// BONK: the profile on the glass, squashed, the pane cracks, stars.
const Bonk: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([23.2, 1.15, -0.2], [CAFE.doorX, 1.15, -2.2], 38), cam([23.0, 1.15, -0.4], [CAFE.doorX, 1.15, -2.2], 36), f / 50);
  const hit = ease(ramp(f, 0, 4));
  return (
    <AbsoluteFill>
      {street(
        "morning",
        c,
        f,
        [alex([CAFE.doorX, -2.17], { view: "side", facing: 1, expression: f < 3 ? "excited" : "awkward", gold: 1, squash: 0.22 * hit * (f < 14 ? 1 : Math.max(0, 1 - (f - 14) / 12)), lean: 16 * hit, lookX: 0.5 })],
        <DizzyStars position={[CAFE.doorX - 0.02, 1.75, -2.0]} f={f} radius={0.28} size={0.05} />,
        { smudge: 0.4 * ramp(f, 2, 8), hit: Math.exp(-f / 14), sheen: 0.08, crack: ramp(f, 1, 9) },
      )}
      <Shout f={f} text={"BONK!"} at={1} out={30} color="#ffb000" y={200} size={150} tilt={-6} />
    </AbsoluteFill>
  );
};

// Pull back: he peels off the glass and slides down it; the crack and DOOR show.
const BonkWide: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([21.0, 0.6, 3.6], [CAFE.doorX, 1.4, -2.3], 54), cam([21.2, 0.7, 5.2], [CAFE.doorX, 1.3, -2.3], 58), f / 48);
  const slide = ease(ramp(f, 6, 30));
  return street(
    "morning",
    c,
    f,
    [alex([CAFE.doorX, -2.17 + slide * 0.55], { expression: "awkward", gold: 1, view: "back", crouch: 0.8 * slide, lean: -8 * slide, armL: [40, 20], armR: [40, 20] })],
    <DizzyStars position={[CAFE.doorX, 1.1 - slide * 0.35, -1.8 + slide * 0.5]} f={f} radius={0.3} size={0.05} />,
    { smudge: 0.5, hit: Math.exp(-f / 18), crack: 1, sheen: 0.1 },
  );
};

// "Congratulations!": Buddy tilts his head at the dizzy Alex; a pigeon strolls past.
const Aftermath: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([23.0, 0.4, 1.9], [21.5, 0.6, -1.4], 64), cam([21.9, 0.75, 0.7], [21.2, 0.7, -1.5], 52), f / 58);
  const px = CAFE.doorX + 3.2 - f * 0.045;
  return street(
    "morning",
    c,
    f,
    [alex([CAFE.doorX - 0.4, -1.6], { expression: "awkward", gold: 0, headTilt: 12 + Math.sin(f * 0.3) * 4, lean: -6, lookX: Math.sin(f * 0.2) * 0.5, crouch: 0.35 })],
    <>
      <Dog position={[CAFE.doorX + 0.4, 0.03, -1.4]} f={f} breed="buddy" pose={{ tilt: 0.15 + 0.3 * ease(ramp(f, 8, 24)) + Math.sin(f * 0.25) * 0.05, lid: 0.1, wag: 0.3, lookX: -0.5 }} rotationY={-0.4} />
      <Pigeon position={[px, 0.03, -0.7]} f={f} walk={f} rotationY={Math.PI / 2 + 0.3} scale={1.1} />
      <DizzyStars position={[CAFE.doorX - 0.4, 1.12, -1.6]} f={f} radius={0.3} />
    </>,
    { smudge: 0.5, crack: 1, sheen: 0.1 },
  );
};

// ---------- 1530-1704: the punchline ----------

// "You've got eagle eyes": the golden eye, blinking, dizzy.
const EyeGold: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([0.3, 0.15, 4.2], [0, 0.1, 0], 38), cam([0.2, 0.1, 3.4], [0, 0.1, 0], 38), f / 42);
  const blink = f > 28 && f < 34 ? 0.1 : 1;
  return (
    <Dutch deg={6}>
      <Stage
        bg="#1b1233"
        camera={c}
        set={
          <Backdrop camera={c} color="#2a1a3a">
            <EagleEye position={[0, 0, 0]} f={f} open={blink} gold={1} pupil={0.1 + 0.1 * Math.sin(f * 0.4)} rotation={[0.1, -0.2, -0.1]} look={[Math.sin(f * 0.18), 0]} />
          </Backdrop>
        }
        energy={0.2}
      />
    </Dutch>
  );
};

// "...and a pigeon brain!": the pigeon, big, head cocked; the last headline.
const PigeonMacro: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([CAFE.doorX + 0.6, 0.4, -0.1], [CAFE.doorX + 1.6, 0.32, -1.4], 36), cam([CAFE.doorX + 0.75, 0.38, -0.3], [CAFE.doorX + 1.6, 0.36, -1.4], 33), f / 58);
  return (
    <AbsoluteFill>
      {street("morning", c, f, [], <Pigeon position={[CAFE.doorX + 1.6, 0.03, -1.4]} f={f} walk={f > 30 ? f : 0} rotationY={-0.9} scale={1.6} look={0.3 + Math.sin(f * 0.2) * 0.2} cock={0.2 + 0.2 * ramp(f, 20, 40)} />, { blur: 4, sheen: 0.1, crack: 1 })}
      <Shout f={f} text={"EAGLE EYES.\nPIGEON BRAIN. 🐦"} at={26} color="#2f6fd8" y={210} size={86} tilt={-2} />
    </AbsoluteFill>
  );
};

// The pigeon wanders off across the forecourt, a dazed Alex on the tiles; the camera cranes up.
const PigeonLeave: React.FC = () => {
  const f = useShotFrame();
  const c = move(cam([20.2, 3.6, 0.9], [CAFE.doorX + 0.3, 0.4, -1.6], 48), cam([20.0, 5.6, 1.4], [CAFE.doorX + 0.3, 0.4, -1.6], 52), f / 44);
  const px = CAFE.doorX + 0.9 + f * 0.05;
  return street(
    "morning",
    c,
    f,
    [alex([CAFE.doorX - 0.5, -1.0], { expression: "awkward", gold: 0, headTilt: 10, crouch: 0.3 })],
    <>
      <Pigeon position={[px, 0.03, -1.0 - f * 0.01]} f={f} walk={f} rotationY={Math.PI / 2} scale={1.9} />
      <DizzyStars position={[CAFE.doorX - 0.5, 1.1, -1.0]} f={f} radius={0.28} />
    </>,
    { smudge: 0.5, crack: 1, sheen: 0.1 },
  );
};

// ---------- the edit ----------

const SHOTS: Shot[] = [
  [0, 30, EyeOpen, false],
  [30, 60, AlexEyes, false],
  [60, 102, MirrorShot, false],
  [102, 138, FlyShot, false],
  [138, 175, SkyZoom, false],
  [175, 222, SkyTele, false],
  [222, 265, EagleLock, false],
  [265, 305, NoProblem, true],
  [305, 352, BlockWide, true],
  [352, 412, PickA, false],
  [412, 470, PickB, false],
  [470, 540, EatIt, false],
  [540, 580, Eww, true],
  [580, 626, WhySee, false],
  [626, 666, LookAway, true],
  [666, 705, EmmaFar, false],
  [705, 745, EmmaZoom, false],
  [745, 790, WaveBack, false],
  [790, 830, HeyBuddy, false],
  [830, 882, Frozen, false],
  [882, 945, DogBehind, false],
  [945, 1000, Awesome1, false],
  [1000, 1050, Awesome2, false],
  [1050, 1088, ButHey, false],
  [1088, 1130, SuperEyes, false],
  [1130, 1176, Spot2, false],
  [1176, 1232, Wow, false],
  [1232, 1278, LookUpWalk, false],
  [1278, 1328, CafeApproach, true],
  [1328, 1374, DoorApproach, false],
  [1374, 1424, Bonk, false],
  [1424, 1472, BonkWide, false],
  [1472, 1530, Aftermath, false],
  [1530, 1572, EyeGold, true],
  [1572, 1630, PigeonMacro, true],
  [1630, 1674, PigeonLeave, false],
  [1674, TIMING.totalFrames, LoopEye, true],
];

const SFX: Sfx[] = [
  // the eye opens, the title slams
  { at: 0, src: sfx("whoosh"), volume: 0.15 },
  { at: 22, src: sfx("chime"), volume: 0.16 },
  { at: 34, src: sfx("stamp"), volume: 0.1 },
  { at: 36, src: sfx("pop"), volume: 0.14 },
  { at: 54, src: sfx("whoosh"), volume: 0.2 },
  { at: 100, src: sfx("whoosh"), volume: 0.4 },
  { at: 112, src: sfx("tick"), volume: 0.22 },
  { at: 120, src: sfx("tick"), volume: 0.22 },
  { at: 128, src: sfx("tick"), volume: 0.28 },
  { at: 134, src: sfx("riser"), volume: 0.22 },
  { at: 138, src: sfx("whoosh"), volume: 0.45 },
  { at: 175, src: sfx("whoosh"), volume: 0.3 },
  { at: 175, src: sfx("wind"), volume: 0.16, until: 265 },
  { at: 205, src: sfx("tick"), volume: 0.25 },
  { at: 218, src: sfx("tick"), volume: 0.28 },
  { at: 222, src: sfx("whoosh"), volume: 0.3 },
  { at: 244, src: sfx("chime"), volume: 0.25 },
  // street and the block
  { at: 262, src: sfx("whoosh"), volume: 0.45 },
  { at: 268, src: sfx("sting"), volume: 0.18 },
  { at: 265, src: sfx("ambience"), volume: 0.12, until: 1530 },
  { at: 302, src: sfx("whoosh"), volume: 0.4 },
  { at: 336, src: sfx("riser"), volume: 0.1 },
  { at: 352, src: sfx("whoosh"), volume: 0.2 },
  { at: 358, src: sfx("tick"), volume: 0.25 },
  { at: 410, src: sfx("whoosh"), volume: 0.2 },
  { at: 436, src: sfx("slime"), volume: 0.2 },
  { at: 470, src: sfx("sting"), volume: 0.2 },
  { at: 492, src: sfx("slime"), volume: 0.22 },
  { at: 536, src: sfx("whoosh"), volume: 0.4 },
  { at: 552, src: sfx("pop"), volume: 0.1 },
  { at: 578, src: sfx("whoosh"), volume: 0.25 },
  { at: 608, src: sfx("whoosh"), volume: 0.22 },
  { at: 640, src: sfx("steps"), volume: 0.14, until: 666 },
  // Emma
  { at: 666, src: sfx("notif"), volume: 0.2 },
  { at: 704, src: sfx("pop"), volume: 0.14 },
  { at: 744, src: sfx("chime"), volume: 0.18 },
  { at: 712, src: sfx("notif"), volume: 0.08 },
  { at: 722, src: sfx("notif"), volume: 0.08 },
  { at: 732, src: sfx("notif"), volume: 0.08 },
  { at: 743, src: sfx("whoosh"), volume: 0.3 },
  { at: 760, src: sfx("pop"), volume: 0.18 },
  { at: 813, src: sfx("tape-stop"), volume: 0.3 },
  { at: 884, src: sfx("bark"), volume: 0.25 },
  { at: 896, src: sfx("pop"), volume: 0.3 },
  { at: 900, src: sfx("stamp"), volume: 0.2 },
  // the comedown
  { at: 1040, src: sfx("near-miss"), volume: 0.22 },
  { at: 1040, src: sfx("crickets"), volume: 0.14, until: 1050 },
  { at: 1040, src: sfx("sting"), volume: 0.14 },
  { at: 1090, src: sfx("chime"), volume: 0.2 },
  { at: 1086, src: sfx("whoosh"), volume: 0.3 },
  { at: 1128, src: sfx("whoosh"), volume: 0.35 },
  { at: 1140, src: sfx("riser"), volume: 0.2 },
  { at: 1160, src: sfx("tick"), volume: 0.28 },
  { at: 1176, src: sfx("whoosh"), volume: 0.3 },
  { at: 1199, src: sfx("pop"), volume: 0.3 },
  { at: 1200, src: sfx("sting"), volume: 0.22 },
  { at: 1232, src: sfx("steps"), volume: 0.26, until: 1278 },
  { at: 1269, src: sfx("whoosh"), volume: 0.3 },
  { at: 1330, src: sfx("riser"), volume: 0.12 },
  { at: 1374, src: sfx("boom"), volume: 0.32 },
  { at: 1374, src: sfx("clang"), volume: 0.28 },
  { at: 1375, src: sfx("stamp"), volume: 0.2 },
  { at: 1386, src: sfx("pop"), volume: 0.25 },
  { at: 1424, src: sfx("whoosh"), volume: 0.2 },
  { at: 1440, src: sfx("bark"), volume: 0.2 },
  { at: 1472, src: sfx("near-miss"), volume: 0.22 },
  { at: 1490, src: sfx("bark"), volume: 0.16 },
  { at: 1526, src: sfx("whoosh"), volume: 0.35 },
  { at: 1572, src: sfx("whoosh"), volume: 0.35 },
  { at: 1598, src: sfx("pop"), volume: 0.35 },
  { at: 1600, src: sfx("sting"), volume: 0.3 },
  { at: 1628, src: sfx("whoosh"), volume: 0.25 },
  // loop seam: the opening whoosh and chime again under the last frames
  { at: 1672, src: sfx("whoosh"), volume: 0.4 },
  { at: 1700, src: sfx("chime"), volume: 0.2 },
];

const MUSIC: MusicCue[] = [
  { src: MUSIC_FILES.upbeat, from: 0, to: 352, volume: 0.24 },
  { src: MUSIC_FILES.lounge, from: 352, to: 828, volume: 0.22 },
  { src: MUSIC_FILES.mystery, from: 882, to: 1050, volume: 0.18 },
  { src: MUSIC_FILES.upbeat, from: 1050, to: 1300, volume: 0.24 },
  { src: MUSIC_FILES.tension, from: 1300, to: 1374, volume: 0.2 },
  { src: MUSIC_FILES.lounge, from: 1424, to: 1530, volume: 0.2 },
  { src: MUSIC_FILES.upbeat, from: 1530, to: TIMING.totalFrames, volume: 0.24 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post />;
