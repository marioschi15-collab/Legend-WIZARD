import bpy, math, json, struct, random
from mathutils import Vector, Matrix, noise
bpy.ops.wm.read_factory_settings(use_empty=True)
random.seed(7)
def materiale(nome, file=None, colore=None):
    m = bpy.data.materials.new(nome); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Roughness'].default_value = 0.95
    if file:
        t = m.node_tree.nodes.new('ShaderNodeTexImage'); t.image = bpy.data.images.load(file)
        m.node_tree.links.new(t.outputs['Color'], b.inputs['Base Color'])
    if colore: b.inputs['Base Color'].default_value = (*colore, 1)
    return m
MURO = materiale('muro', 'casa_muro.jpg'); TETTO = materiale('tetto', 'casa_tetto.jpg'); LEGNO = materiale('legno', 'casa_legno.jpg')
FINESTRA = materiale('finestra', 'casa_vetrata.jpg'); FERRO = materiale('ferro', colore=(0.04, 0.04, 0.05))
tutti = []
def finisci(o, m, lato=2.0, proietta=True):
    bpy.context.view_layer.objects.active = o
    for x in bpy.context.selected_objects: x.select_set(False)
    o.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if proietta:
        bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.uv.cube_project(cube_size=lato); bpy.ops.object.mode_set(mode='OBJECT')
    o.data.materials.append(m); tutti.append(o); return o
def nuovo(nome, v, f):
    me = bpy.data.meshes.new(nome); me.from_pydata(v, [], f); me.update()
    o = bpy.data.objects.new(nome, me); bpy.context.collection.objects.link(o); return o
def scatola(x, y, z, sx, sy, sz, m, rz=0.0, lato=2.0, rx=0.0, ry=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z)); o = bpy.context.object
    o.scale = (sx, sy, sz); o.rotation_euler = (rx, ry, rz); return finisci(o, m, lato)
def masso(x, y, z, sx, sy, sz, m=MURO):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=1, location=(x, y, z)); o = bpy.context.object
    s = random.random() * 40
    for v in o.data.vertices: v.co *= 1 + noise.noise(v.co * 1.2 + Vector((s, s, s))) * 0.35
    o.scale = (sx, sy, sz); o.rotation_euler = (0, 0, random.random() * 6); return finisci(o, m, 1.4)
PASSI = 7
def profilo(largo, alto, sporge):
    # mezza sezione di un tetto ripido che si allarga in gronda (incurvato verso l'interno)
    return [((largo / 2 + sporge) * (1 - t) ** 1.7, alto * t) for t in [i / PASSI for i in range(PASSI + 1)]]
def tetto(x, y, z, lungo, largo, alto, rz=0.0, sporge=0.5, storto=0.0):
    pr = profilo(largo, alto, sporge); l = lungo / 2 + sporge * 0.8
    v = []; f = []
    for sx in (-l, l):
        for s in (-1, 1):
            for (w, h) in pr: v.append((sx + h * storto, s * w, h))
    n = PASSI + 1
    # falde (due lati), per ogni lato una striscia tra le due teste
    for s in (0, 1):
        for i in range(PASSI):
            a = s * n + i; b = 2 * n + s * n + i
            f.append((a, b, b + 1, a + 1) if s == 0 else (a, a + 1, b + 1, b))
    # teste (i due timpani del tetto)
    for t in (0, 1):
        base = t * 2 * n
        for i in range(PASSI):
            f.append((base + i, base + i + 1, base + n + i + 1, base + n + i) if t == 0 else (base + i, base + n + i, base + n + i + 1, base + i + 1))
    o = nuovo('tetto', v, f); o.location = (x, y, z); o.rotation_euler = (0, 0, rz); return finisci(o, TETTO, 2.2)
def timpano(x, y, z, largo, alto, rz=0.0, spesso=0.3):
    # il muro a punta sotto la testa di un tetto, appena dentro la falda
    pr = profilo(largo - 0.3, alto - 0.25, 0.0)
    v = []
    for sy in (-spesso / 2, spesso / 2):
        for (w, h) in pr: v.append((sy, -w, h))
        for (w, h) in reversed(pr[:-1]): v.append((sy, w, h))
    m = len(v) // 2
    f = [tuple(range(m)), tuple(reversed(range(m, 2 * m)))] + [(i, (i + 1) % m, m + (i + 1) % m, m + i) for i in range(m)]
    o = nuovo('timpano', v, f); o.location = (x, y, z); o.rotation_euler = (0, 0, rz); return finisci(o, MURO, 2.0)
