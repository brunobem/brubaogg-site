(function () {
  var form = document.querySelector('form.search');
  if (!form) return;
  var base = form.getAttribute('data-base') || '';
  var input = form.querySelector('input');
  var box = form.querySelector('.search-results');
  var index = null, loading = null, active = -1;

  function norm(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  }
  // chave para comparar titulos: sem acento, sem pontuacao, espacos unicos
  function chave(s) {
    return norm(s).replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function load() {
    if (index) return Promise.resolve(index);
    if (!loading) {
      loading = fetch(base + 'assets/data/busca.json')
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; })
        .then(function (d) {
          d.forEach(function (e) {
            e._t = norm(e.t);
            e._k = chave(e.t);
            e._h = norm(e.t + ' ' + (e.d || '') + ' ' + (e.x || ''));
          });
          index = d;
          return d;
        });
    }
    return loading;
  }

  function search(q, limit) {
    var toks = norm(q).split(/\s+/).filter(Boolean);
    if (!toks.length) return [];
    var out = [];
    index.forEach(function (e) {
      var score = 0;
      for (var i = 0; i < toks.length; i++) {
        if (e._h.indexOf(toks[i]) === -1) return;
        score += e._t.indexOf(toks[i]) !== -1 ? 3 : 1;
      }
      out.push({ score: score, e: e });
    });
    out.sort(function (a, b) {
      return b.score - a.score || String(b.e.date || '').localeCompare(String(a.e.date || ''));
    });
    var lista = out.map(function (x) { return x.e; });
    return limit ? lista.slice(0, limit) : lista;
  }

  function fmt(iso) {
    var d = new Date(iso);
    return isNaN(d) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function linhaResultado(e) {
    var a = document.createElement('a');
    a.href = base + e.u;
    if (e.img) {
      var img = document.createElement('img');
      img.src = e.img; img.alt = ''; img.loading = 'lazy';
      a.appendChild(img);
    }
    var txt = document.createElement('span');
    txt.className = 'sr-txt';
    var b = document.createElement('b');
    b.textContent = e.t;
    var s = document.createElement('small');
    s.textContent = e.c + (e.date ? ' · ' + fmt(e.date) : '');
    txt.appendChild(b);
    txt.appendChild(s);
    a.appendChild(txt);
    return a;
  }

  function paginaResultados(q) {
    return base + 'busca.html?q=' + encodeURIComponent(q);
  }

  /* ---------- sugestoes (caixa abaixo da barra) ---------- */
  function open(on) {
    box.hidden = !on;
    input.setAttribute('aria-expanded', on ? 'true' : 'false');
    if (!on) active = -1;
  }

  function mark() {
    box.querySelectorAll('a').forEach(function (a, i) {
      a.classList.toggle('on', i === active);
      a.setAttribute('aria-selected', i === active ? 'true' : 'false');
    });
  }

  function render(q) {
    box.textContent = '';
    active = -1;
    if (!q.trim()) { open(false); return; }
    var achados = search(q, 5);
    if (!achados.length) {
      var p = document.createElement('p');
      p.className = 'sr-empty';
      p.textContent = 'Nenhum resultado para "' + q.trim() + '".';
      box.appendChild(p);
      open(true);
      return;
    }
    achados.forEach(function (e) {
      var a = linhaResultado(e);
      a.setAttribute('role', 'option');
      box.appendChild(a);
    });
    var todos = document.createElement('a');
    todos.href = paginaResultados(q.trim());
    todos.className = 'sr-all';
    todos.setAttribute('role', 'option');
    todos.textContent = 'Ver todos os resultados para "' + q.trim() + '"';
    box.appendChild(todos);
    open(true);
  }

  input.addEventListener('focus', function () { load().then(function () { render(input.value); }); });
  input.addEventListener('input', function () { load().then(function () { render(input.value); }); });

  input.addEventListener('keydown', function (ev) {
    var n = box.querySelectorAll('a').length;
    if (ev.key === 'ArrowDown' && n) { ev.preventDefault(); active = (active + 1) % n; mark(); }
    else if (ev.key === 'ArrowUp' && n) { ev.preventDefault(); active = (active - 1 + n) % n; mark(); }
    else if (ev.key === 'Escape') { open(false); input.blur(); }
  });

  // Enter: sugestao escolhida -> vai para ela; titulo igual ao digitado -> vai para a materia;
  // caso contrario -> pagina com a lista de titulos que combinam
  form.addEventListener('submit', function (ev) {
    ev.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    var escolhida = active >= 0 ? box.querySelectorAll('a')[active] : null;
    if (escolhida) { window.location.href = escolhida.href; return; }
    load().then(function () {
      var k = chave(q);
      var exato = index.filter(function (e) { return e._k === k; })[0];
      window.location.href = exato ? base + exato.u : paginaResultados(q);
    });
  });

  document.addEventListener('click', function (ev) { if (!form.contains(ev.target)) open(false); });

  /* ---------- pagina de resultados (busca.html) ---------- */
  var lista = document.getElementById('busca-resultados');
  if (lista) {
    var q = new URLSearchParams(window.location.search).get('q') || '';
    var contagem = document.getElementById('busca-contagem');
    input.value = q;
    document.title = (q ? 'Busca: ' + q : 'Busca') + ' | BRUBAOGG';
    load().then(function () {
      if (!q.trim()) { contagem.textContent = 'Digite um termo na barra de busca.'; return; }
      var achados = search(q);
      if (!achados.length) {
        contagem.textContent = 'Nenhum resultado para "' + q + '". Tente outra palavra.';
        return;
      }
      contagem.textContent = achados.length + (achados.length === 1 ? ' resultado' : ' resultados') + ' para "' + q + '"';
      achados.forEach(function (e) {
        var li = document.createElement('li');
        li.appendChild(linhaResultado(e));
        lista.appendChild(li);
      });
    });
  }
})();
