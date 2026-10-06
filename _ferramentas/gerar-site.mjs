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
// Arquivo com "status": "rascunho" NAO publica (fica aguardando a sua aprovacao: npm run aprovar -- ID).
// Por padrao videos SEM materia nao aparecem no site (nem pagina, nem cartao, nem busca). Para ve-los como paginas so com o player: --com-videos-sem-texto
// Para testar os RASCUNHOS como se fossem materias (sem aprovar): node _ferramentas/gerar-site.mjs --com-rascunhos  (npm run previa)
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
const COM_RASCUNHOS = process.argv.includes('--com-rascunhos');
const SO_COM_MATERIA = !process.argv.includes('--com-videos-sem-texto');
const DOMINIO = 'https://brubaogg.com.br';

// ---- tags: _conteudo/tags.json (opcional) unifica variacoes de nome e pode apontar a tag para uma pagina propria ----
// { "gta-6": { "nome": "GTA 6", "alias": ["GTA VI"], "pagina": "gta6.html", "descricao": "texto opcional da pagina da tag" } }
const tagsCfg = (() => {
  const f = path.join(site, '_conteudo', 'tags.json');
  return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
})();
const aliasParaSlug = new Map();
for (const [slug, cfg] of Object.entries(tagsCfg)) {
  aliasParaSlug.set(slugify(slug), slug);
  aliasParaSlug.set(slugify(cfg.nome ?? slug), slug);
  for (const a of cfg.alias ?? []) aliasParaSlug.set(slugify(a), slug);
}
function resolverTags(lista = []) {
  const vistos = new Set();
  const out = [];
  const adicionar = (slug, nomeOriginal) => {
    if (vistos.has(slug)) return;
    vistos.add(slug);
    out.push({ slug, nome: tagsCfg[slug]?.nome ?? nomeOriginal ?? slug });
    if (tagsCfg[slug]?.pai) adicionar(tagsCfg[slug].pai); // jogo especifico tambem entra na franquia
  };
  for (const nome of lista) {
    const s0 = slugify(String(nome));
    if (!s0) continue;
    adicionar(aliasParaSlug.get(s0) ?? s0, String(nome).trim());
  }
  return out;
}
const tagPage = (slug) => tagsCfg[slug]?.pagina ?? `tag/${slug}.html`; // endereco relativo a raiz do site
const contagemTags = new Map(); // slug -> quantas materias (calculado antes de gerar, para decidir quais tags tem pagina)
const temPaginaTag = (slug) => !!tagsCfg[slug]?.pagina || !!tagsCfg[slug]?.descricao || (contagemTags.get(slug) ?? 0) >= 2;
const porTag = new Map(); // slug -> { slug, nome, itens: [{ m, cat }] }
let temTags = false;

// autor das materias (assinatura exibida na pagina; o selo "IA" deixa claro que e uma inteligencia artificial)
const AUTOR = 'Claudio';

