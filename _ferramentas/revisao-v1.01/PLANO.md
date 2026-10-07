# Revisão detalhada do código: de v1 para v1.01

**Objetivo:** achar o que pode quebrar o site, o design e a experiência, antes que quebre. Criticar o trabalho com evidência, corrigir e deixar testes que impeçam a volta do problema.

## Como cada bloco funciona (o mesmo método nos 12)
1. **Mapear:** ler o código do bloco e listar o que ele faz, o que depende dele e de quem ele depende.
2. **Testar o que existe:** rodar testes reais (não só ler). O que for útil vira script em `_ferramentas/revisao-v1.01/testes/`, não fica solto.
3. **Tentar quebrar:** montar cenários hostis (dados estranhos, volume, telas, rede ruim, erro humano) e ver o que acontece.
4. **Criticar:** registrar cada achado com **severidade** (crítico, alto, médio, baixo), **evidência** e **como reproduzir**.
5. **Corrigir e testar de novo:** corrigir o que for crítico, alto e médio; testar a correção; testar que não quebrou o resto.
6. **Relatório curto** do bloco e marcação aqui. Só passo para o próximo depois disso.

**Regras do trabalho**
- Antes de mudar qualquer coisa: backup da pasta (Bloco 0).
- URLs protegidas não mudam (`index.html`, `gta6.html`, termos, privacidade, MCP). **Reforço do Bruno (07/10/2026): `termos-`/`privacidade-` do TikTok e do YouTube e `mcp-tiktok`/`mcp-youtube` são usadas por automações; o endereço é intocável. O texto dessas páginas só muda com aprovação dele.**
- Não mexo no **texto** das matérias (é da outra sessão). Só no que o site faz com elas.
- Não publico no GitHub. Você sobe.
- Cada bloco termina com `npm run verificar` limpo.

## Decisões já tomadas (antes do Bloco 0, em 07/10/2026)
Escala-alvo informada pelo Bruno: ~250 matérias de 2026 hoje, mais 2 a 3 por dia, site no ar por 2 a 3 anos: **2.000 a 3.500 matérias**. Público muito mobile.

| Tema | Decisão |
|---|---|
| Listas e passeio | **Os 30 mais recentes já vêm no HTML** (rápido e indexável) e um botão **"Ver mais"** (sem número no texto, decisão do Bruno: sem ansiedade de contagem) **acumula**: cada clique mostra mais 30. **Sem seletor 30/50/100 e sem páginas numeradas.** O estado vai na URL (`?n=90`), então voltar funciona. O que vem depois da página 1 é lido de **arquivos por mês** (`assets/data/lista/AAAA-MM.json` + manifesto), nunca do Pagefind (busca vazia nele baixa o índice inteiro, 3 MB). Vale para a busca vazia (todas as categorias misturadas, mais recente primeiro) e para as páginas de categoria. Lançamentos se comportam como notícia: descem com o tempo e seguem buscáveis. |
| Busca | **Pagefind** só quando a pessoa digita (carregar só então). **Busca vazia = os mais recentes**, sem chamar o Pagefind. **Com texto:** quem tem o jogo no título/tag (régua = 40% da melhor pontuação da busca sem filtro) vem primeiro; dentro do mesmo nível, o mais novo na frente; sem seletor de ordem. **Um filtro só: categoria** (Todas, Notícia, Review, Lançamento, GTA 6). **Sem filtro de ano** e **sem ranking por acessos** (exigiria rastrear visitantes; no futuro, opção sem cookies: usar as visualizações do próprio YouTube na hora de gerar). Tags que casam com o texto continuam como atalho; "título exato vai direto" continua. Protótipo aprovado como direção, a validar na tela. |
| Player do YouTube | **Manter o iframe.** No Bloco 7 medir o peso real e levar o número ao Bruno. Botão "Assistir no YouTube" ao lado do player: decisão do Bloco 3. |
| CSS | **Só a Etapa 1:** reorganizar por camadas sem mudar o visual, provado por comparação antes/depois. **Etapa 2 (reduzir breakpoints) cancelada:** o público é mobile e já houve quebras; os pontos de mudança de layout só mudam para consertar, nunca para simplificar. |
| Rede no build | **Falhar alto, nunca chutar.** Campo `formato` (`short`/`horizontal`) no JSON da matéria (já gravado nas 37) e `npm run formato -- ID` (responde `NAO SEI` em vez de chutar). Bloco 1: o gerador passa a ler `formato` e para de consultar o YouTube; o cache `shorts-cache.json` sai. |
| Maiúsculas/minúsculas | Hoje correto (0 quebrados no ar). Virar teste no `verificar` (nome exato do arquivo) + regra: arquivo minúsculo, sem espaço nem acento. Renomear só mudando a caixa: avisar (o Git no Windows não percebe). |
| Paginação de tags e do hub `gta6.html` | **Aprovada** porque não muda URL nem tira nada do sitemap: só passa a valer acima de 30 itens (hoje nada muda). Condição: páginas estáticas de arquivo por mês garantem o rastreio das matérias antigas (Bloco 8). |
| Pasta `noticias/` | Continua **plana** (URLs já indexadas não mudam). Só a tela do github.com trunca a listagem em 1.000 itens; Git, GitHub Desktop e Pages não têm problema. Confirmar no Bloco 7. |
| Regra de conteúdo | **Só entra no site o vídeo que tem matéria aprovada.** As páginas de playlist (`cortes.html`, `lives.html`) só expõem o player da playlist e ficam como estão (sem matéria e sem o limite de 15). Já é assim hoje (37 páginas, 0 só com vídeo). |
| Ritmo do legado | O MCP do YouTube tem cota de 10 mil por dia e cada transcrição custa ~250 a 500, então o legado entra **~30 vídeos por dia**, aos poucos, além de 2 a 3 novos por dia. Os ~250 vídeos de 2026 chegam em cerca de uma semana. **Consequência:** paginação das listas e busca em escala (Pagefind) passam a ser prioridade, antes de o legado crescer. |
| Endereço e título | **Vêm da matéria enviada, não do título do vídeo no YouTube.** Para os vídeos do legado (fora dos 15 recentes) já funciona assim. As 37 primeiras ainda têm o endereço vindo do título do vídeo: sobra de transição, **resolver depois** (decisão do Bruno em 07/10/2026). |
| Método | Cada bloco abre com **"Decisões do bloco"** e nada muda antes da resposta do Bruno. |

