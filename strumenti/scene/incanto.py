"""I pezzi dello stile disegnato (il posto di prova: le Rovine del Cristallo): cristalli che brillano, pilastri con
la lanterna, colonne e archi in rovina coperti di muschio, la sfera armillare, la sala gotica, la torre con il
grande cristallo, l'acquedotto, la cascata, le rocce a pennellate. Le materie sono dipinte dal codice (dipingi.py)."""
import math

import bmesh
from mathutils import Matrix, Vector

import terreno
from attrezzi import R, T, arco, cilindro, prisma, scatola, sfera, sgualcisci, tubo
from paese import arco_tondo, fusto, muro_con_arco, stendardo, tetto

PIETRA = (0.88, 0.85, 0.97)        # la pietra chiara, appena viola
OMBRA = (0.62, 0.58, 0.78)         # la stessa, per ciò che sta in ombra o è più vecchio
MUSCHIO = (0.36, 0.6, 0.3)         # ciò che cresce sopra
BRONZO = (0.62, 0.42, 0.16)
VIOLA = (0.3, 0.17, 0.5)           # gli stendardi
ORO = (0.95, 0.78, 0.38)


def cristallo(S, M, I, alto=1.2, r=None, forza=0.8, luce=True, tipo='cristallo'):
    """Un cristallo viola che brilla: un prisma a sei facce con due punte."""
    r = r or alto * 0.2
    S.metti(cilindro(0.0, r, alto * 0.16, 6), I, 'cristallo', M, radica=False, liscia=False, tinta=(0.6, 0.55, 0.9))
    S.metti(cilindro(r, r * 0.84, alto * 0.6, 6, z0=alto * 0.16, tappi=False), I, 'cristallo', M, radica=False, liscia=False, tinta=(0.82, 0.78, 1.0))
    S.metti(cilindro(r * 0.84, 0.0, alto * 0.24, 6, z0=alto * 0.76), I, 'cristallo', M, radica=False, liscia=False)
    if luce:
        S.luce(M, tipo, forza, (0, 0, alto * 0.6))


def cristalli(S, M, rnd, I, quanti=4, alto=1.0, raggio=0.6, forza=0.8):
    """Un ciuffo di cristalli che spunta da terra: uno grande in mezzo e gli altri storti attorno."""
    for k in range(quanti):
        an, d = rnd.uniform(0, math.tau), (raggio * (0.5 + 0.5 * rnd.random()) if k else 0.0)
        h = alto * (1.0 if k == 0 else rnd.uniform(0.35, 0.7))
        storto = 0.0 if k == 0 else 0.4
        cristallo(S, M @ T(math.cos(an) * d, math.sin(an) * d, -0.12) @ R(rnd.uniform(0, 6), rnd.uniform(-storto, storto), rnd.uniform(-storto, storto)), I, h, h * 0.21, forza, luce=k == 0)
    S.occupa(M.translation.x, -M.translation.y, raggio + 0.8)


def lanternone(S, M, I, forza=1.2):
    """Una grande lanterna di bronzo, con il vetro acceso e il tettuccio a punta. `M` sta sotto i suoi piedi."""
    S.metti(scatola(0.62, 0.62, 0.1), I, 'colore', M, tinta=BRONZO, radica=False, liscia=False)
    for (x, y) in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
        S.metti(scatola(0.07, 0.07, 0.62, z0=0.1), I, 'colore', M @ T(x * 0.24, y * 0.24, 0), tinta=BRONZO, radica=False, liscia=False)
    S.metti(scatola(0.44, 0.44, 0.58, z0=0.12), I, 'luce', M, radica=False, liscia=False)
    tetto_ = cilindro(0.5, 0.05, 0.34, 4, z0=0.72)
    bmesh.ops.rotate(tetto_, verts=tetto_.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, 'Z'))
    S.metti(tetto_, I, 'colore', M, tinta=BRONZO, radica=False, liscia=False)
    S.metti(tubo([((math.cos(t / 8 * math.tau) * 0.08, 0, 1.12 + math.sin(t / 8 * math.tau) * 0.08), 0.018) for t in range(9)], 4, tappo=False), I, 'colore', M, tinta=BRONZO, radica=False)
    S.luce(M, 'lanterna', forza, (0, 0, 0.45))


