import argparse
import bpy
import json
import math
import sys
import time
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--tag', default='refined')
parser.add_argument('--yaw', type=float, default=0.0)
parser.add_argument('--pitch', type=float, default=0.0)
parser.add_argument('--sun-dir', default=None)
parser.add_argument('--sun-angle', type=float, default=None)
parser.add_argument('--sun-energy', type=float, default=3.5)
parser.add_argument('--fill-energy', type=float, default=500.0)
parser.add_argument('--world-strength', type=float, default=0.6)
parser.add_argument('--exposure', type=float, default=0.0)
parser.add_argument('--samples', type=int, default=64)
parser.add_argument('--shadow-rays', type=int, default=1)
parser.add_argument('--shadow-steps', type=int, default=6)
parser.add_argument('--ao', action='store_true')
parser.add_argument('--ao-distance', type=float, default=0.35)
parser.add_argument('--ao-quality', type=float, default=1.0)
parser.add_argument('--fur-strength', type=float, default=0.0)
parser.add_argument('--sheen', type=float, default=0.0)
parser.add_argument('--specular', type=float, default=0.5)
parser.add_argument('--motion-blur', action='store_true')
parser.add_argument('--all', action='store_true')
parser.add_argument('--start', type=int, default=1)
parser.add_argument('--frames', default=None)
parser.add_argument('--save', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
scene = bpy.context.scene
rig = bpy.data.objects['DeerRig']
rig.rotation_euler = (0.0, math.radians(args.pitch), math.radians(args.yaw))
sun = bpy.data.objects['KeySun']
if args.sun_dir:
    direction = Vector(tuple(float(v) for v in args.sun_dir.split(',')))
    sun.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
if args.sun_angle is not None:
    sun.data.angle = args.sun_angle
sun.data.energy = args.sun_energy
bpy.data.objects['SkyFill'].data.energy = args.fill_energy
scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value = args.world_strength
scene.view_settings.exposure = args.exposure
scene.eevee.taa_render_samples = args.samples
scene.eevee.shadow_ray_count = args.shadow_rays
scene.eevee.shadow_step_count = args.shadow_steps
scene.eevee.use_gtao = args.ao
scene.eevee.gtao_distance = args.ao_distance
scene.eevee.gtao_quality = args.ao_quality
if hasattr(scene.render, 'use_motion_blur'):
    scene.render.use_motion_blur = args.motion_blur
    if args.motion_blur and hasattr(scene.render, 'motion_blur_shutter'):
        scene.render.motion_blur_shutter = 0.25
material = bpy.data.materials['model']
bsdf = next(n for n in material.node_tree.nodes if n.type == 'BSDF_PRINCIPLED')
bsdf.inputs['Specular IOR Level'].default_value = args.specular
bsdf.inputs['Sheen Weight'].default_value = args.sheen
bsdf.inputs['Sheen Roughness'].default_value = 0.65
if args.fur_strength > 0:
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    normal_map = next(n for n in nodes if n.type == 'NORMAL_MAP')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 220.0
    noise.inputs['Detail'].default_value = 2.0
    noise.inputs['Roughness'].default_value = 0.65
    bump = nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = args.fur_strength
    bump.inputs['Distance'].default_value = 0.002
    links.new(noise.outputs['Fac'], bump.inputs['Height'])
    links.new(normal_map.outputs['Normal'], bump.inputs['Normal'])
    links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
scene.render.image_settings.file_format = 'PNG'
scene.render.image_settings.color_mode = 'RGB'
scene.render.image_settings.color_depth = '8'
scene.render.film_transparent = False
if args.save:
    for image in bpy.data.images:
        if image.source == 'FILE' and not image.packed_file:
            image.pack()
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'assets' / '1021-小鹿-v1.blend'))
frames = range(args.start, 66) if args.all else tuple(int(v) for v in args.frames.split(',')) if args.frames else (1, 13, 33, 49, 65)
report = {'parameters': vars(args), 'frames': []}
for frame in frames:
    scene.frame_set(frame)
    path = ROOT / 'frames' / f'{frame:04d}.png' if args.all else ROOT / 'previews' / f'{args.tag}-f{frame:03d}.png'
    scene.render.filepath = str(path)
    start = time.monotonic()
    bpy.ops.render.render(write_still=True)
    elapsed = time.monotonic() - start
    report['frames'].append({'frame': frame, 'seconds': round(elapsed, 3)})
    print(f'{args.tag} frame={frame} seconds={elapsed:.3f}', flush=True)
report_path = ROOT / 'out' / 'render_report.json' if args.all else ROOT / 'previews' / f'{args.tag}-render.json'
report_path.write_text(json.dumps(report, indent=2))
