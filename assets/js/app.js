import { TEMAS, ORDEM } from './temas.js';
import { PERFIS } from './perfis.js';
import { Voz } from './voice.js';
import { Atmosfera } from './fx.js';
import { detectar, salvarNivel, PRESETS, vigiarFps } from './perf.js';

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const raiz = document.documentElement;
const BASE = new URL('../../', import.meta.url).href;   // funciona no GitHub Pages (subpasta) e local
const NIVEIS = ['alto', 'medio', 'baixo', 'zero'];
const ehMouse = matchMedia('(hover: hover) and (pointer: fine)');

let IMGS = {};

// navegadores sem <dialog> (iOS < 15.4, TVs antigas): comportamento equivalente simples
for (const d of document.querySelectorAll('dialog')) {
  if (typeof d.showModal !== 'function') {
    d.showModal = () => { d.setAttribute('open', ''); d.classList.add('dialog-compat'); };
    d.close = () => { d.removeAttribute('open'); d.dispatchEvent(new Event('close')); };
    d.addEventListener('keydown', e => { if (e.key === 'Escape') d.close(); });
  }
}
const aberto = d => d.hasAttribute('open');
let temaAtual = null;
let qual = detectar();
const voz = new Voz();
let fx = null;

/* ---------------- qualidade adaptativa ---------------- */
function aplicarQualidade(nivel) {
  qual.nivel = nivel;
  const p = PRESETS[nivel];
  raiz.toggleAttribute('data-leve', nivel === 'baixo' || nivel === 'zero');
  if (nivel === 'zero') { fx && fx.parar(); return; }
  if (!fx) {
    fx = new Atmosfera($('#atmosfera'));
    if (!fx.ok) { fx = null; return; }
  }
  fx.qualidade(p.particulas, p.dpr);
  if (temaAtual) fx.tema(TEMAS[temaAtual].fx);
  fx.iniciar();
}

function iniciarQualidade() {
  const sel = $('#sel-qualidade');
  sel.value = qual.manual ? qual.nivel : '';
  sel.addEventListener('change', () => {
    salvarNivel(sel.value || null);
    qual = detectar();
    aplicarQualidade(qual.nivel);
  });
  aplicarQualidade(qual.nivel);
  // se o aparelho travar, reduz sozinho (só no modo automático)
  vigiarFps(() => {
    if (qual.manual) return false;
    const i = NIVEIS.indexOf(qual.nivel);
    if (i >= NIVEIS.length - 2) return false;
    aplicarQualidade(NIVEIS[i + 1]);
    return true;
  });
}

/* ---------------- fontes do tema ---------------- */
const fontesProntas = new Map();
function carregarFonte(t) {
  const href = `https://fonts.googleapis.com/css2?family=${t.fontes.google}&display=swap`;
  if (fontesProntas.has(href)) return fontesProntas.get(href);
  let link = [...document.querySelectorAll('link[rel="stylesheet"]')].find(l => l.href === href);
  const css = new Promise(ok => {
    if (link && link.sheet) return ok();
    if (!link) { link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href }); document.head.append(link); }
    link.addEventListener('load', ok, { once: true });
    link.addEventListener('error', ok, { once: true });
  });
  const pronto = css.then(() => document.fonts
    ? Promise.all([document.fonts.load(`700 1em "${t.fontes.display}"`), document.fonts.load(`400 1em "${t.fontes.body}"`)]).catch(() => {})
    : null);
  fontesProntas.set(href, pronto);
  return pronto;
}

