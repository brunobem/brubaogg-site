// Monta as paginas do site em memoria (nada e gravado aqui; quem grava e saida.mjs):
// materias e listas de categoria, paginas de tag, GTA 6 (destaque), feed da home, 404, busca (pagina e listas por mes) e atalhos da busca.
import { AUTOR, DOMINIO, categorias, lorem, paginasFixasNaBusca, resumosLorem } from './config.mjs';
import { cortar, dataLonga, esc, limparTitulo, mesDe, miniatura, slugify } from './util.mjs';

// ---- "Ver mais" das listas ----
// A pagina mostra os 30 primeiros (ja no HTML: rapido, indexavel, funciona sem JavaScript). O resto vai em arquivos de 90 itens
// (assets/data/colecao/<id>/1.json, 2.json...) que o busca.js le a cada clique, 30 por vez. Lista com ate 30 itens nao ganha botao.
export const PASSO_DA_LISTA = 30;
const BLOCO_DA_COLECAO = 90;
// uma entrada de lista no formato dos arquivos de dados (a mesma das listas por mes)
export const itemDaLista = (m, cat) => ({ t: m.titulo, r: m.ficticio || m.semTexto ? '' : m.resumo, u: `${cat.pasta}/${m.slug}.html`, c: cat.rotulo, i: miniatura(m.id), dt: m.publicado });
/** lista: [{ m, cat }] do mais novo para o mais velho. Devolve o HTML do botao + modelo de icones (vazio se a lista cabe na pagina 1). */
function colecao(ctx, id, lista, { gravar = true } = {}) {
  const resto = lista.slice(PASSO_DA_LISTA);
  if (!resto.length) return '';
  if (gravar) for (let k = 0; k * BLOCO_DA_COLECAO < resto.length; k++) ctx.escrever(`assets/data/colecao/${id}/${k + 1}.json`, JSON.stringify(resto.slice(k * BLOCO_DA_COLECAO, (k + 1) * BLOCO_DA_COLECAO).map(({ m, cat }) => itemDaLista(m, cat))));
  return `      <div class="busca-mais"><button type="button" class="btn" data-colecao="${id}" data-total="${resto.length}" hidden>Ver mais</button></div>
      ${modeloDeIcones(ctx)}`;
}
// icones das categorias para os cartoes montados pelo JavaScript (o mesmo desenho do HTML gerado)
function modeloDeIcones(ctx, rotulos = null) {
  return `<template id="busca-icones">${categorias.filter((c) => !rotulos || rotulos.includes(c.rotulo)).map((c) => `<span data-cat="${esc(c.rotulo)}">${ctx.icone(c.icone)}</span>`).join('')}</template>`;
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
const EDITORA = { ...ORGANIZACAO, logo: { '@type': 'ImageObject', url: `${DOMINIO}/assets/img/logo.png` } };

// "relacionadas": ate 3 da MESMA categoria, escolhidas por tags em comum e proximidade de data (a lista vem do mais novo para o mais velho, entao a distancia
// no vetor e a distancia no tempo). Espalha os links internos pela lista, em vez de apontar sempre para as 3 mais novas (88% das materias ficariam sem link).
function relacionadasDe(itens, pos, m) {
  const i = pos.get(m), slugs = new Set(m.tags.map((x) => x.slug)), JANELA = 40;
  return itens.slice(Math.max(0, i - JANELA), i + JANELA + 1).filter((x) => x !== m)
    .map((x) => ({ x, nota: x.tags.filter((g) => slugs.has(g.slug)).length * 100 - Math.abs(pos.get(x) - i) }))
    .sort((a, b) => b.nota - a.nota || pos.get(a.x) - pos.get(b.x))
    .slice(0, 3).map(({ x }) => x).sort((a, b) => pos.get(a) - pos.get(b));
}

export function construirMaterias(ctx) {
  const { flags, videosDe, temArquivo, lerMateria, icone, resolverTags, temPaginaTag, tagPage, pagina, chips, cartao, escrever } = ctx;
  const { RASCUNHO, COM_RASCUNHOS, SO_COM_MATERIA } = flags;

  // pre-passagem: conta as materias de cada tag (inclui a franquia dos jogos com "pai")
  for (const lista of categorias.map((c) => videosDe(c))) {
    for (const v of lista) {
      const m = lerMateria(v.id);
      if (!m || (m.status === 'rascunho' && !RASCUNHO && !COM_RASCUNHOS)) continue;
      for (const x of resolverTags(m.tags)) ctx.contagemTags.set(x.slug, (ctx.contagemTags.get(x.slug) ?? 0) + 1);
    }
  }

  let total = 0, reais = 0, aguardando = 0;
  for (const cat of categorias) {
    const todos = videosDe(cat).sort((a, b) => b.published.localeCompare(a.published));
    // por padrao so entra video que tem materia aprovada; com --com-videos-sem-texto os demais viram pagina so com o player
    const videos = SO_COM_MATERIA && !RASCUNHO ? todos.filter(temArquivo) : todos;
    aguardando += todos.length - videos.length;
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
        tags: resolverTags(real?.tags),
        semTexto,
        short: real?.formato === 'short', // vem do JSON da materia; video sem materia (so nos modos de teste) usa o player horizontal
      });
      if (real) reais++; else if (semTexto) aguardando++;
    });

    for (const m of itens) ctx.publicadas.set(m.id, m);
    ctx.itensPorCategoria[cat.pasta] = { cat, itens };

    // lista de todas as materias: alimenta as listas por mes e a pagina 1 da busca (texto fictício não entra, para não gerar resultados falsos)
    for (const m of itens) ctx.listaMaterias.push({ m, cat });

    // ---- pagina da materia ----
    const pos = new Map(itens.map((x, k) => [x, k]));
    for (const m of itens) {
      const outras = relacionadasDe(itens, pos, m);
      const relacionadas = outras.length ? `
      <section class="related"${m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-ignore'}>
        <h2 class="section-title">${esc(cat.relacionados ?? `Mais ${cat.nome.toLowerCase()}`)}</h2>
        <div class="news-grid">
${outras.map((o) => cartao(o, cat, '../')).join('\n')}
        </div>
      </section>` : '';
      // Short (vertical) com texto: player ao lado do texto. Video horizontal ou sem texto: player centralizado.
      const dividido = m.short && (m.resumo || m.corpo.length);
      const lead = m.resumo ? `<p class="art-lead"${m.ficticio || m.semTexto || m.rascunho ? '' : ' data-pagefind-meta="resumo"'}>${esc(m.resumo)}</p>` : '';
      const video = `<div class="art-video${m.short ? ' is-short' : ''}" id="video"><iframe src="https://www.youtube-nocookie.com/embed/${m.id}" title="${esc(m.titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
      const texto = m.corpo.length ? `<div class="art-body">\n${m.corpo.map((p) => `        <p>${esc(p)}</p>`).join('\n')}\n      </div>` : '';
      const miolo = dividido
        ? `<div class="art-split">\n        <div class="art-text">\n          ${lead}\n          ${texto}\n        </div>\n        ${video}\n      </div>`
        : `<div class="art-flow">\n        ${lead}\n        ${video}\n        ${texto}\n      </div>`;
      // Pagefind (busca): so a materia real e indexada. A categoria e as tags viram filtros; a data, a ordenacao; a miniatura e o resumo, dados
      // para o cartao do resultado. O que e so navegacao (voltar, assinatura, relacionadas, botoes) fica de fora do texto indexado.
      const indexavel = !(m.ficticio || m.semTexto || m.rascunho);
      const pf = indexavel ? ` data-pagefind-body data-pagefind-filter="categoria:${esc(cat.rotulo)}" data-pagefind-meta="image:${miniatura(m.id)}"` : '';
      const ign = indexavel ? ' data-pagefind-ignore' : '';
      const tagsMostradas = [...m.tags].sort((a, b) => Number(temPaginaTag(b.slug)) - Number(temPaginaTag(a.slug))).slice(0, 8);
      // as tags viram FILTROS da busca; o texto da lista fica fora do indice (senao o trecho do resultado mostraria "Resident Evil. Silent Hill.")
      const corpo = `    <main class="article${dividido ? ' has-split' : ''}"${pf}>
      ${(cat.lista || ctx.visiveis.has(cat.pasta)) ? `<a class="back"${ign} href="../${cat.lista ?? `${cat.pasta}.html`}">&larr; ${esc(cat.nomeCurto ?? cat.nome)}</a>` : `<a class="back"${ign} href="../index.html">&larr; Início</a>`}
      <p class="art-meta"><span class="tag"${ign}>${icone(cat.icone)} ${esc(cat.rotulo)}</span> <time${indexavel ? ' data-pagefind-sort="data[datetime]" data-pagefind-meta="data[datetime]" data-pagefind-ignore' : ''} datetime="${m.publicado}">${dataLonga(m.publicado)}</time> <span class="byline"${ign}><span class="avatar" aria-hidden="true">C</span>Por <b>${AUTOR}</b> <small>IA</small></span></p>
      <h1 class="art-title">${esc(m.titulo)}</h1>
      ${tagsMostradas.length ? `<ul class="tag-list"${ign} aria-label="Tags">${tagsMostradas.map((x) => temPaginaTag(x.slug) ? `<li><a${indexavel ? ` data-pagefind-filter="tag:${esc(x.nome)}"` : ''} href="../${tagPage(x.slug)}">${icone('tag')} ${esc(x.nome)}</a></li>` : `<li><span${indexavel ? ` data-pagefind-filter="tag:${esc(x.nome)}"` : ''}>${icone('tag')} ${esc(x.nome)}</span></li>`).join('')}</ul>` : ''}
      ${dividido ? `<a class="ir-video"${ign} href="#video">&darr; Ir para o vídeo</a>` : ''}
      ${miolo}
      <div class="links"${ign}>
        <a class="btn primary" href="https://www.youtube.com/watch?v=${m.id}" target="_blank" rel="noopener">Assistir no YouTube</a>
        <a class="btn" href="https://youtube.com/@brubaogg" target="_blank" rel="noopener">Ver o canal</a>
      </div>
${relacionadas}
    </main>`;
      // dados estruturados (so para materia de verdade): artigo + video + trilha. Aparecem no Google como resultado de artigo e de video.
      const url = `${DOMINIO}/${cat.pasta}/${m.slug}.html`;
      const comLista = cat.lista || ctx.visiveis.has(cat.pasta);
      const estruturados = indexavel ? [{
        '@context': 'https://schema.org',
        '@graph': [
          { '@type': 'Article', '@id': `${url}#artigo`, headline: cortar(m.titulo, 110), description: m.resumo, image: [miniatura(m.id)], datePublished: m.publicado, inLanguage: 'pt-BR', mainEntityOfPage: url, articleSection: cat.rotulo, ...(m.tags.length ? { keywords: m.tags.map((x) => x.nome).join(', ') } : {}), isAccessibleForFree: true, author: ORGANIZACAO, publisher: EDITORA, video: { '@id': `${url}#video` } },
          { '@type': 'VideoObject', '@id': `${url}#video`, name: m.titulo, description: m.resumo || m.titulo, thumbnailUrl: [miniatura(m.id)], uploadDate: m.publicado, embedUrl: `https://www.youtube-nocookie.com/embed/${m.id}`, contentUrl: `https://www.youtube.com/watch?v=${m.id}`, inLanguage: 'pt-BR', publisher: EDITORA },
          ctx.trilha([{ nome: 'Início', url: `${DOMINIO}/` }, ...(comLista ? [{ nome: cat.nomeCurto ?? cat.nome, url: `${DOMINIO}/${cat.lista ?? `${cat.pasta}.html`}` }] : []), { nome: m.titulo }]),
        ],
      }] : [];
      escrever(`${cat.pasta}/${m.slug}.html`, pagina({
        base: '../', titulo: `${m.titulo} | BRUBAOGG`, descricao: m.resumo || `Assista: ${m.titulo}. Vídeo do canal BRUBAOGG.`, og: miniatura(m.id), corpo, caminho: `${cat.pasta}/${m.slug}.html`,
        noindex: m.ficticio || m.semTexto || m.rascunho, // exemplo, so video ou rascunho: fora do Google
        tipo: indexavel ? 'article' : 'website', publicado: m.publicado, estruturados,
      }));
      total++;
    }

    // ---- lista da categoria (so quando a aba esta visivel) ----
    if (!cat.lista && ctx.visiveis.has(cat.pasta)) {
      const lista = `    <main>
      <section class="cat-hero">
        <h1>${icone(cat.icone)} ${esc(cat.nome)}</h1>
        <p class="lead">${esc(cat.desc)}</p>
        <ul class="chips">
${chips(`${cat.pasta}.html`)}
        </ul>
      </section>

      <section class="news-grid" data-lista="cat-${cat.pasta}">
${itens.slice(0, PASSO_DA_LISTA).map((m, i) => cartao(m, cat, '', i === 0)).join('\n')}
      </section>
${colecao(ctx, `cat-${cat.pasta}`, itens.map((m) => ({ m, cat })))}
      <div class="links">
        <a class="btn primary" href="https://www.youtube.com/playlist?list=${cat.playlist}" target="_blank" rel="noopener">Ver playlist completa no YouTube</a>
        <a class="btn" href="https://discord.gg/tQkkXMqAnU" target="_blank" rel="noopener">Entrar no Discord</a>
      </div>
    </main>`;
      escrever(`${cat.pasta}.html`, pagina({
        base: '', titulo: `${cat.nome} | BRUBAOGG`, descricao: cat.meta ?? cat.desc, og: null, corpo: lista, caminho: `${cat.pasta}.html`,
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
  for (const e of Object.values(ctx.enderecos)) {
    const cat = categorias.find((c) => c.pasta === e.categoria);
    if (!cat) continue;
    let destino, de;
    if (e.retirada) {
      destino = ctx.visiveis.has(cat.pasta) || cat.lista ? (cat.lista ?? `${cat.pasta}.html`) : 'index.html';
      de = [e.slug, ...(e.antigos ?? [])];
    } else {
      destino = `${cat.pasta}/${e.slug}.html`;
      if (!geradas.has(destino)) continue; // a pagina nao sera gerada (o aviso de removidas cobre esse caso)
      de = e.antigos ?? [];
    }
    const alvo = itens.get(destino);
    const dados = alvo ? { titulo: alvo.titulo, descricao: alvo.resumo, imagem: miniatura(alvo.id) } : { titulo: `${cat.nome} | BRUBAOGG` };
    for (const velho of de) escrever(`${cat.pasta}/${velho}.html`, redirecionamento({ para: destino, ...dados }));
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
  const href = `${cat.pasta}/${d.slug}.html`;
  const player = `<div class="art-video${d.short ? ' is-short' : ''}"><iframe src="https://www.youtube-nocookie.com/embed/${d.id}" title="${esc(d.titulo)}" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div>`;
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
  return `      <section class="gta-news" aria-labelledby="gta-novidades">
        <h2 class="section-title" id="gta-novidades">${icone(catGta.icone)} Últimas novidades de GTA 6</h2>
        ${destaque}
${outros.length ? `        <h3 class="gd-mais">Mais novidades</h3>
        <div class="news-grid" data-lista="hub-gta6">
${outros.slice(0, PASSO_DA_LISTA).map(({ m, cat: c }) => cartao(m, c, '')).join('\n')}
        </div>
${colecao(ctx, 'hub-gta6', outros, { gravar: false })}` : ''}
        <p class="gd-todas"><a class="btn" href="https://www.youtube.com/playlist?list=${catGta.playlist}" target="_blank" rel="noopener">Ver a playlist completa no YouTube</a></p>
      </section>`;
}

// feed da home: ultimos videos por categoria (abre a materia quando existe, senao o YouTube)
export function feedHtml(ctx) {
  const { icone, cartao, videosDe } = ctx;
  const secoes = [
    { cat: categorias[0], titulo: 'Últimas notícias', qtd: 7, destaque: true },
    { cat: categorias[1], titulo: 'Últimos reviews', qtd: 3 },
    { cat: categorias[2], titulo: 'Lançamentos', qtd: 3 },
  ];
  return secoes.map(({ cat, titulo, qtd, destaque }) => {
    const recentes = videosDe(cat).sort((a, b) => b.published.localeCompare(a.published)).filter((v) => ctx.publicadas.has(v.id)).slice(0, qtd);
    if (!recentes.length) return '';
    const cards = recentes.map((v, i) => {
      const m = ctx.publicadas.get(v.id);
      return cartao(m, cat, '', destaque && i === 0);
    }).join('\n');
    const interna = ctx.visiveis.has(cat.pasta);
    const todas = interna ? `${cat.pasta}.html` : `https://www.youtube.com/playlist?list=${cat.playlist}`;
    return `      <section class="feed-sec">
        <div class="feed-head">
          <h2 class="section-title">${icone(cat.icone)} ${titulo}</h2>
          <a class="feed-all" href="${todas}"${interna ? '' : ' target="_blank" rel="noopener"'}>Ver todas${interna ? '' : ' no YouTube'} &rarr;</a>
        </div>
        <div class="news-grid">
${cards}
        </div>
      </section>`;
  }).join('\n');
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
      corpo: `    <main>
      <section class="cat-hero">
        <h1>${icone('tag')} ${esc(tg.nome)}</h1>
        <p class="lead">${esc(desc)}</p>
        <p class="tag-count">${n} ${n === 1 ? 'matéria' : 'matérias'} &middot; <a href="../tags.html">todas as tags</a></p>
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
${meses.filter((k) => k.startsWith(ano)).map((k) => `        <li><a href="arquivo/${k}.html">${soMes(k)} <span>${porMes.get(k).length}</span></a></li>`).join('\n')}
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
${itens.map(({ m }) => `        <li><time datetime="${m.publicado}">${dia(m.publicado)}</time> <a href="../${cat.pasta}/${m.slug}.html">${esc(m.titulo)}</a></li>`).join('\n')}
      </ul>`).join('\n')}
      <nav class="arquivo-nav" aria-label="Outros meses">
        ${mais_velho ? `<a rel="prev" href="${mais_velho}.html">&larr; ${esc(nomeDoMes(mais_velho))}</a>` : '<span></span>'}
        ${mais_novo ? `<a rel="next" href="${mais_novo}.html">${esc(nomeDoMes(mais_novo))} &rarr;</a>` : '<span></span>'}
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
        <a class="btn primary" href="/index.html">Ir para a página inicial</a>
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
      <noscript><p class="busca-aviso">A busca por texto precisa do JavaScript ligado. Sem ele, estas são as matérias mais recentes; para ver outras, abra ${semJs || 'o <a href="index.html">início</a>'}.</p></noscript>
      ${modeloDeIcones(ctx, rotulos)}
    </main>`,
  }));

  // atalhos da busca: tags e paginas fixas (as materias ficam com o Pagefind)
  const existe = (u) => !['lancamentos', 'reviews', 'noticias'].includes(u.replace('.html', '')) || ctx.visiveis.has(u.replace('.html', ''));
  const paginasFixas = paginasFixasNaBusca.filter(([u]) => existe(u)).map(([u, t, d]) => ({ t, u, c: 'Página', d }));
  escrever('assets/data/atalhos.json', JSON.stringify([...indice, ...paginasFixas]));
}
