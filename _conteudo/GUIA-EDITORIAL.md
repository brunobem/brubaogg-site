# Guia editorial das matérias

Para quem escreve as matérias do site a partir dos vídeos do canal (sessão do Claude com o MCP do YouTube).
Este guia é a "ponte" entre a sessão que cuida do **site** (visual e código) e a que cuida do **conteúdo**.

## Como escrever: use o skill `materia-brubaogg`
O método editorial completo (fluxo de pesquisa, regras de fonte, tamanhos por tipo, estilo, checklist e relatório) fica no skill interno **`materia-brubaogg`**, mantido fora deste repositório. Na sessão de conteúdo, invoque-o antes de escrever qualquer matéria.

Este arquivo guarda só o que o site e as ferramentas precisam, e que pode ser público.

## Escopo (o que pode e o que não pode)
- **Pode:** criar e editar arquivos em `_conteudo/materias/<tipo>/<ID_DO_VIDEO>/<ID_DO_VIDEO>.json`. Cada matéria tem a **própria pasta** (com o nome do ID) dentro da pasta do **tipo**: `noticias` (inclui as de GTA 6), `reviews`, `lancamentos` ou `wiki`. O `npm run nova` já cria no lugar certo e o `gerar` avisa se um arquivo estiver fora do lugar ou numa pasta de tipo que não combina com a categoria. As imagens da matéria (miniatura, fotos do texto) vão na mesma pasta, ao lado do JSON.
- **Não pode:** mexer em código, HTML, CSS, `assets/` ou `_ferramentas/`; rodar `npm run gerar`; fazer commit ou push.
- **Sempre** `"status": "rascunho"`. Quem revisa e aprova é o Bruno (`npm run aprovar -- ID`). Rascunho nunca vai ao ar.
- Os endereços `index.html` e `gta6.html` são protegidos (ver README).

## Conteúdo da Wiki (pasta separada, não é matéria)
História, personagem, guia e curiosidade de um jogo **não** são matérias: moram em `_conteudo/materias/wiki/<nome>/<nome>.json`, podem ser **só texto (sem vídeo)** e têm campos próprios (`jogo`, `tipo`, `publicado`, `video` opcional). As mesmas regras valem: sempre `"status": "rascunho"` e quem aprova é o Bruno (na Wiki, aprovar é apagar a linha `status`). Crie com `npm run wiki -- <nome> --jogo <slug do jogo>` e siga o [`_conteudo/materias/wiki/LEIA-ME.md`](wiki/LEIA-ME.md). **Review não é Wiki:** continua em `_conteudo/materias`.

## Comandos úteis
- `npm run pendentes`: lista os rascunhos (inclusive de vídeos antigos) com tamanho e pendências, e os vídeos recentes sem texto. `npm run pendentes -- --rascunhos`: só a lista de rascunhos.
- `npm run nova -- ID`: cria o modelo já como rascunho.
- `npm run formato -- ID`: diz se o vídeo é `short` ou `horizontal` (valor do campo `formato`). Responde `NAO SEI` em vez de chutar.
- `npm run aprovar -- ID`: aprovação feita pelo Bruno (recusa matéria com `[CONFERIR`).

## Formato do arquivo
```json
{
  "formato": "short",
  "status": "rascunho",
  "titulo": "Obrigatório. Até 60 caracteres, jogo no começo. Define o endereço da página.",
  "resumo": "1 a 2 frases, até 160 caracteres. Vira a descrição no Google e o trecho na lista.",
  "tags": ["Nome do jogo"],
  "corpo": ["Parágrafo 1.", "Parágrafo 2.", "Parágrafo 3."]
}
```
`formato` é **obrigatório**: `"short"` (vertical) ou `"horizontal"` (16:9). Descubra com `npm run formato -- ID`. Se o comando disser `NAO SEI`, não chute: avise o Bruno. O layout da página depende disso.
`corpo` é uma lista de parágrafos em **texto puro**: sem markdown, HTML, links ou marcadores.
`tags` é uma lista com o nome oficial de cada jogo citado (lançamentos podem ter várias; notícia e review, em geral uma). O site **usa** as tags: elas aparecem como etiquetas clicáveis na matéria, viram páginas em `/tag/` e entram na busca (digitar o nome do jogo mostra a tag primeiro).
`resumo` e `corpo` (ao menos 1 parágrafo, nenhum vazio) são obrigatórios; sem eles o site dá erro ao gerar.
`status`: use **exatamente** `"rascunho"`. Qualquer outro valor (`"Rascunho"`, `"draft"`...) é recusado pelo gerador. Grave o arquivo em UTF-8 (com ou sem BOM funciona).

