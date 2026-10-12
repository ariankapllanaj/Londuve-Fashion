"""
LONDUVE — N°01 COURAGE bottle
Procedural Blender model (Blender 4.2+ / 5.x).

Run headless:
    blender -b -P build_bottle.py
or open Blender > Scripting > open this file > Run Script.

Outputs (next to this script):
    courage_bottle.blend   – full scene (bottle, pedestal, lights, camera) for Cycles renders
    ../public/models/courage.glb – web-ready bottle used by the Three.js site

Units: 1.0 = bottle body radius (the body is ~2.45 tall, cap ~1.18 tall).
Object names are referenced by the website — keep them if you edit:
    Glass, Liquid, Cap, Collar, Tube, Label
"""
import bpy, bmesh, math, os
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
LABEL_PNG = os.path.join(HERE, "..", "public", "models", "label.png")
GLB_OUT = os.path.join(HERE, "..", "public", "models", "courage.glb")
BLEND_OUT = os.path.join(HERE, "courage_bottle.blend")
RENDER_OUT = os.path.join(HERE, "courage_render.png")

# ---------------------------------------------------------------- dimensions
R = 1.0          # body outer radius
HB = 2.45        # body height (glass shoulder top)
RB = 0.07        # bottom outer fillet
RT = 0.10        # shoulder outer fillet
TB = 0.58        # thick clear base
TT = 0.12        # top glass thickness
WALL = 0.055     # side wall thickness
RI = R - WALL    # inner cavity radius
RIF = 0.06       # inner fillets
NECK_R = 0.36    # glass neck outer radius
NECK_IN = 0.17   # bore radius
NECK_H = 0.14
FILL = 2.03      # liquid surface height
COLLAR_R, COLLAR_Z0, COLLAR_Z1 = 0.43, HB - 0.005, HB + 0.17
CAP_R, CAP_Z0, CAP_Z1 = 0.60, COLLAR_Z1, COLLAR_Z1 + 1.18
LABEL_R = R + 0.0025
LABEL_ANG = math.radians(40)          # half-angle
LABEL_TOP = 1.715
LABEL_H = (2 * LABEL_ANG * LABEL_R) * 960 / 1024   # keep texture aspect (1024x960)
SEG = 128


def arc(cx, cz, r, a0, a1, n=10):
    """points on an arc in the XZ profile plane (angles in degrees)"""
    pts = []
    for i in range(n + 1):
        a = math.radians(a0 + (a1 - a0) * i / n)
        pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    return pts


