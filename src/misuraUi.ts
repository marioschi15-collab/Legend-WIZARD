import { giudizio, resoconto, type Esito } from './misura.js';

const CARTA = 'background:rgba(14,16,22,.92);color:#f2ead8;font:500 15px system-ui,sans-serif;border:1px solid rgba(255,255,255,.25);border-radius:14px;';
const BOTTONE = 'padding:10px 16px;border-radius:999px;border:1px solid rgba(255,255,255,.35);background:#e9c46a;color:#1d1a14;font:600 15px system-ui,sans-serif;cursor:pointer;margin:6px 8px 0 0;';
const COLORI = { fluido: '#9be38a', giocabile: '#f0d27a', 'a scatti': '#ff9a8a' } as const;

/** Ciò che si vede durante la misura della fluidità (una striscia in alto) e alla fine (il risultato). */
export class MisuraUi {
  private readonly striscia = document.createElement('div');
  private readonly riga = document.createElement('div');

  constructor() {
    this.striscia.setAttribute('style', `${CARTA}position:fixed;left:50%;top:14px;transform:translateX(-50%);padding:12px 18px;z-index:50;text-align:center;max-width:92vw;`);
    const titolo = document.createElement('div');
    titolo.textContent = 'Sto misurando quanto è fluido il gioco su questo dispositivo. Lascia questa finestra in primo piano e non toccare niente: ci vogliono circa due minuti.';
    this.riga.setAttribute('style', 'margin-top:6px;color:#e9c46a;font-weight:700;');
    this.striscia.append(titolo, this.riga);
    document.body.append(this.striscia);
  }

  stato(testo: string): void {
    if (this.riga.textContent !== testo) this.riga.textContent = testo;
  }

  /** Il risultato: un giudizio per ogni posto, e il testo da copiare e mandare a chi sviluppa. */
  mostra(esiti: readonly Esito[], dispositivo: string, versione: string, onChiudi: () => void): void {
    this.striscia.remove();
    const velo = document.createElement('div');
    velo.setAttribute('style', 'position:fixed;inset:0;z-index:60;background:rgba(6,8,12,.72);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto;');
    const carta = document.createElement('div');
    carta.setAttribute('style', `${CARTA}padding:20px 22px;max-width:760px;width:100%;max-height:94vh;overflow:auto;`);
    const titolo = document.createElement('h2');
    titolo.textContent = 'Com’è andata la misura';
    titolo.setAttribute('style', 'margin:0 0 4px;font:700 22px system-ui,sans-serif;');
    const sotto = document.createElement('p');
    sotto.textContent = 'Misurato al massimo dettaglio. Per ogni posto: quante immagini al secondo escono in media e nei momenti peggiori (60 è il massimo che serve, sotto 30 si vede a scatti).';
    sotto.setAttribute('style', 'margin:0 0 12px;opacity:.85;');
    const tabella = document.createElement('table');
    tabella.setAttribute('style', 'width:100%;border-collapse:collapse;margin-bottom:12px;');
    for (const e of esiti) {
      const g = giudizio(e);
      const riga = document.createElement('tr');
      for (const [testo, stile] of [
        [e.nome, 'padding:5px 8px 5px 0;'],
        [`${Math.round(e.medie)} al secondo`, 'padding:5px 8px;white-space:nowrap;text-align:right;'],
        [`peggiori ${Math.round(e.peggiori)}`, 'padding:5px 8px;white-space:nowrap;text-align:right;opacity:.8;'],
        [g, `padding:5px 0 5px 8px;white-space:nowrap;font-weight:700;color:${COLORI[g]};`],
      ] as const) {
        const cella = document.createElement('td');
        cella.textContent = testo;
        cella.setAttribute('style', `${stile}border-bottom:1px solid rgba(255,255,255,.12);`);
        riga.append(cella);
      }
      tabella.append(riga);
    }
    const invito = document.createElement('p');
    invito.textContent = 'Per farlo sapere a chi sviluppa il gioco, copia questo testo e mandaglielo:';
    invito.setAttribute('style', 'margin:0 0 6px;');
    const testo = document.createElement('textarea');
    testo.value = resoconto(esiti, dispositivo, versione);
    testo.readOnly = true;
    testo.setAttribute('style', 'width:100%;height:150px;box-sizing:border-box;background:#0c0e13;color:#d8d2c2;border:1px solid rgba(255,255,255,.25);border-radius:8px;padding:8px;font:12px ui-monospace,monospace;');
    const copia = document.createElement('button');
    copia.type = 'button';
    copia.textContent = 'Copia il risultato';
    copia.setAttribute('style', BOTTONE);
    copia.addEventListener('click', () => {
      testo.select();
      const fatto = (): void => {
        copia.textContent = 'Copiato ✓';
      };
      if (navigator.clipboard) navigator.clipboard.writeText(testo.value).then(fatto, () => document.execCommand('copy') && fatto());
      else if (document.execCommand('copy')) fatto();
    });
    const chiudi = document.createElement('button');
    chiudi.type = 'button';
    chiudi.textContent = 'Torna al gioco';
    chiudi.setAttribute('style', BOTTONE.replace('#e9c46a', 'transparent').replace('#1d1a14', '#f2ead8'));
    chiudi.addEventListener('click', onChiudi);
    carta.append(titolo, sotto, tabella, invito, testo, copia, chiudi);
    velo.append(carta);
    document.body.append(velo);
  }
}
