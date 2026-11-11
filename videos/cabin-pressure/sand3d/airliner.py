# A cartoon narrowbody airliner (twin engines under swept wings, winglets, swept tail) for cabin-pressure.
# Run (in animator/): uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/cabin-pressure/sand3d/airliner.py public/videos/cabin-pressure/models/airliner.glb
# Metres; Z up, centred in x and y, nose toward -Y (it faces +Z, the camera, in three). About 12 m long, chunky
# cartoon proportions; exterior.tsx shows it at 3x (about real size), so a puppet fits behind a window.
# Generic livery: white, a navy cheatline with a red pinstripe under the windows, grey belly, red tail and winglets.
# The aircraft's own left (port) is +X here: red nav light on that wingtip, green on -X, white on the tail cone.
# HERO window (port side, 4th from the front): a real opening into a cavity (the cabin behind the glass), dressed
# in exterior.tsx with a lit interior, masks and Barry. Its numbers are mirrored there (HERO_WIN).
# Joints: fan_L, fan_R (continuous, about the engine axis). Light parts: Nav_Red, Nav_Green, Nav_Tail, Beacon_Top,
# Beacon_Bot (kind light; exterior.tsx blinks the beacons and adds glows).
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")  # after empty_scene, which resets the unit to mm

Z0 = 0.6  # everything sits this high, so the nacelles stay above z = 0
WHITE, BELLY, DARK, RED, NAVY, GREY = "#f4f6f8", "#c3cbd6", "#0b1322", "#c0392b", "#1d3a6e", "#b4bcc8"

# windows: a row per side from WIN_Y0, every WIN_PITCH, centred at WIN_Z
WIN_Y0, WIN_PITCH, WIN_N, WIN_Z, WIN_W, WIN_H = -3.9, 0.36, 19, Z0 + 1.0, 0.18, 0.25
HERO = 3  # the hero window's index on the port (+X) side
HERO_Y = WIN_Y0 + HERO * WIN_PITCH
FLOOR_Z = WIN_Z - 1.0 / 3  # the cavity floor: the window centre is 1.0 m above it at 3x (a puppet's head height)

PLAN = [(-6.12, 0.16), (-6.03, 0.6), (-5.86, 0.94), (-5.55, 1.17), (-5.1, 1.32), (-4.5, 1.4), (3.0, 1.4), (4.6, 1.05), (5.8, 0.42), (6.1, 0.16)]
TOP = [(-6.12, Z0 + 0.78), (-6.03, Z0 + 1.02), (-5.86, Z0 + 1.25), (-5.55, Z0 + 1.46), (-5.1, Z0 + 1.62), (-4.5, Z0 + 1.69), (-4.0, Z0 + 1.7),
       (3.0, Z0 + 1.7), (5.0, Z0 + 1.74), (6.1, Z0 + 1.78)]
BOTTOM = [(-6.12, Z0 + 0.62), (-6.03, Z0 + 0.44), (-5.86, Z0 + 0.32), (-5.55, Z0 + 0.25), (-5.0, Z0 + 0.21), (-4.0, Z0 + 0.2), (2.6, Z0 + 0.2),
          (4.2, Z0 + 0.6), (5.6, Z0 + 1.25), (6.1, Z0 + 1.52)]


def hull(name, grow=0.0):
    """The fuselage solid, grown by `grow` all round: decals (stripes, windows, doors) are cut from a grown copy so
    they sit a few mm proud of the skin instead of fighting it."""
    plan = [(y, w + 2 * grow) for y, w in PLAN]
    top = [(y, z + grow) for y, z in TOP]
    bottom = [(y, z - grow) for y, z in BOTTOM]
    return s3d.body(name, plan, top, bottom, n=2)


def side_prism(name, pts, width=2.0):
    """A prism across the whole fuselage (along X) from a side-view outline of (y, z) points."""
    return s3d.extrude(name, s3d.poly(pts), width, both=True, on=s3d.Frame((0, 0, 0), normal=(1, 0, 0)))


def slab(name, x0, x1, y0, y1, z0, z1):
    return s3d.at(s3d.box(name, x1 - x0, y1 - y0, z1 - z0), x=(x0 + x1) / 2, y=(y0 + y1) / 2, z=z0)


def window_tool(name, y, side, w=WIN_W, h=WIN_H, x0=0.45, x1=0.95, z=WIN_Z):
    """A rounded window outline pushed through one side of the fuselage (along X)."""
    sx = x0 if side > 0 else -x1
    return s3d.extrude(name, s3d.rect(w, h, r=min(w, h) * 0.42), x1 - x0, on=s3d.Frame((sx, y, z), normal=(1, 0, 0)))


