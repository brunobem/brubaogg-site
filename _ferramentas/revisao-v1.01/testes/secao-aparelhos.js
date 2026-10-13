// Mini-busca de cada secao (Noticias, Reviews, Lancamentos e Wiki) em navegador de verdade, pelos aparelhos da lista do Chrome DevTools. Roda no navegador, em qualquer
// pagina do site local (nao e parte do "npm run testar"; o que nao precisa de navegador esta em t-js.mjs). Cada pagina abre num iframe do tamanho da tela (mesma origem).
// Noticias e Lancamentos so tem o campo de busca; Reviews tem o menu lateral de plataformas e o "Ordenar por" ao lado do campo; a Wiki tem o menu lateral de jogos.
// Em TODOS os tamanhos confere o layout: campo e controles dentro da janela e com pelo menos 44 px, menu ao lado dos cartoes em tela larga (e acima deles no celular, com o
// primeiro cartao na primeira tela), lista de sempre aparecendo com a busca vazia, nenhum texto de cartao cortado e nenhuma rolagem horizontal.
// Nos tamanhos de "interacao" (opcoes.interagir; por padrao 5 aparelhos) usa de verdade: clica num item do menu e depois no mesmo (volta), digita um titulo, combina menu e
// texto, busca algo que nao existe, usa a ordem A-Z e "Ver mais", abre a pagina ja com a busca na URL e com lixo na URL; e compara cada resultado com uma conta independente
// feita em cima do JSON.
// Uso: cole este arquivo no console e rode  varrerSecoes().then(console.log)  (a aba precisa estar a frente; o painel limita a ~45 s por chamada: 1 ou 2 paginas por vez,
// ex.: varrerSecoes(PAGINAS_COM_BUSCA.slice(0, 2)) ). 3o parametro: CSS injetado para testar se a varredura ACUSA um defeito de proposito (controle).
window.PAGINAS_COM_BUSCA = ['noticias.html', 'reviews.html', 'lancamentos.html', 'wiki.html'];
window.APARELHOS_DEVTOOLS = window.APARELHOS_DEVTOOLS || [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'],
];
window.varrerSecoes = async function (paginas, aparelhos, cssExtra, opcoes) {
  paginas = paginas || window.PAGINAS_COM_BUSCA;
  opcoes = opcoes || {};
  var interagir = opcoes.interagir || ['iPhone SE (em pe)', 'Samsung Galaxy A55 (em pe)', 'iPhone 16 Pro Max (deitado)', 'iPad Mini (em pe)', 'Nest Hub Max'];
  var COM_MENU = { 'reviews.html': 'pl', 'wiki.html': 'jogo' };
  if (!aparelhos) {
    aparelhos = [];
    window.APARELHOS_DEVTOOLS.forEach(function (a) {
      if (a[3] === 'fixo') { aparelhos.push([a[0], a[1], a[2]]); return; }
      aparelhos.push([a[0] + ' (em pe)', a[1], a[2]]);
      aparelhos.push([a[0] + ' (deitado)', a[2], a[1]]);
    });
  }
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var ate = async function (cond, ms) { var t = 0; while (t < (ms || 2500)) { try { if (cond()) return true; } catch (e) { /* ainda nao */ } await espera(50); t += 50; } return false; };
  var linhas = [], falhas = 0, total = 0, interacoes = 0, controlesMedidos = 0;

  for (var i = 0; i < paginas.length; i++) {
    var url = paginas[i], grupoDaPagina = COM_MENU[url] || '';
    // os dados, para a conta independente (o mesmo arquivo que a pagina baixa)
    var htmlTexto = await (await fetch('/' + url, { cache: 'no-store' })).text();
    var src = (htmlTexto.match(/data-src="([^"]+)"/) || [])[1];
    var dados = (await (await fetch('/' + src, { cache: 'no-store' })).json()).itens;
    var doGrupo = function (g, v) { return dados.filter(function (it) { return ((it.f || {})[g] || []).indexOf(v) >= 0; }); };

    for (var k = 0; k < aparelhos.length; k++) {
      var nome = aparelhos[k][0], w = aparelhos[k][1], h = aparelhos[k][2], prob = [];
      var f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
      f.src = '/' + url;
      document.body.appendChild(f);
      await new Promise(function (r) { f.addEventListener('load', r, { once: true }); });
      var win = f.contentWindow, d = win.document;
      try { await d.fonts.ready; } catch (e) { /* segue */ }
      if (cssExtra) { var st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
      await espera(250);
      var vw = d.documentElement.clientWidth;
      var rect = function (el) { var b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      var visivel = function (el) { return !!el && el.getClientRects().length > 0; };
      var raiz = d.querySelector('.secao-busca');

      // ---- layout (todos os tamanhos) ----
      var campo = null, menu = null, res = null, est = null, status = null;
      if (!raiz) prob.push('a mini-busca nao existe na pagina');
      else {
        campo = raiz.querySelector('input[name="q"]'); menu = raiz.querySelector('.secao-menu'); res = raiz.querySelector('.secao-resultados'); est = raiz.querySelector('.secao-estatico'); status = raiz.querySelector('.busca-status');
        var form = raiz.querySelector('.secao-form');
        if (!visivel(form) || !visivel(campo)) prob.push('o campo de busca nao aparece (continua escondido?)');
        else {
          var cr = rect(campo);
          if (cr.b - cr.t < 43.5) prob.push('campo de busca com ' + Math.round(cr.b - cr.t) + ' px de altura (minimo 44)');
          if (cr.r > vw + 0.5 || cr.l < -0.5) prob.push('campo de busca fora da janela');
          if (cr.r - cr.l < 200) prob.push('campo de busca estreito demais (' + Math.round(cr.r - cr.l) + ' px)');
        }
        var ordemSel = raiz.querySelector('select[name="o"]');
        if (ordemSel) { controlesMedidos++; var orr = rect(ordemSel); if (orr.b - orr.t < 43.5) prob.push('"Ordenar por" com ' + Math.round(orr.b - orr.t) + ' px de altura (minimo 44)'); if (orr.r > vw + 0.5 || orr.l < -0.5) prob.push('"Ordenar por" fora da janela'); }
        if (!!menu !== !!grupoDaPagina) prob.push(grupoDaPagina ? 'falta o menu lateral' : 'esta secao so deveria ter o campo de busca, sem menu');
        var conteudo = raiz.querySelector('.secao-conteudo');
        if (menu) {
          if (!visivel(menu)) prob.push('o menu lateral nao aparece (continua escondido?)');
          else {
            var mr = rect(menu), cor = rect(conteudo);
            raiz.querySelectorAll('.secao-item').forEach(function (b) {
              controlesMedidos++; var r = rect(b);
              if (r.b - r.t < 43.5) prob.push('item "' + b.textContent.trim().slice(0, 18) + '" com ' + Math.round(r.b - r.t) + ' px de altura (minimo 44)');
              if (r.r > vw + 0.5 || r.l < -0.5) prob.push('item "' + b.textContent.trim().slice(0, 18) + '" fora da janela');
            });
            if (win.innerWidth > 700) {
              if (mr.r > cor.l + 1) prob.push('em tela larga o menu precisa ficar AO LADO dos cartoes (menu ate ' + Math.round(mr.r) + ' px, cartoes a partir de ' + Math.round(cor.l) + ' px)');
              if (cor.r - cor.l < 300) prob.push('os cartoes ficaram com so ' + Math.round(cor.r - cor.l) + ' px de largura ao lado do menu');
            } else if (mr.b > cor.t + 1) prob.push('no celular o menu precisa ficar ACIMA dos cartoes');
            // o espaco de ADS que o dono pediu logo depois do filtro (altura + margens) nao conta: o que se cobra e que o menu e o resto nao empurrem o primeiro cartao para baixo
            if (win.innerWidth <= 700 && h >= 640 && h > w) {
              var primeiro = d.querySelector('.secao-estatico .news-card'), anuncio = d.querySelector('.secao-form ~ .ads'), reserva = 0;
              if (anuncio) { var ca = win.getComputedStyle(anuncio); reserva = anuncio.getBoundingClientRect().height + parseFloat(ca.marginTop) + parseFloat(ca.marginBottom); }
              if (primeiro && primeiro.getBoundingClientRect().top >= h + reserva) prob.push('o primeiro cartao comeca em ' + Math.round(primeiro.getBoundingClientRect().top) + ' px, abaixo da primeira tela (' + h + ' px' + (reserva ? ' + ' + Math.round(reserva) + ' px do ADS' : '') + ')');
            }
          }
        }
        if (raiz.querySelector('.secao-sub:not([hidden])')) prob.push('a lista de jogos nasce aberta (so deve abrir ao escolher a franquia)');
        if (!visivel(est) || !est.querySelector('.news-card, .news-grid')) prob.push('a lista de sempre nao aparece com a busca vazia');
        if (res && visivel(res)) prob.push('a area de resultados aparece com a busca vazia');
        if (raiz.querySelector('.secao-item[aria-pressed="true"]') && raiz.querySelector('.secao-item[aria-pressed="true"]').getAttribute('data-v') !== '') prob.push('um item do menu nasceu marcado (so "Todos/Todas" pode)');
      }
      var semCorte = function () {
        var cortes = 0, ex = '';
        d.querySelectorAll('.news-card').forEach(function (c) {
          if (!visivel(c)) return; var b = c.getBoundingClientRect();
          c.querySelectorAll('.news-body > *').forEach(function (e) { if (!visivel(e)) return; var q = e.getBoundingClientRect(); if (q.bottom > b.bottom + 0.5 || q.top < b.top - 0.5 || q.right > b.right + 0.5) { cortes++; ex = ex || e.textContent.trim().slice(0, 25); } });
        });
        return cortes ? 'cartoes: ' + cortes + ' texto(s) cortado(s) (ex.: "' + ex + '")' : '';
      };
      var corte0 = semCorte(); if (corte0) prob.push(corte0);
      var ov = d.documentElement.scrollWidth - vw; if (ov > 1) prob.push('rolagem horizontal de ' + ov + ' px');

      // ---- interacao (so nos tamanhos escolhidos) ----
      if (raiz && visivel(campo) && interagir.indexOf(nome) >= 0) {
        interacoes++;
        var contaTela = function () { var m = status.textContent.match(/^(\d+)/); return m ? Number(m[1]) : (/^Nenhum/.test(status.textContent) ? 0 : -1); };
        var pronto = function (n) { return function () { return !res.hidden && contaTela() === n; }; };
        var itensMenu = menu ? Array.prototype.slice.call(menu.querySelectorAll('.secao-item')) : [];
        var todos = itensMenu[0], escolhido = itensMenu[1], v1 = escolhido ? escolhido.getAttribute('data-v') : '', n1 = escolhido ? doGrupo(grupoDaPagina, v1).length : 0;
        if (escolhido) {
          // 1) um item do menu
          escolhido.click();
          if (!(await ate(pronto(n1)))) prob.push('item do menu (' + grupoDaPagina + '=' + v1 + '): esperava ' + n1 + ' resultado(s), a tela diz "' + status.textContent + '"');
          else {
            if (res.querySelectorAll('.news-card').length !== Math.min(30, n1)) prob.push('item do menu: ' + res.querySelectorAll('.news-card').length + ' cartoes na tela (esperado ' + Math.min(30, n1) + ')');
            if (visivel(est)) prob.push('a lista de sempre continua aparecendo com um item de menu ativo');
            if (escolhido.getAttribute('aria-pressed') !== 'true' || todos.getAttribute('aria-pressed') !== 'false') prob.push('o item clicado nao ficou marcado (ou "Todos" continua marcado)');
            if (win.location.search.indexOf(grupoDaPagina + '=' + v1) < 0) prob.push('o item do menu nao foi para a URL (' + win.location.search + ')');
            var ver = raiz.querySelector('.secao-ver'), href = escolhido.getAttribute('data-href');
            if (href && (!visivel(ver) || !ver.querySelector('a') || ver.querySelector('a').getAttribute('href') !== href)) prob.push('falta o link "Ver a pagina de ..." para ' + href);
            var c1 = semCorte(); if (c1) prob.push('com item de menu: ' + c1);
            if (d.documentElement.scrollWidth - vw > 1) prob.push('com item de menu: rolagem horizontal');
          }
          // 1b) menu em dois niveis (Wiki): a franquia abre a lista dos jogos dela; cada jogo mostra so o dele; "Noticias" no fim; jogo vazio avisa; clicar de novo volta um nivel
          var painel = raiz.querySelector('.secao-sub:not([hidden])');
          if (raiz.querySelector('.secao-sub')) {
            if (!painel || !visivel(painel)) prob.push('a franquia escolhida nao abriu a lista dos jogos dela');
            else {
              var subs = Array.prototype.slice.call(painel.querySelectorAll('.secao-subitem'));
              if (escolhido.getAttribute('aria-expanded') !== 'true') prob.push('a franquia aberta precisa ter aria-expanded="true"');
              subs.forEach(function (s) { controlesMedidos++; var r = rect(s); if (r.b - r.t < 39.5) prob.push('jogo "' + s.textContent.trim().slice(0, 20) + '" com ' + Math.round(r.b - r.t) + ' px de altura (minimo 40)'); if (r.r > vw + 0.5 || r.l < -0.5) prob.push('jogo "' + s.textContent.trim().slice(0, 20) + '" fora da janela'); });
              if (subs[subs.length - 1].getAttribute('data-v') !== 'noticias') prob.push('o ultimo item da lista de jogos precisa ser "Noticias"');
              var contaDoJogo = function (sv) { return dados.filter(function (it) { return ((it.f || {}).jogo || []).indexOf(v1) >= 0 && ((it.f || {}).sub || []).indexOf(sv) >= 0; }).length; };
              var comConteudo = subs.filter(function (s) { return s.getAttribute('data-v') !== 'noticias' && !s.classList.contains('vazio'); })[0];
              var vazio = subs.filter(function (s) { return s.classList.contains('vazio'); })[0];
              var noticias = subs[subs.length - 1];
              var testarSub = async function (s, rotulo) {
                var sv = s.getAttribute('data-v'), nsv = contaDoJogo(sv);
                s.click();
                if (!(await ate(function () { return !res.hidden && contaTela() === nsv; }))) { prob.push(rotulo + ' (sub=' + sv + '): esperava ' + nsv + ', a tela diz "' + status.textContent + '"'); return; }
                if (s.getAttribute('aria-pressed') !== 'true') prob.push(rotulo + ': o jogo clicado nao ficou marcado');
                if (!escolhido.classList.contains('secao-pai')) prob.push(rotulo + ': a franquia devia ficar so com o contorno enquanto um jogo esta escolhido');
                if (win.location.search.indexOf('sub=' + sv) < 0) prob.push(rotulo + ': o jogo nao foi para a URL (' + win.location.search + ')');
                if (nsv === 0 && !/Ainda não há conteúdo/.test(res.textContent)) prob.push(rotulo + ': jogo sem conteudo precisa avisar "Ainda nao ha conteudo"');
                if (nsv > 0 && res.querySelectorAll('.news-card').length !== Math.min(30, nsv)) prob.push(rotulo + ': ' + res.querySelectorAll('.news-card').length + ' cartoes na tela (esperado ' + Math.min(30, nsv) + ')');
                var cs = semCorte(); if (cs) prob.push(rotulo + ': ' + cs);
              };
              if (comConteudo) await testarSub(comConteudo, 'jogo com conteudo');
              await testarSub(noticias, 'Noticias');
              if (vazio) await testarSub(vazio, 'jogo vazio');
              // clicar de novo no jogo escolhido volta para a franquia inteira
              var atualSub = subs.filter(function (s) { return s.getAttribute('aria-pressed') === 'true'; })[0];
              if (atualSub) { atualSub.click(); if (!(await ate(pronto(n1)))) prob.push('clicar de novo no jogo escolhido nao voltou para a franquia inteira (' + n1 + '), a tela diz "' + status.textContent + '"'); else if (win.location.search.indexOf('sub=') >= 0) prob.push('depois de voltar para a franquia a URL ainda tem sub='); }
            }
          }
          // 2) menu + texto juntos ("e"): um titulo de dentro do item
          var dentro = doGrupo(grupoDaPagina, v1)[0];
          campo.value = dentro.t.slice(0, 14);
          campo.dispatchEvent(new win.Event('input', { bubbles: true }));
          if (!(await ate(function () { return !res.hidden && Array.prototype.some.call(res.querySelectorAll('.news-title'), function (e) { return e.textContent === dentro.t; }); }, 3000))) prob.push('menu + texto "' + dentro.t.slice(0, 14) + '" nao trouxe o proprio item');
          else if (contaTela() > n1) prob.push('menu + texto devolveu ' + contaTela() + ' resultados, mais que o menu sozinho (' + n1 + '): o "e" virou "ou"');
          campo.value = ''; campo.dispatchEvent(new win.Event('input', { bubbles: true }));
          // 3) clicar de novo no mesmo item volta para "Todos"
          escolhido.click();
          if (!(await ate(function () { return visivel(est) && res.hidden; }))) prob.push('clicar de novo no item escolhido nao devolveu a lista de sempre');
          else if (todos.getAttribute('aria-pressed') !== 'true' || win.location.search !== '') prob.push('depois de desmarcar, "Todos" nao voltou a ficar marcado ou a URL nao ficou limpa (' + win.location.search + ')');
          // 4) o botao "Todos" tira o item escolhido
          escolhido.click(); await ate(pronto(n1)); todos.click();
          if (!(await ate(function () { return visivel(est) && res.hidden; }))) prob.push('"Todos" nao tirou o item escolhido');
        }
        // 5) texto sozinho: o titulo de um item que existe
        var alvo = dados[Math.min(3, dados.length - 1)];
        campo.value = alvo.t.slice(0, 16);
        campo.dispatchEvent(new win.Event('input', { bubbles: true }));
        if (!(await ate(function () { return !res.hidden && Array.prototype.some.call(res.querySelectorAll('.news-title'), function (e) { return e.textContent === alvo.t; }); }, 3000))) prob.push('digitar "' + alvo.t.slice(0, 16) + '" nao trouxe o proprio item');
        else if (visivel(est)) prob.push('a lista de sempre continua aparecendo com texto digitado');
        // 6) nada encontrado
        campo.value = 'zzzzqxwv';
        campo.dispatchEvent(new win.Event('input', { bubbles: true }));
        if (!(await ate(function () { return !res.hidden && /Nada encontrado/.test(res.textContent) && /Nenhum resultado/.test(status.textContent); }, 3000))) prob.push('busca sem resultado nao mostra a mensagem "Nada encontrado"');
        // 7) apagar o texto devolve a lista de sempre
        campo.value = ''; campo.dispatchEvent(new win.Event('input', { bubbles: true }));
        if (!(await ate(function () { return visivel(est) && res.hidden; }))) prob.push('apagar o texto nao devolveu a lista de sempre');
        else if (win.location.search !== '') prob.push('depois de apagar o texto a URL ainda tem ' + win.location.search);
        // 8) ordem A-Z e "Ver mais" (so Reviews tem a ordem)
        var ord = raiz.querySelector('select[name="o"]');
        if (ord) {
          ord.value = 'az'; ord.dispatchEvent(new win.Event('change', { bubbles: true }));
          if (!(await ate(pronto(dados.length)))) prob.push('ordenar de A a Z: esperava ' + dados.length + ' resultados, a tela diz "' + status.textContent + '"');
          else {
            var tit = Array.prototype.map.call(res.querySelectorAll('.news-title'), function (e) { return e.textContent; });
            var ordenado = tit.every(function (t, n) { return n === 0 || win.BrubaoSecao.chave(tit[n - 1]).localeCompare(win.BrubaoSecao.chave(t), 'pt-BR', { numeric: true }) <= 0; });
            if (!ordenado) prob.push('a ordem A-Z nao esta em ordem alfabetica');
            var mais = raiz.querySelector('.secao-mais button');
            if (dados.length > 30) {
              if (!visivel(mais)) prob.push('"Ver mais" nao aparece com ' + dados.length + ' resultados');
              else { mais.click(); if (!(await ate(function () { return res.querySelectorAll('.news-card').length === Math.min(60, dados.length); }))) prob.push('"Ver mais" nao acrescentou 30 cartoes (tem ' + res.querySelectorAll('.news-card').length + ')'); }
            }
          }
          ord.value = 'recentes'; ord.dispatchEvent(new win.Event('change', { bubbles: true })); await ate(function () { return visivel(est); });
        }
        // 9) pagina aberta ja com a busca na URL (link compartilhado)
        var abrir = async function (consulta, depois) {
          var fx = document.createElement('iframe');
          fx.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
          fx.src = '/' + url + consulta;
          document.body.appendChild(fx);
          await new Promise(function (r) { fx.addEventListener('load', r, { once: true }); });
          try { await depois(fx.contentDocument, fx.contentWindow); } finally { fx.remove(); }
        };
        var subLink = ''; if (escolhido && raiz.querySelector('.secao-sub')) { var pn0 = raiz.querySelector('.secao-sub[data-pai="' + v1 + '"]'); var s0 = pn0 && pn0.querySelector('.secao-subitem:not(.vazio)'); if (s0) subLink = '&sub=' + s0.getAttribute('data-v'); }
        var consulta = escolhido ? '?' + grupoDaPagina + '=' + v1 + subLink : '?q=' + encodeURIComponent(dados[1].t.slice(0, 10));
        await abrir(consulta, async function (d2) {
          var r2 = d2.querySelector('.secao-resultados'), s2 = d2.querySelector('.busca-status');
          if (!(await ate(function () { return !r2.hidden && /^\d+/.test(s2.textContent); }, 3500))) prob.push('abrir a pagina com ' + consulta + ' nao aplicou a busca (tela: "' + s2.textContent + '")');
          else if (escolhido) {
            var esperadoLink = subLink ? dados.filter(function (it) { return ((it.f || {}).jogo || []).indexOf(v1) >= 0 && ((it.f || {}).sub || []).indexOf(subLink.slice(5)) >= 0; }).length : n1;
            if (Number(s2.textContent.match(/^\d+/)[0]) !== esperadoLink) prob.push('link compartilhado ' + consulta + ': ' + s2.textContent + ' (esperado ' + esperadoLink + ')');
            if (d2.querySelectorAll('.secao-item')[1].getAttribute('aria-pressed') !== 'true') prob.push('abrir com o item na URL nao marcou o item do menu');
          } else if (!Array.prototype.some.call(r2.querySelectorAll('.news-title'), function (e) { return e.textContent === dados[1].t; })) prob.push('link com texto na URL nao trouxe o item procurado');
        });
        // 10) URL com lixo nao quebra nada
        await abrir('?' + (grupoDaPagina || 'tag') + '=%3Cscript%3E,x/y,nao-existe&o=zzz&q=' + 'a'.repeat(300), async function (d3) {
          await espera(600);
          var f3 = d3.querySelector('.secao-form');
          if (f3 && f3.hidden) prob.push('URL com valores estranhos deixou a mini-busca escondida (quebrou)');
          if (d3.querySelectorAll('script:not([src])').length > d.querySelectorAll('script:not([src])').length) prob.push('URL com <script> criou um script na pagina');
        });
      }
      total++;
      if (prob.length) { falhas++; linhas.push(url + ' @ ' + nome + ' ' + w + 'x' + h + ': ' + prob.join(' ; ')); }
      f.remove();
    }
  }
  linhas.push('TOTAL: ' + paginas.length + ' paginas x ' + aparelhos.length + ' tamanhos = ' + total + ' combinacoes (' + interacoes + ' com interacao, ' + controlesMedidos + ' controles medidos), ' + falhas + ' com falha');
  return linhas.join('\n');
};