def pilastro_lanterna(S, M, rnd, I, alto=1.5):
    """Un pilastro di pietre squadrate con il lanternone sopra, come quelli ai capi del ponte."""
    S.metti(scatola(0.95, 0.95, alto + 0.5, z0=-0.5, tagli=1, rumore=0.02, seme=rnd.random() * 9), I, 'blocchi', M, uv=3.4, tinta=PIETRA, cima=MUSCHIO)
    S.metti(scatola(1.18, 1.18, 0.2, z0=alto - 0.02, tagli=1, rumore=0.012), I, 'blocchi', M, uv=3.4, tinta=PIETRA, radica=False, cima=MUSCHIO)
    lanternone(S, M @ T(0, 0, alto + 0.18), I)
    S.urto(M, 1.0, 1.0, alto + 1.1)
    S.occupa(M.translation.x, -M.translation.y, 1.2)


def colonna(S, M, rnd, I, alta=5.0, r=0.45, rotta=False):
    """Una colonna: il basamento, il fusto, il capitello. Se è rotta finisce storta a mezza altezza."""
    if rotta:
        alta *= rnd.uniform(0.3, 0.6)
    S.metti(scatola(r * 2.7, r * 2.7, 0.75, z0=-0.4, tagli=1, rumore=0.02, seme=rnd.random() * 9), I, 'blocchi', M, uv=3.4, tinta=PIETRA, cima=MUSCHIO)
    S.metti(fusto(r, r * 0.88, alta, 10, z0=0.35, rumore=0.02, seme=rnd.random() * 9, fasce=3), I, 'blocchi', M, uv=3.4, tinta=PIETRA)
    if rotta:
        S.metti(cilindro(r * 0.88, r * 0.5, 0.3, 10, z0=alta + 0.35), I, 'blocchi', M @ R(0, 0.12, 0.08), uv=3.4, tinta=OMBRA, radica=False, cima=MUSCHIO)
    else:
        S.metti(scatola(r * 2.5, r * 2.5, 0.32, z0=alta + 0.35, tagli=1, rumore=0.015), I, 'blocchi', M, uv=3.4, tinta=PIETRA, radica=False, cima=MUSCHIO)
    S.urto_tondo(M, r * 1.1, alta + 0.6)
    S.occupa(M.translation.x, -M.translation.y, r + 1.0)


def maceria(S, M, rnd, I, quante=4, raggio=2.0):
    """Blocchi caduti, mezzi affondati nell'erba."""
    for _ in range(quante):
        an, d = rnd.uniform(0, math.tau), raggio * math.sqrt(rnd.random())
        S.metti(scatola(rnd.uniform(0.5, 1.1), rnd.uniform(0.4, 0.7), rnd.uniform(0.3, 0.55), z0=-0.12, tagli=1, rumore=0.03, seme=rnd.random() * 9), I, 'blocchi',
                M @ T(math.cos(an) * d, math.sin(an) * d, 0) @ R(rnd.uniform(0, 6), rnd.uniform(-0.3, 0.3), rnd.uniform(-0.2, 0.2)), uv=3.4, tinta=OMBRA, cima=MUSCHIO)


