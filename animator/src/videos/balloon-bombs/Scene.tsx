import React from "react";
import {
  CameraShot,
  Desk,
  faceChange,
  Headline,
  InkBox,
  Label,
  Lamp,
  lerp3,
  moodBackground,
  MusicCue,
  PuppetLight,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Room,
  Sfx,
  sfx,
  Shot,
  squash,
  Stage,
  stroll,
  Timing,
  useShotFrame,
  Vec3,
  Video,
} from "../../engine";
import {
  BeachLaunchSet,
  Blob,
  Chandelier,
  DANGLE,
  dawnLight,
  GroundedBalloon,
  HERO,
  InflatingEnvelope,
  PaperBalloon,
  PineForestSet,
  SkySet,
  SnowFieldSet,
} from "../../three/BalloonSets";
import {
  AltimeterDial,
  BlankNewspaper,
  CoastMap,
  DiatomView,
  FlyingPapers,
  HangingBalloons,
  Microscope,
  Monument,
  PaperSheet,
  PasteTable,
  PicnicBasket,
  PlaceSign,
  Remnant,
  RubberStamp,
  Sandbag,
  SandTray,
  StorySheet,
  Typewriter,
} from "./props";
import TIMING_JSON from "./timing.json";

// "The WWII Balloon Bombs That Reached America": paper balloons launched from Japanese beaches ride the jet stream to
// North America, dropping sandbags to stay up; the US hides them and studies their sand; in May 1945 one kills six
// picnickers in an Oregon forest. Sets: guide/references/balloon-bomb.md (src/three/BalloonSets.tsx).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "balloon-bombs";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};

// ---------- cast ----------

const SOLDIER_A: PuppetLook = { skin: "#e8c098", hair: "#1a1614", outfit: "#8a7a4e" };
const SOLDIER_B: PuppetLook = { skin: "#dcb088", hair: "#221a16", outfit: "#857650" };
const SOLDIER_C: PuppetLook = { skin: "#e4b890", hair: "#161212", outfit: "#8e7e52" };
const GIRL_A: PuppetLook = { skin: "#f2cfae", hair: "#141010", outfit: "#2a3a6a", long: true, kerchief: "#f4f2ec" };
const GIRL_B: PuppetLook = { skin: "#eac4a0", hair: "#1c1414", outfit: "#2e3e70", long: true, kerchief: "#f4f2ec" };
const EDITOR: PuppetLook = { skin: "#f0c8a4", hair: "#6a4a2e", outfit: "#f2f0ea", vest: "#3a4a3a", glasses: true };
const OFFICER: PuppetLook = { skin: "#e2b68c", hair: "#161212", outfit: "#5a5a3a", glasses: true };
const GEOLOGIST: PuppetLook = { skin: "#eec6a2", hair: "#4a3424", outfit: "#f4f6f8", glasses: true };
const ELSIE: PuppetLook = { skin: "#f2cfb0", hair: "#6a3e22", outfit: "#5a7ab8", long: true, skirt: true };
const KID_A: PuppetLook = { skin: "#f4d2b4", hair: "#a87040", outfit: "#e85a4a" };
const KID_B: PuppetLook = { skin: "#eec8a6", hair: "#3a2618", outfit: "#f0c040", long: true };
const KID_C: PuppetLook = { skin: "#f2ccaa", hair: "#5a3a22", outfit: "#4aa070" };

const forestLight = (): PuppetLight => ({ tint: "#fff4e0", shadow: 0.14, distant: [{ direction: [-0.5, 0.8, 0.4], color: "#fff0d0", strength: 1.1 }] });
const snowLight = (): PuppetLight => ({ tint: "#eef2ff" });

const BG_DAWN = "#3a4478";
const BG_SKY = "#2f66c4";
const BG_NIGHT = "#121c3e";
const BG_FOREST = "#7fb3ea";

// Several cuts in one place share one Stage (one WebGL context): headless Chrome refuses new contexts after about
// twenty in a render tab, so each part is a function of its own shot frame and the Stage persists across the cuts.
const multi = (parts: [number, (f: number) => React.ReactElement][]): React.FC => () => {
  const f = useShotFrame();
  let start = 0;
  for (let i = 0; i < parts.length - 1; i++) {
    if (f < start + parts[i][0]) return parts[i][1](f - start);
    start += parts[i][0];
  }
  return parts[parts.length - 1][1](f - start);
};

// ---------- 0-3 s: the hook ----------