// qual imagem do personagem usar (a mesma que é pré-carregada, para não trocar de arquivo no meio)
function srcHeroi(h) {
  const pequeno = matchMedia('(max-width: 860px)').matches && (devicePixelRatio || 1) < 2;
  return url(pequeno ? h.m : h.src);
}
function srcFundo(id) {
  return url(matchMedia('(max-width: 860px)').matches ? (img(id, 'fundo_m') || img(id, 'fundo')) : img(id, 'fundo'));
}
function preCarregar(u) {
  return new Promise(ok => {
    if (!u) return ok();
    const i = new Image();
    i.onload = i.onerror = () => ok();
    i.src = u;
    if (i.decode) i.decode().then(ok, ok);
  });
}
// tudo que o tema novo precisa antes de aparecer (com limite de tempo para conexão lenta)
function prepararTema(id) {
  const h = img(id, 'heroi');
  const tudo = Promise.all([
    carregarFonte(TEMAS[id]),
    h && preCarregar(srcHeroi(h)),
    preCarregar(srcFundo(id)),
    preCarregar(url(img(id, 'rosto'))),
  ]);
  return Promise.race([tudo, new Promise(ok => setTimeout(ok, 1800))]);
}

/* ---------------- ícone da aba no tema do personagem ---------------- */
function favicon(t) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.cores.acc}"/><stop offset="1" stop-color="${t.cores.acc2}"/></linearGradient></defs><rect width="64" height="64" rx="18" fill="${t.cores.bg}"/><rect x="3" y="3" width="58" height="58" rx="15" fill="none" stroke="url(#g)" stroke-width="4"/><text x="32" y="45" font-size="36" text-anchor="middle" fill="url(#g)" font-family="serif" font-weight="700">${t.kanji}</text></svg>`;
  const l = $('link[rel="icon"]');
  l.type = 'image/svg+xml';
  l.href = 'data:image/svg+xml,' + encodeURIComponent(svg);
}

/* ---------------- aviso rápido (ex.: "copiado") ---------------- */
let timerAviso = null;
function avisar(txt) {
  const a = $('#aviso');
  a.textContent = txt; a.hidden = false;
  a.classList.remove('sai'); void a.offsetWidth; a.classList.add('entra');
  clearTimeout(timerAviso);
  timerAviso = setTimeout(() => { a.classList.add('sai'); setTimeout(() => { a.hidden = true; }, 300); }, 2200);
}

async function copiar(txt) {
  try { await navigator.clipboard.writeText(txt); return true; } catch {}
  // navegadores antigos / TV: método de reserva
  const ta = Object.assign(document.createElement('textarea'), { value: txt });
  ta.setAttribute('readonly', ''); ta.style.cssText = 'position:fixed;opacity:0;top:0';
  document.body.append(ta); ta.select();
  let ok = false; try { ok = document.execCommand('copy'); } catch {}
  ta.parentNode.removeChild(ta);
  return ok;
}

/* ---------------- troca de imagem sem "piscar" a anterior ----------------
   Baixa a imagem nova em segundo plano e só troca quando ela está pronta.
   Cada elemento guarda um token: se outra troca começar no meio, a antiga é descartada. */
const tokensImg = new WeakMap();
function carregarImg(el, src, { srcset = '', sizes = '', placeholder = '', depois } = {}) {
  const tok = {};
  tokensImg.set(el, tok);
  el.removeAttribute('srcset');
  if (placeholder) { el.src = placeholder; el.classList.remove('carregando'); }   // miniatura já em cache
  else { el.classList.add('carregando'); }
  const pre = new Image();
  if (srcset) { pre.sizes = sizes; pre.srcset = srcset; }
  pre.src = src;
  let feito = false;
  const aplicar = () => {
    if (feito || tokensImg.get(el) !== tok) return;
    feito = true;
    if (srcset) { el.sizes = sizes; el.srcset = srcset; }
    el.src = pre.currentSrc || src;
    el.classList.remove('carregando');
    if (depois) depois();
  };
  if (pre.complete && pre.naturalWidth) return aplicar();
  pre.onload = aplicar;
  pre.onerror = aplicar;
  if (pre.decode) pre.decode().then(aplicar, () => {});
}

/* ---------------- aplicar tema ---------------- */
function img(id, k) { const d = IMGS[id]; return d && d[k]; }
function url(rel) { return rel ? BASE + rel : ''; }

