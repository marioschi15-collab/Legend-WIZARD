import * as THREE from 'three';

/** Ciò che una creatura lascia quando si sbriciola. */
export interface Premio {
  readonly esperienza: number;
  readonly essenze: number;
  readonly dove: THREE.Vector3;
}

/** Il pezzo di prato che le creature guardano: dove brucia e dove è gelato. */
export interface SuoloVivo {
  cella(x: number, z: number): number;
  readonly fuoco: Float32Array;
  readonly gelo: Float32Array;
}

interface Golem {
  readonly gruppo: THREE.Group;
  readonly arti: THREE.Object3D[];
  readonly barra: THREE.Mesh;
  readonly corpo: THREE.MeshLambertMaterial;
  vita: number;
  vitaMassima: number;
  forza: number;
  livello: number;
  attesaColpo: number;
  lampo: number;
  passo: number;
}

interface Scheggia {
  readonly mesh: THREE.Mesh;
  readonly v: THREE.Vector3;
  vita: number;
}

const PIETRA = 0x8f8a84;
const cubo = new THREE.BoxGeometry(1, 1, 1);
const VITA_SCHEGGIA = 2.6;
/** Entro quanti metri dal villaggio di partenza non nascono creature e quelle che inseguono rinunciano. */
export const RAGGIO_SICURO = 110;

/**
 * Le creature: per ora il golem di sassi, fatto di blocchi. Cammina verso chi gioca e lo colpisce da vicino;
 * il fuoco lo consuma, il gelo lo rallenta, i botti lo sbriciolano. Più si è lontani dal villaggio, più è forte.
 */
export class Creature {
  readonly gruppo = new THREE.Group();
  private readonly golem: Golem[] = [];
  private readonly schegge: Scheggia[] = [];
  private attesaNascita = 3;
  private readonly premi: Premio[] = [];
  private readonly materialeScheggia = new THREE.MeshLambertMaterial({ color: PIETRA });

  constructor(
    private readonly quota: (x: number, z: number) => number,
    private readonly suolo: SuoloVivo,
    private readonly quotaAcqua: number,
    private readonly caso: () => number = Math.random,
  ) {}

  get vive(): number {
    return this.golem.length;
  }

  /** Dove sta la creatura più vicina a un punto (o null): serve alla mappa e alle prove. */
  vicina(a: THREE.Vector3): THREE.Vector3 | null {
    let meglio: THREE.Vector3 | null = null;
    for (const g of this.golem) if (!meglio || g.gruppo.position.distanceToSquared(a) < meglio.distanceToSquared(a)) meglio = g.gruppo.position;
    return meglio;
  }

