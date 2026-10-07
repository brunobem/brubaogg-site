// Utilitarios sem estado, usados pelo gerador e pelos outros scripts.
import fs from 'node:fs';

/** Erro "esperado" (dado errado do usuario): o gerador mostra a mensagem, sem pilha de erro, e sai com codigo 1. */
export class ErroDeDados extends Error {}

/** Le um JSON. Aceita BOM (o PowerShell 5.1 grava UTF-8 com BOM) e SEMPRE diz de qual arquivo veio o erro. */
export function lerJson(abs, rotulo = abs) {
  let texto;
  try { texto = fs.readFileSync(abs, 'utf8'); }
  catch (e) { throw new ErroDeDados(`${rotulo}: nao consegui abrir o arquivo (${e.code ?? e.message}).`); }
  try { return JSON.parse(texto.replace(/^\uFEFF/, '')); }
  catch (e) { throw new ErroDeDados(`${rotulo}: nao e um JSON valido (${e.message}). Confira virgulas, aspas e chaves.`); }
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// o contrario de esc(): texto de atributo/elemento HTML -> texto puro
export const desescapar = (s) => String(s).replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
export const limparTitulo = (t) => t.replace(/(\s+#\w+)+\s*$/u, '').trim();
// minusculas, sem acento, palavras ligadas por hifen (sem limite de tamanho)
export function slugBase(t) {
  return String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export function slugify(t) {
  return slugBase(t).slice(0, 70).replace(/-+$/g, '') || 'materia';
}
export const dataLonga = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
export const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
export const mesDe = (iso) => new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }).slice(0, 7); // AAAA-MM no horario de Brasilia
export const miniatura = (id) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const hojeEmSaoPaulo = () => new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }); // AAAA-MM-DD

/** Corta um texto no limite, em palavra inteira, com reticencias. Texto dentro do limite nao muda (so os espacos repetidos). */
export function cortar(texto, max) {
  const t = String(texto).replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max - 1);
  const i = corte.lastIndexOf(' ');
  return `${(i > max * 0.6 ? corte.slice(0, i) : corte).replace(/[\s,;:.-]+$/, '')}…`;
}

// Texto que o `npm run nova` coloca como modelo. Se ele chegar ao site, a materia foi esquecida sem escrever.
export const TEXTO_DE_MODELO = { resumo: 'Escreva 1 ou 2 frases que aparecem na lista de matérias.', corpo: ['Primeiro parágrafo.', 'Segundo parágrafo.'] };
export const usaTextoDeModelo = (m) => m.resumo === TEXTO_DE_MODELO.resumo || (Array.isArray(m.corpo) && m.corpo.some((p) => TEXTO_DE_MODELO.corpo.includes(p)));

/** ID do YouTube a partir do que a pessoa colou: o proprio ID (11 caracteres) ou um link (watch?v=, youtu.be/, shorts/, embed/, live/). null se nao der. */
export function normalizarId(arg) {
  const s = String(arg ?? '').trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})(?![\w-])/);
  return m ? m[1] : null;
}