// Above the clouds, the bomb under its ring swings at the lens as the camera rushes in. `offset` shifts the clock:
// the last shot is this one just before frame 0 so the Short loops.
const LOOP = 24;
const hookBombAt = (offset: number): React.FC => () => {
  const f = useShotFrame() + offset;
  const p = ramp(f, -LOOP, 22);
  const camera: CameraShot = { position: lerp3([1.9, -1.0, 3.4], [0.55, -0.75, 1.25], p), target: lerp3([0, -0.2, 0], [0, -0.5, 0], p), fov: 44 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 100} mode="day" speed={0.9}>
          <group rotation={[0.18 * Math.sin(f * 0.12), 0, 0.16 * Math.sin(f * 0.1 + 0.6)]}>
            <PaperBalloon frame={f} />
          </group>
        </SkySet>
      }
      camera={camera}
      bg={BG_SKY}
      energy={0}
    />
  );
};
const HookBomb = hookBombAt(0);
const LoopIn = hookBombAt(-LOOP);

// Hard cut: a dawn beach, the crew let go and the balloon shoots up past the low camera.
const HookLaunch: React.FC = () => {
  const f = useShotFrame();
  const ringY = 1.4 + f * 0.16 + f * f * 0.004;
  const camera: CameraShot = { position: [1.0 - f * 0.02, 0.35, 5.2], target: [0, 4.2 + f * 0.12, 0], fov: 54 };
  const cast: PuppetPlacement[] = [
    { id: "kenji", look: SOLDIER_A, pose: { expression: "excited", view: "back", armL: [150, -25], armR: [140, -30] }, at: [-1.0, 2.2] },
    { id: "taro", look: SOLDIER_B, pose: { expression: "shocked", view: "side", facing: -1, armR: [130, -20] }, at: [0.85, 2.0] },
  ];
  return <Stage set={<BeachLaunchSet camera={camera} frame={f + 40} balloon={ringY} />} camera={camera} bg={BG_DAWN} puppets={cast} light={dawnLight()} />;
};

// Hard cut: racing the jet stream over the cloud deck, the camera tracking alongside.
const HookJet: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [-9 + f * 0.12, 1.5 + f * 0.04, 15.5], target: [0, 5.2, 0], fov: 48 };
  return (
    <>
      <Stage
        set={
          <SkySet camera={camera} frame={f + 200} mode="day" speed={1.1}>
            <group rotation={[0, 0, -0.06]}>
              <PaperBalloon frame={f} />
            </group>
          </SkySet>
        }
        camera={camera}
        bg={BG_SKY}
      />
      <Headline f={f} text="NO PILOT." at={14} />
    </>
  );
};

// Hard cut: high in an Oregon pine, the ring smacks into a tree top: needles burst, the camera jolts.
const HIT = 10;
const HookTree: React.FC = () => {
  const f = useShotFrame();
  const top: Vec3 = [HERO.x, 19.6, HERO.z];
  const k = ramp(f, -6, HIT);
  const x = top[0] + 4.2 * (1 - k) * (1 - k) + 0.35;
  const bounce = f > HIT ? Math.sin((f - HIT) * 0.5) * Math.exp(-(f - HIT) * 0.12) * 0.3 : 0;
  const camera: CameraShot = { position: [top[0] + 2.6, top[1] + 0.2, top[2] + 4.6], target: [top[0] + 0.6, top[1] + 0.4, top[2]], fov: 46 };
  const sq = squash(f, HIT, 0.3);
  return (
    <>
      <Stage
        set={
          <PineForestSet camera={camera} frame={f + 300} balloon={false}>
            <group position={[x, top[1] + 0.9 + bounce, top[2] + 0.2]} rotation={[0, 0, f > HIT ? -0.25 * Math.exp(-(f - HIT) * 0.1) : 0.15]}>
              <PaperBalloon frame={f} />
            </group>
            <group position={[top[0], top[1] - 0.6, top[2]]} scale={sq}>
              <Blob position={[0.2, 0, 0.2]} scale={[1.2, 0.7, 1.0]} color="#2f4a2a" />
            </group>
            {f >= HIT && (
              <group userData={{ ghost: true }}>
                {Array.from({ length: 22 }, (_, i) => {
                  const t = f - HIT;
                  const a = (i / 22) * Math.PI * 2;
                  return (
                    <mesh key={i} position={[top[0] + 0.4 + Math.cos(a) * t * 0.05, top[1] + 0.2 + Math.sin(a * 1.7) * t * 0.04 - t * t * 0.002, top[2] + 0.4 + Math.sin(a) * t * 0.04]} rotation={[a, t * 0.3, a]}>
                      <boxGeometry args={[0.12, 0.015, 0.015]} />
                      <meshBasicMaterial color={i % 2 ? "#3a5a32" : "#6a8a3a"} />
                    </mesh>
                  );
                })}
              </group>
            )}
          </PineForestSet>
        }
        camera={camera}
        bg={BG_FOREST}
      />
      <Headline f={f} text="NO PILOT." at={-6} out={18} />
    </>
  );
};

// ---------- 3-7 s: paper and schoolgirls ----------

const hall = (camera: CameraShot, f: number, children?: React.ReactNode) => (
  <Room camera={camera} mood="warm" floor="#b08a5a" wall="#d8b888" wallPattern="panel" floorPattern="wood" width={10} depth={7} sun={{ x: -1.5, color: "#ffd8a0" }}>
    <HangingBalloons frame={f} rows={2} cols={5} />
    <PasteTable position={[0, 0, 0.4]} width={2.6} />
    {children}
  </Room>
);

