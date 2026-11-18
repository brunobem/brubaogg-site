/* Anuncio de verdade (Google AdSense) e o AVISO DE COOKIES que vem antes dele.
 *  Este arquivo SO entra na pagina quando a conta do AdSense esta preenchida e os anuncios estao ligados (ADS_CLIENTE, ADS_BLOCO e ADS_ATIVOS, em
 *  _ferramentas/gerador/config.mjs); quem escreve a tag e o gerador (gerador/anuncio.mjs), com data-cliente, data-bloco e data-privacidade.
 *
 *  A REGRA: o script do Google (e os cookies de publicidade que ele usa) so carrega DEPOIS que o visitante aceita. Segue o guia de cookies da ANPD
 *  (outubro de 2022): cookie de publicidade e "nao necessario", depende de aceite, vem desligado por padrao, e o aviso precisa de um "Rejeitar" tao
 *  visivel quanto o "Aceitar", de um segundo nivel para escolher e de um jeito facil de mudar a escolha depois (o link "Preferencias de cookies" do rodape).
 *   - sem escolha ainda ..... os espacos de anuncio ficam escondidos e o aviso aparece;
 *   - aceitou ............... carrega o script do Google e pede UM anuncio para cada espaco (data-pedido: pedir de novo o mesmo espaco e contra as regras do AdSense);
 *   - rejeitou .............. nada do Google carrega; os espacos somem e o site segue normal.
 *  A escolha fica guardada so no navegador do visitante (localStorage, chave "brubaogg-cookies"). O site nao define cookie proprio.
 *  Todo texto do aviso e escrito com textContent: nenhum texto de fora entra na pagina. */
