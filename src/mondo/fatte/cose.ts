import * as THREE from 'three';
import type { Gruppo, Pezzi } from '../../fisica/pezzi.js';
import { BLOCCO_GHIACCIO, INTONACO, LEGNO, PAGLIA, PIETRA, type Mattone } from '../costruzioni.js';
import type { ScenaFatta } from './elenco.js';
import type { TipoCosa } from './tipi.js';

/** Di che cosa è fatto un oggetto: come pesa e brucia, quanto regge a un colpo, in che pezzi si sfascia. */
const MATERIE: Readonly<Record<string, { materiale: number; regge: number; pezzo: number; colore: number }>> = {
  legno: { materiale: LEGNO, regge: 9, pezzo: LEGNO, colore: 0x6b4a2c },
  pietra: { materiale: PIETRA, regge: 15, pezzo: PIETRA, colore: 0x8b867b },
  paglia: { materiale: PAGLIA, regge: 5, pezzo: PAGLIA, colore: 0xb89a5a },
  zucca: { materiale: PAGLIA, regge: 4, pezzo: PAGLIA, colore: 0xd0621a },
  neve: { materiale: BLOCCO_GHIACCIO, regge: 3, pezzo: INTONACO, colore: 0xe8eef5 },
};
const BIANCO = new THREE.Color(1, 1, 1);
/** Quanti mucchi di rottami restano in giro: i più vecchi lasciano il posto. */
const ROTTAMI = 40;

interface Cosa {
  readonly scena: number;
  readonly tipo: string;
  readonly dati: TipoCosa;
  /** Il pezzo che la muove (nascosto: al suo posto si vede la forma vera). */
  readonly mattone: Mattone;
  /** Il suo posto tra le copie della stessa forma. */
  readonly copia: number;
  readonly matrice: THREE.Matrix4;
  readonly tinta: THREE.Color;
  /** Dove sta adesso il suo pezzo. */
  x: number;
  y: number;
  z: number;
  gruppo: Gruppo | null;
  rottami: Gruppo | null;
  rotta: boolean;
}

interface Zona {
  readonly scena: ScenaFatta;
  readonly cose: Cosa[];
  /** Per ogni forma (barile, cassa...), le sue parti disegnate: una per materia. */
  readonly parti: Map<string, THREE.InstancedMesh[]>;
  viva: boolean;
}

/**
 * Gli oggetti sciolti delle zone fatte a mano: barili, casse, sacchi, panche, lapidi, zucche, bersagli... Non fanno
 * parte della scena scolpita: ognuno è un pezzo vero (come i blocchi delle case) con la sua forma disegnata sopra.
 * Così si spingono, si sollevano, si impilano, bruciano, gelano e tornano a posto con il Rammendo come tutto il resto;
 * e un colpo abbastanza forte li sfascia in assi, schegge o pezzi di neve.
 */
export class Cose {
  readonly gruppo = new THREE.Group();
  private readonly zone: Zona[];
  private readonly perMattone = new Map<Mattone, Cosa>();
  private readonly rottami: Cosa[] = [];
  private readonly sporche = new Set<THREE.InstancedMesh>();
  /** Chiamato quando un oggetto si sfascia: per il rumore e la polvere. */
  onSfascio: (x: number, y: number, z: number, materia: string) => void = () => undefined;

  private readonly p = new THREE.Vector3();
  private readonly q = new THREE.Quaternion();
  private readonly s = new THREE.Vector3();
  private readonly m = new THREE.Matrix4();
  private readonly sposta = new THREE.Matrix4();

  constructor(
    private readonly pezzi: Pezzi,
    scene: readonly ScenaFatta[],
    private readonly materia: (nome: string, colore: THREE.Color) => THREE.Material,
  ) {
    this.zone = scene.map((scena, n) => {
      const tipi = scena.dati.tipi ?? {};
      const conta = new Map<string, number>();
      const cose: Cosa[] = [];
      for (const c of scena.dati.cose ?? []) {
        const dati = tipi[c.t];
        const fatta = dati && MATERIE[dati.mat];
        if (!dati || !fatta) continue;
        const copia = conta.get(c.t) ?? 0;
        conta.set(c.t, copia + 1);
        const mattone: Mattone = {
          x: c.p[0], y: c.p[1], z: c.p[2], q: new THREE.Quaternion(c.q[0], c.q[1], c.q[2], c.q[3]),
          sx: dati.m[0], sy: dati.m[1], sz: dati.m[2], materiale: fatta.materiale, colore: BIANCO, quota: c.p[1] - dati.m[1] / 2, nascosto: true,
        };
        const cosa: Cosa = { scena: n, tipo: c.t, dati, mattone, copia, matrice: new THREE.Matrix4(), tinta: new THREE.Color(1, 1, 1), x: c.p[0], y: c.p[1], z: c.p[2], gruppo: null, rottami: null, rotta: false };
        cose.push(cosa);
      }
      return { scena, cose, parti: new Map(), viva: false };
    });
    pezzi.onPosa = (b, x, y, z, q, scala) => {
      const cosa = this.perMattone.get(b);
      if (cosa) this.posa(cosa, x, y, z, q, scala);
    };
    pezzi.onTinta = (b, colore) => {
      const cosa = this.perMattone.get(b);
      if (!cosa) return;
      cosa.tinta.copy(colore);
      this.tingi(cosa);
    };
    for (const z of this.zone) {
      for (const c of z.cose) {
        this.perMattone.set(c.mattone, c);
        this.posa(c, c.mattone.x, c.mattone.y, c.mattone.z, c.mattone.q, 1);
      }
    }
  }

