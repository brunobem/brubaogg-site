/* Mini-busca de cada secao (Noticias, Reviews, Lancamentos e Wiki): um campo de busca acima da lista e, em Reviews (plataforma) e na Wiki (jogo), um menu lateral.
 *  - O campo e o menu vem prontos do gerador, escondidos (hidden); este arquivo os mostra e faz o resto. A lista de sempre fica no HTML, visivel: sem JavaScript segue
 *    como esta, e com JavaScript so some enquanto ha busca ou item de menu ativo.
 *  - Os cartoes filtrados vem de assets/data/secao/<secao>.json, baixado uma vez, so quando a pessoa usa a busca (ou abre a pagina com a busca na URL).
 *  - O menu escolhe um item de cada vez (clicar de novo, ou em "Todos", volta); item e texto juntos valem "e". O texto digitado precisa ter TODAS as palavras no
 *    titulo, no resumo, nas tags ou no assunto da materia (sem acento, sem diferenca de maiuscula; "gta6" acha "GTA 6").
 *  - O estado fica na URL (?q=&pl=&jogo=&o=): o link da busca e compartilhavel. Sem busca nem item escolhido a URL fica limpa e a lista original volta.
 *  Todo texto entra na pagina por textContent/createTextNode (nunca innerHTML). Funcoes puras ficam em window.BrubaoSecao (testes). */
