// Monta e grava o site. Passos: (1) monta TODAS as paginas em memoria, preenchendo os marcadores das paginas escritas a mao e conferindo
// cada um; (2) se algo estiver errado, PARA sem gravar nada, dizendo a pagina e o marcador; (3) so entao grava o que mudou, apaga o que o
// gerador criou antes e nao e mais gerado, guarda a data da ultima mudanca de cada pagina (lastmod) e gera sitemap.xml e robots.txt.
//
// Marcadores das paginas escritas a mao (o gerador reescreve o que esta ENTRE eles; o resto da pagina e seu):
//   <!--site:header--><!--/site:header-->      cabecalho (todas as paginas)            <!--site:footer--><!--/site:footer-->  rodape (todas)
//   <!--site:social--><!--/site:social-->      <head>: previa de compartilhamento, a partir do <title> e da meta description da pagina
//   <!--site:jsonld--><!--/site:jsonld-->      <head>: dados estruturados (opcional). Home: WebSite + Organization, a partir da lista de redes; Sobre, Termos, Privacidade, Cortes, Lives e GTA 6: a pagina + a trilha, a partir do <title> e da meta description
//   <!--icone:nome--><!--/icone-->             icone inline de assets/icones/nome.svg
//   <!--dado:nome-->...<!--/dado-->            dado que se repete no site (ex.: gta6-data), preenchido de config.mjs
//   <!--feed:inicio-->...<!--feed:fim-->       so na home;  <!--gta6:inicio-->...<!--gta6:fim-->  so em gta6.html
//   <!--carrossel:inicio-->...<!--carrossel:fim-->  e  <!--cobertura:inicio-->...<!--cobertura:fim-->   so na home (carrossel do topo e cobertura em andamento; config.mjs)
//   <meta name="description" data-modelo="... {gta6-data} ...">   descricao montada a partir de dados do config.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';
import path, { posix } from 'node:path';
import { ADS_ATIVOS, ADS_BLOCO, ADS_CLIENTE, DOMINIO, SOCIAIS, categorias } from './config.mjs';
import { EH_ADS_TXT_GERADO, linhaDoAdsTxt, metaDeVerificacao, porAnuncios, scriptsDoAnuncio, situacaoDosAds, tirarAnuncios } from './anuncio.mjs';
import { ENDERECO_DAS_IMAGENS, PASTA_NO_R2 } from './imagens.mjs';
import { carrosselHtml, coberturaHtml, contagemHtml, feedHtml, gta6Html, playersHtml, wikiHtml } from './paginas.mjs';
import { ErroDeDados, desescapar, esc, hojeEmSaoPaulo, lerJson, urlDe } from './util.mjs';

