// Carrega e VALIDA os dados de entrada: playlists.json, tags.json, _conteudo/materias/<tipo>/<ID>/<ID>.json e o registro de enderecos.
// Regra: erro de estrutura (tipo errado, campo faltando, status desconhecido) para o gerador com uma lista clara de
// "arquivo: o que esta errado e o que fazer"; limite editorial (titulo longo, muitas tags) vira AVISO no fim.
// A materia NAO depende do feed do YouTube: categoria, data e endereco vem do registro (enderecos.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { GTA6, categorias } from './config.mjs';
import { validarAssuntos, validarMateria, validarWiki } from './contrato.mjs';
import { caminhoAntigo, feedPorId, gravarRegistro, indiceDoDisco, lerRegistro, novoEndereco } from './enderecos.mjs';
import { fonteDaImagem, prepararImagens } from './imagens.mjs';
import { listarConteudos, tipoDaCategoria } from './pastas.mjs';
import { ErroDeDados, cartoesPropios, paginasComHtml, duracoesDosVideos, imagensPropias, lerJson, miniatura, miniaturasGrandes } from './util.mjs';

// as datas de GTA6 (config.mjs) precisam de HORA e FUSO: "2026-11-19" sem fuso e lido como UTC e a contagem regressiva terminaria 3 horas antes
function validarDatasDoGta6() {
  const formato = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  for (const campo of ['alvo', 'preload']) {
    const v = GTA6[campo];
    if (typeof v !== 'string' || !formato.test(v) || Number.isNaN(Date.parse(v))) {
      throw new ErroDeDados(`config.mjs, GTA6.${campo}: "${v}" nao e uma data valida com hora e fuso. Use o formato 2026-11-19T00:00:00-03:00 (o -03:00 e o horario de Brasilia).`);
    }
  }
  // textos do estado "lancado": sem eles a pagina do dia do lancamento ficaria com campo vazio
  for (const campo of ['kicker', 'titulo', 'texto', 'botao']) {
    const v = GTA6.lancado?.[campo];
    if (typeof v !== 'string' || !v.trim()) throw new ErroDeDados(`config.mjs, GTA6.lancado.${campo}: falta o texto do estado "lancado" (o que aparece no lugar da contagem a partir de ${GTA6.alvo}).`);
  }
}

