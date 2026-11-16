import bpy, math, random, json
from mathutils import Vector, Matrix, noise
bpy.ops.wm.read_factory_settings(use_empty=True)

def cammino(parti, da, verso, lungo, raggio, livello, rnd, passi):
    """Un ramo: una fila di punti che si piega e si assottiglia. Restituisce [(punto, raggio)]."""
    p = Vector(da); d = Vector(verso).normalized(); punti = [(p.copy(), raggio)]
    for i in range(1, passi + 1):
        t = i / passi
        # nodoso: ogni tratto devia un po', e i rami tendono a risalire verso la luce
        dev = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1))) * (0.22 + 0.1 * livello)
        d = (d + dev + Vector((0, 0, 0.12 * livello))).normalized()
        p = p + d * (lungo / passi)
        punti.append((p.copy(), raggio * (1 - t * (0.55 if livello == 0 else 0.8)) + 0.004))
    parti.append((livello, punti))
    return punti

def albero(seme, alto=6.0):
    rnd = random.Random(seme); parti = []; cime = []
    tronco = cammino(parti, (0, 0, -0.3), (rnd.uniform(-0.12, 0.12), rnd.uniform(-0.12, 0.12), 1), alto, 0.34 * alto / 6, 0, rnd, 9)
    n1 = rnd.randint(5, 7)
    for k in range(n1):
        i = rnd.randint(3, 9); p, r = tronco[i]
        a = k / n1 * math.tau + rnd.uniform(-0.4, 0.4); su = rnd.uniform(0.25, 0.9)
        b1 = cammino(parti, p, (math.cos(a), math.sin(a), su), rnd.uniform(2.6, 4.2) * alto / 6, r * 0.55, 1, rnd, 7)
        for j in range(rnd.randint(3, 5)):
            q, r2 = b1[rnd.randint(2, 7)]
            a2 = a + rnd.uniform(-1.2, 1.2)
            b2 = cammino(parti, q, (math.cos(a2), math.sin(a2), rnd.uniform(0.1, 1.0)), rnd.uniform(1.2, 2.2) * alto / 6, r2 * 0.6, 2, rnd, 5)
            # dove attaccare i ciuffi di rametti: in punta e a metà
            for (ix, sc) in ((5, 1.0), (3, 0.8)):
                dirz = (b2[ix][0] - b2[ix - 1][0]).normalized(); cime.append((b2[ix][0].copy(), dirz, sc * rnd.uniform(0.85, 1.25)))
        dirz = (b1[7][0] - b1[6][0]).normalized(); cime.append((b1[7][0].copy(), dirz, 1.2))
    dirz = (tronco[9][0] - tronco[8][0]).normalized(); cime.append((tronco[9][0].copy(), dirz, 1.4))
    return parti, cime

def tubi(parti):
    """Le parti grosse come tubi con la corteccia: posizioni, normali, coordinate dell'immagine, triangoli."""
    pos, nor, uv, ind = [], [], [], []
    for livello, punti in parti:
        lati = (8, 6, 4)[livello]
        base = len(pos) // 3; lung = 0.0
        for i, (p, r) in enumerate(punti):
            d = (punti[min(i + 1, len(punti) - 1)][0] - punti[max(i - 1, 0)][0]).normalized()
            a = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized(); b = d.cross(a)
            if i > 0: lung += (p - punti[i - 1][0]).length
            for k in range(lati + 1):
                ang = k / lati * math.tau; n = a * math.cos(ang) + b * math.sin(ang)
                # la corteccia non è liscia: il raggio ondeggia un poco
                rr = r * (1 + 0.12 * noise.noise(p * 2.0 + n * 1.5))
                v = p + n * rr
                pos += [v.x, v.z, -v.y]; nor += [n.x, n.z, -n.y]          # da Blender (z in su) al gioco (y in su)
                uv += [k / lati * (2 if livello == 0 else 1), lung / 1.6]
        for i in range(len(punti) - 1):
            for k in range(lati):
                a0 = base + i * (lati + 1) + k; b0 = a0 + lati + 1
                ind += [a0, a0 + 1, b0, a0 + 1, b0 + 1, b0]
    return pos, nor, uv, ind

