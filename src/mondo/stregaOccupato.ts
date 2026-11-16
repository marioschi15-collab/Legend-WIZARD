import { STREGA_DATI } from './stregaDati.js';

const caselle = new Set(STREGA_DATI.occupati);

/** Vero dove nel Bosco della Strega c'è già qualcosa di costruito a mano (un sentiero, il cimitero, la casa...):
 * lì il bosco non fa nascere alberi né sassi suoi. Le caselle sono di due metri. */
export function occupatoStrega(x: number, z: number): boolean {
  return caselle.has((Math.floor(x / 2) + 32768) * 65536 + (Math.floor(z / 2) + 32768));
}
