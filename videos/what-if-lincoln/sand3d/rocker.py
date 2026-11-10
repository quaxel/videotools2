# Lincoln's rocking chair in the State Box at Ford's Theatre: a walnut rocker upholstered in red, with a tall
# buttoned back, padded arms on scrolled supports and long curved rockers. Cartoon scale next to 1.3 m puppets:
# seat top at z = 0.36, back top at about z = 1.0. Metres, Z up, ground at z = 0, centred, front toward -Y.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-lincoln/sand3d/rocker.py public/videos/what-if-lincoln/models/rocker.glb
# Joints: none (the scene rocks the whole model about the rockers' contact point).
import math
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

WALNUT, RED, RED2, GOLD = "#4e2c18", "#b0262e", "#8a1a22", "#d8a848"
SEAT_Z = 0.36


def rocker_curve(x, n=13):
    # a long arc touching the floor under the seat, lifting at both tips (more at the back)
    pts = []
    for i in range(n):
        y = -0.36 + 0.82 * i / (n - 1)
        z = 0.025 + 0.32 * (y - 0.02) ** 2
        pts.append((x, y, z))
    return pts


def chair():
    frame = []
    for tag, x in (("L", -0.23), ("R", 0.23)):
        frame.append(s3d.wire(f"Rocker_{tag}", rocker_curve(x), 0.045))
        # legs: rocker to seat frame
        frame.append(s3d.wire(f"LegF_{tag}", [(x, -0.2, 0.04), (x * 0.97, -0.19, SEAT_Z - 0.06)], 0.04))
        frame.append(s3d.wire(f"LegB_{tag}", [(x, 0.18, 0.045), (x * 0.97, 0.17, SEAT_Z - 0.06)], 0.04))
        # back posts, raked
        frame.append(s3d.wire(f"Post_{tag}", [(x * 0.95, 0.19, SEAT_Z - 0.06), (x * 0.9, 0.29, 0.72), (x * 0.82, 0.34, 0.98)], 0.042, fillet=0.03))
        # arm: support from the front leg, then the arm rail back to the post, with a scroll at the front
        frame.append(s3d.wire(f"ArmPost_{tag}", [(x * 1.02, -0.17, SEAT_Z - 0.04), (x * 1.06, -0.2, 0.52), (x * 1.06, -0.24, 0.56)], 0.035, fillet=0.03))
        frame.append(s3d.wire(f"ArmRail_{tag}", [(x * 1.06, -0.26, 0.57), (x * 1.04, 0.0, 0.6), (x * 0.94, 0.25, 0.62)], 0.05, fillet=0.05))
        frame.append(s3d.at(s3d.sphere(f"Scroll_{tag}", 0.07), x=x * 1.06, y=-0.27, z=0.535))
    # crest rail: an arched carved top
    crest = [(0.21 * math.sin(t), 0.34 + 0.01 * math.cos(t), 0.97 + 0.07 * math.cos(t)) for t in [i / 10 * math.pi - math.pi / 2 for i in range(11)]]
    frame.append(s3d.wire("Crest", crest, 0.06))
    frame.append(s3d.wire("FrontRail", [(-0.22, -0.2, SEAT_Z - 0.06), (0.22, -0.2, SEAT_Z - 0.06)], 0.04))
    s3d.material(frame, "walnut", color=WALNUT)

    # upholstery: a fat seat cushion and a tall back pad leaning back
    seat = s3d.at(s3d.extrude("Seat", s3d.superellipse(0.46, 0.44, n=3.2, taper=-0.06), 0.09), y=-0.01, z=SEAT_Z - 0.08)
    s3d.soften(seat, 0.035)
    s3d.material(seat, "velvet", color=RED)
    pad = s3d.at(s3d.extrude("BackPad", s3d.superellipse(0.38, 0.06, n=3.5), 0.56), y=0.0, z=0.0)
    s3d.soften(pad, 0.025)
    pad = s3d.at(pad, y=0.27, z=SEAT_Z + 0.04, rx=-11)
    s3d.material(pad, "velvet", color=RED)
    # buttons on the back pad (tufting), set on its front face
    buttons = []
    for i, (bx, bz) in enumerate(((-0.1, 0.62), (0.1, 0.62), (0.0, 0.72), (-0.1, 0.82), (0.1, 0.82), (0.0, 0.52))):
        lean = (bz - SEAT_Z - 0.04) * math.tan(math.radians(11))
        buttons.append(s3d.at(s3d.sphere(f"Button_{i}", 0.03), x=bx, y=0.27 - 0.035 + lean, z=bz - 0.015))
    s3d.material(buttons, "velvet", color=RED2)
    # gilt nail-head trim along the seat front
    trim = s3d.wire("SeatTrim", [(-0.21, -0.225, SEAT_Z - 0.035), (0.21, -0.225, SEAT_Z - 0.035)], 0.018)
    s3d.material(trim, "brass", color=GOLD)
    return s3d.group("Rocker", *frame, seat, pad, *buttons, trim)


s3d.export(chair(), out)
