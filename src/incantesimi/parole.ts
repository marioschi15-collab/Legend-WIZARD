import { COLORI, type Ricetta } from './officina.js';

/** Le famiglie di parole: come parte l'incantesimo, che cosa fa, quanto è grande e quanto è forte. */
export type Famiglia = 'forma' | 'effetto' | 'misura';

export interface Parola {
  /** La parola come la si legge negli elenchi. */
  readonly parola: string;
  readonly famiglia: Famiglia;
  /** Gli altri modi di scriverla che il gioco capisce (già senza accenti, in minuscolo). */
  readonly altre: readonly string[];
  /** Che cosa mette nella ricetta. */
  readonly forma?: string;
  readonly effetto?: string;
  readonly potenza?: number;
  readonly ampiezza?: number;
  /** Quante essenze costa impararla; 0 = la si conosce dall'inizio. */
  readonly prezzo: number;
  readonly cosaFa: string;
}

const p = (parola: string, famiglia: Famiglia, altre: string[], dati: Partial<Parola>, prezzo: number, cosaFa: string): Parola => ({ parola, famiglia, altre, prezzo, cosaFa, ...dati });

/** Il primo vocabolario: una ventina di parole, undici note dall'inizio e le altre da imparare con le essenze. */
export const PAROLE: readonly Parola[] = [
  p('palla', 'forma', ['sfera', 'globo', 'palle'], { forma: 'palla' }, 0, 'vola dal bastone fin dove miri'),
  p('tocco', 'forma', ['dito', 'colpo'], { forma: 'tocco' }, 0, 'succede subito dove miri'),
  p('pioggia', 'forma', ['grandine', 'piogge', 'diluvio'], { forma: 'pioggia' }, 0, 'tanti colpi sparsi'),
  p('cielo', 'forma', ['meteora', 'cometa', 'alto'], { forma: 'cielo' }, 15, 'cala dall’alto'),
  p('onda', 'forma', ['fila', 'scia', 'onde'], { forma: 'onda' }, 15, 'una fila di colpi davanti a te'),

  p('fuoco', 'effetto', ['fiamma', 'fiamme', 'brucia', 'incendio', 'fuochi'], { effetto: 'brucia' }, 0, 'incendia erba e legno'),
  p('ghiaccio', 'effetto', ['gelo', 'gela', 'neve', 'brina', 'freddo'], { effetto: 'gela' }, 0, 'ghiaccia e spegne il fuoco'),
  p('scoppio', 'effetto', ['esplosione', 'botto', 'bomba', 'scoppia', 'esplode'], { effetto: 'scoppio' }, 0, 'scaglia via i pezzi'),
  p('vento', 'effetto', ['solleva', 'soffio', 'aria'], { effetto: 'solleva' }, 0, 'lancia tutto verso l’alto'),
  p('fiori', 'effetto', ['fiore', 'fiorisce', 'vita', 'erba', 'prato'], { effetto: 'fiorisce' }, 0, 'fa crescere erba e fiori'),
  p('fulmine', 'effetto', ['saetta', 'lampo', 'fulmini', 'folgore', 'tuono'], { effetto: 'folgora' }, 20, 'una saetta dal cielo'),
  p('risucchio', 'effetto', ['vuoto', 'buco', 'risucchia', 'attira'], { effetto: 'risucchio' }, 20, 'tira i pezzi verso il centro'),
  p('vortice', 'effetto', ['tornado', 'turbine', 'ciclone', 'mulinello'], { effetto: 'vortice' }, 25, 'fa girare i pezzi in tondo'),
  p('cristallo', 'effetto', ['cristalli', 'spuntoni', 'gemme'], { effetto: 'cristalli' }, 25, 'spuntoni che eruttano in cerchio'),
  p('bolla', 'effetto', ['piuma', 'leggero', 'leggera', 'bolle'], { effetto: 'bolla' }, 15, 'per un po’ lì il peso sparisce'),
  p('tempo', 'effetto', ['rammenda', 'ripara', 'aggiusta', 'indietro'], { effetto: 'rammenda' }, 30, 'rimette a posto ciò che è rotto'),

  p('piccolo', 'misura', ['piccola', 'piccoli', 'piccole', 'stretto', 'stretta', 'minuscolo', 'minuscola'], { ampiezza: 1 }, 0, 'colpisce un punto stretto'),
  p('grande', 'misura', ['grandi', 'largo', 'larga', 'vasto', 'vasta', 'ampio', 'ampia'], { ampiezza: 3 }, 0, 'colpisce una zona ampia'),
  p('lieve', 'misura', ['debole', 'deboli', 'leggerissimo', 'delicato', 'delicata'], { potenza: 1 }, 0, 'meno forza, meno mana'),
  p('forte', 'misura', ['forti', 'potente', 'potenti'], { potenza: 3 }, 30, 'più forza, più mana'),
  p('gigante', 'misura', ['giganti', 'enorme', 'enormi', 'immenso', 'immensa', 'gigantesco', 'gigantesca'], { potenza: 3, ampiezza: 3 }, 45, 'il più grande e il più forte'),
];

