// O que falta publicar: rascunhos aguardando aprovacao (de videos recentes E antigos) e os videos recentes que ainda nao tem texto.
// Uso: npm run pendentes              tudo
//      npm run pendentes -- --rascunhos   so os rascunhos (a lista para revisar e aprovar)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorias } from './gerador/config.mjs';
import { dataDePublicacao, validarMateria } from './gerador/contrato.mjs';
import { ErroDeDados, lerJson } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(site, '_conteudo', 'materias');
const soRascunhos = process.argv.includes('--rascunhos');
const playlists = lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json');
const noFeed = new Map();
for (const c of categorias) for (const v of playlists[c.playlist] ?? []) noFeed.set(v.id, { cat: c.pasta, data: v.published });

// le todos os arquivos de materia
const arquivos = [];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json')).sort()) {
  const id = f.slice(0, -5), rel = `_conteudo/materias/${f}`;
  try { arquivos.push({ id, rel, m: lerJson(path.join(dir, f), rel) }); }
  catch (e) { if (e instanceof ErroDeDados) arquivos.push({ id, rel, erro: e.message }); else throw e; }
}
const estado = (a) => (a.erro ? 'json invalido' : a.m.status == null ? 'publicada' : a.m.status === 'rascunho' ? 'rascunho' : 'json invalido');

// ---- 1) rascunhos (inclui os de videos antigos, que nao aparecem em nenhuma playlist do feed) ----
const rascunhos = arquivos.filter((a) => estado(a) === 'rascunho').map((a) => {
  const feed = noFeed.get(a.id);
  const cat = feed?.cat ?? a.m.categoria ?? '?';
  const data = feed?.data ?? dataDePublicacao(a.m.publicado)?.toISOString() ?? '';
  const { problemas } = validarMateria({ ...a.m, formato: ['short', 'horizontal'].includes(a.m.formato) ? a.m.formato : 'horizontal' }, { id: a.id, rel: a.rel, situacao: 'publicada' });
  const palavras = (Array.isArray(a.m.corpo) ? a.m.corpo.join(' ') : '').split(/\s+/).filter(Boolean).length;
  return { id: a.id, cat, data, titulo: a.m.titulo ?? '(sem titulo)', palavras, problemas: problemas.map((p) => p.replace(`${a.rel}: `, '')), semFormato: !['short', 'horizontal'].includes(a.m.formato), antigo: !feed };
}).sort((x, y) => y.data.localeCompare(x.data));
const prontos = rascunhos.filter((r) => !r.problemas.length);
console.log(`\nRASCUNHOS aguardando aprovacao: ${rascunhos.length} (${prontos.length} prontos, ${rascunhos.length - prontos.length} com pendencia; ${rascunhos.filter((r) => r.antigo).length} sao de videos antigos)`);
for (const r of rascunhos) {
  console.log(`  [${r.problemas.length ? 'pendencia' : 'pronto   '}] ${r.id}  ${r.data.slice(0, 10)}  ${r.cat.padEnd(14)} ${String(r.palavras).padStart(4)} palavras${r.antigo ? '  (video antigo)' : ''}${r.semFormato ? '  (sem formato)' : ''}\n      ${r.titulo}`);
  for (const p of r.problemas) console.log(`      - ${p}`);
}
for (const a of arquivos.filter((x) => estado(x) === 'json invalido')) console.log(`  !! ARQUIVO ILEGIVEL OU COM STATUS INVALIDO: ${a.rel}${a.erro ? `\n      ${a.erro}` : ''}`);
if (rascunhos.length) console.log('\nRevisar e aprovar: npm run aprovar -- <ID>   |   so ver o que seria aprovado em lote: npm run aprovar -- --todos');

// ---- 2) videos recentes (feed) sem texto ----
if (!soRascunhos) {
  for (const { playlist, nome } of categorias) {
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
