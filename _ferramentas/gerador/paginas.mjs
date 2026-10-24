// Monta as paginas do site em memoria (nada e gravado aqui; quem grava e saida.mjs):
// materias e listas de categoria, paginas de tag, GTA 6 (destaque), feed da home, 404, busca (pagina e listas por mes) e atalhos da busca.
import { ADS_ATIVOS, ADS_NAS_LISTAS, AUTOR, AUTOR_FOTO, BUSCA_DA_SECAO, CARROSSEL, COBERTURA, DOMINIO, GTA6, PALAVRAS_POR_MINUTO, PLAYERS, RECOMENDACOES, SOCIAIS, VIDEOS_POR_PLAYER, WIKI, abas, categorias, lorem, paginasFixasNaBusca, resumosLorem } from './config.mjs';
import { caminhoAntigo } from './enderecos.mjs';
import { fonteDaImagem } from './imagens.mjs';
import { SIZES_CARROSSEL, SIZES_CARTAO, SIZES_CARTAO_GRANDE, SIZES_CARTAO_PEQUENO, cortar, dataCurta, dataLonga, duracaoIso, esc, imagemDoCartao, limparTitulo, mesDe, miniatura, miniaturaGrande, slugify, urlDe } from './util.mjs';

// ---- "Ver mais" das listas ----
// A pagina mostra os 30 primeiros (ja no HTML: rapido, indexavel, funciona sem JavaScript). O resto vai em arquivos de 90 itens
// (assets/data/colecao/<id>/1.json, 2.json...) que o busca.js le a cada clique, 30 por vez. Lista com ate 30 itens nao ganha botao.
export const PASSO_DA_LISTA = 30;
const BLOCO_DA_COLECAO = 90;
// uma entrada de lista no formato dos arquivos de dados (a mesma das listas por mes)
export const itemDaLista = (m, cat) => ({ t: m.titulo, r: m.ficticio || m.semTexto ? '' : m.resumo, u: urlDe(`${cat.pasta}/${m.slug}.html`), c: cat.rotulo, i: miniatura(m.id), dt: m.publicado });
/** lista: [{ m, cat }] do mais novo para o mais velho. Devolve o HTML do botao + modelo de icones (vazio se a lista cabe na pagina 1). */
function colecao(ctx, id, lista, { gravar = true } = {}) {
  const resto = lista.slice(PASSO_DA_LISTA);
  if (!resto.length) return '';
  if (gravar) for (let k = 0; k * BLOCO_DA_COLECAO < resto.length; k++) ctx.escrever(`assets/data/colecao/${id}/${k + 1}.json`, JSON.stringify(resto.slice(k * BLOCO_DA_COLECAO, (k + 1) * BLOCO_DA_COLECAO).map(({ m, cat }) => itemDaLista(m, cat))));
  return `      <div class="busca-mais"><button type="button" class="btn" data-colecao="${id}" data-total="${resto.length}" hidden>Ver mais</button></div>
      ${modeloDeIcones(ctx)}`;
}
// icones das categorias para os cartoes montados pelo JavaScript (o mesmo desenho do HTML gerado)
function modeloDeIcones(ctx, rotulos = null, id = 'busca-icones') {
  // os tipos de conteudo da Wiki ("Historia", "Personagem"...) usam o icone do livro
  const tipos = Object.values(WIKI.tipos).filter((n) => !rotulos || rotulos.includes(n)).map((n) => `<span data-cat="${esc(n)}">${ctx.icone('book-open')}</span>`);
  return `<template id="${id}">${[...categorias.filter((c) => !rotulos || rotulos.includes(c.rotulo)).map((c) => `<span data-cat="${esc(c.rotulo)}">${ctx.icone(c.icone)}</span>`), ...tipos].join('')}</template>`;
}

