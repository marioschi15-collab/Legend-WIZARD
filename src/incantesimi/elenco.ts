import type { Incantesimo } from '../gioco.js';
import { crescita } from './crescita.js';
import { cristalli } from './cristalli.js';
import { esplosione } from './esplosione.js';
import { fulmine } from './fulmine.js';
import { fuoco } from './fuoco.js';
import { gelo } from './gelo.js';
import { levitazione } from './levitazione.js';
import { meteore } from './meteore.js';
import { presa } from './presa.js';
import { rammendo } from './rammendo.js';
import { singolarita } from './singolarita.js';
import { terremoto } from './terremoto.js';
import { tornado } from './tornado.js';

/** Gli incantesimi nell'ordine in cui compaiono nella barra: prima quelli che distruggono, poi quelli che giocano e riparano. */
export const INCANTESIMI: readonly Incantesimo[] = [
  fuoco, gelo, fulmine, esplosione, meteore, terremoto, tornado,
  singolarita, levitazione, presa, cristalli, crescita, rammendo,
];

/** A che livello il mago impara ogni incantesimo di serie: si parte con quattro, i più grossi arrivano per ultimi. */
const LIVELLO_DI: Readonly<Record<string, number>> = {
  Fuoco: 1, Gelo: 1, Crescita: 1, Rammendo: 1, Fulmine: 2, Cristalli: 3, Esplosione: 4, Levitazione: 5, Presa: 6, Terremoto: 7, Tornado: 8, Meteore: 9, Singolarità: 10,
};

/** Il livello a cui si impara un incantesimo di serie. */
export function livelloDi(m: Incantesimo): number {
  return LIVELLO_DI[m.nome] ?? 1;
}

/** Gli incantesimi di serie che un mago di quel livello conosce, nell'ordine della barra. */
export function sbloccati(livello: number): Incantesimo[] {
  return INCANTESIMI.filter((m) => livelloDi(m) <= livello);
}
