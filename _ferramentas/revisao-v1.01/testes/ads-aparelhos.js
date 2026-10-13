// Varredura dos ESPACOS DE ADS pelos aparelhos da lista do Chrome DevTools (em pe e deitado). Roda no navegador, em qualquer pagina do site local (nao faz parte do
// "npm run testar"). Cada pagina abre num iframe do tamanho da tela (mesma origem) e confere:
//  - cada marcador fixo (GTA 6, Wiki, Cortes, Lives e o "depois do filtro" de cada lista): existe, aparece, cabe na janela, tem altura de 80 a 110 px (a pagina nao pula quando o
//    anuncio de verdade entrar), nao sobrepoe o que vem antes nem depois; a pagina nao ganha rolagem horizontal; na Wiki o "Em construcao" aparece e cabe;
//  - as LISTAS (Noticias, Reviews, Lancamentos): a ordem das linhas e dos marcadores e igual a uma conta de referencia feita aqui (um marcador antes da linha `primeiro` e de cada
//    `cada` depois dela, o destaque conta como uma linha, nunca no comeco nem no fim da lista, nenhum no meio de uma linha), cada marcador ocupa a linha toda e fica ENTRE as linhas.
//    Confere a lista de sempre, o resultado de uma busca com muitos resultados e, em Noticias, a lista depois de "Ver mais" (cadencia mantida e foco no primeiro cartao novo).
// Uso: carregue este arquivo (<script src>) e rode  varrerAds().then(console.log)  (todas as paginas x todos os aparelhos). Para partir em pedacos:
// varrerAds(PAGINAS_ADS.slice(0, 2)). 2o parametro (opcional): lista de aparelhos [['nome', largura, altura], ...] (padrao: os do DevTools, em pe e deitado). 3o (opcional): CSS injetado
// em cada iframe para testar se a varredura ACUSA um defeito de proposito (controle). Devolve { combinacoes, falhas, problemas: [...] }.
window.PAGINAS_ADS = [
  ['gta6.html', ['gta6-apos-contagem', 'gta6-apos-destaque', 'gta6-apos-playlist']],
  ['wiki.html', ['wiki-apos-filtro', 'wiki-antes-das-series', 'wiki-fim']],
  ['cortes.html', ['cortes-apos-abertura', 'cortes-entre-playlists', 'cortes-fim']],
  ['lives.html', ['lives-apos-abertura', 'lives-entre-playlists', 'lives-fim']],
  ['noticias.html', ['noticias-apos-filtro'], { q: 'de', maisBotao: true }],
  ['reviews.html', ['reviews-apos-filtro'], { q: 'de' }],
  ['lancamentos.html', ['lancamentos-apos-filtro'], { q: 'jogo' }],
];
window.APARELHOS_DEVTOOLS = window.APARELHOS_DEVTOOLS || [
  ['iPhone SE', 375, 667], ['iPhone 16', 393, 852], ['iPhone 16 Pro Max', 440, 956], ['Pixel 9 / Pixel 10', 412, 924], ['Pixel 9 Pro', 427, 952],
  ['Samsung Galaxy A55', 360, 800], ['Pixel 9 Pro Fold', 412, 922], ['Galaxy Z Fold 6', 412, 968], ['iPad Mini', 768, 1024], ['iPad Pro 13', 1032, 1376],
  ['Surface Pro 10', 960, 1440], ['Nest Hub Max', 1280, 800, 'fixo'],
];

