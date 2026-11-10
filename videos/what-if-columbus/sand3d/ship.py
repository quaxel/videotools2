# A cartoon 1492 ship: the nao (Santa María) or a caravel (Pinta, Niña), for the wide sea shots of what-if-columbus.
# Tubby tarred hull with a pale wale stripe, high square sterncastle, forecastle, bowsprit; square fore and main
# courses with a red cross on the main, a lateen mizzen; a crow's nest on the mainmast; a stern lantern.
# Metres, Z up, waterline at z = 0.45 (the hull bottom at z = 0), centred, bow toward -Y (+Z in three).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-columbus/sand3d/ship.py public/videos/what-if-columbus/models/nao.glb nao
#      ... ship.py public/videos/what-if-columbus/models/caravel.glb caravel
# Joints: none (the scene heaves and rolls the whole model). Lantern glass is a light material.
import sys
import sand3d as s3d

out = sys.argv[1]
kind = sys.argv[2] if len(sys.argv) > 2 else "nao"
s3d.empty_scene()
s3d.units("m")

HULL, HULL2, WALE, CANVAS, CROSS, ROPE, DECK, MAST = "#4a2e1e", "#5e3a24", "#c8a060", "#f2e6c8", "#b8282a", "#3a2a1c", "#b08a5a", "#7a5232"


