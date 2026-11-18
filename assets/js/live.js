// Bloco da live (home). O site e estatico e nao sabe se a live comecou: o bloco usa as janelas de horario do config (horario de Brasilia).
// Dentro da janela mostra a live (o player do YouTube so e carregado quando a pessoa clica); fora dela, se houver horarios, mostra a proxima.
// Previa: abra a home com ?live=1 no endereco para ver o bloco como se a live estivesse no ar.
// Sem innerHTML. Funcoes puras em window.BrubaoLive (usadas nos testes).
'use strict';
(function () {
  var DIAS = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
  var SEMANA = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var HORA = /^\d{1,2}:\d{2}$/;

  function minutos(hhmm) { var p = String(hhmm).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function hora(hhmm) { var p = hhmm.split(':'); return p[1] === '00' ? Number(p[0]) + 'h' : Number(p[0]) + 'h' + p[1]; }

  // dia da semana (0 = domingo) e minutos desde 00:00, no horario de Brasilia, para um instante qualquer
  function emBrasilia(data) {
    var v = {};
    new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
      .formatToParts(data).forEach(function (p) { v[p.type] = p.value; });
    return { dia: SEMANA.indexOf(v.weekday), min: Number(v.hour) * 60 + Number(v.minute) };
  }

  // { aoVivo, proxima: { em (dias a frente), dia, inicio } | null }
  function estado(data, lista) {
    var a = emBrasilia(data);
    var janelas = (Array.isArray(lista) ? lista : []).filter(function (j) { return j && Array.isArray(j.dias) && HORA.test(j.inicio) && HORA.test(j.fim); });
    for (var i = 0; i < janelas.length; i++) {
      var j = janelas[i];
      if (j.dias.indexOf(a.dia) >= 0 && a.min >= minutos(j.inicio) && a.min < minutos(j.fim)) return { aoVivo: true, proxima: null };
    }
    for (var d = 0; d <= 7; d++) {
      var dia = (a.dia + d) % 7;
      var inicios = janelas.filter(function (x) { return x.dias.indexOf(dia) >= 0; }).map(function (x) { return x.inicio; })
        .sort(function (x, y) { return minutos(x) - minutos(y); });
      for (var k = 0; k < inicios.length; k++) if (d > 0 || minutos(inicios[k]) > a.min) return { aoVivo: false, proxima: { em: d, dia: dia, inicio: inicios[k] } };
    }
    return { aoVivo: false, proxima: null };
  }

  function textoProxima(p) {
    return (p.em === 0 ? 'hoje' : p.em === 1 ? 'amanhã' : DIAS[p.dia]) + ' às ' + hora(p.inicio);
  }

  window.BrubaoLive = { estado: estado, textoProxima: textoProxima };

  var secao = document.getElementById('live');
  if (!secao) return;
  var lista = [];
  try { lista = JSON.parse(secao.getAttribute('data-janelas') || '[]'); } catch (e) { lista = []; }
  var canal = secao.getAttribute('data-canal') || '';
  var kicker = secao.querySelector('.live-kicker');
  var texto = secao.querySelector('.live-texto');
  var palco = secao.querySelector('.live-palco');
  var fora = secao.querySelector('.live-fora');
  var proxima = secao.querySelector('.live-proxima');
  var proximaTxt = proxima && proxima.querySelector('b');
  var botao = secao.querySelector('.live-play');
  var previa = /[?&]live=1(&|$)/.test(location.search);

  function mostrar() {
    if (palco.classList.contains('live-ativo')) return; // a live ja esta tocando: nao mexe
    var e = estado(new Date(), lista);
    var aoVivo = e.aoVivo || previa;
    secao.hidden = !(aoVivo || e.proxima);
    kicker.hidden = texto.hidden = palco.hidden = fora.hidden = !aoVivo;
    proxima.hidden = aoVivo || !e.proxima;
    if (!aoVivo && e.proxima) proximaTxt.textContent = textoProxima(e.proxima);
  }

  if (botao) botao.addEventListener('click', function () {
    if (!canal) return;
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/live_stream?channel=' + encodeURIComponent(canal) + '&autoplay=1';
    f.title = 'Live do Brubão no YouTube';
    f.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    palco.textContent = '';
    palco.appendChild(f);
    palco.classList.add('live-ativo');
  });

  mostrar();
  setInterval(mostrar, 60000);
})();
