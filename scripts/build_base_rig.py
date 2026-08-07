"""
flux-chamber / MANIFOLD Core Architecture
File: scripts/build_base_rig.py

Blender Python automation script to generate an Avatar Armature metarig,
bind base geometry, and export GLTF assets for flux-chamber ingestion.

Run via Blender CLI:
    blender --background --python scripts/build_base_rig.py -- --out Avatar_BaseMesh_V1.gltf
"""

import sys
import argparse
import bpy


def setup_scene_units():
    """Configures scene units to metric (meters) with 1.0 unit scale."""
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0


def create_avatar_armature(armature_name="Avatar_Armature_GOVERNOR"):
    """Creates a basic humanoid armature with root, spine, neck, head, and limb bones."""
    # Create Armature object
    armature_data = bpy.data.armatures.new(f"{armature_name}_Data")
    armature_obj = bpy.data.objects.new(armature_name, armature_data)
    
    bpy.context.collection.objects.link(armature_obj)
    bpy.context.view_layer.objects.active = armature_obj
    
    bpy.ops.object.mode_set(mode='EDIT')
    
    # Bone hierarchy configuration
    bones_spec = [
        ("root", (0.0, 0.0, 0.0), (0.0, 0.0, 0.1), None),
        ("spine", (0.0, 0.0, 0.9), (0.0, 0.0, 1.4), "root"),
        ("neck", (0.0, 0.0, 1.4), (0.0, 0.0, 1.6), "spine"),
        ("head", (0.0, 0.0, 1.6), (0.0, 0.0, 1.85), "neck"),
        ("arm.L", (0.2, 0.0, 1.4), (0.5, 0.0, 1.4), "spine"),
        ("arm.R", (-0.2, 0.0, 1.4), (-0.5, 0.0, 1.4), "spine"),
        ("leg.L", (0.1, 0.0, 0.9), (0.1, 0.0, 0.0), "root"),
        ("leg.R", (-0.1, 0.0, 0.9), (-0.1, 0.0, 0.0), "root"),
    ]
    
    edit_bones = armature_data.edit_bones
    created_bones = {}
    
    for bone_name, head, tail, parent_name in bones_spec:
        bone = edit_bones.new(bone_name)
        bone.head = head
        bone.tail = tail
        created_bones[bone_name] = bone
        if parent_name and parent_name in created_bones:
            bone.parent = created_bones[parent_name]
            
    bpy.ops.object.mode_set(mode='OBJECT')
    return armature_obj


def create_and_bind_basemesh(armature_obj, mesh_name="Avatar_BaseMesh"):
    """Creates a primitive mesh container and binds it to the armature using automatic weights."""
    # Create simple cylinder/capsule mesh placeholder
    bpy.ops.mesh.primitive_cylinder_add(
        radius=0.25,
        depth=1.8,
        location=(0.0, 0.0, 0.9)
    )
    mesh_obj = bpy.context.active_object
    mesh_obj.name = mesh_name
    
    # Set origin to foot ground level (0, 0, 0)
    bpy.context.scene.cursor.location = (0.0, 0.0, 0.0)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
    
    # Select mesh and armature, parent with automatic weights
    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    armature_obj.select_set(True)
    bpy.context.view_layer.objects.active = armature_obj
    
    bpy.ops.object.parent_set(type='ARMATURE_AUTO')
    return mesh_obj


def export_gltf(output_filepath):
    """Exports scene objects to GLTF 2.0 format with skins, normals, tangents, and animation support."""
    bpy.ops.export_scene.gltf(
        filepath=output_filepath,
        export_format='GLTF_EMBEDDED',
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=True,
        export_skins=True,
        export_animations=True
    )
    print(f"[MANIFOLD] Successfully exported rig asset to: {output_filepath}")


def main():
    # Parse CLI arguments passed after '--'
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
        
    parser = argparse.ArgumentParser(description="MANIFOLD Base Rig Builder")
    parser.add_argument("--out", default="Avatar_BaseMesh_V1.gltf", help="Output GLTF file path")
    args = parser.parse_args(argv)

    # Clean scene
    bpy.ops.wm.read_factory_settings(use_empty=True)

    setup_scene_units()
    armature = create_avatar_armature()
    create_and_bind_basemesh(armature)
    export_gltf(args.out)


if __name__ == "__main__":
    main()