  /** Fa nascere un golem in un punto. Il livello ne decide vita, forza e taglia. */
  nasci(x: number, z: number, livello: number): void {
    // Un filo di luce propria: controsole, al tramonto, il golem restava una sagoma nera.
    const corpo = new THREE.MeshLambertMaterial({ color: new THREE.Color(PIETRA).multiplyScalar(1 - Math.min(0.5, (livello - 1) * 0.08)), emissive: 0xffffff, emissiveIntensity: 1 });
    corpo.emissive.setScalar(0.1);
    const occhi = new THREE.MeshBasicMaterial({ color: livello > 3 ? 0xff4a2a : 0xffc040 });
    const gruppo = new THREE.Group();
    const pezzo = (sx: number, sy: number, sz: number, x0: number, y0: number, z0: number, m: THREE.Material = corpo): THREE.Mesh => {
      const mesh = new THREE.Mesh(cubo, m);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x0, y0, z0);
      mesh.castShadow = true;
      return mesh;
    };
    gruppo.add(pezzo(1.0, 0.9, 0.6, 0, 1.25, 0), pezzo(0.7, 0.35, 0.5, 0, 0.72, 0), pezzo(0.56, 0.5, 0.5, 0, 1.98, 0.02));
    gruppo.add(pezzo(0.1, 0.08, 0.04, -0.13, 2.02, 0.28, occhi), pezzo(0.1, 0.08, 0.04, 0.13, 2.02, 0.28, occhi));
    gruppo.add(pezzo(0.34, 0.2, 0.3, -0.3, 1.78, -0.05), pezzo(0.3, 0.16, 0.26, 0.34, 1.76, 0.05));
    // Braccia e gambe girano attorno alla spalla e all'anca: per questo stanno dentro un perno.
    const arto = (x0: number, y0: number, lungo: number, largo: number): THREE.Object3D => {
      const perno = new THREE.Object3D();
      perno.position.set(x0, y0, 0);
      perno.add(pezzo(largo, lungo, largo, 0, -lungo / 2, 0), pezzo(largo * 1.25, largo * 1.1, largo * 1.25, 0, -lungo, 0));
      gruppo.add(perno);
      return perno;
    };
    const arti = [arto(-0.68, 1.6, 0.85, 0.3), arto(0.68, 1.6, 0.85, 0.3), arto(-0.26, 0.6, 0.5, 0.32), arto(0.26, 0.6, 0.5, 0.32)];
    const barra = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.09), new THREE.MeshBasicMaterial({ color: 0xff5a4a, depthTest: false, transparent: true }));
    barra.position.y = 2.6;
    barra.renderOrder = 5;
    gruppo.add(barra);
    gruppo.scale.setScalar(0.9 + Math.min(0.7, (livello - 1) * 0.1));
    gruppo.position.set(x, this.quota(x, z), z);
    this.gruppo.add(gruppo);
    const vita = 34 + livello * 14;
    this.golem.push({ gruppo, arti, barra, corpo, vita, vitaMassima: vita, forza: 9 + livello * 3, livello, attesaColpo: 0.6, lampo: 0, passo: this.caso() * 6 });
  }

  /** Un botto, un fulmine, una meteora: ferisce le creature attorno al punto, di più quelle al centro. */
  urto(dove: THREE.Vector3, forza: number): void {
    const raggio = 3 + forza * 5;
    for (const g of this.golem) {
      const d = g.gruppo.position.distanceTo(dove);
      if (d < raggio) this.ferisci(g, forza * 45 * (1 - (d / raggio) * 0.6));
    }
  }

  private ferisci(g: Golem, quanto: number): void {
    g.vita -= quanto;
    g.lampo = 0.18;
  }

  private sbriciola(g: Golem): void {
    const p = g.gruppo.position;
    this.premi.push({ esperienza: 18 + g.livello * 8, essenze: 2 + g.livello + Math.floor(this.caso() * 3), dove: p.clone() });
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(cubo, this.materialeScheggia);
      mesh.scale.setScalar(0.18 + this.caso() * 0.3);
      mesh.position.set(p.x + (this.caso() - 0.5) * 0.9, p.y + 0.4 + this.caso() * 1.6, p.z + (this.caso() - 0.5) * 0.9);
      mesh.castShadow = true;
      this.gruppo.add(mesh);
      this.schegge.push({ mesh, v: new THREE.Vector3((this.caso() - 0.5) * 7, 2 + this.caso() * 6, (this.caso() - 0.5) * 7), vita: VITA_SCHEGGIA });
    }
    this.gruppo.remove(g.gruppo);
    g.corpo.dispose();
  }

  /**
   * Un passo di gioco. Restituisce il danno fatto a chi gioca; i premi delle creature sbriciolate si ritirano con
   * `ritira()`.
   */
  aggiorna(dt: number, giocatore: THREE.Vector3): number {
    let danno = 0;
    const daCasa = Math.hypot(giocatore.x, giocatore.z);
    const alSicuro = daCasa < RAGGIO_SICURO;

    this.attesaNascita -= dt;
    if (this.attesaNascita <= 0) {
      this.attesaNascita = 2.5;
      if (!alSicuro && this.golem.length < 4) {
        const a = this.caso() * Math.PI * 2;
        const r = 38 + this.caso() * 24;
        const x = giocatore.x + Math.cos(a) * r;
        const z = giocatore.z + Math.sin(a) * r;
        if (Math.hypot(x, z) > RAGGIO_SICURO + 10 && this.quota(x, z) > this.quotaAcqua + 0.4) this.nasci(x, z, 1 + Math.floor(Math.hypot(x, z) / 350));
      }
    }

    for (let i = this.golem.length - 1; i >= 0; i--) {
      const g = this.golem[i]!;
      const p = g.gruppo.position;
      const dx = giocatore.x - p.x;
      const dz = giocatore.z - p.z;
      const d = Math.hypot(dx, dz);
      // Il prato sotto i piedi: il fuoco consuma, il gelo rallenta e incrina.
      const c = this.suolo.cella(p.x, p.z);
      let passo = 3.3;
      if (c >= 0) {
        if (this.suolo.fuoco[c]! > 0) this.ferisci(g, 16 * dt);
        if (this.suolo.gelo[c]! > 0.3) {
          passo *= 0.2;
          g.vita -= 4 * dt;
        }
      }
      if (g.vita <= 0) {
        this.sbriciola(g);
        this.golem.splice(i, 1);
        continue;
      }
      if (d > 130) {
        this.gruppo.remove(g.gruppo);
        g.corpo.dispose();
        this.golem.splice(i, 1);
        continue;
      }
      const insegue = d < 36 && !alSicuro;
      if (insegue) {
        g.gruppo.rotation.y = Math.atan2(dx, dz);
        if (d > 2.4) {
          p.x += (dx / d) * passo * dt;
          p.z += (dz / d) * passo * dt;
          g.passo += dt * passo * 2.2;
        }
        g.attesaColpo -= dt;
        if (d < 2.9 && Math.abs(giocatore.y - p.y) < 3.5 && g.attesaColpo <= 0) {
          g.attesaColpo = 1.3;
          danno += g.forza;
          g.passo += 1.5;
        }
      }
      p.y = this.quota(p.x, p.z);
      const dondolo = Math.sin(g.passo) * (insegue ? 0.7 : 0.08);
      g.arti[0]!.rotation.x = dondolo;
      g.arti[1]!.rotation.x = -dondolo;
      g.arti[2]!.rotation.x = -dondolo;
      g.arti[3]!.rotation.x = dondolo;
      g.lampo = Math.max(0, g.lampo - dt);
      g.corpo.emissive.setScalar(g.lampo > 0 ? 0.6 : 0.1);
      g.barra.scale.x = Math.max(0.02, g.vita / g.vitaMassima);
      g.barra.visible = g.vita < g.vitaMassima;
      g.barra.rotation.y = -g.gruppo.rotation.y + Math.atan2(dx, dz);
    }

    for (let i = this.schegge.length - 1; i >= 0; i--) {
      const s = this.schegge[i]!;
      s.vita -= dt;
      s.v.y -= 22 * dt;
      s.mesh.position.addScaledVector(s.v, dt);
      const terra = this.quota(s.mesh.position.x, s.mesh.position.z) + s.mesh.scale.x / 2;
      if (s.mesh.position.y < terra) {
        s.mesh.position.y = terra;
        s.v.set(s.v.x * 0.5, -s.v.y * 0.3, s.v.z * 0.5);
      }
      s.mesh.rotation.x += s.v.z * dt;
      s.mesh.rotation.z -= s.v.x * dt;
      if (s.vita < 0.5) s.mesh.scale.multiplyScalar(Math.max(0.01, 1 - dt * 4));
      if (s.vita <= 0) {
        this.gruppo.remove(s.mesh);
        this.schegge.splice(i, 1);
      }
    }
    return danno;
  }

  /** I premi delle creature sbriciolate dall'ultima volta. */
  ritira(): Premio[] {
    return this.premi.splice(0, this.premi.length);
  }

  /** Toglie tutte le creature (quando chi gioca rinasce o torna al villaggio). */
  svuota(): void {
    for (const g of this.golem) {
      this.gruppo.remove(g.gruppo);
      g.corpo.dispose();
    }
    this.golem.length = 0;
  }
}
