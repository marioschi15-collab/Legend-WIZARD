/**
 * Prova senza grafica del mago e delle creature: il mana si spende e torna, i livelli danno punti, cadere non
 * toglie i progressi; un golem insegue, colpisce, e un botto lo sbriciola lasciando il premio.
 */
import * as THREE from 'three';
import { Creature, SPECIE } from '../src/creature.js';
import { costoDi, esperienzaPer, Mago } from '../src/mago.js';
import { INCANTESIMI, sbloccati } from '../src/incantesimi/elenco.js';
import { codifica, creaDaRicetta, decodifica, EFFETTI, FORME } from '../src/incantesimi/officina.js';
import { leggi, PAROLE, parolaInPremio } from '../src/incantesimi/parole.js';

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

// Davanti a un muro la creatura non lo attraversa: gli gira attorno e arriva lo stesso.
const labirinto = new Creature(() => 0, suolo, -0.55, caso);
// Un muro lungo dodici metri, messo di traverso tra la creatura e chi gioca.
labirinto.libero = (x, _y, z, dx, dz, lungo) => {
  for (let t = 0; t <= lungo; t += 0.2) if (Math.abs(x + dx * t - 810) < 0.6 && Math.abs(z + dz * t - 800) < 6) return false;
  return true;
};
const mu = labirinto.nasci(820, 800, 1, true);
const meta = new THREE.Vector3(800, 0, 800);
let dentroIlMuro = false;
let colpito = 0;
for (let i = 0; i < 60 * 25; i++) {
  colpito += labirinto.aggiorna(1 / 60, meta);
  const q = labirinto.vicina(meta)!;
  if (Math.abs(q.x - 810) < 0.4 && Math.abs(q.z - 800) < 5.5) dentroIlMuro = true;
}
verifica(labirinto.vivo(mu) && !dentroIlMuro, 'la creatura non attraversa il muro');
verifica(colpito > 0, 'ma gli gira attorno e raggiunge chi gioca');

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
zoo.ritira();
verifica(zoo.vive === zoo.bersagli(qui, 500).length, 'finito il tempo il golem amico si sbriciola');

// --- gli attacchi delle creature: ognuna ha il suo, e si può schivare ---
// Il pugno del golem si vede arrivare: chi resta nel cerchio lo prende, chi si allontana no.
const ring = new Creature(() => 0, suolo, -0.55, caso);
ring.nasci(902.5, 900, 1, true, 'golem');
const fermo = new THREE.Vector3(900, 0, 900);
let preso = 0;
for (let i = 0; i < 60 * 3; i++) preso += ring.aggiorna(1 / 60, fermo);
verifica(preso > 0, 'chi resta fermo vicino al golem prende il pugno');
const ring2 = new Creature(() => 0, suolo, -0.55, caso);
ring2.nasci(902.5, 900, 1, true, 'golem');
const agile = new THREE.Vector3(900, 0, 900);
let schivato = 0;
for (let i = 0; i < 60 * 1.2; i++) {
  schivato += ring2.aggiorna(1 / 60, agile);
  // Dopo un attimo (il golem ha già alzato le braccia) chi gioca corre via.
  if (i > 20) agile.x -= 9 / 60;
}
verifica(schivato === 0, 'chi si allontana mentre il golem alza le braccia schiva il pugno');
// La sentinella tira da lontano: fermi si viene colpiti, spostandosi di lato no.
const tiro = new Creature(() => 0, suolo, -0.55, caso);
tiro.nasci(915, 900, 1, true, 'sentinella');
let colpitoDaLontano = 0;
for (let i = 0; i < 60 * 6; i++) colpitoDaLontano += tiro.aggiorna(1 / 60, fermo);
verifica(colpitoDaLontano > 0 && tiro.vicina(fermo)!.distanceTo(fermo) > 5, 'la sentinella colpisce da lontano senza avvicinarsi');
const tiro2 = new Creature(() => 0, suolo, -0.55, caso);
tiro2.nasci(915, 900, 1, true, 'sentinella');
const laterale = new THREE.Vector3(900, 0, 900);
let schegge = 0;
for (let i = 0; i < 60 * 6; i++) {
  schegge += tiro2.aggiorna(1 / 60, laterale);
  laterale.z += 6 / 60;
}
verifica(schegge === 0, 'camminando di lato le schegge passano accanto');
// Il guardiano, a metà vita, chiama due rinforzi (una volta sola) e lo dice.
const capo = new Creature(() => 0, suolo, -0.55, caso);
const cn = capo.nasci(1000, 1000, 2, true, 'golem', true);
const lontanoDaTutti = new THREE.Vector3(1000, 0, 1100);
for (let i = 0; i < 4 && capo.vive === 1; i++) {
  capo.ferisciIntorno(new THREE.Vector3(1000, 0, 1000), 3, 30);
  capo.aggiorna(1 / 60, lontanoDaTutti);
}
verifica(capo.vivo(cn) && capo.vive === 3 && capo.ritiraAvvisi().length === 1, 'a metà vita il guardiano chiama due rinforzi');
capo.ferisciIntorno(new THREE.Vector3(1000, 0, 1000), 1, 5);
capo.aggiorna(1 / 60, lontanoDaTutti);
verifica(capo.vive === 3 && capo.ritiraColpi().length > 0, 'una volta sola; e i colpi a segno diventano numeri da mostrare');
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
const sc = leggi('pioggia di fuoco solo creature', tutte);
verifica(sc.ricetta?.modi?.join() === 'creature' && sc.ignote.length === 0, '«solo creature» si capisce, e «solo» non è una parola ignota');
verifica(PAROLE.length >= 20 && new Set(PAROLE.flatMap((x) => [x.parola, ...x.altre])).size === PAROLE.flatMap((x) => [x.parola, ...x.altre]).length, 'il vocabolario ha almeno venti parole e nessun doppione');
const ricco = new Mago();
ricco.guadagna(0, 20);
verifica(ricco.spendiEssenze(15) && ricco.essenze === 5 && !ricco.spendiEssenze(15), 'le essenze si spendono solo se bastano');

