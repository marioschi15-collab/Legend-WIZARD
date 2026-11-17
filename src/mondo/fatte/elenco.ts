import { BORGO_DATI } from './borgoDati.js';
import { CASTELLO_DATI } from './castelloDati.js';
import { PORTO_DATI } from './portoDati.js';
import { ROVINE_DATI } from './rovineDati.js';
import { STREGA_DATI } from './stregaDati.js';
import { FATTE, type TerraFatta } from './suoli.js';
import type { DatiFatta } from './tipi.js';

/** Una scena costruita a mano con Blender: dove sta, il file con le sue forme, ciò che porta con sé. */
export interface ScenaFatta {
  readonly terra: TerraFatta;
  /** Il file delle forme, in public/modelli. */
  readonly file: string;
  /** Come si chiama nel foglio del viaggio. */
  readonly viaggio: string;
  /** Entro quanti metri dal centro non nascono creature: nei paesi si sta al sicuro (0 = nascono dappertutto). */
  readonly pace: number;
  /** Da quanti metri si vede un pezzo della scena: nella nebbia fitta è inutile disegnare ciò che sta più in là. */
  readonly vista: number;
  readonly dati: DatiFatta;
}

export const SCENE_FATTE: readonly ScenaFatta[] = [
  { terra: FATTE.strega, file: 'bosco_strega', viaggio: 'Il Bosco della Strega (imbocco del sentiero)', pace: 0, vista: 200, dati: STREGA_DATI },
  { terra: FATTE.borgo, file: 'borgo_inverno', viaggio: 'Il Borgo d’Inverno (porta del paese)', pace: 112, vista: 330, dati: BORGO_DATI },
  { terra: FATTE.porto, file: 'porto_nebbie', viaggio: 'Il Porto delle Nebbie (strada del porto)', pace: 112, vista: 230, dati: PORTO_DATI },
  { terra: FATTE.castello, file: 'castello_bosco', viaggio: 'Il Castello del Bosco (inizio della strada)', pace: 75, vista: 600, dati: CASTELLO_DATI },
  { terra: FATTE.rovine, file: 'rovine_cristallo', viaggio: 'Le Rovine del Cristallo (inizio del viale)', pace: 0, vista: 600, dati: ROVINE_DATI },
];

/** Dove stanno le scene, per segnarle sulla mappa. */
export const CENTRI_FATTE: readonly { x: number; z: number }[] = SCENE_FATTE.map((s) => s.terra.centro);

/** Vero dove c'è un paese fatto a mano: lì le creature selvatiche non nascono. */
export function abitato(x: number, z: number): boolean {
  return SCENE_FATTE.some((s) => s.pace > 0 && Math.hypot(x - s.terra.centro.x, z - s.terra.centro.z) < s.pace);
}
