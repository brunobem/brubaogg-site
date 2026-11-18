// JavaScript do site (busca.js e contador.js) e os dados que a busca consome. Sem navegador: roda os scripts num navegador de mentira (dom-falso.mjs).
// O que depende de navegador de verdade (teclado, foco, leitor de tela, Pagefind de verdade) fica em js.html.
import vm from 'node:vm';
import zlib from 'node:zlib';
import { achado, arquivoDe, arquivosPublicados, assuntosDoSite, existe, ler, limparHtml, tags } from './lib.mjs';
import { documentoVazio, montarPagina, rodarScript } from './dom-falso.mjs';
import { WIKI, categorias } from '../../gerador/config.mjs';

const T = 'js';
const lerJson = (rel) => JSON.parse(ler(rel));
const gz = (rel) => zlib.gzipSync(Buffer.from(ler(rel))).length;
// o proprio navegador nao codifica surrogate solto (encodeURIComponent daria erro): troca por U+FFFD, como o URLSearchParams faz
const codificar = (s) => encodeURIComponent(String(s).replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '�'));

export default async function () {
  const a = [];
  const publicados = arquivosPublicados();
  const paginas = publicados.filter((r) => r.endsWith('.html'));
  const html = new Map(paginas.map((r) => [r, ler(r)]));
  const redirecionamento = (h) => /http-equiv="refresh"/.test(h);

  // ---------- 1) os scripts: sintaxe, modo estrito, nada perigoso ----------
  for (const rel of publicados.filter((r) => r.startsWith('assets/js/') && r.endsWith('.js'))) {
    const codigo = ler(rel);
    try { new vm.Script(codigo, { filename: rel }); } catch (e) { a.push(achado('critico', T, `erro de sintaxe: ${e.message}`, rel)); continue; }
    if (!/^[\s\S]{0,2000}'use strict'/.test(codigo)) a.push(achado('baixo', T, "sem 'use strict'", rel));
    const semComentarios = codigo.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    for (const [re, quem] of [[/\binnerHTML\b/, 'innerHTML'], [/\bouterHTML\b/, 'outerHTML'], [/\binsertAdjacentHTML\b/, 'insertAdjacentHTML'], [/\bdocument\.write\b/, 'document.write'], [/\beval\s*\(/, 'eval'], [/\bnew Function\b/, 'new Function']]) {
      if (re.test(semComentarios)) a.push(achado('alto', T, `usa ${quem}: texto de fora so pode entrar na pagina por textContent/createTextNode`, rel));
    }
    const kb = gz(rel) / 1024;
    if (kb > 12) a.push(achado('baixo', T, `script com ${kb.toFixed(1)} KB comprimidos (carrega em todas as paginas)`, rel));
  }

  // ---------- 2) paginas: o script certo, no lugar certo ----------
  let comBusca = 0, comContador = 0;
  for (const [rel, h] of html) {
    if (redirecionamento(h)) continue;
    const limpo = limparHtml(h);
    const form = tags(limpo).find((t) => t.nome === 'form' && /\bsearch\b/.test(t.attrs.class ?? ''));
    if (form) {
      comBusca++;
      const prof = rel.split('/').length - 1, base = rel === '404.html' ? '/' : '../'.repeat(prof);
      if (form.attrs['data-base'] !== base) a.push(achado('alto', T, `data-base="${form.attrs['data-base']}" (o certo, pela pasta da pagina, e "${base}"): a busca nao acha os arquivos de dados`, rel));
      if (form.attrs.action !== `${base}busca.html` || (form.attrs.method ?? '').toLowerCase() !== 'get') a.push(achado('medio', T, `o formulario de busca precisa de action="${base}busca.html" method="get" (sem JavaScript o Enter nao leva a lugar nenhum)`, rel));
      if (!/<script[^>]*src="[^"]*assets\/js\/busca\.js"[^>]*\bdefer\b/.test(h)) a.push(achado('alto', T, 'pagina com busca sem <script src=".../busca.js" defer>', rel));
      if (!/id="search-status"[^>]*aria-live="polite"|aria-live="polite"[^>]*id="search-status"/.test(h)) a.push(achado('medio', T, 'falta a area de aviso para leitor de tela (id="search-status" aria-live="polite")', rel));
    } else if (/busca\.js/.test(h)) a.push(achado('baixo', T, 'carrega busca.js mas nao tem o formulario de busca', rel));
    if (/\bid="gta-count"/.test(h)) {
      comContador++;
      if (!/<script[^>]*src="[^"]*assets\/js\/contador\.js"[^>]*\bdefer\b/.test(h)) a.push(achado('alto', T, 'pagina com contagem regressiva sem <script src=".../contador.js" defer>', rel));
      for (const id of ['cd-d', 'cd-h', 'cd-m', 'cd-s', 'gta-title']) if (!new RegExp(`id="${id}"`).test(h)) a.push(achado('alto', T, `contagem regressiva sem o elemento id="${id}"`, rel));
      const alvo = (h.match(/id="gta-count"[^>]*data-alvo="([^"]*)"/) ?? [])[1];
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/.test(alvo ?? '') || Number.isNaN(Date.parse(alvo))) a.push(achado('alto', T, `data-alvo="${alvo}" sem hora e fuso: a contagem acabaria na hora errada`, rel));
      if (!/<noscript><style>[^<]*#gta-count[^<]*display:\s*none/.test(h)) a.push(achado('baixo', T, 'sem <noscript><style>#gta-count{display:none}</style></noscript>: sem JavaScript aparece "-- dias -- horas"', rel));
    }
  }
  if (!comBusca) a.push(achado('alto', T, 'nenhuma pagina com formulario de busca'));

  // ---------- 3) dados da busca: listas por mes, manifesto, atalhos, pagina 1 em HTML ----------
  if (!existe('assets/data/lista/manifesto.json') || !existe('assets/data/atalhos.json')) { a.push(achado('critico', T, 'faltam assets/data/lista/manifesto.json ou assets/data/atalhos.json (rode npm run gerar)')); return a; }
  const manifesto = lerJson('assets/data/lista/manifesto.json');
  const todas = [];
  for (const mes of manifesto.meses) {
    const rel = `assets/data/lista/${mes.m}.json`;
    if (!existe(rel)) { a.push(achado('critico', T, `o manifesto cita ${mes.m} mas o arquivo nao existe`, rel)); continue; }
    const lista = lerJson(rel);
    if (lista.length !== mes.n) a.push(achado('alto', T, `o manifesto diz ${mes.n} materias em ${mes.m} e o arquivo tem ${lista.length}`, rel));
    if (gz(rel) / 1024 > 60) a.push(achado('baixo', T, `lista do mes com ${(gz(rel) / 1024).toFixed(0)} KB comprimidos (cada "Ver mais" baixa um ou dois destes)`, rel));
    for (const e of lista) {
      if (!(e.t && e.u && e.c && e.dt)) a.push(achado('alto', T, `item sem titulo, endereco, categoria ou data: ${JSON.stringify(e).slice(0, 80)}`, rel));
      if (!existe(e.u)) a.push(achado('alto', T, `a lista aponta para uma pagina que nao existe: ${e.u}`, rel));
      if (!/^(?:https:\/\/|\/assets\/img\/[\w\-./]+$)/.test(e.i ?? '') || (e.i ?? '').includes('..')) a.push(achado('medio', T, `miniatura sem https (ou fora de /assets/img/): ${e.i}`, rel));
      if (!manifesto.categorias.includes(e.c)) a.push(achado('alto', T, `categoria "${e.c}" fora do manifesto`, rel));
      if (new Date(e.dt).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) !== mes.m) a.push(achado('alto', T, `item de ${e.dt} no arquivo de ${mes.m}`, rel));
      todas.push(e);
    }
  }
  const enderecos = new Set(todas.map((e) => arquivoDe(e.u)));
  if (enderecos.size !== todas.length) a.push(achado('alto', T, `${todas.length - enderecos.size} materia(s) repetida(s) nas listas por mes`));
  if (!todas.every((e, i) => i === 0 || todas[i - 1].dt >= e.dt)) a.push(achado('alto', T, 'as listas por mes nao estao do mais novo para o mais velho (o "Ver mais" mostraria fora de ordem)'));
  const noSite = publicados.filter((r) => /^(noticias|reviews|lancamentos|gta6-novidades|series)\//.test(r) && r.endsWith('.html') && !redirecionamento(html.get(r)) && !/content="noindex"/.test(html.get(r)));
  const faltam = noSite.filter((r) => !enderecos.has(r));
  if (faltam.length) a.push(achado('alto', T, `${faltam.length} materia(s) publicada(s) fora das listas por mes (nunca apareceriam em "mais recentes"): ${faltam.slice(0, 2).join(', ')}`));

  // pagina 1 pronta no HTML = os 30 primeiros da lista (se divergir, o "Ver mais" repete ou pula materias)
  const busca = html.get('busca.html') ?? '';
  const cartoes = [...busca.matchAll(/<a class="news-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
  const esperados = todas.slice(0, manifesto.passo).map((e) => e.u);
  if (JSON.stringify(cartoes) !== JSON.stringify(esperados)) a.push(achado('alto', T, `os ${cartoes.length} cartoes da pagina 1 de busca.html nao sao os ${esperados.length} primeiros das listas por mes`, 'busca.html'));
  for (const id of ['busca-lista', 'busca-mais', 'busca-status', 'busca-filtros', 'busca-titulo', 'busca-atalhos', 'busca-icones']) if (!new RegExp(`id="${id}"`).test(busca)) a.push(achado('alto', T, `busca.html sem o elemento id="${id}"`, 'busca.html'));
  if (Number((busca.match(/id="busca-mais"[^>]*data-total="(\d+)"/) ?? [])[1]) !== todas.length) a.push(achado('alto', T, `data-total do botao "Ver mais" diferente do total de materias (${todas.length})`, 'busca.html'));
  if ((busca.match(/data-categorias="([^"]*)"/) ?? [])[1] !== manifesto.categorias.join('|')) a.push(achado('medio', T, 'data-categorias de busca.html diferente do manifesto', 'busca.html'));
  if (!/<noscript>/.test(busca)) a.push(achado('baixo', T, 'busca.html sem aviso <noscript>', 'busca.html'));

  const atalhos = lerJson('assets/data/atalhos.json');
  for (const e of atalhos) if (!e.t || !existe(e.u)) a.push(achado('alto', T, `atalho para pagina que nao existe: ${e.t} -> ${e.u}`, 'assets/data/atalhos.json'));
  if (gz('assets/data/atalhos.json') / 1024 > 80) a.push(achado('baixo', T, `atalhos.json com ${(gz('assets/data/atalhos.json') / 1024).toFixed(0)} KB comprimidos (baixa na primeira busca)`));

  // ---------- 3b) "Ver mais" das listas: pagina 1 + blocos de 90 = a lista inteira, sem repetir nem pular ----------
  const idsComBotao = new Set();
  for (const [rel, h] of html) {
    for (const m of h.matchAll(/<button[^>]*data-colecao="([^"]+)"[^>]*data-total="(\d+)"/g)) {
      const [, id, total] = m; idsComBotao.add(id);
      const grade = (h.match(new RegExp('data-lista="' + id + '"[^>]*>([\\s\\S]*?)</(?:section|div)>')) ?? [])[1] ?? '';
      const naPagina = [...grade.matchAll(/<a class="news-card[^"]*" href="([^"]+)"/g)].map((x) => x[1].replace(/^(\.\.\/)+/, ''));
      if (naPagina.length !== manifesto.passo) a.push(achado('alto', T, `lista "${id}": a pagina tem ${naPagina.length} cartoes e deveria ter ${manifesto.passo} (o "Ver mais" repete ou pula materias)`, rel));
      if (!/<template id="busca-icones">/.test(h)) a.push(achado('alto', T, `lista "${id}": falta o modelo de icones (<template id="busca-icones">) para os cartoes montados pelo JavaScript`, rel));
      const itens = []; let k = 1;
      while (existe(`assets/data/colecao/${id}/${k}.json`)) {
        const bloco = lerJson(`assets/data/colecao/${id}/${k}.json`);
        itens.push(...bloco);
        k++;
        if (existe(`assets/data/colecao/${id}/${k}.json`) && bloco.length !== 90) a.push(achado('alto', T, `lista "${id}": o bloco ${k - 1} tem ${bloco.length} itens (todos menos o ultimo devem ter 90)`, `assets/data/colecao/${id}/${k - 1}.json`));
      }
      if (itens.length !== Number(total)) a.push(achado('alto', T, `lista "${id}": data-total=${total} mas os blocos somam ${itens.length}`, rel));
      const todosOsEnderecos = [...naPagina, ...itens.map((e) => e.u)];
      if (new Set(todosOsEnderecos).size !== todosOsEnderecos.length) a.push(achado('alto', T, `lista "${id}": materia repetida entre a pagina 1 e os blocos`, rel));
      for (const e of itens) if (!existe(e.u)) a.push(achado('alto', T, `lista "${id}": aponta para pagina que nao existe: ${e.u}`, `assets/data/colecao/${id}`));
      const datas = itens.map((e) => e.dt); if (!datas.every((d, i) => i === 0 || datas[i - 1] >= d)) a.push(achado('alto', T, `lista "${id}": blocos fora de ordem (mais novo primeiro)`, `assets/data/colecao/${id}`));
      if (id.startsWith('cat-')) { // a pagina de categoria precisa ter TODAS as materias da categoria
        const pasta = id.slice(4), pastas = [pasta, ...categorias.filter((c) => c.tambemEm === pasta).map((c) => c.pasta)], esperadas = todas.filter((e) => pastas.some((p) => e.u.startsWith(`${p}/`))).length; // a lista tambem tem as categorias que dizem tambemEm dela
        if (naPagina.length + itens.length !== esperadas) a.push(achado('alto', T, `lista "${id}": ${naPagina.length + itens.length} materias na pagina + blocos, mas a categoria tem ${esperadas}`, rel));
      }
    }
  }
  for (const f of arquivosPublicados().filter((r) => r.startsWith('assets/data/colecao/'))) if (!idsComBotao.has(f.split('/')[3])) a.push(achado('medio', T, 'bloco de lista sem nenhuma pagina com o botao "Ver mais" (arquivo sobrando)', f));

  // ---------- 4) marcas do Pagefind nas materias ----------
  for (const r of noSite) {
    const h = html.get(r);
    if ((h.match(/data-pagefind-body/g) ?? []).length !== 1) a.push(achado('alto', T, 'a materia precisa de exatamente 1 data-pagefind-body (senao ela nao entra no indice da busca)', r));
    if (!/data-pagefind-filter="categoria:[^"]+"/.test(h)) a.push(achado('alto', T, 'sem filtro de categoria para o Pagefind', r));
    if (!/data-pagefind-sort="data\[datetime\]"/.test(h)) a.push(achado('medio', T, 'sem data para ordenar no Pagefind', r));
    if (!/data-pagefind-meta="image:(?:https:\/\/|\/assets\/img\/[\w\-./]+[",])/.test(h)) a.push(achado('medio', T, 'sem miniatura nos dados do Pagefind', r));
  }
  for (const r of paginas.filter((p) => !noSite.includes(p))) if (/data-pagefind-body/.test(html.get(r))) a.push(achado('medio', T, 'pagina que nao e materia esta marcada para o indice da busca', r));

  // ---------- 5) funcoes puras da busca ----------
  let api;
  try { api = rodarScript('busca.js', { doc: documentoVazio() }).janela.BrubaoBusca; } catch (e) { a.push(achado('critico', T, `busca.js lancou erro ao carregar: ${e.message}`, 'assets/js/busca.js')); return a; }
  if (!api) { a.push(achado('critico', T, 'busca.js nao expoe window.BrubaoBusca')); return a; }
  const iguais = (x, y) => JSON.stringify(x) === JSON.stringify(y);
  const confere = (nome, obtido, esperado) => { if (!iguais(obtido, esperado)) a.push(achado('alto', T, `${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`, 'assets/js/busca.js')); };
  confere('variantes("gta6")', api.variantes('gta6'), ['gta6', 'gta 6']);
  confere('variantes("GTA-6")', api.variantes('GTA-6'), ['gta 6']);
  confere('variantes("ps5")', api.variantes('ps5'), ['ps5', 'ps 5']);
  confere('variantes("resident_evil")', api.variantes('resident_evil'), ['resident evil']);
  confere('variantes("  Mídia  FÍSICA ")', api.variantes('  Mídia  FÍSICA '), ['midia fisica']);
  confere('variantes("")', api.variantes('  '), []);
  confere('consultaValida("g")', api.consultaValida('g'), false);
  confere('consultaValida("gt")', api.consultaValida('gt'), true);
  confere('consultaValida("!!")', api.consultaValida('!!'), false);
  confere('estadoDaUrl vazio', api.estadoDaUrl(''), { q: '', cat: '', n: 30 });
  confere('estadoDaUrl completo', api.estadoDaUrl('?q=gta+6&cat=Review&n=90'), { q: 'gta 6', cat: 'Review', n: 90 });
  confere('estadoDaUrl n quebrado', [api.estadoDaUrl('?n=abc').n, api.estadoDaUrl('?n=-5').n, api.estadoDaUrl('?n=45').n, api.estadoDaUrl('?n=999999999').n], [30, 30, 60, 1500]);
  confere('estadoDaUrl q longo', api.estadoDaUrl(`?q=${'a'.repeat(5000)}`).q.length, 200);
  confere('urlDoEstado', [api.urlDoEstado({ q: ' gta 6 ', cat: 'Review', n: 60 }), api.urlDoEstado({ q: '', cat: '', n: 30 })], ['?q=gta+6&cat=Review&n=60', '']);
  const sa = [{ t: 'GTA 6', u: 'gta6.html', c: 'Página' }, { t: 'Resident Evil', u: 'tag/re.html', c: 'Tag' }, { t: 'Resident Evil 7', u: 'tag/re7.html', c: 'Tag' }, { t: 'God of War', u: 'tag/gow.html', c: 'Tag' }];
  confere('atalhos "gta6"', api.atalhosPara(sa, 'gta6').map((x) => x.t), ['GTA 6']);
  confere('atalhos "evil" (comeco de palavra)', api.atalhosPara(sa, 'evil').map((x) => x.t), ['Resident Evil', 'Resident Evil 7']);
  confere('atalhos "vil" (meio de palavra nao casa)', api.atalhosPara(sa, 'vil').map((x) => x.t), []);
  // BL-20 (UX-12): com os dados REAIS, digitar o nome de um jogo que tem Wiki mostra a pagina da Wiki entre os 3 atalhos da caixa de sugestoes (MAX_ATALHOS em busca.js)
  for (const w of atalhos.filter((e) => e.c === 'Wiki')) {
    const nome = w.t.replace(/ \(Wiki\)$/, '').toLowerCase(), topo = api.atalhosPara(atalhos, nome).slice(0, 3).map((x) => x.u);
    if (!topo.includes(w.u)) a.push(achado('medio', T, `digitar "${nome}" nao mostra a Wiki entre os 3 atalhos (${topo.join(', ')}): as paginas de Wiki devem vir primeiro em atalhos.json`, 'assets/data/atalhos.json'));
  }
  confere('atalhos exato primeiro', api.atalhosPara(sa, 'resident evil 7').map((x) => x.t), ['Resident Evil 7']);
  confere('combinar', api.combinar([{ id: 'a', score: 10 }, { id: 'b', score: 5 }, { id: 'c', score: 1 }], [{ id: 'c' }, { id: 'b' }, { id: 'a' }], 10).map((x) => x.id), ['b', 'a', 'c']);
  confere('caminhoSeguro', ['noticias/x.html', 'javascript:alert(1)', '//evil.com/x', '../x', 'a b', '/x.html'].map(api.caminhoSeguro), [true, false, false, false, false, false]);
  confere('imagemSegura', ['https://i.ytimg.com/vi/abc/hqdefault.jpg', 'http://x.com/a.jpg', 'javascript:1', 'data:image/png;base64,AAA'].map(api.imagemSegura), [true, false, false, false]);
  confere('imagemSegura (capa da Wiki, so /assets/img/arquivo)', ['/assets/img/wiki-capa.svg', '//evil.com/x.jpg', '/assets/img/../x.jpg', '/assets/img/a/b.jpg', '/outra/pasta/x.jpg'].map(api.imagemSegura), [true, false, false, false, false]);
  // fuzz: nenhum texto, por mais estranho que seja, derruba as funcoes
  const alfabeto = ['a', 'Z', '5', ' ', '-', '_', '.', '*', '(', '\\', '"', "'", '<', '>', '&', '%', '́', 'é', 'ç', '日', '🙂', '\uD800', '\u0000', '\n', '\t'];
  let semente = 12345; const rnd = (n) => { semente = (semente * 1103515245 + 12345) & 0x7fffffff; return semente % n; };
  let quebrou = 0, primeiro = '';
  for (let i = 0; i < 4000; i++) {
    const s = Array.from({ length: rnd(40) }, () => alfabeto[rnd(alfabeto.length)]).join('');
    try {
      const vs = api.variantes(s); api.consultaValida(s); api.norm(s); api.chave(s);
      const est = api.estadoDaUrl(`?q=${codificar(s)}&cat=${codificar(s)}&n=${rnd(5000)}`);
      if (est.n < 30 || est.n > 1500 || est.q.length > 200) throw new Error(`estado fora dos limites: ${JSON.stringify(est)}`);
      api.urlDoEstado(est); api.atalhosPara(sa, s);
      if (vs.some((v) => /^\s|\s$|\s\s/.test(v))) throw new Error(`variante com espaco sobrando: ${JSON.stringify(vs)}`);
    } catch (e) { quebrou++; primeiro ||= `${JSON.stringify(s)} -> ${e.message}`; }
  }
  if (quebrou) a.push(achado('alto', T, `${quebrou} texto(s) estranho(s) derrubaram as funcoes de busca (primeiro: ${primeiro})`, 'assets/js/busca.js'));

  // ---------- 5b) mini-busca da secao (secao.js): paginas, dados e funcoes puras ----------
  // So Noticias, Reviews, Lancamentos e Wiki tem (decisao do dono); GTA 6, Cortes, Lives, a home e as Series nao. Noticias e Lancamentos so com o campo de busca; Reviews tem
  // um menu lateral de plataformas e a Wiki um de jogos (com os cartoes ao lado). A lista de sempre fica DENTRO da busca, visivel e sem JavaScript.
  const COM_MINIBUSCA = ['noticias.html', 'reviews.html', 'lancamentos.html', 'wiki.html'];
  const SEM_MINIBUSCA = ['index.html', 'gta6.html', 'cortes.html', 'lives.html', 'series.html', 'sobre.html', 'tags.html', 'arquivo.html'];
  const MENU_DA_PAGINA = { 'reviews.html': 'pl', 'wiki.html': 'jogo' };
  // itens por secao = materias no ar, com as de um mesmo "assunto" (2 ou mais) contadas UMA vez (a pagina do assunto); inclui as categorias que dizem tambemEm dela (tudo de GTA 6 tambem e noticia)
  const { esperadosPorCategoria } = assuntosDoSite();
  const doRegSecao = (cat) => Object.entries(esperadosPorCategoria).filter(([pasta]) => pasta === cat || categorias.some((c) => c.pasta === pasta && c.tambemEm === cat)).reduce((s, [, n]) => s + n, 0);
  const esperadosSecao = { 'noticias.html': doRegSecao('noticias'), 'reviews.html': doRegSecao('reviews'), 'lancamentos.html': doRegSecao('lancamentos') };
  // le o menu lateral de uma pagina: { g, topo: [{ v, href, n, expande, pressionado }], paineis: [{ pai, subs: [{ v, n, vazio, href, pressionado }] }] } ou null
  const lerMenu = (h) => {
    const m = h.match(/<div class="secao-menu"[^>]*data-grupo="(\w+)"[^>]*>([\s\S]*?)<\/div>\s*<div class="secao-conteudo">/);
    if (!m) return null;
    const paineis = [...m[2].matchAll(/<div class="secao-sub" id="([^"]+)" data-pai="([^"]+)"[^>]*\bhidden>([\s\S]*?)<\/div>/g)].map((x) => ({
      pai: x[2], id: x[1], subs: [...x[3].matchAll(/<button type="button" class="secao-subitem( vazio)?" data-v="([^"]*)"( data-href="([^"]*)")? aria-pressed="(\w+)">([\s\S]*?)<small>(\d+)<\/small><\/button>/g)].map((s) => ({ vazio: !!s[1], v: s[2], href: s[4], pressionado: s[5], n: Number(s[7]) })),
    }));
    const semPaineis = m[2].replace(/<div class="secao-sub"[\s\S]*?<\/div>/g, '');
    const topo = [...semPaineis.matchAll(/<button type="button" class="secao-item" data-v="([^"]*)"( data-href="([^"]*)")? aria-pressed="(\w+)"( aria-expanded="\w+" aria-controls="([^"]+)")?>([\s\S]*?)<small>(\d+)<\/small><\/button>/g)].map((x) => ({ v: x[1], href: x[3], pressionado: x[4], expande: x[6], n: Number(x[8]) }));
    return { g: m[1], topo, paineis };
  };
  let paginasComBusca = 0, itensDeMenuConferidos = 0;
  for (const [rel, h] of html) {
    if (redirecionamento(h)) continue;
    const tem = /class="secao-busca"/.test(h);
    if (COM_MINIBUSCA.includes(rel) && !tem) a.push(achado('alto', T, 'falta a mini-busca da secao', rel));
    if (SEM_MINIBUSCA.includes(rel) && tem) a.push(achado('alto', T, 'esta pagina nao deve ter mini-busca (so Noticias, Reviews, Lancamentos e Wiki)', rel));
    if (!tem) { if (/assets\/js\/secao\.js/.test(h)) a.push(achado('baixo', T, 'carrega secao.js mas nao tem a mini-busca', rel)); continue; }
    paginasComBusca++;
    if (!/<script[^>]*src="assets\/js\/secao\.js"[^>]*\bdefer\b/.test(h)) a.push(achado('alto', T, 'pagina com mini-busca sem <script src="assets/js/secao.js" defer>', rel));
    if (/<section class="secao-busca"[^>]*\bhidden/.test(h)) a.push(achado('alto', T, 'a secao nao pode nascer escondida: a lista de sempre fica dentro dela e precisa aparecer sem JavaScript', rel));
    if (!/<form class="secao-form"[^>]*\bhidden>/.test(h)) a.push(achado('medio', T, 'o campo de busca precisa nascer escondido (hidden): sem JavaScript ele nao funciona e nao pode aparecer', rel));
    if (/class="secao-estatico"[^>]*\bhidden/.test(h)) a.push(achado('alto', T, 'a lista de sempre nasce escondida', rel));
    for (const [re, o] of [[/<form class="secao-form" role="search" aria-label="[^"]+"/, 'o formulario precisa de role="search" e aria-label'], [/<label class="sr-only" for="secao-q">/, 'o campo precisa de label (sr-only) ligado ao id secao-q'], [/id="secao-q"[^>]*type="search"/, 'campo id="secao-q" type="search"'], [/class="busca-status" role="status" aria-live="polite"/, 'area de aviso para leitor de tela (role="status" aria-live="polite")'], [/<div class="secao-conteudo">[\s\S]*<div class="secao-estatico">/, 'a lista de sempre precisa ficar dentro de .secao-conteudo > .secao-estatico'], [/<p class="secao-ver" hidden>/, 'falta o espaco do link "Ver a pagina de ..." (escondido)'], [/<template id="secao-icones">/, 'falta o modelo de icones dos cartoes (template secao-icones)']]) {
      if (!re.test(h)) a.push(achado('alto', T, o, rel));
    }
    if (/class="(?:busca-chip[^"]*|secao-(?:grupo|chips|filtros|barra|limpar))"/.test(h.slice(h.indexOf('class="secao-busca"'), h.indexOf('</section>', h.indexOf('class="secao-busca"'))))) a.push(achado('alto', T, 'sobrou filtro do desenho antigo (tags, quando, botoes de filtro): so o campo e o menu lateral', rel));
    // menu lateral: so Reviews (plataforma) e Wiki (jogo)
    const grupoEsperado = MENU_DA_PAGINA[rel], temMenu = /class="secao-menu"/.test(h);
    if (grupoEsperado && !new RegExp('class="secao-menu"[^>]*data-grupo="' + grupoEsperado + '"').test(h)) a.push(achado('alto', T, 'falta o menu lateral (' + grupoEsperado + ')', rel));
    if (!grupoEsperado && temMenu) a.push(achado('alto', T, 'esta secao so tem o campo de busca, sem menu lateral', rel));
    if (/<label class="secao-ordem">/.test(h) !== (rel === 'reviews.html')) a.push(achado('alto', T, rel === 'reviews.html' ? 'Reviews precisa do "Ordenar por" ao lado do campo' : 'so Reviews tem "Ordenar por"', rel));
    // os dados: o arquivo existe, tem a forma certa e o menu (com a contagem de cada item) bate com os itens
    const src = (h.match(/data-src="([^"]+)"/) ?? [])[1];
    if (!src || !existe(src)) { a.push(achado('critico', T, 'a mini-busca aponta para um arquivo de dados que nao existe: ' + src, rel)); continue; }
    let dados; try { dados = lerJson(src); } catch (e) { a.push(achado('critico', T, 'dados da mini-busca com JSON invalido: ' + e.message, src)); continue; }
    const itens = dados.itens;
    if (!Array.isArray(itens) || !itens.length) { a.push(achado('critico', T, 'dados da mini-busca sem a lista "itens"', src)); continue; }
    if (esperadosSecao[rel] != null && itens.length !== esperadosSecao[rel]) a.push(achado('alto', T, itens.length + ' itens nos dados da mini-busca, mas o registro tem ' + esperadosSecao[rel] + ' materias nessa secao', src));
    const vistos = new Set();
    for (const it of itens) {
      if (vistos.has(it.u)) a.push(achado('alto', T, 'item repetido nos dados da mini-busca: ' + it.u, src));
      vistos.add(it.u);
      if (!existe(it.u)) a.push(achado('alto', T, 'item aponta para pagina que nao existe: ' + it.u, src));
      if (!/^[\w-][\w\-./]*$/.test(it.u) || it.u.includes('..')) a.push(achado('alto', T, 'endereco fora do padrao seguro: ' + it.u, src));
      if (!/^(?:https:\/\/[\w.\-]+\/[\w\-./]+|\/assets\/img\/[\w\-./]+)$/.test(it.i ?? '') || (it.i ?? '').includes('..')) a.push(achado('medio', T, 'miniatura fora do padrao seguro em ' + it.u, src));
      if (!it.t || !it.c || !it.dt || Number.isNaN(Date.parse(it.dt))) a.push(achado('alto', T, 'item sem titulo, categoria ou data valida: ' + it.u, src));
      for (const [g, vs] of Object.entries(it.f ?? {})) for (const v of vs) if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(v)) a.push(achado('alto', T, 'valor de menu fora do padrao (' + g + '="' + v + '") em ' + it.u, src));
    }
    const menu = lerMenu(h);
    if (menu) {
      const g = menu.g;
      if (menu.topo.length < 3) a.push(achado('medio', T, 'menu "' + g + '" com menos de 2 itens alem de "Todos" (nao serve de menu)', rel));
      // BL-20 (UX-34): toda review aparece em pelo menos um item de plataforma (a que nao tem plataforma vai para "Outras"), senao Todas nao fecha com a soma dos itens
      if (g === 'pl') { const valores = new Set(menu.topo.map((x) => x.v)); for (const it of itens) if (!(it.f?.pl ?? []).some((v) => valores.has(v))) a.push(achado('alto', T, 'review sem nenhum item de plataforma no menu (devia estar em "Outras"): ' + it.u, rel)); }
      menu.topo.forEach((it0, k) => {
        itensDeMenuConferidos++;
        if (k === 0) {
          if (it0.v !== '' || it0.pressionado !== 'true') a.push(achado('alto', T, 'o primeiro item do menu precisa ser "Todos" (data-v vazio) e nascer marcado', rel));
          if (it0.n !== itens.length) a.push(achado('alto', T, 'item "Todos" diz ' + it0.n + ' mas os dados tem ' + itens.length, rel));
          return;
        }
        if (it0.pressionado !== 'false') a.push(achado('alto', T, 'item ' + g + '=' + it0.v + ' nasce marcado', rel));
        const real = itens.filter((it) => (it.f?.[g] ?? []).includes(it0.v)).length;
        if (real !== it0.n) a.push(achado('alto', T, 'item ' + g + '=' + it0.v + ' diz ' + it0.n + ' mas os dados tem ' + real, rel));
        if (g === 'jogo' && (!it0.href || !existe(it0.href))) a.push(achado('alto', T, 'item de franquia ' + it0.v + ' sem pagina (data-href): ' + it0.href, rel));
        const painel = menu.paineis.find((pn) => pn.pai === it0.v);
        if (!!it0.expande !== !!painel) a.push(achado('alto', T, 'item "' + it0.v + '": ou tem aria-expanded e a lista de jogos, ou nenhum dos dois', rel));
        if (painel) {
          if (it0.expande !== painel.id) a.push(achado('alto', T, 'aria-controls de "' + it0.v + '" nao aponta para a lista de jogos dele', rel));
          if (painel.subs.length < 2) a.push(achado('medio', T, 'lista de jogos de "' + it0.v + '" com menos de 2 itens', rel));
          if (painel.subs[painel.subs.length - 1]?.v !== 'noticias') a.push(achado('alto', T, 'o ultimo item da lista de jogos de "' + it0.v + '" precisa ser "Noticias"', rel));
          if (new Set(painel.subs.map((s) => s.v)).size !== painel.subs.length) a.push(achado('alto', T, 'jogo repetido na lista de "' + it0.v + '"', rel));
          for (const s of painel.subs) {
            itensDeMenuConferidos++;
            if (s.pressionado !== 'false') a.push(achado('alto', T, 'jogo ' + it0.v + '/' + s.v + ' nasce marcado', rel));
            const nSub = itens.filter((it) => (it.f?.[g] ?? []).includes(it0.v) && (it.f?.sub ?? []).includes(s.v)).length;
            if (nSub !== s.n) a.push(achado('alto', T, 'jogo ' + it0.v + '/' + s.v + ' diz ' + s.n + ' mas os dados tem ' + nSub, rel));
            if (s.vazio !== (s.n === 0)) a.push(achado('medio', T, 'jogo ' + it0.v + '/' + s.v + ': a marca de vazio (' + s.vazio + ') nao bate com a contagem (' + s.n + ')', rel));
            if (s.href && !existe(s.href)) a.push(achado('alto', T, 'jogo ' + it0.v + '/' + s.v + ' aponta para pagina que nao existe: ' + s.href, rel));
          }
        }
      });
      // a ordem do menu e a de config.mjs (WIKI.jogos e a "serie" de cada jogo), com "Noticias" no fim
      if (g === 'jogo') {
        const esperado = WIKI.jogos.map((j) => j.tag);
        const veio = menu.topo.slice(1).map((x) => x.v);
        if (JSON.stringify(esperado) !== JSON.stringify(veio)) a.push(achado('alto', T, 'franquias no menu fora da ordem de WIKI.jogos: esperado ' + esperado.join(',') + ', veio ' + veio.join(','), rel));
        for (const j of WIKI.jogos) {
          const painel = menu.paineis.find((pn) => pn.pai === j.tag);
          const esp = [...(j.serie ?? []).map((e) => (typeof e === 'string' ? e : e.tag)), 'noticias'];
          if (j.serie && JSON.stringify(esp) !== JSON.stringify(painel?.subs.map((s) => s.v))) a.push(achado('alto', T, 'jogos de "' + j.tag + '" no menu fora da ordem de config.mjs (serie)', rel));
        }
      }
    }
  }
  if (paginasComBusca !== COM_MINIBUSCA.length) a.push(achado('alto', T, 'esperava a mini-busca em ' + COM_MINIBUSCA.length + ' paginas e achei em ' + paginasComBusca));

  let sec;
  try { sec = rodarScript('secao.js', { doc: documentoVazio() }).janela.BrubaoSecao; } catch (e) { a.push(achado('critico', T, 'secao.js lancou erro ao carregar: ' + e.message, 'assets/js/secao.js')); sec = null; }
  if (!sec) { if (!a.some((x) => /secao\.js lancou erro/.test(x.msg))) a.push(achado('critico', T, 'secao.js nao expoe window.BrubaoSecao')); }
  else {
    const igual = (x, y) => JSON.stringify(x) === JSON.stringify(y);
    const ok = (nome, obtido, esperado) => { if (!igual(obtido, esperado)) a.push(achado('alto', T, nome + ': esperado ' + JSON.stringify(esperado) + ', veio ' + JSON.stringify(obtido), 'assets/js/secao.js')); };
    const G = ['tag', 'mes', 'rec'];
    ok('lerEstado vazio', sec.lerEstado('', G), { q: '', f: {}, o: 'recentes' });
    ok('lerEstado completo', sec.lerEstado('?q=gta+6&tag=ps5,god-of-war&rec=pule&o=az', G), { q: 'gta 6', f: { tag: ['ps5', 'god-of-war'], rec: ['pule'] }, o: 'az' });
    ok('lerEstado descarta valores fora do padrao', sec.lerEstado('?tag=OK,a b,<script>,x/y,ok-1,,-a&mes=2026-09', G).f, { tag: ['ok-1'], mes: ['2026-09'] });
    ok('lerEstado ignora grupo que a pagina nao tem', sec.lerEstado('?pl=ps5&tag=a1', G).f, { tag: ['a1'] });
    ok('lerEstado limita o texto', sec.lerEstado('?q=' + 'a'.repeat(5000), G).q.length, 100);
    ok('lerEstado ordem invalida volta ao padrao', sec.lerEstado('?o=zzz', G).o, 'recentes');
    ok('escreverEstado', [sec.escreverEstado({ q: ' gta 6 ', f: { tag: ['ps5', 'xbox'] }, o: 'az' }, G), sec.escreverEstado({ q: '', f: {}, o: 'recentes' }, G)], ['?q=gta+6&tag=ps5%2Cxbox&o=az', '']);
    ok('ativo', [sec.ativo({ q: '', f: {}, o: 'recentes' }), sec.ativo({ q: 'g', f: {}, o: 'recentes' }), sec.ativo({ q: 'gt', f: {}, o: 'recentes' }), sec.ativo({ q: '', f: { tag: ['a1'] }, o: 'recentes' }), sec.ativo({ q: '', f: {}, o: 'az' })], [false, false, true, true, true]);
    const base = [
      { t: 'GTA 6 ganha trailer novo', r: 'A Rockstar mostrou o jogo.', u: 'noticias/a.html', c: 'Notícia', dt: '2026-09-10T12:00:00Z', f: { tag: ['gta-6', 'ps5'], mes: ['2026-09'] }, b: 'GTA 6 PlayStation' },
      { t: 'Resident Evil 2 Remake: a história de Claire', r: 'Contém spoilers.', u: 'series/b.html', c: 'Série', dt: '2026-08-01T12:00:00Z', f: { tag: ['resident-evil'], mes: ['2026-08'] }, b: 'Resident Evil' },
      { t: 'Mídia física acaba?', r: 'O fim do disco.', u: 'noticias/c.html', c: 'Notícia', dt: '2026-09-20T12:00:00Z', f: { tag: ['ps5'], mes: ['2026-09'] }, b: 'fim da midia fisica' },
      { t: 'Resident Evil 10 sem data', r: '', u: 'noticias/d.html', c: 'Notícia', dt: '2026-07-01T12:00:00Z', f: { tag: ['resident-evil'], mes: ['2026-07'], rec: ['pule'] }, b: '' },
    ];
    const ids = (e) => sec.filtrar(base, e).map((x) => x.u);
    ok('filtrar sem nada devolve tudo', ids({ q: '', f: {}, o: 'recentes' }).length, 4);
    ok('texto sem acento e sem maiuscula', ids({ q: 'MIDIA fisica', f: {}, o: 'recentes' }), ['noticias/c.html']);
    ok('texto com acento acha sem acento', ids({ q: 'mídia', f: {}, o: 'recentes' }), ['noticias/c.html']);
    ok('busca sem acento acha palavra acentuada so no titulo', ids({ q: 'historia claire', f: {}, o: 'recentes' }), ['series/b.html']);
    ok('busca com acento acha a mesma palavra', ids({ q: 'HISTÓRIA claire', f: {}, o: 'recentes' }), ['series/b.html']);
    ok('"gta6" acha "GTA 6"', ids({ q: 'gta6', f: {}, o: 'recentes' }), ['noticias/a.html']);
    ok('todas as palavras precisam aparecer (e)', ids({ q: 'resident claire', f: {}, o: 'recentes' }), ['series/b.html']);
    ok('palavras em qualquer ordem', ids({ q: 'claire resident', f: {}, o: 'recentes' }), ['series/b.html']);
    ok('1 letra so nao filtra', ids({ q: 'z', f: {}, o: 'recentes' }).length, 4);
    ok('texto no campo "b" (tags/assunto)', ids({ q: 'playstation', f: {}, o: 'recentes' }), ['noticias/a.html']);
    ok('filtro de um valor', ids({ q: '', f: { tag: ['ps5'] }, o: 'recentes' }), ['noticias/a.html', 'noticias/c.html']);
    ok('dentro do grupo vale "ou"', ids({ q: '', f: { tag: ['gta-6', 'resident-evil'] }, o: 'recentes' }).sort(), ['noticias/a.html', 'noticias/d.html', 'series/b.html']);
    ok('entre grupos vale "e"', ids({ q: '', f: { tag: ['ps5'], mes: ['2026-09'] }, o: 'recentes' }), ['noticias/a.html', 'noticias/c.html']);
    ok('grupo que a materia nao tem exclui', ids({ q: '', f: { rec: ['pule'] }, o: 'recentes' }), ['noticias/d.html']);
    ok('filtro e texto juntos', ids({ q: 'resident', f: { mes: ['2026-08'] }, o: 'recentes' }), ['series/b.html']);
    ok('nenhum resultado', ids({ q: 'zzzzzz', f: {}, o: 'recentes' }), []);
    ok('ordenar recentes', sec.ordenar(base, 'recentes').map((x) => x.u), ['noticias/c.html', 'noticias/a.html', 'series/b.html', 'noticias/d.html']);
    ok('ordenar A-Z (sem acento e numeros em ordem)', sec.ordenar(base, 'az').map((x) => x.t), ['GTA 6 ganha trailer novo', 'Mídia física acaba?', 'Resident Evil 2 Remake: a história de Claire', 'Resident Evil 10 sem data']);
    ok('ordenar nao muda a lista original', base.map((x) => x.u), ['noticias/a.html', 'series/b.html', 'noticias/c.html', 'noticias/d.html']);
    ok('caminhoSeguro e imagemSegura', [['noticias/x.html', 'javascript:1', '//e.com/x', '../x', '/x'].map(sec.caminhoSeguro), ['https://i.ytimg.com/vi/a/b.jpg', 'http://x.com/a.jpg', 'data:x', '/assets/img/wiki-capa.svg', '//evil.com/x.jpg', '/assets/img/../x.jpg'].map(sec.imagemSegura)], [[true, false, false, false, false], [true, false, false, true, false, false]]);
    // com os dados de verdade: nenhum botao de filtro some com materia nem inventa (a mesma conta que o botao anuncia)
    for (const [rel, h] of html) {
      if (!/class="secao-busca"/.test(h)) continue;
      const arquivoDosDados = (h.match(/data-src="([^"]+)"/) ?? [])[1];
      if (!arquivoDosDados || !existe(arquivoDosDados)) continue; // ja acusado acima (mini-busca sem dados)
      const dados = lerJson(arquivoDosDados).itens;
      ok(rel + ': sem filtro mostra todos', sec.filtrar(dados, { q: '', f: {}, o: 'recentes' }).length, dados.length);
      ok(rel + ': ordenar A-Z e recentes mantem todos', [sec.ordenar(dados, 'az').length, sec.ordenar(dados, 'recentes').length], [dados.length, dados.length]);
      const menuDaPagina = lerMenu(h);
      if (menuDaPagina) {
        const g = menuDaPagina.g;
        for (const it0 of menuDaPagina.topo) {
          const n = sec.filtrar(dados, { q: '', f: it0.v === '' ? {} : { [g]: [it0.v] }, o: 'recentes' }).length;
          if (n !== it0.n) a.push(achado('alto', T, rel + ': filtrar() com ' + g + '=' + it0.v + ' da ' + n + ' resultado(s) e o item do menu diz ' + it0.n, 'assets/js/secao.js'));
        }
        for (const pn of menuDaPagina.paineis) for (const s of pn.subs) {
          const n = sec.filtrar(dados, { q: '', f: { [g]: [pn.pai], sub: [s.v] }, o: 'recentes' }).length;
          if (n !== s.n) a.push(achado('alto', T, rel + ': filtrar() com ' + g + '=' + pn.pai + ' e sub=' + s.v + ' da ' + n + ' resultado(s) e o jogo do menu diz ' + s.n, 'assets/js/secao.js'));
        }
      }
      // cada titulo de verdade e achado pelo proprio titulo (a busca por texto nao perde ninguem)
      let perdidos = 0; for (const it of dados.slice(0, 300)) if (!sec.filtrar(dados, { q: it.t, f: {}, o: 'recentes' }).some((x) => x.u === it.u)) perdidos++;
      if (perdidos) a.push(achado('alto', T, rel + ': ' + perdidos + ' titulo(s) nao sao achados pela busca do proprio titulo', 'assets/js/secao.js'));
    }
    // fuzz: texto, URL e dados estranhos nao derrubam nada
    const alf = ['a', 'Z', '5', ' ', '-', '_', '.', '*', '(', '\\', '"', "'", '<', '>', '&', '%', ',', '=', '?', '́', 'é', 'ç', '日', '🙂', '\uD800', '\u0000', '\n'];
    let seed = 987654; const rd = (n) => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed % n; };
    let caiu = 0, primeiro2 = '';
    for (let i = 0; i < 4000; i++) {
      const s = Array.from({ length: rd(40) }, () => alf[rd(alf.length)]).join('');
      try {
        const e = sec.lerEstado('?q=' + codificar(s) + '&tag=' + codificar(s) + '&o=' + codificar(s), G);
        if (e.q.length > 100 || (e.o !== 'recentes' && e.o !== 'az')) throw new Error('estado fora dos limites');
        for (const v of Object.values(e.f).flat()) if (!/^[a-z0-9][a-z0-9-]{0,59}$/.test(v)) throw new Error('valor invalido passou: ' + v);
        const u = sec.escreverEstado(e, G); const volta = sec.lerEstado(u, G);
        if (!igual(volta.f, e.f) || volta.o !== e.o || volta.q !== e.q.trim()) throw new Error('ida e volta da URL mudou o estado');
        sec.filtrar(base, { q: s, f: { tag: [s] }, o: 'az' }); sec.ordenar(base, s); sec.norm(s); sec.chave(s); sec.ativo(e);
      } catch (err) { caiu++; primeiro2 ||= JSON.stringify(s) + ' -> ' + err.message; }
    }
    if (caiu) a.push(achado('alto', T, caiu + ' texto(s) estranho(s) derrubaram as funcoes da mini-busca (primeiro: ' + primeiro2 + ')', 'assets/js/secao.js'));
  }
  a.push(achado('info', T, paginasComBusca + ' pagina(s) com mini-busca; ' + itensDeMenuConferidos + ' itens de menu conferidos contra os dados'));

  // ---------- 6) contador, no navegador de mentira ----------
  const ALVO = Date.parse('2026-11-19T00:00:00-03:00');
  const ATTR = '2026-11-19T00:00:00-03:00';
  async function contador({ attr = ATTR, aparelho, servidor = aparelho, falhaServidor = false, semFetch = false, semMinutos = false }) {
    const p = montarPagina({ alvoContador: attr });
    if (semMinutos) { const m = p.doc.getElementById('cd-m'); m.parent.children = m.parent.children.filter((c) => c !== m); }
    const resposta = falhaServidor ? new Error('sem rede') : { ok: true, headers: { get: (k) => (k.toLowerCase() === 'date' ? new Date(servidor).toUTCString() : null) } };
    let erro = null, s = null;
    try { s = rodarScript('contador.js', { doc: p.doc, relogio: () => aparelho, resposta, semFetch }); } catch (e) { erro = `${e.constructor.name}: ${e.message}`; }
    await new Promise((r) => setTimeout(r, 15));
    const v = (id) => p.doc.getElementById(id)?.textContent;
    const titulo = p.doc.getElementById('gta-title');
    return { erro, d: v('cd-d'), h: v('cd-h'), m: v('cd-m'), s: v('cd-s'), rotD: p.doc.getElementById('cd-d')?.nextElementSibling?.textContent, rotH: p.doc.getElementById('cd-h')?.nextElementSibling?.textContent, chegou: titulo.getAttribute('data-chegou') === '1', titulo: titulo.textContent, relogioParado: s ? s.intervalos.every((i) => i.parado) || !s.intervalos.length : null, pedidos: s?.chamadas.map((c) => c.metodo) ?? [] };
  }
  const c = (nome, obtido, esperado) => { if (!iguais(obtido, esperado)) a.push(achado('alto', T, `contador, ${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`, 'assets/js/contador.js')); };
  let r = await contador({ aparelho: ALVO - (43 * 86400 + 10 * 3600 + 38 * 60 + 4) * 1000 });
  c('43d 10h 38m 04s', [r.erro, r.d, r.h, r.m, r.s, r.rotD, r.rotH, r.chegou, r.pedidos], [null, '43', '10', '38', '04', 'dias', 'horas', false, ['HEAD']]);
  r = await contador({ aparelho: ALVO - (86400 + 3600) * 1000 });
  c('1 dia e 1 hora (singular)', [r.d, r.h, r.rotD, r.rotH], ['1', '01', 'dia', 'hora']);
  r = await contador({ aparelho: ALVO - 1000 });
  c('falta 1 segundo', [r.d, r.h, r.m, r.s, r.chegou], ['0', '00', '00', '01', false]);
  r = await contador({ aparelho: ALVO + 86400000 });
  c('pagina aberta depois do lancamento', [r.d, r.s, r.chegou, r.titulo, r.relogioParado], ['0', '00', true, 'GTA VI já chegou!', true]);
  r = await contador({ aparelho: Date.parse('2100-01-01'), servidor: ALVO - 5 * 86400000 });
  c('aparelho em 2100 mas o servidor diz que faltam 5 dias (nao pode dizer "ja chegou")', [r.d, r.chegou, r.titulo], ['5', false, 'GTA VI chega em']);
  r = await contador({ aparelho: 0, servidor: ALVO - 10 * 86400000 });
  c('aparelho em 1970, servidor diz 10 dias', [r.d, r.chegou], ['10', false]);
  r = await contador({ aparelho: ALVO - 7 * 86400000, servidor: ALVO - 7 * 86400000 + 90 * 1000 });
  c('diferenca pequena (90 s) nao mexe: vale o relogio do aparelho', [r.d, r.h], ['7', '00']);
  r = await contador({ aparelho: Date.parse('2100-01-01'), falhaServidor: true });
  c('servidor inacessivel: vale o relogio do aparelho', [r.erro, r.chegou], [null, true]);
  r = await contador({ aparelho: ALVO - 3 * 86400000, semFetch: true });
  c('navegador sem fetch', [r.erro, r.d], [null, '3']);
  r = await contador({ attr: 'banana', aparelho: ALVO - 5000 });
  c('data-alvo invalido', [r.erro, r.d, r.s], [null, '--', '--']);
  r = await contador({ aparelho: ALVO - 5000, semMinutos: true });
  c('falta um elemento no HTML', [r.erro, r.d], [null, '--']);

  // ---------- 6b) o estado "lancado": so aparece na hora H (com a hora do servidor conferida), montado so com texto ----------
  const LANC = { kicker: 'Já disponível', titulo: 'já saiu!', texto: 'Lançado em 19 de novembro de 2026 · PS5 e Xbox Series X|S' };
  const LANC_HOME = { ...LANC, botao: 'Ver as novidades', href: 'gta6.html' };
  async function virada({ aparelho, servidor = aparelho, falhaServidor = false, lancado = LANC }) {
    const p = montarPagina({ alvoContador: ATTR, lancado });
    const resposta = falhaServidor ? new Error('sem rede') : { ok: true, headers: { get: (k) => (k.toLowerCase() === 'date' ? new Date(servidor).toUTCString() : null) } };
    let erro = null;
    try { rodarScript('contador.js', { doc: p.doc, relogio: () => aparelho, resposta }); } catch (e) { erro = `${e.constructor.name}: ${e.message}`; }
    await new Promise((r) => setTimeout(r, 15));
    const secao = p.doc.querySelector('section'), antes = secao.children.length;
    for (const f of p.doc.ouvintes.visibilitychange ?? []) f({}); // voltar para a aba depois do lancamento nao pode refazer nem duplicar nada
    return { erro, estado: secao.getAttribute('data-estado'), classe: [...new Set([...secao.className.split(/\s+/), ...secao._classes])].filter(Boolean).join(' '), filhos: secao.children.map((c) => `${c.tagName.toLowerCase()}.${c.className}:${c.textContent}`), temContagem: !!p.doc.getElementById('gta-count'), href: secao.querySelector('a')?.getAttribute('href') ?? null, titulo: p.doc.getElementById('gta-title')?.textContent, estavel: secao.children.length === antes, todoTexto: secao.textContent, innerHTML: p.doc.raiz.todos().some((n) => n.innerHTMLUsado) };
  }
  const v = (nome, obtido, esperado) => { if (!iguais(obtido, esperado)) a.push(achado('alto', T, `estado lancado, ${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`, 'assets/js/contador.js')); };
  const DEPOIS = ['p.gta-kicker:Já disponível', 'h2.gta-title:GTA VI já saiu!', 'p.gta-date:Lançado em 19 de novembro de 2026 · PS5 e Xbox Series X|S'];
  let w = await virada({ aparelho: ALVO - 43 * 86400000 });
  v('43 dias antes: continua a contagem e NADA do lancado aparece', [w.erro, w.estado, w.classe, w.temContagem, w.titulo, /Já disponível|já saiu/.test(w.todoTexto)], [null, null, 'gta', true, 'GTA VI chega em', false]);
  w = await virada({ aparelho: ALVO - 1000 });
  v('1 segundo antes: ainda nao', [w.estado, w.temContagem], [null, true]);
  w = await virada({ aparelho: ALVO });
  v('na hora H (pagina do GTA 6, sem botao)', [w.erro, w.estado, w.classe, w.filhos, w.temContagem, w.href, w.estavel], [null, 'lancado', 'gta gta-lancado', DEPOIS, false, null, true]);
  w = await virada({ aparelho: ALVO + 3 * 86400000, lancado: LANC_HOME });
  v('3 dias depois (home, com botao para as novidades)', [w.estado, w.classe, w.filhos, w.href], ['lancado', 'gta gta-lancado', [...DEPOIS, 'a.btn primary gta-botao:Ver as novidades'], 'gta6.html']);
  w = await virada({ aparelho: Date.parse('2100-01-01'), servidor: ALVO - 5 * 86400000 });
  v('aparelho em 2100, servidor diz que faltam 5 dias: NAO lanca', [w.estado, w.temContagem, w.titulo], [null, true, 'GTA VI chega em']);
  w = await virada({ aparelho: ALVO - 2 * 3600000, servidor: ALVO + 60000 });
  v('aparelho 2 h atrasado, servidor ja passou da hora: lanca', [w.estado], ['lancado']);
  w = await virada({ aparelho: ALVO + 86400000, falhaServidor: true });
  v('servidor inacessivel, relogio do aparelho depois da data: lanca', [w.estado], ['lancado']);
  w = await virada({ aparelho: ALVO, lancado: { ...LANC, texto: '<b>x</b> & "y" <img src=x onerror=1>' } });
  v('texto com HTML aparece como texto (nada e interpretado)', [w.estado, w.filhos[2], w.innerHTML], ['lancado', 'p.gta-date:<b>x</b> & "y" <img src=x onerror=1>', false]);
  w = await virada({ aparelho: ALVO, lancado: { kicker: 'Já disponível', titulo: 'já saiu!' } });
  v('faltou o texto da data: volta ao comportamento antigo (so o titulo)', [w.estado, w.titulo], [null, 'GTA VI já chegou!']);
  w = await virada({ aparelho: ALVO, lancado: {} });
  v('pagina sem atributos de lancado: so o titulo muda', [w.estado, w.titulo, w.temContagem], [null, 'GTA VI já chegou!', true]);

  // ---------- 6c) fachada do player (fachada.js): o iframe so nasce no clique ----------
  async function fachada({ fachadas, acao }) {
    const p = montarPagina({ fachadas });
    let erro = null;
    try { rodarScript('fachada.js', { doc: p.doc }); } catch (e) { erro = `${e.constructor.name}: ${e.message}`; }
    const caixas = p.doc.raiz.querySelectorAll('.art-video'), links = p.doc.raiz.querySelectorAll('.fachada');
    let rolei = null;
    try { rolei = acao ? acao(links, p.doc) : null; } catch (e) { erro = `${e.constructor.name}: ${e.message}`; rolei = {}; } // o script quebrou no clique: vira falha deste cenario, nao do teste inteiro
    const quadros = p.doc.raiz.querySelectorAll('iframe');
    return { erro, papeis: links.map((l) => l.getAttribute('role')), quadros, naCaixa: caixas.map((c) => c.children.map((f) => `${f.tagName.toLowerCase()}${f.className ? '.' + f.className : ''}`)), rolei, links };
  }
  const f6 = (nome, obtido, esperado) => { if (!iguais(obtido, esperado)) a.push(achado('alto', T, `fachada, ${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`, 'assets/js/fachada.js')); };
  const UM = { embed: 'https://www.youtube-nocookie.com/embed/abcdefghijk', titulo: 'Titulo <b>do</b> video', href: 'https://www.youtube.com/watch?v=abcdefghijk' };
  const LISTA = { embed: 'https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz', titulo: 'Cortes' };
  let fx = await fachada({ fachadas: [UM, LISTA] });
  f6('antes do clique: sem iframe, as duas viram botao', [fx.erro, fx.quadros.length, fx.papeis, fx.naCaixa], [null, 0, ['button', 'button'], [['a.fachada'], ['a.fachada']]]);
  fx = await fachada({ fachadas: [UM, LISTA], acao: (links) => links[0].dispararEvento('click', { button: 0 }) });
  const q = fx.quadros[0];
  f6('clique troca SO a primeira fachada por um iframe tocando', [fx.rolei.padraoEvitado, fx.quadros.length, fx.naCaixa, q?.src, q?.title, q?.getAttribute('allow'), q?.getAttribute('referrerpolicy'), q?.getAttribute('allowfullscreen'), q?.focado], [true, 1, [['iframe'], ['a.fachada']], 'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1', 'Titulo <b>do</b> video', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen', 'strict-origin-when-cross-origin', '', true]);
  fx = await fachada({ fachadas: [UM, LISTA], acao: (links) => links[1].dispararEvento('click', {}) });
  f6('playlist (com ?list=): o autoplay entra com &', [fx.quadros[0]?.src], ['https://www.youtube-nocookie.com/embed/videoseries?list=PLxyz&autoplay=1']);
  for (const [nome, ev] of [['Ctrl+clique', { ctrlKey: true }], ['Cmd+clique', { metaKey: true }], ['Shift+clique', { shiftKey: true }], ['clique do meio', { button: 1 }]]) {
    fx = await fachada({ fachadas: [UM], acao: (links) => links[0].dispararEvento('click', ev) });
    f6(`${nome} continua sendo link (abrir em nova aba): nada intercepta`, [fx.rolei.padraoEvitado ?? false, fx.quadros.length], [false, 0]);
  }
  fx = await fachada({ fachadas: [UM], acao: (links) => links[0].dispararEvento('keydown', { key: ' ' }) });
  f6('espaco no teclado toca o video', [fx.rolei.padraoEvitado, fx.quadros.length], [true, 1]);
  fx = await fachada({ fachadas: [UM], acao: (links) => links[0].dispararEvento('keydown', { key: 'a' }) });
  f6('outra tecla nao faz nada', [fx.rolei.padraoEvitado ?? false, fx.quadros.length], [false, 0]);
  fx = await fachada({ fachadas: [{ href: 'https://www.youtube.com/watch?v=x' }], acao: (links) => links[0].dispararEvento('click', {}) });
  f6('fachada sem data-embed: nao vira botao e o link comum age', [fx.papeis, fx.rolei.padraoEvitado ?? false, fx.quadros.length], [[null], false, 0]);
  fx = await fachada({ fachadas: [{ embed: 'https://www.youtube-nocookie.com/embed/abcdefghijk' }], acao: (links) => links[0].dispararEvento('click', {}) });
  f6('sem data-titulo: titulo padrao', [fx.quadros[0]?.title], ['Vídeo do YouTube']);
  fx = await fachada({ fachadas: [], acao: null });
  f6('pagina sem fachada: nao faz nada e nao quebra', [fx.erro, fx.quadros.length], [null, 0]);
  fx = await fachada({ fachadas: [UM], acao: (links, doc) => { links[0].dispararEvento('click', {}); links[0].dispararEvento('click', {}); } });
  f6('clicar de novo na fachada que ja virou player nao duplica', [fx.quadros.length, fx.naCaixa], [1, [['iframe']]]);

  a.push(achado('info', T, `${comBusca} paginas com busca, ${comContador} com contagem regressiva; ${todas.length} materias em ${manifesto.meses.length} lista(s) por mes; busca.js ${(gz('assets/js/busca.js') / 1024).toFixed(1)} KB e contador.js ${(gz('assets/js/contador.js') / 1024).toFixed(1)} KB comprimidos`));
  return a;
}