// ---- categorias com materias ----
const categorias = [
  { pasta: 'noticias',    nome: 'Notícias',    rotulo: 'Notícia',    icone: 'newspaper', playlist: 'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb', desc: 'As notícias mais quentes do mundo dos games.', meta: 'As notícias mais quentes do mundo dos games, com vídeo e resumo em texto, direto do canal BRUBAOGG.' },
  { pasta: 'reviews',     nome: 'Reviews',     rotulo: 'Review',     icone: 'star', playlist: 'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp', desc: 'O Brubão joga e dá o veredito: vale a pena ou não?', meta: 'Reviews do Brubão: ele joga, conta o que achou e dá o veredito se o jogo vale a pena ou não.' },
  { pasta: 'lancamentos', nome: 'Lançamentos', rotulo: 'Lançamento', icone: 'rocket', playlist: 'PLLjQdJWDu4qk', desc: 'Os lançamentos de jogos que estão chegando.', meta: 'Os principais lançamentos de jogos de cada mês, em lista, direto do canal BRUBAOGG.' },
  // playlist "GTA 6 NOVIDADES": as matérias moram em /gta6-novidades/ e a lista e a pagina fixa gta6.html (nao e gerada, nao pode mudar de endereco)
  { pasta: 'gta6-novidades', nome: 'GTA 6 Novidades', nomeCurto: 'GTA 6', rotulo: 'GTA 6', icone: 'tree-palm', playlist: 'PLYgWUqxV5Uao', lista: 'gta6.html', relacionados: 'Mais novidades de GTA 6', desc: 'As últimas novidades de GTA 6.' },
];
// abas do menu de categorias (as sem materia seguem como paginas de player)
const abas = [
  { href: 'gta6.html', nome: 'GTA 6', icone: 'tree-palm', pasta: null },
  { href: 'lancamentos.html', nome: 'Lançamentos', icone: 'rocket', pasta: 'lancamentos' },
  { href: 'reviews.html', nome: 'Reviews', icone: 'star', pasta: 'reviews' },
  { href: 'cortes.html', nome: 'Cortes', icone: 'scissors', pasta: null },
  { href: 'noticias.html', nome: 'Notícias', icone: 'newspaper', pasta: 'noticias' },
  { href: 'lives.html', nome: 'Lives', icone: 'radio', pasta: null },
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
function slugify(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 70).replace(/-+$/g, '') || 'materia';
}
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

// ---- icones: cada arquivo de assets/icones/<nome>.svg vira SVG embutido (herda a cor do texto) ----
const _icones = {};
function icone(nome) {
  if (_icones[nome]) return _icones[nome];
  const f = path.join(site, 'assets', 'icones', `${nome}.svg`);
  if (!fs.existsSync(f)) throw new Error(`Icone nao encontrado: assets/icones/${nome}.svg`);
  const raw = fs.readFileSync(f, 'utf8').replace(/<!--[\s\S]*?-->/g, '').replace(/<title>[\s\S]*?<\/title>/g, '');
  const m = raw.match(/<svg([^>]*)>([\s\S]*?)<\/svg>/);
  if (!m) throw new Error(`assets/icones/${nome}.svg nao e um SVG valido`);
  const viewBox = (m[1].match(/viewBox="([^"]+)"/) ?? [])[1] ?? '0 0 24 24';
  const linha = /\bstroke="/.test(m[1]); // estilo Lucide (contorno) ou Simple Icons (preenchido)
  const interno = m[2].replace(/\s+/g, ' ').trim();
  return (_icones[nome] = `<svg class="ico ${linha ? 'ico-linha' : 'ico-cheio'}" viewBox="${viewBox}" aria-hidden="true" focusable="false">${interno}</svg>`);
}

const SOCIAIS = [
  { nome: 'YouTube', icone: 'youtube', url: 'https://youtube.com/@brubaogg', handle: '@brubaogg' },
  { nome: 'TikTok', icone: 'tiktok', url: 'https://www.tiktok.com/@brubaogameplay', handle: '@brubaogameplay' },
  { nome: 'Instagram', icone: 'instagram', url: 'https://www.instagram.com/brubaogg', handle: '@brubaogg' },
  { nome: 'Twitch', icone: 'twitch', url: 'https://www.twitch.tv/brubaogg', handle: '@brubaogg' },
  { nome: 'Discord', icone: 'discord', url: 'https://discord.gg/tQkkXMqAnU', handle: 'Comunidade' },
];

const redesHtml = () =>
  `<div class="social-bar">${SOCIAIS.map((s) => `<a href="${s.url}" target="_blank" rel="noopener" aria-label="${s.nome}" title="${s.nome}">${icone(s.icone)}</a>`).join('')}</div>`;

