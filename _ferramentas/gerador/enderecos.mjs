// REGISTRO DE ENDERECOS: _conteudo/enderecos.json
// Guarda, para cada materia, o endereco (slug), a categoria e a data de publicacao. E o que torna a materia INDEPENDENTE do feed
// do YouTube (que so traz os 15 videos mais recentes) e do titulo do video (que pode mudar nos testes A/B).
//   - nasce na aprovacao (npm run aprovar) ou, se faltar, na primeira geracao; o endereco vem do TITULO DA MATERIA e depois fica FIXO
//   - fica fora do JSON da materia de proposito: se a outra sessao regravar o texto, o endereco ja publicado nao se perde
//   - "antigos": enderecos que a materia ja teve; viram paginas de redirecionamento (o GitHub Pages nao redireciona sozinho)
//   - "retirada": data em que a materia foi tirada do ar de proposito (npm run retirar); o endereco passa a levar para a lista
// { "<ID do video>": { "categoria": "noticias", "publicado": "2026-09-25T20:02:19Z", "slug": "...", "antigos": ["..."], "retirada": "2026-10-07" } }
import fs from 'node:fs';
import path from 'node:path';
import { categorias } from './config.mjs';
import { dataDePublicacao } from './contrato.mjs';
import { ErroDeDados, limparTitulo, lerJson, slugBase } from './util.mjs';

const MAX_SLUG = 60;

/** Endereco a partir do titulo da materia: sem acento, ate 60 letras, cortado em palavra inteira. */
export function slugDeTitulo(titulo) {
  const cheio = slugBase(limparTitulo(String(titulo)));
  if (cheio.length <= MAX_SLUG) return cheio || 'materia';
  const corte = cheio.slice(0, MAX_SLUG);
  const i = corte.lastIndexOf('-');
  return (i > MAX_SLUG * 0.5 ? corte.slice(0, i) : corte).replace(/-+$/g, '');
}

const arquivo = (site) => path.join(site, '_conteudo', 'enderecos.json');
export const lerRegistro = (site) => (fs.existsSync(arquivo(site)) ? lerJson(arquivo(site), '_conteudo/enderecos.json') : {});

/** Grava com as chaves em ordem (diferencas pequenas no Git) e de forma segura (arquivo temporario + troca). Devolve true se mudou. */
export function gravarRegistro(site, registro) {
  const ordenado = Object.fromEntries(Object.keys(registro).sort().map((k) => [k, registro[k]]));
  const conteudo = `${JSON.stringify(ordenado, null, 1)}\n`;
  const f = arquivo(site);
  if (fs.existsSync(f) && fs.readFileSync(f, 'utf8') === conteudo) return false;
  fs.mkdirSync(path.dirname(f), { recursive: true });
  const tmp = `${f}.tmp`;
  fs.writeFileSync(tmp, conteudo, 'utf8');
  fs.renameSync(tmp, f);
  return true;
}

/** id do video -> { playlist, published } a partir do playlists.json */
export function feedPorId(playlists) {
  const mapa = new Map();
  for (const [playlist, videos] of Object.entries(playlists)) for (const v of videos) mapa.set(v.id, { playlist, published: v.published, title: v.title });
  return mapa;
}

/** Paginas de materia que ja existem no disco: id -> { categoria, slug }. Serve para NAO mudar o endereco de quem ja esta no ar. */
export function indiceDoDisco(site) {
  const mapa = new Map();
  for (const c of categorias) {
    const dir = path.join(site, c.pasta);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(dir, f), 'utf8');
      if (html.includes('http-equiv="refresh"') || html.includes('content="noindex"')) continue; // redirecionamento ou pagina de teste
      const id = (html.match(/youtube-nocookie\.com\/embed\/([\w-]{11})/) ?? [])[1];
      if (id) mapa.set(id, { categoria: c.pasta, slug: f.slice(0, -5) });
    }
  }
  return mapa;
}

const ocupado = (registro, id, categoria, slug) =>
  Object.entries(registro).some(([k, e]) => k !== id && e.categoria === categoria && (e.slug === slug || (e.antigos ?? []).includes(slug)));

/** Cria o endereco de uma materia. `doDisco` (opcional) = indiceDoDisco: se a pagina ja esta no ar, mantem o endereco dela. */
export function novoEndereco({ id, m, rel, registro, feed, doDisco = null }) {
  const noFeed = feed.get(id);
  let categoria = noFeed ? categorias.find((c) => c.playlist === noFeed.playlist)?.pasta : undefined;
  let publicado = noFeed?.published;
  const avisos = [];
  if (categoria) { // video no feed: categoria e data vem do YouTube
    if (m.categoria != null && m.categoria !== categoria) avisos.push(`${rel}: "categoria" (${m.categoria}) discorda da playlist do YouTube (${categoria}); vale a da playlist`);
  } else { // video antigo (fora dos 15 mais recentes): o arquivo informa
    const cat = categorias.find((c) => c.pasta === m.categoria);
    const data = dataDePublicacao(m.publicado);
    if (!cat || !data) {
      throw new ErroDeDados(`${rel}: esse video nao esta entre os 15 mais recentes da playlist, entao o arquivo precisa de "categoria" (${categorias.map((c) => c.pasta).join(', ')}) e "publicado" (AAAA-MM-DD).`);
    }
    categoria = cat.pasta;
    publicado = data.toISOString().replace('.000Z', 'Z');
  }
  const noDisco = doDisco?.get(id);
  let slug;
  if (noDisco && noDisco.categoria === categoria) slug = noDisco.slug; // ja esta no ar: o endereco nao muda
  else {
    const base = slugDeTitulo(m.titulo ?? noFeed?.title ?? id);
    slug = base;
    for (let n = 4; ocupado(registro, id, categoria, slug); n++) slug = `${base}-${id.slice(0, n).toLowerCase()}`;
  }
  return { endereco: { categoria, publicado, slug }, avisos };
}

/** Muda o endereco de uma materia ja registrada; o endereco velho vira redirecionamento. */
export function mudarEndereco(registro, id, titulo) {
  const e = registro[id];
  const base = slugDeTitulo(titulo);
  let slug = base;
  for (let n = 4; ocupado(registro, id, e.categoria, slug); n++) slug = `${base}-${id.slice(0, n).toLowerCase()}`;
  if (slug === e.slug) return false;
  e.antigos = [...new Set([...(e.antigos ?? []), e.slug])].filter((s) => s !== slug);
  e.slug = slug;
  return true;
}