## Regras que valem sempre
- Não inventar fatos, datas, preços ou nomes; dúvida não resolvida: omitir ou marcar `[CONFERIR: ...]`.
- **Texto sempre em primeira pessoa** ("eu", "para mim", "na minha opinião", "dei nota 7", "nós"), como se fosse o próprio Bruno falando. **Nunca** em terceira pessoa sobre ele: nada de "o Brubão acha", "segundo o Brubão", "para o Brubão", "a nota do Brubão", "ele gostou", "o autor". Vale para título, resumo, corpo e campos do veredito (ex.: `preco`: "preço que paguei"). Opinião é sempre apresentada como opinião ("para mim", "acho que"), nunca como fato. Fatos de terceiros (a Sony anunciou, o diretor disse) seguem normais.
- **Marca:** a marca/site é **BRUBAOGG**, sempre sem acento (nunca "Brubão GG" nem "BRUBÃOGG"). "Brubão" com til é só o apelido e, em primeira pessoa, quase nunca aparece.
- Sem pergunta nem convite ao público no fim do texto, e sem referência à estrutura do vídeo ("neste vídeo", "comentário fixado").
- A assinatura que aparece na página é **"Por Bruno Bem"**, no fim, perto das fontes, com a data e o aviso "Texto com apoio de IA" (link para a página Sobre); no alto fica só a categoria e o **tempo de leitura** (palavras do resumo e do texto ÷ 200 por minuto, arredondado para cima, mínimo 1 minuto), que o site calcula sozinho. O texto continua em primeira pessoa, e a opinião nunca aparece como fato.

## Tags (como escolher)
- Use o **nome oficial do jogo**, sempre com a **mesma grafia** em todas as matérias (ex.: `God of War Laufey`, não `GoW Laufey`).
- Em geral 1 a 3 tags. Quando fizer sentido, **a franquia e o jogo específico** (ex.: `God of War` e `God of War Laufey`).
- Lançamentos mensais podem ter **uma tag por jogo citado**.
- **Não** use tags genéricas (`games`, `notícia`, `review`), nem nomes de pessoas ou de empresas, salvo se forem o assunto central.
- Variações do mesmo nome (ex.: `GTA VI`, `GTA 6`, `Grand Theft Auto VI`) são unificadas em `_conteudo/tags.json`. Se surgir uma variação nova, **avise o Bruno** em vez de inventar outra grafia.
- A tag **GTA 6** leva direto à página `gta6.html`, e as matérias marcadas com ela também aparecem lá.
- Uma tag com **uma só matéria** não ganha página (fica só na busca); com 2 ou mais, ganha. Franquias (Resident Evil, God of War...) são ligadas ao jogo específico em `_conteudo/tags.json` (campo `pai`), então **não precisa repetir a franquia** nas tags: basta o jogo.
- **Lançamentos mensais:** no máximo **8 tags**, só os jogos de destaque do vídeo. Listas com 20 tags poluem a página e a busca.

## Título (obrigatório) e endereço da página
- `titulo` é **obrigatório**. **O endereço (URL) da página nasce dele quando a matéria é aprovada e depois nunca muda**, mesmo que o título seja editado (o endereço fica registrado em `_conteudo/enderecos.json`, que é do site). Por isso o título tem que estar **final** antes de entregar.
- **Até 60 caracteres** (títulos maiores são cortados no Google). Nome do jogo no começo e o gancho depois (ex.: `Control: vale jogar o original antes de Control Resonant?`).
- O título do **vídeo** no YouTube pode mudar à vontade (testes A/B): o site não depende dele.
- **Não sobrescreva** o arquivo de uma matéria que já foi aprovada: regravar como `rascunho` tira a página do ar. O gerador avisa quando uma página publicada deixaria de existir.

