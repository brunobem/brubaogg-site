// Gera as paginas de materias do site a partir de assets/data/playlists.json.
//
//  - Listas:   noticias.html, reviews.html, lancamentos.html
//  - Materias: noticias/<slug>.html, reviews/<slug>.html, lancamentos/<slug>.html
//  - Extras:   busca.html, 404.html e assets/data/busca.json (indice da busca)
//
// Titulo, data e video vem do YouTube (playlists.json). O TEXTO da materia vem de
// _conteudo/materias/<idDoVideo>.json quando existir; sem esse arquivo entra um texto FICTICIO (lorem ipsum).
// Formato do arquivo (o futuro MCP so precisa gravar isto):
//   { "titulo": "opcional, substitui o titulo do video",
//     "resumo": "1-2 frases mostradas na lista",
//     "corpo":  ["paragrafo 1", "paragrafo 2", "..."] }
//
// Por padrao SO entram no site os videos que tem arquivo de texto em _conteudo/materias/.
// Uma aba (Noticias, Reviews, Lancamentos) so aparece depois que tiver ao menos uma materia.
// Para pre-visualizar com texto ficticio (lorem ipsum): node _ferramentas/gerar-site.mjs --rascunho
// Uso: node _ferramentas/gerar-site.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // raiz do site/repositorio
const dados = path.join(site, '_conteudo', 'materias');
const cacheShorts = path.join(site, '_ferramentas', 'cache', 'shorts-cache.json');
fs.mkdirSync(dados, { recursive: true });
fs.mkdirSync(path.dirname(cacheShorts), { recursive: true });

const playlists = JSON.parse(fs.readFileSync(path.join(site, 'assets', 'data', 'playlists.json'), 'utf8'));

const RASCUNHO = process.argv.includes('--rascunho');
const DOMINIO = 'https://brubaogg.com.br';

// autor das materias (assinatura exibida na pagina; o selo "IA" deixa claro que e uma inteligencia artificial)
const AUTOR = 'Claudio';

// ---- categorias com materias ----
const categorias = [
  { pasta: 'noticias',    nome: 'Notícias',    rotulo: 'Notícia',    emoji: '📰', playlist: 'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb', desc: 'As notícias mais quentes do mundo dos games.' },
  { pasta: 'reviews',     nome: 'Reviews',     rotulo: 'Review',     emoji: '⭐', playlist: 'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp', desc: 'O Brubão joga e dá o veredito: vale a pena ou não?' },
  { pasta: 'lancamentos', nome: 'Lançamentos', rotulo: 'Lançamento', emoji: '🚀', playlist: 'PLLjQdJWDu4qk', desc: 'Os lançamentos de jogos que estão chegando.' },
];
// abas do menu de categorias (as sem materia seguem como paginas de player)
const abas = [
  { href: 'gta6.html', texto: '🌴 GTA 6', pasta: null },
  { href: 'lancamentos.html', texto: '🚀 Lançamentos', pasta: 'lancamentos' },
  { href: 'reviews.html', texto: '⭐ Reviews', pasta: 'reviews' },
  { href: 'cortes.html', texto: '✂️ Cortes', pasta: null },
  { href: 'noticias.html', texto: '📰 Notícias', pasta: 'noticias' },
  { href: 'lives.html', texto: '🔴 Lives', pasta: null },
];

// ---- texto ficticio (lorem ipsum) ----
const lorem = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
];
const resumosLorem = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
];

