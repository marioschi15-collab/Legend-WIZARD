/** Un punto che brilla in una scena fatta a mano: dove sta, di che tipo è (lanterna, finestra, candela...), quanto è forte. */
export interface LuceFatta { p: [number, number, number]; t: string; f: number }
/** Un ingombro: una scatola (mezze misure `m`, giro `g` attorno alla verticale) oppure un cilindro (raggio `r`, mezza altezza `h`). */
export interface UrtoFatto { p: [number, number, number]; m?: [number, number, number]; g?: number; r?: number; h?: number }
/** Una persona del posto: dove sta (x, quota, z), se è un paesano o una guardia, verso dove guarda. */
export interface PersonaFatta { p: [number, number, number]; t: string; g?: number }
/** Un tipo di oggetto sciolto (un barile, una cassa): le misure della scatola che lo contiene (larga, alta, fonda),
 * dove sta il centro di quella scatola rispetto ai piedi della forma, e di che cosa è fatto. */
export interface TipoCosa { m: [number, number, number]; c: [number, number, number]; mat: string }
/** Un oggetto sciolto: di che tipo è, dove sta il centro della sua scatola e come è girato. */
export interface CosaFatta { t: string; p: [number, number, number]; q: [number, number, number, number] }
/** Ciò che ogni scena porta con sé oltre alle forme. Lo scrivono gli script di strumenti/scene. */
export interface DatiFatta {
  luci: LuceFatta[];
  urti: UrtoFatto[];
  /** Le caselle di due metri già occupate da qualcosa di costruito. */
  occupati: number[];
  /** Punti di prova: x, z e l'altezza che il terreno aveva quando la scena è stata costruita. */
  campioni: [number, number, number][];
  /** Dove porta il viaggio rapido. */
  imbocco: [number, number];
  /** La gente del posto, se è un paese. */
  gente?: PersonaFatta[];
  /** Gli oggetti sciolti (che si spingono, bruciano, si sfasciano) e i loro tipi. */
  cose?: CosaFatta[];
  tipi?: Record<string, TipoCosa>;
}
