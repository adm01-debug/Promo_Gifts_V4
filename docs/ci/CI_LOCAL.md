# CI local — rodar no PC tudo o que roda no GitHub

O `scripts/ci-local/` executa **os próprios workflows de `.github/workflows/`** no seu WSL,
com o [`act`](https://github.com/nektos/act) (Docker, imagens Ubuntu 24.04 iguais às do
GitHub). Não há cópia manual dos passos: quando um workflow muda, o CI local muda junto.

## Comandos

| Comando | O que faz | Tempo |
|---|---|---|
| `npm run ci:local:list` | Inventário: 98 workflows / 188 jobs, classe de cada job e o que **dispararia agora** (evento, branch e arquivos alterados vs `origin/main`) | segundos |
| `npm run ci:local` | Roda no act **tudo que o GitHub rodaria** numa PR contra `main` | longo |
| `npm run ci:local -- --workflow deploy-gates.yml` | Só os workflows indicados (ex.: o Gate Final obrigatório) | médio |
| `npm run ci:local:all` | Todos os workflows de `pull_request`, ignorando filtros de paths | longo |
| `npm run ci:local:nightly` | Os workflows agendados (nightly, fuzz/semanais) | longo |
| `npm run ci:local:fast -- --codigo-confiavel` | **Modo rápido sem Docker — só para código SEU** (roda no seu computador; código de outro branch/agente: use `ci:local`, em contêiner): passos `run:` dos jobs lidos do YAML, sem E2E/Lighthouse (`--with-e2e` inclui) | minutos |
| `npm run ci:local:extras` | Roda os scripts `test:*`/`check:*` do package.json que **nenhum workflow roda** (`-- --list` só lista; `--with-e2e`; `--unsafe` inclui carga/stress/serviços vivos) | variável |
| `npm run ci:local:compare` | Cruza o último resultado local com os check-runs do GitHub do mesmo commit | segundos |

Relatórios e logs: `.ci-local/runs/<id>/report.md`, `report.json` e `logs/` (ignorado pelo git).

## Resultados

| Resultado | Significado |
|---|---|
| `ok` | passou igual ao GitHub |
| `ok-parcial` | job verde; só os passos que exigem segredo ausente/API do GitHub não foram verificados |
| `FALHOU` | falha real — o passo que quebrou não depende de segredo nem da API do GitHub |
| `inconclusivo` | o passo que falhou precisa de um segredo que você não forneceu |
| `só GitHub` | depende da API/infra do GitHub (dependency-review, CodeQL, comentar PR, abrir issue, attest/OIDC) |
| `pulado` / `não executado` | `if:` falso, `needs` pulado, ou modo rápido excluiu (pesado) |

Saída: `0` sem falhas, `1` com alguma `FALHOU`, `3` com `--strict` e algum inconclusivo.

## Segredos (opcional)

Sem segredos, os jobs que tocam o banco de produção saem como **inconclusivo**. Para incluí-los,
crie `~/.config/ci-local/secrets.env` (fora do repositório; `chmod 600`):

```
SUPABASE_ACCESS_TOKEN=...
E2E_USER_EMAIL=...
```

O `.secrets` padrão do act **nunca** é lido; só esse arquivo (ou `--secrets <arq>`).

## Garantias de segurança

- **Nenhum token do GitHub é repassado**: nada do CI local consegue comentar, abrir issue,
  fazer push, publicar release ou disparar workflow no GitHub. Três travas, cada uma suficiente:
  `-s GITHUB_TOKEN=` (o act, sem isso, roda `gh auth token` sozinho e injeta o seu token em
  todos os jobs); processo filho sem `GITHUB_TOKEN`/`GH_TOKEN`/`SSH_AUTH_SOCK` e com
  `GH_CONFIG_DIR` vazio; passos só-GitHub **pulados** (`if: false`) no clone. Um arquivo de
  segredos que contenha `GITHUB_TOKEN`/`GH_TOKEN` é recusado. Testado com o `gh` logado: o job
  recebe token vazio.
