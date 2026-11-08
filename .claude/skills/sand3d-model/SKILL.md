---
name: sand3d-model
description: Model a 3D prop for an animator/ video as a short sand3d program (Python over Blender's bpy), export it to GLB, check it in the toon look with the ModelPreview composition and show it with BlenderModel, with its moving parts posed by joint name. Use when a video needs a prop the kit primitives can't make read (a car, bicycle, boat, plane, animal, instrument, machine), when make-video's shot list calls for a modelled prop, or when the user asks to "model X", "make a 3D X", "sand3d".
---

# Model a prop with sand3d

sand3d (https://github.com/Sandflow-ai/sand3d, Apache-2.0, pinned to **1.6.2**) writes a 3D object as a short
program: named parts, profiles, solids, edits, joints, then `s3d.export(root, "x.glb")`. It replaces raw bpy for
props: shorter, readable, deterministic, and the moving parts come with their pivots and axes.

Work in `animator/`. Read `api.md` next to this file (the whole API, ~3.6k tokens) before writing a model, and
copy `guide/sand3d/car.py` (a worked example: body, cabin, lamps, four jointed wheels).

## 1. Write the program

`../videos/<slug>/sand3d/<name>.py` — the program is the source of truth: change it and run it again, never fix the
GLB by hand. Rules that keep it working with our scenes:

- **Units:** `s3d.empty_scene()` first, then `s3d.units("m")`. The other way round, `empty_scene` resets the unit to
  mm and the export comes out with a 0.001 root scale (1000× too small).
- **Frame:** Z up, the ground at z = 0, the model centred in x and y, **front toward -Y**, which becomes +Z (toward
  the camera) in three. Every solid starts at z = 0, so lift parts with `at(..., z=)`.
- **Look:** flat cartoon proportions, chunky shapes, soft edges (`fillet`, `soften`). One `s3d.material` per colour
  with a `color="#rrggbb"`. BlenderModel keeps only the base colour (and a glass's `opacity`) and turns every
  material into the kit's toon material, so roughness and metal don't show. Kind `light` gives an emissive lamp.
  Keep it under ~50k triangles.
- **Names:** every part name is unique, without dots or spaces (`Tyre_FL`, not `Tyre.FL`).
- **Moving parts:** `s3d.group` the pieces that move together, then `s3d.joint(name, group, on, kind=, axis=)`.
  `on` must be read **on the parent part**: `body.face(...)`, `s3d.bbox(body, "+X-Y")` or
  `s3d.local(body, x, y, z, rx, ry, rz)` (in the body's own space, whose origin is the body's own floor centre).
  A bare `s3d.Frame(...)` is refused. Build the part with that same frame (`on=`), so it sits on its pivot.
  Kinds: `revolute` (with `range` in degrees), `continuous` (wheels, propellers), `prismatic` (drawers, in metres).
- Only `return` the assembly from a function, then `s3d.export(model(), sys.argv[1])` at the bottom.

## 2. Export

```bash
uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/<slug>/sand3d/<name>.py public/videos/<slug>/models/<name>.glb
```

`uv` keeps sand3d and bpy 5.2 (about 400 MB, once) in its cache; nothing goes into `.venv` (Python 3.12, which bpy
doesn't support). An error from sand3d says what is wrong and how to fix it: read it, fix the program, run again.

## 3. Check it

Orbit it in a plain room, with the joints turning, at 4 angles:

```bash
for f in 0 30 60 90; do npx remotion still ModelPreview ../videos/<slug>/build/<name>_$f.png --frame=$f --scale=0.4 --log=error \
  --props='{"src":"videos/<slug>/models/<name>.glb","size":3.6,"joints":{"spin_FL":-5}}'; done
ffmpeg -loglevel error -y -i ../videos/<slug>/build/<name>_0.png -i ../videos/<slug>/build/<name>_30.png -i ../videos/<slug>/build/<name>_60.png -i ../videos/<slug>/build/<name>_90.png -filter_complex hstack=4 ../videos/<slug>/build/<name>_sheet.jpg
```

ModelPreview's default `src` is the example car, not in git; make it once with
`uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python guide/sand3d/car.py public/models/preview/car.glb`.
`size` is the model's rough length in metres (it sets the camera distance); `joints` is degrees (or metres) per
frame. Read the sheet: it reads at a glance as the thing, it stands on the floor, its front is toward the camera at
frame 0, and the jointed parts turn in place. A part that swings away from the body is on the
wrong pivot: read `on` on the right part. Fix and repeat, at most 3 rounds. Delete the build pngs afterwards.

## 4. Use it in the scene

```tsx
<BlenderModel src="videos/<slug>/models/car.glb" position={[0, 0, -1]} rotation={[0, 0.4, 0]}
  joints={{ spin_FL: deg, spin_FR: deg, spin_RL: deg, spin_RR: deg }} />
```

`joints` takes each sand3d joint by name, a value from rest per frame: degrees for revolute and continuous, metres
for prismatic, about the axis the program gave it (the GLB carries it). A model that drives moves as a whole with
`position`; turn its wheels from the distance travelled, `deg = distance / radius * 180 / Math.PI`, so they don't
skid, and check the sign in ModelPreview (for the example car's wheels, about +X, a positive angle rolls it toward +Z).
`parts` (pose by node name) still works for nodes without joints; don't pose one node through both.

Then carry on with make-video's review: Blender models must read at a glance in the stills.
