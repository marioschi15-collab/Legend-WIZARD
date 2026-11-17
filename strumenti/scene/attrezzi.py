"""Gli attrezzi con cui si costruiscono in Blender le zone fatte a mano (il Bosco della Strega, il Borgo d'Inverno...).

Ogni pezzo nasce come una piccola forma (una pietra consumata, un'asse, un tubo) nello spazio suo, con il davanti
verso -Y e l'alto verso Z, e viene posato nella scena con una matrice. La scena tiene tutto diviso per «insieme»
(la casa, il cimitero...) e per materia: alla fine ogni coppia diventa un solo oggetto, così il gioco disegna
poche cose grandi invece di migliaia di piccole.

Le coordinate della scena sono quelle di Blender, con l'origine al centro della zona: x verso est, y verso NORD
(cioè il contrario delle z del gioco), z in alto. `posa(a, b)` prende invece i metri del gioco (a = x, b = z).
"""
import math
import random

import bmesh
import bpy
from mathutils import Matrix, Vector, noise

import terreno
from suoli import gradino


def T(x=0.0, y=0.0, z=0.0):
    return Matrix.Translation((x, y, z))


def R(z=0.0, x=0.0, y=0.0):
    return Matrix.Rotation(z, 4, 'Z') @ Matrix.Rotation(x, 4, 'X') @ Matrix.Rotation(y, 4, 'Y')


def posa(a, b, giro=0.0, dz=0.0, storto=(0.0, 0.0)):
    """La matrice di un pezzo appoggiato sul terreno nel punto (a, b) del gioco, girato di `giro` (come rotation.y
    nel gioco: il davanti guarda verso (sin, cos)) e, volendo, un po' inclinato."""
    return T(a, -b, terreno.terra(a, b) + dz) @ R(giro, storto[0], storto[1])


def verso(da, db):
    """Il giro che fa guardare un pezzo nella direzione (da, db) del gioco."""
    return math.atan2(da, db)


# ----------------------------------------------------------------------------------------------- forme di base


def sgualcisci(bm, quanto, seme=0.0, fitta=1.6):
    """Sposta ogni punto lungo la sua normale secondo un disegno a macchie: pietre consumate, legni storti."""
    bm.normal_update()
    s = Vector((seme, seme * 1.7 + 3.1, seme * 0.3 + 7.7))
    for v in bm.verts:
        v.co += v.normal * (noise.noise(v.co * fitta + s) * quanto)
    return bm


