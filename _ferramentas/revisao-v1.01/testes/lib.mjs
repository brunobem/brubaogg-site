// Base compartilhada dos testes (sem dependencias). Cada teste devolve uma lista de achados:
//   { sev: 'critico'|'alto'|'medio'|'baixo'|'info', teste, msg, onde }
// critico e alto fazem o "npm run testar" falhar; medio e baixo sao avisos; info so informa.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listarConteudos } from '../../gerador/pastas.mjs';
export const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
export const DOMINIO = 'https://brubaogg.com.br';
export const CATEGORIAS = ['noticias', 'reviews', 'lancamentos', 'gta6-novidades', 'series'];

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

// as materias moram em _conteudo/materias/<tipo>/<ID>/<ID>.json (gerador/pastas.mjs): noticias, reviews, lancamentos e wiki
function lerLista(itens) { // [{ id, arq, dados|null, erro }]
  return itens.map((c) => {
    try { return { id: c.id, arq: c.rel, dados: JSON.parse(ler(c.rel).replace(/^\uFEFF/, '')) }; }
    catch (e) { return { id: c.id, arq: c.rel, dados: null, erro: e.message }; }
  });
}
export const materias = () => lerLista(listarConteudos(raiz).itens.filter((c) => c.tipo !== 'wiki')); // as materias de video (o nome da pasta e o ID do video)
export const conteudosDaWiki = () => lerLista(listarConteudos(raiz).itens.filter((c) => c.tipo === 'wiki')); // a Wiki: pode ser so texto (o nome da pasta e livre)
export const aprovada = (m) => m.dados && m.dados.status !== 'rascunho';

/**
 * Os assuntos do site (materias com o mesmo campo "assunto", 2 ou mais), calculados aqui de forma independente do gerador: a partir dos JSONs aprovados, do registro de enderecos e de
 * _conteudo/assuntos.json (opcional). Cada materia tem a PROPRIA pagina; o que o assunto ganha e o redirecionamento do endereco dele (categoria/chave.html) para a materia mais nova e o bloco
 * "Mais sobre este assunto" em cada materia. Devolve { unidades: [{ chave, categoria, pagina (o redirecionamento), membros: [{ id, e, dados }] (do mais novo para o mais velho), ficha }],
 * membroDe: Map id -> unidade, esperadosPorCategoria: { pasta: n } (materias por categoria; cada uma conta 1: nada se junta) }.
 */
export function assuntosDoSite() {
  const registro = existe('_conteudo/enderecos.json') ? JSON.parse(ler('_conteudo/enderecos.json')) : {};
  const assuntos = existe('_conteudo/assuntos.json') ? JSON.parse(ler('_conteudo/assuntos.json')) : {};
  const porChave = new Map();
  for (const m of [...materias(), ...conteudosDaWiki()]) {
    const e = registro[m.id];
    if (!m.dados || m.dados.status === 'rascunho' || !e || e.retirada || typeof m.dados.assunto !== 'string') continue;
    (porChave.get(m.dados.assunto) ?? porChave.set(m.dados.assunto, []).get(m.dados.assunto)).push({ id: m.id, e, dados: m.dados });
  }
  const unidades = [], membroDe = new Map();
  for (const [chave, lista] of porChave) {
    if (lista.length < 2) continue;
    const membros = [...lista].sort((x, y) => String(y.e.publicado).localeCompare(String(x.e.publicado)) || y.id.localeCompare(x.id));
    const antiga = membros[membros.length - 1], ficha = assuntos[chave];
    const categoria = CATEGORIAS.includes(ficha?.categoria) ? ficha.categoria : antiga.e.categoria;
    const unidade = { chave, categoria, pagina: `${categoria}/${chave}.html`, membros, ficha };
    unidades.push(unidade);
    for (const m of membros) membroDe.set(m.id, unidade);
  }
  const esperadosPorCategoria = {};
  const soma = (cat) => { esperadosPorCategoria[cat] = (esperadosPorCategoria[cat] ?? 0) + 1; };
  for (const e of Object.values(registro)) if (!e.retirada) soma(e.categoria);
  return { unidades, membroDe, esperadosPorCategoria };
}
