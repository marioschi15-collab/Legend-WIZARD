import { costoDi, type Mago } from './mago.js';
import { creaDaRicetta, MASSIMO_RICETTE, type Ricetta } from './incantesimi/officina.js';
import { leggi, PAROLE, salvaConosciute, type Parola } from './incantesimi/parole.js';

const crea = <K extends keyof HTMLElementTagNameMap>(tag: K, stile: string, padre: HTMLElement, testo = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = stile;
  e.textContent = testo;
  padre.appendChild(e);
  return e;
};
const TITOLI = { forma: 'Come parte', effetto: 'Che cosa fa', misura: 'Quanto è grande e forte' } as const;
const PILLOLA = 'display:inline-block;margin:3px;padding:6px 10px;border-radius:999px;font:600 13px system-ui,sans-serif;';

/** Il foglio dove si scrive un incantesimo a parole, si vedono le parole conosciute e se ne imparano di nuove. */
export class ParoleUi {
  private readonly velo: HTMLElement;
  private readonly testo: HTMLInputElement;
  private readonly esito: HTMLElement;
  private readonly elenco: HTMLElement;
  private readonly crea: HTMLButtonElement;
  readonly pulsante: HTMLButtonElement;
  private ricetta: Ricetta | null = null;
  private quante = 0;
  /** Chiamata con l'incantesimo pronto: chi la riceve lo mette sul bastone. */
  onCreato: (ricetta: Ricetta) => void = () => undefined;
  onChiudi: () => void = () => undefined;
  onImparata: (parola: Parola) => void = () => undefined;

