/** Quanto dura un giorno intero, in secondi di gioco. */
export const DURATA_GIORNO = 600;

export type Momento = 'giorno' | 'tramonto' | 'notte' | 'alba';

/**
 * Il giro del giorno e della notte: sei minuti di giorno, uno di tramonto, due di notte, uno d'alba.
 * Di notte c'è meno luce, le creature sono di più e più forti, e lasciano più essenze.
 */
export class Giornata {
  /** A che punto del giro si è, da 0 (mattino) a 1 (il mattino dopo). */
  ora = 0;

  aggiorna(dt: number): void {
    this.ora = (this.ora + dt / DURATA_GIORNO) % 1;
  }

  get momento(): Momento {
    return this.ora < 0.6 ? 'giorno' : this.ora < 0.7 ? 'tramonto' : this.ora < 0.9 ? 'notte' : 'alba';
  }

  /** Quanta luce c'è: 1 di giorno, 0 di notte, e una sfumatura morbida in mezzo. */
  get luce(): number {
    const t = this.ora < 0.6 ? 1 : this.ora < 0.7 ? 1 - (this.ora - 0.6) / 0.1 : this.ora < 0.9 ? 0 : (this.ora - 0.9) / 0.1;
    return t * t * (3 - 2 * t);
  }

  get notte(): boolean {
    return this.momento === 'notte';
  }
}
