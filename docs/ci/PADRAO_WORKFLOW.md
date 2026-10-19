# Padrão de Higiene de Workflow — CI Promo Brindes

> Documento de referência para todos os workflows em `.github/workflows/`.
> Criado em 2026-09-27 (E12 — PLANO_WORKFLOWS_CI_100_ETAPAS_2026-09-26.md).
> Vinculado a E11 (actionlint + shellcheck gate).

---

## 8 Regras Obrigatórias

### R1 — `permissions` explícito no topo

Todo workflow começa com permissões mínimas:

```yaml
permissions:
  contents: read
```

Adicione apenas o que o job realmente precisa (`pull-requests: write`, `security-events: write`, etc.).
O `GITHUB_TOKEN` padrão tem `write` em tudo — sem declaração explícita, qualquer passo tem acesso não auditado.

---

### R2 — `concurrency` com `cancel-in-progress`

Em workflows disparados por PR, use:

```yaml
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
```

Em workflows de `push: main` ou `schedule`, use `cancel-in-progress: false` explicitamente (E19) — cancelar um cron ou um push em `main` perde o resultado sem rerun automático. Nunca omita completamente; a omissão dá resultado imprevisível em upgrades do GitHub Actions.

---

### R3 — `timeout-minutes` em todo job

```yaml
jobs:
  my-job:
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

Sem timeout, um job travado consome minutos até o limite do runner (6h).

**E24 — Tabela de classes de timeout (obrigatório a partir de 2026-10-14):**

| Classe | Exemplos | `timeout-minutes` máximo |
|---|---|---|
| Estático | lint, typecheck, SSOT, ratchets, audit | ≤ 5 |
| Unitário | vitest, unit+integration | ≤ 10 |
| E2E leg / shard | 1 shard de regression, smoke gate, E2E CI | ≤ 20 |
| Full job (nightly, segurança) | full-ci, codeql, fuzz, drift check | ≤ 60 |
| Cron pesado | ci-metrics, schema export, capacity report | ≤ 60 |

Workflows com `timeout-minutes > 20` devem ter `name:` contendo "Nightly",
"Weekly", "Monthly", "Security" ou "Drift" para indicar que são jobs de longa
duração. O check de timeout por classe não está implementado em CI atualmente
(C15 em `check-workflow-contracts.mjs` valida `runs-on:`, não timeout).

---

### R4 — `node-version-file: .nvmrc` (nunca literal)

```yaml
- uses: actions/setup-node@v4
  with:
    node-version-file: .nvmrc
    cache: npm
```

**Nunca:**
```yaml
node-version: '22'       # ← proibido
node-version: '22.22.1'  # ← proibido
```

O `.nvmrc` na raiz é a única fonte de verdade para a versão de Node.
Manter 46+ literais sincronizados manualmente é a causa histórica de quebras silenciosas de build.

---

### R5 — Inputs sensíveis via `env:` no step, não como argumento CLI

```yaml
- name: Run script
  env:
    SUPABASE_PROJECT_ID: ${{ secrets.SUPABASE_PROJECT_ID }}
  run: node scripts/my-script.mjs
```

**Nunca:**
```yaml
run: node scripts/my-script.mjs --project ${{ secrets.SUPABASE_PROJECT_ID }}
```

Segredos em argumentos CLI aparecem em `ps aux` e nos logs do runner.

---

### R6 — `retention-days` por categoria (E88 — 2026-10-14)

Três tiers obrigatórios:

| Tier | Valor | Quando usar |
|------|-------|-------------|
| Padrão | `14` | Todos os artefatos de CI (Playwright reports, dist builds, snapshots, logs) |
| Relatório semanal | `30` | Artefatos de workflows com `schedule` semanal (`magazine-flakiness`, `daily-flows-simulation`) |
| Auditoria | `90` | Apenas artefatos de auditoria/compliance — **obrigatório** adicionar comentário `# E88 — auditoria <motivo>` |

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 14
```

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: qa-audit-report
    path: qa/reports/
    retention-days: 90  # E88 — auditoria qa/reports; retenção longa justificada
```

