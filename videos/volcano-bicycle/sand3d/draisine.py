# Karl Drais' running machine (Laufmaschine, draisine, dandy horse), Mannheim 1817: two equal spoked wooden wheels
# with iron tyres in line, a wooden beam frame, a small leather saddle on the beam, a padded armrest board in front of
# it, and a steering tiller on the front fork ending in a cross handle. NO pedals, no cranks, no chain: the rider
# pushes off the ground with his feet. Cartoon scale next to the 1.3 m puppets (hip at 0.34 m): saddle top 0.343 m (the hip).
# Metres, Z up, ground at z = 0, centred, front toward -Y (toward the camera in three).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/volcano-bicycle/sand3d/draisine.py public/videos/volcano-bicycle/models/draisine.glb
# Joints: spin_F, spin_R (continuous, degrees: the wheels roll), steer (revolute about +Z, degrees).
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

WOOD, WOOD_D, IRON, LEATHER, PAD, BRASS = "#c08a4e", "#8a5a30", "#34343a", "#6a3420", "#2e5a3a", "#c8a048"
R = 0.15  # wheel radius: knee-to-hip height on the puppet, as the real one (about 27 in) on a man
AX = 0.215  # half wheelbase: the tyres almost meet, as on the c. 1820 machines  # half wheelbase
BEAM_Z = 0.303  # beam floor: the wheels run just under the beam


def wheel(parent, tag, hub_c, spokes=12):
    tyre = s3d.at(s3d.tube(f"Tyre_{tag}", 2 * R, 2 * R - 0.018, 0.034), on=hub_c.offset(-0.017))
    rim = s3d.at(s3d.tube(f"Rim_{tag}", 2 * R - 0.016, 2 * R - 0.05, 0.03), on=hub_c.offset(-0.015))
    hub = s3d.at(s3d.cylinder(f"Hub_{tag}", 0.065, 0.08), on=hub_c.offset(-0.04))
    spk = [s3d.at(s3d.box(f"Spoke_{tag}_{i}", 0.014, R - 0.04, 0.014), on=hub_c.turn(rz=i * 360 / spokes).move(y=(R - 0.03) / 2, z=-0.007)) for i in range(spokes)]
    s3d.material(tyre, "painted_metal", color=IRON)
    s3d.material([rim, *spk], "oak", color=WOOD)
    s3d.material(hub, "oak", color=WOOD_D)
    g = s3d.group(f"Wheel_{tag}", tyre, rim, hub, *spk)
    return s3d.joint(f"spin_{tag}", g, hub_c, kind="continuous", axis="normal")


def draisine():
    beam = s3d.at(s3d.box("Beam", 0.045, 0.7, 0.028), y=0.03, z=BEAM_Z)
    s3d.fillet(beam, 0.012)
    s3d.material(beam, "oak", color=WOOD_D)
    by = 0.03  # beam origin y (its floor centre)

    # rear fork: two flat stays from the beam's back down to the rear axle, one each side of the wheel
    stays = []
    for tag, x in (("L", -0.032), ("R", 0.032)):
        stays.append(s3d.wire(f"Stay_{tag}", [(x, AX - 0.07, BEAM_Z + 0.01), (x, AX, R)], 0.016))
        stays.append(s3d.wire(f"StayB_{tag}", [(x, AX + 0.07, BEAM_Z + 0.01), (x, AX, R)], 0.016))
    s3d.material(stays, "oak", color=WOOD_D)
    rear = wheel(beam, "R", s3d.local(beam, 0, AX - by, R - BEAM_Z, ry=90))

    # saddle: a small padded leather seat on the beam
    saddle = s3d.at(s3d.extrude("Saddle", s3d.superellipse(0.1, 0.16, n=2.6, taper=0.25), 0.016), y=0.07, z=BEAM_Z + 0.026)
    s3d.soften(saddle, 0.012)
    s3d.material(saddle, "leather", color=LEATHER)

    # armrest (balance board): a padded board on two struts in front of the saddle
    struts = [s3d.wire("Strut_F", [(0, -0.17, BEAM_Z + 0.025), (0, -0.15, 0.44)], 0.02), s3d.wire("Strut_B", [(0, -0.04, BEAM_Z + 0.025), (0, -0.08, 0.44)], 0.02)]
    s3d.material(struts, "oak", color=WOOD_D)
    board = s3d.at(s3d.box("ArmBoard", 0.13, 0.13, 0.016), y=-0.115, z=0.438)
    pad = s3d.at(s3d.extrude("ArmPad", s3d.superellipse(0.12, 0.12, n=3), 0.024), y=-0.115, z=0.452)
    s3d.soften(pad, 0.01)
    s3d.material(board, "oak", color=WOOD)
    s3d.material(pad, "leather", color=PAD)

    # front fork and steering: a crown under the beam's nose, fork legs to the axle, a column up through the beam
    # and a tiller bending back over the armrest to a cross handle
    crown = s3d.at(s3d.box("ForkCrown", 0.1, 0.05, 0.025), y=-AX, z=BEAM_Z - 0.03)
    legs = [s3d.wire(f"Fork_{t}", [(x, -AX, BEAM_Z - 0.025), (x, -AX, R)], 0.016) for t, x in (("L", -0.035), ("R", 0.035))]
    column = s3d.wire("Column", [(0, -AX, BEAM_Z - 0.02), (0, -AX, 0.44), (0, -AX + 0.03, 0.49), (0, -0.16, 0.51)], 0.02, fillet=0.03)
    handle = s3d.wire("Handle", [(-0.085, -0.16, 0.51), (0.085, -0.16, 0.51)], 0.024)
    knobs = [s3d.at(s3d.sphere(f"Knob_{t}", 0.032), x=x, y=-0.16, z=0.494) for t, x in (("L", -0.09), ("R", 0.09))]
    s3d.material([crown, *legs, column], "oak", color=WOOD_D)
    s3d.material([handle, *knobs], "oak", color=WOOD)
    collar = s3d.at(s3d.tube("Collar", 0.05, 0.03, 0.02), y=-AX, z=BEAM_Z + 0.035)
    s3d.material(collar, "brass", color=BRASS)
    steer = s3d.group("Steer", crown, *legs, column, handle, *knobs)
    s3d.joint("steer", steer, s3d.local(beam, 0, -AX - by, 0), axis="+Z", range=(-45, 45))
    front = wheel(crown, "F", s3d.local(crown, 0, 0, R - (BEAM_Z - 0.03), ry=90))
    return s3d.assembly("draisine", beam, *stays, saddle, *struts, board, pad, collar, steer, front, rear)


s3d.export(draisine(), out)
print("ok", out)
