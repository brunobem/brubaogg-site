// Imagens de cada materia: moram na PASTA dela (_conteudo/materias/<tipo>/<ID>/), ao lado do JSON, com nome padronizado:
//   thumb.jpg                       a miniatura do video: entra no lugar da capa do player (jpg, png ou webp). Num Short, e a imagem VERTICAL (9:16).
//   card.jpg                        a imagem HORIZONTAL (16:9) dos cartoes, do carrossel e da previa de compartilhamento. Sem card.jpg: materia horizontal usa a thumb;
//                                   Short fica com a miniatura do YouTube (a thumb vertical seria cortada no cartao).
//   img-1_arkade.com.br.jpg         a imagem 1. Noticia e lancamento: aparece DEPOIS do 1o paragrafo, img-2_... depois do 2o, e assim por diante (no lancamento cada paragrafo e um jogo).
//                                   Review: UMA IMAGEM A CADA DOIS PARAGRAFOS (img-1 depois do 2o paragrafo, img-2 depois do 4o...). Veja PARAGRAFOS_POR_IMAGEM.
//                                   "img", o numero da posicao, "_" e o SITE DA FONTE (o dominio, como arkade.com.br); a extensao e jpg, png ou webp.
// Se o arquivo existe, aparece na pagina; se nao existe, nao aparece. A fonte sai do nome do arquivo (legenda "Imagem: arkade.com.br"; vira link se o site for de uma das
// fontes da materia). Imagem de materia sem a fonte no nome NAO e aceita: o gerador para e diz qual arquivo renomear.
// As imagens originais ficam na pasta da materia (qualquer tamanho); o site publica versoes redimensionadas em assets/img/m/<ID>/ (WebP, varias larguras, nunca maiores que
// o original), feitas pelo redimensionar.py (Python com Pillow). Um cache em _conteudo/imagens.json (pelo conteudo do arquivo) evita refazer o que nao mudou.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Qualidade do WebP (0 a 100). Entra no nome publicado (junto do conteudo do arquivo): mudar este numero refaz todas as imagens e o navegador nao guarda a versao antiga.
export const QUALIDADE = 92;
export const LARGURAS = { thumb: [480, 640, 960, 1280], foto: [480, 800, 1000, 1200], card: [480, 640, 800, 1200] };
export const PASTA_PUBLICA = 'assets/img/m';
// A imagem de numero N aparece depois do paragrafo N x (paragrafos por imagem do TIPO da materia). Notícia e lançamento: 1 (uma imagem por paragrafo; no lancamento cada paragrafo e um jogo);
// review: 2 (uma imagem a cada dois paragrafos: a 1 depois do 2o, a 2 depois do 4o...). Tipo que nao esta aqui usa 1.
export const PARAGRAFOS_POR_IMAGEM = { reviews: 2 };
export const paragrafosPorImagem = (tipo) => PARAGRAFOS_POR_IMAGEM[tipo] ?? 1;
// pasta publicada da materia: o ID em minusculas (a regra do site e arquivo publicado todo em minusculas; o ID do YouTube tem maiusculas)
const pastaPublicada = (id) => id.toLowerCase();
export const PADRAO_DE_NOME = 'thumb.jpg, card.jpg  ou  img-1_arkade.com.br.jpg  (img-<posicao>_<site da fonte>.<jpg, png ou webp>)';

const THUMB = /^thumb\.(jpe?g|png|webp)$/i;
const CARD = /^card\.(jpe?g|png|webp)$/i;
const FOTO = /^img-(\d+)_(.+)\.(jpe?g|png|webp)$/i;
const SITE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/i;
const ARQUIVO_DE_IMAGEM = /\.(jpe?g|png|webp|gif|avif|bmp|tiff?|heic)$/i;
const AQUI = path.dirname(fileURLToPath(import.meta.url));

