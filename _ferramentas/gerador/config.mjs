// Configuracao UNICA do site. Usada pelo gerador e pelos outros scripts (atualizar, pendentes, nova, aprovar).
// Para mudar categorias, abas, redes sociais ou o autor, e so aqui.

export const DOMINIO = 'https://brubaogg.com.br';

// autor das materias: assinatura "Por <autor>" no fim da pagina (perto das fontes), com a data, e o autor (Person) dos dados estruturados. O apoio de IA e dito ao lado ("Texto com apoio de IA").
export const AUTOR = 'Bruno Bem';
// foto do autor, no circulo ao lado de "Por <autor>" (96 x 96 px, quadrada, em assets/img/). Troque o arquivo para trocar a foto; "" (vazio) volta ao circulo com a inicial do nome.
export const AUTOR_FOTO = 'assets/img/autor-bruno-bem.webp';
// tempo de leitura mostrado no alto da materia (ao lado da categoria): palavras do resumo e do texto / palavras por minuto, arredondado para cima (minimo 1 minuto)
export const PALAVRAS_POR_MINUTO = 200;

// ---- Espacos de anuncio (ADS) ----
// CHAVE GERAL: false = os espacos ficam ESCONDIDOS (todo marcador sai com o atributo "hidden", a lista de cartoes nao leva data-ads-* e a pagina nao carrega ads.js: nada aparece,
// nada ocupa lugar e nada roda), mas o codigo, o CSS, o assets/js/ads.js e os testes continuam todos aqui. true = tudo volta a aparecer. Depois de mudar, rode: npm run gerar
// (o gerador liga ou desliga os marcadores em TODAS as paginas, inclusive nas escritas a mao). Quando o anuncio de verdade entrar, ele vai dentro do marcador.
export const ADS_ATIVOS = false;

// ---- Espacos de anuncio (ADS) nas listas de cartoes ----
// Por enquanto so o marcador "ADS" (o anuncio de verdade entra na v1.03). Nas listas das secoes o marcador entra ENTRE as linhas de cartoes: assets/js/ads.js mede quantos
// cartoes cabem por linha (muda com a largura da tela) e coloca o primeiro depois de "primeiro" linhas e os seguintes a cada "cada" linhas. O cartao destaque (o primeiro, de
// largura toda) conta como uma linha. Vale para a lista de sempre e para o resultado da busca/filtro da secao. Fora das listas (depois do filtro, da contagem do GTA 6,
// entre playlists...) os marcadores ficam fixos no HTML (adsHtml, em paginas.mjs).
export const ADS_NAS_LISTAS = { noticias: { primeiro: 3, cada: 2 }, reviews: { primeiro: 4, cada: 4 }, lancamentos: { primeiro: 2, cada: 2 } };

// ---- Ficha de veredito das reviews (campo "veredito" do JSON da materia; aparece no fecho da pagina, ao lado das fontes) ----
// nota: 0 a 10, em passos de 0,5 (obrigatoria). recomendacao: uma das chaves abaixo. preco, horas, plataforma e paraQuem: texto livre e opcionais (so aparece o que estiver preenchido).
// "fontes" (lista de { nome, url https }) aparece no fim de qualquer materia, em "Fontes".
export const RECOMENDACOES = { compre: 'Compre', 'espere-promocao': 'Espere uma promoção', 'so-com-amigos': 'Só com amigos', pule: 'Pule' };
export const LIMITE_DE_FONTES = 8; // acima disso so avisa (o leitor nao le uma lista enorme de fontes)
// "shorts" (lista de { id, titulo }) anexa Shorts a uma materia, em "Shorts desta review" (players verticais pequenos, com fachada). Acima do limite so avisa.
export const LIMITE_DE_SHORTS = 4;
// "assunto" (texto em minusculas, sem acento, com hifens; ex.: "god-of-war-laufey") liga materias do mesmo assunto: cada uma continua com a propria pagina e ganha o bloco "Mais sobre este assunto"
// (as outras, da mais nova para a mais velha); o "Veja tambem" nao repete as que ja estao nele. So aparece com 2 ou mais materias no mesmo assunto.