def arco_rovina(S, M, rnd, I, larga=5.0, alta=8.0, spessa=1.4, rotto=False, bandiera=False):
    """Un grande arco di pietre squadrate, con il muschio sopra. Se è rotto ne restano i due piedritti, uno più basso,
    e i blocchi caduti ai piedi. Il davanti è verso -y."""
    lato = 1.6
    if rotto:
        for k, quanto in ((-1, 1.0), (1, rnd.uniform(0.4, 0.65))):
            S.metti(scatola(lato, spessa, alta * quanto + 0.6, z0=-0.6, tagli=3, rumore=0.045, seme=rnd.random() * 9), I, 'blocchi', M @ T(k * (larga + lato) / 2, 0, 0), uv=4.4, tinta=PIETRA, cima=MUSCHIO)
            S.urto(M @ T(k * (larga + lato) / 2, 0, 0), lato, spessa, alta * quanto)
        # un moncone d'arco che sporge dal piedritto più alto
        S.metti(scatola(larga * 0.45, spessa * 0.9, 1.1, tagli=2, rumore=0.05, seme=3), I, 'blocchi', M @ T(-larga * 0.3, 0, alta - 1.4) @ R(0, 0, -0.3), uv=4.4, tinta=OMBRA, radica=False, cima=MUSCHIO)
        maceria(S, M @ T(larga * 0.3, -1.5, 0), rnd, I, 5, 2.2)
    else:
        S.metti(muro_con_arco(larga + 2 * lato, alta + 0.6, larga, alta - 1.7, spessa, tagli=2, rumore=0.04, seme=rnd.random() * 9), I, 'blocchi', M @ T(0, 0, -0.6), uv=4.4, tinta=PIETRA, cima=MUSCHIO)
        for k in (-1, 1):
            S.urto(M @ T(k * (larga + lato) / 2, 0, 0), lato, spessa, alta)
        S.urto(M, larga + 2 * lato, spessa, 1.7, alta - 1.7)
    if bandiera:
        stendardo(S, M @ T(-(larga + lato) / 2, -spessa / 2 - 0.02, alta * 0.82), I, VIOLA, alta * 0.42, 1.1, ORO)
    S.occupa(M.translation.x, -M.translation.y, larga / 2 + 2.2)


def sfera_armillare(S, M, I):
    """La sfera armillare di bronzo su un basamento tondo a gradini, con il lume al centro."""
    z = -0.3
    for (r, h) in ((3.3, 0.6), (2.5, 0.3), (1.7, 0.3)):
        S.metti(cilindro(r, r, h, 20, z0=z), I, 'lastre', M, uv=4.4, tinta=PIETRA, radica=z < 0)
        S.urto_tondo(M, r, h, z)
        z += h
    S.metti(fusto(0.5, 0.36, 1.1, 10, z0=z, rumore=0.012, fasce=2), I, 'blocchi', M, uv=3.4, tinta=PIETRA, radica=False)
    S.urto_tondo(M, 0.5, 3.6, z)
    c = z + 1.1 + 1.75
    S.metti(tubo([((0, 0, z + 1.0), 0.07), ((0, 0, c - 1.5), 0.06)], 6), I, 'colore', M, tinta=BRONZO, radica=False)
    for (rx, ry, rz, raggio) in ((0.0, 0.0, 0.0, 1.5), (math.pi / 2, 0.0, 0.0, 1.42), (math.pi / 2, 0.0, 0.9, 1.34), (0.5, 0.35, 0.0, 1.26)):
        giro = [((math.cos(t / 28 * math.tau) * raggio, math.sin(t / 28 * math.tau) * raggio, 0), 0.055) for t in range(29)]
        S.metti(tubo(giro, 5, tappo=False), I, 'colore', M @ T(0, 0, c) @ R(rz, rx, ry), tinta=BRONZO, radica=False)
    S.metti(tubo([((-1.6, 0, 0), 0.03), ((1.6, 0, 0), 0.03)], 4), I, 'colore', M @ T(0, 0, c) @ R(0.3, 0, 0.5), tinta=BRONZO, radica=False)
    S.metti(sfera(0.32, 2), I, 'luce', M @ T(0, 0, c), radica=False)
    S.luce(M, 'lanterna', 1.0, (0, 0, c))
    S.occupa(M.translation.x, -M.translation.y, 4.2)