// The hall: test balloons hanging in rows, a tally board counting them up.
const HallWide = (f: number) => {
  const p = ease(f, 0, 40);
  const camera: CameraShot = { position: lerp3([-0.9, 1.4, 5.6], [0.5, 1.5, 5.1], p), target: lerp3([-0.2, 1.5, -1], [0.4, 1.6, -1], p), fov: 52 };
  return (
    <Stage
      set={hall(
        camera,
        f,
        <>
          <InkBox size={[1.5, 0.75, 0.05]} position={[0.9, 1.45, -3.3]} color="#2a3a2e" />
          <Label text={"9,300\nBALLOONS"} position={[0.9, 1.45, -3.26]} width={1.3} fg="#f4f2ea" bg="#2a3a2e" border={false} appear={f - 6} count={ramp(f, 6, 30)} />
        </>,
      )}
      camera={camera}
      bg={moodBackground("warm")}
      puppets={[
        { id: "aiko", look: GIRL_A, pose: { expression: "determined", view: "side", facing: 1, armR: [10, -78] }, at: [-0.5, 1.0] },
        { id: "yumi", look: GIRL_B, pose: { expression: "neutral", view: "side", facing: -1, armL: [10, -78] }, at: [0.55, 1.0] },
      ]}
    />
  );
};

// The two girls brush paste over a sheet, the camera pushing across the table.
const Pasting = (f: number) => {
  const p = ease(f, 0, 44);
  const camera: CameraShot = { position: lerp3([1.0, 1.4, 3.6], [0.4, 1.3, 3.1], p), target: lerp3([0.05, 0.9, 0.6], [0.0, 0.9, 0.7], p), fov: 44 };
  const brush = Math.sin(f * 0.35);
  return (
    <Stage
      set={hall(camera, f, <PaperSheet position={[0, 0.66, 0.4]} size={[1.0, 0.6]} />)}
      camera={camera}
      bg={moodBackground("warm")}
      puppets={[
        { id: "aiko", look: GIRL_A, pose: { expression: "determined", reachR: [220 + brush * 40, -360], frontR: true, lookX: 0.4 }, at: [-0.4, 1.15] },
        { id: "yumi", look: GIRL_B, pose: { expression: "happy", reachL: [-220 - brush * 40, -360], frontL: true, lookX: -0.4 }, at: [0.45, 1.2] },
      ]}
    />
  );
};

// Gag: a gust lifts the sheet straight up over Yumi's face; Aiko laughs.
const SheetGag = (f: number) => {
  const lift = ease(f, 6, 20);
  const camera: CameraShot = { position: lerp3([0.6, 1.2, 3.5], [0.45, 1.15, 3.1], ease(f, 0, 41)), target: [0.1, 0.95, 1.0], fov: 42 };
  return (
    <Stage
      set={hall(camera, f, <group userData={{ ghost: true }}>
            <PaperSheet position={[0.42, 0.7, 1.75]} size={[0.6, 0.5]} lift={lift} frame={f} />
          </group>)}
      camera={camera}
      bg={moodBackground("warm")}
      puppets={[
        { id: "aiko", look: GIRL_A, pose: { ...faceChange([[0, "determined"], [16, "excited"]], f), lookX: 0.6 }, at: [-0.35, 1.25] },
        { id: "yumi", look: GIRL_B, pose: { ...faceChange([[0, "neutral"], [8, "shocked"]], f), armL: [60 + lift * 60, -40], armR: [60 + lift * 60, -40] }, at: [0.42, 1.25] },
      ]}
    />
  );
};

// ---------- 7-12 s: hydrogen and the jet stream ----------

// Back on the beach: hydrogen hissing in, the paper dome swelling, the crew straining on the ropes.
const Inflate: React.FC = () => {
  const f = useShotFrame();
  const fill = 0.35 + 0.65 * ease(f, 0, 46);
  const p = ease(f, 0, 49);
  const camera: CameraShot = { position: lerp3([5.0, 1.4, 10.5], [-3.0, 1.8, 11.0], p), target: [0, 2.2, 0], fov: 50 };
  const strain = Math.sin(f * 0.5) * 6;
  return (
    <Stage
      set={
        <BeachLaunchSet camera={camera} frame={f + 80} balloon={null}>
          <InflatingEnvelope frame={f} fill={fill} />
        </BeachLaunchSet>
      }
      camera={camera}
      bg={BG_DAWN}
      puppets={[
        { id: "kenji", look: SOLDIER_A, pose: { expression: "determined", view: "side", facing: -1, lean: -10 + strain, armR: [70, -20], armL: [80, -10] }, at: [2.75, 1.5] },
        { id: "taro", look: SOLDIER_B, pose: { expression: "worried", view: "side", facing: 1, lean: -10 - strain, armR: [70, -20], armL: [80, -10] }, at: [-2.8, 1.3] },
        { id: "hiro", look: SOLDIER_C, pose: { expression: "determined", view: "back", armL: [120, -20], armR: [120, -20] }, at: [0.4, 2.7] },
      ]}
      light={dawnLight()}
    />
  );
};

