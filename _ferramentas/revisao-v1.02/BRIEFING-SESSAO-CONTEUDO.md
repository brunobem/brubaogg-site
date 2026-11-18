# Briefing para a sessão de criação de matérias (v1.02)

Escrito em 10/10/2026 pela sessão do site, para a sessão que cria as matérias a partir dos vídeos do YouTube.
Leia este arquivo inteiro antes de qualquer coisa. Depois leia `PLANO.md` e `FILA-REVISAO.md` (mesma pasta).

## Contexto em 5 linhas
- O site está no ar na versão 1.01 (pasta `site-brubaogg\Site v1`, **não mexer lá**). Quase não tem tráfego, e o Bruno decidiu recomeçar o editorial com calma.
- A nova versão é a **`site-brubaogg\Site v1.02`**, só local: **não vai ao GitHub** até as 74 matérias estarem revisadas e reaprovadas. Nada sai do ar enquanto isso.
- As 74 matérias aprovadas vão voltar para rascunho (nesta pasta) e ser **revisadas uma a uma** por você, seguindo o padrão abaixo.
- Uma análise crítica externa (outro Claude) elogiou o texto: português limpo, "não parece IA", fatos corretos, opinião atribuída. **Mantenha a voz.** O que ela apontou como defeito são vícios de transcrição e falta de estrutura, não o estilo.
- Regra antiga que continua: nenhuma matéria já no ar muda sem o Bruno pedir. Ele agora pediu a revisão geral, mas **a revisão acontece só em `Site v1.02`**.

## O que você NÃO deve fazer agora
- Não regravar nenhuma matéria ainda. As pastas, os campos novos e o comando `conferir` ainda não existem (a sessão do site está construindo). Escrever agora geraria retrabalho.
- Não mexer em `Site v1`, em código, HTML, CSS, `assets/` ou `_ferramentas/`, e não rodar `npm run gerar`, `aprovar` nem commit/push.
- Não gastar cota do MCP do YouTube nem do VidIQ sem perguntar ao Bruno (a cota já é o limite do dia; muitas transcrições já estão na coluna I da planilha `Videos Youtube\Video Youtube.xlsx`).

## Fase 0: o que entregar agora (só diagnóstico e proposta, nada de matéria)
1. **Diagnóstico.** Abra `FILA-REVISAO.md` (74 matérias com sinais automáticos e camada sugerida A/B/C). Leia por amostra 6 matérias de tipos diferentes (2 reviews com nota, 1 notícia, 1 de GTA 6, 1 lançamentos, 1 de Resident Evil) e diga, para cada uma, o que o padrão novo pediria.
2. **Skill nova.** Escreva uma **proposta** de skill em `_ferramentas/revisao-v1.02/SKILL-PROPOSTA.md` com o padrão abaixo e o seu método (transcrição ajustada da coluna I + 3 fontes). **Não sobrescreva** a skill `materia-brubaogg` ativa: o Bruno aprova primeiro.
3. **Plano de lotes.** Ordem sugerida, tamanho do lote por dia, quais matérias já têm transcrição na planilha (não gastam cota), o que exige pesquisa na web e uma estimativa honesta de esforço total. O Bruno tem limite semanal de uso e quer saber o custo antes de começar.
4. **Dependências do site.** O que você precisa que a sessão do site entregue (campos, pastas, comandos) e o que está faltando ou ambíguo nesta proposta.
5. **Perguntas para o Bruno** (junte as dúvidas numa lista só).

## Padrão novo (resumo; o detalhe está em `PLANO.md`)
**Tipos de matéria:** Review (com nota), Notícia, Lançamentos (listas mensais), **História** (nova categoria, `/historia/`: os 15 vídeos de enredo de Resident Evil, sem nota, "a história do ponto de vista do Brubão", com aviso de spoiler e ordem da série). GTA 6 novidades segue como hoje.

**Review: ficha de veredito (campos novos).** Os dados vão em campos e a página mostra um quadro no topo e nos cartões. O texto **não repete** a fórmula "O veredito do Brubão sobre X é nota N" (abre 21 reviews hoje).
- `nota`: 0 a 10, passos de 0,5. `recomendacao`: `compre` · `espere-promocao` · `so-com-amigos` · `pule`.
- `preco` (com loja e ano, só se o vídeo disser), `horas`, `plataforma`, `paraQuem` (uma linha), `spoiler` (sim/não).
- Texto de 5 a 7 parágrafos: veredito e por quê → o que funciona → **o que não funciona (no mínimo um ponto contra)** → quando comprar / para quem é → contexto (estúdio, lançamento, plataformas) → fecho com a conclusão do Brubão.
- Hoje: de 31 reviews com nota, todas têm plataforma e história, ~80% têm recomendação, "para quem é" e preço, 65% as horas, e só 52% citam um ponto fraco.

