import bpy, math, random, json, struct
from mathutils import Vector, noise
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(4)

mat = bpy.data.materials.new('roccia'); mat.use_nodes = True
bsdf = mat.node_tree.nodes['Principled BSDF']
img = bpy.data.images.load(bpy.path.abspath('//pelle_golem.jpg') if bpy.data.filepath else 'pelle_golem.jpg')
tex = mat.node_tree.nodes.new('ShaderNodeTexImage'); tex.image = img
mat.node_tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
bsdf.inputs['Roughness'].default_value = 0.95
occhi = bpy.data.materials.new('occhi'); occhi.use_nodes = True
b2 = occhi.node_tree.nodes['Principled BSDF']; b2.inputs['Base Color'].default_value = (1, 0.6, 0.1, 1); b2.inputs['Emission Color'].default_value = (1, 0.6, 0.1, 1); b2.inputs['Emission Strength'].default_value = 4

parti = []
def roccia(osso, loc, scala, sub=3, m=mat, ruvido=1.0):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub, radius=1)
    o = bpy.context.object
    seme = random.random() * 50
    for v in o.data.vertices:
        p = v.co.copy()
        # un macigno: gobbe larghe, e spigoli dati da un disegno a celle
        n = noise.noise(p * 0.9 + Vector((seme, seme * 2, seme * 3))) * 0.42 * ruvido
        n += noise.noise(p * 2.2 + Vector((seme * 5, 1, 2))) * 0.2 * ruvido
        v.co = p * (1 + n)
    o.scale = scala; o.location = loc
    o.rotation_euler = (random.uniform(-0.3, 0.3), random.uniform(-0.3, 0.3), random.uniform(0, 6))
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=1.3); bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(m)
    g = o.vertex_groups.new(name=osso); g.add(range(len(o.data.vertices)), 1.0, 'REPLACE')
    parti.append(o)
    return o

# --- il corpo: macigni, uno per pezzo ---
roccia('bacino', (0, 0, 1.0), (0.48, 0.34, 0.3))
roccia('busto', (0, 0, 1.52), (0.74, 0.5, 0.52))
roccia('busto', (0, 0.12, 1.75), (0.5, 0.36, 0.3), 2)
roccia('testa', (0, -0.02, 2.12), (0.3, 0.3, 0.3))
for s, lato in ((1, 'L'), (-1, 'R')):
    roccia('busto', (s * 0.66, 0, 1.82), (0.34, 0.3, 0.28), 2)          # spalla
    roccia('braccio.' + lato, (s * 0.76, 0, 1.45), (0.2, 0.2, 0.3), 2)
    roccia('avambraccio.' + lato, (s * 0.8, 0, 0.98), (0.24, 0.24, 0.3), 2)
    roccia('avambraccio.' + lato, (s * 0.82, -0.02, 0.62), (0.32, 0.32, 0.3))  # pugno
    roccia('gamba.' + lato, (s * 0.28, 0, 0.72), (0.25, 0.25, 0.3), 2)
    roccia('stinco.' + lato, (s * 0.3, 0, 0.32), (0.25, 0.27, 0.3), 2)
    roccia('stinco.' + lato, (s * 0.3, -0.12, 0.1), (0.27, 0.4, 0.13), 2, ruvido=0.6)  # piede
    bpy.ops.mesh.primitive_uv_sphere_add(segments=10, ring_count=6, radius=0.05, location=(s * 0.12, -0.28, 2.16))
    e = bpy.context.object; e.data.materials.append(occhi)
    g = e.vertex_groups.new(name='testa'); g.add(range(len(e.data.vertices)), 1.0, 'REPLACE'); parti.append(e)

bpy.ops.object.select_all(action='DESELECT')
for o in parti: o.select_set(True)
bpy.context.view_layer.objects.active = parti[0]
bpy.ops.object.join(); corpo = bpy.context.object; corpo.name = 'golem'
bpy.ops.object.shade_smooth()
try:
    bpy.ops.object.shade_auto_smooth(angle=0.38)
except Exception as err:
    print('niente spigoli automatici:', err)

# --- lo scheletro ---
bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.object; arm.name = 'scheletro'
bpy.ops.object.mode_set(mode='EDIT')
eb = arm.data.edit_bones; eb.remove(eb[0])
def osso(nome, testa, coda, padre=None):
    b = eb.new(nome); b.head = testa; b.tail = coda; b.roll = 0
    if padre: b.parent = eb[padre]
osso('radice', (0, 0, 0), (0, 0, 0.3))
osso('bacino', (0, 0, 0.95), (0, 0, 1.25), 'radice')
osso('busto', (0, 0, 1.25), (0, 0, 1.9), 'bacino')
osso('testa', (0, 0, 1.95), (0, 0, 2.35), 'busto')
for s, lato in ((1, 'L'), (-1, 'R')):
    osso('braccio.' + lato, (s * 0.7, 0, 1.78), (s * 0.78, 0, 1.2), 'busto')
    osso('avambraccio.' + lato, (s * 0.78, 0, 1.2), (s * 0.82, 0, 0.6), 'braccio.' + lato)
    osso('gamba.' + lato, (s * 0.28, 0, 0.95), (s * 0.3, 0, 0.5), 'bacino')
    osso('stinco.' + lato, (s * 0.3, 0, 0.5), (s * 0.3, 0, 0.05), 'gamba.' + lato)