// ---- utilitarios ----
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const limparTitulo = (t) => t.replace(/(\s+#\w+)+\s*$/u, '').trim();
const slugify = (t) =>
  t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
   .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '') || 'materia';
const dataLonga = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
const miniatura = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

// Short (vertical) responde 200 em /shorts/ID; video normal redireciona (303). Resultado em cache.
const shortsCache = fs.existsSync(cacheShorts) ? JSON.parse(fs.readFileSync(cacheShorts, 'utf8')) : {};
async function ehShort(id) {
  if (id in shortsCache) return shortsCache[id];
  try {
    const r = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual' });
    shortsCache[id] = r.status === 200;
  } catch { shortsCache[id] = false; }
  return shortsCache[id];
}

// ---- pedacos de HTML ----
function formBusca(base) {
  return `<form class="search" role="search" data-base="${base}">
        <svg class="s-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 1 0 4.900 14.300l5.400 5.400 1.400-1.400-5.400-5.400A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>
        <input type="search" name="q" placeholder="Buscar matérias..." aria-label="Buscar no site" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
        <div class="search-results" id="search-results" role="listbox" hidden></div>
      </form>`;
}
function cabecalho(base) {
  return `<header class="topbar">
      <a class="brand" href="${base}index.html"><img src="${base}assets/img/logo.png" alt="Logo BRUBAOGG"> BRUBAOGG</a>
      ${formBusca(base)}
      <nav class="nav">
        <a href="${base}index.html#redes">Redes</a>
        <div class="dropdown">
          <button class="dd-btn" type="button" aria-haspopup="true">MCP <span aria-hidden="true">&#9662;</span></button>
          <div class="dd-menu">
            <a href="${base}mcp-tiktok.html">MCP TikTok</a>
            <a href="${base}mcp-youtube.html">MCP YouTube</a>
          </div>
        </div>
        <a href="${base}termos.html">Termos</a>
        <a href="${base}privacidade.html">Privacidade</a>
      </nav>
    </header>`;
}
function pagina({ base, titulo, descricao, og, corpo, caminho, noindex = false }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#302D33">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="BRUBAOGG">
<meta property="og:image" content="${esc(og ?? `${DOMINIO}/assets/img/logo.png`)}">
<meta name="twitter:card" content="summary_large_image">${noindex ? '\n<meta name="robots" content="noindex">' : ''}${caminho ? `\n<link rel="canonical" href="${DOMINIO}/${caminho}">` : ''}
<link rel="icon" type="image/png" href="${base}assets/img/logo.png">
<link rel="stylesheet" href="${base}assets/css/style.css">
</head>
<body>
  <div class="wrap">
    ${cabecalho(base)}

${corpo}

    <footer>&copy; 2026 BRUBAOGG</footer>
  </div>
  <script src="${base}assets/js/busca.js" defer></script>
</body>
</html>
`;
}
// abas de categoria: so mostra as que tem materia publicada (as de player sempre aparecem)
const temArquivo = (v) => fs.existsSync(path.join(dados, `${v.id}.json`));
const visiveis = new Set(categorias.filter((c) => RASCUNHO || (playlists[c.playlist] ?? []).some(temArquivo)).map((c) => c.pasta));
function chips(ativoHref) {
  return abas
    .filter((a) => !a.pasta || visiveis.has(a.pasta))
    .map((a) => `          <li><a href="${a.href}"${a.href === ativoHref ? ' class="active"' : ''}>${a.texto}</a></li>`)
    .join('\n');
}

// ---- montagem ----
const escrever = (rel, conteudo) => {
  const arq = path.join(site, rel);
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  fs.writeFileSync(arq, conteudo, 'utf8');
};

// apaga o que o gerador criou antes (assim materia removida ou aba escondida nao deixa pagina velha)
for (const c of categorias) {
  fs.rmSync(path.join(site, c.pasta), { recursive: true, force: true });
  fs.rmSync(path.join(site, `${c.pasta}.html`), { force: true });
}

let total = 0, reais = 0, aguardando = 0;
const indice = [];
for (const cat of categorias) {
  const todos = [...(playlists[cat.playlist] ?? [])].sort((a, b) => b.published.localeCompare(a.published));
  const videos = RASCUNHO ? todos : todos.filter(temArquivo);
  aguardando += todos.length - todos.filter(temArquivo).length;
  if (!videos.length) continue; // sem materia: a aba ainda nao existe
  const usados = new Set();
  const itens = [];

  videos.forEach((v, i) => {
    const arqDados = path.join(dados, `${v.id}.json`);
    const real = fs.existsSync(arqDados) ? JSON.parse(fs.readFileSync(arqDados, 'utf8')) : null;
    const titulo = limparTitulo(real?.titulo ?? v.title);
    let slug = slugify(titulo);
    if (usados.has(slug)) slug = `${slug}-${v.id.slice(0, 4).toLowerCase()}`;
    usados.add(slug);
    itens.push({
      id: v.id, titulo, slug, publicado: v.published,
      resumo: real?.resumo ?? resumosLorem[i % resumosLorem.length],
      corpo: real?.corpo ?? [lorem[i % 5], lorem[(i + 1) % 5], lorem[(i + 2) % 5], lorem[(i + 3) % 5]],
      ficticio: !real,
    });
    if (real) reais++;
  });

  for (const m of itens) m.short = await ehShort(m.id);

  // indice da busca (texto fictício não entra, para não gerar resultados falsos)
  for (const m of itens) {
    indice.push({
      t: m.titulo, d: m.ficticio ? '' : m.resumo, x: m.ficticio ? '' : m.corpo.join(' ').slice(0, 2000),
      u: `${cat.pasta}/${m.slug}.html`, c: cat.rotulo, date: m.publicado, img: miniatura(m.id),
    });
  }

  // ---- pagina da materia ----
  for (const m of itens) {
    const outras = itens.filter((x) => x.id !== m.id).slice(0, 3);
    const relacionadas = outras.length ? `
      <section class="related">
        <h2 class="section-title">Mais ${esc(cat.nome.toLowerCase())}</h2>
        <div class="news-grid">
${outras.map((o) => cartao(o, cat, '../')).join('\n')}
        </div>
      </section>` : '';
    const corpo = `    <main class="article">
      <a class="back" href="../${cat.pasta}.html">&larr; ${esc(cat.nome)}</a>
      <p class="art-meta"><span class="tag">${cat.emoji} ${esc(cat.rotulo)}</span> <time datetime="${m.publicado}">${dataLonga(m.publicado)}</time> <span class="byline"><span class="avatar" aria-hidden="true">C</span>Por <b>${AUTOR}</b> <small>IA</small></span></p>
      <h1 class="art-title">${esc(m.titulo)}</h1>
      <p class="art-lead">${esc(m.resumo)}</p>
      <div class="art-video${m.short ? ' is-short' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${m.id}" title="${esc(m.titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>
      <div class="art-body">
${m.corpo.map((p) => `        <p>${esc(p)}</p>`).join('\n')}
      </div>
      <div class="links">
        <a class="btn primary" href="https://www.youtube.com/watch?v=${m.id}" target="_blank" rel="noopener">Assistir no YouTube</a>
        <a class="btn" href="https://youtube.com/@brubaogg" target="_blank" rel="noopener">Ver o canal</a>
      </div>
${relacionadas}
    </main>`;
    escrever(`${cat.pasta}/${m.slug}.html`, pagina({
      base: '../', titulo: `${m.titulo} | BRUBAOGG`, descricao: m.resumo, og: miniatura(m.id), corpo, caminho: `${cat.pasta}/${m.slug}.html`,
      noindex: m.ficticio, // texto de exemplo nao vai para o Google
    }));
    total++;
  }

  // ---- lista da categoria ----
  const lista = `    <main>
      <section class="cat-hero">
        <h1>${cat.emoji} ${esc(cat.nome)}</h1>
        <p class="lead">${esc(cat.desc)}</p>
        <ul class="chips">
${chips(`${cat.pasta}.html`)}
        </ul>
      </section>

      <section class="news-grid">
${itens.map((m, i) => cartao(m, cat, '', i === 0)).join('\n')}
      </section>

      <div class="links">
        <a class="btn primary" href="https://www.youtube.com/playlist?list=${cat.playlist}" target="_blank" rel="noopener">Ver playlist completa no YouTube</a>
        <a class="btn" href="https://discord.gg/tQkkXMqAnU" target="_blank" rel="noopener">Entrar no Discord</a>
      </div>
    </main>`;
  escrever(`${cat.pasta}.html`, pagina({
    base: '', titulo: `${cat.nome} | BRUBAOGG`, descricao: cat.desc, og: null, corpo: lista, caminho: `${cat.pasta}.html`,
  }));
}

function cartao(m, cat, base, destaque = false) {
  return `          <a class="news-card${destaque ? ' featured' : ''}" href="${base}${cat.pasta}/${m.slug}.html">
            <span class="thumb"><img src="${miniatura(m.id)}" alt="" loading="lazy"></span>
            <span class="news-body">
              <span class="tag">${cat.emoji} ${esc(cat.rotulo)}</span>
              <b class="news-title">${esc(m.titulo)}</b>
              <span class="news-excerpt">${esc(m.resumo)}</span>
              <small class="news-date">${dataCurta(m.publicado)}</small>
            </span>
          </a>`;
}

// pagina 404 do GitHub Pages (servida em qualquer caminho, por isso usa base absoluta '/')
escrever('404.html', pagina({
  base: '/', titulo: 'Página não encontrada | BRUBAOGG', descricao: 'Página não encontrada.', og: null, noindex: true,
  corpo: `    <main>
      <section class="cat-hero">
        <h1>😵 Página não encontrada</h1>
        <p class="lead">Esse endereço não existe (ou mudou de lugar). Use a busca acima ou volte para a página inicial.</p>
      </section>
      <div class="links">
        <a class="btn primary" href="/index.html">Ir para a página inicial</a>
        ${visiveis.has('noticias') ? '<a class="btn" href="/noticias.html">Ver as notícias</a>' : '<a class="btn" href="https://youtube.com/@brubaogg" target="_blank" rel="noopener">Ver o canal no YouTube</a>'}
      </div>
    </main>`,
}));

// pagina de resultados da busca (lista de titulos; o preenchimento e feito pelo busca.js)
escrever('busca.html', pagina({
  base: '', titulo: 'Busca | BRUBAOGG', descricao: 'Busca no site do canal BRUBAOGG.', og: null, noindex: true,
  corpo: `    <main>
      <section class="cat-hero">
        <h1>🔎 Busca</h1>
        <p class="lead" id="busca-contagem" aria-live="polite"></p>
      </section>
      <ul class="result-list" id="busca-resultados"></ul>
    </main>`,
}));

// paginas fixas do site também aparecem na busca
const paginas = [
  ['gta6.html', 'GTA 6', 'Tudo sobre o GTA VI no canal e a contagem para o lançamento.'],
  ['lancamentos.html', 'Lançamentos', 'Os lançamentos de jogos que estão chegando.'],
  ['reviews.html', 'Reviews', 'O veredito do Brubão: vale a pena ou não?'],
  ['cortes.html', 'Cortes', 'Os melhores momentos das gameplays e das lives.'],
  ['noticias.html', 'Notícias', 'As notícias mais quentes do mundo dos games.'],
  ['lives.html', 'Lives', 'Todas as lives do Brubão.'],
  ['mcp-tiktok.html', 'MCP TikTok', 'Termos e privacidade do MCP TikTok.'],
  ['mcp-youtube.html', 'MCP YouTube', 'Termos e privacidade do MCP YouTube.'],
  ['termos.html', 'Termos de Serviço', 'Termos de Serviço do site.'],
  ['privacidade.html', 'Política de Privacidade', 'Política de Privacidade do site.'],
];
const existe = (u) => !['lancamentos', 'reviews', 'noticias'].includes(u.replace('.html', '')) || visiveis.has(u.replace('.html', ''));
for (const [u, t, d] of paginas.filter(([u]) => existe(u))) indice.push({ t, d, x: '', u, c: 'Página', date: '', img: '' });
fs.mkdirSync(path.join(site, 'assets', 'data'), { recursive: true });
fs.writeFileSync(path.join(site, 'assets', 'data', 'busca.json'), JSON.stringify(indice), 'utf8');

// ---- chips das paginas fixas (home e abas de player) ----
for (const [arq, ativo] of [['index.html', null], ['gta6.html', 'gta6.html'], ['cortes.html', 'cortes.html'], ['lives.html', 'lives.html']]) {
  const f = path.join(site, arq);
  if (!fs.existsSync(f)) continue;
  const html = fs.readFileSync(f, 'utf8');
  const novo = html.replace(/<ul class="chips">[\s\S]*?<\/ul>/, () => `<ul class="chips">\n${chips(ativo)}\n        </ul>`);
  if (novo !== html) fs.writeFileSync(f, novo, 'utf8');
}

// ---- sitemap.xml e robots.txt ----
const ignoradas = new Set(['_ferramentas', '_conteudo', '_marca', 'assets', 'node_modules', '.git']);
const semIndice = new Set(['404.html', 'busca.html']);
const urls = [];
(function varrer(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoradas.has(e.name)) continue;
    const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) varrer(abs, r);
    else if (e.name.endsWith('.html') && !semIndice.has(r) && !fs.readFileSync(abs, 'utf8').includes('content="noindex"')) urls.push({ r, mod: fs.statSync(abs).mtime.toISOString().slice(0, 10) });
  }
})(site, '');
urls.sort((a, b) => (a.r === 'index.html' ? -1 : b.r === 'index.html' ? 1 : a.r.localeCompare(b.r)));
const loc = (r) => (r === 'index.html' ? `${DOMINIO}/` : `${DOMINIO}/${r}`);
const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...urls.map((u) => `  <url><loc>${loc(u.r)}</loc><lastmod>${u.mod}</lastmod></url>`),
  '</urlset>',
  '',
].join('\n');
fs.writeFileSync(path.join(site, 'sitemap.xml'), sitemap, 'utf8');
fs.writeFileSync(path.join(site, 'robots.txt'), ['User-agent: *', 'Allow: /', '', `Sitemap: ${DOMINIO}/sitemap.xml`, ''].join('\n'), 'utf8');

fs.writeFileSync(cacheShorts, JSON.stringify(shortsCache, null, 1));
console.log(RASCUNHO
  ? `RASCUNHO: ${total} materias geradas (${reais} com texto real, ${total - reais} com texto ficticio). Nao publique este modo.`
  : `Materias publicadas: ${total} | aguardando texto: ${aguardando} | abas visiveis: ${[...visiveis].join(', ') || 'nenhuma'}`);