// ---- pedacos de HTML ----
function formBusca(base) {
  return `<form class="search" role="search" data-base="${base}">
        <svg class="s-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 2a8 8 0 1 0 4.900 14.300l5.400 5.400 1.400-1.400-5.400-5.400A8 8 0 0 0 10 2zm0 2a6 6 0 1 1 0 12 6 6 0 0 1 0-12z"/></svg>
        <input type="search" name="q" placeholder="Buscar matérias..." aria-label="Buscar no site" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="search-results" aria-autocomplete="list">
        <div class="search-results" id="search-results" role="listbox" hidden></div>
      </form>`;
}
function headerHtml(base) {
  return `<header class="topbar">
      <a class="brand" href="${base}index.html"><img src="${base}assets/img/logo.png" alt="Logo BRUBAOGG"> BRUBAOGG</a>
      ${formBusca(base)}
      ${redesHtml()}
    </header>`;
}
function footerHtml(base) {
  const navegar = [{ href: 'index.html', nome: 'Início' }, ...abas.filter((a) => !a.pasta || visiveis.has(a.pasta)), ...(temTags ? [{ href: 'tags.html', nome: 'Tags' }] : [])]
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
          <a class="brand" href="${base}index.html"><img src="${base}assets/img/logo.png" alt="Logo BRUBAOGG"> BRUBAOGG</a>
          <p>Notícias, reviews, lançamentos e cortes de games.</p>
          ${redesHtml()}
        </div>
        <nav class="footer-col" aria-label="Navegar">
          <h3>Navegar</h3>
        ${navegar}
        </nav>
        <nav class="footer-col" aria-label="Ferramentas">
          <h3>Ferramentas</h3>
          <a href="${base}mcp-tiktok.html">MCP TikTok</a>
          <a href="${base}mcp-youtube.html">MCP YouTube</a>
        </nav>
        <nav class="footer-col" aria-label="Legal">
          <h3>Legal</h3>
          <a href="${base}termos.html">Termos de Serviço</a>
          <a href="${base}privacidade.html">Política de Privacidade</a>
        </nav>
      </div>
      <p class="wrap footer-copy">&copy; 2026 BRUBAOGG</p>
    </div>
  </footer>`;
}
function pagina({ base, titulo, descricao, og, corpo, caminho, noindex = false }) {
  if (titulo.endsWith(' | BRUBAOGG') && titulo.length > 62) titulo = titulo.slice(0, -' | BRUBAOGG'.length);
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
    <!--site:header--><!--/site:header-->

${corpo}
  </div>
  <!--site:footer--><!--/site:footer-->
  <script src="${base}assets/js/busca.js" defer></script>
</body>
</html>
`;
}
// abas de categoria: so mostra as que tem materia publicada (as de player sempre aparecem)
function lerMateria(id) {
  const f = path.join(dados, `${id}.json`);
  if (!fs.existsSync(f)) return null;
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (e) { throw new Error(`_conteudo/materias/${id}.json nao e um JSON valido: ${e.message}`); }
}
// publica so se o arquivo existe e NAO esta marcado como "status": "rascunho"
const temArquivo = (v) => { const m = lerMateria(v.id); return !!m && (COM_RASCUNHOS || m.status !== 'rascunho'); };
// Videos fora dos 15 mais recentes da playlist (o feed publico so traz 15): o JSON da materia informa "categoria" e "publicado".
const idsConhecidos = new Set(Object.values(playlists).flat().map((v) => v.id));
const extrasPorPasta = {};
for (const arq of fs.readdirSync(dados).filter((x) => x.endsWith('.json'))) {
  const id = arq.slice(0, -5);
  if (idsConhecidos.has(id)) continue;
  const m = lerMateria(id);
  if (!m || (m.status === 'rascunho' && !RASCUNHO && !COM_RASCUNHOS)) continue; // rascunho e ignorado
  const cat = categorias.find((c) => c.pasta === m.categoria);
  const data = m.publicado ? new Date(String(m.publicado).length === 10 ? `${m.publicado}T12:00:00-03:00` : m.publicado) : null;
  if (!cat || !data || isNaN(data)) {
    throw new Error(`_conteudo/materias/${id}.json: esse video nao esta entre os 15 mais recentes da playlist, entao o arquivo precisa de "categoria" (${categorias.map((c) => c.pasta).join(', ')}) e "publicado" (AAAA-MM-DD).`);
  }
  (extrasPorPasta[cat.pasta] ??= []).push({ id, title: m.titulo ?? id, published: data.toISOString().replace('.000Z', 'Z') });
}
const videosDe = (c) => [...(playlists[c.playlist] ?? []), ...(extrasPorPasta[c.pasta] ?? [])];
const visiveis = new Set(categorias.filter((c) => RASCUNHO || videosDe(c).some(temArquivo)).map((c) => c.pasta));
function chips(ativoHref) {
  return abas
    .filter((a) => !a.pasta || visiveis.has(a.pasta))
    .map((a) => `          <li><a href="${a.href}"${a.href === ativoHref ? ' class="active"' : ''}>${icone(a.icone)} ${a.nome}</a></li>`)
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

// pre-passagem: conta as materias de cada tag (inclui a franquia dos jogos com "pai")
for (const lista of categorias.map(videosDe)) {
  for (const v of lista) {
    const m = lerMateria(v.id);
    if (!m || (m.status === 'rascunho' && !RASCUNHO && !COM_RASCUNHOS)) continue;
    for (const x of resolverTags(m.tags)) contagemTags.set(x.slug, (contagemTags.get(x.slug) ?? 0) + 1);
  }
}
fs.rmSync(path.join(site, 'tag'), { recursive: true, force: true });
fs.rmSync(path.join(site, 'tags.html'), { force: true });

let total = 0, reais = 0, aguardando = 0;
const publicadas = new Map(); // id do video -> materia publicada
const itensPorCategoria = {};
const indice = [];
for (const cat of categorias) {
  const todos = videosDe(cat).sort((a, b) => b.published.localeCompare(a.published));
  // por padrao so entra video que tem materia aprovada; com --com-videos-sem-texto os demais viram pagina so com o player
  const videos = SO_COM_MATERIA && !RASCUNHO ? todos.filter(temArquivo) : todos;
  aguardando += todos.length - videos.length;
  if (!videos.length) continue;
  const usados = new Set();
  const itens = [];

  videos.forEach((v, i) => {
    const arq = lerMateria(v.id);
    const real = arq && (RASCUNHO || COM_RASCUNHOS || arq.status !== 'rascunho') ? arq : null; // rascunho so aparece nos modos de teste
    if (real && (!real.resumo || !Array.isArray(real.corpo) || !real.corpo.length)) {
      throw new Error(`_conteudo/materias/${v.id}.json precisa de "resumo" e de "corpo" (lista com ao menos 1 paragrafo).`);
    }
    const titulo = limparTitulo(real?.titulo ?? v.title);
    let slug = slugify(limparTitulo(v.title)); // endereco estavel: sempre vem do titulo do video (nao muda quando o texto entra)
    if (usados.has(slug)) slug = `${slug}-${v.id.slice(0, 4).toLowerCase()}`;
    usados.add(slug);
    const semTexto = !real && !RASCUNHO; // pagina so com o video
    itens.push({
      id: v.id, titulo, slug, publicado: v.published,
      resumo: real?.resumo ?? (semTexto ? '' : resumosLorem[i % resumosLorem.length]),
      corpo: real?.corpo ?? (semTexto ? [] : [lorem[i % 5], lorem[(i + 1) % 5], lorem[(i + 2) % 5], lorem[(i + 3) % 5]]),
      ficticio: !real && RASCUNHO,
      rascunho: real?.status === 'rascunho',
      tags: resolverTags(real?.tags),
      semTexto,
    });
    if (real) reais++; else if (semTexto) aguardando++;
  });

  for (const m of itens) m.short = await ehShort(m.id);
  for (const m of itens) publicadas.set(m.id, m);
  itensPorCategoria[cat.pasta] = { cat, itens };

  // indice da busca (texto fictício não entra, para não gerar resultados falsos)
  for (const m of itens) {
    indice.push({
      t: m.titulo, d: m.ficticio || m.semTexto ? '' : m.resumo, x: m.ficticio || m.semTexto ? '' : m.corpo.join(' ').slice(0, 2000),
      g: m.tags.map((x) => x.nome).join(' '),
      u: `${cat.pasta}/${m.slug}.html`, c: cat.rotulo, date: m.publicado, img: miniatura(m.id),
    });
  }

  // ---- pagina da materia ----
  for (const m of itens) {
    const outras = itens.filter((x) => x.id !== m.id).slice(0, 3);
    const relacionadas = outras.length ? `
      <section class="related">
        <h2 class="section-title">${esc(cat.relacionados ?? `Mais ${cat.nome.toLowerCase()}`)}</h2>
        <div class="news-grid">
${outras.map((o) => cartao(o, cat, '../')).join('\n')}
        </div>
      </section>` : '';
    // Short (vertical) com texto: player ao lado do texto. Video horizontal ou sem texto: player centralizado.
    const dividido = m.short && (m.resumo || m.corpo.length);
    const lead = m.resumo ? `<p class="art-lead">${esc(m.resumo)}</p>` : '';
    const video = `<div class="art-video${m.short ? ' is-short' : ''}" id="video"><iframe src="https://www.youtube-nocookie.com/embed/${m.id}" title="${esc(m.titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
    const texto = m.corpo.length ? `<div class="art-body">\n${m.corpo.map((p) => `        <p>${esc(p)}</p>`).join('\n')}\n      </div>` : '';
    const miolo = dividido
      ? `<div class="art-split">\n        <div class="art-text">\n          ${lead}\n          ${texto}\n        </div>\n        ${video}\n      </div>`
      : `<div class="art-flow">\n        ${lead}\n        ${video}\n        ${texto}\n      </div>`;
    const corpo = `    <main class="article${dividido ? ' has-split' : ''}">
      ${(cat.lista || visiveis.has(cat.pasta)) ? `<a class="back" href="../${cat.lista ?? `${cat.pasta}.html`}">&larr; ${esc(cat.nomeCurto ?? cat.nome)}</a>` : '<a class="back" href="../index.html">&larr; Início</a>'}
      <p class="art-meta"><span class="tag">${icone(cat.icone)} ${esc(cat.rotulo)}</span> <time datetime="${m.publicado}">${dataLonga(m.publicado)}</time> <span class="byline"><span class="avatar" aria-hidden="true">C</span>Por <b>${AUTOR}</b> <small>IA</small></span></p>
      <h1 class="art-title">${esc(m.titulo)}</h1>
      ${m.tags.length ? `<ul class="tag-list" aria-label="Tags">${[...m.tags].sort((a, b) => Number(temPaginaTag(b.slug)) - Number(temPaginaTag(a.slug))).slice(0, 8).map((x) => temPaginaTag(x.slug) ? `<li><a href="../${tagPage(x.slug)}">${icone('tag')} ${esc(x.nome)}</a></li>` : `<li><span>${icone('tag')} ${esc(x.nome)}</span></li>`).join('')}</ul>` : ''}
      ${dividido ? '<a class="ir-video" href="#video">&darr; Ir para o vídeo</a>' : ''}
      ${miolo}
      <div class="links">
        <a class="btn primary" href="https://www.youtube.com/watch?v=${m.id}" target="_blank" rel="noopener">Assistir no YouTube</a>
        <a class="btn" href="https://youtube.com/@brubaogg" target="_blank" rel="noopener">Ver o canal</a>
      </div>
${relacionadas}
    </main>`;
    escrever(`${cat.pasta}/${m.slug}.html`, pagina({
      base: '../', titulo: `${m.titulo} | BRUBAOGG`, descricao: m.resumo || `Assista: ${m.titulo}. Vídeo do canal BRUBAOGG.`, og: miniatura(m.id), corpo, caminho: `${cat.pasta}/${m.slug}.html`,
      noindex: m.ficticio || m.semTexto || m.rascunho, // exemplo, so video ou rascunho: fora do Google
    }));
    total++;
  }

  // ---- lista da categoria (so quando a aba esta visivel) ----
  if (!cat.lista && visiveis.has(cat.pasta)) {
  const lista = `    <main>
      <section class="cat-hero">
        <h1>${icone(cat.icone)} ${esc(cat.nome)}</h1>
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
    base: '', titulo: `${cat.nome} | BRUBAOGG`, descricao: cat.meta ?? cat.desc, og: null, corpo: lista, caminho: `${cat.pasta}.html`,
  }));
  }
}

