# Dove siamo

Questo foglio serve a riprendere il lavoro in una sessione nuova senza perdere il filo. `docs/progetto.md` dice **che
gioco è**; qui c'è **a che punto siamo**: cosa aspetta una risposta del fondatore, cosa viene dopo, cosa non è stato
verificato, come si usano gli attrezzi. Chi lavora lo aggiorna alla fine di ogni giro di lavoro, nello stesso commit.

Aggiornato il 17 novembre 2026.

## In due righe

Il gioco è online (https://marioschi15-collab.github.io/Legend-WIZARD/, si pubblica da solo a ogni push su `main`).
Ha cinque zone fatte a mano con Blender; l'ultima, le Rovine del Cristallo, è la **prova di uno stile disegnato** che
il fondatore sta valutando al posto del realistico.

## Decisioni che aspettano il fondatore

1. **Lo stile.** Ha mostrato un'illustrazione (rovine chiare al crepuscolo, cristalli viola, mani e bastone in primo
   piano) e vuole «quella grafica, tutta in programmazione». Gli è stato costruito un posto di prova (le Rovine del
   Cristallo) e chiesto di guardarlo sul suo PC: **se gli piace, tutto il gioco passa a quello stile** (le forme delle
   altre zone restano, cambiano materie, colori e luce); se no, resta una zona in più. Non ha ancora risposto.