// pastas que nao sao paginas do site (nao entram na varredura de .html nem no sitemap)
const NAO_VARRER = new Set(['_ferramentas', '_conteudo', '_marca', '_site', 'assets', 'node_modules', 'pagefind', '.git', '.github']);
// marcadores de abertura/fechamento que precisam vir em PAR, uma vez so, nessa ordem
const PARES = {
  header: ['<!--site:header-->', '<!--/site:header-->'],
  footer: ['<!--site:footer-->', '<!--/site:footer-->'],
  social: ['<!--site:social-->', '<!--/site:social-->'],
  jsonld: ['<!--site:jsonld-->', '<!--/site:jsonld-->'],
  feed: ['<!--feed:inicio-->', '<!--feed:fim-->'],
  carrossel: ['<!--carrossel:inicio-->', '<!--carrossel:fim-->'],
  cobertura: ['<!--cobertura:inicio-->', '<!--cobertura:fim-->'],
  gta6: ['<!--gta6:inicio-->', '<!--gta6:fim-->'],
  wiki: ['<!--wiki:inicio-->', '<!--wiki:fim-->'],
  players: ['<!--players:inicio-->', '<!--players:fim-->'],
  contagem: ['<!--contagem:inicio-->', '<!--contagem:fim-->'],
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
  for (const pasta of [...categorias.map((c) => c.pasta), 'tag', 'arquivo', 'wiki']) {
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
  const secoes = path.join(site, 'assets', 'data', 'secao'); // mini-busca de uma secao que deixou de existir
  if (fs.existsSync(secoes)) for (const f of fs.readdirSync(secoes)) if (!saidas.has('assets/data/secao/' + f)) lista.push('assets/data/secao/' + f);
  return lista;
}
function apagarOrfaos(ctx, lista) {
  for (const rel of lista) fs.rmSync(path.join(ctx.site, rel), { recursive: true, force: true });
  const colecoes = path.join(ctx.site, 'assets', 'data', 'colecao'); // pastas de colecao que ficaram vazias
  if (fs.existsSync(colecoes)) for (const d of fs.readdirSync(colecoes)) { const abs = path.join(colecoes, d); if (fs.statSync(abs).isDirectory() && !fs.readdirSync(abs).length) fs.rmSync(abs, { recursive: true, force: true }); }
  for (const pasta of [...categorias.map((c) => c.pasta), 'tag', 'arquivo', 'wiki']) {
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

// Dados estruturados das paginas escritas a mao que levam o marcador <!--site:jsonld--> (a home tem os proprios: WebSite + Organization). BL-08: Sobre, Termos, Privacidade, Cortes, Lives e GTA 6.
// O tipo vem desta lista (as que nao estao nela, como Termos e Privacidade, sao WebPage); nome e descricao vem do <title> e da meta description da propria pagina.
const TIPO_DA_PAGINA = { 'sobre.html': 'AboutPage', 'cortes.html': 'CollectionPage', 'lives.html': 'CollectionPage', 'gta6.html': 'CollectionPage' };
function jsonLdDaPagina(ctx, r, html) {
  const titulo = desescapar((html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1] ?? '').replace(/\s*\|\s*BRUBAOGG\s*$/, '').trim();
  const descricao = desescapar((html.match(/<meta\s+name="description"[^>]*\bcontent="([^"]*)"/) ?? html.match(/<meta[^>]*\bcontent="([^"]*)"[^>]*\bname="description"/) ?? [])[1] ?? '');
  const url = `${DOMINIO}/${urlDe(r)}`, tipo = TIPO_DA_PAGINA[r] ?? 'WebPage';
  const canal = { '@type': 'Organization', name: 'BRUBAOGG', url: `${DOMINIO}/` };
  const pagina = {
    '@type': tipo, '@id': `${url}#pagina`, name: titulo, description: descricao, url, inLanguage: 'pt-BR',
    isPartOf: { '@type': 'WebSite', name: 'BRUBAOGG', url: `${DOMINIO}/` }, publisher: canal,
    ...(tipo === 'AboutPage' ? { about: { ...canal, sameAs: SOCIAIS.map((s) => s.url) } } : {}),
  };
  return ctx.dadosEstruturados({ '@context': 'https://schema.org', '@graph': [pagina, ctx.trilha([{ nome: 'Início', url: `${DOMINIO}/` }, { nome: titulo }])] });
}

// monta o HTML final de UMA pagina. Erros vao para `problemas` (nada e gravado se houver algum).
// anuncio de verdade (AdSense): o que esta ligado com os valores de config.mjs (anuncio.mjs explica os tres estados). Com ADS_CLIENTE vazio, nada.
const ADS = situacaoDosAds({ ativos: ADS_ATIVOS, cliente: ADS_CLIENTE, bloco: ADS_BLOCO });

function montarPagina(ctx, r, original, problemas) {
  const { saidas, icone, headerHtml, footerHtml, social, jsonLd, dado, modelo } = ctx;
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
  if (r === 'index.html') {
    for (const [nome, o] of [['feed', 'o feed de ultimas materias'], ['carrossel', 'o carrossel do topo'], ['cobertura', 'a cobertura em andamento']]) if (!html.includes(PARES[nome][0])) erro(`a home precisa dos marcadores ${PARES[nome][0]} e ${PARES[nome][1]} (${o}).`);
  }
  if (['index.html', 'gta6.html'].includes(r) && !html.includes(PARES.contagem[0])) erro(`a pagina ${r} precisa dos marcadores ${PARES.contagem[0]} e ${PARES.contagem[1]} (a contagem regressiva do GTA 6 e, depois da data, o estado lancado: veja GTA6 em config.mjs).`);
  if (r === 'gta6.html' && !html.includes(PARES.gta6[0])) erro(`a pagina do GTA 6 precisa dos marcadores ${PARES.gta6[0]} e ${PARES.gta6[1]} (as novidades).`);
  if (['cortes.html', 'lives.html'].includes(r) && !html.includes(PARES.players[0])) erro(`a pagina ${r} precisa dos marcadores ${PARES.players[0]} e ${PARES.players[1]} (os players e a lista de videos de cada playlist: veja PLAYERS em config.mjs).`);
  if (r === 'wiki.html' && !html.includes(PARES.wiki[0])) erro(`a pagina Wiki precisa dos marcadores ${PARES.wiki[0]} e ${PARES.wiki[1]} (os cartoes dos jogos).`);


  // 3) dados que se repetem (config.mjs): meta com data-modelo, <!--dado:...-->, data-alvo da contagem regressiva
  html = html.replace(/<meta\b[^>]*\bdata-modelo="([^"]*)"[^>]*>/g, (tag, mod) => tag.replace(/\bcontent="[^"]*"/, () => `content="${esc(modelo(desescapar(mod)))}"`));
  html = html.replace(/<!--dado:([\w-]+)-->(?:(?:(?!<!--)[\s\S])*?<!--\/dado-->)?/g, (todo, nome) => {
    const v = dado(nome);
    if (v === undefined) { erro(`marcador <!--dado:${nome}--> com nome desconhecido (veja gerador/modelos.mjs, DADOS).`); return todo; }
    return `<!--dado:${nome}-->${v}<!--/dado-->`;
  });
  html = html.replace(/(\bid="gta-count"[^>]*\bdata-alvo=")[^"]*(")/g, (todo, a, b) => `${a}${dado('gta6-alvo')}${b}`);

  // 4) cabecalho, rodape, icones, novidades do GTA 6, feed da home
  const base = r === '404.html' ? '/' : '../'.repeat(r.split('/').length - 1);
  html = html
    .replace(/<!--site:header-->[\s\S]*?<!--\/site:header-->/, () => `<!--site:header-->${headerHtml(base, r)}<!--/site:header-->`)
    .replace(/<!--site:footer-->[\s\S]*?<!--\/site:footer-->/, () => `<!--site:footer-->${footerHtml(base, r)}<!--/site:footer-->`)
    .replace(/<!--icone:([\w-]+)-->(?:(?:(?!<!--)[\s\S])*?<!--\/icone-->)?/g, (todo, nome) => {
      try { return `<!--icone:${nome}-->${icone(nome)}<!--/icone-->`; }
      catch (e) { erro(`marcador <!--icone:${nome}-->: ${e.message}.`); return todo; }
    });
  if (['index.html', 'gta6.html'].includes(r)) html = html.replace(/<!--contagem:inicio-->[\s\S]*?<!--contagem:fim-->/, () => `<!--contagem:inicio-->\n${contagemHtml(ctx, { faixa: r === 'index.html' })}\n      <!--contagem:fim-->`);
  if (r === 'gta6.html') html = html.replace(/<!--gta6:inicio-->[\s\S]*?<!--gta6:fim-->/, () => `<!--gta6:inicio-->\n${gta6Html(ctx)}\n      <!--gta6:fim-->`);
  if (['cortes.html', 'lives.html'].includes(r)) html = html.replace(/<!--players:inicio-->[\s\S]*?<!--players:fim-->/, () => `<!--players:inicio-->\n${playersHtml(ctx, r)}\n      <!--players:fim-->`);
  if (r === 'wiki.html') html = html.replace(/<!--wiki:inicio-->[\s\S]*?<!--wiki:fim-->/, () => `<!--wiki:inicio-->\n${wikiHtml(ctx)}\n      <!--wiki:fim-->`);
  if (r === 'index.html') {
    html = html.replace(/<!--feed:inicio-->[\s\S]*?<!--feed:fim-->/, () => `<!--feed:inicio-->\n${feedHtml(ctx)}\n      <!--feed:fim-->`);
    html = html.replace(/<!--carrossel:inicio-->[\s\S]*?<!--carrossel:fim-->/, () => `<!--carrossel:inicio-->\n${carrosselHtml(ctx)}\n      <!--carrossel:fim-->`);
    html = html.replace(/<!--cobertura:inicio-->[\s\S]*?<!--cobertura:fim-->/, () => `<!--cobertura:inicio-->\n${coberturaHtml(ctx)}\n      <!--cobertura:fim-->`);  }
  html = html.replace(/<!--site:jsonld-->[\s\S]*?<!--\/site:jsonld-->/, () => `<!--site:jsonld-->\n${r === 'index.html' ? jsonLd() : jsonLdDaPagina(ctx, r, html)}\n<!--/site:jsonld-->`);

  // 5) previa de compartilhamento, a partir do <title> e da meta description da propria pagina (por ultimo: ja com os dados preenchidos)
  if (!geradaPeloSite && html.includes(PARES.social[0])) {
    const titulo = (html.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1];
    const descricao = (html.match(/<meta\s+name="description"[^>]*\bcontent="([^"]*)"/) ?? html.match(/<meta[^>]*\bcontent="([^"]*)"[^>]*\bname="description"/) ?? [])[1];
    const url = (html.match(/<link\s+rel="canonical"\s+href="([^"]*)"/) ?? [])[1];
    if (!titulo || !descricao) erro('a pagina precisa de <title> e <meta name="description"> (a previa de compartilhamento nasce deles).');
    else html = html.replace(/<!--site:social-->[\s\S]*?<!--\/site:social-->/, () => `<!--site:social-->\n${social({ titulo: desescapar(titulo.trim()), descricao: desescapar(descricao), url })}\n<!--/site:social-->`);
  }
  // 5b) o menu lateral/gaveta (bloco <!--site:menu--> logo depois de <body>) NAO existe mais: a faixa de secoes mora no cabecalho. Paginas feitas antes dele sair
  //     ainda trazem o bloco; ele e apagado aqui (nao precisa mexer na mao).
  html = html.replace(/<!--site:menu-->[\s\S]*?<!--\/site:menu-->\n?/, '');
  // 6) recursos que o navegador deve buscar ANTES de precisar: a fonte dos titulos (sem isso o texto de abertura pinta com a fonte errada e "pula" quando
  //    ela chega) e as conexoes com o YouTube (miniaturas nos cartoes, player nas materias). Bloco gerenciado: refeito a cada geracao, em toda pagina.
  html = html.replace(/<!--site:recursos-->[\s\S]*?<!--\/site:recursos-->\n?/, '');
  html = html.replace(/<link rel="stylesheet" href="((?:[^"]*\/)?)assets\/css\/style\.css">/, (link, base) => {
    const linhas = [`<link rel="preload" href="${base}assets/fonts/lilita-one-latin.woff2" as="font" type="font/woff2" crossorigin>`, `<link rel="preload" href="${base}assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>`];
    if (!/<meta name="robots" content="noindex">/.test(html)) linhas.unshift('<meta name="robots" content="max-image-preview:large">'); // o Google pode mostrar a imagem grande (Discover, resultados com miniatura)
    if (!/<meta name="robots" content="noindex">/.test(html)) linhas.push(`<link rel="alternate" type="application/rss+xml" title="${FEED.titulo}: últimas matérias" href="${DOMINIO}/${FEED.arquivo}">`); // o feed (feedRss, abaixo)
    if (html.includes('https://i.ytimg.com/')) linhas.push('<link rel="preconnect" href="https://i.ytimg.com">');
    if (html.includes('youtube-nocookie.com/embed/')) linhas.push('<link rel="preconnect" href="https://www.youtube-nocookie.com">');
    // AdSense: a meta de verificacao em toda pagina indexavel (o Google confirma que o site e da conta); com os anuncios ligados, o anuncio.js em TODA pagina
    // (ele mostra o aviso de cookies, atende o link "Preferencias de cookies" do rodape e so depois do aceite busca o script do Google)
    if (ADS.verificacao && !/<meta name="robots" content="noindex">/.test(html)) linhas.push(metaDeVerificacao(ADS_CLIENTE));
    if (ADS.anuncios) linhas.push(...scriptsDoAnuncio(ADS_CLIENTE, ADS_BLOCO, base));
    return `<!--site:recursos-->\n${linhas.join('\n')}\n<!--/site:recursos-->\n${link}`;
  });
  // 7) espacos de ADS: ligados ou escondidos por ADS_ATIVOS (config.mjs), em toda pagina (os marcadores escritos a mao tambem). Escondido = atributo hidden; o codigo fica.
  //    Com a conta do AdSense preenchida e os anuncios ligados (ADS.anuncios), o marcador da lugar ao bloco de anuncio (anuncio.mjs); o caminho tem volta.
  html = tirarAnuncios(html);
  html = html.replace(/(<div class="ads" data-ads="[^"]*"(?: aria-hidden="true")?)( hidden)?>/g, (todo, inicio) => `${inicio}${ADS_ATIVOS ? '' : ' hidden'}>`);
  if (ADS.anuncios) html = porAnuncios(html, ADS_CLIENTE, ADS_BLOCO);
  html = semHtmlNosEnderecos(r, html);
  return html.replace(/[ \t]+(\r?)$/gm, '$1'); // sem espaco sobrando no fim das linhas
}