function cartao(m, cat, base, destaque = false) {
  const ext = !!m.externo; // video ainda sem materia: abre no YouTube
  const href = ext ? `https://www.youtube.com/watch?v=${m.id}` : `${base}${cat.pasta}/${m.slug}.html`;
  const alvo = ext ? ' target="_blank" rel="noopener"' : '';
  return `          <a class="news-card${destaque ? ' featured' : ''}" href="${href}"${alvo}>
            <span class="thumb"><img src="${miniatura(m.id)}" alt="" loading="lazy"></span>
            <span class="news-body">
              <span class="tag">${icone(cat.icone)} ${esc(cat.rotulo)}</span>
              <b class="news-title">${esc(m.titulo)}</b>
              ${m.resumo ? `<span class="news-excerpt">${esc(m.resumo)}</span>` : ''}
              <small class="news-date">${dataCurta(m.publicado)}${ext ? ` &middot; assistir no YouTube ${icone('external-link')}` : ''}</small>
            </span>
          </a>`;
}

// secao "Ultimas novidades" da gta6.html: destaque (o video mais recente, com player e trecho do texto) + cartoes
function gta6Html() {
  const dados = itensPorCategoria['gta6-novidades'];
  if (!dados) return '';
  const catGta = dados.cat;
  const todos = dados.itens.map((m) => ({ m, cat: catGta }));
  const vistos = new Set(todos.map(({ m }) => m.id));
  for (const { m, cat } of porTag.get('gta-6')?.itens ?? []) { // materias de outras categorias marcadas com a tag GTA 6
    if (!vistos.has(m.id)) { todos.push({ m, cat }); vistos.add(m.id); }
  }
  todos.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
  if (!todos.length) return '';
  const { m: d, cat } = todos[0];
  const href = `${cat.pasta}/${d.slug}.html`;
  const player = `<div class="art-video${d.short ? ' is-short' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${d.id}" title="${esc(d.titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
  const texto = `<p class="art-meta"><span class="tag">${icone(cat.icone)} ${esc(cat.rotulo)}</span> <time datetime="${d.publicado}">${dataLonga(d.publicado)}</time></p>
          <h3 class="gd-title"><a href="${href}">${esc(d.titulo)}</a></h3>
          ${d.resumo ? `<p class="art-lead">${esc(d.resumo)}</p>` : ''}
          ${d.corpo.length ? `<p>${esc(d.corpo[0])}</p>` : ''}
          <a class="btn primary" href="${href}">${d.semTexto ? 'Ver a página do vídeo' : 'Ler a matéria completa'} &rarr;</a>`;
  const destaque = d.short
    ? `<article class="gta-destaque art-split">
        <div class="art-text">
          ${texto}
        </div>
        ${player}
      </article>`
    : `<article class="gta-destaque art-flow">
        ${texto}
        ${player}
      </article>`;
  const outros = todos.slice(1);
  return `      <section class="gta-news" aria-labelledby="gta-novidades">
        <h2 class="section-title" id="gta-novidades">${icone(catGta.icone)} Últimas novidades de GTA 6</h2>
        ${destaque}
${outros.length ? `        <h3 class="gd-mais">Mais novidades</h3>
        <div class="news-grid">
${outros.map(({ m, cat: c }) => cartao(m, c, '')).join('\n')}
        </div>` : ''}
        <p class="gd-todas"><a class="btn" href="https://www.youtube.com/playlist?list=${catGta.playlist}" target="_blank" rel="noopener">Ver a playlist completa no YouTube</a></p>
      </section>`;
}

// feed da home: ultimos videos por categoria (abre a materia quando existe, senao o YouTube)
function feedHtml() {
  const secoes = [
    { cat: categorias[0], titulo: 'Últimas notícias', qtd: 7, destaque: true },
    { cat: categorias[1], titulo: 'Últimos reviews', qtd: 3 },
    { cat: categorias[2], titulo: 'Lançamentos', qtd: 3 },
  ];
  return secoes.map(({ cat, titulo, qtd, destaque }) => {
    const recentes = videosDe(cat).sort((a, b) => b.published.localeCompare(a.published)).filter((v) => publicadas.has(v.id)).slice(0, qtd);
    if (!recentes.length) return '';
    const cards = recentes.map((v, i) => {
      const m = publicadas.get(v.id);
      return cartao(m, cat, '', destaque && i === 0);
    }).join('\n');
    const interna = visiveis.has(cat.pasta);
    const todas = interna ? `${cat.pasta}.html` : `https://www.youtube.com/playlist?list=${cat.playlist}`;
    return `      <section class="feed-sec">
        <div class="feed-head">
          <h2 class="section-title">${icone(cat.icone)} ${titulo}</h2>
          <a class="feed-all" href="${todas}"${interna ? '' : ' target="_blank" rel="noopener"'}>Ver todas${interna ? '' : ' no YouTube'} &rarr;</a>
        </div>
        <div class="news-grid">
${cards}
        </div>
      </section>`;
  }).join('\n');
}

