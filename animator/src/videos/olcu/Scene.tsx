import React from "react";
import { AbsoluteFill } from "remotion";
import {
  Burst,
  CameraShot,
  faceChange,
  foleyCues,
  handWorld,
  MUSIC_FILES,
  MusicCue,
  PuppetLook,
  PuppetPlacement,
  PuppetPose,
  ramp,
  Sfx,
  sfx,
  Shot,
  Stage,
  stroll,
  Timing,
  pianoPlay,
  useShotFrame,
  Video,
} from "../../engine";
import { Holster } from "../../scenes/DuelPreview";
import { SIGN, STREET, TOWN_BG, townLight, TownMode, Tumbleweed, WesternTownSet } from "../../three/WesternTownSet";
import { CoffinCart, Fly, Lantern, PIANO_KEYS, PIANO_SEAT, SaloonSet, saloonLight, Tape } from "./props";
import TIMING_JSON from "./timing.json";

// "The Measure" (ÖLÇÜ): a sundown duel in a western street. The rule: draw when the saloon piano stops. The pianist
// can't stop, the town undertaker measures both men for their coffins mid-standoff, the barman shuts the piano lid
// on the pianist's hands, the undertaker steps in again to measure the distance, the sun goes down; in the dark both
// men fire and shoot down the undertaker's own sign. Set: guide/references/western-street.md (WesternTownSet).

const TIMING = TIMING_JSON as Timing;
export const SLUG = "olcu";
export const timing = TIMING;

const ease = (f: number, a: number, b: number) => {
  const p = ramp(f, a, b);
  return p * p * (3 - 2 * p);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mix3 = (a: [number, number, number], b: [number, number, number], t: number): [number, number, number] => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)];
const cam = (a: CameraShot, b: CameraShot, t: number): CameraShot => ({ position: mix3(a.position, b.position, t), target: mix3(a.target, b.target, t), fov: mix(a.fov, b.fov, t) });
const UNITS = 1060 / 1.3; // puppet units per metre
const WALK_AIR = 0.18 * UNITS; // standing on the boardwalk

// ---------- cast ----------

const TEX_LOOK: PuppetLook = { skin: "#e8b48a", hair: "#6a3a1e", outfit: "#4a6a8a", vest: "#3a2a20", hat: "#8a6a4a" };
const BART_LOOK: PuppetLook = { skin: "#d49a72", hair: "#1a1412", outfit: "#5a2a2a", vest: "#1e1a1a", beard: "#1a1412", kerchief: "#2a2a2a", hat: "#1a1616" };
const PRUITT_LOOK: PuppetLook = { skin: "#ecd8c8", hair: "#a0a0a0", outfit: "#1e1e24", vest: "#3a3a44", hat: "#121214", hatStyle: "bowler", glasses: true };
const PIANIST_LOOK: PuppetLook = { skin: "#f0c8a0", hair: "#3a2414", outfit: "#f2ece0", vest: "#a02a2a", suspenders: "#2a2a2a", hat: "#3a2a1a", hatStyle: "bowler", beard: "#3a2414" };
const BARMAN_LOOK: PuppetLook = { skin: "#d8a47a", hair: "#2a1e16", outfit: "#e8e0d0", apron: "#f4f0e8", beard: "#5a3a24", vest: "#2a3a2a" };
const BOY_LOOK: PuppetLook = { skin: "#f0c8a0", hair: "#c08040", outfit: "#8a6a4a", suspenders: "#3a2a1a", hat: "#d8c08a", hatStyle: "boater" };

const TEX: [number, number] = [-0.62, 4.7];
const BART: [number, number] = [0.3, -0.6];
const CART_END: [number, number] = [2.5, -3.5]; // in the street at the boardwalk edge, before Pruitt's shop // on the boardwalk by Pruitt's door
const PRUITT_DOOR: [number, number] = [3.75, -2.2];

const TEX_FACE = { lid: 0.35, brow: 0.6 };
const BART_FACE = { lid: 0.3, brow: 0.7 };
const texStand = (extra: Partial<PuppetPose> = {}): PuppetPose => ({ expression: "determined", armR: [24, -30], handR: "open", armL: [8, -10], face: TEX_FACE, ...extra });
const bartStand = (extra: Partial<PuppetPose> = {}): PuppetPose => ({ expression: "determined", view: "front", armR: [22, -18], handR: "open", armL: [8, -6], handL: "fist", face: BART_FACE, ...extra });

