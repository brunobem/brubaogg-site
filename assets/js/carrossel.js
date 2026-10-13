// Carrossel do topo da home. Os slides ja estao no HTML e rolam para o lado sozinhos (scroll-snap), com ou sem JavaScript: aqui so entram os controles
// (setas e bolinhas) e a troca automatica, que NAO para: troca a cada `segundos` (data-segundos, de config.mjs). Ela espera enquanto o mouse ou o foco do teclado
// estao em cima, com a aba escondida e logo depois de a pessoa mexer (setas, bolinhas, arrastar, teclado: o tempo recomeca), e nunca roda para quem pediu menos
// movimento no aparelho. Sem innerHTML: so elementos, classes e atributos.
'use strict';
(function () {
  var raiz = document.querySelector('.carrossel');
  if (!raiz) return;
  var pista = raiz.querySelector('.car-pista');
  var controles = raiz.querySelector('.car-controles');
  var slides = raiz.querySelectorAll('.car-slide');
  if (!pista || !controles || slides.length < 2) return;

  var n = slides.length;
  var segundos = parseInt(raiz.getAttribute('data-segundos'), 10) || 0;
  var menosMovimento = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var temAuto = segundos > 0 && !menosMovimento;
  var suspenso = false;   // espera passageira: mouse ou foco em cima, aba escondida
  var atual = 0;
  var timer = 0;
  var quadro = 0;
  var seguraAte = 0;      // ate quando a rolagem em andamento e do proprio codigo (as bolinhas nao devem voltar atras no meio da animacao)

  function botao(rotulo) {
    var b = document.createElement('button');
    b.type = 'button';
    b.setAttribute('aria-label', rotulo);
    return b;
  }

  var anterior = botao('Slide anterior');
  anterior.className = 'car-seta car-anterior';
  var proximo = botao('Próximo slide');
  proximo.className = 'car-seta car-proximo';
  var pontosBox = document.createElement('span');
  pontosBox.className = 'car-pontos';
  var pontos = [];
  for (var i = 0; i < n; i++) {
    var p = botao('Ir para o slide ' + (i + 1) + ' de ' + n);
    p.className = 'car-ponto';
    p.setAttribute('data-slide', String(i));
    pontos.push(p);
    pontosBox.appendChild(p);
  }
  controles.appendChild(anterior);
  controles.appendChild(pontosBox);
  controles.appendChild(proximo);

  function marcar() {
    for (var k = 0; k < n; k++) pontos[k].setAttribute('aria-current', k === atual ? 'true' : 'false');
  }
  function ir(i, suave) {
    atual = (i + n) % n;
    var alvo = atual * pista.clientWidth;
    var animar = suave && !menosMovimento;
    seguraAte = animar ? Date.now() + 900 : 0;
    if (pista.scrollTo) pista.scrollTo({ left: alvo, behavior: animar ? 'smooth' : 'auto' });
    else pista.scrollLeft = alvo;
    marcar();
  }
  // (re)comeca a contagem para a proxima troca; a pessoa mexeu ou voltou o mouse: o tempo recomeca do zero
  function agendar() {
    window.clearTimeout(timer);
    if (temAuto && !suspenso) {
      timer = window.setTimeout(function () {
        var seguinte = atual + 1;
        ir(seguinte, seguinte < n); // da ultima volta para a primeira de uma vez, sem rebobinar tudo na tela
        agendar();
      }, segundos * 1000);
    }
  }

  anterior.addEventListener('click', function () { ir(atual - 1, true); agendar(); });
  proximo.addEventListener('click', function () { ir(atual + 1, true); agendar(); });
  pontosBox.addEventListener('click', function (e) {
    var alvo = e.target.closest ? e.target.closest('.car-ponto') : null;
    if (!alvo) return;
    ir(parseInt(alvo.getAttribute('data-slide'), 10), true);
    agendar();
  });
  // arrastar com o dedo ou o mouse, roda do mouse e teclas: gestos da pessoa (a rolagem que o proprio codigo faz nao dispara nada disso)
  ['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach(function (nome) {
    pista.addEventListener(nome, agendar, { passive: true });
  });
  // a bolinha acompanha a rolagem (arrastar, setas do teclado ao focar um link de outro slide)
  pista.addEventListener('scroll', function () {
    if (quadro || Date.now() < seguraAte) return;
    quadro = window.requestAnimationFrame(function () {
      quadro = 0;
      var k = Math.round(pista.scrollLeft / pista.clientWidth);
      if (k !== atual && k >= 0 && k < n) { atual = k; marcar(); }
    });
  }, { passive: true });
  window.addEventListener('resize', function () { pista.scrollLeft = atual * pista.clientWidth; });

  function suspender(sim) { suspenso = sim; agendar(); }
  raiz.addEventListener('mouseenter', function () { suspender(true); });
  raiz.addEventListener('mouseleave', function () { suspender(false); });
  raiz.addEventListener('focusin', function () { suspender(true); });
  raiz.addEventListener('focusout', function () { suspender(false); });
  document.addEventListener('visibilitychange', function () { suspender(document.hidden); });

  pista.setAttribute('aria-live', 'off'); // troca sozinho: o leitor de tela nao anuncia cada slide
  suspenso = document.hidden; // aba aberta em segundo plano: so comeca a trocar quando aparecer
  marcar();
  agendar();
})();
