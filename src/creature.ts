import * as THREE from 'three';
import type { StatoCreatura } from './gioco.js';

/** Ciò che una creatura lascia quando si sbriciola. */
export interface Premio {
  readonly specie: Specie;
  /** Il numero della creatura, e se era il guardiano di un luogo. */
  readonly numero: number;
  readonly guardiano: boolean;
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

/** Una razza di creature: aspetto, tempra, e come reagisce a fuoco, gelo e botti (0 = immune, più di 1 = punto debole). */
export interface Specie {
  readonly nome: string;
  readonly colore: number;
  readonly occhi: number;
  readonly forma: 'golem' | 'coda' | 'lume';
  readonly taglia: number;
  readonly vita: number;
  readonly forza: number;
  readonly passo: number;
  readonly fuoco: number;
  readonly gelo: number;
  readonly botto: number;
  /** Che cosa dire a chi gioca la prima volta che la incontra. */
  readonly indizio: string;
}

export const SPECIE: Readonly<Record<string, Specie>> = {
  golem: { nome: 'Golem di sassi', colore: 0x8f8a84, occhi: 0xffc040, forma: 'golem', taglia: 1, vita: 1, forza: 1, passo: 3.3, fuoco: 1, gelo: 1, botto: 1, indizio: 'Fuoco, gelo e botti: tutto gli fa male.' },
  sentinella: { nome: 'Sentinella di ghiaccio', colore: 0xa8dcf4, occhi: 0x2a6aff, forma: 'golem', taglia: 1.1, vita: 1.1, forza: 1.1, passo: 3.0, fuoco: 2.6, gelo: 0, botto: 0.8, indizio: 'Il gelo non le fa nulla. Il fuoco la scioglie.' },
  scorpione: { nome: 'Scorpione di sabbia', colore: 0xd8a85a, occhi: 0xff3a2a, forma: 'coda', taglia: 0.9, vita: 0.75, forza: 0.9, passo: 5.4, fuoco: 0.2, gelo: 2.8, botto: 1.3, indizio: 'È svelto e il fuoco quasi non lo sente. Il gelo lo ferma.' },
  lume: { nome: 'Lume di palude', colore: 0x9affd0, occhi: 0xffffff, forma: 'lume', taglia: 0.9, vita: 0.7, forza: 0.8, passo: 3.8, fuoco: 0, gelo: 3, botto: 0.3, indizio: 'I botti gli passano attraverso e il fuoco non lo tocca. Il gelo lo spegne.' },
  diavoletto: { nome: 'Diavoletto di lava', colore: 0x5a2a20, occhi: 0xffa020, forma: 'golem', taglia: 0.7, vita: 0.8, forza: 1.2, passo: 5.0, fuoco: 0, gelo: 3, botto: 1, indizio: 'Nel fuoco ci sguazza. Il gelo lo spacca.' },
};

/** Quale razza vive in ogni terra, nello stesso ordine delle terre. */
const DI_CASA = ['golem', 'scorpione', 'sentinella', 'lume', 'diavoletto', 'golem', 'golem', 'lume', 'scorpione', 'golem', 'sentinella', 'scorpione', 'scorpione', 'lume', 'sentinella'];

interface Golem {
  readonly specie: Specie;
  readonly guardiano: boolean;
  readonly gruppo: THREE.Group;
  readonly arti: THREE.Object3D[];
  readonly barra: THREE.Mesh;
  readonly corpo: THREE.MeshLambertMaterial;
  vita: number;
  vitaMassima: number;
  forza: number;
  livello: number;
  attesaColpo: number;
  /** Il suo numero, per chi vuole sapere se c'è ancora. */
  numero: number;
  /** Vero per i golem delle missioni: restano dove sono finché chi gioca non arriva, anche se è lontano. */
  fisso: boolean;
  /** Secondi che restano a ogni stato dato dalla magia. */
  stati: Record<StatoCreatura, number>;
  /** Se è un golem evocato da chi gioca: quanti secondi gli restano (0 = è una creatura ostile). */
  amico: number;
  /** Vero per sempre se è nato da un'evocazione. */
  evocato: boolean;
  taglia: number;
  /** Da che lato sta girando attorno a un ostacolo, e da quanti secondi non riesce a passare. */
  lato: number;
  bloccato: number;
  /** La deviazione che sta tenendo, e per quanti secondi ancora. */
  deviaX: number;
  deviaZ: number;
  deviaPer: number;
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
 * Le creature, fatte di blocchi: camminano verso chi gioca e lo colpiscono da vicino. Ogni terra ha la sua razza,
 * con un punto debole e un'immunità (vedi SPECIE). Più si è lontani dal villaggio, più sono forti. I luoghi hanno
 * un guardiano, più grosso e con la corona.
 */
export class Creature {
  readonly gruppo = new THREE.Group();
  private readonly golem: Golem[] = [];
  private readonly schegge: Scheggia[] = [];
  private attesaNascita = 3;
  /** Di notte le creature sono di più e colpiscono più forte. */
  notte = false;
  private contatore = 0;
  private readonly premi: Premio[] = [];
  private readonly materialeScheggia = new THREE.MeshLambertMaterial({ color: PIETRA });