def fuselage():
    body = hull("Fuselage")
    # the hero window: an opening through the skin into a box-shaped cabin behind it (the cavity stays inside the
    # hull: a wide room, a shallow slot next to the skin, the window-shaped hole through the last few cm)
    room = slab("CabinRoom", -0.3, 0.46, HERO_Y - 0.55, HERO_Y + 0.55, FLOOR_Z, Z0 + 1.32)
    slot = slab("CabinSlot", 0.4, 0.64, HERO_Y - 0.2, HERO_Y + 0.2, Z0 + 0.8, Z0 + 1.2)
    hole = window_tool("HeroHole", HERO_Y, 1, x0=0.55, x1=0.95)
    s3d.cut(body, room, slot, hole)
    s3d.material(body, "painted_metal", color=WHITE)

    belly = s3d.intersect(hull("Belly_noink", 0.004), slab("BellyCut", -2, 2, -7, 7, 0, Z0 + 0.64))
    s3d.material(belly, "painted_metal", color=BELLY)
    pin = s3d.intersect(hull("Pinstripe_noink", 0.006), slab("PinCut", -2, 2, -5.7, 5.9, Z0 + 0.655, Z0 + 0.675))
    s3d.material(pin, "painted_metal", color=RED)
    cheat = s3d.intersect(hull("Cheatline_noink", 0.006), side_prism("CheatCut", [(-5.72, Z0 + 0.69), (5.9, Z0 + 0.69), (5.9, Z0 + 0.84), (-5.6, Z0 + 0.82)]))
    s3d.material(cheat, "painted_metal", color=NAVY)
    return [body, belly, pin, cheat]


def windscreen():
    # a wraparound dark band round the nose: level sill, the top sloping down to the front panes
    band = s3d.intersect(hull("Windscreen", 0.006), side_prism("ScreenCut", [(-6.0, Z0 + 1.2), (-5.0, Z0 + 1.34), (-4.93, Z0 + 1.43),
                                                                           (-5.05, Z0 + 1.52), (-5.55, Z0 + 1.46), (-5.86, Z0 + 1.33)]))
    s3d.material(band, "glossy_plastic", color=DARK)
    # white frames between the panes: the centre post, two corner posts, a side post each side
    posts = [slab("PostC", -0.018, 0.018, -6.1, -5.5, Z0 + 1.15, Z0 + 1.5)]
    for s in (-1, 1):
        posts.append(s3d.at(s3d.box(f"PostK{'L' if s > 0 else 'R'}", 0.03, 0.7, 0.5), x=s * 0.33, y=-5.62, z=Z0 + 1.1, rz=s * 52))
        posts.append(slab(f"PostS{'L' if s > 0 else 'R'}", s * 0.2 if s > 0 else -0.9, 0.9 if s > 0 else -0.2, -5.27, -5.24, Z0 + 1.2, Z0 + 1.6))
    frames = s3d.intersect(hull("ScreenFrames_noink", 0.010), s3d.intersect(side_prism("FrameZone", [(-6.0, Z0 + 1.19), (-5.0, Z0 + 1.33), (-4.93, Z0 + 1.44),
                                                                                                    (-5.05, Z0 + 1.53), (-5.55, Z0 + 1.47), (-5.86, Z0 + 1.34)]),
                                                                       s3d.join(posts[0], *posts[1:])))
    s3d.material(frames, "painted_metal", color=WHITE)
    return [band, frames]


def windows():
    out = []
    for side in (-1, 1):
        tag = "L" if side > 0 else "R"
        tools = [window_tool(f"W{tag}{i}", WIN_Y0 + i * WIN_PITCH, side) for i in range(WIN_N) if not (side > 0 and i == HERO)]
        w = s3d.intersect(hull(f"Windows{tag}_noink", 0.006), s3d.join(tools[0], *tools[1:]))
        s3d.material(w, "glossy_plastic", color=DARK)
        out.append(w)
    return out