def lathe(name, profile, seg=SEG, smooth_angle=40):
    """Revolve an (r, z) polyline around Z into a closed mesh object."""
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    verts = [bm.verts.new((r, 0.0, z)) for r, z in profile]
    edges = [bm.edges.new((verts[i], verts[i + 1])) for i in range(len(verts) - 1)]
    bmesh.ops.spin(bm, geom=verts + edges, cent=(0, 0, 0), axis=(0, 0, 1),
                   angle=math.tau, steps=seg, use_duplicate=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    for p in me.polygons:
        p.use_smooth = True
    add_smooth_by_angle(ob, smooth_angle)
    return ob


def add_smooth_by_angle(ob, angle_deg):
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    try:
        bpy.ops.object.shade_smooth_by_angle(angle=math.radians(angle_deg))
    except Exception:
        try:
            bpy.ops.object.shade_auto_smooth(angle=math.radians(angle_deg))
        except Exception:
            pass
    ob.select_set(False)


def cylindrical_uv(ob, z0, z1, u_scale=1.0):
    me = ob.data
    uv = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        us = []
        for li in poly.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            u = (math.atan2(co.y, co.x) / math.tau + 0.5) * u_scale
            us.append(u)
        # fix seam wrap
        if max(us) - min(us) > 0.5 * u_scale:
            us = [u + u_scale if u < 0.5 * u_scale else u for u in us]
        for li, u in zip(poly.loop_indices, us):
            co = me.vertices[me.loops[li].vertex_index].co
            uv.data[li].uv = (u, (co.z - z0) / (z1 - z0))


# ---------------------------------------------------------------- scene reset
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'

# ---------------------------------------------------------------- GLASS
glass_profile = [(0.0, 0.0), (R - RB, 0.0)]
glass_profile += arc(R - RB, RB, RB, -90, 0, 8)[1:]
glass_profile += arc(R - RT, HB - RT, RT, 0, 90, 10)
glass_profile += [(NECK_R + 0.02, HB)]
glass_profile += arc(NECK_R, HB + 0.02, 0.02, -90, 0, 4)[1:]
glass_profile += [(NECK_R, HB + NECK_H - 0.015)]
glass_profile += arc(NECK_R - 0.015, HB + NECK_H - 0.015, 0.015, 0, 90, 4)[1:]
glass_profile += [(NECK_IN, HB + NECK_H), (NECK_IN, HB - TT)]
glass_profile += arc(RI - RIF, HB - TT - RIF, RIF, 90, 0, 8)
glass_profile += arc(RI - RIF, TB + RIF, RIF, 0, -90, 8)
glass_profile += [(0.0, TB)]
glass = lathe("Glass", glass_profile, smooth_angle=50)

# ---------------------------------------------------------------- LIQUID
e = 0.006
liq_profile = [(0.0, TB + e)]
liq_profile += arc(RI - RIF, TB + RIF, RIF - e, -90, 0, 8)
liq_profile += [(RI - e, FILL + 0.012)]
liq_profile += arc(RI - e - 0.03, FILL + 0.012, 0.03, 0, 60, 4)[1:]   # meniscus
liq_profile += [(RI * 0.75, FILL + 0.002), (0.0, FILL)]
liquid = lathe("Liquid", liq_profile, smooth_angle=60)

# ---------------------------------------------------------------- COLLAR (crimp ring)
col_profile = [(NECK_IN + 0.01, COLLAR_Z0), (COLLAR_R - 0.02, COLLAR_Z0)]
col_profile += arc(COLLAR_R - 0.02, COLLAR_Z0 + 0.02, 0.02, -90, 0, 4)[1:]
col_profile += [(COLLAR_R, COLLAR_Z0 + 0.05), (COLLAR_R - 0.012, COLLAR_Z0 + 0.065),
                (COLLAR_R - 0.012, COLLAR_Z1 - 0.06), (COLLAR_R, COLLAR_Z1 - 0.045),
                (COLLAR_R, COLLAR_Z1 - 0.02)]
col_profile += arc(COLLAR_R - 0.02, COLLAR_Z1 - 0.02, 0.02, 0, 90, 4)[1:]
col_profile += [(NECK_IN + 0.01, COLLAR_Z1), (NECK_IN + 0.01, COLLAR_Z0)]
collar = lathe("Collar", col_profile, smooth_angle=35)

# ---------------------------------------------------------------- CAP
cb = 0.035
cap_profile = [(0.0, CAP_Z0), (CAP_R - cb, CAP_Z0)]
cap_profile += arc(CAP_R - cb, CAP_Z0 + cb, cb, -90, 0, 6)[1:]
cap_profile += arc(CAP_R - cb, CAP_Z1 - cb, cb, 0, 90, 6)
cap_profile += [(0.0, CAP_Z1)]
cap = lathe("Cap", cap_profile, smooth_angle=35)
cylindrical_uv(cap, CAP_Z0, CAP_Z1, u_scale=3.0)

# ---------------------------------------------------------------- DIP TUBE
curve = bpy.data.curves.new("TubeCurve", 'CURVE')
curve.dimensions = '3D'
curve.bevel_depth = 0.018
curve.bevel_resolution = 3
sp = curve.splines.new('BEZIER')
sp.bezier_points.add(2)
pts = [Vector((0, 0, HB + NECK_H + 0.05)), Vector((0.0, 0, 1.15)), Vector((0.42, 0.18, TB + 0.035))]
for bp, p in zip(sp.bezier_points, pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = 'AUTO'
sp.bezier_points[1].handle_left_type = sp.bezier_points[1].handle_right_type = 'AUTO'
tube_curve = bpy.data.objects.new("TubeCurveObj", curve)
bpy.context.collection.objects.link(tube_curve)
bpy.context.view_layer.objects.active = tube_curve
tube_curve.select_set(True)
bpy.ops.object.convert(target='MESH')
tube = bpy.context.view_layer.objects.active
tube.name = "Tube"
tube.select_set(False)

# ---------------------------------------------------------------- LABEL (curved decal)
me = bpy.data.meshes.new("Label")
bm = bmesh.new()
cols, rows = 48, 2
grid = []
for j in range(rows + 1):
    z = LABEL_TOP - LABEL_H * (1 - j / rows)
    row = []
    for i in range(cols + 1):
        # centred on -Y (front, facing a default glTF camera on +Z after Y-up conversion)
        a = -math.pi / 2 - LABEL_ANG + 2 * LABEL_ANG * i / cols
        row.append(bm.verts.new((LABEL_R * math.cos(a), LABEL_R * math.sin(a), z)))
    grid.append(row)
uv_layer = bm.loops.layers.uv.new("UVMap")
for j in range(rows):
    for i in range(cols):
        f = bm.faces.new((grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]))
        for loop, (ii, jj) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
            loop[uv_layer].uv = (ii / cols, jj / rows)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
# make sure normals point outward
for f in bm.faces:
    c = f.calc_center_median()
    if f.normal.dot(Vector((c.x, c.y, 0))) < 0:
        f.normal_flip()
bm.to_mesh(me)
bm.free()
label = bpy.data.objects.new("Label", me)
bpy.context.collection.objects.link(label)
for p in me.polygons:
    p.use_smooth = True


# ---------------------------------------------------------------- MATERIALS
def principled(name, **kw):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    for k, v in kw.items():
        if k in b.inputs:
            b.inputs[k].default_value = v
    return m, b

m_glass, _ = principled("Glass", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.0,
                                     "IOR": 1.5, "Transmission Weight": 1.0})
