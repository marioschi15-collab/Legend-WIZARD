"""Le materie «dipinte»: immagini fatte tutte dal codice (nessuna fotografia), per lo stile disegnato.

    python3 dipingi.py        (servono numpy e Pillow)

Scrive in public/materiali/scene: `blocchi.jpg` (muro di pietre squadrate), `lastre.jpg` (lastricato di pietre
irregolari), `rupe.jpg` (roccia a pennellate). Sono chiare e poco colorate: il colore vero lo danno le tinte dei
punti e la luce della zona. Si ripetono senza cuciture.
"""
import os

import numpy as np
from PIL import Image, ImageFilter

LATO = 512
QUI = os.path.dirname(os.path.abspath(__file__))
DOVE = os.path.join(os.path.dirname(os.path.dirname(QUI)), 'public', 'materiali', 'scene')


def macchie(seme, fitta, lato=LATO):
    """Macchie morbide che si ripetono senza cuciture: somma di onde con fasi a caso."""
    rnd = np.random.default_rng(seme)
    y, x = np.mgrid[0:lato, 0:lato] / lato * 2 * np.pi
    m = np.zeros((lato, lato))
    for _ in range(14):
        kx, ky = rnd.integers(-fitta, fitta + 1, 2)
        if kx == 0 and ky == 0:
            continue
        m += np.sin(x * kx + y * ky + rnd.uniform(0, 6.28)) / (abs(kx) + abs(ky))
    return (m - m.min()) / (m.max() - m.min())


def salva(nome, a):
    im = Image.fromarray((np.clip(a, 0, 1) * 255).astype('uint8'))
    # un filo di sfocatura e poi la grana del pennello: dà l'aria di una cosa dipinta
    im = im.filter(ImageFilter.GaussianBlur(0.7))
    im.save(os.path.join(DOVE, nome), quality=88)
    print(nome, np.asarray(im).mean(axis=(0, 1)).round(0))


def blocchi():
    rnd = np.random.default_rng(7)
    righe = 8
    alto = LATO // righe
    luce = np.zeros((LATO, LATO))
    tinta = np.zeros((LATO, LATO, 3))
    for r in range(righe):
        x = int(rnd.integers(0, 90))
        inizio = x
        while x < inizio + LATO:
            largo = int(rnd.integers(84, 170))
            if inizio + LATO - (x + largo) < 60:
                largo = inizio + LATO - x
            base = rnd.uniform(0.74, 0.95)
            colore = np.array([1.0, 0.98, 1.03]) + rnd.uniform(-0.032, 0.032, 3)
            for dx in range(largo):
                for dy in range(alto):
                    # quanto si è lontani dal bordo del blocco: lì la pietra è smussata e più scura
                    bordo = min(dx, largo - 1 - dx, dy, alto - 1 - dy)
                    fuga = min(1.0, bordo / 4.0)
                    smusso = min(1.0, bordo / 13.0)
                    # la luce viene dall'alto a sinistra: quel lato è più chiaro, l'altro più scuro
                    verso = (1 - dy / alto) * 0.16 + (1 - dx / largo) * 0.06 - 0.11
                    v = base * (0.42 + 0.58 * fuga) * (0.88 + 0.12 * smusso) + verso * smusso
                    luce[r * alto + dy, (x + dx) % LATO] = v
                    tinta[r * alto + dy, (x + dx) % LATO] = colore
            x += largo
    pennello = 0.9 + 0.2 * macchie(3, 5) + 0.08 * (macchie(4, 22) - 0.5)
    a = luce[:, :, None] * tinta * pennello[:, :, None]
    # qualche scheggiatura chiara
    for _ in range(26):
        cx, cy, rr = rnd.integers(0, LATO), rnd.integers(0, LATO), rnd.integers(3, 8)
        yy, xx = np.ogrid[-cy:LATO - cy, -cx:LATO - cx]
        a[(xx * xx + yy * yy * 2.2) < rr * rr] *= 1.12
    salva('blocchi.jpg', a * 0.98)


def lastre():
    rnd = np.random.default_rng(11)
    n = 34
    punti = rnd.uniform(0, LATO, (n, 2))
    tinte = rnd.uniform(0.76, 0.97, n)
    yy, xx = np.mgrid[0:LATO, 0:LATO].astype(float)
    d1 = np.full((LATO, LATO), 1e9)
    d2 = np.full((LATO, LATO), 1e9)
    chi = np.zeros((LATO, LATO), dtype=int)
    for i, (px, py) in enumerate(punti):
        for ox in (-LATO, 0, LATO):
            for oy in (-LATO, 0, LATO):
                d = np.hypot(xx - px - ox, (yy - py - oy) * 1.15)
                vicino = d < d1
                d2 = np.where(vicino, d1, np.minimum(d2, d))
                chi = np.where(vicino, i, chi)
                d1 = np.where(vicino, d, d1)
    bordo = d2 - d1
    fuga = np.clip(bordo / 9.0, 0, 1)
    smusso = np.clip(bordo / 30.0, 0, 1)
    base = tinte[chi]
    v = base * (0.4 + 0.6 * fuga) * (0.87 + 0.13 * smusso)
    pennello = 0.9 + 0.2 * macchie(5, 4) + 0.08 * (macchie(6, 20) - 0.5)
    a = np.stack([v * 1.0, v * 0.985, v * 1.03], axis=2) * pennello[:, :, None]
    salva('lastre.jpg', a * 0.95)


def rupe():
    grande = macchie(21, 3)
    media = macchie(22, 9)
    # le pennellate vanno dall'alto in basso, come le venature di una parete
    righe = macchie(23, 18)[:, ::1]
    righe = np.tile(righe[:1, :], (LATO, 1)) * 0.5 + righe * 0.5
    v = 0.76 + 0.2 * (grande - 0.5) + 0.1 * (media - 0.5) + 0.26 * (righe - 0.5)
    a = np.stack([v, v * 0.98, v * 1.04], axis=2)
    salva('rupe.jpg', a)


if __name__ == '__main__':
    blocchi()
    lastre()
    rupe()
