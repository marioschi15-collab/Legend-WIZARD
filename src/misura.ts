/**
 * La misura della fluidità: un giro automatico per i posti più pesanti del gioco, fatto sul dispositivo di chi gioca.
 * Chi sviluppa non ha una scheda grafica né un telefono vero: questo è il modo per sapere come va davvero. In ogni
 * posto si aspetta che tutto sia arrivato, ci si guarda attorno per qualche secondo contando quante immagini al
 * secondo escono, e dove serve si fa scoppiare qualcosa per misurare anche i crolli. Alla fine c'è un risultato in
 * parole semplici e un testo da copiare e mandare.
 */
export interface Sosta {
  readonly nome: string;
  readonly x: number;
  readonly z: number;
  /** Da che parte si guarda arrivando (poi si fa un giro intero). */
  readonly guarda: number;
  /** Se c'è, dopo il giro lì si fa scoppiare qualcosa e si misura anche quello. */
  readonly scoppio?: { readonly x: number; readonly z: number };
}

/** Ciò che la misura chiede al gioco. */
export interface AzioniMisura {
  vai(x: number, z: number, imbardata: number): void;
  gira(imbardata: number): void;
  /** Vero quando attorno a chi gioca è arrivato tutto (le forme delle zone fatte a mano si scaricano avvicinandosi). */
  pronto(): boolean;
  scoppio(x: number, z: number): void;
  /** Rimette tutto com'era dopo uno scoppio. */
  rimetti(): void;
  /** Quanto si sta disegnando: triangoli e numero di disegni dell'ultima immagine. */
  disegnato(): { triangoli: number; disegni: number };
}

export interface Esito {
  readonly nome: string;
  /** Immagini al secondo: in media, e nei momenti peggiori (una immagine su cinquanta è più lenta di così). */
  readonly medie: number;
  readonly peggiori: number;
  /** Quante immagini hanno impiegato più di un ventesimo di secondo: sono gli scatti che si notano. */
  readonly scatti: number;
  /** Millesimi di secondo spesi, in media, nei conti del gioco (fisica, creature, mondo) per ogni immagine. */
  readonly conti: number;
  readonly triangoli: number;
  readonly disegni: number;
}

export type Giudizio = 'fluido' | 'giocabile' | 'a scatti';

export function giudizio(e: Esito): Giudizio {
  if (e.medie >= 50 && e.peggiori >= 30) return 'fluido';
  return e.medie >= 30 ? 'giocabile' : 'a scatti';
}

const ATTESA_MINIMA = 1;
const ATTESA_MASSIMA = 12;
const ASSESTO = 2;
const GIRO = 6;
const CROLLO = 3.5;

type Fase = 'arrivo' | 'assesto' | 'giro' | 'crollo';

export class Misura {
  readonly esiti: Esito[] = [];
  finita = false;
  private indice = -1;
  private fase: Fase = 'arrivo';
  private tempo = 0;
  private tempi: number[] = [];
  private conti = 0;

  constructor(
    private readonly soste: readonly Sosta[],
    private readonly azioni: AzioniMisura,
  ) {
    this.prossima();
  }

  /** Che cosa sta facendo adesso, per chi guarda. */
  get stato(): string {
    const s = this.soste[this.indice];
    if (!s) return 'Fatto';
    const cosa = this.fase === 'arrivo' ? 'arrivo' : this.fase === 'assesto' ? 'un momento' : this.fase === 'giro' ? 'misuro' : 'misuro uno scoppio';
    return `${this.indice + 1} di ${this.soste.length} · ${s.nome} · ${cosa}`;
  }

  private prossima(): void {
    this.indice++;
    const s = this.soste[this.indice];
    if (!s) {
      this.finita = true;
      return;
    }
    this.fase = 'arrivo';
    this.tempo = 0;
    this.azioni.vai(s.x, s.z, s.guarda);
  }

  private comincia(fase: Fase): void {
    this.fase = fase;
    this.tempo = 0;
    this.tempi = [];
    this.conti = 0;
  }

  private chiudi(nome: string): void {
    const tempi = this.tempi;
    if (tempi.length === 0) return;
    const totale = tempi.reduce((a, b) => a + b, 0);
    const ordinati = [...tempi].sort((a, b) => a - b);
    const lento = ordinati[Math.min(ordinati.length - 1, Math.floor(ordinati.length * 0.98))]!;
    const d = this.azioni.disegnato();
    this.esiti.push({
      nome,
      medie: tempi.length / totale,
      peggiori: 1 / lento,
      scatti: tempi.filter((t) => t > 0.05).length,
      conti: this.conti / tempi.length,
      triangoli: d.triangoli,
      disegni: d.disegni,
    });
  }

  /**
   * Da chiamare a ogni immagine disegnata: `dt` sono i secondi passati dalla precedente, `lavoro` i millesimi spesi
   * nei conti del gioco. `nascosta` va messo vero se nel frattempo la finestra è finita dietro un'altra: quell'attesa
   * non è lentezza e non si conta. (Una immagine lentissima invece si conta eccome: su un dispositivo che ci mette
   * due secondi a disegnarne una, il giro deve finire lo stesso e dirlo.) Restituisce vero quando il giro è finito.
   */
  fotogramma(dt: number, lavoro: number, nascosta = false): boolean {
    if (this.finita || nascosta) return this.finita;
    const s = this.soste[this.indice]!;
    this.tempo += dt;
    if (this.fase === 'arrivo') {
      if ((this.tempo >= ATTESA_MINIMA && this.azioni.pronto()) || this.tempo >= ATTESA_MASSIMA) this.comincia('assesto');
    } else if (this.fase === 'assesto') {
      if (this.tempo >= ASSESTO) this.comincia('giro');
    } else if (this.fase === 'giro') {
      this.tempi.push(dt);
      this.conti += lavoro;
      this.azioni.gira(s.guarda + (this.tempo / GIRO) * Math.PI * 2);
      if (this.tempo >= GIRO) {
        this.chiudi(s.nome);
        if (s.scoppio) {
          this.azioni.gira(s.guarda);
          this.azioni.scoppio(s.scoppio.x, s.scoppio.z);
          this.comincia('crollo');
        } else {
          this.prossima();
        }
      }
    } else {
      this.tempi.push(dt);
      this.conti += lavoro;
      if (this.tempo >= CROLLO) {
        this.chiudi(`${s.nome}, durante uno scoppio`);
        this.azioni.rimetti();
        this.prossima();
      }
    }
    return this.finita;
  }
}

const migliaia = (n: number): string => (n >= 1000 ? `${Math.round(n / 1000)} mila` : String(Math.round(n)));

/** Il testo da copiare e mandare a chi sviluppa: una riga per posto, con tutti i numeri. */
export function resoconto(esiti: readonly Esito[], dispositivo: string, versione: string): string {
  const righe = esiti.map(
    (e) =>
      `${e.nome}: ${Math.round(e.medie)} al secondo (momenti peggiori ${Math.round(e.peggiori)}) · ${giudizio(e)} · scatti ${e.scatti} · ` +
      `triangoli ${migliaia(e.triangoli)} · disegni ${Math.round(e.disegni)} · conti ${e.conti.toFixed(1)} ms`,
  );
  return [`LEGEND WIZARD · misura della fluidità · versione del ${versione}`, dispositivo, ...righe].join('\n');
}
