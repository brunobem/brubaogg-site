// Tira uma materia do ar DE PROPOSITO. O endereco dela passa a levar para a lista da categoria (nao vira 404) e o arquivo de texto e apagado.
// Uso: npm run retirar -- <ID ou link do video>      Depois: npm run gerar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gravarRegistro, lerRegistro } from './gerador/enderecos.mjs';
import { hojeEmSaoPaulo, normalizarId } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = normalizarId(process.argv[2]);
if (!id) { console.error('Uso: npm run retirar -- <ID ou link do video>'); process.exit(1); }
const registro = lerRegistro(site);
const e = registro[id];
if (!e) { console.error(`Esse video nao esta no registro de enderecos (nunca foi publicado?): ${id}`); process.exit(1); }
if (e.retirada) { console.log(`Ja estava retirada em ${e.retirada}.`); process.exit(0); }
e.retirada = hojeEmSaoPaulo();
gravarRegistro(site, registro);
const arq = path.join(site, '_conteudo', 'materias', `${id}.json`);
if (fs.existsSync(arq)) fs.rmSync(arq);
console.log(`Retirada: ${e.categoria}/${e.slug}.html (agora leva para a lista da categoria). Rode: npm run gerar`);
