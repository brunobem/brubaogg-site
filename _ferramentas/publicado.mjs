// O que o GitHub Pages publica do repositorio. UMA definicao so, usada pela montagem do site (montar-site.mjs) e pelos testes:
// ignora pastas e arquivos que comecam com "_" ou ".", node_modules e o "exclude" do _config.yml (README, package.json...).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const raizDoSite = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function excluidosDoConfig(raiz) {
  const cfg = path.join(raiz, '_config.yml');
  if (!fs.existsSync(cfg)) return [];
  const linhas = fs.readFileSync(cfg, 'utf8').split(/\r?\n/);
  const i = linhas.findIndex((l) => /^exclude:\s*$/.test(l));
  if (i < 0) return [];
  const out = [];
  for (const l of linhas.slice(i + 1)) {
    const m = l.match(/^\s+-\s+(.+?)\s*$/);
    if (!m) break;
    out.push(m[1]);
  }
  return out;
}

export const EXCLUIDOS = excluidosDoConfig(raizDoSite);

export function ehPublicado(rel, excluidos = EXCLUIDOS) {
  const partes = rel.split('/');
  if (partes.some((p) => p.startsWith('_') || p.startsWith('.'))) return false;
  if (partes[0] === 'node_modules') return false;
  return !excluidos.some((e) => rel === e || rel.startsWith(e.replace(/\/?$/, '/')));
}

/** lista (caminhos relativos, com /) de todos os arquivos que o Pages publicaria */
export function arquivosPublicados(raiz = raizDoSite) {
  const excluidos = raiz === raizDoSite ? EXCLUIDOS : excluidosDoConfig(raiz);
  const out = [];
  (function varrer(dir, rel) {
    for (const e of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.name.startsWith('_') || e.name.startsWith('.') || e.name === 'node_modules') continue; // poda: nada abaixo disso e publicado
      if (e.isDirectory()) varrer(r, r);
      else if (ehPublicado(r, excluidos)) out.push(r);
    }
  })('', '');
  return out;
}
