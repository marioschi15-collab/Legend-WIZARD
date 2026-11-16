/** La regola che vale in una terra: cambia il modo di usare gli incantesimi. */
export interface Regola {
  /** Ogni quanti secondi il fuoco si spegne da solo (0 = dura quanto altrove). */
  readonly fuocoMuore: number;
  /** Ogni quanti secondi il gelo si scioglie da solo (0 = dura quanto altrove). */
  readonly geloSiScioglie: number;
  /** Quanto più in fretta torna il mana (1 = come sempre). */
  readonly mana: number;
  /** Vero se qui la vita torna da sola anche in mezzo alla battaglia. */
  readonly vita: boolean;
  /** La frase per chi gioca. */
  readonly testo: string;
}

const COMUNE: Regola = { fuocoMuore: 0, geloSiScioglie: 0, mana: 1, vita: false, testo: '' };
const FREDDO: Regola = { ...COMUNE, fuocoMuore: 2, testo: 'Qui fa troppo freddo: il fuoco si spegne quasi subito.' };
const CALDO: Regola = { ...COMUNE, geloSiScioglie: 2, testo: 'Qui fa troppo caldo: il gelo si scioglie quasi subito.' };
const UMIDO: Regola = { ...COMUNE, fuocoMuore: 4, testo: 'Qui è tutto bagnato: il fuoco dura poco.' };

/** La regola di ogni terra, nello stesso ordine delle terre. */
export const REGOLE: readonly Regola[] = [
  COMUNE, CALDO, FREDDO, UMIDO, CALDO, COMUNE, COMUNE, UMIDO, CALDO, COMUNE, FREDDO, CALDO, COMUNE,
  { ...COMUNE, vita: true, testo: 'Le spore curano: qui la vita torna da sola, sempre.' },
  { ...COMUNE, mana: 2, testo: 'I cristalli vibrano: qui il mana torna il doppio più in fretta.' },
  { ...COMUNE, fuocoMuore: 5, mana: 1.5, testo: 'La nebbia della strega è carica di magia: il mana torna più in fretta, ma il fuoco dura poco.' },
];

/** Una sfida in corso: sbriciolare un certo numero di creature in una terra. */
export interface Sfida {
  readonly zona: number;
  readonly servono: number;
  fatte: number;
}

export interface EsitoSfida {
  readonly zona: number;
  readonly esperienza: number;
  readonly essenze: number;
}

const CHIAVE = 'radura-sfide';
const QUANTE = 3;

/**
 * Le sfide delle terre: la prima volta che si entra in una terra (non la Radura, che ha le missioni del villaggio)
 * si riceve una caccia. Finita quella, la terra è «domata» e non la ripropone più.
 */
export class Sfide {
  attiva: Sfida | null = null;
  readonly domate = new Set<number>();

  carica(): void {
    try {
      const d = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as { domate?: unknown; attiva?: Partial<Sfida> };
      if (Array.isArray(d.domate)) for (const z of d.domate) if (Number.isInteger(z)) this.domate.add(z as number);
      const a = d.attiva;
      if (a && Number.isInteger(a.zona) && Number.isInteger(a.fatte)) this.attiva = { zona: a.zona!, servono: QUANTE, fatte: Math.min(QUANTE - 1, Math.max(0, a.fatte!)) };
    } catch {
      // Senza memoria del browser le sfide valgono solo per questa partita.
    }
  }

  private salva(): void {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify({ domate: [...this.domate], attiva: this.attiva }));
    } catch {
      // Vedi sopra.
    }
  }

  /** Si entra in una terra: se non è ancora domata e non c'è già una sfida, ne parte una. Restituisce quella nuova. */
  entra(zona: number): Sfida | null {
    if (zona === 0 || this.attiva || this.domate.has(zona)) return null;
    this.attiva = { zona, servono: QUANTE, fatte: 0 };
    this.salva();
    return this.attiva;
  }

  /** Una creatura è stata sbriciolata in una certa terra. Restituisce il premio se la sfida è finita. */
  sbriciolata(zona: number): EsitoSfida | null {
    const s = this.attiva;
    if (!s || s.zona !== zona) return null;
    s.fatte++;
    if (s.fatte < s.servono) {
      this.salva();
      return null;
    }
    this.attiva = null;
    this.domate.add(zona);
    this.salva();
    return { zona, esperienza: 90, essenze: 20 };
  }
}
