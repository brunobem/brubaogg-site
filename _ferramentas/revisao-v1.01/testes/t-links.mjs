// Links e arquivos: tudo que as paginas, o CSS e o JS referenciam existe, com a MESMA caixa de letras que o servidor do GitHub (Linux) exige.
import fs from 'node:fs';
import path from 'node:path';
import { achado, arquivosPublicados, existeExato, limparHtml, ler, raiz, tags, decodificar } from './lib.mjs';

const T = 'links';
const EXTERNO = /^(https?:|\/\/|mailto:|tel:|data:|javascript:|#)/i;

function resolver(origemRel, alvo) {
  const limpo = decodificar(alvo).split('#')[0].split('?')[0];
  if (!limpo) return null;
  const base = limpo.startsWith('/') ? limpo.slice(1) : path.posix.normalize(path.posix.join(path.posix.dirname(origemRel), limpo));
  return base.replace(/\/$/, '') + (limpo.endsWith('/') ? '/index.html' : '');
}

export default async function () {
  const a = [];
  const publicados = arquivosPublicados();
  let verificados = 0;

  const checar = (origem, alvo, como) => {
    if (EXTERNO.test(alvo.trim())) return;
    const rel = resolver(origem, alvo.trim());
    if (!rel) return;
    verificados++;
    const r = existeExato(rel);
    if (r === 'nao') a.push(achado('alto', T, `${como} aponta para um arquivo que nao existe: ${alvo}`, origem));
    else if (r === 'caixa') a.push(achado('alto', T, `${como} usa maiusculas/minusculas diferentes do arquivo real (funciona no Windows, da 404 no GitHub): ${alvo}`, origem));
    else if (!/\.[a-z0-9]+$/i.test(rel) && !rel.endsWith('/')) a.push(achado('baixo', T, `link interno sem extensao: ${alvo}`, origem));
  };

  // HTML
  for (const rel of publicados.filter((r) => r.endsWith('.html'))) {
    const html = limparHtml(ler(rel));
    for (const t of tags(html)) {
      if (t.fecha) continue;
      for (const k of ['href', 'src', 'poster', 'data-src']) if (t.attrs[k] != null) checar(rel, t.attrs[k], `<${t.nome} ${k}>`);
      if (t.attrs.srcset) for (const parte of t.attrs.srcset.split(',')) checar(rel, parte.trim().split(/\s+/)[0], `<${t.nome} srcset>`);
    }
  }
  // CSS: url(...) relativo ao proprio arquivo
  for (const rel of publicados.filter((r) => r.endsWith('.css'))) {
    for (const m of ler(rel).matchAll(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g)) checar(rel, m[2], 'url() do CSS');
  }
  // JS: caminhos "assets/..." escritos no codigo (arquivos de dados, imagens)
  for (const rel of publicados.filter((r) => r.endsWith('.js'))) {
    for (const m of ler(rel).matchAll(/['"`]((?:\.{0,2}\/)?assets\/[\w./-]+)['"`]/g)) {
      // "assets/data/lista/" (termina em barra) e o comeco de um caminho montado no codigo: confere que a PASTA existe
      if (m[1].endsWith('/') && /assets\/data\/colecao\/$/.test(m[1])) continue; // so existe quando alguma lista passa de 30 itens (o gerador cria sob demanda)
      if (m[1].endsWith('/')) { verificados++; if (existeExato(m[1].replace(/^\.{0,2}\//, '').replace(/\/$/, '')) === 'nao') a.push(achado('alto', T, `pasta no JS nao existe: ${m[1]}`, rel)); continue; }
      checar(rel.startsWith('assets/') ? 'index.html' : rel, m[1], 'caminho no JS');
    }
  }
  // sitemap
  if (fs.existsSync(path.join(raiz, 'sitemap.xml'))) {
    for (const m of ler('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)) {
      const u = m[1].replace(/^https:\/\/brubaogg\.com\.br\/?/, '');
      checar('index.html', u === '' ? 'index.html' : u, 'URL do sitemap');
    }
  }

  // nomes de arquivo: minusculo, sem espaco nem acento (regra do plano). CNAME e a unica excecao exigida pelo GitHub.
  for (const rel of publicados) {
    if (rel === 'CNAME') continue;
    if (!/^[a-z0-9._\/-]+$/.test(rel)) a.push(achado('medio', T, 'nome de arquivo fora da regra (minusculo, sem espaco, sem acento)', rel));
  }
  // dois arquivos que so diferem na caixa (quebra em qualquer sistema que nao distingue)
  const vistos = new Map();
  for (const rel of publicados) {
    const k = rel.toLowerCase();
    if (vistos.has(k)) a.push(achado('alto', T, `dois arquivos so diferem na caixa: ${vistos.get(k)} e ${rel}`, rel));
    vistos.set(k, rel);
  }

  a.push(achado('info', T, `${verificados} referencias conferidas com caixa exata (HTML, CSS, JS e sitemap)`));
  return a;
}