O padrão do GitHub é 90 dias. Sem política, storage cresce silenciosamente.
Nunca use `365` — sem justificativa de compliance esse valor indica descuido.

---

### R7 — Sem `master` ou `develop` nos triggers

```yaml
on:
  push:
    branches: [main]       # ← correto
  pull_request:
    branches: [main]       # ← correto
```

**Nunca:**
```yaml
branches: [main, master, develop]   # ← proibido
```

`master` e `develop` não existem neste repositório. Triggers em branches mortas criam
noise no histórico de runs e confundem ferramentas de análise de CI.

---

### R8 — Nome de job único e estável

```yaml
jobs:
  lint-and-typecheck:    # ← snake-case, descritivo, estável
    name: Lint & Typecheck
```

- O `id` do job (chave do YAML) deve ser snake-case, único no arquivo e nunca mudar após PR mergeado
- Usar o mesmo `id` em dois workflows que rodam em paralelo no mesmo PR é inócuo; mudar o `id` de um job que está em `required-checks.json` quebra o status check silenciosamente
- `name:` (exibido na UI do GitHub) pode ser mais descritivo e pode ter espaços

---

## Checklist de revisão antes de abrir PR

```sh
# Verificar literais de Node (deve retornar 0)
grep -c "node-version: '" .github/workflows/meu-workflow.yml

# Verificar permissões declaradas
grep -c "^permissions:" .github/workflows/meu-workflow.yml

# Verificar timeout em jobs
grep -c "timeout-minutes:" .github/workflows/meu-workflow.yml

# Verificar branches mortas
grep -E "master|develop" .github/workflows/meu-workflow.yml && echo "PROIBIDO" || echo "OK"

# Actionlint (gate E11)
npx --yes actionlint .github/workflows/meu-workflow.yml
```

---

## Referências

| Item | Arquivo | Etapa |
|------|---------|-------|
| Gate actionlint + shellcheck | `.github/workflows/workflow-lint.yml` | E11 |
| Ação composta setup-node | `.github/actions/setup-node-ci/` | E13 |
| SSOT versão Node | `.nvmrc` | E18 |
| Required checks | `.github/required-checks.json` | E56 |
| Ghost check guard | `scripts/check-required-checks.mjs` | E71 |
| Codeowners | `.github/CODEOWNERS` | E62 |

---

*Este documento é a referência viva — atualizar ao implementar E11–E20.*

---

### R9 — `persist-credentials: false` em todo `actions/checkout`

```yaml
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
  with:
    persist-credentials: false
```

Por padrão `actions/checkout` persiste o token GitHub no `.git/config` do repositório.
Qualquer step subsequente com acesso ao filesystem pode ler esse token — incluindo
dependências npm maliciosas, scripts de build e ferramentas de terceiros.
Declarar `persist-credentials: false` elimina esse vetor: o token só fica acessível
como `${{ github.token }}` onde explicitamente injetado via `env:`.

**Exceção legítima:** steps que usam `git push` autenticado via token implícito (ex.: workflows
`schedule`/`workflow_dispatch` que atualizam snapshots). Mesmo nesses casos, preferir
`persist-credentials: false` e usar um `git remote set-url` explícito com `${{ secrets.TOKEN }}`.

**Check CI:** C10 em `scripts/check-workflow-contracts.mjs`. Pré-existentes (118 workflows)
estão em `scripts/check-workflow-contracts.allowlist.json` — corrigir em PR dedicado.

---

### R10 — `defaults.run.shell: bash` obrigatório em workflows com steps `run:`

```yaml
defaults:
  run:
    shell: bash
```

Workflows sem `shell:` explícito herdam o shell padrão do runner. Em `ubuntu-*` o padrão
é `bash`, mas sem `set -e` (GitHub Actions usa `bash -e` implicitamente via `bash --noprofile --norc -eo pipefail {0}`).
Declarar `defaults.run.shell: bash` torna o comportamento explícito e auditável,
e é pré-requisito para `shellcheck` lint funcionar de forma confiável.

**Check CI:** C11 em `scripts/check-workflow-contracts.mjs`.

---