/** O que um nome de arquivo da pasta da materia significa: { tipo: 'thumb' } | { tipo: 'foto', n, fonte } | { tipo: 'invalido', motivo } | { tipo: 'outro' } (nao e imagem: ignorado). */
export function classificarArquivo(nome) {
  if (THUMB.test(nome)) return { tipo: 'thumb' };
  if (CARD.test(nome)) return { tipo: 'card' };
  const f = nome.match(FOTO);
  if (f) {
    const n = Number(f[1]), fonte = f[2].toLowerCase();
    if (n < 1 || n > 20) return { tipo: 'invalido', motivo: `a posicao ${f[1]} nao vale (use de 1 a 20: a ordem da imagem no texto)` };
    if (!SITE.test(fonte)) return { tipo: 'invalido', motivo: `"${f[2]}" no nome nao parece o site da fonte (use o dominio, como arkade.com.br)` };
    return { tipo: 'foto', n, fonte };
  }
  if (/^img-\d+\.[a-z0-9]+$/i.test(nome) || /^img-\d+_?\.[a-z0-9]+$/i.test(nome)) return { tipo: 'invalido', motivo: 'falta o site da fonte no nome (img-1_arkade.com.br.jpg): toda imagem precisa de credito' };
  if (ARQUIVO_DE_IMAGEM.test(nome)) return { tipo: 'invalido', motivo: `nome fora do padrao. Use ${PADRAO_DE_NOME}` };
  return { tipo: 'outro' };
}

export const ARQUIVO_DE_ALT = "texto-alternativo.txt";
/** Le o texto-alternativo.txt da pasta da materia: linhas "nome-do-arquivo: descricao" (linha com # no comeco e comentario). Devolve Map nome em minusculas -> texto. */
export function lerTextosAlternativos(c) {
  const mapa = new Map();
  let texto;
  try { texto = fs.readFileSync(path.join(c.pasta, ARQUIVO_DE_ALT), "utf8"); } catch { return mapa; }
  for (const linha of texto.split(/\r?\n/)) {
    const l = linha.trim();
    if (!l || l.startsWith("#")) continue;
    const i = l.indexOf(": ");
    if (i < 1) continue;
    const t = l.slice(i + 2).trim();
    if (t) mapa.set(l.slice(0, i).trim().toLowerCase(), t);
  }
  return mapa;
}

/** As imagens da pasta de uma materia: { thumb: arquivo|null, card: arquivo|null, fotos: [{ n, fonte, arquivo }], problemas: [texto] }. `c` = um item de listarConteudos (pastas.mjs). */
export function lerImagensDaPasta(c) {
  const r = { thumb: null, card: null, fotos: [], problemas: [] };
  const relPasta = c.rel.slice(0, c.rel.lastIndexOf('/'));
  for (const nome of fs.readdirSync(c.pasta).sort()) {
    if (nome === `${c.id}.json` || fs.statSync(path.join(c.pasta, nome)).isDirectory()) continue;
    const k = classificarArquivo(nome);
    const onde = `${relPasta}/${nome}`;
    if (k.tipo === 'invalido') r.problemas.push(`${onde}: ${k.motivo}.`);
    else if (k.tipo === 'thumb') { if (r.thumb) r.problemas.push(`${onde}: ja existe outra thumb nesta pasta (${path.basename(r.thumb)}); deixe so uma.`); else r.thumb = path.join(c.pasta, nome); }
    else if (k.tipo === 'card') { if (r.card) r.problemas.push(`${onde}: ja existe outro card nesta pasta (${path.basename(r.card)}); deixe so um.`); else r.card = path.join(c.pasta, nome); }
    else if (k.tipo === 'foto') {
      const antes = r.fotos.find((x) => x.n === k.n);
      if (antes) r.problemas.push(`${onde}: a posicao ${k.n} ja tem imagem (${path.basename(antes.arquivo)}); deixe so uma por posicao.`);
      else r.fotos.push({ n: k.n, fonte: k.fonte, arquivo: path.join(c.pasta, nome) });
    }
  }
  r.fotos.sort((a, b) => a.n - b.n);
  return r;
}

