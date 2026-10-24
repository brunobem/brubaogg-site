// Faixa de secoes do cabecalho (todas as paginas) e botao "Menu". O que importa e o ESPACO: este arquivo mede se as secoes cabem numa linha. Se nao cabem (celular,
// texto aumentado, janela estreita) ele poe data-rola na faixa, mostra o botao "Menu" (abre o painel <dialog> com todas as secoes e mais Inicio, Tags, Arquivo e Sobre e
// contato) e leva a secao da pagina atual (a marcada com class "ativo") para o meio da faixa. Se cabem, o botao some. Sem JavaScript fica so a faixa, que rola para o
// lado e leva aos mesmos lugares; o rodape tambem repete os links. Sem innerHTML: so le medidas, troca atributos e abre/fecha o painel.
'use strict';
(function () {
  var nav = document.querySelector('.nav-site');
  var lista = nav && nav.querySelector('.nav-site-links');
  if (!lista) return;
  var botao = nav.querySelector('.nav-menu');
  var painel = document.getElementById('menu-painel');
  var atual = lista.querySelector('a.ativo');
  var temPainel = !!(botao && painel && typeof painel.showModal === 'function');

  // largura que as secoes ocupam em fila (soma dos itens e dos espacos), a mesma com ou sem o botao na tela
  function larguraDasSecoes() {
    var cs = window.getComputedStyle(lista), itens = lista.children, soma = 0;
    for (var i = 0; i < itens.length; i++) soma += itens[i].offsetWidth;
    return soma + (parseFloat(cs.columnGap) || 0) * Math.max(0, itens.length - 1) + (parseFloat(cs.paddingLeft) || 0);
  }
  function larguraDisponivel() {
    var cs = window.getComputedStyle(nav);
    return nav.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
  }
  function centralizar() {
    lista.style.paddingRight = ''; // desfaz o espaco extra de alinharBorda (a faixa pode ter mudado de largura)
    if (!atual || lista.scrollWidth <= lista.clientWidth) return;
    var dentro = atual.getBoundingClientRect().left - lista.getBoundingClientRect().left + lista.scrollLeft; // posicao do link dentro da faixa, rolada ou nao
    lista.scrollLeft = dentro - (lista.clientWidth - atual.offsetWidth) / 2;
    alinharBorda();
  }
  // Nenhum item pela metade na borda esquerda da faixa, ao lado do botao "Menu" (um item cortado parece coberto pelo botao: "REVIEWS" aparecia como "EWS"). O item que ficou
  // cortado vem inteiro; se isso empurrar a secao atual para o degrade da direita, o item cortado sai de vez. Na borda direita o corte continua (o degrade avisa que ha mais).
  function alinharBorda() {
    var borda = lista.getBoundingClientRect().left, itens = lista.children;
    for (var i = 0; i < itens.length; i++) {
      var r = itens[i].getBoundingClientRect();
      if (r.left >= borda - 1 || r.right <= borda + 1) continue; // inteiro na faixa, ou ja fora dela
      var antes = lista.scrollLeft, caixa = lista.getBoundingClientRect();
      lista.scrollLeft = antes - (borda - r.left); // mostra o item inteiro
      var a = atual.getBoundingClientRect();
      if (a.right > caixa.right - 34) { // a secao atual nao cabe mais: esconde o item cortado em vez de mostra-lo
        var passo = r.right - borda;
        lista.scrollLeft = antes + passo;
        var faltou = antes + passo - lista.scrollLeft; // a faixa ja estava no fim e nao rolou o bastante: acrescenta o espaco que falta depois do ultimo item
        if (faltou > 1) { lista.style.paddingRight = ((parseFloat(window.getComputedStyle(lista).paddingRight) || 0) + faltou) + 'px'; lista.scrollLeft = antes + passo; }
      }
      return;
    }
  }
  function medir() {
    var rola = larguraDasSecoes() > larguraDisponivel() + 1;
    if (rola !== nav.hasAttribute('data-rola')) {
      if (rola) nav.setAttribute('data-rola', ''); else nav.removeAttribute('data-rola');
      if (temPainel) botao.hidden = !rola;
      if (!rola && painel && painel.open) painel.close(); // girou o aparelho ou alargou a janela: o painel deixa de ser preciso
    }
    centralizar();
  }

  if (temPainel) {
    botao.addEventListener('click', function () { painel.showModal(); });
    // aria-expanded segue o atributo open do painel, seja qual for o jeito de abrir ou fechar (botao, X, cortina, Esc, girar o aparelho). Observa o atributo em vez de
    // esperar o evento close, que o navegador so solta no proximo quadro de desenho (e atrasa numa aba pouco ativa).
    new MutationObserver(function () { botao.setAttribute('aria-expanded', painel.open ? 'true' : 'false'); }).observe(painel, { attributes: true, attributeFilter: ['open'] });
    var fechar = painel.querySelector('.menu-fechar');
    if (fechar) fechar.addEventListener('click', function () { painel.close(); });
    painel.addEventListener('click', function (e) { if (e.target === painel) painel.close(); }); // clique na cortina escura (fora da caixa)
  }

  medir();
  var espera = 0;
  window.addEventListener('resize', function () { window.cancelAnimationFrame(espera); espera = window.requestAnimationFrame(medir); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(medir); // a fonte dos titulos muda a largura dos itens quando chega
})();