def scatola(sx, sy, sz, z0=0.0, smusso=0.0, tagli=0, rumore=0.0, seme=0.0, fitta=1.6):
    """Una scatola con la base a quota z0. Con `tagli` e `rumore` diventa una pietra consumata; con `smusso` un legno squadrato."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz + sz / 2 + z0))
    if smusso > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=smusso, segments=1, affect='EDGES')
    if tagli > 0:
        bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=tagli, use_grid_fill=True)
    if rumore > 0:
        sgualcisci(bm, rumore, seme, fitta)
    return bm


def cilindro(r1, r2, h, lati=10, z0=0.0, tappi=True):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=tappi, cap_tris=False, segments=lati, radius1=r1, radius2=r2, depth=h)
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, h / 2 + z0))
    return bm


def sfera(r, sub=2, rumore=0.0, seme=0.0, scala=(1, 1, 1), z0=0.0):
    """Un macigno (con `rumore`) o una palla. `z0` alza il centro."""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    if rumore > 0:
        sgualcisci(bm, rumore * r, seme, 1.3 / max(r, 0.05))
    for v in bm.verts:
        v.co = Vector((v.co.x * scala[0], v.co.y * scala[1], v.co.z * scala[2] + z0))
    return bm


def prisma(punti, spessore, y0=0.0, tagli=0, rumore=0.0, seme=0.0):
    """Una sagoma disegnata sul piano x-z (lapidi, croci, archi, timpani) con uno spessore lungo y, centrato in y0."""
    bm = bmesh.new()
    a = [bm.verts.new((x, y0 - spessore / 2, z)) for (x, z) in punti]
    b = [bm.verts.new((x, y0 + spessore / 2, z)) for (x, z) in punti]
    n = len(punti)
    bm.faces.new(a)
    bm.faces.new(list(reversed(b)))
    for i in range(n):
        bm.faces.new((a[(i + 1) % n], b[(i + 1) % n], b[i], a[i]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    if tagli > 0:
        bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=tagli)
        bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    if rumore > 0:
        sgualcisci(bm, rumore, seme)
    return bm


def tubo(punti, lati=8, giri=1.0, passo_uv=1.6, tappo=True):
    """Un tubo lungo una fila di (punto, raggio): rami, radici, ferri piegati, corde. Porta le sue coordinate
    dell'immagine (la corteccia gira attorno e scorre lungo il ramo)."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    anelli = []
    lung = 0.0
    lunghi = []
    for i, (p, r) in enumerate(punti):
        p = Vector(p)
        d = (Vector(punti[min(i + 1, len(punti) - 1)][0]) - Vector(punti[max(i - 1, 0)][0]))
        d = d.normalized() if d.length > 1e-6 else Vector((0, 0, 1))
        a = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        b = d.cross(a)
        if i > 0:
            lung += (p - Vector(punti[i - 1][0])).length
        lunghi.append(lung)
        anelli.append([bm.verts.new(p + (a * math.cos(k / lati * math.tau) + b * math.sin(k / lati * math.tau)) * r) for k in range(lati)])
    for i in range(len(anelli) - 1):
        for k in range(lati):
            k1 = (k + 1) % lati
            f = bm.faces.new((anelli[i][k], anelli[i][k1], anelli[i + 1][k1], anelli[i + 1][k]))
            uu = (k / lati * giri, (k + 1) / lati * giri)
            vv = (lunghi[i] / passo_uv, lunghi[i + 1] / passo_uv)
            for lo, (u, v) in zip(f.loops, ((uu[0], vv[0]), (uu[1], vv[0]), (uu[1], vv[1]), (uu[0], vv[1]))):
                lo[uvl].uv = (u, v)
    if tappo:
        for anello in (anelli[0], anelli[-1]):
            f = bm.faces.new(anello)
            for lo in f.loops:
                lo[uvl].uv = (0.5, 0.5)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def carta(lato, alto, u0, v0, u1, v1, y=0.0):
    """Un cartoncino in piedi (base a terra, largo `lato`, alto `alto`) con un pezzo preciso di un'immagine."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    vs = [bm.verts.new((-lato / 2, y, 0)), bm.verts.new((lato / 2, y, 0)), bm.verts.new((lato / 2, y, alto)), bm.verts.new((-lato / 2, y, alto))]
    f = bm.faces.new(vs)
    for lo, uv in zip(f.loops, ((u0, v0), (u1, v0), (u1, v1), (u0, v1))):
        lo[uvl].uv = uv
    return bm


def arco(larga, alta, quanti=6, acuto=True):
    """I punti di un'apertura ad arco (a sesto acuto o tondo), dal piede sinistro al piede destro passando per la cima."""
    imposta = alta * (0.55 if acuto else 0.5)
    pt = [(-larga / 2, 0.0), (-larga / 2, imposta)]
    for i in range(1, quanti):
        t = i / quanti * math.pi / 2
        if acuto:
            pt.append((-larga / 2 + (1 - math.cos(t)) * larga / 2 * 0.999, imposta + math.sin(t) * (alta - imposta)))
        else:
            pt.append((-math.cos(t) * larga / 2, imposta + math.sin(t) * (alta - imposta)))
    pt.append((0.0, alta))
    for (x, z) in reversed(pt[2:-1]):
        pt.append((-x, z))
    pt += [(larga / 2, imposta), (larga / 2, 0.0)]
    return pt


# ----------------------------------------------------------------------------------------------- la scena


