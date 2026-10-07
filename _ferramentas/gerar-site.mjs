// Gera as paginas de materias do site a partir de assets/data/playlists.json e de _conteudo/materias/*.json.
//
//  - Listas:   noticias.html, reviews.html, lancamentos.html
//  - Materias: noticias/<slug>.html, reviews/<slug>.html, lancamentos/<slug>.html, gta6-novidades/<slug>.html
//  - Extras:   tags (tag/*.html, tags.html), busca.html, 404.html, assets/data/atalhos.json, assets/data/lista/*.json (listas por mes), sitemap.xml, robots.txt
//
// Titulo, data e video vem do YouTube (playlists.json). O TEXTO da materia vem de _conteudo/materias/<idDoVideo>.json
// (formato e regras: _conteudo/GUIA-EDITORIAL.md). Por padrao SO entram no site os videos com materia APROVADA
// (arquivo sem "status", ou com "status": "rascunho" que ainda nao foi aprovado = fora do site).
//
// Uso: node _ferramentas/gerar-site.mjs
//   --com-rascunhos         previa: inclui os rascunhos como se fossem materias (npm run previa). NAO publique.
//   --rascunho              previa com texto ficticio (lorem ipsum) (npm run rascunho). NAO publique.
//   --com-videos-sem-texto  tambem gera paginas so com o player para videos sem materia
//
// Organizacao do codigo (_ferramentas/gerador/): config (categorias, abas, redes) -> dados (le e valida) -> paginas (monta em
// memoria) -> saida (grava so o que mudou, sitemap). Um erro de dados mostra o arquivo e o que fazer, sem pilha de erro.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarIcones } from './gerador/icones.mjs';
import { criarModelos } from './gerador/modelos.mjs';
import { criarTags } from './gerador/tags.mjs';
import { carregarDados } from './gerador/dados.mjs';
import { construirArquivo, construirFixas, construirMaterias, construirRedirecionamentos, construirTags } from './gerador/paginas.mjs';
import { gravarTudo } from './gerador/saida.mjs';
import { ErroDeDados } from './gerador/util.mjs';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); // raiz do site/repositorio
const saidas = new Map(); // caminho relativo -> conteudo (tudo fica em memoria e so e gravado no fim)

const ctx = {
  site,
  dados: path.join(site, '_conteudo', 'materias'),
  flags: {
    RASCUNHO: process.argv.includes('--rascunho'),
    COM_RASCUNHOS: process.argv.includes('--com-rascunhos'),
    SO_COM_MATERIA: !process.argv.includes('--com-videos-sem-texto'),
  },
  saidas,
  escrever: (rel, conteudo) => { saidas.set(rel, conteudo); },
  problemas: [], avisos: [], notas: [], sumiram: [], // erros (param o gerador), avisos editoriais e avisos graves (so informam)
  indice: [], listaMaterias: [], itensPorCategoria: {}, publicadas: new Map(), // o que as paginas produzem (indice = atalhos da busca: tags e paginas)
  contagemTags: new Map(), porTag: new Map(), temTags: false,
  contadores: { total: 0, reais: 0, aguardando: 0 },
};
ctx.icone = criarIcones(site);

try {
  carregarDados(ctx);                       // playlists, tags, materias (validadas), abas visiveis
  Object.assign(ctx, criarTags(ctx), criarModelos(ctx));
  construirMaterias(ctx);                   // materias e listas de categoria
  construirTags(ctx);                       // paginas de tag
  construirArquivo(ctx);                    // arquivo por mes (links estaticos para todas as materias)
  construirFixas(ctx);                      // 404, busca e indice da busca
  construirRedirecionamentos(ctx);          // enderecos antigos levam para o atual
  gravarTudo(ctx);                          // grava, preenche cabecalho/rodape, lastmod, sitemap
} catch (e) {
  if (e instanceof ErroDeDados) { console.error(e.message); process.exit(1); }
  throw e;
}

const { total, reais, aguardando } = ctx.contadores;
const { RASCUNHO, COM_RASCUNHOS, SO_COM_MATERIA } = ctx.flags;
if (ctx.sumiram.length) {
  const lista = ctx.sumiram.map((s) => `  - ${s.url} (materia ${s.id}: arquivo ausente, ilegivel ou voltou para rascunho)`).join('\n');
  console.log(`ATENCAO: ${ctx.sumiram.length} pagina(s) ja publicada(s) NAO sera(ao) gerada(s) e o link vai dar 404:\n${lista}\n  Se foi sem querer, restaure o arquivo. Se foi de proposito: npm run retirar -- ID`);
}
for (const n of ctx.notas) console.log(`NOTA: ${n}`);
if (ctx.avisos.length) console.log(`AVISOS (${ctx.avisos.length}, nao impedem de publicar):\n${ctx.avisos.map((a) => `  - ${a}`).join('\n')}`);
console.log(COM_RASCUNHOS
  ? `PREVIA COM RASCUNHOS: ${total} paginas (${reais} com texto, ${aguardando} so com o video). NAO publique: rode npm run gerar antes do commit.`
  : RASCUNHO
  ? `RASCUNHO: ${total} materias geradas (${reais} com texto real, ${total - reais} com texto ficticio). Nao publique este modo.`
  : `Materias no site: ${total} (${reais} com texto)${SO_COM_MATERIA ? ` | videos ainda sem materia, fora do site: ${aguardando}` : ` | paginas so com o video: ${aguardando}`} | abas visiveis: ${[...ctx.visiveis].join(', ') || 'nenhuma'}`);
