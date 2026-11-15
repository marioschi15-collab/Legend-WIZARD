import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// Il gioco esce come un solo file (dist/index.html) che si apre con un doppio clic o si pubblica così com'è.
export default defineConfig({
  plugins: [viteSingleFile()],
  // La data di costruzione, mostrata nella schermata d'ingresso: così si capisce subito quale versione si sta guardando.
  define: { __VERSIONE__: JSON.stringify(new Date().toLocaleString('it-IT', { timeZone: 'Europe/Rome', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })) },
  build: { target: 'es2022', chunkSizeWarningLimit: 6000 },
});