  constructor(private readonly mago: Mago, private readonly conosciute: Set<string>) {
    this.pulsante = crea('button', 'position:fixed;z-index:3;right:12px;top:94px;padding:9px 14px;border-radius:999px;border:1px solid rgba(233,196,106,.7);background:rgba(14,16,22,.5);color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)', document.body, '✎ Scrivi un incantesimo');
    this.pulsante.type = 'button';
    this.velo = crea('div', 'display:none;position:fixed;inset:0;z-index:8;place-items:center;background:rgba(8,10,16,.6)', document.body);
    const foglio = crea('div', 'box-sizing:border-box;width:min(94vw,440px);max-height:92vh;overflow:auto;padding:18px;border-radius:16px;background:rgba(18,20,28,.96);border:1px solid rgba(255,255,255,.2);color:#fff;font:14px/1.4 system-ui,sans-serif', this.velo);
    crea('div', 'font:italic 600 25px Georgia,serif', foglio, 'Scrivi un incantesimo');
    crea('div', 'opacity:.8;font-size:13px;margin:4px 0 10px', foglio, 'Usa le parole che conosci, per esempio «pioggia di fuoco piccola». Il gioco capisce solo queste parole, non qualsiasi frase.');
    this.testo = crea('input', 'box-sizing:border-box;width:100%;padding:11px 12px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.08);color:#fff;font:16px system-ui,sans-serif', foglio);
    this.testo.type = 'text';
    this.testo.maxLength = 60;
    this.testo.placeholder = 'pioggia di fuoco piccola';
    this.testo.autocomplete = 'off';
    this.testo.setAttribute('autocapitalize', 'off');
    this.testo.setAttribute('enterkeyhint', 'done');
    this.esito = crea('div', 'min-height:54px;margin:8px 0;font-size:13px', foglio);
    const riga = crea('div', 'display:flex;gap:8px;margin-bottom:12px', foglio);
    this.crea = crea('button', 'flex:1;padding:11px;border-radius:10px;border:0;background:#e9c46a;color:#1a1408;font:700 15px system-ui,sans-serif;cursor:pointer', riga, 'Crea e usa');
    this.crea.type = 'button';
    const chiudi = crea('button', 'padding:11px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:transparent;color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer', riga, 'Chiudi');
    chiudi.type = 'button';
    this.elenco = crea('div', '', foglio);

    this.pulsante.addEventListener('click', () => this.apri(this.quante));
    chiudi.addEventListener('click', () => this.chiudi());
    this.testo.addEventListener('input', () => this.rileggi());
    this.testo.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') this.testo.blur();
    });
    this.testo.addEventListener('keyup', (e) => e.stopPropagation());
    this.crea.addEventListener('click', () => {
      if (!this.ricetta) return;
      this.onCreato(this.ricetta);
      this.chiudi();
    });
  }

  get aperta(): boolean {
    return this.velo.style.display === 'grid';
  }

  /** `quante`: quanti incantesimi inventati ci sono già sul bastone (c'è posto per otto). */
  apri(quante: number): void {
    this.quante = quante;
    this.velo.style.display = 'grid';
    this.rileggi();
    this.scriviElenco();
  }

  /** Dice al foglio quanti incantesimi inventati ci sono, così sa se c'è ancora posto. */
  posti(quante: number): void {
    this.quante = quante;
  }

  chiudi(): void {
    this.velo.style.display = 'none';
    this.testo.blur();
    this.onChiudi();
  }

  private rileggi(): void {
    const l = leggi(this.testo.value, this.conosciute);
    this.ricetta = l.ricetta;
    this.esito.replaceChildren();
    if (this.testo.value.trim() === '') {
      crea('div', 'opacity:.7', this.esito, 'Scrivi qui sopra, oppure tocca le parole qui sotto.');
    } else {
      for (const x of l.capite) crea('span', PILLOLA + 'background:rgba(120,220,140,.2);border:1px solid rgba(120,220,140,.6)', this.esito, x.parola);
      for (const x of l.daImparare) crea('span', PILLOLA + 'background:rgba(233,196,106,.15);border:1px dashed #e9c46a', this.esito, `${x.parola}: da imparare (◆ ${x.prezzo})`);
      for (const x of l.ignote) crea('span', PILLOLA + 'background:rgba(255,120,100,.15);border:1px solid rgba(255,120,100,.6)', this.esito, x.forse ? `«${x.scritta}»? forse ${x.forse.parola}` : `«${x.scritta}» non la conosco`);
      const pieno = this.quante >= MASSIMO_RICETTE;
      const nota = l.ricetta
        ? pieno
          ? `Hai già ${MASSIMO_RICETTE} incantesimi inventati: eliminane uno dall’officina (il ＋ in basso).`
          : `${l.messaggio}. Costa ${costoDi(creaDaRicetta(l.ricetta))} di mana.`
        : l.messaggio;
      crea('div', 'margin-top:6px;opacity:.9', this.esito, nota);
      if (pieno) this.ricetta = null;
    }
    this.crea.disabled = !this.ricetta;
    this.crea.style.opacity = this.ricetta ? '1' : '.45';
  }

  private scriviElenco(): void {
    this.elenco.replaceChildren();
    crea('div', 'margin-bottom:4px;font-weight:700', this.elenco, `Le tue essenze: ◆ ${this.mago.essenze}`);
    for (const famiglia of ['forma', 'effetto', 'misura'] as const) {
      crea('div', 'margin:10px 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;opacity:.65', this.elenco, TITOLI[famiglia]);
      for (const x of PAROLE.filter((y) => y.famiglia === famiglia)) {
        const nota = this.conosciute.has(x.parola);
        const b = crea('button', PILLOLA + `cursor:pointer;color:#fff;${nota ? 'background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.3)' : 'background:rgba(233,196,106,.12);border:1px dashed #e9c46a'}`, this.elenco, nota ? x.parola : `${x.parola} · ◆ ${x.prezzo}`);
        b.type = 'button';
        b.title = x.cosaFa;
        b.addEventListener('click', () => {
          if (nota) {
            this.testo.value = `${this.testo.value.trim()} ${x.parola}`.trim();
            this.rileggi();
          } else if (this.mago.spendiEssenze(x.prezzo)) {
            this.conosciute.add(x.parola);
            salvaConosciute(this.conosciute);
            this.onImparata(x);
            this.rileggi();
            this.scriviElenco();
          } else {
            b.textContent = `${x.parola} · servono ◆ ${x.prezzo}`;
          }
        });
      }
    }
    crea('div', 'margin-top:10px;font-size:12px;opacity:.65', this.elenco, 'Le parole tratteggiate si imparano con le essenze (◆), che lasciano i golem.');
  }
}
