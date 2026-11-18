// Anuncio de verdade (Google AdSense; gerador/anuncio.mjs). Duas partes:
//   1) SEMPRE: as regras do modulo (formato da conta, linha do ads.txt, meta de verificacao, troca do marcador pelo bloco e a volta) e, no site como esta, que nada
//      de anuncio aparece enquanto a conta nao estiver configurada (e que, configurada, o ads.txt e a meta existem).
//   2) SO COM  npm run testar -- --so=anuncio  (uns 20 s): numa COPIA do site, liga os tres estados em config.mjs e roda o gerador de verdade em cada um:
//      sem conta, so verificacao, e anuncio ligado; depois desliga e confere que tudo volta a ser byte a byte o de antes. O site real nao muda.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { achado, existe, ler, paginasHtml, raiz } from './lib.mjs';
import { ADS_ATIVOS, ADS_BLOCO, ADS_CLIENTE } from '../../gerador/config.mjs';
import { EH_ADS_TXT_GERADO, anuncioHtml, linhaDoAdsTxt, metaDeVerificacao, porAnuncios, scriptsDoAnuncio, situacaoDosAds, temEspacoDeAnuncio, tirarAnuncios } from '../../gerador/anuncio.mjs';

const T = 'anuncio';
const C = 'pub-1234567890123456', B = '9876543210'; // conta e bloco de mentira (so formato)

