# CleanTV — fork pessoal do CleanFrame

Documento técnico para quem (pessoa ou agente) continuar o trabalho no branch
`cleantv`. Complementa — não substitui — `AGENTS.md`, `docs/development.md`,
`docs/interaction-behaviour.md` e `docs/assets.md`. Dados privados (IP da TV,
perfil de assinatura, procedimento de instalação no aparelho) ficam em
`.local/HANDOFF.md`, que é ignorado pelo git.

## 1. Contexto

- **Upstream:** `nthnclrk/CleanFrame` (remote `upstream`), feito para Samsung The Frame.
- **Fork:** `rubinhos/CleanFrame` (remote `origin`). Todo o trabalho fica no branch
  **`cleantv`**; `main` acompanha o upstream e não recebe as personalizações.
- **TV alvo:** Samsung UN58TU7020 (Crystal UHD 2020, **não** é uma Frame), Tizen 5.5,
  ARMv7. Não tem Art Mode. Consequências: o controle "Art Mode" foi trocado por
  "TV settings", e qualquer suposição do upstream sobre a Frame deve ser revista.
- **Nome exibido:** `CleanTV` (`app/config.xml` → `<name>`).
- **Base:** upstream 0.7.0 (`845f332`). Commits do fork:
  - `6f2dd16` CleanTV: personalização para a UN58TU7020 (grade, fontes de entrada, clima, i18n…)
  - `3f0b86f` Tradução de "Both" e dos nomes de papéis de parede; novo ícone do launcher

O id em `app/config.xml` continua `nClrkHome1.FrameHome` **de propósito** (guardas de
identidade do código-fonte). O `scripts/package.py` reescreve o manifesto com a
identidade de `.local/signing.json` no momento do empacotamento. Não edite o id no XML.

## 2. Mapa de arquivos alterados

| Arquivo | O que mudou |
| --- | --- |
| `app/main.js` | Grade de 2 linhas, barra de fontes, clima, ordenação, ícones de entradas, i18n, controles do topo |
| `app/device.js` | `sources(done, withTv)`, `setSource(port, done, type)`, `hasApp(id)`, settings via `org.tizen.menu`, marcas extras, strings traduzidas |
| `app/weather.js` | **Novo.** Localização por IP + previsão Open-Meteo, com cache em `localStorage` |
| `app/i18n.js` | **Novo.** `FrameI18n.t(texto, params)`; detecção do idioma da TV; mapa `PT` |
| `app/index.html` | Carrega `i18n.js` (antes de `device.js`) e `weather.js`; camada `#wx`; `.wx-night-veil` em todas as superfícies de vidro; segundo dock `#inDock` |
| `app/style.css` | Estilos do dock de entradas, efeitos de clima, listas roláveis |
| `app/config.xml` | Nome `CleanTV`; privilégio `internet`; `<access>` para `ipwho.is`, `ipapi.co`, `api.open-meteo.com` |
| `app/assets/icons/*.svg` | Marcas brancas: airplay, crunchyroll, globoplay, xbox, streamiso, internet, emanual, devicecare, mercadoplay; ícones de dispositivo `dev-*` |
| `app/assets/icons/ADDITIONAL-SOURCES.json` | Procedência/licença dos ícones adicionados (manter atualizado — ver `THIRD_PARTY_NOTICES.md`) |
| `app/assets/icons/metrics.js` | Métricas de tinta regeneradas para os ícones novos (gerado por `scripts/build-icon-metrics.mjs`) |
| `app/icon.png` | Ícone do launcher (casa sobre azul, 512×512). Sem logo da Samsung |

## 3. Funcionalidades e onde estão

### 3.1 Grade de apps (dock de 2 linhas)
- Constantes em `app/main.js` topo: `DOCK_COLS = 5`, `DOCK_ROWS = 2`, `DOCK_ROW_GAP`,
  `DOCK_MODES` (tamanhos de bloco por modo icons/both/text), `CAP = 64` (máx. na Home).
