# Como adicionar conteúdo à Wiki

Esta pasta guarda o conteúdo da **Wiki** (`wiki.html`, `wiki/resident-evil.html`, `wiki/gta.html`, `series.html`...). Ela é **separada das matérias de vídeo** (as pastas `noticias`, `reviews` e `lancamentos`, ao lado desta em `_conteudo/materias`) porque o conteúdo da Wiki é diferente:

| | Matéria (`_conteudo/materias/<tipo>/<ID>/<ID>.json`) | Wiki (`_conteudo/materias/wiki/<nome>/<nome>.json`) |
|---|---|---|
| Vem de | um vídeo do canal | o que você quiser escrever: **pode ser só texto, sem vídeo** |
| Nome do arquivo | o ID do vídeo do YouTube (11 caracteres) | livre: minúsculo, sem acento, com hifens (`resident-evil-4-leon.json`) |
| Categoria | notícias, reviews, lançamentos, GTA 6 | sempre da **Wiki** (o endereço sai em `series/<título>.html`) |
| Data | vem do feed do YouTube | **você informa** (`publicado`) |
| Vídeo | obrigatório | **opcional** (`video`) |
| Cartão na lista | miniatura do vídeo | miniatura do vídeo, uma **imagem sua** (`imagem`) ou a capa padrão da Wiki |
| Review | pode ser | **não é**: review continua em Reviews; a Wiki guarda história, personagem, guia e curiosidade |

O site lê as duas pastas. O que o Resident Evil já tem de história está aqui (15 arquivos).

## Passo a passo

1. **Crie o arquivo** (nasce como rascunho, não vai para o site):

   ```bash
   npm run wiki -- resident-evil-4-leon --jogo resident-evil-4 --tipo personagem --titulo "Resident Evil 4: Leon S. Kennedy"
   ```

   - `--jogo` é obrigatório (sem ele o comando lista os jogos que existem).
   - `--tipo` é opcional (`historia` é o padrão). Opções: `historia`, `personagem`, `guia`, `curiosidade`.
   - `--video ID` só se houver vídeo do YouTube (o ID de 11 caracteres, não o link).
   - O comando recusa nome repetido, nome fora do padrão, jogo desconhecido e tipo errado.
2. **Abra `_conteudo/materias/wiki/resident-evil-4-leon/resident-evil-4-leon.json`** e escreva `titulo`, `resumo` e `corpo` (texto puro, **um parágrafo por item** da lista).
3. **Publique**: apague a linha `"status": "rascunho"`.
4. Rode `npm run gerar` e depois `npm run testar` (deve terminar sem crítico, alto nem médio).
5. Leve para o Git: o arquivo da Wiki, `_conteudo/enderecos.json` e as páginas geradas (`series/`, `wiki/`, `assets/data/`, `sitemap.xml`...).

Enquanto o arquivo estiver como `"status": "rascunho"` ele **não** vira página, não entra na Wiki, na busca nem no sitemap. Para ver como ficaria sem publicar: `npm run previa`.

## O arquivo

Só texto, sem vídeo:

```json
{
  "jogo": "resident-evil-4",
  "tipo": "personagem",
  "titulo": "Resident Evil 4: Leon S. Kennedy",
  "resumo": "Quem é Leon, o policial que chegou a Raccoon City no pior dia de sua vida.",
  "publicado": "2026-10-10",
  "tags": [],
  "spoiler": true,
  "corpo": [
    "Primeiro parágrafo.",
    "Segundo parágrafo."
  ]
}
```

Com vídeo (acrescente `video`; o cartão usa a miniatura do vídeo e a página ganha o player):

```json
{ "jogo": "resident-evil-6", "tipo": "historia", "video": "8fnl6OufKH0", "...": "o resto igual" }
```