def ship(nao: bool):
    L = 4.2 if nao else 3.6  # hull length
    B = 1.5 if nao else 1.2  # beam
    H = 1.15 if nao else 0.95  # hull height at the waist
    h = L / 2
    # hull: plan widths along y (bow at -y), sheer (top) rising to the stern and a little to the bow, rounded bottom
    plan = [(-h, 0.18), (-h * 0.75, B * 0.62), (-h * 0.35, B * 0.95), (0, B), (h * 0.5, B * 0.92), (h * 0.85, B * 0.78), (h, B * 0.66)]
    top = [(-h, H + 0.25), (-h * 0.6, H + 0.05), (0, H), (h * 0.55, H + 0.08), (h, H + 0.3)]
    bottom = [(-h, 0.45), (-h * 0.7, 0.08), (0, 0.0), (h * 0.7, 0.06), (h, 0.32)]
    hull = s3d.body("Hull", plan, top, bottom, n=2.6)
    s3d.material(hull, "oak", color=HULL)
    # the wale: a pale band along both sides just under the rail
    wales = []
    for s, sx in (("L", -1), ("R", 1)):
        w = s3d.at(s3d.box(f"Wale_{s}", 0.04, L * 0.78, 0.09), x=sx * B * 0.49, y=0.05, z=H - 0.32)
        wales.append(w)
    s3d.material(wales, "pine", color=WALE)
    # deck (a slab sitting in the hull, just under the rail)
    deck = s3d.at(s3d.box("Deck", B * 0.86, L * 0.8, 0.05), y=0.0, z=H - 0.12)
    s3d.material(deck, "pine", color=DECK)

    # sterncastle: a high square box at the stern with a rail and a stern lantern
    sc_h = 0.62 if nao else 0.42
    sc_l = L * (0.3 if nao else 0.24)
    sc = s3d.at(s3d.box("Sterncastle", B * 0.82, sc_l, sc_h), y=h - sc_l / 2 - 0.05, z=H - 0.08)
    s3d.fillet(sc, 0.04)
    s3d.material(sc, "oak", color=HULL2)
    sc_band = s3d.at(s3d.box("SternBand", B * 0.84, sc_l + 0.02, 0.07), y=h - sc_l / 2 - 0.05, z=H - 0.08 + sc_h - 0.12)
    s3d.material(sc_band, "pine", color=WALE)
    windows = [s3d.at(s3d.box(f"SternWin_{i}", 0.14, 0.03, 0.12), x=(i - 1) * 0.3, y=h - 0.04, z=H + sc_h * 0.35) for i in range(3)]
    s3d.material(windows, "light", color="#ffd890")
    lpost = s3d.at(s3d.cylinder("LanternPost", 0.04, 0.3), y=h - 0.12, z=H - 0.08 + sc_h)
    lamp = s3d.at(s3d.cylinder("Lantern", 0.14, 0.18), y=h - 0.12, z=H - 0.08 + sc_h + 0.3)
    s3d.material(lpost, "oak", color=ROPE)
    s3d.material(lamp, "light", color="#ffcc66")
    lamp_cap = s3d.at(s3d.cone("LanternCap", 0.18, 0.1), y=h - 0.12, z=H - 0.08 + sc_h + 0.48)
    s3d.material(lamp_cap, "painted_metal", color="#2a2018")

    parts = [hull, *wales, deck, sc, sc_band, *windows, lpost, lamp, lamp_cap]
    # forecastle (the nao only)
    if nao:
        fc_l = L * 0.16
        fc = s3d.at(s3d.box("Forecastle", B * 0.6, fc_l, 0.3), y=-h + fc_l / 2 + 0.22, z=H + 0.05)
        s3d.fillet(fc, 0.04)
        s3d.material(fc, "oak", color=HULL2)
        parts.append(fc)
    # bowsprit
    bs = s3d.at(s3d.cylinder("Bowsprit", 0.07, L * 0.32), on=s3d.Frame((0, -h + 0.25, H + 0.15), normal=(0, -1, 0.45)))
    s3d.material(bs, "oak", color=MAST)
    parts.append(bs)

    # masts: fore, main (tallest, with the crow's nest), mizzen at the stern
    main_h = 3.6 if nao else 3.0
    masts = [("Fore", -h * 0.55, main_h * 0.78), ("Main", -h * 0.05, main_h), ("Mizzen", h * 0.55, main_h * 0.62)]
    for name, y, mh in masts:
        m = s3d.at(s3d.cylinder(f"Mast_{name}", 0.09 if name == "Main" else 0.07, mh), y=y, z=H - 0.1)
        s3d.material(m, "oak", color=MAST)
        parts.append(m)
    main_y = masts[1][1]
    top_z = H - 0.1 + main_h * 0.86
    nest = s3d.at(s3d.tube("CrowsNest", 0.42, 0.34, 0.26), y=main_y, z=top_z)
    s3d.material(nest, "oak", color=HULL2)
    nest_floor = s3d.at(s3d.cylinder("NestFloor", 0.4, 0.04), y=main_y, z=top_z)
    s3d.material(nest_floor, "oak", color=HULL2)
    parts += [nest, nest_floor]

    # square sails: a yard and a slightly bellied course (a thin box), front face toward -y
    def course(name, y, z_top, w, hgt, cross):
        yard = s3d.at(s3d.cylinder(f"Yard_{name}", 0.06, w + 0.3), on=s3d.Frame((-(w + 0.3) / 2, y - 0.08, z_top), normal=(1, 0, 0)))
        s3d.material(yard, "oak", color=MAST)
        sail = s3d.at(s3d.box(f"Sail_{name}", w, 0.07, hgt), y=y - 0.12, z=z_top - hgt - 0.02)
        s3d.fillet(sail, 0.03)
        s3d.material(sail, "fabric", color=CANVAS)
        belly = s3d.at(s3d.box(f"Belly_{name}", w * 0.8, 0.07, hgt * 0.8), y=y - 0.17, z=z_top - hgt * 0.9)
        s3d.fillet(belly, 0.03)
        s3d.material(belly, "fabric", color=CANVAS)
        out = [yard, sail, belly]
        if cross:
            for side, dy in (("F", -0.215), ("B", -0.05)):
                cz = z_top - hgt * 0.52
                v = s3d.at(s3d.box(f"CrossV_{name}_{side}", w * 0.13, 0.012, hgt * 0.62), y=y + dy, z=cz - hgt * 0.31)
                hb = s3d.at(s3d.box(f"CrossH_{name}_{side}", w * 0.56, 0.012, hgt * 0.12), y=y + dy, z=cz - hgt * 0.06)
                s3d.material([v, hb], "fabric", color=CROSS)
                out += [v, hb]
        return out

    fore_y, fore_h = masts[0][1], masts[0][2]
    parts += course("Main", main_y, top_z - 0.12, B * 1.35, main_h * 0.5, True)
    parts += course("Fore", fore_y, H - 0.1 + fore_h * 0.92, B * 1.0, fore_h * 0.5, not nao)
    # lateen mizzen: a triangle in the fore-aft plane (on a face looking +X, local x runs +Y, local y up)
    miz_y, miz_h = masts[2][1], masts[2][2]
    tri = s3d.poly([(-0.55, 0.0), (0.75, 0.15), (0.45, miz_h * 0.85)], fillet=0.03)
    lat = s3d.extrude("Sail_Lateen", tri, 0.05, both=True, on=s3d.Frame((0.0, miz_y, H + 0.35), normal=(1, 0, 0)))
    s3d.material(lat, "fabric", color=CANVAS)
    parts.append(lat)

    # shrouds: a few rope lines from the rail up to the crow's nest, both sides
    ropes = []
    for s, sx in (("L", -1), ("R", 1)):
        for k, dy in enumerate((-0.35, 0.0, 0.35)):
            ropes.append(s3d.wire(f"Shroud_{s}{k}", [(sx * B * 0.5, main_y + dy, H), (sx * 0.12, main_y, top_z)], 0.025))
        ropes.append(s3d.wire(f"Stay_{s}", [(sx * B * 0.45, h * 0.5, H + 0.1), (0, main_y, top_z + 0.2)], 0.02))
    ropes.append(s3d.wire("Forestay", [(0, -h - L * 0.2, H + 0.6), (0, main_y, top_z + 0.3)], 0.025))
    s3d.material(ropes, "fabric", color=ROPE)
    parts += ropes
    # a flag on the main top
    pole = s3d.at(s3d.cylinder("FlagPole", 0.03, 0.4), y=main_y, z=H - 0.1 + main_h)
    flag = s3d.at(s3d.box("Flag", 0.02, 0.36, 0.22), y=main_y + 0.19, z=H - 0.1 + main_h + 0.16)
    s3d.material(pole, "oak", color=MAST)
    s3d.material(flag, "fabric", color="#e8c040" if nao else "#2a7a4a")
    parts += [pole, flag]
    return s3d.assembly("ship", *parts)


s3d.export(ship(kind == "nao"), out)
print("ok", out, kind)
