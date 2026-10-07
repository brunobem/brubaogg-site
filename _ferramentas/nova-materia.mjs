// Cria o arquivo modelo de uma materia: _conteudo/materias/<ID>.json
// Uso: npm run nova -- <ID ou link do video>      (os IDs saem de: npm run pendentes)
// Ja grava o "formato" (short ou horizontal), consultando o YouTube na hora; sem resposta clara, nao cria o arquivo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEXTO_DE_MODELO, lerJson, normalizarId } from './gerador/util.mjs';
import { formatoDe } from './gerador/youtube.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = normalizarId(process.argv[2]);
if (!id) { console.error(`Informe o ID do video (11 caracteres) ou o link dele${process.argv[2] ? `; nao entendi "${process.argv[2]}"` : ''}. Veja os IDs com: npm run pendentes`); process.exit(1); }

const playlists = lerJson(path.join(site, 'assets', 'data', 'playlists.json'), 'assets/data/playlists.json');
const arg = (nome) => { const i = process.argv.indexOf(`--${nome}`); return i > 0 ? process.argv[i + 1] : undefined; };
let video = Object.values(playlists).flat().find((v) => v.id === id);
let extra = {};
if (!video) {
  // video antigo (fora dos 15 mais recentes da playlist): informe categoria e data de publicacao
  const categoria = arg('categoria'), publicado = arg('publicado'), titulo = arg('titulo');
  if (!categoria || !publicado || !titulo) {
    console.error(`O video ${id} nao esta entre os 15 mais recentes das playlists. Informe:\n  npm run nova -- ${id} --categoria noticias --publicado 2026-09-30 --titulo "Titulo do video"\n(categorias: noticias, reviews, lancamentos, gta6-novidades)`);
    process.exit(1);
  }
  video = { id, title: titulo };
  extra = { categoria, publicado };
}

const arq = path.join(site, '_conteudo', 'materias', `${id}.json`);
if (fs.existsSync(arq)) { console.error(`Ja existe: ${arq}`); process.exit(1); }

const f = await formatoDe(id);
if (f.erro) { console.error(`Nao criei o arquivo: nao consegui confirmar o formato do video ${id} (${f.erro}). Tente de novo com internet.`); process.exit(1); }

fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, JSON.stringify({
  formato: f.formato,
  status: 'rascunho',
  ...extra,
  titulo: video.title.replace(/(\s+#\w+)+\s*$/u, '').trim(),
  ...TEXTO_DE_MODELO,
}, null, 2) + '\n', 'utf8');
console.log(`Criado: _conteudo/materias/${id}.json (formato: ${f.formato})\nPreencha o texto, revise e aprove com: npm run aprovar -- ID (depois npm run gerar)`);
