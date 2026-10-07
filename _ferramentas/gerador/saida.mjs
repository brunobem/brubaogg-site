// Monta e grava o site. Passos: (1) monta TODAS as paginas em memoria, preenchendo os marcadores das paginas escritas a mao e conferindo
// cada um; (2) se algo estiver errado, PARA sem gravar nada, dizendo a pagina e o marcador; (3) so entao grava o que mudou, apaga o que o
// gerador criou antes e nao e mais gerado, guarda a data da ultima mudanca de cada pagina (lastmod) e gera sitemap.xml e robots.txt.
//
// Marcadores das paginas escritas a mao (o gerador reescreve o que esta ENTRE eles; o resto da pagina e seu):
//   <!--site:header--><!--/site:header-->      cabecalho (todas as paginas)            <!--site:footer--><!--/site:footer-->  rodape (todas)
//   <!--site:social--><!--/site:social-->      <head>: previa de compartilhamento, a partir do <title> e da meta description da pagina
//   <!--site:jsonld--><!--/site:jsonld-->      <head> da home: dados estruturados, a partir da lista de redes (opcional)
//   <!--icone:nome--><!--/icone-->             icone inline de assets/icones/nome.svg
//   <!--dado:nome-->...<!--/dado-->            dado que se repete no site (ex.: gta6-data), preenchido de config.mjs
//   <!--feed:inicio-->...<!--feed:fim-->       so na home;  <!--gta6:inicio-->...<!--gta6:fim-->  so em gta6.html
//   <meta name="description" data-modelo="... {gta6-data} ...">   descricao montada a partir de dados do config.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DOMINIO, categorias } from './config.mjs';
import { feedHtml, gta6Html } from './paginas.mjs';
import { ErroDeDados, desescapar, esc, hojeEmSaoPaulo, lerJson } from './util.mjs';

// pastas que nao sao paginas do site (nao entram na varredura de .html nem no sitemap)
const NAO_VARRER = new Set(['_ferramentas', '_conteudo', '_marca', '_site', 'assets', 'node_modules', 'pagefind', '.git', '.github']);
// paginas escritas a mao que mostram os chips das abas -> qual chip fica "ativo"
const CHIPS_FIXAS = { 'index.html': null, 'gta6.html': 'gta6.html', 'cortes.html': 'cortes.html', 'lives.html': 'lives.html' };
// marcadores de abertura/fechamento que precisam vir em PAR, uma vez so, nessa ordem
const PARES = {
  header: ['<!--site:header-->', '<!--/site:header-->'],
  footer: ['<!--site:footer-->', '<!--/site:footer-->'],
  social: ['<!--site:social-->', '<!--/site:social-->'],
  jsonld: ['<!--site:jsonld-->', '<!--/site:jsonld-->'],
  feed: ['<!--feed:inicio-->', '<!--feed:fim-->'],
  gta6: ['<!--gta6:inicio-->', '<!--gta6:fim-->'],
};

// previas: geram paginas que NAO devem ser publicadas (rascunhos, texto de exemplo, paginas so com o player)
const modoDeTeste = (ctx) => ctx.flags.RASCUNHO || ctx.flags.COM_RASCUNHOS || !ctx.flags.SO_COM_MATERIA;

const gravarSeMudou = (abs, conteudo) => {
  if (fs.existsSync(abs) && fs.readFileSync(abs, 'utf8') === conteudo) return false;
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, conteudo, 'utf8');
  return true;
};

// o que o gerador criou em rodadas anteriores e nao e mais gerado (materia removida, aba escondida, tag sem pagina)
function orfaos(ctx) {
  const { site, saidas } = ctx;
  const lista = [];
  for (const pasta of [...categorias.map((c) => c.pasta), 'tag', 'arquivo']) {
    const abs = path.join(site, pasta);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) if (!saidas.has(`${pasta}/${f}`)) lista.push(`${pasta}/${f}`);
  }
  for (const rel of [...categorias.map((c) => `${c.pasta}.html`), 'tags.html', 'arquivo.html', 'assets/data/busca.json']) { // busca.json: indice antigo da busca (v1.0), trocado pelo Pagefind
    if (!saidas.has(rel) && fs.existsSync(path.join(site, rel))) lista.push(rel);
  }
  const listas = path.join(site, 'assets', 'data', 'lista'); // meses que ficaram sem materia
  if (fs.existsSync(listas)) for (const f of fs.readdirSync(listas)) if (!saidas.has(`assets/data/lista/${f}`)) lista.push(`assets/data/lista/${f}`);
  const colecoes = path.join(site, 'assets', 'data', 'colecao'); // "Ver mais" de listas que encolheram (tag que caiu para 30 ou menos, materia retirada...)
  if (fs.existsSync(colecoes)) for (const f of fs.readdirSync(colecoes, { recursive: true })) { const rel = `assets/data/colecao/${f.split(path.sep).join('/')}`; if (fs.statSync(path.join(site, rel)).isFile() && !saidas.has(rel)) lista.push(rel); }
  return lista;
}
function apagarOrfaos(ctx, lista) {
  for (const rel of lista) fs.rmSync(path.join(ctx.site, rel), { recursive: true, force: true });
  const colecoes = path.join(ctx.site, 'assets', 'data', 'colecao'); // pastas de colecao que ficaram vazias
  if (fs.existsSync(colecoes)) for (const d of fs.readdirSync(colecoes)) { const abs = path.join(colecoes, d); if (fs.statSync(abs).isDirectory() && !fs.readdirSync(abs).length) fs.rmSync(abs, { recursive: true, force: true }); }
  for (const pasta of [...categorias.map((c) => c.pasta), 'tag', 'arquivo']) {
    const abs = path.join(ctx.site, pasta);
    if (fs.existsSync(abs) && !fs.readdirSync(abs).length) fs.rmSync(abs, { recursive: true, force: true });
  }
}

