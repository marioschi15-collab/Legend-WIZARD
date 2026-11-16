"""La forma del suolo di ogni zona fatta a mano: le stesse identiche formule di src/mondo/fatte/suoli.ts, in Python.
Chi cambia le une deve cambiare le altre (la prova `prove/fatte.ts` se ne accorge).
In ogni formula `a` sono i metri dal centro verso est e `b` verso sud (le x e le z del gioco)."""
import math
from math import cos, exp, hypot, sin


def gradino(a, b, v):
    t = min(1.0, max(0.0, (v - a) / (b - a)))
    return t * t * (3 - 2 * t)


def mescola(a, b, t):
    return a + (b - a) * t


def strega(a, b):
    h = 4.8 + 0.7 * sin(a * 0.045 + 1.0) * cos(b * 0.05) + 0.45 * sin(a * 0.09 + b * 0.06 + 2.0)
    h += 7 * exp(-(a * a + b * b) / 800)
    h = mescola(h, 11.5, gradino(24, 10, hypot(a, b)))
    h = mescola(h, 5.4, gradino(52, 34, hypot(a - 2.6, b + 73.7)))
    h = mescola(h, -0.98, gradino(22, 9, hypot(a - 71.2, b + 35.8)))
    rp = hypot(a + 11, b - 50.8)
    h += 2 * exp(-(rp * rp) / 338)
    h = mescola(h, 7, gradino(14, 6, rp))
    return h


def via_borgo(a):
    """Dove passa (quanto a sud) la via maestra del borgo, che serpeggia appena."""
    return 4.0 * sin(a * 0.035)


def borgo(a, b):
    h = 6.0 + 0.5 * sin(a * 0.05 + 0.7) * cos(b * 0.045) + 0.3 * sin(a * 0.11 - b * 0.07 + 1.3)
    h += 9.0 * gradino(-25, -125, b)
    h -= 4.5 * gradino(28, 78, b)
    h = mescola(h, 6.0, gradino(17, 8, abs(b - via_borgo(a))))
    h = mescola(h, 6.0, gradino(31, 20, hypot(a + 38, b)))
    rt = hypot(a + 80, b + 36)
    h += 3.4 * exp(-(rt * rt) / 260)
    h = mescola(h, 9.6, gradino(11, 5.5, rt))
    h = mescola(h, -1.3, gradino(19, 8, hypot(a - 30, b - 74)))
    return h


def porto(a, b):
    h = 2.2 + 0.25 * sin(a * 0.06 + 0.4) * cos(b * 0.05) + 0.9 * gradino(-20, -110, a)
    k = gradino(-62, -92, b)
    h = mescola(h, -3.6, gradino(mescola(15.5, 0.0, k), mescola(22.5, 50.0, k), a))
    return h


def ruscello_castello(b):
    """Dove passa (quanto a est) il ruscello sotto il castello."""
    return 78.0 + 6.0 * sin(b * 0.035)


def castello(a, b):
    h = 4.0 + 0.6 * sin(a * 0.04 + 2.0) * cos(b * 0.045 + 1.0) + 0.4 * sin(a * 0.085 - b * 0.06)
    r = hypot(a + 20, b)
    h += 9 * exp(-(r * r) / 3200)
    h = mescola(h, 12.5, gradino(44, 30, r))
    dr = abs(a - ruscello_castello(b))
    h -= 2.0 * gradino(26, 8, dr)
    h = mescola(h, -1.15, gradino(11, 3, dr))
    return h


SCENE = {
    'strega': dict(cx=-250, cz=380, raggio=170, sfuma=250, suolo=strega),
    'borgo': dict(cx=-500, cz=40, raggio=120, sfuma=185, suolo=borgo),
    'porto': dict(cx=385, cz=85, raggio=120, sfuma=185, suolo=porto),
    'castello': dict(cx=-720, cz=330, raggio=120, sfuma=185, suolo=castello),
}
