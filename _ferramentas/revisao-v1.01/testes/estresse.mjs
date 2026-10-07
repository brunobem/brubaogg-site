// Monta uma COPIA do site (fora do repositorio) com materias extremas e gera o site montado nela, para o teste de layout e do JavaScript
// rodarem em cima de conteudo hostil: titulo de 200 letras, palavra sem espaco, 8 tags enormes, texto gigante, HTML e marcadores no texto...
// Uso: node _ferramentas/revisao-v1.01/testes/estresse.mjs [--vazio]
//   (sem opcao) -> MCP SOCIAL/_estresse/site/  com as materias reais + as extremas, aprovadas, geradas e indexadas (_site/)
//   --vazio     -> MCP SOCIAL/_estresse/vazio/ SEM nenhuma materia (estado "site novo"): tudo precisa continuar de pe
// Depois: sirva a pasta _site/ de dentro da copia (launch.json: "estresse", porta 8103) e abra /_testes/layout.html ou /_testes/js.html.
// Nada disso toca no site real.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { raiz } from './lib.mjs';

const vazio = process.argv.includes('--vazio');
const escala = Number((process.argv.find((a) => a.startsWith('--escala=')) ?? '').slice(9)) || 0; // --escala=3000: N materias SIMULADAS (texto das reais, titulos e datas variados)
const destino = path.resolve(raiz, '..', '_estresse', vazio ? 'vazio' : escala ? `escala-${escala}` : 'site');
fs.rmSync(destino, { recursive: true, force: true, maxRetries: 8, retryDelay: 400 }); // no Windows um antivirus ou servidor pode segurar a pasta por instantes
fs.mkdirSync(path.dirname(destino), { recursive: true });
const pular = (rel) => /(^|[\\/])(node_modules|_site|\.git)([\\/]|$)/.test(rel);
fs.cpSync(raiz, destino, { recursive: true, filter: (origem) => !pular(path.relative(raiz, origem)) });
fs.symlinkSync(path.join(raiz, 'node_modules'), path.join(destino, 'node_modules'), 'junction'); // o indexador (Pagefind) vem de la

const dir = path.join(destino, '_conteudo', 'materias');
const palavras = 'jogo mundo aberto trailer estudio lancamento historia combate cooperativo atualizacao gratuita confirmado novidades mapa personagem'.split(' ');
const frase = (n, i = 0) => Array.from({ length: n }, (_, k) => palavras[(i + k * 7) % palavras.length]).join(' ');
const paragrafo = (palavrasPorParagrafo, i) => `${frase(palavrasPorParagrafo, i)}.`.replace(/^./, (c) => c.toUpperCase());