// The duel's two-shot (the poster frame), from low behind Tex.
const DUEL: CameraShot = { position: [-0.5, 0.42, 7.5], target: [0.15, 1.0, -4], fov: 48 };

const focusOn = (c: CameraShot, at: [number, number], y = 0.98) => {
  const [px, py, pz] = c.position;
  const [tx, ty, tz] = c.target;
  const len = Math.hypot(tx - px, ty - py, tz - pz);
  return ((at[0] - px) * (tx - px) + (y - py) * (ty - py) + (at[1] - pz) * (tz - pz)) / len;
};

// A street shot: the set in its mode, the holsters on both men (when they are in), extra set pieces.
const Street: React.FC<{
  f: number;
  camera: CameraShot;
  cast: PuppetPlacement[];
  mode?: TownMode;
  focus?: [number, number];
  blur?: number;
  extras?: React.ReactNode;
  signFallen?: boolean;
  lantern?: [number, number, number];
  flash?: number;
  soft?: boolean; // a close-up facing the sun: the sun on the face at half strength
}> = ({ f, camera, cast, mode = "sunset", focus, blur = 2.4, extras, signFallen, lantern, flash, soft }) => (
  <Stage
    set={
      <WesternTownSet camera={camera} frame={f} mode={mode} signFallen={signFallen}>
        <group userData={{ ghost: true }}>
          {cast.some((p) => p.id === "tex") && <Holster at={cast.find((p) => p.id === "tex")!.at} side={45} camera={camera} />}
          {cast.some((p) => p.id === "bart") && <Holster at={cast.find((p) => p.id === "bart")!.at} side={-150} camera={camera} />}
        </group>
        {extras}
      </WesternTownSet>
    }
    camera={camera}
    bg={TOWN_BG[mode]}
    puppets={cast}
    blur={blur}
    focus={focus ? focusOn(camera, focus) : undefined}
    light={soft ? { ...townLight(mode, lantern), distant: [{ direction: [0.1, 0.3, 1], color: "#ffa060", strength: 1.0 }, { direction: [-0.3, 0.3, -1], color: "#ff7a40", strength: 1.6 }] } : townLight(mode, lantern)}
    flash={flash}
  />
);

const tex = (pose: PuppetPose = texStand({ view: "side", facing: 1, lookX: 0.5 }), at = TEX): PuppetPlacement => ({ id: "tex", look: TEX_LOOK, at, pose });
const bart = (pose: PuppetPose = bartStand(), at = BART): PuppetPlacement => ({ id: "bart", look: BART_LOOK, at, pose });

// ---------- shots ----------

// 1. The street at sundown: the camera sinks from above the porch roofs to the low two-shot; Bart lays down the rule.
const S1: React.FC = () => {
  const f = useShotFrame();
  const t = ease(f, 0, 140);
  const camera = cam({ position: [-0.2, 3.1, 9.6], target: [0.2, 1.4, -6], fov: 46 }, DUEL, t);
  const roll = ramp(f, 0, 150);
  const tw: [number, number, number] = [mix(3.0, -1.6, roll), Math.abs(Math.sin(roll * Math.PI * 3)) * 0.15, mix(1.6, 1.0, roll)];
  return (
    <Street
      f={f}
      camera={camera}
      focus={BART}
      cast={[tex(), bart()]}
      extras={<Tumbleweed position={tw} size={0.34} spin={-(tw[0] - 3) / 0.34} />}
    />
  );
};

// The pianist at the upright, in profile facing it; `play` 0..1 how hard he plays (hands hop on the keys).
const pianist = (f: number, play: number, extra: Partial<PuppetPose> = {}): PuppetPlacement => {
  return {
    id: "pianist",
    look: PIANIST_LOOK,
    at: PIANO_SEAT,
    pose: { expression: "happy", sit: true, view: "side", facing: -1, ...pianoPlay(f, { keys: PIANO_KEYS, view: "side", facing: -1, energy: play }), ...extra },
  };
};
const SALOON_WIDE: CameraShot = { position: [-0.6, 1.25, 2.6], target: [-2.4, 0.75, -1.0], fov: 42 };