// ---- paginas de tag (so materias com texto) ----
for (const { cat, itens } of Object.values(itensPorCategoria)) {
  for (const m of itens) {
    if (m.semTexto || m.ficticio) continue;
    for (const x of m.tags) {
      if (!porTag.has(x.slug)) porTag.set(x.slug, { slug: x.slug, nome: x.nome, itens: [] });
      porTag.get(x.slug).itens.push({ m, cat });
    }
  }
}
temTags = [...porTag.values()].some((x) => temPaginaTag(x.slug));
for (const tg of porTag.values()) {
  tg.itens.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
  if (!temPaginaTag(tg.slug)) continue;      // tag com 1 materia: continua na busca, mas nao ganha pagina (seria muito curta)
  if (tagsCfg[tg.slug]?.pagina) continue;    // a pagina propria (ex.: gta6.html) cumpre esse papel
  const n = tg.itens.length;
  const desc = tagsCfg[tg.slug]?.descricao ?? `Notícias, reviews e vídeos sobre ${tg.nome} no BRUBAOGG.`;
  const indexavel = true; // so chegam aqui tags com 2+ materias ou com descricao propria
  escrever(`tag/${tg.slug}.html`, pagina({
    base: '../', titulo: `${tg.nome}: notícias, reviews e vídeos | BRUBAOGG`, descricao: desc, og: null,
    caminho: `tag/${tg.slug}.html`, noindex: !indexavel,
    corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('tag')} ${esc(tg.nome)}</h1>
        <p class="lead">${esc(desc)}</p>
        <p class="tag-count">${n} ${n === 1 ? 'matéria' : 'matérias'} &middot; <a href="../tags.html">todas as tags</a></p>
      </section>
      <section class="news-grid">
${tg.itens.map(({ m, cat }, i) => cartao(m, cat, '../', i === 0 && n > 1)).join('\n')}
      </section>
    </main>`,
  }));
  indice.push({ t: tg.nome, d: '', x: '', g: '', u: tagPage(tg.slug), c: 'Tag', date: '', img: '' });
}
if (temTags) {
  const lista = [...porTag.values()].filter((x) => temPaginaTag(x.slug)).sort((a, b) => b.itens.length - a.itens.length || a.nome.localeCompare(b.nome, 'pt-BR'));
  escrever('tags.html', pagina({
    base: '', titulo: 'Tags | BRUBAOGG', descricao: 'Todos os jogos e assuntos com matérias no BRUBAOGG.', og: null, caminho: 'tags.html',
    corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('tag')} Tags</h1>
        <p class="lead">Encontre as matérias por jogo ou assunto.</p>
      </section>
      <ul class="tag-cloud">
${lista.map((tg) => `        <li><a href="${tagPage(tg.slug)}">${esc(tg.nome)} <span>${tg.itens.length}</span></a></li>`).join('\n')}
      </ul>
    </main>`,
  }));
}

