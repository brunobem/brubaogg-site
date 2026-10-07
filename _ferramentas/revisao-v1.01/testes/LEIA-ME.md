# Testes do site

Dois tipos. Nenhum precisa instalar nada.

## 1) Testes estáticos (sem navegador): `npm run testar`
Lê os arquivos do site e confere. Leva uns 2 segundos e não usa internet.

| Teste | O que confere |
|---|---|
| `links` | todo link, imagem, `url()` do CSS, arquivo do JS e URL do sitemap existe **com a mesma caixa de letras** (o GitHub distingue maiúscula de minúscula; o Windows não); nomes de arquivo em minúsculo sem espaço nem acento |
| `html` | idioma, viewport, título, descrição, canonical, um só `<h1>`, ids repetidos, imagens sem `alt`, `iframe` sem `title`, links `_blank` sem `noopener`, links sem nome acessível, marcadores de cabeçalho/rodapé, sobras de teste (`lorem ipsum`, `[CONFERIR`), tags sem fechar |
| `contrato` | os JSONs de matéria (campos obrigatórios, `formato`, tags, tamanhos, `[CONFERIR`), o `tags.json` (pai inexistente, laço, apelido que aponta para duas tags) e quais matérias estão perto de sair do feed dos 15 recentes |
| `seo` | sitemap (URLs existem, sem `noindex`, datas), páginas protegidas, `robots.txt`, `CNAME`, `404.html`, dados estruturados |
| `publico` | o que o GitHub Pages publica: nada interno (README, scripts, planilhas), nenhum segredo, nenhum arquivo grande sem querer |
| `gerador` | roda o gerador numa **cópia**: o site no disco é igual ao que ele gera hoje, e rodar duas vezes não muda nada |
| `js` | `busca.js` e `contador.js` num navegador de mentira (`dom-falso.mjs`): sintaxe, nada de `innerHTML`/`eval`, funções puras da busca (`gta6`=`gta 6`, estado da URL, atalhos) com 4.000 textos aleatórios, o contador em 11 situações (inclusive relógio do aparelho errado e servidor fora do ar), e os **dados da busca**: listas por mês, manifesto, atalhos, pagina 1 de `busca.html` = os 30 primeiros da lista, marcas do Pagefind em todas as matérias, `data-base` e `action` do formulário em toda página |
| `css` | higiene do `style.css` (`css-analise.mjs --detalhes` mostra o relatório completo): seletor repetido no mesmo contexto de tela, valor morto, classe/id que não existe no site, cores soltas fora de `:root`, `!important`, foco do teclado, movimento reduzido, `color-scheme`, e se as seções batem com o índice do topo do arquivo |

Opções: `npm run testar -- --so=links,seo` (só alguns), `-- --tudo` (lista tudo), `-- --base` (grava o "estado inicial").
Gravidade: **critico** e **alto** fazem o comando terminar com erro; **medio** e **baixo** são avisos; **info** só informa.
Detalhes completos: `resultado-ultimo.json`.

## 2) Teste de layout (precisa de navegador): `layout.html`
Abre cada página da amostra (`amostra.json`) em um iframe do tamanho de cada tela (`matriz-de-telas.json`: 18 larguras de 280 a 2560, 3 celulares deitados e 2 telas baixas) e mede: rolagem horizontal, player maior que a janela ou fora da caixa, texto e player se sobrepondo, elementos clicáveis cobertos por outros, alvos de toque pequenos, fontes pequenas, imagens quebradas.

1. Suba o site local (no Claude: servidor `site`, porta 8099; ou `python -m http.server 8099` na pasta do site).
2. Abra `http://localhost:8099/_ferramentas/revisao-v1.01/testes/layout.html` e clique em **Rodar tudo** (leva uns 3 a 4 minutos).
3. Para atualizar a amostra depois de novas matérias: `node _ferramentas/revisao-v1.01/testes/amostra.mjs`.

O teste renova sozinho o cache do navegador (CSS, JS e as páginas) antes de medir, para nunca medir uma versão antiga do site.

