# origin/claude/fix-bot-pr-approval-261113-1030

- **Veredito:** FECHAR_SEM_VALOR  ·  **Confianca:** alta
- **O que isso faz pelo negocio:** nada hoje — era uma tentativa de parar os avisos de CI travados em "aguardando aprovacao" nas PRs automaticas; a tentativa foi testada, reprovada por enfraquecer a trava de seguranca do merge, e o problema foi resolvido por outro caminho.
- **Tip / merge-base / main:** tip `70c1dd82dfcc965a2afcb35a527eaf0043abab7f` · merge-base `10e57c95428b4452138e7b5a1228dd52b944b4a1` · main `e4ab7f85d9d32ad142c8f1d8b9d581816fc4cf8c`

## O que a branch quis fazer

Commit unico `70c1dd82df` — "fix(ci): pula workflows em PRs criados por github-actions[bot]".

Diagnostico do agente: as PRs de recibo criadas por robo (branches `e15-receipt-*`, abertas com o
`GITHUB_TOKEN`, autor `github-actions[bot]`) disparavam os workflows `check-no-prod-leak` e
`required-checks-guard`, cujas execucoes ficavam em `action_required` (esperando alguem aprovar) e
travavam o CI.

Remedio proposto: acrescentar `if: github.actor != 'github-actions[bot]'` em 4 jobs (1 em
`check-no-prod-leak.yml`, 3 em `required-checks-guard.yml`), contando com o fato de que o GitHub
trata job `skipped` como aprovado.

O sintoma era real e esta documentado na propria main:
`docs/ci/INVENTARIO_WORKFLOWS_2026-11-02.md:70` registra, para `check-no-prod-leak.yml`, o estado
observado "action_required@PR e15-receipt".

## Item por item: esta na main?

| item | onde esta na main (ou NAO ESTA) | evidencia |
|---|---|---|
| `if: github.actor != 'github-actions[bot]'` em `check-no-prod-leak.yml` (job `no_prod_leak`) | **NAO ESTA** — e nao pode mais estar: o workflow foi aposentado da main; a checagem virou um step de `static-checks.yml` | `git ls-tree origin/main .github/workflows/` nao lista `check-no-prod-leak.yml`; retirado em `9e656a39b9` ("ci: enxuga workflows…", 2026-11-15); checagem agora em `.github/workflows/static-checks.yml:80-83` ("ex-check-no-prod-leak.yml" → `node scripts/check-no-prod-leak.mjs`); a copia arquivada `recovery/workflows-aposentados/check-no-prod-leak.yml` tambem nao tem o filtro |
| `if:` nos jobs `assert-required-checks` e `secrets-inventory-check` de `required-checks-guard.yml` | **NAO ESTA** o filtro; a **intencao** (nao rodar esses jobs em PR de recibo) foi atendida por outro mecanismo: a main trocou o gatilho `pull_request` incondicional por `paths:` restrito | diff (B) do pacote: main tem `pull_request: paths: ['.github/required-checks.json', '.github/workflows/required-checks-guard.yml', 'docs/ci/SEGREDOS.md', 'scripts/check-secrets-inventory.mjs']`. A PR de recibo so mexe em `supabase/MIGRATIONS_SYNC_LOG.md` (`.github/workflows/db-apply-migration.yml:362-363`), logo nao casa com nenhum path e o workflow nao dispara |
| `if:` no job `ghost-check-guard` | **NAO ESTA** o filtro; o job saiu de `required-checks-guard.yml` e virou step de `static-checks.yml` | diff (B): bloco `ghost-check-guard` removido da main; `static-checks.yml:22-27` cita "required-checks-guard.yml (ghost-check-guard)" entre as origens dos steps |
| filtro de ator `github-actions[bot]` em qualquer workflow da main | **NAO ESTA em nenhum lugar** | `git grep -n "github.actor" origin/main -- .github/workflows/` so devolve filtros de `dependabot[bot]` (ex.: `.github/workflows/deploy-gates.yml:182`); `git log -S"github.actor != 'github-actions[bot]'" origin/main` so acha o commit de documentacao `956761e556` |
| a propria PR da branch | **Fechada sem merge, com reprovacao tecnica fundamentada** | PR #3520 — https://github.com/adm01-debug/Promo_Gifts_V4/pull/3520 — `state: closed`, `merged: false`; comentario de fechamento de 2026-11-14 pela conta do dono (`author_association: OWNER`) |
| o problema de fundo (execucoes `action_required` em PRs de robo) | **Tratado por outro caminho**, nao por filtro de ator | `.github/workflows/db-apply-migration.yml:380` passou a usar `gh pr merge --squash --auto --delete-branch`, com a PR de recibo entrando pelo bypass docs-only E14 (`.github/workflows/deploy-gates.yml:122-130, 205`); os unicos checks obrigatorios da main sao 3 e nenhum deles e esses workflows (`.github/required-checks.json`, bloco `rulesets[0].required_checks`) |

## A resgatar

Nada. O conteudo proprio da branch nao deve ser aplicado. Motivos registrados no fechamento da
PR #3520 (comentario de 2026-11-14, conta do dono), com evidencia de execucoes reais:

1. O `if:` de job **nao evita** o `action_required`: as execucoes travadas nao tem job nenhum
   (`GET /actions/runs/43543600428/jobs` e `GET /actions/runs/43543600550/jobs` devolvem
   `total_count: 0`); o `if:` so e avaliado **depois** de alguem aprovar a execucao.
2. Prova na propria main: `deploy-gates.yml` ja filtra autor por `if:` e as execucoes nas PRs de robo
   continuaram `action_required` (runs 43543600550, 43542869026, 43528359435).
3. O problema era maior que a PR: ~160 execucoes `action_required` em ~24 workflows; a branch mexia em 2.
4. O unico efeito real seria **negativo**: apos a aprovacao, o check obrigatorio
   `Assert Gate Final is required on main` passaria a `skipped`, e o GitHub conta `skipped` como
   aprovado — ou seja, a trava de seguranca do merge seria contornada tambem quando um robo empurra
   commit numa PR humana.

Alem disso, 1 dos 2 arquivos tocados nao existe mais na main, e o outro mudou de gatilho de forma que
as PRs de robo nem chegam a ele.

## Risco de fechar esta branch

Praticamente nulo. Nao se perde nenhum comportamento: a checagem de vazamento de producao continua
rodando em todo PR (dentro de `static-checks.yml`), o guarda de protecao da main continua rodando
(diario + push em `.github/**` + PR que mexa no que ele valida) e a PR de recibo do banco agora entra
sozinha por auto-merge. Fechar nao altera nenhum workflow — nada e aplicado.

O incomodo de fundo (execucoes de CI paradas em "aguardando aprovacao" nas branches de robo, como
`e66-edge-deploy-receipt-*` e `release-please--*`) **segue existindo** e nao e resolvido por esta
branch; se o dono quiser atacar isso, o caminho e a configuracao do repositorio em
Settings → Actions ("Approval for running fork/bot workflows"), nao um `if:` em job — por isso fica
como item separado, nao como resgate desta branch.

## Nao verificado

- Nao reexecutei as 4 chamadas de API citadas no fechamento da PR #3520 (runs 43543600428,
  43543600550, 43542869026, 43528359435): tomei como evidencia o comentario publico do dono na PR.
- Nao conferi se hoje ainda ha execucoes em `action_required` no repositorio, nem quantas — o numero
  "~160 em ~24 workflows" e o do fechamento da PR em 2026-11-14.
