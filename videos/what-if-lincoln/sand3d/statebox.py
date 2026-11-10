# The State Box at Ford's Theatre, 14 April 1865 (guide/references/fords-theatre-1865.md): boxes 7 and 8 opened
# into one, high on the stage-left side of the house. Two bowed bays with a cream-and-gilt parapet and gilt rail,
# swags of red-white-blue bunting along the rail, a striped flag draped down each outer end, a blue regimental flag
# on a staff at the centre pillar (leaning toward the stage side, -x) over a gilt-framed portrait (Washington), fluted pillars, a red velvet valance and
# side curtains, and a dark interior with a back wall. Cartoon scale next to 1.3 m puppets.
# Metres, Z up; z = 0 is the box FLOOR (the parapet and apron hang below / rise above it), centred in x, the open
# front toward -Y. The bays' parapet faces bulge toward -Y; puppets sit behind it at about y = 0.15.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-lincoln/sand3d/statebox.py public/videos/what-if-lincoln/models/statebox.glb
# Joints: none.
import math
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

CREAM, GILT, RED, WHITE, BLUE, NAVY, DARK, VELVET, FRAME = "#efe2c4", "#d8a840", "#c0242c", "#f6f2e8", "#2a3f8e", "#1e2c6a", "#3a2418", "#8e1a26", "#b8862e"
BAY = 1.3  # width of one bay
PAR = 0.48  # parapet height above the box floor
R = 1.1  # bow radius


def bay_arc(cx, n=11, r=R, z=0.0):
    # points on the bowed front of a bay centred at x = cx; the bulge reaches y = -0.2 at the middle
    half = math.asin((BAY / 2 - 0.04) / r)
    pts = []
    for i in range(n):
        a = -half + 2 * half * i / (n - 1)
        pts.append((cx + r * math.sin(a), r - 0.2 - r * math.cos(a) + (R - r) * 0, z))
    return pts


def swag(cx, z_top, sag, dz, n=13):
    # a hanging swag across a bay, `dz` lower for the lower stripes
    half = BAY / 2 - 0.06
    pts = []
    for i in range(n):
        t = i / (n - 1)
        x = cx - half + 2 * half * t
        a = math.asin(max(-1, min(1, (x - cx) / R)))
        y = R - 0.2 - R * math.cos(a) - 0.04
        z = z_top - dz - sag * math.sin(math.pi * t)
        pts.append((x, y, z))
    return pts


def flag_hanging(name, x, y, z_top, w, h, rot):
    # a striped flag hanging down: 7 stripes and a blue canton with white stars, as thin slabs
    stripes = []
    sh = h / 7
    for i in range(7):
        st = s3d.at(s3d.box(f"{name}_S{i}", w, 0.02, sh), x=x, y=y, z=z_top - (i + 1) * sh)
        s3d.material(st, "fabric", color=RED if i % 2 == 0 else WHITE)
        stripes.append(st)
    canton = s3d.at(s3d.box(f"{name}_Canton", w * 0.45, 0.024, sh * 4), x=x - w * 0.275, y=y - 0.003, z=z_top - sh * 4)
    s3d.material(canton, "fabric", color=NAVY)
    stars = []
    for r in range(3):
        for c in range(3):
            st = s3d.at(s3d.sphere(f"{name}_Star{r}{c}", 0.022), x=x - w * 0.43 + c * w * 0.08, y=y - 0.016, z=z_top - sh * (0.7 + r * 1.2))
            stars.append(st)
    s3d.material(stars, "fabric", color=WHITE)
    g = s3d.group(name, *stripes, canton, *stars)
    return g


