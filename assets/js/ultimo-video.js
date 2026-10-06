// Mostra na home o ultimo video de Noticia ou Review (dados em assets/data/ultimo-video.json,
// gerados por _ferramentas/atualizar-videos.mjs). Sem o arquivo, a secao continua escondida.
(function () {
  var secao = document.getElementById('latest');
  if (!secao) return;

  fetch('assets/data/ultimo-video.json', { cache: 'no-cache' })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
    .then(function (v) {
      if (!v || !/^[\w-]{11}$/.test(v.id)) return;
      document.getElementById('lv-kind').textContent = v.kind === 'Review' ? 'Review' : 'Notícia';
      document.getElementById('lv-title').textContent = v.title || '';

      var d = new Date(v.published);
      if (!isNaN(d)) {
        document.getElementById('lv-date').textContent =
          'Publicado em ' + d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' });
      }

      var frame = document.getElementById('lv-frame');
      if (v.short) frame.classList.add('is-short');
      var f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + v.id;
      f.title = v.title || 'Último vídeo';
      f.loading = 'lazy';
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      f.allow = 'accelerometer; encrypted-media; picture-in-picture; fullscreen';
      f.allowFullscreen = true;
      frame.appendChild(f);

      document.getElementById('lv-link').href = 'https://www.youtube.com/watch?v=' + v.id;
      secao.hidden = false;
    })
    .catch(function () { /* sem arquivo: a secao fica escondida */ });
})();
