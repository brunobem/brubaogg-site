// Servidor local que se comporta como o GitHub Pages para MEDIR desempenho: comprime texto (gzip) e manda Cache-Control: max-age=600.
// (o "python -m http.server" nao comprime, o que faz paginas grandes parecerem 8x mais pesadas do que serao no ar)
// Uso: node servidor.mjs PORTA PASTA          Ex.: node servidor.mjs 8105 ../../../_site
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const [porta, pasta] = [Number(process.argv[2] ?? 8105), path.resolve(process.argv[3] ?? '.')];
const TIPOS = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.wasm': 'application/wasm' };
const COMPRIME = new Set(['.html', '.css', '.js', '.json', '.svg', '.xml', '.txt']);

// so para uso local: POST /__salvar/NOME.ext com o arquivo em base64 grava em _estresse/saida/ (serve para tirar uma imagem desenhada no navegador)
const SAIDA = path.resolve(pasta, '..', '..', 'saida');
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url.startsWith('/__salvar/')) {
    const nome = path.basename(decodeURIComponent(req.url.slice(10)));
    const partes = []; req.on('data', (d) => partes.push(d)); req.on('end', () => { fs.mkdirSync(SAIDA, { recursive: true }); fs.writeFileSync(path.join(SAIDA, nome), Buffer.from(Buffer.concat(partes).toString(), 'base64')); res.writeHead(204, { 'Access-Control-Allow-Origin': '*' }); res.end(); });
    return;
  }
  const url = decodeURIComponent(req.url.split('?')[0]);
  let arq = path.join(pasta, url.endsWith('/') ? `${url}index.html` : url);
  if (!arq.startsWith(pasta) || !fs.existsSync(arq) || fs.statSync(arq).isDirectory()) {
    const nf = path.join(pasta, '404.html');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(fs.existsSync(nf) ? fs.readFileSync(nf) : 'nao encontrado'); return;
  }
  const ext = path.extname(arq).toLowerCase();
  const cab = { 'Content-Type': TIPOS[ext] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600', Date: new Date().toUTCString() };
  const dados = fs.readFileSync(arq);
  if (COMPRIME.has(ext) && /\bgzip\b/.test(req.headers['accept-encoding'] ?? '')) { const z = zlib.gzipSync(dados, { level: 6 }); res.writeHead(200, { ...cab, 'Content-Encoding': 'gzip', 'Content-Length': z.length }); res.end(req.method === 'HEAD' ? undefined : z); return; }
  res.writeHead(200, { ...cab, 'Content-Length': dados.length }); res.end(req.method === 'HEAD' ? undefined : dados);
}).listen(porta, () => console.log(`servindo ${pasta} em http://localhost:${porta}`));
