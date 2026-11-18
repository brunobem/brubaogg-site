// Monta o site PUBLICADO numa pasta limpa (_site/) e cria o indice da busca (Pagefind) dentro dela. E exatamente o que o servidor do
// GitHub faz a cada envio (.github/workflows/publicar.yml); rodar aqui serve para conferir antes e para testar a busca de verdade.
//
// Uso: npm run indexar                 (monta _site/ e indexa)
//      npm run indexar -- --com-testes (tambem copia as telas de teste para _site/_testes/, so para teste local)
// Depois: abra a pasta _site/ num servidor local (ex.: python -m http.server 8102 --directory _site).
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { arquivosPublicados, raizDoSite } from './publicado.mjs';

const destino = path.join(raizDoSite, '_site');
const comTestes = process.argv.includes('--com-testes');

fs.rmSync(destino, { recursive: true, force: true });
const arquivos = arquivosPublicados();
for (const rel of arquivos) {
  const alvo = path.join(destino, rel);
  fs.mkdirSync(path.dirname(alvo), { recursive: true });
  fs.copyFileSync(path.join(raizDoSite, rel), alvo);
}
if (comTestes) fs.cpSync(path.join(raizDoSite, '_ferramentas', 'revisao-v1.01', 'testes'), path.join(destino, '_testes'), { recursive: true });
console.log(`_site/: ${arquivos.length} arquivos publicaveis copiados${comTestes ? ' (+ telas de teste em _site/_testes/)' : ''}`);

// o indexador: so le paginas com data-pagefind-body (as materias). Escreve _site/pagefind/
// Sem nenhuma materia marcada o Pagefind indexaria o site INTEIRO (paginas fixas, termos...): nesse caso nao cria indice
const comCorpo = arquivos.filter((r) => r.endsWith('.html') && fs.readFileSync(path.join(destino, r), 'utf8').includes('data-pagefind-body')).length;
if (comCorpo === 0) { console.log('Nenhuma materia marcada para a busca (data-pagefind-body): o indice da busca NAO foi criado.'); process.exit(0); }
const bin = path.join(raizDoSite, 'node_modules', 'pagefind', 'lib', 'runner', 'bin.cjs');
if (!fs.existsSync(bin)) { console.error('Pagefind nao esta instalado. Rode: npm install'); process.exit(1); }
const t0 = Date.now();
const r = spawnSync(process.execPath, [bin, '--site', destino], { cwd: raizDoSite, encoding: 'utf8' });
const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
if (r.status !== 0) { console.error(`O indexador falhou (codigo ${r.status}):\n${saida}`); process.exit(1); }
const indexadas = (saida.match(/Indexed (\d+) pages?/i) ?? [])[1];
const arquivosIndice = fs.existsSync(path.join(destino, 'pagefind')) ? fs.readdirSync(path.join(destino, 'pagefind'), { recursive: true }).length : 0;
console.log(`Pagefind: ${indexadas ?? '?'} paginas indexadas em ${((Date.now() - t0) / 1000).toFixed(1)} s (${arquivosIndice} arquivos em _site/pagefind/)`);
if (Number(indexadas) !== comCorpo) { console.error(`ATENCAO: ${comCorpo} materia(s) estao marcadas para a busca, mas o indexador leu ${indexadas ?? '?'}. Saida do indexador:\n${saida}`); process.exit(1); }
