// Espacos de ADS (por enquanto so o marcador "ADS"; o anuncio de verdade entra na v1.03): onde cada um fica em cada pagina, os atributos das listas e a conta de linhas do assets/js/ads.js.
// O inventario FIXOS e a lista COMPLETA dos marcadores escritos no HTML: pagina fora dele nao pode ter marcador, e marcador que sobra ou falta e achado.
// Dentro das listas (Noticias, Reviews, Lancamentos) quem coloca os marcadores e o ads.js, medindo as linhas na tela: aqui a conta e testada com uma lista de mentira; a tela de verdade
// e conferida pelos varredores de navegador (ads-aparelhos.js).
import { achado, existe, ler, paginasHtml } from './lib.mjs';
import { rodarScript } from './dom-falso.mjs';
import { ADS_ATIVOS, ADS_NAS_LISTAS } from '../../gerador/config.mjs';

const T = 'ads';
// ADS_ATIVOS = false (config.mjs): o marcador existe em todo lugar de sempre, mas sai com o atributo hidden (escondido, o codigo fica); as listas nao levam data-ads-* nem o ads.js
const OCULTO = ADS_ATIVOS ? '' : ' hidden';
const marcador = (id) => `<div class="ads" data-ads="${id}" aria-hidden="true"${OCULTO}>ADS</div>`;

// [id, o que vem logo ANTES do marcador (termina nele), o que vem logo DEPOIS (comeca nele)]. O HTML e comparado sem comentarios e sem espaco entre as tags.
const FILTRO = [/<form [^>]*class="secao-form"[^>]*>(?:(?!<\/form>)[\s\S])*<\/form>$/, /^<div class="secao-layout">/];
const HERO = /<section class="cat-hero"[^>]*>(?:(?!<section)[\s\S])*<\/section>$/;
const PLAYLIST = /<article class="pl">(?:(?!<article)[\s\S])*<\/article>$/;
const BOTOES = /<div class="links">(?:(?!<\/div>)[\s\S])*<\/div>$/;
export const FIXOS = {
  'gta6.html': [
    ['gta6-apos-contagem', /<section class="gta"[^>]*>(?:(?!<section)[\s\S])*<\/section>$/, /^<section class="gta-news"/],
    ['gta6-apos-destaque', /<article class="gta-destaque[^"]*"(?:(?!<article)[\s\S])*<\/article>$/, /^<h3 class="gd-mais">/],
    ['gta6-apos-playlist', /<p class="gd-todas">(?:(?!<\/p>)[\s\S])*Ver a playlist completa no YouTube<\/a><\/p>$/, /^<\/section>/],
  ],
  'noticias.html': [['noticias-apos-filtro', ...FILTRO]],
  'reviews.html': [['reviews-apos-filtro', ...FILTRO]],
  'lancamentos.html': [['lancamentos-apos-filtro', ...FILTRO]],
  'wiki.html': [
    ['wiki-apos-filtro', ...FILTRO],
    ['wiki-antes-das-series', /<\/div>$/, /^<section class="feed-sec">/],
    ['wiki-fim', /<div class="bloco-vazio">(?:(?!<\/div>)[\s\S])*Em construção<\/b><span>[^<]+<\/span><\/div>$/, /^<\/main>/],
  ],
  'cortes.html': [
    ['cortes-apos-abertura', HERO, /^<section class="pls">/],
    ['cortes-entre-playlists', PLAYLIST, /^<article class="pl">/],
    ['cortes-fim', BOTOES, /^<\/main>/],
  ],
  'lives.html': [
    ['lives-apos-abertura', HERO, /^<section class="pls">/],
    ['lives-entre-playlists', PLAYLIST, /^<article class="pl">/],
    ['lives-fim', BOTOES, /^<\/main>/],
  ],
  // a home ja tinha os dela (nao faz parte desta lista de pedidos): so confere que continuam os mesmos
  'index.html': ['apos-carrossel', 'apos-contagem', 'apos-noticias', 'apos-reviews', 'apos-lancamentos', 'apos-wiki'].map((id) => [id, null, null]),
};
const compactar = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><');

