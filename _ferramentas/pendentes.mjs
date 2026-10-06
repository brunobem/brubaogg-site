// Lista os videos que ainda NAO tem materia (sem arquivo em _conteudo/materias/), por categoria.
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
};

let total = 0;
for (const [id, nome] of Object.entries(nomes)) {
  const todos = playlists[id] ?? [];
  const faltam = todos.filter((v) => !fs.existsSync(path.join(site, '_conteudo', 'materias', `${v.id}.json`)));
  console.log(`\n${nome}: ${todos.length - faltam.length} publicadas, ${faltam.length} aguardando texto`);
  for (const v of faltam) console.log(`  ${v.id}  ${v.published.slice(0, 10)}  ${v.title}`);
  total += faltam.length;
}
console.log(`\nPara começar uma matéria:  npm run nova -- <ID_DO_VIDEO>`);
