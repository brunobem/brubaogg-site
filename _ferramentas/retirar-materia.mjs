// Tira uma materia do ar DE PROPOSITO. O endereco dela nao vira 404: passa a levar para a lista da categoria ou, com --para, para outra materia (ex.: o Short que virou
// anexo de uma review leva para a review). O arquivo de texto NAO e apagado: vai para _conteudo/retiradas/ (fora do site), de onde da para recuperar.
// Uso: npm run retirar -- <ID ou link do video> [--para <ID da materia de destino>]      Depois: npm run gerar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gravarRegistro, lerRegistro } from './gerador/enderecos.mjs';
import { arquivoDaMateria, resolverId } from './gerador/pastas.mjs';
import { hojeEmSaoPaulo } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const iPara = args.indexOf('--para');
const argDestino = iPara >= 0 ? args[iPara + 1] : null;
const argId = args.find((x, k) => !x.startsWith('--') && (iPara < 0 || k !== iPara + 1));
const uso = () => { console.error('Uso: npm run retirar -- <ID ou link do video> [--para <ID da materia de destino>]  (conteudo da Wiki: o nome do arquivo, ex.: resident-evil-4-leon)'); process.exit(1); };
const id = resolverId(site, argId);
if (!id || (iPara >= 0 && !argDestino)) uso();
const registro = lerRegistro(site);
const e = registro[id];
if (!e) { console.error(`Esse conteudo nao esta no registro de enderecos (nunca foi publicado?): ${id}`); process.exit(1); }
if (e.retirada) { console.log(`Ja estava retirada em ${e.retirada}.`); process.exit(0); }
let destino = null;
if (argDestino) {
  destino = resolverId(site, argDestino);
  const d = destino ? registro[destino] : null;
  if (!d) { console.error(`O destino nao esta no registro de enderecos: ${argDestino}`); process.exit(1); }
  if (destino === id) { console.error('O destino nao pode ser a propria materia.'); process.exit(1); }
  if (d.retirada) { console.error(`O destino (${d.categoria}/${d.slug}.html) tambem foi retirado em ${d.retirada}: escolha outro.`); process.exit(1); }
}
e.retirada = hojeEmSaoPaulo();
if (destino) e.para = destino;
gravarRegistro(site, registro);
const arq = arquivoDaMateria(site, id); // _conteudo/materias ou _conteudo/wiki
if (arq) {
  const pasta = path.join(site, '_conteudo', 'retiradas');
  fs.mkdirSync(pasta, { recursive: true });
  fs.renameSync(arq, path.join(pasta, path.basename(arq)));
}
const d = destino ? registro[destino] : null;
console.log(`Retirada: ${e.categoria}/${e.slug}.html (agora leva para ${d ? `${d.categoria}/${d.slug}.html` : 'a lista da categoria'}). O texto ficou em _conteudo/retiradas/. Rode: npm run gerar`);
