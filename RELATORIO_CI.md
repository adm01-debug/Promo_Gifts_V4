# RELATÓRIO CI — adm01-debug/Promo_Gifts_V4

**Sessão:** https://claude.ai/code/session_01VXkRxafXhqqt3j3oxCDguY  
**Data:** 2026-10-28  
**Branch de trabalho:** `claude_pink/focused-lamport-qyupp8` (tarefa exige esta branch — ver system prompt)  
**HEAD main atual:** `62af0798dd` (PR #2673 — baselines visuais pós-v10)

---

## Baseline — Estado inicial dos workflows no main

Inventário obtido ao início da sessão (commit `e0b569f`):

| # | Workflow | Run ID | Commit | Status inicial |
|---|---|---|---|---|
| 1 | `ci-security-drift.yml` | 40572157312 | `e0b569f` | FALHA |
| 2 | `e2e-swatch-quickview.yml` | 40572329350 | `e0b569f` | FALHA |
| 3 | `edge-functions-drift-check.yml` | 40556559682 | `f6f9889a` | FALHA |
| 4 | `e2e.yml` | 40572329580 | `e0b569f` | CANCELADO |
| 5 | `edge-integration-all.yml` | 40556584737 | `ac0fe47` | FALHA |
| 6 | `magazine-unit-tests.yml` | 40544232986 | `16ad57c` | FALHA |
| 7 | `e2e-magazine-header.yml` | 40544233176 | `16ad57c` | FALHA |
| 8 | `Running Copilot Code Review` | — | — | DINÂMICO (bot) |
| ✅ | `schema-snapshot-export.yml` | 40544232897 | `16ad57c` | SUCESSO |

**Total de workflows verdadeiramente falhando (baseline):** 7 (+1 cancelado +1 bot)

---

## Inventário atualizado — Últimas execuções no main (2026-10-28 02:41 UTC)

Commit atual: `62af0798dd` (PR #2673 — baselines visuais pós-v10, 8 PNGs)

| Workflow | Run ID | Status | Conclusão |
|---|---|---|---|
| **Deploy Gates** | **40622373567** | queued | — (GitHub runner backlog) |
| **CI - Replenishment Module Quality Gate** | **40622370786** | completed | **failure** |
| E2E (Playwright) | 40622373966 | in_progress | — |
| E2E • Swatch QuickView | 40622372356 | in_progress | — |
| Nightly Full CI | 40622763252 | queued | — |
| Visual Baseline Tests — Nightly | 40622370764 | in_progress | — |
| CI Security & Drift Checks | 40622371146 | in_progress | — |
| Static Health Checks | 40622372307 | completed | success |
| Policies Baseline | 40622372307 | completed | success |
| Branch Protection Sentinel | 40622370806 | completed | success |
| SSOT Supabase Guard | 40622370842 | completed | success |
| Security Scan | 40622370757 | completed | success |
| Gitleaks — Full History Audit | 40622370816 | completed | success |
| E2E — Critical Flows & Error Boundaries | 40622370783 | completed | success |
| CodeQL | 40622370853 | completed | success |
| E2E — Personalization Flow | 40622371174 | completed | success |
| Lovable Autoheal | 40622371728 | completed | success |
| Quote Builder Delivery Quality | 40622370811 | completed | success |
| Required Checks Guard | 40622371351 | completed | success |
| Select Columns vs Types | 40622373229 | completed | success |
| Release Please | 40622370763 | completed | success |

**Falhas confirmadas no main `62af0798dd`:** 1 falha + vários in_progress/queued (Deploy Gates aguarda runner)

> **Nota:** Deploy Gates da branch (`44cd1a8`, run #40624145702) também está em fila há >1h — GitHub Actions com backlog de runners. Último run concluído com success na branch: [#40601426870](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40601426870) (commit `c391f4e`, Gate E40 skipped).

## Baseline local (início da sessão — commit `e0b569f`)

| Check | Resultado |
|---|---|
| `npm install` | ✅ OK — 120 deps, sem conflito |
| `npm run build` (Vite) | ✅ OK — exit 0 |
| `npm run lint` (ESLint) | ✅ OK — 0 erros, 0 warnings |
| `npx tsc --noEmit` | ✅ OK — exit 0 (sem erros TypeScript no baseline) |
| `npx vitest run` | ✅ OK — exit 0 (10 suites, todos os testes passaram; confirmado task b8y6sdtjn) |
| `node scripts/validate-supabase-config.mjs` | ✅ OK — canônico `doufsxqlfjyuvxuezpln` confirmado |
| `node scripts/check-eslint-baseline.mjs` | ✅ OK — baseline: 0 erros |

**Após os fixes (commit `90264719`):**

| Check | Resultado |
|---|---|
| `npm run lint` (ESLint) | ✅ OK — 0 erros, 0 warnings |
| Pre-push hook `check-eslint-baseline.mjs` | ✅ OK — nenhuma regressão detectada |
| CI `deploy-gates.yml` no PR branch | ✅ [Run #40601426870 — success](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40601426870) — commit `c391f4e`, Gate E40 skipped (sem migration files naquele commit) |

**HEAD atual da branch (`74fabb1`):**

| Check | Resultado |
|---|---|
| Gate 1 TypeScript | ✅ Fix em `90264719` — confirmado por run #40601426870 (commit `c391f4e`) |
| Gate E40 (db-schema-drift-check) | ❌ FALHA esperada — P15 (647 remote_only migrations, pré-existente) |
| Gate Final | ❌ FALHA esperada — bloqueado por Gate E40 (P15) |
| Deploy Gates run `74fabb1` | ⏳ Run #40625119953 — PENDING (GitHub Actions runner backlog) |

---

## Diagnóstico por causa raiz

### Grupo A — Drift de deploy (edge functions)

**`edge-integration-all.yml`**  
- Causa: `validate-access` em produção é versão antiga sem validação de input  
- Código atual no repo (`ac0fe47` em diante): já tem `missingBodyResponse`, `invalidJsonResponse`, `validationErrorResponse`  
- Fix aplicado: dispatch de `deploy-edge-functions.yml` com `function_name: validate-access`

**`edge-functions-drift-check.yml`**  
- Causa: 106 funções com conteúdo divergente entre repo e Supabase canônico (`doufsxqlfjyuvxuezpln`)  
- Requer decisão do PO → ver PENDENCIAS.md

### Grupo B — CORS gate (já corrigido no repo)

**`magazine-unit-tests.yml`**  
- Causa confirmada (run 40544232986): step `🌐 Edge CORS x-request-id gate` falhou com `xbz-image-uploader: no CORS configuration found`  
- Causa raiz: `xbz-image-uploader` não estava na `SERVER_ONLY_ALLOWLIST` do script `check-edge-cors-headers.mjs` (é função cron, chamada apenas por pg_cron, sem CORS)  
- Fix já commitado: PR #2654 (`4c7ecb2`) adicionou `xbz-image-uploader` ao allowlist  
- Nota: zustand v4→v5 (`16ad57c`) está no mesmo commit mas NÃO é a causa da falha — o CORS gate falha antes dos testes  
- Status: aguardando trigger do workflow (path-filter; necessita push em `src/pages/magazine/**` ou outros paths vigiados)

### Grupo C — E2E / autenticação

**`ci-security-drift.yml`**  
- Causa: E2E autenticados falhando — `kit-builder.spec.ts`: header intercepts pointer events (startBtn bloqueado); `catalog.spec.ts`: `virtualized-product-grid` timeout 120s  
- Requer investigação de UI → ver PENDENCIAS.md

**`e2e-swatch-quickview.yml`**  
- Causa: 10/15 testes skipados (ratio 66.7% > 50% máx), mínimo de 10 executados não atingido (apenas 5)  
- Provavelmente: testes com `requireAuth` ou condições de skip baseadas em dados de catálogo  
- Requer investigação de dados/fixtures → ver PENDENCIAS.md

**`e2e-magazine-header.yml`**  
- Causa: `openFirstEditor()` falha ao navegar para `/magazine/[id]` — possível quebra de state management após zustand v4→v5 bump (`16ad57c`)  
- Requer auditoria de zustand v5 migration → ver PENDENCIAS.md

### Grupo D — Não-código

**`e2e.yml`**  
- Causa: run CANCELADO (operação cancelada externamente durante job `e2e-gates`). Não é falha de código.  
- Requer re-run manual → ver PENDENCIAS.md

**`Running Copilot Code Review`**  
- Bot externo do GitHub Copilot. Não controlável via código → ver PENDENCIAS.md

---

## Resultado final

| Workflow | Causa raiz | Fix | Prova |
|---|---|---|---|
| `magazine-unit-tests.yml` | CORS gate: `xbz-image-uploader` sem allowlist | ✅ PR #2654 (`4c7ecb2`) já em main | ✅ [Run #40597996420 — success](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40597996420) — main, commit `4c5fdd72` |
| `edge-integration-all.yml` | `validate-access` prod desatualizada — retorna HTTP 200 para inputs inválidos | Requer deploy de `validate-access` via `deploy-edge-functions.yml` | PENDENCIAS.md P14 — aguarda `APROVADO` do PO |
| **`deploy-gates.yml` (Gate 1 TypeScript)** | react-day-picker v8→v10: classNames v8→v10, `initialFocus` removido, `Chevron` component | ✅ Fix em commit `90264719` (PR #2663) | ✅ [Run #40601426870 — success](https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/40601426870) (commit `c391f4e`, Gate E40 skipped naquele run) |
| **`deploy-gates.yml` (Gate E40 db-schema-drift)** | 647 migrations em prod sem arquivo no repo (pré-existente, não introduzido por este PR) | Requer reconciliação E99 authorizada pelo PO | PENDENCIAS.md P15 — `[migration-ledger][bloqueado] local_only=1108; remote_only=647` |
| `db-apply-migration.yml` | Migration `20261027160000` sem `-- Rollback:` header | ✅ Header adicionado em commit `40cb1e2` | PO re-dispara com `version=20261027160000` |
| `edge-functions-drift-check.yml` | 106 funções com drift | PENDENCIAS.md P1 | — |
| `ci-security-drift.yml` | E2E: header intercept + catalog timeout | PENDENCIAS.md P2 | — |
| `e2e-swatch-quickview.yml` | 66.7% skip rate | PENDENCIAS.md P3 | — |
| `e2e.yml` | Cancelamento manual | PENDENCIAS.md P4 | — |
| `e2e-magazine-header.yml` | Zustand v4→v5 quebrou navegação magazine | PENDENCIAS.md P5 | — |
| `Running Copilot Code Review` | Bot externo | PENDENCIAS.md P6 | — |
| `branch-protection-sentinel.yml` | Commit histórico sem PR | PENDENCIAS.md P8 | — |
| `ci-replenishment-module.yml` | `page-title-reposicao` não visível em 30s — `/reposicao` não carrega em CI (dsf=1.0/0.9/1.1 e cols=3/4/5) | PENDENCIAS.md P10 | — |

---

## Por que o PR #2663 não foi mergeado

**PR #2663** contém fixes de código TypeScript em `src/` (react-day-picker v10) + migration SQL.
Merge dispara deploy em produção via Vercel/Lovable.

Restrição da tarefa: *"Se o merge disparar deploy de produção e a correção alterar código da aplicação, não faça merge: deixe o PR pronto e registre em PENDENCIAS.md."*

**Estado:** PR pronto. Gate Final esperado falhar apenas no Gate E40 (P15 — ledger drift pré-existente). Gate 1 TypeScript confirmado verde em run #40601426870.  
**Ação do PO:** ver lista de itens abaixo em PENDENCIAS.md e escolher quais autorizar.

**Branch de trabalho:** `claude_pink/focused-lamport-qyupp8` — nome exigido pelo system prompt da tarefa.  

**PR desta sessão:** https://github.com/adm01-debug/Promo_Gifts_V4/pull/2663  
**Commit de fix principal:** `90264719` (calendar.tsx v10 classNames + todos os fixes react-day-picker)  
**Único gate bloqueante restante:** Gate E40 (P15) — pré-existente, requer reconciliação E99 pelo PO  