// ---- lista de mentira para rodar o ads.js sem navegador ----
function elemento(classe, topo = 0) {
  const e = { nodeType: 1, className: classe, offsetTop: topo, attrs: {}, pai: null, textContent: '' };
  e.classList = { contains: (c) => e.className.split(' ').includes(c) };
  e.setAttribute = (k, v) => { e.attrs[k] = String(v); if (k === 'class') e.className = String(v); };
  e.getAttribute = (k) => (k in e.attrs ? e.attrs[k] : null);
  e.hasAttribute = (k) => k in e.attrs;
  Object.defineProperty(e, 'previousElementSibling', { get: () => { const i = e.pai ? e.pai.children.indexOf(e) : -1; return i > 0 ? e.pai.children[i - 1] : null; } });
  return e;
}
function listaFalsa({ primeiro, cada, cartoes, colunas, destaque = true, secao = 'noticias', escondida = false }) {
  const g = elemento('news-grid');
  g.attrs = { 'data-ads-primeiro': String(primeiro), 'data-ads-cada': String(cada) };
  g.hidden = escondida; g.children = []; g.mutacoes = 0;
  g.getClientRects = () => (escondida ? [] : [{}]);
  g.closest = () => ({ getAttribute: () => secao });
  g.insertBefore = (novo, ref) => { g.mutacoes++; novo.pai = g; g.children.splice(g.children.indexOf(ref), 0, novo); return novo; };
  g.removeChild = (c) => { g.mutacoes++; g.children.splice(g.children.indexOf(c), 1); c.pai = null; };
  for (let i = 0; i < cartoes; i++) { const c = elemento('news-card'); c.pai = g; g.children.push(c); }
  g.remedir = (n) => { // o destaque ocupa a linha toda; os outros vao de `n` em `n` por linha
    let k = 0; g.children.filter((c) => c.className === 'news-card').forEach((c, i) => { c.offsetTop = destaque ? (i === 0 ? 0 : 1 + Math.floor((i - 1) / n)) * 300 : Math.floor(i / n) * 300; k++; });
  };
  g.remedir(colunas);
  return g;
}
function rodarAds(grade) {
  const fila = []; const ouvintes = {};
  const doc = { querySelectorAll: () => (grade ? [grade] : []), createElement: () => elemento('') };
  const r = rodarScript('ads.js', { doc, janelaExtra: { setTimeout: (f) => { fila.push(f); return fila.length; }, addEventListener: (ev, f) => { ouvintes[ev] = f; } } });
  const rodarFila = () => { while (fila.length) fila.shift()(); };
  return { api: r.janela.BrubaoAds, rodarFila, ouvintes };
}
// o desenho esperado, calculado de outro jeito que o do ads.js (por resto da divisao, nao por salto): destaque sozinho na linha 0, `colunas` por linha depois; banner antes da linha
// `primeiro` e de cada `cada` depois dela. Ex.: "L1 L4 L4 ADS L4 ..." (L = cartoes na linha)
function referencia(cartoes, colunas, primeiro, cada) {
  const linhas = [1]; for (let resto = cartoes - 1; resto > 0; resto -= colunas) linhas.push(Math.min(colunas, resto));
  const s = []; linhas.forEach((n, i) => { if (i >= primeiro && (i - primeiro) % cada === 0) s.push('ADS'); s.push('L' + n); });
  return s.join(' ');
}
const mapa = (g) => { let s = [], n = 0, ultimo = null; for (const c of g.children) { if (c.classList.contains('ads')) { if (n) s.push('L' + n); n = 0; ultimo = null; s.push('ADS'); } else { if (ultimo === null || Math.abs(c.offsetTop - ultimo) > 2) { if (n) s.push('L' + n); n = 0; ultimo = c.offsetTop; } n++; } } if (n) s.push('L' + n); return s.join(' '); };