window.varrerAds = async function (paginas, aparelhos, cssExtra) {
  paginas = paginas || window.PAGINAS_ADS;
  if (!aparelhos) {
    aparelhos = [];
    window.APARELHOS_DEVTOOLS.forEach((a) => {
      if (a[3] === 'fixo') { aparelhos.push([a[0], a[1], a[2]]); return; }
      aparelhos.push([a[0] + ' (em pe)', a[1], a[2]]);
      aparelhos.push([a[0] + ' (deitado)', a[2], a[1]]);
    });
  }
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const problemas = []; let combinacoes = 0, falhas = 0;

  // a lista como a pessoa ve: [ 'L3', 'ADS', 'L4', ... ] (L n = n cartoes na mesma linha) e a geometria de cada marcador
  function ler(win, grade) {
    const vistos = [], geo = [];
    let linha = null, topo = null;
    const fecha = () => { if (linha) vistos.push('L' + linha.n); linha = null; topo = null; };
    const filhos = Array.prototype.slice.call(grade.children).filter((c) => c.getClientRects().length);
    filhos.forEach((c, i) => {
      const b = c.getBoundingClientRect();
      if (c.classList.contains('ads')) { fecha(); vistos.push('ADS'); geo.push({ b, prev: filhos[i - 1] ? filhos[i - 1].getBoundingClientRect() : null, next: filhos[i + 1] ? filhos[i + 1].getBoundingClientRect() : null }); return; }
      if (!c.classList.contains('news-card')) return;
      if (topo === null || Math.abs(b.top - topo) > 2) { fecha(); linha = { n: 0 }; topo = b.top; }
      linha.n++;
    });
    fecha();
    return { vistos, geo, grade: grade.getBoundingClientRect() };
  }
  // referencia: so olha o tamanho das linhas e a regra (antes da linha `primeiro` e de cada `cada` depois dela), nunca a posicao dos marcadores
  function referencia(vistos, primeiro, cada) {
    const linhas = vistos.filter((v) => v !== 'ADS'), saida = [];
    linhas.forEach((l, i) => { if (i >= primeiro && (i - primeiro) % cada === 0) saida.push('ADS'); saida.push(l); });
    return saida;
  }
  function conferirLista(onde, win, grade, rotulo, prob) {
    const primeiro = parseInt(grade.getAttribute('data-ads-primeiro'), 10), cada = parseInt(grade.getAttribute('data-ads-cada'), 10);
    const r = ler(win, grade);
    const esperado = referencia(r.vistos, primeiro, cada);
    if (r.vistos.join(' ') !== esperado.join(' ')) prob.push(onde + ' ' + rotulo + ': marcadores fora da conta (' + primeiro + ' e a cada ' + cada + ' linhas): ficou "' + r.vistos.join(' ') + '" e devia ficar "' + esperado.join(' ') + '"');
    if (r.vistos[0] === 'ADS' || r.vistos[r.vistos.length - 1] === 'ADS') prob.push(onde + ' ' + rotulo + ': marcador no comeco ou no fim da lista');
    r.geo.forEach((g) => {
      if (g.b.width < r.grade.width - 2) prob.push(onde + ' ' + rotulo + ': marcador mais estreito que a lista (' + Math.round(g.b.width) + ' de ' + Math.round(r.grade.width) + ' px)');
      if (g.b.left < -0.5 || g.b.right > win.document.documentElement.clientWidth + 0.5) prob.push(onde + ' ' + rotulo + ': marcador fora da janela');
      if (g.b.height < 80 || g.b.height > 110) prob.push(onde + ' ' + rotulo + ': marcador com ' + Math.round(g.b.height) + ' px de altura (80 a 110)');
      if (g.prev && g.prev.bottom > g.b.top + 1) prob.push(onde + ' ' + rotulo + ': marcador sobrepoe o cartao de cima');
      if (g.next && g.next.top < g.b.bottom - 1) prob.push(onde + ' ' + rotulo + ': marcador sobrepoe o cartao de baixo');
    });
    return r;
  }

  for (const pag of paginas) {
    const url = pag[0], ids = pag[1], opc = pag[2] || {};
    for (const ap of aparelhos) {
      const nome = ap[0], w = ap[1], h = ap[2], onde = url + ' @ ' + nome + ' ' + w + 'x' + h;
      combinacoes++;
      const antes = problemas.length, prob = [];
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:' + h + 'px;border:0;visibility:hidden';
      f.src = '/' + url;
      document.body.appendChild(f);
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      const win = f.contentWindow, d = win.document;
      try { await d.fonts.ready; } catch (e) { /* segue */ }
      if (cssExtra) { const st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
      await espera(350);
      const vw = d.documentElement.clientWidth;

      // 1) marcadores fixos
      ids.forEach((id) => {
        const el = d.querySelector('[data-ads="' + id + '"]');
        if (!el) { prob.push(onde + ': falta o marcador ' + id); return; }
        if (!el.getClientRects().length) { prob.push(onde + ': marcador ' + id + ' nao aparece'); return; }
        const b = el.getBoundingClientRect();
        if (b.left < -0.5 || b.right > vw + 0.5) prob.push(onde + ': ' + id + ' fora da janela');
        if (b.height < 80 || b.height > 110) prob.push(onde + ': ' + id + ' com ' + Math.round(b.height) + ' px de altura (80 a 110)');
        if (b.width < Math.min(vw, 300) * 0.6) prob.push(onde + ': ' + id + ' muito estreito (' + Math.round(b.width) + ' px)');
        let p = el.previousElementSibling; while (p && !p.getClientRects().length) p = p.previousElementSibling;
        let n = el.nextElementSibling; while (n && (!n.getClientRects().length || /^(SCRIPT|TEMPLATE)$/.test(n.tagName))) n = n.nextElementSibling;
        if (p && p.getBoundingClientRect().bottom > b.top + 1) prob.push(onde + ': ' + id + ' sobrepoe o que vem antes');
        if (n && n.getBoundingClientRect().top < b.bottom - 1) prob.push(onde + ': ' + id + ' sobrepoe o que vem depois');
      });
      if (d.documentElement.scrollWidth > vw + 1) prob.push(onde + ': rolagem horizontal na pagina (' + d.documentElement.scrollWidth + ' > ' + vw + ')');
      if (url === 'wiki.html') {
        const bv = d.querySelector('.bloco-vazio');
        if (!bv || !bv.getClientRects().length) prob.push(onde + ': o componente "Em construcao" nao aparece');
        else { const b = bv.getBoundingClientRect(); if (b.left < -0.5 || b.right > vw + 0.5) prob.push(onde + ': "Em construcao" fora da janela'); if (!bv.querySelector('svg') || !/Em constru/.test(bv.textContent)) prob.push(onde + ': "Em construcao" sem icone ou sem titulo'); }
      }

      // 2) listas
      const estatica = d.querySelector('[data-lista][data-ads-cada]');
      if (estatica) {
        const r0 = conferirLista(onde, win, estatica, 'lista de sempre', prob);
        if (!r0.vistos.length) prob.push(onde + ': a lista de sempre esta vazia');
        // 2b) busca com muitos resultados
        const campo = d.querySelector('.secao-form input[name="q"]');
        if (campo && opc.q) {
          campo.focus(); campo.value = opc.q; campo.dispatchEvent(new win.Event('input', { bubbles: true }));
          let resultado = null;
          for (let t = 0; t < 40 && !resultado; t++) { await espera(150); const g = d.querySelector('.secao-resultados'); if (g && g.getClientRects().length && g.querySelector('.news-card')) resultado = g; }
          if (!resultado) prob.push(onde + ': a busca por "' + opc.q + '" nao trouxe cartoes');
          else {
            await espera(250);
            conferirLista(onde, win, resultado, 'resultado da busca "' + opc.q + '"', prob);
            if (!d.querySelector('.secao-form ~ .ads[data-ads$="apos-filtro"]')) prob.push(onde + ': o marcador de depois do filtro sumiu com a busca');
          }
          campo.value = ''; campo.dispatchEvent(new win.Event('input', { bubbles: true })); await espera(500);
        }
        // 2c) "Ver mais" (so Noticias): a cadencia continua e o foco vai para o primeiro cartao novo
        const botao = d.querySelector('button[data-colecao]');
        if (opc.maisBotao && botao && !botao.hidden && ap[1] >= 360) {
          const antesDe = estatica.children.length;
          botao.click();
          let ok = false;
          for (let t = 0; t < 40 && !ok; t++) { await espera(150); ok = estatica.querySelectorAll('.news-card').length > 30; }
          if (!ok) prob.push(onde + ': "Ver mais" nao acrescentou cartoes');
          else {
            await espera(300);
            conferirLista(onde, win, estatica, 'lista depois de "Ver mais"', prob);
            const foco = d.activeElement, cartaoFoco = foco && foco.closest ? foco.closest('.news-card') : null;
            if (!cartaoFoco || Array.prototype.indexOf.call(estatica.children, cartaoFoco) < antesDe) prob.push(onde + ': depois de "Ver mais" o foco nao foi para o primeiro cartao novo');
          }
        }
      }
      if (prob.length) falhas++;
      prob.forEach((p) => problemas.push(p));
      f.remove();
      if (problemas.length - antes > 0 && problemas.length > 60) break;
    }
  }
  // problemas iguais em tamanhos diferentes viram um so, com a contagem (saida pequena)
  const grupos = {};
  problemas.forEach((p) => { const k = p.replace(/^.*? @ .*? \d+x\d+/, '').replace(/^: /, '').replace(/\d+ px/g, 'N px'); (grupos[k] = grupos[k] || []).push(p.split(' @ ')[0] + ' @ ' + (p.split(' @ ')[1] || '').split(':')[0]); });
  const resumo = Object.keys(grupos).slice(0, 25).map((k) => grupos[k].length + 'x ' + k.slice(0, 170) + ' [' + grupos[k].slice(0, 2).join(' | ') + ']');
  return { combinacoes, falhas, nProblemas: problemas.length, problemas: resumo };
};
