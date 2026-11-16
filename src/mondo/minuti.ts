import * as THREE from 'three';
import { colora, unisci } from './modella.js';
import type { Semina } from './zone.js';

/**
 * Le cose minute che riempiono il mondo da vicino: felci, fiori alti, sassi, tronchi caduti, funghetti, ma anche
 * tracce di chi c'è passato (barili, cartelli, covoni, fuochi spenti, colonne spezzate). Sono piccole e leggere,
 * e si vedono solo attorno a chi gioca.
 */
export const TIPI_MINUTI = [
  'felce', 'fioreAlto', 'tronco', 'ceppo', 'sassi', 'funghetti', 'ciuffo', 'canne', 'zucca', 'ossa', 'sterpo',
  'menhir', 'covone', 'barile', 'cartello', 'falo', 'colonna', 'scheggia',
];

const cil = (r1: number, r2: number, h: number, lati = 6): THREE.BufferGeometry => new THREE.CylinderGeometry(r1, r2, h, lati);
const palla = (r: number, dettaglio = 0): THREE.BufferGeometry => new THREE.IcosahedronGeometry(r, dettaglio);

function felce(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    const fronda = new THREE.ConeGeometry(0.16, 1.1, 4).scale(1, 1, 0.25).translate(0, 0.55, 0).rotateZ(-0.95 - (i % 2) * 0.25).rotateY((i / 7) * 6.28);
    parti.push(colora(fronda, i % 2 ? 0x3f8a3a : 0x2f7434, 0.5));
  }
  return unisci(parti);
}

/** Uno stelo con le campanule: i fiori sono bianchi, così la terra in cui cresce li tinge del suo colore. */
function fioreAlto(): THREE.BufferGeometry {
  const parti = [colora(cil(0.025, 0.035, 1.0, 4).translate(0, 0.5, 0), 0x6f9a6a)];
  const fiori: [number, number, number, number][] = [[0, 1.05, 0, 0.13], [0.09, 0.86, 0.03, 0.11], [-0.08, 0.7, -0.04, 0.1], [0.05, 0.56, -0.07, 0.085]];
  for (const [x, y, z, r] of fiori) parti.push(colora(palla(r, 1).scale(1, 1.25, 1).translate(x, y, z), 0xffffff, 0.3));
  for (let i = 0; i < 3; i++) parti.push(colora(new THREE.ConeGeometry(0.07, 0.5, 4).scale(1, 1, 0.3).translate(0, 0.25, 0).rotateZ(-0.7).rotateY(i * 2.1), 0x5f9a5a, 0.4));
  return unisci(parti);
}

function tronco(): THREE.BufferGeometry {
  return unisci([
    colora(cil(0.3, 0.34, 3.2, 8).rotateZ(Math.PI / 2).translate(0, 0.28, 0), 0x6a4a2e, 0.25),
    colora(cil(0.09, 0.13, 0.7, 5).rotateZ(0.6).translate(0.6, 0.62, 0), 0x5c3f27),
    colora(palla(0.3, 1).scale(1.5, 0.45, 1).translate(-0.7, 0.55, 0), 0x5a9a3c, 0.4),
    colora(palla(0.22, 1).scale(1.3, 0.4, 1).translate(0.9, 0.56, 0.05), 0x6aa844, 0.4),
  ]);
}

function ceppo(): THREE.BufferGeometry {
  return unisci([
    colora(cil(0.34, 0.46, 0.5, 8).translate(0, 0.25, 0), 0x6a4a2e, 0.2),
    colora(cil(0.3, 0.3, 0.04, 8).translate(0, 0.51, 0), 0xd0a870),
    colora(palla(0.2, 1).scale(1.3, 0.5, 1).translate(0.3, 0.12, 0.2), 0x5a9a3c, 0.4),
  ]);
}

function sassi(): THREE.BufferGeometry {
  const dove: [number, number, number][] = [[0, 0, 0.34], [0.5, 0.2, 0.2], [-0.4, 0.35, 0.16], [0.15, -0.5, 0.22], [-0.3, -0.3, 0.12]];
  return unisci(dove.map(([x, z, r], i) => colora(palla(r, 0).scale(1.3, 0.75, 1).rotateY(i).translate(x, r * 0.4, z), i % 2 ? 0xa8a49e : 0x8f8b88, 0.3)), true);
}

