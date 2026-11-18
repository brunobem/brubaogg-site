# Versão 1.02: plano e backlog

Criada em 10/10/2026 como cópia de `Site v1` (o que está no ar, v1.01). `Site v1` fica como referência e como caminho de correção urgente.

Documentos desta pasta: `BRIEFING-SESSAO-CONTEUDO.md` (entrega para a sessão que cria matérias) e `FILA-REVISAO.md` (as 74 matérias com sinais automáticos, grupos propostos e camada A/B/C).

## Regras desta versão
- **Só local.** O Bruno vê tudo no localhost (servidor `v1-02`, porta 8112, `npm run gerar && npm run indexar` antes de olhar) e **não sobe para o GitHub** até as 74 matérias terem sido revisadas e reaprovadas.
- As 74 matérias voltam para **rascunho** nesta pasta. Os endereços ficam guardados em `_conteudo/enderecos.json`, então cada matéria reaprovada volta para o mesmo endereço.
- **Trava contra subida por engano:** o `verificar` do CI deve falhar enquanto existir matéria registrada sem versão aprovada ("v1.02 ainda tem N matérias em revisão").
- A revisão das matérias é feita pela sessão de criação de matérias (YouTube), seguindo a skill nova (a atualizar antes de começar).
- A análise completa do outro Claude (Opus 5.5) ainda não terminou. O que vier dela e mudar a estrutura vira a **v1.1**. A v1.02 só traz o que não depende disso.
- GTA 6 sai em 19/11/2026: o estado "depois do lançamento" de `gta6.html` e da home tem de estar pronto antes. Se a v1.02 não estiver pronta a tempo, a correção vai por `Site v1`.

## Decidido pelo Bruno (10/10/2026)
- Pasta `Site v1.02`, sem subir hoje.
- Todas as 74 matérias em revisão, uma a uma.
- Botão "Comentar no vídeo" nas matérias.
- Resident Evil (15 vídeos de enredo, sem nota) sai de Reviews e ganha **categoria própria** (nome a definir).
- **Player com fachada** (confirmado): miniatura estática com botão de play; o iframe do YouTube só carrega no clique.
- **Review Shorts anexados à review longa**, em player vertical pequeno (confirmado). A planilha tem 6 e os 6 casam sem ambiguidade com uma review pelo nome do jogo (tag) no título, descrição ou keywords.
- **Ficha de review com nota de 0 a 10** (confirmado).
- Quer um jeito de juntar **notícias do mesmo assunto** (ex.: os 3 textos sobre animais de GTA 6) como blocos, cada vídeo com seu player e seu ângulo, sem trabalho manual (modelo "assunto" abaixo).
- Vai pedir: meio comercial, ponto de contato, diretrizes, regras e menu (a partir da prévia da análise do outro Claude).

## Feito na v1.02 (local)
- **Menu lateral em todo o site (10/10/2026).** A partir de 1280 px é uma coluna fixa de 240 px com ícone, itens (Início, as abas, Tags, Arquivo) e o item da página atual destacado; abaixo disso é uma gaveta aberta por um botão no topo (celular e notebook pequeno), com cortina escura, Esc para fechar, foco devolvido ao botão e o resto da página inerte enquanto aberta. O topo agora tem só o ícone (leva para a home); o nome "BRUBAOGG" aparece embaixo do ícone no menu, **apenas na home**. Arquivos: `modelos.mjs` (`menuHtml`, `headerHtml`), `saida.mjs` (bloco `<!--site:menu-->` depois de `<body>`, também nas páginas escritas à mão), `style.css` (seção 5, novo ponto de mudança em 1280), `assets/js/menu.js`, ícones `house`, `menu` e `x`. Os chips de categoria continuam nas páginas (decidir se saem, já que o menu tem os mesmos itens).