// 2. Inside: the pianist hears the rule, nods, and strikes up.
const S2: React.FC = () => {
  const f = useShotFrame();
  const t = ease(f, 0, 72);
  const camera = cam({ position: [-0.4, 1.3, 2.9], target: [-2.3, 0.8, -1.0], fov: 44 }, SALOON_WIDE, t);
  const play = ramp(f, 20, 28);
  const nod = f < 18 ? Math.sin((f / 18) * Math.PI * 2) * 6 : 0;
  return (
    <Stage
      set={<SaloonSet camera={camera} />}
      camera={camera}
      bg="#2a140c"
      blur={2}
      puppets={[pianist(f, play, { expression: f < 20 ? "determined" : "happy", headTilt: nod, lookX: f < 14 ? 0.8 : 0 })]}
      light={saloonLight()}
    />
  );
};

// 3. Tex, tight from in front (the sun on his face), slowly closer.
const S3: React.FC = () => {
  const f = useShotFrame();
  const t = ease(f, 0, 60);
  const camera = cam({ position: [-0.35, 0.92, 2.6], target: [-0.62, 0.98, 4.7], fov: 30 }, { position: [-0.4, 0.95, 2.95], target: [-0.62, 0.99, 4.7], fov: 28 }, t);
  return <Street f={f} camera={camera} focus={TEX} blur={4} cast={[tex(texStand({ view: "front", lookX: 0, face: { lid: 0.4, brow: 0.8 } }))]} soft />;
};

// 4. Bart, tight, backlit by the sun; a fly comes in and lands on his nose. He doesn't move.
const BART_NOSE: [number, number, number] = [BART[0], 0.93, BART[1] + 0.06];
const flyAt = (f: number, land: number): [number, number, number] => {
  const p = ramp(f, land - 30, land);
  const r = (1 - p) * 0.35;
  return [BART_NOSE[0] + Math.cos(f * 0.5) * r, BART_NOSE[1] + Math.sin(f * 0.8) * r * 0.5 + (1 - p) * 0.08, BART_NOSE[2] + 0.02 + Math.sin(f * 0.5) * r * 0.4];
};
const S4: React.FC = () => {
  const f = useShotFrame();
  const t = ease(f, 0, 63);
  const camera = cam({ position: [0.55, 0.88, 2.1], target: [0.3, 0.97, -0.6], fov: 30 }, { position: [0.5, 0.9, 1.75], target: [0.3, 0.97, -0.6], fov: 28 }, t);
  return (
    <Street
      f={f}
      camera={camera}
      focus={BART}
      blur={4}
      cast={[bart(bartStand({ lookX: 0, face: { lid: 0.42, brow: 1 } }))]}
      extras={<Fly at={flyAt(f, 34)} frame={f} landed={f > 34} />}
    />
  );
};

// 5. The pianist glances at the window, sees the whole street watching, and goes into a grand finale.
const S5: React.FC = () => {
  const f = useShotFrame();
  const t = ease(f, 0, 54);
  const camera = cam({ position: [-1.1, 1.0, 0.9], target: [-2.1, 0.85, -1.0], fov: 38 }, { position: [-1.35, 0.95, 0.6], target: [-2.1, 0.88, -1.0], fov: 36 }, t);
  const show = f > 14;
  return (
    <Stage
      set={<SaloonSet camera={camera} />}
      camera={camera}
      bg="#2a140c"
      blur={2.5}
      puppets={[
        pianist(f, show ? 1.4 : 0.8, {
          ...faceChange([[0, "happy"], [8, "thinking"], [16, "excited"]], f, 6),
          lookX: f < 14 ? 1 : -0.2,
          headTilt: show ? Math.sin(f * 0.5) * 8 : 0,
          ...(show ? { reachR: [-260 + Math.sin(f * 0.6) * 80, -560 + Math.abs(Math.sin(f * 0.7)) * 120] as [number, number] } : {}),
        }),
      ]}
      light={saloonLight()}
    />
  );
};

