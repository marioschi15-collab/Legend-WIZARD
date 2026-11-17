/**
 * Prova senza grafica della misura della fluidità: il giro deve passare da ogni posto, aspettare che tutto sia
 * arrivato, contare bene le immagini al secondo (in media e nei momenti peggiori), far scoppiare dove è previsto e
 * rimettere a posto, non farsi ingannare da una finestra finita in secondo piano, e dare un giudizio in parole.
 */
import { giudizio, Misura, resoconto, type Sosta } from '../src/misura.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

const soste: Sosta[] = [
  { nome: 'Villaggio', x: 0, z: 41, guarda: 0, scoppio: { x: 0, z: 18 } },
  { nome: 'Porto', x: 390, z: 90, guarda: 1 },
  { nome: 'Castello', x: -700, z: 330, guarda: 2 },
];
const visti: string[] = [];
let scoppi = 0;
let rimessi = 0;
let pronto = false;
let giri = 0;
const m = new Misura(soste, {
  vai: (x, z) => {
    visti.push(`${x},${z}`);
    pronto = false;
  },
  gira: () => giri++,
  pronto: () => pronto,
  scoppio: () => scoppi++,
  rimetti: () => rimessi++,
  disegnato: () => ({ triangoli: 420000, disegni: 300 }),
});

// Quanto è veloce il dispositivo finto in ogni posto: 60 al villaggio, 40 al porto con uno scatto ogni tanto, 20 al castello.
const passo = (): number => {
  const dove = visti.length;
  if (dove === 1) return 1 / 60;
  if (dove === 2) return 1 / 40;
  return 1 / 20;
};
verifica(visti.length === 1 && m.stato.includes('Villaggio') && m.stato.includes('1 di 3'), `si parte dal primo posto (${m.stato})`);
// Finché le forme non sono arrivate non si misura (ma non si aspetta per sempre).
for (let i = 0; i < 180; i++) m.fotogramma(1 / 60, 2);
verifica(m.esiti.length === 0 && giri === 0, 'finché il posto non è pronto non si misura');
pronto = true;
let n = 0;
let nascosta = false;
while (!m.finita && n < 200000) {
  n++;
  pronto = true;
  let dt = passo();
  // Al porto ogni venti immagini ce n'è una lenta (un decimo di secondo): è uno scatto.
  if (visti.length === 2 && n % 20 === 0) dt = 0.1;
  // Una volta, al castello, la finestra finisce dietro un'altra per trenta secondi: non deve contare come lentezza.
  if (visti.length === 3 && !nascosta && m.stato.includes('misuro')) {
    nascosta = true;
    m.fotogramma(30, 2, true);
  }
  m.fotogramma(dt, 2.5);
}
verifica(m.finita && visti.join(' ') === '0,41 390,90 -700,330', `il giro passa da tutti i posti, in ordine (${visti.join(' ')})`);
verifica(scoppi === 1 && rimessi === 1, `fa scoppiare solo dove è previsto, e poi rimette a posto (${scoppi}, ${rimessi})`);
verifica(m.esiti.length === 4, `un esito per posto, più uno per lo scoppio (${m.esiti.length})`);
const [villaggio, crollo, porto, castello] = m.esiti;
verifica(!!villaggio && Math.abs(villaggio.medie - 60) < 1 && Math.abs(villaggio.peggiori - 60) < 1 && giudizio(villaggio) === 'fluido', `a 60 al secondo è fluido (${villaggio?.medie.toFixed(1)})`);
verifica(!!crollo && crollo.nome.includes('scoppio') && Math.abs(crollo.medie - 60) < 1, 'lo scoppio ha la sua riga');
verifica(!!porto && porto.medie > 33 && porto.medie < 40 && porto.scatti > 5 && porto.peggiori < 12 && giudizio(porto) === 'giocabile',
  `con uno scatto ogni venti immagini la media regge ma i momenti peggiori no (${porto?.medie.toFixed(1)}, ${porto?.peggiori.toFixed(1)}, ${porto?.scatti} scatti)`);
verifica(!!castello && Math.abs(castello.medie - 20) < 1 && giudizio(castello) === 'a scatti', `a 20 al secondo va a scatti, e la finestra nascosta non conta (${castello?.medie.toFixed(1)})`);
verifica(!!villaggio && Math.abs(villaggio.conti - 2.5) < 0.01 && villaggio.triangoli === 420000, 'si ricordano anche i conti del gioco e quanto si disegna');
const testo = resoconto(m.esiti, 'Scheda grafica: di prova', 'oggi');
verifica(testo.split('\n').length === 6 && testo.includes('Porto: ') && testo.includes('420 mila') && testo.includes('giocabile'), 'il testo da mandare ha una riga per posto');
verifica(m.fotogramma(1 / 60, 1) === true, 'finito il giro non succede più niente');

// Un dispositivo lentissimo (due secondi per immagine) non deve far impantanare il giro: finisce e lo dice.
let lente = 0;
const lumaca = new Misura([{ nome: 'Lento', x: 0, z: 0, guarda: 0 }], { vai: () => undefined, gira: () => undefined, pronto: () => true, scoppio: () => undefined, rimetti: () => undefined, disegnato: () => ({ triangoli: 1, disegni: 1 }) });
while (!lumaca.finita && lente < 100) {
  lente++;
  lumaca.fotogramma(2, 900);
}
verifica(lumaca.finita && lente < 12 && Math.abs((lumaca.esiti[0]?.medie ?? 0) - 0.5) < 0.01 && giudizio(lumaca.esiti[0]!) === 'a scatti', `anche a mezza immagine al secondo il giro finisce (${lente} immagini)`);

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: la misura della fluidità conta bene.');