function pintar(id) {
  const t = TEMAS[id];
  const c = t.cores;
  const st = raiz.style;
  st.setProperty('--bg', c.bg); st.setProperty('--bg2', c.bg2); st.setProperty('--ink', c.ink);
  st.setProperty('--muted', c.muted); st.setProperty('--acc', c.acc); st.setProperty('--acc2', c.acc2); st.setProperty('--card', c.card);
  st.setProperty('--f-display', `'${t.fontes.display}', system-ui, serif`);
  st.setProperty('--f-body', `'${t.fontes.body}', system-ui, sans-serif`);
  raiz.setAttribute('data-theme', id);
  raiz.toggleAttribute('data-claro', !t.escuro);
  $('meta[name="theme-color"]').content = c.bg;
  carregarFonte(t);

  const curto = t.curto;
  $$('.tema-nome').forEach(e => e.textContent = t.nome);
  $$('.tema-nome-curto').forEach(e => e.textContent = curto);
  $$('.tema-anime').forEach(e => e.textContent = t.anime);
  $$('.tema-papel').forEach(e => e.textContent = t.papel);
  $$('.tema-assinatura').forEach(e => e.textContent = t.assinatura);
  $$('.tema-kanji').forEach(e => e.textContent = t.kanji);
  favicon(t);
  document.title = `Lebot · ${t.nome}`;

  // personagem no palco
  const h = img(id, 'heroi');
  const pi = $('#personagem-img');
  const palco = $('#palco-btn');
  if (h) {
    pi.alt = `${t.nome}, de ${t.anime}`;
    pi.width = h.w; pi.height = h.h;
    carregarImg(pi, srcHeroi(h), {
      depois: () => { palco.classList.remove('entrando'); void palco.offsetWidth; palco.classList.add('entrando'); },
    });
  }
  palco.setAttribute('aria-label', `Ouvir uma frase de ${t.nome}`);

  const rosto = url(img(id, 'rosto'));
  carregarImg($('.btn-tema-rosto'), rosto);
  carregarImg($('.dialogo-rosto'), rosto);
  $('.btn-tema-nome').textContent = curto;
  $('.dialogo-nome').textContent = t.nome;
  $('.convite-nome').textContent = curto;
  const f = srcFundo(id);
  st.setProperty('--arte-fundo', f ? `url("${f}")` : 'none');

  montarPerfil(id);
  montarGaleria(id);
  $$('#roster-lista button').forEach(b => b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false'));
  if (fx) fx.tema(t.fx);
}

let seqTroca = 0, transicao = null;
async function trocarTema(id, { origem, falar = true } = {}) {
  if (!TEMAS[id]) id = 'gojo';
  const primeira = temaAtual === null;
  if (id === temaAtual) return;
  const lb = $('#lightbox');
  if (aberto(lb)) lb.close();
  const lbImg = $('img', lb);
  tokensImg.delete(lbImg); lbImg.removeAttribute('src');
  temaAtual = id;
  try { localStorage.setItem('lebot:tema', id); } catch {}
  const u = new URL(location.href); u.searchParams.set('p', id);
  history.replaceState(null, '', u);
  voz.calar();
  voz.setTema(id);
  const meu = ++seqTroca;

  if (primeira) { carregarFonte(TEMAS[id]); pintar(id); }
  else {
    raiz.classList.add('preparando');
    await prepararTema(id);
    raiz.classList.remove('preparando');
    if (meu !== seqTroca) return;              // outro personagem foi escolhido enquanto carregava
    const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (transicao) { try { transicao.skipTransition(); } catch {} }
    if (document.startViewTransition && !reduz && qual.nivel !== 'zero') {
      if (origem) {
        const r = origem.getBoundingClientRect();
        raiz.style.setProperty('--vt-x', `${r.left + r.width / 2}px`);
        raiz.style.setProperty('--vt-y', `${r.top + r.height / 2}px`);
      }
      transicao = document.startViewTransition(() => pintar(id));
      transicao.finished.finally(() => { transicao = null; });
    } else {
      pintar(id);
    }
  }
  if (falar && !primeira) { voz.prefetch(); setTimeout(() => voz.falar('ola', 2), 450); }
}

/* ---------------- perfil + frases ---------------- */
function montarPerfil(id) {
  const p = PERFIS[id];
  const falas = (voz.manifest && voz.manifest[id]) || {};
  $('.perfil-titulo').textContent = p.titulo;
  $('.perfil-bio').replaceChildren(...p.bio.map(t => Object.assign(document.createElement('p'), { textContent: t })));
  $('.perfil-traits').replaceChildren(...p.traits.map(t => Object.assign(document.createElement('li'), { textContent: t })));
  $('.ficha-dados').replaceChildren(...p.ficha.map(([k, v]) => {
    const d = document.createElement('div');
    d.append(Object.assign(document.createElement('dt'), { textContent: k }), Object.assign(document.createElement('dd'), { textContent: v }));
    return d;
  }));
  const alt = img(id, 'alt');
  const fi = $('.ficha-retrato img');
  if (alt) { fi.alt = TEMAS[id].nome; fi.classList.toggle('foto', !!alt.foto); carregarImg(fi, url(alt.m)); }

  const lista = $('#frases-lista');
  lista.replaceChildren(...p.frases.map(({ k, t: textoBase }) => {
    const li = document.createElement('li');
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'frase'; b.dataset.frase = k;
    const q = document.createElement('q'); q.textContent = (falas[k] && falas[k].t) || textoBase;
    const o = document.createElement('span'); o.className = 'frase-ouvir';
    o.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg><span>Ouvir</span>';
    b.append(q, o); li.append(b);
    return li;
  }));
}

/* ---------------- galeria + lightbox ---------------- */
// crédito limpo: "Arte oficial" ou "Fanart · @artista" (sem links nem endereços estranhos)
function credito(g) {
  if (g.oficial) return 'Arte oficial';
  const c = (g.credito || '').trim();
  let arroba = /^@[\w.]{2,30}$/.test(c) ? c : '';
  if (!arroba) {
    const m = c.match(/(?:twitter|x)\.com\/([\w]{2,30})/i);
    if (m && !/^(i|intent|home|search)$/i.test(m[1])) arroba = '@' + m[1];
  }
  return arroba ? `Fanart · ${arroba}` : 'Fanart';
}

let galeriaAtual = [];
let idxLb = 0;
function montarGaleria(id) {
  galeriaAtual = img(id, 'galeria') || [];
  const m = $('#mosaico');
  m.replaceChildren(...galeriaAtual.map((g, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.i = i;
    b.setAttribute('aria-label', `Ampliar arte ${i + 1}, ${credito(g)}`);
    const im = new Image();
    im.loading = 'lazy'; im.decoding = 'async'; im.alt = '';
    im.width = g.w; im.height = g.h;
    im.onload = () => im.classList.add('ok');
    im.src = url(g.t);
    b.append(im);
    if (g.oficial) b.append(Object.assign(document.createElement('span'), { className: 'selo', textContent: 'Oficial' }));
    return b;
  }));
}

function abrirLightbox(i) {
  const lb = $('#lightbox');
  idxLb = (i + galeriaAtual.length) % galeriaAtual.length;
  const g = galeriaAtual[idxLb];
  const im = $('img', lb);
  im.alt = `Arte de ${TEMAS[temaAtual].nome}`;
  carregarImg(im, url(g.f), { placeholder: url(g.t) });
  const cap = $('figcaption', lb);
  cap.textContent = credito(g);
  if (!aberto(lb)) lb.showModal();
}

function iniciarLightbox() {
  const lb = $('#lightbox');
  $('#mosaico').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    abrirLightbox(+b.dataset.i);
    voz.falar('abrir_arte', 3);
  });
  lb.addEventListener('click', e => {
    if (e.target.closest('[data-fechar]') || e.target === lb) lb.close();
    const n = e.target.closest('[data-nav]'); if (n) abrirLightbox(idxLb + +n.dataset.nav);
  });
  lb.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') abrirLightbox(idxLb + 1);
    if (e.key === 'ArrowLeft') abrirLightbox(idxLb - 1);
  });
  let x0 = null;
  lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 50) abrirLightbox(idxLb + (dx < 0 ? 1 : -1));
  });
}

