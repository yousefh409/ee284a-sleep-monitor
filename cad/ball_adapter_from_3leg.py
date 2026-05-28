"""
Crop the proven GoPro 3-leg STL to keep only the M10 thread + body portion.
Drops the prongs entirely. Output is a known-good M10-threaded part with a
flat bottom for gluing the C1001 holder to.

Uses trimesh + a boolean intersection (mesh-on-mesh) instead of CadQuery
because the input is an STL mesh, not parametric geometry.
"""
import trimesh
import numpy as np
import os

SRC = "joint/GoPro connector 3leg for 18mm ball joint.stl"
DST = "ball_adapter_cropped.stl"

# How tall to KEEP (measured from the top of the 3-leg, i.e. the M10 thread end).
# The original 3-leg is 41.5 mm tall. The M10 thread + body together are ~22 mm.
# The fingers are the bottom ~19 mm. We keep the top 22 mm.
KEEP_HEIGHT_FROM_TOP = 22.0   # mm

# Load
mesh = trimesh.load(SRC)
print(f"Loaded: {mesh.bounds[0]} -> {mesh.bounds[1]}")
print(f"Extents (x,y,z): {mesh.extents}")

# Original Z range
z_min, z_max = mesh.bounds[0, 2], mesh.bounds[1, 2]
print(f"Z range: {z_min:.2f} -> {z_max:.2f}")

# Crop plane: keep everything with z >= (z_max - KEEP_HEIGHT_FROM_TOP)
cut_z = z_max - KEEP_HEIGHT_FROM_TOP
print(f"Cropping plane at z = {cut_z:.2f} (keep z >= cut_z)")

# Slice the mesh at the plane
# trimesh.intersections.slice_mesh_plane keeps the side toward the normal
cropped = trimesh.intersections.slice_mesh_plane(
    mesh,
    plane_normal=[0, 0, 1],     # keep +Z side (the M10 thread side)
    plane_origin=[0, 0, cut_z],
    cap=True,                    # close the new bottom with a flat cap
)

if cropped is None or len(cropped.vertices) == 0:
    print("ERROR: crop produced empty mesh")
    exit(1)

print(f"Cropped extents (x,y,z): {cropped.extents}")
print(f"Cropped watertight: {cropped.is_watertight}")

# Recenter at origin so the part sits with its flat cut face on the bed
cropped.apply_translation([
    -cropped.bounds[0, 0] - cropped.extents[0] / 2,
    -cropped.bounds[0, 1] - cropped.extents[1] / 2,
    -cropped.bounds[0, 2],
])

cropped.export(DST)
print(f"Exported: {DST}")
print(f"  Final extents: {cropped.extents}")