(function () {
  'use strict';

  const PASSO = 30;
  const MAX_Q = 100;
  const ESPERA_DIGITANDO = 180;

  /* ---------------- funcoes puras ---------------- */
  // sem acento, minusculo
  function norm(s) {
    return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  // texto comparavel: sem acento, sem pontuacao, espacos unicos ("gta-6" e "GTA 6" viram "gta 6")
  function chave(s) {
    return norm(s).replace(/[\s!-/:-@[-`{-~]+/g, ' ').trim();
  }
  const valorOk = (v) => typeof v === 'string' && /^[a-z0-9][a-z0-9-]{0,59}$/.test(v);

  // estado <-> URL. `grupos` = os ids dos filtros da pagina (tag, mes, rec...). Valores de filtro sao so slugs; qualquer outra coisa na URL e ignorada.
  function lerEstado(search, grupos) {
    const p = new URLSearchParams(search);
    const e = { q: (p.get('q') || '').slice(0, MAX_Q), f: {}, o: p.get('o') === 'az' ? 'az' : 'recentes' };
    (grupos || []).forEach((g) => {
      const vs = (p.get(g) || '').split(',').filter(valorOk).slice(0, 20);
      if (vs.length) e.f[g] = vs;
    });
    return e;
  }
  function escreverEstado(e, grupos) {
    const p = new URLSearchParams();
    if (e.q.trim()) p.set('q', e.q.trim());
    (grupos || []).forEach((g) => { if (e.f[g] && e.f[g].length) p.set(g, e.f[g].join(',')); });
    if (e.o === 'az') p.set('o', 'az');
    const s = p.toString();
    return s ? '?' + s : '';
  }
  // 1 letra so nao e busca (como na busca do cabecalho): so conta o texto com 2 letras ou mais
  const textoValido = (q) => chave(q).length >= 2;
  const ativo = (e) => textoValido(e.q) || Object.keys(e.f).some((g) => e.f[g] && e.f[g].length) || e.o !== 'recentes';

  // o texto de uma materia para a busca, calculado uma vez: com espacos e sem espacos (o segundo e o que faz "gta6" achar "gta 6")
  function textoDoItem(it) {
    if (!it.$h) {
      const h = chave([it.t, it.r, it.b].join(' '));
      it.$h = { h: h, c: h.replace(/ /g, '') };
    }
    return it.$h;
  }
  function filtrar(itens, e) {
    const q = textoValido(e.q) ? chave(e.q) : '';
    const palavras = q ? q.split(' ') : [];
    const junto = q.replace(/ /g, '');
    const grupos = Object.keys(e.f).filter((g) => e.f[g] && e.f[g].length);
    return itens.filter((it) => {
      if (palavras.length) {
        const x = textoDoItem(it);
        if (x.c.indexOf(junto) < 0 && !palavras.every((w) => x.h.indexOf(w) >= 0)) return false;
      }
      return grupos.every((g) => {
        const vs = (it.f && it.f[g]) || [];
        return e.f[g].some((v) => vs.indexOf(v) >= 0);
      });
    });
  }
  function ordenar(lista, o) {
    const l = lista.slice();
    if (o === 'az') l.sort((a, b) => chave(a.t).localeCompare(chave(b.t), 'pt-BR', { numeric: true }));
    else l.sort((a, b) => (a.dt < b.dt ? 1 : a.dt > b.dt ? -1 : 0));
    return l;
  }
  function fmtData(iso) {
    const d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'America/Sao_Paulo' });
  }
  // so caminhos do proprio site (letras, numeros, - _ . /, sem comecar por barra) e imagens https
  const caminhoSeguro = (u) => typeof u === 'string' && /^[\w-][\w\-./]*$/.test(u) && u.indexOf('..') < 0;
  const imagemSegura = (u) => typeof u === 'string' && (/^https:\/\/[\w.\-]+\/[\w\-./]+$/.test(u) || /^\/assets\/img\/[\w\-.]+$/.test(u)); // https ou uma imagem do proprio site (capa da Wiki); nunca //outro-site

  const api = { PASSO: PASSO, norm: norm, chave: chave, lerEstado: lerEstado, escreverEstado: escreverEstado, textoValido: textoValido, ativo: ativo, filtrar: filtrar, ordenar: ordenar, fmtData: fmtData, caminhoSeguro: caminhoSeguro, imagemSegura: imagemSegura };
  window.BrubaoSecao = api;

  /* ---------------- tela ---------------- */
  const raiz = document.querySelector('.secao-busca');
  if (!raiz) return;
  const form = raiz.querySelector('.secao-form');
  const campo = form.querySelector('input[name="q"]');
  const ordem = form.querySelector('select[name="o"]');
  const status = form.querySelector('.busca-status');
  const layout = raiz.querySelector('.secao-layout');
  const menu = raiz.querySelector('.secao-menu'); // so Reviews (plataforma) e Wiki (jogo) tem
  const itensDoMenu = menu ? Array.prototype.slice.call(menu.querySelectorAll('.secao-item')) : []; // nivel 1 (e "Todos")
  const paineis = menu ? Array.prototype.slice.call(menu.querySelectorAll('.secao-sub')) : []; // nivel 2: os jogos de cada franquia (so a Wiki)
  const subitens = menu ? Array.prototype.slice.call(menu.querySelectorAll('.secao-subitem')) : [];
  const grupo = menu ? menu.getAttribute('data-grupo') : '';
  const grupos = grupo ? (paineis.length ? [grupo, 'sub'] : [grupo]) : [];
  const ver = raiz.querySelector('.secao-ver');
  const grade = raiz.querySelector('.secao-resultados');
  const mais = raiz.querySelector('.secao-mais');
  const maisBotao = mais.querySelector('button');
  const estatico = raiz.querySelector('.secao-estatico');
  const src = raiz.getAttribute('data-src');
  const um = raiz.getAttribute('data-um') || 'resultado';
  const varios = raiz.getAttribute('data-varios') || 'resultados';

  let dados = null; // itens do JSON, baixados uma vez
  let baixando = null;
  let atual = []; // resultado da busca de agora, ja ordenado
  let mostrados = PASSO;
  let rodada = 0; // descarta a resposta de uma busca que ja foi trocada por outra
  let espera = 0;

  function el(tag, props, filhos) {
    const e = document.createElement(tag);
    Object.keys(props || {}).forEach((k) => { e[k] = props[k]; });
    (filhos || []).forEach((f) => { if (f) e.appendChild(typeof f === 'string' ? document.createTextNode(f) : f); });
    return e;
  }
  const icones = {};
  const modeloIcones = document.getElementById('secao-icones');
  if (modeloIcones) modeloIcones.content.querySelectorAll('[data-cat]').forEach((s) => { icones[s.getAttribute('data-cat')] = s.firstElementChild; });

  // mesmo desenho do cartao gerado no HTML (modelos.mjs, cartao)
  function cartao(it) {
    if (!caminhoSeguro(it.u)) return null;
    const a = el('a', { className: 'news-card', href: it.u });
    const thumb = el('span', { className: 'thumb' });
    if (imagemSegura(it.i)) thumb.appendChild(el('img', { src: it.i, alt: '', loading: 'lazy' }));
    const tag = el('span', { className: 'tag' });
    if (icones[it.c]) tag.appendChild(icones[it.c].cloneNode(true));
    tag.appendChild(document.createTextNode(' ' + it.c));
    const corpo = el('span', { className: 'news-body' }, [tag, el('b', { className: 'news-title', textContent: it.t })]);
    if (it.r) corpo.appendChild(el('span', { className: 'news-excerpt', textContent: it.r }));
    if (it.dt) corpo.appendChild(el('small', { className: 'news-date', textContent: fmtData(it.dt) }));
    a.appendChild(thumb);
    a.appendChild(corpo);
    return a;
  }

  const escolhido = () => itensDoMenu.filter((b) => b.getAttribute('aria-pressed') === 'true' && b.getAttribute('data-v'))[0] || null; // nivel 1 (franquia, plataforma)
  const painelAberto = () => paineis.filter((p) => !p.hidden)[0] || null;
  const subEscolhido = () => { const p = painelAberto(); return p ? Array.prototype.filter.call(p.querySelectorAll('.secao-subitem'), (b) => b.getAttribute('aria-pressed') === 'true')[0] || null : null; }; // nivel 2 (jogo)
  function lerDaTela() {
    const e = { q: campo.value.slice(0, MAX_Q), f: {}, o: ordem && ordem.value === 'az' ? 'az' : 'recentes' };
    const item = escolhido();
    if (item) {
      e.f[grupo] = [item.getAttribute('data-v')];
      const sub = subEscolhido();
      if (sub) e.f.sub = [sub.getAttribute('data-v')];
    }
    return e;
  }
  function marcarItem(v) { // um item de cada vez; "" = o primeiro item do menu ("Todos"/"Todas")
    itensDoMenu.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-v') === v ? 'true' : 'false'));
    paineis.forEach((p) => { p.hidden = !v || p.getAttribute('data-pai') !== v; }); // so a franquia escolhida mostra a lista dos jogos dela
    itensDoMenu.forEach((b) => { if (b.hasAttribute('aria-expanded')) b.setAttribute('aria-expanded', b.getAttribute('data-v') === v ? 'true' : 'false'); });
    marcarSub('');
  }
  function marcarSub(v) { // um jogo de cada vez, dentro da franquia aberta; o item da franquia fica so com o contorno enquanto um jogo esta escolhido
    const p = painelAberto();
    subitens.forEach((b) => b.setAttribute('aria-pressed', p && b.parentNode === p && v && b.getAttribute('data-v') === v ? 'true' : 'false'));
    itensDoMenu.forEach((b) => b.classList.toggle('secao-pai', !!v && b.getAttribute('aria-pressed') === 'true'));
  }
  function pintar(e) {
    campo.value = e.q;
    marcarItem(e.f[grupo] && e.f[grupo][0] ? e.f[grupo][0] : '');
    if (e.f.sub && e.f.sub[0]) marcarSub(e.f.sub[0]);
    if (ordem) ordem.value = e.o;
  }
  // link para a pagina do que esta escolhido (na Wiki: a do jogo, ou a da franquia), logo acima dos resultados
  function mostrarVer() {
    const item = subEscolhido() || escolhido();
    const href = item ? item.getAttribute('data-href') : '';
    ver.textContent = '';
    if (item && href && caminhoSeguro(href)) {
      const nome = item.firstChild ? item.firstChild.textContent.trim() : '';
      ver.appendChild(el('a', { href: href, textContent: 'Ver a página de ' + nome + ' →' }));
      ver.hidden = false;
    } else ver.hidden = true;
  }
  function baixar() {
    if (dados) return Promise.resolve(dados);
    if (!baixando) {
      baixando = fetch(new URL(src, document.baseURI).href, { cache: 'default' })
        .then((r) => { if (!r.ok) throw new Error(src + ': ' + r.status); return r.json(); })
        .then((d) => { if (!d || !Array.isArray(d.itens)) throw new Error(src + ': formato inesperado'); dados = d.itens; return dados; })
        .catch((err) => { baixando = null; throw err; }); // falha nunca fica gravada: a proxima tentativa baixa de novo
    }
    return baixando;
  }
  const dizer = (t) => { status.textContent = t; };
  const contar = (n) => n + ' ' + (n === 1 ? um : varios);
  function mostrarLista(sim) {
    if (estatico) estatico.hidden = !sim;
    grade.hidden = sim;
    if (sim) { mais.hidden = true; ver.hidden = true; }
  }
  function resumo() {
    if (!atual.length) return 'Nenhum resultado.';
    return contar(atual.length) + (atual.length > mostrados ? ', mostrando os ' + mostrados + ' primeiros' : '');
  }
  function desenhar() {
    grade.textContent = '';
    mostrarLista(false);
    mostrarVer();
    if (!atual.length) {
      const jogo = subEscolhido();
      const aviso = jogo && !textoValido(campo.value) ? 'Ainda não há conteúdo de ' + jogo.firstChild.textContent.trim() + ' aqui. Em breve.' : menu ? 'Nada encontrado. Tente outras palavras ou outra opção do menu.' : 'Nada encontrado. Tente outras palavras.';
      const p = el('p', { className: 'busca-aviso', textContent: aviso });
      p.style.gridColumn = '1 / -1';
      grade.appendChild(p);
      mais.hidden = true;
    } else {
      atual.slice(0, mostrados).forEach((it) => { const c = cartao(it); if (c) grade.appendChild(c); });
      mais.hidden = atual.length <= mostrados;
    }
    dizer(resumo());
  }
  function falhou() {
    status.textContent = '';
    status.appendChild(document.createTextNode('Não deu para carregar a busca. '));
    status.appendChild(el('button', { type: 'button', className: 'sr-retry', textContent: 'Tentar de novo', onclick: aplicar }));
  }
  function aplicar() {
    clearTimeout(espera);
    const e = lerDaTela();
    try { history.replaceState(null, '', window.location.pathname + escreverEstado(e, grupos) + window.location.hash); } catch (err) { /* sem historico (ex.: previa): segue sem guardar na URL */ }
    if (!ativo(e)) { rodada++; atual = []; mostrarLista(true); dizer(''); return; }
    const minha = ++rodada;
    dizer('Buscando…');
    baixar().then((itens) => {
      if (minha !== rodada) return;
      atual = ordenar(filtrar(itens, e), e.o);
      mostrados = PASSO;
      desenhar();
    }).catch(() => { if (minha === rodada) falhou(); });
  }

  form.addEventListener('submit', (ev) => { ev.preventDefault(); aplicar(); });
  campo.addEventListener('input', () => { clearTimeout(espera); espera = setTimeout(aplicar, ESPERA_DIGITANDO); });
  campo.addEventListener('search', aplicar); // o "x" nativo do campo de busca
  if (menu) {
    menu.addEventListener('click', (ev) => {
      const alvo = ev.target.closest ? ev.target : null;
      const sub = alvo ? alvo.closest('.secao-subitem') : null;
      const topo = alvo ? alvo.closest('.secao-item') : null;
      if (sub) { marcarSub(sub.getAttribute('aria-pressed') === 'true' ? '' : sub.getAttribute('data-v')); aplicar(); return; } // clicar no jogo ja escolhido volta para a franquia
      if (!topo) return;
      const v = topo.getAttribute('data-v');
      if (v && topo.getAttribute('aria-pressed') === 'true' && subEscolhido()) marcarSub(''); // franquia com um jogo escolhido: volta para a franquia inteira
      else marcarItem(v && topo.getAttribute('aria-pressed') !== 'true' ? v : ''); // senao abre a franquia; clicar de novo nela (ou em "Todos") volta para tudo
      aplicar();
    });
  }
  if (ordem) ordem.addEventListener('change', aplicar);
  maisBotao.addEventListener('click', () => {
    const antes = mostrados;
    mostrados += PASSO;
    const novos = atual.slice(antes, mostrados).map(cartao).filter(Boolean);
    novos.forEach((c) => grade.appendChild(c));
    mais.hidden = atual.length <= mostrados;
    dizer(resumo());
    if (novos[0]) novos[0].focus(); // o botao pode sumir: o foco vai para o primeiro cartao novo
  });
  // baixa os dados assim que a pessoa mexe no formulario ou no menu (a primeira busca ja responde na hora)
  const adiantar = () => { baixar().catch(() => {}); };
  form.addEventListener('focusin', adiantar, { once: true });
  if (menu) menu.addEventListener('pointerenter', adiantar, { once: true });

  // abre a pagina com a busca na URL (link compartilhado): so vale o item que existe no menu desta pagina
  const inicial = lerEstado(window.location.search, grupos);
  if (grupo && inicial.f[grupo]) {
    const validos = itensDoMenu.map((b) => b.getAttribute('data-v'));
    inicial.f[grupo] = inicial.f[grupo].filter((v) => v && validos.indexOf(v) >= 0).slice(0, 1);
    if (!inicial.f[grupo].length) delete inicial.f[grupo];
  }
  if (inicial.f.sub) { // o jogo da URL precisa existir na franquia escolhida
    const painel = paineis.filter((p) => inicial.f[grupo] && p.getAttribute('data-pai') === inicial.f[grupo][0])[0];
    const validosSub = painel ? Array.prototype.map.call(painel.querySelectorAll('.secao-subitem'), (b) => b.getAttribute('data-v')) : [];
    inicial.f.sub = inicial.f.sub.filter((v) => validosSub.indexOf(v) >= 0).slice(0, 1);
    if (!inicial.f.sub.length) delete inicial.f.sub;
  }
  if (!ordem) inicial.o = 'recentes';
  form.hidden = false;
  if (menu) { menu.hidden = false; layout.classList.add('com-menu'); }
  pintar(inicial);
  if (ativo(inicial)) aplicar();
})();