// Ultimo passo de toda pagina (gerada ou escrita a mao): tira o .html dos enderecos internos (links relativos em href="..." e enderecos completos do proprio dominio, como o
// canonical e o og:url). Fica de fora so quem esta em _conteudo/paginas-com-html.json (urlDe, util.mjs). Idempotente: rodar de novo nao muda mais nada.
function semHtmlNosEnderecos(r, html) {
  const dominio = DOMINIO.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  html = html.replace(new RegExp(`${dominio}/([^"'\\s<>#?)]+?)\\.html(?=[#?"'\\s<>)]|$)`, 'g'), (todo, p) => (urlDe(`${p}.html`) === `${p}.html` ? todo : `${DOMINIO}/${p}`));
  return html.replace(/(\bhref=")([^"]+)(")/g, (todo, a, v, c) => {
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(v)) return todo;
    const m = v.match(/^([^#?]*)([#?].*)?$/), p = m[1];
    if (!p.endsWith('.html')) return todo;
    const alvo = p.startsWith('/') ? p.slice(1) : posix.normalize(posix.join(posix.dirname(r), p));
    return urlDe(alvo) === alvo ? todo : `${a}${p.slice(0, -5)}${m[2] ?? ''}${c}`;
  });
}

// ---- lastmod: a data da ULTIMA MUDANCA de cada pagina, guardada em _conteudo/lastmod.json ----
// Nao depende da data do arquivo (que muda em clone novo ou em build no servidor): so muda quando o conteudo da pagina muda.
// Na primeira vez (arquivo ainda nao existe) parte da data dos arquivos, para nao zerar o historico.
//
// O que conta como "conteudo da pagina" e o MIOLO dela (mioloDaPagina): o <main>, sem os blocos que mudam sozinhos sem ninguem
// editar a pagina (materias relacionadas, que se reorganizam a cada materia nova, e a contagem do GTA 6). Antes a conta usava a
// pagina inteira, e uma materia nova trocava a data de dezenas de materias antigas: o Google so usa o lastmod se ele for coerente.
// Registro por pagina: { m: assinatura do miolo, d: data }. Registros antigos (com "h", da pagina inteira) mantem a data que tinham
// e ganham o "m" na primeira geracao. Pagina sem registro: usa a data da propria materia (<time datetime>), para a data nao mudar
// a cada publicacao automatica enquanto o lastmod.json novo nao e commitado; pagina sem <time> (listas, tags) usa a data de hoje.
function mioloDaPagina(html) {
  const main = html.match(/<main\b[\s\S]*<\/main>/)?.[0] ?? html;
  return main
    .replace(/<section class="related"[^>]*>[\s\S]*?<\/section>/g, '')
    .replace(/\n[ \t]*<div class="ads-materia"[^>]*>[\s\S]*?<\/div><\/div>/g, '') // o espaco de anuncio da materia (paginas.mjs, adsDaMateria): anuncio nao e conteudo
    .replace(/<!--contagem:inicio-->[\s\S]*?<!--contagem:fim-->/g, '');
}

// DATA DE MODIFICACAO DA MATERIA (18/11/2026): o "dateModified" dos dados estruturados (Article) acompanha a data do sitemap (lastmod.json), que e a data da
// ultima mudanca do MIOLO da pagina. Antes ele repetia a data de publicacao para sempre, e o Google lia duas datas diferentes para a mesma materia.
// Regra: se a pagina mudou num dia DEPOIS do dia da publicacao (dias de Sao Paulo), dateModified = esse dia (AAAA-MM-DD, sem hora: o site nao guarda a hora da
// mudanca e nao inventa uma); senao, fica igual ao datePublished. A data de PUBLICACAO nunca muda. Os dados ficam no <head>, fora do miolo: esta troca nao
// mexe na conta da data do sitemap.
const DATAS_DO_ARTIGO = /("datePublished":"([^"]+)","dateModified":")[^"]+(")/;
export function comDataDeModificacao(html, dia) {
  if (!dia || !/<main class="article /.test(html)) return html;
  return html.replace(DATAS_DO_ARTIGO, (todo, inicio, publicado, fim) => {
    const t = Date.parse(publicado);
    const diaDaPublicacao = Number.isNaN(t) ? '' : new Date(t).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
    return `${inicio}${diaDaPublicacao && dia > diaDaPublicacao ? dia : publicado}${fim}`;
  });
}

function atualizarLastmod(ctx, finais) {
  const { site } = ctx;
  const arq = path.join(site, '_conteudo', 'lastmod.json');
  const antigo = fs.existsSync(arq) ? lerJson(arq, '_conteudo/lastmod.json') : null;
  const hoje = hojeEmSaoPaulo();
  const novo = {};
  for (const r of [...finais.keys()].sort()) {
    const html = finais.get(r);
    const m = crypto.createHash('md5').update(mioloDaPagina(html)).digest('hex').slice(0, 12);
    const ant = antigo?.[r];
    const dataDoArquivo = () => { const p = path.join(site, r); return fs.existsSync(p) ? fs.statSync(p).mtime.toISOString().slice(0, 10) : hoje; };
    const dataDaMateria = () => { const d = html.match(/<time\b[^>]*\bdatetime="(\d{4}-\d{2}-\d{2})/)?.[1]; return d && d <= hoje ? d : null; };
    let d;
    if (ant?.m) d = ant.m === m ? ant.d : hoje; // mudou o miolo: a data e a de hoje
    else if (ant) d = ant.d; // registro do formato antigo: mantem a data
    else d = antigo ? (dataDaMateria() ?? hoje) : dataDoArquivo();
    novo[r] = { m, d };
  }
  if (!modoDeTeste(ctx)) gravarSeMudou(arq, `${JSON.stringify(novo, null, 1)}\n`); // as previas de teste nao mexem nas datas reais
  return novo;
}

// IMAGENS NO SITEMAP (18/11/2026): cada materia diz ao Google quais imagens sao DELA (<image:image>, extensao de imagens do sitemap).
// Entram so as imagens da pasta da materia (https://img.brubaogg.com.br/m/<id>/: as do texto e a capa propria do video) que estao dentro do <article>,
// na MAIOR largura do srcset. Ficam de fora: logo, foto do autor, icones, miniaturas do YouTube (nao sao do site) e os cartoes de
// outras materias. Lido do HTML final de proposito: o sitemap so lista imagem que a pagina realmente mostra.
function imagensDaMateria(html, r) {
  if (!/<main class="article /.test(html)) return [];
  const artigo = html.match(/<article>([\s\S]*?)<\/article>/)?.[1] ?? '';
  const vistas = new Set();
  for (const tag of artigo.match(/<img\b[^>]*>/g) ?? []) {
    const src = tag.match(/\bsrc="([^"]+)"/)?.[1] ?? '';
    if (!src.startsWith(`${ENDERECO_DAS_IMAGENS}/${PASTA_NO_R2}/`)) continue;
    const maior = (tag.match(/\bsrcset="([^"]+)"/)?.[1] ?? '').split(',').map((x) => x.trim().split(/\s+/)).filter(([u]) => u)
      .map(([u, w]) => ({ u, w: parseInt(w, 10) || 0 })).sort((a, b) => b.w - a.w)[0]?.u ?? src;
    vistas.add(new URL(maior, `${DOMINIO}/${r}`).href);
  }
  return [...vistas];
}

function sitemapERobots(ctx, lastmod) {
  const { site } = ctx;
  const semIndice = new Set(['404.html', 'busca.html']);
  const urls = [];
  (function varrer(dir, rel) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (NAO_VARRER.has(e.name)) continue;
      const abs = path.join(dir, e.name), r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) { varrer(abs, r); continue; }
      if (!e.name.endsWith('.html') || semIndice.has(r)) continue;
      const html = fs.readFileSync(abs, 'utf8');
      if (/content="noindex"|http-equiv="refresh"/.test(html)) continue;
      urls.push({ r, mod: lastmod[r]?.d ?? fs.statSync(abs).mtime.toISOString().slice(0, 10), imagens: imagensDaMateria(html, r) });
    }
  })(site, '');
  urls.sort((a, b) => (a.r === 'index.html' ? -1 : b.r === 'index.html' ? 1 : a.r.localeCompare(b.r)));
  const loc = (r) => (r === 'index.html' ? `${DOMINIO}/` : `${DOMINIO}/${urlDe(r)}`);
  const xml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...urls.map((u) => `  <url><loc>${loc(u.r)}</loc><lastmod>${u.mod}</lastmod>${u.imagens.map((i) => `<image:image><image:loc>${xml(i)}</image:loc></image:image>`).join('')}</url>`),
    '</urlset>',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(site, 'sitemap.xml'), sitemap, 'utf8');
  fs.writeFileSync(path.join(site, 'robots.txt'), ['User-agent: *', 'Allow: /', 'Disallow: /pagefind/', '', `Sitemap: ${DOMINIO}/sitemap.xml`, ''].join('\n'), 'utf8');
}

