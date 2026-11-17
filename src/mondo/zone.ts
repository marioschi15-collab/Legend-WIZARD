import { gradino, mescola, rumore, rumoreStrati } from '../base/matematica.js';
import { FATTE, pesoFatta, type TerraFatta } from './fatte/suoli.js';

/** Le prime cinque terre, per nome. L'ordine dell'elenco ZONE è lo stesso dei "pesi" restituiti da pesiZone. */
export const PRATO = 0;
export const DESERTO = 1;
export const GHIACCIO = 2;
export const PALUDE = 3;
export const VULCANO = 4;

/** Che cosa cresce (o affiora) in una terra: un tipo di pianta, quanto è frequente e come appare. */
export interface Semina {
  readonly tipo: string;
  /** Quante, su cento punti provati, diventano questa pianta. */
  readonly parte: number;
  readonly scala: readonly [number, number];
  /** Colore con cui si tinge (esadecimale); assente = colore naturale. */
  readonly tinta?: number;
  /** Quanto è forte la tinta (1 = normale): le foglie sono verdi, e per farle arancioni serve una tinta carica. */
  readonly carica?: number;
  /** Se c'è, la pianta cresce solo «a macchie»: più è alto, più le macchie sono rade (da 0 a 1). */
  readonly bosco?: number;
  /** Vero se può stare anche con i piedi nell'acqua. */
  readonly acqua?: boolean;
}

export interface Zona {
  readonly nome: string;
  /** Dove sta nella "carta del clima": quanto è calda (da -1 a 1) e quanto è umida (da -1 a 1). */
  readonly caldo: number;
  readonly umido: number;
  /** Colore del terreno, della nebbia e dell'alto del cielo (esadecimali). */
  readonly terra: number;
  readonly nebbia: number;
  readonly cielo: number;
  readonly densitaNebbia: number;
  /** Quanta luce c'è (1 = pieno giorno). */
  readonly luce: number;
  /** I colori della luce: quella che scende dal cielo, quella che rimbalza dal suolo, e il sole. */
  readonly luceAlta: number;
  readonly luceBassa: number;
  readonly sole: number;
  /** Per l'erba: quanta ce n'è, quanto è secca, innevata, scura (da 0 a 1). */
  readonly erba: readonly [number, number, number, number];
  /** Che cosa ci si può trovare costruito. */
  readonly luoghi: readonly string[];
  /** La forma del suolo: l'altezza naturale in un punto. */
  readonly suolo: (x: number, z: number) => number;
  /** Che cosa vola nell'aria. */
  readonly aria?: 'neve' | 'faville' | 'lucciole' | 'sabbia' | 'foglie' | 'spore';
  /** Vero se la riva è fango o cenere invece che sabbia chiara. */
  readonly rivaScura?: boolean;
  readonly piante: readonly Semina[];
  /** Se c'è, la terra è fatta a mano: esiste solo attorno a un punto preciso, e lì vince su tutte (vedi `pesiZone`). */
  readonly fatta?: TerraFatta;
  /** Le terre incantate (stile disegnato) hanno qui il colore del velo che stendono sul cielo: lì è sempre
   * crepuscolo, la luce è tutta quella della terra (non si stempera nell'ora dorata delle altre), di notte fa meno
   * buio, l'acqua è turchese e ciò che brilla brilla di più. */
  readonly incanto?: number;
}

/** Colline: `alte` metri di dislivello, larghe più o meno 1/`fitte` metri, spostate di `base`. */
const colline = (alte: number, fitte: number, base: number, seme: number) => (x: number, z: number): number =>
  (rumoreStrati(x * fitte + seme, z * fitte + seme * 0.37) - 0.4) * alte + base;

/** Altipiani a gradoni con pareti ripide: il paesaggio dei canyon. */
const gradoni = (x: number, z: number): number => {
  const h = rumoreStrati(x * 0.0065 + 13, z * 0.0065 + 77, 3) * 46 - 8;
  const piano = Math.floor(h / 9);
  const dentro = h / 9 - piano;
  return (piano + gradino(0.72, 0.95, dentro)) * 9 + rumore(x * 0.05, z * 0.05) * 0.8 + 2;
};

