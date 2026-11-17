"""Costruisce con Blender le Rovine del Cristallo e le salva per il gioco (vedi salva.py).

    cd strumenti/scene && python rovine.py

È il posto di prova dello stile disegnato, fatto sull'immagine di riferimento del fondatore: il viale lastricato, il
ponte di pietra con le lanterne sopra il fiume turchese, gli archi in rovina con gli stendardi viola, la corte con la
sfera armillare, la sala dell'accademia, la torre sulla rupe con il grande cristallo, l'acquedotto, la cascata.
Le materie sono dipinte dal codice (dipingi.py), niente fotografie. I posti sono in metri dal centro: `a` verso est,
`b` verso sud. Si arriva da sud.
"""
import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import bpy  # noqa: E402  (va importato prima di bmesh)

import terreno  # noqa: E402

terreno.scegli('rovine')

from attrezzi import R, T, Scena, cilindro, posa, verso  # noqa: E402
from edifici import finestra, sentiero, spline  # noqa: E402
from incanto import (MUSCHIO, PIETRA, acquedotto, arco_rovina, cascata, colonna, cristalli, cristallo, maceria, pilastro_lanterna, rupe, sala,  # noqa: E402
                     sfera_armillare, torre_cristallo)
from paese import ponte_pietra  # noqa: E402
from salva import salva  # noqa: E402
from terreno import terra  # noqa: E402