def finestra(x, y, z, rz=0.0, larga=0.8, alta=1.7):
    # una finestra a sesto acuto, accesa, con la grata a rombi (la figura è nell'immagine)
    pt = [(-larga / 2, 0), (larga / 2, 0), (larga / 2, alta * 0.55)]
    for i in range(1, 6):
        a = i / 6 * (math.pi / 2); pt.append((larga / 2 - (1 - math.cos(a)) * larga / 2, alta * 0.55 + math.sin(a) * alta * 0.45))
    pt.append((0, alta))
    for i in range(5, 0, -1):
        a = i / 6 * (math.pi / 2); pt.append((-larga / 2 + (1 - math.cos(a)) * larga / 2, alta * 0.55 + math.sin(a) * alta * 0.45))
    pt.append((-larga / 2, alta * 0.55))
    v = [(px, 0, pz) for (px, pz) in pt]
    o = nuovo('finestra', v, [tuple(range(len(v)))])
    uvl = o.data.uv_layers.new(name='UVMap')
    for li, lo in enumerate(o.data.loops):
        px, _, pz = o.data.vertices[lo.vertex_index].co; uvl.data[li].uv = (px / larga + 0.5, pz / alta)
    o.location = (x, y, z); o.rotation_euler = (0, 0, rz); finisci(o, FINESTRA, proietta=False)
    # la cornice di pietra scura, appena dietro e appena più grande
    c, s = math.cos(rz), math.sin(rz)
    scatola(x + s * 0.06, y - c * -0.06, z - 0.08, larga + 0.5, 0.3, 0.16, MURO, rz)
def ala(x, y, largo, fondo, alto_muro, alto_tetto, rz=0.0, storto=0.0):
    # un corpo di fabbrica: muro di pietra, tetto ripido con il colmo lungo x, i due timpani
    scatola(x, y, alto_muro / 2, largo, fondo, alto_muro, MURO, rz)
    tetto(x, y, alto_muro, largo, fondo, alto_tetto, rz, storto=storto)
    c, s = math.cos(rz), math.sin(rz)
    for k in (-1, 1): timpano(x + c * k * (largo / 2 - 0.16), y + s * k * (largo / 2 - 0.16), alto_muro, fondo, alto_tetto, rz)

# ---------------- la casa (il davanti è verso -y) ----------------
# il basamento: un terrazzo di pietra irregolare, più alto sul davanti
scatola(0, -0.5, -0.6, 13.5, 11.5, 2.2, MURO)
for i in range(26):
    a = i / 26 * math.pi * 2
    masso(math.cos(a) * 7.2 + random.uniform(-0.4, 0.4), -0.5 + math.sin(a) * 6.2 + random.uniform(-0.4, 0.4), random.uniform(-0.6, 0.3), random.uniform(0.7, 1.3), random.uniform(0.7, 1.3), random.uniform(0.6, 1.2))
P = 0.5   # quota del pavimento
bpy.ops.object.empty_add(location=(0, 0, P)); su = bpy.context.object
prima = len(tutti)
ala(0, 0.6, 9.0, 5.6, 3.6, 6.8, 0, storto=0.03)                 # il corpo grande
ala(-2.4, -2.9, 4.4, 4.0, 4.2, 6.0, math.pi / 2, storto=-0.04)  # l'avancorpo a punta, sul davanti
ala(3.4, -2.4, 3.2, 2.8, 2.9, 3.6, math.pi / 2)                 # il portico della porta
ala(-1.0, 0.6, 2.2, 2.0, 7.2, 3.0, math.pi / 2)                 # un abbaino alto sul tetto
ala(2.2, 0.2, 1.8, 1.8, 6.6, 2.6, math.pi / 2)                  # un secondo abbaino
# la torretta rotonda con il cappello a punta
bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1.55, depth=9.0, location=(-5.0, 1.6, 4.5)); finisci(bpy.context.object, MURO)
bpy.ops.mesh.primitive_cone_add(vertices=14, radius1=2.1, radius2=0.0, depth=5.6, location=(-5.0, 1.6, 11.8)); finisci(bpy.context.object, TETTO, 2.2)
scatola(-5.0, 1.6, 15.0, 0.1, 0.1, 1.4, FERRO)
# il camino alto e storto: sei tronchi impilati, ognuno un po' spostato e girato
cx, cy, cz = 3.6, 1.6, 3.0
for i in range(7):
    scatola(cx, cy, cz + 0.85, 1.45 - i * 0.08, 1.45 - i * 0.08, 1.75, MURO, rz=0.1 * i, ry=0.03 * (i % 3 - 1))
    cx += 0.09 * (1 if i % 2 else -0.4); cy += 0.05; cz += 1.65
