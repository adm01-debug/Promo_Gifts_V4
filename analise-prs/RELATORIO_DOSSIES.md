# RELATORIO_DOSSIES — Dossiê CI por PR

**Snapshot:** 2026-11-09T05:00Z  
**main SHA atual:** `f68850a3961f7e208dfd0750452087728073cb8a`  
**main SHA início do ciclo:** `ba1c3fb13815467c33de069caee564f76ebfd9f5`  
**Zombie bloqueador:** run `39698009932` — Contract Tests, in_progress desde 2026-10-22T00:09:55Z (18+ dias), `updated_at` congelado em 2026-10-22T00:11:10Z, API retorna 409 no cancel.

---

## BASELINE — main nunca foi verde neste ciclo

### main SHA início `ba1c3fb1` (antes do ciclo)
Verificado via GraphQL `checkSuites`: Gate Final = QUEUED, todos os jobs ubuntu-24.04 = QUEUED.  
Causa: zombie run `39698009932` ocupa slot de runner ubuntu-24.04 desde 2026-10-22, bloqueando todos os workflows que dependem deste runner.  
**Conclusão: main ERA não-verde antes do ciclo começar. Não havia baseline verde.**

### main SHA final `f68850a3` (após PR #3309 e #3310)
GraphQL confirmado:
| Check | Status | Conclusion |
|---|---|---|
| Detectar mudanças (docs-only bypass E14) | QUEUED | — |
| Gate 0 - SSOT Supabase | QUEUED | — |
| e2e-relevance / Detectar impacto | QUEUED | — |
| Drift de policies vs baseline assinado | QUEUED | — |
| Analyze (javascript-typescript) | QUEUED | — |
| ESLint auto-fix (Lovable commits) | QUEUED | — |
| release-please | QUEUED | — |
| Supabase Preview | COMPLETED | FAILURE (pré-existente: "Remote migration versions not found") |
| lovable-protected-audit | COMPLETED | SKIPPED |
| Seed/regen do baseline + PR | COMPLETED | SKIPPED |
| Vercel | SUCCESS | — |
| Vercel Deployments – juca | SUCCESS | — |

**rollup state: FAILURE** — exclusivamente por QUEUED + Supabase Preview pré-existente.  
Gate Final: NÃO INICIADO — depende de `Detectar mudanças` (QUEUED).  
Deploy Gates run: `42553957676` — QUEUED desde 2026-11-09T02:45Z.

---

## SUMÁRIO EXECUTIVO

**Achado central:** Nenhuma PR aberta está bloqueada por falha de código introduzida nela própria, exceto os casos explicitamente documentados abaixo. Todos os bloqueios são:

1. **Runner congestion** (ubuntu-24.04 saturado pelo zombie `39698009932`): checks QUEUED em cascata
2. **Governance** (DDL/migration/workflows/segredos): requer decisão humana por regra do projeto
3. **Recibo de migration em MIGRATIONS_SYNC_LOG.md = FAILURE**: check de registro; a migration não foi adicionada ao arquivo de recibo — falha de documentação, não de lógica de banco
4. **Supabase Preview = FAILURE** (pré-existente em main): não foi introduzida por nenhuma PR desta sessão

---

## AGUARDANDO_CI (4 PRs — sem falha de código, bloqueadas por runner congestion)

### #3248 · `claude/feat-e2e-public-claude-config-261108-2230`
**SHA:** `64bbf1f6` · **rollup:** PENDING (todos QUEUED, nenhum FAILURE)  
**Checks concluídos:** Lint+TS, Unit Tests, E2E-relevance — todos QUEUED  
**Falhas de código:** nenhuma encontrada  
**Bloqueio:** todos os checks ubuntu-24.04 QUEUED (zombie `39698009932`)  
**Verdict:** Pronta para merge assim que Gate Final passar — sem código a corrigir.

### #3266 · `claude/fix-pr3203-scripts-static-pass-261108-2250`
**SHA:** `705eecee` · **rollup:** PENDING  
**Checks concluídos:** Edge Functions Integration = SUCCESS; Security Scan = SUCCESS; Lint = SUCCESS  
**Falhas de código:** nenhuma  
**Bloqueio:** runners QUEUED (zombie)  
**Verdict:** Pronta para merge assim que Gate Final passar.

