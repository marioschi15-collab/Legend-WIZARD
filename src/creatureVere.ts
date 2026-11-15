import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Le creature «vere»: modelli con lo scheletro e i loro movimenti (fermo, cammina, pugno), fatti con Blender
 * (vedi strumenti/golem.py). Se il modello non c'è (prove senza grafica, rete assente) le creature restano
 * quelle a blocchi.
 */
let golem: { scena: THREE.Object3D; movimenti: THREE.AnimationClip[] } | null = null;

/** Carica i modelli. Da chiamare all'avvio; se non riesce, non succede nulla. */
export async function caricaCreatureVere(): Promise<void> {
  try {
    const g = await new GLTFLoader().loadAsync('modelli/golem.glb');
    golem = { scena: g.scene, movimenti: g.animations };
  } catch {
    golem = null;
  }
}

/** Il corpo animato di una creatura: il modello, chi lo muove, e i materiali (solo suoi) da tingere e poi buttare. */
export interface CorpoVero {
  readonly radice: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  readonly azioni: Readonly<Record<string, THREE.AnimationAction>>;
  readonly pelle: THREE.MeshLambertMaterial;
  readonly occhi: THREE.MeshBasicMaterial;
}

/** Un golem nuovo, con la pelle di roccia tinta di un colore e gli occhi di un altro; null se il modello non c'è. */
export function nuovoGolemVero(colore: THREE.Color, coloreOcchi: number): CorpoVero | null {
  if (!golem) return null;
  const radice = SkeletonUtils.clone(golem.scena);
  let pelle: THREE.MeshLambertMaterial | null = null;
  const occhi = new THREE.MeshBasicMaterial({ color: coloreOcchi });
  radice.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    // Le ossa spostano il modello lontano da dove è la sua scatola a riposo: senza, sparirebbe ai bordi dello schermo.
    m.frustumCulled = false;
    const vecchio = m.material as THREE.MeshStandardMaterial;
    if (vecchio.name === 'occhi') m.material = occhi;
    else {
      // L'immagine della roccia è a mezzo grigio: per due torna il colore pieno della razza.
      pelle ??= new THREE.MeshLambertMaterial({ map: vecchio.map, color: colore.clone().multiplyScalar(2), emissive: 0xffffff, emissiveIntensity: 1 });
      m.material = pelle;
    }
  });
  if (!pelle) return null;
  const mixer = new THREE.AnimationMixer(radice);
  const azioni: Record<string, THREE.AnimationAction> = {};
  for (const clip of golem.movimenti) azioni[clip.name] = mixer.clipAction(clip);
  azioni.fermo?.play();
  return { radice, mixer, azioni, pelle, occhi };
}