// ---- categorias com materias ----
export const categorias = [
  { pasta: 'noticias',    nome: 'Notícias',    rotulo: 'Notícia',    icone: 'newspaper', playlist: 'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb', desc: 'As notícias mais quentes do mundo dos games.', meta: 'As notícias mais quentes do mundo dos games, com vídeo e resumo em texto, direto do canal BRUBAOGG.' },
  { pasta: 'reviews',     nome: 'Reviews',     rotulo: 'Review',     icone: 'star', playlist: 'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp', desc: 'O Brubão joga e dá o veredito: vale a pena ou não?', meta: 'Reviews do Brubão: ele joga, conta o que achou e dá o veredito se o jogo vale a pena ou não.' },
  { pasta: 'lancamentos', nome: 'Lançamentos', rotulo: 'Lançamento', icone: 'rocket', playlist: 'PLLjQdJWDu4qk', desc: 'Os lançamentos de jogos que estão chegando.', meta: 'Os principais lançamentos de jogos de cada mês, em lista, direto do canal BRUBAOGG.' },
  // playlist "GTA 6 NOVIDADES": as matérias moram em /gta6-novidades/ e a lista e a pagina fixa gta6.html (nao e gerada, nao pode mudar de endereco).
  // tambemEm: toda materia desta categoria TAMBEM e uma noticia, entao aparece (com o rotulo "GTA 6") na lista e na mini-busca de Noticias e no bloco "Ultimas noticias" da home;
  // o endereco continua em /gta6-novidades/. A lista de destino so existe se a categoria de destino tem materia propria.
  { pasta: 'gta6-novidades', nome: 'GTA 6 Novidades', nomeCurto: 'GTA 6', rotulo: 'GTA 6', icone: 'tree-palm', playlist: 'PLYgWUqxV5Uao', lista: 'gta6.html', tambemEm: 'noticias', desc: 'As últimas novidades de GTA 6.' },
  // SERIES (as historias de cada jogo da serie, ex.: Resident Evil): vivem DENTRO da Wiki, nao tem aba propria. `aba` = a aba do menu a marcar nas paginas dela (a Wiki).
  // Nao tem `playlist`: nao vem do feed do YouTube, entao cada materia traz "categoria": "series" e "publicado" no proprio JSON. A lista e series.html (gerada);
  // a Wiki e a pagina da tag do jogo apontam para ela.
  { pasta: 'series', nome: 'Séries', nomeCurto: 'Séries', titulo: 'Séries: a história de cada jogo, capítulo por capítulo', rotulo: 'Série', icone: 'book-open', aba: 'wiki.html', desc: 'A história de cada jogo da série, capítulo por capítulo: personagens, enredo e o que liga um jogo ao outro. Tem spoilers.', meta: 'A história de cada jogo da série contada pelo Brubão, capítulo por capítulo, com personagens, enredo e spoilers. Começa pelo Resident Evil.' },
];
// abas do menu de categorias (as sem materia seguem como paginas de player)
// A ORDEM daqui e a ordem em todo lugar: faixa da home, menu lateral, rodape e botoes de categoria.
export const abas = [
  { href: 'gta6.html', nome: 'GTA 6', icone: 'tree-palm', pasta: null },
  { href: 'noticias.html', nome: 'Notícias', icone: 'newspaper', pasta: 'noticias' },
  { href: 'reviews.html', nome: 'Reviews', icone: 'star', pasta: 'reviews' },
  { href: 'lancamentos.html', nome: 'Lançamentos', icone: 'rocket', pasta: 'lancamentos' },
  { href: 'wiki.html', nome: 'Wiki', icone: 'book-open', pasta: null, dentro: 'wiki' }, // `dentro` = pasta de paginas que tambem marcam esta aba (wiki/<jogo>.html)
  { href: 'cortes.html', nome: 'Cortes', icone: 'scissors', pasta: null },
  { href: 'lives.html', nome: 'Lives', icone: 'radio', pasta: null },
];

export const SOCIAIS = [
  { nome: 'YouTube', icone: 'youtube', url: 'https://youtube.com/@brubaogg', handle: '@brubaogg' },
  { nome: 'TikTok', icone: 'tiktok', url: 'https://www.tiktok.com/@brubaogameplay', handle: '@brubaogameplay' },
  { nome: 'Instagram', icone: 'instagram', url: 'https://www.instagram.com/brubaogg', handle: '@brubaogg' },
  { nome: 'Twitch', icone: 'twitch', url: 'https://www.twitch.tv/brubaogg', handle: '@brubaogg' },
  { nome: 'Discord', icone: 'discord', url: 'https://discord.gg/tQkkXMqAnU', handle: 'Comunidade' },
];