def carte(cime, rnd):
    """I rametti fini: per ogni cima due cartoncini incrociati con il ritratto di un ciuffo (quattro ritratti in una immagine)."""
    pos, nor, uv, ind = [], [], [], []
    for (p, d, sc) in cime:
        lato = 2.3 * sc; quale = rnd.randint(0, 3)
        a = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized(); b = d.cross(a)
        g = rnd.uniform(0, math.pi)
        for asse in (a * math.cos(g) + b * math.sin(g), a * -math.sin(g) + b * math.cos(g)):
            n0 = len(pos) // 3; o = p - d * (0.08 * lato)
            for (sx, sy) in ((-0.5, 0), (0.5, 0), (0.5, 1), (-0.5, 1)):
                v = o + asse * (sx * lato) + d * (sy * lato)
                pos += [v.x, v.z, -v.y]; nor += [0, 1, 0]
                uv += [(quale % 2) * 0.5 + (sx + 0.5) * 0.5, 1 - (quale // 2) * 0.5 - (1 - sy) * 0.5]
            ind += [n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3]
    return pos, nor, uv, ind

r3 = lambda a, d=3: [round(x, d) for x in a]
dati = []
for seme, alto in ((3, 6.2), (11, 5.4), (27, 7.0)):
    parti, cime = albero(seme, alto)
    tp, tn, tu, ti = tubi(parti); cp, cn, cu, ci = carte(cime, random.Random(seme * 7))
    dati.append({'tronco': {'pos': r3(tp), 'nor': r3(tn, 2), 'uv': r3(tu), 'ind': ti}, 'rami': {'pos': r3(cp), 'nor': r3(cn, 2), 'uv': r3(cu), 'ind': ci}})
    print('albero', seme, 'triangoli tronco', len(ti) // 3, 'carte', len(ci) // 6)
open('alberi_spogli.json', 'w').write(json.dumps(dati, separators=(',', ':')))

# ---- i quattro ritratti dei ciuffi di rametti, resi da Blender con lo sfondo trasparente ----
def ciuffo(seme):
    rnd = random.Random(seme); parti = []
    asta = cammino(parti, (0, 0, 0), (rnd.uniform(-0.15, 0.15), 0, 1), 1.9, 0.03, 1, rnd, 8)
    for i in range(1, 9):
        for s in (-1, 1):
            if rnd.random() < 0.2: continue
            q, r = asta[i]
            b = cammino(parti, q, (s * rnd.uniform(0.5, 1.2), rnd.uniform(-0.25, 0.25), rnd.uniform(0.3, 1.0)), rnd.uniform(0.5, 1.1), r * 0.6, 2, rnd, 5)
            for j in range(1, 6):
                if rnd.random() < 0.3: continue
                q2, r2 = b[j]
                c = cammino(parti, q2, (rnd.uniform(-1, 1), rnd.uniform(-0.3, 0.3), rnd.uniform(0.0, 1.0)), rnd.uniform(0.2, 0.5), r2 * 0.6, 2, rnd, 3)
                for m in range(1, 4):
                    if rnd.random() < 0.5: cammino(parti, c[m][0], (rnd.uniform(-1, 1), 0, rnd.uniform(0, 1)), rnd.uniform(0.1, 0.25), 0.004, 2, rnd, 2)
    return parti
sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.samples = 12; sc.cycles.device = 'CPU'
sc.render.film_transparent = True; sc.render.resolution_x = sc.render.resolution_y = 512; sc.view_settings.view_transform = 'Standard'
mat = bpy.data.materials.new('ramo'); mat.use_nodes = True; nt = mat.node_tree; nt.nodes.clear()
em = nt.nodes.new('ShaderNodeEmission'); em.inputs['Color'].default_value = (0.11, 0.09, 0.075, 1); em.inputs['Strength'].default_value = 1
out = nt.nodes.new('ShaderNodeOutputMaterial'); nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
cam = bpy.data.cameras.new('c'); cam.type = 'ORTHO'; cam.ortho_scale = 2.3
co = bpy.data.objects.new('c', cam); sc.collection.objects.link(co); sc.camera = co
co.location = (0, -6, 1.15 - 0.08 * 2.3); co.rotation_euler = (math.pi / 2, 0, 0)
for q in range(4):
    for o in [o for o in bpy.data.objects if o.type == 'CURVE']: bpy.data.objects.remove(o)
    for livello, punti in ciuffo(40 + q):
        cu = bpy.data.curves.new('r', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 1
        sp = cu.splines.new('POLY'); sp.points.add(len(punti) - 1)
        for i, (p, r) in enumerate(punti): sp.points[i].co = (p.x, p.y, p.z, 1); sp.points[i].radius = r
        ob = bpy.data.objects.new('r', cu); ob.data.materials.append(mat); sc.collection.objects.link(ob)
    sc.render.filepath = f'//ciuffo{q}.png'; bpy.ops.render.render(write_still=True)
print('ritratti fatti')

# ---- il ritratto dell'albero intero, per quando è lontano: tronco, rami e una nuvola di rametti ----
for o in [o for o in bpy.data.objects if o.type == 'CURVE']: bpy.data.objects.remove(o)
parti, cime = albero(3, 6.2)
rnd = random.Random(5)
for (p, d, s2) in cime:
    for k in range(7):
        dd = (d + Vector((rnd.uniform(-0.8, 0.8), rnd.uniform(-0.8, 0.8), rnd.uniform(-0.2, 0.8)))).normalized()
        punti = cammino(parti, p, dd, rnd.uniform(0.5, 1.3) * s2, 0.012, 2, rnd, 4)
        for (q, _) in punti[1:]:
            if rnd.random() < 0.6: cammino(parti, q, (rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(0, 1)), rnd.uniform(0.2, 0.5), 0.006, 2, rnd, 2)
for livello, punti in parti:
    cu = bpy.data.curves.new('r', 'CURVE'); cu.dimensions = '3D'; cu.bevel_depth = 1.0; cu.bevel_resolution = 1
    sp = cu.splines.new('POLY'); sp.points.add(len(punti) - 1)
    for i, (p, r) in enumerate(punti): sp.points[i].co = (p.x, p.y, p.z, 1); sp.points[i].radius = r
    ob = bpy.data.objects.new('r', cu); ob.data.materials.append(mat); sc.collection.objects.link(ob)
cam.ortho_scale = 10.0; co.location = (0, -20, 4.7)
sc.render.filepath = '//spoglio_intero.png'; bpy.ops.render.render(write_still=True)
print('ritratto intero fatto')