function funghetti(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  const dove: [number, number, number][] = [[0, 0, 1], [0.22, 0.1, 0.7], [-0.15, 0.2, 0.55]];
  for (const [x, z, k] of dove) {
    parti.push(colora(cil(0.035 * k, 0.05 * k, 0.26 * k, 5).translate(x, 0.13 * k, z), 0xf2ead8));
    parti.push(colora(new THREE.SphereGeometry(0.14 * k, 8, 5, 0, 6.3, 0, 1.6).translate(x, 0.24 * k, z), 0xd8402e, 0.3));
  }
  return unisci(parti);
}

function ciuffo(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  // Un cespo di fili sottili e bassi, del verde spento dell'erba vera.
  for (let i = 0; i < 16; i++) {
    const filo = new THREE.ConeGeometry(0.018, 0.45 + (i % 4) * 0.12, 3).translate(0, 0.28, 0).rotateZ(-0.1 - (i % 5) * 0.11).rotateY(i * 0.75);
    parti.push(colora(filo, i % 2 ? 0x5a6a30 : 0x465a26, 0.7));
  }
  return unisci(parti);
}

function canne(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const x = Math.cos(i * 1.9) * 0.22;
    const z = Math.sin(i * 2.3) * 0.22;
    const h = 1.5 + (i % 3) * 0.3;
    parti.push(colora(cil(0.02, 0.03, h, 4).translate(x, h / 2, z), 0x7a9a4a));
    if (i % 2 === 0) parti.push(colora(cil(0.05, 0.05, 0.3, 5).translate(x, h + 0.05, z), 0x5a3a22));
  }
  return unisci(parti);
}

function zucca(): THREE.BufferGeometry {
  return unisci([
    colora(palla(0.32, 1).scale(1, 0.75, 1).translate(0, 0.22, 0), 0xe8802a, 0.3),
    colora(palla(0.2, 1).scale(1, 0.75, 1).translate(0.45, 0.14, 0.15), 0xf09a30, 0.3),
    colora(cil(0.025, 0.035, 0.14, 4).translate(0, 0.5, 0), 0x4f7a2e),
    colora(new THREE.ConeGeometry(0.16, 0.5, 4).scale(1, 1, 0.3).rotateZ(-1.3).translate(-0.3, 0.1, 0.2), 0x4f8a36, 0.4),
  ]);
}

function ossa(): THREE.BufferGeometry {
  const parti = [colora(cil(0.05, 0.05, 1.5, 5).rotateZ(Math.PI / 2).translate(0, 0.08, 0), 0xe8e0cc)];
  for (let i = 0; i < 4; i++) {
    parti.push(colora(new THREE.TorusGeometry(0.34 - i * 0.03, 0.03, 4, 8, Math.PI).translate(0, 0.05, 0).rotateY(Math.PI / 2).translate(-0.5 + i * 0.32, 0, 0), 0xe8e0cc));
  }
  return unisci(parti);
}

function sterpo(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 7; i++) {
    parti.push(colora(cil(0.012, 0.03, 0.9 + (i % 3) * 0.2, 4).translate(0, 0.45, 0).rotateZ(-0.35 - (i % 3) * 0.3).rotateY(i * 0.9), 0x8a7050, 0.3));
  }
  return unisci(parti);
}

/** Una pietra piantata in piedi da qualcuno, tanto tempo fa. */
function menhir(): THREE.BufferGeometry {
  return unisci([
    colora(new THREE.BoxGeometry(0.7, 2.2, 0.45).translate(0, 1.0, 0).rotateZ(0.06), 0x9a968f, 0.3),
    colora(new THREE.BoxGeometry(0.5, 0.3, 0.4).translate(0.03, 2.2, 0).rotateZ(0.1), 0x8a8680),
    colora(palla(0.3, 0).scale(1.4, 0.6, 1).translate(0.5, 0.1, 0.2), 0x8f8b88),
  ], true);
}

function covone(): THREE.BufferGeometry {
  return unisci([
    colora(cil(0.5, 0.75, 1.1, 9).translate(0, 0.55, 0), 0xd8b44a, 0.4),
    colora(new THREE.ConeGeometry(0.55, 0.5, 9).translate(0, 1.35, 0), 0xe6c860),
    colora(new THREE.TorusGeometry(0.58, 0.04, 4, 10).rotateX(Math.PI / 2).translate(0, 0.8, 0), 0x8a6a30),
  ]);
}