def sala(S, M, rnd, I, finestra):
    """La sala dell'accademia: muri di pietre squadrate, il timpano con il finestrone, il portale acceso in cima ai
    gradini, i contrafforti, il tetto d'ardesia viola con un pezzo crollato. Il davanti è verso -y."""
    W, D, H = 17.0, 9.5, 7.0
    S.metti(scatola(W, D, H + 0.8, z0=-0.8, tagli=4, rumore=0.04, seme=rnd.random() * 9), I, 'blocchi', M, uv=4.4, tinta=PIETRA)
    for s in (-1, 1):   # i due timpani
        S.metti(prisma([(-W / 2, 0), (W / 2, 0), (0, 5.4)], 0.6, tagli=1, rumore=0.03, seme=s), I, 'blocchi', M @ T(0, s * (D / 2 - 0.3), H), uv=4.4, tinta=PIETRA, radica=False)
    S.metti(tetto(D, W, 5.6, 0.5, curva=1.1), I, 'colore', M @ T(0, 0, H) @ R(math.pi / 2), tinta=(0.3, 0.26, 0.44), radica=False, liscia=False)
    for x in (-W / 2 - 0.4, -W / 6, W / 6, W / 2 + 0.4):   # i contrafforti, con il muschio sopra
        S.metti(prisma([(-0.6, 0), (0.6, 0), (0.6, 3.6), (-0.1, 5.2), (-0.6, 5.2)], 1.0, tagli=1, rumore=0.03, seme=x), I, 'blocchi', M @ T(x, -D / 2 - 0.45, -0.6) @ R(math.pi / 2), uv=4.4, tinta=OMBRA, cima=MUSCHIO)
    for x in (-6.0, -3.2, 3.2, 6.0):   # le finestre alte, accese
        finestra(S, M @ T(x, -D / 2 - 0.03, 1.6), I, 1.0, 3.6)
    finestra(S, M @ T(0, -D / 2 - 0.33, H + 0.6), I, 1.5, 3.2, 1.2)   # il finestrone del timpano
    for (y, g) in ((-2.4, 1), (2.4, 1), (-2.4, -1), (2.4, -1)):
        finestra(S, M @ T(g * (W / 2 + 0.03), y, 1.6) @ R(g * math.pi / 2), I, 1.0, 3.4)
    # il portale: i gradini, la porta accesa, i due pilastri con la lanterna, lo stendardo sopra
    for k in range(3):
        S.metti(scatola(5.4 - k * 0.8, 1.0, 0.22, z0=k * 0.22 - 0.02, tagli=1, rumore=0.012, seme=k), I, 'lastre', M @ T(0, -D / 2 - 2.6 + k * 0.8, 0), uv=3.4, tinta=PIETRA, radica=k == 0)
        S.urto(M @ T(0, -D / 2 - 2.6 + k * 0.8, 0), 5.4 - k * 0.8, 1.0, 0.2 + k * 0.22)
    Mp = M @ T(0, -D / 2, 0.66)
    S.metti(prisma(arco(2.1, 3.7, 6), 0.1), I, 'vetrata', Mp @ T(0, -0.06, 0), uv=1.4, radica=False, liscia=False)
    S.metti(tubo([((x, 0, z), 0.16) for (x, z) in arco(2.4, 3.9, 6)], 5, tappo=False), I, 'blocchi', Mp @ T(0, -0.1, 0), tinta=PIETRA, radica=False)
    S.luce(Mp, 'finestra', 1.3, (0, -0.5, 1.8))
    stendardo(S, Mp @ T(-3.2, -0.6, 5.6), I, VIOLA, 3.4, 1.1, ORO)
    stendardo(S, Mp @ T(3.2, -0.6, 5.6), I, VIOLA, 3.4, 1.1, ORO)
    S.urto(M, W + 0.2, D + 0.2, H + 5.0)
    S.occupa(M.translation.x, -M.translation.y, 11.5)