// Pruitt walks in from the left, unhurried, and measures Bart from boots to hat.
const PRUITT_IN: [number, number] = [-1.6, -0.2];
const S6: React.FC = () => {
  const f = useShotFrame(); // 399..520
  const t = ease(f, 0, 121);
  const camera = cam({ position: [-0.6, 1.0, 3.4], target: [0.0, 0.9, -0.6], fov: 40 }, { position: [-0.45, 0.98, 3.0], target: [0.05, 0.9, -0.6], fov: 39 }, t);
  const w = stroll(f, 0, 30, PRUITT_IN, [-0.35, -0.45]);
  const measuring = f > 72;
  const up = ease(f, 74, 104);
  const pruittPose: PuppetPose = { expression: "neutral", ...w.pose, view: f < 30 ? "side" : "front", facing: 1, ...(measuring ? { reachR: [120, mix(-120, -1000, up)] as [number, number], handR: "fist" } : {}), lookX: 0.6, ...(measuring ? { bend: (1 - up) * 0.6 } : {}) };
  const tapeA = handWorld(w.at, [120, mix(-120, -1000, up)], camera);
  return (
    <Street
      f={f}
      camera={camera}
      focus={BART}
      cast={[bart(bartStand({ lookX: f > 4 && f < 30 ? -0.6 : 0 })), { id: "pruitt", look: PRUITT_LOOK, at: w.at, pose: pruittPose }]}
      extras={measuring ? <Tape a={tapeA} b={[BART[0] - 0.05, 0.02, BART[1] + 0.1]} sag={0} /> : <Fly at={BART_NOSE} frame={f} landed />}
    />
  );
};

// 7. Pruitt measures Tex; Tex goes up on his toes for "six foot three"; Pruitt writes "one" and strolls off.
const S7: React.FC = () => {
  const f = useShotFrame(); // 520..700
  const t = ease(f, 0, 180);
  const camera = cam({ position: [0.5, 1.0, 7.4], target: [-0.55, 0.88, 4.7], fov: 40 }, { position: [0.35, 0.98, 7.05], target: [-0.55, 0.9, 4.7], fov: 39 }, t);
  const P: [number, number] = [-0.12, 4.85];
  const toes = ease(f, 58, 66) * (1 - ease(f, 104, 112));
  const leave = stroll(f, 140, 40, P, [1.6, 5.4]);
  const at = f < 140 ? P : leave.at;
  const pruittPose: PuppetPose =
    f < 140
      ? { expression: "neutral", view: "front", reachR: [-140, mix(-1000, -1060, toes)], handR: "fist", reachL: [60, -560], handL: "point", lookX: -0.6, ...(f > 100 ? faceChange([[100, "neutral"], [108, "skeptical"]], f, 6) : {}) }
      : { expression: "neutral", ...leave.pose };
  return (
    <Street
      f={f}
      camera={camera}
      focus={TEX}
      cast={[tex(texStand({ view: "front", lookX: 0.3, air: toes * 28, ...(toes > 0.5 ? { expression: "smug" as const } : {}) })), { id: "pruitt", look: PRUITT_LOOK, at, pose: pruittPose }]}
      extras={f < 130 ? <Tape a={handWorld(P, [-140, mix(-1000, -1060, toes)], camera)} b={[TEX[0] + 0.05, 0.02, TEX[1] + 0.1]} sag={0} /> : null}
    />
  );
};

// 8. Along the right boardwalk: Pruitt's boy wheels in two coffins, one plain pine, one polished with brass handles.
const cartAt = (f: number): [number, number] => [CART_END[0], mix(1.6, CART_END[1], ease(f, 0, 44))];
const S8: React.FC = () => {
  const f = useShotFrame(); // 700..752
  const t = ease(f, 0, 52);
  const camera = cam({ position: [-1.3, 1.1, 1.2], target: [2.6, 1.35, -1.0], fov: 50 }, { position: [-1.1, 1.08, 0.7], target: [2.6, 1.35, -2.2], fov: 50 }, t);
  const c = cartAt(f);
  const boy = stroll(f, 0, 44, [2.5, 2.6], [2.5, CART_END[1] + 1.0]);
  return (
    <Street
      f={f}
      camera={camera}
      focus={[c[0], c[1]]}
      cast={[{ id: "boy", look: BOY_LOOK, at: boy.at, pose: { expression: "neutral", ...boy.pose, reachR: [-200, -560], reachL: [-170, -540] } }, { id: "pruitt", look: PRUITT_LOOK, at: PRUITT_DOOR, pose: { expression: "neutral", air: WALK_AIR, view: "front", lookX: 0.4 } }]}
      extras={<CoffinCart position={[c[0], -0.06, c[1]]} rolled={c[1] - 1.6} />}
    />
  );
};

