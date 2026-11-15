import * as THREE from 'three';
import { anello, bolla, creaCerchioMagico, rendi, Saetta, scia } from '../effetti/forme.js';
import type { Effetto, Elemento, Gioco, Incantesimo, Lancio } from '../gioco.js';
import { altezza } from '../mondo/terreno.js';
import { Cristalli } from './cristalli.js';
import { Levitazione } from './levitazione.js';

/**
 * L'officina degli incantesimi: chi gioca ne inventa di suoi mettendo insieme pochi mattoni.
 * Una "ricetta" dice come parte l'incantesimo (la forma), che cosa fa dove arriva (fino a tre effetti),
 * quanto è forte e quanto è ampio. Ogni ricetta si può trasformare in un codice da passare a un amico.
 */
export interface Ricetta {
  nome: string;
  simbolo: string;
  colore: number;
  forma: string;
  effetti: string[];
  /** 1 lieve, 2 forte, 3 devastante. */
  potenza: number;
  /** 1 stretta, 2 media, 3 vasta. */
  ampiezza: number;
  /** Come si comporta dopo il primo colpo (doppio, ritardato, rimbalza, contagioso); può mancare. */
  modi?: string[];
}

export interface Scelta {
  readonly id: string;
  readonly nome: string;
  readonly simbolo: string;
  readonly cosaFa: string;
}

export const FORME: readonly Scelta[] = [
  { id: 'palla', nome: 'Palla', simbolo: '🔮', cosaFa: 'vola dal bastone fin dove miri' },
  { id: 'tocco', nome: 'Tocco', simbolo: '👉', cosaFa: 'succede all’istante dove miri' },
  { id: 'cielo', nome: 'Dal cielo', simbolo: '🌠', cosaFa: 'cala dall’alto dopo un attimo' },
  { id: 'pioggia', nome: 'Pioggia', simbolo: '🌧️', cosaFa: 'sei colpi sparsi tutt’intorno' },
  { id: 'onda', nome: 'Onda', simbolo: '🌊', cosaFa: 'una fila di colpi da te al bersaglio' },
  { id: 'me', nome: 'Su di me', simbolo: '🧙', cosaFa: 'succede dove sei tu' },
  { id: 'cerchio', nome: 'Cerchio', simbolo: '⭕', cosaFa: 'otto colpi in tondo attorno al punto' },
  { id: 'mina', nome: 'Trappola', simbolo: '🪤', cosaFa: 'aspetta a terra e scatta quando passa una creatura' },
  { id: 'sciame', nome: 'Sciame', simbolo: '🐝', cosaFa: 'tre globi che inseguono le creature' },
];

