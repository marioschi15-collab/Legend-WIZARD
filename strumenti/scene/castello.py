"""Costruisce con Blender il Castello del Bosco e lo salva per il gioco (vedi salva.py).

    cd strumenti/scene && python castello.py

Un castello in cima a un colle, in fondo a una strada di ciottoli nel bosco: le mura merlate con cinque torri dal
tetto a punta, il portone con la saracinesca alzata (si entra nel cortile), il mastio con le torrette e la torre
della scala, la sala grande, le scuderie, il pozzo. Fuori: il ponte di pietra sul ruscello, il mulino a vento, il
campo d'allenamento, l'accampamento dei viandanti. I posti sono in metri dal centro: `a` verso est, `b` verso sud.
Si arriva da est (dal villaggio di partenza).
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402  (va importato prima di bmesh)
import bmesh  # noqa: E402

import terreno  # noqa: E402

terreno.scegli('castello')

from attrezzi import R, T, Scena, cilindro, posa, scatola, tubo, verso  # noqa: E402
from edifici import ala, carro, finestra, pozzo, sentiero, spline  # noqa: E402
from oggetti import corvo, lanterna, masso, staccionata  # noqa: E402
from paese import (bancarella, barile, bersaglio, braciere, casa, catasta, fantoccio, fuoco_campo, mastio, mucchio, mulino, muro_merlato,  # noqa: E402
                   panca, ponte_pietra, portone, stendardo, tenda, torcia, torre_tonda)
from salva import salva  # noqa: E402
from suoli import ruscello_castello  # noqa: E402
from terreno import terra  # noqa: E402

C = (-20.0, 0.0)      # il centro del colle
Q = 12.5              # la quota della spianata
ROSSO = (0.5, 0.1, 0.1)


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = Scena()
    rnd = random.Random(1066)

    def c(x, y):
        """Un punto dato rispetto al centro del colle."""
        return (C[0] + x, C[1] + y)

    # ---------------------------------------------------------------- le mura: cinque torri tonde e il portone a est
    I = 'mura'
    torri = {'ne': (17, -18), 'n': (-7, -25), 'no': (-25, -11), 'so': (-23, 15), 's': (-2, 25), 'se': (18, 17)}
    porta_est = (18.0, -0.5)
    for (da, verso_dove) in (('n', 'ne'), ('se', 's'), ('s', 'so'), ('so', 'no'), ('no', 'n')):
        muro_merlato(S, c(*torri[da]), c(*torri[verso_dove]), rnd, I, posa, 7.0, 1.7, Q)
    muro_merlato(S, c(*torri['ne']), c(porta_est[0], porta_est[1] - 6.6), rnd, I, posa, 7.0, 1.7, Q)
    muro_merlato(S, c(porta_est[0], porta_est[1] + 6.6), c(*torri['se']), rnd, I, posa, 7.0, 1.7, Q)
    for k, (nome, (x, y)) in enumerate(torri.items()):
        Mt = T(C[0] + x, -(C[1] + y), Q) @ R(verso(-x, -y))
        torre_tonda(S, Mt, rnd, 'torri', 3.4 if nome in ('ne', 'se') else 3.0, rnd.uniform(11.5, 14.5), porta_davanti=True, finestre=3, bandiera=ROSSO if k % 2 == 0 else None, alto_tetto=rnd.uniform(7.0, 9.0))
    Mg = T(C[0] + porta_est[0], -(C[1] + porta_est[1]), Q) @ R(math.pi / 2)
    portone(S, Mg, rnd, 'portone')

    # ---------------------------------------------------------------- dentro: il cortile, il mastio, la sala, le scuderie
    I = 'cortile'
    S.metti(cilindro(16.5, 16.5, 0.14, 36, z0=-0.05), I, 'ciottoli', T(C[0] + 4.0, -C[1], Q), uv=2.4, radica=False)
    for i in range(-27, 22, 2):
        for j in range(-26, 27, 2):
            if math.hypot(i, j) < 27:
                S.occupa(C[0] + i, C[1] + j, 1.6)
    Mm = T(C[0] - 9.5, -(C[1] - 3.0), Q) @ R(math.pi / 2)
    mastio(S, Mm, rnd, 'mastio', finestra)
    # la sala grande, a sud del mastio: un'ala bassa con il tetto ripido e le finestre alte
    Ms = T(C[0] - 6.0, -(C[1] + 13.5), Q) @ R(math.pi)
    ala(S, Ms, 'sala', 15.0, 6.6, 5.2, 5.6, 0.0, 7)
    for x in (-5.4, -1.8, 1.8, 5.4):
        finestra(S, Ms @ T(x, -3.33, 1.4), 'sala', 0.9, 2.6)
    S.metti(scatola(1.5, 0.14, 2.4, z0=0.02), 'sala', 'tavole', Ms @ T(6.6, -3.36, 0), uv=1.0, tinta=(0.75, 0.6, 0.46), radica=False, liscia=False)
    S.urto(Ms, 15.2, 6.8, 9.0)
    for k in (-1, 1):
        torcia(S, Ms @ T(6.6 + k * 1.3, -3.32, 1.9), 'sala')
    # le scuderie: una tettoia di legno contro il muro di nord, con la paglia, il carro, le botti
    Mc = T(C[0] + 6.0, -(C[1] - 18.0), Q) @ R(-0.29)
    for x in (-5.0, -1.7, 1.7, 5.0):
        S.metti(scatola(0.22, 0.22, 3.0, smusso=0.02), I, 'legno', Mc @ T(x, -2.0, 0), uv=0.9)
        S.urto_tondo(Mc @ T(x, -2.0, 0), 0.18, 3.0)
    S.metti(scatola(11.0, 4.6, 0.12), I, 'tetto', Mc @ T(0, 0, 3.35) @ R(0, 0.2), uv=2.0, radica=False, liscia=False)
    S.metti(scatola(10.6, 0.16, 0.2, z0=2.9), I, 'legno', Mc @ T(0, -2.0, 0), uv=0.9, radica=False, liscia=False)
    for x in (-3.4, 0.0, 3.4):
        S.metti(scatola(3.0, 1.6, rnd.uniform(0.5, 0.9), tagli=2, rumore=0.12, seme=x), I, 'colore', Mc @ T(x, 0.9, 0), tinta=(0.75, 0.62, 0.3))
        S.metti(scatola(0.1, 3.6, 1.3), I, 'legno', Mc @ T(x + 1.7, 0.1, 0), uv=0.9, liscia=False)
    carro(S, T(C[0] + 13.0, -(C[1] - 9.5), Q) @ R(2.1), rnd, bare=False, insieme=I)
    pozzo(S, T(C[0] + 7.5, -(C[1] + 4.5), Q) @ R(0.4), rnd)
    mucchio(S, T(C[0] + 12.5, -(C[1] + 11.0), Q), rnd, I, 7, 1.6)
    mucchio(S, T(C[0] - 1.0, -(C[1] - 14.0), Q), rnd, I, 5, 1.3)
    catasta(S, T(C[0] - 15.5, -(C[1] + 9.0), Q) @ R(-math.pi / 2), rnd, I, 2.8, 5)
    for (x, y, g) in ((3.0, 9.5, 0.4), (5.5, 11.5, -0.5)):
        fantoccio(S, T(C[0] + x, -(C[1] + y), Q) @ R(g), rnd, I)
    S.metti(scatola(2.0, 0.1, 0.1, z0=1.2), I, 'legno', T(C[0] + 9.2, -(C[1] + 14.2), Q) @ R(0.7), radica=False)   # la rastrelliera delle lance
    for i in range(5):
        S.metti(tubo([((-0.8 + i * 0.4, 0.25, 0), 0.022), ((-0.8 + i * 0.4, -0.05, 2.5), 0.018)], 4), I, 'legno', T(C[0] + 9.2, -(C[1] + 14.2), Q) @ R(0.7), radica=False)
        S.metti(cilindro(0.045, 0.0, 0.3, 4, z0=2.5), I, 'ferro', T(C[0] + 9.2, -(C[1] + 14.2), Q) @ R(0.7) @ T(-0.8 + i * 0.4, -0.05, 0), radica=False, liscia=False)
    for (x, y) in ((14.5, -4.5), (14.5, 3.5)):
        braciere(S, T(C[0] + x, -(C[1] + y), Q), I)
    for (x, y) in ((9.0, -2.0), (4.5, 6.5), (8.0, -13.5), (-2.0, 9.0)):   # la gente del castello, nel cortile
        S.persona(T(C[0] + x, -(C[1] + y), Q + 0.08))
    for k in range(6):
        corvo(S, T(C[0] + rnd.uniform(-20, 15), -(C[1] + rnd.choice((-21, 21)) + rnd.uniform(-1, 1)), Q + 8.3), rnd, I)

    # ---------------------------------------------------------------- la strada dal ponte al portone, con i lampioni
    I = 'strada'
    ar = ruscello_castello(0.0)
    quota_ponte = max(terra(ar - 12.2, 0.0), terra(ar + 12.2, 0.0)) + 0.12
    est = spline([(116, 9), (104, 4), (ar + 13.5, 0.0), (ar + 11.6, 0.0)], 1.0)
    ovest = spline([(ar - 11.6, 0.0), (ar - 13.5, 0.0), (52, -3), (38, 2.5), (24, -1.5), (10, -0.5), (C[0] + porta_est[0] + 3.2, C[1] + porta_est[1])], 1.0)
    sentiero(S, est, 4.2, 'ciottoli', I, rnd, bordi=0.5, gradini=False)
    sentiero(S, ovest, 4.2, 'ciottoli', I, rnd, bordi=0.5, gradini=False)
    ponte_pietra(S, T(ar, 0.0, quota_ponte), rnd, 'ponte', 23.0, 4.8, quota_ponte + 1.15)
    for a in range(int(ar) - 13, int(ar) + 14, 2):
        S.occupa(a, 0.0, 3.6)
    lungo, lato = 6.0, 1
    for pt in (est, ovest):
        for i in range(1, len(pt) - 2):
            (a0, b0), (a, b) = pt[i - 1], pt[i]
            d = math.hypot(a - a0, b - b0)
            lungo += d
            if lungo >= 13.0 and abs(a - ar) > 16 and a > 6:
                lungo = 0.0
                la, lb = -(b - b0) / d * lato, (a - a0) / d * lato
                lanterna(S, posa(a + la * 3.0, b + lb * 3.0, math.atan2(lb, -la), -0.05), rnd, I, rnd.uniform(2.8, 3.1), 1.0)
                S.occupa(a + la * 3.0, b + lb * 3.0, 1.0)
                lato = -lato
    for k in (-1, 1):   # due pilastri con lo stendardo ai piedi della salita
        Mp = posa(31.0, 0.5 + k * 3.6, math.pi / 2)
        S.metti(scatola(0.9, 0.9, 3.4, z0=-0.4, tagli=2, rumore=0.03, seme=k), I, 'muro', Mp, uv=1.8)
        S.metti(scatola(1.15, 1.15, 0.22, z0=3.0), I, 'pietra', Mp, uv=1.2, radica=False)
        braciere(S, Mp @ T(0, 0, 3.2), I, 0.9)
        stendardo(S, Mp @ T(0, -0.46, 2.7), I, ROSSO, 2.0, 0.7)
        S.urto(Mp, 0.9, 0.9, 3.2)
    # la cappelletta dei viandanti, a un bivio
    Mv = posa(110.0, 0.5, verso(0, 1))
    S.metti(scatola(1.3, 1.1, 2.0, z0=-0.3, tagli=2, rumore=0.03, seme=4), I, 'muro', Mv, uv=1.8)
    S.metti(scatola(0.7, 0.3, 0.9, z0=0.8), I, 'colore', Mv @ T(0, -0.45, 0), tinta=(0.03, 0.03, 0.04), radica=False, liscia=False)
    S.metti(scatola(0.06, 0.06, 0.2, z0=0.82), I, 'colore', Mv @ T(0, -0.5, 0), tinta=(0.86, 0.8, 0.62), radica=False)
    S.luce(Mv, 'candela', 0.6, (0, -0.55, 1.1))
    S.metti(scatola(1.7, 1.5, 0.12), I, 'tetto', Mv @ T(0, 0, 1.75) @ R(0, 0.25), uv=1.6, radica=False, liscia=False)
    S.urto(Mv, 1.3, 1.1, 2.0)
    S.occupa(110.0, 0.5, 2.0)

    # ---------------------------------------------------------------- il posto di guardia al ponte e la bancarella
    I = 'ponte'
    Mgc = posa(ar + 19.0, 7.5, verso(0, -1))
    casa(S, Mgc, rnd, I, 5.4, 4.6, piani=1, copertura='tetto', alto_tetto=3.2, abbaino=False, zoccolo=1.6)
    for k in (-1, 1):
        braciere(S, posa(ar + 14.5, k * 3.3), I, 0.9)
        S.persona(posa(ar + 15.5, k * 2.6, math.pi / 2), 'guardia')
    bancarella(S, posa(ar + 26.0, -6.5, verso(0, 1)), rnd, I, (0.25, 0.4, 0.2), False, 'frutta')
    mucchio(S, posa(ar + 22.5, 9.5), rnd, I, 4, 1.0)

    # ---------------------------------------------------------------- le case del contado, lungo la strada sotto il colle
    I = 'contado'
    for (a, b, giro, scelte) in ((57.0, -13.5, 0.0, dict(piani=2, copertura='tegole', insegna_tinta=(0.85, 0.7, 0.25))), (58.5, 13.5, math.pi, dict(piani=2, timpano=True, copertura='tegole')),
                                 (27.0, 14.5, math.pi + 0.15, dict(piani=2, copertura='tetto'))):
        Mk = posa(a, b, giro + rnd.uniform(-0.06, 0.06))
        casa(S, Mk, rnd, I, rnd.uniform(6.8, 8.0), rnd.uniform(5.6, 6.4), zoccolo=2.2, **scelte)
        catasta(S, Mk @ T(rnd.choice((-1, 1)) * 5.2, 0.6, 0.0) @ R(math.pi / 2), rnd, I, 2.4, 4)
    staccionata(S, [(50, -21), (50, -30), (64, -30), (64, -21)], rnd, I, posa)
    for (a, b) in ((53, -6.5), (62, 7.0)):
        barile(S, posa(a, b), rnd, I)
    panca(S, posa(61.5, -8.6, 0.0), rnd, I)
    for (a, b) in ((55.0, -7.5), (60.5, 8.5), (30.0, 9.5)):
        S.persona(posa(a, b))

    # ---------------------------------------------------------------- il mulino a vento, su un rialzo a nord
    Mmu = posa(44.0, -62.0, verso(-0.3, 1))
    mulino(S, Mmu, rnd, 'mulino')
    sentiero(S, spline([(40, 0.5), (39, -18), (43, -38), (44.2, -57)], 1.0), 2.0, 'terra', 'strada', rnd, bordi=0.3)
    staccionata(S, [(33, -52), (33, -70), (55, -70), (55, -52), (47.5, -52)], rnd, 'mulino', posa)
    carro(S, posa(50.0, -58.0, 1.2), rnd, bare=False, insieme='mulino')
    S.persona(posa(41.5, -57.5))

    # ---------------------------------------------------------------- il campo d'allenamento, fuori le mura a nord della strada
    I = 'campo'
    recinto = [(8, -34), (8, -52), (30, -52), (30, -34), (21, -34)]
    staccionata(S, recinto, rnd, I, posa)
    for (a, b) in ((11, -49), (15, -49.5), (19, -49), (23, -49.5), (27, -49)):
        bersaglio(S, posa(a, b, verso(0, 1)), rnd, I)
        S.occupa(a, b, 1.5)
    for (a, b, g) in ((12, -39, 0.3), (18, -41, -0.4), (25, -38.5, 0.9)):
        fantoccio(S, posa(a, b, g), rnd, I)
        S.occupa(a, b, 1.5)
    panca(S, posa(28.5, -43.0, -math.pi / 2), rnd, I)
    S.persona(posa(14.0, -44.0))
    S.persona(posa(22.0, -45.0))
    for a in range(8, 31, 2):
        for b in range(-52, -33, 2):
            S.occupa(a, b, 1.4)

    # ---------------------------------------------------------------- l'accampamento dei viandanti, in una radura a sud
    I = 'accampamento'
    fuoco = (48.0, 36.0)
    fuoco_campo(S, posa(*fuoco), rnd, I, masso)
    for k, (an, tinta) in enumerate(((0.4, (0.8, 0.72, 0.55)), (2.2, (0.6, 0.3, 0.25)), (3.9, (0.4, 0.5, 0.6)), (5.3, (0.8, 0.72, 0.55)))):
        a, b = fuoco[0] + math.cos(an) * 7.5, fuoco[1] + math.sin(an) * 7.5
        tenda(S, posa(a, b, verso(fuoco[0] - a, fuoco[1] - b)), rnd, I, tinta, rnd.uniform(1.8, 2.3), rnd.uniform(2.7, 3.2))
    for an in (1.3, 3.0, 4.6):
        a, b = fuoco[0] + math.cos(an) * 2.6, fuoco[1] + math.sin(an) * 2.6
        S.metti(tubo([((-1.0, 0, 0.24), 0.26), ((1.0, 0, 0.24), 0.23)], 9, giri=2), I, 'corteccia', posa(a, b, an))
    mucchio(S, posa(fuoco[0] + 11.0, fuoco[1] + 2.0), rnd, I, 5, 1.3)
    carro(S, posa(fuoco[0] - 10.5, fuoco[1] + 5.0, 0.6), rnd, bare=False, insieme=I)
    sentiero(S, spline([(47, 4.0), (50, 14), (47, 26), (48, 32.5)], 1.0), 1.8, 'terra', 'strada', rnd, bordi=0.2)
    for a in range(36, 62, 2):
        for b in range(26, 48, 2):
            if math.hypot(a - fuoco[0], b - fuoco[1]) < 12.5:
                S.occupa(a, b, 1.4)

    # ---------------------------------------------------------------- massi sparsi nel bosco
    I = 'intorno'

    def libero(a, b):
        return math.hypot(a, b) < 112 and terra(a, b) > 0.4 and (math.floor((a + terreno.CX) / 2), math.floor((b + terreno.CZ) / 2)) not in S.occupati

    fatti = 0
    while fatti < 60:
        an, d = rnd.uniform(0, 6.28), 112 * math.sqrt(rnd.random())
        a, b = math.cos(an) * d, math.sin(an) * d
        if libero(a, b):
            fatti += 1
            masso(S, posa(a, b), rnd, I, rnd.choice((0.4, 0.5, 0.7, 0.9, 1.3, 1.7)))

    salva(S, 'castello_bosco', (112, 7.5), colore_terreno=(0.1, 0.16, 0.06))


if __name__ == '__main__':
    main()
