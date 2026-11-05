import React from "react";
import * as THREE from "three";
import { AbsoluteFill } from "remotion";
import { CameraRig, CameraShot, PuppetLook, PuppetPlacement, Shot, ShotList, Stage, useShotFrame, Vec3 } from "../../engine";
import { Ball, Cap, Dog } from "../dog-nose/props";
import { BED, bedroomLight, BedroomSet, Cloud, Lights, StreetMode, StreetSet, streetLight } from "../dog-nose/sets";
import { Dutch, Shout } from "../dog-nose/Shout";
import { EagleHud, ZoomLines } from "./Hud";
import { DizzyStars, Eagle, EagleEye, Fly, Mirror, MirrorArch, Mug, Pigeon, Streaks } from "./props";
import { CAFE, CafeFront, cafeLight, NeighbourSet, neighbourLight } from "./sets";

// Design board for eagle-vision: every set and character from the angles the video will use, 10 frames each, for the
// scored design loop (videos/eagle-vision/design.md). Composition `EagleVisionDesign`; stills at frame 10k + 5.

export const ALEX: PuppetLook = { skin: "#f6d2b0", hair: "#6b4226", outfit: "#ffd23f", pants: "#2b4a8a", shoes: "#ffffff", iris: "#7a4a2a" };
export const JENKINS: PuppetLook = { skin: "#f0c4a0", hair: "#b8b8c0", outfit: "#3a5fc8", vest: "#5a82e8", glasses: true, pants: "#7a5a8a", shoes: "#8a4a3a" };
export const EMMA: PuppetLook = { skin: "#eab48c", hair: "#2a1a12", outfit: "#2fd0c8", long: true, pants: "#1e2124", shoes: "#ffffff", iris: "#5a3a22" };

const cam = (position: Vec3, target: Vec3, fov = 38): CameraShot => ({ position, target, fov });
const alex = (at: [number, number], pose: PuppetPlacement["pose"]): PuppetPlacement => ({ id: "alex", look: ALEX, at, pose });
const emma = (at: [number, number], pose: PuppetPlacement["pose"]): PuppetPlacement => ({ id: "emma", look: EMMA, at, pose });
const jenkins = (at: [number, number], pose: PuppetPlacement["pose"]): PuppetPlacement => ({ id: "jenkins", look: JENKINS, at, pose });

export const BED_AT: [number, number] = [BED.x + 0.1, BED.z + 1.18];
export const BED_AIR = (BED.top - 0.36) * 815;

// A plain dark backdrop with a studio light, for the macro eye.
export const Backdrop: React.FC<{ camera: CameraShot; color?: string; children?: React.ReactNode }> = ({ camera, color = "#1b1233", children }) => (
  <>
    <CameraRig {...camera} />
    <color attach="background" args={[color]} />
    <Lights camera={camera} sun={[-2, 4, 6]} sunColor="#ffffff" sunK={1.6} sky="#ffe9d0" ground="#6a5a7a" hemiK={1.0} ambient={0.5} box={4} />
    {children}
  </>
);

const street = (mode: StreetMode, c: CameraShot, f: number, puppets: PuppetPlacement[], extra?: React.ReactNode, opts: { clear?: [number, number]; blur?: number; bg?: boolean; sheen?: number; smudge?: number; hit?: number; crack?: number } = {}) => (
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
    energy={0}
  />
);