// ---- GTA 6: a data de lancamento mora AQUI e so aqui. Contagem regressiva, textos, FAQ e descricao leem desta configuracao. ----
export const GTA6 = {
  alvo: '2026-11-19T00:00:00-03:00',     // lancamento: meia-noite no horario de Brasilia (alimenta a contagem regressiva)
  preload: '2026-11-12T12:00:00-03:00',  // inicio do pre-load
  plataformas: 'PlayStation 5 e Xbox Series X|S',
  plataformasCurto: 'PS5 e Xbox Series X|S',
  // Estado "LANCADO": a partir de `alvo` a contagem (home e gta6.html) da lugar a isto. ANTES da data nao aparece nada: o texto fica so em atributos data-lancado-* (o Google
  // nao le) e o assets/js/contador.js o monta na hora H, depois de conferir a hora do servidor. Se o site for gerado (npm run gerar) depois da data, o HTML ja sai assim.
  // O titulo vira "GTA VI <titulo>". {nome} = dados do GTA 6 (ex.: {gta6-data}, {gta6-plataformas-curto}). `botao` so aparece na home e leva para gta6.html.
  lancado: { kicker: 'Já disponível', titulo: 'já saiu!', texto: 'Lançado em {gta6-data} · {gta6-plataformas-curto}', botao: 'Ver as novidades' },
};

// ---- Cobertura em andamento: o lancamento que o canal cobre com exclusividade (abre a home com titulo, texto e as ultimas novidades). ----
// Quando o jogo sai, troque `ativa` para false (ou o jogo): a home deixa de abrir com ele e a pagina dele passa a ser parte do acervo.
// `texto` aceita os dados de GTA6 acima: {gta6-data}, {gta6-dia-mes}.
export const COBERTURA = {
  ativa: true,
  jogo: 'GTA 6',
  pagina: 'gta6.html',                // pagina do jogo (endereco protegido)
  categoria: 'gta6-novidades',        // de onde vem as novidades (mais as materias com a tag do jogo, como no hub)
  rotulo: 'Em cobertura',
  titulo: 'Cobertura do GTA 6',
  texto: 'Tudo o que se sabe sobre o GTA VI até o lançamento, em {gta6-dia-mes}: o que a Rockstar confirma, o que é vazamento e o que o Brubão acha de cada detalhe.',
  qtd: 4,                             // 1 cartao grande + (qtd - 1) pequenos (3)
  lado: 'esquerda',                   // onde fica o cartao grande: 'esquerda' ou 'direita' (as secoes da home alternam o lado; veja feedHtml em paginas.mjs)
};

