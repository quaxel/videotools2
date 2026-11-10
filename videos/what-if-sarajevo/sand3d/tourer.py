# A 1910s open touring car (the Sarajevo Gräf & Stift double phaeton) at cartoon scale next to 1.3 m puppets:
# deep green body, long hood with a brass radiator and brass lamps, a front bench (driver on the right) and a raised
# rear bench, the hood folded down behind the rear bench, curved black mudguards with running boards, wooden spoked
# wheels and a small black-and-yellow pennant on the left front wing. Metres, Z up, ground at z = 0, front toward -Y.
# Joints: spin_FL, spin_FR, spin_RL, spin_RR (continuous, about the axle).
# Seats (for puppets): front bench top z = 0.62 at y = -0.12, rear bench top z = 0.84 at y = 0.82; x = +-0.27.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-sarajevo/sand3d/tourer.py public/videos/what-if-sarajevo/models/tourer.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

GREEN, DARKGREEN, BRASS, BLACK, LEATHER, WOOD, TAN = "#2c5a3a", "#1d3d28", "#e0b048", "#1a1816", "#7a3a24", "#c8955a", "#4a3a2a"
FLOOR = 0.40  # chassis floor height
R = 0.38  # wheel radius


def wheel(chassis, tag, x, y, spokes=10):
    hub_c = s3d.local(chassis, x, y, R - FLOOR, ry=90)
    tyre = s3d.at(s3d.tube(f"Tyre_{tag}", 2 * R, 2 * R - 0.1, 0.11), on=hub_c.offset(-0.055))
    felloe = s3d.at(s3d.tube(f"Felloe_{tag}", 2 * R - 0.1, 2 * R - 0.16, 0.08), on=hub_c.offset(-0.04))
    hub = s3d.at(s3d.cylinder(f"Hub_{tag}", 0.14, 0.14), on=hub_c.offset(-0.07))
    spk = [s3d.at(s3d.box(f"Spoke_{tag}_{i}", 0.035, R - 0.1, 0.035), on=hub_c.turn(rz=i * 360 / spokes).move(y=(R - 0.1) / 2, z=-0.017)) for i in range(spokes)]
    s3d.material(tyre, "rubber", color="#141414")
    s3d.material([felloe, *spk], "oak", color=WOOD)
    s3d.material(hub, "brass", color=BRASS)
    g = s3d.group(f"Wheel_{tag}", tyre, felloe, hub, *spk)
    return s3d.joint(f"spin_{tag}", g, hub_c, kind="continuous", axis="normal")