### Teste do JavaScript no navegador: `js.html` (busca de verdade, teclado, sem JavaScript)
Precisa do site **montado** (o índice da busca não existe na pasta de trabalho): `npm run indexar -- --com-testes`, depois sirva a pasta `_site/` (ex.: `python -m http.server 8102 --directory _site`) e abra `http://localhost:8102/_testes/js.html` > **Rodar tudo** (uns 60 s, 89 verificações): sugestões, setas e `aria-activedescendant`, Esc, Tab para fora, falha de rede com "Tentar de novo", Enter (título exato, texto comum, opção marcada), `busca.html` (pagina 1, "Ver mais", filtro de categoria, URLs estranhas, 320 px), qualidade (título exato em 1º lugar, sem acento, maiúsculas, erro de digitação), modo sem JavaScript e contador. **Controle:** 5 defeitos plantados na cópia montada de `busca.js` (cache da falha, lista que não fecha, Esc que tira o foco, opção sem `tabindex`, sem `aria-activedescendant`) foram todos acusados.
A matriz de telas do teste de layout também roda contra o site montado (`/_testes/layout.html`), com 3 estados da página de busca na amostra.

### Teste de estresse: conteudo hostil (`npm run estresse`)
Monta uma **copia** do site em `MCP SOCIAL\_estresse\site` (fora do repositorio) com as materias reais, os rascunhos aprovados na copia e **12 materias extremas** (titulo de 200 letras, palavra sem espaco, 8 tags de 60 letras, 0 tags, resumo de 500 letras, 1 paragrafo de 4 mil letras, 1 frase so, 3 mil palavras ao lado do Short, HTML/marcadores/emoji/arabe/CJK/caracteres invisiveis no texto, titulo so de emoji, dois titulos iguais), aprova, gera e indexa. Sirva `_estresse/site/_site` (`node _ferramentas/revisao-v1.01/testes/servidor.mjs 8103 ..\_estresse\site\_site`) e abra `/_testes/layout.html` e `/_testes/js.html` (a amostra dessa copia ja vem pronta). `npm run estresse -- --vazio` faz o contrario: um site **sem nenhuma materia** (`_estresse/vazio`).

### Desempenho: escala e Lighthouse
- `npm run estresse -- --escala=3000` monta `MCP SOCIAL\_estresse\escala-3000` (3.000 materias simuladas com o texto das reais). `servidor.mjs PORTA PASTA` serve uma pasta **comprimindo e com `Cache-Control: max-age=600`, como o GitHub Pages** (o `python -m http.server` nao comprime e exagera o peso das paginas).
- Lighthouse (precisa do Chrome instalado): `CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npx --yes lighthouse@12 URL --only-categories=performance --chrome-flags="--headless=new" --output=json --output-path=saida.json` (perfil celular: rede 4G lenta e CPU 4x mais lenta, simuladas). Compare sempre com uma medicao anterior feita no mesmo servidor.

### Checagens de CSS no navegador (`layout.js`, pelo console da página `layout.html`)
- `layoutTeste.rodarCss({...})`: contraste real (inclui fundo em degradê e `filter`), texto a 200% (conteúdo cortado), `position: absolute` preso ao pai errado, foco do teclado.
- `layoutTeste.compararCss({ paginas, larguras, altura, a, b })`: **prova de equivalência**. Abre a mesma página com dois CSS (`a` e `b`), congela as animações, carrega todas as imagens e compara o estilo calculado, a posição e o tamanho de **cada elemento** (e `::before`/`::after`). Usada para provar que reorganizar o CSS não mudou nada: 25 páginas × 16 larguras, 60.960 elementos, 0 diferenças. Controle: um CSS com defeitos plantados é acusado.
- `css-equivalencia.mjs antes.css depois.css` (sem navegador): compara regra a regra o que cada seletor faz depois de somar as camadas e resolver as variáveis. Pega o que o navegador não mostra parado (`:hover`, `:focus`, `::placeholder`).
- `css-antes.css` é o CSS da v1.0 (antes do Bloco 4), guardado só como **referência para essas comparações**; `css-fase1.css` é a versão só reorganizada (antes das correções visuais); `css-controle.css` tem defeitos plantados de propósito e serve de **controle** (a comparação precisa acusá-los, senão ela não vale).

Limites conhecidos: o iframe emula **largura**, não o tipo de toque (o aviso de fonte menor que 16px no iPhone só vale para larguras de celular); Safari e iOS reais não são testados aqui.