// pagina 404 do GitHub Pages (servida em qualquer caminho, por isso usa base absoluta '/')
escrever('404.html', pagina({
  base: '/', titulo: 'Página não encontrada | BRUBAOGG', descricao: 'Página não encontrada.', og: null, noindex: true,
  corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('frown')} Página não encontrada</h1>
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
        <h1>${icone('search')} Busca</h1>
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

// ---- parciais: cabecalho, rodape, icones e feed, preenchidos em TODAS as paginas ----
const naoVarrer = new Set(['_ferramentas', '_conteudo', '_marca', 'assets', 'node_modules', '.git']);
const todasAsPaginas = [];
(function listar(dir, rel) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (naoVarrer.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) listar(path.join(dir, e.name), r);
    else if (e.name.endsWith('.html')) todasAsPaginas.push(r);
  }
})(site, '');
for (const r of todasAsPaginas) {
  const f = path.join(site, r);
  const original = fs.readFileSync(f, 'utf8');
  const base = r === '404.html' ? '/' : '../'.repeat(r.split('/').length - 1); // 404 e servida em qualquer caminho
  let html = original
    .replace(/<!--site:header-->[\s\S]*?<!--\/site:header-->/, () => `<!--site:header-->${headerHtml(base)}<!--/site:header-->`)
    .replace(/<!--site:footer-->[\s\S]*?<!--\/site:footer-->/, () => `<!--site:footer-->${footerHtml(base)}<!--/site:footer-->`)
    .replace(/<!--icone:([\w-]+)-->(?:(?:(?!<!--)[\s\S])*?<!--\/icone-->)?/g, (_, nome) => `<!--icone:${nome}-->${icone(nome)}<!--/icone-->`);
  if (r === 'gta6.html') html = html.replace(/<!--gta6:inicio-->[\s\S]*?<!--gta6:fim-->/, () => `<!--gta6:inicio-->\n${gta6Html()}\n      <!--gta6:fim-->`);
  if (r === 'index.html') html = html.replace(/<!--feed:inicio-->[\s\S]*?<!--feed:fim-->/, () => `<!--feed:inicio-->\n${feedHtml()}\n      <!--feed:fim-->`);
  if (html !== original) fs.writeFileSync(f, html, 'utf8');
}

// ---- marca de seguranca: modo de teste gera paginas que NAO devem ser publicadas ----
const marcaTeste = path.join(site, '_ferramentas', 'cache', 'MODO-TESTE');
if (RASCUNHO || COM_RASCUNHOS) fs.writeFileSync(marcaTeste, RASCUNHO ? 'rascunho (lorem ipsum)' : 'previa com rascunhos', 'utf8');
else fs.rmSync(marcaTeste, { force: true });

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
console.log(COM_RASCUNHOS
  ? `PREVIA COM RASCUNHOS: ${total} paginas (${reais} com texto, ${aguardando} so com o video). NAO publique: rode npm run gerar antes do commit.`
  : RASCUNHO
  ? `RASCUNHO: ${total} materias geradas (${reais} com texto real, ${total - reais} com texto ficticio). Nao publique este modo.`
  : `Materias no site: ${total} (${reais} com texto)${SO_COM_MATERIA ? ` | videos ainda sem materia, fora do site: ${aguardando}` : ` | paginas so com o video: ${aguardando}`} | abas visiveis: ${[...visiveis].join(', ') || 'nenhuma'}`);
