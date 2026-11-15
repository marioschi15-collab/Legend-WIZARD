/**
 * Prova senza grafica del mago e delle creature: il mana si spende e torna, i livelli danno punti, cadere non
 * toglie i progressi; un golem insegue, colpisce, e un botto lo sbriciola lasciando il premio.
 */
import * as THREE from 'three';
import { Creature, SPECIE } from '../src/creature.js';
import { costoDi, esperienzaPer, Mago } from '../src/mago.js';
import { INCANTESIMI } from '../src/incantesimi/elenco.js';
import { codifica, creaDaRicetta, decodifica, EFFETTI, FORME } from '../src/incantesimi/officina.js';
import { leggi, PAROLE } from '../src/incantesimi/parole.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

// --- il mago ---
const mago = new Mago();
const fuoco = INCANTESIMI[0]!;
const costo = costoDi(fuoco);
verifica(costo > 0 && costo <= 60, `il costo del primo incantesimo è sensato (${costo})`);
verifica(INCANTESIMI.every((m) => costoDi(m) <= mago.manaMassimo), 'ogni incantesimo si può lanciare con il mana pieno');
let lanci = 0;
while (mago.spendi(costo)) lanci++;
verifica(lanci >= 3 && mago.mana < costo, `il mana finisce dopo qualche lancio (${lanci})`);
for (let i = 0; i < 60 * 30; i++) mago.aggiorna(1 / 60);
verifica(mago.mana === mago.manaMassimo, 'in mezzo minuto il mana torna pieno');

const saliti = mago.guadagna(esperienzaPer(1) + 5, 10);
verifica(saliti === 1 && mago.livello === 2 && mago.punti === 1, 'con abbastanza esperienza si sale di un livello e si ha un punto');
verifica(mago.potenzia('vita') && mago.vitaMassima === 120 && mago.punti === 0, 'il punto speso alza la vita massima');
verifica(!mago.potenzia('mana'), 'senza punti non si potenzia');

verifica(!mago.ferisci(50), 'una ferita piccola non fa cadere');
verifica(mago.ferisci(500), 'una ferita enorme fa cadere');
const perse = mago.rinasci();
verifica(perse === 2 && mago.essenze === 8 && mago.livello === 2 && mago.vita === mago.vitaMassima, 'cadendo si perde un quinto delle essenze e nient’altro');

// --- le creature ---
const N = 64;
const suolo = { cella: () => 0, fuoco: new Float32Array(N), gelo: new Float32Array(N) };
let seme = 5;
const caso = (): number => (seme = (seme * 16807) % 2147483647) / 2147483647;
const creature = new Creature(() => 0, suolo, -0.55, caso);
const giocatore = new THREE.Vector3(500, 0, 500);
creature.nasci(515, 500, 1);
verifica(creature.vive === 1, 'il golem nasce');
let danno = 0;
for (let i = 0; i < 60 * 8; i++) danno += creature.aggiorna(1 / 60, giocatore);
const dove = creature.vicina(giocatore)!;
verifica(dove.distanceTo(giocatore) < 3.1, `il golem raggiunge chi gioca (è a ${dove.distanceTo(giocatore).toFixed(1)} m)`);
verifica(danno > 0, `e lo colpisce (danno ${danno})`);

creature.urto(dove.clone(), 1.6);
creature.aggiorna(1 / 60, giocatore);
const premi = creature.ritira();
verifica(premi.length === 1 && premi[0]!.esperienza > 0 && premi[0]!.essenze > 0, 'un botto forte lo sbriciola e lascia il premio');

// Il fuoco sotto i piedi lo consuma da solo.
const prima = creature.vive;
creature.nasci(530, 500, 1);
suolo.fuoco[0] = 1;
for (let i = 0; i < 60 * 6; i++) creature.aggiorna(1 / 60, giocatore);
verifica(creature.vive <= prima && creature.ritira().length >= 1, 'il fuoco consuma il golem');
suolo.fuoco[0] = 0;