// The jet stream: wind streaks tearing past, the balloon racing, camera close alongside.
const Jet = (f: number) => {
  const p = ease(f, 0, 30);
  const camera: CameraShot = { position: lerp3([7.5, 2.6, 13.5], [4.5, 4.8, 14.5], p), target: [0, 5.4, 0], fov: 50 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 500} mode="day" speed={1.4}>
          <group rotation={[0, 0, -0.08 + Math.sin(f * 0.2) * 0.02]}>
            <PaperBalloon frame={f} />
          </group>
        </SkySet>
      }
      camera={camera}
      bg={BG_SKY}
    />
  );
};

// Macro on the control box: the altimeter needle swings up to 35,000 FT.
const Altimeter = (f: number) => {
  const camera: CameraShot = { position: lerp3([0.4, 0.05, 2.0], [0.18, 0.0, 1.7], ease(f, 0, 33)), target: [0, -0.08, 0.6], fov: 42 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 560} mode="day" speed={1.2}>
          <Chandelier frame={f} swing={0.3} />
          <group position={[0, 0.02, 0.62]} scale={0.42}>
            <AltimeterDial position={[0, 0, 0]} needle={-ease(f, 2, 22) * 4.4 + Math.sin(f * 0.6) * 0.04} label="35,000 FT" appear={f - 8} />
          </group>
        </SkySet>
      }
      camera={camera}
      bg={BG_SKY}
    />
  );
};

// Night over the Pacific: the balloon small under the moon, the camera craning up and away.
const Night = (f: number) => {
  const p = ease(f, 0, 51);
  const camera: CameraShot = { position: lerp3([-12, -1, 20], [-6, 6, 23], p), target: lerp3([0, 5, 0], [2, 7, -4], p), fov: 50 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 700} mode="night" speed={0.7}>
          <PaperBalloon frame={f} />
        </SkySet>
      }
      camera={camera}
      bg={BG_NIGHT}
    />
  );
};

// ---------- 12-15 s: sinking, the sandbag ----------

// It sinks toward the clouds; the camera follows it down.
const Sink = (f: number) => {
  const y = -ease(f, 0, 36) * 2.6;
  const camera: CameraShot = { position: [3.5 + f * 0.04, y + 1.0, 8.5], target: [0, y + 3.2, 0], fov: 52 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 760} mode="night" speed={0.7}>
          <group position={[0, y, 0]} rotation={[0, 0, Math.sin(f * 0.1) * 0.04]}>
            <PaperBalloon frame={f} />
          </group>
          <group position={[0, y + 0.02, 0.2]} scale={0.3}>
            <AltimeterDial position={[0, 0, 0]} needle={-4.4 + ease(f, 0, 30) * 1.2} label="ALTIMETER" appear={f - 4} />
          </group>
        </SkySet>
      }
      camera={camera}
      bg={BG_NIGHT}
    />
  );
};

// Click: a sandbag drops away below and the balloon jumps up.
const DROP = 3;
const Drop = (f: number) => {
  const up = ease(f, DROP + 2, DROP + 24) * 1.4;
  const a = (23 / 24) * Math.PI * 2;
  const t = Math.max(0, f - DROP);
  const camera: CameraShot = { position: [1.2, 0.6 + up * 0.8, 1.7], target: [0, -0.35 + up * 0.7, 0], fov: 46 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 800} mode="night" speed={0.7}>
          <group position={[0, up, 0]}>
            <Chandelier frame={f} bags={f >= DROP ? 23 : 24} swing={1.4} />
          </group>
          {f >= DROP && (
            <group position={[Math.cos(a) * 0.42, -0.15 - t * t * 0.012, Math.sin(a) * 0.42]} rotation={[t * 0.15, t * 0.1, 0]}>
              <Blob position={[0, 0, 0]} scale={[0.042, 0.062, 0.042]} color="#c8b08a" ink={0.16} />
            </group>
          )}
        </SkySet>
      }
      camera={camera}
      bg={BG_NIGHT}
    />
  );
};

// ---------- 15-19 s: arrival ----------

// Dawn over America: gaps in the deck show the forested coast; the balloon slides down toward it.
const Coast: React.FC = () => {
  const f = useShotFrame();
  const y = -ease(f, 0, 45) * 1.5;
  const camera: CameraShot = { position: lerp3([-6, 9, 19], [-3, 7, 18], ease(f, 0, 45)), target: [1, -2, -12], fov: 54 };
  return (
    <Stage
      set={
        <SkySet camera={camera} frame={f + 900} mode="coast" speed={0.45}>
          <group position={[0, y, 0]}>
            <PaperBalloon frame={f} />
          </group>
        </SkySet>
      }
      camera={camera}
      bg="#5a86c8"
    />
  );
};

