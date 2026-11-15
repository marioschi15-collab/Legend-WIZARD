/** Un posto in cui si può arrivare con il viaggio rapido. */
export interface Meta {
  readonly nome: string;
  readonly x: number;
  readonly z: number;
}

const crea = <K extends keyof HTMLElementTagNameMap>(tag: K, stile: string, padre: HTMLElement, testo = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  e.style.cssText = stile;
  e.textContent = testo;
  padre.appendChild(e);
  return e;
};
const VERSI = ['nord', 'nord-est', 'est', 'sud-est', 'sud', 'sud-ovest', 'ovest', 'nord-ovest'];

/** Il viaggio rapido: l'elenco dei luoghi liberati dal loro guardiano, più il villaggio di partenza. */
export class ViaggioUi {
  readonly pulsante: HTMLButtonElement;
  private readonly velo: HTMLElement;
  private readonly elenco: HTMLElement;
  onViaggio: (meta: Meta) => void = () => undefined;
  onChiudi: () => void = () => undefined;

  constructor() {
    this.pulsante = crea('button', 'position:fixed;z-index:3;right:12px;top:136px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.25);background:rgba(14,16,22,.5);color:#fff;font:600 13px system-ui,sans-serif;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px)', document.body, '🧭 Viaggio rapido');
    this.pulsante.type = 'button';
    this.velo = crea('div', 'display:none;position:fixed;inset:0;z-index:8;place-items:center;background:rgba(8,10,16,.6)', document.body);
    const foglio = crea('div', 'box-sizing:border-box;width:min(92vw,380px);max-height:88vh;overflow:auto;padding:18px;border-radius:16px;background:rgba(18,20,28,.96);border:1px solid rgba(255,255,255,.2);color:#fff;font:14px/1.4 system-ui,sans-serif', this.velo);
    crea('div', 'font:italic 600 25px Georgia,serif', foglio, 'Viaggio rapido');
    crea('div', 'opacity:.8;font-size:13px;margin:4px 0 10px', foglio, 'Puoi tornare in un attimo nei luoghi che hai liberato dal loro guardiano.');
    this.elenco = crea('div', '', foglio);
    const chiudi = crea('button', 'margin-top:10px;padding:10px 16px;border-radius:10px;border:1px solid rgba(255,255,255,.3);background:rgba(18,20,28,.98);color:#fff;font:600 14px system-ui,sans-serif;cursor:pointer;position:sticky;bottom:-8px', foglio, 'Chiudi');
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

  apri(mete: readonly Meta[], x: number, z: number): void {
    this.elenco.replaceChildren();
    for (const m of mete) {
      const metri = Math.round(Math.hypot(m.x - x, m.z - z) / 10) * 10;
      // Il nord è verso le z che scendono, come sulla mappa.
      const verso = VERSI[Math.round(((Math.atan2(m.x - x, -(m.z - z)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 4)) % 8]!;
      const b = crea('button', 'display:block;width:100%;margin:6px 0;padding:11px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:rgba(255,255,255,.08);color:#fff;font:600 15px system-ui,sans-serif;cursor:pointer;text-align:left', this.elenco);
      b.type = 'button';
      crea('div', '', b, m.nome);
      crea('div', 'font-weight:400;font-size:12px;opacity:.75;margin-top:2px', b, metri < 30 ? 'sei qui' : `a ${metri} metri, verso ${verso}`);
      b.addEventListener('click', () => {
        this.chiudi();
        this.onViaggio(m);
      });
    }
    if (mete.length === 1) crea('div', 'margin-top:8px;font-size:13px;opacity:.75', this.elenco, 'Per ora c’è solo il villaggio: ogni luogo ha un guardiano con la corona, battilo per liberarlo.');
    this.velo.style.display = 'grid';
  }

  chiudi(): void {
    this.velo.style.display = 'none';
    this.onChiudi();
  }
}