def statebox():
    parts = []
    # floor slab and dark interior: back wall, side walls, ceiling
    floor = s3d.at(s3d.box("Floor", 2 * BAY + 0.4, 1.4, 0.1), y=0.5, z=-0.1)
    back = s3d.at(s3d.box("BackWall", 2 * BAY + 0.4, 0.08, 2.2), y=1.2, z=-0.1)
    sides = [s3d.at(s3d.box(f"SideWall_{s}", 0.08, 1.4, 2.2), x=sx * (BAY + 0.2), y=0.5, z=-0.1) for s, sx in (("L", -1), ("R", 1))]
    ceil = s3d.at(s3d.box("Ceiling", 2 * BAY + 0.4, 1.4, 0.08), y=0.5, z=2.0)
    s3d.material([floor, back, *sides, ceil], "fabric", color="#4a2a22")
    parts += [floor, back, *sides, ceil]
    # wallpaper hint: a darker dado band inside
    dado = s3d.at(s3d.box("Dado", 2 * BAY + 0.3, 0.02, 0.5), y=1.15, z=0.0)
    s3d.material(dado, "fabric", color="#6a3a2a")
    parts.append(dado)

    for b, cx in (("A", -BAY / 2), ("B", BAY / 2)):
        # bowed parapet: a band along the arc, extruded up to the rail
        arc = s3d.arc(center=(cx, R - 0.2), r=R, start=270 - math.degrees(math.asin((BAY / 2 - 0.02) / R)), end=270 + math.degrees(math.asin((BAY / 2 - 0.02) / R)))
        band = s3d.stroke(arc, 0.07)
        par = s3d.extrude(f"Parapet_{b}", band, PAR)
        s3d.material(par, "plastic", color=CREAM)
        apron = s3d.at(s3d.extrude(f"Apron_{b}", s3d.stroke(arc, 0.06), 0.42), z=-0.52)
        s3d.material(apron, "plastic", color=CREAM)
        # gilt mouldings: the rail on top, a bead at mid height and along the bottom of the apron
        rail = s3d.wire(f"Rail_{b}", bay_arc(cx, z=PAR + 0.01), 0.07)
        bead = s3d.wire(f"Bead_{b}", [(x, y - 0.04, 0.2) for x, y, _ in bay_arc(cx)], 0.03)
        foot = s3d.wire(f"Foot_{b}", [(x, y - 0.035, -0.5) for x, y, _ in bay_arc(cx)], 0.05)
        mid = s3d.wire(f"Mid_{b}", [(x, y - 0.035, -0.08) for x, y, _ in bay_arc(cx)], 0.04)
        s3d.material([rail, bead, foot, mid], "brass", color=GILT)
        # gilt medallions on the apron
        meds = []
        for k, t in enumerate((-0.33, 0.0, 0.33)):
            x = cx + t * BAY
            a = math.asin((x - cx) / R)
            y = R - 0.2 - R * math.cos(a) - 0.04
            m = s3d.at(s3d.cylinder(f"Medal_{b}{k}", 0.12, 0.02), on=s3d.Frame((x, y, -0.3), normal=(math.sin(a) * 0.3, -1, 0)))
            meds.append(m)
        s3d.material(meds, "brass", color=GILT)
        # bunting swags: red, white and blue bands hanging from the rail
        sw = []
        for k, (col, d) in enumerate(((RED, 0.0), (WHITE, 0.055), (BLUE, 0.11))):
            w = s3d.wire(f"Swag_{b}{k}", swag(cx, PAR - 0.02, 0.18, d), 0.06)
            s3d.material(w, "fabric", color=col)
            sw.append(w)
        parts += [par, apron, rail, bead, foot, mid, *meds, *sw]

    # pillars: two outer and one at the centre, fluted look from a cylinder with gilt capitals and bases
    for p, x in (("L", -BAY - 0.04), ("M", 0.0), ("R", BAY + 0.04)):
        a = math.asin(max(-1, min(1, (x - math.copysign(BAY / 2, x if x else 1)) / R))) if x else 0
        y = -0.12 if p == "M" else -0.12
        col = s3d.at(s3d.cylinder(f"Pillar_{p}", 0.13, 2.5), x=x, y=y, z=-0.55)
        cap = s3d.at(s3d.box(f"Capital_{p}", 0.22, 0.22, 0.1), x=x, y=y, z=1.9)
        base = s3d.at(s3d.box(f"Base_{p}", 0.2, 0.2, 0.1), x=x, y=y, z=-0.6)
        s3d.material(col, "plastic", color=CREAM)
        s3d.material([cap, base], "brass", color=GILT)
        parts += [col, cap, base]

    # the valance: a red velvet pelmet with a gilt fringe across the top, side curtains tied back
    val = s3d.at(s3d.box("Valance", 2 * BAY + 0.5, 0.12, 0.3), y=-0.2, z=1.85)
    s3d.fillet(val, 0.04)
    fringe = s3d.at(s3d.box("Fringe", 2 * BAY + 0.5, 0.13, 0.05), y=-0.2, z=1.82)
    s3d.material(val, "velvet", color=VELVET)
    s3d.material(fringe, "brass", color=GILT)
    parts += [val, fringe]
    for s, sx in (("L", -1), ("R", 1)):
        cur = s3d.loft(
            f"Curtain_{s}",
            s3d.station(1.85, 0.36, 0.1, x=sx * (BAY + 0.02), y=-0.1),
            s3d.station(1.0, 0.16, 0.08, x=sx * (BAY + 0.08), y=-0.12),
            s3d.station(0.55, 0.12, 0.08, x=sx * (BAY + 0.12), y=-0.12),
            s3d.station(0.05, 0.22, 0.1, x=sx * (BAY + 0.12), y=-0.12),
        )
        s3d.material(cur, "velvet", color=VELVET)
        tie = s3d.at(s3d.torus(f"Tie_{s}", 0.17, 0.03), x=sx * (BAY + 0.1), y=-0.12, z=0.62)
        s3d.material(tie, "brass", color=GILT)
        parts += [cur, tie]

    # striped flags draped down the outer ends of the parapet
    parts.append(flag_hanging("FlagL", -BAY + 0.2, -0.17, PAR - 0.02, 0.42, 0.62, 0))
    parts.append(flag_hanging("FlagR", BAY - 0.2, -0.17, PAR - 0.02, 0.42, 0.62, 0))

    # the centre: a gilt-framed portrait (Washington) on the pillar, the blue regimental flag on a staff above
    frame = s3d.at(s3d.extrude("PortraitFrame", s3d.ellipse(0.3, 0.38), 0.04), on=s3d.Frame((0, -0.22, -0.3), normal=(0, -1, 0)))
    s3d.material(frame, "brass", color=FRAME)
    pic = s3d.at(s3d.extrude("Portrait", s3d.ellipse(0.23, 0.31), 0.02), on=s3d.Frame((0, -0.245, -0.3), normal=(0, -1, 0)))
    s3d.material(pic, "fabric", color="#3a3028")
    face = s3d.at(s3d.extrude("PortraitFace", s3d.ellipse(0.1, 0.13), 0.015), on=s3d.Frame((0, -0.26, -0.27), normal=(0, -1, 0)))
    s3d.material(face, "fabric", color="#e8d0b0")
    wig = s3d.at(s3d.extrude("PortraitWig", s3d.ellipse(0.13, 0.07), 0.012), on=s3d.Frame((0, -0.258, -0.205), normal=(0, -1, 0)))
    s3d.material(wig, "fabric", color="#e8e4dc")
    staff = s3d.wire("Staff", [(0.0, -0.2, 0.5), (0.0, -0.45, 1.1)], 0.03)
    s3d.material(staff, "brass", color=GILT)
    finial = s3d.at(s3d.sphere("StaffTop", 0.07), x=0.0, y=-0.45, z=1.08)
    s3d.material(finial, "brass", color=GILT)
    banner = s3d.loft(
        "BlueFlag",
        s3d.station(1.02, 0.5, 0.025, x=-0.27, y=-0.42),
        s3d.station(0.8, 0.52, 0.025, x=-0.3, y=-0.38),
        s3d.station(0.62, 0.48, 0.025, x=-0.32, y=-0.33),
    )
    s3d.material(banner, "fabric", color=BLUE)
    eagle = s3d.at(s3d.extrude("FlagEagle", s3d.ellipse(0.16, 0.1), 0.01), on=s3d.Frame((-0.3, -0.42, 0.83), normal=(0, -1, -0.3)))
    s3d.material(eagle, "brass", color=GILT)
    parts += [frame, pic, face, wig, staff, finial, banner, eagle]
    return s3d.group("StateBox", *parts)


s3d.export(statebox(), out)