/** Le parolette che non contano: si saltano senza dire nulla. */
const VUOTE = new Set(['di', 'del', 'dello', 'della', 'dei', 'delle', 'e', 'ed', 'con', 'un', 'una', 'uno', 'il', 'la', 'lo', 'le', 'i', 'gli', 'che', 'molto', 'da', 'dal', 'dall', 'a', 'al', 'in', 'su', 'd', 'l', 'piu', 'tanto', 'tanti']);
const SIMBOLO: Record<string, string> = { brucia: '☀️', gela: '🌙', scoppio: '💀', solleva: '🦅', fiorisce: '🦋', folgora: '⭐', risucchio: '👁️', vortice: '🌊', cristalli: '👑', bolla: '🌈', rammenda: '🕯️' };
const COLORE: Record<string, number> = { brucia: COLORI[0]!, gela: COLORI[5]!, scoppio: COLORI[1]!, solleva: COLORI[4]!, fiorisce: COLORI[3]!, folgora: COLORI[2]!, risucchio: COLORI[6]!, vortice: COLORI[4]!, cristalli: COLORI[7]!, bolla: COLORI[5]!, rammenda: COLORI[2]! };

const piana = (testo: string): string => testo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Quante lettere bisogna cambiare per passare da una parola all'altra. */
function distanza(a: string, b: string): number {
  const riga = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prima = riga[0]!;
    riga[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const sopra = riga[j]!;
      riga[j] = Math.min(sopra + 1, riga[j - 1]! + 1, prima + (a[i - 1] === b[j - 1] ? 0 : 1));
      prima = sopra;
    }
  }
  return riga[b.length]!;
}

/** La parola del vocabolario che corrisponde a un pezzo di testo, se c'è. */
function trova(pezzo: string): Parola | undefined {
  return PAROLE.find((x) => x.parola === pezzo || x.altre.includes(pezzo));
}

/** La parola del vocabolario più somigliante a una scritta male o sconosciuta. */
function somigliante(pezzo: string): Parola | undefined {
  let meglio: Parola | undefined;
  // Si suggerisce solo se manca davvero poco: una lettera per le parole corte, due per le lunghe.
  let minimo = pezzo.length <= 5 ? 2 : 3;
  for (const x of PAROLE) {
    for (const forma of [x.parola, ...x.altre]) {
      const d = distanza(pezzo, forma);
      if (d < minimo) {
        minimo = d;
        meglio = x;
      }
    }
  }
  return meglio;
}

export interface Lettura {
  /** L'incantesimo che ne esce, oppure null se manca qualcosa. */
  readonly ricetta: Ricetta | null;
  /** Le parole capite e conosciute, nell'ordine in cui sono scritte. */
  readonly capite: readonly Parola[];
  /** Parole del vocabolario che il mago non ha ancora imparato. */
  readonly daImparare: readonly Parola[];
  /** Parole che il gioco non conosce, ognuna con quella che le somiglia di più (se c'è). */
  readonly ignote: readonly { scritta: string; forse?: Parola }[];
  /** Una frase per chi gioca: che cosa manca, o che cosa farà l'incantesimo. */
  readonly messaggio: string;
}

/**
 * Legge un incantesimo scritto a parole («pioggia di fuoco piccola») e ne ricava la ricetta.
 * Una parola sconosciuta non blocca: viene segnalata, con quella più vicina che il gioco conosce.
 */
export function leggi(testo: string, conosciute: ReadonlySet<string>): Lettura {
  const capite: Parola[] = [];
  const daImparare: Parola[] = [];
  const ignote: { scritta: string; forse?: Parola }[] = [];
  for (const pezzo of piana(testo).split(/[^a-z]+/).filter((x) => x.length > 0 && !VUOTE.has(x))) {
    const parola = trova(pezzo);
    if (!parola) {
      const forse = somigliante(pezzo);
      ignote.push(forse ? { scritta: pezzo, forse } : { scritta: pezzo });
    } else if (!conosciute.has(parola.parola)) {
      if (!daImparare.includes(parola)) daImparare.push(parola);
    } else if (!capite.includes(parola)) capite.push(parola);
  }

  const effetti = [...new Set(capite.filter((x) => x.effetto).map((x) => x.effetto!))].slice(0, 3);
  if (effetti.length === 0) {
    const messaggio = daImparare.some((x) => x.effetto)
      ? `Non hai ancora imparato «${daImparare.find((x) => x.effetto)!.parola}».`
      : 'Manca che cosa fa: prova con fuoco, ghiaccio, scoppio, vento o fiori.';
    return { ricetta: null, capite, daImparare, ignote, messaggio };
  }
  const forma = capite.find((x) => x.forma)?.forma ?? 'palla';
  let potenza = 2;
  let ampiezza = 2;
  for (const x of capite) {
    if (x.potenza !== undefined) potenza = x.potenza;
    if (x.ampiezza !== undefined) ampiezza = x.ampiezza;
  }
  const scritto = testo.trim().replace(/\s+/g, ' ').replace(/[<>&"']/g, '');
  const nome = (scritto.charAt(0).toUpperCase() + scritto.slice(1)).slice(0, 18);
  const ricetta: Ricetta = { nome, simbolo: SIMBOLO[effetti[0]!]!, colore: COLORE[effetti[0]!]!, forma, effetti, potenza, ampiezza };
  const fa = capite.filter((x) => x.famiglia !== 'misura').map((x) => x.cosaFa).join('; ');
  return { ricetta, capite, daImparare, ignote, messaggio: fa };
}

const CHIAVE = 'radura-parole';

/** Le parole che il mago conosce: quelle di partenza più quelle imparate. */
export function leggiConosciute(): Set<string> {
  const note = new Set(PAROLE.filter((x) => x.prezzo === 0).map((x) => x.parola));
  try {
    for (const x of JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown[]) {
      if (typeof x === 'string' && PAROLE.some((y) => y.parola === x)) note.add(x);
    }
  } catch {
    // Senza memoria del browser si riparte dalle parole di partenza.
  }
  return note;
}

export function salvaConosciute(note: ReadonlySet<string>): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify([...note]));
  } catch {
    // Vedi sopra.
  }
}
