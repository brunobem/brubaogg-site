// Roda SO nos enderecos listados em "run_worker_first" (wrangler.jsonc): as paginas que precisam abrir COM .html.
// Sem isto a Cloudflare responderia /termos.html com um redirecionamento (307) para /termos.
// Aqui a pagina e buscada pelo endereco sem .html e entregue no endereco pedido, com codigo 200.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const semHtml = new URL(url.pathname.replace(/\.html$/, '') + url.search, url);
    const resposta = await env.ASSETS.fetch(new Request(semHtml, request));

    // No endereco de teste (*.workers.dev) nada pode ser indexado. O arquivo _headers nao vale para o que passa por aqui.
    if (!url.hostname.endsWith('.workers.dev')) return resposta;
    const copia = new Response(resposta.body, resposta);
    copia.headers.set('X-Robots-Tag', 'noindex');
    return copia;
  },
};