// todas as paginas .html do site: as geradas + as escritas a mao (menos as que serao apagadas)
function paginasDoSite(ctx, apagar) {
  const { site, saidas } = ctx;
  const todas = new Set([...saidas.keys()].filter((r) => r.endsWith('.html')));
  (function listar(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (NAO_VARRER.has(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) listar(path.join(dir, e.name), r);
      else if (e.name.endsWith('.html') && !apagar.has(r) && !apagar.has(rel)) todas.add(r);
    }
  })(site, '');
  return todas;
}

// confere um par de marcadores: 0 ou 1 vez cada, abertura antes do fechamento. Devolve o motivo do erro, ou null.
function conferirPar(html, [abre, fecha]) {
  const n1 = html.split(abre).length - 1, n2 = html.split(fecha).length - 1;
  if (n1 === 0 && n2 === 0) return null;
  if (n1 !== 1 || n2 !== 1) return `${abre} aparece ${n1}x e ${fecha} aparece ${n2}x (cada um deve aparecer exatamente 1 vez)`;
  if (html.indexOf(abre) > html.indexOf(fecha)) return `${fecha} vem antes de ${abre}`;
  return null;
}

// monta o HTML final de UMA pagina. Erros vao para `problemas` (nada e gravado se houver algum).
function montarPagina(ctx, r, original, problemas) {
  const { saidas, icone, headerHtml, footerHtml, chips, social, jsonLd, dado, modelo } = ctx;
  const erro = (msg) => problemas.push(`${r}: ${msg}`);
  if (/http-equiv="refresh"/.test(original)) return original; // redirecionamento: nao tem cabecalho
  const geradaPeloSite = saidas.has(r);
  let html = original;

  // 1) marcadores em ordem e sem duplicar
  for (const [nome, par] of Object.entries(PARES)) {
    const motivo = conferirPar(html, par);
    if (motivo) erro(`marcador ${nome}: ${motivo}.`);
  }
  for (const obrigatorio of ['header', 'footer']) if (!html.includes(PARES[obrigatorio][0])) erro(`falta o marcador ${PARES[obrigatorio][0]}${PARES[obrigatorio][1]}. Toda pagina precisa dele para receber o cabecalho/rodape do site (copie de outra pagina, ex.: termos.html).`);
  if (!geradaPeloSite && !html.includes(PARES.social[0])) erro(`falta o marcador ${PARES.social[0]}${PARES.social[1]} dentro do <head> (gera a previa de compartilhamento a partir do <title> e da meta description). Copie de outra pagina.`);
  if (r === 'index.html' && !html.includes(PARES.feed[0])) erro(`a home precisa dos marcadores ${PARES.feed[0]} e ${PARES.feed[1]} (o feed de ultimas materias).`);
  if (r === 'gta6.html' && !html.includes(PARES.gta6[0])) erro(`a pagina do GTA 6 precisa dos marcadores ${PARES.gta6[0]} e ${PARES.gta6[1]} (as novidades).`);

  // 2) chips das abas (so as 4 paginas de aba escritas a mao)
  if (!geradaPeloSite && r in CHIPS_FIXAS) {
    if (!/<ul class="chips">/.test(html)) ctx.avisos.push(`${r}: sem <ul class="chips"> (as abas de categoria nao aparecem).`);
    else html = html.replace(/<ul class="chips">[\s\S]*?<\/ul>/, () => `<ul class="chips">\n${chips(CHIPS_FIXAS[r])}\n        </ul>`);
  }

  // 3) dados que se repetem (config.mjs): meta com data-modelo, <!--dado:...-->, data-alvo da contagem regressiva
  html = html.replace(/<meta\b[^>]*\bdata-modelo="([^"]*)"[^>]*>/g, (tag, mod) => tag.replace(/\bcontent="[^"]*"/, () => `content="${esc(modelo(desescapar(mod)))}"`));
  html = html.replace(/<!--dado:([\w-]+)-->(?:(?:(?!<!--)[\s\S])*?<!--\/dado-->)?/g, (todo, nome) => {
    const v = dado(nome);
    if (v === undefined) { erro(`marcador <!--dado:${nome}--> com nome desconhecido (veja gerador/modelos.mjs, DADOS).`); return todo; }
    return `<!--dado:${nome}-->${v}<!--/dado-->`;
  });
  html = html.replace(/(\bid="gta-count"[^>]*\bdata-alvo=")[^"]*(")/g, (todo, a, b) => `${a}${dado('gta6-alvo')}${b}`);

  // 4) cabecalho, rodape, icones, novidades do GTA 6, feed da home
  html = html
    .replace(/<!--site:header-->[\s\S]*?<!--\/site:header-->/, () => `<!--site:header-->${headerHtml(r === '404.html' ? '/' : '../'.repeat(r.split('/').length - 1))}<!--/site:header-->`)
    .replace(/<!--site:footer-->[\s\S]*?<!--\/site:footer-->/, () => `<!--site:footer-->${footerHtml(r === '404.html' ? '/' : '../'.repeat(r.split('/').length - 1))}<!--/site:footer-->`)
    .replace(/<!--icone:([\w-]+)-->(?:(?:(?!<!--)[\s\S])*?<!--\/icone-->)?/g, (todo, nome) => {
      try { return `<!--icone:${nome}-->${icone(nome)}<!--/icone-->`; }
      catch (e) { erro(`marcador <!--icone:${nome}-->: ${e.message}.`); return todo; }
    });
  if (r === 'gta6.html') html = html.replace(/<!--gta6:inicio-->[\s\S]*?<!--gta6:fim-->/, () => `<!--gta6:inicio-->\n${gta6Html(ctx)}\n      <!--gta6:fim-->`);
  if (r === 'index.html') html = html.replace(/<!--feed:inicio-->[\s\S]*?<!--feed:fim-->/, () => `<!--feed:inicio-->\n${feedHtml(ctx)}\n      <!--feed:fim-->`);
  html = html.replace(/<!--site:jsonld-->[\s\S]*?<!--\/site:jsonld-->/, () => `<!--site:jsonld-->\n${jsonLd()}\n<!--/site:jsonld-->`);

  // 5) previa de compartilhamento, a partir do <title> e da meta description da propria pagina (por ultimo: ja com os dados preenchidos)
  if (!geradaPeloSite && html.includes(PARES.social[0])) {
    const titulo = (html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1];
    const descricao = (html.match(/<meta\s+name="description"[^>]*\bcontent="([^"]*)"/) ?? html.match(/<meta[^>]*\bcontent="([^"]*)"[^>]*\bname="description"/) ?? [])[1];
    const url = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/) ?? [])[1];
    if (!titulo || !descricao) erro('a pagina precisa de <title> e <meta name="description"> (a previa de compartilhamento nasce deles).');
    else html = html.replace(/<!--site:social-->[\s\S]*?<!--\/site:social-->/, () => `<!--site:social-->\n${social({ titulo: desescapar(titulo.trim()), descricao: desescapar(descricao), url })}\n<!--/site:social-->`);
  }
  // 6) recursos que o navegador deve buscar ANTES de precisar: a fonte dos titulos (sem isso o texto de abertura pinta com a fonte errada e "pula" quando
  //    ela chega) e as conexoes com o YouTube (miniaturas nos cartoes, player nas materias). Bloco gerenciado: refeito a cada geracao, em toda pagina.
  html = html.replace(/<!--site:recursos-->[\s\S]*?<!--\/site:recursos-->\n?/, '');
  html = html.replace(/<link rel="stylesheet" href="((?:[^"]*\/)?)assets\/css\/style\.css">/, (link, base) => {
    const linhas = [`<link rel="preload" href="${base}assets/fonts/lilita-one-latin.woff2" as="font" type="font/woff2" crossorigin>`];
    if (!/<meta name="robots" content="noindex">/.test(html)) linhas.unshift('<meta name="robots" content="max-image-preview:large">'); // o Google pode mostrar a imagem grande (Discover, resultados com miniatura)
    if (html.includes('https://i.ytimg.com/')) linhas.push('<link rel="preconnect" href="https://i.ytimg.com">');
    if (html.includes('youtube-nocookie.com/embed/')) linhas.push('<link rel="preconnect" href="https://www.youtube-nocookie.com">');
    return `<!--site:recursos-->\n${linhas.join('\n')}\n<!--/site:recursos-->\n${link}`;
  });
  return html.replace(/[ \t]+(\r?)$/gm, '$1'); // sem espaco sobrando no fim das linhas
}

