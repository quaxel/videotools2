# Apollo lunar module (cartoon, at puppet scale ~0.72 of real): gold-foil octagonal descent stage on four splayed
# legs with round footpads, the faceted silver-and-black ascent stage on top, triangular windows, a front hatch,
# a porch and ladder on the front leg, RCS thruster quads, a rendezvous radar dish and a steerable antenna.
# Metres; Z up, ground z = 0, front (hatch, ladder) toward -Y (it faces +Z, the camera, in three).
import sys, math
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

GOLD = "#d4a23c"
GOLD2 = "#b8862a"
GOLD3 = "#e6bc58"
BLACK = "#26262a"
SILVER = "#b9bdc2"
GREY = "#8e9298"
WIN = "#1a2230"


def lm():
    parts = []
    # descent stage: an octagon, flats on the axes
    ds = s3d.at(s3d.extrude("Descent", s3d.polygon(8, 3.3), 1.2), z=1.05, rz=22.5)
    s3d.soften(ds, 0.05)
    s3d.material(ds, "fabric", color=GOLD)
    parts.append(ds)
    # foil panels in three golds and black bays on the four flats, so the crinkle reads
    flat = 3.3 / 2 * math.cos(math.pi / 8)
    for i, ang in enumerate(range(0, 360, 45)):
        a = math.radians(ang)
        x, y = math.sin(a) * (flat + 0.02), -math.cos(a) * (flat + 0.02)
        col = BLACK if ang % 90 == 0 else (GOLD2 if i % 2 else GOLD3)
        w = 0.9 if ang % 90 == 0 else 1.0
        p = s3d.at(s3d.box(f"Panel_{i}", w, 0.05, 0.7 if ang % 90 == 0 else 0.95), x=x, y=y, z=1.15 if ang % 90 == 0 else 1.17, rz=ang)
        s3d.material(p, "fabric", color=col)
        parts.append(p)
        # crinkle strips
        for k in range(3):
            st = s3d.at(s3d.box(f"Crinkle_{i}_{k}", 0.06, 0.06, 0.9), x=x + math.cos(a) * (k - 1) * 0.35, y=y + math.sin(a) * (k - 1) * 0.35, z=1.12, rz=ang + 8 * (k - 1))
            s3d.material(st, "fabric", color=GOLD2 if k != 1 else GOLD3)
            parts.append(st)
    # legs on the diagonals: primary strut from the upper corner out and down to a footpad, a secondary strut
    for i, ang in enumerate((45, 135, 225, 315)):
        a = math.radians(ang)
        ux, uy = math.cos(a), math.sin(a)
        top = (ux * 1.45, uy * 1.45, 2.1)
        foot = (ux * 2.9, uy * 2.9, 0.18)
        mid = (ux * 1.55, uy * 1.55, 1.1)
        leg = s3d.wire(f"Leg_{i}", [top, foot], 0.13)
        sec = s3d.wire(f"Strut_{i}", [mid, (ux * 2.45, uy * 2.45, 0.75)], 0.07)
        s3d.material([leg], "fabric", color=GOLD2)
        s3d.material([sec], "aluminium", color=GREY)
        pad = s3d.at(s3d.dome(f"Pad_{i}", 0.75, 0.2), x=foot[0], y=foot[1], z=0.0)
        s3d.material(pad, "aluminium", color=SILVER)
        parts += [leg, sec, pad]
    # porch and ladder on the front (-Y) leg pair: the ladder runs down the -Y face
    porch = s3d.at(s3d.box("Porch", 0.8, 0.5, 0.06), y=-1.75, z=2.2)
    s3d.material(porch, "aluminium", color=SILVER)
    rails = [s3d.wire(f"Rail_{s}", [(s * 0.32, -1.62, 2.2), (s * 0.32, -2.3, 0.35)], 0.05) for s in (-1, 1)]
    rungs = [s3d.wire(f"Rung_{k}", [(-0.32, -1.62 - (k + 0.5) / 8 * 0.68, 2.2 - (k + 0.5) / 8 * 1.85), (0.32, -1.62 - (k + 0.5) / 8 * 0.68, 2.2 - (k + 0.5) / 8 * 1.85)], 0.035) for k in range(8)]
    s3d.material(rails + rungs, "aluminium", color=SILVER)
    parts += [porch] + rails + rungs
    # ascent stage: a faceted cabin, front face toward -Y
    cab = s3d.at(s3d.box("Ascent", 2.5, 2.1, 1.5), z=2.3, y=0.1)
    s3d.chamfer(cab, 0.42)
    s3d.material(cab, "painted_metal", color=SILVER)
    parts.append(cab)
    back = s3d.at(s3d.box("AscentBack", 1.9, 0.9, 1.1), y=0.95, z=2.45)
    s3d.chamfer(back, 0.25)
    s3d.material(back, "painted_metal", color=BLACK)
    parts.append(back)
    side_tanks = [s3d.at(s3d.sphere(f"Tank_{s}", 0.75), x=s * 1.3, y=0.15, z=2.55) for s in (-1, 1)]
    s3d.material(side_tanks, "painted_metal", color=BLACK)
    parts += side_tanks
    top = s3d.at(s3d.box("AscentTop", 1.3, 1.1, 0.35), y=0.15, z=3.75)
    s3d.chamfer(top, 0.12)
    s3d.material(top, "painted_metal", color=GREY)
    parts.append(top)
    # front: two triangular windows and the square hatch
    for s in (-1, 1):
        w = s3d.at(s3d.extrude(f"Window_{'L' if s < 0 else 'R'}", s3d.poly([(0, 0), (0.42 * s, 0), (0.1 * s, 0.38)]), 0.05), x=0.12 * s, y=-0.96, z=3.25, rx=90)
        s3d.material(w, "glass", color=WIN)
        parts.append(w)
    hatch = s3d.at(s3d.box("Hatch", 0.6, 0.06, 0.6), y=-0.98, z=2.55)
    s3d.material(hatch, "painted_metal", color=GREY)
    parts.append(hatch)
    # RCS thruster quads on the four corners
    for i, (x, y) in enumerate(((-1.35, -0.85), (1.35, -0.85), (-1.35, 1.0), (1.35, 1.0))):
        q = s3d.at(s3d.box(f"RCS_{i}", 0.26, 0.26, 0.26), x=x, y=y, z=3.2)
        s3d.material(q, "painted_metal", color=GREY)
        cones = [s3d.at(s3d.cone(f"Nozzle_{i}_{k}", 0.12, 0.2, d2=0.06), x=x + dx, y=y, z=3.33 + dz, rx=rx) for k, (dx, dz, rx) in enumerate(((0, 0.13, 0), (0, -0.13, 180)))]
        s3d.material(cones, "aluminium", color=BLACK)
        parts += [q] + cones
    # rendezvous radar dish (front top) and the steerable S-band antenna on a mast (right)
    mast = s3d.wire("RadarMast", [(0, -0.4, 4.05), (0, -0.55, 4.35)], 0.06)
    dish = s3d.at(s3d.dome("RadarDish", 0.55, 0.14), x=0, y=-0.62, z=4.3, rx=-70)
    s3d.material([mast], "aluminium", color=GREY)
    s3d.material(dish, "painted_metal", color="#e8e8e4")
    mast2 = s3d.wire("SbandMast", [(0.9, 0.4, 3.9), (1.15, 0.5, 4.5)], 0.05)
    dish2 = s3d.at(s3d.dome("SbandDish", 0.6, 0.12), x=1.18, y=0.5, z=4.55, rx=-20, ry=35)
    s3d.material([mast2], "aluminium", color=GREY)
    s3d.material(dish2, "painted_metal", color="#e8e8e4")
    whips = [s3d.wire(f"Whip_{s}", [(s * 0.5, 0.6, 3.95), (s * 0.7, 0.75, 4.75)], 0.025) for s in (-1, 1)]
    s3d.material(whips, "aluminium", color=GREY)
    # descent engine bell under the stage
    bell = s3d.at(s3d.cone("Bell", 1.0, 0.45, d2=0.6), z=0.62)
    s3d.material(bell, "aluminium", color=GREY)
    parts += [mast, dish, mast2, dish2, bell] + whips
    return s3d.assembly("lm", *parts)


s3d.export(lm(), out)
print("ok", out)