  /** Quanti oggetti sciolti ha una scena (serve alle prove). */
  quante(scena: number): number {
    return this.zone[scena]?.cose.length ?? 0;
  }

  /** Lo stato di un oggetto (serve alle prove): dov'è adesso, se è sfasciato, se ha preso vita. */
  stato(scena: number, i: number): { x: number; y: number; z: number; rotta: boolean; viva: boolean; rottami: number } | null {
    const c = this.zone[scena]?.cose[i];
    if (!c) return null;
    return { x: c.x, y: c.y, z: c.z, rotta: c.rotta, viva: c.gruppo !== null, rottami: c.rottami ? c.rottami.a - c.rottami.da : 0 };
  }

  /** Il colore di un oggetto (annerito dal fuoco, azzurrato dal gelo) sulle sue parti disegnate. */
  private tingi(c: Cosa): void {
    for (const parte of this.zone[c.scena]?.parti.get(c.tipo) ?? []) {
      parte.setColorAt(c.copia, c.tinta);
      if (parte.instanceColor) parte.instanceColor.needsUpdate = true;
    }
  }

  /** Dove disegnare la forma di un oggetto, dato dove sta il suo pezzo. */
  private posa(c: Cosa, x: number, y: number, z: number, q: { x: number; y: number; z: number; w: number }, scala: number): void {
    const k = c.rotta ? 0 : scala;
    c.x = x;
    c.y = y;
    c.z = z;
    this.m.compose(this.p.set(x, y, z), this.q.set(q.x, q.y, q.z, q.w), this.s.set(k, k, k));
    // La forma ha l'origine ai suoi piedi, il pezzo nel suo centro: si sposta di quel tanto.
    c.matrice.copy(this.m).multiply(this.sposta.makeTranslation(-c.dati.c[0], -c.dati.c[1], -c.dati.c[2]));
    for (const parte of this.zone[c.scena]?.parti.get(c.tipo) ?? []) {
      parte.setMatrixAt(c.copia, c.matrice);
      this.sporche.add(parte);
    }
  }

