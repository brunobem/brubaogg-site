// Teste de layout em navegador de verdade: abre cada pagina em um iframe do tamanho de cada tela e mede o que quebra.
// Uso: abra layout.html pelo servidor local (npm run servir, ou o preview) e clique em "Rodar", ou chame window.layoutTeste.rodar(...) no console.
const sel = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '') + [...el.classList].slice(0, 2).map((c) => `.${c}`).join('');

function cortadoPorAncestral(el, win, vw) { // um elemento pode passar da tela mas estar dentro de uma caixa com overflow escondido
  for (let p = el.parentElement; p && p !== win.document.documentElement; p = p.parentElement) {
    const o = win.getComputedStyle(p);
    if (o.overflowX !== 'visible' && p.getBoundingClientRect().right <= vw + 1) return true;
  }
  return false;
}
const visivel = (el, win) => {
  const cs = win.getComputedStyle(el), r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && +cs.opacity > 0.05;
};

function medir(win, w, h) {
  const d = win.document, a = [];
  const push = (sev, msg) => a.push({ sev, msg });
  const root = d.documentElement;

  // 1) rolagem horizontal da pagina
  if (root.scrollWidth > w + 1) {
    const culpados = [...d.querySelectorAll('body *')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && (r.right > w + 1 || r.left < -1) && win.getComputedStyle(el).position !== 'fixed' && !cortadoPorAncestral(el, win, w) && !el.closest('svg');
    }).slice(0, 3).map(sel);
    push('alto', `a pagina rola na horizontal (largura do conteudo ${root.scrollWidth} > tela ${w}); culpados: ${culpados.join(', ') || 'nao identificados'}`);
  }

  // 1b) conteudo (texto/link) que passa da lateral e fica cortado por um ancestral
  const cort = conteudoCortado(win, w);
  if (cort.length) push('medio', `${cort.length} elemento(s) de conteudo passam da lateral e ficam cortados: ${cort.slice(0, 3).join('; ')}`);

  // 2) player do video
  for (const v of d.querySelectorAll('.art-video')) {
    const ifr = v.querySelector('iframe');
    if (!ifr) { push('alto', 'caixa do player sem iframe'); continue; }
    const rv = v.getBoundingClientRect(), ri = ifr.getBoundingClientRect(), curto = v.classList.contains('is-short');
    if (ri.left < rv.left - 2 || ri.right > rv.right + 2 || ri.top < rv.top - 2 || ri.bottom > rv.bottom + 2) push('alto', `o iframe do player escapa da caixa dele (iframe ${Math.round(ri.width)}x${Math.round(ri.height)}, caixa ${Math.round(rv.width)}x${Math.round(rv.height)})`);
    if (ri.width > w + 1) push('alto', `o player e mais largo que a tela (${Math.round(ri.width)} > ${w})`);
    if (ri.height > h) push(w > h ? 'medio' : 'alto', `o player e mais alto que a janela (${Math.round(ri.height)} > ${h})${w > h ? ' [celular deitado]' : ''}`);
    const prop = ri.width / ri.height;
    if (curto ? Math.abs(prop - 9 / 16) > 0.12 : Math.abs(prop - 16 / 9) > 0.2) push('medio', `proporcao do player fora do esperado (${prop.toFixed(2)} para ${curto ? 'vertical' : 'horizontal'})`);
    const tx = d.querySelector('.art-text');
    if (tx && d.querySelector('.art-split')) {
      const rt = tx.getBoundingClientRect();
      const dx = Math.min(rt.right, rv.right) - Math.max(rt.left, rv.left), dy = Math.min(rt.bottom, rv.bottom) - Math.max(rt.top, rv.top);
      if (dx > 4 && dy > 4) push('alto', 'o texto e o player da materia se sobrepoem');
      if (w >= 861 && rv.height > h - 24) push('medio', `player vertical (${Math.round(rv.height)}px) quase do tamanho da janela (${h}px): a parte de baixo fica cortada enquanto gruda`);
    }
  }

  // 3) elementos clicaveis cobertos por outros
  const alvos = [...d.querySelectorAll('header a, header button, header input, footer a, main a.btn, main a.back, main a.ir-video, main .chips a, main .news-card, main button, nav a')].filter((el) => visivel(el, win)).slice(0, 80);
  let cobertos = 0; const exemplos = [];
  for (const el of alvos) {
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const cx = Math.min(Math.max(r.left + r.width / 2, 1), w - 1), cy = Math.min(Math.max(r.top + r.height / 2, 1), h - 1);
    const topo = d.elementFromPoint(cx, cy);
    if (topo && !el.contains(topo) && !topo.contains(el)) { cobertos++; if (exemplos.length < 3) exemplos.push(`${sel(el)} coberto por ${sel(topo)}`); }
  }
  win.scrollTo(0, 0);
  if (cobertos) push('alto', `${cobertos} elemento(s) clicavel(is) coberto(s) por outro e sem resposta ao toque: ${exemplos.join('; ')}`);

  // 4) alvos de toque e fontes
  const interativos = [...d.querySelectorAll('button, input:not([type=hidden]), select, summary, [role=button], a')].filter((el) => visivel(el, win) && !el.classList.contains('sr-only')); // sr-only = escondido de proposito
  const pequenos = interativos.filter((el) => {
    const cs = win.getComputedStyle(el);
    if (el.tagName === 'A' && (cs.display === 'inline' || el.closest('p, li > span'))) return false; // link no meio de texto e excecao da WCAG
    const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 24;
  });
  if (pequenos.length) push('medio', `${pequenos.length} alvo(s) de toque menores que 24px (WCAG 2.2): ${pequenos.slice(0, 3).map(sel).join(', ')}`);
  if (w <= 600) {
    const medios = interativos.filter((el) => { const cs = win.getComputedStyle(el); if (el.tagName === 'A' && (cs.display === 'inline' || el.closest('p'))) return false; const r = el.getBoundingClientRect(); const m = Math.min(r.width, r.height); return m >= 24 && m < 40; });
    if (medios.length) push('info', `${medios.length} alvo(s) de toque entre 24 e 40px no celular (ideal 44px): ${[...new Set(medios.map(sel))].slice(0, 3).join(', ')}`);
  }
  // o zoom do iPhone so acontece em tela de toque; o iframe nao emula isso, entao so conferimos larguras de celular (a regra pointer:coarse do CSS e conferida no Bloco 4)
  if (w <= 600) for (const el of d.querySelectorAll('input:not([type=hidden]), select, textarea')) if (visivel(el, win) && parseFloat(win.getComputedStyle(el).fontSize) < 16) push('medio', `campo com fonte menor que 16px (o iPhone da zoom ao tocar): ${sel(el)}`);
  // o paragrafo mais longo da pagina e o texto de leitura (rotulos e legendas pequenos nao contam)
  const p = [...d.querySelectorAll('main p')].filter((x) => visivel(x, win)).sort((x, y) => y.textContent.length - x.textContent.length)[0];
  if (p && p.textContent.length > 80 && w <= 600 && parseFloat(win.getComputedStyle(p).fontSize) < 15) push('medio', `texto de leitura com ${win.getComputedStyle(p).fontSize} no celular (${sel(p)})`);

  // 5) cabecalho que come a tela e imagens quebradas
  const hd = d.querySelector('.site-header, header');
  if (hd) { const r = hd.getBoundingClientRect(), pos = win.getComputedStyle(hd).position; if ((pos === 'sticky' || pos === 'fixed') && r.height > h * 0.3) push('medio', `cabecalho grudado ocupa ${Math.round((r.height / h) * 100)}% da janela`); }
  const quebradas = [...d.images].filter((i) => i.complete && i.naturalWidth === 0 && i.getAttribute('src') && getComputedStyle(i).display !== 'none');
  if (quebradas.length) push('baixo', `${quebradas.length} imagem(ns) nao carregou/carregaram: ${quebradas.slice(0, 2).map((i) => (i.getAttribute('src') || '').slice(-40)).join(', ')}`);
  // imagem esticada: a proporcao na tela difere da proporcao do arquivo (sem object-fit): acontece quando width/height do HTML brigam com o CSS (falta height: auto)
  const esticadas = [...d.images].filter((i) => { const r = i.getBoundingClientRect(), cs = getComputedStyle(i); return i.complete && i.naturalWidth > 0 && r.width > 8 && r.height > 8 && cs.objectFit === 'fill' && cs.display !== 'none' && Math.abs(r.width / r.height - i.naturalWidth / i.naturalHeight) / (i.naturalWidth / i.naturalHeight) > 0.05; });
  if (esticadas.length) push('medio', `${esticadas.length} imagem(ns) esticada(s) (proporcao diferente do arquivo): ${esticadas.slice(0, 2).map((i) => `${(i.getAttribute('src') || '').slice(-32)} ${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`).join(', ')}`);
  return a;
}

