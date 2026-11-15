/** Ciò che una missione può guardare e fare nel mondo. Il gioco vero e le prove ne danno ciascuno la sua versione. */
export interface MondoMissioni {
  /** Quanta parte (da 0 a 1) di un cerchio di prato è fiorita, gelata, in fiamme, bruciata. */
  fiorito(x: number, z: number, raggio: number): number;
  gelato(x: number, z: number, raggio: number): number;
  inFiamme(x: number, z: number, raggio: number): number;
  bruciato(x: number, z: number, raggio: number): number;
  /** Rimette il prato com'era in un cerchio, e gli dà fuoco. */
  risana(x: number, z: number, raggio: number): void;
  accendi(x: number, z: number, raggio: number): void;
  /** Fa nascere un golem che resta lì ad aspettare; restituisce il suo numero. */
  nasciGolem(x: number, z: number, livello: number): number;
  golemVivo(numero: number): boolean;
  /** Quanti luoghi sono stati ridotti in macerie finora. */
  luoghiRasi(): number;
}

/** Quello che una missione si ricorda mentre è in corso. */
interface Appunti {
  golem: number;
  rasi: number;
  tempo: number;
}

export interface Missione {
  readonly id: string;
  /** Chi la dà: nome e mestiere. */
  readonly chi: string;
  readonly mestiere: string;
  /** Il colore del vestito dell'abitante. */
  readonly colore: number;
  /** Quello che dice l'abitante. */
  readonly richiesta: string;
  /** La riga breve che resta sullo schermo. */
  readonly inBreve: string;
  /** Dove si svolge (il cerchio dorato), se ha un posto preciso. */
  readonly dove?: { readonly x: number; readonly z: number; readonly raggio: number };
  readonly esperienza: number;
  readonly essenze: number;
  /** La parola che insegna la prima volta. */
  readonly parola: string;
  inizia(m: MondoMissioni, a: Appunti): void;
  fatta(m: MondoMissioni, a: Appunti): boolean;
  fallita?(m: MondoMissioni, a: Appunti): boolean;
}

const ORTO = { x: 30, z: 74, raggio: 6 };
const FIENO = { x: -30, z: 74, raggio: 7 };
const SPIAZZO = { x: 0, z: 88, raggio: 6 };
const SENTIERO = { x: 20, z: 172, raggio: 9 };

/** Le prime cinque missioni: ognuna è un problema che si può risolvere con incantesimi diversi. */
export const MISSIONI: readonly Missione[] = [
  {
    id: 'orto', chi: 'Bice', mestiere: 'la contadina', colore: 0x6fae4a, parola: 'cielo', esperienza: 40, essenze: 8, dove: ORTO,
    richiesta: 'Il mio orto è spoglio. Fallo rifiorire: è poco fuori dal villaggio, dentro il cerchio dorato.',
    inBreve: 'Fai rifiorire l’orto nel cerchio dorato',
    inizia: (m) => m.risana(ORTO.x, ORTO.z, ORTO.raggio + 2),
    fatta: (m) => m.fiorito(ORTO.x, ORTO.z, ORTO.raggio) >= 0.55,
  },
  {
    id: 'fieno', chi: 'Nino', mestiere: 'l’oste', colore: 0xd8843a, parola: 'onda', esperienza: 50, essenze: 10, dove: FIENO,
    richiesta: 'Il fieno ha preso fuoco! Spegnilo prima che bruci tutto: è nel cerchio dorato.',
    inBreve: 'Spegni il fuoco nel cerchio dorato prima che bruci tutto',
    inizia: (m) => {
      m.risana(FIENO.x, FIENO.z, FIENO.raggio + 3);
      m.accendi(FIENO.x, FIENO.z, 3.5);
    },
    fatta: (m, a) => a.tempo > 1.5 && m.inFiamme(FIENO.x, FIENO.z, FIENO.raggio + 6) === 0 && m.bruciato(FIENO.x, FIENO.z, FIENO.raggio) < 0.5,
    fallita: (m, a) => a.tempo > 1.5 && m.inFiamme(FIENO.x, FIENO.z, FIENO.raggio + 6) === 0 && m.bruciato(FIENO.x, FIENO.z, FIENO.raggio) >= 0.5,
  },
  {
    id: 'ghiaccio', chi: 'Lia', mestiere: 'la pescatrice', colore: 0x4a8ad8, parola: 'bolla', esperienza: 40, essenze: 8, dove: SPIAZZO,
    richiesta: 'Devo tenere il pesce al fresco. Ricopri di ghiaccio lo spiazzo nel cerchio dorato.',
    inBreve: 'Ricopri di ghiaccio lo spiazzo nel cerchio dorato',
    inizia: (m) => m.risana(SPIAZZO.x, SPIAZZO.z, SPIAZZO.raggio + 2),
    fatta: (m) => m.gelato(SPIAZZO.x, SPIAZZO.z, SPIAZZO.raggio) >= 0.55,
  },
  {
    id: 'golem', chi: 'Tea', mestiere: 'la guardia', colore: 0x8a5ad8, parola: 'fulmine', esperienza: 70, essenze: 14, dove: SENTIERO,
    richiesta: 'Un golem blocca il sentiero a sud del villaggio. Sbriciolalo: lo trovi nel cerchio dorato.',
    inBreve: 'Sbriciola il golem sul sentiero a sud',
    inizia: (m, a) => {
      a.golem = m.nasciGolem(SENTIERO.x, SENTIERO.z, 2);
    },
    fatta: (m, a) => !m.golemVivo(a.golem),
  },
  {
    id: 'rudere', chi: 'Ugo', mestiere: 'il capomastro', colore: 0xb0a090, parola: 'risucchio', esperienza: 80, essenze: 16,
    richiesta: 'Fuori dal villaggio ci sono ruderi pericolanti. Riducine uno in macerie: almeno metà deve venire giù.',
    inBreve: 'Riduci in macerie un luogo fuori dal villaggio',
    inizia: (m, a) => {
      a.rasi = m.luoghiRasi();
    },
    fatta: (m, a) => m.luoghiRasi() > a.rasi,
  },
];