export default async function () {
  const a = [];
  const ach = (sev, msg, onde = '') => a.push(achado(sev, T, msg, onde));

  // ---------- 1. o que esta escrito no HTML ----------
  const paginas = paginasHtml();
  for (const pagina of paginas) {
    const bruto = ler(pagina);
    const h = compactar(bruto);
    const esperado = FIXOS[pagina] ?? [];
    const todos = [...bruto.matchAll(/<div class="ads"[^>]*>/g)];
    const ids = [...h.matchAll(/<div class="ads" data-ads="([^"]*)" aria-hidden="true"( hidden)?>ADS<\/div>/g)].filter((m) => (m[2] ?? '') === OCULTO).map((m) => m[1]);
    if (todos.length !== ids.length) ach('alto', `marcador de ADS fora do formato ou no estado errado (com ADS_ATIVOS = ${ADS_ATIVOS} precisa ser exatamente ${marcador('ID')}: rode npm run gerar)`, pagina);
    if (!esperado.length) { if (todos.length) ach('alto', `marcador de ADS numa pagina que nao pediu (${ids.join(', ')}): so entram nas paginas do inventario FIXOS de t-ads.mjs`, pagina); }
    else {
      if (JSON.stringify(ids) !== JSON.stringify(esperado.map((x) => x[0]))) ach('alto', `marcadores de ADS: devia haver ${esperado.map((x) => x[0]).join(', ')} (nesta ordem) e ha ${ids.join(', ') || 'nenhum'}`, pagina);
      for (const [id, antes, depois] of esperado) {
        if (!antes) continue;
        const i = h.indexOf(marcador(id));
        if (i < 0) continue;
        if (h.indexOf(marcador(id), i + 1) >= 0) { ach('alto', `marcador ${id} repetido na pagina`, pagina); continue; }
        if (!antes.test(h.slice(0, i))) ach('alto', `o marcador ${id} nao esta no lugar pedido: o que vem antes dele mudou (${antes.source.slice(0, 70)})`, pagina);
        if (!depois.test(h.slice(i + marcador(id).length))) ach('alto', `o marcador ${id} nao esta no lugar pedido: o que vem depois dele mudou (${depois.source})`, pagina);
      }
    }
    // dois marcadores colados = banner duplo
    if (/data-ads="[^"]*" aria-hidden="true"( hidden)?>ADS<\/div><div class="ads"/.test(h)) ach('alto', 'dois marcadores de ADS colados um no outro', pagina);
    // so o ads.js cria marcador dentro da lista (data-auto): no HTML escrito ele nao pode estar
    if (/data-auto\b/.test(bruto)) ach('alto', 'data-auto no HTML escrito: os marcadores de dentro das listas nascem so pelo assets/js/ads.js', pagina);

    // atributos das listas e o script
    const listas = [...bruto.matchAll(/<(?:div|section)[^>]*\bdata-ads-cada="[^"]*"[^>]*>/g)].map((m) => m[0]);
    const secaoDaPagina = pagina.replace(/\.html$/, '');
    const cfg = ADS_ATIVOS ? ADS_NAS_LISTAS[secaoDaPagina] : undefined;
    const temScript = /<script src="assets\/js\/ads\.js" defer><\/script>/.test(bruto);
    if (cfg) {
      if (listas.length !== 2) ach('alto', `devia haver 2 listas com data-ads-cada (a do resultado da busca e a lista de sempre) e ha ${listas.length}`, pagina);
      for (const l of listas) if (!l.includes(`data-ads-primeiro="${cfg.primeiro}"`) || !l.includes(`data-ads-cada="${cfg.cada}"`)) ach('alto', `lista com data-ads-primeiro/cada diferente do config.mjs (${cfg.primeiro}/${cfg.cada}): ${l.slice(0, 110)}`, pagina);
      if (!bruto.includes('class="news-grid secao-resultados"') || !/<(?:div|section) class="news-grid secao-resultados"[^>]*data-ads-cada/.test(bruto)) ach('alto', 'o resultado da busca/filtro (.secao-resultados) nao tem data-ads-cada: filtrado ficaria sem banner', pagina);
      if (!new RegExp(`<section class="news-grid" data-lista="cat-${secaoDaPagina}"[^>]*data-ads-cada`).test(bruto)) ach('alto', 'a lista de sempre (data-lista) nao tem data-ads-cada', pagina);
      if (!temScript) ach('alto', 'falta <script src="assets/js/ads.js" defer>: sem ele os banners de dentro da lista nao entram', pagina);
    } else {
      if (listas.length) ach('alto', ADS_ATIVOS ? 'data-ads-cada numa pagina que nao esta em ADS_NAS_LISTAS (config.mjs)' : 'ADS_ATIVOS = false: a lista nao pode levar data-ads-cada', pagina);
      if (temScript) ach('medio', ADS_ATIVOS ? 'carrega ads.js mas a pagina nao tem lista com data-ads-cada' : 'ADS_ATIVOS = false: a pagina nao pode carregar ads.js', pagina);
    }
  }
  for (const p of Object.keys(FIXOS)) if (!paginas.includes(p)) ach('alto', `pagina do inventario FIXOS nao existe: ${p}`);
  for (const [secao, c] of Object.entries(ADS_NAS_LISTAS)) {
    if (!Number.isInteger(c.primeiro) || !Number.isInteger(c.cada) || c.primeiro < 1 || c.cada < 1) ach('alto', `ADS_NAS_LISTAS.${secao} precisa de inteiros 1 ou mais (primeiro e cada): ${JSON.stringify(c)}`, 'config.mjs');
    if (!paginas.includes(`${secao}.html`)) ach('alto', `ADS_NAS_LISTAS.${secao} nao tem pagina`, 'config.mjs');
  }
  // o "Em construcao" da Wiki e um componente (icone + titulo + texto), nao um paragrafo solto
  if (existe('wiki.html')) {
    const w = compactar(ler('wiki.html'));
    if (!/<div class="bloco-vazio"><svg class="ico[^"]*"[^>]*>[\s\S]*?<\/svg><b>Em construção<\/b><span>[^<]+<\/span><\/div>/.test(w)) ach('alto', 'a Wiki precisa do componente "Em construção" (.bloco-vazio com icone, titulo e texto)', 'wiki.html');
    if (/<p[^>]*>[^<]*Novos jogos entram aqui/.test(w)) ach('medio', 'texto solto "Novos jogos entram aqui" em paragrafo: ele vive dentro do componente Em construção', 'wiki.html');
  }
  if (!existe('assets/icones/construction.svg')) ach('alto', 'falta assets/icones/construction.svg (icone do "Em construção")');

  // ---------- 2. CSS: o marcador tem altura fixa (a pagina nao pula quando o anuncio entrar) e nao quebra a grade ----------
  const css = ler('assets/css/style.css');
  if (!/\.ads\[hidden\]\s*\{[^}]*display:\s*none/.test(css)) ach('alto', 'falta .ads[hidden] { display: none }: sem isso o display: grid de .ads vence o atributo hidden e o ADS escondido apareceria', 'style.css');
  if (!/(?:^|\n)\.ads\s*\{[^}]*\bheight:\s*\d+px/.test(css)) ach('alto', '.ads sem altura fixa em px: quando o anuncio de verdade entrar a pagina pularia', 'style.css');
  if (!/\.news-grid\s*>\s*\.ads[^{]*\{[^}]*grid-column:\s*1\s*\/\s*-1/.test(css)) ach('alto', 'banner dentro da lista (.news-grid > .ads) precisa ocupar a linha toda (grid-column: 1 / -1)', 'style.css');
  if (!/\.ads\b[^{]*\{[^}]*font-family:\s*var\(--font-display\)/.test(css)) ach('baixo', 'a palavra ADS do marcador devia usar a fonte dos titulos', 'style.css');

  // ---------- 3. assets/js/ads.js ----------
  if (!existe('assets/js/ads.js')) { ach('critico', 'falta assets/js/ads.js'); return a; }
  const fonte = ler('assets/js/ads.js');
  if (/\binnerHTML\b|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(fonte)) ach('critico', 'ads.js monta HTML por texto (innerHTML/insertAdjacentHTML/document.write/eval): so textContent e permitido', 'assets/js/ads.js');
  let api = null;
  try { api = rodarAds(null).api; } catch (e) { ach('critico', `ads.js lancou erro ao carregar: ${e.message}`, 'assets/js/ads.js'); return a; }
  if (!api || typeof api.inicioDasLinhas !== 'function' || typeof api.posicoes !== 'function') { ach('critico', 'ads.js nao expoe window.BrubaoAds.{inicioDasLinhas, posicoes}'); return a; }

  const igual = (obtido, esperado, nome) => { if (JSON.stringify(obtido) !== JSON.stringify(esperado)) ach('alto', `ads.js ${nome}: devolveu ${JSON.stringify(obtido)} e devia devolver ${JSON.stringify(esperado)}`, 'assets/js/ads.js'); };
  // 3a. linhas: cartoes com o mesmo topo (ate 2 px de folga) sao a mesma linha
  igual(api.inicioDasLinhas([0, 0, 0, 0, 300, 300, 300, 300, 600]), [0, 4, 8], 'inicioDasLinhas (linhas de 4)');
  igual(api.inicioDasLinhas([0, 1, 2, 2, 300]), [0, 4], 'inicioDasLinhas (folga de 1 a 2 px e a mesma linha)');
  igual(api.inicioDasLinhas([0, 3]), [0, 1], 'inicioDasLinhas (3 px ja e outra linha)');
  igual(api.inicioDasLinhas([0, 300, 600]), [0, 1, 2], 'inicioDasLinhas (uma coluna so)');
  igual(api.inicioDasLinhas([]), [], 'inicioDasLinhas (lista vazia)');
  // 3b. onde entra: depois de `primeiro` linhas e depois a cada `cada`; nunca depois da ultima
  const noticias = [0, 1, 5, 9, 13, 17, 21, 25]; // o destaque + 7 linhas de 4
  igual(api.posicoes(noticias, 3, 2), [9, 17, 25], 'posicoes (Noticias: 3 e depois a cada 2)');
  igual(api.posicoes([0, 1, 4, 7, 10, 13, 16, 19, 22, 25, 28], 4, 4), [10, 22], 'posicoes (Reviews: 4 e depois a cada 4)');
  igual(api.posicoes([0, 1, 5, 9], 2, 2), [5], 'posicoes (Lancamentos: 2 e depois a cada 2)');
  igual(api.posicoes([0, 1, 5, 9, 13, 17], 2, 2), [5, 13], 'posicoes (Lancamentos: antes da 3a e da 5a linha)');
  igual(api.posicoes([0, 1, 5], 3, 2), [], 'posicoes (so 3 linhas: nao entra banner no fim da lista)');
  igual(api.posicoes([0, 1, 5, 9], 3, 2), [9], 'posicoes (a 4a linha existe: entra antes dela)');
  igual(api.posicoes([0, 1, 5, 9, 13, 17], 3, 2), [9, 17], 'posicoes (repete a cada 2: antes da 4a e da 6a, nao da 5a)');
  igual(api.posicoes([0, 1, 2, 3], 0, 2), [], 'posicoes (primeiro 0: nenhum)');
  igual(api.posicoes([0, 1, 2, 3], 2, 0), [], 'posicoes (cada 0: nenhum e sem laco infinito)');
  igual(api.posicoes([0, 1, 2, 3], NaN, 2), [], 'posicoes (NaN: nenhum)');
  igual(api.posicoes([], 3, 2), [], 'posicoes (lista vazia)');

  // 3c. a lista de mentira: o ads.js mede, coloca, refaz quando a largura muda, nao mexe sem precisar e nao coloca em lista escondida
  try {
    const g = listaFalsa({ primeiro: 3, cada: 2, cartoes: 30, colunas: 4 });
    const { rodarFila, ouvintes } = rodarAds(g);
    rodarFila();
    const m4 = mapa(g), ref4 = referencia(30, 4, 3, 2);
    if (m4 !== ref4) ach('alto', `ads.js numa lista de 30 cartoes (destaque + 4 por linha, primeiro 3, cada 2): ficou "${m4}" e devia ficar "${ref4}"`, 'assets/js/ads.js');
    const marcas = g.children.filter((c) => c.classList.contains('ads'));
    const m0 = marcas[0];
    if (m0 && (m0.textContent !== 'ADS' || m0.getAttribute('aria-hidden') !== 'true' || !m0.hasAttribute('data-auto') || m0.getAttribute('data-ads') !== 'noticias-na-lista' || m0.className !== 'ads')) ach('alto', 'marcador criado pelo ads.js fora do formato (class ads, texto ADS, aria-hidden, data-auto, data-ads="<secao>-na-lista")', 'assets/js/ads.js');
    if (g.children[g.children.length - 1].classList.contains('ads') || g.children[0].classList.contains('ads')) ach('alto', 'ads.js colocou banner no comeco ou no fim da lista', 'assets/js/ads.js');
    // nada mudou: nao mexe (os observadores se disparam sozinhos; mexer sem precisar faria laco)
    const antes = g.mutacoes; ouvintes.resize?.(); rodarFila();
    if (g.mutacoes !== antes) ach('alto', 'ads.js mexeu na lista sem a largura ter mudado (risco de laco com o observador)', 'assets/js/ads.js');
    // tela mais estreita: 2 por linha => refaz do zero, sem sobra e sem duplicar
    g.remedir(2); ouvintes.resize?.(); rodarFila();
    const m2 = mapa(g), ref2 = referencia(30, 2, 3, 2);
    if (m2 !== ref2) ach('alto', `ads.js depois de a lista passar a 2 por linha: ficou "${m2}" e devia ficar "${ref2}"`, 'assets/js/ads.js');
    // volta a 4 por linha: o desenho volta ao primeiro
    g.remedir(4); ouvintes.resize?.(); rodarFila();
    if (mapa(g) !== m4) ach('alto', `ads.js ao voltar para 4 por linha nao refez o desenho: "${mapa(g)}"`, 'assets/js/ads.js');
    // acrescentou cartoes (Ver mais): a conta continua valendo para a lista toda
    for (let i = 0; i < 30; i++) { const c = elemento('news-card'); c.pai = g; g.children.push(c); }
    g.remedir(4); ouvintes.resize?.(); rodarFila();
    const mais = mapa(g), refMais = referencia(60, 4, 3, 2);
    if (mais !== refMais) ach('alto', `ads.js depois de 30 cartoes a mais (Ver mais): ficou "${mais}" e devia ficar "${refMais}"`, 'assets/js/ads.js');
    if (/ADS$/.test(mais) || /ADS ADS/.test(mais)) ach('alto', `ads.js deixou banner no fim ou dois colados: "${mais}"`, 'assets/js/ads.js');

    // lista com poucos cartoes: nenhum
    const pouca = listaFalsa({ primeiro: 3, cada: 2, cartoes: 9, colunas: 4 }); const rp = rodarAds(pouca); rp.rodarFila();
    if (pouca.children.some((c) => c.classList.contains('ads'))) ach('alto', 'ads.js colocou banner numa lista de 9 cartoes (3 linhas): nao tem linha abaixo', 'assets/js/ads.js');
    // lista escondida (o resultado da busca quando nao ha filtro): nao mede nem coloca
    const esc = listaFalsa({ primeiro: 3, cada: 2, cartoes: 30, colunas: 4, escondida: true }); const re = rodarAds(esc); re.rodarFila();
    if (esc.mutacoes) ach('alto', 'ads.js mexeu numa lista escondida (nao da para medir as linhas)', 'assets/js/ads.js');
    // Reviews: destaque + 3 por linha, primeiro 4, cada 4 (a secao entra no nome do marcador)
    const rev = listaFalsa({ primeiro: 4, cada: 4, cartoes: 38, colunas: 3, secao: 'reviews' }); const rr = rodarAds(rev); rr.rodarFila();
    const refRev = referencia(38, 3, 4, 4);
    if (mapa(rev) !== refRev) ach('alto', `ads.js em Reviews (destaque + 3 por linha, primeiro 4, cada 4): ficou "${mapa(rev)}" e devia ficar "${refRev}"`, 'assets/js/ads.js');
    if (!rev.children.some((c) => c.getAttribute && c.getAttribute('data-ads') === 'reviews-na-lista')) ach('alto', 'o marcador de dentro da lista devia se chamar <secao>-na-lista (reviews-na-lista)', 'assets/js/ads.js');
    // lista sem destaque (uma colecao so de cartoes iguais): a primeira linha ja e uma linha de colunas
    const sem = listaFalsa({ primeiro: 2, cada: 2, cartoes: 17, colunas: 4, destaque: false, secao: 'lancamentos' }); const rs = rodarAds(sem); rs.rodarFila();
    if (mapa(sem) !== 'L4 L4 ADS L4 L4 ADS L1') ach('alto', `ads.js numa lista sem destaque (17 cartoes, 4 por linha, 2 e a cada 2): ficou "${mapa(sem)}" e devia ficar "L4 L4 ADS L4 L4 ADS L1"`, 'assets/js/ads.js');
  } catch (e) { ach('critico', `a lista de mentira derrubou o ads.js: ${e.message}`, 'assets/js/ads.js'); }

  a.push(achado('info', T, `ADS: ${Object.entries(FIXOS).filter(([p]) => p !== 'index.html').reduce((s, [, v]) => s + v.length, 0)} marcadores fixos em ${Object.keys(FIXOS).length - 1} paginas + os das listas (${Object.entries(ADS_NAS_LISTAS).map(([k, v]) => `${k} ${v.primeiro}/${v.cada}`).join(', ')})`));
  return a;
}