- Navegação vertical entre linhas; `axes()` define prev/next/out/inn conforme layout.
- **Mostra todos os apps instalados:** `refreshCatalog()` → `syncInstalledApps()`.
  Apps novos entram no fim; desinstalados saem. Quem o usuário removeu da Home fica
  registrado em `c.seen` e não volta.
- **Ordenação** (Settings › Sort apps): `SORT_IDS = custom|az|za|recent|oldest`,
  `sortedOrder()`, `applySort()`. `recent/oldest` usam `c.used` (timestamp por app,
  atualizado em `launch()`).
- `shortName()` corta slogans de loja ("Spotify - Music and Podcasts" → "Spotify").

### 3.2 Barra de fontes (abaixo da grade)
- DOM: `#inDock` / `#inShelf` / `#inTrack` / `#inPlate`. Constantes `IN_TW`, `IN_TH`,
  `IN_PITCH`, `IN_H`, `IN_GAP`.
- `refreshHomeInputs()` chama `FrameDevice.sources(cb, true)` (inclui o sintonizador TV
  primeiro, depois HDMI por número). Falha de descoberta mantém a última lista.
- `SOURCE_APPS`: atalhos de sistema (Remote Access `com.samsung.tv.remote-workspace`,
  Connection Guide `org.tizen.connection-guide-app`) só aparecem se `hasApp()` for true.
- `switchInput()` → `FrameDevice.setSource(number, cb, type)` → `tvwindow.setSource`
  e depois abre `org.tizen.tv-viewer`. Tempo limite de 8 s; cancelável.
- **Ícone/nome por entrada** (Settings › Input icons): `INPUT_PRESETS` (switch, ps,
  xbox, bluray, dvd, vcr, cable, pc, soundbar, streaming). Gravado em `c.inputs` como
  `{ "<tipo><número>": "<presetId>" }`, ex. `{"HDMI2":"ps"}`, validado por
  `cleanInputMap()`.

### 3.2.1 Coluna de canais salvos (à direita da grade)
- Lista salva nas preferências (`c.channels`: `num`, `major`, `minor`, `name`, `icon`;
  `minor: 0` = analógico/sem subcanal), validada por `cleanChannels()` e mantida em `next()`.
  `app/channels.js` (`window.CleanTVChannels`) só semeia a lista quando as preferências
  ainda não têm `channels`. Ícone desconhecido é deduzido do nome (`chIcon`: globo, record,
  sbt, band); sem ícone, a coluna mostra o número.
- O último item da coluna é **Todos os canais** (`CH_ALL`), que abre a tela `channels`:
  `FrameDevice.channels()` lê `tvchannel.getChannelList` (última busca de canais da TV) e
  mostra uma grade como a de Todos os apps. OK assiste; **Editar canais salvos** (no topo)
  troca para o modo em que OK adiciona/remove o canal da coluna (`toggleSaved`, gravado na
  hora). Voltar sai do modo de edição e depois fecha a tela.
- DOM: `#chDock` / `#chShelf` / `#chTrack` / `#chPlate`, vidro próprio (`IMG.mat3`,
  `#matScrim3`). Constantes `CH_TW`, `CH_TH`, `CH_PITCH`, `CH_W`, `CH_GAP`.
  `dockGeom()` faz grade + coluna ocuparem juntas a largura da tela (`DOCK_SPAN`, margens
  `DOCK_M`); a grade é a que expande. `inGeom()` centraliza a barra de entradas ou, quando não
  cabe, estica-a para `DOCK_SPAN` e rola. No preview, `?inputs=few|many|none|<n>` gera entradas
  de exemplo (`scripts/preview-sources.js`). `tuneChannel` repete até 3 vezes antes do erro.
  `renderChannels()` usa a altura da grade e
  rola um item por vez (`scroll.ch`), com esmaecimento em cima/embaixo.
- Navegação (foco `zone: 'channels'`, índice `f.c`): Direita no último app de uma linha
  entra na coluna; Cima/Baixo escolhem; Cima no primeiro vai aos controles do topo (e Baixo
  volta para a coluna, via `f.uf`); Esquerda/Voltar retornam ao app; OK sintoniza.
