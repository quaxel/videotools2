# Example Blender model script (a cartoon hatchback): copy to videos/<slug>/blender/<name>.py and rewrite.
# Run: /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup -P <script> -- public/videos/<slug>/models/<name>.glb
# Units: metres, origin on the ground under the model's centre, front toward Blender -Y (faces +Z, the camera, in three).
# Moving parts (Wheel_FL ...) are their own objects with rotation applied and the origin on the pivot.
import bpy, sys
out = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, rgb):
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*rgb, 1)
    return m
RED, GLASS, TYRE, HUB, LAMP = mat("Body", (0.75, 0.08, 0.06)), mat("Glass", (0.35, 0.6, 0.8)), mat("Tyre", (0.03, 0.03, 0.03)), mat("Hub", (0.8, 0.8, 0.8)), mat("Lamp", (1, 0.9, 0.5))

def rounded_box(name, size, loc, m, bevel=0.08):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object; o.name = name; o.scale = [s / 2 for s in size]
    bpy.ops.object.transform_apply(scale=True)
    b = o.modifiers.new("bevel", "BEVEL"); b.width = bevel; b.segments = 4
    o.data.materials.append(m); bpy.ops.object.shade_smooth(); return o

rounded_box("Body", (1.7, 3.6, 0.6), (0, 0, 0.6), RED, 0.15)
rounded_box("Cabin", (1.5, 2.0, 0.55), (0, 0.35, 1.15), RED, 0.18)
rounded_box("Windshield", (1.4, 0.05, 0.4), (0, -0.67, 1.17), GLASS, 0.02)
for x in (-0.6, 0.6):
    rounded_box(f"Lamp_{'L' if x < 0 else 'R'}", (0.35, 0.05, 0.15), (x, -1.81, 0.68), LAMP, 0.02)
for nm, x, y in (("FL", -0.8, -1.15), ("FR", 0.8, -1.15), ("RL", -0.8, 1.15), ("RR", 0.8, 1.15)):
    bpy.ops.mesh.primitive_cylinder_add(radius=0.36, depth=0.28, location=(x, y, 0.36), rotation=(0, 1.5708, 0), vertices=40)
    w = bpy.context.object; w.name = f"Wheel_{nm}"; w.data.materials.append(TYRE); bpy.ops.object.transform_apply(rotation=True); bpy.ops.object.shade_smooth()
    bpy.ops.mesh.primitive_cylinder_add(radius=0.18, depth=0.3, location=(x, y, 0.36), rotation=(0, 1.5708, 0), vertices=24)
    h = bpy.context.object; h.name = f"Hub_{nm}"; h.data.materials.append(HUB); bpy.ops.object.transform_apply(rotation=True); h.parent = w; h.matrix_parent_inverse = w.matrix_world.inverted()
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True)