async function abrir(pagina, w, h) {
  const f = document.createElement('iframe');
  f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;border:0;opacity:.01;z-index:-1;background:#fff`;
  await new Promise((ok, falha) => {
    const t = setTimeout(() => falha(new Error('tempo esgotado ao carregar')), 20000);
    f.onload = () => { clearTimeout(t); ok(); };
    f.src = '/' + pagina;
    document.body.appendChild(f);
  });
  try { await f.contentWindow.document.fonts?.ready; } catch {}
  await new Promise((r) => setTimeout(r, 300));
  // pagina de busca com pedido na URL: espera o resultado (o motor da busca carrega depois da pagina) e as imagens
  if (/^busca\.html\?/.test(pagina)) {
    const d = f.contentDocument, ate = performance.now() + 8000;
    while (performance.now() < ate && (d.documentElement.classList.contains('com-busca') || /Buscando/.test(d.getElementById('busca-status')?.textContent ?? ''))) await new Promise((r) => setTimeout(r, 100));
    await new Promise((r) => setTimeout(r, 300));
  }
  return f;
}

/** rodar({ paginas: ['index.html'], telas: [[375,800],[1280,800]] }) -> { achados, total } */
async function rodar({ paginas, telas, aoProgresso }) {
  const achados = []; let total = 0;
  // o navegador guarda CSS, JS e paginas em cache: sem isto o teste pode medir a versao ANTIGA do site depois de uma mudanca
  await Promise.all(['/assets/css/style.css', '/assets/js/busca.js', '/assets/js/contador.js', ...paginas.map((p) => `/${p}`)].map((u) => fetch(u, { cache: 'reload' }).catch(() => {})));
  for (const pagina of paginas) {
    for (const [w, h] of telas) {
      total++;
      let f;
      try { f = await abrir(pagina, w, h); for (const x of medir(f.contentWindow, w, h)) achados.push({ pagina, w, h, ...x }); }
      catch (e) { achados.push({ pagina, w, h, sev: 'alto', msg: `nao conseguiu medir: ${e.message}` }); }
      finally { f?.remove(); }
    }
    aoProgresso?.(pagina);
  }
  return { achados, total };
}