export const ZONE: readonly Zona[] = [
  {
    nome: 'La Radura', caldo: 0, umido: 0, terra: 0x35702f, nebbia: 0xbcd7ea, cielo: 0x2a6bdb, densitaNebbia: 0.002, luce: 1,
    luceAlta: 0xd6e8ff, luceBassa: 0x70804e, sole: 0xfff1dc, erba: [1, 0, 0, 0], luoghi: ['borgo', 'fattoria', 'vedetta', 'borgo'], aria: 'lucciole',
    suolo: (x, z) => (rumoreStrati(x * 0.013 + 10, z * 0.013 + 7) - 0.36) * 15,
    piante: [
      { tipo: 'quercia', parte: 16, scala: [0.8, 1.6], bosco: 0.44 }, { tipo: 'quercia', parte: 16, scala: [0.9, 1.8], bosco: 0.44, tinta: 0xe0a060, carica: 1.5 },
      { tipo: 'pino', parte: 24, scala: [0.9, 2.1], bosco: 0.5, tinta: 0x8fb4c4, carica: 1.3 },
      { tipo: 'cespuglio', parte: 8, scala: [0.6, 1.3] }, { tipo: 'cespuglio', parte: 9, scala: [0.3, 0.7], tinta: 0xb0a8ff, carica: 1.25 },
      { tipo: 'cespuglio', parte: 4, scala: [0.3, 0.6], tinta: 0xffb0d0, carica: 1.25 }, { tipo: 'roccia', parte: 3, scala: [0.4, 1.1] },
    ],
  },
  {
    nome: 'Dune d’Ambra', caldo: 0.85, umido: -0.6, terra: 0xd7b56d, nebbia: 0xecd9b0, cielo: 0x3a86e0, densitaNebbia: 0.0017, luce: 1.05,
    luceAlta: 0xfff0d2, luceBassa: 0xd0a868, sole: 0xffe9c0, erba: [0.1, 1, 0, 0], luoghi: ['piramide', 'tempio', 'casbah'], aria: 'sabbia',
    suolo: (x, z) => {
      const duna = Math.abs(Math.sin((x * 0.6 + z * 0.8) * 0.036 + rumore(x * 0.012, z * 0.012) * 5));
      return 1.2 + duna * 6.5 + rumoreStrati(x * 0.01 + 70, z * 0.01, 3) * 6;
    },
    piante: [{ tipo: 'cactus', parte: 10, scala: [0.7, 1.4] }, { tipo: 'roccia', parte: 6, scala: [0.6, 2.2], tinta: 0xd9b98a }],
  },
  {
    nome: 'Terre Gelate', caldo: -0.95, umido: -0.1, terra: 0xe6eef5, nebbia: 0xdde8f2, cielo: 0x7a9fd8, densitaNebbia: 0.003, luce: 0.95,
    luceAlta: 0xdcebff, luceBassa: 0xc8d8ea, sole: 0xf4f8ff, erba: [0.28, 0, 1, 0], luoghi: ['castello', 'igloo', 'guglia'], aria: 'neve',
    suolo: (x, z) => rumoreStrati(x * 0.009 + 21, z * 0.009 + 40) * 34 - 9,
    piante: [{ tipo: 'pinoInnevato', parte: 55, scala: [0.7, 1.6], bosco: 0.42 }, { tipo: 'roccia', parte: 6, scala: [0.8, 2.8], tinta: 0xc4e2f4 }],
  },
  {
    nome: 'Palude dei Lumi', caldo: -0.1, umido: 0.95, terra: 0x34482b, nebbia: 0x5e7669, cielo: 0x3a5257, densitaNebbia: 0.006, luce: 0.75,
    luceAlta: 0x9fc0ae, luceBassa: 0x3c5038, sole: 0xe2ecc8, erba: [1, 0, 0, 1], luoghi: ['palafitte', 'strega'], aria: 'lucciole', rivaScura: true,
    suolo: (x, z) => rumoreStrati(x * 0.024 + 5, z * 0.024 + 60, 3) * 3.4 - 1.9,
    piante: [
      { tipo: 'alberoMorto', parte: 24, scala: [0.8, 1.7], acqua: true }, { tipo: 'fungo', parte: 10, scala: [0.5, 1.6], tinta: 0xc487ff, bosco: 0.5 },
      { tipo: 'quercia', parte: 16, scala: [0.8, 1.5], tinta: 0x6f8f78, bosco: 0.4 }, { tipo: 'cespuglio', parte: 10, scala: [0.7, 1.4], tinta: 0x7a9a70 },
    ],
  },
  {
    nome: 'Monte Brace', caldo: 0.95, umido: 0.6, terra: 0x2b2523, nebbia: 0x80564a, cielo: 0x55281f, densitaNebbia: 0.0035, luce: 0.9,
    luceAlta: 0xd29a84, luceBassa: 0x7a2c14, sole: 0xffb890, erba: [0.03, 0.5, 0, 0.9], luoghi: ['fortezza', 'altare'], aria: 'faville', rivaScura: true,
    suolo: (x, z) => 1.5 + rumoreStrati(x * 0.017 + 33, z * 0.017 + 12) * 9,
    piante: [
      { tipo: 'guglia', parte: 11, scala: [0.6, 1.9] }, { tipo: 'alberoMorto', parte: 8, scala: [0.7, 1.3], tinta: 0x3a3230 },
      { tipo: 'roccia', parte: 8, scala: [0.7, 2.5], tinta: 0x4a3f3d },
    ],
  },
  {
    nome: 'Selva Fitta', caldo: -0.2, umido: 0.45, terra: 0x2f6a26, nebbia: 0x9fc4b6, cielo: 0x2a62c4, densitaNebbia: 0.0034, luce: 0.88,
    luceAlta: 0xbfe0d0, luceBassa: 0x3f6a3a, sole: 0xf2f0cf, erba: [1, 0, 0, 0.35], luoghi: ['vedetta', 'borgo'],
    suolo: colline(16, 0.011, 3.5, 140),
    piante: [
      { tipo: 'pino', parte: 34, scala: [0.9, 2.1] }, { tipo: 'quercia', parte: 28, scala: [0.9, 1.9] },
      { tipo: 'cespuglio', parte: 16, scala: [0.7, 1.6], tinta: 0xb9d9b0 }, { tipo: 'fungo', parte: 2, scala: [0.3, 0.6], tinta: 0xff9a7a },
    ],
  },
  {
    nome: 'Bosco d’Autunno', caldo: -0.5, umido: 0.2, terra: 0x8a7a36, nebbia: 0xe2cfae, cielo: 0x4a7fc8, densitaNebbia: 0.0026, luce: 0.98,
    luceAlta: 0xffe8c8, luceBassa: 0x8a6a3a, sole: 0xffdca8, erba: [0.9, 0.55, 0, 0], luoghi: ['borgo', 'fattoria'], aria: 'foglie',
    suolo: colline(11, 0.012, 2.5, 220),
    piante: [
      { tipo: 'quercia', parte: 18, scala: [0.8, 1.7], tinta: 0xff4d2a, carica: 3 }, { tipo: 'quercia', parte: 14, scala: [0.8, 1.6], tinta: 0xff2a20, carica: 3 },
      { tipo: 'quercia', parte: 12, scala: [0.8, 1.6], tinta: 0xff7a30, carica: 3 }, { tipo: 'cespuglio', parte: 10, scala: [0.6, 1.3], tinta: 0xff5a2a, carica: 2.5 },
      { tipo: 'roccia', parte: 3, scala: [0.4, 1.2] },
    ],
  },
  {
    nome: 'Giungla Smeraldo', caldo: 0.5, umido: 0.95, terra: 0x2a7a2e, nebbia: 0xa6d6b6, cielo: 0x2f7fd2, densitaNebbia: 0.004, luce: 0.92,
    luceAlta: 0xc8f0d8, luceBassa: 0x2f7a3a, sole: 0xfff2c0, erba: [1, 0, 0, 0.15], luoghi: ['tempio', 'piramide'], aria: 'lucciole',
    suolo: colline(15, 0.014, 0.6, 310),
    piante: [
      { tipo: 'palma', parte: 34, scala: [0.9, 2.2] }, { tipo: 'quercia', parte: 18, scala: [1.1, 2.2], tinta: 0x9aff8a },
      { tipo: 'cespuglio', parte: 22, scala: [0.9, 2.2], tinta: 0xa8ff9a }, { tipo: 'fungo', parte: 2, scala: [0.4, 0.9], tinta: 0xffe36a },
    ],
  },
  {
    nome: 'Savana d’Oro', caldo: 0.5, umido: -0.15, terra: 0xb09a3e, nebbia: 0xeedfb4, cielo: 0x3f88dc, densitaNebbia: 0.0018, luce: 1.05,
    luceAlta: 0xfff2cc, luceBassa: 0xb89a4a, sole: 0xffe6b0, erba: [1, 0.85, 0, 0], luoghi: ['casbah', 'vedetta'],
    suolo: colline(4.5, 0.008, 2.4, 400),
    piante: [
      { tipo: 'acacia', parte: 9, scala: [0.8, 1.7] }, { tipo: 'cespuglio', parte: 7, scala: [0.6, 1.2], tinta: 0xd8c070 },
      { tipo: 'roccia', parte: 4, scala: [0.5, 1.8], tinta: 0xc9a878 },
    ],
  },
  {
    nome: 'Steppa del Vento', caldo: 0.15, umido: -0.5, terra: 0x8f9a55, nebbia: 0xd4dcc0, cielo: 0x4a86d6, densitaNebbia: 0.0019, luce: 1,
    luceAlta: 0xe8f0dc, luceBassa: 0x8a9058, sole: 0xfff0d0, erba: [0.8, 0.45, 0, 0], luoghi: ['vedetta', 'fattoria'],
    suolo: colline(8, 0.007, 3, 480),
    piante: [{ tipo: 'roccia', parte: 8, scala: [0.5, 2.4] }, { tipo: 'cespuglio', parte: 6, scala: [0.5, 1], tinta: 0xc0c890 }, { tipo: 'pino', parte: 2, scala: [0.6, 1] }],
  },
  {
    nome: 'Tundra Grigia', caldo: -0.6, umido: -0.55, terra: 0x7f8a72, nebbia: 0xcdd6da, cielo: 0x6a90c8, densitaNebbia: 0.0026, luce: 0.92,
    luceAlta: 0xdce6ee, luceBassa: 0x8a927e, sole: 0xeef2f6, erba: [0.4, 0.35, 0.3, 0], luoghi: ['igloo', 'guglia'], aria: 'neve',
    suolo: colline(7, 0.009, 2.2, 560),
    piante: [
      { tipo: 'roccia', parte: 10, scala: [0.5, 2.6], tinta: 0xb8c0c4 }, { tipo: 'pinoInnevato', parte: 6, scala: [0.5, 1], bosco: 0.5 },
      { tipo: 'cespuglio', parte: 5, scala: [0.4, 0.9], tinta: 0x9aa890 },
    ],
  },
  {
    nome: 'Gole Rosse', caldo: 0.6, umido: -0.98, terra: 0xb5562f, nebbia: 0xeec8a6, cielo: 0x3a84dc, densitaNebbia: 0.0016, luce: 1.05,
    luceAlta: 0xffe6cc, luceBassa: 0xc0683a, sole: 0xffe0b8, erba: [0, 1, 0, 0], luoghi: ['tempio', 'casbah'], aria: 'sabbia',
    suolo: gradoni,
    piante: [{ tipo: 'roccia', parte: 9, scala: [0.6, 3], tinta: 0xc8704a }, { tipo: 'cactus', parte: 4, scala: [0.6, 1.2] }, { tipo: 'alberoMorto', parte: 2, scala: [0.5, 0.9] }],
  },
  {
    nome: 'Saline Bianche', caldo: 0.2, umido: -0.98, terra: 0xe9e4dc, nebbia: 0xeef0f2, cielo: 0x5a96e0, densitaNebbia: 0.0015, luce: 1.1,
    luceAlta: 0xffffff, luceBassa: 0xe0dcd4, sole: 0xfff8ee, erba: [0, 0, 0, 0], luoghi: ['guglia', 'casbah'],
    suolo: (x, z) => 0.9 + rumore(x * 0.03, z * 0.03) * 0.35,
    piante: [{ tipo: 'cristallo', parte: 3, scala: [0.4, 1.1], tinta: 0xffffff }, { tipo: 'roccia', parte: 2, scala: [0.4, 1.4], tinta: 0xf0ece6 }],
  },
  {
    nome: 'Bosco dei Funghi', caldo: -0.55, umido: 0.85, terra: 0x4a3a5e, nebbia: 0x8a78b0, cielo: 0x3a2f6a, densitaNebbia: 0.0048, luce: 0.78,
    luceAlta: 0xc8b0f0, luceBassa: 0x4a3a6a, sole: 0xe6d0ff, erba: [0.7, 0, 0, 1], luoghi: ['strega', 'palafitte'], aria: 'spore', rivaScura: true,
    suolo: colline(9, 0.016, 1.2, 640),
    piante: [
      { tipo: 'fungo', parte: 22, scala: [1.2, 3.6], tinta: 0xc487ff }, { tipo: 'fungo', parte: 16, scala: [0.8, 2.4], tinta: 0x5ff0d8 },
      { tipo: 'fungo', parte: 12, scala: [0.3, 0.9], tinta: 0xff8ad0 }, { tipo: 'cespuglio', parte: 8, scala: [0.6, 1.2], tinta: 0xb090e0 },
    ],
  },
  {
    nome: 'Campi di Cristallo', caldo: -0.98, umido: 0.6, terra: 0x2a4a55, nebbia: 0x8ad0d8, cielo: 0x1f4a7a, densitaNebbia: 0.0036, luce: 0.85,
    luceAlta: 0xa8f0ff, luceBassa: 0x2a5a66, sole: 0xd8f8ff, erba: [0.12, 0, 0.4, 0.8], luoghi: ['guglia', 'altare'], aria: 'spore',
    suolo: (x, z) => colline(10, 0.013, 2, 720)(x, z) + Math.abs(rumore(x * 0.06, z * 0.06) - 0.5) * 5,
    piante: [
      { tipo: 'cristallo', parte: 16, scala: [0.8, 3.4], tinta: 0x7ff4ff }, { tipo: 'cristallo', parte: 10, scala: [0.6, 2.4], tinta: 0xd08aff },
      { tipo: 'roccia', parte: 6, scala: [0.6, 2], tinta: 0x4a7a88 },
    ],
  },
  {
    // Una terra fatta a mano, in un punto preciso: nebbia fitta, alberi spogli, la casa della strega in fondo a un
    // sentiero di pietra. Non nasce dal clima come le altre (caldo e umido sono fuori scala): vedi `pesiZone`.
    nome: 'Bosco della Strega', caldo: 9, umido: 9, terra: 0x4a3c2a, nebbia: 0x76858a, cielo: 0x55666c, densitaNebbia: 0.02, luce: 0.52,
    luceAlta: 0x9fb0b8, luceBassa: 0x34342c, sole: 0xb8c4cc, erba: [0.35, 0.2, 0, 1], luoghi: [], aria: 'foglie', rivaScura: true,
    suolo: FATTE.strega.suolo, fatta: FATTE.strega,
    piante: [
      { tipo: 'alberoMorto', parte: 18, scala: [1.0, 1.9] }, { tipo: 'alberoMorto2', parte: 17, scala: [1.0, 2.1] }, { tipo: 'alberoMorto3', parte: 17, scala: [0.9, 1.8] },
      { tipo: 'pino', parte: 16, scala: [0.9, 1.9], tinta: 0x6a7a70 }, { tipo: 'roccia', parte: 6, scala: [0.5, 2.2], tinta: 0x8a8f8a },
      { tipo: 'cespuglio', parte: 5, scala: [0.5, 1.1], tinta: 0x5a6650 },
    ],
  },
  {
    // Un paese sotto la neve ai piedi dei monti, all'imbrunire: le finestre accese, il fumo dei camini, le luci della festa.
    nome: 'Borgo d’Inverno', caldo: 9, umido: 9, terra: 0xe6eef5, nebbia: 0xa3b7d0, cielo: 0x5a7fb8, densitaNebbia: 0.01, luce: 0.66,
    luceAlta: 0xbcd0f4, luceBassa: 0xa0b0cc, sole: 0xdfe6f4, erba: [0, 0, 1, 0], luoghi: [], aria: 'neve',
    suolo: FATTE.borgo.suolo, fatta: FATTE.borgo,
    piante: [{ tipo: 'pinoInnevato', parte: 34, scala: [0.8, 1.7] }, { tipo: 'roccia', parte: 3, scala: [0.6, 1.8], tinta: 0xc4e2f4 }],
  },
  {
    // Un porto di mare nella nebbia: i velieri all'ormeggio, le case alte sulla banchina, il faro che si intravede.
    nome: 'Porto delle Nebbie', caldo: 9, umido: 9, terra: 0x5c5a48, nebbia: 0x8f9aa0, cielo: 0x62707a, densitaNebbia: 0.014, luce: 0.58,
    luceAlta: 0xaab8c2, luceBassa: 0x4a4a42, sole: 0xc4ccd4, erba: [0.3, 0.35, 0, 0.5], luoghi: [],
    suolo: FATTE.porto.suolo, fatta: FATTE.porto,
    piante: [
      { tipo: 'cespuglio', parte: 6, scala: [0.5, 1.1], tinta: 0x6a7460 }, { tipo: 'roccia', parte: 5, scala: [0.5, 1.8], tinta: 0x8a8f8a },
      { tipo: 'pino', parte: 5, scala: [0.8, 1.5], tinta: 0x6a7a70 },
    ],
  },
  {
    // Un castello in cima a un colle, in fondo a una strada di ciottoli: bosco verde, sole, il mulino e il ruscello.
    nome: 'Castello del Bosco', caldo: 9, umido: 9, terra: 0x3a7230, nebbia: 0xb6d2e4, cielo: 0x2f70d8, densitaNebbia: 0.0028, luce: 1,
    luceAlta: 0xcfe4ff, luceBassa: 0x5c7a3c, sole: 0xfff0d2, erba: [1, 0, 0, 0.2], luoghi: [],
    suolo: FATTE.castello.suolo, fatta: FATTE.castello,
    piante: [
      { tipo: 'quercia', parte: 30, scala: [0.9, 1.8] }, { tipo: 'pino', parte: 14, scala: [0.9, 1.9] },
      { tipo: 'cespuglio', parte: 12, scala: [0.7, 1.5], tinta: 0xb9d9b0 }, { tipo: 'roccia', parte: 2, scala: [0.5, 1.6] },
    ],
  },
  {
    // Il posto di prova dello stile disegnato: rovine di pietra chiara al crepuscolo, cristalli viola che brillano,
    // lanterne, il fiume turchese, abeti scuri nella foschia. Tutto fatto dal codice, niente fotografie.
    nome: 'Rovine del Cristallo', caldo: 9, umido: 9, terra: 0x3f7a58, nebbia: 0x8f7fc0, cielo: 0x6a55c8, densitaNebbia: 0.0048, luce: 0.86,
    luceAlta: 0xc2b4ff, luceBassa: 0x5a5488, sole: 0xffb890, erba: [1, 0, 0, 0.3], luoghi: [], aria: 'lucciole', incanto: 0xd8a0ff,
    suolo: FATTE.rovine.suolo, fatta: FATTE.rovine,
    piante: [
      { tipo: 'pino', parte: 30, scala: [1.0, 2.2], tinta: 0x8fa0b8 }, { tipo: 'cespuglio', parte: 5, scala: [0.6, 1.3], tinta: 0xa8c8b8 },
      { tipo: 'roccia', parte: 2, scala: [0.5, 1.5], tinta: 0xb0a8d0 },
    ],
  },
];

