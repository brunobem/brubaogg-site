// Fachada do player: cada <a class="fachada"> (miniatura + botao de play) vira o player do YouTube no clique. Sem JavaScript o link abre o video no YouTube.
// O iframe so nasce no clique (e vem tocando): ate la a pagina nao pede nada ao player do YouTube. Endereco do player, titulo e tudo o mais vem dos atributos da propria fachada
// (data-embed, data-titulo), escritos pelo gerador (paginas.mjs, fachadaHtml); nada de fora entra na pagina como HTML.
(function () {
  'use strict';
  const fachadas = document.querySelectorAll('.fachada');
  if (!fachadas.length) return;

  function abrir(fachada) {
    const caixa = fachada.parentNode, embed = fachada.getAttribute('data-embed');
    if (!caixa || !embed) return; // sem o endereco do player: deixa o link comum agir
    const quadro = document.createElement('iframe');
    quadro.src = embed + (embed.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1';
    quadro.title = fachada.getAttribute('data-titulo') || 'Vídeo do YouTube';
    quadro.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen');
    quadro.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    quadro.setAttribute('allowfullscreen', '');
    caixa.replaceChild(quadro, fachada);
    quadro.focus(); // quem usa teclado ou leitor de tela continua no mesmo lugar, agora dentro do player
  }

  for (let i = 0; i < fachadas.length; i++) {
    const f = fachadas[i];
    if (!f.getAttribute('data-embed')) continue;
    f.setAttribute('role', 'button'); // com JavaScript ela nao navega: toca o video aqui mesmo
    f.addEventListener('click', function (e) {
      if (e.ctrlKey || e.metaKey || e.shiftKey || e.button === 1) return; // "abrir em nova aba" continua funcionando como link
      e.preventDefault();
      abrir(f);
    });
    f.addEventListener('keydown', function (e) {
      if (e.key === ' ' || e.key === 'Spacebar') { e.preventDefault(); abrir(f); } // o botao do teclado: espaco (Enter ja vira clique no link)
    });
  }
})();