/** agrupa o mesmo achado em varias larguras: "em 280, 320, 344" */
function resumir(achados) {
  const g = new Map();
  for (const a of achados) {
    const k = `${a.sev}|${a.pagina}|${a.msg.replace(/\d+/g, '#')}`;
    if (!g.has(k)) g.set(k, { sev: a.sev, pagina: a.pagina, msg: a.msg, telas: [] });
    g.get(k).telas.push(`${a.w}x${a.h}`);
  }
  const ordem = { critico: 0, alto: 1, medio: 2, baixo: 3, info: 4 };
  return [...g.values()].sort((x, y) => ordem[x.sev] - ordem[y.sev]);
}

/** texto ou link REAL (nao enfeite aria-hidden) que passa da lateral da tela: se um ancestral corta (overflow), o visitante perde o conteudo sem nem ter rolagem */
function conteudoCortado(win, w) {
  const d = win.document, achados = [];
  for (const el of d.querySelectorAll('body a, body p, body h1, body h2, body h3, body li, body b, body span, body small, body button, body label, body time')) {
    if (el.closest('svg, [aria-hidden="true"], .sr-only') || win.getComputedStyle(el).position === 'fixed') continue;
    const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!temTexto && el.tagName !== 'A') continue;
    const r = el.getBoundingClientRect();
    if (r.width > 0 && (r.right > w + 1 || r.left < -1) && el.getClientRects().length) achados.push(`${sel(el)}${(el.textContent || '').trim() ? ` "${el.textContent.trim().replace(/\s+/g, ' ').slice(0, 22)}"` : ''} (${Math.round(r.left)} a ${Math.round(r.right)})`);
  }
  return achados;
}

