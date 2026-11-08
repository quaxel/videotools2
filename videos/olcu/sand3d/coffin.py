# Undertaker Pruitt's coffins, standing upright (as they lean against his shop front): a six-sided toe-pincher.
# Variant "pine": plain pine boards. Variant "fancy": polished mahogany, brass handles and a brass plate.
# Metres, Z up (the coffin's length), floor at z = 0, the lid toward -Y.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/olcu/sand3d/coffin.py <pine|fancy> <out.glb>
import sys
import sand3d as s3d

kind, out = sys.argv[1], sys.argv[2]
s3d.empty_scene()
s3d.units("m")

L = 1.55  # long enough for a 1.3 m puppet with a hat
T = 0.26  # depth


def outline(grow=0.0):
    # in X (width) / Y (length), head at +Y: narrow head, wide shoulders, narrow toe
    return s3d.poly([(-0.17 - grow, L / 2 + grow), (0.17 + grow, L / 2 + grow), (0.26 + grow, L * 0.22), (0.15 + grow, -L / 2 - grow), (-0.15 - grow, -L / 2 - grow), (-0.26 - grow, L * 0.22)])


def coffin():
    box = s3d.extrude("Box", outline(), T)
    lid = s3d.extrude("Lid", outline(0.015), 0.04)
    s3d.at(lid, z=T)
    s3d.fillet(lid, 0.01, edges="top")
    parts = [box, lid]
    if kind == "pine":
        s3d.material([box, lid], "pine", color="#c8955a")
        seams = [s3d.at(s3d.box(f"Seam_{i}", 0.4, 0.008, 0.005), y=y, z=T + 0.04) for i, y in enumerate((-0.35, 0.05, 0.45))]
        s3d.material(seams, "pine", color="#7a5028")
        parts += seams
    else:
        s3d.material([box, lid], "walnut", color="#5a1a12")
        plate = s3d.at(s3d.extrude("Plate", s3d.rect(0.16, 0.08, r=0.01), 0.008), y=0.2, z=T + 0.04)
        handles = [s3d.at(s3d.box(f"Handle_{s}_{i}", 0.03, 0.14, 0.03), x=s * 0.25, y=y, z=T * 0.5) for s in (-1, 1) for i, y in enumerate((-0.45, 0.0, 0.45))]
        cross = [s3d.at(s3d.box("CrossV", 0.03, 0.32, 0.01), y=0.42, z=T + 0.04), s3d.at(s3d.box("CrossH", 0.18, 0.03, 0.01), y=0.48, z=T + 0.04)]
        s3d.material([plate, *handles, *cross], "brass", color="#e8b83a")
        parts += [plate, *handles, *cross]
    root = s3d.assembly("coffin", *parts)
    # stand it up: length along Z, the lid toward -Y, the toe on the floor
    s3d.transform(root, rx=90, z=L / 2 + 0.015, y=T / 2)
    return root


s3d.export(coffin(), out)
print("ok", out)
