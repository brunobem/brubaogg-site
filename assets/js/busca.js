/* Busca do BRUBAOGG.
 *  - Em toda pagina: sugestoes ao digitar no campo do cabecalho (matérias pelo Pagefind; tags e paginas pelo atalhos.json).
 *  - Em busca.html: lista de resultados com filtro por categoria e "Ver mais" (30 a cada clique). Sem texto digitado mostra as
 *    materias mais recentes (arquivos por mes em assets/data/lista/). O estado fica na URL (?q=&cat=&n=).
 *  Nada e baixado ate a pessoa digitar (ou abrir busca.html). Falha de rede nunca fica "gravada": a proxima tentativa baixa de novo.
 *  Todo texto entra na pagina por textContent/createTextNode (nunca innerHTML). Funcoes puras ficam em window.BrubaoBusca (testes). */
(function () {
  'use strict';

  const PASSO = 30;
  const MAX_N = 1500;
  const MAX_Q = 200;
  const MAX_SUGESTOES = 5;
  const MAX_ATALHOS = 3;

  /* ---------------- funcoes puras ---------------- */
  // sem acento, minusculo
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  // texto comparavel: sem acento, sem pontuacao, espacos unicos ("gta-6" e "GTA 6" viram "gta 6")
  function chave(s) {
    return norm(s).replace(/[\s!-/:-@[-`{-~]+/g, ' ').trim();
  }
  // formas de escrever a mesma coisa: "gta6" tambem vale "gta 6", "ps5" vale "ps 5". A primeira e a que a pessoa digitou.
  function variantes(q) {
    const base = chave(q);
    if (!base) return [];
    const separado = base.replace(/([a-z])(\d)/g, '$1 $2').replace(/(\d)([a-z])/g, '$1 $2');
    return separado === base ? [base] : [base, separado];
  }
  // 1 letra so (ou nada) nao e busca: mostra os mais recentes
  function consultaValida(q) {
    return chave(q).length >= 2;
  }
  // "forte" = pontuacao de pelo menos 40% da melhor da busca SEM filtro de categoria. Os fortes vem primeiro (mais novo na frente);
  // depois os fracos (tambem do mais novo para o mais velho). rel e dat tem os mesmos resultados: rel por relevancia, dat por data.
  function combinar(rel, dat, topo) {
    const corte = topo * 0.4, fortes = {};
    rel.forEach((x) => { if (x.score >= corte) fortes[x.id] = true; });
    return dat.filter((x) => fortes[x.id]).concat(dat.filter((x) => !fortes[x.id]));
  }
  // estado da pagina de resultados <-> URL
  function estadoDaUrl(search) {
    const p = new URLSearchParams(search);
    let n = parseInt(p.get('n'), 10);
    if (!(n >= PASSO)) n = PASSO;
    n = Math.min(Math.ceil(n / PASSO) * PASSO, MAX_N);
    return { q: (p.get('q') || '').slice(0, MAX_Q), cat: (p.get('cat') || '').slice(0, 40), n: n };
  }
  function urlDoEstado(e) {
    const p = new URLSearchParams();
    if (e.q.trim()) p.set('q', e.q.trim());
    if (e.cat) p.set('cat', e.cat);
    if (e.n > PASSO) p.set('n', String(e.n));
    const s = p.toString();
    return s ? '?' + s : '';
  }
  // atalho (tag ou pagina) casa quando TODAS as palavras digitadas sao comeco de alguma palavra do nome
  function casaAtalho(atalho, variante) {
    const toks = variante.split(' '), nomes = chave(atalho.t).split(' ');
    return toks.every((t) => nomes.some((w) => w.indexOf(t) === 0));
  }
  function atalhosPara(lista, q) {
    const vs = variantes(q), exato = chave(q);
    return lista.filter((a) => vs.some((v) => casaAtalho(a, v)))
      .sort((a, b) => (chave(b.t) === exato) - (chave(a.t) === exato) || chave(a.t).split(' ').length - chave(b.t).split(' ').length);
  }
  function fmtData(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  }
  // so caminhos do proprio site (letras, numeros, - _ . /, sem comecar por barra) e imagens https
  const caminhoSeguro = (u) => typeof u === 'string' && /^[\w-][\w\-./]*$/.test(u) && u.indexOf('..') < 0; // nunca comeca com / (// e outro site)
  const imagemSegura = (u) => typeof u === 'string' && /^https:\/\/[\w.\-]+\/[\w\-./]+$/.test(u);

  const api = { PASSO: PASSO, norm: norm, chave: chave, variantes: variantes, consultaValida: consultaValida, combinar: combinar, estadoDaUrl: estadoDaUrl, urlDoEstado: urlDoEstado, atalhosPara: atalhosPara, casaAtalho: casaAtalho, fmtData: fmtData, caminhoSeguro: caminhoSeguro, imagemSegura: imagemSegura };
  // o navegador de verdade importa modulos assim; os testes trocam esta funcao por uma de mentira
  api.importar = (url) => import(url);
  window.BrubaoBusca = api;

  const form = document.querySelector('form.search');
  if (!form) return;
  const base = form.getAttribute('data-base') || '';
  const input = form.querySelector('input');
  const box = form.querySelector('.search-results');
  const aviso = document.getElementById('search-status');
  const url = (rel) => new URL(base + rel, document.baseURI).href;

  /* ---------------- carregamento (sem gravar falha) ---------------- */
  // devolve uma funcao que baixa uma vez e guarda o RESULTADO; se falhar, a proxima chamada tenta de novo
  function umaVez(fn) {
    let prom = null;
    return function () {
      if (!prom) prom = fn().catch((e) => { prom = null; throw e; });
      return prom;
    };
  }
  const lerJson = (rel) => fetch(url(rel), { cache: 'default' }).then((r) => { if (!r.ok) throw new Error(rel + ': ' + r.status); return r.json(); });
  const carregarAtalhos = umaVez(() => lerJson('assets/data/atalhos.json'));
  const carregarManifesto = umaVez(() => lerJson('assets/data/lista/manifesto.json'));
  const carregarPagefind = umaVez(() => api.importar(url('pagefind/pagefind.js')).then((pf) => Promise.resolve(pf.options ? pf.options({ excerptLength: 22 }) : null).then(() => pf)));

  // busca no Pagefind: devolve { lista: [{ id, score, data }], totais: { categoria: n } }.
  // O Pagefind so devolve contagens de um filtro quando o pedido usa esse filtro: por isso, sem categoria escolhida, o pedido filtra por
  // "qualquer uma das categorias" (resultado igual ao sem filtro) so para trazer as contagens dos botoes.
  function pesquisarVariante(pf, q, categoria, todasCats) {
    const doTodas = todasCats && todasCats.length ? { categoria: { any: todasCats } } : {};
    const filtros = categoria ? { categoria: { any: [categoria] } } : doTodas;
    const buscas = [pf.search(q, { filters: filtros }), pf.search(q, { filters: filtros, sort: { data: 'desc' } })];
    if (categoria) buscas.push(pf.search(q, { filters: doTodas })); // a regua de "forte" vem da busca sem filtro de categoria
    return Promise.all(buscas).then((r) => {
      const todas = categoria ? r[2] : r[0];
      const topo = todas.results.length ? todas.results[0].score : 0;
      const lista = combinar(r[0].results, r[1].results, topo);
      const totais = (todas.totalFilters && todas.totalFilters.categoria) || {};
      if (!r[0].results.length) return { lista: lista, totais: totais };
      // titulo igual ao digitado vai para o topo, mesmo que haja materia mais nova tambem forte
      const melhor = r[0].results[0];
      return melhor.data().then((d) => ({ lista: chave((d.meta || {}).title) === chave(q) ? [melhor].concat(lista.filter((x) => x.id !== melhor.id)) : lista, totais: totais }));
    });
  }
  function pesquisar(q, categoria, todasCats) {
    const vs = variantes(q);
    return carregarPagefind().then((pf) => {
      const tenta = (i) => pesquisarVariante(pf, vs[i], categoria, todasCats).then((r) => (r.lista.length || i + 1 >= vs.length ? r : tenta(i + 1)));
      return tenta(0);
    });
  }
  // dados de um resultado do Pagefind no formato dos arquivos de lista
  function itemDoPagefind(d) {
    const meta = d.meta || {}, filtros = d.filters || {};
    return { t: meta.title || '', u: String(d.url || '').replace(/^\//, ''), c: (filtros.categoria && filtros.categoria[0]) || '', i: meta.image || '', dt: meta.data || '', r: meta.resumo || '', ex: d.excerpt || '' };
  }
  api.itemDoPagefind = itemDoPagefind;

  /* ---------------- pecas de tela ---------------- */
  function el(tag, props, filhos) {
    const e = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => { e[k] = props[k]; });
    (filhos || []).forEach((f) => { if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  }
  // trecho do Pagefind: so texto e <mark>; qualquer outra coisa vira texto puro
  function trechoComDestaque(destino, html) {
    const doc = new DOMParser().parseFromString('<body>' + html, 'text/html');
    doc.body.childNodes.forEach((n) => {
      if (n.nodeName === 'MARK') destino.appendChild(el('mark', { textContent: n.textContent }));
      else destino.appendChild(document.createTextNode(n.textContent));
    });
  }
  const icones = {};
  const modeloIcones = document.getElementById('busca-icones');
  if (modeloIcones) modeloIcones.content.querySelectorAll('[data-cat]').forEach((s) => { icones[s.getAttribute('data-cat')] = s.firstElementChild; });

  // mesmo desenho do cartao gerado no HTML (modelos.mjs, cartao)
  function cartao(it) {
    if (!caminhoSeguro(it.u)) return null;
    const a = el('a', { className: 'news-card', href: base + it.u });
    const thumb = el('span', { className: 'thumb' });
    if (imagemSegura(it.i)) thumb.appendChild(el('img', { src: it.i, alt: '', loading: 'lazy' }));
    const tag = el('span', { className: 'tag' });
    if (icones[it.c]) tag.appendChild(icones[it.c].cloneNode(true));
    tag.appendChild(document.createTextNode(' ' + it.c));
    const corpo = el('span', { className: 'news-body' }, [tag, el('b', { className: 'news-title', textContent: it.t })]);
    if (it.ex || it.r) {
      const ex = el('span', { className: 'news-excerpt' });
      if (it.ex) trechoComDestaque(ex, it.ex); else ex.textContent = it.r;
      corpo.appendChild(ex);
    }
    if (it.dt) corpo.appendChild(el('small', { className: 'news-date', textContent: fmtData(it.dt) }));
    a.appendChild(thumb);
    a.appendChild(corpo);
    return a;
  }

  api.cartao = cartao;

  // linha da lista de sugestoes (miniatura, titulo e "Categoria · data")
  function linhaSugestao(it, indice) {
    if (!caminhoSeguro(it.u)) return null;
    const a = el('a', { href: base + it.u, id: 'sug-' + indice, tabIndex: -1 });
    a.setAttribute('role', 'option');
    if (imagemSegura(it.i)) a.appendChild(el('img', { src: it.i, alt: '', loading: 'lazy' }));
    a.appendChild(el('span', { className: 'sr-txt' }, [el('b', { textContent: it.t }), el('small', { textContent: it.c + (it.dt ? ' · ' + fmtData(it.dt) : '') })]));
    return a;
  }

  /* ---------------- sugestoes (caixa abaixo do campo, em todas as paginas) ---------------- */
  const sug = { seq: 0, ativo: -1, itens: [], q: '', pronta: Promise.resolve() };
  const naPaginaDeBusca = !!document.getElementById('busca-lista');
  let atraso = null;

  function anunciar(texto) { if (aviso) aviso.textContent = texto; }
  function abrir(sim) {
    box.hidden = !sim;
    input.setAttribute('aria-expanded', sim ? 'true' : 'false');
    if (!sim) { sug.ativo = -1; input.removeAttribute('aria-activedescendant'); }
  }
  function marcar() {
    const opcoes = box.querySelectorAll('[role="option"]');
    opcoes.forEach((a, i) => {
      a.classList.toggle('on', i === sug.ativo);
      a.setAttribute('aria-selected', i === sug.ativo ? 'true' : 'false');
    });
    if (sug.ativo >= 0 && opcoes[sug.ativo]) {
      input.setAttribute('aria-activedescendant', opcoes[sug.ativo].id);
      if (opcoes[sug.ativo].scrollIntoView) opcoes[sug.ativo].scrollIntoView({ block: 'nearest' });
    } else input.removeAttribute('aria-activedescendant');
  }
  function mensagemNaCaixa(texto, tentarDeNovo) {
    box.textContent = '';
    const p = el('p', { className: 'sr-empty', textContent: texto });
    if (tentarDeNovo) {
      p.appendChild(document.createTextNode(' '));
      const b = el('button', { type: 'button', className: 'sr-retry', textContent: 'Tentar de novo' });
      b.addEventListener('click', () => { input.focus(); sugerir(input.value); });
      p.appendChild(b);
    }
    box.appendChild(p);
    abrir(true);
  }

  function sugerir(valor) {
    const minha = ++sug.seq;
    sug.itens = []; sug.q = valor;
    if (!consultaValida(valor)) { box.textContent = ''; abrir(false); anunciar(''); sug.pronta = Promise.resolve(); return sug.pronta; }
    sug.pronta = Promise.all([carregarAtalhos().catch(() => []), pesquisar(valor, '')]).then((r) => {
      if (minha !== sug.seq) return;
      const atalhos = atalhosPara(r[0], valor).slice(0, MAX_ATALHOS).map((a) => ({ t: a.t, u: a.u, c: a.c, i: '', dt: '' }));
      return Promise.all(r[1].lista.slice(0, Math.max(2, MAX_SUGESTOES - atalhos.length)).map((x) => x.data())).then((dados) => {
        if (minha !== sug.seq) return;
        sug.itens = atalhos.concat(dados.map(itemDoPagefind)).slice(0, MAX_SUGESTOES);
        box.textContent = '';
        sug.ativo = -1;
        if (!sug.itens.length) { mensagemNaCaixa('Nenhum resultado para "' + valor.trim() + '".'); anunciar('Nenhum resultado'); return; }
        sug.itens.forEach((it, i) => { const l = linhaSugestao(it, i); if (l) box.appendChild(l); });
        const todos = el('a', { href: paginaDeResultados(valor.trim()), className: 'sr-all', id: 'sug-todos', tabIndex: -1, textContent: 'Ver todos os resultados para "' + valor.trim() + '"' });
        todos.setAttribute('role', 'option');
        box.appendChild(todos);
        abrir(true);
        anunciar(sug.itens.length + (sug.itens.length === 1 ? ' sugestão' : ' sugestões') + '. Use as setas para cima e para baixo e Enter.');
      });
    }).catch(() => {
      if (minha !== sug.seq) return;
      mensagemNaCaixa('Não foi possível carregar a busca agora.', true);
      anunciar('Não foi possível carregar a busca');
    });
    return sug.pronta;
  }
  const paginaDeResultados = (q) => base + 'busca.html' + urlDoEstado({ q: q, cat: '', n: PASSO });

  // Enter: sugestao marcada -> vai para ela; nome igual ao digitado (materia, tag ou pagina) -> vai direto; senao -> pagina de resultados
  function irParaBusca() {
    const q = input.value.trim();
    if (!q) return;
    const marcada = sug.ativo >= 0 ? box.querySelectorAll('[role="option"]')[sug.ativo] : null;
    if (marcada) { window.location.href = marcada.href; return; }
    (sug.q === input.value ? sug.pronta : sugerir(input.value)).catch(() => {}).then(() => {
      const vs = variantes(q);
      const exato = sug.itens.filter((it) => vs.indexOf(chave(it.t)) >= 0)[0];
      window.location.href = exato && caminhoSeguro(exato.u) ? base + exato.u : paginaDeResultados(q);
    });
  }

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (naPaginaDeBusca) { clearTimeout(atraso); estadoBusca.q = input.value; estadoBusca.n = PASSO; desenhar(false); return; }
    irParaBusca();
  });
  input.addEventListener('input', () => {
    if (naPaginaDeBusca) { clearTimeout(atraso); atraso = setTimeout(() => { estadoBusca.q = input.value; estadoBusca.n = PASSO; desenhar(false); }, 200); return; }
    clearTimeout(atraso);
    atraso = setTimeout(() => sugerir(input.value), 120);
  });
  input.addEventListener('focus', () => { if (!naPaginaDeBusca && consultaValida(input.value) && box.hidden) sugerir(input.value); });
  input.addEventListener('keydown', (ev) => {
    const n = box.querySelectorAll('[role="option"]').length;
    if (ev.key === 'ArrowDown' && n && !box.hidden) { ev.preventDefault(); sug.ativo = (sug.ativo + 1) % n; marcar(); }
    else if (ev.key === 'ArrowUp' && n && !box.hidden) { ev.preventDefault(); sug.ativo = (sug.ativo - 1 + n) % n; marcar(); }
    else if (ev.key === 'ArrowDown' && box.hidden && !naPaginaDeBusca && consultaValida(input.value)) { ev.preventDefault(); sugerir(input.value); }
    else if (ev.key === 'Escape' && !box.hidden) { ev.preventDefault(); abrir(false); }
  });
  // sair do campo com Tab (ou ir para fora do formulario por qualquer caminho) fecha a lista
  form.addEventListener('focusout', (ev) => { if (ev.relatedTarget && !form.contains(ev.relatedTarget)) abrir(false); });
  document.addEventListener('click', (ev) => { if (!form.contains(ev.target)) abrir(false); });
  box.tabIndex = -1; // clicar na barra de rolagem da lista nao tira o foco do formulario

  /* ---------------- busca.html: resultados e "mais recentes" ---------------- */
  const lista = document.getElementById('busca-lista');
  const estadoBusca = estadoDaUrl(window.location.search);
  let desenhar = () => {};
  if (lista) {
    const titulo = document.getElementById('busca-titulo');
    const status = document.getElementById('busca-status');
    const filtros = document.getElementById('busca-filtros');
    const atalhosEl = document.getElementById('busca-atalhos');
    const maisBtn = document.getElementById('busca-mais');
    const raiz = document.documentElement;
    let sequencia = 0, desenhados = 0, meses = null, proximoMes = 0, carregadas = [], ultima = null, resultados = [], totais = {};
    let categorias = (filtros.getAttribute('data-categorias') || '').split('|').filter(Boolean); // vem pronto no HTML: os botoes nao "pulam" na tela
    if (estadoBusca.cat && categorias.indexOf(estadoBusca.cat) < 0) estadoBusca.cat = ''; // categoria inventada na URL

    const dizer = (t) => { status.textContent = t; };
    function falhou(retentar) {
      dizer('Não foi possível carregar agora. ');
      const b = el('button', { type: 'button', className: 'btn', textContent: 'Tentar de novo' });
      b.addEventListener('click', retentar);
      status.appendChild(b);
      maisBtn.hidden = true;
    }

    // chips de categoria (Todas + as que existem)
    function desenharFiltros(contagens) {
      filtros.textContent = '';
      if (categorias.length < 2) { filtros.hidden = true; return; }
      const itens = [''].concat(categorias);
      itens.forEach((c) => {
        const n = contagens ? (c ? contagens[c] || 0 : Object.keys(contagens).reduce((s, k) => s + contagens[k], 0)) : null;
        if (contagens && c && !n && c !== estadoBusca.cat) return; // categoria sem resultado nao aparece
        const b = el('button', { type: 'button', className: 'busca-chip', textContent: (c || 'Todas') + (n !== null ? ' (' + n + ')' : '') });
        b.setAttribute('aria-pressed', String(estadoBusca.cat === c));
        b.addEventListener('click', () => { estadoBusca.cat = c; estadoBusca.n = PASSO; desenhar(false); });
        filtros.appendChild(b);
      });
      filtros.hidden = false;
    }

    // modo "mais recentes": arquivos por mes, do mais novo para o mais velho, ate ter o suficiente
    const doFiltro = () => (estadoBusca.cat ? carregadas.filter((x) => x.c === estadoBusca.cat) : carregadas);
    function garantir(qtd) {
      return carregarManifesto().then((m) => {
        meses = m.meses;
        const passo = () => (doFiltro().length >= qtd || proximoMes >= meses.length ? doFiltro() : lerJson('assets/data/lista/' + meses[proximoMes].m + '.json').then((l) => { carregadas = carregadas.concat(l); proximoMes++; return passo(); }));
        return passo();
      });
    }

    // a lista pronta no HTML (pagina 1, tudo, sem filtro) so e refeita se a URL pedir outra coisa
    desenhar = function (manter) {
      const minha = ++sequencia;
      estadoBusca.q = estadoBusca.q.slice(0, MAX_Q);
      const busca = consultaValida(estadoBusca.q);
      const adicionar = (itens) => {
        if (!manter) { lista.textContent = ''; desenhados = 0; }
        const antes = lista.children.length;
        itens.forEach((it) => { const c = cartao(it); if (c) lista.appendChild(c); });
        desenhados = lista.children.length;
        raiz.classList.remove('com-busca');
        return antes;
      };
      const fim = (antes, total, mais) => {
        maisBtn.hidden = !mais;
        if (!mais) estadoBusca.n = Math.max(PASSO, Math.ceil(total / PASSO) * PASSO); // nao deixa "n=90" na URL de uma lista de 37
        history.replaceState(null, '', window.location.pathname + urlDoEstado(estadoBusca));
        if (manter && lista.children[antes]) { const link = lista.children[antes]; link.focus(); }
        return total;
      };
      if (!busca) {
        titulo.textContent = estadoBusca.cat ? 'Mais recentes: ' + estadoBusca.cat : 'Matérias mais recentes';
        atalhosEl.hidden = true;
        dizer('');
        return garantir(estadoBusca.n + 1).then((todos) => {
          if (minha !== sequencia) return;
          desenharFiltros(null);
          const fatia = todos.slice(manter ? desenhados : 0, estadoBusca.n);
          const antes = adicionar(fatia);
          if (!todos.length) dizer('Nenhuma matéria encontrada.');
          else if (manter) dizer('Mostrando ' + desenhados + ' matérias.');
          fim(antes, todos.length, todos.length > estadoBusca.n || proximoMes < meses.length);
        }).catch(() => { if (minha === sequencia) falhou(() => desenhar(manter)); });
      }
      titulo.textContent = 'Resultados para "' + estadoBusca.q.trim() + '"';
      dizer('Buscando...');
      const chaveBusca = chave(estadoBusca.q) + '|' + estadoBusca.cat;
      const pronto = ultima && ultima.chave === chaveBusca ? Promise.resolve(ultima) : pesquisar(estadoBusca.q, estadoBusca.cat, categorias).then((r) => { ultima = { chave: chaveBusca, lista: r.lista, totais: r.totais }; return ultima; });
      return Promise.all([pronto, carregarAtalhos().catch(() => [])]).then((p) => {
        if (minha !== sequencia) return;
        resultados = p[0].lista; totais = p[0].totais;
        const fatia = resultados.slice(manter ? desenhados : 0, estadoBusca.n);
        return Promise.all(fatia.map((x) => x.data())).then((dados) => {
          if (minha !== sequencia) return;
          desenharFiltros(totais);
          const tags = atalhosPara(p[1], estadoBusca.q).filter((a) => a.c === 'Tag').slice(0, 5);
          atalhosEl.textContent = '';
          if (tags.length) {
            atalhosEl.appendChild(document.createTextNode('Ir para a tag: '));
            tags.forEach((a) => { if (caminhoSeguro(a.u)) atalhosEl.appendChild(el('a', { href: base + a.u, className: 'busca-atalho', textContent: a.t })); });
          }
          atalhosEl.hidden = !tags.length;
          const antes = adicionar(dados.map(itemDoPagefind));
          const total = resultados.length;
          if (!total) dizer('Nenhum resultado ' + (estadoBusca.cat ? 'em ' + estadoBusca.cat + ' ' : '') + 'para "' + estadoBusca.q.trim() + '". ' + (estadoBusca.cat ? 'Escolha outra categoria ou tente outra palavra.' : 'Tente outra palavra.'));
          else dizer(total + (total === 1 ? ' resultado' : ' resultados') + (estadoBusca.cat ? ' em ' + estadoBusca.cat : '') + ' para "' + estadoBusca.q.trim() + '"' + (desenhados < total ? ' (mostrando ' + desenhados + ')' : ''));
          fim(antes, total, estadoBusca.n < total);
        });
      }).catch(() => { if (minha === sequencia) falhou(() => desenhar(manter)); });
    };

    maisBtn.addEventListener('click', () => { estadoBusca.n += PASSO; desenhar(true); });
    input.value = estadoBusca.q;
    document.title = (estadoBusca.q.trim() ? 'Busca: ' + estadoBusca.q.trim() : 'Busca') + ' | BRUBAOGG';
    const pedido = estadoBusca.q.trim() || estadoBusca.cat || estadoBusca.n > PASSO;
    if (pedido) desenhar(false);
    else {
      // pagina 1 ja veio no HTML: so liga o botao (o total vem do atributo, sem baixar nada)
      desenhados = lista.children.length;
      maisBtn.hidden = !(Number(maisBtn.getAttribute('data-total')) > desenhados);
      desenharFiltros(null);
    }
  }

  /* ---------------- "Ver mais" nas listas (categorias, tags grandes, hub do GTA 6) ---------------- */
  // A pagina traz os 30 primeiros no HTML; o resto esta em assets/data/colecao/<id>/<k>.json (blocos de 90). Cada clique acrescenta 30.
  const BLOCO = 90;
  document.querySelectorAll('button[data-colecao]').forEach((botao) => {
    const id = botao.getAttribute('data-colecao'), total = Number(botao.getAttribute('data-total')) || 0;
    const grade = document.querySelector('[data-lista="' + id + '"]');
    if (!grade || !total || !/^[\w-]+$/.test(id)) return;
    const blocos = {};
    let mostrados = 0; // itens da colecao (depois da pagina 1) ja na tela
    const pegar = (k) => blocos[k] || (blocos[k] = lerJson('assets/data/colecao/' + id + '/' + k + '.json').catch((e) => { delete blocos[k]; throw e; }));
    // garante que `qtd` itens da colecao estejam na tela (de 30 em 30)
    function ate(qtd) {
      const alvo = Math.min(qtd, total);
      if (mostrados >= alvo) return Promise.resolve();
      return pegar(Math.floor(mostrados / BLOCO) + 1).then((itens) => {
        const dentro = mostrados % BLOCO, fatia = itens.slice(dentro, dentro + Math.min(PASSO, alvo - mostrados));
        if (!fatia.length) throw new Error('bloco vazio');
        fatia.forEach((it) => { const c = cartao(it); if (c) grade.appendChild(c); });
        mostrados += fatia.length;
        return ate(qtd);
      });
    }
    const atualizar = (antes) => {
      botao.hidden = mostrados >= total;
      history.replaceState(null, '', window.location.pathname + urlDoEstado({ q: '', cat: '', n: PASSO + mostrados }));
      anunciar('Mostrando ' + (PASSO + mostrados) + ' de ' + (PASSO + total) + ' matérias.');
      if (antes !== undefined && grade.children[antes]) grade.children[antes].focus();
    };
    botao.hidden = false;
    botao.addEventListener('click', () => {
      const antes = grade.children.length;
      botao.disabled = true;
      ate(mostrados + PASSO).then(() => atualizar(antes)).catch(() => anunciar('Não foi possível carregar mais agora. Toque em "Ver mais" para tentar de novo.')).then(() => { botao.disabled = false; });
    });
    const pedido = estadoDaUrl(window.location.search).n; // voltou para a pagina (?n=90): mostra de novo ate onde a pessoa estava
    if (pedido > PASSO) ate(pedido - PASSO).then(() => atualizar()).catch(() => {});
  });
})();
