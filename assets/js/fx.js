// Atmosfera 3D de cada tema: partículas animadas 100% na GPU (WebGL 1, roda em qualquer navegador).
// A CPU só atualiza uniforms por quadro, então o custo é mínimo até em celular.

const VS = `
attribute vec3 aPos; attribute float aSeed;
uniform float uTime, uMode, uSpeed, uSize, uAspect, uDpr;
uniform vec2 uMouse; uniform float uScroll, uPulse;
varying float vSeed; varying float vDepth; varying float vRot;
const float BOX = 2.0;
vec3 wrap(vec3 p){ return mod(p + BOX, 2.0*BOX) - BOX; }
void main(){
  float t = uTime * uSpeed;
  float s = aSeed;
  vec3 p = aPos;
  if (uMode < 0.5) {                // 0 chuva neon (cai rápido, inclinada)
    p.y -= t * (1.6 + s * 1.2); p.x -= t * 0.25;
  } else if (uMode < 1.5) {         // 1 brasas/vapor subindo com balanço
    p.y += t * (0.25 + s * 0.35);
    p.x += sin(t * (0.6 + s) + s * 40.0) * 0.18;
  } else if (uMode < 2.5) {         // 2 pétalas/neve caindo devagar e girando
    p.y -= t * (0.12 + s * 0.16);
    p.x += sin(t * 0.7 + s * 30.0) * 0.35 + t * 0.05;
    p.z += cos(t * 0.5 + s * 20.0) * 0.2;
  } else if (uMode < 3.5) {         // 3 vórtice do Vazio Infinito
    float r = length(p.xz) + 0.15;
    float a = atan(p.z, p.x) + t * (0.35 / r) * (0.6 + s);
    p.x = cos(a) * r; p.z = sin(a) * r;
    p.y += sin(t * 0.4 + s * 12.0) * 0.08;
  } else {                          // 4 partículas de luz flutuando (campo ao sol)
    p.x += sin(t * 0.21 + s * 50.0) * 0.5 + t * 0.03;
    p.y += cos(t * 0.17 + s * 70.0) * 0.35 + t * 0.02;
  }
  p = wrap(p);
  p.y += uScroll * (0.3 + s * 0.6);
  p = wrap(p);
  // paralaxe pela posição do mouse / giroscópio
  p.x += uMouse.x * (p.z + 2.0) * 0.08;
  p.y += uMouse.y * (p.z + 2.0) * 0.06;
  float z = p.z + 3.2;
  gl_Position = vec4(p.x / uAspect * 1.4 / z * 2.0, p.y * 1.4 / z * 2.0, 0.0, 1.0);
  float pulse = 1.0 + uPulse * 0.6 * step(0.7, s);
  gl_PointSize = uSize * uDpr * (0.45 + s) * pulse * (4.0 / z);
  vSeed = s; vDepth = clamp((z - 1.2) / 4.0, 0.0, 1.0); vRot = mod(s * 6.283 + t * (s - 0.5), 6.2832);
}`;

const FS = `
precision mediump float;
uniform float uShape, uAlpha; uniform vec3 uC1, uC2;
varying float vSeed; varying float vDepth; varying float vRot;
void main(){
  vec2 q = gl_PointCoord - 0.5;
  float c = cos(vRot), s = sin(vRot);
  vec2 r = vec2(c*q.x - s*q.y, s*q.x + c*q.y);
  float a;
  if (uShape < 0.5) {               // brilho redondo
    a = smoothstep(0.5, 0.0, length(q)); a *= a;
  } else if (uShape < 1.5) {        // pétala
    vec2 e = r * vec2(2.2, 1.0);
    a = smoothstep(0.5, 0.42, length(e + vec2(0.0, abs(r.x) * 0.6)));
  } else if (uShape < 2.5) {        // risco de chuva
    a = smoothstep(0.07, 0.0, abs(q.x + q.y * 0.15)) * smoothstep(0.5, 0.1, abs(q.y));
  } else if (uShape < 3.5) {        // estrela de 4 pontas
    float d = min(abs(r.x), abs(r.y)) * 7.0 + length(r) * 1.4;
    a = smoothstep(1.0, 0.0, d) + smoothstep(0.18, 0.0, length(r)) ;
  } else {                          // floco de neve suave
    float ang = atan(r.y, r.x);
    float k = 0.30 + 0.12 * cos(ang * 6.0);
    a = smoothstep(k, k - 0.12, length(r)) * 0.9 + smoothstep(0.12, 0.0, length(r));
  }
  vec3 col = mix(uC1, uC2, step(0.55, vSeed));
  float fade = mix(1.0, 0.35, vDepth);
  gl_FragColor = vec4(col, clamp(a, 0.0, 1.0) * uAlpha * fade);
}`;

function hex(h) {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255];
}

