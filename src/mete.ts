/**
 * Le mete: una sola cosa da fare, sempre scritta sullo schermo. Le prime accompagnano dentro il gioco un passo alla
 * volta (bastone, abitanti e missioni, incantesimi a parole, creature, parole nuove, livelli, guardiani, costruire,
 * altre terre); poi diventano traguardi di esplorazione senza fine.
 */
export interface Fatti {
  /** Quante volte è stato lanciato ogni incantesimo, per nome. */
  lanci: Record<string, number>;
  /** Quante volte il Gelo è stato lanciato mentre qualcosa bruciava. */
  spenti: number;
  inventati: number;
  luoghi: number;
  /** Quante terre diverse sono state visitate. */
  terre: number;
  perduti: number;
  /** Missioni accettate e compiute, creature sbriciolate, parole imparate oltre a quelle di partenza. */
  accettate: number;
  missioni: number;
  creature: number;
  parole: number;
  /** Parole comprate con le essenze. */
  comprate: number;
  /** Punti di livello spesi, luoghi liberati, costruzioni fatte, terre domate. */
  potenziamenti: number;
  liberati: number;
  costruzioni: number;
  domate: number;
}

interface Meta {
  testo: (dita: boolean) => string;
  fatta: (f: Fatti) => boolean;
}

const lanciato = (nome: string) => (f: Fatti): boolean => (f.lanci[nome] ?? 0) > 0;

const GUIDATE: readonly Meta[] = [
  { testo: (dita) => (dita ? 'Prova il bastone: tieni premuto ✦ e lancia una palla di fuoco' : 'Prova il bastone: fai clic e lancia una palla di fuoco'), fatta: lanciato('Fuoco') },
  { testo: () => 'Avvicinati a un abitante con il punto esclamativo dorato', fatta: (f) => f.accettate > 0 || f.missioni > 0 },
  { testo: () => 'Porta a termine la missione di un abitante', fatta: (f) => f.missioni > 0 },
  { testo: (dita) => `${dita ? 'Tocca «✎ Scrivi»' : 'Premi T'} e crea un incantesimo tuo, per esempio «pioggia di ghiaccio»`, fatta: (f) => f.inventati > 0 },
  { testo: () => 'Esci dal villaggio e sbriciola una creatura', fatta: (f) => f.creature > 0 },
  { testo: () => 'Compra una parola nuova con le essenze ◆, nel foglio «Scrivi un incantesimo»', fatta: (f) => f.comprate > 0 },
  { testo: (dita) => `Sali di livello e spendi il punto (${dita ? 'pulsante dorato accanto alla mappa' : 'tasto P'})`, fatta: (f) => f.potenziamenti > 0 },
  { testo: () => 'Raggiungi un cerchietto della mappa e batti il guardiano con la corona', fatta: (f) => f.liberati > 0 },
  { testo: () => 'Costruisci qualcosa di tuo: scrivi «tocco blocco»', fatta: (f) => f.costruzioni > 0 },
  { testo: () => 'Trova un’altra terra e vinci la sua sfida', fatta: (f) => f.domate > 0 },
  { testo: () => 'Segui una colonna di luce: lì c’è un incantesimo perduto', fatta: (f) => f.perduti > 0 },
];

// La chiave è cambiata quando le mete sono state rifatte attorno al mago che cresce: chi aveva le vecchie riparte.
const CHIAVE = 'radura-mete2';

export class Mete {
  private indice = 0;

  constructor(private readonly dita: boolean) {
    try {
      const n = Number(localStorage.getItem(CHIAVE));
      if (Number.isFinite(n) && n > 0) this.indice = Math.floor(n);
    } catch {
      // Senza memoria del browser si riparte dalla prima meta.
    }
  }

  /** Dopo le mete guidate: scoprire 5, 10, 20, 40… luoghi. */
  private traguardo(): number {
    return 5 * 2 ** (this.indice - GUIDATE.length);
  }

  /** La meta da mostrare adesso. */
  attuale(): string {
    const m = GUIDATE[this.indice];
    return m ? m.testo(this.dita) : `Scopri ${this.traguardo()} luoghi`;
  }

  /** Se la meta attuale è stata raggiunta passa alla prossima e restituisce il testo di quella appena fatta. */
  controlla(f: Fatti): string | null {
    const m = GUIDATE[this.indice];
    if (!(m ? m.fatta(f) : f.luoghi >= this.traguardo())) return null;
    const fatta = this.attuale();
    this.indice++;
    try {
      localStorage.setItem(CHIAVE, String(this.indice));
    } catch {
      // Pazienza.
    }
    return fatta;
  }
}