## Parágrafos
- No celular, parágrafo com mais de ~90 palavras vira bloco difícil de ler. Divida os longos (principalmente nas listas de lançamentos: um parágrafo por jogo).

## Ficha de veredito e fontes (opcionais)
Dois campos que o site já sabe mostrar. Ficam no mesmo arquivo da matéria; se o campo não existe, a parte simplesmente não aparece.
```json
"veredito": {
  "nota": 7.5,
  "recomendacao": "espere-promocao",
  "plataforma": "PS5",
  "preco": "R$ 300",
  "horas": "10 a 11 horas",
  "paraQuem": "Quem gosta de plataforma e fan service."
},
"fontes": [
  { "nome": "Nome do site", "url": "https://exemplo.com/materia" }
]
```
- **`veredito`** (só em review): aparece no **fecho da página, ao lado das fontes** (depois do texto e antes da assinatura), como a caixa "Veredito do Brubão". `nota` é **obrigatória** e vai de 0 a 10 em passos de 0,5, **número, sem aspas e com ponto** (`7.5`; a página mostra "7,5/10"). `recomendacao` é uma destas: `compre`, `espere-promocao`, `so-com-amigos`, `pule`. `plataforma`, `preco`, `horas` e `paraQuem` são textos curtos; **só aparece o que estiver preenchido**. Com `nota`, a página também ganha os dados de "Review" para o Google. A nota **não** entra nos cartões, só dentro da matéria.
- **`fontes`** (qualquer matéria): lista no fim do texto, com link que abre em nova aba. `nome` é o nome do site; `url` precisa começar com `https://`. Mais de 8 fontes gera um aviso (lê melhor com até 8). Entram também nos dados estruturados do Google (`citation`).
- Os dois blocos ficam fora da busca do site (só o texto da matéria aparece nos resultados).
- Nota com valor fora de 0 a 10 ou de 0,5 em 0,5, recomendação que não existe e `url` sem `https://` são **recusados** pelo gerador, com a mensagem dizendo qual campo está errado.
- Todo vídeo ganha o botão **"Comentar no vídeo"**, que abre os comentários dele no YouTube; não precisa de campo.

## Imagens da matéria (opcionais: se o arquivo existe, aparece; se não existe, não aparece)
Cada matéria tem a **própria pasta** (`_conteudo/materias/<tipo>/<ID>/`, ao lado do `<ID>.json`). As imagens vão **nessa pasta**, com nome padronizado:

| Arquivo | O que faz |
|---|---|
| `thumb.jpg` (ou `.png`, `.webp`) | **Capa do player**: entra no lugar da miniatura do YouTube (que é de qualidade menor). Num Short, é a imagem **vertical (9:16)**. Só uma por pasta. |
| `card.jpg` (ou `.png`, `.webp`) | **Imagem horizontal (16:9, a mesma arte)** dos **cartões das listas, do carrossel da home, dos blocos da home e da prévia de compartilhamento** (WhatsApp, Google). Sem `card`: matéria horizontal (review, lançamento) usa a `thumb`; **Short sem `card` continua com a miniatura do YouTube** (a `thumb` vertical seria cortada no cartão). Só um por pasta. |
| `img-1_arkade.com.br.jpg` | Imagem do texto. **Onde ela aparece depende do tipo da matéria** (tabela abaixo). Numere de 1 a 20. |

**Onde cada imagem aparece (pelo tipo, que é a pasta em `_conteudo/materias/`):**

| Tipo | Regra | `img-1` | `img-2` | `img-3` |
|---|---|---|---|---|
| **Notícia** (`noticias`, inclui GTA 6) | uma imagem por parágrafo | depois do 1º parágrafo | depois do 2º | depois do 3º |
| **Review** (`reviews`) | **uma imagem a cada dois parágrafos** | depois do 2º parágrafo | depois do 4º | depois do 6º |
| **Lançamento** (`lancamentos`) | uma imagem por parágrafo (cada parágrafo é um jogo) | depois do 1º jogo | depois do 2º | depois do 3º |

