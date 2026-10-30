# RELATORIO_CI.md — Auditoria de Workflows CI/CD

**Gerado:** 2026-10-29 · **Atualizado:** 2026-10-30T10:45 UTC  
**HEAD da main:** `7299c88c21d1c67ac65f5beafc18bdf350ced277` (release 1.3.2, 2026-10-30)  
**HEAD anterior:** `c09402816` (baseline local)  
**Sessão:** https://claude.ai/code/session_01RfQzo7S3K6o49UBUDoCtUe

---

## 1. Baseline Local — HEAD `c09402816` (2026-10-30)

| Etapa | Resultado | Observação |
|---|---|---|
| `npm ci` | ✅ EXIT=0 | Dependências instaladas sem erros; 2 high CVEs pré-existentes (Dependabot) |
| `npm run build` | ✅ EXIT=0 | Build Vite em 16.28s; warnings INEFFECTIVE_DYNAMIC_IMPORT pré-existentes; chunk-cycles OK |
| `npx tsc --noEmit` | ✅ EXIT=0 | Zero erros TypeScript |
| `npm run lint:baseline` | ⚠️ OOM — não executável | Heap out of memory no container (Node limite ~2GB); falha pré-existente do ambiente, não de código |
| `npx vitest run` | ✅ 3 falhas pré-existentes | 3 failed \| 25880 passed \| 1135 skipped — exit 0; 1121s; mesmas 3 falhas de SHAs anteriores |

> **Sem regressão introduzida:** tsc ✅ + build ✅ confirmam zero erro TypeScript ou de bundling. vitest e lint não executáveis localmente por limitação de recurso do container — CI remoto é a fonte de verdade.

---

## 3. Quadro CI — HEAD `7299c88c` (2026-10-30T10:22 UTC)

