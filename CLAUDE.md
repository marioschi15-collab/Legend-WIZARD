# Legend Wizard (nome di lavoro del gioco: Radura) — istruzioni per Claude Code

Gioco per browser, telefono e computer: un mago avventuriero in un mondo senza confini, che supera le missioni
inventando incantesimi a parole. Motore three.js + Rapier. L'aspetto punta al realistico: superfici, cieli e modelli presi dal vero (liberi da diritti,
in `public/`), mentre case, creature e suoni nascono dal codice. È in prova uno stile disegnato fatto tutto dal
codice (le Rovine del Cristallo, vedi `docs/progetto.md`): se il fondatore lo sceglie, diventa quello del gioco.

Il fondatore **non programma**: spiegagli le cose in italiano semplice, senza gergo, e chiedigli conferma solo per
decisioni di prodotto. Le decisioni tecniche le prendi tu.

## Da leggere prima di lavorare

- `docs/dove-siamo.md`: **a che punto siamo**. Le decisioni che aspettano il fondatore, i prossimi passi in ordine,
  ciò che non è stato verificato, come si usano gli attrezzi (Blender, le foto, la misura) e le trappole già
  incontrate. Si legge per primo quando si riprende il lavoro, e si aggiorna alla fine di ogni giro, nello stesso commit.
- `docs/progetto.md`: **che gioco è** e le sette tappe. È la fonte di verità: se il gioco deve cambiare strada, si
  cambia prima quel documento, nello stesso commit. Si lavora una tappa per volta.
- `README.md`: come si gioca oggi, dove sta cosa nel codice, i comandi.

## Comandi

```powershell
pnpm install
pnpm typecheck    # controllo dei tipi
pnpm test         # prove senza grafica (costruzioni in piedi, rammendo, gelo, muri, cambio di luogo)
pnpm build        # crea dist/index.html: un solo file che contiene tutto il gioco
pnpm dev          # il gioco in sviluppo
```

## Come lavorare

- Prima di committare: `pnpm typecheck`, `pnpm test`, `pnpm build` verdi. Messaggi di commit in italiano, che dicono
  cosa cambia e perché.
- Ogni difetto trovato provando il gioco diventa anche una prova in `prove/`, quando si può.
- Chi sviluppa non ha una scheda grafica né un telefono vero: ciò che riguarda fluidità, aspetto e comandi a dita va
  detto chiaramente come «non verificato» e fatto provare al fondatore.
- Per la fluidità c'è la misura: il fondatore apre il gioco con `?misura` in fondo all'indirizzo (o preme «Misura la
  fluidità» nella schermata d'ingresso), aspetta due minuti e manda il testo del risultato. Il giro sta in
  `src/misura.ts` e le soste in `SOSTE_MISURA` (`src/main.ts`): quando nasce un posto pesante, lo si aggiunge lì.
- Codice: TypeScript strict ESM, import relativi con suffisso `.js`, nomi di dominio in italiano, moduli piccoli.
- Verso chi gioca mai gergo; tono adatto a tutti (le creature si sbriciolano, niente sangue).
- Non si vende mai nulla che dia un vantaggio nel gioco.
