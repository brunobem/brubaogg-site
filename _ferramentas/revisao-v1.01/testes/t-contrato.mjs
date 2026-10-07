// Contrato dos arquivos de materia, do registro de enderecos e do tags.json.
// As regras obrigatorias vem do MESMO modulo que o gerador usa (_ferramentas/gerador/contrato.mjs): nao ha uma segunda copia para divergir.
// Aqui ficam so as conferencias extras (texto, repeticoes, coerencia entre os arquivos).
import { achado, aprovada, CATEGORIAS, existe, existeExato, ler, materias } from './lib.mjs';
import { validarMateria } from '../../gerador/contrato.mjs';
import { slugBase } from '../../gerador/util.mjs';

const T = 'contrato';
const palavras = (s) => (s.match(/\S+/g) ?? []).length;

export default async function () {
  const a = [];
  const ms = materias();
  const titulos = new Map(), resumos = new Map(), grafias = new Map();
  const registro = existe('_conteudo/enderecos.json') ? JSON.parse(ler('_conteudo/enderecos.json')) : null;

  for (const m of ms) {
    const onde = m.arq;
    if (!/^[\w-]{11}$/.test(m.id)) a.push(achado('alto', T, 'o nome do arquivo deve ser o ID do video (11 caracteres)', onde));
    if (!m.dados) { a.push(achado('critico', T, `JSON invalido: ${m.erro}`, onde)); continue; }
    const d = m.dados, pub = aprovada(m);
    if (d.status != null && d.status !== 'rascunho') a.push(achado('alto', T, `status invalido: ${JSON.stringify(d.status)} (so "rascunho" ou ausente)`, onde));

    // regras obrigatorias (as mesmas do gerador). Rascunho incompleto e esperado: so informa.
    const { problemas, avisos } = validarMateria(d, { id: m.id, rel: m.arq, situacao: pub ? 'publicada' : 'rascunho' });
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
      for (const velho of e.antigos ?? []) if (existeExato(`${e.categoria}/${velho}.html`) !== 'ok') a.push(achado('alto', T, `endereco antigo sem a pagina de redirecionamento: ${e.categoria}/${velho}.html`, id));
      for (const s of [e.slug, ...(e.antigos ?? [])]) {
        const k = `${e.categoria}/${s}`;
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
  a.push(achado('info', T, `${ms.length} arquivos de materia (${ms.filter(aprovada).length} aprovados, ${ms.filter((m) => m.dados && !aprovada(m)).length} rascunhos)`));
  return a;
}