// Ogni terra ha la sua razza, con immunità e punti deboli.
const terre = new Creature(() => 0, suolo, -0.55, caso, () => 2);
const n = terre.nasci(600, 600, 1);
verifica(terre.razzaVicina(new THREE.Vector3(600, 0, 600), 5) === SPECIE.sentinella, 'tra i ghiacci nasce la sentinella di ghiaccio');
suolo.gelo[0] = 1;
for (let i = 0; i < 60 * 20; i++) terre.aggiorna(1 / 60, new THREE.Vector3(600, 0, 700));
verifica(terre.vivo(n), 'il gelo non fa nulla alla sentinella');
suolo.gelo[0] = 0;
suolo.fuoco[0] = 1;
for (let i = 0; i < 60 * 3; i++) terre.aggiorna(1 / 60, new THREE.Vector3(600, 0, 700));
verifica(!terre.vivo(n), 'il fuoco la scioglie in fretta');
suolo.fuoco[0] = 1;
const lava = new Creature(() => 0, suolo, -0.55, caso, () => 4);
const dv = lava.nasci(600, 600, 1);
for (let i = 0; i < 60 * 20; i++) lava.aggiorna(1 / 60, new THREE.Vector3(600, 0, 700));
verifica(lava.vivo(dv), 'il diavoletto di lava nel fuoco ci sguazza');
suolo.fuoco[0] = 0;
// Il guardiano è più duro di una creatura qualunque e lascia un premio più ricco.
const g1 = new Creature(() => 0, suolo, -0.55, caso);
const gn = g1.nasci(600, 600, 2, true, undefined, true);
g1.urto(new THREE.Vector3(600, 0, 600), 1.6);
g1.aggiorna(1 / 60, new THREE.Vector3(600, 0, 700));
verifica(g1.vivo(gn), 'un botto solo non basta per un guardiano');
for (let i = 0; i < 6; i++) g1.urto(new THREE.Vector3(600, 0, 600), 1.6);
g1.aggiorna(1 / 60, new THREE.Vector3(600, 0, 700));
const pg = g1.ritira();
verifica(pg.length === 1 && pg[0]!.guardiano && pg[0]!.numero === gn && pg[0]!.esperienza >= 100, 'battuto, il guardiano lascia un premio ricco');

// Vicino al villaggio non nasce nulla.
const casa = new Creature(() => 0, suolo, -0.55, caso);
for (let i = 0; i < 60 * 30; i++) casa.aggiorna(1 / 60, new THREE.Vector3(10, 0, 30));
verifica(casa.vive === 0, 'attorno al villaggio non nascono creature');
// Lontano sì.
const lontano = new Creature(() => 0, suolo, -0.55, caso);
for (let i = 0; i < 60 * 30; i++) lontano.aggiorna(1 / 60, new THREE.Vector3(900, 0, 900));
verifica(lontano.vive > 0 && lontano.vive <= 4, `lontano dal villaggio nascono creature, ma poche (${lontano.vive})`);

// --- la magia che non rompe: stati delle creature, golem amico, scudo ---
const zoo = new Creature(() => 0, suolo, -0.55, caso);
const qui = new THREE.Vector3(700, 0, 700);
const chi = new THREE.Vector3(708, 0, 700);
const z1 = zoo.nasci(708, 700, 1, true);
verifica(zoo.stato(chi, 5, 'sonno', 6) === 1, 'il sonno prende la creatura nel cerchio');
let dz = 0;
for (let i = 0; i < 60 * 4; i++) dz += zoo.aggiorna(1 / 60, qui);
verifica(dz === 0 && zoo.vicina(qui)!.distanceTo(chi) < 0.5, 'chi dorme non si muove e non colpisce');
zoo.stato(chi, 5, 'paura', 4);
zoo.ferisciIntorno(chi, 5, 2);
for (let i = 0; i < 60 * 2; i++) zoo.aggiorna(1 / 60, qui);
verifica(zoo.vicina(qui)!.distanceTo(qui) > 9, 'una ferita la sveglia, e con la paura scappa');
for (let i = 0; i < 60 * 5; i++) zoo.aggiorna(1 / 60, qui, true);
const dopo = zoo.vicina(qui)!.distanceTo(qui);
for (let i = 0; i < 60 * 3; i++) dz += zoo.aggiorna(1 / 60, qui, true);
verifica(dz === 0 && Math.abs(zoo.vicina(qui)!.distanceTo(qui) - dopo) < 0.5, 'se il mago è invisibile la creatura non lo insegue');
zoo.evoca(702, 700, 30);
for (let i = 0; i < 60 * 25 && zoo.vivo(z1); i++) zoo.aggiorna(1 / 60, qui, true);
verifica(!zoo.vivo(z1) && zoo.ritira().length === 1, 'il golem amico sbriciola la creatura ostile, e il premio va a chi gioca');
for (let i = 0; i < 60 * 31; i++) zoo.aggiorna(1 / 60, qui, true);
// Intanto, lontano dal villaggio, sono nate altre creature: si guarda solo che l'amico non ci sia più.
verifica(zoo.vive === zoo.bersagli(qui, 500).length && zoo.ritira().length === 0, 'finito il tempo il golem amico si sbriciola senza lasciare premi');
const coperto = new Mago();
coperto.scudo = 5;
coperto.ferisci(40);
verifica(coperto.vita === 90, 'con lo scudo una ferita da 40 ne toglie 10');

