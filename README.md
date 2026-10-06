# brubaogg.com.br

Site do canal **BRUBAOGG**, publicado no GitHub Pages. Páginas estáticas em HTML/CSS/JS, sem build obrigatório:
o que está na raiz deste repositório é o que vai ao ar.

## Estrutura

```
index.html                   Home (contagem do GTA 6, feed de vídeos, redes, Discord)
gta6.html cortes.html lives.html     Abas com playlists incorporadas
noticias.html reviews.html lancamentos.html   Listas de matérias   (GERADAS)
noticias/ reviews/ lancamentos/               Uma página por matéria (GERADAS)
busca.html  404.html                          (GERADAS)
termos.html privacidade.html                  Termos e privacidade do SITE
mcp-tiktok.html mcp-youtube.html              Menu "MCP": cada um leva aos termos e à privacidade da ferramenta
termos-tiktok.html privacidade-tiktok.html    Termos e privacidade do MCP TikTok
termos-youtube.html privacidade-youtube.html  Termos e privacidade do MCP YouTube
CNAME                        Domínio personalizado (não apague)

assets/
  css/style.css              Todo o visual (cores no bloco :root)
  js/                        busca.js, contador.js
  icones/                    Ícones SVG (veja assets/icones/LEIA-ME.md)  <- coloque os seus aqui
  img/logo.png               Logo usado no site
  img/rodape/               Cena do rodapé: cena.svg (céu, sol, cidade) + palmeiras .webp (veja o LEIA-ME da pasta)
  data/                      playlists.json, busca.json (GERADOS)

_ferramentas/                Scripts Node (não publicados: pastas com "_" são ignoradas pelo Pages)
_conteudo/materias/          Texto das matérias: um JSON por vídeo
_marca/                      Imagens da marca que o site não usa hoje
```

## URLs que NÃO podem mudar

O endereço de cada página é o nome do arquivo. Mudar o nome ou mover o arquivo quebra o link e faz o Google perder o que já indexou.
Não há redirecionamento no GitHub Pages, então **não renomeie, mova nem apague** estas páginas:

| Página | Endereço | Por quê |
|---|---|---|
| Home | `https://brubaogg.com.br/` (`index.html`) | Indexação pedida no Google Search Console em 06/10/2026 |
| GTA 6 | `https://brubaogg.com.br/gta6.html` | Indexação pedida no Google Search Console em 06/10/2026 |

Também estão cadastradas em serviços externos (TikTok e Google Cloud), então mude só avisando:
`termos.html`, `privacidade.html`, `termos-tiktok.html`, `privacidade-tiktok.html`, `termos-youtube.html`, `privacidade-youtube.html`, `mcp-tiktok.html`, `mcp-youtube.html`.

`npm run verificar` falha se uma das duas páginas protegidas (home e GTA 6) estiver faltando.
Para mudar o **texto** ou o visual dessas páginas pode mexer à vontade; só o **nome do arquivo/endereço** é intocável.

## Rotina

Requer Node 18+. Os comandos rodam na raiz do projeto.

```bash
npm run atualizar   # baixa os vídeos novos do YouTube e regenera o site
npm run pendentes   # lista os vídeos que ainda não têm matéria (com o ID de cada um)
npm run nova -- ID  # cria o arquivo de texto de um vídeo (nasce como rascunho): _conteudo/materias/ID.json
npm run aprovar -- ID  # aprova um rascunho (ou --todos); depois rode npm run gerar
npm run gerar       # regenera as páginas depois de editar um texto
npm run verificar   # confere se não há link quebrado
```

### Duas frentes de trabalho (sessões separadas)
- **Site (visual, código, evolução):** mexe em `assets/`, `_ferramentas/`, páginas `.html` e roda `npm run gerar`, `verificar`, commit e push.
- **Conteúdo (matérias):** só cria `_conteudo/materias/<ID>.json` com `"status": "rascunho"`, seguindo o [`_conteudo/GUIA-EDITORIAL.md`](_conteudo/GUIA-EDITORIAL.md).
  Não toca em código, não gera o site e não faz commit.
- **Ponte:** o Bruno revisa os rascunhos (`npm run pendentes`), aprova (`npm run aprovar -- ID`) e a sessão do site gera e publica.
  Como as duas frentes mexem em arquivos diferentes, não há conflito.

### Publicar uma matéria nova (uma por vez)
1. `npm run pendentes` e escolha o vídeo (copie o ID).
2. `npm run nova -- ID` e preencha `titulo`, `resumo` e `corpo` no arquivo criado
   (ou deixe a sessão de conteúdo gravar o arquivo, no mesmo formato).
3. Revise o texto e aprove: `npm run aprovar -- ID`. **Arquivo com `"status": "rascunho"` não publica.**
4. `npm run gerar` e depois `npm run verificar`.
5. Commit e push. O GitHub Pages publica sozinho em 1 a 3 minutos (não existe etapa de deploy separada).