- `FrameDevice.tuneChannel(ch, done)`: seleciona a fonte TV (`tvwindow.setSource`), procura
  `major.minor` em `tvchannel.getChannelList`, chama `tvchannel.tune` e abre
  `org.tizen.tv-viewer` (também quando não há sinal). Privilégio `tv.channel` no `config.xml`.
  Confirmado na UN58TU7020 em 2026-11-21: os cinco canais (inclusive o 03 analógico com
  `minor: 0`) abrem no canal certo, a navegação funciona e o botão Home volta normalmente.
- Ícones: `globo`, `band` (Custom Brand Icons, MIT), `sbt` (Commons, CC BY 4.0),
  `record` (Commons, CC BY-SA 4.0, máscara rasterizada), `dev-vcr`. Ver
  `ADDITIONAL-SOURCES.json`. `metrics.js` foi regenerado com o mesmo cálculo de
  `scripts/build-icon-metrics.mjs` (o script original precisa de `python3` no Windows).

### 3.2.2 TV ao vivo por trás da Home — testado e removido (2026-11-21)
- Tentativa: com uma opção ligada, chamar `tizen.tvwindow.show(…, ['0px','0px','100%','100%'],
  'MAIN')` ao abrir o app e deixar a página transparente para o canal aparecer atrás das docks.
- Resultado na UN58TU7020: ao ligar, a TV foi para a Live TV e **fechou o CleanTV**; com a
  opção gravada como ligada, o app passou a fechar a cada abertura. Foi preciso reinstalar
  uma versão sem o recurso (preferência `live` é ignorada por `clean()`).
- Conclusão: neste modelo, um app web não consegue ficar por cima da Live TV (estilo popup)
  nem mostrar o tuner por trás via `tvwindow.show`. Não reintroduzir sem um teste isolado
  (sem gravar preferência) e sem um caminho de recuperação.

### 3.2.3 Botão Home → CleanTV por TPK — testado e removido (2026-11-21)
- Tentativa: TPK .NET separado (identidade própria, assinado com o mesmo perfil), com a
  mesma regra `app-context-rule` `XF86Home` (`override="true"`) → CleanTV do
  `router_manifest()` de `scripts/native-home/frame-2020/prepare.py`. Compilado em Docker
  (`mcr.microsoft.com/dotnet/sdk:8.0.404`, `netcoreapp3.0`); TPK montado como zip e
  assinado com `tizen package -t tpk -s <perfil> -- <arquivo.tpk>` (o CLI recusa pasta solta).
- Na UN58TU7020: o pacote instala (o certificado aceita `appmanager.launch`) e
  `sdb uninstall <pkgid>` remove, mas o botão Home físico **continua abrindo a Home da
  Samsung**, mesmo após reinício completo. Roteador desinstalado.
- Conclusão: neste modelo não há caminho por app (web ou TPK com certificado comum) para
  o botão Home abrir o CleanTV. O acesso continua pela lista de apps.

### 3.3 Controles do topo
- `utils()` retorna `['home', 'tv', 'apps', 'settings']` (sem `art` nesta TV).
- `tv` → `FrameDevice.settings()`: usa `org.tizen.menu` quando instalado porque, no
  Tizen 5.5, lançar `com.samsung.tv.coba.setting` a partir de web app é ignorado.
- `home` → `com.samsung.tv.csfs` (Home da Samsung).

### 3.4 Clima
- `app/weather.js` expõe `window.FrameWeather = { current, cached }`.
  - Localização: `ipwho.is`, fallback `ipapi.co`; cache 24 h.
  - Previsão: Open-Meteo `current` + `daily` (máx/mín, nascer/pôr do sol), `timezone=auto`;
    cache de 3 h para exibir antes da rede responder.
  - Chave de armazenamento: `cleanframe.weather.v1` (separada das preferências).
  - XHR com timeout de 10 s; nenhum token/conta.
- `app/main.js`: `wxInfo()` (códigos WMO → tipo), `wxNight()` (usa nascer/pôr do sol),
  `wxCaption()` (legenda sob o relógio), `renderWeatherFx()` (reconstrói a camada `#wx`
  **só quando muda** tipo/noite/vento), `refreshWeather()` a cada 20 min e não roda com
  `document.hidden`.
