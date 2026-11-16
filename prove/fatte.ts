/**
 * Prova senza grafica delle zone fatte a mano (il Bosco della Strega, il Borgo d'Inverno...): il terreno del gioco
 * deve avere le stesse quote che ha usato Blender per appoggiarci la scena (altrimenti case e sentieri affondano o
 * restano sospesi), ogni zona deve pesare tutto dove è fatta a mano e nulla lontano, le zone non devono pestarsi i
 * piedi, e dove c'è qualcosa di costruito il bosco non deve far nascere piante.
 */
import { abitato, SCENE_FATTE } from '../src/mondo/fatte/elenco.js';
import { occupatoFatto } from '../src/mondo/fatte/occupato.js';
import { FATTE } from '../src/mondo/fatte/suoli.js';
import { MINUTI } from '../src/mondo/minuti.js';
import { altezzaEsatta, luoghiVicini, pesiZone, N_ZONE, QUOTA_ACQUA, zonaFatta } from '../src/mondo/zone.js';
import { REGOLE, Sfide } from '../src/sfide.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

const pesi = new Float32Array(N_ZONE);
for (const s of SCENE_FATTE) {
  const t = s.terra;
  const nome = t.chiave;
  const zona = zonaFatta(nome);
  verifica(zona >= 0, `${nome}: ha la sua terra nell'elenco delle terre`);
  if (zona < 0) continue;

  let peggio = 0;
  let scarto = 0;
  let minimo = 1;
  for (const [x, z, h] of s.dati.campioni) {
    peggio = Math.max(peggio, Math.abs(t.suolo(x, z) - h));
    scarto = Math.max(scarto, Math.abs(altezzaEsatta(x, z) - t.suolo(x, z)));
    pesiZone(x, z, pesi);
    minimo = Math.min(minimo, pesi[zona]!);
  }
  verifica(peggio < 0.002, `${nome}: la formula del suolo è la stessa di Blender (scarto massimo ${peggio.toFixed(4)} m)`);
  verifica(scarto < 0.02, `${nome}: dentro la zona il terreno del gioco è proprio quello disegnato (scarto massimo ${scarto.toFixed(3)} m)`);
  verifica(minimo > 0.999, `${nome}: dentro la zona la sua terra pesa tutto (minimo ${minimo.toFixed(4)})`);
  pesiZone(t.centro.x + t.sfuma + 150, t.centro.z, pesi);
  verifica(pesi[zona]! < 1e-6, `${nome}: lontano la zona non pesa nulla`);

  // Dove il disegno comincia a sfumare nel paesaggio non devono nascere gradini: due punti a mezzo metro non
  // distano più di sessanta centimetri in altezza. (Più in là comanda il paesaggio naturale, con le sue rive e i suoi dirupi.)
  let salto = 0;
  for (let k = 0; k < 96; k++) {
    const an = (k / 96) * Math.PI * 2;
    for (let d = t.raggio - 4; d < t.raggio + (t.sfuma - t.raggio) * 0.35; d += 0.5) {
      const h0 = altezzaEsatta(t.centro.x + Math.cos(an) * d, t.centro.z + Math.sin(an) * d);
      const h1 = altezzaEsatta(t.centro.x + Math.cos(an) * (d + 0.5), t.centro.z + Math.sin(an) * (d + 0.5));
      salto = Math.max(salto, Math.abs(h1 - h0));
    }
  }
  verifica(salto < 0.6, `${nome}: dove comincia a sfumare il terreno non fa gradini (salto massimo ${salto.toFixed(2)} m in mezzo metro)`);

  verifica(s.dati.luci.length > 30 && s.dati.urti.length > 60, `${nome}: la scena porta con sé luci e ingombri (${s.dati.luci.length}, ${s.dati.urti.length})`);
  verifica(s.dati.urti.every((u) => u.p.every(Number.isFinite)), `${nome}: ogni ingombro ha un posto valido`);
  const [ix, iz] = s.dati.imbocco;
  verifica(altezzaEsatta(ix, iz) > QUOTA_ACQUA + 0.3, `${nome}: il viaggio rapido porta all'asciutto`);
  verifica(!s.dati.urti.some((u) => Math.hypot(u.p[0] - ix, u.p[2] - iz) < (u.r ?? Math.hypot(u.m![0], u.m![2])) + 0.6 && Math.abs(u.p[1] - altezzaEsatta(ix, iz) - 1) < (u.h ?? u.m![1]) + 1),
    `${nome}: il viaggio rapido non porta dentro un muro`);
  verifica(luoghiVicini(t.centro.x, t.centro.z, t.raggio + 15).length === 0, `${nome}: nessun luogo nato dal caso si sovrappone alla scena`);
  verifica(REGOLE[zona] !== undefined && MINUTI[zona] !== undefined, `${nome}: la terra ha la sua regola e le sue piccole cose`);
  // Nei paesi (dove le creature selvatiche non nascono) non ha senso la sfida «sbriciola tre creature di questa terra».
  verifica(abitato(t.centro.x, t.centro.z) === s.pace > 0, `${nome}: è al sicuro dalle creature solo se è un paese`);
  if (s.pace >= t.raggio * 0.9) verifica(new Sfide().entra(zona) === null, `${nome}: in un paese senza creature non parte la sfida`);
  else verifica(new Sfide().entra(zona) !== null, `${nome}: dove le creature ci sono la sfida parte`);

  for (const altra of SCENE_FATTE) {
    if (altra === s) continue;
    const d = Math.hypot(t.centro.x - altra.terra.centro.x, t.centro.z - altra.terra.centro.z);
    verifica(d > t.raggio + altra.terra.sfuma, `${nome}: non tocca la zona «${altra.terra.chiave}» (distano ${d.toFixed(0)} m)`);
  }
  verifica(Math.hypot(t.centro.x, t.centro.z) > t.sfuma + 150, `${nome}: non tocca il villaggio di partenza`);
}

const strega = FATTE.strega;
verifica(occupatoFatto(strega.centro.x, strega.centro.z), 'dove sta la casa della strega non nascono alberi');
verifica(!occupatoFatto(strega.centro.x - 120, strega.centro.z + 110), 'in mezzo al bosco sì');
verifica(strega.suolo(strega.centro.x + 71.2, strega.centro.z - 35.8) < QUOTA_ACQUA - 0.3, "nello stagno della strega c'è acqua");

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log(`Prova superata: le ${SCENE_FATTE.length} zone fatte a mano appoggiano sul loro terreno.`);
