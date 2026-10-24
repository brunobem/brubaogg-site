// Imagens da pasta de cada materia (thumb.png e img-N_<site da fonte>.png): aparece se o arquivo existe, some se nao existe, e a fonte sai do nome do arquivo.
// Roda em COPIAS do site com imagens de teste desenhadas aqui (nada e baixado e o site real nao muda). Lento (~1 min, chama o Python com Pillow): so roda com --so=imagens.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { spawnSync } from 'node:child_process';
import { achado, raiz } from './lib.mjs';
import { arquivoDaMateria } from '../../gerador/pastas.mjs';

const T = 'imagens';
const ID = 'pW_hLwquscM'; // "171, o GTA brasileiro, e adiado para 2027": 3 paragrafos, fontes Arkade, TechTudo, Critical Hits e Savestate

// PNG de cor lisa com um degrade (so para ter o que redimensionar)
function png(w, h, cor) {
  const crcTabela = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTabela[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const bloco = (tipo, dados) => { const t = Buffer.from(tipo), l = Buffer.alloc(4), c = Buffer.alloc(4); l.writeUInt32BE(dados.length); c.writeUInt32BE(crc(Buffer.concat([t, dados]))); return Buffer.concat([l, t, dados, c]); };
  const linha = w * 3 + 1, bruto = Buffer.alloc(linha * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = y * linha + 1 + x * 3; bruto[o] = (cor[0] + (x * 60) / w) & 255; bruto[o + 1] = (cor[1] + (y * 60) / h) & 255; bruto[o + 2] = cor[2]; }
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloco('IHDR', ihdr), bloco('IDAT', zlib.deflateSync(bruto)), bloco('IEND', Buffer.alloc(0))]);
}
const copiar = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-img-'));
  fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (s) => !/node_modules|[\\/]\.git([\\/]|$)/.test(s) });
  return tmp;
};
const gerar = (tmp) => { const r = spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', timeout: 5 * 60 * 1000 }); return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` }; };

export default async function () {
  const a = [];
  const py = ['python', 'py', 'python3'].some((c) => spawnSync(c, c === 'py' ? ['-3', '-c', 'import PIL'] : ['-c', 'import PIL'], { timeout: 20000 }).status === 0);
  if (!py) return [achado('baixo', T, 'sem Python com Pillow nesta maquina: o teste de imagens nao rodou (python -m pip install pillow)')];
  const reg = JSON.parse(fs.readFileSync(path.join(raiz, '_conteudo/enderecos.json'), 'utf8'))[ID];
  const pagina = `${reg.categoria}/${reg.slug}.html`;
  const tmp = copiar();
  try {
    const pasta = path.dirname(arquivoDaMateria(tmp, ID));
    // o site real pode ter imagens de verdade nesta materia (o exemplo do 171): na copia, parte-se sem elas
    for (const f of fs.readdirSync(pasta)) if (f !== `${ID}.json`) fs.rmSync(path.join(pasta, f));
    if (gerar(tmp).status !== 0) { a.push(achado('alto', T, 'o gerador falhou na copia sem as imagens do exemplo')); return a; }
    const html = () => fs.readFileSync(path.join(tmp, pagina), 'utf8');
    const publicadas = () => (fs.existsSync(path.join(tmp, 'assets/img/m', ID.toLowerCase())) ? fs.readdirSync(path.join(tmp, 'assets/img/m', ID.toLowerCase())).sort() : []);
    const outraPagina = 'noticias/a-rockstar-odeia-criadores-de-mods.html';
    const outraAntes = fs.existsSync(path.join(tmp, outraPagina)) ? fs.readFileSync(path.join(tmp, outraPagina), 'utf8') : null;
    const original = html();
    const sem = (h) => !/art-foto|assets\/img\/m\//.test(h);
    if (!sem(original)) a.push(achado('alto', T, 'a materia ja tem imagem no site real: o teste parte de uma materia sem imagens', pagina));

    // 1) thumb + as duas imagens entre os paragrafos
    fs.writeFileSync(path.join(pasta, 'thumb.png'), png(1600, 900, [200, 40, 40]));
    fs.writeFileSync(path.join(pasta, 'img-1_arkade.com.br.png'), png(1200, 800, [40, 120, 200]));
    fs.writeFileSync(path.join(pasta, 'img-2_exemplo.com.png'), png(600, 400, [40, 160, 80]));
    const g1 = gerar(tmp);
    if (g1.status !== 0) { a.push(achado('alto', T, `o gerador falhou com 3 imagens validas: ${g1.saida.slice(-250)}`)); return a; }
    const h1 = html();
    const figuras = h1.match(/<figure class="art-foto">[\s\S]*?<\/figure>/g) ?? [];
    if (figuras.length !== 2) a.push(achado('alto', T, `${figuras.length} figura(s) na pagina (devia ter 2: uma depois do 1o e outra depois do 2o paragrafo)`, pagina));
    else {
      const corpo = (h1.match(/<div class="art-body">([\s\S]*?)\n      <\/div>/) ?? [])[1] ?? '';
      const partes = corpo.split(/(?=<figure class="art-foto">)|(?<=<\/figure>)/).map((s) => s.trim()).filter(Boolean).map((s) => (s.startsWith('<figure') ? 'F' : s.startsWith('<p>') ? 'P' : '?'));
      if (partes.join('') !== 'PFPFP') a.push(achado('alto', T, `ordem no texto: ${partes.join(' ')} (o certo: P F P F P = paragrafo, imagem 1, paragrafo, imagem 2, paragrafo)`, pagina));
      if (!/<figcaption data-pagefind-ignore>Imagem: <a href="https:\/\/arkade\.com\.br\/[^"]+" target="_blank" rel="noopener">arkade\.com\.br<\/a><\/figcaption>/.test(figuras[0])) a.push(achado('alto', T, 'a legenda da imagem 1 devia citar arkade.com.br com link para a fonte da materia (o site do nome do arquivo e o de uma das fontes)', pagina));
      if (!/<figcaption data-pagefind-ignore>Imagem: exemplo\.com<\/figcaption>/.test(figuras[1])) a.push(achado('alto', T, 'a legenda da imagem 2 devia ser so o texto "exemplo.com" (nenhuma fonte da materia e desse site, entao nao vira link)', pagina));
      const larg = (f) => [...f.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
      if (larg(figuras[0]).join() !== '480,800,1000,1200') a.push(achado('alto', T, `larguras da imagem 1 (original de 1200 px): ${larg(figuras[0]).join(', ')} (o certo: 480, 800, 1000, 1200)`, pagina));
      if (larg(figuras[1]).join() !== '480,600') a.push(achado('alto', T, `larguras da imagem 2 (original de 600 px): ${larg(figuras[1]).join(', ')} (o certo: 480, 600: nunca aumenta a original)`, pagina));
      for (const f of figuras) { const m = f.match(/width="(\d+)" height="(\d+)"/); if (!m || !/<img [^>]*alt=""[^>]* loading="lazy"/.test(f)) a.push(achado('medio', T, 'a imagem do texto precisa de width, height, alt="" e loading="lazy"', pagina)); }
    }
    const capa = (h1.match(/<a class="fachada"[\s\S]*?<\/a>/) ?? [''])[0];
    const lcapa = [...capa.matchAll(/ (\d+)w/g)].map((m) => Number(m[1]));
    if (!/<img src="\.\.\/assets\/img\/m\/pw_hlwquscm\/thumb-[0-9a-f]{8}-\d+\.webp" srcset=/.test(capa) || lcapa.join() !== '480,640,960,1280') a.push(achado('alto', T, `a capa do player devia usar a thumb da pasta (480, 640, 960 e 1280 px); capa: ${capa.slice(0, 200)}`, pagina));
    const arquivos = publicadas();
    if (arquivos.length !== 4 + 4 + 2 || arquivos.some((f) => !f.endsWith('.webp'))) a.push(achado('alto', T, `arquivos publicados em assets/img/m/${ID.toLowerCase()}: ${arquivos.length} (devia ter 10 .webp: 4 da thumb, 4 da imagem 1 e 2 da imagem 2)`));
    if (outraAntes != null && fs.readFileSync(path.join(tmp, outraPagina), 'utf8') !== outraAntes) a.push(achado('alto', T, 'uma materia SEM imagens mudou so porque outra ganhou imagens', outraPagina));
    // a segunda geracao nao refaz nada (cache pelo conteudo do arquivo)
    const m0 = arquivos.map((f) => fs.statSync(path.join(tmp, 'assets/img/m', ID.toLowerCase(), f)).mtimeMs).join();
    gerar(tmp);
    const m1 = publicadas().map((f) => fs.statSync(path.join(tmp, 'assets/img/m', ID.toLowerCase(), f)).mtimeMs).join();
    if (m0 !== m1) a.push(achado('medio', T, 'a segunda geracao refez imagens que nao mudaram (o cache nao funcionou)'));

    // 2) so a imagem 2 (a 1 some) e uma imagem com numero maior que o de paragrafos (vai depois do ultimo)
    fs.rmSync(path.join(pasta, 'img-1_arkade.com.br.png'));
    fs.writeFileSync(path.join(pasta, 'img-5_savestate.com.br.png'), png(800, 450, [160, 160, 40]));
    const g2 = gerar(tmp);
    const h2 = g2.status === 0 ? html() : '';
    const f2 = h2.match(/<figure class="art-foto">/g) ?? [];
    const corpo2 = (h2.match(/<div class="art-body">([\s\S]*?)\n      <\/div>/) ?? [])[1] ?? '';
    const seq2 = [...corpo2.matchAll(/<p>|<figure class="art-foto">/g)].map((m) => (m[0] === '<p>' ? 'P' : 'F')).join('');
    if (g2.status !== 0 || f2.length !== 2 || seq2 !== 'PPFPF') a.push(achado('alto', T, `com img-2 e img-5 o texto devia ser P P F P F (a 5 vai depois do ultimo paragrafo); deu "${seq2}" (gerador ${g2.status === 0 ? 'ok' : `falhou: ${g2.saida.slice(-150)}`})`, pagina));
    if (publicadas().some((f) => f.startsWith('img-1-'))) a.push(achado('medio', T, 'a imagem 1 foi apagada da pasta da materia mas as versoes publicadas dela continuam em assets/img/m/ (a limpeza nao rodou)'));
    if (!/<a href="https:\/\/savestate\.com\.br\/[^"]+"[^>]*>savestate\.com\.br<\/a>/.test(h2)) a.push(achado('alto', T, 'a legenda da imagem 5 devia citar savestate.com.br com link (e o site de uma das fontes)', pagina));

    // 3) nomes que o gerador recusa (credito obrigatorio) e a thumb duplicada
    const recusas = [
      ['img-1.png', 'falta o site da fonte'], ['img-1_.png', 'falta o site da fonte'], ['img-1_semponto.png', 'nao parece o site da fonte'], ['foto.png', 'nome fora do padrao'],
      ['img-0_x.com.png', 'a posicao 0 nao vale'], ['thumb.gif', 'nome fora do padrao'],
    ];
    for (const [nome, trecho] of recusas) {
      const f = path.join(pasta, nome);
      fs.writeFileSync(f, png(100, 100, [10, 10, 10]));
      const g = gerar(tmp);
      if (g.status === 0 || !g.saida.includes(trecho) || !g.saida.includes(nome)) a.push(achado('alto', T, `o arquivo "${nome}" devia fazer o gerador parar dizendo "${trecho}" e citando o nome; deu status ${g.status}: ${g.saida.slice(-200)}`));
      fs.rmSync(f);
    }
    fs.writeFileSync(path.join(pasta, 'thumb.jpg'), png(100, 100, [10, 10, 10])); // ja existe thumb.png
    const gd = gerar(tmp);
    if (gd.status === 0 || !gd.saida.includes('outra thumb')) a.push(achado('alto', T, `duas thumbs na mesma pasta (thumb.png e thumb.jpg) deviam parar o gerador: ${gd.saida.slice(-160)}`));
    fs.rmSync(path.join(pasta, 'thumb.jpg'));
    // arquivo que nao e imagem e o JSON da materia nao atrapalham
    fs.writeFileSync(path.join(pasta, 'anotacoes.txt'), 'rascunho de pauta');
    if (gerar(tmp).status !== 0) a.push(achado('alto', T, 'um .txt solto na pasta da materia nao devia impedir o gerador'));

    // 4) tirando todas as imagens, a pagina volta a ser a de antes e nada sobra publicado
    for (const f of fs.readdirSync(pasta)) if (f !== `${ID}.json`) fs.rmSync(path.join(pasta, f));
    const g4 = gerar(tmp);
    if (g4.status !== 0 || html() !== original) a.push(achado('alto', T, `sem imagens a pagina devia voltar a ser identica a original (gerador ${g4.status === 0 ? 'ok' : `falhou: ${g4.saida.slice(-150)}`})`, pagina));
    // (o site real pode ter thumbs de outras materias em assets/img/m: so confere a pasta desta materia)
    if (fs.existsSync(path.join(tmp, 'assets/img/m', ID.toLowerCase()))) a.push(achado('medio', T, `sem nenhuma imagem sobrou a pasta assets/img/m/${ID.toLowerCase()} (a limpeza devia apagar o que o gerador criou)`));
    // 5) a regra por tipo: review = uma imagem a cada 2 paragrafos; lancamento = uma por paragrafo (cada paragrafo e um jogo); fora do alcance vai depois do ultimo
    // esperado: depois de quais paragrafos (1 a N) aparece figura; a que cai depois do ultimo vai para o fim
    const porTipo = [
      { id: '-1t9Wuw7_QI', tipo: 'review', imgs: [1, 2, 3, 9], depois: [2, 4, 6, 'fim'] },
      { id: '2aSQPI59sic', tipo: 'lancamento', imgs: [1, 3, 11], depois: [1, 3, 11] },
    ];
    for (const caso of porTipo) {
      const r2 = JSON.parse(fs.readFileSync(path.join(tmp, '_conteudo/enderecos.json'), 'utf8'))[caso.id];
      if (!r2) { a.push(achado('medio', T, `o teste da regra de ${caso.tipo} precisa da materia ${caso.id}, que nao esta mais no registro: troque o ID em t-imagens.mjs`)); continue; }
      const pasta2 = path.dirname(arquivoDaMateria(tmp, caso.id)), pag2 = `${r2.categoria}/${r2.slug}.html`;
      // (o site real pode ter imagens de verdade nesta materia, como as do Astro Bot: na copia parte-se sem elas)
      for (const f of fs.readdirSync(pasta2)) if (f !== `${caso.id}.json`) fs.rmSync(path.join(pasta2, f));
      gerar(tmp);
      const antes2 = fs.readFileSync(path.join(tmp, pag2), 'utf8');
      for (const n of caso.imgs) fs.writeFileSync(path.join(pasta2, `img-${n}_exemplo${n}.com.png`), png(900, 600, [30 + n * 10, 90, 150]));
      const g5 = gerar(tmp);
      const h5 = g5.status === 0 ? fs.readFileSync(path.join(tmp, pag2), 'utf8') : '';
      const corpo5 = (h5.match(/<div class="art-body">([\s\S]*?)\n      <\/div>/) ?? [])[1] ?? '';
      const seq = [...corpo5.matchAll(/<p>|<figure class="art-foto">/g)].map((m) => (m[0] === '<p>' ? 'P' : 'F')).join('');
      const nP = (corpo5.match(/<p>/g) ?? []).length;
      const certo = (() => { const r = []; for (let n = 1; n <= nP; n++) { r.push('P'); r.push(...caso.depois.filter((d) => d === n || (n === nP && d === 'fim')).map(() => 'F')); } return r.join(''); })();
      if (g5.status !== 0 || seq !== certo) a.push(achado('alto', T, `${caso.tipo}: com imagens ${caso.imgs.join(', ')} o texto devia ser ${certo} e deu "${seq}" (gerador ${g5.status === 0 ? 'ok' : `falhou: ${g5.saida.slice(-150)}`})`, pag2));
      for (const f of fs.readdirSync(pasta2)) if (f !== `${caso.id}.json`) fs.rmSync(path.join(pasta2, f));
      if (gerar(tmp).status !== 0 || fs.readFileSync(path.join(tmp, pag2), 'utf8') !== antes2) a.push(achado('alto', T, `${caso.tipo}: tirando as imagens a pagina devia voltar a ser igual a original`, pag2));
    }
    // 6) a imagem dos cartoes (carrossel, listas, previa): card.jpg; sem ele, a thumb de uma materia horizontal; num Short sem card fica a miniatura do YouTube
    {
      const lerTmp = (p) => fs.readFileSync(path.join(tmp, p), 'utf8');
      const usosDe = (p, re) => (lerTmp(p).match(re) ?? []).length;
      const SHORT = '0N76SgIcA2c', pastaS = path.dirname(arquivoDaMateria(tmp, SHORT)), idS = SHORT.toLowerCase();
      const dados = () => lerTmp('assets/data/secao/noticias.json');
      const iDo = (id) => (dados().match(new RegExp(`"i":"([^"]*)"[^{}]*?${id}|${id}[^{}]*?"i":"([^"]*)"`)) ?? []).slice(1).find(Boolean) ?? '';
      // a) materia horizontal (uma review) so com thumb: os cartoes usam a thumb (a maioria do site e Short; reviews e lancamentos sao horizontais)
      const REV = '-1t9Wuw7_QI', pastaR = path.dirname(arquivoDaMateria(tmp, REV)), idR = REV.toLowerCase();
      fs.writeFileSync(path.join(pastaR, 'thumb.png'), png(1600, 900, [90, 40, 160]));
      if (gerar(tmp).status !== 0) a.push(achado('alto', T, 'o gerador falhou com a thumb de uma materia horizontal'));
      else {
        const reRev = new RegExp(`<img src="\/assets\/img\/m\/${idR}\/thumb-[0-9a-f]{8}-640\.webp" srcset="[^"]*480w[^"]*1280w[^"]*" sizes="[^"]+" alt=""`);
        if (!reRev.test(lerTmp('reviews.html'))) a.push(achado('alto', T, 'materia horizontal so com thumb.png: o cartao devia usar a thumb (src de 640 px e srcset 480 a 1280)', 'reviews.html'));
        if (!new RegExp(`${idR}\/thumb-[0-9a-f]{8}-640\.webp`).test(lerTmp('assets/data/secao/reviews.json'))) a.push(achado('alto', T, 'materia horizontal so com thumb.png: a lista em JSON devia apontar para a thumb', 'assets/data/secao/reviews.json'));
      }
      fs.rmSync(path.join(pastaR, 'thumb.png'));
      // b) Short so com thumb vertical: o cartao continua com a miniatura do YouTube (a thumb 9:16 seria cortada)
      if (gerar(tmp).status !== 0) a.push(achado('alto', T, 'o gerador falhou na copia com a thumb do Short'));
      else if (usosDe('noticias.html', new RegExp(`m/${idS}/thumb-[0-9a-f]{8}-\\d+\\.webp[^>]*alt=""[^>]*loading="lazy"><\\/span>`, 'g')) > 0 || !/ytimg\.com\/vi\/0N76SgIcA2c\/hqdefault\.jpg/.test(lerTmp('noticias.html'))) a.push(achado('alto', T, 'Short so com thumb vertical: o cartao devia continuar com a miniatura do YouTube, nao a thumb 9:16 cortada', 'noticias.html'));
      // c) Short com card horizontal: cartoes, carrossel, listas e previa usam o card; o player continua com a thumb vertical
      fs.writeFileSync(path.join(pastaS, 'card.png'), png(1280, 720, [200, 120, 30]));
      const gc = gerar(tmp);
      if (gc.status !== 0) a.push(achado('alto', T, `o gerador falhou com card.png: ${gc.saida.slice(-200)}`));
      else {
        const cardRe = new RegExp(`<img src="\\/assets\\/img\\/m\\/${idS}\\/card-[0-9a-f]{8}-640\\.webp" srcset="[^"]*480w[^"]*1200w[^"]*" sizes="[^"]+"`);
        for (const p of ['noticias.html', 'index.html', 'gta6.html']) if (!cardRe.test(lerTmp(p))) a.push(achado('alto', T, 'com card.png o cartao/carrossel devia usar o card (src 640, srcset 480 a 1200, sizes)', p));
        if (!new RegExp(`\\/assets\\/img\\/m\\/${idS}\\/card-[0-9a-f]{8}-640\\.webp`).test(dados())) a.push(achado('alto', T, 'com card.png a lista em JSON devia apontar para o card (640 px)', 'assets/data/secao/noticias.json'));
        const r3 = JSON.parse(lerTmp('_conteudo/enderecos.json'))[SHORT], pagS = lerTmp(`${r3.categoria}/${r3.slug}.html`);
        if (!new RegExp(`<meta property="og:image" content="https:\\/\\/brubaogg\\.com\\.br\\/assets\\/img\\/m\\/${idS}\\/card-[0-9a-f]{8}-1200\\.webp">`).test(pagS)) a.push(achado('alto', T, 'com card.png a previa de compartilhamento (og:image) devia ser o card de 1200 px com endereco completo', `${r3.categoria}/${r3.slug}.html`));
        if (!new RegExp(`class="fachada"[\\s\\S]*?<img src="\\.\\.\\/assets\\/img\\/m\\/${idS}\\/thumb-`).test(pagS)) a.push(achado('alto', T, 'com card.png o player do Short devia continuar com a thumb vertical', `${r3.categoria}/${r3.slug}.html`));
        if (!/data-pagefind-meta="image:\/assets\/img\/m\/[a-z0-9_-]+\/card-/.test(pagS)) a.push(achado('medio', T, 'com card.png a imagem da busca (pagefind) devia ser o card', `${r3.categoria}/${r3.slug}.html`));
      }
      fs.rmSync(path.join(pastaS, 'card.png'));
      const gf = gerar(tmp);
      if (gf.status !== 0 || publicadas().length || fs.existsSync(path.join(tmp, 'assets/img/m', idS, `${fs.existsSync(path.join(tmp, 'assets/img/m', idS)) ? fs.readdirSync(path.join(tmp, 'assets/img/m', idS)).find((f) => f.startsWith('card-')) ?? 'x' : 'x'}`))) a.push(achado('medio', T, 'tirando o card.png as versoes publicadas dele (card-*.webp) deviam sumir'));
      // d) dois cards na mesma pasta: o gerador para
      fs.writeFileSync(path.join(pastaS, 'card.png'), png(800, 450, [1, 2, 3])); fs.writeFileSync(path.join(pastaS, 'card.jpg'), png(800, 450, [3, 2, 1]));
      const g2c = gerar(tmp);
      if (g2c.status === 0 || !g2c.saida.includes('outro card')) a.push(achado('alto', T, 'dois cards na mesma pasta (card.png e card.jpg) deviam parar o gerador'));
      fs.rmSync(path.join(pastaS, 'card.png')); fs.rmSync(path.join(pastaS, 'card.jpg'));
    }
    a.push(achado('info', T, 'imagens: thumb, 2 imagens entre paragrafos com fonte no nome, ordem, larguras sem aumentar, cache, limpeza, nomes recusados e volta ao original conferidos em copia'));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  return a;
}