// ---- Python com Pillow ----
function acharPython() {
  for (const cmd of [['python'], ['py', '-3'], ['python3']]) {
    const t = spawnSync(cmd[0], [...cmd.slice(1), '-c', 'import PIL'], { encoding: 'utf8', timeout: 20000 });
    if (t.status === 0) return cmd;
  }
  return null;
}
function redimensionar(jobs) { // -> [{ w, a, ls } | { erro }] ou lanca Error com a explicacao
  const py = acharPython();
  if (!py) throw new Error('para redimensionar as imagens preciso do Python 3 com a biblioteca Pillow (instale com: python -m pip install pillow).');
  const r = spawnSync(py[0], [...py.slice(1), path.join(AQUI, 'redimensionar.py')], { input: JSON.stringify(jobs), encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 10 * 60 * 1000 });
  if (r.status !== 0) throw new Error(`o redimensionar.py falhou: ${(r.stderr || r.stdout || '').trim().slice(0, 300)}`);
  return JSON.parse(r.stdout);
}

// o nome publicado muda quando muda o arquivo, a qualidade ou a lista de larguras (o navegador nunca guarda a versao antiga)
const hashDe = (arquivo, larguras) => crypto.createHash('sha1').update(fs.readFileSync(arquivo)).update(`q${QUALIDADE}:${larguras.join(',')}`).digest('hex').slice(0, 8);

/**
 * Descobre as imagens de todas as materias, redimensiona o que mudou e devolve { porId: Map id -> { thumb, fotos: Map n -> { base, w, a, ls, fonte } }, problemas }.
 * `base` e o nome publicado sem a largura (a versao de 800 px e assets/img/m/<id>/<base>-800.webp). Sem imagem nenhuma, nao chama o Python.
 */
export function prepararImagens(site, conteudos) {
  const problemas = [], avisos = [], porId = new Map(), jobs = [];
  const arqCache = path.join(site, '_conteudo', 'imagens.json');
  let cache = {};
  try { cache = JSON.parse(fs.readFileSync(arqCache, 'utf8')); } catch { cache = {}; }
  const novoCache = {};
  const aFazer = []; // { id, chave, registro, fonte? } na ordem dos jobs
  for (const c of conteudos) {
    const li = lerImagensDaPasta(c);
    problemas.push(...li.problemas);
    const itens = [...(li.thumb ? [{ chave: 'thumb', arquivo: li.thumb, larguras: LARGURAS.thumb, prefixo: 'thumb' }] : []), ...(li.card ? [{ chave: 'card', arquivo: li.card, larguras: LARGURAS.card, prefixo: 'card' }] : []), ...li.fotos.map((f) => ({ chave: `img-${f.n}`, arquivo: f.arquivo, larguras: LARGURAS.foto, prefixo: `img-${f.n}`, n: f.n, fonte: f.fonte }))];
    if (!itens.length) continue;
    const alts = lerTextosAlternativos(c), usados = new Set();
    const outro = [...porId.keys()].find((x) => pastaPublicada(x) === pastaPublicada(c.id));
    if (outro) { problemas.push(`imagens: as materias ${outro} e ${c.id} so diferem na caixa; as imagens publicadas dividiriam a mesma pasta (assets/img/m/${pastaPublicada(c.id)}).`); continue; }
    const registro = { thumb: null, card: null, cartao: null, fotos: new Map(), aCada: paragrafosPorImagem(c.tipo) };
    for (const it of itens) {
      const h = hashDe(it.arquivo, it.larguras), base = `${it.prefixo}-${h}`, dir = path.join(site, PASTA_PUBLICA, pastaPublicada(c.id));
      const velho = cache[c.id]?.[it.chave];
      const nomeArq = path.basename(it.arquivo).toLowerCase(), alt = alts.get(nomeArq) ?? "";
      if (alt) usados.add(nomeArq); else avisos.push(`${path.relative(site, it.arquivo).split(path.sep).join("/")}: sem texto alternativo (linha "${path.basename(it.arquivo)}: descricao" em ${ARQUIVO_DE_ALT}, na mesma pasta).`);
      const info = { base, h, fonte: it.fonte, alt, w: 0, a: 0, ls: [] };
      if (velho && velho.h === h && Array.isArray(velho.ls) && velho.ls.length && velho.ls.every((w) => fs.existsSync(path.join(dir, `${base}-${w}.webp`)))) Object.assign(info, { w: velho.w, a: velho.a, ls: velho.ls });
      else { jobs.push({ src: it.arquivo, larguras: it.larguras, qualidade: QUALIDADE, modelo: path.join(dir, `${base}-{w}.webp`) }); aFazer.push({ info, onde: path.relative(site, it.arquivo).split(path.sep).join('/') }); }
      if (it.chave === 'thumb') registro.thumb = info; else if (it.chave === 'card') registro.card = info; else registro.fotos.set(it.n, info);
      (novoCache[c.id] ??= {})[it.chave] = info;
    }
    for (const nome of alts.keys()) if (!usados.has(nome)) avisos.push(`${path.relative(site, c.pasta).split(path.sep).join("/")}/${ARQUIVO_DE_ALT}: a linha "${nome}" nao tem imagem com esse nome na pasta.`);
    // imagem dos cartoes: o card.jpg; sem ele, a thumb de uma materia horizontal; num Short a thumb e vertical e nao serve (o cartao e 16:9): fica a miniatura do YouTube
    if (registro.card) registro.cartao = registro.card;
    else if (registro.thumb) { let formato; try { formato = JSON.parse(fs.readFileSync(c.arquivo, 'utf8')).formato; } catch { formato = undefined; } if (formato !== 'short') registro.cartao = registro.thumb; }
    porId.set(c.id, registro);
  }
  if (jobs.length) {
    let res = [];
    try { res = redimensionar(jobs); } catch (e) { problemas.push(`imagens: ${e.message}`); }
    res.forEach((r, i) => {
      const { info, onde } = aFazer[i];
      if (r.erro) problemas.push(`${onde}: nao consegui abrir a imagem (${r.erro}).`);
      else Object.assign(info, { w: r.w, a: r.a, ls: r.ls });
    });
  }
  // so guarda o cache (e limpa) quando tudo deu certo: o que falhou continua sendo refeito na proxima vez
  if (!problemas.length) {
    const limpo = {};
    for (const [id, chaves] of Object.entries(novoCache)) for (const [chave, i] of Object.entries(chaves)) (limpo[id] ??= {})[chave] = { h: i.h, w: i.w, a: i.a, ls: i.ls };
    const texto = `${JSON.stringify(limpo, null, 1)}\n`;
    if (!fs.existsSync(arqCache) || fs.readFileSync(arqCache, 'utf8') !== texto) { if (Object.keys(limpo).length || fs.existsSync(arqCache)) fs.writeFileSync(arqCache, texto); }
    limparPublicadas(site, Object.fromEntries(Object.entries(novoCache).map(([id, v]) => [pastaPublicada(id), v])));
  }
  return { porId, problemas, avisos };
}