// ---- Mini-busca de cada secao (Noticias, Reviews, Lancamentos e Wiki): campo de busca e, em Reviews e na Wiki, um menu lateral ----
// O HTML (campo e menu, com a contagem de cada item) sai pronto daqui, escondido ate o JavaScript chegar; a lista de sempre fica no HTML, visivel (Google e quem esta
// sem JavaScript) e so some enquanto ha busca ou item de menu ativo. Os cartoes filtrados vem de assets/data/secao/<id>.json, baixado so quando a pessoa usa a busca
// (assets/js/secao.js). Quais secoes tem menu, e de que: BUSCA_DA_SECAO em config.mjs.
// "PS5 (também no PC)" -> ['PS5']; "Consoles e PC" -> ['Consoles', 'PC']: so a plataforma principal, a que vem antes do parentese
const plataformasDe = (t) => (typeof t === 'string' ? t.replace(/\(.*$/, '').split(/\s+e\s+|,|\//).map((x) => x.trim()).filter(Boolean) : []);

// Review sem plataforma que apareca no menu (ficha sem `plataforma`, sem ficha, ou so uma plataforma que ficou de fora do menu por ter poucas materias) vai para o item "Outras":
// assim Todas = soma dos itens, e o item some sozinho quando todas as reviews tiverem plataforma (BL-20, UX-34).
const SEM_PLATAFORMA = 'outras';

/** Itens de menu de uma materia: [[slug, nome], ...]. `extra.jogo` = [[slug, nome]] do jogo da Wiki (so a Wiki passa). */
function valoresDoMenu(g, { m, extra }) {
  if (g === 'pl') return plataformasDe(m.veredito?.plataforma ?? m.plataforma).map((p) => [slugify(p), p]).filter(([s]) => s);
  if (g === 'jogo') return extra?.jogo ?? [];
  return [];
}

/**
 * Calcula os dados da mini-busca de uma secao e grava assets/data/secao/<id>.json. `lista` = [{ m, cat, extra? }] do mais novo para o mais velho.
 * `meta.hrefs` = { slug do item: pagina dele } (o menu da Wiki leva a pagina do jogo); `meta.ordem` = a ordem dos itens do menu (padrao: o que tem mais materias primeiro).
 * Devolve null se a secao nao tem busca configurada ou tem menos de 2 materias.
 */
function dadosDaSecao(ctx, id, lista, meta = {}) {
  const cfg = BUSCA_DA_SECAO[id];
  if (!cfg || lista.length < 2) return null;
  let menu = meta.menu ?? null; // a Wiki traz o menu pronto (dois niveis); Reviews calcula o de plataformas aqui
  if (!menu && cfg.menu) {
    const g = cfg.menu.filtro, cont = new Map();
    for (const it of lista) for (const [v, nome] of new Map(valoresDoMenu(g, it))) { const c = cont.get(v) ?? { v, nome, n: 0 }; c.n++; cont.set(v, c); }
    let opcoes = [...cont.values()];
    if (meta.ordem) opcoes.sort((a, b) => meta.ordem.indexOf(a.v) - meta.ordem.indexOf(b.v));
    else opcoes.sort((a, b) => b.n - a.n || a.nome.localeCompare(b.nome, 'pt-BR'));
    if (g === 'pl') opcoes = opcoes.filter((o) => o.n >= BUSCA_DA_SECAO.minimo);
    opcoes = opcoes.slice(0, BUSCA_DA_SECAO.maxItens).map((o) => ({ ...o, href: meta.hrefs?.[o.v] }));
    if (g === 'pl') {
      const visiveis = new Set(opcoes.map((o) => o.v));
      const n = lista.filter((it) => !valoresDoMenu(g, it).some(([v]) => visiveis.has(v))).length;
      if (n) opcoes.push({ v: SEM_PLATAFORMA, nome: 'Outras', n });
    }
    if (opcoes.length >= 2) menu = { g, titulo: cfg.menu.titulo, todos: cfg.menu.todos, opcoes };
  }
  const itens = lista.map((it) => {
    const { m, cat } = it;
    let f = it.extra?.f ?? null; // a Wiki ja traz os valores prontos (franquia e jogo); Reviews calcula a plataforma
    if (!f && menu) {
      let vs = [...new Set(valoresDoMenu(menu.g, it).map(([v]) => v))];
      const visiveis = new Set(menu.opcoes.map((o) => o.v));
      if (menu.g === 'pl' && visiveis.has(SEM_PLATAFORMA) && !vs.some((v) => visiveis.has(v))) vs = [SEM_PLATAFORMA];
      if (vs.length) f = { [menu.g]: vs };
    }
    if (f) f = Object.fromEntries(Object.entries(f).filter(([, vs]) => vs.length));
    if (f && !Object.keys(f).length) f = null;
    const b = [...(m.tags ?? []).map((t) => t.nome), typeof m.assunto === 'string' ? m.assunto.replace(/-/g, ' ') : ''].filter(Boolean).join(' ');
    return { t: m.titulo, r: m.resumo ?? '', u: urlDe(`${cat.pasta}/${m.slug}.html`), i: miniatura(m.id), c: m.rotulo ?? cat.rotulo, dt: m.publicado, ...(f ? { f } : {}), ...(b ? { b } : {}) };
  });
  ctx.escrever(`assets/data/secao/${id}.json`, JSON.stringify({ itens }));
  return { id, cfg, menu, total: lista.length, rotulos: [...new Set(lista.map(({ m, cat }) => m.rotulo ?? cat.rotulo))] };
}

/**
 * O HTML da mini-busca. `estatico` = a lista de sempre (HTML), que fica dentro da coluna de conteudo, visivel, e o JavaScript esconde enquanto ha busca ativa.
 * O menu pode ter DOIS NIVEIS (Wiki): um item com `subs` abre, logo abaixo dele, a lista dos itens dele (`.secao-sub`); os jogos sem conteudo ficam `.vazio`.
 */
function htmlDaSecao(ctx, dados, estatico) {
  const { id, cfg, menu } = dados;
  const botao = (o) => `          <button type="button" class="secao-item" data-v="${esc(o.v)}"${o.href ? ` data-href="${esc(o.href)}"` : ''} aria-pressed="false"${o.subs ? ` aria-expanded="false" aria-controls="secao-sub-${esc(o.v)}"` : ''}>${esc(o.nome)} <small>${o.n}</small></button>`;
  const subitem = (s) => `            <button type="button" class="secao-subitem${s.n ? '' : ' vazio'}" data-v="${esc(s.v)}"${s.href ? ` data-href="${esc(s.href)}"` : ''} aria-pressed="false">${esc(s.nome)} <small>${s.n}</small></button>`;
  const opcao = (o) => (o.subs ? `${botao(o)}
          <div class="secao-sub" id="secao-sub-${esc(o.v)}" data-pai="${esc(o.v)}" role="group" aria-label="${esc(o.nome)}" hidden>
${o.subs.map(subitem).join('\n')}
          </div>` : botao(o));
  const itensDoMenu = menu ? `        <div class="secao-menu" role="group" aria-labelledby="secao-g-${menu.g}" data-grupo="${menu.g}" hidden>
          <span class="secao-rot" id="secao-g-${menu.g}">${esc(menu.titulo)}</span>
          <button type="button" class="secao-item" data-v="" aria-pressed="true">${esc(menu.todos)} <small>${dados.total}</small></button>
${menu.opcoes.map(opcao).join('\n')}
        </div>
` : '';
  const ordem = cfg.ordem ? `
            <label class="secao-ordem">Ordenar por
              <select name="o" aria-label="Ordenar ${esc(cfg.varios)}">
                <option value="recentes">Mais recentes</option>
                <option value="az">De A a Z</option>
              </select>
            </label>` : '';
  return `      <section class="secao-busca" data-secao="${id}" data-src="assets/data/secao/${id}.json" data-um="${esc(cfg.um)}" data-varios="${esc(cfg.varios)}">
        <form class="secao-form" role="search" aria-label="Buscar em ${esc(cfg.varios)}" novalidate hidden>
          <div class="secao-linha">
            <div class="secao-campo">
              ${ctx.icone('search')}
              <label class="sr-only" for="secao-q">${esc(cfg.campo.replace('…', ''))}</label>
              <input id="secao-q" name="q" type="search" placeholder="${esc(cfg.campo)}" maxlength="100" autocomplete="off" enterkeyhint="search">
            </div>${ordem}
          </div>
          <p class="busca-status" role="status" aria-live="polite"></p>
        </form>
${adsHtml(`${id}-apos-filtro`)}
        <div class="secao-layout">
${itensDoMenu}          <div class="secao-conteudo">
            <p class="secao-ver" hidden></p>
            <div class="news-grid secao-resultados"${adsNaLista(id)} hidden></div>
            <div class="busca-mais secao-mais" hidden><button type="button" class="btn">Ver mais</button></div>
            <div class="secao-estatico">
${estatico}
            </div>
          </div>
        </div>
        ${modeloDeIcones(ctx, dados.rotulos, 'secao-icones')}
      </section>
      <script src="assets/js/secao.js" defer></script>${ADS_ATIVOS && ADS_NAS_LISTAS[id] ?'\n      <script src="assets/js/ads.js" defer></script>' : ''}`;
}

// as novidades do hub do GTA 6: a categoria gta6-novidades + materias de outras categorias com a tag "GTA 6", do mais novo para o mais velho
function listaDoHub(ctx) {
  const dados = ctx.itensPorCategoria['gta6-novidades'];
  if (!dados) return [];
  const todos = dados.itens.map((m) => ({ m, cat: dados.cat }));
  const vistos = new Set(todos.map(({ m }) => m.id));
  for (const { m, cat } of ctx.porTag.get('gta-6')?.itens ?? []) { // materias de outras categorias marcadas com a tag GTA 6
    if (!vistos.has(m.id)) { todos.push({ m, cat }); vistos.add(m.id); }
  }
  return todos.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
}

// quem assina e publica (dados estruturados): o proprio canal. O nome "Claudio" + selo "IA" continuam na assinatura visivel da materia.
const ORGANIZACAO = { '@type': 'Organization', name: 'BRUBAOGG', url: `${DOMINIO}/` };
const AUTORA = { '@type': 'Person', name: AUTOR, url: `${DOMINIO}/sobre.html`, sameAs: SOCIAIS.filter((s) => s.nome !== 'Discord').map((s) => s.url) }; // autor das materias nos dados estruturados (a editora continua sendo a organizacao BRUBAOGG)
const absoluta = (u) => (u.startsWith('/') ? `${DOMINIO}${u}` : u); // imagem do proprio site (conteudo da Wiki sem video) em dados estruturados: endereco inteiro
const EDITORA = { ...ORGANIZACAO, logo: { '@type': 'ImageObject', url: `${DOMINIO}/assets/img/logo.png` } };

// "relacionadas": ate 3 materias de QUALQUER categoria (a noticia de um jogo leva a review dele e vice-versa; o Short e a review do mesmo jogo se enxergam).
// Escolhe entre as que dividem tags com a materia. Nota de cada candidata: tag em comum vale mais quanto MENOS materias tem a tag (uma tag so de 2 materias liga
// muito mais que "GTA 6", que esta em 30); outra categoria soma um pouco (varia o que a pessoa encontra); a distancia no tempo tira um pouco (todas = fila geral, da
// mais nova para a mais velha); e quem ja foi escolhida por outras paginas perde pontos, e quem ainda nao foi escolhida por nenhuma ganha: assim os links internos se
// espalham pelo site em vez de apontarem sempre para as mesmas (o Google segue links; pagina sem nenhum link recebido fica orfa). Sobrando vaga (materia cujas tags sao
// so dela), completa com as vizinhas da mesma categoria. O resultado e deterministico (as paginas sao tratadas da mais nova para a mais velha).
const RELACIONADAS = 3, JANELA_DA_CATEGORIA = 40;
const PESO_DA_TAG = 100, SOMA_OUTRA_CATEGORIA = 15, TIRA_POR_DISTANCIA = 1 / 3, DISTANCIA_MAXIMA = 60, TIRA_POR_LINK_RECEBIDO = 5, SOMA_SEM_LINK_RECEBIDO = 10;
export function calcularRelacionadas({ todas, ordem, catDe, grupos, contagemTags, irmasDe = new Map() }) {
  const pesoDe = (slug) => PESO_DA_TAG / Math.log2(1 + (contagemTags.get(slug) ?? 1));
  const recebidos = new Map(todas.map((m) => [m, 0]));
  const lugar = new Map(), vizinhas = new Map(); // posicao de cada materia na sua categoria e a lista dessa categoria
  for (const { itens } of grupos) itens.forEach((x, k) => { lugar.set(x, k); vizinhas.set(x, itens); });
  const porTag = new Map(); // tag -> as materias que a tem: so elas podem ser escolhidas por tag (o site cresce: nao compara cada materia com todas as outras)
  for (const x of todas) for (const g of x.tags) { if (!porTag.has(g.slug)) porTag.set(g.slug, []); porTag.get(g.slug).push(x); }
  const resultado = new Map(), completaram = new Map(); // completaram: materia -> as escolhidas que entraram so para completar a vaga (sem tag em comum)
  for (const m of todas) {
    const slugs = new Set(m.tags.map((x) => x.slug)), previa = m.semTexto || m.ficticio; // so as paginas de teste (sem texto) apontam para paginas de teste
    const irmas = new Set((irmasDe.get(m) ?? []).map((i) => i.m)); // as do mesmo assunto ja aparecem em "Mais sobre este assunto": nao entram em "Veja tambem"
    const serve = (x) => x !== m && !irmas.has(x) && (previa || !(x.semTexto || x.ficticio));
    const candidatas = new Set();
    for (const s of slugs) for (const x of porTag.get(s) ?? []) if (serve(x)) candidatas.add(x);
    const escolhidas = [...candidatas].map((x) => {
      const comuns = x.tags.filter((g) => slugs.has(g.slug));
      if (!comuns.length) return null;
      const nota = comuns.reduce((soma, g) => soma + pesoDe(g.slug), 0)
        + (catDe.get(x) !== catDe.get(m) ? SOMA_OUTRA_CATEGORIA : 0)
        - Math.min(Math.abs(ordem.get(x) - ordem.get(m)), DISTANCIA_MAXIMA) * TIRA_POR_DISTANCIA
        - recebidos.get(x) * TIRA_POR_LINK_RECEBIDO + (recebidos.get(x) ? 0 : SOMA_SEM_LINK_RECEBIDO);
      return { x, nota };
    }).filter(Boolean).sort((a, b) => b.nota - a.nota || ordem.get(a.x) - ordem.get(b.x)).slice(0, RELACIONADAS).map(({ x }) => x);
    const completar = [];
    if (escolhidas.length < RELACIONADAS) {
      const i = lugar.get(m);
      completar.push(...vizinhas.get(m).slice(Math.max(0, i - JANELA_DA_CATEGORIA), i + JANELA_DA_CATEGORIA + 1).filter((x) => serve(x) && !escolhidas.includes(x))
        .sort((a, b) => Math.abs(lugar.get(a) - i) - Math.abs(lugar.get(b) - i) || recebidos.get(a) - recebidos.get(b) || lugar.get(a) - lugar.get(b)).slice(0, RELACIONADAS - escolhidas.length));
      escolhidas.push(...completar);
    }
    completaram.set(m, new Set(completar));
    for (const x of escolhidas) recebidos.set(x, recebidos.get(x) + 1);
    resultado.set(m, escolhidas);
  }
  // pagina que ninguem escolheu (so tem tag propria) assume o lugar de uma vizinha de preenchimento, ja escolhida por outras, numa pagina proxima da mesma categoria
  for (const o of todas) {
    if (recebidos.get(o)) continue;
    const proximas = vizinhas.get(o).filter((h) => h !== o && ((h.semTexto || h.ficticio) || !(o.semTexto || o.ficticio)))
      .sort((a, b) => Math.abs(lugar.get(a) - lugar.get(o)) - Math.abs(lugar.get(b) - lugar.get(o)) || lugar.get(a) - lugar.get(b));
    for (const h of proximas) {
      const lista = resultado.get(h), troca = lista.find((x) => completaram.get(h).has(x) && recebidos.get(x) > 1);
      if (!troca || lista.includes(o) || (irmasDe.get(h) ?? []).some((i) => i.m === o)) continue;
      lista[lista.indexOf(troca)] = o;
      completaram.get(h).delete(troca); completaram.get(h).add(o);
      recebidos.set(troca, recebidos.get(troca) - 1); recebidos.set(o, 1);
      break;
    }
  }
  for (const lista of resultado.values()) lista.sort((a, b) => ordem.get(a) - ordem.get(b));
  return resultado;
}
// titulo da secao: "Mais sobre <jogo>" quando pelo menos 2 das escolhidas dividem uma tag com a materia (a mais especifica, a de menos materias); senao "Veja tambem"
function tituloDasRelacionadas(m, outras, contagemTags) {
  const nomes = new Map(m.tags.map((x) => [x.slug, x.nome])), conta = new Map();
  for (const o of outras) for (const g of o.tags) if (nomes.has(g.slug)) conta.set(g.slug, (conta.get(g.slug) ?? 0) + 1);
  const [slug, n] = [...conta].sort((a, b) => b[1] - a[1] || (contagemTags.get(a[0]) ?? 0) - (contagemTags.get(b[0]) ?? 0) || a[0].localeCompare(b[0]))[0] ?? [];
  return n >= 2 ? `Mais sobre ${nomes.get(slug)}` : 'Veja também';
}

export function construirMaterias(ctx) {
  const { flags, videosDe, temArquivo, lerMateria, icone, resolverTags, temPaginaTag, tagPage, tagsCfg, pagina, cartao, escrever } = ctx;
  const { RASCUNHO, COM_RASCUNHOS, SO_COM_MATERIA } = flags;
  // o jogo da Wiki a que uma materia pertence (a tag dela ou uma tag "filha"): a materia ganha o link "Wiki <jogo>" (o GTA 6, que tem pagina propria, fica de fora)
  const wikiDe = (m) => WIKI.jogos.find((j) => !paginaPropria(ctx, j) && m.tags.some((x) => slugsDoJogo(ctx, j).has(x.slug))) ?? null;

  // pre-passagem: conta as materias de cada tag (inclui a franquia dos jogos com "pai")
  for (const lista of categorias.map((c) => videosDe(c))) {
    for (const v of lista) {
      const m = lerMateria(v.id);
      if (!m || (m.status === 'rascunho' && !RASCUNHO && !COM_RASCUNHOS)) continue;
      for (const x of resolverTags(m.tags)) ctx.contagemTags.set(x.slug, (ctx.contagemTags.get(x.slug) ?? 0) + 1);
    }
  }

  let total = 0, reais = 0, aguardando = 0;
  const grupos = []; // [{ cat, itens }]: as materias de cada categoria (as paginas saem depois, quando todas as categorias ja existem: as relacionadas atravessam categorias)
  for (const cat of categorias) {
    const todos = videosDe(cat).sort((a, b) => b.published.localeCompare(a.published));
    // por padrao so entra video que tem materia aprovada; com --com-videos-sem-texto os demais viram pagina so com o player
    const videos = SO_COM_MATERIA && !RASCUNHO ? todos.filter(temArquivo) : todos;
    aguardando += todos.filter((v) => !videos.includes(v) && !ctx.enderecos[v.id]?.retirada).length; // video retirado de proposito (ex.: Short anexado a uma review) nao "aguarda materia"
    if (!videos.length) continue;
    const usados = new Set();
    const itens = [];

    videos.forEach((v, i) => {
      const arq = lerMateria(v.id);
      const real = arq && (RASCUNHO || COM_RASCUNHOS || arq.status !== 'rascunho') ? arq : null; // rascunho so aparece nos modos de teste
      const titulo = limparTitulo(real?.titulo ?? v.title);
      let slug = v.slug; // materia: o endereco vem do registro (fixo desde a aprovacao). So video sem materia (modos de teste) calcula aqui
      if (!slug) {
        slug = slugify(limparTitulo(v.title));
        if (usados.has(slug)) slug = `${slug}-${v.id.slice(0, 4).toLowerCase()}`;
        usados.add(slug);
      }
      const semTexto = !real && !RASCUNHO; // pagina so com o video
      itens.push({
        id: v.id, titulo, slug, publicado: v.published,
        resumo: real?.resumo ?? (semTexto ? '' : resumosLorem[i % resumosLorem.length]),
        corpo: real?.corpo ?? (semTexto ? [] : [lorem[i % 5], lorem[(i + 1) % 5], lorem[(i + 2) % 5], lorem[(i + 3) % 5]]),
        ficticio: !real && RASCUNHO,
        rascunho: real?.status === 'rascunho',
        spoiler: real?.spoiler === true, // "spoiler": true no JSON da materia mostra o aviso "Contem spoilers" na pagina dela
        assunto: real?.assunto, // alimenta a mini-busca da secao (texto do assunto)
        plataforma: real?.plataforma, // so para a review sem ficha de veredito: o menu de plataformas usa veredito.plataforma ou, na falta dele, este campo
        veredito: real?.veredito, // a ficha de veredito da review (nota, recomendacao...): aparece no alto da pagina e a mini-busca usa recomendacao e plataforma
        fontes: real?.fontes, // as fontes com link, no fim da pagina
        shorts: real?.shorts, // Shorts anexados ("Shorts desta review"), players verticais pequenos depois dos botoes
        tags: resolverTags(real?.tags),
        semTexto,
        short: real?.formato === 'short', // vem do JSON da materia; video sem materia (so nos modos de teste) usa o player horizontal
        // id do video do YouTube DESTA pagina. Conteudo da Wiki (_conteudo/materias/wiki) so de texto fica sem video (null): sem player, sem botao do YouTube e sem VideoObject
        video: real?.origem === 'wiki' ? (real.video ?? null) : v.id,
        origem: real?.origem, jogo: real?.jogo, tipo: real?.origem === 'wiki' ? real.tipo : undefined,
        rotulo: real?.origem === 'wiki' ? WIKI.tipos[real.tipo] : undefined, // nome do tipo no cartao ("Historia", "Personagem"); o resto usa o da categoria
      });
      if (real) reais++; else if (semTexto) aguardando++;
    });

    for (const m of itens) ctx.publicadas.set(m.id, m);
    ctx.itensPorCategoria[cat.pasta] = { cat, itens };

    // lista de todas as materias: alimenta as listas por mes e a pagina 1 da busca (texto fictício não entra, para não gerar resultados falsos)
    for (const m of itens) ctx.listaMaterias.push({ m, cat });
    grupos.push({ cat, itens });
  }

  // materias do mesmo "assunto" (2 ou mais): cada uma continua com a propria pagina; so se ligam pelo bloco "Mais sobre este assunto" (agruparAssuntos)
  agruparAssuntos(ctx, grupos);

  // todas as materias do site, da mais nova para a mais velha (a posicao nessa fila e a "distancia no tempo" das relacionadas)
  const catDe = new Map(grupos.flatMap(({ cat, itens }) => itens.map((m) => [m, cat])));
  const todas = [...catDe.keys()].sort((a, b) => b.publicado.localeCompare(a.publicado));
  const ordem = new Map(todas.map((m, k) => [m, k]));
  const relacionadas = calcularRelacionadas({ todas, ordem, catDe, grupos, contagemTags: ctx.contagemTags, irmasDe: ctx.irmasDe });

  for (const { cat, itens } of grupos) {
    // ---- pagina da materia ----
    for (const m of itens) {
      const irmas = ctx.irmasDe.get(m) ?? [], irmasSet = new Set(irmas.map((x) => x.m));
      const outras = relacionadas.get(m).filter((o) => !irmasSet.has(o)); // o que ja esta em "Mais sobre este assunto" nao se repete em "Veja tambem"
      const irmasHtml = irmas.length ? `
      <section class="related" data-irmas${m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-ignore'}>
        <h2 class="section-title">Mais sobre este assunto</h2>
        <div class="news-grid">
${irmas.map(({ m: o, cat: c }) => cartao(o, c, '../')).join('\n')}
        </div>
      </section>` : '';
      const relacionadasHtml = outras.length ? `
      <section class="related"${m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-ignore'}>
        <h2 class="section-title">${esc(tituloDasRelacionadas(m, outras, ctx.contagemTags))}</h2>
        <div class="news-grid">
${outras.map((o) => cartao(o, catDe.get(o), '../')).join('\n')}
        </div>
      </section>` : '';
      // Short (vertical) com texto: player ao lado do texto. Video horizontal ou sem texto: player centralizado.
      const dividido = m.video && m.short && (m.resumo || m.corpo.length);
      const lead = m.resumo ? `<p class="art-lead"${m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-meta="resumo"'}>${esc(m.resumo)}</p>` : '';
      const video = !m.video ? '' : `<div class="art-video${m.short ? ' is-short' : ''}" id="video">${fachadaHtml(ctx, { embed: `https://www.youtube-nocookie.com/embed/${m.video}`, href: `https://www.youtube.com/watch?v=${m.video}`, titulo: m.titulo, imagem: capaDoPlayer(ctx, m) })}</div>`;
      const texto = m.corpo.length ? `<div class="art-body">\n${corpoComImagens(ctx, m)}\n      </div>` : '';
      const ignDaFicha = m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-ignore';
      const miolo = dividido
        ? `<div class="art-split">\n        <div class="art-text">\n          ${lead}\n          ${texto}\n        </div>\n        ${video}\n      </div>`
        : `<div class="art-flow">\n        ${lead}\n        ${video}\n        ${texto}\n      </div>`;
      // fecho da materia: o veredito (so review) ao lado das fontes, depois a assinatura (Bruno Bem, a data e o apoio de IA); depois dos botoes vem o resto
      const ficha = vereditoHtml(ctx, m, ignDaFicha), fontes = fontesHtml(m, ignDaFicha), blocoShorts = shortsHtml(ctx, m, cat, ignDaFicha);
      const fecho = [ficha, fontes].filter(Boolean);
      const blocoFecho = fecho.length ? `<div class="materia-fim${fecho.length > 1 ? ' com-dois' : ''}">\n        ${fecho.join('\n        ')}\n      </div>` : '';
      // Pagefind (busca): so a materia real e indexada. A categoria e as tags viram filtros; a data, a ordenacao; a miniatura e o resumo, dados
      // para o cartao do resultado. O que e so navegacao (voltar, assinatura, relacionadas, botoes) fica de fora do texto indexado.
      const indexavel = !(m.ficticio || m.semTexto || m.rascunho);
      const pf = indexavel ? ` data-pagefind-body data-pagefind-filter="categoria:${esc(cat.rotulo)}" data-pagefind-meta="image:${miniatura(m.id)}"` : '';
      const ign = indexavel ? ' data-pagefind-ignore' : '';
      const tagsMostradas = [...m.tags].sort((a, b) => Number(temPaginaTag(b.slug)) - Number(temPaginaTag(a.slug))).slice(0, 8);
      const url = `${DOMINIO}/${urlDe(`${cat.pasta}/${m.slug}.html`)}`;
      const jogoDaWiki = wikiDe(m);
      const linkDaWiki = jogoDaWiki ? `<li><a href="../${paginaDaWiki(ctx, jogoDaWiki)}">${icone('book-open')} Wiki ${esc(jogoDaWiki.nome)}</a></li>` : '';
      // as tags viram FILTROS da busca; o texto da lista fica fora do indice (senao o trecho do resultado mostraria "Resident Evil. Silent Hill.")
      const corpo = `    <main class="article art-${cat.pasta}${dividido ? ' has-split' : ''}"${pf}>${indexavel && urlDe(`${cat.pasta}/${m.slug}.html`) !== `${cat.pasta}/${m.slug}.html` ? `<span hidden data-pagefind-meta="end:${urlDe(`${cat.pasta}/${m.slug}.html`)}"></span>` : ''}
      ${(cat.lista || ctx.visiveis.has(cat.pasta)) ? `<a class="back"${ign} href="../${cat.lista ?? `${cat.pasta}.html`}">&larr; ${esc(cat.nomeCurto ?? cat.nome)}</a>` : `<a class="back"${ign} href="/">&larr; Início</a>`}
      <p class="art-meta"><span class="tag"${ign}>${icone(cat.icone)} ${esc(m.rotulo ?? cat.rotulo)}</span>${leituraHtml(ctx, contarPalavras(m.resumo, m.corpo), ign)}</p>
      <h1 class="art-title">${esc(m.titulo)}</h1>
      ${tagsMostradas.length ? `<ul class="tag-list"${ign} aria-label="Tags">${linkDaWiki}${tagsMostradas.map((x) => temPaginaTag(x.slug) ? `<li><a${indexavel ? ` data-pagefind-filter="tag:${esc(x.nome)}"` : ''} href="../${tagPage(x.slug)}">${icone('tag')} ${esc(x.nome)}</a></li>` : `<li><span${indexavel ? ` data-pagefind-filter="tag:${esc(x.nome)}"` : ''}>${icone('tag')} ${esc(x.nome)}</span></li>`).join('')}</ul>` : ''}
      ${m.spoiler ? `<p class="aviso-spoiler"${ign} role="note">${icone('triangle-alert')} <span><b>Contém spoilers.</b> Esta matéria revela partes da história.</span></p>` : ''}
      ${dividido ? `<a class="ir-video"${ign} href="#video">&darr; Ir para o vídeo</a>` : ''}
      ${miolo}${blocoFecho ? `\n      ${blocoFecho}` : ''}
      ${autoriaHtml({ publicado: m.publicado, indexavel, ign })}
      <div class="links"${ign}>
        ${m.video ? `<a class="btn primary" href="https://www.youtube.com/watch?v=${m.video}" target="_blank" rel="noopener">Assistir no YouTube</a>
        <a class="btn" href="https://www.youtube.com/watch?v=${m.video}#comments" target="_blank" rel="noopener">Comentar no vídeo</a>` : `<a class="btn primary" href="${cat.aba ? `../${cat.aba}` : '/'}">Voltar para ${esc(abas.find((a) => a.href === cat.aba)?.nome ?? 'o início')}</a>`}
      </div>${blocoShorts ? `\n      ${blocoShorts}` : ''}
${irmasHtml}
${compartilharHtml(ctx, { titulo: m.titulo, url })}
${conviteHtml(ctx, ign)}
${relacionadasHtml}
    </main>`;
      // dados estruturados (so para materia de verdade): artigo + video + trilha. Aparecem no Google como resultado de artigo e de video.
      const comLista = cat.lista || ctx.visiveis.has(cat.pasta);
      const estruturados = indexavel ? [{
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Article', '@id': `${url}#artigo`, headline: cortar(m.titulo, 110), description: m.resumo, image: [absoluta(miniaturaGrande(m.id))], datePublished: m.publicado, dateModified: m.publicado, inLanguage: 'pt-BR', mainEntityOfPage: url, articleSection: cat.rotulo, ...(m.tags.length ? { keywords: m.tags.map((x) => x.nome).join(', ') } : {}), isAccessibleForFree: true, author: AUTORA, publisher: EDITORA, ...(m.video ? { video: { '@id': `${url}#video` } } : {}), ...(m.fontes?.length ? { citation: m.fontes.map((f) => ({ '@type': 'CreativeWork', name: f.nome, url: f.url })) } : {}) },
          ...(m.video ? [{ '@type': 'VideoObject', '@id': `${url}#video`, name: m.titulo, description: m.resumo || m.titulo, thumbnailUrl: [miniatura(m.id)], uploadDate: m.publicado, ...(duracaoIso(m.video) ? { duration: duracaoIso(m.video) } : {}), embedUrl: `https://www.youtube-nocookie.com/embed/${m.video}`, contentUrl: `https://www.youtube.com/watch?v=${m.video}`, inLanguage: 'pt-BR', publisher: EDITORA }] : []),
          // review com nota: o Google pode mostrar as estrelas. O jogo avaliado e a primeira tag da materia (convencao: a tag do jogo vem primeiro)
          ...(typeof m.veredito?.nota === 'number' && m.tags[0] ? [{ '@type': 'Review', '@id': `${url}#review`, name: m.titulo, datePublished: m.publicado, inLanguage: 'pt-BR', author: AUTORA, publisher: EDITORA, reviewRating: { '@type': 'Rating', ratingValue: m.veredito.nota, bestRating: 10, worstRating: 0 }, itemReviewed: { '@type': 'VideoGame', name: m.tags[0].nome }, mainEntityOfPage: url }] : []),
          ctx.trilha([{ nome: 'Início', url: `${DOMINIO}/` }, ...(cat.aba ? [{ nome: abas.find((a) => a.href === cat.aba)?.nome ?? cat.aba, url: `${DOMINIO}/${cat.aba}` }] : []), ...(comLista ? [{ nome: cat.nomeCurto ?? cat.nome, url: `${DOMINIO}/${cat.lista ?? `${cat.pasta}.html`}` }] : []), { nome: m.titulo }]),
        ],
      }] : [];
      escrever(`${cat.pasta}/${m.slug}.html`, pagina({
        base: '../', titulo: `${m.titulo} | BRUBAOGG`, descricao: m.resumo || (m.video ? `Assista: ${m.titulo}. Vídeo do canal BRUBAOGG.` : m.titulo), og: miniaturaGrande(m.id), corpo, caminho: `${cat.pasta}/${m.slug}.html`,
        noindex: m.ficticio || m.semTexto || m.rascunho, // exemplo, so video ou rascunho: fora do Google
        tipo: indexavel ? 'article' : 'website', publicado: m.publicado, estruturados, scripts: m.video || m.shorts?.length ? ['compartilhar.js', 'fachada.js'] : ['compartilhar.js'],
      }));
      total++;
    }

    // ---- lista da categoria (so quando a aba esta visivel) ----
    if (!cat.lista && ctx.visiveis.has(cat.pasta)) {
      const aba = abas.find((a) => a.href === cat.aba); // categoria que mora numa aba de outra pagina (Series na Wiki): caminho de volta
      // sem playlist (Series) nao ha "ver no YouTube": o botao principal leva de volta para a aba dela
      const principal = cat.playlist
        ? `<a class="btn primary" href="https://www.youtube.com/playlist?list=${cat.playlist}" target="_blank" rel="noopener">Ver playlist completa no YouTube</a>`
        : aba ? `<a class="btn primary" href="${aba.href}">Voltar para ${esc(aba.nome)}</a>` : '';
      // mini-busca da secao (so Noticias, Reviews e Lancamentos): campo (e, em Reviews, o menu de plataformas) acima da lista; a lista de sempre fica dentro da busca, visivel
      // a lista tem as materias da categoria e as das categorias que dizem `tambemEm` dela (config.mjs: tudo de GTA 6 tambem e noticia); cada cartao leva o rotulo da categoria de origem
      const pares = todas.filter((x) => catDe.get(x) === cat || catDe.get(x).tambemEm === cat.pasta).map((m) => ({ m, cat: catDe.get(m) }));
      const gradeEMais = `      <section class="news-grid" data-lista="cat-${cat.pasta}"${adsNaLista(cat.pasta)}>
${pares.slice(0, PASSO_DA_LISTA).map(({ m, cat: origem }, i) => cartao(m, origem, '', i === 0)).join('\n')}
      </section>
${colecao(ctx, `cat-${cat.pasta}`, pares)}`;
      const dadosBusca = dadosDaSecao(ctx, cat.pasta, pares);
      const lista = `    <main>
      <section class="cat-hero">
        ${aba ? `<a class="back" href="${aba.href}">&larr; ${esc(aba.nome)}</a>\n        ` : ''}<h1>${icone(cat.icone)} ${esc(cat.nome)}</h1>
        <p class="lead">${esc(cat.desc)}</p>
      </section>
${dadosBusca ? htmlDaSecao(ctx, dadosBusca, gradeEMais) : `\n${gradeEMais}`}
      <div class="links">
        ${principal}
        <a class="btn" href="https://discord.gg/tQkkXMqAnU" target="_blank" rel="noopener">Entrar no Discord</a>
      </div>
    </main>`;
      const tituloDaLista = cat.titulo ?? cat.nome; // <title> da lista (padrao: o nome da categoria); o h1 da pagina continua sendo o nome
      escrever(`${cat.pasta}.html`, pagina({
        base: '', titulo: `${tituloDaLista} | BRUBAOGG`, descricao: cat.meta ?? cat.desc, og: null, corpo: lista, caminho: `${cat.pasta}.html`,
        estruturados: dadosDeColecao(ctx, {
          caminho: `${cat.pasta}.html`, nome: tituloDaLista, descricao: cat.meta ?? cat.desc,
          migalhas: [{ nome: 'Início', url: `${DOMINIO}/` }, ...(aba ? [{ nome: aba.nome, url: `${DOMINIO}/${aba.href}` }] : []), { nome: cat.nome }],
        }),
      }));
    }
  }
  ctx.contadores = { total, reais, aguardando };
}

// ---- redirecionamentos: enderecos antigos de materias (e de materias retiradas) levam para o endereco atual ----
export function construirRedirecionamentos(ctx) {
  const { escrever, redirecionamento } = ctx;
  const itens = new Map(Object.values(ctx.itensPorCategoria).flatMap(({ cat, itens: lista }) => lista.map((m) => [`${cat.pasta}/${m.slug}.html`, m])));
  const geradas = new Set(itens.keys());
  // onde a materia `id` esta no ar: { url, item }, ou null se a pagina dela nao sera gerada
  const paginaDe = (id) => {
    const r = ctx.enderecos[id];
    if (!r || r.retirada) return null;
    const url = `${r.categoria}/${r.slug}.html`;
    return geradas.has(url) ? { url, item: itens.get(url) } : null;
  };
  for (const [id, e] of Object.entries(ctx.enderecos)) {
    const cat = categorias.find((c) => c.pasta === e.categoria);
    if (!cat) continue;
    const levar = (de, alvo) => { for (const velho of de) escrever(`${caminhoAntigo(e, velho)}.html`, redirecionamento({ para: alvo.url, titulo: alvo.item.titulo, descricao: alvo.item.resumo, imagem: miniatura(alvo.item.id) })); };
    if (e.retirada) {
      const de = [e.slug, ...(e.antigos ?? [])];
      // retirada "para" outra materia (ex.: o Short que virou anexo de uma review): leva para ela, se estiver no ar; senao, para a lista da categoria
      const alvo = e.para ? paginaDe(e.para) : null;
      if (alvo) { levar(de, alvo); continue; }
      const lista = ctx.visiveis.has(cat.pasta) || cat.lista ? (cat.lista ?? `${cat.pasta}.html`) : 'index.html';
      for (const velho of de) escrever(`${caminhoAntigo(e, velho)}.html`, redirecionamento({ para: lista, titulo: `${cat.nome} | BRUBAOGG` }));
      continue;
    }
    const alvo = paginaDe(id);
    if (!alvo) continue; // a pagina nao sera gerada (o aviso de removidas cobre esse caso)
    levar(e.antigos ?? [], alvo);
  }
  // o endereco do proprio assunto (pagina agregada ate a v1.02) leva a materia mais nova dele; a previa de compartilhamento usa o titulo e o resumo de assuntos.json, se houver
  for (const { chave, pasta, nova } of ctx.assuntosAgrupados ?? []) {
    const ficha = ctx.assuntos?.[chave];
    escrever(`${pasta}/${chave}.html`, redirecionamento({ para: `${nova.cat.pasta}/${nova.m.slug}.html`, titulo: ficha?.titulo ?? nova.m.titulo, descricao: ficha?.resumo ?? nova.m.resumo, imagem: miniatura(nova.m.id) }));
  }
}

// secao "Ultimas novidades" da gta6.html: destaque (o video mais recente, com player e trecho do texto) + cartoes
export function gta6Html(ctx) {
  const { icone, cartao } = ctx;
  const dados = ctx.itensPorCategoria['gta6-novidades'];
  if (!dados) return '';
  const catGta = dados.cat;
  const todos = listaDoHub(ctx);
  if (!todos.length) return '';
  const { m: d, cat } = todos[0];
  const href = urlDe(`${cat.pasta}/${d.slug}.html`);
  const player = `<div class="art-video${d.short ? ' is-short' : ''}">${fachadaHtml(ctx, { embed: `https://www.youtube-nocookie.com/embed/${d.id}`, href: `https://www.youtube.com/watch?v=${d.id}`, titulo: d.titulo, imagem: miniatura(d.id) })}</div>`;
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
  // espacos de ADS: depois da contagem (antes desta secao), depois do destaque e depois do botao da playlist
  return `${adsHtml('gta6-apos-contagem')}
      <section class="gta-news" aria-labelledby="gta-novidades">
        <h2 class="section-title" id="gta-novidades">${icone(catGta.icone)} Últimas novidades de GTA 6</h2>
        ${destaque}
${adsHtml('gta6-apos-destaque')}
${outros.length ? `        <h3 class="gd-mais">Mais novidades</h3>
        <div class="news-grid" data-lista="hub-gta6">
${outros.slice(0, PASSO_DA_LISTA).map(({ m, cat: c }) => cartao(m, c, '')).join('\n')}
        </div>
${colecao(ctx, 'hub-gta6', outros, { gravar: false })}` : ''}
        <p class="gd-todas"><a class="btn" href="https://www.youtube.com/playlist?list=${catGta.playlist}" target="_blank" rel="noopener">Ver a playlist completa no YouTube</a></p>
${adsHtml('gta6-apos-playlist')}
      </section>`;
}

// bloco da home: 1 cartao grande (o mais novo) + os pequenos ao lado. lado = onde fica o grande: 'esquerda' (padrao) ou 'direita'. So o visual muda:
// no HTML o grande vem sempre primeiro (leitor de tela e Google leem na mesma ordem). `cartoes` = HTML dos cartoes, o primeiro ja como 'grande'.
function blocoHtml(cartoes, lado = 'esquerda') {
  const [grande, ...pequenos] = cartoes;
  return `        <div class="bloco-grade${lado === 'direita' ? ' bloco-invertido' : ''}">
${grande}${pequenos.length ? `
          <div class="bloco-lista">
${pequenos.join('\n')}
          </div>` : ''}
        </div>`;
}

// carrossel do topo da home: as ultimas publicacoes do site (config.mjs, CARROSSEL). Todos os slides ja vem no HTML (rola para o lado sozinho, com ou sem
// JavaScript); assets/js/carrossel.js so acrescenta setas, bolinhas e a troca automatica na linha de controles (que fica reservada: sem salto de layout).
// Logo abaixo vai o convite para o canal (botao de inscricao direta no YouTube: ?sub_confirmation=1, a URL vem de SOCIAIS em config.mjs).
export function carrosselHtml(ctx) {
  const { icone } = ctx;
  const itens = CARROSSEL.categorias
    .flatMap((pasta) => { const d = ctx.itensPorCategoria[pasta]; return d ? d.itens.filter((m) => !m.semTexto).map((m) => ({ m, cat: d.cat })) : []; })
    .sort((a, b) => b.m.publicado.localeCompare(a.m.publicado))
    .slice(0, CARROSSEL.qtd);
  if (!itens.length) return '';
  const slides = itens.map(({ m, cat }, i) => `          <div class="car-slide" role="group" aria-roledescription="slide" aria-label="${i + 1} de ${itens.length}">
            <a class="car-link" href="${urlDe(`${cat.pasta}/${m.slug}.html`)}">
              <span class="car-thumb">${(() => { const im = imagemDoCartao(m.id, SIZES_CARROSSEL); return `<img ${im.atributos} alt="${esc(im.alt)}" width="${im.w}" height="${im.h}" fetchpriority="${i === 0 ? 'high' : 'low'}">`; })()}</span>
              <span class="car-texto">
                <span class="tag">${icone(cat.icone)} ${esc(cat.rotulo)}</span>
                <b class="car-titulo">${esc(m.titulo)}</b>
                ${m.resumo ? `<span class="car-resumo">${esc(m.resumo)}</span>` : ''}
                <small class="car-data">${dataCurta(m.publicado)}</small>
                <span class="car-cta">Ler a matéria &rarr;</span>
              </span>
            </a>
          </div>`).join('\n');
  return `      <section class="carrossel" aria-roledescription="carrossel" aria-label="Últimas publicações" data-segundos="${CARROSSEL.segundos}">
        <div class="car-pista">
${slides}
        </div>
        <div class="car-controles"></div>
      </section>
${conviteHtml(ctx)}`;
}

// contagem regressiva do GTA 6: a faixa da home (faixa: true) e o bloco grande de gta6.html. Marcadores <!--contagem:inicio-->...<!--contagem:fim--> nas duas paginas.
// ANTES de GTA6.alvo (comparado com ctx.agora, o instante da geracao) sai a contagem, com os textos do estado "lancado" so em atributos data-lancado-* (nao aparecem; o contador.js
// os monta na hora H). DEPOIS, o estado lancado ja sai pronto no HTML, sem numeros: o mesmo desenho que o contador.js monta (conferido pelo teste "js").
export function contagemHtml(ctx, { faixa = false } = {}) {
  const L = GTA6.lancado, classe = `gta${faixa ? ' gta-faixa' : ''}`;
  const textoLancado = ctx.modelo(L.texto), tituloLancado = `GTA <span>VI</span> ${esc(L.titulo)}`;
  const botao = faixa ? `\n        <a class="btn primary gta-botao" href="gta6.html">${esc(L.botao)}</a>` : '';
  if (ctx.agora >= new Date(GTA6.alvo)) {
    return `      <section class="${classe} gta-lancado" aria-labelledby="gta-title" data-estado="lancado">
        <p class="gta-kicker">${esc(L.kicker)}</p>
        <h2 id="gta-title" class="gta-title">${tituloLancado}</h2>
        <p class="gta-date">${esc(textoLancado)}</p>${botao}
      </section>`;
  }
  const atributos = `data-lancado-kicker="${esc(L.kicker)}" data-lancado-titulo="${esc(L.titulo)}" data-lancado-texto="${esc(textoLancado)}"${faixa ? ` data-lancado-botao="${esc(L.botao)}" data-lancado-href="gta6.html"` : ''}`;
  return `      <section class="${classe}" aria-labelledby="gta-title" ${atributos}>
        <p class="gta-kicker">Contagem regressiva</p>
        <h2 id="gta-title" class="gta-title">GTA <span>VI</span> chega em</h2>
        <div class="count" id="gta-count" data-alvo="${GTA6.alvo}" role="timer" aria-live="off">
          <div class="unit"><b id="cd-d">--</b><span>dias</span></div>
          <div class="unit"><b id="cd-h">--</b><span>horas</span></div>
          <div class="unit"><b id="cd-m">--</b><span>min</span></div>
          <div class="unit"><b id="cd-s">--</b><span>seg</span></div>
        </div>
        <p class="gta-date">Lançamento: <!--dado:gta6-data-->${ctx.dado('gta6-data')}<!--/dado--> · <!--dado:gta6-plataformas-curto-->${ctx.dado('gta6-plataformas-curto')}<!--/dado--></p>
      </section>`;
}

// ---- Ficha de veredito (reviews) e fontes (todas as materias): campos "veredito" e "fontes" do JSON, validados em contrato.mjs ----
// O veredito sai no alto da pagina (logo depois do resumo): nota em destaque, a recomendacao e so o que estiver preenchido (plataforma, preco, horas, para quem e).
// As fontes saem no fim do texto, com link (nova aba). As duas partes ficam fora do indice da busca (data-pagefind-ignore): so o texto da materia entra nos resultados.
const notaBr = (n) => String(n).replace('.', ',');
function vereditoHtml({ icone }, m, ign) {
  const v = m.veredito;
  if (!v || typeof v.nota !== 'number') return '';
  const recomendacao = v.recomendacao ? RECOMENDACOES[v.recomendacao] : '';
  const dados = [['Plataforma', v.plataforma], ['Preço', v.preco], ['Horas de jogo', v.horas], ['Para quem é', v.paraQuem]].filter(([, t]) => t);
  return `<section class="veredito" aria-labelledby="veredito-titulo"${ign}>
          <h2 class="veredito-titulo" id="veredito-titulo">Veredito do Brubão</h2>
          <p class="veredito-nota"><span class="sr-only">Nota </span><b>${notaBr(v.nota)}</b><span>/10</span></p>${recomendacao ? `
          <p class="veredito-rec">${icone('star')} ${esc(recomendacao)}</p>` : ''}${dados.length ? `
          <dl class="veredito-dados">
${dados.map(([k, t]) => `            <div${k === 'Para quem é' ? ' class="veredito-largo"' : ''}><dt>${k}</dt><dd>${esc(t)}</dd></div>`).join('\n')}
          </dl>` : ''}
        </section>`;
}
// ---- Tempo de leitura (no alto, ao lado da categoria) e assinatura (no fim, perto das fontes) ----
const contarPalavras = (...textos) => textos.flat(Infinity).filter((t) => typeof t === 'string').join(' ').split(/\s+/).filter(Boolean).length;
function leituraHtml({ icone }, palavras, ign) {
  if (!palavras) return ''; // pagina so com o video (previa): nao ha texto para ler
  return ` <span class="leitura"${ign}>${icone('clock')} ${Math.max(1, Math.ceil(palavras / PALAVRAS_POR_MINUTO))} min de leitura</span>`;
}
// "Por Bruno Bem · Publicado em <data> · Texto com apoio de IA": a data fica aqui (nao mais no alto) e a ordenacao da busca le este <time>; o link do apoio de IA leva a Sobre
// o circulo do autor: a foto (AUTOR_FOTO em config.mjs; decorativa, o nome vem escrito ao lado) ou, sem foto, a inicial do nome
export const avatarHtml = () => `<span class="avatar" aria-hidden="true">${AUTOR_FOTO ? `<img src="../${AUTOR_FOTO}" alt="" width="32" height="32">` : AUTOR[0]}</span>`;
function autoriaHtml({ publicado, indexavel, ign, rotulo = 'Publicado em' }) {
  return `<p class="autoria"${ign}>${avatarHtml()}<span>Por <b>${AUTOR}</b> &middot; ${rotulo} <time${indexavel ? ' data-pagefind-sort="data[datetime]" data-pagefind-meta="data[datetime]" data-pagefind-ignore' : ''} datetime="${publicado}">${dataLonga(publicado)}</time></span><a class="autoria-ia" href="../sobre.html">Texto com apoio de IA</a></p>`;
}

// sufixo e nivel: na pagina de assunto cada bloco tem as proprias fontes (ids unicos, titulo h3)
function fontesHtml(m, ign, { sufixo = '', nivel = 2 } = {}) {
  const fontes = Array.isArray(m.fontes) ? m.fontes : [];
  if (!fontes.length) return '';
  return `<section class="fontes" ${sufixo ? `aria-label="Fontes: ${esc(m.titulo)}"` : `aria-labelledby="fontes-titulo${sufixo}"`}${ign}>
        <h${nivel} class="fontes-titulo" id="fontes-titulo${sufixo}">Fontes</h${nivel}>
        <ul class="fontes-lista">
${fontes.map((f) => `          <li><a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.nome)}<span class="sr-only"> (abre em nova aba)</span></a></li>`).join('\n')}
        </ul>
      </section>`;
}

