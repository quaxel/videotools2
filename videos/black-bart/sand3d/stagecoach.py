# A Concord stagecoach at cartoon scale next to 1.3 m puppets: a rounded red body hung between two axles, yellow
# spoked wheels (bigger at the back), the driver's box up front, a luggage rail on the roof and a leather boot at the
# back. Metres, Z up, ground at z = 0, the horses' end (front) toward -Y. Joints spin_FL, spin_FR, spin_RL, spin_RR
# (continuous, about the axle) and door (revolute, the left-side door, 0 = shut, up to 100).
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/black-bart/sand3d/stagecoach.py public/videos/black-bart/models/stagecoach.glb
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")

RED, DARKRED, YELLOW, BLACK, LEATHER, WOOD = "#b8281e", "#7a1812", "#e8b030", "#1a1614", "#5a3420", "#6a4a2e"


def wheel(chassis, tag, x, y, r, spokes=12):
    hub_c = s3d.local(chassis, x, y, r - 0.48, ry=90)  # read on the chassis (its floor is at z = 0.48)
    rim = s3d.at(s3d.tube(f"Rim_{tag}", 2 * r, 2 * r - 0.07, 0.06), on=hub_c)
    hub = s3d.at(s3d.cylinder(f"Hub_{tag}", 0.16, 0.12), on=hub_c.offset(-0.03))
    spk = [s3d.at(s3d.box(f"Spoke_{tag}_{i}", 0.03, r - 0.04, 0.03), on=hub_c.turn(rz=i * 360 / spokes).move(y=(r - 0.04) / 2, z=0.015)) for i in range(spokes)]
    s3d.material([rim, *spk], "painted_metal", color=YELLOW)
    s3d.material(hub, "painted_metal", color=BLACK)
    g = s3d.group(f"Wheel_{tag}", rim, hub, *spk)
    return s3d.joint(f"spin_{tag}", g, hub_c, kind="continuous", axis="normal")


def coach():
    chassis = s3d.at(s3d.box("Chassis", 0.9, 2.5, 0.08), z=0.48)
    s3d.material(chassis, "painted_metal", color=BLACK)
    # the body: an egg-shaped box, narrow at the bottom, rounded at the ends
    body = s3d.loft(
        "Body",
        s3d.station(0.0, 1.0, 1.25, n=3),
        s3d.station(0.35, 1.18, 1.7, n=3),
        s3d.station(1.0, 1.25, 1.72, n=3),
        s3d.station(1.12, 1.22, 1.6, n=3),
    )
    s3d.at(body, z=0.62)
    s3d.material(body, "glossy_plastic", color=RED)
    roof = s3d.at(s3d.box("Roof", 1.34, 1.74, 0.06), z=1.76)
    s3d.fillet(roof, 0.02)
    s3d.material(roof, "painted_metal", color=DARKRED)
    rails = [s3d.at(s3d.box(f"Rail_{s}", 0.03, 1.6, 0.12), x=s * 0.62, z=1.82) for s in (-1, 1)]
    s3d.material(rails, "painted_metal", color=BLACK)
    trunks = [s3d.at(s3d.box(f"Trunk_{i}", 0.5, 0.42, 0.26), x=x, y=y, z=1.82) for i, (x, y) in enumerate(((-0.25, -0.35), (0.28, 0.3)))]
    for t in trunks:
        s3d.fillet(t, 0.03)
    s3d.material(trunks, "leather", color="#8a5a30")
    # windows: dark panes on each side, a gold stripe below
    wins = []
    for s in (-1, 1):
        for i, y in enumerate((-0.48, 0.48)):
            wins.append(s3d.at(s3d.box(f"Win_{'L' if s < 0 else 'R'}{i}", 0.04, 0.42, 0.36), x=s * 0.63, y=y, z=1.25))
    s3d.material(wins, "glass", color="#2a2a3a")
    stripes = [s3d.at(s3d.box(f"Stripe_{s}", 0.03, 1.62, 0.05), x=s * 0.63, z=0.98) for s in ("L", "R") for s in [(-1 if s == "L" else 1)]]
    s3d.material(stripes, "painted_metal", color=YELLOW)
    # the driver's box and footboard at the front, the leather boot at the back
    seat = s3d.at(s3d.box("DriverSeat", 1.1, 0.4, 0.12), y=-1.02, z=1.5)
    back = s3d.at(s3d.box("SeatBack", 1.1, 0.06, 0.3), y=-0.84, z=1.6)
    foot = s3d.at(s3d.box("Footboard", 1.1, 0.5, 0.05), y=-1.32, z=1.1)
    s3d.material([seat, back, foot], "walnut", color=WOOD)
    boot = s3d.at(s3d.box("Boot", 1.0, 0.45, 0.6), y=1.05, z=0.75)
    s3d.fillet(boot, 0.08)
    s3d.material(boot, "leather", color=LEATHER)
    # the door on the left side, hinged at its front edge
    hinge = s3d.local(body, -0.64, -0.25, 0.25)
    door = s3d.at(s3d.box("Door", 0.05, 0.5, 0.85), x=-0.645, y=0.0, z=0.95)
    s3d.material(door, "glossy_plastic", color=DARKRED)
    s3d.joint("door", door, hinge, kind="revolute", axis="+Z", range=(0, 100))
    pole = s3d.at(s3d.box("Pole", 0.08, 1.4, 0.08), y=-1.85, z=0.55)
    s3d.material(pole, "walnut", color=WOOD)
    wheels = [wheel(chassis, t, x, y, r) for t, x, y, r in (("FL", -0.62, -0.85, 0.42), ("FR", 0.62, -0.85, 0.42), ("RL", -0.66, 0.85, 0.52), ("RR", 0.66, 0.85, 0.52))]
    return s3d.assembly("stagecoach", chassis, body, roof, *rails, *trunks, *wins, *stripes, seat, back, foot, boot, door, pole, *wheels)


s3d.export(coach(), out)
print("ok", out)