| Campo | Obrigatório? | O que é |
|---|---|---|
| `jogo` | sim | O slug do jogo ou da franquia: `resident-evil-4`, `gta-5`, `gta`... (`npm run wiki` lista todos). É nele que o conteúdo aparece no menu da Wiki. |
| `titulo` | sim | Até 60 caracteres, com o nome do jogo no começo. **O endereço da página nasce dele e depois nunca muda.** |
| `resumo` | sim | 1 ou 2 frases, até 160 caracteres (descrição no Google e texto nos cartões). |
| `corpo` | sim | Lista de parágrafos em texto puro (sem markdown, HTML ou links). |
| `publicado` | sim | `AAAA-MM-DD`. Não vem do YouTube, então é a data que você escolher. |
| `tipo` | não | `historia` (padrão), `personagem`, `guia` ou `curiosidade`. Vira a etiqueta do cartão e da página. |
| `video` | não | ID do vídeo do YouTube (11 caracteres). Sem ele a página não tem player nem botão do YouTube. |
| `imagem` | não | Capa do cartão e da prévia nas redes: um arquivo de `assets/img/` (`"/assets/img/leon.jpg"`) ou um endereço `https://`. Com `video`, a miniatura do vídeo vale; sem nenhum dos dois, entra a capa padrão da Wiki (`assets/img/wiki-capa.svg`). |
| `spoiler` | não | `true` mostra o aviso "Contém spoilers" na página. Use em `historia`. |
| `tags` | não | Lista com nomes de jogos. O jogo de `jogo` entra sozinho. |
| `fontes` | não | Lista de fontes, se houver. |
| `assunto` | não | Palavras extras para a mini-busca. |
| `status` | não | Só `"rascunho"` (não publica) ou ausente (publica). |

Campo com nome errado não quebra: o gerador só avisa ("campo desconhecido"). Valor inválido (jogo que não existe, data errada, `video` com link em vez do ID, texto de modelo esquecido) **para o `npm run gerar`** com a mensagem do que corrigir.

## Onde o conteúdo aparece

- Página própria em `series/<título>.html`, com o botão "Voltar para Wiki" e a aba **Wiki** marcada.
- `wiki.html` (mini-busca e menu): dentro do **jogo** escolhido no menu. A franquia mostra tudo; o jogo mostra o que não é notícia; **Notícias** reúne as notícias da franquia inteira.
- `series.html`, a página da franquia (`wiki/resident-evil.html`, `wiki/gta.html`), a página da tag do jogo, o arquivo por mês, a busca do site e o sitemap.
- Home: o bloco **Wiki** conta quantos conteúdos cada franquia tem.

## Jogo ou franquia nova

O menu e os cartões da Wiki vêm de `WIKI.jogos` em `_ferramentas/gerador/config.mjs`.
- **Jogo novo numa franquia que já existe** (ex.: Resident Evil 8): uma linha em `serie`, com o slug da tag do jogo (ou `{ tag: 'gta-7', nome: 'GTA 7' }` se ainda não existe tag). Um jogo sem conteúdo aparece no menu como "Em breve".
- **Franquia nova**: um bloco novo em `WIKI.jogos` (`nome`, `tag`, `descricao`, `texto`, `serie`). Dica: copie o do GTA.

Depois rode `npm run gerar`. Se o `npm run wiki` ainda não reconhecer o jogo, ele não está em `serie`.

## Mexer no que já está publicado

- **Não renomeie** o arquivo: o nome é o identificador do conteúdo. Mudar o `titulo` **não** muda o endereço (ele fica registrado em `_conteudo/enderecos.json`, e o link antigo continua valendo). Se quiser mesmo refazer o endereço a partir do título novo: `npm run endereco -- <nome>` (o endereço antigo vira redirecionamento). Editar `resumo`, `corpo`, `tipo` e `jogo` é livre.
- **Tirar do ar**: `npm run retirar -- <nome do arquivo>` (o endereço passa a levar para a lista da Wiki e o arquivo é apagado).
- **Rascunhos da Wiki** aparecem em `npm run pendentes`, numa lista à parte, com o que ainda falta em cada um. A Wiki **não usa** `npm run aprovar`: publicar é apagar a linha `"status"`.
- Conteúdo da Wiki fica sempre na Wiki: `npm run mover` recusa mexer nele.