const snowShot = (variant: "alaska" | "montana" | "michigan", text: string, cam: [Vec3, Vec3, Vec3], heading: number) => (f: number) => {
  const p = ease(f, 0, 28);
  const camera: CameraShot = { position: lerp3(cam[0], cam[1], p), target: cam[2], fov: 46 };
  return (
    <Stage
      set={
        <SnowFieldSet camera={camera} frame={f} variant={variant}>
          <group position={[0.4, 0, -1.4]}>
            <GroundedBalloon frame={f} heading={heading} snow={variant !== "michigan"} />
          </group>
          <PlaceSign position={[-0.9, 0, 1.4]} text={text} rotationY={0.25} appear={f - 2} />
        </SnowFieldSet>
      }
      camera={camera}
      bg="#c8d4e4"
      light={snowLight()}
    />
  );
};
const Alaska = snowShot("alaska", "ALASKA", [[-2.6, 1.3, 4.0], [-1.6, 1.5, 3.6], [-0.2, 0.9, -0.6]], 0.3);
const Montana = snowShot("montana", "MONTANA", [[1.6, 1.0, 4.2], [0.4, 1.3, 4.0], [-0.4, 0.9, -0.6]], -0.4);
const Michigan = snowShot("michigan", "MICHIGAN", [[-1.4, 2.2, 4.4], [-0.6, 1.6, 3.8], [-0.2, 0.8, -0.8]], 0.8);

// ---------- 19-23 s: the silence ----------

const newsroom = (camera: CameraShot, f: number, children?: React.ReactNode) => (
  <Room camera={camera} mood="office" floor="#7a5a3e" wall="#7a9a7e" wallPattern="panel" floorPattern="wood" width={8} depth={6} stripe="#4a5a44">
    <Desk position={[0, 0, 0]} size={[1.5, 0.6, 0.75]} color="#8a6440" />
    <Typewriter position={[-0.38, 0.63, 0.05]} clack={(f % 12) / 12} />
    <StorySheet position={[0.3, 0.635, 0.08]} rotationY={-0.1} />
    <Lamp position={[0.62, 1.4, -0.2]} />
    <Desk position={[-2.3, 0, -1.6]} size={[1.4, 0.6, 0.7]} color="#80603e" />
    <Typewriter position={[-2.3, 0.63, -1.6]} />
    <Desk position={[2.3, 0, -1.6]} size={[1.4, 0.6, 0.7]} color="#80603e" />
    <InkBox size={[0.5, 0.5, 0.04]} position={[0, 2.2, -2.94]} color="#f4f2ea" />
    {children}
  </Room>
);

// The editor reads the balloon story, frowning.
const Newsroom = (f: number) => {
  const p = ease(f, 0, 33);
  const camera: CameraShot = { position: lerp3([1.3, 1.3, 3.2], [0.6, 1.2, 2.5], p), target: [0.1, 0.95, -0.3], fov: 42 };
  return (
    <Stage
      set={newsroom(camera, f)}
      camera={camera}
      bg={moodBackground("office")}
      puppets={[{ id: "editor", look: EDITOR, pose: { ...faceChange([[0, "skeptical"], [14, "angry"]], f), reachR: [200, -420], frontR: true, lookX: 0.3 }, at: [0.15, -0.6] }]}
    />
  );
};

// Macro: the stamp slams DO NOT PRINT on the story; copy paper flies.
const SLAM = 8;
const Stamp = (f: number) => {
  const camera: CameraShot = { position: [0.55, 1.15, 0.75], target: [0.3, 0.64, 0.05], fov: 42 };
  const drop = f < SLAM ? ease(f, 0, SLAM) : 1 - ease(f, SLAM + 6, SLAM + 14) * 0.8;
  return (
    <Stage
      set={newsroom(
        camera,
        f,
        <>
          <RubberStamp position={[0.3, 0.64, 0.08]} drop={drop} stamped={f >= SLAM ? f - SLAM : 0} />
          <FlyingPapers origin={[0.3, 0.68, 0.1]} t={f - SLAM} />
        </>,
      )}
      camera={camera}
      bg={moodBackground("office")}
    />
  );
};

