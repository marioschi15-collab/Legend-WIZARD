"""I pezzi piccoli del Bosco della Strega: lapidi, bare, candele, lanterne, massi, zucche, alberi contorti...
Ogni funzione prende la scena, la matrice del punto in cui posare il pezzo e un generatore di numeri a caso."""
import math

import bmesh
from mathutils import Matrix, Vector

from attrezzi import R, T, arco, carta, cilindro, prisma, scatola, sfera, sgualcisci, tubo

OSSO = (0.82, 0.78, 0.66)
CERA = (0.86, 0.8, 0.62)
NERO = (0.05, 0.05, 0.055)


def piatto(punti, alto, z0=0.0, **altro):
    """Una sagoma disegnata vista dall'alto (x, y) e alzata di `alto`: coperchi, bare, lastre."""
    bm = prisma(punti, alto, **altro)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'X'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 0, alto / 2 + z0))
    return bm


# ------------------------------------------------------------------------------------------------ il cimitero


def candela(S, M, rnd, insieme, x=0.0, y=0.0, z=0.0, accesa=True):
    h = rnd.uniform(0.1, 0.3)
    S.metti(cilindro(0.034, 0.03, h, 6, z0=z), insieme, 'colore', M @ T(x, y, 0), tinta=CERA, radica=False)
    if accesa:
        S.metti(cilindro(0.016, 0.0, 0.07, 5, z0=z + h + 0.01), insieme, 'luce', M @ T(x, y, 0), radica=False)
        S.luce(M, 'candela', rnd.uniform(0.35, 0.6), (x, y, z + h + 0.06))


def candele(S, M, rnd, insieme, quante=3, raggio=0.25, z=0.0):
    for _ in range(quante):
        a = rnd.uniform(0, math.tau)
        candela(S, M, rnd, insieme, math.cos(a) * raggio * rnd.random(), math.sin(a) * raggio * rnd.random(), z)


def tumulo(S, M, rnd, insieme):
    """La terra smossa davanti a una lapide."""
    S.metti(sfera(1.0, 2, 0.16, rnd.random() * 50, (0.46, 1.0, 0.2), z0=0.0), insieme, 'terra', M @ T(0, -1.25, -0.03), uv=1.2)