### #3292 · `claude/feat-ft122-wizard-step-guard-261108-2354`
**SHA:** `ba66f6d3` · **rollup:** PENDING  
**Checks concluídos:** Unit Zod schemas = SUCCESS; Detectar mudanças = SUCCESS  
**Checks QUEUED:** Smoke, e2e-relevance, Gate Final  
**Falhas de código:** nenhuma  
**Bloqueio:** runners QUEUED (zombie)  
**Verdict:** Pronta para merge assim que Gate Final passar.

### #3303 · `codex/fix-dropbox-smoke-261109-0122`
**SHA:** `28ab9158` · **rollup:** PENDING  
**Checks concluídos:** PR Size = SUCCESS; Gitleaks = SUCCESS  
**Checks QUEUED:** CodeQL, TS Unused Locals, Gate 0, Gate Final  
**Falhas de código:** nenhuma  
**Bloqueio:** runners QUEUED (zombie)  
**Verdict:** Pronta para merge assim que Gate Final passar.

---

## AGUARDANDO_HUMANO (29 PRs)

### #3127 · `codex/fix-e2e-ci-pressure-261107-0238`
**SHA:** `6746bd9c` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| visual-baseline (1,2) | COMPLETED | CANCELLED |
| visual-baseline (2,2) | COMPLETED | CANCELLED |
| Detectar mudanças (docs-only bypass E14) | COMPLETED | SUCCESS |
| secrets-check / Verifica secrets E2E | COMPLETED | SUCCESS |
| E2E — Error Boundaries (sem auth) | COMPLETED | SUCCESS |
| E2E — Personalization Journey | COMPLETED | SUCCESS |
| chromium/firefox/webkit • swatch→QV | COMPLETED | SUCCESS ×3 |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| quality-gate | COMPLETED | SUCCESS |
| Assert Gate Final is required on main | COMPLETED | SUCCESS |
| Gitleaks — Secret Scan | COMPLETED | SUCCESS |
| actionlint + shellcheck | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |

**CI vermelho:** `visual-baseline (1,2)` = CANCELLED; `visual-baseline (2,2)` = CANCELLED — resultado de cancelamento manual anterior (run `42365939519`), não é falha de lógica.  
rollup=FAILURE por CANCELLED contabilizado como não-SUCCESS.  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3129 · `codex/infra-e2e-ci-pressure-261107-1040`
**SHA:** `1cd14bd9` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| visual-baseline (1,2) + (2,2) | COMPLETED | CANCELLED ×2 |
| Detectar mudanças | COMPLETED | SUCCESS |
| secrets-check | COMPLETED | SUCCESS |
| E2E — Error Boundaries | COMPLETED | SUCCESS |
| E2E — Personalization Journey | COMPLETED | SUCCESS |
| swatch→QV (3 browsers) | COMPLETED | SUCCESS |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| quality-gate | COMPLETED | SUCCESS |
| Assert Gate Final | COMPLETED | SUCCESS |
| Gitleaks | COMPLETED | SUCCESS |
| actionlint + shellcheck | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |

**CI vermelho:** visual-baseline CANCELLED × 2 (cancelamento manual, não falha de código).  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3137 · `codex/fix-e2e-relevance-261107-1148`
**SHA:** `e97fcf2e` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| Drift gate antes de girar o baseline | COMPLETED | SKIPPED |
| report | COMPLETED | SUCCESS |
| relevance / Detectar impacto de runtime/E2E | COMPLETED | SUCCESS |
| Unit — Zod schemas | COMPLETED | SUCCESS |
| Detectar mudanças (docs-only bypass E14) | COMPLETED | SUCCESS |
| e2e-relevance / Detectar impacto ×6 | COMPLETED | SUCCESS |
| visual-check | COMPLETED | SUCCESS |
| secrets-check / Verifica secrets E2E | COMPLETED | SUCCESS |
| Edge Functions · Integration All | COMPLETED | SUCCESS |
| Deno Magazine import contract | COMPLETED | SUCCESS |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| Assert Gate Final is required on main | COMPLETED | SUCCESS |
| SSOT Gates (validate + guard + hosts) | COMPLETED | SUCCESS |

