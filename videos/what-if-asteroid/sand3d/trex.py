# A friendly cartoon T. rex (no gore): big round head with large eyes, small blunt teeth, tiny arms, a thick tail.
# Metres, Z up, ground at z = 0, the snout (front) toward -Y. About 3.6 m long, 2.4 m tall.
# Joints: head (nod, about +X), jaw (open, 0..35), tail (wag, about +Z), leg_L / leg_R (stride, about +X),
# arm_L / arm_R (wave, about +X).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-asteroid/sand3d/trex.py public/videos/what-if-asteroid/models/trex.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

GREEN, BELLY, DARK, WHITE, BLACK, PINK, CLAW = "#5fae4e", "#d8e8a0", "#3f7e38", "#ffffff", "#141414", "#e07a7a", "#f2ead0"


def trex():
    # torso: a pear along Y, chest at the front (-Y), hips at the back
    torso = s3d.body(
        "Torso",
        [(-0.75, 0.3), (-0.55, 0.78), (-0.1, 0.98), (0.35, 0.92), (0.75, 0.6), (0.95, 0.4)],
        [(-0.75, 1.75), (-0.55, 1.92), (-0.1, 1.95), (0.35, 1.88), (0.75, 1.72), (0.95, 1.62)],
        [(-0.75, 1.42), (-0.55, 1.05), (-0.1, 0.92), (0.35, 0.98), (0.75, 1.2), (0.95, 1.32)],
    )
    belly = s3d.body(
        "Belly",
        [(-0.62, 0.3), (-0.45, 0.62), (-0.05, 0.72), (0.3, 0.6), (0.55, 0.3)],
        [(-0.62, 1.45), (-0.45, 1.4), (-0.05, 1.3), (0.3, 1.3), (0.55, 1.35)],
        [(-0.62, 1.3), (-0.45, 1.0), (-0.05, 0.88), (0.3, 0.95), (0.55, 1.15)],
    )
    s3d.material(torso, "fabric", color=GREEN)
    s3d.material(belly, "fabric", color=BELLY)

    # tail, wagging about +Z at the hips
    tail = s3d.body(
        "Tail",
        [(0.7, 0.62), (1.1, 0.48), (1.6, 0.3), (2.1, 0.16), (2.5, 0.03)],
        [(0.7, 1.78), (1.1, 1.66), (1.6, 1.46), (2.1, 1.28), (2.5, 1.18)],
        [(0.7, 1.22), (1.1, 1.26), (1.6, 1.2), (2.1, 1.12), (2.5, 1.12)],
    )
    s3d.material(tail, "fabric", color=GREEN)
    s3d.joint("tail", tail, s3d.local(torso, 0, 0.8, 1.5), kind="revolute", axis="+Z", range=(-30, 30))

    # neck + head (nods about +X at the top of the neck); the lower jaw hangs on the head
    neck = s3d.body(
        "Neck",
        [(-1.0, 0.5), (-0.8, 0.6), (-0.55, 0.66)],
        [(-1.0, 2.15), (-0.8, 2.05), (-0.55, 1.92)],
        [(-1.0, 1.7), (-0.8, 1.55), (-0.55, 1.4)],
    )
    s3d.material(neck, "fabric", color=GREEN)
    skull = s3d.body(
        "Skull",
        [(-1.75, 0.34), (-1.6, 0.46), (-1.35, 0.56), (-1.1, 0.66), (-0.9, 0.62), (-0.78, 0.45)],
        [(-1.75, 2.08), (-1.6, 2.2), (-1.35, 2.3), (-1.1, 2.42), (-0.9, 2.42), (-0.78, 2.3)],
        [(-1.75, 1.92), (-1.6, 1.9), (-1.35, 1.9), (-1.1, 1.9), (-0.9, 1.92), (-0.78, 2.0)],
    )
    s3d.material(skull, "fabric", color=GREEN)
    # big friendly eyes high on the sides, pupils looking forward
    eyes = []
    for s, tag in ((-1, "L"), (1, "R")):
        e = s3d.at(s3d.sphere(f"Eye_{tag}", 0.2), x=s * 0.26, y=-1.12, z=2.22)
        p = s3d.at(s3d.sphere(f"Pupil_{tag}", 0.11), x=s * 0.33, y=-1.18, z=2.28)
        brow = s3d.at(s3d.box(f"Brow_{tag}", 0.2, 0.14, 0.05), x=s * 0.24, y=-1.12, z=2.43)
        s3d.fillet(brow, 0.02)
        s3d.material(e, "plastic", color=WHITE)
        s3d.material(p, "plastic", color=BLACK)
        s3d.material(brow, "fabric", color=DARK)
        eyes += [e, p, brow]
    nostrils = [s3d.at(s3d.sphere(f"Nostril_{t}", 0.05), x=s * 0.09, y=-1.74, z=2.12) for s, t in ((-1, "L"), (1, "R"))]
    s3d.material(nostrils, "plastic", color=DARK)
    # small blunt upper teeth
    teeth = [s3d.at(s3d.cone(f"ToothU_{i}", 0.06, 0.07), x=x, y=y, z=1.95, rx=180) for i, (x, y) in enumerate(((-0.13, -1.66), (0.13, -1.66), (-0.22, -1.45), (0.22, -1.45)))]
    s3d.material(teeth, "plastic", color=CLAW)

    jaw = s3d.body(
        "Jaw",
        [(-1.7, 0.3), (-1.45, 0.48), (-1.15, 0.56), (-0.88, 0.5)],
        [(-1.7, 1.9), (-1.45, 1.92), (-1.15, 1.94), (-0.88, 1.98)],
        [(-1.7, 1.8), (-1.45, 1.74), (-1.15, 1.72), (-0.88, 1.8)],
    )
    s3d.material(jaw, "fabric", color=BELLY)
    tongue = s3d.at(s3d.box("Tongue", 0.26, 0.4, 0.04), y=-1.3, z=1.9)
    s3d.fillet(tongue, 0.015)
    s3d.material(tongue, "fabric", color=PINK)
    mouth = s3d.group("Mouth", jaw, tongue)
    s3d.joint("jaw", mouth, s3d.local(skull, 0, -0.9, 1.93), kind="revolute", axis="+X", range=(0, 40))

    head = s3d.group("Head", skull, *eyes, *nostrils, *teeth, mouth)
    s3d.joint("head", head, s3d.local(neck, 0, -0.85, 1.9), kind="revolute", axis="+X", range=(-25, 25))

    # legs: a big thigh, a shin and a three-toed foot, swinging about +X at the hip
    legs = []
    for s, tag in ((-1, "L"), (1, "R")):
        thigh = s3d.body(
            f"Thigh_{tag}",
            [(-0.3, 0.3), (-0.1, 0.42), (0.15, 0.42), (0.35, 0.28)],
            [(-0.3, 1.35), (-0.1, 1.5), (0.15, 1.5), (0.35, 1.38)],
            [(-0.3, 1.0), (-0.1, 0.72), (0.15, 0.72), (0.35, 1.0)],
        )
        s3d.transform(thigh, x=s * 0.44, y=0.15)
        shin = s3d.at(s3d.cylinder(f"Shin_{tag}", 0.2, 0.62), x=s * 0.46, y=0.22, z=0.1)
        foot = s3d.at(s3d.box(f"Foot_{tag}", 0.34, 0.5, 0.14), x=s * 0.46, y=0.05, z=0.0)
        s3d.fillet(foot, 0.06)
        toes = [s3d.at(s3d.cone(f"Toe_{tag}{i}", 0.08, 0.12), x=s * 0.46 + dx, y=-0.2, z=0.04, rx=90) for i, dx in enumerate((-0.11, 0.0, 0.11))]
        s3d.material([thigh, shin, foot], "fabric", color=GREEN)
        s3d.material(toes, "plastic", color=CLAW)
        g = s3d.group(f"Leg_{tag}", thigh, shin, foot, *toes)
        legs.append(s3d.joint(f"leg_{tag}", g, s3d.local(torso, s * 0.44, 0.15, 1.2), kind="revolute", axis="+X", range=(-30, 30)))

    # tiny arms
    arms = []
    for s, tag in ((-1, "L"), (1, "R")):
        up = s3d.at(s3d.cylinder(f"Arm_{tag}", 0.09, 0.3), x=s * 0.42, y=-0.62, z=1.12)
        hand = s3d.at(s3d.sphere(f"Hand_{tag}", 0.12), x=s * 0.42, y=-0.68, z=1.06)
        s3d.material([up, hand], "fabric", color=GREEN)
        g = s3d.group(f"ArmG_{tag}", up, hand)
        arms.append(s3d.joint(f"arm_{tag}", g, s3d.local(torso, s * 0.42, -0.6, 1.4), kind="revolute", axis="+X", range=(-80, 80)))

    # a row of soft back bumps
    bumps = [s3d.at(s3d.sphere(f"Bump_{i}", 0.16 - i * 0.015), y=-0.5 + i * 0.32, z=1.86 - i * 0.04) for i in range(4)]
    s3d.material(bumps, "fabric", color=DARK)
    return s3d.assembly("trex", torso, belly, *bumps, tail, neck, head, *legs, *arms)


s3d.export(trex(), out)
print("ok", out)
