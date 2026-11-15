import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Colora una forma: più chiara in alto e più scura in basso, quanto dice `variazione`. */
export function colora(g: THREE.BufferGeometry, colore: number, variazione = 0): THREE.BufferGeometry {
  const c = new THREE.Color(colore);
  const n = g.attributes.position!.count;
  const dati = new Float32Array(n * 3);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < n; i++) {
    // Più chiaro in alto, più scuro in basso: dà volume senza bisogno di immagini.
    const k = 1 + variazione * (pos.getY(i) > 0 ? 0.5 : -0.5);
    dati[i * 3] = c.r * k;
    dati[i * 3 + 1] = c.g * k;
    dati[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(dati, 3));
  return g;
}

/**
 * Unisce più forme in una sola. Di norma le superfici vengono lisce e tonde (chiome, tronchi, funghi): è ciò che
 * dà l'aspetto morbido, da cartone animato. Con `spigoli` restano a facce piatte (rocce, cristalli, guglie).
 */
export function unisci(parti: THREE.BufferGeometry[], spigoli = false): THREE.BufferGeometry {
  const pronte = parti.map((p) => {
    p.deleteAttribute('uv');
    p.deleteAttribute('normal');
    if (spigoli) {
      const g = p.index ? p.toNonIndexed() : p;
      g.computeVertexNormals();
      return g;
    }
    // Saldando i punti che coincidono, la luce scorre da una faccia all'altra senza scalini.
    const g = mergeVertices(p, 1e-3);
    g.computeVertexNormals();
    return g.toNonIndexed();
  });
  return mergeGeometries(pronte)!;
}
