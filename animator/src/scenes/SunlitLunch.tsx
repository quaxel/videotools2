import React from "react";
import { AbsoluteFill } from "remotion";
import * as THREE from "three";
import {
  CameraShot, canvasTexture, GodRays, Halo, handWorld, InkBox, InkCylinder, lerp3, moodBackground, MUSIC_FILES, MusicCue, PuppetLook,
  PuppetPlacement, ramp, Room, Sfx, Shot, ShotList, SoundTrack, Stage, toonRamp, useShotFrame, foleyCues, jawCloses,
} from "../engine";
import { smooth } from "../engine/motion";

// A room by day, sunbeams falling through the window, a table and chair in the middle and a man at the table eating.
// SunlitLunch is one frame (POST=1 STILL_SCALE=1 node scripts/stills.mjs SunlitLunch <out-dir> 0), SunlitLunchEat
// five seconds of him eating (npx remotion render SunlitLunchEat out/sunlit-lunch-eat.mp4 --props='{"post":true}').

type Vec3 = [number, number, number];

const BACK = -2.95; // back wall face (Room depth 6: the wall is 0.1 thick round z = -3)
const WIN: Vec3 = [-0.75, 1.9, BACK + 0.09]; // centre of the glass
const WIN_SIZE: [number, number] = [0.95, 1.25];
const SUN: Vec3 = [0.5, -0.6, 0.8]; // the way the light travels: down, right and toward the camera
const TABLE: Vec3 = [0.55, 0, -0.9];
const TOP = 0.44; // table top height: below a seated puppet's chest, so its torso shows
const SEAT: [number, number] = [TABLE[0], TABLE[2] - 0.42];

const MAN: PuppetLook = { skin: "#e9b98f", hair: "#4a2e1c", outfit: "#3d6fb5" };

const gingham = () =>
  canvasTexture(256, 256, (ctx) => {
    ctx.fillStyle = "#fbf3e6";
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = "rgba(208,52,52,0.55)";
    for (let i = 0; i < 8; i++) {
      ctx.fillRect(i * 32, 0, 16, 256);
      ctx.fillRect(0, i * 32, 256, 16);
    }
  });

// The window in the back wall: white frame and bars round glass blown out by the sun.
const SunWindow: React.FC = () => {
  const [w, h] = WIN_SIZE;
  return (
    <group position={[WIN[0], WIN[1], BACK]}>
      <InkBox size={[w + 0.22, h + 0.22, 0.08]} color="#8a5a36" />
      <mesh position={[0, 0, 0.045]}>
        <planeGeometry args={[w, h]} />
        <meshBasicMaterial color={new THREE.Color("#fff6dc").multiplyScalar(1.04)} toneMapped={false} />
      </mesh>
      <InkBox size={[0.07, h, 0.05]} position={[0, 0, 0.07]} color="#a8754a" ink={0.004} />
      {[-1, 1].map((k) => (
        <InkBox key={k} size={[w, 0.07, 0.05]} position={[0, (k * (h + 0.07)) / 6, 0.07]} color="#a8754a" ink={0.004} />
      ))}
      <InkBox size={[w + 0.3, 0.05, 0.16]} position={[0, -h / 2 - 0.1, 0.06]} color="#a8754a" ink={0.006} />
      {/* Behind the glass and frame: it only glows on the wall round the window */}
      <Halo position={[0, 0, 0.02]} size={1.7} color="#fff0c8" strength={0.3} />
    </group>
  );
};

// A low table with a gingham cloth hanging over its edges.
const Table: React.FC = () => {
  const cloth = React.useMemo(gingham, []);
  return (
    <group position={TABLE}>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.05, TOP, 0.05]} position={[sx * 0.46, TOP / 2, sz * 0.26]} color="#8a5a36" ink={0.006} />),
      )}
      <InkBox size={[1.06, 0.035, 0.64]} position={[0, TOP - 0.018, 0]} color="#ffffff" map={cloth} ink={0.008} />
      <InkBox size={[1.06, 0.12, 0.01]} position={[0, TOP - 0.08, 0.32]} color="#ffffff" map={cloth} ink={0.006} />
    </group>
  );
};

const Ball: React.FC<{ position: Vec3; r: number; color: string; squash?: number }> = ({ position, r, color, squash = 1 }) => (
  <mesh position={position} scale={[1, squash, 1]} castShadow>
    <sphereGeometry args={[r, 20, 14]} />
    <meshToonMaterial color={color} gradientMap={toonRamp} />
  </mesh>
);

