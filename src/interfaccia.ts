import { graficaScelta, ricordaGrafica, type Grafica } from './base/qualita.js';
import type { Incantesimo } from './gioco.js';
import { N_ZONE, pesiZone, terraferma, ZONE, type Luogo } from './mondo/zone.js';

const el = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

/** Quanti metri si vedono sulla mappa, dal centro al bordo, e quanti ne copre lo sfondo dipinto. */
const VISTA_MAPPA = 420;
const SFONDO = 700;

const COME_TASTIERA =
  '<kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> per camminare · mouse per guardare · clic per lanciare<br />' +
  '<kbd>1</kbd>–<kbd>0</kbd>, <kbd>Q</kbd>/<kbd>E</kbd> o rotella per cambiare incantesimo · <kbd>C</kbd> inventane uno · <kbd>Spazio</kbd> salta · <kbd>Maiusc</kbd> corri · <kbd>R</kbd> ricostruisci<br />' +
  '<kbd>T</kbd> scrivi un incantesimo · <kbd>P</kbd> spendi i punti · <kbd>N</kbd> quaderno · <kbd>V</kbd> viaggio rapido · <kbd>Z</kbd> zaino · <kbd>Esc</kbd> pausa';
const COME_DITA =
  'Pollice sinistro per camminare, destro per guardarti intorno.<br />Spingi il pollice più lontano per correre. Scorri la barra in basso, tocca un incantesimo e tieni premuto ✦ per lanciarlo. Con ＋ ne inventi uno tuo.<br />Se non senti i suoni, togli il silenzioso.';

/** Tutto ciò che sta sopra l'immagine del gioco: barra degli incantesimi, scritte, pulsanti, schermata d'ingresso. */
export class Interfaccia {
  readonly tela = el<HTMLCanvasElement>('tela');
  readonly leva = el('leva');
  readonly pomello = el('pomello');
  readonly pulsanteLancia = el<HTMLButtonElement>('lancia');
  readonly pulsanteSalta = el<HTMLButtonElement>('salta');
  readonly pulsanteRicostruisci = el<HTMLButtonElement>('ricostruisci');
  private readonly inizio = el('inizio');
  private readonly entra = el<HTMLButtonElement>('entra');
  private readonly nome = el('nome');
  private readonly stato = el('stato');
  private bottoni: HTMLButtonElement[] = [];
  private veli: HTMLElement[] = [];
  private magie: readonly Incantesimo[] = [];
  onOfficina: () => void = () => undefined;
  onGrafica: (scelta: Grafica) => void = () => undefined;
  private spegniNome = 0;
  private spegniAnnuncio = 0;
  private readonly annuncio = el('annuncio');
  private readonly mappa = el<HTMLCanvasElement>('mappa');
  private readonly sfondoMappa = document.createElement('canvas');
  onScelta: (indice: number) => void = () => undefined;
  onEntra: () => void = () => undefined;

  constructor(magie: readonly Incantesimo[], telefono: boolean) {
    document.body.classList.toggle('dita', telefono);
    el('come').innerHTML = telefono ? COME_DITA : COME_TASTIERA;
    el('magie').addEventListener('scroll', () => this.segnaFine(), { passive: true });
    window.addEventListener('resize', () => this.segnaFine());
    el('versione').textContent = `Versione del ${__VERSIONE__}`;
    this.impostaMagie(magie);
    this.entra.addEventListener('click', () => this.onEntra());
    // La scelta della grafica vale subito, senza ricaricare (dove il browser non lascia salvare, ricaricando si perderebbe).
    const nomi: Record<Grafica, string> = {
      automatica: 'Grafica: automatica (si adatta al dispositivo)',
      alta: 'Grafica: sempre al massimo',
      leggera: 'Grafica: leggera (per dispositivi lenti)',
    };
    const ordine: Grafica[] = ['automatica', 'alta', 'leggera'];
    const pulsante = el<HTMLButtonElement>('grafica');
    pulsante.textContent = nomi[graficaScelta()];
    pulsante.addEventListener('click', () => {
      const prossima = ordine[(ordine.indexOf(graficaScelta()) + 1) % ordine.length]!;
      ricordaGrafica(prossima);
      pulsante.textContent = nomi[prossima];
      this.onGrafica(prossima);
    });
  }