  constructor(
    private readonly quota: (x: number, z: number) => number,
    private readonly suolo: SuoloVivo,
    private readonly quotaAcqua: number,
    private readonly caso: () => number = Math.random,
    /** Il numero della terra in un punto: decide quale razza nasce lì. */
    private readonly terra: (x: number, z: number) => number = () => 0,
  ) {}

  /**
   * Dice se tra due punti la strada è sgombra (niente muri in mezzo). La dà il gioco vero, che conosce i muri;
   * senza, le creature camminano dritte.
   */
  libero: (x: number, y: number, z: number, dx: number, dz: number, lungo: number) => boolean = () => true;

  /**
   * Un passo in una direzione. Se davanti c'è un muro la creatura prova a girarci attorno (prima di poco, poi di
   * più, da un lato e dall'altro); i lumi passano attraverso tutto. Chi resta bloccato a lungo scavalca.
   */
  private muovi(g: Golem, dx: number, dz: number, passo: number, dt: number): void {
    const p = g.gruppo.position;
    if (g.specie.forma !== 'lume' && g.bloccato < 3) {
      // Una volta scelta una deviazione la tiene per un po': altrimenti, girato lo spigolo, tornerebbe subito a
      // puntare dritto e ci resterebbe incollata.
      if (g.deviaPer > 0 && this.libero(p.x, p.y + 1, p.z, g.deviaX, g.deviaZ, passo + 1.1)) {
        g.deviaPer -= dt;
        p.x += g.deviaX * passo;
        p.z += g.deviaZ * passo;
        return;
      }
      g.deviaPer = 0;
      // Se l'ultima volta ha dovuto girare, continua da quel lato: altrimenti dondolerebbe davanti al muro.
      for (const giro of [0, 0.8 * g.lato, 1.57 * g.lato, 2.2 * g.lato, -0.8 * g.lato, -1.57 * g.lato, -2.2 * g.lato]) {
        const cs = Math.cos(giro);
        const sn = Math.sin(giro);
        const vx = dx * cs - dz * sn;
        const vz = dx * sn + dz * cs;
        if (!this.libero(p.x, p.y + 1, p.z, vx, vz, passo + 1.1)) continue;
        if (giro !== 0) {
          g.lato = Math.sign(giro);
          g.deviaX = vx;
          g.deviaZ = vz;
          g.deviaPer = 0.7;
        }
        p.x += vx * passo;
        p.z += vz * passo;
        g.bloccato = Math.max(0, g.bloccato - dt);
        return;
      }
      g.bloccato += dt;
      return;
    }
    p.x += dx * passo;
    p.z += dz * passo;
    g.bloccato = Math.max(0, g.bloccato - dt * 0.5);
  }

  get vive(): number {
    return this.golem.length;
  }

  /** Dove sta la creatura più vicina a un punto (o null): serve alla mappa e alle prove. */
  vicina(a: THREE.Vector3): THREE.Vector3 | null {
    let meglio: THREE.Vector3 | null = null;
    for (const g of this.golem) if (!meglio || g.gruppo.position.distanceToSquared(a) < meglio.distanceToSquared(a)) meglio = g.gruppo.position;
    return meglio;
  }