### Resultado do protótipo Pagefind (07/10/2026)
Cópia fora do repositório: `MCP SOCIAL\_prototipo-pagefind\` (37 matérias reais + 3.000 simuladas = 3.037; Pagefind 1.5.2). Tela de teste: `prototipo.html` na cópia (servidor "prototipo", porta 8100). Nada disso foi para o site real.

| Medida (3.037 matérias) | Desenho atual (`busca.json`) | Pagefind |
|---|---|---|
| Busca por palavra, 1ª vez na visita | 2.328 KB comprimidos (6.181 KB brutos) | **321 KB** (motor ~155 KB fica em cache) |
| Busca seguinte, mesma visita | 0 (já baixou tudo) | **~84 KB** |
| Lista vazia por data (índice inteiro) | n/a | **3.072 KB: não serve para listas** |
| Página 2 de uma lista, mesma visita | n/a | 42 KB (índice já carregado) |
| Geração do índice | n/a | 4,5 s, 3.151 arquivos, 7,7 MB em disco |

- **Qualidade:** acento ("midia fisica" = "mídia física"), plural/singular, prefixo ("silent hil"), título exato e ranking (matérias reais primeiro) funcionam. Filtros por categoria e ano com contagem funcionam. Ponto fraco: alguns textos sem sentido ("asdfghjkl") devolvem milhares de resultados soltos; tratável por corte de pontuação ou aviso na tela.
- **Achado de operação:** a cada build **100% dos 102 pedaços do índice são reescritos** (~2,8 MB), mesmo com 1 matéria nova. Commitar `pagefind/` somaria ~2,8 MB por commit ao histórico do Git (cerca de 1 GB por ano com 1 commit por dia). **Proposta:** gerar o índice no servidor com GitHub Actions e não commitar. Decisão no Bloco 11.
- **Listas:** particionar por mês e categoria (`assets/data/lista/<categoria>-<AAAA-MM>.json` + um manifesto pequeno com a contagem por mês). Maior mês simulado (156 itens): 14 KB comprimidos; uma página de 100 itens cruza no máximo 2 meses (~28 KB). Só os meses tocados mudam em cada commit. As mesmas partições alimentam páginas estáticas de "arquivo por mês" (rastreio do Google, sem JavaScript).
- **Modelo "passeio + busca" (protótipo v2, mesma cópia):** página 1 pronta no HTML = 0 KB além da página; 3 cliques em "Ver mais" (120 matérias) = 1 arquivo de mês, ~19 KB comprimidos; busca por palavra com o motor já carregado = ~109 KB (3 pedaços de índice + 30 fragmentos); "Ver mais" na busca = ~42 KB a cada 30; trocar a categoria = ~23 KB. Detalhes de implementação: o Pagefind só deve carregar quando a pessoa foca/digita (no protótipo ele carrega ao abrir só para contar o total); abrir `busca.html?q=...` não pode piscar a lista estática de recentes (esconder com um script mínimo quando há `q`).
- O gerador atual aguentou 3.037 matérias em 10,6 s. A base medida do desenho atual nesse tamanho: `noticias.html` 1.949 KB (221 KB comprimidos), `gta6.html` 699 KB, `busca.json` 6.181 KB, 574 páginas de tag, `sitemap.xml` 480 KB.

### Achado confirmado (07/10/2026) , RESOLVIDO no Bloco 2 (ver "Resultado do Bloco 2")
Números levantados: 34 das 37 URLs mudariam se o endereço passasse a vir do título da matéria; 21 das 37 matérias têm título com mais de 60 caracteres que o guia pede para encurtar (os títulos ainda não são finais); 5 endereços são cortados no meio de uma palavra pelo limite de 70 letras. GitHub Pages não tem redirecionamento (seria preciso gerar páginas-aviso nos endereços antigos).
**Gatilho prático:** a primeira das 37 sai do feed em ~5 a 7 dias. Se o `npm run gerar` mostrar "esse video nao esta entre os 15 mais recentes", **não** acrescentar `categoria` e `publicado` nas 37 originais para passar (o endereço mudaria): chamar a sessão do site.

### Detalhe do achado (entra no Bloco 2)
**A matéria depende do feed do YouTube (só os 15 mais recentes) para título, data e categoria.** Quando o vídeo sai dos 15 recentes (Notícias: ~5 a 7 dias com 2 a 3 vídeos por dia):
1. `npm run gerar` **para com erro** se o JSON não tem `categoria` e `publicado` (hoje 0 das 37 têm). Alto, mas ao menos é barulhento.
2. **Pior, e silencioso:** se o Bruno corrigir só adicionando esses dois campos, o endereço da matéria **muda**, porque o slug passa a vir do `titulo` do JSON em vez do título original do vídeo (37 de 37 matérias têm `titulo` diferente do título do vídeo). O link antigo, já indexado, vira 404. Crítico. Referência: `gerar-site.mjs` linhas 247 a 262 (`title: m.titulo ?? id`) e linha 306 (`slugify(limparTitulo(v.title))`).
- **Correção proposta (a decidir no Bloco 2):** "carimbar" os dados do vídeo no JSON da matéria (`slug` fixo, `categoria`, `publicado`, `formato`), preenchidos por ferramenta no `nova`/`aprovar` enquanto o vídeo ainda está no feed. A matéria deixa de depender do feed para sempre. O limite de 15 passa a afetar só os vídeos sem matéria (cartões que levam ao YouTube), como o Bruno descreveu.

## Os blocos

| # | Bloco | Escopo | Tamanho | Depende de |
|---|---|---|---|---|
| 0 | **Base e ferramentas de teste** | backup, versões, testes reutilizáveis | P | |
| 1 | **Gerador** (`gerar-site.mjs`, 663 linhas) | arquitetura, robustez, dados, erros | G | 0 |
| 2 | **Fluxo de conteúdo** | scripts, JSON das matérias, tags, vídeos antigos | M | 1 |
| 3 | **HTML gerado e páginas fixas** | estrutura, `<head>`, títulos, páginas legais | M | 1 |
| 4 | **CSS** (494 linhas em camadas) | organização, conflitos, estados, quebra de design | G | 3 |
| 5 | **JavaScript** (`busca.js`, `contador.js`) | robustez, acessibilidade, volume | M | 3 |
| 6 | **Cenários que quebram o design e a experiência** | conteúdo extremo, rede ruim, zoom, sem JS | G | 4, 5 |
| 7 | **Desempenho e escala** | peso, carregamento, 300+ matérias | G | 4, 5 |
| 8 | **SEO e indexação** | sitemap, dados estruturados, canonical | M | 3 |
| 9 | **Acessibilidade** | teclado, contraste, leitor de tela | M | 4, 5 |
| 10 | **Segurança, privacidade e textos legais** | exposição, requisições externas, cookies | M | 3 |
| 11 | **Publicação e operação** | GitHub Pages, build limpo, repositório | M | todos |
| 12 | **Fechamento** | lista final, regressão geral, v1.01 | M | todos |

---

### Bloco 0: Base e ferramentas de teste (P)
- Backup completo (`_backup-v1.0-antes-da-revisao`), registro das versões (Node, Python) e do tamanho de cada arquivo.
- Transformar os testes que fiz soltos (overflow, player dentro da caixa, sobreposição, links) em scripts guardados em `testes/`, rodáveis com um comando.
- Definir a matriz de telas: 280, 320, 344, 375, 393, 412, 440, 600, 768, 820, 861, 912, 1024, 1032, 1280, 1440, 1920, 2560, mais alturas baixas (600, 700) e celulares deitados.
- **Entrega:** `npm run testar` (ou equivalente) e um "estado inicial" documentado para comparar no fim.

### Bloco 1: Gerador (G)
**Arquivo:** `_ferramentas/gerar-site.mjs`.
- **Arquitetura:** um arquivo de 663 linhas, estado global que muda (contagens, mapas), ordem de execução que já nos quebrou duas vezes. Avaliar se divide em módulos pequenos.
- **Dados de entrada:** o que acontece com JSON inválido, `corpo` que não é lista, `tags` que não é lista, `titulo` vazio, `resumo` gigante, texto com `<`, `&`, aspas, emoji, quebra de linha, título repetido, ID repetido, `categoria` inexistente, data inválida.
- **Slugs:** colisão entre vídeos, entre categorias, título só com símbolos, título muito longo, acento, `#`.
- **Datas e fuso:** vídeo publicado perto da meia-noite, horário de verão, formato exibido.
- **Rede no build:** `ehShort` e o feed do YouTube falham em silêncio? O que o site vira se o YouTube estiver fora?
- **Idempotência:** rodar duas vezes dá o mesmo resultado? Apagar matéria remove a página? Interromper no meio deixa lixo?
- **Mensagens de erro:** o erro diz qual arquivo e o que fazer?
- **Cenários de quebra:** 0 matérias, 1, 400; tags.json com laço (A é pai de B, B é pai de A); tag sem nome.

**Investigação feita (07/10/2026), nada alterado ainda.** Teste guardado: `npm run testar -- --so=fuzz` (24 cenários hostis em cópias; ~8 s).
| Gravidade | Achado confirmado |
|---|---|
| ALTO | **Status fora de "rascunho" publica.** `"Rascunho"` (R maiúsculo), `"draft"` e `true` publicam o texto. A regra `status !== 'rascunho'` está repetida em 5 pontos do código |
| ALTO | **JSON com BOM derruba o build.** O PowerShell 5.1 grava UTF-8 com BOM por padrão; a sessão de conteúdo no Windows pode produzir isso |
| ALTO | **Sem internet, o gerador chuta "horizontal" em silêncio e grava o chute no cache** (substituído pelo campo `formato`, já decidido) |
| médio | Sem validação de tipo: `tags` como texto vira uma etiqueta por letra; `tags` como objeto dá `TypeError: lista is not iterable` sem dizer o arquivo; `titulo: ""` gera `<h1>` vazio; parágrafo vazio gera `<p></p>`; resumo de 6.000 caracteres vai inteiro para o `meta description`; título de 400 caracteres vai inteiro para o `<title>` |
| médio | `tags.json` ou `playlists.json` inválidos dão `SyntaxError: Unexpected end of JSON input` sem o nome do arquivo |
| médio | O `lastmod` do sitemap vem da data do arquivo (mtime): depende da máquina; num clone novo do GitHub ou num build no servidor (Actions) todas as datas virariam "hoje" |
| baixo | Um só arquivo de 663 linhas com estado global e ordem de execução que já nos quebrou duas vezes; as páginas escritas à mão são alteradas em 3 lugares diferentes; ids de playlist, domínio e categorias repetidos em 3 scripts |
| ok | Texto com HTML, aspas e emoji sai escapado; duas matérias com o mesmo título não se sobrescrevem; `publicado` e `categoria` inválidos dão erro claro com o arquivo; `tags.json` com pai circular não trava; 0 matérias gera um site vazio sem erro; apagar uma matéria remove a página (e só 3 páginas relacionadas são reescritas) |

**Resultado do Bloco 1 (07/10/2026), aplicado com as 5 recomendações aprovadas.** Saída do site **idêntica** (103 arquivos publicáveis, comparados arquivo por arquivo com o backup de antes do bloco; teste de controle com defeito plantado acusou 69 diferenças).
| Decisão | O que ficou |
|---|---|
| 1. Status estrito | Só vale ausente (aprovada) ou exatamente `"rascunho"`; qualquer outro valor para o gerador com erro. BOM aceito. Todo erro diz arquivo, campo e o que fazer; vários problemas aparecem juntos numa lista, sem pilha de erro |
| 2. Validação | Erros que param: tipo errado, `resumo`/`corpo`/`formato` ausentes, parágrafo ou título vazio, `[CONFERIR` ou texto de modelo do `npm run nova` numa matéria aprovada. Avisos que não param: título acima de 70, resumo acima de 160, mais de 8 tags. `<title>` limitado a 100 e descrição a 160 caracteres (texto normal não muda) |
| 3. Módulos | `gerar-site.mjs` (entrada, ~70 linhas) + `gerador/`: `config`, `dados`, `paginas`, `modelos`, `saida`, `tags`, `icones`, `util`, `youtube`. Sem estado global solto: tudo passa por um contexto explícito e a ordem dos passos está escrita na entrada |
| 4. `lastmod` | Guardado em `_conteudo/lastmod.json` (hash + data da última mudança de cada página). Independe da data dos arquivos; partiu das datas atuais, então nada foi zerado. Previas de teste não mexem nele |
| 5. Config única | Categorias, playlists, abas, redes, autor e domínio só em `gerador/config.mjs`; `atualizar-videos` e `pendentes` leem de lá |
| Extras | `formato` lido do JSON (cache de Short e consulta ao YouTube no build removidos: gerar não usa internet); `nova` grava o `formato` e `aprovar` confirma o que faltar, recusando se o YouTube não responder; `verificar` agora acusa maiúscula/minúscula errada; `atualizar-videos` recusa gravar uma lista que encolheu de forma suspeita; `--com-videos-sem-texto` passou a deixar a marca de modo de teste (antes o `verificar` não avisava) |
Testes: `npm run testar -- --so=fuzz` = 28 cenários hostis, **0 achados** (eram 5 altos e 8 médios); estático igual ao estado inicial (nenhuma regressão); fluxo `pendentes → nova → aprovar → gerar` conferido numa cópia.

### Bloco 2: Fluxo de conteúdo (M)
**Arquivos:** `atualizar-videos`, `nova-materia`, `aprovar-materia`, `pendentes`, `verificar-links`, `package.json`, `tags.json`, guia editorial.
- O contrato do JSON está completo e validado em um só lugar?
- Duas sessões gravando ao mesmo tempo; aprovar sem querer; arquivo meio escrito.
- Vídeos antigos (`categoria` e `publicado`): data errada, categoria errada, vídeo que depois entra nos 15 recentes (duplicado?).
- O feed do YouTube só traz 15: o que acontece com vídeo que sai da lista e já tem matéria.
- Comandos com ID errado, com espaço, com caractere estranho.
- Documentação (README, guia) bate com o comportamento real?