- Efeitos: chuva, raio, neve, neblina, sol, estrelas, folhas (vento ≥ 25 km/h). Desligam com
  Settings › Weather effects (`c.wfx = 'off'`) ou `prefers-reduced-motion`.
- Noite: classe `wx-night` + `.wx-night-veil` em cada superfície com vidro (fundo, lentes,
  mat do dock). Ao adicionar uma superfície de vidro nova, inclua o véu também.
- Regra do projeto: nada de blur ao vivo nem análise de pixel no caminho de animação.
  Os efeitos são CSS puro (transform/opacity).

### 3.5 Idioma
- `app/i18n.js`: `detect()` usa `navigator.language`, com fallback em
  `tizen.systeminfo`. `pt*` → português; caso contrário inglês.
- Uso: `T('Texto em inglês')` ou `T('Undo {label}', { label: x })`. Entrada ausente no mapa
  `PT` cai para o inglês. **O texto em inglês é a chave** — mudar a frase em inglês exige
  mudar a chave no `PT`.
- `T()` é avaliado na carga do script para constantes (`MODES`, `UTIL`, `VALUE_NAMES`…).
  Não há troca de idioma em tempo de execução; reabrir o app aplica.
- Nomes de papel de parede são traduzidos na exibição (não no catálogo).
- `i18n.js` está em UTF-8 sem BOM. No PowerShell 5.1 o `Get-Content` sem
  `-Encoding UTF8` mostra mojibake (`ConfiguraÃ§Ãµes`) — é só exibição. **Nunca**
  regrave arquivos com `Set-Content`/`Out-File`; use o Edit/Write do agente.

### 3.6 Marcas de app adicionais
- `device.js` `EXTRA_BRANDS` mapeia appId nativo → nome do SVG; `main.js` `MARK_BRANDS`
  lista as marcas aceitas ao carregar preferências salvas. Para adicionar um app:
  1. SVG branco em `app/assets/icons/<nome>.svg` (ler `docs/assets.md`);
  2. procedência em `ADDITIONAL-SOURCES.json`;
  3. entrada em `EXTRA_BRANDS` **e** em `MARK_BRANDS`;
  4. regenerar `metrics.js` (`node scripts/build-icon-metrics.mjs`).

## 4. Preferências e migração

- Chave principal: `cleanframe.home.v1` (fallback de leitura: `cleanframe.shore.v1`).
- `load()` → `clean()` (valida e normaliza tudo) → `serialise()` grava `version: 2` mais as
  chaves antigas (`look`, `dock`, `wallpaper`, `theme`, `appRecords`) para atualização no lugar.
- Campos acrescentados pelo fork (todos opcionais, com padrão seguro):
  `seen[]`, `wfx` (`on|off`), `sort`, `used{}`, `inputs{}`.
- Ao criar um campo novo: validar em `clean()`, copiar em `next()` (senão ele é perdido na
  próxima escrita) e manter o padrão compatível com preferências antigas.

## 5. Restrições que continuam valendo

- JS da TV em **ES5** (sem arrow, `let/const`, template string, `class`). Ferramentas Node
  podem usar JS moderno.
- Preservar foco/navegação pelo controle remoto e renderização com cache
  (`setContent`, `setHTML`, `keyed` evitam reescrever DOM igual).
- Não mexer na Home nativa/startup sem tarefa explícita e linha de base de recuperação
  (ver `.local/native-home/investigation-tu7020.md`: nesta TV não há rota segura hoje).
- Não comitar `.local/`, `dist/`, `.wgt`, certificados, IP ou fontes pagas.

## 6. Verificação

Ambiente dividido nesta máquina Windows:
- **Python** (check/package/tv) roda no **WSL** (distro `clean-tizen-home`, Ubuntu 24.04,
  usuário `cleantv`; substitui a antiga `streamiso`), porque `package.py` precisa de pty POSIX.
  Para recriar: `wsl --install Ubuntu-24.04 --name clean-tizen-home --no-launch` e criar um
  usuário padrão em `/etc/wsl.conf`. Só a biblioteca padrão do Python é necessária. Os shims de
  `.local/tizen-sdk-wsl/` chamam o `tizen.bat`/`sdb.exe` do Windows e não dependem do nome da distro.
