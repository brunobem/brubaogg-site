// Cria o arquivo modelo de uma materia: _conteudo/materias/<ID>.json
// Uso: npm run nova -- <ID_DO_VIDEO>      (os IDs saem de: npm run pendentes)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const id = process.argv[2];
if (!id) { console.error('Informe o ID do video. Veja os IDs com: npm run pendentes'); process.exit(1); }

const playlists = JSON.parse(fs.readFileSync(path.join(site, 'assets', 'data', 'playlists.json'), 'utf8'));
const video = Object.values(playlists).flat().find((v) => v.id === id);
if (!video) { console.error(`Video ${id} nao esta em playlists.json (rode: npm run videos).`); process.exit(1); }

const arq = path.join(site, '_conteudo', 'materias', `${id}.json`);
if (fs.existsSync(arq)) { console.error(`Ja existe: ${arq}`); process.exit(1); }

fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, JSON.stringify({
  titulo: video.title.replace(/(\s+#\w+)+\s*$/u, '').trim(),
  resumo: 'Escreva 1 ou 2 frases que aparecem na lista de matérias.',
  corpo: ['Primeiro parágrafo.', 'Segundo parágrafo.'],
}, null, 2) + '\n', 'utf8');
console.log(`Criado: _conteudo/materias/${id}.json\nPreencha o texto e rode: npm run gerar`);
