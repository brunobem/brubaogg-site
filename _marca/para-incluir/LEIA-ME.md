# Pasta de entrada: arquivos para eu incluir no site

Coloque aqui **qualquer SVG ou imagem** que você queira ver no site, mesmo sem saber onde ele entra.
Eu confiro o arquivo (tamanho, cores, se funciona no tema escuro), escolho o lugar certo, ligo nas páginas e te mostro na prévia.
Esta pasta **não é publicada**.

## O que ajuda mais (em ordem)
1. `logo.svg`: o logo em vetor (círculo com a barba e o BGG). Fica nítido em qualquer tamanho e pesa uma fração do PNG de hoje.
2. `favicon.svg`: versão **bem simples** do logo para o ícone da aba do navegador (aparece em 16 px, então sem detalhes finos; a silhueta da barba funciona bem).
3. `compartilhamento.png`: imagem **1200 × 630** que aparece quando o link do site é colado no WhatsApp, Discord, X etc. (não aceita SVG).
4. `cena.svg`: se quiser trocar a ilustração do rodapé pela sua (veja `assets/img/rodape/LEIA-ME.md`).
5. Opcionais: `404.svg` (ilustração da página de erro), `padrao.svg` (o padrão de pontinhos roxos da sua marca como fundo), `hero.svg` (arte da home), ícones de categoria próprios.

## Como exportar o SVG (Illustrator, Figma, Inkscape)
- **Converter textos em curvas** (outline). A fonte não vai junto com o arquivo.
- Ter `viewBox` e **nenhuma imagem raster dentro** (nada de `<image>`, PNG embutido).
- Sem scripts e sem fontes externas. Ideal abaixo de 50 KB (a cena do rodapé pode ir até 100 KB).
- **Ícones** (de interface): um só traço, **sem cor fixa** (use `currentColor`) e quadrados (24 × 24). Assim mudam de cor com o tema.
- **Logo e ilustrações:** podem ter as cores da marca. Paleta do site: `#302D33` fundo · `#36352C` cartões · `#43394F` · `#5D437A` · `#792DCF` roxo · `#CFCD2D` lima · `#9C9B41` oliva · `#F4F3EA` texto.
- Nome em minúsculas, sem espaço nem acento: `logo-barba.svg`.

## O que não colocar
Logos, capas e arte de jogos (GTA, Rockstar, etc.) e logos oficiais de plataformas além dos que já estão em `assets/icones/` (os de YouTube, TikTok, Instagram e Discord). Têm direitos autorais e marca registrada.