export const EFFETTI: readonly Scelta[] = [
  { id: 'scoppio', nome: 'Scoppio', simbolo: '💥', cosaFa: 'scaglia via i pezzi' },
  { id: 'risucchio', nome: 'Risucchio', simbolo: '🕳️', cosaFa: 'tira i pezzi verso il centro' },
  { id: 'solleva', nome: 'Solleva', simbolo: '⬆️', cosaFa: 'lancia tutto verso l’alto' },
  { id: 'vortice', nome: 'Vortice', simbolo: '🌀', cosaFa: 'fa girare i pezzi in tondo' },
  { id: 'brucia', nome: 'Brucia', simbolo: '🔥', cosaFa: 'incendia erba e legno' },
  { id: 'gela', nome: 'Gela', simbolo: '❄️', cosaFa: 'ghiaccia e spegne il fuoco' },
  { id: 'folgora', nome: 'Folgora', simbolo: '⚡', cosaFa: 'una saetta dal cielo' },
  { id: 'fiorisce', nome: 'Fiorisce', simbolo: '🌸', cosaFa: 'fa crescere erba e fiori' },
  { id: 'cristalli', nome: 'Cristalli', simbolo: '💎', cosaFa: 'spuntoni che eruttano in cerchio' },
  { id: 'bolla', nome: 'Bolla', simbolo: '🎈', cosaFa: 'per un po’ lì il peso sparisce' },
  { id: 'rammenda', nome: 'Rammenda', simbolo: '⏳', cosaFa: 'rimette a posto ciò che è rotto' },
  // --- la magia che non rompe: cura, protegge, sposta, inganna, evoca ---
  { id: 'cura', nome: 'Cura', simbolo: '💚', cosaFa: 'ti ridà vita, se sei lì vicino' },
  { id: 'scudo', nome: 'Scudo', simbolo: '🛡️', cosaFa: 'per un po’ le ferite pesano un quarto' },
  { id: 'svelto', nome: 'Passo svelto', simbolo: '💨', cosaFa: 'per un po’ corri molto più veloce' },
  { id: 'balzo', nome: 'Balzo', simbolo: '🦘', cosaFa: 'per un po’ salti altissimo' },
  { id: 'ombra', nome: 'Ombra', simbolo: '👻', cosaFa: 'per un po’ le creature non ti vedono' },
  { id: 'varco', nome: 'Varco', simbolo: '🚪', cosaFa: 'ti porta in un attimo dove miri' },
  { id: 'luce', nome: 'Luce', simbolo: '💡', cosaFa: 'un globo di luce che resta sospeso' },
  { id: 'acqua', nome: 'Acqua', simbolo: '💧', cosaFa: 'spegne ogni fuoco e rinfresca il prato' },
  { id: 'albero', nome: 'Albero', simbolo: '🌳', cosaFa: 'fa nascere un albero' },
  { id: 'muro', nome: 'Muro', simbolo: '🧱', cosaFa: 'alza una fila di cristalli che sbarra la strada' },
  { id: 'peso', nome: 'Peso', simbolo: '🪨', cosaFa: 'schiaccia a terra pezzi e creature' },
  { id: 'trema', nome: 'Terremoto', simbolo: '🌋', cosaFa: 'scuote tutto quello che sta in piedi' },
  { id: 'sonno', nome: 'Sonno', simbolo: '💤', cosaFa: 'addormenta le creature finché non le tocchi' },
  { id: 'pecora', nome: 'Pecora', simbolo: '🐑', cosaFa: 'trasforma le creature in pecorelle innocue' },
  { id: 'paura', nome: 'Paura', simbolo: '😱', cosaFa: 'fa scappare le creature' },
  { id: 'lento', nome: 'Ragnatela', simbolo: '🕸️', cosaFa: 'rallenta molto le creature' },
  { id: 'veleno', nome: 'Veleno', simbolo: '☠️', cosaFa: 'consuma le creature poco a poco, anche le immuni' },
  { id: 'mignon', nome: 'Rimpicciolisci', simbolo: '🐜', cosaFa: 'rende le creature piccole e deboli' },
  { id: 'linfa', nome: 'Ruba vita', simbolo: '🩸', cosaFa: 'toglie vita alle creature e la dà a te' },
  { id: 'evoca', nome: 'Evoca', simbolo: '🗿', cosaFa: 'chiama un golem amico che combatte per te' },
  // --- costruire: quello che nasce resta nel mondo, salvato ---
  { id: 'blocco', nome: 'Blocco', simbolo: '🧱', cosaFa: 'posa un blocco di pietra' },
  { id: 'parete', nome: 'Parete', simbolo: '🧱', cosaFa: 'alza una parete di pietra' },
  { id: 'scala', nome: 'Scala', simbolo: '🪜', cosaFa: 'costruisce una scala di legno' },
  { id: 'torre', nome: 'Torre', simbolo: '🏰', cosaFa: 'costruisce una torre di vedetta' },
  { id: 'fattoria', nome: 'Fattoria', simbolo: '🏠', cosaFa: 'costruisce una fattoria' },
  { id: 'piramide', nome: 'Piramide', simbolo: '🏠', cosaFa: 'costruisce una piramide' },
  { id: 'tempio', nome: 'Tempio', simbolo: '🏠', cosaFa: 'costruisce un tempio di colonne' },
  { id: 'igloo', nome: 'Igloo', simbolo: '🏠', cosaFa: 'costruisce un gruppo di igloo' },
  { id: 'guglia', nome: 'Guglia', simbolo: '🏰', cosaFa: 'costruisce una guglia di cristallo' },
  { id: 'palafitte', nome: 'Palafitte', simbolo: '🏠', cosaFa: 'costruisce case su palafitte' },
  { id: 'smonta', nome: 'Smonta', simbolo: '🧹', cosaFa: 'toglie le tue costruzioni lì attorno' },
];

/** Gli effetti che costruiscono: valgono una volta sola per lancio, non nelle repliche. */
const COSTRUZIONI = new Set(['blocco', 'parete', 'scala', 'torre', 'fattoria', 'piramide', 'tempio', 'igloo', 'guglia', 'palafitte']);

export const SIMBOLI = ['✨', '🌙', '☀️', '⭐', '👁️', '🐉', '🦋', '🍄', '🌊', '🪄', '💀', '👑', '🌈', '🕯️', '🦅', '🐺', '💚', '🛡️', '💨', '🦘', '👻', '🚪', '💡', '💧', '🌳', '🧱', '🪨', '🌋', '💤', '🐑', '😱', '🕸️', '☠️', '🐜', '🩸', '🗿', '🧱', '🪜', '🏰', '🏠', '🧹'];
export const COLORI = [0xff5a3a, 0xffb02e, 0xffe14a, 0x6dff6a, 0x4fe0c8, 0x6fb8ff, 0xa56bff, 0xff7ad0];
export const MASSIMO_EFFETTI = 3;
export const MASSIMO_RICETTE = 12;

