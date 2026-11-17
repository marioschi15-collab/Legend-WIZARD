# Legend Wizard

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
- **Le Rovine del Cristallo** (a nord-est, nel viaggio rapido): il posto di prova di uno **stile disegnato fatto tutto
  dal codice**: crepuscolo viola, pietre dipinte, cristalli e lanterne che brillano, fiume turchese, cascata.
- **Quattro zone fatte a mano**, ognuna in un punto preciso e segnata sulla mappa con un rombo dorato (ci si arriva
  anche con il viaggio rapido): il **Bosco della Strega** (casa sul colle, cimitero, cappella in rovina, stagno), il
  **Borgo d'Inverno** (case a graticcio sotto la neve, piazza con il mercato, torre, stagno ghiacciato), il **Porto
  delle Nebbie** (banchina, moli, tre velieri: su due si sale a bordo, il faro) e il **Castello del Bosco** (mura e
  torri, il cortile in cui si entra, il ponte di pietra, il mulino a vento). Nei paesi le creature non nascono.
  Gli oggetti di queste zone (barili, casse, panche, lapidi, zucche, bersagli...) sono cose vere: si spingono, si
  sollevano con la magia, bruciano, gelano, si sfasciano con un colpo forte e tornano interi con il Rammendo.

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

**Incantesimi a parole, di ogni tipo.** Il pulsante «✎ Scrivi un incantesimo» apre un foglio dove si scrive, per
esempio, «pioggia di fuoco piccola» o «scudo e cura su di me»: il gioco riconosce le parole che il mago conosce e
crea l'incantesimo, che resta sul bastone (c'è posto per dodici). Le parole sono 61:
- **come parte** (9): palla, tocco, pioggia, cielo, onda, su di me, cerchio, trappola (scatta quando passa una
  creatura), sciame (globi che inseguono le creature);
- **che cosa fa** (42): rompere (fuoco, ghiaccio, scoppio, vento, fulmine, risucchio, vortice, cristallo, peso,
  terremoto), aiutare il mago (cura, scudo, passo svelto, balzo, ombra che rende invisibili, varco che teletrasporta,
  luce), cambiare il mondo (fiori, acqua, albero, muro, bolla, tempo che ripara), ingannare le creature (sonno,
  pecora, paura, ragnatela, veleno, rimpicciolisci, vampiro che ruba vita), evocare un golem amico e **costruire**
  (blocco, parete, scala, torre, fattoria, piramide, tempio, igloo, guglia, palafitte, e «smonta» per toglierle);
- **quanto è grande e forte** (5): piccolo, grande, lieve, forte, gigante.
- **come si comporta** (5): doppio, ritardato, rimbalza, contagioso (salta addosso alle creature vicine), solo
  creature (ferisce le creature e lascia intatti case e prato).
Fino a tre effetti per incantesimo: le combinazioni sono decine di migliaia. Tredici parole si sanno dall'inizio, le
altre si imparano con le essenze, dalle missioni e dai guardiani. Il gioco capisce solo il suo vocabolario, non
qualsiasi frase.

**Costruire.** Con le parole per costruire («tocco torre», «tocco parete») nasce una costruzione vera dove si mira:
ha peso, si può abbattere e riparare come le altre, e resta salvata sul dispositivo. Blocchi, pareti e scale si
accostano e si impilano; gli edifici vogliono terreno piano, asciutto e libero. Si possono avere fino a sei edifici e
sessanta costruzioni in tutto; «smonta» le toglie.

**Giorno e notte.** Un giorno intero dura dieci minuti: sei di giorno, uno di tramonto, due di notte, uno d'alba. Di
notte c'è meno luce e si vedono più stelle; le creature sono di più e colpiscono più forte, ma lasciano la metà di
essenze in più. Gli abitanti passeggiano attorno al loro posto, di notte accendono la lanterna, e si ricordano di chi
gioca: salutano diversamente chi li ha già aiutati, e chi ha ridotto il villaggio in macerie.

**Il quaderno.** Il pulsante «📖 Quaderno» mostra il mago, le soluzioni trovate per ogni missione, le parole imparate
per famiglia, le creature incontrate con il loro punto debole e i luoghi liberati.

**Missioni.** All'ingresso del villaggio aspettano cinque abitanti con un punto esclamativo dorato: avvicinandosi a
uno si riceve la sua missione (far rifiorire l'orto, spegnere il fieno, ghiacciare lo spiazzo, sbriciolare il golem
sul sentiero, ridurre un rudere in macerie). Un cerchio dorato con una colonna di luce segna dove andare. Ogni
missione si può rifare: risolverla con un incantesimo mai usato prima vale il premio pieno, ripetere lo stesso vale
la metà. La prima volta, ogni abitante insegna una parola nuova.

**Le terre hanno le loro creature.** Oltre al golem di sassi ci sono la sentinella di ghiaccio (il gelo non le fa
nulla, il fuoco la scioglie), lo scorpione di sabbia (svelto, quasi insensibile al fuoco, il gelo lo ferma), il lume
di palude (i botti gli passano attraverso, il gelo lo spegne) e il diavoletto di lava (nel fuoco ci sguazza, il gelo
lo spacca). La prima volta che se ne incontra una, il gioco dice come si comporta. Le creature girano attorno ai
muri invece di attraversarli (tranne i lumi, che sono fatti di luce).

