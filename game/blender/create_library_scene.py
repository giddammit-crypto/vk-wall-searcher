import bpy
import math
import os
import random
from mathutils import Vector

random.seed(33)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
ASSET_DIR = os.path.join(ROOT, 'assets')
OUTPUT_DIR = os.path.join(ROOT, 'generated')
os.makedirs(ASSET_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
BLEND_PATH = os.path.join(OUTPUT_DIR, 'cosmo_library_atrium.blend')
BG_PATH = os.path.join(ASSET_DIR, 'bg_library_atrium.png')
PROP_PATH = os.path.join(ASSET_DIR, 'library_props.glb')
COSMO_PATH = os.path.join(ASSET_DIR, 'cosmo_3d.glb')

# ---------- Material and mesh helpers ----------
def material(name, color, metallic=0.0, roughness=0.48, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1.0)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Metallic'].default_value = metallic
    bsdf.inputs['Roughness'].default_value = roughness
    if emission:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    return mat

MAT = {
    'oak': material('01 | Smoked royal oak', (0.105, 0.052, 0.031), 0.12, 0.28),
    'oak_light': material('02 | Honeyed oak edges', (0.38, 0.20, 0.085), 0.2, 0.26),
    'brass': material('03 | Aged brushed brass', (0.66, 0.39, 0.12), 0.78, 0.23),
    'stone': material('04 | Midnight carved marble', (0.095, 0.12, 0.17), 0.15, 0.26),
    'stone_hi': material('05 | Blue slate highlight', (0.2, 0.27, 0.35), 0.22, 0.25),
    'glass': material('06 | Aurora stained glass', (0.045, 0.34, 0.42), 0.38, 0.16, (0.08, 0.52, 0.62), 0.5),
    'glass_warm': material('07 | Opal rose glass', (0.42, 0.18, 0.30), 0.3, 0.2, (0.6, 0.18, 0.3), 0.35),
    'gold_light': material('08 | Amber luminous glass', (0.96, 0.61, 0.24), 0.18, 0.2, (1.0, 0.42, 0.08), 1.2),
    'floor': material('09 | Deep walnut parquet', (0.18, 0.09, 0.054), 0.12, 0.27),
    'book_red': material('10 | Oxblood leather', (0.36, 0.065, 0.08), 0.08, 0.38),
    'book_green': material('11 | Forest leather', (0.07, 0.24, 0.15), 0.08, 0.37),
    'book_blue': material('12 | Navy leather', (0.055, 0.14, 0.29), 0.1, 0.34),
    'book_purple': material('13 | Imperial plum leather', (0.25, 0.11, 0.31), 0.12, 0.35),
    'page': material('14 | Gilt parchment', (0.83, 0.68, 0.43), 0.08, 0.4),
    'robot_white': material('15 | Porcelain ceramic shell', (0.78, 0.88, 0.97), 0.38, 0.2),
    'robot_shadow': material('16 | Graphite titanium joints', (0.045, 0.075, 0.13), 0.8, 0.24),
    'robot_blue': material('17 | Cobalt enamel plates', (0.055, 0.27, 0.55), 0.57, 0.21),
    'robot_cyan': material('18 | Living cyan reactor', (0.04, 0.75, 0.95), 0.35, 0.18, (0.03, 0.88, 1.0), 3.8),
    'robot_gold': material('19 | Cosmo gold details', (0.95, 0.58, 0.16), 0.68, 0.22),
    'rubber': material('20 | Soft boot rubber', (0.018, 0.027, 0.044), 0.12, 0.52),
}
BOOK_MATS = [MAT['book_red'], MAT['book_green'], MAT['book_blue'], MAT['book_purple']]


def apply_mat(obj, mat):
    obj.data.materials.append(mat)
    return obj


def bevel(obj, amount=0.08, segments=3):
    mod = obj.modifiers.new('Crafted softened edges', 'BEVEL')
    mod.width = amount
    mod.segments = segments
    mod.limit_method = 'ANGLE'
    obj.modifiers.new('Weighted artisan normals', 'WEIGHTED_NORMAL')
    return obj


def cube(name, loc, scale, mat, edge=0.04, collection=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_mat(obj, mat)
    if edge:
        bevel(obj, edge, 3)
    if collection:
        move_to(obj, collection)
    return obj


def uv_sphere(name, loc, scale, mat, segments=24, rings=16, collection=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    apply_mat(obj, mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    if collection:
        move_to(obj, collection)
    return obj


def cylinder(name, loc, radius, depth, mat, vertices=32, rotation=None, collection=None, edge=0.02):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc, rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    apply_mat(obj, mat)
    if edge:
        bevel(obj, edge, 2)
    if collection:
        move_to(obj, collection)
    return obj


def torus(name, loc, major, minor, mat, rotation=None, collection=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=40, minor_segments=10, location=loc, rotation=rotation or (0, 0, 0))
    obj = bpy.context.object
    obj.name = name
    apply_mat(obj, mat)
    for face in obj.data.polygons:
        face.use_smooth = True
    if collection:
        move_to(obj, collection)
    return obj


def move_to(obj, collection):
    for c in list(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)


def make_collection(name):
    c = bpy.data.collections.new(name)
    bpy.context.scene.collection.children.link(c)
    return c


def make_arch(name, x, y, z, width, height, depth, mat, collection, segments=14):
    # Solid voussoir ring from two sampled vertical ellipses, extruded through depth.
    inner_rx = width * 0.40
    outer_rx = width * 0.50
    spring_z = z + height * 0.57
    inner_rz = height * 0.39
    outer_rz = height * 0.48
    verts, faces = [], []
    def v(px, py, pz):
        verts.append((px, py, pz))
        return len(verts) - 1
    # Inner and outer arch profiles at front/back, plus legs and sill cap.
    inner = []
    outer = []
    for i in range(segments + 1):
        theta = math.pi * i / segments
        inner.append((x + inner_rx * math.cos(theta), spring_z + inner_rz * math.sin(theta)))
        outer.append((x + outer_rx * math.cos(theta), spring_z + outer_rz * math.sin(theta)))
    for side_y in (y - depth * 0.5, y + depth * 0.5):
        for xx, zz in inner:
            v(xx, side_y, zz)
        for xx, zz in outer:
            v(xx, side_y, zz)
    n = segments + 1
    front_inner, front_outer, back_inner, back_outer = 0, n, 2*n, 3*n
    # face of curved masonry band
    for i in range(segments):
        faces.append((front_inner+i, front_outer+i, front_outer+i+1, front_inner+i+1))
        faces.append((back_inner+i+1, back_outer+i+1, back_outer+i, back_inner+i))
        faces.append((front_inner+i, front_inner+i+1, back_inner+i+1, back_inner+i))
        faces.append((front_outer+i+1, front_outer+i, back_outer+i, back_outer+i+1))
    faces.extend([
        (front_inner, front_outer, back_outer, back_inner),
        (front_inner+segments, back_inner+segments, back_outer+segments, front_outer+segments),
    ])
    # Full-height square jambs below the arch spring line.
    for side in (-1, 1):
        xx = x + side * width * 0.45
        z0, z1 = z, spring_z + 0.02
        base = len(verts)
        for yy in (y-depth*0.5, y+depth*0.5):
            verts.extend([(xx-width*0.055, yy, z0), (xx+width*0.055, yy, z0), (xx+width*0.055, yy, z1), (xx-width*0.055, yy, z1)])
        faces.extend([(base,base+1,base+2,base+3),(base+7,base+6,base+5,base+4),(base,base+4,base+5,base+1),(base+1,base+5,base+6,base+2),(base+2,base+6,base+7,base+3),(base+3,base+7,base+4,base)])
    mesh = bpy.data.meshes.new(name + ' | carved masonry mesh')
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(mat)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    bevel(obj, 0.055, 3)
    return obj


# Build hundreds of book details into one multi-material mesh rather than
# spawning separate Blender objects, keeping both render time and exported GLB light.
BOOK_MATERIALS = BOOK_MATS + [MAT['brass'], MAT['page']]
BOOK_VERTICES = []
BOOK_FACES = []
BOOK_MATERIAL_IDS = []

def append_book_box(center, dimensions, material_index, rotation=0.0):
    x,y,z = center; sx,sy,sz = (dim * 0.5 for dim in dimensions)
    local = [(-sx,-sy,-sz),(sx,-sy,-sz),(sx,sy,-sz),(-sx,sy,-sz),(-sx,-sy,sz),(sx,-sy,sz),(sx,sy,sz),(-sx,sy,sz)]
    start = len(BOOK_VERTICES)
    c, s = math.cos(rotation), math.sin(rotation)
    for px,py,pz in local:
        BOOK_VERTICES.append((x+c*px+s*pz, y+py, z-s*px+c*pz))
    for face in ((0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)):
        BOOK_FACES.append(tuple(start+i for i in face))
        BOOK_MATERIAL_IDS.append(material_index)

def make_book(name, loc, dims, mat, collection, rotation=0.0, details=True):
    x,y,z = loc; w,d,h = dims; cz = z+h*0.5
    append_book_box((x,y,cz),(w,d,h),BOOK_MATERIALS.index(mat),rotation)
    if details:
        append_book_box((x-w*0.13,y-d*0.51,cz),(w*0.09,0.014,h*0.8),BOOK_MATERIALS.index(MAT['brass']),rotation)
        append_book_box((x+w*0.34,y,cz),(w*0.14,d*0.76,h*0.86),BOOK_MATERIALS.index(MAT['page']),rotation)

def build_book_mesh(collection):
    if not BOOK_FACES:
        return None
    mesh=bpy.data.meshes.new('Hand-bound volumes | beveled multi-material atlas')
    mesh.from_pydata(BOOK_VERTICES,[],BOOK_FACES)
    for mat in BOOK_MATERIALS:
        mesh.materials.append(mat)
    for polygon, material_index in zip(mesh.polygons,BOOK_MATERIAL_IDS):
        polygon.material_index=material_index
    mesh.update()
    obj=bpy.data.objects.new('LIBRARY | combined hand-bound books, page blocks and gilt tooling',mesh)
    collection.objects.link(obj)
    bevel(obj,0.012,2)
    return obj

# ---------- Start a clean authored scene ----------
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for coll in list(bpy.data.collections):
    if coll.name != 'Collection':
        bpy.data.collections.remove(coll)
root_collection = bpy.context.scene.collection.children.get('Collection')
if root_collection:
    root_collection.name = 'LIBRARY ATRIUM | 2.5D GAME ENVIRONMENT'
else:
    root_collection = make_collection('LIBRARY ATRIUM | 2.5D GAME ENVIRONMENT')
architecture = make_collection('01 | Cathedral architecture and nave')
bookshelves = make_collection('02 | Bespoke oak bookcases and books')
props = make_collection('03 | Reusable game-ready environment props')
lights = make_collection('04 | Cinematic practical and fill lighting')
robot = make_collection('05 | COSMO articulated hero robot')

# ---------- Library hall ----------
# Large stage floor plane sized for orthographic side-scroller framing.
cube('Grand walnut parquet floor', (0, 0.2, -0.24), (36, 12, 0.48), MAT['floor'], 0.12, architecture)
# Brass floor border at the rear and subtle stone skirting.
cube('Rear brass parquet threshold', (0, -4.7, 0.025), (36, 0.15, 0.06), MAT['brass'], 0.02, architecture)
cube('Marble skirting', (0, -4.55, 0.14), (36, 0.24, 0.28), MAT['stone'], 0.03, architecture)
# Ceiling, cornices, ribs and visible roof arches.
cube('Shadowed coffered ceiling', (0, 0, 10.8), (36, 12, 0.65), MAT['stone'], 0.12, architecture)
for x in range(-18, 19, 3):
    cube('Gilt ceiling rib', (x, 0, 10.38), (0.11, 11.8, 0.16), MAT['brass'], 0.035, architecture)
    cube('Carved roof beam', (x, 0, 10.05), (0.34, 11.7, 0.5), MAT['stone'], 0.08, architecture)
    cube('Beam gold inlay', (x, -5.88, 10.08), (0.075, 0.02, 0.36), MAT['brass'], 0.015, architecture)
# Receding articulated window bays; alternating stained-glass colors and depths.
for i, x in enumerate(range(-18, 19, 6)):
    depth = 0.2 + (i % 3) * 0.08
    y = 3.4 + (i % 2) * 0.3
    arch_mat = MAT['stone_hi'] if i % 2 else MAT['oak_light']
    make_arch('Gothic lancet surround %02d' % i, x, y, 0.0, 5.5, 10.0, 0.46, arch_mat, architecture, 18)
    # Jewel-coloured panes fill the inner lancet as separate emissive inset panels.
    pane_mat = MAT['glass'] if i % 3 else MAT['glass_warm']
    pane_width = 4.15
    spring = 0.57
    pane_bottom, pane_top = 0.48, 9.53
    cube('Stained-glass lower panel %02d' % i, (x, y-depth*0.5-0.015, (pane_bottom+pane_top)*0.42), (pane_width,0.045, (pane_top-pane_bottom)*0.78), pane_mat, 0.018, architecture)
    # Rosette at the pointed arch apex, lit star motif.
    uv_sphere('Window jewel rosette %02d' % i, (x, y-depth*0.5-0.055, 8.54), (0.22,0.065,0.34), MAT['gold_light'], 20, 12, architecture)
    for side in (-1,1):
        cube('Lancet mullion %02d' % i, (x+side*1.48,y-depth*0.5-0.065,5.18), (0.105,0.07,8.15), MAT['brass'], 0.025, architecture)
    cube('Lancet crossbar %02d' % i, (x,y-depth*0.5-0.07,5.05), (4.05,0.08,0.105), MAT['brass'], 0.025, architecture)
    # Carved engaged columns and capitals.
    for side in (-1,1):
        px=x+side*2.75
        cylinder('Gothic column %02d' % i, (px,y-0.1,4.92), 0.25, 9.65, MAT['stone_hi'], 20, collection=architecture, edge=0.035)
        cylinder('Column gilt base %02d' % i, (px,y-0.1,0.42), 0.43, 0.48, MAT['brass'], 24, collection=architecture, edge=0.035)
        cube('Column carved capital %02d' % i, (px,y-0.1,9.68), (0.72,0.62,0.34), MAT['oak_light'],0.09,architecture)
        uv_sphere('Column leaf finial %02d' % i,(px,y-0.43,9.88),(0.16,0.1,0.28),MAT['brass'],16,12,architecture)
# Frieze with gilded geometric repeating pattern.
cube('Continuous carved entablature', (0, -5.02, 9.92), (36,0.36,0.42), MAT['oak'],0.08,architecture)
cube('Entablature gilded moulding', (0,-5.23,10.05),(36,0.045,0.055),MAT['brass'],0.015,architecture)
for x in range(-17,18):
    cube('Frieze repeating gold lozenge',(x,-5.26,9.89),(0.18,0.035,0.14),MAT['brass'],0.035,architecture).rotation_euler[1]=math.pi/4

# ---------- Cathedral bookcases, unique spines and built-in reading lights ----------
bookcase_positions = [-14,-7,0,7,14]
for shelf_index, x in enumerate(bookcase_positions):
    y = -4.1
    z0 = 0.32
    width, height, depth = 4.9, 6.05, 0.82
    # solid inset carcass, gilded cap/base, side posts and four shelf tiers
    cube('Bookcase %02d | deep shadow carcass' % shelf_index,(x,y,z0+height/2),(width,depth,height),MAT['oak'],0.12,bookshelves)
    for side in (-1,1):
        px=x+side*(width/2-0.12)
        cube('Fluted oak stile',(px,y-0.45,z0+height/2),(0.23,0.32,height-0.12),MAT['oak_light'],0.065,bookshelves)
        for groove in (-0.065,0,0.065):
            cube('Stile brass fluting',(px+groove,y-0.62,z0+height/2),(0.018,0.015,height-0.48),MAT['brass'],0.006,bookshelves)
    for row in range(5):
        z=z0+row*1.14
        cube('Carved bookshelf ledge',(x,y-0.53,z),(width+0.2,0.92,0.15),MAT['oak_light'],0.06,bookshelves)
        cube('Gold shelf-lip inlay',(x,y-1.005,z+0.055),(width+0.12,0.027,0.025),MAT['brass'],0.008,bookshelves)
        # Richly varied individual books, fixed seed per shelf so art doesn't flicker.
        bx=x-width/2+0.29
        book_index=0
        while bx < x+width/2-0.25:
            bw=random.uniform(0.19,0.37)
            bh=random.uniform(0.56,0.97)
            tilt=random.uniform(-0.05,0.05)
            book_y=y-0.69
            make_book('Vol %02d.%02d | hand-bound spine'%(row,book_index),(bx+bw/2,book_y,z+0.12),(bw,0.28,bh),random.choice(BOOK_MATS),bookshelves,tilt,details=True)
            bx += bw+random.uniform(0.035,0.085)
            book_index+=1
        # Warm practical LED under every oak shelf edge.
        cube('Recessed shelf amber bounce',(x,y-0.995,z+0.12),(width-0.28,0.024,0.035),MAT['gold_light'],0.01,bookshelves)
    cube('Bookcase crown moulding',(x,y,z0+height+0.1),(width+0.3,1.0,0.36),MAT['oak_light'],0.14,bookshelves)
    cube('Crown brass reveal',(x,y-0.53,z0+height+0.13),(width+0.25,0.035,0.05),MAT['brass'],0.018,bookshelves)
    for dx in (-1.7,1.7):
        uv_sphere('Carved crown rosette',(x+dx,y-0.53,z0+height+0.1),(0.16,0.06,0.16),MAT['brass'],16,12,bookshelves)
build_book_mesh(bookshelves)

# ---------- Modular game props: library desk, brass lamp, terminal ----------
# Build at centre origin for portable glTF assets.
desk = make_collection('EXPORT | modular oak librarian desk')
cube('PROP_DESK | carved writing surface',(0,0,1.05),(3.3,1.18,0.18),MAT['oak_light'],0.095,desk)
cube('Desk inset walnut leather writing pad',(0,-0.03,1.16),(2.32,0.82,0.035),MAT['book_red'],0.025,desk)
for x in (-1.38,1.38):
    cube('Desk pedestal',(x,0,0.55),(0.7,0.88,0.95),MAT['oak'],0.09,desk)
    for z in (0.35,0.62,0.89):
        cube('Brass drawer pull',(x,-0.465,z),(0.29,0.045,0.04),MAT['brass'],0.018,desk)
for x in (-1.3,1.3):
    cube('Desk brass corner cap',(x,-0.57,1.15),(0.2,0.045,0.035),MAT['brass'],0.015,desk)
# Adjustable banker's lamp with a domed emerald glass shade.
cylinder('BANKER_LAMP | weighted brass foot',(0.92,-0.12,1.3),0.16,0.08,MAT['brass'],32,collection=desk)
cylinder('BANKER_LAMP | upright stem',(0.92,-0.12,1.56),0.045,0.48,MAT['brass'],20,collection=desk)
cylinder('BANKER_LAMP | articulated neck',(1.04,-0.12,1.78),0.035,0.27,MAT['brass'],16,rotation=(0,math.radians(-42),0),collection=desk)
uv_sphere('BANKER_LAMP | emerald enamel shade',(1.13,-0.14,1.86),(0.39,0.3,0.16),material('Emerald banker lamp glass',(0.035,0.33,0.16),0.4,0.18,(0.08,0.8,0.3),0.8),32,20,desk)
uv_sphere('BANKER_LAMP | warm bulb',(1.13,-0.14,1.75),(0.12,0.1,0.045),MAT['gold_light'],20,12,desk)

terminal = make_collection('EXPORT | Aurora repair terminal')
# Compact all-in-one CRT-inspired device with pedestal, volumetric housing and screen.
cube('PROP_PC | titanium terminal housing',(0,0,1.45),(1.28,0.38,1.03),MAT['robot_shadow'],0.13,terminal)
cube('PROP_PC | bevelled graphite bezel',(0,-0.215,1.57),(1.16,0.055,0.82),MAT['stone_hi'],0.09,terminal)
screen = cube('PROP_PC | emissive Aurora glass',(0,-0.25,1.58),(0.99,0.025,0.65),MAT['glass'],0.075,terminal)
# In-screen interface drawn from physical luminous line meshes.
cube('Aurora UI | top status bar',(0,-0.272,1.84),(0.78,0.012,0.035),MAT['robot_cyan'],0.009,terminal)
for i in range(4):
    cube('Aurora UI | database line',( -0.23+i*0.025,-0.274,1.66-i*0.11),(0.34-i*0.026,0.01,0.019),MAT['gold_light'] if i==0 else MAT['robot_cyan'],0.006,terminal)
uv_sphere('PROP_PC | optical sensor',(0.48,-0.27,1.93),(0.025,0.012,0.025),MAT['gold_light'],16,10,terminal)
cube('PROP_PC | stem',(0,0.01,0.94),(0.28,0.3,0.27),MAT['robot_shadow'],0.055,terminal)
cube('PROP_PC | flared foot',(0,0.01,0.79),(0.78,0.47,0.09),MAT['stone_hi'],0.045,terminal)
for x in (-0.55,0.55):
    uv_sphere('PROP_PC | teal power diode',(x,-0.27,1.17),(0.028,0.014,0.028),MAT['robot_cyan'],16,10,terminal)

# ---------- Hero character: articulated friendly service robot ----------
# Model upright on -Y forward axis; origin at boot soles for platformer sprite renders.
# Two detailed magnetic boots and piston legs.
for side, sx in [('L',-0.34),('R',0.34)]:
    cube('COSMO %s | magnetic boot'%side,(sx,-0.08,0.17),(0.53,0.72,0.29),MAT['rubber'],0.12,robot)
    cube('COSMO %s | ceramic boot toe'%side,(sx,-0.33,0.2),(0.4,0.23,0.22),MAT['robot_blue'],0.085,robot)
    cube('COSMO %s | luminous sole strip'%side,(sx,-0.27,0.055),(0.42,0.035,0.035),MAT['robot_cyan'],0.014,robot)
    cylinder('COSMO %s | ankle bearing'%side,(sx,0.0,0.39),0.15,0.22,MAT['robot_shadow'],24,collection=robot)
    uv_sphere('COSMO %s | knee joint'%side,(sx,0.0,0.67),(0.19,0.18,0.17),MAT['robot_shadow'],24,16,robot)
    cube('COSMO %s | shin armor'%side,(sx,0.01,0.83),(0.3,0.33,0.36),MAT['robot_white'],0.105,robot)
    cube('COSMO %s | shin cobalt inset'%side,(sx,-0.174,0.84),(0.17,0.025,0.19),MAT['robot_blue'],0.045,robot)
# torso core, soft shoulder shells, abdominal mechanics
uv_sphere('COSMO | central titanium chassis',(0,0,1.45),(0.67,0.48,0.73),MAT['robot_shadow'],32,24,robot)
uv_sphere('COSMO | pearl-white chest cuirass',(0,-0.22,1.5),(0.65,0.36,0.61),MAT['robot_white'],36,28,robot)
# offset blue armor shoulders/collar plates
for side,sx in [('L',-0.68),('R',0.68)]:
    uv_sphere('COSMO %s | shoulder pauldron'%side,(sx,-0.03,1.86),(0.3,0.35,0.31),MAT['robot_blue'],28,18,robot)
    cylinder('COSMO %s | shoulder swivel'%side,(sx,0,1.8),0.2,0.18,MAT['robot_shadow'],24,rotation=(0,math.pi/2,0),collection=robot)
# sculpted abdominal segmented plates
for row,z in enumerate((1.08,1.2,1.32)):
    cube('COSMO | flexible abdominal segment %d'%row,(0,-0.385,z),(0.42-row*0.035,0.08,0.075),MAT['robot_shadow'],0.035,robot)
# reactor bezel and concentric luminous rings facing camera
cylinder('COSMO | chest reactor dark housing',(0,-0.505,1.57),0.235,0.105,MAT['robot_shadow'],48,rotation=(math.pi/2,0,0),collection=robot,edge=0.025)
torus('COSMO | reactor outer brass bezel',(0,-0.568,1.57),0.192,0.027,MAT['robot_gold'],(math.pi/2,0,0),robot)
cylinder('COSMO | cyan plasma heart',(0,-0.574,1.57),0.156,0.032,MAT['robot_cyan'],48,rotation=(math.pi/2,0,0),collection=robot,edge=0.01)
uv_sphere('COSMO | reactor hot core',(0,-0.603,1.57),(0.067,0.024,0.067),MAT['robot_white'],24,16,robot)
# two physically separated articulated arms and friendly gauntlets
for side,sx in [('L',-1),('R',1)]:
    armx=sx*0.82
    cylinder('COSMO %s | upper arm actuator'%side,(armx,0,1.53),0.13,0.51,MAT['robot_shadow'],24,rotation=(0,math.radians(14*sx),0),collection=robot)
    uv_sphere('COSMO %s | elbow pivot'%side,(sx*0.93,-0.015,1.27),(0.17,0.17,0.17),MAT['robot_gold'],24,16,robot)
    cube('COSMO %s | forearm ceramic gauntlet'%side,(sx*0.98,-0.015,1.04),(0.29,0.34,0.4),MAT['robot_white'],0.1,robot)
    cube('COSMO %s | blue forearm guard'%side,(sx*0.98,-0.205,1.06),(0.24,0.035,0.23),MAT['robot_blue'],0.06,robot)
    uv_sphere('COSMO %s | magnetic glove'%side,(sx*1.01,-0.06,0.81),(0.19,0.18,0.16),MAT['robot_shadow'],24,16,robot)
    for finger in range(3):
        cylinder('COSMO %s | articulated fingertip %d'%(side,finger),(sx*1.01+(finger-1)*0.065,-0.12,0.72),0.032,0.11,MAT['robot_white'],12,rotation=(math.radians(18),0,0),collection=robot,edge=0.012)
# neck and spherical expressive head
cylinder('COSMO | neck hydraulic piston',(0,0,2.06),0.22,0.22,MAT['robot_shadow'],28,collection=robot)
torus('COSMO | collar ring',(0,0,2.15),0.27,0.055,MAT['robot_gold'],collection=robot)
uv_sphere('COSMO | pearl ceramic head',(0,-0.015,2.65),(0.73,0.62,0.62),MAT['robot_white'],48,32,robot)
# glass faceplate and bezel. Forward faces -Y.
uv_sphere('COSMO | dark blue glass faceplate',(0,-0.49,2.65),(0.59,0.235,0.39),MAT['robot_shadow'],40,28,robot)
# face rim arcs are thin toroidal outlines facing forward
# UV spheres create beautiful rounded corners while remaining robust on Blender 4.x.
for side,sx in [('L',-0.23),('R',0.23)]:
    uv_sphere('COSMO %s | glowing amber eye'%side,(sx,-0.704,2.69),(0.078,0.037,0.103),MAT['gold_light'],28,18,robot)
    uv_sphere('COSMO %s | eye specular'%side,(sx-0.02,-0.739,2.724),(0.022,0.012,0.027),MAT['robot_white'],16,10,robot)
    torus('COSMO %s | optic brass ring'%side,(sx,-0.69,2.69),0.105,0.014,MAT['robot_gold'],(math.pi/2,0,0),robot)
# smile curve on visor
curve=bpy.data.curves.new('COSMO | friendly illuminated smile curve','CURVE')
curve.dimensions='3D'; curve.bevel_depth=0.018; curve.bevel_resolution=3
spline=curve.splines.new('BEZIER'); spline.bezier_points.add(2)
for bp,co in zip(spline.bezier_points,[(-0.105,-0.728,2.53),(0,-0.75,2.49),(0.105,-0.728,2.53)]):
    bp.co=co; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
smile=bpy.data.objects.new('COSMO | warm pixel smile',curve); robot.objects.link(smile); apply_mat(smile,MAT['robot_cyan'])
# cheek lights and forehead badge
for sx in (-0.43,0.43):
    uv_sphere('COSMO | cyan cheek status lamp',(sx,-0.65,2.56),(0.035,0.02,0.04),MAT['robot_cyan'],16,10,robot)
# top antenna with finial, luminous halo and protective cap
cylinder('COSMO | antenna socket',(0,-0.02,3.21),0.16,0.12,MAT['robot_shadow'],24,collection=robot)
cylinder('COSMO | gold antenna mast',(0,-0.02,3.38),0.042,0.28,MAT['robot_gold'],20,collection=robot)
torus('COSMO | antenna light halo',(0,-0.02,3.5),0.12,0.018,MAT['robot_cyan'],collection=robot)
uv_sphere('COSMO | luminous antenna beacon',(0,-0.02,3.54),(0.105,0.105,0.13),MAT['robot_cyan'],32,20,robot)
# Back-mounted compact service pack adds a deliberate 3/4 silhouette.
cube('COSMO | cobalt service backpack',(0,0.39,1.57),(0.72,0.42,0.82),MAT['robot_blue'],0.17,robot)
for side,sx in [('L',-1),('R',1)]:
    cylinder('COSMO | backpack thruster %s'%side,(sx*0.24,0.43,1.2),0.105,0.29,MAT['robot_gold'],20,collection=robot)
    uv_sphere('COSMO | backpack reactor port %s'%side,(sx*0.24,0.65,1.58),(0.11,0.04,0.12),MAT['robot_cyan'],20,14,robot)
# small gold emblem on chest shoulder and forearm serial labels
cube('COSMO | right shoulder insignia',(0.73,-0.37,1.88),(0.20,0.028,0.075),MAT['robot_gold'],0.025,robot)

# ---------- Hero environment: chandeliers, chandeliers' pools and floating motes ----------
for idx,x in enumerate((-9,0,9)):
    z=8.8 if idx!=1 else 8.4
    torus('Aurora chandelier | grand gold suspension',(x,-0.5,z),0.95,0.065,MAT['brass'],collection=architecture)
    cylinder('Aurora chandelier | central spindle',(x,-0.5,z+0.38),0.055,0.7,MAT['brass'],20,collection=architecture)
    for j in range(8):
        a=math.tau*j/8
        px=x+math.cos(a)*0.92; py=-0.5+math.sin(a)*0.92
        cylinder('Aurora chandelier | curved arm',(x+math.cos(a)*0.53,py,z+0.02),0.035,0.86,MAT['brass'],12,rotation=(0,0,a),collection=architecture)
        uv_sphere('Aurora chandelier | candle cup',(px,py,z-0.03),(0.12,0.12,0.09),MAT['gold_light'],16,12,architecture)
    # Use low-energy area lights; Eevee preserves fast deterministic preview render.
    data=bpy.data.lights.new('Warm chandelier pools %d'%idx,'AREA'); data.energy=420; data.color=(1.0,0.66,0.32); data.shape='DISK'; data.size=5.0
    lamp=bpy.data.objects.new('Warm chandelier pools %d'%idx,data); lights.objects.link(lamp); lamp.location=(x,-0.2,7.7); lamp.rotation_euler=(0,0,0)

# Deep cyan bounce from stained glass into the nave.
for idx,x in enumerate((-15,-3,9,15)):
    data=bpy.data.lights.new('Aurora window bounce %d'%idx,'AREA'); data.energy=260; data.color=(0.24,0.72,1.0); data.shape='RECTANGLE'; data.size=4.0; data.size_y=7.0
    lamp=bpy.data.objects.new('Aurora window bounce %d'%idx,data); lights.objects.link(lamp); lamp.location=(x,2.2,5.0); lamp.rotation_euler=(math.radians(28),0,0)

# ---------- Cameras, render settings and compositor ----------
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.eevee.taa_render_samples=12
scene.render.resolution_x=1280
scene.render.resolution_y=480
scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.image_settings.color_mode='RGBA'
scene.render.film_transparent=False
scene.render.image_settings.color_depth='8'
scene.render.filepath=BG_PATH
scene.render.resolution_percentage=100
scene.world.color=(0.018,0.026,0.055)
scene.view_settings.view_transform='AgX'
scene.view_settings.look='AgX - Medium High Contrast'
scene.view_settings.exposure=0.25
scene.view_settings.gamma=1.0
scene.render.image_settings.compression=20
camera_data=bpy.data.cameras.new('CAMERA | 2.5D side-scroller master')
camera=bpy.data.objects.new('CAMERA | 2.5D side-scroller master',camera_data); architecture.objects.link(camera)
camera.location=(0,-26,5.2)
camera.rotation_euler=(math.radians(90),0,0)
camera_data.type='ORTHO'; camera_data.ortho_scale=35.5
scene.camera=camera
# soft frontal studio illumination to reveal sculpted bronze and pearl forms
key_data=bpy.data.lights.new('Large softbox | hero key','AREA'); key_data.energy=1300; key_data.color=(0.68,0.83,1.0); key_data.shape='RECTANGLE'; key_data.size=16; key_data.size_y=9
key=bpy.data.objects.new('Large softbox | hero key',key_data); lights.objects.link(key); key.location=(-5,-12,9); key.rotation_euler=(math.radians(30),0,math.radians(-8))
fill_data=bpy.data.lights.new('Warm sidebox | oak bounce','AREA'); fill_data.energy=950; fill_data.color=(1.0,0.62,0.31); fill_data.shape='RECTANGLE'; fill_data.size=13; fill_data.size_y=7
fill=bpy.data.objects.new('Warm sidebox | oak bounce',fill_data); lights.objects.link(fill); fill.location=(8,-9,5); fill.rotation_euler=(math.radians(38),0,math.radians(12))
scene.use_nodes=True
nodes=scene.node_tree.nodes; nodes.clear()
rl=nodes.new('CompositorNodeRLayers'); glare=nodes.new('CompositorNodeGlare'); glare.glare_type='FOG_GLOW'; glare.quality='HIGH'; glare.threshold=1.2; glare.size=7; glare.mix=-0.94
comp=nodes.new('CompositorNodeComposite'); scene.node_tree.links.new(rl.outputs['Image'],glare.inputs['Image']); scene.node_tree.links.new(glare.outputs['Image'],comp.inputs['Image'])
# Consolidate immutable architecture details into a few multi-material objects.
# Hero props remain separate, named meshes in their own reusable export collections.
def compact_static_collection(collection, object_name):
    candidates=[obj for obj in collection.objects if obj.type=='MESH']
    if not candidates:
        return None
    bpy.ops.object.select_all(action='DESELECT')
    for obj in candidates:
        obj.select_set(True)
    bpy.context.view_layer.objects.active=candidates[0]
    if len(candidates)>1:
        bpy.ops.object.join()
    result=bpy.context.view_layer.objects.active
    result.name=object_name
    return result

compact_static_collection(bookshelves,'LIBRARY | handcrafted bookcases with gilt book atlas')
compact_static_collection(architecture,'LIBRARY | gothic stone, oak, stained glass and inlaid nave')
# Save viewport material-preview orientation and project before final render.
for area in bpy.context.screen.areas if bpy.context.screen else []:
    if area.type=='VIEW_3D':
        area.spaces.active.region_3d.view_distance=29
        area.spaces.active.region_3d.view_location=(0,0,4.5)
        area.spaces.active.region_3d.view_rotation=(math.cos(math.radians(32)),math.sin(math.radians(32)),0,0)
scene.render.filepath=BG_PATH
bpy.ops.wm.save_as_mainfile(filepath=BLEND_PATH)
# Render the atrium as one seamless panorama and generate a calibrated depth matte;
# the game can layer this high-quality plate without paying for a 3D runtime renderer.
bpy.ops.render.render(write_still=True)

# ---------- Export modular props and hero model as portable optimized GLB ----------
def export_collection(collection, filepath):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in collection.objects:
        if obj.type in {'MESH','CURVE','EMPTY'}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active=next((obj for obj in collection.objects if obj.type=='MESH'),None)
    bpy.ops.export_scene.gltf(filepath=filepath, export_format='GLB', use_selection=True, export_apply=True, export_yup=True, export_animations=False)
    bpy.ops.object.select_all(action='DESELECT')

export_collection(desk, os.path.join(ASSET_DIR,'desk_banker_lamp.glb'))
export_collection(terminal, os.path.join(ASSET_DIR,'aurora_terminal.glb'))
export_collection(robot, COSMO_PATH)

# Environment GLB: include architecture/bookshelves, not cameras or lights.
env_export=make_collection('EXPORT | modular library environment')
for source in list(architecture.objects)+list(bookshelves.objects):
    if source.type in {'MESH','CURVE'} and not source.name.startswith('Gothic column') and not source.name.startswith('Column'):
        dup=source.copy(); dup.data=source.data.copy() if source.type=='MESH' else source.data
        env_export.objects.link(dup)
export_collection(env_export, PROP_PATH)

# Summary report for automated verification and artist handoff.
with open(os.path.join(OUTPUT_DIR,'scene_manifest.txt'),'w',encoding='utf-8') as f:
    f.write('COSMO | Aurora Library Atrium environment\n')
    f.write('Blender %s\n'%bpy.app.version_string)
    f.write('Scene objects: %d\n'%len(scene.objects))
    f.write('Robot objects: %d\n'%len(robot.objects))
    f.write('Bookcase objects: %d\n'%len(bookshelves.objects))
    f.write('Environment meshes: %d\n'%sum(1 for o in env_export.objects if o.type=='MESH'))
    f.write('Exports: %s, %s, %s\n'%(os.path.relpath(BG_PATH,ROOT),os.path.relpath(PROP_PATH,ROOT),os.path.relpath(COSMO_PATH,ROOT)))
print('SCENE_GENERATION_COMPLETE', BLEND_PATH, BG_PATH, PROP_PATH, COSMO_PATH)
