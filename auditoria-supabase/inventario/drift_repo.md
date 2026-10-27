# A.2 Drift — Repo × Produção
_Gerado em 2026-10-27 — Seção A.2 do inventário de auditoria_

---

## Confirmação de projeto

- `client.ts` linha 24: `const CURRENT_PROJECT_ID = "doufsxqlfjyuvxuezpln";` ✓
- `config.toml` linha 1: `project_id = "doufsxqlfjyuvxuezpln"` ✓
- `pqpdolkaeqlyzpdpbizo` não está em código executável ✓

---

## Migrations no Repo

| Item | Valor |
|---|---|
| Total de arquivos `.sql` | **3.009** |
| Primeira migration | `20241231000000_saved_filters.sql` |
| Última migration | `20261027234500_reactivate_xbz_image_uploader_cron.sql` |
| Span temporal | 2024-12-31 → 2026-10-27 |

As últimas 5 migrations:
1. `20261027200000_supplier_stricker_rls_deny_all.sql`
2. `20261027220000_deactivate_xbz_image_uploader_cron.sql`
3. `20261027230000_cleanup_get_edge_function_secret_allowlist.sql`
4. `20261027233000_add_xbz_image_uploader_secret_to_allowlist.sql`
5. `20261027234500_reactivate_xbz_image_uploader_cron.sql`

---

## Edge Functions

| Item | Valor |
|---|---|
| No repo (`supabase/functions/`) | **112 funções** |
| Publicadas em produção | 109 |
| Divergência | 3 funções |

Edge functions com `verify_jwt = false` no `config.toml`:
`crm-db-bridge`, `ai-recommendations`, `external-db-inspect`, `image-proxy`, `webhook-dispatcher`, `webhook-inbound`, `mcp-server`, `connections-auto-test`, `e2e-cleanup`, `get-visitor-info`, `cleanup-notifications`, `cleanup-novelties`, `collections-watcher`, `comparison-price-watcher`, `connections-health-check`, `favorites-watcher`, `ownership-audit`, `process-queue`, `process-scheduled-reports`, `quote-followup-reminders`, `send-digest`, `send-notification`, `send-scheduled-reports`, `sync-external-db`, `log-login-attempt`, `check-login`, `asia-ingestion`, `backfill-image-dimensions`, `receive-crm-callback`

---

## Chamadas Suspeitas no Código Fonte

- `.rpc('fn_my_rpc')` — placeholder de teste nunca removido
- `invoke('e')`, `invoke('e1')`, `invoke('e2')` — nomes inválidos em produção
- `invoke('qualquer-edge')` — string de exemplo em código executável

---

## Variáveis Deno.env com Credenciais de Teste

```
TEST_ADMIN_JWT
TEST_SELLER_A_JWT
TEST_SELLER_B_JWT
TEST_USER_EMAIL
TEST_USER_PASSWORD
```

**RISCO:** Se existem como secrets em produção, qualquer edge function pode autenticar como admin/seller de teste.