def doors():
    # passenger doors (front and rear), both sides: thin dark outlines on the skin, a small window in each
    out = []
    for side in (-1, 1):
        tag = "L" if side > 0 else "R"
        rings, wins = [], []
        for k, (y, z, w, h) in enumerate([(-4.45, Z0 + 0.98, 0.27, 0.56), (3.08, Z0 + 0.98, 0.27, 0.56)]):
            sx = 0.3 if side > 0 else -1.0
            fr = s3d.Frame((sx, y, z), normal=(1, 0, 0))
            outer = s3d.extrude(f"D{tag}{k}o", s3d.rect(w, h, r=0.07), 0.7, on=fr)
            inner = s3d.extrude(f"D{tag}{k}i", s3d.rect(w - 0.036, h - 0.036, r=0.055), 0.7, on=fr)
            s3d.cut(outer, inner)
            rings.append(outer)
            wins.append(window_tool(f"DW{tag}{k}", y, side, w=0.1, h=0.13, z=z + 0.12))
        ring = s3d.intersect(hull(f"Doors{tag}_noink", 0.008), s3d.join(rings[0], *rings[1:]))
        s3d.material(ring, "painted_metal", color="#55606e")
        dw = s3d.intersect(hull(f"DoorWins{tag}_noink", 0.008), s3d.join(wins[0], *wins[1:]))
        s3d.material(dw, "glossy_plastic", color=DARK)
        out += [ring, dw]
    return out


def wing_half(name, pts, t, z, dihedral):
    w = s3d.extrude(name, s3d.poly(pts), t)
    s3d.fillet(w, t * 0.45)
    return s3d.at(w, z=z, ry=-dihedral)


WING_Z, DIHEDRAL = Z0 + 0.42, 5


def wing_bottom(x):
    return WING_Z + abs(x) * 0.0875


def wings():
    right = wing_half("Wing_L", [(0.0, -1.4), (6.0, 1.3), (6.0, 1.9), (0.0, 1.1)], 0.16, WING_Z, DIHEDRAL)
    left = s3d.transform(s3d.copy(right), mirror="x")
    tips = []
    for side in (-1, 1):
        tip = s3d.extrude(f"Winglet_{'L' if side > 0 else 'R'}", s3d.poly([(0.0, 0.0), (0.5, 0.0), (0.62, 0.62), (0.4, 0.62)]), 0.08, both=True,
                          on=s3d.Frame((side * 5.97, 1.3, WING_Z + 6.0 * 0.0875 + 0.05), normal=(1, 0, 0)))
        s3d.at(tip, ry=side * -12)
        tips.append(tip)
    s3d.material([right, left], "painted_metal", color=WHITE)
    s3d.material(tips, "painted_metal", color=RED)
    # flap-track fairings: canoes under the trailing edge
    fairings = []
    for side in (-1, 1):
        for k, x in enumerate((1.45, 3.35, 4.7)):
            yte = 1.1 + 0.8 * x / 6
            zb = wing_bottom(x)
            c = s3d.body(f"Canoe_{'L' if side > 0 else 'R'}{k}", [(yte - 0.8, 0.03), (yte - 0.45, 0.11), (yte + 0.15, 0.1), (yte + 0.45, 0.02)],
                         [(yte - 0.8, zb + 0.06), (yte + 0.45, zb + 0.06)],
                         [(yte - 0.8, zb + 0.02), (yte - 0.35, zb - 0.1), (yte + 0.1, zb - 0.09), (yte + 0.45, zb + 0.02)])
            fairings.append(s3d.at(c, x=side * x))
    s3d.material(fairings, "painted_metal", color=GREY)
    # the wing-to-body fairing, a shallow grey bulge under the belly
    wtb = s3d.body("BellyFairing", [(-1.9, 0.5), (-1.3, 1.3), (1.4, 1.3), (2.05, 0.4)], [(-1.9, Z0 + 0.7), (2.05, Z0 + 0.7)],
                   [(-1.9, Z0 + 0.24), (-1.2, Z0 + 0.1), (1.3, Z0 + 0.1), (2.05, Z0 + 0.26)])
    s3d.material(wtb, "painted_metal", color=BELLY)
    return [right, left, *tips, *fairings, wtb]


