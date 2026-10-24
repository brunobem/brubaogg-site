// Modelos de HTML reutilizados pelo gerador: cabecalho (com a faixa de secoes), rodape, pagina completa, cartao.
// Dependem do estado do site (abas visiveis, se ha tags), por isso recebem o contexto.
import { DOMINIO, GTA6, SOCIAIS, abas, categorias } from './config.mjs';
import { SIZES_CARTAO, SIZES_CARTAO_DESTAQUE, SIZES_CARTAO_GRANDE, SIZES_CARTAO_PEQUENO, cortar, dataCurta, dataLonga, esc, imagemDoCartao } from './util.mjs';

export function criarModelos(ctx) {
  const { icone } = ctx;

  // ---- dados que se repetem em varias paginas escritas a mao: um valor so (config.mjs), preenchido por marcadores ----
  const diaMes = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'America/Sao_Paulo' });
  const DADOS = {
    'gta6-data': dataLonga(GTA6.alvo),          // 19 de novembro de 2026
    'gta6-dia-mes': diaMes(GTA6.alvo),          // 19 de novembro
    'gta6-preload': diaMes(GTA6.preload),       // 12 de novembro
    'gta6-plataformas': GTA6.plataformas,
    'gta6-plataformas-curto': GTA6.plataformasCurto,
    'gta6-alvo': GTA6.alvo,                     // data e hora exatas da contagem regressiva (atributo data-alvo)
  };
  const dado = (nome) => DADOS[nome]; // undefined se o nome nao existe
  // modelo de texto com {nome}: usado em atributos (ex.: <meta name="description" data-modelo="GTA 6 chega em {gta6-data}.">)
  const modelo = (texto) => texto.replace(/\{([\w-]+)\}/g, (todo, nome) => (nome in DADOS ? DADOS[nome] : todo));

  // dados estruturados da home, a partir da lista de redes (config.mjs)
  function jsonLd() {
    const obj = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', '@id': `${DOMINIO}/#site`, url: `${DOMINIO}/`, name: 'BRUBAOGG', alternateName: 'Brubão Good Game', inLanguage: 'pt-BR', publisher: { '@id': `${DOMINIO}/#canal` } },
        { '@type': 'Organization', '@id': `${DOMINIO}/#canal`, name: 'BRUBAOGG', alternateName: 'Brubão Good Game', url: `${DOMINIO}/`, logo: `${DOMINIO}/assets/img/logo.png`, sameAs: SOCIAIS.map((s) => s.url) },
      ],
    };
    return `<script type="application/ld+json">
${JSON.stringify(obj, null, 2)}
</script>`;
  }

  // titulo como aparece no <title> e nas previas: sem o " | BRUBAOGG" quando fica comprido, e nunca absurdo
  const prepararTitulo = (t) => {
    if (t.endsWith(' | BRUBAOGG') && t.length > 62) t = t.slice(0, -' | BRUBAOGG'.length);
    return cortar(t, 100);
  };
  // previa de compartilhamento (Discord, WhatsApp, TikTok, Facebook...): MESMO bloco para as paginas geradas e as escritas a mao
  function social({ titulo, descricao, og, url, tipo = 'website', publicado }) {
    const imagem0 = og ?? `${DOMINIO}/assets/img/compartilhar.jpg`; // sem imagem propria: cartao padrao 1200x630 (o logo quadrado de 800 px sai cortado)
    const imagem = imagem0.startsWith('/') ? `${DOMINIO}${imagem0}` : imagem0; // imagem do proprio site (conteudo da Wiki sem video): a previa precisa do endereco inteiro
    return [
      `<meta property="og:title" content="${esc(prepararTitulo(titulo))}">`,
      `<meta property="og:description" content="${esc(cortar(descricao, 160))}">`,
      `<meta property="og:type" content="${tipo}">`,
      ...(tipo === 'article' && publicado ? [`<meta property="article:published_time" content="${esc(publicado)}">`] : []),
      '<meta property="og:site_name" content="BRUBAOGG">',
      ...(url ? [`<meta property="og:url" content="${esc(url)}">`] : []),
      '<meta property="og:locale" content="pt_BR">',
      `<meta property="og:image" content="${esc(imagem)}">`,
      ...(/i\.ytimg\.com\/vi\/[^/]+\/hqdefault\.jpg$/.test(imagem) ? ['<meta property="og:image:width" content="480">', '<meta property="og:image:height" content="360">'] : []),
      ...(/i\.ytimg\.com\/vi\/[^/]+\/maxresdefault\.jpg$/.test(imagem) ? ['<meta property="og:image:width" content="1280">', '<meta property="og:image:height" content="720">'] : []),
      ...(imagem.endsWith('/assets/img/compartilhar.jpg') ? ['<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">'] : []),
      '<meta name="twitter:card" content="summary_large_image">',
    ].join('\n');
  }

  // dados estruturados (schema.org) de uma pagina: JSON em <script type="application/ld+json">, com "<" escapado para nunca fechar o script
  const dadosEstruturados = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, String.fromCharCode(92) + 'u003c')}</script>`;
  // trilha de navegacao (Pagina inicial > Categoria > Pagina) para o Google: itens [{ nome, url }] (url absoluta; o ultimo pode ficar sem url)
  const trilha = (itens) => ({ '@type': 'BreadcrumbList', itemListElement: itens.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.nome, ...(it.url ? { item: it.url } : {}) })) });

  const redesHtml = () =>
    `<div class="social-bar">${SOCIAIS.map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.nome}" title="${s.nome}">${icone(s.icone)}</a>`).join('')}</div>`;

  function formBusca(base) {
    return `<form class="search" role="search" action="${base}busca.html" method="get" data-base="${base}">
        <svg class="s-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 1 0 4.900 14.300l5.400 5.400 1.400-1.400-5.400-5.400A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>
        <input type="search" name="q" placeholder="Buscar matérias..." aria-label="Buscar no site" maxlength="200" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
        <button type="submit" class="sr-only" tabindex="-1">Buscar</button>
        <div class="search-results" id="search-results" role="listbox" hidden></div>
        <span class="sr-only" id="search-status" role="status" aria-live="polite"></span>
      </form>`;
  }

  // Cabecalho de TODAS as paginas: marca com o nome, busca e redes e, embaixo, a faixa de secoes em texto (as mesmas abas de config.mjs, na mesma ordem; a aba de
  // categoria so aparece depois da primeira materia). A secao da pagina atual fica marcada (class "ativo"; aria-current na propria pagina). As maiusculas e a barra
  // amarela do mouse estao no style.css (secao 5). Quando as secoes NAO cabem numa linha (celular, texto aumentado), assets/js/nav.js mostra o botao "Menu", que abre o
  // painel <dialog> com todas as secoes e mais Inicio, Tags, Arquivo e Sobre e contato; ele mede o conteudo, nao o aparelho. Sem JavaScript fica so a faixa, que rola.
  // A home e linkada como "/" (o canonical dela ja e "/"): o arquivo continua sendo index.html, so o link interno muda (BL-03).
  const paraHome = (base, href) => (href === 'index.html' ? '/' : `${base}${href}`);
  function headerHtml(base, rel = '') {
    const dentroDe = (pasta) => !!pasta && rel.startsWith(`${pasta}/`);
    // a categoria pode morar na aba de outra pagina (`aba` em config.mjs: as Series ficam na Wiki): a lista e as materias dela marcam essa aba
    const secaoDe = (a) => rel === a.href || dentroDe(a.pasta) || dentroDe(a.dentro) || categorias.some((c) => ((c.lista ?? `${c.pasta}.html`) === a.href && dentroDe(c.pasta)) || (c.aba === a.href && (rel === (c.lista ?? `${c.pasta}.html`) || dentroDe(c.pasta))));
    const link = (href, nome, ativo) => `<a href="${paraHome(base, href)}"${ativo ? ` class="ativo"${rel === href ? ' aria-current="page"' : ''}` : ''}>${nome}</a>`;
    const secoes = abasVisiveis().map((a) => ({ href: a.href, nome: a.nome, ativo: secaoDe(a) }));
    const extras = [
      { href: 'index.html', nome: 'Início', ativo: rel === 'index.html' },
      ...(ctx.temTags ? [{ href: 'tags.html', nome: 'Tags', ativo: rel === 'tags.html' || rel.startsWith('tag/') }] : []),
      ...(ctx.temArquivo ? [{ href: 'arquivo.html', nome: 'Arquivo', ativo: rel === 'arquivo.html' || rel.startsWith('arquivo/') }] : []),
      { href: 'sobre.html', nome: 'Sobre e contato', ativo: rel === 'sobre.html' },
    ];
    const lis = (itens, recuo) => itens.map((it) => `${recuo}<li>${link(it.href, it.nome, it.ativo)}</li>`).join('\n');
    return `<header class="topbar">
      <a class="brand" href="/" aria-label="BRUBAOGG, página inicial"><img src="${base}assets/img/logo-96.png" alt="" width="44" height="44"> BRUBAOGG</a>
      ${formBusca(base)}
      ${redesHtml()}
    </header>
    <nav class="nav-site" aria-label="Seções do site">
      <button class="nav-menu" type="button" aria-haspopup="dialog" aria-controls="menu-painel" aria-expanded="false" hidden>${icone('menu')} Menu</button>
      <ul class="nav-site-links">
        <li><a class="nav-casa${rel === 'index.html' ? ' ativo' : ''}" href="/" aria-label="Início"${rel === 'index.html' ? ' aria-current="page"' : ''}>${icone('house')}</a></li>
${lis(secoes, '        ')}
      </ul>
    </nav>
    <dialog class="menu-painel" id="menu-painel" aria-label="Menu do site">
      <div class="menu-caixa">
        <div class="menu-topo">
          <a class="menu-marca" href="/" aria-label="BRUBAOGG, página inicial"><img src="${base}assets/img/logo-96.png" alt="" width="56" height="56"></a>
          <button class="menu-fechar" type="button" aria-label="Fechar menu" autofocus>${icone('x')}</button>
        </div>
        <ul class="menu-lista">
${lis(secoes, '          ')}
        </ul>
        <ul class="menu-lista menu-extras">
${lis(extras, '          ')}
        </ul>
      </div>
    </dialog>
    <script src="${base}assets/js/nav.js" defer></script>`;
  }

  // O rodape tem 3 colunas (marca, Navegar e Legal) em TODAS as paginas; a lista de Navegar e longa e corre em duas colunas. As paginas do MCP TikTok e do MCP YouTube (mcp-*.html, termos-*.html e privacidade-*.html)
  // continuam no ar, no mesmo endereco (estao cadastradas no TikTok e no Google Cloud), mas nenhuma pagina do site leva a elas nem a busca as mostra.
  function footerHtml(base) {
    const navegar = [{ href: 'index.html', nome: 'Início' }, ...abas.filter((a) => !a.pasta || ctx.visiveis.has(a.pasta)), ...(ctx.temTags ? [{ href: 'tags.html', nome: 'Tags' }] : []), ...(ctx.temArquivo ? [{ href: 'arquivo.html', nome: 'Arquivo' }] : []), { href: 'sobre.html', nome: 'Sobre e contato' }]
      .map((a) => `<a href="${paraHome(base, a.href)}">${a.nome}</a>`).join('\n        ');
    return `<footer class="site-footer">
    <div class="footer-scene" aria-hidden="true">
      <img class="fp fp-grupo fp-grupo-esq" src="${base}assets/img/rodape/palmeiras-grupo.webp" alt="" loading="lazy">
      <img class="fp fp-grupo fp-grupo-dir" src="${base}assets/img/rodape/palmeiras-grupo.webp" alt="" loading="lazy">
      <img class="fp fp-a" src="${base}assets/img/rodape/palmeira-a.webp" alt="" loading="lazy">
      <img class="fp fp-b" src="${base}assets/img/rodape/palmeira-b.webp" alt="" loading="lazy">
    </div>
    <div class="footer-body">
      <div class="wrap footer-grid">
        <div class="footer-col footer-brand">
          <a class="brand" href="/"><img src="${base}assets/img/logo-96.png" alt="Logo BRUBAOGG" width="44" height="44"> BRUBAOGG</a>
          <p>Notícias, reviews, lançamentos e cortes de games.</p>
          ${redesHtml()}
        </div>
        <nav class="footer-col footer-navegar" aria-label="Navegar">
          <p class="footer-titulo">Navegar</p>
          <div class="footer-links">
        ${navegar}
          </div>
        </nav>
        <nav class="footer-col" aria-label="Legal">
          <p class="footer-titulo">Legal</p>
          <a href="${base}termos.html">Termos de Serviço</a>
          <a href="${base}privacidade.html">Política de Privacidade</a>
        </nav>
      </div>
      <p class="wrap footer-copy">&copy; 2026 BRUBAOGG</p>
    </div>
  </footer>`;
  }

  // scripts: JavaScript so desta pagina (alem do busca.js, que todas carregam), por nome de arquivo em assets/js (ex.: ['compartilhar.js'])
  function pagina({ base, titulo, descricao, og, corpo, caminho, noindex = false, tipo = 'website', publicado, estruturados = [], scripts = [] }) {
    // protecao contra texto absurdo: o <title> e a descricao do Google nunca passam desses limites (texto normal nao muda)
    const previa = social({ titulo, descricao, og, url: caminho ? `${DOMINIO}/${caminho}` : undefined, tipo, publicado });
    titulo = cortar(prepararTitulo(titulo), 70); // <title>: ate 70 letras (o Google mostra uns 60); a previa de compartilhamento aceita 100
    descricao = cortar(descricao, 160);
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#302D33">
${previa}${noindex ? '\n<meta name="robots" content="noindex">' : ''}${caminho ? `\n<link rel="canonical" href="${DOMINIO}/${caminho}">` : ''}${estruturados.map((o) => `\n${dadosEstruturados(o)}`).join('')}
<link rel="icon" type="image/png" href="${base}assets/img/logo-96.png">
<link rel="stylesheet" href="${base}assets/css/style.css">
</head>
<body>
  <div class="wrap">
    <!--site:header--><!--/site:header-->

${corpo}
  </div>
  <!--site:footer--><!--/site:footer-->
  <script src="${base}assets/js/busca.js" defer></script>${scripts.map((s) => `\n  <script src="${base}assets/js/${s}" defer></script>`).join('')}
</body>
</html>
`;
  }

  // abas que aparecem: so as de categoria que tem materia publicada (as de player sempre aparecem)
  const abasVisiveis = () => abas.filter((a) => !a.pasta || ctx.visiveis.has(a.pasta));

  // o inicio de um texto em frases INTEIRAS, com ate `max` letras (nunca corta no meio de uma frase; se nem a primeira cabe, devolve vazio)
  function frasesInteiras(texto, max) {
    let saida = '';
    for (const frase of texto.split(/(?<=[.!?])\s+/)) {
      const tentativa = saida ? `${saida} ${frase}` : frase;
      if (tentativa.length > max) break;
      saida = tentativa;
    }
    return saida;
  }

  // destaque: false (cartao normal), 'pequeno' (cartao pequeno ao lado do grande nos blocos da home: igual ao normal, so a imagem pede menos pixels), true (cartao em destaque das listas, imagem ao lado do texto) ou 'grande' (cartao grande dos blocos da home, imagem em cima;
  // leva tambem o primeiro paragrafo da materia, que o CSS so mostra quando o cartao e largo)
  function cartao(m, cat, base, destaque = false) {
    const href = `${base}${cat.pasta}/${m.slug}.html`;
    const mais = destaque === 'grande' && m.corpo?.length ? frasesInteiras(m.corpo[0], 440) : '';
    return `          <a class="news-card${destaque === 'grande' ? ' grande' : destaque === true ? ' featured' : ''}" href="${href}">
            <span class="thumb">${(() => { const im = imagemDoCartao(m.id, destaque === 'grande' ? SIZES_CARTAO_GRANDE : destaque === 'pequeno' ? SIZES_CARTAO_PEQUENO : destaque === true ? SIZES_CARTAO_DESTAQUE : SIZES_CARTAO); return `<img ${im.atributos} alt="${esc(im.alt)}"`; })()} loading="lazy"></span>
            <span class="news-body">
              <span class="tag">${icone(cat.icone)} ${esc(m.rotulo ?? cat.rotulo)}</span>
              <b class="news-title">${esc(m.titulo)}</b>
              ${m.resumo ? `<span class="news-excerpt">${esc(m.resumo)}</span>` : ''}
              ${mais ? `<span class="news-mais">${esc(mais)}</span>` : ''}
              <small class="news-date">${dataCurta(m.publicado)}</small>
            </span>
          </a>`;
  }

  // pagina que leva para outro endereco (o GitHub Pages nao tem redirecionamento no servidor). O Google trata o refresh imediato como
  // redirecionamento e passa a valer o endereco do canonical.
  function redirecionamento({ para, titulo, descricao = '', imagem = '' }) {
    const destino = `/${para}`, semAncora = destino.split('#')[0]; // a ancora (#v-ID: o bloco do video numa pagina de assunto) vale no refresh; o canonical e a pagina inteira
    // os servicos de compartilhamento (Discord, WhatsApp...) nao seguem o refresh: por isso a pagina traz a previa da materia de destino
    const previa = [['og:title', cortar(titulo, 100)], ['og:description', cortar(descricao, 160)], ['og:image', imagem.startsWith('/') ? `${DOMINIO}${imagem}` : imagem]].filter(([, v]) => v)
      .map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join('\n');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cortar(titulo, 100))}</title>
<meta http-equiv="refresh" content="0; url=${destino}">
${previa}
<link rel="canonical" href="${DOMINIO}${semAncora}">
<link rel="icon" type="image/png" href="/assets/img/logo-96.png">
</head>
<body>
<p>Esta página mudou de endereço. <a href="${destino}">Clique aqui para continuar</a>.</p>
</body>
</html>
`;
  }

  return { redesHtml, formBusca, headerHtml, footerHtml, pagina, cartao, redirecionamento, social, jsonLd, dado, modelo, dadosEstruturados, trilha };
}
