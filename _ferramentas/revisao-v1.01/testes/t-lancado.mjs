// Contagem regressiva do GTA 6 e o estado "lancado" (config.mjs, GTA6): a home (faixa) e gta6.html (bloco grande), entre <!--contagem:inicio--> e <!--contagem:fim-->.
// ANTES da data (alvo): contagem, e o texto do lancado so em atributos data-lancado-* (nada visivel). DEPOIS: o estado lancado ja sai pronto no HTML, sem numeros.
// A data de referencia e hoje (ou BRUBAO_AGORA, usada pelo t-virada.mjs para simular a virada numa copia do site).
import { achado, existe, ler, limparHtml } from './lib.mjs';
import { GTA6 } from '../../gerador/config.mjs';
import { dataLonga } from '../../gerador/util.mjs';

const T = 'lancado';
const PAGINAS = [['index.html', true], ['gta6.html', false]]; // [pagina, e a faixa da home?]
const entidades = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
const modelo = (t) => t.replace('{gta6-data}', dataLonga(GTA6.alvo)).replace('{gta6-plataformas-curto}', GTA6.plataformasCurto).replace('{gta6-plataformas}', GTA6.plataformas);

export default async function () {
  const a = [];
  const alvo = Date.parse(GTA6.alvo), agora = process.env.BRUBAO_AGORA ? Date.parse(process.env.BRUBAO_AGORA) : Date.now(), L = GTA6.lancado;
  const texto = modelo(L.texto);
  let conferidas = 0;
  for (const [rel, faixa] of PAGINAS) {
    if (!existe(rel)) { a.push(achado('alto', T, 'pagina nao existe', rel)); continue; }
    const bruto = ler(rel), html = limparHtml(bruto);
    const [ini, fim] = [bruto.indexOf('<!--contagem:inicio-->'), bruto.indexOf('<!--contagem:fim-->')];
    if (ini < 0 || fim < ini || bruto.indexOf('<!--contagem:inicio-->', ini + 1) >= 0) { a.push(achado('alto', T, 'faltam, estao fora de ordem ou repetidos os marcadores <!--contagem:inicio--> e <!--contagem:fim-->', rel)); continue; }
    const regiao = bruto.slice(ini, fim), secoes = regiao.match(/<section [^>]*>[\s\S]*?<\/section>/g) ?? [];
    if (secoes.length !== 1) { a.push(achado('alto', T, `${secoes.length} secao(oes) entre os marcadores da contagem (deve ter 1)`, rel)); continue; }
    const secao = secoes[0], abre = secao.match(/^<section ([^>]*)>/)[1];
    const classe = (abre.match(/class="([^"]*)"/) ?? [])[1] ?? '';
    conferidas++;
    if (!/\bgta\b/.test(classe) || /\bgta-faixa\b/.test(classe) !== faixa) a.push(achado('alto', T, `classe "${classe}": ${faixa ? 'a home usa a faixa (gta gta-faixa)' : 'a pagina do GTA 6 usa o bloco grande (gta)'}`, rel));
    if (!/aria-labelledby="gta-title"/.test(abre)) a.push(achado('medio', T, 'a secao da contagem perdeu aria-labelledby="gta-title"', rel));
    const lancado = /data-estado="lancado"/.test(abre), temContagem = /id="gta-count"/.test(secao);

    if (agora < alvo) { // ---- antes da data: contagem; o lancado so nos atributos ----
      if (lancado || /\bgta-lancado\b/.test(classe)) a.push(achado('alto', T, 'o estado LANCADO aparece antes da data de lancamento', rel));
      if (!temContagem) a.push(achado('alto', T, 'sem a contagem regressiva (id="gta-count") antes da data', rel));
      const attr = (nome) => entidades((abre.match(new RegExp(`data-lancado-${nome}="([^"]*)"`)) ?? [])[1] ?? '');
      for (const [nome, esperado] of [['kicker', L.kicker], ['titulo', L.titulo], ['texto', texto]]) if (attr(nome) !== esperado) a.push(achado('alto', T, `data-lancado-${nome}="${attr(nome)}" e o de config.mjs e "${esperado}"`, rel));
      if (faixa) { if (attr('botao') !== L.botao || attr('href') !== 'gta6') a.push(achado('alto', T, 'a home precisa de data-lancado-botao (o texto de config.mjs) e data-lancado-href="gta6.html"', rel)); }
      else if (/data-lancado-botao|data-lancado-href/.test(abre)) a.push(achado('medio', T, 'a pagina do GTA 6 nao tem botao no estado lancado (ja esta nela)', rel));
      // nada do lancado visivel: o texto visivel da secao e so o da contagem
      const visivel = limparHtml(secao).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      for (const frase of [L.kicker, `${L.titulo}`, texto]) if (visivel.toLowerCase().includes(frase.toLowerCase())) a.push(achado('alto', T, `o texto do estado lancado ("${frase}") esta visivel antes da data`, rel));
      if (!new RegExp(`data-alvo="${GTA6.alvo.replace(/[+]/g, '\\+')}"`).test(secao)) a.push(achado('alto', T, `data-alvo da contagem diferente de GTA6.alvo (${GTA6.alvo})`, rel));
    } else { // ---- a partir da data: o HTML ja sai lancado ----
      if (!lancado) a.push(achado('medio', T, 'ja passou da data de lancamento e o HTML ainda mostra a contagem (o site foi gerado antes: rode npm run gerar; quem abre a pagina ve o estado lancado pelo contador.js)', rel));
      else {
        if (temContagem || /class="unit"/.test(secao)) a.push(achado('alto', T, 'estado lancado ainda com os numeros da contagem', rel));
        if (!/\bgta-lancado\b/.test(classe)) a.push(achado('alto', T, 'estado lancado sem a classe gta-lancado (o estilo depende dela)', rel));
        const kicker = (secao.match(/<p class="gta-kicker">([^<]*)<\/p>/) ?? [])[1], tit = (secao.match(/<h2 id="gta-title" class="gta-title">GTA <span>VI<\/span> ([^<]*)<\/h2>/) ?? [])[1], data = (secao.match(/<p class="gta-date">([^<]*)<\/p>/) ?? [])[1];
        if (entidades(kicker ?? '') !== L.kicker || entidades(tit ?? '') !== L.titulo || entidades(data ?? '') !== texto) a.push(achado('alto', T, `texto do estado lancado diferente de config.mjs (kicker "${kicker}", titulo "${tit}", data "${data}")`, rel));
        const botao = secao.match(/<a class="btn primary gta-botao" href="([^"]*)">([^<]*)<\/a>/);
        if (faixa && (!botao || botao[1] !== 'gta6.html' || entidades(botao[2]) !== L.botao)) a.push(achado('alto', T, 'a home no estado lancado precisa do botao para gta6.html', rel));
        if (!faixa && botao) a.push(achado('medio', T, 'a pagina do GTA 6 nao precisa do botao no estado lancado', rel));
      }
    }
    if (!/<script src="assets\/js\/contador\.js" defer><\/script>/.test(bruto)) a.push(achado('alto', T, 'pagina sem <script src="assets/js/contador.js" defer> (e ele que troca a contagem pelo estado lancado na hora H)', rel));
  }
  a.push(achado('info', T, `${conferidas} secoes de contagem conferidas; alvo ${GTA6.alvo}; referencia ${new Date(agora).toISOString()} (${agora < alvo ? `faltam ${Math.ceil((alvo - agora) / 86400000)} dia(s): contagem, lancado escondido` : 'ja passou: estado lancado'})`));
  return a;
}
