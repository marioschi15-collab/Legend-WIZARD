import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { scalaPunti, type Particelle } from '../../effetti/particelle.js';
import { materialeRametti } from '../alberiVeri.js';
import { atmosfera } from '../atmosfera.js';
import { SCENE_FATTE, type ScenaFatta } from './elenco.js';
import { creaPaesani } from './paesani.js';

export interface SceneFatte {
  readonly gruppo: THREE.Group;
  /** Per ogni scena, il punto dove porta il viaggio rapido. */
  readonly mete: readonly { nome: string; x: number; z: number }[];
  aggiorna(dt: number, occhi: THREE.Vector3, notte?: boolean): void;
}

/** Come brilla ogni tipo di punto luce: colore, grandezza dell'alone in metri, quanto trema, se fa luce davvero. */
const ALONI: Readonly<Record<string, { colore: [number, number, number]; grande: number; trema: number; vera: boolean; tenue?: number }>> = {
  lanterna: { colore: [1.0, 0.6, 0.22], grande: 1.7, trema: 0.12, vera: true },
  torcia: { colore: [1.0, 0.5, 0.15], grande: 2.0, trema: 0.3, vera: true },
  finestra: { colore: [1.0, 0.66, 0.3], grande: 2.6, trema: 0.05, vera: true },
  candela: { colore: [1.0, 0.72, 0.35], grande: 0.5, trema: 0.3, vera: false },
  zucca: { colore: [1.0, 0.5, 0.1], grande: 1.0, trema: 0.2, vera: false },
  // Le rune e la cripta fanno una luce più tenue: da piene tingevano di azzurro e di verde tutto il bosco attorno.
  runa: { colore: [0.3, 0.9, 1.0], grande: 1.4, trema: 0.15, vera: true, tenue: 0.35 },
  cripta: { colore: [0.55, 1.0, 0.6], grande: 2.2, trema: 0.2, vera: true, tenue: 0.5 },
  pozione: { colore: [0.4, 1.0, 0.45], grande: 1.3, trema: 0.25, vera: false },
  // Il fuoco di una fucina o di un braciere, e il faro in fondo al molo, che si vede da lontano.
  brace: { colore: [1.0, 0.42, 0.1], grande: 2.4, trema: 0.35, vera: true },
  faro: { colore: [1.0, 0.85, 0.55], grande: 7.0, trema: 0.08, vera: true },
};

/** Le materie che hanno un'immagine (in public/materiali/scene), uguali per tutte le scene. */
const CON_IMMAGINE = new Set(['muro', 'pietra', 'muschio', 'tetto', 'legno', 'corteccia', 'terra', 'ciottoli', 'intonaco', 'tegole', 'neve', 'tela', 'tavole', 'vetrata']);

