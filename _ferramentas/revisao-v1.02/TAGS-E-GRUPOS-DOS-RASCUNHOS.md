# Tags e grupos dos rascunhos da v1.02

Gerado em 11/10/2026 a partir de `_conteudo/rascunhos/` (206 rascunhos) e `_conteudo/materias/` (76 no ar), sem alterar nenhum deles. Serve à sessão do site e ao Bruno, para decidir o que depende dele.

## Resumo
- **144 tags** nos rascunhos (já contando as franquias que entram por `pai`). Nenhum rascunho passa do limite (3 tags; lançamentos até 8) e nenhuma tag aparece com duas grafias diferentes entre os rascunhos.
- Dos 206 rascunhos, **68 têm o mesmo ID de uma matéria no ar** (a nova só substitui a antiga se o Bruno aprovar a troca). As outras **8 matérias no ar não têm rascunho** e continuam como estão: `1zLVN4xwAdk`, `87DN_-QWjOk`, `8fnl6OufKH0`, `CT68uW4KT9I`, `ULddwDBbU8w`, `WIKBqiaE4m4`, `fdyf_JuMt3Q`, `wM5Xf8sydks`. A contagem abaixo usa o conjunto final (rascunhos + essas 8).
- Com as propostas deste arquivo, **38 tags ganham página própria** (2+ matérias, `descricao` ou `pagina` fixa) e **110 ficam só como rótulo** na matéria, sem página.
- **17 grupos de assunto** (campo `assunto`), de 2 a 6 matérias cada, somando 54 rascunhos.

### Correção importante
Eu havia dito que todas as tags precisavam ser cadastradas em `tags.json`. **Não precisam.** Lendo `_ferramentas/gerador/tags.mjs`: toda tag escrita num rascunho nasce sozinha a partir do nome (o endereço é o nome sem acento e com hífens). O `tags.json` só serve para: (1) unir grafias diferentes do mesmo assunto (`alias`), (2) fazer um jogo entrar também na franquia (`pai`), (3) fixar nome de exibição, descrição ou endereço (`nome`, `descricao`, `pagina`). Por isso o arquivo [tags-propostas.json](tags-propostas.json) traz só 21 entradas, não 140.

## Decisões
**Decidido pelo Bruno em 11/10/2026:**
1. **Tags de empresa, plataforma ou tema ficam.** O guia pede para evitar, salvo quando for o assunto central; nestes casos a tag é o assunto da matéria e quase sempre a única dela. Lista: PlayStation (9 matérias), Game Pass (4), Nintendo, NVIDIA, Riot Games, Epic Games, Toei Games, Xbox 360, PlayStation 3/5/6, Memória RAM, GTA RP, FalleN, Senua.
2. **PlayStation 3, 5 e 6 entram como filhas de PlayStation** (`pai`), consequência da decisão 1: cada uma tem 1 matéria e todas aparecem também na página PlayStation. Já estão no `tags-propostas.json`.

**Em aberto:**
3. **Franquia Assassin's Creed.** Há 3 tags de jogos (Hexe, Shadows, Black Flag Resynced) e nenhuma de franquia. Para criar a página geral seria preciso alterar a entrada `assassin-s-creed-black-flag` (que já existe) e criar `assassin-s-creed`. Não mexi:
```json
{
  "assassin-s-creed": {
    "nome": "Assassin's Creed"
  },
  "assassin-s-creed-black-flag": {
    "nome": "Assassin's Creed Black Flag",
    "pai": "assassin-s-creed"
  },
  "assassin-s-creed-hexe": {
    "nome": "Assassin's Creed Hexe",
    "pai": "assassin-s-creed"
  },
  "assassin-s-creed-shadows": {
    "nome": "Assassin's Creed Shadows",
    "pai": "assassin-s-creed"
  }
}
```
4. **Nome de Mortal Shell II.** A matéria no ar usa `Mortal Shell II` e o rascunho usa `Mortal Shell 2`. É o mesmo vídeo, então a nova ocupa o lugar da antiga se for aprovada, mas deixei o `alias` nas propostas: as duas grafias caem na mesma tag, com o nome oficial (algarismo romano).
5. **Tags que ficaram como estão:** `Tartarugas Ninja` (a matéria é sobre TMNT: The Last Ronin; diga se prefere o nome do jogo), `O Senhor dos Anéis`, `Digimon`, `171`, `OD`, `Samson`.

