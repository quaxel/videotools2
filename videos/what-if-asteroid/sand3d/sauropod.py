# A friendly cartoon long-neck plant eater: a round body on four pillar legs, a long neck rising forward to a small
# head with big eyes, a long tapering tail. Metres, Z up, ground at z = 0, the head (front) toward -Y.
# About 5 m long, 3.6 m tall. Joints: neck (raise/lower about +X at the shoulders), jaw (0..30), tail (wag about +Z).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-asteroid/sand3d/sauropod.py public/videos/what-if-asteroid/models/sauropod.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

BLUE, BELLY, SPOT, WHITE, BLACK, DARK = "#6aa0d0", "#e6eccf", "#4a7cb0", "#ffffff", "#141414", "#3a5c88"


def sauropod():
    body = s3d.body(
        "Body",
        [(-0.95, 0.5), (-0.7, 1.05), (-0.2, 1.3), (0.4, 1.25), (0.9, 0.95), (1.15, 0.6)],
        [(-0.95, 1.85), (-0.7, 2.1), (-0.2, 2.25), (0.4, 2.2), (0.9, 2.0), (1.15, 1.8)],
        [(-0.95, 1.35), (-0.7, 1.05), (-0.2, 0.9), (0.4, 0.92), (0.9, 1.1), (1.15, 1.35)],
    )
    s3d.material(body, "fabric", color=BLUE)
    belly = s3d.body(
        "Belly",
        [(-0.6, 0.6), (-0.2, 0.95), (0.4, 0.92), (0.8, 0.5)],
        [(-0.6, 1.3), (-0.2, 1.25), (0.4, 1.25), (0.8, 1.35)],
        [(-0.6, 1.08), (-0.2, 0.86), (0.4, 0.88), (0.8, 1.12)],
    )
    s3d.material(belly, "fabric", color=BELLY)
    spots = [s3d.at(s3d.sphere(f"Spot_{i}", d), x=x, y=y, z=z) for i, (x, y, z, d) in enumerate(((-0.25, -0.3, 2.12, 0.34), (0.3, 0.2, 2.12, 0.3), (0.05, 0.65, 1.98, 0.26), (-0.4, 0.4, 2.0, 0.22)))]
    s3d.material(spots, "fabric", color=SPOT)

    # the neck rises forward from the shoulders; the head and jaw ride on it
    neck = s3d.body(
        "Neck",
        [(-2.05, 0.3), (-1.7, 0.34), (-1.3, 0.42), (-0.9, 0.6), (-0.6, 0.8)],
        [(-2.05, 3.45), (-1.7, 3.2), (-1.3, 2.8), (-0.9, 2.35), (-0.6, 2.1)],
        [(-2.05, 3.1), (-1.7, 2.85), (-1.3, 2.4), (-0.9, 1.85), (-0.6, 1.4)],
    )
    s3d.material(neck, "fabric", color=BLUE)
    head = s3d.body(
        "Skull",
        [(-2.6, 0.26), (-2.45, 0.36), (-2.2, 0.42), (-1.95, 0.36)],
        [(-2.6, 3.42), (-2.45, 3.55), (-2.2, 3.62), (-1.95, 3.55)],
        [(-2.6, 3.32), (-2.45, 3.3), (-2.2, 3.3), (-1.95, 3.3)],
    )
    s3d.material(head, "fabric", color=BLUE)
    eyes = []
    for s, t in ((-1, "L"), (1, "R")):
        e = s3d.at(s3d.sphere(f"Eye_{t}", 0.15), x=s * 0.19, y=-2.22, z=3.45)
        p = s3d.at(s3d.sphere(f"Pupil_{t}", 0.08), x=s * 0.24, y=-2.27, z=3.48)
        s3d.material(e, "plastic", color=WHITE)
        s3d.material(p, "plastic", color=BLACK)
        eyes += [e, p]
    jaw = s3d.body(
        "Jaw",
        [(-2.58, 0.22), (-2.35, 0.32), (-2.08, 0.3)],
        [(-2.58, 3.33), (-2.35, 3.34), (-2.08, 3.34)],
        [(-2.58, 3.24), (-2.35, 3.2), (-2.08, 3.24)],
    )
    s3d.material(jaw, "fabric", color=BELLY)
    s3d.joint("jaw", jaw, s3d.local(head, 0, -2.1, 3.32), kind="revolute", axis="+X", range=(0, 30))
    neckg = s3d.group("NeckG", neck, head, *eyes, jaw)
    s3d.joint("neck", neckg, s3d.local(body, 0, -0.75, 1.75), kind="revolute", axis="+X", range=(-45, 25))

    tail = s3d.body(
        "Tail",
        [(1.0, 0.7), (1.5, 0.5), (2.1, 0.3), (2.7, 0.14), (3.2, 0.03)],
        [(1.0, 1.95), (1.5, 1.7), (2.1, 1.35), (2.7, 1.0), (3.2, 0.8)],
        [(1.0, 1.3), (1.5, 1.25), (2.1, 1.0), (2.7, 0.8), (3.2, 0.74)],
    )
    s3d.material(tail, "fabric", color=BLUE)
    s3d.joint("tail", tail, s3d.local(body, 0, 1.0, 1.6), kind="revolute", axis="+Z", range=(-30, 30))

    legs = []
    for i, (x, y) in enumerate(((-0.45, -0.55), (0.45, -0.55), (-0.45, 0.6), (0.45, 0.6))):
        leg = s3d.at(s3d.cylinder(f"Leg_{i}", 0.42, 1.25), x=x, y=y, z=0.0)
        s3d.fillet(leg, 0.08, edges="bottom")
        toes = [s3d.at(s3d.sphere(f"Toe_{i}_{k}", 0.1), x=x + dx, y=y - 0.2, z=0.0) for k, dx in enumerate((-0.12, 0, 0.12))]
        s3d.material(leg, "fabric", color=BLUE)
        s3d.material(toes, "plastic", color=BELLY)
        legs += [leg, *toes]
    return s3d.assembly("sauropod", body, belly, *spots, neckg, tail, *legs)


s3d.export(sauropod(), out)
print("ok", out)
