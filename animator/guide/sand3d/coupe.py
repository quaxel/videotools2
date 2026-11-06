# A small closed cartoon car, two-tone, sized for a seated puppet (PUPPET_HEIGHT 1.3 m: seated, its head centre is
# about 1.0 m up), drawn with `body` from its top and side views: a low bonnet, round wings, a raked windscreen, a
# cream roof. The window band is open right through the cabin, glazed inside, so a puppet card placed in the driver's
# seat shows through the glass; a dashboard, a steering wheel and two seats sit inside.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python guide/sand3d/coupe.py public/models/preview/coupe.glb
# Metres; front toward -Y. The driver sits on the car's left (+X), 0.3 m off centre, 0.15 m behind the middle.
# Joints spin_FL, spin_FR, spin_RL, spin_RR: continuous about +X, a positive angle rolls the car forward.
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")  # after empty_scene, which resets the unit to mm

R, AXLE, TRACK = 0.27, 0.92, 0.6  # wheel radius, axle distance from the middle, wheel distance from the centre line
FLOOR, BELT, ROOF = 0.14, 0.72, 1.3  # body floor, window line, roof
WIN = (BELT + 0.05, 1.17)  # window band: bottom, top
ORANGE, CREAM, CHROME, DARK = "#f28c28", "#f4ecd6", "#d9dde0", "#2b2b2e"


def wheel(body, tag, x, y, w=0.22):
    hub_c = s3d.local(body, x, y, R, ry=90)  # read on the body (drawn in place, its origin at z = 0)
    tyre = s3d.extrude(f"Tyre_{tag}", s3d.circle(2 * R), w, both=True, on=hub_c)
    s3d.soften(tyre, 0.05)
    rim = s3d.extrude(f"Rim_{tag}", s3d.circle(1.25 * R), w + 0.02, both=True, on=hub_c)
    s3d.hole(rim, R / 6, on=s3d.ring(5, R / 3.2, on=hub_c))
    cap = s3d.extrude(f"Cap_{tag}", s3d.circle(R / 3), w + 0.06, both=True, on=hub_c)
    s3d.material(tyre, "rubber", color="#1c1c1e")
    s3d.material(rim, "painted_metal", color=CREAM)
    s3d.material(cap, "chrome", color=CHROME)
    return s3d.joint(f"spin_{tag}", s3d.group(f"Wheel_{tag}", tyre, rim, cap), hub_c, kind="continuous", axis="normal")


def shell_parts():
    # The lower body: a low bonnet rising to the window line, a short tail; round in plan at both ends.
    body = s3d.body("Body",
                    plan=s3d.spline([(-1.48, 1.12), (-1.3, 1.36), (-0.9, 1.44), (0.9, 1.44), (1.3, 1.36), (1.48, 1.14)]),
                    top=s3d.spline([(-1.48, 0.5), (-1.25, 0.6), (-0.6, BELT - 0.02), (0.9, BELT), (1.3, 0.68), (1.48, 0.58)]),
                    bottom=FLOOR, n=3)
    arches = [s3d.extrude(f"Arch_{i}", s3d.circle(2 * R + 0.12), 2, both=True, on=s3d.Frame((0, y, R), normal=(1, 0, 0)))
              for i, y in enumerate((-AXLE, AXLE))]
    s3d.cut(body, *arches)
    s3d.material(body, "glossy_plastic", color=ORANGE)
    # A dark skirt between the wheels hides the seated driver's feet, which stand on the ground under the car.
    skirt = s3d.at(s3d.box("Skirt", 1.3, 2 * AXLE - 2 * R - 0.16, FLOOR + 0.04), z=0)
    s3d.material(skirt, "plastic", color=DARK)

    # The cabin: a raked windscreen up to a cream roof, a rounder back; it overlaps the body below the window line.
    cabin = s3d.body("Cabin",
                     plan=s3d.spline([(-0.62, 1.22), (-0.1, 1.28), (0.7, 1.26), (1.0, 1.14)]),
                     top=s3d.spline([(-0.62, BELT), (-0.3, 1.2), (0.0, ROOF), (0.6, ROOF), (0.95, 1.05), (1.0, BELT)]),
                     bottom=BELT - 0.1, n=3.4)
    # Glazing: the cabin's own shape, a little smaller (so it sits inside the pillars), cut to the window band.
    glass = s3d.intersect(s3d.scale(s3d.copy(cabin), 0.965), s3d.at(s3d.box("GlassSlab", 2, 3, WIN[1] - WIN[0]), z=WIN[0]))
    glass.name = "Glass_noink"  # no ink: a hull behind transparent glass shows through it as grey
    s3d.cut(cabin,
            s3d.at(s3d.box("CutSideFront", 2, 0.6, WIN[1] - WIN[0]), y=-0.22, z=WIN[0]),
            s3d.at(s3d.box("CutSideRear", 2, 0.46, WIN[1] - WIN[0]), y=0.5, z=WIN[0]),
            s3d.at(s3d.box("CutThrough", 1.0, 3, WIN[1] - WIN[0]), y=0.2, z=WIN[0]))
    s3d.material(cabin, "glossy_plastic", color=CREAM)
    s3d.material(glass, "glass", color="#cfeaf5", opacity=0.22)
    return body, skirt, cabin, glass