### R11 — `permissions.contents: write` proibido em workflows com trigger `pull_request`

```yaml
# PROIBIDO em workflow com pull_request:
permissions:
  contents: write   # ← não permitido quando pull_request: está nos triggers

# Correto: manter read-only em PR, escrever via workflow separado
permissions:
  contents: read
```

Workflows com trigger `pull_request` executam no contexto do código do fork/PR.
Permissão `contents: write` permitiria que código malicioso em um PR externo escrevesse
no repositório upstream.

**Exceção:** workflows com `pull_request_target` (que executa no contexto do base) podem precisar
de `contents: write` — mas requerem revisão de segurança explícita e comentário documentando.

**Check CI:** C12 em `scripts/check-workflow-contracts.mjs`.

---

### R12 — Workflows com `paths:` devem incluir o próprio arquivo na lista

```yaml
on:
  push:
    paths:
      - 'src/**'
      - '.github/workflows/my-workflow.yml'   # ← obrigatório
```

Sem auto-referência, uma mudança no próprio workflow (ex.: adicionar um novo step) não
dispara o CI — o arquivo atualizado só entra em vigor na próxima vez que um arquivo de
`src/**` mudar. Isso cria inconsistência silenciosa onde o workflow em produção não é o
workflow que está sendo executado.

**Check CI:** C13 em `scripts/check-workflow-contracts.mjs`. 9 workflows pré-existentes
estão em `scripts/check-workflow-contracts.allowlist.json`.

---

### R13 — Artefatos `test-results/` nunca como path único de upload

```yaml
# PROIBIDO:
- uses: actions/upload-artifact@v4
  with:
    path: test-results/    # ← ambíguo — pode vazar dados sensíveis de testes

# Correto: escopo explícito e nome descritivo
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report-${{ github.run_id }}
    path: |
      test-results/
      playwright-report/
    retention-days: 14
```

Artefatos nomeados apenas `test-results/` sem contexto adicional são ambíguos e muitas
vezes sobrescrevem artefatos de outros jobs/runs. Usar nome descritivo com `${{ github.run_id }}`.

**Check CI:** C14 em `scripts/check-workflow-contracts.mjs`.

---

### R14 — Runner fixo `ubuntu-24.04` (nunca `ubuntu-latest`)

```yaml
jobs:
  build:
    runs-on: ubuntu-24.04    # ← versão fixada
```

`ubuntu-latest` aponta para a versão mais recente do GitHub, que muda sem aviso.
Uma atualização silenciosa pode quebrar ferramentas pinadas por versão, alterar versões
de bibliotecas do sistema, ou modificar comportamentos de shell/coreutils.
`ubuntu-24.04` garante reproductibilidade entre runs e facilita debug de flakiness.

Quando uma versão nova do Ubuntu for necessária, migrar explicitamente com PR dedicado
e atualizar todos os workflows ao mesmo tempo.

**Check CI:** C15 em `scripts/check-workflow-contracts.mjs`.

---

---

### R15 — Todas as actions externas devem ser pinadas por SHA completo de 40 chars (C16)

```yaml
# PROIBIDO:
- uses: actions/checkout@v4
- uses: actions/setup-node@4.1.0

# Correto:
- uses: actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4
- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8 # v4
```

Uma tag mutável (`@v4`) pode ser silenciosamente redirecionada para código
malicioso sem qualquer alteração no workflow. O SHA de 40 chars imutável garante
que o exato código auditado é o que será executado.

**Check CI:** C16 em `scripts/check-workflow-contracts.mjs`.

---

### R16 — `continue-on-error: true` proibido a nível de job (C17)

```yaml
jobs:
  my-gate:
    # PROIBIDO:
    continue-on-error: true   # ← oculta falhas do gate

    # Correto: omitir (padrão é false) ou declarar false explicitamente
```

`continue-on-error: true` a nível de job faz o GitHub reportar o job como
sucesso mesmo em falha — silencia gates de qualidade. Permitido a nível de step
para etapas opcionais (ex.: notificações), nunca no job inteiro.