def lapide(S, M, rnd, insieme, tipo=None):
    """Una lapide: sette forme, ognuna un po' diversa, storta, consumata; qualcuna coperta di muschio."""
    tipo = rnd.randrange(7) if tipo is None else tipo
    materia = 'muschio' if rnd.random() < 0.3 else 'pietra'
    w, h, t = rnd.uniform(0.55, 0.82), rnd.uniform(0.95, 1.5), rnd.uniform(0.14, 0.2)
    seme = rnd.random() * 90
    scritte = True
    if tipo == 0:      # cima tonda
        pt = [(-w / 2, 0), (w / 2, 0), (w / 2, h - w / 2)] + [(math.cos(i / 8 * math.pi) * w / 2, h - w / 2 + math.sin(i / 8 * math.pi) * w / 2) for i in range(1, 8)] + [(-w / 2, h - w / 2)]
    elif tipo == 1:    # cima a punta
        pt = [(x, z * h) for (x, z) in arco(w, 1.0, 5)]
    elif tipo == 2:    # croce
        b, c, y = 0.09, w * 0.42, h * 0.66
        pt = [(-b, 0), (b, 0), (b, y - b), (c, y - b), (c, y + b), (b, y + b), (b, h), (-b, h), (-b, y + b), (-c, y + b), (-c, y - b), (-b, y - b)]
        t = 0.16
        scritte = False
    elif tipo == 3:    # obelisco
        S.metti(scatola(0.62, 0.62, 0.3, tagli=1, rumore=0.012, seme=seme), insieme, materia, M, uv=1.2)
        fusto = cilindro(0.32, 0.2, h * 1.5, 4, z0=0.3)
        punta = cilindro(0.2, 0.0, 0.3, 4, z0=0.3 + h * 1.5)
        for bm in (fusto, punta):
            bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
            S.metti(bm, insieme, materia, M, uv=1.2, liscia=False)
        S.urto(M, 0.6, 0.6, h * 1.5)
        return
    elif tipo == 4:    # lastra a terra
        S.metti(scatola(0.95, 2.05, 0.14, tagli=1, rumore=0.015, seme=seme), insieme, materia, M @ T(0, -1.1, 0), uv=1.2)
        S.metti(scatola(0.8, 1.9, 0.12, z0=0.12, tagli=2, rumore=0.012, seme=seme + 3), insieme, materia, M @ T(0, -1.1, 0) @ R(rnd.uniform(-0.05, 0.05)), uv=1.2)
        if rnd.random() < 0.5:
            candele(S, M @ T(0, -0.4, 0), rnd, insieme, 2, 0.2, 0.24)
        return
    elif tipo == 5:    # spezzata, con il pezzo caduto davanti
        pt = [(-w / 2, 0), (w / 2, 0), (w / 2, h * 0.42), (w * 0.12, h * 0.5), (-w * 0.1, h * 0.72), (-w / 2, h * 0.66)]
        caduto = [(-w / 2, 0), (w / 2, 0), (w / 2, h * 0.3), (0.0, h * 0.42), (-w / 2, h * 0.3)]
        S.metti(prisma(caduto, t, tagli=1, rumore=0.012, seme=seme + 9), insieme, materia, M @ T(rnd.uniform(-0.2, 0.2), -0.75, 0.1) @ R(rnd.uniform(-0.6, 0.6), -1.35), uv=1.2)
        scritte = False
    else:              # con le spalle
        s = w * 0.3
        pt = [(-w / 2, 0), (w / 2, 0), (w / 2, h * 0.72), (s, h * 0.72)] + [(math.cos(i / 6 * math.pi) * s, h * 0.72 + math.sin(i / 6 * math.pi) * s * 1.3) for i in range(1, 6)] + [(-s, h * 0.72), (-w / 2, h * 0.72)]
    storto = R(rnd.uniform(-0.12, 0.12), rnd.uniform(-0.13, 0.13), rnd.uniform(-0.1, 0.1))
    S.metti(scatola(w + 0.22, t + 0.22, 0.16, z0=-0.03, tagli=1, rumore=0.012, seme=seme + 1), insieme, materia, M, uv=1.2)
    S.metti(prisma(pt, t, tagli=1, rumore=0.012, seme=seme), insieme, materia, M @ T(0, 0, 0.1) @ storto, uv=1.2)
    if scritte:
        for k in range(3):   # le righe dell'epitaffio, appena accennate
            S.metti(scatola(w * rnd.uniform(0.4, 0.6), 0.012, 0.022, z0=h * (0.56 - k * 0.09)), insieme, 'colore', M @ T(0, 0, 0.1) @ storto @ T(0, -t / 2 - 0.004, 0), tinta=(0.1, 0.1, 0.1), radica=False)
    S.urto(M, w, t + 0.1, h)


def bara(S, M, rnd, insieme, aperta=False, urto=True):
    """Una bara di legno scuro, con le maniglie di ferro e la croce sul coperchio."""
    L = 2.0
    def sagoma(k=1.0):
        return [(-0.17 * k, -L / 2 * k), (0.17 * k, -L / 2 * k), (0.33 * k, (L / 2 - 0.5) * k), (0.2 * k, L / 2 * k), (-0.2 * k, L / 2 * k), (-0.33 * k, (L / 2 - 0.5) * k)]
    scuro = (0.62, 0.52, 0.45)
    S.metti(piatto(sagoma(), 0.36), insieme, 'legno', M, uv=0.9, tinta=scuro, liscia=False)
    S.metti(piatto(sagoma(1.05), 0.03, z0=0.0), insieme, 'legno', M, uv=0.9, tinta=(0.45, 0.38, 0.33), liscia=False)
    Mc = M @ (T(0.42, 0.1, 0.02) @ R(0.3, 0.0, -1.25) if aperta else T(0, 0, 0.36))
    S.metti(piatto(sagoma(1.04), 0.06), insieme, 'legno', Mc, uv=0.9, tinta=(0.7, 0.6, 0.52), liscia=False)
    S.metti(scatola(0.05, 0.9, 0.014, z0=0.06), insieme, 'ferro', Mc @ T(0, 0.15, 0), radica=False)
    S.metti(scatola(0.34, 0.05, 0.014, z0=0.06), insieme, 'ferro', Mc @ T(0, 0.4, 0), radica=False)
    if aperta:
        S.metti(piatto(sagoma(0.9), 0.02, z0=0.33), insieme, 'colore', M, tinta=(0.03, 0.03, 0.03), radica=False, liscia=False)
    for lato in (-1, 1):
        for y in (-0.55, 0.0, 0.5):
            x = 0.24 + (0.07 if y > 0.2 else (0.02 if y > -0.2 else -0.03))
            S.metti(scatola(0.03, 0.2, 0.03, z0=0.18), insieme, 'ferro', M @ T(lato * (x + 0.03), y, 0), radica=False)
    if urto:
        S.urto(M, 0.66, L, 0.42)


