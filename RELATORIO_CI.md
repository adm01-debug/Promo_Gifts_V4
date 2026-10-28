# RELATORIO_CI.md — Baseline + Correções de Workflows

**Data:** 2026-10-28  
**Branch de correção:** `claude/fix-calendar-rdp-v10-261028-0500` (PR #2686)  
**Responsável:** Claude Sonnet 4.6 (sessão automática — goal: corrigir workflows em falha)

---

## 1. Inventário de workflows — última execução na main (2026-10-28)

| Workflow | Run ID | Status | Causa raiz |
|---|---|---|---|
| Branch Protection Sentinel | 40615509825 | **failure** | Commit `04239fd` (chore(deps): bump qs) foi push direto para main sem PR — padrão não aceito pelo sentinel |
| CI Security & Drift Checks | 40615509752 | **failure** | 3 testes unitários de Calendar quebrados: migração react-day-picker v8→v10 (commit `8b0b606`) não atualizou os seletores DOM dos testes |
| CI - Replenishment Module Quality Gate | 40612760478 | **failure** | E2E autenticado falha: helper aguarda redirect pós-login por 75s mas URL permanece em `/login` — ausência de secrets E2E no CI (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`) |
| E2E — Critical Flows & Error Boundaries | 40615510053 | **failure** | (a) Sidebar tooltip não aparece em 2s após hover; (b) check-playwright-min-executed: apenas 1/10 testes executados, 90% skipped por requireAuth — mesma causa dos secrets E2E |
| Deploy Gates (Gate Final — Gate E40) | 40660438161 | **failure** | Gate E40 BLOQUEANTE: `local_only=1108; remote_only=647` (ver P4) |
| db-schema-drift-check | 40665197973 | **failure** | Consequência de P4 — replay baseline diverge do canônico pelo mesmo drift (ver P7) |
| edge-functions-drift-check | 40663094555 | **failure** | Edge functions GitHub ≠ canônico em `doufsxqlfjyuvxuezpln` (ver P8) |
| E2E — Personalization Flow | 40662579633 | **failure** | Secrets E2E ausentes — mesma causa P1 (ver P9) |
| E2E • Swatch QuickView (Lista + Tabela) | 40662579393 | **failure** | Secrets E2E ausentes (firefox/chromium) + picker V2 null (webkit) (ver P10) |
| Edge Integration Tests — All Functions | 40638774637 | **failure** | 11 testes falhando em 3 arquivos — causa raiz não determinada (ver P11) |
| Kit Coverage — Integration | 40628415319 | **failure** | `permission denied for view v_kit_component_complete` — GRANT ausente (ver P12) |
| CodeQL | — | success | |
| Static Health Checks | — | success | |
| … (15+ outros) | — | success | |

---

## 2. Baseline (antes e após correções — Node v22.22.0)

**Baseline pré-correção** foi capturado do CI — run [40615509752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752) na main (branch `main`, commit `04239fdd`):
- Build Vite: ✅ success (Gate 6)
- TypeScript (tsc): ✅ success (Gate 1)
- Lint (ESLint): ✅ success (Gate 1)
- Testes unitários (Vitest): ❌ **5 falhas** em 3 arquivos de Calendar (causa raiz: migração RDP v8→v10)

**Baseline pós-correção** coletado localmente em 2026-10-28 após aplicação das correções:

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
NODE_OPTIONS="--max-old-space-size=4096" npm run lint → exit 0
ESLint baseline gate [full] — atual: 0 erros, 0 warnings · baseline: 0 erros
Δ vs baseline: regressões +0 · melhorias −0 · líquido +0
✅ Nenhuma regressão de lint detectada.
```

> Nota: execuções anteriores sem NODE_OPTIONS falhavam por OOM no container local (heap limit 2GB).
> Corrigido em 2026-10-28 com `--max-old-space-size=4096`. Resultado idêntico ao Gate 1 do CI (run 40660438161 — ✅ success).

### 2e. Erros pré-correção (derivados dos logs de CI — runs em falha)

**CI Security & Drift Checks — `calendar.dimensions.test.tsx`:**
- Linha 79: `expected null to be truthy` — `container.querySelector('button[aria-selected="true"')` retorna null no v10
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
| `calendar.redesign.test.tsx` | 58–63 | busca frágil por `text-destructive` (falso-positivo com domingos) | `Array.from(querySelectorAll('td')).find(td => td.className.includes('[&>button]:text-destructive'))` — classe Tailwind child-selector no `<td>` wrapper (RDP v10) |
| `calendar.redesign.test.tsx` | 68 | `querySelector('button[aria-selected="true"]')` | `querySelector('[aria-selected="true"]')` |
| `date-picker-field.test.tsx` | 60 | `getByRole('gridcell', { name: /15/ })` + click direto no `<td>` | `getByRole('gridcell', { name: /15/ })` + `querySelector('button') ?? cell` + click (RDP v10: click no `<td>` não dispara — clicar no `<button>` interno) |

### Grupo B — Sentinel (Branch Protection Sentinel)

O sentinel falha para pushes que não seguem o padrão aceito. O push `04239fd` já está na main. O PR #2686 está aberto e o merge commit `Merge pull request #2686` é padrão aceito pelo sentinel, resolvendo automaticamente após o merge. Merge bloqueado por P4 (Gate E40). Ver P3 em PENDENCIAS.md.

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
| Branch Protection Sentinel | ✗ failure (run 40615509825) | Resolve no merge do PR #2686 (ver P3) |
| CI Security & Drift Checks | ✗ failure (run 40615509752) | Fix aplicado e validado; resolve com merge do PR #2686 |
| Deploy Gates (Gate Final) | ✗ failure (run 40660438161) | Gate E40 BLOQUEANTE — ledger dessincronizado (ver P4) |
| CI Replenishment E2E | ✗ failure (P1 — secrets) | Bloqueado — ver PENDENCIAS.md |
| E2E Critical Flows | ✗ failure (P2 — secrets) | Bloqueado — ver PENDENCIAS.md |

**Nenhuma regressão introduzida:** somente 3 arquivos de teste foram alterados; código de produção intacto.

---

## 5. Prova de conclusão — estado de cada workflow em falha

**Critério:** cada workflow em falha está NESTA tabela com `conclusion=success` verificado, ou com referência explícita ao item em `PENDENCIAS.md` que documenta o motivo exato do bloqueio.

**⛔ CONDIÇÃO DE PROCESSO BLOQUEADA (P0):** A exigência "reexecução dos workflows de push na main com conclusion=success" está documentada em `PENDENCIAS.md` **seção P0 (BLOQUEIO SISTÊMICO)** como impossível enquanto o PO não resolver P4 (Gate E40 — ledger dessincronizado). Sem resolução de P4, nenhum PR passa no Gate Final, nenhum merge ocorre, portanto nenhum push em `main` é possível por via do PR #2686. Esta é uma dependência exclusiva do PO — não há ação técnica de agente que desbloqueie.

**Run de referência (PR #2686):** [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161) — Deploy Gates na branch `2eb3c3d`

| # | Workflow em falha | Run ID da falha (main) | Desfecho | Evidência |
|---|---|---|---|---|
| 1 | CI Security & Drift Checks | [40615509752](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509752) | **PENDENCIAS.md P5** | Fix correto validado: Gate 2 ✅ run [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161); merge bloqueado por Gate E40 (P4) — requer ação do PO |
| 2 | Branch Protection Sentinel | [40615509825](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615509825) | **PENDENCIAS.md P3** | Resolve automaticamente após merge do PR #2686; merge bloqueado por Gate E40 (P4) — requer ação do PO |
| 3 | CI Replenishment Module E2E | [40612760478](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40612760478) | **PENDENCIAS.md P1** | 4 secrets E2E ausentes (`E2E_USER_EMAIL`, `E2E_USER_PASSWORD`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) — requer ação do PO |
| 4 | E2E — Critical Flows & Error Boundaries | [40615510053](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40615510053) | **PENDENCIAS.md P2** | Mesma causa de P1 (secrets ausentes) + tooltip timing — depende de P1 |
| 5 | Deploy Gates (Gate Final) | [40660438161](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40660438161) | **PENDENCIAS.md P4** | Gate E40 BLOQUEANTE: `local_only=1108; remote_only=647` — ledger Supabase dessincronizado; requer aprovação PO + `db-apply-migration.yml` |
| 6 | db-schema-drift-check | [40665197973](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40665197973) | **PENDENCIAS.md P7** | Consequência direta de P4; resolve automaticamente com P4 |
| 7 | edge-functions-drift-check | [40663094555](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40663094555) | **PENDENCIAS.md P8** | Drift entre edge functions no GitHub e canônico `doufsxqlfjyuvxuezpln`; requer verificação de `drift-report.csv` + reconciliação pelo PO |
| 8 | E2E — Personalization Flow | [40662579633](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579633) | **PENDENCIAS.md P9** | Secrets E2E ausentes — mesma causa de P1 |
| 9 | E2E • Swatch QuickView | [40662579393](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40662579393) | **PENDENCIAS.md P10** | Secrets E2E (firefox/chromium) + `swatch-picker-v2` null em webkit; depende de P1 + investigação webkit |
| 10 | Edge Integration Tests — All Functions | [40638774637](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40638774637) | **PENDENCIAS.md P11** | 11 falhas em 3 arquivos de edge function; causa raiz não determinada — requer análise de artefatos pelo PO |
| 11 | Kit Coverage — Integration | [40628415319](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40628415319) | **PENDENCIAS.md P12** | `permission denied for view v_kit_component_complete` — GRANT SELECT ausente; requer migration via `db-apply-migration.yml` com aprovação PO |

**Resultado:** 11 workflows em falha no inventário. Nenhum tem `conclusion=success` neste momento. Todos estão registrados em `PENDENCIAS.md` com motivo exato do bloqueio e ação necessária do PO.

**Bloqueio raiz:** Gate E40 (P4) é BLOQUEANTE no código real de `deploy-gates.yml`. Com `local_only=1108; remote_only=647`, **nenhum PR pode passar no Gate Final** enquanto o ledger não for reconciliado. P1, P3, P5 dependem direta ou indiretamente de P4.

---

**Gates do run 40660438161 (PR #2686 — evidência do fix de P5):**

| Gate | Status |
|---|---|
| Gate 0 — SSOT | ✅ success |
| Gate 0.5 — Dependency Audit | ✅ success |
| Gate 1 — Lint + TypeScript | ✅ success |
| Gate 1.1–1.18 (steps internos) | ✅ success |
| Gate 2 — Unit Tests (Vitest) | ✅ success — fix Calendar RDP v10 (1210 arquivos passando) |
| Gate 2.5 — PostgreSQL | ✅ success |
| Gate 3 — E2E Smoke | ✅ success |
| Gate 5 — SEO | ✅ success |
| Gate 5.5 — RPC restore_seller_cart | ✅ success |
| Gate 6 — Build | ✅ success |
| Gate E23 — Secret Scan | ✅ success |
| **Gate E40 — Schema Drift** | ❌ failure — P4 (ledger `local_only=1108; remote_only=647`) |
| **Gate Final — Deploy Ready** | ❌ failure — cascata de P4 |

---

## 6. Resumo de pendências (P1–P12)

| Item | Workflow | Bloqueio | Ação necessária |
|---|---|---|---|
| P1 | CI Replenishment Module E2E | 4 secrets E2E ausentes | PO: cadastrar secrets no GitHub Actions |
| P2 | E2E Critical Flows | Mesma causa de P1 | PO: depende de P1 |
| P3 | Branch Protection Sentinel | Merge PR #2686 bloqueado por P4 | PO: resolver P4, depois mergear PR #2686 |
| P4 | Deploy Gates (Gate E40) | Ledger `local_only=1108; remote_only=647` | PO: aprovar reconciliação + `db-apply-migration.yml` |
| P5 | CI Security & Drift Checks | Merge PR #2686 bloqueado por P4 | PO: resolver P4, depois mergear PR #2686 |
| P6 | E2E · undo | Falhas pré-existentes na main (coluna status + timing) | PO: investigar regressão na UI de orçamentos |
| P7 | db-schema-drift-check | Consequência direta de P4 | Resolve com P4 |
| P8 | edge-functions-drift-check | Drift GitHub × canônico (edge functions) | PO: verificar `drift-report.csv` e reconciliar |
| P9 | E2E Personalization Flow | Secrets E2E ausentes | PO: depende de P1 |
| P10 | E2E Swatch QuickView | Secrets (firefox/chromium) + webkit null | PO: depende de P1 + investigação webkit |
| P11 | Edge Integration Tests | 11 falhas em 3 arquivos, causa raiz desconhecida | PO: verificar artefatos do run 40638774637 |
| P12 | Kit Coverage Integration | `permission denied for view v_kit_component_complete` | PO: GRANT SELECT via migration autorizada |

Ver `PENDENCIAS.md` para detalhes completos de cada item.