/* ---------------- navegação por setas (TV / teclado) numa grade de botões ---------------- */
function setasNaGrade(container, seletor) {
  container.addEventListener('keydown', e => {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const itens = $$(seletor, container);
    const i = itens.indexOf(document.activeElement);
    if (i < 0) return;
    const r0 = itens[i].getBoundingClientRect();
    const cx = r0.left + r0.width / 2, cy = r0.top + r0.height / 2;
    let melhor = null, dist = Infinity;
    for (const el of itens) {
      if (el === itens[i]) continue;
      const r = el.getBoundingClientRect();
      const x = r.left + r.width / 2, y = r.top + r.height / 2;
      const dx = x - cx, dy = y - cy;
      const ok = e.key === 'ArrowRight' ? dx > 10 : e.key === 'ArrowLeft' ? dx < -10 : e.key === 'ArrowDown' ? dy > 10 : dy < -10;
      if (!ok) continue;
      const d = (e.key === 'ArrowLeft' || e.key === 'ArrowRight') ? Math.abs(dx) + Math.abs(dy) * 3 : Math.abs(dy) + Math.abs(dx) * 3;
      if (d < dist) { dist = d; melhor = el; }
    }
    if (melhor) { e.preventDefault(); melhor.focus(); melhor.scrollIntoView({ block: 'nearest' }); }
  });
}