// ---- Wiki (pagina wiki.html): um cartao por franquia, com a imagem do conteudo mais recente, os subtitulos e quantos conteudos o canal ja publicou sobre ela. ----
// `nome`/`tag` = a franquia (a tag dela em _conteudo/tags.json, se existir; o cartao leva para a pagina dela na Wiki, wiki/<tag>.html). `serie` = os JOGOS da franquia, NA ORDEM
// em que aparecem no menu lateral da Wiki: um slug de tag do tags.json ('resident-evil-4') ou { tag, nome } para um jogo que ainda nao tem materia nem tag (GTA 1). Um jogo sem
// conteudo aparece no menu mesmo assim (vazio). No menu cada jogo mostra o conteudo dele que NAO e noticia (hoje a historia; depois reviews, personagens...) e, no fim,
// "Notícias" junta as noticias da franquia inteira. Sem `serie`, valem as tags "filhas" (`"pai"` no tags.json) por nome. `pagina` (opcional) = pagina propria da franquia, no
// lugar de wiki/<tag>.html (o GTA usa gta6.html). `video` (opcional) = ID do video cuja miniatura vira a capa do cartao. `texto` (opcional) = frase que o cartao grande da home
// mostra a mais quando ha largura. `descricao` (opcional) = o texto de abertura da pagina da franquia e a descricao dela no Google. Para acrescentar uma franquia, um bloco aqui.
// A home mostra a primeira no cartao grande e as demais nos pequenos.
export const WIKI = {
  seriesQtd: 5,                       // quantas historias (categoria "series") a Wiki mostra abaixo dos jogos: 1 cartao grande + (seriesQtd - 1) pequenos
  // Tipos de conteudo da Wiki (campo "tipo" em _conteudo/materias/wiki/<arquivo>/<arquivo>.json): o nome aparece no cartao e na pagina do jogo. Para um tipo novo (ex.: "arma"), uma linha aqui.
  tipos: { historia: 'História', personagem: 'Personagem', guia: 'Guia', curiosidade: 'Curiosidade' },
  jogos: [
    {
      nome: 'Resident Evil', tag: 'resident-evil',
      texto: 'Reviews, histórias e notícias de toda a série, do Resident Evil 0 ao Village, reunidas num lugar só.',
      descricao: 'Resident Evil é a série de survival horror da Capcom que começou em 1996. Aqui estão a história de cada jogo contada pelo Brubão, os reviews e as notícias da franquia, do Resident Evil 0 ao Village.',
      serie: ['resident-evil-0', 'resident-evil-1-remake', 'resident-evil-2', 'resident-evil-2-remake', 'resident-evil-3', 'resident-evil-3-remake', 'resident-evil-veronica', 'resident-evil-4', 'resident-evil-4-remake', 'resident-evil-5', 'resident-evil-6', 'resident-evil-7', 'resident-evil-village', 'resident-evil-requiem'],
    },
    // O GTA: hoje so o GTA 6 tem conteudo (noticias). A pagina da franquia e wiki/gta.html (como a do Resident Evil); a pagina do GTA 6 (gta6.html, com a contagem) segue como esta e
    // a cobertura segue na home. Os outros jogos ja aparecem no menu, vazios, esperando conteudo (quando chegar, ponha a tag do jogo na materia: "GTA 5" vira gta-5).
    {
      nome: 'GTA', tag: 'gta',
      texto: 'Tudo o que se sabe sobre o GTA VI até o lançamento, em {gta6-dia-mes}: o que a Rockstar confirma e o que o Brubão acha.',
      descricao: 'GTA (Grand Theft Auto) é a série de mundo aberto da Rockstar Games. Aqui estão as novidades do GTA 6 e, aos poucos, a história de cada jogo da franquia contada pelo Brubão.',
      serie: [{ tag: 'gta-1', nome: 'GTA 1' }, { tag: 'gta-2', nome: 'GTA 2' }, { tag: 'gta-3', nome: 'GTA 3' }, { tag: 'gta-vice-city', nome: 'GTA Vice City' }, { tag: 'gta-san-andreas', nome: 'GTA San Andreas' }, { tag: 'gta-4', nome: 'GTA 4' }, { tag: 'gta-5', nome: 'GTA 5' }, 'gta-6'],
    },
  ],
};

// ---- Mini-busca de cada secao (Noticias, Reviews, Lancamentos e Wiki): um campo de busca acima da lista (assets/js/secao.js) ----
// GTA 6, Cortes e Lives nao tem. Reviews e Wiki tem tambem um MENU LATERAL, com os cartoes ao lado: `menu.filtro` diz o que vira item do menu (pl = plataforma principal do
// review, de veredito.plataforma no JSON; jogo = os jogos de WIKI.jogos, na ordem em que estao la: um jogo novo la entra no menu sozinho). Clicar num item mostra so o que
// e dele; "Todos"/"Todas" volta a lista de sempre. `ordem: true` poe "Ordenar por" (mais recentes / de A a Z) ao lado do campo. `um`/`varios` = o que e contado ("12 reviews").
// O texto digitado procura no titulo, no resumo, nas tags e no "assunto" da materia. Um item de plataforma so aparece com `minimo` materias; o menu mostra no maximo `maxItens`.
export const BUSCA_DA_SECAO = {
  maxItens: 12,
  minimo: 2,
  noticias: { um: 'notícia', varios: 'notícias', campo: 'Buscar nas notícias…' },
  reviews: { um: 'review', varios: 'reviews', campo: 'Buscar pelo nome do jogo…', menu: { filtro: 'pl', titulo: 'Plataforma', todos: 'Todas' }, ordem: true },
  lancamentos: { um: 'lançamento', varios: 'lançamentos', campo: 'Buscar jogo ou lista de lançamentos…' },
  wiki: { um: 'conteúdo', varios: 'conteúdos', campo: 'Buscar na Wiki: jogo, personagem, história…', menu: { filtro: 'jogo', titulo: 'Jogos', todos: 'Todos' } },
};

