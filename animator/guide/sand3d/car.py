# Example sand3d model (a cartoon hatchback): copy to ../videos/<slug>/sand3d/<name>.py and rewrite.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python <script> public/videos/<slug>/models/<name>.glb
# Metres; Z up, the ground at z = 0, centred in x and y; front toward -Y (it faces +Z, the camera, in three).
# Moving parts hang on s3d.joint, read on the part they move on; BlenderModel's `joints` poses them by joint name.
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")  # after empty_scene, which resets the unit to mm


def wheel(body, tag, x, y, r=0.36, w=0.28):
    hub_c = s3d.local(body, x, y, r - 0.3, ry=90)  # read on the body (its origin is on its floor, z = 0.3): the joint's parent
    tyre = s3d.extrude(f"Tyre_{tag}", s3d.circle(2 * r), w, both=True, on=hub_c)
    hub = s3d.extrude(f"Hub_{tag}", s3d.circle(r), w + 0.02, both=True, on=hub_c)
    s3d.hole(hub, r / 5, on=s3d.ring(3, r / 4, on=hub_c))  # three bolt holes: the turn shows
    s3d.material(tyre, "rubber", color="#080808")
    s3d.material(hub, "painted_metal", color="#cccccc")
    g = s3d.group(f"Wheel_{tag}", tyre, hub)
    return s3d.joint(f"spin_{tag}", g, hub_c, kind="continuous", axis="normal")


def car():
    body = s3d.at(s3d.box("Body", 1.7, 3.6, 0.6), z=0.3)
    s3d.fillet(body, 0.15)
    cabin = s3d.at(s3d.box("Cabin", 1.5, 2.0, 0.55), y=0.35, z=0.875)
    s3d.fillet(cabin, 0.18)
    s3d.material([body, cabin], "glossy_plastic", color="#c0140f")
    wind = s3d.at(s3d.box("Windshield", 1.4, 0.05, 0.4), y=-0.67, z=0.97)
    s3d.material(wind, "glass", color="#5a9acc")
    lamps = [s3d.at(s3d.box(f"Lamp_{s}", 0.35, 0.05, 0.15), x=x, y=-1.81, z=0.605) for s, x in (("L", -0.6), ("R", 0.6))]
    s3d.material(lamps, "light", color="#ffe680")
    wheels = [wheel(body, t, x, y) for t, x, y in (("FL", -0.8, -1.15), ("FR", 0.8, -1.15), ("RL", -0.8, 1.15), ("RR", 0.8, 1.15))]
    return s3d.assembly("car", body, cabin, wind, *lamps, *wheels)


s3d.export(car(), out)
print("ok", out)
