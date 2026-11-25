// Sistema de voz: o personagem reage ao que a pessoa faz (passar o mouse, clicar, rolar a página, ficar parado).
// Áudios pré-gerados (MP3) — nenhuma chave de API no site.

const KEY = 'lebot:voz';
// localStorage pode falhar (aba anônima antiga, armazenamento bloqueado): nunca derrubar o site por isso
const ler = k => { try { return localStorage.getItem(k); } catch { return null; } };
const gravar = (k, v) => { try { localStorage.setItem(k, v); } catch {} };
// prioridade: 3 = ação direta (clique, ligar voz) · 2 = troca de tema · 1 = hover/seção · 0 = ocioso
export class Voz {
  constructor() {
    this.ligada = ler(KEY) === '1';
    this.manifest = null;
    this.tema = null;
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.audio.setAttribute('playsinline', '');
    this.falando = null;
    this.ultimoFim = 0;
    this.usos = new Map();
    this.idxFrase = 0;
    this.ouvintes = { fala: [], fim: [], estado: [] };
    this.nivel = 0;
    this.audio.addEventListener('ended', () => this.terminou());
    this.audio.addEventListener('error', () => this.terminou());
    this.audio.addEventListener('pause', () => {
      // só conta como fim se a pausa for da fala atual (não da troca de src)
      if (this.falando && !this.audio.ended && this.audio.src.includes(`/${this.falando.k}.mp3`) && this.audio.currentTime > 0) this.terminou();
    });
  }

  on(ev, fn) { this.ouvintes[ev].push(fn); }
  emit(ev, ...a) { for (const f of this.ouvintes[ev]) f(...a); }

  async carregar(base) {
    this.base = base;
    try { this.manifest = await (await fetch(base + 'manifest.json', { cache: 'no-cache' })).json(); }
    catch { this.manifest = {}; }
  }

  setTema(id) {
    this.tema = id;
    this.usos.clear();
    this.idxFrase = 0;
  }

  // pré-carrega só o essencial (saudação, voz, seções e redes); o resto baixa na hora (arquivos de ~30 KB)
  prefetch() {
    if (!this.ligada || !this.manifest || !this.tema) return;
    const conn = navigator.connection;
    if (conn && (conn.saveData || /2g|3g/.test(conn.effectiveType || ''))) return;
    const falas = Object.keys(this.manifest[this.tema] || {});
    const essenciais = falas.filter(k => /^(ola|voz|sec_|instagram|tiktok|twitch|spotify|github|discord)/.test(k));
    const lista = matchMedia('(pointer: coarse)').matches ? essenciais.filter(k => /^(ola|voz|sec_)/.test(k)) : essenciais;
    for (const k of lista) fetch(this.url(k), { priority: 'low' }).catch(() => {});
  }

  // a duração entra no endereço: quando uma fala é regenerada, o navegador baixa a nova (sem cache velho)
  url(k) {
    const info = ((this.manifest || {})[this.tema] || {})[k];
    return `${this.base}${this.tema}/${k}.mp3${info ? `?v=${Math.round(info.d * 100)}` : ''}`;
  }