/** I comportamenti: non cambiano che cosa fa l'incantesimo, ma quante volte e dove succede. */
export const MODI: readonly Scelta[] = [
  { id: 'doppio', nome: 'Doppio', simbolo: '✌️', cosaFa: 'succede due volte di fila' },
  { id: 'ritardato', nome: 'Ritardato', simbolo: '⏲️', cosaFa: 'scatta dopo due secondi e mezzo' },
  { id: 'rimbalza', nome: 'Rimbalza', simbolo: '🏀', cosaFa: 'rimbalza altre due volte più avanti' },
  { id: 'contagioso', nome: 'Contagioso', simbolo: '🦠', cosaFa: 'salta addosso alle creature lì attorno' },
  { id: 'creature', nome: 'Solo creature', simbolo: '🎯', cosaFa: 'colpisce le creature e lascia stare case e prato' },
];

/** Quanto feriscono le creature gli effetti che rompono, quando l'incantesimo è «solo creature». */
const DANNI: Readonly<Record<string, number>> = { scoppio: 30, risucchio: 14, solleva: 14, vortice: 16, brucia: 24, gela: 12, folgora: 36, peso: 26, trema: 14, cristalli: 20 };
/** Di che natura è la ferita di ogni effetto: le razze ne temono alcune e ne ignorano altre. */
const NATURA: Readonly<Record<string, Elemento>> = { brucia: 'fuoco', gela: 'gelo', peso: 'puro' };
/** Gli effetti che valgono solo su chi lancia. */
export const SU_DI_SE = new Set(['cura', 'scudo', 'svelto', 'balzo', 'ombra']);

/** Quello che un lancio si ricorda tra un colpo e l'altro: certe cose valgono una volta sola. */
interface Memoria {
  curato: boolean;
  unici: Set<string>;
}

