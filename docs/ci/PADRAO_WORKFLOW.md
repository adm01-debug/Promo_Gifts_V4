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

### R6 — `retention-days: 14` para artefatos (salvo exceção justificada)

```yaml
- uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
    retention-days: 14
```

O padrão do GitHub é 90 dias. Artefatos de CI têm custo de storage e raramente são úteis após 2 semanas.
Exceção: artefatos de auditoria/compliance podem exigir 90 dias — documentar no workflow.

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
