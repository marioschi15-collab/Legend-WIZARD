import { BORGO_DATI } from './borgoDati.js';
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
  readonly dati: DatiFatta;
}

export const SCENE_FATTE: readonly ScenaFatta[] = [
  { terra: FATTE.strega, file: 'bosco_strega', viaggio: 'Il Bosco della Strega (imbocco del sentiero)', pace: 0, dati: STREGA_DATI },
  { terra: FATTE.borgo, file: 'borgo_inverno', viaggio: 'Il Borgo d’Inverno (porta del paese)', pace: 112, dati: BORGO_DATI },
];

/** Vero dove c'è un paese fatto a mano: lì le creature selvatiche non nascono. */
export function abitato(x: number, z: number): boolean {
  return SCENE_FATTE.some((s) => s.pace > 0 && Math.hypot(x - s.terra.centro.x, z - s.terra.centro.z) < s.pace);
}
