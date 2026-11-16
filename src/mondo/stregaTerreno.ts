import { gradino, mescola } from '../base/matematica.js';

/**
 * La forma del suolo nel Bosco della Strega, disegnata a mano: un colle con la casa in cima, la spianata del
 * cimitero, la conca dello stagno, il tumulo del cerchio di pietre. La stessa identica formula sta in
 * `strumenti/strega_terreno.py`: è così che la scena costruita con Blender appoggia sul terreno al centimetro.
 * Chi cambia l'una deve cambiare l'altra (la prova `prove/strega.ts` se ne accorge).
 */
export const CENTRO_STREGA = { x: -250, z: 380 };
/** Fin dove arriva la zona fatta a mano, e dove finisce di sfumare nelle terre vicine. */
export const RAGGIO_STREGA = 170;
export const SFUMA_STREGA = 250;

export function suoloStrega(x: number, z: number): number {
  const a = x - CENTRO_STREGA.x;
  const b = z - CENTRO_STREGA.z;
  // Ondulazioni larghe: niente di ripido, perché il terreno del gioco è fatto a maglie di tre metri.
  let h = 4.8 + 0.7 * Math.sin(a * 0.045 + 1.0) * Math.cos(b * 0.05) + 0.45 * Math.sin(a * 0.09 + b * 0.06 + 2.0);
  // Il colle della casa, con la cima spianata.
  h += 7 * Math.exp(-(a * a + b * b) / 800);
  h = mescola(h, 11.5, gradino(24, 10, Math.hypot(a, b)));
  // La spianata del cimitero e della cappella.
  h = mescola(h, 5.4, gradino(52, 34, Math.hypot(a - 2.6, b + 73.7)));
  // Lo stagno: una conca bassa, con l'acqua al ginocchio.
  h = mescola(h, -0.98, gradino(22, 9, Math.hypot(a - 71.2, b + 35.8)));
  // Il tumulo del cerchio di pietre, con la cima piatta.
  const rp = Math.hypot(a + 11, b - 50.8);
  h += 2 * Math.exp(-(rp * rp) / 338);
  h = mescola(h, 7, gradino(14, 6, rp));
  return h;
}

/** Quanto pesa il Bosco della Strega in un punto: tantissimo fin dove è fatto a mano, poi cala in fretta e con dolcezza. */
export function pesoStrega(x: number, z: number): number {
  const d = Math.hypot(x - CENTRO_STREGA.x, z - CENTRO_STREGA.z);
  if (d >= SFUMA_STREGA) return 1e-9;
  const t = Math.min(1, Math.max(0, (d - RAGGIO_STREGA) / (SFUMA_STREGA - RAGGIO_STREGA)));
  return Math.pow(10, 5 - 9 * t);
}
