import * as THREE from 'three';
import { costruisciLuogo, LEGNO, PIETRA, type Mattone } from './mondo/costruzioni.js';
import { TIPI } from './mondo/zone.js';

/** Qualcosa che chi gioca ha costruito con la magia: che cosa, dove, girato come. */
export interface Opera {
  readonly tipo: string;
  readonly x: number;
  readonly z: number;
  /** L'altezza del terreno su cui poggia. */
  readonly quota: number;
  /** Verso dove guarda (radianti attorno alla verticale). */
  readonly giro: number;
  readonly seme: number;
}

/** Che cosa si può costruire. `luogo` dice quale costruzione del mondo si prende a modello (le grandi). */
export const OPERE: Readonly<Record<string, { nome: string; raggio: number; luogo?: string }>> = {
  blocco: { nome: 'Un blocco di pietra', raggio: 1 },
  parete: { nome: 'Una parete', raggio: 3.2 },
  scala: { nome: 'Una scala', raggio: 3.6 },
  torre: { nome: 'Una torre di vedetta', raggio: TIPI.vedetta!.raggio, luogo: 'vedetta' },
  fattoria: { nome: 'Una fattoria', raggio: TIPI.fattoria!.raggio, luogo: 'fattoria' },
  piramide: { nome: 'Una piramide', raggio: TIPI.piramide!.raggio, luogo: 'piramide' },
  tempio: { nome: 'Un tempio delle colonne', raggio: TIPI.tempio!.raggio, luogo: 'tempio' },
  igloo: { nome: 'Un villaggio di igloo', raggio: TIPI.igloo!.raggio, luogo: 'igloo' },
  guglia: { nome: 'Una guglia di cristallo', raggio: TIPI.guglia!.raggio, luogo: 'guglia' },
  palafitte: { nome: 'Palafitte', raggio: TIPI.palafitte!.raggio, luogo: 'palafitte' },
};

const GRIGI = [0x9a9488, 0x8b867b, 0xa8a195, 0x7d796f];
const BRUNI = [0x7a5230, 0x6b4526, 0x8a6038];

/** I pezzi di un'opera, pronti per prendere peso nel mondo. */
export function mattoniDi(o: Opera): Mattone[] {
  const modello = OPERE[o.tipo]?.luogo;
  if (modello) return costruisciLuogo({ tipo: modello, x: o.x, z: o.z, quota: o.quota, seme: o.seme });
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), o.giro);
  const cs = Math.cos(o.giro);
  const sn = Math.sin(o.giro);
  const pezzi: Mattone[] = [];
  let k = o.seme;
  /** Un pezzo: `lato` è lo spostamento di traverso, `avanti` quello in profondità, rispetto a come guarda l'opera. */
  const metti = (lato: number, y: number, avanti: number, sx: number, sy: number, sz: number, materiale: number): void => {
    k = (k * 16807) % 2147483647;
    const tinte = materiale === LEGNO ? BRUNI : GRIGI;
    pezzi.push({
      x: o.x + cs * lato + sn * avanti, y: o.quota + y, z: o.z - sn * lato + cs * avanti, q, sx, sy, sz, materiale,
      colore: new THREE.Color(tinte[k % tinte.length]!).multiplyScalar(0.92 + ((k >> 8) % 16) / 100), quota: o.quota,
    });
  };
  if (o.tipo === 'blocco') metti(0, 0.6, 0, 1.2, 1.2, 1.2, PIETRA);
  else if (o.tipo === 'parete') {
    // Cinque filari sfalsati, come un muro vero: così ogni blocco poggia su due.
    for (let f = 0; f < 5; f++) {
      const y = 0.3 + f * 0.6;
      if (f % 2 === 0) for (let i = 0; i < 5; i++) metti(-2.4 + i * 1.2, y, 0, 1.18, 0.6, 0.7, PIETRA);
      else {
        metti(-2.7, y, 0, 0.58, 0.6, 0.7, PIETRA);
        for (let i = 0; i < 4; i++) metti(-1.8 + i * 1.2, y, 0, 1.18, 0.6, 0.7, PIETRA);
        metti(2.7, y, 0, 0.58, 0.6, 0.7, PIETRA);
      }
    }
  } else if (o.tipo === 'scala') {
    // Sei gradini pieni: ogni gradino è una colonna di blocchi, così non resta niente sospeso.
    for (let g = 0; g < 6; g++) for (let p = 0; p <= g; p++) metti(0, 0.25 + p * 0.5, -3 + g * 1.0, 2.2, 0.5, 0.98, LEGNO);
  }
  return pezzi;
}

const CHIAVE = 'radura-opere';
/** Quante opere grandi (edifici) e quante in tutto si possono avere: oltre, il telefono farebbe fatica. */
export const MASSIMO_GRANDI = 6;
export const MASSIMO_OPERE = 60;

/** Il cantiere di chi gioca: tiene l'elenco di ciò che ha costruito, e lo ricorda da una partita all'altra. */
export class Cantiere {
  readonly opere: Opera[] = [];

  carica(): void {
    try {
      for (const d of JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown[]) {
        const o = d as Partial<Opera>;
        if (typeof o.tipo === 'string' && OPERE[o.tipo] && [o.x, o.z, o.quota, o.giro, o.seme].every((v) => typeof v === 'number' && Number.isFinite(v))) {
          this.opere.push({ tipo: o.tipo, x: o.x!, z: o.z!, quota: o.quota!, giro: o.giro!, seme: o.seme! });
        }
      }
      this.opere.length = Math.min(this.opere.length, MASSIMO_OPERE);
    } catch {
      // Senza memoria del browser le costruzioni valgono solo per questa partita.
    }
  }

  private salva(): void {
    try {
      localStorage.setItem(CHIAVE, JSON.stringify(this.opere));
    } catch {
      // Vedi sopra.
    }
  }

  /** Perché non si può costruire lì, in parole per chi gioca; stringa vuota se si può. */
  impedimento(tipo: string, x: number, z: number): string {
    const dati = OPERE[tipo];
    if (!dati) return 'Non so costruirlo.';
    if (this.opere.length >= MASSIMO_OPERE) return `Hai già ${MASSIMO_OPERE} costruzioni: smontane qualcuna.`;
    if (dati.luogo && this.opere.filter((o) => OPERE[o.tipo]!.luogo).length >= MASSIMO_GRANDI) return `Hai già ${MASSIMO_GRANDI} edifici: smontane uno.`;
    // Gli edifici non si compenetrano; i pezzi piccoli si possono accostare e impilare.
    if (dati.luogo && this.opere.some((o) => Math.hypot(o.x - x, o.z - z) < OPERE[o.tipo]!.raggio + dati.raggio)) return 'Qui c’è già una tua costruzione: scegli un posto più libero.';
    return '';
  }

  aggiungi(o: Opera): void {
    this.opere.push(o);
    this.salva();
  }

  /** Toglie le opere il cui centro sta in un cerchio e le restituisce. */
  smonta(x: number, z: number, raggio: number): Opera[] {
    const via = this.opere.filter((o) => Math.hypot(o.x - x, o.z - z) < Math.max(raggio, OPERE[o.tipo]!.raggio * 0.7));
    for (const o of via) this.opere.splice(this.opere.indexOf(o), 1);
    if (via.length > 0) this.salva();
    return via;
  }
}