2. **I paesi pacifici si possono distruggere?** (Borgo d'Inverno e Porto delle Nebbie.) E se sì: la gente scappa, le
   guardie reagiscono, si ripara da solo? Serve prima del passo 3 della fisica.
3. **Il risultato della misura della fluidità** sul suo computer (`?misura` in fondo all'indirizzo): non è ancora
   arrivato. Quando arriva dice, posto per posto, dove alleggerire.
4. **La gente dei paesi nuovi deve dare missioni?** Oggi passeggia e basta.
5. **Higgsfield** (creature fatte con l'intelligenza artificiale): il conto è a zero crediti. Non si spende nulla
   senza un sì esplicito.

## I prossimi passi, in ordine

1. **Mani, maniche e bastone con il cristallo viola in primo piano; barre e riquadri degli incantesimi** come
   nell'illustrazione. Vale per qualunque stile; al fondatore è stato detto che è il passo successivo.
2. **Fisica, passo 2: usare le cose** (porte che si aprono, alcune case in cui si entra, saracinesca e gru con la
   leva, lanterne che si accendono e si spengono con fuoco e gelo, barca a remi, mulino che gira).
3. **Fisica, passo 3: case e mura che crollano a pezzi grandi**, prima solo al castello (dopo la decisione 2).
4. **Fisica, passo 4: il terreno** (crateri, scavare, muri di terra).
5. Se lo stile disegnato viene scelto: convertire le zone una alla volta; il cielo dipinto dal codice invece della
   fotografia tinta; le montagne sullo sfondo; l'edera sulle rovine; l'acqua della cascata vista da vicino.
6. Debiti vecchi: le creature oltre il golem (scorpione, lume e abitanti sono ancora forme semplici), gli oggetti da
   trovare e indossare, effetti delle magie più belli.

## Cosa non è verificato

Chi sviluppa lavora senza scheda grafica e dalla sua macchina il computer del fondatore non si raggiunge. Quindi:
- **la fluidità non è mai stata misurata su un dispositivo vero**, né su un telefono; i comandi a dita nemmeno;
- le zone fatte a mano sono state viste dentro il gioco in una o due foto ferme ciascuna; delle Rovine del Cristallo
  la cascata, l'acquedotto e la torre da vicino solo in anteprima (dove l'acqua non scorre);
- degli oggetti sciolti è provato in automatico che stanno fermi, si spostano, si sfasciano, bruciano e tornano
  interi; nel gioco si è visto un solo scoppio al porto. Camminarci contro, Levitazione, Presa, Tornado e Gelo su
  di loro non sono stati provati (dovrebbero valere: agiscono su tutti i pezzi);
- salire sulle navi dalla passerella e camminare sullo stagno ghiacciato non sono stati provati camminando;
- il bagliore dei cristalli su una scheda vera, e la misura stessa su una scheda vera.

## Gli attrezzi

Comandi di sempre (anche in `CLAUDE.md`): `pnpm typecheck`, `pnpm test`, `pnpm build` verdi prima di ogni commit.

**Costruire le scene con Blender** (`strumenti/scene/`, uno script per zona: `strega.py`, `borgo.py`, `porto.py`,
`castello.py`, `rovine.py`). Serve Blender come libreria di Python e il compressore:

    python3 -m venv /opt/blender-env && /opt/blender-env/bin/pip install bpy     # mezzo minuto
    npm install -g @gltf-transform/cli
    cd strumenti/scene && ANTEPRIMA=../vedere/anteprima /opt/blender-env/bin/python rovine.py

Ogni scena si rifà in 30-60 secondi e, se non si è cambiato niente, esce identica (si vede da `git status`).
Le materie dipinte dal codice: `python3 strumenti/scene/dipingi.py`.
Per una zona nuova: la formula del terreno nei due `suoli` (`strumenti/scene/suoli.py` e `src/mondo/fatte/suoli.ts`),
lo script, una riga in `src/mondo/fatte/elenco.ts`, la terra in `src/mondo/zone.ts`, la regola in `src/sfide.ts`, le
piccole cose in `src/mondo/minuti.ts`, la creatura di casa in `DI_CASA` (`src/creature.ts`), una sosta in
`SOSTE_MISURA` (`src/main.ts`). `prove/fatte.ts` controlla il resto.

**Guardare senza scheda grafica** (`strumenti/vedere/`, ognuno con le istruzioni in testa al file):
- `vedi.html` e `vedi.cjs`: una scena fuori dal gioco, in pochi secondi, con la luce che si vuole. È il modo svelto;
- `foto-gioco.cjs`: fotografa il gioco vero pilotandolo. Lento (4-8 minuti per due foto), ma è l'unica prova vera
  dell'aspetto. Nelle zone piene di alberi può andare in tempo scaduto: non è un difetto del gioco;
- `conta.cjs`: che cosa pesa di più da disegnare in un posto (triangoli per forma);
- `giro-misura.cjs`: fa girare qui la misura della fluidità. I suoi numeri qui non valgono, i triangoli sì.

**La misura sul computer del fondatore**: apre il gioco con `?misura`, aspetta due minuti, copia il testo e lo manda.

## Trappole già incontrate

- Nei file di scena **le tinte sopra 1 vengono tagliate**: per schiarire una materia serve un'immagine più chiara.
- `bpy` va importato prima di `bmesh`. I nomi degli oggetti nel file di scena non devono avere punti dove servono
  al gioco (le forme degli oggetti sciolti si chiamano `cosa__tipo__materia`).
- Le materie del gioco tengono il loro nome (`m.name`): chi stacca un pezzo dalla scena la ritrova da lì.
- `posa(a, b, giro)`: `a` verso est, `b` verso sud; con `giro = 0` il davanti guarda a sud. In Blender `y = -b`.
- Il terreno è una maglia di 3,25 metri: pareti più ripide di 50 gradi diventano gradoni. Le scene si appoggiano
  sull'altezza che si vede (`terreno.terra`), non su quella della formula.
- Dentro una zona fatta a mano vale solo il terreno disegnato; sul bordo sfuma nel paesaggio. Le zone non devono
  toccarsi né toccare il villaggio di partenza (lo controlla `prove/fatte.ts`).
- I pezzi della fisica (`src/fisica/pezzi.ts`) sono solo scatole: un oggetto tondo ha la sua forma disegnata sopra una
  scatola nascosta, quindi non rotola.
- In cima allo schermo «N pezzi in movimento» subito dopo l'avvio sono i pezzi del villaggio che si assestano.
- Fiori, cespugli e felci sono fatti di migliaia di triangoli: prima di aggiungerne, contare con `conta.cjs`.
- La scritta in alto può restare ferma sulla terra di partenza nelle foto fatte a tempo fermo: non è un difetto.

## Ciò che non sta nel progetto

- Le fotografie e i modelli originali presi da Poly Haven (nel progetto ci sono solo quelli già lavorati): si
  riscaricano con `python3 strumenti/scarica_polyhaven.py`, da una macchina che possa raggiungere `api.polyhaven.com`
  e `dl.polyhaven.org`.
- L'immagine di riferimento dello stile disegnato l'ha il fondatore; qui è descritta in `docs/progetto.md`.
