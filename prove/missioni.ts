/**
 * Prova senza grafica delle missioni: si accettano, si chiudono quando il mondo è nello stato chiesto, una soluzione
 * nuova vale il premio pieno e una ripetuta la metà, la parola si impara solo la prima volta, il fieno può andare perso.
 */
import { MISSIONI, Missioni, type MondoMissioni } from '../src/missioni.js';
import { PAROLE } from '../src/incantesimi/parole.js';
import { Mago } from '../src/mago.js';
import { REGOLE, Sfide } from '../src/sfide.js';
import { ZONE } from '../src/mondo/zone.js';
import { DURATA_GIORNO, Giornata } from '../src/giornata.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

const stato = { fiorito: 0, gelato: 0, fuoco: 0, bruciato: 0, golem: new Set<number>(), rasi: 0, numero: 0 };
const mondo: MondoMissioni = {
  fiorito: () => stato.fiorito,
  gelato: () => stato.gelato,
  inFiamme: () => stato.fuoco,
  bruciato: () => stato.bruciato,
  risana: () => {
    stato.fiorito = stato.gelato = stato.fuoco = stato.bruciato = 0;
  },
  accendi: () => {
    stato.fuoco = 0.3;
  },
  nasciGolem: () => {
    stato.golem.add(++stato.numero);
    return stato.numero;
  },
  golemVivo: (n) => stato.golem.has(n),
  luoghiRasi: () => stato.rasi,
};

verifica(MISSIONI.length === 5 && MISSIONI.every((m) => PAROLE.some((p) => p.parola === m.parola && p.prezzo > 0)), 'cinque missioni, ognuna insegna una parola che altrimenti si compra');
const q = new Missioni();

// L'orto: la prima volta insegna la parola; con lo stesso incantesimo vale la metà; con un altro di nuovo intero.
stato.fiorito = 0.9;
verifica(q.accetta('orto', mondo)?.chi === 'Bice' && stato.fiorito === 0, 'accettando la missione l’orto torna spoglio');
verifica(q.aggiorna(1, mondo, 'Crescita') === null, 'finché l’orto è spoglio la missione resta in corso');
stato.fiorito = 0.7;
const a = q.aggiorna(1, mondo, 'Crescita')!;
verifica(a.riuscita && a.nuova && a.parola === 'cielo' && a.esperienza === 40 && q.attiva === null, 'orto fiorito: missione compiuta, premio pieno e parola nuova');
q.accetta('orto', mondo);
stato.fiorito = 0.7;
const b = q.aggiorna(1, mondo, 'Crescita')!;
verifica(b.riuscita && !b.nuova && b.parola === undefined && b.esperienza === 20, 'stessa soluzione: mezzo premio, nessuna parola');
q.accetta('orto', mondo);
stato.fiorito = 0.7;
const c = q.aggiorna(1, mondo, 'Pioggia di fiori')!;
verifica(c.nuova && c.soluzioni === 2 && c.esperienza === 40, 'soluzione diversa: di nuovo premio pieno, e il quaderno ne conta due');

// Il fieno: spento in tempo riesce; lasciato bruciare fallisce.
q.accetta('fieno', mondo);
verifica(stato.fuoco > 0 && q.aggiorna(0.5, mondo, 'Gelo') === null, 'il fieno prende fuoco e la missione è in corso');
stato.fuoco = 0;
verifica(q.aggiorna(0.5, mondo, 'Gelo') === null, 'nel primo istante non si decide nulla');
const d = q.aggiorna(2, mondo, 'Gelo')!;
verifica(d.riuscita && d.parola === 'onda', 'fuoco spento con poco bruciato: missione compiuta');
q.accetta('fieno', mondo);
stato.fuoco = 0;
stato.bruciato = 0.8;
const e = q.aggiorna(3, mondo, 'Gelo')!;
verifica(!e.riuscita && e.esperienza === 0 && q.attiva === null, 'se brucia tutto la missione fallisce e si può riprovare');

// Il golem e il rudere.
q.accetta('golem', mondo);
verifica(stato.golem.size === 1 && q.aggiorna(1, mondo, 'Fuoco') === null, 'nasce il golem della missione');
stato.golem.clear();
verifica(q.aggiorna(1, mondo, 'Fuoco')?.parola === 'fulmine', 'golem sbriciolato: missione compiuta');
stato.rasi = 3;
q.accetta('rudere', mondo);
verifica(q.aggiorna(1, mondo, 'Esplosione') === null, 'i luoghi già in macerie non contano');
stato.rasi = 4;
verifica(q.aggiorna(1, mondo, 'Esplosione')?.riuscita === true, 'un luogo in più in macerie: missione compiuta');

// Cambiare abitante cambia missione, senza restare bloccati.
q.accetta('orto', mondo);
verifica(q.accetta('ghiaccio', mondo)?.id === 'ghiaccio' && q.attiva?.id === 'ghiaccio', 'si può passare a un’altra missione');

// --- le sfide e le regole delle terre ---
verifica(REGOLE.length === ZONE.length, 'ogni terra ha la sua regola');
const sf = new Sfide();
verifica(sf.entra(0) === null, 'la Radura non ha sfide: ha le missioni del villaggio');
verifica(sf.entra(2)?.servono === 3 && sf.entra(5) === null, 'entrando in una terra nuova parte una sfida, una sola alla volta');
verifica(sf.sbriciolata(5) === null && sf.attiva!.fatte === 0, 'le creature di un’altra terra non contano');
sf.sbriciolata(2);
sf.sbriciolata(2);
const vinta = sf.sbriciolata(2);
verifica(vinta?.zona === 2 && vinta.essenze > 0 && sf.attiva === null && sf.domate.has(2), 'tre creature sbriciolate: la terra è domata e dà il premio');
verifica(sf.entra(2) === null && sf.entra(5) !== null, 'una terra domata non sfida più; un’altra sì');
const vispo = new Mago();
vispo.spendi(60);
vispo.manaDellaTerra = 2;
vispo.aggiorna(1);
verifica(Math.abs(vispo.mana - 54) < 0.01, 'tra i cristalli il mana torna il doppio più in fretta');
vispo.ferisci(30);
vispo.vitaDellaTerra = true;
vispo.aggiorna(1);
verifica(vispo.vita > 70, 'tra i funghi la vita torna subito, senza aspettare la quiete');

// --- il giorno e la notte ---
const gg = new Giornata();
verifica(gg.momento === 'giorno' && gg.luce === 1 && !gg.notte, 'si comincia di giorno, in piena luce');
gg.aggiorna(DURATA_GIORNO * 0.65);
verifica(gg.momento === 'tramonto' && gg.luce > 0 && gg.luce < 1, 'al tramonto la luce cala piano');
gg.aggiorna(DURATA_GIORNO * 0.15);
verifica(gg.notte && gg.luce === 0, 'poi è notte');
gg.aggiorna(DURATA_GIORNO * 0.25);
verifica(gg.momento === 'giorno' && gg.luce === 1, 'e dopo l’alba torna il giorno');

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: le missioni si comportano bene.');