/** I numeri delle terre fatte a mano. */
const FATTE_A_MANO: readonly number[] = ZONE.flatMap((z, i) => (z.fatta ? [i] : []));
/** Il numero della terra fatta a mano con quel nome in codice ('strega', 'borgo'...). */
export const zonaFatta = (chiave: string): number => ZONE.findIndex((z) => z.fatta?.chiave === chiave);

/** Quante terre ci sono: ogni elenco di "pesi" ha questa lunghezza. */
export const N_ZONE = ZONE.length;

export const QUOTA_ACQUA = -0.55;

/** Un numero "a caso" ma sempre uguale per la stessa casella della mappa: è ciò che rende il mondo ripetibile. */
export function sorte(cx: number, cz: number, sale: number): number {
  let h = Math.imul(cx, 374761393) ^ Math.imul(cz, 668265263) ^ Math.imul(sale, 2246822519);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Quanto un punto appartiene a ciascun tipo di terra: tanti numeri quante sono le terre, che sommati danno 1.
 * Il mondo non ha confini: caldo e umidità cambiano dolcemente da un posto all'altro, e ogni terra nasce dove
 * il clima le somiglia. Attorno al punto di partenza c'è sempre prato.
 */
export function pesiZone(x: number, z: number, esito: Float32Array | number[]): void {
  const caldo = (rumoreStrati(x * 0.0017 + 11.3, z * 0.0017 + 5.1, 3) - 0.5) * 4.6;
  const umido = (rumoreStrati(x * 0.0017 + 71.7, z * 0.0017 + 33.9, 3) - 0.5) * 4.6;
  const casa = gradino(300, 150, Math.hypot(x, z));
  let somma = 0;
  for (let i = 0; i < ZONE.length; i++) {
    const zona = ZONE[i]!;
    const dc = caldo - zona.caldo;
    const du = umido - zona.umido;
    let f = Math.exp(-(dc * dc + du * du) / 0.085) + 1e-9;
    if (i === PRATO) f = f * 1.25 + casa * 40;
    // Una terra fatta a mano esiste solo attorno al suo centro, e lì vince su tutto.
    if (zona.fatta) f = pesoFatta(zona.fatta, x, z);
    esito[i] = f;
    somma += f;
  }
  for (let i = 0; i < ZONE.length; i++) esito[i] = esito[i]! / somma;
}

const LATO_CONI = 430;

/** Il vulcano più vicino, se ce n'è uno: dà la distanza dal suo cratere. */
function distanzaDalCratere(x: number, z: number): number {
  const cx = Math.floor(x / LATO_CONI);
  const cz = Math.floor(z / LATO_CONI);
  let vicino = Infinity;
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const kx = (cx + dx + 0.25 + sorte(cx + dx, cz + dz, 7) * 0.5) * LATO_CONI;
      const kz = (cz + dz + 0.25 + sorte(cx + dx, cz + dz, 8) * 0.5) * LATO_CONI;
      vicino = Math.min(vicino, Math.hypot(x - kx, z - kz));
    }
  }
  return vicino;
}

