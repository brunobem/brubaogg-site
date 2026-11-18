// Compara dois CSS regra a regra: para cada (contexto de tela, seletor), o que ele faz depois de aplicar as camadas em sequencia
// (a ultima declaracao de cada propriedade vale) e com as variaveis var(--x) resolvidas. Pega o que o navegador nao mostra sem interacao
// (:hover, :focus, ::placeholder, [hidden]...). Uso: node css-equivalencia.mjs [antes.css] [depois.css]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lerCss } from './css-analise.mjs';

const aqui = path.dirname(fileURLToPath(import.meta.url));

function mapaFinal(css) {
  const regras = lerCss(css).filter((r) => r.tipo === 'regra');
  const vars = {};
  for (const r of regras) if (r.seletor === ':root') for (const [p, v] of r.decls) if (p.startsWith('--')) vars[p] = v;
  const resolver = (v) => { for (let i = 0; i < 6 && /var\(/.test(v); i++) v = v.replace(/var\((--[\w-]+)\)/g, (m, n) => vars[n] ?? m); return v; };
  const norm = (v) => resolver(v).toLowerCase().replace(/\s*,\s*/g, ',').replace(/\s+/g, ' ').replace(/\s*\/\s*/g, '/').replace(/^0(\.\d)/, '$1').replace(/([ (,])0\./g, '$1.').trim();
  const mapa = new Map();
  for (const r of regras) {
    if (r.seletor === ':root') continue;
    // um grupo "a, b { x }" vale como "a { x }" e "b { x }"
    for (const s of r.seletor.split(',').map((x) => x.trim())) {
      const k = `${r.contexto}||${s}`; const m = mapa.get(k) ?? mapa.set(k, new Map()).get(k);
      for (const [p, v] of r.decls) m.set(p, norm(v));
    }
  }
  return mapa;
}

export function compararCss(antes, depois, { removidosOk = [] } = {}) {
  const A = mapaFinal(antes), B = mapaFinal(depois), rel = { igual: 0, removidos: [], novos: [], mudou: [], estados: 0 };
  const ehEstado = (s) => /:(hover|focus|active|focus-visible|focus-within)|::?placeholder|::-webkit|\[hidden\]|:(first|last)-child/.test(s);
  for (const [k, ma] of A) {
    const mb = B.get(k);
    const sel = k.split('||')[1];
    if (!mb) { rel.removidos.push(k); continue; }
    const dif = [];
    for (const [p, v] of ma) if (mb.get(p) !== v) dif.push(`${p}: ${v} -> ${mb.get(p) ?? '(ausente)'}`);
    for (const [p, v] of mb) if (!ma.has(p)) dif.push(`${p}: (ausente) -> ${v}`);
    if (dif.length) rel.mudou.push({ k, dif }); else { rel.igual++; if (ehEstado(sel)) rel.estados++; }
  }
  for (const k of B.keys()) if (!A.has(k)) rel.novos.push(k);
  rel.removidosOk = rel.removidos.filter((k) => removidosOk.some((x) => k.endsWith(`||${x}`)));
  rel.removidos = rel.removidos.filter((k) => !rel.removidosOk.includes(k));
  return rel;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const a = process.argv[2] ?? path.join(aqui, 'css-antes.css'), b = process.argv[3] ?? path.join(aqui, '..', '..', '..', 'assets', 'css', 'style.css');
  const { analisar } = await import('./css-analise.mjs');
  const semUso = analisar().semUso.map((x) => x.seletor);
  const r = compararCss(fs.readFileSync(a, 'utf8'), fs.readFileSync(b, 'utf8'), { removidosOk: process.argv.includes('--antigo-sem-uso') ? semUso : [] });
  console.log(`regras iguais: ${r.igual} (das quais ${r.estados} de estado: hover/foco/placeholder...) | mudaram: ${r.mudou.length} | sumiram: ${r.removidos.length} | novas: ${r.novos.length}`);
  for (const m of r.mudou) console.log(`  MUDOU ${m.k.replace('||', '  ')}\n      ${m.dif.join('\n      ')}`);
  for (const k of r.removidos) console.log(`  SUMIU ${k.replace('||', '  ')}`);
  for (const k of r.novos) console.log(`  NOVA  ${k.replace('||', '  ')}`);
}
