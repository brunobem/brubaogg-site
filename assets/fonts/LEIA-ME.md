# Fontes

`lilita-one-latin.woff2` (10 KB) e `lilita-one-latin-ext.woff2` (1 KB): **Lilita One**, de Juan Montoreano, licenca **SIL Open Font License 1.1** (uso livre, inclusive comercial).
Origem: Google Fonts (https://fonts.google.com/specimen/Lilita+One), baixadas em 07/10/2026. Estao declaradas no inicio de `assets/css/style.css` (`@font-face`).
O navegador so baixa o arquivo `latin-ext` se a pagina tiver uma letra que o `latin` nao cobre (ex.: `ł`, `ő`). O `latin` cobre o portugues inteiro.
Para trocar a fonte: coloque o novo `.woff2` aqui, ajuste o `@font-face` no CSS e o `preload` em `_ferramentas/gerador/saida.mjs`.
