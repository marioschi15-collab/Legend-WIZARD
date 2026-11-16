import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { scalaPunti } from '../effetti/particelle.js';
import { materialeRametti } from './alberiVeri.js';
import { atmosfera } from './atmosfera.js';
import { STREGA_DATI } from './stregaDati.js';
import { CENTRO_STREGA } from './stregaTerreno.js';

export interface BoscoStrega {
  readonly gruppo: THREE.Group;
  /** Il punto, all'imbocco del sentiero, dove porta il viaggio rapido. */
  readonly imbocco: { x: number; z: number };
  aggiorna(dt: number, occhi: THREE.Vector3): void;
}

/** Come brilla ogni tipo di punto luce: colore, grandezza dell'alone in metri, quanto trema, se fa luce davvero. */
const ALONI: Readonly<Record<string, { colore: [number, number, number]; grande: number; trema: number; vera: boolean }>> = {
  lanterna: { colore: [1.0, 0.6, 0.22], grande: 1.7, trema: 0.12, vera: true },
  torcia: { colore: [1.0, 0.5, 0.15], grande: 2.0, trema: 0.3, vera: true },
  finestra: { colore: [1.0, 0.66, 0.3], grande: 2.6, trema: 0.05, vera: true },
  candela: { colore: [1.0, 0.72, 0.35], grande: 0.5, trema: 0.3, vera: false },
  zucca: { colore: [1.0, 0.5, 0.1], grande: 1.0, trema: 0.2, vera: false },
  runa: { colore: [0.3, 0.9, 1.0], grande: 1.4, trema: 0.15, vera: true },
  cripta: { colore: [0.55, 1.0, 0.6], grande: 2.2, trema: 0.2, vera: true },
  pozione: { colore: [0.4, 1.0, 0.45], grande: 1.3, trema: 0.25, vera: false },
};

/**
 * Il Bosco della Strega costruito a mano con Blender (vedi strumenti/strega/scena.py): la casa, il cimitero, la
 * cappella, lo stagno, il cerchio di pietre, i sentieri. Le forme stanno in un file a parte, che si scarica solo
 * quando ci si avvicina; gli ingombri e i punti luce ci sono da subito. Tre luci vere seguono i punti che
 * brillano più vicini a chi gioca; tutti gli altri hanno solo il loro alone, che costa quasi niente.
 */