  /**
   * Le forme di una scena sono arrivate: quelle degli oggetti sciolti (si chiamano `cosa__barile__legno`) escono dalla
   * scena scolpita e diventano tante copie, una per oggetto.
   */
  forme(scena: number, radice: THREE.Object3D): void {
    const zona = this.zone[scena];
    if (!zona) return;
    const prototipi: THREE.Mesh[] = [];
    radice.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o.name.startsWith('cosa__')) prototipi.push(o as THREE.Mesh);
    });
    for (const mesh of prototipi) {
      mesh.removeFromParent();
      const tipo = mesh.name.split('__')[1] ?? '';
      const quante = zona.cose.filter((c) => c.tipo === tipo);
      if (quante.length === 0) continue;
      const vecchia = mesh.material as THREE.MeshStandardMaterial;
      const parte = new THREE.InstancedMesh(mesh.geometry, this.materia(vecchia.name, vecchia.color), quante.length);
      parte.castShadow = vecchia.name !== 'luce';
      parte.receiveShadow = true;
      // Gli oggetti si muovono: la palla che li contiene tutti non vale più, quindi si disegnano sempre.
      parte.frustumCulled = false;
      for (const c of quante) {
        parte.setMatrixAt(c.copia, c.matrice);
        parte.setColorAt(c.copia, c.tinta);
      }
      parte.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.gruppo.add(parte);
      const elenco = zona.parti.get(tipo) ?? [];
      elenco.push(parte);
      zona.parti.set(tipo, elenco);
    }
  }

  /** Le scene vicine a chi gioca danno ai loro oggetti peso e attrito; quelle lontane li rimettono a posto e li tolgono. */
  avvicina(x: number, z: number): void {
    for (const zona of this.zone) {
      const t = zona.scena.terra;
      const lontano = Math.hypot(x - t.centro.x, z - t.centro.z) - t.raggio;
      if (!zona.viva && lontano < 150) {
        zona.viva = true;
        for (const c of zona.cose) if (!c.rotta) this.metti(c);
      } else if (zona.viva && lontano > 210) {
        zona.viva = false;
        for (const c of zona.cose) {
          this.leva(c);
          c.rotta = false;
          c.tinta.copy(BIANCO);
          this.tingi(c);
          this.posa(c, c.mattone.x, c.mattone.y, c.mattone.z, c.mattone.q, 1);
        }
      }
      for (const parti of zona.parti.values()) for (const parte of parti) parte.visible = lontano < 350;
    }
    for (const parte of this.sporche) parte.instanceMatrix.needsUpdate = true;
    this.sporche.clear();
  }

  private metti(c: Cosa): void {
    c.gruppo = this.pezzi.aggiungi([c.mattone], c.mattone.x, c.mattone.z, 1.5);
  }

  private leva(c: Cosa): void {
    if (c.gruppo) this.pezzi.togli(c.gruppo);
    if (c.rottami) {
      this.pezzi.togli(c.rottami);
      const k = this.rottami.indexOf(c);
      if (k >= 0) this.rottami.splice(k, 1);
    }
    c.gruppo = c.rottami = null;
  }

  /**
   * Uno scoppio: gli oggetti abbastanza vicini al centro da non reggere il colpo si sfasciano. Al loro posto restano
   * assi, schegge o pezzi di neve: pezzi veri, che la stessa spinta scaglia via (chi chiama la ripete subito dopo).
   * Restituisce quanti se ne sono rotti.
   */
  spinta(x: number, y: number, z: number, raggio: number, forza: number): number {
    if (forza <= 0) return 0;
    let rotti = 0;
    for (const zona of this.zone) {
      if (!zona.viva) continue;
      for (const c of zona.cose) {
        if (c.rotta || !c.gruppo) continue;
        const i = c.gruppo.da * 3;
        const px = this.pezzi.pos[i]!;
        const py = this.pezzi.pos[i + 1]!;
        const pz = this.pezzi.pos[i + 2]!;
        const d = Math.hypot(px - x, py - y, pz - z);
        if (d > raggio || (1 - d / raggio) * forza < MATERIE[c.dati.mat]!.regge) continue;
        this.sfascia(c, px, py, pz);
        rotti++;
      }
    }
    return rotti;
  }

  private sfascia(c: Cosa, x: number, y: number, z: number): void {
    const fatta = MATERIE[c.dati.mat]!;
    const [sx, sy, sz] = c.dati.m;
    this.pezzi.togli(c.gruppo!);
    c.gruppo = null;
    c.rotta = true;
    this.posa(c, x, y, z, c.mattone.q, 1);
    // I rottami: di legno sono assi, di pietra schegge tozze, di neve e di zucca pezzi a caso.
    const quanti = Math.min(8, Math.max(3, Math.round(sx * sy * sz * 9)));
    const colore = new THREE.Color(fatta.colore);
    const mattoni: Mattone[] = [];
    for (let k = 0; k < quanti; k++) {
      const asse = fatta.pezzo === LEGNO;
      const lato = Math.max(sx, sz);
      mattoni.push({
        x: x + (Math.random() - 0.5) * sx * 0.6, y: y - sy / 2 + (k + 0.5) * (sy / quanti), z: z + (Math.random() - 0.5) * sz * 0.6,
        q: new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.random() * 0.6, Math.random() * 6.28, Math.random() * 0.6)),
        sx: asse ? Math.min(1.4, lato * (0.7 + Math.random() * 0.3)) : lato * (0.3 + Math.random() * 0.25),
        sy: asse ? 0.05 + Math.random() * 0.04 : Math.max(0.12, (sy / quanti) * 0.8),
        sz: asse ? 0.12 + Math.random() * 0.1 : lato * (0.3 + Math.random() * 0.25),
        materiale: fatta.pezzo, colore: colore.clone().multiplyScalar(0.8 + Math.random() * 0.35), quota: c.mattone.quota,
      });
    }
    c.rottami = this.pezzi.aggiungi(mattoni, x, z, 2);
    if (c.rottami) {
      this.rottami.push(c);
      while (this.rottami.length > ROTTAMI) {
        const vecchia = this.rottami.shift()!;
        if (vecchia.rottami) this.pezzi.togli(vecchia.rottami);
        vecchia.rottami = null;
      }
    }
    this.onSfascio(x, y, z, c.dati.mat);
  }

  /** Il Rammendo rimette interi gli oggetti sfasciati che stavano lì attorno (quelli solo spostati li riporta già lui). */
  rammenda(x: number, z: number, raggio: number): number {
    let fatti = 0;
    for (const zona of this.zone) {
      if (!zona.viva) continue;
      for (const c of zona.cose) {
        if (!c.rotta || Math.hypot(c.mattone.x - x, c.mattone.z - z) > raggio) continue;
        this.ripara(c);
        fatti++;
      }
    }
    return fatti;
  }

  /** Rimette ogni oggetto sfasciato al suo posto, come nuovo (quelli solo spostati li rimette il «Ricostruisci» dei pezzi). */
  ricostruisci(): void {
    for (const zona of this.zone) if (zona.viva) for (const c of zona.cose) if (c.rotta) this.ripara(c);
  }

  private ripara(c: Cosa): void {
    this.leva(c);
    c.rotta = false;
    c.tinta.copy(BIANCO);
    this.tingi(c);
    this.metti(c);
  }
}
