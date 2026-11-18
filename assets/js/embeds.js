// Posts de fora dentro do texto (X e Instagram): cada <aside class="embed-social"> traz o link "Abrir no X/Instagram" (funciona sem JavaScript) e uma caixa vazia (.embed-caixa) onde o
// post, com o video, e desenhado ja na abertura da pagina pelo script oficial da propria rede (platform.twitter.com / instagram.com/embed.js). O YouTube nao passa por aqui: usa a
// fachada (fachada.js). O ID e o endereco vem dos atributos data-id e data-url, escritos pelo gerador (paginas.mjs, embedHtml); nada de fora entra na pagina como HTML por este arquivo.
(function () {
  'use strict';
  const blocos = document.querySelectorAll('.embed-social[data-tipo]');
  if (!blocos.length) return;

  const scripts = {}; // cada script de rede e baixado uma vez so, para todos os posts da pagina
  function carregar(src) {
    if (scripts[src]) return scripts[src];
    scripts[src] = new Promise(function (ok, erro) {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = ok;
      s.onerror = function () { delete scripts[src]; erro(); };
      document.head.appendChild(s);
    });
    return scripts[src];
  }

  function falhou(bloco, nome) {
    bloco.classList.remove('carregando');
    const aviso = document.createElement('p');
    aviso.className = 'embed-aviso';
    aviso.textContent = 'Não foi possível mostrar o post aqui (ele pode ter sido apagado ou o ' + nome + ' pode estar fora do ar). Use "Abrir no ' + nome + '".';
    bloco.querySelector('.embed-caixa').appendChild(aviso);
  }

  function pronto(bloco) { bloco.classList.remove('carregando'); }

  function post_x(bloco, caixa) {
    carregar('https://platform.twitter.com/widgets.js').then(function () {
      const t = window.twttr;
      return new Promise(function (ok) { if (t && t.ready) t.ready(ok); else ok(t); });
    }).then(function (t) {
      return t.widgets.createTweet(bloco.getAttribute('data-id'), caixa, { theme: 'dark', lang: 'pt', dnt: true, conversation: 'none', align: 'center' });
    }).then(function (el) {
      if (el) pronto(bloco); else falhou(bloco, 'X'); // post apagado ou privado: createTweet devolve vazio
    }).catch(function () { falhou(bloco, 'X'); });
  }

  function post_instagram(bloco, caixa) {
    const q = document.createElement('blockquote');
    q.className = 'instagram-media';
    q.setAttribute('data-instgrm-permalink', bloco.getAttribute('data-url'));
    q.setAttribute('data-instgrm-version', '14');
    caixa.appendChild(q);
    carregar('https://www.instagram.com/embed.js').then(function () {
      if (window.instgrm && window.instgrm.Embeds) window.instgrm.Embeds.process(q);
      pronto(bloco);
    }).catch(function () { caixa.removeChild(q); falhou(bloco, 'Instagram'); });
  }

  blocos.forEach(function (bloco) {
    const caixa = bloco.querySelector('.embed-caixa');
    if (!caixa) return;
    bloco.classList.add('carregando'); // reserva o espaco do post enquanto ele carrega (a pagina nao pula quando ele chega)
    const tipo = bloco.getAttribute('data-tipo');
    if (tipo === 'x') post_x(bloco, caixa);
    else if (tipo === 'instagram') post_instagram(bloco, caixa);
  });
})();