## O que vai em `tags.json` (arquivo [tags-propostas.json](tags-propostas.json))
Entradas seguras, para mesclar em `_conteudo/tags.json`. Nenhuma remove nem altera as 20 que já existem.

| Tag | Nome exibido | Efeito |
|---|---|---|
| `resident-evil-0` | Resident Evil 0 | entra também em `resident-evil` |
| `resident-evil-2` | Resident Evil 2 | entra também em `resident-evil` |
| `resident-evil-2-remake` | Resident Evil 2 Remake | entra também em `resident-evil` |
| `resident-evil-3` | Resident Evil 3 | entra também em `resident-evil` |
| `resident-evil-3-remake` | Resident Evil 3 Remake | entra também em `resident-evil` |
| `resident-evil-4` | Resident Evil 4 | entra também em `resident-evil` |
| `resident-evil-4-remake` | Resident Evil 4 Remake | entra também em `resident-evil` |
| `resident-evil-5` | Resident Evil 5 | entra também em `resident-evil` |
| `resident-evil-requiem` | Resident Evil Requiem | entra também em `resident-evil` |
| `resident-evil-veronica` | Resident Evil Veronica | entra também em `resident-evil` |
| `resident-evil-remake` | Resident Evil Remake | entra também em `resident-evil`; une a grafia “Resident Evil 1 Remake” |
| `call-of-duty` | Call of Duty | fixa o nome de exibição |
| `call-of-duty-modern-warfare-4` | Call of Duty: Modern Warfare 4 | entra também em `call-of-duty` |
| `ghostrunner` | Ghostrunner | fixa o nome de exibição |
| `ghostrunner-2` | Ghostrunner 2 | entra também em `ghostrunner` |
| `alan-wake-remastered` | Alan Wake Remastered | entra também em `alan-wake` |
| `mortal-shell-ii` | Mortal Shell II | une a grafia “Mortal Shell 2” |
| `playstation` | PlayStation | fixa o nome de exibição |
| `playstation-3` | PlayStation 3 | entra também em `playstation` |
| `playstation-5` | PlayStation 5 | entra também em `playstation` |
| `playstation-6` | PlayStation 6 | entra também em `playstation` |

