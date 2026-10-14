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

Em workflows de `push: main` ou `schedule`, **omita** `cancel-in-progress: true` — cancelar um cron ou um push em `main` perde o resultado sem rerun automático.

---

### R3 — `timeout-minutes` em todo job

```yaml
jobs:
  my-job:
    runs-on: ubuntu-latest
    timeout-minutes: 15
```

Sem timeout, um job travado consome minutos até o limite do runner (6h).
Use o mínimo razoável: gates rápidos ≤ 10 min; E2E completo ≤ 30 min; crons pesados ≤ 60 min.

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
