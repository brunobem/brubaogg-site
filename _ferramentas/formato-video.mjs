// Descobre se um video do YouTube e Short (vertical) ou horizontal, direto no YouTube.
// Uso: npm run formato -- <ID ou link> [<ID ou link> ...]
// Saida: uma linha por video ("ID  short" ou "ID  horizontal"). Esse e o valor do campo "formato" do JSON da materia.
// Nunca chuta: se o YouTube nao der uma resposta clara (sem rede, limite de acessos, resposta estranha), diz que NAO sabe e
// termina com erro. Quem chama deve parar nesse video e avisar o Bruno.
import { normalizarId } from './gerador/util.mjs';
import { formatoDe } from './gerador/youtube.mjs';

const pedidos = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids = pedidos.map((p) => normalizarId(p) ?? p); // aceita o ID ou o link do video; o que nao der continua como veio (e o formatoDe recusa)
if (!pedidos.length) {
  console.error('Uso: npm run formato -- ID [ID ...]');
  process.exit(2);
}

let falhas = 0;
for (const id of ids) {
  const r = await formatoDe(id);
  if (r.erro) {
    falhas++;
    console.log(`${id}  NAO SEI: ${r.erro}`);
  } else console.log(`${id}  ${r.formato}`);
}
if (falhas) {
  console.error(`\n${falhas} video(s) sem resposta confiavel. Nao preencha "formato" no chute: tente de novo com internet ou avise o Bruno.`);
  process.exit(1);
}
