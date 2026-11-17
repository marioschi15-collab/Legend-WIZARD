"""I pezzi con cui si costruiscono i paesi: la casa a graticcio (pietra sotto, travi e intonaco sopra), la torre
tonda con il tetto a cono, le mura merlate, e gli oggetti di tutti i giorni (barili, casse, bancarelle, cataste).
Ogni edificio ha il davanti verso -y. Con `neve=True` tetti, davanzali e cornici si coprono di neve."""
import math

import bmesh
from mathutils import Matrix, Vector

import terreno
from attrezzi import R, T, arco, carta, cilindro, prisma, scatola, sfera, sgualcisci, tubo

SCURO = (0.85, 0.7, 0.58)        # il legno delle travi, scurito dal tempo
BUIO = (0.03, 0.035, 0.05)       # una finestra spenta
BIANCO = (1.0, 1.0, 1.0)


# ------------------------------------------------------------------------------------------------ pezzi di casa


def tetto(lungo, largo, alto, sporge=0.45, curva=1.15, passi=5, spesso=0.0, dz=0.0, testa=0.8, rovescia=False):
    """Un tetto a due falde con il colmo lungo x, appena svasato in gronda. Con `spesso` diventa una coltre (la
    neve): la stessa forma, alzata e con il bordo che scende a chiudere."""
    pr = [((largo / 2 + sporge) * (1 - i / passi) ** curva, alto * i / passi + dz) for i in range(passi + 1)]
    l = lungo / 2 + sporge * testa
    bm = bmesh.new()
    n = passi + 1
    vs = []
    for sx in (-l, l):
        for s in (-1, 1):
            for (w, h) in pr:
                vs.append(bm.verts.new((sx, s * w, h)))
    for s in (0, 1):
        for i in range(passi):
            a, b = s * n + i, 2 * n + s * n + i
            bm.faces.new((vs[a], vs[b], vs[b + 1], vs[a + 1]) if s == 0 else (vs[a], vs[a + 1], vs[b + 1], vs[b]))
    for t in (0, 1):
        base = t * 2 * n
        for i in range(passi):
            q = (vs[base + i], vs[base + i + 1], vs[base + n + i + 1], vs[base + n + i])
            bm.faces.new(q if t == 0 else tuple(reversed(q)))
    if spesso > 0:   # il bordo della coltre: una fascia che scende tutt'intorno
        orlo = [vs[0], vs[2 * n], vs[3 * n], vs[n]]
        sotto = [bm.verts.new(v.co + Vector((0, 0, -spesso))) for v in orlo]
        for i in range(4):
            j = (i + 1) % 4
            bm.faces.new((orlo[i], orlo[j], sotto[j], sotto[i]))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.001)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if rovescia:   # visto da sotto: è il soffitto della gronda
        bmesh.ops.reverse_faces(bm, faces=list(bm.faces))
    return bm


def arco_tondo(larga, alta, quanti=5):
    """I punti di un'apertura con l'arco ribassato in cima, dal piede sinistro al piede destro."""
    imposta = alta - larga * 0.4
    pt = [(-larga / 2, 0.0)]
    for i in range(quanti * 2 + 1):
        t = math.pi - i / (quanti * 2) * math.pi
        pt.append((math.cos(t) * larga / 2, imposta + math.sin(t) * (alta - imposta)))
    pt.append((larga / 2, 0.0))
    return pt


def trave(S, I, M, x0, z0, x1, z1, sez=0.17, sporge=0.05, tinta=SCURO):
    """Una trave sulla faccia di un muro (la faccia guarda verso -y), da (x0, z0) a (x1, z1)."""
    lungo = math.hypot(x1 - x0, z1 - z0)
    bm = scatola(lungo + sez * 0.5, sporge * 2, sez, z0=-sez / 2)
    bm.normal_update()
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.normal.y > 0.9], context='FACES')   # la faccia contro il muro non si vede mai
    S.metti(bm, I, 'legno', M @ T((x0 + x1) / 2, 0, (z0 + z1) / 2) @ R(0, 0, -math.atan2(z1 - z0, x1 - x0)), uv=0.9, tinta=tinta, radica=False, liscia=False)


def facce(M, w, d, z=0.0):
    """Le quattro facce di un corpo largo w e fondo d: per ognuna la matrice (con il fuori verso -y) e la larghezza."""
    return [(M @ T(0, -d / 2, z), w), (M @ T(w / 2, 0, z) @ R(math.pi / 2), d), (M @ T(0, d / 2, z) @ R(math.pi), w), (M @ T(-w / 2, 0, z) @ R(-math.pi / 2), d)]


