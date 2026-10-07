// Aprova materias em rascunho (remove "status": "rascunho") e REGISTRA o endereco da pagina (que nasce do titulo da materia e depois fica fixo).
// Uso:
//   npm run aprovar -- <ID ou link do video> [<ID ou link> ...]   aprova esses
//   npm run aprovar -- --todos                                      so MOSTRA o que seria aprovado (nada muda)
//   npm run aprovar -- --todos --confirmar                          aprova de verdade todos os rascunhos que passam nas regras
// Depois: npm run gerar
// Recusa a materia que: ainda tem texto de modelo, [CONFERIR, campo faltando ou invalido, status desconhecido, ou cujo formato nao deu para confirmar.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validarMateria } from './gerador/contrato.mjs';
import { feedPorId, gravarRegistro, lerRegistro, novoEndereco } from './gerador/enderecos.mjs';
import { ErroDeDados, lerJson, normalizarId } from './gerador/util.mjs';
import { formatoDe } from './gerador/youtube.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(site, '_conteudo', 'materias');
const args = process.argv.slice(2);
const todos = args.includes('--todos'), confirmar = args.includes('--confirmar');
const pedidos = args.filter((a) => !a.startsWith('--'));
if (!todos && !pedidos.length) { console.error('Informe o ID (ou o link do video), ou --todos. Veja os rascunhos com: npm run pendentes'); process.exit(1); }

const ids = [];
if (todos) ids.push(...fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, '')));
for (const p of pedidos) {
  const id = normalizarId(p);
  if (!id) { console.log(`ID invalido (use o ID de 11 caracteres ou o link do video): ${p}`); continue; }
  ids.push(id);
}
const aplicar = !todos || confirmar; // --todos sem --confirmar e so uma previa
const registro = lerRegistro(site);
const feed = feedPorId(lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json'));

let aprovadas = 0, prontas = 0, recusadas = 0;
for (const id of ids) {
  const f = path.join(dir, `${id}.json`), rel = `_conteudo/materias/${id}.json`;
  if (!fs.existsSync(f)) { console.log(`nao existe: ${id}`); continue; }
  const textoOriginal = fs.readFileSync(f, 'utf8');
  let m;
  try { m = lerJson(f, rel); }
  catch (e) { if (e instanceof ErroDeDados) { console.log(`NAO aprovada: ${e.message}`); recusadas++; continue; } throw e; }
  if (m.status == null) { if (!todos) console.log(`ja estava aprovada: ${id}`); continue; }
  if (m.status !== 'rascunho') { console.log(`NAO aprovada (status desconhecido ${JSON.stringify(m.status)}; use "rascunho" ou apague o campo): ${id}`); recusadas++; continue; }

  // formato: confirma no YouTube se faltar (na previa --todos so avisa, para nao fazer dezenas de consultas a toa)
  let formato = m.formato;
  const faltaFormato = !['short', 'horizontal'].includes(formato);
  if (faltaFormato && aplicar) {
    const r = await formatoDe(id);
    if (r.erro) { console.log(`NAO aprovada (nao consegui confirmar o formato do video: ${r.erro}): ${id}  ${m.titulo ?? ''}`); recusadas++; continue; }
    formato = r.formato;
    console.log(`  formato confirmado no YouTube: ${formato}`);
  }
  const candidata = faltaFormato ? { ...m, formato: formato ?? 'horizontal' } : m;
  const { problemas } = validarMateria(candidata, { id, rel, situacao: 'publicada' });
  if (problemas.length) { console.log(`NAO aprovada: ${id}  ${m.titulo ?? ''}\n${problemas.map((p) => `    - ${p.replace(`${rel}: `, '')}`).join('\n')}`); recusadas++; continue; }

  // endereco: ja registrado (republicacao) ou novo, a partir do titulo
  let e = registro[id];
  if (!e || e.retirada) {
    try { ({ endereco: e } = novoEndereco({ id, m: candidata, rel, registro, feed })); }
    catch (err) { if (err instanceof ErroDeDados) { console.log(`NAO aprovada: ${err.message}`); recusadas++; continue; } throw err; }
  }
  if (!aplicar) { prontas++; console.log(`pronta: ${id}  ${m.titulo}\n    -> /${e.categoria}/${e.slug}.html${faltaFormato ? '   (o formato sera confirmado no YouTube ao aprovar)' : ''}`); continue; }

  // grava sem apagar o que a outra sessao possa ter mudado nesse meio tempo
  if (fs.readFileSync(f, 'utf8') !== textoOriginal) { console.log(`NAO aprovada (o arquivo mudou enquanto eu aprovava; rode de novo): ${id}`); recusadas++; continue; }
  const { status, formato: _f, ...resto } = candidata;
  const novo = { formato, ...resto };
  const tmp = `${f}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(novo, null, 2)}\n`, 'utf8');
  fs.renameSync(tmp, f);
  registro[id] = { categoria: e.categoria, publicado: e.publicado, slug: e.slug, ...(e.antigos?.length ? { antigos: e.antigos } : {}) };
  console.log(`aprovada: ${id}  ${novo.titulo}\n    -> /${e.categoria}/${e.slug}.html`);
  aprovadas++;
}
if (aprovadas) gravarRegistro(site, registro);
console.log('');
if (!aplicar) console.log(`${prontas} materia(s) pronta(s) e ${recusadas} com pendencia. Nada foi alterado. Para aprovar as prontas: npm run aprovar -- --todos --confirmar`);
else console.log(`${aprovadas} materia(s) aprovada(s)${recusadas ? `, ${recusadas} recusada(s)` : ''}. Rode: npm run gerar`);