// 9. Bart, the coffins behind him on the boardwalk: which one's mine? Pruitt answers from beside them.
const S9: React.FC = () => {
  const f = useShotFrame(); // 752..912
  const t = ease(f, 0, 160);
  const camera = cam({ position: [-1.0, 1.05, 4.2], target: [1.8, 0.95, -3.5], fov: 42 }, { position: [-0.95, 1.04, 3.85], target: [1.8, 0.95, -3.5], fov: 41 }, t);
  const look = f < 60 ? 0.7 : f < 100 ? 0.9 : 0.4;
  return (
    <Street
      f={f}
      camera={camera}
      focus={BART}
      cast={[
        bart(bartStand({ lookX: look, headTilt: f > 100 ? -6 : 0, ...faceChange([[0, "determined"], [100, "angry"]], f, 8) })),
        { id: "pruitt", look: PRUITT_LOOK, at: [CART_END[0] - 0.7, CART_END[1] + 0.6], pose: { expression: "neutral", view: "front", lookX: -0.5, ...(f > 68 && f < 100 ? { gesture: "point" as const } : {}) } },
      ]}
      extras={
        <>
          <CoffinCart position={[CART_END[0], -0.06, CART_END[1]]} rolled={0} />
          <Fly at={BART_NOSE} frame={f} landed />
        </>
      }
    />
  );
};

// 10. Tex, the two-shot again from behind him: he shrugs. He paid in advance.
const S10: React.FC = () => {
  const f = useShotFrame(); // 912..985
  const t = ease(f, 0, 73);
  const camera = cam({ position: [0.75, 1.0, 7.3], target: [-0.55, 0.85, 4.7], fov: 38 }, { position: [0.65, 0.98, 7.0], target: [-0.55, 0.85, 4.7], fov: 38 }, t);
  return <Street f={f} camera={camera} focus={TEX} blur={3} cast={[tex(texStand({ view: "front", lookX: 0.5, ...(f > 30 ? { gesture: "shrug" as const, expression: "smug" as const } : {}) }))]} />;
};

// 11. The barman walks round the bar to the still-playing pianist and brings the lid down on his hands.
const S11: React.FC = () => {
  const f = useShotFrame(); // 985..1090
  const t = ease(f, 0, 105);
  const camera = cam({ position: [0.2, 1.3, 2.9], target: [-1.8, 0.8, -0.9], fov: 44 }, { position: [-0.3, 1.2, 2.3], target: [-2.2, 0.8, -0.9], fov: 42 }, t);
  const w = stroll(f, 0, 58, [1.6, -0.1], [-2.15, -0.35]);
  const SLAM = 71;
  const lid = -100 * ease(f, SLAM - 4, SLAM);
  const hit = f >= SLAM;
  const barman: PuppetPose =
    f < 58
      ? { expression: "bored", ...w.pose }
      : { expression: hit ? "smug" : "bored", view: "side", facing: -1, reachR: [-240, mix(-1000, -620, ease(f, SLAM - 6, SLAM))], handR: "open" };
  return (
    <Stage
      set={<SaloonSet camera={camera} lid={lid} />}
      camera={camera}
      bg="#2a140c"
      blur={2}
      puppets={[
        hit ? { id: "pianist", look: PIANIST_LOOK, at: PIANO_SEAT, pose: { expression: "shocked", sit: true, view: "side", facing: -1, reachR: [PIANO_KEYS[0], PIANO_KEYS[1] - 30], reachL: [PIANO_KEYS[0] + 20, PIANO_KEYS[1] - 10], handR: "fist", handL: "fist", squash: f < SLAM + 6 ? 0.15 : 0 } } : pianist(f, 1.4, { expression: "excited", headTilt: Math.sin(f * 0.5) * 8 }),
        { id: "barman", look: BARMAN_LOOK, at: w.at, pose: barman },
      ]}
      light={saloonLight()}
    />
  );
};