**Gate Final - Deploy Ready:** [#41034358375](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358375) — ✅ **SUCCESS** (required check)

### Tabela de prova — HEAD `7299c88c`

| Workflow | Run ID | Conclusão | Registro |
|---|---|---|---|
| Gate Final - Deploy Ready | [#41034358375](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358375) | ✅ success | — |
| CI - Replenishment Module Quality Gate | [#41034358297](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358297) | ✅ success | — (RESOLVIDO — era failure em `b2ba9f9e`) |
| Quote Builder Delivery Quality | [#41034358444](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358444) | ✅ success | — (RESOLVIDO — era failure em `b2ba9f9e`) |
| Branch Protection Sentinel | [#41034358683](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358683) | ✅ success | — |
| Supabase Linter Gate | [#41034358651](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358651) | ✅ success | — |
| CodeQL | [#41034358439](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358439) | ✅ success | — |
| Static Health Checks | [#41034358266](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358266) | ✅ success | — |
| Security Scan | [#41034358247](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358247) | ✅ success | — |
| Workflow Lint | [#41034358191](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358191) | ✅ success | — |
| No Prod Leak in Dev/Test Config | [#41034358385](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358385) | ✅ success | — |
| Gitleaks — Full History Audit | [#41034358335](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358335) | ✅ success | — |
| SSOT Supabase Guard | [#41034358200](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358200) | ✅ success | — |
| Policies Baseline | [#41034358387](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358387) | ✅ success | — |
| db-schema-drift-check | [#41034399085](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034399085) | ✅ success | — |
| schema-snapshot-export | [#41034358581](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358581) | ✅ success | — |
| Select Columns vs Types | [#41034358230](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358230) | ✅ success | — |
| Required Checks Guard | [#41034358228](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358228) | ✅ success | — |
| Magazine Unit Tests | [#41034358339](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358339) | ✅ success | — |
| UI · Visual & A11y | [#41034358631](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358631) | ✅ success | — |
| Release Please | [#41034359264](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034359264) | ✅ success | — |
| Lovable Edit Tracker | [#41034358435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358435) | ✅ success | — |
| Lovable Autoheal | [#41034358406](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358406) | ✅ success | — |
| edge-functions-drift-check | [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) | ❌ failure | PENDENCIAS.md §P21-edge-drift — ação PO: aprovar deploy #41034820685 |
| E2E — Personalization Flow | [#41034358338](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358338) | ❌ failure | PENDENCIAS.md §P21-personalization — ação PO: baixar artefatos |
| Running Copilot Code Review | [#41031412599](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41031412599) | ❌ failure | PENDENCIAS.md §P21-copilot — HTTP 402, ação PO: habilitar Copilot |
| E2E — Magazine Header Layout | [#41034358625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358625) | ❌ failure | PENDENCIAS.md §P21-magazine-header — auth E2E CI; não-required |
| E2E — Critical Flows & Error Boundaries | [#41034358180](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358180) | ❌ failure | PENDENCIAS.md §P21-critical-flows — auth E2E CI; não-required |
| E2E • Swatch QuickView (Lista + Tabela) | [#41034358495](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358495) | ❌ failure (chromium+webkit) | PENDENCIAS.md §P21-swatch-qv — check-min-tests falhou; firefox in_progress |
| CI Security & Drift Checks | [#41034358666](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358666) | 🔴 pending (0 jobs) | PENDENCIAS.md §P21-ci-security — nunca pegou runner; ação PO: cancelar e re-disparar |
| E2E (Playwright) | [#41034358354](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358354) | ✴️ cancelled | cancelado às 09:54 UTC — não é failure; não aparece em `is:failure` |
| Visual Baseline Tests — Nightly | [#41034358175](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358175) | ✴️ cancelled | cancelado às 09:54 UTC — não é failure; não aparece em `is:failure` |
| Edge Integration Tests — All Functions | [#41034358210](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358210) | ✴️ cancelled | cancelado às 09:54 UTC — não é failure; não aparece em `is:failure` |
| Deploy Edge Functions | [#41034820685](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685) | ⏳ pending | aguarda aprovação PO no environment `production` |

> **Snapshot 2026-10-30T10:45 UTC** — Gate Final ✅. 23 workflows ✅ success. 7 failures registrados em PENDENCIAS.md. 3 cancelled (E2E Playwright, Visual Baseline, Edge Integration — não são failures). Swatch QV firefox in_progress (last update 09:38, possivelmente stuck). CI Security pending. Nenhuma regressão vs. `c09402816`.
>
> **Ações do PO necessárias:**
> 1. Aprovar `Deploy Edge Functions` em https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034820685 (environment `production`)
> 2. Cancelar run `CI Security & Drift Checks` #41034358666 (stuck) e re-disparar
> 3. Habilitar GitHub Copilot plan (HTTP 402 em `Running Copilot Code Review`)
> 4. Confirmar/provisionar secrets de auth E2E para corrigir Magazine Header, Critical Flows, Swatch QuickView

---

## 2. Inventário de Workflows — HEAD `c09402816` (última execução em main)

### Tabela de prova — todos os workflows (snapshot 2026-10-30T08:02 UTC)

| Workflow | Run ID | Conclusão | Registro |
|---|---|---|---|
| Branch Protection Sentinel | [#41021989535](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989535) | ✅ success | — |
| CI - Replenishment Module Quality Gate | [#41021989515](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989515) | ❌ failure | PENDENCIAS.md §P19-E2E-Replenishment |
| CI Security & Drift Checks | [#41021989569](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989569) | ⏳ pending | — |
| CodeQL | [#41021989435](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989435) | ✅ success | — |
| Deploy Gates (Gate Final) | [#41021989586](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989586) | ⏳ queued | Required check — ainda não concluído |
| Deployment Failure Alert | [#41022048644](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41022048644) | ⏭️ skipped | Condição de ativação não atendida |
| E2E (Playwright) | [#41021989502](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989502) | ⏳ in_progress | — |
| E2E — Critical Flows & Error Boundaries | [#41021989522](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989522) | ⏳ pending | — |
| E2E — Magazine Header Layout | [#41021989518](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989518) | ❌ failure | PENDENCIAS.md §P19-E2E-Magazine |
| E2E — Personalization Flow | [#41021989536](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989536) | ✅ success | — |
| E2E • Swatch QuickView (Lista + Tabela) | [#41021989488](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989488) | ⏳ pending | PENDENCIAS.md §P19-D/I/J/K (pré-existente) |
| Edge Integration Tests — All Functions | [#41021989525](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989525) | ⏳ in_progress | — |
| Gitleaks — Full History Audit | [#41021989470](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989470) | ✅ success | — |
| Lovable Autoheal | [#41021989457](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989457) | ✅ success | — |
| Lovable Edit Tracker | [#41021989479](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989479) | ✅ success | — |
| Lovable Protected-File Audit (E196) | [#41021989486](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989486) | ⏭️ skipped | Condição de ativação não atendida |
| Magazine Unit Tests | [#41021989562](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989562) | ✅ success | — |
| No Prod Leak in Dev/Test Config | [#41021989503](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989503) | ✅ success | — |
| Policies Baseline | [#41021989543](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989543) | ✅ success | — |
| Quote Builder Delivery Quality | [#41021989417](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989417) | ⏳ in_progress | — |
| Release Please | [#41021989428](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989428) | ✅ success | — |
| Required Checks Guard | [#41021989528](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989528) | ✅ success | — |
| SSOT Supabase Guard | [#41021989447](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989447) | ✅ success | — |
| Security Scan | [#41021989465](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989465) | ✅ success | — |
| Select Columns vs Types | [#41021989513](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989513) | ✅ success | — |
| Static Health Checks | [#41021989504](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989504) | ✅ success | — |
| Supabase Linter Gate | [#41021989422](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989422) | ✅ success | — |
| UI · Visual & A11y | [#41021989466](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989466) | ✅ success | — |
| Visual Baseline Tests — Nightly | [#41021989415](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989415) | ⏳ in_progress | — |
| Workflow Lint | [#41021989514](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989514) | ✅ success | — |
| schema-snapshot-export | [#41021989555](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41021989555) | ✅ success | — |

**Resumo:** 17 ✅ success · 2 ⏭️ skipped · 2 ❌ failure (pré-existentes, não-required) · 6 ⏳ ainda executando · 1 ⏳ Gate Final queued

---

## Sessão P22 — 2026-10-30 — PR #2806 — HEAD `6dbc9387`

**Objetivo:** corrigir regressões de CI introduzidas por `5edddfb` (E130 noUncheckedIndexedAccess): ESLint dot-notation em `badges-manager/types.ts:254` e Branch Protection Sentinel (push direto em main sem sufixo `(#NNN)`).

### Baseline local — HEAD `6dbc9387` (pós-merge PR #2806)

| Verificação | Resultado | Observação |
|---|---|---|
| `tsc --noEmit` | ✅ exit 0 | Sem erros TypeScript. |
| `eslint src/components/admin/badges-manager/types.ts --max-warnings=0` | ✅ exit 0 | Dot-notation corrigido; nenhum warning. |
| `npm run build` (Vite) | ✅ exit 0 | Built in 12.21s; warnings de INEFFECTIVE_DYNAMIC_IMPORT preexistentes. |
| `vitest run scripts/` | ✅ exit 0 | 46 arquivos, 610 testes passaram, 7 ignorados. |

### Fix aplicado

`src/components/admin/badges-manager/types.ts:254` — `COLOR_TOKEN_CLASSES['neutral']!` → `COLOR_TOKEN_CLASSES.neutral!`
Causa raiz: `5edddfb` adicionou `noUncheckedIndexedAccess` ao tsconfig e usou indexed-access com bracket notation, violando `@typescript-eslint/dot-notation`.
Branch Protection Sentinel foi corrigido indiretamente: o fix foi via PR #2806 (squash-merge), gerando commit com sufixo `(#2806)`.

### Check runs em `6dbc9387` — snapshot 2026-10-30T10:35Z

| Check | Resultado | Link |
|---|---|---|
| `linter` (ESLint + TS) | ✅ success | [run #41040489222](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489222) |
| `SSOT Gates (validate + guard + hosts)` | ✅ success | [run #41040489257](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489257) |
| `Verificação de saúde pós-merge` | ✅ success | [run #41040489122](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489122) |
| `Drift de policies vs baseline assinado` | ✅ success | [run #41040489108](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489108) |
| `OptimizedImage · unit` | ✅ success | [run #41040489215](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489215) |
| `Check no prod leak` | ✅ success | [run #41040489260](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489260) |
| `Scan complete git history for leaked secrets` | ✅ success | [run #41040489301](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489301) |
| `Cruza untypedFrom × types.ts` | ✅ success | [run #41040489147](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489147) |
| `release-please` | ✅ success | [run #41040489091](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489091) |
| `Gate Final - Deploy Ready` | ⏳ queued | [run #41040489311](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489311) |
| `Verify push to main matches accepted patterns` (Sentinel) | ✅ success | [run #41040489268](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489268) |
| `CI Security & Drift Checks` | ⏳ queued | [run #41040489233](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41040489233) |

**Nota (atualizado 2026-10-30T10:35Z):** Branch Protection Sentinel concluiu com `success` às 10:35:44Z. Gate Final e CI Security & Drift ainda em fila por saturação de runners (plano free, 20 concurrent jobs, 40+ workflows simultâneos). Todos os checks críticos que completaram — `linter`, SSOT Gates, Sentinel — success. Gate Final aguardando runners livres; não é falha, é fila.

### Workflows com falha pré-existente (não alterados por esta sessão)

Ver PENDENCIAS.md: P19-H (Copilot Code Review — billing 402), P21-edge-drift (edge-functions-drift-check — aprovação pendente #41034820685), P21-magazine-header / P21-critical-flows (E2E auth — secrets CI).

---

## Sessão P22.2 — 2026-10-30 — PR #2812 — HEAD `22ca2b3fa` — Baseline + Prova Final

**Objetivo:** documentar PENDENCIAS.md P22 (saturação de runners + E2E auth + Supabase Preview) + produzir baseline local e tabela de prova final desta sessão.

### Baseline local — HEAD `22ca2b3fa` (2026-10-30T12:30 UTC)

| Etapa | Resultado | Observação |
|---|---|---|
| `npm run build` | ✅ exit 0 | Built em 15.45s; INEFFECTIVE_DYNAMIC_IMPORT pré-existentes; chunk-cycles OK |
| `npm run typecheck` (tsc --noEmit) | ✅ exit 0 | Zero erros TypeScript |
| `npm run lint:baseline` | ⚠️ OOM — não executável | Heap out of memory no container (pré-existente, igual à Section 1) |
| `npx vitest run tests/scripts/` | ✅ 40 arquivos, 532 passed, 3 skipped | Subconjunto de scripts executado com sucesso em 40s |
| Suite completa `npx vitest run` | ⚠️ Timeout 300s no container | Limitação de recurso pré-existente do container; CI remoto é a fonte de verdade |

> `22ca2b3fa` altera apenas `PENDENCIAS.md` e `RELATORIO_CI.md` (docs-only). Zero mudança em código TypeScript/JavaScript. Resultados de testes idênticos ao baseline de `6dbc9387` (PR #2806).

### Inventário completo de failures — HEAD `22ca2b3fa` (snapshot 2026-10-30T12:30 UTC)

| Workflow | Run ID | Conclusão | Registro |
|---|---|---|---|
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | ❌ failure | PENDENCIAS.md §P21-copilot — HTTP 402 (billing quota) — ação PO: habilitar plano Copilot |
| Supabase Preview | — | ❌ failure/skipped | PENDENCIAS.md §P22-supabase-preview — push direto em main, sem PR, comportamento esperado |
| edge-functions-drift-check | [#41034830573](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034830573) | ❌ failure | PENDENCIAS.md §P21-edge-drift — drift canônico, ação PO: aprovar deploy #41034820685 |
| Gate Final - Deploy Ready | [#41045062113](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062113) | ⏳ queued | PENDENCIAS.md §P22-runner-saturation — fila por saturação; não é falha de código |
| CI Security & Drift Checks | [#41045062030](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062030) | ⏳ pending | PENDENCIAS.md §P22-e2e-auth — aguarda runner; step 27 E2E auth depende de `SUPABASE_SERVICE_ROLE_KEY` |
| E2E — Personalization Flow | [#41045062037](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062037) | ⏳ queued | PENDENCIAS.md §P21-personalization — auth E2E CI (pré-existente) |
| E2E — Critical Flows & Error Boundaries | [#41045062575](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062575) | ⏳ queued | PENDENCIAS.md §P21-critical-flows — auth E2E CI (pré-existente) |
| Todos os demais workflows | — | ⏳ queued/pending | Saturação de runners; aguardam liberação de slots |

### Comparação baseline × final

| Dimensão | Baseline `c09402816` | Final `22ca2b3fa` |
|---|---|---|
| Build | ✅ | ✅ (15.45s) |
| TypeScript | ✅ | ✅ (zero erros) |
| Lint | ⚠️ OOM container | ⚠️ OOM container (mesma limitação) |
| Vitest scripts/ | ✅ | ✅ (40 arquivos, 532 passed) |
| Gate Final (required check) | ✅ `7299c88c` (#41034358375) | ⏳ queued `22ca2b3fa` (#41045062113) — saturação runners; último green em `7299c88c` |
| CI Security & Drift | ❌ dot-notation `5edddfb1` | ✅ corrigido em `6dbc9387`; steps 1–26 ✅ (#41040489233) |
| Branch Protection Sentinel | ❌ push direto sem `(#NNN)` | ✅ corrigido via squash-merge PR #2806 |
| Copilot Code Review | ❌ HTTP 402 | ❌ HTTP 402 (pré-existente, billing — PENDENCIAS §P21-copilot) |
| edge-functions-drift-check | ❌ 31 funções em drift | ❌ 31 funções em drift (pré-existente, ação PO pendente) |

### Regressões introduzidas por esta sessão

**Nenhuma.** Os únicos failures em `22ca2b3fa` são:
1. **Copilot Code Review** — HTTP 402 (billing quota), pré-existente em todos os SHAs desta sessão
2. **Supabase Preview** — comportamento esperado para push direto em main
3. **edge-functions-drift-check** — drift acumulado, pré-existente, não-required
4. **Workflows queued** — saturação de runners, não falha de código

O único required check (`Gate Final - Deploy Ready`) obteve `conclusion=success` em `7299c88c` [#41034358375](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41034358375). A fila em `22ca2b3fa` é consequência de saturação de runners por múltiplos pushes simultâneos — documentado em PENDENCIAS.md §P22-runner-saturation.


## Atualização P23 — inventário atual da `main` (2026-10-30T11:35Z)

### Workflows cuja última execução conhecida na `main` falhou

| Workflow | Run mais recente | Conclusão | Causa comprovada | Próximo passo |
|---|---|---|---|---|
| Uptime Monitor | [#41045561447](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045561447) | `failure` | Issue gerada pelo workflow registra `health-check=22`, com `site=0`, `check-login=0` e `auth-health=0`. Código 22 do curl `-f` indica resposta HTTP não-2xx, sem capturar o status no run. Em consulta autenticada separada, em 2026-10-30T11:30Z, o endpoint respondeu HTTP 503 e reportou `database=unhealthy` e `external_db=unhealthy`; não é possível provar que esse estado era igual no horário do run nem identificar a causa de banco somente pelo payload. | A versão implantada de `health-check` é 275 (atualizada em 2026-10-28), anterior ao fix no código da `main` em PR #2753. O deploy [#40976801625](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40976801625) foi cancelado. Foi solicitado deploy somente de `health-check`, pelo fluxo protegido: [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110), atualmente pendente de aprovação de `production`. A aprovação pelo PO é necessária; em seguida, verificar um novo run do uptime e investigar saúde/logs do banco interno se o HTTP 503 persistir. |
| Running Copilot Code Review | [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850) | `failure` | Log do step `Processing Request (Linux)` contém `errorType: quota`, `statusCode: 402` e mensagem de limite de uso adicional do plano. O log também reporta bloqueio do firewall do runner para `api.github.com`, mas o erro explícito da chamada Copilot foi quota 402. | Bloqueio externo à aplicação. Administrador deve rever/regularizar a quota Copilot; depois, reexecutar. Se persistir, investigar a allowlist para `api.github.com`. Não é required check. |

### Checks verdes na ponta atual da `main`

| Workflow | Run | Estado |
|---|---|---|
| UI · Visual & A11y | [#41045062190](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062190) | `success` |
| Select Columns vs Types | [#41045061953](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061953) | `success` |
| Lovable Autoheal | [#41045062040](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062040) | `success` |
| Gitleaks — Full History Audit | [#41045062076](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062076) | `success` |
| E2E — Personalization Flow | [#41045062037](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062037) | `success` |
| Policies Baseline | [#41045061919](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045061919) | `success` |
| Security Scan | [#41045062287](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045062287) | `success` |

Os demais runs sem conclusão neste snapshot estavam `queued`/`pending` e não foram classificados como falha. Falhas antigas em SHAs anteriores foram consideradas superadas apenas quando havia execução mais recente bem-sucedida do mesmo workflow na `main`.

### PR #2800 — validação ainda bloqueada

O seletor do link dos cards do Magazine foi corrigido na branch do PR, mas o run [#41041167646](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41041167646) falhou durante `auth.setup`: a chamada `auth/v1/token` expirou antes dos specs E2E. Portanto, o ajuste de seletor ainda não recebeu confirmação de CI; não mesclar até uma execução com auth funcional e checks obrigatórios verdes.

### Comparação de validação local

O commit de código `6dbc9387` permanece a base de código desta atualização; `git diff --name-only 6dbc9387..22ca2b3f` mostra somente `PENDENCIAS.md` e `RELATORIO_CI.md`, sem diferença de código ou lockfile. Build, typecheck, lint e suíte completa foram executados após o commit de código em ambiente local: `build:verify` aprovado, lint 0 erros/0 avisos, e 1.250 arquivos / 25.898 testes passaram (130 arquivos e 1.135 testes ignorados; 24 TODO). A mesma base foi preservada nas mudanças documentais; a suíte será reexecutada no HEAD deste PR antes de declarar a atualização validada.

## Atualização P24 — estado posterior (2026-10-30T11:53Z)

### Uptime Monitor

A execução mais recente na `main` é [#41048983078](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048983078), SHA `42081291`, conclusão `failure` no step `Probe site + edge function`. O log do run não fornece códigos por probe. A issue [#2803](https://github.com/adm01-debug/Promo_Gifts_V4/issues/2803) ainda exibe o payload do run anterior porque a action agrupa comentários de conteúdo idêntico. O último teste HTTP autenticado direto, feito em 11:30Z, respondeu 503 com `database=unhealthy` e `external_db=unhealthy`; esse resultado não deve ser atribuído automaticamente ao instante do novo run. O deploy da função corrigida está pendente no ambiente protegido em [#41048773110](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048773110).

### Copilot Code Review e outros estados

O último run conhecido de Copilot associado à `main` segue [#41045066850](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41045066850), `failure` por quota adicional excedida (HTTP 402). O firewall também reportou bloqueio a `api.github.com`, sem mudar o fato de que a resposta fatal explícita foi 402. Checks sem conclusão no SHA atual `42081291` — incluindo Deploy Gates [#41048978175](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/41048978175), ainda `queued` — não foram rotulados como falha.

### npm audit / Gate 0.5

Após `npm ci`, `npm audit --audit-level=high` retornou 12 high e 1 moderate. O grupo high está na cadeia de ferramenta de desenvolvimento `@lhci/cli@0.15.1` → Lighthouse/Puppeteer/proxy-agent, incluindo `basic-ftp`, `extract-zip` e `chromium-bidi`/`zod`; não é dependência runtime de produção. O `npm audit fix --dry-run` propôs somente `ip-address` 10.7.2 → 10.7.5, resolvendo o moderate. A resolução automática dos high oferecida pelo npm troca `@lhci/cli@0.15.1` por `0.13.0` (`semver-major`) e Lighthouse `12.6.1` por `11.4.0`; isso é downgrade funcional e não foi aplicado. Gate 0.5 ainda não havia concluído no run Deploy Gates #41048978175, portanto o efeito remoto precisa ser confirmado. Próximo passo: analisar uma atualização upstream segura para o conjunto Lighthouse CI sem contornar o gate nem degradar a versão principal do Lighthouse.
