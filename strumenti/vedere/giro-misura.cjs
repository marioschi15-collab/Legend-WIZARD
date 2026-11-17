// Fa girare qui la misura della fluidità (?misura) dall'inizio alla fine e ne stampa il risultato.
//   node strumenti/vedere/giro-misura.cjs /tmp/misura-fine.png      (con il gioco servito su http://localhost:8126)
// Senza scheda grafica i numeri non valgono niente (meno di una immagine al secondo), ma i triangoli sì, e si vede
// se il giro arriva in fondo.
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 400, height: 225 } })).newPage();
  await page.addInitScript((q) => { window.raduraQualita = q; }, { filiErba: 300, fiori: 0, latoOmbre: 256, densitaPixel: 1, bagliore: false, siAdatta: false, ombre: false });
  const errori = [];
  page.on('console', (m) => { if (m.type() === 'error') errori.push(m.text().slice(0, 300)); });
  page.on('pageerror', (e) => errori.push('PAGEERROR ' + e.message + ' ' + (e.stack || '').slice(0, 500)));
  await page.goto('http://localhost:8126/index.html?misura');
  const t0 = Date.now();
  let ultimo = '';
  for (;;) {
    await page.waitForTimeout(5000);
    const stato = await page.evaluate(() => { const t = document.querySelector('textarea'); if (t) return 'FINE\n' + t.value; const d = [...document.querySelectorAll('div')].find((x) => /\d di \d/.test(x.textContent || '') && x.children.length === 0); return d ? d.textContent : '(niente)'; });
    if (stato.startsWith('FINE')) { console.log('finito in', Math.round((Date.now() - t0) / 1000), 's\n' + stato); break; }
    if (stato !== ultimo) { console.log(Math.round((Date.now() - t0) / 1000) + 's', stato); ultimo = stato; }
    if (Date.now() - t0 > 14 * 60000) { console.log('TROPPO'); break; }
  }
  await page.screenshot({ path: process.argv[2], timeout: 170000 }).catch((e) => console.log('foto fallita', e.message.slice(0, 80)));
  console.log(JSON.stringify(errori.slice(0, 8), null, 1));
  await browser.close();
})();
