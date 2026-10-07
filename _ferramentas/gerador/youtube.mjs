// Consultas ao YouTube compartilhadas pelos scripts (npm run formato / nova / aprovar). Nunca chuta: sem resposta clara, devolve erro.

/** Short (vertical) responde 200 em youtube.com/shorts/ID; video normal redireciona (303). -> { id, formato: 'short'|'horizontal' } ou { id, erro } */
export async function formatoDe(id) {
  if (!/^[\w-]{11}$/.test(id)) return { id, erro: 'ID invalido (o ID do YouTube tem 11 caracteres)' };
  let ultimo = 'sem resposta';
  for (let tentativa = 1; tentativa <= 3; tentativa++) {
    try {
      const r = await fetch(`https://www.youtube.com/shorts/${id}`, { method: 'HEAD', redirect: 'manual', signal: AbortSignal.timeout(20000) });
      if (r.status === 200) return { id, formato: 'short' };
      if (r.status === 303) return { id, formato: 'horizontal' };
      ultimo = `resposta inesperada do YouTube (HTTP ${r.status})`;
    } catch (e) {
      ultimo = `falha de rede (${e.cause?.code ?? e.name})`;
    }
    await new Promise((ok) => setTimeout(ok, 800 * tentativa));
  }
  return { id, erro: ultimo };
}