export function carregarDados(ctx) {
  const { site, dados, flags } = ctx;
  const { RASCUNHO, COM_RASCUNHOS, SO_COM_MATERIA } = flags;
  const modoTeste = RASCUNHO || COM_RASCUNHOS || !SO_COM_MATERIA; // previas nao gravam nada de verdade
  fs.mkdirSync(dados, { recursive: true });
  validarDatasDoGta6();

  ctx.playlists = lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json');
  const fPlayers = path.join(site, 'assets', 'data', 'players.json');
  ctx.players = fs.existsSync(fPlayers) ? lerJson(fPlayers, 'assets/data/players.json') : {}; // videos das playlists de Cortes e Lives (se faltar, a pagina fica so com os players)
  const ft = path.join(site, '_conteudo', 'tags.json');
  ctx.tagsCfg = fs.existsSync(ft) ? lerJson(ft, '_conteudo/tags.json') : {};
  // quais videos tem miniatura grande (BL-05; gerado por `npm run miniaturas`): faltando o arquivo, tudo fica com a miniatura pequena
  const fg = path.join(site, '_conteudo', 'miniaturas-grandes.json');
  miniaturasGrandes.clear();
  if (fs.existsSync(fg)) for (const [id, tem] of Object.entries(lerJson(fg, '_conteudo/miniaturas-grandes.json').videos ?? {})) miniaturasGrandes.set(id, tem === true);
  // duracao dos videos para o `duration` do VideoObject (BL-08; gerado por `npm run duracoes`): faltando o arquivo ou o video, o campo some
  const fd = path.join(site, '_conteudo', 'duracoes-videos.json');
  duracoesDosVideos.clear();
  if (fs.existsSync(fd)) for (const [id, seg] of Object.entries(lerJson(fd, '_conteudo/duracoes-videos.json').videos ?? {})) duracoesDosVideos.set(id, seg);
  // paginas que ja existiam com .html (congeladas): so elas mantem o .html no endereco; toda pagina nova nasce sem (util.mjs, urlDe)
  const faa = path.join(site, '_conteudo', 'paginas-com-html.json');
  paginasComHtml.clear();
  if (fs.existsSync(faa)) for (const r of lerJson(faa, '_conteudo/paginas-com-html.json')) paginasComHtml.add(r);
  else ctx.problemas.push('_conteudo/paginas-com-html.json: arquivo faltando. Sem ele as paginas de termos, privacidade e MCP perderiam o .html e o endereco delas (cadastrado em servicos externos) mudaria. Restaure o arquivo (ele esta no Git).');
  ctx.feed = feedPorId(ctx.playlists);
  ctx.enderecos = lerRegistro(site);
  const temporarios = {}; // enderecos so da previa (rascunhos); nunca vao para o registro

  // 1) le todos os arquivos de materia (_conteudo/materias/<tipo>/<ID>/<ID>.json, pastas.mjs); status so pode faltar (aprovada) ou ser "rascunho"
  const materias = new Map(); // id do video -> { dados, situacao: 'publicada'|'rascunho', rel }
  const { itens: conteudos, foraDoLugar } = listarConteudos(site);
  for (const rel of foraDoLugar) ctx.problemas.push(`${rel}: arquivo fora do lugar. O certo e _conteudo/materias/<tipo>/<ID>/<ID>.json (tipo: noticias, reviews, lancamentos ou wiki; a pasta e o JSON tem o mesmo nome).`);
  const idsVistos = new Map();
  for (const c of conteudos) { if (idsVistos.has(c.id)) ctx.problemas.push(`${c.rel}: o nome "${c.id}" tambem existe em ${idsVistos.get(c.id)}. Cada materia tem uma pasta so; apague uma das duas.`); idsVistos.set(c.id, c.rel); }
  // imagens da pasta de cada materia (thumb.jpg e img-1_<site da fonte>.jpg...): redimensiona o que mudou e guarda em ctx.imagens (imagens.mjs)
  const imagens = prepararImagens(site, conteudos);
  ctx.problemas.push(...imagens.problemas);
  ctx.avisos.push(...imagens.avisos);
  ctx.imagens = imagens.porId;
  cartoesPropios.clear();
  for (const [id, reg] of imagens.porId) if (reg.cartao || reg.pequeno) {
    // horizontal (cartoes grandes, listas, compartilhamento) e vertical (cartoes pequenos): escolhidas pela orientacao de cada arquivo (imagens.mjs); pode faltar uma das duas
    const h = reg.cartao ? fonteDaImagem(id, reg.cartao, '/', 640) : null, g = reg.cartao ? fonteDaImagem(id, reg.cartao, '/', 1200) : null;
    cartoesPropios.set(id, {
      ...(h ? { src: h.src, srcset: h.srcset, w: h.w, h: h.h, grande: g.src, alt: reg.cartao.alt || '' } : {}),
      p: reg.pequeno ? { ...fonteDaImagem(id, reg.pequeno, '/', 480), alt: reg.pequeno.alt || '' } : null,
    });
  }
  for (const c of conteudos.filter((x) => x.tipo !== 'wiki')) {
    const { id, rel } = c;
    let m;
    try { m = lerJson(c.arquivo, rel); }
    catch (e) {
      if (!(e instanceof ErroDeDados)) throw e;
      const reg = ctx.enderecos[id];
      if (reg && !reg.retirada) ctx.problemas.push(`${e.message} Essa materia ja esta publicada (${reg.categoria}/${reg.slug}.html) e a pagina nao pode sumir por um arquivo quebrado. Se a outra sessao ainda esta gravando, espere e rode de novo.`);
      else ctx.avisos.push(`${e.message} Arquivo ignorado por enquanto (se a outra sessao ainda esta gravando, rode de novo depois).`);
      continue;
    }
    if (m === null || typeof m !== 'object' || Array.isArray(m)) { ctx.problemas.push(`${rel}: o conteudo deve ser um objeto JSON { ... }.`); continue; }
    if (m.status != null && m.status !== 'rascunho') {
      ctx.problemas.push(`${rel}: "status" tem o valor ${JSON.stringify(m.status)}. Use "rascunho" ou apague o campo (sem o campo = aprovada). Qualquer outro valor publicaria o texto por engano.`);
      continue;
    }
    // a pasta de tipo tem de combinar com a categoria da materia (o registro de enderecos manda; sem registro, o campo "categoria" do arquivo)
    const categoriaDaMateria = ctx.enderecos[id]?.categoria ?? m.categoria;
    if (categoriaDaMateria && tipoDaCategoria(categoriaDaMateria) !== c.tipo) { ctx.problemas.push(`${rel}: a materia e da categoria "${categoriaDaMateria}" e deveria estar em _conteudo/materias/${tipoDaCategoria(categoriaDaMateria)}/${id}/, mas esta em ${c.tipo}/. Mova a pasta.`); continue; }
    materias.set(id, { dados: m, situacao: m.status === 'rascunho' ? 'rascunho' : 'publicada', rel });
  }
  // 1b) conteudo da Wiki (_conteudo/materias/wiki/<nome>/<nome>.json): pode ser so texto, sem video. Cada arquivo vira uma "materia" da categoria series (origem "wiki"); o nome do arquivo e o id.
  //     As regras proprias dele estao em contrato.mjs (validarWiki); as de texto (resumo, corpo, titulo...) sao as de sempre e rodam no passo 2.
  {
    for (const c of conteudos.filter((x) => x.tipo === 'wiki')) {
      const { id, rel } = c;
      if (materias.has(id)) { ctx.problemas.push(`${rel}: o nome "${id}" ja existe em outra pasta de _conteudo/materias. Apague uma das duas.`); continue; }
      let e;
      try { e = lerJson(c.arquivo, rel); }
      catch (err) {
        if (!(err instanceof ErroDeDados)) throw err;
        const reg = ctx.enderecos[id];
        if (reg && !reg.retirada) ctx.problemas.push(`${err.message} Esse conteudo ja esta publicado (${reg.categoria}/${reg.slug}.html) e a pagina nao pode sumir por um arquivo quebrado.`);
        else ctx.avisos.push(`${err.message} Arquivo ignorado por enquanto.`);
        continue;
      }
      if (e === null || typeof e !== 'object' || Array.isArray(e)) { ctx.problemas.push(`${rel}: o conteudo deve ser um objeto JSON { ... }.`); continue; }
      if (e.status != null && e.status !== 'rascunho') { ctx.problemas.push(`${rel}: "status" tem o valor ${JSON.stringify(e.status)}. Use "rascunho" ou apague o campo (sem o campo = publicado).`); continue; }
      const r = validarWiki(e, { id, rel, tagsCfg: ctx.tagsCfg });
      ctx.problemas.push(...r.problemas);
      ctx.avisos.push(...r.avisos);
      // imagem do cartao e da previa: a do video (se o id do arquivo nao e o proprio video), a indicada em "imagem" ou a capa padrao da Wiki
      if (r.m.video !== id) imagensPropias.set(id, r.m.video ? miniatura(r.m.video) : r.m.imagem ?? '/assets/img/wiki-capa.svg');
      materias.set(id, { dados: r.m, situacao: e.status === 'rascunho' ? 'rascunho' : 'publicada', rel, origem: 'wiki' });
    }
  }
  ctx.materias = materias;
  ctx.lerMateria = (id) => materias.get(id)?.dados ?? null;
  // publica so se o arquivo existe e NAO esta marcado como rascunho (a previa com --com-rascunhos inclui os rascunhos)
  ctx.temArquivo = (v) => { const m = materias.get(v.id); return !!m && (COM_RASCUNHOS || m.situacao !== 'rascunho'); };

  // 2) valida o que vai ser usado (aprovadas; rascunhos so nos modos de previa) e garante o endereco de cada uma
  const ativa = (mm) => mm.situacao === 'publicada' || RASCUNHO || COM_RASCUNHOS;
  let indiceDisco = null; // paginas que ja estao no ar (so lido se alguma materia ainda nao tiver endereco registrado)
  let novas = 0;
  for (const [id, mm] of materias) {
    if (!ativa(mm)) continue;
    const r = validarMateria(mm.dados, { id, rel: mm.rel, situacao: mm.situacao });
    ctx.problemas.push(...r.problemas);
    ctx.avisos.push(...r.avisos);
    if (r.problemas.length) continue;
    const reg = ctx.enderecos[id];
    if (reg?.retirada) { ctx.problemas.push(`${mm.rel}: essa materia foi RETIRADA do ar em ${reg.retirada}, mas o arquivo voltou. Apague o arquivo, ou tire "retirada" de _conteudo/enderecos.json para republicar.`); continue; }
    if (reg) {
      if (mm.dados.categoria != null && mm.dados.categoria !== reg.categoria) ctx.avisos.push(`${mm.rel}: "categoria" (${mm.dados.categoria}) discorda do endereco ja registrado (${reg.categoria}); vale o registro. Para mudar de categoria, apague a entrada em _conteudo/enderecos.json (o endereco antigo deixa de existir).`);
      mm.endereco = reg;
      continue;
    }
    try {
      const persiste = !modoTeste && mm.situacao === 'publicada';
      if (persiste) indiceDisco ??= indiceDoDisco(site);
      const { endereco, avisos } = novoEndereco({ id, m: mm.dados, rel: mm.rel, registro: { ...ctx.enderecos, ...temporarios }, feed: ctx.feed, doDisco: persiste ? indiceDisco : null });
      ctx.avisos.push(...avisos);
      if (persiste) { ctx.enderecos[id] = endereco; novas++; } else temporarios[id] = endereco;
      mm.endereco = endereco;
    } catch (e) {
      if (e instanceof ErroDeDados) ctx.problemas.push(e.message); else throw e;
    }
  }
  // assuntos: materias do mesmo "assunto" (2 ou mais) continuam cada uma com a propria pagina; _conteudo/assuntos.json e opcional (so o redirecionamento do endereco do assunto o usa)
  const fa = path.join(site, '_conteudo', 'assuntos.json');
  ctx.assuntos = fs.existsSync(fa) ? lerJson(fa, '_conteudo/assuntos.json') : {};
  const gruposDeAssunto = new Map();
  for (const [id, mm] of materias) {
    if (!mm.endereco || typeof mm.dados.assunto !== 'string') continue;
    (gruposDeAssunto.get(mm.dados.assunto) ?? gruposDeAssunto.set(mm.dados.assunto, []).get(mm.dados.assunto)).push({ id, rel: mm.rel, dados: mm.dados, categoria: mm.endereco.categoria, publicado: mm.endereco.publicado });
  }
  const ocupados = new Set(Object.values({ ...ctx.enderecos, ...temporarios }).flatMap((e) => [e.slug, ...(e.antigos ?? [])].map((s) => caminhoAntigo(e, s))));
  const va = validarAssuntos(ctx.assuntos, gruposDeAssunto, ocupados);
  ctx.problemas.push(...va.problemas); ctx.avisos.push(...va.avisos);
  ctx.categoriaDoAssunto = va.categoriaDe; // chave -> pasta da pagina do assunto

  // dois enderecos iguais na mesma categoria (edicao manual do registro)
  const vistos = new Map();
  for (const [id, e] of Object.entries({ ...ctx.enderecos, ...temporarios })) {
    if (e.retirada) continue;
    const k = `${e.categoria}/${e.slug}`;
    if (vistos.has(k)) ctx.problemas.push(`_conteudo/enderecos.json: as materias ${vistos.get(k)} e ${id} tem o mesmo endereco (${k}.html).`);
    vistos.set(k, id);
  }

  if (ctx.problemas.length) {
    throw new ErroDeDados(`O gerador parou: ${ctx.problemas.length} problema(s) nos dados.\n${ctx.problemas.map((p) => `  - ${p}`).join('\n')}`);
  }
  if (novas && gravarRegistro(site, ctx.enderecos)) ctx.notas.push(`${novas} endereco(s) novo(s) registrado(s) em _conteudo/enderecos.json (lembre de levar esse arquivo no commit)`);

  // 3) lista de "videos" por categoria: as materias (com endereco proprio) + os videos do feed que ainda NAO tem materia
  ctx.ativas = [...materias].filter(([, mm]) => mm.endereco).map(([id, mm]) => ({ id, mm, e: mm.endereco }));
  const comMateria = new Set(ctx.ativas.map((a) => a.id));
  ctx.videosDe = (c) => [
    ...ctx.ativas.filter((a) => a.e.categoria === c.pasta).map((a) => ({ id: a.id, title: a.mm.dados.titulo, published: a.e.publicado, slug: a.e.slug })),
    ...(ctx.playlists[c.playlist] ?? []).filter((v) => !comMateria.has(v.id)),
  ];
  // uma aba (Noticias, Reviews, Lancamentos...) so aparece depois da primeira materia dela
  ctx.visiveis = new Set(categorias.filter((c) => RASCUNHO || ctx.videosDe(c).some(ctx.temArquivo)).map((c) => c.pasta));
}
