import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Lampi } from './effetti/lampi.js';
import type { Particelle } from './effetti/particelle.js';
import type { Pezzi } from './fisica/pezzi.js';
import type { AlberiMagici } from './mondo/alberiMagici.js';
import type { Campo } from './mondo/campo.js';
import type { Suoni } from './suoni.js';

/** Gli stati che un incantesimo può dare alle creature. */
export type StatoCreatura = 'sonno' | 'pecora' | 'paura' | 'lento' | 'veleno' | 'piccolo';

/** Ciò che la magia può fare al mago stesso e alle creature: non solo rompere, ma curare, proteggere, ingannare. */
export interface Poteri {
  /** Dove sta chi gioca (i piedi). */
  readonly dove: THREE.Vector3;
  cura(quanto: number): void;
  /** Per un po' le ferite pesano un quarto. */
  scudo(secondi: number): void;
  svelto(secondi: number): void;
  balzo(secondi: number): void;
  /** Per un po' le creature non vedono chi gioca. */
  invisibile(secondi: number): void;
  teletrasporta(a: THREE.Vector3): void;
  /** Un globo di luce che resta sospeso in un punto. */
  luce(a: THREE.Vector3, secondi: number, colore: number): void;
  /** Dà uno stato alle creature in un cerchio; restituisce quante ne ha prese. */
  stato(a: THREE.Vector3, raggio: number, che: StatoCreatura, secondi: number): number;
  /** Ferisce le creature in un cerchio senza badare alle loro immunità; restituisce il danno fatto in tutto. */
  ferisci(a: THREE.Vector3, raggio: number, danno: number): number;
  /** Fa nascere un golem amico che combatte per chi gioca. */
  evoca(a: THREE.Vector3, secondi: number): void;
  /** Costruisce qualcosa in un punto (un blocco, una parete, una torre…). */
  costruisci(che: string, a: THREE.Vector3): void;
  /** Smonta le costruzioni di chi gioca attorno a un punto. */
  smonta(a: THREE.Vector3, raggio: number): void;
  /** Dove stanno le creature ostili entro un raggio. */
  bersagli(a: THREE.Vector3, raggio: number): THREE.Vector3[];
}

/** Tutto ciò che un incantesimo può toccare. */
export interface Gioco {
  readonly R: typeof RAPIER;
  readonly fisica: RAPIER.World;
  readonly scena: THREE.Scene;
  readonly camera: THREE.PerspectiveCamera;
  readonly corpoGiocatore: RAPIER.RigidBody;
  readonly pezzi: Pezzi;
  readonly campo: Campo;
  readonly scintille: Particelle;
  readonly fumo: Particelle;
  readonly lampi: Lampi;
  readonly suoni: Suoni;
  readonly alberi: AlberiMagici;
  readonly poteri: Poteri;
  /** Fa tremare la visuale; si attenua da sola con la distanza dal punto indicato. */
  scossa(forza: number, dove: THREE.Vector3): void;
  /** Chiede di oscurare e tingere il cielo per questo fotogramma (vince la richiesta più forte). */
  umore(buio: number, r: number, g: number, b: number): void;
  aggiungi(effetto: Effetto): void;
  /** Vero finché chi gioca tiene premuto il lancio. */
  premuto(): boolean;
  /** Un incantesimo "a presa" lo mette a vero mentre è in corso: finché lo è, non se ne lanciano altri. */
  impegnato: boolean;
}

/** Qualcosa che dura nel tempo (una palla di fuoco in volo, un tornado...). Restituisce false quando ha finito. */
export interface Effetto {
  aggiorna(dt: number, g: Gioco): boolean;
}

export interface Lancio {
  /** La punta del bastone. */
  readonly origine: THREE.Vector3;
  /** Il punto del mondo sotto il mirino. */
  readonly bersaglio: THREE.Vector3;
  /** La direzione dello sguardo. */
  readonly direzione: THREE.Vector3;
  /** Vero se il mirino è sul prato (e non su un muro o in cielo). */
  readonly aTerra: boolean;
}

export interface Incantesimo {
  readonly nome: string;
  readonly cosaFa: string;
  readonly simbolo: string;
  readonly colore: number;
  /** Secondi di attesa tra un lancio e il successivo. */
  readonly ricarica: number;
  /** Vero per gli incantesimi perduti, trovati nel mondo: nella barra hanno il bordo d'oro. */
  readonly raro?: boolean;
  lancia(g: Gioco, l: Lancio): void;
}
