// Paginas de player (cortes.html e lives.html): cada playlist de PLAYERS (config.mjs) com o player, o texto e a lista dos ultimos videos (assets/data/players.json).
// Confere o que o gerador fez (marcadores, um bloco por playlist, a lista certa, os links) e o proprio players.json.
import { achado, decodificar, existe, ler, limparHtml } from './lib.mjs';
import { PLAYERS, VIDEOS_POR_PLAYER } from '../../gerador/config.mjs';

const T = 'player';
const ID_DE_VIDEO = /^[\w-]{11}$/;
const texto = (s) => decodificar(String(s ?? '').replace(/<[^>]+>/g, '')).trim();

export default async function () {
  const a = [];
  const dados = existe('assets/data/players.json') ? JSON.parse(ler('assets/data/players.json')) : null;
  if (!dados) a.push(achado('alto', T, 'assets/data/players.json nao existe (rode: node _ferramentas/atualizar-videos.mjs --players): as paginas Cortes e Lives ficam so com os players'));

  // ---------- 1) o arquivo de dados ----------
  for (const [playlist, videos] of Object.entries(dados ?? {})) {
    if (!Array.isArray(videos) || !videos.length) { a.push(achado('medio', T, `playlist ${playlist} sem videos em players.json`, 'assets/data/players.json')); continue; }
    const vistos = new Set();
    for (const v of videos) {
      if (!ID_DE_VIDEO.test(v.id ?? '')) a.push(achado('alto', T, `video com ID invalido em players.json: ${JSON.stringify(v.id)}`, 'assets/data/players.json'));
      if (typeof v.title !== 'string' || !v.title.trim()) a.push(achado('alto', T, `video ${v.id} sem titulo em players.json`, 'assets/data/players.json'));
      if (Number.isNaN(Date.parse(v.published))) a.push(achado('alto', T, `video ${v.id} com data invalida em players.json: ${v.published}`, 'assets/data/players.json'));
      if (vistos.has(v.id)) a.push(achado('medio', T, `video ${v.id} repetido na playlist ${playlist}`, 'assets/data/players.json'));
      vistos.add(v.id);
    }
  }

  // ---------- 2) as paginas ----------
  let blocos = 0, itensTotal = 0;
  for (const [pagina, lista] of Object.entries(PLAYERS)) {
    if (!existe(pagina)) { a.push(achado('alto', T, 'pagina de player nao existe', pagina)); continue; }
    const bruto = ler(pagina), html = limparHtml(bruto);
    const [ini, fim] = [bruto.indexOf('<!--players:inicio-->'), bruto.indexOf('<!--players:fim-->')];
    if (ini < 0 || fim < ini) { a.push(achado('alto', T, 'faltam (ou estao fora de ordem) os marcadores <!--players:inicio--> e <!--players:fim-->', pagina)); continue; }
    if ((bruto.match(/<section class="pls">/g) ?? []).length !== 1) a.push(achado('medio', T, 'a pagina deve ter uma so secao class="pls" (sobrou o bloco antigo escrito a mao?)', pagina));
    const artigos = bruto.slice(ini, fim).split('<article class="pl">').slice(1);
    if (artigos.length !== lista.length) a.push(achado('alto', T, `${artigos.length} playlist(s) na pagina e ${lista.length} em PLAYERS (config.mjs)`, pagina));
    lista.forEach((p, i) => {
      const art = artigos[i]; if (!art) return; blocos++;
      const h2 = texto((art.match(/<h2>([\s\S]*?)<\/h2>/) ?? [])[1]), par = texto((art.match(/<\/h2>\s*<p>([\s\S]*?)<\/p>/) ?? [])[1]);
      if (h2 !== p.titulo) a.push(achado('alto', T, `titulo "${h2}" e o de PLAYERS e "${p.titulo}"`, pagina));
      if (par !== p.texto) a.push(achado('medio', T, `texto "${par}" difere do de PLAYERS ("${p.texto}")`, pagina));
      // o player e uma FACHADA (link com miniatura e play); o iframe so nasce no clique (fachada.js)
      if (/<iframe/.test(art)) a.push(achado('alto', T, `"${p.titulo}" tem iframe no HTML: o player do YouTube deve nascer so no clique (fachada)`, pagina));
      const fachada = art.match(/<div class="video"><a class="fachada" href="https:\/\/www\.youtube\.com\/playlist\?list=([\w-]+)" target="_blank" rel="noopener" data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/videoseries\?list=([\w-]+)" data-titulo="([^"]*)" aria-label="Assistir: ([^"]*)">(<img src="([^"]*)" alt="" loading="lazy" width="480" height="360">)?<span class="fachada-play">/);
      if (!fachada || fachada[1] !== p.playlist || fachada[2] !== p.playlist) a.push(achado('alto', T, `a fachada do player de "${p.titulo}" nao existe ou nao aponta (link e player) para a playlist ${p.playlist}`, pagina));
      else {
        if (texto(fachada[3]) !== p.titulo || texto(fachada[4]) !== p.titulo) a.push(achado('medio', T, `titulo da fachada de "${p.titulo}" difere do de PLAYERS ("${texto(fachada[3])}")`, pagina));
        const primeiro = (dados?.[p.playlist] ?? [])[0];
        if (primeiro && fachada[6] !== `https://i.ytimg.com/vi/${primeiro.id}/hqdefault.jpg`) a.push(achado('medio', T, `a miniatura da fachada de "${p.titulo}" devia ser a do primeiro video da playlist (${primeiro.id})`, pagina));
      }
      if (!art.includes(`<a class="btn" href="https://www.youtube.com/playlist?list=${p.playlist}" target="_blank" rel="noopener" aria-label="Ver playlist completa no YouTube: `)) a.push(achado('alto', T, `o botao "Ver playlist completa" de "${p.titulo}" nao leva para a playlist`, pagina));
      // a lista dos ultimos videos
      const esperados = (dados?.[p.playlist] ?? []).slice(0, VIDEOS_POR_PLAYER);
      const itens = [...art.matchAll(/<li><a href="([^"]+)" target="_blank" rel="noopener"><span class="pl-thumb"><img src="([^"]+)" alt="" loading="lazy" width="160" height="90"><\/span><span class="pl-texto"><b>([\s\S]*?)<\/b><small>([^<]*)<\/small><\/span><span class="sr-only"> \(abre o YouTube em nova aba\)<\/span><\/a><\/li>/g)];
      const totalLi = (art.match(/<li>/g) ?? []).length;
      if (esperados.length && !itens.length) a.push(achado('alto', T, `"${p.titulo}" nao mostra a lista dos ultimos videos (players.json tem ${esperados.length})`, pagina));
      if (!esperados.length && dados) a.push(achado('medio', T, `"${p.titulo}" sem lista de videos: a playlist ${p.playlist} nao esta em players.json (rode: node _ferramentas/atualizar-videos.mjs --players)`, pagina));
      if (!esperados.length && itens.length) a.push(achado('alto', T, `"${p.titulo}" mostra ${itens.length} video(s) que nao estao em players.json (pagina e dados fora de sincronia: rode npm run gerar)`, pagina));
      if (itens.length !== totalLi) a.push(achado('alto', T, `${totalLi - itens.length} item(ns) da lista de "${p.titulo}" fora do formato esperado (link em nova aba, miniatura, titulo, data)`, pagina));
      if (esperados.length && itens.length !== esperados.length) a.push(achado('alto', T, `"${p.titulo}" lista ${itens.length} video(s) e deveria listar ${esperados.length} (os ${VIDEOS_POR_PLAYER} primeiros de players.json)`, pagina));
      itens.forEach((m, k) => {
        itensTotal++; const v = esperados[k]; if (!v) return;
        if (m[1] !== `https://www.youtube.com/watch?v=${v.id}&amp;list=${p.playlist}`) a.push(achado('alto', T, `video ${k + 1} de "${p.titulo}" leva para ${m[1]} (o certo e o video ${v.id} dentro da playlist)`, pagina));
        if (m[2] !== `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`) a.push(achado('medio', T, `miniatura do video ${k + 1} de "${p.titulo}" nao e a do video ${v.id}`, pagina));
        if (texto(m[3]) !== v.title.trim()) a.push(achado('alto', T, `titulo do video ${k + 1} de "${p.titulo}" difere do feed: "${texto(m[3])}" x "${v.title}"`, pagina));
        if (!/\d{2} de [a-zç]{3}\. de \d{4}|\d{1,2} de [a-zç]+\.? de \d{4}/i.test(m[4])) a.push(achado('medio', T, `data do video ${k + 1} de "${p.titulo}" com formato estranho: "${m[4]}"`, pagina));
      });
    });
    if (!/<script src="assets\/js\/fachada\.js" defer><\/script>/.test(bruto)) a.push(achado('alto', T, 'pagina sem <script src="assets/js/fachada.js" defer>: o clique na fachada nao toca o video aqui mesmo (so abre o YouTube)', pagina));
    if (/<h3 class="pl-recentes">/.test(html) === false && Object.keys(dados ?? {}).length) a.push(achado('alto', T, 'nenhuma lista "Ultimos videos" na pagina', pagina));
  }
  a.push(achado('info', T, `${Object.keys(PLAYERS).length} paginas de player, ${blocos} playlists, ${itensTotal} videos listados (ate ${VIDEOS_POR_PLAYER} por playlist)`));
  return a;
}
