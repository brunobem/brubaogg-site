// Higiene do CSS (assets/css/style.css): camadas repetidas, valores mortos, seletores sem uso, cores soltas, foco e movimento.
// A analise esta em css-analise.mjs (roda tambem sozinha: node css-analise.mjs --detalhes).
import { achado, arquivosPublicados, existeExato, ler, paginasHtml } from './lib.mjs';
import { analisar, lerCss } from './css-analise.mjs';

const T = 'css';

// Tipografia: titulos (h1 a h6) e rotulos curtos de interface em Lilita One (--font-display); todo o resto do texto em Inter (--font-body). As duas ficam no proprio site
// (assets/fonts, com preload em toda pagina) e nenhuma outra fonte entra: nem font-family solto numa regra, nem estilo escrito dentro de pagina ou de JS. A conferencia do que o
// navegador de fato desenha (fonte usada, nao pedida) e a varredura de navegador fontes-paginas.js.
const FONTE_OK = new Set(['var(--font-display)', 'var(--font-body)', 'inherit']);
function tipografia(css) {
  const a = [], regras = lerCss(css), onde = 'assets/css/style.css';
  const falha = (sev, msg, lugar = onde) => a.push(achado(sev, T, msg, lugar));
  const decl = (regra, prop) => regra?.decls.find(([p]) => p === prop)?.[1].trim().replace(/\s*!important$/, '');
  const raizCss = regras.find((x) => x.tipo === 'regra' && x.seletor === ':root');
  if (!/^"Lilita One"\s*,/.test(decl(raizCss, '--font-display') ?? '')) falha('alto', '--font-display (fonte dos titulos) precisa comecar por "Lilita One"');
  if (!/^"Inter"\s*,/.test(decl(raizCss, '--font-body') ?? '')) falha('alto', '--font-body (fonte do texto) precisa comecar por "Inter"');
  const corpo = regras.find((x) => x.tipo === 'regra' && x.seletor === 'body' && !x.contexto);
  if (decl(corpo, 'font-family') !== 'var(--font-body)') falha('alto', 'body precisa ter font-family: var(--font-body) (Inter): sem isso o texto cai na fonte padrao do navegador');
  const titulo = (seletor) => regras.find((x) => x.tipo === 'regra' && !x.contexto && x.seletor === seletor);
  for (const s of ['h1', 'h2, h3, h4, h5, h6']) {
    const r = titulo(s);
    if (decl(r, 'font-family') !== 'var(--font-display)') falha('alto', `${s} precisa ter font-family: var(--font-display) (Lilita One): titulo de qualquer nivel e Lilita`);
    if (decl(r, 'font-weight') !== '400') falha('alto', `${s} precisa ter font-weight: 400: a Lilita One so existe no peso 400 e qualquer outro vira negrito falso, borrado`);
  }
  const campos = regras.find((x) => x.tipo === 'regra' && !x.contexto && /^input\b/.test(x.seletor) && /\bbutton\b/.test(x.seletor) && /\bselect\b/.test(x.seletor) && /\btextarea\b/.test(x.seletor));
  if (decl(campos, 'font-family') !== 'inherit') falha('alto', 'campos e botoes (input, button, select, textarea) precisam de font-family: inherit: senao o navegador usa a fonte dele neles');
  // toda declaracao de fonte usa so os dois tokens (ou inherit); font: abreviado esconde a familia
  const soltas = [];
  for (const r of regras) {
    if (r.tipo !== 'regra') continue;
    for (const [p, v] of r.decls) {
      const valor = v.trim().replace(/\s*!important$/, '');
      if (p === 'font-family' && !FONTE_OK.has(valor)) soltas.push(`${r.seletor} { font-family: ${valor} }`);
      if (p === 'font' && valor !== 'inherit') soltas.push(`${r.seletor} { font: ${valor} }`);
    }
  }
  if (soltas.length) falha('alto', `${soltas.length} regra(s) com fonte fora do par Lilita One / Inter (use var(--font-display) ou var(--font-body)): ${soltas.slice(0, 4).join('; ')}${soltas.length > 4 ? ` ... (+${soltas.length - 4})` : ''}`);
  // @font-face: so as duas familias, cada uma com arquivo que existe; Inter variavel (varios pesos), Lilita um peso so
  const faces = regras.filter((x) => x.seletor === '@font-face'), porFamilia = new Map();
  for (const f of faces) {
    const fam = (decl(f, 'font-family') ?? '').replace(/["']/g, ''), peso = decl(f, 'font-weight') ?? '', src = decl(f, 'src') ?? '';
    (porFamilia.get(fam) ?? porFamilia.set(fam, []).get(fam)).push(peso);
    if (fam !== 'Inter' && fam !== 'Lilita One') falha('alto', `@font-face de "${fam}": so Inter e Lilita One entram no site`);
    if (decl(f, 'font-display') !== 'swap') falha('medio', `@font-face de "${fam}" sem font-display: swap: o texto ficaria invisivel ate a fonte chegar`);
    for (const m of src.matchAll(/url\("?([^")]+)"?\)/g)) {
      const caminho = `assets/css/${m[1]}`.replace(/[^/]+\/\.\.\//g, '');
      if (existeExato(caminho) !== 'ok') falha('alto', `@font-face de "${fam}" aponta para um arquivo que nao existe: ${m[1]}`);
      if (!/\.woff2$/.test(m[1])) falha('baixo', `@font-face de "${fam}" fora do woff2 (${m[1]}): o woff2 e o formato pequeno e que todos os navegadores atuais leem`);
    }
  }
  if (!porFamilia.has('Inter')) falha('alto', 'sem @font-face da Inter: o texto cairia na fonte padrao do navegador');
  if (!porFamilia.has('Lilita One')) falha('alto', 'sem @font-face da Lilita One: os titulos cairiam na fonte padrao do navegador');
  if ((porFamilia.get('Inter') ?? []).some((p) => p !== '100 900')) falha('medio', 'a Inter e uma fonte variavel: o @font-face dela precisa declarar font-weight: 100 900 (senao o negrito vira falso)');
  if ((porFamilia.get('Lilita One') ?? []).some((p) => p !== '400')) falha('medio', 'a Lilita One so tem o peso 400: o @font-face dela precisa declarar font-weight: 400');
  // nenhum outro lugar escreve fonte: pagina, JS
  const fora = [];
  for (const p of paginasHtml()) {
    const h = ler(p);
    if (/\bstyle="[^"]*\bfont(-family)?\s*:/i.test(h) || /<style\b[^>]*>[^<]*\bfont(-family)?\s*:/i.test(h) || /<font\b/i.test(h)) fora.push(p);
  }
  if (fora.length) falha('alto', `${fora.length} pagina(s) escrevem fonte no proprio HTML (style="font...", <style> ou <font>): a fonte vive so no style.css`, fora.slice(0, 3).join(', '));
  const js = arquivosPublicados().filter((r) => /^assets\/js\/[^/]+\.js$/.test(r) && /\bfontFamily\b|font-family/.test(ler(r)));
  if (js.length) falha('alto', `JS que mexe na fonte (${js.join(', ')}): a fonte vive so no style.css`, 'assets/js');
  // preload das duas em toda pagina que usa o style.css (a fonte chega junto do HTML, sem esperar o CSS: menos piscada ao carregar)
  const semPreload = [];
  for (const p of paginasHtml()) {
    const h = ler(p);
    if (!/assets\/css\/style\.css/.test(h)) continue;
    for (const arq of ['lilita-one-latin.woff2', 'inter-latin-wght-normal.woff2']) if (!new RegExp(`<link rel="preload" href="(?:\\.\\./)*/?assets/fonts/${arq.replace(/\./g, '\\.')}" as="font" type="font/woff2" crossorigin>`).test(h)) semPreload.push(`${p} (${arq})`);
  }
  if (semPreload.length) falha('medio', `${semPreload.length} pagina(s) sem <link rel="preload" ... as="font" crossorigin> de uma das duas fontes: ${semPreload.slice(0, 3).join(', ')}${semPreload.length > 3 ? ' ...' : ''}`);
  a.push(achado('info', T, `tipografia: titulos em Lilita One, texto em Inter; ${faces.length} @font-face (${[...porFamilia].map(([f, p]) => `${f} x${p.length}`).join(', ')}); preload em ${paginasHtml().filter((p) => /assets\/css\/style\.css/.test(ler(p))).length} paginas`));
  return a;
}

// Grade de 8 px: todo margin, padding e gap e 0, auto, var(--space-N) ou px multiplo de 8. Detalhe pequeno de um controle (botao, etiqueta, campo, link de menu) pode usar o meio passo, multiplo de 4.
// MICRO lista esses controles; fora dela, valor que nao e multiplo de 8 vira aviso. Ajuste otico de pixel (.sr-only, seta do carrossel) fica de fora.
const PROPS_DE_ESPACO = /^(margin|padding)(-(top|right|bottom|left|inline|block)(-(start|end))?)?$|^(gap|row-gap|column-gap)$/;
const MICRO = new Set(['.btn', '.tag', '.tag-list a', '.brand', '.social-bar', '.nav-site-links a', '.nav-menu', '.menu-lista a', '.search input', '.search-results', '.search-results a', '.search-results a.sr-all', '.sr-txt',
  '.busca-chip', '.busca-atalho', '.ticker', '.discord p', '.car-cta', '.cobertura-title', '.live-badge', '.live-botao', '.gta-title', '.gta-faixa .gta-title', '.gta-faixa .unit', '.news-excerpt mark', '.arquivo-lista', '.arquivo-nav', '.arquivo-nav a',
  '.secao-campo input', '.secao-ordem select', '.secao-rot', '.secao-item, .secao-subitem', '.secao-subitem', '.secao-sub:not([hidden])', '.aviso-spoiler', '.pl h2', '.pl-texto', '.veredito-nota', '.veredito-rec', '.fontes-lista a', '.assunto-lista a', '.nav-site-links a.nav-casa', '.autoria-ia', '.doc li', 'nav.footer-col a']);
const SEM_GRADE = new Set(['.sr-only', '.car-seta::before', '.car-proximo::before', '.fachada-play .ico', '.short-item .fachada-play .ico']);

export default async function () {
  const a = [], r = analisar();
  const lista = (xs, f, n = 4) => xs.slice(0, n).map(f).join('; ') + (xs.length > n ? ` ... (+${xs.length - n})` : '');

  if (r.repetidos.length) a.push(achado('medio', T, `${r.repetidos.length} seletor(es) definido(s) mais de uma vez no mesmo contexto (CSS crescendo por camadas): ${lista(r.repetidos, (x) => `${x.seletor} [linhas ${x.linhas.join(',')}]`)}`));
  if (r.sobrescritas.length) a.push(achado('baixo', T, `${r.sobrescritas.length} propriedade(s) com valor morto (redefinida depois na mesma regra): ${lista(r.sobrescritas, (x) => `${x.seletor} { ${x.prop} }`)}`));
  if (r.semUso.length) a.push(achado('baixo', T, `${r.semUso.length} seletor(es) com classe/id que nao existe em nenhuma pagina nem no JS: ${lista(r.semUso, (x) => x.seletor, 6)}`));
  if (r.cores.length > 8) a.push(achado('baixo', T, `${r.cores.length} cores distintas escritas direto nas regras (${r.cores.reduce((s, c) => s + c[1], 0)} usos) em vez de variaveis de :root`));
  const semMovimento = r.important.filter((x) => !/transition|animation|scroll-behavior/.test(x));
  if (semMovimento.length) a.push(achado('medio', T, `!important fora do bloco de movimento reduzido: ${semMovimento.join('; ')}`));
  if (!r.movimentoReduzido) a.push(achado('alto', T, 'sem @media (prefers-reduced-motion): animacoes continuam para quem pediu menos movimento'));
  for (const s of r.outlineNenhum) if (!r.focoVisivel.some((f) => f.startsWith(s))) a.push(achado('medio', T, `${s} tira o contorno de foco (outline) sem outro indicador de foco no CSS`));
  if (!r.cor.colorScheme) a.push(achado('baixo', T, 'sem color-scheme: dark (barras de rolagem e controles nativos aparecem claros num site escuro)'));
  if (!r.focoVisivel.some((f) => /^:focus-visible$/.test(f))) a.push(achado('medio', T, 'sem regra global de foco do teclado (:focus-visible): quem navega por Tab depende do contorno padrao do navegador'));
  // espacamento na grade de 8 px
  const fora = [];
  for (const regra of lerCss(ler('assets/css/style.css'))) {
    if (regra.tipo !== 'regra') continue;
    const micro = MICRO.has(regra.seletor);
    if (SEM_GRADE.has(regra.seletor)) continue;
    for (const [prop, valor] of regra.decls) {
      if (!PROPS_DE_ESPACO.test(prop)) continue;
      for (const px of valor.replace(/!important/, '').matchAll(/(-?\d*\.?\d+)px/g)) {
        const n = Math.abs(parseFloat(px[1])); if (n === 0 || n % 8 === 0 || (micro && n % 4 === 0)) continue;
        fora.push(`${regra.seletor} { ${prop}: ${valor} }${micro ? ' (controle: so multiplo de 4)' : ''}`); break;
      }
    }
  }
  if (fora.length) a.push(achado('medio', T, `${fora.length} espacamento(s) fora da grade de 8 px (use var(--space-N); detalhe de controle pode usar multiplo de 4): ${lista(fora, (x) => x, 5)}`));
  // o arquivo e organizado em secoes numeradas com indice no topo: regra nova entra na secao do componente, nao no fim
  const css = ler('assets/css/style.css'), indice = [...(css.match(/INDICE([\s\S]*?)PONTOS DE MUDANCA/)?.[1] ?? '').matchAll(/^\s+(\d+)\.\s+(.+)$/gm)].map((m) => [Number(m[1]), m[2].trim()]);
  const secoes = [...css.matchAll(/^\/\* ===== (\d+)\. (.+?) ===== \*\/$/gm)].map((m) => [Number(m[1]), m[2].trim()]);
  if (!indice.length) a.push(achado('medio', T, 'style.css sem indice de secoes no topo (INDICE ... PONTOS DE MUDANCA)'));
  else if (JSON.stringify(indice) !== JSON.stringify(secoes)) a.push(achado('medio', T, `as secoes do style.css nao batem com o indice do topo (indice: ${indice.map((x) => x[0]).join(',')} | secoes: ${secoes.map((x) => x[0]).join(',')})`));
  if (!/\boverflow-wrap:\s*break-word\b/.test(css)) a.push(achado('medio', T, 'sem overflow-wrap: break-word no body: link ou palavra comprida estoura a tela em celular pequeno'));
  a.push(...tipografia(css));
  // o bloco "grande + pequenos" empilha pela largura do PROPRIO bloco (na Wiki, a 768 px, o menu lateral deixava a lista dos pequenos com ~175 px e o titulo quebrava uma letra por linha)
  if (!/\.feed-sec\s*\{[^}]*\bcontainer:\s*bloco\s*\/\s*inline-size/.test(css)) a.push(achado('alto', T, '.feed-sec precisa ser o container "bloco" (container: bloco / inline-size): sem isso o bloco grande + pequenos nao empilha pela largura dele', 'assets/css/style.css'));
  if (!/@container bloco \(max-width:\s*\d+px\)\s*\{[^}]*\.bloco-grade[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/.test(css)) a.push(achado('alto', T, 'falta a regra @container bloco (max-width: ...) que poe o .bloco-grade em uma coluna: na Wiki, a ~768 px, o titulo dos cartoes pequenos quebra uma letra por linha', 'assets/css/style.css'));
  if (!r.impressao) a.push(achado('info', T, 'sem estilos de impressao (@media print)'));
  if (r.importExterno.length) a.push(achado('info', T, `CSS importa recurso externo (${r.importExterno.join(', ')}): cadeia de carregamento mais longa (ver Bloco 7)`));
  a.push(achado('info', T, `${r.arquivo}: ${r.linhas} linhas, ${(r.bytes / 1024).toFixed(1)} KB, ${r.regras} regras; pontos de mudanca de layout: ${Object.keys(r.breakpoints).sort((x, y) => parseInt(x.split(':')[1]) - parseInt(y.split(':')[1])).join(', ')}`));
  return a;
}
