---
name: sand3d-model
description: Model a 3D prop for an animator/ video as a short sand3d program (Python over Blender's bpy), export it to GLB, check it in the toon look with the ModelPreview composition and show it with BlenderModel, with its moving parts posed by joint name. Use when a video needs a prop the kit primitives can't make read (a car, bicycle, boat, plane, animal, instrument, machine), when make-video's shot list calls for a modelled prop, or when the user asks to "model X", "make a 3D X", "sand3d".
---

# Model a prop with sand3d

sand3d (https://github.com/Sandflow-ai/sand3d, Apache-2.0, pinned to **1.6.2**) writes a 3D object as a short program
of named parts, solids, edits and joints, exported to GLB with its pivots and axes. Work in `animator/`. Read `api.md`
next to this file (the whole API) first, and copy `guide/sand3d/car.py` (body, cabin, lamps, four jointed wheels); `coupe.py` and `washer.py` there are
further examples.

## 1. Write `../videos/<slug>/sand3d/<name>.py`

The program is the source: change it and run it again, never fix the GLB by hand.

- **Units:** `s3d.empty_scene()` first, then `s3d.units("m")`; the other way round the export is 1000× too small.
- **Frame:** Z up, ground at z = 0, centred in x and y, **front toward -Y** (it becomes +Z, toward the camera). Every
  solid starts at z = 0: lift parts with `at(..., z=)`.
- **Look:** chunky cartoon shapes with soft edges (`fillet`, `soften`), one `s3d.material(color="#rrggbb")` per colour.
  BlenderModel keeps only the base colour (and a glass's `opacity`) in the toon material; kind `light` is an emissive
  lamp. Under ~50k triangles.
- **Names:** unique, no dots or spaces (`Tyre_FL`).
- **Joints:** `s3d.group` the pieces that move together, then `s3d.joint(name, group, on, kind=, axis=)` with `on`
  read on the parent part (`body.face(...)`, `s3d.bbox(body, "+X-Y")` or `s3d.local(body, x, y, z, rx, ry, rz)` from
  the body's floor centre; a bare `s3d.Frame` is refused), and build the part on that same frame. Kinds: `revolute`
  (`range` in degrees), `continuous` (wheels), `prismatic` (metres), `free`. A part that turns with another (a chain
  wheel) takes `follows=` and `ratio=`.
- Return the assembly from a function and end with `s3d.export(model(), sys.argv[1])`.

## 2. Export

```bash
uv run -q --no-project --python 3.13 --with sand3d==1.6.2 python ../videos/<slug>/sand3d/<name>.py public/videos/<slug>/models/<name>.glb
```

`uv` caches sand3d and bpy 5.2 (~400 MB, once), outside `.venv`. sand3d's errors say what to fix.

## 3. Check

Four angles with the joints turning, side by side:

```bash
B=../videos/<slug>/build; for f in 0 30 60 90; do npx remotion still ModelPreview $B/<name>_$f.png --frame=$f --scale=0.4 --log=error \
  --props='{"src":"videos/<slug>/models/<name>.glb","size":3.6,"joints":{"spin_FL":-5}}'; done
ffmpeg -loglevel error -y -pattern_type glob -i "$B/<name>_*.png" -vf tile=4x1 $B/<name>_sheet.jpg
```

`size` is the rough length in metres (camera distance); `joints` is degrees (or metres) per frame. The default `src`
is the example car, not in git: make it once with the export command on `guide/sand3d/car.py` →
`public/models/preview/car.glb`. The sheet must read at a glance as the thing, stand on the floor, face the camera at
frame 0 and turn its joints in place (a part swinging away is on the wrong pivot: read `on` on the right part). At
most 3 rounds; delete the pngs afterwards.

## 4. Use it

```tsx
<BlenderModel src="videos/<slug>/models/car.glb" position={[0, 0, -1]} rotation={[0, 0.4, 0]}
  joints={{ spin_FL: deg, spin_FR: deg, spin_RL: deg, spin_RR: deg }} />
```

`joints` takes each joint by name, a value from rest per frame (degrees, or metres for prismatic). A driving model
moves with `position` and turns its wheels by the distance, `deg = distance / radius * 180 / Math.PI`; check the sign
in ModelPreview (the example car rolls toward +Z on a positive angle). `parts` poses nodes without joints; never pose
one node both ways. The stills review then checks that the model reads at a glance.
