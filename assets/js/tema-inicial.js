// aplica o tema salvo antes de pintar (evita piscar o tema errado)
(function () {
  try {
    var p = new URLSearchParams(location.search).get('p') || localStorage.getItem('lebot:tema');
    // só nomes simples de tema ("toString", "__proto__" etc. quebravam o site e ficavam salvos)
    if (p && /^(capri|sukuna|kaneki|frieren|emilia|beatrice|rem|eren|thorfinn|gojo)$/.test(p)) document.documentElement.setAttribute('data-theme', p);
  } catch (e) {}
})();
