// Estrutura de cada pagina publicada: idioma, titulo, descricao, canonical, h1, ids, imagens, links externos, tags balanceadas.
import { achado, DOMINIO, ler, limparHtml, paginasHtml, tags, atributos, decodificar, textoVisivel } from './lib.mjs';
import { GTA6 } from '../../gerador/config.mjs';

const T = 'html';
const VAZIAS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr', 'path', 'circle', 'rect', 'line', 'polyline', 'polygon', 'ellipse', 'use', 'stop']);
const OPCIONAIS = new Set(['p', 'li', 'dt', 'dd', 'tr', 'td', 'th', 'thead', 'tbody', 'option', 'html', 'head', 'body']);

export default async function () {
  const a = [];
  const titulos = new Map(), descricoes = new Map();
  const paginas = paginasHtml();

  for (const rel of paginas) {
    const bruto = ler(rel);
    const html = limparHtml(bruto);
    const ts = tags(html);
    const nome = (n) => ts.filter((t) => t.nome === n && !t.fecha);
    const noindex = /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html);
    const redirecionador = /http-equiv=["']refresh["']/i.test(html);

    // idioma, viewport, charset
    const h = nome('html')[0];
    if (!h?.attrs.lang) a.push(achado('alto', T, 'falta lang no <html>', rel));
    else if (!/^pt(-br)?$/i.test(h.attrs.lang)) a.push(achado('medio', T, `lang inesperado: ${h.attrs.lang}`, rel));
    if (!nome('meta').some((m) => m.attrs.name === 'viewport')) a.push(achado('alto', T, 'falta <meta name="viewport"> (celular renderiza como desktop)', rel));
    if (!nome('meta').some((m) => m.attrs.charset)) a.push(achado('medio', T, 'falta <meta charset>', rel));

    // titulo
    const titulo = decodificar((html.match(/<title>([\s\S]*?)<\/title>/i) ?? [])[1] ?? '').trim();
    if (!titulo) a.push(achado('alto', T, 'falta <title>', rel));
    else {
      if (titulo.length > 62) a.push(achado('baixo', T, `titulo com ${titulo.length} caracteres (o Google corta perto de 60)`, rel));
      if (!redirecionador) (titulos.get(titulo) ?? titulos.set(titulo, []).get(titulo)).push(rel);
    }
    // descricao
    const desc = decodificar(nome('meta').find((m) => m.attrs.name === 'description')?.attrs.content ?? '').trim();
    if (!desc && !redirecionador) a.push(achado('medio', T, 'falta meta description', rel));
    else if (desc && (desc.length < 45 || desc.length > 160)) a.push(achado('baixo', T, `meta description com ${desc.length} caracteres (ideal 45 a 160)`, rel));
    if (desc && !noindex) (descricoes.get(desc) ?? descricoes.set(desc, []).get(desc)).push(rel);

    // canonical (so em paginas indexaveis)
    const can = nome('link').find((l) => l.attrs.rel === 'canonical')?.attrs.href;
    if (!noindex && !redirecionador) {
      if (!can) a.push(achado('medio', T, 'pagina indexavel sem <link rel="canonical">', rel));
      else {
        const esperado = [`${DOMINIO}/${rel}`, ...(rel === 'index.html' ? [`${DOMINIO}/`] : [])];
        if (!esperado.includes(can)) a.push(achado('medio', T, `canonical diferente do endereco da pagina: ${can}`, rel));
      }
    }
    // open graph basico
    if (!noindex && !redirecionador) for (const p of ['og:title', 'og:description', 'og:image']) if (!nome('meta').some((m) => m.attrs.property === p)) a.push(achado('medio', T, `falta ${p} (o link compartilhado no Discord/WhatsApp/TikTok sai sem previa)`, rel));

    // h1 e ordem dos titulos
    const hs = ts.filter((t) => /^h[1-6]$/.test(t.nome) && !t.fecha).map((t) => +t.nome[1]);
    if (!redirecionador) {
      const n1 = hs.filter((n) => n === 1).length;
      if (n1 === 0) a.push(achado('alto', T, 'pagina sem <h1>', rel));
      else if (n1 > 1 + ts.filter((x) => !x.fecha && x.nome !== 'html' && x.attrs.lang).length) a.push(achado('medio', T, `${n1} <h1> na mesma pagina (deveria ter um so; versao em outro idioma precisa de um bloco com lang="...")`, rel));
      for (let i = 1; i < hs.length; i++) if (hs[i] > hs[i - 1] + 1) { a.push(achado('baixo', T, `salto na ordem dos titulos (h${hs[i - 1]} para h${hs[i]})`, rel)); break; }
      if (!nome('main').length) a.push(achado('medio', T, 'falta <main>', rel));
    }

    // ids duplicados
    const ids = new Map();
    for (const t of ts) if (!t.fecha && t.attrs.id) ids.set(t.attrs.id, (ids.get(t.attrs.id) ?? 0) + 1);
    for (const [id, n] of ids) if (n > 1) a.push(achado('medio', T, `id duplicado: "${id}" (${n}x)`, rel));

    // imagens, iframes, links externos
    let semDim = 0;
    for (const t of nome('img')) {
      if (t.attrs.alt == null) a.push(achado('medio', T, `<img> sem alt: ${(t.attrs.src ?? '').slice(0, 60)}`, rel));
      if (!t.attrs.width && !t.attrs.height && !/^data:/.test(t.attrs.src ?? '')) semDim++;
    }
    if (semDim) a.push(achado('info', T, 'imagens sem width/height (pode causar salto de layout; ver Bloco 7)', `${rel} (${semDim})`));
    for (const t of nome('iframe')) if (!t.attrs.title) a.push(achado('medio', T, '<iframe> sem title (leitor de tela)', rel));
    for (const t of nome('a')) {
      if (t.attrs.target === '_blank' && !/noopener/.test(t.attrs.rel ?? '')) a.push(achado('medio', T, `link com target=_blank sem rel="noopener": ${(t.attrs.href ?? '').slice(0, 60)}`, rel));
      if (/^http:\/\//i.test(t.attrs.href ?? '')) a.push(achado('medio', T, `link sem HTTPS: ${t.attrs.href}`, rel));
    }
    for (const t of ts) if (!t.fecha && ['img', 'script', 'iframe', 'link'].includes(t.nome) && /^http:\/\//i.test(t.attrs.src ?? t.attrs.href ?? '')) a.push(achado('alto', T, `recurso carregado sem HTTPS (conteudo misto): ${t.attrs.src ?? t.attrs.href}`, rel));

    // links e botoes sem nome acessivel
    const re = /<(a|button)\b((?:"[^"]*"|'[^']*'|[^'">])*)>([\s\S]*?)<\/\1>/gi;
    for (const m of html.matchAll(re)) {
      const at = atributos(m[2]);
      const interno = textoVisivel(m[3]);
      const altImg = /<img[^>]+alt=["'][^"']+["']/i.test(m[3]);
      if (!interno && !altImg && !at['aria-label'] && !at.title && !at['aria-labelledby']) a.push(achado('medio', T, `<${m[1]}> sem nome acessivel (so icone?): ${(at.href ?? '').slice(0, 50)}`, rel));
    }

    // marcadores de cabecalho/rodape preenchidos
    for (const parte of ['header', 'footer']) {
      const m = bruto.match(new RegExp(`<!--site:${parte}-->([\\s\\S]*?)<!--/site:${parte}-->`));
      if (bruto.includes(`<!--site:${parte}-->`) && (!m || m[1].trim().length < 50)) a.push(achado('alto', T, `marcador site:${parte} vazio (rode npm run gerar)`, rel));
      if (!redirecionador && !bruto.includes(`<!--site:${parte}-->`)) a.push(achado('medio', T, `sem o marcador site:${parte} (nao recebe as mudancas globais)`, rel));
    }

    // dados que se repetem (config.mjs): a data do GTA 6 nas paginas escritas a mao so pode aparecer dentro de <!--dado:...--> ou de data-modelo
    if (['index.html', 'gta6.html', 'cortes.html', 'lives.html'].includes(rel)) {
      const semDados = bruto.replace(/<!--dado:[\w-]+-->[\s\S]*?<!--\/dado-->/g, '').replace(/\bdata-modelo="[^"]*"/g, '').replace(/\bcontent="[^"]*"/g, '').replace(/\bdata-alvo="[^"]*"/g, '').replace(/<!--(gta6|feed):inicio-->[\s\S]*?<!--(gta6|feed):fim-->/g, ''); // as regioes geradas (novidades, feed) tem texto de materias
      const longa = new Date(GTA6.alvo).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
      if (semDados.includes(longa)) a.push(achado('medio', T, `a data do GTA 6 (${longa}) esta escrita a mao fora de marcador; use <!--dado:gta6-data--> para ela vir do config.mjs`, rel));
    }

    // sobras de teste
    if (/lorem ipsum|dolor sit amet/i.test(bruto)) a.push(achado('critico', T, 'texto de exemplo (lorem ipsum) em pagina publicada', rel));
    if (/\[CONFERIR/.test(bruto)) a.push(achado('critico', T, 'marcador [CONFERIR] em pagina publicada', rel));

    // tags balanceadas (apenas elementos que exigem fechamento)
    const pilha = [];
    for (const t of ts) {
      if (VAZIAS.has(t.nome) || t.auto) continue;
      if (!t.fecha) { pilha.push(t.nome); continue; }
      let i = pilha.lastIndexOf(t.nome);
      if (i < 0) { if (!OPCIONAIS.has(t.nome)) a.push(achado('medio', T, `</${t.nome}> sem abertura correspondente`, rel)); continue; }
      const sobra = pilha.splice(i).slice(1).filter((n) => !OPCIONAIS.has(n));
      if (sobra.length) { a.push(achado('medio', T, `<${sobra.at(-1)}> aberto e nunca fechado antes de </${t.nome}>`, rel)); }
    }
    const abertas = pilha.filter((n) => !OPCIONAIS.has(n));
    if (abertas.length) a.push(achado('medio', T, `tags sem fechamento no fim: ${[...new Set(abertas)].join(', ')}`, rel));
  }

  for (const [t, lista] of titulos) if (lista.length > 1) a.push(achado('baixo', T, `titulo repetido em ${lista.length} paginas: "${t.slice(0, 60)}"`, lista.slice(0, 3).join(', ')));
  for (const [d, lista] of descricoes) if (lista.length > 1) a.push(achado('baixo', T, `descricao repetida em ${lista.length} paginas: "${d.slice(0, 50)}..."`, lista.slice(0, 3).join(', ')));
  a.push(achado('info', T, `${paginas.length} paginas HTML analisadas`));
  return a;
}