def sarcofago(S, M, rnd, insieme):
    seme = rnd.random() * 70
    materia = 'muschio' if rnd.random() < 0.4 else 'pietra'
    S.metti(scatola(1.3, 2.6, 0.2, z0=-0.04, tagli=2, rumore=0.015, seme=seme), insieme, materia, M, uv=1.3)
    S.metti(scatola(1.0, 2.25, 0.75, z0=0.14, tagli=2, rumore=0.014, seme=seme + 2), insieme, materia, M, uv=1.3)
    # il coperchio a spiovente, un po' spostato come se qualcuno l'avesse smosso
    Mc = M @ T(rnd.uniform(-0.12, 0.12), rnd.uniform(-0.1, 0.1), 0.89) @ R(rnd.uniform(-0.08, 0.08))
    tetto = prisma([(-0.56, 0), (0.56, 0), (0.56, 0.1), (0, 0.3), (-0.56, 0.1)], 2.4, tagli=1, rumore=0.012, seme=seme + 4)
    bmesh.ops.rotate(tetto, verts=tetto.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(0, 3, 'Z'))
    S.metti(tetto, insieme, materia, Mc, uv=1.3)
    S.urto(M, 1.1, 2.4, 1.2)


def cancellata(S, a0, b0, a1, b1, rnd, insieme, posa, alta=1.55, salta=0.07):
    """Un tratto di cancellata di ferro fra due punti: due correnti e una fila di sbarre a punta di lancia.
    Qualche sbarra manca, qualcuna è piegata."""
    lung = math.hypot(a1 - a0, b1 - b0)
    n = max(2, round(lung / 0.3))
    giro = math.atan2(a1 - a0, b1 - b0) + math.pi / 2
    bassi, alti = [], []
    for i in range(n + 1):
        t = i / n
        a, b = a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
        M = posa(a, b, giro)
        bassi.append((M @ Vector((0, 0, 0.3)), 0.022))
        alti.append((M @ Vector((0, 0, alta - 0.28)), 0.022))
        if 0 < i < n and rnd.random() > salta:
            piega = R(0, rnd.uniform(-0.25, 0.25), rnd.uniform(-0.1, 0.1)) if rnd.random() < 0.08 else Matrix.Identity(4)
            S.metti(scatola(0.024, 0.024, alta, z0=0.02), insieme, 'ferro', M @ piega, radica=False, liscia=False)
            S.metti(cilindro(0.04, 0.0, 0.16, 4, z0=alta + 0.02), insieme, 'ferro', M @ piega, radica=False, liscia=False)
    S.metti(tubo(bassi, 4), insieme, 'ferro', radica=False, liscia=False)
    S.metti(tubo(alti, 4), insieme, 'ferro', radica=False, liscia=False)
    S.urto(posa((a0 + a1) / 2, (b0 + b1) / 2, giro), lung, 0.25, alta + 0.2)


