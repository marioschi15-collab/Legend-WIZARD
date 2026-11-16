import * as THREE from 'three';
import { QUERCIA_DATI } from './querciaDati.js';
import { ALBERI_SPOGLI } from './alberiSpogliDati.js';
import { MODELLI_DATI } from './modelliDati.js';
import { SASSO_DATI } from './sassoDati.js';

/** Quanto ingrandire il modello (alto tre metri e mezzo) per farne una quercia del gioco. */
const SCALA = 2.3;
/** Il lato, nel modello, del pezzo di chioma ritratto in ogni «carta» di foglie. */
const LATO_CARTA = 1.5;

let immagine: THREE.Texture | null = null;
/** L'immagine con le fronde, l'albero intero e la corteccia, tutte ritratte dal modello vero. */
function atlante(): THREE.Texture {
  if (immagine) return immagine;
  if (typeof document === 'undefined') {
    immagine = new THREE.DataTexture(new Uint8Array([90, 120, 60, 255]), 1, 1);
    immagine.needsUpdate = true;
  } else {
    immagine = new THREE.TextureLoader().load('materiali/quercia.webp');
    immagine.colorSpace = THREE.SRGBColorSpace;
    immagine.anisotropy = 4;
  }
  return immagine;
}

/** Il materiale degli alberi veri: l'immagine ritagliata lungo il contorno delle foglie. */
export function materialeVero(): THREE.MeshLambertMaterial {
  const m = new THREE.MeshLambertMaterial({ map: atlante(), alphaTest: 0.45, side: THREE.DoubleSide, vertexColors: true });
  // Il retro di una carta di foglie prende la stessa luce del davanti: altrimenti mezza chioma resterebbe nera.
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n#ifdef DOUBLE_SIDED\n  normal *= faceDirection;\n#endif');
  };
  return m;
}

/** Per l'ombra: senza, ogni carta di foglie farebbe un'ombra quadrata. */
export function ombraVera(): THREE.MeshDepthMaterial {
  return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlante(), alphaTest: 0.45 });
}

interface Lista {
  pos: number[];
  nor: number[];
  uv: number[];
  ind: number[];
}

/** Un rettangolo in piedi, girato attorno alla verticale, con la sua casella dell'immagine. */
function carta(l: Lista, cx: number, cy: number, cz: number, lato: number, giro: number, u0: number, v0: number, u1: number, v1: number, fuori: THREE.Vector3): void {
  const dx = Math.cos(giro) * lato / 2;
  const dz = Math.sin(giro) * lato / 2;
  const n = l.pos.length / 3;
  l.pos.push(cx - dx, cy - lato / 2, cz - dz, cx + dx, cy - lato / 2, cz + dz, cx + dx, cy + lato / 2, cz + dz, cx - dx, cy + lato / 2, cz - dz);
  // Le normali guardano fuori dalla chioma: la luce la modella come una massa sola, non come tanti cartoncini.
  for (let i = 0; i < 4; i++) l.nor.push(fuori.x, fuori.y, fuori.z);
  l.uv.push(u0, v0, u1, v0, u1, v1, u0, v1);
  l.ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
}

function chiudi(l: Lista): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(l.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(l.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(l.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(l.pos.length).fill(1), 3));
  g.setIndex(l.ind);
  g.scale(SCALA, SCALA, SCALA);
  return g;
}

/**
 * Una quercia vera da vicino: il tronco del modello fotografato dal vero e, al posto di un milione di foglie,
 * una sessantina di grumi fatti ognuno di due «carte» incrociate con il ritratto di un pezzo di chioma.
 */
export function geometriaQuerciaVera(): THREE.BufferGeometry {
  const d = QUERCIA_DATI;
  const l: Lista = { pos: [...d.pos], nor: [...d.nor], uv: [...d.uv], ind: [...d.ind] };
  const centro = new THREE.Vector3(0, d.alto * 0.62, 0);
  d.centri.slice(0, 64).forEach(([x, y, z], i) => {
    const fuori = new THREE.Vector3((x! - centro.x) * 0.6, Math.abs(y! - centro.y) + 1.6, (z! - centro.z) * 0.6).normalize();
    const quale = i % 4;
    const u0 = (quale % 2) * 0.25;
    const v1 = 1 - Math.floor(quale / 2) * 0.5;
    const giro = i * 2.399;
    carta(l, x!, y!, z!, LATO_CARTA, giro, u0, v1 - 0.5, u0 + 0.25, v1, fuori);
    carta(l, x!, y!, z!, LATO_CARTA, giro + 1.571, u0 + 0.25, v1 - 0.5, u0, v1, fuori);
  });
  return chiudi(l);
}