- **Node** (eslint, testes, Playwright) só existe no **Windows** (`C:\nvm4w\nodejs`);
  no WSL não há `node`. Por isso `npm run check` inteiro não roda num lugar só — rode as
  partes separadamente, do PowerShell:

```
npx eslint app                                   # = npm run lint
node --test scripts/test-device.mjs              # = npm run check:device
wsl.exe -d clean-tizen-home --cd /mnt/c/dev/CleanFrame -- python3 scripts/check.py
$env:CLEANFRAME_PUBLIC_FONTS='1'; node scripts/check-browser.mjs   # mudanças de interação
```

### 6.1 Instalação guiada, Docker e backup (Node, no computador que fala com a TV)

- `npm run tv:setup` (`scripts/tv-setup.mjs`): ambiente → TV → verificações → empacotar/assinar
  → backup → instalar → abrir. Instala por caminho fixo (`/home/owner/share/tmp/sdk_tools/CleanTV.wgt`)
  e esvazia o arquivo no fim, evitando o `download failed[116]` do `tv.py install`. Opções:
  `--builder wsl|docker|native`, `--tv NOME`/`--host IP`, `--build-only` (sem TV),
  `--no-package`, `--no-backup`, `--no-launch`, `--skip-checks`, `--yes`.
- TVs com nome ficam em `.local/device.json` (`"tvs": [{"name", "host"}]`; `"host"` continua
  sendo a padrão do `tv.py`; opcionais `"sdb"` e `"wsl"`).
- **Docker** (`docker/tizen-cli`, imagem `cleantv-tizen-cli`, Tizen CLI 6.1 para Linux): só
  empacota e assina. A pasta do perfil de certificados é montada somente leitura em `/certs`
  (achada pelo `profiles.xml` do Tizen Studio ou `--certs`). Os `.pwd` do Windows são
  criptografados para a máquina e não abrem no Linux, então a senha do certificado é digitada
  (oculta) e entra no container por variável de ambiente; o entrypoint a grava num arquivo 600
  no `/tmp` do container para o `password_file` do `package.py`. O `sdb` continua sendo o do host.
- **Backup/restauração** (`scripts/tv-backup.mjs`; `npm run tv:backup`, `tv:restore [arquivo|latest]`,
  `tv:backups`): abre o app em modo de depuração (`sdb shell 0 debug`), encaminha a porta do
  inspetor e lê/grava as chaves `cleanframe.*` do `localStorage` pelo protocolo DevTools. O app
  reinicia na TV. Arquivos em `.local/backups/<tv>/` (privados). A restauração salva antes o estado
  atual (`…-antes-de-restaurar.json`), ignora o cache de clima e recarrega o app. Roda em Node no
  Windows porque o WSL em modo NAT não alcança a porta que o `sdb.exe` encaminha.
- Validado sem TV: fluxo WSL completo (`--build-only`); assinatura no Docker com certificado de
  teste descartável; backup → alteração → restauração contra um Chromium local (`--cdp-port`).
  Ainda falta confirmar na TV o `sdb shell 0 debug` (porta do inspetor) e a instalação guiada.

Use `wsl.exe ... --cd` a partir do PowerShell, não do Git Bash (o Git Bash converte o
caminho `/mnt/...` e quebra o comando). `check-browser.mjs` foi escrito para o upstream; partes
dele podem falhar por causa do layout do fork (grade de 2 linhas, sem Art Mode). Ao ver falha,
diferencie regressão real de expectativa do upstream e registre a decisão.

## 7. Sincronizar com o upstream

```
git fetch upstream
git checkout main && git merge --ff-only upstream/main
git checkout cleantv && git merge main
```

Conflitos prováveis: `app/main.js`, `app/device.js`, `app/style.css`, `app/index.html`,
`app/assets/icons/metrics.js` (regenerar em vez de resolver à mão). Nunca force-push nem
reescreva histórico sem autorização explícita.