**Exceção documentada:** Lighthouse (Gate 4) é `continue-on-error: true` pois é
advisory — precisa de justificativa explícita e comentário no YAML.

**Check CI:** C17 em `scripts/check-workflow-contracts.mjs`.

---

### R17 — Workflows com triggers `push:` e `pull_request:` usam `cancel-in-progress` condicional (C18)

```yaml
concurrency:
  group: my-workflow-${{ github.ref }}
  cancel-in-progress: ${{ github.event_name == 'pull_request' }}
```

Workflows mistos (push + PR) precisam de comportamento diferente: cancelar PRs
velhos economiza minutos; cancelar um push em `main` perde o resultado sem rerun.
Valor booleano fixo (`true` ou `false`) é errado para pelo menos um dos triggers.

**Check CI:** C18 em `scripts/check-workflow-contracts.mjs`.

---

### R18 — `supabase db push` proibido em qualquer step `run:` (C19)

Ver REGRA #8 do `CLAUDE.md` e E15. O único caminho autorizado para aplicar migration
em `doufsxqlfjyuvxuezpln` é via `.github/workflows/db-apply-migration.yml`
(`workflow_dispatch(version)`). `supabase db push` contorna o fluxo de revisão,
aplica diretamente em produção e cria divergência no ledger de migrations.

**Check CI:** C19 em `scripts/check-workflow-contracts.mjs`.

---

### R19 — Nenhum workflow referencia o projeto proibido `pqpdolkaeqlyzpdpbizo` (C20)

Ver REGRA #1 do `CLAUDE.md`. O projeto `pqpdolkaeqlyzpdpbizo` é o antigo projeto
obsoleto. Qualquer referência em workflow deve ser substituída por
`doufsxqlfjyuvxuezpln` (o canônico).

**Check CI:** C20 em `scripts/check-workflow-contracts.mjs`.

---

### R20 — Todo `upload-artifact` declara `retention-days:` (C21)

Ver R6. A ausência de `retention-days:` herda o padrão do GitHub (90 dias).
Declarar explicitamente é obrigatório para auditoria e controle de storage.

**Check CI:** C21 em `scripts/check-workflow-contracts.mjs`.

---

### R21 — Workflows com trigger `pull_request` não devem ter `git push` em steps `run:` (C22)

Workflows disparados por PR executam no contexto do fork/PR. Um `git push` ali
pode gravar no repositório upstream quando o `GITHUB_TOKEN` tem permissão write.
Código a ser persistido deve usar upload-artifact ou PR dedicado.

**Check CI:** C22 em `scripts/check-workflow-contracts.mjs`.

---

### R22 — Steps `actions/setup-node` não usam `node-version:` literal (C23)

Ver R4. `node-version: '22'` é proibido. Usar sempre `node-version-file: .nvmrc`.

**Check CI:** C23 em `scripts/check-workflow-contracts.mjs`.

---

### R24 — Mudança em >10 workflows no mesmo commit exige execução no mesmo PR (E190 — C27)

Padrão "editar N workflows → fix imediato" repetiu em 3 ondas na janela P200:
- `202f76148` (120 workflows) → `7e74a8734` (fix em 2h)
- `6b880a059` (83 workflows) → `a79944b53` (fix em 28h)
- `64a75418c` (101 workflows) → 5 commits de correção em 28h

Quando mais de 10 workflows mudam no mesmo commit, a probabilidade de regressão aumenta.
A ordem correta é: deleção/consolidação **antes** de hardening no mesmo arquivo.

**Regra:** commit que toca mais de 10 arquivos em `.github/workflows/` deve ter pelo menos um
workflow alterado executado no mesmo PR (`workflow_dispatch` ou `push`-triggered no range).

**Check CI:** C27 em `scripts/check-workflow-contracts.mjs` (aviso, não bloqueante).
O bloqueio virá quando o padrão for estabilizado (meta: 0 ocorrências de "bulk-edit → fix" por mês).

---

### R23 — Workflows com `pull_request` e `push` em `main` devem declarar `paths-ignore` para docs (E14)

Workflows que rodam em todo PR **e** em push em `main` devem excluir mudanças docs-only
para não desperdiçar minutos de runner:

