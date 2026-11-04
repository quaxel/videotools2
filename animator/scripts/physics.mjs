// Bakes a rigid-body simulation (Rapier) into a frame table a scene plays back: falling, toppling, bouncing props
// that look physical without hand keyframes. The render never runs physics: every frame is a lookup, so any frame
// renders on its own (Remotion renders frames out of order, in parallel).
//   node scripts/physics.mjs <spec.mjs> [out.json]        default out: the spec's path with .json
// `pipeline.py physics <slug>` bakes videos/<slug>/physics.mjs into src/videos/<slug>/physics.json.
//
// The spec is a module whose default export is one simulation, or an object of named simulations:
//   {
//     frames: 90,            recorded length at 30 fps (sim-local frame 0 = the scene's chosen start)
//     gravity: -9.81,        m/s² along y
//     floor: 0,              y of an endless ground (null: none)
//     warmup: 20,            frames run before frame 0 and not recorded, so a stack settles before it is shown
//     statics: [{ name, shape, size | radius, height, position, rotation? }],   fixed colliders (a table, a ramp)
//     bodies: [{ name, shape, size | radius, height, position, rotation?, mass?, friction?, restitution?,
//                velocity?, spin?, color? }],
//     events: [{ frame, body, kick | impulse: [x, y, z], at?: [x, y, z], spin?: [x, y, z] }],   a push at that frame
//   }
// Shapes: "box" (size = full [w, h, d] like InkBox), "ball" (radius), "cylinder" (radius, height, upright along y).
// position / at in metres, rotation as Euler XYZ radians (three's default), velocity and kick in m/s (kick = the
// change of speed it gives the body, whatever its mass; impulse = the same in N·s), spin in rad/s; `at` applies the
// push at that world point, so it tips the body over instead of sliding it. Defaults: mass from wood's density
// (500 kg/m³ × volume: a 0.42 × 0.32 × 0.36 crate ≈ 24 kg), friction 0.6, restitution 0.2. Mass only matters
// between bodies: a heavy chest knocks light cans aside, cans barely move a chest.
//
// Output per simulation: { fps, frames, bodies: [{ name, shape, size | radius, height, color }], statics,
// track: [[x, y, z, qx, qy, qz, qw, ... per body] per frame], impacts: [{ frame, body, other, speed, at }] }.
// The track stops early once every body sleeps (playback holds the last frame). `impacts` lists each contact that
// starts with a closing speed ≥ 0.6 m/s (at most one per body every 4 frames): the frames for thud / plop cues,
// squash and dust on landing.
import RAPIER from "@dimforge/rapier3d-compat";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const FPS = 30;
const SUBSTEPS = 4; // 120 Hz: stacks stay quiet, fast props do not tunnel through thin statics
const MIN_SPEED = 0.6;
const MIN_GAP = 4;

const [specPath, outArg] = process.argv.slice(2);
if (!specPath) {
  console.error("usage: node scripts/physics.mjs <spec.mjs> [out.json]");
  process.exit(2);
}
const out = outArg ?? specPath.replace(/\.m?js$/, "") + ".json";

await RAPIER.init();

const quat = ([x, y, z] = [0, 0, 0]) => {
  // Euler XYZ -> quaternion, as THREE.Quaternion.setFromEuler does for order "XYZ".
  const [c1, c2, c3] = [Math.cos(x / 2), Math.cos(y / 2), Math.cos(z / 2)];
  const [s1, s2, s3] = [Math.sin(x / 2), Math.sin(y / 2), Math.sin(z / 2)];
  return { x: s1 * c2 * c3 + c1 * s2 * s3, y: c1 * s2 * c3 - s1 * c2 * s3, z: c1 * c2 * s3 + s1 * s2 * c3, w: c1 * c2 * c3 - s1 * s2 * s3 };
};
const vec = ([x, y, z]) => ({ x, y, z });

const collider = (b) => {
  if (b.shape === "box") return RAPIER.ColliderDesc.cuboid(b.size[0] / 2, b.size[1] / 2, b.size[2] / 2);
  if (b.shape === "ball") return RAPIER.ColliderDesc.ball(b.radius);
  if (b.shape === "cylinder") return RAPIER.ColliderDesc.cylinder(b.height / 2, b.radius);
  throw new Error(`${b.name}: unknown shape ${b.shape}`);
};
const volume = (b) =>
  b.shape === "box" ? b.size[0] * b.size[1] * b.size[2] : b.shape === "ball" ? (4 / 3) * Math.PI * b.radius ** 3 : Math.PI * b.radius ** 2 * b.height;
const describe = (b) => ({ name: b.name, shape: b.shape, ...(b.size ? { size: b.size } : {}), ...(b.radius ? { radius: b.radius } : {}), ...(b.height ? { height: b.height } : {}), ...(b.color ? { color: b.color } : {}) });
const round = (v) => Math.round(v * 1e4) / 1e4;

