// A funcao "brubaogg-ao-vivo" na Cloudflare: o VIGIA do "ao vivo agora" (fase 8). E SEPARADA do site: nao mexe na publicacao das paginas e, se der
// errado, e so apagar que o site volta a ser como era. A logica mora em vigia.mjs.
//   - a cada minuto (Cron Trigger): confere o tunel e o YouTube e grava o resultado no KV "ESTADO" (so quando muda, ou a cada 5 minutos com live no ar);
//   - quando o site pergunta (GET): devolve o resultado gravado, em JSON, so para o proprio site (CORS).
// Segredos (o Bruno cola; nunca ficam em arquivo): YOUTUBE_CHAVE, CF_TOKEN_TUNEL e CONTA_ID. Sem eles a resposta e sempre "sem live".
import { assinatura, conferir, respostaPublica } from './vigia.mjs';

const ORIGENS = ['https://brubaogg.com.br', 'http://localhost:8113'];
const BATIDA = 5 * 60 * 1000; // com live no ar, regrava a cada 5 minutos: o site desconfia de resposta "ao vivo" mais velha que 15

async function pedir(url, cabecalhos = {}) {
  const r = await fetch(url, { headers: cabecalhos });
  if (!r.ok) throw new Error(`resposta ${r.status}`);
  return r.json();
}

async function rodar(env) {
  const agora = Date.now();
  const antes = (await env.ESTADO.get('estado', 'json')) ?? {};
  const cfg = { contaId: env.CONTA_ID, tokenDoTunel: env.CF_TOKEN_TUNEL, chaveDoYoutube: env.YOUTUBE_CHAVE, canal: env.CANAL || '@brubaogg', tunelId: env.TUNEL_ID || '' };
  const depois = await conferir(antes, { agora, cfg, pedir });
  const mudou = assinatura(antes) !== assinatura(depois);
  if (mudou || (depois.aoVivo && agora - (antes.gravado ?? 0) >= BATIDA)) await env.ESTADO.put('estado', JSON.stringify({ ...depois, gravado: agora }));
}

export default {
  async scheduled(evento, env, ctx) { ctx.waitUntil(rodar(env)); },

  async fetch(request, env) {
    const origem = request.headers.get('Origin') ?? '';
    const cabecalhos = {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=30',
      'X-Robots-Tag': 'noindex',
      Vary: 'Origin',
      ...(ORIGENS.includes(origem) ? { 'Access-Control-Allow-Origin': origem } : {}),
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('{"erro":"so leitura"}', { status: 405, headers: cabecalhos });
    const estado = (await env.ESTADO.get('estado', { type: 'json', cacheTtl: 60 })) ?? {};
    return new Response(JSON.stringify(respostaPublica(estado, Date.now())), { headers: cabecalhos });
  },
};
