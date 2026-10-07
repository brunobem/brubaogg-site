// O CONTRATO de uma materia (_conteudo/materias/<ID>.json), em um so lugar. Usado pelo gerador, pelo aprovar, pelo pendentes e pelos testes.
// Devolve { problemas, avisos }: problema = nao pode publicar; aviso = so informa (limite editorial).
import { categorias } from './config.mjs';
import { usaTextoDeModelo } from './util.mjs';

export const FORMATOS = ['short', 'horizontal'];
const INICIO_DO_YOUTUBE = new Date('2005-01-01T00:00:00Z'); // nenhum video e mais antigo que isso
const texto = (v) => typeof v === 'string' && v.trim() !== '';

/** "AAAA-MM-DD" (vira meio-dia em Brasilia) ou data ISO completa. null se nao der para ler. */
export function dataDePublicacao(valor) {
  if (valor == null) return null;
  const d = new Date(String(valor).length === 10 ? `${valor}T12:00:00-03:00` : valor);
  return isNaN(d) ? null : d;
}

/**
 * situacao: 'publicada' (aprovada) ou 'rascunho' (so validado nos modos de previa).
 * Regras: resumo, corpo, titulo e formato sao obrigatorios na materia aprovada; a data de publicacao, se informada, precisa ser real.
 */
export function validarMateria(m, { id, rel, situacao }) {
  const problemas = [], avisos = [];
  const P = (msg) => problemas.push(`${rel}: ${msg}`), A = (msg) => avisos.push(`${rel}: ${msg}`);
  const aprovada = situacao === 'publicada';

  if (!texto(m.resumo)) P('falta "resumo" (1 ou 2 frases, texto nao vazio).');
  if (!Array.isArray(m.corpo) || !m.corpo.length) P('"corpo" deve ser uma lista com ao menos 1 paragrafo.');
  else {
    const i = m.corpo.findIndex((p) => !texto(p));
    if (i >= 0) P(`o paragrafo ${i + 1} de "corpo" esta vazio ou nao e texto.`);
  }
  if (m.titulo != null && !texto(m.titulo)) P('"titulo" esta vazio ou nao e texto.');
  else if (m.titulo == null && aprovada) P('falta "titulo" (o endereco da pagina nasce dele; use ate 60 caracteres, com o nome do jogo no comeco).');
  if (m.tags != null) {
    if (!Array.isArray(m.tags)) P('"tags" deve ser uma lista, por exemplo ["God of War"].');
    else if (m.tags.some((t) => !texto(t))) P('"tags" tem item vazio ou que nao e texto.');
  }
  if (!FORMATOS.includes(m.formato)) {
    if (aprovada) P(`falta "formato" ("short" ou "horizontal"). Descubra com: npm run formato -- ${id}`);
    else A('rascunho sem "formato" (a previa usa horizontal)');
  }
  if (aprovada && usaTextoDeModelo(m)) P('ainda tem o texto de modelo do npm run nova ("Escreva 1 ou 2 frases..." / "Primeiro paragrafo."). Escreva a materia ou volte o status para "rascunho".');
  if (aprovada && /\[CONFERIR/.test(JSON.stringify(m))) P('ainda tem um [CONFERIR ...] pendente. Resolva o trecho antes de publicar.');

  // campos de video antigo (fora dos 15 mais recentes do feed): precisam ser reais
  if (m.categoria != null && !categorias.some((c) => c.pasta === m.categoria)) P(`"categoria" desconhecida: ${JSON.stringify(m.categoria)} (use ${categorias.map((c) => c.pasta).join(', ')}).`);
  if (m.publicado != null) {
    const d = dataDePublicacao(m.publicado);
    if (!d) P(`"publicado" invalido: ${JSON.stringify(m.publicado)} (use AAAA-MM-DD).`);
    else if (d < INICIO_DO_YOUTUBE) P(`"publicado" ${JSON.stringify(m.publicado)} e anterior ao YouTube (confira o ano).`);
    else if (d > new Date(Date.now() + 36 * 3600 * 1000)) P(`"publicado" ${JSON.stringify(m.publicado)} esta no futuro (confira o ano).`);
  }

  // avisos editoriais (nao param o gerador)
  if (texto(m.titulo) && m.titulo.length > 60) A(`titulo com ${m.titulo.length} caracteres (o Google corta perto de 60)`);
  if (texto(m.resumo) && m.resumo.length > 160) A(`resumo com ${m.resumo.length} caracteres (a descricao do Google e cortada em 160)`);
  if (Array.isArray(m.tags) && m.tags.length > 8) A(`${m.tags.length} tags (so 8 aparecem na pagina)`);
  return { problemas, avisos };
}
