// Paginas de player (Cortes e Lives) pelos aparelhos da lista do Chrome DevTools, em pe e deitado. Roda no navegador, em qualquer pagina do site local (nao e parte do "npm run testar";
// o que nao precisa de navegador esta em t-player.mjs). Cada pagina abre num iframe do tamanho da tela (mesma origem) e confere, em CADA playlist:
//  - a lista "Ultimos videos": todos os itens dentro da janela e do cartao da playlist, miniatura visivel (16:9, sem espremer) ao lado do titulo, alvo de toque de 44 px ou mais,
//    titulo e data inteiros (nunca cortados) e um item nao cobre o outro; ate 480 px a lista e de uma coluna;
//  - o player (iframe) dentro do cartao e o botao "Ver playlist completa" dentro da janela e com 44 px ou mais;
//  - a ordem na pagina (player, lista, botao) e a pagina sem rolagem horizontal.
// Uso: cole este arquivo no console (ou carregue por <script src>) e rode  varrerPlayers().then(console.log)  (a aba precisa estar a frente). 1o parametro: lista de enderecos;
// 2o: aparelhos [['nome', largura, altura], ...] (padrao: os do DevTools, em pe e deitado); 3o (opcional): CSS injetado para testar se a varredura ACUSA um defeito de proposito.
window.PLAYERS_DO_SITE = ['cortes.html', 'lives.html'];
window.APARELHOS_DEVTOOLS = window.APARELHOS_DEVTOOLS || [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'],
];
window.varrerPlayers = async function (paginas, aparelhos, cssExtra) {
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  paginas = paginas || window.PLAYERS_DO_SITE;
  if (!aparelhos) {
    aparelhos = [];
    window.APARELHOS_DEVTOOLS.forEach(function (a) {
      if (a[3] === 'fixo') { aparelhos.push([a[0], a[1], a[2]]); return; }
      aparelhos.push([a[0] + ' (em pe)', a[1], a[2]]);
      aparelhos.push([a[0] + ' (deitado)', a[2], a[1]]);
    });
  }
  var linhas = [], falhas = 0, total = 0;
  for (var i = 0; i < paginas.length; i++) {
    for (var k = 0; k < aparelhos.length; k++) {
      var url = paginas[i], nome = aparelhos[k][0], w = aparelhos[k][1], h = aparelhos[k][2];
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
      f.src = '/' + url;
      document.body.appendChild(f);
      await new Promise(function (r) { f.addEventListener('load', r, { once: true }); });
      var win = f.contentWindow, d = win.document;
      try { await d.fonts.ready; } catch (e) { /* segue */ }
      if (cssExtra) { var st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
      // as miniaturas abaixo da dobra sao preguicosas (loading=lazy): forca o carregamento para poder medir e conferir que carregam
      var imgs = Array.prototype.slice.call(d.querySelectorAll('.pl-thumb img, .fachada img'));
      imgs.forEach(function (im) { im.loading = 'eager'; });
      await Promise.race([Promise.all(imgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }); })), espera(4000)]);
      await espera(250);
      var vw = d.documentElement.clientWidth, prob = [];
      var rect = function (el) { var b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      var cruza = function (a, b) { return a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5; };
      var dentro = function (r, pai) { return r.l >= pai.l - 0.5 && r.r <= pai.r + 0.5; };
      if (d.documentElement.scrollWidth > vw + 0.5) prob.push('rolagem horizontal de ' + (d.documentElement.scrollWidth - vw) + ' px');
      var cartoes = Array.prototype.slice.call(d.querySelectorAll('.pl'));
      if (!cartoes.length) prob.push('sem playlists');
      cartoes.forEach(function (c, n) {
        var cn = 'playlist ' + (n + 1), cr = rect(c), janela = { l: 0, r: vw };
        if (!dentro(cr, janela)) prob.push(cn + ' passa da janela');
        var video = c.querySelector('.video'), lista = c.querySelector('.pl-videos'), botao = c.querySelector('.btn');
        if (!video || !lista || !botao) { prob.push(cn + ': falta player, lista ou botao'); return; }
        if (!dentro(rect(video), cr)) prob.push(cn + ': o player passa do cartao');
        var fch = video.querySelector('.fachada'), vr = rect(video);
        if (d.querySelector('.pl iframe')) prob.push(cn + ': iframe antes do clique (o player devia nascer so no clique)');
        if (!fch) prob.push(cn + ': sem a fachada do player');
        else {
          var fr = rect(fch), pj = fch.querySelector('.fachada-play') ? rect(fch.querySelector('.fachada-play')) : null, fi = fch.querySelector('img');
          if (Math.abs(fr.l - vr.l) > 3 || Math.abs(fr.r - vr.r) > 3 || Math.abs(fr.t - vr.t) > 3 || Math.abs(fr.b - vr.b) > 3) prob.push(cn + ': a fachada nao cobre a caixa do player');
          if (!pj || pj.r - pj.l < 43.5) prob.push(cn + ': botao de play ausente ou menor que 44 px');
          else if (Math.abs((pj.l + pj.r) / 2 - (fr.l + fr.r) / 2) > 1.5 || Math.abs((pj.t + pj.b) / 2 - (fr.t + fr.b) / 2) > 1.5) prob.push(cn + ': o botao de play nao esta no centro');
          if (fi && (!fi.complete || fi.naturalWidth === 0)) prob.push(cn + ': a miniatura da fachada nao carregou');
          if (fch.getAttribute('role') !== 'button') prob.push(cn + ': a fachada nao virou botao (role) com o JavaScript');
        }
        if (!(rect(video).b <= rect(lista).t + 0.5 && rect(lista).b <= rect(botao).t + 0.5)) prob.push(cn + ': ordem errada (o certo: player, lista, botao)');
        var br = rect(botao); if (!dentro(br, cr)) prob.push(cn + ': botao passa do cartao'); if (br.b - br.t < 43.5) prob.push(cn + ': botao com ' + Math.round(br.b - br.t) + ' px de altura (minimo 44)');
        var itens = Array.prototype.slice.call(lista.querySelectorAll('li'));
        if (itens.length < 1 || itens.length > 6) prob.push(cn + ': ' + itens.length + ' videos na lista (esperado de 1 a 6)');
        var colunas = win.getComputedStyle(lista).gridTemplateColumns.split(' ').length;
        if (vw <= 480 && colunas !== 1) prob.push(cn + ': ate 480 px a lista devia ter 1 coluna (tem ' + colunas + ')');
        itens.forEach(function (li, m) {
          var a = li.querySelector('a'), thumb = li.querySelector('.pl-thumb'), img = li.querySelector('img'), tit = li.querySelector('b'), dt = li.querySelector('small'), ar = rect(a), tr = rect(thumb);
          if (!dentro(ar, cr)) prob.push(cn + ' video ' + (m + 1) + ': passa do cartao');
          if (ar.b - ar.t < 43.5) prob.push(cn + ' video ' + (m + 1) + ': alvo de toque com ' + Math.round(ar.b - ar.t) + ' px (minimo 44)');
          var proporcao = (tr.r - tr.l) / (tr.b - tr.t); if (Math.abs(proporcao - 16 / 9) > 0.2) prob.push(cn + ' video ' + (m + 1) + ': miniatura espremida (' + proporcao.toFixed(2) + ' em vez de 1,78)');
          if (tr.r - tr.l < 100) prob.push(cn + ' video ' + (m + 1) + ': miniatura com ' + Math.round(tr.r - tr.l) + ' px de largura (minimo 100)');
          if (!img.complete || img.naturalWidth === 0) prob.push(cn + ' video ' + (m + 1) + ': miniatura nao carregou');
          [tit, dt].forEach(function (t) { if (t.scrollWidth > t.clientWidth + 1 && win.getComputedStyle(t).overflow !== 'visible') prob.push(cn + ' video ' + (m + 1) + ': texto cortado'); if (rect(t).r > rect(a).r + 0.5) prob.push(cn + ' video ' + (m + 1) + ': texto passa do item'); });
          if (cruza(rect(tit), tr)) prob.push(cn + ' video ' + (m + 1) + ': titulo sobre a miniatura');
          if (m > 0 && cruza(ar, rect(itens[m - 1].querySelector('a')))) prob.push(cn + ': videos ' + m + ' e ' + (m + 1) + ' se sobrepoem');
        });
      });
      total++;
      if (prob.length) { falhas++; linhas.push(url + ' @ ' + nome + ' ' + w + 'x' + h + ': ' + Array.from(new Set(prob)).slice(0, 6).join(' ; ')); }
      f.remove();
    }
  }
  linhas.push('TOTAL: ' + paginas.length + ' paginas x ' + aparelhos.length + ' tamanhos = ' + total + ' combinacoes, ' + falhas + ' com falha');
  return linhas.join('\n');
};
