// Fim da pagina da MATERIA (compartilhar, convite para o canal e relacionadas) pelos aparelhos da lista do Chrome DevTools, em pe e deitado. Roda no navegador, em qualquer
// pagina do site local (nao e parte do "npm run testar"; o que nao precisa de navegador esta em t-materia.mjs). Cada materia abre num iframe do tamanho da tela (mesma origem) e confere:
//  - compartilhar: o titulo e os botoes dentro da janela, WhatsApp, Telegram e "Copiar link" visiveis (este so o JavaScript mostra), "Mais opcoes" escondido (so tela de toque
//    com navigator.share), cada botao com 44 px ou mais de altura e de largura, nenhum sobre o outro e todos abaixo dos botoes de cima da pagina;
//  - clicar em "Copiar link" escreve o aviso (role="status") dentro da janela e sem empurrar o que vem depois (o espaco do aviso ja esta reservado);
//  - convite: a caixa dentro da janela, o icone, o texto e o botao dentro dela e, ate 700 px, o botao na largura da caixa; o botao com 44 px ou mais;
//  - relacionadas: de 1 a 3 cartoes dentro da janela, sem texto de cartao cortado e sem cartao saindo da area da pagina; a ordem na pagina e texto, compartilhar, convite, relacionadas;
//  - ficha de veredito (review com nota): dentro da janela, nota em destaque e legivel, nota, recomendacao e campos dentro da caixa e sem se sobrepor nem cortar o texto, entre o
//    resumo e o texto da materia, fora do indice da busca;
//  - fontes: dentro da janela, links com 44 px ou mais de altura, nome sem corte, abrindo em nova aba (target e rel), so https, depois do texto e antes dos botoes;
//  - botoes de cima: sem sobrepor, 44 px ou mais; "Comentar no video" so em materia com video e levando para #comments;
//  - pagina: sem rolagem horizontal.
// Uso: cole este arquivo no console (ou carregue por <script src>) e rode  varrerMaterias().then(console.log)  (a aba precisa estar a frente; o painel limita a ~45 s por
// chamada: rode sem esperar, guarde a promessa em window.__res e consulte depois). 1o parametro: lista de enderecos; 2o: aparelhos [['nome', largura, altura], ...] (padrao: os do
// DevTools, em pe e deitado); 3o (opcional): CSS injetado em cada iframe para testar se a varredura ACUSA um defeito de proposito (controle).
window.MATERIAS_DO_SITE = [
  'noticias/assassins-creed-black-flag-resynced.html', 'reviews/inside-vale-a-pena-jogar-o-classico-da-playdead-hoje.html',
  'lancamentos/9-jogos-indie-que-chegam-em-outubro-de-2026.html', 'gta6-novidades/gta6-atividades-secundarias.html',
  'series/resident-evil-village-ethan-e-a-opiniao-do-brubao.html', 'noticias/amazon-cancela-o-mmorpg-de-o-senhor-dos-aneis.html',
  'reviews/a-i-l-a-vale-a-pena-o-terror-brasileiro-com-ia.html', 'reviews/astro-bot-vale-a-pena-pelo-preco-nota-6-5-do-brubao.html', 'noticias/1666-amsterdam-chegou-ao-acesso-antecipado-em-25-de-agosto.html',
  'noticias/god-of-war-laufey.html', 'gta6-novidades/gta6-preco-e-pre-venda.html', 'noticias/phantom-blade-zero.html',
];
window.APARELHOS_DEVTOOLS = window.APARELHOS_DEVTOOLS || [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'],
];
window.varrerMaterias = async function (paginas, aparelhos, cssExtra) {
  var espera = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  paginas = paginas || window.MATERIAS_DO_SITE;
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
      var fimgs = Array.prototype.slice.call(d.querySelectorAll('.fachada img'));
      fimgs.forEach(function (im) { if (im.loading === 'lazy') im.loading = 'eager'; }); // miniatura preguicosa (Shorts, abaixo da dobra) so carrega ao rolar: forca para medir
      await Promise.race([Promise.all(fimgs.map(function (im) { return im.complete ? 1 : new Promise(function (r) { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); }); })), espera(4000)]);
      await espera(250);
      var vw = d.documentElement.clientWidth, prob = [];
      var rect = function (el) { var b = el.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom }; };
      var cruza = function (a, b) { return a.l < b.r - 0.5 && b.l < a.r - 0.5 && a.t < b.b - 0.5 && b.t < a.b - 0.5; };
      var dentro = function (r) { return r.l >= -0.5 && r.r <= vw + 0.5; };

      // pagina
      if (d.documentElement.scrollWidth > vw + 0.5) prob.push('rolagem horizontal de ' + (d.documentElement.scrollWidth - vw) + ' px');

      // fachada do player: cobre a caixa do video (dentro da borda de 2 px), o play fica no centro (44 px ou mais), a miniatura carregou e o iframe so nasce no clique
      var fach = d.querySelector('.fachada');
      if (d.querySelector('iframe')) prob.push('a pagina tem iframe antes do clique (o player devia nascer so no clique)');
      if (fach) {
        var cx = rect(fach.parentNode), fr = rect(fach), pl = fach.querySelector('.fachada-play') ? rect(fach.querySelector('.fachada-play')) : null, im = fach.querySelector('img');
        if (Math.abs(fr.l - cx.l) > 3 || Math.abs(fr.r - cx.r) > 3 || Math.abs(fr.t - cx.t) > 3 || Math.abs(fr.b - cx.b) > 3) prob.push('a fachada nao cobre a caixa do player');
        if (!pl) prob.push('fachada sem o botao de play');
        else {
          if (pl.r - pl.l < 43.5 || pl.b - pl.t < 43.5) prob.push('botao de play com ' + Math.round(pl.r - pl.l) + 'x' + Math.round(pl.b - pl.t) + ' px (minimo 44)');
          if (Math.abs((pl.l + pl.r) / 2 - (fr.l + fr.r) / 2) > 1.5 || Math.abs((pl.t + pl.b) / 2 - (fr.t + fr.b) / 2) > 1.5) prob.push('o botao de play nao esta no centro da fachada');
          if (pl.r - pl.l > (fr.r - fr.l) * 0.6) prob.push('o botao de play ocupa mais de 60% da largura da fachada');
        }
        if (im && (!im.complete || im.naturalWidth === 0)) prob.push('a miniatura da fachada nao carregou');
        var razao = (fr.r - fr.l) / (fr.b - fr.t), curto = fach.parentNode.classList.contains('is-short');
        if (curto ? Math.abs(razao - 9 / 16) > 0.05 : Math.abs(razao - 16 / 9) > 0.1) prob.push('proporcao da fachada ' + razao.toFixed(2) + ' (esperado ' + (curto ? '0,56 (Short)' : '1,78 (16:9)') + ')');
        if (fach.getAttribute('role') !== 'button') prob.push('a fachada nao virou botao (role) com o JavaScript');
      }

      // ficha de veredito (so review com nota): dentro da janela, cada parte dentro da caixa, dados sem sobrepor nem cortar, entre o resumo e o texto
      var ver = d.querySelector('.veredito'), lead = d.querySelector('.art-lead'), corpoMat = d.querySelector('.art-body');
      if (ver) {
        var vr = rect(ver), vn = ver.querySelector('.veredito-nota'), vb = vn ? vn.querySelector('b') : null, vrec = ver.querySelector('.veredito-rec');
        if (!dentro(vr)) prob.push('ficha de veredito passa da janela');
        if (!vb || !/^\d+(,5)?$/.test(vb.textContent.trim())) prob.push('nota da ficha ilegivel ("' + (vb ? vb.textContent : '') + '")');
        else if (parseFloat(win.getComputedStyle(vb).fontSize) < 40) prob.push('nota do veredito pequena (' + win.getComputedStyle(vb).fontSize + ')');
        Array.prototype.slice.call(ver.querySelectorAll('.veredito-titulo, .veredito-nota, .veredito-rec, dl, dt, dd')).forEach(function (e) {
          var r = rect(e); if (r.l < vr.l - 0.5 || r.r > vr.r + 0.5 || r.t < vr.t - 0.5 || r.b > vr.b + 0.5) prob.push('veredito: "' + e.textContent.trim().slice(0, 24) + '" fora da caixa');
          if (e.tagName === 'DD' && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1)) prob.push('veredito: texto de "' + e.textContent.trim().slice(0, 24) + '" cortado');
        });
        if (vn && vrec && cruza(rect(vn), rect(vrec))) prob.push('nota e recomendacao do veredito se sobrepoem');
        var celulas = Array.prototype.slice.call(ver.querySelectorAll('dl > div'));
        for (var c1 = 0; c1 < celulas.length; c1++) for (var c2 = c1 + 1; c2 < celulas.length; c2++) if (cruza(rect(celulas[c1]), rect(celulas[c2]))) prob.push('campos da ficha de veredito se sobrepoem');
        if (vrec && !vrec.querySelector('svg')) prob.push('recomendacao sem o icone');
        if (!ver.hasAttribute('data-pagefind-ignore')) prob.push('a ficha de veredito entra no indice da busca');
        // o veredito fica no fecho da materia, depois do texto e AO LADO das fontes (tela larga) ou acima delas (tela estreita)
        if (corpoMat && vr.t < rect(corpoMat).b - 0.5) prob.push('a ficha de veredito fica por cima do texto da materia');
        var fonV = d.querySelector('.fontes');
        if (fonV) {
          var fvr = rect(fonV);
          if (cruza(vr, fvr)) prob.push('o veredito e as fontes se sobrepoem');
          else if (win.matchMedia('(min-width: 761px)').matches && fvr.l < vr.r - 0.5) prob.push('em tela larga as fontes devem ficar ao lado (a direita) do veredito');
          else if (!win.matchMedia('(min-width: 761px)').matches && fvr.t < vr.b - 0.5) prob.push('em tela estreita as fontes devem ficar abaixo do veredito');
        }
      }

      // topo: categoria e tempo de leitura lado a lado, sem a assinatura antiga nem a data; fim: assinatura "Por Bruno Bem" com a data e o link do apoio de IA (alvo de 44 px)
      var metaT = d.querySelector('.art-meta');
      if (metaT) {
        var tagT = metaT.querySelector('.tag'), leit = metaT.querySelector('.leitura');
        if (metaT.querySelector('.byline, time')) prob.push('o alto da materia ainda mostra a assinatura antiga ou a data');
        if (!leit || !/^\d+ min de leitura$/.test(leit.textContent.trim())) prob.push('sem o tempo de leitura ("' + (leit ? leit.textContent.trim() : '') + '")');
        else {
          var lt = rect(leit), tg = tagT ? rect(tagT) : null;
          if (!dentro(lt)) prob.push('o tempo de leitura passa da janela');
          if (tg && cruza(tg, lt)) prob.push('o tempo de leitura se sobrepoe a categoria');
        }
      }
      var aut = d.querySelector('.autoria');
      if (!aut) prob.push('sem a assinatura no fim da materia');
      else {
        var aur = rect(aut), avt = aut.querySelector('.avatar'), lia = aut.querySelector('.autoria-ia'), txA = aut.querySelector('span:not(.avatar)');
        if (!dentro(aur)) prob.push('a assinatura passa da janela');
        if (!/Por Bruno Bem/.test(aut.textContent) || !aut.querySelector('time')) prob.push('a assinatura devia ter "Por Bruno Bem" e a data');
        if (!lia) prob.push('assinatura sem o link "Texto com apoio de IA"');
        else { var lir = rect(lia); if (lir.b - lir.t < 43.5) prob.push('link "Texto com apoio de IA" com ' + Math.round(lir.b - lir.t) + ' px de altura (minimo 44)'); if (!dentro(lir)) prob.push('o link do apoio de IA passa da janela'); if (txA && cruza(rect(txA), lir)) prob.push('o texto da assinatura e o link do apoio de IA se sobrepoem'); }
        if (avt && txA && cruza(rect(avt), rect(txA))) prob.push('o avatar se sobrepoe ao texto da assinatura');
        var fimF = d.querySelector('.fontes'); if (fimF && !d.querySelector('.assunto-pagina') && aur.t < rect(fimF).b - 0.5) prob.push('a assinatura fica por cima das fontes');
      }

      // fontes: lista com links que abrem em nova aba, cada um com 44 px ou mais de altura, depois do texto e antes dos botoes
      var fon = d.querySelector('.fontes'), botoesTopo = d.querySelector('.links');
      if (fon) {
        var fr2 = rect(fon), itens = Array.prototype.slice.call(fon.querySelectorAll('.fontes-lista a'));
        if (!dentro(fr2)) prob.push('fontes passam da janela');
        if (!itens.length) prob.push('bloco de fontes sem nenhum link');
        itens.forEach(function (a) {
          var r = rect(a), nomeF = a.textContent.replace(/\(abre em nova aba\)/, '').trim();
          if (!dentro(r) || r.r > fr2.r + 0.5) prob.push('fonte "' + nomeF + '" fora da area das fontes');
          if (r.b - r.t < 43.5) prob.push('fonte "' + nomeF + '" com ' + Math.round(r.b - r.t) + ' px de altura (minimo 44)');
          if (a.scrollWidth > a.clientWidth + 1) prob.push('nome da fonte "' + nomeF + '" cortado');
          if (a.getAttribute('target') !== '_blank' || !/noopener/.test(a.getAttribute('rel') || '')) prob.push('fonte "' + nomeF + '" sem target=_blank e rel=noopener');
          if (!/^https:\/\//.test(a.getAttribute('href') || '')) prob.push('fonte "' + nomeF + '" sem https');
        });
        for (var f1 = 0; f1 < itens.length; f1++) for (var f2 = f1 + 1; f2 < itens.length; f2++) if (cruza(rect(itens[f1]), rect(itens[f2]))) prob.push('links de fontes se sobrepoem');
        if (!fon.hasAttribute('data-pagefind-ignore')) prob.push('as fontes entram no indice da busca');
        if (corpoMat && rect(fon).t < rect(corpoMat).b - 0.5) prob.push('as fontes ficam por cima do texto da materia');
        if (botoesTopo && rect(botoesTopo).t < fr2.b - 0.5) prob.push('os botoes ficam por cima das fontes');
      }

      // botoes de cima ("Assistir no YouTube" e "Comentar no video"): lado a lado ou empilhados, sem sobrepor, 44 px ou mais
      if (botoesTopo) {
        var bt = Array.prototype.slice.call(botoesTopo.querySelectorAll('.btn')).filter(function (b) { return b.getClientRects().length > 0; });
        bt.forEach(function (b) {
          var r = rect(b), tx = b.textContent.replace(/\(abre em nova aba\)/, '').trim();
          if (!dentro(r)) prob.push('botao "' + tx + '" fora da janela');
          if (r.b - r.t < 43.5) prob.push('botao "' + tx + '" com ' + Math.round(r.b - r.t) + ' px de altura (minimo 44)');
        });
        for (var b1 = 0; b1 < bt.length; b1++) for (var b2 = b1 + 1; b2 < bt.length; b2++) if (cruza(rect(bt[b1]), rect(bt[b2]))) prob.push('botoes de cima se sobrepoem');
        var comentar = bt.filter(function (b) { return /Comentar no v/.test(b.textContent); });
        if (fach && comentar.length !== 1) prob.push('materia com video tem ' + comentar.length + ' botao(oes) "Comentar no video" (esperado 1)');
        if (!fach && comentar.length) prob.push('materia sem video tem o botao "Comentar no video"');
        if (comentar.length && !/#comments$/.test(comentar[0].getAttribute('href') || '')) prob.push('"Comentar no video" nao leva para os comentarios (#comments)');
      }

      // Shorts anexados ("Shorts desta review"): cada Short numa caixa vertical 9:16 dentro da janela, play de 44 px ou mais no centro, miniatura carregada, legenda inteira, sem sobrepor
      var shs = d.querySelector('.shorts');
      if (shs) {
        var sr = rect(shs), sitens = Array.prototype.slice.call(shs.querySelectorAll('.short-item'));
        if (!dentro(sr)) prob.push('bloco de Shorts passa da janela');
        if (!sitens.length) prob.push('bloco de Shorts sem nenhum Short');
        sitens.forEach(function (it) {
          var ir = rect(it), cx2 = it.querySelector('.art-video'), fa = it.querySelector('.fachada'), lg = it.querySelector('.short-legenda');
          if (!dentro(ir) || ir.r > sr.r + 0.5) prob.push('um Short passa da area do bloco');
          if (!cx2 || !fa) { prob.push('Short sem caixa de player ou sem fachada'); return; }
          var cr2 = rect(cx2), far = rect(fa), pl2 = fa.querySelector('.fachada-play') ? rect(fa.querySelector('.fachada-play')) : null, im2 = fa.querySelector('img');
          if (Math.abs(far.l - cr2.l) > 3 || Math.abs(far.r - cr2.r) > 3 || Math.abs(far.t - cr2.t) > 3 || Math.abs(far.b - cr2.b) > 3) prob.push('a fachada de um Short nao cobre a caixa');
          var ra = (far.r - far.l) / (far.b - far.t); if (Math.abs(ra - 9 / 16) > 0.05) prob.push('caixa de Short com proporcao ' + ra.toFixed(2) + ' (esperado 0,56)');
          if (!pl2) prob.push('fachada de Short sem play');
          else {
            if (pl2.r - pl2.l < 43.5 || pl2.b - pl2.t < 43.5) prob.push('play de Short com ' + Math.round(pl2.r - pl2.l) + 'x' + Math.round(pl2.b - pl2.t) + ' px (minimo 44)');
            if (Math.abs((pl2.l + pl2.r) / 2 - (far.l + far.r) / 2) > 1.5 || Math.abs((pl2.t + pl2.b) / 2 - (far.t + far.b) / 2) > 1.5) prob.push('o play de um Short nao esta no centro');
            if (pl2.r - pl2.l > (far.r - far.l) * 0.6) prob.push('o play de um Short ocupa mais de 60% da largura');
          }
          if (im2 && (!im2.complete || im2.naturalWidth === 0)) prob.push('a miniatura de um Short nao carregou');
          if (!lg || !lg.textContent.trim()) prob.push('Short sem legenda');
          else { var lr = rect(lg); if (lr.l < ir.l - 0.5 || lr.r > ir.r + 0.5 || lr.b > ir.b + 0.5) prob.push('legenda de Short fora do item'); if (lr.t < cr2.b - 0.5) prob.push('legenda de Short por cima da caixa'); }
          if (!/^https:\/\/www\.youtube\.com\//.test(fa.getAttribute('href') || '') || fa.getAttribute('target') !== '_blank') prob.push('link de um Short sem https do YouTube em nova aba');
          if (!/^https:\/\/www\.youtube-nocookie\.com\/embed\//.test(fa.getAttribute('data-embed') || '')) prob.push('Short sem data-embed do player');
        });
        for (var s1 = 0; s1 < sitens.length; s1++) for (var s2 = s1 + 1; s2 < sitens.length; s2++) if (cruza(rect(sitens[s1]), rect(sitens[s2]))) prob.push('Shorts se sobrepoem');
        if (!shs.hasAttribute('data-pagefind-ignore')) prob.push('os Shorts entram no indice da busca');
        var lk = d.querySelector('.links'); if (lk && rect(shs).t < rect(lk).b - 0.5) prob.push('os Shorts ficam por cima dos botoes de cima');
      }

      // pagina de assunto (varios videos sobre o mesmo fato): um bloco por video, na ordem da lista "Neste assunto"; cada bloco dentro da janela, com o player (fachada) cobrindo a caixa,
      // play de 44 px ou mais no centro, miniatura carregada, botoes de 44 px sem sobrepor; a lista com alvos de 44 px, texto inteiro e ancoras que levam ao bloco certo
      var pa = d.querySelector('.assunto-pagina');
      if (pa) {
        var blocosA = Array.prototype.slice.call(pa.querySelectorAll('section.bloco')), idxA = Array.prototype.slice.call(pa.querySelectorAll('.assunto-lista a'));
        if (blocosA.length < 2) prob.push('pagina de assunto com ' + blocosA.length + ' bloco(s) (o minimo e 2)');
        if (idxA.length !== blocosA.length) prob.push('a lista "Neste assunto" tem ' + idxA.length + ' itens e a pagina ' + blocosA.length + ' blocos');
        var navA = pa.querySelector('nav.assunto');
        if (navA) {
          if (!dentro(rect(navA))) prob.push('a lista "Neste assunto" passa da janela');
          if (!navA.hasAttribute('data-pagefind-ignore')) prob.push('a lista "Neste assunto" entra no indice da busca');
          var datasA = Array.prototype.slice.call(navA.querySelectorAll('time')).map(function (t) { return t.getAttribute('datetime'); });
          for (var dd2 = 1; dd2 < datasA.length; dd2++) if (datasA[dd2] > datasA[dd2 - 1]) { prob.push('a lista "Neste assunto" fora da ordem (do mais novo para o mais velho)'); break; }
          for (var l1 = 0; l1 < idxA.length; l1++) for (var l2 = l1 + 1; l2 < idxA.length; l2++) if (cruza(rect(idxA[l1]), rect(idxA[l2]))) prob.push('itens da lista "Neste assunto" se sobrepoem');
        } else prob.push('a pagina de assunto nao tem a lista "Neste assunto"');
        idxA.forEach(function (a1, k) {
          var r1 = rect(a1), alvoA = d.getElementById((a1.getAttribute('href') || '').slice(1));
          if (!dentro(r1)) prob.push('item da lista "Neste assunto" fora da janela');
          if (r1.b - r1.t < 43.5) prob.push('item da lista "Neste assunto" com ' + Math.round(r1.b - r1.t) + ' px de altura (minimo 44)');
          if (a1.scrollWidth > a1.clientWidth + 1) prob.push('texto de item da lista "Neste assunto" cortado');
          if (!alvoA || alvoA !== blocosA[k]) prob.push('o item ' + (k + 1) + ' da lista "Neste assunto" nao leva ao bloco ' + (k + 1));
        });
        var anteriorA = null;
        blocosA.forEach(function (b, k) {
          var br = rect(b), nb = 'bloco ' + (k + 1);
          if (!dentro(br)) prob.push(nb + ' passa da janela');
          if (anteriorA && br.t < anteriorA.b - 0.5) prob.push('blocos se sobrepoem');
          anteriorA = br;
          var tit = b.querySelector('.bloco-titulo'), fa = b.querySelector('.fachada'), cx = b.querySelector('.art-video'), split = b.querySelector('.art-split'), lkA = b.querySelector('.links');
          if (tit && (rect(tit).r > br.r + 0.5 || rect(tit).l < br.l - 0.5)) prob.push('titulo do ' + nb + ' passa da caixa do bloco');
          if (!fa || !cx) { prob.push(nb + ' sem o player (fachada)'); return; }
          var cr = rect(cx), far = rect(fa), pl = fa.querySelector('.fachada-play') ? rect(fa.querySelector('.fachada-play')) : null, img = fa.querySelector('img');
          if (Math.abs(far.l - cr.l) > 3 || Math.abs(far.r - cr.r) > 3 || Math.abs(far.t - cr.t) > 3 || Math.abs(far.b - cr.b) > 3) prob.push('a fachada do ' + nb + ' nao cobre a caixa do player');
          var curtoA = cx.classList.contains('is-short'), razaoA = (far.r - far.l) / (far.b - far.t);
          if (curtoA ? Math.abs(razaoA - 9 / 16) > 0.05 : Math.abs(razaoA - 16 / 9) > 0.1) prob.push('proporcao do player do ' + nb + ' ' + razaoA.toFixed(2) + ' (esperado ' + (curtoA ? '0,56' : '1,78') + ')');
          if (!pl) prob.push('fachada do ' + nb + ' sem o botao de play');
          else {
            if (pl.r - pl.l < 43.5 || pl.b - pl.t < 43.5) prob.push('play do ' + nb + ' com ' + Math.round(pl.r - pl.l) + 'x' + Math.round(pl.b - pl.t) + ' px (minimo 44)');
            if (Math.abs((pl.l + pl.r) / 2 - (far.l + far.r) / 2) > 1.5 || Math.abs((pl.t + pl.b) / 2 - (far.t + far.b) / 2) > 1.5) prob.push('o play do ' + nb + ' nao esta no centro da fachada');
          }
          if (img && (!img.complete || img.naturalWidth === 0)) prob.push('a miniatura do ' + nb + ' nao carregou');
          if (split) {
            var txt = split.querySelector('.art-text'), tr = txt ? rect(txt) : null;
            if (tr && !win.matchMedia('(max-width: 860px)').matches && cr.l < tr.r - 0.5) prob.push('no ' + nb + ' o player devia ficar ao lado do texto (tela larga)');
            if (tr && win.matchMedia('(max-width: 860px)').matches && cr.t < tr.b - 0.5) prob.push('no ' + nb + ' o player devia ficar abaixo do texto (tela estreita)');
          }
          if (lkA) {
            var bts = Array.prototype.slice.call(lkA.querySelectorAll('.btn')).filter(function (x) { return x.getClientRects().length > 0; });
            bts.forEach(function (x) { var rb = rect(x); if (!dentro(rb)) prob.push('botao do ' + nb + ' fora da janela'); if (rb.b - rb.t < 43.5) prob.push('botao "' + x.textContent.trim() + '" do ' + nb + ' com ' + Math.round(rb.b - rb.t) + ' px (minimo 44)'); });
            for (var q1 = 0; q1 < bts.length; q1++) for (var q2 = q1 + 1; q2 < bts.length; q2++) if (cruza(rect(bts[q1]), rect(bts[q2]))) prob.push('botoes do ' + nb + ' se sobrepoem');
          } else prob.push(nb + ' sem os botoes do video');
          Array.prototype.slice.call(b.querySelectorAll('.fontes-lista a')).forEach(function (a2) { var r2 = rect(a2); if (r2.b - r2.t < 43.5) prob.push('fonte do ' + nb + ' com ' + Math.round(r2.b - r2.t) + ' px de altura (minimo 44)'); if (!dentro(r2)) prob.push('fonte do ' + nb + ' fora da janela'); });
        });
      }

      // compartilhar
      var bloco = d.querySelector('.compartilhar'), links = d.querySelector('.links'), conv = d.querySelector('.convite'), rel = d.querySelector('.related');
      if (!bloco) prob.push('sem o bloco de compartilhar');
      else {
        var titulo = bloco.querySelector('.compartilhar-titulo'), botoes = Array.prototype.slice.call(bloco.querySelectorAll('.btn')), aviso = bloco.querySelector('.compartilhar-aviso');
        if (!dentro(rect(bloco))) prob.push('compartilhar passa da janela');
        var visiveis = botoes.filter(function (b) { return b.getClientRects().length > 0; }), nomes = visiveis.map(function (b) { return b.textContent.replace(/\(abre em nova aba\)/, '').trim(); });
        if (nomes.join('|') !== 'WhatsApp|Telegram|Copiar link') prob.push('botoes visiveis: "' + nomes.join('|') + '" (esperado WhatsApp|Telegram|Copiar link; "Mais opcoes" so aparece em tela de toque)');
        visiveis.forEach(function (b) {
          var r = rect(b);
          if (!dentro(r)) prob.push('botao "' + b.textContent.trim() + '" fora da janela');
          if (r.b - r.t < 43.5 || r.r - r.l < 43.5) prob.push('botao "' + b.textContent.trim() + '" com ' + Math.round(r.r - r.l) + 'x' + Math.round(r.b - r.t) + ' px (minimo 44)');
        });
        for (var p = 0; p < visiveis.length; p++) for (var q = p + 1; q < visiveis.length; q++) if (cruza(rect(visiveis[p]), rect(visiveis[q]))) prob.push('botoes de compartilhar se sobrepoem');
        if (titulo && visiveis.length && rect(titulo).b > rect(visiveis[0]).t + 0.5) prob.push('o titulo "Compartilhar" fica por cima dos botoes');
        if (links && rect(links).b > rect(bloco).t + 0.5) prob.push('compartilhar fica por cima dos botoes de cima da pagina');
        // clicar em Copiar link: o aviso aparece sem empurrar nada
        var copiar = bloco.querySelector('[data-copiar]');
        if (copiar && copiar.getClientRects().length) {
          var antes = d.documentElement.scrollHeight, convAntes = conv ? rect(conv).t + win.scrollY : 0;
          copiar.click(); await espera(400);
          if (!aviso || !aviso.textContent.trim()) prob.push('clicar em Copiar link nao escreveu nenhum aviso');
          else {
            var ar = rect(aviso);
            if (!dentro(ar)) prob.push('o aviso do Copiar link passa da janela');
            if (aviso.scrollHeight > aviso.clientHeight + 1) prob.push('texto do aviso cortado');
          }
          var convDepois = conv ? rect(conv).t + win.scrollY : 0;
          if (Math.abs(convDepois - convAntes) > 0.5 && aviso && aviso.getBoundingClientRect().height <= parseFloat(win.getComputedStyle(aviso).minHeight) + 0.5) prob.push('o aviso empurrou o convite ' + Math.round(convDepois - convAntes) + ' px');
          if (aviso && aviso.getBoundingClientRect().height > parseFloat(win.getComputedStyle(aviso).minHeight) + 0.5) prob.push('o aviso e maior que o espaco reservado (' + Math.round(aviso.getBoundingClientRect().height) + ' px): a pagina pula ao copiar');
        }
      }

      // convite
      if (!conv) prob.push('sem o convite para o canal');
      else {
        var cr = rect(conv), ico = conv.querySelector('.convite-ico'), texto = conv.querySelector('.convite-texto'), btn = conv.querySelector('.btn');
        if (!dentro(cr)) prob.push('convite passa da janela');
        [['icone', ico], ['texto', texto], ['botao', btn]].forEach(function (par) { var r = rect(par[1]); if (r.l < cr.l - 0.5 || r.r > cr.r + 0.5 || r.t < cr.t - 0.5 || r.b > cr.b + 0.5) prob.push('convite: ' + par[0] + ' fora da caixa'); });
        var brr = rect(btn);
        if (brr.b - brr.t < 43.5) prob.push('botao do convite com ' + Math.round(brr.b - brr.t) + ' px de altura (minimo 44)');
        if (vw <= 700 && (brr.r - brr.l) < (cr.r - cr.l) - 60) prob.push('ate 700 px o botao do convite devia ocupar a largura da caixa (' + Math.round(brr.r - brr.l) + ' de ' + Math.round(cr.r - cr.l) + ' px)');
        if (bloco && rect(conv).t < rect(bloco).b - 0.5) prob.push('convite fica por cima do compartilhar');
        if (/sub_confirmation=1/.test(btn.getAttribute('href')) === false) prob.push('o botao do convite nao abre a inscricao direta');
      }

      // relacionadas
      if (!rel) prob.push('sem relacionadas');
      else {
        var cartoes = Array.prototype.slice.call(rel.querySelectorAll('.news-card'));
        if (cartoes.length < 1 || cartoes.length > 3) prob.push(cartoes.length + ' relacionadas (esperado de 1 a 3)');
        var relR = rect(rel);
        cartoes.forEach(function (c) {
          var r = rect(c); if (r.l < relR.l - 0.5 || r.r > relR.r + 0.5 || !dentro(r)) prob.push('cartao de relacionada passa da area da pagina');
          Array.prototype.slice.call(c.querySelectorAll('.news-title, .news-excerpt')).forEach(function (t) { if (t.getClientRects().length && t.scrollHeight > t.clientHeight + 1) prob.push('texto de cartao de relacionada cortado'); });
        });
        if (conv && rect(rel).t < rect(conv).b - 0.5) prob.push('relacionadas ficam por cima do convite');
      }

      total++;
      if (prob.length) { falhas++; linhas.push(url.split('/').pop().slice(0, 34) + ' @ ' + nome + ' ' + w + 'x' + h + ': ' + Array.from(new Set(prob)).join(' ; ')); }
      f.remove();
    }
  }
  linhas.push('TOTAL: ' + paginas.length + ' materias x ' + aparelhos.length + ' tamanhos = ' + total + ' combinacoes, ' + falhas + ' com falha');
  return linhas.join('\n');
};
