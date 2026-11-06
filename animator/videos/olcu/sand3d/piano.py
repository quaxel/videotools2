# The saloon's upright piano, cartoon proportions next to a 1.3 m puppet. Metres, Z up, floor at z = 0, the
# keyboard toward -Y (the camera). Joint `lid`: the key cover (fallboard), hinged at the back of the keys;
# 0 = open (standing up against the front), -100 = slammed shut over the keys.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python videos/olcu/sand3d/piano.py public/videos/olcu/models/piano.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

W, D, H = 1.25, 0.46, 1.05
WOOD, DARK = "#6a3420", "#3e1c10"


def piano():
    case = s3d.at(s3d.box("Case", W, D, H), z=0)
    s3d.fillet(case, 0.02)
    top = s3d.at(s3d.box("Top", W + 0.06, D + 0.06, 0.05), z=H)
    s3d.fillet(top, 0.015)
    # the front panel above the keys, a raised frame
    panel = s3d.at(s3d.box("Panel", W - 0.2, 0.03, 0.34), y=-D / 2 - 0.01, z=0.62)
    s3d.fillet(panel, 0.01)
    stand = s3d.at(s3d.box("Stand", 0.5, 0.04, 0.12), y=-D / 2 - 0.04, z=0.7)
    s3d.material([case, top], "walnut", color=WOOD)
    s3d.material([panel, stand], "walnut", color=DARK)
    # the key bed sticks out in front, on two scrolled legs (cheek blocks)
    bed = s3d.at(s3d.box("KeyBed", W - 0.04, 0.24, 0.06), y=-D / 2 - 0.12, z=0.47)
    s3d.material(bed, "walnut", color=WOOD)
    whites = s3d.at(s3d.box("WhiteKeys", W - 0.16, 0.16, 0.025), y=-D / 2 - 0.1, z=0.53)
    s3d.material(whites, "ceramic", color="#f4ecd6")
    blacks = []
    n = 0
    for i in range(36):
        if i % 7 in (2, 6):
            continue
        x = -W / 2 + 0.11 + i * ((W - 0.22) / 36) + 0.012
        blacks.append(s3d.at(s3d.box(f"Black_{n}", 0.014, 0.09, 0.02), x=x, y=-D / 2 - 0.07, z=0.555))
        n += 1
    s3d.material(blacks, "plastic", color="#141414")
    legs = [s3d.at(s3d.box(f"Leg_{s}", 0.07, 0.07, 0.47), x=s * (W / 2 - 0.06), y=-D / 2 - 0.2) for s in ("L", "R") for s in [(-1 if s == "L" else 1)]]
    s3d.material(legs, "walnut", color=DARK)
    candles = [s3d.at(s3d.cylinder(f"Candle_{i}", 0.04, 0.12), x=x, y=-D / 2 - 0.02, z=0.96) for i, x in enumerate((-0.45, 0.45))]
    s3d.material(candles, "ceramic", color="#f2e6c0")
    flames = [s3d.at(s3d.sphere(f"Flame_{i}", 0.035), x=x, y=-D / 2 - 0.02, z=1.08) for i, x in enumerate((-0.45, 0.45))]
    s3d.material(flames, "light", color="#ffcc55")
    # the key cover: hinged on the back edge of the keys; at rest it stands open against the panel
    hinge = s3d.local(bed, 0, 0.1, 0.06, rx=0)
    cover = s3d.at(s3d.box("Cover", W - 0.14, 0.025, 0.17), on=hinge)
    s3d.at(cover, y=-D / 2 - 0.035, z=0.53)
    s3d.material(cover, "walnut", color=DARK)
    s3d.joint("lid", cover, hinge, kind="revolute", axis="+X", range=(-100, 0))
    return s3d.assembly("piano", case, top, panel, stand, bed, whites, *blacks, *legs, *candles, *flames, cover)


s3d.export(piano(), out)
print("ok", out)