/* ---------------- seleção de personagem ---------------- */
function montarRoster() {
  const ul = $('#roster-lista');
  ul.replaceChildren(...ORDEM.map(id => {
    const t = TEMAS[id];
    const li = document.createElement('li'); li.className = 'roster-item';
    const b = document.createElement('button');
    b.type = 'button'; b.dataset.id = id;
    b.style.setProperty('--c', t.cores.acc); b.style.setProperty('--c2', t.cores.acc2); b.style.setProperty('--cb', t.cores.bg2);
    const h = img(id, 'heroi');
    if (h) {
      const im = new Image(); im.src = url(h.m); im.alt = ''; im.loading = 'lazy'; im.decoding = 'async'; im.className = 'recorte';
      b.append(im);
    }
    const tx = document.createElement('span'); tx.className = 'roster-txt';
    tx.append(Object.assign(document.createElement('b'), { textContent: t.nome }), Object.assign(document.createElement('small'), { textContent: t.anime }));
    b.append(tx);
    b.setAttribute('aria-label', `${t.nome}, ${t.anime}`);
    li.append(b);
    return li;
  }));
  setasNaGrade(ul, 'button[data-id]');
  setasNaGrade($('#mosaico'), 'button');
  const dlg = $('#roster');
  $('#btn-tema').addEventListener('click', () => {
    dlg.showModal();
    const atual = $(`#roster-lista button[data-id="${temaAtual}"]`);
    atual && atual.focus();
  });
  dlg.addEventListener('click', e => {
    if (e.target.closest('[data-fechar]') || e.target === dlg) return dlg.close();
    const b = e.target.closest('button[data-id]');
    if (b) { dlg.close(); trocarTema(b.dataset.id, { origem: $('#btn-tema') }); }
  });
}