function barile(): THREE.BufferGeometry {
  return unisci([
    colora(cil(0.32, 0.32, 0.8, 10).translate(0, 0.4, 0), 0x8a5a30, 0.25),
    colora(cil(0.37, 0.37, 0.5, 10).translate(0, 0.4, 0), 0x9a6836, 0.2),
    colora(cil(0.385, 0.385, 0.06, 10).translate(0, 0.2, 0), 0x4a4a52),
    colora(cil(0.385, 0.385, 0.06, 10).translate(0, 0.6, 0), 0x4a4a52),
  ]);
}

function cartello(): THREE.BufferGeometry {
  return unisci([
    colora(cil(0.05, 0.06, 1.7, 5).translate(0, 0.85, 0), 0x6a4a2e),
    colora(new THREE.BoxGeometry(0.9, 0.26, 0.05).translate(0.25, 1.45, 0), 0xb08850),
    colora(new THREE.BoxGeometry(0.7, 0.22, 0.05).translate(-0.2, 1.12, 0).rotateY(0.5), 0xa07a44),
  ], true);
}

/** Un fuoco spento: il cerchio di sassi, i ceppi anneriti. */
function falo(): THREE.BufferGeometry {
  const parti: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 8; i++) parti.push(colora(palla(0.14, 0).translate(Math.cos(i * 0.785) * 0.55, 0.07, Math.sin(i * 0.785) * 0.55), 0x8f8b88, 0.3));
  for (let i = 0; i < 3; i++) parti.push(colora(cil(0.06, 0.07, 0.8, 5).rotateZ(1.2).rotateY(i * 2.1).translate(0, 0.16, 0), 0x2a221e));
  return unisci(parti, true);
}

function colonna(): THREE.BufferGeometry {
  return unisci([
    colora(new THREE.BoxGeometry(0.9, 0.25, 0.9).translate(0, 0.12, 0), 0xcfc8b8),
    colora(cil(0.3, 0.33, 1.5, 8).translate(0, 1.0, 0), 0xdcd6c6, 0.25),
    colora(cil(0.3, 0.3, 0.9, 8).rotateZ(Math.PI / 2).translate(1.1, 0.28, 0.4), 0xcfc8b8, 0.2),
  ], true);
}

/** Una scheggia aguzza: di ghiaccio, di sale o di cristallo secondo la terra che la tinge. */
function scheggia(): THREE.BufferGeometry {
  return unisci([
    colora(new THREE.OctahedronGeometry(1, 0).scale(0.16, 0.6, 0.16).translate(0, 0.4, 0), 0xffffff, 0.5),
    colora(new THREE.OctahedronGeometry(1, 0).scale(0.11, 0.38, 0.11).rotateZ(0.5).translate(0.25, 0.25, 0.05), 0xffffff, 0.5),
    colora(new THREE.OctahedronGeometry(1, 0).scale(0.09, 0.3, 0.09).rotateZ(-0.6).translate(-0.2, 0.2, -0.1), 0xffffff, 0.5),
  ], true);
}

/** Le forme, nello stesso ordine dei nomi. */
export const GEOMETRIE_MINUTE = (): THREE.BufferGeometry[] => [
  felce(), fioreAlto(), tronco(), ceppo(), sassi(), funghetti(), ciuffo(), canne(), zucca(), ossa(), sterpo(),
  menhir(), covone(), barile(), cartello(), falo(), colonna(), scheggia(),
];

const s = (tipo: string, parte: number, scala: [number, number], altro: Partial<Semina> = {}): Semina => ({ tipo, parte, scala, ...altro });
/** Le tracce dei viandanti, rare ovunque. */
const VIANDANTI: Semina[] = [s('barile', 0.25, [0.9, 1.1]), s('cartello', 0.2, [0.9, 1.1]), s('falo', 0.25, [0.9, 1.2]), s('menhir', 0.3, [0.7, 1.4]), s('colonna', 0.2, [0.8, 1.2])];

