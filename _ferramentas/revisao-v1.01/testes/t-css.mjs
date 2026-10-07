// Higiene do CSS (assets/css/style.css): camadas repetidas, valores mortos, seletores sem uso, cores soltas, foco e movimento.
// A analise esta em css-analise.mjs (roda tambem sozinha: node css-analise.mjs --detalhes).
import { achado, ler } from './lib.mjs';
import { analisar } from './css-analise.mjs';

const T = 'css';

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
  // o arquivo e organizado em secoes numeradas com indice no topo: regra nova entra na secao do componente, nao no fim
  const css = ler('assets/css/style.css'), indice = [...(css.match(/INDICE([\s\S]*?)PONTOS DE MUDANCA/)?.[1] ?? '').matchAll(/^\s+(\d+)\.\s+(.+)$/gm)].map((m) => [Number(m[1]), m[2].trim()]);
  const secoes = [...css.matchAll(/^\/\* ===== (\d+)\. (.+?) ===== \*\/$/gm)].map((m) => [Number(m[1]), m[2].trim()]);
  if (!indice.length) a.push(achado('medio', T, 'style.css sem indice de secoes no topo (INDICE ... PONTOS DE MUDANCA)'));
  else if (JSON.stringify(indice) !== JSON.stringify(secoes)) a.push(achado('medio', T, `as secoes do style.css nao batem com o indice do topo (indice: ${indice.map((x) => x[0]).join(',')} | secoes: ${secoes.map((x) => x[0]).join(',')})`));
  if (!/\boverflow-wrap:\s*break-word\b/.test(css)) a.push(achado('medio', T, 'sem overflow-wrap: break-word no body: link ou palavra comprida estoura a tela em celular pequeno'));
  if (!r.impressao) a.push(achado('info', T, 'sem estilos de impressao (@media print)'));
  if (r.importExterno.length) a.push(achado('info', T, `CSS importa recurso externo (${r.importExterno.join(', ')}): cadeia de carregamento mais longa (ver Bloco 7)`));
  a.push(achado('info', T, `${r.arquivo}: ${r.linhas} linhas, ${(r.bytes / 1024).toFixed(1)} KB, ${r.regras} regras; pontos de mudanca de layout: ${Object.keys(r.breakpoints).sort((x, y) => parseInt(x.split(':')[1]) - parseInt(y.split(':')[1])).join(', ')}`));
  return a;
}
