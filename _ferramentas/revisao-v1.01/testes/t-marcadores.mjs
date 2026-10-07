// Paginas escritas a mao: o que acontece quando alguem mexe nos marcadores (<!--site:header-->...) ou cria uma pagina nova.
// Cada cenario roda numa copia. Esperado: o gerador PARA com uma mensagem que cita a pagina e o marcador; nunca segue em silencio com a pagina pela metade.
// Lento (~10 s): so roda com --so=marcadores.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { achado, raiz } from './lib.mjs';

const T = 'marcadores';
const copiar = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-marc-'));
  fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (s) => !/node_modules|[\\/]\.git([\\/]|$)/.test(s) });
  return tmp;
};
const gerar = (tmp) => {
  const r = spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', timeout: 60000 });
  return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
};

export default async function () {
  const a = [];
  const cenarios = [
    { n: 'falta o fechamento do marcador do cabecalho', pg: 'termos.html', muda: (t) => t.replace('<!--/site:header-->', ''), cita: ['termos.html', 'site:header'] },
    { n: 'falta o rodape inteiro (abertura e fechamento)', pg: 'termos.html', muda: (t) => t.replace(/<!--site:footer-->[\s\S]*?<!--\/site:footer-->/, ''), cita: ['termos.html', 'site:footer'] },
    { n: 'cabecalho repetido (dois pares de marcadores)', pg: 'cortes.html', muda: (t) => t.replace('<main', '<!--site:header--><!--/site:header-->\n<main'), cita: ['cortes.html', 'site:header'] },
    { n: 'marcador de icone com nome que nao existe', pg: 'cortes.html', muda: (t) => t.replace('<main', '<!--icone:naoexiste--><!--/icone--><main'), cita: ['cortes.html', 'naoexiste'] },
    { n: 'home sem os marcadores do feed', pg: 'index.html', muda: (t) => t.replace(/<!--feed:inicio-->[\s\S]*?<!--feed:fim-->/, ''), cita: ['index.html', 'feed'] },
    { n: 'GTA 6 sem os marcadores das novidades', pg: 'gta6.html', muda: (t) => t.replace(/<!--gta6:inicio-->[\s\S]*?<!--gta6:fim-->/, ''), cita: ['gta6.html', 'gta6'] },
    { n: 'aba de player sem a lista de chips', pg: 'cortes.html', muda: (t) => t.replace(/<ul class="chips">[\s\S]*?<\/ul>/, ''), cita: ['cortes.html', 'chips'], aviso: true },
    { n: 'pagina nova escrita a mao SEM marcadores', novo: ['sobre.html', '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Sobre</title></head><body><main><h1>Sobre</h1></main></body></html>'], cita: ['sobre.html', 'marcador'] },
  ];
  for (const c of cenarios) {
    const tmp = copiar();
    try {
      if (c.pg) { const f = path.join(tmp, c.pg); fs.writeFileSync(f, c.muda(fs.readFileSync(f, 'utf8'))); }
      if (c.novo) fs.writeFileSync(path.join(tmp, c.novo[0]), c.novo[1]);
      const r = gerar(tmp);
      const nome = `[${c.n}]`;
      const citaTudo = c.cita.every((x) => r.saida.includes(x));
      if (c.aviso) { if (r.status === 0 && !citaTudo) a.push(achado('medio', T, `${nome} o gerador seguiu em silencio (deveria avisar na saida)`)); continue; }
      if (r.status === 0) a.push(achado('alto', T, `${nome} o gerador seguiu em silencio e a pagina ficou ${c.pg ? 'sem a parte gerada (ou com ela desatualizada)' : 'sem cabecalho e rodape'}`));
      else if (!citaTudo) a.push(achado('medio', T, `${nome} o gerador parou, mas a mensagem nao diz a pagina e o marcador (esperado: ${c.cita.join(' + ')}): "${r.saida.split('\n')[0].slice(0, 100)}"`));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // edicao manual dentro dos marcadores: deve ser sobrescrita (e o que o README promete)
  {
    const tmp = copiar();
    try {
      const f = path.join(tmp, 'termos.html'); const antes = fs.readFileSync(f, 'utf8');
      fs.writeFileSync(f, antes.replace('<!--site:footer-->', '<!--site:footer--><p>EDITADO A MAO</p>'));
      gerar(tmp);
      if (fs.readFileSync(f, 'utf8').includes('EDITADO A MAO')) a.push(achado('medio', T, '[edicao dentro dos marcadores] o texto editado a mao sobreviveu (deveria ser sobrescrito pelo gerador)'));
      // CRLF (editores do Windows): o gerador precisa continuar estavel
      fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace(/\n/g, '\r\n'));
      gerar(tmp); const dep1 = fs.readFileSync(f, 'utf8'); gerar(tmp);
      if (fs.readFileSync(f, 'utf8') !== dep1) a.push(achado('medio', T, '[arquivo com quebras de linha do Windows] o gerador nao fica estavel (rodar de novo muda o arquivo)'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  a.push(achado('info', T, `${cenarios.length + 2} cenarios de marcadores rodados em copias`));
  return a;
}
