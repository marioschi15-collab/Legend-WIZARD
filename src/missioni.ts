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
  /** Toglie dal mondo il golem di una missione lasciata a metà. */
  togliGolem(numero: number): void;
  /** Quante volte, finora, un luogo fuori dal villaggio è stato demolito almeno per metà. */
  luoghiRasi(): number;
  /** Quanti metri separano chi gioca da un punto. */
  lontano(x: number, z: number): number;
}

/** Quello che una missione si ricorda mentre è in corso. */
interface Appunti {
  golem: number;
  rasi: number;
  tempo: number;
  /** Per il fieno: vero da quando ha preso fuoco. */
  acceso: boolean;
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
  /** Qualcosa da fare a ogni istante mentre è in corso (il fieno che prende fuoco quando si arriva). */
  passo?(m: MondoMissioni, a: Appunti): void;
  /** Rimette a posto il mondo quando la missione viene lasciata a metà. */
  lascia?(m: MondoMissioni, a: Appunti): void;
}

const ORTO = { x: 30, z: 74, raggio: 6 };
const FIENO = { x: -30, z: 74, raggio: 12 };
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
    richiesta: 'Dal mio fieno esce fumo! Corri al cerchio dorato: appena arrivi prenderà fuoco. Spegnilo prima che ne bruci metà.',
    inBreve: 'Vai al cerchio dorato e spegni il fuoco prima che bruci metà del fieno',
    inizia: (m, a) => {
      m.risana(FIENO.x, FIENO.z, FIENO.raggio + 3);
      a.acceso = false;
    },
    // Il fuoco parte da un bordo, e solo quando chi gioca è abbastanza vicino da poterlo spegnere: restano una
    // decina di secondi prima che metà del campo sia andata.
    passo: (m, a) => {
      if (a.acceso || m.lontano(FIENO.x, FIENO.z) > 30) return;
      a.acceso = true;
      a.tempo = 0;
      m.accendi(FIENO.x, FIENO.z + FIENO.raggio * 0.7, 2);
    },
    fatta: (m, a) => a.acceso && a.tempo > 1.5 && m.inFiamme(FIENO.x, FIENO.z, FIENO.raggio + 8) === 0 && m.bruciato(FIENO.x, FIENO.z, FIENO.raggio) < 0.5,
    fallita: (m, a) => a.acceso && a.tempo > 1.5 && m.bruciato(FIENO.x, FIENO.z, FIENO.raggio) >= 0.5,
    lascia: (m) => m.risana(FIENO.x, FIENO.z, FIENO.raggio + 8),
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
    lascia: (m, a) => m.togliGolem(a.golem),
  },
  {
    id: 'rudere', chi: 'Ugo', mestiere: 'il capomastro', colore: 0xb0a090, parola: 'risucchio', esperienza: 80, essenze: 16,
    richiesta: 'Fuori dal villaggio ci sono ruderi pericolanti (i cerchietti sulla mappa). Buttane giù uno: almeno metà.',
    inBreve: 'Butta giù almeno metà di un luogo fuori dal villaggio',
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
  private appunti: Appunti = { golem: -1, rasi: 0, tempo: 0, acceso: false };
  /** Per ogni missione, i nomi degli incantesimi con cui è stata risolta (per il quaderno)… */
  readonly soluzioni: Record<string, string[]> = {};
  /** …e le loro «firme»: com'è fatto l'incantesimo, non come si chiama. È la firma a dire se una soluzione è nuova. */
  private readonly firme: Record<string, string[]> = {};
  /** Le missioni appena compiute: l'abitante le ripropone solo dopo l'alba o il tramonto. */
  readonly riposo = new Set<string>();

  carica(): void {
    try {
      const d = JSON.parse(localStorage.getItem(CHIAVE) ?? '{}') as Record<string, unknown>;
      const f = JSON.parse(localStorage.getItem(CHIAVE + '-firme') ?? '{}') as Record<string, unknown>;
      const stringhe = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 60) : []);
      for (const m of MISSIONI) {
        if (Array.isArray(d[m.id])) this.soluzioni[m.id] = stringhe(d[m.id]);
        // Chi ha un quaderno di prima delle firme: i nomi di allora valgono da firme.
        this.firme[m.id] = Array.isArray(f[m.id]) ? stringhe(f[m.id]) : [...(this.soluzioni[m.id] ?? [])];
      }
    } catch {
      // Senza memoria del browser il quaderno vale solo per questa partita.
    }
  }

  private salva(): void {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(this.soluzioni));
      localStorage.setItem(CHIAVE + '-firme', JSON.stringify(this.firme));
    } catch {
      // Vedi sopra.
    }
  }

  /** Quante volte (con incantesimi diversi) è stata risolta una missione. */
  risolte(id: string): number {
    return this.soluzioni[id]?.length ?? 0;
  }

  /** Comincia una missione (lasciando, e rimettendo a posto, quella che c'era). Null se l'abitante sta riposando. */
  accetta(id: string, m: MondoMissioni): Missione | null {
    const missione = MISSIONI.find((x) => x.id === id);
    if (!missione || this.riposo.has(id)) return null;
    this.annulla(m);
    this.attiva = missione;
    this.appunti = { golem: -1, rasi: 0, tempo: 0, acceso: false };
    missione.inizia(m, this.appunti);
    return missione;
  }

  /** Lascia a metà la missione in corso, rimettendo a posto ciò che aveva preparato. */
  annulla(m: MondoMissioni): void {
    this.attiva?.lascia?.(m, this.appunti);
    this.attiva = null;
  }

  /** All'alba e al tramonto gli abitanti hanno di nuovo bisogno. */
  sveglia(): void {
    this.riposo.clear();
  }

  /**
   * Guarda se la missione in corso è finita. `firma` dice com'è fatto l'ultimo incantesimo lanciato (è lui la
   * «soluzione»), `nome` come si chiama.
   */
  aggiorna(dt: number, m: MondoMissioni, firma: string, nome = firma): Esito | null {
    const missione = this.attiva;
    if (!missione) return null;
    this.appunti.tempo += dt;
    missione.passo?.(m, this.appunti);
    if (missione.fallita?.(m, this.appunti)) {
      this.annulla(m);
      return { missione, riuscita: false, nuova: false, soluzioni: this.risolte(missione.id), esperienza: 0, essenze: 0 };
    }
    if (!missione.fatta(m, this.appunti)) return null;
    this.attiva = null;
    this.riposo.add(missione.id);
    const usate = (this.soluzioni[missione.id] ??= []);
    const firme = (this.firme[missione.id] ??= []);
    const prima = usate.length === 0;
    const nuova = !firme.includes(firma);
    if (nuova) {
      firme.push(firma);
      usate.push(usate.includes(nome) ? `${nome} (un altro)` : nome);
    }
    this.salva();
    const quota = nuova ? 1 : 0.5;
    const esito: Esito = {
      missione, riuscita: true, nuova, soluzioni: usate.length,
      esperienza: Math.round(missione.esperienza * quota), essenze: Math.round(missione.essenze * quota),
    };
    return prima ? { ...esito, parola: missione.parola } : esito;
  }
}
