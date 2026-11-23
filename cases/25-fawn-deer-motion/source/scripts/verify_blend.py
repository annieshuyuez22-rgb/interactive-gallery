import bpy
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
scene = bpy.context.scene
rig = bpy.data.objects['DeerRig']
mesh = bpy.data.objects['Deer']
assert scene.render.resolution_x == 1280 and scene.render.resolution_y == 720
assert scene.render.fps == 24 and scene.frame_end == 65
assert scene.camera and scene.camera.data.lens == 50
assert abs(rig.rotation_euler.x) < 1e-6 and abs(rig.rotation_euler.y) < 1e-6 and abs(rig.rotation_euler.z) < 1e-6
assert len(rig.data.bones) == 14 and len(mesh.data.vertices) == 49714
assert len(bpy.data.actions) >= 2
images = [image for image in bpy.data.images if image.source == 'FILE']
assert images and all(image.packed_file for image in images)
material = bpy.data.materials['model']
assert any(node.type == 'TEX_NOISE' for node in material.node_tree.nodes)
assert any(node.type == 'BUMP' for node in material.node_tree.nodes)
report = {
    'file': bpy.data.filepath,
    'resolution': [scene.render.resolution_x, scene.render.resolution_y],
    'fps': scene.render.fps,
    'frame_range': [scene.frame_start, scene.frame_end],
    'camera_lens': scene.camera.data.lens,
    'mesh_vertices': len(mesh.data.vertices),
    'rig_bones': len(rig.data.bones),
    'actions': [action.name for action in bpy.data.actions],
    'packed_images': [image.name for image in images],
    'render_engine': scene.render.engine,
    'samples': scene.eevee.taa_render_samples,
    'status': 'PASS',
}
(ROOT / 'out' / 'blend_validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2))
print(json.dumps(report, ensure_ascii=False))