// Tokyo: an officer stares at an empty newspaper, baffled.
const Guessing: React.FC = () => {
  const f = useShotFrame();
  const p = ease(f, 0, 62);
  const camera: CameraShot = { position: lerp3([-1.4, 1.2, 3.0], [-0.5, 1.15, 2.4], p), target: [0.0, 1.0, 0.2], fov: 42 };
  return (
    <Stage
      set={
        <Room camera={camera} mood="dusk" floor="#6a4632" wall="#8a3a32" wallPattern="panel" floorPattern="wood" width={8} depth={6}>
          <Desk position={[0, 0, -0.2]} size={[1.4, 0.6, 0.7]} color="#5a3a26" />
          <InkBox size={[0.3, 0.22, 0.2]} position={[-0.45, 0.73, -0.3]} color="#3a3026" />
          <Lamp position={[0.5, 1.5, -0.4]} />
          <BlankNewspaper position={[0.0, 0.72, 0.6]} rotation={[-0.45, 0.1, 0.05]} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("dusk")}
      puppets={[{ id: "officer", look: OFFICER, pose: { ...faceChange([[0, "thinking"], [18, "confused"]], f), reachL: [-230, -330], reachR: [230, -330], frontL: true, frontR: true }, at: [0.0, 0.25] }]}
    />
  );
};

// ---------- 23-26 s: the sand ----------

const lab = (camera: CameraShot, f: number, children?: React.ReactNode, mapAppear?: number) => (
  <Room camera={camera} mood="cold" floor="#c8d0d8" wall="#a8c0d0" wallPattern="tile" floorPattern="tile" width={8} depth={6}>
    <Desk position={[0, 0, -0.3]} size={[1.8, 0.6, 0.7]} color="#d8dce0" />
    <Microscope position={[-0.2, 0.63, -0.35]} rotationY={0.3} />
    <SandTray position={[0.35, 0.63, -0.2]} />
    <Sandbag position={[0.72, 0.63, -0.4]} rotation={[0, 0, -0.5]} />
    <Label text="BALLAST SAND" position={[0.4, 0.82, 0.06]} width={0.42} appear={f - 6} />
    <CoastMap position={[-1.6, 1.6, -2.9]} appear={mapAppear} />
    {children}
  </Room>
);

// The geologist bends over the microscope beside a tray of ballast sand.
const Lab = (f: number) => {
  const p = ease(f, 0, 43);
  const camera: CameraShot = { position: lerp3([1.6, 1.3, 2.8], [1.0, 1.1, 2.2], p), target: [0.0, 0.85, -0.3], fov: 42 };
  return (
    <Stage
      set={lab(camera, f)}
      camera={camera}
      bg={moodBackground("cold")}
      puppets={[{ id: "geologist", look: GEOLOGIST, pose: { ...faceChange([[0, "thinking"], [22, "excited"]], f), lean: 12 * ease(f, 0, 16), reachR: [160, -380], frontR: true }, at: [-0.3, -0.85] }]}
    />
  );
};

// Through the eyepiece: diatoms and shell bits.
// Through the eyepiece: diatoms and shell bits (a disc held in front of the camera, black all round it).
const Diatoms = (f: number) => {
  const camera: CameraShot = { position: [0, 1.6, 3.4 - f * 0.012], target: [0, 1.6, 2.2], fov: 50 };
  return (
    <Stage
      set={lab(
        camera,
        f,
        <group position={[0, 1.6, 2.2]}>
          <mesh position={[0, 0, -0.05]}>
            <planeGeometry args={[4, 4]} />
            <meshBasicMaterial color="#0a0e14" />
          </mesh>
          <DiatomView position={[0, 0, 0]} frame={f} size={1.5} />
        </group>,
      )}
      camera={camera}
      bg={moodBackground("cold")}
    />
  );
};

// The map on the wall: three pins on Japan's coast. LAUNCH BEACHES?
const MapShot = (f: number) => {
  const camera: CameraShot = { position: lerp3([-1.0, 1.85, -0.6], [-1.4, 1.8, -0.9], ease(f, 0, 24)), target: [-1.6, 1.8, -2.9], fov: 46 };
  return <Stage set={lab(camera, f, null, f - 2)} camera={camera} bg={moodBackground("cold")} />;
};

// ---------- 26-31 s: the picnic ----------

const PICNIC: { look: PuppetLook; id: string; dx: number; dz: number }[] = [
  { id: "elsie", look: ELSIE, dx: 0, dz: 0 },
  { id: "kid-a", look: KID_A, dx: 0.7, dz: 0.5 },
  { id: "kid-b", look: KID_B, dx: -0.7, dz: 0.6 },
  { id: "kid-c", look: KID_C, dx: 0.3, dz: 1.2 },
];

// Sunlit pines; Elsie and the children walk in with a basket, happy.
const PicnicWalk = (f: number) => {
  const p = ease(f, 0, 54);
  const camera: CameraShot = { position: lerp3([4.2, 1.6, 10.5], [2.8, 1.7, 9.8], p), target: [2.0, 1.1, 2.6], fov: 46 };
  const cast: PuppetPlacement[] = PICNIC.map((c, i) => {
    const w = stroll(f, -10 + i * 3, 80, [3.6 + c.dx, 3.0 + c.dz], [1.4 + c.dx, 2.6 + c.dz]);
    return { id: c.id, look: c.look, pose: { expression: i === 0 ? "happy" : "excited", ...w.pose } as PuppetPose, at: w.at };
  });
  return <Stage set={<PineForestSet camera={camera} frame={f + 400} />} camera={camera} bg={BG_FOREST} puppets={cast} light={forestLight()} />;
};