// ---- Carrossel do topo da home: as ultimas publicacoes do site, de qualquer uma das categorias abaixo (cortes e lives sao so paginas de player: nao entram). ----
// `categorias` sao as pastas de `categorias` (acima). Quando houver wiki, acrescente a pasta dela aqui.
// O banner mostra os ULTIMOS de cada tipo, intercalados (noticia, review, lancamento, noticia, review, lancamento): `qtd` de cada `grupo`. A noticia inclui as do GTA 6
// (gta6-novidades). Cada grupo e uma lista de pastas de `categorias`; a ordem dos grupos e a ordem em que aparecem.
export const CARROSSEL = {
  grupos: [
    { nome: 'noticias', categorias: ['gta6-novidades', 'noticias'], qtd: 2 },
    { nome: 'reviews', categorias: ['reviews'], qtd: 2 },
    { nome: 'lancamentos', categorias: ['lancamentos'], qtd: 2 },
  ],
  segundos: 8,                        // troca sozinho a cada tantos segundos (0 = so troca na mao; quem pede menos movimento no aparelho tambem nao ve a troca)
};

// ---- Paginas de player (cortes.html e lives.html): cada uma mostra as playlists abaixo, cada playlist com o player, o texto e a lista dos ultimos videos dela. ----
// A lista vem de assets/data/players.json (npm run videos, ou node _ferramentas/atualizar-videos.mjs --players). Playlist nova: uma linha aqui e rode o comando.
// O texto e o titulo sao seus (aparecem na pagina e no Google); cada video da lista abre no YouTube, dentro da playlist.
export const PLAYERS = {
  'cortes.html': [
    { playlist: 'PL44WUlM7naLXPfZoHsV5ejHXVweeCDZ22', titulo: 'Cortes da gameplay', texto: 'Os melhores momentos das gameplays.' },
    { playlist: 'PL44WUlM7naLWXStLdqekZuUAX9LVNtfBt', titulo: 'Dando Bala!', texto: 'Cortes de ação e tiro.' },
  ],
  'lives.html': [
    { playlist: 'PL44WUlM7naLVOZUdNnpOw0b4crbwtw75o', titulo: 'Lives do Brubão 2026', texto: 'As lives de 2026.' },
    { playlist: 'PL44WUlM7naLVPFPDvdxXuePJh7FWrhFRz', titulo: 'Lives do Brubão 2025', texto: 'As lives de 2025.' },
  ],
};
export const VIDEOS_POR_PLAYER = 6; // quantos videos aparecem na lista de cada playlist

// paginas fixas que tambem aparecem na busca. As paginas do MCP TikTok e do MCP YouTube (mcp-*, termos-*, privacidade-*) ficam de FORA de proposito: continuam no
// ar, no mesmo endereco, mas o site nao as mostra (nem no rodape nem na busca).
export const paginasFixasNaBusca = [
  ['gta6.html', 'GTA 6', 'Tudo sobre o GTA VI no canal e a contagem para o lançamento.'],
  ['lancamentos.html', 'Lançamentos', 'Os lançamentos de jogos que estão chegando.'],
  ['reviews.html', 'Reviews', 'O veredito do Brubão: vale a pena ou não?'],
  ['cortes.html', 'Cortes', 'Os melhores momentos das gameplays e das lives.'],
  ['noticias.html', 'Notícias', 'As notícias mais quentes do mundo dos games.'],
  ['lives.html', 'Lives', 'Todas as lives do Brubão.'],
  ['wiki.html', 'Wiki', 'Tudo o que o canal publicou sobre cada jogo, num lugar só.'],
  ['series.html', 'Séries', 'A história de cada jogo da série, capítulo por capítulo, com spoilers.'],
  ['sobre.html', 'Sobre e contato', 'Quem faz o BRUBAOGG, como as matérias são produzidas e como falar com o canal.'],
  ['termos.html', 'Termos de Serviço', 'Termos de Serviço do site.'],
  ['privacidade.html', 'Política de Privacidade', 'Política de Privacidade do site.'],
];

// ---- texto ficticio (lorem ipsum), so para pre-visualizar o layout com --rascunho ----
export const lorem = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
  'Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.',
  'Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam aliquam quaerat voluptatem.',
];
export const resumosLorem = [
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.',
  'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla.',
  'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium.',
];