/** Quanta lava c'è in un punto (0 niente, 1 piena): i crateri e i fiumi che scendono dai vulcani. */
export function lava(x: number, z: number, pesoVulcano: number): number {
  if (pesoVulcano < 0.35) return 0;
  const d = distanzaDalCratere(x, z);
  const cratere = gradino(15, 11, d);
  const fiume = gradino(0.045, 0.02, Math.abs(rumore(x * 0.021 + 50, z * 0.021 + 9) - 0.5)) * gradino(22, 34, d);
  return Math.max(cratere, fiume) * gradino(0.35, 0.7, pesoVulcano);
}

const p = new Float32Array(N_ZONE);

/** Ciò che l'ultimo calcolo dell'altezza ha trovato in quel punto, oltre all'altezza: serve a decidere dove costruire. */
const rilievo = { terraferma: 1, monti: 0, fiume: 0 };

/** Quanto un punto è terraferma (1) o mare (0). Attorno al punto di partenza è sempre terra. */
export function terraferma(x: number, z: number): number {
  const continente = rumoreStrati(x * 0.0007 + 91.3, z * 0.0007 + 17.7, 3);
  return gradino(0.41, 0.47, continente + gradino(520, 260, Math.hypot(x, z)) * 0.3);
}

/**
 * L'altezza "naturale" del terreno, prima di spianare i luoghi costruiti. Lascia i pesi delle zone in `p`.
 * Si sommano quattro cose: il suolo di ogni terra (colline, dune, conche), le catene di montagne, i fiumi che
 * scavano la pianura, e il mare che prende il posto della terra dove il continente finisce.
 */
