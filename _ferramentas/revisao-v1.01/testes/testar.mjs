// Roda todos os testes estaticos (sem internet, sem dependencias) e mostra um resumo.
//   npm run testar                  tudo
//   npm run testar -- --so=links,seo   so alguns
//   npm run testar -- --tudo        lista todos os achados (por padrao mostra os 12 primeiros de cada teste)
//   npm run testar -- --base        grava o resultado como "estado inicial" para comparar depois
// Sai com erro (codigo 1) se houver achado CRITICO ou ALTO. Medio e baixo sao avisos.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { raiz } from './lib.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const so = (args.find((a) => a.startsWith('--so=')) ?? '').slice(5).split(',').filter(Boolean);
const TUDO = args.includes('--tudo');
const LENTOS = ['fuzz', 'fluxo', 'marcadores']; // so rodam quando pedidos com --so=fuzz
const ordem = ['links', 'html', 'contrato', 'seo', 'publico', 'css', 'js', 'gerador', ...(so.some((s) => LENTOS.includes(s)) ? LENTOS : [])];
const ROTULO = { critico: 'CRITICO', alto: 'ALTO', medio: 'medio', baixo: 'baixo', info: 'info' };
const PESO = { critico: 0, alto: 1, medio: 2, baixo: 3, info: 4 };

const todos = [];
for (const nome of ordem.filter((n) => !so.length || so.includes(n))) {
  const inicio = Date.now();
  let achados;
  try { achados = await (await import(`./t-${nome}.mjs`)).default(); }
  catch (e) { achados = [{ sev: 'critico', teste: nome, msg: `o proprio teste quebrou: ${e.stack?.split('\n').slice(0, 2).join(' ') ?? e}`, onde: '' }]; }
  achados.sort((a, b) => PESO[a.sev] - PESO[b.sev]);
  todos.push(...achados);

  // agrupa mensagens iguais (so muda a pagina) para a saida ficar legivel
  const grupos = new Map();
  for (const x of achados) {
    const k = `${x.sev}|${x.msg}`;
    if (!grupos.has(k)) grupos.set(k, { ...x, n: 0, lugares: [] });
    const g = grupos.get(k); g.n++; if (x.onde) g.lugares.push(x.onde);
  }
  const c = (s) => achados.filter((x) => x.sev === s).length;
  console.log(`\n== ${nome}  (${((Date.now() - inicio) / 1000).toFixed(1)}s)  critico ${c('critico')} | alto ${c('alto')} | medio ${c('medio')} | baixo ${c('baixo')}`);
  let mostrados = 0;
  for (const g of grupos.values()) {
    if (g.sev === 'info' || (!TUDO && mostrados >= 12 && PESO[g.sev] > 1)) continue;
    mostrados++;
    const lugar = g.n > 1 ? `${g.n}x, ex.: ${g.lugares.slice(0, 2).join(', ')}` : g.lugares[0] ?? '';
    console.log(`  [${ROTULO[g.sev]}] ${g.msg}${lugar ? `  (${lugar})` : ''}`);
  }
  const omitidos = [...grupos.values()].filter((g) => g.sev !== 'info').length - mostrados;
  if (omitidos > 0) console.log(`  ... e mais ${omitidos} tipo(s) de achado medio/baixo (use --tudo)`);
  for (const g of grupos.values()) if (g.sev === 'info') console.log(`  - ${g.msg}`);
}

const conta = (s) => todos.filter((x) => x.sev === s).length;
console.log(`\nRESUMO: critico ${conta('critico')} | alto ${conta('alto')} | medio ${conta('medio')} | baixo ${conta('baixo')}`);

const saida = path.join(aqui, args.includes('--base') ? 'estado-inicial.json' : 'resultado-ultimo.json');
fs.writeFileSync(saida, JSON.stringify({ quando: new Date().toISOString(), achados: todos }, null, 1));
const base = path.join(aqui, 'estado-inicial.json');
if (!args.includes('--base') && fs.existsSync(base)) {
  const b = JSON.parse(fs.readFileSync(base, 'utf8')).achados;
  const cb = (s) => b.filter((x) => x.sev === s).length;
  console.log(`ESTADO INICIAL (v1.0): critico ${cb('critico')} | alto ${cb('alto')} | medio ${cb('medio')} | baixo ${cb('baixo')}`);
}
console.log(`(detalhes completos em ${path.relative(raiz, saida)})`);
process.exit(conta('critico') + conta('alto') ? 1 : 0);
