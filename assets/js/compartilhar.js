// Botoes de compartilhar da materia (a secao .compartilhar, no fim do texto). WhatsApp e Telegram ja sao links comuns no HTML e funcionam sem JavaScript; aqui so se
// mostram os dois que dependem do navegador: "Copiar link" (area de transferencia) e "Mais opcoes" (a folha de compartilhamento do celular, navigator.share, so em
// tela de toque). Compartilha o endereco do canonical e o titulo do h1. Sem script de terceiros e sem innerHTML.
'use strict';
(function () {
  var bloco = document.querySelector('.compartilhar');
  if (!bloco) return;
  var copiar = bloco.querySelector('[data-copiar]');
  var nativo = bloco.querySelector('[data-compartilhar]');
  var aviso = bloco.querySelector('.compartilhar-aviso');
  var espera = 0;

  function endereco() {
    var c = document.querySelector('link[rel="canonical"]');
    return (c && c.getAttribute('href')) || window.location.href.split('#')[0];
  }
  function titulo() {
    var h = document.querySelector('h1');
    return h ? h.textContent.trim() : document.title;
  }
  // o aviso fica num role="status" (o leitor de tela le) e some sozinho
  function dizer(texto) {
    if (!aviso) return;
    aviso.textContent = texto;
    clearTimeout(espera);
    espera = setTimeout(function () { aviso.textContent = ''; }, 4000);
  }
  // navegador sem a API moderna da area de transferencia: campo invisivel selecionado + execCommand
  function copiarPeloCampo(texto) {
    var campo = document.createElement('textarea');
    campo.className = 'sr-only';
    campo.value = texto;
    campo.setAttribute('readonly', '');
    document.body.appendChild(campo);
    campo.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(campo);
    return ok;
  }
  function copiouOuAvisa(ok) {
    dizer(ok ? 'Link copiado.' : 'Não foi possível copiar.');
  }

  if (copiar) {
    copiar.hidden = false;
    copiar.addEventListener('click', function () {
      var url = endereco();
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(url).then(function () { copiouOuAvisa(true); }, function () { copiouOuAvisa(copiarPeloCampo(url)); });
      } else {
        copiouOuAvisa(copiarPeloCampo(url));
      }
    });
  }

  var toque = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (nativo && typeof navigator.share === 'function' && toque) {
    nativo.hidden = false;
    nativo.addEventListener('click', function () {
      try {
        var p = navigator.share({ title: titulo(), url: endereco() });
        if (p && typeof p.catch === 'function') p.catch(function () {}); // fechar a folha sem escolher tambem chega aqui: nao e erro
      } catch (e) { /* sem o que fazer: os links de WhatsApp e Telegram continuam ali */ }
    });
  }
})();
