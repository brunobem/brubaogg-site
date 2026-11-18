# Estado inicial da v1.0 (antes da revisão), 07/10/2026

Foto do site antes de qualquer mudança da revisão, para comparar no Bloco 12. Backup completo: `MCP SOCIAL\_backup-v1.0-antes-da-revisao` (164 arquivos).
Observação: depois do backup foram acrescentados só o campo `formato` nos 37 JSONs, `npm run formato`, os textos de skill/guia/README e os testes.

## Ambiente
Windows 11 Home · Node v24.16.0 · Python 3.14.0 · pasta de trabalho não é repositório Git (o Bruno copia para `Documents\GitHub\brubaogg-site` e comita pelo GitHub Desktop) · site no ar em brubaogg.com.br (GitHub Pages, branch, Jekyll padrão).

## Tamanho
| Parte | Arquivos | Tamanho |
|---|---|---|
| Publicado (páginas, matérias, sitemap) | 74 | 1,5 MB |
| `assets/` (CSS, JS, ícones, imagens, dados) | 28 | 462 KB |
| `_ferramentas/` (scripts) | 23 | 244 KB |
| `_conteudo/` (JSONs das matérias, tags, guia) | 40 | 130 KB |
| `_marca/` (originais, não publicado) | 13 | 1,5 MB |

`gerar-site.mjs` 663 linhas (38,8 KB) · `style.css` 494 linhas (27,3 KB) · `busca.js` 6,4 KB · `busca.json` 80 KB · 37 matérias (15 short, 22 horizontal) · 66 URLs no sitemap · 97 arquivos publicados (1,9 MB).

## Testes estáticos (`npm run testar`): crítico 0 · alto 1 · médio 34 · baixo 84
Conferem: 1.924 referências de link/arquivo com caixa exata (**0 problemas**), 68 páginas HTML, 37 JSONs de matéria, sitemap, publicação e idempotência do gerador (**limpo**: o site no disco é igual ao que o gerador produz, e rodar duas vezes não muda nada). Nenhum segredo publicado; nada interno publicado.

| Gravidade | Achado | Vai para o bloco |
|---|---|---|
| **ALTO** | 6 matérias aprovadas estão entre os 3 últimos vídeos de feeds cheios (Notícias e Reviews). Quando saírem do feed, `npm run gerar` para com erro, e a "correção" óbvia muda o endereço | 2 (decisão do Bruno: resolver depois, mas o gatilho está perto) |
| médio | 37 matérias dependem do feed dos 15 recentes para endereço, data e categoria | 2 |
| médio | 6 páginas legais têm 2 `<h1>` (versão em português e em inglês na mesma página) | 3 |
| médio | 11 páginas sem `og:title`/`og:description` (inclui `gta6.html` e `cortes.html`): o link compartilhado no Discord/WhatsApp/TikTok sai sem prévia | 3 e 8 |
| médio | 5 títulos de matéria com mais de 70 caracteres (o Google corta perto de 60); 21 de 37 passam de 60 | conteúdo (sessão de conteúdo) |
| baixo | 22 páginas com salto de `<h1>` para `<h3>` (títulos do rodapé) | 3 e 9 |
| baixo | 37 páginas de matéria sem dados estruturados (Article/VideoObject) | 8 |
| baixo | matéria com 22 tags (só 8 aparecem); 17 matérias com parágrafo de mais de 120 palavras | conteúdo |
| info | imagens sem `width`/`height` (risco de salto de layout) | 7 |

## Teste de layout (`layout.html`): 598 medições (26 páginas × 23 telas), 214 s
Telas: 18 larguras (280 a 2560, altura 800), 3 celulares deitados (667×375, 844×390, 932×430) e 2 baixas (1024×600, 1280×700). Páginas: todas as fixas e listas, 2 de tag e as matérias de cada categoria e formato, mais as de maior título, menor e maior texto.

| Gravidade | Achado | Vai para o bloco |
|---|---|---|
| **ALTO** (celular deitado = médio) | O player vertical (Short) mede **600 px** numa janela de 375 a 390 px de altura; o horizontal mede 424 px numa janela de 390 px (844×390). Em 7 páginas (matérias de Short e `gta6.html`). Em pé, em nenhuma largura o player passa da janela | 4 e 6 |
| **ALTO** | Rolagem horizontal em **280 px** de largura em `termos-youtube.html` e `privacidade-youtube.html` (conteúdo com 296 px: links longos sem quebra) | 4 e 6 |
| info | Alvos de toque entre 24 e 40 px no celular (ideal 44 px) em ~15 páginas: logotipo, links do cabeçalho, link "voltar" | 9 |

Nenhum achado em: elementos clicáveis cobertos por outros, texto e player sobrepostos, player fora da caixa, campos com fonte menor que 16 px, imagens quebradas, cabeçalho grudado ocupando demais a tela.

## Como comparar no fim
`npm run testar` mostra o resultado atual e, embaixo, a linha do estado inicial. O detalhe de cada achado do estado inicial está em `testes/estado-inicial.json`. O teste de layout se repete abrindo `testes/layout.html`.
