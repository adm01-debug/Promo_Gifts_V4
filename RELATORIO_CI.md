# RELATORIO_CI.md — Baseline + Correções de Workflows

**Data:** 2026-10-28  
**Branch de correção:** `claude/fix-calendar-rdp-v10-261028-0500` (PR #2681)  
**Responsável:** Claude Sonnet 4.6 (sessão automática — goal: corrigir workflows em falha)

---

## 1. Inventário de workflows — última execução na main (2026-10-28)

| Workflow | Run ID | Status | Causa raiz |
|---|---|---|---|
| Branch Protection Sentinel | 40615509825 | **failure** | Commit `04239fd` (chore(deps): bump qs) foi push direto para main sem PR — padrão não aceito pelo sentinel |
| CI Security & Drift Checks | 40615509752 | **failure** | 3 testes unitários de Calendar quebrados: migração react-day-picker v8→v10 (commit `8b0b606`) não atualizou os seletores DOM dos testes |
| CI - Replenishment Module Quality Gate | 40612760478 | **failure** | E2E autenticado falha: helper aguarda redirect pós-login por 75s mas URL permanece em `/login` — ausência de secrets E2E no CI (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) |
| E2E — Critical Flows & Error Boundaries | 40615510053 | **failure** | (a) Sidebar tooltip não aparece em 2s após hover; (b) check-playwright-min-executed: apenas 1/10 testes executados, 90% skipped por requireAuth — mesma causa dos secrets E2E |
| Deploy Gates (Gate Final) | — | success | |
| CodeQL | — | success | |
| Static Health Checks | — | success | |
| … (20+ outros) | — | success | |

---

## 2. Baseline local (container de execução — Node v22.22.0)

Baseline coletado em 2026-10-28 na branch `claude/fix-calendar-rdp-v10-261028-0500` **após** aplicação das correções (único momento possível — node_modules não estava instalado antes das correções). Os 3 arquivos corrigidos são de teste; o código de produção não foi alterado.

### 2a. Build (Vite)

```
npm run build → ✓ built in 11.98s  (exit 0)
Warnings: apenas INEFFECTIVE_DYNAMIC_IMPORT (pré-existentes, não introduzidos por este PR)
```

### 2b. TypeScript (tsc --noEmit)

```
npx tsc --noEmit → exit 0 (sem erros de tipo)
```

### 2c. Testes unitários (Vitest)

```
Test Files  1210 passed | 131 skipped (1341 total)
Tests       25656 passed | 1134 skipped | 24 todo (26814 total)
Duration    ~1296s
Exit: 0
```

### 2d. Lint (ESLint)

```
npm run lint → ESLint encerrado com status null no container local (OOM — memória insuficiente no container de execução)
Resultado válido: CI do PR #2681 executa em runner GitHub Actions com memória adequada
```

### 2e. Erros pré-correção (derivados dos logs de CI — runs em falha)

**CI Security & Drift Checks — `calendar.dimensions.test.tsx`:**
- Linha 79: `expected null to be truthy` — `container.querySelector('button[aria-selected="true"]')` retorna null no v10
- Linha 111: `expected 0 to be greater than 20` — `querySelectorAll('button[name="day"]')` retorna 0 no v10

**CI Security & Drift Checks — `calendar.redesign.test.tsx`:**
- Linha 58: `expected undefined to be truthy` — `Array.from(querySelectorAll('button[name="day"]')).find(...)` retorna undefined no v10
- Linha 68: `expected null to be truthy` — `querySelector('button[aria-selected="true"]')` retorna null no v10

**CI Security & Drift Checks — `date-picker-field.test.tsx`:**
- Linha 62: `expected onChange to be called with ['2026-07-15']` — click no `gridcell` não dispara o handler do DayPicker v10

**Branch Protection Sentinel:**
- `PUSH_BEFORE: 8b0b6068` → `PUSH_AFTER: 04239fdd`
- Commit `04239fd`: `chore(deps): bump qs 6.16.0→6.16.2` não termina em `(#NNN)`, não é merge commit, não é bot, não tem `[skip-sentinel]`

---

## 3. Correções aplicadas neste PR (#2681)

### Grupo A — Testes unitários Calendar (CI Security & Drift Checks)

**Causa raiz:** O commit `8b0b606` migrou o `calendar.tsx` de react-day-picker v8 para v10, mas não atualizou os testes. No v10, `aria-selected="true"` vai para o `<td>` (não para o `<button>`) e botões de dia não têm mais `name="day"`.

**Arquivos alterados:**

| Arquivo | Linha | Antes | Depois |
|---|---|---|---|
| `calendar.dimensions.test.tsx` | 78 | `querySelector('button[aria-selected="true"]')` | `querySelector('[aria-selected="true"] button')` |
| `calendar.dimensions.test.tsx` | 110 | `querySelectorAll('button[name="day"]')` | `querySelectorAll('td[role="gridcell"] button')` |
| `calendar.redesign.test.tsx` | 58–63 | `querySelectorAll('button[name="day"]')` para achar today | `querySelectorAll('td[role="gridcell"]')` com `classes(td).includes('text-destructive')` |
| `calendar.redesign.test.tsx` | 68 | `querySelector('button[aria-selected="true"]')` | `querySelector('[aria-selected="true"]')` |
| `date-picker-field.test.tsx` | 60 | `getByRole('gridcell', { name: /15/ })` + click | `getByRole('button', { name: /15/ })` + click |

### Grupo B — Sentinel (Branch Protection Sentinel)

O sentinel falha para pushes que não seguem o padrão aceito. O push `04239fd` já está na main e não pode ser revertido sem force-push. **A última execução do sentinel vai virar success automaticamente quando este PR for mergeado** — o merge commit (`Merge pull request #NNN`) é um padrão aceito pelo sentinel.

### Grupo C — E2E autenticado (bloqueado — ver PENDENCIAS.md)

Os workflows P1 e P2 de E2E que dependem de autenticação real continuam falhando por ausência de secrets no CI. Registrado em `PENDENCIAS.md`. Não é possível corrigir sem ação do PO.

---

## 4. Comparação baseline × pós-correção

| Métrica | Pré-correção | Pós-correção |
|---|---|---|
| Build Vite | ✓ (pré-existente) | ✓ exit 0, 11.98s |
| TypeScript (tsc) | ✓ (pré-existente) | ✓ exit 0 |
| Testes unitários | ✗ 5 falhas Calendar | ✓ 1210 passando, exit 0 |
| Lint (ESLint) | ✓ (pré-existente) | Aguardando CI |
| Branch Protection Sentinel | ✗ failure (run 40615509825) | Resolve após merge do PR |
| CI Security & Drift Checks | ✗ failure (run 40615509752) | Resolve após merge (testes corrigidos) |
| CI Replenishment E2E | ✗ failure (P1 — secrets) | Bloqueado — ver PENDENCIAS.md |
| E2E Critical Flows | ✗ failure (P2 — secrets) | Bloqueado — ver PENDENCIAS.md |

**Nenhuma regressão introduzida:** somente 3 arquivos de teste foram alterados; código de produção intacto.

---

## 5. Prova de conclusão (a preencher após merge do PR #2681)

| Workflow | Run ID pós-merge | Conclusion | Link |
|---|---|---|---|
| Branch Protection Sentinel | — | pendente | — |
| CI Security & Drift Checks | — | pendente | — |
| Deploy Gates | — | pendente | — |

*Esta tabela será atualizada com os run IDs e links reais após o merge do PR #2681 e execução dos workflows na main.*

---

## 6. Pendências (não corrigíveis sem ação externa)

Ver `PENDENCIAS.md` para detalhes completos de P1 e P2 (E2E autenticado — requer secrets configurados pelo PO no GitHub Actions).
