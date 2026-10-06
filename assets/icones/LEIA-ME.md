# Pasta de ícones

Coloque aqui os ícones em **SVG**. Cada arquivo vira um ícone embutido no HTML pelo gerador, e herda a cor do texto ao redor (por isso muda de cor no hover, no botão ativo etc.).

## Como usar um ícone
1. Salve o arquivo aqui, com nome em minúsculas e sem espaço: `estrela.svg`.
2. Em qualquer página `.html` fixa, escreva `<!--icone:estrela-->` onde ele deve aparecer.
   Nas listas, abas e rodapé, os ícones são definidos em `_ferramentas/gerar-site.mjs` (`abas`, `categorias`, `SOCIAIS`).
3. Rode `npm run gerar`. O marcador é preenchido com o SVG.

## Como deve ser o SVG
- Quadrado, com `viewBox` (ex.: `0 0 24 24`).
- **Contorno** (estilo Lucide): use `stroke="currentColor"` e `fill="none"` no `<svg>`.
- **Preenchido** (estilo logotipo): use `fill="currentColor"`, sem cores fixas.
- Sem cores fixas (`#fff`, `#000`...): elas ignoram o tema do site.

## Ícones que já estão aqui
- Interface: [Lucide](https://lucide.dev) (licença ISC): `rocket`, `star`, `scissors`, `newspaper`, `radio`, `search`, `external-link`, `frown`, `search-x`, `tag`.
- Redes: [Simple Icons](https://simpleicons.org) (licença CC0): `youtube`, `tiktok`, `instagram`, `twitch`, `discord`.

Para trocar um deles, substitua o arquivo mantendo o mesmo nome.

## Ícone próprio
- `tree-palm.svg`: palmeira **desenhada à mão a partir da arte de coqueiros do Bruno**: 7 folhas longas e caídas em forma de lua crescente, 2 cocos e tronco curvo. É preenchida (silhueta), leve e legível em 16 px. A versão anterior (vetorização direta da imagem) ficou volumosa demais e foi descartada.
- Backups: o ícone de contorno original (Lucide) em `_marca/icones-originais/`. O roteiro de desenho, com os parâmetros das folhas e do tronco, em `_marca/coqueiros/desenhar-icone.py`.
