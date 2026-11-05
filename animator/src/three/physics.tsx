import React from "react";
import * as THREE from "three";
import { squash } from "../engine/anim";
import { paintTexture } from "./surfaces";
import { InkBox, InkCylinder, toonRamp } from "./toon";

// Playback of a rigid-body simulation baked by scripts/physics.mjs (Rapier, offline). The render never simulates:
// a body's pose at frame f is a lookup in the baked track, so every frame renders on its own and in any order.

type Vec3 = [number, number, number];
type Quat = [number, number, number, number];

export type SimBody = { name: string; shape: "box" | "ball" | "cylinder"; size?: Vec3; radius?: number; height?: number; color?: string };
export type SimImpact = { frame: number; body: string; other: string; speed: number; at: Vec3 };
export type PhysicsSim = { fps: number; frames: number; bodies: SimBody[]; statics: SimBody[]; track: number[][]; impacts: SimImpact[] };

const INK = "#161212";

// Pose of body `name` at sim frame `f` (fractions blend neighbouring frames). Before 0 it waits at its start pose,
// past the end of the track it holds where it came to rest.
export const simPose = (sim: PhysicsSim, name: string, f: number): { position: Vec3; quaternion: Quat } => {
  const i = sim.bodies.findIndex((b) => b.name === name);
  if (i < 0) throw new Error(`no body ${name} in the simulation`);
  const last = sim.track.length - 1;
  const t = Math.min(last, Math.max(0, f));
  const a = sim.track[Math.floor(t)].slice(i * 7, i * 7 + 7);
  const b = sim.track[Math.min(last, Math.floor(t) + 1)].slice(i * 7, i * 7 + 7);
  const k = t - Math.floor(t);
  const sign = a[3] * b[3] + a[4] * b[4] + a[5] * b[5] + a[6] * b[6] < 0 ? -1 : 1; // the short way round
  const q = [3, 4, 5, 6].map((j) => a[j] + (b[j] * sign - a[j]) * k);
  const n = Math.hypot(...q);
  return { position: [0, 1, 2].map((j) => a[j] + (b[j] - a[j]) * k) as Vec3, quaternion: q.map((v) => v / n) as Quat };
};

// Hits of one body (or every body), each with the frame it lands on: the frames for its sound cue, squash and dust.
export const simImpacts = (sim: PhysicsSim, name?: string, minSpeed = 0) =>
  sim.impacts.filter((h) => (name === undefined || h.body === name) && h.speed >= minSpeed);

// Squash of the body's latest hard landing at frame f (spread into a scale), like `squash` for a hand-timed hit.
export const simSquash = (sim: PhysicsSim, name: string, f: number, amount = 0.2): Vec3 => {
  const hit = simImpacts(sim, name, 1.5).filter((h) => h.frame <= f).pop();
  return hit ? squash(f, hit.frame, Math.min(amount, hit.speed * 0.04)) : [1, 1, 1];
};

const Ball: React.FC<{ radius: number; color: string }> = ({ radius, color }) => (
  <group>
    <mesh castShadow receiveShadow>
      <sphereGeometry args={[radius, 32, 24]} />
      <meshToonMaterial color={color} gradientMap={toonRamp} map={paintTexture()} />
    </mesh>
    <mesh>
      <sphereGeometry args={[radius + 0.012, 32, 24]} />
      <meshBasicMaterial color={INK} side={THREE.BackSide} />
    </mesh>
  </group>
);

// The body's default look from its baked shape: an inked box, cylinder or ball in its colour, centred on the body.
export const SimShape: React.FC<{ body: SimBody }> = ({ body }) => {
  const color = body.color ?? "#c9a26b";
  if (body.shape === "box") return <InkBox size={body.size!} color={color} ink={Math.min(0.018, Math.min(...body.size!) * 0.06)} />;
  if (body.shape === "cylinder") return <InkCylinder radius={body.radius!} height={body.height!} color={color} ink={Math.min(0.015, body.radius! * 0.12)} />;
  return <Ball radius={body.radius!} color={color} />;
};

// Every body of a baked simulation at sim frame `frame` (pass `f - start` from the shot). `draw` swaps a body's
// default look for your own prop, built centred on the body's centre; `squashy` (default on) squashes each body on
// its hard landings. Statics are not drawn: they stand for set pieces the scene already has.
export const Simulation: React.FC<{
  sim: PhysicsSim;
  frame: number;
  draw?: (body: SimBody) => React.ReactNode;
  squashy?: boolean;
}> = ({ sim, frame, draw, squashy = true }) => (
  <group>
    {sim.bodies.map((body) => {
      const { position, quaternion } = simPose(sim, body.name, frame);
      return (
        <group key={body.name} position={position} quaternion={quaternion}>
          <group scale={squashy ? simSquash(sim, body.name, frame) : 1}>{draw?.(body) ?? <SimShape body={body} />}</group>
        </group>
      );
    })}
  </group>
);