// ---- feed.xml (RSS): as materias mais recentes, para leitores de feed e robos saberem do que saiu sem varrer o site ----
// Nasce das listas por mes (assets/data/lista/AAAA-MM.json), que ja trazem so o que esta publicado (materia agendada so entra na hora).
// Nao leva a hora da geracao: o arquivo so muda quando entra materia nova. As paginas apontam para ele no <head> (bloco site:recursos).
export const FEED = { arquivo: 'feed.xml', titulo: 'BRUBAOGG', descricao: 'Notícias, reviews, lançamentos e histórias de games do canal BRUBAOGG.', qtd: 30 };
const xml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function feedRss(ctx) {
  const { site, saidas } = ctx;
  const ehLista = (r) => /^assets\/data\/lista\/\d{4}-\d{2}\.json$/.test(r);
  const pasta = path.join(site, 'assets', 'data', 'lista');
  const meses = [...saidas.keys()].some(ehLista)
    ? [...saidas].filter(([r]) => ehLista(r)).map(([, c]) => c)
    : fs.existsSync(pasta) ? fs.readdirSync(pasta).filter((n) => /^\d{4}-\d{2}\.json$/.test(n)).map((n) => fs.readFileSync(path.join(pasta, n), 'utf8')) : [];
  const itens = meses.flatMap((c) => { const j = JSON.parse(c); return Array.isArray(j) ? j : Object.values(j); })
    .filter((i) => i?.u && i?.t && i?.dt)
    .sort((a, b) => b.dt.localeCompare(a.dt) || a.u.localeCompare(b.u))
    .slice(0, FEED.qtd);
  const abs = (u) => (/^https?:/.test(u) ? u : `${DOMINIO}/${String(u).replace(/^\//, '')}`);
  const rss = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:media="http://search.yahoo.com/mrss/">',
    '<channel>',
    `  <title>${xml(FEED.titulo)}</title>`,
    `  <link>${DOMINIO}/</link>`,
    `  <description>${xml(FEED.descricao)}</description>`,
    '  <language>pt-BR</language>',
    `  <atom:link href="${DOMINIO}/${FEED.arquivo}" rel="self" type="application/rss+xml"/>`,
    ...(itens[0] ? [`  <lastBuildDate>${new Date(itens[0].dt).toUTCString()}</lastBuildDate>`] : []),
    ...itens.map((i) => [
      '  <item>',
      `    <title>${xml(i.t)}</title>`,
      `    <link>${xml(abs(i.u))}</link>`,
      `    <guid isPermaLink="true">${xml(abs(i.u))}</guid>`,
      `    <pubDate>${new Date(i.dt).toUTCString()}</pubDate>`,
      ...(i.c ? [`    <category>${xml(i.c)}</category>`] : []),
      ...(i.r ? [`    <description>${xml(i.r)}</description>`] : []),
      ...(i.i ? [`    <media:thumbnail url="${xml(abs(i.i))}"/>`] : []),
      '  </item>',
    ].join('\n')),
    '</channel>',
    '</rss>',
    '',
  ].join('\n');
  gravarSeMudou(path.join(site, FEED.arquivo), rss);
}

