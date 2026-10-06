// Cria o arquivo modelo de uma materia: _conteudo/materias/<ID>.json
// Uso: npm run nova -- <ID_DO_VIDEO>      (os IDs saem de: npm run pendentes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id) { console.error('Informe o ID do video. Veja os IDs com: npm run pendentes'); process.exit(1); }

const playlists = JSON.parse(fs.readFileSync(path.join(site, 'assets', 'data', 'playlists.json'), 'utf8'));
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

fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, JSON.stringify({
  status: 'rascunho',
  ...extra,
  titulo: video.title.replace(/(\s+#\w+)+\s*$/u, '').trim(),
  resumo: 'Escreva 1 ou 2 frases que aparecem na lista de matérias.',
  corpo: ['Primeiro parágrafo.', 'Segundo parágrafo.'],
}, null, 2) + '\n', 'utf8');
console.log(`Criado: _conteudo/materias/${id}.json\nPreencha o texto, revise e aprove com: npm run aprovar -- ID (depois npm run gerar)`);
