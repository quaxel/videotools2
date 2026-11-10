# A cartoon cavalry horse (a general's charger) at the puppets' scale: barrel body, arched neck with a mane, a long
# head with ears and eyes, a full tail, four legs with knees and hooves, a saddle cloth (shabraque) with a trim, a
# saddle and a rolled cloak. Metres, Z up, hooves on z = 0, centred, the head (front) toward -Y. Saddle top z ~1.24
# (the Niagara horse's HORSE.saddle), so a puppet with sit and air rides it.
# Joints: leg_FL, leg_FR, leg_HL, leg_HR (revolute about +X at the shoulder / hip, + swings the hoof back),
# knee_FL ... knee_HR (revolute below them, + folds the lower leg back), neck (revolute about +X at the withers,
# + lowers the head), tail (about +X, + lifts it).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-waterloo/sand3d/horse.py public/videos/what-if-waterloo/models/horse_grey.glb grey
#      ... horse.py public/videos/what-if-waterloo/models/horse_bay.glb bay
#      ... horse.py public/videos/what-if-waterloo/models/horse_black.glb black
import sys
import sand3d as s3d

out = sys.argv[1]
kind = sys.argv[2] if len(sys.argv) > 2 else "bay"
s3d.empty_scene()
s3d.units("m")

COATS = {
    # coat, dark points (mane, tail, lower legs), muzzle, cloth, trim
    "grey": ("#e2ddd2", "#8a8680", "#b8b0a8", "#2a3f8a", "#e8c040"),  # Napoleon: a grey, a blue cloth with gold
    "bay": ("#9a5a32", "#2a1c14", "#6a4430", "#3a5a2a", "#e8c040"),  # Grouchy / Gérard: a bay, green cloth
    "black": ("#3a2c26", "#14100e", "#5a4a40", "#22263a", "#d8d8d0"),  # Blücher: a dark horse, dark blue cloth
    "chestnut": ("#b8642e", "#6a3418", "#8a5034", "#9a1e1e", "#e8c040"),  # Wellington: a chestnut, a red cloth
}
COAT, DARK, MUZZLE, CLOTH, TRIM = COATS[kind]
HOOF, WHITE, BLACK, LEATHER = "#2a2420", "#ffffff", "#141414", "#5a3420"


def leg(body, tag, x, y, front):
    top_z = 0.86
    upper = s3d.at(s3d.cylinder(f"Upper_{tag}", 0.15 if front else 0.17, 0.44), x=x, y=y, z=0.42)
    s3d.fillet(upper, 0.03)
    s3d.material(upper, "fabric", color=COAT)
    lower = s3d.at(s3d.cylinder(f"Lower_{tag}", 0.085, 0.36), x=x, y=y, z=0.07)
    fetlock = s3d.at(s3d.sphere(f"Fetlock_{tag}", 0.11), x=x, y=y, z=0.06)
    hoof = s3d.at(s3d.cone(f"Hoof_{tag}", 0.14, 0.09, d2=0.11), x=x, y=y, z=0.0)
    s3d.material([lower, fetlock], "fabric", color=DARK if kind != "grey" else COAT)
    s3d.material(hoof, "plastic", color=HOOF)
    low = s3d.group(f"LowerLeg_{tag}", lower, fetlock, hoof)
    s3d.joint(f"knee_{tag}", low, s3d.local(upper, 0, 0, 0), kind="revolute", axis="+X", range=(-95, 95))
    g = s3d.group(f"Leg_{tag}", upper, low)
    return s3d.joint(f"leg_{tag}", g, s3d.local(body, x, y, top_z), kind="revolute", axis="+X", range=(-60, 60))


