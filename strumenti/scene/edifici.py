"""Gli edifici e i manufatti grandi del Bosco della Strega: la casa, la cripta, la cappella in rovina, il pozzo,
il carro delle bare, il pontile con la barca, il portale d'ingresso, i sentieri."""
import math

import bmesh
from mathutils import Matrix, Vector

from attrezzi import R, T, arco, cilindro, prisma, scatola, sfera, sgualcisci, tubo
from oggetti import NERO, bara, candele, corvo, lanterna, masso, piatto, teschio
import terreno


def spline(punti, passo=1.0):
    """Una curva morbida che passa per i punti dati, campionata più o meno ogni `passo` metri."""
    pt = [punti[0]] + list(punti) + [punti[-1]]
    fuori = []
    for i in range(1, len(pt) - 2):
        p0, p1, p2, p3 = (Vector(pt[i - 1]), Vector(pt[i]), Vector(pt[i + 1]), Vector(pt[i + 2]))
        n = max(2, round((p2 - p1).length / passo))
        for k in range(n):
            t = k / n
            fuori.append(tuple(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)))
    fuori.append(tuple(punti[-1]))
    return fuori


def sentiero(S, punti, largo, materia, insieme, rnd, bordi=0.6, gradini=True):
    """Un sentiero steso sul terreno lungo una fila fitta di punti del gioco: una striscia che ne segue ogni gobba,
    i sassi lungo i bordi e, dove sale ripido, i gradoni di pietra."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    righe = []
    lung = 0.0
    for i, (a, b) in enumerate(punti):
        (a0, b0), (a1, b1) = punti[max(0, i - 1)], punti[min(len(punti) - 1, i + 1)]
        tl = math.hypot(a1 - a0, b1 - b0) or 1.0
        la, lb = -(b1 - b0) / tl, (a1 - a0) / tl
        if i > 0:
            lung += math.hypot(a - punti[i - 1][0], b - punti[i - 1][1])
        mezza = largo / 2 * (1 + 0.14 * math.sin(lung * 0.7) + 0.08 * math.sin(lung * 2.3))
        riga = []
        for k, s in enumerate((-1.0, -0.55, 0.0, 0.55, 1.0)):
            x, z = a + la * s * mezza, b + lb * s * mezza
            riga.append((bm.verts.new((x, -z, terreno.terra(x, z) + (0.025 if abs(s) == 1 else 0.075))), (s * mezza / 2.4, lung / 2.4)))
        righe.append(riga)
    for i in range(len(righe) - 1):
        for k in range(4):
            q = (righe[i][k], righe[i][k + 1], righe[i + 1][k + 1], righe[i + 1][k])
            f = bm.faces.new([v for (v, _) in q])
            for lo, (_, uv) in zip(f.loops, q):
                lo[uvl].uv = uv
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    if bm.faces and sum(f.normal.z for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    S.metti(bm, insieme, materia, radica=False)
    S.occupa_linea(punti, largo / 2 + 1.3)
    passo = 0.0
    for i in range(1, len(punti)):
        (a0, b0), (a, b) = punti[i - 1], punti[i]
        d = math.hypot(a - a0, b - b0)
        passo += d
        giro = math.atan2(a - a0, b - b0)
        if gradini and abs(terreno.terra(a, b) - terreno.terra(a0, b0)) / max(d, 0.01) > 0.1 and passo >= 0.85:
            passo = 0.0
            S.metti(scatola(largo + 0.5, 1.0, 0.26, z0=-0.1, tagli=1, rumore=0.03, seme=i), insieme, 'pietra', T(a, -b, terreno.terra(a, b)) @ R(giro + rnd.uniform(-0.06, 0.06)), uv=1.3)
        if bordi and rnd.random() < bordi:
            for lato in (-1, 1):
                if rnd.random() < 0.75:
                    tl = d or 1.0
                    la, lb = -(b - b0) / tl, (a - a0) / tl
                    x, z = a + la * lato * (largo / 2 + rnd.uniform(0.0, 0.35)), b + lb * lato * (largo / 2 + rnd.uniform(0.0, 0.35))
                    masso(S, T(x, -z, terreno.terra(x, z) - 0.06), rnd, insieme, rnd.uniform(0.14, 0.32), urto=False)


# ------------------------------------------------------------------------------------------------ la casa


def falde(lungo, largo, alto, sporge=0.5, storto=0.0, passi=7):
    """Un tetto ripidissimo che si allarga in gronda, con il colmo lungo x: le due falde e le due teste."""
    pr = [((largo / 2 + sporge) * (1 - i / passi) ** 1.7, alto * i / passi) for i in range(passi + 1)]
    l = lungo / 2 + sporge * 0.8
    bm = bmesh.new()
    n = passi + 1
    vs = []
    for sx in (-l, l):
        for s in (-1, 1):
            for (w, h) in pr:
                vs.append(bm.verts.new((sx + h * storto, s * w, h)))
    for s in (0, 1):
        for i in range(passi):
            a, b = s * n + i, 2 * n + s * n + i
            bm.faces.new((vs[a], vs[b], vs[b + 1], vs[a + 1]) if s == 0 else (vs[a], vs[a + 1], vs[b + 1], vs[b]))
    for t in (0, 1):
        base = t * 2 * n
        for i in range(passi):
            q = (vs[base + i], vs[base + i + 1], vs[base + n + i + 1], vs[base + n + i])
            bm.faces.new(q if t == 0 else tuple(reversed(q)))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm


def finestra(S, M, insieme, larga=0.8, alta=1.7, forza=1.0):
    """Una finestra a sesto acuto accesa, con la grata a rombi (è nell'immagine) e la cornice di pietra."""
    pt = arco(larga, alta, 6)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    f = bm.faces.new([bm.verts.new((x, 0, z)) for (x, z) in pt])
    for lo in f.loops:
        lo[uvl].uv = (lo.vert.co.x / larga + 0.5, lo.vert.co.z / alta)
    bm.normal_update()
    if f.normal.y > 0:
        bmesh.ops.reverse_faces(bm, faces=[f])
    bmesh.ops.triangulate(bm, faces=list(bm.faces))
    S.metti(bm, insieme, 'vetrata', M @ T(0, -0.02, 0), radica=False, liscia=False)
    S.metti(tubo([((x, 0, z), 0.075) for (x, z) in pt], 4, tappo=False), insieme, 'pietra', M @ T(0, -0.02, 0), radica=False)
    S.metti(scatola(larga + 0.5, 0.32, 0.14, z0=-0.14, tagli=1, rumore=0.01), insieme, 'pietra', M @ T(0, -0.06, 0), uv=1.2, radica=False)
    S.luce(M, 'finestra', forza, (0, -0.25, alta * 0.5))


def ala(S, M, insieme, largo, fondo, alto_muro, alto_tetto, storto=0.0, seme=0.0):
    """Un corpo di fabbrica: muro di pietra, tetto ripido con il colmo lungo x, i due timpani."""
    S.metti(scatola(largo, fondo, alto_muro, tagli=3, rumore=0.03, seme=seme), insieme, 'muro', M, uv=2.0)
    S.metti(falde(largo, fondo, alto_tetto, storto=storto), insieme, 'tetto', M @ T(0, 0, alto_muro), uv=2.2, radica=False, liscia=False)
    w, h = (fondo - 0.3) / 2, alto_tetto - 0.25
    pr = [(w * (1 - i / 7) ** 1.7, h * i / 7) for i in range(8)]
    sagoma = [(-x, z) for (x, z) in pr] + [(x, z) for (x, z) in reversed(pr[:-1])]
    for k in (-1, 1):
        S.metti(prisma(sagoma, 0.3, tagli=1, rumore=0.02, seme=seme + k), insieme, 'muro', M @ T(k * (largo / 2 - 0.16), 0, alto_muro) @ R(math.pi / 2), uv=2.0, radica=False)


def casa(S, M, rnd):
    """La casa della strega: il davanti (porta e scalinata) è verso -y."""
    I = 'casa'
    P = 0.35
    # il basamento: un terrazzo di pietre, con i massi tutt'intorno
    S.metti(scatola(13.8, 11.8, 2.0, z0=-1.45, tagli=3, rumore=0.06, seme=1), I, 'muro', M @ T(0, -0.5, 0), uv=2.0)
    for i in range(30):
        an = i / 30 * math.tau
        x, y = math.cos(an) * 7.3 + rnd.uniform(-0.4, 0.4), -0.5 + math.sin(an) * 6.3 + rnd.uniform(-0.4, 0.4)
        if abs(x - 3.4) < 2.8 and y < -4:
            continue    # davanti alla porta si passa
        masso(S, M @ T(x, y, rnd.uniform(-0.5, 0.0)), rnd, I, rnd.uniform(0.6, 1.15), urto=False)
    Mp = M @ T(0, 0, P)
    ala(S, Mp @ T(0, 0.6, 0), I, 9.0, 5.6, 3.6, 6.8, 0.03, 1)                              # il corpo grande
    ala(S, Mp @ T(-2.4, -2.9, 0) @ R(math.pi / 2), I, 4.4, 4.0, 4.2, 6.0, -0.04, 2)        # l'avancorpo a punta
    ala(S, Mp @ T(3.4, -2.4, 0) @ R(math.pi / 2), I, 3.2, 2.8, 2.9, 3.6, 0.0, 3)           # il portico
    ala(S, Mp @ T(-1.0, 0.6, 0) @ R(math.pi / 2), I, 2.2, 2.0, 7.2, 3.0, 0.0, 4)           # due abbaini
    ala(S, Mp @ T(2.2, 0.2, 0) @ R(math.pi / 2), I, 1.8, 1.8, 6.6, 2.6, 0.0, 5)
    # la torretta rotonda con il cappello a punta
    torre = cilindro(1.6, 1.5, 9.2, 16, z0=-0.2)
    bmesh.ops.subdivide_edges(torre, edges=[e for e in torre.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1], cuts=5)
    sgualcisci(torre, 0.04, 9)
    S.metti(torre, I, 'muro', Mp @ T(-5.0, 1.6, 0), uv=2.0)
    S.metti(cilindro(2.15, 0.0, 5.8, 16, z0=8.9), I, 'tetto', Mp @ T(-5.0, 1.6, 0), uv=2.2, radica=False)
    S.metti(scatola(0.1, 0.1, 1.4, z0=14.4), I, 'ferro', Mp @ T(-5.0, 1.6, 0), radica=False)
    # il camino alto e storto
    cx, cy, cz = 3.6, 1.6, 3.0
    for i in range(7):
        S.metti(scatola(1.45 - i * 0.08, 1.45 - i * 0.08, 1.75, tagli=2, rumore=0.03, seme=20 + i), I, 'muro', Mp @ T(cx, cy, cz) @ R(0.1 * i, 0, 0.03 * (i % 3 - 1)), uv=1.8, radica=False)
        cx += 0.09 * (1 if i % 2 else -0.4)
        cy += 0.05
        cz += 1.65
    S.metti(scatola(1.65, 1.65, 0.35, tagli=1, rumore=0.02), I, 'pietra', Mp @ T(cx, cy, cz) @ R(0.6), uv=1.2, radica=False)
    S.metti(scatola(0.95, 0.95, 0.5), I, 'muro', Mp @ T(cx, cy, cz + 0.35) @ R(0.6), uv=1.8, radica=False)
    S.luce(Mp, 'fumo', 1.0, (cx, cy, cz + 1.0))
    for (gx, gy, gz) in ((-4.3, 0.6, 10.5), (4.3, 0.6, 10.5), (-2.4, -4.8, 10.3)):   # guglie di ferro sui colmi
        S.metti(scatola(0.09, 0.09, 1.5, z0=gz + 0.1), I, 'ferro', Mp @ T(gx, gy, 0), radica=False)
        S.metti(scatola(0.45, 0.07, 0.07, z0=gz + 0.9), I, 'ferro', Mp @ T(gx, gy, 0), radica=False)
    corvo(S, Mp @ T(1.5, 0.6, 10.4), rnd, I)
    corvo(S, Mp @ T(-2.4, -3.6, 10.2), rnd, I)
    # travi a vista e mensole
    for x in (-4.5, 4.5):
        for y in (-2.2, 3.4):
            S.metti(scatola(0.32, 0.32, 3.6, smusso=0.03), I, 'legno', Mp @ T(x, y, 0), uv=0.9)
    for y in (-2.22, 3.42):
        S.metti(scatola(9.3, 0.26, 0.3, z0=3.35, smusso=0.03), I, 'legno', Mp @ T(0, y, 0), uv=0.9, radica=False)
    for k in (-1, 1):
        S.metti(scatola(0.18, 0.14, 2.6, z0=-1.3), I, 'legno', Mp @ T(-2.4 + k * 1.4, -4.92, 4.9) @ R(0, 0, k * 0.5), uv=0.9, radica=False)
    # la porta ad arco, con le bande di ferro e l'anello
    Md = Mp @ T(3.4, -3.84, 0)
    S.metti(prisma(arco(1.3, 2.45, 6), 0.14), I, 'legno', Md, uv=0.8, tinta=(0.75, 0.65, 0.58), liscia=False)
    S.metti(tubo([((x, 0, z), 0.09) for (x, z) in arco(1.5, 2.6, 6)], 4, tappo=False), I, 'pietra', Md @ T(0, 0.02, 0), radica=False)
    for z in (0.5, 1.5):
        S.metti(scatola(1.15, 0.03, 0.09, z0=z), I, 'ferro', Md @ T(0, -0.08, 0), radica=False)
    S.metti(tubo([((0.38 + math.cos(t / 8 * math.tau) * 0.09, -0.1, 1.1 + math.sin(t / 8 * math.tau) * 0.09), 0.014) for t in range(9)], 4, tappo=False), I, 'ferro', Md, radica=False)
    S.metti(scatola(1.7, 0.6, 0.18, tagli=1, rumore=0.015), I, 'pietra', Md @ T(0, -0.35, -0.1), uv=1.2)
    # le finestre accese
    for (x, y, z, giro, w, h) in ((-2.4, -4.93, 0.9, 0, 1.0, 2.3), (-2.4, -4.93, 4.6, 0, 0.8, 1.8), (0.6, -2.23, 0.9, 0, 0.8, 1.9), (-4.52, -1.0, 0.9, -math.pi / 2, 0.8, 1.9),
                                (4.52, 1.2, 0.9, math.pi / 2, 0.8, 1.9), (-1.0, -0.42, 7.3, 0, 0.7, 1.5), (2.2, -0.72, 6.7, 0, 0.6, 1.3), (-5.0, 0.0, 3.2, 0, 0.6, 1.5),
                                (-5.0, 0.0, 6.6, 0, 0.6, 1.4), (0.6, 3.43, 1.0, math.pi, 0.8, 1.8), (-6.55, 1.6, 4.6, -math.pi / 2, 0.6, 1.4)):
        finestra(S, Mp @ T(x, y, z) @ R(giro), I, w, h)
    # il calderone sul fuoco, la catasta di legna, la scopa, un barile
    Mk = M @ T(-5.6, -5.0, P - 0.5)
    for k in range(3):
        an = k * 2.1
        S.metti(tubo([((math.cos(an) * 0.55, math.sin(an) * 0.55, 0.0), 0.03), ((0, 0, 1.5), 0.03)], 4), I, 'ferro', Mk, radica=False)
    paiolo = sfera(0.42, 2, 0, 0, (1, 1, 0.85), z0=0.62)
    bmesh.ops.delete(paiolo, geom=[v for v in paiolo.verts if v.co.z > 0.78], context='VERTS')
    S.metti(paiolo, I, 'ferro', Mk, radica=False)
    S.metti(cilindro(0.33, 0.33, 0.02, 12, z0=0.74), I, 'colore', Mk, tinta=(0.2, 0.75, 0.25), radica=False)
    S.luce(Mk, 'pozione', 0.8, (0, 0, 0.9))
    for k in range(5):
        S.metti(tubo([((-0.35, 0, 0.06), 0.06), ((0.35, 0, 0.06), 0.05)], 6), I, 'corteccia', Mk @ R(k * 0.63), radica=False)
    S.luce(Mk, 'torcia', 0.9, (0, 0, 0.3))
    for i in range(4):
        for j in range(5 - i):
            S.metti(tubo([((0, -0.55, 0), 0.11), ((0, 0.55, 0), 0.1)], 7), I, 'corteccia', M @ T(6.9, 2.0 + (j + i * 0.5) * 0.24 - 0.5, P - 0.42 + i * 0.2) @ R(math.pi / 2 + rnd.uniform(-0.05, 0.05)), radica=False)
    S.metti(tubo([((0, 0, 0), 0.02), ((0, 0.08, 1.5), 0.02)], 5), I, 'legno', M @ T(4.4, -3.75, P), radica=False)
    S.metti(cilindro(0.04, 0.16, 0.4, 7), I, 'colore', M @ T(4.4, -3.75, P), tinta=(0.6, 0.5, 0.25), radica=False)
    botte = cilindro(0.34, 0.34, 0.9, 12)
    for v in botte.verts:
        k = 1 + 0.16 * (1 - (2 * v.co.z / 0.9 - 1) ** 2)
        v.co.x *= k
        v.co.y *= k
    S.metti(botte, I, 'legno', M @ T(5.3, -4.4, P - 0.45), uv=0.8)
    # due lanterne ai lati della porta
    for k in (-1, 1):
        lanterna(S, M @ T(3.4 + k * 2.4, -5.6, P - 0.5) @ R(math.pi / 2 if k < 0 else -math.pi / 2), rnd, I, 2.4, 1.0)
    S.urto(M, 9.4, 6.2, 9.0, 0, 0.6)
    S.urto(M @ T(-2.4, -2.9, 0), 4.2, 4.6, 9.0)
    S.urto(M @ T(3.4, -2.4, 0), 3.0, 3.4, 5.0)
    S.urto_tondo(M @ T(-5.0, 1.6, 0), 1.7, 12.0)


# ------------------------------------------------------------------------------------------------ cripta, cappella


def cripta(S, M, rnd):
    I = 'cimitero'
    S.metti(scatola(6.0, 7.0, 0.3, z0=-0.05, tagli=2, rumore=0.02, seme=1), I, 'pietra', M, uv=1.5)
    S.metti(scatola(5.3, 6.3, 0.28, z0=0.22, tagli=2, rumore=0.02, seme=2), I, 'pietra', M, uv=1.5)
    S.metti(scatola(4.3, 5.2, 3.1, z0=0.48, tagli=3, rumore=0.035, seme=3), I, 'muro', M @ T(0, 0.3, 0), uv=2.0)
    S.metti(scatola(4.9, 6.2, 0.26, z0=3.5, tagli=1, rumore=0.015), I, 'pietra', M, uv=1.5, radica=False)
    S.metti(prisma([(-2.6, 0), (2.6, 0), (0, 1.5)], 6.3, tagli=1, rumore=0.02, seme=5), I, 'muschio', M @ T(0, 0, 3.74), uv=1.6, radica=False)
    for x in (-1.45, 1.45):   # le due colonne davanti
        S.metti(cilindro(0.3, 0.25, 2.75, 12, z0=0.62), I, 'pietra', M @ T(x, -2.75, 0), uv=1.2)
        S.metti(scatola(0.7, 0.7, 0.16, z0=0.48), I, 'pietra', M @ T(x, -2.75, 0), uv=1.2)
        S.metti(scatola(0.72, 0.72, 0.18, z0=3.34), I, 'pietra', M @ T(x, -2.75, 0), uv=1.2, radica=False)
    S.metti(prisma(arco(1.5, 2.5, 6), 0.1), I, 'colore', M @ T(0, -2.32, 0.5), tinta=(0.02, 0.02, 0.025), radica=False, liscia=False)
    S.metti(prisma(arco(0.72, 2.4, 6), 0.07), I, 'ferro', M @ T(-0.46, -2.45, 0.5) @ R(0.0), radica=False, liscia=False)
    S.metti(prisma(arco(0.72, 2.4, 6), 0.07), I, 'ferro', M @ T(0.62, -2.7, 0.5) @ R(-0.8), radica=False, liscia=False)   # un battente socchiuso
    S.metti(tubo([((x, 0, z), 0.1) for (x, z) in arco(1.75, 2.7, 6)], 4, tappo=False), I, 'pietra', M @ T(0, -2.32, 0.5), radica=False)
    b, c, h = 0.11, 0.42, 1.3
    S.metti(prisma([(-b, 0), (b, 0), (b, h * 0.62 - b), (c, h * 0.62 - b), (c, h * 0.62 + b), (b, h * 0.62 + b), (b, h), (-b, h), (-b, h * 0.62 + b), (-c, h * 0.62 + b), (-c, h * 0.62 - b), (-b, h * 0.62 - b)], 0.2, tagli=1, rumore=0.01), I, 'pietra', M @ T(0, -3.0, 5.1), uv=1.2, radica=False)
    candele(S, M @ T(-1.0, -3.1, 0.5), rnd, I, 4, 0.3)
    candele(S, M @ T(1.1, -3.2, 0.5), rnd, I, 3, 0.3)
    S.luce(M, 'cripta', 0.9, (0, -2.2, 1.6))
    teschio(S, M @ T(0.9, -3.3, 0.5), rnd, I)
    S.urto(M @ T(0, 0.3, 0), 4.5, 5.4, 5.0)
    for x in (-1.45, 1.45):
        S.urto_tondo(M @ T(x, -2.75, 0), 0.35, 3.4)
    S.occupa(M.translation.x, -M.translation.y, 5.0)


def campata(S, M, insieme, larga, alta, ap_l, ap_h, davanzale, spessa=0.7, rotta=0.0, seme=0.0, rnd=None):
    """Un tratto di muro con una finestra a sesto acuto. `rotta` (da 0 a 1) dice quanto ne è crollato."""
    if davanzale > 0:
        S.metti(scatola(larga, spessa, davanzale, z0=-0.2, tagli=2, rumore=0.03, seme=seme), insieme, 'muro', M, uv=2.0)
    spalla = (larga - ap_l) / 2
    for k in (-1, 1):
        h = ap_h * 0.55 if rotta < 0.5 else ap_h * rnd.uniform(0.1, 0.6)
        S.metti(scatola(spalla, spessa, h + 0.01, z0=davanzale, tagli=2, rumore=0.03, seme=seme + k), insieme, 'muro', M @ T(k * (ap_l / 2 + spalla / 2), 0, 0), uv=2.0, radica=davanzale < 0.5)
    if rotta < 0.5:
        arcata = [(x, z + davanzale) for (x, z) in arco(ap_l, ap_h, 6)[1:-1]]
        zi = arcata[0][1]
        cima = alta if rotta == 0 else alta - 0.6
        sagoma = [(-larga / 2, zi), (-larga / 2, cima), (-larga * 0.2, cima - (0.5 if rotta else 0)), (larga * 0.15, cima), (larga / 2, cima - (0.9 if rotta else 0)), (larga / 2, zi)] + list(reversed(arcata))
        S.metti(prisma(sagoma, spessa, tagli=1, rumore=0.025, seme=seme + 5), insieme, 'muro', M, uv=2.0, radica=False)
        S.metti(tubo([((x, 0, z + davanzale), 0.09) for (x, z) in arco(ap_l, ap_h, 6)[1:-1]], 4, tappo=False), insieme, 'pietra', M @ T(0, -spessa / 2, 0), radica=False)
        S.urto(M, larga, spessa, alta)
    else:
        S.urto(M, larga, spessa, davanzale + 0.6)


def cappella(S, M, rnd):
    """La cappella in rovina: l'ingresso (verso -y) e una fiancata stanno in piedi, il resto è crollato."""
    I = 'cappella'
    L, W, H = 15.0, 8.0, 5.6
    S.metti(scatola(W + 1.0, L + 1.0, 0.3, z0=-0.2, tagli=3, rumore=0.03, seme=1), I, 'pietra', M, uv=1.6)
    for i in range(4):   # le due fiancate, quattro campate ciascuna
        y = -L / 2 + 1.9 + i * 3.75
        campata(S, M @ T(-W / 2, y, 0) @ R(math.pi / 2), I, 3.75, H, 1.2, 3.4, 1.3, rotta=0.0 if i < 3 else 0.4, seme=i, rnd=rnd)
        campata(S, M @ T(W / 2, y, 0) @ R(-math.pi / 2), I, 3.75, H, 1.2, 3.4, 1.3, rotta=(0.0, 0.4, 1.0, 1.0)[i], seme=10 + i, rnd=rnd)
        for x in (-W / 2 - 0.65, W / 2 + 0.65):   # i contrafforti
            if x > 0 and i > 1:
                continue
            S.metti(prisma([(-0.45, 0), (0.45, 0), (0.45, 2.6), (-0.1, 3.9), (-0.45, 3.9)], 0.8, tagli=1, rumore=0.025, seme=30 + i), I, 'muro', M @ T(x, y - 1.9, -0.2) @ R(math.pi if x < 0 else 0), uv=2.0)
    # la facciata con il portale e il timpano spezzato
    campata(S, M @ T(0, -L / 2, 0), I, 4.0, H, 2.0, 3.6, 0.0, seme=40, rnd=rnd)
    for k in (-1, 1):
        S.metti(scatola(2.35, 0.7, H, z0=-0.2, tagli=3, rumore=0.03, seme=42 + k), I, 'muro', M @ T(k * 3.17, -L / 2, 0), uv=2.0)
        S.urto(M @ T(k * 3.17, -L / 2, 0), 2.35, 0.7, H)
    S.metti(prisma([(-4.35, 0), (4.35, 0), (4.35, 0.5), (2.2, 2.7), (1.3, 2.3), (0.5, 4.2), (-0.6, 4.6), (-2.6, 2.4), (-4.35, 0.6)], 0.7, tagli=1, rumore=0.03, seme=45), I, 'muro', M @ T(0, -L / 2, H - 0.2), uv=2.0, radica=False)
    S.metti(tubo([((math.cos(t / 14 * math.tau) * 0.75, 0, 1.6 + math.sin(t / 14 * math.tau) * 0.75), 0.11) for t in range(15)], 4, tappo=False), I, 'pietra', M @ T(0, -L / 2 - 0.36, H - 0.2), radica=False)
    S.metti(cilindro(0.7, 0.7, 0.05, 14), I, 'colore', M @ T(0, -L / 2 - 0.3, H + 1.4) @ R(0, math.pi / 2), tinta=(0.02, 0.02, 0.03), radica=False)
    # il muro di fondo, crollato a metà
    S.metti(prisma([(-4.35, 0), (4.35, 0), (4.35, 2.2), (2.5, 3.0), (1.2, 2.1), (-0.5, 3.9), (-2.2, 4.6), (-4.35, 5.2)], 0.7, tagli=1, rumore=0.03, seme=50), I, 'muro', M @ T(0, L / 2, -0.2), uv=2.0)
    S.urto(M @ T(0, L / 2, 0), 8.7, 0.7, 3.0)
    # il campanile, con il tetto a punta e le aperture della cella
    Mt = M @ T(-W / 2 - 1.2, -L / 2 + 1.0, 0)
    S.metti(scatola(3.1, 3.1, 11.0, z0=-0.2, tagli=4, rumore=0.045, seme=60), I, 'muro', Mt, uv=2.0)
    S.metti(scatola(3.5, 3.5, 0.25, z0=10.7, tagli=1, rumore=0.02), I, 'pietra', Mt, uv=1.4, radica=False)
    guglia = cilindro(2.45, 0.0, 5.2, 4, z0=10.95)
    bmesh.ops.rotate(guglia, verts=guglia.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(guglia, I, 'tetto', Mt, uv=2.2, radica=False, liscia=False)
    S.metti(scatola(0.1, 0.1, 1.6, z0=16.0), I, 'ferro', Mt, radica=False)
    S.metti(scatola(0.6, 0.08, 0.08, z0=17.0), I, 'ferro', Mt, radica=False)
    for g in range(4):
        S.metti(prisma(arco(0.9, 2.2, 5), 0.06), I, 'colore', Mt @ R(g * math.pi / 2) @ T(0, -1.58, 8.0), tinta=(0.02, 0.02, 0.03), radica=False, liscia=False)
    S.metti(cilindro(0.5, 0.2, 0.7, 10, z0=8.6), I, 'colore', Mt, tinta=(0.25, 0.2, 0.1), radica=False)   # la campana
    S.urto(Mt, 3.2, 3.2, 12.0)
    corvo(S, Mt @ T(0.9, -1.4, 10.95), rnd, I)
    # dentro: l'altare con le candele, le panche rotte, le capriate rimaste, le macerie
    S.metti(scatola(2.4, 1.1, 1.0, z0=0.08, tagli=2, rumore=0.02, seme=70), I, 'pietra', M @ T(0, L / 2 - 2.4, 0), uv=1.4)
    S.metti(scatola(2.8, 1.4, 0.16, z0=1.06, tagli=1, rumore=0.012), I, 'pietra', M @ T(0, L / 2 - 2.4, 0), uv=1.4, radica=False)
    candele(S, M @ T(0, L / 2 - 2.4, 0), rnd, I, 7, 1.0, 1.22)
    S.urto(M @ T(0, L / 2 - 2.4, 0), 2.6, 1.3, 1.2)
    for i in range(5):
        for k in (-1, 1):
            if rnd.random() < 0.3:
                continue
            Mb = M @ T(k * 2.0 + rnd.uniform(-0.2, 0.2), -4.6 + i * 1.7, 0.1) @ R(rnd.uniform(-0.15, 0.15), 0, rnd.choice((0, 0, 0, 1.2)))
            S.metti(scatola(2.4, 0.4, 0.07, z0=0.42), I, 'legno', Mb, uv=0.8, radica=False)
            S.metti(scatola(2.4, 0.06, 0.5, z0=0.45), I, 'legno', Mb @ T(0, 0.2, 0), uv=0.8, radica=False)
            for x in (-1.1, 1.1):
                S.metti(scatola(0.07, 0.4, 0.45), I, 'legno', Mb @ T(x, 0, 0), uv=0.8)
    for i in range(3):   # le capriate sopra l'ingresso
        y = -L / 2 + 1.0 + i * 2.4
        for k in (-1, 1):
            S.metti(scatola(0.22, 0.2, 5.0, z0=0), I, 'legno', M @ T(k * W / 2, y, H - 0.3) @ R(0, 0, -k * 0.95), uv=0.9, radica=False)
        S.metti(scatola(W + 0.6, 0.2, 0.24), I, 'legno', M @ T(0, y, H - 0.3), uv=0.9, radica=False)
    S.metti(scatola(4.6, 3.2, 0.1), I, 'tetto', M @ T(-W / 4 - 0.1, -L / 2 + 2.0, H + 1.25) @ R(0, 0, 0.62), uv=2.2, radica=False)   # un brandello di tetto
    for _ in range(26):
        x, y = rnd.uniform(-W / 2 - 3, W / 2 + 4), rnd.uniform(-L / 2, L / 2 + 3)
        if rnd.random() < 0.5:
            masso(S, M @ T(x, y, 0), rnd, I, rnd.uniform(0.2, 0.55), urto=False)
        else:
            S.metti(scatola(rnd.uniform(0.4, 0.9), rnd.uniform(0.3, 0.6), rnd.uniform(0.25, 0.45), tagli=1, rumore=0.03, seme=_), I, 'muro', M @ T(x, y, 0.0) @ R(rnd.uniform(0, 6), rnd.uniform(-0.3, 0.3)), uv=2.0)
    S.occupa(M.translation.x, -M.translation.y, 11.5)


# ------------------------------------------------------------------------------------------------ pozzo, carro, stagno


def pozzo(S, M, rnd):
    I = 'bosco'
    for f in range(3):
        for k in range(11):
            an = (k + f * 0.5) / 11 * math.tau
            S.metti(scatola(0.52, 0.34, 0.3, z0=-0.05 + f * 0.29, tagli=1, rumore=0.035, seme=f * 20 + k), I, 'muschio' if (k + f) % 4 == 0 else 'pietra', M @ T(math.cos(an) * 0.95, math.sin(an) * 0.95, 0) @ R(an + math.pi / 2), uv=1.2)
    S.metti(cilindro(0.82, 0.82, 0.02, 14, z0=0.3), I, 'colore', M, tinta=(0.02, 0.03, 0.04), radica=False)
    for x in (-1.15, 1.15):
        S.metti(scatola(0.14, 0.14, 2.5, z0=-0.1, smusso=0.015), I, 'legno', M @ T(x, 0, 0) @ R(0, 0, -x * 0.03), uv=0.8)
    S.metti(tubo([((-1.3, 0, 1.9), 0.06), ((1.3, 0, 1.9), 0.06)], 7), I, 'legno', M, radica=False)
    S.metti(prisma([(-1.0, 0), (1.0, 0), (0, 0.8)], 2.9), I, 'tetto', M @ T(0, 0, 2.35) @ R(math.pi / 2), uv=1.6, radica=False, liscia=False)
    S.metti(tubo([((0.1, 0, 1.9), 0.015), ((0.1, 0.02, 1.2), 0.015), ((0.12, 0, 0.75), 0.015)], 4), I, 'colore', M, tinta=(0.5, 0.42, 0.28), radica=False)
    S.metti(cilindro(0.15, 0.12, 0.26, 9, z0=0.5), I, 'legno', M @ T(0.12, 0, 0), uv=0.6, radica=False)
    S.urto_tondo(M, 1.25, 1.0)
    S.occupa(M.translation.x, -M.translation.y, 2.6)


def ruota(S, M, insieme, r=0.58):
    S.metti(tubo([((math.cos(t / 14 * math.tau) * r, 0, math.sin(t / 14 * math.tau) * r), 0.05) for t in range(15)], 4, tappo=False), insieme, 'legno', M, radica=False)
    S.metti(cilindro(0.1, 0.1, 0.16, 8, z0=-0.08), insieme, 'legno', M @ R(0, math.pi / 2), radica=False)
    for k in range(8):
        S.metti(scatola(0.04, 0.04, r - 0.06, z0=0.05), insieme, 'legno', M @ R(0, 0, k / 8 * math.tau), radica=False, liscia=False)


def carro(S, M, rnd):
    """Il carro delle bare, fermo sul sentiero del cimitero."""
    I = 'cimitero'
    S.metti(scatola(1.5, 2.9, 0.1, z0=0.78, smusso=0.01), I, 'legno', M, uv=0.9, radica=False)
    for x in (-0.72, 0.72):
        S.metti(scatola(0.06, 2.9, 0.34, z0=0.88), I, 'legno', M @ T(x, 0, 0), uv=0.9, radica=False)
        ruota(S, M @ T(x * 1.2, 0.5, 0.58) @ R(math.pi / 2), I)
        S.metti(tubo([((x * 0.6, -1.45, 0.82), 0.045), ((x * 0.55, -2.6, 0.6), 0.04), ((x * 0.5, -3.7, 0.12), 0.035)], 6), I, 'legno', M, radica=False)
    S.metti(tubo([((-0.95, 0.5, 0.58), 0.05), ((0.95, 0.5, 0.58), 0.05)], 6), I, 'ferro', M, radica=False)
    S.metti(scatola(0.1, 0.1, 0.75, z0=0.0), I, 'legno', M @ T(0, -1.2, 0), uv=0.9)
    bara(S, M @ T(-0.36, 0.0, 0.88) @ R(0.04), rnd, I, urto=False)
    bara(S, M @ T(0.36, 0.05, 0.88) @ R(-0.05), rnd, I, urto=False)
    bara(S, M @ T(0.0, -0.1, 1.31) @ R(0.2), rnd, I, urto=False)
    S.urto(M, 1.7, 3.0, 1.9)
    S.occupa(M.translation.x, -M.translation.y, 3.0)


def barca(S, M, rnd, insieme):
    scafo = sfera(1.0, 2, 0, 0, (0.62, 1.75, 0.5))
    bmesh.ops.delete(scafo, geom=[v for v in scafo.verts if v.co.z > 0.06], context='VERTS')
    dentro = scafo.copy()
    for v in dentro.verts:
        v.co *= 0.95
    bmesh.ops.reverse_faces(dentro, faces=list(dentro.faces))
    S.metti(scafo, insieme, 'legno', M, uv=0.9, tinta=(0.6, 0.5, 0.45), radica=False)
    S.metti(dentro, insieme, 'legno', M, uv=0.9, tinta=(0.45, 0.38, 0.33), radica=False)
    for y in (-0.6, 0.5):
        S.metti(scatola(1.05, 0.22, 0.04, z0=-0.12), insieme, 'legno', M @ T(0, y, 0), uv=0.9, radica=False)
    S.metti(tubo([((0.5, -0.9, 0.0), 0.025), ((0.2, 0.9, 0.12), 0.025)], 5), insieme, 'legno', M, radica=False)
    S.metti(scatola(0.16, 0.5, 0.02), insieme, 'legno', M @ T(0.55, -1.1, -0.01) @ R(0.17), radica=False)


def stagno(S, M, rnd, posa, lungo=11.0):
    """Il pontile sullo stagno, con la barca legata, il lampione in fondo e il capanno su palafitte a riva.
    `M` sta a riva, alla quota del tavolato, con il pontile che parte verso -y."""
    I = 'stagno'
    n = int(lungo / 0.3)
    for i in range(n):
        if rnd.random() < 0.05:
            continue
        S.metti(scatola(1.9, 0.27, 0.06, smusso=0.008), I, 'legno', M @ T(rnd.uniform(-0.04, 0.04), -i * 0.3, rnd.uniform(-0.01, 0.01)) @ R(rnd.uniform(-0.04, 0.04)), uv=0.9, radica=False, tinta=(rnd.uniform(0.6, 0.85),) * 3)
    for i in range(int(lungo / 2.2) + 1):
        for x in (-0.85, 0.85):
            S.metti(cilindro(0.09, 0.08, 2.6 + (0.5 if i % 2 else 0), 7, z0=-2.2), I, 'corteccia', M @ T(x, -i * 2.2, 0) @ R(0, rnd.uniform(-0.05, 0.05), rnd.uniform(-0.05, 0.05)), radica=False)
        S.metti(scatola(1.9, 0.1, 0.12, z0=-0.14), I, 'legno', M @ T(0, -i * 2.2, 0), uv=0.9, radica=False)
    S.urto(M @ T(0, -lungo / 2, 0), 2.0, lungo, 0.3, -0.24)
    lanterna(S, M @ T(0.8, -lungo + 0.3, 0.03) @ R(math.pi / 2), rnd, I, 2.3, 1.0)
    barca(S, M @ T(-1.9, -lungo + 2.6, -0.42) @ R(0.25), rnd, I)
    S.metti(tubo([((-0.9, -lungo + 2.2, 0.1), 0.014), ((-1.2, -lungo + 2.4, -0.2), 0.014), ((-1.5, -lungo + 2.6, -0.35), 0.014)], 4), I, 'colore', M, tinta=(0.5, 0.42, 0.28), radica=False)
    for _ in range(30):   # le canne
        an, d = rnd.uniform(0, 6.28), rnd.uniform(8.5, 12.5)
        a, b = 71.2 + math.cos(an) * d, -35.8 + math.sin(an) * d
        Mc = posa(a, b)
        for k in range(rnd.randint(3, 6)):
            S.metti(cilindro(0.016, 0.0, rnd.uniform(1.0, 1.9), 3), I, 'colore', Mc @ T(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.3, 0.3), -0.1) @ R(0, rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15)), tinta=(0.38, 0.42, 0.2), radica=False)
    # il capanno del pescatore, su quattro pali
    riva = M @ Vector((4.8, 3.6, 0))
    Mc = posa(riva.x, -riva.y, math.atan2(M[1][0], M[0][0]) - 0.3, 0.55)
    for (x, y) in ((-1.4, -1.6), (1.4, -1.6), (1.4, 1.6), (-1.4, 1.6)):
        S.metti(cilindro(0.11, 0.1, 3.0, 7, z0=-2.6), I, 'corteccia', Mc @ T(x, y, 0), radica=False)
    S.metti(scatola(3.3, 3.7, 0.12, z0=0.0), I, 'legno', Mc, uv=0.9, radica=False)
    S.metti(scatola(3.0, 3.4, 2.3, z0=0.12, smusso=0.02), I, 'legno', Mc, uv=1.0, radica=False, tinta=(0.72, 0.62, 0.55))
    S.metti(prisma([(-1.9, 0), (1.9, 0), (0, 1.5)], 4.0), I, 'tetto', Mc @ T(0, 0, 2.4), uv=2.0, radica=False, liscia=False)
    S.metti(scatola(0.9, 0.06, 1.8, z0=0.12), I, 'legno', Mc @ T(-0.6, -1.71, 0), uv=0.8, radica=False, tinta=(0.5, 0.42, 0.36))
    S.metti(scatola(0.7, 0.05, 0.6, z0=1.0), I, 'luce', Mc @ T(0.75, -1.71, 0), radica=False)
    for x in (0.75,):
        S.metti(scatola(0.04, 0.07, 0.66, z0=0.97), I, 'legno', Mc @ T(x, -1.73, 0), radica=False)
        S.metti(scatola(0.76, 0.07, 0.04, z0=1.28), I, 'legno', Mc @ T(x, -1.73, 0), radica=False)
    S.luce(Mc, 'finestra', 0.8, (0.75, -1.95, 1.3))
    S.urto(Mc, 3.1, 3.5, 2.6, 0.1)
    S.occupa(Mc.translation.x, -Mc.translation.y, 3.6)


