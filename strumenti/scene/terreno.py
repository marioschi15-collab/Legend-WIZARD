"""Il terreno della zona che si sta costruendo. Ogni scena, per prima cosa, chiama `scegli('nome')`: da lì in poi
`terra(a, b)` dà l'altezza che si VEDE nel gioco in un punto (a verso est, b verso sud, in metri dal centro)."""
import math

import suoli

PASSO = 3.25
CX = CZ = 0.0
RAGGIO = 0.0
NOME = ''
_suolo = None


def scegli(nome):
    global CX, CZ, RAGGIO, NOME, _suolo
    s = suoli.SCENE[nome]
    CX, CZ, RAGGIO, NOME, _suolo = float(s['cx']), float(s['cz']), float(s['raggio']), nome, s['suolo']


def suolo(a, b):
    """L'altezza esatta della formula in un punto."""
    return _suolo(a, b)


def terra(a, b):
    """L'altezza che si vede nel gioco: il terreno è una maglia di triangoli larghi 3,25 metri, e qui si legge
    proprio su quei triangoli. Così ciò che si appoggia non affonda né resta sospeso."""
    x, z = a + CX, b + CZ
    i, j = math.floor(x / PASSO), math.floor(z / PASSO)
    tx, tz = x / PASSO - i, z / PASSO - j
    q = lambda ii, jj: _suolo(ii * PASSO - CX, jj * PASSO - CZ)
    h00, h10, h01, h11 = q(i, j), q(i + 1, j), q(i, j + 1), q(i + 1, j + 1)
    if tx + tz <= 1:
        return h00 + (h10 - h00) * tx + (h01 - h00) * tz
    return h11 + (h01 - h11) * (1 - tx) + (h10 - h11) * (1 - tz)
