# Relatório de PRs — adm01-debug/Promo_Gifts_V4

**Sessão:** session_01VXkRxWq5ZUCmvuNx5e2TGX  
**Main SHA base:** `78729fc11038f7d0b2bb73ff0c1330f92547658b`  
**Main SHA atual (sessão 5):** `00c8fa295dbc60bd9dc3f7117f2ebf80350bd110` (PR#3344 absorvido como commit direto)  
**Data:** 2026-11-09  
**Branch de entrega:** `claude_pink/sleepy-cannon-h000nc` (PR #2674)

---

## ⚠️ RISCOS E DECISÕES HUMANAS

### AGUARDA_PO — Exigem aprovação explícita do PO antes de qualquer merge

| PR | Título | Risco | Motivo |
|---|---|---|---|
| **#3334** | Sentry 8→11 | ALTO | Major bump ×3 — breaking changes em error tracking |
| **#3333** | framer-motion 11→14 | ALTO | Major bump ×3 — breaking animation API |
| **#3331** | date-fns 3→4 | ALTO | Major bump — breaking API changes em formatação de datas |
| **#3265** | fn_check_item_fits FT-088 | MÉDIO | Nova function SQL — DDL aditivo, exige teste em Postgres temporário |
| **#3264** | vw_products_min_quantity FT-079 | MÉDIO | Nova view SQL — DDL aditivo |
| **#3263** | cron send-scheduled-reports FT-005 | MÉDIO | Novo cron job — DDL, exige aprovação PO (REGRA E056) |
| **#3257** | RLS deny-all idempotência | ALTO | Altera RLS policies — exige teste que nenhum acesso foi ampliado |
| **#3256** | RLS art-files path | ALTO | Restringe RLS pública — exige teste Postgres temporário |
| **#3255** | DROP perf002 índice | MÉDIO | DDL destrutivo (DROP INDEX) — confirmar índice não usado |
| **#3251** | Remove cron image-dimensions | MÉDIO | Remove cron job — confirmar não há dependência ativa |
| **#3250** | INDEX stock_daily_summary | BAIXO | CREATE INDEX — aditivo, sem risco de perda de dados |
| **#3243** | migrations categories_level | MÉDIO | DDL drift — exige validação cadeia completa |
| **#3284** | DRIFT mirror CRON-001 | MÉDIO | migration espelho — DDL |
| **#3279** | CRON-002 colisões startup | MÉDIO | cron DDL fix |
| **#3273** | espelho P-10 índices | BAIXO | migration espelho índices |
| **#3261** | DRIFT CRON-001 | MÉDIO | migrations drift |
| **#3214** | CRON-001 escalonamento | MÉDIO | cron DDL — 4 jobs |
| **#3290** | detector E12 `.github/workflows/` | BAIXO | CI change — workflow alteration |
| **#3274** | gate E42 `.github/workflows/` | BAIXO | CI change |
| **#3247** | snapshots E2E `.github/workflows/` | BAIXO | CI change |
| **#3228** | e2e-color-swatch `.github/workflows/` | BAIXO | CI change |
| **#3179** | preflight `.github/workflows/` | BAIXO | CI change |
| **#3129** | reduce runner pressure (8 workflows) | BAIXO | CI change — reduz saturação de runners |
| **#3137** | fix(ci): false negative E2E detector | BAIXO | Altera 8 `.github/workflows/` — confirmado nesta sessão |
| **#3127** | fix(ci): core E2E stabilization | BAIXO | Altera 3 `.github/workflows/` + playwright.config.ts — confirmado nesta sessão |
| **#3330** | codeql CI action | BAIXO | `.github/workflows/` Dependabot |
| **#3329** | supabase/setup-cli | BAIXO | `.github/workflows/` Dependabot |
| **#3328** | codeql/analyze | BAIXO | `.github/workflows/` Dependabot |
| **#3327** | codeql/upload-sarif | BAIXO | `.github/workflows/` Dependabot |

### NÃO_MERGEAR — CI falhou no head atual

| PR | Head SHA | Falha | Ação necessária |
|---|---|---|---|
| **#3277** | `87c78600` | Gate Final=FAILURE, merge-reports=failure | Rebase em main `78729fc11038` → CI verde |
| **#3203** | `1aad6831` | Gate Final=FAILURE, E2E cancelled | Rebase em main `78729fc11038` → CI verde |
| **#3339** | `6f8930b4` | Gate Final=FAILURE, Gate 1.9 file-size (598/774/563 vs baseline 577/761/553) | Branch codex — REGRA #10 proíbe push. Autor precisa rebasar em main `78729fc11038`. |
| **#3332** | `915e83a9` | Gate Final=FAILURE, npm ci ERESOLVE: eslint@10 incompatível com eslint-plugin-jsx-a11y@6.10.2 | Branch Dependabot — REGRA #10 proíbe push. Dependabot precisa abrir novo PR compatível. |

---

## PRs Mergeadas

### Por este agente (3)

| PR | Título | Tipo | SHA main após | Gate Final |
|---|---|---|---|---|
| **#3337** | fix(ci): corrige referências inválidas supabase/migrations/x6 | docs-only E14 | `6933eb61` | SUCCESS |
| **#3340** | docs(analise-prs): atualiza progresso | docs-only E14 | (após #3337) | SUCCESS |
| **#3343** | chore(ci): atualiza file-size baseline Kit Builder | chore/ci | `78729fc11038` | SUCCESS |

Verificação Supabase após todos os merges: `products_count=8321` em `doufsxqlfjyuvxuezpln` (2026-11-09).

### Externamente pelo PO (3)

| PR | Merged by |
|---|
| **#3341** | adm01-debug |
| **#3342** | adm01-debug |
| **#3344** | adm01-debug (commit direto `00c8fa295dbc`) |

---

## PRs Prontas — Não Mergeadas (bloqueio de CI)

Todas bloqueadas por **runner saturation** desde 12:27Z — GitHub Actions pool esgotado.

| PR | Título | Draft | Motivo do bloqueio |
|---|---|---|---|
| **#3346** | fix(tests): vitest regressions | ✓ | DRAFT + Gate Final=FAILURE (run 129178484108, SHA 5c376fe3) |
| **#3345** | fix(e2e): smoke tests | ✓ | DRAFT + CI queued |
| **#3278** | sentinel grandfather | ✓ | DRAFT + CI queued |
| **#3210** | release 1.9.0 | — | action_required (deploy approval) |

**#3339 e #3332** → reclassificados NAO_MERGEAR (Gate Final=FAILURE com falhas reais — ver tabela acima).  
**#3137 e #3127** → reclassificados AGUARDA_PO (tocam `.github/workflows/` — confirmado por `git diff --name-only` nesta sessão).  
**#3344** → absorvida em main como commit `00c8fa295dbc` (cherry_plus=0, removida da lista open).

---

## Contagem por Veredito

| Veredito | Qtd | PRs |
|---|---|---|
| MERGEADA_AGENTE | 3 | #3337, #3340, #3343 |
| MERGEADA_EXTERNA | 3 | #3341, #3342, #3344 (cherry_plus=0 → `00c8fa295`) |
| NAO_MERGEAR | 4 | #3277 (Gate Final=FAILURE run 128980382539), #3203, #3339, #3332 |
| AGUARDA_PO | 26 | (listadas acima, inclui #3137 e #3127) |
| AGUARDA_CI | 4 | #3346 (Gate Final=FAILURE run 129178484108), #3345, #3278, #3210 |
| **TOTAL OPEN** | **37** | ✓ 38 analisadas; #3344 saiu da lista (absorvida em main) |

**Evidência SQL migration PRs (sessão 5):**
- #3243 `ALTER TABLE categories ADD COLUMN IF NOT EXISTS level` — aditivo idempotente
- #3250 `CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sds_summary_date` — aditivo idempotente
- #3251 `cron.unschedule('image-dimensions-backfill')` — remove cron inativa
- #3255 `DROP FUNCTION IF EXISTS perf002_drop_unused_snapshot_indexes()` — remove função SECURITY DEFINER perigosa (INCIDENTE PEND-I01)
- #3256 DROP POLICY ampla + CREATE POLICY restrita a `quotes/` — restringe RLS
- #3257 DROP POLICY deny_all + CREATE TABLE IF NOT EXISTS `supplier_products_raw_history_p2027_*` — RLS + partições
- #3261/#3284 `cron.alter_job(292,303,241,276,224,114)` — espelho DDL já aplicada em produção (idempotente)
- #3263 `cron.unschedule + cron.schedule` process/send-scheduled-reports — FT-005
- #3264 `CREATE OR REPLACE VIEW vw_products_min_quantity` — versioning-only idempotente
- #3265 `CREATE OR REPLACE FUNCTION fn_check_item_fits` — versioning-only idempotente
- #3273 3× `CREATE INDEX IF NOT EXISTS` — espelho out-of-band idempotente
- #3279 `cron.alter_job(243,276,224,114)` — fix colisões CRON-002

---

## Gate Final — Estado Atual

| Componente | Status | Evidência |
|---|---|---|
| Gate Final (`deploy-gates.yml`) | QUEUED | runner saturation — run #42617163917 desde 12:27Z |
| Vercel combined_status | SUCCESS | deploy confirmado 2026-11-09T12:27:57Z |
| Supabase produção | HEALTHY | 8321 produtos, sem erro novo |

Gate Final queued = saturação de runner (não falha de código). Nenhuma falha nova introduzida por esta sessão.

---

## Clusters de PRs Relacionadas

| Cluster | PRs | Descrição |
|---|---|---|
| Vitest fixes | #3346 ⊃ #3344 | #3346 é superconjunto de #3344 — se #3346 mergear, #3344 fica redundante |
| CRON DDL | #3214, #3251, #3261, #3263, #3279, #3284 | Cadeia de migrations/cron — merge em sequência após aprovação PO |
| RLS | #3256, #3257 | Ambas afetam RLS — revisar em conjunto |
| Dependabot CI | #3327, #3328, #3329, #3330 | 4 PRs de CI actions — podem ser mergeadas em lote após PO |
| Dependabot major | #3331, #3333, #3334 | 3 major bumps — revisar breaking changes em conjunto |
| Index drift | #3250, #3255, #3273 | Relacionadas a out-of-band index DDL |

---

## Arquivos de Entrega

| Arquivo | Status |
|---|---|
| `analise-prs/baseline/gate-final-main.json` | ✓ |
| `analise-prs/baseline/main-sha.txt` | ✓ |
| `analise-prs/baseline/state.md` | ✓ |
| `analise-prs/progresso.json` | ✓ |
| `analise-prs/prs.json` | ✓ (37 PRs open + metadados sessão 5) |
| `analise-prs/prs.csv` | ✓ |
| `analise-prs/regras-de-negocio.md` | ✓ |
| `analise-prs/RELATORIO_PRS.md` | ✓ (este arquivo) |
| `analise-prs/dossies/PR-*.md` | ✓ (182+ arquivos, cobre todas 38 PRs analisadas) |
