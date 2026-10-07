# brubaogg.com.br

Site do canal **BRUBAOGG**, publicado no GitHub Pages. Páginas estáticas em HTML/CSS/JS: o que está na raiz deste repositório
é o que vai ao ar. A única coisa que **não** está no repositório é o índice da busca (Pagefind): o GitHub o monta a cada envio
(veja "Publicação" abaixo).

## Estrutura

```
index.html                   Home (contagem do GTA 6, feed de vídeos, redes, Discord)
gta6.html cortes.html lives.html     Abas com playlists incorporadas
noticias.html reviews.html lancamentos.html   Listas de matérias   (GERADAS)
arquivo.html arquivo/                         Arquivo por mês, links para toda matéria (GERADAS)
noticias/ reviews/ lancamentos/               Uma página por matéria (GERADAS)
busca.html  404.html                          (GERADAS)
termos.html privacidade.html                  Termos e privacidade do SITE
mcp-tiktok.html mcp-youtube.html              Menu "MCP": cada um leva aos termos e à privacidade da ferramenta
termos-tiktok.html privacidade-tiktok.html    Termos e privacidade do MCP TikTok
termos-youtube.html privacidade-youtube.html  Termos e privacidade do MCP YouTube
CNAME                        Domínio personalizado (não apague)
_config.yml                  Diz ao GitHub Pages o que não publicar (README, package.json, LEIA-ME)
.github/workflows/publicar.yml   Publicação: o GitHub confere, monta o site, cria o índice da busca e publica (não apague)

assets/
  css/style.css              Todo o visual, num arquivo só, em 16 seções com índice no topo (cores no bloco :root)
  js/                        busca.js (sugestões e página de resultados), contador.js (contagem do GTA 6)
  icones/                    Ícones SVG (veja assets/icones/LEIA-ME.md)  <- coloque os seus aqui
  img/logo.png               Logo usado no site
  img/rodape/               Cena do rodapé: cena.svg (céu, sol, cidade) + palmeiras .webp (veja o LEIA-ME da pasta)
  data/                      playlists.json; atalhos.json (tags e páginas na busca) e lista/ (matérias por mês + manifesto) (GERADOS)

_ferramentas/                Scripts Node (não publicados: pastas com "_" são ignoradas pelo Pages)
  gerar-site.mjs             Entrada do gerador; o código está em gerador/ (config, dados, paginas, modelos, saida)
  gerador/config.mjs         UMA configuração: categorias, playlists, abas, redes sociais, autor, domínio
  montar-site.mjs            Monta a pasta _site/ (só o que o Pages publica) e cria nela o índice da busca (npm run indexar)
  publicado.mjs              A definição única de "o que é publicado" (usada pela montagem e pelos testes)
  revisao-v1.01/testes/      Testes (npm run testar) e o teste de layout no navegador
_conteudo/materias/          Texto das matérias: um JSON por vídeo
_conteudo/enderecos.json     Endereço, categoria e data de cada matéria (nasce na aprovação e fica fixo; vai no commit, não apague)
_conteudo/lastmod.json       Data da última mudança de cada página (alimenta o sitemap; vai no commit, não apague)
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
npm run formato -- ID  # diz se o vídeo é short ou horizontal (campo "formato" do JSON)
npm run aprovar -- ID  # aprova um rascunho e registra o endereço dele; depois rode npm run gerar
npm run aprovar -- --todos           # só MOSTRA o que seria aprovado; com --confirmar aprova de verdade
npm run pendentes -- --rascunhos     # lista de rascunhos para revisar (inclui vídeos antigos)
npm run endereco -- ID               # refaz o endereço pelo título (o antigo vira redirecionamento)
npm run retirar -- ID                # tira uma matéria do ar de propósito (o endereço leva para a lista)
npm run gerar       # regenera as páginas depois de editar um texto
npm run validar-html # valida o HTML de todas as páginas (html-validate; precisa de internet na primeira vez)
npm run verificar   # confere se não há link quebrado (inclusive maiúscula/minúscula errada, que dá 404 no GitHub)
npm run testar      # bateria de testes (2 s): links, HTML, matérias, sitemap, publicação, CSS, JavaScript, gerador estável
npm run indexar     # monta _site/ e o índice da busca, igual ao servidor (para testar a busca de verdade; precisa de npm install uma vez)
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
3. Revise o texto e aprove: `npm run aprovar -- ID`. **Arquivo com `"status": "rascunho"` não publica.** A aprovação registra o endereço da página (veja abaixo).
4. `npm run gerar`, depois `npm run verificar` (e, de vez em quando, `npm run testar`).
5. Commit e push. O GitHub (Actions) confere, cria o índice da busca e publica sozinho em 1 a 3 minutos. Acompanhe na aba **Actions** do repositório: se algo grave for achado, **nada é publicado** e o site no ar continua como estava.

**Só entra no site o vídeo que tem matéria aprovada** (arquivo em `_conteudo/materias/` sem `"status": "rascunho"`). Vídeo sem matéria não gera página nem cartão.
Para ver as páginas só com o player: `node _ferramentas/gerar-site.mjs --com-videos-sem-texto`.
**Endereço da página:** nasce do **título da matéria** na aprovação e depois **fica fixo** (registrado em `_conteudo/enderecos.json`, junto com a categoria e a data). Mudar o título depois, ou o título do vídeo no YouTube (testes A/B), não muda o endereço. A matéria também não depende mais do feed do YouTube (que só traz os 15 vídeos mais recentes). Para mudar um endereço de propósito: `npm run endereco -- ID`; o antigo vira uma página que leva para o novo. Para tirar uma matéria do ar de propósito: `npm run retirar -- ID` (o endereço passa a levar para a lista, sem dar 404). Se uma página já publicada deixar de ser gerada sem querer (arquivo apagado ou voltou para rascunho), o `gerar` avisa em destaque e o `verificar` falha.

**Vídeos antigos** (fora dos 15 mais recentes da playlist): o arquivo precisa de `categoria` e `publicado` (data real); veja o guia editorial. Fluxo em lote: `npm run pendentes -- --rascunhos` (lista com tamanho e pendências) → revisar → `npm run aprovar -- --todos` (só mostra o que seria aprovado) → `npm run aprovar -- --todos --confirmar`.
Uma aba (Notícias, Reviews, Lançamentos) só aparece no menu depois da primeira matéria dela.

`npm run rascunho` gera tudo com texto fictício (lorem ipsum) só para visualizar o layout. **Nunca publique esse modo**;
rode `npm run gerar` de novo antes do commit.

## Busca

- **Sugestões** (campo do cabeçalho, em toda página): matérias pelo **Pagefind** (índice criado no build, pasta `pagefind/`, só baixa quando a pessoa digita), mais atalhos para **tags e páginas** (`assets/data/atalhos.json`). Entende `gta6` = `gta 6`, `ps5` = `ps 5`, acento e maiúscula; casa pelo **começo** das palavras. Teclado: setas, Enter, Esc; funciona com leitor de tela.
- **`busca.html`**: sem texto mostra as **30 matérias mais recentes** (já no HTML, sem baixar nada) e **Ver mais** traz 30 a cada clique, lendo `assets/data/lista/AAAA-MM.json` (um arquivo por mês + `manifesto.json`). Com texto, mostra os resultados (jogo no título primeiro, depois o mais novo) com filtro por categoria e o trecho destacado. O estado fica na URL (`?q=&cat=&n=`).
- O Pagefind só indexa o que tem `data-pagefind-body` (as matérias; o gerador coloca). Categoria e tags viram filtros; a data ordena.
- **Sem JavaScript** a busca não funciona (a página 1 aparece e um aviso explica); o resto do site funciona.
- **Contagem do GTA 6** (`contador.js`): data em `GTA6.alvo` (`config.mjs`, **com hora e fuso**: o gerador recusa sem). Corrige relógio de aparelho muito errado (mais de 1 hora) pela hora do servidor.
- Para testar a busca de verdade no seu computador: `npm install` (uma vez), `npm run gerar`, `npm run indexar`, e abra a pasta `_site/` num servidor local (ex.: `node _ferramentas/revisao-v1.01/testes/servidor.mjs 8102 _site`, que comprime como o GitHub Pages). Sem o `indexar` a busca por texto não acha nada (o índice não está no repositório).

## SEO e indexação

- **Dados estruturados** em toda matéria (gerados, no `<head>`): `Article` + `VideoObject` (o vídeo do YouTube) + `BreadcrumbList`, com título, resumo, data, miniatura e o canal BRUBAOGG como autor e editor (a assinatura visível "Por Claudio IA" continua na página). O **resumo** da matéria vira a descrição: até 160 letras. A previa de compartilhamento usa `og:type=article` e a data.
- **Arquivo por mês** (`arquivo.html` e `arquivo/AAAA-MM.html`, gerados): links **estáticos** para toda matéria, agrupados por categoria. O link "Arquivo" está no rodapé de TODA página, então qualquer matéria fica a até 3 cliques da home. Existe porque o "Ver mais" das listas é JavaScript e o Google não clica em botão.
- **"Relacionadas"** na matéria: até 3 da mesma categoria, escolhidas por tags em comum e data próxima (espalha os links internos).
- **Imagem de compartilhamento padrão** `assets/img/compartilhar.jpg` (1200×630) nas páginas sem imagem própria; matérias usam a miniatura do vídeo. Todas as páginas indexáveis têm `max-image-preview:large`.
- `robots.txt` bloqueia só `/pagefind/`; `sitemap.xml` traz toda página indexável (nunca `noindex` nem redirecionamento). Depois de subir uma versão nova, reenvie o `sitemap.xml` no Google Search Console.
- O `npm run testar` (teste `seo`) confere: dados estruturados válidos em toda matéria, nenhuma página órfã (alcançável por links a partir da home), distância máxima em cliques, toda matéria no arquivo por mês, sitemap coerente.

## Listas grandes ("Ver mais") e desempenho

- As páginas de categoria (`noticias.html`...), as tags e o hub do GTA 6 mostram as **30 matérias mais recentes no HTML** e, se a lista passa de 30, um botão **Ver mais** (30 por clique, sem repetir). O resto fica em `assets/data/colecao/<lista>/<n>.json` (blocos de 90, gerados; lista com até 30 itens não gera nada). Voltar para a página com `?n=90` mostra de novo até onde a pessoa estava.
- A fonte dos títulos (**Lilita One**, licença livre) é servida pelo próprio site (`assets/fonts/`), com `preload`; o gerador coloca no `<head>` de **toda** página um bloco `<!--site:recursos-->` (fonte e conexão antecipada com YouTube). O logo do cabeçalho é `logo-96.png` (9 KB); `logo.png` (800 px) só é usado como imagem de compartilhamento.
- Medir: `npm run estresse -- --escala=3000` monta uma cópia com 3.000 matérias simuladas; `_ferramentas/revisao-v1.01/testes/servidor.mjs PORTA PASTA` serve como o GitHub Pages (comprime); Lighthouse: `npx lighthouse URL --only-categories=performance` (veja o LEIA-ME dos testes). Metas v1.01 (celular, rede lenta simulada): nota 100 na home, nas listas e nas matérias; lista de 3.000 matérias com ~500 elementos na tela.

## Publicação (GitHub Actions)

O arquivo `.github/workflows/publicar.yml` roda a cada envio para a `main`: `npm ci` → `npm run verificar` (falhou = nada é publicado) → `npm run testar` (por enquanto só avisa) → `npm run indexar` (monta `_site/` e cria o índice da busca) → publica `_site/`.
**Configuração única (feita uma vez no site do GitHub):** repositório > **Settings > Pages > Build and deployment > Source: GitHub Actions**. Depois disso, cada envio publica sozinho; também dá para rodar na mão na aba **Actions > Publicar site > Run workflow**.
Se a Source continuar em "Deploy from a branch", o GitHub publica a raiz do repositório **sem** o índice da busca e a busca por texto não acha nada.

## Matérias

Título, data e vídeo vêm do YouTube. O texto vem de `_conteudo/materias/<ID_DO_VIDEO>.json`:

```json
{
  "formato": "short",
  "status": "rascunho",
  "titulo": "Opcional: substitui o título do vídeo",
  "resumo": "1 ou 2 frases que aparecem na lista.",
  "corpo": ["Parágrafo 1.", "Parágrafo 2."]
}
```

`formato` (`"short"` ou `"horizontal"`) diz ao site qual layout usar. Descubra com `npm run formato -- ID`; o comando nunca chuta: se não souber, diz `NAO SEI`.

`status: "rascunho"` mantém a matéria fora do site; apague o campo (ou use `npm run aprovar`) para publicar.
O autor exibido nas matérias é definido por `AUTOR` em `_ferramentas/gerador/config.mjs`.

**Regras do arquivo** (o `npm run gerar` para com a lista de problemas se algo estiver errado, dizendo o arquivo e o que fazer):
- `status` só pode faltar (matéria aprovada) ou ser exatamente `"rascunho"`. Qualquer outro valor é recusado.
- `formato`, `resumo` e `corpo` (lista de parágrafos não vazios) são obrigatórios; `tags` deve ser uma lista; `titulo`, se existir, não pode ser vazio.
- Matéria aprovada com `[CONFERIR` pendente não publica.
- Título com mais de 70 caracteres, resumo com mais de 160 e mais de 8 tags geram **aviso** no fim do `gerar`, sem impedir.
- O arquivo pode ser salvo com ou sem BOM (o PowerShell 5.1 grava com).

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
| Mudar cores/fontes | `assets/css/style.css` (seção 1, bloco `:root`: todas as cores e a fonte dos títulos são variáveis) |
| Mudar o visual de um componente | `assets/css/style.css`: ache o componente no **índice** do topo do arquivo e edite **a regra dele, na seção dele**. Não acrescente regra nova no fim do arquivo (o `npm run testar` acusa seletor repetido, valor morto e classe sem uso) |
| Mudar a data de lançamento do GTA 6 (contagem, textos, FAQ e descrição) | `GTA6` em `_ferramentas/gerador/config.mjs`, depois `npm run gerar` (as páginas leem de lá) |
| Trocar/adicionar playlist de uma aba | `_ferramentas/gerador/config.mjs` (`categorias`); o `atualizar-videos` e o `pendentes` leem dali |
| Mudar o **cabeçalho** ou o **rodapé** (em todas as páginas de uma vez) | `_ferramentas/gerador/modelos.mjs` (`headerHtml`, `footerHtml`) e depois `npm run gerar` |
| Mudar as redes sociais (cabeçalho e rodapé) | `SOCIAIS` em `_ferramentas/gerador/config.mjs` |
| Trocar a cena ou as palmeiras do rodapé | substituir os arquivos de `assets/img/rodape/` (tamanhos no LEIA-ME da pasta) |
| Adicionar ou trocar um ícone | arquivo em `assets/icones/` + `<!--icone:nome-->` na página (veja o LEIA-ME da pasta) |
| Mudar o feed da home (quantos vídeos, títulos das seções) | `feedHtml` em `_ferramentas/gerador/paginas.mjs` |
| Mudar as categorias/abas (nome, ícone, playlist) | `categorias` e `abas` em `_ferramentas/gerador/config.mjs` |

## Cuidados
- As páginas escritas à mão têm **marcadores** que o `npm run gerar` preenche. **Não edite o que está entre eles**: a próxima geração sobrescreve. O resto da página é seu.
  | Marcador | Onde | O que vira |
  |---|---|---|
  | `<!--site:header--><!--/site:header-->` e `<!--site:footer--><!--/site:footer-->` | toda página | cabeçalho e rodapé do site |
  | `<!--site:social--><!--/site:social-->` | dentro do `<head>` das páginas escritas à mão | prévia de compartilhamento (Discord, WhatsApp, TikTok), montada a partir do `<title>` e da `<meta name="description">` da própria página |
  | `<!--site:jsonld--><!--/site:jsonld-->` | `<head>` da home | dados estruturados, a partir da lista de redes |
  | `<!--icone:nome--><!--/icone-->` | onde quiser um ícone | o SVG de `assets/icones/nome.svg` |
  | `<!--dado:gta6-data-->texto<!--/dado-->` | onde a data do GTA 6 aparece | o valor de `GTA6` em `config.mjs` (nomes: `gta6-data`, `gta6-dia-mes`, `gta6-preload`, `gta6-plataformas`, `gta6-plataformas-curto`) |
  | `data-modelo="GTA 6 chega em {gta6-data}."` numa `<meta name="description">` | `gta6.html` | a descrição, com os dados preenchidos |
  | `<!--feed:inicio--><!--feed:fim-->` / `<!--gta6:inicio--><!--gta6:fim-->` | home / `gta6.html` | feed de últimas matérias / novidades do GTA 6 |
- **Se um marcador estiver faltando, repetido ou fora de ordem, o `npm run gerar` para**, sem gravar nada, e diz a página e o marcador. Uma **página nova escrita à mão** precisa ter os marcadores `site:header`, `site:footer` e `site:social` (copie de `termos.html`).
- Páginas legais em dois idiomas: o bloco em inglês fica dentro de `<div lang="en">` (leitor de tela). Os endereços de `termos`/`privacidade` do site, do TikTok e do YouTube **não podem mudar** (são usados por automações).
- Este repositório deve conter **só o site**. Nunca coloque aqui os projetos `mcp-tiktok`/`mcp-youtube`, arquivos `.env` ou tokens.
- O nome do canal é **BRUBAOGG**, sem acento (o apelido "Brubão" é o único com til).
