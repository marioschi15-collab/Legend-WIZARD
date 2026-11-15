import type { Mago, Potenziamento } from './mago.js';
import { esperienzaPer } from './mago.js';

const crea = <K extends keyof HTMLElementTagNameMap>(tag: K, stile: string, padre: HTMLElement, testo = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = stile;
  e.textContent = testo;
  padre.appendChild(e);
  return e;
};

const SCELTE: readonly { che: Potenziamento; titolo: string; sotto: string }[] = [
  { che: 'vita', titolo: '❤ Più vita', sotto: '+20 alla vita massima' },
  { che: 'mana', titolo: '✦ Più mana', sotto: '+20 al mana massimo' },
  { che: 'ricarica', titolo: '⟳ Mana più svelto', sotto: 'Il mana torna più in fretta' },
];

/** Le barre di vita e mana, il livello, le essenze, e la scelta di come spendere i punti dei livelli. */
export class MagoUi {
  private readonly vita: HTMLElement;
  private readonly mana: HTMLElement;
  private readonly esperienza: HTMLElement;
  private readonly riga: HTMLElement;
  private readonly punto: HTMLButtonElement;
  private readonly scheda: HTMLElement;
  private readonly velo: HTMLElement;
  private ultimo = '';

  constructor(private readonly mago: Mago, alCambio: () => void) {
    const scatola = crea('div', 'position:fixed;z-index:3;left:128px;top:36px;width:124px;pointer-events:none;font:600 12px system-ui,sans-serif;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.8)', document.body);
    scatola.className = 'hud';
    const barra = (colore: string): HTMLElement => {
      const fondo = crea('div', 'height:9px;margin-bottom:4px;border-radius:5px;background:rgba(10,12,18,.55);border:1px solid rgba(255,255,255,.28);overflow:hidden', scatola);
      return crea('div', `height:100%;width:100%;background:${colore};transition:width .15s`, fondo);
    };
    this.vita = barra('linear-gradient(90deg,#e8483a,#ff8a5a)');
    this.mana = barra('linear-gradient(90deg,#3a7ae8,#7ad0ff)');
    const fondoEsp = crea('div', 'height:3px;margin-bottom:5px;border-radius:2px;background:rgba(10,12,18,.5);overflow:hidden', scatola);
    this.esperienza = crea('div', 'height:100%;width:0;background:#e9c46a', fondoEsp);
    this.riga = crea('div', 'white-space:nowrap', scatola);
    this.punto = crea('button', 'display:none;pointer-events:auto;margin-top:5px;padding:5px 9px;border-radius:999px;border:1px solid #e9c46a;background:rgba(233,196,106,.25);color:#fff;font:700 12px system-ui,sans-serif;cursor:pointer', scatola);
    this.punto.type = 'button';

    this.velo = crea('div', 'display:none;position:fixed;inset:0;z-index:8;place-items:center;background:rgba(8,10,16,.55)', document.body);
    this.scheda = crea('div', 'width:min(88vw,330px);padding:18px;border-radius:16px;background:rgba(18,20,28,.94);border:1px solid rgba(255,255,255,.2);color:#fff;font:15px system-ui,sans-serif;text-align:center', this.velo);
    crea('div', 'font:italic 600 26px Georgia,serif;margin-bottom:4px', this.scheda, 'Sei cresciuto');
    crea('div', 'opacity:.8;font-size:13px;margin-bottom:12px', this.scheda, 'Scegli che cosa rafforzare.');
    for (const s of SCELTE) {
      const b = crea('button', 'display:block;width:100%;margin:8px 0;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer', this.scheda);
      b.type = 'button';
      crea('div', '', b, s.titolo);
      crea('div', 'font-weight:400;font-size:12px;opacity:.75;margin-top:2px', b, s.sotto);
      b.addEventListener('click', () => {
        mago.potenzia(s.che);
        alCambio();
        if (mago.punti <= 0) this.velo.style.display = 'none';
        this.aggiorna();
      });
    }
    const chiudi = crea('button', 'margin-top:8px;padding:8px 16px;border-radius:999px;border:0;background:transparent;color:#fff;opacity:.7;font:13px system-ui,sans-serif;cursor:pointer', this.scheda, 'Più tardi');
    chiudi.type = 'button';
    chiudi.addEventListener('click', () => (this.velo.style.display = 'none'));
    this.punto.addEventListener('click', () => (this.velo.style.display = 'grid'));
  }

  /** Vero mentre la scelta è aperta: intanto il gioco non deve lanciare incantesimi. */
  get aperta(): boolean {
    return this.velo.style.display === 'grid';
  }

  aggiorna(): void {
    const m = this.mago;
    this.vita.style.width = `${(m.vita / m.vitaMassima) * 100}%`;
    this.mana.style.width = `${(m.mana / m.manaMassimo) * 100}%`;
    this.esperienza.style.width = `${(m.esperienza / esperienzaPer(m.livello)) * 100}%`;
    // Gli incantesimi che il mago ha addosso, con i secondi che restano.
    const addosso = ([['🛡️', m.scudo], ['💨', m.svelto], ['🦘', m.balzo], ['👻', m.invisibile]] as const)
      .filter(([, s]) => s > 0)
      .map(([segno, s]) => ` ${segno}${Math.ceil(s)}`)
      .join('');
    const testo = `Livello ${m.livello} · ◆ ${m.essenze}${addosso}`;
    if (testo !== this.ultimo) this.riga.textContent = this.ultimo = testo;
    this.punto.style.display = m.punti > 0 ? 'inline-block' : 'none';
    if (m.punti > 0) this.punto.textContent = m.punti === 1 ? '＋ 1 punto da spendere' : `＋ ${m.punti} punti da spendere`;
  }
}
