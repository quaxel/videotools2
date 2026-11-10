# Parker's chair: a plain 1860s wooden side chair (the kind set out in the dress circle passage at Ford's Theatre),
# at cartoon scale next to 1.3 m puppets: turned legs with rings, a saddle seat, two raked back posts with ball
# finials, a curved top rail and three spindles, and H-stretchers. Seat top at z = 0.36 (a puppet's seat height).
# Metres, Z up, ground at z = 0, centred, front toward -Y.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-lincoln/sand3d/chair.py public/videos/what-if-lincoln/models/chair.glb
# Joints: none.
import math
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

WOOD, DARK, SEAT = "#8a5532", "#5a3420", "#a2683c"
SEAT_Z = 0.36


def chair():
    parts = []
    # turned legs: a revolved profile with two rings and a tapered foot
    leg_prof = [(0, 0), (0.016, 0), (0.019, 0.04), (0.014, 0.09), (0.021, 0.12), (0.015, 0.15), (0.017, 0.25), (0.022, 0.28), (0.019, SEAT_Z - 0.04), (0, SEAT_Z - 0.04)]
    for tag, x, y in (("FL", -0.17, -0.15), ("FR", 0.17, -0.15), ("BL", -0.16, 0.14), ("BR", 0.16, 0.14)):
        leg = s3d.at(s3d.revolve(f"Leg_{tag}", leg_prof), x=x, y=y)
        parts.append(leg)
    # H-stretchers
    for tag, x in (("L", -0.165), ("R", 0.165)):
        parts.append(s3d.wire(f"Stretch_{tag}", [(x, -0.15, 0.13), (x, 0.14, 0.13)], 0.022))
    parts.append(s3d.wire("Stretch_M", [(-0.165, 0.0, 0.13), (0.165, 0.0, 0.13)], 0.02))
    s3d.material(parts, "oak", color=WOOD)

    # saddle seat: a rounded slab, slightly wider at the front
    seat = s3d.at(s3d.extrude("Seat", s3d.superellipse(0.44, 0.4, n=3.2, taper=-0.08), 0.045), z=SEAT_Z - 0.045)
    s3d.soften(seat, 0.015)
    s3d.material(seat, "oak", color=SEAT)

    # back: raked posts with ball finials, a curved top rail, three spindles
    back = []
    rake = 0.09
    top_z = 0.86
    for tag, x in (("L", -0.16), ("R", 0.16)):
        back.append(s3d.wire(f"Post_{tag}", [(x, 0.15, SEAT_Z - 0.02), (x, 0.15 + rake, top_z)], 0.032))
        back.append(s3d.at(s3d.sphere(f"Finial_{tag}", 0.05), x=x, y=0.15 + rake, z=top_z - 0.005))
    rail = [(0.17 * math.sin(t), 0.15 + rake - 0.035 * math.cos(t) + 0.035, top_z - 0.06) for t in [i / 8 * math.pi - math.pi / 2 for i in range(9)]]
    back.append(s3d.wire("TopRail", rail, 0.055))
    back.append(s3d.wire("MidRail", [(-0.16, 0.15 + rake * 0.55, 0.62), (0.16, 0.15 + rake * 0.55, 0.62)], 0.03))
    for i, x in enumerate((-0.07, 0.0, 0.07)):
        back.append(s3d.wire(f"Spindle_{i}", [(x, 0.15 + rake * 0.3, SEAT_Z), (x, 0.15 + rake * 0.95, top_z - 0.09)], 0.02))
    s3d.material(back, "walnut", color=DARK)
    return s3d.group("GuardChair", *parts, seat, *back)


s3d.export(chair(), out)