// ---- lastmod: a data da ULTIMA MUDANCA de cada pagina, guardada em _conteudo/lastmod.json ----
// Nao depende da data do arquivo (que muda em clone novo ou em build no servidor): so muda quando o conteudo da pagina muda.
// Na primeira vez (arquivo ainda nao existe) parte da data dos arquivos, para nao zerar o historico.
function atualizarLastmod(ctx, finais) {
  const { site } = ctx;
  const arq = path.join(site, '_conteudo', 'lastmod.json');
  const antigo = fs.existsSync(arq) ? lerJson(arq, '_conteudo/lastmod.json') : null;
  const hoje = hojeEmSaoPaulo();
  const novo = {};
  for (const r of [...finais.keys()].sort()) {
    const h = crypto.createHash('md5').update(finais.get(r)).digest('hex').slice(0, 12);
    const ant = antigo?.[r];
    const dataDoArquivo = () => fs.statSync(path.join(site, r)).mtime.toISOString().slice(0, 10);
    novo[r] = ant?.h === h ? ant : { h, d: antigo ? hoje : dataDoArquivo() };
  }
  if (!modoDeTeste(ctx)) gravarSeMudou(arq, `${JSON.stringify(novo, null, 1)}\n`); // as previas de teste nao mexem nas datas reais
  return novo;
}