/** Com'è finita una missione. */
export interface Esito {
  readonly missione: Missione;
  readonly riuscita: boolean;
  /** Vero se l'incantesimo che l'ha risolta non era mai stato usato per questa missione. */
  readonly nuova: boolean;
  /** Quante soluzioni diverse sono state trovate finora per questa missione. */
  readonly soluzioni: number;
  readonly esperienza: number;
  readonly essenze: number;
  /** La parola imparata (solo la prima volta). */
  readonly parola?: string;
}

const CHIAVE = 'radura-missioni';

/**
 * Il quaderno delle missioni: quale è in corso e con quali incantesimi è stata risolta ognuna. La fantasia è
 * premiata: una soluzione nuova vale il premio pieno, ripetere la stessa vale la metà.
 */
export class Missioni {
  attiva: Missione | null = null;
  private appunti: Appunti = { golem: -1, rasi: 0, tempo: 0 };
  /** Per ogni missione, gli incantesimi con cui è stata risolta. */
  readonly soluzioni: Record<string, string[]> = {};

  carica(): void {
    try {
      const d = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as Record<string, unknown>;
      for (const m of MISSIONI) {
        const v = d[m.id];
        if (Array.isArray(v)) this.soluzioni[m.id] = v.filter((x): x is string => typeof x === 'string').slice(0, 60);
      }
    } catch {
      // Senza memoria del browser il quaderno vale solo per questa partita.
    }
  }

  private salva(): void {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(this.soluzioni));
    } catch {
      // Vedi sopra.
    }
  }

  /** Quante volte (con incantesimi diversi) è stata risolta una missione. */
  risolte(id: string): number {
    return this.soluzioni[id]?.length ?? 0;
  }

  accetta(id: string, m: MondoMissioni): Missione | null {
    const missione = MISSIONI.find((x) => x.id === id);
    if (!missione) return null;
    this.attiva = missione;
    this.appunti = { golem: -1, rasi: 0, tempo: 0 };
    missione.inizia(m, this.appunti);
    return missione;
  }

  /**
   * Guarda se la missione in corso è finita. `incantesimo` è il nome dell'ultimo lanciato: è lui la «soluzione».
   */
  aggiorna(dt: number, m: MondoMissioni, incantesimo: string): Esito | null {
    const missione = this.attiva;
    if (!missione) return null;
    this.appunti.tempo += dt;
    if (missione.fallita?.(m, this.appunti)) {
      this.attiva = null;
      return { missione, riuscita: false, nuova: false, soluzioni: this.risolte(missione.id), esperienza: 0, essenze: 0 };
    }
    if (!missione.fatta(m, this.appunti)) return null;
    this.attiva = null;
    const usate = (this.soluzioni[missione.id] ??= []);
    const prima = usate.length === 0;
    const nuova = !usate.includes(incantesimo);
    if (nuova) usate.push(incantesimo);
    this.salva();
    const quota = nuova ? 1 : 0.5;
    const esito: Esito = {
      missione, riuscita: true, nuova, soluzioni: usate.length,
      esperienza: Math.round(missione.esperienza * quota), essenze: Math.round(missione.essenze * quota),
    };
    return prima ? { ...esito, parola: missione.parola } : esito;
  }
}