/* ---------------- caixa de diálogo (legenda da fala) ---------------- */
let timerTexto = null, timerSumir = null;
function iniciarDialogo() {
  const box = $('#dialogo'), txt = $('.dialogo-texto');
  voz.on('fala', (texto, dur, k) => {
    clearInterval(timerTexto); clearTimeout(timerSumir);
    box.classList.remove('saindo'); box.hidden = false;
    $$('.frase').forEach(f => f.classList.toggle('tocando', f.dataset.frase === k));
    // efeito máquina de escrever acompanhando a duração do áudio
    const total = Math.max(0.6, dur * 0.85) * 1000;
    const passo = Math.max(16, total / texto.length);
    let i = 0;
    txt.textContent = '';
    timerTexto = setInterval(() => { i++; txt.textContent = texto.slice(0, i); if (i >= texto.length) clearInterval(timerTexto); }, passo);
    loopAmp();
  });
  voz.on('fim', () => {
    $$('.frase.tocando').forEach(f => f.classList.remove('tocando'));
    timerSumir = setTimeout(() => {
      clearInterval(timerTexto);
      box.classList.add('saindo');
      setTimeout(() => { if (box.classList.contains('saindo')) box.hidden = true; }, 300);
    }, 1400);
  });
}

// O personagem responde à fala com física de mola (sobe e inclina poucos pixels e volta suave).
let ampOn = false;
function loopAmp() {
  if (ampOn) return; ampOn = true;
  let pos = 0, vel = 0, t0 = performance.now(), fase = 0;
  const tick = now => {
    const dt = Math.min(0.05, Math.max(0, (now - t0) / 1000)); t0 = now;
    const a = voz.amplitude();
    vel += ((a - pos) * 90 - vel * 13) * dt;   // rigidez 90, amortecimento 13: sem quicar
    pos += vel * dt;
    fase += dt * (1.2 + a * 2.2);              // balanço lento de cabeça enquanto fala
    raiz.style.setProperty('--amp', Math.max(0, pos).toFixed(3));
    raiz.style.setProperty('--fala', (Math.sin(fase) * Math.max(0, pos)).toFixed(3));
    if (fx) fx.pulso = Math.max(fx.pulso, a * 0.5);
    if (voz.falando || pos > 0.005 || Math.abs(vel) > 0.005) requestAnimationFrame(tick);
    else { raiz.style.setProperty('--amp', '0'); raiz.style.setProperty('--fala', '0'); ampOn = false; }
  };
  requestAnimationFrame(tick);
}

/* ---------------- botão de voz + convite ---------------- */
function iniciarBotaoVoz() {
  const b = $('#btn-voz'), t = $('.btn-voz-txt');
  const pintarBtn = on => { b.setAttribute('aria-pressed', on ? 'true' : 'false'); t.textContent = on ? 'Voz ligada' : 'Voz desligada'; };
  pintarBtn(voz.ligada);
  voz.on('estado', pintarBtn);
  b.addEventListener('click', () => { fecharConvite(); voz.alternar(); });

  const conv = $('#convite');
  function fecharConvite() { conv.hidden = true; try { localStorage.setItem('lebot:convite', '1'); } catch {} }
  conv.addEventListener('click', e => {
    const a = e.target.closest('[data-convite]'); if (!a) return;
    fecharConvite();
    if (a.dataset.convite === 'sim') voz.alternar(true);
  });
  let jaViu = false; try { jaViu = localStorage.getItem('lebot:convite') === '1'; } catch {}
  if (!voz.ligada && !jaViu) setTimeout(() => { conv.hidden = false; }, 2200);

  // navegadores exigem um gesto para tocar áudio: se a voz já estava ligada, cumprimenta no primeiro toque
  if (voz.ligada) {
    const primeiro = () => {
      voz.prepararAnalise();
      if (!voz.falando) voz.falar('ola', 2);
      removeEventListener('pointerdown', primeiro, true); removeEventListener('keydown', primeiro, true);
    };
    addEventListener('pointerdown', primeiro, true); addEventListener('keydown', primeiro, true);
  }
}

