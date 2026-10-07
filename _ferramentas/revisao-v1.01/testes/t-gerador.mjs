// Gerador: o site no disco e exatamente o que o gerador produz agora, e rodar de novo nao muda nada (idempotencia).
// Roda numa COPIA temporaria; nao toca o site.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { achado, raiz, todosOsArquivos } from './lib.mjs';

const T = 'gerador';
const hash = (f) => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex');
const publicaveis = (dir) => {
  const out = new Map();
  (function varrer(d, rel) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (['node_modules', '.git', '_ferramentas', '_conteudo', '_marca'].includes(e.name)) continue;
      const r = rel ? `${rel}/${e.name}` : e.name;
      if (e.isDirectory()) varrer(path.join(d, e.name), r); else out.set(r, hash(path.join(d, e.name)));
    }
  })(dir, '');
  return out;
};

export default async function () {
  const a = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-teste-'));
  try {
    fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (src) => !/node_modules|[\\/]\.git([\\/]|$)/.test(src) });
    const rodar = () => spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', timeout: 120000 });

    const r1 = rodar();
    if (r1.status !== 0) return [achado('critico', T, `o gerador falhou: ${(r1.stderr || r1.stdout).trim().split('\n').slice(-3).join(' | ').slice(0, 300)}`)];
    const real = publicaveis(raiz), gerado1 = publicaveis(tmp);
    const difere = [...new Set([...real.keys(), ...gerado1.keys()])].filter((k) => real.get(k) !== gerado1.get(k));
    if (difere.length) a.push(achado('alto', T, `o site no disco esta diferente do que o gerador produz agora (${difere.length} arquivo(s)): falta rodar npm run gerar, ou uma pagina gerada foi editada a mao`, difere.slice(0, 5).join(', ') + (difere.length > 5 ? ' ...' : '')));

    const antes = publicaveis(tmp);
    const r2 = rodar();
    if (r2.status !== 0) a.push(achado('alto', T, 'o gerador falhou na segunda rodada'));
    const depois = publicaveis(tmp);
    const mudou = [...new Set([...antes.keys(), ...depois.keys()])].filter((k) => antes.get(k) !== depois.get(k));
    if (mudou.length) a.push(achado('alto', T, `rodar o gerador duas vezes muda ${mudou.length} arquivo(s) (nao e idempotente)`, mudou.slice(0, 5).join(', ')));
    a.push(achado('info', T, `gerador rodou limpo duas vezes numa copia (${gerado1.size} arquivos publicaveis)`));
    const sai = (r1.stdout || '').trim().split('\n').pop();
    if (sai) a.push(achado('info', T, `saida do gerador: ${sai.slice(0, 200)}`));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
  return a;
}
