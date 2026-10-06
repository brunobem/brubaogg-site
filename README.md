# brubaogg.com.br

Site do canal **BRUBAOGG**, publicado no GitHub Pages. Páginas estáticas em HTML/CSS/JS, sem build obrigatório:
o que está na raiz deste repositório é o que vai ao ar.

## Estrutura

```
index.html                   Home (contagem do GTA 6, último vídeo, redes, Discord)
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
  js/                        busca.js, contador.js, ultimo-video.js
  img/logo.png               Logo usado no site
  data/                      playlists.json, ultimo-video.json, busca.json (GERADOS)

_ferramentas/                Scripts Node (não publicados: pastas com "_" são ignoradas pelo Pages)
_conteudo/materias/          Texto das matérias: um JSON por vídeo
_marca/                      Imagens da marca que o site não usa hoje
```

> As URLs das páginas são públicas e cadastradas em serviços externos (TikTok, Google).
> **Não renomeie nem mova** os arquivos `.html` da raiz sem avisar.

## Rotina

Requer Node 18+. Os comandos rodam na raiz do projeto.

```bash
npm run atualizar   # baixa os vídeos novos do YouTube e regenera o site
npm run pendentes   # lista os vídeos que ainda não têm matéria (com o ID de cada um)
npm run nova -- ID  # cria o arquivo de texto de um vídeo: _conteudo/materias/ID.json
npm run gerar       # regenera as páginas depois de editar um texto
npm run verificar   # confere se não há link quebrado
```

### Publicar uma matéria nova (uma por vez)
1. `npm run pendentes` e escolha o vídeo (copie o ID).
2. `npm run nova -- ID` e preencha `titulo`, `resumo` e `corpo` no arquivo criado
   (ou grave esse arquivo pelo MCP do YouTube, no mesmo formato).
3. `npm run gerar` e depois `npm run verificar`.
4. Commit e push. O GitHub Pages publica sozinho em 1 a 3 minutos (não existe etapa de deploy separada).

**Só entra no site o vídeo que tem arquivo em `_conteudo/materias/`.** Uma aba (Notícias, Reviews, Lançamentos)
só aparece no menu depois da primeira matéria dela. Sem arquivo, o vídeo não gera página e não entra na busca.

`npm run rascunho` gera tudo com texto fictício (lorem ipsum) só para visualizar o layout. **Nunca publique esse modo**;
rode `npm run gerar` de novo antes do commit.

## Matérias

Título, data e vídeo vêm do YouTube. O texto vem de `_conteudo/materias/<ID_DO_VIDEO>.json`:

```json
{
  "titulo": "Opcional: substitui o título do vídeo",
  "resumo": "1 ou 2 frases que aparecem na lista.",
  "corpo": ["Parágrafo 1.", "Parágrafo 2."]
}
```

O autor exibido nas matérias é definido por `AUTOR` em `_ferramentas/gerar-site.mjs`.

## Onde mexer para…

| Quero… | Edite |
|---|---|
| Mudar cores/fontes | `assets/css/style.css` (bloco `:root`) |
| Mudar a data de lançamento do GTA 6 | `data-alvo` em `index.html` e `gta6.html` |
| Trocar/adicionar playlist de uma aba | `_ferramentas/gerar-site.mjs` (`categorias`) e `_ferramentas/atualizar-videos.mjs` (`playlists`) |
| Mudar menu, cabeçalho ou rodapé das páginas geradas | `_ferramentas/gerar-site.mjs` (`cabecalho`, `pagina`) |
| Mudar o cabeçalho das páginas fixas (home, termos, gta6…) | cada `.html` da raiz (hoje o cabeçalho é repetido) |

## Cuidados
- Este repositório deve conter **só o site**. Nunca coloque aqui os projetos `mcp-tiktok`/`mcp-youtube`, arquivos `.env` ou tokens.
- O nome do canal é **BRUBAOGG**, sem acento (o apelido "Brubão" é o único com til).