// ---- Shorts anexados (campo "shorts" do JSON, validado em contrato.mjs) ----
// Shorts que acompanham a materia (hoje, a review), cada um num player vertical pequeno com fachada (o iframe so nasce no clique); fora do indice da busca.
function shortsHtml(ctx, m, cat, ign) {
  const shorts = Array.isArray(m.shorts) ? m.shorts : [];
  if (!shorts.length) return '';
  return `<section class="shorts" aria-labelledby="shorts-titulo"${ign}>
        <h2 class="shorts-titulo" id="shorts-titulo">${cat.pasta === 'reviews' ? 'Shorts desta review' : 'Shorts desta matéria'}</h2>
        <ul class="shorts-lista">
${shorts.map((s) => `          <li class="short-item"><div class="art-video is-short">${fachadaHtml(ctx, { embed: `https://www.youtube-nocookie.com/embed/${s.id}`, href: `https://www.youtube.com/shorts/${s.id}`, titulo: s.titulo, imagem: miniatura(s.id), lazy: true })}</div><p class="short-legenda">${esc(s.titulo)}</p></li>`).join('\n')}
        </ul>
      </section>`;
}
// ---- Assunto: materias de videos diferentes sobre o mesmo fato (campo "assunto" do JSON da materia) ----
// Cada materia tem a PROPRIA pagina e o proprio endereco; o assunto so as liga. No fim de cada uma, o bloco "Mais sobre este assunto" lista as outras do mesmo assunto (2 ou mais), cada
// uma com link para a pagina dela. O endereco do assunto em si (categoria/chave.html), que ate a v1.02 era uma pagina agregada com um bloco por video, virou um redirecionamento para a
// materia mais nova do assunto (construirRedirecionamentos). _conteudo/assuntos.json passou a ser opcional: so a "categoria" (pasta do redirecionamento) e o titulo e o resumo da previa
// de compartilhamento desse redirecionamento saem dele.
function agruparAssuntos(ctx, grupos) {
  ctx.irmasDe = new Map(); // materia -> { m, cat } das outras do mesmo assunto, da mais nova para a mais velha
  ctx.assuntosAgrupados = []; // [{ chave, pasta, nova }] para o redirecionamento do endereco do assunto
  const porAssunto = new Map();
  for (const { cat, itens } of grupos) for (const m of itens) if (typeof m.assunto === 'string' && !(m.ficticio || m.semTexto || m.rascunho)) (porAssunto.get(m.assunto) ?? porAssunto.set(m.assunto, []).get(m.assunto)).push({ m, cat });
  for (const [chave, lista] of porAssunto) {
    if (lista.length < 2) continue;
    const membros = [...lista].sort((a, b) => b.m.publicado.localeCompare(a.m.publicado) || b.m.id.localeCompare(a.m.id));
    for (const { m } of membros) ctx.irmasDe.set(m, membros.filter((x) => x.m !== m));
    ctx.assuntosAgrupados.push({ chave, pasta: ctx.categoriaDoAssunto?.(chave) ?? membros[membros.length - 1].cat.pasta, nova: membros[0] });
  }
  ctx.paginasDeAssunto = 0;
}

