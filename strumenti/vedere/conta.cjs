// Dice che cosa pesa di più da disegnare in un posto: per ogni forma, quante copie e quanti triangoli.
//   QUALITA='{}' node strumenti/vedere/conta.cjs        (con il gioco servito su http://localhost:8126)
// I posti da guardare sono nell'elenco qui sotto (nome, x, z).
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await (await browser.newContext({ viewport: { width: 320, height: 180 } })).newPage();
  await page.addInitScript((q) => { window.raduraQualita = q; }, JSON.parse(process.env.QUALITA || '{}'));
  await page.goto('http://localhost:8126/index.html');
  await page.waitForFunction(() => window.radura, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  for (const [nome, x, z] of [['villaggio', 0, 41], ['castello campo', -701, 301]]) {
    const r = await page.evaluate(([x, z]) => {
      const r = window.radura; r.fermo = true; r.vai(x, z, 0, 0.02); r.scorri(0.5);
      const voci = [];
      r.g.scena.traverse((o) => {
        if (!o.isMesh && !o.isPoints) return;
        let vis = true; for (let p = o; p; p = p.parent) if (!p.visible) vis = false;
        if (!vis) return;
        const g = o.geometry; const tri = (g.index ? g.index.count : (g.attributes.position ? g.attributes.position.count : 0)) / 3;
        const copie = o.isInstancedMesh ? o.count : 1;
        const src = o.material && o.material.map && o.material.map.source && o.material.map.source.data && o.material.map.source.data.src ? String(o.material.map.source.data.src).split('/').pop().slice(0, 28) : '';
        voci.push({ nome: (o.name || o.type) + ' ' + src + (o.castShadow ? ' ombra' : ''), tri: Math.round(tri), copie, totale: Math.round(tri * copie) });
      });
      voci.sort((a, b) => b.totale - a.totale);
      return { somma: voci.reduce((n, v) => n + v.totale, 0), voci: voci.slice(0, 9) };
    }, [x, z]);
    console.log('\n' + nome, 'somma', Math.round(r.somma / 1000) + 'k');
    for (const v of r.voci) console.log('  ', String(Math.round(v.totale / 1000)).padStart(6) + 'k', String(v.copie).padStart(6), 'x', String(v.tri).padStart(6), v.nome);
  }
  await browser.close();
})();
