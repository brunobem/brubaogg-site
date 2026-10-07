// JavaScript do site (busca.js e contador.js) e os dados que a busca consome. Sem navegador: roda os scripts num navegador de mentira (dom-falso.mjs).
// O que depende de navegador de verdade (teclado, foco, leitor de tela, Pagefind de verdade) fica em js.html.
import vm from 'node:vm';
import zlib from 'node:zlib';
import { achado, arquivosPublicados, existe, ler, limparHtml, tags } from './lib.mjs';
import { documentoVazio, montarPagina, rodarScript } from './dom-falso.mjs';

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
      if (!/^https:\/\//.test(e.i ?? '')) a.push(achado('medio', T, `miniatura sem https: ${e.i}`, rel));
      if (!manifesto.categorias.includes(e.c)) a.push(achado('alto', T, `categoria "${e.c}" fora do manifesto`, rel));
      if (new Date(e.dt).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7) !== mes.m) a.push(achado('alto', T, `item de ${e.dt} no arquivo de ${mes.m}`, rel));
      todas.push(e);
    }
  }
  const enderecos = new Set(todas.map((e) => e.u));
  if (enderecos.size !== todas.length) a.push(achado('alto', T, `${todas.length - enderecos.size} materia(s) repetida(s) nas listas por mes`));
  if (!todas.every((e, i) => i === 0 || todas[i - 1].dt >= e.dt)) a.push(achado('alto', T, 'as listas por mes nao estao do mais novo para o mais velho (o "Ver mais" mostraria fora de ordem)'));
  const noSite = publicados.filter((r) => /^(noticias|reviews|lancamentos|gta6-novidades)\//.test(r) && r.endsWith('.html') && !redirecionamento(html.get(r)) && !/content="noindex"/.test(html.get(r)));
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
        const pasta = id.slice(4), esperadas = todas.filter((e) => e.u.startsWith(`${pasta}/`)).length;
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
    if (!/data-pagefind-meta="image:https:\/\//.test(h)) a.push(achado('medio', T, 'sem miniatura nos dados do Pagefind', r));
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
  confere('atalhos exato primeiro', api.atalhosPara(sa, 'resident evil 7').map((x) => x.t), ['Resident Evil 7']);
  confere('combinar', api.combinar([{ id: 'a', score: 10 }, { id: 'b', score: 5 }, { id: 'c', score: 1 }], [{ id: 'c' }, { id: 'b' }, { id: 'a' }], 10).map((x) => x.id), ['b', 'a', 'c']);
  confere('caminhoSeguro', ['noticias/x.html', 'javascript:alert(1)', '//evil.com/x', '../x', 'a b', '/x.html'].map(api.caminhoSeguro), [true, false, false, false, false, false]);
  confere('imagemSegura', ['https://i.ytimg.com/vi/abc/hqdefault.jpg', 'http://x.com/a.jpg', 'javascript:1', 'data:image/png;base64,AAA'].map(api.imagemSegura), [true, false, false, false]);
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

  a.push(achado('info', T, `${comBusca} paginas com busca, ${comContador} com contagem regressiva; ${todas.length} materias em ${manifesto.meses.length} lista(s) por mes; busca.js ${(gz('assets/js/busca.js') / 1024).toFixed(1)} KB e contador.js ${(gz('assets/js/contador.js') / 1024).toFixed(1)} KB comprimidos`));
  return a;
}
