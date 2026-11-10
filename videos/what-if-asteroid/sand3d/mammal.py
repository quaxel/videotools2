# A small furry Cretaceous mammal, cartoon (shrew / rat-like): a round body, a pointed whiskered snout with a pink
# nose, big round ears, big eyes, four stubby legs and a long thin tail. Metres, Z up, ground at z = 0, the snout
# (front) toward -Y. About 0.32 m long (scale it up in the scene for close shots).
# Joints: head (look up/down about +X), jaw (0..30), tail (swish about +Z), ears (twitch about +X).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-asteroid/sand3d/mammal.py public/videos/what-if-asteroid/models/mammal.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

FUR, BELLY, EAR, PINK, WHITE, BLACK, DARK = "#a8744a", "#f0dcc0", "#e8a8a0", "#f08a9a", "#ffffff", "#141414", "#6a4628"


def mammal():
    body = s3d.body(
        "Body",
        [(-0.08, 0.06), (-0.04, 0.13), (0.02, 0.16), (0.08, 0.15), (0.12, 0.1), (0.14, 0.04)],
        [(-0.08, 0.13), (-0.04, 0.16), (0.02, 0.18), (0.08, 0.17), (0.12, 0.14), (0.14, 0.1)],
        [(-0.08, 0.06), (-0.04, 0.035), (0.02, 0.03), (0.08, 0.03), (0.12, 0.045), (0.14, 0.07)],
    )
    s3d.material(body, "fabric", color=FUR)
    belly = s3d.body(
        "Belly",
        [(-0.05, 0.08), (0.02, 0.12), (0.09, 0.1)],
        [(-0.05, 0.09), (0.02, 0.08), (0.09, 0.08)],
        [(-0.05, 0.05), (0.02, 0.028), (0.09, 0.035)],
    )
    s3d.material(belly, "fabric", color=BELLY)

    skull = s3d.body(
        "Skull",
        [(-0.2, 0.012), (-0.18, 0.04), (-0.14, 0.08), (-0.1, 0.11), (-0.06, 0.1)],
        [(-0.2, 0.125), (-0.18, 0.14), (-0.14, 0.17), (-0.1, 0.2), (-0.06, 0.2)],
        [(-0.2, 0.105), (-0.18, 0.1), (-0.14, 0.095), (-0.1, 0.1), (-0.06, 0.11)],
    )
    s3d.material(skull, "fabric", color=FUR)
    nose = s3d.at(s3d.sphere("Nose", 0.028), y=-0.205, z=0.108)
    s3d.material(nose, "plastic", color=PINK)
    parts = [skull, nose]
    for s, t in ((-1, "L"), (1, "R")):
        e = s3d.at(s3d.sphere(f"Eye_{t}", 0.042), x=s * 0.036, y=-0.13, z=0.155)
        p = s3d.at(s3d.sphere(f"Pupil_{t}", 0.028), x=s * 0.042, y=-0.145, z=0.162)
        s3d.material(e, "plastic", color=WHITE)
        s3d.material(p, "plastic", color=BLACK)
        ear = s3d.at(s3d.cylinder(f"Ear_{t}", 0.075, 0.012), x=s * 0.055, y=-0.08, z=0.2, rx=80, rz=s * 20)
        inner = s3d.at(s3d.cylinder(f"EarIn_{t}", 0.05, 0.012), x=s * 0.055, y=-0.093, z=0.2, rx=80, rz=s * 20)
        s3d.material(ear, "fabric", color=FUR)
        s3d.material(inner, "fabric", color=EAR)
        whiskers = [s3d.at(s3d.box(f"Whisker_{t}{k}", 0.07, 0.003, 0.003), x=s * 0.045, y=-0.18, z=0.11 + k * 0.012, rz=s * (12 - k * 20)) for k in range(2)]
        s3d.material(whiskers, "plastic", color=DARK)
        parts += [e, p, ear, inner, *whiskers]
    jaw = s3d.body(
        "Jaw",
        [(-0.19, 0.02), (-0.15, 0.05), (-0.1, 0.06)],
        [(-0.19, 0.1), (-0.15, 0.098), (-0.1, 0.1)],
        [(-0.19, 0.09), (-0.15, 0.08), (-0.1, 0.085)],
    )
    s3d.material(jaw, "fabric", color=BELLY)
    s3d.joint("jaw", jaw, s3d.local(skull, 0, -0.1, 0.098), kind="revolute", axis="+X", range=(0, 30))
    head = s3d.group("Head", *parts, jaw)
    s3d.joint("head", head, s3d.local(body, 0, -0.07, 0.12), kind="revolute", axis="+X", range=(-30, 40))

    tail = s3d.wire("Tail", [(0, 0.13, 0.08), (0, 0.2, 0.06), (0.03, 0.27, 0.05), (0.06, 0.33, 0.07)], 0.014)
    s3d.material(tail, "fabric", color=EAR)
    s3d.joint("tail", tail, s3d.local(body, 0, 0.13, 0.08), kind="revolute", axis="+Z", range=(-40, 40))

    feet = [s3d.at(s3d.sphere(f"Foot_{i}", 0.045), x=x, y=y, z=0.0) for i, (x, y) in enumerate(((-0.05, -0.04), (0.05, -0.04), (-0.055, 0.09), (0.055, 0.09)))]
    s3d.material(feet, "fabric", color=EAR)
    return s3d.assembly("mammal", body, belly, head, tail, *feet)


s3d.export(mammal(), out)
print("ok", out)
