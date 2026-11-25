// Grava um trace do Chrome durante uma troca de personagem (modo celular, GPU real) e resume
// quais etapas do navegador gastam mais tempo. Uso: node scripts/trace_troca.mjs [id]
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/vitor/AppData/Roaming/npm/node_modules/hyperframes/package.json');
const puppeteer = require('puppeteer-core');
const CHROME = 'D:/Claude config/cache/puppeteer/chrome/win64-157.0.8103.78/chrome-win64/chrome.exe';
const id = process.argv[2] || 'thorfinn';
const espera = ms => new Promise(r => setTimeout(r, ms));
const nav = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11'] });
const pg = await nav.newPage();
await pg.setViewport({ width: 384, height: 832, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
const cdp = await pg.createCDPSession();
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await pg.goto('http://localhost:5517/?p=gojo', { waitUntil: 'load', timeout: 90000 });
await pg.evaluate(() => localStorage.setItem('lebot:convite', '1'));
await espera(4500);
const arq = 'D:/Claude config/temp/trace_troca.json';
await pg.tracing.start({ path: arq, categories: ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'blink', 'cc', 'gpu', 'v8'] });
await pg.evaluate(async id => {
  document.getElementById('btn-tema').click();
  await new Promise(r => setTimeout(r, 350));
  document.querySelector(`#roster-lista button[data-id="${id}"]`).click();
  const t0 = performance.now(), el = document.getElementById('cortina');
  while ((document.documentElement.dataset.theme !== id || !el.hidden) && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 30));
  await new Promise(r => setTimeout(r, 1500));
}, id);
await pg.tracing.stop();
await nav.close();

const ev = JSON.parse(fs.readFileSync(arq, 'utf8')).traceEvents.filter(e => e.ph === 'X' && e.dur);
const main = ev.filter(e => e.cat.includes('devtools.timeline'));
const soma = {};
for (const e of main) soma[e.name] = (soma[e.name] || 0) + e.dur / 1000;
console.log('Tempo total por etapa (ms, CPU 4x mais lenta):');
for (const [k, v] of Object.entries(soma).sort((a, b) => b[1] - a[1]).slice(0, 14)) console.log(`  ${k.padEnd(28)} ${v.toFixed(0)}`);
console.log('\nMaiores eventos individuais:');
for (const e of main.filter(e => ['UpdateLayoutTree', 'Layout', 'Paint', 'Decode Image', 'ImageDecodeTask', 'ParseAuthorStyleSheet', 'RecalculateStyles', 'PrePaint', 'Layerize', 'Commit', 'FunctionCall', 'EvaluateScript', 'v8.compile'].includes(e.name)).sort((a, b) => b.dur - a.dur).slice(0, 14)) {
  const d = e.args && (e.args.beginData || e.args.data) || {};
  console.log(`  ${e.name.padEnd(20)} ${(e.dur / 1000).toFixed(0).padStart(5)} ms  ${d.elementCount ? 'elementos=' + d.elementCount : ''} ${d.url ? d.url.split('/').slice(-2).join('/') : ''} ${d.functionName || ''}`);
}