/** Che cosa c'è di minuto in ogni terra, nello stesso ordine di ZONE. Le parti sono su cento punti provati. */
export const MINUTI: readonly (readonly Semina[])[] = [
  // La Radura
  [
    s('felce', 11, [0.6, 1.2], { bosco: 0.45 }), s('fioreAlto', 9, [0.7, 1.3], { bosco: 0.4 }),
    s('fioreAlto', 6, [0.6, 1.1], { tinta: 0xe0c0ff, carica: 1.2, bosco: 0.5 }), s('fioreAlto', 4, [0.6, 1.0]),
    s('ciuffo', 14, [0.7, 1.4]), s('sassi', 5, [0.5, 1.5]), s('funghetti', 4, [0.8, 1.8], { bosco: 0.5 }), s('tronco', 1.6, [0.7, 1.2]),
    s('ceppo', 1.6, [0.8, 1.3]), s('zucca', 1.2, [0.8, 1.3], { bosco: 0.6 }), s('covone', 0.8, [0.9, 1.2], { bosco: 0.55 }),
    s('canne', 8, [0.8, 1.3], { acqua: true }), ...VIANDANTI,
  ],
  // Dune d'Ambra
  [s('sterpo', 9, [0.6, 1.4]), s('sassi', 7, [0.5, 1.8], { tinta: 0xe0b878 }), s('ossa', 1.6, [0.8, 1.5]), s('ciuffo', 5, [0.5, 1.0], { tinta: 0xe0c070, carica: 1.5 }), s('colonna', 1, [0.8, 1.3], { tinta: 0xf0d8a0 }), ...VIANDANTI],
  // Terre Gelate
  [s('scheggia', 12, [0.6, 2.0], { tinta: 0xbfe6ff }), s('sassi', 7, [0.6, 1.8], { tinta: 0xdfefff }), s('sterpo', 4, [0.6, 1.2], { tinta: 0x9aa8b8 }), s('tronco', 1, [0.7, 1.1], { tinta: 0xcfe0f0 }), ...VIANDANTI],
  // Palude dei Lumi
  [
    s('canne', 16, [0.8, 1.5], { acqua: true }), s('felce', 10, [0.7, 1.4], { tinta: 0x8fb890 }), s('funghetti', 6, [0.9, 2.0], { tinta: 0x9affd0, carica: 1.3 }),
    s('tronco', 3, [0.7, 1.3], { acqua: true }), s('ceppo', 3, [0.8, 1.4], { acqua: true }), s('fioreAlto', 5, [0.7, 1.2], { tinta: 0x7affc0, carica: 1.5 }), ...VIANDANTI,
  ],
  // Monte Brace
  [s('sassi', 14, [0.6, 2.2], { tinta: 0x4a3a38 }), s('sterpo', 6, [0.6, 1.3], { tinta: 0x3a3030 }), s('scheggia', 5, [0.6, 1.6], { tinta: 0xff7a2a, carica: 1.6 }), s('ossa', 1.5, [0.8, 1.4]), s('ceppo', 2, [0.8, 1.2], { tinta: 0x3a3030 }), ...VIANDANTI],
  // Selva Fitta
  [
    s('felce', 22, [0.7, 1.6]), s('funghetti', 7, [0.9, 2.2]), s('tronco', 3.5, [0.8, 1.4]), s('ceppo', 3, [0.8, 1.4]), s('sassi', 5, [0.6, 1.6], { tinta: 0x9ab090 }),
    s('fioreAlto', 5, [0.6, 1.1], { tinta: 0xffffff, carica: 1.3 }), s('ciuffo', 8, [0.7, 1.3], { tinta: 0x8fd080 }), ...VIANDANTI,
  ],
  // Bosco d'Autunno
  [
    s('felce', 10, [0.6, 1.3], { tinta: 0xff9a40, carica: 2 }), s('funghetti', 9, [0.9, 2.0]), s('zucca', 4, [0.8, 1.5]), s('tronco', 3, [0.8, 1.3]),
    s('ceppo', 3, [0.8, 1.3]), s('ciuffo', 10, [0.7, 1.3], { tinta: 0xffc060, carica: 1.6 }), s('covone', 1.2, [0.9, 1.2]), s('sassi', 4, [0.5, 1.4]), ...VIANDANTI,
  ],
  // Giungla Smeraldo
  [
    s('felce', 24, [0.9, 2.0], { tinta: 0x7affa0 }), s('fioreAlto', 9, [0.8, 1.5], { tinta: 0xff4a8a, carica: 1.6 }), s('fioreAlto', 6, [0.8, 1.4], { tinta: 0xffa030, carica: 1.6 }),
    s('tronco', 3, [0.9, 1.5]), s('sassi', 4, [0.6, 1.6], { tinta: 0x8ab090 }), s('colonna', 1.2, [0.9, 1.4], { tinta: 0xa8c0a0 }), s('canne', 8, [0.9, 1.5], { acqua: true }), ...VIANDANTI,
  ],
  // Savana d'Oro
  [s('ciuffo', 26, [0.8, 1.7], { tinta: 0xf0c860, carica: 1.6 }), s('sterpo', 6, [0.7, 1.4]), s('sassi', 4, [0.6, 1.8], { tinta: 0xd8b888 }), s('ossa', 1, [0.8, 1.5]), s('tronco', 1, [0.8, 1.2]), ...VIANDANTI],
  // Steppa del Vento
  [s('ciuffo', 24, [0.6, 1.3], { tinta: 0xc8d890, carica: 1.3 }), s('sassi', 6, [0.5, 1.6]), s('sterpo', 4, [0.6, 1.2]), s('fioreAlto', 4, [0.5, 0.9], { tinta: 0xffffff, carica: 1.3 }), s('menhir', 1, [0.8, 1.6]), ...VIANDANTI],
  // Tundra Grigia
  [s('sassi', 12, [0.6, 2.0]), s('ciuffo', 8, [0.5, 1.0], { tinta: 0xa8b098 }), s('sterpo', 6, [0.6, 1.2], { tinta: 0x8a8a80 }), s('scheggia', 3, [0.6, 1.4], { tinta: 0xdfefff }), s('ossa', 1, [0.8, 1.4]), ...VIANDANTI],
  // Gole Rosse
  [s('sassi', 14, [0.6, 2.2], { tinta: 0xd88a60 }), s('sterpo', 8, [0.6, 1.4]), s('ossa', 1.5, [0.8, 1.5]), s('ciuffo', 5, [0.5, 1.0], { tinta: 0xd8b070, carica: 1.4 }), s('colonna', 1, [0.8, 1.3], { tinta: 0xe0a080 }), ...VIANDANTI],
  // Saline Bianche
  [s('scheggia', 14, [0.5, 1.6], { tinta: 0xffffff, carica: 1.2 }), s('sassi', 6, [0.5, 1.5], { tinta: 0xf4f0ea, carica: 1.2 }), s('sterpo', 3, [0.6, 1.2], { tinta: 0xd0c8c0 }), s('ossa', 1.5, [0.8, 1.5]), ...VIANDANTI],
  // Bosco dei Funghi
  [
    s('funghetti', 22, [1.0, 3.0], { tinta: 0xd070ff, carica: 1.5 }), s('funghetti', 10, [1.0, 2.6], { tinta: 0x60d0ff, carica: 1.5 }), s('felce', 9, [0.7, 1.4], { tinta: 0xa080ff, carica: 1.4 }),
    s('fioreAlto', 7, [0.7, 1.3], { tinta: 0x80ffe0, carica: 1.6 }), s('tronco', 2.5, [0.8, 1.3], { tinta: 0xc0a0e0 }), s('sassi', 4, [0.5, 1.5]), ...VIANDANTI,
  ],
  // Campi di Cristallo
  [s('scheggia', 20, [0.6, 2.4], { tinta: 0xb080ff, carica: 1.6 }), s('scheggia', 9, [0.6, 2.0], { tinta: 0x60e0ff, carica: 1.6 }), s('sassi', 6, [0.6, 1.8], { tinta: 0xb0a8d0 }), s('fioreAlto', 5, [0.6, 1.1], { tinta: 0xe0b0ff, carica: 1.5 }), ...VIANDANTI],
  // Bosco della Strega: solo felci, legni e sassi veri (ossa, funghi e sterpi li mette la scena fatta con Blender)
  [s('felce', 16, [0.7, 1.5], { tinta: 0x8a9a80 }), s('tronco', 5, [0.8, 1.4]), s('ceppo', 5, [0.8, 1.4]), s('sassi', 12, [0.6, 1.9])],
];