// ---------- checagens de CSS: contraste, indicador de foco, posicao absoluta, texto a 200% ----------
const luminancia = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const lerCor = (s) => { const m = String(s).match(/rgba?\(([^)]+)\)/); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
const misturar = (fg, bg) => ({ r: fg.r * fg.a + bg.r * (1 - fg.a), g: fg.g * fg.a + bg.g * (1 - fg.a), b: fg.b * fg.a + bg.b * (1 - fg.a), a: 1 });
const razao = (c1, c2) => { const a = luminancia(c1), b = luminancia(c2); return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05); };
const hex = (c) => '#' + [c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');

/** cores de fundo possiveis atras de um elemento: 1 cor, ou as paradas de cor de um gradiente (pior caso). null se nao der para saber (imagem). */
function fundoEfetivo(el, win) {
  const camadas = [];
  for (let e = el; e; e = e.parentElement) {
    const cs = win.getComputedStyle(e);
    const c = lerCor(cs.backgroundColor);
    const ehRaiz = e === el.ownerDocument.body || e === el.ownerDocument.documentElement;
    if (!ehRaiz && cs.backgroundImage !== 'none' && !(c && c.a === 1)) {
      if (!/gradient/.test(cs.backgroundImage) || /url\(/.test(cs.backgroundImage)) return null;
      const paradas = [...cs.backgroundImage.matchAll(/rgba?\([^)]+\)/g)].map((m) => lerCor(m[0])).filter((x) => x && x.a >= 0.99);
      return paradas.length ? paradas : null;
    }
    if (c && c.a > 0) { camadas.push(c); if (c.a === 1) break; }
  }
  let base = camadas.pop() ?? { r: 255, g: 255, b: 255, a: 1 };
  if (base.a < 1) base = misturar(base, { r: 255, g: 255, b: 255, a: 1 });
  while (camadas.length) base = misturar(camadas.pop(), base);
  return [base];
}

function medirCss(win, w, h) {
  const d = win.document, a = [];
  const push = (sev, msg) => a.push({ sev, msg });

  // 1) elemento absoluto cujo "pai de posicao" nao e o pai de verdade (a classe de defeito que ja nos pegou: iframe solto da caixa do player)
  for (const el of d.querySelectorAll('body *')) {
    const cs = win.getComputedStyle(el);
    if (cs.position !== 'absolute' || el.classList.contains('sr-only') || el.closest('svg') || !el.getClientRects().length) continue; // sem caixa = escondido (display:none)
    const pai = el.parentElement, bloco = el.offsetParent;
    if (pai && bloco !== pai && pai !== d.body) push('alto', `elemento absoluto ${sel(el)} dentro de ${sel(pai)} sem position: ele se posiciona pelo ancestral ${bloco ? sel(bloco) : 'da pagina'} e pode escapar da caixa`);
  }

  // 2) contraste do texto (WCAG AA: 4,5 para texto normal, 3 para texto grande). Fundo com gradiente/imagem nao e calculado (conta como "incerto").
  const falhas = new Map(); let medidos = 0, incertos = 0;
  for (const el of d.querySelectorAll('body *')) {
    if (el.closest('svg, script, style, .sr-only') || !visivel(el, win)) continue;
    const temTexto = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!temTexto) continue;
    const cs = win.getComputedStyle(el);
    let cor = lerCor(cs.color); if (!cor) continue;
    let opac = 1; for (let e = el; e; e = e.parentElement) opac *= +win.getComputedStyle(e).opacity;
    if (opac < 0.5) continue; // elementos meio apagados de proposito (palmeiras etc.)
    const fundos = fundoEfetivo(el, win);
    if (!fundos) { incertos++; continue; }
    const bril = (cs.filter.match(/brightness\(([\d.]+)\)/) ?? [])[1]; // ex.: .h1-small clareia a cor com filter: brightness(1.7)
    if (bril) cor = { ...cor, r: Math.min(255, cor.r * +bril), g: Math.min(255, cor.g * +bril), b: Math.min(255, cor.b * +bril) };
    const tam = parseFloat(cs.fontSize), negrito = +cs.fontWeight >= 700;
    const grande = tam >= 24 || (tam >= 18.66 && negrito);
    let pior = { r: 99, fundo: fundos[0], cor }; medidos++;
    for (const fundo of fundos) { const c2 = misturar({ ...cor, a: cor.a * opac }, fundo); const r = razao(c2, fundo); if (r < pior.r) pior = { r, fundo, cor: c2 }; }
    if (pior.r < (grande ? 3 : 4.5)) { const k = `${sel(el)} ${hex(pior.cor)} sobre ${hex(pior.fundo)}${fundos.length > 1 ? ' (pior ponto do gradiente)' : ''}`; if (!falhas.has(k)) falhas.set(k, { r: pior.r, n: 0, grande }); falhas.get(k).n++; }
  }
  for (const [k, v] of falhas) push(v.r < (v.grande ? 3 : 4.5) - 1 ? 'alto' : 'medio', `contraste ${v.r.toFixed(2)}:1 (minimo ${v.grande ? 3 : 4.5}) em ${k} (${v.n}x)`);
  if (incertos) push('info', `${incertos} texto(s) sobre imagem: contraste nao calculado`);

  // 4) texto aumentado para 200% (zoom so de texto do navegador): sem rolagem horizontal e sem conteudo cortado
  const raiz = d.documentElement; raiz.style.fontSize = '200%'; void raiz.offsetWidth;
  win.scrollTo(10000, 0); const rolou = win.scrollX > 0; win.scrollTo(0, 0);
  if (rolou) push('medio', `com o texto a 200% a pagina rola na horizontal (conteudo ${raiz.scrollWidth} > tela ${w})`);
  const cortados = conteudoCortado(win, w);
  if (cortados.length) push('medio', `com o texto a 200% ha conteudo cortado nas laterais (${cortados.length}): ${cortados.slice(0, 3).join('; ')}`);
  raiz.style.fontSize = '';
  return a;
}

