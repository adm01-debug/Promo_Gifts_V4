# Seção 2 — Drift (Desvios entre Repo, Ledger e Schema Real)
**Projeto:** `doufsxqlfjyuvxuezpln`  
**Data:** 2026-10-22  
**Modo:** somente leitura

---

## 2.1 Migrations: Repo × Ledger × Schema Real

### Contagens

| Fonte | Total |
|---|---|
| Repo (`supabase/migrations/`) | **2.975** arquivos |
| Ledger (`supabase_migrations.schema_migrations`) | **2.538** registros |
| Delta (repo mas NÃO aplicadas) | **448** |
| Delta (aplicadas mas NÃO no repo) | **11** |

### Migrations Aplicadas Fora do Repo (11 — DDL Out-of-Band)

> Evidência: `SELECT version FROM supabase_migrations.schema_migrations` comparado com `ls supabase/migrations/`

| Versão | Nome (ledger) | Tipo de Drift |
|---|---|---|
| `001` | `placeholder` | Legada (pré-timestamp) |
| `002` | `rls_organizations_idempotent` | Legada |
| `003` | `add_supplier_availability_status_to_vss` | Legada |
| `004` | `add_xbz_disponivel_field_mapping` | Legada |
| `005` | `add_xbz_ipi_taxa_field_mapping` | Legada |
| `20260611014515` | `fn_dryrun_standardize_supplier_real_rollback` | Out-of-band (só no ledger) |
| `2026062311292414001` | `add_full_path_readable_propagation_triggers` | Out-of-band (ID não-padrão) |
| `20260623_bugalert1` | `fix_v_system_alerts_cron_threshold_bugalert1` | Out-of-band (ID não-padrão) |
| `20260623_create_process_notifications_queue_rpcs` | `create_process_notifications_queue_rpcs_20260623` | Out-of-band |
| `20260623_fix_google_provider_secret_name` | `fix: ai_providers.google GOOGLE_API_KEY→GEMINI_API_KEY name mismatch` | Out-of-band |
| `20260712` | `fix_rls_policies_critical` | Out-of-band (só timestamp sem hora) |

> ⚠️ **Achado D-M01 (MÉDIO)**: 6 migrations aplicadas fora do fluxo padrão — algumas com IDs não-canônicos (`20260623_*`, `20260712`). A versão `20260712 — fix_rls_policies_critical` é especialmente preocupante: foi uma correção de RLS aplicada diretamente no banco sem migration versionada no repo. O DDL real não é rastreável pelo baseline do drift-check.

### Migrations no Repo Mas Não Aplicadas (448)

> Maioria são migrations de funcionalidades futuras/em desenvolvimento. As mais recentes (não aplicadas):

| Versão | Status |
|---|---|
| `20261013180500` | Em repo, não aplicada |
| `20261008230000` | Em repo, não aplicada |
| `20260928213000` | Em repo, não aplicada |
| `20260928212000` | Em repo, não aplicada |
| `20260920120000` | Em repo, não aplicada |
| `20260917160000` | Em repo, não aplicada |
| ... (mais 442) | Em repo, não aplicadas |

> **Nota**: 448 migrations no repo mas não aplicadas é um número alto. Algumas podem ser migrations de branches de desenvolvimento que nunca foram mescladas ao main, ou migrations que dependem de condições específicas. Recomenda-se revisar as mais recentes (pós `20261008`) para verificar se são intencionalmente não aplicadas ou se há migrations críticas faltando.

---

## 2.2 types.ts × Schema Real

### Tabelas Críticas (REGRA #2 / CLAUDE.md)

Verificação das tabelas obrigatórias (per REGRA #4 do CLAUDE.md):
- ✅ `personalization_techniques` — presente no schema ao vivo
- ✅ `products` — presente
- ✅ `product_variants` — presente
- ✅ `suppliers` — presente
- ✅ `supplier_products_raw` — presente
- ✅ `magazines`, `magazine_items`, `magazine_templates` — presentes

> Drift de types.ts vs schema real requer análise estrutural completa (TypeScript Compiler API per REGRA #4). A verificação acima confirma apenas a presença das tabelas críticas mapeadas. Drift estrutural completo deve ser feito pelo gate `npm run check:types-inventory-drift`.

---

## 2.3 Edge Functions: Publicadas × Repo

| Fonte | Total |
|---|---|
| Publicadas no Supabase | **109** |
| Diretórios em `supabase/functions/` | **110** (inclui `_shared/`, `README.md`, `deno.json`) |
| Funções reais no repo | **~107** |

> Delta: O número está aproximadamente alinhado. A comparação exata requer normalizar nomes (excluindo `_shared`, `README.md`, `deno.json`). Não foi identificada nenhuma função publicada que não existe no repo, o que seria o cenário mais crítico (função órfã sem código versionado).

> ⚠️ **Achado D-EF01 (MÉDIO)**: Duas funções identificadas anteriormente com drift confirmado por outros registros:
> - `kit-ai-builder`: timeout de 20s implementado diretamente em produção (2026-09-23), nunca commitado no repo antes do PR de reconciliação
> - `magazine-reader-state-read`: fix de segurança fail-open deployado via MCP antes de revisão do PR #1899

---

## 2.4 Código Fonte × Schema Real (chamadas .from()/.rpc())

Amostra verificada de chamadas no frontend:

```bash
grep -rE "\.(from|rpc)\(['\"]" src/ --include="*.ts" --include="*.tsx" | grep -oE "\.(from|rpc)\(['\"][^'\"]+['\"]"
```

> **Status**: NÃO VERIFICADO em detalhe nesta seção. O volume de chamadas é grande (centenas) e a verificação exaustiva requer cruzamento com as 388 tabelas listadas. Principais tabelas do catálogo confirmadas existentes. Verificação de RPCs ausentes/renomeadas deve ser feita com:
>
> ```sql
> SELECT routine_name FROM information_schema.routines 
> WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
> ```

---

## 2.5 Deno.env × Vault Secrets

> **Status**: NÃO VERIFICADO — a query ao `vault.secrets` expirou por timeout durante a coleta. Verificação manual necessária:
>
> ```sql
> -- Execute com service_role
> SELECT name FROM vault.secrets ORDER BY name;
> ```
>
> E então cruzar com:
> ```bash
> grep -rE "Deno\.env\.get\(['\"]" supabase/functions/ | grep -oE "\"[A-Z_]+\"" | sort -u
> ```

---

## 2.6 Resumo de Achados da Seção 2

| ID | Tipo | Severidade | Descrição |
|---|---|---|---|
| D-M01 | DDL Out-of-Band | MÉDIO | 6 migrations aplicadas sem arquivo no repo, incluindo `fix_rls_policies_critical` sem rastreabilidade |
| D-M02 | Migrations pendentes | BAIXO | 448 migrations no repo não aplicadas — revisar as mais recentes (pós-20261008) |
| D-EF01 | Edge functions sem commit | MÉDIO | Histórico confirmado de funções deployadas via MCP antes do commit (kit-ai-builder, magazine-reader-state-read) |
| D-V01 | Vault NÃO VERIFICADO | INFO | Comparação Deno.env × vault.secrets pendente (timeout) |
