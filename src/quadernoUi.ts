const crea = <K extends keyof HTMLElementTagNameMap>(tag: K, stile: string, padre: HTMLElement, testo = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = stile;
  e.textContent = testo;
  padre.appendChild(e);
  return e;
};

/** Un capitolo del quaderno: un titolo, una riga di riassunto e le sue voci. */
export interface Capitolo {
  readonly titolo: string;
  readonly riassunto: string;
  /** Ogni voce ha un nome e, sotto, una nota; `fatto` la mostra piena, altrimenti sbiadita (ancora da scoprire). */
  readonly voci: readonly { readonly nome: string; readonly nota: string; readonly fatto: boolean }[];
}

/** Il quaderno del mago: che cosa ha imparato, risolto, incontrato e liberato finora. */
export class QuadernoUi {
  readonly pulsante: HTMLButtonElement;
  private readonly velo: HTMLElement;
  private readonly pagine: HTMLElement;
  onChiudi: () => void = () => undefined;

  constructor() {
    this.pulsante = crea('button', 'position:fixed;z-index:3;right:12px;top:178px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(14,16,22,.5);color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)', document.body, '📖 Quaderno');
    this.pulsante.type = 'button';
    this.velo = crea('div', 'display:none;position:fixed;inset:0;z-index:8;place-items:center;background:rgba(8,10,16,.6)', document.body);
    const foglio = crea('div', 'box-sizing:border-box;width:min(94vw,460px);max-height:90vh;overflow:auto;padding:18px;border-radius:16px;background:rgba(18,20,28,.96);border:1px solid rgba(255,255,255,.2);color:#fff;font:14px/1.4 system-ui,sans-serif', this.velo);
    crea('div', 'font:italic 600 25px Georgia,serif', foglio, 'Il quaderno del mago');
    this.pagine = crea('div', '', foglio);
    const chiudi = crea('button', 'margin-top:12px;padding:10px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(18,20,28,.98);color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;position:sticky;bottom:-8px', foglio, 'Chiudi');
    chiudi.type = 'button';
    chiudi.addEventListener('click', () => this.chiudi());
    // Toccare fuori dal foglio lo chiude.
    this.velo.addEventListener('click', (e) => {
      if (e.target === this.velo) this.chiudi();
    });
  }

  get aperta(): boolean {
    return this.velo.style.display === 'grid';
  }

  apri(capitoli: readonly Capitolo[]): void {
    this.pagine.replaceChildren();
    for (const c of capitoli) {
      crea('div', 'margin:14px 0 2px;font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:#e9c46a', this.pagine, c.titolo);
      crea('div', 'font-size:13px;opacity:.8;margin-bottom:6px', this.pagine, c.riassunto);
      for (const v of c.voci) {
        const riga = crea('div', `padding:7px 10px;margin:4px 0;border-radius:10px;background:rgba(255,255,255,${v.fatto ? '.08' : '.03'});opacity:${v.fatto ? '1' : '.55'}`, this.pagine);
        crea('div', 'font-weight:600', riga, v.nome);
        crea('div', 'font-size:12px;opacity:.8', riga, v.nota);
      }
    }
    this.velo.style.display = 'grid';
  }

  chiudi(): void {
    this.velo.style.display = 'none';
    this.onChiudi();
  }
}
