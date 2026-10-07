// Modelos de HTML reutilizados pelo gerador: cabecalho, rodape, pagina completa, cartao, chips das abas.
// Dependem do estado do site (abas visiveis, se ha tags), por isso recebem o contexto.
import { DOMINIO, GTA6, SOCIAIS, abas } from './config.mjs';
import { cortar, dataCurta, dataLonga, esc, miniatura } from './util.mjs';

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
    const imagem = og ?? `${DOMINIO}/assets/img/compartilhar.jpg`; // sem imagem propria: cartao padrao 1200x630 (o logo quadrado de 800 px sai cortado)
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

  function headerHtml(base) {
    return `<header class="topbar">
      <a class="brand" href="${base}index.html"><img src="${base}assets/img/logo-96.png" alt="Logo BRUBAOGG" width="44" height="44"> BRUBAOGG</a>
      ${formBusca(base)}
      ${redesHtml()}
    </header>`;
  }

  function footerHtml(base) {
    const navegar = [{ href: 'index.html', nome: 'Início' }, ...abas.filter((a) => !a.pasta || ctx.visiveis.has(a.pasta)), ...(ctx.temTags ? [{ href: 'tags.html', nome: 'Tags' }] : []), ...(ctx.temArquivo ? [{ href: 'arquivo.html', nome: 'Arquivo' }] : [])]
      .map((a) => `<a href="${base}${a.href}">${a.nome}</a>`).join('\n        ');
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
          <a class="brand" href="${base}index.html"><img src="${base}assets/img/logo-96.png" alt="Logo BRUBAOGG" width="44" height="44"> BRUBAOGG</a>
          <p>Notícias, reviews, lançamentos e cortes de games.</p>
          ${redesHtml()}
        </div>
        <nav class="footer-col" aria-label="Navegar">
          <p class="footer-titulo">Navegar</p>
        ${navegar}
        </nav>
        <nav class="footer-col" aria-label="Ferramentas">
          <p class="footer-titulo">Ferramentas</p>
          <a href="${base}mcp-tiktok.html">MCP TikTok</a>
          <a href="${base}mcp-youtube.html">MCP YouTube</a>
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

  function pagina({ base, titulo, descricao, og, corpo, caminho, noindex = false, tipo = 'website', publicado, estruturados = [] }) {
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
  <script src="${base}assets/js/busca.js" defer></script>
</body>
</html>
`;
  }

  // chips das abas de categoria: so mostra as que tem materia publicada (as de player sempre aparecem)
  function chips(ativoHref) {
    return abas
      .filter((a) => !a.pasta || ctx.visiveis.has(a.pasta))
      .map((a) => `          <li><a href="${a.href}"${a.href === ativoHref ? ' class="active"' : ''}>${icone(a.icone)} ${a.nome}</a></li>`)
      .join('\n');
  }

  function cartao(m, cat, base, destaque = false) {
    const href = `${base}${cat.pasta}/${m.slug}.html`;
    return `          <a class="news-card${destaque ? ' featured' : ''}" href="${href}">
            <span class="thumb"><img src="${miniatura(m.id)}" alt="" loading="lazy"></span>
            <span class="news-body">
              <span class="tag">${icone(cat.icone)} ${esc(cat.rotulo)}</span>
              <b class="news-title">${esc(m.titulo)}</b>
              ${m.resumo ? `<span class="news-excerpt">${esc(m.resumo)}</span>` : ''}
              <small class="news-date">${dataCurta(m.publicado)}</small>
            </span>
          </a>`;
  }

  // pagina que leva para outro endereco (o GitHub Pages nao tem redirecionamento no servidor). O Google trata o refresh imediato como
  // redirecionamento e passa a valer o endereco do canonical.
  function redirecionamento({ para, titulo, descricao = '', imagem = '' }) {
    const destino = `/${para}`;
    // os servicos de compartilhamento (Discord, WhatsApp...) nao seguem o refresh: por isso a pagina traz a previa da materia de destino
    const previa = [['og:title', cortar(titulo, 100)], ['og:description', cortar(descricao, 160)], ['og:image', imagem]].filter(([, v]) => v)
      .map(([k, v]) => `<meta property="${k}" content="${esc(v)}">`).join('\n');
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(cortar(titulo, 100))}</title>
<meta http-equiv="refresh" content="0; url=${destino}">
${previa}
<link rel="canonical" href="${DOMINIO}${destino}">
<link rel="icon" type="image/png" href="/assets/img/logo-96.png">
</head>
<body>
<p>Esta página mudou de endereço. <a href="${destino}">Clique aqui para continuar</a>.</p>
</body>
</html>
`;
  }

  return { redesHtml, formBusca, headerHtml, footerHtml, pagina, chips, cartao, redirecionamento, social, jsonLd, dado, modelo, dadosEstruturados, trilha };
}
