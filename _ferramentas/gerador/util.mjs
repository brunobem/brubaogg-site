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
// Imagem de um conteudo sem video do YouTube (a Wiki pode ter so texto): dados.mjs registra aqui id -> caminho ("/assets/img/wiki-capa.svg" ou a imagem do conteudo).
// Todo o resto do site pede a imagem por miniatura(id) e recebe a certa, sem saber de onde ela vem.
export const imagensPropias = new Map();
// Imagem horizontal PROPRIA do cartao (card.jpg da pasta da materia, ou a thumb de uma materia horizontal; imagens.mjs): dados.mjs registra aqui id -> { src (640 px), srcset, w, h, grande }.
// Onde existe, o cartao, o carrossel, as listas e a previa de compartilhamento usam ela em vez da miniatura do YouTube.
export const cartoesPropios = new Map();
export const miniatura = (id) => imagensPropias.get(id) ?? cartoesPropios.get(id)?.src ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
// larguras aproximadas em que a imagem aparece na tela (o navegador usa isto para escolher a versao do srcset): cartao de lista, cartao grande da home e slide do carrossel
// (medido no navegador: celular de 390 px = cartao e carrossel com 355 px; computador de 1440 px = carrossel 686, cartao grande 653, destaque da lista 602, cartao de lista 262 a 330, cartao pequeno dos blocos 128 a 150)
export const SIZES_CARTAO = '(max-width: 700px) calc(100vw - 32px), 300px';
export const SIZES_CARTAO_DESTAQUE = '(max-width: 700px) calc(100vw - 32px), 620px';
export const SIZES_CARTAO_GRANDE = '(max-width: 700px) calc(100vw - 32px), 660px';
export const SIZES_CARTAO_PEQUENO = '150px';
export const SIZES_CARROSSEL = '(max-width: 700px) calc(100vw - 32px), 700px';
/** Os atributos do <img> de um cartao: src (e srcset + sizes + tamanho, quando a imagem e propria; assim o navegador baixa so a largura que a tela precisa). */
export function imagemDoCartao(id, sizes) {
  const c = cartoesPropios.get(id);
  if (imagensPropias.has(id) || !c) return { atributos: `src="${miniatura(id)}"`, w: 480, h: 360, alt: "" };
  return { atributos: `src="${c.src}" srcset="${c.srcset}" sizes="${sizes}"`, w: c.w, h: c.h, alt: c.alt ?? "" };
}
// Imagem GRANDE (maxresdefault, 1280x720) so para a previa de compartilhamento (og:image) e Article.image das materias (BL-05). Os cartoes e as fachadas continuam com a
// miniatura(id) de 480x360. Usa a grande so quando _conteudo/miniaturas-grandes.json (gerado por `npm run miniaturas`) diz que o video a tem; sem a informacao, cai na pequena.
export const miniaturasGrandes = new Map();
// Duracao dos videos (BL-08): _conteudo/duracoes-videos.json, gerado por `npm run duracoes`. `duracaoIso` devolve "PT1M30S" ou undefined (video fora da lista: sem o campo `duration`).
export const duracoesDosVideos = new Map();
export const duracaoIso = (idDoVideo) => {
  const total = duracoesDosVideos.get(idDoVideo);
  if (!Number.isInteger(total) || total <= 0) return undefined;
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s ? `${s}S` : ''}`;
};
export const miniaturaGrande = (id) => {
  if (!imagensPropias.has(id) && cartoesPropios.has(id)) return cartoesPropios.get(id).grande; // imagem propria: a maior versao (1200 px)
  const url = miniatura(id);
  const m = url.match(/^(https:\/\/i\.ytimg\.com\/vi\/([\w-]{11}))\/hqdefault\.jpg$/);
  return m && miniaturasGrandes.get(m[2]) === true ? `${m[1]}/maxresdefault.jpg` : url;
};
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
