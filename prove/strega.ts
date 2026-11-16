/**
 * Prova senza grafica del Bosco della Strega: il terreno del gioco deve avere le stesse quote che ha usato Blender
 * per appoggiarci la scena (altrimenti lapidi e sentieri affondano o restano sospesi), la zona deve pesare tutto
 * dove è fatta a mano, e dove c'è qualcosa di costruito il bosco non deve far nascere piante.
 */
import { STREGA_DATI } from '../src/mondo/stregaDati.js';
import { occupatoStrega } from '../src/mondo/stregaOccupato.js';
import { CENTRO_STREGA, suoloStrega } from '../src/mondo/stregaTerreno.js';
import { altezzaEsatta, pesiZone, N_ZONE, STREGA, QUOTA_ACQUA } from '../src/mondo/zone.js';

const errori: string[] = [];
const verifica = (vero: boolean, che: string): void => {
  if (!vero) errori.push(che);
};

let peggio = 0;
for (const [x, z, h] of STREGA_DATI.campioni) peggio = Math.max(peggio, Math.abs(suoloStrega(x, z) - h));
verifica(peggio < 0.002, `la formula del suolo è la stessa di Blender (scarto massimo ${peggio.toFixed(4)} m)`);

let scarto = 0;
const pesi = new Float32Array(N_ZONE);
let minimo = 1;
for (const [x, z] of STREGA_DATI.campioni) {
  scarto = Math.max(scarto, Math.abs(altezzaEsatta(x, z) - suoloStrega(x, z)));
  pesiZone(x, z, pesi);
  minimo = Math.min(minimo, pesi[STREGA]!);
}
verifica(scarto < 0.02, `dentro la zona il terreno del gioco è proprio quello disegnato (scarto massimo ${scarto.toFixed(3)} m)`);
verifica(minimo > 0.999, `dentro la zona il Bosco della Strega pesa tutto (minimo ${minimo.toFixed(4)})`);
pesiZone(CENTRO_STREGA.x + 400, CENTRO_STREGA.z, pesi);
verifica(pesi[STREGA]! < 1e-6, 'lontano dal bosco la zona non pesa nulla');

verifica(occupatoStrega(CENTRO_STREGA.x, CENTRO_STREGA.z), 'dove sta la casa non nascono alberi');
verifica(!occupatoStrega(CENTRO_STREGA.x - 120, CENTRO_STREGA.z + 110), 'in mezzo al bosco sì');
verifica(suoloStrega(CENTRO_STREGA.x + 71.2, CENTRO_STREGA.z - 35.8) < QUOTA_ACQUA - 0.3, 'nello stagno c\'è acqua');
verifica(STREGA_DATI.luci.length > 60 && STREGA_DATI.urti.length > 150, 'la scena porta con sé luci e ingombri');
verifica(STREGA_DATI.urti.every((u) => u.p.every(Number.isFinite)), 'ogni ingombro ha un posto valido');

if (errori.length > 0) {
  console.error('Prova fallita:\n - ' + errori.join('\n - '));
  process.exit(1);
}
console.log('Prova superata: il Bosco della Strega appoggia sul suo terreno.');