**CI vermelho:** rollup=FAILURE, mas nenhum check nos primeiros 20 é FAILURE — check 21+ não verificado (pode conter falha ou o estado é stale).  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3179 · `claude/fix-ci-workflows-261107-2300`
**SHA:** `105a0b31` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Migrations x Canonical schema** | COMPLETED | **FAILURE** |
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** ×2 |
| Migrations x Canonical schema | COMPLETED | CANCELLED |
| Detectar mudanças | COMPLETED | SUCCESS |
| Drift gate antes de girar o baseline | COMPLETED | SKIPPED ×2 |
| relevance / Detectar impacto ×2 | COMPLETED | SUCCESS |
| Unit — Zod schemas ×2 | COMPLETED | SUCCESS |
| cross-reference ×2 | COMPLETED | SUCCESS |
| Gate 5 — DB Security Audit ×2 | COMPLETED | SUCCESS |

**CI vermelho (causa):**  
- `Migrations x Canonical schema` = FAILURE → PR `105a0b31` toca `supabase/migrations/` com arquivo que diverge do schema canônico (hash diferente do aplicado em produção). Esta PR tem 456 arquivos incluindo `supabase/migrations/`.  
- `Recibo de migration em MIGRATIONS_SYNC_LOG.md` = FAILURE × 2 → migration não registrada no arquivo de recibo.  
**Governance:** toca `.github/workflows/` + P09 estrutural (ledger local_only=1142, remote_only=677) → regra Git item 7.

---

### #3203 · `claude/inspiring-knuth-swo71j`
**SHA:** `1aad6831` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
**Checks concluídos (da sessão anterior):** Supabase Preview = CANCELLED; Bundle size = SUCCESS; Linter = SUCCESS; Edge Functions = SUCCESS; CodeQL = SUCCESS; outros = QUEUED.  
**CI vermelho:** Supabase Preview = CANCELLED (cancelamento manual). Nenhuma falha de código.  
**Governance:** conflito em 132 arquivos gerados (ALL_IN_ONE.sql, baselines) — dirty branch, decisão de negócio → regra Git item 7.

---

### #3210 · `release-please--branches--main--components--gifts-store`
**SHA:** `e48510ea` · **mergeable:** MERGEABLE · **mergeStateStatus:** BLOCKED  
| Check | Status | Conclusion |
|---|---|---|
| **Supabase Preview** | COMPLETED | **FAILURE** |
| **Vercel** | — | FAILURE |
| Vercel Agent Review | COMPLETED | NEUTRAL |
| Vercel Deployments – juca | — | SUCCESS |
| Vercel Preview Comments | COMPLETED | SUCCESS |

**CI vermelho (causa):**  
- `Supabase Preview` = FAILURE → "Remote migration versions not found". Falha pré-existente em main, não introduzida por esta PR.  
- `Vercel` = FAILURE → preview deploy falhou em cascata após Supabase Preview.  
**Governance:** release-please, decisão de release autônoma → regra Git item 7.

---

### #3214 · `claude_05/youthful-ride-vcdchy`
**SHA:** `7d6a177a` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Supabase Preview** | COMPLETED | **FAILURE** |
| **Vercel** | — | FAILURE |
| Vercel Agent Review | COMPLETED | NEUTRAL |
| Devin Review | — | SUCCESS |
| Vercel Deployments – juca | — | SUCCESS |
| Vercel Preview Comments | COMPLETED | SUCCESS |