/* ---------------- interações que fazem o personagem falar ---------------- */
function iniciarReacoes() {
  // passar o mouse por um tempinho (evita falar a cada pixel)
  let alvo = null, timer = null;
  document.addEventListener('pointerover', e => {
    if (e.pointerType !== 'mouse') return;
    const el = e.target.closest('[data-voz], #mosaico button');
    if (el === alvo) return;
    alvo = el; clearTimeout(timer);
    if (!el) return;
    const rede = !!el.closest('.redes');
    timer = setTimeout(() => {
      const k = el.matches('#mosaico button') ? 'arte' : el.dataset.voz;
      // redes sociais: falam no hover e podem interromper falas menos importantes
      voz.falar(k, rede ? 2 : 1, { limite: rede ? 15000 : k === 'arte' ? 12000 : 45000 });
    }, rede ? 250 : 380);
  });

  // celular/tablet (sem mouse): fala ao encostar o dedo, antes de abrir a outra aba
  document.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') return;
    const el = e.target.closest('.redes a[data-voz], .menu [data-voz], .voltar[data-voz]');
    if (el) voz.falar(el.dataset.voz, 3);
  }, { passive: true });
  document.addEventListener('pointerout', e => {
    if (alvo && !alvo.contains(e.relatedTarget)) { alvo = null; clearTimeout(timer); }
  });

  // cliques
  document.addEventListener('click', async e => {
    const cp = e.target.closest('[data-copiar]');
    if (cp) {
      const ok = await copiar(cp.dataset.copiar);
      avisar(ok ? `Discord copiado: ${cp.dataset.copiar}` : `Discord: ${cp.dataset.copiar}`);
      const selo = cp.querySelector('.rede-copiar'); cp.classList.add('copiado'); if (selo) selo.textContent = 'Copiado!';
      setTimeout(() => { cp.classList.remove('copiado'); if (selo) selo.textContent = 'Copiar'; }, 1800);
      if (ok) voz.falar('copiado', 3);
      return;
    }
    const fr = e.target.closest('.frase');
    if (fr) {
      if (!voz.ligada) { avisarVozDesligada(fr); return; }
      if (!voz.falar(fr.dataset.frase, 3)) legenda(fr.querySelector('q').textContent);
      return;
    }
    if (e.target.closest('#palco-btn')) {
      if (!voz.ligada) { avisarVozDesligada(e.target.closest('#palco-btn')); return; }
      voz.falar('frase', 3); return;
    }
    const v = e.target.closest('[data-voz]');
    if (v && v.id !== 'btn-tema' && !v.closest('.redes')) voz.falar(v.dataset.voz, 2, { limite: 8000 });
    else if (v && v.closest('.redes') && ehMouse.matches) voz.falar(v.dataset.voz, 3);
  });

  // ao chegar em cada seção rolando a página
  const io = new IntersectionObserver(ents => {
    for (const en of ents) {
      if (!en.isIntersecting) continue;
      const k = en.target.dataset.secao;
      if (k === 'sec_inicio' && performance.now() < 8000) continue;
      voz.falar(k, 1, { limite: 120000 });
    }
  }, { threshold: 0.45 });
  $$('[data-secao]').forEach(s => io.observe(s));

  // ficou parado
  let ultimo = performance.now(), ultimoIdle = 0;
  const mexeu = () => { ultimo = performance.now(); };
  ['pointermove', 'keydown', 'scroll', 'touchstart'].forEach(ev => addEventListener(ev, mexeu, { passive: true }));
  setInterval(() => {
    const ag = performance.now();
    if (!document.hidden && ag - ultimo > 40000 && ag - ultimoIdle > 90000) { ultimoIdle = ag; voz.falar('idle', 0, { limite: 0 }); }
  }, 5000);
}

function legenda(texto) {
  const box = $('#dialogo');
  $('.dialogo-texto').textContent = texto;
  box.classList.remove('saindo'); box.hidden = false;
  clearTimeout(timerSumir);
  timerSumir = setTimeout(() => { box.classList.add('saindo'); setTimeout(() => { box.hidden = true; }, 300); }, 3200);
}