// 12a-c. Silence: Tex's eyes, Bart's eyes, the two hands on the grips (very short, hard cuts).
const S12a: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [-0.38, 0.97, 3.05 - f * 0.004], target: [-0.62, 0.99, 4.7], fov: 26 };
  return <Street f={f} camera={camera} focus={TEX} blur={4} cast={[tex(texStand({ view: "front", lookX: 0, face: { lid: 0.55, brow: 1.1 } }))]} soft />;
};
const S12b: React.FC = () => {
  const f = useShotFrame();
  const camera: CameraShot = { position: [0.48, 0.93, 1.75 - f * 0.004], target: [0.3, 0.97, -0.6], fov: 26 };
  return <Street f={f} camera={camera} focus={BART} blur={4} cast={[bart(bartStand({ face: { lid: 0.55, brow: 1.2 } }))]} extras={<Fly at={BART_NOSE} frame={f} landed />} />;
};
const DRAW_TEX = texStand({ view: "side", facing: 1, lookX: 0.5, armR: [6, -72], handR: "fist", face: { lid: 0.55, brow: 1 } });
const DRAW_BART = bartStand({ armR: [14, -40], handR: "fist", face: { lid: 0.55, brow: 1.1 } });
const S12c: React.FC = () => {
  const f = useShotFrame(); // 1132..1163
  const grip = ease(f, 0, 5);
  const camera: CameraShot = { position: [-0.5, 0.42, 7.5 - f * 0.02], target: [0.15, 1.0, -4], fov: 46 - f * 0.08 };
  return (
    <Street
      f={f}
      camera={camera}
      focus={BART}
      cast={[tex(grip > 0.5 ? DRAW_TEX : texStand({ view: "side", facing: 1, lookX: 0.5 })), bart(grip > 0.5 ? DRAW_BART : bartStand())]}
    />
  );
};

// 13. Frozen mid-draw. Pruitt walks backward down the middle of the street, paying out his tape between them.
const S13: React.FC = () => {
  const f = useShotFrame(); // 1163..1323
  const t = ease(f, 0, 160);
  const camera = cam({ position: [2.2, 1.35, 7.6], target: [-0.2, 0.85, 1.6], fov: 46 }, { position: [2.0, 1.3, 7.0], target: [-0.2, 0.85, 1.6], fov: 45 }, t);
  const back = stroll(f, 0, 70, [0.25, -0.1], [-0.4, 3.9]);
  const leave = stroll(f, 100, 60, [-0.4, 3.9], [-3.2, 3.4]);
  const at = f < 100 ? back.at : leave.at;
  const tapeOut = f < 90;
  const pose: PuppetPose =
    f < 70 ? { expression: "neutral", ...back.pose, view: "front", reachR: [-150, -560], handR: "fist" } : f < 100 ? { expression: "neutral", view: "front", reachR: [-150, -560], handR: "fist", reachL: [120, -900], handL: "open" } : { expression: "neutral", ...leave.pose };
  return (
    <Street
      f={f}
      camera={camera}
      focus={[at[0], at[1]]}
      blur={2}
      cast={[tex(DRAW_TEX), bart(DRAW_BART), { id: "pruitt", look: PRUITT_LOOK, at, pose }]}
      extras={
        <>
          {tapeOut && <Tape a={handWorld(at, [-150, -560], camera)} b={[BART[0], 0.25, BART[1] + 0.15]} sag={0.01} />}
          <Fly at={BART_NOSE} frame={f} landed />
        </>
      }
    />
  );
};