// apaga de assets/img/m/ o que nao esta mais em uso (imagem trocada ou retirada da pasta da materia): so o que o proprio gerador criou ali
function limparPublicadas(site, uso) {
  const raiz = path.join(site, PASTA_PUBLICA);
  if (!fs.existsSync(raiz)) return;
  for (const id of fs.readdirSync(raiz)) {
    const dir = path.join(raiz, id);
    if (!fs.statSync(dir).isDirectory()) continue;
    const usados = new Set(Object.values(uso[id] ?? {}).flatMap((i) => i.ls.map((w) => `${i.base}-${w}.webp`)));
    for (const f of fs.readdirSync(dir)) if (!usados.has(f)) fs.rmSync(path.join(dir, f), { force: true });
    if (!fs.readdirSync(dir).length) fs.rmdirSync(dir);
  }
  if (!fs.readdirSync(raiz).length) fs.rmdirSync(raiz);
}

// ---- HTML ----
const url = (id, base, w, prefixo) => `${prefixo}${PASTA_PUBLICA}/${pastaPublicada(id)}/${base}-${w}.webp`;
/** srcset e a imagem de reserva (src) de uma imagem preparada. `prefixo` = '../' nas paginas de pasta. `alvo` = a largura que o src deve ter (a maior que nao passa dela). */
export function fonteDaImagem(id, info, prefixo, alvo) {
  const ls = info.ls, w = [...ls].reverse().find((x) => x <= alvo) ?? ls[0];
  return { src: url(id, info.base, w, prefixo), srcset: ls.map((x) => `${url(id, info.base, x, prefixo)} ${x}w`).join(', '), w, h: Math.max(1, Math.round((w * info.a) / info.w)) };
}