// --- il mirino, l'allarme, le immunità, i guardiani che restano a casa ---
{
  const c2 = new Creature(() => 0, suolo, -0.55, caso);
  const io = new THREE.Vector3(800, 0, 800);
  c2.nasci(800, 808, 1, true, 'golem');
  const occhi = new THREE.Vector3(800, 1.6, 800);
  const alPetto = new THREE.Vector3(0, -0.06, 1).normalize();
  const presa = c2.sottoMira(occhi, alPetto, 95);
  verifica(presa !== null && presa.lontano > 6.5 && presa.lontano < 8, `il mirino sul petto trova la creatura (a ${presa?.lontano.toFixed(1)} m)`);
  verifica(c2.sottoMira(occhi, new THREE.Vector3(0.3, -0.06, 1).normalize(), 95) === null, 'due metri di lato non la trova');
  verifica(c2.sottoMira(occhi, alPetto, 5) === null, 'un muro prima della creatura ferma il mirino');
  c2.evoca(800, 804, 20);
  verifica(c2.sottoMira(occhi, new THREE.Vector3(0, -0.06, 1).normalize(), 6) === null, 'il golem amico non viene preso di mira');
  c2.svuota();

  // Colpita da lontano, una creatura viene a cercare chi è stato (prima restava ferma a farsi colpire).
  const c3 = new Creature(() => 0, suolo, -0.55, caso);
  c3.nasci(800, 860, 1, true, 'golem');
  for (let i = 0; i < 120; i++) c3.aggiorna(1 / 60, io);
  verifica(Math.abs(c3.vicina(io)!.z - 860) < 0.5, 'a sessanta metri, se nessuno la tocca, resta dov’è');
  c3.ferisciIntorno(new THREE.Vector3(800, 0, 860), 3, 5, 'botto');
  for (let i = 0; i < 60 * 5; i++) c3.aggiorna(1 / 60, io);
  verifica(c3.bersagli(new THREE.Vector3(800, 0, 860), 6).length === 0 && c3.bersagli(new THREE.Vector3(800, 0, 845), 12).length > 0, 'colpita, lascia il suo posto e si avvicina');

  // Le immunità valgono per ogni magia: il fuoco non tocca il diavoletto, il gelo lo spacca.
  const c4 = new Creature(() => 0, suolo, -0.55, caso);
  c4.nasci(800, 810, 1, true, 'diavoletto');
  const qui = new THREE.Vector3(800, 0, 810);
  verifica(c4.ferisciIntorno(qui, 3, 20, 'fuoco') === 0, 'il fuoco non ferisce il diavoletto di lava');
  verifica(c4.ritiraColpi().some((x) => x.tipo === 'immune'), 'e il gioco lo dice («immune»)');
  verifica(c4.ferisciIntorno(qui, 3, 5, 'gelo') > 12, 'il gelo gli fa il triplo del male');
  c4.aggiorna(0.5, io);
  verifica(c4.ritiraColpi().some((x) => x.tipo === 'debole'), 'e il numero dice che è il suo punto debole');

  // Il Terremoto ferisce a ondate: lo stesso danno a 30 e a 120 fotogrammi al secondo, e un guardiano resta in piedi.
  const scosse = (passo: number): number => {
    const c5 = new Creature(() => 0, suolo, -0.55, caso);
    c5.nasci(800, 805, 4, true, 'golem', true);
    let fatto = 0;
    let attesa = 0;
    for (let t = 0; t < 3.8; t += passo) {
      attesa -= passo;
      if (attesa <= 0) {
        attesa = 0.22;
        fatto += c5.ferisciIntorno(new THREE.Vector3(800, 0, 805), 7, 6, 'botto');
      }
    }
    verifica(c5.vive === 1, 'il guardiano regge un Terremoto');
    return fatto;
  };
  verifica(Math.abs(scosse(1 / 30) - scosse(1 / 120)) < 13, 'il Terremoto fa lo stesso danno qualunque sia la fluidità');

  // Un guardiano non insegue lontano dal suo luogo, e sparisce (per rinascere intero) quando chi gioca è lontanissimo.
  const c6 = new Creature(() => 0, suolo, -0.55, caso);
  c6.nasci(900, 900, 2, true, 'golem', true);
  const lontano = new THREE.Vector3(900, 0, 960);
  for (let i = 0; i < 60 * 6; i++) c6.aggiorna(1 / 60, lontano);
  const casa = new THREE.Vector3(900, 0, 900);
  verifica(c6.bersagli(casa, 1.5).length === 1, 'il guardiano non va a cercare chi sta a sessanta metri dal suo luogo');
  c6.aggiorna(1 / 60, new THREE.Vector3(900, 0, 1200));
  verifica(c6.bersagli(casa, 30).length === 0, 'con chi gioca a trecento metri il guardiano viene tolto');

  // Chi si addormenta lascia perdere il colpo che stava preparando.
  const c7 = new Creature(() => 0, suolo, -0.55, caso);
  c7.nasci(800, 802.5, 1, true, 'golem');
  let preso = 0;
  for (let i = 0; i < 60; i++) preso += c7.aggiorna(1 / 60, io);
  verifica(preso === 0, 'il golem sta preparando il pugno');
  c7.stato(new THREE.Vector3(800, 0, 802.5), 4, 'sonno', 6);
  c7.ferisciIntorno(new THREE.Vector3(800, 0, 802.5), 4, 2);
  for (let i = 0; i < 40; i++) preso += c7.aggiorna(1 / 60, io);
  verifica(preso === 0, 'svegliato, non colpisce subito: deve ricominciare il preavviso');
}

