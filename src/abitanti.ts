import * as THREE from 'three';
import { MISSIONI } from './missioni.js';

interface Abitante {
  readonly id: string;
  readonly gruppo: THREE.Group;
  readonly segno: THREE.Object3D;
  vicino: boolean;
}

/** Dove aspettano gli abitanti: in fila davanti a chi entra nel villaggio. */
const POSTI: readonly (readonly [number, number])[] = [[-7, 33], [-3.5, 31.5], [0, 31], [3.5, 31.5], [7, 33]];

/**
 * Gli abitanti del villaggio: figure semplici fatte di forme, una per missione. Hanno un punto esclamativo dorato
 * sopra la testa quando hanno qualcosa da chiedere, e si girano verso chi gioca.
 */
export class Abitanti {
  readonly gruppo = new THREE.Group();
  private readonly tutti: Abitante[] = [];
  private tempo = 0;

  constructor(quota: (x: number, z: number) => number) {
    const pelle = new THREE.MeshLambertMaterial({ color: 0xf0c8a0 });
    const oro = new THREE.MeshBasicMaterial({ color: 0xffd24a });
    MISSIONI.forEach((m, i) => {
      const [x, z] = POSTI[i % POSTI.length]!;
      const veste = new THREE.MeshLambertMaterial({ color: m.colore });
      const scuro = new THREE.MeshLambertMaterial({ color: new THREE.Color(m.colore).multiplyScalar(0.55) });
      const gruppo = new THREE.Group();
      const pezzo = (g: THREE.BufferGeometry, mat: THREE.Material, y: number, x0 = 0, z0 = 0): THREE.Mesh => {
        const mesh = new THREE.Mesh(g, mat);
        mesh.position.set(x0, y, z0);
        mesh.castShadow = true;
        gruppo.add(mesh);
        return mesh;
      };
      pezzo(new THREE.CylinderGeometry(0.2, 0.42, 1.15, 10), veste, 0.58);
      pezzo(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 10), scuro, 0.95);
      pezzo(new THREE.SphereGeometry(0.24, 12, 9), pelle, 1.38);
      pezzo(new THREE.CylinderGeometry(0.34, 0.36, 0.05, 12), scuro, 1.56);
      pezzo(new THREE.CylinderGeometry(0.16, 0.22, 0.2, 10), scuro, 1.68);
      for (const lato of [-1, 1]) pezzo(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 6), veste, 0.86, lato * 0.3).rotation.z = lato * 0.25;
      for (const lato of [-1, 1]) pezzo(new THREE.SphereGeometry(0.035, 6, 5), scuro, 1.42, lato * 0.09, 0.21);
      const segno = new THREE.Group();
      const asta = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.04, 0.34, 6), oro);
      asta.position.y = 0.3;
      const punto = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), oro);
      segno.add(asta, punto);
      segno.position.y = 2.1;
      gruppo.add(segno);
      gruppo.position.set(x, quota(x, z), z);
      this.gruppo.add(gruppo);
      this.tutti.push({ id: m.id, gruppo, segno, vicino: false });
    });
  }

  /**
   * Fa girare gli abitanti verso chi gioca e muove i segni. Restituisce la missione dell'abitante a cui ci si è
   * appena avvicinati (una volta sola per ogni avvicinamento), oppure null. `inCorso` è la missione attiva.
   */
  aggiorna(dt: number, giocatore: THREE.Vector3, inCorso: string | null): string | null {
    this.tempo += dt;
    let incontrato: string | null = null;
    for (const a of this.tutti) {
      const p = a.gruppo.position;
      const dx = giocatore.x - p.x;
      const dz = giocatore.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 14) a.gruppo.rotation.y = Math.atan2(dx, dz);
      a.segno.visible = a.id !== inCorso;
      a.segno.position.y = 2.1 + Math.sin(this.tempo * 3 + p.x) * 0.07;
      const vicino = d < (a.vicino ? 3.4 : 2.4);
      if (vicino && !a.vicino) incontrato = a.id;
      a.vicino = vicino;
    }
    return incontrato;
  }
}
