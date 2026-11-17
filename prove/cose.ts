/**
 * Prova senza grafica degli oggetti sciolti delle zone fatte a mano (barili, casse, lapidi...): devono stare fermi da
 * soli, spostarsi con una spinta leggera, sfasciarsi in pezzi veri con un colpo forte (il legno prima della pietra),
 * tornare interi con il Rammendo e con «Ricostruisci», bruciare, e sparire dal mondo quando ci si allontana.
 * In fondo si controllano gli oggetti veri delle quattro scene: nessuno deve nascere dentro un altro o per aria.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Particelle } from '../src/effetti/particelle.js';
import { Pezzi } from '../src/fisica/pezzi.js';
import { Campo } from '../src/mondo/campo.js';
import { Cose } from '../src/mondo/fatte/cose.js';
import { SCENE_FATTE, type ScenaFatta } from '../src/mondo/fatte/elenco.js';
import { altezzaEsatta } from '../src/mondo/zone.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

await RAPIER.init();
const fisica = new RAPIER.World({ x: 0, y: -16, z: 0 });
fisica.timestep = 1 / 60;
fisica.createCollider(RAPIER.ColliderDesc.cuboid(60, 1, 60).setTranslation(0, -1, 0).setFriction(0.9));
const pezzi = new Pezzi(RAPIER, fisica, false);
const campo = new Campo();
const scintille = new Particelle(10, true);
const fumo = new Particelle(10, false);

// Una scena finta su un piano: un barile, una cassa con una cassetta sopra, una lapide, un pupazzo di neve.
const dritto: [number, number, number, number] = [0, 0, 0, 1];
const finta: ScenaFatta = {
  terra: { chiave: 'prova', centro: { x: 0, z: 0 }, raggio: 40, sfuma: 60, suolo: () => 0 },
  file: '', viaggio: '', pace: 0, vista: 100,
  dati: {
    luci: [], urti: [], occupati: [], campioni: [], imbocco: [0, 0],
    tipi: {
      barile: { m: [0.76, 0.95, 0.76], c: [0, 0.475, 0], mat: 'legno' },
      cassa: { m: [0.9, 0.9, 0.9], c: [0, 0.45, 0], mat: 'legno' },
      cassetta: { m: [0.55, 0.5, 0.55], c: [0, 0.25, 0], mat: 'legno' },
      lapide: { m: [0.9, 1.4, 0.45], c: [0, 0.7, 0], mat: 'pietra' },
      pupazzo: { m: [0.5, 1.9, 0.9], c: [0, 0.95, 0], mat: 'neve' },
    },
    cose: [
      { t: 'barile', p: [0, 0.485, 0], q: dritto },
      { t: 'cassa', p: [4, 0.46, 0], q: dritto },
      { t: 'cassetta', p: [4, 1.17, 0], q: dritto },
      { t: 'lapide', p: [0, 0.71, 6], q: dritto },
      { t: 'pupazzo', p: [-6, 0.96, 0], q: dritto },
      { t: 'barile', p: [12, 0.485, 12], q: dritto },
    ],
  },
};
const cose = new Cose(pezzi, [finta], () => new THREE.MeshBasicMaterial());
let sfasci = 0;
cose.onSfascio = () => sfasci++;
// Così scoppia nel gioco: chi ascolta le spinte sfascia ciò che non regge.
pezzi.onSpinta = (x, y, z, raggio, forza) => {
  cose.spinta(x, y, z, raggio, forza);
};
pezzi.onRammenda = (x, z, raggio) => {
  cose.rammenda(x, z, raggio);
};

// Le forme: arrivano con la scena e diventano tante copie, una per oggetto.
const radice = new THREE.Group();
for (const nome of ['cosa__barile__legno', 'cosa__barile__ferro', 'cosa__lapide__pietra', 'muro']) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshStandardMaterial({ name: nome.split('__')[2] ?? 'muro' }));
  mesh.name = nome;
  radice.add(mesh);
}
cose.forme(0, radice);
verifica(radice.children.length === 1 && radice.children[0]!.name === 'muro', 'le forme degli oggetti sciolti escono dalla scena scolpita');
const barili = cose.gruppo.children.filter((o) => (o as THREE.InstancedMesh).count === 2) as THREE.InstancedMesh[];
verifica(cose.gruppo.children.length === 3 && barili.length === 2, `ogni forma diventa tante copie quanti sono gli oggetti (${cose.gruppo.children.length} forme, ${barili.length} dei barili)`);

const passi = (n: number): void => {
  for (let i = 0; i < n; i++) {
    pezzi.avvicina(0, 0, Infinity);
    fisica.step();
    pezzi.sincronizza();
    pezzi.aggiorna(1 / 60, campo, scintille, fumo);
    cose.avvicina(0, 0);
  }
};
const stato = (i: number) => cose.stato(0, i)!;
const casa = finta.dati.cose!.map((c) => c.p);
const lontano = (i: number): number => Math.hypot(stato(i).x - casa[i]![0], stato(i).y - casa[i]![1], stato(i).z - casa[i]![2]);

verifica(pezzi.n === 0, 'finché la scena è lontana i suoi oggetti non pesano sulla fisica');
cose.avvicina(0, 0);
verifica(pezzi.n === 6 && stato(0).viva, `avvicinandosi ogni oggetto diventa un pezzo vero (${pezzi.n})`);
passi(180);
for (let i = 0; i < 6; i++) verifica(lontano(i) < 0.08, `lasciato a se stesso l'oggetto ${i} resta dov'è (si è mosso di ${lontano(i).toFixed(2)} m)`);
verifica(pezzi.svegli === 0, `da fermi gli oggetti dormono (svegli ${pezzi.svegli})`);
const m = new THREE.Matrix4();
pezzi.mesh.getMatrixAt(0, m);
verifica(Math.abs(m.determinant()) < 1e-9, 'il blocco che muove un oggetto non si vede: si vede la sua forma');
barili[0]!.getMatrixAt(0, m);
verifica(Math.abs(m.elements[13]! - (stato(0).y - 0.475)) < 0.02, `la forma del barile sta con i piedi dove sta il pezzo (${m.elements[13]!.toFixed(2)})`);

// Una spinta leggera lo sposta senza romperlo; la forma lo segue.
pezzi.spinta(-1.2, 0.3, 0, 4, 6, 0.2);
passi(120);
verifica(!stato(0).rotta && lontano(0) > 0.3, `una spinta leggera sposta il barile senza romperlo (${lontano(0).toFixed(2)} m)`);
barili[0]!.getMatrixAt(0, m);
verifica(Math.hypot(m.elements[12]! - stato(0).x, m.elements[14]! - stato(0).z) < 0.6 && m.elements[12]! > 0.2, 'la forma segue il barile dove va');
verifica(sfasci === 0, 'e non si è sfasciato niente');

// Un colpo forte lo sfascia: al suo posto restano assi vere. La lapide, di pietra, a quella distanza regge.
const prima = pezzi.n;
pezzi.spinta(stato(0).x + 0.6, 0.4, stato(0).z, 7, 17, 0.25);
verifica(stato(0).rotta && stato(0).rottami >= 3 && sfasci >= 1, `un colpo forte sfascia il barile in assi (${stato(0).rottami} pezzi, ${sfasci} sfasci)`);
verifica(!stato(3).rotta, 'la lapide di pietra, più lontana, regge lo stesso colpo');
verifica(pezzi.n > prima, 'i rottami sono pezzi veri');
barili[0]!.getMatrixAt(0, m);
verifica(Math.abs(m.determinant()) < 1e-9, 'del barile sfasciato non si vede più la forma');
passi(120);

// Il pupazzo di neve si rompe con poco; la pietra solo con un colpo forte e vicino.
pezzi.spinta(-6, 0.5, 1.5, 3.6, 8, 0.35);
verifica(stato(4).rotta, 'una palla di fuoco accanto basta a sfasciare il pupazzo di neve');
pezzi.spinta(0.5, 0.5, 6, 15, 24, 0.55);
verifica(stato(3).rotta, 'uno scoppio vicino spacca anche la lapide');
passi(60);

// Il Rammendo rimette interi gli oggetti sfasciati lì attorno, al loro posto.
pezzi.rammenda(0, 0, 3);
verifica(!stato(0).rotta && stato(0).rottami === 0 && stato(0).viva, 'il Rammendo rimette intero il barile');
verifica(stato(3).rotta, 'ma non la lapide, che è fuori dal suo raggio');
passi(240);
verifica(lontano(0) < 0.15, `e il barile è di nuovo al suo posto (${lontano(0).toFixed(2)} m)`);

// «Ricostruisci» rimette tutto com'era, anche ciò che è solo stato spostato.
pezzi.spinta(4, 0.3, 1.0, 4, 7, 0.3);
passi(60);
cose.ricostruisci();
pezzi.ricostruisci();
passi(240);
for (let i = 0; i < 6; i++) verifica(!stato(i).rotta && lontano(i) < 0.15, `dopo «Ricostruisci» l'oggetto ${i} è intero e al suo posto (${lontano(i).toFixed(2)} m)`);

// Il fuoco: il legno prende, e la forma si annerisce.
pezzi.accendiVicini(4, 0.5, 0, 1.2);
passi(600);
barili[0]!.getMatrixAt(0, m);
verifica(pezzi.inFiamme === 0, 'il fuoco su una cassa prima o poi si spegne');

// Allontanandosi gli oggetti escono dalla fisica e tornano com'erano.
pezzi.spinta(0.4, 0.4, 0, 7, 17, 0.25);
cose.avvicina(1000, 0);
verifica(pezzi.n === 0, `lontano dalla scena non resta nessun pezzo (${pezzi.n})`);
verifica(!stato(0).rotta && !stato(0).viva && lontano(0) < 0.01, 'e tornando si ritrova tutto intero');

// Gli oggetti veri delle quattro scene: né per aria né sotto terra, e mai uno dentro l'altro.
for (const s of SCENE_FATTE) {
  const tipi = s.dati.tipi ?? {};
  const elenco = s.dati.cose ?? [];
  let peggio = 0;
  let dentro = 0;
  elenco.forEach((c, i) => {
    const t = tipi[c.t];
    if (!t) {
      errori.push(`${s.terra.chiave}: l'oggetto ${i} è di un tipo sconosciuto (${c.t})`);
      return;
    }
    const piedi = c.p[1] - t.m[1] / 2;
    // Chi sta in terra ha i piedi vicino al suolo; chi sta più in alto deve poggiare su qualcosa (un altro oggetto, una banchina, un cortile).
    const suolo = altezzaEsatta(c.p[0], c.p[2]);
    const appoggi = [suolo, ...s.dati.urti.filter((u) => u.m && Math.abs(u.p[0] - c.p[0]) < u.m[0] + 60 && Math.hypot(u.p[0] - c.p[0], u.p[2] - c.p[2]) < Math.hypot(u.m[0], u.m[2])).map((u) => u.p[1] + u.m![1]),
      ...elenco.filter((a, k) => k !== i && Math.hypot(a.p[0] - c.p[0], a.p[2] - c.p[2]) < 0.4).map((a) => a.p[1] + (tipi[a.t]?.m[1] ?? 0) / 2)];
    peggio = Math.max(peggio, Math.min(...appoggi.map((a) => Math.abs(piedi - a))));
    for (let k = i + 1; k < elenco.length; k++) {
      const a = elenco[k]!;
      const ta = tipi[a.t];
      if (!ta) continue;
      const fianco = Math.hypot(a.p[0] - c.p[0], a.p[2] - c.p[2]) < (Math.min(t.m[0], t.m[2]) + Math.min(ta.m[0], ta.m[2])) / 2 - 0.05;
      const quota = Math.abs(a.p[1] - c.p[1]) < (t.m[1] + ta.m[1]) / 2 - 0.02;
      if (fianco && quota) dentro++;
    }
  });
  if (elenco.length > 0) {
    verifica(peggio < 0.6, `${s.terra.chiave}: ogni oggetto poggia su qualcosa (il peggiore sta a ${peggio.toFixed(2)} m dal suo appoggio)`);
    verifica(dentro === 0, `${s.terra.chiave}: nessun oggetto nasce dentro un altro (${dentro} coppie)`);
  }
}
const totale = SCENE_FATTE.reduce((n, s) => n + (s.dati.cose?.length ?? 0), 0);
verifica(totale > 30, `le scene hanno oggetti sciolti (${totale})`);

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log(`Prova superata: i ${totale} oggetti sciolti si spingono, si sfasciano e tornano interi.`);
