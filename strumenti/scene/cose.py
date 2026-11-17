"""Gli oggetti sciolti: barili, casse, sacchi, panche, pupazzi di neve, zucche, lapidi, bersagli, fantocci.

Non entrano nella scena scolpita. Di ogni tipo si costruisce qui la forma una volta sola (in una scena di servizio,
senza terreno); le scene dicono solo dove va ogni copia (`S.cosa('barile', M)`). Nel gioco ogni copia è una cosa vera:
si spinge, si solleva, brucia, gela e si sfascia (vedi src/mondo/fatte/cose.ts). La scatola che la contiene, per la
fisica, è quella che racchiude la sua forma; `stringi` la restringe dove la forma ha sporgenze sottili.
"""
import random

from mathutils import Matrix

from attrezzi import Scena, cilindro, scatola
from oggetti import lapide, zucca
from paese import barile, bersaglio, cassa, fantoccio, panca, pupazzo, sacco

PROTOTIPI = {}
I4 = Matrix.Identity(4)


def _registra(nome, mat, fai, stringi=(1.0, 1.0, 1.0)):
    S = Scena(piatta=True)
    fai(S, random.Random(sum(ord(c) for c in nome) * 7 + 1))
    punti = [v for d in S.parti.values() for v in d['v']]
    lo = [min(v[k] for v in punti) for k in range(3)]
    hi = [max(v[k] for v in punti) for k in range(3)]
    misure = [(hi[k] - lo[k]) * stringi[k] for k in range(3)]
    # la scatola resta centrata sulla forma, e poggia a terra come lei
    centro = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2, lo[2] + misure[2] / 2]
    PROTOTIPI[nome] = dict(parti=S.parti, misure=misure, centro=centro, mat=mat)


def _con_neve(fai, largo, alto):
    def f(S, rnd):
        h = fai(S, rnd) or alto
        S.metti(scatola(largo, largo, 0.07, z0=h, tagli=1, rumore=0.02), 'c', 'neve', I4, uv=1.0, radica=False)
    return f


def _barile(S, rnd):
    barile(S, I4, rnd, 'c', urto=False)


def _barile_n(S, rnd):
    barile(S, I4, rnd, 'c', urto=False)
    S.metti(cilindro(0.3, 0.26, 0.07, 10, z0=0.95), 'c', 'neve', I4, uv=1.0, radica=False)


_registra('barile', 'legno', _barile)
_registra('barile_n', 'legno', _barile_n)
for _k, _lato in enumerate((0.9, 0.72, 0.55)):
    _fai = (lambda lato: lambda S, rnd: cassa(S, I4, rnd, 'c', lato, urto=False))(_lato)
    _registra(f'cassa{_k}', 'legno', _fai)
    _registra(f'cassa{_k}_n', 'legno', _con_neve(_fai, _lato * 0.92, _lato))
_registra('sacco', 'paglia', lambda S, rnd: sacco(S, I4, rnd, 'c'))
_registra('panca', 'legno', lambda S, rnd: panca(S, I4, rnd, 'c', False))
_registra('panca_n', 'legno', lambda S, rnd: panca(S, I4, rnd, 'c', True))
_registra('pupazzo', 'neve', lambda S, rnd: pupazzo(S, I4, rnd, 'c'), (0.55, 1.0, 1.0))
_registra('bersaglio', 'legno', lambda S, rnd: bersaglio(S, I4, rnd, 'c'), (0.9, 0.8, 1.0))
_registra('fantoccio', 'paglia', lambda S, rnd: fantoccio(S, I4, rnd, 'c'), (0.5, 1.0, 1.0))
for _k in range(3):
    _registra(f'zucca{_k}', 'zucca', lambda S, rnd: zucca(S, I4, rnd, 'c', False), (0.9, 0.9, 0.9))
# le lapidi che stanno in piedi (cima tonda, a punta, croce, obelisco, con le spalle), due per forma
LAPIDI = (0, 1, 2, 3, 6)
for _t in LAPIDI:
    for _v in range(2):
        _registra(f'lapide{_t}{_v}', 'pietra', (lambda t: lambda S, rnd: lapide(S, I4, rnd, 'c', t))(_t), (0.9, 0.85, 1.0))
