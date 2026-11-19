// AO VIVO AGORA (fase 8): a caixa da home, o script que monta o player e o chat, e o vigia (a funcao separada na Cloudflare que sabe se ha live).
// Confere que: (1) a caixa so existe na home, vazia e escondida, no lugar certo; (2) o script nao escreve HTML vindo de fora e so aceita os enderecos
// do proprio canal; (3) o vigia nao tem rota no dominio do site nem segredo em arquivo; (4) a logica do vigia passa no teste dela (respostas de mentira).
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { achado, existe, ler, paginasHtml, raiz } from './lib.mjs';
import { AO_VIVO } from '../../gerador/config.mjs';

const T = 'ao-vivo';
const PASTA = '_ferramentas/cloudflare/ao-vivo';
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

export default async function () {
  const a = [];
  const ach = (sev, msg, onde = '') => a.push(achado(sev, T, msg, onde));
  const ligado = !!AO_VIVO.vigia;

  // ---------- 1. config ----------
  if (ligado && !/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/$/.test(AO_VIVO.vigia)) ach('alto', `AO_VIVO.vigia fora do formato (https://<funcao>.<conta>.workers.dev/): ${AO_VIVO.vigia}`, 'config.mjs');
  if (AO_VIVO.chat && !/^https:\/\/live\.brubaogg\.com\.br\//.test(AO_VIVO.chat)) ach('alto', `AO_VIVO.chat so pode ser um endereco de https://live.brubaogg.com.br/: ${AO_VIVO.chat}`, 'config.mjs');

  // ---------- 2. a caixa na home (e so nela) ----------
  const caixa = ligado ? `<div class="ao-vivo" id="ao-vivo" data-vigia="${esc(AO_VIVO.vigia)}"${AO_VIVO.chat ? ` data-chat="${esc(AO_VIVO.chat)}"` : ''} hidden></div>` : '';
  for (const pagina of paginasHtml()) {
    const h = ler(pagina), tem = h.includes('id="ao-vivo"'), script = h.includes('assets/js/ao-vivo.js');
    if (pagina !== 'index.html') { if (tem || script) ach('alto', 'a caixa (ou o script) do "ao vivo agora" so entra na home', pagina); continue; }
    if (!ligado) { if (tem || script) ach('alto', 'AO_VIVO.vigia vazio: a home nao pode levar a caixa nem o script (rode npm run gerar)', pagina); continue; }
    if (h.split(caixa).length !== 2) { ach('alto', `a home devia ter UMA caixa do "ao vivo agora", vazia e escondida, exatamente assim: ${caixa}`, pagina); continue; }
    const compacto = h.replace(/>\s+</g, '><'), i = compacto.indexOf(caixa);
    if (!/<\/section>$/.test(compacto.slice(0, i)) || !/<section class="carrossel"/.test(compacto.slice(0, i))) ach('alto', 'a caixa do "ao vivo agora" devia vir logo depois do carrossel', pagina);
    if (!compacto.slice(i + caixa.length).startsWith('<script src="assets/js/ao-vivo.js" defer></script>')) ach('alto', 'logo depois da caixa devia vir o script assets/js/ao-vivo.js (com defer)', pagina);
    if ((h.match(/assets\/js\/ao-vivo\.js/g) ?? []).length !== 1) ach('medio', 'o script ao-vivo.js devia ser carregado uma vez so', pagina);
  }

  // ---------- 3. o script ----------
  if (!existe('assets/js/ao-vivo.js')) ach('alto', 'falta assets/js/ao-vivo.js');
  else {
    const js = ler('assets/js/ao-vivo.js'), codigo = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    if (/innerHTML|outerHTML|insertAdjacentHTML|document\.write|\beval\(|new Function/.test(codigo)) ach('critico', 'ao-vivo.js nao pode escrever HTML nem rodar texto vindo de fora (so createElement e textContent)', 'assets/js/ao-vivo.js');
    if (!codigo.includes('/^[A-Za-z0-9_-]{11}$/')) ach('alto', 'ao-vivo.js precisa conferir o formato do ID do video antes de usar', 'assets/js/ao-vivo.js');
    if (!codigo.includes("'https://www.youtube-nocookie.com/embed/'")) ach('alto', 'o player da live usa o dominio youtube-nocookie.com, como os outros players do site', 'assets/js/ao-vivo.js');
    if (!/mute=1/.test(codigo)) ach('alto', 'o player da live precisa comecar mudo (mute=1): navegador nao deixa tocar som sozinho', 'assets/js/ao-vivo.js');
    if (!/IntersectionObserver/.test(codigo)) ach('medio', 'o player so deve carregar com mais da metade na tela (IntersectionObserver)', 'assets/js/ao-vivo.js');
    if (!/live\\\.brubaogg\\\.com\\\.br/.test(codigo)) ach('alto', 'ao-vivo.js precisa recusar endereco de chat que nao seja de live.brubaogg.com.br', 'assets/js/ao-vivo.js');
    if (!/sandbox/.test(codigo)) ach('medio', 'o quadro do chat devia ter sandbox (o chat roda, mas nao navega a pagina)', 'assets/js/ao-vivo.js');
    if (!/localhost\|127/.test(codigo) || !/ao-vivo=teste/.test(codigo)) ach('medio', 'o modo de teste (?ao-vivo=teste) tem de valer so no localhost', 'assets/js/ao-vivo.js');
    const enderecos = [...codigo.matchAll(/https?:\/\/[^\s'"\\)]+/g)].map((m) => m[0]).filter((u) => !/^https:\/\/www\.youtube(-nocookie)?\.com\//.test(u));
    if (enderecos.length) ach('alto', `ao-vivo.js so pode ter endereco do YouTube escrito dentro dele; os outros vem da caixa da home: ${enderecos.join(', ')}`, 'assets/js/ao-vivo.js');
    for (const classe of ['ao-vivo-cab', 'ao-vivo-ponto', 'ao-vivo-titulo', 'ao-vivo-corpo', 'ao-vivo-tela', 'ao-vivo-chat']) if (!ler('assets/css/style.css').includes(`.${classe}`)) ach('alto', `falta no CSS a classe .${classe}, usada pelo ao-vivo.js`, 'assets/css/style.css');
  }

  // ---------- 4. o vigia ----------
  for (const arq of ['vigia.mjs', 'worker.mjs', 'wrangler.jsonc', 'testar-vigia.mjs']) if (!existe(`${PASTA}/${arq}`)) ach('alto', `falta ${PASTA}/${arq}`);
  if (existe(`${PASTA}/wrangler.jsonc`)) {
    const w = ler(`${PASTA}/wrangler.jsonc`).replace(/^\s*\/\/.*$/gm, '');
    if (/"routes"|"route"|custom_domain/.test(w)) ach('critico', 'o vigia NAO pode ter rota nem dominio do site: so o endereco proprio *.workers.dev', `${PASTA}/wrangler.jsonc`);
    if (!/"name":\s*"brubaogg-ao-vivo"/.test(w)) ach('alto', 'o vigia se chama brubaogg-ao-vivo (nunca o nome da funcao do site)', `${PASTA}/wrangler.jsonc`);
    if (!/"crons":\s*\[\s*"\* \* \* \* \*"\s*\]/.test(w)) ach('alto', 'o vigia roda a cada minuto ("* * * * *")', `${PASTA}/wrangler.jsonc`);
    if (/YOUTUBE_CHAVE"\s*:|CF_TOKEN_TUNEL"\s*:|CONTA_ID"\s*:/.test(w)) ach('critico', 'segredo NAO se escreve no wrangler.jsonc: o Bruno cola com "wrangler secret put" ou no painel', `${PASTA}/wrangler.jsonc`);
  }
  for (const arq of ['vigia.mjs', 'worker.mjs']) if (existe(`${PASTA}/${arq}`) && /AIza[0-9A-Za-z_-]{20,}|Bearer [A-Za-z0-9_-]{30,}/.test(ler(`${PASTA}/${arq}`))) ach('critico', 'parece haver uma chave escrita no codigo do vigia', `${PASTA}/${arq}`);
  if (existe(`${PASTA}/worker.mjs`) && !/'https:\/\/brubaogg\.com\.br'/.test(ler(`${PASTA}/worker.mjs`))) ach('alto', 'o vigia so responde para o proprio site (lista ORIGENS)', `${PASTA}/worker.mjs`);
  if (existe(`${PASTA}/testar-vigia.mjs`)) {
    const r = spawnSync(process.execPath, [path.join(raiz, PASTA, 'testar-vigia.mjs')], { encoding: 'utf8' });
    if (r.status !== 0) ach('alto', `o teste da logica do vigia falhou: ${(r.stdout || r.stderr || '').trim().slice(-300)}`, `${PASTA}/testar-vigia.mjs`);
  }

  a.push(achado('info', T, `ao vivo agora: ${ligado ? `LIGADO (vigia ${AO_VIVO.vigia}${AO_VIVO.chat ? '; com chat' : '; sem chat'})` : 'desligado (AO_VIVO.vigia vazio)'}`));
  return a;
}
