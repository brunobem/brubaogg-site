// Fim da pagina da materia: compartilhar (WhatsApp, Telegram, "Copiar link", "Mais opcoes"), convite para o canal e "relacionadas" que atravessam categorias.
// Estatico: le as paginas geradas. Comportamento: roda assets/js/compartilhar.js no navegador de mentira (dom-falso.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { achado, arquivoDe, urlPublica, arquivosPublicados, assuntosDoSite, conteudosDaWiki, decodificar, existe, ler, limparHtml, materias, paginasHtml, raiz, DOMINIO } from './lib.mjs';
import { AUTOR, AUTOR_FOTO, PALAVRAS_POR_MINUTO, RECOMENDACOES, categorias } from '../../gerador/config.mjs';
import { esperar, montarPagina, rodarScript } from './dom-falso.mjs';

const T = 'materia';
const PASTAS = ['noticias', 'reviews', 'lancamentos', 'gta6-novidades', 'series'];
const CANAL = 'https://youtube.com/@brubaogg?sub_confirmation=1';
// os enderecos de todos os blocos de uma lista (assets/data/colecao/<id>/1.json, 2.json...)
const paginasEmBlocos = (dir) => fs.readdirSync(path.join(raiz, dir)).filter((f) => f.endsWith('.json')).flatMap((f) => JSON.parse(ler(`${dir}/${f}`)).map((i) => i.u));
const nomesDasTags = (h) => [...((h.match(/<ul class="tag-list"[\s\S]*?<\/ul>/) ?? [''])[0]).matchAll(/<\/svg> ([^<]+)<\/(?:a|span)>/g)].map((m) => decodificar(m[1]).trim()).filter((t) => !/^Wiki /.test(t));

