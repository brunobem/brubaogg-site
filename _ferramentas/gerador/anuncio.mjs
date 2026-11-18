// Anuncio de verdade (Google AdSense) nos espacos reservados do site. Fase 5 do plano, preparada em 18/11/2026.
//
// TUDO AQUI FICA INERTE enquanto ADS_CLIENTE (config.mjs) estiver vazio: nenhuma pagina muda. Os tres estados:
//   1) ADS_CLIENTE vazio ............................ nada (so os marcadores "ADS" de sempre, ligados ou escondidos por ADS_ATIVOS)
//   2) ADS_CLIENTE preenchido, ADS_ATIVOS = false ... VERIFICACAO: a meta do Google no <head> e o ads.txt na raiz. E o estado para pedir a aprovacao do site.
//   3) ADS_CLIENTE + ADS_BLOCO + ADS_ATIVOS = true .. ANUNCIO: cada espaco reservado (.ads) recebe o bloco do AdSense e TODA pagina carrega o assets/js/anuncio.js,
//      que mostra o AVISO DE COOKIES e so busca o script do Google depois do aceite (guia de cookies da ANPD: cookie de publicidade depende de consentimento).
//      O script do Google NUNCA vem escrito no HTML. O rodape ganha o link "Preferencias de cookies" (modelos.mjs).
//
// De onde saem as regras (lidas em 18/11/2026; confira de novo antes de ligar, porque mudam):
//   - meta de verificacao e ads.txt: https://support.google.com/adsense/answer/7584263 e https://support.google.com/adsense/answer/12171612
//   - tamanho exato do anuncio por largura de tela (classe CSS + media query, modificacao aprovada pelo Google): https://support.google.com/adsense/answer/9183363
//     O tamanho mora em style.css (.ads_bloco): 320x100 no celular, 468x60 no meio e 728x90 no computador. Cabem na altura reservada de .ads (100 e 90 px).
// Detalhes, riscos e o que falta (aviso de cookies, texto da privacidade): pasta do canal, portal\tecnologia\pesquisa-site\fase5-anuncio-regras.md

const CLIENTE = /^pub-\d{16}$/; // o codigo da conta, sem o "ca-" (e assim que ele vai no ads.txt)
const BLOCO = /^\d{8,12}$/; // o numero do bloco de anuncio (data-ad-slot)

/** O que vale com esta configuracao: { verificacao, anuncios, problemas }. Valor preenchido fora do formato PARA o gerador (melhor que publicar um codigo errado). */
export function situacaoDosAds({ ativos, cliente, bloco }) {
  const problemas = [];
  const c = String(cliente ?? '').trim(), b = String(bloco ?? '').trim();
  if (c && !CLIENTE.test(c)) problemas.push(`ADS_CLIENTE "${c}" esta fora do formato: use "pub-" e os 16 numeros da conta do AdSense, sem o "ca-" (config.mjs).`);
  if (b && !BLOCO.test(b)) problemas.push(`ADS_BLOCO "${b}" esta fora do formato: use so os numeros do bloco de anuncio (data-ad-slot) criado na conta do AdSense (config.mjs).`);
  if (b && !c) problemas.push('ADS_BLOCO esta preenchido mas ADS_CLIENTE nao: o bloco de anuncio so funciona com o codigo da conta (config.mjs).');
  const verificacao = CLIENTE.test(c);
  return { verificacao, anuncios: Boolean(ativos) && verificacao && BLOCO.test(b), problemas };
}

/** a linha do ads.txt (raiz do site): diz que esta conta do Google pode vender anuncio no site. O ultimo campo e fixo, do Google. */
export const linhaDoAdsTxt = (cliente) => `google.com, ${cliente}, DIRECT, f08c47fec0942fa0`;
export const EH_ADS_TXT_GERADO = /^google\.com, pub-\d{16}, DIRECT, f08c47fec0942fa0\s*$/;

/** no <head>: a meta que o Google le para confirmar que o site e da conta (dispensa carregar o script antes da aprovacao) */
export const metaDeVerificacao = (cliente) => `<meta name="google-adsense-account" content="ca-${cliente}">`;
/** onde o visitante muda a escolha dos cookies: a secao da pagina de privacidade (com JavaScript, o anuncio.js abre a escolha ali mesmo, sem sair da pagina) */
export const LINK_DE_PREFERENCIAS = 'privacidade.html#cookies';
/** no <head> de toda pagina, com os anuncios ligados: o script do site, que cuida do aviso de cookies e so depois do aceite busca o do Google (`base` = caminho ate a raiz) */
export const scriptsDoAnuncio = (cliente, bloco, base = '') => [
  `<script src="${base}assets/js/anuncio.js" data-cliente="ca-${cliente}" data-bloco="${bloco}" data-privacidade="${base}${LINK_DE_PREFERENCIAS}" defer></script>`,
];

const MARCADOR = /<div class="ads" data-ads="([^"]*)"(?: aria-hidden="true")?(?: hidden)?>ADS<\/div>/g;
const COM_ANUNCIO = /<div class="ads ads-real" data-ads="([^"]*)"><ins class="adsbygoogle ads_bloco"[^>]*><\/ins><\/div>/g;
/** o espaco reservado ja com o bloco do AdSense dentro (sem a palavra ADS e sem aria-hidden: agora e conteudo de verdade) */
export const anuncioHtml = (lugar, cliente, bloco) => `<div class="ads ads-real" data-ads="${lugar}"><ins class="adsbygoogle ads_bloco" style="display:block" data-ad-client="ca-${cliente}" data-ad-slot="${bloco}"></ins></div>`;
/** volta todo espaco com anuncio ao marcador "ADS" (as paginas escritas a mao sao regravadas no lugar: o caminho tem de ter volta) */
export const tirarAnuncios = (html) => html.replace(COM_ANUNCIO, (todo, lugar) => `<div class="ads" data-ads="${lugar}" aria-hidden="true">ADS</div>`);
/** troca todo marcador "ADS" da pagina pelo bloco do AdSense */
export const porAnuncios = (html, cliente, bloco) => tirarAnuncios(html).replace(MARCADOR, (todo, lugar) => anuncioHtml(lugar, cliente, bloco));
/** a pagina tem algum espaco de anuncio (fixo no HTML ou posto pelo ads.js nas listas)? */
export const temEspacoDeAnuncio = (html) => /<div class="ads(?: ads-real)?" data-ads="/.test(html) || /\sdata-ads-cada="/.test(html);