// 14. Dusk (dissolve). The two of them, hands now off the guns: do we start the piano again?
const S14: React.FC = () => {
  const f = useShotFrame(); // 1323..1530
  const t = ease(f, 0, 207);
  const camera = cam({ position: [1.2, 0.75, 2.6], target: [-0.2, 1.0, 3.4], fov: 46 }, { position: [1.35, 0.72, 2.1], target: [-0.15, 1.0, 3.2], fov: 46 }, t);
  return (
    <Street
      f={f}
      mode="dusk"
      camera={camera}
      focus={f < 135 ? BART : TEX}
      blur={2.2}
      cast={[tex(texStand({ view: "front", lookX: -0.4, armR: [8, -4], ...(f > 135 ? { gesture: "shrug" as const, expression: "awkward" as const } : {}) })), bart(bartStand({ view: "side", facing: 1, lookX: 0.4, armR: [8, -4], ...(f < 135 ? { expression: "confused" as const } : { expression: "skeptical" as const }) }))]}
      extras={<Fly at={BART_NOSE} frame={f} landed />}
    />
  );
};

// 15. Night (dissolve). A slow one-handed tune drifts out of the saloon. Tex yawns. Bart doesn't move.
const S15: React.FC = () => {
  const f = useShotFrame(); // 1530..1700
  const t = ease(f, 0, 170);
  const camera = cam({ position: [-0.4, 0.5, 8.6], target: [0.15, 1.0, -4], fov: 46 }, { position: [-0.45, 0.45, 7.8], target: [0.15, 1.0, -4], fov: 47 }, t);
  const yawn = Math.sin(Math.PI * ramp(f, 60, 100));
  return (
    <Street
      f={f}
      mode="night"
      camera={camera}
      focus={BART}
      cast={[tex(texStand({ view: "side", facing: 1, lookX: 0.5, mouthOpen: yawn, ...(yawn > 0.1 ? { expression: "bored" as const, headTilt: -8 * yawn } : {}) })), bart(bartStand({ face: { lid: 0.5, brow: 1.1 } }))]}
    />
  );
};

// 16. The tune ends. Black. Two muzzle flashes light the street for a frame each; something heavy falls.
const SHOT1 = 6, SHOT2 = 9;
const S16: React.FC = () => (
  <AbsoluteFill>
    <S16Street />
    <S16Dark />
  </AbsoluteFill>
);
// The dark: black over the shot, lifted by the flashes, and by the lantern coming out of the door at the end.
const S16Dark: React.FC = () => {
  const f = useShotFrame();
  const fl = Math.max(f >= SHOT1 ? Math.max(0, 1 - (f - SHOT1) / 4) : 0, f >= SHOT2 ? Math.max(0, 1 - (f - SHOT2) / 4) : 0);
  return <AbsoluteFill style={{ backgroundColor: "#000", opacity: Math.max(0, 0.96 - fl * 0.95 - ramp(f, 70, 85) * 0.5) }} />;
};
const S16Street: React.FC = () => {
  const f = useShotFrame(); // 1700..1785
  const camera: CameraShot = { position: [-0.45, 0.45, 7.75], target: [0.15, 1.0, -4], fov: 47 };
  const flash = (at: number) => (f >= at ? Math.max(0, 1 - (f - at) / 4) : 0);
  const fl = Math.max(flash(SHOT1), flash(SHOT2));
  const muzzleT = handWorld(TEX, [70, -360], camera);
  return (
    <Street
      f={f}
      mode="night"
      camera={camera}
      focus={BART}
      cast={[tex(DRAW_TEX), bart(DRAW_BART)]}
      flash={fl * 0.5}
      signFallen={f > 30}
      extras={
        <>
          <Burst kind="sparks" at={[muzzleT[0] + 0.1, muzzleT[1] + 0.05, muzzleT[2] - 0.15]} frame={f - SHOT1} count={36} size={0.7} speed={2.4} spray={[2.0, 0.6, -1.0]} seed={3} />
          <Burst kind="sparks" at={[BART[0] - 0.25, 0.5, BART[1] + 0.2]} frame={f - SHOT2} count={36} size={0.7} speed={2.4} spray={[2.0, 0.8, 0.6]} seed={8} />
          <Burst kind="dust" at={[SIGN.x + 0.2, 0.2, SIGN.z + 0.2]} frame={f - 31} count={16} size={0.8} seed={12} />
        </>
      }
    />
  );
};

