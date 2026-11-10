// Baked rigid-body gags for "cabin-pressure" (scripts/physics.mjs; `pipeline.py physics cabin-pressure` writes
// src/videos/cabin-pressure/physics.json). Metres, the cabin's own frame (cabin.tsx): floor y = 0, aisle along -z.
//
// doorSeal: the over-wing exit's seal cracks (DoorSeal shot, local frame 22 = sim frame 0). Napkins, a paper cup, a
// peanut packet and peanuts on the galley trolley's top whip across the cabin to the split seal: a sustained pull
// (a decaying kick every frame toward the gap, plus a lift that cancels gravity) instead of one ballistic kick. The
// napkins and the packet are held against the door a moment longer, then everything slides and drops to the floor
// (the one napkin that stays stuck over the split is drawn by hand in cabinFxProps.tsx: HeroNapkin).
// The numbers below mirror cabinFxProps.tsx (DOOR, CRACK, TROLLEY); change them together. The exit sits forward of
// row 0, between the window passenger and the trolley, so the debris crosses the frame right to left.

const DOOR = { y: 0.74, z: 2.35 };
const ANG = 0.41166; // the wall's slope at the door centre: atan2(DOOR.y - CY, wallX(DOOR.y))
const N = [Math.cos(ANG), -Math.sin(ANG), 0]; // into the cabin
const U = [Math.sin(ANG), Math.cos(ANG), 0]; // up along the wall
const W = [-1.9247, DOOR.y, DOOR.z]; // wallX(0.74) = 1.9247 // the wall point at the door centre
const CRACK = [-1.799, 0.903, DOOR.z - 0.25]; // middle of the split, on the door's aft edge
const TROLLEY = { x: 0.1, z: 2.5, w: 0.3, h: 0.72, d: 0.52 };
const G = 9.81 / 30; // speed gravity takes per frame: the lift that cancels it

const rand = (i) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
const add = (a, b, k = 1) => a.map((v, i) => v + b[i] * k);
const norm = (a) => {
  const l = Math.hypot(...a);
  return a.map((v) => v / l);
};

const top = TROLLEY.h;
const bodies = [];
// a stack of napkins at the aisle end of the trolley top (a fourth, the hero napkin, is drawn by hand)
for (let i = 0; i < 3; i++)
  bodies.push({ name: `napkin${i}`, shape: "box", size: [0.12, 0.006, 0.12], position: [TROLLEY.x - 0.07 + i * 0.012, top + 0.004 + i * 0.0075, TROLLEY.z - 0.14 + i * 0.012], rotation: [0, i * 0.35, 0], mass: 0.004, friction: 0.9, restitution: 0.05, color: "#fbfaf4" });
bodies.push({ name: "cup", shape: "cylinder", radius: 0.034, height: 0.09, position: [TROLLEY.x + 0.06, top + 0.046, TROLLEY.z - 0.08], mass: 0.012, friction: 0.5, restitution: 0.15, color: "#ffffff" });
bodies.push({ name: "packet", shape: "box", size: [0.07, 0.014, 0.1], position: [TROLLEY.x + 0.02, top + 0.008, TROLLEY.z + 0.1], rotation: [0, 0.5, 0], mass: 0.006, friction: 0.7, restitution: 0.1, color: "#d8452f" });
// peanuts as little boxes (balls roll away down the whole aisle)
for (let i = 0; i < 10; i++)
  bodies.push({
    name: `peanut${i}`,
    shape: "box",
    size: [0.034, 0.018, 0.018],
    position: [TROLLEY.x - 0.06 + rand(i) * 0.12, top + 0.01 + (i % 3) * 0.02, TROLLEY.z + 0.04 + rand(i + 20) * 0.12],
    rotation: [0, rand(i + 7) * 3, 0],
    mass: 0.0015,
    friction: 0.7,
    restitution: 0.3,
    color: "#c99a5b",
  });

// Where each body is pulled: a spot along the split seam (it runs up the wall at the door's aft edge).
const aim = (i) => add(add(CRACK, U, (rand(i + 40) - 0.5) * 0.3), [0, 0, (rand(i + 60) - 0.5) * 0.06]);
// `pin`: once it has arrived, a level press toward the wall plus the lift, so it stays put (friction holds it; a body
// that bounced off comes straight back instead of climbing the leaning wall).
const pull = (b, i, { start, len, strength, pin = 0, pinUntil = 0 }) => {
  const dir = norm(add(aim(i), b.position, -1));
  const ev = [];
  for (let t = 0; t < len; t++) {
    const k = strength * Math.exp(-t / 8);
    ev.push({ frame: start + t, body: b.name, kick: [dir[0] * k, dir[1] * k + G, dir[2] * k] });
  }
  for (let f = start + len; f < pinUntil; f++) ev.push({ frame: f, body: b.name, kick: [-pin, G, 0] });
  return ev;
};

const events = bodies.flatMap((b, i) => {
  if (b.name.startsWith("napkin")) return pull(b, i, { start: 2 + i * 2, len: 14, strength: 0.72, pin: 0.1, pinUntil: 22 + i * 3 });
  if (b.name === "cup") return pull(b, i, { start: 5, len: 13, strength: 0.6 });
  if (b.name === "packet") return pull(b, i, { start: 4, len: 13, strength: 0.66, pin: 0.1, pinUntil: 30 });
  return pull(b, i, { start: 4 + (i % 5) * 2, len: 12, strength: 0.7 });
});

export default {
  doorSeal: {
    frames: 116,
    warmup: 12,
    floor: 0,
    statics: [
      { name: "trolley", shape: "box", size: [TROLLEY.w, TROLLEY.h, TROLLEY.d], position: [TROLLEY.x, TROLLEY.h / 2, TROLLEY.z] },
      // the door and the wall along it (flat, tangent at the door), its face 6 cm proud of the wall like the door slab
      { name: "door", shape: "box", size: [0.2, 1.8, 6], position: add(add(W, N, 0.06 - 0.1), [0, 0, -0.5]), rotation: [0, 0, -ANG] },
    ],
    bodies,
    events,
  },
};