const Lineup: React.FC = () => {
  const f = useShotFrame();
  const c = cam([8.0, 0.35, 4.8], [8.0, 1.3, 0], 46);
  return street(
    "morning",
    c,
    f,
    [
      alex([7.0, 0.15], { expression: "excited", gold: 1, lookX: 0.4, armR: [160, -10], handR: "open" }),
      jenkins([7.6, 0.0], { expression: "neutral", gesture: "armsCrossed" }),
      emma([8.2, 0.1], { expression: "happy", armR: [165, -10], handR: "open" }),
    ],
    <Dog position={[8.8, 0, 0.45]} f={f} breed="buddy" pose={{ lid: 0.05, mouth: 0.6, tongue: true, wag: 1 }} rotationY={-0.25} />,
    { clear: [3.5, 12] },
  );
};
const EyeMacro: React.FC = () => {
  const f = useShotFrame() + 20;
  const c = cam([0, 0, 3.4], [0, 0, 0], 34);
  return <Stage bg="#1b1233" camera={c} set={<Backdrop camera={c}><EagleEye position={[0, 0, 0]} f={f} open={1} gold={1} pupil={0.05} ring={0.3} /></Backdrop>} energy={0} />;
};
const EyeBrown: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.3, 0.15, 4.4], [0, 0.1, 0], 38);
  return <Stage bg="#1b1233" camera={c} set={<Backdrop camera={c} color="#2a1a3a"><EagleEye position={[0, 0, 0]} f={f} open={0.6} gold={0.15} pupil={0.7} rotation={[0.1, -0.25, 0.14]} /></Backdrop>} energy={0} />;
};
const BedWide: React.FC = () => {
  const f = useShotFrame() + 60;
  const c = cam([0.9, 2.5, 3.6], [-0.75, 0.75, -1.0], 50);
  return (
    <Dutch deg={-6}>
      <Stage
        bg="#2a1f3a"
        camera={c}
        set={
          <BedroomSet camera={c} f={f} socks={false} paw={false} hang={false}>
            <Fly position={[1.85, 2.2, -2.53]} f={f} scale={3} wall={0.3} />
          </BedroomSet>
        }
        puppets={[alex(BED_AT, { sit: true, air: BED_AIR, expression: "shocked", lookX: -0.6, gold: 1 })]}
        light={bedroomLight()}
        energy={0}
      />
    </Dutch>
  );
};
const AlexEyes: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.45, 1.0, 1.6], [0.3, 0.97, -0.2], 30);
  return (
    <Dutch deg={-14}>
      <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false} />} puppets={[alex([0.3, -0.2], { expression: "excited", gold: 1, lookX: 0.5 })]} light={bedroomLight()} blur={5} energy={0} />
    </Dutch>
  );
};
// The reflection shows only inside the mirror glass: an arch on the plane x = -2.47 (flat base on the floor, half circle of radius 0.8 on
// top, centre at y = 1.4), tested along the view ray. The reflection card lies in the mirror surface (`fixedYaw` = the mirror normal, +x), 3 cm in front of the glass, so it foreshortens with the mirror like a real reflection; the ray test keeps the cut on the glass outline.
export const MIRROR_MASK = { center: [-2.47, 1.4, 1.5] as Vec3, u: [0, 0, 1 / 0.8] as Vec3, v: [0, 1 / 0.8, 0] as Vec3, archBottom: -(1.4 + 0.04) / 0.8 };
const Mirrored: React.FC = () => {
  const f = useShotFrame();
  const c = cam([1.0, 1.4, 3.7], [-1.9, 1.0, 1.65], 46);
  const hang = { armL: [8, 14] as [number, number], armR: [8, 14] as [number, number], expression: "shocked" as const };
  return (
    <Stage
      bg="#2a1f3a"
      camera={c}
      set={
        <BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false}>
          <MirrorArch position={[-2.47, 0, 1.5]} rotation={[0, Math.PI / 2, 0]} width={1.6} height={2.2} sheen={0.5} front={0.12} />
          {/* the gold of his eyes glows in the glass and spills onto the floor in front of it */}
          <Ball position={[-2.475, 1.08, 1.5]} radius={0.3} color={new THREE.Color("#ffc21a").multiplyScalar(1.2).getStyle()} glow opacity={0.28} scale={[0.04, 1, 1]} />
          <pointLight position={[-2.1, 1.1, 1.5]} intensity={0.9} distance={2.2} color="#ffc84a" />
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-2.0, 0.014, 1.5]}>
            <planeGeometry args={[0.9, 1.4]} />
            <meshBasicMaterial color="#ffd77a" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
          </mesh>
        </BedroomSet>
      }
      puppets={[
        alex([-1.3, 1.7], { view: "back", ...hang, lookX: 0.3 }),
        { id: "alex-ref", look: ALEX, at: [-2.46, 1.5], pose: { ...hang, gold: 1, lookX: -0.2, view: "front" }, mask: MIRROR_MASK, fixedYaw: Math.PI / 2 },
      ]}
      light={bedroomLight()}
      blur={3}
      energy={0}
    />
  );
};
const FlyMacro: React.FC = () => {
  const f = useShotFrame();
  const c = cam([1.55, 2.3, -0.3], [1.85, 2.2, -2.47], 22);
  return (
    <AbsoluteFill>
      <Stage bg="#2a1f3a" camera={c} set={<BedroomSet camera={c} f={f} socks={false} shaft={false} paw={false}><Fly position={[1.85, 2.2, -2.47]} f={f} scale={3.2} wall={0.3} /><mesh position={[1.85, 2.15, -2.485]} rotation={[0, 0, 0.06]}><planeGeometry args={[1.0, 1.2]} /><meshStandardMaterial color="#f6efe0" roughness={0.9} /></mesh></BedroomSet>} light={bedroomLight()} blur={3} energy={0} />
      <EagleHud f={f} zoom={0.9} range="3.4 M" cy={900} r={300} lock={1} />
    </AbsoluteFill>
  );
};
const SkyBird: React.FC = () => {
  const f = useShotFrame();
  const c = cam([5.5, 1.0, 4], [7.5, 15, -8], 24);
  return (
    <AbsoluteFill>
      {street("morning", c, f + 20, [], <><Eagle position={[7.5, 15, -8]} f={f} scale={3.4} rotation={[0, -0.7, 0.15]} glide={1} /><Cloud position={[2, 17, -30]} s={4} color="#ffffff" /><Cloud position={[16, 13, -24]} s={3} color="#ffffff" /><Cloud position={[9, 22, -36]} s={5} color="#f2f8ff" /></>, { clear: [3.5, 12] })}
      <EagleHud f={f} zoom={1} range="1.2 KM" cy={800} lock={0.5} />
    </AbsoluteFill>
  );
};
const SkyBirdWide: React.FC = () => {
  const f = useShotFrame();
  const c = cam([4.8, 0.8, 3.2], [6.5, 6, -6], 62);
  return (
    <AbsoluteFill>
      {street("morning", c, f, [alex([5.1, 0.1], { view: "back", expression: "excited" })], <Eagle position={[7.5, 7, -7]} f={f} scale={1.8} rotation={[0, -0.9, 0.35]} flap={0.5} />, { clear: [3.5, 12] })}
      <ZoomLines f={f} strength={0.6} cy={900} />
    </AbsoluteFill>
  );
};
const BlockWide: React.FC = () => {
  const f = useShotFrame();
  const c = cam([-0.8, 1.7, 9.8], [0, 1.3, 0], 34);
  return <Stage bg="#cfe8ff" camera={c} set={<NeighbourSet camera={c} f={f} />} puppets={[jenkins([0, -1.1], { expression: "neutral", reachR: [70, -760], handR: "point" })]} light={neighbourLight()} energy={0} />;
};
const Pick: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.15, 1.22, 6.0], [0, 1.2, -1.1], 11);
  return (
    <AbsoluteFill>
      <Stage bg="#cfe8ff" camera={c} set={<NeighbourSet camera={c} f={f} />} puppets={[jenkins([0, -1.1], { expression: "neutral", reachR: [28, -722], frontR: true, handR: "point", lookX: 0.3 })]} light={neighbourLight()} blur={3} energy={0} />
      <EagleHud f={f} zoom={0.95} range="38 M" cy={760} r={270} lock={1} />
    </AbsoluteFill>
  );
};
const Busted: React.FC = () => {
  const f = useShotFrame();
  const c = cam([0.1, 1.2, 4.2], [0, 1.16, -1.1], 20);
  return (
    <Stage
      bg="#cfe8ff"
      camera={c}
      set={
        <NeighbourSet camera={c} f={f}>
          <Mug position={[0.1, 0.74, -0.8]} scale={3.0} steam={1} f={f} />
          <Ball position={[0.3, 0.88, -0.78]} radius={0.055} color="#161212" />
          <Cap a={[0.3, 0.88, -0.78]} b={[0.46, 0.5, -0.9]} r={0.03} color="#161212" ink={0} />
        </NeighbourSet>
      }
      puppets={[jenkins([0, -1.1], { expression: "awkward", reachR: [70, -690], frontR: true, handR: "fist", lookX: -0.6 })]}
      light={neighbourLight()}
      energy={0}
    />
  );
};
const EmmaWave: React.FC = () => {
  const f = useShotFrame();
  const c = cam([9.4, 0.5, 1.8], [5.6, 1.0, 0], 40);
  return street("morning", c, f, [alex([8.4, 0.15], { view: "back", expression: "excited", gold: 1 }), emma([4.6, 0.25], { expression: "happy", armR: [168, -8], handR: "open" })], <Dog position={[5.55, 0, 0.0]} f={f} breed="buddy" pose={{ tongue: true, mouth: 0.5, wag: 1, lookX: -0.3 }} rotationY={0.35} />, { clear: [-1.5, 12] });
};
const TwoShot: React.FC = () => {
  const f = useShotFrame();
  const c = cam([8.2, 0.8, 3.4], [8.35, 0.8, 0], 44);
  return street(
    "morning",
    c,
    f,
    [alex([7.5, 0.6], { view: "back", expression: "awkward", armR: [135, -20], handR: "open", gold: 1 }), emma([8.9, 0.1], { expression: "excited", lookX: -0.9, headTilt: -5, armR: [100, -12], handR: "open" })],
    <Dog position={[8.15, 0, 0.5]} f={f} breed="buddy" pose={{ lid: 0.1, tongue: true, mouth: 0.6, wag: 1, lookX: 0.7, nod: -0.25, earUp: 0.3 }} rotationY={0.95} />,
    { clear: [3.5, 12] },
  );
};
const HandFrozen: React.FC = () => {
  const f = useShotFrame();
  const c = cam([5.9, 1.0, 2.8], [6.3, 1.0, 0], 38);
  return street("morning", c, f, [alex([6.2, 0.1], { expression: "awkward", armR: [135, -25], handR: "open", lookX: -0.7 })], undefined, { blur: 4, clear: [3.5, 12] });
};
const CafeWide: React.FC = () => {
  const f = useShotFrame();
  const c = cam([20.9, 0.5, 5.0], [21.0, 1.8, -2.3], 60);
  return (
    <Dutch deg={4}>
      {street("morning", c, f, [alex([20.3, 0.7], { view: "back", expression: "excited", gold: 1, armL: [160, -10], armR: [160, -10] })], <Eagle position={[20.6, 3.3, 0.6]} f={f} scale={1.0} rotation={[0, -0.4, 0.3]} flap={0.5} />)}
    </Dutch>
  );
};
const BonkSide: React.FC = () => {
  const f = useShotFrame();
  const c = cam([23.2, 1.15, -0.2], [CAFE.doorX, 1.15, -2.2], 38);
  return street("morning", c, f, [alex([CAFE.doorX, -2.17], { view: "side", facing: 1, expression: "awkward", gold: 1, squash: 0.22, lean: 16, lookX: 0.5 })], undefined, { smudge: 0.4, hit: 0.6, sheen: 0.08, crack: 1 });
};
const DoorLow: React.FC = () => {
  const f = useShotFrame();
  const c = cam([20.95, 0.25, 2.6], [CAFE.doorX + 0.05, 1.35, -2.3], 64);
  return street("morning", c, f, [alex([CAFE.doorX - 0.75, -0.3], { view: "back", expression: "excited", gold: 1, armL: [160, -10], armR: [160, -10] })], <Eagle position={[22.2, 5.2, 0.5]} f={f} scale={0.9} rotation={[0, -0.8, 0.3]} flap={0.5} />, {});
};
const TopForecourt: React.FC = () => {
  const f = useShotFrame();
  const c = cam([20.2, 5.2, 0.9], [CAFE.doorX + 0.3, 0.4, -1.6], 48);
  return street("morning", c, f, [alex([CAFE.doorX + 0.1, -0.5], { view: "back", expression: "excited", gold: 1, armL: [160, -10], armR: [160, -10] })], <Pigeon position={[CAFE.doorX + 0.9, 0.03, -1.0]} f={f} walk={f} rotationY={-0.6} scale={1.9} />);
};
const Aftermath: React.FC = () => {
  const f = useShotFrame();
  const c = cam([22.5, 0.45, 1.3], [21.2, 0.55, -1.2], 62);
  return street(
    "morning",
    c,
    f,
    [alex([CAFE.doorX - 0.4, -1.6], { expression: "awkward", gold: 0, headTilt: 12, lean: -6, lookX: 0.4 })],
    <>
      <Dog position={[CAFE.doorX + 0.4, 0.03, -1.4]} f={f} breed="buddy" pose={{ tilt: 0.35, lid: 0.1, wag: 0.3, lookX: -0.5 }} rotationY={-0.4} />
      <Pigeon position={[CAFE.doorX + 1.5, 0.03, -0.8]} f={f} walk={f} rotationY={-0.9} scale={1.0} />
      <DizzyStars position={[CAFE.doorX - 0.4, 1.12, -1.55]} f={f} radius={0.3} />
    </>,
    { smudge: 0.5 },
  );
};
const PigeonMacro: React.FC = () => {
  const f = useShotFrame();
  const c = cam([CAFE.doorX + 0.6, 0.4, -0.1], [CAFE.doorX + 1.6, 0.32, -1.4], 36);
  return street("morning", c, f, [], <Pigeon position={[CAFE.doorX + 1.6, 0.03, -1.4]} f={f} walk={f} rotationY={-0.9} scale={1.6} look={0.3} cock={0.2} />, { blur: 4 });
};
const BuddyClose: React.FC = () => {
  const f = useShotFrame();
  const c = cam([8.3, 0.5, 2.0], [8.0, 0.5, 0.5], 38);
  return street("morning", c, f, [], <Dog position={[8.0, 0, 0.5]} f={f} breed="buddy" pose={{ lid: 0.05, tongue: true, mouth: 0.7, wag: 1, earUp: 0.2 }} rotationY={0} />, { blur: 4, clear: [3.5, 12] });
};
const Eagles: React.FC = () => {
  const f = useShotFrame() + 30;
  const c = cam([0.2, 0.2, 3.4], [-0.1, 0.1, 0], 46);
  return (
    <AbsoluteFill>
      <Stage bg="#7fc8ff" camera={c} set={<Backdrop camera={c} color="#7fc8ff"><Eagle position={[0, 0.1, 0]} f={f} scale={1.2} rotation={[0.15, -0.75, 0.15]} /><Cloud position={[-2.4, -1.5, -9]} s={1.1} color="#e6f2ff" /><Cloud position={[3.4, -1.6, -11]} s={1.4} color="#dcecfb" /><Cloud position={[-0.5, -2.6, -14]} s={1.8} color="#e6f2ff" /><Streaks position={[0, 0, -4]} f={f} length={4} count={20} /></Backdrop>} energy={0} />
      <EagleHud f={f} zoom={0.8} range="0.8 KM" cy={820} lock={0.8} />
    </AbsoluteFill>
  );
};
const Headlines: React.FC = () => {
  const f = useShotFrame() + 20;
  const c = cam([18.2, 0.5, 4.6], [21.0, 1.9, -2.3], 58);
  return (
    <AbsoluteFill>
      {street("morning", c, f, [], undefined, { blur: 6 })}
      <Shout f={f} text={"EAGLE VISION\nUNLOCKED!"} at={0} y={140} color="#ffb000" size={96} />
      <Shout f={f} text={"TOO MUCH INFORMATION!"} at={0} y={600} color="#1fb8a6" size={78} tilt={3} />
      <Shout f={f} text={"SHE MEANT THE DOG."} at={0} y={960} color="#e0453a" size={86} />
      <Shout f={f} text={"EAGLE EYES. PIGEON BRAIN."} at={0} y={1300} color="#2f6fd8" size={72} tilt={-2} />
    </AbsoluteFill>
  );
};