// Low angle: a boy points up at the paper hanging in the pine.
const Spot = (f: number) => {
  const p = ease(f, 0, 44);
  const camera: CameraShot = { position: lerp3([3.4, 1.15, 6.0], [3.0, 1.2, 5.4], p), target: [1.7, 1.3, 1.6], fov: 52 };
  return (
    <Stage
      set={<PineForestSet camera={camera} frame={f + 460} />}
      camera={camera}
      bg={BG_FOREST}
      puppets={[
        { id: "kid-a", look: KID_A, pose: { expression: "excited", gesture: "point", lookX: -0.5, headTilt: -10 }, at: [1.9, 2.4] },
        { id: "elsie", look: ELSIE, pose: { ...faceChange([[0, "happy"], [18, "confused"]], f), lookX: -0.4 }, at: [2.7, 2.9] },
      ]}
      light={forestLight()}
    />
  );
};

// From behind, they walk up to the dangling ring; the camera creeps in; white flash.
const FLASH = 32;
const Approach = (f: number) => {
  const p = ease(f, 0, FLASH);
  const camera: CameraShot = { position: lerp3([1.7, 1.6, 6.8], [1.35, 1.5, 5.6], p), target: [0.8, 1.05, 1.6], fov: 46 };
  const cast: PuppetPlacement[] = PICNIC.slice(0, 3).map((c, i) => {
    const w = stroll(f, -20 + i * 4, 70, [1.0 + c.dx * 0.8, 3.6 + c.dz], [0.8 + c.dx * 0.8, 1.6 + c.dz]);
    return { id: c.id, look: c.look, pose: { expression: "neutral", ...w.pose, view: "back" } as PuppetPose, at: w.at };
  });
  const flash = f >= FLASH ? Math.min(1, (f - FLASH) / 3) : 0;
  return <Stage set={<PineForestSet camera={camera} frame={f + 520} />} camera={camera} bg={BG_FOREST} puppets={cast} light={forestLight()} flash={flash} />;
};

// ---------- 31-36 s: aftermath and ending ----------

// Silence: smoke curling up in the empty clearing, the basket on its side. Cold, quiet.
const Aftermath = (f: number) => {
  const p = ease(f, 0, 50);
  const camera: CameraShot = { position: lerp3([2.8, 1.0, 6.5], [1.9, 2.4, 7.4], p), target: lerp3([0.6, 0.9, 0], [0.4, 1.8, -0.5], p), fov: 44 };
  return (
    <Stage
      set={
        <PineForestSet camera={camera} frame={f + 600} balloon={false} scorch={1}>
          <PicnicBasket position={[2.0, 0, 1.6]} rotationY={0.6} />
        </PineForestSet>
      }
      camera={camera}
      bg={BG_FOREST}
      truth={0.45 + 0.1 * (1 - ramp(f, 0, 10))}
      flash={1 - ramp(f, 0, 10)}
    />
  );
};

// The stone monument with its bronze plaque among the pines, the camera pushing in.
const Memorial = (f: number) => {
  const p = ease(f, 0, 47);
  const camera: CameraShot = { position: lerp3([2.4, 1.6, 4.6], [1.2, 1.0, 2.6], p), target: [0.6, 0.85, 0.1], fov: 42 };
  return (
    <Stage
      set={
        <PineForestSet camera={camera} frame={f + 700} balloon={false}>
          <Monument position={[0.6, 0, 0.1]} />
        </PineForestSet>
      }
      camera={camera}
      bg={BG_FOREST}
      truth={0.15}
    />
  );
};

// Deep in the trees, low over the needles: rotted paper and a rusted ring nobody ever found.
const NeverFound = (f: number) => {
  const p = ease(f, 0, 57);
  const camera: CameraShot = { position: lerp3([4.6, 1.1, 5.5], [2.7, 0.9, 0.2], p), target: lerp3([2.2, 0.3, -1.2], [2.0, 0.1, -1.6], p), fov: 44 };
  return (
    <Stage
      set={
        <PineForestSet camera={camera} frame={f + 800} balloon={false}>
          <group position={[2.0, 0.02, -1.6]} scale={1.15}>
            <Remnant position={[0, 0, 0]} frame={f} />
          </group>
        </PineForestSet>
      }
      camera={camera}
      bg={BG_FOREST}
      truth={0.25}
    />
  );
};

const HallShot = multi([[40, HallWide], [44, Pasting], [41, SheetGag]]);
const JetShot = multi([[30, Jet], [33, Altimeter]]);
const NightShot = multi([[51, Night], [36, Sink], [43, Drop]]);
const SnowShot = multi([[25, Alaska], [25, Montana], [29, Michigan]]);
const LabShot = multi([[43, Lab], [23, Diatoms], [24, MapShot]]);
const NewsShot = multi([[33, Newsroom], [18, Stamp]]);
const PicnicShot = multi([[54, PicnicWalk], [44, Spot], [50, Approach]]);
const EndShot = multi([[50, Aftermath], [47, Memorial], [57, NeverFound]]);

