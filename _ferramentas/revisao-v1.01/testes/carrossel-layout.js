// Teste de layout do carrossel da home, no navegador (nao roda no "npm run testar"). Mede, no tamanho de janela atual:
//  1) a pista nao rola na vertical (nada de barra de rolagem DENTRO do carrossel);
//  2) nenhum item do texto de nenhum slide fica cortado (os itens de menos prioridade devem SUMIR por completo, nunca ser cortados);
//  3) a imagem nao fica espremida (>= 110 px de altura e >= 140 px de largura);
//  4) a borda e a sombra cabem na largura da janela e a pagina nao ganha rolagem horizontal;
//  5) informa se o carrossel inteiro, com os controles, cabe na janela sem rolar a pagina (so conta como defeito se a janela tem 560 px de altura ou mais).
// Uso: abra a home (servidor local), redimensione a janela, cole este arquivo no console e rode  medirCarrossel()  -> { ok, problemas, info }.
// Para varrer varios tamanhos: redimensione, rode de novo e junte os resultados (foi assim que se testou 280x653 ate 3440x1440).
window.medirCarrossel = function () {
  var raiz = document.querySelector('.carrossel');
  if (!raiz) return { ok: false, problemas: ['sem .carrossel na pagina'], info: {} };
  window.scrollTo({ top: 0, behavior: 'instant' }); // o style.css tem scroll-behavior: smooth: sem "instant" a medida sairia no meio da rolagem
  var pista = raiz.querySelector('.car-pista');
  var controles = raiz.querySelector('.car-controles');
  var slides = Array.prototype.slice.call(raiz.querySelectorAll('.car-slide'));
  var vw = document.documentElement.clientWidth, vh = window.innerHeight;
  var problemas = [];
  var info = { tela: vw + 'x' + vh, slideAlt: 0, sumiu: {}, tituloCortado: 0 };

  if (pista.scrollHeight > pista.clientHeight + 1) problemas.push('rolagem vertical dentro da pista (' + pista.scrollHeight + ' > ' + pista.clientHeight + ')');

  slides.forEach(function (s, i) {
    var link = s.querySelector('.car-link');
    var texto = s.querySelector('.car-texto');
    var thumb = s.querySelector('.car-thumb');
    var t = texto.getBoundingClientRect();
    info.slideAlt = Math.round(link.getBoundingClientRect().height);
    Array.prototype.forEach.call(texto.children, function (el) {
      var visivel = getComputedStyle(el).display !== 'none';
      if (!visivel) { info.sumiu[el.className.split(' ')[0]] = (info.sumiu[el.className.split(' ')[0]] || 0) + 1; return; }
      var b = el.getBoundingClientRect();
      if (b.top < t.top - 0.5 || b.bottom > t.bottom + 0.5) problemas.push('slide ' + (i + 1) + ': ' + el.className.split(' ')[0] + ' fica cortado (' + Math.round(b.top - t.top) + ' / ' + Math.round(b.bottom - t.bottom) + ')');
      if (b.left < t.left - 0.5 || b.right > t.right + 0.5) problemas.push('slide ' + (i + 1) + ': ' + el.className.split(' ')[0] + ' passa dos lados do texto');
    });
    if (texto.scrollHeight > texto.clientHeight + 1) problemas.push('slide ' + (i + 1) + ': texto maior que a caixa (' + texto.scrollHeight + ' > ' + texto.clientHeight + ')');
    var tb = thumb.getBoundingClientRect();
    if (tb.height < 110 || tb.width < 140) problemas.push('slide ' + (i + 1) + ': imagem espremida (' + Math.round(tb.width) + 'x' + Math.round(tb.height) + ')');
    var titulo = s.querySelector('.car-titulo');
    if (titulo.scrollHeight > titulo.clientHeight + 1) info.tituloCortado++;
  });

  var caixa = pista.getBoundingClientRect();
  if (caixa.left < -0.5 || caixa.right + 6 > vw + 0.5) problemas.push('borda ou sombra fora da janela (' + Math.round(caixa.left) + ' ... ' + Math.round(caixa.right + 6) + ' de ' + vw + ')');
  if (document.documentElement.scrollWidth - vw > 1) problemas.push('a pagina ganhou rolagem horizontal (' + (document.documentElement.scrollWidth - vw) + ' px)');

  var fim = controles.getBoundingClientRect().bottom;
  info.cabeNaJanela = fim <= vh + 0.5;
  info.fimDosControles = Math.round(fim);
  if (!info.cabeNaJanela && vh >= 560) problemas.push('carrossel com controles passa da janela (termina em ' + Math.round(fim) + ' de ' + vh + ')');

  return { ok: problemas.length === 0, problemas: problemas, info: info };
};