  /** Ridisegna la barra: gli incantesimi di sempre, quelli inventati, e in fondo il pulsante dell'officina. */
  impostaMagie(magie: readonly Incantesimo[]): void {
    this.magie = magie;
    this.bottoni = [];
    this.veli = [];
    const barra = el('magie');
    barra.replaceChildren();
    magie.forEach((m, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'magia';
      b.title = `${m.nome}: ${m.cosaFa}`;
      b.setAttribute('aria-label', m.nome);
      if (m.raro) b.classList.add('raro');
      b.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
      b.innerHTML = `${m.simbolo}<i></i><small>${i < 10 ? (i + 1) % 10 : ''}</small>`;
      b.addEventListener('click', () => {
        this.onScelta(i);
        b.blur();
      });
      barra.append(b);
      this.bottoni.push(b);
      this.veli.push(b.querySelector('i')!);
    });
    const crea = document.createElement('button');
    crea.type = 'button';
    crea.className = 'magia crea';
    crea.title = 'Inventa un incantesimo';
    crea.setAttribute('aria-label', 'Inventa un incantesimo');
    crea.textContent = '＋';
    crea.addEventListener('click', () => {
      this.onOfficina();
      crea.blur();
    });
    this.crea?.remove();
    this.crea = crea;
    el('barra').append(crea);
    this.segnaFine();
  }

  private crea: HTMLElement | null = null;

  /** Toglie la sfumatura a destra della barra quando si è arrivati in fondo (o quando non c'è niente da scorrere). */
  private segnaFine(): void {
    const m = el('magie');
    m.classList.toggle('fine', m.scrollLeft + m.clientWidth >= m.scrollWidth - 2);
  }

  private centroMappaX = NaN;
  private centroMappaZ = NaN;

  /** Dipinge lo sfondo della mappa attorno a un punto: ogni terra con il colore del suo suolo. */
  private dipingiSfondo(x: number, z: number): void {
    const lato = 48;
    this.centroMappaX = x;
    this.centroMappaZ = z;
    this.sfondoMappa.width = this.sfondoMappa.height = lato;
    const c = this.sfondoMappa.getContext('2d')!;
    const punti = c.createImageData(lato, lato);
    const pesi = new Float32Array(N_ZONE);
    const terre = ZONE.map((zona) => [(zona.terra >> 16) & 255, (zona.terra >> 8) & 255, zona.terra & 255]);
    for (let j = 0; j < lato; j++) {
      for (let i = 0; i < lato; i++) {
        const px = x + ((i + 0.5) / lato - 0.5) * 2 * SFONDO;
        const pz = z + ((j + 0.5) / lato - 0.5) * 2 * SFONDO;
        pesiZone(px, pz, pesi);
        const mare = terraferma(px, pz) < 0.5;
        const k = (j * lato + i) * 4;
        for (let canale = 0; canale < 3; canale++) {
          let v = 0;
          for (let n = 0; n < ZONE.length; n++) v += terre[n]![canale]! * pesi[n]!;
          punti.data[k + canale] = mare ? [47, 111, 150][canale]! : v;
        }
        punti.data[k + 3] = 255;
      }
    }
    c.putImageData(punti, 0, 0);
  }