- A imagem que cairia **depois do último parágrafo** (número alto demais para o texto) aparece depois do último. Não precisa preencher todas as posições: a que não existe como arquivo simplesmente não aparece.
- **Exemplos de nome:** review: `img-1_ign.com.br.jpg`, `img-2_techtudo.com.br.jpg`; lançamento: `img-1_arkade.com.br.jpg` (o jogo do 1º parágrafo), `img-2_savestate.com.br.jpg` (o do 2º). Notícia: `img-1_arkade.com.br.jpg`, `img-2_techtudo.com.br.jpg`.
- A regra mora em `PARAGRAFOS_POR_IMAGEM` (`_ferramentas/gerador/imagens.mjs`); tipo que não está lá usa 1.

- O nome é **`img-<posição>_<site da fonte>.<jpg, png ou webp>`**. O site da fonte é o domínio (`arkade.com.br`, `techtudo.globo.com`), em qualquer caixa: o site lê tudo em minúsculas.
- **A fonte sai do nome do arquivo.** Embaixo da imagem aparece "Imagem: arkade.com.br". Se esse site for o de uma das `fontes` da matéria, a legenda vira link para o texto dela; se não for, aparece só o nome.
- **Toda imagem precisa de fonte.** `img-1.jpg` (sem o site), `foto.jpg` ou qualquer nome fora do padrão **faz o `npm run gerar` parar** e dizer qual arquivo renomear. Arquivo que não é imagem (`.txt`, `.docx`) é ignorado.
- O tamanho do original **não importa**: o gerador publica versões menores em `assets/img/m/<id em minúsculas>/` (WebP em qualidade 92, em larguras 480/800/1000/1200 para as imagens do texto, 480/640/960/1280 para a thumb e 480/640/800/1200 para o card, **nunca maiores que o original**) e o navegador escolhe a que cabe na tela. Tirou o arquivo da pasta? As versões publicadas somem no próximo `npm run gerar`.
- Precisa de **Python 3 com Pillow** (`python -m pip install pillow`). Um cache em `_conteudo/imagens.json` (pelo conteúdo do arquivo) evita refazer o que não mudou. Os arquivos gerados em `assets/img/m/` **são publicados**: entram no commit junto com o resto.
- **Texto alternativo (obrigatório para toda imagem da pasta):** cada pasta com imagem tem um arquivo **`texto-alternativo.txt`**, ao lado do JSON, com **uma linha por imagem**: `nome-do-arquivo: descrição`. Linhas que começam com `#` são comentário. Exemplo:

  ```
  Card.png: Link, de Zelda: Link's Awakening, numa floresta com uma fada ao lado. Texto na arte: "PORT PC".
  Thumb.png: Mesma arte, na versão vertical. Texto na arte: "PORT PC".
  img-1_arkade.com.br.webp: Arte do jogo 171 com um homem armado ao lado de um carro amarelo.
  ```

  - **Como escrever:** em português, uma ou duas frases, dizendo o que se vê e **o texto que está escrito na imagem** (entre aspas). Não comece com "imagem de" nem "foto de". Se a `thumb` e o `card` têm textos diferentes, cada linha traz o texto da sua imagem.
  - **Quando criar:** junto com a imagem. Imagem nova na pasta = linha nova no `texto-alternativo.txt`; trocou a arte = confira a descrição.
  - O gerador lê esse arquivo e põe a descrição no **`alt`** da imagem em todo lugar onde ela aparece: capa do player (`thumb`), cartões, carrossel e prévias (`card`) e imagens do texto. Imagem **sem linha** no arquivo sai com `alt` vazio e o `npm run gerar` **avisa** qual falta (não para). Linha de um arquivo que não existe na pasta também gera aviso.