```yaml
on:
  pull_request:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '**/*.md'
      - 'supabase/**/*_LOG.md'
      - 'CHANGELOG.md'
      - '.github/ISSUE_TEMPLATE/**'
  push:
    branches: [main]
    paths-ignore:
      - 'docs/**'
      - '**/*.md'
      - 'supabase/**/*_LOG.md'
      - 'CHANGELOG.md'
      - '.github/ISSUE_TEMPLATE/**'
```

**Exceções:** workflows event-driven (`issues:`, `deployment_status:`, `workflow_run:`) ignoram `paths-ignore`.
Workflows com `paths:` positivo (focados em subconjunto de arquivos) não precisam de `paths-ignore`.

---

## Tabela de Contratos C10–C24 (E76, E96)

Tabela de referência rápida. Todos verificados por `scripts/check-workflow-contracts.mjs --gate`.

| Contrato | Regra | Descrição | Bloqueante |
|---|---|---|---|
| C10 | R9 | `actions/checkout` deve declarar `persist-credentials: false` | sim |
| C11 | R10 | Workflows com `run:` devem ter `defaults.run.shell: bash` | sim |
| C12 | R11 | Workflows `pull_request` proibidos de ter `permissions.contents: write` | sim |
| C13 | R12 | Workflows com `paths:` devem incluir o próprio arquivo `.github/workflows/<nome>.yml` | sim |
| C14 | R13 | `upload-artifact` com path SOMENTE `test-results/` proibido | sim |
| C15 | R14 | `runs-on:` deve ser `ubuntu-24.04` (nunca `ubuntu-latest` ou `ubuntu-22.04`) | sim |
| C16 | R15 | Actions externas devem ser pinadas por SHA de 40 chars | sim |
| C17 | R16 | `continue-on-error: true` proibido a nível de job | sim |
| C18 | R17 | Workflows mistos `push`+`pull_request` devem usar `cancel-in-progress` condicional | sim |
| C19 | R18 | `supabase db push` proibido em `run:` steps | sim |
| C20 | R19 | Nenhum workflow referencia `pqpdolkaeqlyzpdpbizo` | sim |
| C21 | R20 | Todo `upload-artifact` declara `retention-days:` | sim |
| C22 | R21 | Workflows `pull_request` não têm `git push` em `run:` | sim |
| C23 | R22 | `actions/setup-node` usa `node-version-file:`, não `node-version:` literal | sim |
| C24 | — | `npm install` em steps `run:` proibido; usar `npm ci` (ou ação composta) | sim |

| C27 | R24 | Mudança em >10 workflows no mesmo commit exige execução no mesmo PR (E190) | aviso |

**Nota:** C25 (`|| true` só com `# ok:`) e C26 (`npx <pkg>` fora do lockfile) verificados pelo script (E92/E96).
C27 verificado por `scripts/check-workflow-contracts.mjs` (aviso, não bloqueante).

---

## Checklist de revisão antes de abrir PR (atualizado E76, E88)

```sh
# Verificar literais de Node (deve retornar 0)
grep -c "node-version: '" .github/workflows/meu-workflow.yml

# Verificar permissões declaradas
grep -c "^permissions:" .github/workflows/meu-workflow.yml

# Verificar timeout em jobs
grep -c "timeout-minutes:" .github/workflows/meu-workflow.yml

# Verificar branches mortas
grep -E "master|develop" .github/workflows/meu-workflow.yml && echo "PROIBIDO" || echo "OK"

# Verificar persist-credentials: false (R9)
grep -A5 "actions/checkout@" .github/workflows/meu-workflow.yml | grep "persist-credentials"

# Verificar runner fixo (R14)
grep "runs-on:" .github/workflows/meu-workflow.yml | grep -v "ubuntu-24.04" && echo "VIOLACAO R14" || echo "OK"

# Contratos completos C1-C23 (gate passa se 0 fresh violations)
NODE_PATH=/tmp/jsyaml-install/node_modules node scripts/check-workflow-contracts.mjs --gate

# Actionlint (gate E11)
npx --yes actionlint .github/workflows/meu-workflow.yml
```


