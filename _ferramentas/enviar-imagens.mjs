// Envia para o R2 da Cloudflare as imagens das materias que ainda nao estao la (fase 4 do plano do site, 18/11/2026).
//
//   npm run enviar-imagens                 envia o que falta e anota o que subiu
//   npm run enviar-imagens -- --conferir   nao envia nada: so diz o que falta
//
// O QUE VAI PARA ONDE
//   _r2/m/<id>/<nome>-<largura>.webp  ->  espaco publico do R2 (brubaogg-imagens),  visto em https://img.brubaogg.com.br/m/<id>/...
// O QUE FICA ANOTADO (vai no Git)
//   _conteudo/imagens-enviadas.json    as imagens que ja estao no R2 (o teste "seo" barra a publicacao se o site citar uma que nao esta aqui)
//
// OS ORIGINAIS NAO SOBEM (decisao do Bruno, 18/11/2026): ficam so na pasta da materia, no PC dele, fora do Git; a copia de seguranca e por conta dele.
//
// ORDEM DE TRABALHO: npm run gerar (faz as versoes em _r2/)  ->  npm run enviar-imagens  ->  npm run testar  ->  commit.
// Quem envia e o programa da Cloudflare (wrangler), com a autorizacao dada UMA vez no navegador (npx wrangler login). Nenhuma chave fica nesta pasta.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ARQUIVO_DE_ENVIADAS, ENDERECO_DAS_IMAGENS, PASTA_DE_ENVIO, chaveNoR2, lerEnviadas } from './gerador/imagens.mjs';

export const ESPACO_PUBLICO = 'brubaogg-imagens';
const JUNTOS = 6; // envios ao mesmo tempo
// o nome do arquivo ja muda quando a imagem muda (leva a assinatura do conteudo): pode ficar guardado para sempre no navegador e na Cloudflare
const GUARDAR = 'public, max-age=31536000, immutable';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const soConferir = process.argv.includes('--conferir');

const wrangler = path.join(site, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const rodar = (argumentos) => new Promise((resolve) => {
  const p = spawn(process.execPath, [wrangler, ...argumentos], { cwd: site, stdio: ['ignore', 'pipe', 'pipe'] });
  let saida = '';
  p.stdout.on('data', (d) => { saida += d; });
  p.stderr.on('data', (d) => { saida += d; });
  p.on('close', (codigo) => resolve({ ok: codigo === 0, saida }));
  p.on('error', (e) => resolve({ ok: false, saida: String(e) }));
});
const noAr = async (chave) => { try { return (await fetch(`${ENDERECO_DAS_IMAGENS}/${chave}`, { method: 'HEAD' })).status === 200; } catch { return false; } };
async function emLotes(itens, quantos, fazer) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(quantos, itens.length) }, async () => { while (i < itens.length) { const k = i++; await fazer(itens[k], k); } }));
}
const gravarLista = (valor) => fs.writeFileSync(path.join(site, ARQUIVO_DE_ENVIADAS), `${JSON.stringify(valor, null, 1)}\n`);

// tudo o que o registro cita e ainda nao esta anotado como enviado
let registro = {};
try { registro = JSON.parse(fs.readFileSync(path.join(site, '_conteudo', 'imagens.json'), 'utf8')); } catch { registro = {}; }
const esperadas = [];
for (const [id, chaves] of Object.entries(registro)) for (const [chave, i] of Object.entries(chaves)) for (const w of i.ls ?? []) esperadas.push(chaveNoR2(id, `${chave}-${i.h}`, w));
const enviadas = lerEnviadas(site);
const faltam = esperadas.filter((k) => !enviadas.has(k));

console.log(`Imagens: ${esperadas.length} no registro, ${esperadas.length - faltam.length} ja no R2, ${faltam.length} para enviar.`);
if (soConferir) { for (const k of faltam.slice(0, 20)) console.log(`  falta: ${k}`); process.exit(faltam.length ? 1 : 0); }
if (!faltam.length) { console.log('Nada para enviar.'); process.exit(0); }
if (!fs.existsSync(wrangler)) { console.error('Falta o programa de envio da Cloudflare (wrangler). Instale com: npm install'); process.exit(1); }
const semArquivo = faltam.filter((k) => !fs.existsSync(path.join(site, PASTA_DE_ENVIO, k)));
if (semArquivo.length) { console.error(`${semArquivo.length} imagem(ns) do registro nao estao em ${PASTA_DE_ENVIO}/ (ex.: ${semArquivo[0]}). Rode "npm run gerar" antes.`); process.exit(1); }

const erros = [];
let feitos = 0;
await emLotes(faltam, JUNTOS, async (chave) => {
  // se ja esta no ar (envio anterior interrompido antes de anotar), so anota
  if (!(await noAr(chave))) {
    const r = await rodar(['r2', 'object', 'put', `${ESPACO_PUBLICO}/${chave}`, '--file', path.join(site, PASTA_DE_ENVIO, chave), '--content-type', 'image/webp', '--cache-control', GUARDAR, '--remote']);
    if (!r.ok) { erros.push(`${chave}: ${r.saida.trim().split('\n').slice(-2).join(' ').slice(0, 220)}`); return; }
  }
  enviadas.add(chave);
  if (++feitos % 50 === 0) { gravarLista([...enviadas].sort()); console.log(`  ${feitos} de ${faltam.length} imagens enviadas...`); }
});
gravarLista([...enviadas].sort());
console.log(`Imagens enviadas agora: ${feitos}.`);

if (erros.length) {
  console.error(`\n${erros.length} envio(s) falharam. Os que deram certo ja estao anotados; rode de novo para tentar os que faltam.`);
  for (const e of erros.slice(0, 8)) console.error(`  - ${e}`);
  if (/not authenticated|login|authentication/i.test(erros.join(' '))) console.error('\nParece que falta a autorizacao: rode "npx wrangler login" e autorize no navegador.');
  process.exit(1);
}
console.log('Tudo enviado. Agora: npm run testar, e depois o commit (com _conteudo/imagens.json e _conteudo/imagens-enviadas.json).');
