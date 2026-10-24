// O que falta publicar: rascunhos aguardando aprovacao (de videos recentes E antigos) e os videos recentes que ainda nao tem texto.
// Uso: npm run pendentes              tudo
//      npm run pendentes -- --rascunhos   so os rascunhos (a lista para revisar e aprovar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorias } from './gerador/config.mjs';
import { dataDePublicacao, validarMateria, validarWiki } from './gerador/contrato.mjs';
import { listarConteudos } from './gerador/pastas.mjs';
import { ErroDeDados, lerJson } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const soRascunhos = process.argv.includes('--rascunhos');
const playlists = lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json');
const noFeed = new Map();
for (const c of categorias) for (const v of playlists[c.playlist] ?? []) noFeed.set(v.id, { cat: c.pasta, data: v.published });

// le todos os arquivos de materia (_conteudo/materias/<tipo>/<ID>/<ID>.json); o conteudo da Wiki (tipo wiki) conta como "com texto" para os videos do feed e nao passa por aprovar
// (rascunho = "status": "rascunho" no proprio arquivo)
const arquivos = [];
const { itens: conteudos, foraDoLugar } = listarConteudos(site);
for (const rel of foraDoLugar) console.log(`ATENCAO: ${rel} esta fora do lugar (o certo: _conteudo/materias/<tipo>/<ID>/<ID>.json); o gerador para por causa dele.`);
for (const c of conteudos) {
  const wiki = c.tipo === 'wiki', extra = wiki ? { wiki: true } : {};
  try { arquivos.push({ id: c.id, rel: c.rel, ...extra, m: lerJson(c.arquivo, c.rel) }); }
  catch (e) { if (e instanceof ErroDeDados) arquivos.push({ id: c.id, rel: c.rel, ...extra, erro: e.message }); else throw e; }
}
const estado = (a) => (a.erro ? 'json invalido' : a.m.status == null ? 'publicada' : a.m.status === 'rascunho' ? 'rascunho' : 'json invalido');

// ---- 1) rascunhos (inclui os de videos antigos, que nao aparecem em nenhuma playlist do feed) ----
const rascunhos = arquivos.filter((a) => !a.wiki && estado(a) === 'rascunho').map((a) => {
  const feed = noFeed.get(a.id);
  const cat = feed?.cat ?? a.m.categoria ?? '?';
  const data = feed?.data ?? dataDePublicacao(a.m.publicado)?.toISOString() ?? '';
  const { problemas, avisos } = validarMateria({ ...a.m, formato: ['short', 'horizontal'].includes(a.m.formato) ? a.m.formato : 'horizontal' }, { id: a.id, rel: a.rel, situacao: 'publicada' });
  const palavras = (Array.isArray(a.m.corpo) ? a.m.corpo.join(' ') : '').split(/\s+/).filter(Boolean).length;
  return { id: a.id, cat, data, titulo: a.m.titulo ?? '(sem titulo)', palavras, problemas: problemas.map((p) => p.replace(`${a.rel}: `, '')), avisos: avisos.map((p) => p.replace(`${a.rel}: `, '')), semFormato: !['short', 'horizontal'].includes(a.m.formato), antigo: !feed };
}).sort((x, y) => y.data.localeCompare(x.data));
const prontos = rascunhos.filter((r) => !r.problemas.length);
console.log(`\nRASCUNHOS aguardando aprovacao: ${rascunhos.length} (${prontos.length} prontos, ${rascunhos.length - prontos.length} com pendencia; ${rascunhos.filter((r) => r.antigo).length} sao de videos antigos)`);
for (const r of rascunhos) {
  console.log(`  [${r.problemas.length ? 'pendencia' : 'pronto   '}] ${r.id}  ${r.data.slice(0, 10)}  ${r.cat.padEnd(14)} ${String(r.palavras).padStart(4)} palavras${r.antigo ? '  (video antigo)' : ''}${r.semFormato ? '  (sem formato)' : ''}\n      ${r.titulo}`);
  for (const p of r.problemas) console.log(`      - ${p}`);
  for (const p of r.avisos) console.log(`      ~ aviso (nao impede): ${p}`); // ex.: nome do canal escrito com til
}
for (const a of arquivos.filter((x) => estado(x) === 'json invalido')) console.log(`  !! ARQUIVO ILEGIVEL OU COM STATUS INVALIDO: ${a.rel}${a.erro ? `\n      ${a.erro}` : ''}`);
if (rascunhos.length) console.log('\nRevisar e aprovar: npm run aprovar -- <ID>   |   so ver o que seria aprovado em lote: npm run aprovar -- --todos');

// ---- 1b) rascunhos da Wiki: nao passam por "aprovar" (publicar = apagar a linha "status" do arquivo) ----
const rascunhosWiki = arquivos.filter((a) => a.wiki && estado(a) === 'rascunho');
if (rascunhosWiki.length) {
  const fTags = path.join(site, '_conteudo', 'tags.json');
  const tagsCfg = fs.existsSync(fTags) ? lerJson(fTags, '_conteudo/tags.json') : {};
  console.log(`\nRASCUNHOS da Wiki (_conteudo/materias/wiki): ${rascunhosWiki.length}`);
  for (const a of rascunhosWiki) {
    const w = validarWiki(a.m, { id: a.id, rel: a.rel, tagsCfg });
    const problemas = [...w.problemas, ...validarMateria(w.m, { id: a.id, rel: a.rel, situacao: 'publicada' }).problemas].map((p) => p.replace(`${a.rel}: `, ''));
    const palavras = (Array.isArray(a.m.corpo) ? a.m.corpo.join(' ') : '').split(/\s+/).filter(Boolean).length;
    console.log(`  [${problemas.length ? 'pendencia' : 'pronto   '}] ${a.id}  ${String(a.m.jogo ?? '?').padEnd(24)} ${String(a.m.tipo ?? 'historia').padEnd(11)} ${String(palavras).padStart(4)} palavras  ${a.m.video ? 'com video' : 'so texto'}  ${a.m.titulo ?? '(sem titulo)'}`);
    for (const p of problemas) console.log(`      - ${p}`);
  }
  console.log('\nPara publicar: apague a linha "status" do arquivo e rode npm run gerar (a Wiki nao usa npm run aprovar)');
}

// ---- 2) videos recentes (feed) sem texto ----
if (!soRascunhos) {
  for (const { playlist, nome } of categorias.filter((c) => c.playlist)) { // categoria sem playlist (Series) nao tem feed
    const todos = playlists[playlist] ?? [];
    const por = { publicada: 0, rascunho: 0, sem: [] };
    for (const v of todos) {
      const a = arquivos.find((x) => x.id === v.id);
      if (!a) por.sem.push(v); else if (estado(a) === 'publicada') por.publicada++; else por.rascunho++;
    }
    console.log(`\n${nome}: ${por.publicada} publicadas | ${por.rascunho} em rascunho | ${por.sem.length} sem texto (entre os 15 mais recentes)`);
    for (const v of por.sem) console.log(`  [sem texto] ${v.id}  ${v.published.slice(0, 10)}  ${v.title}`);
  }
  console.log('\nNovo rascunho: npm run nova -- <ID ou link>');
}
