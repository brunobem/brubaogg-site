// Varredura do CABECALHO (marca + busca + redes + faixa de secoes) em TODOS os tipos de pagina, pelos aparelhos da lista do Chrome DevTools. Roda no navegador, em
// qualquer pagina do site local (nao e parte do "npm run testar"). Cada pagina abre num iframe do tamanho da tela (mesma origem) e confere:
//  - nao sobrou nada do menu antigo (botao de menu, menu lateral, cortina, pilulas) e o corpo nao tem recuo lateral;
//  - o cabecalho cabe na janela e marca, busca e redes nao se sobrepoem;
//  - a faixa de secoes tem as 7 secoes, todas numa linha so (sem quebrar) e, quando a pagina e de uma secao, a secao marcada ("ativo") e UMA so, a certa,
//    e esta visivel dentro da faixa (no celular, assets/js/nav.js a leva para o meio);
//  - o titulo da pagina nao fica por baixo do cabecalho e a pagina nao ganha rolagem horizontal;
//  - MENU HIBRIDO (decide pelo ESPACO, nao pelo aparelho): se as 7 secoes nao cabem numa linha tem de haver o botao "Menu" (>= 44 px, dentro da janela, com data-rola e
//    degrade na borda); se cabem, o botao nao aparece. Com o botao: o painel abre, cabe na janela, deixa area escura para fechar tocando fora, tem as 7 secoes + Inicio,
//    Tags, Arquivo e Sobre (alvos >= 48 px, o ultimo item alcancavel rolando, so as paginas certas marcadas), o foco entra nele, a pagina de tras nao rola, fechar (botao
//    X e toque fora) devolve o foco ao botao e, na pagina inicial, alargar a janela com o painel aberto fecha o painel e some com o botao (e volta ao estreitar).
// Uso: cole este arquivo no console e rode  varrerPaginas().then(console.log)  (todas as paginas x todos os aparelhos: demora uns 5 min; para partir em pedacos:
// varrerPaginas(PAGINAS_DO_SITE.slice(0, 4)) ). Segundo parametro: lista de aparelhos [['nome', largura, altura], ...] (padrao: os do DevTools, em pe e deitado).
// 3o parametro (opcional): CSS injetado em cada iframe para testar se a varredura ACUSA um defeito de proposito (controle). 4o (opcional): { redimensionar: true } faz a
// prova de alargar/estreitar a janela em TODAS as paginas (padrao: so na pagina inicial).
window.PAGINAS_DO_SITE = [
  ['wiki/resident-evil.html', 'Wiki'], ['wiki/gta.html', 'Wiki'], ['series.html', 'Wiki'], ['series/resident-evil-village-ethan-e-a-opiniao-do-brubao.html', 'Wiki'],
  ['index.html', null], ['noticias.html', 'Notícias'], ['reviews.html', 'Reviews'], ['lancamentos.html', 'Lançamentos'], ['gta6.html', 'GTA 6'], ['cortes.html', 'Cortes'],
  ['lives.html', 'Lives'], ['wiki.html', 'Wiki'], ['sobre.html', null], ['termos.html', null], ['privacidade.html', null], ['tags.html', null], ['arquivo.html', null],
  ['busca.html', null], ['404.html', null], ['tag/resident-evil.html', null], ['arquivo/2026-10.html', null],
  ['noticias/amazon-cancela-o-mmorpg-de-o-senhor-dos-aneis.html', 'Notícias'], ['reviews/inside-vale-a-pena-jogar-o-classico-da-playdead-hoje.html', 'Reviews'],
  ['lancamentos/9-jogos-indie-que-chegam-em-outubro-de-2026.html', 'Lançamentos'], ['gta6-novidades/gta6-atividades-secundarias.html', 'GTA 6'], ['noticias/god-of-war-laufey.html', 'Notícias'],
];
window.APARELHOS_DEVTOOLS = window.APARELHOS_DEVTOOLS || [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'],
];
window.varrerPaginas = async function (paginas, aparelhos, cssExtra, opcoes) {
  opcoes = opcoes || {};
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  paginas = paginas || window.PAGINAS_DO_SITE;
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
      var url = paginas[i][0], ativaEsperada = paginas[i][1], nome = aparelhos[k][0], w = aparelhos[k][1], h = aparelhos[k][2];
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
      f.src = '/' + url;
      document.body.appendChild(f);
      await new Promise(function (r) { f.addEventListener('load', r, { once: true }); });
      var win = f.contentWindow, d = win.document;
      try { await d.fonts.ready; } catch (e) { /* segue */ }
      if (cssExtra) { var st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
      await new Promise(function (r) { setTimeout(r, 250); });
      var vw = d.documentElement.clientWidth, prob = [];
      var rect = function (el) { var b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      var cruza = function (a, b) { return a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5; };

      // 1) nada do menu antigo
      if (d.querySelector('.menu-btn, .side, .side-scrim, .chips, #menu-lateral')) prob.push('sobrou elemento do menu antigo');
      if (win.getComputedStyle(d.body).paddingLeft !== '0px') prob.push('o corpo ainda tem recuo lateral (' + win.getComputedStyle(d.body).paddingLeft + ')');

      // 2) cabecalho
      var top = d.querySelector('.topbar'), nav = d.querySelector('.nav-site'), lista = d.querySelector('.nav-site-links');
      if (!top || !nav || !lista) { prob.push('sem cabecalho ou sem faixa de secoes'); }
      else {
        var marca = rect(top.querySelector('.brand')), busca = rect(top.querySelector('.search')), redes = rect(top.querySelector('.social-bar'));
        [['marca', marca], ['busca', busca], ['redes', redes]].forEach(function (p) { if (p[1].l < -0.5 || p[1].r > vw + 0.5) prob.push('cabecalho: ' + p[0] + ' fora da janela'); });
        if (cruza(marca, busca) || cruza(marca, redes) || cruza(busca, redes)) prob.push('cabecalho: marca, busca e redes se sobrepoem');
        // 3) faixa de secoes
        // a casinha (Inicio) e o primeiro item da faixa e nao conta como secao: so o icone, alvo de 44 px, leva a home e so fica marcada na propria home
        var casa = lista.querySelector('li > a.nav-casa'), primeiroLi = lista.querySelector('li');
        if (!casa || !primeiroLi || !primeiroLi.contains(casa)) prob.push('a casinha (Inicio) devia ser o primeiro item da faixa de secoes');
        else {
          var cr0 = rect(casa);
          if (cr0.b - cr0.t < 43.5 || cr0.r - cr0.l < 43.5) prob.push('a casinha tem ' + Math.round(cr0.r - cr0.l) + 'x' + Math.round(cr0.b - cr0.t) + ' px (minimo 44)');
          if (!casa.querySelector('svg') || casa.textContent.trim() !== '' || casa.getAttribute('aria-label') !== 'Início') prob.push('a casinha devia ser so o icone, com o nome acessivel "Inicio"');
          if (!/(^|\/)index\.html$/.test(casa.getAttribute('href') || '')) prob.push('a casinha nao leva para a home');
          if (casa.classList.contains('ativo') !== (!ativaEsperada && /index\.html$/.test(d.location.pathname))) prob.push('a casinha so fica marcada (ativo) na home');
        }
        var itens = Array.prototype.slice.call(lista.querySelectorAll('li > a:not(.nav-casa)'));
        if (itens.length !== 7) prob.push('faixa com ' + itens.length + ' secoes (esperado 7)');
        if (lista.getBoundingClientRect().height < 30 || itens.some(function (a) { return a.getBoundingClientRect().width < 10; })) prob.push('a faixa de secoes esta escondida ou sem tamanho');
        var topos = {}; itens.forEach(function (a) { topos[Math.round(a.getBoundingClientRect().top)] = 1; });
        if (Object.keys(topos).length > 1) prob.push('faixa quebrou em mais de uma linha');
        var ativos = itens.filter(function (a) { return a.classList.contains('ativo'); });
        if (ativaEsperada) {
          if (ativos.length !== 1 || ativos[0].textContent.trim() !== ativaEsperada) prob.push('secao marcada errada (esperada ' + ativaEsperada + ', achou ' + ativos.map(function (a) { return a.textContent.trim(); }).join('+') + ')');
          else {
            var lr = rect(lista), ar = rect(ativos[0]);
            if (ar.l < lr.l - 1 || ar.r > lr.r + 1) prob.push('a secao marcada (' + ativaEsperada + ') fica fora da vista na faixa');
          }
        } else if (ativos.length) prob.push('pagina sem secao tem "' + ativos[0].textContent.trim() + '" marcada');
        // (a casinha nao entra em "itens", por isso nao conta como secao marcada)
        var lr2 = rect(lista); if (lr2.l < -20.5 || lr2.r > vw + 20.5) prob.push('a faixa passa da janela');
        // 3b) menu hibrido: botao Menu e painel
        var botao = d.querySelector('.nav-menu'), painel = d.getElementById('menu-painel'), iw = win.innerWidth, vh = win.innerHeight; // o painel e fixo na janela inteira (sem barras de rolagem: a pagina trava ao abrir), nao na area do documento
        if (!botao || !painel) prob.push('sem botao Menu ou sem painel do menu');
        else {
          var cabe = lista.scrollWidth <= lista.clientWidth + 1;
          var mostra = botao.getClientRects().length > 0; // desenhado na tela (nao basta o atributo hidden)
          if (!cabe && !mostra) prob.push('as secoes nao cabem numa linha e nao ha botao Menu (alguma secao fica fora de alcance)');
          if (cabe && mostra) prob.push('o botao Menu aparece sem precisar (as 7 secoes cabem)');
          if (mostra !== nav.hasAttribute('data-rola')) prob.push('botao Menu e data-rola discordam');
          if (mostra) {
            var br = rect(botao);
            if (br.l < -0.5 || br.r > vw + 0.5) prob.push('o botao Menu fica fora da janela');
            if (br.b - br.t < 43.5) prob.push('botao Menu com ' + Math.round(br.b - br.t) + ' px de altura (minimo 44)');
            var mascara = win.getComputedStyle(lista).webkitMaskImage || win.getComputedStyle(lista).maskImage;
            if (!mascara || mascara === 'none') prob.push('a faixa rola mas nao tem o degrade da borda direita');
            botao.focus(); botao.click(); await espera(60);
            if (!painel.open) prob.push('o botao Menu nao abriu o painel');
            else {
              if (botao.getAttribute('aria-expanded') !== 'true') prob.push('botao Menu sem aria-expanded=true com o painel aberto');
              var pr = rect(painel), caixa = painel.querySelector('.menu-caixa'), itensP = Array.prototype.slice.call(painel.querySelectorAll('.menu-lista a'));
              if (pr.l < -0.5 || pr.t < -0.5 || pr.r > iw + 0.5 || pr.b > vh + 0.5) prob.push('o painel passa da janela (esq,topo,dir,base = ' + [pr.l, pr.t, pr.r, pr.b].map(Math.round) + ' ; janela ' + iw + 'x' + vh + ')');
              if (iw - pr.r < 24) prob.push('o painel cobre a tela toda (sem area escura para fechar tocando fora)');
              if (itensP.length !== 11) prob.push('painel com ' + itensP.length + ' itens (esperado 7 secoes + Inicio, Tags, Arquivo e Sobre)');
              var menor = Math.min.apply(null, itensP.map(function (a) { return a.getBoundingClientRect().height; }));
              if (menor < 47.5) prob.push('item do painel com ' + Math.round(menor) + ' px de altura (minimo 48)');
              caixa.scrollTop = 0;
              var fechar = painel.querySelector('.menu-fechar'), fr = rect(fechar);
              if (fr.t < pr.t - 0.5 || fr.b > pr.b + 0.5 || fr.r > pr.r + 0.5) prob.push('o botao de fechar do painel nao aparece');
              if (fr.b - fr.t < 43.5) prob.push('botao de fechar com menos de 44 px');
              caixa.scrollTop = caixa.scrollHeight;
              var ultimo = rect(itensP[itensP.length - 1]), cr = rect(caixa);
              if (ultimo.b > cr.b + 1 || ultimo.t < cr.t - 1) prob.push('o ultimo item do painel (' + itensP[itensP.length - 1].textContent.trim() + ') nao fica alcancavel rolando o painel');
              caixa.scrollTop = 0;
              var extra = url === 'index.html' ? 'Início' : url === 'sobre.html' ? 'Sobre e contato' : (url === 'tags.html' || url.indexOf('tag/') === 0) ? 'Tags' : (url === 'arquivo.html' || url.indexOf('arquivo/') === 0) ? 'Arquivo' : null;
              var esperados = [ativaEsperada, extra].filter(Boolean).sort().join('|');
              var marcados = Array.prototype.slice.call(painel.querySelectorAll('a.ativo')).map(function (a) { return a.textContent.trim(); }).sort().join('|');
              if (marcados !== esperados) prob.push('painel com itens marcados errados (esperado "' + esperados + '", achou "' + marcados + '")');
              if (!painel.contains(d.activeElement)) prob.push('o foco nao entrou no painel ao abrir');
              if (win.getComputedStyle(d.body).overflow !== 'hidden') prob.push('a pagina de tras continua rolando com o painel aberto');
              painel.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await espera(30);
              if (painel.open) prob.push('tocar na area escura nao fecha o painel');
              botao.focus(); botao.click(); await espera(30);
              if (painel.open) { fechar.click(); await espera(30); }
              if (painel.open) prob.push('o botao X nao fecha o painel');
              else {
                if (botao.getAttribute('aria-expanded') !== 'false') prob.push('botao Menu sem aria-expanded=false depois de fechar');
                if (d.activeElement !== botao) prob.push('ao fechar o painel o foco nao voltou ao botao Menu');
              }
              if (url === 'index.html' || opcoes.redimensionar) {
                botao.click(); await espera(30);
                f.style.width = '1400px'; await espera(260);
                if (painel.open) prob.push('o painel continua aberto depois de alargar a janela');
                if (!botao.hidden) prob.push('o botao Menu nao sumiu ao alargar a janela');
                f.style.width = w + 'px'; await espera(260);
                if (botao.hidden) prob.push('o botao Menu nao voltou ao estreitar a janela');
              }
            }
          }
        }
        // 4) titulo abaixo do cabecalho
        var h1 = d.querySelector('main h1, h1');
        if (h1 && rect(h1).t < rect(nav).b - 1) prob.push('o titulo fica por baixo do cabecalho');
      }
      // 5) rolagem horizontal
      var ov = d.documentElement.scrollWidth - vw, fora = [];
      if (ov > 1) {
        d.querySelectorAll('body *').forEach(function (e) {
          if (e.closest('.nav-site-links, .car-pista, .ticker, .footer-scene, .sr-only, .search-results')) return;
          var b = e.getBoundingClientRect();
          if (b.width && (b.right > vw + 1 || b.left < -1)) fora.push(e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className ? '.' + e.className.split(' ')[0] : '') + ':' + Math.round(b.right));
        });
        if (fora.length) prob.push('rolagem horizontal de ' + ov + ' px por ' + fora.slice(0, 3).join(', '));
      }
      // 6) texto de cartao cortado (titulo, resumo, data) em qualquer lista, bloco ou grade de cartoes da pagina
      var cortes = 0, exemplo = '';
      d.querySelectorAll('.news-card').forEach(function (c) {
        if (!c.getClientRects().length) return;
        var cr = c.getBoundingClientRect();
        c.querySelectorAll('.news-body > *').forEach(function (e) {
          if (!e.getClientRects().length) return;
          var er = e.getBoundingClientRect();
          if (er.bottom > cr.bottom + 0.5 || er.top < cr.top - 0.5 || er.right > cr.right + 0.5) { cortes++; exemplo = exemplo || e.textContent.trim().slice(0, 30); }
        });
      });
      if (cortes) prob.push('cartoes: ' + cortes + ' texto(s) cortado(s) (ex.: "' + exemplo + '")');
      total++;
      if (prob.length) { falhas++; linhas.push(url + ' @ ' + nome + ' ' + w + 'x' + h + ': ' + prob.join(' ; ')); }
      f.remove();
    }
  }
  linhas.push('TOTAL: ' + paginas.length + ' paginas x ' + aparelhos.length + ' tamanhos = ' + total + ' combinacoes, ' + falhas + ' com falha');
  return linhas.join('\n');
};
