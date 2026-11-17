// Fotografa il gioco vero, pilotandolo senza mouse (serve Playwright, che in questa macchina c'è già).
//   pnpm build && (cd dist && python3 -m http.server 8126 &)
//   PASSI="$(cat passi.json)" QUALITA='{"bagliore":true,"siAdatta":false,"ombre":false,"densitaPixel":1}' LARGO=800 ALTO=450 \
//     node strumenti/vedere/foto-gioco.cjs http://localhost:8126/index.html /tmp/foto
// PASSI è un elenco di passi: {"js": "codice da eseguire nella pagina", "aspetta": millisecondi, "foto": true|false}.
// Nella pagina c'è la maniglia `window.radura` (vedi in fondo a src/main.ts): `r.fermo = true` ferma il tempo,
// `r.vai(x, z, imbardata, beccheggio)` sposta chi gioca (imbardata 0 guarda a nord, cioè verso le z che calano),
// `r.scorri(secondi)` manda avanti il gioco, `r.g.pezzi.spinta(x, y, z, raggio, forza, alzata)` fa scoppiare.
// Il primo passo deve premere «Entra nel mondo»: document.getElementById('entra').click().
// Senza scheda grafica ogni immagine è lentissima: finestra piccola, poca erba, e mai più di due foto per giro.
// Nelle zone piene di alberi (il castello) la foto può andare in tempo scaduto: non è un difetto del gioco.
const { chromium } = require('playwright');
(async () => {
const [,, file, out, modo] = process.argv;
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext(modo === 'tel'
  ? { viewport: { width: 390, height: 780 }, hasTouch: true, isMobile: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }
  : { viewport: { width: +(process.env.LARGO ?? 720), height: +(process.env.ALTO ?? 405) } });
const page = await ctx.newPage();
await page.addInitScript((q) => { window.raduraQualita = q; }, JSON.parse(process.env.QUALITA ?? '{}'));
const errori = [];
page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errori.push(m.text().slice(0, 300)); });
page.on('pageerror', (e) => errori.push('PAGEERROR ' + e.message));
await page.goto(file);
await page.waitForFunction(() => window.radura, null, { timeout: 60000 });
await page.waitForTimeout(1500);
const passi = JSON.parse(process.env.PASSI ?? '[]');
let n = 1;
for (const p of passi) {
  if (p.js) { const r = await page.evaluate(p.js); if (r !== undefined) console.log('>>', JSON.stringify(r)); }
  if (p.aspetta) await page.waitForTimeout(p.aspetta);
  if (p.foto) await page.screenshot({ path: `${out}-${n++}.png`, timeout: 170000 });
}
console.log(JSON.stringify(errori.slice(0, 15), null, 1));
await browser.close();
})();
