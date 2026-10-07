// Muda o ENDERECO (URL) de materias ja registradas. O endereco velho continua funcionando: vira uma pagina que leva para o novo.
// Use com cuidado: link ja compartilhado ou indexado depende do redirecionamento, e o Google leva um tempo para trocar.
//   npm run endereco -- <ID> [novo-endereco]   um video; sem "novo-endereco" o endereco e refeito a partir do TITULO da materia
//   npm run endereco -- --todos                 TODAS as materias, refeito a partir do titulo (so mostra o que mudaria)
//   npm run endereco -- --todos --confirmar     aplica
// Depois: npm run gerar  (cria as paginas de redirecionamento)
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gravarRegistro, lerRegistro, mudarEndereco, slugDeTitulo } from './gerador/enderecos.mjs';
import { ErroDeDados, lerJson, normalizarId } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const todos = args.includes('--todos'), confirmar = args.includes('--confirmar');
const pos = args.filter((a) => !a.startsWith('--'));
if (!todos && !pos.length) { console.error('Uso: npm run endereco -- <ID> [novo-endereco]   ou   npm run endereco -- --todos [--confirmar]'); process.exit(1); }

const registro = lerRegistro(site);
const tituloDe = (id) => {
  try { return lerJson(path.join(site, '_conteudo', 'materias', `${id}.json`), `_conteudo/materias/${id}.json`).titulo; }
  catch (e) { if (e instanceof ErroDeDados) { console.error(e.message); process.exit(1); } throw e; }
};

const mudancas = [];
if (todos) {
  for (const id of Object.keys(registro)) {
    if (registro[id].retirada) continue;
    const titulo = tituloDe(id);
    if (!titulo) continue;
    const copia = structuredClone(registro);
    if (mudarEndereco(copia, id, titulo)) mudancas.push({ id, de: registro[id].slug, para: copia[id].slug, titulo });
  }
} else {
  const id = normalizarId(pos[0]);
  if (!id || !registro[id]) { console.error(`Nao encontrei esse video no registro de enderecos (${pos[0]}).`); process.exit(1); }
  const novo = pos[1] ? slugDeTitulo(pos[1]) : null;
  const titulo = novo ?? tituloDe(id);
  if (!titulo) { console.error('A materia nao tem titulo.'); process.exit(1); }
  const copia = structuredClone(registro);
  if (mudarEndereco(copia, id, titulo)) mudancas.push({ id, de: registro[id].slug, para: copia[id].slug, titulo });
}

if (!mudancas.length) { console.log('Nenhum endereco muda.'); process.exit(0); }
for (const m of mudancas) console.log(`${m.id}\n   de   ${registro[m.id].categoria}/${m.de}.html\n   para ${registro[m.id].categoria}/${m.para}.html`);
if (todos && !confirmar) { console.log(`\n${mudancas.length} endereco(s) mudariam. Nada foi alterado. Para aplicar: npm run endereco -- --todos --confirmar`); process.exit(0); }
for (const m of mudancas) mudarEndereco(registro, m.id, m.titulo);
gravarRegistro(site, registro);
console.log(`\n${mudancas.length} endereco(s) alterado(s); os antigos viram redirecionamento. Rode: npm run gerar`);
