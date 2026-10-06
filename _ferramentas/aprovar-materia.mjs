// Aprova materias em rascunho (remove "status": "rascunho"). Depois rode: npm run gerar
// Uso: npm run aprovar -- <ID> [<ID> ...]      ou      npm run aprovar -- --todos
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), '_conteudo', 'materias');
const args = process.argv.slice(2);
if (!args.length) { console.error('Informe o(s) ID(s) ou --todos. Veja os rascunhos com: npm run pendentes'); process.exit(1); }

const ids = args.includes('--todos')
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''))
  : args;

let aprovadas = 0;
for (const id of ids) {
  const f = path.join(dir, `${id}.json`);
  if (!fs.existsSync(f)) { console.log(`nao existe: ${id}`); continue; }
  const m = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (m.status !== 'rascunho') continue;
  if (JSON.stringify(m).includes('[CONFERIR')) { console.log(`NAO aprovada (ainda tem [CONFERIR): ${id}  ${m.titulo ?? ''}`); continue; }
  delete m.status;
  fs.writeFileSync(f, JSON.stringify(m, null, 2) + '\n', 'utf8');
  console.log(`aprovada: ${id}  ${m.titulo ?? ''}`);
  aprovadas++;
}
console.log('');
console.log(`${aprovadas} materia(s) aprovada(s). Rode: npm run gerar`);