// ---- imagens da pasta da materia (imagens.mjs) ----
// A capa do player e a thumb da pasta da materia (thumb.jpg), se existir; senao, a miniatura do YouTube (de qualidade menor).
function capaDoPlayer(ctx, m) {
  const t = ctx.imagens?.get(m.id)?.thumb;
  if (!t) return miniatura(m.id);
  const f = fonteDaImagem(m.id, t, '../', m.short ? 480 : 960);
  return { src: f.src, srcset: f.srcset, sizes: m.short ? '(max-width: 380px) 100vw, 340px' : '(max-width: 1000px) 100vw, 1000px', w: f.w, h: f.h, alt: t.alt || '' };
}
// Os paragrafos do texto, com a imagem N (img-N_<site da fonte>.jpg) logo depois do paragrafo N x (paragrafos por imagem do tipo: 1 na noticia e no lancamento, 2 na review; imagens.mjs);
// imagem que cairia depois do ultimo paragrafo vai depois dele. Sem arquivo, nao aparece nada.
function corpoComImagens(ctx, m) {
  const reg = ctx.imagens?.get(m.id), aCada = reg?.aCada ?? 1;
  const fotos = [...(reg?.fotos ?? [])].sort((a, b) => a[0] - b[0]);
  const ign = m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-ignore';
  const linhas = [];
  m.corpo.forEach((p, i) => {
    linhas.push(`        <p>${esc(p)}</p>`);
    for (const [n, f] of fotos) if (n * aCada === i + 1 || (i === m.corpo.length - 1 && n * aCada > i + 1)) linhas.push(figuraDaMateria(m, f, ign));
  });
  return linhas.join('\n');
}
// a imagem com a fonte na legenda: o site vem do nome do arquivo; se for o site de uma das fontes da materia, a legenda leva ao texto dela
function figuraDaMateria(m, f, ign) {
  const x = fonteDaImagem(m.id, f, '../', 800);
  const host = (u) => { try { return new URL(u).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; } };
  const daFonte = (m.fontes ?? []).find((s) => host(s.url) === f.fonte || host(s.url).endsWith(`.${f.fonte}`));
  const credito = daFonte ? `<a href="${esc(daFonte.url)}" target="_blank" rel="noopener">${esc(f.fonte)}</a>` : esc(f.fonte);
  return `        <figure class="art-foto">
          <img src="${x.src}" srcset="${x.srcset}" sizes="${m.short ? '(max-width: 860px) 100vw, 620px' : '(max-width: 1000px) 100vw, 1000px'}" alt="${esc(f.alt ?? '')}" loading="lazy" width="${x.w}" height="${x.h}">
          <figcaption${ign}>Imagem: ${credito}</figcaption>
        </figure>`;
}

