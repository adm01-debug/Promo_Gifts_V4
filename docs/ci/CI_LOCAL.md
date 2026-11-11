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
| `npm run ci:local:fast` | **Modo rápido sem Docker**: passos `run:` dos jobs lidos do YAML, sem E2E/Lighthouse (`--with-e2e` inclui) | minutos |
| `npm run ci:local:extras` | Roda os scripts `test:*`/`check:*` do package.json que **nenhum workflow roda** (`-- --list` só lista; `--with-e2e`; `--unsafe` inclui carga/stress/serviços vivos) | variável |
| `npm run ci:local:compare` | Cruza o último resultado local com os check-runs do GitHub do mesmo commit | segundos |

Relatórios e logs: `.ci-local/runs/<id>/report.md`, `report.json` e `logs/` (ignorado pelo git).

## Resultados

| Resultado | Significado |
|---|---|
| `ok` | passou igual ao GitHub |
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
  fazer push, publicar release ou disparar workflow no GitHub.
- **Clone isolado** por execução (`.ci-local/clone`): seu working tree não é montado nem alterado.
  O act roda o **commit** — commite antes para incluir alterações.
- Workflows com gatilho de *escrita* em produção só agem com segredo; sem ele, ficam inconclusivos.

## Adaptações em relação ao GitHub (e por quê)

| Item | No GitHub | No CI local |
|---|---|---|
| `dorny/paths-filter` em PR | lista arquivos pela API (número da PR) | shim `scripts/ci-local/shims/paths-filter` com o **mesmo contrato**, via `git diff` contra a base do evento |
| Evento | payload real | payload sintético coerente (`head`/`base`/labels) em `.ci-local/runs/<id>/event.json` |
| Concorrência | runners do GitHub | `--jobs N` (padrão 4) — limite para não esgotar memória do WSL |

## Requisitos

`act` ≥ 0.2.97 e Docker no WSL. As imagens (`catthehacker/ubuntu:act-24.04`, mapeadas em
`~/.actrc`) são baixadas na primeira execução.