def details():
    parts = []

    def add(ob, kind, color):
        s3d.material(ob, kind, color=color)
        parts.append(ob)
        return ob

    front = lambda x, z: s3d.Frame((x, -1.43, z), normal=(0, -1, 0))
    for s, x in (("L", 0.46), ("R", -0.46)):
        add(s3d.at(s3d.cylinder(f"Headlamp_{s}", 0.2, 0.06), on=front(x, 0.47)), "light", "#fff2b0")
        add(s3d.at(s3d.torus(f"HeadlampRing_{s}", 0.21, 0.03), on=front(x, 0.47).offset(0.05)), "chrome", CHROME)
        add(s3d.at(s3d.box(f"Tail_{s}", 0.2, 0.08, 0.12), x=0.85 * x, y=1.47, z=0.44), "light", "#ff4a3d")
        sx = 1 if x > 0 else -1  # mirrors on the doors at the windscreen's foot, handles on the doors
        add(s3d.at(s3d.box(f"MirrorArm_{s}", 0.12, 0.03, 0.03), x=sx * 0.68, y=-0.5, z=BELT + 0.02), "plastic", DARK)
        mirror = add(s3d.at(s3d.box(f"Mirror_{s}", 0.1, 0.06, 0.08), x=sx * 0.77, y=-0.5, z=BELT), "glossy_plastic", ORANGE)
        s3d.soften(mirror, 0.02)
        add(s3d.at(s3d.box(f"DoorHandle_{s}", 0.03, 0.12, 0.03), x=sx * 0.68, y=0.3, z=0.6), "chrome", CHROME)
    grille = add(s3d.at(s3d.box("Grille", 0.5, 0.05, 0.16), y=-1.45, z=0.3), "plastic", DARK)
    s3d.soften(grille, 0.02)
    for i in range(3):
        add(s3d.at(s3d.box(f"GrilleBar_{i}", 0.48, 0.02, 0.016), y=-1.475, z=0.33 + i * 0.045), "chrome", CHROME)
    for n, y in (("F", -1.5), ("B", 1.5)):
        bumper = add(s3d.at(s3d.box(f"Bumper_{n}", 1.4, 0.1, 0.11), y=y, z=0.16), "chrome", CHROME)
        s3d.soften(bumper, 0.04)
        add(s3d.at(s3d.box(f"Plate_{n}", 0.36, 0.02, 0.1), y=y + (-0.06 if y < 0 else 0.06), z=0.2), "plastic", "#ffffff")
    add(s3d.at(s3d.cylinder("Exhaust", 0.06, 0.18), on=s3d.Frame((-0.4, 1.4, 0.12), normal=(0, 1, 0))), "chrome", CHROME)

    # Inside, seen through the glass: the dashboard, the steering wheel, two seats.
    dash = add(s3d.at(s3d.box("Dashboard", 1.1, 0.25, 0.12), y=-0.48, z=BELT - 0.06), "plastic", DARK)
    s3d.soften(dash, 0.03)
    add(s3d.at(s3d.torus("SteeringWheel", 0.3, 0.035), x=0.3, y=-0.3, z=0.72, rx=-65), "rubber", DARK)
    for s, x in (("L", 0.3), ("R", -0.3)):
        seat = add(s3d.at(s3d.box(f"SeatBack_{s}", 0.42, 0.1, 0.5), x=x, y=0.55, z=0.45, rx=-12), "fabric", "#8a3b2a")
        s3d.soften(seat, 0.04)
        rest = add(s3d.at(s3d.box(f"Headrest_{s}", 0.26, 0.08, 0.14), x=x, y=0.62, z=0.98), "fabric", "#8a3b2a")
        s3d.soften(rest, 0.03)
    return parts


def coupe():
    body, skirt, cabin, glass = shell_parts()
    parts = details()
    wheels = [wheel(body, t, x, y) for t, x, y in (("FL", TRACK, -AXLE), ("FR", -TRACK, -AXLE), ("RL", TRACK, AXLE), ("RR", -TRACK, AXLE))]
    return s3d.assembly("coupe", body, skirt, cabin, glass, *parts, *wheels)


s3d.export(coupe(), out)
print("ok", out)