bpy.ops.object.mode_set(mode='OBJECT')
corpo.parent = arm; mod = corpo.modifiers.new('scheletro', 'ARMATURE'); mod.object = arm

# --- i movimenti: per ogni osso, giri attorno agli assi del mondo (x = avanti/indietro) ---
from mathutils import Matrix, Quaternion
def posa(nome, x=0.0, y=0.0, z=0.0):
    pb = arm.pose.bones[nome]
    # giro voluto negli assi del mondo, portato in quelli dell'osso
    mondo = (Matrix.Rotation(z, 4, 'Z') @ Matrix.Rotation(y, 4, 'Y') @ Matrix.Rotation(x, 4, 'X')).to_quaternion()
    riposo = pb.bone.matrix_local.to_quaternion()
    pb.rotation_mode = 'QUATERNION'
    pb.rotation_quaternion = riposo.inverted() @ mondo @ riposo
OSSA = [b.name for b in arm.pose.bones]
def chiave(f):
    for n in OSSA:
        arm.pose.bones[n].keyframe_insert('rotation_quaternion', frame=f)
        arm.pose.bones[n].keyframe_insert('location', frame=f)
def azzera():
    for n in OSSA:
        pb = arm.pose.bones[n]; pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
def azione(nome, fotogrammi, fai):
    arm.animation_data_create()
    a = bpy.data.actions.new(nome); arm.animation_data.action = a
    for f in range(1, fotogrammi + 1):
        azzera(); fai((f - 1) / (fotogrammi - 1)); chiave(f)
    a.use_fake_user = True
    traccia = arm.animation_data.nla_tracks.new(); traccia.name = nome
    traccia.strips.new(nome, 1, a)
    arm.animation_data.action = None
    return a

def fermo(t):
    r = math.sin(t * math.pi * 2)
    posa('busto', x=0.03 * r); posa('testa', x=-0.03 * r, z=0.05 * math.sin(t * math.pi * 2 + 1))
    for s, lato in ((1, 'L'), (-1, 'R')):
        posa('braccio.' + lato, x=0.04 * r, y=s * 0.05); posa('avambraccio.' + lato, x=-0.1)
def cammina(t):
    a = t * math.pi * 2
    arm.pose.bones['radice'].location = (0, abs(math.sin(a)) * 0.05, 0)
    posa('bacino', z=0.07 * math.sin(a)); posa('busto', x=0.08, z=-0.1 * math.sin(a), y=0.04 * math.sin(a)); posa('testa', z=0.05 * math.sin(a))
    for s, lato in ((1, 'L'), (-1, 'R')):
        f = math.sin(a + (0 if s > 0 else math.pi))
        posa('gamba.' + lato, x=-0.6 * f); posa('stinco.' + lato, x=0.5 * max(0.0, -math.cos(a + (0 if s > 0 else math.pi))))
        posa('braccio.' + lato, x=0.45 * f, y=s * 0.06); posa('avambraccio.' + lato, x=-0.25 - 0.15 * f)
def pugno(t):
    # per tre quarti del tempo alza le braccia e si piega indietro; poi le abbatte di colpo
    su = min(1.0, t / 0.72); su = su * su * (3 - 2 * su)
    giu = max(0.0, (t - 0.78) / 0.22); giu = giu * giu
    posa('bacino', x=-0.12 * su + 0.2 * giu); posa('busto', x=-0.25 * su + 0.75 * giu); posa('testa', x=-0.2 * su + 0.3 * giu)
    for s, lato in ((1, 'L'), (-1, 'R')):
        posa('braccio.' + lato, x=-2.75 * su + 3.6 * giu, y=s * 0.25 * su); posa('avambraccio.' + lato, x=-0.5 * su + 0.2 * giu)
        posa('gamba.' + lato, x=0.12 * su - 0.25 * giu); posa('stinco.' + lato, x=0.2 * giu)
azione('fermo', 48, fermo); azione('cammina', 24, cammina); azione('pugno', 18, pugno)
azzera()
bpy.context.scene.render.fps = 24
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(filepath='golem.glb', export_animations=True, export_animation_mode='NLA_TRACKS', export_image_format='JPEG', export_jpeg_quality=85, export_apply=True, export_yup=True, export_skins=True)
d = open('golem.glb', 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + n])
print('ESITO kb', len(d) // 1024, 'animazioni', [(a.get('name')) for a in j.get('animations', [])], 'ossa', len(j['skins'][0]['joints']), 'triangoli', sum(j['accessors'][p['indices']]['count'] // 3 for m in j['meshes'] for p in m['primitives']))
