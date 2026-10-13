// Onde mora o arquivo de uma materia: _conteudo/materias/<ID>.json (materia de video) ou _conteudo/wiki/<nome>.json (conteudo da Wiki, pode ser so texto).
import fs from 'node:fs';
import path from 'node:path';
import { normalizarId } from './util.mjs';

export const PASTAS_DE_CONTEUDO = ['_conteudo/materias', '_conteudo/wiki'];

/** Caminho do arquivo de uma materia (ou null se nao existe em nenhuma das duas pastas). */
export function arquivoDaMateria(site, id) {
  for (const pasta of PASTAS_DE_CONTEUDO) {
    const f = path.join(site, pasta, `${id}.json`);
    if (fs.existsSync(f)) return f;
  }
  return null;
}

/**
 * O identificador que o comando recebeu: o ID (ou link) de um video, ou o nome de um arquivo da Wiki (ex.: resident-evil-4-leon).
 * O nome da Wiki so vale se o arquivo existe ou o conteudo ja esta no registro de enderecos. Devolve null quando nao e nenhum dos dois.
 */
export function resolverId(site, arg) {
  const id = normalizarId(arg);
  if (id) return id;
  const s = String(arg ?? '').trim();
  if (!/^[\w-]+$/.test(s)) return null;
  if (arquivoDaMateria(site, s)) return s;
  const reg = path.join(site, '_conteudo', 'enderecos.json');
  try { return Object.hasOwn(JSON.parse(fs.readFileSync(reg, 'utf8').replace(/^\uFEFF/, '')), s) ? s : null; } catch { return null; }
}