/** La stessa quercia vista da lontano: il suo ritratto intero su due carte incrociate. */
export function geometriaQuerciaVeraLontana(): THREE.BufferGeometry {
  const d = QUERCIA_DATI.intero;
  const l: Lista = { pos: [], nor: [], uv: [], ind: [] };
  const su = new THREE.Vector3(0, 1, 0);
  carta(l, d.centroX, d.lato / 2, d.centroZ, d.lato, 0, 0.5, 0.5, 0.75, 1, su);
  carta(l, d.centroX, d.lato / 2, d.centroZ, d.lato, 1.571, 0.5, 0.5, 0.75, 1, su);
  return chiudi(l);
}

/** Una roccia vera, con la sua fotografia. */
export function geometriaSassoVero(): THREE.BufferGeometry {
  const d = SASSO_DATI;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(d.pos.length).fill(1), 3));
  g.setIndex(d.ind);
  return g;
}

export function materialeSasso(): THREE.MeshLambertMaterial {
  let t: THREE.Texture;
  if (typeof document === 'undefined') {
    t = new THREE.DataTexture(new Uint8Array([120, 115, 105, 255]), 1, 1);
    t.needsUpdate = true;
  } else {
    t = new THREE.TextureLoader().load('materiali/sasso.jpg');
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  return new THREE.MeshLambertMaterial({ map: t, vertexColors: true });
}

let fotoAbete: THREE.Texture | null = null;
function atlanteAbete(): THREE.Texture {
  if (fotoAbete) return fotoAbete;
  if (typeof document === 'undefined') {
    fotoAbete = new THREE.DataTexture(new Uint8Array([70, 95, 50, 255]), 1, 1);
    fotoAbete.needsUpdate = true;
  } else {
    fotoAbete = new THREE.TextureLoader().load('materiali/abete.webp');
    fotoAbete.colorSpace = THREE.SRGBColorSpace;
    fotoAbete.anisotropy = 4;
  }
  return fotoAbete;
}

/** Un abete vero: il ritratto di un abete composto con rami fotografati dal vero, su tre carte incrociate. */
export function geometriaAbeteVero(tinta = 1): THREE.BufferGeometry {
  const l: Lista = { pos: [], nor: [], uv: [], ind: [] };
  const alto = 9.6;
  const largo = alto / 2;
  for (let i = 0; i < 3; i++) {
    const giro = (i * Math.PI) / 3;
    const dx = (Math.cos(giro) * largo) / 2;
    const dz = (Math.sin(giro) * largo) / 2;
    const n = l.pos.length / 3;
    l.pos.push(-dx, -0.1, -dz, dx, -0.1, dz, dx, alto - 0.1, dz, -dx, alto - 0.1, -dz);
    for (let k = 0; k < 4; k++) l.nor.push(0, 1, 0);
    const u0 = (i % 2) * 0.5;
    l.uv.push(u0, 0, u0 + 0.5, 0, u0 + 0.5, 1, u0, 1);
    l.ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(l.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(l.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(l.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(l.pos.length).fill(tinta), 3));
  g.setIndex(l.ind);
  return g;
}

export function materialeAbete(): THREE.MeshLambertMaterial {
  const m = materialeVero();
  m.map = atlanteAbete();
  return m;
}

export function ombraAbete(): THREE.MeshDepthMaterial {
  return new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: atlanteAbete(), alphaTest: 0.45 });
}

const fotoModelli = new Map<string, THREE.Texture>();
function fotoModello(file: string): THREE.Texture {
  let t = fotoModelli.get(file);
  if (t) return t;
  if (typeof document === 'undefined') {
    t = new THREE.DataTexture(new Uint8Array([110, 120, 80, 255]), 1, 1);
    t.needsUpdate = true;
  } else {
    t = new THREE.TextureLoader().load(`materiali/${file}`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  fotoModelli.set(file, t);
  return t;
}

/**
 * Una pianta o un legno vero, portato alla misura che serve: `alto` metri (oppure `lungo`, per ciò che sta
 * sdraiato). Con più `copie` se ne fa un cespo: la stessa pianta ripetuta, girata e un po' sparsa.
 */
export function geometriaModello(nome: string, misura: { alto?: number; lungo?: number }, copie = 1, sparso = 0): THREE.BufferGeometry {
  const d = MODELLI_DATI[nome]!;
  let alto = 0;
  let lungo = 0;
  for (let i = 0; i < d.pos.length; i += 3) {
    lungo = Math.max(lungo, Math.abs(d.pos[i]!) * 2, Math.abs(d.pos[i + 2]!) * 2);
    alto = Math.max(alto, d.pos[i + 1]!);
  }
  const k = misura.alto !== undefined ? misura.alto / alto : (misura.lungo ?? 1) / lungo;
  const l: Lista = { pos: [], nor: [], uv: [], ind: [] };
  let seme = 11;
  const caso = (): number => (seme = (seme * 16807) % 2147483647) / 2147483647;
  for (let c = 0; c < copie; c++) {
    const giro = c * 2.399 + caso();
    const cs = Math.cos(giro);
    const sn = Math.sin(giro);
    const r = c === 0 ? 0 : Math.sqrt(caso()) * sparso;
    const ox = Math.cos(giro * 1.7) * r;
    const oz = Math.sin(giro * 1.7) * r;
    const ks = k * (c === 0 ? 1 : 0.7 + caso() * 0.5);
    const n = l.pos.length / 3;
    for (let i = 0; i < d.pos.length; i += 3) {
      const x = d.pos[i]! * ks;
      const z = d.pos[i + 2]! * ks;
      l.pos.push(ox + x * cs - z * sn, d.pos[i + 1]! * ks, oz + x * sn + z * cs);
      const nx = d.nor[i]!;
      const nz = d.nor[i + 2]!;
      l.nor.push(nx * cs - nz * sn, d.nor[i + 1]!, nx * sn + nz * cs);
    }
    l.uv.push(...d.uv);
    for (const i of d.ind) l.ind.push(n + i);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(l.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(l.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(l.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(l.pos.length).fill(1), 3));
  g.setIndex(l.ind);
  return g;
}

/** Il materiale di una pianta vera (ritagliata lungo le foglie) o di un legno vero (pieno). */
export function materialeModello(file: string, ritagliato: boolean): THREE.MeshLambertMaterial {
  if (!ritagliato) return new THREE.MeshLambertMaterial({ map: fotoModello(file), vertexColors: true });
  const m = materialeVero();
  m.map = fotoModello(file);
  return m;
}

function daPezzo(d: { pos: number[]; nor: number[]; uv: number[]; ind: number[] }): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(d.pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(d.nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(d.uv, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(d.pos.length).fill(1), 3));
  g.setIndex(d.ind);
  return g;
}

/** Quanti alberi spogli diversi ci sono. */
export const QUANTI_SPOGLI = ALBERI_SPOGLI.length;

/** Il tronco e i rami grossi di un albero spoglio (ce ne sono tre, diversi), con la corteccia vera. */
export function geometriaSpoglio(quale: number): THREE.BufferGeometry {
  return daPezzo(ALBERI_SPOGLI[quale % QUANTI_SPOGLI]!.tronco);
}

/** I suoi rametti fini: cartoncini con il ritratto di un ciuffo di rami, attaccati in cima a ogni ramo. */
export function geometriaRametti(quale: number): THREE.BufferGeometry {
  return daPezzo(ALBERI_SPOGLI[quale % QUANTI_SPOGLI]!.rami);
}

export function materialeCorteccia(): THREE.MeshLambertMaterial {
  const t = fotoModello('corteccia.jpg');
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return new THREE.MeshLambertMaterial({ map: t, vertexColors: true });
}

export function materialeRametti(): THREE.MeshLambertMaterial {
  const m = materialeVero();
  m.map = fotoModello('rametti.webp');
  m.alphaTest = 0.35;
  return m;
}

/** Un albero spoglio visto da lontano: il suo ritratto intero (fatto con Blender) su due cartoncini incrociati. */
export function geometriaSpoglioLontano(): THREE.BufferGeometry {
  const l: Lista = { pos: [], nor: [], uv: [], ind: [] };
  for (const giro of [0, Math.PI / 2]) {
    const dx = Math.cos(giro) * 5;
    const dz = Math.sin(giro) * 5;
    const n = l.pos.length / 3;
    l.pos.push(-dx, -0.3, -dz, dx, -0.3, dz, dx, 9.7, dz, -dx, 9.7, -dz);
    for (let k = 0; k < 4; k++) l.nor.push(0, 1, 0);
    l.uv.push(0, 0, 1, 0, 1, 1, 0, 1);
    l.ind.push(n, n + 1, n + 2, n, n + 2, n + 3);
  }
  return daPezzo(l);
}

export function materialeSpoglioLontano(): THREE.MeshLambertMaterial {
  const m = materialeVero();
  m.map = fotoModello('spoglio_lontano.webp');
  m.alphaTest = 0.3;
  return m;
}
