// Base compartilhada dos testes (sem dependencias). Cada teste devolve uma lista de achados:
//   { sev: 'critico'|'alto'|'medio'|'baixo'|'info', teste, msg, onde }
// critico e alto fazem o "npm run testar" falhar; medio e baixo sao avisos; info so informa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DOMINIO = 'https://brubaogg.com.br';
export const CATEGORIAS = ['noticias', 'reviews', 'lancamentos', 'gta6-novidades'];

export const achado = (sev, teste, msg, onde = '') => ({ sev, teste, msg, onde });
export const ler = (rel) => fs.readFileSync(path.join(raiz, rel), 'utf8');
export const existe = (rel) => fs.existsSync(path.join(raiz, rel));

// ---- o que o GitHub Pages publica: definicao unica em _ferramentas/publicado.mjs (a mesma usada para montar o site) ----
export { EXCLUIDOS, ehPublicado } from '../../publicado.mjs';
import { ehPublicado } from '../../publicado.mjs';

export function todosOsArquivos(dir = '', acc = []) {
  for (const e of fs.readdirSync(path.join(raiz, dir), { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name === '.git') continue;
    const rel = dir ? `${dir}/${e.name}` : e.name;
    if (e.isDirectory()) todosOsArquivos(rel, acc); else acc.push(rel);
  }
  return acc;
}
export const arquivosPublicados = () => todosOsArquivos().filter((r) => ehPublicado(r));
export const paginasHtml = () => arquivosPublicados().filter((r) => r.endsWith('.html'));

// ---- existencia com caixa EXATA (o Windows nao distingue Logo.png de logo.png; o servidor do GitHub distingue) ----
const _listagens = new Map();
function listagem(dirAbs) {
  if (!_listagens.has(dirAbs)) _listagens.set(dirAbs, fs.existsSync(dirAbs) ? fs.readdirSync(dirAbs) : null);
  return _listagens.get(dirAbs);
}
/** 'ok' | 'caixa' (existe so com outra caixa) | 'nao' */
export function existeExato(rel) {
  let atual = raiz;
  for (const seg of rel.split('/').filter(Boolean)) {
    const lista = listagem(atual);
    if (!lista) return 'nao';
    if (!lista.includes(seg)) return lista.some((x) => x.toLowerCase() === seg.toLowerCase()) ? 'caixa' : 'nao';
    atual = path.join(atual, seg);
  }
  return 'ok';
}

// ---- leitura leve de HTML (sem dependencias; suficiente para o HTML que o gerador e as paginas fixas produzem) ----
export function limparHtml(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<script\b[\s\S]*?<\/script>/gi, '<script></script>')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '<style></style>');
}
export function atributos(trecho) {
  const out = {};
  for (const m of trecho.matchAll(/([a-zA-Z_:][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) out[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return out;
}
export function tags(html) { // [{ nome, attrs, fecha, auto, idx }]
  const out = [];
  for (const m of html.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>/g)) {
    out.push({ nome: m[2].toLowerCase(), attrs: m[1] ? {} : atributos(m[3]), fecha: !!m[1], auto: /\/\s*$/.test(m[3]), idx: m.index });
  }
  return out;
}
export const textoVisivel = (html) => limparHtml(html).replace(/<svg[\s\S]*?<\/svg>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
export const decodificar = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

export function materias() { // [{ id, arq, dados|null, erro }]
  const dir = '_conteudo/materias';
  if (!existe(dir)) return [];
  return fs.readdirSync(path.join(raiz, dir)).filter((f) => f.endsWith('.json')).map((f) => {
    const id = f.slice(0, -5);
    try { return { id, arq: `${dir}/${f}`, dados: JSON.parse(ler(`${dir}/${f}`)) }; }
    catch (e) { return { id, arq: `${dir}/${f}`, dados: null, erro: e.message }; }
  });
}
export const aprovada = (m) => m.dados && m.dados.status !== 'rascunho';
