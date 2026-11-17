"""I pezzi del porto: le navi a vela ormeggiate, i moli di legno su pali, la banchina di pietra, la gru a ruota,
il faro, le reti stese, le bitte e le ancore. Le navi hanno la prua verso -y e l'origine al pelo dell'acqua."""
import math

import bmesh
from mathutils import Matrix, Vector

from attrezzi import R, T, cilindro, prisma, scatola, sfera, sgualcisci, tubo
from oggetti import corvo, lanterna
from paese import SCURO, barile, cassa, fusto, merli, sacco

CATRAME = (0.5, 0.42, 0.36)      # il fasciame scuro delle navi
CORDA = (0.5, 0.42, 0.28)


def _scafo(L, B, Hd, D, murata, stazioni=26, giro=9):
    """Il guscio di una nave: le sezioni da poppa (y=+L/2) a prua (y=-L/2), ognuna dalla chiglia al bordo.
    Restituisce la forma e, per ogni stazione, (y, mezza larghezza al ponte, quota del ponte)."""
    bm = bmesh.new()
    anelli, linea = [], []
    for i in range(stazioni + 1):
        t = i / stazioni
        y = L / 2 - t * L
        f = 0.74 + 0.26 * math.sin(min(1.0, t / 0.42) * math.pi / 2) if t < 0.42 else max(0.0, 1 - ((t - 0.42) / 0.58) ** 2.3) ** 0.62
        w = max(B / 2 * f, 0.02)
        h = Hd + 1.1 * max(0.0, 1 - t / 0.3) ** 2 + 1.0 * max(0.0, (t - 0.72) / 0.28) ** 2
        zk = -D + (h + murata + D) * max(0.0, (t - 0.84) / 0.16) ** 2.2
        cima = h + murata
        anello = []
        for j in range(-giro, giro + 1):
            s = abs(j) / giro
            x = math.copysign(w * math.sin(s * math.pi / 2) ** 0.7, j) if j else 0.0
            z = zk + (cima - zk) * (1 - math.cos(s * math.pi / 2)) ** 0.85
            anello.append(bm.verts.new((x, y, z)))
        anelli.append(anello)
        # mezza larghezza all'altezza del ponte (dove il fasciame incontra il tavolato)
        sp = math.acos(max(-1.0, min(1.0, 1 - ((h - zk) / (cima - zk)) ** (1 / 0.85)))) / (math.pi / 2) if cima > zk else 1.0
        linea.append((y, w * math.sin(sp * math.pi / 2) ** 0.7, h))
    for i in range(stazioni):
        for j in range(2 * giro):
            bm.faces.new((anelli[i][j], anelli[i + 1][j], anelli[i + 1][j + 1], anelli[i][j + 1]))
    bm.faces.new(anelli[0])   # lo specchio di poppa
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.003)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    return bm, linea