/** Rimette in riga una ricetta arrivata da fuori (un codice incollato, la memoria del browser): solo valori che esistono. */
export function ripulisci(dato: unknown): Ricetta | null {
  if (typeof dato !== 'object' || dato === null) return null;
  const d = dato as Record<string, unknown>;
  const effetti = Array.isArray(d.effetti)
    ? [...new Set(d.effetti.filter((e): e is string => EFFETTI.some((x) => x.id === e)))].slice(0, MASSIMO_EFFETTI)
    : [];
  if (effetti.length === 0) return null;
  const intero = (v: unknown, min: number, max: number, base: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : base;
  const nome = typeof d.nome === 'string' ? d.nome.replace(/[<>&"']/g, '').trim().slice(0, 18) : '';
  const modi = Array.isArray(d.modi) ? [...new Set(d.modi.filter((m): m is string => MODI.some((x) => x.id === m)))] : [];
  return {
    ...(modi.length > 0 ? { modi } : {}),
    nome: nome || 'Senza nome',
    simbolo: typeof d.simbolo === 'string' && SIMBOLI.includes(d.simbolo) ? d.simbolo : SIMBOLI[0]!,
    colore: intero(d.colore, 0, 0xffffff, COLORI[0]!),
    forma: FORME.some((f) => f.id === d.forma) ? (d.forma as string) : 'tocco',
    effetti,
    potenza: intero(d.potenza, 1, 3, 2),
    ampiezza: intero(d.ampiezza, 1, 3, 2),
  };
}

const PREFISSO = 'RAD1.';

/** Il codice da passare a un amico: la ricetta scritta in poche lettere. */
export function codifica(r: Ricetta): string {
  const testo = JSON.stringify([r.nome, r.simbolo, r.colore, r.forma, r.effetti, r.potenza, r.ampiezza, ...(r.modi?.length ? [r.modi] : [])]);
  const bytes = new TextEncoder().encode(testo);
  let binario = '';
  for (const b of bytes) binario += String.fromCharCode(b);
  return PREFISSO + btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodifica(codice: string): Ricetta | null {
  try {
    const pulito = codice.trim();
    if (!pulito.startsWith(PREFISSO)) return null;
    const binario = atob(pulito.slice(PREFISSO.length).replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binario, (c) => c.charCodeAt(0));
    const a = JSON.parse(new TextDecoder().decode(bytes)) as unknown[];
    if (!Array.isArray(a)) return null;
    return ripulisci({ nome: a[0], simbolo: a[1], colore: a[2], forma: a[3], effetti: a[4], potenza: a[5], ampiezza: a[6], modi: a[7] });
  } catch {
    return null;
  }
}

const CHIAVE = 'radura-incantesimi';

export function leggiRicette(): Ricetta[] {
  try {
    const dati = JSON.parse(localStorage.getItem(CHIAVE) ?? '[]') as unknown[];
    return dati.map(ripulisci).filter((r): r is Ricetta => r !== null).slice(0, MASSIMO_RICETTE);
  } catch {
    return [];
  }
}

export function salvaRicette(ricette: readonly Ricetta[]): void {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(ricette));
  } catch {
    // Senza memoria del browser gli incantesimi valgono solo per questa partita.
  }
}

// ---------------------------------------------------------------------------------------------------------------

// Il quarto livello non si può scegliere nell'officina né arrivare da un codice: è solo degli incantesimi perduti.
const FORZE = [0, 0.7, 1.1, 1.6, 2.1];
const RAGGI = [0, 4.2, 7, 10.5, 13.5];

/**
 * Un colpo dell'incantesimo, con i suoi comportamenti: può scattare in ritardo, ripetersi, rimbalzare più avanti,
 * saltare addosso alle creature vicine. Le repliche sono più deboli e non si replicano a loro volta.
 */
function impatto(g: Gioco, r: Ricetta, p: THREE.Vector3, scala: number, m: Memoria): void {
  const modi = r.modi ?? [];
  if (modi.length === 0) return colpo(g, r, p, scala, m, false);
  const attesa = modi.includes('ritardato') ? 2.5 : 0;
  const dopo = (secondi: number, dove: THREE.Vector3, quanto: number, replica = true): void => g.aggiungi(new Dopo(attesa + secondi, (gg) => colpo(gg, r, dove, quanto, m, replica)));
  if (attesa > 0) dopo(0, p, scala, false);
  else colpo(g, r, p, scala, m, false);
  if (modi.includes('doppio')) dopo(0.6, p, scala * 0.8);
  if (modi.includes('rimbalza')) {
    const via = new THREE.Vector3(p.x - g.poteri.dove.x, 0, p.z - g.poteri.dove.z);
    if (via.lengthSq() < 0.01) via.set(0, 0, -1);
    via.normalize().multiplyScalar(RAGGI[r.ampiezza]! * 1.5);
    for (let i = 1; i <= 2; i++) {
      const x = p.x + via.x * i;
      const z = p.z + via.z * i;
      dopo(0.45 * i, new THREE.Vector3(x, altezza(x, z) + 0.3, z), scala * (0.85 - i * 0.15));
    }
  }
  if (modi.includes('contagioso')) {
    const raggio = RAGGI[r.ampiezza]!;
    g.poteri.bersagli(p, raggio * 3).filter((b) => b.distanceTo(p) > raggio * 0.7).slice(0, 3)
      .forEach((b, i) => dopo(0.35 + i * 0.2, new THREE.Vector3(b.x, b.y + 0.4, b.z), scala * 0.6));
  }
}

/** Quello che succede in un punto: i bagliori del colore scelto e, uno dopo l'altro, gli effetti della ricetta. */
function colpo(g: Gioco, r: Ricetta, p: THREE.Vector3, scala: number, m: Memoria, replica: boolean): void {
  const forza = FORZE[r.potenza]! * scala;
  const raggio = RAGGI[r.ampiezza]! * (0.6 + 0.4 * scala);
  const suolo = new THREE.Vector3(p.x, altezza(p.x, p.z), p.z);
  const c = new THREE.Color(r.colore);
  /** Vero se il colpo cade addosso (o quasi) a chi lancia: allora cura, scudo e simili fanno effetto. */
  const suMe = Math.hypot(p.x - g.poteri.dove.x, p.z - g.poteri.dove.z) < raggio + 1.5;
  bolla(g, p, r.colore, raggio * 0.55, 0.35, 0.7);
  anello(g, suolo, r.colore, raggio, 0.6, 1.1);
  for (let i = 0; i < 26 * scala + 10; i++) {
    const a = Math.random() * Math.PI * 2;
    const su = Math.random();
    const v = 3 + Math.random() * raggio * 1.4;
    g.scintille.emetti({
      x: p.x, y: p.y + 0.3, z: p.z, vx: Math.cos(a) * v * (1 - su * 0.5), vy: su * v, vz: Math.sin(a) * v * (1 - su * 0.5),
      vita: 0.5 + Math.random() * 0.7, dim: 0.5 + Math.random() * 0.6, dimFine: 0.05,
      r: c.r * 1.6 + 0.2, g: c.g * 1.6 + 0.2, b: c.b * 1.6 + 0.2, alfa: 0.8, gravita: 5, attrito: 1.2,
    });
  }
  g.lampi.lampo(new THREE.Vector3(p.x, p.y + 2, p.z), r.colore, 22 * forza, 0.6);
  let botto = 0;
  const soloCreature = r.modi?.includes('creature') ?? false;
  for (const effetto of r.effetti) {
    // Gli effetti che rompono feriscono anche le creature, ognuna secondo la sua razza. Con «solo creature» la
    // ferita è più forte, e case e prato restano intatti.
    if (DANNI[effetto] !== undefined) {
      const fatto = g.poteri.ferisci(suolo, raggio, DANNI[effetto]! * forza * (soloCreature ? 1.4 : 1), NATURA[effetto] ?? 'botto');
      if (effetto === 'gela' && fatto > 0) g.poteri.stato(suolo, raggio, 'lento', 6);
      if (soloCreature) continue;
    }
    if (COSTRUZIONI.has(effetto)) {
      // I pezzi piccoli si posano a ogni colpo (una pioggia di blocchi ne posa sei); un edificio, uno per lancio.
      const piccolo = effetto === 'blocco' || effetto === 'parete' || effetto === 'scala';
      if (!replica && (piccolo || !m.unici.has(effetto))) {
        m.unici.add(effetto);
        // Mirando sopra qualcosa (un altro blocco, un muro) il pezzo va lì sopra, non a terra.
        g.poteri.costruisci(effetto, new THREE.Vector3(p.x, p.y - suolo.y > 0.7 ? p.y : suolo.y, p.z));
      }
      continue;
    }
    if (effetto === 'smonta') {
      g.poteri.smonta(suolo, raggio);
      continue;
    }
    switch (effetto) {
      case 'scoppio':
        g.pezzi.spinta(p.x, p.y - 0.5, p.z, raggio, 11 * forza, 0.45);
        botto = Math.max(botto, 0.35 * forza);
        break;
      case 'risucchio':
        g.pezzi.spinta(p.x, p.y + 3, p.z, raggio * 1.4, -9 * forza, -0.6);
        break;
      case 'solleva':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio, 500)) g.pezzi.accelera(i, 0, 10 * forza + Math.random() * 3, 0, 1);
        // Anche le creature volano in su (e ricadendo si fanno male).
        g.poteri.spingi(new THREE.Vector3(p.x, suolo.y - 2, p.z), raggio + 2, 14 * forza, 1.2);
        break;
      case 'vortice':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio, 500)) {
          const dx = g.pezzi.pos[i * 3]! - p.x;
          const dz = g.pezzi.pos[i * 3 + 2]! - p.z;
          const d = Math.hypot(dx, dz) + 0.1;
          g.pezzi.accelera(i, (-dz / d) * 12 * forza, 3.5 * forza, (dx / d) * 12 * forza, 1);
        }
        g.poteri.spingi(new THREE.Vector3(p.x, suolo.y - 1, p.z), raggio, 10 * forza, 0.8);
        break;
      case 'brucia':
        g.campo.accendi(p.x, p.z, raggio * 0.6, 7 + r.potenza * 3);
        g.pezzi.accendiVicini(p.x, p.y, p.z, raggio * 0.6);
        break;
      case 'gela':
        g.campo.gela(p.x, p.z, raggio);
        g.pezzi.gela(p.x, p.y, p.z, raggio);
        g.suoni.gelo();
        break;
      case 'folgora':
        g.aggiungi(new Saetta(g, new THREE.Vector3(p.x + (Math.random() - 0.5) * 12, p.y + 70, p.z + (Math.random() - 0.5) * 12), p.clone(), 0xdfe8ff));
        g.pezzi.spinta(p.x, p.y + 0.5, p.z, Math.min(raggio, 6), 13 * forza, 0.25);
        g.suoni.saetta();
        break;
      case 'fiorisce':
        g.campo.fiorisci(p.x, p.z, raggio, 1);
        break;
      case 'cristalli': {
        const quanti = 3 + r.ampiezza * 2;
        const punti = Array.from({ length: quanti }, (_, k) => {
          const a = (k / quanti) * Math.PI * 2;
          return { x: p.x + Math.cos(a) * raggio * 0.45, z: p.z + Math.sin(a) * raggio * 0.45 };
        });
        g.aggiungi(new Cristalli(g, punti));
        break;
      }
      case 'bolla':
        g.aggiungi(new Levitazione(g, p, 2.5 + r.potenza * 1.5, raggio));
        break;
      // --- su chi lancia: valgono se il colpo cade vicino al mago (la forma «su di me» lo fa cadere ai suoi piedi) ---
      case 'cura':
        // Una volta sola per lancio: un cerchio o una pioggia di cure non curano otto volte.
        if (suMe && !m.curato) {
          m.curato = true;
          g.poteri.cura(18 * FORZE[r.potenza]! + 8);
        }
        break;
      case 'scudo':
        if (suMe) g.poteri.scudo(6 + 5 * forza);
        break;
      case 'svelto':
        if (suMe) g.poteri.svelto(8 + 6 * forza);
        break;
      case 'balzo':
        if (suMe) g.poteri.balzo(8 + 6 * forza);
        break;
      case 'ombra':
        if (suMe) g.poteri.invisibile(5 + 4 * forza);
        break;
      case 'varco':
        if (!suMe && !replica && !m.unici.has('varco')) {
          m.unici.add('varco');
          g.poteri.teletrasporta(suolo);
        }
        break;
      case 'luce':
        g.poteri.luce(new THREE.Vector3(p.x, suolo.y + 2.4, p.z), 40 + 30 * forza, r.colore);
        break;
      // --- sul mondo ---
      case 'acqua':
        g.campo.spegni(p.x, p.z, raggio * 1.5);
        g.campo.fiorisci(p.x, p.z, raggio, 0.25);
        g.pezzi.gela(p.x, p.y, p.z, raggio * 0.5);
        for (let i = 0; i < 30; i++) {
          g.scintille.emetti({
            x: p.x + (Math.random() - 0.5) * raggio * 2, y: suolo.y + 6 + Math.random() * 6, z: p.z + (Math.random() - 0.5) * raggio * 2, vx: 0, vy: -14, vz: 0,
            vita: 0.7, dim: 0.35, dimFine: 0.1, r: 0.5, g: 0.75, b: 1.4, alfa: 0.8,
          });
        }
        break;
      case 'albero':
        if (!g.alberi.vicino(p.x, p.z, 5)) g.alberi.pianta(p.x, p.z);
        break;
      case 'muro': {
        // Di traverso rispetto a chi lancia, così sbarra la strada tra lui e ciò che arriva.
        const dx = p.x - g.poteri.dove.x;
        const dz = p.z - g.poteri.dove.z;
        const d = Math.hypot(dx, dz) || 1;
        const quanti = 3 + r.ampiezza * 2;
        const punti = Array.from({ length: quanti }, (_, k) => {
          const t = (k - (quanti - 1) / 2) * 1.6;
          return { x: p.x + (-dz / d) * t, z: p.z + (dx / d) * t };
        });
        g.aggiungi(new Cristalli(g, punti));
        break;
      }
      case 'peso':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio, 500)) g.pezzi.accelera(i, 0, -16 * forza, 0, 1);
        botto = Math.max(botto, 0.2 * forza);
        break;
      case 'trema':
        for (const i of g.pezzi.vicini(p.x, p.y, p.z, raggio * 1.3, 700)) {
          g.pezzi.accelera(i, (Math.random() - 0.5) * 9 * forza, 2 + Math.random() * 3 * forza, (Math.random() - 0.5) * 9 * forza, 1);
        }
        botto = Math.max(botto, 0.3 * forza);
        break;
      // --- sulle creature ---
      case 'sonno':
        g.poteri.stato(suolo, raggio, 'sonno', 8 + 6 * forza);
        break;
      case 'pecora':
        g.poteri.stato(suolo, raggio, 'pecora', 7 + 5 * forza);
        break;
      case 'paura':
        g.poteri.stato(suolo, raggio, 'paura', 6 + 4 * forza);
        break;
      case 'lento':
        g.poteri.stato(suolo, raggio, 'lento', 8 + 5 * forza);
        break;
      case 'veleno':
        g.poteri.stato(suolo, raggio, 'veleno', 5 + 3 * forza);
        break;
      case 'mignon':
        g.poteri.stato(suolo, raggio, 'piccolo', 12 + 6 * forza);
        break;
      case 'linfa':
        g.poteri.cura(g.poteri.ferisci(suolo, raggio, 16 * forza) * 0.5);
        break;
      case 'evoca':
        if (!replica && !m.unici.has('evoca')) {
          m.unici.add('evoca');
          g.poteri.evoca(suolo, 20 + 10 * FORZE[r.potenza]!);
        }
        break;
      case 'rammenda':
        g.pezzi.rammenda(p.x, p.z, raggio);
        g.campo.risana(p.x, p.z, raggio);
        g.suoni.ricostruzione();
        break;
    }
  }
  if (botto > 0) {
    g.suoni.botto(botto);
    g.scossa(botto * 1.6, p, false);
  } else {
    g.suoni.soffio();
  }
}

