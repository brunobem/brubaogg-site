// Varredura da TIPOGRAFIA em todos os tipos de pagina. Roda no navegador, em qualquer pagina do site local (nao faz parte do "npm run testar"). Cada pagina abre num iframe
// (mesma origem) e, para cada pedaco de texto que aparece na tela, le a fonte que o navegador USOU (getComputedStyle), nao a que o CSS pede. Regra do site:
//  - titulos (h1 a h6) e rotulos curtos de interface (selos, kickers, botoes, menu) em Lilita One;
//  - todo o resto do texto (paragrafos, listas, campos, legendas) em Inter;
//  - nenhuma outra fonte (nem a padrao do navegador), e as duas familias precisam ter CARREGADO (Inter e Lilita One com pelo menos uma face "loaded").
// Uso: carregue este arquivo (<script src>) e rode  fontesPaginas().then(console.log)  ou  window.fontesPaginas().then(function (r) { window.__fontes = r; })
// 1o parametro (opcional): lista de paginas ['index.html', ...] (padrao: PAGINAS_DE_FONTES). 2o (opcional): CSS injetado em cada iframe para testar se a varredura ACUSA um
// defeito de proposito (controle; ex.: 'p { font-family: Georgia }'). 3o (opcional): larguras (padrao: 1280 e 375).
// Devolve { paginas, textos, nProblemas, problemas: [...], rotulosEmLilita: { 'tag.classe': { n, amostra } }, carregou }. `nProblemas` 0 = tudo certo. rotulosEmLilita e o inventario
// de tudo que NAO e h1-h6 e esta em Lilita (titulos de cartao, selos, menu, botoes...); ROTULOS_PERMITIDOS abaixo e a lista dos conhecidos: quem nao esta nela vira problema.
window.PAGINAS_DE_FONTES = [
  'index.html', 'noticias.html', 'reviews.html', 'lancamentos.html', 'gta6.html', 'cortes.html', 'lives.html', 'wiki.html', 'sobre.html', 'termos.html', 'privacidade.html',
  'tags.html', 'arquivo.html', 'busca.html', '404.html', 'series.html', 'tag/resident-evil.html', 'arquivo/2026-10.html', 'wiki/resident-evil.html', 'wiki/gta.html',
  'noticias/amazon-cancela-o-mmorpg-de-o-senhor-dos-aneis.html', 'reviews/inside-vale-a-pena-jogar-o-classico-da-playdead-hoje.html',
  'lancamentos/9-jogos-indie-que-chegam-em-outubro-de-2026.html', 'gta6-novidades/gta6-atividades-secundarias.html', 'noticias/god-of-war-laufey.html',
  'series/resident-evil-village-ethan-e-a-opiniao-do-brubao.html', 'mcp-tiktok.html',
];
// elementos que NAO sao h1-h6 mas ficam em Lilita de proposito (titulo de cartao, rotulo curto, menu, botao, contador): "tag.classe" como aparece em rotulosEmLilita (inventario
// conferido a mao em 2026-10-12 sobre as 27 paginas). Elemento novo em Lilita que nao esteja aqui vira problema: o texto corrido, as listas e os campos sao Inter.
window.ROTULOS_PERMITIDOS = window.ROTULOS_PERMITIDOS || [
  'b.news-title', 'b.car-titulo', 'a<h3.gd-title', 'a<h3.wiki-jogo-nome', 'span<h2.gta-title', 'small<h2.section-title', 'a<li<ul.arquivo-lista', 'a<li<ul.tag-cloud', 'span<a<li<ul.tag-cloud',
  'span.tag', 'span.wiki-rot', 'span.secao-rot', 'span.avatar', 'span.car-cta', 'span<div.ticker', 'div.ads', 'span.sr-only',
  'a<li<ul.nav-site-links', 'a.ativo', 'button.nav-menu', 'a.brand', 'p.footer-titulo', 'a<nav.arquivo-nav',
  'a.btn', 'button.btn', 'a.feed-all', 'a.ir-video', 'button.secao-item', 'small<button.secao-item', 'button.busca-chip',
  'p.gta-kicker', 'p.cobertura-kicker', 'b<div.unit', 'b<p.convite-texto', 'b<div.bloco-vazio', 'b<span<p.aviso-spoiler',
  'b<p.veredito-nota', 'p.veredito-rec', 'dt<div<dl.veredito-dados', 'dt<div.veredito-largo',
];