**Il combattimento.** Ogni razza attacca a modo suo, e ogni attacco si può schivare: il golem alza le braccia e un
cerchio rosso a terra mostra dove batterà il pugno; la sentinella tira schegge da lontano (basta spostarsi di lato);
lo scorpione carica in linea retta; il lume lancia globi lenti che inseguono (li ferma un muro); il diavoletto sputa
fuoco che resta a terra. A metà vita i guardiani chiamano due rinforzi. Sopra le creature colpite sale il numero del
danno, e quando è il mago a essere colpito i bordi dello schermo lampeggiano di rosso.

**Ogni terra ha la sua regola e la sua sfida.** Tra i ghiacci e nella tundra il fuoco si spegne quasi subito; nel
deserto, nella savana, nelle gole e sul vulcano è il gelo a sciogliersi; in palude e nella giungla il fuoco dura
poco; tra i funghi la vita torna da sola; tra i cristalli il mana torna il doppio più in fretta. La prima volta che
si entra in una terra parte una sfida (sbriciolare tre delle sue creature): vinta quella, la terra è «domata» e
insegna una parola.

**Guardiani e viaggio rapido.** Ogni luogo fuori dal villaggio ha un guardiano con la corona, più grosso e più duro.
Batterlo libera il luogo: insegna una parola, ci si rinasce se si cade lì vicino, e ci si torna quando si vuole con
il pulsante «🧭 Viaggio rapido».

- **Una meta sempre sullo schermo** (sotto la mappa): le prime accompagnano dentro il gioco un passo alla volta
  (bastone, abitanti e missioni, incantesimi a parole, creature, parole nuove, livelli, guardiani, costruire, altre
  terre), poi diventano traguardi di esplorazione senza fine.
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

### Le regole del combattimento, in breve

- Si mira al corpo della creatura: il mirino la trova e le palle le scoppiano addosso.
- Fuoco, gelo e botti pesano secondo la razza: sopra la creatura compare il danno, con un «!» se è il suo punto
  debole, oppure «immune».
- Chi viene colpito da lontano arriva di corsa e chiama le compagne. I guardiani restano vicino al loro luogo.
- In pausa e con un foglio aperto il mondo aspetta.
- Si parte con Fuoco, Gelo, Crescita e Rammendo; gli altri incantesimi di serie arrivano con i livelli (2 Fulmine,
  3 Cristalli, 4 Esplosione, 5 Levitazione, 6 Presa, 7 Terremoto, 8 Tornado, 9 Meteore, 10 Singolarità).
- Al computer: T scrivi un incantesimo, P spendi i punti, N quaderno, V viaggio rapido, Esc chiude il foglio.

## Comandi per chi sviluppa

```powershell
pnpm install
pnpm dev          # il gioco in sviluppo, si aggiorna a ogni modifica
pnpm typecheck    # controllo dei tipi
pnpm test         # prove senza grafica: costruzioni in piedi da sole, rammendo, gelo, muri, cambio di luogo
pnpm build        # crea dist/index.html: un solo file, si apre con un doppio clic
```

## Misurare la fluidità

Chi sviluppa non ha una scheda grafica vera: per sapere come va il gioco su un dispositivo lo si chiede al gioco stesso.
Dalla schermata d'ingresso, «Misura la fluidità su questo dispositivo» (oppure `?misura` in fondo all'indirizzo): il
gioco fa da solo un giro di due minuti per il villaggio e le quattro zone fatte a mano, con due scoppi, al massimo
dettaglio, e alla fine dice per ogni posto quante immagini al secondo escono (in media e nei momenti peggiori) con un
giudizio in parole e un testo da copiare e mandare. Durante la misura il gioco non salva nulla.

## Dove sta cosa

- `src/mago.ts`, `src/magoUi.ts`: vita, mana, livelli, essenze e le loro barre. `src/creature.ts`: le creature di ogni terra e i guardiani. `src/viaggioUi.ts`: il viaggio rapido. `src/quadernoUi.ts`: il quaderno.
- `src/cantiere.ts`: ciò che chi gioca costruisce, e come si ricorda.
- `src/giornata.ts`: il giro del giorno e della notte.
- `src/sfide.ts`: le regole di ogni terra e le sfide.
- `src/missioni.ts`, `src/abitanti.ts`: le missioni con il loro quaderno delle soluzioni, e gli abitanti che le danno.
- `src/incantesimi/parole.ts`, `src/paroleUi.ts`: il vocabolario, la lettura di un incantesimo scritto, il foglio per scriverlo.

- `src/mondo/`: `zone.ts` (il clima che decide le terre, e la sorte che decide i luoghi), `terreno.ts` (zolle che
  nascono attorno a chi gioca e vengono riusate), cielo, erba e fiori, vegetazione, e `costruzioni.ts` che disegna
  ogni tipo di luogo pezzo per pezzo.
  `campo.ts` tiene lo stato del prato (bruciato, gelato, rigoglioso, in fiamme) a quadretti.
- `src/mondo/fatte/`: le zone fatte a mano. `suoli.ts` (la forma del terreno di ognuna), `elenco.ts` (quali sono),
  `scene.ts` (carica forme, ingombri, luci e fumo dei camini), `*Dati.ts` (scritti dagli strumenti: non si toccano).
  `cose.ts` (gli oggetti sciolti: ognuno è un pezzo vero con la sua forma sopra), `paesani.ts` (la gente).
  Le scene si costruiscono con Blender dagli script in `strumenti/scene/`; come, sta in `docs/progetto.md`.
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
- `strumenti/`: ciò che serve a chi sviluppa e non finisce nel gioco. `scene/` costruisce con Blender le zone fatte a
  mano; `vedere/` guarda e fotografa scene e gioco senza scheda grafica, e conta i triangoli. Come si usano, e a che
  punto è il lavoro, sta in `docs/dove-siamo.md`.