scatola(cx, cy, cz + 0.15, 1.6, 1.6, 0.35, MURO, 0.6); scatola(cx, cy, cz + 0.55, 0.9, 0.9, 0.5, MURO, 0.6)
# guglie di ferro sui colmi
for (gx, gy, gz) in ((-4.3, 0.6, 10.5), (4.3, 0.6, 10.5), (-2.4, -4.8, 10.3)):
    scatola(gx, gy, gz + 0.6, 0.09, 0.09, 1.5, FERRO); scatola(gx, gy, gz + 0.95, 0.45, 0.07, 0.07, FERRO)
# travi a vista e mensole
for x in (-4.5, 4.5):
    for y in (-2.2, 3.4): scatola(x, y, 1.8, 0.3, 0.3, 3.6, LEGNO)
for y in (-2.22, 3.42): scatola(0, y, 3.5, 9.2, 0.24, 0.28, LEGNO)
for k in (-1, 1): scatola(-2.4 + k * 1.4, -4.92, 4.9, 0.18, 0.14, 2.6, LEGNO, ry=k * 0.5)
# la porta ad arco nel portico, con il suo gradino
scatola(3.4, -3.84, 1.2, 1.25, 0.16, 2.4, LEGNO); scatola(3.4, -3.9, 2.5, 1.6, 0.2, 0.22, LEGNO); scatola(3.75, -3.94, 1.2, 0.08, 0.08, 0.3, FERRO)
# le finestre accese
finestra(-2.4, -4.93, 0.9, 0, 1.0, 2.3); finestra(-2.4, -4.93, 4.6, 0, 0.8, 1.8)
finestra(0.6, -2.23, 0.9, 0, 0.8, 1.9); finestra(-4.52, -1.0, 0.9, -math.pi / 2, 0.8, 1.9)
finestra(4.52, 1.2, 0.9, math.pi / 2, 0.8, 1.9); finestra(-1.0, -0.42, 7.3, 0, 0.7, 1.5); finestra(2.2, -0.72, 6.7, 0, 0.6, 1.3)
finestra(-5.0, 0.03, 3.2, 0, 0.6, 1.5); finestra(-5.0, 0.03, 6.6, 0, 0.6, 1.4); finestra(0.6, 3.43, 1.0, math.pi, 0.8, 1.8)
for o in tutti[prima:]: o.location.z += P; 
bpy.ops.object.select_all(action='DESELECT')
for o in tutti[prima:]: o.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
# la scalinata di pietra che scende sul davanti, curvando, tra due muretti con i pali delle torce
for i in range(9):
    a = i * 0.11
    scatola(3.4 + math.sin(a) * i * 0.5, -5.2 - i * 0.72, P - 0.15 - i * 0.2, 3.0 + i * 0.12, 0.85, 0.42, MURO, a * 0.9, 1.2)
for k in (-1, 1):
    for i in range(5):
        masso(3.4 + k * 2.2 + i * 0.35, -5.4 - i * 1.5, P - 0.2 - i * 0.3, 0.55, 0.7, 0.6)
    scatola(3.4 + k * 2.3, -5.6, P + 1.0, 0.14, 0.14, 1.8, LEGNO)
bpy.ops.object.select_all(action='DESELECT')
for o in tutti: o.select_set(True)
bpy.context.view_layer.objects.active = tutti[0]; bpy.ops.object.join(); casa = bpy.context.object; casa.name = 'casaStrega'
bpy.ops.object.shade_flat()
bpy.ops.export_scene.gltf(filepath='casa_strega.glb', export_image_format='JPEG', export_jpeg_quality=82, export_yup=True, export_apply=True)
d = open('casa_strega.glb', 'rb').read(); n = struct.unpack('<I', d[12:16])[0]; j = json.loads(d[20:20 + n])
print('ESITO kb', len(d) // 1024, 'triangoli', sum(j['accessors'][p['indices']]['count'] // 3 for m in j['meshes'] for p in m['primitives']), [m['name'] for m in j['materials']])