## Shorts anexados e assunto (opcionais)
```json
"shorts": [
  { "id": "CT68uW4KT9I", "titulo": "INSIDE: jogo curto, final impactante e arte premiada" }
],
"assunto": "god-of-war-laufey"
```
- **`shorts`** (só em review): Shorts que acompanham o vídeo principal, **sem matéria própria**. A página mostra "Shorts desta review" com um player vertical pequeno por Short (a miniatura com play; o vídeo só carrega no clique) e a legenda. `id` é o **ID do Short** (os 11 caracteres do endereço, não o link inteiro); `titulo` é a legenda. Até 4 (mais que isso só gera aviso); sem repetir e sem ser o próprio vídeo da matéria. Se o Short já é uma notícia publicada, para transformá-lo em anexo: ponha o Short em `shorts` da review e **retire** a notícia apontando para a review, `npm run retirar -- ID_DA_NOTICIA --para ID_DA_REVIEW`. O endereço antigo da notícia passa a levar para a review (não dá 404) e o texto da notícia fica guardado em `_conteudo/retiradas/` (não é apagado). Foi o que se fez com INSIDE e Storebound.
- **`assunto`**: o **mesmo texto** (minúsculas, sem acento, com hífens: `gta6-preco-e-pre-venda`) nas matérias de **vídeos diferentes sobre o mesmo fato**. Espaço, maiúscula, acento, sublinhado ou hífen no fim são recusados. **Cada matéria continua com a própria página e o próprio endereço**, escrita normalmente como o ângulo do vídeo dela. Com **2 ou mais** matérias no mesmo assunto, o fim de cada uma ganha o bloco **"Mais sobre este assunto"**, que leva às outras (miniatura, título, data e resumo), da mais nova para a mais velha. O endereço do próprio assunto (`<pasta>/<chave>.html`) redireciona para a matéria mais nova. Uma matéria **sozinha** no assunto não tem o bloco; se isso for erro de digitação, o `npm run testar` avisa ("o assunto ... só tem 1 matéria"). Escreva o assunto **igual** em todas.
- **`_conteudo/assuntos.json`** (**opcional**): só serve para o redirecionamento do endereço do assunto: o `titulo` e o `resumo` da prévia de compartilhamento dele e a `categoria` (pasta do endereço; sem ela vale a da matéria mais antiga). Exemplo: `{ "god-of-war-laufey": { "titulo": "God of War Laufey: revelação, pré-venda e Faye", "resumo": "Do State of Play de 2 de junho à pré-venda no Brasil..." } }`. Se a entrada existir, precisa de `titulo` (até 60 caracteres) e `resumo` (até 160). Assunto novo **não precisa** de entrada. O endereço é `<pasta>/<chave>.html`: **não renomeie a chave depois de publicada**.
- Matéria de assunto **pode** ter `veredito` e `shorts`: cada uma tem página própria.

## Vídeos antigos (legado)
O feed do YouTube só traz os **15 vídeos mais recentes** de cada playlist. Para uma matéria de um vídeo **mais antigo**, o próprio arquivo precisa dizer onde ela entra (depois de aprovada, o site guarda isso no registro de endereços e a matéria não depende mais do feed):

```json
{
  "status": "rascunho",
  "categoria": "noticias",
  "publicado": "2026-09-30",
  "titulo": "...",
  "resumo": "...",
  "tags": ["..."],
  "corpo": ["..."]
}
```
- `categoria`: `noticias`, `reviews`, `lancamentos` ou `gta6-novidades`.
- `publicado`: data de publicação do vídeo, `AAAA-MM-DD` (o MCP `youtube_list_videos` traz a data e o ID).
- Atalho: `npm run nova -- ID --categoria noticias --publicado 2026-09-30 --titulo "Título do vídeo"` cria o modelo já com esses campos.
- `publicado` precisa ser uma data real: entre 2005 e hoje (data no futuro ou no passado remoto é recusada).
- Sem esses dois campos, a aprovação e o `npm run gerar` param com um erro que diz o que falta (nunca ignoram em silêncio).

## O que aparece no site
**Só aparece vídeo que tem matéria aprovada.** Vídeo sem arquivo, ou com `"status": "rascunho"`, não gera página, não vira cartão, não entra na busca. Pode subir aos poucos.