/** Qualcosa che succede dopo un'attesa. */
class Dopo implements Effetto {
  constructor(private attesa: number, private readonly fai: (g: Gioco) => void) {}
  aggiorna(dt: number, g: Gioco): boolean {
    this.attesa -= dt;
    if (this.attesa > 0) return true;
    this.fai(g);
    return false;
  }
}

const SFERA = new THREE.IcosahedronGeometry(0.24, 1);

class Palla implements Effetto {
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly vel: THREE.Vector3;
  private eta = 0;
  private readonly c: THREE.Color;

  constructor(g: Gioco, private readonly r: Ricetta, l: Lancio, private readonly m: Memoria) {
    this.c = new THREE.Color(r.colore);
    this.mesh = new THREE.Mesh(SFERA, new THREE.MeshBasicMaterial({ color: this.c.clone().multiplyScalar(1.8), fog: false }));
    this.mesh.position.copy(l.origine);
    const dir = l.bersaglio.clone().sub(l.origine);
    const distanza = dir.length();
    dir.normalize();
    dir.y += distanza * 0.0013;
    this.vel = dir.normalize().multiplyScalar(50);
    g.scena.add(this.mesh);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    this.vel.y -= 7 * dt;
    const p = this.mesh.position;
    const passo = this.vel.length() * dt;
    const dir = this.vel.clone().normalize();
    const colpo = g.fisica.castRay(new g.R.Ray(p, dir), passo, true, undefined, undefined, undefined, g.corpoGiocatore);
    // Il corpo di una creatura ferma la palla come un muro.
    const corpo = g.poteri.sulRaggio(p, dir, colpo ? colpo.timeOfImpact : passo);
    p.addScaledVector(dir, corpo >= 0 ? corpo : colpo ? colpo.timeOfImpact : passo);
    for (let i = 0; i < 2; i++) {
      g.scintille.emetti({
        x: p.x, y: p.y, z: p.z, vx: (Math.random() - 0.5) * 1.5, vy: Math.random() * 1.5, vz: (Math.random() - 0.5) * 1.5,
        vita: 0.35, dim: 0.7, dimFine: 0.08, r: this.c.r * 1.6, g: this.c.g * 1.6, b: this.c.b * 1.6, alfa: 0.7,
      });
    }
    if (!colpo && corpo < 0 && p.y > altezza(p.x, p.z) && this.eta < 5) return true;
    this.mesh.removeFromParent();
    this.mesh.material.dispose();
    impatto(g, this.r, p.clone(), 1, this.m);
    return false;
  }
}