**Notícia:** o fato, a fonte com link (obrigatória), o contexto que o vídeo não traz, a opinião atribuída ao Brubão. Datas absolutas.

**Texto, regras novas (vícios de transcrição):**
- Sem pergunta ou convite ao público no corpo ("ele pergunta ao público…", "convida a comentar…"). Hoje ~45 de 74 terminam assim. O fecho é a conclusão ou a recomendação do Brubão. A página terá um botão fixo "Comentar no vídeo".
- Sem referência à estrutura do vídeo: "segundo o vídeo", "o vídeo é dividido em", "comentário fixado", "no canal".
- Fonte nomeada e com link (campo `fontes: [{nome, url}]`); nunca "fontes consultadas" ou "segundo fontes".
- Datas absolutas e verbo coerente com a data de publicação. Evento que já aconteceu fica no passado (hoje há 32 frases no futuro com data vencida, quase todas em listas de lançamentos).
- Parágrafo com no máximo ~90 palavras (hoje 92 de 416 passam disso).
- Não abrir nem fechar todas com a mesma fórmula; aberturas e fechos desgastados serão listados na skill nova.
- Opinião sempre atribuída ("para o Brubão…"); terceira pessoa; nome oficial do jogo; sem inventar fato.

**Tamanho (proposta, alinhada à prática):** notícia 150 a 300 palavras; review 350 a 700; lançamentos e História: sugerir na proposta. Hoje a média é 201 (notícia) e 469 (review), abaixo das metas antigas (250–350 e 500–800).

**Relações entre matérias.**
- `assunto` (campo opcional): matérias de vídeos diferentes sobre o mesmo fato (ex.: os 3 de animais de GTA 6, os 3 de God of War Laufey) viram **uma página com um bloco por vídeo**. Cada vídeo continua com seu JSON.
- `shorts` (só em review): `[{ "id": "...", "titulo": "..." }]`. Review Shorts ficam **anexados** à review longa, em player vertical pequeno, sem matéria própria. Os 6 da planilha casam com uma review pelo nome do jogo; INSIDE e Storebound hoje são notícias e passam a ser anexo.
- No texto, `[[ID]]` vira link para outra matéria aprovada (depois que o site aceitar).
- Os grupos propostos pelo detector estão no topo de `FILA-REVISAO.md`; o Bruno confirma cada um.

## Formato do arquivo (proposta; o gerador ainda NÃO lê os campos novos)
```json
{
  "formato": "horizontal",
  "titulo": "Jogo: gancho (até 60 caracteres, jogo no começo)",
  "resumo": "Até 160 caracteres.",
  "tags": ["Nome oficial do jogo"],
  "veredito": { "nota": 8, "recomendacao": "compre", "preco": "R$ 0 na Loja (ano)", "horas": "10 a 11", "plataforma": "PS5", "paraQuem": "Uma linha." },
  "spoiler": false,
  "fontes": [{ "nome": "Flow Games", "url": "https://..." }],
  "shorts": [{ "id": "IDDOSHORT", "titulo": "Título do short" }],
  "assunto": "slug-do-assunto",
  "corpo": ["Parágrafo 1.", "Parágrafo 2."]
}
```
(valores de exemplo ilustrativos). **Pastas novas, quando a sessão do site terminar:** `_conteudo/rascunhos/` (onde você escreve; fora do Git), `_conteudo/materias/` (só o que o Bruno aprovou), `_conteudo/retiradas/`. O campo `status` deixa de existir: a pasta diz o estado. Você será avisada quando isso estiver pronto.

## Perguntas já em aberto (o Bruno decide)
- Nome da marca no texto: "BRUBÃOGG" (com til) ou "BRUBAOGG" (sem). O README do site usa sem acento; a skill atual usa com til.
- Miniaturas do player: próprias (baixadas na aprovação) ou as do YouTube.
- Escala da nota e as 4 recomendações (o Bruno já aceitou 0 a 10; as 4 recomendações são proposta).

## Referências
- `PLANO.md` (decisões e backlog) · `FILA-REVISAO.md` (74 matérias, sinais e camada A/B/C) · `_conteudo/GUIA-EDITORIAL.md` e a skill `materia-brubaogg` (regras atuais, serão substituídas).
- Análise externa (parcial, só leitura): `C:\Users\bruno\Desktop\PowerToys.MouseWithoutBorders\ScreenCaptures\ANALISE-V1-PARCIAL.md`. A parte editorial está nas linhas 32 a 265; o resto é sobre código e segurança e não é necessário agora. Os números dela foram conferidos pela sessão do site e batem na ordem de grandeza.
