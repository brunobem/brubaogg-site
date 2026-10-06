# Guia editorial das matérias

Para quem escreve as matérias do site a partir dos vídeos do canal (sessão do Claude com o MCP do YouTube).
Este guia é a "ponte" entre a sessão que cuida do **site** (visual e código) e a que cuida do **conteúdo**.

## Como escrever: use o skill `materia-brubaogg`
O método editorial completo (fluxo de pesquisa, regras de fonte, tamanhos por tipo, estilo, checklist e relatório) fica no skill interno **`materia-brubaogg`**, mantido fora deste repositório. Na sessão de conteúdo, invoque-o antes de escrever qualquer matéria.

Este arquivo guarda só o que o site e as ferramentas precisam, e que pode ser público.

## Escopo (o que pode e o que não pode)
- **Pode:** criar e editar arquivos em `_conteudo/materias/<ID_DO_VIDEO>.json`.
- **Não pode:** mexer em código, HTML, CSS, `assets/` ou `_ferramentas/`; rodar `npm run gerar`; fazer commit ou push.
- **Sempre** `"status": "rascunho"`. Quem revisa e aprova é o Bruno (`npm run aprovar -- ID`). Rascunho nunca vai ao ar.
- Os endereços `index.html` e `gta6.html` são protegidos (ver README).

## Comandos úteis
- `npm run pendentes`: lista vídeos sem texto e rascunhos.
- `npm run nova -- ID`: cria o modelo já como rascunho.
- `npm run aprovar -- ID`: aprovação feita pelo Bruno (recusa matéria com `[CONFERIR`).

## Formato do arquivo
```json
{
  "status": "rascunho",
  "titulo": "Opcional. Só se o título do vídeo estiver ruim.",
  "resumo": "1 a 2 frases, até 160 caracteres. Vira a descrição no Google e o trecho na lista.",
  "tags": ["Nome do jogo"],
  "corpo": ["Parágrafo 1.", "Parágrafo 2.", "Parágrafo 3."]
}
```
`corpo` é uma lista de parágrafos em **texto puro**: sem markdown, HTML, links ou marcadores.
`tags` é uma lista com o nome oficial de cada jogo citado (lançamentos podem ter várias; notícia e review, em geral uma). O site **usa** as tags: elas aparecem como etiquetas clicáveis na matéria, viram páginas em `/tag/` e entram na busca (digitar o nome do jogo mostra a tag primeiro).
`resumo` e `corpo` (ao menos 1 parágrafo) são obrigatórios; sem eles o site dá erro ao gerar.

## Regras que valem sempre
- Não inventar fatos, datas, preços ou nomes; dúvida não resolvida: omitir ou marcar `[CONFERIR: ...]`.
- Opinião do Brubão é atribuída a ele, nunca apresentada como fato.
- A assinatura "Claudio IA" aparece sozinha na página; não escrever como se fosse o Brubão.

## Tags (como escolher)
- Use o **nome oficial do jogo**, sempre com a **mesma grafia** em todas as matérias (ex.: `God of War Laufey`, não `GoW Laufey`).
- Em geral 1 a 3 tags. Quando fizer sentido, **a franquia e o jogo específico** (ex.: `God of War` e `God of War Laufey`).
- Lançamentos mensais podem ter **uma tag por jogo citado**.
- **Não** use tags genéricas (`games`, `notícia`, `review`), nem nomes de pessoas ou de empresas, salvo se forem o assunto central.
- Variações do mesmo nome (ex.: `GTA VI`, `GTA 6`, `Grand Theft Auto VI`) são unificadas em `_conteudo/tags.json`. Se surgir uma variação nova, **avise o Bruno** em vez de inventar outra grafia.
- A tag **GTA 6** leva direto à página `gta6.html`, e as matérias marcadas com ela também aparecem lá.
- Uma tag com **uma só matéria** não ganha página (fica só na busca); com 2 ou mais, ganha. Franquias (Resident Evil, God of War...) são ligadas ao jogo específico em `_conteudo/tags.json` (campo `pai`), então **não precisa repetir a franquia** nas tags: basta o jogo.
- **Lançamentos mensais:** no máximo **8 tags**, só os jogos de destaque do vídeo. Listas com 20 tags poluem a página e a busca.

## Título (para o Google)
- **Até 60 caracteres.** Títulos maiores são cortados nos resultados de busca. Hoje 12 matérias passam disso; ao revisar, encurte.
- Coloque o nome do jogo no começo e o gancho depois (ex.: `Control Resonant: vale jogar o original antes?`).

## Parágrafos
- No celular, parágrafo com mais de ~90 palavras vira bloco difícil de ler. Divida os longos (principalmente nas listas de lançamentos: um parágrafo por jogo).

## Vídeos antigos (legado)
O site só conhece os **15 vídeos mais recentes** de cada playlist. Para uma matéria de um vídeo **mais antigo**, o próprio arquivo precisa dizer onde ela entra:

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
- Sem esses dois campos, o `npm run gerar` para com um erro que diz o que falta (nunca ignora em silêncio).

## O que aparece no site
**Só aparece vídeo que tem matéria aprovada.** Vídeo sem arquivo, ou com `"status": "rascunho"`, não gera página, não vira cartão, não entra na busca. Pode subir aos poucos.