/** Una runa a terra: aspetta che passi una creatura (o che scada il tempo) e poi scatta. */
class Trappola implements Effetto {
  private readonly segno: ReturnType<typeof creaCerchioMagico>;
  private eta = 0;

  constructor(g: Gioco, private readonly r: Ricetta, private readonly p: THREE.Vector3, private readonly m: Memoria) {
    this.segno = creaCerchioMagico(r.colore, 1.2);
    this.segno.position.copy(p);
    this.segno.scale.setScalar(1.6);
    g.scena.add(this.segno);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    this.segno.rotation.y += dt * 1.5;
    const scatta = this.eta > 0.8 && g.poteri.bersagli(this.p, 3.5).length > 0;
    if (!scatta && this.eta < 30) return true;
    this.segno.removeFromParent();
    rendi(this.segno.material);
    if (scatta) impatto(g, this.r, this.p.clone().setY(this.p.y + 0.3), 1.2, this.m);
    return false;
  }
}

/** Un globo che cerca da solo la creatura più vicina e le scoppia addosso. */
class Globo implements Effetto {
  private readonly mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  private readonly vel: THREE.Vector3;
  private eta = 0;
  private readonly c: THREE.Color;

  constructor(g: Gioco, private readonly r: Ricetta, l: Lancio, quale: number, private readonly m: Memoria) {
    this.c = new THREE.Color(r.colore);
    this.mesh = new THREE.Mesh(SFERA, new THREE.MeshBasicMaterial({ color: this.c.clone().multiplyScalar(1.8), fog: false }));
    this.mesh.scale.setScalar(0.7);
    this.mesh.position.copy(l.origine);
    // Partono a ventaglio, poi piegano verso la preda.
    const lato = new THREE.Vector3(-l.direzione.z, 0, l.direzione.x).multiplyScalar((quale - 1) * 9);
    this.vel = l.direzione.clone().multiplyScalar(18).add(lato).setY(l.direzione.y * 18 + 5);
    g.scena.add(this.mesh);
  }

