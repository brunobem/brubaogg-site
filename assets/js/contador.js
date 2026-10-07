// Contagem regressiva. A data vem do HTML: <div id="gta-count" data-alvo="2026-11-19T00:00:00-03:00"> (com hora e fuso: e um instante unico no mundo).
// Mostra o resultado na hora com o relogio do aparelho e, em seguida, confere com a hora do servidor (cabecalho Date de uma requisicao
// pequena ao proprio site): aparelho com o relogio muito errado nao mostra "ja chegou" nem "20 mil dias". Se a conferencia falhar, vale o relogio do aparelho.
(function () {
  'use strict';
  const box = document.getElementById('gta-count');
  if (!box) return;
  const alvo = new Date(box.getAttribute('data-alvo')).getTime();
  if (isNaN(alvo)) return;

  const el = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'), m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
  if (!el.d || !el.h || !el.m || !el.s) return; // HTML sem os quatro numeros: nao ha o que atualizar
  const titulo = document.getElementById('gta-title');
  const rotuloDias = el.d.nextElementSibling, rotuloHoras = el.h.nextElementSibling;
  let desvio = 0; // quanto o relogio do aparelho esta adiantado (-) ou atrasado (+) em relacao ao servidor, em ms
  let verificado = false; // a hora do servidor ja foi conferida (ou a conferencia falhou)? So entao vale dizer "ja chegou"
  let timer = null;
  const LIMITE_DO_DESVIO = 60 * 60 * 1000;

  const pad = (n) => String(n).padStart(2, '0');
  const agora = () => Date.now() + desvio;

  function jaChegou() {
    if (!titulo || titulo.getAttribute('data-chegou')) return;
    titulo.setAttribute('data-chegou', '1');
    titulo.textContent = '';
    titulo.appendChild(document.createTextNode('GTA '));
    const vi = document.createElement('span');
    vi.textContent = 'VI';
    titulo.appendChild(vi);
    titulo.appendChild(document.createTextNode(' já chegou!'));
  }

  function tick() {
    const diff = Math.max(0, alvo - agora());
    const s = Math.floor(diff / 1000), dias = Math.floor(s / 86400), horas = Math.floor((s % 86400) / 3600);
    el.d.textContent = dias;
    el.h.textContent = pad(horas);
    el.m.textContent = pad(Math.floor((s % 3600) / 60));
    el.s.textContent = pad(s % 60);
    if (rotuloDias) rotuloDias.textContent = dias === 1 ? 'dia' : 'dias';
    if (rotuloHoras) rotuloHoras.textContent = horas === 1 ? 'hora' : 'horas';
    if (diff === 0 && verificado) { jaChegou(); clearInterval(timer); timer = null; }
  }

  // hora do servidor. So corrige erro GROSSO (mais de 1 hora: relogio no ano errado, fuso mal ajustado): o cabecalho Date tem precisao de
  // 1 segundo e a resposta pode vir do cache do GitHub (ate 10 minutos), entao diferenca pequena nao e confiavel e o relogio do aparelho vale
  function conferirComServidor() {
    const terminou = () => { verificado = true; tick(); if (!timer && alvo - agora() > 0) timer = setInterval(tick, 1000); };
    if (!window.fetch) { terminou(); return; }
    const antes = Date.now();
    fetch(window.location.pathname, { method: 'HEAD', cache: 'no-store' }).then((r) => {
      const servidor = Date.parse(r.headers.get('Date'));
      if (isNaN(servidor)) return;
      const depois = Date.now(), diferenca = servidor + (depois - antes) / 2 - depois; // o servidor respondeu no meio da viagem
      if (Math.abs(diferenca) > LIMITE_DO_DESVIO) desvio = diferenca;
    }).catch(() => {}).then(terminou);
  }

  tick();
  if (alvo - agora() > 0) timer = setInterval(tick, 1000);
  conferirComServidor();
  document.addEventListener('visibilitychange', () => { if (!document.hidden) tick(); });
})();
