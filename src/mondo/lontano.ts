import * as THREE from 'three';
import { coloreDelSuolo } from './terreno.js';
import { campiona, N_ZONE, type Campione } from './zone.js';

const PASSO = 48;
const CELLE = 56;
const PUNTI = CELLE + 1;
/** Entro questa distanza c'è già il terreno vero: quello lontano si abbassa per non spuntarci attraverso. */
const VICINO = 235;

/**
 * Il terreno visto da lontano: una rete a maglie larghe che arriva a più di un chilometro, senza peso né dettaglio.
 * Serve a una cosa sola: far vedere montagne, coste e vallate all'orizzonte, cioè i panorami.
 * Si ricalcola quando chi gioca si è spostato di un bel pezzo, poche righe per fotogramma per non far scattare il gioco.
 */
export function creaLontano(): { mesh: THREE.Mesh; segui(x: number, z: number, subito?: boolean): void } {
  const g = new THREE.BufferGeometry();
  const pos = new Float32Array(PUNTI * PUNTI * 3);
  const col = new Float32Array(PUNTI * PUNTI * 3);
  const quote = new Float32Array(PUNTI * PUNTI);
  const pesi = new Float32Array(PUNTI * PUNTI * N_ZONE);
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI * 3), 3));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(PUNTI * PUNTI * 3), 3));
  const indici: number[] = [];
  for (let j = 0; j < CELLE; j++) {
    for (let i = 0; i < CELLE; i++) {
      const a = j * PUNTI + i;
      indici.push(a, a + PUNTI, a + 1, a + 1, a + PUNTI, a + PUNTI + 1);
    }
  }
  g.setIndex(indici);
  const mesh = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xffffff, vertexColors: true }));
  mesh.frustumCulled = false;
  mesh.visible = false;

  let centroX = NaN;
  let centroZ = NaN;
  let nuovoX = 0;
  let nuovoZ = 0;
  let riga = -1;
  const punto: Campione = { h: 0, pesi: new Float32Array(N_ZONE) };

  const calcolaRiga = (j: number): void => {
    for (let i = 0; i < PUNTI; i++) {
      const k = j * PUNTI + i;
      const x = nuovoX + (i - CELLE / 2) * PASSO;
      const z = nuovoZ + (j - CELLE / 2) * PASSO;
      const c = campiona(x, z);
      quote[k] = c.h;
      pesi.set(c.pesi, k * N_ZONE);
      pos[k * 3] = x;
      pos[k * 3 + 2] = z;
    }
  };

  const consegna = (): void => {
    for (let j = 0; j < PUNTI; j++) {
      for (let i = 0; i < PUNTI; i++) {
        const k = j * PUNTI + i;
        const sx = quote[j * PUNTI + Math.max(0, i - 1)]! - quote[j * PUNTI + Math.min(CELLE, i + 1)]!;
        const sz = quote[Math.max(0, j - 1) * PUNTI + i]! - quote[Math.min(CELLE, j + 1) * PUNTI + i]!;
        const su = (2 * PASSO) / Math.hypot(sx, 2 * PASSO, sz);
        punto.h = quote[k]!;
        punto.pesi.set(pesi.subarray(k * N_ZONE, (k + 1) * N_ZONE));
        coloreDelSuolo(punto, pos[k * 3]!, pos[k * 3 + 2]!, su, col, k * 3);
        const d = Math.max(Math.abs(pos[k * 3]! - nuovoX), Math.abs(pos[k * 3 + 2]! - nuovoZ));
        pos[k * 3 + 1] = quote[k]! - (d < VICINO ? 40 : 3);
      }
    }
    (g.attributes.position!.array as Float32Array).set(pos);
    (g.attributes.color!.array as Float32Array).set(col);
    g.attributes.position!.needsUpdate = true;
    g.attributes.color!.needsUpdate = true;
    g.computeVertexNormals();
    centroX = nuovoX;
    centroZ = nuovoZ;
    mesh.visible = true;
  };

  return {
    mesh,
    segui(x, z, subito = false) {
      if (riga < 0 && !(Math.hypot(x - centroX, z - centroZ) < 96)) {
        nuovoX = Math.round(x / PASSO) * PASSO;
        nuovoZ = Math.round(z / PASSO) * PASSO;
        riga = 0;
      }
      if (riga < 0) return;
      const fino = subito ? PUNTI : Math.min(PUNTI, riga + 5);
      for (; riga < fino; riga++) calcolaRiga(riga);
      if (riga >= PUNTI) {
        riga = -1;
        consegna();
      }
    },
  };
}
