/* Anuncio de verdade (Google AdSense) dentro dos espacos reservados (.ads).
 *  Este arquivo SO entra na pagina quando a conta do AdSense esta preenchida e os anuncios estao ligados (ADS_CLIENTE, ADS_BLOCO e ADS_ATIVOS, em
 *  _ferramentas/gerador/config.mjs); quem escreve a tag e o gerador (gerador/anuncio.mjs), com data-cliente e data-bloco. Sem isso, o site nem o carrega.
 *  O que faz: pede UM anuncio ao Google para cada espaco que ja veio no HTML e oferece criar/pedir para os espacos que o ads.js coloca nas listas.
 *  Cada espaco e pedido uma vez so (data-pedido): pedir de novo o mesmo espaco e contra as regras do AdSense.
 *  Com bloqueador de anuncio o script do Google nao carrega: o espaco fica vazio, com a altura reservada, e nada quebra. */
(function () {
  'use strict';
  var eu = document.currentScript;
  var cliente = eu ? eu.getAttribute('data-cliente') || '' : '', bloco = eu ? eu.getAttribute('data-bloco') || '' : '';

  function pedir(ins) {
    if (!ins || ins.getAttribute('data-pedido')) return;
    ins.setAttribute('data-pedido', '1');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* sem o script do Google: o espaco fica vazio */ }
  }
  function criar() {
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle ads_bloco';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', cliente);
    ins.setAttribute('data-ad-slot', bloco);
    return ins;
  }
  window.BrubaoAnuncio = { ativo: !!(cliente && bloco), criar: criar, pedir: pedir };

  function todos() { Array.prototype.forEach.call(document.querySelectorAll('ins.adsbygoogle'), pedir); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', todos); else todos();
}());