const bake = (name, spec) => {
  const world = new RAPIER.World({ x: 0, y: spec.gravity ?? -9.81, z: 0 });
  world.timestep = 1 / FPS / SUBSTEPS;
  const owner = new Map(); // collider handle -> name
  if (spec.floor !== null) {
    const floor = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, (spec.floor ?? 0) - 0.5, 0));
    owner.set(world.createCollider(RAPIER.ColliderDesc.cuboid(50, 0.5, 50).setFriction(0.8), floor).handle, "floor");
  }
  for (const s of spec.statics ?? []) {
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(...s.position).setRotation(quat(s.rotation)));
    owner.set(world.createCollider(collider(s).setFriction(s.friction ?? 0.6).setRestitution(s.restitution ?? 0.2), body).handle, s.name);
  }
  const bodies = (spec.bodies ?? []).map((b) => {
    const desc = RAPIER.RigidBodyDesc.dynamic().setTranslation(...b.position).setRotation(quat(b.rotation)).setCcdEnabled(true);
    if (b.velocity) desc.setLinvel(...b.velocity);
    if (b.spin) desc.setAngvel(vec(b.spin));
    const body = world.createRigidBody(desc);
    const c = world.createCollider(
      collider(b)
        .setMass(b.mass ?? volume(b) * 500)
        .setFriction(b.friction ?? 0.6)
        .setRestitution(b.restitution ?? 0.2)
        .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
      body,
    );
    owner.set(c.handle, b.name);
    return { spec: b, body };
  });
  const byName = new Map(bodies.map((b) => [b.spec.name, b.body]));
  for (const e of spec.events ?? []) {
    if (!byName.has(e.body)) throw new Error(`${name}: event on unknown body ${e.body}`);
    if (!e.kick === !e.impulse) throw new Error(`${name}: event on ${e.body} needs one of kick or impulse`);
  }

  const queue = new RAPIER.EventQueue(true);
  const frames = spec.frames ?? 90;
  const track = [];
  const impacts = [];
  const lastHit = new Map();
  const velocity = (who) => (byName.has(who) ? byName.get(who).linvel() : { x: 0, y: 0, z: 0 });

  for (let f = -(spec.warmup ?? 0); f < frames; f++) {
    if (f >= 0) {
      track.push(bodies.flatMap(({ body }) => {
        const p = body.translation();
        const q = body.rotation();
        return [p.x, p.y, p.z, q.x, q.y, q.z, q.w].map(round);
      }));
      // Everything asleep and no kick to come: the rest of the track would repeat this frame.
      if (bodies.every(({ body }) => body.isSleeping()) && !(spec.events ?? []).some((e) => e.frame >= f)) break;
    }
    for (const e of spec.events ?? []) {
      if (e.frame !== f) continue;
      const body = byName.get(e.body);
      const impulse = vec(e.impulse ?? e.kick.map((v) => v * body.mass()));
      if (e.at) body.applyImpulseAtPoint(impulse, vec(e.at), true);
      else body.applyImpulse(impulse, true);
      if (e.spin) body.applyTorqueImpulse(vec(e.spin), true);
    }
    for (let s = 0; s < SUBSTEPS; s++) {
      // Closing speed comes from the velocities before the step that makes the contact.
      const before = new Map(bodies.map(({ spec: b }) => [b.name, { ...velocity(b.name) }]));
      world.step(queue);
      queue.drainCollisionEvents((h1, h2, started) => {
        if (!started || f < 0) return;
        const [a, b] = [owner.get(h1), owner.get(h2)];
        const va = before.get(a) ?? { x: 0, y: 0, z: 0 };
        const vb = before.get(b) ?? { x: 0, y: 0, z: 0 };
        const speed = Math.hypot(va.x - vb.x, va.y - vb.y, va.z - vb.z);
        if (speed < MIN_SPEED) return;
        // Credit the hit to the faster mover (the one that lands), the other is what it hit.
        const [body, other] = Math.hypot(va.x, va.y, va.z) >= Math.hypot(vb.x, vb.y, vb.z) ? [a, b] : [b, a];
        if (!byName.has(body) || f - (lastHit.get(body) ?? -99) < MIN_GAP) return;
        lastHit.set(body, f);
        const p = byName.get(body).translation();
        impacts.push({ frame: f, body, other, speed: round(speed), at: [p.x, p.y, p.z].map(round) });
      });
    }
  }
  world.free();
  console.log(`${name}: ${bodies.length} bodies, ${track.length}/${frames} frames, ${impacts.length} impacts`);
  return { fps: FPS, frames, bodies: bodies.map(({ spec: b }) => describe(b)), statics: (spec.statics ?? []).map(describe), track, impacts };
};

const spec = (await import(pathToFileURL(path.resolve(specPath)).href)).default;
const single = Array.isArray(spec.bodies);
const result = single ? bake(path.basename(specPath), spec) : Object.fromEntries(Object.entries(spec).map(([k, v]) => [k, bake(k, v)]));
fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
fs.writeFileSync(out, JSON.stringify(result) + "\n");
console.log(`wrote ${out}`);