export default async function () {
  const a = [];
  const ach = (sev, msg, onde = '') => a.push(achado(sev, T, msg, onde));

  // ---- 1) as regras do modulo ----
  const s = (ativos, cliente, bloco) => situacaoDosAds({ ativos, cliente, bloco });
  const casos = [
    ['sem conta', s(true, '', ''), { verificacao: false, anuncios: false, problemas: 0 }],
    ['so a conta, anuncios desligados', s(false, C, ''), { verificacao: true, anuncios: false, problemas: 0 }],
    ['conta e bloco, anuncios desligados', s(false, C, B), { verificacao: true, anuncios: false, problemas: 0 }],
    ['conta e bloco, anuncios ligados', s(true, C, B), { verificacao: true, anuncios: true, problemas: 0 }],
    ['conta ligada sem bloco', s(true, C, ''), { verificacao: true, anuncios: false, problemas: 0 }],
    ['conta com "ca-" na frente', s(true, `ca-${C}`, B), { verificacao: false, anuncios: false, problemas: 1 }],
    ['conta com numero faltando', s(true, 'pub-123', ''), { verificacao: false, anuncios: false, problemas: 1 }],
    ['bloco com letra', s(true, C, 'abc123'), { verificacao: true, anuncios: false, problemas: 1 }],
    ['bloco sem conta', s(true, '', B), { verificacao: false, anuncios: false, problemas: 1 }],
  ];
  for (const [nome, r, esperado] of casos) {
    if (r.verificacao !== esperado.verificacao || r.anuncios !== esperado.anuncios || r.problemas.length !== esperado.problemas) ach('alto', `situacaoDosAds (${nome}): deu verificacao=${r.verificacao}, anuncios=${r.anuncios}, ${r.problemas.length} problema(s); o certo e verificacao=${esperado.verificacao}, anuncios=${esperado.anuncios}, ${esperado.problemas} problema(s)`, '_ferramentas/gerador/anuncio.mjs');
  }
  if (linhaDoAdsTxt(C) !== 'google.com, pub-1234567890123456, DIRECT, f08c47fec0942fa0') ach('critico', `linha do ads.txt fora do formato do Google: "${linhaDoAdsTxt(C)}"`, '_ferramentas/gerador/anuncio.mjs');
  if (!EH_ADS_TXT_GERADO.test(`${linhaDoAdsTxt(C)}\n`)) ach('alto', 'o gerador nao reconheceria o proprio ads.txt (nao conseguiria apagar ao desligar a conta)', '_ferramentas/gerador/anuncio.mjs');
  if (metaDeVerificacao(C) !== '<meta name="google-adsense-account" content="ca-pub-1234567890123456">') ach('critico', `meta de verificacao fora do formato do Google: ${metaDeVerificacao(C)}`, '_ferramentas/gerador/anuncio.mjs');
  const sc = scriptsDoAnuncio(C, B, '../');
  if (sc.length !== 1 || sc[0] !== '<script src="../assets/js/anuncio.js" data-cliente="ca-pub-1234567890123456" data-bloco="9876543210" data-privacidade="../privacidade.html#cookies" defer></script>') ach('alto', 'o script do anuncio saiu fora do formato (so o anuncio.js, com a conta, o bloco e o endereco da privacidade; o do Google NAO vem no HTML)', '_ferramentas/gerador/anuncio.mjs');
  // o aviso de cookies (assets/js/anuncio.js): o script do Google so pode ser buscado depois do aceite, e o aviso tem de oferecer rejeitar, escolher e aceitar
  const js = ler('assets/js/anuncio.js');
  for (const [trecho, porque] of [["botao('Rejeitar', 'rejeitar')", 'botao Rejeitar'], ["botao('Aceitar', 'aceitar')", 'botao Aceitar'], ["botao('Escolher', 'escolher')", 'botao Escolher (segundo nivel)'], ["caixa.checked = escolha === 'aceito'", 'categoria Publicidade desligada por padrao'], ['localStorage', 'a escolha guardada no navegador'], ['a[data-cookies-preferencias]', 'o link do rodape reabre a escolha']]) if (!js.includes(trecho)) ach('alto', `o aviso de cookies perdeu uma parte obrigatoria: ${porque}`, 'assets/js/anuncio.js');
  if ((js.match(/pagead2\.googlesyndication\.com/g) ?? []).length !== 1 || !/function carregarGoogle\(\) \{[\s\S]*?pagead2\.googlesyndication\.com[\s\S]*?\n  \}/.test(js) || !/if \(escolha === 'aceito'\) \{ raiz\.classList\.remove\('sem-anuncio'\); carregarGoogle\(\); todos\(\); \}/.test(js)) ach('critico', 'o script do Google so pode ser buscado dentro de carregarGoogle(), chamado so quando a escolha e "aceito"', 'assets/js/anuncio.js');
  if (!/\.sem-anuncio \.ads\.ads-real \{ display: none; \}/.test(ler('assets/css/style.css'))) ach('alto', 'falta no CSS a regra que esconde os espacos de anuncio enquanto nao ha aceite (.sem-anuncio .ads.ads-real)', 'assets/css/style.css');
  const marc = (id, oculto = '') => `<div class="ads" data-ads="${id}" aria-hidden="true"${oculto}>ADS</div>`;
  const pagina = `<main>\n      ${marc('apos-carrossel')}\n<p>texto</p>\n      ${marc('apos-noticias', ' hidden')}\n</main>`;
  const com = porAnuncios(pagina, C, B);
  if ((com.match(/<ins class="adsbygoogle ads_bloco" style="display:block" data-ad-client="ca-pub-1234567890123456" data-ad-slot="9876543210"><\/ins>/g) ?? []).length !== 2 || />ADS</.test(com) || /aria-hidden/.test(com)) ach('alto', 'porAnuncios devia trocar os dois marcadores pelo bloco do AdSense (sem a palavra ADS e sem aria-hidden)', '_ferramentas/gerador/anuncio.mjs');
  if (com !== porAnuncios(com, C, B)) ach('alto', 'porAnuncios aplicado duas vezes mudou a pagina (tem de dar o mesmo resultado)', '_ferramentas/gerador/anuncio.mjs');
  if (tirarAnuncios(com) !== `<main>\n      ${marc('apos-carrossel')}\n<p>texto</p>\n      ${marc('apos-noticias')}\n</main>`) ach('alto', 'tirarAnuncios devia devolver os marcadores "ADS" (o caminho tem de ter volta)', '_ferramentas/gerador/anuncio.mjs');
  if (anuncioHtml('x', C, B) !== `<div class="ads ads-real" data-ads="x"><ins class="adsbygoogle ads_bloco" style="display:block" data-ad-client="ca-${C}" data-ad-slot="${B}"></ins></div>`) ach('alto', 'anuncioHtml mudou de formato (o CSS .ads-real/.ads_bloco e o ads.js dependem dele)', '_ferramentas/gerador/anuncio.mjs');
  if (!temEspacoDeAnuncio(pagina) || !temEspacoDeAnuncio(com) || !temEspacoDeAnuncio('<div class="news-grid" data-ads-primeiro="3" data-ads-cada="2">') || temEspacoDeAnuncio('<main><p>sem espaco</p></main>')) ach('alto', 'temEspacoDeAnuncio errou em algum dos quatro casos (marcador, bloco, lista, pagina sem espaco)', '_ferramentas/gerador/anuncio.mjs');
  // o tamanho do bloco mora no CSS e tem de caber na altura reservada (.ads: 90 px no computador, 100 px ate 700 px)
  const css = ler('assets/css/style.css');
  if (!/\.ads_bloco \{ width: 320px; height: 100px; \}/.test(css) || !/@media \(min-width: 500px\) \{ \.ads_bloco \{ width: 468px; height: 60px; \} \}/.test(css) || !/@media \(min-width: 800px\) \{ \.ads_bloco \{ width: 728px; height: 90px; \} \}/.test(css)) ach('alto', 'o tamanho do bloco de anuncio (.ads_bloco: 320x100, 468x60 e 728x90) nao esta no CSS como o esperado', 'assets/css/style.css');

  // ---- o site como esta ----
  const atual = situacaoDosAds({ ativos: ADS_ATIVOS, cliente: ADS_CLIENTE, bloco: ADS_BLOCO });
  for (const p of atual.problemas) ach('critico', p, '_ferramentas/gerador/config.mjs');
  let comMeta = 0, comScript = 0, comBloco = 0;
  for (const rel of paginasHtml()) {
    const h = ler(rel);
    if (h.includes('name="google-adsense-account"')) comMeta++;
    if (h.includes('pagead2.googlesyndication.com')) comScript++;
    if (h.includes('class="adsbygoogle')) comBloco++;
    if (h.includes('pagead2.googlesyndication.com')) ach('critico', 'o script do Google veio escrito na pagina: quem busca e o anuncio.js, so depois do aceite no aviso de cookies', rel);
    if (!atual.anuncios && (h.includes('class="adsbygoogle') || h.includes('assets/js/anuncio.js') || h.includes('data-cookies-preferencias'))) ach('alto', 'pagina com codigo de anuncio ou link de preferencias de cookies, mas os anuncios nao estao ligados em config.mjs (rode npm run gerar)', rel);
    if (atual.anuncios && (!h.includes('assets/js/anuncio.js') || !h.includes('data-cookies-preferencias'))) ach('alto', 'os anuncios estao ligados, mas a pagina nao carrega o anuncio.js ou nao tem o link "Preferencias de cookies" no rodape (rode npm run gerar)', rel);
    if (!atual.verificacao && h.includes('name="google-adsense-account"')) ach('alto', 'pagina com a meta de verificacao do AdSense, mas ADS_CLIENTE esta vazio (rode npm run gerar)', rel);
    if (atual.anuncios && />ADS<\/div>/.test(h)) ach('alto', 'os anuncios estao ligados, mas a pagina ainda tem o marcador "ADS" no lugar do bloco (rode npm run gerar)', rel);
  }
  if (atual.verificacao) {
    if (!existe('ads.txt') || ler('ads.txt').trim() !== linhaDoAdsTxt(ADS_CLIENTE)) ach('critico', 'a conta do AdSense esta configurada, mas o ads.txt nao existe ou nao traz a linha da conta (rode npm run gerar)', 'ads.txt');
    if (!ler('index.html').includes(metaDeVerificacao(ADS_CLIENTE))) ach('critico', 'a conta do AdSense esta configurada, mas a home nao traz a meta de verificacao (rode npm run gerar)', 'index.html');
  } else if (existe('ads.txt')) ach('alto', 'existe um ads.txt na raiz, mas ADS_CLIENTE esta vazio: o arquivo e gerado, nao escrito a mao', 'ads.txt');
  a.push(achado('info', T, `AdSense: ${atual.anuncios ? 'ANUNCIOS LIGADOS' : atual.verificacao ? 'so verificacao (conta informada, anuncios desligados)' : 'sem conta (tudo inerte)'}; ${comMeta} paginas com a meta, ${comScript} com o script do Google, ${comBloco} com bloco de anuncio`));

  // ---- 2) os tres estados, com o gerador de verdade, numa copia (so com --so=anuncio) ----
  if (!process.argv.some((x) => x.startsWith('--so=') && x.slice(5).split(',').includes('anuncio'))) return a;
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-ads-'));
  try {
    const original = /[\\/]_conteudo[\\/]materias[\\/].*[\\/](thumb|card|img-\d+_[^\\/]*)\.(jpe?g|png|webp)$/i;
    fs.cpSync(raiz, tmp, { recursive: true, filter: (f) => { const r = path.relative(raiz, f).split(path.sep).join('/'); return !/^(node_modules|_site|_r2|\.git|pagefind)(\/|$)/.test(r) && !original.test(f); } });
    const cfg = path.join(tmp, '_ferramentas/gerador/config.mjs'), cfg0 = fs.readFileSync(cfg, 'utf8');
    const por = (ativos, cliente, bloco) => {
      const novo = cfg0.replace(/export const ADS_ATIVOS = (?:true|false);/, `export const ADS_ATIVOS = ${ativos};`).replace(/export const ADS_CLIENTE = '[^']*';/, `export const ADS_CLIENTE = '${cliente}';`).replace(/export const ADS_BLOCO = '[^']*';/, `export const ADS_BLOCO = '${bloco}';`);
      fs.writeFileSync(cfg, novo);
      const g = spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', env: { ...process.env, IMAGENS_DO_REGISTRO: '1' }, timeout: 5 * 60 * 1000 });
      return { status: g.status, saida: `${g.stdout ?? ''}${g.stderr ?? ''}` };
    };
    const lerT = (rel) => fs.readFileSync(path.join(tmp, rel), 'utf8');
    const fotografia = () => { const m = new Map(); (function w(r) { for (const e of fs.readdirSync(path.join(tmp, r), { withFileTypes: true })) { const p = r ? `${r}/${e.name}` : e.name; if (e.name.startsWith('_') || e.name.startsWith('.')) continue; if (e.isDirectory()) w(p); else if (/\.(html|xml|txt|json)$/.test(e.name)) m.set(p, fs.readFileSync(path.join(tmp, p), 'utf8')); } })(''); return m; };
    const materia = paginasHtml().find((r) => r.startsWith('noticias/')) ?? '';

    // estado 0: como esta hoje no site real (parte-se de tudo desligado)
    if (por(false, '', '').status !== 0) { ach('alto', 'o gerador falhou na copia, com tudo desligado'); return a; }
    const antes = fotografia();

    // estado 2: so a conta (e o estado para pedir a aprovacao do site)
    const g2 = por(false, C, '');
    if (g2.status !== 0) ach('alto', `so com a conta o gerador devia rodar: ${g2.saida.slice(-200)}`);
    else {
      if (!fs.existsSync(path.join(tmp, 'ads.txt')) || lerT('ads.txt') !== `${linhaDoAdsTxt(C)}\n`) ach('critico', 'so com a conta: o ads.txt devia existir na raiz com a linha da conta e mais nada');
      for (const p of ['index.html', 'noticias.html', materia].filter(Boolean)) if (!lerT(p).includes(metaDeVerificacao(C))) ach('alto', 'so com a conta: faltou a meta de verificacao do AdSense no <head>', p);
      if (lerT('404.html').includes('google-adsense-account')) ach('medio', 'pagina fora do indice (404) nao precisa da meta de verificacao', '404.html');
      for (const p of ['index.html', 'noticias.html']) { const h = lerT(p); if (h.includes('pagead2.googlesyndication.com') || h.includes('adsbygoogle') || h.includes('assets/js/anuncio.js') || h.includes('data-cookies-preferencias') || !/<div class="ads" data-ads="[^"]*" aria-hidden="true" hidden>ADS<\/div>/.test(h)) ach('alto', 'so com a conta: nao pode haver script, bloco de anuncio nem aviso de cookies, e os marcadores continuam escondidos', p); }
    }

    // estado 3: anuncio ligado
    const g3 = por(true, C, B);
    if (g3.status !== 0) ach('alto', `com conta, bloco e anuncios ligados o gerador devia rodar: ${g3.saida.slice(-200)}`);
    else {
      const home = lerT('index.html'), lista = lerT('noticias.html'), mat = materia ? lerT(materia) : '';
      const blocos = (h) => (h.match(/<div class="ads ads-real" data-ads="[^"]*"><ins class="adsbygoogle ads_bloco"/g) ?? []).length;
      if (blocos(home) !== 6 || />ADS<\/div>/.test(home)) ach('alto', `anuncio ligado: a home devia ter 6 blocos de anuncio e nenhum marcador "ADS" (tem ${blocos(home)} blocos)`, 'index.html');
      for (const [p, h] of [['index.html', home], ['noticias.html', lista], ...(mat ? [[materia, mat]] : [])]) {
        if (h.includes('pagead2.googlesyndication.com')) ach('critico', 'anuncio ligado: o script do Google NAO pode vir escrito na pagina (so depois do aceite, pelo anuncio.js)', p);
        if ((h.match(/<script src="(?:\.\.\/)?assets\/js\/anuncio\.js" data-cliente="ca-pub-1234567890123456" data-bloco="9876543210" data-privacidade="(?:\.\.\/)?privacidade\.html#cookies" defer><\/script>/g) ?? []).length !== 1) ach('alto', 'anuncio ligado: toda pagina devia carregar o anuncio.js uma vez, com a conta, o bloco e o endereco da privacidade', p);
        if (h.indexOf('assets/js/anuncio.js') > h.indexOf('</head>')) ach('alto', 'o anuncio.js tem de estar no <head> (roda antes do ads.js, que depende dele)', p);
        if (!/<a href="(?:\.\.\/)?privacidade\.html#cookies" data-cookies-preferencias>Preferências de cookies<\/a>/.test(h)) ach('alto', 'anuncio ligado: faltou no rodape o link "Preferencias de cookies"', p);
      }
      if (!/data-ads-primeiro="3" data-ads-cada="2"/.test(lista) || !lista.includes('assets/js/ads.js')) ach('alto', 'anuncio ligado: a lista de Noticias devia levar data-ads-primeiro/cada e o ads.js', 'noticias.html');
      if (mat && !mat.includes(metaDeVerificacao(C))) ach('alto', 'anuncio ligado: a materia continua levando a meta de verificacao', materia);
      // conta errada para o gerador, sem gravar nada
      const ruim = por(true, 'ca-pub-123', B);
      if (ruim.status === 0 || !ruim.saida.includes('ADS_CLIENTE')) ach('alto', `conta fora do formato devia parar o gerador citando ADS_CLIENTE: status ${ruim.status}`);
    }

    // de volta ao comeco: tudo identico ao que era, e o ads.txt some
    const g0 = por(false, '', '');
    const depois = g0.status === 0 ? fotografia() : new Map();
    const mudaram = [...antes.keys()].filter((k) => depois.get(k) !== antes.get(k)), sobraram = [...depois.keys()].filter((k) => !antes.has(k));
    if (g0.status !== 0 || mudaram.length || sobraram.length) ach('alto', `desligando tudo, o site devia voltar a ser identico ao de antes: ${mudaram.length} arquivo(s) diferentes (${mudaram.slice(0, 3).join(', ')}), ${sobraram.length} sobrando (${sobraram.slice(0, 3).join(', ')})`);
    a.push(achado('info', T, `tres estados conferidos numa copia com o gerador de verdade (${antes.size} arquivos comparados na volta)`));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return a;
}
