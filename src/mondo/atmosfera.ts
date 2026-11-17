import * as THREE from 'three';

/**
 * Valori condivisi da tutti i materiali scritti a mano: nebbia, luce generale, tempo.
 * Sono gli stessi oggetti per tutti, così basta cambiarli in un punto solo.
 */
export const atmosfera = {
  nebbiaColore: { value: new THREE.Color(0xbcd7ea) },
  cieloAlto: { value: new THREE.Color(0x2a6bdb) },
  /** Il colore della luce della terra in cui si è, rispetto a quella della Radura: serve all'erba, che non usa le luci vere. */
  ambiente: { value: new THREE.Color(1, 1, 1) },
  nebbiaDensita: { value: 0.0075 },
  luce: { value: 1 },
  tinta: { value: new THREE.Color(1, 1, 1) },
  tempo: { value: 0 },
  /** Quanto è notte (0 giorno, 1 notte fonda): accende le stelle. */
  notte: { value: 0 },
  /** Quanto è sera o alba (0 pieno giorno, 1 sole all'orizzonte): sceglie la fotografia del cielo. */
  sera: { value: 0 },
  /** Quanto si è dentro una terra incantata (0 no, 1 del tutto): lì l'acqua è turchese e il cielo prende il suo velo. */
  incanto: { value: 0 },
  /** Il velo di colore che una terra incantata stende sul cielo (bianco = nessuno). */
  velo: { value: new THREE.Color(1, 1, 1) },
};

/** Le ombre delle nuvole che scorrono sul terreno: pozze di luce dorata in una valle in penombra (da 0,4 a poco più di 1). */
export const NUBI_GLSL = /* glsl */ `
  float ombraNubi(vec2 w, float t) {
    vec2 p = w * 0.011 + vec2(t * 0.012, t * 0.004);
    float n = sin(p.x * 1.7 + sin(p.y * 1.3)) * sin(p.y * 1.9 + sin(p.x * 0.7)) * 0.5 + 0.5;
    return mix(0.4, 1.12, smoothstep(0.3, 0.62, n));
  }
`;

/** Pezzetto di codice per le schede grafiche: sfuma il colore verso la nebbia con la distanza. */
export const NEBBIA_GLSL = /* glsl */ `
  vec3 conNebbia(vec3 colore, float distanza, vec3 nebbiaColore, float densita) {
    float f = 1.0 - exp(-densita * densita * distanza * distanza);
    return mix(colore, nebbiaColore, clamp(f, 0.0, 1.0));
  }
`;