As franquias que já estavam no arquivo (Resident Evil, God of War, Control, Alan Wake, Minecraft, Silent Hill, The Witcher 3, Assassin's Creed Black Flag, GTA 6) continuam valendo; `gta-6` aponta para `gta6.html`.

## Grupos de assunto (`assunto`)
O campo `assunto` é o endereço-curto do tema. Conferi no código: o gerador atual ainda **não lê** esse campo (nem o `fontes`), e isso precisa ser implementado na sessão do site. A ideia é mostrar, em cada matéria do grupo, “Outras matérias sobre este assunto” em ordem de data. As listas abaixo já estão em ordem cronológica.

### God of War Laufey — `god-of-war-laufey` (6)
- 07/06/2026 · `UcxGIlCNxRo` · God of War Laufey é revelado no State of Play de 2 de junho
- 26/06/2026 · `bq9hSaIb-QM` · God of War Laufey: fãs especulam volta de deuses mortos
- 28/06/2026 · `9iC_q8YSfUc` · God of War Laufey estava nos planos desde 2018, diz atriz
- 30/09/2026 · `RaF6cnHlAFc` · God of War Laufey: pré-venda custa R$ 399,90 no Brasil
- 05/10/2026 · `Hjj_6fVgvKw` · Faye será a protagonista de God of War Laufey
- 06/10/2026 · `7XZuurjrUOM` · Phranque e Rue: os novos companheiros de Faye em God of War

### GTA 6: preço e pré-venda — `gta6-preco-e-pre-venda` (6)
- 19/05/2026 · `E1d6cBcOD4M` · GTA 6: vazamento da Best Buy citava 18 a 21 de maio
- 01/07/2026 · `3GujCeHrziI` · GTA 6 Ultimate Edition: o que vem na versão mais cara
- 02/07/2026 · `TGfJiJZEsGo` · GTA 6 custa R$ 449,90 no Brasil na pré-venda
- 03/07/2026 · `7syuziX0x6M` · GTA 6: Sony veste o PS5 de Vice City na pré-venda
- 05/07/2026 · `eYlKXoJ8YXw` · GTA 6: pré-venda no PS5 supera o Xbox, diz levantamento
- 27/09/2026 · `fC69eu4pLe4` · GTA 6: edição de colecionador de US$ 400 não traz o jogo

### DLSS 5 e IA nos jogos — `dlss-5` (4)
- 25/03/2026 · `rAf0v9un9vs` · DLSS 5 causa caos e memes: minha opinião
- 26/03/2026 · `Pg34yPwyPpM` · Jensen Huang defende o DLSS 5: não é um filtro
- 27/03/2026 · `9nqhFGn04Lc` · ARC Raiders troca vozes de IA por atores de verdade
- 14/09/2026 · `_uSiyGzIBFE` · DLSS 5 não oficial em mods: o que se sabe e os riscos

### Fable e o adiamento para 2027 — `fable-adiamento` (4)
- 23/04/2026 · `d83P2AVqKFQ` · Blizzard ajuda nas cinemáticas de Fable, diz Matt Booty
- 31/05/2026 · `F4IG0wwMzTA` · Fable ainda dizia que enfrentaria o GTA 6 em 2026
- 04/06/2026 · `Okw6Z4QZ-oM` · Fable é adiado para 23 de fevereiro de 2027
- 25/06/2026 · `9wqhZhhV6u0` · Fable ganha 30 minutos de gameplay focados em NPCs

### O fim da mídia física da Sony — `fim-da-midia-fisica` (4)
- 10/07/2026 · `l13qRc6Q5xQ` · Sony vai acabar com discos de jogos novos em janeiro de 2028
- 13/07/2026 · `qmXh2OZKTbo` · Fim do disco: o que muda no preço e no PS6, para mim
- 21/09/2026 · `YeivhUNq4MY` · PlayStation Blackout não teve impacto medido, diz Circana
- 04/10/2026 · `-tOgB2biuSc` · Fim do disco: GTA 6 com código e a Sony ouvindo críticas

### GTA 6: animais — `gta6-animais` (4)
- 01/10/2026 · `wJEbXgBpNlk` · GTA 6: com 170 animais, ainda não se sabe se terá pets
- 02/10/2026 · `VxQk-NVCbBk` · GTA 6: o fundo do mar ainda é uma incógnita
- 05/10/2026 · `RlcOEz__i8A` · GTA 6: jacaré, flamingo e peixe-boi estão entre os animais
- 07/10/2026 · `Bcd5qeSghAA` · GTA 6 terá 170 espécies de animais; RDR2 tem cerca de 200

### Assassin's Creed Black Flag Resynced — `assassins-creed-black-flag-resynced` (3)
- 06/05/2026 · `jE5ihcstBKs` · Assassin's Creed Black Flag Resynced: data e preço no Brasil
- 20/07/2026 · `F7Upfis9jLc` · Black Flag Resynced: nota 84, bugs e microtransações
- 10/09/2026 · `hcl0UIWG-5o` · Black Flag Resynced no Switch 2: o que o vazamento mostra

### Control Resonant — `control-resonant` (3)
- 18/04/2026 · `TFPNLu9wCGs` · Control Resonant terá dublagem e legendas em português
- 06/06/2026 · `Yp7sLc8Xw6M` · Control Resonant chegou em 24 de setembro com Dylan Faden
- 09/06/2026 · `jEN9FAI5vK0` · Control Resonant: PS Store brasileira corrige o preço

### Game Pass: preço — `game-pass-preco` (3)
- 02/04/2026 · `RYdWvAWrhkI` · Game Pass mais barato e parceria com a Netflix: o rumor
- 04/05/2026 · `iux0_uqLOgk` · Game Pass fica mais barato no Brasil: Ultimate a R$ 76,90
- 03/06/2026 · `nNuvQ0G83ro` · CEO do Xbox diz que o corte de preço do Game Pass funcionou

### GTA 6: celular e apps — `gta6-celular` (3)
- 04/10/2026 · `jqUHFimgonE` · GTA 6: roubo de carros ganha app de celular e rastreadores
- 07/10/2026 · `L5v7o2vjzKw` · GTA 6 terá app de carona e sátira do Instagram
- 08/10/2026 · `nmw4iMidUUk` · GTA 6: do celular de GTA 5 aos apps WAiNK e RydeMe

### Filme de Call of Duty — `call-of-duty-filme` (2)
- 22/04/2026 · `dqMHMZRPkCw` · Filme de Call of Duty tem data: 30 de junho de 2028
- 28/04/2026 · `kukSF2fjcJQ` · Call of Duty: filme ganha teaser no CinemaCon

### Call of Duty sem PS4 — `call-of-duty-fim-do-ps4` (2)
- 15/05/2026 · `fLZvU_e1uco` · Call of Duty: Modern Warfare 4 não sai para PS4
- 02/06/2026 · `0e8u7h6UCtU` · Warzone deixa de funcionar no PS4 e no Xbox One em 2026

### GTA 6: atividades secundárias — `gta6-atividades-secundarias` (2)
- 13/09/2026 · `Set8fTo0DLY` · GTA 6: lista de atividades já supera a de GTA 5
- 06/10/2026 · `xI4qEFLfiPA` · GTA 6: Rockstar confirma atividades de sinuca a jet ski

### Phantom Blade Zero — `phantom-blade-zero` (2)
- 04/05/2026 · `JpLRHPA7OKw` · Phantom Blade Zero no Gamescom Latam: demo é muito difícil
- 08/06/2026 · `-IprdutP1Ro` · Phantom Blade Zero é adiado para 29 de outubro

### Pragmata — `pragmata` (2)
- 13/04/2026 · `UBuZSUqWXGk` · Pragmata terá dublagem em português brasileiro
- 03/05/2026 · `oG1tfPJFX9c` · Pragmata: o efeito Diana e as vendas de 2 milhões

### Filme de Resident Evil (Zach Cregger) — `resident-evil-filme` (2)
- 24/04/2026 · `SzcwFU-HRoA` · Resident Evil de Cregger agrada em exibições-teste
- 22/09/2026 · `nerCxj5lqMY` · Resident Evil de Zach Cregger tem 80 no Metacritic

### Samson — `samson` (2)
- 17/04/2026 · `O8OGWxMPrWI` · Samson estreia com notas baixas no Metacritic
- 30/04/2026 · `aeMLmyKkrKs` · Samson terá atualizações e versão para consoles

## Tabela de todas as tags
“Rascunhos” = quantos rascunhos usam a tag (já contando as que entram pelo `pai`). “No ar” = matérias atuais sem rascunho que usam a tag. Página = tem 2+ matérias, descrição ou endereço fixo.

| Tag | Endereço | Rascunhos | No ar | Total | Página | Observação |
|---|---|---:|---:|---:|:-:|---|
| GTA 6 | `gta-6` | 26 | 0 | 26 | sim | já no tags.json |
| Resident Evil | `resident-evil` | 17 | 4 | 21 | sim | já no tags.json |
| PlayStation | `playstation` | 12 | 0 | 12 | sim | mantida (decidido): plataforma/empresa, assunto central das 9 matérias; proposta: nome |
| God of War | `god-of-war` | 7 | 0 | 7 | sim | já no tags.json |
| God of War Laufey | `god-of-war-laufey` | 7 | 0 | 7 | sim | já no tags.json |
| Call of Duty | `call-of-duty` | 6 | 0 | 6 | sim | proposta: nome |
| Assassin's Creed Black Flag | `assassin-s-creed-black-flag` | 4 | 1 | 5 | sim | já no tags.json |
| Assassin's Creed Black Flag Resynced | `assassin-s-creed-black-flag-resynced` | 4 | 1 | 5 | sim | já no tags.json |
| Control | `control` | 5 | 0 | 5 | sim | já no tags.json |
| Control Resonant | `control-resonant` | 4 | 0 | 4 | sim | já no tags.json |
| Fable | `fable` | 4 | 0 | 4 | sim |  |
| Game Pass | `game-pass` | 4 | 0 | 4 | sim | mantida (decidido): serviço, central nas 4 matérias |
| Resident Evil 6 | `resident-evil-6` | 2 | 2 | 4 | sim | já no tags.json |
| Cyberpunk 2077 | `cyberpunk-2077` | 3 | 0 | 3 | sim |  |
| DLSS 5 | `dlss-5` | 3 | 0 | 3 | sim |  |
| Fortnite | `fortnite` | 3 | 0 | 3 | sim |  |
| Phantom Blade Zero | `phantom-blade-zero` | 3 | 0 | 3 | sim |  |
| Pragmata | `pragmata` | 3 | 0 | 3 | sim |  |
| The Blood of Dawnwalker | `the-blood-of-dawnwalker` | 3 | 0 | 3 | sim |  |
| AI Limit | `ai-limit` | 2 | 0 | 2 | sim |  |
| Alan Wake | `alan-wake` | 2 | 0 | 2 | sim | já no tags.json |
| ARC Raiders | `arc-raiders` | 2 | 0 | 2 | sim |  |
| Clair Obscur: Expedition 33 | `clair-obscur-expedition-33` | 2 | 0 | 2 | sim |  |
| Elden Ring | `elden-ring` | 2 | 0 | 2 | sim |  |
| Final Fantasy VII Revelation | `final-fantasy-vii-revelation` | 2 | 0 | 2 | sim |  |
| Ghostrunner | `ghostrunner` | 2 | 0 | 2 | sim | proposta: nome |
| INSIDE | `inside` | 1 | 1 | 2 | sim |  |
| Marvel's Wolverine | `marvel-s-wolverine` | 2 | 0 | 2 | sim |  |
| Minecraft | `minecraft` | 2 | 0 | 2 | sim | já no tags.json |
| Resident Evil Veronica | `resident-evil-veronica` | 2 | 0 | 2 | sim | proposta: pai resident-evil |
| Samson | `samson` | 2 | 0 | 2 | sim |  |
| Silent Hill | `silent-hill` | 2 | 0 | 2 | sim | já no tags.json |
| State of Decay 3 | `state-of-decay-3` | 2 | 0 | 2 | sim |  |
| Stellar Blade | `stellar-blade` | 2 | 0 | 2 | sim |  |
| Storebound | `storebound` | 1 | 1 | 2 | sim |  |
| Subnautica 2 | `subnautica-2` | 2 | 0 | 2 | sim |  |
| Teamfight Tactics | `teamfight-tactics` | 2 | 0 | 2 | sim |  |
| The First Berserker: Khazan | `the-first-berserker-khazan` | 2 | 0 | 2 | sim |  |
| 007 First Light | `007-first-light` | 1 | 0 | 1 | — |  |
| 1666: Amsterdam | `1666-amsterdam` | 1 | 0 | 1 | — |  |
| 171 | `171` | 1 | 0 | 1 | — |  |
| A.I.L.A | `a-i-l-a` | 1 | 0 | 1 | — |  |
| Alan Wake 2 | `alan-wake-2` | 1 | 0 | 1 | — | já no tags.json |
| Alan Wake Remastered | `alan-wake-remastered` | 1 | 0 | 1 | — | proposta: pai alan-wake |
| Assassin's Creed Hexe | `assassin-s-creed-hexe` | 1 | 0 | 1 | — |  |
| Assassin's Creed IV: Black Flag | `assassin-s-creed-iv-black-flag` | 0 | 1 | 1 | — | já no tags.json |
| Assassin's Creed Shadows | `assassin-s-creed-shadows` | 1 | 0 | 1 | — |  |
| Astro Bot | `astro-bot` | 1 | 0 | 1 | — |  |
| Astro's Playroom | `astro-s-playroom` | 1 | 0 | 1 | — |  |
| Battlefield 6 | `battlefield-6` | 1 | 0 | 1 | — |  |
| Black Myth: Wukong | `black-myth-wukong` | 1 | 0 | 1 | — |  |
| BLACK: Extraction Raiders | `black-extraction-raiders` | 1 | 0 | 1 | — |  |
| Bloodborne | `bloodborne` | 1 | 0 | 1 | — |  |
| Call of Duty: Modern Warfare 4 | `call-of-duty-modern-warfare-4` | 1 | 0 | 1 | — | proposta: pai call-of-duty |
| Caravan SandWitch | `caravan-sandwitch` | 1 | 0 | 1 | — |  |
| Counter-Strike 2 | `counter-strike-2` | 1 | 0 | 1 | — |  |
| Crimson Desert | `crimson-desert` | 1 | 0 | 1 | — |  |
| Cyberpunk: Edgerunners 2 | `cyberpunk-edgerunners-2` | 1 | 0 | 1 | — |  |
| D-topia | `d-topia` | 1 | 0 | 1 | — |  |
| Darksiders | `darksiders` | 1 | 0 | 1 | — |  |
| Dave the Diver | `dave-the-diver` | 1 | 0 | 1 | — |  |
| Dead Island 2 | `dead-island-2` | 1 | 0 | 1 | — |  |
| Death Stranding 2 | `death-stranding-2` | 1 | 0 | 1 | — |  |
| Diablo 5 | `diablo-5` | 1 | 0 | 1 | — |  |
| Digimon | `digimon` | 1 | 0 | 1 | — |  |
| Dishonored: Death of the Outsider | `dishonored-death-of-the-outsider` | 1 | 0 | 1 | — |  |
| EA Sports UFC 6 | `ea-sports-ufc-6` | 1 | 0 | 1 | — |  |
| Echo Weaver | `echo-weaver` | 1 | 0 | 1 | — |  |
| Epic Games | `epic-games` | 1 | 0 | 1 | — | mantida (decidido): empresa, central na matéria |
| FalleN | `fallen` | 1 | 0 | 1 | — | mantida (decidido): pessoa, central na matéria |
| Forza Horizon 6 | `forza-horizon-6` | 1 | 0 | 1 | — |  |
| Garten of Banban | `garten-of-banban` | 1 | 0 | 1 | — |  |
| Gears of War: E-Day | `gears-of-war-e-day` | 1 | 0 | 1 | — |  |
| gen ATLAS | `gen-atlas` | 1 | 0 | 1 | — |  |
| Ghostrunner 2 | `ghostrunner-2` | 1 | 0 | 1 | — | proposta: pai ghostrunner |
| Gothic 1 Remake | `gothic-1-remake` | 1 | 0 | 1 | — |  |
| GTA RP | `gta-rp` | 1 | 0 | 1 | — | mantida (decidido): tema, central na matéria |
| Guild Wars 3 | `guild-wars-3` | 1 | 0 | 1 | — |  |
| Guns of Eschaton | `guns-of-eschaton` | 1 | 0 | 1 | — |  |
| Hell Let Loose: Vietnam | `hell-let-loose-vietnam` | 1 | 0 | 1 | — |  |
| Helldivers 2 | `helldivers-2` | 1 | 0 | 1 | — |  |
| Hytale | `hytale` | 1 | 0 | 1 | — |  |
| Invokyr | `invokyr` | 1 | 0 | 1 | — |  |
| inZOI | `inzoi` | 1 | 0 | 1 | — |  |
| Kena: Bridge of Spirits | `kena-bridge-of-spirits` | 1 | 0 | 1 | — |  |
| Kingdom Hearts 4 | `kingdom-hearts-4` | 1 | 0 | 1 | — |  |
| Lies of P 2 | `lies-of-p-2` | 1 | 0 | 1 | — |  |
| Mafia: Definitive Edition | `mafia-definitive-edition` | 1 | 0 | 1 | — |  |
| Meccha Chameleon | `meccha-chameleon` | 1 | 0 | 1 | — |  |
| Memória RAM | `memoria-ram` | 1 | 0 | 1 | — | mantida (decidido): tema (não é jogo), central na matéria |
| MindsEye | `mindseye` | 1 | 0 | 1 | — |  |
| Mortal Shell II | `mortal-shell-ii` | 1 | 0 | 1 | — | proposta: alias Mortal Shell 2 |
| Nintendo | `nintendo` | 1 | 0 | 1 | — | mantida (decidido): empresa, central na matéria |
| NVIDIA | `nvidia` | 1 | 0 | 1 | — | mantida (decidido): empresa, central na matéria |
| O Senhor dos Anéis | `o-senhor-dos-aneis` | 1 | 0 | 1 | — |  |
| OD | `od` | 1 | 0 | 1 | — |  |
| Onimusha: Way of the Sword | `onimusha-way-of-the-sword` | 1 | 0 | 1 | — |  |
| Palworld | `palworld` | 1 | 0 | 1 | — |  |
| Paperhead | `paperhead` | 1 | 0 | 1 | — |  |
| Paralives | `paralives` | 1 | 0 | 1 | — |  |
| Parasite Z | `parasite-z` | 1 | 0 | 1 | — |  |
| Phasmophobia | `phasmophobia` | 1 | 0 | 1 | — |  |
| Physint | `physint` | 1 | 0 | 1 | — |  |
| PlayStation 3 | `playstation-3` | 1 | 0 | 1 | — | mantida (decidido): plataforma, central na matéria; proposta: pai playstation |
| PlayStation 5 | `playstation-5` | 1 | 0 | 1 | — | mantida (decidido): plataforma, central na matéria; proposta: pai playstation |
| PlayStation 6 | `playstation-6` | 1 | 0 | 1 | — | mantida (decidido): plataforma, central na matéria; proposta: pai playstation |
| Poppy Playtime | `poppy-playtime` | 1 | 0 | 1 | — |  |
| Ragnarok Online | `ragnarok-online` | 1 | 0 | 1 | — |  |
| Resident Evil 0 | `resident-evil-0` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 2 | `resident-evil-2` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 2 Remake | `resident-evil-2-remake` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 3 | `resident-evil-3` | 0 | 1 | 1 | — | proposta: pai resident-evil |
| Resident Evil 3 Remake | `resident-evil-3-remake` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 4 | `resident-evil-4` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 4 Remake | `resident-evil-4-remake` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil 5 | `resident-evil-5` | 0 | 1 | 1 | — | proposta: pai resident-evil |
| Resident Evil 7 | `resident-evil-7` | 1 | 0 | 1 | — | já no tags.json |
| Resident Evil Remake | `resident-evil-remake` | 1 | 0 | 1 | — | proposta: pai resident-evil + alias Resident Evil 1 Remake |
| Resident Evil Requiem | `resident-evil-requiem` | 1 | 0 | 1 | — | proposta: pai resident-evil |
| Resident Evil Village | `resident-evil-village` | 1 | 0 | 1 | — | já no tags.json |
| Riot Games | `riot-games` | 1 | 0 | 1 | — | mantida (decidido): empresa, central na matéria |
| Roblox | `roblox` | 1 | 0 | 1 | — |  |
| Senua | `senua` | 1 | 0 | 1 | — | mantida (decidido): personagem/jogo da Ninja Theory, central |
| Shift at Midnight | `shift-at-midnight` | 0 | 1 | 1 | — |  |
| Silent Hill: Townfall | `silent-hill-townfall` | 1 | 0 | 1 | — | já no tags.json |
| SiN: Reloaded | `sin-reloaded` | 1 | 0 | 1 | — |  |
| Slime Rancher | `slime-rancher` | 1 | 0 | 1 | — |  |
| South of Midnight | `south-of-midnight` | 1 | 0 | 1 | — |  |
| Splatoon Raiders | `splatoon-raiders` | 1 | 0 | 1 | — |  |
| Split Fiction | `split-fiction` | 1 | 0 | 1 | — |  |
| Star Fox | `star-fox` | 1 | 0 | 1 | — |  |
| Star Wars Outlaws | `star-wars-outlaws` | 1 | 0 | 1 | — |  |
| Star Wars: Zero Company | `star-wars-zero-company` | 1 | 0 | 1 | — |  |
| StarCraft | `starcraft` | 1 | 0 | 1 | — |  |
| Streamer Life Simulator 2 | `streamer-life-simulator-2` | 1 | 0 | 1 | — |  |
| Tartarugas Ninja | `tartarugas-ninja` | 1 | 0 | 1 | — |  |
| The Baby in Yellow | `the-baby-in-yellow` | 1 | 0 | 1 | — |  |
| The Division Resurgence | `the-division-resurgence` | 1 | 0 | 1 | — |  |
| The Duskbloods | `the-duskbloods` | 1 | 0 | 1 | — |  |
| The Last of Us | `the-last-of-us` | 1 | 0 | 1 | — |  |
| The Legend of Zelda: Ocarina of Time Remake | `the-legend-of-zelda-ocarina-of-time-remake` | 1 | 0 | 1 | — |  |
| The Plucky Squire | `the-plucky-squire` | 1 | 0 | 1 | — |  |
| The Witcher 3 | `the-witcher-3` | 1 | 0 | 1 | — | já no tags.json |
| The Witcher 3 Remastered | `the-witcher-3-remastered` | 1 | 0 | 1 | — | já no tags.json |
| The Wolf Among Us 2 | `the-wolf-among-us-2` | 1 | 0 | 1 | — |  |
| Toei Games | `toei-games` | 1 | 0 | 1 | — | mantida (decidido): empresa, central na matéria |
| World of Warcraft | `world-of-warcraft` | 1 | 0 | 1 | — |  |
| Xbox 360 | `xbox-360` | 1 | 0 | 1 | — | mantida (decidido): plataforma, central na matéria |

## Para a sessão do site
- O gerador precisa aceitar e usar `assunto` e `fontes`, aceitar `historia` sem `veredito` e ignorar a pasta `rascunhos/` na publicação.
- `tags-propostas.json` deve ser mesclado ao `tags.json`; nada além disso é necessário para as tags funcionarem.
- Depois da mesclagem, rodar o gerador e conferir se `resident-evil`, `call-of-duty`, `playstation` e `gta-6` somam o esperado.