  /** La razza della creatura più vicina entro un certo raggio (o null): serve a presentarla a chi gioca. */
  razzaVicina(a: THREE.Vector3, raggio: number): Specie | null {
    let meglio: Golem | null = null;
    for (const g of this.golem) {
      const d = g.gruppo.position.distanceToSquared(a);
      if (d < raggio * raggio && (!meglio || d < meglio.gruppo.position.distanceToSquared(a))) meglio = g;
    }
    return meglio ? meglio.specie : null;
  }

  /** Fa nascere un golem in un punto. Il livello ne decide vita, forza e taglia. */
  nasci(x: number, z: number, livello: number, fisso = false, razza?: string, guardiano = false): number {
    const specie = SPECIE[razza ?? DI_CASA[this.terra(x, z)] ?? 'golem'] ?? SPECIE.golem!;
    // Un filo di luce propria: controsole, al tramonto, il golem restava una sagoma nera.
    const corpo = new THREE.MeshLambertMaterial({ color: new THREE.Color(specie.colore).multiplyScalar(1 - Math.min(0.4, (livello - 1) * 0.06)), emissive: 0xffffff, emissiveIntensity: 1 });
    corpo.emissive.setScalar(0.1);
    const occhi = new THREE.MeshBasicMaterial({ color: specie.occhi });
    const gruppo = new THREE.Group();
    const pezzo = (sx: number, sy: number, sz: number, x0: number, y0: number, z0: number, m: THREE.Material = corpo): THREE.Mesh => {
      const mesh = new THREE.Mesh(cubo, m);
      mesh.scale.set(sx, sy, sz);
      mesh.position.set(x0, y0, z0);
      mesh.castShadow = true;
      return mesh;
    };
    let arti: THREE.Object3D[];
    // Braccia e gambe (o i lumini che girano) stanno dentro un perno, così ruotano attorno alla spalla e all'anca.
    const arto = (x0: number, y0: number, lungo: number, largo: number): THREE.Object3D => {
      const perno = new THREE.Object3D();
      perno.position.set(x0, y0, 0);
      perno.add(pezzo(largo, lungo, largo, 0, -lungo / 2, 0), pezzo(largo * 1.25, largo * 1.1, largo * 1.25, 0, -lungo, 0));
      gruppo.add(perno);
      return perno;
    };
    if (specie.forma === 'lume') {
      // Un cuore di luce sospeso, con quattro lumini che gli girano attorno.
      gruppo.add(pezzo(0.7, 0.7, 0.7, 0, 1.5, 0, occhi), pezzo(1.0, 1.0, 1.0, 0, 1.5, 0, new THREE.MeshBasicMaterial({ color: specie.colore, transparent: true, opacity: 0.35, depthWrite: false })));
      arti = [0, 1, 2, 3].map((i) => {
        const perno = new THREE.Object3D();
        perno.position.set(0, 1.5, 0);
        perno.rotation.y = i * 1.57;
        perno.add(pezzo(0.2, 0.2, 0.2, 0.85, (i % 2) * 0.3 - 0.15, 0, corpo));
        gruppo.add(perno);
        return perno;
      });
    } else if (specie.forma === 'coda') {
      // Basso e largo, con le chele davanti e la coda ad arco sopra la schiena.
      gruppo.add(pezzo(1.2, 0.5, 1.5, 0, 0.6, 0), pezzo(0.7, 0.4, 0.5, 0, 0.62, 0.95));
      gruppo.add(pezzo(0.1, 0.08, 0.04, -0.16, 0.7, 1.21, occhi), pezzo(0.1, 0.08, 0.04, 0.16, 0.7, 1.21, occhi));
      gruppo.add(pezzo(0.4, 0.4, 0.4, 0, 1.0, -0.8), pezzo(0.34, 0.34, 0.34, 0, 1.45, -0.95), pezzo(0.3, 0.3, 0.3, 0, 1.85, -0.75), pezzo(0.18, 0.18, 0.4, 0, 1.95, -0.4, occhi));
      arti = [arto(-0.75, 0.75, 0.6, 0.28), arto(0.75, 0.75, 0.6, 0.28), arto(-0.55, 0.5, 0.4, 0.22), arto(0.55, 0.5, 0.4, 0.22)];
      arti[0]!.position.z = arti[1]!.position.z = 0.7;
      arti[2]!.position.z = arti[3]!.position.z = -0.4;
    } else {
      gruppo.add(pezzo(1.0, 0.9, 0.6, 0, 1.25, 0), pezzo(0.7, 0.35, 0.5, 0, 0.72, 0), pezzo(0.56, 0.5, 0.5, 0, 1.98, 0.02));
      gruppo.add(pezzo(0.1, 0.08, 0.04, -0.13, 2.02, 0.28, occhi), pezzo(0.1, 0.08, 0.04, 0.13, 2.02, 0.28, occhi));
      gruppo.add(pezzo(0.34, 0.2, 0.3, -0.3, 1.78, -0.05), pezzo(0.3, 0.16, 0.26, 0.34, 1.76, 0.05));
      arti = [arto(-0.68, 1.6, 0.85, 0.3), arto(0.68, 1.6, 0.85, 0.3), arto(-0.26, 0.6, 0.5, 0.32), arto(0.26, 0.6, 0.5, 0.32)];
    }
    // Il guardiano di un luogo porta una corona d'oro.
    if (guardiano) for (let i = 0; i < 5; i++) gruppo.add(pezzo(0.12, 0.3, 0.12, Math.cos(i * 1.257) * 0.3, specie.forma === 'coda' ? 1.1 : 2.4, Math.sin(i * 1.257) * 0.3 + (specie.forma === 'coda' ? 0.95 : 0), new THREE.MeshBasicMaterial({ color: 0xffd24a })));
    const barra = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.09), new THREE.MeshBasicMaterial({ color: 0xff5a4a, depthTest: false, transparent: true }));
    barra.position.y = 2.6;
    barra.renderOrder = 5;
    gruppo.add(barra);
    gruppo.scale.setScalar((0.9 + Math.min(0.7, (livello - 1) * 0.1)) * specie.taglia * (guardiano ? 1.7 : 1));
    gruppo.position.set(x, this.quota(x, z), z);
    this.gruppo.add(gruppo);
    const vita = (34 + livello * 14) * specie.vita * (guardiano ? 3 : 1);
    this.golem.push({ specie, guardiano, gruppo, arti, barra, corpo, vita, vitaMassima: vita, forza: (9 + livello * 3) * specie.forza * (guardiano ? 1.4 : 1), livello, attesaColpo: 0.6, numero: ++this.contatore, fisso, stati: { sonno: 0, pecora: 0, paura: 0, lento: 0, veleno: 0, piccolo: 0 }, amico: 0, evocato: false, taglia: gruppo.scale.x, lato: this.caso() < 0.5 ? 1 : -1, bloccato: 0, deviaX: 0, deviaZ: 0, deviaPer: 0, lampo: 0, passo: this.caso() * 6 });
    return this.contatore;
  }