function avisarVozDesligada(el) {
  const b = $('#btn-voz');
  b.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 500, iterations: 2 });
  const box = $('#dialogo');
  $('.dialogo-texto').textContent = 'Ligue a voz no botão do topo para ouvir o personagem.';
  box.classList.remove('saindo'); box.hidden = false;
  clearTimeout(timerSumir);
  timerSumir = setTimeout(() => { box.classList.add('saindo'); setTimeout(() => box.hidden = true, 300); }, 2600);
}

/* ---------------- personagem em 3D seguindo o mouse / giroscópio ---------------- */
function iniciarParalaxe() {
  let rx = 0, ry = 0, alvoX = 0, alvoY = 0, rodando = false;
  const anima = () => {
    rx += (alvoX - rx) * 0.08; ry += (alvoY - ry) * 0.08;
    raiz.style.setProperty('--rx', rx.toFixed(2) + 'deg');
    raiz.style.setProperty('--ry', ry.toFixed(2) + 'deg');
    if (Math.abs(alvoX - rx) > 0.02 || Math.abs(alvoY - ry) > 0.02) requestAnimationFrame(anima); else rodando = false;
  };
  const mover = (nx, ny) => {
    if (!PRESETS[qual.nivel].tilt) return;
    alvoX = -ny * 8; alvoY = nx * 12;
    if (fx) fx.alvo = [nx, -ny];
    if (!rodando) { rodando = true; requestAnimationFrame(anima); }
  };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    mover(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1);
  }, { passive: true });
  // Android: giroscópio sem pedir permissão (no iPhone exigiria um pop-up, então não usamos)
  if (!ehMouse.matches && 'DeviceOrientationEvent' in window && typeof DeviceOrientationEvent.requestPermission !== 'function') {
    addEventListener('deviceorientation', e => {
      if (e.gamma == null) return;
      mover(Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    }, { passive: true });
  }
}

/* ---------------- topo, rolagem, menu ativo ---------------- */
function iniciarRolagem() {
  const topo = $('.topo');
  let pend = false;
  const at = () => {
    pend = false;
    topo.classList.toggle('rolado', scrollY > 20);
    if (fx) fx.scroll = scrollY / innerHeight * 0.6;
  };
  addEventListener('scroll', () => { if (!pend) { pend = true; requestAnimationFrame(at); } }, { passive: true });
  at();
  const links = $$('.menu a');
  const io = new IntersectionObserver(ents => {
    for (const en of ents) if (en.isIntersecting) links.forEach(a => a.classList.toggle('ativo', a.getAttribute('href') === '#' + en.target.id));
  }, { rootMargin: '-45% 0px -50% 0px' });
  $$('main section[id]').forEach(s => io.observe(s));
  $('#ano').textContent = new Date().getFullYear();
}

/* ---------------- início ---------------- */
async function iniciar() {
  const [imgs] = await Promise.all([
    fetch(BASE + 'assets/data/imagens.json').then(r => r.json()).catch(() => ({})),
    voz.carregar(BASE + 'assets/voz/'),
  ]);
  IMGS = imgs;
  iniciarQualidade();
  montarRoster();
  let inicial = 'gojo';
  try { inicial = new URLSearchParams(location.search).get('p') || localStorage.getItem('lebot:tema') || 'gojo'; } catch {}
  trocarTema(TEMAS[inicial] ? inicial : 'gojo');
  iniciarDialogo();
  iniciarBotaoVoz();
  iniciarReacoes();
  iniciarLightbox();
  iniciarParalaxe();
  iniciarRolagem();
  if (voz.ligada) voz.prefetch();
  // link direto para uma seção (#contato etc.): reposiciona depois que o conteúdo foi montado
  if (location.hash.length > 1) {
    const alvo = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (alvo) requestAnimationFrame(() => alvo.scrollIntoView({ behavior: 'instant', block: 'start' }));
  }
  const intro = $('#intro');
  setTimeout(() => { intro.classList.add('fim'); setTimeout(() => { intro.hidden = true; }, 900); }, 700);
}

iniciar();
