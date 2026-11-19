// O VIGIA do "ao vivo agora" (fase 8): decide, a cada minuto, se o canal esta em live.
// Este arquivo e so a LOGICA, sem nada da Cloudflare dentro: recebe o estado anterior e devolve o novo. Quem chama e o worker.mjs (de verdade) e o
// teste t-ao-vivo.mjs (com respostas de mentira). Regras, com as fontes, em portal\tecnologia\pesquisa-site\fase8-ao-vivo.md.
//
// Duas perguntas, nesta ordem:
//   1. O TUNEL do PC2 esta ligado? (API da Cloudflare, so leitura.) Desligado = sem live, e NAO gasta cota do YouTube.
//      Tunel ligado quer dizer "o terminal do PC2 esta aberto", nao "a live esta no ar": por isso existe a pergunta 2.
//   2. O canal tem live no ar? Enquanto nao se conhece a live: busca (search.list com eventType=live), que tem limite proprio de 100 chamadas
//      por dia; por isso so de 2 em 2 minutos e no maximo 90 por dia. Achou a live: guarda o ID e passa a conferir so ela (videos.list, 1 unidade
//      das 10.000 do dia), a cada minuto, ate ela acabar.
// Falha de rede ou de API: mantem a resposta anterior por ate 5 conferencias seguidas; depois disso, responde "sem live" (melhor esconder o
// player do que mostrar uma live que ja acabou).

export const INTERVALO_DE_BUSCA = 2 * 60 * 1000;
export const LIMITE_DE_BUSCAS_POR_DIA = 90;
export const FALHAS_TOLERADAS = 5;
const ID_DE_VIDEO = /^[A-Za-z0-9_-]{11}$/;

// o dia da cota do YouTube vira a meia-noite do Pacifico (UTC-8, sem contar horario de verao: uma hora de diferenca nao muda nada aqui)
const diaDaCota = (agora) => new Date(agora - 8 * 3600 * 1000).toISOString().slice(0, 10);

/**
 * @param {object} antes  estado gravado na conferencia anterior (ou {} na primeira)
 * @param {{ agora: number, cfg: { contaId?: string, tokenDoTunel?: string, chaveDoYoutube?: string, canal: string, tunelId?: string }, pedir: (url: string, cabecalhos?: object) => Promise<any> }} d
 *        pedir() busca um endereco e devolve o JSON; estoura erro se a resposta nao for 200
 * @returns {Promise<object>} o estado novo: { aoVivo, id, titulo, desde, situacao, conferido, canalId, ultimaBusca, buscas: { dia, n }, falhas }
 */
export async function conferir(antes, d) {
  const { agora, cfg, pedir } = d;
  const dia = diaDaCota(agora);
  const buscas = antes.buscas?.dia === dia ? { ...antes.buscas } : { dia, n: 0 };
  const base = { aoVivo: false, id: null, titulo: '', desde: null, canalId: antes.canalId ?? null, ultimaBusca: antes.ultimaBusca ?? 0, buscas, falhas: 0, conferido: agora };
  const semLive = (situacao, mais = {}) => ({ ...base, situacao, ...mais });
  const falhou = (situacao) => {
    const falhas = (antes.falhas ?? 0) + 1;
    if (antes.aoVivo && falhas <= FALHAS_TOLERADAS) return { ...base, aoVivo: true, id: antes.id, titulo: antes.titulo ?? '', desde: antes.desde ?? null, falhas, situacao };
    return { ...base, falhas, situacao };
  };

  if (!cfg.contaId || !cfg.tokenDoTunel || !cfg.chaveDoYoutube) return semLive('faltam-chaves');
  const yt = (caminho, parametros) => `https://www.googleapis.com/youtube/v3/${caminho}?${new URLSearchParams({ ...parametros, key: cfg.chaveDoYoutube })}`;

  // 0) o canal, pelo arroba: so na primeira vez (1 unidade de cota). Vem ANTES do tunel de proposito: confere a chave do YouTube no dia em que ela e
  //    colada, com o PC2 desligado, e nao na hora da live. Chave recusada aparece na resposta como "chave-do-youtube-recusada".
  if (!base.canalId) {
    try {
      const c = await pedir(yt('channels', { part: 'id', forHandle: cfg.canal }));
      base.canalId = c?.items?.[0]?.id ?? null;
    } catch { return falhou('chave-do-youtube-recusada'); }
    if (!base.canalId) return semLive('canal-nao-encontrado');
  }

  // 1) o tunel
  let ligado;
  try {
    const r = await pedir(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfg.contaId)}/cfd_tunnel?is_deleted=false`, { Authorization: `Bearer ${cfg.tokenDoTunel}` });
    const tuneis = (r?.result ?? []).filter((t) => !cfg.tunelId || t.id === cfg.tunelId);
    ligado = tuneis.some((t) => t.status === 'healthy' || t.status === 'degraded');
  } catch { return falhou('erro-ao-ler-o-tunel'); }
  if (!ligado) return semLive('tunel-desligado');

  try {
    // 2a) ja se conhece a live: confere so ela
    if (antes.id && ID_DE_VIDEO.test(antes.id)) {
      const r = await pedir(yt('videos', { part: 'snippet', id: antes.id }));
      const v = r?.items?.[0];
      if (v?.snippet?.liveBroadcastContent === 'live') return { ...base, aoVivo: true, id: antes.id, titulo: String(v.snippet.title ?? '').slice(0, 200), desde: antes.desde ?? agora, situacao: 'ao-vivo' };
      return semLive('a-live-acabou', { ultimaBusca: agora }); // espera o intervalo antes de procurar outra
    }
    // 2b) ainda nao se conhece: procura, respeitando o intervalo e o limite do dia
    if (agora - base.ultimaBusca < INTERVALO_DE_BUSCA) return semLive('tunel-ligado-esperando-a-proxima-busca');
    if (buscas.n >= LIMITE_DE_BUSCAS_POR_DIA) return semLive('acabaram-as-buscas-de-hoje');
    const canalId = base.canalId;
    buscas.n += 1;
    const r = await pedir(yt('search', { part: 'snippet', channelId: canalId, eventType: 'live', type: 'video', maxResults: '1' }));
    const achado = r?.items?.[0], id = achado?.id?.videoId;
    if (id && ID_DE_VIDEO.test(id)) return { ...base, canalId, ultimaBusca: agora, aoVivo: true, id, titulo: String(achado.snippet?.title ?? '').slice(0, 200), desde: agora, situacao: 'ao-vivo' };
    return semLive('tunel-ligado-sem-live', { canalId, ultimaBusca: agora });
  } catch { return falhou('erro-no-youtube'); }
}

/** o que muda de verdade entre dois estados (a hora da conferencia nao conta): so isto faz gravar de novo */
export const assinatura = (e) => JSON.stringify([e.aoVivo ?? false, e.id ?? null, e.titulo ?? '', e.situacao ?? '', e.canalId ?? null, e.ultimaBusca ?? 0, e.buscas ?? null, e.falhas ?? 0]);

/** o que o site recebe: nada de chave, nada de conta. "gravado" deixa o site desconfiar de uma resposta velha. */
export function respostaPublica(e, agora) {
  const aoVivo = !!e?.aoVivo && ID_DE_VIDEO.test(e.id ?? '');
  return { aoVivo, id: aoVivo ? e.id : null, titulo: aoVivo ? (e.titulo ?? '') : '', desde: aoVivo ? (e.desde ?? null) : null, situacao: e?.situacao ?? 'sem-registro', gravado: e?.gravado ?? null, agora };
}