function grezza(x: number, z: number): number {
  pesiZone(x, z, p);
  // Dentro una zona fatta a mano il terreno è proprio quello disegnato: niente monti, fiumi né mare che non siano
  // nel disegno. Sul bordo (`fatto` tra 0 e 1) il disegno sfuma nel paesaggio naturale.
  let fatto = 0;
  for (const i of FATTE_A_MANO) fatto += p[i]!;
  if (fatto > 0.9995) {
    let disegnato = 0;
    for (const i of FATTE_A_MANO) if (p[i]! > 0.001) disegnato += p[i]! * ZONE[i]!.suolo(x, z);
    rilievo.terraferma = 1;
    rilievo.monti = 0;
    rilievo.fiume = 0;
    return disegnato / fatto;
  }
  const naturale = 1 - fatto;
  const r = Math.hypot(x, z);
  let h = 0;
  for (let i = 0; i < N_ZONE; i++) if (p[i]! > 0.001) h += p[i]! * ZONE[i]!.suolo(x, z);
  if (p[VULCANO]! > 0.001) {
    // Sul vulcano si aggiungono il cono con il cratere e i letti delle colate.
    const d = distanzaDalCratere(x, z);
    h += p[VULCANO]! * (44 * Math.max(0, 1 - d / 78) - 20 * gradino(19, 8, d) - lava(x, z, p[VULCANO]!) * 1.2);
  }
  // Il fondo dei laghi non scende oltre il ginocchio.
  if (h < -1) h = mescola(-1 - (1 - Math.exp(h + 1)) * 0.5, h, fatto);

  // Le montagne: catene lunghe, con creste affilate e valli in mezzo. Lontane dal punto di partenza.
  const terra = terraferma(x, z);
  const catena = gradino(0.57, 0.71, rumoreStrati(x * 0.0011 + 200.5, z * 0.0011 + 300.2, 2)) * gradino(260, 520, r) * terra * naturale;
  if (catena > 0) {
    const cresta = 1 - Math.abs(rumoreStrati(x * 0.0042 + 40.7, z * 0.0042 + 80.3, 4) * 2 - 1);
    h += catena * (18 + cresta * cresta * 105);
  }

  // I fiumi: nastri che serpeggiano nella pianura (non sui monti, non nel villaggio di partenza).
  const dalFiume = Math.abs(rumore(x * 0.0031 + 7.3, z * 0.0031 + 3.9) - 0.5);
  const fiume = gradino(0.03, 0.009, dalFiume) * (1 - gradino(0, 0.25, catena)) * gradino(120, 200, r) * (1 - p[VULCANO]!) * naturale;
  if (fiume > 0) {
    // La valle si allarga dolcemente attorno al letto, così le rive non sono muri.
    const valle = gradino(0.09, 0.03, dalFiume) * gradino(18, 5, h) * naturale;
    h += (Math.min(h, 1.2) - h) * valle * 0.7;
    h += (-1.25 - h) * fiume * gradino(14, 4, h);
  }

  // Il mare: dove il continente finisce il fondale scende piano (spiaggia) e poi si fa profondo.
  if (terra < 1) {
    const fondale = -7 + rumore(x * 0.02 + 5, z * 0.02 + 9) * 2.5;
    let m = fondale + (Math.max(h, 0.5) - fondale) * terra * terra;
    if (terra > 0.55) m = Math.min(m, 0.2 + (terra - 0.55) * 30) + (m - Math.min(m, 0.2 + (terra - 0.55) * 30)) * gradino(0.75, 1, terra);
    h = mescola(m, h, fatto);
  }
  rilievo.terraferma = terra;
  rilievo.monti = catena;
  rilievo.fiume = fiume;
  return h;
}