  aggiorna(dt: number, g: Gioco): boolean {
    this.eta += dt;
    const p = this.mesh.position;
    let preda: THREE.Vector3 | null = null;
    for (const b of g.poteri.bersagli(p, 45)) if (!preda || b.distanceToSquared(p) < preda.distanceToSquared(p)) preda = b;
    if (preda) {
      const verso = new THREE.Vector3(preda.x - p.x, preda.y + 1 - p.y, preda.z - p.z).normalize().multiplyScalar(26);
      this.vel.lerp(verso, Math.min(1, dt * 4));
    } else this.vel.y -= 6 * dt;
    p.addScaledVector(this.vel, dt);
    g.scintille.emetti({ x: p.x, y: p.y, z: p.z, vx: 0, vy: 0.5, vz: 0, vita: 0.3, dim: 0.5, dimFine: 0.05, r: this.c.r * 1.6, g: this.c.g * 1.6, b: this.c.b * 1.6, alfa: 0.7 });
    const arrivato = preda !== null && preda.distanceTo(p) < 1.8;
    if (!arrivato && p.y > altezza(p.x, p.z) + 0.2 && this.eta < 4) return true;
    this.mesh.removeFromParent();
    this.mesh.material.dispose();
    impatto(g, this.r, p.clone(), 0.6, this.m);
    return false;
  }
}

