/* Espacos de ADS ENTRE as linhas de cartoes das listas (Noticias, Reviews e Lancamentos).
 *  Por enquanto o espaco e so o marcador "ADS" (o anuncio de verdade entra depois). Quantos cartoes cabem por linha muda com a largura da tela, entao quem decide onde o
 *  marcador entra e este script, medindo as linhas na tela: a lista (.news-grid) traz data-ads-primeiro (depois de quantas linhas entra o primeiro) e data-ads-cada (de
 *  quantas em quantas linhas entram os seguintes). O cartao destaque, de largura toda, conta como uma linha. Nunca entra ADS no fim da lista.
 *  Vale para a lista de sempre e para o resultado da busca/filtro (que o secao.js desenha depois): um observador refaz a conta quando a lista muda, aparece ou muda de largura.
 *  So o marcador e criado aqui (textContent): nenhum texto de fora entra na pagina. Funcoes puras ficam em window.BrubaoAds (testes). */
(function () {
  'use strict';

  /** topos = a posicao vertical (offsetTop) de cada cartao, na ordem. Devolve o indice do primeiro cartao de cada linha (mesmo topo, com 2 px de folga). */
  function inicioDasLinhas(topos) {
    var inicios = [];
    topos.forEach(function (t, i) { if (i === 0 || Math.abs(t - topos[i - 1]) > 2) inicios.push(i); });
    return inicios;
  }

  /** inicios = indice do primeiro cartao de cada linha. Devolve os indices de cartao ANTES dos quais entra um ADS: depois de `primeiro` linhas e depois a cada `cada` linhas
   *  (nunca depois da ultima: se nao ha linha abaixo, nao entra). */
  function posicoes(inicios, primeiro, cada) {
    var saida = [];
    if (!(primeiro > 0) || !(cada > 0)) return saida;
    for (var linha = primeiro; linha < inicios.length; linha += cada) saida.push(inicios[linha]);
    return saida;
  }

  window.BrubaoAds = { inicioDasLinhas: inicioDasLinhas, posicoes: posicoes };

  var grades = document.querySelectorAll('[data-ads-cada]');
  if (!grades.length) return;

  function ehAds(no) { return !!no && no.nodeType === 1 && no.classList.contains('ads'); }

  function colocar(grade) {
    var primeiro = parseInt(grade.getAttribute('data-ads-primeiro'), 10), cada = parseInt(grade.getAttribute('data-ads-cada'), 10);
    var cartoes = Array.prototype.filter.call(grade.children, function (c) { return c.classList.contains('news-card'); });
    if (!cartoes.length || grade.hidden || grade.getClientRects().length === 0) return; // escondida: nao da para medir (o observador volta quando aparecer)
    var desejados = posicoes(inicioDasLinhas(cartoes.map(function (c) { return c.offsetTop; })), primeiro, cada);
    var atuais = [];
    cartoes.forEach(function (c, i) { if (ehAds(c.previousElementSibling)) atuais.push(i); });
    var extras = Array.prototype.filter.call(grade.children, function (c) { return ehAds(c) && c.hasAttribute('data-auto'); }).length;
    if (extras === atuais.length && atuais.length === desejados.length && atuais.every(function (v, i) { return v === desejados[i]; })) return; // ja esta certo: nao mexe
    Array.prototype.slice.call(grade.children).forEach(function (c) { if (ehAds(c) && c.hasAttribute('data-auto')) grade.removeChild(c); });
    var raiz = grade.closest('[data-secao]'), secao = raiz ? raiz.getAttribute('data-secao') : 'lista';
    desejados.forEach(function (i) {
      var ads = document.createElement('div');
      ads.className = 'ads';
      ads.setAttribute('data-ads', secao + '-na-lista');
      ads.setAttribute('data-auto', '');
      ads.setAttribute('aria-hidden', 'true');
      ads.textContent = 'ADS';
      grade.insertBefore(ads, cartoes[i]);
    });
  }

  Array.prototype.forEach.call(grades, function (grade) {
    var agendado = false, obs = null;
    function refazer() {
      agendado = false;
      if (obs) obs.disconnect();
      colocar(grade);
      if (obs) obs.observe(grade, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    }
    function agendar() { if (agendado) return; agendado = true; window.setTimeout(refazer, 0); }
    if (typeof MutationObserver === 'function') {
      obs = new MutationObserver(function (registros) {
        var relevante = registros.some(function (r) {
          if (r.type === 'attributes') return true;
          return [].concat(Array.prototype.slice.call(r.addedNodes), Array.prototype.slice.call(r.removedNodes)).some(function (n) { return !ehAds(n); });
        });
        if (relevante) agendar();
      });
      obs.observe(grade, { childList: true, attributes: true, attributeFilter: ['hidden'] });
    }
    if (typeof ResizeObserver === 'function') new ResizeObserver(agendar).observe(grade); // largura nova (ou a lista que voltou a aparecer): refaz a conta
    else window.addEventListener('resize', agendar);
    agendar();
  });
}());
