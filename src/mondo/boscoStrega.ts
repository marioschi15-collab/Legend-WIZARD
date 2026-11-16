import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { altezza } from './terreno.js';
import { CENTRO_STREGA } from './zone.js';

/** Dove comincia il sentiero (dalla parte del villaggio) e quanto è lungo. */
const LUNGO = 150;
const LARGO = 3.2;

export interface BoscoStrega {
  readonly gruppo: THREE.Group;
  /** Il punto, all'imbocco del sentiero, dove porta il viaggio rapido. */
  readonly imbocco: { x: number; z: number };
  aggiorna(dt: number, occhi: THREE.Vector3): void;
}

/**
 * Il cuore del Bosco della Strega: la casa (modellata con Blender, vedi strumenti/casa_strega.py), il sentiero di
 * ciottoli che ci arriva dalla parte del villaggio, e le torce lungo il sentiero. Le due torce più vicine a chi
 * gioca fanno luce davvero; le altre brillano soltanto, così costano poco.
 */
export async function creaBoscoStrega(R: typeof RAPIER, fisica: RAPIER.World): Promise<BoscoStrega> {
  const gruppo = new THREE.Group();
  const c = CENTRO_STREGA;
  // La casa guarda verso il villaggio di partenza.
  const verso = new THREE.Vector2(-c.x, 20 - c.z).normalize();
  const giro = Math.atan2(verso.x, verso.y);
  let base = Infinity;
  for (let dx = -5; dx <= 5; dx += 2.5) for (let dz = -5; dz <= 5; dz += 2.5) base = Math.min(base, altezza(c.x + dx, c.z + dz));

  try {
    const casa = (await new GLTFLoader().loadAsync('modelli/casa_strega.glb')).scene;
    casa.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = m.receiveShadow = true;
      const vecchi = Array.isArray(m.material) ? m.material : [m.material];
      const nuovi = vecchi.map((v) => {
        const s = v as THREE.MeshStandardMaterial;
        // Le finestre brillano di luce propria anche nella nebbia; il resto prende la luce del posto.
        return s.name === 'finestra' ? new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.1, 0.35) }) : new THREE.MeshLambertMaterial({ map: s.map, color: s.map ? 0xffffff : s.color });
      });
      m.material = Array.isArray(m.material) ? nuovi : nuovi[0]!;
    });
    casa.position.set(c.x, base + 1.2, c.z);
    casa.rotation.y = giro;
    gruppo.add(casa);
    // Un corpo fermo grande come la casa: non ci si passa attraverso.
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), giro);
    fisica.createCollider(R.ColliderDesc.cuboid(6.4, 5, 5.2).setTranslation(c.x, base + 4, c.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
  } catch {
    // Senza il modello resta il bosco, con il sentiero e le torce.
  }

  // --- il sentiero: una striscia di ciottoli che serpeggia dalla casa verso il villaggio, appoggiata al terreno ---
  const lato = new THREE.Vector2(-verso.y, verso.x);
  const punto = (t: number): { x: number; z: number } => {
    const d = 13 + t * LUNGO;
    const sbanda = Math.sin(t * 7) * 7 * Math.min(1, t * 4);
    return { x: c.x + verso.x * d + lato.x * sbanda, z: c.z + verso.y * d + lato.y * sbanda };
  };
  const passi = 90;
  const pos: number[] = [];
  const uv: number[] = [];
  const ind: number[] = [];
  for (let i = 0; i <= passi; i++) {
    const a = punto(i / passi);
    const b = punto(Math.min(1, (i + 1) / passi));
    const tx = b.x - a.x || verso.x;
    const tz = b.z - a.z || verso.y;
    const tl = Math.hypot(tx, tz) || 1;
    for (const s of [-1, 1]) {
      const x = a.x + ((-tz / tl) * s * LARGO) / 2;
      const z = a.z + ((tx / tl) * s * LARGO) / 2;
      pos.push(x, altezza(x, z) + 0.07, z);
      uv.push(s > 0 ? 1 : 0, (i * LUNGO) / passi / LARGO);
    }
    if (i < passi) ind.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(ind);
  g.computeVertexNormals();
  const ciottoli = new THREE.TextureLoader().load('materiali/ciottoli.jpg');
  ciottoli.colorSpace = THREE.SRGBColorSpace;
  ciottoli.wrapS = ciottoli.wrapT = THREE.RepeatWrapping;
  ciottoli.anisotropy = 4;
  const sentiero = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ map: ciottoli, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  sentiero.receiveShadow = true;
  gruppo.add(sentiero);

  // --- le torce: un palo e una fiamma, ai due lati del sentiero e davanti alla casa ---
  const tela = document.createElement('canvas');
  tela.width = tela.height = 64;
  const d2 = tela.getContext('2d')!;
  const sfumo = d2.createRadialGradient(32, 38, 2, 32, 34, 30);
  sfumo.addColorStop(0, 'rgba(255,245,200,1)');
  sfumo.addColorStop(0.3, 'rgba(255,170,60,0.9)');
  sfumo.addColorStop(1, 'rgba(255,90,10,0)');
  d2.fillStyle = sfumo;
  d2.fillRect(0, 0, 64, 64);
  const fiamma = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(tela), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true });
  const legno = new THREE.MeshLambertMaterial({ color: 0x2a2018 });
  const palo = new THREE.CylinderGeometry(0.06, 0.08, 1.7, 6).translate(0, 0.85, 0);
  const torce: { fiamma: THREE.Sprite; dove: THREE.Vector3; fase: number }[] = [];
  const torcia = (x: number, z: number): void => {
    const y = altezza(x, z);
    const p = new THREE.Mesh(palo, legno);
    p.position.set(x, y, z);
    const f = new THREE.Sprite(fiamma);
    f.position.set(x, y + 1.95, z);
    f.scale.setScalar(0.9);
    gruppo.add(p, f);
    torce.push({ fiamma: f, dove: new THREE.Vector3(x, y + 2, z), fase: torce.length * 1.7 });
  };
  for (let i = 0; i < 11; i++) {
    const t = i / 10;
    const a = punto(t);
    const b = punto(Math.min(1, t + 0.01));
    const tl = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    const s = i % 2 ? 1 : -1;
    torcia(a.x + ((-(b.z - a.z) / tl) * s * (LARGO / 2 + 0.7)), a.z + (((b.x - a.x) / tl) * s * (LARGO / 2 + 0.7)));
  }
  const luci = [0, 1].map(() => {
    const l = new THREE.PointLight(0xff9a40, 0, 22, 1.6);
    gruppo.add(l);
    return l;
  });
  const imbocco = punto(1);
  let tempo = 0;
  return {
    gruppo,
    imbocco,
    aggiorna(dt, occhi) {
      tempo += dt;
      // Lontano dal bosco non c'è niente da fare.
      if (Math.hypot(occhi.x - c.x, occhi.z - c.z) > 420) {
        for (const l of luci) l.intensity = 0;
        return;
      }
      for (const t of torce) t.fiamma.scale.setScalar(0.85 + Math.sin(tempo * 11 + t.fase) * 0.08 + Math.sin(tempo * 23 + t.fase * 2) * 0.05);
      // Le due torce più vicine fanno luce davvero.
      const vicine = [...torce].sort((a, b) => a.dove.distanceToSquared(occhi) - b.dove.distanceToSquared(occhi));
      luci.forEach((l, i) => {
        const t = vicine[i];
        if (!t) return;
        l.position.copy(t.dove);
        l.intensity = 26 + Math.sin(tempo * 13 + t.fase) * 5;
      });
    },
  };
}
