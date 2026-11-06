# A holstered six-shooter on a slice of gun belt, cartoon proportions (about 1.4x a real one next to a 1.3 m
# puppet). Metres, Z up, the bottom of the holster at z = 0, front (the side facing away from the leg) toward -Y.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python videos/duel/sand3d/holster.py public/models/duel/holster.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")


def holster():
    # the pouch: narrow at the toe, wide at the mouth, a rounded tip
    pouch = s3d.loft(
        "Pouch",
        s3d.station(0.0, 0.035, 0.03),
        s3d.station(0.05, 0.05, 0.036),
        s3d.station(0.17, 0.075, 0.046),
        s3d.station(0.22, 0.085, 0.05),
    )
    s3d.material(pouch, "leather", color="#7a4424")
    # the flap of leather stitched round the mouth
    lip = s3d.at(s3d.extrude("Lip", s3d.rect(0.095, 0.058, r=0.02), 0.022), z=0.205)
    s3d.material(lip, "leather", color="#5a2e16")
    # the gun: cylinder and hammer above the mouth, the grip swept back
    drum = s3d.at(s3d.cylinder("Drum", 0.05, 0.045), z=0.24, rx=90)
    s3d.at(drum, y=0.022)
    frame = s3d.at(s3d.box("Frame", 0.03, 0.04, 0.05), z=0.222)
    hammer = s3d.at(s3d.box("Hammer", 0.016, 0.014, 0.035), x=0.026, z=0.262, ry=-25)
    s3d.material([drum, frame, hammer], "steel", color="#4a4e58")
    grip = s3d.loft(
        "Grip",
        s3d.station(0.0, 0.034, 0.03),
        s3d.station(0.06, 0.04, 0.032),
        s3d.station(0.1, 0.036, 0.03),
    )
    s3d.soften(grip, 0.008)
    s3d.at(grip, x=0.045, z=0.255, ry=-62)
    s3d.material(grip, "walnut", color="#d8c8a0")  # ivory-ish grip, reads against the leather
    # a slice of gun belt with cartridge loops
    belt = s3d.at(s3d.box("Belt", 0.24, 0.03, 0.06), y=0.03, z=0.26)
    s3d.fillet(belt, 0.006)
    s3d.material(belt, "leather", color="#4a2816")
    shells = [s3d.at(s3d.cylinder(f"Shell_{i}", 0.014, 0.04), x=x, y=0.012, z=0.27) for i, x in enumerate((-0.1, -0.08, 0.08, 0.1))]
    s3d.material(shells, "brass", color="#e0b040")
    return s3d.assembly("holster", pouch, lip, drum, frame, hammer, grip, belt, *shells)


s3d.export(holster(), out)
print("ok", out)
