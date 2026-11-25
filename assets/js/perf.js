// Detecta a capacidade do aparelho e escolhe o nível de efeitos.
// alto: PC/notebook bom · medio: notebook simples, tablet, celular topo · baixo: celular simples, TV, economia de dados
// zero: usuário pediu menos movimento ou o navegador não tem WebGL.

const KEY = 'lebot:qualidade';

function webglOk() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch { return false; }
}

export function detectar() {
  const salvo = localStorage.getItem(KEY);
  if (salvo && ['alto', 'medio', 'baixo', 'zero'].includes(salvo)) return { nivel: salvo, manual: true };

  const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduz || !webglOk()) return { nivel: 'zero', manual: false };

  const nav = navigator;
  const cores = nav.hardwareConcurrency || 4;
  const mem = nav.deviceMemory || 4;            // só Chromium expõe; nos outros assume 4
  const economia = nav.connection && nav.connection.saveData;
  const toque = matchMedia('(pointer: coarse)').matches;
  const semPonteiro = matchMedia('(pointer: none)').matches || matchMedia('(hover: none) and (min-width: 1280px)').matches;
  const tv = semPonteiro || /SMART-TV|SmartTV|Tizen|Web0S|webOS|HbbTV|AFT|BRAVIA|CrKey|GoogleTV/i.test(nav.userAgent);
  const telaGrande = Math.max(screen.width, screen.height) * (devicePixelRatio || 1);

  let nivel = 'alto';
  if (economia || tv || cores <= 2 || mem <= 2) nivel = 'baixo';
  else if (toque || cores <= 4 || mem <= 4 || telaGrande > 3800) nivel = 'medio';
  return { nivel, manual: false, tv, toque };
}

export function salvarNivel(n) {
  if (n) localStorage.setItem(KEY, n); else localStorage.removeItem(KEY);
}

export const PRESETS = {
  alto:  { particulas: 1.0, dpr: 2,   tilt: true,  blur: true },
  medio: { particulas: 0.55, dpr: 1.5, tilt: true,  blur: true },
  baixo: { particulas: 0.25, dpr: 1,   tilt: false, blur: false },
  zero:  { particulas: 0,   dpr: 1,   tilt: false, blur: false },
};

// Mede FPS real por alguns segundos; se estiver travando, chama rebaixar().
export function vigiarFps(rebaixar) {
  let quadros = 0, inicio = performance.now(), ruins = 0, ativo = true;
  function tick(t) {
    if (!ativo) return;
    quadros++;
    const dt = t - inicio;
    if (dt > 2000) {
      const fps = quadros * 1000 / dt;
      if (document.visibilityState === 'visible' && fps < 40) ruins++; else ruins = Math.max(0, ruins - 1);
      if (ruins >= 2) { ruins = 0; if (!rebaixar()) { ativo = false; return; } }
      quadros = 0; inicio = t;
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return () => { ativo = false; };
}