  /** Vero finché il golem con quel numero non è stato sbriciolato. */
  vivo(numero: number): boolean {
    return this.golem.some((g) => g.numero === numero);
  }

  /** Dà uno stato (sonno, paura, veleno…) alle creature ostili in un cerchio; dice quante ne ha prese. */
  stato(dove: THREE.Vector3, raggio: number, che: StatoCreatura, secondi: number): number {
    let prese = 0;
    for (const g of this.golem) {
      if (g.amico > 0 || g.gruppo.position.distanceTo(dove) > raggio) continue;
      // I guardiani sono troppo grossi per diventare pecore o addormentarsi a lungo.
      g.stati[che] = Math.max(g.stati[che], g.guardiano && (che === 'pecora' || che === 'sonno') ? secondi * 0.25 : secondi);
      prese++;
    }
    return prese;
  }

  /** Ferisce le creature ostili in un cerchio senza badare alle immunità; restituisce il danno fatto in tutto. */
  ferisciIntorno(dove: THREE.Vector3, raggio: number, danno: number): number {
    let fatto = 0;
    for (const g of this.golem) {
      if (g.amico > 0 || g.gruppo.position.distanceTo(dove) > raggio) continue;
      const q = Math.min(danno, Math.max(0, g.vita));
      this.ferisci(g, danno);
      fatto += q;
    }
    return fatto;
  }

