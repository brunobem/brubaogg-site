/* AO VIVO AGORA (fase 8): quando o canal esta em live, a home mostra, abaixo do carrossel, o player da live (a esquerda) e o chat (a direita),
 *  com o botao "Participe do chat", que leva para a live no YouTube. Sem live, este arquivo nao mostra nada.
 *  Quem sabe se ha live e o VIGIA (uma funcao separada na Cloudflare: _ferramentas/cloudflare/ao-vivo/). A caixa <div id="ao-vivo"> da home traz o
 *  endereco dele (data-vigia) e o do chat (data-chat); os dois vem de AO_VIVO, em _ferramentas/gerador/config.mjs.
 *   - pergunta ao vigia ao abrir a pagina e de minuto em minuto: a live aparece e some sozinha, sem recarregar;
 *   - o player usa o ID que o vigia devolve (so 11 letras, numeros, "-" e "_") e comeca MUDO: navegador nao deixa tocar som sozinho;
 *   - o player so e carregado quando mais da metade dele esta na tela (regra do YouTube para tocar sozinho);
 *   - resposta "ao vivo" gravada ha mais de 15 minutos e tratada como velha: melhor esconder do que mostrar uma live que acabou;
 *   - todo texto vindo de fora (o titulo da live) entra com textContent.
 *  Teste sem live: so no localhost, abrir a home com ?ao-vivo=teste (usa um video comum do canal no lugar da live). */
(function () {
  'use strict';
  var caixa = document.getElementById('ao-vivo');
  if (!caixa || !window.fetch) return;
  var vigia = caixa.getAttribute('data-vigia') || '', chat = caixa.getAttribute('data-chat') || '';
  var ID = /^[A-Za-z0-9_-]{11}$/, VELHA = 15 * 60 * 1000, atual = '';
  var deTeste = /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname) && /[?&]ao-vivo=teste(&|$)/.test(window.location.search);
  if (!/^https:\/\/[a-z0-9-]+\.[a-z0-9-]+\.workers\.dev\/$/.test(vigia) && !deTeste) return; // so o endereco do vigia; qualquer outra coisa, nao pergunta
  if (!/^https:\/\/live\.brubaogg\.com\.br\//.test(chat)) chat = ''; // so o chat do proprio canal

  function el(tag, classe, texto) { var n = document.createElement(tag); if (classe) n.className = classe; if (texto) n.textContent = texto; return n; }

  function desmontar() { atual = ''; caixa.hidden = true; caixa.textContent = ''; }

  function montar(d) {
    atual = d.id;
    caixa.textContent = '';
    caixa.setAttribute('role', 'region');
    caixa.setAttribute('aria-label', 'Ao vivo agora');

    var cab = el('div');
    cab.className = 'ao-vivo-cab';
    var ponto = el('span');
    ponto.className = 'ao-vivo-ponto';
    ponto.setAttribute('aria-hidden', 'true');
    var titulo = el('span', '', d.titulo || '');
    titulo.className = 'ao-vivo-titulo';
    var botao = el('a', '', 'Participe do chat');
    botao.className = 'btn primary';
    botao.href = 'https://www.youtube.com/watch?v=' + d.id;
    botao.target = '_blank';
    botao.rel = 'noopener';
    cab.appendChild(ponto);
    cab.appendChild(el('b', '', 'AO VIVO AGORA'));
    cab.appendChild(titulo);
    cab.appendChild(botao);

    var corpo = el('div');
    corpo.className = 'ao-vivo-corpo';
    if (!chat) corpo.className = 'ao-vivo-corpo sem-chat';
    var tela = el('div');
    tela.className = 'ao-vivo-tela';
    var player = document.createElement('iframe');
    player.title = 'Live do BRUBAOGG no YouTube';
    player.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    player.setAttribute('allowfullscreen', '');
    var endereco = 'https://www.youtube-nocookie.com/embed/' + d.id + '?autoplay=1&mute=1&playsinline=1';
    tela.appendChild(player);
    corpo.appendChild(tela);

    if (chat) {
      var lado = el('div');
      lado.className = 'ao-vivo-chat';
      var quadro = document.createElement('iframe');
      quadro.title = 'Chat da live';
      quadro.setAttribute('sandbox', 'allow-scripts allow-same-origin'); // o chat roda, mas nao navega a pagina nem abre janela
      quadro.setAttribute('loading', 'lazy');
      quadro.src = chat;
      lado.appendChild(quadro);
      corpo.appendChild(lado);
    }

    caixa.appendChild(cab);
    caixa.appendChild(corpo);
    caixa.hidden = false;

    // toca sozinho so com mais da metade do player na tela
    if (window.IntersectionObserver) {
      var olho = new window.IntersectionObserver(function (itens) {
        if (itens[0] && itens[0].intersectionRatio >= 0.5) { player.src = endereco; olho.disconnect(); }
      }, { threshold: [0.5] });
      olho.observe(tela);
    } else player.src = endereco;
  }

  function aplicar(d) {
    var vale = !!d && d.aoVivo === true && ID.test(d.id || '') && !(d.gravado && d.agora && d.agora - d.gravado > VELHA);
    if (!vale) { if (atual) desmontar(); return; }
    if (d.id === atual) { var t = caixa.querySelector('.ao-vivo-titulo'); if (t) t.textContent = d.titulo || ''; return; }
    montar(d);
  }

  function perguntar() {
    if (deTeste) { aplicar({ aoVivo: true, id: 'yXOlfQDgKRY', titulo: 'Live de teste (só no localhost)' }); return; }
    window.fetch(vigia, { credentials: 'omit' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(aplicar)
      .catch(function () { /* vigia fora do ar: a home segue como sempre, sem o bloco */ });
  }

  perguntar();
  window.setInterval(function () { if (!document.hidden) perguntar(); }, 60000);
}());