// FACHADA do player: no lugar do iframe do YouTube (que, so de existir na pagina, ja carrega o player inteiro e dezenas de pedidos ao Google) entra um link com a miniatura e o
// botao de play. SEM JavaScript e um link para o video (ou a playlist) no YouTube, em nova aba. COM assets/js/fachada.js o clique troca a fachada pelo player (youtube-nocookie,
// ja tocando) ali mesmo. `embed` e o endereco do player; `href`, o do video; `imagem` pode faltar (playlist sem dados: sobra o fundo escuro com o play); `lazy` so abaixo da dobra.
function fachadaHtml({ icone }, { embed, href, titulo, imagem = '', lazy = false }) {
  const foto = !imagem ? '' : typeof imagem === 'string' ? `<img src="${imagem}" alt="" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} width="480" height="360">`
    : `<img src="${imagem.src}" srcset="${imagem.srcset}" sizes="${imagem.sizes}" alt="${esc(imagem.alt ?? '')}" ${lazy ? 'loading="lazy"' : 'fetchpriority="high"'} width="${imagem.w}" height="${imagem.h}">`; // imagem propria (thumb.jpg da pasta da materia): varias larguras, sem aumentar a original
  return `<a class="fachada" href="${href}" target="_blank" rel="noopener" data-embed="${embed}" data-titulo="${esc(titulo)}" aria-label="Assistir: ${esc(titulo)}">${foto}<span class="fachada-play">${icone('play')}</span></a>`;
}

// botoes de compartilhar no fim da materia, SEM script de terceiros. WhatsApp e Telegram sao links comuns (abrem o app ou o site deles, com o titulo e o endereco da
// pagina). "Copiar link" e "Mais opcoes" (a folha de compartilhamento do celular) nascem escondidos: assets/js/compartilhar.js os mostra se o navegador sabe fazer.
// O endereco compartilhado e o do canonical da pagina e o titulo e o do h1: quem compartilha e o proprio JavaScript; o HTML so traz os dois links.
function compartilharHtml({ icone }, { titulo, url }) {
  const enc = (s) => esc(encodeURIComponent(s));
  return `      <section class="compartilhar" aria-labelledby="compartilhar-titulo" data-pagefind-ignore>
        <h2 class="compartilhar-titulo" id="compartilhar-titulo">Compartilhar</h2>
        <div class="compartilhar-botoes">
          <a class="btn" href="https://wa.me/?text=${enc(`${titulo} ${url}`)}" target="_blank" rel="noopener">${icone('message-circle')} WhatsApp<span class="sr-only"> (abre em nova aba)</span></a>
          <a class="btn" href="https://t.me/share/url?url=${enc(url)}&amp;text=${enc(titulo)}" target="_blank" rel="noopener">${icone('send')} Telegram<span class="sr-only"> (abre em nova aba)</span></a>
          <button class="btn" type="button" data-copiar hidden>${icone('link')} Copiar link</button>
          <button class="btn" type="button" data-compartilhar hidden>${icone('share-2')} Mais opções</button>
        </div>
        <p class="compartilhar-aviso" role="status"></p>
      </section>`;
}

// convite para o canal (abaixo do carrossel da home e no fim de cada materia): o botao abre a inscricao direta no YouTube (?sub_confirmation=1)
function conviteHtml({ icone }, atributos = '') {
  return `      <div class="convite"${atributos}>
        <span class="convite-ico">${icone('youtube')}</span>
        <p class="convite-texto"><b>Siga o canal BRUBAOGG</b><span>Notícias, reviews, lançamentos e cortes de games em vídeo.</span></p>
        <a class="btn primary" href="${(SOCIAIS.find((s) => s.nome === 'YouTube') ?? SOCIAIS[0]).url}?sub_confirmation=1" target="_blank" rel="noopener">Inscreva-se no canal<span class="sr-only"> (abre o YouTube em nova aba)</span></a>
      </div>`;
}

// abertura da home: a cobertura em andamento (config.mjs, COBERTURA). Um titulo (o h1 da home) com uma linha de texto e, embaixo, as ultimas novidades do jogo
// no formato dos blocos da home (1 grande + pequenos). Quando a cobertura acaba (ativa: false) este bloco some e a home abre direto no feed.
export function coberturaHtml(ctx) {
  const { icone, cartao, modelo } = ctx;
  if (!COBERTURA.ativa) return '';
  const dados = ctx.itensPorCategoria[COBERTURA.categoria];
  const novidades = dados ? listaDoHub(ctx).slice(0, COBERTURA.qtd) : [];
  const cards = novidades.map(({ m, cat }, i) => cartao(m, cat, '', i === 0 ? 'grande' : 'pequeno'));
  return `      <section class="cobertura" aria-labelledby="cobertura-titulo">
        <div class="feed-head">
          <div>
            <p class="cobertura-kicker">${icone(dados?.cat.icone ?? 'newspaper')} ${esc(COBERTURA.rotulo)}</p>
            <h1 id="cobertura-titulo" class="cobertura-title">${esc(COBERTURA.titulo)}</h1>
          </div>${novidades.length ? `
          <a class="feed-all" href="${COBERTURA.pagina}">Tudo sobre ${esc(COBERTURA.jogo)} &rarr;</a>` : ''}
        </div>
        <p class="cobertura-texto">${esc(modelo(COBERTURA.texto))}</p>${novidades.length ? `
${blocoHtml(cards, COBERTURA.lado)}` : ''}
      </section>`;
}