  /** Un golem amico: per un po' combatte al fianco di chi gioca, poi si sbriciola. */
  evoca(x: number, z: number, secondi: number): void {
    // Uno alla volta: evocarne un altro manda via il primo.
    for (const g of this.golem) if (g.amico > 0) g.amico = 0.01;
    this.nasci(x, z, 2, true, 'golem');
    const g = this.golem[this.golem.length - 1]!;
    g.amico = secondi;
    g.evocato = true;
    g.corpo.color.setHex(0x6ad0c0);
  }

  /** Dove stanno le creature ostili entro un raggio. */
  bersagli(dove: THREE.Vector3, raggio: number): THREE.Vector3[] {
    return this.golem.filter((g) => g.amico <= 0 && g.gruppo.position.distanceTo(dove) < raggio).map((g) => g.gruppo.position);
  }

  /** Un botto, un fulmine, una meteora: ferisce le creature attorno al punto, di più quelle al centro. */
  urto(dove: THREE.Vector3, forza: number): void {
    const raggio = 3 + forza * 5;
    for (const g of this.golem) {
      if (g.amico > 0) continue;
      const d = g.gruppo.position.distanceTo(dove);
      if (d < raggio) this.ferisci(g, forza * 45 * (1 - (d / raggio) * 0.6) * g.specie.botto);
    }
  }

  private ferisci(g: Golem, quanto: number): void {
    g.vita -= quanto;
    // Una ferita sveglia chi dorme.
    if (quanto > 1) g.stati.sonno = 0;
    g.lampo = 0.18;
  }

