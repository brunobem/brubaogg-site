// Fluxo de conteudo (duas sessoes, aprovacao em lote, videos antigos, IDs digitados a mao). Roda em copias; o site nao e tocado.
// Lento (~30 s): so roda com --so=fluxo.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { achado, aprovada, assuntosDoSite, materias, raiz } from './lib.mjs';

const T = 'fluxo';
const CATS = ['noticias', 'reviews', 'lancamentos', 'gta6-novidades'];

const copiar = () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-fluxo-'));
  fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (s) => !/node_modules|[\\/]\.git([\\/]|$)/.test(s) });
  return tmp;
};
const rodar = (tmp, script, args = []) => {
  const r = spawnSync(process.execPath, [`_ferramentas/${script}`, ...args], { cwd: tmp, encoding: 'utf8', timeout: 90000 });
  return { status: r.status, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() };
};
const mat = (tmp, id) => path.join(tmp, '_conteudo', 'materias', `${id}.json`);
const ler = (f) => JSON.parse(fs.readFileSync(f, 'utf8'));
const escrever = (f, o) => fs.writeFileSync(f, typeof o === 'string' ? o : JSON.stringify(o, null, 2));
const paginasDaMateria = (tmp, id) => { for (const c of CATS) { const d = path.join(tmp, c); if (!fs.existsSync(d)) continue; for (const f of fs.readdirSync(d)) { const h = fs.readFileSync(path.join(d, f), 'utf8'); if (h.includes(`embed/${id}`) && !h.includes('http-equiv="refresh"')) return `${c}/${f}`; } } return null; };
const paginas = (tmp) => CATS.flatMap((c) => (fs.existsSync(path.join(tmp, c)) ? fs.readdirSync(path.join(tmp, c)).map((f) => `${c}/${f}`) : []));