// ---------------------------------------------------------------------------------------------------------------
// I luoghi costruiti: il mondo è diviso in grandi caselle, e in molte di esse la sorte ne mette uno.

export interface Luogo {
  /** Nome unico della casella: serve a ricordare che lo si è scoperto. */
  readonly chiave: string;
  readonly tipo: string;
  readonly nome: string;
  readonly x: number;
  readonly z: number;
  readonly raggio: number;
  /** L'altezza a cui il terreno viene spianato. */
  readonly quota: number;
  readonly seme: number;
}

export const TIPI: Readonly<Record<string, { nome: string; raggio: number }>> = {
  villaggio: { nome: 'Il villaggio', raggio: 48 },
  borgo: { nome: 'Un borgo', raggio: 21 },
  fattoria: { nome: 'Una fattoria', raggio: 17 },
  vedetta: { nome: 'Una torre di vedetta', raggio: 10 },
  piramide: { nome: 'Una piramide', raggio: 17 },
  tempio: { nome: 'Un tempio delle colonne', raggio: 15 },
  casbah: { nome: 'Case di sabbia', raggio: 15 },
  castello: { nome: 'Un castello di ghiaccio', raggio: 21 },
  igloo: { nome: 'Un villaggio di igloo', raggio: 14 },
  guglia: { nome: 'Una guglia di cristallo', raggio: 10 },
  palafitte: { nome: 'Palafitte', raggio: 17 },
  strega: { nome: 'Una torre storta', raggio: 10 },
  fortezza: { nome: 'Una fortezza nera', raggio: 19 },
  altare: { nome: 'Un altare di brace', raggio: 10 },
};