// Lunch: a plate of spaghetti and meatballs (`left` of the three still on it), a glass of water, bread.
const Lunch: React.FC<{ left: number }> = ({ left }) => (
  <group position={[TABLE[0], TOP, TABLE[2]]} scale={1.35}>
    <group position={[0.02, 0, 0.06]}>
      <InkCylinder radius={0.15} height={0.014} position={[0, 0.007, 0]} color="#ffffff" ink={0.004} />
      <Ball position={[0, 0.03, 0]} r={0.09} squash={0.38} color="#f2d27a" />
      <Ball position={[0, 0.06, 0.01]} r={0.055} squash={0.35} color="#d8452b" />
      {[[-0.03, 0.02], [0.035, 0.0], [0.0, -0.035]].slice(0, left).map(([x, z], i) => (
        <Ball key={i} position={[x, 0.07, z]} r={0.022} color="#7a3b22" />
      ))}
    </group>
    <group position={[0.34, 0, 0.02]}>
      <InkCylinder radius={0.035} height={0.12} position={[0, 0.06, 0]} color="#cfe9f7" ink={0.004} />
      <InkCylinder radius={0.03} height={0.07} position={[0, 0.04, 0]} color="#9fd2ee" ink={0} />
    </group>
    <group position={[-0.3, 0, 0.04]} rotation={[0, 0.4, 0]}>
      <InkCylinder radius={0.09} height={0.012} position={[0, 0.006, 0]} color="#e9e2d2" ink={0.004} />
      <Ball position={[0, 0.03, 0]} r={0.06} squash={0.5} color="#d9a05b" />
      <Ball position={[0.05, 0.028, 0.03]} r={0.045} squash={0.5} color="#c98d4b" />
    </group>
  </group>
);

// Two bites in 150 frames, each its own: the first eager (a little pull back, a quick lift that overshoots, he leans
// in to meet it), then chewing with his hand to his cheek; the fork dips to the plate and twirls the spaghetti
// (SCOOP), and the second comes slow on a curve from the side while his head tips the other way, then chewing with a
// pat on the belly. The chewing never ticks like a metronome: its pace drifts and every chew opens a different amount.
const BITES = [30, 122];
const SCOOP = 92;
const TWIRL = [86, 100];
const CHEW: [number, number][] = [[32, 86], [124, 150]];
const ease = (f: number, a: number, b: number) => smooth(ramp(f, a, b));
const bell = (f: number, a: number, b: number) => Math.sin(Math.PI * ramp(f, a, b)); // 0 -> 1 -> 0
// Rises past 1 and settles back (an eager move that overshoots).
const overshoot = (p: number, k = 1.6) => 1 + (k + 1) * (p - 1) ** 3 + k * (p - 1) ** 2;
// 0: fork on the plate, 1: at the mouth.
const lift = (f: number) => {
  if (f < 30) return 0.15 - 0.08 * bell(f, 2, 9) + 0.85 * overshoot(ramp(f, 8, 25));
  if (f < 100) return 1 - 0.7 * ease(f, 33, 49) - 0.3 * ease(f, 80, 88) + 0.03 * bell(f, TWIRL[0], TWIRL[1]);
  if (f < 124) {
    const p = ramp(f, 100, 121);
    return p * p * p * (p * (6 * p - 15) + 10); // smootherstep: a slower, careful start
  }
  return 1 - 0.6 * ease(f, 125, 146);
};
const loaded = (f: number) => f < BITES[0] || (f >= SCOOP && f < BITES[1]);
const chewing = (f: number) => CHEW.findIndex(([a, b]) => f >= a && f < b);
// Jaw phase: |sin| closes about every 20 frames (~1.5 chews a second), the pace drifting a little each window.
const JAW = 0.16;
const jawPhase = (t: number, w: number) => JAW * t + 0.45 * (Math.sin(0.09 * t + w * 2.1) - Math.sin(w * 2.1));
// How wide each chew opens: chew k of window w gets its own 0.7..1.1.
const chewAmp = (t: number, w: number) => 0.7 + 0.4 * (0.5 + 0.5 * Math.sin(Math.floor(jawPhase(t, w) / Math.PI) * 2.7 + w * 1.3));
const jaw = (f: number) => {
  const w = chewing(f);
  if (w < 0) return 0;
  const t = f - CHEW[w][0];
  return Math.sin(jawPhase(t, w)) * chewAmp(t, w);
};
const mouth = (f: number) => {
  if (chewing(f) >= 0) return 0.06 + 0.22 * Math.abs(jaw(f));
  // the first bite gapes as the fork flies in, the second opens early and slowly
  return loaded(f) ? 0.08 + (f < SCOOP ? 0.62 * ease(lift(f), 0.6, 0.95) : 0.5 * ease(lift(f), 0.35, 0.9)) : 0.08;
};
const LOW: [number, number] = [35, -490]; // the hand just over the plate, clear of the table top
const lerp2 = (a: [number, number], b: [number, number], p: number): [number, number] => [a[0] + (b[0] - a[0]) * p, a[1] + (b[1] - a[1]) * p];
const reach = (f: number): [number, number] => {
  const [x, y] = lerp2(LOW, REACH, lift(f));
  // twirling: two small circles over the plate; the second bite swings out to the side on its way up
  const tw = ramp(f, TWIRL[0], TWIRL[1]);
  const circle = tw > 0 && tw < 1 ? [14 * Math.sin(4 * Math.PI * tw), 8 * (Math.cos(4 * Math.PI * tw) - 1)] : [0, 0];
  return [x + circle[0] + 75 * bell(f, 100, 121), y + circle[1]];
};
// Fork roll: tines down in the plate, up to the mouth, wobbling as it twirls.
const forkRoll = (f: number) => 2.6 + (0.5 - 2.6) * lift(f) + 0.35 * Math.sin(4 * Math.PI * ramp(f, TWIRL[0], TWIRL[1])) * bell(f, TWIRL[0], TWIRL[1]);
// Left hand: on the table, to his cheek while he savours the first bite, patting his belly after the second.
const REST: [number, number] = [-190, -360];
const leftHand = (f: number): { reach: [number, number]; hand: "open" | "fist" } => {
  const cheek = ease(f, 40, 50) * (1 - ease(f, 74, 84));
  const belly = ease(f, 128, 137);
  const pat = belly * 14 * Math.abs(Math.sin((f - 137) * 0.45));
  const [x, y] = lerp2(lerp2(REST, [-145, -715], cheek), [-55, -430], belly);
  return { reach: [x, y - pat], hand: cheek > 0.5 || belly > 0.5 ? "open" : "fist" };
};

