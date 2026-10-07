// Escolhe as paginas que o teste de layout vai abrir: todas as fixas e as materias "extremas" (maior titulo, mais tags, etc).
// Uso: node _ferramentas/revisao-v1.01/testes/amostra.mjs   (gera amostra.json ao lado; o layout.html le esse arquivo)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CATEGORIAS, ler, materias, paginasHtml, raiz, textoVisivel } from './lib.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const lista = new Map(); // pagina -> motivo
const add = (p, motivo) => { if (p && fs.existsSync(path.join(raiz, p)) && !lista.has(p)) lista.set(p, motivo); };

const todas = paginasHtml();
const fixas = todas.filter((p) => !p.includes('/'));
for (const p of fixas) add(p, 'pagina fixa ou lista');

const tags = todas.filter((p) => p.startsWith('tag/'));
const tam = (p) => fs.statSync(path.join(raiz, p)).size;
if (tags.length) { add(tags.sort((a, b) => tam(b) - tam(a))[0], 'tag com mais cartoes'); add(tags.sort((a, b) => tam(a) - tam(b))[0], 'tag com menos cartoes'); }

// materias: gerar o mapa id -> pagina lendo o ID do player em cada pagina
const pagDe = new Map();
for (const p of todas.filter((x) => CATEGORIAS.some((c) => x.startsWith(`${c}/`)))) {
  const id = (ler(p).match(/embed\/([\w-]{11})/) ?? [])[1];
  if (id) pagDe.set(id, p);
}
const ms = materias().filter((m) => m.dados && pagDe.has(m.id)).map((m) => ({ id: m.id, d: m.dados, p: pagDe.get(m.id) }));
const maior = (arr, f) => arr.reduce((a, b) => (f(b) > f(a) ? b : a), arr[0]);
const por = (fn) => ms.filter(fn);
const escolhe = (arr, f, motivo) => { if (arr.length) add(maior(arr, f).p, motivo); };
for (const cat of CATEGORIAS) {
  const da = por((m) => m.p.startsWith(`${cat}/`));
  escolhe(da.filter((m) => m.d.formato === 'short'), (m) => 1, `${cat}: formato short`);
  escolhe(da.filter((m) => m.d.formato === 'horizontal'), (m) => 1, `${cat}: formato horizontal`);
}
escolhe(ms, (m) => (m.d.titulo ?? '').length, 'maior titulo');
escolhe(ms, (m) => (m.d.tags ?? []).length, 'mais tags');
escolhe(ms, (m) => Math.max(...m.d.corpo.map((p) => p.split(/\s+/).length)), 'maior paragrafo');
escolhe(ms, (m) => -m.d.corpo.join(' ').length, 'menor texto');
escolhe(ms, (m) => m.d.corpo.join(' ').length, 'maior texto');

// estados da pagina de busca (precisam do site MONTADO, com o indice do Pagefind: _site/, porta 8102)
for (const [p, motivo] of [['busca.html?q=resident', 'busca com texto (precisa do site montado)'], ['busca.html?cat=Review&n=60', 'mais recentes filtrado por categoria (precisa do site montado)'], ['busca.html?q=zzzzxq', 'busca sem resultado (precisa do site montado)']]) lista.set(p, motivo);

// arquivo por mes: o mes com mais materias
const meses = todas.filter((p) => p.startsWith('arquivo/'));
if (meses.length) add(meses.sort((a, b) => tam(b) - tam(a))[0], 'arquivo: mes com mais materias');

const saida = [...lista].map(([pagina, motivo]) => ({ pagina, motivo }));
fs.writeFileSync(path.join(aqui, 'amostra.json'), JSON.stringify(saida, null, 1));
console.log(`amostra.json: ${saida.length} paginas`);
for (const s of saida) console.log(`  ${s.pagina}  (${s.motivo})`);
