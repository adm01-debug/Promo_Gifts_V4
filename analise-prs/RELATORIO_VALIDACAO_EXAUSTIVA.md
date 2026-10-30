# Relatório de Validação Exaustiva — Promo Gifts V4
**Data:** 2026-10-22  
**Branch de trabalho:** `claude/quirky-keller-owezvt`  
**SHA main no início da validação:** `8e8053b9ed85142e85809783cd3acf9a3077ecde`  
**SHA main ao final da validação:** `3e006427eb19247d2e99c03a8140193d3f763a8e`  
**Metodologia:** 5 agentes especializados (PhD-nível BD + segurança) em paralelo  

---

## Resumo Executivo

| Categoria | Quantidade |
|---|---|
| PRs abertas analisadas | 28 |
| PRs mergeadas nesta sessão | 3 |
| Gaps de segurança descobertos | 1 crítico |
| Regressões introduzidas | 0 |
| Gate Final pós-merge | ✅ PASSOU |

---

## PRs Mergeadas — Validação Pós-Merge

### PR #2338 — `fix(gate1.12): magazine-reader-state-read no CONTRACTS`
- **Merge SHA:** `57017ba78eb68c6c72dba336f9c081c4519619c4`
- **Arquivo alterado:** `tests/contracts/webhook-schemas.ts`
- **Mudança:** `magazine-reader-state-read` adicionado ao `NO_BODY_EXEMPT`
- **Análise:** Função inspecionada via GitHub Actions job `119907185294`:
  - `Edge Functions inspected: 109`, `body-less: 58`, `exempt by NO_BODY_EXEMPT: 30`, `in CONTRACTS: 68`
  - Antes do merge: `❌ 1 function(s) missing from CONTRACTS: magazine-reader-state-read`
  - Após o merge (run `39848498577`): Gate Final ✅ SUCCESS
- **Regressão:** Zero — TypeScript sem erros, ESLint sem warnings, todos os Gates 1.1–1.9.2 verdes
- **Veredito:** ✅ CORRETO — Fix mínimo, causa raiz endereçada, CI verde

---

### PR #2351 — `fix(products): guarda de sessão para fn_get_product_customization_options`
- **Merge SHA:** `3e06378a5e4f53e00a2c6826fdf667692b307882`
- **Arquivo alterado:** `src/components/products/ProductPersonalizationRules.tsx` (+1 linha)
- **Mudança:**
  ```typescript
  if (!(await supabase.auth.getSession()).data.session) return null; // anon: sem EXECUTE
  ```
- **Problema corrigido:** 873 chamadas/dia sem autenticação a `fn_get_product_customization_options` causando 401
- **Root cause:** Migration `20260716000068_revoke_anon_all_remaining_catalog_functions` havia revogado EXECUTE do role `anon`
- **Análise de segurança (Agente 3):**
  - ✅ Guarda correta: `supabase.auth.getSession()` é a chamada canônica
  - ✅ Primeira instrução do `queryFn` — antes de qualquer chamada de rede
  - ✅ Sem risco de bypass: JWT local não pode ser falsificado pelo usuário
  - ✅ RLS não afetada: guarda ocorre no cliente
  - ✅ Sessão expirada mid-query: tratada corretamente (retorna `null`)
  - ✅ Gate Final no head SHA `9bca9b5a`: SUCCESS
  - ✅ Merge tree: clean (zero conflitos)
- **Regressão:** Zero — usuários autenticados têm comportamento idêntico

#### ⚠️ GAP CRÍTICO IDENTIFICADO — Correção Incompleta

O fix cobre **apenas** `ProductPersonalizationRules.tsx`. Existem **5 outros callers** de `fn_get_product_customization_options` **SEM guarda de sessão**:

| Arquivo | `enabled` atual | Guarda de sessão? |
|---|---|---|
| `src/hooks/products/useProductCustomizationOptions.ts:113` | `!!productId` | ❌ NÃO |
| `src/hooks/products/useProductEngravingOptions.ts:34` | `!!productId` | ❌ NÃO |
| `src/hooks/mockup/useMockupTechniques.ts:88` | `!!productId` | ❌ NÃO |
| `src/components/pricing/calculator/TechniqueMultiSelector.tsx:65` | `!!productId` | ❌ NÃO |
| `src/hooks/simulator/useSimulatorWizard.ts:60` | `!!state.selectedProduct?.id` | ❌ NÃO |

**Impacto:** Se esses hooks são acessíveis em contextos sem autenticação, a mesma falha de 401 continuará ocorrendo para esses callers.

**Ação recomendada:** Criar PR separado adicionando a mesma guarda nos 5 hooks acima.

```typescript
// Padrão a replicar:
if (!(await supabase.auth.getSession()).data.session) return null;
```

---

### PR #2354 — `docs(migrations): recibo de migration 20261022193000 → applied`
- **Merge SHA:** `3e006427eb19247d2e99c03a8140193d3f763a8e`
- **Arquivo alterado:** `supabase/MIGRATIONS_SYNC_LOG.md` (1 linha: pending → applied)
- **Análise:** Documentação pura — sem código, sem DDL, sem risco de regressão
- **Gate Final pós-merge (run `39854917747`):** ✅ SUCCESS
- **Veredito:** ✅ CORRETO

---