class Scena:
    def __init__(self, piatta=False):
        # `piatta`: una scena di servizio, senza terreno, in cui si costruisce una volta sola la forma di un oggetto
        # sciolto (vedi cose.py).
        self.piatta = piatta
        self.cose = []
        self.parti = {}
        self.luci = []
        self.urti = []
        self.occupati = set()
        self.gente = []
        self.rnd = random.Random(1313)

    def metti(self, bm, insieme, materia, M=None, uv=1.5, tinta=(1.0, 1.0, 1.0), radica=True, liscia=True, scurisci=1.0, cima=None):
        """Posa una forma nella scena. `uv` è quanti metri copre un giro dell'immagine. `radica` scurisce il pezzo
        verso terra (dove si raccolgono umido e ombra): è quello che lo fa sembrare appoggiato davvero. `cima`, se
        c'è, è il colore che prendono le facce rivolte in alto (il muschio e l'erba sopra le rovine e le rocce)."""
        M = M or Matrix.Identity(4)
        d = self.parti.setdefault((insieme, materia), {'v': [], 'f': [], 'uv': [], 'col': [], 'liscio': []})
        base = len(d['v'])
        bm.verts.index_update()
        bm.normal_update()
        uvl = bm.loops.layers.uv.get('uv')
        origine = M.translation
        suolo_qui = terreno.terra(origine.x, -origine.y) if radica and not self.piatta else 0.0
        mondo = [M @ v.co for v in bm.verts]
        d['v'].extend(mondo)
        variazione = self.rnd.uniform(0.86, 1.08) * scurisci
        giro = M.to_3x3()
        for f in bm.faces:
            # quanto la faccia guarda in alto, nel mondo: lì sopra cresce il muschio
            in_alto = max(0.0, min(1.0, ((giro @ f.normal).normalized().z - 0.5) / 0.35)) if cima else 0.0
            n = f.normal
            asse = 0 if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z) else (1 if abs(n.y) >= abs(n.z) else 2)
            d['f'].append([lo.vert.index + base for lo in f.loops])
            d['liscio'].append(liscia)
            for lo in f.loops:
                c = lo.vert.co
                if uvl:
                    d['uv'].append(tuple(lo[uvl].uv))
                else:
                    p = (c.y, c.z) if asse == 0 else ((c.x, c.z) if asse == 1 else (c.x, c.y))
                    d['uv'].append((p[0] / uv, p[1] / uv))
                g = variazione
                if radica:
                    g *= 0.5 + 0.5 * gradino(-0.1, 1.3, mondo[lo.vert.index].z - suolo_qui)
                if in_alto > 0:
                    d['col'].append(tuple((tinta[k] + (cima[k] - tinta[k]) * in_alto) * g for k in range(3)) + (1.0,))
                else:
                    d['col'].append((tinta[0] * g, tinta[1] * g, tinta[2] * g, 1.0))
        bm.free()

    # --- ciò che il gioco deve sapere oltre alle forme ---

    def _gioco(self, v):
        """Da un punto della scena (Blender) alle coordinate del mondo del gioco."""
        return [round(v.x + terreno.CX, 2), round(v.z, 2), round(-v.y + terreno.CZ, 2)]

    def luce(self, M, tipo, forza=1.0, locale=(0, 0, 0)):
        """Un punto che brilla: una torcia, una candela, una finestra, una zucca intagliata, una runa."""
        self.luci.append({'p': self._gioco(M @ Vector(locale)), 't': tipo, 'f': round(forza, 2)})

    def cosa(self, tipo, M):
        """Posa un oggetto sciolto (un barile, una cassa, una lapide...): non entra nella scena scolpita, nel gioco è
        una cosa vera che si spinge, brucia e si sfascia. `M` sta ai suoi piedi. I tipi stanno in cose.py."""
        import cose
        assert tipo in cose.PROTOTIPI, tipo
        self.cose.append((tipo, M @ T(0, 0, 0.03)))
        self.occupa(M.translation.x, -M.translation.y, 1.0)

    def persona(self, M, tipo='paesano', guarda=None):
        """Qualcuno del posto sta qui: un paesano che passeggia lì attorno, o una guardia ferma (che guarda verso -y)."""
        p = {'p': self._gioco(M.translation), 't': tipo}
        if tipo == 'guardia' or guarda:
            p['g'] = round(math.atan2(M[1][0], M[0][0]), 2)
        self.gente.append(p)

    def urto(self, M, sx, sy, sz, z0=0.0, y0=0.0, x0=0.0):
        """Un ingombro a scatola: lì non si passa. Conta solo il giro attorno alla verticale."""
        c = M @ Vector((x0, y0, z0 + sz / 2))
        giro = math.atan2(M[1][0], M[0][0])
        self.urti.append({'p': self._gioco(c), 'm': [round(sx / 2, 2), round(sz / 2, 2), round(sy / 2, 2)], 'g': round(giro, 3)})

    def urto_tondo(self, M, r, h, z0=0.0):
        c = M @ Vector((0, 0, z0 + h / 2))
        self.urti.append({'p': self._gioco(c), 'r': round(r, 2), 'h': round(h / 2, 2)})

    def occupa(self, a, b, r):
        """Dentro questo cerchio il bosco non fa nascere piante sue: c'è già qualcosa di costruito."""
        CX, CZ = terreno.CX, terreno.CZ
        for i in range(math.floor((a - r + CX) / 2), math.floor((a + r + CX) / 2) + 1):
            for j in range(math.floor((b - r + CZ) / 2), math.floor((b + r + CZ) / 2) + 1):
                if math.hypot(i * 2 + 1 - CX - a, j * 2 + 1 - CZ - b) <= r + 1:
                    self.occupati.add((i, j))

    def occupa_linea(self, punti, mezza):
        for (a, b) in punti:
            self.occupa(a, b, mezza)

    # --- alla fine: un oggetto per ogni insieme e materia ---

    def costruisci(self, materiali):
        fatti = []
        for (insieme, materia), d in sorted(self.parti.items()):
            # le forme degli oggetti sciolti si riconoscono dal nome (senza punti: il gioco li toglierebbe)
            me = bpy.data.meshes.new(f'{insieme}__{materia}' if insieme.startswith('cosa__') else f'{insieme}.{materia}')
            me.from_pydata([tuple(v) for v in d['v']], [], d['f'])
            uvl = me.uv_layers.new(name='UVMap')
            uvl.data.foreach_set('uv', [c for uv in d['uv'] for c in uv])
            col = me.color_attributes.new('Color', 'FLOAT_COLOR', 'CORNER')
            col.data.foreach_set('color', [c for rgba in d['col'] for c in rgba])
            lisci = []
            for flag, f in zip(d['liscio'], d['f']):
                lisci.append(flag)
            me.polygons.foreach_set('use_smooth', lisci)
            me.update()
            try:
                me.set_sharp_from_angle(angle=math.radians(42))
            except Exception as errore:  # versioni di Blender senza questa funzione: resta tutto liscio
                print('niente spigoli vivi:', errore)
            me.materials.append(materiali[materia])
            ob = bpy.data.objects.new(me.name, me)
            bpy.context.collection.objects.link(ob)
            fatti.append((me.name, len(d['f'])))
        return fatti