def _striscia(righe, sopra=True):
    """Una superficie tesa fra file di punti (il tavolato del ponte, l'interno della murata)."""
    bm = bmesh.new()
    vs = [[bm.verts.new(p) for p in riga] for riga in righe]
    for i in range(len(vs) - 1):
        for j in range(len(vs[i]) - 1):
            bm.faces.new((vs[i][j], vs[i][j + 1], vs[i + 1][j + 1], vs[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.normal_update()
    if bm.faces and (sum(f.normal.z for f in bm.faces) < 0) == sopra:
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    return bm


def albero_nave(S, M, rnd, I, alto, r=0.26, pennoni=2, coffa=True, lato_murata=3.0, bandiera=None, latina=False):
    """Un albero con i pennoni, le vele serrate (fagotti di tela legati), la coffa e le sartie fino alle murate."""
    S.metti(tubo([((0, 0, -1.0), r), ((0, 0, alto * 0.55), r * 0.82), ((0, 0, alto), r * 0.42)], 9, giri=1), I, 'legno', M, radica=False, tinta=(0.95, 0.8, 0.62))
    for z in (alto * 0.2, alto * 0.4):
        S.metti(cilindro(r * 1.08, r * 1.08, 0.08, 9, z0=z, tappi=False), I, 'ferro', M, radica=False)
    if latina:   # la vela latina di mezzana: un'antenna obliqua con la vela avvolta
        p0, p1 = Vector((0, 2.6, alto * 0.42)), Vector((0, -2.2, alto * 0.95))
        S.metti(tubo([(p0, 0.08), ((p0 + p1) / 2, 0.11), (p1, 0.06)], 6), I, 'legno', M, radica=False)
        S.metti(tubo([(p0.lerp(p1, t / 6) + Vector((0, 0.05, -0.16 - 0.1 * math.sin(t / 6 * math.pi))), 0.16 + 0.05 * math.sin(t * 2.1)) for t in range(7)], 7), I, 'tela', M, radica=False, tinta=(0.95, 0.92, 0.85))
    for k in range(pennoni):
        z = alto * (0.5 + 0.34 * k / max(1, pennoni - 1)) if pennoni > 1 else alto * 0.62
        mezzo = (lato_murata * 1.5) * (1 - 0.3 * k)
        S.metti(tubo([((-mezzo, -r - 0.1, z), 0.07), ((0, -r - 0.1, z), 0.12), ((mezzo, -r - 0.1, z), 0.07)], 6), I, 'legno', M, radica=False)
        pt = [((x, -r - 0.12, z - 0.22 - 0.07 * math.cos(x * 2.4)), 0.2 + 0.06 * math.sin(x * 3.1 + k)) for x in [(-mezzo * 0.93) + i * (mezzo * 1.86) / 10 for i in range(11)]]
        S.metti(tubo(pt, 7), I, 'tela', M, radica=False, tinta=(0.95, 0.92, 0.85))
        for i in range(1, 10, 2):   # le legature
            S.metti(cilindro(0.27, 0.27, 0.04, 6, z0=-0.02, tappi=False), I, 'colore', M @ T(pt[i][0][0], -r - 0.12, pt[i][0][2] + 0.03) @ R(0, 0, math.pi / 2), tinta=CORDA, radica=False)
        for s in (-1, 1):   # le braccia del pennone, fino in testa d'albero
            S.metti(tubo([((s * mezzo, -r - 0.1, z), 0.012), ((0, 0, min(alto, z + alto * 0.2)), 0.012)], 3, tappo=False), I, 'colore', M, tinta=CORDA, radica=False)
    if coffa:
        zc = alto * 0.66
        S.metti(cilindro(0.55, 0.75, 0.12, 10, z0=zc), I, 'legno', M, radica=False, tinta=SCURO)
        S.metti(cilindro(0.75, 0.8, 0.6, 10, z0=zc + 0.1, tappi=False), I, 'legno', M, uv=0.8, radica=False, tinta=SCURO)
    for s in (-1, 1):   # le sartie: tre cavi per lato, più le griselle (i pioli di corda)
        cima = Vector((0, 0, alto * 0.64))
        piedi = [Vector((s * lato_murata, dy, 0.9)) for dy in (-0.9, 0.0, 0.9)]
        for p in piedi:
            S.metti(tubo([(p, 0.018), (cima, 0.018)], 3, tappo=False), I, 'colore', M, tinta=CORDA, radica=False)
        for q in range(1, 9):
            t = q / 10
            S.metti(tubo([(piedi[0].lerp(cima, t), 0.01), (piedi[2].lerp(cima, t), 0.01)], 3, tappo=False), I, 'colore', M, tinta=CORDA, radica=False)
    if bandiera:
        S.metti(prisma([(0, 0), (1.5, 0.12), (0, 0.5)], 0.02), I, 'colore', M @ T(0, 0, alto + 0.05) @ R(1.2), tinta=bandiera, radica=False, liscia=False)
    S.urto_tondo(M, r + 0.05, 5.0)


def nave(S, M, rnd, I, lunga=24.0, larga=6.4, alberi=2, ponte=2.55, tinta=CATRAME, fascia=(0.62, 0.45, 0.2), bandiera=(0.6, 0.1, 0.1), passerella=None, accesa=True):
    """Una nave a vela all'ormeggio: lo scafo panciuto, il ponte, il cassero di poppa con le finestre accese, il
    castello di prua, il bompresso, gli alberi con le vele serrate, il fanale. `M` sta al pelo dell'acqua, con la
    prua verso -y; il ponte è `ponte` metri più su, e ci si può camminare. `passerella` (+1 o -1) mette l'asse per
    salire a bordo da quel lato."""
    L, B, D, mur = lunga, larga, 1.7, 0.95
    scafo, linea = _scafo(L, B, ponte, D, mur)
    S.metti(scafo, I, 'tavole', M, uv=1.6, tinta=tinta, radica=False)
    n = len(linea)
    # il ponte e l'interno delle murate
    S.metti(_striscia([[(-(w - 0.12), y, h), (0, y, h + 0.06), (w - 0.12, y, h)] for (y, w, h) in linea]), I, 'tavole', M, uv=1.6, tinta=(0.95, 0.9, 0.82), radica=False)
    for s in (-1, 1):
        S.metti(_striscia([[(s * (w - 0.14), y, h), (s * (w - 0.14 + 0.02), y, h + mur)] for (y, w, h) in linea], sopra=False), I, 'tavole', M, uv=1.6, tinta=tinta, radica=False)
        # il capodibanda (il corrimano in cima alla murata) e la fascia chiara lungo il fianco
        S.metti(tubo([((s * (w - 0.02), y, h + mur + 0.02), 0.09) for (y, w, h) in linea[:-1]], 5), I, 'legno', M, radica=False, tinta=SCURO)
        S.metti(tubo([((s * (w + 0.05), y, h - 0.25), 0.075) for (y, w, h) in linea[:-1]], 5), I, 'colore', M, radica=False, tinta=fascia)
    # la ruota di prua e il bompresso
    (yp, _, hp) = linea[-1]
    S.metti(tubo([((0, yp + 0.9, -D + 0.6), 0.16), ((0, yp + 0.15, hp * 0.5), 0.15), ((0, yp - 0.1, hp + mur + 0.5), 0.12)], 6), I, 'legno', M, radica=False, tinta=SCURO)
    bomp = [((0, yp + 1.6, hp + mur - 0.1), 0.17), ((0, yp - 2.2, hp + mur + 1.0), 0.13), ((0, yp - L * 0.2, hp + mur + 1.9), 0.07)]
    S.metti(tubo(bomp, 7), I, 'legno', M, radica=False, tinta=(0.95, 0.8, 0.62))
    # il cassero di poppa: un ponte rialzato con la paratia, la porta, due finestre; sullo specchio le finestre della cabina
    (y0, w0, h0) = linea[0]
    iq = max(2, int(n * 0.24))
    (yq, wq, hq) = linea[iq]
    zq = h0 + 0.15
    S.metti(_striscia([[(-(w - 0.1), y, zq), (w - 0.1, y, zq)] for (y, w, h) in linea[:iq + 1]]), I, 'tavole', M, uv=1.6, tinta=(0.95, 0.9, 0.82), radica=False)
    S.metti(scatola(2 * wq - 0.2, 0.14, zq - hq, z0=hq), I, 'tavole', M @ T(0, yq, 0), uv=1.6, tinta=tinta, radica=False, liscia=False)
    S.metti(scatola(0.8, 0.06, 1.55, z0=hq + 0.02), I, 'tavole', M @ T(0, yq - 0.08, 0), uv=0.9, tinta=(0.85, 0.7, 0.55), radica=False, liscia=False)
    for s in (-1, 1):
        if accesa:
            S.metti(scatola(0.55, 0.05, 0.5, z0=hq + 0.75), I, 'vetrata', M @ T(s * wq * 0.55, yq - 0.08, 0), uv=0.6, radica=False, liscia=False)
            S.luce(M, 'finestra', 0.6, (s * wq * 0.55, yq - 0.4, hq + 1.0))
        for i in range(0, iq + 1, 2):   # la ringhiera del cassero
            (y, w, h) = linea[i]
            S.metti(scatola(0.07, 0.07, 0.95, z0=zq), I, 'legno', M @ T(s * (w - 0.2), y, 0), radica=False, tinta=SCURO, liscia=False)
        S.metti(tubo([((s * (w - 0.2), y, zq + 0.95), 0.045) for (y, w, h) in linea[:iq + 1]], 5), I, 'legno', M, radica=False, tinta=SCURO)
    S.metti(tubo([((-(wq - 0.2), yq, zq + 0.95), 0.045), ((wq - 0.2, yq, zq + 0.95), 0.045)], 5), I, 'legno', M, radica=False, tinta=SCURO)
    for x in (-0.55, 0.55):   # le due scalette dal ponte al cassero
        for g in range(5):
            S.metti(scatola(0.7, 0.24, 0.05, z0=hq + (g + 1) * (zq - hq) / 6), I, 'legno', M @ T(x * wq * 1.25, yq - 0.2 - (5 - g) * 0.22, 0), uv=0.8, radica=False, liscia=False)
    for (x, largo) in ((-1.0, 0.7), (0.0, 0.8), (1.0, 0.7)):
        if accesa:
            S.metti(scatola(largo * w0 * 0.55, 0.05, 0.75, z0=h0 - 1.25), I, 'vetrata', M @ T(x * w0 * 0.52, y0 + 0.03, 0), uv=0.7, radica=False, liscia=False)
    if accesa:
        S.luce(M, 'finestra', 1.0, (0, y0 + 0.5, h0 - 0.9))
    S.metti(scatola(w0 * 1.7, 0.12, 0.14, z0=h0 - 0.35), I, 'colore', M @ T(0, y0 + 0.06, 0), radica=False, tinta=fascia, liscia=False)
    S.metti(scatola(w0 * 1.7, 0.12, 0.12, z0=h0 - 1.45), I, 'colore', M @ T(0, y0 + 0.06, 0), radica=False, tinta=fascia, liscia=False)
    # il fanale di poppa e il timone a ruota
    Mf = M @ T(0, y0 - 0.1, zq)
    S.metti(tubo([((0, 0, 0), 0.04), ((0, 0.25, 1.5), 0.035), ((0, 0.55, 2.0), 0.03)], 5), I, 'ferro', Mf, radica=False)
    S.metti(scatola(0.3, 0.3, 0.42, z0=2.0), I, 'luce', Mf @ T(0, 0.55, 0), radica=False, liscia=False)
    S.metti(cilindro(0.26, 0.04, 0.2, 6, z0=2.42), I, 'ferro', Mf @ T(0, 0.55, 0), radica=False, liscia=False)
    S.luce(Mf, 'lanterna', 1.3, (0, 0.55, 2.2))
    Mr = M @ T(0, yq + 1.5, zq)
    S.metti(scatola(0.16, 0.3, 0.95), I, 'legno', Mr, radica=False, tinta=SCURO)
    S.metti(tubo([((math.cos(t / 12 * math.tau) * 0.45, -0.2, 0.95 + math.sin(t / 12 * math.tau) * 0.45), 0.035) for t in range(13)], 4, tappo=False), I, 'legno', Mr, radica=False)
    for k in range(6):
        S.metti(scatola(1.15, 0.04, 0.04, z0=-0.02), I, 'legno', Mr @ T(0, -0.2, 0.95) @ R(0, 0, k / 6 * math.pi), radica=False, liscia=False)
    # il castello di prua
    ia = int(n * 0.8)
    (ya, wa, ha) = linea[ia]
    zp = ha + 0.75
    S.metti(_striscia([[(-(w - 0.1), y, zp), (w - 0.1, y, zp)] for (y, w, h) in linea[ia:-1]]), I, 'tavole', M, uv=1.6, tinta=(0.95, 0.9, 0.82), radica=False)
    S.metti(scatola(2 * wa - 0.2, 0.12, zp - ha, z0=ha), I, 'tavole', M @ T(0, ya, 0), uv=1.6, tinta=tinta, radica=False, liscia=False)
    # sul ponte: il boccaporto con la grata, l'argano, le merci, i rotoli di cima
    ym = L * 0.06
    S.metti(scatola(1.9, 2.4, 0.3, z0=ponte + 0.03), I, 'legno', M @ T(0, ym, 0), uv=0.8, tinta=SCURO, radica=False, liscia=False)
    for i in range(6):
        S.metti(scatola(1.7, 0.09, 0.05, z0=ponte + 0.33), I, 'legno', M @ T(0, ym - 1.0 + i * 0.4, 0), radica=False, liscia=False)
    Ma = M @ T(0, -L * 0.22, ponte + 0.04)
    S.metti(cilindro(0.34, 0.26, 0.85, 8), I, 'legno', Ma, radica=False, tinta=SCURO)
    for k in range(4):
        S.metti(tubo([((0, 0, 0.7), 0.035), ((math.cos(k * math.pi / 2 + 0.3) * 1.1, math.sin(k * math.pi / 2 + 0.3) * 1.1, 0.75), 0.03)], 4), I, 'legno', Ma, radica=False)
    for (x, y) in ((-B * 0.27, L * 0.16), (B * 0.25, L * 0.19), (B * 0.24, -L * 0.1), (-B * 0.26, -L * 0.14)):
        Mq = M @ T(x, y, ponte + 0.05) @ R(rnd.uniform(0, 6))
        if rnd.random() < 0.5:
            barile(S, Mq, rnd, I, urto=False, sciolto=False)
        else:
            cassa(S, Mq, rnd, I, rnd.uniform(0.6, 0.85), urto=False)
    for (x, y) in ((B * 0.2, L * 0.02), (-B * 0.22, -L * 0.03)):
        for g in range(3):
            S.metti(tubo([((math.cos(t / 10 * math.tau) * (0.34 - g * 0.03), math.sin(t / 10 * math.tau) * (0.34 - g * 0.03), g * 0.07), 0.04) for t in range(11)], 4, tappo=False), I, 'colore', M @ T(x, y, ponte + 0.08), tinta=CORDA, radica=False)
    # gli alberi
    lato = B / 2 - 0.25
    posti = {1: ((0.5, 0.62),), 2: ((0.42, 0.62), (0.72, 0.5)), 3: ((0.46, 0.66), (0.74, 0.54), (0.13, 0.4))}[alberi]
    for k, (t, quanto) in enumerate(posti):
        i = int(t * (n - 1))
        (y, w, h) = linea[i]
        base = zq if t < 0.24 else h
        albero_nave(S, M @ T(0, y, base), rnd, I, L * quanto, 0.3 - 0.05 * k, 2 if k < 2 else 0, coffa=k == 0, lato_murata=min(lato, w - 0.2), bandiera=bandiera if k == 0 else None, latina=k == 2)
    # gli stralli: dalla testa degli alberi al bompresso e a poppa
    (ym1, _, hm1) = linea[int(posti[0][0] * (n - 1))]
    testa = Vector((0, ym1, hm1 + L * posti[0][1]))
    for p in (Vector(bomp[2][0]), Vector((0, y0 - 0.3, zq + 1.0))):
        S.metti(tubo([(testa, 0.016), (p, 0.016)], 3, tappo=False), I, 'colore', M, tinta=CORDA, radica=False)
    # l'ancora appesa a prua
    Mn = M @ T(-wa * 0.8 - 0.25, ya - 0.5, ha - 0.4)
    S.metti(scatola(0.09, 0.09, 1.3, z0=-1.2), I, 'ferro', Mn, radica=False, liscia=False)
    S.metti(tubo([((0, -0.5, -0.85), 0.05), ((0, -0.3, -1.15), 0.06), ((0, 0, -1.22), 0.06), ((0, 0.3, -1.15), 0.06), ((0, 0.5, -0.85), 0.05)], 5), I, 'ferro', Mn, radica=False)
    # dove si cammina e dove no: il ponte, il cassero, il castello, le murate, il bompresso
    S.urto(M @ T(0, (linea[iq][0] + linea[ia][0]) / 2, 0), B - 0.5, abs(linea[iq][0] - linea[ia][0]), ponte + D + 1.0, -D - 1.0)
    S.urto(M @ T(0, (y0 + yq) / 2, 0), 2 * w0 - 0.3, abs(y0 - yq), zq + D + 1.0, -D - 1.0)
    S.urto(M @ T(0, (ya + linea[-3][0]) / 2, 0), 2 * linea[int(n * 0.9)][1], abs(ya - linea[-3][0]), zp + D + 1.0, -D - 1.0)
    for s in (-1, 1):
        if passerella == s:   # la murata si apre dove arriva l'asse
            S.urto(M @ T(s * (B / 2 - 0.1), L * 0.2, 0), 0.3, L * 0.22, mur + 0.3, ponte)
            S.urto(M @ T(s * (B / 2 - 0.1), -L * 0.17, 0), 0.3, L * 0.27, mur + 0.3, ponte)
        else:
            S.urto(M @ T(s * (B / 2 - 0.1), 0, 0), 0.3, L * 0.6, mur + 0.3, ponte)
    if passerella:
        s = passerella
        Mp = M @ T(s * (B / 2 + 1.3), L * 0.045, ponte + 0.02)
        S.metti(scatola(3.6, 1.1, 0.08, z0=0.0), I, 'tavole', Mp, uv=1.6, radica=False, liscia=False)
        for i in range(7):
            S.metti(scatola(0.06, 1.1, 0.03, z0=0.08), I, 'legno', Mp @ T(-1.5 + i * 0.5, 0, 0), radica=False, liscia=False, tinta=SCURO)
        S.urto(Mp, 3.6, 1.1, 0.3, -0.22)
    if passerella:   # due marinai di guardia sul ponte
        S.persona(M @ T(0.8, L * 0.12, ponte + 0.05))
        S.persona(M @ T(-0.9, -L * 0.13, ponte + 0.05))
    for i in (2, n // 2, n - 4):   # i parabordi di corda e le cime d'ormeggio
        (y, w, h) = linea[i]
        for s in (-1, 1):
            S.metti(sfera(0.24, 1, 0, 0, (0.7, 1, 1.3)), I, 'colore', M @ T(s * (w + 0.2), y, 0.5), tinta=CORDA, radica=False)
    return linea


# ------------------------------------------------------------------------------------------------ moli e banchina


def bitta(S, M, rnd, I, cima=True):
    """Un palo d'ormeggio con la cima avvolta."""
    S.metti(tubo([((0, 0, -0.4), 0.17), ((0, 0, 0.7), 0.16), ((0, 0, 0.82), 0.2), ((0, 0, 0.92), 0.14)], 8, giri=1), I, 'corteccia', M, radica=False)
    if cima:
        for g in range(3):
            S.metti(tubo([((math.cos(t / 9 * math.tau) * 0.2, math.sin(t / 9 * math.tau) * 0.2, 0.25 + g * 0.08), 0.035) for t in range(10)], 4, tappo=False), I, 'colore', M, tinta=CORDA, radica=False)
    S.urto_tondo(M, 0.2, 0.95)


def molo(S, M, rnd, I, lungo, largo=3.4, fondo=6.0, lampione=True):
    """Un molo di assi su pali, che parte da `M` (alla quota del tavolato) verso -y. `fondo` è quanto scendono i pali."""
    n = int(lungo / 0.31)
    for i in range(n):
        if rnd.random() < 0.03:
            continue
        S.metti(scatola(largo, 0.28, 0.07, smusso=0.008), I, 'tavole', M @ T(rnd.uniform(-0.05, 0.05), -(i + 0.5) * 0.31, rnd.uniform(-0.012, 0.012)) @ R(rnd.uniform(-0.03, 0.03)), uv=1.6, radica=False,
                tinta=(rnd.uniform(0.6, 0.9),) * 3)
    for i in range(int(lungo / 3.2) + 1):
        y = -min(lungo - 0.2, i * 3.2 + 0.3)
        for x in (-largo / 2 + 0.15, largo / 2 - 0.15):
            S.metti(tubo([((x, y, -fondo), 0.17), ((x * 1.02, y, 0.0), 0.15), ((x * 1.02, y, 0.55 if i % 2 == 0 else 0.1), 0.14)], 8, giri=1), I, 'corteccia', M, radica=False)
        S.metti(scatola(largo + 0.3, 0.16, 0.2, z0=-0.24), I, 'legno', M @ T(0, y, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
        S.metti(tubo([((-largo / 2 + 0.15, y, -0.4), 0.06), ((largo / 2 - 0.15, y, -2.4), 0.06)], 5), I, 'legno', M, radica=False, tinta=SCURO)
        if i % 2 == 1:
            bitta(S, M @ T((largo / 2 - 0.35) * (1 if i % 4 == 1 else -1), y, 0.03), rnd, I)
    for x in (-largo / 2 + 0.15, largo / 2 - 0.15):
        S.metti(scatola(0.18, lungo, 0.16, z0=-0.2), I, 'legno', M @ T(x, -lungo / 2, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
    S.urto(M @ T(0, -lungo / 2, 0), largo, lungo, 0.5, -0.46)
    if lampione:
        lanterna(S, M @ T(largo / 2 - 0.3, -lungo + 0.4, 0.03) @ R(math.pi / 2), rnd, I, 2.6, 1.1)
    corvo(S, M @ T(-largo / 2 + 0.15, -lungo + 0.2, 0.57), rnd, I)


def banchina(S, M, rnd, I, lunga, alta=6.2, spessa=1.6):
    """Un tratto del muro della banchina: grandi conci, la fascia d'alghe al pelo dell'acqua, il cordolo, gli anelli.
    `M` sta in cima al muro, a metà, con l'acqua verso -y."""
    S.metti(scatola(lunga, spessa, alta, z0=-alta, tagli=4, rumore=0.05, seme=rnd.random() * 99), I, 'muro', M @ T(0, spessa / 2, 0), uv=2.6, radica=False)
    S.metti(scatola(lunga, spessa + 0.25, 0.32, z0=-0.3, tagli=2, rumore=0.02, seme=rnd.random() * 99), I, 'pietra', M @ T(0, spessa / 2 - 0.1, 0), uv=1.6, radica=False)
    S.metti(scatola(lunga, 0.1, 1.5, z0=-3.6, tagli=2, rumore=0.03, seme=rnd.random() * 99), I, 'muschio', M @ T(0, -0.03, 0), uv=1.8, radica=False, tinta=(0.6, 0.75, 0.55))
    for i in range(int(lunga / 6)):
        x = -lunga / 2 + (i + 0.5) * 6
        S.metti(tubo([((math.cos(t / 8 * math.tau) * 0.16, -0.08, -0.9 + math.sin(t / 8 * math.tau) * 0.16), 0.03) for t in range(9)], 4, tappo=False), I, 'ferro', M @ T(x, 0, 0), radica=False)


def gru(S, M, rnd, I):
    """La gru del porto: un castello di travi con la ruota per sollevare, il braccio sull'acqua (verso -y) e una cassa appesa."""
    for (x, y) in ((-1.2, -1.0), (1.2, -1.0), (1.2, 1.4), (-1.2, 1.4)):
        S.metti(scatola(0.24, 0.24, 6.0, smusso=0.02), I, 'legno', M @ T(x * (1 - 0.0), y, 0), uv=0.9, tinta=SCURO)
    for z in (2.0, 4.0, 5.9):
        for g in range(4):
            S.metti(scatola(2.6 if g % 2 == 0 else 2.64, 0.16, 0.18, z0=z), I, 'legno', M @ T(0, 0.2, 0) @ R(g * math.pi / 2) @ T(0, -1.2, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
    for (x0, x1, lato) in ((-1.2, 1.2, -1.0), (1.2, -1.2, 1.4)):
        S.metti(tubo([((x0, lato, 0.2), 0.07), ((x1, lato, 3.9), 0.07)], 5), I, 'legno', M, radica=False, tinta=SCURO)
    S.metti(prisma([(-1.7, 0), (1.7, 0), (0, 1.4)], 3.4), I, 'tetto', M @ T(0, 0.2, 6.1) @ R(math.pi / 2), uv=2.0, radica=False, liscia=False)
    braccio = [((0, 1.2, 4.2), 0.16), ((0, -1.5, 6.3), 0.14), ((0, -5.2, 8.6), 0.1)]
    S.metti(tubo(braccio, 7), I, 'legno', M, radica=False, tinta=(0.95, 0.8, 0.62))
    S.metti(tubo([((0, -5.2, 8.6), 0.02), ((0, -5.2, 3.2), 0.02)], 4), I, 'colore', M, tinta=CORDA, radica=False)
    S.metti(tubo([((0, -5.2, 8.6), 0.02), ((0, 0.2, 3.3), 0.02)], 4), I, 'colore', M, tinta=CORDA, radica=False)
    Mc = M @ T(0, -5.2, 2.3) @ R(0.4)
    cassa(S, Mc, rnd, I, 0.95, urto=False)
    for (x, y) in ((-0.45, -0.45), (0.45, -0.45), (0.45, 0.45), (-0.45, 0.45)):
        S.metti(tubo([((x, y, 0.85), 0.012), ((0, 0, 1.45), 0.012)], 3, tappo=False), I, 'colore', Mc, tinta=CORDA, radica=False)
    # la ruota a gabbia in cui cammina chi solleva
    Mr = M @ T(0, 0.2, 2.9)
    for x in (-0.55, 0.55):
        S.metti(tubo([((x, math.cos(t / 16 * math.tau) * 1.25, math.sin(t / 16 * math.tau) * 1.25), 0.05) for t in range(17)], 4, tappo=False), I, 'legno', Mr, radica=False)
        for k in range(4):
            S.metti(scatola(0.05, 2.5, 0.06, z0=-0.03), I, 'legno', Mr @ T(x, 0, 0) @ R(0, k / 4 * math.pi), radica=False, liscia=False)
    for t in range(16):
        S.metti(scatola(1.15, 0.2, 0.03, z0=-0.015), I, 'legno', Mr @ R(0, t / 16 * math.tau) @ T(0, 1.25, 0), uv=0.8, radica=False, liscia=False)
    S.metti(tubo([((-1.3, 0, 0), 0.08), ((1.3, 0, 0), 0.08)], 6), I, 'legno', Mr, radica=False, tinta=SCURO)
    S.urto(M @ T(0, 0.2, 0), 2.8, 2.8, 6.5)
    S.occupa(M.translation.x, -M.translation.y, 3.2)


def faro(S, M, rnd, I, r=2.6, alta=13.0):
    """Il faro in fondo al molo di pietra: una torre tonda con il ballatoio, la gabbia di ferro e il fuoco in cima."""
    S.metti(fusto(r * 1.25, r, alta + 5.0, 16, z0=-5.0, seme=rnd.random() * 99, fasce=8), I, 'muro', M, uv=2.2, tinta=(1.25, 1.22, 1.2), radica=False)
    S.metti(fusto(r + 0.7, r + 0.7, 0.4, 16, z0=alta - 0.1, rumore=0.02, fasce=1), I, 'pietra', M, uv=1.4, radica=False)
    for k in range(12):
        S.metti(scatola(0.3, 0.7, 0.5), I, 'pietra', M @ R(k / 12 * math.tau) @ T(0, -r - 0.25, alta - 0.6), uv=1.2, radica=False)
        S.metti(scatola(0.05, 0.05, 1.0, z0=alta + 0.3), I, 'ferro', M @ R((k + 0.5) / 12 * math.tau) @ T(0, -r - 0.55, 0), radica=False, liscia=False)
    S.metti(tubo([((math.cos(t / 16 * math.tau) * (r + 0.55), math.sin(t / 16 * math.tau) * (r + 0.55), alta + 1.3), 0.035) for t in range(17)], 4, tappo=False), I, 'ferro', M, radica=False)
    S.metti(fusto(r * 0.55, r * 0.5, 1.2, 10, z0=alta + 0.3, rumore=0.015, fasce=1), I, 'muro', M, uv=1.6, radica=False)
    for k in range(8):   # la gabbia della lanterna
        S.metti(scatola(0.07, 0.07, 2.0, z0=alta + 1.5), I, 'ferro', M @ R(k / 8 * math.tau) @ T(0, -r * 0.5, 0), radica=False, liscia=False)
    S.metti(sfera(0.75, 2, 0.15, 3.0, (1, 1, 1.25), z0=alta + 2.4), I, 'luce', M, radica=False)
    tetto = cilindro(r * 0.72, 0.05, 1.5, 8, z0=alta + 3.5)
    S.metti(tetto, I, 'tetto', M, uv=1.6, radica=False, liscia=False)
    S.metti(scatola(0.06, 0.06, 1.0, z0=alta + 5.0), I, 'ferro', M, radica=False, liscia=False)
    S.luce(M, 'faro', 1.0, (0, 0, alta + 2.5))
    for i, zf in enumerate((3.0, 7.0, 10.5)):
        Mf = M @ R(i * 2.3 + 0.6) @ T(0, -r * (1.25 - 0.25 * (zf + 5.0) / (alta + 5.0)) - 0.05, zf)
        S.metti(scatola(0.5, 0.06, 1.1), I, 'vetrata', Mf, uv=0.8, radica=False, liscia=False)
        S.luce(Mf, 'finestra', 0.7, (0, -0.3, 0.55))
    S.urto_tondo(M, r * 1.2, alta + 3.0)


def rete_stesa(S, M, rnd, I, lunga=4.5):
    """Una rete da pesca stesa ad asciugare fra pali, con i galleggianti."""
    for x in (-lunga / 2, 0, lunga / 2):
        S.metti(tubo([((x, 0, -0.2), 0.05), ((x + rnd.uniform(-0.05, 0.05), 0, 2.1), 0.04)], 5), I, 'legno', M, radica=False)
    S.metti(tubo([((-lunga / 2, 0, 2.05), 0.02), ((0, 0, 1.95), 0.02), ((lunga / 2, 0, 2.05), 0.02)], 4), I, 'colore', M, tinta=CORDA, radica=False)
    for i in range(int(lunga / 0.3) + 1):
        x = -lunga / 2 + i * 0.3
        S.metti(tubo([((x, 0, 2.0), 0.008), ((x + 0.12, 0.02, 1.1), 0.008), ((x, 0.05, 0.25), 0.008)], 3, tappo=False), I, 'colore', M, tinta=(0.3, 0.33, 0.3), radica=False)
    for z in (1.6, 1.2, 0.8, 0.45):
        S.metti(tubo([((-lunga / 2, 0.01, z), 0.008), ((0, 0.03, z - 0.06), 0.008), ((lunga / 2, 0.01, z), 0.008)], 3, tappo=False), I, 'colore', M, tinta=(0.3, 0.33, 0.3), radica=False)
    for i in range(6):
        S.metti(sfera(0.08, 1), I, 'colore', M @ T(-lunga / 2 + (i + 0.5) * lunga / 6, 0.03, 0.3), tinta=(0.75, 0.3, 0.15), radica=False)


def ancora(S, M, rnd, I):
    """Una vecchia ancora appoggiata a terra."""
    Ma = M @ R(0, 0, 1.25)
    S.metti(scatola(0.12, 0.12, 2.0), I, 'ferro', Ma, radica=False, liscia=False)
    S.metti(tubo([((-0.75, 0, 0.55), 0.06), ((-0.5, 0, 0.15), 0.08), ((0, 0, 0.0), 0.09), ((0.5, 0, 0.15), 0.08), ((0.75, 0, 0.55), 0.06)], 5), I, 'ferro', Ma, radica=False)
    S.metti(tubo([((0, -0.6, 1.8), 0.05), ((0, 0.6, 1.8), 0.05)], 5), I, 'legno', Ma, radica=False)
    S.metti(tubo([((math.cos(t / 8 * math.tau) * 0.14, 0, 2.1 + math.sin(t / 8 * math.tau) * 0.14), 0.025) for t in range(9)], 4, tappo=False), I, 'ferro', Ma, radica=False)
