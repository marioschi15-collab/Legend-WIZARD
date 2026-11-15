import type { Incantesimo } from './gioco.js';

const CHIAVE = 'radura-mago';

/** Su che cosa si può spendere il punto di un livello. */
export type Potenziamento = 'vita' | 'mana' | 'ricarica';

interface Salvato {
  livello: number;
  esperienza: number;
  punti: number;
  essenze: number;
  potenziamenti: Record<Potenziamento, number>;
}

/** Quanto mana costa un incantesimo: quelli che si ricaricano piano sono i più potenti, e costano di più. */
export function costoDi(magia: Incantesimo): number {
  return Math.min(60, Math.round(6 + magia.ricarica * 5));
}

/** Quanta esperienza serve per passare dal livello dato al successivo. */
export function esperienzaPer(livello: number): number {
  return 60 + (livello - 1) * 45;
}

/**
 * Il mago: vita, mana, livelli, punti da spendere, essenze. Qui c'è solo la regola del gioco, senza schermo né
 * suoni, così la si può provare da sola.
 */
export class Mago {
  vita = 100;
  mana = 100;
  livello = 1;
  esperienza = 0;
  punti = 0;
  essenze = 0;
  readonly potenziamenti: Record<Potenziamento, number> = { vita: 0, mana: 0, ricarica: 0 };
  /** Secondi passati dall'ultima ferita: dopo un po' di quiete la vita torna da sola. */
  private quiete = 99;

  get vitaMassima(): number {
    return 100 + this.potenziamenti.vita * 20;
  }

  get manaMassimo(): number {
    return 100 + this.potenziamenti.mana * 20;
  }

  /** Mana che torna in un secondo. */
  get ricarica(): number {
    return 7 * (1 + this.potenziamenti.ricarica * 0.2);
  }

  aggiorna(dt: number): void {
    this.mana = Math.min(this.manaMassimo, this.mana + this.ricarica * dt);
    this.quiete += dt;
    if (this.quiete > 6) this.vita = Math.min(this.vitaMassima, this.vita + 4 * dt);
  }

  /** Toglie il mana di un lancio; dice falso (e non toglie nulla) se non basta. */
  spendi(costo: number): boolean {
    if (this.mana < costo) return false;
    this.mana -= costo;
    return true;
  }

  /** Una ferita. Dice vero se la vita è finita. */
  ferisci(quanto: number): boolean {
    if (quanto <= 0) return false;
    this.vita = Math.max(0, this.vita - quanto);
    this.quiete = 0;
    return this.vita <= 0;
  }

  /** Esperienza ed essenze guadagnate. Restituisce di quanti livelli si è saliti. */
  guadagna(esperienza: number, essenze: number): number {
    this.essenze += essenze;
    this.esperienza += esperienza;
    let saliti = 0;
    while (this.esperienza >= esperienzaPer(this.livello)) {
      this.esperienza -= esperienzaPer(this.livello);
      this.livello++;
      this.punti++;
      saliti++;
    }
    if (saliti > 0) {
      this.vita = this.vitaMassima;
      this.mana = this.manaMassimo;
    }
    this.salva();
    return saliti;
  }

  /** Spende un punto. Dice falso se non ce ne sono. */
  potenzia(che: Potenziamento): boolean {
    if (this.punti <= 0) return false;
    this.punti--;
    this.potenziamenti[che]++;
    if (che === 'vita') this.vita = this.vitaMassima;
    if (che === 'mana') this.mana = this.manaMassimo;
    this.salva();
    return true;
  }

  /** Si rinasce interi, ma un quinto delle essenze resta dove si è caduti. I progressi non si perdono mai. */
  rinasci(): number {
    const perse = Math.floor(this.essenze * 0.2);
    this.essenze -= perse;
    this.vita = this.vitaMassima;
    this.mana = this.manaMassimo;
    this.quiete = 99;
    this.salva();
    return perse;
  }

  carica(): void {
    try {
      const d = JSON.parse(localStorage.getItem(CHIAVE) ?? 'null') as Partial<Salvato> | null;
      if (!d) return;
      const intero = (v: unknown, minimo: number): number => (typeof v === 'number' && Number.isFinite(v) ? Math.max(minimo, Math.floor(v)) : minimo);
      this.livello = intero(d.livello, 1);
      this.esperienza = intero(d.esperienza, 0);
      this.punti = intero(d.punti, 0);
      this.essenze = intero(d.essenze, 0);
      for (const k of ['vita', 'mana', 'ricarica'] as const) this.potenziamenti[k] = intero(d.potenziamenti?.[k], 0);
      this.vita = this.vitaMassima;
      this.mana = this.manaMassimo;
    } catch {
      // Senza memoria (navigazione privata) si riparte dal primo livello: il gioco funziona lo stesso.
    }
  }

  private salva(): void {
    try {
      const d: Salvato = { livello: this.livello, esperienza: this.esperienza, punti: this.punti, essenze: this.essenze, potenziamenti: this.potenziamenti };
      localStorage.setItem(CHIAVE, JSON.stringify(d));
    } catch {
      // Vedi sopra.
    }
  }
}
