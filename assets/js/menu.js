// Menu lateral. Ate 1279px de largura o menu e uma gaveta: este arquivo abre e fecha. A partir de 1280px ele e uma coluna fixa e nada aqui roda.
// Sem innerHTML: so classes, atributos e foco. Sem JavaScript o menu da gaveta nao abre, mas os mesmos links estao no rodape ("Navegar").
'use strict';
(function () {
  var botao = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu-lateral');
  var cortina = document.querySelector('.side-scrim');
  if (!botao || !menu || !cortina) return;
  var fechar = menu.querySelector('.side-fechar');
  var fixo = window.matchMedia('(min-width: 1280px)');
  // o resto da pagina fica "inerte" com a gaveta aberta: o foco do teclado e o leitor de tela ficam so no menu
  var fundo = [document.querySelector('.wrap'), document.querySelector('.site-footer')].filter(Boolean);

  function aberto() { return document.body.classList.contains('menu-aberto'); }

  function definir(abrir, devolverFoco) {
    document.body.classList.toggle('menu-aberto', abrir);
    botao.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    botao.setAttribute('aria-label', abrir ? 'Fechar menu' : 'Abrir menu');
    cortina.hidden = !abrir;
    fundo.forEach(function (el) { if (abrir) el.setAttribute('inert', ''); else el.removeAttribute('inert'); });
    if (abrir) (fechar || menu.querySelector('a')).focus();
    else if (devolverFoco) botao.focus();
  }

  botao.addEventListener('click', function () { definir(!aberto(), false); });
  if (fechar) fechar.addEventListener('click', function () { definir(false, true); });
  cortina.addEventListener('click', function () { definir(false, true); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && aberto()) { e.preventDefault(); definir(false, true); }
  });
  // girar o aparelho ou alargar a janela ate 1280px: a coluna fixa assume, entao a gaveta precisa estar fechada
  var aoMudar = function () { if (fixo.matches && aberto()) definir(false, false); };
  if (fixo.addEventListener) fixo.addEventListener('change', aoMudar); else if (fixo.addListener) fixo.addListener(aoMudar);
})();