window.fontesPaginas = async function (paginas, cssExtra, larguras) {
  paginas = paginas || window.PAGINAS_DE_FONTES;
  larguras = larguras || [1280, 375];
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));
  const problemas = [], rotulos = {}, carregou = {};
  let textos = 0, vistas = 0;
  const primeira = (css) => String(css || '').split(',')[0].trim().replace(/^["']|["']$/g, '');
  // "tag.classe"; sem classe propria, sobe pelos pais ate achar um com classe: "a<li<ul.nav-site-links" (para um <a> ou <b> solto nao esconder todos os outros iguais)
  const nome1 = (el) => el.tagName.toLowerCase() + (el.classList && el.classList.length ? '.' + el.classList[0] : '');
  const sinal = (el) => { let s = nome1(el), p = el, i = 0; while (!(p.classList && p.classList.length) && p.parentElement && i < 4) { p = p.parentElement; s += '<' + nome1(p); i++; } return s; };
  const ignorados = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|SVG|PATH|HEAD|TITLE|META|LINK)$/i;
  for (const url of paginas) {
    for (const w of larguras) {
      const f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;left:0;top:0;width:' + w + 'px;height:900px;border:0;visibility:hidden';
      f.src = '/' + url;
      document.body.appendChild(f);
      await new Promise((r) => f.addEventListener('load', r, { once: true }));
      const win = f.contentWindow, d = win.document;
      try { await d.fonts.ready; } catch (e) { /* segue */ }
      if (cssExtra) { const st = d.createElement('style'); st.textContent = cssExtra; d.head.appendChild(st); }
      await espera(300);
      vistas++;
      const onde = url + '@' + w;
      // as duas familias carregaram?
      const faces = { Inter: 0, 'Lilita One': 0 };
      d.fonts.forEach((ff) => { const nome = primeira(ff.family); if (nome in faces && ff.status === 'loaded') faces[nome]++; });
      for (const nome of Object.keys(faces)) { carregou[nome] = (carregou[nome] || 0) + (faces[nome] ? 1 : 0); if (!faces[nome]) problemas.push(onde + ': a fonte ' + nome + ' nao carregou (nenhuma face "loaded")'); }
      for (const el of d.body.querySelectorAll('*')) {
        if (ignorados.test(el.tagName) || el.closest('svg, template, noscript, script, style')) continue;
        let proprio = '';
        for (const n of el.childNodes) if (n.nodeType === 3) proprio += n.nodeValue;
        proprio = proprio.replace(/\s+/g, ' ').trim();
        // campo de busca: o texto fica no valor/placeholder
        const ehCampo = /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName);
        if (!proprio && !ehCampo) continue;
        if (!el.getClientRects().length) continue; // nao aparece na tela
        const cs = win.getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') continue;
        textos++;
        const fam = primeira(cs.fontFamily), tag = el.tagName;
        if (fam !== 'Inter' && fam !== 'Lilita One') { problemas.push(onde + ': <' + sinal(el) + '> usa "' + fam + '" (so Inter e Lilita One): ' + (proprio || el.getAttribute('placeholder') || '').slice(0, 40)); continue; }
        if (/^H[1-6]$/.test(tag)) { if (fam !== 'Lilita One') problemas.push(onde + ': titulo <' + sinal(el) + '> em ' + fam + ' (devia ser Lilita One): ' + proprio.slice(0, 40)); continue; }
        if (fam === 'Lilita One') {
          const sig = sinal(el);
          if (proprio.length > 140) problemas.push(onde + ': texto de ' + proprio.length + ' caracteres em Lilita One (<' + sig + '>): ' + proprio.slice(0, 40) + '...');
          // qualquer elemento que nao seja h1-h6 e esteja em Lilita precisa ser um titulo/rotulo CONHECIDO (ROTULOS_PERMITIDOS): o resto do texto e Inter
          if (!rotulos[sig]) rotulos[sig] = { n: 0, amostra: (proprio || el.getAttribute('placeholder') || '').slice(0, 40) };
          rotulos[sig].n++;
          if (window.ROTULOS_PERMITIDOS.indexOf(sig) < 0 && !/^(h1|h2|h3|h4|h5|h6)/.test(sig)) problemas.push(onde + ': <' + sig + '> esta em Lilita One e nao e titulo nem rotulo conhecido (ROTULOS_PERMITIDOS): ' + proprio.slice(0, 40));
        } else if (fam === 'Inter' && (el.closest && el.closest('h1, h2, h3, h4, h5, h6')) && !/^H[1-6]$/.test(tag)) {
          problemas.push(onde + ': texto dentro de um titulo em Inter (<' + sinal(el) + '>): ' + proprio.slice(0, 40));
        }
      }
      f.remove();
    }
  }
  // problemas iguais em paginas diferentes viram um so, com a contagem (a saida fica pequena)
  const grupos = {};
  problemas.forEach((p) => { const k = p.replace(/^[^:]*: /, ''); (grupos[k] = grupos[k] || []).push(p.split(': ')[0]); });
  const resumo = Object.keys(grupos).slice(0, 40).map((k) => grupos[k].length + 'x ' + k + ' [' + grupos[k].slice(0, 2).join(', ') + ']');
  return { paginas: vistas, textos, nProblemas: problemas.length, problemas: resumo, rotulosEmLilita: rotulos, carregou };
};