// ---- Paginas de player (Cortes e Lives): cada playlist de PLAYERS (config.mjs) com o player, o texto e a lista dos ultimos videos dela ----
// Marcadores <!--players:inicio-->...<!--players:fim--> em cortes.html e lives.html. A lista vem de assets/data/players.json; sem dados, a playlist fica so com o player.
// Cada video abre no YouTube (nova aba), dentro da playlist; o titulo na pagina e o que o Google le (antes a pagina era so um player, sem texto).
export function playersHtml(ctx, pagina) {
  const blocos = (PLAYERS[pagina] ?? []).map(({ playlist, titulo, texto }) => {
    const videos = (ctx.players[playlist] ?? []).slice(0, VIDEOS_POR_PLAYER);
    const lista = videos.length ? `
          <h3 class="pl-recentes">Últimos vídeos</h3>
          <ul class="pl-videos">
${videos.map((v) => `            <li><a href="https://www.youtube.com/watch?v=${v.id}&amp;list=${playlist}" target="_blank" rel="noopener"><span class="pl-thumb"><img src="${miniatura(v.id)}" alt="" loading="lazy" width="160" height="90"></span><span class="pl-texto"><b>${esc(v.title)}</b><small>${dataCurta(v.published)}</small></span><span class="sr-only"> (abre o YouTube em nova aba)</span></a></li>`).join('\n')}
          </ul>` : '';
    return `        <article class="pl">
          <h2>${esc(titulo)}</h2>
          <p>${esc(texto)}</p>
          <div class="video">${fachadaHtml(ctx, { embed: `https://www.youtube-nocookie.com/embed/videoseries?list=${playlist}`, href: `https://www.youtube.com/playlist?list=${playlist}`, titulo, imagem: videos[0] ? miniatura(videos[0].id) : '', lazy: true })}</div>${lista}
          <a class="btn" href="https://www.youtube.com/playlist?list=${playlist}" target="_blank" rel="noopener" aria-label="Ver playlist completa no YouTube: ${esc(titulo)}">Ver playlist completa no YouTube</a>
        </article>`;
  });
  // um espaco de ADS entre as playlists (o de antes da primeira e o do fim da pagina ficam no .html, fora desta regiao)
  return `      <section class="pls">\n${blocos.join(`\n${adsHtml(`${pagina.replace(/\.html$/, '')}-entre-playlists`)}\n`)}\n      </section>`;
}

// Wiki: um cartao por jogo de config.mjs (WIKI). Imagem = miniatura do conteudo mais recente do jogo; subtitulos = as tags "filhas" da franquia (em
// _conteudo/tags.json, ex.: Resident Evil 6, 7, Village); o numero conta as materias da tag. O cartao leva para a pagina do jogo na Wiki (wiki/<tag>.html, gerada
// por construirWiki) ou, se a tag tem pagina propria no tags.json (GTA 6: gta6.html), para ela.
// Os JOGOS de uma franquia da Wiki, NA ORDEM DO MENU: `serie` em config.mjs (slug de tag do tags.json, ou { tag, nome } para um jogo que ainda nao tem materia nem tag, como GTA 1);
// sem `serie`, as tags "filhas" (`pai` no tags.json) por nome. Cada um: { slug, nome, itens } (itens = as materias da tag; vazio enquanto nao ha nenhuma).
export function jogosDaSerie(ctx, j) {
  const { tagsCfg, porTag } = ctx;
  const lista = j.serie ?? [...porTag.values()].filter((t) => tagsCfg[t.slug]?.pai === j.tag).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true })).map((t) => t.slug);
  return lista.map((e) => {
    const slug = typeof e === 'string' ? e : e.tag;
    return { slug, nome: (typeof e === 'object' && e.nome) || tagsCfg[slug]?.nome || porTag.get(slug)?.nome || slug, itens: porTag.get(slug)?.itens ?? [] };
  });
}
/** A franquia de um jogo da Wiki: a tag dela (se existir) + os jogos da serie. `todos` = cada materia uma vez, da mais nova para a mais velha. */
export function familiaDoJogo(ctx, j) {
  const serie = jogosDaSerie(ctx, j);
  const vistos = new Set(), todos = [];
  for (const grupo of [ctx.porTag.get(j.tag)?.itens ?? [], ...serie.map((s) => s.itens)]) for (const x of grupo) if (!vistos.has(x.m.id)) { vistos.add(x.m.id); todos.push(x); }
  todos.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
  return { serie, todos };
}
const NOTICIAS = new Set(['noticias', 'gta6-novidades']); // categorias que contam como "Noticias" no menu da Wiki
// todas as tags que pertencem a um jogo da Wiki: a da franquia, as da serie (config) e as "filhas" do tags.json
const slugsDoJogo = (ctx, j) => new Set([j.tag, ...(j.serie ?? []).map((e) => (typeof e === 'string' ? e : e.tag)), ...Object.keys(ctx.tagsCfg).filter((s) => ctx.tagsCfg[s]?.pai === j.tag)]);
const paginaPropria = (ctx, j) => j.pagina ?? ctx.tagsCfg[j.tag]?.pagina ?? null;
export const arquivoDaWiki = (ctx, j) => paginaPropria(ctx, j) ?? `wiki/${j.tag}.html`;
export const paginaDaWiki = (ctx, j) => urlDe(arquivoDaWiki(ctx, j));
function jogosDaWiki(ctx) {
  const jogos = [];
  for (const j of WIKI.jogos) {
    const { serie, todos } = familiaDoJogo(ctx, j);
    if (!todos.length) { ctx.avisos.push(`wiki: "${j.nome}" (tag ${j.tag}) nao tem nenhuma materia e ficou fora da Wiki.`); continue; }
    // capa: o video indicado em config (`video`) ou o mais novo que seja horizontal e so fale do proprio jogo (um Short, ou uma materia que cita outro jogo, passaria a
    // imagem errada: ja houve capa de Silent Hill no cartao do Resident Evil); sem nenhum assim, o mais novo
    const familia = new Set([j.tag, ...serie.map((s) => s.slug)]);
    const capa = (j.video && todos.find(({ m }) => m.id === j.video)) ?? todos.find(({ m }) => !m.short && m.tags.every((t) => familia.has(t.slug))) ?? todos[0];
    // subtitulo = os jogos da serie, na ordem do menu (mesmo os que ainda nao tem conteudo: mostra o tamanho da franquia)
    const subtitulo = serie.length ? `${serie.slice(0, 3).map((s) => s.nome).join(' · ')}${serie.length > 3 ? ` e mais ${serie.length - 3}` : ''}` : '';
    jogos.push({ j, href: paginaDaWiki(ctx, j), capa, subtitulo, n: todos.length });
  }
  return jogos;
}
function cartaoWiki(ctx, g, grande) {
  const texto = g.j.texto ? ctx.modelo(g.j.texto) : ''; // o texto aceita os dados de config (ex.: {gta6-dia-mes})
  const resumo = g.subtitulo || (grande ? '' : texto);  // o cartao pequeno usa o texto como resumo quando o jogo nao tem subtitulos
  return `          <a class="news-card wiki-card${grande ? ' grande' : ''}" href="${g.href}">
            <span class="thumb">${(() => { const im = imagemDoCartao(g.capa.m.id, grande ? SIZES_CARTAO_GRANDE : SIZES_CARTAO_PEQUENO); return `<img ${im.atributos} alt="${esc(im.alt)}" loading="lazy">`; })()}</span>
            <span class="news-body">
              <span class="tag">${ctx.icone('book-open')} Wiki</span>
              <b class="news-title">${esc(g.j.nome)}</b>
              ${resumo ? `<span class="news-excerpt">${esc(resumo)}</span>` : ''}
              ${grande && texto ? `<span class="news-mais">${esc(texto)}</span>` : ''}
              <small class="news-date">${g.n} ${g.n === 1 ? 'conteúdo' : 'conteúdos'}</small>
            </span>
          </a>`;
}
// a pagina wiki.html: grade com todos os jogos
export function wikiHtml(ctx) {
  const cards = jogosDaWiki(ctx).map((g) => cartaoWiki(ctx, g, false));
  const jogos = cards.length ? `        <div class="news-grid">\n${cards.join('\n')}\n        </div>` : '        <p class="lead">Os primeiros jogos chegam em breve.</p>';
  const estatico = `${jogos}${seriesDaWikiHtml(ctx)}`;
  // com mini-busca: o campo e o menu de jogos vem primeiro e o conteudo de sempre fica na coluna ao lado, visivel (o JavaScript o esconde enquanto houver busca ativa)
  const corpo = ctx.buscaDaWiki ? htmlDaSecao(ctx, ctx.buscaDaWiki, estatico) : estatico;
  // fecho da pagina: o aviso "Em construcao" (os jogos entram aos poucos) e um espaco de ADS no fim
  return `${corpo}\n      ${emConstrucaoHtml(ctx, 'Novos jogos entram aqui aos poucos.')}\n${adsHtml('wiki-fim')}`;
}
// as Series moram dentro da Wiki: abaixo dos jogos, as historias mais novas (1 cartao grande + pequenos, como as secoes da home) e o caminho para a lista completa
// (series.html). Sem nenhuma materia da categoria, a secao nao aparece.
function seriesDaWikiHtml(ctx) {
  const dados = ctx.itensPorCategoria.series;
  const itens = (dados?.itens ?? []).filter((m) => !m.semTexto && !m.ficticio).slice(0, WIKI.seriesQtd);
  if (!itens.length) return '';
  const { cat } = dados;
  const cards = itens.map((m, i) => ctx.cartao(m, cat, '', i === 0 ? 'grande' : 'pequeno'));
  return `

${adsHtml('wiki-antes-das-series')}
        <section class="feed-sec">
          <div class="feed-head">
            <h2 class="section-title">${ctx.icone(cat.icone)} ${esc(cat.nome)}</h2>
            <a class="feed-all" href="${cat.pasta}.html" aria-label="Ver todas: ${esc(cat.nome)}">Ver todas &rarr;</a>
          </div>
          <p class="wiki-aviso">${esc(cat.desc)}</p>
${blocoHtml(cards, 'esquerda')}
        </section>`;
}
// a secao Wiki da home, no mesmo formato dos outros blocos: o primeiro jogo no cartao grande, os demais nos pequenos e, depois deles, o espaco "Em construcao"
// (ocupa o que sobra da coluna: com so um jogo, ele e a coluna inteira).
function wikiBlocoHtml(ctx, lado) {
  const jogos = jogosDaWiki(ctx);
  if (!jogos.length) return '';
  const [primeiro, ...outros] = jogos;
  const vazio = `          ${emConstrucaoHtml(ctx, 'Mais jogos entram aqui em breve.')}`;
  const cards = [cartaoWiki(ctx, primeiro, true), ...outros.map((g) => cartaoWiki(ctx, g, false)), vazio];
  return `      <section class="feed-sec">
        <div class="feed-head">
          <h2 class="section-title">${ctx.icone('book-open')} Wiki</h2>
          <a class="feed-all" href="wiki.html">Ver a Wiki &rarr;</a>
        </div>
${blocoHtml(cards, lado)}
      </section>`;
}

// espaco reservado para anuncio (por enquanto so a palavra ADS, para saber onde cada um fica). `lugar` identifica o espaco (data-ads). Tem altura fixa no CSS
// (.ads): quando o anuncio de verdade entrar, a pagina nao pula. Escondido do leitor de tela enquanto for so um marcador.
const adsHtml = (lugar) => `      <div class="ads" data-ads="${lugar}" aria-hidden="true">ADS</div>`;
// nas listas de cartoes (Noticias, Reviews, Lancamentos) os ADS entram ENTRE as linhas de cartoes, e quem os coloca e assets/js/ads.js (mede quantos cartoes cabem por linha):
// a lista leva os atributos data-ads-primeiro (depois de quantas linhas entra o primeiro) e data-ads-cada (de quantas em quantas linhas os seguintes). Valores em config.mjs.
const adsNaLista = (secao) => (ADS_ATIVOS && ADS_NAS_LISTAS[secao] ? ` data-ads-primeiro="${ADS_NAS_LISTAS[secao].primeiro}" data-ads-cada="${ADS_NAS_LISTAS[secao].cada}"` : '');
// "Em construcao": o mesmo espaco da Wiki da home, agora tambem no fim da pagina da Wiki (`texto` ja escapado)
const emConstrucaoHtml = (ctx, texto) => `<div class="bloco-vazio">${ctx.icone('construction')}<b>Em construção</b><span>${texto}</span></div>`;

// feed da home: ultimos videos por categoria (abre a materia quando existe, senao o YouTube); um espaco de ADS depois de cada secao
export function feedHtml(ctx) {
  const { icone, cartao, videosDe } = ctx;
  // a cobertura abre a home (coberturaHtml, grande a esquerda); cada secao daqui e 1 cartao grande + 3 pequenos, e o grande alterna de lado (lado) para dar ritmo
  // a pagina: cobertura esquerda, noticias direita, reviews esquerda, lancamentos direita, wiki esquerda (no fim). Para parar de alternar, ponha 'esquerda' em todas.
  const QTD = 4; // 1 grande + 3 pequenos
  const secoes = [
    { cat: categorias[0], titulo: 'Últimas notícias', lado: 'direita', ads: 'apos-noticias' },
    { cat: categorias[1], titulo: 'Últimos reviews', lado: 'esquerda', ads: 'apos-reviews' },
    { cat: categorias[2], titulo: 'Lançamentos', lado: 'direita', ads: 'apos-lancamentos' },
  ];
  const wiki = wikiBlocoHtml(ctx, 'esquerda'); // a Wiki fecha o feed, depois dos lancamentos
  // categorias que dizem `tambemEm` (config.mjs: tudo de GTA 6 tambem e noticia) entram no bloco da categoria de destino, com o rotulo da origem; o que a cobertura do topo da home
  // ja mostra nao se repete aqui (cada materia aparece uma vez so na home, no bloco em que o leitor a encontra primeiro)
  const catDoItem = new Map(Object.values(ctx.itensPorCategoria).flatMap(({ cat, itens }) => itens.map((m) => [m.id, cat])));
  const naCobertura = new Set(COBERTURA.ativa && ctx.itensPorCategoria[COBERTURA.categoria] ? listaDoHub(ctx).slice(0, COBERTURA.qtd).map(({ m }) => ctx.publicadas.get(m.id) ?? m) : []); // itens (nao ids): uma pagina de assunto cobre varios videos
  return secoes.map(({ cat, titulo, lado, ads }) => {
    const candidatas = [...videosDe(cat), ...categorias.filter((c) => c.tambemEm === cat.pasta).flatMap((c) => videosDe(c).filter((v) => !naCobertura.has(ctx.publicadas.get(v.id))))];
    const vistos = new Set(); // varios videos do mesmo assunto sao um cartao so (o do video mais novo)
    const recentes = candidatas.sort((a, b) => b.published.localeCompare(a.published)).filter((v) => ctx.publicadas.has(v.id)).filter((v) => { const it = ctx.publicadas.get(v.id); if (vistos.has(it)) return false; vistos.add(it); return true; }).slice(0, QTD);
    if (!recentes.length) return '';
    const cards = recentes.map((v, i) => cartao(ctx.publicadas.get(v.id), catDoItem.get(v.id) ?? cat, '', i === 0 ? 'grande' : 'pequeno'));
    const interna = ctx.visiveis.has(cat.pasta);
    const todas = interna ? `${cat.pasta}.html` : `https://www.youtube.com/playlist?list=${cat.playlist}`;
    return `      <section class="feed-sec">
        <div class="feed-head">
          <h2 class="section-title">${icone(cat.icone)} ${titulo}</h2>
          <a class="feed-all" href="${todas}" aria-label="Ver todas${interna ? '' : ' no YouTube'}: ${esc(titulo)}"${interna ? '' : ' target="_blank" rel="noopener"'}>Ver todas${interna ? '' : ' no YouTube'} &rarr;</a>
        </div>
${blocoHtml(cards, lado)}
      </section>
${adsHtml(ads)}`;
  }).concat(wiki ? [`${wiki}\n${adsHtml('apos-wiki')}`] : []).filter(Boolean).join('\n');
}

