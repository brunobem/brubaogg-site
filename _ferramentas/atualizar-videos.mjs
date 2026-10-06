// Atualiza os dados de videos usados pelo site (rode sempre que sair video novo):
//   assets/data/playlists.json    os 15 videos mais recentes de cada playlist (base das materias)
// Uso: node _ferramentas/atualizar-videos.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = path.join(raiz, 'assets', 'data');
fs.mkdirSync(dados, { recursive: true });

// playlists usadas nas abas e no feed da home
const playlists = [
  'PLLjQdJWDu4qk',                        // Lançamentos
  'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp',   // Vale a pena jogar? (Reviews)
  'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb',   // Notícias
  'PLYgWUqxV5Uao',                        // GTA 6 Novidades
];

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

const porPlaylist = {};
for (const id of playlists) {
  const videos = await feed(id);
  porPlaylist[id] = videos;
  console.log(`${id}: ${videos.length} videos`);
}
fs.writeFileSync(path.join(dados, 'playlists.json'), JSON.stringify(porPlaylist, null, 2));