// Cuts inside a multi shot: 128, 172 (hall); 525, 550 (montana, michigan); 735, 758 (eyepiece, map); 292 (altimeter); 376, 412 (sink, drop); 612 (stamp); 836, 880
// (spot, approach); 980, 1027 (monument, never found).
const SHOTS: Shot[] = [
  [0, 20, HookBomb, false],
  [20, 40, HookLaunch, false],
  [40, 60, HookJet, false],
  [60, 88, HookTree, false],
  [88, 213, HallShot, true],
  [213, 262, Inflate, true],
  [262, 325, JetShot, true],
  [325, 455, NightShot, true],
  [455, 500, Coast, true],
  [500, 579, SnowShot, true],
  [579, 630, NewsShot, true],
  [630, 692, Guessing, true],
  [692, 782, LabShot, true],
  [782, 930, PicnicShot, true],
  [930, 1084, EndShot, false], // 1084 = totalFrames - LOOP
  [1084, TIMING.totalFrames, LoopIn, true],
];

const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.4, until: 60 },
  { at: 0, src: sfx("whoosh"), volume: 0.5 },
  { at: 20, src: sfx("whoosh"), volume: 0.45 },
  { at: 40, src: sfx("whoosh"), volume: 0.4 },
  { at: 54, src: sfx("pop"), volume: 0.3 },
  { at: 60 + HIT, src: sfx("boom"), volume: 0.45 },
  { at: 60 + HIT, src: sfx("stamp"), volume: 0.35 },
  { at: 84, src: sfx("whoosh"), volume: 0.35 },
  { at: 94, src: sfx("pop"), volume: 0.3 },
  { at: 128, src: sfx("paper"), volume: 0.35 },
  { at: 178, src: sfx("whoosh"), volume: 0.35 },
  { at: 180, src: sfx("paper"), volume: 0.55 },
  { at: 213, src: sfx("hiss"), volume: 0.55 },
  { at: 213, src: sfx("wind"), volume: 0.25, until: 262 },
  { at: 258, src: sfx("whoosh"), volume: 0.4 },
  { at: 262, src: sfx("wind"), volume: 0.45, until: 376 },
  { at: 296, src: sfx("tick"), volume: 0.4 },
  { at: 300, src: sfx("pop"), volume: 0.3 },
  { at: 321, src: sfx("whoosh"), volume: 0.35 },
  { at: 380, src: sfx("pop"), volume: 0.25 },
  { at: 376, src: sfx("wind"), volume: 0.3, until: 455 },
  { at: 412 + DROP, src: sfx("button"), volume: 0.5 },
  { at: 412 + DROP + 1, src: sfx("whoosh"), volume: 0.4 },
  { at: 451, src: sfx("whoosh"), volume: 0.35 },
  { at: 455, src: sfx("wind"), volume: 0.3, until: 579 },
  { at: 502, src: sfx("pop"), volume: 0.35 },
  { at: 527, src: sfx("pop"), volume: 0.35 },
  { at: 552, src: sfx("pop"), volume: 0.35 },
  { at: 579, src: sfx("tick"), volume: 0.3 },
  { at: 612 + SLAM, src: sfx("stamp"), volume: 0.7 },
  { at: 612 + SLAM, src: sfx("paper"), volume: 0.5 },
  { at: 688, src: sfx("whoosh"), volume: 0.35 },
  { at: 698, src: sfx("pop"), volume: 0.3 },
  { at: 735, src: sfx("chime"), volume: 0.3 },
  { at: 760, src: sfx("pop"), volume: 0.35 },
  { at: 778, src: sfx("whoosh"), volume: 0.35 },
  { at: 782, src: sfx("ambience"), volume: 0.25, until: 910 },
  { at: 866, src: sfx("riser"), volume: 0.4 },
  { at: 880 + FLASH, src: sfx("sting"), volume: 0.6 },
  { at: 930, src: sfx("wind"), volume: 0.2, until: 1084 },
  { at: 1080, src: sfx("whoosh"), volume: 0.4 },
  { at: 1084, src: sfx("wind"), volume: 0.4, until: TIMING.totalFrames },
];

// Bright and driving through the launch and the crossing, pulsing for the cover-up and the sand, cut dead at the
// flash, a dark bed for the ending.
const MUSIC: MusicCue[] = [
  { src: "music/upbeat.wav", from: 0, to: 376, volume: 0.32 },
  { src: "music/tension.wav", from: 376, to: 912, volume: 0.3 },
  { src: "music/mystery.wav", from: 940, to: TIMING.totalFrames, volume: 0.32 },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} />;