// ---- paginas de tag (so materias com texto) e a lista de todas as tags ----
export function construirTags(ctx) {
  const { icone, cartao, pagina, escrever, temPaginaTag, tagPage, tagsCfg, indice } = ctx;
  for (const { cat, itens } of Object.values(ctx.itensPorCategoria)) {
    for (const m of itens) {
      if (m.semTexto || m.ficticio) continue;
      for (const x of m.tags) {
        if (!ctx.porTag.has(x.slug)) ctx.porTag.set(x.slug, { slug: x.slug, nome: x.nome, itens: [] });
        ctx.porTag.get(x.slug).itens.push({ m, cat });
      }
    }
  }
  ctx.temTags = [...ctx.porTag.values()].some((x) => temPaginaTag(x.slug));
  // na pagina de um jogo da Wiki, o caminho para as historias dele (categoria que mora na Wiki, hoje "series"); so aparece se o jogo tem alguma
  const historias = (tg) => {
    const jogo = WIKI.jogos.find((j) => j.tag === tg.slug && !paginaPropria(ctx, j));
    if (!jogo) return '';
    const cat = categorias.find((c) => c.aba === 'wiki.html');
    const n = cat ? tg.itens.filter((x) => x.cat === cat).length : 0;
    return ` &middot; <a href="../${paginaDaWiki(ctx, jogo)}">Wiki ${esc(jogo.nome)}</a>${n ? ` &middot; <a href="../${cat.lista ?? `${cat.pasta}.html`}">${n} ${n === 1 ? 'história' : 'histórias'} da série</a>` : ''}`;
  };
  for (const tg of ctx.porTag.values()) {
    tg.itens.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
    if (!temPaginaTag(tg.slug)) continue;      // tag com 1 materia: continua na busca, mas nao ganha pagina (seria muito curta)
    if (tagsCfg[tg.slug]?.pagina) continue;    // a pagina propria (ex.: gta6.html) cumpre esse papel
    const n = tg.itens.length;
    const desc = tagsCfg[tg.slug]?.descricao ?? `Notícias, reviews e vídeos sobre ${tg.nome} no BRUBAOGG.`;
    const indexavel = true; // so chegam aqui tags com 2+ materias ou com descricao propria
    escrever(`tag/${tg.slug}.html`, pagina({
      base: '../', titulo: `${tg.nome}: notícias, reviews e vídeos | BRUBAOGG`, descricao: desc, og: null,
      caminho: `tag/${tg.slug}.html`, noindex: !indexavel,
      estruturados: dadosDeColecao(ctx, { caminho: `tag/${tg.slug}.html`, nome: `${tg.nome}: notícias, reviews e vídeos`, descricao: desc, migalhas: [{ nome: 'Início', url: `${DOMINIO}/` }, { nome: 'Tags', url: `${DOMINIO}/tags.html` }, { nome: tg.nome }] }),
      corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('tag')} ${esc(tg.nome)}</h1>
        <p class="lead">${esc(desc)}</p>
        <p class="tag-count">${n} ${n === 1 ? 'matéria' : 'matérias'}${historias(tg)} &middot; <a href="../tags.html">todas as tags</a></p>
      </section>
      <section class="news-grid" data-lista="tag-${tg.slug}">
${tg.itens.slice(0, PASSO_DA_LISTA).map(({ m, cat }, i) => cartao(m, cat, '../', i === 0 && n > 1)).join('\n')}
      </section>
${colecao(ctx, `tag-${tg.slug}`, tg.itens)}
    </main>`,
    }));
    indice.push({ t: tg.nome, u: tagPage(tg.slug), c: 'Tag' });
  }
  if (ctx.temTags) {
    const lista = [...ctx.porTag.values()].filter((x) => temPaginaTag(x.slug)).sort((a, b) => b.itens.length - a.itens.length || a.nome.localeCompare(b.nome, 'pt-BR'));
    escrever('tags.html', pagina({
      base: '', titulo: 'Tags | BRUBAOGG', descricao: 'Todos os jogos e assuntos com matérias no BRUBAOGG.', og: null, caminho: 'tags.html',
      estruturados: dadosDeColecao(ctx, { caminho: 'tags.html', nome: 'Tags', descricao: 'Todos os jogos e assuntos com matérias no BRUBAOGG.', migalhas: [{ nome: 'Início', url: `${DOMINIO}/` }, { nome: 'Tags' }] }),
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
}

// dados estruturados de uma pagina de lista ou indice: CollectionPage + trilha de navegacao (as "migalhas" que o Google mostra no resultado)
// `migalhas` = [{ nome, url }] (url absoluta; a ultima, a propria pagina, pode ficar sem url); `sobre` (opcional) = o assunto (ex.: VideoGameSeries)
export function dadosDeColecao(ctx, { caminho, nome, descricao, migalhas, sobre }) {
  const url = `${DOMINIO}/${urlDe(caminho)}`;
  return [{
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'CollectionPage', '@id': `${url}#pagina`, name: nome, description: descricao, url, inLanguage: 'pt-BR', isPartOf: { '@type': 'WebSite', name: 'BRUBAOGG', url: `${DOMINIO}/` }, publisher: EDITORA, ...(sobre ? { about: sobre } : {}) },
      ctx.trilha(migalhas),
    ],
  }];
}

// ---- paginas da Wiki: wiki/<jogo>.html, uma por jogo de WIKI.jogos (o GTA 6 tem a propria, gta6.html) ----
// E a pagina que responde a "wiki <jogo>" no Google: o nome do jogo e a palavra wiki no titulo, texto proprio, o indice jogo a jogo da serie (historia, review e
// noticias de cada um) e, separados, as historias, os reviews e as noticias da franquia inteira. Ligada a partir de wiki.html, da pagina da tag e de cada materia do jogo.
const ROTULO_NA_WIKI = { series: 'História', reviews: 'Review', noticias: 'Notícia', lancamentos: 'Lançamento', 'gta6-novidades': 'Notícia' };
const QTD_BLOCO_DA_WIKI = 5; // cartoes por bloco: 1 grande + 4 pequenos, como na home
export function construirWiki(ctx) {
  const { icone, cartao, pagina, escrever, temPaginaTag, tagPage, indice } = ctx;
  // mini-busca da wiki.html: o MENU LATERAL em dois niveis. Nivel 1 = as franquias de WIKI.jogos (Resident Evil, GTA...); ao abrir uma, o nivel 2 = os jogos dela (`serie`, na
  // ordem de config.mjs) e, no fim, "Noticias". Cada jogo mostra o que NAO e noticia (hoje a historia; depois reviews, personagens...); "Noticias" junta as noticias da
  // franquia inteira; um jogo ainda sem conteudo aparece mesmo assim, vazio. Cada materia entra uma vez, com `f.jogo` (franquias) e `f.sub` (jogos, ou "noticias") para o filtro.
  const eNoticia = (x) => NOTICIAS.has(x.cat.pasta);
  const daWiki = new Map(), menu = [];
  for (const j of WIKI.jogos) {
    const { serie, todos } = familiaDoJogo(ctx, j);
    if (!todos.length) continue;
    const subs = serie.map((s) => ({ v: s.slug, nome: s.nome, n: new Set(s.itens.filter((x) => !eNoticia(x)).map((x) => x.m.id)).size, ...(s.itens.length && temPaginaTag(s.slug) ? { href: tagPage(s.slug) } : {}) }));
    subs.push({ v: 'noticias', nome: 'Notícias', n: todos.filter(eNoticia).length });
    menu.push({ v: j.tag, nome: j.nome, n: todos.length, href: paginaDaWiki(ctx, j), subs });
    for (const x of todos) {
      const e = daWiki.get(x.m.id) ?? { m: x.m, cat: x.cat, extra: { f: { jogo: [], sub: [] } } };
      if (!e.extra.f.jogo.includes(j.tag)) e.extra.f.jogo.push(j.tag);
      for (const v of eNoticia(x) ? ['noticias'] : serie.filter((s) => s.itens.some((y) => y.m.id === x.m.id)).map((s) => s.slug)) if (!e.extra.f.sub.includes(v)) e.extra.f.sub.push(v);
      daWiki.set(x.m.id, e);
    }
  }
  ctx.buscaDaWiki = dadosDaSecao(ctx, 'wiki', [...daWiki.values()].filter((e) => !e.m.semTexto && !e.m.ficticio).sort((a, b) => b.m.publicado.localeCompare(a.m.publicado)), { menu: { g: 'jogo', titulo: BUSCA_DA_SECAO.wiki.menu.titulo, todos: BUSCA_DA_SECAO.wiki.menu.todos, opcoes: menu } });
  for (const j of WIKI.jogos) {
    if (paginaPropria(ctx, j)) continue; // a pagina propria da franquia (GTA: gta6.html) cumpre esse papel
    const { serie: jogosDaSerieDoJogo, todos } = familiaDoJogo(ctx, j);
    if (!todos.length) continue;
    todos.sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
    const da = (pasta) => todos.filter((x) => (pasta === 'noticias' ? NOTICIAS.has(x.cat.pasta) : x.cat.pasta === pasta)); // "noticias" = as duas categorias de noticia (noticias e gta6-novidades), como no menu
    const caminho = arquivoDaWiki(ctx, j);
    const url = `${DOMINIO}/${urlDe(caminho)}`;
    const titulo = `${j.nome}: wiki com histórias, reviews e notícias`;
    const desc = j.descricao ?? `A wiki de ${j.nome} no BRUBAOGG: a história de cada jogo, os reviews e as notícias do canal, num lugar só.`;

    // indice jogo a jogo: o que o canal tem de cada um (o titulo da materia perde o nome do jogo quando comeca com ele: "Resident Evil 4 Remake: a historia..." -> "A historia...")
    const semNome = (t, nome) => { const r = t.replace(new RegExp(`^${nome.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[:\\-–—]\\s*`, 'i'), ''); return r === t ? t : r.charAt(0).toUpperCase() + r.slice(1); };
    const linhas = jogosDaSerieDoJogo.filter((g) => g.itens.length).map((g) => {
      const item = ({ m, cat }, rotulo = ROTULO_NA_WIKI[cat.pasta] ?? cat.rotulo) => `            <li><span class="wiki-rot">${rotulo}</span> <a href="../${urlDe(`${cat.pasta}/${m.slug}.html`)}">${esc(semNome(m.titulo, g.nome))}</a></li>`;
      const proprios = g.itens.filter((x) => x.cat.pasta === 'series' || x.cat.pasta === 'reviews');
      const outros = g.itens.filter((x) => x.cat.pasta !== 'series' && x.cat.pasta !== 'reviews');
      const itens = [...proprios.map((x) => item(x)), ...(outros.length === 1 ? [item(outros[0])] : outros.length > 1 ? [`            <li><span class="wiki-rot">Notícias</span> <a href="../${tagPage(g.slug)}">${outros.length} matérias</a></li>`] : [])];
      return `        <li class="wiki-jogo">
          <h3 class="wiki-jogo-nome">${temPaginaTag(g.slug) ? `<a href="../${tagPage(g.slug)}">${esc(g.nome)}</a>` : esc(g.nome)}</h3>
          <ul class="wiki-jogo-itens">
${itens.join('\n')}
          </ul>
        </li>`;
    });
    const secaoJogos = linhas.length ? `
      <section class="feed-sec" id="jogos">
        <div class="feed-head">
          <h2 class="section-title">${icone('book-open')} Jogos de ${esc(j.nome)}</h2>
        </div>
        <p class="wiki-aviso">Cada jogo da série com a história, o review e as notícias dele.</p>
        <ul class="wiki-lista">
${linhas.join('\n')}
        </ul>
      </section>` : '';

    // blocos por tipo de conteudo: 1 cartao grande + pequenos, alternando o lado como na home
    const BLOCOS = [
      { pasta: 'series', titulo: `Histórias de ${j.nome}`, id: 'historias', lado: 'esquerda', todas: 'series.html' },
      { pasta: 'reviews', titulo: `Reviews de ${j.nome}`, id: 'reviews', lado: 'direita' },
      { pasta: 'noticias', titulo: `Notícias de ${j.nome}`, id: 'noticias', lado: 'esquerda' },
      { pasta: 'lancamentos', titulo: `Lançamentos de ${j.nome}`, id: 'lancamentos', lado: 'direita' },
    ];
    const secoes = BLOCOS.map((b) => {
      const itens = da(b.pasta).slice(0, QTD_BLOCO_DA_WIKI);
      if (!itens.length) return '';
      const cards = itens.map(({ m, cat }, i) => cartao(m, cat, '../', i === 0 ? 'grande' : 'pequeno'));
      const cat = itens[0].cat;
      return `
      <section class="feed-sec" id="${b.id}">
        <div class="feed-head">
          <h2 class="section-title">${icone(cat.icone)} ${esc(b.titulo)}</h2>${b.todas ? `\n          <a class="feed-all" href="../${b.todas}" aria-label="Ver todas: ${esc(b.titulo)}">Ver todas &rarr;</a>` : ''}
        </div>
${blocoHtml(cards, b.lado)}
      </section>`;
    }).join('');

    const nTipo = (pasta, um, varios) => { const n = da(pasta).length; return n ? ` &middot; ${n} ${n === 1 ? um : varios}` : ''; };
    const corpo = `    <main>
      <section class="cat-hero">
        <a class="back" href="../wiki.html">&larr; Wiki</a>
        <h1>${icone('book-open')} ${esc(j.nome)}</h1>
        <p class="lead">${esc(desc)}</p>
        <p class="tag-count">${todos.length} ${todos.length === 1 ? 'conteúdo' : 'conteúdos'}${nTipo('series', 'história', 'histórias')}${nTipo('reviews', 'review', 'reviews')}${nTipo('noticias', 'notícia', 'notícias')}${temPaginaTag(j.tag) ? ` &middot; <a href="../${tagPage(j.tag)}">todas as matérias de ${esc(j.nome)}</a>` : ''}</p>
      </section>
${secaoJogos}${secoes}
    </main>`;
    escrever(caminho, pagina({
      base: '../', titulo: `${titulo} | BRUBAOGG`, descricao: desc, og: miniatura(todos[0].m.id), corpo, caminho,
      estruturados: dadosDeColecao(ctx, {
        caminho, nome: titulo, descricao: desc, sobre: { '@type': 'VideoGameSeries', name: j.nome },
        migalhas: [{ nome: 'Início', url: `${DOMINIO}/` }, { nome: 'Wiki', url: `${DOMINIO}/wiki.html` }, { nome: j.nome }],
      }),
    }));
    indice.push({ t: `${j.nome} (Wiki)`, u: urlDe(caminho), c: 'Wiki' });
  }
}