- **Socket do Docker** só é montado nos workflows que chamam `docker`/`supabase start` num passo
  (com ele, um passo teria acesso de root ao host). Os demais rodam com `--container-daemon-socket -`.
- **Modo `fast`**: cada passo roda dentro do `bwrap` (bubblewrap) com a home real **escondida**
  (sem `~/.config/gh`, `~/.ssh`, `~/.netrc`, `~/.gitconfig`); só o repo, o `.git` comum, o node
  (`~/.nvm`) e os caches (`~/.npm`, `~/.cache`) ficam visíveis. Sem `bwrap`, o relatório marca
  "sem isolamento". Instalação de dependências é barrada por shims de `npm/pnpm/yarn/bun/npx` no
  PATH (o script roda intacto); `sudo`, `apt-get install` e `pip install` nunca rodam no host
  (inconclusivo). `if:` que dependa de `needs`/`vars` ou de passo que não rodou vira inconclusivo.
- Se o próprio act quebrar (exit ≠ 0 sem job reprovado), o resultado é **FALHOU**, nunca ✅.
- Falha num passo que não se consegue ligar ao YAML é **FALHOU** (não "inconclusivo").
- **Clone isolado** por execução (`~/.cache/ci-local/<repo>-<hash>/clone`, fora do repositório para não poluir scanners): seu working tree não é montado nem alterado.
  O act roda o **commit** — commite antes para incluir alterações.
- Workflows com gatilho de *escrita* em produção só agem com segredo; sem ele, ficam inconclusivos.

## Adaptações em relação ao GitHub (e por quê)

| Item | No GitHub | No CI local |
|---|---|---|
| `dorny/paths-filter` em PR | lista arquivos pela API (número da PR) | shim `scripts/ci-local/shims/paths-filter` com o **mesmo contrato**, via `git diff` contra a base do evento |
| Evento | payload real | payload sintético coerente (`head`/`base`/labels) em `.ci-local/runs/<id>/event.json` |
| `upload-artifact`/`download-artifact` v4+ | serviço de artefatos do GitHub | shims com o mesmo contrato, gravando em `.ci-local/runs/<id>/artifacts` (montado em todos os contêineres) — o servidor do act não fala o protocolo novo |
| Passos que exigem segredo ausente / API do GitHub | rodam com credenciais | `continue-on-error` **só no clone**; saem como `ok-parcial` (job verde, passo não verificado) para que os jobs dependentes rodem |
| Job `if: always()` após falha num workflow reutilizável (ex.: Gate Final) | roda e agrega os `needs` | o act não o executa; o veredito é **EMULADO** a partir dos `needs` e marcado como tal |
| Concorrência | runners do GitHub | `--jobs N` (padrão 2) — com mais jobs pesados em paralelo (E2E + build + vitest), testes com prazo curto estouram por lentidão da máquina, não por defeito |

## Limitações conhecidas (não afetam os workflows atuais do repo)

- Shim do `paths-filter`: `list-files: shell/escape/csv` sem escape de espaços; rename vira
  added+deleted (no GitHub é `renamed`); `some-with-excludes` cai em `some`. O repo só usa `json`.
- Shim de `upload-artifact`: nome repetido mescla em vez de dar 409; `include-hidden-files` ignorado.
- `download-artifact` com `pattern: '{a,b}'` (chaves) não casa; id inexistente em `artifact-ids` é ignorado.
- Glob de paths usa minimatch (`'**.js'` do GitHub não casa subpastas aqui).
- Modo `fast`: `if:` fora de `always()`/`success()`/`!cancelled()`/comparação simples vira inconclusivo (use o modo act).
- `extras` pode listar como órfão script que o CI roda por comando cru (`npx vitest run`).

## Requisitos

`act` ≥ 0.2.97 e Docker no WSL. As imagens (`catthehacker/ubuntu:act-24.04`, mapeadas em
`~/.actrc`) são baixadas na primeira execução.
