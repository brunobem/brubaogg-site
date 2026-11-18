// O que vai ao ar: nada interno, nada secreto, nada pesado sem querer.
import fs from 'node:fs';
import path from 'node:path';
import { achado, arquivosPublicados, existe, ler, raiz, todosOsArquivos, EXCLUIDOS } from './lib.mjs';

const T = 'publico';
const EXTENSOES_OK = new Set(['.html', '.css', '.js', '.json', '.svg', '.png', '.webp', '.jpg', '.jpeg', '.gif', '.ico', '.xml', '.txt', '.woff', '.woff2']);
const SEGREDOS = [
  [/AIza[0-9A-Za-z_-]{35}/, 'chave de API do Google'],
  [/ghp_[0-9A-Za-z]{30,}/, 'token do GitHub'],
  [/sk-[A-Za-z0-9]{20,}/, 'chave de API (sk-...)'],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'chave privada'],
  [/client_secret["']?\s*[:=]\s*["'][^"']{8,}/i, 'client_secret'],
  [/(?:access|refresh)_token["']?\s*[:=]\s*["'][^"']{12,}/i, 'token de acesso'],
];

export default async function () {
  const a = [];
  const pub = arquivosPublicados();

  if (!existe('_config.yml')) a.push(achado('alto', T, '_config.yml ausente: README, package.json e LEIA-ME ficariam publicos'));
  else for (const esperado of ['README.md', 'package.json']) if (!EXCLUIDOS.includes(esperado)) a.push(achado('alto', T, `${esperado} nao esta no exclude do _config.yml (ficaria publico)`));

  for (const rel of pub) {
    const ext = path.extname(rel).toLowerCase();
    const tam = fs.statSync(path.join(raiz, rel)).size;
    if (rel !== 'CNAME' && !EXTENSOES_OK.has(ext)) a.push(achado('medio', T, `tipo de arquivo inesperado entre os publicados (${ext || 'sem extensao'})`, rel));
    if (/\.(md|mjs|py|ps1|bat|sh|xlsx|csv|log|env|map)$/i.test(rel) || /(^|\/)(package(-lock)?\.json|\.env|tokens?\.json)$/i.test(rel)) a.push(achado('alto', T, 'arquivo interno seria publicado', rel));
    if (tam > 1024 * 1024) a.push(achado('baixo', T, `arquivo grande (${(tam / 1024 / 1024).toFixed(1)} MB)`, rel));
    if (/\.(html|css|js|json|svg|xml|txt)$/i.test(rel) || rel === 'CNAME') {
      const txt = ler(rel);
      for (const [re, nome] of SEGREDOS) if (re.test(txt)) a.push(achado('critico', T, `possivel segredo publicado: ${nome}`, rel));
    }
  }
  // arquivos sensiveis no repositorio (mesmo fora do que e publicado: o repositorio e publico)
  for (const rel of todosOsArquivos()) {
    if (/(^|\/)(\.env(\..*)?|tokens?\.json|credentials?\.json|client_secret.*\.json|.*\.pem|.*\.key)$/i.test(rel)) a.push(achado('critico', T, 'arquivo de credencial dentro da pasta do repositorio (o repositorio e publico)', rel));
  }
  if (!existe('.gitignore') || !/\.env/.test(ler('.gitignore'))) a.push(achado('alto', T, '.gitignore nao protege .env'));
  a.push(achado('info', T, `${pub.length} arquivos publicados, ${(pub.reduce((s, r) => s + fs.statSync(path.join(raiz, r)).size, 0) / 1024 / 1024).toFixed(1)} MB`));
  return a;
}
