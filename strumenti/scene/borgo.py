"""Costruisce con Blender il Borgo d'Inverno e lo salva per il gioco (vedi salva.py).

    cd strumenti/scene && python borgo.py

Un paese di case a graticcio sotto la neve, ai piedi dei monti: la via maestra che serpeggia da est a ovest, la
piazza con la fontana gelata e il mercato, la torre tonda sul poggio, la fucina, lo stagno ghiacciato in basso.
I posti sono in metri dal centro: `a` verso est, `b` verso sud. Si arriva da est (dal villaggio di partenza).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402
import bmesh  # noqa: E402

import terreno  # noqa: E402

terreno.scegli('borgo')

from attrezzi import R, T, Scena, cilindro, posa, scatola, sgualcisci, tubo, verso  # noqa: E402
from edifici import sentiero, spline  # noqa: E402
from oggetti import corvo, lanterna, masso, staccionata  # noqa: E402
from edifici import pozzo  # noqa: E402
from paese import (bancarella, barile, casa, catasta, cumulo_neve, festone, fontana, fucina, lume, mucchio, panca, pupazzo, slitta,  # noqa: E402
                   stendardo, torre_tonda)
from salva import salva  # noqa: E402
from suoli import via_borgo  # noqa: E402
from terreno import terra  # noqa: E402

INSEGNE = ((0.75, 0.3, 0.2), (0.25, 0.45, 0.7), (0.85, 0.7, 0.25), (0.3, 0.55, 0.35))


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = Scena()
    rnd = random.Random(2024)

    # ---------------------------------------------------------------- la via maestra e la piazza
    via = [(a, via_borgo(a)) for a in range(118, -24, -2)]
    sentiero(S, via, 4.4, 'ciottoli', 'vie', rnd, bordi=0.0, gradini=False)
    piazza = (-38.0, 0.0)
    disco = cilindro(17.0, 17.0, 0.12, 40, z0=-0.04)
    S.metti(disco, 'vie', 'ciottoli', posa(*piazza, 0.3, 0.0), uv=2.4, radica=False)
    for i in range(-55, -20, 2):
        for j in range(-17, 18, 2):
            if math.hypot(i + 38, j) < 18.5:
                S.occupa(i, j, 1.6)
    fontana(S, posa(*piazza, 0.2), rnd, 'piazza', gelata=True)

    # ---------------------------------------------------------------- le case lungo la via
    n_case = 0

    def lungo_via(a, lato, **scelte):
        nonlocal n_case
        fondo = scelte.pop('fondo', rnd.uniform(5.6, 6.8))
        largo = scelte.pop('largo', rnd.uniform(6.6, 9.2))
        if scelte.get('timpano'):
            largo, fondo = min(largo, 7.0), max(fondo, 7.5)
        pend = via_borgo(a + 1) - via_borgo(a - 1)
        b = via_borgo(a) + lato * (5.6 + fondo / 2)
        giro = (0.0 if lato < 0 else math.pi) + math.atan2(pend, 2.0) * (-1 if lato < 0 else -1)
        M = posa(a, b, giro + rnd.uniform(-0.05, 0.05), 0.0)
        casa(S, M, rnd, 'case_e' if a > 60 else ('case_m' if a > 22 else 'case_o'), largo, fondo, neve=True, **scelte)
        n_case += 1
        return M

    # a nord della via (guardano a sud) e a sud (guardano a nord); la locanda è la più grande
    piano = [(100, -1, dict(piani=2)), (86, -1, dict(piani=3, timpano=True, insegna_tinta=INSEGNE[1])), (73, -1, dict(piani=2)),
             (58, -1, dict(piani=3, largo=10.5, fondo=7.2, insegna_tinta=INSEGNE[0], abbaino=True)), (43, -1, dict(piani=2, timpano=True)),
             (30, -1, dict(piani=3)), (16, -1, dict(piani=2, timpano=True, insegna_tinta=INSEGNE[2])), (3, -1, dict(piani=2)), (-10, -1, dict(piani=3, timpano=True)),
             (104, 1, dict(piani=2, timpano=True)), (91, 1, dict(piani=2)), (77, 1, dict(piani=3, timpano=True, insegna_tinta=INSEGNE[3])), (63, 1, dict(piani=2)),
             (49, 1, dict(piani=3)), (12, 1, dict(piani=2, timpano=True)), (-2, 1, dict(piani=3, insegna_tinta=INSEGNE[1])), (-14, 1, dict(piani=2, timpano=True))]
    for (a, lato, scelte) in piano:
        lungo_via(a, lato, **scelte)
    # attorno alla piazza, con il davanti verso la fontana
    for (an, d, scelte) in ((1.35, 25.5, dict(piani=3, largo=8.5)), (1.95, 26.0, dict(piani=2, timpano=True)), (2.6, 25.0, dict(piani=3, insegna_tinta=INSEGNE[2])),
                            (3.25, 25.5, dict(piani=2, timpano=True)), (4.45, 25.5, dict(piani=3, largo=8.5, abbaino=True)), (5.0, 25.0, dict(piani=2, largo=7.2))):
        a, b = piazza[0] + math.cos(an) * d, piazza[1] + math.sin(an) * d
        casa(S, posa(a, b, verso(piazza[0] - a, piazza[1] - b) + rnd.uniform(-0.06, 0.06)), rnd, 'case_p', scelte.pop('largo', rnd.uniform(6.8, 8.2)), rnd.uniform(5.8, 6.6), neve=True, **scelte)
        n_case += 1

    # ---------------------------------------------------------------- il mercato in piazza
    I = 'piazza'
    for (an, tinta, merce) in ((1.0, (0.7, 0.2, 0.15), 'pane'), (-1.1, (0.2, 0.35, 0.6), 'frutta'), (2.1, (0.25, 0.5, 0.3), 'pesce'), (3.3, (0.75, 0.55, 0.15), 'frutta')):
        a, b = piazza[0] + math.cos(an) * 10.5, piazza[1] + math.sin(an) * 10.5
        bancarella(S, posa(a, b, verso(piazza[0] - a, piazza[1] - b)), rnd, I, tinta, True, merce)
    for (an, d) in ((1.6, 11.5), (2.75, 12.0), (4.9, 11.0)):
        mucchio(S, posa(piazza[0] + math.cos(an) * d, piazza[1] + math.sin(an) * d), rnd, I, 5, 1.2, True)
    for k in range(6):   # i lampioni attorno alla piazza
        an = k / 6 * math.tau + 0.15
        a, b = piazza[0] + math.cos(an) * 15.2, piazza[1] + math.sin(an) * 15.2
        lanterna(S, posa(a, b, an + math.pi / 2), rnd, I, 3.1, 1.1)
    slitta(S, posa(-27, 13.5, 0.7), rnd, I)
    for (a, b) in ((-34.5, 3.0), (-41.0, -3.5), (-30.0, -12.0), (-47.0, 9.5)):   # chi fa due passi in piazza
        S.persona(posa(a, b))

    # ---------------------------------------------------------------- lampioni, cataste, barili e cumuli lungo la via
    I = 'vie'
    for i, a in enumerate(range(108, -16, -13)):
        lato = 1 if i % 2 else -1
        b = via_borgo(a) + lato * 3.3
        lanterna(S, posa(a, b, 0.0 if lato > 0 else math.pi), rnd, I, rnd.uniform(2.9, 3.2), 1.1)
        S.occupa(a, b, 1.0)
    for _ in range(46):
        a = rnd.uniform(-18, 114)
        lato = rnd.choice((-1, 1))
        cumulo_neve(S, posa(a, via_borgo(a) + lato * rnd.uniform(2.6, 4.4), 0, -0.05), I, rnd, rnd.uniform(0.5, 1.2))
    for (a, lato) in ((96, -1), (66, -1), (37, -1), (9, -1), (84, 1), (56, 1), (5, 1)):
        Mq = posa(a + rnd.uniform(-1, 1), via_borgo(a) + lato * 4.6, rnd.uniform(0, 6))
        if rnd.random() < 0.5:
            mucchio(S, Mq, rnd, I, rnd.randint(2, 4), 0.8, True)
        else:
            barile(S, Mq, rnd, I)
            barile(S, Mq @ T(0.75, 0.2, 0), rnd, I)
    # le luci della festa, tese sopra la via da una casa all'altra e attorno alla piazza
    for a in (95, 80, 68, 53, 40, 22, 8):
        b = via_borgo(a)
        festone(S, I, (a, -(b - 5.5), terra(a, b) + 5.4), (a + rnd.uniform(-1.5, 1.5), -(b + 5.5), terra(a, b) + 5.2), 7, rnd.uniform(0.6, 1.0))
    for k in range(6):
        an0, an1 = k / 6 * math.tau + 0.15, (k + 1) / 6 * math.tau + 0.15
        if k != 5:   # non davanti allo sbocco della via
            festone(S, I, (piazza[0] + math.cos(an0) * 15.2, -(piazza[1] + math.sin(an0) * 15.2), 9.0), (piazza[0] + math.cos(an1) * 15.2, -(piazza[1] + math.sin(an1) * 15.2), 9.0), 8, 0.9)
    for (a, lato, g) in ((88, -1, 0.0), (47, 1, math.pi), (24, -1, 0.0), (-6, 1, math.pi)):
        panca(S, posa(a, via_borgo(a) + lato * 4.7, g), rnd, I, True)
    for a in (101, 82, 61, 35, 14):   # la gente lungo la via
        S.persona(posa(a, via_borgo(a) + rnd.uniform(-1.4, 1.4)))
    S.persona(posa(113.0, via_borgo(113) + 3.8, math.pi / 2), 'guardia')
    for an in (0.75, 2.45, 5.1):
        panca(S, posa(piazza[0] + math.cos(an) * 14.0, piazza[1] + math.sin(an) * 14.0, verso(-math.cos(an), -math.sin(an))), rnd, I, True)
    pozzo(S, posa(69.5, via_borgo(69.5) + 11.5, 0.4), rnd)
    # il portale d'ingresso a est: due pali, la trave con l'insegna e due lanterne
    Mp = posa(116, via_borgo(116), math.pi / 2)
    for k in (-1, 1):
        S.metti(scatola(0.32, 0.32, 4.4, smusso=0.03), I, 'legno', Mp @ T(k * 3.1, 0, -0.3), uv=0.9, tinta=(0.5, 0.42, 0.36))
        S.urto_tondo(Mp @ T(k * 3.1, 0, 0), 0.25, 4.0)
        lume(S, Mp @ T(k * 3.1, -0.16, 2.6), I, 1.0)
        cumulo_neve(S, Mp @ T(k * 3.4, 0, 0), I, rnd, 0.9)
    S.metti(scatola(7.2, 0.3, 0.34, z0=3.75, smusso=0.03), I, 'legno', Mp, uv=0.9, tinta=(0.5, 0.42, 0.36), radica=False)
    S.metti(scatola(7.3, 0.4, 0.14, z0=4.08, tagli=2, rumore=0.03), I, 'neve', Mp, uv=1.4, radica=False)
    S.metti(scatola(2.6, 0.08, 0.7, z0=2.95, smusso=0.01), I, 'legno', Mp, uv=0.8, radica=False, liscia=False)
    corvo(S, Mp @ T(1.9, 0, 4.2), rnd, I)

    # ---------------------------------------------------------------- la torre sul poggio, con il sentiero che sale
    I = 'torre'
    Mt = posa(-80, -36, verso(42, 36))
    torre_tonda(S, Mt, rnd, I, 3.5, 15.0, neve=True, bandiera=(0.6, 0.12, 0.1), finestre=4)
    stendardo(S, Mt @ T(0, -3.72, 9.5), I)
    S.persona(Mt @ T(1.9, -5.4, -0.6), 'guardia')
    sentiero(S, spline([(-50, -10), (-59, -17), (-67, -25), (-74.5, -31)], 1.0), 2.2, 'ciottoli', 'vie', rnd, bordi=0.3)
    for (a, b) in ((-71, -24), (-88, -30), (-84, -45), (-73, -42)):
        masso(S, posa(a, b), rnd, I, rnd.uniform(0.7, 1.3), muschio=False)
        cumulo_neve(S, posa(a + 0.3, b + 0.2, 0, 0.5), I, rnd, 0.9, 0.3)
    catasta(S, posa(-76.5, -40.5, verso(-3.5, 4.5)), rnd, I, 2.4, 4, True)

    # ---------------------------------------------------------------- la fucina, dietro la piazza
    fucina(S, posa(-22, 17.5, math.pi + 0.5), rnd, 'piazza', neve=True)

    # ---------------------------------------------------------------- lo stagno ghiacciato, in basso a sud
    I = 'stagno'
    lastra = cilindro(13.5, 13.5, 0.16, 28, z0=-0.08)
    bmesh.ops.subdivide_edges(lastra, edges=[e for e in lastra.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 0.01 and e.calc_length() > 2.0], cuts=3)
    for v in lastra.verts:
        rr = math.hypot(v.co.x, v.co.y)
        if rr > 12:
            k = 1 + 0.12 * math.sin(math.atan2(v.co.y, v.co.x) * 5) + 0.06 * math.sin(math.atan2(v.co.y, v.co.x) * 11)
            v.co.x, v.co.y = v.co.x * k, v.co.y * k
    S.metti(lastra, I, 'ghiaccio', T(30, -74, -0.42), radica=False, tinta=(1, 1, 1))
    S.urto_tondo(T(30, -74, -1.0), 14.0, 0.62)
    S.occupa(30, 74, 16.5)
    sentiero(S, spline([(31, via_borgo(31) + 3), (33, 22), (30, 40), (28, 57)], 1.0), 1.8, 'terra', 'vie', rnd, bordi=0.0)
    pupazzo(S, posa(19.5, 56.5, 2.6), rnd, I)
    S.persona(posa(21.5, 58.0))
    S.persona(posa(33.0, 55.5))
    pupazzo(S, posa(-40.5, 13.5, 0.3), rnd, 'piazza')
    slitta(S, posa(37, 57.5, 0.4, 0, (0.0, 0.05)), rnd, I)
    staccionata(S, [(14, 60), (12, 70), (14, 82), (22, 90)], rnd, I, posa)
    staccionata(S, [(41, 58), (47, 66), (48, 78)], rnd, I, posa)
    # il pontiletto di assi, con una lanterna in fondo
    Mj = T(30, -60.6, 0.05)
    for i in range(18):
        S.metti(scatola(1.6, 0.27, 0.06, smusso=0.008), I, 'legno', Mj @ T(rnd.uniform(-0.03, 0.03), -i * 0.3, 0), uv=0.9, radica=False, tinta=(rnd.uniform(0.6, 0.85),) * 3)
    for y in (0, -2.6, -5.2):
        for x in (-0.75, 0.75):
            S.metti(cilindro(0.08, 0.07, 1.6, 7, z0=-1.2), I, 'corteccia', Mj @ T(x, y, 0), radica=False)
    S.urto(Mj @ T(0, -2.6, 0), 1.7, 5.6, 0.3, -0.24)
    lanterna(S, Mj @ T(0.65, -5.0, 0.03) @ R(math.pi / 2), rnd, I, 2.3, 1.0)
    for _ in range(14):
        an, d = rnd.uniform(0, 6.28), rnd.uniform(14.5, 18)
        cumulo_neve(S, posa(30 + math.cos(an) * d, 74 + math.sin(an) * d), I, rnd, rnd.uniform(0.6, 1.3))

    # ---------------------------------------------------------------- la baita del cacciatore, in alto verso i monti
    I = 'baita'
    Mb = posa(34, -86, 0.25)
    casa(S, Mb, rnd, I, 6.2, 5.2, piani=1, neve=True, alto_tetto=3.6, zoccolo=2.2, abbaino=False)
    catasta(S, Mb @ T(-4.3, 0.8, 0.3) @ R(math.pi / 2), rnd, I, 2.8, 5, True)
    sentiero(S, spline([(37, 1.0), (37, -16), (33, -34), (31, -56), (33.5, -79)], 1.0), 1.7, 'terra', 'vie', rnd, bordi=0.3)
    lanterna(S, posa(29.5, -78.5, 1.0), rnd, I, 2.6, 1.0)
    S.persona(posa(32.0, -80.5))
    for k in (-1, 1):   # una pelle stesa ad asciugare su un telaio
        S.metti(scatola(0.1, 0.1, 2.0), I, 'legno', Mb @ T(5.0 + k * 0.9, -1.2, 0), uv=0.8)
    S.metti(scatola(2.0, 0.08, 0.08, z0=1.9), I, 'legno', Mb @ T(5.0, -1.2, 0), uv=0.8, radica=False)
    S.metti(scatola(1.3, 0.03, 1.2, z0=0.6), I, 'tela', Mb @ T(5.0, -1.2, 0), uv=1.0, tinta=(0.55, 0.4, 0.28), radica=False, liscia=False)

    # ---------------------------------------------------------------- orti recintati dietro le case, massi e cumuli sparsi
    I = 'intorno'
    for (pt) in ([(52, -22), (52, -32), (66, -32), (66, -22)], [(84, 20), (84, 30), (98, 30), (98, 19)], [(-4, 21), (-4, 31), (9, 31), (9, 21)]):
        staccionata(S, pt + [pt[0]], rnd, I, posa)
        for _ in range(4):
            cumulo_neve(S, posa(rnd.uniform(pt[0][0] + 1, pt[2][0] - 1), rnd.uniform(min(pt[0][1], pt[2][1]) + 1, max(pt[0][1], pt[2][1]) - 1)), I, rnd, rnd.uniform(0.6, 1.1), 0.25)

    def libero(a, b):
        return math.hypot(a, b) < 112 and terra(a, b) > 0.3 and (math.floor((a + terreno.CX) / 2), math.floor((b + terreno.CZ) / 2)) not in S.occupati

    fatti = 0
    while fatti < 60:
        an, d = rnd.uniform(0, 6.28), 112 * math.sqrt(rnd.random())
        a, b = math.cos(an) * d, math.sin(an) * d
        if libero(a, b):
            fatti += 1
            if rnd.random() < 0.55:
                r = rnd.choice((0.4, 0.6, 0.8, 1.1, 1.5))
                masso(S, posa(a, b), rnd, I, r, muschio=False)
                cumulo_neve(S, posa(a + 0.15 * r, b, 0, r * 0.75), I, rnd, r * 0.75, 0.3)
            else:
                cumulo_neve(S, posa(a, b), I, rnd, rnd.uniform(0.8, 1.8), 0.3)

    salva(S, 'borgo_inverno', (112, via_borgo(112)), colore_terreno=(0.75, 0.8, 0.86))


if __name__ == '__main__':
    main()