// --- le creature dentro la fisica: una spinta le scaglia, e cadendo da alto si fanno male ---
{
  const c8 = new Creature(() => 0, suolo, -0.55, caso);
  c8.nasci(800, 808, 2, true, 'golem');
  const lontano = new THREE.Vector3(800, 0, 700);
  c8.spingi(800, -1.5, 808, 8, 30, 1.2);
  let massimo = 0;
  for (let i = 0; i < 60; i++) {
    c8.aggiorna(1 / 60, lontano);
    massimo = Math.max(massimo, c8.bersagli(new THREE.Vector3(800, 0, 808), 40)[0]?.y ?? 0);
  }
  verifica(massimo > 4, `una spinta forte da sotto manda il golem in aria (fino a ${massimo.toFixed(1)} m)`);
  for (let i = 0; i < 60 * 4; i++) c8.aggiorna(1 / 60, lontano);
  const giu = c8.bersagli(new THREE.Vector3(800, 0, 808), 60)[0];
  verifica(giu === undefined || giu.y < 0.1, 'poi ricade a terra');
  verifica(c8.ritiraColpi().some((x) => x.quanto > 5) || c8.ritira().length > 0, 'e la caduta gli fa male (o lo sbriciola)');
  // Un vortice lo tiene sollevato finché dura.
  const c9 = new Creature(() => 0, suolo, -0.55, caso);
  c9.nasci(800, 808, 1, true, 'golem');
  for (let i = 0; i < 120; i++) {
    c9.vortice(800, 0, 806, 10, 9, 20, 30, 8, 1 / 60);
    c9.aggiorna(1 / 60, lontano);
  }
  verifica((c9.bersagli(new THREE.Vector3(800, 0, 808), 40)[0]?.y ?? 0) > 2, 'dentro un tornado il golem resta sollevato');
}

// --- le parole in premio e gli incantesimi che si imparano con i livelli ---
{
  const note = new Set(PAROLE.filter((x) => x.prezzo === 0).map((x) => x.parola));
  verifica(parolaInPremio(note, 'igloo')?.parola === 'igloo', 'il guardiano di un igloo insegna a costruire un igloo');
  note.add('igloo');
  const rara = parolaInPremio(note, 'igloo')!;
  verifica(rara.prezzo >= 45 && rara.parola !== 'piramide', `se la si sa già, dà la più preziosa tra le altre (${rara.parola})`);
  verifica(parolaInPremio(note)!.prezzo === 10, 'la sfida di una terra dà la più a buon mercato');
  verifica(sbloccati(1).map((x) => x.nome).join() === 'Fuoco,Gelo,Crescita,Rammendo', 'si comincia con quattro incantesimi');
  verifica(sbloccati(10).length === INCANTESIMI.length && sbloccati(5).length > sbloccati(4).length, 'al decimo livello ci sono tutti');
  verifica(leggi('cura', note).ricetta?.forma === 'me', '«cura» da sola parte su chi lancia');
  verifica(leggi('fuoco', note).ricetta?.forma === 'palla', '«fuoco» da solo resta una palla');
  const uno = creaDaRicetta(leggi('palla di fuoco', note).ricetta!);
  const due = creaDaRicetta(leggi('fuoco palla', note).ricetta!);
  verifica(uno.firma === due.firma && uno.nome !== due.nome, 'stesse parole in altro ordine: stessa firma, nome diverso');
}

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: mago e creature si comportano bene.');
