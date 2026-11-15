import * as THREE from 'three';
import type { Elemento, StatoCreatura } from './gioco.js';
import { nuovoGolemVero, type CorpoVero } from './creatureVere.js';
import { foto } from './mondo/materiali.js';

/** Ciò che una creatura lascia quando si sbriciola. */
export interface Premio {
  readonly specie: Specie;
  /** Il numero della creatura, e se era il guardiano di un luogo. */
  readonly numero: number;
  readonly guardiano: boolean;
  readonly livello: number;
  readonly esperienza: number;
  readonly essenze: number;
  readonly dove: THREE.Vector3;
}

/** Il pezzo di prato che le creature guardano: dove brucia e dove è gelato. */
export interface SuoloVivo {
  cella(x: number, z: number): number;
  readonly fuoco: Float32Array;
  readonly gelo: Float32Array;
  /** Dà fuoco al prato in un cerchio (lo usano gli sputi dei diavoletti). */
  accendi?(x: number, z: number, raggio: number): void;
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
  /** Come attacca: un pugno che si vede arrivare, schegge da lontano, una carica, globi che inseguono, sputi di fuoco. */
  readonly attacco: 'pugno' | 'scheggia' | 'carica' | 'globo' | 'sputo';
  /** Che cosa dire a chi gioca la prima volta che la incontra. */
  readonly indizio: string;
}

