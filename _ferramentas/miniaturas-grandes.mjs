// Descobre quais videos tem a miniatura grande do YouTube (maxresdefault, 1280x720) e grava o resultado em _conteudo/miniaturas-grandes.json.
// O gerador usa a grande na imagem de compartilhamento (og:image) e em Article.image das materias e, quando o video NAO esta na lista (ou o resultado e "false"),
// volta para a hqdefault (480x360), que existe para todo video. Nada quebra se este arquivo faltar ou estiver desatualizado: so se perde o ganho.
// Uso: node _ferramentas/miniaturas-grandes.mjs          confere so os videos que ainda nao estao no arquivo (rode quando sair materia nova)
//      node _ferramentas/miniaturas-grandes.mjs --tudo   confere todos de novo
// Precisa de internet. Sem internet, avisa e termina sem erro (o arquivo fica como estava).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listarConteudos } from './gerador/pastas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = path.join(raiz, '_conteudo', 'miniaturas-grandes.json');
const todos = process.argv.includes('--tudo');
const idVideo = /^[\w-]{11}$/;

// ids de video citados pelas materias e pelos itens da Wiki: o nome do arquivo e o id; o campo "video" pode apontar para outro
const ids = new Set();
for (const c of listarConteudos(raiz).itens) {
  if (idVideo.test(c.id)) ids.add(c.id);
  try {
    const v = JSON.parse(fs.readFileSync(c.arquivo, 'utf8')).video;
    if (typeof v === 'string' && idVideo.test(v)) ids.add(v);
  } catch { /* arquivo invalido: quem avisa e o gerador */ }
}

const atual = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : { verificado: null, videos: {} };
const pendentes = [...ids].filter((id) => todos || !(id in atual.videos)).sort();
console.log(`${ids.size} video(s) nas materias e na Wiki; ${pendentes.length} para conferir${todos ? ' (--tudo)' : ''}.`);
if (!pendentes.length) process.exit(0);

async function existe(id) {
  const r = await fetch(`https://i.ytimg.com/vi/${id}/maxresdefault.jpg`, { method: 'HEAD' });
  if (r.status === 404) return false;
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return (r.headers.get('content-type') ?? '').startsWith('image/');
}

const resultado = {};
let falhas = 0;
const fila = [...pendentes];
await Promise.all(Array.from({ length: 8 }, async () => {
  while (fila.length) {
    const id = fila.shift();
    try { resultado[id] = await existe(id); } catch (e) { falhas++; console.warn(`  ${id}: nao deu para conferir (${e.message}); fica com a pequena`); }
  }
}));

if (falhas === pendentes.length) { console.warn('Nenhum video foi conferido (sem internet?). O arquivo nao foi alterado.'); process.exit(0); }
const videos = { ...atual.videos, ...resultado };
const ordenado = Object.fromEntries(Object.keys(videos).sort().map((k) => [k, videos[k]]));
fs.writeFileSync(arquivo, `${JSON.stringify({ verificado: new Date().toISOString().slice(0, 10), videos: ordenado }, null, 1)}\n`);
const com = Object.values(resultado).filter(Boolean).length;
console.log(`Conferidos ${Object.keys(resultado).length}: ${com} com miniatura grande, ${Object.keys(resultado).length - com} so com a pequena${falhas ? `, ${falhas} sem resposta` : ''}. Gravado em _conteudo/miniaturas-grandes.json`);