**Investigação do Bloco 2 (07/10/2026), nada alterado ainda.** Teste guardado: `npm run testar -- --so=fluxo` (cenários em cópias).
| Gravidade | Achado confirmado |
|---|---|
| ALTO | **Prazo real do feed:** o feed de Notícias está cheio (15) e corre a 1,5 vídeo por dia. As 3 matérias mais antigas (`q1T0PqdDRC4`, `1yfTKljivZo`, `WIKBqiaE4m4`) saem com os próximos 3 vídeos: ~2 dias. Reviews tem o mesmo risco, mas a ~0,14 por dia (~3 semanas) |
| ALTO | **A mensagem de erro do gerador induz o erro:** manda acrescentar `categoria` e `publicado`, sem avisar que isso muda o endereço da matéria (link indexado vira 404) |
| ALTO | **Matéria já publicada que volta para `rascunho`** (ex.: a sessão de conteúdo regravou o arquivo) tem a página apagada sem nenhum aviso |
| ALTO | **`npm run pendentes` não mostra rascunhos de vídeos antigos** (fora do feed): o legado de 30 por dia fica invisível |
| ALTO | `publicado` no futuro (2062) ou antes do YouTube existir (1999) é aceito: a matéria ficaria fixa no topo das listas |
| médio | `aprovar --todos` publica todos os rascunhos de uma vez, sem mostrar a lista nem pedir confirmação |
| médio | `aprovar` aceita `../` no ID e altera arquivo fora da pasta de matérias |
| médio | Um rascunho ainda sendo gravado pela outra sessão (JSON incompleto) derruba o gerador inteiro, mesmo sem ser publicado |
| médio | `categoria`/`publicado` que discordam do feed são ignorados em silêncio |
| baixo | `aprovar`/`nova`/`formato` não aceitam o link do YouTube no lugar do ID |

**Resultado do Bloco 2 (07/10/2026), com as decisões do Bruno.**
| Decisão | O que ficou |
|---|---|
| Carimbo: matéria independente do feed | **Registro de endereços** `_conteudo/enderecos.json` (endereço, categoria e data de cada matéria). Fica fora do JSON da matéria de propósito: se a outra sessão regravar o texto, o endereço publicado não se perde. Nasce na aprovação (ou na primeira geração, mantendo a página que já está no ar) e depois é fixo. O gerador não usa mais o feed para as matérias; o feed só serve a `pendentes`, `nova` e à contagem de vídeos sem matéria |
| Endereço vem do título da matéria | Regra: título da matéria define o endereço na aprovação, até 60 letras em palavra inteira; mudar título depois (ou o título do vídeo, teste A/B) **não muda o endereço** |
| Migrar as 37 já | **Feito.** 21 títulos reduzidos para até 60 caracteres (lista em [BLOCO-2-titulos.md](BLOCO-2-titulos.md)); 35 endereços mudaram (2 já coincidiam). Os 37 endereços que estavam no ar continuam respondendo: 35 viraram página de redirecionamento (refresh imediato + canonical), 2 seguem sendo a página. Redirecionamentos fora do sitemap. Verificado contra o sitemap que está no ar e num navegador real |
| Página publicada que some | Aviso forte no `gerar` (`ATENCAO: ... NAO sera(ao) gerada(s)`) e o `verificar` falha, com a saída `npm run retirar -- ID` (tira de propósito; o endereço passa a levar para a lista) |
| Aprovação em lote | `aprovar --todos` só mostra; `--confirmar` aprova. `aprovar` registra o endereço, confirma o formato, grava com arquivo temporário e recusa se o arquivo mudou durante a aprovação |
| Arquivo ilegível | Rascunho ou arquivo novo ilegível é ignorado com aviso; se a matéria já está publicada, o gerador para (a página não pode sumir por um arquivo quebrado) |
| Legado (30 por dia) | `pendentes -- --rascunhos` lista todos os rascunhos, inclusive de vídeos antigos, com palavras e pendências. `publicado` validado (entre 2005 e hoje). `categoria` do arquivo que discorda do registro vira aviso |
| Comandos | `nova`, `aprovar`, `formato`, `endereco` e `retirar` aceitam o ID ou o link do vídeo; `../` e IDs inválidos são recusados |
| Contrato único | `gerador/contrato.mjs` é usado pelo gerador, `aprovar`, `pendentes` e pelos testes (sem segunda cópia) |
| Skill e guias | Skill `materia-brubaogg`, `GUIA-EDITORIAL.md` e `README.md` atualizados (título obrigatório e que define o endereço, vídeos antigos, não regravar matéria aprovada, o que o site recusa) |
Testes: `--so=fluxo` 10 grupos de cenários, 0 achados (eram 5 altos); `--so=fuzz` 28 cenários, 0; estático sem nenhum achado alto (estado inicial: 1) e com menos avisos.

### Bloco 3: HTML gerado e páginas fixas (M)
- Estrutura: um só `<h1>`, ordem dos títulos, `main`, `nav`, `footer`, `lang`.
- `<head>` de cada tipo de página: título, descrição, canonical, Open Graph, Twitter, `robots`.
- Os 12 arquivos escritos à mão repetem blocos entre si: o que pode divergir?
- Validação do HTML (marcadores de cabeçalho e rodapé, IDs duplicados, tags não fechadas).
- Páginas legais: o texto bate com o que o site realmente faz hoje (Twitch, Google Fonts, YouTube)?
- Os marcadores `<!--site:header-->` etc.: o que acontece se alguém editar entre eles ou apagar um.

**Investigação do Bloco 3 (07/10/2026), nada alterado ainda.** Testes guardados: `npm run testar -- --so=marcadores` (cenários de marcadores) e o `html` estático.
| Gravidade | Achado confirmado |
|---|---|
| ALTO | **Marcador mexido = página quebrada em silêncio.** Sem o fechamento do `site:header`, sem o rodapé, cabeçalho repetido, home sem os marcadores do feed, `gta6.html` sem os das novidades e **página nova sem marcadores**: em todos o gerador termina com sucesso e a página fica sem a parte gerada ou desatualizada. Ícone com nome errado dá erro sem dizer a página. Aba de player sem a lista de chips: sem aviso |
| médio | **11 páginas escritas à mão sem `og:title`/`og:description`** (todas menos a home, inclusive `gta6.html`) e nenhuma delas tem `twitter:card`: o link compartilhado no Discord, WhatsApp e TikTok sai sem prévia boa |
| médio | **Dados repetidos à mão** que podem divergir: a data do GTA 6 aparece em ~8 lugares (`data-alvo` na home e em `gta6.html`, texto da home, descrição, 3 respostas do FAQ); a lista de redes do JSON-LD da home é uma cópia de `SOCIAIS` (hoje iguais) |
| médio | **Texto legal do site desatualizado em dois pontos:** não cita as **miniaturas dos vídeos** (`i.ytimg.com`, do Google, carregadas em todas as listas e na busca) e não diz que as **matérias são escritas com apoio de IA** (a assinatura "Claudio IA" aparece na página, mas não nos termos/privacidade) |
| médio | 6 páginas legais têm dois `<h1>` (português e inglês) e o bloco em inglês **não está marcado com `lang="en"`** (leitor de tela lê o inglês com sotaque de português) |
| baixo | Os títulos do rodapé são `<h3>` em páginas que não têm `<h2>`: salto de nível em 22 páginas |
| baixo | `<h1>` da home junta os dois textos sem espaço ("Brubão Good GameBRUBAOGG") para leitor de tela e Google |
| baixo | Descrições de `404.html` (22 caracteres) e `busca.html` (32) abaixo do ideal (ambas `noindex`) |
| ok | Cookies/armazenamento: o JS do site não usa `localStorage`, cookies nem similares (o texto "o site em si não define cookies" é verdadeiro); Google Fonts e YouTube nocookie estão citados; canonical, `lang`, viewport e `main` corretos em todas |

**Resultado do Bloco 3 (07/10/2026), com as recomendações aprovadas.** Endereços de termos, privacidade e MCP (TikTok e YouTube): **inalterados**; o texto visível das 6 páginas de automação foi conferido letra a letra contra o backup e é idêntico.
| Item | O que ficou |
|---|---|
| Marcadores à prova de erro | O gerador monta tudo em memória, confere os marcadores e, se algo estiver errado (faltando, repetido, fora de ordem, ícone inexistente, página nova sem marcadores, `dado` desconhecido), **para sem gravar nada** dizendo a página e o marcador. Aba sem chips só avisa. Cenários em `npm run testar -- --so=marcadores`: 0 achados (eram 6 altos) |
| Prévia de compartilhamento | Bloco único `social()` para páginas geradas e escritas à mão (`og:title/description/type/site_name/url/locale/image` + `twitter:card`). As 12 páginas escritas à mão ganharam o marcador `site:social`, que o gerador preenche a partir do `<title>` e da descrição da própria página |
| Dados que se repetem | Data do GTA 6 em `GTA6` (`config.mjs`), preenchida em ~8 lugares por marcadores `dado` e `data-modelo`; contagem regressiva (`data-alvo`) também; JSON-LD da home gerado de `SOCIAIS` (conteúdo idêntico ao anterior). Um teste acusa data do GTA 6 escrita à mão fora de marcador |
| Páginas legais | `lang="en"` no bloco em inglês das 6 (sem mudar texto nem URL); dois `<h1>` por página passam a ser aceitos quando cada um está em bloco de idioma diferente. Textos novos aprovados em `privacidade.html` (miniaturas `ytimg.com`) e `termos.html` (matérias com apoio de IA, em PT e EN) |
| Pequenos acertos | `<h1>` da home com espaço; títulos do rodapé deixam de ser `<h3>` (classe `footer-titulo`); descrições de `404` e `busca` melhores; botão de envio escondido no formulário de busca (`.sr-only`, fora da ordem do Tab); `<!DOCTYPE html>` em maiúsculas; sem espaço no fim das linhas |
| Validador de HTML | `npm run validar-html` (`html-validate`, regras em `.htmlvalidate.json`). Resultado: **103 páginas, 0 problemas** (antes: 261 avisos de 4 tipos, todos cosméticos ou de acessibilidade leve). Teste de controle com defeito plantado acusou ID duplicado e imagem sem `alt` |
| Higiene de arquivos | 63 arquivos de texto estavam com quebra de linha do Windows (24 já antes da revisão); normalizados para LF e criado `.gitattributes` (`* text=auto eol=lf`) para o Git manter LF em qualquer computador |
Testes: bateria estática sem nenhum achado crítico, alto ou médio (estado inicial: 1 alto e 34 médios); fuzz, fluxo e marcadores com 0 achados. **Matriz de layout (575 medições) repetida com o CSS e o HTML novos: idêntica ao estado inicial, sem regressão** (só os dois achados que já existiam e entram no Bloco 4: rolagem horizontal a 280 px nas duas páginas legais do YouTube e player alto demais em celular deitado). Lição: o navegador guardava o CSS antigo e a primeira medição foi inválida; o teste agora renova o cache sozinho antes de medir.