export const SPECIE: Readonly<Record<string, Specie>> = {
  golem: { nome: 'Golem di sassi', colore: 0x8f8a84, occhi: 0xffc040, forma: 'golem', taglia: 1, vita: 1, forza: 1, passo: 3.3, fuoco: 1, gelo: 1, botto: 1, attacco: 'pugno', indizio: 'Fuoco, gelo e botti: tutto gli fa male. Alza le braccia prima di colpire: allontanati dal cerchio rosso.' },
  sentinella: { nome: 'Sentinella di ghiaccio', colore: 0xa8dcf4, occhi: 0x2a6aff, forma: 'golem', taglia: 1.1, vita: 1.1, forza: 1.1, passo: 3.0, fuoco: 2.6, gelo: 0, botto: 0.8, attacco: 'scheggia', indizio: 'Il gelo non le fa nulla. Il fuoco la scioglie. Tira schegge da lontano: spostati di lato.' },
  scorpione: { nome: 'Scorpione di sabbia', colore: 0xd8a85a, occhi: 0xff3a2a, forma: 'coda', taglia: 0.9, vita: 0.75, forza: 0.9, passo: 5.4, fuoco: 0.2, gelo: 2.8, botto: 1.3, attacco: 'carica', indizio: 'È svelto e il fuoco quasi non lo sente. Il gelo lo ferma. Carica in linea retta: scansati all’ultimo.' },
  lume: { nome: 'Lume di palude', colore: 0x9affd0, occhi: 0xffffff, forma: 'lume', taglia: 0.9, vita: 0.7, forza: 0.8, passo: 3.8, fuoco: 0, gelo: 3, botto: 0.3, attacco: 'globo', indizio: 'I botti gli passano attraverso e il fuoco non lo tocca. Il gelo lo spegne. Lancia globi lenti che ti inseguono: metti un muro in mezzo.' },
  diavoletto: { nome: 'Diavoletto di lava', colore: 0x5a2a20, occhi: 0xffa020, forma: 'golem', taglia: 0.7, vita: 0.8, forza: 1.2, passo: 5.0, fuoco: 0, gelo: 3, botto: 1, attacco: 'sputo', indizio: 'Nel fuoco ci sguazza. Il gelo lo spacca. Sputa fuoco che resta a terra: non stare fermo.' },
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
  /** I materiali solo suoi, da buttare quando sparisce. */
  readonly propri: THREE.Material[];
  /** Dove è nata: un guardiano non si allontana troppo dal suo luogo. */
  readonly casaX: number;
  readonly casaZ: number;
  /** Il corpo animato, se c'è il modello vero; e il movimento che sta facendo. */
  vero: CorpoVero | null;
  movimento: string;
  /** La velocità con cui sta volando, se una magia l'ha scagliata in aria. */
  vola: boolean;
  vx: number;
  vy: number;
  vz: number;
  /** Secondi per cui resta in allarme dopo essere stata colpita: intanto insegue anche da lontano. */
  allerta: number;
  /** Vero se l'ultimo danno da mostrare ha toccato il suo punto debole; e l'attesa prima di ridire «immune». */
  debole: boolean;
  attesaImmune: number;
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
  /** L'attacco in preparazione: quanti secondi mancano al colpo (0 = nessuno), e in che direzione va la carica. */
  mossa: number;
  slancio: number;
  slancioX: number;
  slancioZ: number;
  /** Il cerchio rosso a terra che avvisa del pugno. */
  avviso: THREE.Mesh;
  /** Il danno preso da poco, da mostrare come numero, e se ha già chiamato rinforzi. */
  dannoDaDire: number;
  attesaNumero: number;
  rinforzi: boolean;
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
const ANELLO = new THREE.RingGeometry(0.86, 1, 40).rotateX(-Math.PI / 2);
const GLOBO = new THREE.IcosahedronGeometry(0.28, 1);
const BARRA = new THREE.PlaneGeometry(1, 0.09);
// Corona, cerchio d'avviso e barra della vita sono uguali per tutte: un materiale solo, mai buttato.
const ORO = new THREE.MeshBasicMaterial({ color: 0xffd24a });
const ROSSO_AVVISO = new THREE.MeshBasicMaterial({ color: 0xff3a2a, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide });
const ROSSO_BARRA = new THREE.MeshBasicMaterial({ color: 0xff5a4a, depthTest: false, transparent: true });
/** Entro quanti metri il pugno del golem fa male. */
const RAGGIO_PUGNO = 3.4;

/** Qualcosa che una creatura ha tirato a chi gioca. */
interface Tiro {
  readonly mesh: THREE.Mesh;
  readonly v: THREE.Vector3;
  readonly danno: number;
  readonly tipo: 'scheggia' | 'globo' | 'sputo';
  vita: number;
}

/** Un numero da far salire sopra una creatura colpita, o un avviso per chi gioca. */
export interface Colpo {
  readonly dove: THREE.Vector3;
  readonly quanto: number;
  /** «debole»: ha toccato il punto debole. «immune»: quella magia non le fa nulla. */
  readonly tipo: 'normale' | 'debole' | 'immune';
}
const VITA_SCHEGGIA = 2.6;
/** Entro quanti metri dal villaggio di partenza non nascono creature e quelle che inseguono rinunciano. */
export const RAGGIO_SICURO = 110;
/** Dentro le mura del villaggio non entra nessuna creatura, nemmeno una in allarme. */
const RAGGIO_MURA = 58;

/**
 * Le creature, fatte di blocchi: camminano verso chi gioca e lo colpiscono da vicino. Ogni terra ha la sua razza,
 * con un punto debole e un'immunità (vedi SPECIE). Più si è lontani dal villaggio, più sono forti. I luoghi hanno
 * un guardiano, più grosso e con la corona.
 */
export class Creature {
  readonly gruppo = new THREE.Group();
  private readonly golem: Golem[] = [];
  private readonly schegge: Scheggia[] = [];
  private readonly tiri: Tiro[] = [];
  private readonly colpi: Colpo[] = [];
  private readonly avvisi: string[] = [];
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
    // La pelle è pietra fotografata dal vero, tinta del colore della razza (l'immagine è a mezzo grigio: per due torna il colore pieno).
    const scuro = 1 - Math.min(0.4, (livello - 1) * 0.06);
    // Il golem vero, modellato e animato, quando c'è; altrimenti quello a blocchi.
    const vero = specie.forma === 'golem' ? nuovoGolemVero(new THREE.Color(specie.colore).multiplyScalar(scuro), specie.occhi) : null;
    const corpo = vero?.pelle ?? new THREE.MeshLambertMaterial({ color: new THREE.Color(specie.colore).multiplyScalar(2 * scuro), map: foto('roccia'), emissive: 0xffffff, emissiveIntensity: 1 });
    const occhi = vero?.occhi ?? new THREE.MeshBasicMaterial({ color: specie.occhi });
    const propri: THREE.Material[] = [corpo, occhi];
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
      const alone = new THREE.MeshBasicMaterial({ color: specie.colore, transparent: true, opacity: 0.35, depthWrite: false });
      propri.push(alone);
      gruppo.add(pezzo(0.7, 0.7, 0.7, 0, 1.5, 0, occhi), pezzo(1.0, 1.0, 1.0, 0, 1.5, 0, alone));
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
    } else if (vero) {
      gruppo.add(vero.radice);
      // Le braccia e le gambe le muove lo scheletro: questi quattro perni vuoti tengono solo il posto.
      arti = [0, 1, 2, 3].map(() => new THREE.Object3D());
    } else {
      gruppo.add(pezzo(1.0, 0.9, 0.6, 0, 1.25, 0), pezzo(0.7, 0.35, 0.5, 0, 0.72, 0), pezzo(0.56, 0.5, 0.5, 0, 1.98, 0.02));
      gruppo.add(pezzo(0.1, 0.08, 0.04, -0.13, 2.02, 0.28, occhi), pezzo(0.1, 0.08, 0.04, 0.13, 2.02, 0.28, occhi));
      gruppo.add(pezzo(0.34, 0.2, 0.3, -0.3, 1.78, -0.05), pezzo(0.3, 0.16, 0.26, 0.34, 1.76, 0.05));
      arti = [arto(-0.68, 1.6, 0.85, 0.3), arto(0.68, 1.6, 0.85, 0.3), arto(-0.26, 0.6, 0.5, 0.32), arto(0.26, 0.6, 0.5, 0.32)];
    }
    // Il guardiano di un luogo porta una corona d'oro.
    if (guardiano) for (let i = 0; i < 5; i++) gruppo.add(pezzo(0.12, 0.3, 0.12, Math.cos(i * 1.257) * 0.3, specie.forma === 'coda' ? 1.1 : 2.4, Math.sin(i * 1.257) * 0.3 + (specie.forma === 'coda' ? 0.95 : 0), ORO));
    const avviso = new THREE.Mesh(ANELLO, ROSSO_AVVISO);
    avviso.position.y = 0.12;
    avviso.visible = false;
    gruppo.add(avviso);
    const barra = new THREE.Mesh(BARRA, ROSSO_BARRA);
    barra.position.y = 2.6;
    barra.renderOrder = 5;
    gruppo.add(barra);
    gruppo.scale.setScalar((0.9 + Math.min(0.7, (livello - 1) * 0.1)) * specie.taglia * (guardiano ? 1.7 : 1));
    gruppo.position.set(x, this.quota(x, z), z);
    this.gruppo.add(gruppo);
    const vita = (34 + livello * 14) * specie.vita * (guardiano ? 3 : 1);
    this.golem.push({ specie, guardiano, gruppo, arti, barra, corpo, propri, casaX: x, casaZ: z, vero, movimento: 'fermo', vola: false, vx: 0, vy: 0, vz: 0, allerta: 0, debole: false, attesaImmune: 0, vita, vitaMassima: vita, forza: (9 + livello * 3) * specie.forza * (guardiano ? 1.4 : 1), livello, attesaColpo: 0.6, numero: ++this.contatore, fisso, stati: { sonno: 0, pecora: 0, paura: 0, lento: 0, veleno: 0, piccolo: 0 }, amico: 0, evocato: false, taglia: gruppo.scale.x, mossa: 0, slancio: 0, slancioX: 0, slancioZ: 0, avviso, dannoDaDire: 0, attesaNumero: 0, rinforzi: false, lato: this.caso() < 0.5 ? 1 : -1, bloccato: 0, deviaX: 0, deviaZ: 0, deviaPer: 0, lampo: 0, passo: this.caso() * 6 });
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
      if (g.amico > 0 || !this.dentro(g, dove, raggio)) continue;
      // I guardiani sono troppo grossi per diventare pecore o addormentarsi a lungo.
      g.stati[che] = Math.max(g.stati[che], g.guardiano && (che === 'pecora' || che === 'sonno') ? secondi * 0.25 : secondi);
      // Chi si addormenta, scappa o diventa pecora lascia perdere il colpo che stava preparando: al risveglio
      // dovrà ricominciare da capo, con il suo preavviso.
      if (che === 'sonno' || che === 'pecora' || che === 'paura') {
        g.mossa = 0;
        g.slancio = 0;
        g.avviso.visible = false;
        g.attesaColpo = Math.max(g.attesaColpo, 0.8);
      }
      prese++;
    }
    return prese;
  }

  /**
   * Ferisce le creature ostili in un cerchio; restituisce il danno fatto in tutto. Fuoco, gelo e botti pesano
   * secondo la razza (punto debole o immunità); «puro» ferisce tutte allo stesso modo.
   */
  ferisciIntorno(dove: THREE.Vector3, raggio: number, danno: number, tipo: Elemento = 'puro'): number {
    let fatto = 0;
    for (const g of this.golem) {
      if (g.amico > 0 || !this.dentro(g, dove, raggio)) continue;
      fatto += this.ferisci(g, danno, tipo);
    }
    return fatto;
  }

  /** Vero se la creatura sta nel cerchio: conta la distanza in pianta, così vale anche per chi galleggia sull'acqua alta. */
  private dentro(g: Golem, dove: THREE.Vector3, raggio: number): boolean {
    const p = g.gruppo.position;
    return Math.hypot(p.x - dove.x, p.z - dove.z) <= raggio && Math.abs(p.y - dove.y) < raggio + 5;
  }

  /**
   * Una spinta: scaglia le creature via da un punto (o le tira dentro, con forza negativa), come fa con i pezzi
   * delle case. Le più grosse si muovono meno. Chi vola non combatte, e ricadendo da alto si fa male.
   */
  spingi(x: number, y: number, z: number, raggio: number, forza: number, alzata: number): void {
    for (const g of this.golem) {
      const p = g.gruppo.position;
      const s = g.gruppo.scale.x;
      const dx = p.x - x;
      const dy = p.y + s - y;
      const dz = p.z - z;
      const d = Math.hypot(dx, dy, dz) + 0.001;
      if (d > raggio) continue;
      const k = ((1 - d / raggio) * forza * 0.8) / Math.max(1, s * s * 0.8);
      g.vx += (dx / d) * k;
      g.vy += (dy / d + alzata) * k;
      g.vz += (dz / d) * k;
      if (g.vy > 2.5 || Math.hypot(g.vx, g.vz) > 3) {
        g.vola = true;
        g.mossa = 0;
        g.slancio = 0;
        g.avviso.visible = false;
        if (g.amico <= 0) g.allerta = 14;
      } else g.vx = g.vy = g.vz = 0;
    }
  }

  /**
   * Un vortice che dura (tornado, singolarità, bolla senza peso): finché c'è, tira le creature verso il centro,
   * le fa girare attorno e le tiene sollevate fino a una certa altezza.
   */
  vortice(x: number, y: number, z: number, raggio: number, dentro: number, giro: number, su: number, tetto: number, dt: number): void {
    for (const g of this.golem) {
      const p = g.gruppo.position;
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d > raggio || p.y - y > tetto + 4) continue;
      const k = (1 - d / raggio + 0.2) / Math.max(1, g.gruppo.scale.x * 0.9);
      const inv = 1 / (d + 0.3);
      g.vola = true;
      g.mossa = 0;
      g.slancio = 0;
      g.avviso.visible = false;
      g.vx += (dx * inv * dentro - dz * inv * giro) * k * dt;
      g.vz += (dz * inv * dentro + dx * inv * giro) * k * dt;
      g.vy += (p.y - y < tetto ? su : -4) * k * dt;
      // Dentro un vortice non si prende velocità all'infinito.
      const v = Math.hypot(g.vx, g.vy, g.vz);
      if (v > 22) {
        g.vx *= 22 / v;
        g.vy *= 22 / v;
        g.vz *= 22 / v;
      }
    }
  }

  /** Toglie dal mondo una creatura senza premio (il golem di una missione lasciata a metà). */
  togli(numero: number): void {
    const i = this.golem.findIndex((g) => g.numero === numero);
    if (i < 0) return;
    this.butta(this.golem[i]!);
    this.golem.splice(i, 1);
  }

  private butta(g: Golem): void {
    this.gruppo.remove(g.gruppo);
    for (const m of g.propri) m.dispose();
  }

  /**
   * La creatura ostile che un raggio incontra per prima (il mirino, una palla in volo): il suo corpo conta come
   * un cilindro in piedi. Restituisce dove sta e a che distanza lungo il raggio, oppure null.
   */
  sottoMira(origine: THREE.Vector3, direzione: THREE.Vector3, lungo: number): { dove: THREE.Vector3; lontano: number } | null {
    let meglio: { dove: THREE.Vector3; lontano: number } | null = null;
    const a = direzione.x * direzione.x + direzione.z * direzione.z;
    if (a < 1e-6) return null;
    for (const g of this.golem) {
      if (g.amico > 0) continue;
      const p = g.gruppo.position;
      const s = g.gruppo.scale.x;
      const raggio = Math.max(0.8, (g.specie.forma === 'coda' ? 1.1 : 0.85) * s);
      const ox = origine.x - p.x;
      const oz = origine.z - p.z;
      const b = 2 * (ox * direzione.x + oz * direzione.z);
      const c = ox * ox + oz * oz - raggio * raggio;
      const disc = b * b - 4 * a * c;
      if (disc < 0) continue;
      const radice = Math.sqrt(disc);
      let da = Math.max(0, (-b - radice) / (2 * a));
      let fino = Math.min(lungo, (-b + radice) / (2 * a));
      // In altezza: dai piedi (il lume sta sospeso) alla testa.
      const basso = p.y + (g.specie.forma === 'lume' ? 0.6 : -0.2) * s;
      const alto = p.y + (g.specie.forma === 'coda' ? 2.1 : 2.5) * s;
      if (Math.abs(direzione.y) > 1e-6) {
        const t1 = (basso - origine.y) / direzione.y;
        const t2 = (alto - origine.y) / direzione.y;
        da = Math.max(da, Math.min(t1, t2));
        fino = Math.min(fino, Math.max(t1, t2));
      } else if (origine.y < basso || origine.y > alto) continue;
      if (da > fino) continue;
      if (!meglio || da < meglio.lontano) meglio = { dove: p, lontano: da };
    }
    return meglio;
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
      if (d < raggio) this.ferisci(g, forza * 45 * (1 - (d / raggio) * 0.6), 'botto');
    }
  }

  /** Una ferita a una creatura, pesata secondo la sua razza. Restituisce il danno fatto davvero. */
  private ferisci(g: Golem, quanto: number, tipo: Elemento = 'puro'): number {
    const peso = tipo === 'puro' ? 1 : g.specie[tipo];
    if (peso <= 0) {
      // Immune: lo si dice (non a raffica), così chi gioca capisce che deve cambiare magia.
      if (quanto > 1 && g.attesaImmune <= 0) {
        g.attesaImmune = 1.2;
        this.colpi.push({ dove: new THREE.Vector3(g.gruppo.position.x, g.gruppo.position.y + 2.4 * g.gruppo.scale.x, g.gruppo.position.z), quanto: 0, tipo: 'immune' });
      }
      return 0;
    }
    const fatto = Math.min(quanto * peso, Math.max(0, g.vita));
    g.vita -= quanto * peso;
    g.dannoDaDire += quanto * peso;
    if (peso >= 2) g.debole = true;
    // Una ferita sveglia chi dorme, e mette in allarme lei e le compagne lì attorno: vengono a cercare chi è stato.
    if (quanto > 1) {
      g.stati.sonno = 0;
      g.allerta = 14;
      for (const altra of this.golem) {
        if (altra !== g && altra.amico <= 0 && altra.gruppo.position.distanceToSquared(g.gruppo.position) < 18 * 18) altra.allerta = Math.max(altra.allerta, 10);
      }
    }
    g.lampo = 0.18;
    return fatto;
  }

  private sbriciola(g: Golem): void {
    const p = g.gruppo.position;
    const k = g.guardiano ? 5 : 1;
    // Un golem evocato non lascia premi.
    if (g.amico <= 0 && !g.evocato) this.premi.push({ specie: g.specie, numero: g.numero, guardiano: g.guardiano, livello: g.livello, esperienza: (18 + g.livello * 8) * k, essenze: (2 + g.livello + Math.floor(this.caso() * 3)) * k, dove: p.clone() });
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(cubo, this.materialeScheggia);
      mesh.scale.setScalar(0.18 + this.caso() * 0.3);
      mesh.position.set(p.x + (this.caso() - 0.5) * 0.9, p.y + 0.4 + this.caso() * 1.6, p.z + (this.caso() - 0.5) * 0.9);
      mesh.castShadow = true;
      this.gruppo.add(mesh);
      this.schegge.push({ mesh, v: new THREE.Vector3((this.caso() - 0.5) * 7, 2 + this.caso() * 6, (this.caso() - 0.5) * 7), vita: VITA_SCHEGGIA });
    }
    this.butta(g);
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
      const x0 = p.x;
      const z0 = p.z;
      const dx = giocatore.x - p.x;
      const dz = giocatore.z - p.z;
      const d = Math.hypot(dx, dz);
      // Il prato sotto i piedi: il fuoco consuma, il gelo rallenta e incrina.
      const c = this.suolo.cella(p.x, p.z);
      let passo = g.specie.passo;
      if (c >= 0) {
        if (this.suolo.fuoco[c]! > 0 && g.specie.fuoco > 0) this.ferisci(g, 16 * dt, 'fuoco');
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
      // Le creature di passaggio spariscono quando chi gioca è lontano; i guardiani più tardi (e rinascono interi
      // quando si torna): senza, esplorando se ne accumulerebbero decine, tutte da muovere a ogni fotogramma.
      if ((d > 130 && !g.fisso) || (d > 220 && g.guardiano)) {
        this.butta(g);
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
      let torna = false;
      g.allerta = Math.max(0, g.allerta - dt);
      g.attesaImmune = Math.max(0, g.attesaImmune - dt);
      if (g.vola) {
        // Scagliata in aria da una magia: vola, rotola, e quando tocca terra (o sbatte contro un muro) si fa male.
        g.vy -= 16 * dt;
        const piano = Math.hypot(g.vx, g.vz);
        if (piano > 0.5 && !this.libero(p.x, p.y + 1, p.z, g.vx / piano, g.vz / piano, piano * dt + 0.7)) {
          this.ferisci(g, piano * 2.2, 'botto');
          g.vx = g.vz = 0;
        }
        p.x += g.vx * dt;
        p.y += g.vy * dt;
        p.z += g.vz * dt;
        g.gruppo.rotation.x += dt * 3.5;
        const terra = Math.max(this.quota(p.x, p.z), this.quotaAcqua - 0.9);
        if (p.y <= terra && g.vy <= 0) {
          const botta = Math.max(0, -g.vy - 7);
          if (botta > 0) this.ferisci(g, botta * 4, 'botto');
          this.urtoATerra(p);
          p.y = terra;
          g.vola = false;
          g.vx = g.vy = g.vz = 0;
          g.gruppo.rotation.x = 0;
          g.attesaColpo = Math.max(g.attesaColpo, 1.2);
        }
      } else if (g.amico > 0) {
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
          preda.allerta = 0;
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
        // Chi è stato colpito viene a cercare chi gioca anche da lontano, e lo segue fin sotto le mura del villaggio;
        // le altre lo lasciano stare appena è vicino a casa. Il guardiano non si allontana dal luogo che custodisce.
        const sveglia = g.allerta > 0;
        const protetto = sveglia ? daCasa < RAGGIO_MURA : alSicuro && !(g.fisso && !g.guardiano);
        insegue = (d < 36 || (sveglia && d < 100)) && !protetto && !nascosto;
        if (g.guardiano && !sveglia && Math.hypot(giocatore.x - g.casaX, giocatore.z - g.casaZ) > 48) insegue = false;
        const peso = (st.piccolo > 0 ? 0.4 : 1) * (this.notte ? 1.3 : 1);
        const att = g.specie.attacco;
        g.attesaColpo -= dt;
        if (g.slancio > 0) {
          // Lo scorpione in carica: va dritto dove aveva mirato, senza più correggere. Chi si scansa lo vede passare.
          g.slancio -= dt;
          this.muovi(g, g.slancioX, g.slancioZ, 17 * dt, dt);
          g.passo += dt * 30;
          if (d < 1.9 && Math.abs(giocatore.y - p.y) < 3) {
            danno += g.forza * 1.6 * peso;
            g.slancio = 0;
          }
        } else if (g.mossa > 0) {
          // Il colpo è in preparazione: la creatura sta ferma e lo si vede arrivare.
          g.mossa -= dt;
          if (att === 'pugno') {
            g.avviso.visible = true;
            g.avviso.scale.setScalar((RAGGIO_PUGNO / g.gruppo.scale.x) * (1 - g.mossa / 0.75) + 0.2);
            g.arti[0]!.rotation.x = g.arti[1]!.rotation.x = -2.6;
          }
          if (g.mossa <= 0) {
            g.avviso.visible = false;
            if (att === 'pugno') {
              if (d < RAGGIO_PUGNO && Math.abs(giocatore.y - p.y) < 3.5) danno += g.forza * 1.5 * peso;
              this.urtoATerra(p);
            } else if (att === 'carica') {
              g.slancio = 0.75;
              // Una deviazione attorno a un muro rimasta a metà farebbe partire la carica di lato.
              g.deviaPer = 0;
              g.slancioX = dx / Math.max(d, 0.1);
              g.slancioZ = dz / Math.max(d, 0.1);
            }
          }
        } else if (insegue) {
          g.gruppo.rotation.y = Math.atan2(dx, dz);
          // Chi tira da lontano tiene le distanze; gli altri vengono addosso.
          const daLontano = att === 'scheggia' || att === 'globo' || att === 'sputo';
          const vicinoQuanto = daLontano ? 11 : 2.4;
          if (d > vicinoQuanto) {
            this.muovi(g, dx / d, dz / d, passo * dt, dt);
            g.passo += dt * passo * 2.2;
          } else if (daLontano && d < 6) {
            this.muovi(g, -dx / d, -dz / d, passo * 0.7 * dt, dt);
            g.passo += dt * passo * 2.2;
          }
          if (g.attesaColpo <= 0 && Math.abs(giocatore.y - p.y) < 6) {
            if (att === 'pugno' && d < RAGGIO_PUGNO - 0.4) {
              g.mossa = 0.75;
              g.attesaColpo = 2.1;
            } else if (att === 'carica' && d > 4 && d < 15) {
              g.mossa = 0.55;
              g.attesaColpo = 3;
            } else if (att === 'carica' && d <= 4) {
              danno += g.forza * 0.6 * peso;
              g.attesaColpo = 1.2;
            } else if (daLontano && d < 28) {
              this.tira(g, giocatore, peso);
              g.attesaColpo = att === 'scheggia' ? 2.2 : att === 'globo' ? 3.2 : 2.6;
            }
          }
        } else if (g.guardiano) {
          // Nessuno da inseguire: il guardiano torna al suo posto.
          const hx = g.casaX - p.x;
          const hz = g.casaZ - p.z;
          const hd = Math.hypot(hx, hz);
          if (hd > 1.5) {
            g.gruppo.rotation.y = Math.atan2(hx, hz);
            this.muovi(g, hx / hd, hz / hd, passo * dt, dt);
            g.passo += dt * passo * 2.2;
            torna = true;
          }
        }
        // A metà vita il guardiano chiama due dei suoi.
        if (g.guardiano && !g.rinforzi && g.vita < g.vitaMassima * 0.5) {
          g.rinforzi = true;
          for (const lato of [-1, 1]) this.nasci(p.x + lato * 4, p.z + 2, Math.max(1, g.livello - 1), false, Object.keys(SPECIE).find((k) => SPECIE[k] === g.specie));
          // I rinforzi arrivano già in allarme, e spariscono come le creature di passaggio.
          for (const nuovo of this.golem.slice(-2)) nuovo.allerta = 20;
          this.avvisi.push('Il guardiano chiama rinforzi!');
        }
      }
      // Dove l'acqua è alta le creature restano a galla con il busto fuori, invece di camminare sul fondo.
      if (!g.vola) p.y = Math.max(this.quota(p.x, p.z), this.quotaAcqua - 0.9);
      if (g.specie.forma === 'lume' && !g.vola) {
        // Il lume non cammina: galleggia, e i lumini gli girano attorno.
        g.passo += dt * 2;
        p.y += Math.sin(g.passo) * 0.25;
        for (const a of g.arti) a.rotation.y += dt * 2.4;
      } else {
        const dondolo = Math.sin(g.passo) * (insegue || torna ? 0.7 : 0.08);
        g.arti[0]!.rotation.x = dondolo;
        g.arti[1]!.rotation.x = -dondolo;
        g.arti[2]!.rotation.x = -dondolo;
        g.arti[3]!.rotation.x = dondolo;
        // Le braccia alzate prima del pugno vincono sul dondolio del passo.
        if (g.mossa > 0 && g.specie.attacco === 'pugno') g.arti[0]!.rotation.x = g.arti[1]!.rotation.x = -2.6;
      }
      if (g.vero) {
        // Il corpo vero: cammina quando si sposta davvero, alza le braccia mentre prepara il pugno, altrimenti respira.
        const passi = Math.hypot(p.x - x0, p.z - z0) / Math.max(dt, 0.001);
        const vuole = g.mossa > 0 && g.specie.attacco === 'pugno' ? 'pugno' : passi > 0.6 && !g.vola ? 'cammina' : 'fermo';
        if (vuole !== g.movimento) {
          g.vero.azioni[g.movimento]?.fadeOut(0.15);
          g.vero.azioni[vuole]?.reset().fadeIn(0.15).play();
          g.movimento = vuole;
        }
        const azione = g.vero.azioni[vuole];
        if (azione && vuole === 'pugno') {
          // Il pugno va a tempo con il colpo vero: le braccia calano nell'istante in cui fa male.
          azione.time = Math.min(0.999, 1 - g.mossa / 0.75) * azione.getClip().duration;
          g.vero.mixer.update(0);
        } else g.vero.mixer.update(st.sonno > 0 ? 0 : vuole === 'cammina' ? (dt * passi) / 2.6 : dt);
      }
      g.attesaNumero -= dt;
      if (g.dannoDaDire >= 1 && g.attesaNumero <= 0) {
        this.colpi.push({ dove: new THREE.Vector3(p.x, p.y + 2.4 * g.gruppo.scale.x, p.z), quanto: Math.round(g.dannoDaDire), tipo: g.debole ? 'debole' : 'normale' });
        g.dannoDaDire = 0;
        g.debole = false;
        g.attesaNumero = 0.35;
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

    for (let i = this.tiri.length - 1; i >= 0; i--) {
      const t = this.tiri[i]!;
      const q = t.mesh.position;
      t.vita -= dt;
      if (t.tipo === 'globo') {
        // Il globo del lume piega piano verso chi gioca: si semina correndo o mettendo un muro in mezzo.
        const verso = new THREE.Vector3(giocatore.x - q.x, giocatore.y + 0.4 - q.y, giocatore.z - q.z).normalize().multiplyScalar(7.5);
        t.v.lerp(verso, Math.min(1, dt * 2.2));
      } else if (t.tipo === 'sputo') t.v.y -= 14 * dt;
      const passo = t.v.length() * dt;
      const libero = passo < 0.001 || this.libero(q.x, q.y, q.z, t.v.x / (passo / dt), t.v.z / (passo / dt), passo + 0.3);
      q.addScaledVector(t.v, dt);
      t.mesh.rotation.x += dt * 6;
      t.mesh.rotation.y += dt * 4;
      const preso = !nascosto && Math.hypot(q.x - giocatore.x, q.z - giocatore.z) < 1.1 && Math.abs(q.y - (giocatore.y + 0.3)) < 1.5;
      const aTerra = q.y < this.quota(q.x, q.z) + 0.15;
      if (preso) danno += t.danno;
      if (!preso && !aTerra && libero && t.vita > 0) continue;
      if (t.tipo === 'sputo' && (aTerra || preso)) this.suolo.accendi?.(q.x, q.z, 2.2);
      this.gruppo.remove(t.mesh);
      (t.mesh.material as THREE.Material).dispose();
      this.tiri.splice(i, 1);
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

  /** Una creatura tira qualcosa a chi gioca: una scheggia dritta, un globo che insegue, uno sputo di fuoco ad arco. */
  private tira(g: Golem, giocatore: THREE.Vector3, peso: number): void {
    const tipo = g.specie.attacco === 'scheggia' ? 'scheggia' : g.specie.attacco === 'globo' ? 'globo' : 'sputo';
    const da = g.gruppo.position.clone().setY(g.gruppo.position.y + 1.6 * g.gruppo.scale.x);
    const verso = new THREE.Vector3(giocatore.x - da.x, giocatore.y + 0.3 - da.y, giocatore.z - da.z);
    const lontano = verso.length();
    let v: THREE.Vector3;
    if (tipo === 'scheggia') v = verso.normalize().multiplyScalar(21);
    else if (tipo === 'globo') v = verso.normalize().multiplyScalar(7.5);
    else {
      // Ad arco: il tempo di volo cresce con la distanza, e la spinta in su è quella che lo fa cadere sul bersaglio.
      const tempo = 0.7 + lontano / 22;
      v = new THREE.Vector3(verso.x / tempo, verso.y / tempo + 7 * tempo, verso.z / tempo);
    }
    const colore = tipo === 'scheggia' ? 0xbfe6ff : tipo === 'globo' ? 0x9affd0 : 0xff7a2a;
    const mesh = new THREE.Mesh(tipo === 'scheggia' ? cubo : GLOBO, new THREE.MeshBasicMaterial({ color: colore }));
    if (tipo === 'scheggia') mesh.scale.set(0.16, 0.16, 0.7);
    mesh.position.copy(da);
    if (tipo === 'scheggia') mesh.lookAt(da.clone().add(v));
    this.gruppo.add(mesh);
    this.tiri.push({ mesh, v, danno: g.forza * (tipo === 'globo' ? 1.2 : 0.9) * peso, tipo, vita: tipo === 'globo' ? 5.5 : 4 });
  }

  /** Il pugno del golem batte a terra: qualche scheggia salta via tutto intorno. */
  private urtoATerra(p: THREE.Vector3): void {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const mesh = new THREE.Mesh(cubo, this.materialeScheggia);
      mesh.scale.setScalar(0.16 + this.caso() * 0.14);
      mesh.position.set(p.x + Math.cos(a) * 1.6, p.y + 0.3, p.z + Math.sin(a) * 1.6);
      this.gruppo.add(mesh);
      this.schegge.push({ mesh, v: new THREE.Vector3(Math.cos(a) * 4, 4 + this.caso() * 3, Math.sin(a) * 4), vita: 1.4 });
    }
  }

  /** I colpi andati a segno dall'ultima volta: servono a far salire i numeri del danno. */
  ritiraColpi(): Colpo[] {
    return this.colpi.splice(0, this.colpi.length);
  }

  /** Le cose da dire a chi gioca (un guardiano che chiama rinforzi). */
  ritiraAvvisi(): string[] {
    return this.avvisi.splice(0, this.avvisi.length);
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
      this.butta(g);
      this.golem.splice(i, 1);
    }
  }
}