async function rodarCss({ paginas, telas, aoProgresso }) {
  const achados = []; let total = 0;
  await Promise.all(['/assets/css/style.css', '/assets/js/busca.js', '/assets/js/contador.js', ...paginas.map((p) => `/${p}`)].map((u) => fetch(u, { cache: 'reload' }).catch(() => {})));
  for (const pagina of paginas) {
    for (const [w, h] of telas) {
      total++; let f;
      try { f = await abrir(pagina, w, h); for (const x of medirCss(f.contentWindow, w, h)) achados.push({ pagina, w, h, ...x }); }
      catch (e) { achados.push({ pagina, w, h, sev: 'alto', msg: `nao conseguiu medir: ${e.message}` }); }
      finally { f?.remove(); }
    }
    aoProgresso?.(pagina);
  }
  return { achados, total };
}

// ---------- prova de equivalencia de CSS: a MESMA pagina com dois CSS, comparando estilo calculado e posicao de cada elemento ----------
const IGNORAR_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'META', 'TITLE', 'HEAD', 'NOSCRIPT']);
function tirarFoto(win) {
  const d = win.document, foto = [];
  for (const el of d.querySelectorAll('html, body, body *')) {
    if (IGNORAR_TAGS.has(el.tagName)) continue;
    const cs = win.getComputedStyle(el), o = {};
    for (let i = 0; i < cs.length; i++) o[cs[i]] = cs.getPropertyValue(cs[i]);
    const r = el.getBoundingClientRect();
    const item = { id: sel(el), o, g: [r.x, r.y, r.width, r.height].map((v) => Math.round(v * 100) / 100) };
    for (const ps of ['::before', '::after']) {
      const c = win.getComputedStyle(el, ps);
      if (c.content !== 'none' && c.content !== 'normal') { const p = {}; for (let i = 0; i < c.length; i++) p[c[i]] = c.getPropertyValue(c[i]); item[ps] = p; }
    }
    foto.push(item);
  }
  return foto;
}
/** imagens com loading="lazy" so carregam perto da tela: sem isso a "foto" A sai sem imagem e a B com (altura de cartao diferente por acaso) */
async function carregarImagens(f) {
  const imgs = [...f.contentDocument.images];
  for (const i of imgs) i.loading = 'eager';
  await Promise.all(imgs.map((i) => (i.complete ? null : new Promise((ok) => { i.onload = ok; i.onerror = ok; setTimeout(ok, 4000); }))));
}
async function usarCss(f, href) {
  const d = f.contentDocument, link = d.querySelector('link[rel="stylesheet"]');
  await new Promise((ok) => { link.onload = ok; link.onerror = ok; link.href = href; });
  try { await d.fonts.ready; } catch {}
  await new Promise((r) => setTimeout(r, 120));
}
function compararFotos(A, B) {
  if (A.length !== B.length) return { erro: `numero de elementos diferente (${A.length} x ${B.length})`, difs: [] };
  const grupos = new Map();
  const reg = (k, a, b) => { const g = grupos.get(k) ?? grupos.set(k, { k, n: 0, a, b }).get(k); g.n++; };
  for (let i = 0; i < A.length; i++) {
    for (const p in A[i].o) if (A[i].o[p] !== B[i].o[p]) reg(`${A[i].id} { ${p} }`, A[i].o[p], B[i].o[p]);
    if (A[i].g.join() !== B[i].g.join()) reg(`${A[i].id} [posicao/tamanho]`, A[i].g.join(', '), B[i].g.join(', '));
    for (const ps of ['::before', '::after']) {
      if (!!A[i][ps] !== !!B[i][ps]) reg(`${A[i].id}${ps} [existe]`, !!A[i][ps], !!B[i][ps]);
      else if (A[i][ps]) for (const p in A[i][ps]) if (A[i][ps][p] !== B[i][ps][p]) reg(`${A[i].id}${ps} { ${p} }`, A[i][ps][p], B[i][ps][p]);
    }
  }
  return { difs: [...grupos.values()], elementos: A.length };
}
/** compararCss({ paginas, larguras, a: '/caminho/css-antigo.css', b: '/assets/css/style.css' }) -> { comparacoes, difs: [{ pagina, w, k, n, a, b }] } */
async function compararCss({ paginas, larguras, altura = 800, a, b, aoProgresso }) {
  const difs = []; let comparacoes = 0, elementos = 0;
  const novo = b + (b.includes('?') ? '&' : '?') + 'v=' + Date.now();
  for (const pagina of paginas) {
    for (const w of larguras) {
      let f;
      try {
        f = await abrir(pagina, w, altura);
        const d = f.contentDocument, est = d.createElement('style');
        est.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; }'; // congela o que se mexe sozinho
        d.head.appendChild(est);
        await carregarImagens(f);
        await usarCss(f, a); const fotoA = tirarFoto(f.contentWindow);
        await usarCss(f, novo); const fotoB = tirarFoto(f.contentWindow);
        const r = compararFotos(fotoA, fotoB); comparacoes++; elementos += r.elementos ?? 0;
        if (r.erro) difs.push({ pagina, w, k: r.erro, n: 1 });
        for (const x of r.difs) difs.push({ pagina, w, ...x });
      } catch (e) { difs.push({ pagina, w, k: `nao conseguiu comparar: ${e.message}`, n: 1 }); }
      finally { f?.remove(); }
    }
    aoProgresso?.(pagina);
  }
  return { comparacoes, elementos, difs };
}

window.layoutTeste = { rodar, resumir, medir, medirCss, rodarCss, compararCss };