m_liquid, b_liq = principled("Perfume", **{"Base Color": (1.0, 0.93, 0.82, 1), "Roughness": 0.02,
                                           "IOR": 1.36, "Transmission Weight": 1.0})
# deep amber body for Cycles
vol = m_liquid.node_tree.nodes.new("ShaderNodeVolumeAbsorption")
vol.inputs["Color"].default_value = (0.92, 0.56, 0.16, 1)
vol.inputs["Density"].default_value = 2.6
out = m_liquid.node_tree.nodes.get("Material Output")
m_liquid.node_tree.links.new(vol.outputs[0], out.inputs["Volume"])

m_cap, b_cap = principled("BlackWood", **{"Base Color": (0.012, 0.011, 0.010, 1), "Roughness": 0.55,
                                          "Coat Weight": 0.25, "Coat Roughness": 0.3})
# wood grain for renders (procedural; the website uses its own grain texture)
nt = m_cap.node_tree
wave = nt.nodes.new("ShaderNodeTexWave")
wave.wave_type = 'BANDS'
wave.bands_direction = 'X'
wave.inputs["Scale"].default_value = 28.0
wave.inputs["Distortion"].default_value = 2.5
wave.inputs["Detail"].default_value = 4.0
wave.inputs["Detail Scale"].default_value = 1.5
ramp = nt.nodes.new("ShaderNodeValToRGB")
ramp.color_ramp.elements[0].color = (0.004, 0.004, 0.004, 1)
ramp.color_ramp.elements[1].color = (0.022, 0.020, 0.019, 1)
nt.links.new(wave.outputs["Fac"], ramp.inputs["Fac"])
nt.links.new(ramp.outputs["Color"], b_cap.inputs["Base Color"])
bump = nt.nodes.new("ShaderNodeBump")
bump.inputs["Strength"].default_value = 0.25
nt.links.new(wave.outputs["Fac"], bump.inputs["Height"])
nt.links.new(bump.outputs["Normal"], b_cap.inputs["Normal"])

