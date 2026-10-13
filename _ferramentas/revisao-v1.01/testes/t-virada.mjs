// A VIRADA do GTA 6 (lento: roda so com  npm run testar -- --so=virada ). Numa COPIA do site, gera as paginas como se fosse 1 segundo antes, na hora H e 40 dias depois da data de
// lancamento (BRUBAO_AGORA) e confere que: antes sai a contagem (e o lancado escondido), na hora H sai o estado lancado, e o site inteiro continua passando nos testes em cada momento.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { achado, raiz } from './lib.mjs';
import { GTA6 } from '../../gerador/config.mjs';

const T = 'virada';
const MOMENTOS = [
  ['1 segundo antes', new Date(Date.parse(GTA6.alvo) - 1000)],
  ['na hora H', new Date(Date.parse(GTA6.alvo))],
  ['40 dias depois', new Date(Date.parse(GTA6.alvo) + 40 * 86400000)],
  ['de volta a 1 segundo antes (a geracao nao pode guardar o estado)', new Date(Date.parse(GTA6.alvo) - 1000)],
];
const PARA_TESTAR = 'lancado,links,html,seo,js,css,publico';

export default async function () {
  const a = [];
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'brubaogg-virada-'));
  try {
    fs.cpSync(raiz, tmp, { recursive: true, preserveTimestamps: true, filter: (s) => !/node_modules|[\\/]\.git([\\/]|$)/.test(s) });
    for (const [nome, quando] of MOMENTOS) {
      const env = { ...process.env, BRUBAO_AGORA: quando.toISOString() };
      const g = spawnSync(process.execPath, ['_ferramentas/gerar-site.mjs'], { cwd: tmp, encoding: 'utf8', env, timeout: 120000 });
      if (g.status !== 0) { a.push(achado('alto', T, `${nome}: o gerador falhou: ${`${g.stdout}${g.stderr}`.trim().slice(-200)}`)); continue; }
      const lanc = (arq) => /data-estado="lancado"/.test(fs.readFileSync(path.join(tmp, arq), 'utf8')), esperado = quando >= new Date(GTA6.alvo);
      for (const arq of ['index.html', 'gta6.html']) if (lanc(arq) !== esperado) a.push(achado('alto', T, `${nome}: ${arq} ${esperado ? 'devia estar no estado lancado e esta com a contagem' : 'devia estar com a contagem e esta no estado lancado'}`, arq));
      const t = spawnSync(process.execPath, ['_ferramentas/revisao-v1.01/testes/testar.mjs', `--so=${PARA_TESTAR}`], { cwd: tmp, encoding: 'utf8', env, timeout: 180000 });
      const m = `${t.stdout}`.match(/RESUMO: critico (\d+) \| alto (\d+) \| medio (\d+)/);
      if (!m) a.push(achado('alto', T, `${nome}: os testes nao terminaram: ${`${t.stdout}${t.stderr}`.slice(-200)}`));
      else if (+m[1] || +m[2] || +m[3]) a.push(achado('alto', T, `${nome}: os testes do site gerado nessa data acusaram problema (critico ${m[1]}, alto ${m[2]}, medio ${m[3]}): ${`${t.stdout}`.split('\n').filter((l) => /\[(CRITICO|ALTO|medio)\]/i.test(l)).slice(0, 2).join(' | ').slice(0, 300)}`));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  a.push(achado('info', T, `${MOMENTOS.length} momentos simulados em torno de ${GTA6.alvo}`));
  return a;
}
