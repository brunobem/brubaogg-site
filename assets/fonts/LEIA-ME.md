# Fontes

`lilita-one-latin.woff2` (10 KB) e `lilita-one-latin-ext.woff2` (1 KB): **Lilita One**, de Juan Montoreano, licenca **SIL Open Font License 1.1** (uso livre, inclusive comercial).
Origem: Google Fonts (https://fonts.google.com/specimen/Lilita+One), baixadas em 07/10/2026. Estao declaradas no inicio de `assets/css/style.css` (`@font-face`).
O navegador so baixa o arquivo `latin-ext` se a pagina tiver uma letra que o `latin` nao cobre (ex.: `ł`, `ő`). O `latin` cobre o portugues inteiro.
Para trocar a fonte: coloque o novo `.woff2` aqui, ajuste o `@font-face` no CSS e o `preload` em `_ferramentas/gerador/saida.mjs`.

## Inter (texto do corpo)
`inter-latin-wght-normal.woff2` (47 KB) e `inter-latin-ext-wght-normal.woff2` (83 KB): **Inter** variável (pesos 100 a 900 num arquivo só), de The Inter Project Authors (Rasmus Andersson), licença **SIL Open Font License 1.1** (texto em `licenca-inter-ofl.txt`).
Origem: pacote `@fontsource-variable/inter` 5.3.0 (npm), baixado em 12/10/2026; os arquivos são os do próprio Inter, sem alteração. Declaradas no início de `assets/css/style.css` (`@font-face`, família "Inter"); o `preload` do arquivo `latin` está em `_ferramentas/gerador/saida.mjs`. O `latin-ext` só baixa se a página tiver letra fora do latim comum.

## Regra de tipografia
**Títulos em Lilita One** (`--font-display`): todo `h1` a `h6` e os títulos de cartão, mais os rótulos curtos da interface (menu, botões, etiquetas de categoria, contador). **Todo o resto em Inter** (`--font-body`): parágrafos, resumos, datas, legendas, textos de abertura, campos de busca. O teste `css` confere o CSS e `_ferramentas/revisao-v1.01/testes/fontes-paginas.js` confere as páginas no navegador.
