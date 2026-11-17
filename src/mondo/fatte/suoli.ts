import { gradino, mescola } from '../../base/matematica.js';

/**
 * Le zone fatte a mano: posti precisi della mappa dove il suolo è disegnato (un colle, una spianata, una conca) e
 * sopra c'è una scena costruita con Blender. Le stesse identiche formule stanno in `strumenti/scene/suoli.py`: è così
 * che ogni scena appoggia sul terreno al centimetro. Chi cambia le une deve cambiare le altre (la prova
 * `prove/fatte.ts` se ne accorge). In ogni formula `a` sono i metri dal centro verso est e `b` verso sud.
 */
export interface TerraFatta {
  readonly chiave: string;
  readonly centro: { readonly x: number; readonly z: number };
  /** Fin dove arriva la zona fatta a mano, e dove finisce di sfumare nelle terre vicine. */
  readonly raggio: number;
  readonly sfuma: number;
  readonly suolo: (x: number, z: number) => number;
}

const { sin, cos, exp, hypot, abs } = Math;

function terra(chiave: string, x: number, z: number, raggio: number, sfuma: number, forma: (a: number, b: number) => number): TerraFatta {
  return { chiave, centro: { x, z }, raggio, sfuma, suolo: (px, pz) => forma(px - x, pz - z) };
}

/** Il Bosco della Strega: un colle con la casa in cima, la spianata del cimitero, la conca dello stagno, il tumulo
 * del cerchio di pietre. Ondulazioni larghe: niente di ripido, perché il terreno è fatto a maglie di tre metri. */
const strega = terra('strega', -250, 380, 170, 250, (a, b) => {
  let h = 4.8 + 0.7 * sin(a * 0.045 + 1.0) * cos(b * 0.05) + 0.45 * sin(a * 0.09 + b * 0.06 + 2.0);
  h += 7 * exp(-(a * a + b * b) / 800);
  h = mescola(h, 11.5, gradino(24, 10, hypot(a, b)));
  h = mescola(h, 5.4, gradino(52, 34, hypot(a - 2.6, b + 73.7)));
  h = mescola(h, -0.98, gradino(22, 9, hypot(a - 71.2, b + 35.8)));
  const rp = hypot(a + 11, b - 50.8);
  h += 2 * exp(-(rp * rp) / 338);
  h = mescola(h, 7, gradino(14, 6, rp));
  return h;
});

/** Il Borgo d'Inverno: la via maestra in piano, la piazza, il poggio della torre; a nord si sale verso i monti, a sud
 * si scende allo stagno gelato. */
const borgo = terra('borgo', -500, 40, 120, 185, (a, b) => {
  let h = 6.0 + 0.5 * sin(a * 0.05 + 0.7) * cos(b * 0.045) + 0.3 * sin(a * 0.11 - b * 0.07 + 1.3);
  h += 9.0 * gradino(-25, -125, b);
  h -= 4.5 * gradino(28, 78, b);
  h = mescola(h, 6.0, gradino(17, 8, abs(b - 4.0 * sin(a * 0.035))));
  h = mescola(h, 6.0, gradino(31, 20, hypot(a + 38, b)));
  const rt = hypot(a + 80, b + 36);
  h += 3.4 * exp(-(rt * rt) / 260);
  h = mescola(h, 9.6, gradino(11, 5.5, rt));
  h = mescola(h, -1.3, gradino(19, 8, hypot(a - 30, b - 74)));
  return h;
});

/** Il Porto delle Nebbie: la terra a ovest, la banchina dritta, il fondale a est; a nord la riva diventa spiaggia. */
const porto = terra('porto', 385, 85, 120, 185, (a, b) => {
  const h = 2.2 + 0.25 * sin(a * 0.06 + 0.4) * cos(b * 0.05) + 0.9 * gradino(-20, -110, a);
  const k = gradino(-62, -92, b);
  return mescola(h, -3.6, gradino(mescola(15.5, 0.0, k), mescola(22.5, 50.0, k), a));
});

/** Il Castello del Bosco: un colle largo con la cima spianata, e a est il ruscello che la strada passa su un ponte. */
const castello = terra('castello', -720, 330, 120, 185, (a, b) => {
  let h = 4.0 + 0.6 * sin(a * 0.04 + 2.0) * cos(b * 0.045 + 1.0) + 0.4 * sin(a * 0.085 - b * 0.06);
  const r = hypot(a + 20, b);
  h += 9 * exp(-(r * r) / 3200);
  h = mescola(h, 12.5, gradino(44, 30, r));
  const dr = abs(a - (78.0 + 6.0 * sin(b * 0.035)));
  h -= 2.0 * gradino(26, 8, dr);
  h = mescola(h, -1.15, gradino(11, 3, dr));
  return h;
});

const FIUME_ROVINE: readonly (readonly [number, number])[] = [[64, 10], [58, 34], [40, 50], [10, 54], [-25, 52], [-55, 57], [-88, 62]];

/** Quanto dista un punto da una linea spezzata (il corso di un fiume). */
function dallaSpezzata(a: number, b: number, punti: readonly (readonly [number, number])[]): number {
  let meglio = 1e9;
  for (let i = 0; i < punti.length - 1; i++) {
    const [x0, y0] = punti[i]!;
    const [x1, y1] = punti[i + 1]!;
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.min(1, Math.max(0, ((a - x0) * dx + (b - y0) * dy) / (dx * dx + dy * dy)));
    meglio = Math.min(meglio, hypot(a - x0 - dx * t, b - y0 - dy * t));
  }
  return meglio;
}

/** Le Rovine del Cristallo (il posto di prova dello stile disegnato): il fiume in fondo alla gola con il ponte sopra,
 * la corte in piano, la rupe della torre, l'altopiano da cui cade la cascata, il laghetto dove il fiume finisce. */
const rovine = terra('rovine', 170, -330, 120, 185, (a, b) => {
  let h = 6.0 + 0.5 * sin(a * 0.05 + 0.3) * cos(b * 0.045) + 0.35 * sin(a * 0.1 - b * 0.07);
  h = mescola(h, 6.0, gradino(46, 30, hypot(a, b - 8)));
  const rt = hypot(a + 14, b + 64);
  h += 22 * exp(-(rt * rt) / 420);
  h = mescola(h, 27.0, gradino(9, 5, rt));
  h = mescola(h, 21.0, gradino(44, 56, a) * gradino(2, -9, b));
  h = mescola(h, -1.3, gradino(10, 4, dallaSpezzata(a, b, FIUME_ROVINE)));
  h = mescola(h, -1.3, gradino(11, 6, hypot(a - 64, b - 10)));
  h = mescola(h, -1.3, gradino(24, 14, hypot(a + 88, b - 62)));
  return h;
});

export const FATTE = { strega, borgo, porto, castello, rovine } as const;

/** Quanto pesa una zona fatta a mano in un punto: tantissimo fin dove è fatta a mano, poi cala in fretta e con dolcezza. */
export function pesoFatta(f: TerraFatta, x: number, z: number): number {
  const d = hypot(x - f.centro.x, z - f.centro.z);
  if (d >= f.sfuma) return 1e-9;
  const t = Math.min(1, Math.max(0, (d - f.raggio) / (f.sfuma - f.raggio)));
  return Math.pow(10, 5 - 9 * t);
}