def tourer():
    chassis = s3d.at(s3d.box("Chassis", 0.9, 3.0, 0.08), y=-0.05, z=FLOOR)
    s3d.material(chassis, "painted_metal", color=BLACK)

    # long hood: a rounded box from the radiator back to the dash
    hood = s3d.at(s3d.box("Hood", 0.78, 1.0, 0.42), y=-1.02, z=0.46)
    s3d.fillet(hood, 0.1)
    s3d.material(hood, "glossy_plastic", color=GREEN)
    radiator = s3d.at(s3d.box("Radiator", 0.84, 0.1, 0.56), y=-1.56, z=0.4)
    s3d.fillet(radiator, 0.04)
    s3d.material(radiator, "brass", color=BRASS)
    grille = s3d.at(s3d.box("Grille", 0.66, 0.03, 0.42), y=-1.62, z=0.47)
    s3d.material(grille, "painted_metal", color="#3a2e1e")
    cap = s3d.at(s3d.cylinder("RadCap", 0.08, 0.07), y=-1.56, z=0.96)
    s3d.material(cap, "brass", color=BRASS)

    # brass headlamps on the front wings, glowing faces
    lamps, glass = [], []
    for s, x in (("L", -0.5), ("R", 0.5)):
        c = s3d.Frame((x, -1.58, 0.82), normal=(0, -1, 0))
        lamps.append(s3d.at(s3d.cylinder(f"Lamp_{s}", 0.22, 0.2), on=c.offset(-0.2)))
        glass.append(s3d.at(s3d.cylinder(f"LampGlass_{s}", 0.17, 0.02), on=c))
        lamps.append(s3d.at(s3d.box(f"LampPost_{s}", 0.05, 0.05, 0.22), x=x, y=-1.48, z=0.5))
    s3d.material(lamps, "brass", color=BRASS)
    s3d.material(glass, "light", color="#fff3c4")

    # the open body (tonneau): an open-topped shell from the dash to the back
    # walls of the tub (open top): two sides, the back, the floor
    sides = [s3d.at(s3d.box(f"Side_{s}", 0.07, 1.9, 0.56), x=sx * 0.585, y=0.43, z=FLOOR + 0.04) for s, sx in (("L", -1), ("R", 1))]
    rear = s3d.at(s3d.box("RearWall", 1.24, 0.1, 0.62), y=1.33, z=FLOOR + 0.04)
    floor = s3d.at(s3d.box("TubFloor", 1.1, 1.9, 0.06), y=0.43, z=FLOOR + 0.04)
    for p in (*sides, rear):
        s3d.fillet(p, 0.025)
    tub = [*sides, rear, floor]
    s3d.material(tub, "glossy_plastic", color=GREEN)
    belt = [s3d.at(s3d.box(f"Belt_{s}", 0.02, 1.7, 0.04), x=sx * 0.61, y=0.43, z=0.92) for s, sx in (("L", -1), ("R", 1))]
    s3d.material(belt, "brass", color=BRASS)
    dash = s3d.at(s3d.box("Dash", 1.14, 0.06, 0.5), y=-0.5, z=FLOOR + 0.06)
    s3d.material(dash, "walnut", color="#5a3a22")

    # low windscreen on a brass frame
    wsf = s3d.at(s3d.box("ScreenFrame", 1.1, 0.04, 0.05), y=-0.53, z=1.18)
    wsp = [s3d.at(s3d.box(f"ScreenPost_{s}", 0.04, 0.04, 0.3), x=sx * 0.55, y=-0.53, z=0.9) for s, sx in (("L", -1), ("R", 1))]
    s3d.material([wsf, *wsp], "brass", color=BRASS)
    ws = s3d.at(s3d.box("Screen_noink", 1.06, 0.015, 0.26), y=-0.53, z=0.92)
    s3d.material(ws, "glass", color="#cfe4ee", opacity=0.25)

    # benches: front (driver on the right: x < 0 is the car's right, as in three), raised rear
    fseat = s3d.at(s3d.box("FrontSeat", 1.04, 0.42, 0.14), y=-0.12, z=0.48)
    fback = s3d.at(s3d.box("FrontBack", 1.04, 0.1, 0.38), y=0.12, z=0.6)
    rseat = s3d.at(s3d.box("RearSeat", 1.08, 0.46, 0.28), y=0.8, z=0.56)
    rback = s3d.at(s3d.box("RearBack", 1.08, 0.12, 0.5), y=1.08, z=0.78)
    for p in (fseat, fback, rseat, rback):
        s3d.fillet(p, 0.04)
    s3d.material([fseat, fback, rseat, rback], "leather", color=LEATHER)

    # steering column and wheel on the right (x < 0)
    col = s3d.at(s3d.cylinder("Column", 0.04, 0.55), on=s3d.Frame((-0.27, -0.55, 0.5), normal=(0, 0.55, 0.84)))
    s3d.material(col, "painted_metal", color=BLACK)
    sw = s3d.at(s3d.torus("SteeringWheel", 0.32, 0.035), on=s3d.Frame((-0.27, -0.27, 0.95), normal=(0, 0.55, 0.84)))
    s3d.material(sw, "walnut", color="#3a2414")

    # the hood (soft top) folded down behind the rear bench
    top = s3d.at(s3d.box("FoldedTop", 1.18, 0.34, 0.24), y=1.32, z=1.0)
    s3d.fillet(top, 0.1)
    s3d.material(top, "fabric", color=TAN)

    # mudguards: quarter-round wings over each wheel, joined by running boards
    guards = []
    for s, sx in (("L", -1), ("R", 1)):
        for e, yc in (("F", -1.05), ("R", 0.95)):
            c = s3d.Frame((sx * 0.66, yc, R), normal=(1, 0, 0))
            g = s3d.at(s3d.tube(f"Wing_{s}{e}", 2 * R + 0.14, 2 * R + 0.06, 0.18), on=c.offset(-0.09))
            g = s3d.split(g, s3d.Frame((0, 0, R + 0.02)), keep="above")
            guards.append(g)
        guards.append(s3d.at(s3d.box(f"Board_{s}", 0.22, 1.1, 0.04), x=sx * 0.66, y=-0.05, z=0.36))
    s3d.material(guards, "painted_metal", color=BLACK)

    # a little Habsburg pennant on the left front wing
    staff = s3d.at(s3d.cylinder("FlagStaff", 0.02, 0.42), x=-0.62, y=-1.35, z=0.74)
    s3d.material(staff, "brass", color=BRASS)
    fy = s3d.at(s3d.box("Pennant_Y", 0.01, 0.2, 0.07), x=-0.62, y=-1.23, z=1.06)
    fb = s3d.at(s3d.box("Pennant_B", 0.01, 0.2, 0.07), x=-0.62, y=-1.23, z=0.99)
    s3d.material(fy, "plastic", color="#f0c020")
    s3d.material(fb, "plastic", color="#141414")

    wheels = [wheel(chassis, t, x, y) for t, x, y in (("FL", -0.66, -1.05), ("FR", 0.66, -1.05), ("RL", -0.66, 0.95), ("RR", 0.66, 0.95))]
    return s3d.assembly(
        "tourer", chassis, hood, radiator, grille, cap, *lamps, *glass, *tub, *belt, dash, wsf, *wsp, ws,
        fseat, fback, rseat, rback, col, sw, top, *guards, staff, fy, fb, *wheels,
    )


s3d.export(tourer(), out)
print("ok", out)
