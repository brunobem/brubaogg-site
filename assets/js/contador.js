// Contagem regressiva. A data vem do HTML: <div id="gta-count" data-alvo="2026-11-19T00:00:00-03:00">
(function () {
  var box = document.getElementById('gta-count');
  if (!box) return;
  var alvo = new Date(box.getAttribute('data-alvo')).getTime();
  if (isNaN(alvo)) return;

  var el = {
    d: document.getElementById('cd-d'),
    h: document.getElementById('cd-h'),
    m: document.getElementById('cd-m'),
    s: document.getElementById('cd-s'),
  };
  var timer;

  function pad(n) { return String(n).padStart(2, '0'); }

  function tick() {
    var diff = Math.max(0, alvo - Date.now());
    var s = Math.floor(diff / 1000);
    el.d.textContent = Math.floor(s / 86400);
    el.h.textContent = pad(Math.floor((s % 86400) / 3600));
    el.m.textContent = pad(Math.floor((s % 3600) / 60));
    el.s.textContent = pad(s % 60);
    if (diff === 0) {
      document.getElementById('gta-title').innerHTML = 'GTA <span>VI</span> já chegou!';
      clearInterval(timer);
    }
  }

  tick();
  timer = setInterval(tick, 1000);
})();