### Bloco 4: CSS (G)
**Arquivo:** `assets/css/style.css`, que cresceu por camadas anexadas em várias rodadas.
- Regras repetidas ou conflitantes (`.lead`, `.search`, `.topbar` aparecem mais de uma vez), código morto, ordem dos `@media`.
- A classe de defeito que já nos pegou: **contêiner com `position` errado** em volta de elemento absoluto. Varrer todas as ocorrências.
- Estados: hover, foco, ativo, desabilitado, vazio. Contraste real das cores.
- Variáveis e valores soltos (cores e tamanhos escritos direto).
- Impressão, `prefers-reduced-motion`, `prefers-color-scheme`, zoom do texto.
- **Entrega:** CSS reorganizado em seções claras, sem perder nenhum comportamento (comparação antes e depois por medição).

**Investigação do Bloco 4 (07/10/2026), nada alterado ainda.** Ferramentas guardadas: `npm run testar -- --so=css` (higiene do CSS), `css-analise.mjs --detalhes` (relatório completo) e, em `layout.js`, as checagens novas de contraste, `position: absolute`, texto a 200% e conteúdo cortado (`rodarCss`).
| Gravidade | Achado confirmado |
|---|---|
| médio | **O CSS cresceu por camadas** (498 linhas, 27 KB, 270 regras): **23 seletores definidos mais de uma vez**, **17 propriedades com valor morto** (redefinidas depois: `body{background}`, `.lead{font-size,color}`, `.btn.primary{box-shadow}`...), `:root` em dois lugares, `.social-bar` redefinido 3x em `@media (max-width: 480px)` |
| baixo | **19 seletores sem nenhum uso** no site (restos da primeira versão): `.card`/`.cards`, `.notice`, `.badge`, `.logo`, `.tool-note`, `h2.display`, `.social .name`, `.stat b` |
| baixo | **17 cores escritas direto** nas regras (28 usos) em vez de variáveis: `#e0dde6`, `#ece6f7`, `#e6e3ee` (três "quase brancos"), `#000`, `#3ddc84`, `#fff`, repetições de `#792DCF`/`#5D437A`/`#43394F` e vários `rgba(...)` do roxo e do amarelo |
| médio | **Rodapé cortado com texto grande:** a 200% de texto (zoom do navegador ou fonte grande do Android) a coluna "Ferramentas" (MCP TikTok/YouTube) passa de 375 px e é **cortada** (o rodapé usa `overflow-x: clip`), em **22 páginas** |
| médio | **Palavra ou link comprido estoura:** a 280 px os links `myaccount.google.com/...` das páginas legais do YouTube são cortados (único problema real em tamanho normal); a 200% o `<h1>` e o texto de abertura da home passam da tela |
| médio | **2 contrastes abaixo de 4,5:1:** `.gta-kicker` ("Contagem regressiva") 4,02:1 e `.h1-small` ("Brubão Good Game", home) 3,94:1. Todo o resto que foi medido passa (texto muted, links, botões, tags) |
| médio | Player em celular deitado/janela baixa mais alto que a janela (já registrado; Short 600 px em 375 px) |
| ok | **`position: absolute` preso ao pai errado: 0** (as 7 regras estão em pais posicionados; a classe de defeito do iframe não existe mais) · **foco do teclado:** testado com Tab de verdade na home (22 paradas): todo elemento mostra o anel padrão do navegador (laranja), inclusive os cartões; a busca troca o contorno por borda e sombra · `prefers-reduced-motion` presente · 3 `!important`, todos no bloco de movimento reduzido |
| info | Sem `color-scheme: dark` (barras de rolagem e campos nativos aparecem claros num site escuro); sem estilos de impressão; `@import` do Google Fonts (cadeia de carregamento, Bloco 7); 10 pontos de mudança de layout (400, 480, 520, 700, 820, 860/861, 1000, 1500): **mantidos por decisão do Bruno** |

**Decisões do Bruno (07/10/2026):** (1) **um `style.css` só, em seções com índice** (não dividir em vários arquivos), com teste que impede voltar a crescer por camadas; (2) as quatro correções visuais, que só mudam o que hoje está quebrado: rodapé em 1 coluna com texto grande, palavra/link comprido quebra em vez de estourar, os dois textos de contraste fraco ficam mais claros, player cabe na janela em celular deitado; (3) extras: `color-scheme: dark` e anel de foco da marca (amarelo, só no teclado); **sem** estilos de impressão por enquanto; pontos de mudança de layout **mantidos**.

**Resultado do Bloco 4 (07/10/2026).** Duas fases, cada uma com prova própria.
| Fase | O que foi feito | Prova |
|---|---|---|
| 1. Reorganização (nada muda na tela) | 498 → 701 linhas legíveis (regras em várias linhas, 16 seções com índice e tabela dos pontos de mudança de layout no topo), 27,0 → 26,8 KB, 270 → 237 regras. As camadas repetidas viraram **uma regra por seletor por tela** (23 → 0 repetidos), 17 valores mortos → 0, 17 seletores sem uso removidos (`.card`, `.notice`, `.badge`, `.logo`, `.tool-note`, `h2.display`, `.social .name`, `.stat b`...), cores soltas 17 → 3 (as três famílias de "quase branco", `#000`, `#fff`, os `rgba` do roxo e do amarelo e a fonte dos títulos viraram variáveis de `:root`) | **Estilo calculado de cada elemento comparado antes × depois: 25 páginas × 16 larguras = 400 comparações, 60.960 elementos, 0 diferenças** (com animações congeladas e todas as imagens carregadas). Regra a regra, sem navegador: 233 iguais (18 de estado: `:hover`, `:focus`, `::placeholder`), 17 sumiram (= os sem uso) e 0 novas. Controle: CSS com defeitos plantados é acusado pelas duas provas |
| 2. Correções | ver abaixo | Fase 1 × Fase 2 (400 comparações): **só mudaram as propriedades aprovadas** e nenhuma posição ou tamanho em tamanho normal, fora as duas páginas legais do YouTube a 320 px (o link que quebra de linha). **Matriz de telas: 575 medições, 0 achados acima de "info"** (os 2 que existiam desde o estado inicial sumiram: rolagem horizontal a 280 px nas páginas legais do YouTube e player mais alto que a janela no celular deitado). **Checagens de CSS (contraste, texto a 200%, conteúdo cortado, `position: absolute`): 200 medições (25 páginas × 8 telas), 0 achados** (antes: 2 contrastes, rodapé cortado em 22 páginas, home cortada) |

Correções da Fase 2 (cada uma medida):
| Correção | Antes → depois |
|---|---|
| Rodapé em telas ≤ 820 px | `1fr 1fr` → `repeat(auto-fit, minmax(max(6.5rem, 50% - 15px), 1fr))`: **idêntico em tamanho normal** (2 colunas, mesmas medidas), vira 1 coluna quando o texto está grande: a coluna "Ferramentas" deixa de ser cortada |
| Palavra/link comprido | `overflow-wrap: break-word` no `body`: os links `myaccount.google.com/...` das páginas legais do YouTube a 320 px passam de 254 px de largura (estourando uma caixa de 223) para 219 px em 2 linhas. **Efeito colateral achado e tratado:** a regra quebrava "horas" e os dígitos do contador do GTA 6 a 320 px; o contador (`.count`) fica de fora e ficou idêntico ao de antes. Para a home a 200% de texto (`BRUBAOGG`, "Lançamentos", "Entre na comunidade!" passavam da tela) só o `overflow-wrap` não bastava: grade e flexbox não deixam o item encolher abaixo da maior palavra, então entraram `minmax(0, 1fr)` na abertura (≤ 700 px), `min-width: 0` no título do feed e na caixa de texto do Discord (a 200% a palavra quebra em vez de ser cortada; em tamanho normal nada muda) |
| Contraste | `.h1-small` ("Brubão Good Game") `brightness(1.7)` → `1.9`: 3,94:1 → 4,61:1; `.gta-kicker` ("Contagem regressiva") `#CFCD2D` → `#DEDC45` (variável `--accent-soft`): 4,02:1 → 4,67:1 |
| Player cabe na janela (altura ≤ 560 px) | Short em celular deitado 340×604 → 185×328 em janela 740×360, 201×358 em 844×390; player horizontal 760×428 → 636×358 em 844×390; **playlists (cortes e lives)** 741×417 → 636×358 em 844×390 (antes passavam da janela). Janelas mais altas: nada muda |
| `color-scheme: dark` | barras de rolagem e campos nativos escuros. **Efeito colateral achado e tratado:** o "x" de limpar a busca já fica branco com `color-scheme: dark`, e o filtro antigo `invert(.8)` o deixava escuro e invisível; o filtro foi removido |
| Anel de foco da marca | `:focus-visible` com contorno amarelo de 3 px, **só no teclado** (clique de mouse não mostra); dentro da lista de sugestões o anel fica por dentro (a lista corta o que passa da borda) e no botão "Ver todos" ele fica escuro (amarelo sobre amarelo não aparece); verificado com Tab de verdade |

Também: a seção "14. Tags" estava misturada na seção 3 (o gerador de reorganização a classificou pelo prefixo `.tag`); separada, com o índice batendo. **Guarda permanente** em `npm run testar` (teste `css`): seletor repetido, valor morto, classe sem uso, cores soltas, `!important` fora do movimento reduzido, `outline: none` sem outro indicador, `:focus-visible` global, `color-scheme`, `overflow-wrap` e **seções batendo com o índice do topo** (controle: uma regra repetida no fim e uma seção renumerada foram acusadas). Lição do teste: imagens `loading="lazy"` carregavam entre a "foto" A e a B e pareciam diferença de layout; a comparação agora carrega todas as imagens antes.

**Busca em largura total até 820 px (decidido pelo Bruno em 07/10/2026):** a regra `.search { max-width: none }` do `@media (max-width: 820px)` da v1.0 **nunca valeu** (a regra base `max-width: 360px` vinha depois e vencia): entre 430 e 820 px (celular deitado, tablet) a busca parava em 360 px, ocupando de 85% a 47% da linha. Agora ocupa a linha toda, como já ocorria em celular em pé (320 a 412 px). Nenhum ponto de mudança de layout foi tocado. **Prova:** 25 páginas × 19 larguras (475 comparações, 72.390 elementos): mudaram só o campo de busca, o ícone, o botão de envio escondido e o campo dentro dele, e só entre 430 e 820 px; nada mais, nem a altura das páginas. A lista de sugestões acompanha a largura da busca (visto em 768 px).

