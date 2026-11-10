# A Napoleonic French field gun (a Gribeauval 12-pounder) at cartoon scale next to 1.3 m puppets: a bronze barrel
# with reinforce rings, a muzzle swell and a cascabel knob, on an olive-green bracket carriage (two cheeks), two big
# spoked wheels with iron tyres, an axle, an elevation screw and a long trail ending on the ground.
# Metres, Z up, ground at z = 0, centred on the axle in x, the muzzle (front) toward -Y.
# Joints: spin_L, spin_R (continuous, about the axle), elevate (revolute, the barrel on its trunnions, + raises the
# muzzle, -5..15), recoil (prismatic, the whole gun group slides back along +Y is done by the scene; not here).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/what-if-waterloo/sand3d/cannon.py public/videos/what-if-waterloo/models/cannon.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

BRONZE, BRONZE2, OLIVE, OLIVE2, IRON, WOOD = "#b8903a", "#8a6a2a", "#5f6a3a", "#4a5430", "#2a2a2a", "#6a4a2e"

R = 0.56  # wheel radius
AXLE_Z = R


def wheel(axle, tag, x):
    hub_c = s3d.local(axle, x, 0, 0.07, ry=90)  # on the axle's own centre line
    tyre = s3d.at(s3d.tube(f"Tyre_{tag}", 2 * R, 2 * R - 0.06, 0.07), on=hub_c.offset(-0.035))
    felloe = s3d.at(s3d.tube(f"Felloe_{tag}", 2 * R - 0.05, 2 * R - 0.16, 0.08), on=hub_c.offset(-0.04))
    hub = s3d.at(s3d.cylinder(f"Hub_{tag}", 0.2, 0.2), on=hub_c.offset(-0.1))
    cap = s3d.at(s3d.cylinder(f"HubCap_{tag}", 0.12, 0.05), on=hub_c.offset(0.1 if x > 0 else -0.15))
    spokes = [
        s3d.at(s3d.box(f"Spoke_{tag}_{i}", 0.045, R - 0.1, 0.04), on=hub_c.turn(rz=i * 360 / 12).move(y=(R - 0.1) / 2 + 0.04, z=-0.02))
        for i in range(12)
    ]
    s3d.material([tyre, cap], "painted_metal", color=IRON)
    s3d.material([felloe, hub, *spokes], "pine", color=OLIVE)
    g = s3d.group(f"Wheel_{tag}", tyre, felloe, hub, cap, *spokes)
    return s3d.joint(f"spin_{tag}", g, hub_c, kind="continuous", axis="normal")


def gun():
    # the axle tree: a squared beam across, wheels on its ends
    axle = s3d.at(s3d.box("Axle", 1.18, 0.14, 0.14), z=AXLE_Z - 0.07)
    s3d.material(axle, "pine", color=OLIVE2)
    # the two cheeks of the bracket trail: from just in front of the axle, sloping down to the ground behind (+Y)
    cheeks = []
    for s, tag in ((-1, "L"), (1, "R")):
        ch = s3d.body(
            f"Cheek_{tag}",
            [(-0.3, 0.07), (0.2, 0.07), (1.0, 0.07), (1.75, 0.07)],
            [(-0.3, AXLE_Z + 0.24), (0.2, AXLE_Z + 0.22), (1.0, 0.5), (1.75, 0.26)],
            [(-0.3, AXLE_Z - 0.06), (0.2, AXLE_Z - 0.08), (1.0, 0.26), (1.75, 0.02)],
            n=3.5,
        )
        s3d.transform(ch, x=s * 0.17)
        cheeks.append(ch)
    s3d.material(cheeks, "pine", color=OLIVE)
    # transoms between the cheeks, iron straps, the trail end (lunette plate) on the ground
    transoms = [s3d.at(s3d.box(f"Transom_{i}", 0.34, 0.1, 0.1), y=y, z=z) for i, (y, z) in enumerate(((0.55, 0.62), (1.15, 0.38), (1.6, 0.1)))]
    s3d.material(transoms, "pine", color=OLIVE2)
    straps = [s3d.at(s3d.box(f"Strap_{i}", 0.46, 0.04, 0.03), y=y, z=z) for i, (y, z) in enumerate(((0.0, AXLE_Z + 0.2), (0.9, 0.5), (1.7, 0.2)))]
    s3d.material(straps, "painted_metal", color=IRON)
    # handspike socket and the elevation screw under the breech
    screw = s3d.at(s3d.cylinder("Screw", 0.05, 0.22), y=0.62, z=0.67)
    handle = s3d.at(s3d.box("ScrewHandle", 0.26, 0.03, 0.03), y=0.62, z=0.88)
    s3d.material([screw, handle], "painted_metal", color=IRON)
    # ammunition box between the cheeks (the "coffret")
    box = s3d.at(s3d.box("AmmoBox", 0.3, 0.3, 0.16), y=0.95, z=0.52)
    s3d.fillet(box, 0.02)
    s3d.material(box, "pine", color=WOOD)

    # the barrel on its trunnions (the elevation pivot, across X just above the axle)
    tz = AXLE_Z + 0.22
    # revolve a profile about Z: (radius, height); height runs breech (0) -> muzzle (1.7)
    barrel = s3d.revolve(
        "Barrel",
        [
            (0.0, 0.0),
            (0.17, 0.0),
            (0.2, 0.05),
            (0.2, 0.18),
            (0.185, 0.2),
            (0.18, 0.55),
            (0.195, 0.58),
            (0.195, 0.64),
            (0.16, 0.67),
            (0.145, 1.35),
            (0.155, 1.38),
            (0.155, 1.42),
            (0.13, 1.45),
            (0.125, 1.56),
            (0.155, 1.62),
            (0.16, 1.68),
            (0.0, 1.68),
        ],
    )
    bore = s3d.at(s3d.cylinder("Bore", 0.13, 0.3), z=1.42)
    s3d.cut(barrel, bore)
    knob = s3d.at(s3d.sphere("Cascabel", 0.13), z=-0.12)
    neck = s3d.at(s3d.cylinder("CascNeck", 0.07, 0.08), z=-0.06)
    barrel_parts = [barrel, knob, neck]
    for p in barrel_parts:
        s3d.transform(p, rx=90)  # +Z (muzzle) now points -Y
        s3d.transform(p, y=0.55, z=tz)  # breech behind the trunnions
    trunnion = s3d.at(s3d.cylinder("Trunnion", 0.1, 0.5), on=s3d.local(axle, -0.25, 0.0, tz - AXLE_Z + 0.07, ry=90))
    dolphins = [s3d.at(s3d.torus(f"Dolphin_{t}", 0.12, 0.035), x=sx * 0.06, y=-0.05, z=tz + 0.2, ry=90) for sx, t in ((-1, "L"), (1, "R"))]
    s3d.material([barrel, neck], "brass", color=BRONZE)
    s3d.material([knob, trunnion, *dolphins], "brass", color=BRONZE2)
    tube = s3d.group("Tube", barrel, knob, neck, trunnion, *dolphins)
    s3d.joint("elevate", tube, s3d.local(axle, 0, 0, tz - AXLE_Z + 0.07), kind="revolute", axis="-X", range=(-5, 15))

    wheels = [wheel(axle, "L", -0.62), wheel(axle, "R", 0.62)]
    return s3d.assembly("cannon", axle, *cheeks, *transoms, *straps, screw, handle, box, tube, *wheels)


s3d.export(gun(), out)
print("ok", out)
