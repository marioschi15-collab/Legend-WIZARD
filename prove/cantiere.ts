/**
 * Prova senza grafica del cantiere: ciò che chi gioca costruisce pezzo per pezzo (blocco, parete, scala) deve
 * restare in piedi da solo, girato in qualunque verso; e l'elenco delle opere rispetta i suoi limiti.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import { Cantiere, MASSIMO_GRANDI, mattoniDi, OPERE, type Opera } from '../src/cantiere.js';
import { Particelle } from '../src/effetti/particelle.js';
import { Pezzi } from '../src/fisica/pezzi.js';
import { Campo } from '../src/mondo/campo.js';
import { EFFETTI } from '../src/incantesimi/officina.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
const pezzi = new Pezzi(RAPIER, fisica, false);
const piccole = ['blocco', 'parete', 'scala'];
let n = 0;
piccole.forEach((tipo, k) => {
  for (const giro of [0, 0.7, 2.4]) {
    const o: Opera = { tipo, x: n * 20, z: k * 3, quota: 2 + k, giro, seme: 7 + n };
    fisica.createCollider(RAPIER.ColliderDesc.cuboid(8, 1, 8).setTranslation(o.x, o.quota - 1, o.z).setFriction(0.9));
    const mattoni = mattoniDi(o);
    verifica(mattoni.length > 0 && pezzi.aggiungi(mattoni, o.x, o.z, OPERE[tipo]!.raggio) !== null, `${tipo}: ha i suoi pezzi`);
    n++;
  }
});
pezzi.daiVitaATutto();
const campo = new Campo();
const scintille = new Particelle(10, true);
const fumo = new Particelle(10, false);
for (let i = 0; i < 540; i++) {
  fisica.step();
  pezzi.sincronizza();
  pezzi.aggiorna(1 / 60, campo, scintille, fumo);
}
const mossi = pezzi.spostamenti().filter((d) => d > 0.25).length;
console.log(`opere piccole: ${n} · pezzi: ${pezzi.n} · spostati di oltre 25 cm dopo 9 secondi: ${mossi} · ancora svegli: ${pezzi.svegli}`);
verifica(mossi === 0, `${mossi} pezzi delle opere piccole crollano da soli`);
verifica(pezzi.svegli === 0, `${pezzi.svegli} pezzi non si addormentano`);

// Ogni opera ha il suo effetto da scrivere, e gli edifici prendono a modello costruzioni che esistono.
verifica(Object.keys(OPERE).every((t) => EFFETTI.some((e) => e.id === t)), 'ogni opera ha il suo effetto');
verifica(Object.keys(OPERE).filter((t) => OPERE[t]!.luogo).every((t) => mattoniDi({ tipo: t, x: 0, z: 0, quota: 0, giro: 0, seme: 3 }).length > 20), 'ogni edificio ha i suoi pezzi');

// I limiti del cantiere.
const c = new Cantiere();
verifica(c.impedimento('torre', 0, 0) === '' && c.impedimento('drago', 0, 0) !== '', 'si costruisce solo ciò che esiste');
c.aggiungi({ tipo: 'torre', x: 0, z: 0, quota: 0, giro: 0, seme: 1 });
verifica(c.impedimento('torre', 5, 0) !== '' && c.impedimento('torre', 60, 0) === '', 'due edifici non si compenetrano');
verifica(c.impedimento('blocco', 2, 0) === '', 'i blocchi si possono posare anche accanto a un edificio');
for (let i = 1; i < MASSIMO_GRANDI; i++) c.aggiungi({ tipo: 'torre', x: i * 60, z: 0, quota: 0, giro: 0, seme: 1 });
verifica(c.impedimento('torre', 900, 0) !== '', 'oltre il limite degli edifici bisogna smontarne uno');
verifica(c.smonta(60, 0, 3).length === 1 && c.opere.length === MASSIMO_GRANDI - 1 && c.impedimento('torre', 900, 0) === '', 'smontando si libera un posto');

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: il cantiere si comporta bene.');