// materias que ja foram publicadas (estao no registro) mas cuja pagina NAO sera mais gerada: o link vai dar 404
function paginasQueSumiriam(ctx) {
  const sumiriam = [];
  for (const [id, e] of Object.entries(ctx.enderecos)) {
    if (e.retirada || ctx.materias.get(id)?.situacao === 'agendada') continue; // agendada: o endereco ja existe, mas a pagina so sai na hora
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
  const problemas = [...ADS.problemas];
  for (const r of paginasDoSite(ctx, apagar)) {
    const original = saidas.has(r) ? saidas.get(r) : fs.readFileSync(path.join(site, r), 'utf8');
    finais.set(r, montarPagina(ctx, r, original, problemas));
  }
  if (problemas.length) throw new ErroDeDados(`O gerador parou: ${problemas.length} problema(s) nas paginas (nada foi gravado).\n${problemas.map((p) => `  - ${p}`).join('\n')}`);

  // 1b) datas: a do sitemap (lastmod.json) e, nas materias, a de modificacao dos dados estruturados, que a acompanha (comDataDeModificacao)
  const datas = atualizarLastmod(ctx, finais);
  for (const [r, html] of finais) { const novo = comDataDeModificacao(html, datas[r]?.d); if (novo !== html) finais.set(r, novo); }

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

  sitemapERobots(ctx, datas);
  // ads.txt (raiz do site): gerado a partir de ADS_CLIENTE, nunca escrito a mao (uma virgula errada e o Google ignora o arquivo). Sem conta, nao existe.
  const adsTxt = path.join(site, 'ads.txt');
  if (ADS.verificacao) gravarSeMudou(adsTxt, `${linhaDoAdsTxt(ADS_CLIENTE)}\n`);
  else if (fs.existsSync(adsTxt) && EH_ADS_TXT_GERADO.test(fs.readFileSync(adsTxt, 'utf8'))) fs.rmSync(adsTxt);
  if (!modoDeTeste(ctx)) feedRss(ctx); // as previas de teste (rascunhos) nao entram no feed
}
