// Teste do vigia com respostas de mentira (sem rede, sem chave): node _ferramentas/cloudflare/ao-vivo/testar-vigia.mjs
// Cobre a ordem das perguntas, a economia de cota e o comportamento em falha. Sai com codigo 1 se algo estiver errado.
import { FALHAS_TOLERADAS, INTERVALO_DE_BUSCA, LIMITE_DE_BUSCAS_POR_DIA, assinatura, conferir, respostaPublica } from './vigia.mjs';

const CFG = { contaId: 'conta', tokenDoTunel: 'token', chaveDoYoutube: 'chave', canal: '@canal' };
const T0 = Date.UTC(2026, 10, 20, 22, 0, 0);
const VIDEO = 'abcdefghijk';
let erros = 0;
const confere = (nome, cond, detalhe = '') => { if (!cond) { erros++; console.log(`FALHOU: ${nome} ${detalhe}`); } };

// fabrica de "internet de mentira": tunel ligado ou nao, live no ar ou nao; conta as chamadas por tipo
function mundo({ tunel = 'healthy', live = false, quebra = '' } = {}) {
  const chamadas = { tunel: 0, canal: 0, busca: 0, video: 0 };
  const pedir = async (url) => {
    if (url.includes('api.cloudflare.com')) { chamadas.tunel++; if (quebra === 'tunel') throw new Error('x'); return { result: tunel ? [{ id: 't1', status: tunel }] : [] }; }
    if (quebra === 'youtube') throw new Error('x');
    if (url.includes('/channels?')) { chamadas.canal++; return { items: [{ id: 'UCcanal' }] }; }
    if (url.includes('/search?')) { chamadas.busca++; return { items: live ? [{ id: { videoId: VIDEO }, snippet: { title: 'Live de teste' } }] : [] }; }
    if (url.includes('/videos?')) { chamadas.video++; return { items: [{ snippet: { liveBroadcastContent: live ? 'live' : 'none', title: 'Live de teste' } }] }; }
    throw new Error(`endereco inesperado: ${url}`);
  };
  return { pedir, chamadas };
}

// 1) sem chaves: nunca chama nada
{ const m = mundo({ live: true }); const e = await conferir({}, { agora: T0, cfg: { canal: '@canal' }, pedir: m.pedir });
  confere('sem chaves', !e.aoVivo && e.situacao === 'faltam-chaves' && m.chamadas.tunel === 0 && m.chamadas.busca === 0); }

// 2) tunel desligado: nao gasta YouTube
for (const estado of ['down', 'inactive', null]) { const m = mundo({ tunel: estado, live: true }); const e = await conferir({}, { agora: T0, cfg: CFG, pedir: m.pedir });
  confere(`tunel ${estado}`, !e.aoVivo && e.situacao === 'tunel-desligado' && m.chamadas.busca === 0 && m.chamadas.video === 0 && m.chamadas.canal === 0); }

// 3) tunel ligado, sem live: busca uma vez, e so de novo depois do intervalo
{ const m = mundo({ live: false }); let e = await conferir({}, { agora: T0, cfg: CFG, pedir: m.pedir });
  confere('ligado sem live', !e.aoVivo && e.situacao === 'tunel-ligado-sem-live' && m.chamadas.busca === 1 && m.chamadas.canal === 1 && e.canalId === 'UCcanal' && e.buscas.n === 1);
  e = await conferir(e, { agora: T0 + 60000, cfg: CFG, pedir: m.pedir });
  confere('espera o intervalo', m.chamadas.busca === 1 && e.situacao === 'tunel-ligado-esperando-a-proxima-busca');
  e = await conferir(e, { agora: T0 + INTERVALO_DE_BUSCA, cfg: CFG, pedir: m.pedir });
  confere('busca de novo depois do intervalo', m.chamadas.busca === 2 && m.chamadas.canal === 1, JSON.stringify(m.chamadas)); }

// 4) a live comeca: acha, guarda o ID e passa a conferir so o video
{ const m = mundo({ live: true }); let e = await conferir({}, { agora: T0, cfg: CFG, pedir: m.pedir });
  confere('achou a live', e.aoVivo && e.id === VIDEO && e.titulo === 'Live de teste' && e.desde === T0 && e.situacao === 'ao-vivo');
  e = await conferir(e, { agora: T0 + 60000, cfg: CFG, pedir: m.pedir });
  confere('confere pelo video', e.aoVivo && m.chamadas.busca === 1 && m.chamadas.video === 1 && e.desde === T0);
  const publico = respostaPublica({ ...e, gravado: T0 }, T0 + 60000);
  confere('resposta publica', publico.aoVivo && publico.id === VIDEO && !('canalId' in publico) && !('buscas' in publico) && !JSON.stringify(publico).includes('chave')); }

