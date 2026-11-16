# Dossiê PR #3228 — chore(workflows): adiciona workflow_dispatch ao e2e-color-swatch-grid

**Data:** 2026-11-08  
**Veredito:** `DECISAO_HUMANA`  
**Razões:** REGRA#8 (`.github/workflows/e2e-color-swatch-grid.yml`), isDraft=true

---

## 1. Arquivos alterados — lista completa

| Arquivo | Tipo | Classificação |
|---|---|---|
| `.github/workflows/e2e-color-swatch-grid.yml` | Modificado | **GOVERNANÇA — REGRA#8** |

**Total:** 1 arquivo alterado, +1 linha, 0 deleções.

---

## 2. Diff 100% lido

```diff
--- a/.github/workflows/e2e-color-swatch-grid.yml
+++ b/.github/workflows/e2e-color-swatch-grid.yml
@@ -29,6 +29,7 @@ on:
       - 'e2e/catalog/color-swatch-selected-no-clip.spec.ts'
       - 'e2e/catalog/color-swatch-wrap-visual.spec.ts'
       - '.github/workflows/e2e-color-swatch-grid.yml'
+  workflow_dispatch:
 
 concurrency:
   group: e2e-color-swatch-grid-${{ github.ref }}
```

**Mudança:** adiciona `workflow_dispatch:` como trigger ao workflow de E2E `e2e-color-swatch-grid.yml`. Zero mudança de lógica, jobs, steps ou permissões.

---

## 3. Análise por questão

### (1) Ainda é válida?
**SIM.** Adicionar `workflow_dispatch:` permite re-execução manual do workflow para verificação no HEAD atual — utility para debugging de CI.

### (2) Traz regressão?
**NÃO.** 1 adição de trigger. Não altera lógica, steps, permissões ou jobs do workflow. Risco: ZERO.

### (3) Já está implementada em main?
**NÃO.** Verificado: `main@e9ed1f416e` não possui `workflow_dispatch:` em `e2e-color-swatch-grid.yml` (a PR acrescenta essa linha).

### (4) A regra de negócio está correta?
**SIM.** Adicionar `workflow_dispatch:` é uma mudança de operação (facilidade de re-run manual), não muda contratos, permissões ou dados.

---

## 4. Merge test vs main `e9ed1f416e`

A PR altera apenas 1 linha em 1 arquivo (adiciona trigger). O arquivo `e2e-color-swatch-grid.yml` não está em conflito com o main atual — merge limpo esperado.

**Estado:** `mergeable_state: unknown` (GitHub ainda não calculou — PR recém-criada DRAFT).

---

## 5. Veredito final

**DECISAO_HUMANA**

Razões em ordem de prioridade:
1. **REGRA#8:** `.github/workflows/e2e-color-swatch-grid.yml` — toca CI/workflows
2. **isDraft=true** — PR ainda em rascunho

A mudança é trivial (1 linha), de baixíssimo risco, e tecnicamente correta. O bloqueio é procedimental (REGRA#8 + DRAFT), não técnico.
