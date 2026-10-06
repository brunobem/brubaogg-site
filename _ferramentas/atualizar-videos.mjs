// Atualiza os dados de videos usados pelo site (rode sempre que sair video novo):
//   assets/data/playlists.json    os 15 videos mais recentes de cada playlist (base das materias)
//   assets/data/ultimo-video.json o video mais recente entre Noticias e Reviews (secao da home)
// Uso: node _ferramentas/atualizar-videos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = path.join(raiz, 'assets', 'data');
fs.mkdirSync(dados, { recursive: true });

// id da playlist -> tipo (so Noticias e Reviews concorrem ao "ultimo video" da home)
const playlists = {
  'PLLjQdJWDu4qk': null,                                   // Lançamentos
  'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp': 'Review',          // Vale a pena jogar?
  'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb': 'Notícia',         // Notícias
};

const entidades = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const decodificar = (s) => s.replace(/&(?:amp|lt|gt|quot|apos|#39);/g, (m) => entidades[m]);

async function feed(id) {
  const r = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${id}`);
  if (!r.ok) throw new Error(`feed ${id}: HTTP ${r.status}`);
  const xml = await r.text();
  return [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => ({
    id: m[1].match(/<yt:videoId>(.*?)<\/yt:videoId>/)[1],
    title: decodificar(m[1].match(/<title>(.*?)<\/title>/)[1]),
    published: new Date(m[1].match(/<published>(.*?)<\/published>/)[1]).toISOString().replace('.000Z', 'Z'),
  }));
}

// Short (vertical) responde 200 em /shorts/ID; video normal redireciona (303)
async function ehShort(id) {
  try {
    const r = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual' });
    return r.status === 200;
  } catch { return false; }
}

const porPlaylist = {};
const candidatos = [];
for (const [id, tipo] of Object.entries(playlists)) {
  const videos = await feed(id);
  porPlaylist[id] = videos;
  if (tipo) videos.forEach((v) => candidatos.push({ ...v, kind: tipo }));
  console.log(`${id}: ${videos.length} videos`);
}
fs.writeFileSync(path.join(dados, 'playlists.json'), JSON.stringify(porPlaylist, null, 2));

candidatos.sort((a, b) => b.published.localeCompare(a.published));
const u = candidatos[0];
if (!u) throw new Error('Nenhum video encontrado.');
const ultimo = { id: u.id, title: u.title, kind: u.kind, published: u.published, short: await ehShort(u.id) };
fs.writeFileSync(path.join(dados, 'ultimo-video.json'), JSON.stringify(ultimo, null, 2));
console.log(`Ultimo video: [${ultimo.kind}] ${ultimo.title}`);
