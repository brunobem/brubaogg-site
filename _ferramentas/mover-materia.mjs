// Muda uma ou mais materias JA PUBLICADAS de categoria (ex.: de reviews para series). O endereco velho continua funcionando: vira uma pagina que leva ao novo
// (o GitHub Pages nao redireciona sozinho), e o campo "categoria" do JSON da materia e acertado.
//   npm run mover -- <ID ou link> [<ID ou link> ...] --para <categoria>      (so mostra o que mudaria)
//   npm run mover -- <ID ou link> [<ID ou link> ...] --para <categoria> --confirmar
// Depois: npm run gerar  (cria as paginas novas e os redirecionamentos)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { categorias } from './gerador/config.mjs';
import { gravarRegistro, lerRegistro, mudarCategoria } from './gerador/enderecos.mjs';
import { RAIZ_DE_CONTEUDO, listarConteudos, resolverId, tipoDaCategoria, tipoDaMateria } from './gerador/pastas.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const confirmar = args.includes('--confirmar');
const i = args.indexOf('--para');
const destino = i >= 0 ? args[i + 1] : null;
const ids = args.filter((a, k) => !a.startsWith('--') && k !== i + 1).map((a) => resolverId(site, a));
const nomes = categorias.map((c) => c.pasta).join(', ');
if (!ids.length || !destino || ids.some((x) => !x)) { console.error(`Uso: npm run mover -- <ID ou link> [<ID ou link> ...] --para <categoria> [--confirmar]\n(categorias: ${nomes})`); process.exit(1); }
if (!categorias.some((c) => c.pasta === destino)) { console.error(`Categoria desconhecida: ${destino} (use ${nomes}).`); process.exit(1); }

const registro = lerRegistro(site);
const mudancas = [];
for (const id of ids) {
  const e = registro[id];
  if (!e) { console.error(`Esse video nao esta no registro de enderecos (nunca foi publicado?): ${id}`); process.exit(1); }
  if (e.retirada) { console.error(`Essa materia foi retirada do ar (${e.retirada}): ${id}`); process.exit(1); }
  if (tipoDaMateria(site, id) === 'wiki') { console.error(`${id} e conteudo da Wiki (_conteudo/materias/wiki) e fica sempre na Wiki. Para tirar do ar: npm run retirar -- ${id}`); process.exit(1); }
  const de = `${e.categoria}/${e.slug}.html`;
  const copia = structuredClone(registro);
  if (mudarCategoria(copia, id, destino)) mudancas.push({ id, de, para: `${copia[id].categoria}/${copia[id].slug}.html` });
}
if (!mudancas.length) { console.log('Nenhuma materia muda de categoria.'); process.exit(0); }
for (const m of mudancas) console.log(`${m.id}\n   de   ${m.de}\n   para ${m.para}`);
if (!confirmar) { console.log(`\n${mudancas.length} materia(s) mudariam. Nada foi alterado. Para aplicar, repita o comando com --confirmar`); process.exit(0); }

for (const m of mudancas) mudarCategoria(registro, m.id, destino);
gravarRegistro(site, registro);
// o JSON da materia diz a categoria tambem: acerta so esse campo, por troca de texto (sem reescrever o arquivo)
let json = 0, pastas = 0;
for (const m of mudancas) {
  const c = listarConteudos(site).itens.find((x) => x.id === m.id); // _conteudo/materias/<tipo>/<ID>/<ID>.json
  if (!c) continue;
  const t = fs.readFileSync(c.arquivo, 'utf8');
  const novo = t.replace(/("categoria"\s*:\s*)"[^"]*"/, `$1"${destino}"`);
  if (novo !== t) { fs.writeFileSync(c.arquivo, novo); json++; }
  // a pasta de tipo acompanha a categoria (de noticias para reviews, por exemplo); GTA 6 e noticia, entao gta6-novidades <-> noticias nao muda de pasta. As imagens da materia vao junto.
  const tipoNovo = tipoDaCategoria(destino);
  if (c.tipo !== tipoNovo) {
    const nova = path.join(site, RAIZ_DE_CONTEUDO, tipoNovo, m.id);
    fs.mkdirSync(path.dirname(nova), { recursive: true });
    fs.renameSync(c.pasta, nova);
    pastas++;
  }
}
console.log(`\n${mudancas.length} materia(s) movida(s) para ${destino} (${json} arquivo(s) de texto acertado(s), ${pastas} pasta(s) levada(s) para a pasta do novo tipo); os enderecos antigos viram redirecionamento. Rode: npm run gerar`);