  /**
   * Ridisegna la mappa. Chi gioca sta sempre al centro e il nord è in alto; attorno si vedono le terre vicine
   * e i luoghi (pieni se già scoperti). Le zone fatte a mano (`speciali`) sono un rombo dorato.
   */
  disegnaMappa(
    x: number, z: number, imbardata: number, luoghi: readonly Luogo[], scoperti: ReadonlySet<string>, rasi: ReadonlySet<string>,
    speciali: readonly { x: number; z: number }[] = [],
  ): void {
    const c = this.mappa.getContext('2d');
    if (!c) return;
    // Lo sfondo copre più del visibile: lo si ridipinge solo quando ci si è spostati di un bel po'.
    if (!(Math.hypot(x - this.centroMappaX, z - this.centroMappaZ) < SFONDO - VISTA_MAPPA - 20)) this.dipingiSfondo(x, z);
    const lato = this.mappa.width;
    const scala = lato / (2 * VISTA_MAPPA);
    c.imageSmoothingEnabled = true;
    const latoSfondo = 2 * SFONDO * scala;
    c.drawImage(
      this.sfondoMappa,
      lato / 2 + (this.centroMappaX - SFONDO - x) * scala, lato / 2 + (this.centroMappaZ - SFONDO - z) * scala,
      latoSfondo, latoSfondo,
    );
    for (const l of luoghi) {
      c.beginPath();
      c.arc(lato / 2 + (l.x - x) * scala, lato / 2 + (l.z - z) * scala, 5, 0, Math.PI * 2);
      if (scoperti.has(l.chiave)) {
        // I luoghi rasi al suolo almeno una volta restano d'oro sulla mappa.
        c.fillStyle = rasi.has(l.chiave) ? '#e9c46a' : '#fff';
        c.fill();
      } else {
        c.strokeStyle = 'rgba(255,255,255,.6)';
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
    for (const s of speciali) {
      const sx = lato / 2 + (s.x - x) * scala;
      const sz = lato / 2 + (s.z - z) * scala;
      if (sx < -8 || sz < -8 || sx > lato + 8 || sz > lato + 8) continue;
      c.beginPath();
      c.moveTo(sx, sz - 7);
      c.lineTo(sx + 6, sz);
      c.lineTo(sx, sz + 7);
      c.lineTo(sx - 6, sz);
      c.closePath();
      c.fillStyle = '#e9c46a';
      c.strokeStyle = '#1d1a14';
      c.lineWidth = 1.5;
      c.fill();
      c.stroke();
    }
    c.save();
    c.translate(lato / 2, lato / 2);
    c.rotate(-imbardata);
    c.beginPath();
    c.moveTo(0, -11);
    c.lineTo(7, 8);
    c.lineTo(0, 4);
    c.lineTo(-7, 8);
    c.closePath();
    c.fillStyle = '#ffd24a';
    c.strokeStyle = '#1d1a14';
    c.lineWidth = 2;
    c.fill();
    c.stroke();
    c.restore();
  }

  /** Una scritta grande in mezzo allo schermo, che svanisce da sola: una zona nuova, un luogo trovato. */
  annuncia(titolo: string, sotto: string, importante = false): void {
    // Un annuncio importante (un incantesimo trovato) non si lascia coprire da uno qualunque arrivato subito dopo.
    const adesso = performance.now();
    if (adesso < this.importanteFino) {
      // Due annunci importanti nello stesso momento (luogo liberato e livello nuovo): il secondo aspetta il suo turno.
      if (importante && this.coda.length < 4) this.coda.push([titolo, sotto]);
      return;
    }
    // Più è lungo il testo, più resta: la richiesta di un abitante non si legge in tre secondi.
    const durata = 3500 + Math.max(0, titolo.length + sotto.length - 40) * 45;
    if (importante) this.importanteFino = adesso + durata - 400;
    this.annuncio.querySelector('b')!.textContent = titolo;
    this.annuncio.querySelector('span')!.textContent = sotto;
    this.annuncio.style.opacity = '1';
    window.clearTimeout(this.spegniAnnuncio);
    this.spegniAnnuncio = window.setTimeout(() => {
      this.annuncio.style.opacity = '0';
      const prossimo = this.coda.shift();
      if (prossimo) window.setTimeout(() => {
        this.importanteFino = 0;
        this.annuncia(prossimo[0], prossimo[1], true);
      }, 350);
    }, durata);
  }

  private readonly coda: [string, string][] = [];

  caricato(): void {
    this.entra.disabled = false;
    this.entra.textContent = 'Entra nel mondo';
  }

  mostraIngresso(mostra: boolean): void {
    this.inizio.classList.toggle('via', !mostra);
    if (mostra) this.entra.textContent = 'Riprendi';
  }

  scegli(indice: number): void {
    const m = this.magie[indice]!;
    this.bottoni.forEach((b, i) => b.classList.toggle('scelta', i === indice));
    this.bottoni[indice]?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
    this.nome.querySelector('b')!.textContent = m.nome;
    this.nome.querySelector('span')!.textContent = m.cosaFa;
    this.nome.style.opacity = '1';
    window.clearTimeout(this.spegniNome);
    this.spegniNome = window.setTimeout(() => (this.nome.style.opacity = '0'), 3200);
    this.pulsanteLancia.style.setProperty('--tinta', `#${m.colore.toString(16).padStart(6, '0')}`);
  }

  /** Mostra quanto manca prima di poter rilanciare ogni incantesimo (0 = pronto, 1 = appena lanciato). */
  ricariche(quote: readonly number[]): void {
    quote.forEach((q, i) => this.veli[i] && (this.veli[i].style.transform = `scaleY(${q.toFixed(3)})`));
  }

  private eraPronto = true;

  /** Fa vedere dove guardano gli occhi (mirino) e dove sta il pollice (✦) se l'incantesimo scelto è pronto o si sta ricaricando. */
  pronto(siPuoLanciare: boolean): void {
    if (siPuoLanciare === this.eraPronto) return;
    this.eraPronto = siPuoLanciare;
    this.pulsanteLancia.style.opacity = siPuoLanciare ? '1' : '0.45';
    el('mirino').style.opacity = siPuoLanciare ? '1' : '0.35';
  }

  scriviMeta(testo: string): void {
    el('meta').textContent = `➤ ${testo}`;
  }

  private spegniColpo = 0;
  private importanteFino = 0;

  /** Un numero che compare sotto il mirino e svanisce: quanti pezzi ha spostato (o rimesso a posto) l'ultimo lancio. */
  colpo(testo: string, colore: string): void {
    const c = el('colpo');
    c.textContent = testo;
    c.style.color = colore;
    c.style.opacity = '1';
    window.clearTimeout(this.spegniColpo);
    this.spegniColpo = window.setTimeout(() => (c.style.opacity = '0'), 2200);
  }

  /** Dice, nella schermata d'ingresso, se su questo dispositivo il gioco non riesce a ricordare i progressi. */
  avvisaMemoria(funziona: boolean): void {
    el('memoria').textContent = funziona ? '' : 'Su questo dispositivo il gioco non riesce a ricordare i progressi tra una visita e l’altra.';
  }

  scriviStato(testo: string): void {
    this.stato.textContent = testo;
  }
}