## Metas de saúde da esteira (E87)

| Métrica | Meta | Fonte |
|---|---|---|
| Runs totais/dia | ≤ 150 | `scripts/ci-metrics.mjs` |
| Fila média (p95 por workflow) | < 2 min | idem |
| Workflows verde-vazio (0 tests) | 0 | idem |
| Cache total do repositório | ≤ 8 GB | API `/actions/cache/usage` |

Relatório semanal em `docs/ci/METRICAS_SEMANAIS.md` (gerado por `ci-metrics-weekly.yml`).

---

## Tabela de crons — CI (E89)

> Regra E89: workflows com `SUPABASE_ACCESS_TOKEN` (PAT) devem ter ≥ 20 min de intervalo.
> Gerado por `scripts/ci-cron-table.mjs`. Atualizar ao adicionar/alterar crons.

| Horário UTC | Dia | Arquivo | Usa PAT |
|---|---|---|---|
| `a cada 30min` | diário | `uptime-monitor.yml` |  |
| `a cada 6h (xx:15)` | diário | `quote-number-hardening-verify.yml` | ✓ PAT |
| `02:00` | Seg | `e2e-focused.yml` |  |
| `02:43` | diário | `nightly-full.yml` |  |
| `03:09` | Seg | `stock-dashboard-stress.yml` |  |
| `03:17` | diário | `stock-filter-stress.yml` |  |
| `03:41` | diário | `kit-coverage-integration.yml` |  |
| `04:11` | diário | `stock-rupture-fuzz.yml` |  |
| `04:15` | Seg | `e2e-quote-view-no-presentation-mode.yml` |  |
| `04:22` | Seg | `e2e-quote-view-sticky.yml` |  |
| `04:28` | Seg | `e2e-quote-freight-block.yml` |  |
| `04:34` | Seg | `e2e-quotes-responsive.yml` |  |
| `04:44` | Seg | `e2e-pdf-print-cross-browser.yml` |  |
| `04:50` | Seg | `e2e-quote-item-editor-sheet.yml` |  |
| `05:12` | Seg | `auth-fuzz-weekly.yml` |  |
| `05:55` | Seg | `ci-security-drift.yml` | ✓ PAT |
| `06:12` | diário | `daily-flows-simulation.yml` |  |
| `06:17` | Seg | `log-login-fuzz-weekly.yml` |  |
| `06:18` | Seg | `magazine-flakiness.yml` |  |
| `06:20` | diário | `e2e-crm-callback-approved.yml` |  |
| `06:25` | Seg | `security.yml` |  |
| `06:27` | Seg | `magazine-mutation.yml` |  |
| `06:36` | Seg | `schema-snapshot-export.yml` | ✓ PAT |
| `06:41` | Seg | `url-state-unit.yml` |  |
| `06:44` | diário | `gitleaks-history-audit.yml` |  |
| `06:47` | Seg | `ts-unused-ratchet.yml` |  |
| `06:57` | diário | `supabase-linter-gate.yml` | ✓ PAT |
| `07:11` | Seg | `cache-prune.yml` |  |
| `07:15` | Seg | `ci-metrics-weekly.yml` |  |
| `08:08` | Seg | `ddl-out-of-band-detector.yml` | ✓ PAT |
| `08:45` | diário | `required-checks-guard.yml` | ✓ PAT |
| `08:54` | Seg | `ratchet-weekly.yml` |  |
| `09:06` | diário | `edge-functions-drift-check.yml` | ✓ PAT |
| `09:29` | diário | `db-schema-drift-check.yml` | ✓ PAT |
| `09:33` | Seg | `codeql.yml` |  |
| `09:49` | diário | `restore-seller-cart-rpc.yml` | ✓ PAT |
| `10:09` | diário | `security-definer-acl-multi-env.yml` | ✓ PAT |
| `10:30` | Seg | `policies-baseline.yml` | ✓ PAT |

✅ Nenhuma colisão de PAT detectada (intervalo mínimo: 20 min).

Para verificar: `node scripts/ci-cron-table.mjs --check`