  private sbriciola(g: Golem): void {
    const p = g.gruppo.position;
    const k = g.guardiano ? 5 : 1;
    // Un golem evocato non lascia premi.
    if (g.amico <= 0 && !g.evocato) this.premi.push({ specie: g.specie, numero: g.numero, guardiano: g.guardiano, esperienza: (18 + g.livello * 8) * k, essenze: (2 + g.livello + Math.floor(this.caso() * 3)) * k, dove: p.clone() });
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
  aggiorna(dt: number, giocatore: THREE.Vector3, nascosto = false): number {
    let danno = 0;
    const daCasa = Math.hypot(giocatore.x, giocatore.z);
    const alSicuro = daCasa < RAGGIO_SICURO;

    this.attesaNascita -= dt;
    if (this.attesaNascita <= 0) {
      this.attesaNascita = 2.5;
      if (!alSicuro && this.golem.filter((g) => !g.fisso).length < (this.notte ? 6 : 4)) {
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
      let passo = g.specie.passo;
      if (c >= 0) {
        if (this.suolo.fuoco[c]! > 0 && g.specie.fuoco > 0) this.ferisci(g, 16 * dt * g.specie.fuoco);
        if (this.suolo.gelo[c]! > 0.3 && g.specie.gelo > 0) {
          passo *= 0.2;
          g.vita -= 4 * dt * g.specie.gelo;
        }
      }
      if (g.vita <= 0) {
        this.sbriciola(g);
        this.golem.splice(i, 1);
        continue;
      }
      if (d > 130 && !g.fisso) {
        this.gruppo.remove(g.gruppo);
        g.corpo.dispose();
        this.golem.splice(i, 1);
        continue;
      }
      // Gli stati dati dalla magia: scadono da soli.
      const st = g.stati;
      for (const k of Object.keys(st) as StatoCreatura[]) st[k] = Math.max(0, st[k] - dt);
      if (st.veleno > 0) g.vita -= 8 * dt;
      if (st.lento > 0) passo *= 0.3;
      const mite = st.pecora > 0;
      g.gruppo.scale.setScalar(g.taglia * (mite ? 0.45 : st.piccolo > 0 ? 0.5 : 1));
      let insegue = false;
      if (g.amico > 0) {
        // Il golem amico: va addosso alla creatura ostile più vicina; se non ce ne sono, segue chi gioca.
        g.amico -= dt;
        if (g.amico <= 0) g.vita = 0;
        let preda: Golem | null = null;
        for (const altro of this.golem) {
          if (altro.amico > 0 || altro.gruppo.position.distanceTo(p) > 32) continue;
          if (!preda || altro.gruppo.position.distanceToSquared(p) < preda.gruppo.position.distanceToSquared(p)) preda = altro;
        }
        const mx = (preda ? preda.gruppo.position.x : giocatore.x) - p.x;
        const mz = (preda ? preda.gruppo.position.z : giocatore.z) - p.z;
        const md = Math.hypot(mx, mz);
        if (md > (preda ? 1.8 : 4)) {
          g.gruppo.rotation.y = Math.atan2(mx, mz);
          this.muovi(g, mx / md, mz / md, 4.5 * dt, dt);
          g.passo += dt * 9;
          insegue = true;
        }
        g.attesaColpo -= dt;
        if (preda && md < 2.6 && g.attesaColpo <= 0) {
          g.attesaColpo = 1;
          this.ferisci(preda, 22);
        }
      } else if (st.sonno > 0) {
        // Dorme: non si muove e non colpisce.
      } else if (st.paura > 0 || mite) {
        // Scappa da chi gioca (la pecora trotterella piano).
        if (d > 0.1 && d < 60) {
          const v = mite ? 1.2 : passo;
          g.gruppo.rotation.y = Math.atan2(-dx, -dz);
          this.muovi(g, -dx / d, -dz / d, v * dt, dt);
          g.passo += dt * v * 2.2;
          insegue = true;
        }
      } else {
        insegue = d < 36 && (!alSicuro || g.fisso) && !nascosto;
        if (insegue) {
          g.gruppo.rotation.y = Math.atan2(dx, dz);
          if (d > 2.4) {
            this.muovi(g, dx / d, dz / d, passo * dt, dt);
            g.passo += dt * passo * 2.2;
          }
          g.attesaColpo -= dt;
          if (d < 2.9 && Math.abs(giocatore.y - p.y) < 3.5 && g.attesaColpo <= 0) {
            g.attesaColpo = 1.3;
            danno += g.forza * (st.piccolo > 0 ? 0.4 : 1) * (this.notte ? 1.3 : 1);
            g.passo += 1.5;
          }
        }
      }
      // Dove l'acqua è alta le creature restano a galla con il busto fuori, invece di camminare sul fondo.
      p.y = Math.max(this.quota(p.x, p.z), this.quotaAcqua - 0.9);
      if (g.specie.forma === 'lume') {
        // Il lume non cammina: galleggia, e i lumini gli girano attorno.
        g.passo += dt * 2;
        p.y += Math.sin(g.passo) * 0.25;
        for (const a of g.arti) a.rotation.y += dt * 2.4;
      } else {
        const dondolo = Math.sin(g.passo) * (insegue ? 0.7 : 0.08);
        g.arti[0]!.rotation.x = dondolo;
        g.arti[1]!.rotation.x = -dondolo;
        g.arti[2]!.rotation.x = -dondolo;
        g.arti[3]!.rotation.x = dondolo;
      }
      g.lampo = Math.max(0, g.lampo - dt);
      if (g.lampo > 0) g.corpo.emissive.setScalar(0.6);
      else if (mite) g.corpo.emissive.setRGB(0.75, 0.75, 0.7);
      else if (st.sonno > 0) g.corpo.emissive.setRGB(0.1, 0.16, 0.5);
      else if (st.veleno > 0) g.corpo.emissive.setRGB(0.12, 0.45, 0.1);
      else if (st.paura > 0) g.corpo.emissive.setRGB(0.45, 0.4, 0.05);
      else g.corpo.emissive.setScalar(0.1);
      g.barra.scale.x = Math.max(0.02, g.vita / g.vitaMassima);
      g.barra.visible = g.vita < g.vitaMassima;
      g.barra.rotation.y = -g.gruppo.rotation.y + Math.atan2(dx, dz);
      if (g.guardiano) g.barra.visible = true;
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

  /** Toglie le creature di passaggio (quando chi gioca rinasce); quelle delle missioni restano al loro posto. */
  svuota(): void {
    for (let i = this.golem.length - 1; i >= 0; i--) {
      const g = this.golem[i]!;
      if (g.fisso) continue;
      this.gruppo.remove(g.gruppo);
      g.corpo.dispose();
      this.golem.splice(i, 1);
    }
  }
}