def crea_materiali():
    """Le materie delle scene. Nel file che va al gioco c'è solo il loro nome: le immagini (public/materiali/scene)
    le mette il gioco, una volta sola per tutte le zone. Chi non ha immagine prende il colore dai punti."""
    def materia(nome, colore=(1, 1, 1), luce=0.0):
        m = bpy.data.materials.new(nome)
        m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Roughness'].default_value = 0.95
        b.inputs['Base Color'].default_value = (*colore, 1)
        if luce > 0:
            b.inputs['Emission Color'].default_value = (*colore, 1)
            b.inputs['Emission Strength'].default_value = luce
        return m

    nomi = ('muro', 'pietra', 'muschio', 'tetto', 'legno', 'corteccia', 'terra', 'ciottoli', 'intonaco', 'tegole', 'neve', 'tela', 'tavole', 'colore',
            'blocchi', 'lastre', 'rupe', 'cascata')
    m = {n: materia(n) for n in nomi}
    m.update({
        'vetrata': materia('vetrata', luce=3.0), 'rametti': materia('rametti', (0.3, 0.25, 0.2)), 'ferro': materia('ferro', (0.035, 0.035, 0.04)),
        'luce': materia('luce', (1.0, 0.62, 0.22), 6.0), 'runa': materia('runa', (0.35, 0.95, 1.0), 6.0), 'ghiaccio': materia('ghiaccio', (0.7, 0.85, 0.95)),
        'cristallo': materia('cristallo', (0.7, 0.4, 1.0), 6.0),
    })
    return m