## PR #2352 — MERGEADA PELO OWNER (22:36 UTC) — Migrations Ainda Não Aplicadas

**Merge SHA:** `92a4d3bc` (owner adm01-debug mergeou às 22:36 UTC)

**ATENÇÃO: As 6 migrations de segurança/perf estão no repo mas NÃO foram aplicadas em produção.**  
Elas aguardam `workflow_dispatch` manual em `db-apply-migration.yml`.

### Estado das migrations pendentes de aplicação:

| Migration | Conteúdo | Risco | Recomendação |
|---|---|---|---|
| `20261022100001` | REVOKE EXECUTE `fn_cron_guard` — remove SQL injection vector | BAIXO | ✅ APLICAR AGORA |
| `20261022100010` | `(SELECT auth.uid())` wrapper — 50 RLS policies em 24 tabelas | BAIXO | ✅ APLICAR |
| `20261022100020` | Cron reschedule — dispersão de */5 | BAIXO | ✅ APLICAR |
| `20261022100021` | Cron reschedule (job 2) | BAIXO | ✅ APLICAR |
| `20261022100022` | Cron reschedule (job 3) | BAIXO | ✅ APLICAR |
| `20261022100011` | **13 DROP INDEX** — ~779 MB em `stock_snapshots` (3,6M linhas) | **ALTO** | ⚠️ NÃO APLICAR SEM ANÁLISE |

### ⚠️ AÇÃO URGENTE DO PO — `fn_cron_guard` com SQL injection

A migration `20261022100001` revoga `EXECUTE` em `fn_cron_guard(bigint, text)` que executa `EXECUTE p_sql`.  
Atualmente qualquer cliente não autenticado pode chamar esta função via anon key.  
Impacto em produção: zero (só chamada pelo cron scheduler com `service_role`).

**Ordem recomendada de aplicação:**
```bash
gh workflow run db-apply-migration.yml -f version=20261022100001 -f approved_by=SEU_EMAIL
gh workflow run db-apply-migration.yml -f version=20261022100010 -f approved_by=SEU_EMAIL
gh workflow run db-apply-migration.yml -f version=20261022100020 -f approved_by=SEU_EMAIL
gh workflow run db-apply-migration.yml -f version=20261022100021 -f approved_by=SEU_EMAIL
gh workflow run db-apply-migration.yml -f version=20261022100022 -f approved_by=SEU_EMAIL
# Aguardar 24h, resetar pg_stat_user_indexes e medir novamente ANTES de aplicar:
# gh workflow run db-apply-migration.yml -f version=20261022100011 -f approved_by=SEU_EMAIL
```

### DROP INDEX — Aviso do próprio PR:
> "idx_scan = 0 was measured at query time; high-traffic tables like stock_snapshots may simply have had no matching queries since the last pg_stat_reset"

Os 7 dos 13 são unique constraints e GIN — marcados no arquivo como **"diferidos, exigem aprovação PO separada"**.

---

### PR #2349 — `fix(ci): release-please + cart-invariants`
**Veredito: AGUARDAR_REBASE**

- Base stale: `57017ba7` (antes dos merges #2351/#2354)
- Main atual: `3e006427`
- Precisa de rebase para CI rodar contra base atualizada

---

## PRs Que Requerem Ação Humana

### Fechar (15 PRs de template incorreto)
PRs #2322–#2331, #2333–#2337 são templates para stacks erradas (Next.js, Python, Webpack, etc.).
**Proibido fechar por restrições da sessão — ação necessária do PO.**

### Decisão do PO
| PR | Motivo |
|---|---|
| #2290 | ESLint 9→10 — breaking change, decisão estratégica |
| #2293 | recharts 2→3 — breaking change, decisão estratégica |
| #2319 | PR vazio do Jules bot — fechar |
| #2352 | Ver acima: dividir ou autorizar DROP INDEX explicitamente |

### Rebase necessário (autor)
PRs #2312, #2314, #2315, #2316, #2349 — conflitos reais ou base stale.

---

## Estado do CI Pós-Merge

**SHA main final:** `3e006427eb19247d2e99c03a8140193d3f763a8e`  
**Gate Final:** ✅ SUCCESS (run `39854917747`, completado `2026-10-22T21:18:24Z`)  
**Check run ID:** `120094756727`  

Todos os gates obrigatórios: ✅ VERDES  
Zero regressões introduzidas pelos 3 merges desta sessão.

---

## Gaps Identificados para PRs Futuras

1. **Guarda de sessão em 5 callers** de `fn_get_product_customization_options` (ver PR #2351 acima)
2. **PR #2352 parte segura** (security + cron) — merece PR separado sem o DROP INDEX
3. **15 PRs de template** — precisam ser fechadas pelo PO

---

## Metodologia de Validação

- **Agente 1:** Validação Gate 1.12 + estado CI no main
- **Agente 2:** Análise profunda PR #2349 (rebase, conflitos)
- **Agente 3:** Segurança exaustiva PR #2351 (sessão guard, adversarial, RLS)
- **Agente 4:** Análise crítica PR #2352 (fn_cron_guard, DROP INDEX, RLS wrapper)
- **Agente 5:** PR #2354 + consistência documentação analise-prs/

**Evidências:** Saídas verbatim via GitHub Actions API; git merge-tree em todos os branches disponíveis; diff 100% lido para todos os PRs analisados.