const immagini = new Map<string, THREE.Texture>();
function immagine(nome: string): THREE.Texture {
  let t = immagini.get(nome);
  if (!t) {
    t = new THREE.TextureLoader().load(`materiali/scene/${nome}.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.flipY = false;
    t.anisotropy = 4;
    immagini.set(nome, t);
  }
  return t;
}

const materie = new Map<string, THREE.Material>();
/** La materia di un pezzo, dal nome che ha nel file. Ciò che brilla (lanterne, vetrate, rune) ha luce propria anche
 * nella nebbia; i rametti sono cartoncini ritagliati; tutto il resto prende la luce del posto, e i colori dei punti
 * (più scuri verso terra). */
function materia(nome: string, colore: THREE.Color): THREE.Material {
  let m = materie.get(nome);
  if (m) return m;
  if (nome === 'luce') m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.5, 0.5) });
  else if (nome === 'runa') m = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.9, 2.2) });
  else if (nome === 'vetrata') m = new THREE.MeshBasicMaterial({ map: immagine('vetrata'), color: new THREE.Color(1.7, 1.6, 1.5) });
  else if (nome === 'rametti') m = materialeRametti();
  else if (nome === 'ghiaccio') m = new THREE.MeshLambertMaterial({ color: 0xcfe6f4, vertexColors: true, emissive: 0x24384a });
  else if (CON_IMMAGINE.has(nome)) m = new THREE.MeshLambertMaterial({ map: immagine(nome), vertexColors: true });
  else m = new THREE.MeshLambertMaterial({ color: colore, vertexColors: true });
  materie.set(nome, m);
  return m;
}

interface Forme {
  radice: THREE.Object3D;
  /** Ogni pezzo con la palla che lo contiene, per non disegnare quelli troppo lontani. */
  pezzi: { mesh: THREE.Mesh; centro: THREE.Vector3; raggio: number }[];
}

/** Le forme di una scena: si scaricano la prima volta che ci si avvicina. */
async function caricaForme(s: ScenaFatta): Promise<Forme | null> {
  try {
    const caricatore = new GLTFLoader();
    caricatore.setMeshoptDecoder(MeshoptDecoder);
    const radice = (await caricatore.loadAsync(`modelli/${s.file}.glb`)).scene;
    radice.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const vecchia = mesh.material as THREE.MeshStandardMaterial;
      const nome = vecchia.name;
      mesh.material = materia(nome, vecchia.color);
      mesh.castShadow = nome !== 'rametti' && nome !== 'luce' && nome !== 'runa';
      mesh.receiveShadow = nome !== 'rametti';
    });
    radice.position.set(s.terra.centro.x, 0, s.terra.centro.z);
    radice.updateMatrixWorld(true);
    const pezzi: Forme['pezzi'] = [];
    radice.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      mesh.geometry.computeBoundingSphere();
      const palla = mesh.geometry.boundingSphere!;
      pezzi.push({ mesh, centro: palla.center.clone().applyMatrix4(mesh.matrixWorld), raggio: palla.radius });
    });
    return { radice, pezzi };
  } catch {
    // Senza le forme restano il terreno, il bosco e le luci: si può giocare lo stesso.
    return null;
  }
}

/** Gli aloni di una scena: un puntino morbido per ogni lanterna, candela, finestra, zucca, runa. */
function creaAloni(s: ScenaFatta): THREE.Points {
  const luci = s.dati.luci.filter((l) => ALONI[l.t]);
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
  return aloni;
}

interface Vera {
  dove: THREE.Vector3;
  tipo: (typeof ALONI)[string];
  fase: number;
}

/**
 * Le scene costruite a mano con Blender (vedi strumenti/scene): il Bosco della Strega, il Borgo d'Inverno, il Porto
 * delle Nebbie, il Castello del Bosco. Le forme di ognuna stanno in un file a parte, che si scarica solo quando ci si
 * avvicina; gli ingombri e i punti luce ci sono da subito. Tre luci vere seguono i punti che brillano più vicini a
 * chi gioca; tutti gli altri hanno solo il loro alone, che costa quasi niente. Dai camini esce il fumo.
 */
export function creaSceneFatte(R: typeof RAPIER, fisica: RAPIER.World, fumo: Particelle): SceneFatte {
  const gruppo = new THREE.Group();
  const giro = new THREE.Quaternion();
  const asse = new THREE.Vector3(0, 1, 0);

  const scene = SCENE_FATTE.map((s) => {
    // Gli ingombri: muri, tronchi, lapidi, cancellate, moli.
    for (const u of s.dati.urti) {
      if (u.m) {
        giro.setFromAxisAngle(asse, u.g ?? 0);
        fisica.createCollider(R.ColliderDesc.cuboid(u.m[0], u.m[1], u.m[2]).setTranslation(u.p[0], u.p[1], u.p[2]).setRotation({ x: giro.x, y: giro.y, z: giro.z, w: giro.w }));
      } else if (u.r !== undefined && u.h !== undefined) {
        fisica.createCollider(R.ColliderDesc.cylinder(u.h, u.r).setTranslation(u.p[0], u.p[1], u.p[2]));
      }
    }
    const aloni = creaAloni(s);
    aloni.visible = false;
    gruppo.add(aloni);
    const vere: Vera[] = s.dati.luci.filter((l) => ALONI[l.t]?.vera).map((l) => ({ dove: new THREE.Vector3(...l.p), tipo: ALONI[l.t]!, fase: l.p[0] * 3.1 }));
    const camini = s.dati.luci.filter((l) => l.t === 'fumo').map((l) => new THREE.Vector3(...l.p));
    const paesani = s.dati.gente?.length ? creaPaesani(s.dati.gente) : null;
    if (paesani) {
      paesani.gruppo.visible = false;
      gruppo.add(paesani.gruppo);
    }
    return { s, aloni, vere, camini, paesani, chiesta: false, forme: null as Forme | null, vicina: false };
  });

  const fari = [0, 1, 2].map(() => {
    const l = new THREE.PointLight(0xff9a40, 0, 20, 1.5);
    gruppo.add(l);
    return l;
  });
  const candidate: Vera[] = [];
  let attesa = 0;
  let sbuffo = 0;

  return {
    gruppo,
    mete: SCENE_FATTE.map((s) => ({ nome: s.viaggio, x: s.dati.imbocco[0], z: s.dati.imbocco[1] })),
    aggiorna(dt, occhi, notte = false) {
      attesa -= dt;
      const riordina = attesa <= 0;
      if (riordina) {
        attesa = 0.2;
        candidate.length = 0;
      }
      sbuffo -= dt;
      const fuma = sbuffo <= 0;
      if (fuma) sbuffo = 0.16;
      for (const q of scene) {
        const c = q.s.terra.centro;
        const lontano = Math.hypot(occhi.x - c.x, occhi.z - c.z) - q.s.terra.raggio;
        if (!q.chiesta && lontano < 530) {
          q.chiesta = true;
          void caricaForme(q.s).then((forme) => {
            if (!forme) return;
            forme.radice.visible = q.vicina;
            gruppo.add(forme.radice);
            q.forme = forme;
          });
        }
        q.vicina = lontano < 350;
        q.aloni.visible = q.vicina;
        if (q.forme) q.forme.radice.visible = q.vicina;
        // La gente si muove solo quando ci si è dentro o quasi.
        const abitata = lontano < 60;
        if (q.paesani) {
          q.paesani.gruppo.visible = abitata;
          if (abitata) q.paesani.aggiorna(dt, occhi, notte);
        }
        if (!q.vicina) continue;
        // Dei pezzi della scena si disegnano solo quelli abbastanza vicini da vedersi (nella nebbia sono pochi).
        if (riordina && q.forme) for (const p of q.forme.pezzi) p.mesh.visible = p.centro.distanceTo(occhi) - p.raggio < q.s.vista;
        if (riordina) for (const v of q.vere) if (v.dove.distanceToSquared(occhi) < 70 * 70) candidate.push(v);
        // Il fumo dei camini: uno sbuffo ogni tanto, solo da quelli abbastanza vicini da vedersi.
        if (fuma) {
          for (const k of q.camini) {
            if (k.distanceToSquared(occhi) > 150 * 150 || Math.random() < 0.45) continue;
            fumo.emetti({
              x: k.x + (Math.random() - 0.5) * 0.3, y: k.y, z: k.z + (Math.random() - 0.5) * 0.3,
              vx: 0.5 + Math.random() * 0.4, vy: 1.3 + Math.random() * 0.6, vz: 0.2 + (Math.random() - 0.5) * 0.3,
              vita: 5 + Math.random() * 2, dim: 0.7, dimFine: 3.6, r: 0.62, g: 0.62, b: 0.66, r1: 0.8, g1: 0.82, b1: 0.86, alfa: 0.22, gravita: -0.12, attrito: 0.35,
            });
          }
        }
      }
      if (riordina) candidate.sort((a, b) => a.dove.distanceToSquared(occhi) - b.dove.distanceToSquared(occhi));
      const t = atmosfera.tempo.value;
      fari.forEach((f, i) => {
        const l = candidate[i];
        if (!l) {
          f.intensity = 0;
          return;
        }
        f.position.copy(l.dove);
        f.color.setRGB(l.tipo.colore[0], l.tipo.colore[1], l.tipo.colore[2]);
        f.intensity = 24 * (l.tipo.tenue ?? 1) * (1 + l.tipo.trema * Math.sin(t * 11 + l.fase));
      });
    },
  };
}
