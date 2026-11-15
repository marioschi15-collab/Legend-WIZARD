# Radura

Un gioco "sandbox del mago" che gira nel browser: un mondo senza confini con cinque tipi di terra, un bastone,
tredici incantesimi e migliaia di pezzi da far crollare, bruciare, gelare, sollevare e rimettere a posto.
È tutto codice: nessuna immagine, nessun modello 3D, nessun file audio (anche i suoni sono fabbricati con formule).

## Il mondo

Il mondo **non ha confini**: terreno, terre e luoghi nascono attorno a chi gioca mentre cammina, in qualunque
direzione, e sono sempre gli stessi ogni volta che ci si torna.

- **Il rilievo**: catene di montagne con la neve in cima, vallate, altipiani a gradoni, fiumi in pianura, laghi,
  il mare con spiagge e isole. La vista arriva a più di un chilometro.
- **Quindici terre**, decise da caldo e umidità: la Radura (dove si parte), Selva Fitta, Bosco d'Autunno, Giungla
  Smeraldo, Savana d'Oro, Steppa del Vento, Tundra Grigia, Terre Gelate, Dune d'Ambra, Gole Rosse, Saline Bianche,
  Palude dei Lumi, Bosco dei Funghi, Campi di Cristallo, Monte Brace. Ognuna ha il suo suolo, le sue piante, la
  sua luce, la sua nebbia e ciò che vola nell'aria (neve, foglie, spore, lucciole, sabbia, faville).
- **I luoghi costruiti** (borghi, fattorie, torri, piramidi, templi, castelli di ghiaccio, igloo, palafitte,
  fortezze, altari…) li mette la sorte, e ogni terra ha i suoi. La mappa in alto a sinistra segue chi gioca.

Il gioco ricorda le scoperte e il punto in cui si è arrivati; il pulsante «Al villaggio» riporta alla partenza.
Le terre e le loro regole sono tutte in `src/mondo/zone.ts`: per aggiungerne una basta una voce in più nell'elenco.

## Come si gioca

- **Computer**: `W` `A` `S` `D` per camminare, mouse per guardare, clic per lanciare. Tasti `1`–`0`, `Q`/`E` o la rotella
  per cambiare incantesimo, `Spazio` salta, `Maiusc` corri, `R` ricostruisce tutto.
- **Telefono**: pollice sinistro per camminare, destro per guardarsi intorno; si tocca un incantesimo in basso
  e si tiene premuto ✦ per lanciarlo.

## Che cosa c'è da fare

**Il mago cresce.** In alto a sinistra ci sono la vita (rossa) e il mana (azzurro). Ogni incantesimo costa mana, che
torna piano da solo: i più potenti costano di più. Lontano dal villaggio girano i **golem di sassi**: ti inseguono e
colpiscono da vicino; il fuoco li consuma, il gelo li rallenta, i botti li sbriciolano. Più ci si allontana, più sono
forti. Battendoli si guadagnano esperienza ed essenze (◆); a ogni livello c'è un punto da spendere in vita, mana o
ricarica. Se la vita finisce si rinasce al villaggio perdendo un quinto delle essenze, mai i progressi.

- **Una meta sempre sullo schermo** (sotto la mappa): le prime insegnano il gioco in un paio di minuti (bruciare,
  spegnere, afferrare, riparare, inventare, esplorare), poi diventano traguardi di esplorazione senza fine.
- **Incantesimi perduti**: in ogni tipo di luogo ce n'è uno nascosto, segnalato da una colonna di luce dorata che si
  vede da lontano. Chi ci entra lo tiene per sempre (bordo d'oro nella barra). Sono tredici, e alcuni sono più forti
  di quanto l'officina permetta.
- **Demolizione**: accanto al nome del luogo si legge quanto è «in macerie»; dopo ogni lancio compare quanti pezzi
  ha spostato; a metà e al 90% arriva un annuncio, e i luoghi rasi al suolo restano d'oro sulla mappa. Riparare con
  il Rammendo un luogo mezzo distrutto vale quanto abbatterlo.
- I crolli rombano, le scoperte suonano.

Con il pulsante **＋** in fondo alla barra (tasto `C` al computer) si apre l'**officina**: lì ognuno inventa i suoi
incantesimi scegliendo come partono (palla, tocco, dal cielo, pioggia, onda), che cosa fanno (fino a tre effetti tra
undici), potenza, ampiezza, nome, simbolo e colore. Ogni incantesimo inventato ha un codice (`RAD1…`) da passare a un
amico, che lo incolla nell'officina e lo ottiene uguale. Restano salvati nel browser di chi gioca.

Gli incantesimi di serie: Fuoco, Gelo, Fulmine, Esplosione, Meteore, Terremoto, Tornado, Singolarità, e poi quelli inventati
da noi o più giocosi: **Levitazione** (una bolla dove il peso sparisce), **Presa** (tieni premuto per afferrare i pezzi,
rilascia per scagliarli), **Cristalli** (spuntoni che eruttano dal terreno), Crescita e **Rammendo** (riavvolge il tempo:
ciò che era rotto o bruciato torna al suo posto). Si combinano: il gelo spegne gli incendi, il tornado che passa sul
fuoco diventa di fiamme, la crescita fa nascere l'erba anche nel deserto.

## Comandi per chi sviluppa

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna a ogni modifica
pnpm typecheck    # controllo dei tipi
pnpm test         # prove senza grafica: costruzioni in piedi da sole, rammendo, gelo, muri, cambio di luogo
pnpm build        # crea dist/index.html: un solo file, si apre con un doppio clic
```

## Dove sta cosa

- `src/mago.ts`, `src/magoUi.ts`: vita, mana, livelli, essenze e le loro barre. `src/creature.ts`: i golem.

- `src/mondo/`: `zone.ts` (il clima che decide le terre, e la sorte che decide i luoghi), `terreno.ts` (zolle che
  nascono attorno a chi gioca e vengono riusate), cielo, erba e fiori, vegetazione, e `costruzioni.ts` che disegna
  ogni tipo di luogo pezzo per pezzo.
  `campo.ts` tiene lo stato del prato (bruciato, gelato, rigoglioso, in fiamme) a quadretti.
- `src/fisica/pezzi.ts`: i pezzi delle costruzioni, con peso e attrito (motore fisico Rapier). I luoghi compaiono
  quando entrano in vista, "prendono vita" quando ci si avvicina e vengono tolti quando restano lontani.
- `src/incantesimi/`: un file per incantesimo; `elenco.ts` decide l'ordine nella barra; `officina.ts` trasforma una
  ricetta inventata da chi gioca in un incantesimo vero (e in un codice da condividere). `src/officinaUi.ts` è la schermata.
- `src/base/qualita.ts`: quanto dettaglio mostrare. Si parte alti anche sul telefono; se i fotogrammi scendono, il gioco
  alleggerisce da solo un gradino alla volta (vedi `alleggerimenti` in `main.ts`).
- `src/effetti/`: scintille, fumo, anelli, saette, cerchi magici, bagliori.
- `src/mete.ts` (le mete), `src/incantesimi/perduti.ts` e `src/mondo/sigilli.ts` (gli incantesimi perduti e le loro colonne di luce).
- `src/giocatore.ts`, `src/bastone.ts`, `src/comandi.ts`, `src/interfaccia.ts`, `src/suoni.ts`: chi gioca e ciò che vede e sente.
- `prove/`: le prove automatiche.