export default async function () {
  const a = [];
  const ms = materias().filter(aprovada);
  const base = ms.find((m) => m.dados.formato === 'horizontal');
  const feed = JSON.parse(fs.readFileSync(path.join(raiz, 'assets/data/playlists.json'), 'utf8'));
  const idsFeed = new Set(Object.values(feed).flat().map((v) => v.id));

  // 1) campos de video antigo em um video que JA esta no feed e discordam dele: silencio?
  {
    const tmp = copiar();
    try {
      const catDoRegistro = ler(path.join(tmp, '_conteudo/enderecos.json'))[base.id]?.categoria; // a categoria escrita tem de DISCORDAR da registrada, senao nao ha o que avisar
      const f = mat(tmp, base.id); escrever(f, { ...ler(f), categoria: catDoRegistro === 'reviews' ? 'noticias' : 'reviews', publicado: '2020-01-01' });
      const r = rodar(tmp, 'gerar-site.mjs');
      if (r.status === 0 && !/AVISOS[\s\S]*categoria/.test(r.saida) && !/ignor/i.test(r.saida)) a.push(achado('medio', T, '[videos antigos] "categoria"/"publicado" que discordam do feed sao ignorados em silencio (nem aviso)'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 2) data de publicacao absurda (futuro / antes do YouTube existir)
  for (const [rotulo, data] of [['no futuro (2062)', '2062-10-07'], ['antes de 2005', '1999-01-01']]) {
    const tmp = copiar();
    try {
      escrever(mat(tmp, 'SIMdata00001'), { ...ler(mat(tmp, base.id)), categoria: 'noticias', publicado: data, titulo: 'Materia de teste de data' });
      const r = rodar(tmp, 'gerar-site.mjs');
      if (r.status === 0) a.push(achado('alto', T, `[videos antigos] "publicado" ${rotulo} e aceito (a materia ficaria fixa no topo das listas)`));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 3) IDs digitados a mao
  {
    const tmp = copiar();
    try {
      escrever(path.join(tmp, 'fora.json'), { status: 'rascunho', formato: 'short', resumo: 'x', corpo: ['y'] });
      const r1 = rodar(tmp, 'aprovar-materia.mjs', ['../../fora']);
      if (!('status' in ler(path.join(tmp, 'fora.json')))) a.push(achado('medio', T, '[comandos] aprovar aceita caminho com "../" e altera arquivo FORA da pasta de materias'));
      // URL do YouTube no lugar do ID (copiar e colar do navegador)
      const id = base.id, f = mat(tmp, id);
      escrever(f, { ...ler(f), status: 'rascunho' });
      const r2 = rodar(tmp, 'aprovar-materia.mjs', [`https://www.youtube.com/watch?v=${id}`]);
      if (/status/.test(fs.readFileSync(f, 'utf8'))) a.push(achado('baixo', T, '[comandos] aprovar/nova/formato nao aceitam o link do YouTube no lugar do ID (copiar e colar do navegador falha)'));
      const r3 = rodar(tmp, 'nova-materia.mjs', ['abc def']);
      if (r3.status === 0 || fs.existsSync(mat(tmp, 'abc def'))) a.push(achado('alto', T, '[comandos] nova criou arquivo para um ID invalido'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 4) aprovar em lote (--todos) sem confirmar
  {
    const tmp = copiar();
    try {
      let n = 0;
      for (const m of ms.slice(0, 3)) { const f = mat(tmp, m.id); escrever(f, { ...ler(f), status: 'rascunho' }); n++; }
      const r = rodar(tmp, 'aprovar-materia.mjs', ['--todos']);
      const aprovadas = ms.slice(0, 3).filter((m) => !('status' in ler(mat(tmp, m.id)))).length;
      if (aprovadas === n) a.push(achado('medio', T, `[aprovacao] "aprovar --todos" publica ${n} rascunhos de uma vez, sem mostrar a lista nem pedir confirmacao (com 30 rascunhos por dia, um comando so publica tudo sem revisar)`));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 5) outra sessao regrava como rascunho uma materia que ja esta no ar: a pagina some sem aviso?
  {
    const tmp = copiar();
    try {
      const f = mat(tmp, base.id); escrever(f, { ...ler(f), status: 'rascunho' });
      const antes = paginas(tmp).length;
      const r = rodar(tmp, 'gerar-site.mjs');
      const depois = paginas(tmp).length;
      if (depois < antes && !/ATENCAO.*NAO sera/is.test(r.saida)) a.push(achado('alto', T, '[duas sessoes] uma materia ja publicada volta para "rascunho" (ex.: a sessao de conteudo regravou o arquivo) e a pagina e APAGADA sem nenhum aviso: o endereco ja indexado vira 404'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 6) arquivo meio escrito de um rascunho (a outra sessao ainda gravando)
  {
    const tmp = copiar();
    try {
      escrever(mat(tmp, 'SIMmeio000001'), '{"status":"rascunho","resumo":"x","corpo":["a"');
      const r = rodar(tmp, 'gerar-site.mjs');
      if (r.status !== 0) a.push(achado('medio', T, '[duas sessoes] um rascunho ainda sendo gravado (JSON incompleto) derruba a geracao do site inteiro, mesmo sem ser publicado'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 7) pendentes enxerga rascunhos de videos antigos (fora do feed)?
  {
    const tmp = copiar();
    try {
      escrever(mat(tmp, 'SIMantigo0001'), { status: 'rascunho', formato: 'horizontal', categoria: 'noticias', publicado: '2026-03-10', titulo: 'Rascunho de video antigo para teste', resumo: 'x', corpo: ['y'] });
      const r = rodar(tmp, 'pendentes.mjs');
      if (!/SIMantigo0001|Rascunho de video antigo/.test(r.saida)) a.push(achado('alto', T, '[videos antigos] "npm run pendentes" nao mostra rascunhos de videos fora do feed dos 15 recentes: o legado (30 por dia) fica invisivel e sem como aprovar com seguranca'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 8) videos saem do feed (os 3 mais antigos): as materias tem de continuar, com o MESMO endereco
  {
    const tmp = copiar();
    try {
      const antes = paginas(tmp).filter((p) => !p.includes('refresh')).sort();
      const pl = path.join(tmp, 'assets/data/playlists.json'); const p = ler(pl);
      const noticias = Object.keys(p).find((k) => p[k].length === 15 && p[k].some((v) => ms.some((m) => m.id === v.id)));
      const idsSaindo = p[noticias].slice().sort((x, y) => y.published.localeCompare(x.published)).slice(-3).map((v) => v.id);
      p[noticias] = p[noticias].filter((v) => !idsSaindo.includes(v.id)); escrever(pl, p);
      const r = rodar(tmp, 'gerar-site.mjs');
      if (r.status !== 0) a.push(achado('critico', T, `[feed] 3 materias sairam do feed e o gerador PAROU: ${r.saida.slice(0, 160)}`));
      else if (!antes.every((pg) => fs.existsSync(path.join(tmp, pg)))) a.push(achado('critico', T, '[feed] materias que sairam do feed perderam a pagina ou mudaram de endereco'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 9) teste A/B no YouTube (o titulo do VIDEO muda no feed) e edicao do titulo da materia: o endereco nao pode mudar
  {
    const tmp = copiar();
    try {
      const antes = paginasDaMateria(tmp, base.id);
      const pl = path.join(tmp, 'assets/data/playlists.json'); const p = ler(pl);
      for (const lista of Object.values(p)) for (const v of lista) if (v.id === base.id) v.title = 'Titulo totalmente diferente do teste A/B';
      escrever(pl, p);
      const f = mat(tmp, base.id); escrever(f, { ...ler(f), titulo: 'Outro titulo editado depois da publicacao' });
      const r = rodar(tmp, 'gerar-site.mjs');
      if (r.status !== 0) a.push(achado('alto', T, `[endereco] o gerador falhou ao mudar titulos: ${r.saida.slice(0, 140)}`));
      else if (paginasDaMateria(tmp, base.id) !== antes) a.push(achado('critico', T, '[endereco] mudar o titulo (do video ou da materia) MUDOU o endereco ja publicado'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 10) aprovar cria o endereco a partir do titulo da materia; retirar leva para a lista (nao vira 404)
  {
    const tmp = copiar();
    try {
      const novo = Object.values(feed).flat().find((v) => !fs.existsSync(mat(tmp, v.id)) && !fs.existsSync(path.join(tmp, '_conteudo', 'wiki', `${v.id}.json`))); // video sem texto em NENHUMA das duas pastas (materias e Wiki)
      escrever(mat(tmp, novo.id), { formato: 'horizontal', status: 'rascunho', titulo: 'Titulo da Materia Nova, Com Acentuacao e Pontuacao!', resumo: 'Resumo da materia nova.', tags: [], corpo: ['Um paragrafo de verdade.'] });
      const r1 = rodar(tmp, 'aprovar-materia.mjs', [novo.id]);
      const reg = ler(path.join(tmp, '_conteudo/enderecos.json'))[novo.id];
      if (!reg || !/^titulo-da-materia-nova-com-acentuacao-e-pontuacao$/.test(reg.slug)) a.push(achado('alto', T, `[endereco] aprovar nao registrou o endereco pelo titulo da materia (registrou ${reg?.slug})`));
      rodar(tmp, 'gerar-site.mjs');
      if (!fs.existsSync(path.join(tmp, reg?.categoria ?? 'x', `${reg?.slug}.html`))) a.push(achado('alto', T, '[endereco] a materia aprovada nao gerou pagina'));
      rodar(tmp, 'retirar-materia.mjs', [novo.id]); rodar(tmp, 'gerar-site.mjs');
      const stub = path.join(tmp, reg.categoria, `${reg.slug}.html`);
      if (!fs.existsSync(stub) || !/http-equiv="refresh"/.test(fs.readFileSync(stub, 'utf8'))) a.push(achado('alto', T, '[endereco] materia retirada nao virou redirecionamento (o link daria 404)'));
      if (rodar(tmp, 'verificar-links.mjs').status !== 0) a.push(achado('alto', T, '[endereco] o verificar acusou problema depois de aprovar e retirar uma materia'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  // 11) retirar --para: o Short que virou anexo de uma review leva para a review; o texto vai para _conteudo/retiradas (nao e apagado); destinos invalidos sao recusados
  {
    const tmp = copiar();
    try {
      const regDe = () => ler(path.join(tmp, '_conteudo/enderecos.json'));
      const { membroDe } = assuntosDoSite(); // materias que viraram bloco de uma pagina de assunto nao tem pagina propria: ficam de fora da escolha
      const [origem, destino, origem2] = ms.filter((m) => m.id !== base.id && !membroDe.has(m.id)).slice(0, 3).map((m) => m.id);
      const texto = fs.readFileSync(mat(tmp, origem), 'utf8');
      const recusados = [
        ['destino inexistente', [origem, '--para', 'ZZZZZZZZZZZ']],
        ['destino igual a propria materia', [origem, '--para', origem]],
        ['--para sem valor', [origem, '--para']],
      ].filter(([, args]) => { const r = rodar(tmp, 'retirar-materia.mjs', args); return r.status === 0 || !/destino|Uso:/.test(r.saida) || /\n\s+at /.test(r.saida); }).map(([nome]) => nome); // recusar = sair com erro E explicar (um travamento com pilha nao conta)
      if (recusados.length) a.push(achado('alto', T, `[retirar --para] nao recusou com uma mensagem clara: ${recusados.join(', ')}`));
      if (regDe()[origem].retirada) a.push(achado('alto', T, '[retirar --para] uma tentativa recusada ja retirou a materia'));
      const r1 = rodar(tmp, 'retirar-materia.mjs', [origem, '--para', destino]);
      const e = regDe()[origem], d = regDe()[destino];
      if (r1.status !== 0 || !e.retirada || e.para !== destino) a.push(achado('alto', T, `[retirar --para] nao registrou a retirada com destino (${r1.saida.slice(0, 120)})`));
      if (fs.existsSync(mat(tmp, origem))) a.push(achado('alto', T, '[retirar --para] o arquivo da materia continua em _conteudo/materias'));
      const arquivada = path.join(tmp, '_conteudo', 'retiradas', `${origem}.json`);
      if (!fs.existsSync(arquivada) || fs.readFileSync(arquivada, 'utf8') !== texto) a.push(achado('critico', T, '[retirar --para] o texto da materia retirada nao foi guardado em _conteudo/retiradas (perda de conteudo)'));
      const g = rodar(tmp, 'gerar-site.mjs');
      const stub = path.join(tmp, e.categoria, `${e.slug}.html`), html = fs.existsSync(stub) ? fs.readFileSync(stub, 'utf8') : '';
      if (g.status !== 0) a.push(achado('alto', T, `[retirar --para] o gerador falhou depois da retirada: ${g.saida.slice(-160)}`));
      else if (!html.includes(`<meta http-equiv="refresh" content="0; url=/${d.categoria}/${d.slug}.html">`)) a.push(achado('alto', T, `[retirar --para] ${e.categoria}/${e.slug}.html devia levar para ${d.categoria}/${d.slug}.html`));
      if (!fs.existsSync(path.join(tmp, d.categoria, `${d.slug}.html`))) a.push(achado('alto', T, '[retirar --para] a pagina de destino deixou de existir'));
      if (rodar(tmp, 'verificar-links.mjs').status !== 0) a.push(achado('alto', T, '[retirar --para] o verificar acusou problema depois da retirada'));
      // destino que virou bloco de uma pagina de assunto: o endereco retirado leva para o bloco dele (com a ancora), nao para uma pagina que nao existe mais
      const [idBloco, unidade] = [...membroDe][0] ?? [];
      if (idBloco) {
        const r2 = rodar(tmp, 'retirar-materia.mjs', [origem2, '--para', idBloco]), e2 = regDe()[origem2];
        const g2 = rodar(tmp, 'gerar-site.mjs'), stub2 = path.join(tmp, e2.categoria, `${e2.slug}.html`);
        if (r2.status !== 0 || g2.status !== 0) a.push(achado('alto', T, `[retirar --para] falhou com destino que e bloco de assunto: ${(r2.status !== 0 ? r2 : g2).saida.slice(-160)}`));
        else if (!fs.existsSync(stub2) || !fs.readFileSync(stub2, 'utf8').includes(`<meta http-equiv="refresh" content="0; url=/${unidade.pagina}#v-${idBloco}">`)) a.push(achado('alto', T, `[retirar --para] o endereco retirado devia levar para /${unidade.pagina}#v-${idBloco} (o bloco do video de destino)`));
        if (rodar(tmp, 'verificar-links.mjs').status !== 0) a.push(achado('alto', T, '[retirar --para] o verificar acusou problema com destino que e bloco de assunto'));
      }
      if (rodar(tmp, 'retirar-materia.mjs', [destino, '--para', origem]).status === 0) a.push(achado('alto', T, '[retirar --para] aceitou como destino uma materia ja retirada'));
      // o arquivo volta para _conteudo/materias: o gerador avisa (nao republica sozinho)
      fs.writeFileSync(mat(tmp, origem), texto); // o arquivo volta para _conteudo/materias
      if (rodar(tmp, 'gerar-site.mjs').status === 0) a.push(achado('alto', T, '[retirar --para] o arquivo voltou para _conteudo/materias e o gerador nao reclamou da materia retirada'));
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  a.push(achado('info', T, '11 grupos de cenarios do fluxo de conteudo rodados em copias'));
  return a;
}
