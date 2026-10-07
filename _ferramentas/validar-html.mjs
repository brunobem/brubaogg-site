// Valida o HTML de todas as paginas publicadas com o html-validate (regras em .htmlvalidate.json na raiz).
// Uso: npm run validar-html     (precisa de internet so na primeira vez, para baixar o validador)
// O aviso "prefer-native-element" para role="listbox" esta desligado de proposito: a busca usa o padrao ARIA de caixa de combinacao.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arquivos = [];
(function varrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('_') || e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) varrer(p);
    else if (e.name.endsWith('.html')) arquivos.push(path.relative(raiz, p));
  }
})(raiz);

// em lotes: a linha de comando do Windows aceita ~8 mil caracteres; com 200 paginas (o legado cresce 30 por dia) um comando so estoura
const LIMITE = 6000;
const lotes = [[]];
for (const a of arquivos) {
  const atual = lotes[lotes.length - 1];
  if (atual.length && [...atual, a].join(' ').length > LIMITE) lotes.push([a]); else atual.push(a);
}
let status = 0;
for (const lote of lotes) {
  const r = spawnSync(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['--yes', 'html-validate@11', ...lote], { cwd: raiz, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) status = r.status ?? 1;
}
if (status === 0) console.log(`\nHTML valido: ${arquivos.length} paginas conferidas (${lotes.length} lote${lotes.length > 1 ? 's' : ''}), nenhum problema.`);
process.exit(status);