  // cria o analisador só depois de um gesto (exigência do Safari/Chrome)
  prepararAnalise() {
    if (this.ctx || !window.AudioContext && !window.webkitAudioContext) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
      const src = this.ctx.createMediaElementSource(this.audio);
      this.an = this.ctx.createAnalyser();
      this.an.fftSize = 512;
      this.an.smoothingTimeConstant = 0.6;
      src.connect(this.an); this.an.connect(this.ctx.destination);
      this.buf = new Uint8Array(this.an.frequencyBinCount);
    } catch { this.ctx = null; this.an = null; }
  }

  // volume da fala suavizado como um "envelope" (ataque rápido, soltura lenta) com portão de ruído.
  // Evita o efeito de pulsar a cada sílaba: o movimento fica contínuo e natural.
  amplitude() {
    let bruto = 0;
    if (this.falando) {
      if (this.an) {
        this.an.getByteTimeDomainData(this.buf);
        let s = 0;
        for (let i = 0; i < this.buf.length; i++) { const v = (this.buf[i] - 128) / 128; s += v * v; }
        bruto = Math.sqrt(s / this.buf.length) * 3.2;
      } else {
        bruto = 0.35 + Math.sin(performance.now() / 260) * 0.1;
      }
    }
    bruto = bruto < 0.06 ? 0 : Math.min(1, Math.sqrt(bruto));      // portão + compressão
    const env = this.env || 0;
    this.env = env + (bruto - env) * (bruto > env ? 0.35 : 0.07);   // ataque ~40ms, soltura ~250ms
    return this.env;
  }

  alternar(forcar) {
    const quer = typeof forcar === 'boolean' ? forcar : !(this.ligada && !this.saindo);
    this.saindo = false;
    this.ligada = quer;
    gravar(KEY, this.ligada ? '1' : '0');
    if (this.ligada) {
      this.prepararAnalise();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      this.falar('voz', 3);
      this.prefetch();
    } else {
      // despedida antes de silenciar
      this.ligada = true;
      this.saindo = true;
      this.calar();
      if (!this.falar('tchau', 3)) { this.saindo = false; this.ligada = false; }
      this.emit('estado', false);
      return;
    }
    this.emit('estado', this.ligada);
  }

  calar() {
    if (!this.audio.paused) this.audio.pause();
    if (this.falando) this.terminou();
  }

  // cada ação tem várias falas (ex.: arte_1..arte_6). Sorteia sem repetir até passar por todas.
  escolher(k) {
    const falas = (this.manifest && this.manifest[this.tema]) || {};
    if (falas[k]) return k;
    this.sacos = this.sacos || {};
    const id = this.tema + ':' + k;
    let saco = this.sacos[id];
    if (!saco || !saco.length) {
      saco = Object.keys(falas).filter(x => x.startsWith(k + '_') && /_\d+$/.test(x) && x.slice(0, x.lastIndexOf('_')) === k);
      for (let i = saco.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [saco[i], saco[j]] = [saco[j], saco[i]]; }
      if (saco.length > 1 && saco[saco.length - 1] === this.ultimaDe?.[id]) saco.unshift(saco.pop());
      this.sacos[id] = saco;
    }
    const escolhida = saco.pop();
    (this.ultimaDe = this.ultimaDe || {})[id] = escolhida;
    return escolhida;
  }

  falar(chave, prioridade = 1, { limite = 45000 } = {}) {
    if (!this.ligada || !this.tema || !this.manifest) return false;
    if (this.saindo && chave !== 'tchau') return false;
    const agora = performance.now();
    if (this.falando && this.falando.g === chave) return false;   // já está falando sobre isso
    if (prioridade < 2) {
      if (this.falando) return false;                       // hover comum não interrompe
      if (agora - this.ultimoFim < 900) return false;       // respiro entre falas
    } else if (this.falando && this.falando.prioridade > prioridade) {
      return false;
    }
    if (prioridade < 3) {
      // não fala do mesmo assunto toda hora. (Antes, "nunca falou" contava como "falou no instante 0":
      // nos primeiros 2 min da visita nenhuma seção falava e nos primeiros 45 s nenhum hover —
      // por isso uns personagens pareciam falar ao rolar e outros não, dependendo de quanto tempo a pessoa demorava.)
      const u = this.usos.get(chave);
      if (u !== undefined && agora - u < limite) return false;
    }
    const k = this.escolher(chave);
    const info = k && (this.manifest[this.tema] || {})[k];
    if (!info) return false;
    this.usos.set(chave, agora);
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    const id = (this.seq = (this.seq || 0) + 1);
    this.falando = null;                                     // evita que o 'pause' da troca encerre a fala nova
    this.audio.src = this.url(k);
    this.falando = { k, g: chave, prioridade, id };
    const p = this.audio.play();
    if (p && p.catch) p.catch(() => { if (this.falando && this.falando.id === id) this.terminou(); });
    this.emit('fala', info.t, info.d, k);
    return true;
  }

  terminou() {
    if (!this.falando) return;
    this.falando = null;
    this.ultimoFim = performance.now();
    if (this.saindo) { this.saindo = false; this.ligada = false; }
    this.emit('fim');
  }
}