m_metal, _ = principled("Collar", **{"Base Color": (0.86, 0.80, 0.70, 1), "Metallic": 1.0, "Roughness": 0.18})
m_tube, _ = principled("Tube", **{"Base Color": (1, 1, 1, 1), "Roughness": 0.2, "Transmission Weight": 1.0})

m_label, b_lab = principled("LabelPrint", **{"Metallic": 0.55, "Roughness": 0.32})
tex = m_label.node_tree.nodes.new("ShaderNodeTexImage")
if os.path.exists(LABEL_PNG):
    tex.image = bpy.data.images.load(LABEL_PNG)
    tex.image.alpha_mode = 'STRAIGHT'
m_label.node_tree.links.new(tex.outputs["Color"], b_lab.inputs["Base Color"])
m_label.node_tree.links.new(tex.outputs["Alpha"], b_lab.inputs["Alpha"])
try:
    m_label.surface_render_method = 'BLENDED'
except Exception:
    m_label.blend_method = 'BLEND'

for ob, m in ((glass, m_glass), (liquid, m_liquid), (cap, m_cap), (collar, m_metal),
              (tube, m_tube), (label, m_label)):
    ob.data.materials.clear()
    ob.data.materials.append(m)

# group under one empty
root = bpy.data.objects.new("COURAGE", None)
bpy.context.collection.objects.link(root)
for ob in (glass, liquid, cap, collar, tube, label):
    ob.parent = root

# ---------------------------------------------------------------- EXPORT GLB (bottle only)
bpy.ops.object.select_all(action='DESELECT')
for ob in (root, glass, liquid, cap, collar, tube, label):
    ob.select_set(True)
os.makedirs(os.path.dirname(GLB_OUT), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=GLB_OUT, export_format='GLB', use_selection=True,
                          export_apply=True, export_yup=True, export_texcoords=True,
                          export_normals=True, export_materials='EXPORT',
                          export_image_format='AUTO')
print("exported", GLB_OUT)

# ---------------------------------------------------------------- STUDIO (for Blender renders only)
ped = bpy.data.meshes.new("Pedestal")
bm = bmesh.new()
bmesh.ops.create_cone(bm, cap_ends=True, segments=128, radius1=2.3, radius2=2.3, depth=0.55)
bmesh.ops.translate(bm, vec=(0, 0, -0.275 - 0.002), verts=bm.verts)
bm.to_mesh(ped)
bm.free()
pedestal = bpy.data.objects.new("Pedestal", ped)
bpy.context.collection.objects.link(pedestal)
bev = pedestal.modifiers.new("Bevel", 'BEVEL')
bev.width = 0.03
bev.segments = 4
m_marble, b_mar = principled("BlackMarble", **{"Base Color": (0.02, 0.02, 0.02, 1), "Roughness": 0.22})
mt = m_marble.node_tree
noise = mt.nodes.new("ShaderNodeTexNoise")
noise.inputs["Scale"].default_value = 1.6
noise.inputs["Detail"].default_value = 14.0
noise.inputs["Distortion"].default_value = 3.0
vein = mt.nodes.new("ShaderNodeMath"); vein.operation = 'PINGPONG'; vein.inputs[1].default_value = 0.5
mramp = mt.nodes.new("ShaderNodeValToRGB")
mramp.color_ramp.elements[0].position = 0.0
mramp.color_ramp.elements[0].color = (0.11, 0.105, 0.10, 1)
mramp.color_ramp.elements[1].position = 0.035
mramp.color_ramp.elements[1].color = (0.008, 0.008, 0.008, 1)
mt.links.new(noise.outputs["Fac"], vein.inputs[0])
mt.links.new(vein.outputs[0], mramp.inputs["Fac"])
mt.links.new(mramp.outputs["Color"], b_mar.inputs["Base Color"])
pedestal.data.materials.append(m_marble)
for p in pedestal.data.polygons:
    p.use_smooth = True

world = bpy.data.worlds.new("Black")
world.use_nodes = True
world.node_tree.nodes["Background"].inputs[0].default_value = (0.0, 0.0, 0.0, 1)
scene.world = world