export default async function () {
  const a = [];
  const paginas = paginasHtml().filter((r) => PASTAS.includes(r.split('/')[0]) && r.split('/').length === 2).map((rel) => ({ rel, bruto: ler(rel) })).filter(({ bruto }) => !/http-equiv="refresh"/.test(bruto));
  if (!paginas.length) return [achado('alto', T, 'nenhuma pagina de materia encontrada')];

  // o JSON de cada pagina (pelo registro de enderecos): o que a pagina mostra tem que ser o que o JSON diz
  const registro = JSON.parse(ler('_conteudo/enderecos.json'));
  const jsons = new Map([...materias(), ...conteudosDaWiki()].filter((x) => x.dados).map((x) => [x.id, x.dados]));
  const jsonDaPagina = new Map(), idDaPagina = new Map();
  for (const [id, e] of Object.entries(registro)) if (!e.retirada) { const rel = `${e.categoria}/${e.slug}.html`; idDaPagina.set(rel, id); if (jsons.has(id)) jsonDaPagina.set(rel, jsons.get(id)); }

  // ---------- 1) o que cada pagina tem no fim ----------
  const dados = new Map();
  for (const { rel, bruto } of paginas) {
    const h = limparHtml(bruto);
    const canonical = (h.match(/<link rel="canonical" href="([^"]+)"/) ?? [])[1];
    const titulo = decodificar((h.match(/<h1 class="art-title">([^<]*)<\/h1>/) ?? [])[1] ?? '');
    const relacionadas = (h.match(/<section class="related"(?! data-irmas)[\s\S]*?<\/section>/) ?? [''])[0]; // so o "Veja tambem": o bloco do assunto (data-irmas) e conferido em 1d
    const alvos = [...relacionadas.matchAll(/<a class="news-card[^"]*" href="\.\.\/([^"]+)"/g)].map((m) => arquivoDe(m[1]));
    const irmas = [...((h.match(/<section class="related" data-irmas[\s\S]*?<\/section>/) ?? [''])[0]).matchAll(/<a class="news-card[^"]*" href="\.\.\/([^"]+)"/g)].map((m) => arquivoDe(m[1])); // links do bloco "Mais sobre este assunto"
    dados.set(rel, { rel, h, canonical, titulo, publicado: (h.match(/<p class="autoria"[^>]*>[\s\S]*?<time[^>]*datetime="([^"]+)"/) ?? [])[1], tags: nomesDasTags(h), alvos, irmas, titSecao: decodificar((relacionadas.match(/class="section-title">([^<]*)</) ?? [])[1] ?? '') });

    const blocos = h.match(/<section class="compartilhar"[\s\S]*?<\/section>/g) ?? [];
    if (blocos.length !== 1) { a.push(achado('alto', T, `${blocos.length} bloco(s) "compartilhar" (deve ter 1)`, rel)); continue; }
    const b = blocos[0];
    if (!/data-pagefind-ignore/.test(b.split('>')[0])) a.push(achado('medio', T, 'o bloco de compartilhar entra no indice da busca (falta data-pagefind-ignore)', rel));
    const wa = b.match(/<a class="btn" href="https:\/\/wa\.me\/\?text=([^"]*)" target="_blank" rel="noopener">/);
    const tg = b.match(/<a class="btn" href="https:\/\/t\.me\/share\/url\?url=([^&"]*)&amp;text=([^"]*)" target="_blank" rel="noopener">/);
    if (!wa) a.push(achado('alto', T, 'falta o link do WhatsApp (https://wa.me/?text=..., target=_blank rel=noopener)', rel));
    else if (decodeURIComponent(wa[1]) !== `${titulo} ${canonical}`) a.push(achado('alto', T, `o WhatsApp compartilha "${decodeURIComponent(wa[1])}" e o certo e "${titulo} ${canonical}"`, rel));
    if (!tg) a.push(achado('alto', T, 'falta o link do Telegram (https://t.me/share/url?url=...&text=..., target=_blank rel=noopener)', rel));
    else if (decodeURIComponent(tg[1]) !== canonical || decodeURIComponent(tg[2]) !== titulo) a.push(achado('alto', T, 'o Telegram nao compartilha o endereco e o titulo da pagina', rel));
    for (const atributo of ['data-copiar', 'data-compartilhar']) if (!new RegExp(`<button class="btn" type="button" ${atributo} hidden>`).test(b)) a.push(achado('alto', T, `o botao ${atributo} precisa existir e nascer escondido (so o JavaScript o mostra)`, rel));
    if (!/<p class="compartilhar-aviso" role="status"><\/p>/.test(b)) a.push(achado('medio', T, 'falta o aviso role="status" (o leitor de tela nao anuncia "Link copiado")', rel));
    const idTitulo = (b.match(/aria-labelledby="([^"]+)"/) ?? [])[1];
    if (!idTitulo || !new RegExp(`id="${idTitulo}"`).test(b)) a.push(achado('medio', T, 'o bloco de compartilhar nao tem titulo ligado por aria-labelledby', rel));
    if (!/<script src="\.\.\/assets\/js\/compartilhar\.js" defer><\/script>/.test(bruto)) a.push(achado('alto', T, 'falta <script src="../assets/js/compartilhar.js" defer>: os botoes Copiar link e Mais opcoes nunca aparecem', rel));

    // fachada do player: link com miniatura e play (o iframe so nasce no clique, fachada.js); materia sem video (Wiki so de texto) nao tem nem o player nem o script.
    // Os Shorts anexados ("shorts" do JSON) tambem usam fachada: cada um conta uma a mais.
    const fachadas = h.match(/<a class="fachada"[^>]*>/g) ?? [], temScript = /<script src="\.\.\/assets\/js\/fachada\.js" defer><\/script>/.test(bruto);
    const nShorts = jsonDaPagina.get(rel)?.shorts?.length ?? 0, temPrincipal = fachadas.length > nShorts;
    if (/<iframe/.test(h)) a.push(achado('alto', T, 'a pagina tem iframe no HTML: o player do YouTube deve nascer so no clique (fachada)', rel));
    if (fachadas.length > 1 + nShorts) a.push(achado('alto', T, `${fachadas.length} fachadas de player (deve ter 1${nShorts ? ` + ${nShorts} Short(s) anexado(s)` : ''})`, rel));
    if (!fachadas.length) { if (temScript) a.push(achado('medio', T, 'carrega fachada.js mas nao tem player', rel)); }
    else {
      const m = h.match(/<div class="art-video(?: is-short)?" id="video"><a class="fachada" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})" target="_blank" rel="noopener" data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})" data-titulo="([^"]*)" aria-label="Assistir: ([^"]*)">(?:<img src="https:\/\/i\.ytimg\.com\/vi\/([\w-]{11})\/hqdefault\.jpg" alt="" fetchpriority="high" width="480" height="360">|<img src="\.\.\/assets\/img\/m\/([a-z0-9_-]{11})\/thumb-[0-9a-f]{8}-\d+\.webp" srcset="[^"]+" sizes="[^"]+" alt="[^"]*" fetchpriority="high" width="\d+" height="\d+">)<span class="fachada-play"><svg [^>]*>[\s\S]*?<\/svg><\/span><\/a><\/div>/);
      if (!temPrincipal) { /* pagina so de texto com Shorts anexados: sem player principal (os Shorts sao conferidos abaixo) */ }
      else if (!m) a.push(achado('alto', T, 'a fachada do player esta fora do formato (link para o video em nova aba, data-embed, data-titulo, aria-label, miniatura e botao de play)', rel));
      else {
        if (new Set([m[1], m[2], m[5] ?? m[6]].map((x) => x.toLowerCase())).size !== 1) a.push(achado('alto', T, `a fachada mistura videos: link ${m[1]}, player ${m[2]}, miniatura ${m[5] ?? m[6]}`, rel));
        if (decodificar(m[3]) !== titulo || decodificar(m[4]) !== titulo) a.push(achado('medio', T, 'o titulo da fachada difere do titulo da pagina', rel));
        const ld = (bruto.match(/"embedUrl":"https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})"/) ?? [])[1];
        if (ld && ld !== m[2]) a.push(achado('alto', T, `o VideoObject aponta para o video ${ld} e a fachada toca o ${m[2]}`, rel));
      }
      if (!temScript) a.push(achado('alto', T, 'falta <script src="../assets/js/fachada.js" defer>: o clique na fachada so abre o YouTube em vez de tocar aqui', rel));
    }

    const convites = h.match(/<div class="convite"[\s\S]*?<\/div>/g) ?? [];
    if (convites.length !== 1) a.push(achado('alto', T, `${convites.length} convite(s) para o canal (deve ter 1)`, rel));
    else {
      if (!convites[0].includes(`href="${CANAL}" target="_blank" rel="noopener"`)) a.push(achado('alto', T, `o convite nao leva para ${CANAL} em nova aba`, rel));
      if (/data-pagefind-body/.test(h) && !/<div class="convite" data-pagefind-ignore>/.test(h)) a.push(achado('medio', T, 'o convite entra no indice da busca (falta data-pagefind-ignore)', rel));
    }
    // ordem: texto, botoes, Shorts anexados, "Mais sobre este assunto", compartilhar, convite, relacionadas (Shorts e assunto so existem em algumas paginas)
    const pos = (re) => h.search(re);
    const [iLinks, iShorts, iAssunto, iComp, iConv, iRel] = [pos(/<div class="links"/), pos(/<section class="shorts"/), pos(/<section class="related" data-irmas/), pos(/<section class="compartilhar"/), pos(/<div class="convite"/), pos(/<section class="related"(?! data-irmas)/)];
    const sequencia = [iLinks, iShorts, iAssunto, iComp, iConv, iRel].filter((i) => i >= 0);
    if (iLinks < 0 || iComp < 0 || iConv < 0 || sequencia.some((x, k) => k && x < sequencia[k - 1])) a.push(achado('medio', T, 'ordem errada no fim da pagina (o certo: botoes, Shorts anexados, "Mais sobre este assunto", compartilhar, convite, relacionadas)', rel));
  }

  // ---------- 1b) ficha de veredito, fontes e botao de comentar: a pagina mostra exatamente o que o JSON da materia diz ----------
  const brasil = (n) => String(n).replace('.', ',');
  let comFicha = 0, comFontes = 0;
  for (const [id, e] of Object.entries(registro)) {
    if (e.retirada) continue;
    const rel = `${e.categoria}/${e.slug}.html`, d = jsons.get(id), p = dados.get(rel);
    if (!d || !p) continue;
    const h = p.h, bruto = ler(rel), ld = (bruto.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []).flatMap((s) => { try { return JSON.parse(s.replace(/<\/?script[^>]*>/g, ''))['@graph'] ?? []; } catch { return []; } });
    // fontes
    const fontes = Array.isArray(d.fontes) ? d.fontes : [], blocoFontes = (h.match(/<section class="fontes"[\s\S]*?<\/section>/g) ?? []);
    if (!fontes.length) { if (blocoFontes.length) a.push(achado('alto', T, 'a pagina mostra "Fontes" mas o JSON nao tem fontes', rel)); }
    else {
      comFontes++;
      if (blocoFontes.length !== 1) a.push(achado('alto', T, `${blocoFontes.length} bloco(s) "Fontes" (deve ter 1)`, rel));
      else {
        const itens = [...blocoFontes[0].matchAll(/<li><a href="([^"]*)" target="_blank" rel="noopener">([\s\S]*?)<span class="sr-only"> \(abre em nova aba\)<\/span><\/a><\/li>/g)].map((m) => [decodificar(m[1]), decodificar(m[2])]);
        if (JSON.stringify(itens) !== JSON.stringify(fontes.map((f) => [f.url, f.nome]))) a.push(achado('alto', T, `as fontes da pagina nao sao as do JSON (pagina: ${itens.map((x) => x[1]).join(', ')}; JSON: ${fontes.map((f) => f.nome).join(', ')})`, rel));
        if (!/data-pagefind-ignore/.test(blocoFontes[0].split('>')[0])) a.push(achado('medio', T, 'as fontes entram no indice da busca (falta data-pagefind-ignore)', rel));
        if (!(h.indexOf('class="art-body"') < h.indexOf('class="fontes"') && h.indexOf('class="fontes"') < h.indexOf('<p class="autoria"') && h.indexOf('<p class="autoria"') < h.indexOf('<div class="links"'))) a.push(achado('medio', T, 'as fontes devem vir depois do texto, antes da assinatura e dos botoes', rel));
      }
      const citacao = (ld.find((x) => x['@type'] === 'Article') ?? {}).citation ?? [];
      if (JSON.stringify(citacao.map((c) => [c.url, c.name])) !== JSON.stringify(fontes.map((f) => [f.url, f.nome]))) a.push(achado('medio', T, 'o "citation" dos dados estruturados nao bate com as fontes', rel));
    }
    // veredito
    const v = d.veredito, blocosV = h.match(/<section class="veredito"[\s\S]*?<\/section>/g) ?? [];
    if (!v || typeof v.nota !== 'number') { if (blocosV.length) a.push(achado('alto', T, 'a pagina mostra o veredito mas o JSON nao tem nota', rel)); if (ld.some((x) => x['@type'] === 'Review')) a.push(achado('alto', T, 'Review nos dados estruturados sem nota no JSON', rel)); }
    else {
      comFicha++;
      if (blocosV.length !== 1) a.push(achado('alto', T, `${blocosV.length} ficha(s) de veredito (deve ter 1)`, rel));
      else {
        const b = blocosV[0], nota = (b.match(/<b>([^<]*)<\/b><span>\/10<\/span>/) ?? [])[1], rec = (b.match(/<p class="veredito-rec">[\s\S]*?<\/svg> ([^<]*)<\/p>/) ?? [])[1];
        if (nota !== brasil(v.nota)) a.push(achado('alto', T, `nota da ficha "${nota}" e a do JSON e ${brasil(v.nota)}`, rel));
        if ((v.recomendacao ? RECOMENDACOES[v.recomendacao] : undefined) !== (rec === undefined ? undefined : decodificar(rec))) a.push(achado('alto', T, `recomendacao da ficha "${rec}" nao bate com a do JSON (${v.recomendacao})`, rel));
        const esperados = [['Plataforma', v.plataforma], ['Preço', v.preco], ['Horas de jogo', v.horas], ['Para quem é', v.paraQuem]].filter(([, t]) => t), achados = [...b.matchAll(/<dt>([^<]*)<\/dt><dd>([\s\S]*?)<\/dd>/g)].map((m) => [m[1], decodificar(m[2])]);
        if (JSON.stringify(achados) !== JSON.stringify(esperados)) a.push(achado('alto', T, `os dados da ficha (${achados.map((x) => x[0]).join(', ')}) nao sao os do JSON (${esperados.map((x) => x[0]).join(', ')})`, rel));
        if (!/data-pagefind-ignore/.test(b.split('>')[0])) a.push(achado('medio', T, 'a ficha de veredito entra no indice da busca (falta data-pagefind-ignore)', rel));
        if (!(h.indexOf('class="art-body"') < h.indexOf('class="veredito"') && h.indexOf('class="veredito"') < h.indexOf('<p class="autoria"'))) a.push(achado('medio', T, 'o veredito deve vir depois do texto e antes da assinatura (junto das fontes, no fecho da materia)', rel));
        const fecho = (h.match(/<div class="materia-fim( com-dois)?">[\s\S]*?<p class="autoria"/) ?? [])[0] ?? '';
        if (!(/class="veredito"/.test(fecho) && (fontes.length ? /<div class="materia-fim com-dois">/.test(fecho) && fecho.indexOf('class="veredito"') < fecho.indexOf('class="fontes"') : true))) a.push(achado('alto', T, 'o veredito deve ficar no fecho da materia (materia-fim), ao lado das fontes e antes delas', rel));
      }
      const rv = ld.find((x) => x['@type'] === 'Review');
      if (!rv) a.push(achado('medio', T, 'review com nota sem o "Review" nos dados estruturados', rel));
      else if (rv.reviewRating?.ratingValue !== v.nota || rv.reviewRating?.bestRating !== 10 || rv.reviewRating?.worstRating !== 0 || rv.itemReviewed?.name !== decodificar(p.tags[0] ?? '')) a.push(achado('alto', T, `Review estruturado diferente da ficha (nota ${rv.reviewRating?.ratingValue}/${rv.reviewRating?.bestRating}, jogo "${rv.itemReviewed?.name}")`, rel));
    }
    // botao "Comentar no video"
    const idDoVideo = (h.match(/<a class="fachada" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})"/) ?? [])[1];
    const comentar = h.match(/<a class="btn" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})#comments" target="_blank" rel="noopener">Comentar no vídeo<\/a>/);
    if (idDoVideo && (!comentar || comentar[1] !== idDoVideo)) a.push(achado('alto', T, 'falta o botao "Comentar no vídeo" (ou ele leva para outro video)', rel));
    if (!idDoVideo && /Comentar no vídeo/.test(h)) a.push(achado('alto', T, 'materia sem video tem o botao "Comentar no vídeo"', rel));
  }

  // ---------- 1c) Shorts anexados ("shorts"): a pagina mostra exatamente o que o JSON diz ----------
  const dataCurta = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  let comShorts = 0;
  for (const [rel, p] of dados) {
    const d = jsonDaPagina.get(rel) ?? {}, h = p.h;
    // Shorts anexados
    const S = Array.isArray(d.shorts) ? d.shorts : [], blocosS = h.match(/<section class="shorts"[\s\S]*?<\/section>/g) ?? [];
    if (!S.length) { if (blocosS.length) a.push(achado('alto', T, 'a pagina mostra "Shorts" mas o JSON nao tem shorts', rel)); }
    else {
      comShorts++;
      if (blocosS.length !== 1) a.push(achado('alto', T, `${blocosS.length} bloco(s) de Shorts (deve ter 1)`, rel));
      else {
        const b = blocosS[0], esperado = rel.startsWith('reviews/') ? 'Shorts desta review' : 'Shorts desta matéria';
        const itens = [...b.matchAll(/<li class="short-item"><div class="art-video is-short"><a class="fachada" href="https:\/\/www\.youtube\.com\/shorts\/([\w-]{11})" target="_blank" rel="noopener" data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})" data-titulo="([^"]*)" aria-label="Assistir: ([^"]*)"><img src="https:\/\/i\.ytimg\.com\/vi\/([\w-]{11})\/hqdefault\.jpg" alt="" loading="lazy" width="480" height="360"><span class="fachada-play"><svg [^>]*>[\s\S]*?<\/svg><\/span><\/a><\/div><p class="short-legenda">([^<]*)<\/p><\/li>/g)];
        if (itens.length !== S.length) a.push(achado('alto', T, `${itens.length} Short(s) no formato certo na pagina e ${S.length} no JSON (fachada com link /shorts/ID em nova aba, data-embed, miniatura lazy e legenda)`, rel));
        else itens.forEach((m, k) => {
          if (new Set([m[1], m[2], m[5]]).size !== 1) a.push(achado('alto', T, `o Short ${k + 1} mistura videos: link ${m[1]}, player ${m[2]}, miniatura ${m[5]}`, rel));
          if (m[1] !== S[k].id) a.push(achado('alto', T, `o Short ${k + 1} da pagina e o ${m[1]} e o do JSON e o ${S[k].id} (ordem ou ID diferente)`, rel));
          if (decodificar(m[3]) !== S[k].titulo || decodificar(m[4]) !== S[k].titulo || decodificar(m[6]) !== S[k].titulo) a.push(achado('alto', T, `o titulo do Short ${k + 1} (fachada ou legenda) difere do JSON`, rel));
        });
        if (!/data-pagefind-ignore/.test(b.split('>')[0])) a.push(achado('medio', T, 'os Shorts entram no indice da busca (falta data-pagefind-ignore)', rel));
        if ((b.match(/id="shorts-titulo">([^<]*)</) ?? [])[1] !== esperado) a.push(achado('medio', T, `titulo do bloco de Shorts "${(b.match(/id="shorts-titulo">([^<]*)</) ?? [])[1]}" (esperado "${esperado}")`, rel));
      }
      if (!/<script src="\.\.\/assets\/js\/fachada\.js" defer><\/script>/.test(ler(rel))) a.push(achado('alto', T, 'tem Shorts anexados mas falta fachada.js (o clique so abriria o YouTube)', rel));
    }
  }

  // ---------- 1d) assuntos: cada materia tem a PROPRIA pagina; o bloco "Mais sobre este assunto" liga as do mesmo assunto (2 ou mais); o endereco do assunto e um redirecionamento ----------
  // O que a pagina deve ter e calculado aqui (lib.mjs: assuntosDoSite) a partir dos JSONs, do registro e de assuntos.json, sem usar o gerador.
  const { unidades, membroDe } = assuntosDoSite();
  const noJson = (id) => jsons.get(id) ?? {};
  const re = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const porChaveTodas = new Map(); // todas as materias ativas com "assunto", para avisar do assunto que ficou com 1 so (erro de digitacao)
  for (const [id, d] of jsons) if (typeof d.assunto === 'string' && registro[id] && !registro[id].retirada && d.status !== 'rascunho') (porChaveTodas.get(d.assunto) ?? porChaveTodas.set(d.assunto, []).get(d.assunto)).push(id);
  for (const [chave, ids] of porChaveTodas) if (ids.length === 1) a.push(achado('baixo', T, `o assunto "${chave}" so tem 1 materia (erro de digitacao? sem outra no mesmo assunto, ele nao vira pagina de assunto)`, ids[0]));
  const ldDe = (bruto) => (bruto.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g) ?? []).flatMap((s) => { try { return JSON.parse(s.replace(/<\/?script[^>]*>/g, ''))['@graph'] ?? []; } catch { return []; } });
  const antigosDe = (e) => [e.slug, ...(e.antigos ?? [])].map((s) => (s.includes('/') ? s : `${e.categoria}/${s}`));
  let nBlocos = 0;
  const paginaDe = (m) => `${m.e.categoria}/${m.e.slug}.html`;
  for (const u of unidades) {
    const novo = u.membros[0];
    // o endereco do assunto: um redirecionamento para a materia mais nova (nao e mais uma pagina)
    const stubA = u.pagina, alvoA = `/${urlPublica(paginaDe(novo))}`;
    if (!existe(stubA)) a.push(achado('alto', T, `o endereco do assunto "${u.chave}" (${stubA}) devia existir como redirecionamento`, stubA));
    else {
      const sa = ler(stubA);
      if (!sa.includes(`<meta http-equiv="refresh" content="0; url=${alvoA}">`)) a.push(achado('alto', T, `${stubA} devia levar para ${alvoA} (a materia mais nova do assunto)`, stubA));
      if (!sa.includes(`<link rel="canonical" href="${DOMINIO}${alvoA}">`)) a.push(achado('alto', T, `o canonical de ${stubA} devia ser ${alvoA}`, stubA));
    }
    // cada materia do assunto tem a PROPRIA pagina, com o bloco "Mais sobre este assunto": as outras do assunto, da mais nova para a mais velha, cada uma com link para a pagina dela
    for (const m of u.membros) {
      const rel = paginaDe(m), p = dados.get(rel);
      if (!p) { a.push(achado('alto', T, `a materia ${m.id} (assunto "${u.chave}") devia ter a propria pagina ${rel} e ela nao foi gerada`, rel)); continue; }
      const h = p.h, blocos = h.match(/<section class="related" data-irmas[^>]*>[\s\S]*?<\/section>/g) ?? [];
      if (blocos.length !== 1) { a.push(achado('alto', T, `${blocos.length} bloco(s) "Mais sobre este assunto" (deve ter 1)`, rel)); continue; }
      const b = blocos[0], irmas = u.membros.filter((x) => x.id !== m.id);
      if (!/<h2 class="section-title">Mais sobre este assunto<\/h2>/.test(b)) a.push(achado('alto', T, 'o bloco das outras materias do assunto precisa do titulo "Mais sobre este assunto"', rel));
      const links = [...b.matchAll(/<a class="news-card[^"]*" href="\.\.\/([^"]+)"/g)].map((x) => x[1]);
      if (JSON.stringify(links) !== JSON.stringify(irmas.map((x) => urlPublica(paginaDe(x))))) a.push(achado('alto', T, `"Mais sobre este assunto" leva a [${links.join(', ')}] e devia levar, da mais nova para a mais velha, as outras ${irmas.length} do assunto`, rel));
      if (!/data-pagefind-ignore/.test(b.split('>')[0])) a.push(achado('medio', T, 'o bloco "Mais sobre este assunto" entra no indice da busca (falta data-pagefind-ignore)', rel));
      const vt = h.match(/<section class="related"(?! data-irmas)[\s\S]*?<\/section>/); // "Veja tambem" nao repete o que ja esta no bloco do assunto
      if (vt && irmas.some((x) => vt[0].includes(`href="../${urlPublica(paginaDe(x))}"`))) a.push(achado('medio', T, '"Veja tambem" repete uma materia que ja esta em "Mais sobre este assunto"', rel));
      const [iB, iL, iC] = [h.indexOf('data-irmas'), h.indexOf('<div class="links"'), h.indexOf('<section class="compartilhar"')];
      if (!(iB > iL && iB < iC)) a.push(achado('medio', T, 'o bloco "Mais sobre este assunto" deve vir depois dos botoes e antes de compartilhar', rel));
      nBlocos++;
    }
  }
  // materia fora de assunto (ou com assunto de 1 so) nao tem o bloco
  const emAssunto = new Set(unidades.flatMap((u) => u.membros.map(paginaDe)));
  for (const [rel, p] of dados) if (/data-irmas/.test(p.h) && !emAssunto.has(rel)) a.push(achado('alto', T, 'a pagina tem "Mais sobre este assunto" mas a materia nao esta num assunto com 2 ou mais', rel));
  // ninguem aponta para o endereco do assunto (so o redirecionamento existe) nem para os enderecos antigos das materias: os links vao direto para a pagina atual
  const enderecosAntigos = new Map(); // caminho -> o que ele era
  for (const u of unidades) {
    enderecosAntigos.set(u.pagina, `o endereco do assunto "${u.chave}"`);
    for (const m of u.membros) for (const s of m.e.antigos ?? []) enderecosAntigos.set(`${s.includes('/') ? s : `${m.e.categoria}/${s}`}.html`, `o endereco antigo da materia ${m.id}`);
  }
  if (enderecosAntigos.size) {
    const procurados = [...enderecosAntigos.keys()];
    const quem = new Map();
    for (const f of arquivosPublicados().filter((x) => /\.(html|json|xml)$/.test(x))) {
      const txt = ler(f);
      if (!procurados.some((c) => txt.includes(c))) continue;
      for (const c of procurados) if (txt.includes(c) && f !== c) (quem.get(c) ?? quem.set(c, []).get(c)).push(f);
    }
    for (const [c, arquivos] of quem) a.push(achado('alto', T, `${arquivos.length} arquivo(s) ainda apontam para ${c}, ${enderecosAntigos.get(c)} (agora so um redirecionamento): ${arquivos.slice(0, 2).join(', ')}`, c));
  }

  // ---------- 1e) topo e assinatura: o tempo de leitura fica no alto, ao lado da categoria; "Por Bruno Bem", a data e o apoio de IA ficam no fim, perto das fontes ----------
  const dataLonga = (iso) => new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  const contarPalavras = (...t) => t.flat(Infinity).filter((x) => typeof x === 'string').join(' ').split(/\s+/).filter(Boolean).length;
  const unidadeDaPagina = new Map(unidades.map((u) => [u.pagina, u]));
  let comAssinatura = 0;
  for (const [rel, p] of dados) {
    const h = p.h, u = unidadeDaPagina.get(rel), d = jsonDaPagina.get(rel);
    if (!u && !d) continue;
    comAssinatura++;
    const topo = (h.match(/<p class="art-meta">[\s\S]*?<\/p>/) ?? [''])[0];
    if (/byline|<time|Claudio|<small>IA<\/small>/.test(topo) || /Por <b>Claudio/.test(h)) a.push(achado('alto', T, 'o alto da materia ainda mostra a assinatura antiga ("Claudio IA") ou a data: agora vao no fim, perto das fontes', rel));
    const palavras = u ? contarPalavras(u.membros.map((m) => [m.dados.resumo, m.dados.corpo])) : contarPalavras(d.resumo, d.corpo);
    const minutos = Math.max(1, Math.ceil(palavras / PALAVRAS_POR_MINUTO));
    const leitura = [...topo.matchAll(/<span class="leitura" data-pagefind-ignore><svg[\s\S]*?<\/svg> (\d+) min de leitura<\/span>/g)].map((m) => Number(m[1]));
    if (palavras && (leitura.length !== 1 || leitura[0] !== minutos)) a.push(achado('alto', T, `tempo de leitura ${leitura.join(', ') || 'ausente'} (min) e o certo e ${minutos} (${palavras} palavras a ${PALAVRAS_POR_MINUTO} por minuto)`, rel));
    const assinaturas = h.match(/<p class="autoria"[^>]*>[\s\S]*?<\/p>/g) ?? [];
    if (assinaturas.length !== 1) { a.push(achado('alto', T, `${assinaturas.length} assinatura(s) no fim da materia (deve ter 1)`, rel)); continue; }
    const data = u ? u.membros[0].e.publicado : registro[idDaPagina.get(rel)]?.publicado;
    const esperada = `<p class="autoria" data-pagefind-ignore><span class="avatar" aria-hidden="true">${AUTOR_FOTO ? `<img src="../${AUTOR_FOTO}" alt="" width="32" height="32">` : AUTOR[0]}</span><span>Por <b>${AUTOR}</b> &middot; ${u ? 'Atualizado em' : 'Publicado em'} <time data-pagefind-sort="data[datetime]" data-pagefind-meta="data[datetime]" data-pagefind-ignore datetime="${data}">${dataLonga(data)}</time></span><a class="autoria-ia" href="../sobre">Texto com apoio de IA</a></p>`;
    if (assinaturas[0] !== esperada) a.push(achado('alto', T, 'a assinatura do fim da materia esta fora do formato (Por Bruno Bem, a data da materia e o apoio de IA com link para Sobre)', rel));
    const iA = h.indexOf('<p class="autoria"');
    const depois = u ? h.lastIndexOf('<section class="bloco"') : Math.max(h.indexOf('class="art-body"'), h.indexOf('class="fontes"')), antes = u ? h.indexOf('<section class="compartilhar"') : h.indexOf('<div class="links"');
    if (!(iA > depois && iA < antes)) a.push(achado('medio', T, u ? 'a assinatura deve vir depois dos blocos e antes do compartilhar' : 'a assinatura deve vir depois do texto e das fontes e antes dos botoes', rel));
    const autores = ldDe(ler(rel)).filter((x) => x['@type'] === 'Article' || x['@type'] === 'Review').map((x) => x.author);
    if (!autores.length || autores.some((x) => !x || x['@type'] !== 'Person' || x.name !== AUTOR)) a.push(achado('alto', T, `o autor nos dados estruturados devia ser a pessoa ${AUTOR} (Person)`, rel));
  }

  // ---------- 2) relacionadas ----------
  const todasAsTags = new Map([...dados.values()].map((d) => [d.rel, new Set(d.tags)]));
  const recebidos = new Map([...dados.keys()].map((r) => [r, 0]));
  let comCandidataDeOutraCategoria = 0, comLinkDeOutraCategoria = 0, linksCruzados = 0, linksTotais = 0;
  for (const d of dados.values()) {
    if (!d.alvos.length) { a.push(achado('alto', T, 'a materia nao tem nenhuma relacionada', d.rel)); continue; }
    if (d.alvos.length > 3) a.push(achado('medio', T, `${d.alvos.length} relacionadas (o limite e 3)`, d.rel));
    if (new Set(d.alvos).size !== d.alvos.length) a.push(achado('alto', T, 'relacionada repetida', d.rel));
    if (d.alvos.includes(d.rel)) a.push(achado('alto', T, 'a materia aparece nas proprias relacionadas', d.rel));
    for (const alvo of d.irmas) recebidos.set(alvo, (recebidos.get(alvo) ?? 0) + 1); // o bloco do assunto tambem e link interno recebido
    for (const alvo of d.alvos) { recebidos.set(alvo, (recebidos.get(alvo) ?? 0) + 1); linksTotais++; if (alvo.split('/')[0] !== d.rel.split('/')[0]) linksCruzados++; }
    const mais = d.titSecao.match(/^Mais sobre (.+)$/);
    if (mais) {
      if (!d.tags.includes(mais[1])) a.push(achado('alto', T, `o titulo "${d.titSecao}" cita uma tag que a materia nao tem`, d.rel));
      else if (d.alvos.filter((r) => todasAsTags.get(r)?.has(mais[1])).length < 2) a.push(achado('alto', T, `o titulo "${d.titSecao}" promete assunto em comum, mas menos de 2 das relacionadas tem a tag`, d.rel));
    } else if (d.titSecao !== 'Veja também') a.push(achado('medio', T, `titulo inesperado nas relacionadas: "${d.titSecao}"`, d.rel));
    // a materia que tem tag em comum com outra categoria deveria apontar para ela (conferencia de conjunto, abaixo)
    const temOutraCategoria = [...dados.values()].some((o) => o.rel.split('/')[0] !== d.rel.split('/')[0] && o.tags.some((t) => todasAsTags.get(d.rel).has(t)));
    if (temOutraCategoria) { comCandidataDeOutraCategoria++; if (d.alvos.some((r) => r.split('/')[0] !== d.rel.split('/')[0])) comLinkDeOutraCategoria++; }
  }
  const semLinkRecebido = [...recebidos].filter(([, n]) => n === 0).map(([r]) => r);
  if (semLinkRecebido.length) a.push(achado('medio', T, `${semLinkRecebido.length} materia(s) que nenhuma outra aponta nas relacionadas (ficam orfas para o Google): ${semLinkRecebido.slice(0, 2).join(', ')}`));
  if (comCandidataDeOutraCategoria >= 5 && comLinkDeOutraCategoria / comCandidataDeOutraCategoria < 0.5) a.push(achado('medio', T, `so ${comLinkDeOutraCategoria} de ${comCandidataDeOutraCategoria} materias com tag em comum com outra categoria apontam para ela (as relacionadas deviam atravessar categorias)`));

  // ---------- 3) compartilhar.js no navegador de mentira ----------
  const CANON = 'https://brubaogg.com.br/noticias/x.html';
  async function cenario({ clipboard = 'ok', execCommand = null, share = null, toque = false, semBloco = false, titulo = 'Titulo X' } = {}) {
    const p = montarPagina({}), doc = p.doc;
    doc.body = doc.raiz; doc.title = 'Titulo da aba';
    const novo = (t, f) => { const e = doc.createElement(t); f?.(e); return e; };
    doc.raiz.appendChild(novo('link', (e) => { e.setAttribute('rel', 'canonical'); e.setAttribute('href', CANON); }));
    doc.raiz.appendChild(novo('h1', (e) => { e.textContent = `  ${titulo}  `; }));
    const copiar = novo('button', (e) => { e.setAttribute('data-copiar', ''); e.hidden = true; });
    const nativo = novo('button', (e) => { e.setAttribute('data-compartilhar', ''); e.hidden = true; });
    const aviso = novo('p', (e) => { e.className = 'compartilhar-aviso'; });
    if (!semBloco) doc.raiz.appendChild(novo('section', (e) => { e.className = 'compartilhar'; e.appendChild(copiar); e.appendChild(nativo); e.appendChild(aviso); }));
    const copiados = [], compartilhados = [], timers = [], campos = [];
    doc.execCommand = (cmd) => {
      campos.push(doc.raiz.todos().filter((n) => n.tagName === 'TEXTAREA').map((n) => ({ value: n.value, selecionado: !!n.selecionado, classe: n.className })));
      if (execCommand === 'erro') throw new Error('bloqueado');
      return execCommand === 'ok' && cmd === 'copy';
    };
    const navigator = {};
    if (clipboard === 'ok') navigator.clipboard = { writeText: (t) => { copiados.push(t); return Promise.resolve(); } };
    if (clipboard === 'recusa') navigator.clipboard = { writeText: () => Promise.reject(new Error('negado')) };
    if (share === 'ok') navigator.share = (d) => { compartilhados.push(d); return Promise.resolve(); };
    if (share === 'cancela') navigator.share = (d) => { compartilhados.push(d); return Promise.reject(new Error('AbortError')); };
    if (share === 'erro') navigator.share = () => { throw new Error('sem ativacao do usuario'); };
    rodarScript('compartilhar.js', { doc, globais: { navigator, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length; }, clearTimeout: (id) => { if (timers[id - 1]) timers[id - 1].cancelado = true; } }, janelaExtra: { matchMedia: () => ({ matches: toque }) } });
    return { doc, copiar, nativo, aviso, copiados, compartilhados, timers, campos, clicar: async (b) => { b.dispararEvento('click'); await esperar(5); } };
  }
  const conf = (nome, obtido, esperado) => { if (JSON.stringify(obtido) !== JSON.stringify(esperado)) a.push(achado('alto', T, `compartilhar.js, ${nome}: esperado ${JSON.stringify(esperado)}, veio ${JSON.stringify(obtido)}`, 'assets/js/compartilhar.js')); };
  try {
    // sem o bloco (outra pagina qualquer): nao faz nada e nao quebra
    await cenario({ semBloco: true });
    // com o bloco: "Copiar link" aparece; "Mais opcoes" so em tela de toque com navigator.share
    let c = await cenario({ share: 'ok', toque: false });
    conf('Copiar link aparece sozinho', [c.copiar.hidden, c.nativo.hidden], [false, true]);
    c = await cenario({ share: 'ok', toque: true });
    conf('Mais opcoes aparece em tela de toque com navigator.share', [c.copiar.hidden, c.nativo.hidden], [false, false]);
    c = await cenario({ share: null, toque: true });
    conf('Mais opcoes fica escondido sem navigator.share', c.nativo.hidden, true);
    // copiar
    c = await cenario({}); await c.clicar(c.copiar);
    conf('copia o endereco do canonical', c.copiados, [CANON]);
    conf('avisa que copiou', c.aviso.textContent, 'Link copiado.');
    conf('o aviso some sozinho (4 s)', [c.timers.length, c.timers[0].ms], [1, 4000]);
    c.timers[0].f(); conf('depois do prazo o aviso esvazia', c.aviso.textContent, '');
    await c.clicar(c.copiar); await c.clicar(c.copiar);
    conf('clicar de novo cancela o prazo anterior', c.timers.filter((t) => t.cancelado).length, 2);
    c = await cenario({ clipboard: 'recusa', execCommand: 'ok' }); await c.clicar(c.copiar);
    conf('API recusa, execCommand copia', c.aviso.textContent, 'Link copiado.');
    conf('o campo de apoio e invisivel (sr-only), selecionado, tem o endereco e some depois', [c.campos[0], c.doc.raiz.todos().filter((n) => n.tagName === 'TEXTAREA').length], [[{ value: CANON, selecionado: true, classe: 'sr-only' }], 0]);
    c = await cenario({ clipboard: 'nenhum', execCommand: 'ok' }); await c.clicar(c.copiar);
    conf('sem API de area de transferencia, execCommand copia', c.aviso.textContent, 'Link copiado.');
    c = await cenario({ clipboard: 'nenhum', execCommand: 'nao' }); await c.clicar(c.copiar);
    conf('nada copia: avisa que nao foi possivel', c.aviso.textContent, 'Não foi possível copiar.');
    c = await cenario({ clipboard: 'nenhum', execCommand: 'erro' }); await c.clicar(c.copiar);
    conf('execCommand lanca erro: avisa e nao quebra', [c.aviso.textContent, c.doc.raiz.todos().filter((n) => n.tagName === 'TEXTAREA').length], ['Não foi possível copiar.', 0]);
    // mais opcoes
    c = await cenario({ share: 'ok', toque: true, titulo: 'Titulo <b>X</b>' }); await c.clicar(c.nativo);
    conf('Mais opcoes entrega titulo (sem os espacos) e endereco', c.compartilhados, [{ title: 'Titulo <b>X</b>', url: CANON }]);
    c = await cenario({ share: 'cancela', toque: true }); await c.clicar(c.nativo);
    conf('fechar a folha sem escolher nao vira erro nem aviso', c.aviso.textContent, '');
    c = await cenario({ share: 'erro', toque: true }); await c.clicar(c.nativo);
    conf('navigator.share que lanca erro nao quebra', c.aviso.textContent, '');
  } catch (e) { a.push(achado('critico', T, `compartilhar.js lancou erro no navegador de mentira: ${e.message}`, 'assets/js/compartilhar.js')); }

  // ---------- 3b) o destaque da pagina do GTA 6 (gta6.html) tambem usa a fachada ----------
  if (existe('gta6.html')) {
    const g = ler('gta6.html'), facs = g.match(/<a class="fachada"[^>]*data-embed="https:\/\/www\.youtube-nocookie\.com\/embed\/([\w-]{11})"[^>]*>/g) ?? [];
    if (/<iframe/.test(limparHtml(g))) a.push(achado('alto', T, 'gta6.html tem iframe no HTML: o player do destaque deve nascer so no clique (fachada)', 'gta6.html'));
    if (facs.length !== 1) a.push(achado('alto', T, `${facs.length} fachada(s) de player no destaque do GTA 6 (deve ter 1)`, 'gta6.html'));
    if (!/<script src="assets\/js\/fachada\.js" defer><\/script>/.test(g)) a.push(achado('alto', T, 'gta6.html sem <script src="assets/js/fachada.js" defer>', 'gta6.html'));
  }

  // ---------- 4) categoria que "tambemEm" outra (config.mjs): tudo de GTA 6 tambem e noticia ----------
  let dupla = 0;
  for (const origem of categorias.filter((c) => c.tambemEm)) {
    const destino = origem.tambemEm, paginasDaOrigem = paginas.filter((p) => p.rel.startsWith(`${origem.pasta}/`)).map((p) => p.rel);
    const lista = existe(`${destino}.html`) ? ler(`${destino}.html`) : '';
    const secao = existe(`assets/data/secao/${destino}.json`) ? JSON.parse(ler(`assets/data/secao/${destino}.json`)).itens.map((i) => arquivoDe(i.u)) : [];
    const blocos = existe(`assets/data/colecao/cat-${destino}`) ? paginasEmBlocos(`assets/data/colecao/cat-${destino}`) : [];
    const naPagina = [...lista.matchAll(/<a class="news-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
    const naLista = new Set([...naPagina, ...blocos].map(arquivoDe));
    for (const rel of paginasDaOrigem) {
      dupla++;
      if (!naLista.has(rel)) a.push(achado('alto', T, `${rel} e de ${origem.pasta} mas nao esta na lista de ${destino}.html (tudo de ${origem.pasta} tambem e ${destino})`, `${destino}.html`));
      if (!secao.includes(rel)) a.push(achado('alto', T, `${rel} nao esta nos dados da mini-busca de ${destino} (assets/data/secao/${destino}.json)`, `assets/data/secao/${destino}.json`));
    }
    if (naLista.size !== new Set([...naLista]).size) a.push(achado('alto', T, `lista de ${destino} com materia repetida`));
    // cartao da origem na lista de destino leva o rotulo da origem ("GTA 6"), nao "Noticia"
    const cartao = lista.match(new RegExp(`<a class="news-card[^"]*" href="${origem.pasta}/[^"]+">[\\s\\S]*?</a>`));
    if (cartao && !new RegExp(`</svg> ${origem.rotulo}</span>`).test(cartao[0])) a.push(achado('medio', T, `cartao de ${origem.pasta} em ${destino}.html sem o rotulo "${origem.rotulo}"`, `${destino}.html`));
    // home: o bloco do destino mostra o que e da origem, mas sem repetir o que a cobertura do topo ja mostra
    const home = existe('index.html') ? ler('index.html') : '';
    const cobertura = (home.match(/<section class="cobertura"[\s\S]*?<\/section>/) ?? [''])[0];
    const blocoDestino = [...home.matchAll(/<section class="feed-sec">[\s\S]*?<\/section>/g)].map((m) => m[0]).find((s) => new RegExp(`href="${destino}(?:\\.html)?"`).test(s)) ?? '';
    const alvos = (s) => [...s.matchAll(/<a class="news-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
    const repetidas = alvos(blocoDestino).filter((u) => alvos(cobertura).includes(u) && u.startsWith(`${origem.pasta}/`));
    if (repetidas.length) a.push(achado('medio', T, `a home mostra ${repetidas.length} materia(s) de ${origem.pasta} na cobertura e de novo no bloco de ${destino}: ${repetidas[0]}`, 'index.html'));
  }

  // ---------- 5) a home mostra cada pagina de materia uma vez so (varios videos de um assunto sao um cartao so) ----------
  if (existe('index.html')) {
    const home = ler('index.html'), cartoes = [...home.matchAll(/<a class="news-card[^"]*" href="([^"]+)"/g)].map((m) => m[1]);
    const repetidos = [...new Set(cartoes.filter((x, k) => cartoes.indexOf(x) !== k))];
    if (repetidos.length) a.push(achado('alto', T, `a home mostra ${repetidos.length} pagina(s) de materia mais de uma vez: ${repetidos.slice(0, 2).join(', ')}`, 'index.html'));
  }

  // ---------- 6) pagina de tag so existe com 2 ou mais itens (varios videos de um assunto contam um item so) ----------
  const tagsCurtas = paginasHtml().filter((r) => /^tag\/[^/]+\.html$/.test(r)).filter((r) => !/http-equiv="refresh"/.test(ler(r)) && (ler(r).match(/<a class="news-card/g) ?? []).length < 2);
  if (tagsCurtas.length) a.push(achado('medio', T, `${tagsCurtas.length} pagina(s) de tag com menos de 2 itens (tag com 1 so item nao ganha pagina): ${tagsCurtas.slice(0, 2).join(', ')}`));

  a.push(achado('info', T, `${paginas.length} paginas de materia: ${linksTotais} relacionadas (${linksCruzados} de outra categoria; ${comLinkDeOutraCategoria} de ${comCandidataDeOutraCategoria} materias com candidata de outra categoria apontam para ela); ${semLinkRecebido.length} sem link recebido; ${dupla} materia(s) de categoria que tambem e outra (tambemEm) conferidas na lista e na mini-busca do destino; ${comFicha} fichas de veredito e ${comFontes} listas de fontes conferidas contra o JSON; ${unidades.length} paginas de assunto (${membroDe.size} videos em ${nBlocos} blocos conferidos) e ${comShorts} com Shorts anexados; ${comAssinatura} assinaturas e tempos de leitura conferidos`));
  return a;
}
