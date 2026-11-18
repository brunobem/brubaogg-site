// Cria o arquivo modelo de um conteudo da WIKI: _conteudo/materias/wiki/<nome>/<nome>.json (pode ser so texto, sem video).
// Uso: npm run wiki -- <nome-do-arquivo> --jogo <slug do jogo> [--tipo historia|personagem|guia|curiosidade] [--video ID_DO_YOUTUBE] [--titulo "Titulo"]
//   <nome-do-arquivo>  minusculo, sem acento, com hifens (ex.: resident-evil-4-leon). E o identificador do conteudo e nao deve mudar depois.
//   --jogo             o slug da tag do jogo (ex.: resident-evil-4, gta-5) ou da franquia (resident-evil). Sem --jogo o comando lista os que existem.
// O arquivo nasce como RASCUNHO (nao vai para o site). Preencha, tire a linha "status" para publicar e rode: npm run gerar
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WIKI } from './gerador/config.mjs';
import { jogosDaWikiConfig } from './gerador/contrato.mjs';
import { arquivoDaMateria, arquivoParaNova } from './gerador/pastas.mjs';
import { TEXTO_DE_MODELO, hojeEmSaoPaulo, lerJson } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (nome) => { const i = process.argv.indexOf(`--${nome}`); return i > 0 ? process.argv[i + 1] : undefined; };
const nome = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
const ft = path.join(site, '_conteudo', 'tags.json');
const jogos = jogosDaWikiConfig(fs.existsSync(ft) ? lerJson(ft, '_conteudo/tags.json') : {});
const jogo = arg('jogo'), tipo = arg('tipo') ?? 'historia', video = arg('video'), titulo = arg('titulo');
const ajuda = () => `\nJogos da Wiki (use um destes em --jogo):\n${[...jogos].map(([slug, n]) => `  ${slug.padEnd(30)} ${n}`).join('\n')}\nTipos (--tipo): ${Object.entries(WIKI.tipos).map(([k, v]) => `${k} (${v})`).join(', ')}`;

if (!nome || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(nome)) { console.error(`Informe o nome do arquivo: minusculo, sem acento, com hifens (ex.: resident-evil-4-leon).${nome ? ` Nao aceitei "${nome}".` : ''}\nUso: npm run wiki -- <nome-do-arquivo> --jogo <slug do jogo> [--tipo ...] [--video ID] [--titulo "..."]${ajuda()}`); process.exit(1); }
if (!jogo || !jogos.has(jogo)) { console.error(`${jogo ? `Jogo desconhecido: ${jogo}.` : 'Falta --jogo.'}${ajuda()}\nPara um jogo novo, acrescente uma linha em "serie" no config.mjs (WIKI.jogos).`); process.exit(1); }
if (!Object.keys(WIKI.tipos).includes(tipo)) { console.error(`Tipo desconhecido: ${tipo}. Use ${Object.keys(WIKI.tipos).join(', ')}.`); process.exit(1); }
if (video && !/^[\w-]{11}$/.test(video)) { console.error(`--video deve ser o ID do video do YouTube (11 caracteres), nao o link: ${video}`); process.exit(1); }
if (arquivoDaMateria(site, nome)) { console.error(`Ja existe um conteudo com o nome ${nome} (em _conteudo/materias).`); process.exit(1); }

const arq = arquivoParaNova(site, 'series', nome); // a Wiki e a categoria series: pasta de tipo wiki
fs.mkdirSync(path.dirname(arq), { recursive: true });
fs.writeFileSync(arq, `${JSON.stringify({
  jogo, tipo,
  status: 'rascunho',
  titulo: titulo ?? `${jogos.get(jogo)}: escreva o titulo`,
  publicado: hojeEmSaoPaulo(),
  ...(video ? { video } : {}),
  tags: [],
  spoiler: tipo === 'historia',
  ...TEXTO_DE_MODELO,
}, null, 2)}\n`, 'utf8');
console.log(`Criado: _conteudo/materias/wiki/${nome}/${nome}.json (${jogos.get(jogo)}, ${WIKI.tipos[tipo]}${video ? ', com video' : ', so texto'})\nPreencha titulo, resumo e corpo; para publicar, apague a linha "status" e rode: npm run gerar`);