def torre_cristallo(S, M, rnd, I):
    """La torre in rovina sulla rupe: tre giri di arcate sempre più stretti, dentro una colonna di cristallo che fa
    luce viola dalle aperture, e in cima il grande cristallo sospeso. Restituisce l'altezza del cristallo."""
    z = -1.5
    for k, (r, h) in enumerate(((5.6, 9.5), (4.5, 8.0), (3.5, 6.5))):
        S.metti(fusto(r + 0.25, r, 2.0 if k else 3.4, 14, z0=z, rumore=0.05, seme=rnd.random() * 9, fasce=2), I, 'blocchi', M, uv=4.4, tinta=PIETRA if k else OMBRA, radica=k == 0)
        base = z + (2.0 if k else 3.4)
        quanti = 8 if k < 2 else 6
        for i in range(quanti):   # i piedritti delle arcate; qualcuno è crollato
            if k > 0 and rnd.random() < 0.22:
                continue
            an = (i + 0.5 * k) / quanti * math.tau
            S.metti(scatola(1.25, 0.9, h - 3.0, tagli=1, rumore=0.035, seme=i + k), I, 'blocchi', M @ R(an) @ T(0, -r + 0.45, base), uv=4.4, tinta=PIETRA, radica=False)
        if k < 2 or True:
            S.metti(fusto(r + 0.2, r + 0.2, 1.2, 14, z0=base + h - 3.0, rumore=0.04, seme=rnd.random() * 9, fasce=1), I, 'blocchi', M, uv=4.4, tinta=PIETRA, radica=False, cima=MUSCHIO)
        z = base + h - 1.8
    # la colonna di cristallo dentro, e la luce viola che esce dalle arcate
    S.metti(cilindro(1.7, 1.2, z + 1.0, 6, z0=0.0), I, 'cristallo', M, radica=False, liscia=False, tinta=(0.7, 0.62, 0.95))
    for zc in (6.0, 13.5, 20.0):
        S.luce(M, 'cristallo', 1.4, (0, 0, zc))
    # in cima la corona spezzata e il grande cristallo sospeso
    for i in range(5):
        an = i / 5 * math.tau + 0.3
        S.metti(scatola(0.9, 0.7, rnd.uniform(1.2, 3.2), tagli=1, rumore=0.04, seme=i), I, 'blocchi', M @ R(an) @ T(0, -3.2, z), uv=4.4, tinta=OMBRA, radica=False, cima=MUSCHIO)
    cima = z + 2.6
    cristallo(S, M @ T(0, 0, cima), I, 10.5, 2.0, 2.0, tipo='cristallone')
    for i in range(4):   # schegge che le girano attorno
        an = i / 4 * math.tau + 0.6
        cristallo(S, M @ T(math.cos(an) * 3.4, math.sin(an) * 3.4, cima + 2.0 + i * 1.2) @ R(an, 0.3, 0.2), I, 1.8, 0.38, luce=False)
    for an in (-0.5, 0.6):
        stendardo(S, M @ R(an) @ T(0, -5.95, 7.4), I, VIOLA, 5.0, 1.5, ORO)
    S.urto_tondo(M, 5.8, z + 2.0)
    S.occupa(M.translation.x, -M.translation.y, 7.5)
    return cima + 4.0


def acquedotto(S, pa, pb, quota, rnd, I, larga=7.5):
    """Un acquedotto ad arcate fra due punti del gioco, con il canale in cima a quota fissa: le pile scendono fin dove
    trovano il terreno, quindi dove il suolo è basso le arcate sono altissime."""
    (a0, b0), (a1, b1) = pa, pb
    lungo = math.hypot(a1 - a0, b1 - b0)
    n = max(1, round(lungo / larga))
    passo = lungo / n
    giro = math.atan2(a1 - a0, b1 - b0) + math.pi / 2
    for k in range(n):
        t0, t1 = k / n, (k + 1) / n
        am, bm_ = a0 + (a1 - a0) * (t0 + t1) / 2, b0 + (b1 - b0) * (t0 + t1) / 2
        suolo = min(terreno.terra(a0 + (a1 - a0) * t, b0 + (b1 - b0) * t) for t in (t0, (t0 + t1) / 2, t1)) - 1.0
        alta = quota - suolo
        M = T(am, -bm_, suolo) @ R(giro)
        if alta > 6.0:
            S.metti(muro_con_arco(passo + 0.04, alta, passo - 2.0, alta - 2.2, 1.7, tagli=2, rumore=0.04, seme=rnd.random() * 9), I, 'blocchi', M, uv=4.4, tinta=PIETRA, radica=False)
        else:
            S.metti(scatola(passo + 0.04, 1.7, alta, tagli=2, rumore=0.04, seme=rnd.random() * 9), I, 'blocchi', M, uv=4.4, tinta=PIETRA, radica=False)
        for s in (-1, 1):   # i due cordoli del canale, con il muschio
            S.metti(scatola(passo + 0.04, 0.4, 0.5, z0=alta, tagli=1, rumore=0.03, seme=k + s), I, 'blocchi', M @ T(0, s * 0.75, 0), uv=4.4, tinta=OMBRA, radica=False, cima=MUSCHIO)
        S.metti(scatola(passo, 1.1, 0.05, z0=alta + 0.3), I, 'cascata', M, uv=3.0, radica=False, liscia=False)
        for t in (t0, t1):
            a, b = a0 + (a1 - a0) * t, b0 + (b1 - b0) * t
            S.urto(T(a, -b, suolo) @ R(giro), 1.9, 1.7, alta + 0.6)
            S.occupa(a, b, 1.8)


