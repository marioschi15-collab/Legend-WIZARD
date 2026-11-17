"""Costruisce con Blender il Porto delle Nebbie e lo salva per il gioco (vedi salva.py).

    cd strumenti/scene && python porto.py

Un porto di mare nella nebbia: la banchina di pietra con le case alte e strette affacciate sull'acqua, tre moli di
legno, due velieri all'ormeggio su cui si sale dalla passerella e un terzo all'ancora nella rada, la gru a ruota,
il molo di pietra con il faro, la spiaggia dei pescatori a nord. I posti sono in metri dal centro: `a` verso est
(il mare), `b` verso sud. Si arriva da ovest (dal villaggio di partenza).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402  (va importato prima di bmesh)
import bmesh  # noqa: E402

import terreno  # noqa: E402

terreno.scegli('porto')

from attrezzi import R, T, Scena, cilindro, posa, scatola, tubo  # noqa: E402
from edifici import barca, carro, sentiero, spline  # noqa: E402
from mare import ancora, banchina, bitta, faro, gru, molo, nave, rete_stesa  # noqa: E402
from oggetti import corvo, lanterna, masso  # noqa: E402
from paese import bancarella, barile, casa, catasta, festone, lume, mucchio, panca  # noqa: E402
from salva import salva  # noqa: E402
from terreno import terra  # noqa: E402

BORDO = 18.6          # dove finisce la banchina e comincia l'acqua
QUOTA = 2.3           # l'altezza della banchina
ACQUA = -0.55
EST = math.pi / 2     # il giro di ciò che guarda il mare
INSEGNE = ((0.75, 0.3, 0.2), (0.25, 0.45, 0.7), (0.85, 0.7, 0.25), (0.3, 0.55, 0.35))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = Scena()
    rnd = random.Random(1492)

    # ---------------------------------------------------------------- la banchina: il muro e il lastricato
    I = 'banchina'
    for k in range(11):
        b = -60 + (k + 0.5) * 16
        banchina(S, T(BORDO, -b, QUOTA) @ R(EST), rnd, I, 16.0)
    banchina(S, T(11.6, 60.0, QUOTA) @ R(math.pi), rnd, I, 14.0, 3.5)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    colonne = [3.0 + i * 1.3 for i in range(13)]
    righe = []
    for j in range(90):
        b = -60 + j * 2.0
        righe.append([(bm.verts.new((a, -b, max(terra(a, b) + 0.07, QUOTA) if a < 15 else QUOTA)), (a / 2.4, b / 2.4)) for a in colonne])
    for j in range(len(righe) - 1):
        for i in range(len(colonne) - 1):
            q = (righe[j][i], righe[j][i + 1], righe[j + 1][i + 1], righe[j + 1][i])
            f = bm.faces.new([v for (v, _) in q])
            for lo, (_, uv) in zip(f.loops, q):
                lo[uvl].uv = uv
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    if sum(f.normal.z for f in bm.faces) < 0:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    S.metti(bm, I, 'ciottoli', radica=False)
    S.urto(T(BORDO - 2.8, -29.0, QUOTA) @ R(EST), 178.0, 5.6, 6.0, -6.0)
    for b in range(-60, 119, 2):
        for a in range(3, 19, 2):
            S.occupa(a, b, 1.6)
    for i, b in enumerate(range(-52, 116, 14)):   # lampioni e bitte lungo il bordo
        lanterna(S, T(BORDO - 1.2, -b, QUOTA) @ R(EST), rnd, I, rnd.uniform(2.9, 3.2), 1.1)
        bitta(S, T(BORDO - 0.7, -(b + 7), QUOTA), rnd, I, i % 2 == 0)

    # ---------------------------------------------------------------- le vie: quella di dietro, i vicoli, la strada da ovest
    I = 'vie'
    sentiero(S, [(-11.0 + 0.6 * math.sin(b * 0.05), b) for b in range(-58, 113, 2)], 4.4, 'ciottoli', I, rnd, bordi=0.0, gradini=False)
    vicoli = (-22.0, 36.0, 92.0)
    for b in vicoli:
        sentiero(S, [(a, b) for a in range(-11, 5, 1)], 3.2, 'ciottoli', I, rnd, bordi=0.0, gradini=False)
    strada = spline([(-116, 8), (-92, 14), (-66, 12), (-40, 24), (-22, 34), (-11, 36)], 1.5)
    sentiero(S, strada, 3.8, 'ciottoli', I, rnd, bordi=0.5, gradini=False)
    for i in range(6, len(strada) - 8, 11):
        (a0, b0), (a, b) = strada[i - 1], strada[i]
        d = math.hypot(a - a0, b - b0)
        lato = 1 if (i // 11) % 2 else -1
        lanterna(S, posa(a - (b - b0) / d * lato * 2.9, b + (a - a0) / d * lato * 2.9, 0.0), rnd, I, 2.9, 1.0)

    # ---------------------------------------------------------------- le case sulla banchina: alte, strette, il timpano verso il mare
    def gruppo(b):
        return 'case_n' if b < -5 else ('case_c' if b < 55 else 'case_s')

    b = -57.0
    k = 0
    while b < 112:
        largo = rnd.uniform(6.0, 7.6)
        magazzino = b > 62 and k % 3 == 0
        if magazzino:
            largo = 11.0
        if any(b < v + 2.6 and b + largo > v - 2.6 for v in vicoli):
            b = max(v for v in vicoli if b < v + 2.6 and b + largo > v - 2.6) + 2.6
            continue
        fondo = rnd.uniform(8.0, 9.4)
        M = posa(3.0 - fondo / 2 + rnd.uniform(-0.3, 0.3), b + largo / 2, EST + rnd.uniform(-0.03, 0.03))
        if magazzino:
            casa(S, M, rnd, gruppo(b), largo, fondo, piani=2, copertura='tetto', muri='tavole', abbaino=False, accese=0.3, alto_tetto=5.0)
        else:
            casa(S, M, rnd, gruppo(b), largo, fondo, piani=rnd.choice((3, 3, 4)), copertura=rnd.choice(('tetto', 'tetto', 'tegole')), timpano=True,
                 muri=rnd.choice(('tavole', 'tavole', 'intonaco')), insegna_tinta=INSEGNE[k % 4] if k % 3 == 1 else None, accese=0.7)
        b += largo + rnd.uniform(0.25, 0.6)
        k += 1
    # la fila di dietro, oltre la via: case più larghe, con qualche vuoto
    for (b, scelte) in ((-50, dict(piani=2)), (-37, dict(piani=3, timpano=True)), (-8, dict(piani=2, largo=9.5)), (6, dict(piani=3, timpano=True)), (19, dict(piani=2)),
                        (52, dict(piani=3, largo=9.0)), (65, dict(piani=2, timpano=True)), (78, dict(piani=3)), (105, dict(piani=2, largo=9.5))):
        largo = scelte.pop('largo', rnd.uniform(6.8, 8.4))
        fondo = rnd.uniform(6.0, 7.2)
        casa(S, posa(-14.2 - fondo / 2, b, EST + rnd.uniform(-0.04, 0.04)), rnd, gruppo(b), largo, fondo, copertura=rnd.choice(('tetto', 'tegole')), muri=rnd.choice(('tavole', 'intonaco')), **scelte)

    # ---------------------------------------------------------------- i moli e le navi
    I = 'moli'
    for (b, lungo) in ((-34.0, 30.0), (22.0, 41.0), (62.0, 17.0)):
        molo(S, T(BORDO + 0.6, -b, QUOTA - 0.05) @ R(EST), rnd, I, lungo, 3.4, 6.6)
    # il veliero grande, a sud del molo lungo; quello medio, a nord del primo molo; il terzo all'ancora nella rada
    nave(S, T(BORDO + 23.0, -(22.0 + 1.7 + 2.4 + 3.7), ACQUA) @ R(EST), rnd, 'nave1', 30.0, 7.4, 3, QUOTA - ACQUA - 0.05, passerella=1)
    nave(S, T(BORDO + 15.5, -(-34.0 - 1.7 - 2.4 - 3.0), ACQUA) @ R(EST), rnd, 'nave2', 22.0, 6.0, 2, QUOTA - ACQUA - 0.05, bandiera=(0.15, 0.3, 0.55), fascia=(0.3, 0.45, 0.55), passerella=-1)
    nave(S, T(86.0, 4.0, ACQUA) @ R(EST + 0.7), rnd, 'nave3', 26.0, 6.8, 3, 2.6, bandiera=(0.1, 0.1, 0.1), fascia=(0.6, 0.2, 0.15))
    for (a, b, g) in ((BORDO + 6, 59.0, 0.2), (BORDO + 12, 65.2, 2.9), (BORDO + 3.2, 74, 1.4), (BORDO + 2.6, -8, 1.7), (BORDO + 3.0, 47, 1.5), (BORDO + 9, -29.8, 0.1)):
        barca(S, T(a, -b, ACQUA + 0.12) @ R(g), rnd, I)

    # ---------------------------------------------------------------- il molo di pietra con il faro
    I = 'faro'
    for k in range(4):
        S.metti(scatola(13.2, 5.6, 8.4, z0=-6.2, tagli=3, rumore=0.07, seme=k * 3.3), I, 'muro', T(BORDO + 6.5 + k * 13.0, -100.0, 0), uv=2.6, radica=False)
        S.metti(scatola(13.1, 5.9, 0.3, z0=2.0, tagli=2, rumore=0.02, seme=k * 5.1), I, 'pietra', T(BORDO + 6.5 + k * 13.0, -100.0, 0), uv=1.6, radica=False)
    S.urto(T(BORDO + 26.0, -100.0, 0), 52.0, 5.6, 8.4, -6.15)
    for _ in range(46):
        a, lato = rnd.uniform(BORDO + 1, BORDO + 56), rnd.choice((-1, 1))
        masso(S, T(a, -(100.0 + lato * rnd.uniform(3.0, 4.6)), rnd.uniform(-1.6, -0.4)), rnd, I, rnd.uniform(0.8, 1.6), muschio=rnd.random() < 0.3, urto=False)
    S.metti(cilindro(5.2, 4.6, 8.6, 14, z0=-6.3), I, 'muro', T(BORDO + 55.5, -100.0, 0), uv=2.6, radica=False)
    S.urto_tondo(T(BORDO + 55.5, -100.0, -6.3), 4.6, 8.6)
    faro(S, T(BORDO + 55.5, -100.0, 2.3), rnd, I)
    for a in (BORDO + 14, BORDO + 34):
        lanterna(S, T(a, -97.6, 2.3), rnd, I, 2.8, 1.0)
    bitta(S, T(BORDO + 24, -102.2, 2.3), rnd, I)

    # ---------------------------------------------------------------- la vita della banchina
    I = 'banchina'
    gru(S, T(BORDO - 3.4, -9.0, QUOTA) @ R(EST), rnd, I)
    for (b, merce, tinta) in ((2.0, 'pesce', (0.2, 0.35, 0.6)), (46.0, 'pesce', (0.7, 0.2, 0.15)), (-44.0, 'frutta', (0.25, 0.5, 0.3)), (70.0, 'pane', (0.75, 0.55, 0.15))):
        bancarella(S, T(8.6, -b, QUOTA + 0.02) @ R(EST), rnd, I, tinta, False, merce)
    for (a, b, n) in ((13.5, -27.0, 7), (14.0, 14.0, 8), (12.5, 30.5, 6), (14.5, 54.0, 5), (13.0, 84.0, 7), (6.5, -14.0, 4), (14.2, -50.0, 5), (6.0, 58.0, 4)):
        mucchio(S, T(a, -b, QUOTA + 0.02), rnd, I, n, 1.5)
    for (a, b, g) in ((7.0, 18.0, EST), (7.0, 24.0, EST), (6.6, -31.0, EST), (6.6, 80.0, EST)):
        panca(S, T(a, -b, QUOTA + 0.02) @ R(g), rnd, I)
    for (a, b) in ((11.0, -47.0), (15.0, -20.0), (10.5, -4.0), (15.5, 9.0), (11.5, 21.0), (9.5, 40.0), (14.5, 62.0), (10.0, 88.0), (15.0, 104.0)):   # la gente del porto
        S.persona(T(a, -b, QUOTA + 0.05))
    for (b, lungo) in ((-34.0, 30.0), (22.0, 41.0), (62.0, 17.0)):   # chi pesca in fondo ai moli
        S.persona(T(BORDO + lungo - 1.5, -(b + 0.6), QUOTA))
    S.persona(T(BORDO + 49.0, -99.2, QUOTA + 0.02), 'guardia')   # il guardiano del faro
    S.persona(T(-11.0, -34.5, terra(-11.0, 34.5)) @ R(-EST), 'guardia')
    for (a, b, g) in ((12.0, 68.0, 0.3), (15.5, 76.0, 1.4), (11.0, -56.0, 0.9)):
        rete_stesa(S, T(a, -b, QUOTA) @ R(g), rnd, I)
    ancora(S, T(15.2, -40.0, QUOTA + 0.05) @ R(0.7), rnd, I)
    ancora(S, T(14.6, -96.5, QUOTA + 0.05) @ R(2.2), rnd, I)
    carro(S, T(9.5, -106.0, QUOTA) @ R(0.4), rnd, bare=False, insieme=I)
    for (b, da) in ((10.0, 2.9), (27.0, 2.9), (-3.0, 2.9), (-40.0, 2.9)):   # luci tese fra le case e i lampioni
        festone(S, I, (da, -b, QUOTA + 5.6), (BORDO - 1.2, -(b + rnd.uniform(-3, 3)), QUOTA + 3.0), 7, 0.9)
    for b in (-34.0, 22.0):   # due barili accesi (bracieri) all'imbocco dei moli grandi
        Mb = T(BORDO - 1.6, -(b + 2.6), QUOTA)
        barile(S, Mb, rnd, I, sciolto=False)
        S.metti(cilindro(0.26, 0.26, 0.06, 10, z0=0.93), I, 'luce', Mb, radica=False)
        S.luce(Mb, 'brace', 0.8, (0, 0, 1.25))
    for _ in range(9):
        corvo(S, T(BORDO - 0.3, -rnd.uniform(-58, 114), QUOTA + 0.03), rnd, I)

    # ---------------------------------------------------------------- la spiaggia dei pescatori, a nord
    I = 'spiaggia'
    for (a, b, g) in ((15.0, -86.0, 0.5), (19.5, -94.0, 0.2), (13.0, -103.0, 0.9)):
        barca(S, posa(a, b, g + EST, 0.42, (0.0, 0.12)), rnd, I)
        S.occupa(a, b, 2.4)
    for (a, b, g) in ((4.0, -84.0, 0.2), (7.0, -104.0, 1.1), (-3.0, -95.0, 1.7)):
        rete_stesa(S, posa(a, b, g), rnd, I)
        S.occupa(a, b, 2.6)
    Mf = posa(6.0, -94.0)
    for k in range(7):   # il fuoco dei pescatori: un cerchio di sassi, la legna, due tronchi per sedersi
        an = k / 7 * math.tau
        masso(S, Mf @ T(math.cos(an) * 0.75, math.sin(an) * 0.75, -0.05), rnd, I, 0.22, muschio=False, urto=False)
    for k in range(5):
        S.metti(tubo([((-0.45, 0, 0.08), 0.07), ((0.45, 0, 0.25), 0.05)], 6), I, 'corteccia', Mf @ R(k * 0.63), radica=False)
    S.metti(cilindro(0.3, 0.05, 0.5, 7, z0=0.15), I, 'luce', Mf, radica=False)
    S.luce(Mf, 'brace', 1.0, (0, 0, 0.6))
    S.luce(Mf, 'fumo', 1.0, (0, 0, 1.2))
    for (x, y, g) in ((2.0, 0.4, 1.5), (-0.6, 2.1, 0.2)):
        S.metti(tubo([((-1.1, 0, 0.26), 0.28), ((1.1, 0, 0.26), 0.25)], 9, giri=2), I, 'corteccia', Mf @ T(x, y, 0) @ R(g))
    S.occupa(6.0, -94.0, 3.5)
    capanno = posa(-6.0, -84.0, EST + 0.3)
    casa(S, capanno, rnd, I, 5.6, 4.6, piani=1, copertura='tetto', alto_tetto=3.0, abbaino=False, zoccolo=1.2)
    catasta(S, capanno @ T(-3.9, 0.6, 0.0) @ R(math.pi / 2), rnd, I, 2.4, 4)

    # ---------------------------------------------------------------- massi e relitti sparsi fuori dal paese
    I = 'intorno'

    def libero(a, b):
        return math.hypot(a, b) < 112 and terra(a, b) > 0.4 and (math.floor((a + terreno.CX) / 2), math.floor((b + terreno.CZ) / 2)) not in S.occupati

    fatti = 0
    while fatti < 40:
        an, d = rnd.uniform(0, 6.28), 112 * math.sqrt(rnd.random())
        a, b = math.cos(an) * d, math.sin(an) * d
        if libero(a, b):
            fatti += 1
            masso(S, posa(a, b), rnd, I, rnd.choice((0.4, 0.5, 0.7, 0.9, 1.3)))

    salva(S, 'porto_nebbie', (-110, 9.5), colore_terreno=(0.16, 0.15, 0.12))


if __name__ == '__main__':
    main()
