// ATENCAO: com ADS_ATIVOS = false (gerador/config.mjs) os espacos de ADS estao escondidos; as conferencias de ADS deste arquivo so valem com ADS_ATIVOS = true (e npm run gerar).
// Varredura da HOME pelos aparelhos da lista do Chrome DevTools (modo dispositivo), cada um em pe e deitado. Roda no navegador, na propria home (nao e parte do
// "npm run testar"). Cada aparelho abre a home num iframe do tamanho da tela (mesma origem) e confere:
//  - carrossel: sem rolagem vertical por dentro, nenhum item do texto cortado, imagem nao espremida, borda e sombra dentro da janela e, em janelas com 560 px de
//    altura ou mais, carrossel com controles inteiro na tela sem rolar a pagina;
//  - blocos (cobertura, noticias, reviews, lancamentos e wiki): nenhum texto de cartao cortado; informa quantos cartoes mostram resumo e 1o paragrafo e o maior espaco vazio;
//  - contagem regressiva do GTA 6: dentro da janela e da faixa, numeros e rotulos centralizados em cada caixa, conjunto bem posto na faixa;
//  - convite para o canal (abaixo do carrossel): dentro da janela, com icone, texto e botao dentro da caixa;
//  - pagina: sem rolagem horizontal e sem caixa passando da largura (menos as faixas que rolam de proposito) e os espacos de ADS dentro da janela.
// Uso: abra a home (servidor local), cole este arquivo no console e rode  varrerAparelhos().then(console.log)   (ou passe sua lista: [['nome', largura, altura], ...]).
// Medidas = "screen" de cada aparelho em ChromeDevTools/devtools-frontend, front_end/models/emulation/EmulatedDevices.ts (conferidas em 2026-10-11). O iframe imita so
// a LARGURA e a ALTURA da tela (sem barras do navegador, sem toque, sem densidade de pixels): nao substitui um teste em aparelho de verdade.
window.APARELHOS_DEVTOOLS = [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'], // "fixo": a tela nao gira (no DevTools a medida deitada e a mesma)
];
// 2o parametro (opcional): CSS injetado em cada iframe, para testar se a varredura ACUSA um defeito de proposito (controle). Ex.: '.gta-faixa .unit { text-align: left }'
window.varrerAparelhos = async function (lista, cssExtra) {
  var aparelhos = lista;
  if (!aparelhos) {
    aparelhos = [];
    window.APARELHOS_DEVTOOLS.forEach(function (a) {
      if (a[3] === 'fixo') { aparelhos.push([a[0], a[1], a[2]]); return; }
      aparelhos.push([a[0] + ' (em pe)', a[1], a[2]]);
      aparelhos.push([a[0] + ' (deitado)', a[2], a[1]]);
    });
  }
  var linhas = [], falhas = 0;
  for (var k = 0; k < aparelhos.length; k++) {
    var nome = aparelhos[k][0], w = aparelhos[k][1], h = aparelhos[k][2];
    var f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
    f.src = '/index.html';
    document.body.appendChild(f);
    await new Promise(function (r) { f.addEventListener('load', r, { once: true }); });
    var win = f.contentWindow, d = win.document;
    try { await d.fonts.ready; } catch (e) { /* sem fontes prontas: segue */ }
    if (cssExtra) { var st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
    await new Promise(function (r) { setTimeout(r, 350); });
    var vw = d.documentElement.clientWidth, vh = win.innerHeight;
    var vis = function (e) { return e && win.getComputedStyle(e).display !== 'none'; };
    var prob = [];
    win.scrollTo({ top: 0, behavior: 'instant' });

    // carrossel
    var raiz = d.querySelector('.carrossel'), pista = raiz.querySelector('.car-pista'), slideAlt = 0;
    if (pista.scrollHeight > pista.clientHeight + 1) prob.push('carrossel: rolagem vertical interna');
    raiz.querySelectorAll('.car-slide').forEach(function (s, i) {
      var texto = s.querySelector('.car-texto'), t = texto.getBoundingClientRect();
      slideAlt = Math.round(s.querySelector('.car-link').getBoundingClientRect().height);
      Array.prototype.forEach.call(texto.children, function (el) {
        if (!vis(el)) return;
        var b = el.getBoundingClientRect();
        if (b.top < t.top - 0.5 || b.bottom > t.bottom + 0.5 || b.left < t.left - 0.5 || b.right > t.right + 0.5) prob.push('carrossel slide ' + (i + 1) + ': ' + el.className.split(' ')[0] + ' cortado');
      });
      var tb = s.querySelector('.car-thumb').getBoundingClientRect();
      if (tb.height < 110 || tb.width < 140) prob.push('carrossel: imagem espremida ' + Math.round(tb.width) + 'x' + Math.round(tb.height));
    });
    var cb = pista.getBoundingClientRect();
    if (cb.left < -0.5 || cb.right + 6 > vw + 0.5) prob.push('carrossel: borda/sombra fora da janela');
    var fim = raiz.querySelector('.car-controles').getBoundingClientRect().bottom, cabe = fim <= vh + 0.5;
    if (!cabe && vh >= 560) prob.push('carrossel com controles passa da janela (' + Math.round(fim) + ' > ' + vh + ')');

    // blocos
    var txtGrande = 0, txtMais = 0, peqTxt = 0, peqTot = 0, corte = 0, vazioMax = 0;
    d.querySelectorAll('.bloco-grade').forEach(function (b) {
      var g = b.querySelector('.news-card.grande');
      if (vis(g.querySelector('.news-excerpt'))) txtGrande++;
      if (vis(g.querySelector('.news-mais'))) txtMais++;
      var filhos = Array.prototype.filter.call(g.querySelectorAll('.news-body > *'), vis);
      vazioMax = Math.max(vazioMax, Math.round(filhos[filhos.length - 1].getBoundingClientRect().top - filhos[filhos.length - 2].getBoundingClientRect().bottom - 10));
      b.querySelectorAll('.bloco-lista .news-card').forEach(function (c) { peqTot++; if (vis(c.querySelector('.news-excerpt'))) peqTxt++; });
      b.querySelectorAll('.news-card').forEach(function (c) {
        var cr = c.getBoundingClientRect();
        c.querySelectorAll('.news-body > *').forEach(function (e) {
          if (!vis(e)) return;
          var er = e.getBoundingClientRect();
          if (er.bottom > cr.bottom + 0.5 || er.right > cr.right + 0.5) corte++;
        });
      });
    });
    if (corte) prob.push('blocos: ' + corte + ' texto(s) cortado(s)');

    // contagem regressiva do GTA 6: faixa na janela, caixas dentro da faixa, numero e rotulo CENTRALIZADOS em cada caixa e o conjunto bem posto na faixa
    var faixa = d.querySelector('.gta-faixa');
    if (faixa) {
      var fb = faixa.getBoundingClientRect(), tituloFaixa = faixa.querySelector('.gta-title').getBoundingClientRect(), cont = faixa.querySelector('.count').getBoundingClientRect();
      if (fb.left < -0.5 || fb.right > vw + 0.5) prob.push('contagem: faixa fora da janela');
      faixa.querySelectorAll('.unit').forEach(function (u, i) {
        var ub = u.getBoundingClientRect();
        if (ub.left < fb.left - 0.5 || ub.right > fb.right + 0.5) prob.push('contagem: caixa ' + (i + 1) + ' passa da faixa');
        Array.prototype.forEach.call(u.children, function (t) {
          var rg = d.createRange(); rg.selectNodeContents(t);
          var tb = rg.getBoundingClientRect(), dx = Math.round((tb.left + tb.right) / 2 - (ub.left + ub.right) / 2);
          if (Math.abs(dx) > 2) prob.push('contagem: "' + t.textContent.trim() + '" descentralizado (' + dx + ' px)');
          if (tb.left < ub.left - 0.5 || tb.right > ub.right + 0.5) prob.push('contagem: "' + t.textContent.trim() + '" passa da caixa');
        });
      });
      var empilhada = cont.top >= tituloFaixa.bottom - 1; // celular: titulo, numeros e data um embaixo do outro
      if (empilhada) { if (Math.abs((cont.left + cont.right) / 2 - (fb.left + fb.right) / 2) > 2) prob.push('contagem: numeros fora do centro da faixa'); }
      else if (Math.abs((fb.right - parseFloat(win.getComputedStyle(faixa).paddingRight) - 2) - (cont.right - 2)) > 2) prob.push('contagem: numeros nao encostam na margem direita da faixa');
    }

    // convite para o canal (logo abaixo do carrossel): dentro da janela e cada pedaco (icone, texto, botao) dentro da caixa
    var conv = d.querySelector('.convite');
    if (conv) {
      var cvb = conv.getBoundingClientRect();
      if (cvb.left < -0.5 || cvb.right + 4 > vw + 0.5) prob.push('convite: fora da janela');
      Array.prototype.forEach.call(conv.children, function (el) {
        var eb = el.getBoundingClientRect();
        if (eb.left < cvb.left - 0.5 || eb.right > cvb.right + 0.5 || eb.top < cvb.top - 0.5 || eb.bottom > cvb.bottom + 0.5) prob.push('convite: ' + el.className.split(' ')[0] + ' passa da caixa');
      });
    }

    // pagina inteira
    var ov = d.documentElement.scrollWidth - vw, fora = [];
    d.querySelectorAll('body *').forEach(function (e) {
      if (e.closest('.car-pista, .nav-site-links, .ticker, .footer-scene, .sr-only')) return;
      var b = e.getBoundingClientRect();
      if (b.width && (b.right > vw + 1 || b.left < -1)) fora.push(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '') + ':' + Math.round(b.right));
    });
    if (ov > 1 && fora.length) prob.push('pagina: rolagem horizontal de ' + ov + ' px por ' + fora.slice(0, 3).join(', '));
    if (!Array.prototype.every.call(d.querySelectorAll('.ads'), function (a) { return a.getBoundingClientRect().right <= vw + 1; })) prob.push('ADS fora da janela');

    if (prob.length) falhas++;
    linhas.push(nome + ' ' + w + 'x' + h + ' | ' + (prob.length ? 'FALHA: ' + prob.join(' ; ') : 'OK') + ' | slide ' + slideAlt + ' px' + (cabe ? '' : ' (carrossel nao cabe na tela)') +
      ' | grande c/ resumo ' + txtGrande + '/' + d.querySelectorAll('.bloco-grade').length + ', c/ 1o paragrafo ' + txtMais + '/' + d.querySelectorAll('.bloco-grade').length + ', pequenos c/ texto ' + peqTxt + '/' + peqTot + ', vazio max ' + vazioMax + ' px');
    f.remove();
  }
  linhas.push('TOTAL: ' + aparelhos.length + ' tamanhos, ' + falhas + ' com falha');
  return linhas.join('\n');
};
