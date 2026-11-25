// aplica o tema salvo antes de pintar (evita piscar o tema errado)
(function () {
  try {
    var p = new URLSearchParams(location.search).get('p') || localStorage.getItem('lebot:tema');
    if (p) document.documentElement.setAttribute('data-theme', p);
  } catch (e) {}
})();