if (escala) {
  const reais = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).filter((m) => Array.isArray(m.corpo) && m.corpo.length);
  const cats = ['noticias', 'noticias', 'noticias', 'noticias', 'noticias', 'noticias', 'reviews', 'reviews', 'lancamentos', 'gta6-novidades', 'gta6-novidades'];
  const pool = ['GTA 6', 'God of War', 'Resident Evil', 'Silent Hill', 'The Witcher 3', 'Final Fantasy', 'Call of Duty', 'Elden Ring', 'Zelda', 'Pokemon', 'Hollow Knight', 'Cyberpunk 2077', 'Baldurs Gate 3', 'Starfield', 'Fallout'];
  const adj = 'Sombra Ferro Neon Carmesim Eterno Perdido Silencioso Selvagem Gelado Ultimo Quebrado Oculto Dourado Rising Fallen Burning'.split(' '), sub = 'Reino Fronteira Legado Protocolo Odisseia Cacadores Cronicas Ecos Fenda Cidadela Vanguarda Mares Pacto Dominio Ermo Espiral'.split(' ');
  let s = 7; const rnd = (n) => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s % n; };
  for (let i = 0; i < escala; i++) {
    const base = reais[rnd(reais.length)], cat = cats[rnd(cats.length)];
    const nome = `${adj[rnd(adj.length)]} ${sub[rnd(sub.length)]} ${i}`;
    const dia = new Date(Date.UTC(2026, 9, 5) - Math.floor((i / escala) * 730) * 86400000);
    const m = { titulo: `${nome}: ${base.titulo.replace(/^[^:]*:\s*/, '').slice(0, 40)}`.slice(0, 60), resumo: base.resumo, corpo: base.corpo, tags: [nome.replace(/ \d+$/, ''), pool[rnd(pool.length)], pool[rnd(pool.length)]], formato: rnd(3) ? 'horizontal' : 'short', categoria: cat, publicado: dia.toISOString().slice(0, 10) };
    fs.writeFileSync(path.join(dir, `SYN${String(i).padStart(8, '0')}.json`), `${JSON.stringify(m)}
`);
  }
} else if (vazio) {
  for (const f of fs.readdirSync(dir)) fs.rmSync(path.join(dir, f));
  fs.writeFileSync(path.join(destino, '_conteudo', 'enderecos.json'), '{}\n');
  fs.rmSync(path.join(destino, '_conteudo', 'lastmod.json'), { force: true });
} else {
  const casos = {
    ESTRESSO_01: { titulo: Array.from({ length: 28 }, (_, i) => palavras[i % palavras.length]).join(' ').slice(0, 200), resumo: 'Titulo de 200 caracteres.', corpo: [paragrafo(60, 1), paragrafo(60, 2)], tags: ['Jogo Teste'], formato: 'horizontal', categoria: 'noticias', publicado: '2026-10-05' },
    ESTRESSO_02: { titulo: 'Superpalavrasemespacosnotitulo'.repeat(3), resumo: `Resumo com palavra sem espaco: ${'x'.repeat(120)}`, corpo: [`Link comprido: https://exemplo.com.br/${'caminho-muito-longo/'.repeat(8)}pagina.html e uma palavra de ${'y'.repeat(140)} caracteres.`, paragrafo(40, 3)], tags: [], formato: 'short', categoria: 'noticias', publicado: '2026-10-04' },
    ESTRESSO_03: { titulo: 'Oito tags enormes', resumo: 'Tags com nomes de 60 letras e uma de 1 letra.', corpo: [paragrafo(50, 4)], tags: ['X', ...Array.from({ length: 7 }, (_, i) => `Franquia Com Nome Realmente Muito Comprido Numero ${i} Edicao Definitiva`.slice(0, 60))], formato: 'horizontal', categoria: 'reviews', publicado: '2026-10-03' },
    ESTRESSO_04: { titulo: 'Sem tags e resumo de uma palavra', resumo: 'Ok', corpo: [paragrafo(30, 5)], tags: [], formato: 'horizontal', categoria: 'lancamentos', publicado: '2026-10-02' },
    ESTRESSO_05: { titulo: 'Resumo gigante com Short', resumo: Array.from({ length: 8 }, (_, i) => paragrafo(12, i)).join(' ').slice(0, 500), corpo: [paragrafo(80, 6), paragrafo(80, 7)], tags: ['Jogo Teste'], formato: 'short', categoria: 'gta6-novidades', publicado: '2026-10-01' },
    ESTRESSO_06: { titulo: 'Um unico paragrafo gigante', resumo: 'Um paragrafo de 4 mil letras.', corpo: [Array.from({ length: 600 }, (_, i) => palavras[i % palavras.length]).join(' ')], tags: ['Jogo Teste'], formato: 'short', categoria: 'noticias', publicado: '2026-09-30' },
    ESTRESSO_07: { titulo: 'Materia de uma frase', resumo: 'Curta.', corpo: ['Ok.'], tags: ['Jogo Teste'], formato: 'short', categoria: 'noticias', publicado: '2026-09-29' },
    ESTRESSO_08: { titulo: 'Tres mil palavras com Short', resumo: 'Texto longo ao lado do player vertical.', corpo: Array.from({ length: 60 }, (_, i) => paragrafo(50, i)), tags: ['Jogo Teste', 'Outro Jogo'], formato: 'short', categoria: 'reviews', publicado: '2026-09-28' },
    ESTRESSO_09: { titulo: '<script>alert(1)</script> & "aspas" \'simples\' {{x}} ${y} $& $1 </main>', resumo: 'Resumo com <!--site:header--> e <!--feed:inicio--> e <b>negrito</b> e "aspas".', corpo: ['<img src=x onerror=alert(1)> e &amp; e &lt;b&gt; e <!--site:footer--> e <!--/site:header-->.', 'Emoji 🎮🔥💥. Árabe: مرحبا بالعالم. Hebraico: שלום עולם. Japonês: 日本語のテキスト. Combinados: é́́́. Invisíveis: a​b‍c. Sobrescrita: ‮oculto‬ fim.', 'Parágrafo com ${template} e `crase` e $1 $& $$ \\n \\u0041 e % e %s.'], tags: ['<b>x</b>', '"a"', 'a/b', '..', 'Jogo Teste'], formato: 'horizontal', categoria: 'noticias', publicado: '2026-09-27' },
    ESTRESSO_10: { titulo: '🎮🔥💥 #shorts #gta6', resumo: 'Titulo so de emoji e hashtags.', corpo: [paragrafo(30, 9)], tags: ['Jogo Teste'], formato: 'short', categoria: 'lancamentos', publicado: '2026-09-26' },
    ESTRESSO_11: { titulo: 'Mesmo titulo', resumo: 'Primeira de duas com o mesmo titulo.', corpo: [paragrafo(30, 10)], tags: ['Jogo Teste'], formato: 'horizontal', categoria: 'noticias', publicado: '2025-01-15' },
    ESTRESSO_12: { titulo: 'Mesmo titulo', resumo: 'Segunda de duas com o mesmo titulo.', corpo: [paragrafo(30, 11)], tags: ['Jogo Teste'], formato: 'horizontal', categoria: 'noticias', publicado: '2024-06-01' },
  };
  for (const [id, m] of Object.entries(casos)) fs.writeFileSync(path.join(dir, `${id}.json`), `${JSON.stringify(m, null, 1)}\n`);
}

