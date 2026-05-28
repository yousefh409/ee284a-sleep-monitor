"""
Sleep monitor housing - Phase 3.
Adds (from Phase 2):
  - Rounded vertical corners (fillet)
  - Taller overall height (50 mm)
  - Debossed "Stanford" on the top face
  - Front face right: rectangular opening for sensors (LDR / mic / BME280 to look out)
  - Ball joint base glues to the top face (no built-in mount); C1001 cable enters
    the cavity through the same open +X short end as the USB cables.

Print orientation: bottom face on the bed, top face up. All features print
with no support: top deboss prints cleanly, front-face cutouts print as
vertical openings, open short end is a vertical edge.

Wall mount: adhesive (Command strips / double-sided tape) on the back (-Y) face.
"""
import cadquery as cq

# ============================================================
# PARAMETERS
# ============================================================
# Internal cavity (sized to fit breadboard + breakouts + battery)
bb_l = 165.0
bb_w = 55.0
bb_h = 9.0
top_clearance = 28.0
batt_clearance = 8.0
side_clearance = 1.8   # bumped 0.8 -> 1.8 (+2 mm total each direction)

cavity_l = bb_l + 2 * side_clearance   # 168.6
cavity_w = bb_w + 2 * side_clearance   # 58.6
cavity_h = bb_h + top_clearance + batt_clearance   # 45.0

# Outer structure — now closed on ALL sides; +X end has a window with a ledge
wall = 2.5
outer_l = cavity_l + 2 * wall          # +X end now closed wall too
outer_w = cavity_w + 2 * wall
outer_h = cavity_h + 2 * wall          # 50.0

# Aperture window on the +X face (the access slot for breadboard insertion)
aperture_ledge = 1.5                   # mm uniform ledge on all 4 sides
aperture_w = cavity_w - 2 * aperture_ledge   # 55.6 - clears 55 mm breadboard
aperture_h = cavity_h - 2 * aperture_ledge   # 42.0

# Corner round
corner_r = 5.0     # mm - radius on the 4 vertical edges

# Stanford logo deboss
logo_text = "STANFORD"
logo_fontsize = 18.0
logo_depth = 0.8   # mm - deboss depth

# Sensor opening (front face, LEFT half — opposite the open +X aperture end)
sensor_center_x = -outer_l / 4
sensor_center_z = outer_h / 2
sensor_w = 39.0                      # X extent (1.5x of 26)
sensor_h = 21.0                      # Z extent (1.5x of 14)

# Open-end chamfer ("caved in" recessed opening look)
open_chamfer = 1.2                   # mm - must be < wall thickness (2.5 mm)

# ============================================================
# MODEL
# ============================================================
# Outer block with rounded vertical edges (fillet BEFORE cuts per the skill rule)
outer = (
    cq.Workplane("XY")
    .box(outer_l, outer_w, outer_h, centered=(True, True, False))
    .edges("|Z")
    .fillet(corner_r)
)

# Cavity — fully enclosed (all 6 walls present); +X wall has a window in it
# Cavity is centered in X within the outer box
cavity = (
    cq.Workplane("XY")
    .workplane(offset=wall)
    .box(cavity_l, cavity_w, cavity_h, centered=(True, True, False))
)

# Aperture window through the +X wall (breadboard slides in/out here, framed by the ledge)
aperture = (
    cq.Workplane("XY")
    .box(wall * 4, aperture_w, aperture_h, centered=(True, True, True))
    .translate((outer_l / 2, 0, outer_h / 2))
)

# Sensor opening on the front face (right half) — through-hole
sensor_opening = (
    cq.Workplane("XY")
    .box(sensor_w, wall * 4, sensor_h, centered=(True, True, True))
    .translate((sensor_center_x, outer_w / 2, sensor_center_z))
)

# Apply cavity + aperture + sensor opening
result = (
    outer
    .cut(cavity)
    .cut(aperture)
    .cut(sensor_opening)
)

# Chamfer the aperture's inner edges so the framed window looks recessed.
result = (
    result
    .edges(">>X")
    .edges("|Y or |Z")
    .chamfer(open_chamfer)
)

# Debossed Stanford text on the top face (+Z), rotated 180° around Z so it
# faces the other way (readable from the opposite long edge of the housing)
result = (
    result.faces(">Z")
    .workplane(centerOption="CenterOfBoundBox")
    .transformed(rotate=(0, 0, 180))
    .text(
        logo_text,
        fontsize=logo_fontsize,
        distance=-logo_depth,
        font="Arial",
        kind="bold",
        halign="center",
        valign="center",
    )
)

# ============================================================
# EXPORT
# ============================================================
cq.exporters.export(result, "housing_phase3.stl",
                    tolerance=0.01, angularTolerance=0.1)
print(f"Exported housing_phase3.stl")
print(f"  Outer: {outer_l:.1f} x {outer_w:.1f} x {outer_h:.1f} mm")
print(f"  Cavity: {cavity_l:.1f} x {cavity_w:.1f} x {cavity_h:.1f} mm")
print(f"  Aperture (+X): {aperture_w:.1f} x {aperture_h:.1f} mm window, {aperture_ledge} mm ledge frame")
print(f"  Corner fillet: {corner_r} mm")
print(f"  Sensor opening: {sensor_w} x {sensor_h} mm through-hole")