// 5) a live acaba: some, e nao busca de novo no minuto seguinte
{ const fim = mundo({ live: false }); let e = await conferir({ aoVivo: true, id: VIDEO, titulo: 'x', desde: T0, canalId: 'UCcanal' }, { agora: T0 + 3600000, cfg: CFG, pedir: fim.pedir });
  confere('a live acabou', !e.aoVivo && e.id === null && e.situacao === 'a-live-acabou' && fim.chamadas.video === 1 && fim.chamadas.busca === 0);
  e = await conferir(e, { agora: T0 + 3600000 + 60000, cfg: CFG, pedir: fim.pedir });
  confere('nao busca logo depois', fim.chamadas.busca === 0); }

// 6) o tunel desliga com a live "no ar": some na hora, sem perguntar ao YouTube
{ const m = mundo({ tunel: 'down', live: true }); const e = await conferir({ aoVivo: true, id: VIDEO, titulo: 'x', desde: T0 }, { agora: T0 + 60000, cfg: CFG, pedir: m.pedir });
  confere('tunel caiu', !e.aoVivo && m.chamadas.video === 0); }

// 7) limite de buscas por dia
{ const m = mundo({ live: false }); const dia = new Date(T0 - 8 * 3600000).toISOString().slice(0, 10);
  const e = await conferir({ canalId: 'UCcanal', buscas: { dia, n: LIMITE_DE_BUSCAS_POR_DIA } }, { agora: T0, cfg: CFG, pedir: m.pedir });
  confere('limite do dia', !e.aoVivo && e.situacao === 'acabaram-as-buscas-de-hoje' && m.chamadas.busca === 0);
  const amanha = await conferir({ canalId: 'UCcanal', buscas: { dia: '2000-01-01', n: LIMITE_DE_BUSCAS_POR_DIA } }, { agora: T0, cfg: CFG, pedir: m.pedir });
  confere('dia novo zera a conta', amanha.buscas.n === 1 && m.chamadas.busca === 1); }

// 8) falhas: segura a live por algumas conferencias, depois esconde
{ const m = mundo({ live: true, quebra: 'youtube' }); let e = { aoVivo: true, id: VIDEO, titulo: 'x', desde: T0, canalId: 'UCcanal' };
  for (let k = 1; k <= FALHAS_TOLERADAS; k++) { e = await conferir(e, { agora: T0 + k * 60000, cfg: CFG, pedir: m.pedir }); confere(`falha ${k} segura a live`, e.aoVivo && e.falhas === k && e.situacao === 'erro-no-youtube'); }
  e = await conferir(e, { agora: T0 + 10 * 60000, cfg: CFG, pedir: m.pedir });
  confere('falhas demais escondem', !e.aoVivo);
  const t = mundo({ quebra: 'tunel' }); const semLive = await conferir({}, { agora: T0, cfg: CFG, pedir: t.pedir });
  confere('falha no tunel sem live', !semLive.aoVivo && semLive.situacao === 'erro-ao-ler-o-tunel'); }

// 9) ID estranho vindo do YouTube nunca vira "ao vivo"
{ const pedir = async (url) => url.includes('cloudflare') ? { result: [{ id: 't', status: 'healthy' }] } : url.includes('/channels?') ? { items: [{ id: 'UC' }] } : { items: [{ id: { videoId: '"><script>' }, snippet: { title: 't' } }] };
  const e = await conferir({}, { agora: T0, cfg: CFG, pedir });
  confere('ID fora do formato', !e.aoVivo && !respostaPublica({ aoVivo: true, id: '"><script>' }, T0).aoVivo); }

// 10) a assinatura ignora so a hora da conferencia
confere('assinatura', assinatura({ aoVivo: false, conferido: 1 }) === assinatura({ aoVivo: false, conferido: 2 }) && assinatura({ aoVivo: true, id: VIDEO }) !== assinatura({ aoVivo: false }));

console.log(erros ? `vigia: ${erros} falha(s)` : 'vigia: tudo certo');
process.exit(erros ? 1 : 0);
