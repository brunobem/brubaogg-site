// Configuracao UNICA do site. Usada pelo gerador e pelos outros scripts (atualizar, pendentes, nova, aprovar).
// Para mudar categorias, abas, redes sociais ou o autor, e so aqui.

export const DOMINIO = 'https://brubaogg.com.br';

// autor das materias (assinatura exibida na pagina; o selo "IA" deixa claro que e uma inteligencia artificial)
export const AUTOR = 'Claudio';

// ---- categorias com materias ----
export const categorias = [
  { pasta: 'noticias',    nome: 'Notícias',    rotulo: 'Notícia',    icone: 'newspaper', playlist: 'PL44WUlM7naLV5Ypnm6UslXWoD5JvUWWgb', desc: 'As notícias mais quentes do mundo dos games.', meta: 'As notícias mais quentes do mundo dos games, com vídeo e resumo em texto, direto do canal BRUBAOGG.' },
  { pasta: 'reviews',     nome: 'Reviews',     rotulo: 'Review',     icone: 'star', playlist: 'PL44WUlM7naLUWOwjOwJco-tovC9JrjYbp', desc: 'O Brubão joga e dá o veredito: vale a pena ou não?', meta: 'Reviews do Brubão: ele joga, conta o que achou e dá o veredito se o jogo vale a pena ou não.' },
  { pasta: 'lancamentos', nome: 'Lançamentos', rotulo: 'Lançamento', icone: 'rocket', playlist: 'PLLjQdJWDu4qk', desc: 'Os lançamentos de jogos que estão chegando.', meta: 'Os principais lançamentos de jogos de cada mês, em lista, direto do canal BRUBAOGG.' },
  // playlist "GTA 6 NOVIDADES": as matérias moram em /gta6-novidades/ e a lista e a pagina fixa gta6.html (nao e gerada, nao pode mudar de endereco)
  { pasta: 'gta6-novidades', nome: 'GTA 6 Novidades', nomeCurto: 'GTA 6', rotulo: 'GTA 6', icone: 'tree-palm', playlist: 'PLYgWUqxV5Uao', lista: 'gta6.html', relacionados: 'Mais novidades de GTA 6', desc: 'As últimas novidades de GTA 6.' },
];
// abas do menu de categorias (as sem materia seguem como paginas de player)
export const abas = [
  { href: 'gta6.html', nome: 'GTA 6', icone: 'tree-palm', pasta: null },
  { href: 'lancamentos.html', nome: 'Lançamentos', icone: 'rocket', pasta: 'lancamentos' },
  { href: 'reviews.html', nome: 'Reviews', icone: 'star', pasta: 'reviews' },
  { href: 'cortes.html', nome: 'Cortes', icone: 'scissors', pasta: null },
  { href: 'noticias.html', nome: 'Notícias', icone: 'newspaper', pasta: 'noticias' },
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
};

// paginas fixas que tambem aparecem na busca
export const paginasFixasNaBusca = [
  ['gta6.html', 'GTA 6', 'Tudo sobre o GTA VI no canal e a contagem para o lançamento.'],
  ['lancamentos.html', 'Lançamentos', 'Os lançamentos de jogos que estão chegando.'],
  ['reviews.html', 'Reviews', 'O veredito do Brubão: vale a pena ou não?'],
  ['cortes.html', 'Cortes', 'Os melhores momentos das gameplays e das lives.'],
  ['noticias.html', 'Notícias', 'As notícias mais quentes do mundo dos games.'],
  ['lives.html', 'Lives', 'Todas as lives do Brubão.'],
  ['mcp-tiktok.html', 'MCP TikTok', 'Termos e privacidade do MCP TikTok.'],
  ['mcp-youtube.html', 'MCP YouTube', 'Termos e privacidade do MCP YouTube.'],
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
