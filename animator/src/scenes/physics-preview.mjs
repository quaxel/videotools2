// Physics spec for PhysicsPreview (format: scripts/physics.mjs). Bake: node scripts/physics.mjs src/scenes/physics-preview.mjs
// A pyramid of crates with three tin cans on top; a heavy ball is thrown into it and knocks it down.
const CRATE = [0.42, 0.32, 0.36];
const row = (n, y, prefix) =>
  Array.from({ length: n }, (_, i) => ({
    name: `${prefix}${i}`,
    shape: "box",
    size: CRATE,
    position: [(i - (n - 1) / 2) * (CRATE[0] + 0.04), y, 0],
    color: "#c9a26b",
    mass: 12, // empty crates
  }));
const TOP = CRATE[1] * 3; // top face of the pyramid
const can = (name, x, y) => ({ name, shape: "cylinder", radius: 0.05, height: 0.12, position: [x, y, 0], mass: 0.3, restitution: 0.35, color: "#e0262f" });

export default {
  frames: 120,
  warmup: 20,
  bodies: [
    ...row(3, CRATE[1] / 2, "low"),
    ...row(2, CRATE[1] * 1.5, "mid"),
    ...row(1, CRATE[1] * 2.5, "top"),
    can("canL", -0.12, TOP + 0.06),
    can("canM", 0, TOP + 0.06),
    can("canR", 0.12, TOP + 0.06),
    { name: "ball", shape: "ball", radius: 0.16, position: [-2.6, 0.16, 0.05], mass: 60, color: "#2b2b38" },
  ],
  // Thrown from the floor in an arc into the middle row.
  events: [{ frame: 6, body: "ball", kick: [8, 2.4, 0] }],
};