### Bloco 5: JavaScript (M)
**Arquivos:** `busca.js` (177 linhas), `contador.js` (33).
- Busca: teclado (setas, Enter, Esc, Tab), leitor de tela, termo com acento, símbolos, vazio, só espaços, 1 letra, muito longo, digitação rápida (corrida entre pedidos), falha ao carregar o índice, offline.
- Escalabilidade da busca com 400 matérias.
- Contador: data no passado, fuso do visitante, relógio do aparelho errado, aba em segundo plano.
- Sem JS: o que continua funcionando?

**Investigação do Bloco 5 (07/10/2026).** Foi feita com um navegador de mentira (`testes/dom-falso.mjs`) que roda `busca.js` e `contador.js` **sem alterar o código deles**, e com conferência no navegador de verdade (Tab, setas, árvore de acessibilidade). As sondas viraram os testes permanentes descritos no resultado, abaixo.
| Gravidade | Achado confirmado |
|---|---|
| alto | **A busca não acompanha o crescimento planejado.** O índice inteiro (texto das matérias cortado em 2.000 letras) é baixado no primeiro toque na busca. Download comprimido: 60 entradas = 30 KB (hoje); **400 = 312 KB; 1.000 = 781 KB; 3.000 = 2,3 MB; 10.000 = 7,8 MB**. Com ~30 matérias por dia do legado, passa de 400 em ~2 semanas e de 1.000 em ~5. O processamento não é o problema (por tecla: 3 a 13 ms no computador mesmo com 10.000); o problema é o download no celular |
| médio | **Falha de rede é lembrada para sempre.** Se o índice falha ao carregar (sinal ruim, erro 404), a busca guarda lista vazia, diz "Nenhum resultado para gta" (falso) e **não tenta de novo** até recarregar a página. Reproduzido: 1 pedido só, mesmo com a rede de volta |
| médio | **Leitor de tela não acompanha as setas.** O destaque é visual (`aria-selected`), mas o campo não tem `aria-activedescendant` e as opções não têm `id`: quem usa leitor de tela não ouve qual sugestão está marcada. Ninguém anuncia "5 sugestões" nem "nenhum resultado" (sem `aria-live`), nem a contagem da página de resultados |
| médio | **A lista de sugestões fica aberta ao sair do campo com Tab** (visto: foco no ícone do TikTok, lista ainda cobrindo a tela, `aria-expanded="true"`). E **Esc tira o foco do campo** em vez de só fechar a lista (o teclado perde o lugar) |
| médio | **O que as pessoas digitam de verdade não acha nada:** `gta6`, `gta-6`, `ps5`, `resident-evil` → "Nenhum resultado" (com espaço, `gta 6` e `ps 5`, acha). No outro extremo, a busca casa no **meio das palavras**: `vi` devolve 43 das 60 entradas (por "E**vi**l", "**vi**deo"), `re` 47; e `jogos` (18) não acha o mesmo que `jogo` (38) |
| médio | **Busca vazia e listas gigantes:** a página de resultados com busca vazia diz "Digite um termo" (decisão já tomada: mostrar os mais recentes, filtro por categoria e "Ver mais" de 30 em 30) e lista **todos** os resultados de uma vez (`g` lista 45 de 60; com 1.000 matérias listaria centenas) |
| baixo | **Contador:** se a página abre depois do lançamento, o relógio **nunca é parado** (o `clearInterval` roda antes de o id existir) e continua escrevendo na tela todo segundo; rótulos sempre no plural ("1 dias", "1 horas"); `data-alvo` sem fuso (ex.: `2026-11-19`) é lido como UTC e a contagem acaba **3 horas antes** (hoje está certo, `-03:00`, mas ninguém valida); se faltar um elemento do HTML (`cd-m`) o script dá `TypeError` e para |
| baixo | **Contador depende do relógio do aparelho:** aparelho em 2100 mostra "GTA VI já chegou!" (falso); em 1970 mostra "20776 dias" |
| baixo | **Sem JavaScript:** a busca não faz nada (o formulário não tem `action`; Enter só recarrega a mesma página) e o contador mostra "-- dias -- horas". O resto do site funciona (matérias, listas, tags e players são HTML puro) |
| baixo | Código: sem `'use strict'`; a normalização de acentos usa caracteres invisíveis (U+0300 a U+036F) em vez de `̀-ͯ` (frágil ao salvar o arquivo); **nenhum teste automatizado do JS** |
| ok | **Injeção:** todo texto do índice e do visitante entra por `textContent` (`<img src=x onerror=...>`, `.*`, `(`, `\`, emoji, 40 mil caracteres em 15 ms: nada quebra) · **ranking de títulos:** das 37 matérias, 37 aparecem em 1º pelo título exato (também sem acento e em maiúsculas) e 37 no top 5 por 3 palavras ou 2 palavras longas · **digitação rápida:** sem corrida (cada resposta lê o valor atual do campo) · **Enter** com título exato vai direto à matéria · **contador:** fuso explícito (`-03:00`) = mesmo instante em qualquer fuso; aba em segundo plano recalcula pelo relógio (sem deriva); data inválida deixa "--" sem erro; 43d 10h 38m 04s, 1 dia, 1 s e 0 corretos |

**Decisões do Bruno (07/10/2026):** opção **B** da escala (Pagefind + listas por mês + interface nova, e **antecipar a publicação por GitHub Actions**), mais as correções de teclado e leitor de tela, de termos digitados, do contador (inclusive a hora do servidor) e do modo sem JavaScript, e testes permanentes.

**Resultado do Bloco 5 (07/10/2026).**
| O que | Resultado |
|---|---|
| Busca em escala | O índice completo em JSON (`busca.json`, baixado inteiro) saiu. **Sugestões e resultados usam o Pagefind** (índice criado no build, só carrega quando a pessoa digita) e **tags e páginas** vêm de `atalhos.json` (0,6 KB comprimidos hoje). Peso da **primeira busca**: **133 KB** hoje (motor 97 KB + um pedaço do índice 34 KB + `atalhos.json`), contra 30 KB do desenho antigo; **a segunda busca custa ~40 KB**. É mais pesado hoje e **fica quase parado** quando o acervo cresce (protótipo com 3.037 matérias: ~321 KB, contra 2.328 KB do desenho antigo); o ponto de equilíbrio é perto de 150 matérias |
| Listas por mês | `assets/data/lista/AAAA-MM.json` + `manifesto.json` (gerados). A **página 1 de `busca.html` já vem no HTML** (30 cartões, 0 pedidos extras; o teste confere que são os 30 primeiros das listas). "Ver mais" lê os meses necessários e acrescenta 30 por clique, sem repetir matéria, com o foco indo para o primeiro cartão novo. O estado vai na URL (`?q=&cat=&n=`) |
| Tela de busca | Sem texto: mais recentes; com texto: resultados ordenados (**título igual ao digitado no topo**; depois quem tem o termo forte, do mais novo para o mais velho), trecho com a palavra destacada, **botões de categoria com a contagem**, atalhos "Ir para a tag" e aviso "N resultados". Cartão montado pelo JavaScript **idêntico** ao gerado no HTML (conferido byte a byte nos 30) |
| Termos digitados | `gta6` = `gta 6`, `ps5` = `ps 5`, `gta-6`, `resident_evil`; acento e maiúscula; casa pelo **começo** da palavra; `jogo`/`jogos` e erro de digitação (`residnt`) o Pagefind resolve. **Limite conhecido:** o Pagefind tolera tanto que texto sem sentido (`esident`, `asdfghjkl`) devolve resultados fracos em vez de "nenhum"; tratável depois com corte de pontuação |
| Teclado e leitor de tela | `aria-activedescendant` e `id` nas opções, **aviso falado** ("5 sugestões", "nenhum resultado"), **Esc só fecha** (mantém o foco), **Tab para fora fecha**, seta para baixo reabre, opções fora da ordem do Tab. Verificado com teclas de verdade |
| Falha de rede | Não fica mais "gravada": mensagem **"Não foi possível carregar a busca agora. Tentar de novo"** e a próxima tentativa baixa de novo (teste: cai, volta, recupera) |
| Contador | Relógio **para** quando acaba; "1 dia", "1 hora"; sem `innerHTML`; não quebra se faltar elemento; **hora do servidor** corrige relógio de aparelho muito errado (mais de 1 hora; abaixo disso vale o do aparelho porque o cabeçalho `Date` tem 1 s de precisão e pode vir do cache do GitHub): aparelho em 2100 não diz mais "já chegou", em 1970 não mostra "20 mil dias". `GTA6.alvo` sem hora e fuso **o gerador recusa** |
| Sem JavaScript | Formulário com `action="busca.html" method="get"`; `busca.html` mostra a página 1 e um aviso; o contador some (em vez de "-- dias") |
| Segurança do código | Nenhum `innerHTML`/`eval` (teste acusa); só caminhos do próprio site (nunca `//` nem `javascript:`) e imagens `https`; entradas estranhas na URL (`?n=999999`, categoria inventada, HTML, `%` quebrado) tratadas |

**Publicação (antecipada do Bloco 11):** `package.json` ganhou o `pagefind` (`npm install`), o comando **`npm run indexar`** (monta `_site/` só com o que o Pages publica, usando a definição única `_ferramentas/publicado.mjs`, e cria o índice) e o fluxo **`.github/workflows/publicar.yml`** (conferir, montar, indexar, publicar; `npm run verificar` bloqueia; `npm run testar` por enquanto só avisa). `.gitignore` ganhou `_site/` e `pagefind/`; `robots.txt` bloqueia `/pagefind/`. **Simulado num clone limpo** (`npm ci`, `verificar`, `testar`, `indexar`): tudo verde; o que **não** foi possível testar daqui é a execução no GitHub (precisa do clique do Bruno em **Settings > Pages > Source: GitHub Actions**; se a Source ficar em "Deploy from a branch", a busca por texto não acha nada). A simulação já pegou um erro real: o `verificar` ainda exigia o `busca.json` antigo e teria bloqueado a primeira publicação.
**Para o Bruno subir:** tudo o que mudou desde o Bloco 2 **mais** `.github/` (pasta oculta, precisa ir junto), `package.json` e `package-lock.json`. Ordem sugerida: (1) subir pelo GitHub Desktop; (2) no GitHub, Settings > Pages > Source: **GitHub Actions**; (3) aba Actions > **Publicar site** > **Run workflow** (se a execução automática do envio tiver falhado por a Source ainda estar em "branch"). Por alguns minutos, entre (1) e (3), a busca por texto avisa "Não foi possível carregar a busca"; o resto do site funciona.

**Provas:** `npm run testar`: novo teste **`js`** (sintaxe, nada perigoso, dados da busca, marcas do Pagefind em todas as matérias, `data-base` e `action` em 68 páginas, funções puras com 4.000 textos aleatórios, contador em 11 situações): 0 achados; **controle estático** (4 defeitos plantados: `innerHTML`, `data-base` errado, lista fora de ordem, página 1 diferente da lista) acusou os 4. **No navegador** (`js.html`, 89 verificações com o Pagefind de verdade: teclado, foco, falha, Enter, `busca.html`, URLs estranhas, 320 px, qualidade, sem JavaScript, contador): 0 achados; **controle** (5 defeitos plantados na cópia montada do `busca.js`: cache de falha, lista que não fecha, Esc tirando o foco, opção alcançável por Tab, sem `aria-activedescendant`) acusou 7 achados. Qualidade: **as 37 matérias em 1º lugar pelo título exato** (também sem acento e em maiúsculas) e as 37 no top 5 pelas 3 primeiras palavras. **Matriz de telas contra o site montado: 644 medições** (28 páginas × 23 telas, incluindo 3 estados da busca) **sem achado acima de "info"**; **checagens de CSS** (contraste, texto a 200%, conteúdo cortado): **224 medições, 0**. HTML: 103 páginas válidas. `npm run testar`: 0 crítico, 0 alto, 0 médio, 25 baixos (os de sempre, de conteúdo).
**Fica para o Bloco 7:** "Ver mais" nas **páginas de categoria** (`noticias.html` etc.) e nas tags/hub do GTA 6, que vão reutilizar os mesmos arquivos por mês e o mesmo padrão de botão.

### Bloco 6: Cenários que quebram o design e a experiência (G)
- **Conteúdo extremo:** título de 200 caracteres, palavra sem espaço, 0 tags, 8 tags, resumo vazio, parágrafo gigante, matéria de 1 parágrafo, 3.000 palavras, caracteres especiais.
- **Mídia:** miniatura que não carrega, YouTube bloqueado (erro de incorporação), bloqueador de anúncios, rede lenta, sem JavaScript.
- **Tela e acessibilidade visual:** zoom de 200%, fonte grande do sistema, modo de alto contraste, janela redimensionada ao vivo, giro de tela.
- **Estados vazios:** aba sem matéria, tag sem página, busca sem resultado, 404.
- **Navegadores:** o que for possível sem aparelhos reais (e dizer claramente o que não deu para testar: Safari/iOS real).

**Resultado do Bloco 6 (07/10/2026).** Método: `npm run estresse` monta uma **cópia fora do repositório** com as 37 matérias reais, os 37 rascunhos aprovados na cópia (86 matérias no total) e **12 matérias extremas** (título de 200 letras; palavra de 90 a 140 letras sem espaço e URL comprida; 8 tags de 60 letras e 1 de 1 letra; 0 tags; resumo de 500 letras; 1 parágrafo de 4 mil letras; 1 frase só; 3 mil palavras ao lado do Short; `<script>`, `<img onerror>`, marcadores `<!--site:header-->`, `$&`, `${}`, emoji, árabe, hebraico, japonês, caracteres invisíveis e de inversão de texto; título só de emoji com hashtags; dois títulos iguais), aprova, gera, indexa e roda os testes de layout, de CSS e de JavaScript em cima. Também monta um **site sem nenhuma matéria**.
| O que | Resultado |
|---|---|
| Texto hostil | **Nada vaza para o HTML:** título, resumo, texto e tags com `<script>`, `<img onerror>`, `&amp;`, marcadores do gerador, `$&`, `${}` aparecem como **texto puro** (conferido no HTML e na tela); o cabeçalho continua 1 só; a busca acha esses títulos e não executa nada; texto em árabe/hebraico, japonês, emoji e invisíveis renderiza sem quebrar a página. Título só de emoji vira endereço `materia.html`; dois títulos iguais ganham endereços diferentes (`mesmo-titulo` e `mesmo-titulo-estr`) |
| **Achado 1 (corrigido)** | **Cartões estouravam com palavra comprida:** em `index.html`, `noticias.html`, `busca.html`, "relacionadas" e tags, título ou resumo com uma palavra sem espaço (90 a 140 letras) passava da lateral e era cortado (a regra de quebra do Bloco 4 não vale para itens de `flex` com `align-items: flex-start`). `.news-title` e `.news-excerpt` agora usam `max-width: 100%` e `overflow-wrap: anywhere`; em tamanho normal nada muda |
| **Achado 2 (corrigido)** | **`npm run validar-html` quebrava com ~190 páginas** ("Linha de comando muito longa" no Windows; hoje são 103 e o legado entra 30 por dia): agora valida em lotes |
| **Achado 3 (corrigido)** | **`<title>` com até 100 letras:** o validador de HTML (e o Google, que mostra uns 60) pede até 70. `<title>` passa a ser cortado em 70 letras (a prévia de compartilhamento continua com 100); títulos normais não mudam |
| **Achado 4 (corrigido)** | **Modo de alto contraste do Windows (`forced-colors`):** o site não tinha nenhuma regra; botão principal sem borda, aba ativa/categoria marcada só por cor de fundo, trecho destacado e campo de busca em foco ficavam sem indicação. Regras só para esse modo (bordas, `Highlight`/`Mark`, anel do campo). **Não consegui emular esse modo aqui**: escrito pela especificação, vale conferir no Windows com Alto Contraste ligado |
| Achado 5 (corrigido) | Busca: `maxlength="200"` no campo (o Pagefind já aguentava 20 mil letras em 0,5 s, mas não há motivo para aceitar); indexador **para** se o número de páginas indexadas não bater com o de matérias marcadas, e **não cria índice** se não houver nenhuma matéria (sem isso o Pagefind indexaria o site inteiro); `busca.html` em site sem matérias mostra "Ainda não há matérias publicadas" |
| Estados vazios | Site **sem nenhuma matéria**: gera, testes passam (0 crítico, alto e médio), abas escondidas, home sem feed, busca com aviso. Aba sem matéria some do menu; tag com 1 matéria vira etiqueta sem link; busca sem resultado avisa; 404 com caminhos absolutos funciona em qualquer pasta |
| Mídia | Miniatura que não carrega: o quadro preto de 16:9 segura o espaço, sem salto. YouTube bloqueado/vídeo indisponível: o quadro do player fica vazio e o botão **"Assistir no YouTube"** abaixo continua levando ao vídeo. Imagens e players são `loading="lazy"`. Sem JavaScript: ver Bloco 5 |
| Telas e texto | **Estresse:** 23 páginas × 9 telas (280 a 1920 px e 2 celulares deitados) = **207 medições sem achado acima de "info"**; texto a 200%: **115 medições, 0**. Rotação e redimensionar ao vivo: o CSS reflui por largura (nenhum script depende da largura) |
| Busca com conteúdo hostil | `js.html` na cópia de estresse (86 matérias): **89 verificações, 0 achados** de comportamento (teclado, falha, `busca.html`, URLs estranhas, sem JavaScript, contador); as 3 de "qualidade" que acusaram são esperadas (2 títulos idênticos não podem ficar os dois em 1º; "Resident Evil 2" disputa o top 5 com outras 6 matérias de Resident Evil) |
| Navegadores | Só Chromium foi possível testar. Pelo uso de recursos: tudo funciona em **Chrome/Edge 90+, Firefox 101+, Safari 15.4+** (2022 em diante). Safari 15.0 a 15.3: sem o anel de foco amarelo (`:focus-visible`) e sem a regra do player em celular deitado (`svh`), o resto funciona. Safari/iOS real, Firefox, Samsung Internet e leitores de tela reais **não foram testados** |

**Conferência manual no celular do Bruno (depois de subir, 3 minutos):** abrir (1) a busca, digitar `gta6` e tocar numa sugestão; (2) `busca.html` e tocar em "Ver mais"; (3) uma matéria com Short e rolar até o fim; (4) a home e ver o contador; (5) deitar o celular na matéria com Short. Se algo estiver estranho, mandar uma captura de tela.

### Bloco 7: Desempenho e escala (G)
- Peso de cada página e de cada requisição; imagens sem dimensão (salto de layout); fontes do Google (bloqueiam a renderização).
- **YouTube:** cada matéria carrega um player pesado; avaliar substituir por miniatura que só carrega o player ao clicar.
- **Escala:** simular 400 matérias. Listas com tudo numa página só, `busca.json` crescendo, tempo de geração, quantidade de arquivos.
- Metas realistas e medição antes e depois (tentar Lighthouse, se o ambiente permitir).

**Investigação do Bloco 7 (07/10/2026), nada alterado no site ainda.** Ferramentas guardadas em `testes/`: `npm run estresse -- --escala=N` (copia do site com N matérias simuladas, com o texto das reais) e `servidor.mjs` (servidor local que **comprime e manda `Cache-Control: max-age=600` como o GitHub Pages**; o `python -m http.server` não comprime e engana: a lista de 3.000 aparece 8x mais pesada). Lighthouse 12 rodado no Chrome do computador (perfil celular, rede 4G lenta e CPU 4x mais lenta simulados).
| Medida | Resultado |
|---|---|
| **Páginas hoje (37 matérias), celular, comprimido** | **matéria: nota 98**, FCP 1,7 s, LCP 2,0 s, 1.355 KB no total; **home: 91**, FCP 2,5 s, LCP 2,7 s, 220 KB, CLS 0,09 (limite do "bom" é 0,1); **lista de notícias: 92**, 246 KB |
| **Peso da matéria** | **O player do YouTube é 77%: ~1.050 KB** (6 scripts, 880 KB; página do player 62 KB; estilo 62 KB; fontes 44 KB; imagens 66 KB). O resto do site na matéria: ~250 KB, dos quais **222 KB são imagens**. O `base.js` do player (470 KB comprimidos, 1,6 MB descomprimidos) fica em cache para as matérias seguintes da mesma pessoa |
| **Fonte do Google** | `@import` do Google Fonts **bloqueia a primeira pintura: ~0,9 s** na rede lenta simulada (Lighthouse estima 1,8 s de ganho somando com o CSS) e é uma conexão a mais com o Google. É também a causa do **CLS 0,09 da home** (o texto de abertura troca de fonte depois de pintado) |
| **Logo** | `logo.png` tem **800×800 e 110 KB** e aparece em **44 px** (88 px nas telas de alta densidade). Um WebP de 96 px tem **3 KB**: economia de **107 KB na primeira visita de toda página** (a home passa de 220 KB para ~113 KB). O arquivo grande continua servindo de ícone e de imagem de compartilhamento |
| Outras imagens | Palmeiras do rodapé (47 + 49 + 112 KB): já otimizadas (reencodar a 75% poupa só 10%) e carregam só perto do rodapé. Miniaturas do YouTube: `hqdefault` 18 KB, `mqdefault` 12 KB (troca ganharia pouco: celular de alta densidade pede a maior de qualquer jeito). Uma imagem sem `width`/`height` |
| **Listas na escala (3.074 matérias simuladas)** | `noticias.html` **1,6 MB (139 KB comprimidos)**, **21.291 elementos**, thread principal 1,2 s, nota **85** (era 92); a página de uma tag grande: **3 MB (247 KB), 33.259 elementos, nota 81**; `gta6.html` 1,1 MB; `reviews.html` 685 KB. Em 400 matérias: `noticias.html` 234 KB (27 KB comprimidos), ainda tranquilo |
| Gerador e testes na escala | 3.074 matérias: aprovar + gerar + indexar **20 s**; gerar sem mudanças **6 s**; `verificar` 2 s; `testar` **56 s** (37 matérias: 2 s); Pagefind 4,9 s e **7,2 MB** de índice em 3.202 arquivos; site montado **88 MB** em 3.160 páginas (matéria mediana: 24 KB, 5 KB comprimidos); `sitemap.xml` 436 KB (limite do Google: 50.000 URLs); pasta `noticias/` passa de **1.000 arquivos** com ~1.000 matérias (só a tela do github.com trunca a listagem; Git, GitHub Desktop e Pages não têm limite) |
| Cache | O GitHub Pages manda `max-age=600` (10 min) e não dá para mudar: nome de arquivo com versão não adianta; um CSS/JS novo pode levar até 10 min para chegar |

**Decisões do Bruno (07/10/2026):** "Ver mais" nas listas (já decidido antes); fonte servida pelo próprio site (download autorizado); logo leve; **player do YouTube continua em iframe** (facade não foi pedido).

**Resultado do Bloco 7 (07/10/2026).** Lighthouse 12, perfil celular (rede 4G lenta e CPU 4x mais lenta simuladas), servidor que comprime como o GitHub Pages. **Antes → depois:**
| Página | Nota | FCP | LCP | CLS | Peso | Elementos na tela |
|---|---|---|---|---|---|---|
| Home | 91 → **100** | 2,5 → **0,8 s** | 2,7 → **1,6 s** | 0,09 → **0** | 220 → **136 KB** | 346 |
| Matéria (com player) | 98 → **100** | 1,7 → **0,8 s** | 2,0 → **1,1 s** | 0,02 → **0** | 1.355 → **1.267 KB** (YouTube ~1.100) | 152 |
| Lista de notícias (hoje, 37) | 92 → **100** | 2,6 → **0,8 s** | 2,7 → **1,7 s** | 0 | 246 → **146 KB** | 309 |
| **Lista de notícias com 3.074 matérias** | 85 → **100** | 3,2 → **0,9 s** | 3,4 → **1,6 s** | 0 | 326 → **98 KB** | **21.291 → 520** |
| **Tag grande com 3.074 matérias** | 81 → **100** | 3,6 → **0,8 s** | 3,8 → **1,1 s** | 0 | 395 → **58 KB** | **33.259 → 442** |

| O que mudou | Detalhe |
|---|---|
| **"Ver mais" nas listas** | Categorias, tags e hub do GTA 6: 30 no HTML e botão (30 por clique, foco no primeiro novo, aviso falado "Mostrando 60 de 124", `?n=90` guarda onde a pessoa estava, falha de rede com nova tentativa). Dados em `assets/data/colecao/<lista>/<n>.json` (blocos de 90; criados só quando a lista passa de 30, apagados quando deixam de ser necessários). Em 3.074 matérias: `noticias.html` **1.585 → 49 KB** (139 → 11 KB comprimidos), `reviews.html` 685 → 55 KB, `gta6.html` 1.097 → 62 KB, a maior tag **3.031 → 51 KB**. **Hoje nada muda** (nenhuma lista passa de 30) |
| **Fonte própria** | Lilita One (OFL) em `assets/fonts/` (latin 10 KB + latin-ext 1 KB), `@font-face` com `font-display: swap`, `preload` no `<head>`. Saiu o `@import` do Google: **sumiu o bloqueio de ~0,9 s** e uma conexão com o Google (o CLS 0,09 da home zerou) |
| **Logo leve** | Cabeçalho, rodapé e ícone da aba usam `logo-96.png` (9 KB, com `width`/`height`); a abertura da home usa `logo-720.webp` (29 KB). O `logo.png` de 110 KB só serve de imagem de compartilhamento. **−107 KB** na primeira visita de toda página |
| Cabeçalho | Bloco gerenciado `<!--site:recursos-->` em **toda** página (inclusive as escritas à mão): `preload` da fonte e `preconnect` com `i.ytimg.com` (páginas com miniaturas) e `youtube-nocookie.com` (matérias) |
| Escala (3.074 matérias) | Aprovar+gerar+indexar 20 s; gerar sem mudanças 5 s; `verificar` 2 s; `testar` 56 s; Pagefind 4,5 s / 7,2 MB; site montado 88 MB; `sitemap.xml` 436 KB (limite 50.000 endereços). Nada disso precisou mudar |
| Player do YouTube | Número levado ao Bruno: **~1.100 KB por matéria, 77% da página** (o `base.js` de 470 KB comprimidos fica em cache para as matérias seguintes da mesma pessoa). Decisão: manter o iframe |
| Não mudei (e por quê) | Miniaturas `hqdefault` (18 KB) → `mqdefault` (12 KB): celular de alta densidade pede a maior de qualquer jeito; palmeiras do rodapé: já otimizadas (reencodar poupa 10%); cache de 10 min do Pages: não dá para mudar |
| Regressão achada e corrigida na verificação | Ao pôr `width`/`height` no logo da abertura, a imagem ficou **220×724** (o atributo de altura vencia, faltava `height: auto`) e a home rolava na horizontal. O teste de layout pegou; corrigi e **criei a checagem "imagem esticada"** (proporção na tela ≠ proporção do arquivo, quando não há `object-fit`); controle: o defeito plantado na cópia montada foi acusado ("logo-720.webp 220x720") |
| **Pendências para outros blocos** | **Bloco 8:** páginas de **arquivo por mês** (links estáticos para o Google achar as matérias além das 30 primeiras de cada lista; hoje não é problema porque nenhuma lista passa de 30). **Bloco 10:** `privacidade.html` (PT e EN) citava "as fontes do Google Fonts" entre os terceiros: **retirado em 07/10/2026 com a aprovação do Bruno** (as fontes saem do próprio site). **Medido para o Bloco 8:** hoje as 37 matérias recebem de 1 a 18 links internos (mediana 4); na simulação de 3.074, **2.707 (88%) ficariam com ZERO link interno** (só o sitemap as aponta) e as demais seriam apontadas quase só pelas 3 "relacionadas" fixas (as 3 mais novas da categoria recebem até 1.633 links) |

**Provas:** matriz de telas no site real depois de tudo: **224 medições (28 páginas × 8 telas, com 2 celulares deitados) sem achado acima de "info"**; checagens de CSS (contraste, texto a 200%, conteúdo cortado): **84 medições, 0**; `npm run testar`: 0 crítico/alto/médio; HTML: 103 páginas válidas. Teste `js` do `npm run testar` confere, para cada lista com botão: 30 cartões na página, blocos de 90, soma = `data-total`, sem repetir, em ordem, aponta só para páginas que existem, categoria = **todas** as matérias da categoria, modelo de ícones presente, e nenhum bloco sobrando. `js.html` na cópia de 474 matérias: "Ver mais" em categorias, hub e tags (clicar até acabar, sem repetição, foco, aviso, URL, falha de rede e nova tentativa, `?n=90`) **sem achado**.

### Bloco 8: SEO e indexação (M)
- Sitemap (datas, o que entra e o que não entra), `robots.txt`, canonical, `noindex` onde deve.
- Dados estruturados das matérias (artigo e vídeo), navegação por migalhas, links internos, páginas órfãs.
- Títulos longos, descrições duplicadas, imagens de compartilhamento.
- Paginação das listas quando crescerem. Risco de conteúdo duplicado (hub do GTA 6, tags).

**Resultado do Bloco 8 (07/10/2026).** Decisões do Bruno: arquivo por mês com links estáticos (explicado e aprovado: sem eles 88% das matérias ficam sem nenhum link interno); texto da privacidade corrigido. Itens abaixo feitos sem decisão adicional (só acrescentam, não mudam endereço algum).
| O que | Resultado |
|---|---|
| **Links internos (o risco medido)** | Simulação de 3.074 matérias: **antes 2.707 (88%) sem nenhum link** (só o sitemap) e os links concentrados nas 3 mais novas (até 1.633 cada); **depois: 0 sem link, mínimo 1, mediana 4, máximo 14**, e a página mais funda fica a **3 cliques da home** (no site de 37 matérias: 2 cliques, todas com 1 a 18 links) |
| **Arquivo por mês** | `arquivo.html` (todos os meses, por ano, com a contagem) + `arquivo/AAAA-MM.html` (todas as matérias do mês, por categoria, com mês anterior/seguinte). Link **"Arquivo" no rodapé de toda página**. Entra no sitemap sozinho (73 URLs hoje; 3.149 na simulação, limite 50.000). Maior página de mês na simulação: 20 KB. Ícone novo `calendar-days` (Lucide, ISC) |
| **"Relacionadas" espalhadas** | Antes: sempre as 3 mais novas da categoria. Agora: até 3 da mesma categoria por tags em comum e data próxima (cada matéria passa a apontar para vizinhas de verdade) |
| **Dados estruturados** | Toda matéria ganhou `Article` (título até 110, resumo, miniatura, data, canal como autor e editor, tags como palavras-chave) + `VideoObject` (vídeo do YouTube: miniatura, data, `embedUrl` do player, `contentUrl`) + `BreadcrumbList` (Início > categoria > matéria); arquivo ganhou trilha também. Autor = o canal BRUBAOGG (a assinatura "Por Claudio IA" continua visível na página). O que o Google exige foi conferido campo a campo pelo teste (não rodei o Teste de Rich Results do Google: precisa da página no ar) |
| Prévia de compartilhamento | Matérias: `og:type=article` + `article:published_time`, miniatura com tamanho (480×360). Páginas sem imagem própria: **cartão novo 1200×630** `assets/img/compartilhar.jpg` (antes: o logo quadrado de 800 px, que sai cortado). **O cartão é visual novo da marca: o Bruno aprova ou pede troca** (uma linha em `modelos.mjs` volta ao logo) |
| Imagem grande no Google | `max-image-preview:large` em toda página indexável (Discover e resultados com miniatura grande) |
| Conferido e já estava certo | Canonical em toda página (inclusive escritas à mão; home `/`); redirecionamentos de endereço antigo com canonical para o novo; `noindex` em 404, busca e rascunhos; sitemap só com o que é indexável e `lastmod` estável; `robots.txt` (bloqueia só `/pagefind/`); 1 `<h1>` por página; títulos até 70 letras |
| Não feito (e por quê) | **Sitemap de vídeo/imagem** (o `VideoObject` já cobre e o vídeo mora no YouTube); `hreflang` (site só em português); `rel=next/prev` (o Google deixou de usar; o "Ver mais" é por JavaScript); bloquear `/assets/data/` no `robots.txt` (os JSONs só são lidos por JavaScript, sem custo de rastreio) |
| **Teste permanente** | O teste `seo` agora confere em toda matéria: dados estruturados válidos e com os campos exigidos, `embedUrl` do mesmo vídeo do player, `og:type=article`; e no site todo: `max-image-preview`, **nenhuma página órfã** (andando por links `<a>` a partir da home), distância máxima em cliques (até 4), matéria com menos de 2 links, **toda matéria listada no arquivo por mês** e link do rodapé para o arquivo |
| Achados na verificação (corrigidos) | Páginas de arquivo com título de palavra comprida estouravam a lateral e os links tinham menos de 24 px de altura (alvo de toque, WCAG 2.2): corrigido com `min-width: 0`, quebra de palavra e `padding` (conferido na cópia de estresse: 18 medições de layout e 9 de CSS sem achado) |
| **Para o Bruno depois de subir** | No **Google Search Console**: reenviar `https://brubaogg.com.br/sitemap.xml` (traz `arquivo.html`, os 6 meses e as 37 matérias) e usar "Inspecionar URL" em 1 matéria > "Testar URL ao vivo" para ver os resultados enriquecidos (Artigo e Vídeo) |

### Publicação dos blocos 0 a 8 (07/10/2026) e pausa
O Bruno pausou a revisão (limite semanal de uso) e **publica agora os blocos 0 a 8**; os **blocos 9 a 12 ficam para a versão 1.02**.
- **37 matérias em rascunho aprovadas** (ele leu todas): `npm run aprovar -- --todos --confirmar`. O site passa de 37 para **74 matérias** (reviews 48, notícias 16, lançamentos 7, GTA 6 novidades 3). Efeito real: a lista de **reviews passa de 30** e o "Ver mais" entra em produção (testado no navegador: 101 verificações sem achado). **1 rascunho ficou de fora:** `Bcd5qeSghAA` ("GTA 6 tem menos animais que Red Dead 2?"): é de vídeo antigo e o arquivo não tem `categoria` (provavelmente `gta6-novidades`) nem `publicado` (a data real do vídeo); sem o MCP do YouTube não dá para saber a data.
- Verificação final: `npm run testar` 0 crítico/alto/médio; 161 páginas com HTML válido; 161 páginas e links conferidos; índice da busca com 74 matérias.
- Arquivos copiados para o clone `Documents\GitHubrubaogg-site` com `robocopy /MIR` (sem `.git`, `node_modules`, `_site`, `pagefind`): 122 alterados, 139 novos, 4 apagados (`busca.json`, `ultimo-video.json`, `ultimo-video.js`, `shorts-cache.json`). **Sem commit e sem envio.** Passo a passo: [PUBLICAR.md](PUBLICAR.md).
- Organização: backups e protótipo do Pagefind foram para `MCP SOCIAL\_arquivo-revisao-v1.01\` (196 MB, pode apagar quando quiser); cópias de estresse regeneráveis apagadas (`npm run estresse` refaz); em `_estresse\lighthouse\` ficam os relatórios de antes e depois; `.claude\launch.json` ficou com 2 servidores (`site` e `site-completo`, este em Node com compressão).

### Bloco 9: Acessibilidade (M)
- Navegação só por teclado em todo o site, foco visível, link para pular ao conteúdo.
- Contraste calculado (texto cinza sobre fundo escuro, etiquetas, botões).
- Rótulos e papéis (busca, ícones sem texto, imagens decorativas), ordem de leitura, áreas de toque.
- Texto em português: acentos, datas, "Notícia" no singular e no plural.

### Bloco 10: Segurança, privacidade e textos legais (M)
- O que está público e não deveria (já conferido uma vez: repetir no fim).
- Requisições a terceiros (Google Fonts, miniaturas do YouTube, players) e o que cada uma entrega.
- Injeção por conteúdo (um título com HTML), `rel="noopener"`, links externos.
- Política de Privacidade e Termos descrevem **exatamente** o que acontece? (cookies, fontes, YouTube).

### Bloco 11: Publicação e operação (M)
- Diferenças entre Windows (onde construímos) e o servidor do GitHub (Linux): **maiúsculas e minúsculas em nomes de arquivo**, barras, acentos.
- Build do zero num clone limpo e comparação com o que está no ar.
- `_config.yml`, `CNAME`, `404`, cache de 10 minutos, rastro de arquivos antigos no repositório.
- Plano de volta (como desfazer uma publicação ruim), `.gitignore`, instruções do README conferidas passo a passo.

### Bloco 12: Fechamento (M)
- Lista única de achados (feitos e adiados, com o porquê), regressão geral (todos os testes na matriz de telas), números antes e depois.
- Arquivo `CHANGELOG` da v1.01, README e guias atualizados, checklist de publicação.

---

## Primeiras hipóteses (a confirmar ou derrubar nos blocos)
Críticas ao nosso próprio trabalho que já suspeito, ainda sem prova:
1. O gerador é um arquivo grande com estado global; já quebrou por ordem de execução.
2. O CSS cresceu por camadas: risco de regras que se anulam (já tivemos `position: static`).
3. As listas mostram **todas** as matérias numa página só; com 300+ vira uma página enorme.
4. O índice da busca (82 KB hoje) cresce com cada matéria; com 400, passa de 800 KB.
5. Cada matéria carrega um player do YouTube completo.
6. O build depende da rede e falha em silêncio (formato Short, feed).
7. Sem dados estruturados nas matérias.
8. As fontes vêm do Google e podem atrasar a primeira pintura.
9. Não há testes automatizados guardados; os que rodei ficavam em arquivos temporários.
10. As 12 páginas fixas repetem HTML escrito à mão.
11. Não verifiquei diferença de maiúsculas/minúsculas entre Windows e Linux.

12. **(Confirmada)** A matéria depende do feed dos 15 recentes para título, data e categoria; ao sair do feed, o endereço pode mudar. Ver "Achado crítico" acima.

## Andamento
Feito antes do Bloco 0: backup `MCP SOCIAL\_backup-v1.0-antes-da-revisao` (164 arquivos, igual ao original); campo `formato` gravado nas 37 matérias (15 short, 22 horizontal, reconfirmado direto no YouTube, sem divergência com o cache); `npm run formato`; skill `materia-brubaogg`, `GUIA-EDITORIAL.md` e `README.md` atualizados.

- [x] **Bloco 0** (07/10/2026): backup; `npm run testar` (6 testes estáticos, 2 s, sem dependências); teste de layout em navegador (`testes/layout.html`, 598 medições); matriz de telas; estado inicial em [ESTADO-INICIAL.md](ESTADO-INICIAL.md) · [x] **Bloco 1** (07/10/2026): gerador modular, validação clara, status estrito, `lastmod` estável, config única; saída idêntica; fuzz 0 achados · [x] **Bloco 2** (07/10/2026): registro de endereços fixo, matéria independente do feed, 37 endereços migrados para o título da matéria (com redirecionamento), aprovação segura, legado visível, skill atualizada · [x] **Bloco 3** (07/10/2026): marcadores à prova de erro, prévia de compartilhamento em todas as páginas, dados do GTA 6 e JSON-LD de fonte única, páginas legais com `lang="en"`, HTML validado (103 páginas, 0 problemas) · [x] **Bloco 4** (07/10/2026): CSS em um arquivo só com 16 seções e índice, 0 camadas repetidas, 0 valores mortos, 0 classes sem uso; reorganização provada igual (400 comparações, 60.960 elementos, 0 diferenças); correções de rodapé com texto grande, palavra comprida, contraste, player em celular deitado; `color-scheme: dark` e anel de foco da marca; guarda permanente no `npm run testar` · [x] **Bloco 5** (07/10/2026): busca com Pagefind + listas por mês + tela nova (mais recentes, categoria, "Ver mais"), teclado e leitor de tela, falha com nova tentativa, `gta6`=`gta 6`, contador corrigido (inclusive hora do servidor), modo sem JavaScript, publicação por GitHub Actions criada (falta o clique do Bruno em Settings > Pages), teste `js` e `js.html`
- [x] **Bloco 6** (07/10/2026): teste de estresse (12 matérias extremas, site sem matérias), cartões com palavra comprida, `validar-html` em lotes, `<title>` até 70, regras de alto contraste, guardas do indexador · [x] **Bloco 7** (07/10/2026): listas com "Ver mais", fonte e logo próprios, recursos antecipados no cabeçalho; Lighthouse celular: home 91→100, lista de 3.074 matérias 85→100, tag grande 81→100 · [x] **Bloco 8** (07/10/2026): arquivo por mês (nenhuma matéria órfã; 88% → 0% sem link na simulação), dados estruturados Article/VideoObject/BreadcrumbList, relacionadas espalhadas, cartão de compartilhamento 1200×630, texto da privacidade · [ ] Bloco 9 · [ ] Bloco 10 · [ ] Bloco 11 · [ ] Bloco 12
