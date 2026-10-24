// Contrato dos arquivos de materia, do registro de enderecos e do tags.json.
// As regras obrigatorias vem do MESMO modulo que o gerador usa (_ferramentas/gerador/contrato.mjs): nao ha uma segunda copia para divergir.
// Aqui ficam so as conferencias extras (texto, repeticoes, coerencia entre os arquivos).
import { achado, aprovada, urlPublica, CATEGORIAS, conteudosDaWiki, existe, existeExato, ler, materias } from './lib.mjs';
import { LIMITE_DE_FONTES, LIMITE_DE_SHORTS } from '../../gerador/config.mjs';
import { classificarArquivo } from '../../gerador/imagens.mjs';
import { validarAssuntos, validarMateria, validarWiki } from '../../gerador/contrato.mjs';
import { slugBase } from '../../gerador/util.mjs';

const T = 'contrato';
const palavras = (s) => (s.match(/\S+/g) ?? []).length;

export default async function () {
  const a = [];
  const soMaterias = materias(), daWiki = conteudosDaWiki();
  const ms = [...soMaterias, ...daWiki.map((w) => ({ ...w, wiki: true }))]; // a Wiki segue as mesmas regras de texto das materias, mais as proprias (jogo, tipo, video opcional)
  const titulos = new Map(), resumos = new Map(), grafias = new Map();
  const registro = existe('_conteudo/enderecos.json') ? JSON.parse(ler('_conteudo/enderecos.json')) : null;
  const tagsCfg = existe('_conteudo/tags.json') ? (() => { try { return JSON.parse(ler('_conteudo/tags.json')); } catch { return {}; } })() : {};
  const idsDeVideo = new Set(soMaterias.map((m) => m.id));
  for (const w of daWiki) if (idsDeVideo.has(w.id)) a.push(achado('critico', T, `o nome ${w.id} existe em _conteudo/materias e em _conteudo/wiki (o endereco e um so)`, w.arq));

  for (const m of ms) {
    const onde = m.arq;
    if (!m.wiki && !/^[\w-]{11}$/.test(m.id)) a.push(achado('alto', T, 'o nome do arquivo deve ser o ID do video (11 caracteres)', onde));
    if (!m.dados) { a.push(achado('critico', T, `JSON invalido: ${m.erro}`, onde)); continue; }
    let d = m.dados;
    const pub = aprovada(m);
    if (d.status != null && d.status !== 'rascunho') a.push(achado('alto', T, `status invalido: ${JSON.stringify(d.status)} (so "rascunho" ou ausente)`, onde));

    // regras obrigatorias (as mesmas do gerador). Rascunho incompleto e esperado: so informa.
    let { problemas, avisos } = validarMateria(d, { id: m.id, rel: m.arq, situacao: pub ? 'publicada' : 'rascunho' });
    if (m.wiki) { // regras proprias da Wiki; as de texto sao as da materia, conferidas sobre o conteudo ja convertido
      const w = validarWiki(d, { id: m.id, rel: m.arq, tagsCfg });
      d = w.m;
      const t = validarMateria(d, { id: m.id, rel: m.arq, situacao: pub ? 'publicada' : 'rascunho' });
      problemas = [...w.problemas, ...t.problemas]; avisos = [...w.avisos, ...t.avisos];
    }
    for (const p of problemas) a.push(achado(pub ? (/\[CONFERIR|texto de modelo/.test(p) ? 'critico' : 'alto') : 'info', T, p.replace(`${m.arq}: `, '') + (pub ? '' : ' (rascunho)'), onde));
    for (const av of avisos) a.push(achado('baixo', T, av.replace(`${m.arq}: `, ''), onde));
    if (!(d.tags ?? []).length) a.push(achado('baixo', T, 'materia sem tags (nao aparece em paginas de jogo)', onde));
    for (const t of d.tags ?? []) if (typeof t === 'string') (grafias.get(slugBase(t)) ?? grafias.set(slugBase(t), new Set()).get(slugBase(t))).add(t.trim());

    // texto: HTML, markdown, links, paragrafos longos
    const tudo = [d.titulo, d.resumo, ...(Array.isArray(d.corpo) ? d.corpo : [])].filter((x) => typeof x === 'string').join('\n');
    if (/<\/?[a-z][^>]*>/i.test(tudo)) a.push(achado('medio', T, 'texto contem marcacao HTML (aparece como texto cru na pagina)', onde));
    if (/\*\*|^#{1,6}\s|\]\(/m.test(tudo)) a.push(achado('baixo', T, 'texto contem marcas de markdown (o corpo deve ser texto puro)', onde));
    if (/https?:\/\//i.test((Array.isArray(d.corpo) ? d.corpo : []).join(' '))) a.push(achado('baixo', T, 'corpo contem URL (o guia pede texto puro, sem links)', onde));
    const longos = (Array.isArray(d.corpo) ? d.corpo : []).filter((p) => typeof p === 'string' && palavras(p) > 120).length;
    if (longos) a.push(achado('baixo', T, `${longos} paragrafo(s) com mais de 120 palavras (dificil de ler no celular)`, onde));

    if (pub) {
      const tn = slugBase(d.titulo || m.id);
      (titulos.get(tn) ?? titulos.set(tn, []).get(tn)).push(m.id);
      if (d.resumo) (resumos.get(d.resumo.trim()) ?? resumos.set(d.resumo.trim(), []).get(d.resumo.trim())).push(m.id);
    }
  }
  // regras de "veredito", "fontes", "shorts" e "assunto" sobre materias sinteticas: o que o contrato aceita, recusa (problema) ou so avisa
  const base = { titulo: 'Jogo X vale a pena?', resumo: 'Resumo.', corpo: ['Texto.'], formato: 'horizontal' };
  const fonte = { nome: 'Site', url: 'https://exemplo.com/a' };
  const regras = [
    ['veredito completo e valido', { veredito: { nota: 7.5, recomendacao: 'compre', plataforma: 'PS5', preco: 'R$ 250', horas: '10 h', paraQuem: 'Quem gosta de plataforma.' } }, 'ok'],
    ['veredito so com a nota', { veredito: { nota: 0 } }, 'ok'],
    ['nota 10 e valida', { veredito: { nota: 10 } }, 'ok'],
    ['veredito que nao e objeto', { veredito: '7.5' }, 'problema', 'deve ser um objeto'],
    ['veredito em lista', { veredito: [7.5] }, 'problema', 'deve ser um objeto'],
    ['veredito sem nota', { veredito: { recomendacao: 'compre' } }, 'problema', 'veredito.nota'],
    ['nota como texto', { veredito: { nota: '7.5' } }, 'problema', 'veredito.nota'],
    ['nota acima de 10', { veredito: { nota: 10.5 } }, 'problema', 'veredito.nota'],
    ['nota negativa', { veredito: { nota: -1 } }, 'problema', 'veredito.nota'],
    ['nota fora do passo de 0,5', { veredito: { nota: 7.3 } }, 'problema', 'passos de 0,5'],
    ['nota NaN', { veredito: { nota: NaN } }, 'problema', 'veredito.nota'],
    ['recomendacao que nao existe', { veredito: { nota: 7, recomendacao: 'talvez' } }, 'problema', 'recomendacao'],
    ['preco vazio', { veredito: { nota: 7, preco: '  ' } }, 'problema', 'veredito.preco'],
    ['horas que nao e texto', { veredito: { nota: 7, horas: 10 } }, 'problema', 'veredito.horas'],
    ['campo desconhecido no veredito so avisa', { veredito: { nota: 7, nota2: 5 } }, 'aviso', 'campo desconhecido em "veredito"'],
    ['fontes validas', { fontes: [fonte, { nome: 'Outro', url: 'https://outro.com.br/x?y=1#z' }] }, 'ok'],
    ['lista de fontes vazia', { fontes: [] }, 'ok'],
    ['fontes que nao e lista', { fontes: fonte }, 'problema', 'deve ser uma lista'],
    ['fonte sem nome', { fontes: [{ url: fonte.url }] }, 'problema', 'precisa de "nome"'],
    ['fonte nula', { fontes: [null] }, 'problema', 'precisa de "nome"'],
    ['fonte sem url', { fontes: [{ nome: 'Site' }] }, 'problema', 'precisa de "url"'],
    ['fonte com http (sem s)', { fontes: [{ nome: 'Site', url: 'http://exemplo.com' }] }, 'problema', 'https://'],
    ['fonte com javascript:', { fontes: [{ nome: 'Site', url: 'javascript:alert(1)' }] }, 'problema', 'https://'],
    ['fonte com espaco na url', { fontes: [{ nome: 'Site', url: 'https://exemplo.com/a b' }] }, 'problema', 'https://'],
    ['fonte com aspas na url', { fontes: [{ nome: 'Site', url: 'https://exemplo.com/a"onclick="x' }] }, 'problema', 'https://'],
    ['fonte com sinal de menor na url', { fontes: [{ nome: 'Site', url: 'https://exemplo.com/<b>' }] }, 'problema', 'https://'],
    ['muitas fontes so avisa', { fontes: Array.from({ length: LIMITE_DE_FONTES + 1 }, () => fonte) }, 'aviso', 'fontes (a pagina mostra todas'],
    // Shorts anexados e assunto (o id da materia nestes casos e AAAAAAAAAAA)
    ['shorts validos', { shorts: [{ id: 'BBBBBBBBBBB', titulo: 'Short um' }, { id: 'C-C_CCCCCCC', titulo: 'Short dois' }] }, 'ok'],
    ['lista de shorts vazia', { shorts: [] }, 'ok'],
    ['shorts que nao e lista', { shorts: { id: 'BBBBBBBBBBB', titulo: 'T' } }, 'problema', 'deve ser uma lista'],
    ['short que e texto', { shorts: ['BBBBBBBBBBB'] }, 'problema', 'deve ser um objeto'],
    ['short nulo', { shorts: [null] }, 'problema', 'deve ser um objeto'],
    ['short com o link em vez do ID', { shorts: [{ id: 'https://youtube.com/shorts/BBBBBBBBBBB', titulo: 'T' }] }, 'problema', 'precisa de "id"'],
    ['short com ID de 10 caracteres', { shorts: [{ id: 'BBBBBBBBBB', titulo: 'T' }] }, 'problema', 'precisa de "id"'],
    ['short com ID invalido (espaco)', { shorts: [{ id: 'BBBBB BBBBB', titulo: 'T' }] }, 'problema', 'precisa de "id"'],
    ['short sem id', { shorts: [{ titulo: 'T' }] }, 'problema', 'precisa de "id"'],
    ['short igual ao video da propria materia', { shorts: [{ id: 'AAAAAAAAAAA', titulo: 'T' }] }, 'problema', 'proprio video'],
    ['short repetido', { shorts: [{ id: 'BBBBBBBBBBB', titulo: 'T' }, { id: 'BBBBBBBBBBB', titulo: 'U' }] }, 'problema', 'mais de uma vez'],
    ['short sem titulo', { shorts: [{ id: 'BBBBBBBBBBB' }] }, 'problema', 'precisa de "titulo"'],
    ['short com titulo vazio', { shorts: [{ id: 'BBBBBBBBBBB', titulo: '  ' }] }, 'problema', 'precisa de "titulo"'],
    ['campo desconhecido no short so avisa', { shorts: [{ id: 'BBBBBBBBBBB', titulo: 'T', url: 'x' }] }, 'aviso', 'campo desconhecido no Short'],
    ['muitos shorts so avisa', { shorts: Array.from({ length: LIMITE_DE_SHORTS + 1 }, (_, k) => ({ id: `SSSSSSSSSS${k}`, titulo: 'T' })) }, 'aviso', 'Shorts anexados'],
    ['assunto valido', { assunto: 'god-of-war-laufey' }, 'ok'],
    ['assunto com numero', { assunto: 'dlss-5' }, 'ok'],
    ['assunto com maiusculas e espacos', { assunto: 'God of War' }, 'problema', '"assunto" deve ser um texto'],
    ['assunto com sublinhado', { assunto: 'god_of_war' }, 'problema', '"assunto" deve ser um texto'],
    ['assunto com hifen no fim', { assunto: 'god-of-war-' }, 'problema', '"assunto" deve ser um texto'],
    ['assunto com acento', { assunto: 'preço-do-jogo' }, 'problema', '"assunto" deve ser um texto'],
    ['assunto vazio', { assunto: '' }, 'problema', '"assunto" deve ser um texto'],
    ['assunto que nao e texto', { assunto: 5 }, 'problema', '"assunto" deve ser um texto'],
    ['plataforma na materia (review sem veredito)', { plataforma: 'PS5' }, 'ok'],
    ['plataforma vazia', { plataforma: ' ' }, 'problema', '"plataforma" deve ser um texto'],
    ['plataforma que nao e texto', { plataforma: 5 }, 'problema', '"plataforma" deve ser um texto'],
  ];
  for (const [nome, extra, espera, trecho] of regras) {
    const r = validarMateria({ ...base, ...extra }, { id: 'AAAAAAAAAAA', rel: 'x.json', situacao: 'publicada' });
    const lista = espera === 'aviso' ? r.avisos : r.problemas;
    if (espera === 'ok' ? r.problemas.length || r.avisos.length : !lista.some((t) => t.includes(trecho)) || (espera === 'aviso' && r.problemas.length)) a.push(achado('alto', T, `regra de veredito/fontes/shorts/assunto: "${nome}" deveria dar ${espera === 'ok' ? 'nada' : `${espera} com "${trecho}"`}, deu problemas ${JSON.stringify(r.problemas)} e avisos ${JSON.stringify(r.avisos)}`, 'contrato.mjs'));
  }
  a.push(achado('info', T, `${regras.length} regras de veredito, fontes, shorts e assunto conferidas sobre materias sinteticas`));

  // _conteudo/assuntos.json (titulo e resumo da pagina de cada assunto) sobre dados sinteticos: o que o contrato aceita, recusa (problema) ou so avisa
  const membro = (id, extra = {}, categoria = 'noticias', publicado = '2026-06-01T12:00:00Z') => ({ id, rel: `_conteudo/materias/${id}.json`, dados: { titulo: 'T', ...extra }, categoria, publicado });
  const dupla = () => new Map([['assunto-x', [membro('AAAAAAAAAAA'), membro('BBBBBBBBBBB', {}, 'noticias', '2026-06-02T12:00:00Z')]]]);
  const ficha = { 'assunto-x': { titulo: 'Titulo do assunto', resumo: 'Resumo do assunto.' } };
  const casosAssunto = [
    ['assunto valido', ficha, dupla(), [], 'ok'],
    ['sem arquivo e sem assunto com 2 materias', {}, new Map(), [], 'ok'],
    ['assunto com 2 materias sem entrada no arquivo (o arquivo e opcional)', {}, dupla(), [], 'ok'],
    ['entrada sem titulo', { 'assunto-x': { resumo: 'R.' } }, dupla(), [], 'problema', 'falta "titulo"'],
    ['entrada com titulo vazio', { 'assunto-x': { titulo: ' ', resumo: 'R.' } }, dupla(), [], 'problema', 'falta "titulo"'],
    ['entrada sem resumo', { 'assunto-x': { titulo: 'T' } }, dupla(), [], 'problema', 'falta "resumo"'],
    ['entrada que nao e objeto', { 'assunto-x': 'texto' }, dupla(), [], 'problema', 'deve ser um objeto'],
    ['arquivo que nao e objeto', [], dupla(), [], 'problema', 'o arquivo deve ser um objeto'],
    ['chave com maiusculas e espaco', { 'Assunto X': { titulo: 'T', resumo: 'R.' } }, new Map(), [], 'problema', 'minusculas, sem acento e com hifens'],
    ['categoria desconhecida', { 'assunto-x': { titulo: 'T', resumo: 'R.', categoria: 'inventada' } }, dupla(), [], 'problema', '"categoria" desconhecida'],
    ['titulo acima de 60 so avisa', { 'assunto-x': { titulo: 'T'.repeat(61), resumo: 'R.' } }, dupla(), [], 'aviso', 'titulo com 61 caracteres'],
    ['resumo acima de 160 so avisa', { 'assunto-x': { titulo: 'T', resumo: 'R'.repeat(161) } }, dupla(), [], 'aviso', 'resumo com 161 caracteres'],
    ['campo desconhecido so avisa', { 'assunto-x': { titulo: 'T', resumo: 'R.', cor: 'azul' } }, dupla(), [], 'aviso', 'campo desconhecido "cor"'],
    ['entrada de assunto com 1 materia so avisa', { ...ficha, 'outro': { titulo: 'T', resumo: 'R.' } }, new Map([...dupla(), ['outro', [membro('CCCCCCCCCCC')]]]), [], 'aviso', 'so vira redirecionamento com 2 ou mais'],
    ['membro com veredito (cada materia tem pagina propria: pode)', ficha, new Map([['assunto-x', [membro('AAAAAAAAAAA', { veredito: { nota: 7 } }), membro('BBBBBBBBBBB')]]]), [], 'ok'],
    ['membro com shorts (cada materia tem pagina propria: pode)', ficha, new Map([['assunto-x', [membro('AAAAAAAAAAA'), membro('BBBBBBBBBBB', { shorts: [{ id: 'DDDDDDDDDDD', titulo: 'S' }] })]]]), [], 'ok'],
    ['endereco do assunto ja e de uma materia', ficha, dupla(), ['noticias/assunto-x'], 'problema', 'endereco que ja pertence a uma materia'],
    ['mesmo endereco em outra categoria nao colide', ficha, dupla(), ['reviews/assunto-x'], 'ok'],
  ];
  for (const [nome, assuntos, grupos, ocupados, espera, trecho] of casosAssunto) {
    const r = validarAssuntos(assuntos, grupos, new Set(ocupados));
    const lista = espera === 'aviso' ? r.avisos : r.problemas;
    if (espera === 'ok' ? r.problemas.length || r.avisos.length : !lista.some((t) => t.includes(trecho)) || (espera === 'aviso' && r.problemas.length)) a.push(achado('alto', T, `regra de assuntos.json: "${nome}" deveria dar ${espera === 'ok' ? 'nada' : `${espera} com "${trecho}"`}, deu problemas ${JSON.stringify(r.problemas)} e avisos ${JSON.stringify(r.avisos)}`, 'contrato.mjs'));
  }
  // a pasta da pagina do assunto: a categoria indicada na entrada ou, sem ela, a da materia mais antiga (a pagina nao muda de pasta quando chega uma materia nova)
  const g2 = new Map([['assunto-x', [membro('AAAAAAAAAAA', {}, 'reviews', '2026-01-01T12:00:00Z'), membro('BBBBBBBBBBB', {}, 'noticias', '2026-06-02T12:00:00Z')]]]);
  const cd1 = validarAssuntos(ficha, g2).categoriaDe('assunto-x'), cd2 = validarAssuntos({ 'assunto-x': { ...ficha['assunto-x'], categoria: 'noticias' } }, g2).categoriaDe('assunto-x');
  if (cd1 !== 'reviews' || cd2 !== 'noticias') a.push(achado('alto', T, `categoria da pagina do assunto: sem "categoria" devia ser a da materia mais antiga (reviews) e foi ${cd1}; com "categoria": "noticias" foi ${cd2}`, 'contrato.mjs'));
  a.push(achado('info', T, `${casosAssunto.length + 1} regras de assuntos.json conferidas sobre dados sinteticos`));

  for (const [, ids] of titulos) if (ids.length > 1) a.push(achado('medio', T, `titulo repetido em ${ids.length} materias: ${ids.join(', ')}`));
  for (const [r, ids] of resumos) if (ids.length > 1) a.push(achado('baixo', T, `resumo repetido em ${ids.length} materias: "${r.slice(0, 40)}..."`));

  // registro de enderecos (a materia nao depende mais do feed do YouTube)
  if (!registro) a.push(achado('alto', T, '_conteudo/enderecos.json ausente (rode npm run gerar): sem ele a materia volta a depender do feed'));
  else {
    const usados = new Map();
    for (const m of ms.filter(aprovada)) if (!registro[m.id]) a.push(achado('alto', T, 'materia aprovada sem endereco registrado (rode npm run gerar e leve _conteudo/enderecos.json no commit)', m.arq));
    for (const [id, e] of Object.entries(registro)) {
      if (!CATEGORIAS.includes(e.categoria)) a.push(achado('alto', T, `endereco com categoria desconhecida: ${e.categoria}`, id));
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.slug ?? '')) a.push(achado('alto', T, `endereco fora do padrao (minusculo, sem acento, hifens): ${e.slug}`, id));
      if (!e.retirada && existeExato(`${e.categoria}/${e.slug}.html`) !== 'ok') a.push(achado('alto', T, `materia registrada sem a pagina ${e.categoria}/${e.slug}.html (rode npm run gerar)`, id));
      // materia retirada: o endereco continua existindo como redirecionamento; "para" leva a outra materia (ex.: Short que virou anexo de review)
      const alvo = e.para != null ? registro[e.para] : null;
      if (e.para != null) {
        if (!e.retirada) a.push(achado('alto', T, '"para" so vale em materia retirada (falta "retirada")', id));
        if (!alvo) a.push(achado('alto', T, `"para" aponta para ${e.para}, que nao esta no registro`, id));
        else if (alvo.retirada) a.push(achado('alto', T, `"para" aponta para ${e.para}, que tambem foi retirada`, id));
        else if (existeExato(`${alvo.categoria}/${alvo.slug}.html`) !== 'ok') a.push(achado('alto', T, `"para" aponta para ${alvo.categoria}/${alvo.slug}.html, que nao existe`, id));
      }
      if (e.retirada) {
        const stub = `${e.categoria}/${e.slug}.html`;
        if (existeExato(stub) !== 'ok') a.push(achado('alto', T, `materia retirada sem a pagina de redirecionamento ${stub} (rode npm run gerar)`, id));
        else if (alvo && !alvo.retirada && !ler(stub).includes(`<meta http-equiv="refresh" content="0; url=/${urlPublica(`${alvo.categoria}/${alvo.slug}.html`)}">`)) a.push(achado('alto', T, `${stub} devia levar para ${alvo.categoria}/${alvo.slug}.html (retirada "para") e leva para outro lugar`, id));
      }
      const caminho = (velho) => (velho.includes('/') ? velho : `${e.categoria}/${velho}`); // slug da categoria atual ou "categoria-antiga/slug" (materia que mudou de categoria)
      for (const velho of e.antigos ?? []) if (existeExato(`${caminho(velho)}.html`) !== 'ok') a.push(achado('alto', T, `endereco antigo sem a pagina de redirecionamento: ${caminho(velho)}.html`, id));
      for (const s of [e.slug, ...(e.antigos ?? [])]) {
        const k = caminho(s);
        if (usados.has(k) && usados.get(k) !== id) a.push(achado('critico', T, `o endereco ${k}.html pertence a duas materias: ${usados.get(k)} e ${id}`));
        usados.set(k, id);
      }
    }
  }

  // tags.json
  if (existe('_conteudo/tags.json')) {
    let cfg;
    try { cfg = JSON.parse(ler('_conteudo/tags.json')); } catch (e) { a.push(achado('critico', T, `tags.json invalido: ${e.message}`, '_conteudo/tags.json')); cfg = {}; }
    const dono = new Map();
    for (const [k, v] of Object.entries(cfg)) {
      if (!v.nome) a.push(achado('medio', T, `tag "${k}" sem "nome"`, '_conteudo/tags.json'));
      if (v.pai && !cfg[v.pai]) a.push(achado('alto', T, `tag "${k}" tem pai inexistente: ${v.pai}`, '_conteudo/tags.json'));
      for (const nome of [k, v.nome ?? k, ...(v.alias ?? [])]) {
        const s = slugBase(nome);
        if (dono.has(s) && dono.get(s) !== k) a.push(achado('alto', T, `"${nome}" aponta para duas tags: ${dono.get(s)} e ${k}`, '_conteudo/tags.json'));
        dono.set(s, k);
      }
      for (let atual = v.pai, n = 0; atual; atual = cfg[atual]?.pai, n++) if (atual === k || n > 20) { a.push(achado('critico', T, `laco em "pai": ${k} volta para si mesma`, '_conteudo/tags.json')); break; }
    }
    // grafias diferentes da mesma tag que o tags.json nao unifica
    for (const [s, set] of grafias) if (set.size > 1 && !dono.has(s)) a.push(achado('medio', T, `grafias diferentes da mesma tag: ${[...set].join(' | ')} (unificar em tags.json ou no texto)`));
  }
  // nomes de arquivo das imagens da pasta de cada materia (thumb.<ext> e img-N_<site da fonte>.<ext>): o que vale e o que o gerador recusa
  const classes = [
    ['thumb.jpg', 'thumb'], ['thumb.PNG', 'thumb'], ['thumb.webp', 'thumb'], ['img-1_arkade.com.br.jpg', 'foto'], ['img-12_www.techtudo.com.br.webp', 'foto'], ['IMG-2_Exemplo.COM.png', 'foto'],
    ['img-1.jpg', 'invalido'], ['img-1_.jpg', 'invalido'], ['img-a_x.com.jpg', 'invalido'], ['foto.jpg', 'invalido'], ['thumb.gif', 'invalido'], ['img-1_semponto.jpg', 'invalido'], ['img-0_x.com.jpg', 'invalido'], ['img-21_x.com.jpg', 'invalido'],
    ['anotacoes.txt', 'outro'], ['rascunho.docx', 'outro'],
  ];
  for (const [nome, esperado] of classes) { const k = classificarArquivo(nome).tipo; if (k !== esperado) a.push(achado('alto', T, `classificarArquivo("${nome}") deu "${k}" e devia dar "${esperado}"`, '_ferramentas/gerador/imagens.mjs')); }
  const fonteDoNome = classificarArquivo('IMG-2_Exemplo.COM.png');
  if (fonteDoNome.fonte !== 'exemplo.com' || fonteDoNome.n !== 2) a.push(achado('alto', T, 'a fonte e a posicao devem sair do nome do arquivo (minusculas): img-2_exemplo.com => posicao 2, fonte exemplo.com', '_ferramentas/gerador/imagens.mjs'));
  a.push(achado('info', T, `${ms.length} arquivos de conteudo (${soMaterias.length} materias + ${daWiki.length} da Wiki; ${ms.filter(aprovada).length} aprovados, ${ms.filter((m) => m.dados && !aprovada(m)).length} rascunhos)`));
  return a;
}
