// Carrega e VALIDA os dados de entrada: playlists.json, tags.json, _conteudo/materias/*.json e o registro de enderecos.
// Regra: erro de estrutura (tipo errado, campo faltando, status desconhecido) para o gerador com uma lista clara de
// "arquivo: o que esta errado e o que fazer"; limite editorial (titulo longo, muitas tags) vira AVISO no fim.
// A materia NAO depende do feed do YouTube: categoria, data e endereco vem do registro (enderecos.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { GTA6, categorias } from './config.mjs';
import { validarMateria } from './contrato.mjs';
import { feedPorId, gravarRegistro, indiceDoDisco, lerRegistro, novoEndereco } from './enderecos.mjs';
import { ErroDeDados, lerJson } from './util.mjs';

// as datas de GTA6 (config.mjs) precisam de HORA e FUSO: "2026-11-19" sem fuso e lido como UTC e a contagem regressiva terminaria 3 horas antes
function validarDatasDoGta6() {
  const formato = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})$/;
  for (const campo of ['alvo', 'preload']) {
    const v = GTA6[campo];
    if (typeof v !== 'string' || !formato.test(v) || Number.isNaN(Date.parse(v))) {
      throw new ErroDeDados(`config.mjs, GTA6.${campo}: "${v}" nao e uma data valida com hora e fuso. Use o formato 2026-11-19T00:00:00-03:00 (o -03:00 e o horario de Brasilia).`);
    }
  }
}

export function carregarDados(ctx) {
  const { site, dados, flags } = ctx;
  const { RASCUNHO, COM_RASCUNHOS, SO_COM_MATERIA } = flags;
  const modoTeste = RASCUNHO || COM_RASCUNHOS || !SO_COM_MATERIA; // previas nao gravam nada de verdade
  fs.mkdirSync(dados, { recursive: true });
  validarDatasDoGta6();

  ctx.playlists = lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json');
  const ft = path.join(site, '_conteudo', 'tags.json');
  ctx.tagsCfg = fs.existsSync(ft) ? lerJson(ft, '_conteudo/tags.json') : {};
  ctx.feed = feedPorId(ctx.playlists);
  ctx.enderecos = lerRegistro(site);
  const temporarios = {}; // enderecos so da previa (rascunhos); nunca vao para o registro

  // 1) le todos os arquivos de materia; status so pode faltar (aprovada) ou ser "rascunho"
  const materias = new Map(); // id do video -> { dados, situacao: 'publicada'|'rascunho', rel }
  for (const arq of fs.readdirSync(dados).filter((x) => x.endsWith('.json')).sort()) {
    const id = arq.slice(0, -5), rel = `_conteudo/materias/${arq}`;
    let m;
    try { m = lerJson(path.join(dados, arq), rel); }
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
    materias.set(id, { dados: m, situacao: m.status === 'rascunho' ? 'rascunho' : 'publicada', rel });
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