def area(name, loc, rot, size, energy, color, shape='RECTANGLE', size_y=None):
    ld = bpy.data.lights.new(name, 'AREA')
    ld.shape = shape
    ld.size = size
    if size_y:
        ld.size_y = size_y
    ld.energy = energy
    ld.color = color
    ob = bpy.data.objects.new(name, ld)
    ob.location = loc
    ob.rotation_euler = rot
    bpy.context.collection.objects.link(ob)
    return ob


def aim(ob, target=(0, 0, 1.6)):
    d = Vector(target) - ob.location
    ob.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()


k = area("Key", (4.5, -5.5, 5.5), (0, 0, 0), 2.5, 900, (1.0, 0.82, 0.62)); aim(k)
r1 = area("RimLeft", (-4.0, 3.0, 2.5), (0, 0, 0), 0.5, 500, (1.0, 0.78, 0.5), size_y=6); aim(r1)
r2 = area("RimRight", (4.0, 3.0, 2.5), (0, 0, 0), 0.5, 400, (1.0, 0.85, 0.7), size_y=6); aim(r2)
back = area("BackGlow", (0, 5.0, 2.2), (0, 0, 0), 2.0, 160, (1.0, 0.6, 0.25)); aim(back, (0, 0, 1.3))
top = area("Top", (0, -1.0, 7.5), (0, 0, 0), 2.0, 300, (1.0, 0.9, 0.8)); aim(top, (0, 0, 0))

# hidden backlight card: sits behind the bottle (masked by its silhouette) so the perfume glows amber
card_me = bpy.data.meshes.new("BacklightCard")
bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=0.5)
bmesh.ops.scale(bm, vec=(1.5, 1.4, 1), verts=bm.verts)
bmesh.ops.rotate(bm, cent=(0, 0, 0), matrix=__import__("mathutils").Matrix.Rotation(math.radians(90), 3, 'X'), verts=bm.verts)
bmesh.ops.translate(bm, vec=(0, 1.6, 1.25), verts=bm.verts)
bm.to_mesh(card_me)
bm.free()
card = bpy.data.objects.new("BacklightCard", card_me)
bpy.context.collection.objects.link(card)
m_card = bpy.data.materials.new("BacklightCard")
m_card.use_nodes = True
ntc = m_card.node_tree
for n in list(ntc.nodes):
    if n.type != 'OUTPUT_MATERIAL':
        ntc.nodes.remove(n)
em = ntc.nodes.new("ShaderNodeEmission")
em.inputs["Color"].default_value = (1.0, 0.88, 0.7, 1)
em.inputs["Strength"].default_value = 2.2
ntc.links.new(em.outputs[0], ntc.nodes["Material Output"].inputs["Surface"])
card.data.materials.append(m_card)

cam_d = bpy.data.cameras.new("Camera")
cam_d.lens = 85
cam = bpy.data.objects.new("Camera", cam_d)
cam.location = (0, -15.5, 2.4)
bpy.context.collection.objects.link(cam)
aim(cam, (0, 0, 1.75))
scene.camera = cam

scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = int(os.environ.get("COURAGE_SAMPLES", "64"))
scene.cycles.use_denoising = True
scene.cycles.max_bounces = 16
scene.cycles.transmission_bounces = 16
scene.cycles.volume_bounces = 2
scene.render.resolution_x = int(os.environ.get("COURAGE_RES_X", "800"))
scene.render.resolution_y = int(os.environ.get("COURAGE_RES_Y", "1100"))
scene.render.film_transparent = False
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = -0.3
scene.render.filepath = RENDER_OUT

# pack the label image so the .blend is self-contained
try:
    bpy.ops.file.pack_all()
except Exception:
    pass
bpy.ops.wm.save_as_mainfile(filepath=BLEND_OUT)
print("saved", BLEND_OUT)

if os.environ.get("COURAGE_RENDER") == "1":
    bpy.ops.render.render(write_still=True)
    print("rendered", RENDER_OUT)