- **Home reorganizada para o Google (10/10/2026).** Ordem atual: cabeçalho (marca com o nome, busca, redes) + **linha com as seções do canal** (GTA 6, Lançamentos, Reviews, Cortes, Notícias, Lives; no celular rola para o lado) → **cobertura** ("Em cobertura", `h1` "Cobertura do GTA 6", texto e as últimas novidades, 1 destaque + 4 cartões, "Tudo sobre GTA 6 →") → **contagem regressiva** → **bloco da live** → notícias (4, menores), reviews, lançamentos → faixa → **"Sobre o BRUBAOGG"** (antes era a abertura) → Discord. **A home não tem menu lateral** (para não repetir a linha de seções); as outras páginas têm. No celular os cartões da cobertura e das notícias ficam compactos (miniatura ao lado do título, sem resumo): a cobertura caiu de 2.547 para 1.385 px de altura. Configuração em `config.mjs`: `COBERTURA` (jogo em foco, título, texto, `ativa`) e `LIVE`. Arquivos: `index.html` (marcadores `<!--cobertura:...-->` e `<!--live:...-->`), `paginas.mjs` (`coberturaHtml`, `liveHtml`, `feedHtml`), `modelos.mjs` (`headerHtml` da home), `saida.mjs`, `style.css`, `assets/js/live.js`. O texto do "Sobre" é o mesmo de antes; `<title>` e descrição da home não mudaram.
- **Bloco da live (10/10/2026).** O site é estático e não sabe se a live começou. Versão 1: o bloco aparece nas **janelas de horário** configuradas (horário de Brasília) com uma fachada ("Assistir à live"; o player do YouTube só carrega no clique) e um link "assista no YouTube"; fora da janela mostra "Próxima live: hoje às 20h". Com `horarios` vazio o bloco não aparece (hoje está vazio: falta o horário). Limite conhecido: se a live atrasar, o player mostra "Este vídeo não está disponível" (testei o embed fora do ar e foi isso que ele mostrou). Versão 2, se fizer falta: um serviço pequeno (função gratuita) que consulta a API do YouTube e diz se está ao vivo de verdade.

## Visão do Bruno (10/10/2026): cobertura de lançamento que vira acervo (Wiki)
- **Ciclo:** o canal mira **um lançamento por vez** e o cobre com exclusividade (notícias, informações, o máximo possível). Hoje é o GTA 6. Depois do lançamento a cobertura **vira acervo**, como ele já fez com Resident Evil (a maratona de histórias). Isso vira prática do canal.
- **Menu:** uma seção nova no meio ("Wiki" ou "Séries", nome a decidir) que lista **jogos**. Cada jogo tem seus vídeos (reviews, histórias, notícias) e também uma **wiki** mais detalhada (história, personagens, linha do tempo), feita só de documentação e escrita aos poucos como matérias.
- **Evidência de busca (Google pt-BR, sugestões automáticas):** "resident evil wiki" e "gta 6 wiki" existem (mas a pessoa quer ver personagens, mapa, história e cronologia do jogo); "gta 6 personagens", "gta 6 mapa", "resident evil personagens", "resident evil cronologia/ordem cronológica", "história de resident evil", "guia resident evil" e "tudo sobre gta 6" também; "wiki de jogos" não tem busca. Ou seja: o rótulo "Wiki" ajuda, mas o que traz gente são páginas por jogo e por assunto (personagens, mapa, história, linha do tempo).
- **Proposta técnica:** "jogo" é uma entidade (nome oficial, franquia, ficha: estúdio, lançamento, plataformas). A página do jogo reúne os vídeos pela tag e as matérias de wiki (um tipo novo de matéria, **sem vídeo**). `gta6.html` (endereço protegido) continua sendo a página do GTA 6 e passa de "cobertura" para "acervo" quando o jogo sair. Um campo de **cobertura ativa** no config decide o que abre a home (contagem, novidades) e o que vai para o acervo.
- **Fases:** A) home (feita acima); B) seção Jogos/Wiki: índice, páginas de jogo a partir das tags e item no menu; C) matérias de wiki (tipo sem vídeo) e o campo de cobertura ativa, com a virada pós-lançamento do GTA 6 (19/11).