export function creaBoscoStrega(R: typeof RAPIER, fisica: RAPIER.World): BoscoStrega {
  const gruppo = new THREE.Group();
  const c = CENTRO_STREGA;

  // --- gli ingombri: muri, tronchi, lapidi, cancellate ---
  const giro = new THREE.Quaternion();
  const asse = new THREE.Vector3(0, 1, 0);
  for (const u of STREGA_DATI.urti) {
    if (u.m) {
      giro.setFromAxisAngle(asse, u.g ?? 0);
      fisica.createCollider(R.ColliderDesc.cuboid(u.m[0], u.m[1], u.m[2]).setTranslation(u.p[0], u.p[1], u.p[2]).setRotation({ x: giro.x, y: giro.y, z: giro.z, w: giro.w }));
    } else if (u.r !== undefined && u.h !== undefined) {
      fisica.createCollider(R.ColliderDesc.cylinder(u.h, u.r).setTranslation(u.p[0], u.p[1], u.p[2]));
    }
  }

  // --- gli aloni: un puntino morbido per ogni lanterna, candela, finestra, zucca, runa ---
  const luci = STREGA_DATI.luci.filter((l) => ALONI[l.t]);
  const pos = new Float32Array(luci.length * 3);
  const col = new Float32Array(luci.length * 3);
  const dati = new Float32Array(luci.length * 3);
  luci.forEach((l, i) => {
    const a = ALONI[l.t]!;
    pos.set(l.p, i * 3);
    col.set(a.colore, i * 3);
    dati.set([a.grande * (0.7 + 0.3 * l.f), i * 1.7, a.trema], i * 3);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('colore', new THREE.BufferAttribute(col, 3));
  g.setAttribute('dati', new THREE.BufferAttribute(dati, 3));
  const aloni = new THREE.Points(
    g,
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uScala: scalaPunti, uTempo: atmosfera.tempo, uNebbia: atmosfera.nebbiaDensita },
      vertexShader: /* glsl */ `
        attribute vec3 colore; attribute vec3 dati;
        uniform float uScala; uniform float uTempo; uniform float uNebbia;
        varying vec4 vColore;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          float lontano = -mv.z;
          float trema = 1.0 + dati.z * (sin(uTempo * 9.0 + dati.y) * 0.6 + sin(uTempo * 23.0 + dati.y * 2.3) * 0.4);
          gl_PointSize = min(dati.x * trema * uScala / max(lontano, 0.5), 220.0);
          // Nella nebbia una luce si vede da più lontano delle cose: l'alone svanisce più piano.
          float f = uNebbia * lontano * 0.55;
          vColore = vec4(colore * trema, exp(-f * f) * smoothstep(0.6, 2.5, lontano));
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec4 vColore;
        void main() {
          float d = length(gl_PointCoord - 0.5) * 2.0;
          float a = smoothstep(1.0, 0.0, d);
          gl_FragColor = vec4(vColore.rgb * (a * a * 0.55 + pow(a, 8.0) * 1.2), vColore.a);
          #include <colorspace_fragment>
        }
      `,
    }),
  );
  aloni.frustumCulled = false;
  aloni.renderOrder = 7;
  gruppo.add(aloni);

  // --- tre luci vere, che stanno sempre sui punti luce più vicini ---
  const vere = luci.filter((l) => ALONI[l.t]!.vera).map((l) => ({ dove: new THREE.Vector3(...l.p), tipo: ALONI[l.t]!, fase: l.p[0] * 3.1 }));
  const fari = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xff9a40, 0, 20, 1.5);
    gruppo.add(l);
    return l;
  });

  // --- le forme: si scaricano la prima volta che ci si avvicina ---
  let chiesto = false;
  let scena: THREE.Object3D | null = null;
  const carica = async (): Promise<void> => {
    try {
      const caricatore = new GLTFLoader();
      caricatore.setMeshoptDecoder(MeshoptDecoder);
      const radice = (await caricatore.loadAsync('modelli/bosco_strega.glb')).scene;
      const materie = new Map<string, THREE.Material>();
      const materia = (v: THREE.MeshStandardMaterial): THREE.Material => {
        let m = materie.get(v.name);
        if (m) return m;
        // Ciò che brilla (lanterne, vetrate, rune) ha luce propria anche nella nebbia; i rametti sono cartoncini
        // ritagliati; tutto il resto prende la luce del posto, e i colori dei punti (più scuri verso terra).
        if (v.name === 'luce') m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.5) });
        else if (v.name === 'runa') m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.9, 2.2) });
        else if (v.name === 'vetrata') m = new THREE.MeshBasicMaterial({ map: v.map, color: new THREE.Color(1.7, 1.6, 1.5) });
        else if (v.name === 'rametti') m = materialeRametti();
        else m = new THREE.MeshLambertMaterial({ map: v.map, color: v.map ? 0xffffff : v.color, vertexColors: true });
        materie.set(v.name, m);
        return m;
      };
      radice.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (!mesh.isMesh) return;
        const vecchia = mesh.material as THREE.MeshStandardMaterial;
        mesh.material = materia(vecchia);
        mesh.castShadow = vecchia.name !== 'rametti' && vecchia.name !== 'luce' && vecchia.name !== 'runa';
        mesh.receiveShadow = vecchia.name !== 'rametti';
      });
      radice.position.set(c.x, 0, c.z);
      gruppo.add(radice);
      scena = radice;
    } catch {
      // Senza la scena restano il terreno, il bosco e le luci: si può giocare lo stesso.
    }
  };

  let attesa = 0;
  return {
    gruppo,
    imbocco: { x: STREGA_DATI.imbocco[0], z: STREGA_DATI.imbocco[1] },
    aggiorna(dt, occhi) {
      const lontano = Math.hypot(occhi.x - c.x, occhi.z - c.z);
      if (!chiesto && lontano < 700) {
        chiesto = true;
        void carica();
      }
      const vicino = lontano < 520;
      aloni.visible = vicino;
      if (scena) scena.visible = vicino;
      if (!vicino) {
        for (const f of fari) f.intensity = 0;
        return;
      }
      attesa -= dt;
      if (attesa <= 0) {
        attesa = 0.2;
        vere.sort((a, b) => a.dove.distanceToSquared(occhi) - b.dove.distanceToSquared(occhi));
      }
      const t = atmosfera.tempo.value;
      fari.forEach((f, i) => {
        const l = vere[i];
        if (!l) return;
        f.position.copy(l.dove);
        f.color.setRGB(l.tipo.colore[0], l.tipo.colore[1], l.tipo.colore[2]);
        f.intensity = 24 * (1 + l.tipo.trema * Math.sin(t * 11 + l.fase));
      });
    },
  };
}
