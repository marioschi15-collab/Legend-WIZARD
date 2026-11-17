// Fotografa una scena fatta con Blender fuori dal gioco (molto più svelto che dentro il gioco).
//   1. costruisci la scena salvando anche il terreno di anteprima:
//        cd strumenti/scene && ANTEPRIMA=../vedere/anteprima /opt/blender-env/bin/python rovine.py
//   2. servi la cartella del progetto:   python3 -m http.server 8125     (dalla radice del progetto)
//   3. node strumenti/vedere/vedi.cjs "/tmp/r1=s=rovine_cristallo&t=anteprima/rovine_terreno.glb&cam=0.5,8.3,69&mira=-3,13,-30&fov=64"
// Ogni argomento è «dove salvare la foto = parametri» (vedi vedi.html). Il nome del terreno è quello della zona in
// strumenti/scene/suoli.py (strega, borgo, porto, castello, rovine), non quello del file della scena.
// Le luci di prova usate finora: crepuscolo viola  cielo=9a82c8&nebbia=0.004&alta=cfc4ff&bassa=6a5f8a&amb=1.7&sole=ffc49c&forza=3.0
//   neve  cielo=9fb4cc&nebbia=0.006&alta=b8ccf0&bassa=8a9ab8&amb=1.3&sole=d8e0f0&forza=1.2
//   nebbia di mare  cielo=8f9aa0&nebbia=0.011&alta=a8b4bc&bassa=4a4a44&amb=1.4&sole=c8d0d8&forza=1.1&acqua=33434a
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const q of process.argv.slice(2)) {
    const i = q.indexOf('='); const nome = q.slice(0, i), qs = q.slice(i + 1);
    const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
    p.on('pageerror', (e) => console.log('PAGEERR', e.message));
    await p.goto('http://localhost:8125/strumenti/vedere/vedi.html?' + qs);
    await p.waitForFunction(() => window.pronto, null, { timeout: 280000 });
    console.log(nome, await p.evaluate(() => window.pronto));
    await p.screenshot({ path: nome + '.png', timeout: 180000 }); await p.close();
  }
  await b.close();
})();
