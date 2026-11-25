// Mede quadros e travadas durante a troca de personagem no modo celular, usando a GPU de verdade.
// Uso: node scripts/medir_fps_troca.mjs [url]   (padrão http://localhost:5517/)
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/vitor/AppData/Roaming/npm/node_modules/hyperframes/package.json');
const puppeteer = require('puppeteer-core');
const CHROME = 'D:/Claude config/cache/puppeteer/chrome/win64-157.0.8103.78/chrome-win64/chrome.exe';
const URL0 = process.argv[2] || 'http://localhost:5517/';
const espera = ms => new Promise(r => setTimeout(r, ms));

const nav = await puppeteer.launch({ executablePath: CHROME, headless: 'new',
  args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-unsafe-swiftshader=false'] });
const pg = await nav.newPage();
await pg.setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
await pg.setViewport({ width: 384, height: 832, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const cdp = await pg.createCDPSession();
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.CPU || 4) });
await pg.goto(URL0 + '?p=gojo', { waitUntil: 'load', timeout: 90000 });
await pg.evaluate(() => { localStorage.setItem('lebot:convite', '1'); localStorage.removeItem('lebot:qualidade'); });
await pg.reload({ waitUntil: 'load', timeout: 90000 });
await espera(4000);
const info = await pg.evaluate(() => {
  const gl = document.createElement('canvas').getContext('webgl');
  const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
  return { gpu: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'sem webgl', qualidade: document.getElementById('sel-qualidade').value || 'automático' };
});
console.log('GPU:', info.gpu, '| qualidade:', info.qualidade);

for (const id of (process.env.SEQ || 'thorfinn,kaneki,frieren,rem').split(',')) {
  const r = await pg.evaluate(async id => {
    const longas = [];
    const po = new PerformanceObserver(l => { for (const e of l.getEntries()) longas.push({ ms: Math.round(e.duration), em: Math.round(e.startTime), de: (e.scripts || []).map(s => `${(s.sourceFunctionName || s.invoker || '?')}@${(s.sourceURL || '').split('/').pop()}`).slice(0, 2).join(' | ') }); });
    try { po.observe({ type: 'long-animation-frame', buffered: false }); } catch { po.observe({ type: 'longtask' }); }
    const q = [], cob = []; let rodando = true, ant = performance.now();
    const el0 = document.getElementById('cortina'), circ = el0.querySelector('.cortina-circ');
    // "coberto" = cortina visível, círculo cheio e opaca: o que acontece aí ninguém vê
    const coberto = () => !el0.hidden && ((c) => { const m = /circle\(([\d.]+)px/.exec(getComputedStyle(c).clipPath || ''); return m ? Math.min(1, +m[1] / (+c.dataset.r || 1)) : 0; })(circ) > 0.999 && +getComputedStyle(el0).opacity > 0.999;
    let fase = 'abrindo a seleção';
    const fases = [];
    const qualFase = () => {
      if (fase === 'abrindo a seleção' || el0.hidden) return fase;
      const e = ((c) => { const m = /circle\(([\d.]+)px/.exec(getComputedStyle(c).clipPath || ''); return m ? Math.min(1, +m[1] / (+c.dataset.r || 1)) : 0; })(circ), o = +getComputedStyle(el0).opacity;
      return e < 0.999 ? 'círculo crescendo' : o > 0.999 ? 'coberto' : 'cortina abrindo';
    };
    const f = t => { q.push(t - ant); cob.push(coberto()); fases.push(qualFase()); ant = t; if (rodando) requestAnimationFrame(f); };
    requestAnimationFrame(f);
    const t0 = performance.now();
    document.getElementById('btn-tema').click();
    await new Promise(r => setTimeout(r, 350));
    document.querySelector(`#roster-lista button[data-id="${id}"]`).click();
    fase = 'esperando/pós-troca';
    const el = document.getElementById('cortina');
    const obs = setInterval(() => { if (el.hidden && document.documentElement.dataset.theme === id) { fase = 'personagem entrando'; clearInterval(obs); } }, 16);
    while ((document.documentElement.dataset.theme !== id || !el.hidden) && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 30));
    await new Promise(r => setTimeout(r, 1500));   // inclui a entrada do personagem depois da cortina
    rodando = false; po.disconnect();
    const ruins = q.filter(d => d > 34).length, piores = q.slice().sort((a, b) => b - a).slice(0, 5).map(Math.round);
    const media = q.reduce((a, b) => a + b, 0) / q.length;
    const vis = q.filter((d, i) => !cob[i] && !cob[i - 1]);
    const porFase = {};
    q.forEach((d, i) => { if (d > 34 && !cob[i] && !cob[i - 1]) porFase[fases[i]] = (porFase[fases[i]] || []).concat(Math.round(d)); });
    const ruinsVis = vis.filter(d => d > 34).length, pioresVis = vis.slice().sort((a, b) => b - a).slice(0, 4).map(Math.round);
    return { id, ruinsVis, pioresVis, porFase, quadros: q.length, fpsMedio: Math.round(1000 / media), acimaDe34ms: ruins, piores, longas: longas.filter(l => l.em > t0 - 100).slice(0, 8) };
  }, id);
  console.log(`\n-> ${r.id}: À MOSTRA ${r.ruinsVis} lentos (piores ${r.pioresVis.join(', ')} ms) | total ${r.quadros} quadros, ~${r.fpsMedio} fps, ${r.acimaDe34ms} quadros lentos (>34 ms); piores: ${r.piores.join(', ')} ms`);
  for (const [fa, v] of Object.entries(r.porFase)) console.log(`   lento à mostra em "${fa}": ${v.join(', ')} ms`);
  if (!process.env.LONGAS) continue;
  for (const l of r.longas) console.log(`   travada ${l.ms} ms em ${l.em}: ${l.de || '(sem script: estilo/layout/pintura)'}`);
  await espera(1500);
}
await nav.close();
