# Como publicar esta versão (blocos 0 a 8 da revisão v1.01)

Tudo já está copiado para o clone `C:\Users\bruno\Documents\GitHub\brubaogg-site` (sem commit e sem envio). O que falta é seu.

## 1. GitHub Desktop (commit e envio)
1. Abra o **GitHub Desktop** e escolha o repositório `brubaogg-site` (branch `main`).
2. Na aba **Changes** devem aparecer cerca de 265 arquivos: ~122 alterados, ~139 novos e **4 apagados** (`assets/data/busca.json`, `assets/data/ultimo-video.json`, `assets/js/ultimo-video.js`, `_ferramentas/cache/shorts-cache.json`; é o esperado). Confira que aparecem: `.github/workflows/publicar.yml`, `package.json`, `package-lock.json`, `assets/fonts/`, `arquivo.html`, `arquivo/`.
3. Se o GitHub Desktop avisar sobre "LF will be replaced by CRLF", pode ignorar (o `.gitattributes` novo normaliza).
4. Em **Summary** escreva, por exemplo: `Revisão v1.01 (blocos 0 a 8): busca, arquivo por mês, SEO, 37 matérias novas`. Clique **Commit to main** e depois **Push origin**.

## 2. No site do GitHub (uma vez só)
1. Abra o repositório em github.com > **Settings** > **Pages** > *Build and deployment* > **Source**: troque de "Deploy from a branch" para **GitHub Actions**.
2. Na mesma tela confira se **Custom domain** continua `brubaogg.com.br` (se estiver vazio, digite de novo) e se **Enforce HTTPS** está marcado.
3. Aba **Actions** > **Publicar site** > **Run workflow** (branch `main`). A primeira execução, disparada pelo envio, pode ter falhado no último passo por a Source ainda estar em "branch": é normal, basta rodar de novo. Leva uns 2 minutos e deve ficar com o ✓ verde nos dois blocos ("montar" e "publicar").

## 3. Conferir no ar (3 minutos, de preferência no celular)
- `https://brubaogg.com.br/`: home, contador, logo, fonte dos títulos.
- Busca: digite `gta6`, toque numa sugestão; abra `busca.html` e toque em **Ver mais**.
- `https://brubaogg.com.br/reviews.html`: 30 matérias e o botão **Ver mais** (a lista passou de 30).
- Uma matéria com Short (vire o celular) e `https://brubaogg.com.br/arquivo.html`.
- `https://brubaogg.com.br/privacidade.html`: o texto sem "Google Fonts".

## 4. Google Search Console
Reenvie `https://brubaogg.com.br/sitemap.xml`. Depois, em "Inspecionar URL", teste uma matéria ("Testar URL ao vivo") para ver os resultados de Artigo e Vídeo.

## Se algo der errado
- **Só a busca por texto falhou** ("Não foi possível carregar a busca"): a Source ainda está em "Deploy from a branch" ou o fluxo não rodou. Refaça o passo 2.
- **O fluxo ficou vermelho:** abra a execução na aba Actions, clique no passo que falhou e me mande o texto do erro.
- **Voltar atrás:** em *Settings > Pages > Source* escolha "Deploy from a branch" (`main`, pasta `/ (root)`): o site volta a publicar os arquivos como são (a busca por texto não acha nada, o resto funciona). Para desfazer o commit: GitHub Desktop > **History** > botão direito no commit > **Revert changes in commit** > Push.

## Depois
Os blocos 9 a 12 da revisão (acessibilidade, segurança e privacidade, publicação, fechamento) ficam para a versão 1.02. O plano está em `PLANO.md`.