def cascata(S, M, I, larga=5.0, alta=21.0, sporge=7.0, passi=12):
    """La cascata: un velo d'acqua che parte da `M` (il labbro, in alto) e cade verso -y, più la schiuma ai piedi.
    Le coordinate dell'immagine scorrono lungo la caduta: nel gioco è questo che la fa muovere."""
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new('uv')
    righe = []
    lung = 0.0
    prima = None
    for i in range(passi + 1):
        t = i / passi
        y, z = -sporge * (t ** 0.75), -alta * (t ** 1.7)
        if prima:
            lung += math.hypot(y - prima[0], z - prima[1])
        prima = (y, z)
        mezza = larga / 2 * (1 + 0.25 * t)
        righe.append([(bm.verts.new((s * mezza, y - abs(s) * 0.5 * t, z)), ((s + 1) / 2, lung / 5.0)) for s in (-1.0, -0.5, 0.0, 0.5, 1.0)])
    for i in range(passi):
        for k in range(4):
            q = (righe[i][k], righe[i][k + 1], righe[i + 1][k + 1], righe[i + 1][k])
            f = bm.faces.new([v for (v, _) in q])
            for lo, (_, uv) in zip(f.loops, q):
                lo[uvl].uv = uv
    S.metti(bm, I, 'cascata', M, radica=False)
    # la schiuma ai piedi: un disco chiaro appena sopra l'acqua
    schiuma = cilindro(larga * 0.9, larga * 0.9, 0.05, 14)
    S.metti(schiuma, I, 'cascata', M @ T(0, -sporge - 0.5, -alta + 0.12), uv=2.0, radica=False, tinta=(1.4, 1.4, 1.4))
    S.luce(M, 'spruzzo', 1.0, (0, -sporge, -alta + 0.8))


def rupe(S, M, rnd, I, r=3.0, alta=None, verde=True):
    """Un roccione a spigoli vivi, come dipinto a colpi di spatola, con l'erba sopra."""
    alta = alta or r * rnd.uniform(0.9, 1.5)
    bm = scatola(r * rnd.uniform(1.5, 2.0), r * rnd.uniform(1.3, 1.8), alta, z0=-alta * 0.15, tagli=2)
    for v in bm.verts:   # più stretto in cima che ai piedi
        k = 1.0 - 0.38 * max(0.0, (v.co.z + alta * 0.15) / alta)
        v.co.x *= k
        v.co.y *= k
    sgualcisci(bm, r * 0.3, rnd.random() * 99, 0.9 / r)
    S.metti(bm, I, 'rupe', M @ R(rnd.uniform(0, 6.28), rnd.uniform(-0.12, 0.12), rnd.uniform(-0.12, 0.12)), uv=5.0, tinta=(0.93, 0.9, 1.0), liscia=False, cima=(0.42, 0.66, 0.34) if verde else None)
    S.urto_tondo(M, r * 0.85, alta * 0.9)
    S.occupa(M.translation.x, -M.translation.y, r)
