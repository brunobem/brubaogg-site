// Atualiza os dados de videos usados pelo site (rode sempre que sair video novo):
//   assets/data/playlists.json    os 15 videos mais recentes de cada playlist de MATERIA (base das materias)
//   assets/data/players.json      os videos das playlists das paginas de player (Cortes e Lives): a lista "Ultimos videos" de cada uma
// As playlists vem de _ferramentas/gerador/config.mjs (categorias e PLAYERS).
// Uso: node _ferramentas/atualizar-videos.mjs            as duas coisas
//      node _ferramentas/atualizar-videos.mjs --players  so Cortes e Lives (nao mexe no feed das materias)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAYERS, categorias } from './gerador/config.mjs';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dados = path.join(raiz, 'assets', 'data');
fs.mkdirSync(dados, { recursive: true });
const soPlayers = process.argv.includes('--players');

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

// grava o arquivo, mas NAO sobrescreve se uma playlist voltou com muito menos videos do que ja tinhamos (falha momentanea do YouTube)
function gravar(arq, porPlaylist) {
  if (fs.existsSync(arq)) {
    const antigo = JSON.parse(fs.readFileSync(arq, 'utf8').replace(/^﻿/, ''));
    for (const [id, videos] of Object.entries(porPlaylist)) {
      const antes = (antigo[id] ?? []).length;
      if (antes >= 4 && videos.length < antes / 2) {
        console.error(`Nao gravei: a playlist ${id} voltou com ${videos.length} videos e tinhamos ${antes}. Parece falha do YouTube; tente de novo daqui a pouco.`);
        process.exit(1);
      }
    }
  }
  fs.writeFileSync(arq, JSON.stringify(porPlaylist, null, 2));
}

if (!soPlayers) {
  const porPlaylist = {};
  for (const { playlist, nome } of categorias.filter((c) => c.playlist)) { // categoria sem playlist (Series) nao vem do YouTube
    const videos = await feed(playlist);
    porPlaylist[playlist] = videos;
    console.log(`${nome}: ${videos.length} videos`);
  }
  gravar(path.join(dados, 'playlists.json'), porPlaylist);
}

const dosPlayers = {};
for (const [pagina, lista] of Object.entries(PLAYERS)) {
  for (const { playlist, titulo } of lista) {
    dosPlayers[playlist] = await feed(playlist);
    console.log(`${pagina} / ${titulo}: ${dosPlayers[playlist].length} videos`);
  }
}
gravar(path.join(dados, 'players.json'), dosPlayers);
