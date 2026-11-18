// Teste do JavaScript do site no NAVEGADOR (busca com Pagefind de verdade, teclado, foco, falha de rede, sem JavaScript, contador).
// Precisa do site MONTADO: npm run indexar -- --com-testes, depois abrir _site/ num servidor e esta pagina (js.html).
// Uso: await jsTeste.rodar() -> { achados: [{ sev, onde, msg }], total }
(function () {
  const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
  async function ate(cond, ms = 6000, passo = 50) { const t0 = performance.now(); while (performance.now() - t0 < ms) { try { const v = cond(); if (v) return v; } catch {} await esperar(passo); } return false; }

  async function abrir(url, w = 1000, h = 800, sandbox = null) {
    const f = document.createElement('iframe');
    f.style.cssText = `position:fixed;left:0;top:0;width:${w}px;height:${h}px;border:0;visibility:hidden`;
    if (sandbox !== null) f.setAttribute('sandbox', sandbox);
    const pronto = new Promise((r) => { f.onload = r; });
    f.src = url; document.body.appendChild(f); await pronto;
    if (sandbox === null) await ate(() => f.contentWindow.BrubaoBusca || !f.contentDocument.querySelector('form.search'), 3000);
    return f;
  }
  const digitar = (f, valor) => { const i = f.contentDocument.querySelector('.search input'); i.focus(); i.value = valor; i.dispatchEvent(new Event('input', { bubbles: true })); return i; };
  const tecla = (f, key) => { const i = f.contentDocument.querySelector('.search input'); const ev = new f.contentWindow.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }); i.dispatchEvent(ev); return ev; };
  const caixa = (f) => f.contentDocument.querySelector('.search-results');
  const opcoes = (f) => [...caixa(f).querySelectorAll('[role="option"]')];
  const aberta = (f) => !caixa(f).hidden;
  const normalizar = (h) => h.replace(/>\s+</g, '><').replace(/\s+/g, ' ').trim();

  async function rodar() {
    const achados = []; let total = 0;
    const falha = (onde, msg, sev = 'alto') => achados.push({ sev, onde, msg });
    const exige = (ok, onde, msg, sev) => { total++; if (!ok) falha(onde, msg, sev); return !!ok; };
    const cenario = async (nome, fn) => { try { await fn(); } catch (e) { falha(nome, `o teste quebrou: ${e.message}`, 'critico'); } };
    const manifesto = await (await fetch('/assets/data/lista/manifesto.json', { cache: 'no-store' })).json();
    const todas = []; for (const m of manifesto.meses) todas.push(...await (await fetch(`/assets/data/lista/${m.m}.json`, { cache: 'no-store' })).json());

    // ---------- sugestoes ----------
    await cenario('sugestoes', async () => {
      const f = await abrir('/index.html', 420, 800);
      const w = f.contentWindow;
      exige(w.BrubaoBusca, 'index.html', 'busca.js nao carregou (window.BrubaoBusca ausente)', 'critico');
      digitar(f, 'g'); await esperar(500);
      exige(!aberta(f), 'sugestoes', 'uma letra so abriu a lista (deveria esperar a segunda)');
      digitar(f, 'gta6');
      exige(await ate(() => aberta(f) && opcoes(f).length > 1), 'sugestoes', '"gta6" nao trouxe sugestoes (a forma "gta 6" deveria valer)');
      const textos = opcoes(f).map((o) => o.textContent);
      exige(textos.some((t) => /^GTA 6/.test(t) && /Página/.test(t)), 'sugestoes', '"gta6" nao trouxe o atalho da pagina GTA 6');
      exige(opcoes(f).every((o, i) => o.id && o.tabIndex === -1), 'sugestoes', 'opcoes sem id ou ainda alcancaveis por Tab (devem ter tabindex=-1)');
      exige(/sugest/.test(f.contentDocument.getElementById('search-status').textContent), 'sugestoes', 'leitor de tela nao foi avisado da quantidade de sugestoes');
      // setas
      const i = f.contentDocument.querySelector('.search input');
      tecla(f, 'ArrowDown'); tecla(f, 'ArrowDown');
      exige(i.getAttribute('aria-activedescendant') === opcoes(f)[1].id && opcoes(f)[1].getAttribute('aria-selected') === 'true' && opcoes(f)[0].getAttribute('aria-selected') === 'false', 'teclado', 'ArrowDown nao marcou a segunda opcao / aria-activedescendant');
      tecla(f, 'ArrowUp'); tecla(f, 'ArrowUp');
      exige(i.getAttribute('aria-activedescendant') === opcoes(f)[opcoes(f).length - 1].id, 'teclado', 'ArrowUp na primeira opcao nao voltou para a ultima');
      // Esc fecha e mantem o foco; seta para baixo reabre
      tecla(f, 'Escape');
      exige(!aberta(f) && i.getAttribute('aria-expanded') === 'false' && !i.hasAttribute('aria-activedescendant'), 'teclado', 'Esc nao fechou a lista');
      exige(f.contentDocument.activeElement === i, 'teclado', 'Esc tirou o foco do campo');
      tecla(f, 'ArrowDown');
      exige(await ate(() => aberta(f)), 'teclado', 'seta para baixo nao reabriu a lista');
      // sair do formulario fecha
      i.dispatchEvent(new w.FocusEvent('focusout', { bubbles: true, relatedTarget: f.contentDocument.querySelector('.social-bar a') }));
      exige(!aberta(f), 'teclado', 'a lista continuou aberta depois de o foco sair do formulario (Tab)');
      // sem resultado
      digitar(f, 'zzzzxq');
      exige(await ate(() => aberta(f) && /Nenhum resultado/.test(caixa(f).textContent)), 'sugestoes', 'busca sem resultado nao avisou');
      exige(/Nenhum resultado/.test(f.contentDocument.getElementById('search-status').textContent), 'sugestoes', 'leitor de tela nao foi avisado de "nenhum resultado"');
      // acento e maiuscula
      digitar(f, 'midia fisica'); await ate(() => opcoes(f).length > 1); const a1 = opcoes(f).filter((o) => o.id !== 'sug-todos').map((o) => o.getAttribute('href')).join('|');
      digitar(f, 'MÍDIA FÍSICA'); await esperar(900); await ate(() => opcoes(f).length > 1); const a2 = opcoes(f).filter((o) => o.id !== 'sug-todos').map((o) => o.getAttribute('href')).join('|');
      exige(a1 && a1 === a2, 'sugestoes', '"midia fisica" e "MÍDIA FÍSICA" deram sugestoes diferentes');
      f.remove();
    });

    // ---------- falha de rede e nova tentativa ----------
    await cenario('falha-e-nova-tentativa', async () => {
      const f = await abrir('/index.html', 420, 800); const api = f.contentWindow.BrubaoBusca; const original = api.importar;
      api.importar = () => Promise.reject(new Error('sem rede'));
      digitar(f, 'resident');
      exige(await ate(() => aberta(f) && /Não foi possível/.test(caixa(f).textContent)), 'falha', 'falha ao carregar a busca nao mostrou mensagem');
      exige(caixa(f).querySelector('button.sr-retry'), 'falha', 'a mensagem de falha nao tem o botao "Tentar de novo"');
      api.importar = original; // a rede voltou
      caixa(f).querySelector('button.sr-retry').click();
      exige(await ate(() => opcoes(f).length > 1), 'falha', 'depois da falha a busca nao se recuperou ao tentar de novo');
      digitar(f, 'resident evil'); exige(await ate(() => opcoes(f).length > 1), 'falha', 'depois de recuperar, digitar outra coisa nao funciona');
      f.remove();
    });

    // ---------- Enter ----------
    await cenario('enter', async () => {
      const alvo = todas[0];
      let f = await abrir('/index.html', 420, 800); digitar(f, alvo.t); await ate(() => opcoes(f).length > 1);
      f.contentDocument.querySelector('form.search').requestSubmit();
      exige(await ate(() => f.contentWindow.location.pathname === `/${alvo.u}`, 4000), 'enter', 'Enter com o titulo exato nao abriu a materia');
      f.remove();
      f = await abrir('/index.html', 420, 800); digitar(f, 'resident'); await ate(() => opcoes(f).length > 1);
      f.contentDocument.querySelector('form.search').requestSubmit();
      exige(await ate(() => f.contentWindow.location.pathname === '/busca.html' && /q=resident/.test(f.contentWindow.location.search), 4000), 'enter', 'Enter com texto comum nao levou para busca.html?q=');
      f.remove();
      f = await abrir('/index.html', 420, 800); digitar(f, 'resident'); await ate(() => opcoes(f).length > 1);
      tecla(f, 'ArrowDown'); const escolhida = opcoes(f)[0].getAttribute('href');
      f.contentDocument.querySelector('form.search').requestSubmit();
      exige(await ate(() => f.contentWindow.location.pathname + f.contentWindow.location.search === new URL(escolhida, 'http://x/').pathname + new URL(escolhida, 'http://x/').search, 4000), 'enter', 'Enter com opcao marcada nao abriu a opcao');
      f.remove();
    });

    // ---------- busca.html ----------
    await cenario('busca.html: inicio', async () => {
      const f = await abrir('/busca.html', 420, 800); const d = f.contentDocument, w = f.contentWindow;
      const q = (s) => [...d.querySelectorAll(s)];
      exige(q('#busca-lista .news-card').length === Math.min(30, todas.length), 'busca.html', 'a pagina 1 nao tem 30 cartoes');
      exige(q('.busca-chip').length === manifesto.categorias.length + 1 && d.querySelector('.busca-chip[aria-pressed="true"]').textContent === 'Todas', 'busca.html', 'botoes de categoria errados');
      const baixou = () => w.performance.getEntriesByType('resource').filter((e) => /\/lista\/|pagefind/.test(e.name)).length;
      exige(baixou() === 0, 'busca.html', `a pagina baixou ${baixou()} arquivo(s) de dados antes de alguem pedir (a pagina 1 deveria bastar)`);
      // o cartao montado pelo JavaScript e IGUAL ao gerado no HTML
      const estaticos = q('#busca-lista .news-card').slice(0, 30);
      const dif = estaticos.map((c, i) => [c, w.BrubaoBusca.cartao(todas[i])]).filter(([c, j]) => !j || normalizar(c.outerHTML) !== normalizar(j.outerHTML));
      exige(!dif.length, 'busca.html', `${dif.length} cartao(oes) montado(s) pelo JavaScript diferem do gerado no HTML (ex.: ${dif[0] ? normalizar(dif[0][0].outerHTML).slice(0, 110) + ' <> ' + normalizar(dif[0][1]?.outerHTML ?? 'null').slice(0, 110) : ''})`);
      const botao = d.getElementById('busca-mais');
      if (todas.length > 30) {
        exige(!botao.hidden, 'busca.html', 'faltou o botao "Ver mais"');
        botao.click(); exige(await ate(() => q('#busca-lista .news-card').length === Math.min(60, todas.length)), 'busca.html', '"Ver mais" nao trouxe mais 30');
        exige(d.activeElement === q('#busca-lista .news-card')[30], 'busca.html', 'o foco nao foi para o primeiro cartao novo depois de "Ver mais"', 'medio');
        exige(new Set(q('#busca-lista .news-card').map((c) => c.getAttribute('href'))).size === q('#busca-lista .news-card').length, 'busca.html', '"Ver mais" repetiu materias');
        exige(botao.hidden === (todas.length <= 60), 'busca.html', 'o botao "Ver mais" nao some quando acaba a lista');
      } else exige(botao.hidden, 'busca.html', 'botao "Ver mais" aparecendo sem ter mais');
      f.remove();
    });

    await cenario('busca.html: texto e categoria', async () => {
      const f = await abrir('/busca.html?q=resident', 420, 800); const d = f.contentDocument;
      const q = (s) => [...d.querySelectorAll(s)];
      exige(await ate(() => q('#busca-lista .news-card').length > 1 && !d.documentElement.classList.contains('com-busca')), 'busca.html?q', 'a busca por texto nao mostrou resultados');
      exige(/\d+ resultados? para "resident"/.test(d.getElementById('busca-status').textContent), 'busca.html?q', 'o aviso de quantidade nao apareceu');
      exige(q('.news-excerpt mark').length > 0, 'busca.html?q', 'o trecho nao destaca a palavra buscada');
      exige(q('.busca-chip').map((c) => c.textContent).some((t) => /^Review \(\d+\)$/.test(t)), 'busca.html?q', 'os botoes de categoria nao mostram a contagem');
      const antes = q('#busca-lista .news-card').length;
      const review = q('.busca-chip').find((c) => /^Review/.test(c.textContent)); review.click();
      const nReview = Number(review.textContent.match(/\((\d+)\)/)[1]);
      exige(await ate(() => d.querySelector('.busca-chip[aria-pressed="true"]')?.textContent.startsWith('Review') && q('#busca-lista .news-card').length === Math.min(30, nReview)), 'busca.html?q', `o filtro Review deveria mostrar ${Math.min(30, nReview)} cartoes (o botao diz ${nReview})`);
      exige(/cat=Review/.test(f.contentWindow.location.search) && /q=resident/.test(f.contentWindow.location.search), 'busca.html?q', 'a URL nao guardou q e cat');
      exige(q('#busca-lista .news-card .tag').every((t) => /Review/.test(t.textContent)), 'busca.html?q', 'apareceu materia de outra categoria com o filtro Review');
      const todasChip = q('.busca-chip').find((c) => /^Todas/.test(c.textContent)); todasChip.click();
      exige(await ate(() => !/cat=/.test(f.contentWindow.location.search) && q('#busca-lista .news-card').length === antes), 'busca.html?q', '"Todas" nao tirou o filtro');
      f.remove();
    });

    await cenario('busca.html: entradas estranhas', async () => {
      for (const [consulta, nome] of [['?cat=Inventada', 'categoria inventada'], ['?n=999999999', 'n gigante'], ['?n=-4', 'n negativo'], ['?q=%3Cimg%20src%3Dx%20onerror%3Dalert(1)%3E', 'html no q'], ['?q=%E0%A4%A', 'percent malformado'], [`?q=${'a'.repeat(3000)}`, 'q enorme'], ['?q=zzzzxq', 'sem resultado'], ['?q=g', 'uma letra']]) {
        const f = await abrir(`/busca.html${consulta}`, 420, 800); const d = f.contentDocument;
        await ate(() => !d.documentElement.classList.contains('com-busca') || /Nenhum|resultado/.test(d.getElementById('busca-status').textContent), 5000); await esperar(300);
        exige(!d.querySelector('#busca-lista img[onerror], #busca-titulo *, #busca-status *:not(button)'), `busca.html${consulta.slice(0, 30)}`, `${nome}: o texto digitado virou HTML`);
        exige(d.getElementById('busca-titulo').textContent.length < 400, `busca.html${consulta.slice(0, 30)}`, `${nome}: titulo gigante`);
        exige(d.querySelectorAll('#busca-lista .news-card').length > 0 || /Nenhum/.test(d.getElementById('busca-status').textContent), `busca.html${consulta.slice(0, 30)}`, `${nome}: a pagina ficou vazia e sem aviso`);
        exige(f.contentDocument.documentElement.scrollWidth <= f.contentWindow.innerWidth + 1, `busca.html${consulta.slice(0, 30)}`, `${nome}: rolagem horizontal em 420 px`);
        f.remove();
      }
      const f = await abrir('/busca.html?q=zzzzxq', 420, 800); const d = f.contentDocument;
      exige(await ate(() => /Nenhum resultado para "zzzzxq"/.test(d.getElementById('busca-status').textContent)), 'busca.html', 'busca sem resultado nao avisou');
      f.remove();
    });

    // ---------- busca.html no celular: sem rolagem horizontal ----------
    await cenario('busca.html: 320 px', async () => {
      const f = await abrir('/busca.html?q=resident', 320, 700); const d = f.contentDocument;
      await ate(() => d.querySelectorAll('#busca-lista .news-card').length > 1);
      exige(d.documentElement.scrollWidth <= 321, 'busca.html 320px', `rolagem horizontal (${d.documentElement.scrollWidth}px)`);
      exige([...d.querySelectorAll('.busca-chip')].every((c) => c.getBoundingClientRect().height >= 43), 'busca.html 320px', 'botao de categoria menor que 44 px (alvo de toque)', 'medio');
      f.remove();
    });

    // ---------- "Ver mais" nas listas (so existe onde a lista passa de 30; no site de 37 materias nao ha nenhuma) ----------
    await cenario('ver-mais-listas', async () => {
      let listas = 0;
      for (const url of ['/noticias.html', '/reviews.html', '/lancamentos.html', '/gta6.html', '/tag/god-of-war.html', '/tag/resident-evil.html']) {
        let f = await abrir(url, 420, 800); let d = f.contentDocument; const b = d.querySelector('button[data-colecao]');
        if (!b) { f.remove(); continue; }
        listas++; const id = b.getAttribute('data-colecao'), total = Number(b.getAttribute('data-total')), grade = d.querySelector(`[data-lista="${id}"]`), w = f.contentWindow;
        exige(grade && grade.children.length === 30 && !b.hidden, url, `lista ${id}: deveria ter 30 cartoes e o botao "Ver mais" visivel (tem ${grade?.children.length}, botao ${b.hidden ? 'escondido' : 'visivel'})`);
        const baixou = () => w.performance.getEntriesByType('resource').filter((e) => /\/colecao\//.test(e.name)).length;
        exige(baixou() === 0, url, 'a lista baixou dados antes de alguem clicar em "Ver mais"');
        const apos = Math.min(60, 30 + total);
        b.click(); exige(await ate(() => grade.children.length === apos), url, `lista ${id}: "Ver mais" deveria acrescentar ${apos - 30} (acrescentou ${grade.children.length - 30})`);
        exige(d.activeElement === grade.children[30], url, 'o foco nao foi para o primeiro cartao novo', 'medio');
        exige(new RegExp(`n=${apos}`).test(w.location.search), url, `a URL nao guardou n=${apos}`);
        exige(new RegExp(`Mostrando ${apos} de`).test(d.getElementById('search-status').textContent), url, 'leitor de tela nao foi avisado de quantos itens estao na tela', 'medio');
        for (let i = 0; i < 40 && !b.hidden; i++) { b.click(); await ate(() => !b.disabled, 4000); }
        const hrefs = [...grade.querySelectorAll('.news-card')].map((c) => c.getAttribute('href').replace(/^(\.\.\/)+/, ''));
        exige(b.hidden && hrefs.length === 30 + total, url, `lista ${id}: depois de todos os cliques deveria ter ${30 + total} cartoes e o botao escondido (tem ${hrefs.length})`);
        exige(new Set(hrefs).size === hrefs.length, url, `lista ${id}: o "Ver mais" repetiu materias`);
        f.remove();
        // falha de rede e nova tentativa
        f = await abrir(url, 420, 800); d = f.contentDocument; const original = f.contentWindow.fetch; const b2 = d.querySelector('button[data-colecao]'), g2 = d.querySelector(`[data-lista="${id}"]`);
        f.contentWindow.fetch = () => Promise.reject(new Error('sem rede'));
        b2.click(); exige(await ate(() => /Não foi possível/.test(d.getElementById('search-status').textContent)), url, 'falha ao carregar mais nao avisou');
        exige(g2.children.length === 30 && !b2.hidden && !b2.disabled, url, 'depois da falha o botao deveria continuar disponivel');
        f.contentWindow.fetch = original; b2.click();
        exige(await ate(() => g2.children.length === Math.min(60, 30 + total)), url, 'depois da falha, tentar de novo nao funcionou');
        f.remove();
        // voltar para a pagina com ?n=90
        f = await abrir(`${url}?n=90`, 420, 800); d = f.contentDocument;
        exige(await ate(() => d.querySelector(`[data-lista="${id}"]`).children.length === Math.min(90, 30 + total)), url, 'abrir com ?n=90 nao mostrou ate onde a pessoa estava');
        f.remove();
      }
    });

    // ---------- qualidade da busca (Pagefind de verdade) ----------
    await cenario('qualidade', async () => {
      const pf = await import('/pagefind/pagefind.js'); await pf.options({ excerptLength: 22 });
      const cats = manifesto.categorias, sem = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
      let top1 = 0, top1Sem = 0, tres = 0;
      for (const it of todas) {
        const um = await pf.search(it.t, { filters: { categoria: { any: cats } } }); const d = await um.results[0]?.data(); if (d && d.url === `/${it.u}`) top1++;
        const dois = await pf.search(sem(it.t).toUpperCase(), { filters: { categoria: { any: cats } } }); const d2 = await dois.results[0]?.data(); if (d2 && d2.url === `/${it.u}`) top1Sem++;
        const tr = await pf.search(it.t.split(/\s+/).slice(0, 3).join(' '), { filters: { categoria: { any: cats } } }); const ds = await Promise.all(tr.results.slice(0, 5).map((x) => x.data())); if (ds.some((x) => x.url === `/${it.u}`)) tres++;
      }
      exige(top1 === todas.length, 'qualidade', `titulo exato em 1o lugar: ${top1} de ${todas.length}`);
      exige(top1Sem === todas.length, 'qualidade', `titulo sem acento e em maiusculas em 1o lugar: ${top1Sem} de ${todas.length}`);
      exige(tres >= todas.length * 0.9, 'qualidade', `3 primeiras palavras no top 5: ${tres} de ${todas.length} (esperado pelo menos 90%: franquias com muitas materias, como Resident Evil, disputam o top 5)`);
      const m = await pf.search('mimir'); const dm = await m.results[0]?.data(); exige(dm && /Mimir/i.test(dm.meta.title + dm.excerpt), 'qualidade', 'a palavra "Mimir", que so aparece no texto, nao achou a materia');
      const jogo = (await pf.search('jogo')).results.length, jogos = (await pf.search('jogos')).results.length;
      exige(Math.abs(jogo - jogos) <= Math.max(3, jogo * 0.25), 'qualidade', `"jogo" (${jogo}) e "jogos" (${jogos}) deveriam achar quase o mesmo`, 'medio');
      const erro = (await pf.search('residnt')).results.length; exige(erro > 0, 'qualidade', 'erro de digitacao ("residnt") nao achou nada: o Pagefind deveria tolerar', 'medio');
    });

    // ---------- sem JavaScript ----------
    await cenario('sem JavaScript', async () => {
      let f = await abrir('/busca.html', 420, 800, 'allow-same-origin'); let d = f.contentDocument;
      exige(d.querySelectorAll('#busca-lista .news-card').length === Math.min(30, todas.length), 'sem JS: busca.html', 'a pagina 1 nao aparece sem JavaScript');
      exige(d.getElementById('busca-mais').hidden && d.getElementById('busca-filtros').hidden, 'sem JS: busca.html', 'botao "Ver mais" ou filtros aparecendo sem JavaScript (nao funcionam)');
      exige(/JavaScript/.test(d.querySelector('noscript')?.textContent ?? '') || d.querySelector('.busca-aviso'), 'sem JS: busca.html', 'nao ha aviso de que a busca precisa de JavaScript');
      const form = d.querySelector('form.search'); exige(form.getAttribute('action') === 'busca.html' && form.method === 'get', 'sem JS: formulario', 'o formulario nao leva para busca.html sem JavaScript');
      f.remove();
      f = await abrir('/index.html', 420, 800, 'allow-same-origin'); d = f.contentDocument;
      exige(f.contentWindow.getComputedStyle(d.getElementById('gta-count')).display === 'none', 'sem JS: index.html', 'o contador com "--" aparece sem JavaScript');
      f.remove();
    });

    // ---------- contador ----------
    await cenario('contador', async () => {
      const f = await abrir('/index.html', 420, 800); const d = f.contentDocument;
      await esperar(1500);
      const v = (id) => d.getElementById(id).textContent;
      exige(/^\d+$/.test(v('cd-d')) && /^\d\d$/.test(v('cd-h')) && /^\d\d$/.test(v('cd-m')) && /^\d\d$/.test(v('cd-s')), 'contador', `valores estranhos: ${v('cd-d')} ${v('cd-h')} ${v('cd-m')} ${v('cd-s')}`);
      const s1 = v('cd-s'); await esperar(2100); exige(v('cd-s') !== s1, 'contador', 'os segundos nao andam');
      const alvo = new Date(d.getElementById('gta-count').getAttribute('data-alvo')).getTime(), dias = Math.floor((alvo - Date.now()) / 86400000);
      exige(Math.abs(Number(v('cd-d')) - dias) <= 1 || alvo < Date.now(), 'contador', `dias mostrados (${v('cd-d')}) diferentes do calculado (${dias})`);
      exige(f.contentWindow.performance.getEntriesByType('resource').some((e) => e.initiatorType === 'fetch' && /index\.html/.test(e.name)), 'contador', 'a conferencia com a hora do servidor nao foi feita', 'medio');
      f.remove();
    });

    return { achados, total };
  }
  window.jsTeste = { rodar };
})();