**Só entra no site o vídeo que tem matéria aprovada** (arquivo em `_conteudo/materias/` sem `"status": "rascunho"`). Vídeo sem matéria não gera página nem cartão.
Para ver as páginas só com o player: `node _ferramentas/gerar-site.mjs --com-videos-sem-texto`.
**Vídeos antigos** (fora dos 15 mais recentes da playlist): o arquivo precisa de `categoria` e `publicado`; veja o guia editorial.
Sobre o texto antigo desta regra: Uma aba (Notícias, Reviews, Lançamentos)
só aparece no menu depois da primeira matéria dela. Sem arquivo, o vídeo não gera página e não entra na busca.

`npm run rascunho` gera tudo com texto fictício (lorem ipsum) só para visualizar o layout. **Nunca publique esse modo**;
rode `npm run gerar` de novo antes do commit.

## Matérias

Título, data e vídeo vêm do YouTube. O texto vem de `_conteudo/materias/<ID_DO_VIDEO>.json`:

```json
{
  "status": "rascunho",
  "titulo": "Opcional: substitui o título do vídeo",
  "resumo": "1 ou 2 frases que aparecem na lista.",
  "corpo": ["Parágrafo 1.", "Parágrafo 2."]
}
```

`status: "rascunho"` mantém a matéria fora do site; apague o campo (ou use `npm run aprovar`) para publicar.
O autor exibido nas matérias é definido por `AUTOR` em `_ferramentas/gerar-site.mjs`.

## Tags

Cada matéria pode ter `"tags": ["Nome do jogo"]`. O gerador cria uma página `tag/<nome>.html` para cada tag, a lista de todas em `tags.html`,
as etiquetas clicáveis na matéria e as entradas na busca.

`_conteudo/tags.json` (opcional) unifica variações de nome e permite apontar uma tag para uma página própria:

```json
{
  "gta-6": { "nome": "GTA 6", "alias": ["GTA VI", "Grand Theft Auto VI"], "pagina": "gta6.html" },
  "outro-jogo": { "nome": "Outro Jogo", "alias": ["OJ"], "descricao": "Texto da página da tag (também faz ela ser indexada mesmo com 1 matéria)." }
}
```
- A chave é o nome da tag em minúsculas, sem acento e com hífens.
- `pagina`: a tag leva a essa página fixa em vez de gerar `tag/...` (usado em GTA 6, para não competir com `gta6.html`).
- **Só ganha página a tag com 2 ou mais matérias** (ou com `descricao`, ou com `pagina`). Tag com 1 matéria continua na busca e aparece como etiqueta sem link na matéria.
- `pai`: liga um jogo à franquia (ex.: `"resident-evil-6": { "nome": "Resident Evil 6", "pai": "resident-evil" }`). A matéria marcada com o jogo entra também na página da franquia, e a etiqueta da franquia aparece sozinha.
- Na matéria aparecem no máximo 8 etiquetas (as que têm página primeiro).

## Onde mexer para…

| Quero… | Edite |
|---|---|
| Mudar cores/fontes | `assets/css/style.css` (bloco `:root`) |
| Mudar a data de lançamento do GTA 6 | `data-alvo` em `index.html` e `gta6.html` |
| Trocar/adicionar playlist de uma aba | `_ferramentas/gerar-site.mjs` (`categorias`) e `_ferramentas/atualizar-videos.mjs` (`playlists`) |
| Mudar o **cabeçalho** ou o **rodapé** (em todas as páginas de uma vez) | `_ferramentas/gerar-site.mjs` (`headerHtml`, `footerHtml`) e depois `npm run gerar` |
| Mudar as redes sociais (cabeçalho e rodapé) | `SOCIAIS` em `_ferramentas/gerar-site.mjs` |
| Trocar a cena ou as palmeiras do rodapé | substituir os arquivos de `assets/img/rodape/` (tamanhos no LEIA-ME da pasta) |
| Adicionar ou trocar um ícone | arquivo em `assets/icones/` + `<!--icone:nome-->` na página (veja o LEIA-ME da pasta) |
| Mudar o feed da home (quantos vídeos, títulos das seções) | `feedHtml` em `_ferramentas/gerar-site.mjs` |
| Mudar as categorias/abas (nome, ícone, playlist) | `categorias` e `abas` em `_ferramentas/gerar-site.mjs` |

## Cuidados
- O cabeçalho e o rodapé das páginas fixas são **marcadores** (`<!--site:header-->`, `<!--site:footer-->`) preenchidos pelo `npm run gerar`. **Não edite o que está entre os marcadores**: a próxima geração sobrescreve.
- Este repositório deve conter **só o site**. Nunca coloque aqui os projetos `mcp-tiktok`/`mcp-youtube`, arquivos `.env` ou tokens.
- O nome do canal é **BRUBAOGG**, sem acento (o apelido "Brubão" é o único com til).