export class Atmosfera {
  constructor(canvas) {
    this.c = canvas;
    this.max = 5000;
    this.fator = 1;
    this.dprMax = 2;
    this.mouse = [0, 0]; this.alvo = [0, 0];
    this.scroll = 0; this.pulso = 0;
    this.on = false; this.oculto = false; this.perdido = false; this.raf = 0;
    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' });
    if (!gl) return;
    this.gl = gl;
    this.loop = this.loop.bind(this);
    this.redim = this.redim.bind(this);
    this.montar();
    this.t0 = performance.now();
    addEventListener('resize', this.redim, { passive: true });
    // um único laço de quadros: antes, cada volta do segundo plano agendava outro laço sem cancelar o que
    // estava pendente, e as partículas passavam a ser desenhadas 2x, 3x, 4x... por quadro (pesava cada vez mais)
    document.addEventListener('visibilitychange', () => { if (!document.hidden && this.on) this.agendar(); });
    // Android perde o contexto WebGL com frequência (memória, segundo plano): antes as partículas sumiam de vez
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.voltar = this.perdido ? this.voltar : this.on; this.perdido = true; this.on = false; cancelAnimationFrame(this.raf); });
    canvas.addEventListener('webglcontextrestored', () => {
      this.perdido = false;
      try { this.montar(); } catch { return; }
      if (this.preset) this.tema(this.preset);
      this.c.width = 0; this.redim();
      if (this.voltar) this.iniciar();
    });
    this.redim();
  }

  montar() {
    const gl = this.gl;
    const sh = (t, src) => { const s = gl.createShader(t); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(pr); gl.useProgram(pr);
    this.pr = pr;
    const dados = new Float32Array(this.max * 4);
    let semente = 7;
    const rnd = () => (semente = (semente * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < this.max; i++) {
      dados[i * 4] = rnd() * 4 - 2; dados[i * 4 + 1] = rnd() * 4 - 2; dados[i * 4 + 2] = rnd() * 4 - 2; dados[i * 4 + 3] = rnd();
    }
    const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, dados, gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(pr, 'aPos'), aSeed = gl.getAttribLocation(pr, 'aSeed');
    gl.enableVertexAttribArray(aPos); gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 16, 0);
    gl.enableVertexAttribArray(aSeed); gl.vertexAttribPointer(aSeed, 1, gl.FLOAT, false, 16, 12);
    this.u = {};
    for (const n of ['uTime', 'uMode', 'uSpeed', 'uSize', 'uAspect', 'uDpr', 'uMouse', 'uScroll', 'uPulse', 'uShape', 'uAlpha', 'uC1', 'uC2'])
      this.u[n] = gl.getUniformLocation(pr, n);
    gl.enable(gl.BLEND);
  }

  agendar() { cancelAnimationFrame(this.raf); this.raf = requestAnimationFrame(this.loop); }

  get ok() { return !!this.gl; }

  qualidade(fator, dpr) { this.fator = fator; this.dprMax = dpr; this.redim(); }

  tema(p) {
    if (!this.gl) return;
    const gl = this.gl;
    this.preset = p;
    gl.uniform1f(this.u.uMode, p.modo); gl.uniform1f(this.u.uSpeed, p.vel); gl.uniform1f(this.u.uSize, p.tam);
    gl.uniform1f(this.u.uShape, p.forma); gl.uniform1f(this.u.uAlpha, p.alfa);
    gl.uniform3fv(this.u.uC1, hex(p.cor1)); gl.uniform3fv(this.u.uC2, hex(p.cor2));
    if (p.aditivo) gl.blendFunc(gl.SRC_ALPHA, gl.ONE); else gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    this.qtd = Math.round(Math.min(this.max, p.qtd * this.fator));
  }

  redim() {
    if (!this.gl) return;
    const dpr = Math.min(devicePixelRatio || 1, this.dprMax);
    const w = innerWidth, h = innerHeight;
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (this.c.width !== cw || this.c.height !== ch) { this.c.width = cw; this.c.height = ch; }
    this.gl.viewport(0, 0, this.c.width, this.c.height);
    this.gl.uniform1f(this.u.uAspect, w / h > 1 ? w / h : 1);
    this.gl.uniform1f(this.u.uDpr, dpr);
    if (this.preset) this.qtd = Math.round(Math.min(this.max, this.preset.qtd * this.fator));
  }

  iniciar() { if (this.gl && !this.on && !this.perdido) { this.on = true; this.agendar(); } }
  parar() { this.on = false; cancelAnimationFrame(this.raf); if (this.gl && !this.perdido) { this.gl.clearColor(0, 0, 0, 0); this.gl.clear(this.gl.COLOR_BUFFER_BIT); } }

  loop(t) {
    if (!this.on || document.hidden) return;
    if (this.oculto) { this.raf = requestAnimationFrame(this.loop); return; }
    const gl = this.gl;
    this.mouse[0] += (this.alvo[0] - this.mouse[0]) * 0.05;
    this.mouse[1] += (this.alvo[1] - this.mouse[1]) * 0.05;
    this.pulso *= 0.92;
    gl.uniform1f(this.u.uTime, (t - this.t0) / 1000);
    gl.uniform2f(this.u.uMouse, this.mouse[0], this.mouse[1]);
    gl.uniform1f(this.u.uScroll, this.scroll);
    gl.uniform1f(this.u.uPulse, this.pulso);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    if (this.qtd > 0) gl.drawArrays(gl.POINTS, 0, this.qtd);
    this.raf = requestAnimationFrame(this.loop);
  }
}
