"""Costruisce con Blender tutto il Bosco della Strega e lo salva per il gioco.

Si lancia con il Python che ha Blender dentro (pip install bpy):
    cd strumenti/strega && python scena.py
Scrive:
  - public/modelli/bosco_strega.glb     la scena (un oggetto per insieme e per materia)
  - src/mondo/stregaDati.ts             luci, ingombri, caselle occupate, punti di prova del terreno
  - /tmp/strega_terreno_prova.glb       solo per guardare la scena fuori dal gioco

Il posto di ogni cosa è dato in metri lungo due direzioni: `d` verso il villaggio di partenza (da lì si arriva)
e `o` di traverso. La casa sta a (0, 0); il sentiero principale entra a d = 166.
"""
import json
import math
import os
import random
import sys

QUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, QUI)
sys.path.insert(0, os.path.dirname(QUI))

import bpy  # noqa: E402
from mathutils import Matrix, Vector  # noqa: E402

import attrezzi  # noqa: E402
from attrezzi import R, T, Scena, crea_materiali, posa, scatola, tubo, verso  # noqa: E402
from edifici import cappella, carro, casa, cripta, portale, pozzo, sentiero, spline, stagno  # noqa: E402
from oggetti import (albero, bara, candele, cancellata, ceppo, corvo, funghi, lanterna, lapide, masso, menhir, ossa, pilastro, sarcofago,  # noqa: E402
                     spaventapasseri, staccionata, sterpo, teschio, tronco_caduto, tumulo, zucca)
from strega_terreno import CX, CZ, PASSO, suolo, terra  # noqa: E402

RADICE = os.path.dirname(os.path.dirname(QUI))
V = Vector((250.0, -360.0)).normalized()      # verso il villaggio
W = Vector((-V.y, V.x))                         # di traverso


