// Analise estatica do CSS (sem dependencias). Usada pelo teste "css" e pode ser rodada sozinha: node css-analise.mjs [--detalhes]
// Entende comentarios, blocos @media/@supports aninhados, @keyframes e @font-face.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { paginasHtml, ler, raiz, todosOsArquivos } from './lib.mjs';

/** divide o CSS em regras: { contexto: '@media (max-width: 700px)' | '', seletor, decls: [[prop, valor]], linha } */
export function lerCss(texto) {
  const regras = [], semComentarios = texto.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')); // mantem as linhas
  const linhaDe = (i) => semComentarios.slice(0, i).split('\n').length;
  function bloco(ini, fim, contexto) {
    let i = ini;
    while (i < fim) {
      while (i < fim && /\s/.test(semComentarios[i])) i++;
      if (i >= fim) break;
      if (semComentarios[i] === '@') {
        const fimCab = semComentarios.slice(i, fim).search(/[{;]/); if (fimCab < 0) break;
        const cab = semComentarios.slice(i, i + fimCab).trim();
        if (semComentarios[i + fimCab] === ';') { regras.push({ contexto, seletor: cab, decls: [], linha: linhaDe(i), tipo: 'at' }); i += fimCab + 1; continue; }
        let prof = 1, j = i + fimCab + 1;
        while (j < fim && prof) { if (semComentarios[j] === '{') prof++; else if (semComentarios[j] === '}') prof--; j++; }
        const corpo = [i + fimCab + 1, j - 1];
        if (/^@(media|supports|layer|container)/.test(cab)) bloco(corpo[0], corpo[1], contexto ? `${contexto} ${cab}` : cab);
        else if (/^@keyframes/.test(cab)) regras.push({ contexto, seletor: cab, decls: [], linha: linhaDe(i), tipo: 'keyframes', bruto: semComentarios.slice(i, j).replace(/\s+/g, ' ').trim() });
        else regras.push({ contexto, seletor: cab, decls: declaracoes(semComentarios.slice(corpo[0], corpo[1])), linha: linhaDe(i), tipo: 'at' });
        i = j; continue;
      }
      const abre = semComentarios.indexOf('{', i); if (abre < 0 || abre >= fim) break;
      let prof = 1, j = abre + 1;
      while (j < fim && prof) { if (semComentarios[j] === '{') prof++; else if (semComentarios[j] === '}') prof--; j++; }
      regras.push({ contexto, seletor: semComentarios.slice(i, abre).trim().replace(/\s+/g, ' '), decls: declaracoes(semComentarios.slice(abre + 1, j - 1)), linha: linhaDe(i), tipo: 'regra' });
      i = j;
    }
  }
  bloco(0, semComentarios.length, '');
  return regras;
}
function declaracoes(corpo) {
  const out = [];
  for (const parte of corpo.split(/;(?![^(]*\))/)) {
    const i = parte.indexOf(':'); if (i < 0) continue;
    const prop = parte.slice(0, i).trim().toLowerCase(), valor = parte.slice(i + 1).trim().replace(/\s+/g, ' ');
    if (prop) out.push([prop, valor]);
  }
  return out;
}

/** o que o site usa de verdade: classes e ids que aparecem em atributos class/id, em classList, em seletores de JS e nos modelos do gerador */
export function usoNoSite() {
  const fontes = [...paginasHtml().map((r) => ler(r)), ...todosOsArquivos('assets/js').map((r) => ler(r)), ...todosOsArquivos('_ferramentas/gerador').filter((r) => r.endsWith('.mjs')).map((r) => ler(r))].join('\n');
  const classes = new Set(), ids = new Set();
  // class="a b ${cond ? ' c' : ''}": as classes soltas e as que os modelos do gerador acrescentam dentro de ${...}
  for (const m of fontes.matchAll(/\bclass(?:Name)?\s*=\s*["'`]([^"'`]*(?:\$\{[^}]*\}[^"'`]*)*)["'`]/g)) {
    for (const c of m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/)) if (c) classes.add(c);
    for (const e of m[1].matchAll(/\$\{([^}]*)\}/g)) for (const s of e[1].matchAll(/['"`]\s*([A-Za-z_][\w-]*(?:\s+[A-Za-z_][\w-]*)*)/g)) for (const c of s[1].split(/\s+/)) classes.add(c);
  }
  for (const m of fontes.matchAll(/classList\.\w+\(\s*["'`]([^"'`]+)["'`]/g)) classes.add(m[1]);
  for (const m of fontes.matchAll(/\bid\s*=\s*["'`]([^"'`]+)["'`]/g)) ids.add(m[1]);
  for (const m of fontes.matchAll(/(?:querySelector(?:All)?|getElementById|closest|matches)\(\s*["'`]([^"'`]+)["'`]/g)) {
    for (const c of m[1].matchAll(/\.([A-Za-z_][\w-]*)/g)) classes.add(c[1]);
    for (const c of m[1].matchAll(/#([A-Za-z_][\w-]*)/g)) ids.add(c[1]);
    if (!/[.#\[\s]/.test(m[1])) ids.add(m[1]);
  }
  // classes que o JS/gerador acrescentam por texto solto (ex.: 'on', 'active', 'is-short')
  for (const m of fontes.matchAll(/\b(?:className|class)\s*(?:\+?=|:)\s*[^;\n]*?['"`]\s*([A-Za-z_][\w-]*)\s*['"`]/g)) classes.add(m[1]);
  return { classes, ids };
}

export function analisar(rel = 'assets/css/style.css') {
  const css = ler(rel), regras = lerCss(css);
  const so = regras.filter((r) => r.tipo === 'regra');
  const r = { arquivo: rel, bytes: Buffer.byteLength(css), linhas: css.split('\n').length, regras: so.length };

  // 1) seletor repetido no mesmo contexto
  const grupos = new Map();
  for (const x of so) { const k = `${x.contexto}||${x.seletor}`; (grupos.get(k) ?? grupos.set(k, []).get(k)).push(x); }
  r.repetidos = [...grupos.values()].filter((g) => g.length > 1).map((g) => ({ seletor: g[0].seletor, contexto: g[0].contexto, linhas: g.map((x) => x.linha) }));

  // 2) propriedade definida de novo (a anterior nunca vale)
  r.sobrescritas = [];
  for (const g of grupos.values()) {
    if (g.length < 2) continue;
    const visto = new Map();
    for (const x of g) for (const [p] of x.decls) { if (visto.has(p)) r.sobrescritas.push({ seletor: x.seletor, contexto: x.contexto, prop: p, linhas: [visto.get(p), x.linha] }); visto.set(p, x.linha); }
  }

  // 3) seletores sem uso (todas as classes/ids/tags do seletor precisam existir em algum lugar do site)
  const { classes, ids } = usoNoSite();
  r.semUso = [];
  for (const x of so) {
    for (const sel of x.seletor.split(',').map((s) => s.trim())) {
      const faltando = [...[...sel.matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]).filter((n) => !classes.has(n)), ...[...sel.matchAll(/#([A-Za-z_][\w-]*)/g)].map((m) => m[1]).filter((n) => !ids.has(n))];
      if (faltando.length) r.semUso.push({ seletor: sel, contexto: x.contexto, linha: x.linha, faltando });
    }
  }

  // 4) cores soltas fora de :root
  const cores = new Map();
  for (const x of so) {
    if (/^:root$/.test(x.seletor)) continue;
    for (const [, v] of x.decls) for (const m of v.matchAll(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g)) cores.set(m[0].toLowerCase(), (cores.get(m[0].toLowerCase()) ?? 0) + 1);
  }
  r.cores = [...cores].sort((a, b) => b[1] - a[1]);

  // 5) pontos de mudanca, !important, tamanhos em px de fonte, foco, movimento
  r.breakpoints = {};
  for (const x of regras) for (const m of (x.contexto || '').matchAll(/\(((?:max|min)-width):\s*(\d+)px\)/g)) { const k = `${m[1]}:${m[2]}`; r.breakpoints[k] = (r.breakpoints[k] ?? 0) + 1; }
  r.important = so.flatMap((x) => x.decls.filter(([, v]) => /!important/.test(v)).map(([p]) => `${x.seletor} { ${p} }`));
  r.fontePx = so.flatMap((x) => x.decls.filter(([p, v]) => p === 'font-size' && /\d+px/.test(v)).map(([, v]) => `${x.seletor}: ${v}`));
  r.outlineNenhum = so.filter((x) => x.decls.some(([p, v]) => /^outline(-style)?$/.test(p) && /^(none|0)$/.test(v))).map((x) => x.seletor);
  r.focoVisivel = so.filter((x) => /:focus(-visible|-within)?\b/.test(x.seletor)).map((x) => x.seletor);
  r.movimentoReduzido = regras.some((x) => /prefers-reduced-motion/.test(x.contexto));
  r.cor = { prefersColorScheme: regras.some((x) => /prefers-color-scheme/.test(x.contexto)), colorScheme: so.some((x) => x.decls.some(([p]) => p === 'color-scheme')) };
  r.impressao = regras.some((x) => /@media print/.test(x.contexto));
  r.zindex = so.flatMap((x) => x.decls.filter(([p]) => p === 'z-index').map(([, v]) => `${x.seletor}: ${v}`));
  r.absolutos = so.filter((x) => x.decls.some(([p, v]) => p === 'position' && v === 'absolute')).map((x) => x.seletor);
  r.blocosMedia = new Set(regras.filter((x) => x.contexto).map((x) => x.contexto)).size;
  r.importExterno = regras.filter((x) => x.tipo === 'at' && /^@import/.test(x.seletor)).map((x) => x.seletor);
  return r;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const r = analisar(); const det = process.argv.includes('--detalhes');
  console.log(`${r.arquivo}: ${r.linhas} linhas, ${(r.bytes / 1024).toFixed(1)} KB, ${r.regras} regras`);
  console.log(`seletores repetidos no mesmo contexto: ${r.repetidos.length}${det ? '\n' + r.repetidos.map((x) => `  ${x.seletor} ${x.contexto ? `[${x.contexto}]` : ''} linhas ${x.linhas.join(', ')}`).join('\n') : ''}`);
  console.log(`propriedades sobrescritas (valor anterior morto): ${r.sobrescritas.length}${det ? '\n' + r.sobrescritas.map((x) => `  ${x.seletor} { ${x.prop} } linhas ${x.linhas.join(' -> ')}`).join('\n') : ''}`);
  console.log(`seletores com classe/id que nao aparece no site: ${r.semUso.length}${det ? '\n' + r.semUso.map((x) => `  ${x.seletor} (linha ${x.linha}) sem: ${x.faltando.join(', ')}`).join('\n') : ''}`);
  console.log(`cores escritas fora de :root: ${r.cores.length} valores distintos, ${r.cores.reduce((s, c) => s + c[1], 0)} usos${det ? '\n' + r.cores.map(([c, n]) => `  ${n}x ${c}`).join('\n') : ''}`);
  console.log(`pontos de mudanca de layout: ${Object.entries(r.breakpoints).map(([k, n]) => `${k}(${n}x)`).join(' ')}`);
  console.log(`!important: ${r.important.length} | font-size em px: ${r.fontePx.length} | outline:none: ${r.outlineNenhum.join(', ') || 'nenhum'} | regras de foco: ${r.focoVisivel.length}`);
  console.log(`movimento reduzido: ${r.movimentoReduzido} | color-scheme: ${r.cor.colorScheme} | prefers-color-scheme: ${r.cor.prefersColorScheme} | impressao: ${r.impressao} | @import externo: ${r.importExterno.length}`);
  console.log(`z-index: ${r.zindex.join(' | ')}\nposition:absolute em: ${r.absolutos.join(', ')}`);
}