def engine(side):
    tag = "L" if side > 0 else "R"
    x, front, zc = side * 2.25, -1.35, Z0 + 0.12
    # the nacelle along its own +Z (intake end at h = 1.6), turned so +Z points forward (-Y)
    nac = s3d.revolve(f"Nacelle_{tag}", [(0.0, 0.04), (0.2, 0.04), (0.3, 0.3), (0.39, 0.85), (0.41, 1.3), (0.4, 1.52), (0.37, 1.6), (0.33, 1.58),
                                         (0.31, 1.46), (0.0, 1.46)])
    s3d.at(nac, x=x, y=front + 1.6, z=zc, rx=90)
    s3d.material(nac, "painted_metal", color=WHITE)
    ax = lambda h, **kw: s3d.local(nac, 0, 0, h, **kw)  # noqa: E731  a frame on the engine axis, h along it
    lip = s3d.revolve(f"Lip_{tag}", [(0.315, 1.5), (0.4, 1.5), (0.415, 1.56), (0.385, 1.62), (0.335, 1.62), (0.31, 1.57)])
    s3d.at(lip, x=x, y=front + 1.6, z=zc, rx=90)
    s3d.material(lip, "aluminium", color="#d4dae2")
    face = s3d.at(s3d.cylinder(f"FanFace_{tag}", 0.63, 0.012), on=ax(1.455))
    s3d.material(face, "rubber", color="#1f242d")
    blades = []
    for i in range(16):
        a = i * 22.5
        b = s3d.box(f"Blade_{tag}{i}", 0.25, 0.07, 0.012)
        blades.append(s3d.at(b, on=ax(1.468, rz=a), x=0.17, rx=38))
    spinner = s3d.at(s3d.cone(f"Spinner_{tag}", 0.2, 0.15), on=ax(1.468))
    s3d.material(blades, "steel", color="#8d97a6")
    s3d.material(spinner, "painted_metal", color="#e6eaf0")
    fan = s3d.group(f"Fan_{tag}", *blades, spinner)
    s3d.joint(f"fan_{tag}", fan, ax(1.468), kind="continuous", axis="normal")
    nozzle = s3d.at(s3d.tube(f"Nozzle_{tag}", 0.44, 0.34, 0.08), on=ax(0.0))
    plug = s3d.at(s3d.cone(f"Plug_{tag}", 0.28, 0.26), on=ax(0.06, rx=180))
    s3d.material(nozzle, "painted_metal", color="#4a515c")
    s3d.material(plug, "painted_metal", color="#6b7280")
    pylon = s3d.at(s3d.extrude(f"Pylon_{tag}", s3d.rect(0.12, 1.3, r=0.05), 0.36), x=x, y=front + 1.0, z=Z0 + 0.4)
    s3d.material(pylon, "painted_metal", color=BELLY)
    return [nac, lip, face, fan, nozzle, plug, pylon]


def tail():
    fin = s3d.extrude("Fin", s3d.poly([(3.4, Z0 + 1.45), (6.05, Z0 + 1.45), (6.5, Z0 + 3.9), (5.55, Z0 + 3.9)]), 0.14, both=True,
                      on=s3d.Frame((0, 0, 0), normal=(1, 0, 0)))
    s3d.fillet(fin, 0.05)
    s3d.material(fin, "painted_metal", color=RED)
    right = wing_half("Stab_L", [(0.0, 4.55), (2.3, 5.75), (2.3, 6.15), (0.0, 5.95)], 0.09, Z0 + 1.42, 4)
    left = s3d.transform(s3d.copy(right), mirror="x")
    s3d.material([right, left], "painted_metal", color=WHITE)
    # the APU exhaust at the tip of the tail cone
    apu = s3d.at(s3d.tube("APU_Exhaust", 0.13, 0.08, 0.12), on=s3d.Frame((0, 6.03, Z0 + 1.65), normal=(0, 1, 0)))
    s3d.material(apu, "painted_metal", color="#3a404a")
    return [fin, right, left, apu]


def lights():
    def lamp(name, x, y, z, color, d=0.08):
        ob = s3d.at(s3d.cylinder(name, d, d * 0.7), x=x, y=y, z=z - d * 0.35)
        s3d.material(ob, "light", color=color)
        return ob
    tipz = WING_Z + 6.0 * 0.0875 + 0.09
    return [
        lamp("Nav_Red", 6.0, 1.36, tipz, "#ff2a2a"),  # port (+X) wingtip
        lamp("Nav_Green", -6.0, 1.36, tipz, "#2aff6a"),  # starboard
        lamp("Nav_Tail", 0.0, 5.98, Z0 + 1.8, "#ffffff", 0.07),
        lamp("Beacon_Top", 0.0, 0.4, Z0 + 1.72, "#ff3a2a", 0.09),
        lamp("Beacon_Bot", 0.0, 0.9, Z0 + 0.18, "#ff3a2a", 0.09),
    ]


def airliner():
    return s3d.assembly("airliner", *fuselage(), *windscreen(), *windows(), *doors(), *wings(), *engine(-1), *engine(1), *tail(), *lights())


s3d.export(airliner(), out)
print("ok", out)