// The camera eases in on him over the five seconds.
const cameraAt = (f: number): CameraShot => {
  const p = ease(f, 0, 150);
  return { position: lerp3([0.2, 1.3, 3.1], [0.32, 1.2, 2.65], p), target: lerp3([0.0, 1.0, -1.3], [0.18, 0.9, -1.3], p), fov: 44 };
};

// The fork in his hand, tines down in the plate and turned up toward his mouth as it rises, a meatball on it while loaded.
const REACH: [number, number] = [70, -560];
const Fork: React.FC<{ f: number; camera: CameraShot }> = ({ f, camera }) => {
  const up = lift(f);
  const hand = handWorld([SEAT[0], SEAT[1]], reach(f), camera);
  return (
    <group position={[hand[0], hand[1], hand[2] + 0.06 + 0.08 * (1 - up)]} rotation={[0, 0, forkRoll(f)]} scale={1.5}>
      <InkBox size={[0.012, 0.12, 0.006]} position={[0, 0.04, 0]} color="#c9ccd4" ink={0.003} />
      {[-1, 0, 1].map((k) => (
        <InkBox key={k} size={[0.004, 0.035, 0.004]} position={[k * 0.007, 0.115, 0]} color="#c9ccd4" ink={0.002} />
      ))}
      {loaded(f) && <Ball position={[0, 0.13, 0.008]} r={0.022} color="#7a3b22" />}
    </group>
  );
};

// A chair with its back to the wall, the seat just behind the man's card so it never crosses his legs.
const Chair: React.FC = () => (
  <group position={[SEAT[0], 0, SEAT[1] - 0.12]}>
    <InkBox size={[0.42, 0.05, 0.36]} position={[0, 0.32, 0]} color="#b5733f" />
    <InkBox size={[0.42, 0.5, 0.05]} position={[0, 0.6, -0.16]} color="#b5733f" />
    {[-1, 1].map((sx) =>
      [-1, 1].map((sz) => <InkBox key={`${sx}${sz}`} size={[0.04, 0.32, 0.04]} position={[sx * 0.18, 0.16, sz * 0.15]} color="#8a5a36" ink={0.004} />),
    )}
  </group>
);