export const LATO_CASELLA = 150;
const caselle = new Map<string, Luogo | null>();

/** Il luogo (se c'è) nella casella indicata. Chiesto due volte, dà sempre la stessa risposta. */
export function luogoDiCasella(cx: number, cz: number): Luogo | null {
  const chiave = `${cx},${cz}`;
  const gia = caselle.get(chiave);
  if (gia !== undefined) return gia;
  let luogo: Luogo | null = null;
  if (cx === 0 && cz === 0) {
    luogo = { chiave, tipo: 'villaggio', nome: TIPI.villaggio!.nome, x: 0, z: 0, raggio: 48, quota: 2.2, seme: 11 };
  } else if (sorte(cx, cz, 1) < 0.62) {
    const x = (cx + 0.5 + (sorte(cx, cz, 2) - 0.5) * 0.44) * LATO_CASELLA;
    const z = (cz + 0.5 + (sorte(cx, cz, 3) - 0.5) * 0.44) * LATO_CASELLA;
    // Abbastanza lontano dal villaggio di partenza e dalle zone fatte a mano, e ben dentro una terra sola (non a
    // cavallo di un confine).
    if (Math.hypot(x, z) > 85 && FATTE_A_MANO.every((i) => Math.hypot(x - ZONE[i]!.fatta!.centro.x, z - ZONE[i]!.fatta!.centro.z) > ZONE[i]!.fatta!.raggio + 62)) {
      // Dove il terreno è sott'acqua (nella palude capita spesso) il luogo sorge su un isolotto appena sopra il pelo.
      const quota = Math.max(1.2, grezza(x, z));
      let zona = 0;
      for (let i = 1; i < ZONE.length; i++) if (p[i]! > p[zona]!) zona = i;
      // Non si costruisce in mare, nel letto di un fiume né sul fianco di una montagna.
      const adatto = rilievo.terraferma > 0.98 && rilievo.monti < 0.08 && rilievo.fiume < 0.05;
      if (adatto && p[zona]! > 0.62 && lava(x, z, p[VULCANO]!) < 0.05) {
        const scelte = ZONE[zona]!.luoghi;
        const tipo = scelte[Math.floor(sorte(cx, cz, 4) * scelte.length)];
        const dati = tipo === undefined ? undefined : TIPI[tipo];
        // Una terra senza luoghi suoi (il Bosco della Strega è costruito tutto a mano) non ne fa nascere.
        if (tipo !== undefined && dati) luogo = { chiave, tipo, nome: dati.nome, x, z, raggio: dati.raggio, quota, seme: Math.floor(sorte(cx, cz, 5) * 1e6) };
      }
    }
  }
  caselle.set(chiave, luogo);
  return luogo;
}