def pilastro(S, M, rnd, insieme, alto=2.1, largo=0.6):
    seme = rnd.random() * 60
    S.metti(scatola(largo, largo, alto, z0=-0.1, tagli=2, rumore=0.025, seme=seme), insieme, 'muro', M, uv=1.6)
    S.metti(scatola(largo + 0.22, largo + 0.22, 0.16, z0=alto - 0.1, tagli=1, rumore=0.012, seme=seme), insieme, 'pietra', M, uv=1.2)
    punta = cilindro((largo + 0.1) * 0.72, 0.0, 0.34, 4, z0=alto + 0.06)
    bmesh.ops.rotate(punta, verts=punta.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(punta, insieme, 'pietra', M, uv=1.2, liscia=False)
    S.urto(M, largo + 0.1, largo + 0.1, alto)


def lanterna(S, M, rnd, insieme, alta=2.7, forza=1.0):
    """Un lampione di ferro battuto con il ricciolo in cima e la lanterna appesa."""
    h = alta
    S.metti(cilindro(0.1, 0.06, 0.28, 8), insieme, 'ferro', M, radica=False)
    palo = [((0, 0, 0.1), 0.045), ((0, 0, h * 0.5), 0.04), ((0, 0, h - 0.3), 0.035), ((0.04, 0, h - 0.08), 0.03), ((0.18, 0, h + 0.04), 0.028),
            ((0.34, 0, h - 0.02), 0.025), ((0.42, 0, h - 0.16), 0.022), ((0.36, 0, h - 0.26), 0.018)]
    S.metti(tubo(palo, 6), insieme, 'ferro', M, radica=False)
    Ml = M @ T(0.42, 0, h - 0.62)
    S.metti(scatola(0.012, 0.012, 0.16, z0=0.3), insieme, 'ferro', Ml, radica=False)
    S.metti(scatola(0.2, 0.2, 0.26, z0=0.02), insieme, 'luce', Ml, radica=False, liscia=False)
    for (x, y) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        S.metti(scatola(0.022, 0.022, 0.3), insieme, 'ferro', Ml @ T(x * 0.105, y * 0.105, 0), radica=False, liscia=False)
    tetto = cilindro(0.2, 0.03, 0.12, 4, z0=0.28)
    bmesh.ops.rotate(tetto, verts=tetto.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(tetto, insieme, 'ferro', Ml, radica=False, liscia=False)
    S.metti(scatola(0.24, 0.24, 0.025, z0=-0.005), insieme, 'ferro', Ml, radica=False, liscia=False)
    S.luce(Ml, 'lanterna', forza, (0, 0, 0.15))
    S.urto_tondo(M, 0.14, h)


# ------------------------------------------------------------------------------------------------ il bosco


def masso(S, M, rnd, insieme, r=0.6, muschio=None, urto=None):
    muschio = rnd.random() < 0.45 if muschio is None else muschio
    sc = (rnd.uniform(0.8, 1.3), rnd.uniform(0.8, 1.3), rnd.uniform(0.55, 0.9))
    S.metti(sfera(r, 2, 0.32, rnd.random() * 99, sc, z0=r * sc[2] * 0.45), insieme, 'muschio' if muschio else 'pietra', M @ R(rnd.uniform(0, 6.28)), uv=1.4)
    if urto if urto is not None else r > 0.75:
        S.urto_tondo(M, r * 0.9, r * 1.2)


def ceppo(S, M, rnd, insieme):
    r, h = rnd.uniform(0.28, 0.5), rnd.uniform(0.35, 0.8)
    S.metti(tubo([((0, 0, -0.15), r * 1.25), ((0, 0, h * 0.4), r), ((0.03, 0, h), r * 0.92)], 9, giri=2, tappo=False), insieme, 'corteccia', M)
    S.metti(cilindro(r * 0.92, r * 0.9, 0.02, 9, z0=h - 0.005), insieme, 'legno', M @ T(0.03, 0, 0), uv=0.7, tinta=(1.25, 1.1, 0.9), radica=False)
    for k in range(rnd.randint(3, 5)):
        a = k * 1.4 + rnd.random()
        S.metti(tubo([((math.cos(a) * r * 0.6, math.sin(a) * r * 0.6, 0.25), r * 0.4), ((math.cos(a) * r * 1.7, math.sin(a) * r * 1.7, 0.02), r * 0.24), ((math.cos(a) * r * 2.8, math.sin(a) * r * 2.8, -0.18), r * 0.08)], 6), insieme, 'corteccia', M)
    S.urto_tondo(M, r, h)


def tronco_caduto(S, M, rnd, insieme, lungo=None):
    lungo = lungo or rnd.uniform(2.5, 5.5)
    r = rnd.uniform(0.18, 0.34)
    pt = [((0, -lungo / 2 + lungo * i / 6, r * 0.75 + math.sin(i * 1.3) * 0.05), r * (1 - i * 0.07)) for i in range(7)]
    S.metti(tubo(pt, 9, giri=2), insieme, 'corteccia', M)
    for k in range(rnd.randint(1, 3)):   # i mozziconi dei rami
        y = rnd.uniform(-lungo * 0.3, lungo * 0.4)
        a = rnd.uniform(0.3, 2.8)
        S.metti(tubo([((0, y, r * 0.8), r * 0.35), ((math.cos(a) * 0.5, y + 0.15, r * 0.8 + math.sin(a) * 0.5), r * 0.2), ((math.cos(a) * 0.9, y + 0.3, r * 0.8 + math.sin(a) * 0.9), 0.03)], 5), insieme, 'corteccia', M)
    S.urto(M, r * 2, lungo, r * 1.6)


def funghi(S, M, rnd, insieme, quanti=None):
    colore = rnd.choice(((0.75, 0.12, 0.08), (0.8, 0.45, 0.12), (0.55, 0.4, 0.28), (0.82, 0.78, 0.66)))
    for _ in range(quanti or rnd.randint(3, 7)):
        a, d = rnd.uniform(0, 6.28), rnd.uniform(0.0, 0.45)
        h, r = rnd.uniform(0.07, 0.22), rnd.uniform(0.05, 0.13)
        Mf = M @ T(math.cos(a) * d, math.sin(a) * d, 0) @ R(0, rnd.uniform(-0.25, 0.25), rnd.uniform(-0.25, 0.25))
        S.metti(cilindro(r * 0.3, r * 0.22, h, 6), insieme, 'colore', Mf, tinta=(0.85, 0.82, 0.72), radica=False)
        S.metti(sfera(r, 1, 0, 0, (1, 1, 0.55), z0=h), insieme, 'colore', Mf, tinta=colore, radica=False)


def teschio(S, M, rnd, insieme, z=0.0):
    Mt = M @ T(0, 0, z) @ R(rnd.uniform(-0.6, 0.6), rnd.uniform(-0.2, 0.2))
    S.metti(sfera(0.11, 2, 0, 0, (0.9, 1.05, 0.95), z0=0.11), insieme, 'colore', Mt, tinta=OSSO, radica=False)
    S.metti(scatola(0.11, 0.08, 0.07, z0=-0.0), insieme, 'colore', Mt @ T(0, -0.06, 0.0), tinta=OSSO, radica=False)
    for x in (-0.04, 0.04):
        S.metti(sfera(0.027, 1, z0=0.115), insieme, 'colore', Mt @ T(x, -0.095, 0), tinta=NERO, radica=False)


def ossa(S, M, rnd, insieme, quante=None):
    for _ in range(quante or rnd.randint(3, 6)):
        l = rnd.uniform(0.25, 0.5)
        Mo = M @ T(rnd.uniform(-0.4, 0.4), rnd.uniform(-0.4, 0.4), 0.03) @ R(rnd.uniform(0, 6.28), rnd.uniform(-0.1, 0.1))
        S.metti(tubo([((0, -l / 2, 0), 0.035), ((0, -l / 2 + 0.05, 0), 0.018), ((0, l / 2 - 0.05, 0), 0.018), ((0, l / 2, 0), 0.035)], 5), insieme, 'colore', Mo, tinta=OSSO, radica=False)
    if rnd.random() < 0.6:
        teschio(S, M @ T(rnd.uniform(-0.2, 0.2), rnd.uniform(-0.2, 0.2), 0), rnd, insieme)


def corvo(S, M, rnd, insieme):
    """Un corvo appollaiato."""
    Mc = M @ R(rnd.uniform(0, 6.28))
    S.metti(sfera(0.1, 2, 0, 0, (0.85, 1.9, 1.0), z0=0.13), insieme, 'colore', Mc @ R(0, 0.5), tinta=NERO, radica=False)
    S.metti(sfera(0.062, 2, z0=0.27), insieme, 'colore', Mc @ T(0, -0.13, 0), tinta=NERO, radica=False)
    S.metti(cilindro(0.022, 0.0, 0.09, 5), insieme, 'colore', Mc @ T(0, -0.18, 0.265) @ R(0, math.pi / 2), tinta=(0.12, 0.11, 0.1), radica=False)
    S.metti(scatola(0.09, 0.2, 0.02), insieme, 'colore', Mc @ T(0, 0.2, 0.1) @ R(0, -0.35), tinta=NERO, radica=False)


def sterpo(S, M, rnd, insieme, grande=1.3):
    """Un cespuglio secco: tre cartoncini incrociati con il ritratto dei rametti."""
    for k in range(3):
        q = rnd.randrange(4)
        u0, v1 = (q % 2) * 0.5, 1 - (q // 2) * 0.5
        S.metti(carta(grande, grande, u0, v1 - 0.5, u0 + 0.5, v1), insieme, 'rametti', M @ R(k * 1.05 + rnd.random() * 0.4, rnd.uniform(-0.25, 0.25)) @ T(0, 0, -grande * 0.08), radica=False, liscia=False, tinta=(0.8, 0.8, 0.8))


def zucca(S, M, rnd, insieme, intagliata=False):
    r = rnd.uniform(0.2, 0.38)
    bm = sfera(r, 2)
    for v in bm.verts:
        f = 1 + 0.085 * math.cos(8 * math.atan2(v.co.y, v.co.x))
        v.co = Vector((v.co.x * f, v.co.y * f, v.co.z * 0.74 + r * 0.7))
    colore = (rnd.uniform(0.7, 0.9), rnd.uniform(0.28, 0.42), 0.05)
    Mz = M @ R(rnd.uniform(-0.3, 0.3), rnd.uniform(-0.12, 0.12))
    S.metti(bm, insieme, 'colore', Mz, tinta=colore)
    S.metti(tubo([((0, 0, r * 1.38), 0.035), ((0.02, 0, r * 1.38 + 0.07), 0.028), ((0.06, 0, r * 1.38 + 0.12), 0.02)], 5), insieme, 'colore', Mz, tinta=(0.2, 0.24, 0.08), radica=False)
    if intagliata:
        d = r * 1.07
        for x in (-0.36, 0.36):   # gli occhi a triangolo
            S.metti(prisma([(-0.2 * r, 0), (0.2 * r, 0), (0, 0.26 * r)], 0.02), insieme, 'luce', Mz @ T(x * r, -d * 0.93, r * 0.78) @ R(-x * 0.42), radica=False, liscia=False)
        denti = [(-0.5 * r, 0.1 * r), (-0.3 * r, 0.0), (-0.15 * r, 0.09 * r), (0, -0.02 * r), (0.15 * r, 0.09 * r), (0.3 * r, 0.0), (0.5 * r, 0.1 * r), (0.3 * r, -0.14 * r), (0, -0.2 * r), (-0.3 * r, -0.14 * r)]
        S.metti(prisma(denti, 0.02), insieme, 'luce', Mz @ T(0, -d * 0.97, r * 0.5), radica=False, liscia=False)
        S.luce(Mz, 'zucca', 0.7, (0, -d, r * 0.7))


def staccionata(S, punti, rnd, insieme, posa, alta=1.05):
    """Una staccionata storta di legno lungo una fila di punti del gioco."""
    pali = []
    for i in range(len(punti) - 1):
        (a0, b0), (a1, b1) = punti[i], punti[i + 1]
        n = max(1, round(math.hypot(a1 - a0, b1 - b0) / 1.7))
        for k in range(n + (1 if i == len(punti) - 2 else 0)):
            t = k / n
            pali.append((a0 + (a1 - a0) * t + rnd.uniform(-0.08, 0.08), b0 + (b1 - b0) * t + rnd.uniform(-0.08, 0.08)))
    cime = []
    for (a, b) in pali:
        h = alta * rnd.uniform(0.85, 1.12)
        M = posa(a, b, rnd.uniform(0, 6.28), -0.15, (rnd.uniform(-0.12, 0.12), rnd.uniform(-0.12, 0.12)))
        S.metti(scatola(0.11, 0.11, h + 0.15, smusso=0.012), insieme, 'legno', M, uv=0.8)
        cime.append((M @ Vector((0, 0, h * 0.45)), M @ Vector((0, 0, h * 0.88))))
    for i in range(len(cime) - 1):
        if rnd.random() < 0.12:
            continue    # un'asse che manca
        for k in (0, 1):
            p, q = cime[i][k], cime[i + 1][k]
            m = (p + q) / 2 + Vector((0, 0, -0.05))
            S.metti(tubo([(p, 0.04), (m, 0.04), (q, 0.04)], 4), insieme, 'legno', radica=False, liscia=False)
        (a0, b0), (a1, b1) = pali[i], pali[i + 1]
        S.urto(posa((a0 + a1) / 2, (b0 + b1) / 2, math.atan2(a1 - a0, b1 - b0) + math.pi / 2), math.hypot(a1 - a0, b1 - b0), 0.2, alta)


def spaventapasseri(S, M, rnd, insieme):
    S.metti(scatola(0.09, 0.09, 2.3, z0=-0.2, smusso=0.01), insieme, 'legno', M, uv=0.8)
    S.metti(scatola(1.7, 0.07, 0.07, z0=1.52, smusso=0.01), insieme, 'legno', M @ R(0, 0, 0.08), uv=0.8, radica=False)
    sacco = (0.5, 0.42, 0.28)
    S.metti(sfera(0.2, 2, 0.12, 5, (1, 1, 1.1), z0=1.95), insieme, 'colore', M, tinta=sacco, radica=False)
    S.metti(cilindro(0.38, 0.34, 0.03, 10, z0=2.1), insieme, 'colore', M @ R(0, 0.1, 0.12), tinta=NERO, radica=False)
    S.metti(tubo([((0, 0, 2.12), 0.19), ((0.02, 0, 2.32), 0.13), ((0.1, 0, 2.5), 0.06), ((0.22, 0, 2.58), 0.01)], 8), insieme, 'colore', M @ R(0, 0.1, 0.12), tinta=NERO, radica=False)
    panno = (0.2, 0.16, 0.13)
    S.metti(scatola(0.62, 0.16, 0.85, z0=0.72, tagli=2, rumore=0.05, seme=3), insieme, 'colore', M, tinta=panno, radica=False)
    for lato in (-1, 1):
        S.metti(scatola(0.62, 0.13, 0.2, z0=1.42, tagli=1, rumore=0.03, seme=lato), insieme, 'colore', M @ T(lato * 0.55, 0, 0) @ R(0, 0, lato * 0.08), tinta=panno, radica=False)
        for k in range(5):   # la paglia che esce dalle maniche
            S.metti(cilindro(0.012, 0.0, 0.26, 3), insieme, 'colore', M @ T(lato * 0.88, 0, 1.5) @ R(0, rnd.uniform(-0.6, 0.6), lato * (1.2 + rnd.uniform(-0.5, 0.5))), tinta=(0.75, 0.62, 0.25), radica=False)
    for x in (-0.07, 0.07):
        S.metti(sfera(0.028, 1, z0=1.99), insieme, 'colore', M @ T(x, -0.19, 0), tinta=NERO, radica=False)
    S.urto_tondo(M, 0.2, 2.2)


def menhir(S, M, rnd, insieme, alto=None, rune=True):
    """Una pietra dritta del cerchio: alta, storta, rastremata, con qualche runa che brilla."""
    h = alto or rnd.uniform(2.8, 4.2)
    w, t = rnd.uniform(0.85, 1.25), rnd.uniform(0.5, 0.75)
    bm = scatola(w, t, h, z0=-0.4, tagli=3)
    for v in bm.verts:
        k = 1 - 0.3 * max(0.0, v.co.z / h)
        v.co.x *= k
        v.co.y *= k
    sgualcisci(bm, 0.1, rnd.random() * 77, 0.9)
    S.metti(bm, insieme, 'muschio' if rnd.random() < 0.5 else 'pietra', M, uv=1.6)
    if rune:
        z = rnd.uniform(1.2, 1.9)
        y = -t / 2 * (1 - 0.3 * z / h) - 0.035
        segni = rnd.choice(([(0, 0, 0.5, 0), (-0.12, 0.25, 0.3, 0.6), (0.12, 0.25, 0.3, -0.6)], [(0, 0, 0.5, 0), (0.1, 0.1, 0.28, 0.8), (0.1, -0.1, 0.28, -0.8)], [(-0.1, 0, 0.5, 0.25), (0.1, 0, 0.5, -0.25), (0, 0, 0.2, 1.57)]))
        for (x, dz, l, a) in segni:
            S.metti(scatola(0.045, 0.02, l, z0=-l / 2), insieme, 'runa', M @ T(x, y, z + dz) @ R(0, 0, a), radica=False, liscia=False)
        S.luce(M, 'runa', 0.8, (0, y - 0.1, z))
    S.urto(M, w * 0.9, t, h * 0.8)


def albero(S, a, b, rnd, posa, alto=10.0, grosso=0.7, insieme='alberi'):
    """Un grande albero contorto: radici che affiorano, tronco nodoso, rami che si dividono tre volte, e in cima a
    ogni ramo i cartoncini dei rametti."""
    M = posa(a, b, rnd.uniform(0, 6.28), -0.3)
    cime = []

    def ramo(da, dir0, lungo, raggio, livello, passi, cala=0.8):
        p, d, pt = Vector(da), Vector(dir0).normalized(), [(Vector(da), raggio)]
        for i in range(1, passi + 1):
            t = i / passi
            dev = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.5, 1))) * (0.2 + 0.1 * livello)
            d = (d + dev + Vector((0, 0, 0.12 * livello))).normalized()
            p = p + d * (lungo / passi)
            pt.append((p.copy(), raggio * (1 - t * cala) + 0.005))
        S.metti(tubo(pt, (11, 8, 6, 5)[livello], giri=(3, 2, 1, 1)[livello]), insieme, 'corteccia', M, radica=livello == 0)
        return pt

    tronco = ramo((0, 0, 0), (rnd.uniform(-0.15, 0.15), rnd.uniform(-0.15, 0.15), 1), alto * 0.62, grosso, 0, 10, 0.5)
    for k in range(rnd.randint(5, 7)):   # le radici
        an = k * 1.05 + rnd.uniform(-0.3, 0.3)
        c, s = math.cos(an), math.sin(an)
        l = rnd.uniform(1.6, 2.8) * grosso / 0.6
        S.metti(tubo([((c * grosso * 0.5, s * grosso * 0.5, 0.75), grosso * 0.42), ((c * grosso * 1.3, s * grosso * 1.3, 0.38), grosso * 0.3), ((c * l * 0.7, s * l * 0.7, 0.12), grosso * 0.17), ((c * l, s * l, -0.25), 0.04)], 7, giri=1), insieme, 'corteccia', M)
    n1 = rnd.randint(5, 7)
    for k in range(n1):
        p, r = tronco[rnd.randint(4, 10)]
        an = k / n1 * math.tau + rnd.uniform(-0.4, 0.4)
        b1 = ramo(p, (math.cos(an), math.sin(an), rnd.uniform(0.2, 0.9)), rnd.uniform(0.35, 0.55) * alto, r * 0.6, 1, 7)
        for _ in range(rnd.randint(3, 4)):
            q, r2 = b1[rnd.randint(2, 7)]
            an2 = an + rnd.uniform(-1.2, 1.2)
            b2 = ramo(q, (math.cos(an2), math.sin(an2), rnd.uniform(0.1, 1.0)), rnd.uniform(0.18, 0.3) * alto, r2 * 0.62, 2, 5)
            for (ix, sc) in ((5, 1.0), (3, 0.8)):
                cime.append((b2[ix][0], (b2[ix][0] - b2[ix - 1][0]).normalized(), sc * rnd.uniform(0.85, 1.25)))
        cime.append((b1[7][0], (b1[7][0] - b1[6][0]).normalized(), 1.25))
    cime.append((tronco[10][0], (tronco[10][0] - tronco[9][0]).normalized(), 1.5))
    for (p, d, sc) in cime:
        lato = 2.4 * sc * alto / 7.5
        x = d.cross(Vector((0, 0, 1)) if abs(d.z) < 0.9 else Vector((1, 0, 0))).normalized()
        y = d.cross(x)
        g = rnd.uniform(0, math.pi)
        q = rnd.randrange(4)
        u0, v1 = (q % 2) * 0.5, 1 - (q // 2) * 0.5
        for an in (g, g + math.pi / 2):
            ax = x * math.cos(an) + y * math.sin(an)
            base = Matrix((ax, d.cross(ax), d)).transposed().to_4x4()
            base.translation = p - d * (0.08 * lato)
            S.metti(carta(lato, lato, u0, v1 - 0.5, u0 + 0.5, v1), insieme, 'rametti', M @ base, radica=False, liscia=False, tinta=(0.8, 0.8, 0.8))
    S.urto_tondo(M, grosso * 0.95, 5.0)
    S.occupa(a, b, grosso + 1.2)
    return M