(function () {
  'use strict';
  var eu = document.currentScript;
  var cliente = eu ? eu.getAttribute('data-cliente') || '' : '', bloco = eu ? eu.getAttribute('data-bloco') || '' : '';
  var privacidade = eu ? eu.getAttribute('data-privacidade') || '' : '';
  var CHAVE = 'brubaogg-cookies';
  var raiz = document.documentElement;

  function ler() { try { var v = window.localStorage.getItem(CHAVE); return v === 'aceito' || v === 'rejeitado' ? v : ''; } catch (e) { return ''; } }
  function gravar(v) { try { window.localStorage.setItem(CHAVE, v); } catch (e) { /* navegador sem armazenamento: a escolha vale so nesta pagina */ } }

  var escolha = ler(), googleCarregado = false;

  function carregarGoogle() {
    if (googleCarregado || !cliente) return;
    googleCarregado = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(cliente);
    document.head.appendChild(s);
  }
  function pedir(ins) {
    if (escolha !== 'aceito' || !ins || ins.getAttribute('data-pedido')) return;
    ins.setAttribute('data-pedido', '1');
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* sem o script do Google (bloqueador): o espaco fica vazio */ }
  }
  function criar() {
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle ads_bloco';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', cliente);
    ins.setAttribute('data-ad-slot', bloco);
    return ins;
  }
  function todos() { Array.prototype.forEach.call(document.querySelectorAll('ins.adsbygoogle'), pedir); }

  // aplica a escolha na pagina: sem aceite, os espacos de anuncio ficam escondidos (classe no <html>, regra em style.css)
  function aplicar() {
    if (escolha === 'aceito') { raiz.classList.remove('sem-anuncio'); carregarGoogle(); todos(); }
    else raiz.classList.add('sem-anuncio');
  }

  // ---- o aviso ----
  var aviso = null, detalhe = null, caixa = null, botaoEscolher = null;
  function el(tag, classe, texto) { var n = document.createElement(tag); if (classe) n.className = classe; if (texto) n.textContent = texto; return n; }
  function botao(texto, acao) { var b = el('button', 'btn', texto); b.type = 'button'; b.setAttribute('data-cookies', acao); return b; }

  function decidir(valor) {
    var mudouParaNao = escolha === 'aceito' && valor !== 'aceito';
    escolha = valor;
    gravar(valor);
    if (aviso) aviso.hidden = true;
    if (mudouParaNao && googleCarregado) { window.location.reload(); return; } // o script do Google ja rodou nesta pagina: so recarregando ele sai
    aplicar();
  }

  function montar() {
    if (aviso) return;
    aviso = el('div');
    aviso.className = 'cookies-aviso';
    aviso.setAttribute('role', 'dialog');
    aviso.setAttribute('aria-label', 'Aviso de cookies');
    var texto = el('p', '', 'Este site mostra anúncios do Google, que usam cookies de publicidade. Eles só são ativados se você aceitar. Rejeitando, o site funciona normalmente, sem anúncios. ');
    texto.className = 'cookies-texto';
    if (privacidade) { var saiba = el('a', '', 'Saiba mais'); saiba.href = privacidade; saiba.setAttribute('data-cookies-saiba', ''); texto.appendChild(saiba); }
    aviso.appendChild(texto);

    detalhe = el('div');
    detalhe.className = 'cookies-detalhe';
    detalhe.hidden = true;
    detalhe.appendChild(el('p', '', 'Necessário: o site guarda só a sua escolha neste aviso, no seu navegador. Não dá para desligar.'));
    var rotulo = el('label');
    rotulo.className = 'cookies-opcao';
    caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.id = 'cookies-publicidade';
    rotulo.appendChild(caixa);
    rotulo.appendChild(el('span', '', ' Publicidade: cookies do Google e de parceiros dele para mostrar anúncios. Desligado por padrão.'));
    detalhe.appendChild(rotulo);
    aviso.appendChild(detalhe);

    var botoes = el('div');
    botoes.className = 'cookies-botoes';
    botaoEscolher = botao('Escolher', 'escolher');
    botoes.appendChild(botao('Rejeitar', 'rejeitar'));
    botoes.appendChild(botaoEscolher);
    botoes.appendChild(botao('Aceitar', 'aceitar'));
    aviso.appendChild(botoes);

    aviso.addEventListener('click', function (ev) {
      var alvo = ev.target, acao = alvo && alvo.getAttribute ? alvo.getAttribute('data-cookies') : null;
      if (acao === 'aceitar') decidir('aceito');
      else if (acao === 'rejeitar') decidir('rejeitado');
      else if (acao === 'escolher') abrirEscolha();
      else if (acao === 'salvar') decidir(caixa.checked ? 'aceito' : 'rejeitado');
    });
    document.body.appendChild(aviso);
  }
  // segundo nivel: a categoria Publicidade, marcada so se a pessoa ja tinha aceitado
  function abrirEscolha() {
    montar();
    caixa.checked = escolha === 'aceito';
    detalhe.hidden = false;
    botaoEscolher.textContent = 'Salvar escolha';
    botaoEscolher.setAttribute('data-cookies', 'salvar');
    aviso.hidden = false;
    caixa.focus();
  }
  function mostrarAviso() {
    montar();
    detalhe.hidden = true;
    botaoEscolher.textContent = 'Escolher';
    botaoEscolher.setAttribute('data-cookies', 'escolher');
    aviso.hidden = false;
  }

  window.BrubaoAnuncio = { ativo: !!(cliente && bloco), criar: criar, pedir: pedir, escolha: function () { return escolha; }, abrirPreferencias: abrirEscolha };

  function comecar() {
    aplicar();
    if (!escolha) mostrarAviso();
    // o link "Preferencias de cookies" do rodape reabre a escolha em qualquer pagina (sem JavaScript, ele leva a pagina de privacidade)
    document.addEventListener('click', function (ev) {
      var a = ev.target && ev.target.closest ? ev.target.closest('a[data-cookies-preferencias]') : null;
      if (!a) return;
      ev.preventDefault();
      abrirEscolha();
    });
  }
  raiz.classList.add('sem-anuncio'); // ate a pagina terminar de carregar e a escolha ser lida, nenhum espaco de anuncio aparece
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', comecar); else comecar();
}());
