// Confere se todo link/arquivo referenciado nas paginas existe (href, src e os .json lidos pelos scripts).
// Uso: node _ferramentas/verificar-links.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paginas = [];
const ignorar = new Set(['_ferramentas', '_conteudo', '_marca', '_site', 'pagefind', 'node_modules', '.git', '.github']);
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignorar.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p);
    else if (e.name.endsWith('.html')) paginas.push(p);
  }
})(raiz);

let quebrados = 0;

// existe com a MESMA caixa de letras? (o Windows aceita Logo.png para logo.png; o servidor do GitHub, que e Linux, da 404)
const listagens = new Map();
function existeExato(abs) {
  const rel = path.relative(raiz, abs);
  if (rel.startsWith('..')) return fs.existsSync(abs) ? 'ok' : 'nao';
  let atual = raiz;
  for (const seg of rel.split(path.sep).filter(Boolean)) {
    if (!listagens.has(atual)) listagens.set(atual, fs.existsSync(atual) ? fs.readdirSync(atual) : null);
    const lista = listagens.get(atual);
    if (!lista) return 'nao';
    if (!lista.includes(seg)) return lista.some((x) => x.toLowerCase() === seg.toLowerCase()) ? 'caixa' : 'nao';
    atual = path.join(atual, seg);
  }
  return 'ok';
}

// o site nao pode estar gerado em modo de teste (previa com rascunhos ou lorem ipsum)
if (fs.existsSync(path.join(raiz, '_ferramentas', 'cache', 'MODO-TESTE'))) {
  console.log('SITE EM MODO DE TESTE: contem rascunhos ou texto de exemplo. Rode npm run gerar antes de publicar.');
  quebrados++;
}

// URLs que nao podem mudar (indexacao ja pedida no Google). Ver README: "URLs que NAO podem mudar".
const protegidas = ['index.html', 'gta6.html'];
for (const f of protegidas) {
  if (!fs.existsSync(path.join(raiz, f))) { console.log(`URL PROTEGIDA AUSENTE  ${f} (nao pode ser renomeada, movida ou apagada)`); quebrados++; }
}

for (const pg of paginas) {
  const html = fs.readFileSync(pg, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const alvo = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(alvo)) continue;
    const limpo = alvo.split('#')[0].split('?')[0];
    if (!limpo) continue;
    const arq = limpo.startsWith('/') ? path.join(raiz, limpo) : path.resolve(path.dirname(pg), limpo);
    const achou = existeExato(arq);
    if (achou === 'nao') { console.log(`QUEBRADO  ${path.relative(raiz, pg)} -> ${alvo}`); quebrados++; }
    else if (achou === 'caixa') { console.log(`CAIXA DIFERENTE (da 404 no GitHub)  ${path.relative(raiz, pg)} -> ${alvo}`); quebrados++; }
  }
}
// toda materia ja publicada (registro de enderecos) precisa continuar existindo, e as retiradas precisam levar para a lista (nada vira 404)
const reg = path.join(raiz, '_conteudo', 'enderecos.json');
if (fs.existsSync(reg) && !fs.existsSync(path.join(raiz, '_ferramentas', 'cache', 'MODO-TESTE'))) {
  for (const [id, e] of Object.entries(JSON.parse(fs.readFileSync(reg, 'utf8').replace(/^\uFEFF/, '')))) {
    const pag = `${e.categoria}/${e.slug}.html`;
    if (!fs.existsSync(path.join(raiz, pag))) { console.log(`PAGINA PUBLICADA SUMIU  ${pag} (materia ${id}${e.retirada ? ', retirada' : ''}). Restaure o arquivo da materia ou use: npm run retirar -- ${id}`); quebrados++; }
    for (const velho of e.antigos ?? []) if (!fs.existsSync(path.join(raiz, `${e.categoria}/${velho}.html`))) { console.log(`REDIRECIONAMENTO AUSENTE  ${e.categoria}/${velho}.html (endereco antigo da materia ${id}; rode npm run gerar)`); quebrados++; }
  }
}
for (const f of ['assets/data/playlists.json', 'assets/data/atalhos.json', 'assets/data/lista/manifesto.json', 'assets/css/style.css', 'assets/js/busca.js', 'assets/js/contador.js', 'assets/img/logo.png', 'assets/img/rodape/cena.svg', 'CNAME', '404.html']) {
  if (!fs.existsSync(path.join(raiz, f))) { console.log(`FALTANDO  ${f}`); quebrados++; }
}
console.log(`${paginas.length} paginas verificadas, ${quebrados} problema(s).`);
process.exit(quebrados ? 1 : 0);
