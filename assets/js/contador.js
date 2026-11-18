// Contagem regressiva. A data vem do HTML: <div id="gta-count" data-alvo="2026-11-19T00:00:00-03:00"> (com hora e fuso: e um instante unico no mundo).
// Mostra o resultado na hora com o relogio do aparelho e, em seguida, confere com a hora do servidor (cabecalho Date de uma requisicao
// pequena ao proprio site): aparelho com o relogio muito errado nao mostra "ja chegou" nem "20 mil dias". Se a conferencia falhar, vale o relogio do aparelho.
// Estado "LANCADO": quando a contagem chega a zero (e a hora do servidor ja foi conferida), a secao .gta troca os numeros por kicker, titulo e data montados a partir dos
// atributos data-lancado-kicker/-titulo/-texto (e, na home, -botao e -href), que o gerador deixa na secao (config.mjs, GTA6.lancado). Antes da hora nada disso aparece.
// Sem esses atributos so o titulo muda ("GTA VI ja chegou!"). Texto de fora so entra na pagina por textContent/createTextNode.
(function () {
  'use strict';
  const box = document.getElementById('gta-count');
  if (!box) return;
  const alvo = new Date(box.getAttribute('data-alvo')).getTime();
  if (isNaN(alvo)) return;

  const el = { d: document.getElementById('cd-d'), h: document.getElementById('cd-h'), m: document.getElementById('cd-m'), s: document.getElementById('cd-s') };
  if (!el.d || !el.h || !el.m || !el.s) return; // HTML sem os quatro numeros: nao ha o que atualizar
  const titulo = document.getElementById('gta-title');
  const secao = box.closest ? box.closest('.gta') : null;
  const rotuloDias = el.d.nextElementSibling, rotuloHoras = el.h.nextElementSibling;
  let desvio = 0; // quanto o relogio do aparelho esta adiantado (-) ou atrasado (+) em relacao ao servidor, em ms
  let verificado = false; // a hora do servidor ja foi conferida (ou a conferencia falhou)? So entao vale dizer "ja chegou"
  let timer = null;
  const LIMITE_DO_DESVIO = 60 * 60 * 1000;

  const pad = (n) => String(n).padStart(2, '0');
  const agora = () => Date.now() + desvio;
  const texto = (tipo, classe, conteudo) => { const e = document.createElement(tipo); e.className = classe; e.textContent = conteudo; return e; };

  // o estado lancado: a secao inteira passa a ter so o texto (sem os numeros). Devolve false se o HTML nao trouxe os textos.
  function montarLancado() {
    if (!secao) return false;
    const kicker = secao.getAttribute('data-lancado-kicker'), tit = secao.getAttribute('data-lancado-titulo'), data = secao.getAttribute('data-lancado-texto');
    if (!kicker || !tit || !data) return false;
    const botao = secao.getAttribute('data-lancado-botao'), href = secao.getAttribute('data-lancado-href');
    while (secao.firstChild) secao.removeChild(secao.firstChild);
    secao.setAttribute('data-estado', 'lancado');
    secao.classList.add('gta-lancado');
    secao.appendChild(texto('p', 'gta-kicker', kicker));
    const h2 = document.createElement('h2');
    h2.id = 'gta-title';
    h2.className = 'gta-title';
    h2.appendChild(document.createTextNode('GTA '));
    const vi = document.createElement('span');
    vi.textContent = 'VI';
    h2.appendChild(vi);
    h2.appendChild(document.createTextNode(' ' + tit));
    secao.appendChild(h2);
    secao.appendChild(texto('p', 'gta-date', data));
    if (botao && href) {
      const a = texto('a', 'btn primary gta-botao', botao);
      a.setAttribute('href', href);
      secao.appendChild(a);
    }
    return true;
  }

  function jaChegou() {
    if (secao && secao.getAttribute('data-estado') === 'lancado') return;
    if (montarLancado()) return;
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
