// Tenta quebrar o gerador com dados hostis (em copias temporarias; o site nao e tocado). E mais lento (~30 s): so roda com --so=fuzz.
// Cada cenario diz o que DEVERIA acontecer; o achado aparece quando o gerador faz outra coisa.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { achado, aprovada, materias, raiz } from './lib.mjs';

const T = 'fuzz';
const CATS = ['noticias', 'reviews', 'lancamentos', 'gta6-novidades'];

function copiar() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-fuzz-'));
  fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (s) => !/node_modules|[\\/]\.git([\\/]|$)/.test(s) });
  return tmp;
}
const gerar = (tmp, env = {}) => {
  const r = spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', timeout: 60000, env: { ...process.env, ...env } });
  return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim(), estourou: r.error?.code === 'ETIMEDOUT' };
};
function paginaDe(tmp, id) {
  for (const c of CATS) {
    const dir = path.join(tmp, c);
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) { const t = fs.readFileSync(path.join(dir, f), 'utf8'); if (t.includes(`embed/${id}`) && !t.includes('http-equiv="refresh"')) return { rel: `${c}/${f}`, html: t }; }
  }
  return null;
}

export default async function () {
  const a = [];
  const base = materias().find((m) => aprovada(m) && m.dados.formato === 'horizontal' && !(m.dados.corpo ?? []).some((p) => p.length > 5000));
  const id = base.id, arq = `_conteudo/materias/${id}.json`, original = base.dados;

  // cada cenario: muda o JSON da materia base (ou outra coisa) e confere o resultado
  const cenarios = [
    { n: 'JSON truncado', raw: '{"resumo":"x","corpo":["a"', quer: 'falha-clara', cita: id },
    { n: 'JSON com BOM (PowerShell 5.1 grava assim)', raw: '\uFEFF' + JSON.stringify(original, null, 2), quer: 'ok', sev: 'alto' },
    { n: 'corpo e um texto, nao uma lista', muda: (d) => ({ ...d, corpo: 'um paragrafo so' }), quer: 'falha-clara', cita: id },
    { n: 'corpo com paragrafo vazio', muda: (d) => ({ ...d, corpo: [...d.corpo, ''] }), quer: 'falha-clara', cita: id },
    { n: 'tags e um texto ("GTA 6"), nao uma lista', muda: (d) => ({ ...d, tags: 'GTA 6' }), quer: 'falha-clara', cita: id },
    { n: 'tags e um objeto', muda: (d) => ({ ...d, tags: { a: 1 } }), quer: 'falha-clara', cita: id },
    { n: 'titulo vazio ("")', muda: (d) => ({ ...d, titulo: '' }), quer: 'falha-clara', cita: id },
    { n: 'titulo so com simbolos', muda: (d) => ({ ...d, titulo: '???' }), quer: 'pagina', ok: (h) => /<h1 class="art-title">\?\?\?<\/h1>/.test(h), msg: 'titulo nao chegou na pagina' },
    { n: 'resumo gigante (6.000 caracteres)', muda: (d) => ({ ...d, resumo: 'palavra '.repeat(750) }), quer: 'pagina', ok: (h) => ((h.match(/<meta name="description" content="([^"]*)"/) ?? [])[1] ?? '').length <= 200, msg: 'meta description com milhares de caracteres' },
    { n: 'titulo de 400 caracteres', muda: (d) => ({ ...d, titulo: 'Titulo enorme '.repeat(30) }), quer: 'pagina', ok: (h) => ((h.match(/<title>([^<]*)<\/title>/) ?? [])[1] ?? '').length <= 110, msg: '<title> com centenas de caracteres' },
    { n: 'materia aprovada com [CONFERIR]', muda: (d) => ({ ...d, corpo: [...d.corpo, 'Trecho [CONFERIR: data] ainda sem confirmar.'] }), quer: 'falha-clara', cita: id },
    { n: 'materia aprovada com o texto de modelo do npm run nova', muda: (d) => ({ ...d, resumo: 'Escreva 1 ou 2 frases que aparecem na lista de matérias.', corpo: ['Primeiro parágrafo.', 'Segundo parágrafo.'] }), quer: 'falha-clara', cita: id },
    { n: 'formato ausente em materia aprovada', muda: (d) => { const { formato, ...resto } = d; return resto; }, quer: 'falha-clara', cita: id },
    { n: 'formato invalido ("vertical")', muda: (d) => ({ ...d, formato: 'vertical' }), quer: 'falha-clara', cita: id },
    { n: 'titulo longo (80) gera aviso, nao erro', muda: (d) => ({ ...d, titulo: 'Titulo comprido para testar o aviso editorial do gerador ' + 'x'.repeat(24) }), quer: 'aviso', cita: id },
    { n: 'HTML/aspas/emoji no texto', muda: (d) => ({ ...d, titulo: 'A <script>alert(1)</script> "aspas" & 🔥', resumo: '<img src=x onerror=alert(1)> resumo', tags: ['<b>tag</b>'], corpo: ['para <i>x</i> & "y" \'z\' 🎮'] }), quer: 'pagina', ok: (h) => !/<script>alert|<img src=x|<b>tag|<i>x<\/i>/.test(h), msg: 'texto com HTML sai SEM escapar na pagina (injecao)', sev: 'critico' },
    { n: 'status "Rascunho" (R maiusculo)', muda: (d) => ({ ...d, status: 'Rascunho' }), quer: 'nao-publica', msg: 'publicaria um rascunho escrito com maiuscula', sev: 'alto' },
    { n: 'status "draft"', muda: (d) => ({ ...d, status: 'draft' }), quer: 'nao-publica-ou-erro', msg: 'publica com status desconhecido em vez de recusar', sev: 'alto' },
    { n: 'status true', muda: (d) => ({ ...d, status: true }), quer: 'nao-publica-ou-erro', msg: 'publica com status desconhecido em vez de recusar', sev: 'alto' },
    { n: 'duas materias com o mesmo titulo', outro: (tmp, d) => { fs.writeFileSync(path.join(tmp, '_conteudo/materias/SIMdup00001.json'), JSON.stringify({ ...d, categoria: 'noticias', publicado: '2026-10-01' })); }, quer: 'duas-paginas', msg: 'duas materias com o mesmo titulo se sobrescrevem' },
    { n: 'legado com "publicado" invalido', outro: (tmp, d) => { fs.writeFileSync(path.join(tmp, '_conteudo/materias/SIMdate0001.json'), JSON.stringify({ ...d, categoria: 'noticias', publicado: '2026-13-45' })); }, quer: 'falha-clara', cita: 'SIMdate0001' },
    { n: 'legado com categoria inexistente', outro: (tmp, d) => { fs.writeFileSync(path.join(tmp, '_conteudo/materias/SIMcat00001.json'), JSON.stringify({ ...d, categoria: 'jogos', publicado: '2026-10-01' })); }, quer: 'falha-clara', cita: 'SIMcat00001' },
    { n: 'campo desconhecido no JSON', muda: (d) => ({ ...d, algo: { qualquer: 'coisa' } }), quer: 'ok' },
    { n: 'tags.json com pai circular', arquivo: ['_conteudo/tags.json', (t) => JSON.stringify({ ...JSON.parse(t), a: { nome: 'A', pai: 'b' }, b: { nome: 'B', pai: 'a' } })], quer: 'ok' },
    { n: 'tags.json invalido', arquivo: ['_conteudo/tags.json', () => '{ "a": '], quer: 'falha-clara', cita: 'tags.json' },
    { n: 'playlists.json invalido', arquivo: ['assets/data/playlists.json', () => '{ "x": ['], quer: 'falha-clara', cita: 'playlists.json' },
    { n: 'sem nenhuma materia (0)', apagarTudo: true, quer: 'ok-vazio' },
    { n: 'sem internet (o gerador nao pode depender da rede)', offline: true, quer: 'sem-rede-ok', sev: 'alto' },
  ];

  for (const c of cenarios) {
    const tmp = copiar();
    try {
      const f = path.join(tmp, arq);
      if (c.raw != null) fs.writeFileSync(f, c.raw);
      else if (c.muda) fs.writeFileSync(f, JSON.stringify(c.muda(original), null, 2));
      if (c.outro) c.outro(tmp, original);
      if (c.arquivo) { const p = path.join(tmp, c.arquivo[0]); fs.writeFileSync(p, c.arquivo[1](fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '{}')); }
      if (c.apagarTudo) for (const x of fs.readdirSync(path.join(tmp, '_conteudo/materias'))) fs.rmSync(path.join(tmp, '_conteudo/materias', x));
      let env = {};
      if (c.offline) {
        fs.writeFileSync(path.join(tmp, 'sem-rede.mjs'), "globalThis.fetch = () => Promise.reject(Object.assign(new Error('fetch failed'), { cause: { code: 'ENOTFOUND' } }));\n");
        env = { NODE_OPTIONS: `--import ${path.join(tmp, 'sem-rede.mjs').replace(/\\/g, '/').replace(/^([A-Za-z]):/, 'file:///$1:')}` };
        fs.writeFileSync(path.join(tmp, '_conteudo/materias/SIMnovo00001.json'), JSON.stringify({ ...original, formato: 'short', categoria: 'noticias', publicado: '2026-10-01', titulo: 'Video novo gerado sem internet' }));
      }
      const r = gerar(tmp, env);
      const sev = c.sev ?? 'medio';
      const nome = `[${c.n}]`;
      if (r.estourou) { a.push(achado('critico', T, `${nome} o gerador travou (mais de 60 s)`)); continue; }
      const pag = paginaDe(tmp, id);
      switch (c.quer) {
        case 'falha-clara':
          if (r.status === 0) a.push(achado(sev === 'medio' ? 'alto' : sev, T, `${nome} deveria recusar com erro e seguiu gerando como se nada`));
          else if (!r.saida.includes(c.cita)) a.push(achado('medio', T, `${nome} o erro nao diz qual arquivo e o problema: "${r.saida.split('\n').find((l) => /Error|erro/i.test(l))?.slice(0, 110) ?? r.saida.slice(0, 110)}"`));
          break;
        case 'aviso':
          if (r.status !== 0) a.push(achado('alto', T, `${nome} deveria so avisar e o gerador falhou`));
          else if (!r.saida.includes('AVISOS') || !r.saida.includes(c.cita)) a.push(achado('medio', T, `${nome} nao mostrou o aviso`));
          break;
        case 'ok':
          if (r.status !== 0) a.push(achado(sev, T, `${nome} deveria funcionar e o gerador falhou: ${r.saida.split('\n').find((l) => /Error/.test(l))?.slice(0, 140) ?? r.saida.slice(0, 140)}`));
          break;
        case 'pagina':
          if (r.status !== 0) a.push(achado('alto', T, `${nome} o gerador falhou: ${r.saida.split('\n').find((l) => /Error/.test(l))?.slice(0, 140) ?? ''}`));
          else if (!pag) a.push(achado('alto', T, `${nome} a pagina da materia nao foi gerada`));
          else if (!c.ok(pag.html)) a.push(achado(sev, T, `${nome} ${c.msg}`));
          break;
        case 'nao-publica':
        case 'nao-publica-ou-erro':
          if (r.status === 0 && pag) a.push(achado(sev, T, `${nome} ${c.msg}`));
          break;
        case 'duas-paginas': {
          const n = CATS.flatMap((cat) => fs.existsSync(path.join(tmp, cat)) ? fs.readdirSync(path.join(tmp, cat)).filter((x) => x.endsWith('.html')) : []).length;
          const antes = CATS.flatMap((cat) => fs.existsSync(path.join(raiz, cat)) ? fs.readdirSync(path.join(raiz, cat)).filter((x) => x.endsWith('.html')) : []).length;
          if (r.status !== 0) a.push(achado('alto', T, `${nome} o gerador falhou`)); else if (n !== antes + 1) a.push(achado(sev, T, `${nome} ${c.msg} (${antes} paginas antes, ${n} depois; esperado ${antes + 1})`));
          break;
        }
        case 'ok-vazio':
          if (r.status !== 0) a.push(achado('alto', T, `${nome} com 0 materias o gerador falhou: ${r.saida.split('\n').find((l) => /Error/.test(l))?.slice(0, 140)}`));
          else {
            const sobras = CATS.filter((cat) => fs.existsSync(path.join(tmp, cat)));
            if (sobras.length) a.push(achado('medio', T, `${nome} sobraram pastas de materia: ${sobras.join(', ')}`));
            if (fs.existsSync(path.join(tmp, 'noticias.html'))) a.push(achado('medio', T, `${nome} sobrou noticias.html sem materias`));
          }
          break;
        case 'sem-rede-ok':
          if (r.status !== 0) a.push(achado(sev, T, `${nome} o gerador falhou sem internet: ${r.saida.slice(0, 160)}`));
          else if (!paginaDe(tmp, 'SIMnovo00001')) a.push(achado(sev, T, `${nome} a pagina da materia nova nao foi gerada sem internet`));
          break;
      }
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  // apagar uma materia remove a pagina e o resto do site continua igual?
  const tmp = copiar();
  try {
    const antes = new Map();
    for (const cat of CATS) for (const f of fs.existsSync(path.join(tmp, cat)) ? fs.readdirSync(path.join(tmp, cat)) : []) antes.set(`${cat}/${f}`, fs.statSync(path.join(tmp, cat, f)).mtimeMs);
    const pagina = paginaDe(tmp, id).rel;
    fs.rmSync(path.join(tmp, arq));
    const r = gerar(tmp);
    if (r.status !== 0) a.push(achado('alto', T, '[apagar uma materia] o gerador falhou'));
    else {
      if (fs.existsSync(path.join(tmp, pagina))) a.push(achado('alto', T, '[apagar uma materia] a pagina continuou no ar depois de apagar o JSON'));
      const tocadas = [...antes.keys()].filter((k) => k !== pagina && fs.existsSync(path.join(tmp, k)) && fs.statSync(path.join(tmp, k)).mtimeMs !== antes.get(k));
      a.push(achado('info', T, `[apagar uma materia] pagina removida; ${tocadas.length} outra(s) pagina(s) de materia reescrita(s) (relacionadas)`));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }

  a.push(achado('info', T, `${cenarios.length + 1} cenarios hostis rodados em copias`));
  return a;
}
