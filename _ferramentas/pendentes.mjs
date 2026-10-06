// Mostra, por categoria, o que ja foi publicado, o que esta em RASCUNHO (aguardando revisao) e o que ainda nao tem texto.
// Uso: npm run pendentes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const playlists = JSON.parse(fs.readFileSync(path.join(site, 'assets', 'data', 'playlists.json'), 'utf8'));
const nomes = {
  'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb': 'Notícias',
  'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp': 'Reviews',
  'PLLjQdJWDu4qk': 'Lançamentos',
  'PLYgWUqxV5Uao': 'GTA 6 Novidades',
};

function estado(id) {
  const f = path.join(site, '_conteudo', 'materias', `${id}.json`);
  if (!fs.existsSync(f)) return 'sem texto';
  try { return JSON.parse(fs.readFileSync(f, 'utf8')).status === 'rascunho' ? 'rascunho' : 'publicada'; }
  catch { return 'json invalido'; }
}

for (const [pl, nome] of Object.entries(nomes)) {
  const todos = playlists[pl] ?? [];
  const por = { publicada: [], rascunho: [], 'sem texto': [], 'json invalido': [] };
  todos.forEach((v) => por[estado(v.id)].push(v));
  console.log('');
  console.log(`${nome}: ${por.publicada.length} publicadas | ${por.rascunho.length} em rascunho | ${por['sem texto'].length} sem texto`);
  for (const v of por['json invalido']) console.log(`  !! JSON INVALIDO  ${v.id}  ${v.title}`);
  for (const v of por.rascunho) console.log(`  [rascunho]  ${v.id}  ${v.published.slice(0, 10)}  ${v.title}`);
  for (const v of por['sem texto']) console.log(`  [sem texto] ${v.id}  ${v.published.slice(0, 10)}  ${v.title}`);
}
console.log('');
console.log('Novo rascunho: npm run nova -- <ID>   |   Aprovar: npm run aprovar -- <ID> [<ID> ...]');