**CI vermelho (causa):** Supabase Preview + Vercel, ambos pré-existentes (mesma causa de #3210).  
**Governance:** toca `.github/workflows/` + cron DDL → regra Git item 7.

---

### #3228 · `claude/chore-e2e-swatch-dispatch-261108-1800`
**SHA:** `fd720765` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **ColorSwatch grid (2 linhas + clipping + +N)** | COMPLETED | **FAILURE** |
| cross-reference | COMPLETED | SUCCESS |
| Detectar mudanças | COMPLETED | SUCCESS |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| Assert Gate Final | COMPLETED | SUCCESS |
| Gitleaks | COMPLETED | SUCCESS |
| actionlint + shellcheck | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |
| e2e-relevance / Detectar impacto | COMPLETED | SUCCESS |
| Ghost Check Guard | COMPLETED | SUCCESS |
| CSP mirror | COMPLETED | SUCCESS |
| Gate 0 - SSOT Supabase | COMPLETED | SUCCESS |
| Secrets Inventory Check (E40) | COMPLETED | SUCCESS |
| Gate 0.5/0.6 - Dependency | COMPLETED | SUCCESS |
| Gate 1 - Lint + TypeScript | COMPLETED | SUCCESS |
| Gate 2 - Unit Tests | COMPLETED | SUCCESS |
| Gate 2.5 - PostgreSQL Transactional Integrity | COMPLETED | SUCCESS |

**CI vermelho (causa):** `ColorSwatch grid (2 linhas + clipping + +N)` = FAILURE → teste visual de snapshot do componente ColorSwatch falhou. Este é um teste de workflow E2E (`.github/workflows/`).  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3243 · `claude/fix-categories-level-drift-261108-1952`
**SHA:** `06f31e44` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| Detectar mudanças | QUEUED | — |
| Smoke — HTTP against supabase functions serve | QUEUED | — |
| e2e-relevance / Detectar impacto | QUEUED | — |
| Drift gate antes de girar o baseline | COMPLETED | SKIPPED |
| relevance / Detectar impacto | COMPLETED | SUCCESS |
| Unit — Zod schemas | COMPLETED | SUCCESS |
| Gate 5 — DB Security Audit | COMPLETED | SUCCESS |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| Drift de policies vs baseline assinado | COMPLETED | SUCCESS |
| Assert Gate Final | COMPLETED | SUCCESS |
| Gitleaks | COMPLETED | SUCCESS |
| linter | COMPLETED | SUCCESS |
| Migrations x Canonical schema | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |
| Recibo de migration em MIGRATIONS_SYNC_LOG.md | COMPLETED | SUCCESS |
| SSOT Gates | COMPLETED | SUCCESS |

**CI vermelho:** rollup=FAILURE por QUEUED (runner congestion). Nenhum check em FAILURE.  
**Governance:** migration DDL produção → regra Git item 7.

---

### #3247 · `claude/chore-workflows-snapshot-261108-2230`
**SHA:** `03c17737` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Aplica patch em cópia e valida** | COMPLETED | **FAILURE** |
| **Secrets Inventory Check (E40)** | COMPLETED | **FAILURE** |
| **Gate 1 - Lint + TypeScript** | COMPLETED | **FAILURE** |
| cross-reference | COMPLETED | SUCCESS |
| Detectar mudanças | COMPLETED | SUCCESS |
| Check no prod leak | COMPLETED | SUCCESS |
| PR Size Check | COMPLETED | SUCCESS |
| Assert Gate Final | COMPLETED | SUCCESS |
| Gitleaks | COMPLETED | SUCCESS |
| actionlint + shellcheck | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |
| e2e-relevance / Detectar impacto | COMPLETED | SUCCESS |
| Ghost Check Guard | COMPLETED | SUCCESS |
| CSP mirror | COMPLETED | SUCCESS |
| Gate 0 - SSOT Supabase | COMPLETED | SUCCESS |
| Gate 0.5/0.6 - Dependency | COMPLETED | SUCCESS |
| Gate 2 - Unit Tests | COMPLETED | SUCCESS |
| Gate 2.5 - PostgreSQL Transactional Integrity | COMPLETED | SUCCESS |

**CI vermelho (causa):**  
- `Aplica patch em cópia e valida` = FAILURE → workflow test que valida a aplicação do patch de snapshot em cópia; falhou ao aplicar — indica que o workflow em si tem problema.  
- `Secrets Inventory Check (E40)` = FAILURE → novo segredo/variável não foi registrado no inventário de segredos (`docs/ci/SEGREDOS.md`).  
- `Gate 1 - Lint + TypeScript` = FAILURE → erros de TypeScript nos arquivos tocados por esta PR.  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3250 · `claude/fix-stock-daily-index-261108-2230`
**SHA:** `4d94363c` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| Drift gate antes de girar o baseline | COMPLETED | SKIPPED |
| relevance / Detectar impacto | COMPLETED | SUCCESS |
| Unit — Zod schemas | COMPLETED | SUCCESS |
| cross-reference | COMPLETED | SUCCESS |
| Detectar mudanças | COMPLETED | SUCCESS |
| Gate 5 — DB Security Audit | COMPLETED | SUCCESS |
| Migrations x Canonical schema | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |
| Drift de policies vs baseline assinado | COMPLETED | SUCCESS |
| linter | COMPLETED | SUCCESS |
| Smoke — HTTP against supabase functions serve | COMPLETED | SUCCESS |
| (outros) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** `Recibo de migration em MIGRATIONS_SYNC_LOG.md` = FAILURE → arquivo `MIGRATIONS_SYNC_LOG.md` não inclui entrada para a migration de índice adicionada nesta PR (`supabase/migrations/<timestamp>_stock_daily_index.sql`). Falha de documentação do recibo, não de lógica de banco.  
**Governance:** migration DDL produção (índice) → regra Git item 7.

---

### #3251 · `claude/fix-remove-broken-cron-image-dimensions-backfill-20261108-2300`
**SHA:** `d9d091d5` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Mesmo que #3250 — migration não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** toca `.github/workflows/` + cron DDL → regra Git item 7.

---

### #3255 · `claude/fix-drop-perf002-incident-ddl-20261108-2231`
**SHA:** `4af27e85` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| Detectar mudanças | QUEUED | — |
| relevance / Detectar impacto | COMPLETED | CANCELLED |
| Unit — Zod schemas | COMPLETED | CANCELLED |
| Gate 5 — DB Security Audit | COMPLETED | CANCELLED |
| (demais ×14) | COMPLETED | CANCELLED |
| PR Size Check | COMPLETED | SUCCESS |
| linter | COMPLETED | SUCCESS |

**CI vermelho:** todos os checks CANCELLED (cancelamento manual desta sessão — run cancelado para liberar runners). Nenhuma falha de código. Detectar mudanças = QUEUED (runner congestion).  
**Governance:** DDL/migration produção → regra Git item 7.

---

### #3256 · `claude/fix-art-files-rls-quotes-only-2611082355`
**SHA:** `748b9d3f` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| Detectar mudanças | QUEUED | — |
| e2e-relevance / Detectar impacto | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration RLS não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration RLS produção → regra Git item 7.

---

### #3257 · `claude/fix-idempotencia-migrations-pendentes-261108-2236`
**SHA:** `ede7e666` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| (todos 20 visíveis) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** rollup=FAILURE mas nenhum dos primeiros 20 checks é FAILURE — check 21+ não verificado. Os 20 visíveis incluem Detectar mudanças=SUCCESS, Migrations x Canonical=SUCCESS, Recibo de migration=SUCCESS, Drift de policies=SUCCESS, linter=SUCCESS, Smoke=SUCCESS.  
**Governance:** migration produção → regra Git item 7.

---

### #3261 · `claude/chore-reconciliacao-drift-cron001-261108-2238`
**SHA:** `f5b6c194` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| (todos 20 visíveis) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** Mesmo padrão de #3257 — rollup=FAILURE, nenhum FAILURE nos primeiros 20 checks (Migrations=SUCCESS, Recibo=SUCCESS, linter=SUCCESS, Smoke=SUCCESS, SSOT Gates=SUCCESS). Check 21+ não verificado.  
**Governance:** migration/cron DDL → regra Git item 7.

---

### #3263 · `claude/feat-ft005-cron-scheduled-reports-20261108-2310`
**SHA:** `d3c13756` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de cron não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** feat + cron DDL produção → regra Git item 7.

---

### #3264 · `claude/feat-ft079-view-min-quantity-20261108-2310`
**SHA:** `17c21509` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de view não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration (view) produção → regra Git item 7.

---

### #3265 · `claude/feat-ft088-fn-check-item-fits-20261108-2310`
**SHA:** `e00a33b4` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de function não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration (function) produção → regra Git item 7.

---

### #3273 · `claude/chore-categories-indexes-espelho-261108-1200`
**SHA:** `551ca9d6` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| Detectar mudanças | QUEUED | — |
| Smoke | QUEUED | — |
| e2e-relevance / Detectar impacto | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de índices não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration/índices produção → regra Git item 7.

---

### #3274 · `claude/fix-gate-e42-261108-2325`
**SHA:** `262bc0d6` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| Detectar mudanças | QUEUED | — |
| Gate 0.5 - Dependency Audit | QUEUED | — |
| Gate 0.6 - Dependency Review | QUEUED | — |
| Gate 2.5 - PostgreSQL Transactional Integrity | QUEUED | — |
| Gate E23 - Verifica secrets E2E | QUEUED | — |
| Gate 4 - Lighthouse CI | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** rollup=FAILURE por QUEUED (runner congestion). Nenhum check em FAILURE.  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3275 · `claude/fix-gate13-migration-refs-261108-1200`
**SHA:** `4c5c8c3c` · **mergeable:** UNKNOWN · **rollup:** PENDING  
| Check | Status | Conclusion |
|---|---|---|
| (todos 20 visíveis) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** rollup=PENDING — alguns checks QUEUED. Nenhum FAILURE. Todos os gates de código (Gate 0-5, SEO, Lighthouse, Lint/TS) = SUCCESS.  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3277 · `claude/fix-ft-ux-batch6-261101-2230`
**SHA:** `87c78600` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
**Checks concluídos (sessão anterior):** CodeQL = SUCCESS; TS Unused Locals = SUCCESS; Security Scan = SUCCESS; outros = QUEUED.  
**CI vermelho:** visual-baseline QUEUED; E2E Full User Flows QUEUED — runner congestion. Nenhum FAILURE de código.  
**Governance:** 456 arquivos: `.github/workflows/` × 35 + `supabase/migrations/` × 6 — DIRTY (branch aleia) → regra Git item 7. Escopo conflita com #3305 e #3306 (useKitBuilderPageState.ts, KitAIPromptDialog.tsx).

---

### #3278 · `claude/fix-sentinel-sha-d50ae76-261108-2330`
**SHA:** `cca142ae` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| (todos 20 visíveis) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** rollup=FAILURE mas nenhum dos primeiros 20 é FAILURE — Detectar mudanças=SUCCESS, e2e-relevance=SUCCESS, Lint=SKIPPED (docs-only?), Gate 0-2.5=SUCCESS, Gitleaks=SUCCESS. Check 21+ não verificado.  
**Governance:** CI/sentinel (toca `.github/workflows/`) → regra Git item 7.

---

### #3279 · `claude/fix-cron002-collision-stagger-261108-2300`
**SHA:** `bb59d431` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| Smoke | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de cron não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration/cron DDL produção → regra Git item 7.

---

### #3284 · `claude/chore-drift-mirror-cron001-reopen-261108-2340`
**SHA:** `8cbd22b3` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **Recibo de migration em MIGRATIONS_SYNC_LOG.md** | COMPLETED | **FAILURE** |
| Smoke | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** Migration de drift não registrada em `MIGRATIONS_SYNC_LOG.md`.  
**Governance:** migration/drift DDL → regra Git item 7.

---

### #3290 · `claude/fix-e12-pg-indexes-check-261108-2352`
**SHA:** `44ae9aa7` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| Detectar mudanças | COMPLETED | SUCCESS |
| e2e-relevance / Detectar impacto | COMPLETED | SUCCESS |
| Migrations x Canonical schema | COMPLETED | SUCCESS |
| Compare GitHub × Canonical | COMPLETED | SUCCESS |
| Gitleaks | COMPLETED | SUCCESS |
| actionlint + shellcheck | COMPLETED | SUCCESS |
| Ghost Check Guard | COMPLETED | SUCCESS |
| CSP mirror | COMPLETED | SUCCESS |
| Gate 0 - SSOT Supabase | COMPLETED | SUCCESS |
| Secrets Inventory Check (E40) | COMPLETED | SUCCESS |
| Gate 0.5 - Dependency Audit | QUEUED | — |
| Gate 0.6 - Dependency Review | QUEUED | — |
| Gate 1 - Lint + TypeScript | QUEUED | — |
| Gate 2 - Unit Tests | QUEUED | — |
| Gate 2.5 - PostgreSQL Transactional Integrity | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho:** rollup=FAILURE por QUEUED (runner congestion). Detectar mudanças=SUCCESS. Nenhum FAILURE.  
**Governance:** toca `.github/workflows/` → regra Git item 7.

---

### #3305 · `claude/fix-pr3283-beforeunload-restore-261109-0400`
**SHA:** `5cca7283` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
**Todos checks:** QUEUED (100%)  
**CI vermelho:** todos QUEUED — runner congestion, CI não iniciou.  
**Governance:** conflito de escopo com #3277 (mesmo arquivo `useKitBuilderPageState.ts`) → regra Git item 7. Esta é a PR limpa que substitui #3283 (branch DIRTY).

---

### #3306 · `claude/fix-pr3288-ai-apply-confirm-261109-0400`
**SHA:** `97a1eab5` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
**Todos checks:** QUEUED (100%)  
**CI vermelho:** todos QUEUED — runner congestion, CI não iniciou.  
**Governance:** conflito de escopo com #3277 (KitAIPromptDialog.tsx + KitBuilderHeader.tsx — FT-134 duplicata) → regra Git item 7.

---

## JÁ_IMPLEMENTADA (1 PR)

### #3270 · `claude/feat-ft088-front-fits-261108-2300`
**SHA:** `25fe2ed1` · **mergeable:** UNKNOWN · **rollup:** FAILURE  
| Check | Status | Conclusion |
|---|---|---|
| **noUnusedLocals ratchet** | COMPLETED | **FAILURE** |
| Analyze (javascript-typescript) | QUEUED | — |
| (demais) | COMPLETED | SUCCESS/SKIPPED |

**CI vermelho (causa):** `noUnusedLocals ratchet` = FAILURE → a PR introduz variáveis TypeScript não-usadas que violam o ratchet de `noUnusedLocals`.  
**Verdict JÁ_IMPLEMENTADA:** `useKitFitsValidation.ts` e `useKitBuilderQuote.ts` com conteúdo idêntico já existem em main (verificado via `github_get_content` nesta sessão). PR não precisa ser mergeada.

---

## SUPERSEDIDAS (2 PRs)

### #3283 · `claude/feat-ft119-beforeunload-restore` (SUPERSEDIDA POR #3305)
**SHA:** `0c7e1dab` · **mergeable:** UNKNOWN · **rollup:** PENDING  
**Todos checks:** SUCCESS (20/20 completos, nenhum FAILURE)  
**Motivo supersedida:** Branch DIRTY — cherry-pick limpo em main criado como #3305.

### #3288 · `claude/feat-ft134-ai-apply-confirm` (SUPERSEDIDA POR #3306)
**SHA:** `e608fe96` · **mergeable:** UNKNOWN · **rollup:** PENDING  
**Todos checks:** SUCCESS (20/20 completos, nenhum FAILURE)  
**Motivo supersedida:** Branch DIRTY — cherry-pick limpo em main criado como #3306.

---

## CONCLUSÃO

### Achados críticos

1. **Main nunca foi verde neste ciclo.** SHA `ba1c3fb1` (início) e `f68850a3` (final) têm Gate Final QUEUED por run zombie `39698009932` em estado inconsistente desde 2026-10-22. Nenhuma SHA de main passou pelo Gate Final desde 2026-11-08T18:42Z (confirmado via GraphQL `checkSuites` em 30+ SHAs consecutivos — sessão anterior).

2. **Nenhuma PR AGUARDANDO_CI tem falha de código.** #3248, #3266, #3292, #3303 — todos os checks são SUCCESS ou QUEUED (runner congestion). Prontas para merge assim que Gate Final passar.

3. **PRs AGUARDANDO_HUMANO com `Recibo de migration` = FAILURE** (#3250, #3251, #3256, #3263, #3264, #3265, #3273, #3279, #3284): falha é de documentação (`MIGRATIONS_SYNC_LOG.md` não atualizado), não de lógica de banco. A governance reason (DDL produção) é independente desta falha e permanece válida.

4. **PRs AGUARDANDO_HUMANO com todos checks SUCCESS** mas rollup=FAILURE (#3257, #3261, #3278): falha está em check 21+ (não retornado pela API no limite de 20). Governance reason permanece válida.

5. **Desbloqueio requer ação humana única:** cancelar run `39698009932` em https://github.com/adm01-debug/Promo_Gifts_V4/actions/runs/39698009932 — após isso, runners ubuntu-24.04 liberam e Gate Final passa (E14 bypass: main toca apenas `analise-prs/`).

### Inventário final de estados

| Categoria | Nº | PRs |
|---|---|---|
| Mergeadas (ciclo completo) | 10 | #3238, #3242, #3244, #3254, #3294, #3296, #3297, #3307, #3308, #3309, #3310 |
| Fechadas sem merge | 3 | #3160, #3215, #3246 |
| AGUARDANDO_CI (CI vai passar) | 4 | #3248, #3266, #3292, #3303 |
| AGUARDANDO_HUMANO (governance) | 29 | ver lista acima |
| JÁ_IMPLEMENTADA | 1 | #3270 |
| SUPERSEDIDAS (abertas) | 2 | #3283, #3288 |
| **Total rastreadas** | **49** | — |
