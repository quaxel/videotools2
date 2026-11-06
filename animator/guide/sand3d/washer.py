# A cartoon front-loading washing machine (after sand3d's programs/washing_machine.py), articulated.
# Run: uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python guide/sand3d/washer.py public/models/preview/washer.glb
# Metres; front toward -Y. Joints: door_hinge (revolute about -Z on the door's left edge, 0-120°, + opens it outward),
# drum_spin (continuous about the porthole's axis), drawer_slide (prismatic toward -Y, 0-0.18 m), dial_turn (continuous).
import sys
import sand3d as s3d

out = sys.argv[1]
s3d.empty_scene()
s3d.units("m")  # after empty_scene, which resets the unit to mm


def washer(w=0.6, d=0.6, h=0.85, porthole=0.44, door_d=0.48, drum_d=0.42, eye=0.4):
    cab = s3d.box("Cabinet", w, d, h)
    s3d.soften(cab, 0.03)
    front = cab.face("-Y")  # X is +X, Y is up, its origin at the foot of the front
    port = front.move(0, eye)
    s3d.pocket(cab, s3d.circle(porthole), d - 0.1, on=port)
    s3d.material(cab, "plastic", color="#f4f3ee")

    # The drum, with laundry tumbling inside so the spin shows through the glass.
    back = port.offset(-(d - 0.12))
    drum = s3d.at(s3d.cylinder("Drum", drum_d, d - 0.2), on=back)
    s3d.cut(drum, s3d.at(s3d.cylinder("Bore", drum_d - 0.02, d - 0.21), on=back.offset(0.01)))
    s3d.material(drum, "brushed_steel", color="#8d969e")
    socks = []
    for i, (frame, col) in enumerate(zip(s3d.ring(4, drum_d * 0.26, on=back.offset(0.2)), ("#e04646", "#4f7dff", "#f2b630", "#2a9d8f"))):
        sock = s3d.at(s3d.sphere(f"Laundry_{i}", 0.16), on=frame)
        s3d.material(sock, "fabric", color=col)
        socks.append(sock)
    tub = s3d.group("Tub", drum, *socks)

    # The door: a dark ring, its glass seated in it, a handle on the free (+X) edge; hinged on the left (-X) edge.
    ring = s3d.at(s3d.tube("DoorRing", door_d, porthole - 0.12, 0.045), on=port)
    glass = s3d.at(s3d.cylinder("DoorGlass_noink", porthole - 0.1, 0.016), on=port.offset(0.014))
    s3d.seat(ring, glass)
    s3d.material(ring, "painted_metal", color="#3a3d42")
    s3d.material(glass, "glass", color="#bfe3ee", opacity=0.25)
    handle = s3d.at(s3d.box("DoorHandle", 0.03, 0.11, 0.03), on=s3d.bbox(ring, "-Y").move(x=door_d / 2 - 0.045))
    s3d.material(handle, "plastic", color="#c9ccd0")
    door = s3d.group("Door", ring, glass, handle)

    # The control band: soap drawer on the left, a display, the dial on the right.
    band = front.move(0, h - 0.075)
    drawer = s3d.at(s3d.box("Drawer", 0.2, 0.1, 0.231), on=band.move(-0.15).offset(-0.23))
    s3d.join(drawer, s3d.at(s3d.box("DrawerFront", 0.22, 0.09, 0.015), on=band.move(-0.15)))
    s3d.seat(cab, drawer)
    s3d.material(drawer, "plastic", color="#e2e2dc")
    display = s3d.at(s3d.box("Display", 0.09, 0.04, 0.006), on=band.move(0.03))
    s3d.material(display, "light", color="#7cf2a0")
    dial = s3d.at(s3d.cylinder("Dial", 0.07, 0.035), on=band.move(0.18).offset(-0.01))
    s3d.join(dial, s3d.at(s3d.box("DialTick", 0.01, 0.03, 0.01), on=band.move(0.18, 0.012).offset(0.025)))
    s3d.seat(cab, dial)
    s3d.material(dial, "plastic", color="#c9ccd0")

    s3d.joint("door_hinge", door, front.move(-door_d / 2, eye).offset(0.045), axis="-Z", range=(0, 120))
    s3d.joint("drum_spin", tub, port, kind="continuous")
    s3d.joint("drawer_slide", drawer, band.move(-0.15), kind="prismatic", axis="-Y", range=(0, 0.18))
    s3d.joint("dial_turn", dial, band.move(0.18), kind="continuous")
    return s3d.assembly("washer", cab, tub, door, drawer, display, dial)


s3d.export(washer(), out)
print("ok", out)
