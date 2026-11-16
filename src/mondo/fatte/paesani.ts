import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { PersonaFatta } from './tipi.js';

const VESTI = [0x7a4a3a, 0x3f5a7a, 0x6a6a3a, 0x8a3a3a, 0x4a6a4a, 0x7a6a8a, 0x8a7a5a, 0x55506a];

/** Tinge una forma di un colore solo (i colori stanno nei punti: così tutta la figura si disegna in una volta). */
function tinta(g: THREE.BufferGeometry, colore: number, x = 0, y = 0, z = 0, giroZ = 0): THREE.BufferGeometry {
  const c = new THREE.Color(colore);
  const n = g.getAttribute('position').count;
  const dati = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) dati.set([c.r, c.g, c.b], i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(dati, 3));
  if (giroZ) g.rotateZ(giroZ);
  g.translate(x, y, z);
  return g;
}

/** La figura di un paesano (o di una guardia, con l'elmo e la lancia): poche forme semplici fuse in una sola. */
function figura(veste: number, guardia: boolean): THREE.BufferGeometry {
  const scuro = new THREE.Color(veste).multiplyScalar(0.55).getHex();
  const pezzi = [
    tinta(new THREE.CylinderGeometry(0.2, 0.42, 1.15, 10), veste, 0, 0.58),
    tinta(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), scuro, 0, 0.95),
    tinta(new THREE.SphereGeometry(0.24, 12, 9), 0xf0c8a0, 0, 1.38),
    tinta(new THREE.SphereGeometry(0.035, 6, 5), 0x2a2420, -0.09, 1.42, 0.21),
    tinta(new THREE.SphereGeometry(0.035, 6, 5), 0x2a2420, 0.09, 1.42, 0.21),
    tinta(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 6), veste, -0.3, 0.86, 0, -0.25),
    tinta(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 6), veste, 0.3, 0.86, 0, 0.25),
  ];
  if (guardia) {
    pezzi.push(
      tinta(new THREE.SphereGeometry(0.27, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), 0x8a8f96, 0, 1.42),
      tinta(new THREE.CylinderGeometry(0.02, 0.02, 2.5, 6), 0x5a4632, 0.46, 1.25),
      tinta(new THREE.ConeGeometry(0.06, 0.3, 6), 0xb8bcc4, 0.46, 2.65),
    );
  } else {
    pezzi.push(tinta(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 12), scuro, 0, 1.56), tinta(new THREE.CylinderGeometry(0.16, 0.22, 0.2, 10), scuro, 0, 1.68));
  }
  const tutta = mergeGeometries(pezzi.map((p) => p.toNonIndexed()));
  for (const p of pezzi) p.dispose();
  return tutta!;
}

interface Paesano {
  readonly figura: THREE.Mesh;
  readonly lume: THREE.Mesh;
  readonly casa: THREE.Vector3;
  readonly meta: THREE.Vector2;
  readonly fermo: boolean;
  sosta: number;
}

export interface Paesani {
  readonly gruppo: THREE.Group;
  aggiorna(dt: number, occhi: THREE.Vector3, notte: boolean): void;
}

/**
 * La gente di un paese fatto a mano: figure semplici che passeggiano attorno al loro posto (il banco del mercato,
 * la banchina, il cortile), si fermano e si girano verso chi gioca quando è vicino, e di notte tengono una lanterna.
 * Le guardie stanno ferme al loro posto. I posti li decide la scena costruita con Blender.
 */
export function creaPaesani(gente: readonly PersonaFatta[]): Paesani {
  const gruppo = new THREE.Group();
  const materia = new THREE.MeshLambertMaterial({ vertexColors: true });
  const luce = new THREE.MeshBasicMaterial({ color: 0xffc060 });
  const palla = new THREE.SphereGeometry(0.1, 8, 6);
  const tutti: Paesano[] = gente.map((g, i) => {
    const guardia = g.t === 'guardia';
    const mesh = new THREE.Mesh(figura(guardia ? 0x5a2a2a : VESTI[(i * 5 + 3) % VESTI.length]!, guardia), materia);
    mesh.castShadow = true;
    mesh.position.set(g.p[0], g.p[1], g.p[2]);
    mesh.rotation.y = g.g ?? i * 2.4;
    const lume = new THREE.Mesh(palla, luce);
    lume.position.set(0.42, 0.75, 0.12);
    lume.visible = false;
    mesh.add(lume);
    gruppo.add(mesh);
    return { figura: mesh, lume, casa: new THREE.Vector3(g.p[0], g.p[1], g.p[2]), meta: new THREE.Vector2(g.p[0], g.p[2]), fermo: g.t !== 'paesano', sosta: 1 + (i % 5) };
  });
  let tempo = 0;
  return {
    gruppo,
    aggiorna(dt, occhi, notte) {
      tempo += dt;
      for (const a of tutti) {
        const p = a.figura.position;
        const dx = occhi.x - p.x;
        const dz = occhi.z - p.z;
        const d = Math.hypot(dx, dz);
        a.lume.visible = notte;
        if (d < 5.5 && Math.abs(occhi.y - p.y) < 4) {
          a.figura.rotation.y = Math.atan2(dx, dz);
          continue;
        }
        if (a.fermo) continue;
        a.sosta -= dt;
        const mx = a.meta.x - p.x;
        const mz = a.meta.y - p.z;
        const md = Math.hypot(mx, mz);
        if (md > 0.15) {
          a.figura.rotation.y = Math.atan2(mx, mz);
          p.x += (mx / md) * 0.9 * dt;
          p.z += (mz / md) * 0.9 * dt;
          p.y = a.casa.y + Math.abs(Math.sin(tempo * 7 + a.casa.x)) * 0.04;
        } else if (a.sosta <= 0) {
          const ang = Math.random() * Math.PI * 2;
          a.meta.set(a.casa.x + Math.cos(ang) * 1.3, a.casa.z + Math.sin(ang) * 1.3);
          a.sosta = 3 + Math.random() * 6;
        }
      }
    },
  };
}