def horse():
    # the barrel: chest at -Y, rump at +Y (a body built from views lives in world space)
    body = s3d.body(
        "Body",
        [(-0.78, 0.3), (-0.6, 0.44), (-0.2, 0.5), (0.3, 0.5), (0.62, 0.46), (0.8, 0.3)],
        [(-0.78, 1.14), (-0.6, 1.24), (-0.2, 1.17), (0.3, 1.16), (0.6, 1.22), (0.8, 1.1)],
        [(-0.78, 0.86), (-0.6, 0.74), (-0.2, 0.66), (0.3, 0.68), (0.6, 0.78), (0.8, 0.92)],
        n=2.3,
    )
    s3d.material(body, "fabric", color=COAT)

    # neck + head: one group nodding at the withers
    neck = s3d.body(
        "Neck",
        [(-1.08, 0.2), (-0.86, 0.25), (-0.6, 0.34)],
        [(-1.08, 1.86), (-0.86, 1.66), (-0.6, 1.3)],
        [(-1.08, 1.5), (-0.86, 1.22), (-0.6, 0.9)],
    )
    mane = s3d.body(
        "Mane",
        [(-1.1, 0.06), (-0.85, 0.08), (-0.62, 0.06)],
        [(-1.1, 1.95), (-0.85, 1.74), (-0.62, 1.36)],
        [(-1.1, 1.8), (-0.85, 1.58), (-0.62, 1.22)],
    )
    head = s3d.body(
        "Head",
        [(-1.5, 0.15), (-1.36, 0.2), (-1.18, 0.23), (-1.02, 0.24)],
        [(-1.5, 1.5), (-1.36, 1.62), (-1.18, 1.78), (-1.02, 1.9)],
        [(-1.5, 1.32), (-1.36, 1.38), (-1.18, 1.5), (-1.02, 1.62)],
    )
    muzzle = s3d.body(
        "Muzzle",
        [(-1.56, 0.13), (-1.46, 0.17), (-1.36, 0.17)],
        [(-1.56, 1.48), (-1.46, 1.54), (-1.36, 1.6)],
        [(-1.56, 1.32), (-1.46, 1.3), (-1.36, 1.34)],
    )
    blaze = s3d.at(s3d.box("Blaze", 0.06, 0.34, 0.03), y=-1.27, z=1.665, rx=40)
    s3d.material([neck, head], "fabric", color=COAT)
    s3d.material(mane, "fabric", color=DARK)
    s3d.material(muzzle, "fabric", color=MUZZLE)
    s3d.material(blaze, "fabric", color=WHITE)
    ears = [s3d.at(s3d.cone(f"Ear_{t}", 0.07, 0.15), x=sx * 0.07, y=-1.02, z=1.86, rx=-12, ry=sx * 12) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material(ears, "fabric", color=COAT)
    eyes = [s3d.at(s3d.sphere(f"Eye_{t}", 0.06), x=sx * 0.105, y=-1.16, z=1.72) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material(eyes, "plastic", color=BLACK)
    glints = [s3d.at(s3d.sphere(f"Glint_{t}", 0.02), x=sx * 0.125, y=-1.18, z=1.75) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material(glints, "plastic", color=WHITE)
    nostrils = [s3d.at(s3d.sphere(f"Nostril_{t}", 0.04), x=sx * 0.055, y=-1.55, z=1.42) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material(nostrils, "plastic", color="#2a1a14")
    # bridle: a noseband, a cheek strap and the reins running back to the saddle
    noseband = s3d.at(s3d.box("Noseband", 0.2, 0.04, 0.035), y=-1.42, z=1.52, rx=-20)
    cheek = [s3d.at(s3d.box(f"CheekStrap_{t}", 0.02, 0.035, 0.32), x=sx * 0.12, y=-1.25, z=1.42, rx=-30) for sx, t in ((-1, "L"), (1, "R"))]
    reins = [s3d.wire(f"Rein_{t}", [(sx * 0.11, -1.4, 1.45), (sx * 0.16, -0.95, 1.18), (sx * 0.14, -0.5, 1.28)], 0.022) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material([noseband, *cheek, *reins], "leather", color=LEATHER)
    front = s3d.group("Front", neck, mane, head, muzzle, blaze, *ears, *eyes, *glints, *nostrils, noseband, *cheek, *reins)
    s3d.joint("neck", front, s3d.local(body, 0, -0.62, 1.17), kind="revolute", axis="-X", range=(-25, 40))

    # tail, hanging from the croup
    tail = s3d.body(
        "Tail",
        [(0.76, 0.12), (0.9, 0.16), (1.0, 0.14), (1.04, 0.06)],
        [(0.76, 1.14), (0.9, 1.02), (1.0, 0.72), (1.04, 0.42)],
        [(0.76, 1.0), (0.9, 0.82), (1.0, 0.5), (1.04, 0.36)],
    )
    s3d.material(tail, "fabric", color=DARK)
    s3d.joint("tail", tail, s3d.local(body, 0, 0.78, 1.08), kind="revolute", axis="-X", range=(-20, 40))

    # shabraque (saddle cloth) with a trim, the saddle, a rolled cloak behind it
    cloth = s3d.body(
        "Cloth",
        [(-0.32, 0.56), (0.0, 0.58), (0.36, 0.56)],
        [(-0.32, 1.25), (0.0, 1.2), (0.36, 1.21)],
        [(-0.32, 0.86), (0.0, 0.82), (0.36, 0.86)],
        n=2.2,
    )
    trim = s3d.body(
        "ClothTrim",
        [(-0.34, 0.57), (0.0, 0.59), (0.38, 0.57)],
        [(-0.34, 0.92), (0.0, 0.88), (0.38, 0.92)],
        [(-0.34, 0.84), (0.0, 0.8), (0.38, 0.84)],
        n=2.2,
    )
    s3d.material(cloth, "fabric", color=CLOTH)
    s3d.material(trim, "fabric", color=TRIM)
    saddle = s3d.body(
        "Saddle",
        [(-0.22, 0.3), (0.0, 0.34), (0.22, 0.3)],
        [(-0.22, 1.33), (0.0, 1.25), (0.22, 1.31)],
        [(-0.22, 1.16), (0.0, 1.14), (0.22, 1.16)],
    )
    s3d.material(saddle, "leather", color=LEATHER)
    roll = s3d.at(s3d.cylinder("Cloak", 0.12, 0.5), on=s3d.local(body, -0.25, 0.32, 1.29, ry=90))
    s3d.material(roll, "fabric", color="#5a5a62")
    stirrups = [s3d.at(s3d.box(f"Stirrup_{t}", 0.03, 0.08, 0.06), x=sx * 0.33, y=-0.02, z=0.66) for sx, t in ((-1, "L"), (1, "R"))]
    leathers = [s3d.at(s3d.box(f"StirLeather_{t}", 0.015, 0.03, 0.5), x=sx * 0.32, y=-0.02, z=0.7) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material([*stirrups, *leathers], "leather", color="#2a2018")

    legs = [
        leg(body, "FL", -0.15, -0.52, True),
        leg(body, "FR", 0.15, -0.52, True),
        leg(body, "HL", -0.15, 0.5, False),
        leg(body, "HR", 0.15, 0.5, False),
    ]
    return s3d.assembly("horse", body, front, tail, cloth, trim, saddle, roll, *stirrups, *leathers, *legs)


s3d.export(horse(), out)
print("ok", out)