def finestra_quadra(S, M, I, rnd, larga=0.9, alta=1.1, accesa=True, imposte=True, neve=False, forza=0.8):
    """Una finestra rettangolare con il telaio di legno, la grata a rombi, le imposte aperte e il davanzale."""
    if accesa:
        S.metti(carta(larga, alta, 0, 0, 1, 1, -0.05), I, 'vetrata', M, radica=False, liscia=False)
        S.luce(M, 'finestra', forza, (0, -0.3, alta * 0.5))
    else:
        S.metti(carta(larga, alta, 0, 0, 1, 1, -0.05), I, 'colore', M, tinta=BUIO, radica=False, liscia=False)
    for x in (-larga / 2, larga / 2):
        trave(S, I, M, x, -0.04, x, alta + 0.04, 0.09, 0.08)
    trave(S, I, M, -larga / 2 - 0.08, alta, larga / 2 + 0.08, alta, 0.1, 0.09)
    S.metti(scatola(larga + 0.3, 0.2, 0.08, z0=-0.09), I, 'legno', M @ T(0, -0.07, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
    if not accesa or larga > 1.0:
        trave(S, I, M, 0, 0, 0, alta, 0.05, 0.065)
    if imposte:
        for k in (-1, 1):
            if rnd.random() < 0.85:
                S.metti(scatola(larga / 2, 0.035, alta), I, 'legno', M @ T(k * (larga / 2 + larga / 4 + 0.03), -0.06, 0) @ R(k * rnd.uniform(-0.25, 0.05)), uv=0.6,
                        tinta=rnd.choice(((0.55, 0.7, 0.6), (0.7, 0.5, 0.42), (0.5, 0.58, 0.72), (0.62, 0.55, 0.45))), radica=False, liscia=False)
    if neve:
        S.metti(scatola(larga + 0.34, 0.24, 0.09, z0=-0.02, tagli=1, rumore=0.025, seme=rnd.random() * 9), I, 'neve', M @ T(0, -0.08, 0), uv=1.2, radica=False)


def porta(S, M, I, rnd, larga=1.15, alta=2.15, lanterna=True):
    """Una porta di assi ad arco ribassato, con la cornice di pietra, le bande di ferro, il gradino e la lanterna a muro."""
    sagoma = arco_tondo(larga, alta)
    S.metti(prisma(sagoma, 0.12), I, 'tavole', M @ T(0, 0.02, 0), uv=0.9, tinta=(0.8, 0.66, 0.52), radica=False, liscia=False)
    S.metti(tubo([((x, 0, z), 0.1) for (x, z) in arco_tondo(larga + 0.2, alta + 0.1)], 4, tappo=False), I, 'pietra', M @ T(0, -0.02, 0), radica=False)
    for z in (0.45, 1.45):
        S.metti(scatola(larga - 0.12, 0.03, 0.08, z0=z), I, 'ferro', M @ T(0, -0.06, 0), radica=False, liscia=False)
    S.metti(sfera(0.045, 1), I, 'ferro', M @ T(larga * 0.32, -0.1, 1.0), radica=False)
    S.metti(scatola(larga + 0.7, 0.75, 0.2, tagli=1, rumore=0.015, seme=rnd.random() * 9), I, 'pietra', M @ T(0, -0.4, -0.16), uv=1.2)
    if lanterna:
        lume(S, M @ T(larga / 2 + 0.45, -0.05, alta - 0.25), I)


def lume(S, M, I, forza=0.9):
    """Una lanterna appesa a un braccio di ferro che esce dal muro (il muro guarda verso -y)."""
    S.metti(tubo([((0, 0.05, 0.3), 0.02), ((0, -0.28, 0.34), 0.018), ((0, -0.42, 0.26), 0.015)], 5), I, 'ferro', M, radica=False)
    Ml = M @ T(0, -0.42, 0)
    S.metti(scatola(0.012, 0.012, 0.1, z0=0.16), I, 'ferro', Ml, radica=False, liscia=False)
    S.metti(scatola(0.17, 0.17, 0.2, z0=-0.05), I, 'luce', Ml, radica=False, liscia=False)
    cappello = cilindro(0.17, 0.02, 0.1, 4, z0=0.15)
    bmesh.ops.rotate(cappello, verts=cappello.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(cappello, I, 'ferro', Ml, radica=False, liscia=False)
    S.metti(scatola(0.2, 0.2, 0.02, z0=-0.07), I, 'ferro', Ml, radica=False, liscia=False)
    S.luce(Ml, 'lanterna', forza, (0, 0, 0.05))


def insegna(S, M, I, rnd, tinta=(0.75, 0.3, 0.2)):
    """Un'insegna di legno dipinta che pende da un braccio di ferro (il muro guarda verso -y)."""
    S.metti(tubo([((0, 0.05, 0.75), 0.022), ((0, -1.05, 0.75), 0.018)], 5), I, 'ferro', M, radica=False)
    S.metti(tubo([((0, 0.05, 0.3), 0.015), ((0, -0.6, 0.74), 0.015)], 4), I, 'ferro', M, radica=False)
    Mi = M @ T(0, -0.6, 0) @ R(0, 0, rnd.uniform(-0.08, 0.08))
    for y in (-0.3, 0.3):
        S.metti(scatola(0.012, 0.012, 0.16, z0=0.58), I, 'ferro', Mi @ T(0, y, 0), radica=False, liscia=False)
    S.metti(scatola(0.05, 0.8, 0.56, z0=0.02, smusso=0.01), I, 'legno', Mi, uv=0.8, tinta=SCURO, radica=False, liscia=False)
    for k in (-1, 1):   # il disegno: un tondo colorato sulle due facce
        S.metti(cilindro(0.19, 0.19, 0.012, 10), I, 'colore', Mi @ T(k * 0.032, 0, 0.3) @ R(0, 0, math.pi / 2), tinta=tinta, radica=False, liscia=False)


def camino(S, M, I, rnd, alto=2.2, neve=False, fuma=True):
    S.metti(scatola(0.85, 0.85, alto, tagli=2, rumore=0.025, seme=rnd.random() * 9), I, 'muro', M, uv=1.8, radica=False)
    S.metti(scatola(1.05, 1.05, 0.16, z0=alto, tagli=1, rumore=0.012), I, 'pietra', M, uv=1.2, radica=False)
    S.metti(scatola(0.5, 0.5, 0.3, z0=alto + 0.16), I, 'colore', M, tinta=(0.5, 0.26, 0.18), radica=False, liscia=False)
    if neve:
        S.metti(scatola(1.1, 1.1, 0.12, z0=alto + 0.14, tagli=2, rumore=0.04, seme=rnd.random() * 9), I, 'neve', M @ T(0.05, 0.05, 0), uv=1.2, radica=False)
    if fuma:
        S.luce(M, 'fumo', 1.0, (0, 0, alto + 0.7))


def ghiaccioli(S, M, I, rnd, lungo, quanti=None):
    """Una fila di ghiaccioli che pendono lungo x, sotto una gronda."""
    for _ in range(quanti or int(lungo * 1.6)):
        h = rnd.uniform(0.15, 0.6)
        g = cilindro(0.0, rnd.uniform(0.02, 0.045), h, 4, z0=-h)
        S.metti(g, I, 'ghiaccio', M @ T(rnd.uniform(-lungo / 2, lungo / 2), 0, 0), radica=False, liscia=False)


def cumulo_neve(S, M, I, rnd, r=0.8, schiaccia=0.35):
    S.metti(sfera(r, 2, 0.22, rnd.random() * 99, (rnd.uniform(0.9, 1.5), rnd.uniform(0.8, 1.2), schiaccia), z0=r * schiaccia * 0.25), I, 'neve', M @ R(rnd.uniform(0, 6.28)), uv=1.6, radica=False)


# ------------------------------------------------------------------------------------------------ la casa a graticcio


def casa(S, M, rnd, I, largo=7.5, fondo=6.0, piani=2, neve=False, copertura='tetto', timpano=False, lato_porta=0, insegna_tinta=None, alto_tetto=None,
         sbalzo=0.28, abbaino=None, accese=0.62, zoccolo=1.4, muri='intonaco'):
    """Una casa a graticcio. Il pianterreno è di pietra, i piani sopra d'intonaco con le travi a vista e sporgono un
    poco l'uno sull'altro. Il colmo corre lungo x (con `timpano=True` la casa è girata: è il timpano a guardare la via).
    Con `muri='tavole'` i piani sopra sono di tavole, come le case dei porti. Restituisce l'altezza del colmo."""
    tinta_muri = (rnd.uniform(0.92, 1.05),) * 3 if muri == 'intonaco' else tuple(c * rnd.uniform(0.6, 0.95) for c in (1.0, 0.9, 0.8))
    if timpano:   # si costruisce la stessa casa girata di un quarto, e la porta va sul lato del timpano
        M = M @ R(math.pi / 2)
        largo, fondo = fondo, largo
        lato_porta = 3
    H0, H1 = 2.9, 2.55
    # il pianterreno di pietra, con lo zoccolo che scende sotto terra dove il suolo pende
    S.metti(scatola(largo, fondo, H0 + zoccolo, z0=-zoccolo, tagli=3, rumore=0.03, seme=rnd.random() * 99), I, 'muro', M, uv=2.0)
    for (Mf, w) in facce(M, largo + 0.1, fondo + 0.1):
        for k in (-1, 1):   # i cantonali: conci di pietra più chiara, uno lungo e uno corto
            for c in range(7):
                lungo = 0.62 if c % 2 == 0 else 0.4
                S.metti(scatola(lungo, 0.16, 0.4, z0=c * 0.415), I, 'pietra', Mf @ T(k * (w / 2 - lungo / 2), 0.04, 0), uv=1.2, tinta=(0.78, 0.76, 0.74), radica=c == 0)
    # la porta e le finestre del pianterreno
    for k, (Mf, w) in enumerate(facce(M, largo, fondo)):
        if k == lato_porta:
            xp = rnd.choice((-1, 1)) * (w / 2 - 1.5) if w > 5.5 else 0.0
            porta(S, Mf @ T(xp, 0, 0.02), I, rnd)
            if insegna_tinta:
                insegna(S, Mf @ T(xp - math.copysign(1.5, xp or 1), 0, 2.2), I, rnd, insegna_tinta)
            if w > 5.5:
                finestra_quadra(S, Mf @ T(-xp * 0.75, 0, 1.0), I, rnd, 1.1, 1.2, True, True, neve, 1.0)
            if neve:
                cumulo_neve(S, Mf @ T(-xp, -0.5, 0), I, rnd, 0.9)
        elif rnd.random() < 0.8:
            finestra_quadra(S, Mf @ T(rnd.uniform(-0.25, 0.25) * w, 0, 1.05), I, rnd, 0.85, 1.05, rnd.random() < accese, True, neve)
    # i piani a graticcio
    z = H0
    w, d = largo, fondo
    for p in range(1, piani):
        w, d = w + 2 * sbalzo, d + 2 * sbalzo
        S.metti(scatola(w, d, H1, z0=z + 0.02), I, muri, M, uv=2.2 if muri == 'intonaco' else 1.6, radica=False, liscia=False, tinta=tinta_muri)
        S.metti(scatola(w + 0.06, d + 0.06, 0.24, z0=z - 0.12), I, 'legno', M, uv=0.9, tinta=SCURO, radica=False, liscia=False)
        for k, (Mf, lw) in enumerate(facce(M, w, d, z)):
            n = max(2, round(lw / 1.3))
            for i in range(n + 1):   # i montanti, e sotto ognuno la testa della trave che regge lo sbalzo
                x = -lw / 2 + lw * i / n
                trave(S, I, Mf, x, 0.1, x, H1, 0.18 if i in (0, n) else 0.13)
                S.metti(scatola(0.16, sbalzo + 0.12, 0.2, z0=-0.3), I, 'legno', Mf @ T(x * 0.985, sbalzo / 2, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
            trave(S, I, Mf, -lw / 2, H1 - 0.06, lw / 2, H1 - 0.06, 0.16)
            trave(S, I, Mf, -lw / 2, 1.0, lw / 2, 1.0, 0.11)
            for i in range(n):
                x0, x1 = -lw / 2 + lw * i / n, -lw / 2 + lw * (i + 1) / n
                lato = i < n / 2
                j = min(i, n - 1 - i)
                if j % 2 == 1 or (n == 2 and i == 0 and k % 2 == 0):
                    finestra_quadra(S, Mf @ T((x0 + x1) / 2, 0, 1.08), I, rnd, min(0.95, x1 - x0 - 0.3), 1.05, rnd.random() < accese, rnd.random() < 0.7, neve)
                elif j == 0:
                    trave(S, I, Mf, x0 if lato else x1, 1.0, x1 if lato else x0, H1 - 0.1, 0.11)     # la saetta d'angolo
                    trave(S, I, Mf, x0, 0.12, x1, 1.0, 0.1) if lato else trave(S, I, Mf, x1, 0.12, x0, 1.0, 0.1)
                else:
                    trave(S, I, Mf, x0, 0.12, x1, 1.0, 0.1)
                    trave(S, I, Mf, x1, 0.12, x0, 1.0, 0.1)
        z += H1
    # il tetto, con i due timpani a graticcio
    ht = alto_tetto or d * rnd.uniform(0.62, 0.74)
    S.metti(tetto(w, d, ht, 0.5), I, copertura, M @ T(0, 0, z), uv=2.2, radica=False, liscia=False)
    S.metti(tetto(w, d, ht, 0.5, dz=-0.05, rovescia=True), I, 'legno', M @ T(0, 0, z), uv=1.2, tinta=SCURO, radica=False, liscia=False)   # il sottotetto, visto da sotto
    if neve:
        S.metti(tetto(w, d, ht, 0.42, spesso=0.2, dz=0.16, passi=5), I, 'neve', M @ T(0, 0, z), uv=2.6, radica=False)
        for s in (-1, 1):
            ghiaccioli(S, M @ T(0, s * (d / 2 + 0.42), z + 0.02), I, rnd, w)
    for k in (-1, 1):
        Mt = M @ T(k * w / 2, 0, z) @ R(k * math.pi / 2)
        S.metti(prisma([(-d / 2, 0), (d / 2, 0), (0, ht - 0.15)], 0.3), I, muri, Mt @ T(0, 0.15, 0), uv=2.2 if muri == 'intonaco' else 1.6, radica=False, liscia=False, tinta=tinta_muri)
        trave(S, I, Mt, 0, 0, 0, ht - 0.3, 0.16)
        trave(S, I, Mt, -d / 2, 0, d / 2, 0, 0.18)
        for s in (-1, 1):
            trave(S, I, Mt, s * d / 2, 0.02, 0, ht - 0.2, 0.15, 0.07)
            trave(S, I, Mt, s * d * 0.27, 0.05, s * d * 0.27, ht * 0.42, 0.11)
            trave(S, I, Mt, s * d * 0.27, 0.1, 0, ht * 0.45, 0.1)
        if ht > 3.0:
            finestra_quadra(S, Mt @ T(0, 0, ht * 0.3), I, rnd, 0.7, 0.85, rnd.random() < accese, False, neve)
    if abbaino if abbaino is not None else (w > 7 and rnd.random() < 0.6):
        for s in ((-1,) if rnd.random() < 0.5 else (-1, 1)):
            Ma = M @ T(rnd.uniform(-0.2, 0.2) * w, s * d * 0.3, z + ht * 0.32) @ R(0 if s < 0 else math.pi)
            S.metti(scatola(1.3, 1.5, 1.2), I, muri, Ma @ T(0, 0.2, 0), uv=2.2, radica=False, liscia=False, tinta=tinta_muri)
            S.metti(tetto(1.5, 1.3, 0.75, 0.2), I, copertura, Ma @ T(0, 0.2, 1.2) @ R(math.pi / 2), uv=2.2, radica=False, liscia=False)
            if neve:
                S.metti(tetto(1.5, 1.3, 0.75, 0.16, spesso=0.12, dz=0.1), I, 'neve', Ma @ T(0, 0.2, 1.2) @ R(math.pi / 2), uv=2.6, radica=False)
            finestra_quadra(S, Ma @ T(0, -0.55, 0.2), I, rnd, 0.7, 0.8, rnd.random() < accese + 0.2, False, neve, 0.6)
    camino(S, M @ T(rnd.choice((-1, 1)) * w * 0.3, rnd.uniform(-0.6, 0.6), z + ht * 0.55), I, rnd, ht * 0.45 + 1.1, neve)
    S.urto(M, largo + 0.2, fondo + 0.2, z + 1.0)
    S.occupa(M.translation.x, -M.translation.y, math.hypot(largo, fondo) / 2 + 1.6)
    return z + ht


# ------------------------------------------------------------------------------------------------ torri e mura


def cono(r, alto, lati=18, z0=0.0, svasa=0.18, passi=5):
    """Un tetto a cono che in gronda si allarga un poco, come un cappello."""
    pt = [(r * (1 - i / passi) * (1 + svasa * (1 - i / passi) ** 3), alto * (i / passi) ** (1 - svasa * 0.5) + z0) for i in range(passi + 1)]
    bm = bmesh.new()
    anelli = [[bm.verts.new((math.cos(k / lati * math.tau) * rr, math.sin(k / lati * math.tau) * rr, zz)) for k in range(lati)] for (rr, zz) in pt[:-1]]
    cima = bm.verts.new((0, 0, pt[-1][1]))
    for i in range(len(anelli) - 1):
        for k in range(lati):
            bm.faces.new((anelli[i][k], anelli[i][(k + 1) % lati], anelli[i + 1][(k + 1) % lati], anelli[i + 1][k]))
    for k in range(lati):
        bm.faces.new((anelli[-1][k], anelli[-1][(k + 1) % lati], cima))
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    sotto = bm.faces.new(anelli[0])   # il disotto, che si vede da terra: senza, tra il muro e la gronda si vedeva il cielo
    sotto.normal_update()
    if sotto.normal.z > 0:
        sotto.normal_flip()
    return bm


def fusto(r0, r1, alto, lati=18, z0=0.0, rumore=0.04, seme=0.0, fasce=6):
    """Il muro tondo di una torre: un cilindro a fasce, appena rastremato e consumato."""
    bm = cilindro(r0, r1, alto, lati, z0=z0)
    bmesh.ops.subdivide_edges(bm, edges=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > alto * 0.5], cuts=fasce)
    if rumore:
        sgualcisci(bm, rumore, seme)
    return bm


def merli(S, M, I, r, lati=12, alto=0.9, largo=0.8, spesso=0.5):
    """Una corona di merli in cima a una torre tonda."""
    for k in range(lati):
        an = k / lati * math.tau
        S.metti(scatola(largo, spesso, alto, tagli=1, rumore=0.02, seme=k), I, 'muro', M @ R(an) @ T(0, -r + spesso / 2, 0), uv=1.8, radica=False)


def torre_tonda(S, M, rnd, I, r=3.0, alta=13.0, neve=False, copertura='tetto', alto_tetto=None, porta_davanti=True, merlata=False, zoccolo=1.5, finestre=3, bandiera=None):
    """Una torre tonda di pietra: la base che si allarga, le feritoie accese, la corona che sporge in cima e il tetto
    a cono (o i merli)."""
    S.metti(fusto(r * 1.12, r, alta + zoccolo, 18, z0=-zoccolo, seme=rnd.random() * 99), I, 'muro', M, uv=2.0, tinta=(1.2, 1.2, 1.25))
    S.metti(fusto(r * 1.22, r * 1.12, 1.2, 18, z0=-0.6, rumore=0.03, seme=rnd.random() * 99, fasce=1), I, 'pietra', M, uv=1.4)
    # la corona: una fascia sporgente retta da mensole
    S.metti(fusto(r + 0.35, r + 0.35, 1.5, 18, z0=alta - 0.2, rumore=0.025, seme=rnd.random() * 99, fasce=1), I, 'muro', M, uv=2.0, radica=False)
    for k in range(18):
        S.metti(scatola(0.3, 0.5, 0.55), I, 'pietra', M @ R(k / 18 * math.tau) @ T(0, -r - 0.1, alta - 0.72), uv=1.2, radica=False)
    cima = alta + 1.3
    if merlata:
        merli(S, M @ T(0, 0, cima), I, r + 0.35, 12)
        S.metti(cilindro(r + 0.1, r + 0.1, 0.1, 18, z0=cima - 0.05), I, 'pietra', M, uv=1.4, radica=False)
        if neve:
            S.metti(cilindro(r, r, 0.12, 18, z0=cima + 0.02), I, 'neve', M, uv=2.0, radica=False)
    else:
        ht = alto_tetto or r * 2.6
        S.metti(cono(r + 0.75, ht, 18, z0=cima), I, copertura, M, uv=2.2, radica=False)
        if neve:
            S.metti(cono(r + 0.68, ht * 0.985, 18, z0=cima + 0.2), I, 'neve', M, uv=2.6, radica=False)
        S.metti(scatola(0.07, 0.07, 1.5, z0=cima + ht - 0.1), I, 'ferro', M, radica=False, liscia=False)
        S.metti(sfera(0.14, 1), I, 'ferro', M @ T(0, 0, cima + ht + 0.2), radica=False)
        if bandiera:
            S.metti(scatola(0.9, 0.02, 0.5), I, 'colore', M @ T(0.5, 0, cima + ht + 0.75), tinta=bandiera, radica=False, liscia=False)
        cima += ht
    # le feritoie accese, a spirale lungo il fusto, e la porta ai piedi
    for i in range(finestre):
        an = (i * 2.2 + rnd.uniform(-0.3, 0.3)) if not porta_davanti or i else 0.0
        zf = 3.2 + i * (alta - 5.0) / max(1, finestre - 1) if finestre > 1 else alta * 0.6
        Mf = M @ R(an) @ T(0, -r * (1.12 - 0.12 * (zf + zoccolo) / (alta + zoccolo)) - 0.05, zf)
        S.metti(prisma(arco(0.55, 1.3, 5), 0.06), I, 'vetrata', Mf, uv=1.0, radica=False, liscia=False)
        S.metti(tubo([((x, 0, z), 0.07) for (x, z) in arco(0.62, 1.36, 5)], 4, tappo=False), I, 'pietra', Mf @ T(0, -0.02, 0), radica=False)
        S.luce(Mf, 'finestra', 0.8, (0, -0.3, 0.65))
        if neve:
            S.metti(scatola(0.8, 0.22, 0.08, z0=-0.03, tagli=1, rumore=0.02), I, 'neve', Mf @ T(0, -0.08, 0), uv=1.2, radica=False)
    if porta_davanti:   # la porta sta in un avancorpo di pietra, che esce dal tondo del muro
        S.metti(scatola(1.9, 0.9, 2.75, z0=-0.5, tagli=2, rumore=0.02, seme=rnd.random() * 9), I, 'muro', M @ T(0, -r * 1.22 + 0.45, 0), uv=2.0)
        if neve:
            S.metti(scatola(2.0, 1.0, 0.12, z0=2.24, tagli=1, rumore=0.03), I, 'neve', M @ T(0, -r * 1.22 + 0.45, 0), uv=1.4, radica=False)
        porta(S, M @ T(0, -r * 1.22 - 0.02, 0.05), I, rnd, 1.1, 2.05)
    S.urto_tondo(M, r * 1.12, alta + 2.0)
    S.occupa(M.translation.x, -M.translation.y, r + 2.2)
    return cima


def muro_merlato(S, pa, pb, rnd, I, posa, alto=6.0, spesso=1.6, quota=None, zoccolo=2.0, neve=False, apertura=None):
    """Un tratto di mura fra due punti del gioco: il muro, il cammino di ronda, i merli verso fuori (a sinistra di chi
    va da pa a pb). `quota` è l'altezza del piede; senza, si prende il terreno nel mezzo."""
    (a0, b0), (a1, b1) = pa, pb
    lungo = math.hypot(a1 - a0, b1 - b0)
    giro = math.atan2(a1 - a0, b1 - b0) + math.pi / 2
    q = terreno.terra((a0 + a1) / 2, (b0 + b1) / 2) if quota is None else quota
    M = T((a0 + a1) / 2, -(b0 + b1) / 2, q) @ R(giro)
    S.metti(scatola(lungo, spesso, alto + zoccolo, z0=-zoccolo, tagli=3, rumore=0.035, seme=rnd.random() * 99), I, 'muro', M, uv=2.2)
    S.metti(scatola(lungo, spesso + 0.5, 0.3, z0=alto - 0.05, tagli=1, rumore=0.015, seme=rnd.random() * 99), I, 'pietra', M, uv=1.5, radica=False)
    n = max(2, int(lungo / 1.7))
    for i in range(n):
        x = -lungo / 2 + (i + 0.5) * lungo / n
        S.metti(scatola(lungo / n * 0.55, 0.5, 1.0, z0=alto + 0.25, tagli=1, rumore=0.02, seme=i), I, 'muro', M @ T(x, -spesso / 2 - 0.0, 0), uv=1.8, radica=False)
        if neve and rnd.random() < 0.8:
            S.metti(scatola(lungo / n * 0.6, 0.55, 0.1, z0=alto + 1.24, tagli=1, rumore=0.03, seme=i), I, 'neve', M @ T(x, -spesso / 2, 0), uv=1.4, radica=False)
    S.metti(scatola(lungo, 0.3, 0.7, z0=alto + 0.25), I, 'muro', M @ T(0, -spesso / 2 - 0.1, 0), uv=1.8, radica=False)
    S.urto(M, lungo, spesso + 0.3, alto + 1.3 + zoccolo, -zoccolo)
    for t in range(int(lungo / 2) + 1):
        S.occupa(a0 + (a1 - a0) * t / max(1, int(lungo / 2)), b0 + (b1 - b0) * t / max(1, int(lungo / 2)), spesso / 2 + 1.2)
    return M


# ------------------------------------------------------------------------------------------------ oggetti di paese


def barile(S, M, rnd, I, alto=0.95, r=0.33, urto=True, sciolto=True):
    if sciolto and not S.piatta and alto == 0.95 and r == 0.33:   # un barile qualunque è un oggetto sciolto
        S.cosa('barile', M)
        return
    b = cilindro(r, r, alto, 12)
    bmesh.ops.subdivide_edges(b, edges=[e for e in b.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > alto * 0.5], cuts=2)
    for v in b.verts:
        k = 1 + 0.17 * (1 - (2 * v.co.z / alto - 1) ** 2)
        rr = math.hypot(v.co.x, v.co.y)
        if rr > 0.01:
            v.co.x, v.co.y = v.co.x / rr * r * k, v.co.y / rr * r * k
    S.metti(b, I, 'legno', M, uv=0.7, tinta=(rnd.uniform(0.75, 1.0),) * 3)
    for z in (0.14, alto - 0.14):
        S.metti(cilindro(r * 1.08, r * 1.08, 0.05, 12, z0=z, tappi=False), I, 'ferro', M, radica=False)
    if urto:
        S.urto_tondo(M, r * 1.1, alto)


def cassa(S, M, rnd, I, lato=0.8, urto=True):
    h = lato * rnd.uniform(0.7, 1.0)
    S.metti(scatola(lato, lato, h, smusso=0.012), I, 'tavole', M, uv=1.2, tinta=(rnd.uniform(0.72, 1.0),) * 3, liscia=False)
    for (x, y) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        S.metti(scatola(0.07, 0.07, h + 0.02), I, 'legno', M @ T(x * (lato / 2 - 0.02), y * (lato / 2 - 0.02), 0), uv=0.8, tinta=SCURO, radica=False, liscia=False)
    for z in (0.04, h - 0.04):
        for g in (0, math.pi / 2):
            for s in (-1, 1):
                S.metti(scatola(lato + 0.03, 0.03, 0.07, z0=z - 0.035), I, 'legno', M @ R(g) @ T(0, s * lato / 2, 0), uv=0.8, tinta=SCURO, radica=False, liscia=False)
    if urto:
        S.urto(M, lato, lato, h)
    return h


def sacco(S, M, rnd, I):
    S.metti(sfera(0.34, 2, 0.12, rnd.random() * 99, (1.0, 0.8, rnd.uniform(0.75, 1.1)), z0=0.26), I, 'tela', M @ R(rnd.uniform(0, 6.28)), uv=0.8, tinta=(0.85, 0.75, 0.6))


def mucchio(S, M, rnd, I, quanti=5, raggio=1.2, neve=False):
    """Un mucchio di merci: barili, casse (qualcuna impilata), sacchi. Sono oggetti sciolti, uno accanto all'altro
    senza toccarsi: nel gioco si spingono, si impilano, bruciano e si sfasciano."""
    import cose
    n = '_n' if neve else ''
    posti = []
    for _ in range(quanti):
        for _ in range(40):
            an, d = rnd.uniform(0, math.tau), raggio * math.sqrt(rnd.random())
            x, y = math.cos(an) * d, math.sin(an) * d
            if all(math.hypot(x - px, y - py) > 1.02 for (px, py) in posti):
                break
        else:
            continue
        posti.append((x, y))
        Mq = M @ T(x, y, 0) @ R(rnd.uniform(0, 6.28))
        dado = rnd.random()
        if dado < 0.4:
            S.cosa('barile' + n, Mq)
        elif dado < 0.8:
            k = rnd.randrange(2)
            S.cosa(f'cassa{k}{n}', Mq)
            if rnd.random() < 0.4:   # una cassa piccola sopra
                S.cosa(f'cassa2{n}', Mq @ T(0, 0, cose.PROTOTIPI[f'cassa{k}']['misure'][2] + 0.01) @ R(rnd.uniform(-0.4, 0.4)))
        else:
            S.cosa('sacco', Mq)
    S.occupa(M.translation.x, -M.translation.y, raggio + 0.8)


def catasta(S, M, rnd, I, lunga=2.6, file=4, neve=False):
    """Una catasta di legna da ardere contro un muro, sotto una tettoia di assi."""
    n = int(lunga / 0.25)
    for f in range(file):
        for i in range(n - (f % 2)):
            S.metti(tubo([((0, -0.45, 0), 0.115), ((0, 0.45, 0), 0.105)], 7), I, 'corteccia', M @ T(-lunga / 2 + (i + 0.5 + (f % 2) * 0.5) * 0.25, rnd.uniform(-0.04, 0.04), 0.12 + f * 0.21), radica=False)
    for x in (-lunga / 2 - 0.1, lunga / 2 + 0.1):
        S.metti(scatola(0.1, 0.1, file * 0.21 + 0.55), I, 'legno', M @ T(x, -0.4, 0), uv=0.8, tinta=SCURO)
    S.metti(scatola(lunga + 0.5, 1.25, 0.05, z0=0), I, 'legno', M @ T(0, 0, file * 0.21 + 0.5) @ R(0, 0.2), uv=0.8, tinta=SCURO, radica=False, liscia=False)
    if neve:
        S.metti(scatola(lunga + 0.45, 1.2, 0.12, z0=0.05, tagli=2, rumore=0.03), I, 'neve', M @ T(0, 0, file * 0.21 + 0.5) @ R(0, 0.2), uv=1.4, radica=False)
    S.urto(M, lunga, 1.0, file * 0.21 + 0.3)


def bancarella(S, M, rnd, I, tinta=(0.7, 0.2, 0.15), neve=False, merce='pane'):
    """Una bancarella del mercato: il banco, la tenda a strisce, la merce, la lanterna appesa."""
    for (x, y) in ((-1.3, -0.7), (1.3, -0.7), (1.3, 0.7), (-1.3, 0.7)):
        S.metti(scatola(0.09, 0.09, 2.35 if y > 0 else 2.0), I, 'legno', M @ T(x, y, 0), uv=0.8, tinta=SCURO)
    S.metti(scatola(2.7, 1.3, 0.07, z0=0.85), I, 'legno', M, uv=0.8, radica=False, liscia=False)
    S.metti(scatola(2.7, 0.04, 0.8, z0=0.05), I, 'legno', M @ T(0, -0.66, 0), uv=0.8, tinta=(0.8, 0.7, 0.6), radica=False, liscia=False)
    for i in range(6):   # la tenda: sei teli a strisce, in discesa verso il davanti
        x = -1.5 + (i + 0.5) * 0.5
        S.metti(scatola(0.5, 1.85, 0.035), I, 'tela', M @ T(x, -0.1, 2.2) @ R(0, 0.2), uv=1.0, tinta=tinta if i % 2 == 0 else (0.95, 0.9, 0.8), radica=False, liscia=False)
        S.metti(scatola(0.5, 0.03, 0.22, z0=-0.2), I, 'tela', M @ T(x, -1.0, 2.02), uv=1.0, tinta=tinta if i % 2 == 0 else (0.95, 0.9, 0.8), radica=False, liscia=False)
    if neve:
        S.metti(scatola(2.9, 1.6, 0.1, z0=0.04, tagli=2, rumore=0.03, seme=rnd.random() * 9), I, 'neve', M @ T(0, 0.0, 2.2) @ R(0, 0.2), uv=1.4, radica=False)
    colori = {'pane': ((0.75, 0.5, 0.25), (0.85, 0.65, 0.35)), 'frutta': ((0.8, 0.2, 0.12), (0.9, 0.6, 0.1), (0.45, 0.6, 0.15)), 'pesce': ((0.55, 0.6, 0.65), (0.7, 0.72, 0.75))}[merce]
    for _ in range(16):
        S.metti(sfera(rnd.uniform(0.07, 0.13), 1, 0, 0, (1.4 if merce == 'pesce' else 1.0, 0.6 if merce == 'pesce' else 1.0, 0.7)), I, 'colore',
                M @ T(rnd.uniform(-1.2, 1.2), rnd.uniform(-0.5, 0.5), 0.97) @ R(rnd.uniform(0, 6.28)), tinta=rnd.choice(colori), radica=False)
    Ml = M @ T(0.9, -0.75, 1.72)
    S.metti(scatola(0.012, 0.012, 0.28, z0=0.14), I, 'ferro', Ml, radica=False, liscia=False)
    S.metti(scatola(0.15, 0.15, 0.18, z0=-0.04), I, 'luce', Ml, radica=False, liscia=False)
    S.luce(Ml, 'lanterna', 0.8, (0, 0, 0.05))
    S.urto(M, 2.8, 1.4, 1.0)
    S.occupa(M.translation.x, -M.translation.y, 2.4)
    S.persona(M @ T(0.3, 1.35, 0), 'venditore', True)   # chi vende sta dietro il banco
    if rnd.random() < 0.6:
        S.persona(M @ T(rnd.uniform(-0.8, 0.8), -2.0, 0))


def fontana(S, M, rnd, I, gelata=False, r=2.3):
    """Una fontana a vasca ottagonale con la colonna in mezzo. D'inverno l'acqua è una lastra di ghiaccio."""
    for k in range(8):
        an = (k + 0.5) / 8 * math.tau
        S.metti(scatola(2 * r * math.tan(math.pi / 8) + 0.12, 0.42, 0.85, z0=-0.15, tagli=1, rumore=0.02, seme=k), I, 'pietra', M @ R(an) @ T(0, -r * math.cos(math.pi / 8) + 0.2, 0), uv=1.3)
        S.metti(scatola(2 * (r + 0.1) * math.tan(math.pi / 8) + 0.1, 0.6, 0.12, z0=0.7, tagli=1, rumore=0.012, seme=k + 9), I, 'pietra', M @ R(an) @ T(0, -r * math.cos(math.pi / 8) + 0.2, 0), uv=1.3, radica=False)
    S.metti(cilindro(r - 0.25, r - 0.25, 0.04, 8, z0=0.5), I, 'ghiaccio' if gelata else 'colore', M @ R(math.pi / 8), tinta=BIANCO if gelata else (0.1, 0.2, 0.25), radica=False, liscia=False)
    S.metti(fusto(0.42, 0.3, 2.3, 10, rumore=0.015, fasce=2), I, 'pietra', M, uv=1.2)
    S.metti(cilindro(0.95, 0.5, 0.3, 12, z0=1.5), I, 'pietra', M, uv=1.2, radica=False)
    S.metti(sfera(0.3, 2), I, 'pietra', M @ T(0, 0, 2.5), uv=1.0, radica=False)
    if gelata:
        for k in range(10):
            an = k / 10 * math.tau
            h = rnd.uniform(0.3, 0.9)
            S.metti(cilindro(0.0, 0.05, h, 4, z0=-h), I, 'ghiaccio', M @ T(math.cos(an) * 0.9, math.sin(an) * 0.9, 1.52), radica=False, liscia=False)
        S.metti(cilindro(0.9, 0.9, 0.1, 12, z0=1.8), I, 'neve', M, uv=1.2, radica=False)
    S.urto_tondo(M, r + 0.1, 1.0)
    S.urto_tondo(M, 0.5, 2.6)
    S.occupa(M.translation.x, -M.translation.y, r + 1.5)


def pupazzo(S, M, rnd, I):
    """Un pupazzo di neve con il secchio in testa, il naso di carota e le braccia di rametti."""
    if not S.piatta:
        S.cosa('pupazzo', M)
        return
    for (r, z) in ((0.48, 0.38), (0.36, 1.02), (0.25, 1.5)):
        S.metti(sfera(r, 2, 0.05, rnd.random() * 9, z0=z), I, 'neve', M, uv=1.2, radica=z < 0.5)
    S.metti(cilindro(0.2, 0.16, 0.26, 9, z0=1.68), I, 'ferro', M @ R(0, 0.12), radica=False)
    S.metti(cilindro(0.05, 0.0, 0.3, 6), I, 'colore', M @ T(0, -0.2, 1.52) @ R(0, math.pi / 2), tinta=(0.95, 0.45, 0.08), radica=False)
    for x in (-0.09, 0.09):
        S.metti(sfera(0.03, 1), I, 'ferro', M @ T(x, -0.22, 1.6), radica=False)
    for i in range(3):
        S.metti(sfera(0.032, 1), I, 'ferro', M @ T(0, -0.35 + i * 0.012, 0.85 + i * 0.16), radica=False)
    for k in (-1, 1):
        S.metti(tubo([((k * 0.3, 0, 1.1), 0.022), ((k * 0.7, -0.05, 1.3), 0.016), ((k * 0.95, 0, 1.5), 0.01)], 4), I, 'corteccia', M, radica=False)
        S.metti(tubo([((k * 0.7, -0.05, 1.3), 0.012), ((k * 0.85, 0.1, 1.2), 0.008)], 4), I, 'corteccia', M, radica=False)
    S.metti(scatola(0.75, 0.75, 0.07, z0=1.26), I, 'colore', M @ R(0.3), tinta=(0.7, 0.15, 0.12), radica=False, liscia=False)
    S.urto_tondo(M, 0.5, 1.8)


def slitta(S, M, rnd, I):
    for k in (-1, 1):
        S.metti(tubo([((k * 0.4, -1.1, 0.5), 0.03), ((k * 0.4, -0.95, 0.12), 0.03), ((k * 0.4, -0.6, 0.03), 0.03), ((k * 0.4, 0.9, 0.03), 0.03)], 5), I, 'legno', M, radica=False)
        for y in (-0.5, 0.5):
            S.metti(scatola(0.05, 0.05, 0.3, z0=0.03), I, 'legno', M @ T(k * 0.4, y, 0), radica=False, liscia=False)
    S.metti(scatola(0.95, 1.5, 0.05, z0=0.32), I, 'legno', M @ T(0, 0.05, 0), uv=0.8, radica=False, liscia=False)
    for _ in range(3):
        sacco(S, M @ T(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.4, 0.5), 0.36), rnd, I)


def fucina(S, M, rnd, I, neve=False):
    """La tettoia del fabbro: quattro pali, il tetto di assi, la forgia accesa, l'incudine sul ceppo, il barile dell'acqua."""
    for (x, y) in ((-2.2, -1.6), (2.2, -1.6), (2.2, 1.6), (-2.2, 1.6)):
        S.metti(scatola(0.2, 0.2, 2.7 if y < 0 else 3.3, smusso=0.02), I, 'legno', M @ T(x, y, 0), uv=0.9, tinta=SCURO)
        S.urto_tondo(M @ T(x, y, 0), 0.16, 2.7)
    S.metti(scatola(5.2, 4.2, 0.1), I, 'tetto', M @ T(0, 0, 3.0) @ R(0, 0.18), uv=2.0, radica=False, liscia=False)
    if neve:
        S.metti(scatola(5.1, 4.1, 0.16, z0=0.08, tagli=2, rumore=0.04), I, 'neve', M @ T(0, 0, 3.0) @ R(0, 0.18), uv=1.6, radica=False)
        ghiaccioli(S, M @ T(0, -2.1, 2.62), I, rnd, 5.0)
    S.metti(scatola(1.6, 1.2, 0.95, tagli=2, rumore=0.03, seme=3), I, 'muro', M @ T(1.2, 1.0, 0), uv=1.6)
    S.metti(scatola(1.1, 0.8, 0.08, z0=0.93), I, 'luce', M @ T(1.2, 1.0, 0), radica=False, liscia=False)
    S.metti(scatola(1.0, 0.9, 2.2, z0=0.95, tagli=2, rumore=0.03, seme=4), I, 'muro', M @ T(1.2, 1.55, 0), uv=1.6, radica=False)
    S.luce(M, 'brace', 1.0, (1.2, 0.9, 1.25))
    S.luce(M, 'fumo', 1.0, (1.2, 1.55, 3.6))
    S.urto(M @ T(1.2, 1.2, 0), 1.7, 1.6, 2.0)
    S.metti(tubo([((0, 0, -0.1), 0.3), ((0, 0, 0.55), 0.27)], 9, giri=2), I, 'corteccia', M @ T(-0.6, 0.2, 0))
    S.metti(scatola(0.62, 0.2, 0.16, z0=0.55), I, 'ferro', M @ T(-0.6, 0.2, 0), radica=False, liscia=False)
    S.metti(scatola(0.3, 0.16, 0.1, z0=0.71), I, 'ferro', M @ T(-0.6, 0.2, 0), radica=False, liscia=False)
    S.metti(cilindro(0.0, 0.08, 0.3, 6), I, 'ferro', M @ T(-0.95, 0.2, 0.63) @ R(0, 0, -math.pi / 2), radica=False)
    S.urto_tondo(M @ T(-0.6, 0.2, 0), 0.35, 0.9)
    S.persona(M @ T(-0.5, -0.9, 0), 'venditore', True)   # il fabbro, davanti all'incudine
    barile(S, M @ T(-1.7, 1.1, 0), rnd, I, sciolto=False)
    for i in range(4):   # ferri appesi alla trave
        S.metti(scatola(0.03, 0.03, rnd.uniform(0.5, 0.9), z0=-0.9), I, 'ferro', M @ T(-1.2 + i * 0.4, -1.55, 2.6), radica=False, liscia=False)
    S.metti(scatola(4.4, 0.14, 0.16, z0=2.5), I, 'legno', M @ T(0, -1.6, 0), uv=0.9, tinta=SCURO, radica=False, liscia=False)
    S.occupa(M.translation.x, -M.translation.y, 3.8)


def stendardo(S, M, I, tinta=(0.6, 0.12, 0.1), lungo=3.0, largo=0.9, fregio=(0.9, 0.75, 0.3)):
    """Uno stendardo che pende da un'asta infissa nel muro (il muro guarda verso -y)."""
    S.metti(tubo([((-largo / 2 - 0.12, -0.12, 0), 0.025), ((largo / 2 + 0.12, -0.12, 0), 0.025)], 5), I, 'ferro', M, radica=False)
    S.metti(prisma([(-largo / 2, 0), (largo / 2, 0), (largo / 2, -lungo + 0.4), (0, -lungo), (-largo / 2, -lungo + 0.4)], 0.02), I, 'colore', M @ T(0, -0.13, 0), tinta=tinta, radica=False, liscia=False)
    S.metti(prisma([(0, -0.5), (0.22, -0.9), (0, -1.3), (-0.22, -0.9)], 0.03), I, 'colore', M @ T(0, -0.14, 0), tinta=fregio, radica=False, liscia=False)


def festone(S, I, p0, p1, quante=6, cala=0.7, forza=0.5):
    """Una corda tesa fra due punti (della scena) con le lanternine appese: le luci della festa d'inverno."""
    p0, p1 = Vector(p0), Vector(p1)
    pt = []
    for i in range(13):
        t = i / 12
        p = p0.lerp(p1, t)
        p.z -= cala * 4 * t * (1 - t)
        pt.append(p)
    S.metti(tubo([(p, 0.012) for p in pt], 4), I, 'ferro', radica=False)
    for k in range(quante):
        t = (k + 0.5) / quante
        p = p0.lerp(p1, t)
        p.z -= cala * 4 * t * (1 - t)
        Ml = T(p.x, p.y, p.z - 0.22)
        S.metti(scatola(0.008, 0.008, 0.12, z0=0.1), I, 'ferro', Ml, radica=False, liscia=False)
        S.metti(scatola(0.11, 0.11, 0.14, z0=-0.04), I, 'luce', Ml, radica=False, liscia=False)
        S.luce(Ml, 'candela', forza, (0, 0, 0.03))


def panca(S, M, rnd, I, neve=False):
    if not S.piatta:
        S.cosa('panca_n' if neve else 'panca', M)
        return
    S.metti(scatola(1.7, 0.42, 0.07, z0=0.42, smusso=0.01), I, 'legno', M, uv=0.8, radica=False, liscia=False)
    S.metti(scatola(1.7, 0.06, 0.4, z0=0.62), I, 'legno', M @ T(0, 0.2, 0) @ R(0, -0.12), uv=0.8, radica=False, liscia=False)
    for x in (-0.7, 0.7):
        S.metti(scatola(0.08, 0.4, 0.45), I, 'legno', M @ T(x, 0, 0), uv=0.8, tinta=SCURO)
        S.metti(scatola(0.07, 0.07, 0.62, z0=0.42), I, 'legno', M @ T(x, 0.2, 0) @ R(0, -0.12), uv=0.8, tinta=SCURO, radica=False)
    if neve:
        S.metti(scatola(1.6, 0.36, 0.07, z0=0.49, tagli=1, rumore=0.02, seme=rnd.random() * 9), I, 'neve', M, uv=1.2, radica=False)
    S.urto(M, 1.7, 0.5, 0.9)


# ------------------------------------------------------------------------------------------------ il castello


def muro_con_arco(larga, alta, ap_l, ap_h, spessa, tagli=1, rumore=0.03, seme=0.0):
    """Un muro con un passaggio ad arco nel mezzo (un portone, un'arcata di ponte)."""
    sagoma = [(-larga / 2, 0), (-larga / 2, alta), (larga / 2, alta), (larga / 2, 0)] + list(reversed(arco_tondo(ap_l, ap_h, 6)))
    return prisma(sagoma, spessa, tagli=tagli, rumore=rumore, seme=seme)


def braciere(S, M, I, forza=1.0):
    """Un braciere di ferro su tre piedi, acceso."""
    for k in range(3):
        an = k * 2.094
        S.metti(tubo([((math.cos(an) * 0.42, math.sin(an) * 0.42, 0.0), 0.03), ((math.cos(an) * 0.2, math.sin(an) * 0.2, 0.95), 0.03)], 4), I, 'ferro', M, radica=False)
    S.metti(cilindro(0.2, 0.42, 0.3, 9, z0=0.9), I, 'ferro', M, radica=False)
    S.metti(cilindro(0.36, 0.1, 0.42, 7, z0=1.16), I, 'luce', M, radica=False)
    S.luce(M, 'brace', forza, (0, 0, 1.6))
    S.urto_tondo(M, 0.4, 1.3)


def torcia(S, M, I, forza=0.9):
    """Una torcia infissa nel muro (il muro guarda verso -y)."""
    S.metti(tubo([((0, 0.05, 0), 0.035), ((0, -0.3, 0.5), 0.03)], 5), I, 'legno', M, radica=False)
    S.metti(cilindro(0.09, 0.02, 0.3, 6, z0=0.5), I, 'luce', M @ T(0, -0.33, 0), radica=False)
    S.luce(M, 'torcia', forza, (0, -0.4, 0.75))


def portone(S, M, rnd, I, alto=7.0, passo=3.8):
    """La porta del castello: due torri quadre merlate, il passaggio ad arco con la saracinesca alzata, i battenti
    aperti, le torce e gli stendardi. Il fuori è verso -y; si passa sotto."""
    for k in (-1, 1):
        Mt = M @ T(k * (passo / 2 + 2.3), 0, 0)
        S.metti(scatola(4.6, 5.6, alto + 5.0, z0=-2.0, tagli=4, rumore=0.04, seme=rnd.random() * 99), I, 'muro', Mt, uv=2.2)
        S.metti(scatola(5.1, 6.1, 0.35, z0=alto + 2.9, tagli=1, rumore=0.015), I, 'pietra', Mt, uv=1.5, radica=False)
        for (x, y, sx, sy) in [(i * 1.7, s * 2.85, 0.95, 0.5) for i in (-1, 0, 1) for s in (-1, 1)] + [(s * 2.35, j * 1.8, 0.5, 0.95) for j in (-0.5, 0.5) for s in (-1, 1)]:
            S.metti(scatola(sx, sy, 1.0, z0=alto + 3.25, tagli=1, rumore=0.02, seme=x + y), I, 'muro', Mt @ T(x, y, 0), uv=1.8, radica=False)
        S.urto(Mt, 4.7, 5.7, alto + 4.5)
        torcia(S, Mt @ T(-k * 1.2, -2.82, 2.6), I)
        S.persona(Mt @ T(-k * 0.9, -3.9, 0), 'guardia')
        stendardo(S, Mt @ T(0, -2.85, alto + 1.6), I, (0.5, 0.1, 0.1), 3.6, 1.1)
        Mf = Mt @ T(0, -2.84, alto - 0.6)
        S.metti(prisma(arco(0.6, 1.5, 5), 0.06), I, 'vetrata', Mf, uv=1.0, radica=False, liscia=False)
        S.luce(Mf, 'finestra', 0.8, (0, -0.3, 0.7))
    S.metti(muro_con_arco(passo + 0.2, alto + 1.6, passo - 0.4, 4.9, 4.4, seme=rnd.random() * 99), I, 'muro', M, uv=2.2)
    S.metti(tubo([((x, 0, z), 0.16) for (x, z) in arco_tondo(passo - 0.2, 5.05, 6)], 4, tappo=False), I, 'pietra', M @ T(0, -2.2, 0), radica=False)
    for i in range(4):
        S.metti(scatola(0.85, 0.5, 1.0, z0=alto + 1.6, tagli=1, rumore=0.02, seme=i), I, 'muro', M @ T(-1.35 + i * 0.9, -1.95, 0), uv=1.8, radica=False)
    S.urto(M @ T(0, 0, 0), passo + 0.4, 4.4, alto - 3.0, 4.6)
    # la saracinesca, alzata a metà dell'arco
    for i in range(7):
        S.metti(scatola(0.07, 0.07, 1.9, z0=3.2), I, 'ferro', M @ T(-1.5 + i * 0.5, -1.2, 0), radica=False, liscia=False)
        S.metti(cilindro(0.0, 0.05, 0.2, 4, z0=3.0), I, 'ferro', M @ T(-1.5 + i * 0.5, -1.2, 0), radica=False, liscia=False)
    for z in (3.5, 4.1, 4.7):
        S.metti(scatola(passo - 0.5, 0.06, 0.07, z0=z), I, 'ferro', M @ T(0, -1.2, 0), radica=False, liscia=False)
    # i due battenti di quercia, spalancati verso dentro
    for k in (-1, 1):
        Mb = M @ T(k * (passo / 2 - 0.25), 1.9, 0) @ R(k * 1.35)
        S.metti(scatola(1.7, 0.14, 4.2, z0=0.05), I, 'tavole', Mb @ T(-k * 0.85, 0, 0), uv=1.2, tinta=(0.7, 0.58, 0.46), radica=False, liscia=False)
        for z in (0.7, 2.1, 3.5):
            S.metti(scatola(1.6, 0.18, 0.12, z0=z), I, 'ferro', Mb @ T(-k * 0.85, 0, 0), radica=False, liscia=False)
    S.occupa(M.translation.x, -M.translation.y, 7.5)


def torretta(S, M, I, rnd, r=1.5, alta=6.0, tetto_alto=4.6, copertura='tetto'):
    """Una torretta pensile, che sporge dallo spigolo di un muro a mezza altezza, con il suo cappello a punta."""
    S.metti(cilindro(0.25, r, 1.7, 12, z0=-1.7), I, 'pietra', M, uv=1.4, radica=False)
    S.metti(fusto(r, r, alta, 12, rumore=0.025, seme=rnd.random() * 99, fasce=3), I, 'muro', M, uv=2.0, radica=False)
    S.metti(cono(r + 0.45, tetto_alto, 12, z0=alta), I, copertura, M, uv=2.2, radica=False)
    S.metti(scatola(0.05, 0.05, 1.0, z0=alta + tetto_alto - 0.1), I, 'ferro', M, radica=False, liscia=False)
    Mf = M @ R(rnd.uniform(0, 6.28)) @ T(0, -r - 0.04, alta * 0.45)
    S.metti(prisma(arco(0.45, 1.1, 5), 0.06), I, 'vetrata', Mf, uv=1.0, radica=False, liscia=False)
    S.luce(Mf, 'finestra', 0.6, (0, -0.3, 0.5))


def mastio(S, M, rnd, I, finestra):
    """Il mastio: un torrione quadrato con il tetto ripido, quattro torrette pensili agli spigoli, la torre della
    scala più alta di tutto, il portale con la scalinata e i bracieri. Il davanti è verso -y.
    `finestra` è la funzione delle finestre a sesto acuto (sta in edifici.py)."""
    W, D, H = 13.0, 10.5, 15.0
    S.metti(scatola(W, D, H + 2.0, z0=-2.0, tagli=5, rumore=0.045, seme=rnd.random() * 99), I, 'muro', M, uv=2.4)
    S.metti(scatola(W + 0.7, D + 0.7, 0.4, z0=H - 0.1, tagli=1, rumore=0.015), I, 'pietra', M, uv=1.5, radica=False)
    for i in range(int(W / 1.3)):   # una fila di mensole sotto il cornicione
        for s in (-1, 1):
            S.metti(scatola(0.35, 0.5, 0.5), I, 'pietra', M @ T(-W / 2 + 0.6 + i * 1.3, s * (D / 2 + 0.12), H - 0.6), uv=1.2, radica=False)
    S.metti(tetto(W - 1.0, D - 0.6, 8.2, 0.5, curva=1.3), I, 'tetto', M @ T(0, 0, H + 0.3), uv=2.4, radica=False, liscia=False)
    for (x, y) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        torretta(S, M @ T(x * W / 2, y * D / 2, H - 4.0), I, rnd)
    for x in (-W * 0.3, W * 0.3):   # i comignoli
        camino(S, M @ T(x, 1.0, H + 4.0), I, rnd, 5.2, fuma=x < 0)
    # la torre della scala, a uno spigolo di dietro
    Ms = M @ T(W / 2 - 0.6, D / 2 - 0.4, 0)
    S.metti(fusto(3.0, 2.7, 24.0, 16, z0=-2.0, seme=rnd.random() * 99, fasce=9), I, 'muro', Ms, uv=2.2)
    S.metti(fusto(3.1, 3.1, 1.3, 16, z0=21.6, rumore=0.02, fasce=1), I, 'muro', Ms, uv=2.0, radica=False)
    S.metti(cono(3.7, 8.5, 16, z0=22.9), I, 'tetto', Ms, uv=2.2, radica=False)
    S.metti(scatola(0.07, 0.07, 1.6, z0=31.3), I, 'ferro', Ms, radica=False, liscia=False)
    S.metti(prisma([(0, 0), (1.6, 0.15), (0, 0.6)], 0.02), I, 'colore', Ms @ T(0, 0, 32.2) @ R(0.9), tinta=(0.6, 0.1, 0.1), radica=False, liscia=False)
    for i in range(5):
        Mf = Ms @ R(2.0 + i * 1.1) @ T(0, -2.88, 4.0 + i * 3.8)
        S.metti(prisma(arco(0.5, 1.3, 5), 0.06), I, 'vetrata', Mf, uv=1.0, radica=False, liscia=False)
        S.luce(Mf, 'finestra', 0.7, (0, -0.3, 0.6))
    S.urto_tondo(Ms, 3.0, 24.0)
    # le finestre accese e il portale
    for (x, z, w, h) in ((-4.2, 5.0, 1.0, 2.6), (0, 5.4, 1.3, 3.2), (4.2, 5.0, 1.0, 2.6), (-4.2, 10.2, 0.9, 2.2), (0, 10.4, 0.9, 2.2), (4.2, 10.2, 0.9, 2.2), (-4.2, 1.2, 0.8, 1.8), (4.2, 1.2, 0.8, 1.8)):
        finestra(S, M @ T(x, -D / 2 - 0.03, z), I, w, h)
    for (y, z) in ((-2.5, 5.5), (2.0, 9.8), (-1.0, 11.0)):
        finestra(S, M @ T(-W / 2 - 0.03, y, z) @ R(-math.pi / 2), I, 0.9, 2.3)
    Mp = M @ T(0, -D / 2, 0)
    for g in range(4):   # la scalinata
        S.metti(scatola(5.0 - g * 0.5, 0.75, 0.25, z0=g * 0.25, tagli=1, rumore=0.012, seme=g), I, 'pietra', Mp @ T(0, -2.6 + g * 0.72, 0), uv=1.4, radica=g == 0)
        S.urto(Mp @ T(0, -2.6 + g * 0.72, 0), 5.0 - g * 0.5, 0.75, 0.25 + g * 0.25, 0.0)
    S.metti(prisma(arco_tondo(2.0, 3.3, 6), 0.16), I, 'tavole', Mp @ T(0, -0.04, 1.0), uv=1.2, tinta=(0.75, 0.6, 0.46), radica=False, liscia=False)
    S.metti(tubo([((x, 0, z), 0.16) for (x, z) in arco_tondo(2.25, 3.45, 6)], 5, tappo=False), I, 'pietra', Mp @ T(0, -0.1, 1.0), radica=False)
    for z in (1.6, 2.6, 3.4):
        S.metti(scatola(1.8, 0.04, 0.1, z0=z), I, 'ferro', Mp @ T(0, -0.14, 0), radica=False, liscia=False)
    for k in (-1, 1):
        braciere(S, Mp @ T(k * 3.3, -1.6, 0), I)
        S.persona(Mp @ T(k * 2.0, -3.4, 0), 'guardia')
        stendardo(S, Mp @ T(k * 2.3, -0.02, 7.6), I, (0.5, 0.1, 0.1), 3.4, 1.0)
    S.urto(M, W + 0.2, D + 0.2, H + 3.0)
    S.occupa(M.translation.x, -M.translation.y, 10.5)


def ponte_pietra(S, M, rnd, I, lungo=23.0, largo=4.6, alto=3.6, archi=3):
    """Un ponte di pietra a più arcate. `M` sta in mezzo, sul piano dove si cammina, con la strada lungo x."""
    luce_arco = lungo / archi
    for s in (-1, 1):   # le due fiancate con le arcate, e il parapetto
        for k in range(archi):
            x = -lungo / 2 + (k + 0.5) * luce_arco
            S.metti(muro_con_arco(luce_arco, alto + 0.3, luce_arco - 1.5, alto - 0.5, 0.5, seme=rnd.random() * 99), I, 'muro', M @ T(x, s * (largo / 2 - 0.25), -alto - 0.3), uv=2.2, radica=False)
        S.metti(scatola(lungo + 1.0, 0.45, 0.95, tagli=2, rumore=0.025, seme=rnd.random() * 99), I, 'muro', M @ T(0, s * (largo / 2 - 0.2), 0), uv=2.0, radica=False)
        S.metti(scatola(lungo + 1.1, 0.6, 0.14, z0=0.95, tagli=1, rumore=0.012), I, 'pietra', M @ T(0, s * (largo / 2 - 0.2), 0), uv=1.4, radica=False)
        S.urto(M @ T(0, s * (largo / 2 - 0.2), 0), lungo + 1.0, 0.5, 1.1)
        for x in (-lungo / 2 - 0.2, lungo / 2 + 0.2):
            S.metti(scatola(0.7, 0.7, 1.5, tagli=1, rumore=0.02, seme=x), I, 'pietra', M @ T(x, s * (largo / 2 - 0.2), -0.2), uv=1.2, radica=False)
            Ml = M @ T(x, s * (largo / 2 - 0.2), 1.3)
            S.metti(scatola(0.24, 0.24, 0.3, z0=0.05), I, 'luce', Ml, radica=False, liscia=False)
            S.metti(cilindro(0.24, 0.03, 0.16, 4, z0=0.35), I, 'ferro', Ml @ R(math.pi / 4), radica=False, liscia=False)
            S.luce(Ml, 'lanterna', 1.0, (0, 0, 0.2))
    for k in range(archi + 1):   # le pile, con il rostro che taglia la corrente
        x = -lungo / 2 + k * luce_arco
        S.metti(scatola(1.5, largo + 0.9, alto + 2.5, z0=-alto - 2.5, tagli=2, rumore=0.04, seme=k), I, 'muro', M @ T(x, 0, 0.0), uv=2.2, radica=False)
    # l'impalcato: la volta sotto e il lastricato sopra
    S.metti(scatola(lungo + 0.6, largo - 0.6, 0.5, z0=-0.52), I, 'muro', M, uv=2.2, radica=False)
    S.metti(scatola(lungo + 0.8, largo - 0.9, 0.06, z0=-0.03), I, 'ciottoli', M, uv=2.4, radica=False, liscia=False)
    S.urto(M, lungo + 0.8, largo, 0.8, -0.8)


def mulino(S, M, rnd, I):
    """Un mulino a vento: la torre di pietra che si restringe, il cappello di legno, le quattro pale con la tela."""
    S.metti(fusto(3.6, 2.5, 10.5, 14, z0=-1.5, seme=rnd.random() * 99, fasce=6), I, 'muro', M, uv=2.2)
    S.metti(fusto(2.75, 2.75, 0.5, 14, z0=8.9, rumore=0.0, fasce=1), I, 'legno', M, uv=1.0, tinta=SCURO, radica=False)
    S.metti(cono(3.0, 3.4, 14, z0=9.4, svasa=0.1), I, 'tetto', M, uv=2.0, radica=False)
    S.metti(scatola(1.9, 0.9, 2.75, z0=-0.5, tagli=2, rumore=0.02, seme=rnd.random() * 9), I, 'muro', M @ T(0, -3.25, 0), uv=2.0)
    porta(S, M @ T(0, -3.72, 0.05), I, rnd, 1.1, 2.05, lanterna=True)
    for (an, z) in ((1.9, 3.2), (-1.5, 6.2), (0.0, 6.0)):
        Mf = M @ R(an) @ T(0, -3.48 + z * 0.105 - 0.05, z)
        S.metti(scatola(0.6, 0.06, 0.9), I, 'vetrata', Mf, uv=0.9, radica=False, liscia=False)
        S.luce(Mf, 'finestra', 0.7, (0, -0.3, 0.45))
    # l'albero delle pale esce dal cappello verso -y; le pale sono ferme, appena girate
    Ma = M @ T(0, -2.4, 10.2) @ R(0, 0, 0.35)
    S.metti(tubo([((0, 1.6, 0), 0.22), ((0, -1.1, 0), 0.18)], 8), I, 'legno', Ma, radica=False, tinta=SCURO)
    for k in range(4):
        Mk = Ma @ T(0, -0.9, 0) @ R(0, 0, k * math.pi / 2)
        S.metti(scatola(0.16, 0.14, 8.6, z0=0.2), I, 'legno', Mk, uv=0.9, radica=False, tinta=SCURO, liscia=False)
        for i in range(8):
            S.metti(scatola(1.75, 0.05, 0.06, z0=1.3 + i * 0.95), I, 'legno', Mk @ T(0.92, -0.02, 0), radica=False, liscia=False)
        S.metti(scatola(0.06, 0.05, 6.9, z0=1.3), I, 'legno', Mk @ T(1.75, -0.02, 0), radica=False, liscia=False)
        S.metti(scatola(1.6, 0.02, 6.6 if k % 2 == 0 else 3.4, z0=1.45), I, 'tela', Mk @ T(0.92, -0.06, 0), uv=1.4, tinta=(0.95, 0.92, 0.85), radica=False, liscia=False)
    for _ in range(5):
        sacco(S, M @ T(rnd.uniform(1.6, 2.6), rnd.uniform(-4.4, -3.8), 0), rnd, I)
    S.urto_tondo(M, 3.5, 9.0)
    S.occupa(M.translation.x, -M.translation.y, 6.0)


def tenda(S, M, rnd, I, tinta=(0.8, 0.72, 0.55), r=2.0, alta=2.9):
    """Una tenda da campo a cono, con il palo che spunta, i tiranti e l'apertura verso -y."""
    telo = cono(r, alta, 10, svasa=0.0, passi=3)
    bmesh.ops.delete(telo, geom=[f for f in telo.faces if f.calc_center_median().y < -r * 0.55 and f.calc_center_median().z < alta * 0.6 and abs(f.calc_center_median().x) < r * 0.4], context='FACES')
    S.metti(telo, I, 'tela', M, uv=1.4, tinta=tinta)
    dentro = cono(r * 0.97, alta * 0.97, 10, svasa=0.0, passi=3)
    bmesh.ops.reverse_faces(dentro, faces=list(dentro.faces))
    S.metti(dentro, I, 'colore', M, tinta=(0.12, 0.1, 0.08), radica=False)
    S.metti(scatola(0.07, 0.07, alta + 0.5), I, 'legno', M, radica=False, liscia=False)
    for k in range(5):
        an = k / 5 * math.tau + 0.3
        S.metti(tubo([((math.cos(an) * r * 0.9, math.sin(an) * r * 0.9, 0.5), 0.012), ((math.cos(an) * (r + 1.0), math.sin(an) * (r + 1.0), 0.0), 0.012)], 3, tappo=False), I, 'colore', M, tinta=(0.5, 0.42, 0.28), radica=False)
    S.urto_tondo(M, r * 0.8, alta)
    S.occupa(M.translation.x, -M.translation.y, r + 1.5)


def fuoco_campo(S, M, rnd, I, masso):
    """Un fuoco da campo: il cerchio di sassi, la legna accesa, il fumo."""
    for k in range(7):
        an = k / 7 * math.tau
        masso(S, M @ T(math.cos(an) * 0.75, math.sin(an) * 0.75, -0.05), rnd, I, 0.22, muschio=False, urto=False)
    for k in range(5):
        S.metti(tubo([((-0.45, 0, 0.08), 0.07), ((0.45, 0, 0.25), 0.05)], 6), I, 'corteccia', M @ R(k * 0.63), radica=False)
    S.metti(cilindro(0.3, 0.05, 0.5, 7, z0=0.15), I, 'luce', M, radica=False)
    S.luce(M, 'brace', 1.0, (0, 0, 0.6))
    S.luce(M, 'fumo', 1.0, (0, 0, 1.2))
    S.occupa(M.translation.x, -M.translation.y, 2.5)
    for an in (0.6, 2.9, 4.4):   # chi si scalda attorno al fuoco
        S.persona(M @ T(math.cos(an) * 2.3, math.sin(an) * 2.3, 0))


def bersaglio(S, M, rnd, I):
    """Un bersaglio di paglia per gli arcieri, su un cavalletto (guarda verso -y)."""
    if not S.piatta:
        S.cosa('bersaglio', M)
        return
    for k in (-1, 1):
        S.metti(tubo([((k * 0.55, 0.5, 0), 0.04), ((k * 0.1, 0.1, 1.7), 0.035)], 5), I, 'legno', M)
    S.metti(tubo([((0, 0.9, 0), 0.04), ((0, 0.12, 1.6), 0.035)], 5), I, 'legno', M)
    for (r, tinta, y) in ((0.62, (0.8, 0.68, 0.4), 0.0), (0.42, (0.75, 0.2, 0.15), -0.07), (0.2, (0.95, 0.9, 0.8), -0.09), (0.07, (0.75, 0.2, 0.15), -0.11)):
        S.metti(cilindro(r, r, 0.14, 14), I, 'colore', M @ T(0, y, 1.25) @ R(0, math.pi / 2), tinta=tinta, radica=False, liscia=False)
    for _ in range(2):
        S.metti(tubo([((rnd.uniform(-0.25, 0.25), -0.75, 1.25 + rnd.uniform(-0.2, 0.25)), 0.012), ((rnd.uniform(-0.2, 0.2), -0.05, 1.25 + rnd.uniform(-0.2, 0.2)), 0.012)], 3), I, 'legno', M, radica=False)
    S.urto_tondo(M, 0.5, 1.9)


def fantoccio(S, M, rnd, I):
    """Un fantoccio di paglia per allenarsi con la spada: un palo, il corpo di sacco, lo scudo e l'elmo vecchio."""
    if not S.piatta:
        S.cosa('fantoccio', M)
        return
    S.metti(scatola(0.14, 0.14, 2.0), I, 'legno', M, uv=0.8)
    S.metti(scatola(1.5, 0.1, 0.1, z0=1.35), I, 'legno', M, radica=False, liscia=False)
    S.metti(sfera(0.36, 2, 0.1, rnd.random() * 9, (1, 0.8, 1.35), z0=1.1), I, 'tela', M, uv=0.8, tinta=(0.85, 0.75, 0.55), radica=False)
    S.metti(sfera(0.2, 2, 0.05, 1.0, z0=1.85), I, 'tela', M, uv=0.8, tinta=(0.85, 0.75, 0.55), radica=False)
    S.metti(cilindro(0.24, 0.16, 0.2, 9, z0=1.92), I, 'ferro', M, radica=False)
    S.metti(cilindro(0.36, 0.36, 0.05, 10), I, 'colore', M @ T(-0.62, -0.1, 1.3) @ R(0, math.pi / 2), tinta=(0.5, 0.1, 0.1), radica=False, liscia=False)
    S.urto_tondo(M, 0.35, 2.0)