const rodar = (args, rotulo) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, args, { cwd: destino, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  console.log(`--- ${rotulo} (codigo ${r.status})\n${saida.split('\n').slice(-12).join('\n')}`);
  return r.status === 0;
};
if (!vazio) rodar(['_ferramentas/aprovar-materia.mjs', '--todos', '--confirmar'], 'aprovar tudo na copia');
if (!rodar(['_ferramentas/gerar-site.mjs'], 'gerar')) process.exit(1);
if (!rodar(['_ferramentas/montar-site.mjs', '--com-testes'], 'montar + indexar')) process.exit(1);
// amostra do teste de layout NESTA copia: as materias extremas, as paginas que listam tudo e os estados da busca
if (!vazio && !escala) {
  const registro = JSON.parse(fs.readFileSync(path.join(destino, '_conteudo', 'enderecos.json'), 'utf8'));
  const paginas = Object.entries(registro).filter(([id]) => id.startsWith('ESTRESSO_')).map(([id, e]) => ({ pagina: `${e.categoria}/${e.slug}.html`, motivo: `extrema ${id}` }));
  const tagsDaCopia = fs.readdirSync(path.join(destino, 'tag')).filter((f) => /jogo-teste|^x\.|franquia/.test(f)).slice(0, 3).map((f) => ({ pagina: `tag/${f}`, motivo: 'tag do teste' }));
  const fixas = ['index.html', 'noticias.html', 'reviews.html', 'tags.html', 'gta6.html', '404.html', 'busca.html', 'busca.html?q=jogo', 'busca.html?q=zzzzxq', 'busca.html?cat=Review&n=60', 'arquivo.html', 'arquivo/2026-10.html', 'arquivo/2026-09.html'].map((p) => ({ pagina: p, motivo: 'pagina que lista tudo / estado da busca' }));
  fs.writeFileSync(path.join(destino, '_site', '_testes', 'amostra.json'), JSON.stringify([...fixas, ...paginas, ...tagsDaCopia], null, 1));
  console.log(`amostra.json da copia: ${fixas.length + paginas.length + tagsDaCopia.length} paginas`);
}
console.log(`\nCopia pronta em ${destino}\\_site (servidor "estresse", porta 8103)`);
