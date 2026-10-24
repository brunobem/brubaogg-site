// Descobre a duracao (em segundos) de cada video das materias e da Wiki e grava em _conteudo/duracoes-videos.json.
// O gerador usa isso no campo `duration` do VideoObject (dados estruturados). Video que nao esta na lista fica sem o campo (valido): nada quebra
// se este arquivo faltar ou estiver desatualizado. A duracao e lida da pagina publica do video (meta itemprop="duration"), sem chave de API.
// Uso: node _ferramentas/duracoes-videos.mjs          confere so os videos que ainda nao estao no arquivo (rode quando sair materia nova)
//      node _ferramentas/duracoes-videos.mjs --tudo   confere todos de novo
// Precisa de internet. Sem internet, avisa e termina sem erro (o arquivo fica como estava).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { listarConteudos } from './gerador/pastas.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivo = path.join(raiz, '_conteudo', 'duracoes-videos.json');
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

// le a pagina do video so ate achar a duracao (a pagina inteira passa de 1 MB), depois fecha a conexao
async function segundos(id) {
  const r = await fetch(`https://www.youtube.com/watch?v=${id}`, { headers: { 'accept-language': 'pt-BR,pt;q=0.9', 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36' } });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const leitor = r.body.getReader(), dec = new TextDecoder();
  let texto = '';
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    texto += dec.decode(value, { stream: true });
    const m = texto.match(/itemprop="duration" content="PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?"/);
    if (m) { await leitor.cancel(); return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0); }
  }
  throw new Error('duracao nao encontrada na pagina');
}

const resultado = {};
let falhas = 0;
const fila = [...pendentes];
await Promise.all(Array.from({ length: 4 }, async () => {
  while (fila.length) {
    const id = fila.shift();
    try { resultado[id] = await segundos(id); } catch (e) { falhas++; console.warn(`  ${id}: nao deu para ler a duracao (${e.message}); fica sem o campo`); }
  }
}));

if (falhas === pendentes.length) { console.warn('Nenhum video foi conferido (sem internet?). O arquivo nao foi alterado.'); process.exit(0); }
const videos = { ...atual.videos, ...resultado };
const ordenado = Object.fromEntries(Object.keys(videos).sort().map((k) => [k, videos[k]]));
fs.writeFileSync(arquivo, `${JSON.stringify({ verificado: new Date().toISOString().slice(0, 10), videos: ordenado }, null, 1)}\n`);
console.log(`Lidas ${Object.keys(resultado).length} duracao(oes)${falhas ? `, ${falhas} sem resposta` : ''}. Gravado em _conteudo/duracoes-videos.json`);