def main():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    S = Scena()
    rnd = random.Random(4242)

    # ---------------------------------------------------------------- il viale, il ponte, la corte
    I = 'viale'
    sud = spline([(5, 116), (-3, 100), (2, 84), (0, 70), (0, 64.6)], 1.0)
    nord = spline([(0, 42.4), (0.6, 34), (0, 25.5)], 1.0)
    alla_sala = spline([(0.5, -1.5), (3.5, -7), (6, -12.2)], 1.0)
    for pt in (sud, nord, alla_sala):
        sentiero(S, pt, 4.6, 'lastre', I, rnd, bordi=0.0, gradini=False)
    quota_ponte = max(terra(0, 43.0), terra(0, 64.2)) + 0.14
    ponte_pietra(S, T(0, -53.5, quota_ponte) @ R(math.pi / 2), rnd, 'ponte', 21.6, 5.4, quota_ponte + 1.3, 3, materia='blocchi', lastrico='lastre', tinta=PIETRA, cima=MUSCHIO, uv_muro=3.4)
    for b in range(42, 66, 2):
        S.occupa(0, b, 3.8)
    corte = (0.0, 12.0)
    S.metti(cilindro(13.5, 13.5, 0.14, 40, z0=-0.05), I, 'lastre', posa(*corte, 0.2), uv=2.6, radica=False, tinta=PIETRA)
    for i in range(-15, 16, 2):
        for j in range(-4, 28, 2):
            if math.hypot(i, j - 12) < 15.5:
                S.occupa(i, j, 1.6)
    sfera_armillare(S, posa(*corte, 0.3), 'corte')
    for k in range(4):   # quattro ciuffi di cristalli attorno al basamento
        an = k / 4 * math.tau + 0.78
        cristalli(S, posa(corte[0] + math.cos(an) * 4.6, corte[1] + math.sin(an) * 4.6), rnd, 'corte', 3, 1.3, 0.5, 0.7)
    # i pilastri con la lanterna: lungo il viale, ai capi del ponte, all'ingresso della corte
    for i, b in enumerate((109, 96, 83, 71)):
        lato = 1 if i % 2 else -1
        a = sud[min(len(sud) - 1, max(0, int(116 - b)))][0] + lato * 3.5
        pilastro_lanterna(S, posa(a, b), rnd, I)
    for (a, b) in ((-3.9, 41.0), (3.9, 41.0), (-4.6, 26.0), (4.6, 26.0), (-2.4, -11.0), (10.6, -11.0)):
        pilastro_lanterna(S, posa(a, b), rnd, I, 1.7)

    # ---------------------------------------------------------------- le rovine attorno alla corte
    I = 'rovine'
    arco_rovina(S, posa(-21.5, 38.0, 0.3), rnd, I, 5.4, 9.0, rotto=True, bandiera=True)       # il grande arco spezzato, a sinistra del viale
    arco_rovina(S, posa(-29.0, 15.0, 1.25), rnd, I, 4.6, 7.4, bandiera=True)
    arco_rovina(S, posa(-23.0, -6.0, 1.9), rnd, I, 4.2, 6.6)
    for (a, b, g, rotto) in ((23.5, 41.0, -0.75, False), (32.5, 32.5, -0.75, False), (41.0, 23.5, -0.8, True)):   # il porticato di destra, verso la cascata
        arco_rovina(S, posa(a, b, g), rnd, I, 4.8, 7.6, rotto=rotto, bandiera=a < 25)
    for k in range(10):   # le colonne attorno alla corte, qualcuna spezzata
        an = k / 10 * math.tau + 0.31
        a, b = corte[0] + math.cos(an) * 18.0, corte[1] + math.sin(an) * 18.0
        if abs(a) < 4.5 or (a > 0 and -14 < b < -4):   # non in mezzo al viale né davanti alla sala
            continue
        colonna(S, posa(a, b, an), rnd, I, rnd.uniform(4.6, 5.6), 0.46, rotta=k % 3 == 1)
    for (a, b) in ((-12, 46), (14, 44), (-34, 28), (36, 14), (-16, -10), (28, 50), (-30, 46)):
        maceria(S, posa(a, b, rnd.uniform(0, 6)), rnd, I, rnd.randint(3, 6), 2.4)
        S.occupa(a, b, 2.6)
    for (a, b, alto) in ((-17.5, 35.5, 1.5), (27.0, 37.5, 1.2), (-26.0, 18.5, 1.1), (11.5, 68.5, 1.0), (-9.0, 69.0, 1.3), (19.0, -2.0, 1.2), (-11.0, 30.0, 0.9)):
        cristalli(S, posa(a, b), rnd, I, rnd.randint(3, 5), alto, 0.6, 0.7)

    # ---------------------------------------------------------------- la sala dell'accademia
    sala(S, posa(6.0, -20.0, 0.0, 0.25), rnd, 'sala', finestra)

    # ---------------------------------------------------------------- la torre sulla rupe, con il grande cristallo
    I = 'torre'
    centro = (-14.0, -64.0)
    torre_cristallo(S, posa(*centro, verso(14, 72)), rnd, I)
    for k in range(13):   # i roccioni della rupe
        an = k / 13 * math.tau + 0.2
        d = rnd.uniform(8.5, 17.0)
        a, b = centro[0] + math.cos(an) * d, centro[1] + math.sin(an) * d
        rupe(S, posa(a, b, 0, -1.0), rnd, I, rnd.uniform(2.2, 3.8))
    for (a, b) in ((-5.0, -52.0), (-23.5, -55.0), (-9.0, -76.0)):
        cristalli(S, posa(a, b), rnd, I, 4, 1.8, 0.8, 0.9)

    # ---------------------------------------------------------------- l'altopiano, l'acquedotto, la cascata
    I = 'cascata'
    acquedotto(S, (57.0, -60.0), (1.0, -62.0), 21.6, rnd, I)
    acquedotto(S, (64.0, -58.0), (64.0, -8.5), 21.6, rnd, I, 8.2)
    cascata(S, T(64.0, 7.4, 21.9), I, 4.6, 22.4, 11.5)
    for k in range(13):   # la parete a picco verso la corte: roccioni lungo i due fianchi dell'altopiano
        b = -104 + k * 8.2 + rnd.uniform(-1.5, 1.5)
        rupe(S, posa(50.5 + rnd.uniform(-2.5, 2.0), b, 0, -1.5), rnd, I, rnd.uniform(3.0, 4.6), rnd.uniform(6.0, 11.0))
    for k in range(8):
        a = 72.5 + k * 6.4 + rnd.uniform(-1.2, 1.2)
        rupe(S, posa(a, -2.5 + rnd.uniform(-2.0, 1.5), 0, -1.5), rnd, I, rnd.uniform(3.0, 4.4), rnd.uniform(6.0, 11.0))
    rupe(S, posa(56.5, -1.5, 0, -1.5), rnd, I, 3.6, 10.0)
    for (a, b) in ((55.5, 14.5), (72.5, 12.0), (60.0, 19.5), (68.0, 19.0)):   # i sassi attorno alla pozza, e i cristalli nella schiuma
        rupe(S, posa(a, b, 0, -0.6), rnd, I, rnd.uniform(1.2, 2.0), rnd.uniform(1.4, 2.6))
    cristalli(S, posa(57.5, 10.0), rnd, I, 4, 1.6, 0.7, 0.9)
    cristalli(S, posa(71.0, 16.5), rnd, I, 3, 1.2, 0.6, 0.8)
    cristalli(S, posa(76.0, -24.0), rnd, I, 5, 2.4, 1.0, 1.0)      # sull'altopiano

    # ---------------------------------------------------------------- lungo il fiume e sul laghetto
    I = 'fiume'
    for (a, b, r) in ((-12.0, 45.0, 1.6), (17.0, 62.5, 1.8), (-36.0, 61.5, 2.2), (-44.0, 45.5, 1.7), (36.0, 58.5, 2.0), (48.0, 43.0, 1.6), (-62.0, 49.0, 2.4), (-70.0, 72.0, 2.0)):
        rupe(S, posa(a, b, 0, -0.7), rnd, I, r, r * rnd.uniform(0.8, 1.3))
    for (a, b) in ((-66.0, 47.5), (-76.5, 78.0), (-101.0, 52.0)):
        cristalli(S, posa(a, b), rnd, I, 4, 1.5, 0.7, 0.9)
    colonna(S, posa(-79.0, 66.0), rnd, I, 5.0, 0.5, rotta=True)
    colonna(S, posa(-94.0, 73.0, 0.6), rnd, I, 5.2, 0.5)
    arco_rovina(S, posa(-74.0, 41.5, 0.5), rnd, I, 4.4, 6.8, rotto=True)

    # ---------------------------------------------------------------- roccioni sparsi nel bosco
    I = 'intorno'

    def libero(a, b):
        return math.hypot(a, b) < 112 and 0.4 < terra(a, b) < 9.0 and (math.floor((a + terreno.CX) / 2), math.floor((b + terreno.CZ) / 2)) not in S.occupati

    fatti = 0
    while fatti < 26:
        an, d = rnd.uniform(0, 6.28), 112 * math.sqrt(rnd.random())
        a, b = math.cos(an) * d, math.sin(an) * d
        if libero(a, b):
            fatti += 1
            rupe(S, posa(a, b, 0, -0.5), rnd, I, rnd.uniform(0.8, 2.2))

    salva(S, 'rovine_cristallo', (4.5, 112.0), colore_terreno=(0.1, 0.2, 0.16))


if __name__ == '__main__':
    main()