function sitemapERobots(ctx, lastmod) {
  const { site } = ctx;
  const semIndice = new Set(['404.html', 'busca.html']);
  const urls = [];
  (function varrer(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (NAO_VARRER.has(e.name)) continue;
      const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) varrer(abs, r);
      else if (e.name.endsWith('.html') && !semIndice.has(r) && !/content="noindex"|http-equiv="refresh"/.test(fs.readFileSync(abs, 'utf8'))) urls.push({ r, mod: lastmod[r]?.d ?? fs.statSync(abs).mtime.toISOString().slice(0, 10) });
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
  fs.writeFileSync(path.join(site, 'robots.txt'), ['User-agent: *', 'Allow: /', 'Disallow: /pagefind/', '', `Sitemap: ${DOMINIO}/sitemap.xml`, ''].join('\n'), 'utf8');
}

// materias que ja foram publicadas (estao no registro) mas cuja pagina NAO sera mais gerada: o link vai dar 404
function paginasQueSumiriam(ctx) {
  const sumiriam = [];
  for (const [id, e] of Object.entries(ctx.enderecos)) {
    if (e.retirada) continue;
    if (!ctx.saidas.has(`${e.categoria}/${e.slug}.html`)) sumiriam.push({ id, url: `${e.categoria}/${e.slug}.html` });
  }
  return sumiriam;
}

export function gravarTudo(ctx) {
  const { site, saidas } = ctx;
  if (!modoDeTeste(ctx)) ctx.sumiram = paginasQueSumiriam(ctx);

  // 1) monta tudo em memoria e confere os marcadores; se algo estiver errado, para SEM gravar nada
  const apagar = new Set(orfaos(ctx));
  const finais = new Map();
  const problemas = [];
  for (const r of paginasDoSite(ctx, apagar)) {
    const original = saidas.has(r) ? saidas.get(r) : fs.readFileSync(path.join(site, r), 'utf8');
    finais.set(r, montarPagina(ctx, r, original, problemas));
  }
  if (problemas.length) throw new ErroDeDados(`O gerador parou: ${problemas.length} problema(s) nas paginas (nada foi gravado).\n${problemas.map((p) => `  - ${p}`).join('\n')}`);

  // 2) grava
  apagarOrfaos(ctx, [...apagar]);
  for (const [rel, conteudo] of saidas) if (!rel.endsWith('.html')) gravarSeMudou(path.join(site, rel), conteudo); // ex.: indice da busca
  for (const [r, html] of finais) gravarSeMudou(path.join(site, r), html);

  // marca de seguranca: modo de teste gera paginas que NAO devem ser publicadas (o npm run verificar recusa)
  const marcaTeste = path.join(site, '_ferramentas', 'cache', 'MODO-TESTE');
  if (modoDeTeste(ctx)) {
    fs.mkdirSync(path.dirname(marcaTeste), { recursive: true });
    fs.writeFileSync(marcaTeste, ctx.flags.RASCUNHO ? 'rascunho (lorem ipsum)' : ctx.flags.COM_RASCUNHOS ? 'previa com rascunhos' : 'previa com paginas so com o video', 'utf8');
  } else fs.rmSync(marcaTeste, { force: true });

  sitemapERobots(ctx, atualizarLastmod(ctx, finais));
}