## Propostas minhas (aguardando resposta)
- Pastas `_conteudo/rascunhos/` (fora do Git), `materias/` (aprovadas), `retiradas/`; `aprovar` move o arquivo e registra data e hash; texto alterado depois de aprovado exige `reaprovar`.
- Ficha de review: nota 0 a 10 em passos de 0,5; recomendação (Compre / Espere promoção / Só com amigos / Pule); preço e quando; horas; plataforma; para quem é; spoiler; pelo menos 1 ponto contra.
- `npm run conferir -- ID`: estrutura, vícios de texto, matérias parecidas, fatos a conferir.
- Relacionadas entre categorias (hoje só mesma categoria, `gerador/paginas.mjs`), link `[[ID]]` no corpo, fontes com link (obrigatório em notícia).
- Metas de tamanho alinhadas à prática: notícia 150 a 300 palavras, review 350 a 700.
- **Categoria de Resident Evil: "História"** (`/historia/`). Pelas sugestões do Google (pt-BR): "história de resident evil" lidera e o padrão "história de/história completa/resumida" se repete em God of War, Silent Hill e The Last of Us; "explicado", "enredo", "cronologia" e "ordem cronológica" também aparecem. "Série" leva a Netflix e filmes; "maratona" quase não aparece. "Maratona de Resident Evil" continua como nome da série do canal dentro da categoria.
- **Modelo "assunto"** (a matéria continua sendo 1 JSON por vídeo; a página passa a ser composta): campo opcional `assunto` na matéria; `_conteudo/assuntos.json` com título e resumo; com 2 ou mais vídeos aprovados no mesmo assunto, uma única página mostra um bloco por vídeo (data, player com fachada, texto da matéria), com "atualizado em"; os endereços antigos viram redirecionamento para a página do assunto. Com 1 vídeo, é a matéria normal de hoje. O `conferir` sugere o assunto pelas tags e pela similaridade do texto; o trabalho manual é confirmar a sugestão.
- **Review Shorts:** campo `shorts: [{id, titulo}]` na review; a página mostra "Shorts desta review" com players verticais pequenos. INSIDE e Storebound hoje têm um short publicado como notícia: na v1.02 passam a anexo da review.
- Miniaturas: baixar uma vez, na aprovação, e servir do próprio site (zero requisição ao Google antes do clique; a política de privacidade precisa de ajuste, só com aprovação do Bruno). Alternativa mais simples: continuar com as miniaturas do YouTube.

## Backlog (a ordenar com o Bruno)
**Editorial e modelo**
- Pastas e registro de aprovação; fichas por tipo; `conferir`; skill `materia-brubaogg` e `GUIA-EDITORIAL.md` atualizados.
- Nova categoria para Resident Evil: o endereço muda de `/reviews/...` para `/<nova>/...`, então o registro precisa aceitar mudança de categoria com redirecionamento dos 15 endereços antigos (hoje só troca o slug dentro da mesma categoria); categoria sem playlist própria; corrigir as tags-pai de Resident Evil (17 matérias, a página da tag lista 8).
- Review Shorts: decidir o modelo (short anexado à review longa, página própria, ou matéria curta).
- Datas: absolutas, verbo coerente com a data de publicação, "atualizado em"; avisos nas listas de lançamentos de meses passados.
- Autoria em camadas e página "Sobre"; nome da marca padronizado.

**Páginas e navegação**
- Menu fixo em todas as páginas; Cortes e Lives (juntar numa página "Assista" ou sair do menu).
- Contato e parcerias (e-mail), diretrizes editoriais públicas ("Como fazemos as matérias"), página Legal; MCPs fora do rodapé principal e da busca, mantendo as URLs.
- Botão "Comentar no vídeo" (+ Discord e Inscrever-se).
- Player: tirar o iframe direto e usar fachada (miniatura própria e play; o iframe carrega no clique). Medir antes e depois (peso, Lighthouse) e testar o toque no celular.
- Depois do lançamento do GTA 6: tirar a contagem da home e transformar `gta6.html` em hub de guias e novidades.

**Técnico (da análise crítica, itens baratos)**
- CI bloqueante: tirar o `continue-on-error`, mover as 10 URLs protegidas para o `verificar` (antes, abrir o log do Actions e ver se o passo Testes ficou verde no Linux).
- Status de aprovação fechado (resolvido pelas pastas); `.gitignore` ampliado; `playlists.json` fora da área publicada; README e LEIA-ME atualizados; versão no `package.json`.

**Pendências da v1.01 (Blocos 9 a 12)**
- Acessibilidade (link "pular para o conteúdo", alvos de toque, contraste, leitor de tela), revisão de segurança e textos legais (políticas dos MCPs com texto contraditório, só com aprovação do Bruno), publicação e operação, fechamento (lista única, CHANGELOG).
- Aprovar ou trocar `assets/img/compartilhar.jpg` (já está no ar).
- Rascunho `Bcd5qeSghAA` (falta a data real do vídeo).

## Ordem sugerida
1. Pastas, registro de aprovação e a trava do CI.
2. Fichas por tipo, guia, skill e `conferir`.
3. Categoria nova (Resident Evil), tags-pai e relacionadas entre categorias.
4. Visual: quadro de veredito, botão de comentar, menu, player com fachada; teste no celular.
5. Páginas comerciais e de diretrizes.
6. Fila de revisão das 74 (ajuste assistido, reescrita no padrão novo, reformatar ou retirar).
