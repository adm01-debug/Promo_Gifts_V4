# RELATORIO_CI.md — Baseline + Correções de Workflows

**Data:** 2026-10-28  
**Branch de correção:** `claude_pink/busy-heisenberg-nrrcva`  
**Responsável:** Claude Sonnet 4.6 (sessão automática — goal: corrigir workflows em falha)

---

## 1. Inventário de workflows — última execução na main (2026-10-28)

| Workflow | Run ID | Status | Causa raiz |
|---|---|---|---|
| Branch Protection Sentinel | 40615509825 | **failure** | Commit `04239fd` (chore(deps): bump qs) foi push direto para main sem PR — padrão não aceito pelo sentinel |
| CI Security & Drift Checks | 40615509752 | **failure** | 3 testes unitários de Calendar quebrados: migração react-day-picker v8→v10 (commit `8b0b606`) não atualizou os seletores DOM dos testes |
| CI - Replenishment Module Quality Gate | 40612760478 | **failure** | E2E autenticado falha: helper aguarda redirect pós-login por 75s mas URL permanece em `/login` — provável ausência de secrets E2E no CI |
| E2E — Critical Flows & Error Boundaries | 40615510053 | **failure** | (a) Sidebar tooltip não aparece em 2s após hover; (b) check-playwright-min-executed: apenas 1/10 testes executados, 90% skipped por requireAuth — mesma causa dos secrets E2E |
| Deploy Gates (Gate Final) | — | success | |
| CodeQL | — | success | |
| Static Health Checks | — | success | |
| … (20+ outros) | — | success | |

---

## 2. Baseline local

> node_modules não instalado no container de execução — testes não rodaram localmente.  
> O baseline é derivado dos logs de CI da última execução.

### Erros reportados pelo CI (pré-correção)

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

## 3. Correções aplicadas neste PR

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

Os workflows de E2E que dependem de autenticação real continuam falhando por ausência de secrets no CI. Registrado em `PENDENCIAS.md`.

---

## 4. Validação pós-correção

A validação completa depende da execução do CI após merge deste PR. Os seletores foram corrigidos de acordo com a estrutura DOM real do react-day-picker v10 (conforme `src/components/ui/calendar.tsx` — `classNames` e `components` do DayPicker v10).