// --- gli incantesimi a parole ---
const note = new Set(PAROLE.filter((x) => x.prezzo === 0).map((x) => x.parola));
const a = leggi('Pioggia di fuoco piccola', note);
verifica(a.ricetta?.forma === 'pioggia' && a.ricetta.effetti.join() === 'brucia' && a.ricetta.ampiezza === 1, '«pioggia di fuoco piccola» diventa una pioggia che brucia, stretta');
const b = leggi('fiamme e GHIACCIO grandi', note);
verifica(b.ricetta?.forma === 'palla' && b.ricetta.effetti.join() === 'brucia,gela' && b.ricetta.ampiezza === 3, 'senza forma è una palla; sinonimi, maiuscole e plurali si capiscono');
const c = leggi('palla di fulmine', note);
verifica(c.ricetta === null && c.daImparare[0]?.parola === 'fulmine', 'una parola non ancora imparata non si può usare, e il gioco lo dice');
const d = leggi('palla di fuocco e drago', note);
verifica(d.ricetta === null && d.ignote[0]?.forse?.parola === 'fuoco' && d.ignote[1]?.scritta === 'drago' && !d.ignote[1]?.forse, 'una parola scritta male ha un suggerimento; una mai sentita viene segnalata');
verifica(leggi('grande', note).ricetta === null, 'senza un effetto non c’è incantesimo');
const tutte = new Set(PAROLE.map((x) => x.parola));
const e = leggi('onda gigante di fulmine vortice cristallo tempo', tutte);
verifica(e.ricetta?.effetti.length === 3 && e.ricetta.potenza === 3 && e.ricetta.ampiezza === 3, 'al massimo tre effetti; «gigante» alza forza e ampiezza');
verifica(costoDi(creaDaRicetta(e.ricetta!)) > costoDi(creaDaRicetta(a.ricetta!)), 'più parole e più forti: più mana');
const f = leggi('scudo e cura su di me', tutte);
verifica(f.ricetta?.forma === 'me' && f.ricetta.effetti.join() === 'scudo,cura', '«scudo e cura su di me» è un incantesimo su se stessi');
const h = leggi('trappola di sonno e veleno', tutte);
verifica(h.ricetta?.forma === 'mina' && h.ricetta.effetti.join() === 'sonno,veleno', 'le trappole e gli stati delle creature si scrivono a parole');
verifica(PAROLE.filter((x) => x.famiglia === 'effetto').length >= 30 && PAROLE.filter((x) => x.famiglia === 'forma').length >= 9, 'almeno trenta effetti e nove forme');
verifica(PAROLE.every((x) => (x.forma ? FORME.some((y) => y.id === x.forma) : true) && (x.effetto ? EFFETTI.some((y) => y.id === x.effetto) : true)) && EFFETTI.every((y) => PAROLE.some((x) => x.effetto === y.id)) && FORME.every((y) => PAROLE.some((x) => x.forma === y.id)), 'ogni forma e ogni effetto ha la sua parola, e viceversa');
const m = leggi('palla di fuoco doppia che rimbalza', tutte);
verifica(m.ricetta?.modi?.join() === 'doppio,rimbalza' && costoDi(creaDaRicetta(m.ricetta)) > costoDi(creaDaRicetta(leggi('palla di fuoco', tutte).ricetta!)), 'i comportamenti si scrivono a parole e costano mana in più');
const giro = decodifica(codifica(m.ricetta!));
verifica(giro?.modi?.join() === 'doppio,rimbalza' && decodifica(codifica(a.ricetta!))?.modi === undefined, 'il codice da passare agli amici porta anche i comportamenti, e quelli vecchi restano validi');
verifica(PAROLE.length >= 20 && new Set(PAROLE.flatMap((x) => [x.parola, ...x.altre])).size === PAROLE.flatMap((x) => [x.parola, ...x.altre]).length, 'il vocabolario ha almeno venti parole e nessun doppione');
const ricco = new Mago();
ricco.guadagna(0, 20);
verifica(ricco.spendiEssenze(15) && ricco.essenze === 5 && !ricco.spendiEssenze(15), 'le essenze si spendono solo se bastano');

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: mago e creature si comportano bene.');
