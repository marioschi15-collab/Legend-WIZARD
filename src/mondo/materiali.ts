import * as THREE from 'three';

/**
 * Le superfici fotografate dal vero (erba, terra, pietra, legno, intonaco, tegole, paglia): piccole immagini che si
 * ripetono e danno grana e dettaglio ai colori del gioco. Ogni immagine ha in media un grigio a metà: moltiplicata
 * per due lascia il colore com'è e aggiunge solo il disegno della materia. Vengono da Poly Haven (libere, CC0).
 */
const pronte = new Map<string, THREE.Texture>();

export function foto(nome: string): THREE.Texture {
  let t = pronte.get(nome);
  if (t) return t;
  if (typeof document === 'undefined') {
    // Nelle prove senza grafica non ci sono immagini: basta un grigio a metà, che non cambia nulla.
    t = new THREE.DataTexture(new Uint8Array([128, 128, 128, 255]), 1, 1);
    t.needsUpdate = true;
  } else {
    t = new THREE.TextureLoader().load(`materiali/${nome}.jpg`);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
  }
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  pronte.set(nome, t);
  return t;
}