/** Tutti i luoghi entro una certa distanza da un punto. */
export function luoghiVicini(x: number, z: number, distanza: number): Luogo[] {
  const trovati: Luogo[] = [];
  const da = Math.floor((x - distanza - LATO_CASELLA) / LATO_CASELLA);
  const a = Math.floor((x + distanza + LATO_CASELLA) / LATO_CASELLA);
  const daZ = Math.floor((z - distanza - LATO_CASELLA) / LATO_CASELLA);
  const aZ = Math.floor((z + distanza + LATO_CASELLA) / LATO_CASELLA);
  for (let cz = daZ; cz <= aZ; cz++) {
    for (let cx = da; cx <= a; cx++) {
      const l = luogoDiCasella(cx, cz);
      if (l && Math.hypot(l.x - x, l.z - z) - l.raggio < distanza) trovati.push(l);
    }
  }
  return trovati;
}

export interface Campione {
  h: number;
  pesi: Float32Array;
}
const campione: Campione = { h: 0, pesi: new Float32Array(N_ZONE) };

/** Altezza esatta e pesi delle zone in un punto (lento: per l'uso di tutti i giorni c'è `altezza` in terreno.ts). */
export function campiona(x: number, z: number): Campione {
  // I luoghi vanno cercati prima: cercarli calcola altre altezze e sporcherebbe i pesi di questo punto.
  const cx = Math.floor(x / LATO_CASELLA);
  const cz = Math.floor(z / LATO_CASELLA);
  const vicini: Luogo[] = [];
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) {
      const l = luogoDiCasella(cx + dx, cz + dz);
      if (l && Math.hypot(x - l.x, z - l.z) < l.raggio + 20) vicini.push(l);
    }
  }
  let h = grezza(x, z);
  campione.pesi.set(p);
  for (const l of vicini) h += (l.quota - h) * gradino(l.raggio + 20, l.raggio + 2, Math.hypot(x - l.x, z - l.z));
  campione.h = h;
  return campione;
}

export function altezzaEsatta(x: number, z: number): number {
  return campiona(x, z).h;
}
