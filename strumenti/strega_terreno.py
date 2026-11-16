"""La forma del suolo nel Bosco della Strega: la stessa formula di src/mondo/stregaTerreno.ts, in Python.
Chi cambia l'una deve cambiare l'altra."""
import math

CX, CZ = -250.0, 380.0
PASSO = 3.25


def gradino(a, b, v):
    t = min(1.0, max(0.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mescola(a, b, t):
    return a + (b - a) * t


def suolo(a, b):
    """Altezza in un punto, dati i metri dal centro (a verso est, b verso sud: le x e le z del gioco)."""
    h = 4.8 + 0.7 * math.sin(a * 0.045 + 1.0) * math.cos(b * 0.05) + 0.45 * math.sin(a * 0.09 + b * 0.06 + 2.0)
    h += 7 * math.exp(-(a * a + b * b) / 800)
    h = mescola(h, 11.5, gradino(24, 10, math.hypot(a, b)))
    h = mescola(h, 5.4, gradino(52, 34, math.hypot(a - 2.6, b + 73.7)))
    h = mescola(h, -0.98, gradino(22, 9, math.hypot(a - 71.2, b + 35.8)))
    rp = math.hypot(a + 11, b - 50.8)
    h += 2 * math.exp(-(rp * rp) / 338)
    h = mescola(h, 7, gradino(14, 6, rp))
    return h


def terra(a, b):
    """L'altezza che si VEDE nel gioco: il terreno è una maglia di triangoli larghi 3,25 metri, e qui si legge
    proprio su quei triangoli. Così ciò che si appoggia non affonda né resta sospeso."""
    x, z = a + CX, b + CZ
    i, j = math.floor(x / PASSO), math.floor(z / PASSO)
    tx, tz = x / PASSO - i, z / PASSO - j
    q = lambda ii, jj: suolo(ii * PASSO - CX, jj * PASSO - CZ)
    h00, h10, h01, h11 = q(i, j), q(i + 1, j), q(i, j + 1), q(i + 1, j + 1)
    if tx + tz <= 1:
        return h00 + (h10 - h00) * tx + (h01 - h00) * tz
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz)