const Picture: React.FC<{ position: Vec3 }> = ({ position }) => (
  <group position={position}>
    <InkBox size={[0.5, 0.38, 0.03]} color="#6b4a2e" ink={0.006} />
    <mesh position={[0, 0, 0.017]}>
      <planeGeometry args={[0.42, 0.3]} />
      <meshBasicMaterial color="#8fc6a8" />
    </mesh>
    <mesh position={[0.02, -0.04, 0.018]}>
      <circleGeometry args={[0.07, 3]} />
      <meshBasicMaterial color="#4e8a6a" />
    </mesh>
  </group>
);

const cast = (f: number): PuppetPlacement[] => {
  const j = jaw(f);
  const left = leftHand(f);
  return [
    {
      id: "man",
      look: MAN,
      at: SEAT,
      pose: {
        sit: true,
        view: "front",
        expression: "happy", // eyes shut with delight the whole time
        mouthOpen: mouth(f),
        lookX: 0.15,
        // leans in to meet the first bite; tips his head into his hand, then the other way for the second bite,
        // and drifts while he chews
        lean: 5 * bell(f, 16, 36) + 2 * bell(f, 104, 128),
        headTilt: -4 + 9 * ease(f, 42, 52) * (1 - ease(f, 76, 86)) - 7 * bell(f, 100, 130) + 3 * Math.sin(f * 0.05) + j * 2.5,
        bob: Math.abs(j) * 6,
        reachR: reach(f),
        handR: "fist",
        frontR: true,
        reachL: left.reach,
        handL: left.hand,
        frontL: true,
      },
    },
  ];
};

const lunchStage = (f: number) => {
  const camera = cameraAt(f);
  return (
    <Stage
      set={
        <Room camera={camera} mood="daylight" floor="#9b6a45" wall="#86a596" wallPattern="wallpaper" floorPattern="wood" width={7} depth={6}>
          <SunWindow />
          <Picture position={[0.75, 1.75, BACK + 0.06]} />
          <mesh position={[TABLE[0], 0.003, TABLE[2] - 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <circleGeometry args={[1.0, 48]} />
            <meshToonMaterial color="#5f7f9a" gradientMap={toonRamp} />
          </mesh>
          <Chair />
          <Table />
          <Lunch left={f < SCOOP ? 3 : 2} />
          <Fork f={f} camera={camera} />
          <GodRays center={WIN} size={WIN_SIZE} panes={[2, 3]} bar={0.07} sun={SUN} strength={0.08} patch={0.32} frame={f} tops={[{ y: TOP, x: [TABLE[0] - 0.53, TABLE[0] + 0.53], z: [TABLE[2] - 0.32, TABLE[2] + 0.32] }]} />
        </Room>
      }
      camera={camera}
      bg={moodBackground("daylight")}
      puppets={cast(f)}
      energy={0}
      light={{ distant: [{ direction: [-SUN[0], -SUN[1], -SUN[2]], color: "#ffe2a6", strength: 1.8 }] }}
    />
  );
};

// The still: the fork at his lips just before the first bite.
export const SunlitLunch: React.FC = () => lunchStage(27);

// Five seconds of it (composition SunlitLunchEat): two bites and the chewing, room tone and a light lounge bed.
const Eating: React.FC = () => lunchStage(useShotFrame());
const SHOTS: Shot[] = [[0, 150, Eating, false]];
const SFX: Sfx[] = [
  // All in the room's small reflections. The fork scrapes the plate as it leaves it and as it scoops the second
  // meatball (recorded), each bite is a soft chomp (recorded crunches with the crisp taken off), and every jaw close
  // while chewing a wet munch, a different take each.
  ...foleyCues("fork-plate", [4, SCOOP], 0.55, { space: "room" }),
  ...foleyCues("chomp", BITES, 0.45, { space: "room" }),
  // (no munch on the bite itself, nor in the last 8 frames, where it would be cut off into a click)
  ...foleyCues("munch", jawCloses(CHEW, jawPhase).filter((f) => !BITES.some((b) => Math.abs(f - b) < 6) && f < 142), 0.16, { space: "room" }),
];
const MUSIC: MusicCue[] = [{ src: MUSIC_FILES.lounge, from: 0, to: 150, volume: 0.3 }];

export const SunlitLunchEat: React.FC = () => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>
    <ShotList shots={SHOTS} />
    <SoundTrack sfx={SFX} music={MUSIC} captions={[]} total={150} />
  </AbsoluteFill>
);
