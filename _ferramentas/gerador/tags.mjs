// Tags: _conteudo/tags.json (opcional) unifica variacoes de nome e pode apontar a tag para uma pagina propria.
// { "gta-6": { "nome": "GTA 6", "alias": ["GTA VI"], "pagina": "gta6.html", "descricao": "texto opcional da pagina da tag", "pai": "outra-tag" } }
import { slugify } from './util.mjs';

export function criarTags(ctx) {
  const { tagsCfg } = ctx;
  const aliasParaSlug = new Map();
  for (const [slug, cfg] of Object.entries(tagsCfg)) {
    aliasParaSlug.set(slugify(slug), slug);
    aliasParaSlug.set(slugify(cfg.nome ?? slug), slug);
    for (const a of cfg.alias ?? []) aliasParaSlug.set(slugify(a), slug);
  }
  function resolverTags(lista = []) {
    const vistos = new Set();
    const out = [];
    const adicionar = (slug, nomeOriginal) => {
      if (vistos.has(slug)) return;
      vistos.add(slug);
      out.push({ slug, nome: tagsCfg[slug]?.nome ?? nomeOriginal ?? slug });
      if (tagsCfg[slug]?.pai) adicionar(tagsCfg[slug].pai); // jogo especifico tambem entra na franquia
    };
    for (const nome of lista) {
      const s0 = slugify(String(nome));
      if (!s0) continue;
      adicionar(aliasParaSlug.get(s0) ?? s0, String(nome).trim());
    }
    return out;
  }
  const tagPage = (slug) => tagsCfg[slug]?.pagina ?? `tag/${slug}.html`; // endereco relativo a raiz do site
  // so ganha pagina a tag com 2+ materias, com descricao propria ou com pagina fixa
  const temPaginaTag = (slug) => !!tagsCfg[slug]?.pagina || !!tagsCfg[slug]?.descricao || (ctx.contagemTags.get(slug) ?? 0) >= 2;
  return { resolverTags, tagPage, temPaginaTag };
}