def portale(S, M, rnd):
    """L'ingresso del bosco: due tronchi contorti che si incrociano in alto, la lanterna appesa, l'insegna, i teschi sui pali."""
    I = 'bosco'
    for k in (-1, 1):
        pt = [((k * 2.6, 0, -0.3), 0.42), ((k * 2.5, 0.1, 1.2), 0.34), ((k * 2.1, -0.1, 2.6), 0.28), ((k * 1.3, 0.05, 3.8), 0.22), ((k * 0.2, 0, 4.5), 0.16), ((-k * 0.9, 0.1, 4.9), 0.08), ((-k * 1.6, 0, 5.4), 0.03)]
        S.metti(tubo(pt, 9, giri=2), I, 'corteccia', M)
        S.urto_tondo(M @ T(k * 2.5, 0, 0), 0.45, 3.0)
        S.metti(tubo([((k * 4.0, 0.3, -0.2), 0.05), ((k * 4.05, 0.3, 1.6), 0.04)], 5), I, 'legno', M)
        teschio(S, M @ T(k * 4.05, 0.3, 1.6), rnd, I)
    S.metti(tubo([((0, 0, 4.5), 0.012), ((0, 0, 3.75), 0.012)], 4), I, 'ferro', M, radica=False)
    S.metti(scatola(0.24, 0.24, 0.3, z0=3.45), I, 'luce', M, radica=False, liscia=False)
    tetto = cilindro(0.24, 0.03, 0.14, 4, z0=3.75)
    bmesh.ops.rotate(tetto, verts=tetto.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(tetto, I, 'ferro', M, radica=False, liscia=False)
    S.luce(M, 'lanterna', 1.2, (0, 0, 3.6))
    for (x, z, g) in ((-0.9, 2.9, 0.08), (0.95, 2.75, -0.1)):
        S.metti(scatola(1.5, 0.05, 0.42, smusso=0.01), I, 'legno', M @ T(x, 0.0, z) @ R(0, 0, g), uv=0.8, radica=False)
        for dx in (-0.6, 0.6):
            S.metti(tubo([((x + dx, 0, z + 0.42), 0.01), ((x + dx * 0.7, 0, z + 1.2), 0.01)], 4), I, 'ferro', M, radica=False)
    S.occupa(M.translation.x, -M.translation.y, 5.0)
