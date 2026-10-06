// Confere se todo link/arquivo referenciado nas paginas existe (href, src e os .json lidos pelos scripts).
// Uso: node _ferramentas/verificar-links.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const paginas = [];
const ignorar = new Set(['_ferramentas', '_conteudo', '_marca', 'node_modules', '.git']);
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignorar.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p);
    else if (e.name.endsWith('.html')) paginas.push(p);
  }
})(raiz);

let quebrados = 0;
for (const pg of paginas) {
  const html = fs.readFileSync(pg, 'utf8');
  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    const alvo = m[1];
    if (/^(https?:|mailto:|#|data:)/.test(alvo)) continue;
    const limpo = alvo.split('#')[0].split('?')[0];
    if (!limpo) continue;
    const arq = limpo.startsWith('/') ? path.join(raiz, limpo) : path.resolve(path.dirname(pg), limpo);
    if (!fs.existsSync(arq)) { console.log(`QUEBRADO  ${path.relative(raiz, pg)} -> ${alvo}`); quebrados++; }
  }
}
for (const f of ['assets/data/playlists.json', 'assets/data/ultimo-video.json', 'assets/data/busca.json', 'assets/css/style.css', 'assets/js/busca.js', 'assets/js/contador.js', 'assets/js/ultimo-video.js', 'assets/img/logo.png', 'CNAME', '404.html']) {
  if (!fs.existsSync(path.join(raiz, f))) { console.log(`FALTANDO  ${f}`); quebrados++; }
}
console.log(`${paginas.length} paginas verificadas, ${quebrados} problema(s).`);
process.exit(quebrados ? 1 : 0);
