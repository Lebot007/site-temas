// Teste da troca de personagem no celular (cortina), com Chrome real em modo celular e CPU lenta.
// Uso: node scripts/teste_troca_celular.mjs [url]   (padrão: servidor local http://localhost:5517/)
// Regras verificadas a cada quadro:
//   1) o tema só muda enquanto a cortina cobre a tela inteira (nunca aparece mistura dos dois temas);
//   2) toda troca anima (o círculo passa por tamanhos intermediários);
//   3) no fim a cortina some e o tema é o escolhido.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/vitor/AppData/Roaming/npm/node_modules/hyperframes/package.json');
const puppeteer = require('puppeteer-core');
const CHROME = 'D:/Claude config/cache/puppeteer/chrome/win64-157.0.8103.78/chrome-win64/chrome.exe';
const URL0 = process.argv[2] || 'http://localhost:5517/';
const espera = ms => new Promise(r => setTimeout(r, ms));

const nav = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
const pg = await nav.newPage();
// Galaxy S24 Ultra: 1440x3120 a 3.75x -> 384x832 CSS
await pg.setUserAgent('Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36');
await pg.setViewport({ width: 384, height: 832, deviceScaleFactor: 3.75, isMobile: true, hasTouch: true });
const cdp = await pg.createCDPSession();
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 6 });
await cdp.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
// o Chrome sem janela se declara com "reduzir movimento"; um S24 normal não
await pg.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: process.env.REDUZ ? 'reduce' : 'no-preference' }]);
await cdp.send('Emulation.setEmitTouchEventsForMouse', { enabled: true, configuration: 'mobile' });
const erros = [];
pg.on('pageerror', e => erros.push(String(e)));
await pg.goto(URL0 + '?p=gojo', { waitUntil: 'load', timeout: 90000 });
await pg.evaluate(q => { localStorage.setItem('lebot:convite', '1'); localStorage.setItem('lebot:qualidade', q); }, process.env.Q || 'medio');
await pg.reload({ waitUntil: 'load', timeout: 90000 });
await espera(3500);
const tela = await pg.evaluate(() => ({ toque: matchMedia('(pointer: coarse)').matches, mouse: matchMedia('(hover: hover) and (pointer: fine)').matches }));
console.log('aparelho:', JSON.stringify(tela), '-> usa', tela.mouse ? 'View Transitions (PC)' : 'cortina (celular)');

const SEQ = (process.env.SEQ || 'sukuna,frieren,kaneki,emilia,rem,thorfinn,capri,beatrice,eren,gojo').split(',');
let falhas = 0;
for (let i = 0; i < SEQ.length; i++) {
  const id = SEQ[i];
  const rapido = i === 4;   // uma troca "afobada": escolhe outro personagem no meio da anterior
  const r = await pg.evaluate(async (id, rapido) => {
    const raiz = document.documentElement, el = document.getElementById('cortina'), circ = el.querySelector('.cortina-circ');
    const antes = raiz.dataset.theme, log = [];
    let rodando = true;
    const amostra = () => {
      const m = new DOMMatrix(getComputedStyle(circ).transform);
      log.push({ t: performance.now(), tema: raiz.dataset.theme, vis: !el.hidden, esc: m.a, op: +getComputedStyle(el).opacity * +getComputedStyle(circ).opacity });
      if (rodando) requestAnimationFrame(amostra);
    };
    requestAnimationFrame(amostra);
    document.getElementById('btn-tema').click();
    await new Promise(r => setTimeout(r, 350));
    document.querySelector(`#roster-lista button[data-id="${id}"]`).click();
    let alvo = id;
    if (rapido) {
      await new Promise(r => setTimeout(r, 900));
      alvo = 'sukuna';
      document.getElementById('btn-tema').click();
      await new Promise(r => setTimeout(r, 200));
      document.querySelector(`#roster-lista button[data-id="${alvo}"]`).click();
    }
    const t0 = performance.now();
    while ((raiz.dataset.theme !== alvo || !el.hidden) && performance.now() - t0 < 12000) await new Promise(r => setTimeout(r, 50));
    await new Promise(r => setTimeout(r, 300));
    rodando = false;
    const trocas = log.filter((l, k) => k && l.tema !== log[k - 1].tema);
    const misturado = trocas.filter(l => !(l.vis && l.esc > 0.999 && l.op > 0.999));
    // anima = o círculo cresce (normal) ou a cortina esmaece (reduzir movimento)
    const intermed = log.filter(l => l.vis && ((l.esc > 0.05 && l.esc < 0.95) || (l.op > 0.05 && l.op < 0.95))).length;
    return { antes, alvo, final: raiz.dataset.theme, cortinaSumiu: el.hidden, quadros: log.length, trocas: trocas.length,
             misturado: misturado.length, intermed, visiveis: log.filter(l => l.vis).length, escalas: [...new Set(log.filter(l => l.vis).map(l => l.esc.toFixed(2)))].slice(0, 12).join(','), ops: [...new Set(log.filter(l => l.vis).map(l => l.op.toFixed(2)))].slice(0, 8).join(','), dur: Math.round(log[log.length - 1].t - log[0].t) };
  }, id, rapido);
  const ok = r.final === r.alvo && r.cortinaSumiu && r.misturado === 0 && r.intermed > 0;
  if (!ok) falhas++;
  console.log(`${ok ? 'OK ' : 'FALHA'} ${r.antes} -> ${r.alvo}${rapido ? ' (troca no meio)' : ''}: quadros=${r.quadros} animou=${r.intermed > 0} ` +
              `tema-trocou-sem-cobrir=${r.misturado} cortina-sumiu=${r.cortinaSumiu} final=${r.final} (${r.dur} ms) vis=${r.visiveis} esc=[${r.escalas}] op=[${r.ops}]`);
  if (rapido) i++;   // a sequência continua a partir do personagem escolhido por último
  await espera(1500);
}
console.log(erros.length ? 'ERROS NA PÁGINA:\n' + erros.join('\n') : 'sem erros de JavaScript');
console.log(falhas ? `${falhas} FALHA(S)` : 'TUDO OK');
await nav.close();
process.exit(falhas ? 1 : 0);