export const DESIGN: [string, React.FC][] = [
  ["cast lineup, low angle", Lineup],
  ["eagle eye macro, gold", EyeMacro],
  ["eye opening, brown, dutch", EyeBrown],
  ["bedroom wide high angle", BedWide],
  ["alex eyes gold close-up, dutch", AlexEyes],
  ["alex in the floor mirror", Mirrored],
  ["fly on the corner, HUD", FlyMacro],
  ["sky bird, telephoto HUD", SkyBird],
  ["sky bird, worm's-eye, zoom lines", SkyBirdWide],
  ["the block opposite, wide", BlockWide],
  ["mr jenkins, telephoto", Pick],
  ["mr jenkins busted, mug", Busted],
  ["emma waves down the street", EmmaWave],
  ["emma and buddy, alex frozen", TwoShot],
  ["alex frozen hand", HandFrozen],
  ["cafe front, dutch, eagle", CafeWide],
  ["bonk, profile on the glass", BonkSide],
  ["door low angle approach", DoorLow],
  ["forecourt top-down, pigeon", TopForecourt],
  ["aftermath, buddy, pigeon", Aftermath],
  ["pigeon macro", PigeonMacro],
  ["buddy close-up", BuddyClose],
  ["eagle close, HUD lock", Eagles],
  ["headlines", Headlines],
];
const SHOTS: Shot[] = DESIGN.map(([, C], i) => [i * 10, i * 10 + 10, C, false]);
export const DESIGN_FRAMES = DESIGN.length * 10;
export const EagleVisionDesign: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
  </AbsoluteFill>
);
