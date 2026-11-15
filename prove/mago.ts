/**
 * Prova senza grafica del mago e delle creature: il mana si spende e torna, i livelli danno punti, cadere non
 * toglie i progressi; un golem insegue, colpisce, e un botto lo sbriciola lasciando il premio.
 */
import * as THREE from 'three';
import { Creature } from '../src/creature.js';
import { costoDi, esperienzaPer, Mago } from '../src/mago.js';
import { INCANTESIMI } from '../src/incantesimi/elenco.js';
import { creaDaRicetta } from '../src/incantesimi/officina.js';
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

// Vicino al villaggio non nasce nulla.
const casa = new Creature(() => 0, suolo, -0.55, caso);
for (let i = 0; i < 60 * 30; i++) casa.aggiorna(1 / 60, new THREE.Vector3(10, 0, 30));
verifica(casa.vive === 0, 'attorno al villaggio non nascono creature');
// Lontano sì.
const lontano = new Creature(() => 0, suolo, -0.55, caso);
for (let i = 0; i < 60 * 30; i++) lontano.aggiorna(1 / 60, new THREE.Vector3(900, 0, 900));
verifica(lontano.vive > 0 && lontano.vive <= 4, `lontano dal villaggio nascono creature, ma poche (${lontano.vive})`);

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
verifica(PAROLE.length >= 20 && new Set(PAROLE.flatMap((x) => [x.parola, ...x.altre])).size === PAROLE.flatMap((x) => [x.parola, ...x.altre]).length, 'il vocabolario ha almeno venti parole e nessun doppione');
const ricco = new Mago();
ricco.guadagna(0, 20);
verifica(ricco.spendiEssenze(15) && ricco.essenze === 5 && !ricco.spendiEssenze(15), 'le essenze si spendono solo se bastano');

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: mago e creature si comportano bene.');
