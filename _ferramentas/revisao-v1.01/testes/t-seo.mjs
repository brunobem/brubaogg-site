// Sitemap, robots, paginas protegidas e coerencia entre o que e indexavel e o que o sitemap diz.
import { posix } from 'node:path';
import { achado, arquivosPublicados, DOMINIO, existe, existeExato, ler, limparHtml, paginasHtml } from './lib.mjs';

const T = 'seo';

export default async function () {
  const a = [];
  if (!existe('sitemap.xml')) return [achado('critico', T, 'sitemap.xml nao existe (rode npm run gerar)')];
  const xml = ler('sitemap.xml');
  const locs = [...xml.matchAll(/<url><loc>([^<]+)<\/loc>(?:<lastmod>([^<]*)<\/lastmod>)?/g)].map((m) => ({ loc: m[1], mod: m[2] }));
  const hoje = new Date().toISOString().slice(0, 10);
  const doSitemap = new Set();

  if (locs.length !== (xml.match(/<url>/g) ?? []).length) a.push(achado('alto', T, 'ha <url> no sitemap que o teste nao conseguiu ler (formato inesperado)'));
  if (locs.length > 50000) a.push(achado('critico', T, `sitemap com ${locs.length} URLs (limite do Google: 50.000 por arquivo)`));
  if (Buffer.byteLength(xml) > 50 * 1024 * 1024) a.push(achado('critico', T, 'sitemap maior que 50 MB (limite do Google)'));

  const vistos = new Set();
  for (const { loc, mod } of locs) {
    if (!loc.startsWith(DOMINIO)) a.push(achado('alto', T, `URL fora do dominio no sitemap: ${loc}`));
    if (vistos.has(loc)) a.push(achado('medio', T, `URL repetida no sitemap: ${loc}`));
    vistos.add(loc);
    const rel = loc === `${DOMINIO}/` ? 'index.html' : loc.slice(DOMINIO.length + 1);
    doSitemap.add(rel);
    if (existeExato(rel) !== 'ok') a.push(achado('alto', T, `URL do sitemap sem arquivo correspondente (ou com outra caixa): ${loc}`));
    else if (/content=["']noindex/i.test(ler(rel))) a.push(achado('alto', T, 'pagina com noindex dentro do sitemap', rel));
    if (!mod || !/^\d{4}-\d{2}-\d{2}$/.test(mod)) a.push(achado('medio', T, `lastmod ausente ou fora do formato AAAA-MM-DD: ${loc}`));
    else if (mod > hoje) a.push(achado('medio', T, `lastmod no futuro (${mod}) em ${loc}`));
  }

  // toda pagina indexavel deveria estar no sitemap
  for (const rel of paginasHtml()) {
    const html = limparHtml(ler(rel));
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const redirecionador = /http-equiv=["']refresh["']/i.test(html);
    if (!noindex && !redirecionador && !doSitemap.has(rel)) a.push(achado('medio', T, 'pagina indexavel fora do sitemap', rel));
  }

  // protegidas: nao podem sumir nem mudar de endereco
  for (const p of ['index.html', 'gta6.html', 'termos.html', 'privacidade.html', 'termos-tiktok.html', 'privacidade-tiktok.html', 'termos-youtube.html', 'privacidade-youtube.html', 'mcp-tiktok.html', 'mcp-youtube.html']) {
    if (existeExato(p) !== 'ok') a.push(achado('critico', T, 'URL protegida ausente (ja indexada ou cadastrada em servico externo)', p));
  }
  for (const p of ['index.html', 'gta6.html']) if (existe(p) && !doSitemap.has(p)) a.push(achado('alto', T, 'URL protegida fora do sitemap', p));

  // as datas do sitemap vem de _conteudo/lastmod.json (a data da ultima MUDANCA da pagina), nao da data do arquivo
  if (!existe('_conteudo/lastmod.json')) a.push(achado('medio', T, '_conteudo/lastmod.json ausente: as datas do sitemap voltariam a depender da data dos arquivos (rode npm run gerar)'));
  else {
    const store = JSON.parse(ler('_conteudo/lastmod.json'));
    for (const { loc, mod } of locs) {
      const rel = loc === `${DOMINIO}/` ? 'index.html' : loc.slice(DOMINIO.length + 1);
      if (store[rel]?.d !== mod) a.push(achado('medio', T, `lastmod do sitemap (${mod}) diferente do lastmod.json (${store[rel]?.d ?? 'sem registro'})`, rel));
    }
  }

  // robots.txt
  if (!existe('robots.txt')) a.push(achado('alto', T, 'robots.txt ausente'));
  else {
    const r = ler('robots.txt');
    if (!r.includes(`Sitemap: ${DOMINIO}/sitemap.xml`)) a.push(achado('medio', T, 'robots.txt nao aponta para o sitemap'));
    if (/Disallow:\s*\/\s*$/m.test(r)) a.push(achado('critico', T, 'robots.txt bloqueia o site inteiro (Disallow: /)'));
  }
  // CNAME e 404
  if (!existe('CNAME') || ler('CNAME').trim() !== 'brubaogg.com.br') a.push(achado('critico', T, 'CNAME ausente ou diferente de brubaogg.com.br (o dominio sai do ar)'));
  if (!existe('404.html')) a.push(achado('alto', T, '404.html ausente'));
  // dados estruturados da home
  if (existe('index.html')) {
    const blocos = [...ler('index.html').matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!blocos.length) a.push(achado('baixo', T, 'home sem dados estruturados (JSON-LD)', 'index.html'));
    for (const b of blocos) { try { JSON.parse(b[1]); } catch (e) { a.push(achado('alto', T, `JSON-LD invalido: ${e.message}`, 'index.html')); } }
  }
  // ---- paginas indexaveis: dados estruturados, previa de compartilhamento, imagem grande ----
  const paginas = paginasHtml().map((rel) => ({ rel, bruto: ler(rel) })).filter(({ bruto }) => !/http-equiv=["']refresh["']/i.test(bruto));
  const indexaveis = paginas.filter(({ bruto }) => !/<meta[^>]+name=["']robots["'][^>]+noindex/i.test(limparHtml(bruto)));
  const ehMateria = (rel) => /^(noticias|reviews|lancamentos|gta6-novidades)\//.test(rel);
  for (const { rel, bruto } of indexaveis) {
    if (!/<meta name="robots" content="max-image-preview:large">/.test(bruto)) a.push(achado('baixo', T, 'falta max-image-preview:large (o Google nao pode mostrar a imagem grande)', rel));
    if (!ehMateria(rel)) continue;
    const canonical = (bruto.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1];
    if (!/<meta property="og:type" content="article">/.test(bruto) || !/<meta property="article:published_time" content="[^"]+">/.test(bruto)) a.push(achado('medio', T, 'materia sem og:type=article e article:published_time na previa de compartilhamento', rel));
    const blocos = [...bruto.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    if (!blocos.length) { a.push(achado('alto', T, 'materia sem dados estruturados (Article + VideoObject)', rel)); continue; }
    let grafo = [];
    try { grafo = blocos.flatMap((b) => JSON.parse(b[1])['@graph'] ?? []); } catch (e) { a.push(achado('alto', T, `JSON-LD invalido: ${e.message}`, rel)); continue; }
    const tipo = (t) => grafo.find((x) => x['@type'] === t);
    const art = tipo('Article'), vid = tipo('VideoObject'), trilha = tipo('BreadcrumbList');
    const falta = (obj, campos, nome) => { for (const c of campos) if (obj[c] == null || obj[c] === '') a.push(achado('alto', T, `${nome} sem "${c}"`, rel)); };
    if (!art) a.push(achado('alto', T, 'sem Article nos dados estruturados', rel)); else {
      falta(art, ['headline', 'description', 'image', 'datePublished', 'author', 'publisher', 'mainEntityOfPage'], 'Article');
      if ((art.headline ?? '').length > 110) a.push(achado('medio', T, `Article.headline com ${art.headline.length} caracteres (o Google aceita ate 110)`, rel));
      if (art.mainEntityOfPage !== canonical) a.push(achado('alto', T, 'Article.mainEntityOfPage diferente do canonical', rel));
      if (Number.isNaN(Date.parse(art.datePublished))) a.push(achado('alto', T, `Article.datePublished invalido: ${art.datePublished}`, rel));
      if (!(art.image ?? []).every((u) => /^https:\/\//.test(u))) a.push(achado('alto', T, 'Article.image precisa ser URL https', rel));
    }
    if (!vid) a.push(achado('alto', T, 'sem VideoObject nos dados estruturados', rel)); else {
      falta(vid, ['name', 'description', 'thumbnailUrl', 'uploadDate', 'embedUrl', 'contentUrl'], 'VideoObject');
      const idDoPlayer = (bruto.match(/youtube-nocookie\.com\/embed\/([\w-]{11})/) ?? [])[1];
      if (idDoPlayer && !String(vid.embedUrl).endsWith(idDoPlayer)) a.push(achado('alto', T, 'VideoObject.embedUrl aponta para outro video que o player da pagina', rel));
    }
    if (!trilha || trilha.itemListElement?.length < 2 || trilha.itemListElement.some((it, i) => it.position !== i + 1)) a.push(achado('medio', T, 'BreadcrumbList ausente ou com posicoes erradas', rel));
  }

  // ---- links internos: nenhuma pagina indexavel pode ficar "orfa" (so no sitemap) ----
  // O Google nao clica em "Ver mais": o que conta sao links <a> no HTML. Anda a partir da home por links estaticos e mede a distancia (em cliques).
  const nome = new Map(indexaveis.map(({ rel }) => [rel, rel]));
  const destinos = (rel, bruto) => {
    const out = new Set();
    for (const m of limparHtml(bruto).matchAll(/<a\s[^>]*href="([^"#?]+)(?:[#?][^"]*)?"/g)) {
      const h = m[1];
      if (/^(https?:|\/\/|mailto:|tel:|javascript:)/i.test(h)) continue;
      const alvo = h.startsWith('/') ? h.slice(1) : posix.normalize(posix.join(posix.dirname(rel), h));
      const final = alvo === '' || alvo.endsWith('/') ? `${alvo}index.html` : alvo;
      if (nome.has(final) && final !== rel) out.add(final);
    }
    return out;
  };
  const saidas = new Map(indexaveis.map(({ rel, bruto }) => [rel, destinos(rel, bruto)]));
  const distancia = new Map([['index.html', 0]]); const fila = ['index.html'];
  while (fila.length) { const atual = fila.shift(); for (const d of saidas.get(atual) ?? []) if (!distancia.has(d)) { distancia.set(d, distancia.get(atual) + 1); fila.push(d); } }
  const orfas = indexaveis.map(({ rel }) => rel).filter((rel) => !distancia.has(rel));
  if (orfas.length) a.push(achado('alto', T, `${orfas.length} pagina(s) indexavel(is) sem nenhum caminho de links a partir da home (so o sitemap aponta): ${orfas.slice(0, 3).join(', ')}`));
  const maior = Math.max(0, ...distancia.values());
  if (maior > 4) a.push(achado('medio', T, `a pagina mais funda esta a ${maior} cliques da home (o ideal e ate 4)`));
  const recebidos = new Map(); for (const [rel, ds] of saidas) for (const d of ds) recebidos.set(d, (recebidos.get(d) ?? 0) + 1);
  const poucas = indexaveis.map(({ rel }) => rel).filter((rel) => ehMateria(rel) && (recebidos.get(rel) ?? 0) < 2);
  if (poucas.length) a.push(achado('baixo', T, `${poucas.length} materia(s) com menos de 2 links internos: ${poucas.slice(0, 2).join(', ')}`));
  // o arquivo por mes tem que listar TODA materia indexavel (e cada mes tem que estar em arquivo.html)
  const materiasIndexaveis = indexaveis.map(({ rel }) => rel).filter(ehMateria);
  const noArquivo = new Set(); for (const [rel, ds] of saidas) if (rel.startsWith('arquivo/')) for (const d of ds) noArquivo.add(d);
  const foraDoArquivo = materiasIndexaveis.filter((rel) => !noArquivo.has(rel));
  if (materiasIndexaveis.length && foraDoArquivo.length) a.push(achado('alto', T, `${foraDoArquivo.length} materia(s) indexavel(is) fora do arquivo por mes: ${foraDoArquivo.slice(0, 2).join(', ')}`));
  const rodapeLinkaArquivo = indexaveis.filter(({ rel, bruto }) => rel !== 'arquivo.html' && materiasIndexaveis.length && !/href="(?:\.\.\/)*arquivo\.html"/.test(bruto)).length;
  if (rodapeLinkaArquivo) a.push(achado('medio', T, `${rodapeLinkaArquivo} pagina(s) indexavel(is) sem link para arquivo.html no rodape`));

  a.push(achado('info', T, `${locs.length} URLs no sitemap; ${indexaveis.length} paginas indexaveis, a mais funda a ${maior} cliques da home; ${materiasIndexaveis.length} materias`));
  return a;
}
