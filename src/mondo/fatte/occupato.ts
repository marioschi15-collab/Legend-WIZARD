import { SCENE_FATTE } from './elenco.js';

const caselle = new Set<number>();
for (const s of SCENE_FATTE) for (const c of s.dati.occupati) caselle.add(c);

/** Vero dove in una zona fatta a mano c'è già qualcosa di costruito (un sentiero, una casa, un molo...): lì il
 * bosco non fa nascere alberi né sassi suoi. Le caselle sono di due metri. */
export function occupatoFatto(x: number, z: number): boolean {
  return caselle.has((Math.floor(x / 2) + 32768) * 65536 + (Math.floor(z / 2) + 32768));
}