def P(d, o):
    return (V.x * d + W.x * o, V.y * d + W.y * o)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = Scena()
    rnd = random.Random(77)
    verso_v, verso_w = verso(V.x, V.y), verso(W.x, W.y)

    # ---------------------------------------------------------------- la casa in cima al colle
    casa(S, posa(0, 0, verso_v), rnd)
    S.occupa(0, 0, 13.5)

    # ---------------------------------------------------------------- i sentieri
    principale = spline([P(166, 0), P(150, 2), P(128, 7), P(104, -4), P(82, -9), P(60, -2), P(40, 5), P(24, 1), P(13.5, -3.4)], 1.0)
    sentiero(S, principale, 3.2, 'ciottoli', 'sentieri', rnd)
    al_cimitero = spline([P(62, -3.5), P(63.2, -10), P(62.2, -17), P(62, -22.5)], 1.0)
    sentiero(S, al_cimitero, 2.4, 'ciottoli', 'sentieri', rnd, bordi=0.5)
    allo_stagno = spline([P(72, -5), P(73.5, 5), P(71, 15), P(70, 24.5)], 1.0)
    sentiero(S, allo_stagno, 2.0, 'terra', 'sentieri', rnd, bordi=0.35)
    al_cerchio = spline([P(-11, 3), P(-22, 10), P(-33, 16), P(-41, 19)], 1.0)
    sentiero(S, al_cerchio, 1.9, 'terra', 'sentieri', rnd, bordi=0.35)
    # i lampioni lungo il sentiero principale, un po' di qua e un po' di là
    lungo, lato = 0.0, 1
    for i in range(1, len(principale) - 6):
        (a0, b0), (a, b) = principale[i - 1], principale[i]
        d = math.hypot(a - a0, b - b0)
        lungo += d
        if lungo >= 15.5:
            lungo = 0.0
            la, lb = -(b - b0) / d * lato, (a - a0) / d * lato
            x, z = a + la * 2.6, b + lb * 2.6
            lanterna(S, posa(x, z, math.atan2(lb, -la), -0.05), rnd, 'sentieri', rnd.uniform(2.6, 3.0), 1.0)
            S.occupa(x, z, 1.0)
            lato = -lato
    portale(S, posa(*P(153, 1.6), verso_v), rnd)

    # ---------------------------------------------------------------- il cimitero
    I = 'cimitero'
    d0, d1, o0, o1 = 39.0, 85.0, -58.0, -22.0
    for (da, db) in [(d, o) for d in range(39, 86, 2) for o in range(-58, -21, 2)]:
        S.occupa(*P(da, db), 1.7)

    def lato_recinto(pa, pb, tratti, varco=None):
        for k in range(tratti):
            q0 = (pa[0] + (pb[0] - pa[0]) * k / tratti, pa[1] + (pb[1] - pa[1]) * k / tratti)
            q1 = (pa[0] + (pb[0] - pa[0]) * (k + 1) / tratti, pa[1] + (pb[1] - pa[1]) * (k + 1) / tratti)
            pilastro(S, posa(*P(*q0), verso_v), rnd, I)
            if varco is not None and k == varco[0]:
                continue
            cancellata(S, *P(*q0), *P(*q1), rnd, I, posa)

    # il lato del cancello e quello verso la cappella hanno un varco in mezzo
    lato_recinto((d0, o1), (60.2, o1), 3)
    lato_recinto((63.8, o1), (d1, o1), 3)
    lato_recinto((d1, o1), (d1, o0), 5)
    lato_recinto((d1, o0), (63.2, o0), 3)
    lato_recinto((60.8, o0), (d0, o0), 3)
    lato_recinto((d0, o0), (d0, o1), 5)
    for (d, o, alto) in ((60.2, o1, 3.0), (63.8, o1, 3.0), (63.2, o0, 2.4), (60.8, o0, 2.4)):   # i pilastri dei due cancelli
        Mp = posa(*P(d, o), verso_v)
        pilastro(S, Mp, rnd, I, alto, 0.8)
        if alto > 2.6:
            S.metti(scatola(0.22, 0.22, 0.3, z0=alto + 0.34), I, 'luce', Mp, radica=False, liscia=False)
            S.luce(Mp, 'lanterna', 1.1, (0, 0, alto + 0.5))
            corvo(S, Mp @ T(0.2, 0, alto + 0.05), rnd, I) if d < 62 else None
    # l'arco di ferro sopra il cancello e i due battenti socchiusi
    Mg = posa(*P(62, o1), verso_w)
    S.metti(tubo([((-1.8 + 3.6 * t / 12, 0, 3.0 + math.sin(t / 12 * math.pi) * 0.9), 0.035) for t in range(13)], 5), I, 'ferro', Mg, radica=False)
    S.metti(tubo([((-1.8 + 3.6 * t / 12, 0, 2.75 + math.sin(t / 12 * math.pi) * 0.75), 0.03) for t in range(13)], 5), I, 'ferro', Mg, radica=False)
    for t in range(1, 12):
        x = -1.8 + 3.6 * t / 12
        S.metti(scatola(0.02, 0.02, 0.26 + math.sin(t / 12 * math.pi) * 0.15, z0=2.75 + math.sin(t / 12 * math.pi) * 0.75), I, 'ferro', Mg @ T(x, 0, 0), radica=False, liscia=False)
    for k in (-1, 1):
        Mb = Mg @ T(k * 1.45, 0, 0) @ R(k * (0.9 if k > 0 else 0.35))
        for j in range(7):
            S.metti(scatola(0.024, 0.024, 2.1 + 0.25 * math.sin(j / 6 * math.pi / 2), z0=0.08), I, 'ferro', Mb @ T(-k * (0.08 + j * 0.2), 0, 0), radica=False, liscia=False)
        for z in (0.35, 1.9):
            S.metti(scatola(1.35, 0.03, 0.04, z0=z), I, 'ferro', Mb @ T(-k * 0.68, 0, 0), radica=False, liscia=False)
    # i vialetti di ghiaia a croce
    sentiero(S, [P(62, o) for o in range(-23, -58, -1)], 2.2, 'ciottoli', 'sentieri', rnd, bordi=0.0, gradini=False)
    sentiero(S, [P(d, -40) for d in range(48, 83)], 2.0, 'ciottoli', 'sentieri', rnd, bordi=0.0, gradini=False)
    cripta(S, posa(*P(43.6, -40), verso_v), rnd)
    lanterna(S, posa(*P(63.6, -38.3), verso_w), rnd, I, 3.0, 1.2)
    albero(S, *P(67.5, -45.5), rnd, posa, 11.5, 0.85)
    # le tombe, in file; qualche sarcofago lungo i vialetti, due fosse aperte
    fosse = 0
    for fila, o in enumerate((-25.2, -29.2, -33.4, -46.4, -50.6, -54.8)):
        for d in [47.2 + k * 3.55 + rnd.uniform(-0.35, 0.35) for k in range(11)]:
            if abs(d - 62) < 2.6 or (d < 50.5 and abs(o + 40) < 9) or math.hypot(d - 67.5, o + 45.5) < 3.2 or d > 83.2:
                continue
            if rnd.random() < 0.1:
                continue
            oo = o + rnd.uniform(-0.3, 0.3)
            M = posa(*P(d, oo), verso_w + rnd.uniform(-0.1, 0.1), -0.02)
            dado = rnd.random()
            if dado < 0.1:
                sarcofago(S, posa(*P(d, oo - 0.6), verso_w + rnd.uniform(-0.08, 0.08), -0.03), rnd, I)
            elif dado < 0.16 and fosse < 2:
                fosse += 1
                lapide(S, M, rnd, I, 0)
                Mf = M @ T(0, -1.5, 0)
                S.metti(scatola(1.1, 2.3, 0.05, z0=-0.02), I, 'colore', Mf, tinta=(0.015, 0.012, 0.01), radica=False)
                for (x, y, sx, sy) in ((-0.85, 0, 0.5, 2.6), (0.85, 0, 0.5, 2.6), (0, 1.3, 2.0, 0.5)):
                    S.metti(scatola(sx, sy, 0.3, z0=-0.1, tagli=2, rumore=0.09, seme=d), I, 'terra', Mf @ T(x, y, 0), uv=1.2)
                bara(S, Mf @ T(0.1, 0.15, -0.22) @ R(0.12, 0.16, 0.05), rnd, I, aperta=True, urto=False)
                S.metti(tubo([((1.2, 0.5, 0.0), 0.022), ((1.35, 0.6, 1.25), 0.022)], 5), I, 'legno', Mf, radica=False)   # la vanga piantata
                S.metti(scatola(0.2, 0.02, 0.28, z0=-0.22), I, 'ferro', Mf @ T(1.2, 0.5, 0), radica=False)
            else:
                lapide(S, M, rnd, I)
                if rnd.random() < 0.55:
                    tumulo(S, M, rnd, I)
                if rnd.random() < 0.32:
                    candele(S, M @ T(rnd.uniform(-0.3, 0.3), -0.45, 0.0), rnd, I, rnd.randint(1, 4), 0.22)
                if rnd.random() < 0.08:
                    zucca(S, M @ T(0.55, -0.5, 0), rnd, I, True)
    for (d, o) in ((52, -36.5), (71, -27.5), (79, -52), (56, -52.5)):
        ossa(S, posa(*P(d, o)), rnd, I)
    for _ in range(26):   # cespugli secchi lungo la cancellata
        lato = rnd.randrange(4)
        d, o = (rnd.uniform(d0 + 1, d1 - 1), o0 + 0.9) if lato == 0 else (rnd.uniform(d0 + 1, d1 - 1), o1 - 0.9) if lato == 1 else (d0 + 0.9, rnd.uniform(o0 + 1, o1 - 1)) if lato == 2 else (d1 - 0.9, rnd.uniform(o0 + 1, o1 - 1))
        if abs(d - 62) > 3:
            sterpo(S, posa(*P(d, o), rnd.uniform(0, 6)), rnd, I, rnd.uniform(1.0, 1.8))
    for (d, o, g) in ((58.2, -60.2, 0.25), (59.3, -60.6, -0.2), (65.8, -60.4, 0.15)):   # tre bare appoggiate fuori dalla cappella
        bara(S, posa(*P(d, o), verso_w + math.pi + g, 0.05) @ R(0, -1.3), rnd, I, urto=False)
    carro(S, posa(*P(65.2, -13.5), verso_w + 0.35), rnd)
    albero(S, *P(55.8, -18.6), rnd, posa, 10.5, 0.75)
    albero(S, *P(68.6, -18.2), rnd, posa, 9.5, 0.65)

    # ---------------------------------------------------------------- la cappella in rovina, dietro il cimitero
    cappella(S, posa(*P(62, -67.6), verso_w), rnd)

    # ---------------------------------------------------------------- lo stagno
    stagno(S, T(*[c for c in (P(70, 25.2)[0], -P(70, 25.2)[1])], -0.06) @ R(verso_w), rnd, posa)
    S.occupa(71.2, -35.8, 12.5)
    albero(S, *P(79.5, 23.5), rnd, posa, 9.0, 0.6)

    # ---------------------------------------------------------------- il cerchio di pietre
    I = 'cerchio'
    cc = (-11.0, 50.8)
    S.occupa(*cc, 10.5)
    for k in range(9):
        an = k / 9 * math.tau + 0.2
        a, b = cc[0] + math.cos(an) * 6.3, cc[1] + math.sin(an) * 6.3
        menhir(S, posa(a, b, verso(cc[0] - a, cc[1] - b) + rnd.uniform(-0.2, 0.2), 0, (rnd.uniform(-0.09, 0.09), rnd.uniform(-0.09, 0.09))), rnd, I)
    Ma = posa(*cc, 0.4)
    for x in (-0.8, 0.8):
        S.metti(scatola(0.6, 1.0, 0.8, z0=-0.1, tagli=2, rumore=0.05, seme=x), I, 'pietra', Ma @ T(x, 0, 0), uv=1.4)
    S.metti(scatola(2.6, 1.4, 0.28, z0=0.68, tagli=2, rumore=0.04, seme=3), I, 'muschio', Ma, uv=1.4, radica=False)
    S.urto(Ma, 2.6, 1.4, 1.0)
    candele(S, Ma, rnd, I, 8, 1.0, 0.96)
    teschio(S, Ma @ T(0.2, 0.1, 0.96), rnd, I)
    for k in range(12):   # il cerchio di rune a terra
        an = k / 12 * math.tau
        a, b = cc[0] + math.cos(an) * 3.4, cc[1] + math.sin(an) * 3.4
        Mr = posa(a, b, an + rnd.uniform(-0.3, 0.3), 0.05)
        S.metti(scatola(0.07, 0.55, 0.02), I, 'runa', Mr, radica=False, liscia=False)
        S.metti(scatola(0.34, 0.07, 0.02), I, 'runa', Mr @ T(0, 0.12, 0) @ R(0.6), radica=False, liscia=False)
        if k % 3 == 0:
            S.luce(Mr, 'runa', 0.6, (0, 0, 0.25))
    for k in range(5):
        an = k / 5 * math.tau + 0.6
        a, b = cc[0] + math.cos(an) * 9.0, cc[1] + math.sin(an) * 9.0
        Mt = posa(a, b, an)
        S.metti(tubo([((0, 0, -0.3), 0.05), ((0.03, 0, 1.7), 0.04)], 5), I, 'legno', Mt)
        teschio(S, Mt @ T(0.03, 0, 1.7), rnd, I)
    for _ in range(22):
        an, d = rnd.uniform(0, 6.28), rnd.uniform(7.4, 9.8)
        masso(S, posa(cc[0] + math.cos(an) * d, cc[1] + math.sin(an) * d), rnd, I, rnd.uniform(0.2, 0.5), urto=False)
    albero(S, cc[0] + 10.5, cc[1] + 6.5, rnd, posa, 11.0, 0.8)
    albero(S, cc[0] - 9.5, cc[1] - 8.0, rnd, posa, 9.5, 0.65)

    # ---------------------------------------------------------------- l'orto delle zucche, con lo spaventapasseri
    I = 'orto'
    orto = [P(-3, 16.5), P(10, 16.5), P(10, 27.5), P(-3, 27.5)]
    staccionata(S, orto + [orto[0]][:0] + [P(-3, 24)], rnd, I, posa)
    for (da, db) in [(d, o) for d in range(-3, 11, 2) for o in range(17, 28, 2)]:
        S.occupa(*P(da, db), 1.6)
    spaventapasseri(S, posa(*P(3.5, 22), verso_v + 0.3, 0, (0.05, -0.04)), rnd, I)
    for k in range(17):
        d, o = rnd.uniform(-2, 9), rnd.uniform(17.5, 26.5)
        if math.hypot(d - 3.5, o - 22) > 1.0:
            zucca(S, posa(*P(d, o), verso_v + rnd.uniform(-0.8, 0.8)), rnd, I, k < 6)
    for _ in range(10):
        sterpo(S, posa(*P(rnd.uniform(-2, 9), rnd.uniform(17.5, 26.5)), rnd.uniform(0, 6)), rnd, I, rnd.uniform(0.6, 1.0))

    # ---------------------------------------------------------------- pozzo e alberi grandi lungo la strada
    pozzo(S, posa(*P(33, 11), 0.5), rnd)
    for (d, o, alto, grosso) in ((21, -13, 11.5, 0.85), (23, 16, 10.0, 0.7), (-7, -17, 10.5, 0.75), (101, 5.5, 10.0, 0.7), (119, -8.5, 11.0, 0.8),
                                 (140, 14, 9.5, 0.65), (147, -9, 10.5, 0.75), (84, 3, 9.5, 0.65), (47, -9.5, 10.0, 0.7)):
        albero(S, *P(d, o), rnd, posa, alto, grosso)

    # ---------------------------------------------------------------- il sottobosco, sparso dove non c'è altro
    I = 'bosco'

    def libero(a, b, margine=0.0):
        if math.hypot(a, b) > 160 or terra(a, b) < 0.2:
            return False
        return (math.floor((a + CX) / 2), math.floor((b + CZ) / 2)) not in S.occupati

    def sparge(quanti, fai, vicino_ai_sentieri=0.0):
        fatti, prove = 0, 0
        while fatti < quanti and prove < quanti * 30:
            prove += 1
            if vicino_ai_sentieri and rnd.random() < vicino_ai_sentieri:
                (a, b) = rnd.choice(principale)
                a, b = a + rnd.uniform(-9, 9), b + rnd.uniform(-9, 9)
            else:
                an, d = rnd.uniform(0, 6.28), 160 * math.sqrt(rnd.random())
                a, b = math.cos(an) * d, math.sin(an) * d
            if libero(a, b):
                fai(a, b)
                fatti += 1

    sparge(75, lambda a, b: masso(S, posa(a, b), rnd, I, rnd.choice((0.3, 0.4, 0.5, 0.7, 0.9, 1.3))), 0.4)
    sparge(34, lambda a, b: ceppo(S, posa(a, b, rnd.uniform(0, 6)), rnd, I), 0.3)
    sparge(28, lambda a, b: tronco_caduto(S, posa(a, b, rnd.uniform(0, 6)), rnd, I), 0.3)
    sparge(55, lambda a, b: funghi(S, posa(a, b), rnd, I), 0.5)
    sparge(14, lambda a, b: ossa(S, posa(a, b), rnd, I), 0.5)
    sparge(80, lambda a, b: sterpo(S, posa(a, b, rnd.uniform(0, 6)), rnd, I, rnd.uniform(0.9, 1.9)), 0.4)

    # ---------------------------------------------------------------- si salva
    materiali = crea_materiali(os.path.join(QUI, 'immagini'))
    fatti = S.costruisci(materiali)
    print('oggetti', len(fatti), 'facce', sum(n for (_, n) in fatti))
    for nome, n in sorted(fatti, key=lambda x: -x[1])[:12]:
        print('  ', nome, n)
    uscita = os.path.join(RADICE, 'public', 'modelli', 'bosco_strega_grezzo.glb')
    scelte = dict(filepath=uscita, export_format='GLB', export_yup=True, export_apply=False, export_image_format='AUTO')
    try:
        bpy.ops.export_scene.gltf(**scelte, export_vertex_color='ACTIVE', export_all_vertex_colors=False, export_active_vertex_color_when_no_material=True)
    except TypeError as errore:
        print('scelte dei colori non accettate, riprovo senza:', errore)
        bpy.ops.export_scene.gltf(**scelte)
    print('scena', os.path.getsize(uscita) // 1024, 'kb')

    # i dati per il gioco
    chiavi = sorted((i + 32768) * 65536 + (j + 32768) for (i, j) in S.occupati)
    campioni = []
    for k in range(60):
        a, b = math.cos(k * 2.4) * (k * 2.7 + 3), math.sin(k * 2.4) * (k * 2.7 + 3)
        campioni.append([round(a + CX, 3), round(b + CZ, 3), round(suolo(a, b), 4)])
    imbocco = P(166, 0)
    dati = {'luci': S.luci, 'urti': S.urti, 'occupati': chiavi, 'campioni': campioni, 'imbocco': [round(imbocco[0] + CX, 1), round(imbocco[1] + CZ, 1)]}
    testo = json.dumps(dati, separators=(',', ':'))
    with open(os.path.join(RADICE, 'src', 'mondo', 'stregaDati.ts'), 'w') as f:
        f.write('/** Ciò che il gioco deve sapere della scena del Bosco della Strega, oltre alle forme: i punti che brillano, gli ingombri,\n'
                ' * le caselle già occupate (lì il bosco non fa nascere piante sue), qualche quota di prova del terreno.\n'
                ' * Lo scrive strumenti/strega/scena.py: non si modifica a mano. */\n'
                'export interface LuceStrega { p: [number, number, number]; t: string; f: number }\n'
                'export interface UrtoStrega { p: [number, number, number]; m?: [number, number, number]; g?: number; r?: number; h?: number }\n'
                "export const STREGA_DATI = JSON.parse('" + testo + "') as { luci: LuceStrega[]; urti: UrtoStrega[]; occupati: number[]; campioni: [number, number, number][]; imbocco: [number, number] };\n")
    print('luci', len(S.luci), 'urti', len(S.urti), 'caselle occupate', len(chiavi))

    # il terreno, solo per guardare la scena fuori dal gioco
    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o)
    n = 110
    vs = [(i * PASSO - n * PASSO / 2, -(j * PASSO - n * PASSO / 2), 0.0) for j in range(n + 1) for i in range(n + 1)]
    vs = [(x, y, terra(x, -y)) for (x, y, _) in vs]
    fs = [(j * (n + 1) + i, j * (n + 1) + i + 1, (j + 1) * (n + 1) + i + 1, (j + 1) * (n + 1) + i) for j in range(n) for i in range(n)]
    me = bpy.data.meshes.new('terreno')
    me.from_pydata(vs, [], fs)
    m = bpy.data.materials.new('terreno')
    m.use_nodes = True
    m.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.09, 0.075, 0.055, 1)
    me.materials.append(m)
    bpy.context.collection.objects.link(bpy.data.objects.new('terreno', me))
    bpy.ops.export_scene.gltf(filepath='/tmp/strega_terreno_prova.glb', export_format='GLB', export_yup=True)


if __name__ == '__main__':
    main()
