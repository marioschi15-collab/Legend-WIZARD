import * as THREE from 'three';
import { MISSIONI } from './missioni.js';

interface Abitante {
  readonly id: string;
  readonly gruppo: THREE.Group;
  readonly segno: THREE.Object3D;
  readonly lanterna: THREE.Object3D;
  /** Il suo posto, e il punto lì attorno verso cui sta passeggiando. */
  readonly casa: THREE.Vector2;
  readonly meta: THREE.Vector2;
  sosta: number;
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

  constructor(private readonly quota: (x: number, z: number) => number) {
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
      // Di notte ognuno tiene in mano una lanterna accesa.
      const lanterna = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffc060 }));
      lanterna.position.set(0.42, 0.75, 0.12);
      lanterna.visible = false;
      gruppo.add(lanterna);
      gruppo.position.set(x, quota(x, z), z);
      this.gruppo.add(gruppo);
      this.tutti.push({ id: m.id, gruppo, segno, lanterna, casa: new THREE.Vector2(x, z), meta: new THREE.Vector2(x, z), sosta: 1 + i, vicino: false });
    });
  }

  /**
   * Fa girare gli abitanti verso chi gioca e muove i segni. Restituisce la missione dell'abitante a cui ci si è
   * appena avvicinati (una volta sola per ogni avvicinamento), oppure null. `inCorso` è la missione attiva.
   */
  aggiorna(dt: number, giocatore: THREE.Vector3, inCorso: string | null, notte = false): string | null {
    this.tempo += dt;
    let incontrato: string | null = null;
    for (const a of this.tutti) {
      const p = a.gruppo.position;
      const dx = giocatore.x - p.x;
      const dz = giocatore.z - p.z;
      const d = Math.hypot(dx, dz);
      a.lanterna.visible = notte;
      if (d < 6) {
        // Quando chi gioca è vicino si fermano e lo guardano.
        a.gruppo.rotation.y = Math.atan2(dx, dz);
      } else {
        // Altrimenti passeggiano attorno al loro posto: qualche passo, una sosta, qualche passo.
        a.sosta -= dt;
        const mx = a.meta.x - p.x;
        const mz = a.meta.y - p.z;
        const md = Math.hypot(mx, mz);
        if (md > 0.15) {
          a.gruppo.rotation.y = Math.atan2(mx, mz);
          p.x += (mx / md) * 0.9 * dt;
          p.z += (mz / md) * 0.9 * dt;
          p.y = this.quota(p.x, p.z) + Math.abs(Math.sin(this.tempo * 7 + a.casa.x)) * 0.04;
        } else if (a.sosta <= 0) {
          const ang = Math.random() * Math.PI * 2;
          a.meta.set(a.casa.x + Math.cos(ang) * 1.4, a.casa.y + Math.sin(ang) * 1.4);
          a.sosta = 3 + Math.random() * 5;
        }
      }
      a.segno.visible = a.id !== inCorso;
      a.segno.position.y = 2.1 + Math.sin(this.tempo * 3 + p.x) * 0.07;
      const vicino = d < (a.vicino ? 4.2 : 3.1);
      if (vicino && !a.vicino) incontrato = a.id;
      a.vicino = vicino;
    }
    return incontrato;
  }
}