/** Trasforma una ricetta in un incantesimo vero, da mettere nella barra. */
export function creaDaRicetta(r: Ricetta): Incantesimo {
  const forma = FORME.find((f) => f.id === r.forma)!;
  const nomi = r.effetti.map((e) => EFFETTI.find((x) => x.id === e)!.nome.toLowerCase());
  return {
    nome: r.nome,
    firma: [r.forma, [...r.effetti].sort().join('+'), r.potenza, r.ampiezza, [...(r.modi ?? [])].sort().join('+')].join('|'),
    cosaFa: `${forma.nome}: ${[...nomi, ...(r.modi ?? [])].join(', ')}`,
    simbolo: r.simbolo,
    colore: r.colore,
    ricarica: 0.4 + 0.35 * r.effetti.length + 0.4 * (r.potenza - 1) + 0.3 * (r.ampiezza - 1) + (r.forma === 'pioggia' ? 1 : 0) + 0.5 * (r.modi?.length ?? 0),
    lancia(g, l) {
      const p = l.bersaglio.clone();
      const c = new THREE.Color(r.colore);
      const raggio = RAGGI[r.ampiezza]!;
      const m: Memoria = { curato: false, unici: new Set() };
      if (r.forma === 'me') {
        const io = g.poteri.dove;
        impatto(g, r, new THREE.Vector3(io.x, altezza(io.x, io.z) + 0.3, io.z), 1, m);
      } else if (r.forma === 'cerchio') {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          const x = p.x + Math.cos(a) * raggio;
          const z = p.z + Math.sin(a) * raggio;
          const q = new THREE.Vector3(x, altezza(x, z) + 0.3, z);
          g.aggiungi(new Dopo(0.08 * i, (gg) => impatto(gg, r, q, 0.55, m)));
        }
      } else if (r.forma === 'mina') {
        g.aggiungi(new Trappola(g, r, new THREE.Vector3(p.x, altezza(p.x, p.z) + 0.15, p.z), m));
        g.suoni.carica(0.4);
      } else if (r.forma === 'sciame') {
        for (let i = 0; i < 3; i++) g.aggiungi(new Globo(g, r, l, i, m));
        g.suoni.soffio();
      } else if (r.forma === 'palla') {
        g.aggiungi(new Palla(g, r, l, m));
        g.suoni.soffio();
      } else if (r.forma === 'tocco') {
        scia(g, l.origine, p, c.r * 1.6, c.g * 1.6, c.b * 1.6);
        impatto(g, r, p, 1, m);
      } else if (r.forma === 'cielo') {
        const cerchio = creaCerchioMagico(r.colore, 1.6);
        cerchio.position.set(p.x, altezza(p.x, p.z) + 14, p.z);
        cerchio.scale.setScalar(raggio * 0.7);
        g.scena.add(cerchio);
        g.suoni.carica(0.7);
        let eta = 0;
        g.aggiungi({
          aggiorna(dt) {
            eta += dt;
            cerchio.rotation.y += dt * 4;
            cerchio.position.y -= dt * 14;
            cerchio.scale.setScalar(Math.max(0.1, raggio * 0.7 * (1 - eta / 0.9)));
            if (eta < 0.75) return true;
            cerchio.removeFromParent();
            rendi(cerchio.material);
            impatto(g, r, p, 1.15, m);
            return false;
          },
        });
      } else if (r.forma === 'pioggia') {
        for (let i = 0; i < 6; i++) {
          const a = Math.random() * Math.PI * 2;
          const d = i === 0 ? 0 : (0.4 + Math.random() * 0.8) * raggio * 1.3;
          const x = p.x + Math.cos(a) * d;
          const z = p.z + Math.sin(a) * d;
          const q = new THREE.Vector3(x, i === 0 ? p.y : altezza(x, z), z);
          g.aggiungi(new Dopo(0.15 + i * 0.3, (gg) => {
            scia(gg, new THREE.Vector3(q.x - 4, q.y + 30, q.z + 2), q, c.r * 1.6, c.g * 1.6, c.b * 1.6, 18);
            impatto(gg, r, q, 0.6, m);
          }));
        }
      } else {
        // Onda: una fila di colpi che corre da chi lancia al bersaglio.
        const da = g.camera.position;
        const dir = new THREE.Vector3(p.x - da.x, 0, p.z - da.z);
        const distanza = dir.length();
        dir.normalize();
        const colpi = Math.min(7, Math.max(3, Math.round(distanza / 4)));
        for (let i = 0; i < colpi; i++) {
          const x = da.x + dir.x * (5 + i * 4);
          const z = da.z + dir.z * (5 + i * 4);
          const q = new THREE.Vector3(x, altezza(x, z) + 0.3, z);
          g.aggiungi(new Dopo(i * 0.11, (gg) => impatto(gg, r, q, 0.55, m)));
        }
      }
    },
  };
}
