# Cena do rodapé

A cena do rodapé tem **duas camadas**:

1. **`cena.svg`**: o fundo (céu, sol listrado e cidade). Largo, em torno de 1440 × 260, com a borda de baixo na cor do rodapé (`#26232b`).
2. **Palmeiras** (WebP com fundo transparente, feitas a partir das suas artes):
   - `palmeiras-grupo.webp`: o grupo de palmeiras. Aparece na esquerda e **espelhado** na direita.
   - `palmeira-a.webp` e `palmeira-b.webp`: palmeiras soltas, entre o grupo e o sol (somem no celular).

As posições e os tamanhos ficam em `assets/css/style.css`, nas regras `.fp-grupo-esq`, `.fp-grupo-dir`, `.fp-a` e `.fp-b`.
O HTML delas está em `_ferramentas/gerar-site.mjs` (`footerHtml`).

## Como trocar
- **Fundo:** substitua `cena.svg` mantendo o nome.
- **Palmeiras:** substitua os `.webp` mantendo os nomes. Use **fundo transparente**, recorte rente ao desenho e, de preferência, **altura entre 600 e 800 px** e menos de 120 KB cada.
- Suas artes originais (PNG grandes) ficam guardadas em `_marca/coqueiros/` e **não são publicadas**.
- Para gerar o WebP a partir do PNG original: recortar na área do desenho, reduzir a altura para ~700 px e salvar como WebP (qualidade ~80).

## Outras imagens
Imagens gerais do site (logo etc.) ficam em `assets/img/`. Fontes e variações da marca que o site não usa ficam em `_marca/` (não são publicadas).