// ---- arquivo por mes: links ESTATICOS para todas as materias ----
// O "Ver mais" das listas e JavaScript e o Google nao clica em botao: sem isto, as materias alem das 30 primeiras de cada lista so seriam apontadas pelo sitemap
// (na simulacao de 3 mil materias, 88% ficavam sem nenhum link interno). arquivo.html (todos os meses) fica no rodape de TODA pagina;
// arquivo/AAAA-MM.html lista cada materia do mes, agrupada por categoria. Toda materia fica a 3 cliques da home.
export function construirArquivo(ctx) {
  const { icone, pagina, escrever, trilha } = ctx;
  const todas = [...ctx.listaMaterias].filter(({ m }) => !(m.ficticio || m.semTexto || m.rascunho)).sort((a, b) => b.m.publicado.localeCompare(a.m.publicado));
  ctx.temArquivo = todas.length > 0;
  if (!ctx.temArquivo) return;
  const porMes = new Map();
  for (const x of todas) { const k = mesDe(x.m.publicado); if (!porMes.has(k)) porMes.set(k, []); porMes.get(k).push(x); }
  const meses = [...porMes.keys()].sort().reverse(); // do mais novo para o mais velho
  const nomeDoMes = (k) => new Date(`${k}-15T12:00:00-03:00`).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' }); // "outubro de 2026"
  const soMes = (k) => new Date(`${k}-15T12:00:00-03:00`).toLocaleDateString('pt-BR', { month: 'long', timeZone: 'America/Sao_Paulo' });
  const dia = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
  const inicio = { nome: 'Início', url: `${DOMINIO}/` };

  // pagina com todos os meses, agrupados por ano
  const anos = [...new Set(meses.map((k) => k.slice(0, 4)))];
  escrever('arquivo.html', pagina({
    base: '', titulo: 'Arquivo de matérias | BRUBAOGG', descricao: `Todas as ${todas.length} matérias do BRUBAOGG, mês a mês: notícias, reviews e lançamentos de games.`, og: null, caminho: 'arquivo.html',
    estruturados: [{ '@context': 'https://schema.org', '@graph': [ctx.trilha([inicio, { nome: 'Arquivo' }])] }],
    corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('calendar-days')} Arquivo</h1>
        <p class="lead">Todas as ${todas.length} matérias, mês a mês.</p>
      </section>
${anos.map((ano) => `      <h2 class="section-title">${ano}</h2>
      <ul class="tag-cloud">
${meses.filter((k) => k.startsWith(ano)).map((k) => `        <li><a href="${urlDe(`arquivo/${k}.html`)}">${soMes(k)} <span>${porMes.get(k).length}</span></a></li>`).join('\n')}
      </ul>`).join('\n')}
    </main>`,
  }));

  // uma pagina por mes
  meses.forEach((k, i) => {
    const doMes = porMes.get(k), nome = nomeDoMes(k);
    const grupos = categorias.map((cat) => ({ cat, itens: doMes.filter((x) => x.cat === cat) })).filter((g) => g.itens.length);
    const mais_velho = meses[i + 1], mais_novo = meses[i - 1];
    escrever(`arquivo/${k}.html`, pagina({
      base: '../', titulo: `Matérias de ${nome} | BRUBAOGG`, descricao: `${doMes.length} ${doMes.length === 1 ? 'matéria publicada' : 'matérias publicadas'} em ${nome}: notícias, reviews e lançamentos de games no BRUBAOGG.`, og: null, caminho: `arquivo/${k}.html`,
      estruturados: [{ '@context': 'https://schema.org', '@graph': [ctx.trilha([inicio, { nome: 'Arquivo', url: `${DOMINIO}/arquivo.html` }, { nome }])] }],
      corpo: `    <main>
      <a class="back" href="../arquivo.html">&larr; Arquivo</a>
      <section class="cat-hero">
        <h1>${icone('calendar-days')} ${esc(nome)}</h1>
        <p class="lead">${doMes.length} ${doMes.length === 1 ? 'matéria publicada' : 'matérias publicadas'} neste mês.</p>
      </section>
${grupos.map(({ cat, itens }) => `      <h2 class="section-title">${icone(cat.icone)} ${esc(cat.nome)} <small>(${itens.length})</small></h2>
      <ul class="arquivo-lista">
${itens.map(({ m }) => `        <li><time datetime="${m.publicado}">${dia(m.publicado)}</time> <a href="../${urlDe(`${cat.pasta}/${m.slug}.html`)}">${esc(m.titulo)}</a></li>`).join('\n')}
      </ul>`).join('\n')}
      <nav class="arquivo-nav" aria-label="Outros meses">
        ${mais_velho ? `<a rel="prev" href="${urlDe(`arquivo/${mais_velho}.html`).slice(8)}">&larr; ${esc(nomeDoMes(mais_velho))}</a>` : '<span></span>'}
        ${mais_novo ? `<a rel="next" href="${urlDe(`arquivo/${mais_novo}.html`).slice(8)}">${esc(nomeDoMes(mais_novo))} &rarr;</a>` : '<span></span>'}
      </nav>
    </main>`,
    }));
  });
}

// ---- 404, busca (pagina, listas por mes e atalhos) ----
// Pagina de busca: a pagina 1 (os 30 mais recentes) vem PRONTA no HTML (rapido, sem JavaScript, nada a baixar). O resto e do busca.js:
// "Ver mais" le arquivos por mes (assets/data/lista/AAAA-MM.json) e a busca por texto usa o Pagefind (pasta pagefind/, montada no build).
export function construirFixas(ctx) {
  const { icone, pagina, escrever, indice, cartao } = ctx;

  // pagina 404 do GitHub Pages (servida em qualquer caminho, por isso usa base absoluta '/')
  escrever('404.html', pagina({
    base: '/', titulo: 'Página não encontrada | BRUBAOGG', descricao: 'Esta página não existe ou mudou de endereço. Volte para o início do BRUBAOGG ou use a busca do site.', og: null, noindex: true,
    corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('frown')} Página não encontrada</h1>
        <p class="lead">Esse endereço não existe (ou mudou de lugar). Use a busca acima ou volte para a página inicial.</p>
      </section>
      <div class="links">
        <a class="btn primary" href="/">Ir para a página inicial</a>
        ${ctx.visiveis.has('noticias') ? '<a class="btn" href="/noticias.html">Ver as notícias</a>' : '<a class="btn" href="https://youtube.com/@brubaogg" target="_blank" rel="noopener">Ver o canal no YouTube</a>'}
      </div>
    </main>`,
  }));

  // todas as materias, da mais nova para a mais antiga (empate: pelo endereco, para a ordem nao mudar de uma geracao para outra)
  const endereco = ({ m, cat }) => `${cat.pasta}/${m.slug}.html`;
  const todas = [...ctx.listaMaterias].sort((a, b) => b.m.publicado.localeCompare(a.m.publicado) || endereco(a).localeCompare(endereco(b)));
  const rotulos = categorias.map((c) => c.rotulo).filter((r) => todas.some(({ cat }) => cat.rotulo === r));

  // listas por mes: assets/data/lista/AAAA-MM.json (todas as categorias misturadas) + manifesto com o que existe
  const porMes = new Map();
  for (const x of todas) {
    const k = mesDe(x.m.publicado);
    if (!porMes.has(k)) porMes.set(k, []);
    porMes.get(k).push(itemDaLista(x.m, x.cat));
  }
  const meses = [...porMes.keys()].sort().reverse();
  for (const k of meses) escrever(`assets/data/lista/${k}.json`, JSON.stringify(porMes.get(k)));
  escrever('assets/data/lista/manifesto.json', JSON.stringify({ passo: PASSO_DA_LISTA, categorias: rotulos, meses: meses.map((k) => ({ m: k, n: porMes.get(k).length })) }));

  // colecao do hub do GTA 6 (a pagina gta6.html e escrita a mao e recebe so o botao)
  colecao(ctx, 'hub-gta6', listaDoHub(ctx).slice(1));

  // pagina de resultados da busca
  const abas = ['noticias', 'reviews', 'lancamentos'].filter((a) => ctx.visiveis.has(a));
  const nomeAba = { noticias: 'Notícias', reviews: 'Reviews', lancamentos: 'Lançamentos' };
  const semJs = `${abas.map((a) => `<a href="${a}.html">${nomeAba[a]}</a>`).join(', ')}${ctx.temTags ? `${abas.length ? ' ou ' : ''}<a href="tags.html">as tags</a>` : ''}`;
  escrever('busca.html', pagina({
    base: '', titulo: 'Busca | BRUBAOGG', descricao: 'Busque no site do BRUBAOGG por jogo, notícia, review ou lançamento.', og: null, noindex: true,
    corpo: `    <script>if (/[?&](q|cat|n)=/.test(location.search)) document.documentElement.classList.add('com-busca');</script>
    <main>
      <section class="cat-hero">
        <h1>${icone('search')} Busca</h1>
        <p class="lead" id="busca-titulo">Matérias mais recentes</p>
      </section>
      <div class="busca-filtros" id="busca-filtros" role="group" aria-label="Filtrar por categoria" data-categorias="${esc(rotulos.join('|'))}" hidden></div>
      <p class="busca-atalhos" id="busca-atalhos" hidden></p>
      <p class="busca-status" id="busca-status" role="status" aria-live="polite"></p>
      <section class="news-grid" id="busca-lista" aria-label="Resultados">
${todas.slice(0, PASSO_DA_LISTA).map(({ m, cat }) => cartao(m, cat, '')).join('\n')}
      </section>
${todas.length ? '' : '      <p class="busca-aviso">Ainda não há matérias publicadas. Volte em breve!</p>\n'}      <div class="busca-mais"><button type="button" class="btn" id="busca-mais" data-total="${todas.length}" hidden>Ver mais</button></div>
      <noscript><p class="busca-aviso">A busca por texto precisa do JavaScript ligado. Sem ele, estas são as matérias mais recentes; para ver outras, abra ${semJs || 'o <a href="/">início</a>'}.</p></noscript>
      ${modeloDeIcones(ctx, rotulos)}
    </main>`,
  }));

  // atalhos da busca: tags e paginas fixas (as materias ficam com o Pagefind)
  const comListaGerada = categorias.filter((c) => !c.lista).map((c) => c.pasta); // a pagina fixa de uma categoria so existe depois da primeira materia dela
  const existe = (u) => !comListaGerada.includes(u.replace('.html', '')) || ctx.visiveis.has(u.replace('.html', ''));
  const paginasFixas = paginasFixasNaBusca.filter(([u]) => existe(u)).map(([u, t, d]) => ({ t, u, c: 'Página', d }));
  // as paginas de Wiki vao PRIMEIRO: a busca mostra so 3 atalhos e, entre os que empatam (mesmo numero de palavras no nome), vale a ordem deste arquivo; com as tags na frente,
  // "resident evil" enchia as 3 vagas com tags (Resident Evil, Veronica, 6) e a Wiki ficava de fora (BL-20, UX-12). O atalho de nome igual ao digitado continua em 1o lugar.
  escrever('assets/data/atalhos.json', JSON.stringify([...indice.filter((a) => a.c === 'Wiki'), ...indice.filter((a) => a.c !== 'Wiki'), ...paginasFixas].map((a) => ({ ...a, u: urlDe(a.u) }))));
}
