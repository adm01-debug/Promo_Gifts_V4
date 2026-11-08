# PR #3214 — Evidências de diff 100% lido

**Branch:** codex/fix-cron-startup-timeout-261107-0238  
**Título:** fix(cron): CRON-001 — escalonar 4 cron jobs para eliminar job startup timeout  
**isDraft:** true | **GitHub:** CONFLICTING | **CI:** FAILURE

## Arquivos alterados (131 total)

### GOVERNANCE (REGRA#8) — 1 workflow + 3 migrations + 2 rollbacks
| Arquivo | Mudança |
|---|---|
| `.github/workflows/contract-tests.yml` | Reverte registry `ghcr.io` → `public.ecr.aws` (E104) |
| `supabase/migrations/20261022195616_fix_update_company_fields_security_definer_search_path.sql` | Remove linha de rollback documentada (`Rollback: ver supabase/rollbacks/...`) |
| `supabase/migrations/20261022203935_update_company_fields_security_fix.sql` | Remove linha de rollback documentada (`Rollback: supabase/rollbacks/...`) |
| `supabase/migrations/20261101220000_cron001_stagger_schedules.sql` | **NOVO** — escalonamento de 4 cron jobs (CRON-001, DDL via `cron.alter_job`) |
| `supabase/rollbacks/20261022195616_rollback.sql` | Remove linha de rollback da documentação interna |
| `supabase/rollbacks/20261022203935_rollback.sql` | Remove linha de rollback da documentação interna |

### NÃO-GOVERNANCE — principais arquivos funcionais

| Arquivo | Mudança |
|---|---|
| `src/components/bi/BIAiCopilot.tsx` | Componente BI AI Copilot |
| `src/components/kit-builder/BoxSelector.tsx` | Seletor de caixas kit builder |
| `src/components/kit-builder/ItemCard.tsx` | Card de item kit builder |
| `src/components/kit-builder/KitBuilderHeader.tsx` | Header do kit builder |
| `src/components/kit-builder/SelectedItemsBadges.tsx` | Badges de itens selecionados |
| `src/components/kit-builder/WizardSteps.tsx` | Steps do wizard |
| `src/components/kit-builder/kit-summary/KitCompositionCard.tsx` | Card de composição do kit |
| `src/components/kit-builder/kit-summary/KitPricingCard.tsx` | Card de precificação do kit |
| `src/components/layout/Header.tsx` | Header layout |
| `src/lib/auth/auth-audit.ts` | Auditoria de auth |
| `src/pages/kit-builder/KitBuilderPage.tsx` | Página do kit builder |
| `src/services/orderService.ts` | Serviço de pedidos |
| `src/services/notificationService.ts` | Serviço de notificações |
| `supabase/functions/categories-api/index.ts` | Nova edge function para API de categorias |
| `analise-prs/dossies/` (74 arquivos) | Dossiers de PRs anteriores (tracking, não-funcionais) |

### Detalhe da migration crítica: `20261101220000_cron001_stagger_schedules.sql`

**Migration NOVA** — escalonamento de cron jobs (CRON-001):
```sql
-- CRON-001: Escalonar schedules de 10 cron jobs com "job startup timeout"
-- Severidade: ALTO | Tipo: BUG
-- Evidência: cron.job_run_details WHERE status = 'failed' AND return_message LIKE '%job startup timeout%'
--   → 10 jobs falhando: jobids 114, 209, 216, 217, 219, 221, 224, 243, 264, 276
-- Causa raiz: múltiplos jobs tentando iniciar no mesmo minuto excede capacidade de conexão pg_cron
-- Fix: deslocar 4 jobs (114, 224, 243, 276) por 2 minutos para reduzir colisões máx de 3→2
-- DDL: SELECT cron.alter_job(...)
```
DDL usa `cron.alter_job` — REGRA#8 corolário E056 proíbe DDL via `execute_sql` em sessão de agente. Essa migration precisa do fluxo E15 (`db-apply-migration.yml workflow_dispatch`).

### Detalhe workflow `contract-tests.yml` (linha 93)

```yaml
# ANTES:
-  echo "SUPABASE_INTERNAL_IMAGE_REGISTRY=ghcr.io" >> "$GITHUB_ENV"
# DEPOIS:
+  echo "SUPABASE_INTERNAL_IMAGE_REGISTRY=public.ecr.aws" >> "$GITHUB_ENV"
```
Reverte de ghcr.io para ECR Public (reverso do que PR#3150 pode ter feito). Conflito potencial com outras PRs que tocam o mesmo step.

## Conflito com outras PRs

- **PR#3148**: mesma `supabase/functions/categories-api/index.ts`, mesmas migrations `20261022195616` e `20261022203935`. PR#3214 é derivado/relacionado ao mesmo trabalho.
- Estado **CONFLICTING** no GitHub significa conflito real com `main` atual (SHA `9a89d9f0`).

## Regressão potencial

- `cron001_stagger_schedules.sql`: Migration DDL via `cron.alter_job` — altera schedules de 4 jobs de produção. REGRA#8 corolário E056. Baixo risco de regressão se aplicada pelo caminho correto (E15), mas **não pode ser aplicada autonomamente**.
- `contract-tests.yml`: mudança de registry `ghcr.io → public.ecr.aws` pode quebrar o CI se ECR tiver rate limit ou indisponibilidade. Conflito com PR#3150 que pode ter feito o inverso.
- Frontend kit-builder (múltiplos arquivos): sem diff detalhado, não verificado — POTENCIAL REGRESSÃO em fluxo de criação de kits.

## Regra de negócio
PR válida em conceito (CRON-001 é bug real com evidência em `cron.job_run_details`), mas requer aprovação humana por múltiplos motivos.

## Conflitos
**CONFLICTING** no GitHub. Conflito semântico com PR#3148 (mesmas migrations), PR#3150 (registry contract-tests.yml).

## Veredito: DECISAO_HUMANA
**Motivo:** REGRA#8 — 1 workflow + 3 migrations (`cron.alter_job` + `security_definer`) + **isDraft=true** + **CONFLICTING** + conflito semântico com PR#3148. PO deve resolver conflito entre PR#3214 e PR#3148 e aprovar migration via E15.
