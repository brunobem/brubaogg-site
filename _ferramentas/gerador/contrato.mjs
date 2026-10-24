// O CONTRATO de uma materia (_conteudo/materias/<tipo>/<ID>/<ID>.json), em um so lugar. Usado pelo gerador, pelo aprovar, pelo pendentes e pelos testes.
// Devolve { problemas, avisos }: problema = nao pode publicar; aviso = so informa (limite editorial).
import { LIMITE_DE_FONTES, LIMITE_DE_SHORTS, RECOMENDACOES, WIKI, categorias } from './config.mjs';
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

  // ficha de veredito da review: so entra na pagina o que estiver certo (nota de 0 a 10 em passos de 0,5, recomendacao da lista)
  if (m.veredito != null) {
    const v = m.veredito;
    if (typeof v !== 'object' || Array.isArray(v)) P('"veredito" deve ser um objeto: { "nota": 7.5, "recomendacao": "compre", "plataforma": "PS5", ... }.');
    else {
      if (typeof v.nota !== 'number' || !Number.isFinite(v.nota) || v.nota < 0 || v.nota > 10 || (v.nota * 2) % 1 !== 0) P(`"veredito.nota" deve ser um numero de 0 a 10 em passos de 0,5 (ex.: 7.5, sem aspas e com ponto): veio ${JSON.stringify(v.nota)}.`);
      if (v.recomendacao != null && !(v.recomendacao in RECOMENDACOES)) P(`"veredito.recomendacao" ${JSON.stringify(v.recomendacao)} nao existe (use ${Object.keys(RECOMENDACOES).join(', ')}).`);
      for (const campo of ['preco', 'horas', 'plataforma', 'paraQuem']) if (v[campo] != null && !texto(v[campo])) P(`"veredito.${campo}" deve ser um texto nao vazio (ou apague o campo).`);
      for (const k of Object.keys(v)) if (!['nota', 'recomendacao', 'preco', 'horas', 'plataforma', 'paraQuem'].includes(k)) A(`campo desconhecido em "veredito": "${k}" (nao aparece na pagina)`);
    }
  }
  // fontes: aparecem no fim da materia com link
  if (m.fontes != null) {
    if (!Array.isArray(m.fontes)) P('"fontes" deve ser uma lista: [{ "nome": "Site", "url": "https://..." }].');
    else {
      m.fontes.forEach((f, i) => {
        if (f === null || typeof f !== 'object' || !texto(f.nome)) P(`a fonte ${i + 1} precisa de "nome" (texto).`);
        else if (typeof f.url !== 'string' || !/^https:\/\/[^\s"<>]+$/.test(f.url)) P(`a fonte ${i + 1} ("${f.nome}") precisa de "url" comecando com https:// (sem espacos): veio ${JSON.stringify(f.url)}.`);
      });
      if (m.fontes.length > LIMITE_DE_FONTES) A(`${m.fontes.length} fontes (a pagina mostra todas; ate ${LIMITE_DE_FONTES} le melhor)`);
    }
  }
  // Shorts anexados: o ID do video (11 caracteres, nao o link) e um titulo; nenhum repetido nem o proprio video da materia
  if (m.shorts != null) {
    if (!Array.isArray(m.shorts)) P('"shorts" deve ser uma lista: [{ "id": "ID do Short", "titulo": "Titulo do Short" }].');
    else {
      const vistos = new Set();
      m.shorts.forEach((s, i) => {
        if (s === null || typeof s !== 'object' || Array.isArray(s)) { P(`o Short ${i + 1} deve ser um objeto { "id": "...", "titulo": "..." }.`); return; }
        if (typeof s.id !== 'string' || !/^[\w-]{11}$/.test(s.id)) P(`o Short ${i + 1} precisa de "id" com o ID do video do YouTube (11 caracteres, nao o link): veio ${JSON.stringify(s.id)}.`);
        else if (s.id === id) P(`o Short ${i + 1} e o proprio video da materia (${s.id}).`);
        else if (vistos.has(s.id)) P(`o Short ${s.id} aparece mais de uma vez em "shorts".`);
        else vistos.add(s.id);
        if (!texto(s.titulo)) P(`o Short ${i + 1} precisa de "titulo" (texto).`);
        for (const k of Object.keys(s)) if (!['id', 'titulo'].includes(k)) A(`campo desconhecido no Short ${i + 1}: "${k}" (nao aparece na pagina)`);
      });
      if (m.shorts.length > LIMITE_DE_SHORTS) A(`${m.shorts.length} Shorts anexados (ate ${LIMITE_DE_SHORTS} le melhor)`);
    }
  }
  // plataforma (opcional, so serve a review que ainda NAO tem ficha de veredito: com veredito, vale veredito.plataforma): alimenta o menu de plataformas de Reviews
  if (m.plataforma != null && !texto(m.plataforma)) P('"plataforma" deve ser um texto nao vazio (ex.: "PS5" ou "PC"), ou apague o campo.');
  // assunto: texto simples em hifens, para materias do mesmo assunto casarem (um erro de digitacao cria um assunto sozinho, que nao aparece)
  if (m.assunto != null && (typeof m.assunto !== 'string' || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(m.assunto))) P(`"assunto" deve ser um texto em minusculas, sem acento e com hifens (ex.: "god-of-war-laufey"): veio ${JSON.stringify(m.assunto)}.`);
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
  // o nome do canal nunca leva til: BRUBAOGG (regra do dono). So confere o nome do canal; o apelido "Brubão" nao entra nesta checagem.
  if (/BRUB[ÃÂ]OGG|BRUBA[ÕÓ]GG/i.test(JSON.stringify(m).normalize('NFC'))) A('o nome do canal esta escrito com til/acento (BRUBÃOGG): o certo e BRUBAOGG, sem acento');
  return { problemas, avisos };
}

// ---- Assuntos: _conteudo/assuntos.json ----
// Materias de videos diferentes sobre o mesmo fato (campo "assunto" do JSON da materia) continuam cada uma com a propria pagina e se ligam pelo bloco "Mais sobre este assunto". O endereco do assunto
// (categoria/chave.html) e um redirecionamento para a materia mais nova; este arquivo e OPCIONAL e so da a pasta ("categoria") e o titulo e o resumo da previa de compartilhamento desse redirecionamento:
// { "god-of-war-laufey": { "titulo": "...", "resumo": "...", "categoria": "noticias" } }   ("categoria" e opcional: sem ela vale a da materia mais antiga do assunto)
const CHAVE_DE_ASSUNTO = /^[a-z0-9]+(-[a-z0-9]+)*$/;
/**
 * assuntos: o conteudo do arquivo (ou {}). grupos: Map chave -> [{ id, rel, dados, categoria, publicado }] das materias ATIVAS com esse "assunto".
 * enderecos: Set de "categoria/slug" ja usados (materias, enderecos antigos e retiradas): o endereco da pagina do assunto, categoria/chave, nao pode colidir.
 * Devolve { problemas, avisos, categoriaDe }: categoriaDe(chave) = a pasta da pagina do assunto.
 */
export function validarAssuntos(assuntos, grupos, enderecos = new Set()) {
  const problemas = [], avisos = [];
  const P = (msg) => problemas.push(`_conteudo/assuntos.json: ${msg}`), A = (msg) => avisos.push(`_conteudo/assuntos.json: ${msg}`);
  if (assuntos === null || typeof assuntos !== 'object' || Array.isArray(assuntos)) { P('o arquivo deve ser um objeto { "chave-do-assunto": { "titulo": "...", "resumo": "..." } }.'); assuntos = {}; }
  const categoriaDe = (chave) => {
    const a = assuntos[chave];
    if (a && typeof a === 'object' && categorias.some((c) => c.pasta === a.categoria)) return a.categoria;
    const membros = [...(grupos.get(chave) ?? [])].sort((x, y) => String(x.publicado).localeCompare(String(y.publicado)) || x.id.localeCompare(y.id));
    return membros[0]?.categoria; // a mais antiga: a pagina nao muda de pasta quando chega uma materia nova
  };
  for (const [chave, a] of Object.entries(assuntos)) {
    if (!CHAVE_DE_ASSUNTO.test(chave)) P(`a chave "${chave}" deve ser um texto em minusculas, sem acento e com hifens (ex.: "god-of-war-laufey").`);
    if (a === null || typeof a !== 'object' || Array.isArray(a)) { P(`"${chave}" deve ser um objeto { "titulo": "...", "resumo": "..." }.`); continue; }
    if (!texto(a.titulo)) P(`"${chave}": falta "titulo" (texto; ate 60 caracteres, o jogo no comeco).`);
    else if (a.titulo.length > 60) A(`"${chave}": titulo com ${a.titulo.length} caracteres (o Google corta perto de 60)`);
    if (!texto(a.resumo)) P(`"${chave}": falta "resumo" (1 ou 2 frases, ate 160 caracteres).`);
    else if (a.resumo.length > 160) A(`"${chave}": resumo com ${a.resumo.length} caracteres (a descricao do Google e cortada em 160)`);
    if (a.categoria != null && !categorias.some((c) => c.pasta === a.categoria)) P(`"${chave}": "categoria" desconhecida: ${JSON.stringify(a.categoria)} (use ${categorias.map((c) => c.pasta).join(', ')}).`);
    for (const k of Object.keys(a)) if (!['titulo', 'resumo', 'categoria'].includes(k)) A(`"${chave}": campo desconhecido "${k}" (nao aparece na pagina)`);
    const n = (grupos.get(chave) ?? []).length;
    if (n < 2) A(`"${chave}" tem ${n} materia(s) com esse assunto: so vira redirecionamento com 2 ou mais (a entrada fica sem efeito por enquanto)`);
  }
  for (const [chave, membros] of grupos) {
    if (membros.length < 2) continue;
    if (!CHAVE_DE_ASSUNTO.test(chave)) continue; // o erro ja foi dado na propria materia
    const cat = categoriaDe(chave);
    if (cat && enderecos.has(`${cat}/${chave}`)) P(`o assunto "${chave}" viraria ${cat}/${chave}.html, endereco que ja pertence a uma materia (ou foi dela). Troque a chave do assunto nas ${membros.length} materias e em assuntos.json.`);
  }
  return { problemas, avisos, categoriaDe };
}

// ---- Conteudo da Wiki: _conteudo/materias/wiki/<nome>/<nome>.json ----
// Diferente da materia: nao precisa de video (pode ser so texto), nao depende do feed do YouTube e e sempre de um jogo da Wiki. Aqui ficam as regras PROPRIAS dele e a conversao para
// o formato de materia que o resto do gerador ja entende (categoria series, formato horizontal); as regras de texto (resumo, corpo, titulo...) sao as de validarMateria.
const CAMPOS_DA_WIKI = new Set(['jogo', 'tipo', 'titulo', 'resumo', 'corpo', 'publicado', 'video', 'imagem', 'tags', 'spoiler', 'fontes', 'shorts', 'assunto', 'status', 'formato', 'categoria']);

/** Os jogos que a Wiki conhece: slug da tag -> nome. A franquia (j.tag), os jogos da `serie` (config) e as tags "filhas" (`pai` no tags.json). */
export function jogosDaWikiConfig(tagsCfg = {}) {
  const mapa = new Map();
  for (const j of WIKI.jogos) {
    mapa.set(j.tag, j.nome);
    for (const e of j.serie ?? []) { const slug = typeof e === 'string' ? e : e.tag; mapa.set(slug, (typeof e === 'object' && e.nome) || tagsCfg[slug]?.nome || slug); }
    for (const [s, c] of Object.entries(tagsCfg)) if (c?.pai === j.tag && !mapa.has(s)) mapa.set(s, c.nome ?? s);
  }
  return mapa;
}

/** Valida o que e proprio do conteudo da Wiki e devolve { problemas, avisos, m }, com m = o conteudo no formato de materia. */
export function validarWiki(e, { id, rel, tagsCfg }) {
  const problemas = [], avisos = [];
  const P = (msg) => problemas.push(`${rel}: ${msg}`), A = (msg) => avisos.push(`${rel}: ${msg}`);
  if (!/^[\w-]+$/.test(id)) P('o nome do arquivo so pode ter letras, numeros, hifen e sublinhado (ex.: resident-evil-4-leon.json). Ele e o identificador do conteudo e nao deve mudar depois.');
  const jogos = jogosDaWikiConfig(tagsCfg);
  if (!texto(e.jogo)) P('falta "jogo": o slug da tag do jogo (ex.: "resident-evil-4") ou da franquia (ex.: "resident-evil").');
  else if (!jogos.has(e.jogo)) P(`"jogo" desconhecido: ${JSON.stringify(e.jogo)}. Use um destes: ${[...jogos.keys()].join(', ')}. Para um jogo novo, acrescente uma linha em "serie" no config.mjs (WIKI.jogos).`);
  if (e.tipo != null && !Object.keys(WIKI.tipos).includes(e.tipo)) P(`"tipo" desconhecido: ${JSON.stringify(e.tipo)} (use ${Object.keys(WIKI.tipos).join(', ')}).`);
  if (e.publicado == null) P('falta "publicado" (AAAA-MM-DD): o conteudo da Wiki nao vem do feed do YouTube, a data e a que voce informa.');
  if (e.video != null && !/^[\w-]{11}$/.test(e.video)) P(`"video" deve ser o ID do video do YouTube (11 caracteres), nao o link: ${JSON.stringify(e.video)}.`);
  if (e.imagem != null && !(typeof e.imagem === 'string' && (/^\/assets\/img\/[\w\-.]+$/.test(e.imagem) || /^https:\/\/[\w.\-]+\/[\w\-./%]+$/.test(e.imagem)))) P('"imagem" deve ser um arquivo da pasta assets/img (ex.: "/assets/img/leon.jpg") ou um endereco https.');
  if (e.spoiler != null && typeof e.spoiler !== 'boolean') P('"spoiler" deve ser true ou false (sem aspas).');
  for (const k of Object.keys(e)) if (!CAMPOS_DA_WIKI.has(k)) A(`campo desconhecido "${k}" (ignorado; confira se nao e erro de digitacao)`);
  const nome = jogos.get(e.jogo);
  const tags = Array.isArray(e.tags) ? [...e.tags] : [];
  if (nome && !tags.some((x) => typeof x === 'string' && x.trim().toLowerCase() === nome.toLowerCase())) tags.push(nome); // o jogo entra nas tags sozinho
  const m = { ...e, categoria: 'series', formato: e.formato ?? 'horizontal', tags: e.tags == null || Array.isArray(e.tags) ? tags : e.tags, origem: 'wiki', tipo: e.tipo ?? 'historia' };
  return { problemas, avisos, m };
}