// 17. Lantern light: the undertaker's own sign on the boardwalk, shot off its chains. He measures it. Pine, then.
const S17: React.FC = () => {
  const f = useShotFrame(); // 1785..1916
  const t = ease(f, 0, 131);
  const camera = cam({ position: [3.3, 1.55, 1.55], target: [3.25, 0.35, -0.95], fov: 56 }, { position: [3.3, 1.5, 1.3], target: [3.25, 0.35, -0.95], fov: 55 }, t);
  const P: [number, number] = [3.85, -1.45];
  const bendDown = ease(f, 6, 30);
  const lantern = handWorld(P, [-210, -400], camera);
  lantern[1] += 0.18;
  return (
    <Street
      f={f}
      mode="night"
      camera={camera}
      focus={P}
      blur={2.4}
      signFallen
      lantern={lantern}
      cast={[{ id: "pruitt", look: PRUITT_LOOK, at: P, pose: { expression: f > 40 ? "sad" : "neutral", air: WALK_AIR, view: "front", lookX: -0.6, bend: bendDown * 0.35, reachL: [-210, -400], handL: "fist", reachR: [90, mix(-600, -380, bendDown)], handR: "fist" } }]}
      extras={
        <>
          <Lantern position={lantern} frame={f} />
          {f > 26 && <Tape a={handWorld(P, [90, -380], camera)} b={[SIGN.x - 0.25, 0.23, SIGN.z + 0.05]} sag={0} />}
        </>
      }
    />
  );
};

// ---------- the cut ----------

const SHOTS: Shot[] = [
  [0, 150, S1, false],
  [150, 222, S2, false],
  [222, 282, S3, false],
  [282, 345, S4, false],
  [345, 399, S5, false],
  [399, 520, S6, false],
  [520, 700, S7, false],
  [700, 752, S8, false],
  [752, 912, S9, false],
  [912, 985, S10, false],
  [985, 1090, S11, false],
  [1090, 1112, S12a, false],
  [1112, 1132, S12b, false],
  [1132, 1163, S12c, false],
  [1163, 1323, S13, false],
  [1323, 1530, S14, "dissolve"],
  [1530, 1700, S15, "dissolve"],
  [1700, 1785, S16, false],
  [1785, TIMING.totalFrames, S17, false],
];

const PIANO_DAY = 172;
const PIANO_NIGHT = 1536;
const SFX: Sfx[] = [
  { at: 0, src: sfx("wind"), volume: 0.4, until: 150 },
  { at: 222, src: sfx("wind"), volume: 0.4, until: 345 },
  { at: 399, src: sfx("wind"), volume: 0.35, until: 985 },
  { at: 1090, src: sfx("wind"), volume: 0.5, until: TIMING.totalFrames },
  { at: 150, src: sfx("door"), volume: 0.12, space: "room" },
  { at: 700, src: sfx("creak"), volume: 0.25, until: 745 },
  { at: 1132, src: sfx("riser"), volume: 0.3 },
  ...foleyCues("gunshot-echo", [1700 + SHOT1], 0.85),
  ...foleyCues("gunshot", [1700 + SHOT2], 0.75),
  { at: 1700 + 28, src: sfx("clink"), volume: 0.35, space: "outdoor" },
  ...foleyCues("thud", [1700 + 31], 0.6, { space: "outdoor" }),
  { at: 1770, src: sfx("door"), volume: 0.25, space: "outdoor" },
];
const MUSIC: MusicCue[] = [
  { src: "videos/olcu/piano_day.wav", from: PIANO_DAY, to: PIANO_DAY + Math.round(29.82 * 30), volume: 0.55, loop: false, fade: false },
  { src: MUSIC_FILES.tension, from: 1163, to: 1323, volume: 0.18 },
  { src: MUSIC_FILES.mystery, from: 1323, to: 1530, volume: 0.16 },
  { src: "videos/olcu/piano_night.wav", from: PIANO_NIGHT, to: PIANO_NIGHT + Math.round(5.3 * 30), volume: 0.5, loop: false, fade: false },
];

export const Scene: React.FC = () => <Video slug={SLUG} timing={TIMING} shots={SHOTS} sfx={SFX} music={MUSIC} post steady />;

export { STREET };
